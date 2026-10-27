/**
 * Castle Wolfenstein Escape - Level 1 Map Grid & Spawns
 * Grid coordinates are translated to 3D world space (x * TILE_SIZE, 0, z * TILE_SIZE).
 *
 * Tile Legend:
 * 0: Empty floor
 * 1: Stone Brick Wall
 * 2: Steel Bunker Wall (Sector B / Vault)
 * 3: Castle Column / Pillar
 * 4: Secret Push-Wall (Interacting slides wall back)
 * D: Standard Dungeon Door
 * S: Silver Key Locked Door
 * G: Gold Key Locked Door
 * P: Player Spawn (Dungeon Cell 1)
 * E1: Guard (Luger Pistol)
 * E2: SS Officer (MP40 Machine Gun)
 * K_S: Silver Key
 * K_G: Gold Key
 * RELIC: Ancient Wolfenstein Eagle Relic (GLTF model in Secret Room)
 * MED: Medkit (+25 HP)
 * AMM: Ammo Box (+25 Bullets)
 * BAR: Explosive Red Barrel
 * CHAL: Treasure Golden Chalice (+500 PTS)
 * TOR: Wall Torch Sconce
 * EXIT: Castle Escape Elevator
 */

export const TILE_SIZE = 3.0;
export const WALL_HEIGHT = 3.6;

// 24 x 24 Level Grid
export const MAP_LAYOUT = [
  // 00   01   02   03   04   05   06   07   08   09   10   11   12   13   14   15   16   17   18   19   20   21   22   23
  ['1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1'], // 00
  ['1', 'P', '0', '1', '0', '0', '0', '1', '1', '0', '0', '0', '1', '2', '2', '2', '2', '2', '2', '2', '2', '2', '2', '1'], // 01 (Spawn in cell)
  ['1', '0', '0', 'D', '0', '0', '0', '1', '1', '0', '0', '0', '1', '2', '0', '0', '0', '0', '0', '0', '0', 'EXIT', '2', '1'], // 02 (Elevator room)
  ['1', '1', '1', '1', '0', '1', '0', '1', '1', '0', '0', '0', '1', '2', '0', '0', '0', '0', '0', '0', '0', '0', '2', '1'], // 03
  ['1', '0', '0', '0', '0', '1', '0', '0', '0', '0', '0', '0', '1', '2', '0', '0', '0', '0', '0', '0', '0', '0', '2', '1'], // 04
  ['1', '0', '0', '0', '0', '1', '0', '1', '1', '1', 'D', '1', '1', '2', '2', '2', 'G', '2', '2', '2', '2', '2', '2', '1'], // 05 (Gold Door to Exit)
  ['1', '0', '0', '0', '0', 'D', '0', '1', '0', '0', '0', '0', '1', '1', '0', '0', '0', '0', '0', '0', '0', '0', '1', '1'], // 06
  ['1', '1', '1', '0', '1', '1', '0', '1', '0', '0', '0', '0', '1', '1', '0', '0', '0', '0', '0', '0', '0', '0', '1', '1'], // 07
  ['1', '0', '0', '0', '0', '0', '0', 'D', '0', '0', '0', '0', '1', '1', '0', '3', '0', '0', '0', '3', '0', '0', '1', '1'], // 08 (Sector B Grand Hall)
  ['1', '0', '1', '1', '1', '1', '1', '1', '1', '1', 'S', '1', '1', '1', '0', '0', '0', '0', '0', '0', '0', '0', '1', '1'], // 09 (Silver Door)
  ['1', '0', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1', '1'], // 10
  ['1', '0', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '3', '0', '0', '0', '3', '0', '0', '1', '1'], // 11
  ['1', '0', '1', '0', '1', '1', 'D', '1', '1', '0', '1', '1', '1', '1', '0', '0', '0', '0', '0', '0', '0', '0', '1', '1'], // 12
  ['1', '0', '0', '0', '1', '0', '0', '0', '1', '0', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1'], // 13
  ['1', '1', '1', '0', '1', '0', '0', '0', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1'], // 14
  ['1', '0', '0', '0', '1', '0', '0', '0', '1', '0', '1', '1', '1', '1', '4', '1', '1', '1', '1', '1', '1', '1', '0', '1'], // 15 (Push Wall at 14 to Secret Relic Chamber!)
  ['1', '0', '1', '1', '1', '1', '0', '1', '1', '0', '1', '1', '0', '0', '0', '0', '1', '1', '0', '0', '0', '1', '0', '1'], // 16
  ['1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1', '1', '0', 'RELIC', '0', '0', '1', '1', '0', '0', '0', '1', '0', '1'], // 17 (Secret Relic Chamber!)
  ['1', '1', '1', '1', '1', '1', '1', '1', '1', '0', '1', '1', '0', '0', '0', '0', '1', '1', '0', '0', '0', '1', '0', '1'], // 18
  ['1', '0', '0', '0', '0', '0', '0', '0', '1', '0', '1', '1', '1', '1', '1', '1', '1', '1', '0', '0', '0', '1', '0', '1'], // 19
  ['1', '0', '1', '1', '0', '1', '1', '0', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1'], // 20
  ['1', '0', '1', '1', '0', '1', '1', '0', 'D', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1'], // 21
  ['1', '0', '0', '0', '0', '0', '0', '0', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '1'], // 22
  ['1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1', '1'], // 23
];

// Entity Placements & Coordinates (Grid x, Grid z)
export const ENTITY_SPAWNS = [
  // Enemies (Positions and strictly valid open corridor waypoints)
  { type: 'guard', x: 1, z: 6, rot: 0, patrol: [{ x: 1, z: 6 }, { x: 3, z: 6 }, { x: 3, z: 8 }, { x: 1, z: 8 }] },
  { type: 'guard', x: 6, z: 4, rot: Math.PI / 2, patrol: [{ x: 6, z: 4 }, { x: 9, z: 4 }] },
  { type: 'guard', x: 6, z: 14, rot: -Math.PI / 2, patrol: [{ x: 6, z: 14 }, { x: 6, z: 17 }] },
  { type: 'guard', x: 9, z: 8, rot: 0, patrol: [{ x: 9, z: 8 }, { x: 9, z: 6 }] },
  { type: 'guard', x: 16, z: 8, rot: Math.PI, patrol: [{ x: 16, z: 8 }, { x: 18, z: 8 }] },
  { type: 'guard', x: 18, z: 11, rot: -Math.PI / 2, patrol: [{ x: 18, z: 11 }, { x: 16, z: 11 }] },
  // Boss SS Officer in Sector B
  { type: 'officer', x: 18, z: 9, rot: Math.PI, dropsGoldKey: true, dropsMP40: true },

  // Vault Guardians
  { type: 'officer', x: 17, z: 3, rot: Math.PI / 2 },
  { type: 'guard', x: 19, z: 2, rot: Math.PI },

  // Items & Collectibles
  { type: 'medkit', x: 1, z: 4 },
  { type: 'ammo', x: 2, z: 4 },
  { type: 'ammo', x: 1, z: 7 },
  { type: 'silver_key', x: 6, z: 16 }, // Silver Key in the Barracks!
  { type: 'medkit', x: 7, z: 16 },
  { type: 'ammo', x: 6, z: 17 },
  { type: 'gold_chalice', x: 14, z: 7 }, // Treasure in Grand Hall
  { type: 'gold_chalice', x: 21, z: 7 },
  { type: 'medkit', x: 20, z: 11 },
  { type: 'ammo', x: 21, z: 11 },

  // Secret Relic in Secret Room
  { type: 'relic', x: 14, z: 17 },
  { type: 'gold_chalice', x: 13, z: 17 },
  { type: 'medkit', x: 15, z: 17 },

  // Explosive Red Barrels
  { type: 'barrel', x: 4, z: 4 },
  { type: 'barrel', x: 7, z: 13 },
  { type: 'barrel', x: 8, z: 13 },
  { type: 'barrel', x: 15, z: 6 },
  { type: 'barrel', x: 20, z: 6 },
  { type: 'barrel', x: 15, z: 3 },

  // Torches on walls (Point lights with flame VFX)
  { type: 'torch', x: 2.5, z: 1.0, wallSide: 'south' }, // Cell 1 corridor torch
  { type: 'torch', x: 1.5, z: 2, wallSide: 'east' },
  { type: 'torch', x: 3.5, z: 4, wallSide: 'west' },
  { type: 'torch', x: 5.5, z: 7, wallSide: 'north' },
  { type: 'torch', x: 7.5, z: 14, wallSide: 'south' },
  { type: 'torch', x: 9.5, z: 7, wallSide: 'north' },
  { type: 'torch', x: 14.5, z: 9, wallSide: 'west' },
  { type: 'torch', x: 20.5, z: 9, wallSide: 'east' },
  { type: 'torch', x: 17.5, z: 5, wallSide: 'north' },
  { type: 'torch', x: 14, z: 18, wallSide: 'south' }, // In Secret Room (Mounted on South wall)
  { type: 'torch', x: 15, z: 17, wallSide: 'east' },  // In Secret Room (Mounted on East wall)
  { type: 'torch', x: 20.5, z: 1.5, wallSide: 'west' }, // In Elevator Exit Room

  // Wall Banners (Mounted flush to castle stone walls with iron crossbars & finials)
  { type: 'banner', x: 2, z: 1, wallSide: 'north' },   // Starting Cell Corridor Wall
  { type: 'banner', x: 16, z: 12, wallSide: 'south' }, // Grand Hall South Wall (Left)
  { type: 'banner', x: 19, z: 12, wallSide: 'south' }, // Grand Hall South Wall (Right)
  { type: 'banner', x: 15, z: 6, wallSide: 'north' },  // Grand Hall North Wall
  { type: 'banner', x: 18, z: 6, wallSide: 'north' },  // Grand Hall North Wall
  { type: 'banner', x: 14, z: 8, wallSide: 'west' },   // Grand Hall West Wall
];
