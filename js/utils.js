/** 方向常量与工具 */
export const DIR = {
  UP: { x: 0, y: -1, name: "UP" },
  DOWN: { x: 0, y: 1, name: "DOWN" },
  LEFT: { x: -1, y: 0, name: "LEFT" },
  RIGHT: { x: 1, y: 0, name: "RIGHT" },
};

export const OPPOSITE = {
  UP: "DOWN",
  DOWN: "UP",
  LEFT: "RIGHT",
  RIGHT: "LEFT",
};

export const KEY_TO_DIR = {
  ArrowUp: "UP",
  ArrowDown: "DOWN",
  ArrowLeft: "LEFT",
  ArrowRight: "RIGHT",
};

export function dirsEqual(a, b) {
  return a && b && a.x === b.x && a.y === b.y;
}

export function isOpposite(a, b) {
  if (!a || !b) return false;
  return a.x + b.x === 0 && a.y + b.y === 0;
}

export function keyOfDir(dir) {
  if (dir.x === 0 && dir.y === -1) return "UP";
  if (dir.x === 0 && dir.y === 1) return "DOWN";
  if (dir.x === -1 && dir.y === 0) return "LEFT";
  if (dir.x === 1 && dir.y === 0) return "RIGHT";
  return null;
}

export function dirFromKey(key) {
  return DIR[key] || null;
}

/** 确定性伪随机（关卡可复现） */
export function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function cellKey(x, y) {
  return `${x},${y}`;
}

export function inBounds(x, y, w, h) {
  return x >= 0 && y >= 0 && x < w && y < h;
}
