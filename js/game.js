import { buildLevel } from "./levels.js";
import { Snake, WildSnake } from "./snake.js";
import { InputController } from "./input.js";
import { Renderer } from "./renderer.js";
import { cellKey, mulberry32, inBounds } from "./utils.js";
import {
  GAME_SETTINGS,
  getSkinById,
  loadProgress,
  saveProgress,
  isSkinUnlocked,
} from "./config.js";

export class Game {
  /**
   * @param {object} ui HUD / overlay 回调
   */
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;
    this.renderer = new Renderer(canvas);
    this.input = new InputController();
    this.input.attach();

    this.progress = loadProgress();
    this.skinId = this.progress.selectedSkin;

    this.levelId = 1;
    this.running = false;
    this.paused = false;
    this.ended = false;

    this.score = 0;
    this.lives = null;
    this.timeLeft = null;

    this.acc = 0;
    this.stepMs = 140;
    this.lastTs = 0;
    this.raf = 0;

    this.reverseActive = false;
    this.reverseTimer = 0;
    this.levelElapsed = 0;
    this.hitWallThisRun = false;

    this.wildSnakes = [];
    this.wildlifeSpawned = {}; // type -> count spawned

    this.rng = mulberry32(1);

    this._loop = this._loop.bind(this);
    this._onKey = this._onKey.bind(this);
    window.addEventListener("keydown", this._onKey);
    window.addEventListener("resize", () => {
      if (this.map) this.renderer.resize(this.map.width, this.map.height);
    });
  }

  setSkin(skinId) {
    const skin = getSkinById(skinId);
    if (!isSkinUnlocked(skin, this.progress)) return false;
    this.skinId = skin.id;
    this.progress.selectedSkin = skin.id;
    saveProgress(this.progress);
    return true;
  }

  getSkin() {
    return getSkinById(this.skinId);
  }

  _onKey(e) {
    if (!this.running) return;
    if (e.code === "Space") {
      e.preventDefault();
      if (this.ended) return;
      this.togglePause();
    } else if (e.code === "KeyR") {
      e.preventDefault();
      this.restart();
    }
  }

  startLevel(levelId) {
    this.levelId = levelId;
    this._resetState();
    this.running = true;
    this.paused = false;
    this.ended = false;
    this.ui.showGame();
    this.ui.hideModal();
    this.ui.setPause(false);
    this._updateHud();
    this.renderer.draw(this._drawState());
    this.lastTs = performance.now();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this._loop);
  }

  restart() {
    this.startLevel(this.levelId);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  togglePause() {
    if (this.ended || !this.running) return;
    this.paused = !this.paused;
    this.ui.setPause(this.paused);
    if (!this.paused) {
      this.lastTs = performance.now();
      this.raf = requestAnimationFrame(this._loop);
    }
  }

  _resetState() {
    this.map = buildLevel(this.levelId);
    const def = this.map.def;
    this.snake = new Snake(this.map.snakeBody, this.map.startDir);
    this.input.reset();
    this.input.setReverse(false);

    const reaction =
      def.reactionTimeMs != null
        ? def.reactionTimeMs
        : GAME_SETTINGS.inputConfig.reactionTimeMs;
    this.input.setReactionTime(reaction);

    this.reverseActive = false;
    this.reverseTimer = 0;
    this.levelElapsed = 0;
    this.hitWallThisRun = false;
    this.score = 0;
    this.lives = def.lives;
    this.timeLeft = def.timeLimit;
    this.stepMs = def.baseSpeed;
    this.acc = 0;
    this.rng = mulberry32(this.levelId * 1337 + (Date.now() % 1000));

    this.movers = this.map.movers.map((m) => ({ ...m }));

    this.wildSnakes = [];
    this.wildlifeSpawned = {};
    for (const w of def.wildlife || []) {
      this.wildlifeSpawned[w.type] = 0;
    }

    this.renderer.reset();
    this.renderer.resize(this.map.width, this.map.height);
  }

  _loop(ts) {
    if (!this.running || this.paused || this.ended) return;

    const dt = Math.min(50, ts - this.lastTs);
    this.lastTs = ts;
    this.acc += dt;
    this.levelElapsed += dt;

    if (this.timeLeft != null) {
      this.timeLeft -= dt / 1000;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this._fail("超时");
        return;
      }
    }

    if (this.map.def.reverseInterval) {
      this.reverseTimer += dt;
      if (this.reverseTimer >= this.map.def.reverseInterval) {
        this.reverseTimer = 0;
        this.reverseActive = !this.reverseActive;
        this.input.setReverse(this.reverseActive);
        this.ui.setReverse(this.reverseActive);
      }
    }

    this._trySpawnWildlife();

    const headKey = cellKey(this.snake.head.x, this.snake.head.y);
    const inMud = this.map.mudSet.has(headKey);
    const interval = inMud ? this.stepMs * 2 : this.stepMs;

    while (this.acc >= interval) {
      this.acc -= interval;
      this._tick();
      if (this.ended) return;
    }

    this._updateHud();
    this.renderer.draw(this._drawState());
    this.raf = requestAnimationFrame(this._loop);
  }

  /** 每局开始后延迟，或豆子 < 阈值时，按关卡配置生成野生蛇 */
  _trySpawnWildlife() {
    const def = this.map.def;
    const wildlife = def.wildlife || [];
    if (!wildlife.length) return;

    const alive = this.wildSnakes.filter((w) => w.alive).length;
    if (alive >= GAME_SETTINGS.maxWildSnakes) return;

    const beanLow = this.map.beans.length < GAME_SETTINGS.wildlifeBeanThreshold;

    for (const cfg of wildlife) {
      if (this.wildSnakes.filter((w) => w.alive).length >= GAME_SETTINGS.maxWildSnakes) break;
      const spawned = this.wildlifeSpawned[cfg.type] || 0;
      if (spawned >= cfg.count) continue;

      const delay = cfg.spawnDelay ?? GAME_SETTINGS.defaultWildlifeSpawnDelay;
      if (this.levelElapsed < delay && !beanLow) continue;

      if (this._spawnWildSnake(cfg.type)) {
        this.wildlifeSpawned[cfg.type] = spawned + 1;
        return;
      }
    }
  }

  _spawnWildSnake(type) {
    const spot = this._findOpenSpawn(4);
    if (!spot) return false;

    const body = [
      { x: spot.x, y: spot.y },
      { x: spot.x + 1, y: spot.y },
      { x: spot.x + 2, y: spot.y },
    ];
    // 确保身体格子都空旷
    for (const c of body) {
      if (!this._isCellFree(c.x, c.y, true)) {
        // 尝试朝左生成
        body[1] = { x: spot.x - 1, y: spot.y };
        body[2] = { x: spot.x - 2, y: spot.y };
        break;
      }
    }
    for (const c of body) {
      if (!this._isCellFree(c.x, c.y, true)) return false;
    }

    const dir =
      body[1].x < body[0].x ? { x: 1, y: 0 } : { x: -1, y: 0 };
    this.wildSnakes.push(new WildSnake(body, dir, type));
    return true;
  }

  _findOpenSpawn(minDistFromPlayer) {
    const w = this.map.width;
    const h = this.map.height;
    const ph = this.snake.head;
    for (let tries = 0; tries < 80; tries++) {
      const x = 2 + Math.floor(this.rng() * (w - 4));
      const y = 1 + Math.floor(this.rng() * (h - 2));
      if (Math.abs(x - ph.x) + Math.abs(y - ph.y) < minDistFromPlayer) continue;
      if (this._isCellFree(x, y, true) && this._isCellFree(x + 1, y, true) && this._isCellFree(x + 2, y, true)) {
        return { x, y };
      }
      if (this._isCellFree(x, y, true) && this._isCellFree(x - 1, y, true) && this._isCellFree(x - 2, y, true)) {
        return { x, y };
      }
    }
    return null;
  }

  _isCellFree(x, y, allowMud = true) {
    const { map } = this;
    if (!inBounds(x, y, map.width, map.height)) return false;
    const k = cellKey(x, y);
    if (map.wallSet.has(k) || map.spikeSet.has(k)) return false;
    if (!allowMud && map.mudSet.has(k)) return false;
    if (this._hitsMovers(x, y)) return false;
    if (this.snake.occupies(x, y)) return false;
    if (map.beans.some((b) => b.x === x && b.y === y)) return false;
    for (const ws of this.wildSnakes) {
      if (ws.alive && ws.occupies(x, y)) return false;
    }
    return true;
  }

  _moverCells() {
    const cells = [];
    for (const mv of this.movers) {
      for (let i = 0; i < mv.length; i++) {
        cells.push({ x: mv.x + i, y: mv.y });
      }
    }
    return cells;
  }

  _tick() {
    const nextDir = this.input.consume(this.snake.dir);
    if (nextDir) this.snake.setDir(nextDir);

    if (this.map.def.movingObstacles) {
      this._moveObstacles();
    }

    const movers = this._moverCells();

    for (const ws of this.wildSnakes) {
      if (!ws.alive) continue;
      ws.step(
        this.map,
        this.map.wallSet,
        this.map.beans,
        this.snake.body,
        this.rng,
        movers
      );
    }

    this.snake.step({
      width: this.map.width,
      height: this.map.height,
      wrap: this.map.def.wrap,
    });

    // Layer 0：边界 & 墙壁
    if (
      this.snake.hitsWall(this.map.wallSet, {
        width: this.map.width,
        height: this.map.height,
        wrap: this.map.def.wrap,
      })
    ) {
      this.hitWallThisRun = true;
      this._fail("撞墙");
      return;
    }

    if (this._hitsMovers(this.snake.head.x, this.snake.head.y)) {
      this._fail("撞到移动挡板");
      return;
    }

    // Layer 2：玩家蛇身 —— V2 不再与蛇头互撞判定死亡

    if (this.map.spikeSet.has(cellKey(this.snake.head.x, this.snake.head.y))) {
      if (this.snake.invincibleTicks <= 0) {
        if (this.lives != null) {
          this.lives -= 1;
          this.snake.invincibleTicks = 6;
          if (this.lives <= 0) {
            this._fail("生命值归零");
            return;
          }
        } else {
          this._fail("触碰尖刺");
          return;
        }
      }
    }

    // 与野生蛇交互（Layer 1 ↔ Layer 3/4）
    this._resolveWildCollisions();

    // 吃豆
    const bi = this.map.beans.findIndex(
      (b) => b.x === this.snake.head.x && b.y === this.snake.head.y
    );
    if (bi >= 0) {
      const bean = this.map.beans[bi];
      this.map.beans.splice(bi, 1);
      this.snake.grow(1);
      this.score += bean.gold ? 30 : 10;
      this.renderer.notifyEat?.(this.getSkin());
    }

    if (this.map.beans.length === 0) {
      this._win();
    }
  }

  _resolveWildCollisions() {
    const hx = this.snake.head.x;
    const hy = this.snake.head.y;

    for (const ws of this.wildSnakes) {
      if (!ws.alive) continue;

      // 玩家头撞野生蛇 → 野生蛇死掉金豆
      if (ws.hitByPlayerHead(hx, hy)) {
        const goldPos = { ...ws.head };
        ws.kill();
        this.map.beans.push({ x: goldPos.x, y: goldPos.y, gold: true });
        continue;
      }

      // 野生蛇头撞玩家身 → 野生蛇死亡（玩家无事）
      if (ws.headHitsPlayer(this.snake.body)) {
        const goldPos = { ...ws.head };
        ws.kill();
        this.map.beans.push({ x: goldPos.x, y: goldPos.y, gold: true });
      }
    }
  }

  _moveObstacles() {
    for (const mv of this.movers) {
      mv.x += mv.dir * (mv.speedSteps || 1);
      if (mv.x <= mv.minX) {
        mv.x = mv.minX;
        mv.dir = 1;
      } else if (mv.x >= mv.maxX) {
        mv.x = mv.maxX;
        mv.dir = -1;
      }
    }
  }

  _hitsMovers(x, y) {
    for (const mv of this.movers) {
      if (y === mv.y && x >= mv.x && x < mv.x + mv.length) return true;
    }
    return false;
  }

  _drawState() {
    return {
      map: this.map,
      snake: this.snake,
      wildSnakes: this.wildSnakes,
      movers: this.movers,
      reverseActive: this.reverseActive,
      skin: this.getSkin(),
      time: performance.now(),
    };
  }

  _updateHud() {
    this.ui.updateHud({
      level: this.levelId,
      name: this.map.def.name,
      score: this.score,
      beans: this.map.beans.length,
      lives: this.lives,
      timeLeft: this.timeLeft,
      reverse: this.reverseActive,
      hasTimer: this.map.def.timeLimit != null,
      hasLives: this.map.def.lives != null,
    });
  }

  _addProgress(score, clearedNoWall) {
    this.progress.totalScore += score;
    if (clearedNoWall && !this.progress.unlockedExtra.includes("no-wall")) {
      this.progress.unlockedExtra.push("no-wall");
      // 成就「不碰墙通关」解锁水晶宝石
      if (!this.progress.unlockedExtra.includes("S004")) {
        this.progress.unlockedExtra.push("S004");
      }
    }
    saveProgress(this.progress);
    this.ui.onProgress?.(this.progress);
  }

  _win() {
    this.ended = true;
    this.running = false;
    this.renderer.draw(this._drawState());
    this._addProgress(this.score, !this.hitWallThisRun);
    const hasNext = this.levelId < 10;
    this.ui.showModal({
      win: true,
      title: this.levelId === 10 ? "通关！最终试炼完成" : "过关成功",
      score: this.score,
      reason: `「${this.map.def.name}」挑战完成 · 累计 ${this.progress.totalScore}`,
      primaryLabel: hasNext ? "下一关" : "返回选关",
      onPrimary: () => {
        if (hasNext) this.startLevel(this.levelId + 1);
        else this.ui.showLevels();
      },
      onSecondary: () => this.restart(),
    });
  }

  _fail(reason) {
    this.ended = true;
    this.running = false;
    this.renderer.draw(this._drawState());
    // 失败也累计本局得分，便于解锁皮肤
    if (this.score > 0) this._addProgress(this.score, false);
    this.ui.showModal({
      win: false,
      title: "挑战失败",
      score: this.score,
      reason: `失败原因：${reason}`,
      primaryLabel: "重试",
      onPrimary: () => this.restart(),
      onSecondary: () => this.ui.showLevels(),
      secondaryLabel: "选关",
    });
  }
}
