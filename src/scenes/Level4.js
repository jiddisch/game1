// src/scenes/Level4.js
import { TILE_SIZE, TIME_LIMIT_MS, TOTAL_KEYS } from "../config.js";

const LEVEL4_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,1,0,0,0,1,1,1,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,1,1,1,0,0,0,1,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

export default class Level4 extends Phaser.Scene {
  constructor() {
    super({ key: "Level4" });
    this.gameIsRunning = false;
    this.keysCollected = 0;
    this.doorLocked = true;
    this.wallSprites = [];
    this.worldWidth = 0;
    this.worldHeight = 0;
    this.externalTimerEl = null;
    this.externalTimerStart = 0;
    this.externalTimerActive = false;
    this.externalCoinsEl = null;
    this.nextPathCalc = 0;
    this.targetTile = null;
    this.losInterval = 1200;
    this.nextLOSCheck = 0;
    this.alertUntil = 0;
    this.bullets = null;
    this.bulletInterval = 900;
    this.nextBulletTime = 0;
    this.coinsGroup = null;
    this.coinTiles = null;
    this.coinSpawnInterval = 5000;
    this.nextCoinTime = 0;
    this.coinMax = 4;
    this.giftGroup = null;
    this.giftSpawnInterval = 20000;
    this.nextGiftTime = 0;
    this.protectionActive = false;
    this.protectionUntil = 0;
    this.halo = null;
    this.playerLives = 3;
    this.invulnUntil = 0;
  }

  create() {
    this.coins = this.registry.get("coins");
    this.playerLives = this.registry.get("lives") ?? 3;
    this.level = 4;

    this.map = LEVEL4_MAP.map(r => r.slice());
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

    this.player = this.physics.add.sprite(400, 300, "player").setDisplaySize(40, 40).setCollideWorldBounds(true);
    this.monster = this.physics.add.sprite(80, 80, "monster4").setDisplaySize(52, 52).setCollideWorldBounds(true);
    this.monsterBaseSpeed = 120;
    this.monsterChaseSpeed = 165;
    this.door = this.physics.add.staticSprite(750, 80, "door").setDisplaySize(50, 70).setTint(0xff0000).refreshBody();

    this.physics.add.collider(this.player, this.borderWalls);
    this.physics.add.collider(this.monster, this.borderWalls);
    this.physics.add.collider(this.monster, this.innerWalls);
    this.physics.add.collider(this.player, this.door, this.tryExit, null, this);

    this.keys = this.physics.add.staticGroup();
    const keySpots = [{ x: 120, y: 420 }, { x: 680, y: 480 }, { x: 420, y: 120 }];
    keySpots.forEach((p) => {
      const key = this.keys.create(p.x, p.y, "key").setDisplaySize(25, 25).setTint(0xffff00);
      key.setData("isBeingCollected", false);
    });
    this.physics.add.overlap(this.player, this.keys, this.collectKey, null, this);
    this.physics.add.collider(this.player, this.monster, this.handleGameOver, null, this);

    this.bullets = this.physics.add.group();
    this.physics.add.collider(this.bullets, this.borderWalls, (b) => b.destroy());
    this.physics.add.collider(this.bullets, this.innerWalls, (b) => b.destroy());
    this.physics.add.overlap(this.player, this.bullets, this.onBulletHitPlayer, null, this);

    this.giftGroup = this.physics.add.staticGroup();
    this.physics.add.overlap(this.player, this.giftGroup, this.collectGift, null, this);

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
    this.nextCoinTime = this.time.now + this.coinSpawnInterval;
    this.nextGiftTime = this.time.now + this.giftSpawnInterval;
  }

  update(time) {
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

    if (this.isAlert(time) && time > this.nextBulletTime) {
      this.nextBulletTime = time + this.bulletInterval;
      this.fireBulletAtPlayer();
    }

    if (time > this.nextCoinTime) {
      this.nextCoinTime = time + this.coinSpawnInterval;
      if (this.coinsGroup.countActive(true) < this.coinMax) this.spawnCoin();
    }

    if (time > this.nextGiftTime && this.giftGroup.countActive(true) === 0) {
      this.spawnGift();
    }

    if (this.protectionActive && time > this.protectionUntil) {
      this.protectionActive = false;
      if (this.halo) {
        this.halo.destroy();
        this.halo = null;
      }
    }

    if (this.halo) this.halo.setPosition(this.player.x, this.player.y);
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

  onBulletHitPlayer(player, bullet) {
    if (this.protectionActive && this.time.now < this.protectionUntil) {
      if (bullet && bullet.active) bullet.destroy();
      return;
    }
    this.handlePlayerHit("נפגעת מירייה! 😢");
  }

  handleGameOver() { this.handlePlayerHit("המפלצת תפסה אותך! 😢"); }
  
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

  isAlert(time) { return time < this.alertUntil; }

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
    if (time > this.nextLOSCheck) {
      this.nextLOSCheck = time + this.losInterval;
      if (this.hasLineOfSight(this.monster.x, this.monster.y, this.player.x, this.player.y)) {
        const dur = Phaser.Math.Between(3000, 5000);
        this.alertUntil = time + dur;
        this.monster.clearTint();
        this.monster.setTint(0xff6666);
      }
    }
    if (!this.isAlert(time)) this.monster.clearTint();

    const recalc = this.isAlert(time) ? 90 : 250;
    if (time > this.nextPathCalc) {
      this.nextPathCalc = time + recalc;
      const m = this.getTileFromWorld(this.monster.x, this.monster.y);
      let target;
      if (this.isAlert(time)) {
        target = this.getTileFromWorld(this.player.x, this.player.y);
      } else {
        target = this.pickWanderTarget(m);
      }
      if (target && (target.x !== m.x || target.y !== m.y)) {
        this.easystar.findPath(m.x, m.y, target.x, target.y, (path) => {
          if (path && path.length > 1) this.targetTile = path[1];
          else this.targetTile = null;
        });
        this.easystar.calculate();
      }
    }

    if (this.targetTile) {
      const { x, y } = this.targetTile;
      const targetPx = x * TILE_SIZE + TILE_SIZE / 2;
      const targetPy = y * TILE_SIZE + TILE_SIZE / 2;
      const dx = targetPx - this.monster.x;
      const dy = targetPy - this.monster.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 2) this.monster.setVelocity(0);
      else {
        const speed = this.isAlert(time) ? this.monsterChaseSpeed : this.monsterBaseSpeed;
        this.monster.setVelocity((dx / dist) * speed, (dy / dist) * speed);
      }
    } else {
      this.monster.setVelocity(0);
    }
  }

  fireBulletAtPlayer() {
    const mx = this.monster.x;
    const my = this.monster.y;
    const px = this.player.x;
    const py = this.player.y;
    let dx = px - mx;
    let dy = py - my;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    const spawnX = mx + dx * 28;
    const spawnY = my + dy * 28;

    const bullet = this.bullets.create(spawnX, spawnY, "bullet").setDisplaySize(16, 16);
    bullet.setDepth(1);
    bullet.body.setAllowGravity(false);
    bullet.setVelocity(dx * 420, dy * 420);
    bullet.setAngle(Phaser.Math.RadToDeg(Math.atan2(dy, dx)));

    this.time.delayedCall(2200, () => {
      if (bullet && bullet.active) bullet.destroy();
    });
  }

  pickWanderTarget(fromTile) {
    for (let i = 0; i < 20; i++) {
      const rx = Phaser.Math.Between(Math.max(1, fromTile.x - 4), Math.min(this.map[0].length - 2, fromTile.x + 4));
      const ry = Phaser.Math.Between(Math.max(1, fromTile.y - 4), Math.min(this.map.length - 2, fromTile.y + 4));
      if (this.isFloorTile(rx, ry)) return { x: rx, y: ry };
    }
    return this.getTileFromWorld(this.player.x, this.player.y);
  }

  hasLineOfSight(x0, y0, x1, y1) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / (TILE_SIZE / 2);
    const dx = (x1 - x0) / steps;
    const dy = (y1 - y0) / steps;
    let cx = x0;
    let cy = y0;
    for (let i = 0; i <= steps; i++) {
      const t = this.getTileFromWorld(cx, cy);
      if (this.map[t.y] && this.map[t.y][t.x] === 1) return false;
      cx += dx;
      cy += dy;
    }
    return true;
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

  spawnGift() {
    const doorTile = this.getTileFromWorld(this.door.x, this.door.y);
    let placed = false;
    for (let i = 0; i < 60 && !placed; i++) {
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
      const sprite = this.giftGroup.create(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, "gift").setDisplaySize(28, 28).refreshBody();
      placed = true;
    }
    this.nextGiftTime = this.time.now + this.giftSpawnInterval;
  }

  collectGift(player, gift) {
    gift.disableBody(true, true);
    this.protectionActive = true;
    this.protectionUntil = this.time.now + 5000;
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
    const newCoins = this.coins + 80;
    this.coins = newCoins;
    this.registry.set("coins", newCoins);
    this.coinsText.setText(`מטבעות: ${newCoins}`);
    const el = document.getElementById("global-coins");
    if (el) el.textContent = String(newCoins);
    this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.7);
    this.add.text(this.scale.width / 2, this.scale.height / 2 - 10, "שלב 4 הושלם!", { fontSize: "32px", fill: "#00ff00" }).setOrigin(0.5);
    this.add.text(this.scale.width / 2, this.scale.height / 2 + 34, "עוברים לשלב 5...", { fontSize: "24px", fill: "#ffffff" }).setOrigin(0.5);
    this.externalTimerActive = false;
    this.time.delayedCall(1000, () => { this.scene.start("Level5"); });
  }

  formatTime(milliseconds) {
    if (milliseconds < 0) milliseconds = 0;
    const totalSec = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const centi = Math.floor((milliseconds % 1000) / 10);
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(centi).padStart(2, "0")}`;
  }

  getTileFromWorld(wx, wy) { return { x: Math.floor(wx / TILE_SIZE), y: Math.floor(wy / TILE_SIZE) }; }
  isFloorTile(x, y) { return this.inBounds(x, y) && this.map[y][x] === 0; }
  inBounds(x, y) { return y >= 0 && y < this.map.length && x >= 0 && x < this.map[y].length; }
}