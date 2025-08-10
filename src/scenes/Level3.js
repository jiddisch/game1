// src/scenes/Level3.js
import { TILE_SIZE, TIME_LIMIT_MS, TOTAL_KEYS } from "../config.js";

const LEVEL3_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

export default class Level3 extends Phaser.Scene {
  constructor() {
    super({ key: "Level3" });
    this.gameIsRunning = false;
    this.keysCollected = 0;
    this.doorLocked = true;
    this.nextMonsterPathCalc = 0;
    this.monsterTargetTile = null;
    this.lockedDoorMessage = null;
    this.wallSprites = [];
    this.worldWidth = 0;
    this.worldHeight = 0;
    this.externalTimerEl = null;
    this.externalTimerStart = 0;
    this.externalTimerActive = false;
    this.externalCoinsEl = null;
    this.ballsGroup = null;
    this.activeBalls = [];
    this.ballInterval = 1100;
    this.nextBallTime = 0;
    this.ballMax = 4;
    this.coinsGroup = null;
    this.coinTiles = null;
    this.coinSpawnInterval = 5000;
    this.nextCoinTime = 0;
    this.coinMax = 5;
    this.playerLives = 3;
    this.invulnUntil = 0;
  }

  create() {
    this.coins = this.registry.get("coins");
    this.playerLives = this.registry.get("lives") ?? 3;
    this.level = 3;

    this.map = LEVEL3_MAP.map(r => r.slice());
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
    this.timerText = this.add.text(width / 2, 10, "", { fontSize: "28px", fill: "#fff" }).setOrigin(0.5, 0).setScrollFactor(0);
    this.keysText = this.add.text(12, 10, `מפתחות: 0 / ${TOTAL_KEYS}`, { fontSize: "24px", fill: "#ffff00" }).setScrollFactor(0);
    this.coinsText = this.add.text(width - 12, 10, `מטבעות: ${this.coins}`, { fontSize: "24px", fill: "#ffc900" }).setOrigin(1, 0).setScrollFactor(0);

    this.borderWalls = this.physics.add.staticGroup();
    this.innerWalls = this.physics.add.staticGroup();
    for (let y = 0; y < this.map.length; y++) {
      this.wallSprites[y] = this.wallSprites[y] || [];
      for (let x = 0; x < this.map[y].length; x++) {
        if (this.map[y][x] === 1) {
          const isBorder = y === 0 || y === this.map.length - 1 || x === 0 || x === this.map[y].length - 1;
          const group = isBorder ? this.borderWalls : this.innerWalls;
          const s = group.create(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, "wall").setSize(TILE_SIZE, TILE_SIZE).refreshBody();
          this.wallSprites[y][x] = s;
        } else {
          this.wallSprites[y][x] = null;
        }
      }
    }

    this.ballsGroup = this.physics.add.group();
    this.activeBalls = [];

    this.player = this.physics.add.sprite(400, 300, "player").setDisplaySize(40, 40).setCollideWorldBounds(true);
    this.monster = this.physics.add.sprite(80, 80, "monster_angry").setDisplaySize(48, 48).setCollideWorldBounds(true);
    this.monsterSpeed = 140;

    this.door = this.physics.add.staticSprite(750, 80, "door").setDisplaySize(50, 70).setTint(0xff0000).refreshBody();

    this.physics.add.collider(this.player, this.borderWalls);
    this.physics.add.collider(this.monster, this.borderWalls);
    this.physics.add.collider(this.monster, this.innerWalls);
    this.physics.add.collider(this.ballsGroup, this.borderWalls);
    this.physics.add.collider(this.ballsGroup, this.innerWalls);
    this.physics.add.collider(this.ballsGroup, this.monster);
    this.physics.add.collider(this.ballsGroup, this.ballsGroup);
    this.physics.add.collider(this.player, this.door, this.tryExit, null, this);

    this.keys = this.physics.add.staticGroup();
    const keySpots = [{ x: 100, y: 400 }, { x: 700, y: 500 }, { x: 400, y: 100 }];
    keySpots.forEach((p) => {
      const key = this.keys.create(p.x, p.y, "key").setDisplaySize(25, 25).setTint(0xffff00);
      key.setData("isBeingCollected", false);
    });

    this.physics.add.overlap(this.player, this.ballsGroup, this.handleBallDeath, null, this);
    this.physics.add.collider(this.player, this.monster, this.handleGameOver, null, this);
    this.physics.add.overlap(this.player, this.keys, this.collectKey, null, this);

    this.coinsGroup = this.physics.add.staticGroup();
    this.coinTiles = new Set();
    this.physics.add.overlap(this.player, this.coinsGroup, this.collectCoin, null, this);

    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.centerAndZoomCamera(this.scale.width, this.scale.height);

    this.scale.on("resize", (gameSize) => {
      const w = gameSize.width;
      const h = gameSize.height;
      this.centerAndZoomCamera(w, h);
      this.timerText.setPosition(w / 2, 10);
      this.coinsText.setPosition(w - 12, 10);
    });

    this.gameEndTime = this.time.now + TIME_LIMIT_MS;
    this.gameIsRunning = true;

    this.externalTimerEl = document.getElementById("global-timer");
    this.externalCoinsEl = document.getElementById("global-coins");
    this.externalHeartsEl = document.getElementById("global-hearts");
    this.renderHeartsDOM(this.playerLives);
    if (this.externalTimerEl) this.externalTimerEl.textContent = "00:00:00";
    if (this.externalCoinsEl) this.externalCoinsEl.textContent = String(this.coins);
    this.externalTimerStart = this.time.now;
    this.externalTimerActive = true;
    this.nextBallTime = this.time.now + this.ballInterval;
    this.nextCoinTime = this.time.now + this.coinSpawnInterval;
  }

  update(time, delta) {
    if (!this.gameIsRunning) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.registry.set("lives", 3);
        this.scene.start("Level1");
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) this.scene.pause();
    const remaining = this.gameEndTime - time;
    if (remaining > 0) this.timerText.setText(this.formatTime(remaining));
    else this.winByTime();

    if (this.externalTimerActive && this.externalTimerEl) {
      const elapsed = Math.max(0, time - this.externalTimerStart);
      this.externalTimerEl.textContent = this.formatTime(elapsed);
    }

    this.handlePlayerMovement();
    this.handleMonsterAI(time);

    if (time > this.nextBallTime) {
      this.nextBallTime = time + this.ballInterval;
      this.spawnRollingBall();
    }

    if (time > this.nextCoinTime) {
      this.nextCoinTime = time + this.coinSpawnInterval;
      if (this.coinsGroup.countActive(true) < this.coinMax) this.spawnCoin();
    }

    const dt = (delta || this.game.loop.delta) / 1000;
    for (let i = 0; i < this.activeBalls.length; i++) {
      const b = this.activeBalls[i];
      if (!b || !b.active || !b.body) continue;
      const speed = b.body.velocity.length();
      const radiusPx = 20;
      const angPerSecDeg = (speed / radiusPx) * Phaser.Math.RAD_TO_DEG;
      const sign = b.body.velocity.x >= 0 ? 1 : -1;
      b.setAngularVelocity(sign * angPerSecDeg);
    }
  }
  
  renderHeartsDOM(lives) {
    if (!this.externalHeartsEl) return;
    let html = "";
    for (let i = 0; i < 3; i++) {
      const src = i < lives ? "src/assets/heart.svg" : "src/assets/heart-empty.svg";
      html += `<img src="${src}" alt="heart">`;
    }
    this.externalHeartsEl.innerHTML = html;
  }

  handlePlayerHit(message) {
    if (this.time.now < this.invulnUntil) return;

    this.playerLives--;
    this.registry.set("lives", this.playerLives);
    this.renderHeartsDOM(this.playerLives);

    if (this.playerLives > 0) {
      this.invulnUntil = this.time.now + 1500;
      this.tweens.add({ targets: this.player, alpha: 0.3, yoyo: true, repeat: 5, duration: 100 });
    } else {
      this.endGame("lose", message);
    }
  }

  handleBallDeath() { this.handlePlayerHit("נגעת בכדור! 😢"); }
  handleGameOver() { this.handlePlayerHit("המפלצת תפסה אותך! 😢"); }
  
  endGame(state, message) {
    if (!this.gameIsRunning) return;
    this.gameIsRunning = false;
    this.physics.pause();

    let finalLoss = false;
    if (state === 'lose') {
      const newCoins = Math.max(0, this.coins - 50);
      this.coins = newCoins;
      this.registry.set("coins", newCoins);
      this.coinsText.setText(`מטבעות: ${newCoins}`);
      const el = document.getElementById("global-coins");
      if (el) el.textContent = String(newCoins);
      if (newCoins === 0) finalLoss = true;
    }

    if (state === "win" && !finalLoss) {
      this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.7);
      this.add.text(this.scale.width / 2, this.scale.height / 2, message, { fontSize: "32px", fill: "#fff" }).setOrigin(0.5);
      return;
    }

    if (finalLoss) {
      this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.7);
      this.add.text(this.scale.width / 2, this.scale.height / 2 - 10, "המשחק נגמר – הפסדת!", { fontSize: "36px", fill: "#ff4444" }).setOrigin(0.5);
      this.add.text(this.scale.width / 2, this.scale.height / 2 + 34, "אזלו לך המטבעות", { fontSize: "24px", fill: "#ffffff" }).setOrigin(0.5);
      this.externalTimerActive = false;
    }
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
      if (dist < 2) this.monster.setVelocity(0);
      else {
        const speed = this.monsterSpeed;
        this.monster.setVelocity((dx / dist) * speed, (dy / dist) * speed);
      }
    } else {
      this.monster.setVelocity(0);
    }
  }

  findMonsterPath() {
    const monsterTile = this.getTileFromWorld(this.monster.x, this.monster.y);
    const playerTile = this.getTileFromWorld(this.player.x, this.player.y);
    if (monsterTile.x === playerTile.x && monsterTile.y === playerTile.y) {
      this.monsterTargetTile = null;
      return;
    }
    this.easystar.findPath(monsterTile.x, monsterTile.y, playerTile.x, playerTile.y, (path) => {
      if (path && path.length > 1) this.monsterTargetTile = path[1];
      else this.monsterTargetTile = null;
    });
    this.easystar.calculate();
  }

  spawnRollingBall() {
    const px = this.player.x;
    const py = this.player.y;
    const mx = this.monster.x;
    const my = this.monster.y;
    let dx = px - mx;
    let dy = py - my;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    const jitter = 0.25;
    dx += Phaser.Math.FloatBetween(-jitter, jitter);
    dy += Phaser.Math.FloatBetween(-jitter, jitter);
    const nlen = Math.hypot(dx, dy) || 1;
    dx /= nlen;
    dy /= nlen;

    const spawnX = mx + dx * 24;
    const spawnY = my + dy * 24;

    const ball = this.physics.add.sprite(spawnX, spawnY, "ball_spiky").setDisplaySize(40, 40);
    ball.setCollideWorldBounds(true);
    ball.setBounce(0.85);
    ball.setDamping(true);
    ball.setDrag(40, 40);
    ball.body.setCircle(18, 2, 2);
    ball.setVelocity(dx * 320, dy * 320);

    this.ballsGroup.add(ball);
    this.activeBalls.push(ball);
    if (this.activeBalls.length > this.ballMax) {
      const old = this.activeBalls.shift();
      if (old && old.active) old.destroy();
    }

    this.time.delayedCall(800, () => {
      if (ball && ball.active) ball.setDrag(120, 120);
    });
    this.time.delayedCall(3200, () => {
      if (ball && ball.active) ball.destroy();
    });
  }

  spawnCoin() {
    const doorTile = this.getTileFromWorld(this.door.x, this.door.y);
    let placed = false;
    for (let i = 0; i < 40 && !placed; i++) {
      const x = Phaser.Math.Between(1, this.map[0].length - 2);
      const y = Phaser.Math.Between(1, this.map.length - 2);
      if (!this.isFloorTile(x, y)) continue;
      if (doorTile.x === x && doorTile.y === y) continue;
      let blockedByKey = false;
      this.keys.getChildren().forEach((k) => {
        const kt = this.getTileFromWorld(k.x, k.y);
        if (kt.x === x && kt.y === y && k.active) blockedByKey = true;
      });
      if (blockedByKey) continue;
      const tkey = `${x},${y}`;
      if (this.coinTiles.has(tkey)) continue;
      const sprite = this.coinsGroup.create(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, "coin").setSize(TILE_SIZE, TILE_SIZE).refreshBody();
      this.coinTiles.add(tkey);
      placed = true;
    }
  }

  getTileFromWorld(wx, wy) { return { x: Math.floor(wx / TILE_SIZE), y: Math.floor(wy / TILE_SIZE) }; }

  collectKey(player, key) {
    if (key.getData("isBeingCollected")) return;
    key.setData("isBeingCollected", true);
    key.disableBody(true, true);
    this.keysCollected++;
    this.keysText.setText(`מפתחות: ${this.keysCollected} / ${TOTAL_KEYS}`);
    if (this.keysCollected >= TOTAL_KEYS) this.unlockDoor();
  }

  collectCoin(player, coin) {
    const tx = Math.floor(coin.x / TILE_SIZE);
    const ty = Math.floor(coin.y / TILE_SIZE);
    const tkey = `${tx},${ty}`;
    coin.disableBody(true, true);
    if (this.coinTiles.has(tkey)) this.coinTiles.delete(tkey);
    const newCoins = this.coins + 10;
    this.coins = newCoins;
    this.registry.set("coins", newCoins);
    this.coinsText.setText(`מטבעות: ${newCoins}`);
    const el = document.getElementById("global-coins");
    if (el) el.textContent = String(newCoins);
  }

  unlockDoor() {
    if (this.doorLocked) {
      this.doorLocked = false;
      this.door.setTint(0x00ff00);
    }
  }

  tryExit() {
    if (this.keysCollected < TOTAL_KEYS) {
      this.showLockedDoorMessage();
      return;
    }
    this.winByEscaping();
  }

  showLockedDoorMessage() {
    if (this.lockedDoorMessage && this.lockedDoorMessage.active) return;
    this.lockedDoorMessage = this.add
      .text(this.door.x, this.door.y - 50, "הדלת נעולה! מצא את כל המפתחות.", { fontSize: "16px", fill: "#ff4444", backgroundColor: "#000a" })
      .setOrigin(0.5);
    this.time.delayedCall(2000, () => { this.lockedDoorMessage.destroy(); });
  }

  winByEscaping() {
    if (!this.gameIsRunning) return;
    this.gameIsRunning = false;
    this.physics.pause();
    const added = 70;
    const newCoins = this.coins + added;
    this.coins = newCoins;
    this.registry.set("coins", newCoins);
    this.coinsText.setText(`מטבעות: ${newCoins}`);
    const el = document.getElementById("global-coins");
    if (el) el.textContent = String(newCoins);

    this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.7);
    this.add.text(this.scale.width / 2, this.scale.height / 2 - 10, "שלב 3 הושלם!", { fontSize: "40px", fill: "#00ff00" }).setOrigin(0.5);
    this.add.text(this.scale.width / 2, this.scale.height / 2 + 34, "עוברים לשלב 4...", { fontSize: "26px", fill: "#ffffff" }).setOrigin(0.5);
    this.externalTimerActive = false;
    this.time.delayedCall(1000, () => { this.scene.start("Level4"); });
  }

  winByTime() {
    if (!this.gameIsRunning) return;
    this.gameIsRunning = false;
    this.physics.pause();
    this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.7);
    this.add.text(this.scale.width / 2, this.scale.height / 2 - 10, "הזמן נגמר – הצלחת!", { fontSize: "36px", fill: "#00ff00" }).setOrigin(0.5);
    this.add.text(this.scale.width / 2, this.scale.height / 2 + 34, "עוברים לשלב 4...", { fontSize: "24px", fill: "#ffffff" }).setOrigin(0.5);
    this.externalTimerActive = false;
    this.time.delayedCall(1000, () => { this.scene.start("Level4"); });
  }

  formatTime(milliseconds) {
    if (milliseconds < 0) milliseconds = 0;
    const totalSec = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const centi = Math.floor((milliseconds % 1000) / 10);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(centi).padStart(2, "0")}`;
  }

  inBounds(x, y) { return y >= 0 && y < this.map.length && x >= 0 && x < this.map[y].length; }
  isFloorTile(x, y) { return this.inBounds(x, y) && this.map[y][x] === 0; }
}