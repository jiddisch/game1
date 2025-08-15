import { TILE_SIZE } from '../config.js';
import BaseLevelScene from './BaseLevelScene.js';

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

export default class Level4 extends BaseLevelScene {
  constructor() {
    super('Level4', {
      map: LEVEL4_MAP,
      level: 4,
      nextLevelKey: 'Level5'
    });

    this.monsterBaseSpeed = 120;
    this.monsterChaseSpeed = 165;
    this.nextPathCalc = 0;
    this.targetTile = null;
    this.losInterval = 1200;
    this.nextLOSCheck = 0;
    this.alertUntil = 0;
    this.bulletInterval = 900;
    this.nextBulletTime = 0;
    this.coinSpawnInterval = 10000;
    this.nextCoinTime = 0;
    this.coinMax = 4;
    this.giftSpawnInterval = 20000;
    this.nextGiftTime = 0;

    this.bullets = null;
    this.coinsGroup = null;
    this.coinTiles = new Set();
    this.giftGroup = null;
    this.protectionActive = false;
    this.protectionUntil = 0;
    this.halo = null;
  }

  createLevel() {
    this.monster = this.physics.add.sprite(80, 80, "monster4").setDisplaySize(52, 52).setCollideWorldBounds(true);
    this.bullets = this.physics.add.group();
    this.giftGroup = this.physics.add.staticGroup();
    this.coinsGroup = this.physics.add.staticGroup();

    this.physics.add.collider(this.monster, this.borderWalls);
    this.physics.add.collider(this.monster, this.innerWalls);
    this.physics.add.collider(this.player, this.monster, () => this.handlePlayerHit("המפלצת תפסה אותך! 😢"), null, this);
    this.physics.add.collider(this.bullets, this.borderWalls, (b) => b.destroy());
    this.physics.add.collider(this.bullets, this.innerWalls, (b) => b.destroy());
    this.physics.add.overlap(this.player, this.bullets, this.onBulletHitPlayer, null, this);
    this.physics.add.overlap(this.player, this.giftGroup, this.collectGift, null, this);
    this.physics.add.overlap(this.player, this.coinsGroup, this.collectCoin, null, this);

    this.easystar = new EasyStar.js();
    this.easystar.setGrid(this.map);
    this.easystar.setAcceptableTiles([0]);
    this.easystar.enableDiagonals();

    this.nextCoinTime = this.time.now + this.coinSpawnInterval;
    this.nextGiftTime = this.time.now + this.giftSpawnInterval;
  }

  updateLevel(time, delta) {
    this.handleMonsterAI(time);

    if (this.isAlert(time) && time > this.nextBulletTime) {
      this.nextBulletTime = time + this.bulletInterval;
      this.fireBulletAtPlayer();
    }

    if (time > this.nextCoinTime) {
      this.nextCoinTime = time + this.coinSpawnInterval;
      if (this.coinsGroup.countActive(true) < this.coinMax) {
        this.spawnCoin();
      }
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
  }

  isAlert(time) {
    return time < this.alertUntil;
  }

  handleMonsterAI(time) {
    if (time > this.nextLOSCheck) {
      this.nextLOSCheck = time + this.losInterval;
      if (this.hasLineOfSight(this.monster.x, this.monster.y, this.player.x, this.player.y)) {
        this.alertUntil = time + Phaser.Math.Between(3000, 5000);
        this.monster.setTint(0xff6666);
      }
    }
    if (!this.isAlert(time)) {
      this.monster.clearTint();
    }

    const recalcInterval = this.isAlert(time) ? 90 : 250;
    if (time > this.nextPathCalc) {
      this.nextPathCalc = time + recalcInterval;
      this.findMonsterPath();
    }

    if (this.targetTile) {
      const { x, y } = this.targetTile;
      const targetPx = x * TILE_SIZE + TILE_SIZE / 2;
      const targetPy = y * TILE_SIZE + TILE_SIZE / 2;
      const speed = this.isAlert(time) ? this.monsterChaseSpeed : this.monsterBaseSpeed;
      this.physics.moveTo(this.monster, targetPx, targetPy, speed);
    } else {
      this.monster.setVelocity(0);
    }
  }

  findMonsterPath() {
    const from = this.getTileFromWorld(this.monster.x, this.monster.y);
    const to = this.isAlert(this.time.now) ? this.getTileFromWorld(this.player.x, this.player.y) : this.pickWanderTarget(from);

    if (from.x === to.x && from.y === to.y) {
        this.targetTile = null;
        return;
    }

    this.easystar.findPath(from.x, from.y, to.x, to.y, (path) => {
        this.targetTile = (path && path.length > 1) ? path[1] : null;
    });
    this.easystar.calculate();
  }
  
  pickWanderTarget(fromTile) {
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(Math.max(1, fromTile.x - 4), Math.min(this.map[0].length - 2, fromTile.x + 4));
      const y = Phaser.Math.Between(Math.max(1, fromTile.y - 4), Math.min(this.map.length - 2, fromTile.y + 4));
      if (this.isFloorTile(x, y)) return { x, y };
    }
    return fromTile;
  }

  hasLineOfSight(x0, y0, x1, y1) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / (TILE_SIZE / 2);
    const dx = (x1 - x0) / steps;
    const dy = (y1 - y0) / steps;
    for (let i = 0; i <= steps; i++) {
      const t = this.getTileFromWorld(x0 + dx * i, y0 + dy * i);
      if (this.map[t.y]?.[t.x] === 1) return false;
    }
    return true;
  }

  onBulletHitPlayer(player, bullet) {
    if (bullet.active) bullet.destroy();
    if (this.protectionActive && this.time.now < this.protectionUntil) return;
    this.handlePlayerHit("נפגעת מירייה! 😢");
  }

  fireBulletAtPlayer() {
    let dx = this.player.x - this.monster.x;
    let dy = this.player.y - this.monster.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    const spawnX = this.monster.x + dx * 28;
    const spawnY = this.monster.y + dy * 28;

    const bullet = this.bullets.create(spawnX, spawnY, "bullet").setDisplaySize(16, 16);
    bullet.setDepth(1).body.setAllowGravity(false);
    bullet.setVelocity(dx * 420, dy * 420).setAngle(Phaser.Math.RadToDeg(Math.atan2(dy, dx)));

    this.time.delayedCall(2200, () => {
      if (bullet.active) bullet.destroy();
    });
  }

  collectCoin(player, coin) {
    const tx = Math.floor(coin.x / TILE_SIZE);
    const ty = Math.floor(coin.y / TILE_SIZE);
    const tkey = `${tx},${ty}`;
    coin.disableBody(true, true);
    if (this.coinTiles.has(tkey)) {
      this.coinTiles.delete(tkey);
    }
    this.coins += 10;
    this.registry.set("coins", this.coins);
    this.events.emit('update-hud', { coins: this.coins });
  }

  spawnCoin() {
    let placed = false;
    for (let i = 0; i < 40 && !placed; i++) {
      const x = Phaser.Math.Between(1, this.map[0].length - 2);
      const y = Phaser.Math.Between(1, this.map.length - 2);
      if (!this.isFloorTile(x, y)) continue;

      const tkey = `${x},${y}`;
      if (this.coinTiles.has(tkey)) continue;

      this.coinsGroup.create(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, "coin").setSize(TILE_SIZE, TILE_SIZE).refreshBody();
      this.coinTiles.add(tkey);
      placed = true;
    }
  }

  collectGift(player, gift) {
    gift.disableBody(true, true);
    this.protectionActive = true;
    this.protectionUntil = this.time.now + 5000;
    if (this.halo) this.halo.destroy();
    this.halo = this.add.circle(this.player.x, this.player.y, 28, 0x66ccff, 0.25);
    this.halo.setStrokeStyle(2, 0x99e0ff, 0.9).setBlendMode(Phaser.BlendModes.ADD);
    this.nextGiftTime = this.time.now + this.giftSpawnInterval;
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
}