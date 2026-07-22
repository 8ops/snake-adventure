/**
 * 输入缓冲：记录按键时间戳，经 reactionTimeMs 延迟后才生效转向。
 */
import { KEY_TO_DIR, DIR, isOpposite, OPPOSITE } from "./utils.js";
import { GAME_SETTINGS } from "./config.js";

export class InputController {
  constructor() {
    this.queue = [];
    this.maxQueue = 3;
    this.enabled = true;
    this.reverse = false;
    this.reactionTimeMs = GAME_SETTINGS.inputConfig.reactionTimeMs;
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  attach() {
    window.addEventListener("keydown", this._onKeyDown);
  }

  detach() {
    window.removeEventListener("keydown", this._onKeyDown);
  }

  reset() {
    this.queue = [];
    this.reverse = false;
  }

  setReactionTime(ms) {
    this.reactionTimeMs = Math.max(0, ms);
  }

  setReverse(on) {
    this.reverse = on;
  }

  _mapKey(code) {
    let name = KEY_TO_DIR[code];
    if (!name) return null;
    if (this.reverse) name = OPPOSITE[name];
    return DIR[name];
  }

  _onKeyDown(e) {
    if (!this.enabled) return;
    const dir = this._mapKey(e.code);
    if (!dir) return;
    e.preventDefault();
    this.enqueue(dir);
  }

  enqueue(dir) {
    if (this.queue.length >= this.maxQueue) return;
    const last = this.queue[this.queue.length - 1];
    if (last && last.dir.x === dir.x && last.dir.y === dir.y) return;
    this.queue.push({ dir, t: performance.now() });
  }

  /**
   * @param {{x:number,y:number}} currentDir
   * @param {number} [now]
   * @returns {{x:number,y:number}|null}
   */
  consume(currentDir, now = performance.now()) {
    while (this.queue.length > 0) {
      const item = this.queue[0];
      if (now - item.t < this.reactionTimeMs) break;

      this.queue.shift();
      const next = item.dir;
      if (isOpposite(currentDir, next)) continue;
      if (next.x === currentDir.x && next.y === currentDir.y) continue;
      return next;
    }
    return null;
  }
}
