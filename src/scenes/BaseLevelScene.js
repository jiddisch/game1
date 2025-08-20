import { TILE_SIZE, TOTAL_KEYS } from "../config.js";

export default class BaseLevelScene extends Phaser.Scene {
  constructor(key, levelConfig) {
    super({ key });
    this.levelConfig = levelConfig;
    this.map = null;
    this.worldWidth = 0;
    this.worldHeight = 0;
    this.gameIsRunning = false;
    this.coins = 0;
    this.playerLives = 3;
    this.keysCollected = 0;
    this.doorLocked = true;
    this.invulnUntil = 0;
    this.player = null;
    this.door = null;
    this.keys = null;
    this.borderWalls = null;
    this.innerWalls = null;
    this.cursors = null;
    this.restartKey = null;
    this.pauseKey = null;
    this.externalTimerStart = 0;
    this.medicines = null;
    this.nextMedicineSpawnAt = 0;
    this.lockedDoorMessage = null;
    this.groundLayer = null;
  }

  create() {
    this.coins = this.registry.get("coins") ?? 0;
    this.playerLives = this.registry.get("lives") ?? 3;

    this.map = this.levelConfig.map.map((r) => r.slice());
    this.worldWidth = this.map[0].length * TILE_SIZE;
    this.worldHeight = this.map.length * TILE_SIZE;

    this.initInput();
    this.setupHUDListeners();
    this.initHUD();
    this.createMap();
    this.createPlayer();
    this.createDoor();
    this.createKeys();
    this.createMedicines();
    this.setupColliders();
    this.setupCamera();

    this.createLevel();

    this.scheduleNextMedicineSpawn();

    this.gameIsRunning = true;
  }

  update(time, delta) {
    if (!this.gameIsRunning) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.registry.set("lives", 3);
        this.scene.start("Level1");
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      this.scene.pause();
    }

    this.handlePlayerMovement();
    this.updateHUD(time);
    this.updateLevel(time, delta);
    this.updateMedicine(time);
  }

  initInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  }

  setupHUDListeners() {
    this.events.on("update-hud", (data) => {
      this.updateGlobalHUD(data);
    });
  }

  initHUD() {
    this.events.emit("update-hud", {
      coins: this.coins,
      level: this.levelConfig.level,
      lives: this.playerLives,
      keys: `${this.keysCollected} / ${TOTAL_KEYS}`,
    });
    this.updateGlobalHUD({
      coins: this.coins,
      level: this.levelConfig.level,
      lives: this.playerLives
    });
    this.externalTimerStart = this.time.now;
  }

  createMap() {
    this.groundLayer = this.add.layer();
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        const img = this.add.image(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, "ground").setDisplaySize(TILE_SIZE, TILE_SIZE);
        img.setDepth(-10);
        this.groundLayer.add(img);
      }
    }

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
  }

  createPlayer() {
    this.player = this.physics.add.sprite(400, 300, "player").setDisplaySize(40, 40).setCollideWorldBounds(true);
  }

  createDoor() {
    this.door = this.physics.add.staticSprite(750, 80, "door").setDisplaySize(50, 70).setTint(0xff0000).refreshBody();
  }

  createKeys() {
    this.keys = this.physics.add.staticGroup();
    const keySpots = [{ x: 100, y: 400 }, { x: 700, y: 500 }, { x: 400, y: 100 }];
    keySpots.forEach((p) => {
      const key = this.keys.create(p.x, p.y, "key").setDisplaySize(25, 25).setTint(0xffff00);
      key.setData("isBeingCollected", false);
    });
  }

  createMedicines() {
    this.medicines = this.physics.add.staticGroup();
  }

  setupColliders() {
    this.physics.add.collider(this.player, this.borderWalls);
    this.physics.add.collider(this.player, this.door, this.tryExit, null, this);
    this.physics.add.overlap(this.player, this.keys, this.collectKey, null, this);
    this.physics.add.overlap(this.player, this.medicines, this.tryCollectMedicine, null, this);
  }

  setupCamera() {
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.centerAndZoomCamera(this.scale.width, this.scale.height);
    this.scale.on("resize", (gameSize) => {
      this.centerAndZoomCamera(gameSize.width, gameSize.height);
    });
  }

  createLevel() {}

  updateLevel(time, delta) {}

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

  handlePlayerHit(message) {
    if (this.time.now < this.invulnUntil) return;

    this.playerLives--;
    this.registry.set("lives", this.playerLives);
    this.events.emit("update-hud", { lives: this.playerLives });

    if (this.playerLives > 0) {
      this.invulnUntil = this.time.now + 1500;
      this.tweens.add({ targets: this.player, alpha: 0.3, yoyo: true, repeat: 5, duration: 100 });
    } else {
      this.endGame("lose", message);
    }
  }

  collectKey(player, key) {
    if (key.getData("isBeingCollected")) return;
    key.setData("isBeingCollected", true);
    key.disableBody(true, true);
    this.keysCollected++;
    this.events.emit("update-hud", { keys: `${this.keysCollected} / ${TOTAL_KEYS}` });
    if (this.keysCollected >= TOTAL_KEYS) this.unlockDoor();
  }

  tryCollectMedicine(player, med) {
    if (this.playerLives >= 3) return;
    med.disableBody(true, true);
    this.playerLives++;
    this.registry.set("lives", this.playerLives);
    this.events.emit("update-hud", { lives: this.playerLives });
    this.tweens.add({ targets: this.player, scale: 1.12, duration: 120, yoyo: true, onComplete: () => { this.player.setScale(1) } });
    this.scheduleNextMedicineSpawn();
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

  winByEscaping() {
    if (!this.gameIsRunning) return;
    this.gameIsRunning = false;
    this.physics.pause();

    const reward = 70 + (this.levelConfig.level - 1) * 10;
    const newCoins = this.coins + reward;
    this.registry.set("coins", newCoins);
    this.events.emit("update-hud", { coins: newCoins });

    this.add
      .rectangle(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        this.cameras.main.width,
        this.cameras.main.height,
        0x000000,
        0.7
      )
      .setScrollFactor(0);

    const winText = `שלב ${this.levelConfig.level} הושלם!`;
    this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY,
        winText,
        { fontSize: "32px", fill: "#00ff00" }
      )
      .setOrigin(0.5)
      .setScrollFactor(0);

    if (this.levelConfig.nextLevelKey) {
      this.registry.set("level", this.levelConfig.level + 1);
      this.scene.start(this.levelConfig.nextLevelKey);
    }
  }

  endGame(state, message) {
    if (!this.gameIsRunning) return;
    this.gameIsRunning = false;
    this.physics.pause();

    if (state === "lose") {
      const newCoins = Math.max(0, this.coins - 50);
      this.registry.set("coins", newCoins);
      this.events.emit("update-hud", { coins: newCoins });
    }

    this.player.setTint(state === "win" ? 0x00ff00 : 0xff0000);
    this.add.rectangle(this.cameras.main.centerX, this.cameras.main.centerY, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7).setScrollFactor(0);
    this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, message, { fontSize: "32px", fill: "#fff" }).setOrigin(0.5).setScrollFactor(0);
    this.time.delayedCall(1200, () => {
      this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 60, "לחץ R כדי להתחיל מחדש", { fontSize: "24px", fill: "#ffff00" }).setOrigin(0.5).setScrollFactor(0);
    });
  }

  updateHUD(time) {
    const elapsed = Math.max(0, time - this.externalTimerStart);
    this.events.emit("update-hud", { time: this.formatTime(elapsed) });
  }

  centerAndZoomCamera(viewW, viewH) {
    const cam = this.cameras.main;
    const zoom = Math.min(viewW / this.worldWidth, viewH / this.worldHeight);
    cam.setZoom(zoom);
    cam.centerOn(this.worldWidth / 2, this.worldHeight / 2);
  }

  showLockedDoorMessage() {
    if (this.lockedDoorMessage && this.lockedDoorMessage.active) return;
    this.lockedDoorMessage = this.add.text(this.door.x, this.door.y - 50, "הדלת נעולה! מצא את כל המפתחות.", { fontSize: "16px", fill: "#ff4444", backgroundColor: "#000a" }).setOrigin(0.5);
    this.time.delayedCall(2000, () => { if (this.lockedDoorMessage) this.lockedDoorMessage.destroy() });
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

  updateGlobalHUD(data) {
    if (!data || typeof data !== "object") return;

    if (data.coins !== undefined) {
      const el = document.getElementById("global-coins");
      if (el) el.textContent = String(data.coins);
    }

    if (data.level !== undefined) {
      const el = document.getElementById("global-level");
      if (el) el.textContent = String(data.level);
    }

    if (data.time !== undefined) {
      const el = document.getElementById("global-timer");
      if (el) el.textContent = String(data.time);
    }

    if (data.lives !== undefined) {
      const hearts = document.querySelectorAll("#global-hearts img");
      const lives = Math.max(0, Math.min(3, Number(data.lives)));
      hearts.forEach((img, idx) => {
        img.src = idx < lives ? "src/assets/heart.svg" : "src/assets/heart-empty.svg";
      });
    }
  }

  scheduleNextMedicineSpawn() {
    const options = [10000, 20000, 30000];
    const idx = Math.floor(Math.random() * options.length);
    this.nextMedicineSpawnAt = this.time.now + options[idx];
  }

  updateMedicine(time) {
    if (time < this.nextMedicineSpawnAt) return;
    if (!this.medicines) return;
    const activeCount = this.medicines.countActive(true);
    if (activeCount > 0) return;
    this.spawnMedicine();
  }

  spawnMedicine() {
    const maxAttempts = 50;
    let placed = false;
    for (let i = 0; i < maxAttempts && !placed; i++) {
      const tx = Math.floor(Math.random() * this.map[0].length);
      const ty = Math.floor(Math.random() * this.map.length);
      if (!this.isFloorTile(tx, ty)) continue;
      const wx = tx * TILE_SIZE + TILE_SIZE / 2;
      const wy = ty * TILE_SIZE + TILE_SIZE / 2;
      const med = this.medicines.create(wx, wy, "medicine").setDisplaySize(26, 26).refreshBody();
      med.setData("spawnTile", { x: tx, y: ty });
      placed = true;
    }
    this.scheduleNextMedicineSpawn();
  }
}