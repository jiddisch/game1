// src/scenes/Level8.js
import { TILE_SIZE, TOTAL_KEYS } from '../config.js';
import BaseLevelScene from './BaseLevelScene.js';

const LEVEL8_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

export default class Level8 extends BaseLevelScene {
  constructor() {
    super('Level8', {
      map: LEVEL8_MAP,
      level: 8,
      nextLevelKey: null
    });

    this.monster = null;
    this.monsterHealth = 3;
    this.monsterDead = false;

    this.easystar = null;
    this.nextPathTime = 0;
    this.pathInterval = 80;
    this.monsterSpeed = 150;

    this.bullets = null;
    this.magazines = null;
    this.ammo = 0;
    this.ammoText = null;
    this.spaceKey = null;
    this.lastDirX = 1;
    this.lastDirY = 0;

    this.nextMagazineAt = 0;
    this.magazineInterval = 20000;
  }

  createLevel() {
    this.monster = this.physics.add.sprite(80, 80, 'monster4').setDisplaySize(52, 52).setCollideWorldBounds(true);
    this.physics.add.collider(this.monster, this.borderWalls);
    this.physics.add.collider(this.monster, this.innerWalls);
    this.physics.add.overlap(this.player, this.monster, () => this.handlePlayerHit('המפלצת תפסה אותך! 😢'));

    this.physics.add.collider(this.player, this.innerWalls);

    this.bullets = this.physics.add.group();
    this.magazines = this.physics.add.staticGroup();

    this.physics.add.collider(this.bullets, this.borderWalls, this.onBulletHitWall, null, this);
    this.physics.add.collider(this.bullets, this.innerWalls, this.onBulletHitWall, null, this);
    this.physics.add.overlap(this.bullets, this.monster, this.onBulletHitMonster, null, this);
    this.physics.add.overlap(this.player, this.magazines, this.collectMagazine, null, this);

    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.ammoText = this.add.text(12, 48, 'כדורים: 0', { fontSize: '20px', fill: '#ffffff' }).setScrollFactor(0);

    this.easystar = new EasyStar.js();
    this.easystar.setGrid(this.map);
    this.easystar.setAcceptableTiles([0]);
    this.easystar.enableDiagonals();

    this.nextMagazineAt = this.time.now + this.magazineInterval;
    this.spawnMagazine();
  }

  updateLevel(time) {
    if (!this.player || !this.player.body) return;

    const vx = this.player.body.velocity.x;
    const vy = this.player.body.velocity.y;
    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy) || 1;
      this.lastDirX = vx / len;
      this.lastDirY = vy / len;
    }

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.tryShoot();
    }

    if (!this.monsterDead && this.monster && this.monster.body) {
      if (time >= this.nextPathTime) {
        this.nextPathTime = time + this.pathInterval;
        this.updateMonsterPath();
      }
      this.moveMonster();
    }

    if (time >= this.nextMagazineAt) {
      this.nextMagazineAt = time + this.magazineInterval;
      this.spawnMagazine();
    }
  }

  tryShoot() {
    if (!this.gameIsRunning) return;
    if (this.ammo <= 0) return;

    let dx = this.lastDirX;
    let dy = this.lastDirY;
    if (dx === 0 && dy === 0) {
      dx = 1;
      dy = 0;
    }

    const bullet = this.bullets.create(this.player.x, this.player.y, 'bullet').setDisplaySize(16, 16);
    const speed = 520;
    if (bullet && bullet.body) bullet.setVelocity(dx * speed, dy * speed);

    this.time.delayedCall(1200, () => {
      if (bullet && bullet.active) bullet.destroy();
    });

    this.ammo--;
    this.updateAmmoHUD();
  }

  onBulletHitWall(bullet) {
    if (bullet && bullet.active) bullet.destroy();
  }

  onBulletHitMonster(bullet) {
    if (bullet && bullet.active) bullet.destroy();
    if (this.monsterDead || !this.monster) return;

    this.monsterHealth--;
    if (this.monster && this.monster.active) {
      this.monster.setTintFill(0xff8888);
      this.time.delayedCall(80, () => {
        if (this.monster && this.monster.active) this.monster.clearTint();
      });
    }

    if (this.monsterHealth <= 0 && this.monster) {
      this.monsterDead = true;
      if (this.monster.body) this.monster.setVelocity(0, 0);
      this.monster.disableBody(true, true);
      this.tryUnlockDoorIfReady();
    }
  }

  collectMagazine(player, mag) {
    mag.disableBody(true, true);
    this.ammo += 20;
    this.updateAmmoHUD();
  }

  updateAmmoHUD() {
    if (this.ammoText) this.ammoText.setText(`כדורים: ${this.ammo}`);
  }

  spawnMagazine() {
    const pos = this.getRandomFloorTile();
    if (!pos) return;
    this.magazines.create(pos.x * TILE_SIZE + TILE_SIZE / 2, pos.y * TILE_SIZE + TILE_SIZE / 2, 'gift').setDisplaySize(28, 28).refreshBody();
  }

  getRandomFloorTile() {
    const floors = [];
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        if (this.map[y][x] === 0) floors.push({ x, y });
      }
    }
    if (floors.length === 0) return null;
    return floors[Math.floor(Math.random() * floors.length)];
  }

  updateMonsterPath() {
    if (!this.monster || !this.monster.body) return;
    const from = this.getTileFromWorld(this.monster.x, this.monster.y);
    const to = this.getTileFromWorld(this.player.x, this.player.y);
    if (from.x === to.x && from.y === to.y) {
      this.monster.setData('targetTile', null);
      return;
    }
    this.easystar.findPath(from.x, from.y, to.x, to.y, (path) => {
      if (!this.monster) return;
      this.monster.setData('targetTile', path && path.length > 1 ? path[1] : null);
    });
    this.easystar.calculate();
  }

  moveMonster() {
    if (!this.monster || !this.monster.body) return;
    const target = this.monster.getData('targetTile');
    if (!target) {
      this.monster.setVelocity(0, 0);
      return;
    }
    const tx = target.x * TILE_SIZE + TILE_SIZE / 2;
    const ty = target.y * TILE_SIZE + TILE_SIZE / 2;
    this.physics.moveTo(this.monster, tx, ty, this.monsterSpeed);
  }

  unlockDoor() {
    if (!this.doorLocked && this.door) return;
    if (this.keysCollected >= TOTAL_KEYS && this.monsterDead) {
      this.doorLocked = false;
      if (this.door) this.door.setTint(0x00ff00);
    }
  }

  tryUnlockDoorIfReady() {
    this.unlockDoor();
  }

  tryExit() {
    if (this.doorLocked || this.keysCollected < TOTAL_KEYS || !this.monsterDead) {
      this.showLockedDoorMessage();
      return;
    }
    this.winByEscaping();
  }

  showLockedDoorMessage() {
    if (this.lockedDoorMessage && this.lockedDoorMessage.active) return;
    const msg = this.keysCollected < TOTAL_KEYS
      ? 'הדלת נעולה! מצא את כל המפתחות.'
      : 'הדלת נעולה! הרוג את המפלצת כדי לפתוח.';
    this.lockedDoorMessage = this.add.text(this.door.x, this.door.y - 50, msg, { fontSize: '16px', fill: '#ff4444', backgroundColor: '#000a' }).setOrigin(0.5);
    this.time.delayedCall(2000, () => { if (this.lockedDoorMessage) this.lockedDoorMessage.destroy() });
  }
}