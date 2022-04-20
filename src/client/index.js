import { webSocket } from "rxjs/webSocket";
import { catchError, filter, of, scan } from "rxjs";
import HostRenderer from "./host";
import GuestRenderer from "./guest";

const canvas = document.getElementById('canvas');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('visibilitychange', resizeCanvas);
resizeCanvas();

const panel = document.getElementById('panel');

function drawLoading() {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = "20px Georgia";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Loading...", 0, 0);
}
drawLoading();

const ws$ = webSocket({
  url: "ws://localhost:8480/ws",
  binaryType: "arraybuffer",
  serializer: (value) => {
    if (value instanceof ArrayBuffer) {
      return value;
    }
    return JSON.stringify(value);
  },
  deserializer: ({ data }) => {
    if (data instanceof ArrayBuffer) {
      return data;
    }
    return JSON.parse(data);
  }
});
const renderer$ = ws$.pipe(
  catchError(error => of({ type: "role", role: "error", error })),
  filter(msg => msg.type === "role"),
  scan((renderer, msg) => {
    if (renderer) {
      renderer.stop();
    }

    if (msg.role === "error") {
      drawLoading();
      throw msg.error;
    }

    if (msg.role === "host") {
      renderer = new HostRenderer({ init: msg.init, ws$, canvas, panel });
    } else if (msg.role === "guest") {
      renderer = new GuestRenderer({ init: msg.init, ws$, canvas });
    } else {
      renderer = null;
    }

    if (renderer) {
      renderer.start();
    } else {
      drawLoading();
    }

    return renderer;
  }, null)
);

renderer$.subscribe({
  error(e) {
    drawLoading();
    console.error(e);
    if (e.code === 1006) {
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
  }
});
