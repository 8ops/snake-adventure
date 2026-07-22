import { LEVELS } from "./levels.js";
import { Game } from "./game.js";

const $ = (sel) => document.querySelector(sel);

const screens = {
  menu: $("#screen-menu"),
  levels: $("#screen-levels"),
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

let modalHandlers = { primary: null, secondary: null };

const ui = {
  showGame() {
    showScreen("game");
  },
  showMenu() {
    game.stop();
    showScreen("menu");
    ui.hideModal();
  },
  showLevels() {
    game.stop();
    showScreen("levels");
    ui.hideModal();
    renderLevelGrid();
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
};

const canvas = $("#game-canvas");
const game = new Game(canvas, ui);

function renderLevelGrid() {
  const grid = $("#level-grid");
  grid.innerHTML = "";
  for (const lv of LEVELS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "level-card";
    btn.innerHTML = `
      <span class="num">${lv.id}</span>
      <span class="name">${lv.name}</span>
      <span class="theme">${lv.theme}</span>
    `;
    btn.addEventListener("click", () => game.startLevel(lv.id));
    grid.appendChild(btn);
  }
}

$("#btn-start").addEventListener("click", () => game.startLevel(1));
$("#btn-levels").addEventListener("click", () => ui.showLevels());
$("#btn-levels-back").addEventListener("click", () => ui.showMenu());
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
showScreen("menu");
