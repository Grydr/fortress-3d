import * as THREE from 'three';
import { TextureGenerator } from '../core/TextureGenerator.js';
import { Door } from './Door.js';
import { Enemy } from './Enemy.js';
import { TILE_SIZE, WALL_HEIGHT, MAP_LAYOUT, ENTITY_SPAWNS } from './MapData.js';

export class LevelBuilder {
  constructor(scene, vfxManager, collectibleManager) {
    this.scene = scene;
    this.vfxManager = vfxManager;
    this.collectibles = collectibleManager;

    this.walls = [];
    this.shootableMeshes = [];
    this.interactableMeshes = [];
    this.doors = [];
    this.enemies = [];
    this.torches = [];
    this.exitSwitch = null;

    this.initEnvironment();
  }

  initEnvironment() {
    // Castle Dungeon Atmospheric Fog (Balanced depth visibility)
    this.scene.fog = new THREE.FogExp2(0x16181f, 0.024);
    this.scene.background = new THREE.Color(0x16181f);

    // 1. Hemisphere Light (Soft castle ambient fill: cool sky / warm stone ground)
    const hemiLight = new THREE.HemisphereLight(0x70889b, 0x3d3228, 0.75);
    this.scene.add(hemiLight);

    // 2. Base Dungeon Ambient Light (Ensures dark corridors remain legible and atmospheric)
    const ambientLight = new THREE.AmbientLight(0x483e35, 0.55);
    this.scene.add(ambientLight);

    // 3. Directional Light (Moonbeam through ceiling grates)
    const dirLight = new THREE.DirectionalLight(0xadc4db, 0.95);
    dirLight.position.set(30, 45, 25);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 100;
    const d = 45;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.001;
    this.scene.add(dirLight);
  }

  buildLevel() {
    console.log('Building Wolfenstein 3D Castle Escape Level...');

    const rows = MAP_LAYOUT.length;
    const cols = MAP_LAYOUT[0].length;
    const totalWidth = cols * TILE_SIZE;
    const totalDepth = rows * TILE_SIZE;

    // 1. Floor & Ceiling
    const floorTex = TextureGenerator.getFloor();
    floorTex.map.repeat.set(cols, rows);
    floorTex.normalMap.repeat.set(cols, rows);

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex.map,
      normalMap: floorTex.normalMap,
      roughness: 0.8,
      metalness: 0.1,
    });
    const floorGeo = new THREE.PlaneGeometry(totalWidth, totalDepth);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(totalWidth / 2, 0, totalDepth / 2);
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.shootableMeshes.push(floor);

    // Ceiling
    const ceilingTex = TextureGenerator.getCeiling();
    ceilingTex.map.repeat.set(cols / 2, rows / 2);
    ceilingTex.normalMap.repeat.set(cols / 2, rows / 2);

    const ceilingMat = new THREE.MeshStandardMaterial({
      map: ceilingTex.map,
      normalMap: ceilingTex.normalMap,
      roughness: 0.85,
      metalness: 0.05,
    });
    const ceilingGeo = new THREE.PlaneGeometry(totalWidth, totalDepth);
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(totalWidth / 2, WALL_HEIGHT, totalDepth / 2);
    ceiling.receiveShadow = true;
    this.scene.add(ceiling);
    this.shootableMeshes.push(ceiling);

    // 2. Materials for Walls and Pillars
    const stoneTex = TextureGenerator.getStoneBrick();
    const stoneMat = new THREE.MeshStandardMaterial({
      map: stoneTex.map,
      normalMap: stoneTex.normalMap,
      roughnessMap: stoneTex.roughnessMap,
      roughness: 0.85,
      metalness: 0.05,
    });

    const steelTex = TextureGenerator.getSteelWall();
    const steelMat = new THREE.MeshStandardMaterial({
      map: steelTex.map,
      normalMap: steelTex.normalMap,
      roughness: 0.35,
      metalness: 0.85,
    });

    const columnMat = new THREE.MeshStandardMaterial({
      color: 0x546e7a,
      roughness: 0.6,
      metalness: 0.2,
    });

    const wallGeo = new THREE.BoxGeometry(TILE_SIZE, WALL_HEIGHT, TILE_SIZE);
    const colGeo = new THREE.CylinderGeometry(0.55, 0.65, WALL_HEIGHT, 16);

    // 3. Grid Parse
    for (let z = 0; z < rows; z++) {
      for (let x = 0; x < cols; x++) {
        const tile = MAP_LAYOUT[z][x];
        const worldX = x * TILE_SIZE + TILE_SIZE / 2;
        const worldZ = z * TILE_SIZE + TILE_SIZE / 2;

        if (tile === '1') {
          // Stone Wall
          const wall = new THREE.Mesh(wallGeo, stoneMat);
          wall.position.set(worldX, WALL_HEIGHT / 2, worldZ);
          wall.castShadow = true;
          wall.receiveShadow = true;
          this.scene.add(wall);
          this.walls.push(wall);
          this.shootableMeshes.push(wall);
        } else if (tile === '2') {
          // Steel Bunker Wall
          const wall = new THREE.Mesh(wallGeo, steelMat);
          wall.position.set(worldX, WALL_HEIGHT / 2, worldZ);
          wall.castShadow = true;
          wall.receiveShadow = true;
          this.scene.add(wall);
          this.walls.push(wall);
          this.shootableMeshes.push(wall);
        } else if (tile === '3') {
          // Castle Column
          const col = new THREE.Mesh(colGeo, columnMat);
          col.position.set(worldX, WALL_HEIGHT / 2, worldZ);
          col.castShadow = true;
          col.receiveShadow = true;
          this.scene.add(col);
          this.walls.push(col);
          this.shootableMeshes.push(col);
        } else if (tile === 'D' || tile === 'S' || tile === 'G') {
          // Interactive Doors
          const doorType = tile === 'D' ? 'normal' : tile === 'S' ? 'silver' : 'gold';
          // Determine orientation by checking adjacent tiles
          const isHoriz = (MAP_LAYOUT[z][x - 1] === '1' || MAP_LAYOUT[z][x - 1] === '2') &&
                          (MAP_LAYOUT[z][x + 1] === '1' || MAP_LAYOUT[z][x + 1] === '2');
          const orientation = isHoriz ? 'horizontal' : 'vertical';

          const door = new Door(x, z, doorType, orientation);
          this.scene.add(door.group);
          this.doors.push(door);
          this.interactableMeshes.push(door.leaf);
          this.shootableMeshes.push(door.leaf);
        } else if (tile === '4') {
          // Secret Push-Wall
          const secretDoor = new Door(x, z, 'secret', 'horizontal');
          this.scene.add(secretDoor.group);
          this.doors.push(secretDoor);
          this.interactableMeshes.push(secretDoor.leaf);
          this.shootableMeshes.push(secretDoor.leaf);
        } else if (tile === 'EXIT') {
          // Castle Escape Elevator
          this.buildElevatorRoom(worldX, worldZ);
        }
      }
    }

    // 4. Entity Spawns
    for (const ent of ENTITY_SPAWNS) {
      if (ent.type === 'guard' || ent.type === 'officer') {
        const enemy = new Enemy(this.scene, ent, this.vfxManager);
        this.enemies.push(enemy);
        this.shootableMeshes.push(enemy.group);
      } else if (ent.type === 'barrel') {
        const barrel = this.collectibles.spawnBarrel(ent.x, ent.z);
        this.shootableMeshes.push(barrel.mesh);
      } else if (ent.type === 'torch') {
        this.buildTorchSconce(ent.x, ent.z, ent.wallSide);
      } else if (ent.type === 'banner') {
        this.buildWallBanner(ent.x, ent.z, ent.facing);
      } else {
        // Collectible items (keys, medkits, ammo, relic, chalice)
        this.collectibles.spawnItem(ent.type, ent.x, ent.z);
      }
    }
  }

  /**
   * Build Castle Wall Torch Sconce (Parent-Child Scene Graph + PointLight)
   */
  buildTorchSconce(gridX, gridZ, wallSide) {
    const worldX = gridX * TILE_SIZE;
    const worldZ = gridZ * TILE_SIZE;

    const torchGroup = new THREE.Group();
    torchGroup.position.set(worldX, 2.2, worldZ);

    const ironMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.85, roughness: 0.3 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a2f1b, roughness: 0.8 });

    // Bracket
    const bracketGeo = new THREE.BoxGeometry(0.1, 0.4, 0.25);
    const bracket = new THREE.Mesh(bracketGeo, ironMat);
    bracket.castShadow = true;
    torchGroup.add(bracket);

    // Wooden Torch Handle
    const handleGeo = new THREE.CylinderGeometry(0.04, 0.03, 0.6, 8);
    const handle = new THREE.Mesh(handleGeo, woodMat);
    handle.position.set(0, 0.15, 0.15);
    handle.rotation.x = 0.3;
    handle.castShadow = true;
    torchGroup.add(handle);

    // Torch Cup Head
    const cupGeo = new THREE.CylinderGeometry(0.07, 0.05, 0.14, 8);
    const cup = new THREE.Mesh(cupGeo, ironMat);
    cup.position.set(0, 0.45, 0.25);
    torchGroup.add(cup);

    // Dynamic Flickering PointLight (Shadow caster)
    const torchLight = new THREE.PointLight(0xffa233, 3.4, 13.0);
    torchLight.position.set(0, 0.6, 0.25);
    torchLight.castShadow = true;
    torchLight.shadow.bias = -0.002;
    torchGroup.add(torchLight);

    // Wall rotation
    if (wallSide === 'north') {
      torchGroup.rotation.y = 0;
    } else if (wallSide === 'south') {
      torchGroup.rotation.y = Math.PI;
    } else if (wallSide === 'east') {
      torchGroup.rotation.y = -Math.PI / 2;
    } else if (wallSide === 'west') {
      torchGroup.rotation.y = Math.PI / 2;
    }

    this.scene.add(torchGroup);
    this.torches.push(torchGroup);

    // Register with VFXManager for animated flame particles & flicker
    this.vfxManager.registerTorch(torchGroup, torchLight);
  }

  /**
   * Build Castle Wall Tapestry / Banner
   */
  buildWallBanner(gridX, gridZ, facing) {
    const bannerTex = TextureGenerator.getCastleBanner();
    const bannerMat = new THREE.MeshStandardMaterial({
      map: bannerTex,
      roughness: 0.75,
      metalness: 0.1,
    });
    const bannerGeo = new THREE.PlaneGeometry(1.6, 3.0);
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(gridX * TILE_SIZE, 1.8, gridZ * TILE_SIZE);

    if (facing === 'south') banner.rotation.y = 0;
    if (facing === 'north') banner.rotation.y = Math.PI;
    if (facing === 'west') banner.rotation.y = -Math.PI / 2;
    if (facing === 'east') banner.rotation.y = Math.PI / 2;

    this.scene.add(banner);
  }

  /**
   * Build Castle Escape Elevator Room & Exit Switch
   */
  buildElevatorRoom(worldX, worldZ) {
    const group = new THREE.Group();
    group.position.set(worldX, 0, worldZ);

    // Elevator platform
    const platGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.15, 24);
    const platMat = new THREE.MeshStandardMaterial({ color: 0x34495e, metalness: 0.8, roughness: 0.3 });
    const plat = new THREE.Mesh(platGeo, platMat);
    plat.position.y = 0.08;
    plat.receiveShadow = true;
    group.add(plat);

    // Elevator Pillar Posts
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const postGeo = new THREE.CylinderGeometry(0.06, 0.06, WALL_HEIGHT, 8);
      const post = new THREE.Mesh(postGeo, platMat);
      post.position.set(Math.cos(angle) * 1.3, WALL_HEIGHT / 2, Math.sin(angle) * 1.3);
      group.add(post);
    }

    // Elevator Control Console & Interactive Switch
    const consoleGeo = new THREE.BoxGeometry(0.4, 1.1, 0.3);
    const consoleMat = new THREE.MeshStandardMaterial({ color: 0x1a252f, metalness: 0.9, roughness: 0.2 });
    const consoleMesh = new THREE.Mesh(consoleGeo, consoleMat);
    consoleMesh.position.set(0, 0.55, -1.0);
    consoleMesh.castShadow = true;
    group.add(consoleMesh);

    // Glowing Activation Button (Raycaster interactable)
    const btnGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.06, 16);
    btnGeo.rotateX(Math.PI / 2);
    const btnMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.8,
    });
    this.exitSwitch = new THREE.Mesh(btnGeo, btnMat);
    this.exitSwitch.position.set(0, 0.85, -0.83);
    this.exitSwitch.userData = { isExit: true, isInteractable: true };
    group.add(this.exitSwitch);
    this.interactableMeshes.push(this.exitSwitch);

    this.scene.add(group);

    // Add glowing portal VFX to the elevator exit
    this.vfxManager.createElevatorPortal(new THREE.Vector3(worldX, 0, worldZ));
  }

  getSightBlockers() {
    const blockers = [...this.walls];
    for (const d of this.doors) {
      if (d.isBlocking() && d.leaf) {
        blockers.push(d.leaf);
      }
    }
    return blockers;
  }

  update(delta) {
    for (const d of this.doors) {
      d.update(delta);
    }
  }
}
