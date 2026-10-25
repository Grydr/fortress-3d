import * as THREE from 'three';

/**
 * Procedural PBR Texture Generator
 * Generates crisp Albedo, Normal Map, and Roughness Map canvases for Three.js MeshStandardMaterial.
 * Zero external image dependencies, instant load time, high detail.
 */

// Helper to convert heightmap data to normal map canvas
function heightToNormalMap(heightCtx, width, height, strength = 2.0) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const imgData = heightCtx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const normalImg = ctx.createImageData(width, height);
  const out = normalImg.data;

  const getH = (x, y) => {
    const px = (x + width) % width;
    const py = (y + height) % height;
    return data[(py * width + px) * 4] / 255.0;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const left = getH(x - 1, y);
      const right = getH(x + 1, y);
      const top = getH(x, y - 1);
      const bottom = getH(x, y + 1);

      // Sobel gradient
      const dx = (right - left) * strength;
      const dy = (bottom - top) * strength;
      const dz = 1.0;

      // Normalize vector (dx, dy, dz)
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const nx = dx / len;
      const ny = dy / len;
      const nz = dz / len;

      // Map from [-1, 1] to [0, 255]
      out[idx] = Math.floor((nx * 0.5 + 0.5) * 255);
      out[idx + 1] = Math.floor((-ny * 0.5 + 0.5) * 255); // OpenGL normal map Y+ convention
      out[idx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
      out[idx + 3] = 255;
    }
  }

  ctx.putImageData(normalImg, 0, 0);
  return canvas;
}

export class TextureGenerator {
  static cache = new Map();

  /**
   * Castle Stone Brick Wall (Wolfenstein Grey Stone)
   */
  static getStoneBrick() {
    if (this.cache.has('stone_brick')) return this.cache.get('stone_brick');

    const width = 512;
    const height = 512;

    // Albedo Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Height Canvas for Normal Map
    const hCanvas = document.createElement('canvas');
    hCanvas.width = width;
    hCanvas.height = height;
    const hCtx = hCanvas.getContext('2d');

    // Roughness Canvas
    const rCanvas = document.createElement('canvas');
    rCanvas.width = width;
    rCanvas.height = height;
    const rCtx = rCanvas.getContext('2d');

    // Background Mortar
    ctx.fillStyle = '#222328';
    ctx.fillRect(0, 0, width, height);

    hCtx.fillStyle = '#111111';
    hCtx.fillRect(0, 0, width, height);

    rCtx.fillStyle = '#e0e0e0'; // rough mortar
    rCtx.fillRect(0, 0, width, height);

    const rows = 8;
    const rowHeight = height / rows;
    const cols = 4;
    const colWidth = width / cols;
    const mortar = 8;

    for (let r = 0; r < rows; r++) {
      const offsetX = (r % 2) * (colWidth / 2);
      for (let c = -1; c <= cols + 1; c++) {
        const x = c * colWidth + offsetX + mortar / 2;
        const y = r * rowHeight + mortar / 2;
        const bw = colWidth - mortar;
        const bh = rowHeight - mortar;

        // Brick variation tone
        const baseVal = 90 + Math.floor(Math.sin(r * 13 + c * 37) * 25);
        const rColor = Math.min(255, baseVal + Math.floor(Math.random() * 15));
        const gColor = Math.min(255, baseVal + Math.floor(Math.random() * 15) - 3);
        const bColor = Math.min(255, baseVal + Math.floor(Math.random() * 20) + 5);

        ctx.fillStyle = `rgb(${rColor},${gColor},${bColor})`;
        ctx.fillRect(x, y, bw, bh);

        // Brick height
        const hVal = 200 + Math.floor(Math.random() * 35);
        hCtx.fillStyle = `rgb(${hVal},${hVal},${hVal})`;
        hCtx.fillRect(x, y, bw, bh);

        // Brick roughness (smoother than mortar)
        const roughVal = 140 + Math.floor(Math.random() * 40);
        rCtx.fillStyle = `rgb(${roughVal},${roughVal},${roughVal})`;
        rCtx.fillRect(x, y, bw, bh);

        // Subtle noise on brick
        for (let i = 0; i < 40; i++) {
          const nx = x + Math.random() * bw;
          const ny = y + Math.random() * bh;
          const ns = 2 + Math.random() * 4;
          ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.12)';
          ctx.fillRect(nx, ny, ns, ns);

          hCtx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)';
          hCtx.fillRect(nx, ny, ns, ns);
        }
      }
    }

    const normalCanvas = heightToNormalMap(hCtx, width, height, 3.5);

    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;

    const normalMap = new THREE.CanvasTexture(normalCanvas);
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;

    const roughnessMap = new THREE.CanvasTexture(rCanvas);
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;

    const result = { map, normalMap, roughnessMap };
    this.cache.set('stone_brick', result);
    return result;
  }

  /**
   * Sector B Blue/Grey Steel Bunker Wall with Rivets
   */
  static getSteelWall() {
    if (this.cache.has('steel_wall')) return this.cache.get('steel_wall');

    const width = 512;
    const height = 512;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const hCanvas = document.createElement('canvas');
    hCanvas.width = width;
    hCanvas.height = height;
    const hCtx = hCanvas.getContext('2d');

    // Base Blue-Steel Metal
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, width, height);

    hCtx.fillStyle = '#808080';
    hCtx.fillRect(0, 0, width, height);

    // Beveled Panel Inset
    ctx.fillStyle = '#34495e';
    ctx.fillRect(24, 24, width - 48, height - 48);
    hCtx.fillStyle = '#b0b0b0';
    hCtx.fillRect(24, 24, width - 48, height - 48);

    // Panel border grooves
    ctx.strokeStyle = '#1a252f';
    ctx.lineWidth = 6;
    ctx.strokeRect(24, 24, width - 48, height - 48);

    hCtx.strokeStyle = '#202020';
    hCtx.lineWidth = 6;
    hCtx.strokeRect(24, 24, width - 48, height - 48);

    // Hazard warning stripes at top
    for (let x = 32; x < width - 32; x += 32) {
      ctx.fillStyle = '#f39c12';
      ctx.beginPath();
      ctx.moveTo(x, 32);
      ctx.lineTo(x + 16, 32);
      ctx.lineTo(x, 64);
      ctx.lineTo(x - 16, 64);
      ctx.closePath();
      ctx.fill();
    }

    // Rivets along borders
    const drawRivet = (rx, ry) => {
      // Albedo
      ctx.fillStyle = '#7f8c8d';
      ctx.beginPath();
      ctx.arc(rx, ry, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#bdc3c7';
      ctx.beginPath();
      ctx.arc(rx - 2, ry - 2, 3, 0, Math.PI * 2);
      ctx.fill();

      // Height
      hCtx.fillStyle = '#ffffff';
      hCtx.beginPath();
      hCtx.arc(rx, ry, 7, 0, Math.PI * 2);
      hCtx.fill();
    };

    const rivetOffset = 12;
    for (let x = 12; x < width; x += 48) {
      drawRivet(x, rivetOffset);
      drawRivet(x, height - rivetOffset);
    }
    for (let y = 12; y < height; y += 48) {
      drawRivet(rivetOffset, y);
      drawRivet(width - rivetOffset, y);
    }

    const normalCanvas = heightToNormalMap(hCtx, width, height, 4.0);

    const map = new THREE.CanvasTexture(canvas);
    const normalMap = new THREE.CanvasTexture(normalCanvas);

    const result = { map, normalMap };
    this.cache.set('steel_wall', result);
    return result;
  }

  /**
   * Stone Dungeon Floor Flagstones
   */
  static getFloor() {
    if (this.cache.has('stone_floor')) return this.cache.get('stone_floor');

    const width = 512;
    const height = 512;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const hCanvas = document.createElement('canvas');
    hCanvas.width = width;
    hCanvas.height = height;
    const hCtx = hCanvas.getContext('2d');

    ctx.fillStyle = '#18191d';
    ctx.fillRect(0, 0, width, height);

    hCtx.fillStyle = '#101010';
    hCtx.fillRect(0, 0, width, height);

    const tiles = 4;
    const tileSize = width / tiles;
    const pad = 6;

    for (let r = 0; r < tiles; r++) {
      for (let c = 0; c < tiles; c++) {
        const x = c * tileSize + pad / 2;
        const y = r * tileSize + pad / 2;
        const s = tileSize - pad;

        const baseVal = 65 + Math.floor(Math.sin(r * 5 + c * 11) * 15);
        ctx.fillStyle = `rgb(${baseVal},${baseVal},${baseVal + 4})`;
        ctx.fillRect(x, y, s, s);

        const hVal = 180 + Math.floor(Math.random() * 40);
        hCtx.fillStyle = `rgb(${hVal},${hVal},${hVal})`;
        hCtx.fillRect(x, y, s, s);

        // Cracks and wear
        ctx.strokeStyle = '#0d0e10';
        ctx.lineWidth = 1.5;
        if (Math.random() > 0.4) {
          ctx.beginPath();
          ctx.moveTo(x + 20, y + 20);
          ctx.lineTo(x + s * 0.6, y + s * 0.4);
          ctx.lineTo(x + s - 15, y + s * 0.7);
          ctx.stroke();

          hCtx.strokeStyle = '#050505';
          hCtx.lineWidth = 2;
          hCtx.beginPath();
          hCtx.moveTo(x + 20, y + 20);
          hCtx.lineTo(x + s * 0.6, y + s * 0.4);
          hCtx.lineTo(x + s - 15, y + s * 0.7);
          hCtx.stroke();
        }
      }
    }

    const normalCanvas = heightToNormalMap(hCtx, width, height, 3.0);

    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;

    const normalMap = new THREE.CanvasTexture(normalCanvas);
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;

    const result = { map, normalMap };
    this.cache.set('stone_floor', result);
    return result;
  }

  /**
   * Vaulted Wood Beam Ceiling
   */
  static getCeiling() {
    if (this.cache.has('wood_ceiling')) return this.cache.get('wood_ceiling');

    const width = 512;
    const height = 512;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const hCanvas = document.createElement('canvas');
    hCanvas.width = width;
    hCanvas.height = height;
    const hCtx = hCanvas.getContext('2d');

    // Stone background
    ctx.fillStyle = '#22252a';
    ctx.fillRect(0, 0, width, height);

    hCtx.fillStyle = '#505050';
    hCtx.fillRect(0, 0, width, height);

    // Heavy wooden beams
    const beamCount = 4;
    const beamHeight = height / beamCount;

    for (let i = 0; i < beamCount; i++) {
      const y = i * beamHeight + 8;
      const bh = beamHeight - 16;

      ctx.fillStyle = '#4a2f1b'; // rich dark oak
      ctx.fillRect(0, y, width, bh);

      hCtx.fillStyle = '#d0d0d0';
      hCtx.fillRect(0, y, width, bh);

      // Wood grain lines
      ctx.strokeStyle = '#362112';
      ctx.lineWidth = 1.5;
      for (let g = 0; g < 6; g++) {
        const gy = y + 4 + g * 6 + Math.random() * 3;
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.bezierCurveTo(width * 0.3, gy + 3, width * 0.7, gy - 3, width, gy);
        ctx.stroke();
      }

      // Iron bracket straps
      for (let bx = 64; bx < width; bx += 128) {
        ctx.fillStyle = '#1c1c1c';
        ctx.fillRect(bx, y, 16, bh);
        // rivets
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(bx + 5, y + 4, 6, 6);
        ctx.fillRect(bx + 5, y + bh - 10, 6, 6);

        hCtx.fillStyle = '#ffffff';
        hCtx.fillRect(bx, y, 16, bh);
      }
    }

    const normalCanvas = heightToNormalMap(hCtx, width, height, 3.0);

    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;

    const normalMap = new THREE.CanvasTexture(normalCanvas);
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;

    const result = { map, normalMap };
    this.cache.set('wood_ceiling', result);
    return result;
  }

  /**
   * Heavy Dungeon Door Texture (Standard, Silver Key, Gold Key)
   */
  static getDoorTexture(type = 'normal') {
    const key = `door_${type}`;
    if (this.cache.has(key)) return this.cache.get(key);

    const width = 512;
    const height = 512;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const hCanvas = document.createElement('canvas');
    hCanvas.width = width;
    hCanvas.height = height;
    const hCtx = hCanvas.getContext('2d');

    // Base door wood or reinforced steel
    if (type === 'normal') {
      ctx.fillStyle = '#3e2723';
      hCtx.fillStyle = '#606060';
    } else if (type === 'silver') {
      ctx.fillStyle = '#37474f';
      hCtx.fillStyle = '#707070';
    } else {
      // gold door
      ctx.fillStyle = '#4e342e';
      hCtx.fillStyle = '#808080';
    }
    ctx.fillRect(0, 0, width, height);
    hCtx.fillRect(0, 0, width, height);

    // Vertical wooden planks
    const planks = 6;
    const pw = width / planks;
    for (let i = 0; i < planks; i++) {
      ctx.strokeStyle = '#1b120c';
      ctx.lineWidth = 4;
      ctx.strokeRect(i * pw, 0, pw, height);

      hCtx.strokeStyle = '#101010';
      hCtx.lineWidth = 4;
      hCtx.strokeRect(i * pw, 0, pw, height);
    }

    // Heavy iron cross bands
    const bandY = [60, height / 2 - 25, height - 110];
    const bandH = 50;

    for (const by of bandY) {
      ctx.fillStyle = '#212121';
      ctx.fillRect(0, by, width, bandH);

      hCtx.fillStyle = '#d0d0d0';
      hCtx.fillRect(0, by, width, bandH);

      // Iron rivets
      for (let rx = 30; rx < width; rx += 60) {
        ctx.fillStyle = '#9e9e9e';
        ctx.beginPath();
        ctx.arc(rx, by + bandH / 2, 7, 0, Math.PI * 2);
        ctx.fill();

        hCtx.fillStyle = '#ffffff';
        hCtx.beginPath();
        hCtx.arc(rx, by + bandH / 2, 7, 0, Math.PI * 2);
        hCtx.fill();
      }
    }

    // Prison Grate / Viewing Slit in upper center
    const vx = width / 2 - 60;
    const vy = 140;
    const vw = 120;
    const vh = 80;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(vx, vy, vw, vh);
    hCtx.fillStyle = '#000000';
    hCtx.fillRect(vx, vy, vw, vh);

    // Grate bars
    for (let gx = vx + 20; gx < vx + vw; gx += 25) {
      ctx.fillStyle = '#757575';
      ctx.fillRect(gx, vy, 8, vh);
      hCtx.fillStyle = '#c0c0c0';
      hCtx.fillRect(gx, vy, 8, vh);
    }

    // Keyhole / Lock Plate
    const lpx = width - 90;
    const lpy = height / 2 - 10;
    if (type === 'silver') {
      ctx.fillStyle = '#cfd8dc';
      ctx.fillRect(lpx, lpy, 55, 70);
      ctx.fillStyle = '#37474f';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('SILVER', lpx - 5, lpy - 10);
    } else if (type === 'gold') {
      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(lpx, lpy, 55, 70);
      ctx.fillStyle = '#ffb300';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('GOLD', lpx + 5, lpy - 10);
    } else {
      ctx.fillStyle = '#424242';
      ctx.fillRect(lpx, lpy, 55, 70);
    }

    // Keyhole slot
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(lpx + 27, lpy + 25, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(lpx + 23, lpy + 25, 9, 25);

    const normalCanvas = heightToNormalMap(hCtx, width, height, 4.0);

    const map = new THREE.CanvasTexture(canvas);
    const normalMap = new THREE.CanvasTexture(normalCanvas);

    const result = { map, normalMap };
    this.cache.set(key, result);
    return result;
  }

  /**
   * Wolfenstein Castle Banner / Tapestry
   */
  static getCastleBanner() {
    if (this.cache.has('banner')) return this.cache.get('banner');

    const width = 256;
    const height = 512;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Deep Crimson Velvet
    ctx.fillStyle = '#8a0f14';
    ctx.fillRect(0, 0, width, height);

    // Gold Trim Border
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // Inner subtle border
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Wolfenstein Stylized Crest (Spread Eagle silhouette & Fortress monogram 'W')
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    // Central circular shield
    ctx.arc(width / 2, 180, 50, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(width / 2, 180, 42, 0, Math.PI * 2);
    ctx.fill();

    // Stylized "W" logo
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 50px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('W', width / 2, 180);

    // Gold Tassels at bottom
    ctx.fillStyle = '#d4af37';
    for (let x = 20; x < width - 20; x += 15) {
      ctx.fillRect(x, height - 25, 8, 20);
    }

    const map = new THREE.CanvasTexture(canvas);
    this.cache.set('banner', map);
    return map;
  }

  /**
   * Explosive Hazard Barrel Texture
   */
  static getBarrelTexture() {
    if (this.cache.has('barrel')) return this.cache.get('barrel');

    const width = 512;
    const height = 256;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Industrial Hazard Red
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(0, 0, width, height);

    // Steel Ring Ribs
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 40, width, 16);
    ctx.fillRect(0, height - 56, width, 16);

    // Yellow Hazard Stripe in center
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(0, 95, width, 66);

    // Diagonal Black Hazard Stripes
    ctx.fillStyle = '#1a1a1a';
    for (let x = -50; x < width + 50; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 95);
      ctx.lineTo(x + 20, 95);
      ctx.lineTo(x + 40, 161);
      ctx.lineTo(x + 20, 161);
      ctx.closePath();
      ctx.fill();
    }

    // Warning Label & Skull / Flame icon
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(width / 2 - 60, 105, 120, 46);
    ctx.fillStyle = '#c0392b';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXPLOSIVE', width / 2, 133);

    const map = new THREE.CanvasTexture(canvas);
    this.cache.set('barrel', map);
    return map;
  }

  /**
   * Radial Particle Texture for Muzzle Flash, Sparks, Flames, Smoke
   */
  static getRadialParticle() {
    if (this.cache.has('particle_radial')) return this.cache.get('particle_radial');

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.25, 'rgba(255, 230, 140, 0.9)');
    gradient.addColorStop(0.6, 'rgba(255, 100, 20, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const map = new THREE.CanvasTexture(canvas);
    this.cache.set('particle_radial', map);
    return map;
  }

  /**
   * Blood Splatter Particle
   */
  static getBloodParticle() {
    if (this.cache.has('particle_blood')) return this.cache.get('particle_blood');

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    gradient.addColorStop(0, 'rgba(180, 0, 0, 1)');
    gradient.addColorStop(0.4, 'rgba(130, 0, 0, 0.85)');
    gradient.addColorStop(0.8, 'rgba(80, 0, 0, 0.4)');
    gradient.addColorStop(1, 'rgba(40, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(32, 32, 28, 0, Math.PI * 2);
    ctx.fill();

    const map = new THREE.CanvasTexture(canvas);
    this.cache.set('particle_blood', map);
    return map;
  }

  /**
   * Smoke Particle
   */
  static getSmokeParticle() {
    if (this.cache.has('particle_smoke')) return this.cache.get('particle_smoke');

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(160, 160, 160, 0.7)');
    gradient.addColorStop(0.5, 'rgba(100, 100, 100, 0.35)');
    gradient.addColorStop(1, 'rgba(50, 50, 50, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const map = new THREE.CanvasTexture(canvas);
    this.cache.set('particle_smoke', map);
    return map;
  }
}
