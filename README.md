# Fortress 3D: Iron Breach
### EF234504 · Grafika Komputer · Ujian Tengah Semester (UTS)
**Topik 5: Escape Room 3D / Interactive 3D Mini-Game**

Sebuah 3D First-Person Shooter (FPS) Interactive Mini-Game berbasis browser yang dibangun dengan **Three.js**, **JavaScript (ES Modules)**, **HTML5**, dan **CSS3**. Game ini mengusung tema legendaris *Wolfenstein 3D* dengan plot melarikan diri dari benteng bawah tanah (*Castle Wolfenstein / Iron Fortress Dungeon Escape*).

---

## 🎮 Live Preview & Cara Menjalankan

### Persyaratan:
- Node.js (v18+) & npm

### Menjalankan Development Server:
```bash
# 1. Install dependencies
npm install

# 2. Jalankan development server
npm run dev
# Akses melalui browser pada http://localhost:3000/
```

### Menjalankan Production Preview:
```bash
npm run build
npm run preview
# Akses melalui browser pada http://localhost:4173/
```

---

## 🕹 Kontrol Permainan

| Tombol / Aksi | Fungsi |
| :--- | :--- |
| **W, A, S, D** / Panah | Bergerak maju, mundur, strafe kiri, strafe kanan |
| **Mouse Move** | Rotasi kamera (First-Person Look / Pointer Lock) |
| **Klik Kiri (LMB)** | Menembak senjata aktif (*Raycaster Hitscan*) |
| **E / Spasi** | Interaksi obyek (*Open Doors*, *Push Secret Wall*, *Activate Elevator*) |
| **1, 2, 3** / Scroll | Ganti Senjata (1: Pisau Tempur, 2: Pistol Luger P08, 3: MP40 Submachine Gun) |
| **Shift** | Sprint / Lari cepat |
| **Escape (ESC)** | Pause Menu & Pengaturan Audio / Bantuan |

---

## 🎨 Arsitektur UI/HUD Game-Grade (Hasil Penerapan Skill)

Berdasarkan rekomendasi spesialis dari `game-ui-ux` dan `threejs-game-ui-designer`:
1. **Dual Peripheral Anchoring (Bottom-Center Free):** Tidak lagi menggunakan dashboard padat penuh di bawah layar yang menutupi senjata 3D. HUD dipisah menjadi dua pod periferal:
   - **Pod Vitalitas (Kiri Bawah):** Potret animasi B.J. Blazkowicz, bilah meter kesehatan bergradien dinamis (Optimal Hijau &rarr; Waspada Kuning &rarr; Kritis Merah), persentase tabular numerik, dan status nyawa.
   - **Pod Amunisi & Senjata (Kanan Bawah):** Badge senjata aktif, meteran amunisi tabular (`32 / 99`), serta slot kunci taktis (*Silver Key* & *Gold Key*) dengan efek pulse berpendar saat diperoleh.
   - **Area Tengah-Bawah:** Dibiarkan bebas dan transparan agar viewmodel senjata 3D dengan animasi bobbing dan recoil dapat terlihat utuh.
2. **Top HUD Ergonomis:**
   - **Kiri Atas:** Panel *Mission Directives* bertema dossier militer dengan indikator radar aktif.
   - **Kanan Atas:** Housing radar taktis terintegrasi dengan telemetri `FLOOR` dan `SCORE`, lengkap dengan arah mata angin `N`.
3. **Harmoni Warna 60-30-10:**
   - 60% Substrat gelap gunmetal slate (`rgba(9, 13, 22, 0.9)` dengan *backdrop-filter blur*).
   - 30% Struktur rangka baja dingin dan chamfer beveled border (`#334155`).
   - 10% Aksen status berbobot tinggi (Kesehatan Hijau/Merah, Amunisi & Kunci Emas Kuning, Energi Portal Cyan).

---

## 🎯 Gameplay & Objective (Escape Room 3D)

Pemain terbangun di sel penjara bawah tanah Kastil Wolfenstein. Misi utama:
1. **Escape Starting Cell:** Buka pintu sel penjara dan telusuri koridor kastil.
2. **Find Silver Key:** Infiltrasi barak penjaga dan temukan Kunci Perak (*Silver Key*) untuk membuka gerbang Sektor B.
3. **Defeat SS Commander:** Kalahkan Komandan SS di Balairung Utama Sektor B untuk merebut senjata otomatis **MP40** dan Kunci Emas (*Gold Key*).
4. **Discover Secret Room:** Temukan panel dinding rahasia (*Push-Wall*) yang dapat digeser untuk mengambil artefak langka **Wolfenstein Eagle Relic** (Model GLTF 3D) (+2000 poin).
5. **Unlock Vault & Escape:** Buka gerbang brankas dengan Kunci Emas dan aktifkan kapsul elevator pelarian (*Escape Elevator Pod*) untuk memenangkan misi!

---

## ✅ Checklist Pemenuhan Syarat Wajib (UTS)

| No | Kebutuhan Wajib | Implementasi dalam Project | Status |
| :-: | :--- | :--- | :-: |
| 1 | **Stack Teknologi**<br>JavaScript, Three.js, HTML, CSS | Vanilla JS (ES Modules), Three.js v0.186, Vite, HTML5, CSS3 kustom. | **TERPENUHI** |
| 2 | **Scene Utama & Aset**<br>Camera, renderer, ground/env, min. 3 jenis object | First-person camera, WebGLRenderer, flagstone ground, timber ceiling, 7 jenis obyek: (1) Modular stone & steel walls, (2) Interactive sliding doors, (3) Castle guards & SS officers, (4) First-person weapon rig, (5) Collectibles & barrels, (6) Wall torches, (7) Elevator escape pod. | **TERPENUHI** |
| 3 | **Scene Graph Parent-Child & GLTF/GLB**<br>Min. 1 scene graph parent-child & min. 1 asset GLTF/GLB | - **Scene Graph:** Camera -> Weapon Rig -> Gun Mesh -> Muzzle Flash & Light; Door Frame -> Sliding Leaf -> Handle; Torch Bracket -> Torch Head -> PointLight + Flame Particles; Guard Root -> Torso -> Limbs + Weapon.<br>- **GLTF/GLB:** 3 model GLTF biner (`wolf_relic.glb`, `gold_key.glb`, `medkit.glb`) dimuat via `GLTFLoader`. | **TERPENUHI** |
| 4 | **PBR Material, Multi-Lighting & Shadows**<br>Material PBR, min. 2 light, cast/receive shadow | - **Material PBR:** `MeshStandardMaterial` dengan procedural Albedo, Normal Map, dan Roughness Map.<br>- **Multi-Lighting (5+ light):** HemisphereLight (ambient), DirectionalLight (moonbeam shadow caster), 10+ PointLight torchlights (flickering warm light), dynamic Muzzle Flash light, Elevator Cyan Portal light.<br>- **Shadows:** `castShadow = true` pada guard, pintu, barrel, weapon; `receiveShadow = true` pada lantai, dinding, plafon. ShadowMap type `THREE.PCFShadowMap`. | **TERPENUHI** |
| 5 | **Environment Sesuai**<br>HDR, skybox, fog, indoor environment | Indoor dungeon environment berpadu dengan kabut kastil atmosferik (`THREE.FogExp2(0x0e1117, 0.038)`), tekstur balok kayu, obor dinding dinamis, dan stone flagstone. | **TERPENUHI** |
| 6 | **Animations (Min. 2)**<br>Minimal 2 jenis animasi | **6 Animasi:**<br>1. Weapon walking bobbing + recoil kickback animation.<br>2. Interactive door smooth sliding & secret wall push-back animation.<br>3. Enemy walk cycle, aim tracking, dan death collapse animation.<br>4. Collectible floating sinusoidal wave + 360-degree rotation animation.<br>5. Procedural torch flame flickering light intensity + rising embers.<br>6. Elevator portal rotating energy rings & glowing beacon. | **TERPENUHI** |
| 7 | **Interactions (Min. 3, wajib THREE.Raycaster)**<br>Minimal 3 interaksi | **4 Interaksi:**<br>1. **THREE.Raycaster Shooting:** Tembakan hitscan mengenai musuh, barrel peledak, atau dinding.<br>2. **THREE.Raycaster Interaction:** Tombol [E] mendeteksi pintu normal, pintu terkunci, dinding rahasia, dan tombol elevator.<br>3. **First-Person WASD Controls:** Navigasi 3D FPS dengan resolusi tabrakan grid dinding kontinu.<br>4. **Inventory & Keycard Unlocking:** Sistem kunci bertingkat (Silver & Gold Key) membuka akses area baru. | **TERPENUHI** |
| 8 | **Feedback Visual & VFX (Min. 2)**<br>Visual feedback + minimal 2 VFX | - **Visual Feedback:** Dynamic crosshair hitmarker, red damage screen vignette, floating combat text (`+25 HP`, `+30 AMMO`, `Silver Key Acquired!`), Blazkowicz animated HUD face.<br>- **6 VFX Sistem Partikel:**<br>1. Muzzle Flash & spark particles saat menembak.<br>2. Bullet impact sparks & wall dust cloud pada benturan dinding.<br>3. Blood splatter burst particles pada musuh yang tertembak.<br>4. Barrel explosion VFX (fireball cloud, expanding shockwave ring, smoke plume).<br>5. Torch flame rising embers & smoke.<br>6. Elevator portal cyan light aura & rotating energy rings. | **TERPENUHI** |
| 9 | **Camera & UI/HUD**<br>Kamera & HUD sesuai fungsi project | First-Person Camera dengan dashboard retro Wolfenstein 3D: Floor, Score, Lives, Animated BJ Blazkowicz portrait (reaktif terhadap health, damage, dan victory), Health percentage, Ammo count, Weapon indicator, Key status, Mini-map radar (menampilkan posisi musuh & pintu), serta Mission Objectives Tracker. | **TERPENUHI** |
| 10 | **Objective, Win/Lose & Restart**<br>Objective jelas, win/lose state, restart mulus | - **Objective:** Tertera jelas pada HUD Checklist.<br>- **Win State:** Mencapai elevator dengan objektif selesai -> Layar kemenangan dengan ringkasan skor, akurasi, waktu, dan tombol Play Again.<br>- **Lose State:** Health = 0 -> Layar Game Over "YOU DIED" dengan tombol Try Again.<br>- **Restart:** Reset level, musuh, kesehatan, dan posisi tanpa perlu reload browser. | **TERPENUHI** |
| 11 | **Kualitas Teknis & Console**<br>Lancar, seluruh aset termuat, bebas error | Lolos audit browser otomatis (Puppeteer/Firefox) dengan **0 uncaught error**, performa stabil di 60 FPS, seluruh model GLTF termuat sukses. | **TERPENUHI** |

---

## 📁 Struktur Direktori Project

```
wolfenstein/
├── index.html                   # Entry HTML & HUD Shell
├── style.css                    # Styling retro Wolfenstein 3D, responsive HUD & modals
├── package.json                 # Dependency Three.js & Vite
├── vite.config.js               # Konfigurasi bundler Vite
├── public/
│   └── assets/
│       └── models/              # Model GLTF/GLB biner 3D
│           ├── wolf_relic.glb   # Castle Wolfenstein Eagle Relic
│           ├── gold_key.glb     # Antique Gold Dungeon Key
│           └── medkit.glb       # Field First Aid Medkit
├── scripts/
│   └── generate_assets.js       # Script Three.js GLTFExporter untuk export model GLB
├── src/
│   ├── main.js                  # Game loop, scene coordinator, lifecycle manager
│   ├── core/
│   │   ├── AudioManager.js      # Synthesizer audio Web Audio API (100% offline, zero lag)
│   │   ├── InputManager.js      # Keyboard, mouse look (PointerLock), touch fallback
│   │   └── TextureGenerator.js  # Generator Canvas PBR Maps (Albedo, Normal, Roughness)
│   ├── game/
│   │   ├── MapData.js           # Layout grid 24x24, waypoint patroli, koordinat spawn
│   │   ├── LevelBuilder.js      # PBR walls, floors, ceilings, pillars, banners, torches
│   │   ├── Player.js            # FPS controller, physics, inventory, collision grid
│   │   ├── Weapon.js            # 3D viewmodel senjata, raycast shooting, recoil bobbing
│   │   ├── Enemy.js             # AI guards & SS officer, patrol, vision raycast, death
│   │   ├── Door.js              # Pintu geser interaktif & push-wall rahasia
│   │   ├── Collectibles.js      # GLTF Loader, kunci, medkit, amunisi, barel peledak
│   │   └── VFXManager.js        # Sistem partikel muzzle flash, sparks, darah, ledakan
│   └── ui/
│       └── HUD.js               # Wolfenstein 3D status bar, BJ face portrait, radar minimap
└── tests/
    └── gameplay_audit.js        # Script automated end-to-end browser audit test
```

---

## 📜 Orisinalitas & Asset Credits

- **Source Code & Game Logic:** Dibuat secara mandiri dan orisinal oleh kelompok menggunakan Three.js API standard.
- **Scene Composition & Level Design:** Desain grid kastil, pencahayaan multi-light PBR, dan interaksi gameplay dibuat dari nol.
- **Model 3D GLTF/GLB:** Dihasilkan secara prosedural dan diekspor menggunakan Three.js `GLTFExporter` untuk format binary `.glb` yang kompatibel glTF 2.0.
- **Tekstur PBR (Normal & Roughness):** Dihasilkan secara prosedural menggunakan HTML5 Canvas API dengan algoritma gradien filter Sobel untuk normal mapping, bebas dari ketergantungan file gambar eksternal yang rentan 404.
- **Efek Suara & Musik:** Disintesis secara dinamis menggunakan Web Audio API (prosedural FM/AM/noise synthesis) sehingga tidak membutuhkan aset audio eksternal dan berfungsi 100% offline.
