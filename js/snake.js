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
   * @param {{width:number,height:number,wrap:boolean}} map
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

  /** V2：保留方法供调试，游戏不再因撞自身失败 */
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

/** 野生蛇类型外观 */
export const WILD_TYPES = {
  forager: { id: "forager", label: "觅食型", head: "#5dff8a", body: "#1a8a40" },
  wanderer: { id: "wanderer", label: "游荡型", head: "#b0b8c0", body: "#6a727a" },
  attacker: { id: "attacker", label: "攻击型", head: "#ff3b4a", body: "#c02030" },
};

/**
 * 野生蛇 NPC：觅食 / 游荡 / 攻击
 */
export class WildSnake {
  /**
   * @param {"forager"|"wanderer"|"attacker"} type
   */
  constructor(body, dir, type = "forager") {
    this.body = body.map((c) => ({ ...c }));
    this.dir = { ...dir };
    this.type = type;
    this.alive = true;
    this.growPending = 0;
  }

  get head() {
    return this.body[0];
  }

  get colors() {
    return WILD_TYPES[this.type] || WILD_TYPES.forager;
  }

  occupies(x, y) {
    return this.body.some((c) => c.x === x && c.y === y);
  }

  /**
   * @param {object} map
   * @param {Set} wallSet
   * @param {{x:number,y:number}[]} beans
   * @param {{x:number,y:number}[]} playerBody
   * @param {function} rng
   * @param {{x:number,y:number}[]} moversOccupied 可选：移动挡板占用
   */
  step(map, wallSet, beans, playerBody, rng, moversOccupied = []) {
    if (!this.alive) return;

    const dirs = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];

    let target = null;
    if (this.type === "forager" && beans.length) {
      target = nearest(beans, this.head);
    } else if (this.type === "attacker" && playerBody.length) {
      // 拦截：朝玩家头前方一格，否则朝玩家头
      const ph = playerBody[0];
      target = { x: ph.x, y: ph.y };
    }

    const moverSet = new Set(moversOccupied.map((c) => cellKey(c.x, c.y)));

    const candidates = dirs.filter((d) => {
      if (this.body.length > 1 && d.x + this.dir.x === 0 && d.y + this.dir.y === 0) {
        return false;
      }
      let nx = this.head.x + d.x;
      let ny = this.head.y + d.y;
      if (map.def?.wrap) {
        nx = ((nx % map.width) + map.width) % map.width;
        ny = ((ny % map.height) + map.height) % map.height;
      } else if (!inBounds(nx, ny, map.width, map.height)) {
        return false;
      }
      if (wallSet.has(cellKey(nx, ny))) return false;
      if (moverSet.has(cellKey(nx, ny))) return false;
      // 避开自己身体
      if (this.body.some((c) => c.x === nx && c.y === ny)) return false;
      // 避障：前方是玩家蛇头时倾向转向（攻击型除外）
      if (this.type !== "attacker" && playerBody[0] && playerBody[0].x === nx && playerBody[0].y === ny) {
        return false;
      }
      return true;
    });

    if (candidates.length === 0) return;

    let chosen = candidates[Math.floor(rng() * candidates.length)];

    if (this.type === "wanderer") {
      // 游荡：多数随机，偶尔保持直行
      const forward = candidates.find((d) => d.x === this.dir.x && d.y === this.dir.y);
      if (forward && rng() < 0.55) chosen = forward;
      else chosen = candidates[Math.floor(rng() * candidates.length)];
    } else if (target) {
      candidates.sort((a, b) => {
        const da =
          Math.abs(this.head.x + a.x - target.x) +
          Math.abs(this.head.y + a.y - target.y);
        const db =
          Math.abs(this.head.x + b.x - target.x) +
          Math.abs(this.head.y + b.y - target.y);
        return da - db;
      });
      const greed = this.type === "attacker" ? 0.85 : 0.7;
      if (rng() < greed) chosen = candidates[0];
    }

    this.dir = chosen;
    let nx = this.head.x + this.dir.x;
    let ny = this.head.y + this.dir.y;
    if (map.def?.wrap) {
      nx = ((nx % map.width) + map.width) % map.width;
      ny = ((ny % map.height) + map.height) % map.height;
    }

    this.body.unshift({ x: nx, y: ny });

    // 觅食型 / 攻击型抢豆；游荡型路过也吃
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

  /** 玩家头撞野生蛇任意节 → 野生蛇死亡 */
  hitByPlayerHead(px, py) {
    if (!this.alive) return false;
    return this.body.some((c) => c.x === px && c.y === py);
  }

  /** 野生蛇头撞玩家身体（含头）→ 野生蛇死亡（V2 规则） */
  headHitsPlayer(playerBody) {
    if (!this.alive) return false;
    const h = this.head;
    return playerBody.some((c) => c.x === h.x && c.y === h.y);
  }

  kill() {
    this.alive = false;
  }
}

function nearest(points, from) {
  let best = null;
  let bestD = Infinity;
  for (const p of points) {
    const d = Math.abs(p.x - from.x) + Math.abs(p.y - from.y);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/** @deprecated 使用 WildSnake；保留别名兼容 */
export const EnemySnake = WildSnake;
