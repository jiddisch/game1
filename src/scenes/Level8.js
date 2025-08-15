// src/scenes/Level8.js
import { TILE_SIZE, TOTAL_KEYS } from '../config.js';
import BaseLevelScene from './BaseLevelScene.js';

const LEVEL8_MAP = [
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

export default class Level8 extends BaseLevelScene {
  constructor() {
    super('Level8', {
      map: LEVEL8_MAP,
      level: 8,
      nextLevelKey: 'Level9'
    });

    this.monster = null;
    this.monsterHealth = 3;
    this.monsterDead = false;

    this.easystar = null;
    this.nextPathTime = 0;
    this.pathInterval = 80;
    this.monsterSpeed = 80;

    this.bullets = null;
    this.magazines = null;
    this.ammo = 0;
    this.ammoText = null;
    this.spaceKey = null;
    this.lastDirX = 1;
    this.lastDirY = 0;
    this.aimIndicator = null;

    this.nextMagazineAt = 0;
    this.magazineInterval = 20000;
  }

  createLevel() {
    this.monsterHealth = 3;
    this.monsterDead = false;

    this.monster = this.physics.add.sprite(80, 80, 'monster4').setDisplaySize(52, 52).setCollideWorldBounds(true);
    this.monster.setData('health', 3);
    this.monster.setData('isMonster', true);
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

    this.ammoText = this.add.text(this.scale.width - 12, 48, 'כדורים: 0', { fontSize: '20px', fill: '#ffffff' }).setOrigin(1, 0).setScrollFactor(0).setDepth(1000);
    this.aimIndicator = this.add.image(this.player.x, this.player.y, 'bullet').setDisplaySize(14, 14).setAlpha(0.6).setDepth(900);

    this.easystar = new EasyStar.js();
    this.easystar.setGrid(this.map);
    this.easystar.setAcceptableTiles([0]);
    this.easystar.enableDiagonals();

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
    bullet.setData('isBullet', true);
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

  onBulletHitMonster(obj1, obj2) {
    const is1Bullet = obj1 && obj1.getData && obj1.getData('isBullet');
    const is2Bullet = obj2 && obj2.getData && obj2.getData('isBullet');
    const is1Monster = obj1 && obj1.getData && obj1.getData('isMonster');
    const is2Monster = obj2 && obj2.getData && obj2.getData('isMonster');

    const bullet = is1Bullet ? obj1 : is2Bullet ? obj2 : null;
    const monster = is1Monster ? obj1 : is2Monster ? obj2 : null;

    if (!bullet || !monster) return;
    if (!bullet.active || bullet.getData('hitProcessed')) return;

    bullet.setData('hitProcessed', true);
    bullet.destroy();
    if (this.monsterDead || !monster) return;

    let hp = Number(monster.getData('health'));
    if (!Number.isFinite(hp)) hp = 3;
    hp = Math.max(0, hp - 1);
    monster.setData('health', hp);
    this.monsterHealth = hp;

    if (monster.active) {
      monster.setTintFill(0xff8888);
      this.time.delayedCall(80, () => {
        if (monster && monster.active) monster.clearTint();
      });
    }

    if (hp <= 0) {
      this.monsterDead = true;
      if (monster.body) monster.setVelocity(0, 0);
      monster.disableBody(true, true);
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
    this.unlockDoor();
    if (this.keysCollected < TOTAL_KEYS || !this.monsterDead || this.doorLocked) {
      this.showLockedDoorMessage();
      return;
    }
    this.winByEscaping();
  }

  showLockedDoorMessage() {
    if (this.lockedDoorMessage && this.lockedDoorMessage.active) return;
    const needKeys = this.keysCollected < TOTAL_KEYS;
    const needMonster = !this.monsterDead;
    let msg = 'הדלת נעולה!';
    if (needKeys && needMonster) msg = 'הדלת נעולה! מצא את כל המפתחות והרוג את המפלצת.';
    else if (needKeys) msg = 'הדלת נעולה! מצא את כל המפתחות.';
    else if (needMonster) msg = 'הדלת נעולה! הרוג את המפלצת כדי לפתוח.';
    this.lockedDoorMessage = this.add.text(this.door.x, this.door.y - 50, msg, { fontSize: '16px', fill: '#ff4444', backgroundColor: '#000a' }).setOrigin(0.5);
    this.time.delayedCall(2000, () => { if (this.lockedDoorMessage) this.lockedDoorMessage.destroy() });
  }
}