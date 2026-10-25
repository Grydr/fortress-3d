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
    // 1. Damage Screen Vignette (Red flash)
    this.damageVignette = document.createElement('div');
    this.damageVignette.id = 'damage-vignette';
    this.container.appendChild(this.damageVignette);

    // 2. Crosshair & Hitmarker
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

    // 3. Top HUD: Objective Tracker & Minimap
    this.topHUD = document.createElement('div');
    this.topHUD.id = 'top-hud';
    this.topHUD.innerHTML = `
      <div id="objective-box">
        <div class="objective-header">MISSION OBJECTIVES</div>
        <ul id="objective-list">
          <li id="obj-cell" class="done">✔ Escape Starting Dungeon Cell</li>
          <li id="obj-silver">Find Silver Key in Barracks</li>
          <li id="obj-officer">Eliminate SS Commander in Sector B</li>
          <li id="obj-relic">Discover Secret Chamber & Ancient Relic</li>
          <li id="obj-gold">Retrieve Gold Key to unlock Vault</li>
          <li id="obj-escape">Activate Escape Elevator Pod</li>
        </ul>
      </div>
      <div id="minimap-box">
        <canvas id="minimap-canvas" width="140" height="140"></canvas>
      </div>
    `;
    this.container.appendChild(this.topHUD);

    // 4. Notification Container (Floating pick-up toasts)
    this.notificationBox = document.createElement('div');
    this.notificationBox.id = 'notification-box';
    this.container.appendChild(this.notificationBox);

    // 5. Classic Wolfenstein Bottom Dashboard
    this.dashboard = document.createElement('div');
    this.dashboard.id = 'wolf-dashboard';
    this.dashboard.innerHTML = `
      <div class="dash-block dash-floor">
        <div class="dash-label">FLOOR</div>
        <div class="dash-val">1</div>
      </div>
      <div class="dash-block dash-score">
        <div class="dash-label">SCORE</div>
        <div id="dash-score-val" class="dash-val">000000</div>
      </div>
      <div class="dash-block dash-lives">
        <div class="dash-label">LIVES</div>
        <div id="dash-lives-val" class="dash-val">3</div>
      </div>
      <div class="dash-block dash-face">
        <canvas id="face-canvas" width="64" height="72"></canvas>
      </div>
      <div class="dash-block dash-health">
        <div class="dash-label">HEALTH</div>
        <div id="dash-health-val" class="dash-val">100%</div>
      </div>
      <div class="dash-block dash-ammo">
        <div class="dash-label">AMMO</div>
        <div id="dash-ammo-val" class="dash-val">32</div>
      </div>
      <div class="dash-block dash-weapon">
        <div class="dash-label">WEAPON</div>
        <div id="dash-weapon-val" class="dash-val weapon-name">LUGER</div>
      </div>
      <div class="dash-block dash-keys">
        <div class="dash-label">KEYS</div>
        <div class="keys-container">
          <span id="key-silver" class="key-indicator locked" title="Silver Key">🗝S</span>
          <span id="key-gold" class="key-indicator locked" title="Gold Key">🗝G</span>
        </div>
      </div>
    `;
    this.container.appendChild(this.dashboard);

    // 6. Pause / Menu Modal
    this.pauseModal = document.createElement('div');
    this.pauseModal.id = 'pause-modal';
    this.pauseModal.className = 'game-modal hidden';
    this.pauseModal.innerHTML = `
      <div class="modal-card">
        <h1 class="modal-title">CASTLE WOLFENSTEIN 3D</h1>
        <h3 class="modal-subtitle">ESCAPE THE FORTRESS (UTS GRAFIKA KOMPUTER)</h3>
        <div class="modal-buttons">
          <button id="btn-resume" class="btn-retro">RESUME MISSION</button>
          <button id="btn-restart" class="btn-retro">RESTART LEVEL</button>
          <button id="btn-audio" class="btn-retro">AUDIO: ENABLED</button>
          <button id="btn-credits" class="btn-retro">CREDITS & REQUIREMENTS</button>
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
      <div class="modal-card credits-card">
        <h2 class="modal-title">PROJECT SPECIFICATIONS & CREDITS</h2>
        <div class="credits-content">
          <p><strong>Mata Kuliah:</strong> EF234504 · Grafika Komputer (Semester 5)</p>
          <p><strong>Topik:</strong> Topik 5 — Escape Room 3D (Castle Wolfenstein 3D Escape)</p>
          <p><strong>Fitur & Syarat Terpenuhi:</strong></p>
          <ul>
            <li>✔ JavaScript, Three.js (v0.186), HTML5, CSS3</li>
            <li>✔ Scene Graph Parent-Child (Weapon Rig, Sliding Doors, Torch Sconces, Enemy Limbs)</li>
            <li>✔ Asset GLTF/GLB (Wolfenstein Eagle Relic, Antique Dungeon Key, First Aid Medkit)</li>
            <li>✔ PBR Material (MeshStandardMaterial dengan Normal Map, Roughness Map)</li>
            <li>✔ Multi-Lighting (Hemisphere, Directional Moonbeam, Flickering Wall Torches, Muzzle Flash, Elevator Beacon)</li>
            <li>✔ Shadows (castShadow & receiveShadow dengan PCFSoftShadowMap)</li>
            <li>✔ Environment (Castle FogExp2, Flagstone floor, Timber beam ceiling)</li>
            <li>✔ 4+ Animations (Weapon bobbing & recoil, Door sliding, Enemy walk/death, Item float/spin, Torch flame)</li>
            <li>✔ 3+ Interactions (Raycaster Hitscan Shooting, Raycaster Door/Switch Interaction, WASD Movement, Inventory Keys)</li>
            <li>✔ Visual Feedback & 5+ VFX (Crosshair hitmarkers, Red damage vignette, Muzzle flash, Bullet sparks, Blood splatter, Explosive barrels, Torch embers)</li>
            <li>✔ Classic Wolfenstein HUD, Blazkowicz reactive face, Mini-map radar, Quest objective checklist, Win/Lose states</li>
          </ul>
          <p><strong>Asset & Audio Credits:</strong></p>
          <p>Source code, shader composition, game logic, UI/HUD, 3D architecture, and VFX created by Kelompok Grafika Komputer. Procedural sound synthesis powered by Web Audio API.</p>
        </div>
        <button id="btn-close-credits" class="btn-retro">CLOSE</button>
      </div>
    `;
    this.container.appendChild(this.creditsModal);

    // 8. Victory Modal
    this.victoryModal = document.createElement('div');
    this.victoryModal.id = 'victory-modal';
    this.victoryModal.className = 'game-modal hidden';
    this.victoryModal.innerHTML = `
      <div class="modal-card victory-card">
        <h1 class="modal-title gold-text">MISSION ACCOMPLISHED!</h1>
        <h3 class="modal-subtitle">YOU HAVE ESCAPED CASTLE WOLFENSTEIN</h3>
        <div class="victory-stats">
          <div class="stat-row"><span>FINAL SCORE:</span> <strong id="vic-score">0</strong></div>
          <div class="stat-row"><span>ENEMIES ELIMINATED:</span> <strong id="vic-kills">0</strong></div>
          <div class="stat-row"><span>SECRET RELIC RETRIEVED:</span> <strong id="vic-relic">NO</strong></div>
          <div class="stat-row"><span>TIME ELAPSED:</span> <strong id="vic-time">00:00</strong></div>
          <div class="stat-row"><span>RATING:</span> <strong id="vic-rating" class="gold-text">S (WAR HERO)</strong></div>
        </div>
        <button id="btn-vic-restart" class="btn-retro">PLAY AGAIN</button>
      </div>
    `;
    this.container.appendChild(this.victoryModal);

    // 9. Game Over Modal
    this.gameOverModal = document.createElement('div');
    this.gameOverModal.id = 'gameover-modal';
    this.gameOverModal.className = 'game-modal hidden';
    this.gameOverModal.innerHTML = `
      <div class="modal-card gameover-card">
        <h1 class="modal-title red-text">YOU DIED</h1>
        <h3 class="modal-subtitle">SLAIN IN CASTLE WOLFENSTEIN</h3>
        <div class="victory-stats">
          <div class="stat-row"><span>ENEMIES ELIMINATED:</span> <strong id="go-kills">0</strong></div>
          <div class="stat-row"><span>SCORE:</span> <strong id="go-score">0</strong></div>
        </div>
        <button id="btn-go-restart" class="btn-retro">TRY AGAIN</button>
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

    // Background of portrait frame
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    if (health <= 0) {
      // Dead Skull Face
      ctx.fillStyle = '#d5dbdb';
      ctx.beginPath();
      ctx.arc(w / 2, 34, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(w / 2 - 12, 38, 24, 18);

      // Black Eye sockets
      ctx.fillStyle = '#111111';
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
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(tx, 48, 4, 8);
      }
      return;
    }

    // Hair (Blonde BJ)
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.arc(w / 2, 28, 22, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();

    // Head / Skin Base
    ctx.fillStyle = '#f5cba7';
    ctx.beginPath();
    ctx.ellipse(w / 2, 36, 18, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chiseled Jaw
    ctx.fillStyle = '#edbb99';
    ctx.fillRect(w / 2 - 14, 42, 28, 14);

    // Eyes
    const eyeOffsetX = this.lookDir * 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w / 2 - 11, 30, 8, 5);
    ctx.fillRect(w / 2 + 3, 30, 8, 5);

    // Blue Irises
    ctx.fillStyle = '#2980b9';
    ctx.fillRect(w / 2 - 9 + eyeOffsetX, 31, 4, 4);
    ctx.fillRect(w / 2 + 5 + eyeOffsetX, 31, 4, 4);

    // Strong Eyebrows
    ctx.fillStyle = '#b9770e';
    ctx.fillRect(w / 2 - 12, 27, 9, 3);
    ctx.fillRect(w / 2 + 3, 27, 9, 3);

    // Nose
    ctx.strokeStyle = '#d35400';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2, 32);
    ctx.lineTo(w / 2, 42);
    ctx.lineTo(w / 2 - 3, 44);
    ctx.stroke();

    // Mouth
    ctx.strokeStyle = '#78281f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (isVictorious) {
      // Big grin
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
      ctx.fillStyle = '#900c3f';
      ctx.fillRect(w / 2 - 2, 44, 3, 5);
    }
    if (health < 50) {
      // Cut on left cheek & forehead
      ctx.strokeStyle = '#900c3f';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 14, 36);
      ctx.lineTo(w / 2 - 8, 42);
      ctx.moveTo(w / 2 + 4, 22);
      ctx.lineTo(w / 2 + 12, 25);
      ctx.stroke();
    }
    if (health < 25) {
      // Bruised right eye & heavy blood
      ctx.fillStyle = 'rgba(81, 46, 95, 0.5)';
      ctx.beginPath();
      ctx.arc(w / 2 + 7, 32, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#900c3f';
      ctx.fillRect(w / 2 - 8, 52, 4, 8);
    }
  }

  /**
   * Top-Right 2D Mini-Map Radar
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

    // Map background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, mw, mh);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, mw, mh);

    const rows = MAP_LAYOUT.length;
    const cols = MAP_LAYOUT[0].length;
    const cellW = mw / cols;
    const cellH = mh / rows;

    // Draw Walls
    for (let z = 0; z < rows; z++) {
      for (let x = 0; x < cols; x++) {
        const tile = MAP_LAYOUT[z][x];
        if (tile === '1') {
          ctx.fillStyle = '#64748b'; // stone wall
          ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
        } else if (tile === '2') {
          ctx.fillStyle = '#0284c7'; // steel wall
          ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
        } else if (tile === '3') {
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath();
          ctx.arc((x + 0.5) * cellW, (z + 0.5) * cellH, cellW * 0.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === 'D') {
          ctx.fillStyle = '#b45309'; // wood door
          ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
        } else if (tile === 'S') {
          ctx.fillStyle = '#38bdf8'; // silver door
          ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
        } else if (tile === 'G') {
          ctx.fillStyle = '#facc15'; // gold door
          ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
        } else if (tile === '4') {
          ctx.fillStyle = '#64748b'; // secret wall looks like wall
          ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
        } else if (tile === 'EXIT') {
          ctx.fillStyle = '#10b981'; // exit
          ctx.fillRect(x * cellW, z * cellH, cellW, cellH);
        }
      }
    }

    // Draw Enemies (Red Dots)
    for (const enemy of level.enemies) {
      if (enemy.isDead) continue;
      const ex = (enemy.group.position.x / (cols * TILE_SIZE)) * mw;
      const ez = (enemy.group.position.z / (rows * TILE_SIZE)) * mh;
      ctx.fillStyle = enemy.isOfficer ? '#ef4444' : '#f97316';
      ctx.beginPath();
      ctx.arc(ex, ez, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Player (Green Arrow with Facing Direction)
    const px = (player.camera.position.x / (cols * TILE_SIZE)) * mw;
    const pz = (player.camera.position.z / (rows * TILE_SIZE)) * mh;

    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(-player.yaw); // Player facing angle

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(3.5, 4);
    ctx.lineTo(-3.5, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  triggerHitmarker() {
    if (!this.hitmarkerEl) return;
    this.hitmarkerEl.classList.remove('active');
    void this.hitmarkerEl.offsetWidth; // trigger reflow
    this.hitmarkerEl.classList.add('active');
  }

  showNotification(text, type = 'normal') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = text;
    this.notificationBox.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 2800);
  }

  setInteractionPrompt(text) {
    if (!this.promptEl) return;
    if (text) {
      this.promptEl.textContent = text;
      this.promptEl.style.display = 'block';
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

    // 2. Update Status Bar Elements
    const scoreEl = document.getElementById('dash-score-val');
    if (scoreEl) scoreEl.textContent = String(player.score).padStart(6, '0');

    const healthEl = document.getElementById('dash-health-val');
    if (healthEl) {
      healthEl.textContent = `${player.health}%`;
      healthEl.style.color = player.health > 50 ? '#2ecc71' : player.health > 25 ? '#f39c12' : '#e74c3c';
    }

    const ammoEl = document.getElementById('dash-ammo-val');
    if (ammoEl) {
      ammoEl.textContent = player.weapon.currentSlot === 1 ? '∞' : player.ammo;
    }

    const weaponEl = document.getElementById('dash-weapon-val');
    if (weaponEl) {
      const slot = player.weapon.currentSlot;
      weaponEl.textContent = slot === 1 ? 'KNIFE' : slot === 2 ? 'LUGER' : 'MP40';
    }

    // 3. Update Key Indicators
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

    // 4. Update Objective Checklist
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
      objRelic.textContent = '✔ Secret Relic Recovered (+2000 PTS)';
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

    // 5. Update Blazkowicz Face
    this.lookTimer += delta;
    if (this.lookTimer > 3.0) {
      this.lookTimer = 0;
      this.lookDir = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
    }
    this.drawBlazkowiczFace(player.health, player.hasEscaped);

    // 6. Update Mini-Map
    this.drawMinimap(player, level);
  }
}
