// js/renderer.js
import { WORLD_WIDTH, WORLD_HEIGHT, CELL_SIZE, ZOOM, RESOURCES, BIOMES } from './world.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cameraX = 0;
        this.cameraY = 0;
        this.images = null;
        
        // Deshabilitar el suavizado para mantener el estilo pixel art y evitar sangrado entre tiles
        this.ctx.imageSmoothingEnabled = false;
    }

    initImages(images) {
        this.images = images;
    }

    draw(world, agent, enemies, wolf = null, isEclipse = false, timestamp = 0, timeOfDay = 600, particles = null) {
        this.cameraX = 0;
        this.cameraY = 0;
        
        this.ctx.imageSmoothingEnabled = false;
        
        let viewW = this.canvas.width / ZOOM;
        let viewH = this.canvas.height / ZOOM;

        if (agent) {
            let targetX = agent.x * CELL_SIZE + CELL_SIZE / 2;
            let targetY = agent.y * CELL_SIZE + CELL_SIZE / 2;
            this.cameraX = targetX - viewW / 2;
            this.cameraY = targetY - viewH / 2;
            
            let mapPxWidth = WORLD_WIDTH * CELL_SIZE;
            let mapPxHeight = WORLD_HEIGHT * CELL_SIZE;
            
            this.cameraX = Math.max(0, Math.min(this.cameraX, mapPxWidth - viewW));
            this.cameraY = Math.max(0, Math.min(this.cameraY, mapPxHeight - viewH));
        }

        this.ctx.save();
        this.ctx.scale(ZOOM, ZOOM);
        this.ctx.translate(-this.cameraX, -this.cameraY);

        // Lógica de Autotile
        const AUTOTILE_MAP = {"0": [0, 0], "1": [1, 0], "2": [2, 0], "3": [3, 0], "4": [4, 0], "5": [5, 0], "6": [6, 0], "7": [0, 1], "8": [1, 1], "9": [2, 1], "10": [3, 1], "11": [4, 1], "12": [5, 1], "13": [6, 1], "14": [0, 2], "15": [1, 2], "21": [2, 2], "23": [3, 2], "29": [4, 2], "31": [5, 2], "41": [6, 2], "43": [0, 3], "45": [1, 3], "47": [2, 3], "61": [3, 3], "63": [4, 3], "70": [5, 3], "71": [6, 3], "78": [0, 4], "79": [1, 4], "87": [2, 4], "95": [3, 4], "111": [4, 4], "127": [5, 4], "138": [6, 4], "139": [0, 5], "142": [1, 5], "143": [2, 5], "159": [3, 5], "171": [4, 5], "175": [5, 5], "191": [6, 5], "206": [0, 6], "207": [1, 6], "223": [2, 6], "239": [3, 6], "255": [4, 6]};
        
        let calculateBitmask = (x, y, matchFunc) => {
            let N = matchFunc(x, y-1) ? 1 : 0;
            let S = matchFunc(x, y+1) ? 2 : 0;
            let E = matchFunc(x+1, y) ? 4 : 0;
            let W = matchFunc(x-1, y) ? 8 : 0;
            let NE = matchFunc(x+1, y-1) ? 16 : 0;
            let NW = matchFunc(x-1, y-1) ? 32 : 0;
            let SE = matchFunc(x+1, y+1) ? 64 : 0;
            let SW = matchFunc(x-1, y+1) ? 128 : 0;

            let mask = N | S | E | W | NE | NW | SE | SW;
            if ((mask & 16) && !((mask & 1) && (mask & 4))) mask &= ~16;
            if ((mask & 32) && !((mask & 1) && (mask & 8))) mask &= ~32;
            if ((mask & 64) && !((mask & 2) && (mask & 4))) mask &= ~64;
            if ((mask & 128) && !((mask & 2) && (mask & 8))) mask &= ~128;
            return mask;
        };

        let drawAutotile = (img, px, py, mask) => {
            let coords = AUTOTILE_MAP[mask] || [0, 0];
            let sx = coords[0] * CELL_SIZE;
            let sy = coords[1] * CELL_SIZE;
            this.ctx.drawImage(img, sx, sy, CELL_SIZE, CELL_SIZE, px, py, CELL_SIZE, CELL_SIZE);
        };

        // 0. Dibujar Terreno Base (Fondo infinito de pasto)
        let startX = Math.floor(this.cameraX / CELL_SIZE);
        let startY = Math.floor(this.cameraY / CELL_SIZE);
        let endX = Math.ceil((this.cameraX + viewW) / CELL_SIZE);
        let endY = Math.ceil((this.cameraY + viewH) / CELL_SIZE);

        for (let y = startY - 1; y <= endY + 1; y++) {
            for (let x = startX - 1; x <= endX + 1; x++) {
                if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
                    let cell = world.getCell(x, y);
                    let px = x * CELL_SIZE;
                    let py = y * CELL_SIZE;
                    
                    // Capa 1: Siempre pasto
                    if (this.images && this.images.wakfu_pasto_solo_1) {
                        let chunkX = Math.floor(x / 2);
                        let chunkY = Math.floor(y / 2);
                        
                        // Generar pequeños sectores orgánicos para las distintas tonalidades
                        // Un multiplicador más alto (0.5) hace que los sectores sean más pequeños
                        let nx = chunkX * 0.5;
                        let ny = chunkY * 0.5;
                        let val = (Math.sin(nx) + Math.sin(ny) + Math.sin(nx * 0.5 + ny * 0.5)) / 3;
                        
                        // val va de -1 a 1. Lo pasamos a 0..3
                        let sectorIndex = Math.floor((val + 1) * 2);
                        if (sectorIndex < 0) sectorIndex = 0;
                        if (sectorIndex > 3) sectorIndex = 3;
                        
                        let pastoArray = [
                            this.images.wakfu_pasto_solo_1,
                            this.images.wakfu_pasto_solo_2,
                            this.images.wakfu_pasto_solo_3,
                            this.images.wakfu_pasto_solo_4
                        ];
                        let img = pastoArray[sectorIndex] || pastoArray[0];
                        
                        let sWidth = img.width / 2;
                        let sHeight = img.height / 2;
                        let cellOffsetX = x - chunkX * 2;
                        let cellOffsetY = y - chunkY * 2;
                        let sx = cellOffsetX * sWidth;
                        let sy = cellOffsetY * sHeight;
                        
                        this.ctx.drawImage(img, sx, sy, sWidth, sHeight, px, py, CELL_SIZE, CELL_SIZE);
                    } else if (this.images && this.images.sprout_grass) {
                        this.ctx.drawImage(this.images.sprout_grass, px, py, CELL_SIZE, CELL_SIZE);
                    } else {
                        this.ctx.fillStyle = '#86efac'; // Pasto
                        this.ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                    }

                    // Capa 2: Arena
                    if (cell && cell.biome === BIOMES.SAND) {
                        let isSand = (cx, cy) => {
                            let c = world.getCell(cx, cy);
                            return c && c.biome === BIOMES.SAND;
                        };
                        let mask = calculateBitmask(x, y, isSand);
                        if (this.images && this.images.arena_autotile) {
                            drawAutotile(this.images.arena_autotile, px, py, mask);
                        } else {
                            this.ctx.fillStyle = '#fcd34d'; // Arena
                            this.ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                        }
                    }

                    // Capa 3: Agua y Puentes
                    if (cell && (cell.type === RESOURCES.WATER || cell.type === RESOURCES.BRIDGE)) {
                        let isWater = (cx, cy) => {
                            let c = world.getCell(cx, cy);
                            return c && (c.type === RESOURCES.WATER || c.type === RESOURCES.BRIDGE);
                        };
                        let mask = calculateBitmask(x, y, isWater);
                        let waterImg = (cell.biome === BIOMES.SAND) ? this.images.agua_arena_autotile : this.images.agua_autotile;
                        
                        if (this.images && waterImg) {
                            drawAutotile(waterImg, px, py, mask);
                        } else {
                            this.ctx.fillStyle = '#0ea5e9'; // Agua
                            this.ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                        }
                        
                        if (cell.type === RESOURCES.BRIDGE) {
                            this.drawBridge(x, y);
                        }
                    }
                }
            }
        }

        // 2. Dibujar Entidades y Objetos (Y-Sorted)
        // Guardaremos todo en un array para dibujarlo ordenado por Y
        let renderQueue = [];

        for (let y = 0; y < WORLD_HEIGHT; y++) {
            for (let x = 0; x < WORLD_WIDTH; x++) {
                let cell = world.getCell(x, y);
                if (!cell) continue;
                
                let isAgentHome = false;
                if (agent && agent.home) {
                    if (x >= agent.home.x && x <= agent.home.x + 1 && y >= agent.home.y && y <= agent.home.y + 1) {
                        isAgentHome = true;
                    }
                }

                if (cell.type !== RESOURCES.EMPTY && cell.type !== RESOURCES.WATER && cell.type !== RESOURCES.BRIDGE) {
                    if (cell.type === RESOURCES.HOUSE && isAgentHome) {
                        // Lo saltamos, se dibuja la casa grande
                    } else {
                        renderQueue.push({ type: 'resource', x: x, y: y, cell: cell });
                    }
                }
            }
        }

        if (agent.home) {
            renderQueue.push({ type: 'bighouse', x: agent.home.x, y: agent.home.y, homeStage: agent.homeStage });
        }

        if (enemies) {
            enemies.forEach(e => renderQueue.push({ type: 'enemy', entity: e, y: e.y }));
        }
        if (wolf) {
            renderQueue.push({ type: 'wolf', entity: wolf, y: wolf.y });
        }
        renderQueue.push({ type: 'agent', entity: agent, y: agent.y });

        // Ordenar por Y para dar perspectiva de profundidad
        renderQueue.sort((a, b) => {
            let ay = a.y;
            let by = b.y;
            if (a.type === 'bighouse') ay += 1; // Ajuste para que la casa grande cubra correctamente
            if (b.type === 'bighouse') by += 1;
            return ay - by;
        });

        // Dibujar todo en orden
        for (let item of renderQueue) {
            if (item.type === 'resource') {
                let cell = item.cell;
                switch(cell.type) {
                    case RESOURCES.FOOD: 
                    case RESOURCES.FOOD_EMPTY: this.drawFruitTree(item.x, item.y, cell.type, cell.biome); break;
                    case RESOURCES.WOOD: 
                    case RESOURCES.WOOD_EMPTY: this.drawTree(item.x, item.y, cell.type, cell.biome); break;
                    case RESOURCES.BUSH: 
                    case RESOURCES.BUSH_EMPTY: this.drawBush(item.x, item.y, cell.type); break;
                    case RESOURCES.ROCK: 
                    case RESOURCES.ROCK_EMPTY: this.drawRock(item.x, item.y, cell.type); break;
                    case RESOURCES.HOUSE: this.drawHouse(item.x, item.y, cell.capacity); break;
                    case RESOURCES.BOOK: this.drawBook(item.x, item.y, timestamp, world); break;
                    case RESOURCES.TELESCOPE: this.drawTelescope(item.x, item.y); break;
                    case RESOURCES.WALL: this.drawWall(item.x, item.y, cell.capacity); break;
                }
                if (cell.type !== RESOURCES.HOUSE && cell.type !== RESOURCES.WALL && cell.capacity > 0) {
                    this.drawResourceDots(item.x, item.y, cell.capacity);
                }
            } else if (item.type === 'bighouse') {
                this.drawBigHouse(item.x, item.y, item.homeStage);
            } else {
                this.drawEntity(item.entity, item.type, timestamp);
            }
        }

        // Draw particles
        if (particles) {
            particles.draw(this.ctx);
        }

        this.ctx.restore();

        // Global Lighting Overlay (Day/Night Cycle)
        this.drawGlobalLighting(timeOfDay, renderQueue, agent, particles, timestamp, isEclipse);
    }

    drawShadow(cx, cy, width, height) {
        // Disabled per user request, replaced by drop-shadow filter.
    }

    drawContinuousWater(x, y, world, timestamp) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        let cell = world.getCell(x, y);
        if (!cell) return;

        let isWater = (dx, dy) => {
            let c = world.getCell(x + dx, y + dy);
            return c && (c.type === RESOURCES.WATER || c.type === RESOURCES.BRIDGE);
        };

        let isOuterTL = !isWater(0, -1) && !isWater(-1, 0);
        let isOuterTR = !isWater(0, -1) && !isWater(1, 0);
        let isOuterBR = !isWater(0, 1) && !isWater(1, 0);
        let isOuterBL = !isWater(0, 1) && !isWater(-1, 0);

        let isInnerTL = isWater(0, -1) && isWater(-1, 0) && !isWater(-1, -1);
        let isInnerTR = isWater(0, -1) && isWater(1, 0) && !isWater(1, -1);
        let isInnerBR = isWater(0, 1) && isWater(1, 0) && !isWater(1, 1);
        let isInnerBL = isWater(0, 1) && isWater(-1, 0) && !isWater(-1, 1);

        // Draw base water
        if (this.images && this.images.wakfu_water) {
            this.ctx.drawImage(this.images.wakfu_water, px, py, CELL_SIZE, CELL_SIZE);
        } else if (this.images && this.images.bg_agua) {
            this.ctx.drawImage(this.images.bg_agua, px, py, CELL_SIZE, CELL_SIZE);
        } else if (this.images && this.images.sprout_water) {
            let waterFrame = Math.floor((timestamp || 0) * 0.002) % 4;
            this.ctx.drawImage(this.images.sprout_water, waterFrame * 16, 0, 16, 16, px, py, CELL_SIZE, CELL_SIZE);
        } else {
            this.ctx.fillStyle = '#0ea5e9';
            this.ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        }

        let R = 5;
        this.ctx.fillStyle = (cell.biome === 2) ? '#fcd34d' : '#86efac'; // 2 = SAND
        
        let drawCornerMask = (cx, cy, arcCenterX, arcCenterY, startAng, endAng) => {
            this.ctx.beginPath();
            this.ctx.moveTo(cx, cy);
            this.ctx.arc(arcCenterX, arcCenterY, R, startAng, endAng, false);
            this.ctx.lineTo(cx, cy);
            this.ctx.fill();
        };

        // Outer corners (water is rounded, grass fills the corner tip)
        if (isOuterTL) drawCornerMask(px, py, px + R, py + R, Math.PI, Math.PI * 1.5);
        if (isOuterTR) drawCornerMask(px + CELL_SIZE, py, px + CELL_SIZE - R, py + R, Math.PI * 1.5, Math.PI * 2);
        if (isOuterBR) drawCornerMask(px + CELL_SIZE, py + CELL_SIZE, px + CELL_SIZE - R, py + CELL_SIZE - R, 0, Math.PI * 0.5);
        if (isOuterBL) drawCornerMask(px, py + CELL_SIZE, px + R, py + CELL_SIZE - R, Math.PI * 0.5, Math.PI);

        // Inner corners (grass is rounded, protruding into water)
        if (isInnerTL) {
            this.ctx.beginPath();
            this.ctx.moveTo(px, py);
            this.ctx.arc(px, py, R, 0, Math.PI * 0.5, false);
            this.ctx.fill();
        }
        if (isInnerTR) {
            this.ctx.beginPath();
            this.ctx.moveTo(px + CELL_SIZE, py);
            this.ctx.arc(px + CELL_SIZE, py, R, Math.PI * 0.5, Math.PI, false);
            this.ctx.fill();
        }
        if (isInnerBR) {
            this.ctx.beginPath();
            this.ctx.moveTo(px + CELL_SIZE, py + CELL_SIZE);
            this.ctx.arc(px + CELL_SIZE, py + CELL_SIZE, R, Math.PI, Math.PI * 1.5, false);
            this.ctx.fill();
        }
        if (isInnerBL) {
            this.ctx.beginPath();
            this.ctx.moveTo(px, py + CELL_SIZE);
            this.ctx.arc(px, py + CELL_SIZE, R, Math.PI * 1.5, Math.PI * 2, false);
            this.ctx.fill();
        }
    }

    drawFruitTree(x, y, type, biome) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        let cx = px + CELL_SIZE / 2;
        this.drawShadow(cx, py + CELL_SIZE - 2, 10, 4);

        let img = null;
        if (biome === BIOMES.SAND) {
            img = (type === RESOURCES.FOOD) ? this.images.arbol_desierto_1 : this.images.arbol_desierto_2;
        } else {
            img = (type === RESOURCES.FOOD) ? this.images.frutal_1 : this.images.frutal_2;
        }

        if (img) {
            this.ctx.drawImage(img, px - 16, py - 32, 48, 48);
        } else {
            this.ctx.fillStyle = (type === RESOURCES.FOOD) ? '#ef4444' : '#b45309';
            this.ctx.beginPath(); this.ctx.arc(cx, py, 16, 0, Math.PI*2); this.ctx.fill();
        }
    }

    drawTree(x, y, type, biome) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        let cx = px + CELL_SIZE / 2;
        this.drawShadow(cx, py + CELL_SIZE - 2, 10, 4);

        let img = null;
        if (biome === BIOMES.SAND) {
            img = (type === RESOURCES.WOOD) ? this.images.arbol_desierto_1 : this.images.arbol_desierto_2;
        } else {
            img = (type === RESOURCES.WOOD) ? this.images.arbol_1 : this.images.arbol_2;
        }

        if (img) {
            this.ctx.drawImage(img, px - 16, py - 32, 48, 48);
        } else {
            this.ctx.fillStyle = '#14532d';
            this.ctx.beginPath(); this.ctx.moveTo(cx, py - 16); this.ctx.lineTo(cx + 16, py + 16); this.ctx.lineTo(cx - 16, py + 16); this.ctx.fill();
        }
    }

    drawBush(x, y, type) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        let cx = px + CELL_SIZE / 2;
        this.drawShadow(cx, py + CELL_SIZE - 2, 8, 3);

        let img = (type === RESOURCES.BUSH) ? this.images.arbusto_1 : this.images.arbusto_2;
        if (img) {
            this.ctx.drawImage(img, px - 8, py - 16, 32, 32);
        } else {
            this.ctx.fillStyle = (type === RESOURCES.BUSH) ? '#22c55e' : '#b45309';
            this.ctx.beginPath(); this.ctx.arc(cx, py + 8, 6, 0, Math.PI*2); this.ctx.fill();
        }
    }

    drawRock(x, y, type) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        let cx = px + CELL_SIZE / 2;
        let cy = py + CELL_SIZE / 2;

        if (type === RESOURCES.ROCK_EMPTY) {
            if (this.images && this.images.rocas_2) {
                this.ctx.drawImage(this.images.rocas_2, px - 8, py - 16, 32, 32);
            } else {
                this.ctx.fillStyle = '#64748b';
                this.ctx.beginPath(); this.ctx.arc(cx, cy+4, 4, 0, Math.PI*2); this.ctx.fill();
            }
        } else {
            if (this.images && this.images.rocas_1) {
                this.ctx.drawImage(this.images.rocas_1, px - 8, py - 16, 32, 32);
            } else if (this.images && this.images.sprout_objects) {
                this.ctx.drawImage(this.images.sprout_objects, 112, 16, 16, 16, px, py, 16, 16);
            } else {
                this.ctx.fillStyle = '#475569';
                this.ctx.beginPath(); this.ctx.arc(cx, cy+4, 6, 0, Math.PI*2); this.ctx.fill();
            }
        }
    }

    drawBridge(x, y) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        if (this.images && this.images.sprout_bridge) {
            // Wood Bridge.png: 80x48 → Un puente horizontal de 5 tiles de 16x16
            // Usamos el tile del medio (col 1) para rellenar la celda
            this.ctx.drawImage(this.images.sprout_bridge, 16, 16, 16, 16, px, py + 2, CELL_SIZE, CELL_SIZE - 4);
        } else {
            this.ctx.fillStyle = '#92400e';
            this.ctx.fillRect(px, py + 4, CELL_SIZE, CELL_SIZE - 8);
        }
    }

    drawHouse(x, y, hp) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        let cx = px + CELL_SIZE/2;
        
        this.drawShadow(cx, py + CELL_SIZE - 2, 14, 6);

        // Base de la casa en construcción
        this.ctx.fillStyle = '#b45309';
        this.ctx.fillRect(px + 2, py + 4, CELL_SIZE - 4, CELL_SIZE - 4);
        
        // Tablones
        this.ctx.fillStyle = '#92400e'; 
        for(let i=0; i<3; i++) {
            this.ctx.fillRect(px + 2, py + 6 + i*4, CELL_SIZE - 4, 1);
        }

        // Techo plano / en construcción
        this.ctx.fillStyle = '#991b1b';
        this.ctx.fillRect(px, py, CELL_SIZE, 4);
        
        // Puerta chica
        this.ctx.fillStyle = '#451a03';
        this.ctx.fillRect(cx - 4, py + CELL_SIZE - 8, 8, 8);

        if (hp < 10) {
            let barWidth = 20;
            let segWidth = barWidth / 10;
            this.ctx.fillStyle = '#475569'; this.ctx.fillRect(cx - 10, py - 6, 20, 4);
            this.ctx.fillStyle = '#22c55e'; this.ctx.fillRect(cx - 10, py - 6, segWidth * hp, 4);
        }
    }

    drawBigHouse(x, y, homeStage) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        let cx = px + CELL_SIZE;
        
        this.drawShadow(cx, py + CELL_SIZE * 2 - 4, 32, 10);

        if (homeStage === 1 && this.images && this.images.casa_1) {
            this.ctx.drawImage(this.images.casa_1, px - 24, py - 32, CELL_SIZE * 5, CELL_SIZE * 4);
            return;
        } else if (homeStage === 2 && this.images && this.images.casa_2) {
            this.ctx.drawImage(this.images.casa_2, px - 24, py - 32, CELL_SIZE * 5, CELL_SIZE * 4);
            return;
        } else if (homeStage === 3 && this.images && this.images.casa_3) {
            this.ctx.drawImage(this.images.casa_3, px - 24, py - 32, CELL_SIZE * 5, CELL_SIZE * 4);
            return;
        }

        // ---- Si tenemos el tileset del pack, lo usamos ----
        // Wooden House.png: 112x80 → tiles de 16x16
        // Wooden_House_Roof_Tilset.png: 112x80 → tiles de 16x16
        if (this.images && this.images.sprout_house && this.images.sprout_roof) {
            const W = CELL_SIZE; // 16px
            // Wooden House.png (112x80): La casa completa ocupa las primeras 3 columnas
            // col0=left wall, col1=door, col2=right, rows in 16px increments
            // Dibujamos paredes (2x2 tiles)
            this.ctx.drawImage(this.images.sprout_house, 0,  16, 16, 16, px,     py + W,   W, W); // Pared izq arriba
            this.ctx.drawImage(this.images.sprout_house, 16, 16, 16, 16, px + W, py + W,   W, W); // Pared der arriba
            this.ctx.drawImage(this.images.sprout_house, 0,  32, 16, 16, px,     py + W*2, W, W); // Pared izq abajo
            this.ctx.drawImage(this.images.sprout_house, 16, 32, 16, 16, px + W, py + W*2, W, W); // Pared der abajo
            // Techo (Wooden_House_Roof_Tilset.png: 112x80, usamos top 2x2 tiles)
            this.ctx.drawImage(this.images.sprout_roof, 32, 0,  16, 16, px,     py,       W, W); // Techo izq
            this.ctx.drawImage(this.images.sprout_roof, 48, 0,  16, 16, px + W, py,       W, W); // Techo der
            this.ctx.drawImage(this.images.sprout_roof, 32, 16, 16, 16, px,     py + W/2, W, W); // Techo borde izq
            this.ctx.drawImage(this.images.sprout_roof, 48, 16, 16, 16, px + W, py + W/2, W, W); // Techo borde der
            return;
        }

        // ---- Fallback procedural ----
        py -= 8;

        // Base de piedra (Cimientos)
        this.ctx.fillStyle = '#94a3b8'; 
        this.ctx.fillRect(px - 4, py + 20, CELL_SIZE * 2 + 8, 16);
        this.ctx.fillStyle = '#64748b'; 
        for(let i=0; i<4; i++) {
            this.ctx.fillRect(px - 2 + i*9, py + 22, 7, 5);
            this.ctx.fillRect(px + 2 + i*9, py + 29, 7, 5);
        }

        // Paredes de madera
        this.ctx.fillStyle = '#b45309'; 
        this.ctx.fillRect(px - 2, py - 4, CELL_SIZE * 2 + 4, 24);
        this.ctx.fillStyle = '#92400e'; 
        for(let i=0; i<3; i++) {
            this.ctx.fillRect(px - 2, py + i*8, CELL_SIZE * 2 + 4, 1);
        }

        // Puerta (Centro)
        this.ctx.fillStyle = '#451a03'; 
        this.ctx.fillRect(px + 10, py + 8, 12, 16);
        this.ctx.fillStyle = '#f59e0b'; 
        this.ctx.fillRect(px + 19, py + 16, 2, 2); // Pomo dorado

        // Ventanas
        let drawWindow = (wx, wy) => {
            this.ctx.fillStyle = '#451a03'; // Marco
            this.ctx.fillRect(wx - 1, wy - 1, 10, 12);
            this.ctx.fillStyle = '#0ea5e9'; // Vidrio
            this.ctx.fillRect(wx, wy, 8, 10);
            this.ctx.fillStyle = '#38bdf8'; // Reflejo
            this.ctx.fillRect(wx + 4, wy + 2, 2, 6);
            this.ctx.fillStyle = '#451a03'; // Divisiones de vidrio
            this.ctx.fillRect(wx, wy + 4, 8, 1);
            this.ctx.fillRect(wx + 3, wy, 1, 10);
        };
        drawWindow(px - 1, py + 2); // Ventana izquierda
        drawWindow(px + 23, py + 2); // Ventana derecha

        // Techo principal rojo
        this.ctx.fillStyle = '#991b1b'; 
        this.ctx.beginPath();
        this.ctx.moveTo(px - 8, py - 4);
        this.ctx.lineTo(cx, py - 20); // Pico del techo
        this.ctx.lineTo(px + CELL_SIZE * 2 + 8, py - 4);
        this.ctx.closePath();
        this.ctx.fill();

        // Borde del techo (Madera gruesa)
        this.ctx.fillStyle = '#78350f';
        this.ctx.beginPath();
        this.ctx.moveTo(px - 10, py - 2);
        this.ctx.lineTo(cx, py - 22);
        this.ctx.lineTo(cx, py - 18);
        this.ctx.lineTo(px - 4, py + 2);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.moveTo(px + CELL_SIZE * 2 + 10, py - 2);
        this.ctx.lineTo(cx, py - 22);
        this.ctx.lineTo(cx, py - 18);
        this.ctx.lineTo(px + CELL_SIZE * 2 + 4, py + 2);
        this.ctx.closePath();
        this.ctx.fill();

        // Chimenea
        this.ctx.fillStyle = '#475569';
        this.ctx.fillRect(px + 20, py - 26, 6, 12);
        this.ctx.fillStyle = '#334155';
        this.ctx.fillRect(px + 19, py - 28, 8, 3);
    }

    drawBook(x, y, timestamp, world) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        let cx = px + CELL_SIZE / 2;
        let cy = py + CELL_SIZE / 2;
        let t = timestamp ? timestamp * 0.003 : 0;
        let hover = Math.sin(t) * 4; 

        let cell = world.getCell(x, y);
        let branchId = cell ? cell.capacity : 0;
        
        let img = null;
        if (branchId === 0 && this.images && this.images.libro_astronomia) img = this.images.libro_astronomia;
        if (branchId === 1 && this.images && this.images.libro_fauna) img = this.images.libro_fauna;
        if (branchId === 2 && this.images && this.images.libro_herreria) img = this.images.libro_herreria;

        this.ctx.save();
        this.ctx.translate(cx, cy + hover);

        // Aura
        let aura = Math.abs(Math.sin(t*0.5)) * 5;
        this.ctx.shadowColor = '#fef08a';
        this.ctx.shadowBlur = 10 + aura;

        if (img) {
            this.ctx.drawImage(img, -CELL_SIZE/2, -CELL_SIZE/2, CELL_SIZE, CELL_SIZE);
        } else {
            // Tapas
            this.ctx.fillStyle = '#431407'; 
            this.ctx.beginPath(); this.ctx.moveTo(0, 0); this.ctx.lineTo(-12, -6); this.ctx.lineTo(-12, 8); this.ctx.lineTo(0, 14); this.ctx.closePath(); this.ctx.fill();
            this.ctx.beginPath(); this.ctx.moveTo(0, 0); this.ctx.lineTo(12, -6); this.ctx.lineTo(12, 8); this.ctx.lineTo(0, 14); this.ctx.closePath(); this.ctx.fill();

            // Hojas
            this.ctx.fillStyle = '#fef08a'; 
            this.ctx.beginPath(); this.ctx.moveTo(0, 0); this.ctx.lineTo(-10, -5); this.ctx.lineTo(-10, 7); this.ctx.lineTo(0, 12); this.ctx.closePath(); this.ctx.fill();
            this.ctx.beginPath(); this.ctx.moveTo(0, 0); this.ctx.lineTo(10, -5); this.ctx.lineTo(10, 7); this.ctx.lineTo(0, 12); this.ctx.closePath(); this.ctx.fill();
            
            this.ctx.fillStyle = '#eab308';
            this.ctx.fillRect(-2, 0, 4, 14);
        }
        
        this.ctx.restore();
    }

    drawTelescope(x, y) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        let cx = px + CELL_SIZE / 2;
        let cy = py + CELL_SIZE / 2;
        
        if (this.images && this.images.telescopio) {
            this.ctx.drawImage(this.images.telescopio, px - 8, py - 16, 32, 32);
        } else {
            this.ctx.save();
            this.ctx.translate(cx, cy + 2);

            this.ctx.strokeStyle = '#451a03';
            this.ctx.lineWidth = 3 / ZOOM;
            this.ctx.beginPath(); this.ctx.moveTo(0, 2); this.ctx.lineTo(-6, 12); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(0, 2); this.ctx.lineTo(6, 12); this.ctx.stroke();

            this.ctx.fillStyle = '#f59e0b';
            this.ctx.rotate(-Math.PI / 5);
            this.ctx.fillRect(-10, -4, 20, 8);
            this.ctx.fillStyle = '#0ea5e9';
            this.ctx.fillRect(8, -3, 4, 6);

            this.ctx.restore();
        }
    }

    drawWall(x, y, hp) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;

        if (this.images && this.images.muralla) {
            this.ctx.drawImage(this.images.muralla, px - 8, py - 16, 32, 32);
        } else {
            let cx = px + CELL_SIZE/2;
            this.ctx.fillStyle = '#475569';
            this.ctx.fillRect(px, py + 4, CELL_SIZE, CELL_SIZE - 8);
            
            this.ctx.fillStyle = '#334155';
            this.ctx.fillRect(px, py + CELL_SIZE/2, CELL_SIZE, CELL_SIZE/2 - 4);
            
            this.ctx.strokeStyle = '#1e293b';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(px, py + CELL_SIZE/2); this.ctx.lineTo(px+CELL_SIZE, py+CELL_SIZE/2);
            this.ctx.moveTo(px+CELL_SIZE/2, py+4); this.ctx.lineTo(px+CELL_SIZE/2, py+CELL_SIZE/2);
            this.ctx.moveTo(px+CELL_SIZE/4, py+CELL_SIZE/2); this.ctx.lineTo(px+CELL_SIZE/4, py+CELL_SIZE-4);
            this.ctx.moveTo(px+CELL_SIZE*0.75, py+CELL_SIZE/2); this.ctx.lineTo(px+CELL_SIZE*0.75, py+CELL_SIZE-4);
            this.ctx.stroke();
        }
    }

    drawResourceDots(x, y, capacity) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        let cx = px + CELL_SIZE / 2;
        let startX = cx - (capacity * 6) / 2 + 3;
        for (let i = 0; i < capacity; i++) {
            this.ctx.fillStyle = '#f8fafc';
            this.ctx.beginPath();
            this.ctx.arc(startX + i * 6, py + CELL_SIZE - 2, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawEntity(entity, type, timestamp = 0) {
        if (type !== 'agent' && entity.hp <= 0) return;

        let px = entity.x * CELL_SIZE;
        let py = entity.y * CELL_SIZE;
        let cx = px + CELL_SIZE / 2;
        let cy = py + CELL_SIZE / 2;
        
        let t = timestamp || 0;

        if (type === 'agent') {
            this.drawShadow(cx, cy + 6, 6, 2);

            // dir: 0=abajo, 1=arriba, 2=izquierda, 3=derecha
            let dir = 0;
            if (entity.dx > 0) dir = 3;
            else if (entity.dx < 0) dir = 2;
            else if (entity.dy < 0) dir = 1;
            else if (entity.dy > 0) dir = 0;

            let isMoving = (entity.dx !== 0 || entity.dy !== 0);

            if (this.images && this.images.gruni_walk) {
                let img = null, fW, fH, fCount, fRow, flip = false;
                let isActioning = entity.isActioning;
                let animSpeed = 0.008;
                let isSpritesheet = true;

                if (entity.isAttacking && this.images.gruni_attack) {
                    img = this.images.gruni_attack;
                    fW = 219; fH = 284; fCount = 5; animSpeed = 0.012;
                    if (dir === 1) fRow = 1; // Arriba
                    else if (dir === 2) { fRow = 0; } // Izquierda = Frontal
                    else if (dir === 3) { fRow = 0; flip = true; } // Derecha = Frontal reflejado
                    else fRow = 0; // Abajo
                } else if (isActioning) {
                    animSpeed = 0.008;
                    if (entity.state === 'SEEK_ROCK' && this.images.gruni_mine) {
                        img = this.images.gruni_mine;
                        fW = 165; fH = 305; fCount = 5;
                        if (dir === 2) { fRow = 1; } // Izquierda
                        else if (dir === 3) { fRow = 1; flip = true; } // Derecha = Izquierda reflejada
                        else { fRow = 0; } // Abajo/Arriba = Frontal
                    } else if (this.images.gruni_axe) {
                        // Talar / Construir
                        img = this.images.gruni_axe;
                        fW = 157; fH = 280; fCount = 6;
                        if (dir === 1) fRow = 1;
                        else if (dir === 2) fRow = 3;
                        else if (dir === 3) fRow = 2;
                        else fRow = 0;
                    }
                }
                
                let frame = 0;
                
                // Fallback a caminar/correr si no se seteó imagen
                if (!img) {
                    animSpeed = 0.008;
                    fW = 78; fH = 136; fCount = 5;
                    
                    if (dir === 1) {
                        fCount = 4; // La animación de espalda tiene 4 fotogramas
                    }
                    
                    frame = (isMoving || isActioning || entity.isAttacking) ? (Math.floor(t * animSpeed) % fCount) : 0;
                    
                    if (dir === 2 && this.images[`gruni_walk_side_${frame + 1}`]) { 
                        img = this.images[`gruni_walk_side_${frame + 1}`];
                        isSpritesheet = false;
                        flip = true;
                    } else if (dir === 3 && this.images[`gruni_walk_side_${frame + 1}`]) {
                        img = this.images[`gruni_walk_side_${frame + 1}`];
                        isSpritesheet = false;
                    } else if (dir === 1 && this.images[`gruni_walk_back_${frame + 1}`]) { 
                        img = this.images[`gruni_walk_back_${frame + 1}`];
                        isSpritesheet = false;
                    } else if (this.images[`gruni_walk_front_${frame + 1}`]) {
                        img = this.images[`gruni_walk_front_${frame + 1}`];
                        isSpritesheet = false;
                    }

                    // Fallback de seguridad al spritesheet viejo
                    if (!img) {
                        img = this.images.gruni_walk;
                        isSpritesheet = true;
                        if (img) {
                            fW = img.width / 5;
                            fH = img.height / 4;
                        }
                        if (dir === 1) fRow = 1;
                        else if (dir === 2) fRow = 3;
                        else if (dir === 3) fRow = 2;
                        else fRow = 0;
                    }
                } else {
                    frame = (isMoving || isActioning || entity.isAttacking) ? (Math.floor(t * animSpeed) % fCount) : 0;
                }

                let scale = 0.32; 
                let drawW = fW * scale;
                let drawH = fH * scale;

                let drawX = cx - drawW / 2;
                let drawY = py + CELL_SIZE - drawH + 4; 

                this.ctx.save();
                if (flip) {
                    this.ctx.translate(cx, 0);
                    this.ctx.scale(-1, 1);
                    this.ctx.translate(-cx, 0);
                }
                
                if (isSpritesheet) {
                    this.ctx.drawImage(img, frame * fW, fRow * fH, fW, fH, drawX, drawY, drawW, drawH);
                } else {
                    this.ctx.drawImage(img, 0, 0, fW, fH, drawX, drawY, drawW, drawH);
                }
                this.ctx.restore();

            } else {
                this.ctx.fillStyle = '#ef4444';
                this.ctx.fillRect(px + 4, py + 4, 8, 8);
            }

        } else if (type === 'enemy') {
            this.drawShadow(cx, cy + 6, 8, 3);
            
            let dir = 0;
            if (entity.lastDx > 0) dir = 3;
            else if (entity.lastDx < 0) dir = 2;
            else if (entity.lastDy < 0) dir = 1;
            else if (entity.lastDy > 0) dir = 0;
            
            let animSpeed = 3; // ticks por frame (a 500ms/tick = ~1.5 seg por ciclo completo)
            let fCount = 4;
            let frame = Math.floor(entity.animationTimer / animSpeed) % fCount;
            
            let img = null;
            let flip = false;
            
            if (dir === 2 && this.images[`malo_walk_side_${frame + 1}`]) { 
                img = this.images[`malo_walk_side_${frame + 1}`];
                flip = true;
            } else if (dir === 3 && this.images[`malo_walk_side_${frame + 1}`]) {
                img = this.images[`malo_walk_side_${frame + 1}`];
            } else if (this.images[`malo_walk_front_${frame + 1}`]) {
                img = this.images[`malo_walk_front_${frame + 1}`];
            }

            if (img) {
                let fW = img.width || 78;
                let fH = img.height || 136;
                let scale = 0.32; // misma escala que Gruni
                let drawW = fW * scale;
                let drawH = fH * scale;

                let drawX = cx - drawW / 2;
                let drawY = py + CELL_SIZE - drawH + 4; 

                this.ctx.save();
                if (flip) {
                    this.ctx.translate(cx, 0);
                    this.ctx.scale(-1, 1);
                    this.ctx.translate(-cx, 0);
                }
                
                this.ctx.drawImage(img, 0, 0, fW, fH, drawX, drawY, drawW, drawH);
                this.ctx.restore();
            } else if (this.images && this.images.sprout_cow) {
                let cowDir = 0;
                if (entity.lastDx > 0) cowDir = 2;
                else if (entity.lastDx < 0) cowDir = 1;
                let cowFrame = Math.floor(t * 0.004) % 2;
                this.ctx.drawImage(this.images.sprout_cow, cowFrame * 48, cowDir * 16, 48, 16, px - 8, py - 8, 32, 20);
            } else {
                this.ctx.fillStyle = '#d8b4fe';
                this.ctx.fillRect(px + 4, py + 4, 8, 8);
            }
        } else if (type === 'wolf') {
            this.drawShadow(cx, cy + 6, 6, 2);
            if (this.images && this.images.sprout_chicken) {
                // Free Chicken Sprites.png: 64x32 → 4 frames de 16x16 en 2 filas
                let chickFrame = Math.floor(t * 0.006) % 2;
                this.ctx.drawImage(this.images.sprout_chicken, chickFrame * 16, 0, 16, 16, px, py, 20, 20);
            } else {
                this.ctx.fillStyle = '#94a3b8';
                this.ctx.fillRect(px + 4, py + 4, 8, 8);
            }
        }
    }

    drawHpBar(hp, max, color) {
        let barWidth = 16;
        let segWidth = barWidth / max;
        this.ctx.fillStyle = '#475569';
        this.ctx.fillRect(-barWidth/2, -18, barWidth, 3);
        this.ctx.fillStyle = color;
        this.ctx.fillRect(-barWidth/2, -18, segWidth * hp, 3);
        // Borde oscuro
        this.ctx.strokeStyle = '#0f172a';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(-barWidth/2, -18, barWidth, 3);
    }

    drawGlobalLighting(timeOfDay, renderQueue, agent, particles, timestamp, isEclipse) {
        this.ctx.save();
        
        let overlayColor = 'rgba(0,0,0,0)';
        let opacity = 0;
        
        if (isEclipse) {
            overlayColor = 'rgba(2, 6, 23, 0.85)'; // Oscuro profundo
            opacity = 0.85;
        } else {
            // Ciclo de día
            // 600: Amanecer (naranja) -> 1200: Mediodía (claro) -> 1800: Atardecer (rosado) -> 2400/0: Noche (azul oscuro)
            if (timeOfDay > 1800 || timeOfDay < 500) {
                // Noche - un tono azul más agradable y místico, menos grisáceo opresivo
                opacity = 0.65;
                overlayColor = `rgba(12, 18, 55, ${opacity})`; 
            } else if (timeOfDay >= 500 && timeOfDay <= 700) {
                // Amanecer
                opacity = 0.35;
                overlayColor = `rgba(234, 100, 20, ${opacity})`;
            } else if (timeOfDay >= 1700 && timeOfDay <= 1800) {
                // Atardecer
                opacity = 0.35;
                overlayColor = `rgba(190, 40, 80, ${opacity})`;
            }
        }

        if (opacity > 0) {
            // Capa oscura principal
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.fillStyle = overlayColor;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Luces (Glow) superpuestas en lugar de perforar el canvas
            this.ctx.globalCompositeOperation = 'lighter';
            
            let drawLight = (worldX, worldY, radius, intensity = 0.4, color = '255, 255, 200') => {
                let px = (worldX * CELL_SIZE + CELL_SIZE/2) * ZOOM - this.cameraX * ZOOM;
                let py = (worldY * CELL_SIZE + CELL_SIZE/2) * ZOOM - this.cameraY * ZOOM;
                let grad = this.ctx.createRadialGradient(px, py, 2, px, py, radius);
                grad.addColorStop(0, `rgba(${color}, ${intensity})`);
                grad.addColorStop(1, `rgba(${color}, 0)`);
                this.ctx.fillStyle = grad;
                this.ctx.beginPath(); this.ctx.arc(px, py, radius, 0, Math.PI*2); this.ctx.fill();
            };

            // Luz del Agente
            if (agent) {
                let pulse = Math.sin((timestamp||0) * 0.002) * 5;
                drawLight(agent.x, agent.y, 90 + pulse, 0.35, '255, 240, 200');
            }

            // Luz de casas grandes (iluminación de las ventanas)
            for (let item of renderQueue) {
                if (item.type === 'bighouse') {
                    // Casa ocupa 2x2. Centro es x+1, y+1
                    drawLight(item.x + 0.5, item.y + 0.5, 140, 0.4, '250, 180, 80');
                }
            }

            // Luz de luciérnagas
            if (particles) {
                for (let p of particles.particles) {
                    if (p.type === 'FIREFLY') {
                        drawLight(p.x / CELL_SIZE - 0.5, p.y / CELL_SIZE - 0.5, 20, 0.6, '200, 255, 100');
                    }
                }
            }
        }
        
        this.ctx.restore();
    }
}
