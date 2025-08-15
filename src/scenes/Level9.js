// src/scenes/Level9.js
import { TILE_SIZE, TOTAL_KEYS } from '../config.js';
import BaseLevelScene from './BaseLevelScene.js';

const LEVEL9_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

export default class Level9 extends BaseLevelScene {
  constructor() {
    super('Level9', {
      map: LEVEL9_MAP,
      level: 9,
      nextLevelKey: null
    });

    this.boss = null;
    this.bossHP = 3;
    this.bossBullets = null;
    this.nextPatternTime = 0;
    this.patternInterval = 1200;
    this.patternIndex = 0;
    this.spiralAngle = 0;
    this.bossMoveAmplitude = 120;
    this.bossMoveSpeed = 0.0016;
    this.bossBaseX = 0;
    this.bossBaseY = 0;

    this.ghostEnemy = null;
    this.ghostHP = 5;
    this.easystar = null;
    this.nextPathTime = 0;
    this.pathInterval = 80;
    this.ghostSpeed = 90;

    this.bullets = null;
    this.magazines = null;
    this.ammo = 0;
    this.ammoText = null;
    this.spaceKey = null;
    this.lastDirX = 1;
    this.lastDirY = 0;
    this.aimIndicator = null;

    this.nextMagazineAt = 0;
    this.magazineInterval = 18000;
  }

  createLevel() {
    const centerX = this.worldWidth / 2;
    const centerY = this.worldHeight / 2;

    this.physics.add.collider(this.player, this.innerWalls);

    this.bullets = this.physics.add.group();
    this.bossBullets = this.physics.add.group();
    this.magazines = this.physics.add.staticGroup();

    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.ammoText = this.add.text(this.scale.width - 12, 48, 'כדורים: 0', { fontSize: '20px', fill: '#ffffff' }).setOrigin(1, 0).setScrollFactor(0).setDepth(1000);
    this.aimIndicator = this.add.image(this.player.x, this.player.y, 'bullet').setDisplaySize(14, 14).setAlpha(0.6).setDepth(900);

    this.boss = this.physics.add.sprite(centerX, centerY - 60, "monster4").setDisplaySize(84, 84).setCollideWorldBounds(true);
    this.boss.setImmovable(true);
    this.boss.setData('isBoss', true);
    this.boss.setData('hp', this.bossHP);
    this.bossBaseX = this.boss.x;
    this.bossBaseY = this.boss.y;

    this.ghostEnemy = this.physics.add.sprite(80, 80, 'player').setDisplaySize(40, 40).setCollideWorldBounds(true).setTint(0x66ccff);
    this.ghostEnemy.setData('isGhostEnemy', true);
    this.ghostEnemy.setData('hp', this.ghostHP);

    this.physics.add.collider(this.boss, this.borderWalls);
    this.physics.add.collider(this.boss, this.innerWalls);
    this.physics.add.collider(this.ghostEnemy, this.borderWalls);
    this.physics.add.collider(this.ghostEnemy, this.innerWalls);
    this.physics.add.overlap(this.player, this.ghostEnemy, () => this.handlePlayerHit('הרוח רפאים תפסה אותך! 😢'));
    this.physics.add.collider(this.player, this.door, this.tryExit, null, this);

    this.physics.add.collider(this.bullets, this.borderWalls, (b) => b.destroy());
    this.physics.add.collider(this.bullets, this.innerWalls, (b) => b.destroy());
    this.physics.add.collider(this.bossBullets, this.borderWalls, (b) => b.destroy());
    this.physics.add.collider(this.bossBullets, this.innerWalls, (b) => b.destroy());
    this.physics.add.overlap(this.player, this.bossBullets, this.onBossBulletHitPlayer, null, this);

    this.physics.add.overlap(this.bullets, this.boss, this.onPlayerBulletHitBoss, null, this);
    this.physics.add.overlap(this.bullets, this.ghostEnemy, this.onPlayerBulletHitGhost, null, this);
    this.physics.add.overlap(this.player, this.magazines, this.collectMagazine, null, this);

    this.easystar = new EasyStar.js();
    this.easystar.setGrid(this.map);
    this.easystar.setAcceptableTiles([0]);
    this.easystar.enableDiagonals();

    this.nextPatternTime = this.time.now + 1000;
    this.nextMagazineAt = this.time.now + this.magazineInterval;
    this.spawnMagazine();

    this.scale.on('resize', (gameSize) => {
      if (this.ammoText) this.ammoText.setPosition(gameSize.width - 12, 48);
    });
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

    if (this.aimIndicator) {
      const dx = this.lastDirX || 1;
      const dy = this.lastDirY || 0;
      const ang = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
      this.aimIndicator.setAngle(ang);
      const offset = 26;
      this.aimIndicator.setPosition(this.player.x + dx * offset, this.player.y + dy * offset);
    }

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.tryShoot();
    }

    if (time > this.nextPatternTime && this.boss && this.boss.active) {
      this.nextPatternTime = time + this.patternInterval;
      this.fireNextPattern();
    }

    const t = this.time.now;
    if (this.boss && this.boss.active) {
      const offsetX = Math.sin(t * this.bossMoveSpeed) * this.bossMoveAmplitude;
      const offsetY = Math.cos(t * this.bossMoveSpeed * 0.8) * 20;
      this.boss.setPosition(this.bossBaseX + offsetX, this.bossBaseY + offsetY);
    }

    if (this.ghostEnemy && this.ghostEnemy.active) {
      if (time >= this.nextPathTime) {
        this.nextPathTime = time + this.pathInterval;
        this.updateGhostPath();
      }
      this.moveGhost();
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
    bullet.setData('isBullet', true);
    const speed = 520;
    if (bullet && bullet.body) bullet.setVelocity(dx * speed, dy * speed);

    this.time.delayedCall(1200, () => {
      if (bullet && bullet.active) bullet.destroy();
    });

    this.ammo--;
    this.updateAmmoHUD();
  }

  onBossBulletHitPlayer(player, bullet) {
    if (bullet && bullet.active) bullet.destroy();
    this.handlePlayerHit('נפגעת מלייזר! 😢');
  }

  onPlayerBulletHitBoss(bullet, boss) {
    if (!bullet || !boss) return;
    if (!bullet.active || bullet.getData('hitProcessed')) return;
    bullet.setData('hitProcessed', true);
    bullet.destroy();

    let hp = Number(boss.getData('hp'));
    if (!Number.isFinite(hp)) hp = 3;
    hp = Math.max(0, hp - 1);
    boss.setData('hp', hp);

    if (boss.active) {
      boss.setTintFill(0xff8888);
      this.time.delayedCall(80, () => {
        if (boss && boss.active) boss.clearTint();
      });
    }

    if (hp <= 0) {
      if (boss.body) boss.setVelocity(0, 0);
      boss.disableBody(true, true);
      this.tryUnlockDoorIfReady();
    }
  }

  onPlayerBulletHitGhost(bullet, ghost) {
    if (!bullet || !ghost) return;
    if (!bullet.active || bullet.getData('hitProcessed')) return;
    bullet.setData('hitProcessed', true);
    bullet.destroy();

    let hp = Number(ghost.getData('hp'));
    if (!Number.isFinite(hp)) hp = 5;
    hp = Math.max(0, hp - 1);
    ghost.setData('hp', hp);

    if (ghost.active) {
      ghost.setTintFill(0x99ccff);
      this.time.delayedCall(80, () => {
        if (ghost && ghost.active) {
          ghost.clearTint();
          ghost.setTint(0x66ccff);
        }
      });
    }

    if (hp <= 0) {
      if (ghost.body) ghost.setVelocity(0, 0);
      ghost.disableBody(true, true);
      this.tryUnlockDoorIfReady();
    }
  }

  fireNextPattern() {
    const idx = this.patternIndex % 4;
    if (idx === 0) this.fireRadial(14, 260);
    else if (idx === 1) this.fireCross8(300);
    else if (idx === 2) this.fireSpiral(8, 240);
    else if (idx === 3) this.fireAimedBurst(1, 320);
    this.patternIndex++;
  }

  fireRadial(count, speed) {
    if (!this.boss) return;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.spawnBossBullet(this.boss.x, this.boss.y, Math.cos(angle), Math.sin(angle), speed);
    }
  }

  fireCross8(speed) {
    if (!this.boss) return;
    const dirs = [
      { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
      { x: Math.SQRT1_2, y: Math.SQRT1_2 }, { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
      { x: Math.SQRT1_2, y: -Math.SQRT1_2 }, { x: -Math.SQRT1_2, y: -Math.SQRT1_2 }
    ];
    dirs.forEach(d => this.spawnBossBullet(this.boss.x, this.boss.y, d.x, d.y, speed));
  }

  fireSpiral(count, speed) {
    if (!this.boss) return;
    const step = Math.PI / 10;
    for (let i = 0; i < count; i++) {
      const a = this.spiralAngle + i * (Math.PI * 2 / count);
      this.spawnBossBullet(this.boss.x, this.boss.y, Math.cos(a), Math.sin(a), speed);
    }
    this.spiralAngle += step;
  }

  fireAimedBurst(count, speed) {
    if (!this.boss || !this.player) return;
    let dx = this.player.x - this.boss.x;
    let dy = this.player.y - this.boss.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    for (let i = 0; i < count; i++) {
      this.spawnBossBullet(this.boss.x, this.boss.y, dx, dy, speed);
    }
  }

  spawnBossBullet(x, y, dx, dy, speed) {
    const spawnX = x + dx * 30;
    const spawnY = y + dy * 30;
    const b = this.bossBullets.create(spawnX, spawnY, "bullet").setDisplaySize(16, 16);
    b.body.setAllowGravity(false);
    b.body.setSize(16, 16, true);
    b.setVelocity(dx * speed, dy * speed);
    b.setAngle(Phaser.Math.RadToDeg(Math.atan2(dy, dx)));
    this.time.delayedCall(2600, () => {
      if (b && b.active) b.destroy();
    });
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
    this.magazines.create(pos.x * TILE_SIZE + TILE_SIZE / 2, pos.y * TILE_SIZE + TILE_SIZE / 2, 'ammo').setDisplaySize(28, 28).refreshBody();
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

  updateGhostPath() {
    if (!this.ghostEnemy || !this.ghostEnemy.body) return;
    const from = this.getTileFromWorld(this.ghostEnemy.x, this.ghostEnemy.y);
    const to = this.getTileFromWorld(this.player.x, this.player.y);
    if (from.x === to.x && from.y === to.y) {
      this.ghostEnemy.setData('targetTile', null);
      return;
    }
    this.easystar.findPath(from.x, from.y, to.x, to.y, (path) => {
      if (!this.ghostEnemy) return;
      this.ghostEnemy.setData('targetTile', path && path.length > 1 ? path[1] : null);
    });
    this.easystar.calculate();
  }

  moveGhost() {
    if (!this.ghostEnemy || !this.ghostEnemy.body) return;
    const target = this.ghostEnemy.getData('targetTile');
    if (!target) {
      this.ghostEnemy.setVelocity(0, 0);
      return;
    }
    const tx = target.x * TILE_SIZE + TILE_SIZE / 2;
    const ty = target.y * TILE_SIZE + TILE_SIZE / 2;
    this.physics.moveTo(this.ghostEnemy, tx, ty, this.ghostSpeed);
  }

  unlockDoor() {
    if (!this.doorLocked && this.door) return;
    const bossDead = !this.boss || !this.boss.active;
    const ghostDead = !this.ghostEnemy || !this.ghostEnemy.active;
    if (this.keysCollected >= TOTAL_KEYS && bossDead && ghostDead) {
      this.doorLocked = false;
      if (this.door) this.door.setTint(0x00ff00);
    }
  }

  tryUnlockDoorIfReady() {
    this.unlockDoor();
  }

  tryExit() {
    this.unlockDoor();
    const bossDead = !this.boss || !this.boss.active;
    const ghostDead = !this.ghostEnemy || !this.ghostEnemy.active;
    if (this.keysCollected < TOTAL_KEYS || !bossDead || !ghostDead || this.doorLocked) {
      this.showLockedDoorMessage();
      return;
    }
    this.winByEscaping();
  }

  showLockedDoorMessage() {
    if (this.lockedDoorMessage && this.lockedDoorMessage.active) return;
    const needKeys = this.keysCollected < TOTAL_KEYS;
    const bossDead = !this.boss || !this.boss.active;
    const ghostDead = !this.ghostEnemy || !this.ghostEnemy.active;
    const needBoss = !bossDead;
    const needGhost = !ghostDead;
    let parts = [];
    if (needKeys) parts.push('מצא את כל המפתחות');
    if (needBoss) parts.push('הרוג את המפלצת היורה');
    if (needGhost) parts.push('הרוג את רוח הרפאים');
    const msg = parts.length ? `הדלת נעולה! ${parts.join(' וגם ')}.` : 'הדלת נעולה!';
    this.lockedDoorMessage = this.add.text(this.door.x, this.door.y - 50, msg, { fontSize: '16px', fill: '#ff4444', backgroundColor: '#000a' }).setOrigin(0.5);
    this.time.delayedCall(2000, () => { if (this.lockedDoorMessage) this.lockedDoorMessage.destroy() });
  }
}