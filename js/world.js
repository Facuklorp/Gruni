// js/world.js
export const CELL_SIZE = 16; // Base size for 16-bit tiles
export const ZOOM = 3.0;     // Visual scale multiplier (Ajustado a 3.0 para la imagen de 5760px)
export const WORLD_WIDTH = 84;
export const WORLD_HEIGHT = 104;
export const ISO_W = 32;     // Ancho del rombo isométrico (píxeles, pre-zoom)
export const ISO_H = 16;     // Alto del rombo isométrico (píxeles, pre-zoom)

import { MAP_DATA } from './map_data.js';

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
    ROCK_EMPTY: 14,
    MARKET: 15,
    MAGIC_TREE: 16,
    VOID: 99
};

export const BIOMES = {
    GRASS:       0,
    DESERT:      1,
    WATER_BIOME: 2,
    SWAMP:       3,
    SAND:        1,  // alias para retrocompatibilidad
    SNOW:        4,
    PINE:        5
};

export class World {
    constructor() {
        this.grid = [];
        this.generateWorld();
    }

    generateWorld() {
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            let row = [];
            for (let x = 0; x < WORLD_WIDTH; x++) {
                const cellData = MAP_DATA[y][x];
                let type = RESOURCES[cellData.t] || RESOURCES.EMPTY;
                let biome = BIOMES[cellData.b] || BIOMES.GRASS;
                
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
