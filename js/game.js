import { buildLevel } from "./levels.js";
import { Snake, EnemySnake } from "./snake.js";
import { InputController } from "./input.js";
import { Renderer } from "./renderer.js";
import { cellKey, mulberry32 } from "./utils.js";

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
    this.moverAcc = 0;

    this.rng = mulberry32(1);

    this._loop = this._loop.bind(this);
    this._onKey = this._onKey.bind(this);
    window.addEventListener("keydown", this._onKey);
    window.addEventListener("resize", () => {
      if (this.map) this.renderer.resize(this.map.width, this.map.height);
    });
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
    this.reverseActive = false;
    this.reverseTimer = 0;
    this.score = 0;
    this.lives = def.lives;
    this.timeLeft = def.timeLimit;
    this.stepMs = def.baseSpeed;
    this.acc = 0;
    this.moverAcc = 0;
    this.rng = mulberry32(this.levelId * 1337 + Date.now() % 1000);

    this.movers = this.map.movers.map((m) => ({ ...m }));

    this.enemy = null;
    if (def.hasEnemy) {
      // 右上角生成红蛇
      const ex = this.map.width - 4;
      const ey = 3;
      this.enemy = new EnemySnake(
        [
          { x: ex, y: ey },
          { x: ex + 1, y: ey },
          { x: ex + 2, y: ey },
        ],
        { x: -1, y: 0 }
      );
    }

    this.renderer.resize(this.map.width, this.map.height);
  }

  _loop(ts) {
    if (!this.running || this.paused || this.ended) return;

    const dt = Math.min(50, ts - this.lastTs);
    this.lastTs = ts;
    this.acc += dt;

    // 倒计时
    if (this.timeLeft != null) {
      this.timeLeft -= dt / 1000;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this._fail("超时");
        return;
      }
    }

    // 反向控制周期（第 8 关）
    if (this.map.def.reverseInterval) {
      this.reverseTimer += dt;
      if (this.reverseTimer >= this.map.def.reverseInterval) {
        this.reverseTimer = 0;
        this.reverseActive = !this.reverseActive;
        this.input.setReverse(this.reverseActive);
        this.ui.setReverse(this.reverseActive);
      }
    }

    // 泥潭减速：头在泥潭时 step 间隔 x2
    const headKey = cellKey(this.snake.head.x, this.snake.head.y);
    const inMud = this.map.mudSet.has(headKey);
    const interval = inMud ? this.stepMs * 2 : this.stepMs;

    // 移动挡板：与蛇同节拍移动，保证碰撞可预测
    while (this.acc >= interval) {
      this.acc -= interval;
      this._tick();
      if (this.ended) return;
    }

    this._updateHud();
    this.renderer.draw(this._drawState());
    this.raf = requestAnimationFrame(this._loop);
  }

  _tick() {
    // 消费输入队列一个有效方向
    const nextDir = this.input.consume(this.snake.dir);
    if (nextDir) this.snake.setDir(nextDir);

    // 移动挡板
    if (this.map.def.movingObstacles) {
      this._moveObstacles();
    }

    // 敌蛇
    if (this.enemy && this.enemy.alive) {
      this.enemy.step(
        this.map,
        this.map.wallSet,
        this.map.beans,
        this.snake.body,
        this.rng
      );
    }

    this.snake.step({
      width: this.map.width,
      height: this.map.height,
      wrap: this.map.def.wrap,
    });

    // —— 碰撞 ——
    // 墙 / 边界
    if (this.snake.hitsWall(this.map.wallSet, {
      width: this.map.width,
      height: this.map.height,
      wrap: this.map.def.wrap,
    })) {
      this._fail("撞墙");
      return;
    }

    // 移动挡板
    if (this._hitsMovers(this.snake.head.x, this.snake.head.y)) {
      this._fail("撞到移动挡板");
      return;
    }

    // 自身
    if (this.snake.hitsSelf()) {
      this._fail("撞到自身");
      return;
    }

    // 尖刺
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

    // 与敌蛇交互
    if (this.enemy && this.enemy.alive) {
      const hx = this.snake.head.x;
      const hy = this.snake.head.y;

      // 玩家头撞红蛇 → 红蛇消失掉金豆
      if (this.enemy.hitByPlayerHead(hx, hy)) {
        // 若是红蛇头撞玩家头，优先判红蛇被消灭（PRD：头撞红蛇身体）
        const goldPos = { ...this.enemy.head };
        this.enemy.kill();
        this.map.beans.push({ x: goldPos.x, y: goldPos.y, gold: true });
      } else if (this.enemy.headHitsPlayer(this.snake.body)) {
        // 红蛇头撞玩家身
        this._fail("被红蛇撞击");
        return;
      }
    }

    // 吃豆
    const bi = this.map.beans.findIndex(
      (b) => b.x === this.snake.head.x && b.y === this.snake.head.y
    );
    if (bi >= 0) {
      const bean = this.map.beans[bi];
      this.map.beans.splice(bi, 1);
      this.snake.grow(1);
      this.score += bean.gold ? 30 : 10;
    }

    // 胜利：吃完所有豆
    if (this.map.beans.length === 0) {
      // 第 10 关还需存活（已满足）且敌蛇可已死可活——PRD：吃完30颗豆并存活
      this._win();
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
      enemy: this.enemy,
      movers: this.movers,
      reverseActive: this.reverseActive,
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

  _win() {
    this.ended = true;
    this.running = false;
    this.renderer.draw(this._drawState());
    const hasNext = this.levelId < 10;
    this.ui.showModal({
      win: true,
      title: this.levelId === 10 ? "通关！最终试炼完成" : "过关成功",
      score: this.score,
      reason: `「${this.map.def.name}」挑战完成`,
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
