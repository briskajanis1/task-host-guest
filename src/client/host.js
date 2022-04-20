import {
  fromEvent, map, filter, switchScan, share, takeUntil, EMPTY,
} from "rxjs";
import BaseRenderer from "./base";

export default class HostRenderer extends BaseRenderer {
  constructor({ ws$, panel, ...config }) {
    super(config);
    this.panel = panel;
    this.ws$ = ws$;
  }

  changeRoom = () => {
    if (this.isRoomChangeInProgress) return;

    this.isRoomChangeInProgress = true;
    this.roomChangeButton.disabled = true;
    this.ws$.next({ type: "changeRoom" });
  }

  start() {
    super.start();
    const mouseDown$ = fromEvent(this.canvas, "mousedown");
    const mouseMove$ = fromEvent(this.canvas, "mousemove");
    const mouseUp$ = fromEvent(this.canvas, "mouseup");

    const coords$ = mouseDown$.pipe(
      switchScan(([x, y], mouseDown) => {
        if (!(
          mouseDown.pageX > x && mouseDown.clientX < x + this.width &&
          mouseDown.pageY > y && mouseDown.clientY < y + this.height
        )) return EMPTY;

        const offset = {
          x: mouseDown.clientX - x,
          y: mouseDown.clientY - y,
        }

        return mouseMove$.pipe(
          map((mouseMove) => [
            mouseMove.clientX - offset.x,
            mouseMove.clientY - offset.y,
          ]),
          takeUntil(mouseUp$)
        );
      }, [this.x, this.y]),
      filter(() => !this.isRoomChangeInProgress),
      share()
    );

    this.subscriptions = coords$.subscribe(([x, y]) => {
      this.x = x;
      this.y = y;
      const buffer = new ArrayBuffer(4);
      const dv = new DataView(buffer);
      dv.setInt16(0, x);
      dv.setInt16(2, y);
      this.ws$.next(buffer);
    });

    this.roomChangeButton = document.createElement("button");
    this.roomChangeButton.innerText = "CHANGE ROOM";
    this.panel.appendChild(this.roomChangeButton);
    this.roomChangeButton.addEventListener("click", this.changeRoom);
  }

  stop() {
    this.roomChangeButton.removeEventListener("click", this.changeRoom);
    this.roomChangeButton.remove();
    this.subscriptions.unsubscribe();
    super.stop();
  }
}
