import { TILE_SIZE, TOTAL_KEYS } from '../config.js';
import BaseLevelScene from './BaseLevelScene.js';

const LEVEL10_MAP = [
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
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

export default class Level10 extends BaseLevelScene {
  constructor() {
    super('Level10', {
      map: LEVEL10_MAP,
      level: 10,
      nextLevelKey: null
    });

    this.boss = null;
    this.bossHP = 18;
    this.bossDead = false;

    this.bullets = null;
    this.bossBullets = null;
    this.minions = null;
    this.magazines = null;

    this.ammo = 0;
    this.ammoText = null;
    this.spaceKey = null;
    this.lastDirX = 1;
    this.lastDirY = 0;
    this.aimIndicator = null;

    this.easystar = null;

    this.bossPatternIndex = 0;
    this.nextBossActionTime = 0;
    this.bossActionInterval = 1300;

    this.controlsInvertedUntil = 0;
    this.nextMagazineAt = 0;
    this.magazineInterval = 15000;

    this.spiralAngle = 0;
    this.protectionActive = false;
    this.protectionUntil = 0;
    this.halo = null;
  }

  createLevel() {
    this.physics.add.collider(this.player, this.innerWalls);

    this.bullets = this.physics.add.group();
    this.bossBullets = this.physics.add.group();
    this.minions = this.physics.add.group();
    this.magazines = this.physics.add.staticGroup();

    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.ammoText = this.add.text(this.scale.width - 12, 48, 'כדורים: 0', { fontSize: '20px', fill: '#ffffff' }).setOrigin(1, 0).setScrollFactor(0).setDepth(1000);
    this.aimIndicator = this.add.image(this.player.x, this.player.y, 'bullet').setDisplaySize(14, 14).setAlpha(0.6).setDepth(900);

    const sideSpawn = this.findSideSpawnWorldPos();
    const spawnX = sideSpawn ? sideSpawn.x : this.worldWidth / 2;
    const spawnY = sideSpawn ? sideSpawn.y : this.worldHeight / 2;

    this.boss = this.physics.add.sprite(spawnX, spawnY, 'boss_colossus').setDisplaySize(220, 220).setCollideWorldBounds(true);
    this.boss.setImmovable(true);
    this.boss.setData('isBoss', true);
    this.boss.setData('hp', this.bossHP);

    this.physics.add.collider(this.boss, this.borderWalls);
    this.physics.add.collider(this.boss, this.innerWalls);
    this.physics.add.overlap(this.player, this.boss, () => this.handlePlayerHit('הבוס רמס אותך! 😱'));

    this.physics.add.collider(this.bullets, this.borderWalls, this.onBulletHitWall, null, this);
    this.physics.add.collider(this.bullets, this.innerWalls, this.onBulletHitWall, null, this);
    this.physics.add.collider(this.bossBullets, this.borderWalls, this.onBossBulletHitWall, null, this);
    this.physics.add.collider(this.bossBullets, this.innerWalls, this.onBossBulletHitWall, null, this);
    this.physics.add.overlap(this.player, this.bossBullets, this.onBossBulletHitPlayer, null, this);

    this.physics.add.collider(this.minions, this.borderWalls);
    this.physics.add.collider(this.minions, this.innerWalls);
    this.physics.add.overlap(this.player, this.minions, () => this.handlePlayerHit('בן של הבוס תפס אותך! 😵'), null, this);
    this.physics.add.overlap(this.bullets, this.minions, this.onPlayerBulletHitMinion, null, this);
    this.physics.add.overlap(this.bullets, this.boss, this.onPlayerBulletHitBoss, null, this);

    this.physics.add.overlap(this.player, this.magazines, this.collectMagazine, null, this);
    this.physics.add.collider(this.player, this.door, this.tryExit, null, this);

    this.easystar = new EasyStar.js();
    this.easystar.setGrid(this.map);
    this.easystar.setAcceptableTiles([0]);
    this.easystar.enableDiagonals();

    this.nextBossActionTime = this.time.now + 1200;

    this.protectionActive = true;
    this.protectionUntil = this.time.now + 4000;
    this.halo = this.add.circle(this.boss.x, this.boss.y, 48, 0x66ccff, 0.25);
    this.halo.setStrokeStyle(4, 0x99e0ff, 0.9).setBlendMode(Phaser.BlendModes.ADD);

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

    if (!this.bossDead && this.boss && this.boss.active) {
      if (time >= this.nextBossActionTime) {
        this.nextBossActionTime = time + this.bossActionInterval;
        this.performBossAction();
      }
    }

    this.updateMinionsAI(time);

    if (this.protectionActive && time > this.protectionUntil) {
      this.protectionActive = false;
      if (this.halo) {
        this.halo.destroy();
        this.halo = null;
      }
    }

    if (this.halo) {
      this.halo.setPosition(this.boss.x, this.boss.y);
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

  onBossBulletHitWall(bullet) {
    if (bullet && bullet.active) bullet.destroy();
  }

  onBossBulletHitPlayer(player, bullet) {
    if (bullet && bullet.active) bullet.destroy();
    this.handlePlayerHit('נפגעת מהתקפת הבוס! 😢');
  }

  onPlayerBulletHitBoss(bullet, boss) {
    if (!bullet || !boss) return;
    if (!bullet.active || bullet.getData('hitProcessed')) return;
    bullet.setData('hitProcessed', true);
    bullet.destroy();

    let hp = Number(boss.getData('hp'));
    if (!Number.isFinite(hp)) hp = this.bossHP;
    hp = Math.max(0, hp - 1);
    boss.setData('hp', hp);

    if (boss.active) {
      boss.setTintFill(0xff8888);
      this.time.delayedCall(80, () => {
        if (boss && boss.active) boss.clearTint();
      });
    }

    if (hp <= 0) {
      this.bossDead = true;
      if (boss.body) boss.setVelocity(0, 0);
      boss.disableBody(true, true);
      this.tryUnlockDoorIfReady();
    }
  }

  performBossAction() {
    const idx = this.bossPatternIndex % 3;
    if (idx === 0) {
      this.roarAndFear();
    } else if (idx === 1) {
      this.fireRadial(24, 300);
    } else {
      this.fireAimedBurst(5, 380);
    }
    this.bossPatternIndex++;
  }

  roarAndFear() {
    this.cameras.main.shake(450, 0.008);
    this.fireRadial(20, 280);
    this.spawnSons();
  }

  fireRadial(count, speed) {
    if (!this.boss) return;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.spawnBossBullet(this.boss.x, this.boss.y, Math.cos(angle), Math.sin(angle), speed);
    }
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
    const spawnX = x + dx * 40;
    const spawnY = y + dy * 40;
    const b = this.bossBullets.create(spawnX, spawnY, "bullet").setDisplaySize(16, 16);
    b.body.setAllowGravity(false);
    b.body.setSize(16, 16, true);
    b.setVelocity(dx * speed, dy * speed);
    b.setAngle(Phaser.Math.RadToDeg(Math.atan2(dy, dx)));
    this.time.delayedCall(2600, () => {
      if (b && b.active) b.destroy();
    });
  }

  spawnSons() {
    const maxActive = 6;
    if (this.minions.countActive(true) >= maxActive) return;
    const around = [
      { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 }
    ];
    around.forEach(pos => {
      if (this.minions.countActive(true) < maxActive) this.spawnMinionVariant(pos);
    });
  }

  spawnMinionVariant(pos) {
    const ox = this.boss? this.boss.x : this.worldWidth / 2;
    const oy = this.boss? this.boss.y : this.worldHeight / 2;
    const x = ox + pos.dx * 120;
    const y = oy + pos.dy * 120;
    const existing = this.minions.getChildren().length;
    const typeIdx = existing % 4;
    if (typeIdx === 0) this.spawnMinion('ogre', x, y, 'monster_angry', 0x44aa44, 70, 6, 56);
    else if (typeIdx === 1) this.spawnMinion('sponge', x, y, 'monster2', 0xffe066, 100, 4, 48);
    else if (typeIdx === 2) this.spawnMinion('blueclan', x, y, 'mini_monster', 0x66aaff, 120, 3, 30);
    else this.spawnMinion('plantzed', x, y, 'monster', 0x66cc66, 85, 4, 48);
  }

  spawnMinion(type, x, y, key, tint, speed, hp, size) {
    const m = this.minions.create(x, y, key).setDisplaySize(size, size).setCollideWorldBounds(true).setTint(tint);
    m.setData('type', type);
    m.setData('hp', hp);
    m.setData('speed', speed);
    m.setData('targetTile', null);
    m.setData('nextPathTime', 0);
  }

  updateMinionsAI(time) {
    const arr = this.minions.getChildren();
    for (let i = 0; i < arr.length; i++) {
      const m = arr[i];
      if (!m.active) continue;
      const nextTime = Number(m.getData('nextPathTime')) || 0;
      if (time >= nextTime) {
        const from = this.getTileFromWorld(m.x, m.y);
        const to = this.getTileFromWorld(this.player.x, this.player.y);
        this.easystar.findPath(from.x, from.y, to.x, to.y, (path) => {
          if (!m ||!m.active) return;
          m.setData('targetTile', path && path.length > 1? path[1] : null);
        });
        this.easystar.calculate();
        m.setData('nextPathTime', time + 90);
      }
      const target = m.getData('targetTile');
      if (target) {
        const tx = target.x * TILE_SIZE + TILE_SIZE / 2;
        const ty = target.y * TILE_SIZE + TILE_SIZE / 2;
        const speed = Number(m.getData('speed')) || 90;
        this.physics.moveTo(m, tx, ty, speed);
      } else {
        m.setVelocity(0, 0);
      }
    }
  }

  onPlayerBulletHitMinion(bullet, minion) {
    if (!bullet ||!minion) return;
    if (!bullet.active || bullet.getData('hitProcessed')) return;
    bullet.setData('hitProcessed', true);
    bullet.destroy();

    let hp = Number(minion.getData('hp'));
    if (!Number.isFinite(hp)) hp = 1;
    hp = Math.max(0, hp - 1);
    minion.setData('hp', hp);

    if (minion.active) {
      minion.setTintFill(0xffffff);
      this.time.delayedCall(80, () => {
        if (minion && minion.active) minion.clearTint();
      });
    }

    if (hp <= 0) {
      minion.disableBody(true, true);
    }
  }

  collectMagazine(player, mag) {
    mag.disableBody(true, true);
    this.ammo += 25;
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

  unlockDoor() {
    if (!this.doorLocked && this.door) return;
    const bossDead =!this.boss ||!this.boss.active;
    if (this.keysCollected >= TOTAL_KEYS && bossDead) {
      this.doorLocked = false;
      if (this.door) this.door.setTint(0x00ff00);
    }
  }

  tryUnlockDoorIfReady() {
    this.unlockDoor();
  }

  tryExit() {
    this.unlockDoor();
    const bossDead =!this.boss ||!this.boss.active;
    if (this.keysCollected < TOTAL_KEYS ||!bossDead || this.doorLocked) {
      this.showLockedDoorMessage();
      return;
    }
    this.winByEscaping();
  }

  showLockedDoorMessage() {
    if (this.lockedDoorMessage && this.lockedDoorMessage.active) return;
    const needKeys = this.keysCollected < TOTAL_KEYS;
    const bossDead =!this.boss ||!this.boss.active;
    const needBoss =!bossDead;
    let parts = [];
    if (needKeys) parts.push('מצא את כל המפתחות');
    if (needBoss) parts.push('הרוג את הבוס הענק');
    const msg = parts.length? `הדלת נעולה! ${parts.join(' וגם ')}.` : 'הדלת נעולה!';
    this.lockedDoorMessage = this.add.text(this.door.x, this.door.y - 50, msg, { fontSize: '16px', fill: '#ff4444', backgroundColor: '#000a' }).setOrigin(0.5);
    this.time.delayedCall(2000, () => { if (this.lockedDoorMessage) this.lockedDoorMessage.destroy() });
  }

  findSideSpawnWorldPos() {
    const leftX = 1;
    const rightX = this.map[0].length - 2;
    const yCenter = Math.floor(this.map.length / 2);
    const cols = [leftX, rightX];
    const minDist = 200;
    for (const col of cols) {
      for (let off = 0; off < this.map.length; off++) {
        const candidates = [yCenter + off, yCenter - off];
        for (const y of candidates) {
          if (y <= 0 || y >= this.map.length - 1) continue;
          if (this.map[y][col]!== 0) continue;
          const wx = col * TILE_SIZE + TILE_SIZE / 2;
          const wy = y * TILE_SIZE + TILE_SIZE / 2;
          if (this.boss) {
            const dx = wx - this.boss.x;
            const dy = wy - this.boss.y;
            if (Math.hypot(dx, dy) < minDist) continue;
          }
          return { x: wx, y: wy };
        }
      }
    }
    const pos = this.getRandomFloorTile();
    if (!pos) return { x: TILE_SIZE * 1.5, y: TILE_SIZE * 1.5 };
    return { x: pos.x * TILE_SIZE + TILE_SIZE / 2, y: pos.y * TILE_SIZE + TILE_SIZE / 2 };
  }
}