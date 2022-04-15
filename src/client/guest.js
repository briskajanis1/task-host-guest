import { concatMap, filter, delay, from, of } from "rxjs";
import BaseRenderer from "./base";

export default class GuestRenderer extends BaseRenderer {
  constructor({ ws$, ...config }) {
    super(config);
    this.ws$ = ws$;
  }

  start() {
    super.start();

    this.replayInProgress = false;

    this.subscriptions = this.ws$.pipe(
      filter(message => message instanceof ArrayBuffer),
    ).subscribe((data) => {
      if (this.isRoomChangeInProgress || this.replayInProgress) {
        return;
      }
      const dv = new DataView(data);
      this.x = dv.getInt16(0);
      this.y = dv.getInt16(2);
    });

    this.subscriptions.add(this.ws$.pipe(
      filter(message => message.type === "changeRoom")
    ).subscribe(() => {
      this.isRoomChangeInProgress = true;
    }));

    const replayBuffer$ = this.ws$.pipe(
      filter(message => ["replayBuffer", "endReplay"].includes(message.type)),
      concatMap((m) => {
        if (m.type === "replayBuffer") {
          return from([{ type: "room", room: m.room }].concat(m.replayBuffer))
        } else {
          return of(m);
        }
      }),
      concatMap((a) => {
        if (Array.isArray(a)) {
          return of([a[1], a[2]]).pipe(delay(a[0]))
        } else {
          return of(a);
        }
      })
    );
    this.subscriptions.add(replayBuffer$.subscribe(msg => {
      if (Array.isArray(msg)) {
        const [x, y] = msg;
        this.x = x;
        this.y = y;
      } else if (msg.type === "room") {
        this.room = msg.room;
        this.isRoomChangeInProgress = false;
        this.replayInProgress = true;
      } else if (msg.type === "endReplay") {
        this.replayInProgress = false;
      }
    }
    ));
  }

  stop() {
    this.subscriptions.unsubscribe();
    super.stop();
  }
}