export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    this.load.svg("player", "src/assets/ghost.svg", { width: 40, height: 40 });
    this.load.svg("monster", "src/assets/monster.svg", { width: 45, height: 45 });
    this.load.svg("door", "src/assets/door.svg", { width: 50, height: 70 });
    this.load.svg("key", "src/assets/key.svg", { width: 25, height: 25 });
    this.makeRectTexture("wall", 40, 40, 0x555555);
  }

  create() {
    this.scene.start("GameScene");
  }

  makeRectTexture(key, w, h, colour) {
    const gfx = this.make.graphics({ x: 0, y: 0, add: false });
    gfx.fillStyle(colour, 1);
    gfx.fillRect(0, 0, w, h);
    gfx.generateTexture(key, w, h);
    gfx.destroy();
  }
}