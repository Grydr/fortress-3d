import * as THREE from 'three';
import { TextureGenerator } from '../core/TextureGenerator.js';

export class VFXManager {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.shockwaves = [];
    this.tracers = [];
    this.torches = [];
    this.portalVFX = null;

    // Persistent explosion flash light (kept in scene at zero intensity so the
    // light count never changes, which would trigger a full shader recompile)
    this.flashLight = new THREE.PointLight(0xff6600, 0, 10);
    this.flashTimer = 0;
    this.scene.add(this.flashLight);

    this.radialTexture = TextureGenerator.getRadialParticle();
    this.bloodTexture = TextureGenerator.getBloodParticle();
    this.smokeTexture = TextureGenerator.getSmokeParticle();
  }

  /**
   * High-Impact 3D Bullet Tracer & Lingering Vapor Trail
   * Allows player and enemy shots to be visually traced across 3D space.
   */
  createBulletTracer(startPos, endPos, isPlayer = true) {
    const dist = startPos.distanceTo(endPos);
    if (dist < 0.2) return;

    const dir = endPos.clone().sub(startPos).normalize();
    const midPoint = startPos.clone().add(endPos).multiplyScalar(0.5);

    // 1. Persistent Glowing Tracer Trail Beam (slender cylinder oriented along trajectory)
    const beamRadius = isPlayer ? 0.022 : 0.026;
    const beamGeo = new THREE.CylinderGeometry(beamRadius, beamRadius, dist, 5, 1, true);
    const beamColor = isPlayer ? 0xffb833 : 0xff3311;
    const beamMat = new THREE.MeshBasicMaterial({
      color: beamColor,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.copy(midPoint);
    beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

    // Inner Core Beam (Brilliant intense luminous core)
    const coreRadius = beamRadius * 0.45;
    const coreGeo = new THREE.CylinderGeometry(coreRadius, coreRadius, dist, 4, 1, true);
    const coreColor = isPlayer ? 0xffffff : 0xffe0bb;
    const coreMat = new THREE.MeshBasicMaterial({
      color: coreColor,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    beamMesh.add(coreMesh);

    this.scene.add(beamMesh);

    // 2. High-Speed Luminous Bullet Slug (Streaks rapidly from start to end)
    const slugRadius = isPlayer ? 0.045 : 0.055;
    const slugGeo = new THREE.SphereGeometry(slugRadius, 6, 6);
    const slugMat = new THREE.MeshBasicMaterial({
      color: isPlayer ? 0xffffff : 0xffaa66,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const slugMesh = new THREE.Mesh(slugGeo, slugMat);
    slugMesh.position.copy(startPos);
    this.scene.add(slugMesh);

    // 3. Register Tracer into this.tracers
    this.tracers.push({
      beamMesh,
      beamMat,
      coreMesh,
      coreMat,
      slugMesh,
      slugMat,
      start: startPos.clone(),
      end: endPos.clone(),
      dist,
      speed: isPlayer ? 140.0 : 90.0,
      slugProgress: 0,
      slugAlive: true,
      life: 0.28,
      maxLife: 0.28,
    });

    // 4. Subtle Smoke Trail Wisps (2-3 drifting micro-puffs along the trajectory)
    const numWisps = Math.min(4, Math.floor(dist / 4));
    for (let i = 1; i <= numWisps; i++) {
      const fraction = i / (numWisps + 1);
      const wispPos = startPos.clone().lerp(endPos, fraction);
      wispPos.x += (Math.random() - 0.5) * 0.08;
      wispPos.y += (Math.random() - 0.5) * 0.08;
      wispPos.z += (Math.random() - 0.5) * 0.08;

      const wispGeo = new THREE.PlaneGeometry(0.12, 0.12);
      const wispMat = new THREE.MeshBasicMaterial({
        map: this.smokeTexture,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const wispMesh = new THREE.Mesh(wispGeo, wispMat);
      wispMesh.position.copy(wispPos);
      this.scene.add(wispMesh);

      this.particles.push({
        mesh: wispMesh,
        mat: wispMat,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.15,
          0.15 + Math.random() * 0.2,
          (Math.random() - 0.5) * 0.15
        ),
        life: 0.35 + Math.random() * 0.15,
        maxLife: 0.5,
        scaleSpeed: 0.3,
      });
    }
  }

  /**
   * Muzzle Flash VFX: Brief light pulse + radial flash sprite
   */
  createMuzzleFlash(position, lightRef) {
    if (lightRef) {
      lightRef.intensity = 3.5;
      lightRef.visible = true;
      setTimeout(() => {
        if (lightRef) lightRef.intensity = 0;
      }, 55);
    }

    // Spark particles
    const count = 8;
    for (let i = 0; i < count; i++) {
      const geo = new THREE.PlaneGeometry(0.06, 0.06);
      const mat = new THREE.MeshBasicMaterial({
        map: this.radialTexture,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2.0;
      const vx = Math.cos(angle) * speed;
      const vy = (Math.random() - 0.5) * speed;
      const vz = Math.sin(angle) * speed;

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        mat,
        vel: new THREE.Vector3(vx, vy, vz),
        life: 0.12,
        maxLife: 0.12,
        scaleSpeed: -0.2,
      });
    }
  }

  /**
   * Bullet Impact Sparks on Walls / Metal
   */
  createWallImpact(position, normal) {
    const sparkCount = 14;
    for (let i = 0; i < sparkCount; i++) {
      const geo = new THREE.PlaneGeometry(0.04, 0.04);
      const mat = new THREE.MeshBasicMaterial({
        map: this.radialTexture,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      // Bounce velocity along surface normal + random spread
      const vel = normal.clone().multiplyScalar(2.0 + Math.random() * 2.5);
      vel.x += (Math.random() - 0.5) * 2.5;
      vel.y += (Math.random() - 0.2) * 2.5;
      vel.z += (Math.random() - 0.5) * 2.5;

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        mat,
        vel,
        gravity: -6.0,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.5,
      });
    }

    // Wall Dust Cloud
    const dustGeo = new THREE.PlaneGeometry(0.2, 0.2);
    const dustMat = new THREE.MeshBasicMaterial({
      map: this.smokeTexture,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const dust = new THREE.Mesh(dustGeo, dustMat);
    dust.position.copy(position).add(normal.clone().multiplyScalar(0.05));
    this.scene.add(dust);

    this.particles.push({
      mesh: dust,
      mat: dustMat,
      vel: normal.clone().multiplyScalar(0.3),
      life: 0.45,
      maxLife: 0.45,
      scaleSpeed: 0.8,
    });
  }

  /**
   * Blood Splatter VFX on Enemy Hit
   */
  createBloodSplatter(position) {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const size = 0.08 + Math.random() * 0.07;
      const geo = new THREE.PlaneGeometry(size, size);
      const mat = new THREE.MeshBasicMaterial({
        map: this.bloodTexture,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const vx = (Math.random() - 0.5) * 2.2;
      const vy = 0.5 + Math.random() * 1.8;
      const vz = (Math.random() - 0.5) * 2.2;

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        mat,
        vel: new THREE.Vector3(vx, vy, vz),
        gravity: -7.5,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.6,
      });
    }
  }

  /**
   * Explosive Barrel Detonation VFX: Fireball, Shockwave, and Smoke Plume
   */
  createExplosion(position) {
    // 1. Dynamic Flash Light
    this.flashLight.position.copy(position);
    this.flashLight.intensity = 8.0;
    this.flashTimer = 0.2;

    // 2. Expanding Shockwave Ring
    const ringGeo = new THREE.RingGeometry(0.1, 0.4, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.copy(position);
    ringMesh.position.y = 0.1;
    this.scene.add(ringMesh);

    this.shockwaves.push({
      mesh: ringMesh,
      mat: ringMat,
      scale: 1,
      speed: 16.0,
      life: 0.4,
      maxLife: 0.4,
    });

    // 3. Fireball Cloud Particles
    const fireCount = 28;
    for (let i = 0; i < fireCount; i++) {
      const size = 0.35 + Math.random() * 0.45;
      const geo = new THREE.PlaneGeometry(size, size);
      const mat = new THREE.MeshBasicMaterial({
        map: this.radialTexture,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.3) * Math.PI;
      const speed = 2.5 + Math.random() * 4.0;
      const vx = Math.cos(theta) * Math.cos(phi) * speed;
      const vy = Math.abs(Math.sin(phi) * speed) + 1.0;
      const vz = Math.sin(theta) * Math.cos(phi) * speed;

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        mat,
        vel: new THREE.Vector3(vx, vy, vz),
        gravity: 0.5, // heat rises
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        scaleSpeed: 1.5,
      });
    }

    // 4. Smoke Plume Particles
    const smokeCount = 18;
    for (let i = 0; i < smokeCount; i++) {
      const size = 0.5 + Math.random() * 0.5;
      const geo = new THREE.PlaneGeometry(size, size);
      const mat = new THREE.MeshBasicMaterial({
        map: this.smokeTexture,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const vx = (Math.random() - 0.5) * 1.5;
      const vy = 1.5 + Math.random() * 2.2;
      const vz = (Math.random() - 0.5) * 1.5;

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        mat,
        vel: new THREE.Vector3(vx, vy, vz),
        life: 0.7 + Math.random() * 0.4,
        maxLife: 1.1,
        scaleSpeed: 1.2,
      });
    }
  }

  /**
   * Register a Wall Torch for continuous flame & ember particle animation
   */
  registerTorch(torchGroup, pointLight) {
    this.torches.push({
      group: torchGroup,
      light: pointLight,
      baseIntensity: pointLight.intensity,
      flickerOffset: Math.random() * 100,
      spawnTimer: 0,
    });
  }

  /**
   * Create Exit Elevator Portal Glow VFX
   */
  createElevatorPortal(position) {
    const portalGroup = new THREE.Group();
    portalGroup.position.copy(position);

    // Glowing vertical cylinder / beam
    const beamGeo = new THREE.CylinderGeometry(0.8, 0.8, 3.2, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 1.6;
    portalGroup.add(beam);

    // Rotating Energy Rings
    const ring1Geo = new THREE.TorusGeometry(0.85, 0.03, 8, 24);
    ring1Geo.rotateX(Math.PI / 2);
    const ring1Mat = new THREE.MeshBasicMaterial({
      color: 0x76ffff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.position.y = 0.5;
    portalGroup.add(ring1);

    const ring2 = ring1.clone();
    ring2.position.y = 1.8;
    portalGroup.add(ring2);

    // Light beacon
    const portalLight = new THREE.PointLight(0x00e5ff, 2.5, 6.0);
    portalLight.position.y = 1.6;
    portalGroup.add(portalLight);

    this.scene.add(portalGroup);

    this.portalVFX = {
      group: portalGroup,
      beam,
      ring1,
      ring2,
      light: portalLight,
      time: 0,
    };
  }

  /**
   * Frame update for all particles, torches, and portal animations
   */
  update(delta, camera) {
    // 0. Fade explosion flash
    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - delta);
      this.flashLight.intensity = (this.flashTimer / 0.2) * 8.0;
    }

    // 1. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mat.dispose();
        this.particles.splice(i, 1);
        continue;
      }

      // Physics velocity and gravity
      if (p.vel) {
        p.mesh.position.addScaledVector(p.vel, delta);
        if (p.gravity) p.vel.y += p.gravity * delta;
      }

      // Scaling
      if (p.scaleSpeed) {
        const s = Math.max(0.01, p.mesh.scale.x + p.scaleSpeed * delta);
        p.mesh.scale.set(s, s, s);
      }

      // Fade out
      const progress = p.life / p.maxLife;
      p.mat.opacity = progress;

      // Face camera (billboard)
      if (camera) {
        p.mesh.quaternion.copy(camera.quaternion);
      }
    }

    // 2. Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= delta;
      if (sw.life <= 0) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        sw.mat.dispose();
        this.shockwaves.splice(i, 1);
        continue;
      }

      sw.scale += sw.speed * delta;
      sw.mesh.scale.set(sw.scale, sw.scale, sw.scale);
      sw.mat.opacity = (sw.life / sw.maxLife) * 0.85;
    }

    // 3. Update Bullet Tracers & Lingering Vapor Trails
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];

      // Update High-Speed Bullet Slug
      if (t.slugAlive) {
        t.slugProgress += (t.speed * delta) / t.dist;
        if (t.slugProgress >= 1.0) {
          t.slugAlive = false;
          this.scene.remove(t.slugMesh);
          t.slugMesh.geometry.dispose();
          t.slugMat.dispose();
        } else {
          t.slugMesh.position.lerpVectors(t.start, t.end, t.slugProgress);
        }
      }

      // Fade Out Lingering Trail Beam
      t.life -= delta;
      if (t.life <= 0) {
        this.scene.remove(t.beamMesh);
        t.beamMesh.geometry.dispose();
        t.beamMat.dispose();
        t.coreMesh.geometry.dispose();
        t.coreMat.dispose();
        if (t.slugAlive) {
          this.scene.remove(t.slugMesh);
          t.slugMesh.geometry.dispose();
          t.slugMat.dispose();
        }
        this.tracers.splice(i, 1);
        continue;
      }

      const factor = t.life / t.maxLife;
      t.beamMat.opacity = Math.pow(factor, 1.4) * 0.85;
      t.coreMat.opacity = Math.pow(factor, 1.8) * 0.95;
      const expandScale = 1.0 + (1.0 - factor) * 1.8;
      t.beamMesh.scale.x = expandScale;
      t.beamMesh.scale.z = expandScale;
    }

    // 4. Torch Sconces: Flame flicker and ember spawn
    const timeNow = performance.now() * 0.005;
    for (const torch of this.torches) {
      // Natural torch flickering with Perlin-like sin waves
      const flicker =
        Math.sin(timeNow * 6 + torch.flickerOffset) * 0.25 +
        Math.sin(timeNow * 13 + torch.flickerOffset * 2) * 0.15;
      torch.light.intensity = torch.baseIntensity + flicker;

      // Spawn occasional rising ember
      torch.spawnTimer += delta;
      if (torch.spawnTimer > 0.08) {
        torch.spawnTimer = 0;
        const emberGeo = new THREE.PlaneGeometry(0.035, 0.035);
        const emberMat = new THREE.MeshBasicMaterial({
          map: this.radialTexture,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const ember = new THREE.Mesh(emberGeo, emberMat);
        ember.position.copy(torch.group.position);
        ember.position.y += 0.35 + (Math.random() - 0.5) * 0.1;
        ember.position.x += (Math.random() - 0.5) * 0.1;
        ember.position.z += (Math.random() - 0.5) * 0.1;

        this.scene.add(ember);
        this.particles.push({
          mesh: ember,
          mat: emberMat,
          vel: new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            0.6 + Math.random() * 0.5,
            (Math.random() - 0.5) * 0.2
          ),
          life: 0.45 + Math.random() * 0.3,
          maxLife: 0.75,
          scaleSpeed: -0.04,
        });
      }
    }

    // 4. Update Portal VFX
    if (this.portalVFX) {
      this.portalVFX.time += delta;
      this.portalVFX.ring1.rotation.z += delta * 1.5;
      this.portalVFX.ring2.rotation.z -= delta * 1.2;
      this.portalVFX.ring1.position.y = 0.5 + Math.sin(this.portalVFX.time * 3) * 0.15;
      this.portalVFX.ring2.position.y = 1.8 + Math.cos(this.portalVFX.time * 3) * 0.15;
      this.portalVFX.beam.rotation.y += delta * 0.5;
      this.portalVFX.light.intensity = 2.5 + Math.sin(this.portalVFX.time * 5) * 0.8;
    }
  }

  dispose() {
    for (const p of this.particles) {
      if (p.mesh) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mat.dispose();
      }
    }
    this.particles = [];
    for (const sw of this.shockwaves) {
      this.scene.remove(sw.mesh);
      sw.mesh.geometry.dispose();
      sw.mat.dispose();
    }
    this.shockwaves = [];
    for (const t of this.tracers) {
      if (t.beamMesh) {
        this.scene.remove(t.beamMesh);
        t.beamMesh.geometry.dispose();
        t.beamMat.dispose();
        t.coreMesh.geometry.dispose();
        t.coreMat.dispose();
      }
      if (t.slugAlive && t.slugMesh) {
        this.scene.remove(t.slugMesh);
        t.slugMesh.geometry.dispose();
        t.slugMat.dispose();
      }
    }
    this.tracers = [];
    this.flashTimer = 0;
    this.flashLight.intensity = 0;
  }
}
