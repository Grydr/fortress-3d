import * as THREE from 'three';
import { sound } from './core/AudioManager.js';
import { InputManager } from './core/InputManager.js';
import { VFXManager } from './game/VFXManager.js';
import { CollectibleManager } from './game/Collectibles.js';
import { LevelBuilder } from './game/LevelBuilder.js';
import { Player } from './game/Player.js';
import { HUD } from './ui/HUD.js';
import { TILE_SIZE } from './game/MapData.js';

class GameApp {
  constructor() {
    this.gameState = 'PLAYING'; // 'PLAYING', 'PAUSED', 'GAMEOVER', 'VICTORY'
    this.gameTime = 0;
    this.lastTime = performance.now();
    this.isReady = false;

    this.initThree();
    this.initSystems().then(() => {
      this.isReady = true;
      this.bindEvents();
      this.startLoop();
    });
  }

  initThree() {
    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 150);
    this.scene.add(this.camera);

    // 3. Renderer with PBR tone mapping & PCF shadow map
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    document.getElementById('app').appendChild(this.renderer.domElement);
  }

  async initSystems() {
    // 1. UI / HUD
    this.hud = new HUD(document.getElementById('app'));

    // 2. Input Manager
    this.input = new InputManager(this.renderer.domElement);

    // 3. VFX Manager
    this.vfx = new VFXManager(this.scene);

    // 4. Collectibles & GLTF Loader
    this.collectibles = new CollectibleManager(this.scene, this.vfx);
    await this.collectibles.loadGLTFModels();

    // 5. Player
    this.player = new Player(this.camera, this.scene, this.vfx, this.input);

    // 6. Level Builder (Walls, Doors, Enemies, Lights)
    this.level = new LevelBuilder(this.scene, this.vfx, this.collectibles);
    this.level.buildLevel();

    // Setup input callbacks
    this.setupInputHandlers();

    // Welcome notification
    this.hud.showNotification('ESC: Pause / Menu • WASD: Move • Mouse: Look • Click: Shoot', 'normal');
    setTimeout(() => {
      this.hud.showNotification('OBJECTIVE: Escape Castle Wolfenstein! Find the Keys.', 'special');
    }, 2500);

    // Start atmospheric synth drone on first user interaction
    const startAudioOnce = () => {
      sound.init();
      sound.startAmbientDrone();
      window.removeEventListener('click', startAudioOnce);
      window.removeEventListener('keydown', startAudioOnce);
    };
    window.addEventListener('click', startAudioOnce);
    window.addEventListener('keydown', startAudioOnce);
  }

  setupInputHandlers() {
    // Shoot trigger
    this.input.onShoot = () => {
      if (this.gameState !== 'PLAYING') return;
      this.player.weapon.shoot(
        this.player,
        this.level.shootableMeshes,
        (hitType, barrel) => {
          if (hitType === 'enemy_hit') {
            this.hud.triggerHitmarker();
          } else if (hitType === 'barrel_explode' && barrel) {
            this.collectibles.explodeBarrel(
              barrel,
              this.level.enemies,
              this.player,
              (msg, type) => this.hud.showNotification(msg, type)
            );
          }
        }
      );
    };

    // Interact trigger (E / Space)
    this.input.onInteract = () => {
      if (this.gameState !== 'PLAYING') return;
      this.player.interact(this.level.interactableMeshes, (msg, type) => {
        this.hud.showNotification(msg, type);
      });
    };

    // Weapon select
    this.input.onWeaponSwitch = (slot) => {
      if (slot === 3 && !this.player.hasMP40) {
        this.hud.showNotification('MP40 not unlocked yet! Defeat SS Officer.', 'error');
        return;
      }
      this.player.weapon.equip(slot);
    };

    // Toggle Pause
    this.input.onTogglePause = () => {
      this.togglePause();
    };
  }

  bindEvents() {
    // Window Resize
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Pause Modal Buttons
    document.getElementById('btn-resume')?.addEventListener('click', () => {
      this.togglePause(false);
      this.input.requestPointerLock();
    });

    document.getElementById('btn-restart')?.addEventListener('click', () => {
      this.restartGame();
    });

    document.getElementById('btn-audio')?.addEventListener('click', (e) => {
      const isMuted = sound.toggleMute();
      e.target.textContent = `AUDIO: ${isMuted ? 'MUTED' : 'ENABLED'}`;
    });

    document.getElementById('btn-credits')?.addEventListener('click', () => {
      document.getElementById('credits-modal')?.classList.remove('hidden');
    });

    document.getElementById('btn-close-credits')?.addEventListener('click', () => {
      document.getElementById('credits-modal')?.classList.add('hidden');
    });

    // Game Over & Victory Restart Buttons
    document.getElementById('btn-go-restart')?.addEventListener('click', () => {
      this.restartGame();
    });

    document.getElementById('btn-vic-restart')?.addEventListener('click', () => {
      this.restartGame();
    });
  }

  togglePause(forceState) {
    if (this.gameState === 'GAMEOVER' || this.gameState === 'VICTORY') return;

    if (forceState !== undefined) {
      this.gameState = forceState ? 'PAUSED' : 'PLAYING';
    } else {
      this.gameState = this.gameState === 'PLAYING' ? 'PAUSED' : 'PLAYING';
    }

    const modal = document.getElementById('pause-modal');
    if (this.gameState === 'PAUSED') {
      modal?.classList.remove('hidden');
      this.input.exitPointerLock();
    } else {
      modal?.classList.add('hidden');
    }
  }

  restartGame() {
    console.log('Restarting Castle Wolfenstein Escape...');

    // Close all modals
    document.getElementById('pause-modal')?.classList.add('hidden');
    document.getElementById('gameover-modal')?.classList.add('hidden');
    document.getElementById('victory-modal')?.classList.add('hidden');
    document.getElementById('credits-modal')?.classList.add('hidden');

    // Reset player stats
    this.player.health = 100;
    this.player.ammo = 32;
    this.player.score = 0;
    this.player.hasFoundRelic = false;
    this.player.hasEscaped = false;
    this.player.enemiesKilled = 0;
    this.player.inventory.hasSilverKey = false;
    this.player.inventory.hasGoldKey = false;
    this.player.hasMP40 = false;
    this.player.setSpawn(1.5, 1.5, -Math.PI / 2);
    this.player.weapon.equip(2, true);

    this.gameTime = 0;

    // Reset Doors
    for (const d of this.level.doors) {
      d.isOpen = false;
      d.isOpening = false;
      d.openProgress = 0;
      if (d.leaf) {
        d.leaf.position.x = 0;
        d.leaf.position.z = 0;
      }
    }

    // Reset Enemies
    for (const e of this.level.enemies) {
      e.health = e.maxHealth;
      e.isDead = false;
      e.state = 'PATROL';
      e.deathTimer = 0;
      e.group.position.copy(e.worldPos);
      e.group.rotation.y = e.config.rot || 0;
      e.torso.rotation.set(0, 0, 0);
      e.leftArm.rotation.set(0, 0, 0);
      e.rightArm.rotation.set(0, 0, 0);
      e.leftLeg.rotation.set(0, 0, 0);
      e.rightLeg.rotation.set(0, 0, 0);
    }

    // Reset VFX
    this.vfx.dispose();

    this.gameState = 'PLAYING';
    this.input.requestPointerLock();
    this.hud.showNotification('Mission restarted. Escape the fortress!', 'normal');
  }

  checkInteractionHover() {
    // Cast ray forward from camera to detect interactive objects
    this.player.interactRaycaster.setFromCamera(this.player.screenCenter, this.camera);
    const hits = this.player.interactRaycaster.intersectObjects(this.level.interactableMeshes, true);

    if (hits.length > 0) {
      let targetObj = hits[0].object;
      let door = targetObj.userData?.door;
      let isExit = targetObj.userData?.isExit;

      while (!door && !isExit && targetObj.parent) {
        targetObj = targetObj.parent;
        door = targetObj.userData?.door;
        isExit = targetObj.userData?.isExit;
      }

      if (door) {
        if (door.isOpen || door.isOpening) {
          this.hud.setInteractionPrompt(null);
        } else if (door.type === 'silver') {
          this.hud.setInteractionPrompt(
            this.player.inventory.hasSilverKey
              ? '[E] Unlock Sector B Gate (Silver Key)'
              : '[E] Locked Sector B Gate (Requires Silver Key)'
          );
        } else if (door.type === 'gold') {
          this.hud.setInteractionPrompt(
            this.player.inventory.hasGoldKey
              ? '[E] Unlock Vault Gate (Gold Key)'
              : '[E] Locked Vault Gate (Requires Gold Key)'
          );
        } else if (door.isSecret) {
          this.hud.setInteractionPrompt('[E] Push Suspicious Wall Panel');
        } else {
          this.hud.setInteractionPrompt('[E] Open Dungeon Door');
        }
        return;
      }

      if (isExit) {
        this.hud.setInteractionPrompt(
          this.player.inventory.hasGoldKey
            ? '[E] Activate Escape Elevator Pod'
            : '[E] Elevator Offline (Requires Gold Key)'
        );
        return;
      }
    }

    this.hud.setInteractionPrompt(null);
  }

  handleGameOver() {
    this.gameState = 'GAMEOVER';
    this.input.exitPointerLock();
    sound.playGameOver();

    const goModal = document.getElementById('gameover-modal');
    if (goModal) {
      document.getElementById('go-kills').textContent = this.player.enemiesKilled;
      document.getElementById('go-score').textContent = this.player.score;
      goModal.classList.remove('hidden');
    }
  }

  handleVictory() {
    this.gameState = 'VICTORY';
    this.input.exitPointerLock();
    sound.playVictory();

    const vicModal = document.getElementById('victory-modal');
    if (vicModal) {
      const minutes = Math.floor(this.gameTime / 60);
      const seconds = Math.floor(this.gameTime % 60);
      const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      // Calculate rating
      let rating = 'B (SOLDIER)';
      if (this.player.hasFoundRelic && this.player.enemiesKilled >= 6) {
        rating = 'S+ (WOLFENSTEIN LEGEND)';
      } else if (this.player.hasFoundRelic || this.player.enemiesKilled >= 5) {
        rating = 'A (WAR HERO)';
      }

      document.getElementById('vic-score').textContent = this.player.score;
      document.getElementById('vic-kills').textContent = this.player.enemiesKilled;
      document.getElementById('vic-relic').textContent = this.player.hasFoundRelic ? 'YES (+2000 PTS)' : 'NO';
      document.getElementById('vic-time').textContent = timeStr;
      document.getElementById('vic-rating').textContent = rating;

      vicModal.classList.remove('hidden');
    }
  }

  startLoop() {
    this.lastTime = performance.now();
    const loop = (currentTime) => {
      requestAnimationFrame(loop);

      if (!this.isReady) return;

      const rawDelta = (currentTime - this.lastTime) * 0.001;
      this.lastTime = currentTime;
      const delta = Math.min(0.1, Math.max(0.001, isNaN(rawDelta) ? 0.016 : rawDelta));

      if (this.gameState === 'PLAYING') {
        this.gameTime += delta;

        // 1. Update Player
        this.player.update(delta, this.level.doors, this.collectibles);

        // 2. Update Collectibles & Proximity Pickups
        this.collectibles.update(delta, this.player, (msg, type) => {
          this.hud.showNotification(msg, type);
        });

        // 3. Update Enemies
        const sightBlockers = this.level.getSightBlockers();
        for (const enemy of this.level.enemies) {
          enemy.update(
            delta,
            this.player,
            sightBlockers,
            this.collectibles,
            (msg, type) => this.hud.showNotification(msg, type)
          );

          // If boss dropped Gold Key, spawn it at boss position
          if (enemy.droppedKey) {
            enemy.droppedKey = false;
            this.collectibles.spawnItem('gold_key', enemy.worldPos.x / TILE_SIZE, enemy.worldPos.z / TILE_SIZE);
            this.hud.showNotification('The Commander dropped the Gold Vault Key!', 'gold');
          }
        }

        // 4. Update Level Doors & Animations
        this.level.update(delta);

        // 5. Update VFX (Particles, Torches, Portal)
        this.vfx.update(delta, this.camera);

        // 6. Check Hover Raycast Interaction Prompts
        this.checkInteractionHover();

        // 7. Check Game Over / Victory Conditions
        if (this.player.health <= 0) {
          this.handleGameOver();
        } else if (this.player.hasEscaped) {
          this.handleVictory();
        }

        // 8. Update HUD
        this.hud.update(delta, this.player, this.level, this.gameTime);
      }

      // Render Three.js Scene
      this.renderer.render(this.scene, this.camera);
    };

    loop();
  }
}

// Bootstrap Game on Window Load
window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
