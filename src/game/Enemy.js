import * as THREE from 'three';
import { sound } from '../core/AudioManager.js';
import { TILE_SIZE } from './MapData.js';

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

    // Build 3D Mesh Hierarchy (Parent-Child)
    this.group = new THREE.Group();
    this.group.name = `Enemy_${this.type}_${config.x}_${config.z}`;
    this.worldPos = new THREE.Vector3(config.x * TILE_SIZE + TILE_SIZE / 2, 0, config.z * TILE_SIZE + TILE_SIZE / 2);
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

    // 1. Root Pelvis / Torso
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

    // 2. Head with Cap / Helmet
    const headGeo = new THREE.BoxGeometry(0.32, 0.35, 0.32);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.y = 0.55;
    this.head.castShadow = true;
    this.torso.add(this.head);

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

    // 3. Legs
    const legGeo = new THREE.BoxGeometry(0.2, 0.75, 0.22);

    this.leftLeg = new THREE.Mesh(legGeo, bootMat);
    this.leftLeg.position.set(-0.16, 0.38, 0);
    this.leftLeg.castShadow = true;
    this.group.add(this.leftLeg);

    this.rightLeg = new THREE.Mesh(legGeo, bootMat);
    this.rightLeg.position.set(0.16, 0.38, 0);
    this.rightLeg.castShadow = true;
    this.group.add(this.rightLeg);

    // 4. Arms
    const armGeo = new THREE.BoxGeometry(0.15, 0.65, 0.16);

    this.leftArm = new THREE.Mesh(armGeo, uniformMat);
    this.leftArm.position.set(-0.35, 0.05, 0);
    this.leftArm.castShadow = true;
    this.torso.add(this.leftArm);

    this.rightArm = new THREE.Mesh(armGeo, uniformMat);
    this.rightArm.position.set(0.35, 0.05, 0);
    this.rightArm.castShadow = true;
    this.torso.add(this.rightArm);

    // 5. Gun attached to Right Hand
    const gunGeo = new THREE.BoxGeometry(0.08, 0.1, 0.35);
    this.gunMesh = new THREE.Mesh(gunGeo, gunMat);
    this.gunMesh.position.set(0, -0.3, 0.18);
    this.gunMesh.castShadow = true;
    this.rightArm.add(this.gunMesh);

    // Muzzle light for enemy firing
    this.muzzleLight = new THREE.PointLight(0xff9900, 0, 4);
    this.muzzleLight.position.set(0, 0, 0.25);
    this.gunMesh.add(this.muzzleLight);

    // Set userData for Raycaster shooting detection
    this.group.userData = { enemy: this, isShootable: true };
    this.torso.userData = { enemy: this, isShootable: true };
    this.head.userData = { enemy: this, isShootable: true, isHeadshot: true };
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

    // Alert nearby guards if damaged
    if (this.state === 'PATROL') {
      this.state = 'CHASE';
      sound.playGuardAlert();
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
   * Check Line of Sight to player using Raycaster and Field of View
   */
  hasLineOfSight(playerPos, obstacles) {
    const from = this.group.position.clone();
    from.y = 1.4;
    const to = playerPos.clone();
    to.y = 1.4;
    const dir = to.clone().sub(from).normalize();
    const dist = from.distanceTo(to);

    // FOV cone check when on PATROL (guards only spot player in front of them, unless super close)
    if (this.state === 'PATROL' && dist > 2.2) {
      const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.group.rotation.y);
      const angle = forward.angleTo(dir);
      if (angle > Math.PI * 0.42) {
        // Player is outside guard's line of sight
        return false;
      }
    }

    const ray = new THREE.Raycaster(from, dir, 0.1, dist);
    const hits = ray.intersectObjects(obstacles, true);

    return hits.length === 0;
  }

  update(delta, player, obstacles, collectibles, onFeedback) {
    if (this.isDead) {
      // Death Collapse Animation: torso drops back, arms splay out
      if (this.deathTimer < 1.0) {
        this.deathTimer += delta * 2.5;
        this.group.position.y = Math.max(0.15, 1.0 - this.deathTimer * 0.85);
        this.torso.rotation.x = -Math.min(Math.PI / 2, this.deathTimer * (Math.PI / 2));
        this.leftArm.rotation.x = this.deathTimer * 0.8;
        this.rightArm.rotation.x = this.deathTimer * 0.8;
      }
      return;
    }

    const playerPos = player.camera.position.clone();
    playerPos.y = 0;
    const myPos = this.group.position.clone();
    myPos.y = 0;
    const distToPlayer = myPos.distanceTo(playerPos);

    // Update Flinch
    if (this.flinchTimer > 0) {
      this.flinchTimer -= delta;
      return;
    }

    // Check Player Detection
    const canSee = distToPlayer < 18.0 && this.hasLineOfSight(player.camera.position, obstacles);

    if (canSee) {
      if (this.state === 'PATROL') {
        sound.playGuardAlert();
        if (onFeedback) onFeedback(this.isOfficer ? 'SS Officer alerted!' : 'Guard alerted!', 'alert');
      }
      this.state = distToPlayer <= this.attackRange ? 'ATTACK' : 'CHASE';
    } else if (this.state === 'ATTACK') {
      this.state = 'CHASE';
    }

    // AI Behaviors
    if (this.state === 'PATROL') {
      const target = this.patrolPoints[this.currentPatrolIdx];
      const moveDir = target.clone().sub(myPos);
      const dist = moveDir.length();

      if (dist < 0.3) {
        this.currentPatrolIdx = (this.currentPatrolIdx + 1) % this.patrolPoints.length;
      } else {
        moveDir.normalize();
        this.group.position.addScaledVector(moveDir, this.speed * 0.5 * delta);
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, delta * 5);

        // Walk Animation
        this.walkCycle += delta * 6;
        this.leftLeg.rotation.x = Math.sin(this.walkCycle) * 0.45;
        this.rightLeg.rotation.x = -Math.sin(this.walkCycle) * 0.45;
        this.leftArm.rotation.x = -Math.sin(this.walkCycle) * 0.4;
        this.rightArm.rotation.x = Math.sin(this.walkCycle) * 0.4;
      }
    } else if (this.state === 'CHASE') {
      // Pursue player
      const moveDir = playerPos.clone().sub(myPos).normalize();
      this.group.position.addScaledVector(moveDir, this.speed * delta);
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, targetAngle, delta * 8);

      // Fast Walk Animation
      this.walkCycle += delta * 10;
      this.leftLeg.rotation.x = Math.sin(this.walkCycle) * 0.6;
      this.rightLeg.rotation.x = -Math.sin(this.walkCycle) * 0.6;
      this.leftArm.rotation.x = -Math.sin(this.walkCycle) * 0.5;
      this.rightArm.rotation.x = -0.6; // Gun raised ready to fire
    } else if (this.state === 'ATTACK') {
      // Face player directly
      const toPlayer = playerPos.clone().sub(myPos).normalize();
      this.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);

      // Aim gun animation
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.rightArm.rotation.x = -1.2; // Aim forward
      this.leftArm.rotation.x = -0.5;

      // Shooting logic
      this.fireTimer += delta;
      if (this.fireTimer >= this.fireInterval) {
        this.fireTimer = 0;

        // Fire shot
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
