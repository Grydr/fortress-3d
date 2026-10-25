import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// Polyfill FileReader for Node.js
class MockFileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(buf => {
      this.result = buf;
      if (this.onloadend) this.onloadend();
    });
  }
}
globalThis.FileReader = MockFileReader;

const outputDir = path.resolve('public/assets/models');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function exportToGLB(object3D, filename) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      object3D,
      (gltf) => {
        const filePath = path.join(outputDir, filename);
        fs.writeFileSync(filePath, Buffer.from(gltf));
        console.log(`Generated ${filename} (${gltf.byteLength} bytes)`);
        resolve(filePath);
      },
      (error) => {
        console.error(`Error generating ${filename}:`, error);
        reject(error);
      },
      { binary: true }
    );
  });
}

// 1. Create Castle Wolfenstein Eagle Relic / Golden Chalice
function createWolfRelic() {
  const group = new THREE.Group();
  group.name = 'WolfensteinEagleRelic';

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffca28,
    metalness: 0.92,
    roughness: 0.18,
  });

  const darkGoldMat = new THREE.MeshStandardMaterial({
    color: 0xc79100,
    metalness: 0.85,
    roughness: 0.35,
  });

  const rubyMat = new THREE.MeshStandardMaterial({
    color: 0xd50000,
    metalness: 0.1,
    roughness: 0.05,
  });

  // Base Pedestal
  const baseGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.1, 16);
  const base = new THREE.Mesh(baseGeo, darkGoldMat);
  base.position.y = 0.05;
  group.add(base);

  const stemGeo = new THREE.CylinderGeometry(0.12, 0.2, 0.45, 16);
  const stem = new THREE.Mesh(stemGeo, goldMat);
  stem.position.y = 0.32;
  group.add(stem);

  // Chalice Cup
  const cupGeo = new THREE.CylinderGeometry(0.38, 0.18, 0.5, 16);
  const cup = new THREE.Mesh(cupGeo, goldMat);
  cup.position.y = 0.75;
  group.add(cup);

  // Cup Rim
  const rimGeo = new THREE.TorusGeometry(0.38, 0.04, 12, 24);
  rimGeo.rotateX(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, darkGoldMat);
  rim.position.y = 1.0;
  group.add(rim);

  // Eagle Wings
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(0.3, 0.25);
  wingShape.lineTo(0.55, 0.65);
  wingShape.lineTo(0.35, 0.5);
  wingShape.lineTo(0.2, 0.35);
  wingShape.lineTo(0, 0.1);
  wingShape.closePath();

  const extrudeSettings = { depth: 0.04, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.02, bevelThickness: 0.02 };
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);

  const leftWing = new THREE.Mesh(wingGeo, goldMat);
  leftWing.position.set(-0.15, 0.45, 0);
  leftWing.rotation.y = -0.3;
  leftWing.scale.set(-1, 1, 1);
  group.add(leftWing);

  const rightWing = new THREE.Mesh(wingGeo, goldMat);
  rightWing.position.set(0.15, 0.45, 0);
  rightWing.rotation.y = 0.3;
  group.add(rightWing);

  // Central Ruby Gem
  const gemGeo = new THREE.OctahedronGeometry(0.1, 1);
  const gem = new THREE.Mesh(gemGeo, rubyMat);
  gem.position.set(0, 0.75, 0.35);
  group.add(gem);

  return group;
}

// 2. Create Antique Gold Dungeon Master Key
function createGoldKey() {
  const group = new THREE.Group();
  group.name = 'CastleDungeonKey';

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xf5b041,
    metalness: 0.88,
    roughness: 0.22,
  });

  // Shaft
  const shaftGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 12);
  shaftGeo.rotateZ(Math.PI / 2);
  const shaft = new THREE.Mesh(shaftGeo, brassMat);
  group.add(shaft);

  // Bow / Handle Ring
  const bowGeo = new THREE.TorusGeometry(0.2, 0.045, 12, 24);
  const bow = new THREE.Mesh(bowGeo, brassMat);
  bow.position.x = -0.55;
  group.add(bow);

  // Inner cross in handle
  const barHGeo = new THREE.BoxGeometry(0.28, 0.035, 0.035);
  const barH = new THREE.Mesh(barHGeo, brassMat);
  barH.position.x = -0.55;
  group.add(barH);

  const barVGeo = new THREE.BoxGeometry(0.035, 0.28, 0.035);
  const barV = new THREE.Mesh(barVGeo, brassMat);
  barV.position.x = -0.55;
  group.add(barV);

  // Bit / Teeth
  const bit1Geo = new THREE.BoxGeometry(0.12, 0.15, 0.035);
  const bit1 = new THREE.Mesh(bit1Geo, brassMat);
  bit1.position.set(0.35, -0.09, 0);
  group.add(bit1);

  const bit2Geo = new THREE.BoxGeometry(0.08, 0.1, 0.035);
  const bit2 = new THREE.Mesh(bit2Geo, brassMat);
  bit2.position.set(0.22, -0.07, 0);
  group.add(bit2);

  // Key Collar
  const collarGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.05, 12);
  collarGeo.rotateZ(Math.PI / 2);
  const collar = new THREE.Mesh(collarGeo, brassMat);
  collar.position.x = -0.32;
  group.add(collar);

  return group;
}

// 3. Create Army Field First Aid Medkit
function createMedkit() {
  const group = new THREE.Group();
  group.name = 'FieldMedkit';

  const boxMat = new THREE.MeshStandardMaterial({
    color: 0x2e4053,
    metalness: 0.4,
    roughness: 0.45,
  });

  const redMat = new THREE.MeshStandardMaterial({
    color: 0xc0392b,
    metalness: 0.2,
    roughness: 0.3,
  });

  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xfdfefe,
    metalness: 0.2,
    roughness: 0.25,
  });

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xbdc3c7,
    metalness: 0.9,
    roughness: 0.2,
  });

  // Main Casing
  const caseGeo = new THREE.BoxGeometry(0.65, 0.45, 0.25);
  const caseMesh = new THREE.Mesh(caseGeo, boxMat);
  group.add(caseMesh);

  // White Decal Panel
  const panelGeo = new THREE.BoxGeometry(0.35, 0.35, 0.01);
  const panelMesh = new THREE.Mesh(panelGeo, whiteMat);
  panelMesh.position.z = 0.13;
  group.add(panelMesh);

  // Red Cross
  const crossHGeo = new THREE.BoxGeometry(0.24, 0.08, 0.012);
  const crossH = new THREE.Mesh(crossHGeo, redMat);
  crossH.position.z = 0.135;
  group.add(crossH);

  const crossVGeo = new THREE.BoxGeometry(0.08, 0.24, 0.012);
  const crossV = new THREE.Mesh(crossVGeo, redMat);
  crossV.position.z = 0.135;
  group.add(crossV);

  // Metal Latches
  const latchGeo = new THREE.BoxGeometry(0.06, 0.1, 0.02);
  const latchL = new THREE.Mesh(latchGeo, metalMat);
  latchL.position.set(-0.2, 0.05, 0.13);
  group.add(latchL);

  const latchR = new THREE.Mesh(latchGeo, metalMat);
  latchR.position.set(0.2, 0.05, 0.13);
  group.add(latchR);

  // Handle
  const handleGeo = new THREE.TorusGeometry(0.1, 0.025, 8, 16, Math.PI);
  const handle = new THREE.Mesh(handleGeo, metalMat);
  handle.position.set(0, 0.24, 0);
  group.add(handle);

  return group;
}

async function main() {
  console.log('Generating GLTF / GLB assets for Wolfenstein 3D Escape...');
  await exportToGLB(createWolfRelic(), 'wolf_relic.glb');
  await exportToGLB(createGoldKey(), 'gold_key.glb');
  await exportToGLB(createMedkit(), 'medkit.glb');
  console.log('All GLB assets generated successfully!');
}

main().catch(console.error);
