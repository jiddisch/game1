(function () {
  class Game3D {
    constructor() {
      this.container = document.getElementById('game-container');
      this.keysEl = document.getElementById('keys-pill');
      this.toastEl = document.getElementById('toast');
      this.overlayEl = document.getElementById('overlay');
      this.scene = new THREE.Scene();
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setPixelRatio(window.devicePixelRatio || 1);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.shadowMap.enabled = true;
      this.container.appendChild(this.renderer.domElement);
      this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
      this.clock = new THREE.Clock();
      this.keys = {};
      this.dragging = false;
      this.lastX = 0;
      this.tileSize = 1;
      this.wallHeight = 1.6;
      this.playerRadius = 0.3;
      this.yaw = 0;
      this.map = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ];
      this.mapW = this.map[0].length;
      this.mapH = this.map.length;
      this.player = null;
      this.playerPos = new THREE.Vector3(2.5, 0, 2.5);
      this.running = true;
      this.keysCollected = 0;
      this.totalKeys = 3;
      this.keyMeshes = [];
      this.keyTiles = [{ x: 2, z: 10 }, { x: 10, z: 4 }, { x: 16, z: 12 }];
      this.doorLocked = true;
      this.doorMesh = null;
      this.doorTile = { x: 18, z: 1 };
      this.toastTimer = 0;
      this.monster = null;
      this.monsterPos = new THREE.Vector3(5.5, 0, 5.5);
      this.monsterRadius = 0.32;
      this.monsterSpeed = 2.2;
    }
    start() {
      this.initLights();
      this.buildLevel();
      this.buildPlayer();
      this.buildMonster();
      this.buildKeysAndDoor();
      this.initInput();
      this.onResize();
      window.addEventListener('resize', () => this.onResize());
      this.updateKeysHUD();
      this.loop();
    }
    initLights() {
      const amb = new THREE.AmbientLight(0x404040, 1.2);
      this.scene.add(amb);
      const hemi = new THREE.HemisphereLight(0x9ec9ff, 0x2a2f3a, 0.4);
      this.scene.add(hemi);
      const dir = new THREE.DirectionalLight(0xffffff, 1.0);
      dir.position.set(6, 8, 6);
      dir.castShadow = true;
      dir.shadow.mapSize.set(1024, 1024);
      dir.shadow.camera.near = 0.5;
      dir.shadow.camera.far = 30;
      this.scene.add(dir);
    }
    buildLevel() {
      const floorGeo = new THREE.PlaneGeometry(this.mapW, this.mapH);
      const floorMat = new THREE.MeshStandardMaterial({ color: 0x222831, roughness: 0.95, metalness: 0.0 });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(this.mapW / 2, 0, this.mapH / 2);
      floor.receiveShadow = true;
      this.scene.add(floor);
      const wallCount = this.map.flat().filter(v => v === 1).length;
      const wallGeo = new THREE.BoxGeometry(1, this.wallHeight, 1);
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x596177, roughness: 0.7, metalness: 0.05 });
      const walls = new THREE.InstancedMesh(wallGeo, wallMat, wallCount);
      walls.castShadow = true;
      let i = 0;
      const m = new THREE.Matrix4();
      for (let z = 0; z < this.mapH; z++) {
        for (let x = 0; x < this.mapW; x++) {
          if (this.map[z][x] !== 1) continue;
          m.makeTranslation(x + 0.5, this.wallHeight / 2, z + 0.5);
          walls.setMatrixAt(i++, m);
        }
      }
      this.scene.add(walls);
    }
    buildPlayer() {
      const g = new THREE.Group();
      const head = new THREE.SphereGeometry(this.playerRadius * 0.95, 24, 24);
      const body = new THREE.CylinderGeometry(this.playerRadius * 0.75, this.playerRadius * 0.9, this.playerRadius * 1.6, 16, 1, true);
      const mat = new THREE.MeshStandardMaterial({ color: 0xbdf2ff, roughness: 0.2, metalness: 0.0, transparent: true, opacity: 0.9, emissive: 0x113344, emissiveIntensity: 0.35 });
      const mHead = new THREE.Mesh(head, mat);
      const mBody = new THREE.Mesh(body, mat);
      mHead.castShadow = true;
      mBody.castShadow = true;
      mHead.position.y = this.playerRadius * 1.25;
      mBody.position.y = this.playerRadius * 0.3;
      const eyeGeo = new THREE.SphereGeometry(this.playerRadius * 0.18, 12, 12);
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0, metalness: 0.0 });
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
      const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
      eyeL.position.set(-this.playerRadius * 0.32, this.playerRadius * 1.35, this.playerRadius * 0.75);
      eyeR.position.set(this.playerRadius * 0.32, this.playerRadius * 1.35, this.playerRadius * 0.75);
      g.add(mHead);
      g.add(mBody);
      g.add(eyeL);
      g.add(eyeR);
      this.player = g;
      this.playerPos.y = this.playerRadius;
      this.player.position.copy(this.playerPos);
      this.scene.add(this.player);
      this.yaw = 0;
      this.camera.position.set(this.playerPos.x - 3, this.playerPos.y + 2, this.playerPos.z + 3);
      this.camera.lookAt(this.playerPos.x, this.playerPos.y + 0.8, this.playerPos.z);
    }
    buildMonster() {
      const g = new THREE.Group();
      const bodyGeo = new THREE.SphereGeometry(this.monsterRadius * 1.15, 24, 24);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x9d0000, roughness: 0.5, metalness: 0.2, emissive: 0x220000, emissiveIntensity: 0.45 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.castShadow = true;
      const coneGeo = new THREE.ConeGeometry(this.monsterRadius * 0.35, this.monsterRadius * 0.7, 12);
      const coneMat = new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.4, metalness: 0.3 });
      const hornL = new THREE.Mesh(coneGeo, coneMat);
      const hornR = new THREE.Mesh(coneGeo, coneMat);
      hornL.castShadow = true;
      hornR.castShadow = true;
      hornL.position.set(-this.monsterRadius * 0.45, this.monsterRadius * 1.0, 0);
      hornR.position.set(this.monsterRadius * 0.45, this.monsterRadius * 1.0, 0);
      hornL.rotation.x = -Math.PI / 8;
      hornR.rotation.x = -Math.PI / 8;
      const fangGeo = new THREE.ConeGeometry(this.monsterRadius * 0.12, this.monsterRadius * 0.25, 8);
      const fangMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.0 });
      const fangL = new THREE.Mesh(fangGeo, fangMat);
      const fangR = new THREE.Mesh(fangGeo, fangMat);
      fangL.castShadow = true;
      fangR.castShadow = true;
      fangL.position.set(-this.monsterRadius * 0.18, -this.monsterRadius * 0.15, this.monsterRadius * 0.95);
      fangR.position.set(this.monsterRadius * 0.18, -this.monsterRadius * 0.15, this.monsterRadius * 0.95);
      fangL.rotation.x = Math.PI;
      fangR.rotation.x = Math.PI;
      const eyeGeo = new THREE.SphereGeometry(this.monsterRadius * 0.16, 12, 12);
      const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.0 });
      const eyePupilMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0, metalness: 0.0 });
      const eyeWL = new THREE.Mesh(eyeGeo, eyeWhiteMat);
      const eyeWR = new THREE.Mesh(eyeGeo, eyeWhiteMat);
      const pupilL = new THREE.Mesh(new THREE.SphereGeometry(this.monsterRadius * 0.08, 10, 10), eyePupilMat);
      const pupilR = new THREE.Mesh(new THREE.SphereGeometry(this.monsterRadius * 0.08, 10, 10), eyePupilMat);
      eyeWL.position.set(-this.monsterRadius * 0.25, this.monsterRadius * 0.15, this.monsterRadius * 0.95);
      eyeWR.position.set(this.monsterRadius * 0.25, this.monsterRadius * 0.15, this.monsterRadius * 0.95);
      pupilL.position.set(-this.monsterRadius * 0.25, this.monsterRadius * 0.15, this.monsterRadius * 1.15);
      pupilR.position.set(this.monsterRadius * 0.25, this.monsterRadius * 0.15, this.monsterRadius * 1.15);
      g.add(body);
      g.add(hornL);
      g.add(hornR);
      g.add(fangL);
      g.add(fangR);
      g.add(eyeWL);
      g.add(eyeWR);
      g.add(pupilL);
      g.add(pupilR);
      this.monster = g;
      this.monsterPos.y = this.monsterRadius;
      if (!this.canStand(this.monsterPos.x, this.monsterPos.z, this.monsterRadius)) {
        this.monsterPos.set(3.5, this.monsterRadius, 6.5);
      }
      this.monster.position.copy(this.monsterPos);
      this.scene.add(this.monster);
    }
    buildKeysAndDoor() {
      const kGeo = new THREE.IcosahedronGeometry(0.18, 1);
      const kMat = new THREE.MeshStandardMaterial({ color: 0xffc900, emissive: 0x221000, roughness: 0.35, metalness: 0.55 });
      this.keyMeshes = [];
      for (let j = 0; j < this.keyTiles.length; j++) {
        const t = this.keyTiles[j];
        const mesh = new THREE.Mesh(kGeo, kMat.clone());
        mesh.position.set(t.x + 0.5, 0.35, t.z + 0.5);
        mesh.castShadow = true;
        mesh.userData.baseY = mesh.position.y;
        this.scene.add(mesh);
        this.keyMeshes.push(mesh);
      }
      const dGeo = new THREE.BoxGeometry(0.8, 1.2, 0.12);
      const dMat = new THREE.MeshStandardMaterial({ color: 0xff3333, roughness: 0.6, metalness: 0.1 });
      this.doorMesh = new THREE.Mesh(dGeo, dMat);
      this.doorMesh.position.set(this.doorTile.x + 0.5, 0.6, this.doorTile.z + 0.5);
      this.doorMesh.castShadow = true;
      this.scene.add(this.doorMesh);
      this.setDoorLocked(true);
    }
    initInput() {
      window.addEventListener('keydown', e => {
        this.keys[e.code] = true;
        if (e.code === 'KeyR') location.reload();
      });
      window.addEventListener('keyup', e => { this.keys[e.code] = false; });
      this.container.addEventListener('mousedown', e => { this.dragging = true; this.lastX = e.clientX; });
      window.addEventListener('mouseup', () => { this.dragging = false; });
      window.addEventListener('mousemove', e => {
        if (!this.dragging) return;
        const dx = e.clientX - this.lastX;
        this.lastX = e.clientX;
        this.yaw -= dx * 0.004;
      });
    }
    onResize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }
    loop() {
      requestAnimationFrame(() => this.loop());
      const dt = Math.min(0.033, this.clock.getDelta());
      if (this.running) this.update(dt);
      this.renderer.render(this.scene, this.camera);
    }
    update(dt) {
      const rotSpeed = 2.6;
      const moveSpeed = (this.keys.ShiftLeft || this.keys.ShiftRight) ? 4.2 : 2.8;
      if (this.keys.KeyA || this.keys.ArrowLeft) this.yaw += rotSpeed * dt;
      if (this.keys.KeyD || this.keys.ArrowRight) this.yaw -= rotSpeed * dt;
      const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      let move = 0;
      if (this.keys.KeyW || this.keys.ArrowUp) move += moveSpeed * dt;
      if (this.keys.KeyS || this.keys.ArrowDown) move -= moveSpeed * dt;
      const dx = fwd.x * move;
      const dz = fwd.z * move;
      this.tryMoveAt(this.playerPos, this.playerRadius, dx, dz);
      this.player.position.copy(this.playerPos);
      this.updateMonster(dt);
      this.updateCamera(fwd, dt);
      this.animateKeys(dt);
      this.checkKeyPickup();
      this.checkDoor();
      this.checkMonsterHit();
    }
    tryMoveAt(pos, r, dx, dz) {
      let nx = pos.x + dx;
      let nz = pos.z;
      if (!this.canStand(nx, nz, r)) nx = pos.x;
      nz = pos.z + dz;
      if (!this.canStand(nx, nz, r)) nz = pos.z;
      pos.set(nx, pos.y, nz);
    }
    canStand(x, z, r) {
      const minX = Math.floor(x - r);
      const maxX = Math.floor(x + r);
      const minZ = Math.floor(z - r);
      const maxZ = Math.floor(z + r);
      if (minX < 0 || minZ < 0 || maxX >= this.mapW || maxZ >= this.mapH) return false;
      for (let tz = minZ; tz <= maxZ; tz++) {
        for (let tx = minX; tx <= maxX; tx++) {
          if (this.map[tz][tx] === 1) return false;
        }
      }
      return true;
    }
    updateCamera(fwd, dt) {
      const behind = new THREE.Vector3(-fwd.x, 0, -fwd.z).multiplyScalar(4.0);
      const desired = new THREE.Vector3(
        this.playerPos.x + behind.x,
        this.playerPos.y + 2.0,
        this.playerPos.z + behind.z
      );
      this.camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
      const lookAt = new THREE.Vector3(this.playerPos.x, this.playerPos.y + 0.9, this.playerPos.z);
      this.camera.lookAt(lookAt);
    }
    updateMonster(dt) {
      if (!this.monster) return;
      const toPlayer = new THREE.Vector3(this.playerPos.x - this.monsterPos.x, 0, this.playerPos.z - this.monsterPos.z);
      const dist = toPlayer.length();
      if (dist > 0.0001) {
        toPlayer.normalize();
        const step = this.monsterSpeed * dt;
        const mdx = toPlayer.x * step;
        const mdz = toPlayer.z * step;
        this.tryMoveAt(this.monsterPos, this.monsterRadius, mdx, mdz);
      }
      this.monster.position.copy(this.monsterPos);
      this.monster.rotation.y += dt * 1.2;
    }
    animateKeys(dt) {
      for (let i = 0; i < this.keyMeshes.length; i++) {
        const m = this.keyMeshes[i];
        if (!m || !m.visible) continue;
        m.rotation.y += dt * 1.6;
        m.position.y = m.userData.baseY + Math.sin(performance.now() * 0.004 + i) * 0.05;
      }
    }
    checkKeyPickup() {
      for (let i = 0; i < this.keyMeshes.length; i++) {
        const m = this.keyMeshes[i];
        if (!m || !m.visible) continue;
        const dx = m.position.x - this.playerPos.x;
        const dz = m.position.z - this.playerPos.z;
        const d2 = dx * dx + dz * dz;
        if (d2 <= 0.36) {
          m.visible = false;
          m.matrixAutoUpdate = false;
          this.keysCollected++;
          this.updateKeysHUD();
          if (this.keysCollected >= this.totalKeys) {
            this.setDoorLocked(false);
            this.toast('הדלת נפתחה!');
          } else {
            this.toast('אספת מפתח!');
          }
        }
      }
    }
    checkDoor() {
      if (!this.doorMesh) return;
      const dx = this.doorMesh.position.x - this.playerPos.x;
      const dz = this.doorMesh.position.z - this.playerPos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > 0.64) return;
      if (this.doorLocked) {
        this.toast('הדלת נעולה! מצא את כל המפתחות.');
      } else {
        this.completeLevel();
      }
    }
    checkMonsterHit() {
      if (!this.monster) return;
      const dx = this.monsterPos.x - this.playerPos.x;
      const dz = this.monsterPos.z - this.playerPos.z;
      const rr = this.playerRadius + this.monsterRadius;
      const d2 = dx * dx + dz * dz;
      if (d2 <= rr * rr) {
        this.gameOver();
      }
    }
    setDoorLocked(locked) {
      this.doorLocked = locked;
      if (!this.doorMesh) return;
      const c = locked ? 0xff3333 : 0x2ecc71;
      this.doorMesh.material.color.setHex(c);
    }
    updateKeysHUD() {
      if (this.keysEl) this.keysEl.textContent = `Keys: ${this.keysCollected}/${this.totalKeys}`;
    }
    toast(text) {
      if (!this.toastEl) return;
      this.toastEl.textContent = text;
      this.toastEl.classList.add('show');
      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.toastEl.classList.remove('show');
      }, 1600);
    }
    completeLevel() {
      this.running = false;
      if (this.overlayEl) this.overlayEl.style.display = 'flex';
    }
    gameOver() {
      if (!this.running) return;
      this.running = false;
      this.toast('המפלצת תפסה אותך!');
      if (this.overlayEl) this.overlayEl.style.display = 'flex';
    }
  }
  window.startGame3D = function () {
    const g = new Game3D();
    g.start();
  };
})();