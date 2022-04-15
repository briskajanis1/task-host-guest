import { EMPTY, map, share, switchScan, takeUntil } from "rxjs";

export default class BaseRenderer {
  get x() {
    return this.room.x;
  }

  get y() {
    return this.room.y;
  }

  set x(value) {
    this.room.x = value;
  }

  set y(value) {
    this.room.y = value;
  }

  constructor({ init, canvas }) {
    this.room = init.room;
    this.isRoomChangeInProgress = init.isRoomChangeInProgress;

    this.width = 100;
    this.height = 100;
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
  }

  // Rendering
  draw = () => {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.beginPath();
    this.ctx.rect(this.x, this.y, this.width, this.height);
    this.ctx.fillStyle = this.isRoomChangeInProgress ? "#ff0000" : this.room.color;
    this.ctx.fill();

    this.ctx.font = "20px Georgia";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = "#000000";

    const roomName = this.isRoomChangeInProgress
      ? "Loading..."
      : this.room.name;
    this.ctx.fillText(roomName, this.x + (this.width / 2), this.y + (this.height / 2));

    this.animationFrameId = requestAnimationFrame(this.draw);
  }

  start() {
    this.animationFrameId = requestAnimationFrame(this.draw);
  }

  stop() {
    cancelAnimationFrame(this.animationFrameId);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}