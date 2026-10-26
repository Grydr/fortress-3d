import * as THREE from 'three';
import { sound } from '../core/AudioManager.js';

export class WeaponSystem {
  constructor(camera, scene, vfxManager) {
    this.camera = camera;
    this.scene = scene;
    this.vfxManager = vfxManager;

    // Raycaster for shooting & interaction
    this.raycaster = new THREE.Raycaster();
    this.centerCoord = new THREE.Vector2(0, 0);

    // Weapon Holder Parented to Camera
    this.holder = new THREE.Group();
    this.holder.name = 'PlayerWeaponRig';
    this.camera.add(this.holder);

    // Muzzle Flash PointLight attached to weapon rig
    this.muzzleLight = new THREE.PointLight(0xffaa22, 0, 5);
    this.muzzleLight.position.set(0.2, -0.15, -0.8);
    this.holder.add(this.muzzleLight);

    // Weapon Definitions
    this.weapons = {
      1: {
        id: 1,
        name: 'Combat Knife',
        ammoPerShot: 0,
        fireRate: 0.35, // seconds between attacks
        damage: 35,
        range: 2.5,
        mesh: null,
      },
      2: {
        id: 2,
        name: 'Luger P08',
        ammoPerShot: 1,
        fireRate: 0.28,
        damage: 28,
        range: 60,
        mesh: null,
      },
      3: {
        id: 3,
        name: 'MP40 Submachine Gun',
        ammoPerShot: 1,
        fireRate: 0.12, // rapid fire
        damage: 22,
        range: 60,
        mesh: null,
      },
    };

    this.currentSlot = null; // Unset until equipped
    this.cooldown = 0;
    this.recoilZ = 0;
    this.recoilRotX = 0;
    this.bobTime = 0;

    // Switch weapon animation state
    this.isSwitching = false;
    this.pendingSlot = 2;

    this.buildWeaponModels();
    this.equip(2, true);
  }

  buildWeaponModels() {
    // 1. Knife Model
    const knifeGroup = new THREE.Group();
    knifeGroup.name = 'Weapon_Knife';
    knifeGroup.position.set(0.18, -0.22, -0.38);

    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xbdc3c7,
      metalness: 0.95,
      roughness: 0.15,
    });
    const gripMat = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
      metalness: 0.2,
      roughness: 0.8,
    });

    const bladeGeo = new THREE.BoxGeometry(0.04, 0.08, 0.32);
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.z = -0.16;
    knifeGroup.add(blade);

    const gripGeo = new THREE.BoxGeometry(0.045, 0.06, 0.18);
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.z = 0.08;
    knifeGroup.add(grip);

    knifeGroup.visible = false;
    this.holder.add(knifeGroup);
    this.weapons[1].mesh = knifeGroup;

    // 2. Luger P08 Pistol Model
    const pistolGroup = new THREE.Group();
    pistolGroup.name = 'Weapon_Luger';
    pistolGroup.position.set(0.18, -0.18, -0.42);

    const gunMat = new THREE.MeshStandardMaterial({
      color: 0x2b2d42,
      metalness: 0.92,
      roughness: 0.25,
    });
    const woodGripMat = new THREE.MeshStandardMaterial({
      color: 0x5d4037,
      metalness: 0.1,
      roughness: 0.65,
    });

    // Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.35, 12);
    barrelGeo.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, gunMat);
    barrel.position.set(0, 0.04, -0.2);
    barrel.castShadow = true;
    pistolGroup.add(barrel);

    // Receiver / Toggle mechanism
    const recvGeo = new THREE.BoxGeometry(0.065, 0.075, 0.22);
    const recv = new THREE.Mesh(recvGeo, gunMat);
    recv.position.set(0, 0.03, -0.02);
    recv.castShadow = true;
    pistolGroup.add(recv);

    // Angled Grip
    const gripPistolGeo = new THREE.BoxGeometry(0.055, 0.18, 0.08);
    const gripPistol = new THREE.Mesh(gripPistolGeo, woodGripMat);
    gripPistol.position.set(0, -0.09, 0.04);
    gripPistol.rotation.x = -0.35;
    gripPistol.castShadow = true;
    pistolGroup.add(gripPistol);

    pistolGroup.visible = false;
    this.holder.add(pistolGroup);
    this.weapons[2].mesh = pistolGroup;

    // 3. MP40 Submachine Gun Model
    const smgGroup = new THREE.Group();
    smgGroup.name = 'Weapon_MP40';
    smgGroup.position.set(0.18, -0.2, -0.45);

    const smgMat = new THREE.MeshStandardMaterial({
      color: 0x263238,
      metalness: 0.88,
      roughness: 0.3,
    });

    // Receiver Body
    const smgBodyGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.55, 12);
    smgBodyGeo.rotateX(Math.PI / 2);
    const smgBody = new THREE.Mesh(smgBodyGeo, smgMat);
    smgBody.position.set(0, 0.04, -0.15);
    smgBody.castShadow = true;
    smgGroup.add(smgBody);

    // Extended Barrel & Muzzle Ring
    const smgBarrelGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 10);
    smgBarrelGeo.rotateX(Math.PI / 2);
    const smgBarrel = new THREE.Mesh(smgBarrelGeo, smgMat);
    smgBarrel.position.set(0, 0.04, -0.48);
    smgBarrel.castShadow = true;
    smgGroup.add(smgBarrel);

    // Vertical Magazine Box
    const magGeo = new THREE.BoxGeometry(0.045, 0.32, 0.07);
    const mag = new THREE.Mesh(magGeo, smgMat);
    mag.position.set(0, -0.14, -0.12);
    mag.castShadow = true;
    smgGroup.add(mag);

    // Pistol Grip
    const smgGripGeo = new THREE.BoxGeometry(0.05, 0.16, 0.07);
    const smgGrip = new THREE.Mesh(smgGripGeo, woodGripMat);
    smgGrip.position.set(0, -0.09, 0.1);
    smgGrip.rotation.x = -0.3;
    smgGrip.castShadow = true;
    smgGroup.add(smgGrip);

    smgGroup.visible = false;
    this.holder.add(smgGroup);
    this.weapons[3].mesh = smgGroup;
  }

  equip(slot, immediate = false) {
    if (this.currentSlot === slot && !this.isSwitching && !immediate) return;
    if (immediate) {
      if (this.currentSlot && this.weapons[this.currentSlot]?.mesh) {
        this.weapons[this.currentSlot].mesh.visible = false;
      }
      this.currentSlot = slot;
      if (this.weapons[this.currentSlot]?.mesh) {
        this.weapons[this.currentSlot].mesh.visible = true;
        const basePos = this.currentSlot === 1 ? -0.22 : this.currentSlot === 2 ? -0.18 : -0.2;
        this.weapons[this.currentSlot].mesh.position.y = basePos;
      }
      this.isSwitching = false;
      return;
    }
    this.pendingSlot = slot;
    this.isSwitching = true;
  }

  /**
   * Shoot primary attack (Raycaster Hitscan)
   */
  shoot(player, shootables, onHitFeedback) {
    if (this.cooldown > 0 || this.isSwitching) return;

    const currentWep = this.weapons[this.currentSlot];

    // Check ammo
    if (currentWep.ammoPerShot > 0) {
      if (player.ammo < currentWep.ammoPerShot) {
        sound.playDoorLocked(); // Out of ammo click
        return;
      }
      player.ammo -= currentWep.ammoPerShot;
    }

    // Set cooldown
    this.cooldown = currentWep.fireRate;

    // Audio and VFX
    if (this.currentSlot === 1) {
      sound.playKnife(false);
      this.recoilZ = 0.12;
      this.recoilRotX = 0.3;
    } else if (this.currentSlot === 2) {
      sound.playPistol();
      this.recoilZ = 0.08;
      this.recoilRotX = 0.22;
      // Muzzle flash
      const muzzleWorldPos = new THREE.Vector3();
      this.muzzleLight.getWorldPosition(muzzleWorldPos);
      this.vfxManager.createMuzzleFlash(muzzleWorldPos, this.muzzleLight);
    } else if (this.currentSlot === 3) {
      sound.playMachineGun();
      this.recoilZ = 0.06;
      this.recoilRotX = 0.15;
      const muzzleWorldPos = new THREE.Vector3();
      this.muzzleLight.getWorldPosition(muzzleWorldPos);
      this.vfxManager.createMuzzleFlash(muzzleWorldPos, this.muzzleLight);
    }

    // Raycast hitscan
    this.raycaster.setFromCamera(this.centerCoord, this.camera);
    this.raycaster.far = currentWep.range;

    const hits = this.raycaster.intersectObjects(shootables, true);

    // Calculate target endpoint for bullet tracer & trailing effect
    let targetPoint;
    if (hits.length > 0) {
      targetPoint = hits[0].point.clone();
    } else {
      targetPoint = this.raycaster.ray.origin.clone().add(
        this.raycaster.ray.direction.clone().multiplyScalar(currentWep.range)
      );
    }

    // Spawn Bullet Tracer & Trailing Effect for Firearms (Luger P08 & MP40)
    if (this.currentSlot === 2 || this.currentSlot === 3) {
      const muzzleWorldPos = new THREE.Vector3();
      this.muzzleLight.getWorldPosition(muzzleWorldPos);
      this.vfxManager.createBulletTracer(muzzleWorldPos, targetPoint, true);
    }

    if (hits.length > 0) {
      const hit = hits[0];
      const hitPoint = hit.point;
      const hitNormal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 1, 0);

      // 1. Check if hit Enemy
      let enemy = hit.object.userData?.enemy;
      let curr = hit.object;
      while (!enemy && curr.parent) {
        curr = curr.parent;
        enemy = curr.userData?.enemy;
      }

      if (enemy && !enemy.isDead) {
        sound.playFleshHit();
        this.vfxManager.createBloodSplatter(hitPoint);
        enemy.takeDamage(currentWep.damage, player, this.vfxManager);
        if (onHitFeedback) onHitFeedback('enemy_hit');
        return;
      }

      // 2. Check if hit Explosive Barrel
      let barrel = hit.object.userData?.barrel;
      if (barrel && !barrel.isExploded) {
        barrel.health -= currentWep.damage;
        this.vfxManager.createWallImpact(hitPoint, hitNormal);
        if (barrel.health <= 0) {
          if (onHitFeedback) onHitFeedback('barrel_explode', barrel);
        }
        return;
      }

      // 3. Hit Castle Wall / Door / Floor
      sound.playWallHit();
      this.vfxManager.createWallImpact(hitPoint, hitNormal);
      if (onHitFeedback) onHitFeedback('wall_hit');
    }
  }

  /**
   * Update weapon animations (recoil recovery, walking bobbing, switching)
   */
  update(delta, isMoving, isSprinting) {
    // Cooldown
    if (this.cooldown > 0) {
      this.cooldown = Math.max(0, this.cooldown - delta);
    }

    // Weapon Switching Animation (lower down then bring up new)
    if (this.isSwitching) {
      const currentMesh = this.weapons[this.currentSlot]?.mesh;
      if (currentMesh) {
        currentMesh.position.y -= delta * 3.5;
        if (currentMesh.position.y < -0.65) {
          currentMesh.visible = false;
          this.currentSlot = this.pendingSlot;
          const nextMesh = this.weapons[this.currentSlot]?.mesh;
          if (nextMesh) {
            nextMesh.visible = true;
            nextMesh.position.y = -0.65;
          }
          this.isSwitching = false;
        }
      } else {
        this.currentSlot = this.pendingSlot;
        this.isSwitching = false;
      }
    }

    // Walking Bobbing Animation
    if (isMoving && !this.isSwitching) {
      const freq = isSprinting ? 14 : 9;
      this.bobTime += delta * freq;
      this.holder.position.x = Math.sin(this.bobTime) * 0.015;
      this.holder.position.y = -Math.abs(Math.sin(this.bobTime)) * 0.015;
    } else {
      this.holder.position.x = THREE.MathUtils.lerp(this.holder.position.x, 0, delta * 8);
      this.holder.position.y = THREE.MathUtils.lerp(this.holder.position.y, 0, delta * 8);
    }

    // Recoil Spring Return Animation
    this.recoilZ = THREE.MathUtils.lerp(this.recoilZ, 0, delta * 12);
    this.recoilRotX = THREE.MathUtils.lerp(this.recoilRotX, 0, delta * 12);

    const activeMesh = this.weapons[this.currentSlot]?.mesh;
    if (activeMesh && !this.isSwitching) {
      const basePos = this.currentSlot === 1 ? -0.22 : this.currentSlot === 2 ? -0.18 : -0.2;
      activeMesh.position.y = THREE.MathUtils.lerp(activeMesh.position.y, basePos, delta * 10);
      activeMesh.position.z = THREE.MathUtils.lerp(
        activeMesh.position.z,
        (this.currentSlot === 1 ? -0.38 : this.currentSlot === 2 ? -0.42 : -0.45) + this.recoilZ,
        delta * 20
      );
      activeMesh.rotation.x = -this.recoilRotX;
    }
  }
}
