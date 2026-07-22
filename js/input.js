/**
 * 输入队列：缓冲转向，避免帧率导致的鬼影操作与 180° 掉头。
 * 每次蛇移动一步消费最多一个有效转向。
 */
import { KEY_TO_DIR, DIR, isOpposite, OPPOSITE } from "./utils.js";

export class InputController {
  constructor() {
    this.queue = [];
    this.maxQueue = 2;
    this.enabled = true;
    this.reverse = false;
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
    // 不重复入队同一方向
    if (last && last.x === dir.x && last.y === dir.y) return;
    this.queue.push(dir);
  }

  /**
   * @param {{x:number,y:number}} currentDir 当前蛇方向
   * @returns {{x:number,y:number}|null} 下一步应采用的方向
   */
  consume(currentDir) {
    while (this.queue.length > 0) {
      const next = this.queue.shift();
      if (isOpposite(currentDir, next)) continue; // 禁止瞬间掉头
      if (next.x === currentDir.x && next.y === currentDir.y) continue;
      return next;
    }
    return null;
  }
}
