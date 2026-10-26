import { MAP_LAYOUT, TILE_SIZE } from '../game/MapData.js';

export class HUD {
  constructor(container) {
    this.container = container || document.body;
    this.notifications = [];

    this.createElements();
    this.initBlazkowiczFace();
    this.initMinimap();
  }

  createElements() {
    // 1. Damage Screen Vignette (Dark blood flash & shadow)
    this.damageVignette = document.createElement('div');
    this.damageVignette.id = 'damage-vignette';
    this.container.appendChild(this.damageVignette);

    // 2. Crosshair & Hitmarker & In-World Prompt
    this.crosshairContainer = document.createElement('div');
    this.crosshairContainer.id = 'crosshair-container';
    this.crosshairContainer.innerHTML = `
      <div id="crosshair-dot"></div>
      <div id="crosshair-lines">
        <div class="line top"></div>
        <div class="line bottom"></div>
        <div class="line left"></div>
        <div class="line right"></div>
      </div>
      <div id="hitmarker"></div>
      <div id="interaction-prompt"></div>
    `;
    this.container.appendChild(this.crosshairContainer);

    this.hitmarkerEl = this.crosshairContainer.querySelector('#hitmarker');
    this.promptEl = this.crosshairContainer.querySelector('#interaction-prompt');

    // 3. Top HUD: Dungeon Escape Directives (Top-Left) & Telemetry / Mini-Map (Top-Right)
    this.topHUD = document.createElement('div');
    this.topHUD.id = 'top-hud';
    this.topHUD.innerHTML = `
      <!-- Escape Objectives Cluster (Top-Left) -->
      <div id="top-left-cluster">
        <div id="objective-box" class="dungeon-hud-panel">
          <div class="panel-header">
            <span class="panel-torch-ember"></span>
            <span class="panel-title">DUNGEON OBJECTIVES</span>
            <span class="panel-badge">KEEP B1</span>
          </div>
          <ul id="objective-list">
            <li id="obj-cell" class="done">✔ Escape Starting Dungeon Cell</li>
            <li id="obj-silver">Find Silver Key in Barracks</li>
            <li id="obj-officer">Eliminate SS Commander in Sector B</li>
            <li id="obj-relic">Discover Secret Chamber & Ancient Relic</li>
            <li id="obj-gold">Retrieve Gold Key to unlock Vault</li>
            <li id="obj-escape">Activate Escape Elevator Pod</li>
          </ul>
        </div>
        <div id="notification-box"></div>
      </div>

      <!-- Telemetry & Castle Map (Top-Right) -->
      <div id="telemetry-box" class="dungeon-hud-panel">
        <div class="telemetry-bar">
          <div class="telemetry-item">
            <span class="telem-label">DUNGEON</span>
            <span id="dash-floor-val" class="telem-val">1</span>
          </div>
          <div class="telemetry-divider"></div>
          <div class="telemetry-item">
            <span class="telem-label">SCORE</span>
            <span id="dash-score-val" class="telem-val">000000</span>
          </div>
        </div>
        <div id="minimap-housing">
          <div class="minimap-cardinal">N</div>
          <canvas id="minimap-canvas" width="140" height="140"></canvas>
          <div class="minimap-crosshair"></div>
        </div>
      </div>
    `;
    this.container.appendChild(this.topHUD);

    // Remember the original objective markup so restarts can restore it
    this.objectiveDefaults = [...this.topHUD.querySelectorAll('#objective-list li')].map((li) => ({
      el: li,
      className: li.className,
      text: li.textContent,
    }));

    // 4. Notification Container reference
    this.notificationBox = this.topHUD.querySelector('#notification-box');

    // 5. Dual Peripheral Bottom HUD (Dungeon Wrought-Iron & Brass Theme)
    this.dashboard = document.createElement('div');
    this.dashboard.id = 'bottom-hud';
    this.dashboard.innerHTML = `
      <!-- Vitality & Identity Pod (Bottom-Left) -->
      <div id="vitality-pod" class="dungeon-hud-cluster">
        <div class="pod-face-housing">
          <canvas id="face-canvas" width="64" height="72"></canvas>
          <div class="face-frame-iron"></div>
        </div>
        <div class="pod-vitality-details">
          <div class="pod-row-header">
            <span class="pod-label">VITALITY</span>
            <span id="dash-lives-val" class="lives-tag">3 LIVES</span>
          </div>
          <div class="health-meter-track">
            <div id="health-meter-fill" class="meter-fill" style="width: 100%;"></div>
          </div>
          <div class="health-numeric-row">
            <span id="dash-health-val" class="health-num">100%</span>
            <span id="health-status-text" class="status-pill status-healthy">HEALTHY</span>
          </div>
        </div>
      </div>

      <!-- Armament & Munitions Pod (Bottom-Right) -->
      <div id="munitions-pod" class="dungeon-hud-cluster">
        <div class="pod-weapon-badge">
          <span class="pod-label">WEAPON</span>
          <div id="dash-weapon-val" class="weapon-name">LUGER</div>
        </div>
        <div class="pod-ammo-details">
          <span class="pod-label">AMMUNITION</span>
          <div class="ammo-numeric-row">
            <span id="dash-ammo-val" class="ammo-num">32</span>
            <span class="ammo-max">/ 99</span>
          </div>
          <div class="ammo-meter-track">
            <div id="ammo-meter-fill" class="meter-fill ammo-fill" style="width: 32%;"></div>
          </div>
        </div>
        <div class="pod-keyring">
          <span class="pod-label">KEYRING</span>
          <div class="keys-container">
            <div id="key-silver" class="dungeon-key-slot locked" title="Silver Dungeon Key">
              <span class="key-icon">🗝</span>
              <span class="key-label">SILVER</span>
            </div>
            <div id="key-gold" class="dungeon-key-slot locked" title="Gold Vault Master Key">
              <span class="key-icon">🗝</span>
              <span class="key-label">GOLD</span>
            </div>
          </div>
        </div>
      </div>
    `;
    this.container.appendChild(this.dashboard);

    // 6. Pause / Menu Modal
    this.pauseModal = document.createElement('div');
    this.pauseModal.id = 'pause-modal';
    this.pauseModal.className = 'game-modal hidden';
    this.pauseModal.innerHTML = `
      <div class="modal-card dungeon-card">
        <div class="card-iron-header">
          <span class="iron-rivet left"></span>
          <span class="iron-rivet right"></span>
          <h1 class="modal-title">FORTRESS 3D: IRON BREACH</h1>
          <h3 class="modal-subtitle">DUNGEON ESCAPE &bull; UTS GRAFIKA KOMPUTER (TOPIC 5)</h3>
        </div>
        <div class="modal-buttons">
          <button id="btn-resume" class="btn-dungeon btn-primary">RESUME ESCAPE</button>
          <button id="btn-restart" class="btn-dungeon">RESTART DUNGEON</button>
          <button id="btn-audio" class="btn-dungeon">AUDIO: ENABLED</button>
          <button id="btn-credits" class="btn-dungeon">SPECIFICATIONS & CREDITS</button>
        </div>
        <div class="modal-controls-hint">
          [W,A,S,D] Move &bull; [Mouse] Look &bull; [Left Click] Shoot &bull; [E/Space] Interact &bull; [1,2,3] Weapons &bull; [Shift] Sprint
        </div>
      </div>
    `;
    this.container.appendChild(this.pauseModal);

    // 7. Credits & Requirements Modal
    this.creditsModal = document.createElement('div');
    this.creditsModal.id = 'credits-modal';
    this.creditsModal.className = 'game-modal hidden';
    this.creditsModal.innerHTML = `
      <div class="modal-card credits-card dungeon-card">
        <div class="card-iron-header">
          <span class="iron-rivet left"></span>
          <span class="iron-rivet right"></span>
          <h2 class="modal-title">PROJECT SPECIFICATIONS & CREDITS</h2>
        </div>
        <div class="credits-content">
          <p><strong>Mata Kuliah:</strong> EF234504 · Grafika Komputer (Semester 5)</p>
          <p><strong>Kelompok:</strong> YOLO</p>
          <p><strong>Anggota Tim:</strong> Erlangga Rizqi Dwi Raswanto (5025241179), Jalu Cahyo Senodiputro (5025241155)</p>
          <p><strong>Topik:</strong> Topik 5 — Escape Room 3D (Fortress 3D: Iron Breach)</p>
          <p><strong>Fitur & Syarat Terpenuhi:</strong></p>
          <ul>
            <li>✔ JavaScript, Three.js (v0.186), HTML5, CSS3</li>
            <li>✔ Scene Graph Parent-Child (Weapon Rig, Sliding Doors, Torch Sconces, Enemy Limbs)</li>
            <li>✔ Asset GLTF/GLB (Wolfenstein Eagle Relic, Antique Dungeon Key, First Aid Medkit)</li>
            <li>✔ PBR Material (MeshStandardMaterial dengan Normal Map, Roughness Map)</li>
            <li>✔ Multi-Lighting (Hemisphere, Directional Moonbeam, Flickering Wall Torches, Muzzle Flash, Elevator Beacon)</li>
            <li>✔ Shadows (castShadow & receiveShadow dengan PCFShadowMap)</li>
            <li>✔ Environment (Castle FogExp2, Flagstone floor, Timber beam ceiling)</li>
            <li>✔ 6 Animasi (Weapon bobbing & recoil, Door sliding, Enemy walk/death, Item float/spin, Torch flame, Portal)</li>
            <li>✔ 4 Interaksi (Raycaster Hitscan Shooting, Raycaster Door/Switch Interaction, WASD Movement, Inventory Keys)</li>
            <li>✔ Visual Feedback & 6 VFX (Crosshair hitmarkers, Red damage vignette, Muzzle flash, Bullet sparks, Blood splatter, Explosive barrels, Torch embers)</li>
            <li>✔ Dungeon-Themed HUD (Wrought-Iron Frames, Brass Accents, Blood-Ruby Vitality, Realtime Map, Objectives)</li>
          </ul>
          <p><strong>Asset & Audio Credits:</strong></p>
          <p>Source code, shader/texture composition, game logic, dungeon UI/HUD, 3D architecture, and VFX created by Kelompok YOLO (Erlangga Rizqi Dwi Raswanto & Jalu Cahyo Senodiputro). Procedural sound synthesis powered by Web Audio API.</p>
        </div>
        <button id="btn-close-credits" class="btn-dungeon">CLOSE</button>
      </div>
    `;
    this.container.appendChild(this.creditsModal);

    // 8. Victory Modal
    this.victoryModal = document.createElement('div');
    this.victoryModal.id = 'victory-modal';
    this.victoryModal.className = 'game-modal hidden';
    this.victoryModal.innerHTML = `
      <div class="modal-card victory-card dungeon-card">
        <div class="card-iron-header">
          <span class="iron-rivet left"></span>
          <span class="iron-rivet right"></span>
          <h1 class="modal-title gold-text">DUNGEON ESCAPED!</h1>
          <h3 class="modal-subtitle">FORTRESS BREACHED &bull; FREEDOM SECURED</h3>
        </div>
        <div class="victory-stats">
          <div class="stat-row"><span>FINAL SCORE:</span> <strong id="vic-score">0</strong></div>
          <div class="stat-row"><span>GUARDS ELIMINATED:</span> <strong id="vic-kills">0</strong></div>
          <div class="stat-row"><span>ANCIENT RELIC RETRIEVED:</span> <strong id="vic-relic">NO</strong></div>
          <div class="stat-row"><span>TIME ELAPSED:</span> <strong id="vic-time">00:00</strong></div>
          <div class="stat-row"><span>HONOR RATING:</span> <strong id="vic-rating" class="gold-text">S (WAR HERO)</strong></div>
        </div>
        <button id="btn-vic-restart" class="btn-dungeon btn-primary">PLAY AGAIN</button>
      </div>
    `;
    this.container.appendChild(this.victoryModal);

    // 9. Game Over Modal
    this.gameOverModal = document.createElement('div');
    this.gameOverModal.id = 'gameover-modal';
    this.gameOverModal.className = 'game-modal hidden';
    this.gameOverModal.innerHTML = `
      <div class="modal-card gameover-card dungeon-card">
        <div class="card-iron-header">
          <span class="iron-rivet left"></span>
          <span class="iron-rivet right"></span>
          <h1 class="modal-title red-text">YOU PERISHED</h1>
          <h3 class="modal-subtitle">LOST IN THE DUNGEONS OF THE FORTRESS</h3>
        </div>
        <div class="victory-stats">
          <div class="stat-row"><span>GUARDS ELIMINATED:</span> <strong id="go-kills">0</strong></div>
          <div class="stat-row"><span>FINAL SCORE:</span> <strong id="go-score">0</strong></div>
        </div>
        <button id="btn-go-restart" class="btn-dungeon btn-primary">TRY AGAIN</button>
      </div>
    `;
    this.container.appendChild(this.gameOverModal);
  }

  /**
   * Procedural BJ Blazkowicz Face on HUD Canvas
   */
  initBlazkowiczFace() {
    this.faceCanvas = document.getElementById('face-canvas');
    this.faceCtx = this.faceCanvas?.getContext('2d');
    this.lookTimer = 0;
    this.lookDir = 0; // -1: left, 0: center, 1: right
  }

  drawBlazkowiczFace(health, isVictorious = false) {
    if (!this.faceCtx) return;
    const ctx = this.faceCtx;
    const w = 64;
    const h = 72;

    ctx.clearRect(0, 0, w, h);

    // Dark Forged Iron background of portrait frame
    ctx.fillStyle = '#14110e';
    ctx.fillRect(0, 0, w, h);

    if (health <= 0) {
      // Fallen Skull Face
      ctx.fillStyle = '#a89f91';
      ctx.beginPath();
      ctx.arc(w / 2, 34, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(w / 2 - 12, 38, 24, 18);

      // Dark Eye sockets
      ctx.fillStyle = '#14110e';
      ctx.beginPath();
      ctx.arc(w / 2 - 7, 32, 5, 0, Math.PI * 2);
      ctx.arc(w / 2 + 7, 32, 5, 0, Math.PI * 2);
      ctx.fill();

      // Nose cavity
      ctx.beginPath();
      ctx.moveTo(w / 2, 40);
      ctx.lineTo(w / 2 - 3, 46);
      ctx.lineTo(w / 2 + 3, 46);
      ctx.closePath();
      ctx.fill();

      // Teeth
      for (let tx = w / 2 - 10; tx <= w / 2 + 10; tx += 5) {
        ctx.strokeStyle = '#14110e';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(tx, 48, 4, 8);
      }
      return;
    }

    // Hair (Tawny Blonde BJ)
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(w / 2, 28, 22, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();

    // Head / Weathered Skin Base
    ctx.fillStyle = '#e5b77e';
    ctx.beginPath();
    ctx.ellipse(w / 2, 36, 18, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chiseled Jaw
    ctx.fillStyle = '#d49b6a';
    ctx.fillRect(w / 2 - 14, 42, 28, 14);

    // Eyes
    const eyeOffsetX = this.lookDir * 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w / 2 - 11, 30, 8, 5);
    ctx.fillRect(w / 2 + 3, 30, 8, 5);

    // Grey-Blue Eyes
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(w / 2 - 9 + eyeOffsetX, 31, 4, 4);
    ctx.fillRect(w / 2 + 5 + eyeOffsetX, 31, 4, 4);

    // Strong Eyebrows
    ctx.fillStyle = '#92400e';
    ctx.fillRect(w / 2 - 12, 27, 9, 3);
    ctx.fillRect(w / 2 + 3, 27, 9, 3);

    // Nose
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2, 32);
    ctx.lineTo(w / 2, 42);
    ctx.lineTo(w / 2 - 3, 44);
    ctx.stroke();

    // Mouth
    ctx.strokeStyle = '#581c1c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (isVictorious) {
      // Big triumphant grin
      ctx.arc(w / 2, 48, 8, 0, Math.PI);
      ctx.stroke();
    } else if (health < 30) {
      // Grimace pain
      ctx.moveTo(w / 2 - 7, 52);
      ctx.lineTo(w / 2 + 7, 50);
      ctx.stroke();
    } else {
      // Determined smirk
      ctx.moveTo(w / 2 - 7, 49);
      ctx.lineTo(w / 2 + 7, 49);
      ctx.stroke();
    }

    // Blood and Damage Overlays
    if (health < 75) {
      // Bloody nose
      ctx.fillStyle = '#881337';
      ctx.fillRect(w / 2 - 2, 44, 3, 5);
    }
    if (health < 50) {
      // Cut on left cheek & forehead
      ctx.strokeStyle = '#881337';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 14, 36);
      ctx.lineTo(w / 2 - 8, 42);
      ctx.moveTo(w / 2 + 4, 22);
      ctx.lineTo(w / 2 + 12, 25);
      ctx.stroke();
    }
    if (health < 25) {
      // Bruised eye & heavy wounds
      ctx.fillStyle = 'rgba(76, 29, 149, 0.55)';
      ctx.beginPath();
      ctx.arc(w / 2 + 7, 32, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#881337';
      ctx.fillRect(w / 2 - 8, 52, 4, 8);
    }
  }

  /**
   * Top-Right 2D Castle Dungeon Map Relief
   */
  initMinimap() {
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.mmCtx = this.minimapCanvas?.getContext('2d');
  }

  drawMinimap(player, level) {
    if (!this.mmCtx || !player || !level) return;
    const ctx = this.mmCtx;
    const mw = 140;
    const mh = 140;

    ctx.clearRect(0, 0, mw, mh);

    // Dark Castle Stone Substrate
    ctx.fillStyle = '#12100e';
    ctx.fillRect(0, 0, mw, mh);

    // Subtle Engraved Stone Rings
    ctx.strokeStyle = 'rgba(180, 140, 80, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(mw / 2, mh / 2, 35, 0, Math.PI * 2);
    ctx.arc(mw / 2, mh / 2, 65, 0, Math.PI * 2);
    ctx.stroke();

    const rows = MAP_LAYOUT.length;
    const cols = MAP_LAYOUT[0].length;
    const cellW = mw / cols;
    const cellH = mh / rows;

    // Draw Walls (Aged Grey Stone & Vault Steel)
    for (let z = 0; z < rows; z++) {
      for (let x = 0; x < cols; x++) {
        const tile = MAP_LAYOUT[z][x];
        if (tile === '1') {
          ctx.fillStyle = '#4a433b'; // dungeon stone wall
          ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
        } else if (tile === '2') {
          ctx.fillStyle = '#374151'; // reinforced vault steel
          ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
        } else if (tile === '3') {
          ctx.fillStyle = '#5c544d'; // stone column
          ctx.beginPath();
          ctx.arc((x + 0.5) * cellW, (z + 0.5) * cellH, cellW * 0.45, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === 'D') {
          ctx.fillStyle = '#8b4513'; // heavy oak wooden door
          ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
        } else if (tile === 'S') {
          ctx.fillStyle = '#94a3b8'; // silver locked door
          ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
        } else if (tile === 'G') {
          ctx.fillStyle = '#d97706'; // gold locked door
          ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
        } else if (tile === '4') {
          ctx.fillStyle = '#4a433b'; // secret wall looks like normal wall
          ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
        } else if (tile === 'EXIT') {
          ctx.fillStyle = '#e69500'; // torchlit escape elevator
          ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
        }
      }
    }

    // Draw Enemies (Guards & SS Officers)
    for (const enemy of level.enemies) {
      if (enemy.isDead) continue;
      const ex = (enemy.group.position.x / (cols * TILE_SIZE)) * mw;
      const ez = (enemy.group.position.z / (rows * TILE_SIZE)) * mh;
      ctx.fillStyle = enemy.isOfficer ? '#dc2626' : '#ea580c';
      ctx.beginPath();
      ctx.arc(ex, ez, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Player (Torchlit Gold Arrow with Direction)
    const px = (player.camera.position.x / (cols * TILE_SIZE)) * mw;
    const pz = (player.camera.position.z / (rows * TILE_SIZE)) * mh;

    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(-player.yaw);

    ctx.fillStyle = '#f59e0b';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  triggerHitmarker() {
    if (!this.hitmarkerEl) return;
    this.hitmarkerEl.classList.remove('active');
    void this.hitmarkerEl.offsetWidth;
    this.hitmarkerEl.classList.add('active');
  }

  showNotification(text, type = 'normal') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-indicator"></span><span class="toast-body">${text}</span>`;
    this.notificationBox.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 2800);
  }

  resetObjectives() {
    for (const d of this.objectiveDefaults) {
      d.el.className = d.className;
      d.el.textContent = d.text;
    }
  }

  setInteractionPrompt(text) {
    if (!this.promptEl) return;
    if (text) {
      this.promptEl.innerHTML = `<span class="prompt-keycap">E</span> <span class="prompt-text">${text}</span>`;
      this.promptEl.style.display = 'flex';
    } else {
      this.promptEl.style.display = 'none';
    }
  }

  update(delta, player, level, gameTime) {
    // 1. Update Damage Screen Vignette
    if (player.damageFlash > 0) {
      this.damageVignette.style.opacity = Math.min(1.0, player.damageFlash * 1.5);
    } else {
      this.damageVignette.style.opacity = 0;
    }

    // 2. Update Telemetry: Score & Floor
    const scoreEl = document.getElementById('dash-score-val');
    if (scoreEl) scoreEl.textContent = String(player.score).padStart(6, '0');

    // 3. Update Health Meter & Readout (Blood Ruby Vitality Theme)
    const healthEl = document.getElementById('dash-health-val');
    const healthFill = document.getElementById('health-meter-fill');
    const statusText = document.getElementById('health-status-text');

    if (healthEl) {
      healthEl.textContent = `${player.health}%`;
    }

    if (healthFill) {
      healthFill.style.width = `${Math.max(0, Math.min(100, player.health))}%`;
      if (player.health > 60) {
        healthFill.style.background = 'linear-gradient(90deg, #991b1b, #dc2626)'; // Blood ruby vitality
        healthFill.style.boxShadow = '0 0 10px rgba(220, 38, 38, 0.45)';
        if (statusText) {
          statusText.textContent = 'HEALTHY';
          statusText.className = 'status-pill status-healthy';
        }
      } else if (player.health > 25) {
        healthFill.style.background = 'linear-gradient(90deg, #92400e, #d97706)'; // Bruised ochre/amber
        healthFill.style.boxShadow = '0 0 10px rgba(217, 119, 6, 0.45)';
        if (statusText) {
          statusText.textContent = 'WOUNDED';
          statusText.className = 'status-pill status-wounded';
        }
      } else if (player.health > 0) {
        healthFill.style.background = 'linear-gradient(90deg, #450a0a, #b91c1c)'; // Deep bleeding crimson
        healthFill.style.boxShadow = '0 0 14px rgba(185, 28, 28, 0.7)';
        if (statusText) {
          statusText.textContent = 'CRITICAL';
          statusText.className = 'status-pill status-critical';
        }
      } else {
        if (statusText) {
          statusText.textContent = 'PERISHED';
          statusText.className = 'status-pill status-perished';
        }
      }
    }

    // 3b. Update Lives Counter
    const livesEl = document.getElementById('dash-lives-val');
    if (livesEl) {
      livesEl.textContent = player.lives === 1 ? '1 LIFE' : `${player.lives} LIVES`;
    }

    // 4. Update Ammo & Weapon (Tarnished Brass & Lead Theme)
    const ammoEl = document.getElementById('dash-ammo-val');
    const ammoFill = document.getElementById('ammo-meter-fill');
    if (ammoEl) {
      const isKnife = player.weapon.currentSlot === 1;
      ammoEl.textContent = isKnife ? '∞' : player.ammo;
      if (ammoFill) {
        ammoFill.style.width = isKnife ? '100%' : `${Math.min(100, (player.ammo / 99) * 100)}%`;
      }
    }

    const weaponEl = document.getElementById('dash-weapon-val');
    if (weaponEl) {
      const slot = player.weapon.currentSlot;
      weaponEl.textContent = slot === 1 ? 'KNIFE' : slot === 2 ? 'LUGER' : 'MP40';
    }

    // 5. Update Key Indicators (Antique Silver & Gold Lockplates)
    const silverKeyEl = document.getElementById('key-silver');
    if (silverKeyEl) {
      if (player.inventory.hasSilverKey) {
        silverKeyEl.classList.remove('locked');
        silverKeyEl.classList.add('unlocked');
      } else {
        silverKeyEl.classList.add('locked');
        silverKeyEl.classList.remove('unlocked');
      }
    }

    const goldKeyEl = document.getElementById('key-gold');
    if (goldKeyEl) {
      if (player.inventory.hasGoldKey) {
        goldKeyEl.classList.remove('locked');
        goldKeyEl.classList.add('unlocked');
      } else {
        goldKeyEl.classList.add('locked');
        goldKeyEl.classList.remove('unlocked');
      }
    }

    // 6. Update Objective Checklist
    const objSilver = document.getElementById('obj-silver');
    if (objSilver && player.inventory.hasSilverKey) {
      objSilver.className = 'done';
      objSilver.textContent = '✔ Silver Key Acquired (Barracks)';
    }

    const objOfficer = document.getElementById('obj-officer');
    const officerDead = level.enemies.some((e) => e.isOfficer && e.isDead);
    if (objOfficer && officerDead) {
      objOfficer.className = 'done';
      objOfficer.textContent = '✔ SS Commander Defeated';
    }

    const objRelic = document.getElementById('obj-relic');
    if (objRelic && player.hasFoundRelic) {
      objRelic.className = 'done';
      objRelic.textContent = '✔ Ancient Relic Recovered (+2000 PTS)';
    }

    const objGold = document.getElementById('obj-gold');
    if (objGold && player.inventory.hasGoldKey) {
      objGold.className = 'done';
      objGold.textContent = '✔ Gold Key Acquired (Vault Access)';
    }

    const objEscape = document.getElementById('obj-escape');
    if (objEscape && player.hasEscaped) {
      objEscape.className = 'done';
      objEscape.textContent = '✔ Escape Elevator Activated!';
    }

    // 7. Update Blazkowicz Face
    this.lookTimer += delta;
    if (this.lookTimer > 3.0) {
      this.lookTimer = 0;
      this.lookDir = Math.floor(Math.random() * 3) - 1;
    }
    this.drawBlazkowiczFace(player.health, player.hasEscaped);

    // 8. Update Mini-Map
    this.drawMinimap(player, level);
  }
}
