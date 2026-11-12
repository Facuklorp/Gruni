// js/world.js
export const CELL_SIZE = 16; // Base size for 16-bit tiles
export let ZOOM = 3.0;       // Visual scale multiplier

export const ISO_W = 32;     // Ancho del rombo isométrico (píxeles, pre-zoom)
export const ISO_H = 16;     // Alto del rombo isométrico (píxeles, pre-zoom)

import { MAP_DATA } from './map_data.js';
import { ZONES } from './zones.js';

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

function hashString(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function createSeededRandom(seed) {
    let s = (typeof seed === 'number' ? seed : hashString(String(seed))) >>> 0;
    return function() {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export class World {
    constructor(initialZoneId = 'pradera') {
        this.grids = {};
        this.grid = [];
        this.currentZoneId = null;
        this.currentZone = null;
        this.loadZone(initialZoneId);
    }
    
    loadZone(zoneId) {
        if (!ZONES[zoneId]) return false;
        this.currentZoneId = zoneId;
        this.currentZone = ZONES[zoneId];
        this.width = this.currentZone.width;
        this.height = this.currentZone.height;
        if (!this.grids[zoneId]) this.generateWorld(zoneId);
        this.grid = this.grids[zoneId];
        
        if (typeof document !== 'undefined') {
            let display = document.getElementById('current-zone-display');
            if (display) {
                display.innerText = 'Zona: ' + this.currentZone.name;
            }
        }
        
        return true;
    }

    generateCanonicalCell(zoneId, x, y, rng) {
        // ── 1. Pradera (Centro - Spawn de Gruni) ─────────────────────────────
        if (zoneId === 'pradera') {
            // Claro central limpio para el spawn y la casa de Gruni
            if (x >= 16 && x <= 22 && y >= 16 && y <= 22) {
                return RESOURCES.EMPTY;
            }
            // Arroyo serpenteante de agua dulce al este
            let streamCenter = 29 + Math.sin(y * 0.28) * 2;
            if (Math.abs(x - streamCenter) < 1.1) {
                // Paso o vado natural de tierra en y = 19
                if (y !== 19 && y !== 20) return RESOURCES.WATER;
            }
            let rVal = rng();
            if (rVal < 0.055) return RESOURCES.WOOD;
            if (rVal < 0.075) return RESOURCES.ROCK;
            if (rVal < 0.095) return RESOURCES.FOOD;
            if (rVal < 0.115) return RESOURCES.BUSH;
            return RESOURCES.EMPTY;
        }

        // ── 2. Desierto (Sur) ────────────────────────────────────────────────
        if (zoneId === 'desierto') {
            // Oasis central-oeste con agua y vegetación
            let distOasis = Math.hypot(x - 13, y - 18);
            if (distOasis < 2.2) return RESOURCES.WATER;
            if (distOasis < 3.8 && rng() < 0.6) return RESOURCES.FOOD; // Palmeras datileras
            let rVal = rng();
            if (rVal < 0.05) return RESOURCES.ROCK; // Más rocas
            if (rVal < 0.08) return RESOURCES.WOOD; // Cáctus / árboles secos
            return RESOURCES.EMPTY;
        }

        // ── 3. Bosque y Río (Este) ───────────────────────────────────────────
        if (zoneId === 'bosque_rio') {
            // Gran río central de norte a sur
            let riverCenter = 19 + Math.sin(y * 0.22) * 2.5;
            if (Math.abs(x - riverCenter) < 1.4) {
                if (y !== 18 && y !== 19) return RESOURCES.WATER; // Vado para cruzar
            }
            let rVal = rng();
            if (rVal < 0.09) return RESOURCES.WOOD; // Bosque tupido
            if (rVal < 0.11) return RESOURCES.FOOD;
            if (rVal < 0.13) return RESOURCES.ROCK;
            return RESOURCES.EMPTY;
        }

        // ── 4. Aldea y Campo (Oeste) ─────────────────────────────────────────
        if (zoneId === 'aldea_campo') {
            // Pozo de agua de la aldea en el centro
            if (Math.hypot(x - 19, y - 19) < 1.4) return RESOURCES.WATER;
            // Caminos cruzados de la aldea
            if (Math.abs(x - 19) <= 1 || Math.abs(y - 19) <= 1) return RESOURCES.EMPTY;
            let rVal = rng();
            if (rVal < 0.06) return RESOURCES.FOOD; // Huertos y cultivos
            if (rVal < 0.09) return RESOURCES.WOOD;
            if (rVal < 0.11) return RESOURCES.ROCK;
            return RESOURCES.EMPTY;
        }

        // ── 5. Bosque Mágico (Noreste) ───────────────────────────────────────
        if (zoneId === 'bosque_magico') {
            let rVal = rng();
            if (rVal < 0.035) return RESOURCES.MAGIC_TREE;
            if (rVal < 0.09) return RESOURCES.WOOD;
            if (rVal < 0.11) return RESOURCES.FOOD;
            if (rVal < 0.13) return RESOURCES.ROCK;
            return RESOURCES.EMPTY;
        }

        // ── 6. Montañas Nevadas (Norte) ──────────────────────────────────────
        if (zoneId === 'montanas_nevadas') {
            let rVal = rng();
            if (rVal < 0.075) return RESOURCES.ROCK; // Formaciones rocosas altas
            if (rVal < 0.12) return RESOURCES.WOOD; // Pinos de montaña
            return RESOURCES.EMPTY;
        }

        // ── 7. Zonas de Hielo (Noroeste) ────────────────────────────────────
        if (zoneId === 'zonas_hielo') {
            let distLake = Math.hypot(x - 20, y - 20);
            if (distLake < 3.8 && rng() < 0.75) return RESOURCES.WATER; // Lago helado
            let rVal = rng();
            if (rVal < 0.06) return RESOURCES.ROCK;
            if (rVal < 0.10) return RESOURCES.WOOD;
            return RESOURCES.EMPTY;
        }

        // ── 8. Playa (Suroeste) ──────────────────────────────────────────────
        if (zoneId === 'playa') {
            // Océano en franja exterior
            if (x < 5 || y > 33) return RESOURCES.WATER;
            let rVal = rng();
            if (rVal < 0.05) return RESOURCES.FOOD; // Palmeras playeras
            if (rVal < 0.08) return RESOURCES.WOOD;
            if (rVal < 0.10) return RESOURCES.ROCK;
            return RESOURCES.EMPTY;
        }

        // ── 9. Cementerio de Animales (Sureste) ──────────────────────────────
        if (zoneId === 'cementerio_animales') {
            let rVal = rng();
            if (rVal < 0.085) return RESOURCES.ROCK; // Rocas y restos
            if (rVal < 0.115) return RESOURCES.WOOD; // Madera marchita
            return RESOURCES.EMPTY;
        }

        let rVal = rng();
        if (rVal < 0.05) return RESOURCES.WOOD;
        if (rVal < 0.02) return RESOURCES.ROCK;
        if (rVal < 0.02) return RESOURCES.FOOD;
        return RESOURCES.EMPTY;
    }

    generateWorld(zoneId) {
        let zone = ZONES[zoneId];
        let newGrid = [];
        const rng = createSeededRandom('gruni_canonical_zone_' + zoneId);

        for (let y = 0; y < this.height; y++) {
            let row = [];
            for (let x = 0; x < this.width; x++) {
                let cellData = null;
                if (zone.mapData && zone.mapData[y] && zone.mapData[y][x]) {
                    cellData = zone.mapData[y][x];
                }
                
                let type = RESOURCES.EMPTY;
                let biome = BIOMES[zone.defaultBiome];
                
                if (cellData) {
                    type = RESOURCES[cellData.t] || RESOURCES.EMPTY;
                    biome = BIOMES[cellData.b] !== undefined ? BIOMES[cellData.b] : biome;
                } else {
                    type = this.generateCanonicalCell(zoneId, x, y, rng);
                }
                
                let capacity = 0;
                if      (type === RESOURCES.WOOD)  capacity = Math.floor(rng() * 2) + 3; // 3 a 4 (Fase 1 completa)
                else if (type === RESOURCES.FOOD)  capacity = Math.floor(rng() * 2) + 2;
                else if (type === RESOURCES.BUSH)  capacity = 1;
                else if (type === RESOURCES.ROCK)  capacity = Math.floor(rng() * 3) + 1;
                else if (type === RESOURCES.WATER) capacity = 5;

                const terrainVariant = Math.floor(rng() * 4);
                row.push({ type, capacity, terrainVariant, biome });
            }
            newGrid.push(row);
        }
        this.grids[zoneId] = newGrid;
    }

    serialize() {
        const serializedGrids = {};
        for (const [zId, grid] of Object.entries(this.grids)) {
            serializedGrids[zId] = grid.map(row => 
                row.map(cell => [cell.type, cell.capacity, cell.terrainVariant, cell.biome])
            );
        }
        return {
            currentZoneId: this.currentZoneId,
            grids: serializedGrids
        };
    }

    deserialize(data) {
        if (!data || !data.grids) return false;
        this.grids = {};
        for (const [zId, gridData] of Object.entries(data.grids)) {
            this.grids[zId] = gridData.map(row => 
                row.map(([type, capacity, terrainVariant, biome]) => ({
                    type,
                    capacity,
                    terrainVariant,
                    biome
                }))
            );
        }
        if (data.currentZoneId && ZONES[data.currentZoneId]) {
            this.loadZone(data.currentZoneId);
        }
        return true;
    }


    transitionZone(agent, direction) {
        if (!this.currentZone || !this.currentZone.connections) return false;
        const nextZoneId = this.currentZone.connections[direction];
        if (!nextZoneId || !ZONES[nextZoneId]) return false;
        
        this.loadZone(nextZoneId);
        
        if (direction === 'east') agent.x = 0;
        if (direction === 'west') agent.x = this.width - 1;
        if (direction === 'south') agent.y = 0;
        if (direction === 'north') agent.y = this.height - 1;
        
        agent.renderX = agent.x;
        agent.renderY = agent.y;
        
        if (typeof window !== 'undefined' && window.game) {
            if (window.game.setEnemies) window.game.setEnemies([]);
            if (window.game.getWolf) {
                let w = window.game.getWolf();
                if (w) { w.x = agent.x; w.y = agent.y; }
            }
        }
        
        agent.path = [];
        agent.target = null;
        return true;
    }

    getCell(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.grid[y][x];
        }
        return null;
    }

    setCell(x, y, type, capacity = null) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            let cap = capacity;
            if (cap === null) {
                if (type === RESOURCES.HOUSE) {
                    cap = 10; // La casa tiene 10 de vida
                } else if (type === RESOURCES.WALL) {
                    cap = 5; // La muralla tiene 5 de vida
                } else if (type === RESOURCES.WOOD) {
                    cap = Math.floor(Math.random() * 2) + 3; // 3 a 4 (Fase 1 completa)
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
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
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

        let newGrid = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
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
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width - 1; x++) {
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
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width - 1; x++) {
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
        for (let y = 0; y < this.height - 1; y++) {
            for (let x = 0; x < this.width - 1; x++) {
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
            let x = Math.floor(Math.random() * this.width);
            let y = Math.floor(Math.random() * this.height);
            
            // Evitar spawnear recursos dentro del patio de la muralla y en el claro de visión
            if (agent && agent.home) {
                let hx = agent.home.x;
                let hy = agent.home.y;
                if (x >= hx - 7 && x <= hx + 8 && y >= hy - 7 && y <= hy + 8) {
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
