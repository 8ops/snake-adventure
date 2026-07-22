import { cellKey, inBounds } from "./utils.js";

export class Snake {
  /**
   * @param {{x:number,y:number}[]} body 头在 index 0
   * @param {{x:number,y:number}} dir
   */
  constructor(body, dir) {
    this.body = body.map((c) => ({ ...c }));
    this.dir = { ...dir };
    this.growPending = 0;
    this.invincibleTicks = 0;
  }

  get head() {
    return this.body[0];
  }

  occupies(x, y) {
    return this.body.some((c) => c.x === x && c.y === y);
  }

  bodySet() {
    return new Set(this.body.map((c) => cellKey(c.x, c.y)));
  }

  setDir(dir) {
    this.dir = { ...dir };
  }

  grow(n = 1) {
    this.growPending += n;
  }

  /**
   * 前进一步
   * @param {{width:number,height:number,wrap:boolean}} map
   * @returns {{x:number,y:number}} 新头部（可能已穿墙）
   */
  step(map) {
    let nx = this.head.x + this.dir.x;
    let ny = this.head.y + this.dir.y;

    if (map.wrap) {
      nx = ((nx % map.width) + map.width) % map.width;
      ny = ((ny % map.height) + map.height) % map.height;
    }

    this.body.unshift({ x: nx, y: ny });

    if (this.growPending > 0) {
      this.growPending--;
    } else {
      this.body.pop();
    }

    if (this.invincibleTicks > 0) this.invincibleTicks--;

    return this.head;
  }

  /** 撞自身（忽略刚增长的尾部重叠边缘情况：标准是头撞任意身段） */
  hitsSelf() {
    const h = this.head;
    for (let i = 1; i < this.body.length; i++) {
      if (this.body[i].x === h.x && this.body[i].y === h.y) return true;
    }
    return false;
  }

  hitsWall(wallSet, map) {
    const h = this.head;
    if (!map.wrap && !inBounds(h.x, h.y, map.width, map.height)) return true;
    return wallSet.has(cellKey(h.x, h.y));
  }
}

/**
 * 第 10 关敌对红蛇：简单 AI，朝最近豆或随机走，避开墙。
 */
export class EnemySnake {
  constructor(body, dir) {
    this.body = body.map((c) => ({ ...c }));
    this.dir = { ...dir };
    this.alive = true;
    this.growPending = 0;
  }

  get head() {
    return this.body[0];
  }

  occupies(x, y) {
    return this.body.some((c) => c.x === x && c.y === y);
  }

  step(map, wallSet, beans, playerBody, rng) {
    if (!this.alive) return;

    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];

    // 倾向朝最近豆
    let target = null;
    if (beans.length) {
      let best = Infinity;
      for (const b of beans) {
        const d = Math.abs(b.x - this.head.x) + Math.abs(b.y - this.head.y);
        if (d < best) {
          best = d;
          target = b;
        }
      }
    }

    const candidates = dirs.filter((d) => {
      // 禁止掉头（长度>1）
      if (this.body.length > 1 && d.x + this.dir.x === 0 && d.y + this.dir.y === 0) {
        return false;
      }
      const nx = this.head.x + d.x;
      const ny = this.head.y + d.y;
      if (!inBounds(nx, ny, map.width, map.height)) return false;
      if (wallSet.has(cellKey(nx, ny))) return false;
      // 避开自己身体
      if (this.body.some((c) => c.x === nx && c.y === ny)) return false;
      return true;
    });

    if (candidates.length === 0) {
      // 卡住则原地抖动方向
      return;
    }

    let chosen = candidates[Math.floor(rng() * candidates.length)];
    if (target) {
      candidates.sort((a, b) => {
        const da =
          Math.abs(this.head.x + a.x - target.x) +
          Math.abs(this.head.y + a.y - target.y);
        const db =
          Math.abs(this.head.x + b.x - target.x) +
          Math.abs(this.head.y + b.y - target.y);
        return da - db;
      });
      // 70% 选最优
      if (rng() < 0.7) chosen = candidates[0];
    }

    this.dir = chosen;
    const nx = this.head.x + this.dir.x;
    const ny = this.head.y + this.dir.y;
    this.body.unshift({ x: nx, y: ny });

    // 吃到豆则增长（敌对也会吃普通豆，争夺）
    const bi = beans.findIndex((b) => b.x === nx && b.y === ny);
    if (bi >= 0) {
      beans.splice(bi, 1);
      this.growPending++;
    }

    if (this.growPending > 0) {
      this.growPending--;
    } else {
      this.body.pop();
    }
  }

  /** 玩家头撞红蛇身 → 红蛇死亡掉金豆 */
  hitByPlayerHead(px, py) {
    if (!this.alive) return false;
    for (let i = 0; i < this.body.length; i++) {
      if (this.body[i].x === px && this.body[i].y === py) {
        // 头撞头也算撞身体导致红蛇消失
        return true;
      }
    }
    return false;
  }

  /** 红蛇头撞玩家身 → 玩家死 */
  headHitsPlayer(playerBody) {
    if (!this.alive) return false;
    const h = this.head;
    return playerBody.some((c) => c.x === h.x && c.y === h.y);
  }

  kill() {
    this.alive = false;
  }
}
