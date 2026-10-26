import * as THREE from 'three';
import { WeaponSystem } from './Weapon.js';
import { TILE_SIZE, MAP_LAYOUT } from './MapData.js';

export class Player {
  constructor(camera, scene, vfxManager, inputManager) {
    this.camera = camera;
    this.scene = scene;
    this.vfxManager = vfxManager;
    this.input = inputManager;

    // First person camera rotation (Pitch / Yaw)
    this.pitch = 0;
    this.yaw = -Math.PI / 2; // Face towards corridor opening
    this.eyeHeight = 1.6;

    // Player position
    this.position = new THREE.Vector3(0, this.eyeHeight, 0);
    this.velocity = new THREE.Vector3();
    this.radius = 0.45; // collision sphere radius

    // Player stats
    this.health = 100;
    this.maxHealth = 100;
    this.ammo = 32;
    this.maxAmmo = 99;
    this.score = 0;
    this.lives = 3;
    this.invulnerableTimer = 0; // seconds of damage immunity after respawning
    this.enemiesKilled = 0;
    this.hasFoundRelic = false;
    this.hasEscaped = false;

    // Movement speeds
    this.walkSpeed = 4.8;
    this.runSpeed = 7.5;
    this.friction = 12.0;

    // Jump & Bobbing
    this.isGrounded = true;
    this.verticalVelocity = 0;
    this.gravity = -24.0;
    this.jumpForce = 7.0;

    // Inventory
    this.inventory = {
      hasSilverKey: false,
      hasGoldKey: false,
    };
    this.hasMP40 = false;

    // Screen Shake / Damage feedback
    this.damageFlash = 0;
    this.shakeIntensity = 0;

    // Raycaster for door / switch interaction
    this.interactRaycaster = new THREE.Raycaster();
    this.interactRaycaster.far = 3.2; // interaction reach
    this.screenCenter = new THREE.Vector2(0, 0);

    // Initialize Weapon Rig
    this.weapon = new WeaponSystem(this.camera, this.scene, this.vfxManager);

    // Explorer's Lantern / Dungeon Belt Light (Provides soft, warm immediate illumination)
    this.lanternLight = new THREE.PointLight(0xffeedd, 0.8, 9.0);
    this.lanternLight.position.set(0, -0.2, -0.2);
    this.camera.add(this.lanternLight);

    // Set initial spawn
    this.setSpawn(1.5, 1.5);
  }

  setSpawn(gridX, gridZ, yaw = -Math.PI / 2) {
    this.position.set(gridX * TILE_SIZE, this.eyeHeight, gridZ * TILE_SIZE);
    this.camera.position.copy(this.position);
    this.yaw = yaw;
    this.pitch = 0;
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.velocity.set(0, 0, 0);
  }

  takeDamage(amount) {
    if (this.health <= 0 || this.invulnerableTimer > 0) return;
    this.health = Math.max(0, this.health - amount);
    this.damageFlash = 0.6;
    this.shakeIntensity = Math.min(0.25, amount * 0.01);
  }

  /**
   * Raycast object interaction (Doors, Secret Push-Walls, Elevator Switch)
   */
  interact(interactables, onFeedback) {
    this.interactRaycaster.setFromCamera(this.screenCenter, this.camera);
    const hits = this.interactRaycaster.intersectObjects(interactables, true);

    if (hits.length > 0) {
      let targetObj = hits[0].object;
      let door = targetObj.userData?.door;
      let isExit = targetObj.userData?.isExit;

      // Search parent hierarchy if needed
      while (!door && !isExit && targetObj.parent) {
        targetObj = targetObj.parent;
        door = targetObj.userData?.door;
        isExit = targetObj.userData?.isExit;
      }

      if (door) {
        door.interact(this.inventory, onFeedback);
        return;
      }

      if (isExit) {
        if (!this.inventory.hasGoldKey) {
          if (onFeedback) onFeedback('Elevator Power Offline! Requires Gold Vault Key.', 'error');
        } else {
          this.hasEscaped = true;
          if (onFeedback) onFeedback('Elevator Activated! Escaping Castle Wolfenstein...', 'special');
        }
      }
    }
  }

  /**
   * Collision detection against dungeon grid walls and doors
   */
  checkCollision(newX, newZ, doors, collectibles) {
    const minTileX = Math.floor((newX - this.radius) / TILE_SIZE);
    const maxTileX = Math.floor((newX + this.radius) / TILE_SIZE);
    const minTileZ = Math.floor((newZ - this.radius) / TILE_SIZE);
    const maxTileZ = Math.floor((newZ + this.radius) / TILE_SIZE);

    for (let tz = minTileZ; tz <= maxTileZ; tz++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        // Out of bounds check
        if (tz < 0 || tz >= MAP_LAYOUT.length || tx < 0 || tx >= MAP_LAYOUT[0].length) {
          return true;
        }

        const tile = MAP_LAYOUT[tz][tx];

        // Solid walls (1: Stone, 2: Steel, 3: Column, 4: Secret wall when closed)
        if (tile === '1' || tile === '2' || tile === '3') {
          return true;
        }

        // Secret Wall tile
        if (tile === '4') {
          const secretDoor = doors.find((d) => d.gridX === tx && d.gridZ === tz);
          if (!secretDoor || secretDoor.isBlocking()) {
            return true;
          }
        }

        // Doors (D, S, G)
        if (tile === 'D' || tile === 'S' || tile === 'G') {
          const door = doors.find((d) => d.gridX === tx && d.gridZ === tz);
          if (door && door.isBlocking()) {
            return true;
          }
        }
      }
    }

    // Check collision with explosive barrels
    if (collectibles && collectibles.isBarrelBlocking({ x: newX, z: newZ }, this.radius)) {
      return true;
    }

    return false;
  }

  update(delta, doors, collectibles) {
    // 1. Mouse Look (Yaw / Pitch)
    const mouseDelta = this.input.getAndResetMouseDelta();
    this.yaw -= mouseDelta.x;
    this.pitch -= mouseDelta.y;
    // Clamp pitch (prevent camera flip)
    this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // 2. Movement Input
    const forward = (this.input.keys.forward ? 1 : 0) - (this.input.keys.backward ? 1 : 0);
    const strafe = (this.input.keys.right ? 1 : 0) - (this.input.keys.left ? 1 : 0);
    const isMoving = forward !== 0 || strafe !== 0;
    const isSprinting = this.input.keys.sprint;
    const currentSpeed = isSprinting ? this.runSpeed : this.walkSpeed;

    // Movement direction relative to camera yaw
    const dir = new THREE.Vector3();
    if (isMoving) {
      const moveZ = -forward;
      const moveX = strafe;
      dir.set(moveX, 0, moveZ).normalize();
      dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    }

    // Accelerate / Friction
    if (isMoving) {
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, dir.x * currentSpeed, delta * 10);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, dir.z * currentSpeed, delta * 10);
    } else {
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, 0, delta * this.friction);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, 0, delta * this.friction);
    }

    // Jumping physics
    if (this.input.keys.jump && this.isGrounded) {
      this.verticalVelocity = this.jumpForce;
      this.isGrounded = false;
    }

    if (!this.isGrounded) {
      this.verticalVelocity += this.gravity * delta;
      this.position.y += this.verticalVelocity * delta;
      if (this.position.y <= this.eyeHeight) {
        this.position.y = this.eyeHeight;
        this.verticalVelocity = 0;
        this.isGrounded = true;
      }
    }

    // Horizontal Movement with Collision Resolution (Separated axes for smooth sliding)
    const targetX = this.position.x + this.velocity.x * delta;
    if (!this.checkCollision(targetX, this.position.z, doors, collectibles)) {
      this.position.x = targetX;
    } else {
      this.velocity.x = 0;
    }

    const targetZ = this.position.z + this.velocity.z * delta;
    if (!this.checkCollision(this.position.x, targetZ, doors, collectibles)) {
      this.position.z = targetZ;
    } else {
      this.velocity.z = 0;
    }

    // Screen Shake Decay
    let shakeOffset = new THREE.Vector3();
    if (this.shakeIntensity > 0) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - delta * 0.8);
      shakeOffset.set(
        (Math.random() - 0.5) * this.shakeIntensity,
        (Math.random() - 0.5) * this.shakeIntensity,
        (Math.random() - 0.5) * this.shakeIntensity
      );
    }

    // Damage Flash Decay
    if (this.damageFlash > 0) {
      this.damageFlash = Math.max(0, this.damageFlash - delta * 2.0);
    }

    // Respawn Invulnerability Decay
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer = Math.max(0, this.invulnerableTimer - delta);
    }

    // Update Camera Position
    this.camera.position.copy(this.position).add(shakeOffset);

    // Update Weapon Animations
    this.weapon.update(delta, isMoving, isSprinting);
  }
}
