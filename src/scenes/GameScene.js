import { LEVEL_MAP, TILE_SIZE, TIME_LIMIT_MS, TOTAL_KEYS } from "../config.js";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });

    this.gameIsRunning = false;
    this.keysCollected = 0;
    this.doorLocked = true;
    this.nextMonsterPathCalc = 0;
    this.monsterTargetTile = null;
    this.lockedDoorMessage = null;
  }

  preload() {}

  create() {
    this.easystar = new EasyStar.js();
    this.easystar.setGrid(LEVEL_MAP);
    this.easystar.setAcceptableTiles([0]);
    this.easystar.enableDiagonals();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.restartKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.R
    );
    this.pauseKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC
    );

    const { width } = this.scale;
    this.timerText = this.add
      .text(width / 2, 10, "", {
        fontSize: "28px",
        fill: "#fff",
      })
      .setOrigin(0.5, 0);

    this.keysText = this.add.text(12, 10, `מפתחות: 0 / ${TOTAL_KEYS}`, {
      fontSize: "24px",
      fill: "#ffff00",
    });

    this.walls = this.physics.add.staticGroup();
    for (let y = 0; y < LEVEL_MAP.length; y++) {
      for (let x = 0; x < LEVEL_MAP[y].length; x++) {
        if (LEVEL_MAP[y][x] === 1) {
          this.walls
            .create(
              x * TILE_SIZE + TILE_SIZE / 2,
              y * TILE_SIZE + TILE_SIZE / 2,
              "wall"
            )
            .setSize(TILE_SIZE, TILE_SIZE)
            .refreshBody();
        }
      }
    }

    this.player = this.physics.add
      .sprite(400, 300, "player")
      .setDisplaySize(40, 40)
      .setCollideWorldBounds(true);

    this.monster = this.physics.add
      .sprite(80, 80, "monster")
      .setDisplaySize(45, 45)
      .setCollideWorldBounds(true);

    this.monsterSpeed = 125;

    this.door = this.physics.add
      .staticSprite(750, 80, "door")
      .setDisplaySize(50, 70)
      .setTint(0xff0000)
      .refreshBody();

    this.physics.add.collider(this.player, this.door, this.tryExit, null, this);

    this.keys = this.physics.add.staticGroup();
    const keySpots = [
      { x: 100, y: 400 },
      { x: 700, y: 500 },
      { x: 400, y: 100 },
    ];
    keySpots.forEach((p) => {
      const key = this.keys.create(p.x, p.y, "key").setDisplaySize(25, 25).setTint(0xffff00);
      key.setData('isBeingCollected', false);
    });

    this.physics.add.collider(this.monster, this.walls);

    this.physics.add.collider(
      this.player,
      this.monster,
      this.handleGameOver,
      null,
      this
    );

    this.physics.add.overlap(
      this.player,
      this.keys,
      this.collectKey,
      null,
      this
    );

    this.gameEndTime = this.time.now + TIME_LIMIT_MS;
    this.gameIsRunning = true;
  }

  update(time, delta) {
    if (!this.gameIsRunning) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.scene.restart();
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      this.scene.pause();
      return;
    }

    const remaining = this.gameEndTime - time;
    if (remaining > 0) {
      this.timerText.setText(this.formatTime(remaining));
    } else {
      this.winByTime();
    }

    this.handlePlayerMovement();
    this.handleMonsterAI(time);
  }

  handlePlayerMovement() {
    const speed = 250;
    const { left, right, up, down } = this.cursors;
    let vx = 0, vy = 0;

    if (left.isDown) vx = -speed;
    else if (right.isDown) vx = speed;
    if (up.isDown) vy = -speed;
    else if (down.isDown) vy = speed;

    this.player.setVelocity(vx, vy);
  }

  handleMonsterAI(time) {
    const PATH_RECALC_INTERVAL = 75;

    if (time > this.nextMonsterPathCalc) {
      this.nextMonsterPathCalc = time + PATH_RECALC_INTERVAL;
      this.findMonsterPath();
    }

    if (this.monsterTargetTile) {
      const { x, y } = this.monsterTargetTile;
      const targetPx = x * TILE_SIZE + TILE_SIZE / 2;
      const targetPy = y * TILE_SIZE + TILE_SIZE / 2;

      const dx = targetPx - this.monster.x;
      const dy = targetPy - this.monster.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 2) {
        this.monster.setVelocity(0);
      } else {
        const speed = this.monsterSpeed;
        this.monster.setVelocity((dx / dist) * speed, (dy / dist) * speed);
      }
    } else {
      this.monster.setVelocity(0);
    }
  }

  findMonsterPath() {
    const monsterTile = {
      x: Math.floor(this.monster.x / TILE_SIZE),
      y: Math.floor(this.monster.y / TILE_SIZE),
    };
    const playerTile = {
      x: Math.floor(this.player.x / TILE_SIZE),
      y: Math.floor(this.player.y / TILE_SIZE),
    };

    if (monsterTile.x === playerTile.x && monsterTile.y === playerTile.y) {
      this.monsterTargetTile = null;
      return;
    }

    this.easystar.findPath(
      monsterTile.x,
      monsterTile.y,
      playerTile.x,
      playerTile.y,
      (path) => {
        if (path && path.length > 1) {
          this.monsterTargetTile = path[1];
        } else {
          this.monsterTargetTile = null;
        }
      }
    );
    this.easystar.calculate();
  }

  collectKey(player, key) {
    if (key.getData('isBeingCollected')) {
      return;
    }
    
    key.setData('isBeingCollected', true);
    key.disableBody(true, true);
    this.keysCollected++;
    this.keysText.setText(`מפתחות: ${this.keysCollected} / ${TOTAL_KEYS}`);

    if (this.keysCollected >= TOTAL_KEYS) {
      this.unlockDoor();
    }
  }

  unlockDoor() {
    if (this.doorLocked) {
      this.doorLocked = false;
      this.door.setTint(0x00ff00);
    }
  }

  tryExit() {
    if (!this.doorLocked) {
      this.winByEscaping();
    } else {
      this.showLockedDoorMessage();
    }
  }

  showLockedDoorMessage() {
    if (this.lockedDoorMessage && this.lockedDoorMessage.active) {
      return;
    }

    this.lockedDoorMessage = this.add.text(
      this.door.x,
      this.door.y - 50,
      "הדלת נעולה! מצא את כל המפתחות.",
      { fontSize: '16px', fill: '#ff4444', backgroundColor: '#000a' }
    ).setOrigin(0.5);

    this.time.delayedCall(2000, () => {
      this.lockedDoorMessage.destroy();
    });
  }

  winByEscaping() {
    this.endGame("win", "הצלחת! מצאת את כל המפתחות וניצחת.");
  }

  winByTime() {
    this.endGame("win", "הזמן נגמר – הצלחת! 🎉");
  }

  handleGameOver() {
    this.endGame("lose", "הייתה תקרית – המשטרה תפסה אותך! 😢");
  }

  endGame(state, message) {
    if (!this.gameIsRunning) return;
    this.gameIsRunning = false;
    this.physics.pause();

    const tint = state === "win" ? 0x00ff00 : 0xff0000;
    this.player.setTint(tint);

    this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x000000,
      0.7
    );
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, message, {
        fontSize: "32px",
        fill: "#fff",
      })
      .setOrigin(0.5);

    this.time.delayedCall(1200, () => {
      this.add
        .text(
          this.scale.width / 2,
          this.scale.height / 2 + 60,
          "לחץ R כדי לשחק שוב",
          { fontSize: "24px", fill: "#ffff00" }
        )
        .setOrigin(0.5);
    });
  }

  formatTime(milliseconds) {
    if (milliseconds < 0) milliseconds = 0;
    const totalSec = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const centi = Math.floor((milliseconds % 1000) / 10);
    return (
      `${String(minutes).padStart(2, "0")}:` +
      `${String(seconds).padStart(2, "0")}:` +
      `${String(centi).padStart(2, "0")}`
    );
  }
}