// js/world.js
export const CELL_SIZE = 16; // Base size for 16-bit tiles
export const ZOOM = 1.8;     // Visual scale multiplier
export const WORLD_WIDTH = 60;
export const WORLD_HEIGHT = 60;
export const ISO_W = 32;     // Ancho del rombo isométrico (píxeles, pre-zoom)
export const ISO_H = 16;     // Alto del rombo isométrico (píxeles, pre-zoom)

export const RESOURCES = {
    EMPTY: 0,
    FOOD: 1,
    WATER: 2,
    WOOD: 3,
    ROCK: 4,
    BRIDGE: 5,
    HOUSE: 6,
    BOOK: 7,
    TELESCOPE: 8,
    WALL: 9,
    BUSH: 10,
    WOOD_EMPTY: 11,
    FOOD_EMPTY: 12,
    BUSH_EMPTY: 13,
    ROCK_EMPTY: 14
};

export const BIOMES = {
    GRASS:       0,
    DESERT:      1,
    WATER_BIOME: 2,
    SWAMP:       3,
    SAND:        1   // alias para retrocompatibilidad
};

export class World {
    constructor() {
        this.grid = [];
        this.generateWorld();
    }

    generateWorld() {
        // ── Generación de biomas con Voronoi ────────────────────────────────
        // Proporción de semillas: 12 pasto : 3 desierto : 3 agua : 2 pantano
        // ≈ 60% : 15% : 15% : 10%
        const seeds = [];
        const addSeeds = (biome, count) => {
            for (let i = 0; i < count; i++) {
                seeds.push({ x: Math.random() * WORLD_WIDTH, y: Math.random() * WORLD_HEIGHT, biome });
            }
        };
        addSeeds(BIOMES.GRASS,       12);
        addSeeds(BIOMES.DESERT,       3);
        addSeeds(BIOMES.WATER_BIOME,  3);
        addSeeds(BIOMES.SWAMP,        2);

        // Para cada celda, encontrar la semilla más cercana
        const getBiome = (x, y) => {
            let minDist = Infinity, result = BIOMES.GRASS;
            for (const s of seeds) {
                const d = (x - s.x) ** 2 + (y - s.y) ** 2;
                if (d < minDist) { minDist = d; result = s.biome; }
            }
            return result;
        };

        // ── Poblar grilla ────────────────────────────────────────────────────
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            let row = [];
            for (let x = 0; x < WORLD_WIDTH; x++) {
                const biome = getBiome(x, y);
                let type = RESOURCES.EMPTY;

                if (biome === BIOMES.WATER_BIOME) {
                    // Las celdas del bioma agua son agua navegable
                    type = RESOURCES.WATER;
                } else if (biome === BIOMES.GRASS) {
                    const r = Math.random();
                    if      (r < 0.03) type = RESOURCES.FOOD;
                    else if (r < 0.05) type = RESOURCES.WOOD;
                    else if (r < 0.07) type = RESOURCES.BUSH;
                    else if (r < 0.08) type = RESOURCES.ROCK;
                } else if (biome === BIOMES.DESERT) {
                    const r = Math.random();
                    if      (r < 0.01)  type = RESOURCES.FOOD;  // muy poca comida
                    else if (r < 0.02)  type = RESOURCES.ROCK;  // algunas rocas
                } else if (biome === BIOMES.SWAMP) {
                    const r = Math.random();
                    if      (r < 0.02) type = RESOURCES.FOOD;
                    else if (r < 0.04) type = RESOURCES.WOOD;
                    else if (r < 0.06) type = RESOURCES.BUSH;
                }

                let capacity = 0;
                if      (type === RESOURCES.WOOD)  capacity = Math.floor(Math.random() * 3) + 2;
                else if (type === RESOURCES.FOOD)  capacity = Math.floor(Math.random() * 2) + 2;
                else if (type === RESOURCES.BUSH)  capacity = 1;
                else if (type === RESOURCES.ROCK)  capacity = Math.floor(Math.random() * 3) + 1;
                else if (type === RESOURCES.WATER) capacity = 5;

                const terrainVariant = Math.floor(Math.random() * 4);
                row.push({ type, capacity, terrainVariant, biome });
            }
            this.grid.push(row);
        }

        // ── Río sinuoso (cruza cualquier bioma) ─────────────────────────────
        let rx = Math.floor(Math.random() * WORLD_WIDTH);
        let ry = 0;
        let dir = Math.random() < 0.5 ? 1 : -1;
        while (ry < WORLD_HEIGHT) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    let cx = rx + dx, cy = ry + dy;
                    if (cx >= 0 && cx < WORLD_WIDTH && cy >= 0 && cy < WORLD_HEIGHT) {
                        if (Math.abs(dx) + Math.abs(dy) <= 2) {
                            const biome = this.grid[cy][cx].biome;
                            this.grid[cy][cx] = { type: RESOURCES.WATER, capacity: 5, terrainVariant: 0, biome };
                        }
                    }
                }
            }
            ry += 1;
            if (Math.random() < 0.4) rx += dir;
            if (Math.random() < 0.1) dir *= -1;
        }
    }

    getCell(x, y) {
        if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
            return this.grid[y][x];
        }
        return null;
    }

    setCell(x, y, type, capacity = null) {
        if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
            let cap = capacity;
            if (cap === null) {
                if (type === RESOURCES.HOUSE) {
                    cap = 10; // La casa tiene 10 de vida
                } else if (type === RESOURCES.WALL) {
                    cap = 5; // La muralla tiene 5 de vida
                } else if (type === RESOURCES.WOOD) {
                    cap = Math.floor(Math.random() * 3) + 2;
                } else if (type === RESOURCES.BUSH) {
                    cap = 1;
                } else {
                    cap = (type === RESOURCES.EMPTY || type === RESOURCES.BRIDGE || type === RESOURCES.TELESCOPE || type === RESOURCES.BOOK || type === RESOURCES.WOOD_EMPTY || type === RESOURCES.FOOD_EMPTY || type === RESOURCES.BUSH_EMPTY || type === RESOURCES.ROCK_EMPTY) ? 0 : Math.floor(Math.random() * 3) + 1;
                }
            }
            let tv = (this.grid[y] && this.grid[y][x]) ? this.grid[y][x].terrainVariant : Math.floor(Math.random() * 4);
            // Preservar el bioma existente; si no existe, recalcularlo por distancia al centro
            let existingBiome = (this.grid[y] && this.grid[y][x] && this.grid[y][x].biome !== undefined)
                ? this.grid[y][x].biome
                : BIOMES.GRASS;
            this.grid[y][x] = { type: type, capacity: cap, terrainVariant: tv, biome: existingBiome };
        }
    }

    consumeResource(x, y) {
        if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
            let cell = this.grid[y][x];
            if (cell.type !== RESOURCES.EMPTY && cell.type !== RESOURCES.BRIDGE) {
                cell.capacity--;
                if (cell.capacity <= 0) {
                    if (cell.type === RESOURCES.WOOD) cell.type = RESOURCES.WOOD_EMPTY;
                    else if (cell.type === RESOURCES.FOOD) cell.type = RESOURCES.FOOD_EMPTY;
                    else if (cell.type === RESOURCES.BUSH) cell.type = RESOURCES.BUSH_EMPTY;
                    else if (cell.type === RESOURCES.ROCK) cell.type = RESOURCES.ROCK_EMPTY;
                    else cell.type = RESOURCES.EMPTY;
                    
                    cell.capacity = 0;
                }
            }
        }
    }

    findNearest(startX, startY, resourceTypes, ignoreX = -1, ignoreY = -1) {
        if (!Array.isArray(resourceTypes)) resourceTypes = [resourceTypes];
        let nearest = null;
        let minDistance = Infinity;

        for (let y = 0; y < WORLD_HEIGHT; y++) {
            for (let x = 0; x < WORLD_WIDTH; x++) {
                if (x === ignoreX && y === ignoreY) continue;
                if (resourceTypes.includes(this.grid[y][x].type)) {
                    let dist = Math.abs(x - startX) + Math.abs(y - startY);
                    if (dist < minDistance) {
                        minDistance = dist;
                        nearest = {x, y};
                    }
                }
            }
        }
        return nearest;
    }

    findNearest2x2Empty(startX, startY) {
        let nearest = null;
        let minDistance = Infinity;

        // Helper: verifica que ninguna de las 4 celdas 2x2 sea agua
        const noWater = (x, y) => {
            for (let dy = 0; dy < 2; dy++)
                for (let dx = 0; dx < 2; dx++)
                    if (this.grid[y+dy][x+dx].type === RESOURCES.WATER) return false;
            return true;
        };

        // Intento 1: área 2x2 completamente vacía y sin agua
        for (let y = 0; y < WORLD_HEIGHT - 1; y++) {
            for (let x = 0; x < WORLD_WIDTH - 1; x++) {
                if (this.grid[y][x].type   === RESOURCES.EMPTY &&
                    this.grid[y][x+1].type === RESOURCES.EMPTY &&
                    this.grid[y+1][x].type === RESOURCES.EMPTY &&
                    this.grid[y+1][x+1].type === RESOURCES.EMPTY &&
                    noWater(x, y)) {

                    let dist = Math.abs(x - startX) + Math.abs(y - startY);
                    if (dist < minDistance) { minDistance = dist; nearest = {x, y}; }
                }
            }
        }
        if (nearest) return nearest;

        // Intento 2: área 2x2 sin agua ni roca (puede tener recursos)
        for (let y = 0; y < WORLD_HEIGHT - 1; y++) {
            for (let x = 0; x < WORLD_WIDTH - 1; x++) {
                let valid = true;
                for (let dy = 0; dy < 2; dy++) {
                    for (let dx = 0; dx < 2; dx++) {
                        let t = this.grid[y+dy][x+dx].type;
                        if (t === RESOURCES.WATER || t === RESOURCES.ROCK) { valid = false; break; }
                    }
                    if (!valid) break;
                }
                if (valid) {
                    let dist = Math.abs(x - startX) + Math.abs(y - startY);
                    if (dist < minDistance) { minDistance = dist; nearest = {x, y}; }
                }
            }
        }
        if (nearest) return nearest;

        // Intento 3 (extremo): cualquier 2x2 seco — NUNCA sobre agua
        for (let y = 0; y < WORLD_HEIGHT - 1; y++) {
            for (let x = 0; x < WORLD_WIDTH - 1; x++) {
                if (!noWater(x, y)) continue; // siempre excluir agua
                let dist = Math.abs(x - startX) + Math.abs(y - startY);
                if (dist < minDistance) { minDistance = dist; nearest = {x, y}; }
            }
        }

        return nearest;
    }

    regenLoop(agent) {
        // Solo 1 intento por tick, con 5% de probabilidad → mucho más lento
        if (Math.random() < 0.05) {
            let x = Math.floor(Math.random() * WORLD_WIDTH);
            let y = Math.floor(Math.random() * WORLD_HEIGHT);
            
            // Evitar spawnear recursos muy cerca de la casa para dejar espacio a las murallas
            if (agent && agent.home) {
                let hx = agent.home.x;
                let hy = agent.home.y;
                if (x >= hx - 2 && x <= hx + 3 && y >= hy - 2 && y <= hy + 3) {
                    return;
                }
            }

            if (this.grid[y][x].type === RESOURCES.EMPTY) {
                const r = Math.random();
                let type = RESOURCES.FOOD;
                if (r < 0.30) type = RESOURCES.WOOD;
                else if (r < 0.50) type = RESOURCES.BUSH;
                // Sin regeneración de roca ni agua espontánea
                
                this.setCell(x, y, type);
            } else if (this.grid[y][x].type === RESOURCES.WOOD_EMPTY || 
                       this.grid[y][x].type === RESOURCES.FOOD_EMPTY || 
                       this.grid[y][x].type === RESOURCES.BUSH_EMPTY ||
                       this.grid[y][x].type === RESOURCES.ROCK_EMPTY) {
                // Desaparecen con el tiempo
                if (Math.random() < 0.7) {
                    this.grid[y][x].type = RESOURCES.EMPTY;
                }
            }
        }
    }
}
