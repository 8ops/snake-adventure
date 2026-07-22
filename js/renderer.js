const COLORS = {
  bg: "#0a1610",
  gridA: "#0f2218",
  gridB: "#12281c",
  wall: "#3a4550",
  wallHi: "#5a6878",
  mud: "rgba(110, 72, 36, 0.72)",
  spike: "#8b1e2d",
  spikeTip: "#c43a4a",
  bean: "#ff4d5e",
  gold: "#ffd54a",
  snakeHead: "#5dff8a",
  snakeBody: "#2bc45a",
  enemyHead: "#ff3b4a",
  enemyBody: "#c02030",
  mover: "#6b7c8f",
  border: "#1e4d32",
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.cell = 24;
  }

  resize(cols, rows) {
    const maxW = Math.min(window.innerWidth - 32, 900);
    const maxH = window.innerHeight - 160;
    this.cell = Math.max(12, Math.floor(Math.min(maxW / cols, maxH / rows)));
    this.canvas.width = cols * this.cell;
    this.canvas.height = rows * this.cell;
  }

  clear() {
    const { ctx, canvas } = this;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  draw(state) {
    const { ctx } = this;
    const { map, snake, enemy, movers, reverseActive } = state;
    const c = this.cell;

    this.clear();

    // 棋盘格
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.gridA : COLORS.gridB;
        ctx.fillRect(x * c, y * c, c, c);
      }
    }

    // 泥潭
    for (const m of map.mud) {
      ctx.fillStyle = COLORS.mud;
      ctx.fillRect(m.x * c, m.y * c, c, c);
    }

    // 墙
    for (const w of map.obstacles) {
      this._wall(w.x, w.y);
    }

    // 移动挡板
    if (movers) {
      for (const mv of movers) {
        for (let i = 0; i < mv.length; i++) {
          this._mover(mv.x + i, mv.y);
        }
      }
    }

    // 尖刺
    for (const s of map.spikes) {
      this._spike(s.x, s.y);
    }

    // 豆
    for (const b of map.beans) {
      this._bean(b.x, b.y, b.gold);
    }

    // 敌蛇
    if (enemy && enemy.alive) {
      this._snake(enemy.body, COLORS.enemyHead, COLORS.enemyBody);
    }

    // 玩家蛇
    this._snake(snake.body, COLORS.snakeHead, COLORS.snakeBody, snake.invincibleTicks > 0);

    // 穿墙提示边框色
    if (map.def.wrap) {
      ctx.strokeStyle = "rgba(93, 255, 138, 0.45)";
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, this.canvas.width - 3, this.canvas.height - 3);
    }

    if (reverseActive) {
      ctx.save();
      ctx.strokeStyle = "rgba(240, 122, 58, 0.55)";
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, this.canvas.width - 4, this.canvas.height - 4);
      ctx.restore();
    }
  }

  _wall(x, y) {
    const { ctx } = this;
    const c = this.cell;
    const pad = Math.max(1, c * 0.08);
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(x * c + pad, y * c + pad, c - pad * 2, c - pad * 2);
    ctx.fillStyle = COLORS.wallHi;
    ctx.fillRect(x * c + pad, y * c + pad, c - pad * 2, Math.max(2, c * 0.18));
  }

  _mover(x, y) {
    const { ctx } = this;
    const c = this.cell;
    const pad = Math.max(1, c * 0.1);
    ctx.fillStyle = COLORS.mover;
    roundRect(ctx, x * c + pad, y * c + pad, c - pad * 2, c - pad * 2, 3);
    ctx.fill();
  }

  _spike(x, y) {
    const { ctx } = this;
    const c = this.cell;
    const cx = x * c + c / 2;
    const cy = y * c + c / 2;
    ctx.fillStyle = COLORS.spike;
    ctx.beginPath();
    ctx.moveTo(cx, y * c + c * 0.15);
    ctx.lineTo(x * c + c * 0.85, y * c + c * 0.85);
    ctx.lineTo(x * c + c * 0.15, y * c + c * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.spikeTip;
    ctx.beginPath();
    ctx.arc(cx, cy - c * 0.05, c * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  _bean(x, y, gold) {
    const { ctx } = this;
    const c = this.cell;
    const cx = x * c + c / 2;
    const cy = y * c + c / 2;
    const r = c * (gold ? 0.32 : 0.26);
    ctx.fillStyle = gold ? COLORS.gold : COLORS.bean;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  _snake(body, headColor, bodyColor, flash) {
    const { ctx } = this;
    const c = this.cell;
    const n = body.length;
    for (let i = n - 1; i >= 0; i--) {
      const seg = body[i];
      const t = i / Math.max(1, n - 1);
      const pad = Math.max(1, c * (0.12 + t * 0.08));
      if (i === 0) {
        ctx.fillStyle = flash && Math.floor(performance.now() / 80) % 2 === 0
          ? "#ffffff"
          : headColor;
      } else {
        ctx.fillStyle = lerpColor(bodyColor, "#0a2814", t * 0.45);
      }
      roundRect(ctx, seg.x * c + pad, seg.y * c + pad, c - pad * 2, c - pad * 2, c * 0.2);
      ctx.fill();

      if (i === 0) {
        // 眼睛
        const eye = Math.max(1.5, c * 0.1);
        ctx.fillStyle = "#062010";
        ctx.beginPath();
        ctx.arc(seg.x * c + c * 0.35, seg.y * c + c * 0.38, eye, 0, Math.PI * 2);
        ctx.arc(seg.x * c + c * 0.65, seg.y * c + c * 0.38, eye, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function lerpColor(a, b, t) {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const r = Math.round(pa.r + (pb.r - pa.r) * t);
  const g = Math.round(pa.g + (pb.g - pa.g) * t);
  const bl = Math.round(pa.b + (pb.b - pa.b) * t);
  return `rgb(${r},${g},${bl})`;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
