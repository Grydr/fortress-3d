import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { sound } from '../core/AudioManager.js';
import { TextureGenerator } from '../core/TextureGenerator.js';
import { TILE_SIZE } from './MapData.js';

export class CollectibleManager {
  constructor(scene, vfxManager) {
    this.scene = scene;
    this.vfxManager = vfxManager;
    this.items = [];
    this.barrels = [];
    this.gltfLoader = new GLTFLoader();

    // Cache loaded GLTF templates
    this.gltfCache = new Map();

    // Retired aura lights stay in the scene at zero intensity. Adding/removing lights
    // changes the scene light count, which forces Three.js to recompile every shader
    // (a visible freeze on pickup). Reusing lights keeps the count constant.
    // One spare is pre-allocated for the Gold Key the Commander drops mid-game.
    this.spareLights = [];
    this.retireLight(new THREE.PointLight(0xffffff, 0, 2.5));
  }

  retireLight(light) {
    light.intensity = 0;
    this.scene.attach(light);
    this.spareLights.push(light);
  }

  acquireLight(color) {
    const light = this.spareLights.pop() || new THREE.PointLight(color, 0.9, 2.5);
    light.color.setHex(color);
    light.intensity = 0.9;
    light.distance = 2.5;
    return light;
  }

  async loadGLTFModels() {
    const baseUrl = import.meta.env?.BASE_URL || './';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    const modelsToLoad = [
      { name: 'wolf_relic', path: `${cleanBase}assets/models/wolf_relic.glb` },
      { name: 'gold_key', path: `${cleanBase}assets/models/gold_key.glb` },
      { name: 'medkit', path: `${cleanBase}assets/models/medkit.glb` },
    ];

    for (const m of modelsToLoad) {
      try {
        const gltf = await this.gltfLoader.loadAsync(m.path);
        // Enable shadows and PBR materials
        gltf.scene.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            if (node.material) {
              node.material.roughness = node.material.roughness ?? 0.3;
              node.material.metalness = node.material.metalness ?? 0.8;
            }
          }
        });
        this.gltfCache.set(m.name, gltf.scene);
        console.log(`GLTF Model loaded successfully: ${m.name}`);
      } catch (err) {
        console.warn(`Failed to load GLTF ${m.name}, using procedural fallback:`, err);
      }
    }
  }

  /**
   * Spawn a Collectible item in the world
   */
  spawnItem(type, gridX, gridZ) {
    const worldX = gridX * TILE_SIZE + TILE_SIZE / 2;
    const worldZ = gridZ * TILE_SIZE + TILE_SIZE / 2;

    const group = new THREE.Group();
    group.position.set(worldX, 0.45, worldZ);

    let mesh = null;
    let lightColor = null;

    if (type === 'relic') {
      // Ancient Wolfenstein Eagle Relic (GLTF Asset)
      const cached = this.gltfCache.get('wolf_relic');
      if (cached) {
        mesh = cached.clone(true);
        mesh.scale.set(1.4, 1.4, 1.4);
      } else {
        // Fallback procedural chalice
        const chaliceGeo = new THREE.CylinderGeometry(0.35, 0.2, 0.7, 16);
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.2 });
        mesh = new THREE.Mesh(chaliceGeo, goldMat);
      }
      lightColor = 0xffd700;

      // Pedestal underneath relic
      const pedGeo = new THREE.CylinderGeometry(0.6, 0.7, 0.35, 16);
      const pedMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.6, metalness: 0.3 });
      const ped = new THREE.Mesh(pedGeo, pedMat);
      ped.position.y = -0.25;
      ped.receiveShadow = true;
      group.add(ped);
    } else if (type === 'silver_key' || type === 'gold_key') {
      const isGold = type === 'gold_key';
      const cached = isGold ? this.gltfCache.get('gold_key') : null;
      if (cached) {
        mesh = cached.clone(true);
        mesh.scale.set(1.0, 1.0, 1.0);
      } else {
        // Procedural Key
        const keyGroup = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({
          color: isGold ? 0xffca28 : 0xdfe6e9,
          metalness: 0.9,
          roughness: 0.2,
        });
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6), mat);
        shaft.rotation.z = Math.PI / 2;
        keyGroup.add(shaft);

        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 8, 16), mat);
        ring.position.x = -0.35;
        keyGroup.add(ring);

        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.03), mat);
        tooth.position.set(0.2, -0.06, 0);
        keyGroup.add(tooth);
        mesh = keyGroup;
      }
      lightColor = isGold ? 0xffca28 : 0x74b9ff;
    } else if (type === 'medkit') {
      const cached = this.gltfCache.get('medkit');
      if (cached) {
        mesh = cached.clone(true);
        mesh.scale.set(0.9, 0.9, 0.9);
      } else {
        const boxGeo = new THREE.BoxGeometry(0.5, 0.35, 0.25);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, roughness: 0.4 });
        mesh = new THREE.Mesh(boxGeo, boxMat);
      }
      lightColor = 0x2ecc71;
    } else if (type === 'ammo') {
      // Military Ammo Tin
      const ammoGeo = new THREE.BoxGeometry(0.45, 0.3, 0.25);
      const ammoMat = new THREE.MeshStandardMaterial({
        color: 0x27ae60, // Olive Drab
        roughness: 0.5,
        metalness: 0.5,
      });
      mesh = new THREE.Mesh(ammoGeo, ammoMat);

      // Yellow Stencil Stripe
      const stripeGeo = new THREE.BoxGeometry(0.46, 0.08, 0.26);
      const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.4 });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      mesh.add(stripe);

      lightColor = 0xf1c40f;
    } else if (type === 'gold_chalice') {
      const cupGeo = new THREE.CylinderGeometry(0.25, 0.12, 0.45, 12);
      const cupMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.95, roughness: 0.15 });
      mesh = new THREE.Mesh(cupGeo, cupMat);
      lightColor = 0xffd700;
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Glowing aura point light for key quest items
    let auraLight = null;
    if (lightColor) {
      auraLight = this.acquireLight(lightColor);
      auraLight.position.set(0, 0.2, 0);
      group.add(auraLight);
    }

    this.scene.add(group);

    const item = {
      type,
      group,
      mesh,
      auraLight,
      baseY: group.position.y,
      gridX,
      gridZ,
      radius: 0.8,
      isCollected: false,
      bobOffset: Math.random() * Math.PI * 2,
    };

    this.items.push(item);
    return item;
  }

  /**
   * Spawn an Explosive Red Fuel Barrel
   */
  spawnBarrel(gridX, gridZ) {
    const worldX = gridX * TILE_SIZE + TILE_SIZE / 2;
    const worldZ = gridZ * TILE_SIZE + TILE_SIZE / 2;

    const barrelTex = TextureGenerator.getBarrelTexture();
    const barrelGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.4, 20);
    const barrelMat = new THREE.MeshStandardMaterial({
      map: barrelTex,
      roughness: 0.4,
      metalness: 0.6,
    });

    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.position.set(worldX, 0.7, worldZ);
    barrel.castShadow = true;
    barrel.receiveShadow = true;

    // Metadata for Raycaster hit
    const barrelData = {
      mesh: barrel,
      gridX,
      gridZ,
      health: 20,
      isExploded: false,
      radius: 0.7,
    };
    barrel.userData = { barrel: barrelData, isShootable: true, isInteractable: false };

    this.scene.add(barrel);
    this.barrels.push(barrelData);
    return barrelData;
  }

  /**
   * Explode a barrel (triggered by Raycaster bullet hit or chain reaction)
   */
  explodeBarrel(barrelData, enemies, player, onFeedback) {
    if (barrelData.isExploded) return;
    barrelData.isExploded = true;

    const pos = barrelData.mesh.position.clone();
    this.scene.remove(barrelData.mesh);
    barrelData.mesh.geometry.dispose();

    // Sound & VFX
    sound.playExplosion();
    this.vfxManager.createExplosion(pos);

    // Area of effect damage (radius 4.5 units)
    const blastRadius = 4.5;
    const maxDamage = 90;

    // Damage nearby enemies
    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      const dist = pos.distanceTo(enemy.group.position);
      if (dist < blastRadius) {
        const falloff = 1 - dist / blastRadius;
        const dmg = Math.floor(maxDamage * falloff);
        enemy.takeDamage(dmg, null, this.vfxManager);
      }
    }

    // Damage player if too close
    if (player) {
      const dist = pos.distanceTo(player.camera.position);
      if (dist < blastRadius) {
        const falloff = 1 - dist / blastRadius;
        const dmg = Math.floor(60 * falloff);
        player.takeDamage(dmg);
        if (onFeedback) onFeedback(`Caught in explosion blast! (-${dmg} HP)`, 'error');
      }
    }

    // Chain reaction with neighboring barrels
    for (const other of this.barrels) {
      if (!other.isExploded && other !== barrelData) {
        const dist = pos.distanceTo(other.mesh.position);
        if (dist < blastRadius) {
          setTimeout(() => {
            this.explodeBarrel(other, enemies, player, onFeedback);
          }, 120);
        }
      }
    }
  }

  /**
   * Check player proximity collection and update item animations
   */
  update(delta, player, onFeedback) {
    const time = performance.now() * 0.003;

    // Update collectible items
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      if (item.isCollected) continue;

      // Bobbing & Rotation Animation
      item.mesh.rotation.y += delta * 1.8;
      item.group.position.y = item.baseY + Math.sin(time * 3 + item.bobOffset) * 0.08;

      // Check pickup collision with player
      const dist = item.group.position.distanceTo(player.camera.position);
      if (dist < item.radius + 0.6) {
        let pickedUp = false;

        switch (item.type) {
          case 'silver_key':
            player.inventory.hasSilverKey = true;
            sound.playKeyPickup();
            if (onFeedback) onFeedback('Acquired Silver Key! Sector B Unlocked.', 'success');
            pickedUp = true;
            break;

          case 'gold_key':
            player.inventory.hasGoldKey = true;
            sound.playKeyPickup();
            if (onFeedback) onFeedback('Acquired Gold Key! Castle Vault Access Granted.', 'success');
            pickedUp = true;
            break;

          case 'medkit':
            if (player.health < 100) {
              player.health = Math.min(100, player.health + 25);
              sound.playHealthPickup();
              if (onFeedback) onFeedback('Picked up First Aid Medkit (+25 HP)', 'heal');
              pickedUp = true;
            }
            break;

          case 'ammo':
            player.ammo = Math.min(99, player.ammo + 25);
            sound.playAmmoPickup();
            if (onFeedback) onFeedback('Picked up Military Ammo Tin (+25 Bullets)', 'ammo');
            pickedUp = true;
            break;

          case 'gold_chalice':
            player.score += 500;
            sound.playKeyPickup();
            if (onFeedback) onFeedback('Found Golden Chalice Treasure! (+500 PTS)', 'gold');
            pickedUp = true;
            break;

          case 'relic':
            player.score += 2000;
            player.hasFoundRelic = true;
            sound.playRelicFound();
            if (onFeedback) onFeedback('SECRET DISCOVERED: Castle Wolfenstein Eagle Relic! (+2000 PTS)', 'special');
            pickedUp = true;
            break;
        }

        if (pickedUp) {
          item.isCollected = true;
          if (item.auraLight) this.retireLight(item.auraLight);
          this.scene.remove(item.group);
          this.items.splice(i, 1);
        }
      }
    }
  }

  isBarrelBlocking(pos, radius = 0.4) {
    for (const b of this.barrels) {
      if (b.isExploded) continue;
      const dist = Math.hypot(pos.x - b.mesh.position.x, pos.z - b.mesh.position.z);
      if (dist < b.radius + radius) {
        return true;
      }
    }
    return false;
  }
}
