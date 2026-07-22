import { mulberry32, cellKey } from "./utils.js";

/**
 * V2 关卡：提高障碍密度，配置野生蛇与反应时间覆盖。
 * wildlife: [{ type, count, spawnDelay? }]
 */
export const LEVELS = [
  {
    id: 1,
    name: "初探",
    theme: "教学关卡 · 无墙",
    width: 15,
    height: 15,
    beanCount: 5,
    wrap: false,
    baseSpeed: 140,
    lives: null,
    timeLimit: null,
    reverseInterval: null,
    reactionTimeMs: null,
    wildlife: [],
    movingObstacles: false,
    buildObstacles: () => [],
    buildMud: () => [],
    buildSpikes: () => [],
  },
  {
    id: 2,
    name: "碎石迷宫",
    theme: "静态障碍 · 觅食绿蛇",
    width: 18,
    height: 18,
    beanCount: 8,
    wrap: false,
    baseSpeed: 130,
    lives: null,
    timeLimit: null,
    reverseInterval: null,
    reactionTimeMs: null,
    wildlife: [{ type: "forager", count: 1, spawnDelay: 10000 }],
    movingObstacles: false,
    buildObstacles: (w, h, rng) => scattered(w, h, rng, 9, 3),
    buildMud: () => [],
    buildSpikes: () => [],
  },
  {
    id: 3,
    name: "狭路相逢",
    theme: "窄道 · 游荡灰蛇",
    width: 20,
    height: 12,
    beanCount: 10,
    wrap: false,
    baseSpeed: 125,
    lives: null,
    timeLimit: null,
    reverseInterval: null,
    reactionTimeMs: null,
    wildlife: [{ type: "wanderer", count: 1, spawnDelay: 10000 }],
    movingObstacles: false,
    buildObstacles: (w, h) => {
      const cells = [];
      const midY = Math.floor(h / 2);
      for (let x = 1; x < w - 1; x++) {
        if (x === 4 || x === 5 || x === 14 || x === 15) continue;
        cells.push({ x, y: midY });
      }
      for (let y = 1; y < midY - 1; y++) {
        cells.push({ x: 8, y });
        cells.push({ x: 9, y });
      }
      for (let y = midY + 2; y < h - 1; y++) {
        cells.push({ x: 11, y });
        cells.push({ x: 12, y });
      }
      return cells;
    },
    buildMud: () => [],
    buildSpikes: () => [],
  },
  {
    id: 4,
    name: "穿墙奇术",
    theme: "边界传送 · 专注操作",
    width: 20,
    height: 20,
    beanCount: 12,
    wrap: true,
    baseSpeed: 120,
    lives: null,
    timeLimit: null,
    reverseInterval: null,
    reactionTimeMs: null,
    wildlife: [],
    movingObstacles: false,
    buildObstacles: (w, h) => {
      const cells = [];
      const m = 4;
      for (let x = m; x < w - m; x++) {
        if (x === Math.floor(w / 2) || x === Math.floor(w / 2) - 1) continue;
        cells.push({ x, y: m });
        cells.push({ x, y: h - 1 - m });
      }
      for (let y = m + 1; y < h - 1 - m; y++) {
        if (y === Math.floor(h / 2) || y === Math.floor(h / 2) - 1) continue;
        cells.push({ x: m, y });
        cells.push({ x: w - 1 - m, y });
      }
      // 额外内环碎片
      for (let x = 7; x < 13; x++) {
        if (x === 9 || x === 10) continue;
        cells.push({ x, y: 8 });
        cells.push({ x, y: 11 });
      }
      return cells;
    },
    buildMud: () => [],
    buildSpikes: () => [],
  },
  {
    id: 5,
    name: "减速泥潭",
    theme: "移速 -50% · 抢食绿蛇",
    width: 20,
    height: 20,
    beanCount: 15,
    wrap: false,
    baseSpeed: 115,
    lives: null,
    timeLimit: null,
    reverseInterval: null,
    reactionTimeMs: null,
    wildlife: [{ type: "forager", count: 1, spawnDelay: 10000 }],
    movingObstacles: false,
    buildObstacles: (w, h, rng) => scattered(w, h, rng, 10, 3),
    buildMud: (w, h) => [
      ...rect(3, 3, 3, 3),
      ...rect(13, 7, 3, 3),
      ...rect(7, 14, 3, 3),
      ...rect(15, 15, 2, 2),
    ].filter((c) => c.x < w && c.y < h),
    buildSpikes: () => [],
  },
  {
    id: 6,
    name: "移动挡板",
    theme: "动态障碍 · 游荡灰蛇",
    width: 20,
    height: 20,
    beanCount: 15,
    wrap: false,
    baseSpeed: 110,
    lives: null,
    timeLimit: null,
    reverseInterval: null,
    reactionTimeMs: null,
    wildlife: [{ type: "wanderer", count: 1, spawnDelay: 8000 }],
    movingObstacles: true,
    buildObstacles: (w, h, rng) => scattered(w, h, rng, 7, 3),
    buildMud: () => [],
    buildSpikes: () => [],
    buildMovers: (w) => [
      { y: 4, length: 4, x: 2, dir: 1, minX: 1, maxX: w - 5, speedSteps: 1 },
      { y: 8, length: 5, x: 8, dir: -1, minX: 1, maxX: w - 6, speedSteps: 1 },
      { y: 12, length: 4, x: 3, dir: 1, minX: 1, maxX: w - 5, speedSteps: 1 },
      { y: 16, length: 3, x: 5, dir: -1, minX: 1, maxX: w - 4, speedSteps: 1 },
    ],
  },
  {
    id: 7,
    name: "生命危机",
    theme: "尖刺扣血 · 双绿蛇",
    width: 22,
    height: 22,
    beanCount: 20,
    wrap: false,
    baseSpeed: 105,
    lives: 3,
    timeLimit: null,
    reverseInterval: null,
    reactionTimeMs: null,
    wildlife: [{ type: "forager", count: 2, spawnDelay: 10000 }],
    movingObstacles: false,
    buildObstacles: (w, h, rng) => scattered(w, h, rng, 16, 3),
    buildMud: () => [],
    buildSpikes: (w, h, rng) => scattered(w, h, rng, 16, 4, "spike"),
  },
  {
    id: 8,
    name: "镜像世界",
    theme: "反向控制 · 反应 150ms",
    width: 22,
    height: 22,
    beanCount: 18,
    wrap: false,
    baseSpeed: 110,
    lives: null,
    timeLimit: null,
    reverseInterval: 5000,
    reactionTimeMs: 150,
    wildlife: [{ type: "wanderer", count: 1, spawnDelay: 8000 }],
    movingObstacles: false,
    buildObstacles: (w, h) => {
      const cells = [];
      const cx = Math.floor(w / 2);
      for (let i = 2; i < h - 2; i++) {
        if (i % 4 === 0) continue;
        cells.push({ x: cx - 4, y: i });
        cells.push({ x: cx - 3, y: i });
        cells.push({ x: cx + 3, y: i });
        cells.push({ x: cx + 4, y: i });
      }
      for (let x = 2; x < w - 2; x++) {
        if (x >= cx - 4 && x <= cx - 3) continue;
        if (x >= cx + 3 && x <= cx + 4) continue;
        if (x === cx) continue;
        if (x % 3 === 0) {
          cells.push({ x, y: 3 });
          cells.push({ x, y: 4 });
          cells.push({ x, y: h - 5 });
          cells.push({ x, y: h - 4 });
        }
      }
      return cells;
    },
    buildMud: () => [],
    buildSpikes: () => [],
  },
  {
    id: 9,
    name: "时间竞速",
    theme: "60 秒 · 双绿蛇抢分",
    width: 25,
    height: 25,
    beanCount: 25,
    wrap: false,
    baseSpeed: 100,
    lives: null,
    timeLimit: 60,
    reverseInterval: null,
    reactionTimeMs: null,
    wildlife: [{ type: "forager", count: 2, spawnDelay: 8000 }],
    movingObstacles: false,
    buildObstacles: (w, h, rng) => {
      const cells = scattered(w, h, rng, 36, 4);
      for (let y = 5; y < 20; y++) {
        if (y % 3 === 0) continue;
        cells.push({ x: 7, y });
        cells.push({ x: 8, y });
        cells.push({ x: 16, y });
        cells.push({ x: 17, y });
      }
      return dedupe(cells);
    },
    buildMud: () => [],
    buildSpikes: () => [],
  },
  {
    id: 10,
    name: "最终试炼",
    theme: "综合地形 · 红蛇+灰蛇",
    width: 25,
    height: 25,
    beanCount: 30,
    wrap: false,
    baseSpeed: 100,
    lives: 3,
    timeLimit: null,
    reverseInterval: null,
    reactionTimeMs: null,
    wildlife: [
      { type: "attacker", count: 1, spawnDelay: 6000 },
      { type: "wanderer", count: 1, spawnDelay: 10000 },
    ],
    movingObstacles: false,
    buildObstacles: (w, h, rng) => scattered(w, h, rng, 26, 4),
    buildMud: (w, h) => [
      ...rect(2, 2, 4, 3),
      ...rect(17, 11, 4, 3),
      ...rect(9, 19, 4, 3),
      ...rect(18, 3, 3, 2),
    ].filter((c) => c.x < w && c.y < h),
    buildSpikes: (w, h, rng) => scattered(w, h, rng, 14, 5, "spike"),
  },
];

function centerAvoid(w, h, radius) {
  const set = new Set();
  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      set.add(cellKey(cx + dx, cy + dy));
    }
  }
  return set;
}

function rect(x0, y0, rw, rh) {
  const out = [];
  for (let y = y0; y < y0 + rh; y++) {
    for (let x = x0; x < x0 + rw; x++) {
      out.push({ x, y });
    }
  }
  return out;
}

function scattered(w, h, rng, count, avoidR, _tag) {
  const cells = [];
  const used = new Set();
  const avoid = centerAvoid(w, h, avoidR);
  let guard = 0;
  while (cells.length < count && guard < 5000) {
    guard++;
    const x = 1 + Math.floor(rng() * (w - 2));
    const y = 1 + Math.floor(rng() * (h - 2));
    const k = cellKey(x, y);
    if (used.has(k) || avoid.has(k)) continue;
    used.add(k);
    cells.push({ x, y });
  }
  return cells;
}

function dedupe(cells) {
  const seen = new Set();
  return cells.filter((c) => {
    const k = cellKey(c.x, c.y);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function buildLevel(levelId) {
  const def = LEVELS.find((l) => l.id === levelId);
  if (!def) throw new Error(`Unknown level ${levelId}`);

  const rng = mulberry32(levelId * 9973 + 42);
  const w = def.width;
  const h = def.height;

  const obstacles = dedupe(def.buildObstacles(w, h, rng));
  const wallSet = new Set(obstacles.map((c) => cellKey(c.x, c.y)));

  const mud = dedupe(def.buildMud(w, h, rng)).filter(
    (c) => !wallSet.has(cellKey(c.x, c.y))
  );
  const mudSet = new Set(mud.map((c) => cellKey(c.x, c.y)));

  const spikes = dedupe(def.buildSpikes(w, h, rng)).filter((c) => {
    const k = cellKey(c.x, c.y);
    return !wallSet.has(k) && !mudSet.has(k);
  });
  const spikeSet = new Set(spikes.map((c) => cellKey(c.x, c.y)));

  const movers = def.buildMovers ? def.buildMovers(w, h) : [];

  const blocked = new Set([...wallSet, ...spikeSet]);

  const startX = Math.floor(w / 2) - 2;
  const startY = Math.floor(h / 2);
  const snakeBody = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
  ];
  for (const s of snakeBody) blocked.add(cellKey(s.x, s.y));

  const beans = [];
  const beanSet = new Set();
  let guard = 0;
  while (beans.length < def.beanCount && guard < 8000) {
    guard++;
    const x = Math.floor(rng() * w);
    const y = Math.floor(rng() * h);
    const k = cellKey(x, y);
    if (blocked.has(k) || beanSet.has(k) || mudSet.has(k)) continue;
    if (Math.abs(x - startX) + Math.abs(y - startY) < 3) continue;
    beanSet.add(k);
    beans.push({ x, y, gold: false });
  }

  return {
    def,
    width: w,
    height: h,
    obstacles,
    mud,
    spikes,
    movers: movers.map((m) => ({ ...m, tick: 0 })),
    wallSet,
    mudSet,
    spikeSet,
    beans,
    snakeBody,
    startDir: { x: 1, y: 0 },
  };
}

export function getLevelMeta(id) {
  return LEVELS.find((l) => l.id === id);
}
