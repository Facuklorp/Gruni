// js/world.js
export const CELL_SIZE = 30;
export const WORLD_WIDTH = 20;
export const WORLD_HEIGHT = 20;

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
    WALL: 9
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
                
                if (rand < 0.05) type = RESOURCES.WATER;
                else if (rand < 0.1) type = RESOURCES.FOOD;
                else if (rand < 0.15) type = RESOURCES.WOOD;
                else if (rand < 0.18) type = RESOURCES.ROCK;

                let capacity = (type === RESOURCES.EMPTY) ? 0 : Math.floor(Math.random() * 3) + 1;
                row.push({ type: type, capacity: capacity });
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
                } else {
                    cap = (type === RESOURCES.EMPTY || type === RESOURCES.BRIDGE || type === RESOURCES.TELESCOPE || type === RESOURCES.BOOK) ? 0 : Math.floor(Math.random() * 3) + 1;
                }
            }
            this.grid[y][x] = { type: type, capacity: cap };
        }
    }

    consumeResource(x, y) {
        if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
            let cell = this.grid[y][x];
            if (cell.type !== RESOURCES.EMPTY && cell.type !== RESOURCES.BRIDGE) {
                cell.capacity--;
                if (cell.capacity <= 0) {
                    cell.type = RESOURCES.EMPTY;
                    cell.capacity = 0;
                }
            }
        }
    }

    findNearest(startX, startY, resourceType) {
        let nearest = null;
        let minDistance = Infinity;

        for (let y = 0; y < WORLD_HEIGHT; y++) {
            for (let x = 0; x < WORLD_WIDTH; x++) {
                if (this.grid[y][x].type === resourceType) {
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
        return nearest;
    }

    regenLoop() {
        for (let i = 0; i < 2; i++) {
            if (Math.random() < 0.2) { // 20% de probabilidad por intento
                let x = Math.floor(Math.random() * WORLD_WIDTH);
                let y = Math.floor(Math.random() * WORLD_HEIGHT);
                if (this.grid[y][x].type === RESOURCES.EMPTY) {
                    const r = Math.random();
                    let type = RESOURCES.FOOD; // 30% comida
                    if (r < 0.25) type = RESOURCES.WOOD; // 25% madera
                    else if (r < 0.50) type = RESOURCES.ROCK; // 25% roca
                    else if (r < 0.70) type = RESOURCES.WATER; // 20% agua
                    
                    this.setCell(x, y, type);
                }
            }
        }
    }
}
