/**
 * Canvas 渲染：地图、野生蛇、玩家皮肤特效
 */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.cell = 24;
    this.particles = [];
    this.trail = [];
    this.eatFlash = 0;
    this.rainbowShift = 0;
  }

  resize(cols, rows) {
    const maxW = Math.min(window.innerWidth - 32, 900);
    const maxH = window.innerHeight - 160;
    this.cell = Math.max(12, Math.floor(Math.min(maxW / cols, maxH / rows)));
    this.canvas.width = cols * this.cell;
    this.canvas.height = rows * this.cell;
  }

  reset() {
    this.particles = [];
    this.trail = [];
    this.eatFlash = 0;
  }

  notifyEat(skin) {
    this.eatFlash = 8;
    if (skin?.style === "rainbow") this.rainbowShift = (this.rainbowShift + 1) % 7;
  }

  clear() {
    const { ctx, canvas } = this;
    ctx.fillStyle = "#0a1610";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  draw(state) {
    const { ctx } = this;
    const { map, snake, wildSnakes, movers, reverseActive, skin, time } = state;
    const c = this.cell;
    const t = time || performance.now();

    this.clear();

    // 黑洞皮肤：轻微网格扭曲感（错位棋盘）
    const warp = skin?.style === "void";
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        let ox = 0;
        if (warp) {
          ox = Math.sin((x + y) * 0.6 + t * 0.003) * 1.2;
        }
        ctx.fillStyle = (x + y) % 2 === 0 ? "#0f2218" : "#12281c";
        ctx.fillRect(x * c + ox, y * c, c, c);
      }
    }

    for (const m of map.mud) {
      ctx.fillStyle = "rgba(110, 72, 36, 0.72)";
      ctx.fillRect(m.x * c, m.y * c, c, c);
    }

    for (const w of map.obstacles) this._wall(w.x, w.y);

    if (movers) {
      for (const mv of movers) {
        for (let i = 0; i < mv.length; i++) this._mover(mv.x + i, mv.y);
      }
    }

    for (const s of map.spikes) this._spike(s.x, s.y);

    for (const b of map.beans) this._bean(b.x, b.y, b.gold);

    // 野生蛇
    if (wildSnakes) {
      for (const ws of wildSnakes) {
        if (!ws.alive) continue;
        const col = ws.colors;
        this._snakeBasic(ws.body, col.head, col.body, false);
      }
    }

    // 玩家蛇（皮肤）
    this._drawSkinnedSnake(snake, skin, t);

    // 粒子
    this._updateParticles(t);

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

    if (this.eatFlash > 0) this.eatFlash--;
  }

  _drawSkinnedSnake(snake, skin, t) {
    const style = skin?.style || "pixel";
    const body = snake.body;
    const flash = snake.invincibleTicks > 0;

    if (style === "neon") {
      this._pushTrail(body[0]);
      this._drawTrail(skin.glow);
    }

    if (style === "lantern") {
      this._pushTrail(body[0], 10);
      this._drawLanternTrail();
    }

    for (let i = body.length - 1; i >= 0; i--) {
      const seg = body[i];
      const isHead = i === 0;
      this._segment(seg, i, body, skin, style, flash, t, isHead);
    }

    if (style === "lava") this._emitEmbers(body[0], skin, t);
    if (style === "mech") this._drawGears(body, skin, t);
    if (style === "crown") this._drawCrown(body[0], skin, t);
    if (style === "octopus") this._drawTentacles(body[0], body[1], skin, t);
    if (style === "dino") this._drawDinoJaw(body[0], skin);
  }

  _segment(seg, i, body, skin, style, flash, t, isHead) {
    const { ctx } = this;
    const c = this.cell;
    const n = body.length;
    const fade = i / Math.max(1, n - 1);
    const pad = Math.max(1, c * (0.1 + fade * 0.08));

    let color;
    let alpha = 1;

    if (style === "rainbow") {
      const palette = skin.palette || ["#ff5c5c", "#5cff8a", "#5cb8ff"];
      color = palette[(i + this.rainbowShift) % palette.length];
    } else if (style === "ghost") {
      color = isHead ? skin.head : skin.body;
      alpha = skin.alpha ?? 0.45;
      if (Math.floor(t / 200) % 2 === 0) alpha *= 0.7;
    } else if (style === "crystal") {
      color = isHead ? skin.head : skin.body;
      alpha = skin.alpha ?? 0.72;
    } else if (isHead) {
      color =
        flash && Math.floor(t / 80) % 2 === 0 ? "#ffffff" : skin.head || "#5dff8a";
    } else {
      color = lerpColor(skin.body || "#2bc45a", "#0a2814", fade * 0.4);
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    if (style === "neon" && isHead) {
      ctx.shadowColor = skin.glow || "#5ce1ff";
      ctx.shadowBlur = 12;
    }
    if (style === "void") {
      ctx.shadowColor = "#6b2dff";
      ctx.shadowBlur = isHead ? 14 : 6;
    }

    if (style === "pixel") {
      ctx.fillStyle = color;
      ctx.fillRect(seg.x * c + pad, seg.y * c + pad, c - pad * 2, c - pad * 2);
      ctx.strokeStyle = skin.border || "#0a1a0c";
      ctx.lineWidth = Math.max(1, c * 0.06);
      ctx.strokeRect(seg.x * c + pad, seg.y * c + pad, c - pad * 2, c - pad * 2);
    } else {
      ctx.fillStyle = color;
      roundRect(ctx, seg.x * c + pad, seg.y * c + pad, c - pad * 2, c - pad * 2, c * 0.2);
      ctx.fill();
    }

    if (style === "crystal" && isHead) {
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.beginPath();
      ctx.arc(seg.x * c + c * 0.35, seg.y * c + c * 0.35, c * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    if (isHead && style !== "dino" && style !== "crown" && style !== "octopus") {
      const eye = Math.max(1.5, c * 0.1);
      ctx.fillStyle = style === "ghost" ? "rgba(20,30,40,0.7)" : "#062010";
      ctx.beginPath();
      ctx.arc(seg.x * c + c * 0.35, seg.y * c + c * 0.38, eye, 0, Math.PI * 2);
      ctx.arc(seg.x * c + c * 0.65, seg.y * c + c * 0.38, eye, 0, Math.PI * 2);
      ctx.fill();
    }

    // 帝王尾宝石
    if (style === "crown" && i === n - 1) {
      ctx.fillStyle = skin.jewel || "#ff2d55";
      ctx.beginPath();
      ctx.arc(seg.x * c + c / 2, seg.y * c + c / 2, c * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _snakeBasic(body, headColor, bodyColor, flash) {
    const { ctx } = this;
    const c = this.cell;
    const n = body.length;
    for (let i = n - 1; i >= 0; i--) {
      const seg = body[i];
      const t = i / Math.max(1, n - 1);
      const pad = Math.max(1, c * (0.12 + t * 0.08));
      ctx.fillStyle =
        i === 0
          ? flash && Math.floor(performance.now() / 80) % 2 === 0
            ? "#ffffff"
            : headColor
          : lerpColor(bodyColor, "#0a2814", t * 0.45);
      roundRect(ctx, seg.x * c + pad, seg.y * c + pad, c - pad * 2, c - pad * 2, c * 0.2);
      ctx.fill();
      if (i === 0) {
        const eye = Math.max(1.5, c * 0.1);
        ctx.fillStyle = "#062010";
        ctx.beginPath();
        ctx.arc(seg.x * c + c * 0.35, seg.y * c + c * 0.38, eye, 0, Math.PI * 2);
        ctx.arc(seg.x * c + c * 0.65, seg.y * c + c * 0.38, eye, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  _pushTrail(head, max = 8) {
    if (!head) return;
    this.trail.unshift({ x: head.x, y: head.y, life: max });
    if (this.trail.length > max) this.trail.length = max;
  }

  _drawTrail(glow) {
    const { ctx } = this;
    const c = this.cell;
    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i];
      ctx.fillStyle = glow || "rgba(92,225,255,0.3)";
      ctx.globalAlpha = 0.35 * (1 - i / this.trail.length);
      const pad = c * (0.2 + i * 0.04);
      roundRect(ctx, p.x * c + pad, p.y * c + pad, c - pad * 2, c - pad * 2, c * 0.2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  _drawLanternTrail() {
    const { ctx } = this;
    const c = this.cell;
    for (let i = 1; i < this.trail.length; i++) {
      const p = this.trail[i];
      ctx.globalAlpha = 0.25 * (1 - i / this.trail.length);
      ctx.fillStyle = "#ff6b4a";
      const s = c * 0.35;
      ctx.fillRect(p.x * c + c / 2 - s / 2, p.y * c + c / 2 - s / 2, s, s * 1.2);
      ctx.fillStyle = "#ffd54a";
      ctx.fillRect(p.x * c + c / 2 - s * 0.15, p.y * c + c / 2 - s * 0.7, s * 0.3, s * 0.25);
    }
    ctx.globalAlpha = 1;
  }

  _emitEmbers(head, skin, t) {
    if (!head || Math.floor(t / 90) % 2 !== 0) return;
    const c = this.cell;
    this.particles.push({
      x: head.x * c + c * (0.3 + Math.random() * 0.4),
      y: head.y * c,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -1 - Math.random(),
      life: 20 + Math.random() * 10,
      color: Math.random() > 0.5 ? skin.ember : skin.head,
    });
  }

  _updateParticles() {
    const { ctx } = this;
    this.particles = this.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) return false;
      ctx.globalAlpha = Math.min(1, p.life / 15);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      return true;
    });
  }

  _drawGears(body, skin, t) {
    const { ctx } = this;
    const c = this.cell;
    const ang = (t / 400) % (Math.PI * 2);
    for (let i = 1; i < body.length; i += 2) {
      const seg = body[i];
      const cx = seg.x * c + c / 2;
      const cy = seg.y * c + c / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ang * (i % 4 === 1 ? 1 : -1));
      ctx.strokeStyle = skin.gear || "#f0c14a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, c * 0.18, 0, Math.PI * 2);
      ctx.stroke();
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * c * 0.1, Math.sin(a) * c * 0.1);
        ctx.lineTo(Math.cos(a) * c * 0.22, Math.sin(a) * c * 0.22);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  _drawCrown(head, skin, t) {
    if (!head) return;
    const { ctx } = this;
    const c = this.cell;
    const wobble = Math.sin(t / 280) * c * 0.06;
    const x = head.x * c + c * 0.2;
    const y = head.y * c + c * 0.05 + wobble;
    ctx.fillStyle = skin.head;
    ctx.beginPath();
    ctx.moveTo(x, y + c * 0.28);
    ctx.lineTo(x + c * 0.15, y);
    ctx.lineTo(x + c * 0.3, y + c * 0.2);
    ctx.lineTo(x + c * 0.45, y);
    ctx.lineTo(x + c * 0.6, y + c * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = skin.jewel;
    ctx.beginPath();
    ctx.arc(x + c * 0.3, y + c * 0.12, c * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawTentacles(head, neck, skin, t) {
    if (!head) return;
    const { ctx } = this;
    const c = this.cell;
    const cx = head.x * c + c / 2;
    const cy = head.y * c + c / 2;
    const sway = Math.sin(t / 200) * c * 0.25;
    ctx.strokeStyle = skin.tentacle || skin.head;
    ctx.lineWidth = Math.max(2, c * 0.12);
    ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + side * c * 0.2, cy - c * 0.1);
      ctx.quadraticCurveTo(
        cx + side * c * 0.55 + sway * side,
        cy - c * 0.45,
        cx + side * c * 0.35,
        cy - c * 0.7
      );
      ctx.stroke();
    }
  }

  _drawDinoJaw(head, skin) {
    if (!head) return;
    const { ctx } = this;
    const c = this.cell;
    const open = this.eatFlash > 0 ? c * 0.12 : c * 0.04;
    ctx.fillStyle = skin.jaw || "#1a4a10";
    ctx.fillRect(head.x * c + c * 0.25, head.y * c + c * 0.55, c * 0.5, c * 0.2 + open);
    // 眼睛偏上
    const eye = Math.max(1.5, c * 0.09);
    ctx.fillStyle = "#062010";
    ctx.beginPath();
    ctx.arc(head.x * c + c * 0.35, head.y * c + c * 0.32, eye, 0, Math.PI * 2);
    ctx.arc(head.x * c + c * 0.62, head.y * c + c * 0.32, eye, 0, Math.PI * 2);
    ctx.fill();
  }

  _wall(x, y) {
    const { ctx } = this;
    const c = this.cell;
    const pad = Math.max(1, c * 0.08);
    ctx.fillStyle = "#3a4550";
    ctx.fillRect(x * c + pad, y * c + pad, c - pad * 2, c - pad * 2);
    ctx.fillStyle = "#5a6878";
    ctx.fillRect(x * c + pad, y * c + pad, c - pad * 2, Math.max(2, c * 0.18));
  }

  _mover(x, y) {
    const { ctx } = this;
    const c = this.cell;
    const pad = Math.max(1, c * 0.1);
    ctx.fillStyle = "#6b7c8f";
    roundRect(ctx, x * c + pad, y * c + pad, c - pad * 2, c - pad * 2, 3);
    ctx.fill();
  }

  _spike(x, y) {
    const { ctx } = this;
    const c = this.cell;
    const cx = x * c + c / 2;
    const cy = y * c + c / 2;
    ctx.fillStyle = "#8b1e2d";
    ctx.beginPath();
    ctx.moveTo(cx, y * c + c * 0.15);
    ctx.lineTo(x * c + c * 0.85, y * c + c * 0.85);
    ctx.lineTo(x * c + c * 0.15, y * c + c * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c43a4a";
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
    ctx.fillStyle = gold ? "#ffd54a" : "#ff4d5e";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
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
  if (!pa || !pb) return a;
  const r = Math.round(pa.r + (pb.r - pa.r) * t);
  const g = Math.round(pa.g + (pb.g - pa.g) * t);
  const bl = Math.round(pa.b + (pb.b - pa.b) * t);
  return `rgb(${r},${g},${bl})`;
}

function hexToRgb(hex) {
  if (!hex || typeof hex !== "string" || !hex.startsWith("#")) return null;
  const h = hex.replace("#", "");
  if (h.length < 6) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
