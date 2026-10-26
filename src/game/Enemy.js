import * as THREE from 'three';
import { sound } from '../core/AudioManager.js';
import { TILE_SIZE, MAP_LAYOUT } from './MapData.js';
import { Pathfinder } from './Pathfinder.js';

export class Enemy {
  constructor(scene, config, vfxManager) {
    this.scene = scene;
    this.config = config;
    this.vfxManager = vfxManager;

    this.type = config.type || 'guard'; // 'guard' (Brown uniform) or 'officer' (Blue/Grey SS)
    this.isOfficer = this.type === 'officer';

    this.health = this.isOfficer ? 90 : 45;
    this.maxHealth = this.health;
    this.isDead = false;

    // Movement & AI parameters
    this.speed = this.isOfficer ? 2.4 : 1.8;
    this.attackRange = this.isOfficer ? 14.0 : 10.0;
    this.fireInterval = this.isOfficer ? 0.35 : 0.9;
    this.damage = this.isOfficer ? 12 : 8;
    this.fireTimer = 0;

    this.state = 'PATROL'; // 'PATROL', 'CHASE', 'ATTACK', 'HURT', 'DEAD'
    this.patrolPoints = (config.patrol || []).map((p) => new THREE.Vector3(p.x * TILE_SIZE + TILE_SIZE / 2, 0, p.z * TILE_SIZE + TILE_SIZE / 2));
    if (this.patrolPoints.length === 0) {
      this.patrolPoints.push(new THREE.Vector3(config.x * TILE_SIZE + TILE_SIZE / 2, 0, config.z * TILE_SIZE + TILE_SIZE / 2));
    }
    this.currentPatrolIdx = 0;

    // BFS Pathfinding State
    this.currentPath = [];
    this.pathIndex = 0;
    this.pathTimer = 0;

    // Build 3D Mesh Hierarchy (Parent-Child)
    this.group = new THREE.Group();
    this.group.name = `Enemy_${this.type}_${config.x}_${config.z}`;
    this.worldPos = new THREE.Vector3(config.x * TILE_SIZE + TILE_SIZE / 2, 0, config.z * TILE_SIZE + TILE_SIZE / 2);
    this.spawnPos = this.worldPos.clone();
    this.group.position.copy(this.worldPos);
    this.group.rotation.y = config.rot || 0;

    this.walkCycle = 0;
    this.flinchTimer = 0;
    this.deathTimer = 0;

    this.buildHierarchy();
    this.scene.add(this.group);
  }

  buildHierarchy() {
    const uniformColor = this.isOfficer ? 0x2c3e50 : 0x795548; // SS Blue-Grey vs Guard Brown
    const skinColor = 0xffcc80;
    const bootColor = 0x111111;
    const metalColor = 0x212121;

    const uniformMat = new THREE.MeshStandardMaterial({ color: uniformColor, roughness: 0.7 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
    const bootMat = new THREE.MeshStandardMaterial({ color: bootColor, roughness: 0.4, metalness: 0.2 });
    const gunMat = new THREE.MeshStandardMaterial({ color: metalColor, metalness: 0.85, roughness: 0.3 });

    // Store materials for hit-flash
    this.materials = [uniformMat, skinMat, bootMat, gunMat];

    // 1. Root Pelvis / Torso (Center at y = 1.05, height = 0.70 -> base of torso at y = 0.70)
    const torsoGeo = new THREE.BoxGeometry(0.55, 0.7, 0.35);
    this.torso = new THREE.Mesh(torsoGeo, uniformMat);
    this.torso.position.y = 1.05;
    this.torso.castShadow = true;
    this.torso.receiveShadow = true;
    this.group.add(this.torso);

    // Belt and buckle
    const beltGeo = new THREE.BoxGeometry(0.56, 0.08, 0.36);
    const belt = new THREE.Mesh(beltGeo, bootMat);
    belt.position.y = -0.28;
    this.torso.add(belt);

    // Buckle
    const buckleGeo = new THREE.BoxGeometry(0.12, 0.09, 0.38);
    const buckleMat = new THREE.MeshStandardMaterial({
      color: this.isOfficer ? 0xd4af37 : 0xc0c0c0,
      metalness: 0.9,
      roughness: 0.2,
    });
    const buckle = new THREE.Mesh(buckleGeo, buckleMat);
    buckle.position.set(0, -0.28, 0);
    this.torso.add(buckle);

    // 2. Head with Cap / Helmet
    const headGeo = new THREE.BoxGeometry(0.32, 0.35, 0.32);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.y = 0.55;
    this.head.castShadow = true;
    this.torso.add(this.head);

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.06, 0.04, 0.02);
    const eyeMat = new THREE.MeshBasicMaterial({ color: this.isOfficer ? 0x111111 : 0x2563eb });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.08, 0.05, 0.165);
    this.head.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.08, 0.05, 0.165);
    this.head.add(rightEye);

    // Cap
    const capGeo = new THREE.CylinderGeometry(0.24, 0.22, 0.15, 12);
    const capMat = new THREE.MeshStandardMaterial({ color: this.isOfficer ? 0x1a252f : 0x4e342e, roughness: 0.5 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 0.2;
    this.head.add(cap);

    const visorGeo = new THREE.BoxGeometry(0.24, 0.03, 0.12);
    const visor = new THREE.Mesh(visorGeo, bootMat);
    visor.position.set(0, 0.12, 0.18);
    this.head.add(visor);

    // Shoulder Epaulets
    const epauletGeo = new THREE.BoxGeometry(0.18, 0.05, 0.22);
    const epauletMat = new THREE.MeshStandardMaterial({
      color: this.isOfficer ? 0xd4af37 : 0x4e342e,
      roughness: 0.4,
    });
    const leftEpaulet = new THREE.Mesh(epauletGeo, epauletMat);
    leftEpaulet.position.set(-0.28, 0.36, 0);
    this.torso.add(leftEpaulet);
    const rightEpaulet = new THREE.Mesh(epauletGeo, epauletMat);
    rightEpaulet.position.set(0.28, 0.36, 0);
    this.torso.add(rightEpaulet);

    // 3. Legs with Hip Pivot Groups
    // Hip joints are located at the base of the pelvis at y = 0.70
    // Rotating this group pivots the leg about the hip joint, keeping it attached to the torso
    const legGeo = new THREE.BoxGeometry(0.2, 0.70, 0.22);

    this.leftLeg = new THREE.Group();
    this.leftLeg.name = 'LeftLegPivot';
    this.leftLeg.position.set(-0.16, 0.70, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, bootMat);
    leftLegMesh.position.set(0, -0.35, 0); // hang down 0.70 units from hip pivot
    leftLegMesh.castShadow = true;
    leftLegMesh.receiveShadow = true;
    leftLegMesh.userData = { enemy: this, isShootable: true };
    this.leftLeg.add(leftLegMesh);
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Group();
    this.rightLeg.name = 'RightLegPivot';
    this.rightLeg.position.set(0.16, 0.70, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, bootMat);
    rightLegMesh.position.set(0, -0.35, 0); // hang down 0.70 units from hip pivot
    rightLegMesh.castShadow = true;
    rightLegMesh.receiveShadow = true;
    rightLegMesh.userData = { enemy: this, isShootable: true };
    this.rightLeg.add(rightLegMesh);
    this.group.add(this.rightLeg);

    // 4. Arms with Shoulder Pivot Groups
    // Shoulder joints are located at the upper torso at y = 0.26 in torso local coordinates
    // Rotating this group pivots the arm about the shoulder joint, keeping it attached to the torso
    const armGeo = new THREE.BoxGeometry(0.15, 0.62, 0.16);

    this.leftArm = new THREE.Group();
    this.leftArm.name = 'LeftArmPivot';
    this.leftArm.position.set(-0.35, 0.26, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, uniformMat);
    leftArmMesh.position.set(0, -0.31, 0); // hang down 0.62 units from shoulder pivot
    leftArmMesh.castShadow = true;
    leftArmMesh.receiveShadow = true;
    leftArmMesh.userData = { enemy: this, isShootable: true };
    this.leftArm.add(leftArmMesh);
    this.torso.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.name = 'RightArmPivot';
    this.rightArm.position.set(0.35, 0.26, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, uniformMat);
    rightArmMesh.position.set(0, -0.31, 0); // hang down 0.62 units from shoulder pivot
    rightArmMesh.castShadow = true;
    rightArmMesh.receiveShadow = true;
    rightArmMesh.userData = { enemy: this, isShootable: true };
    this.rightArm.add(rightArmMesh);
    this.torso.add(this.rightArm);

    // 5. Gun attached to Right Hand
    // Hand is located at the lower end of the right arm (y = -0.56 in rightArm group space)
    const gunGeo = new THREE.BoxGeometry(0.08, 0.1, 0.35);
    this.gunMesh = new THREE.Mesh(gunGeo, gunMat);
    this.gunMesh.position.set(0, -0.56, 0.16);
    this.gunMesh.castShadow = true;
    this.gunMesh.userData = { enemy: this, isShootable: true };
    this.rightArm.add(this.gunMesh);

    // Muzzle light for enemy firing (at the gun tip)
    this.muzzleLight = new THREE.PointLight(0xff9900, 0, 4);
    this.muzzleLight.position.set(0, 0, 0.22);
    this.gunMesh.add(this.muzzleLight);

    // Set userData for Raycaster shooting detection
    this.group.userData = { enemy: this, isShootable: true };
    this.torso.userData = { enemy: this, isShootable: true };
    this.head.userData = { enemy: this, isShootable: true, isHeadshot: true };
  }

  /**
   * Restore spawn state, including the joint positions moved by the death collapse
   * (otherwise a revived guard keeps its lowered torso/hips and walks sunk into the floor).
   */
  reset() {
    this.health = this.maxHealth;
    this.isDead = false;
    this.state = 'PATROL';
    this.deathTimer = 0;
    this.flinchTimer = 0;
    this.fireTimer = 0;
    this.walkCycle = 0;
    this.currentPatrolIdx = 0;
    this.currentPath = [];
    this.pathIndex = 0;
    this.pathTimer = 0;
    this.droppedKey = false;

    this.worldPos.copy(this.spawnPos);
    this.group.position.copy(this.spawnPos);
    this.group.rotation.y = this.config.rot || 0;

    this.torso.position.y = 1.05;
    this.leftLeg.position.y = 0.70;
    this.rightLeg.position.y = 0.70;
    this.torso.rotation.set(0, 0, 0);
    this.leftArm.rotation.set(0, 0, 0);
    this.rightArm.rotation.set(0, 0, 0);
    this.leftLeg.rotation.set(0, 0, 0);
    this.rightLeg.rotation.set(0, 0, 0);
    this.muzzleLight.intensity = 0;
  }

  takeDamage(amount, player, vfxManager) {
    if (this.isDead) return;

    this.health -= amount;
    this.flinchTimer = 0.15;

    // Flash materials red
    for (const mat of this.materials) {
      mat.color.setHex(0xff0000);
    }
    setTimeout(() => {
      if (!this.materials) return;
      this.materials[0].color.setHex(this.isOfficer ? 0x2c3e50 : 0x795548);
      this.materials[1].color.setHex(0xffcc80);
      this.materials[2].color.setHex(0x111111);
      this.materials[3].color.setHex(0x212121);
    }, 120);

    // Alert guard if damaged while on patrol
    if (this.state === 'PATROL') {
      this.state = 'CHASE';
      sound.playGuardAlert();
      this.pathTimer = 999; // trigger immediate BFS path recalculation
    }

    if (this.health <= 0) {
      this.die(player);
    }
  }

  die(player) {
    if (this.isDead) return;
    this.isDead = true;
    this.state = 'DEAD';
    sound.playGuardDeath();

    if (player) {
      player.score += this.isOfficer ? 400 : 150;
      player.enemiesKilled++;
    }

    // Drop items
    if (this.config.dropsGoldKey) {
      this.droppedKey = true;
    }
    if (this.config.dropsMP40 && player) {
      player.hasMP40 = true;
    }
  }

  /**
   * Collision check against map walls, columns, secret walls, and closed doors.
   * Prevents enemies from clipping or walking inside 3D wall geometry.
   */
  checkCollision(newX, newZ, doors) {
    const radius = 0.38;
    const minTileX = Math.floor((newX - radius) / TILE_SIZE);
    const maxTileX = Math.floor((newX + radius) / TILE_SIZE);
    const minTileZ = Math.floor((newZ - radius) / TILE_SIZE);
    const maxTileZ = Math.floor((newZ + radius) / TILE_SIZE);

    for (let tz = minTileZ; tz <= maxTileZ; tz++) {
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        if (tz < 0 || tz >= MAP_LAYOUT.length || tx < 0 || tx >= MAP_LAYOUT[0].length) {
          return true; // Out of bounds
        }

        const tile = MAP_LAYOUT[tz][tx];
        // Solid walls (1: Stone, 2: Steel, 3: Column, 4: Secret Wall)
        if (tile === '1' || tile === '2' || tile === '3' || tile === '4') {
          return true;
        }

        // Doors (D: Normal, S: Silver, G: Gold)
        if (tile === 'D' || tile === 'S' || tile === 'G') {
          if (doors) {
            const door = doors.find((d) => d.gridX === tx && d.gridZ === tz);
            if (door && door.isBlocking()) {
              return true;
            }
          } else {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Separated axis movement with wall-sliding resolution.
   */
  moveWithCollision(moveX, moveZ, speed, delta, doors) {
    const stepX = moveX * speed * delta;
    const stepZ = moveZ * speed * delta;

    const currentX = this.group.position.x;
    const currentZ = this.group.position.z;

    // Slide along X if open
    if (!this.checkCollision(currentX + stepX, currentZ, doors)) {
      this.group.position.x += stepX;
    }

    // Slide along Z if open
    if (!this.checkCollision(this.group.position.x, currentZ + stepZ, doors)) {
      this.group.position.z += stepZ;
    }
  }

  /**
   * Check Line of Sight to player using Raycaster and Field of View
   */
  hasLineOfSight(playerPos, obstacles, doors) {
    if (this.checkCollision(this.group.position.x, this.group.position.z, doors)) {
      return false;
    }

    const from = this.group.position.clone();
    from.y = 1.35;
    const to = playerPos.clone();
    to.y = 1.35;
    const dir = to.clone().sub(from).normalize();
    const dist = from.distanceTo(to);

    // FOV cone check when on PATROL (guards only spot player in front of them, unless super close)
    if (this.state === 'PATROL' && dist > 2.5) {
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
      const angle = forward.angleTo(dir);
      if (angle > Math.PI * 0.42) {
        return false;
      }
    }

    const ray = new THREE.Raycaster(from, dir, 0.1, dist);
    const hits = ray.intersectObjects(obstacles, true);

    return hits.length === 0;
  }

  update(delta, player, obstacles, doors, collectibles, onFeedback) {
    if (this.isDead) {
      // Natural Ragdoll Death Collapse Animation:
      // Torso lowers and falls back, hip and legs fold, arms splay out flat on the floor
      if (this.deathTimer < 1.0) {
        this.deathTimer += delta * 2.5;
        const t = Math.min(1.0, this.deathTimer);

        this.torso.position.y = THREE.MathUtils.lerp(1.05, 0.22, t);
        this.torso.rotation.x = -t * (Math.PI / 2);

        this.leftLeg.position.y = THREE.MathUtils.lerp(0.70, 0.15, t);
        this.rightLeg.position.y = THREE.MathUtils.lerp(0.70, 0.15, t);
        this.leftLeg.rotation.x = -t * (Math.PI / 2);
        this.rightLeg.rotation.x = -t * (Math.PI / 2);

        this.leftArm.rotation.z = -t * 0.8;
        this.rightArm.rotation.z = t * 0.8;
        this.leftArm.rotation.x = t * 0.3;
        this.rightArm.rotation.x = t * 0.3;
      }
      return;
    }

    const playerPos = player.camera.position.clone();
    playerPos.y = 0;
    const myPos = this.group.position.clone();
    myPos.y = 0;
    this.worldPos.copy(this.group.position);
    const distToPlayer = myPos.distanceTo(playerPos);

    // Update Flinch
    if (this.flinchTimer > 0) {
      this.flinchTimer -= delta;
      return;
    }

    // Check Player Detection
    const canSee = distToPlayer < 18.0 && this.hasLineOfSight(player.camera.position, obstacles, doors);

    if (canSee) {
      if (this.state === 'PATROL') {
        sound.playGuardAlert();
        if (onFeedback) onFeedback(this.isOfficer ? 'SS Officer alerted!' : 'Guard alerted!', 'alert');
      }
      this.state = distToPlayer <= this.attackRange ? 'ATTACK' : 'CHASE';
    } else if (this.state === 'ATTACK') {
      // Player broke line of sight (ran around corner or behind door) -> pursue via BFS pathfinding
      this.state = 'CHASE';
    }

    // AI Behaviors
    if (this.state === 'PATROL') {
      const target = this.patrolPoints[this.currentPatrolIdx];
      const moveDir = target.clone().sub(myPos);
      const dist = moveDir.length();

      if (dist < 0.45) {
        this.currentPatrolIdx = (this.currentPatrolIdx + 1) % this.patrolPoints.length;
      } else {
        moveDir.normalize();
        this.moveWithCollision(moveDir.x, moveDir.z, this.speed * 0.55, delta, doors);
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, delta * 5);

        // Natural Pendulum Walk Animation (from hip and shoulder joints)
        this.walkCycle += delta * 6;
        this.leftLeg.rotation.x = Math.sin(this.walkCycle) * 0.45;
        this.rightLeg.rotation.x = -Math.sin(this.walkCycle) * 0.45;
        this.leftArm.rotation.x = -Math.sin(this.walkCycle) * 0.4;
        this.rightArm.rotation.x = Math.sin(this.walkCycle) * 0.4;
      }
    } else if (this.state === 'CHASE') {
      // Path Planning: Recalculate BFS path periodically or when current waypoint reached
      this.pathTimer += delta;
      const needsRepath = this.pathTimer >= 0.35 || this.currentPath.length === 0 || this.pathIndex >= this.currentPath.length;

      if (needsRepath) {
        this.pathTimer = 0;
        this.currentPath = Pathfinder.findPath(this.group.position, playerPos, doors, true);
        this.pathIndex = 0;
      }

      // Determine movement target waypoint
      let moveTarget = null;

      if (this.currentPath.length > 0 && this.pathIndex < this.currentPath.length) {
        const wp = this.currentPath[this.pathIndex];
        const wpPos = new THREE.Vector3(wp.x, 0, wp.z);
        const distToWp = myPos.distanceTo(wpPos);

        // If approaching a normal door, trigger enemy door open
        if (doors) {
          const door = doors.find((d) => d.gridX === wp.gx && d.gridZ === wp.gz);
          if (door && door.type === 'normal') {
            door.openByEnemy();
            if (door.isBlocking()) {
              // Pause at door while it finishes opening
              const toDoor = wpPos.clone().sub(myPos).normalize();
              this.group.rotation.y = Math.atan2(toDoor.x, toDoor.z);
              return;
            }
          }
        }

        if (distToWp < 0.55) {
          this.pathIndex++;
        }

        // Shortcut straight to player only if line of sight is completely clear
        if (canSee && distToPlayer <= this.attackRange) {
          moveTarget = playerPos;
        } else {
          moveTarget = wpPos;
        }
      } else {
        // Fallback: move directly towards player if no grid path found
        moveTarget = playerPos;
      }

      const moveDir = moveTarget.clone().sub(myPos).normalize();
      this.moveWithCollision(moveDir.x, moveDir.z, this.speed, delta, doors);
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, delta * 8);

      // Fast Chase Walk Animation:
      // Legs swing vigorously from hips; left arm swings, right arm raised ready to fire
      this.walkCycle += delta * 10;
      this.leftLeg.rotation.x = Math.sin(this.walkCycle) * 0.55;
      this.rightLeg.rotation.x = -Math.sin(this.walkCycle) * 0.55;
      this.leftArm.rotation.x = -Math.sin(this.walkCycle) * 0.45;
      this.rightArm.rotation.x = -0.7 + Math.sin(this.walkCycle * 2) * 0.08;
    } else if (this.state === 'ATTACK') {
      // Face player directly
      const toPlayer = playerPos.clone().sub(myPos).normalize();
      this.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);

      // Aim gun pose:
      // Legs stationary, shoulder raises right arm straight forward to aim gun at player
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.rightArm.rotation.x = -1.35; // Shoulder pivots arm straight forward
      this.leftArm.rotation.x = -0.4;   // Left arm bracing

      // Shooting logic
      this.fireTimer += delta;
      if (this.fireTimer >= this.fireInterval) {
        this.fireTimer = 0;

        // Fire shot audio
        if (this.isOfficer) {
          sound.playMachineGun();
        } else {
          sound.playPistol();
        }

        // Muzzle flash on enemy gun
        this.muzzleLight.intensity = 2.5;
        setTimeout(() => {
          if (this.muzzleLight) this.muzzleLight.intensity = 0;
        }, 60);

        // Spawn Enemy Bullet Tracer towards player
        if (this.vfxManager) {
          const enemyMuzzlePos = new THREE.Vector3();
          this.muzzleLight.getWorldPosition(enemyMuzzlePos);
          const enemyTargetPos = player.camera.position.clone();
          enemyTargetPos.y -= 0.2; // chest level
          enemyTargetPos.x += (Math.random() - 0.5) * 0.45;
          enemyTargetPos.z += (Math.random() - 0.5) * 0.45;
          this.vfxManager.createBulletTracer(enemyMuzzlePos, enemyTargetPos, false);
        }

        // Calculate hit probability (higher at close range)
        const hitChance = Math.max(0.35, 0.85 - distToPlayer * 0.035);
        if (Math.random() < hitChance) {
          player.takeDamage(this.damage);
          sound.playPlayerHurt();
        }
      }
    }
  }
}
