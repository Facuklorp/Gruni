// js/world.js
export const CELL_SIZE = 16; // Base size for 16-bit tiles
export const ZOOM = 3.5; // Visual scale multiplier
export const WORLD_WIDTH = 60;
export const WORLD_HEIGHT = 60;

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
    BUSH_EMPTY: 13
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
                const rand = Math.random();
                let type = RESOURCES.EMPTY;
                
                if (rand < 0.06) type = RESOURCES.FOOD;
                else if (rand < 0.10) type = RESOURCES.WOOD;
                else if (rand < 0.14) type = RESOURCES.BUSH;
                else if (rand < 0.17) type = RESOURCES.ROCK;

                let capacity = 0;
                if (type === RESOURCES.WOOD) capacity = Math.floor(Math.random() * 3) + 2; // 2-4 wood
                else if (type === RESOURCES.FOOD) capacity = Math.floor(Math.random() * 2) + 2; // 2-3 food
                else if (type === RESOURCES.BUSH) capacity = 1; // bush gives 1 wood
                else if (type === RESOURCES.ROCK) capacity = Math.floor(Math.random() * 3) + 1; // 1-3 rock
                let terrainVariant = Math.floor(Math.random() * 4);
                row.push({ type: type, capacity: capacity, terrainVariant: terrainVariant });
            }
            this.grid.push(row);
        }

        // Generar lagos
        let numLakes = Math.floor(Math.random() * 3) + 2;
        for (let i = 0; i < numLakes; i++) {
            let lx = Math.floor(Math.random() * WORLD_WIDTH);
            let ly = Math.floor(Math.random() * WORLD_HEIGHT);
            let radius = Math.floor(Math.random() * 4) + 3; // Radio 3 a 6
            for (let y = -radius; y <= radius; y++) {
                for (let x = -radius; x <= radius; x++) {
                    if (x * x + y * y <= radius * radius) {
                        let cx = lx + x, cy = ly + y;
                        if (cx >= 0 && cx < WORLD_WIDTH && cy >= 0 && cy < WORLD_HEIGHT) {
                            this.grid[cy][cx] = { type: RESOURCES.WATER, capacity: 5, terrainVariant: 0 };
                        }
                    }
                }
            }
        }

        // Generar un río largo y sinuoso
        let rx = Math.floor(Math.random() * WORLD_WIDTH);
        let ry = 0;
        let dir = Math.random() < 0.5 ? 1 : -1;
        while (ry < WORLD_HEIGHT) {
            // Un río de ancho variable
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    let cx = rx + dx, cy = ry + dy;
                    if (cx >= 0 && cx < WORLD_WIDTH && cy >= 0 && cy < WORLD_HEIGHT) {
                        // Forma redondeada para el río
                        if (Math.abs(dx) + Math.abs(dy) <= 2) {
                            this.grid[cy][cx] = { type: RESOURCES.WATER, capacity: 5, terrainVariant: 0 };
                        }
                    }
                }
            }
            ry += 1;
            if (Math.random() < 0.4) rx += dir;
            if (Math.random() < 0.1) dir *= -1; // A veces cambia de dirección
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
                    cap = (type === RESOURCES.EMPTY || type === RESOURCES.BRIDGE || type === RESOURCES.TELESCOPE || type === RESOURCES.BOOK || type === RESOURCES.WOOD_EMPTY || type === RESOURCES.FOOD_EMPTY || type === RESOURCES.BUSH_EMPTY) ? 0 : Math.floor(Math.random() * 3) + 1;
                }
            }
            let tv = (this.grid[y] && this.grid[y][x]) ? this.grid[y][x].terrainVariant : Math.floor(Math.random() * 4);
            this.grid[y][x] = { type: type, capacity: cap, terrainVariant: tv };
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

        // Try to find purely empty first
        for (let y = 0; y < WORLD_HEIGHT - 1; y++) {
            for (let x = 0; x < WORLD_WIDTH - 1; x++) {
                if (this.grid[y][x].type === RESOURCES.EMPTY &&
                    this.grid[y][x+1].type === RESOURCES.EMPTY &&
                    this.grid[y+1][x].type === RESOURCES.EMPTY &&
                    this.grid[y+1][x+1].type === RESOURCES.EMPTY) {
                    
                    let dist = Math.abs(x - startX) + Math.abs(y - startY);
                    if (dist < minDistance) {
                        minDistance = dist;
                        nearest = {x, y};
                    }
                }
            }
        }
        if (nearest) return nearest;

        // Fallback: any 2x2 area without water/rock
        for (let y = 0; y < WORLD_HEIGHT - 1; y++) {
            for (let x = 0; x < WORLD_WIDTH - 1; x++) {
                let valid = true;
                for (let dy=0; dy<2; dy++) {
                    for (let dx=0; dx<2; dx++) {
                        let t = this.grid[y+dy][x+dx].type;
                        if (t === RESOURCES.WATER || t === RESOURCES.ROCK) valid = false;
                    }
                }
                if (valid) {
                    let dist = Math.abs(x - startX) + Math.abs(y - startY);
                    if (dist < minDistance) {
                        minDistance = dist;
                        nearest = {x, y};
                    }
                }
            }
        }
        if (nearest) return nearest;

        // Extreme Fallback: ANY 2x2 area inside bounds (he clears everything)
        for (let y = 0; y < WORLD_HEIGHT - 1; y++) {
            for (let x = 0; x < WORLD_WIDTH - 1; x++) {
                let dist = Math.abs(x - startX) + Math.abs(y - startY);
                if (dist < minDistance) {
                    minDistance = dist;
                    nearest = {x, y};
                }
            }
        }

        return nearest;
    }

    regenLoop(agent) {
        for (let i = 0; i < 2; i++) {
            if (Math.random() < 0.2) { // 20% de probabilidad por intento
                let x = Math.floor(Math.random() * WORLD_WIDTH);
                let y = Math.floor(Math.random() * WORLD_HEIGHT);
                
                // Evitar spawnear recursos muy cerca de la casa para dejar espacio a las murallas
                if (agent && agent.home) {
                    let hx = agent.home.x;
                    let hy = agent.home.y;
                    // La casa ocupa (hx, hy) hasta (hx+1, hy+1). Dejamos 2 casilleros de margen.
                    if (x >= hx - 2 && x <= hx + 3 && y >= hy - 2 && y <= hy + 3) {
                        continue;
                    }
                }

                if (this.grid[y][x].type === RESOURCES.EMPTY) {
                    const r = Math.random();
                    let type = RESOURCES.FOOD; // 30% comida
                    if (r < 0.25) type = RESOURCES.WOOD; // 25% madera
                    else if (r < 0.50) type = RESOURCES.ROCK; // 25% roca
                    else if (r < 0.65) type = RESOURCES.BUSH; // 15% arbusto
                    else if (r < 0.80) type = RESOURCES.WATER; // 15% agua
                    
                    this.setCell(x, y, type);
                } else if (this.grid[y][x].type === RESOURCES.WOOD_EMPTY && Math.random() < 0.1) {
                    this.grid[y][x].type = RESOURCES.WOOD;
                    this.grid[y][x].capacity = Math.floor(Math.random() * 3) + 2;
                } else if (this.grid[y][x].type === RESOURCES.FOOD_EMPTY && Math.random() < 0.1) {
                    this.grid[y][x].type = RESOURCES.FOOD;
                    this.grid[y][x].capacity = Math.floor(Math.random() * 2) + 2;
                } else if (this.grid[y][x].type === RESOURCES.BUSH_EMPTY && Math.random() < 0.1) {
                    this.grid[y][x].type = RESOURCES.BUSH;
                    this.grid[y][x].capacity = 1;
                }
            }
        }
    }
}
