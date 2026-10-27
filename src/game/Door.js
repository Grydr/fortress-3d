import * as THREE from 'three';
import { TextureGenerator } from '../core/TextureGenerator.js';
import { sound } from '../core/AudioManager.js';
import { TILE_SIZE, WALL_HEIGHT, MAP_LAYOUT } from './MapData.js';

export class Door {
  constructor(gridX, gridZ, type = 'normal', orientation = 'horizontal') {
    this.gridX = gridX;
    this.gridZ = gridZ;
    this.type = type; // 'normal', 'silver', 'gold', 'secret'
    this.orientation = orientation; // 'horizontal' (along X) or 'vertical' (along Z)

    this.isOpen = false;
    this.isOpening = false;
    this.openProgress = 0.0; // 0 (closed) to 1 (fully open)
    this.openSpeed = 2.0;

    // Secret push-wall specific animation phases
    this.isSecret = type === 'secret';
    this.secretPhase = 0; // 0: push back, 1: slide sideways
    this.pushDirZ = 1; // local Z recess direction, set on interact (away from the player)
    this.slideDirX = 1; // local X slide direction, always into a solid neighbouring wall
    if (this.isSecret) {
      const isSolid = (x, z) => MAP_LAYOUT[z] && ['1', '2'].includes(MAP_LAYOUT[z][x]);
      if (this.orientation === 'vertical') {
        // Group is rotated +90deg about Y: local +X points to world -Z
        this.slideDirX = isSolid(gridX, gridZ - 1) ? 1 : -1;
      } else {
        this.slideDirX = isSolid(gridX + 1, gridZ) ? 1 : -1;
      }
    }

    this.group = new THREE.Group();
    this.group.name = `Door_${type}_${gridX}_${gridZ}`;

    // World position centered in grid tile
    this.worldX = gridX * TILE_SIZE + TILE_SIZE / 2;
    this.worldZ = gridZ * TILE_SIZE + TILE_SIZE / 2;
    this.group.position.set(this.worldX, 0, this.worldZ);

    if (this.orientation === 'vertical') {
      this.group.rotation.y = Math.PI / 2;
    }

    this.buildMeshes();
  }

  buildMeshes() {
    const doorTex = TextureGenerator.getDoorTexture(this.type);
    const stoneTex = TextureGenerator.getStoneBrick();

    // 1. Secret Push Wall
    if (this.isSecret) {
      const wallMat = new THREE.MeshStandardMaterial({
        map: stoneTex.map,
        normalMap: stoneTex.normalMap,
        roughness: 0.85,
        metalness: 0.05,
      });
      const wallGeo = new THREE.BoxGeometry(TILE_SIZE, WALL_HEIGHT, TILE_SIZE);
      this.leaf = new THREE.Mesh(wallGeo, wallMat);
      this.leaf.position.y = WALL_HEIGHT / 2;
      this.leaf.castShadow = true;
      this.leaf.receiveShadow = true;
      this.group.add(this.leaf);

      // Interactive target metadata
      this.leaf.userData = { door: this, isInteractable: true };
      return;
    }

    // 2. Door Frame (Parent Scene Graph)
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x3e2723,
      roughness: 0.8,
      metalness: 0.2,
    });
    const framePostGeo = new THREE.BoxGeometry(0.2, WALL_HEIGHT, 0.4);
    const frameTopGeo = new THREE.BoxGeometry(TILE_SIZE, 0.25, 0.4);

    const postLeft = new THREE.Mesh(framePostGeo, frameMat);
    postLeft.position.set(-TILE_SIZE / 2 + 0.1, WALL_HEIGHT / 2, 0);
    postLeft.castShadow = true;
    this.group.add(postLeft);

    const postRight = new THREE.Mesh(framePostGeo, frameMat);
    postRight.position.set(TILE_SIZE / 2 - 0.1, WALL_HEIGHT / 2, 0);
    postRight.castShadow = true;
    this.group.add(postRight);

    const frameTop = new THREE.Mesh(frameTopGeo, frameMat);
    frameTop.position.set(0, WALL_HEIGHT - 0.12, 0);
    frameTop.castShadow = true;
    this.group.add(frameTop);

    // 3. Sliding Door Leaf (Child Scene Graph)
    const leafWidth = TILE_SIZE - 0.25;
    const leafHeight = WALL_HEIGHT - 0.25;
    const leafThick = 0.18;

    const doorMat = new THREE.MeshStandardMaterial({
      map: doorTex.map,
      normalMap: doorTex.normalMap,
      roughness: this.type === 'normal' ? 0.7 : 0.35,
      metalness: this.type === 'normal' ? 0.2 : 0.8,
    });

    const leafGeo = new THREE.BoxGeometry(leafWidth, leafHeight, leafThick);
    this.leaf = new THREE.Mesh(leafGeo, doorMat);
    this.leaf.position.set(0, leafHeight / 2, 0);
    this.leaf.castShadow = true;
    this.leaf.receiveShadow = true;
    this.group.add(this.leaf);

    // Door Handle / Ring (Child of Leaf)
    const handleMat = new THREE.MeshStandardMaterial({
      color: this.type === 'gold' ? 0xffd700 : this.type === 'silver' ? 0xc0c0c0 : 0x212121,
      metalness: 0.9,
      roughness: 0.2,
    });
    const handleGeo = new THREE.TorusGeometry(0.12, 0.025, 8, 16);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(leafWidth * 0.35, 0, leafThick / 2 + 0.03);
    this.leaf.add(handle);

    const handleBack = handle.clone();
    handleBack.position.z = -leafThick / 2 - 0.03;
    this.leaf.add(handleBack);

    // Metadata for Raycaster ray hit
    this.leaf.userData = { door: this, isInteractable: true };
  }

  /**
   * Enemy opening a normal door along their path
   */
  openByEnemy() {
    if (this.type === 'normal' && !this.isOpen && !this.isOpening) {
      this.isOpening = true;
      sound.playDoorOpen();
      return true;
    }
    return false;
  }

  /**
   * Try interacting with door (called via Raycaster or proximity E)
   */
  interact(inventory, onFeedback, playerPos = null) {
    if (this.isOpen || this.isOpening) return;

    if (this.isSecret && playerPos) {
      // Recess away from the player (vertical walls: local +Z points to world +X)
      this.pushDirZ = this.orientation === 'vertical'
        ? (playerPos.x < this.worldX ? 1 : -1)
        : (playerPos.z < this.worldZ ? 1 : -1);
    }

    if (this.type === 'silver' && !inventory.hasSilverKey) {
      sound.playDoorLocked();
      if (onFeedback) onFeedback('Locked! Requires Silver Key.', 'error');
      return;
    }

    if (this.type === 'gold' && !inventory.hasGoldKey) {
      sound.playDoorLocked();
      if (onFeedback) onFeedback('Locked! Requires Gold Key.', 'error');
      return;
    }

    // Unlocking / Opening
    this.isOpening = true;
    sound.playDoorOpen();

    if (this.type === 'silver') {
      if (onFeedback) onFeedback('Unlocked Sector B Gate with Silver Key!', 'success');
    } else if (this.type === 'gold') {
      if (onFeedback) onFeedback('Unlocked Vault Gate with Gold Key!', 'success');
    } else if (this.isSecret) {
      if (onFeedback) onFeedback('Discovered Hidden Secret Passage!', 'special');
      sound.playRelicFound();
    }
  }

  update(delta) {
    if (!this.isOpening && !this.isOpen) return;

    if (this.isOpening) {
      this.openProgress = Math.min(1.0, this.openProgress + delta * this.openSpeed);

      if (this.isSecret) {
        // Secret wall animation:
        // Phase 1 (0 to 0.3): Shallow recess away from the player
        // Phase 2 (0.3 to 1.0): Slide sideways a full tile into the solid neighbouring
        // wall, easing back flush so it never pokes into the rooms on either side
        const recess = this.pushDirZ * (TILE_SIZE * 0.05);
        if (this.openProgress < 0.3) {
          const t = this.openProgress / 0.3;
          this.leaf.position.z = t * recess;
        } else {
          const t = (this.openProgress - 0.3) / 0.7;
          this.leaf.position.z = (1 - t) * recess;
          this.leaf.position.x = t * TILE_SIZE * this.slideDirX;
        }
      } else {
        // Sliding door leaf slides up into the ceiling or sideways
        // Sliding sideways into the wall:
        const maxSlide = TILE_SIZE - 0.35;
        this.leaf.position.x = this.openProgress * maxSlide;
      }

      if (this.openProgress >= 1.0) {
        this.isOpen = true;
        this.isOpening = false;
        // Fully inside the neighbouring wall now; hide to avoid coplanar z-fighting
        if (this.isSecret) this.leaf.visible = false;
      }
    }
  }

  isBlocking() {
    // Secret wall or normal door blocks movement when closed or opening (< 0.75 progress)
    return this.openProgress < 0.75;
  }
}
