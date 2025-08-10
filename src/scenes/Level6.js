import { TILE_SIZE, TOTAL_KEYS } from "../config.js";

const LEVEL6_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

export default class Level6 extends Phaser.Scene {
  constructor() {
    super({ key: "Level6" });
    this.gameIsRunning = false;
    this.worldWidth = 0;
    this.worldHeight = 0;

    this.borderWalls = null;
    this.innerWalls = null;

    this.player = null;
    this.summoner = null;
    this.miniMonsters = null;

    this.keys = null;
    this.keysCollected = 0;
    this.doorLocked = true;
    this.door = null;

    this.easystar = null;

    this.externalTimerEl = null;
    this.externalCoinsEl = null;

    this.nextSummonTime = 0;
    this.summonInterval = 5000;
    this.maxMiniCount = 10;
  }

  preload() {}

  create() {
    this.coins = this.registry.get("coins");
    this.level = 6;

    const levelEl = document.getElementById("global-level");
    if (levelEl) levelEl.textContent = String(this.level);

    this.map = LEVEL6_MAP.map(r => r.slice());
    this.worldWidth = this.map[0].length * TILE_SIZE;
    this.worldHeight = this.map.length * TILE_SIZE;

    this.easystar = new EasyStar.js();
    this.easystar.setGrid(this.map);
    this.easystar.setAcceptableTiles([0]);
    this.easystar.enableDiagonals();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    const { width } = this.scale;
    this.infoText = this.add.text(width / 2, 10, "אסוף 3 מפתחות ופתח את הדלת. היזהר מהמזמן!", { fontSize: "24px", fill: "#fff" }).setOrigin(0.5, 0).setScrollFactor(0);
    this.keysText = this.add.text(12, 10, `מפתחות: 0 / ${TOTAL_KEYS}`, { fontSize: "22px", fill: "#ffff00" }).setScrollFactor(0);
    this.coinsText = this.add.text(width - 12, 10, `מטבעות: ${this.coins}`, { fontSize: "22px", fill: "#ffc900" }).setOrigin(1, 0).setScrollFactor(0);

    this.borderWalls = this.physics.add.staticGroup();
    this.innerWalls = this.physics.add.staticGroup();
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        if (this.map[y][x] === 1) {
          const isBorder = y === 0 || y === this.map.length - 1 || x === 0 || x === this.map[y].length - 1;
          const group = isBorder ? this.borderWalls : this.innerWalls;
          group.create(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, "wall").setSize(TILE_SIZE, TILE_SIZE).refreshBody();
        }
      }
    }

    const centerX = this.worldWidth / 2;
    const centerY = this.worldHeight / 2;

    this.player = this.physics.add.sprite(centerX, centerY + 100, "player").setDisplaySize(40, 40).setCollideWorldBounds(true);

    this.summoner = this.physics.add.sprite(centerX, centerY - 60, "summoner").setDisplaySize(56, 56).setCollideWorldBounds(true);
    this.summoner.setImmovable(true);
    this.summoner.setData("speed", 110);
    this.summoner.setData("nextPath", 0);
    this.summoner.setData("targetTile", null);

    this.door = this.physics.add.staticSprite(750, 80, "door").setDisplaySize(50, 70).setTint(0xff0000).refreshBody();

    this.keys = this.physics.add.staticGroup();
    const keySpots = [{ x: 120, y: 420 }, { x: 680, y: 480 }, { x: 420, y: 120 }];
    keySpots.forEach((p) => {
      const key = this.keys.create(p.x, p.y, "key").setDisplaySize(25, 25).setTint(0xffff00);
      key.setData("isBeingCollected", false);
    });

    this.miniMonsters = this.physics.add.group();

    this.physics.add.collider(this.player, this.borderWalls);
    this.physics.add.collider(this.player, this.innerWalls);
    this.physics.add.collider(this.summoner, this.borderWalls);
    this.physics.add.collider(this.summoner, this.innerWalls);
    this.physics.add.collider(this.miniMonsters, this.borderWalls);
    this.physics.add.collider(this.miniMonsters, this.innerWalls);

    this.physics.add.collider(this.player, this.door, this.tryExit, null, this);
    this.physics.add.overlap(this.player, this.keys, this.collectKey, null, this);
    this.physics.add.overlap(this.player, this.miniMonsters, () => this.endGame("lose", "המיני-מפלצת תפסה אותך! 😢"));
    this.physics.add.overlap(this.player, this.summoner, () => this.endGame("lose", "המזמן תפס אותך! 😢"));

    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.centerAndZoomCamera(this.scale.width, this.scale.height);

    this.scale.on("resize", (gameSize) => {
      const w = gameSize.width;
      const h = gameSize.height;
      this.centerAndZoomCamera(w, h);
      this.infoText.setPosition(w / 2, 10);
      this.coinsText.setPosition(w - 12, 10);
    });

    this.gameIsRunning = true;
    this.nextSummonTime = this.time.now + this.summonInterval;

    this.externalTimerEl = document.getElementById("global-timer");
    this.externalCoinsEl = document.getElementById("global-coins");
    if (this.externalCoinsEl) this.externalCoinsEl.textContent = String(this.coins);
    if (this.externalTimerEl) this.externalTimerEl.textContent = "00:00:00";
    this.externalTimerStart = this.time.now;
    this.externalTimerActive = true;
  }

  update() {
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

    if (this.externalTimerActive && this.externalTimerEl) {
      const elapsed = Math.max(0, this.time.now - this.externalTimerStart);
      this.externalTimerEl.textContent = this.formatTime(elapsed);
    }

    this.handlePlayerMovement();

    if (this.time.now > this.nextSummonTime) {
      this.nextSummonTime = this.time.now + this.summonInterval;
      if (this.miniMonsters.countActive(true) < this.maxMiniCount) {
        this.spawnMini();
      }
    }

    const sNextAt = this.summoner.getData("nextPath") || 0;
    if (this.time.now >= sNextAt) {
      this.summoner.setData("nextPath", this.time.now + 120);
      this.findSummonerPath();
    }
    const sTarget = this.summoner.getData("targetTile");
    if (sTarget) {
      const tx = sTarget.x * TILE_SIZE + TILE_SIZE / 2;
      const ty = sTarget.y * TILE_SIZE + TILE_SIZE / 2;
      const dx = tx - this.summoner.x;
      const dy = ty - this.summoner.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 2) this.summoner.setVelocity(0, 0);
      else {
        const speed = this.summoner.getData("speed") || 110;
        this.summoner.setVelocity((dx / dist) * speed, (dy / dist) * speed);
      }
    } else {
      this.summoner.setVelocity(0, 0);
    }

    const minis = this.miniMonsters.getChildren();
    for (let i = 0; i < minis.length; i++) {
      const m = minis[i];
      const nextAt = m.getData("nextPath") || 0;
      if (this.time.now >= nextAt) {
        m.setData("nextPath", this.time.now + 100 + (i % 3) * 20);
        this.findMiniPath(m);
      }
      const target = m.getData("targetTile");
      if (target) {
        const tx = target.x * TILE_SIZE + TILE_SIZE / 2;
        const ty = target.y * TILE_SIZE + TILE_SIZE / 2;
        const dx = tx - m.x;
        const dy = ty - m.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 2) m.setVelocity(0, 0);
        else {
          const speed = m.getData("speed") || 140;
          m.setVelocity((dx / dist) * speed, (dy / dist) * speed);
        }
      } else {
        m.setVelocity(0, 0);
      }
    }
  }

  spawnMini() {
    const x = this.summoner.x;
    const y = this.summoner.y;
    const m = this.miniMonsters.create(x, y, "mini_monster").setDisplaySize(28, 28).setCollideWorldBounds(true);
    m.body.setAllowGravity(false);
    m.setData("speed", 150);
    m.setData("nextPath", 0);
    m.setDepth(1);
  }

  findMiniPath(sprite) {
    const from = this.getTileFromWorld(sprite.x, sprite.y);
    const to = this.getTileFromWorld(this.player.x, this.player.y);
    if (from.x === to.x && from.y === to.y) {
      sprite.setData("targetTile", null);
      return;
    }
    this.easystar.findPath(from.x, from.y, to.x, to.y, (path) => {
      if (path && path.length > 1) sprite.setData("targetTile", path[1]);
      else sprite.setData("targetTile", null);
    });
    this.easystar.calculate();
  }

  findSummonerPath() {
    const from = this.getTileFromWorld(this.summoner.x, this.summoner.y);
    const to = this.getTileFromWorld(this.player.x, this.player.y);
    if (from.x === to.x && from.y === to.y) {
      this.summoner.setData("targetTile", null);
      return;
    }
    this.easystar.findPath(from.x, from.y, to.x, to.y, (path) => {
      if (path && path.length > 1) this.summoner.setData("targetTile", path[1]);
      else this.summoner.setData("targetTile", null);
    });
    this.easystar.calculate();
  }

  centerAndZoomCamera(viewW, viewH) {
    const cam = this.cameras.main;
    const zoom = Math.min(viewW / this.worldWidth, viewH / this.worldHeight);
    cam.setZoom(zoom);
    cam.centerOn(this.worldWidth / 2, this.worldHeight / 2);
  }

  handlePlayerMovement() {
    const speed = 250;
    const { left, right, up, down } = this.cursors;
    let vx = 0;
    let vy = 0;
    if (left.isDown) vx = -speed;
    else if (right.isDown) vx = speed;
    if (up.isDown) vy = -speed;
    else if (down.isDown) vy = speed;
    this.player.setVelocity(vx, vy);
  }

  collectKey(player, key) {
    if (key.getData("isBeingCollected")) return;
    key.setData("isBeingCollected", true);
    key.disableBody(true, true);
    this.keysCollected++;
    this.keysText.setText(`מפתחות: ${this.keysCollected} / ${TOTAL_KEYS}`);
    if (this.keysCollected >= TOTAL_KEYS) this.unlockDoor();
  }

  unlockDoor() {
    if (this.doorLocked) {
      this.doorLocked = false;
      this.door.setTint(0x00ff00);
    }
  }

  tryExit() {
    if (this.keysCollected < TOTAL_KEYS) {
      if (!this.lockedDoorMessage || !this.lockedDoorMessage.active) {
        this.lockedDoorMessage = this.add
          .text(this.door.x, this.door.y - 50, "הדלת נעולה! מצא את כל המפתחות.", { fontSize: "16px", fill: "#ff4444", backgroundColor: "#000a" })
          .setOrigin(0.5);
        this.time.delayedCall(2000, () => { if (this.lockedDoorMessage) this.lockedDoorMessage.destroy(); });
      }
      return;
    }
    this.winByEscaping();
  }

  winByEscaping() {
    if (!this.gameIsRunning) return;
    this.gameIsRunning = false;
    this.physics.pause();
    const reward = 150;
    const newCoins = this.coins + reward;
    this.coins = newCoins;
    this.registry.set("coins", newCoins);
    this.coinsText.setText(`מטבעות: ${newCoins}`);
    const el = document.getElementById("global-coins");
    if (el) el.textContent = String(newCoins);
    this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.7);
    this.add.text(this.scale.width / 2, this.scale.height / 2, "שלב 6 הושלם!", { fontSize: "32px", fill: "#00ff00" }).setOrigin(0.5);
    this.externalTimerActive = false;
  }

  endGame(state, message) {
    if (!this.gameIsRunning) return;
    this.gameIsRunning = false;
    this.physics.pause();
    if (state === "lose") {
      const newCoins = Math.max(0, this.coins - 50);
      this.coins = newCoins;
      this.registry.set("coins", newCoins);
      this.coinsText.setText(`מטבעות: ${newCoins}`);
      const el = document.getElementById("global-coins");
      if (el) el.textContent = String(newCoins);
    }
    this.player.setTint(state === "win" ? 0x00ff00 : 0xff0000);
    this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.7);
    this.add.text(this.scale.width / 2, this.scale.height / 2, message, { fontSize: "32px", fill: "#fff" }).setOrigin(0.5);
    this.time.delayedCall(1200, () => {
      this.add.text(this.scale.width / 2, this.scale.height / 2 + 60, "לחץ R כדי לאתחל את המשחק", { fontSize: "24px", fill: "#ffff00" }).setOrigin(0.5);
    });
  }

  formatTime(milliseconds) {
    if (milliseconds < 0) milliseconds = 0;
    const totalSec = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const centi = Math.floor((milliseconds % 1000) / 10);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(centi).padStart(2, "0")}`;
  }

  getTileFromWorld(wx, wy) {
    return { x: Math.floor(wx / TILE_SIZE), y: Math.floor(wy / TILE_SIZE) };
  }

  isFloorTile(x, y) {
    return y >= 0 && y < this.map.length && x >= 0 && x < this.map[y].length && this.map[y][x] === 0;
  }
}