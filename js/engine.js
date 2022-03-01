class Renderer {
  constructor () {
    this.x = 0;
    this.y = 0;
    this.width = 200;
    this.height = 200;
    this.room = {
      name: "Room 1",
      color: "#ffc600"
    }

    this.canvas = document.getElementById('canvas');
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerWidth;

    this.ctx = this.canvas.getContext('2d');

    this.isHost = true;
    this.isRoomChangeInProgress = false;
    this.roomChangeProgressDuration = {
      host: 2000,
      guest: 2000
    }

    this.isDragging = false;
    this.dragginOffset = {x: 0, y: 0};

    this.draw = this.draw.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.toggleHostGuestState = this.toggleHostGuestState.bind(this);
    this.onToggleHostGuestClick = this.onToggleHostGuestClick.bind(this);
    this.toggleRoomChange = this.toggleRoomChange.bind(this);
    this.onToggleRoomChangeClick = this.onToggleRoomChangeClick.bind(this);
    this.addButtonEventListeners = this.addButtonEventListeners.bind(this);
  }

  // Event listeners

  handleMouseDown(evt) {
    if (
      evt.pageX > this.x && evt.clientX < this.x + this.width &&
      evt.pageY > this.y && evt.clientY < this.y + this.height
    ) {
      this.isDragging = true;
      this.dragginOffset = {
        x: evt.clientX - this.x,
        y: evt.clientY - this.y,
      }
    }
  }

  handleMouseUp() {
    this.isDragging = false;
    this.dragginOffset = {x: 0, y: 0};
  }

  handleMouseMove(evt) {
    if (!this.isDragging || !this.isHost) return;

    this.x = evt.clientX - this.dragginOffset.x;
    this.y = evt.clientY - this.dragginOffset.y;
  }

  addEventListeners() {
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mouseup", this.handleMouseUp);
  }

  removeEventListeners() {
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);
  }

  // Handle all the button states
  toggleHostGuestState() {
    const button = document.getElementById("host-guest-toggle");

    if (this.isHost) {
      this.isHost = false;
      this.removeEventListeners();
      button.innerHTML = "Set as host"
    } else {
      this.isHost = true;
      this.addEventListeners();
      button.innerHTML = "Set as guest"
    }
  }

  onToggleHostGuestClick() {
    this.toggleHostGuestState();
  }

  toggleRoomChange() {
    this.isRoomChangeInProgress = true;
    this.removeEventListeners()
    const duration = this.isHost ? this.roomChangeProgressDuration.host : this.roomChangeProgressDuration.guest;

    const roomChangeTimeout = setTimeout(() => {
      if (this.room.name === "Room 1") {
        this.room = {
          name: "Room 2",
          color: "#0000ff"
        }
      } else {
        this.room = {
          name: "Room 1",
          color: "#ffc600"
        }
      }

      if (this.isHost) {
        this.addEventListeners()
      }

      this.isRoomChangeInProgress = false;
      clearTimeout(roomChangeTimeout)
    }, duration);
  }

  onToggleRoomChangeClick() {
    if (this.isRoomChangeInProgress || !this.isHost) return;
    this.toggleRoomChange()
  }

  addButtonEventListeners() {
    const hostGuestButton = document.getElementById("host-guest-toggle");
    hostGuestButton.addEventListener("click", this.onToggleHostGuestClick);

    const roomChangeButton = document.getElementById("room-change-toggle");
    roomChangeButton.addEventListener("click", this.onToggleRoomChangeClick)
  }


  // Rendering
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.beginPath();
    this.ctx.rect(this.x, this.y, this.width, this.height);
    this.ctx.fillStyle = this.isRoomChangeInProgress ? "ff0000" : this.room.color;
    this.ctx.fill();

    this.ctx.font="20px Georgia";
    this.ctx.textAlign="center"; 
    this.ctx.textBaseline = "middle";
    this.ctx.fillStyle = "#000000";

    if (this.isRoomChangeInProgress) {
      this.ctx.fillText("Loading...", this.x + (this.width/2), this.y + (this.height/2))
    } else {
      this.ctx.fillText(this.room.name, this.x + (this.width/2), this.y + (this.height/2))
    }

    requestAnimationFrame(this.draw);
  }

  render() {
    requestAnimationFrame(this.draw)

    if (this.isHost) {
      this.addEventListeners()
    } else {
      this.removeEventListeners()
    }
    this.addButtonEventListeners()
  }
}


(function() {
  const renderer = new Renderer();
  renderer.render()
})()