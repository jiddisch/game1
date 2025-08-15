import { LEVEL_MAP, TILE_SIZE } from '../config.js';
import BaseLevelScene from './BaseLevelScene.js';

export default class Level2 extends BaseLevelScene {
  constructor() {
    super('Level2', {
      map: LEVEL_MAP,
      level: 2,
      nextLevelKey: 'Level3'
    });

    this.monsterSpeed = 135;
    this.ballInterval = 1200;
    this.nextBallTime = 0;
    this.ballMax = 2;
    this.coinSpawnInterval = 10000;
    this.nextCoinTime = 0;
    this.coinMax = 5;

    this.ballsGroup = null;
    this.ballTiles = new Set();
    this.ballsQueue = [];
    this.coinsGroup = null;
    this.coinTiles = new Set();
    this.nextMonsterPathCalc = 0;
    this.monsterTargetTile = null;
  }

  createLevel() {
    this.monster = this.physics.add.sprite(80, 80, "monster2").setDisplaySize(48, 48).setCollideWorldBounds(true);
    this.ballsGroup = this.physics.add.staticGroup();
    this.coinsGroup = this.physics.add.staticGroup();

    this.physics.add.collider(this.monster, this.borderWalls);
    this.physics.add.collider(this.monster, this.innerWalls);
    this.physics.add.collider(this.monster, this.ballsGroup);
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
      this.spawnBallNearMonster();
    }

    if (time > this.nextCoinTime) {
      this.nextCoinTime = time + this.coinSpawnInterval;
      if (this.coinsGroup.countActive(true) < this.coinMax) {
        this.spawnCoin();
      }
    }
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

  spawnBallNearMonster() {
    const m = this.getTileFromWorld(this.monster.x, this.monster.y);
    const offsets = [];
    for (let r = 1; r <= 2; r++) {
      offsets.push({ x: r, y: 0 }, { x: -r, y: 0 }, { x: 0, y: r }, { x: 0, y: -r }, { x: r, y: r }, { x: -r, y: r }, { x: r, y: -r }, { x: -r, y: -r });
    }
    Phaser.Utils.Array.Shuffle(offsets);
    for (const o of offsets) {
      const x = m.x + o.x;
      const y = m.y + o.y;
      if (!this.isFloorTile(x, y)) continue;
      const key = `${x},${y}`;
      if (this.ballTiles.has(key)) continue;

      if (this.ballsQueue.length >= this.ballMax) {
        const old = this.ballsQueue.shift();
        if (old && old.sprite) old.sprite.destroy();
        if (old) this.ballTiles.delete(old.key);
      }

      const sprite = this.ballsGroup.create(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, "ball").setSize(TILE_SIZE, TILE_SIZE).refreshBody();
      this.ballTiles.add(key);
      this.ballsQueue.push({ x, y, sprite, key });
      break;
    }
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
      if (this.coinTiles.has(tkey) || this.ballTiles.has(tkey)) continue;

      this.coinsGroup.create(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, "coin").setSize(TILE_SIZE, TILE_SIZE).refreshBody();
      this.coinTiles.add(tkey);
      placed = true;
    }
  }
}