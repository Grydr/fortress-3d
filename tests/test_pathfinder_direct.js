import { Pathfinder } from '../src/game/Pathfinder.js';
import { MAP_LAYOUT, TILE_SIZE } from '../src/game/MapData.js';

console.log('TILE_SIZE:', TILE_SIZE);

// Test 1: Start at cell 1 (gx: 1, gz: 1 -> world: 4.5, 4.5) to hallway (gx: 5, gz: 4 -> world: 16.5, 13.5)
const p1 = { x: 1 * TILE_SIZE + 1.5, z: 1 * TILE_SIZE + 1.5 };
const p2 = { x: 5 * TILE_SIZE + 1.5, z: 4 * TILE_SIZE + 1.5 };

const path1 = Pathfinder.findPath(p1, p2, [], true);
console.log('Path 1 length:', path1.length);
console.log('Path 1 waypoints:', path1.map(p => `(${p.gx}, ${p.gz}: ${MAP_LAYOUT[p.gz][p.gx]})`).join(' -> '));

// Verify every waypoint in path1 is walkable
let valid1 = true;
for (const wp of path1) {
  const tile = MAP_LAYOUT[wp.gz][wp.gx];
  if (tile === '1' || tile === '2' || tile === '3' || tile === '4') {
    console.error('INVALID TILE IN PATH:', wp.gx, wp.gz, tile);
    valid1 = false;
  }
}
console.log('Path 1 all walkable:', valid1);

// Test 2: Start at Barracks (gx: 6, gz: 14) to Grand Hall (gx: 16, gz: 8)
const p3 = { x: 6 * TILE_SIZE + 1.5, z: 14 * TILE_SIZE + 1.5 };
const p4 = { x: 16 * TILE_SIZE + 1.5, z: 8 * TILE_SIZE + 1.5 };

const path2 = Pathfinder.findPath(p3, p4, [], true);
console.log('Path 2 length:', path2.length);
console.log('Path 2 waypoints:', path2.map(p => `(${p.gx}, ${p.gz}: ${MAP_LAYOUT[p.gz][p.gx]})`).join(' -> '));

let valid2 = true;
for (const wp of path2) {
  const tile = MAP_LAYOUT[wp.gz][wp.gx];
  if (tile === '1' || tile === '2' || tile === '3' || tile === '4') {
    console.error('INVALID TILE IN PATH 2:', wp.gx, wp.gz, tile);
    valid2 = false;
  }
}
console.log('Path 2 all walkable:', valid2);
