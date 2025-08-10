import { TILE_SIZE, TOTAL_KEYS } from "../config.js";

const LEVEL5_MAP = [
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

export default class Level5 extends Phaser.Scene {
  constructor() {
    super({ key: "Level5" });
    this.gameIsRunning = false;
    this.worldWidth = 0;
    this.worldHeight = 0;
    this.externalTimerEl = null;
    this.externalCoinsEl = null;
    this.externalHeartsEl = null;
    this.externalTimerStart = 0;
    this.externalTimerActive = false;

    this.bullets = null;
    this.nextPatternTime = 0;
    this.patternInterval = 1200;
    this.patternIndex = 0;
    this.spiralAngle = 0;

    this.giftGroup = null;
    this.giftSpawnInterval = 16000;
    this.nextGiftTime = 0;
    this.protectionActive = false;
    this.protectionUntil = 0;
    this.halo = null;

    this.playerLives = 3;
    this.invulnUntil = 0;

    this.keysCollected = 0;
    this.doorLocked = true;
    this.lockedDoorMessage = null;

    this.map = null;
    this.borderWalls = null;
    this.innerWalls = null;

    this.bossMoveAmplitude = 140;
    this.bossMoveSpeed = 0.0018;
    this.bossBaseX = 0;
    this.bossBaseY = 0;
  }

  preload() {}

  create() {
    this.coins = this.registry.get("coins");
    this.level = 5;

    const levelEl = document.getElementById("global-level");
    if (levelEl) levelEl.textContent = String(this.level);
    
    this.playerLives = this.registry.get("lives") ?? 3;

    this.map = LEVEL5_MAP.map(r => r.slice());
    this.worldWidth = this.map[0].length * TILE_SIZE;
    this.worldHeight = this.map.length * TILE_SIZE;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    const { width } = this.scale;
    this.infoText = this.add.text(width / 2, 10, "אסוף 3 מפתחות ופתח את הדלת", { fontSize: "24px", fill: "#fff" }).setOrigin(0.5, 0).setScrollFactor(0);
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
    this.createSafeNookNearPlayer();

    this.boss = this.physics.add.sprite(centerX, centerY - 60, "monster4").setDisplaySize(84, 84).setCollideWorldBounds(true);
    this.boss.setImmovable(true);
    this.bossBaseX = centerX;
    this.bossBaseY = centerY - 60;

    this.door = this.physics.add.staticSprite(750, 80, "door").setDisplaySize(50, 70).setTint(0xff0000).refreshBody();

    this.keys = this.physics.add.staticGroup();
    const keySpots = [{ x: 120, y: 420 }, { x: 680, y: 480 }, { x: 420, y: 120 }];
    keySpots.forEach((p) => {
      const key = this.keys.create(p.x, p.y, "key").setDisplaySize(25, 25).setTint(0xffff00);
      key.setData("isBeingCollected", false);
    });

    this.bullets = this.physics.add.group();

    this.giftGroup = this.physics.add.staticGroup();
    this.spawnInitialGiftNearPlayer();

    this.physics.add.collider(this.player, this.borderWalls);
    this.physics.add.collider(this.player, this.innerWalls);
    this.physics.add.collider(this.boss, this.borderWalls);
    this.physics.add.collider(this.boss, this.innerWalls);
    this.physics.add.collider(this.player, this.door, this.tryExit, null, this);

    this.physics.add.overlap(this.player, this.keys, this.collectKey, null, this);
    this.physics.add.collider(this.player, this.boss, () => this.endGame("lose", "המפלצת הבוס תפסה אותך! 😢"));

    this.physics.add.collider(this.bullets, this.borderWalls, (b) => b.destroy());
    this.physics.add.collider(this.bullets, this.innerWalls, (b) => b.destroy());
    this.physics.add.overlap(this.player, this.bullets, this.onBulletHitPlayer, null, this);

    this.physics.add.overlap(this.player, this.giftGroup, this.collectGift, null, this);

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

    this.nextPatternTime = this.time.now + 1200;
    this.nextGiftTime = this.time.now + this.giftSpawnInterval;

    this.externalTimerEl = document.getElementById("global-timer");
    this.externalCoinsEl = document.getElementById("global-coins");
    this.externalHeartsEl = document.getElementById("global-hearts");
    if (this.externalCoinsEl) this.externalCoinsEl.textContent = String(this.coins);
    if (this.externalTimerEl) this.externalTimerEl.textContent = "00:00:00";
    this.renderHeartsDOM(this.playerLives);
    this.externalTimerStart = this.time.now;
    this.externalTimerActive = true;
  }

  update() {
    if (!this.gameIsRunning) {
      if (Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.registry.set("lives", 3);
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

    if (this.time.now > this.nextPatternTime) {
      this.nextPatternTime = this.time.now + this.patternInterval;
      this.fireNextPattern();
    }

    if (this.time.now > this.nextGiftTime && this.giftGroup.countActive(true) === 0) {
      this.spawnGift();
    }

    if (this.protectionActive && this.time.now > this.protectionUntil) {
      this.protectionActive = false;
      if (this.halo) {
        this.halo.destroy();
        this.halo = null;
      }
    }

    if (this.halo) {
      this.halo.setPosition(this.player.x, this.player.y);
    }

    const t = this.time.now;
    const offsetX = Math.sin(t * this.bossMoveSpeed) * this.bossMoveAmplitude;
    const offsetY = Math.cos(t * this.bossMoveSpeed * 0.8) * 20;
    this.boss.setPosition(this.bossBaseX + offsetX, this.bossBaseY + offsetY);
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

  onBulletHitPlayer(player, bullet) {
    if (bullet && bullet.active) bullet.destroy();
    if (this.protectionActive && this.time.now < this.protectionUntil) return;
    if (this.time.now < this.invulnUntil) return;

    if (this.playerLives > 1) {
      this.playerLives--;
      this.registry.set("lives", this.playerLives);
      this.renderHeartsDOM(this.playerLives);
      this.invulnUntil = this.time.now + 1500;
      this.tweens.add({ targets: this.player, alpha: 0.3, yoyo: true, repeat: 5, duration: 100 });
      return;
    }

    this.playerLives = 0;
    this.registry.set("lives", 0);
    this.renderHeartsDOM(0);
    this.endGame("lose", "נפגעת מלייזר! 😢");
  }

  fireNextPattern() {
    const idx = this.patternIndex % 4;
    if (idx === 0) this.fireRadial(16, 280);
    else if (idx === 1) this.fireCross8(320);
    else if (idx === 2) this.fireSpiral(8, 260);
    else if (idx === 3) this.fireAimedBurst(5, 320);
    this.patternIndex++;
  }

  fireRadial(count, speed) {
    const mx = this.boss.x;
    const my = this.boss.y;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.spawnBullet(mx, my, Math.cos(angle), Math.sin(angle), speed);
    }
  }

  fireCross8(speed) {
    const dirs = [
      { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
      { x: Math.SQRT1_2, y: Math.SQRT1_2 }, { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
      { x: Math.SQRT1_2, y: -Math.SQRT1_2 }, { x: -Math.SQRT1_2, y: -Math.SQRT1_2 }
    ];
    const mx = this.boss.x;
    const my = this.boss.y;
    dirs.forEach(d => this.spawnBullet(mx, my, d.x, d.y, speed));
  }

  fireSpiral(count, speed) {
    const mx = this.boss.x;
    const my = this.boss.y;
    const step = Math.PI / 10;
    for (let i = 0; i < count; i++) {
      const a = this.spiralAngle + i * (Math.PI * 2 / count);
      this.spawnBullet(mx, my, Math.cos(a), Math.sin(a), speed);
    }
    this.spiralAngle += step;
  }

  fireAimedBurst(count, speed) {
    const mx = this.boss.x;
    const my = this.boss.y;
    let dx = this.player.x - mx;
    let dy = this.player.y - my;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const spread = 0.28;
    for (let i = 0; i < count; i++) {
      const off = spread * ((i / (count - 1)) - 0.5);
      const ca = Math.cos(off), sa = Math.sin(off);
      const sx = dx * ca - dy * sa;
      const sy = dx * sa + dy * ca;
      this.spawnBullet(mx, my, sx, sy, speed);
    }
  }

  spawnBullet(x, y, dx, dy, speed) {
    const spawnX = x + dx * 30;
    const spawnY = y + dy * 30;
    const b = this.bullets.create(spawnX, spawnY, "bullet").setDisplaySize(16, 16);
    b.body.setAllowGravity(false);
    b.setVelocity(dx * speed, dy * speed);
    b.setAngle(Phaser.Math.RadToDeg(Math.atan2(dy, dx)));
    this.time.delayedCall(2600, () => {
      if (b && b.active) b.destroy();
    });
  }

  spawnGift() {
    let placed = false;
    for (let i = 0; i < 60 && !placed; i++) {
      const x = Phaser.Math.Between(1, this.map[0].length - 2);
      const y = Phaser.Math.Between(1, this.map.length - 2);
      if (!this.isFloorTile(x, y)) continue;
      this.giftGroup.create(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, "gift").setDisplaySize(28, 28).refreshBody();
      placed = true;
    }
    this.nextGiftTime = this.time.now + this.giftSpawnInterval;
  }

  spawnInitialGiftNearPlayer() {
    const px = this.player.x;
    const py = this.player.y;
    const gx = px + TILE_SIZE;
    const gy = py;
    this.giftGroup.create(gx, gy, "gift").setDisplaySize(28, 28).refreshBody();
  }

  createSafeNookNearPlayer() {
    const ptX = Math.floor(this.player.x / TILE_SIZE);
    const ptY = Math.floor(this.player.y / TILE_SIZE);
    const positions = [
      { x: ptX - 1, y: ptY - 1 },
      { x: ptX - 1, y: ptY },
      { x: ptX, y: ptY - 1 }
    ];
    positions.forEach(p => {
      const wx = p.x * TILE_SIZE + TILE_SIZE / 2;
      const wy = p.y * TILE_SIZE + TILE_SIZE / 2;
      this.innerWalls.create(wx, wy, "wall").setSize(TILE_SIZE, TILE_SIZE).refreshBody();
    });
  }

  collectGift(player, gift) {
    gift.disableBody(true, true);
    this.protectionActive = true;
    this.protectionUntil = this.time.now + 6000;
    if (this.halo) this.halo.destroy();
    this.halo = this.add.circle(this.player.x, this.player.y, 28, 0x66ccff, 0.25);
    this.halo.setStrokeStyle(2, 0x99e0ff, 0.9);
    this.halo.setBlendMode(Phaser.BlendModes.ADD);
    this.nextGiftTime = this.time.now + this.giftSpawnInterval;
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
    const reward = 120;
    const newCoins = this.coins + reward;
    this.coins = newCoins;
    this.registry.set("coins", newCoins);
    this.coinsText.setText(`מטבעות: ${newCoins}`);
    const el = document.getElementById("global-coins");
    if (el) el.textContent = String(newCoins);
    this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.7);
    this.add.text(this.scale.width / 2, this.scale.height / 2, "שלב 5 הושלם! ממשיכים לשלב 6...", { fontSize: "32px", fill: "#00ff00" }).setOrigin(0.5);
    this.externalTimerActive = false;
    this.registry.set("level", 6);
    this.time.delayedCall(1600, () => {
      this.scene.start("Level6");
    });
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
    return this.inBounds(x, y) && this.map[y][x] === 0;
  }

  inBounds(x, y) {
    return y >= 0 && y < this.map.length && x >= 0 && x < this.map[y].length;
  }
}