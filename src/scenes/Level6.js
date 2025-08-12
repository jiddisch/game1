import { TILE_SIZE } from '../config.js';
import BaseLevelScene from './BaseLevelScene.js';

const LEVEL6_MAP = [
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

export default class Level6 extends BaseLevelScene {
  constructor() {
    super('Level6', {
      map: LEVEL6_MAP,
      level: 6,
      nextLevelKey: 'Level7'
    });

    this.summoner = null;
    this.miniMonsters = null;
    this.easystar = null;

    this.nextSummonTime = 0;
    this.summonInterval = 5000;
    this.maxMiniCount = 10;
  }

  createLevel() {
    const centerX = this.worldWidth / 2;
    const centerY = this.worldHeight / 2;

    this.summoner = this.physics.add.sprite(centerX, centerY - 120, 'summoner').setDisplaySize(56, 56).setCollideWorldBounds(true);
    this.summoner.setImmovable(true).setData({ speed: 110, nextPath: 0, targetTile: null });

    this.player.setPosition(centerX, this.worldHeight - 80);

    this.miniMonsters = this.physics.add.group();

    this.physics.add.collider(this.summoner, this.borderWalls);
    this.physics.add.collider(this.summoner, this.innerWalls);
    this.physics.add.collider(this.miniMonsters, this.borderWalls);
    this.physics.add.collider(this.miniMonsters, this.innerWalls);
    this.physics.add.collider(this.miniMonsters, this.summoner);
    this.physics.add.collider(this.miniMonsters, this.miniMonsters);

    this.physics.add.overlap(this.player, this.summoner, () => this.handlePlayerHit('המזמן תפס אותך! 😢'));
    this.physics.add.overlap(this.player, this.miniMonsters, this.handleMiniOverlap, null, this);
    
    this.easystar = new EasyStar.js();
    this.easystar.setGrid(this.map);
    this.easystar.setAcceptableTiles([0]);
    this.easystar.enableDiagonals();

    this.nextSummonTime = this.time.now + this.summonInterval;
  }

  updateLevel(time, delta) {
    if (time > this.nextSummonTime) {
      this.nextSummonTime = time + this.summonInterval;
      if (this.miniMonsters.countActive(true) < this.maxMiniCount) {
        this.spawnMini();
      }
    }

    this.updateSummonerAI(time);
    this.updateMiniMonstersAI(time);
  }

  updateSummonerAI(time) {
    const nextPathTime = this.summoner.getData('nextPath') || 0;
    if (time >= nextPathTime) {
      this.summoner.setData('nextPath', time + 120);
      this.findPathFor(this.summoner);
    }
    this.moveSpriteOnPath(this.summoner);
  }

  updateMiniMonstersAI(time) {
    this.miniMonsters.getChildren().forEach((mini, index) => {
      const nextPathTime = mini.getData('nextPath') || 0;
      if (time >= nextPathTime) {
        mini.setData('nextPath', time + 100 + (index % 4) * 20);
        this.findPathFor(mini);
      }
      this.moveSpriteOnPath(mini);
    });
  }

  findPathFor(sprite) {
    const from = this.getTileFromWorld(sprite.x, sprite.y);
    const to = this.getTileFromWorld(this.player.x, this.player.y);

    if (from.x === to.x && from.y === to.y) {
      sprite.setData('targetTile', null);
      return;
    }
    this.easystar.findPath(from.x, from.y, to.x, to.y, (path) => {
      sprite.setData('targetTile', (path && path.length > 1) ? path[1] : null);
    });
    this.easystar.calculate();
  }

  moveSpriteOnPath(sprite) {
    const target = sprite.getData('targetTile');
    if (target) {
      const targetPx = target.x * TILE_SIZE + TILE_SIZE / 2;
      const targetPy = target.y * TILE_SIZE + TILE_SIZE / 2;
      const speed = sprite.getData('speed') || 100;
      this.physics.moveTo(sprite, targetPx, targetPy, speed);
    } else {
      sprite.setVelocity(0, 0);
    }
  }

  handleMiniOverlap(player, mini) {
    const protectedUntil = mini.getData('spawnProtectedUntil') || 0;
    if (this.time.now < protectedUntil) return;
    this.handlePlayerHit('המיני-מפלצת תפסה אותך! 😢');
  }

  spawnMini() {
    const sTile = this.getTileFromWorld(this.summoner.x, this.summoner.y);
    const offsets = [
      { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
      { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }
    ];
    let spawnTile = null;
    for (const o of offsets) {
      const tx = sTile.x + o.x;
      const ty = sTile.y + o.y;
      if (this.isFloorTile(tx, ty)) {
        spawnTile = { x: tx, y: ty };
        break;
      }
    }
    if (!spawnTile) spawnTile = { x: sTile.x, y: sTile.y };

    const spawnX = spawnTile.x * TILE_SIZE + TILE_SIZE / 2;
    const spawnY = spawnTile.y * TILE_SIZE + TILE_SIZE / 2;

    const mini = this.miniMonsters.create(spawnX, spawnY, 'mini_monster').setDisplaySize(28, 28).setCollideWorldBounds(true);
    mini.body.setAllowGravity(false);
    mini.setData({ speed: 150, nextPath: 0, targetTile: null, spawnProtectedUntil: this.time.now + 500 }).setDepth(1);
  }
}