const HOST_ROOM_CHANGE_DELAY = 2000;
const GUEST_ROOM_CHANGE_DELAY_AFTER_HOST_ROOM_CHANGE = 2000;

import express from "express";
import expressWs from "express-ws";
import { timer, Subject, concatWith, map, timeInterval, buffer, interval } from "rxjs";

const app = express();
const port = 8480;

expressWs(app);
app.use(express.static(`${__dirname}/client`));

let hostClient = null;
const guestClients = [];

const state = {
  rooms: [
    {
      name: "Room 1",
      color: "#ffc600",
      x: 0,
      y: 0
    },
    {
      name: "Room 2",
      color: "#0000ff",
      x: 0,
      y: 0
    }
  ],
  selectedRoom: 0,
  guestIsChangingRoom: false,
  hostIsChangingRoom: false,
  get room() {
    return state.rooms[state.selectedRoom];
  }
};

const replayBuffer$ = new Subject();

function changeRoom() {
  if (state.guestIsChangingRoom || state.hostIsChangingRoom) {
    return;
  }

  state.guestIsChangingRoom = true;
  state.hostIsChangingRoom = true;

  const nextRoomIndex = (state.selectedRoom + 1) % state.rooms.length;
  const nextRoomCoords = { x: state.rooms[nextRoomIndex].x, y: state.rooms[nextRoomIndex].y };

  timer(HOST_ROOM_CHANGE_DELAY).subscribe(() => {
    state.hostIsChangingRoom = false;
    if (hostClient) {
      hostClient.send(JSON.stringify({
        type: "role",
        role: "host",
        init: {
          room: state.rooms[nextRoomIndex],
          isRoomChangeInProgress: false
        }
      }))
    }

    const sub = replayBuffer$.asObservable().pipe(
      timeInterval(),
      map(({ value: [x, y], interval }) => [Math.floor(interval / 2), x, y]),
      buffer(
        timer(GUEST_ROOM_CHANGE_DELAY_AFTER_HOST_ROOM_CHANGE).pipe(
          concatWith(interval(100))
        )
      ),
    ).subscribe((replayBuffer) => {
      const msg = { type: "replayBuffer", replayBuffer, room: { ...state.rooms[nextRoomIndex], ...nextRoomCoords } }
      console.log(replayBuffer);
      guestClients.forEach(client => {
        client.send(JSON.stringify(msg));
      });

      if (replayBuffer.length > 0) {
        const [_, x, y] = replayBuffer[replayBuffer.length - 1];
        nextRoomCoords.x = x;
        nextRoomCoords.y = y;
      } else {
        state.selectedRoom = nextRoomIndex;
        state.room.x = nextRoomCoords.x;
        state.room.y = nextRoomCoords.y;
        state.guestIsChangingRoom = false;

        const msg = { type: "endReplay" }
        guestClients.forEach(client => {
          client.send(JSON.stringify(msg));
        });
        sub.unsubscribe();
      }
    });
  })
}

app.ws('/ws', function (ws, req) {
  if (!hostClient) {
    hostClient = ws;
    ws.send(JSON.stringify({
      type: "role",
      role: "host",
      init: {
        room: state.room,
        isRoomChangeInProgress: state.hostIsChangingRoom
      }
    }));
    console.log("hostClient connected");
  } else {
    guestClients.push(ws);
    ws.send(JSON.stringify({
      type: "role",
      role: "guest",
      init: {
        room: state.room,
        isRoomChangeInProgress: state.guestIsChangingRoom
      }
    }));
    console.log("guestClient connected");
  }

  ws.on('close', function (...args) {
    if (ws === hostClient) {
      hostClient = null;
      console.log("hostClient connection closed", ...args);
      if (guestClients.length > 0) {
        hostClient = guestClients.shift();
        hostClient.send(JSON.stringify({
          type: "role",
          role: "host",
          init: {
            room: state.room,
            isRoomChangeInProgress: state.hostIsChangingRoom
          }
        }));
        console.log("guestClient upgraded to hostClient");
      }
    }

    const guestClientIndex = guestClients.indexOf(ws);
    if (guestClientIndex > -1) {
      guestClients.splice(guestClientIndex, 1);
      console.log("guestClient connection closed", ...args);
    }
  })

  ws.on('message', function (msg) {
    console.log("Received message", msg);

    if (ws === hostClient) {

      if (msg instanceof Buffer) {
        const dv = new DataView(msg.buffer, msg.byteOffset, msg.byteLength);
        const x = dv.getInt16(0);
        const y = dv.getInt16(2);

        if (state.hostIsChangingRoom) {
          return;
        } else if (state.guestIsChangingRoom) {
          replayBuffer$.next([x, y]);
          return;
        }

        state.room.x = x;
        state.room.y = y;
        guestClients.forEach(gWs => {
          gWs.send(msg);
        });
        return;
      }

      const message = JSON.parse(msg);
      if (message.type === "changeRoom") {
        if (state.guestIsChangingRoom || state.hostIsChangingRoom) {
          return;
        }

        guestClients.forEach(gWs => {
          gWs.send(msg);
        });

        changeRoom();
      }

    }
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
})