/**
 * V2 游戏配置（对齐 PRD_V2 附录）
 */
export const GAME_SETTINGS = {
  gridSize: 20,
  defaultMoveInterval: 100,
  allowSelfCollision: false, // false = 不因撞自身死亡
  inputConfig: {
    reactionTimeMs: 100,
  },
  /** 同屏野生蛇上限 */
  maxWildSnakes: 2,
  /** 默认生成延迟（ms） */
  defaultWildlifeSpawnDelay: 10000,
  /** 豆子少于该数时尝试补刷野生蛇 */
  wildlifeBeanThreshold: 3,
};

export const SKINS = [
  {
    id: "S001",
    name: "经典像素",
    unlockScore: 0,
    style: "pixel",
    head: "#5dff8a",
    body: "#2bc45a",
    border: "#0a1a0c",
  },
  {
    id: "S002",
    name: "霓虹赛博",
    unlockScore: 500,
    style: "neon",
    head: "#5ce1ff",
    body: "#ff4fd8",
    glow: "rgba(92, 225, 255, 0.55)",
  },
  {
    id: "S003",
    name: "熔岩火焰",
    unlockScore: 800,
    style: "lava",
    head: "#ff6b2c",
    body: "#c42818",
    ember: "#ffd54a",
  },
  {
    id: "S004",
    name: "水晶宝石",
    unlockScore: 1000,
    style: "crystal",
    head: "#7ef0e0",
    body: "#2a9b9b",
    alpha: 0.72,
  },
  {
    id: "S005",
    name: "机械齿轮",
    unlockScore: 1200,
    style: "mech",
    head: "#d0d6de",
    body: "#8a939e",
    gear: "#f0c14a",
  },
  {
    id: "S006",
    name: "幽灵透明",
    unlockScore: 1500,
    style: "ghost",
    head: "#e8eef5",
    body: "#a8b4c4",
    alpha: 0.45,
  },
  {
    id: "S007",
    name: "彩虹糖果",
    unlockScore: 1800,
    style: "rainbow",
    palette: ["#ff5c5c", "#ff9f1c", "#ffef5c", "#5cff8a", "#5cb8ff", "#b06bff", "#ff6bcb"],
  },
  {
    id: "S008",
    name: "帝王皇冠",
    unlockScore: 2200,
    style: "crown",
    head: "#e8c547",
    body: "#8b1e3f",
    jewel: "#ff2d55",
  },
  {
    id: "S009",
    name: "深海章鱼",
    unlockScore: 2600,
    style: "octopus",
    head: "#1a6b5a",
    body: "#0d3d36",
    tentacle: "#2a9b7a",
  },
  {
    id: "S010",
    name: "像素恐龙",
    unlockScore: 3000,
    style: "dino",
    head: "#6bcb3a",
    body: "#3d8a22",
    jaw: "#1a4a10",
  },
  {
    id: "S011",
    name: "黑洞吞噬",
    unlockScore: 3500,
    style: "void",
    head: "#6b2dff",
    body: "#2a1050",
    warp: true,
  },
  {
    id: "S012",
    name: "春节灯笼",
    unlockScore: 4000,
    style: "lantern",
    head: "#ff3b30",
    body: "#c9a227",
    trail: "#ff6b4a",
  },
];

const STORAGE_KEY = "snake-adventure-v2";

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { totalScore: 0, selectedSkin: "S001", unlockedExtra: [] };
    }
    const data = JSON.parse(raw);
    return {
      totalScore: Number(data.totalScore) || 0,
      selectedSkin: data.selectedSkin || "S001",
      unlockedExtra: Array.isArray(data.unlockedExtra) ? data.unlockedExtra : [],
    };
  } catch {
    return { totalScore: 0, selectedSkin: "S001", unlockedExtra: [] };
  }
}

export function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function isSkinUnlocked(skin, progress) {
  if (progress.unlockedExtra.includes(skin.id)) return true;
  return progress.totalScore >= skin.unlockScore;
}

export function getSkinById(id) {
  return SKINS.find((s) => s.id === id) || SKINS[0];
}
