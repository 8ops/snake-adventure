import { LEVELS } from "./levels.js";
import { Game } from "./game.js";
import { SKINS, isSkinUnlocked, loadProgress } from "./config.js";

const $ = (sel) => document.querySelector(sel);

const screens = {
  menu: $("#screen-menu"),
  levels: $("#screen-levels"),
  skins: $("#screen-skins"),
  game: $("#screen-game"),
};

function showScreen(name) {
  Object.entries(screens).forEach(([k, el]) => {
    el.classList.toggle("active", k === name);
  });
}

const hud = {
  level: $("#hud-level"),
  score: $("#hud-score"),
  beans: $("#hud-beans"),
  lives: $("#hud-lives"),
  extra: $("#hud-extra"),
  extraLabel: $("#hud-extra-label"),
  extraValue: $("#hud-extra-value"),
};

const overlayPause = $("#overlay-pause");
const overlayReverse = $("#overlay-reverse");
const modal = $("#modal");
const modalCard = modal.querySelector(".modal-card");
const modalTitle = $("#modal-title");
const modalScore = $("#modal-score");
const modalReason = $("#modal-reason");
const btnPrimary = $("#btn-modal-primary");
const btnSecondary = $("#btn-modal-secondary");
const menuScore = $("#menu-score");

let modalHandlers = { primary: null, secondary: null };
let returnFromSkins = "menu";

const ui = {
  showGame() {
    showScreen("game");
  },
  showMenu() {
    game.stop();
    showScreen("menu");
    ui.hideModal();
    refreshMenuScore();
  },
  showLevels() {
    game.stop();
    showScreen("levels");
    ui.hideModal();
    renderLevelGrid();
  },
  showSkins(from = "menu") {
    returnFromSkins = from;
    showScreen("skins");
    ui.hideModal();
    renderSkinGrid();
  },
  setPause(on) {
    overlayPause.classList.toggle("hidden", !on);
  },
  setReverse(on) {
    overlayReverse.classList.toggle("hidden", !on);
  },
  updateHud(data) {
    hud.level.textContent = `${data.level} · ${data.name}`;
    hud.score.textContent = String(data.score);
    hud.beans.textContent = String(data.beans);
    hud.lives.textContent = data.hasLives ? String(data.lives) : "—";

    if (data.hasTimer) {
      hud.extra.classList.remove("hidden");
      hud.extraLabel.textContent = "时间";
      const t = Math.ceil(data.timeLeft);
      hud.extraValue.textContent = String(t);
      hud.extra.classList.toggle("danger", t <= 10);
    } else if (data.reverse) {
      hud.extra.classList.remove("hidden");
      hud.extraLabel.textContent = "控制";
      hud.extraValue.textContent = "反向";
      hud.extra.classList.add("danger");
    } else {
      hud.extra.classList.add("hidden");
      hud.extra.classList.remove("danger");
    }

    overlayReverse.classList.toggle("hidden", !data.reverse);
  },
  showModal({ win, title, score, reason, primaryLabel, secondaryLabel, onPrimary, onSecondary }) {
    modal.classList.remove("hidden");
    modalCard.classList.toggle("fail", !win);
    modalTitle.textContent = title;
    modalScore.textContent = `得分：${score}`;
    modalReason.textContent = reason || "";
    btnPrimary.textContent = primaryLabel || "确定";
    btnSecondary.textContent = secondaryLabel || "重试";
    modalHandlers.primary = onPrimary;
    modalHandlers.secondary = onSecondary;
  },
  hideModal() {
    modal.classList.add("hidden");
    modalHandlers = { primary: null, secondary: null };
  },
  onProgress() {
    refreshMenuScore();
  },
};

const canvas = $("#game-canvas");
const game = new Game(canvas, ui);

function refreshMenuScore() {
  const p = loadProgress();
  menuScore.textContent = `累计得分：${p.totalScore} · 当前皮肤：${game.getSkin().name}`;
}

function renderLevelGrid() {
  const grid = $("#level-grid");
  grid.innerHTML = "";
  for (const lv of LEVELS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "level-card";
    const wild =
      lv.wildlife?.length
        ? lv.wildlife.map((w) => `${w.count}×${typeLabel(w.type)}`).join(" · ")
        : "无野生蛇";
    btn.innerHTML = `
      <span class="num">${lv.id}</span>
      <span class="name">${lv.name}</span>
      <span class="theme">${lv.theme}</span>
      <span class="theme wild-tag">${wild}</span>
    `;
    btn.addEventListener("click", () => game.startLevel(lv.id));
    grid.appendChild(btn);
  }
}

function typeLabel(t) {
  if (t === "forager") return "绿";
  if (t === "wanderer") return "灰";
  if (t === "attacker") return "红";
  return t;
}

function renderSkinGrid() {
  const grid = $("#skin-grid");
  grid.innerHTML = "";
  const progress = loadProgress();
  game.progress = progress;

  for (const skin of SKINS) {
    const unlocked = isSkinUnlocked(skin, progress);
    const selected = game.skinId === skin.id;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `skin-card${selected ? " selected" : ""}${unlocked ? "" : " locked"}`;
    btn.disabled = !unlocked;
    const swatch = skin.head || skin.palette?.[0] || "#5dff8a";
    const swatch2 = skin.body || skin.palette?.[3] || swatch;
    btn.innerHTML = `
      <span class="swatch" style="background:linear-gradient(135deg,${swatch},${swatch2})"></span>
      <span class="name">${skin.name}</span>
      <span class="req">${unlocked ? (selected ? "使用中" : "已解锁") : `需 ${skin.unlockScore} 分`}</span>
    `;
    if (unlocked) {
      btn.addEventListener("click", () => {
        game.setSkin(skin.id);
        renderSkinGrid();
        refreshMenuScore();
        if (returnFromSkins === "pause" && game.map) {
          game.renderer.draw(game._drawState());
        }
      });
    }
    grid.appendChild(btn);
  }
}

$("#btn-start").addEventListener("click", () => game.startLevel(1));
$("#btn-levels").addEventListener("click", () => ui.showLevels());
$("#btn-levels-back").addEventListener("click", () => ui.showMenu());
$("#btn-skins").addEventListener("click", () => ui.showSkins("menu"));
$("#btn-skins-back").addEventListener("click", () => {
  if (returnFromSkins === "pause") {
    showScreen("game");
    game.renderer.draw(game._drawState());
  } else {
    ui.showMenu();
  }
});
$("#btn-pause-skins").addEventListener("click", (e) => {
  e.stopPropagation();
  ui.showSkins("pause");
});
$("#btn-menu").addEventListener("click", () => ui.showMenu());

btnPrimary.addEventListener("click", () => {
  const fn = modalHandlers.primary;
  ui.hideModal();
  if (fn) fn();
});
btnSecondary.addEventListener("click", () => {
  const fn = modalHandlers.secondary;
  ui.hideModal();
  if (fn) fn();
});

renderLevelGrid();
refreshMenuScore();
showScreen("menu");
