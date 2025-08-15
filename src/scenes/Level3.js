import { TILE_SIZE } from '../config.js';
import BaseLevelScene from './BaseLevelScene.js';

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

export default class Level3 extends BaseLevelScene {
  constructor() {
    super('Level3', {
      map: LEVEL3_MAP,
      level: 3,
      nextLevelKey: 'Level4'
    });

    this.monsterSpeed = 140;
    this.ballInterval = 1100;
    this.nextBallTime = 0;
    this.ballMax = 4;
    this.coinSpawnInterval = 10000;
    this.nextCoinTime = 0;
    this.coinMax = 5;

    this.ballsGroup = null;
    this.activeBalls = [];
    this.coinsGroup = null;
    this.coinTiles = new Set();
    this.nextMonsterPathCalc = 0;
    this.monsterTargetTile = null;
  }

  createLevel() {
    this.monster = this.physics.add.sprite(80, 80, "monster_angry").setDisplaySize(48, 48).setCollideWorldBounds(true);
    this.ballsGroup = this.physics.add.group();
    this.coinsGroup = this.physics.add.staticGroup();

    this.physics.add.collider(this.monster, this.borderWalls);
    this.physics.add.collider(this.monster, this.innerWalls);
    this.physics.add.collider(this.ballsGroup, this.borderWalls);
    this.physics.add.collider(this.ballsGroup, this.innerWalls);
    this.physics.add.collider(this.ballsGroup, this.monster);
    this.physics.add.collider(this.ballsGroup, this.ballsGroup);
    this.physics.add.collider(this.player, this.monster, () => this.handlePlayerHit("המפלצת תפסה אותך! 😢"), null, this);
    this.physics.add.overlap(this.player, this.ballsGroup, () => this.handlePlayerHit("נגעת בכדור! 😢"), null, this);
    this.physics.add.overlap(this.player, this.coinsGroup, this.collectCoin, null, this);

    this.easystar = new EasyStar.js();
    this.easystar.setGrid(this.map);
    this.easystar.setAcceptableTiles([0]);
    this.easystar.enableDiagonals();

    this.nextBallTime = this.time.now + this.ballInterval;
    this.nextCoinTime = this.time.now + this.coinSpawnInterval;
  }

  updateLevel(time, delta) {
    this.handleMonsterAI(time);

    if (time > this.nextBallTime) {
      this.nextBallTime = time + this.ballInterval;
      this.spawnRollingBall();
    }

    if (time > this.nextCoinTime) {
      this.nextCoinTime = time + this.coinSpawnInterval;
      if (this.coinsGroup.countActive(true) < this.coinMax) {
        this.spawnCoin();
      }
    }

    this.activeBalls.forEach(ball => {
      if (!ball || !ball.active || !ball.body) return;
      const speed = ball.body.velocity.length();
      const radiusPx = 20;
      const angPerSecDeg = (speed / radiusPx) * Phaser.Math.RAD_TO_DEG;
      const sign = ball.body.velocity.x >= 0 ? 1 : -1;
      ball.setAngularVelocity(sign * angPerSecDeg);
    });
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
      const dist = Math.hypot(dx, dy);
      if (dist < 2) {
        this.monster.setVelocity(0);
      } else {
        this.monster.setVelocity((dx / dist) * this.monsterSpeed, (dy / dist) * this.monsterSpeed);
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
      if (path && path.length > 1) {
        this.monsterTargetTile = path[1];
      } else {
        this.monsterTargetTile = null;
      }
    });
    this.easystar.calculate();
  }

  spawnRollingBall() {
    let dx = this.player.x - this.monster.x;
    let dy = this.player.y - this.monster.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    const jitter = 0.25;
    dx += Phaser.Math.FloatBetween(-jitter, jitter);
    dy += Phaser.Math.FloatBetween(-jitter, jitter);
    const nlen = Math.hypot(dx, dy) || 1;
    dx /= nlen;
    dy /= nlen;

    const spawnX = this.monster.x + dx * 24;
    const spawnY = this.monster.y + dy * 24;

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
      const oldBall = this.activeBalls.shift();
      if (oldBall && oldBall.active) oldBall.destroy();
    }

    this.time.delayedCall(800, () => {
      if (ball && ball.active) ball.setDrag(120, 120);
    });
    this.time.delayedCall(3200, () => {
      if (ball && ball.active) ball.destroy();
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

      this.coinsGroup.create(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, "coin").setSize(TILE_SIZE, TILE_SIZE).refreshBody();
      this.coinTiles.add(tkey);
      placed = true;
    }
  }
}