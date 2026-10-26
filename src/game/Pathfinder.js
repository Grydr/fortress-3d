import { MAP_LAYOUT, TILE_SIZE } from './MapData.js';

export class Pathfinder {
  /**
   * Find path on the 24x24 grid using Breadth-First Search (BFS).
   * Returns an array of world-space waypoints: [{ x, z, gx, gz }, ...]
   */
  static findPath(startWorld, targetWorld, doors, allowNormalDoors = true) {
    const startGX = Math.floor(startWorld.x / TILE_SIZE);
    const startGZ = Math.floor(startWorld.z / TILE_SIZE);
    const targetGX = Math.floor(targetWorld.x / TILE_SIZE);
    const targetGZ = Math.floor(targetWorld.z / TILE_SIZE);

    const rows = MAP_LAYOUT.length;
    const cols = MAP_LAYOUT[0].length;

    // Boundary check
    if (startGX < 0 || startGX >= cols || startGZ < 0 || startGZ >= rows) return [];
    if (targetGX < 0 || targetGX >= cols || targetGZ < 0 || targetGZ >= rows) return [];

    if (startGX === targetGX && startGZ === targetGZ) {
      return [{ x: targetWorld.x, z: targetWorld.z, gx: targetGX, gz: targetGZ }];
    }

    // Check if tile is walkable
    const isWalkable = (gx, gz) => {
      if (gx < 0 || gx >= cols || gz < 0 || gz >= rows) return false;
      const tile = MAP_LAYOUT[gz][gx];

      // Solid walls (1: Stone, 2: Steel, 3: Pillar, 4: Secret Wall)
      if (tile === '1' || tile === '2' || tile === '3' || tile === '4') return false;

      // Normal Doors ('D')
      if (tile === 'D') {
        if (!allowNormalDoors) {
          const d = doors?.find((door) => door.gridX === gx && door.gridZ === gz);
          if (d && d.isBlocking()) return false;
        }
        return true;
      }

      // Keyed Doors ('S', 'G') - walkable only if already unlocked/opened
      if (tile === 'S' || tile === 'G') {
        const d = doors?.find((door) => door.gridX === gx && door.gridZ === gz);
        if (d && d.isBlocking()) return false;
        return true;
      }

      return true;
    };

    // If target tile is not directly walkable (e.g. edge near a wall), find closest walkable neighbor
    let destX = targetGX;
    let destZ = targetGZ;
    if (!isWalkable(destX, destZ)) {
      const neighbors = [
        { x: destX + 1, z: destZ },
        { x: destX - 1, z: destZ },
        { x: destX, z: destZ + 1 },
        { x: destX, z: destZ - 1 },
      ];
      const valid = neighbors.filter((n) => isWalkable(n.x, n.z));
      if (valid.length === 0) return [];
      valid.sort((a, b) => {
        const da = Math.hypot(a.x - startGX, a.z - startGZ);
        const db = Math.hypot(b.x - startGX, b.z - startGZ);
        return da - db;
      });
      destX = valid[0].x;
      destZ = valid[0].z;
    }

    // BFS Queue & Visited / Parent Map
    const queue = [{ x: startGX, z: startGZ }];
    const cameFrom = new Map();
    const key = (x, z) => `${x},${z}`;
    cameFrom.set(key(startGX, startGZ), null);

    const DIRS = [
      { x: 0, z: -1 }, // North
      { x: 1, z: 0 },  // East
      { x: 0, z: 1 },  // South
      { x: -1, z: 0 }, // West
    ];

    let found = false;
    while (queue.length > 0) {
      const current = queue.shift();
      if (current.x === destX && current.z === destZ) {
        found = true;
        break;
      }

      for (const dir of DIRS) {
        const nx = current.x + dir.x;
        const nz = current.z + dir.z;
        const nKey = key(nx, nz);

        if (!cameFrom.has(nKey) && isWalkable(nx, nz)) {
          cameFrom.set(nKey, current);
          queue.push({ x: nx, z: nz });
        }
      }
    }

    if (!found) return [];

    // Reconstruct path from dest back to start
    const path = [];
    let curr = { x: destX, z: destZ };
    while (curr) {
      path.push({
        x: curr.x * TILE_SIZE + TILE_SIZE / 2,
        z: curr.z * TILE_SIZE + TILE_SIZE / 2,
        gx: curr.x,
        gz: curr.z,
      });
      curr = cameFrom.get(key(curr.x, curr.z));
    }

    path.reverse();

    // Drop the starting tile so enemy immediately heads to the next tile
    if (path.length > 1) {
      path.shift();
    }

    // Replace the final waypoint with the exact target position if target is walkable
    if (path.length > 0 && isWalkable(targetGX, targetGZ)) {
      path[path.length - 1].x = targetWorld.x;
      path[path.length - 1].z = targetWorld.z;
    }

    return path;
  }
}
