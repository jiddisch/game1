import { TILE_SIZE } from '../config.js';
import BaseLevelScene from './BaseLevelScene.js';

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
  [1,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

export default class Level5 extends BaseLevelScene {
  constructor() {
    super('Level5', {
      map: LEVEL5_MAP,
      level: 5,
      nextLevelKey: 'Level6'
    });

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

    this.bossMoveAmplitude = 140;
    this.bossMoveSpeed = 0.0018;
    this.bossBaseX = 0;
    this.bossBaseY = 0;
  }

  createLevel() {
    const centerX = this.worldWidth / 2;
    const centerY = this.worldHeight / 2;

    this.boss = this.physics.add.sprite(centerX, centerY - 60, "monster4").setDisplaySize(84, 84).setCollideWorldBounds(true);
    this.boss.setImmovable(true);
    this.bossBaseX = this.boss.x;
    this.bossBaseY = this.boss.y;

    this.bullets = this.physics.add.group();
    this.giftGroup = this.physics.add.staticGroup();

    const startTile = { x: 2, y: this.map.length - 3 };
    this.player.setPosition(startTile.x * TILE_SIZE + TILE_SIZE / 2, startTile.y * TILE_SIZE + TILE_SIZE / 2);

    this.physics.add.collider(this.boss, this.borderWalls);
    this.physics.add.collider(this.boss, this.innerWalls);
    this.physics.add.collider(this.bullets, this.borderWalls, (b) => b.destroy());
    this.physics.add.collider(this.bullets, this.innerWalls, (b) => b.destroy());
    this.physics.add.overlap(this.player, this.bullets, this.onBulletHitPlayer, null, this);
    this.physics.add.collider(this.player, this.boss, () => {
      if (this.protectionActive && this.time.now < this.protectionUntil) return;
      this.handlePlayerHit("המפלצת הבוס תפסה אותך! 😢");
    }, null, this);
    this.physics.add.overlap(this.player, this.giftGroup, this.collectGift, null, this);

    this.nextPatternTime = this.time.now + 1200;
    this.nextGiftTime = this.time.now + this.giftSpawnInterval;

    this.protectionActive = true;
    this.protectionUntil = this.time.now + 6000;
    if (this.halo) this.halo.destroy();
    this.halo = this.add.circle(this.player.x, this.player.y, 28, 0x66ccff, 0.25);
    this.halo.setStrokeStyle(2, 0x99e0ff, 0.9).setBlendMode(Phaser.BlendModes.ADD);
  }

  updateLevel(time, delta) {
    if (time > this.nextPatternTime) {
      this.nextPatternTime = time + this.patternInterval;
      this.fireNextPattern();
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

    if (this.halo) {
      this.halo.setPosition(this.player.x, this.player.y);
    }
    
    const t = this.time.now;
    const offsetX = Math.sin(t * this.bossMoveSpeed) * this.bossMoveAmplitude;
    const offsetY = Math.cos(t * this.bossMoveSpeed * 0.8) * 20;
    this.boss.setPosition(this.bossBaseX + offsetX, this.bossBaseY + offsetY);
  }
  
  onBulletHitPlayer(player, bullet) {
    if (bullet.active) bullet.destroy();
    if (this.protectionActive && this.time.now < this.protectionUntil) return;
    this.handlePlayerHit("נפגעת מלייזר! 😢");
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
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.spawnBullet(this.boss.x, this.boss.y, Math.cos(angle), Math.sin(angle), speed);
    }
  }

  fireCross8(speed) {
    const dirs = [
      { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
      { x: Math.SQRT1_2, y: Math.SQRT1_2 }, { x: -Math.SQRT1_2, y: Math.SQRT1_2 },
      { x: Math.SQRT1_2, y: -Math.SQRT1_2 }, { x: -Math.SQRT1_2, y: -Math.SQRT1_2 }
    ];
    dirs.forEach(d => this.spawnBullet(this.boss.x, this.boss.y, d.x, d.y, speed));
  }

  fireSpiral(count, speed) {
    const step = Math.PI / 10;
    for (let i = 0; i < count; i++) {
      const a = this.spiralAngle + i * (Math.PI * 2 / count);
      this.spawnBullet(this.boss.x, this.boss.y, Math.cos(a), Math.sin(a), speed);
    }
    this.spiralAngle += step;
  }

  fireAimedBurst(count, speed) {
    let dx = this.player.x - this.boss.x;
    let dy = this.player.y - this.boss.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    this.spawnBullet(this.boss.x, this.boss.y, dx, dy, speed);
  }

  spawnBullet(x, y, dx, dy, speed) {
    const spawnX = x + dx * 30;
    const spawnY = y + dy * 30;
    const b = this.bullets.create(spawnX, spawnY, "bullet").setDisplaySize(16, 16);
    b.body.setAllowGravity(false);
    b.body.setSize(16, 16, true);
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
      if (this.isFloorTile(x, y)) {
        this.giftGroup.create(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, "gift").setDisplaySize(28, 28).refreshBody();
        placed = true;
      }
    }
    this.nextGiftTime = this.time.now + this.giftSpawnInterval;
  }

  collectGift(player, gift) {
    gift.disableBody(true, true);
    this.protectionActive = true;
    this.protectionUntil = this.time.now + 6000;
    if (this.halo) this.halo.destroy();
    this.halo = this.add.circle(this.player.x, this.player.y, 28, 0x66ccff, 0.25);
    this.halo.setStrokeStyle(2, 0x99e0ff, 0.9).setBlendMode(Phaser.BlendModes.ADD);
    this.nextGiftTime = this.time.now + this.giftSpawnInterval;
  }
}