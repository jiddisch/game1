export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    this.load.svg("player", "src/assets/ghost.svg", { width: 40, height: 40 });
    this.load.svg("monster", "src/assets/monster.svg", { width: 45, height: 45 });
    this.load.svg("monster2", "src/assets/monster2.svg", { width: 48, height: 48 });
    this.load.svg("door", "src/assets/door.svg", { width: 50, height: 70 });
    this.load.svg("key", "src/assets/key.svg", { width: 25, height: 25 });
    this.load.svg("wall", "src/assets/wall.svg", { width: 40, height: 40 });
    this.load.svg("hole", "src/assets/hole.svg", { width: 40, height: 40 });
    this.load.svg("ball", "src/assets/ball.svg", { width: 40, height: 40 });
    this.load.svg("coin", "src/assets/coin.svg", { width: 26, height: 26 });
    this.load.svg("monster_angry", "src/assets/monster-angry.svg", { width: 50, height: 50 });
    this.load.svg("ball_spiky", "src/assets/ball-spiky.svg", { width: 40, height: 40 });
    this.load.svg("monster4", "src/assets/monster4.svg", { width: 52, height: 52 });
    this.load.svg("bullet", "src/assets/bullet.svg", { width: 16, height: 16 });
    this.load.svg("gift", "src/assets/gift.svg", { width: 28, height: 28 });
    this.load.svg("heart", "src/assets/heart.svg", { width: 26, height: 26 });
    this.load.svg("heart-empty", "src/assets/heart-empty.svg", { width: 26, height: 26 });
    this.load.svg("summoner", "src/assets/monster-summoner.svg", { width: 56, height: 56 });
    this.load.svg("mini_monster", "src/assets/mini-monster.svg", { width: 28, height: 28 });
  }

  create() {
    this.scene.start("Level1");
  }
}