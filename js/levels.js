import { mulberry32, cellKey } from "./utils.js";

/**
 * 10 关配置：尺寸、机制、豆数、障碍生成。
 * build(levelDef) 返回可玩地图数据。
 */
export const LEVELS = [
  {
    id: 1,
    name: "初探",
    theme: "基础移动教学",
    width: 15,
    height: 15,
    beanCount: 5,
    wrap: false,
    baseSpeed: 140,
    lives: null,
    timeLimit: null,
    reverseInterval: null,
    hasEnemy: false,
    movingObstacles: false,
    buildObstacles: () => [],
    buildMud: () => [],
    buildSpikes: () => [],
  },
  {
    id: 2,
    name: "碎石迷宫",
    theme: "绕行静态障碍",
    width: 18,
    height: 18,
    beanCount: 8,
    wrap: false,
    baseSpeed: 130,
    lives: null,
    timeLimit: null,
    reverseInterval: null,
    hasEnemy: false,
    movingObstacles: false,
    buildObstacles: (w, h, rng) => {
      // 5 个分散石块，避开中心出生区
      const cells = [];
      const used = new Set();
      const avoid = centerAvoid(w, h, 3);
      while (cells.length < 5) {
        const x = 1 + Math.floor(rng() * (w - 2));
        const y = 1 + Math.floor(rng() * (h - 2));
        const k = cellKey(x, y);
        if (used.has(k) || avoid.has(k)) continue;
        used.add(k);
        cells.push({ x, y });
      }
      return cells;
    },
    buildMud: () => [],
    buildSpikes: () => [],
  },
  {
    id: 3,
    name: "狭路相逢",
    theme: "长条形墙壁",
    width: 20,
    height: 12,
    beanCount: 10,
    wrap: false,
    baseSpeed: 125,
    lives: null,
    timeLimit: null,
    reverseInterval: null,
    hasEnemy: false,
    movingObstacles: false,
    buildObstacles: (w, h) => {
      const cells = [];
      // 中间横墙，留两处缺口
      const midY = Math.floor(h / 2);
      for (let x = 2; x < w - 2; x++) {
        if (x === 5 || x === 14) continue;
        cells.push({ x, y: midY });
      }
      // 竖向短墙
      for (let y = 1; y < midY - 1; y++) {
        cells.push({ x: 9, y });
      }
      for (let y = midY + 2; y < h - 1; y++) {
        cells.push({ x: 11, y });
      }
      return cells;
    },
    buildMud: () => [],
    buildSpikes: () => [],
  },
  {
    id: 4,
    name: "穿墙奇术",
    theme: "穿墙模式",
    width: 20,
    height: 20,
    beanCount: 12,
    wrap: true,
    baseSpeed: 120,
    lives: null,
    timeLimit: null,
    reverseInterval: null,
    hasEnemy: false,
    movingObstacles: false,
    // 内部围墙环，可穿外边界
    buildObstacles: (w, h) => {
      const cells = [];
      const m = 4;
      for (let x = m; x < w - m; x++) {
        if (x === Math.floor(w / 2)) continue;
        cells.push({ x, y: m });
        cells.push({ x, y: h - 1 - m });
      }
      for (let y = m + 1; y < h - 1 - m; y++) {
        if (y === Math.floor(h / 2)) continue;
        cells.push({ x: m, y });
        cells.push({ x: w - 1 - m, y });
      }
      return cells;
    },
    buildMud: () => [],
    buildSpikes: () => [],
  },
  {
    id: 5,
    name: "减速泥潭",
    theme: "泥潭减速 50%",
    width: 20,
    height: 20,
    beanCount: 15,
    wrap: false,
    baseSpeed: 115,
    lives: null,
    timeLimit: null,
    reverseInterval: null,
    hasEnemy: false,
    movingObstacles: false,
    buildObstacles: (w, h, rng) => scattered(w, h, rng, 6, 3),
    buildMud: (w, h) => {
      // 3 块 2x2 泥潭
      return [
        ...rect(4, 4, 2, 2),
        ...rect(14, 8, 2, 2),
        ...rect(8, 15, 2, 2),
      ].filter((c) => c.x < w && c.y < h);
    },
    buildSpikes: () => [],
  },
  {
    id: 6,
    name: "移动挡板",
    theme: "水平移动障碍",
    width: 20,
    height: 20,
    beanCount: 15,
    wrap: false,
    baseSpeed: 110,
    lives: null,
    timeLimit: null,
    reverseInterval: null,
    hasEnemy: false,
    movingObstacles: true,
    buildObstacles: (w, h, rng) => scattered(w, h, rng, 4, 3),
    buildMud: () => [],
    buildSpikes: () => [],
    // 移动挡板定义：水平往返
    buildMovers: (w) => [
      { y: 5, length: 4, x: 2, dir: 1, minX: 1, maxX: w - 5, speedSteps: 1 },
      { y: 10, length: 5, x: 8, dir: -1, minX: 1, maxX: w - 6, speedSteps: 1 },
      { y: 15, length: 3, x: 4, dir: 1, minX: 1, maxX: w - 4, speedSteps: 1 },
    ],
  },
  {
    id: 7,
    name: "生命危机",
    theme: "尖刺陷阱 · 3 命",
    width: 22,
    height: 22,
    beanCount: 20,
    wrap: false,
    baseSpeed: 105,
    lives: 3,
    timeLimit: null,
    reverseInterval: null,
    hasEnemy: false,
    movingObstacles: false,
    buildObstacles: (w, h, rng) => scattered(w, h, rng, 10, 3),
    buildMud: () => [],
    buildSpikes: (w, h, rng) => scattered(w, h, rng, 12, 4, "spike"),
  },
  {
    id: 8,
    name: "镜像世界",
    theme: "反向控制 · 每 5 秒切换",
    width: 22,
    height: 22,
    beanCount: 18,
    wrap: false,
    baseSpeed: 110,
    lives: null,
    timeLimit: null,
    reverseInterval: 5000,
    hasEnemy: false,
    movingObstacles: false,
    buildObstacles: (w, h) => {
      // 对称迷宫
      const cells = [];
      const cx = Math.floor(w / 2);
      for (let i = 3; i < h - 3; i++) {
        if (i % 4 === 0) continue;
        cells.push({ x: cx - 3, y: i });
        cells.push({ x: cx + 3, y: i });
      }
      for (let x = 2; x < w - 2; x++) {
        if (x === cx || x === cx - 3 || x === cx + 3) continue;
        if (x % 3 === 0) {
          cells.push({ x, y: 4 });
          cells.push({ x, y: h - 5 });
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
    theme: "60 秒倒计时",
    width: 25,
    height: 25,
    beanCount: 25,
    wrap: false,
    baseSpeed: 100,
    lives: null,
    timeLimit: 60,
    reverseInterval: null,
    hasEnemy: false,
    movingObstacles: false,
    buildObstacles: (w, h, rng) => {
      const cells = scattered(w, h, rng, 28, 4);
      // 石阵走廊
      for (let y = 6; y < 18; y++) {
        if (y % 3 === 0) continue;
        cells.push({ x: 8, y });
        cells.push({ x: 16, y });
      }
      return dedupe(cells);
    },
    buildMud: () => [],
    buildSpikes: () => [],
  },
  {
    id: 10,
    name: "最终试炼",
    theme: "墙+刺+泥潭 · Boss 红蛇",
    width: 25,
    height: 25,
    beanCount: 30,
    wrap: false,
    baseSpeed: 100,
    lives: 3,
    timeLimit: null,
    reverseInterval: null,
    hasEnemy: true,
    movingObstacles: false,
    buildObstacles: (w, h, rng) => scattered(w, h, rng, 18, 4),
    buildMud: (w, h) => [
      ...rect(3, 3, 3, 2),
      ...rect(18, 12, 3, 2),
      ...rect(10, 20, 3, 2),
    ].filter((c) => c.x < w && c.y < h),
    buildSpikes: (w, h, rng) => scattered(w, h, rng, 10, 5, "spike"),
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

/**
 * 构建关卡实例地图
 */
export function buildLevel(levelId) {
  const def = LEVELS.find((l) => l.id === levelId);
  if (!def) throw new Error(`Unknown level ${levelId}`);

  const rng = mulberry32(levelId * 9973 + 42);
  const w = def.width;
  const h = def.height;

  const obstacles = dedupe(def.buildObstacles(w, h, rng));
  const wallSet = new Set(obstacles.map((c) => cellKey(c.x, c.y)));

  // 泥潭避开墙
  const mud = dedupe(def.buildMud(w, h, rng)).filter(
    (c) => !wallSet.has(cellKey(c.x, c.y))
  );
  const mudSet = new Set(mud.map((c) => cellKey(c.x, c.y)));

  // 尖刺避开墙与泥潭
  const spikes = dedupe(def.buildSpikes(w, h, rng)).filter((c) => {
    const k = cellKey(c.x, c.y);
    return !wallSet.has(k) && !mudSet.has(k);
  });
  const spikeSet = new Set(spikes.map((c) => cellKey(c.x, c.y)));

  const movers = def.buildMovers ? def.buildMovers(w, h) : [];

  // 占用集合（豆不能刷在墙/刺/蛇身上；泥潭可走但也不刷豆）
  const blocked = new Set([...wallSet, ...spikeSet]);

  // 蛇出生：中心偏左，水平向右
  const startX = Math.floor(w / 2) - 2;
  const startY = Math.floor(h / 2);
  const snakeBody = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
  ];
  for (const s of snakeBody) blocked.add(cellKey(s.x, s.y));

  // 第 10 关预留敌蛇出生区
  if (def.hasEnemy) {
    for (let i = 0; i < 4; i++) blocked.add(cellKey(w - 4 + i, 3));
  }

  // 刷豆：避开占用格
  const beans = [];
  const beanSet = new Set();
  let guard = 0;
  while (beans.length < def.beanCount && guard < 8000) {
    guard++;
    const x = Math.floor(rng() * w);
    const y = Math.floor(rng() * h);
    const k = cellKey(x, y);
    if (blocked.has(k) || beanSet.has(k) || mudSet.has(k)) continue;
    // 远离蛇头至少 2 格
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
