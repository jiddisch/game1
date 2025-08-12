// src/scenes/Level7.js
import { TILE_SIZE } from '../config.js';
import BaseLevelScene from './BaseLevelScene.js';

const LEVEL7_MAP = [
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

export default class Level7 extends BaseLevelScene {
  constructor() {
    super('Level7', {
      map: LEVEL7_MAP,
      level: 7,
      nextLevelKey: 'Level8'
    });

    this.monster = null;
    this.easystar = null;

    this.nextPathTime = 0;
    this.pathInterval = 80;

    this.baseSpeed = 140;
    this.boostSpeed = 200;
    this.dashSpeed = 320;

    this.inDeadEnd = false;
    this.nextDeadEndCheck = 0;
    this.deadEndInterval = 150;

    this.nextDashRoll = 0;
    this.dashRollInterval = 400;
    this.dashActiveUntil = 0;
    this.dashChance = 0.65;
  }

  createLevel() {
    this.monster = this.physics.add.sprite(80, 80, 'monster').setDisplaySize(45, 45).setCollideWorldBounds(true);
    this.monster.setData({ speed: this.baseSpeed, targetTile: null, nextPath: 0 });

    this.physics.add.collider(this.monster, this.borderWalls);
    this.physics.add.collider(this.monster, this.innerWalls);
    this.physics.add.overlap(this.player, this.monster, () => this.handlePlayerHit('המפלצת תפסה אותך! 😢'));

    this.physics.add.collider(this.player, this.innerWalls);

    this.easystar = new EasyStar.js();
    this.easystar.setGrid(this.map);
    this.easystar.setAcceptableTiles([0]);
    this.easystar.enableDiagonals();
  }

  updateLevel(time, delta) {
    if (time >= this.nextDeadEndCheck) {
      this.nextDeadEndCheck = time + this.deadEndInterval;
      this.inDeadEnd = this.isPlayerInDeadEnd();
    }

    if (this.inDeadEnd) {
      this.monster.setData('speed', this.boostSpeed);
      if (time >= this.nextDashRoll) {
        this.nextDashRoll = time + this.dashRollInterval;
        if (Math.random() < this.dashChance) {
          this.dashActiveUntil = time + 900;
        }
      }
    } else {
      this.monster.setData('speed', this.baseSpeed);
    }

    const nextPath = this.monster.getData('nextPath') || 0;
    if (time >= nextPath) {
      this.monster.setData('nextPath', time + this.pathInterval);
      this.findPathForMonster();
    }

    this.moveMonster(time);
  }

  findPathForMonster() {
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

  moveMonster(time) {
    if (!this.monster || !this.monster.body) return;
    const target = this.monster.getData('targetTile');
    if (!target) {
      this.monster.setVelocity(0, 0);
      return;
    }
    const targetPx = target.x * TILE_SIZE + TILE_SIZE / 2;
    const targetPy = target.y * TILE_SIZE + TILE_SIZE / 2;
    let speed = this.monster.getData('speed') || this.baseSpeed;
    if (time < this.dashActiveUntil) speed = this.dashSpeed;
    this.physics.moveTo(this.monster, targetPx, targetPy, speed);
  }

  isPlayerInDeadEnd() {
    const t = this.getTileFromWorld(this.player.x, this.player.y);
    if (!this.isWalkable(t.x, t.y)) return false;
    const neighbors = [
      { x: t.x + 1, y: t.y },
      { x: t.x - 1, y: t.y },
      { x: t.x, y: t.y + 1 },
      { x: t.x, y: t.y - 1 }
    ];
    let open = 0;
    for (const n of neighbors) {
      if (this.isWalkable(n.x, n.y)) open++;
    }
    return open <= 1;
  }

  isWalkable(x, y) {
    return y >= 0 && y < this.map.length && x >= 0 && x < this.map[y].length && this.map[y][x] === 0;
  }
}