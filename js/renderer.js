// js/renderer.js
import { WORLD_WIDTH, WORLD_HEIGHT, CELL_SIZE, ZOOM, RESOURCES } from './world.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cameraX = 0;
        this.cameraY = 0;
        this.images = null;
    }

    initImages(images) {
        this.images = images;
    }

    draw(world, agent, enemies, wolf = null, isEclipse = false, timestamp = 0, timeOfDay = 600, particles = null) {
        this.cameraX = 0;
        this.cameraY = 0;
        
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

        // 0. Dibujar Terreno Base (Celda por celda)
        let startX = Math.max(0, Math.floor(this.cameraX / CELL_SIZE));
        let startY = Math.max(0, Math.floor(this.cameraY / CELL_SIZE));
        let endX = Math.min(WORLD_WIDTH, Math.ceil((this.cameraX + viewW) / CELL_SIZE));
        let endY = Math.min(WORLD_HEIGHT, Math.ceil((this.cameraY + viewH) / CELL_SIZE));

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                let cell = world.getCell(x, y);
                if (!cell) continue;
                let px = x * CELL_SIZE;
                let py = y * CELL_SIZE;
                
                let sx = 16, sy = 16; // Tile de pasto verde sólido
                // Se removieron las variaciones temporalmente para garantizar que no haya tiles rotos

                if (this.images && this.images.sprout_grass) {
                    this.ctx.drawImage(this.images.sprout_grass, sx, sy, 16, 16, px, py, CELL_SIZE, CELL_SIZE);
                } else {
                    this.ctx.fillStyle = '#86efac';
                    this.ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                }
            }
        }
        
        // 1. Dibujar Terreno Base (Agua Continua y Puentes)
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            for (let x = 0; x < WORLD_WIDTH; x++) {
                let cell = world.getCell(x, y);
                if (cell && (cell.type === RESOURCES.WATER || cell.type === RESOURCES.BRIDGE)) {
                    this.drawContinuousWater(x, y, world, timestamp);
                    if (cell.type === RESOURCES.BRIDGE) {
                        this.drawBridge(x, y);
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
            renderQueue.push({ type: 'bighouse', x: agent.home.x, y: agent.home.y });
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
                    case RESOURCES.FOOD: this.drawApple(item.x, item.y, timestamp); break;
                    case RESOURCES.WOOD: this.drawTree(item.x, item.y); break;
                    case RESOURCES.ROCK: this.drawRock(item.x, item.y); break;
                    case RESOURCES.HOUSE: this.drawHouse(item.x, item.y, cell.capacity); break;
                    case RESOURCES.BOOK: this.drawBook(item.x, item.y, timestamp); break;
                    case RESOURCES.TELESCOPE: this.drawTelescope(item.x, item.y); break;
                    case RESOURCES.WALL: this.drawWall(item.x, item.y, cell.capacity); break;
                }
                if (cell.type !== RESOURCES.HOUSE && cell.type !== RESOURCES.WALL && cell.capacity > 0) {
                    this.drawResourceDots(item.x, item.y, cell.capacity);
                }
            } else if (item.type === 'bighouse') {
                this.drawBigHouse(item.x, item.y);
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
        // Obtenemos la hora del sistema de alguna manera o la simulamos local
        // Por ahora, sombra direccional fija pero suave
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        this.ctx.beginPath();
        // Sombra levemente ladeada para dar volumen
        this.ctx.ellipse(cx + 4, cy + 2, width, height, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawContinuousWater(x, y, world, timestamp) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        let t = Math.floor((timestamp || 0) * 0.002) % 4;
        
        if (this.images && this.images.sprout_water) {
            // sprout_water es 64x16 (4 frames de 16x16 animado horizontalmente)
            let waterFrame = Math.floor((timestamp || 0) * 0.002) % 4;
            this.ctx.drawImage(this.images.sprout_water, waterFrame * 16, 0, 16, 16, px, py, CELL_SIZE, CELL_SIZE);
        } else {
            this.ctx.fillStyle = '#0ea5e9';
            this.ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        }

        // Borde arena basico (procedural por ahora si no autotileamos full)
        this.ctx.fillStyle = '#fcd34d'; 
        let isWater = (dx, dy) => {
            let c = world.getCell(x + dx, y + dy);
            return c && (c.type === RESOURCES.WATER || c.type === RESOURCES.BRIDGE);
        };
        let b = 2; // Borde de arena
        let fw = Math.max(0, Math.sin(timestamp * 0.002 + x) * 1.5);
        if (!isWater(0, -1)) { this.ctx.fillRect(px, py, CELL_SIZE, b); this.ctx.fillStyle='white'; this.ctx.fillRect(px, py+b, CELL_SIZE, 1+fw); this.ctx.fillStyle='#fcd34d'; }
        if (!isWater(0, 1)) { this.ctx.fillRect(px, py + CELL_SIZE - b, CELL_SIZE, b); this.ctx.fillStyle='white'; this.ctx.fillRect(px, py+CELL_SIZE-b-1-fw, CELL_SIZE, 1+fw); this.ctx.fillStyle='#fcd34d'; }
        if (!isWater(-1, 0)) { this.ctx.fillRect(px, py, b, CELL_SIZE); this.ctx.fillStyle='white'; this.ctx.fillRect(px+b, py, 1+fw, CELL_SIZE); this.ctx.fillStyle='#fcd34d'; }
        if (!isWater(1, 0)) { this.ctx.fillRect(px + CELL_SIZE - b, py, b, CELL_SIZE); this.ctx.fillStyle='white'; this.ctx.fillRect(px+CELL_SIZE-b-1-fw, py, 1+fw, CELL_SIZE); }
    }

    drawApple(x, y, timestamp) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        let cx = px + CELL_SIZE / 2;
        let cy = py + CELL_SIZE / 2;

        let bounce = Math.abs(Math.sin((timestamp || 0) * 0.005 + x)) * 4;
        this.drawShadow(cx, cy + 4, 6, 2);

        if (this.images && this.images.sprout_objects) {
            // El item de manzana o semilla suele estar en la fila 3 (ej: sx=32, sy=32)
            this.ctx.drawImage(this.images.sprout_objects, 32, 16, 16, 16, px, py - 4 - bounce, 16, 16);
        } else {
            this.ctx.fillStyle = '#ef4444';
            this.ctx.beginPath(); this.ctx.arc(cx, cy - 4 - bounce, 5, 0, Math.PI*2); this.ctx.fill();
            this.ctx.fillStyle = '#22c55e';
            this.ctx.beginPath(); this.ctx.ellipse(cx + 3, cy - 8 - bounce, 3, 1.5, Math.PI/4, 0, Math.PI*2); this.ctx.fill();
        }
    }

    drawTree(x, y) {
        let cx = x * CELL_SIZE + CELL_SIZE / 2;
        let cy = y * CELL_SIZE + CELL_SIZE / 2;
        this.drawShadow(cx, cy + 4, 10, 4);

        if (this.images && this.images.sprout_objects) {
            let px = x * CELL_SIZE;
            let py = y * CELL_SIZE;
            // Sprout Lands pine tree (Aprox: 32x32 en 0,0)
            this.ctx.drawImage(this.images.sprout_objects, 0, 0, 32, 32, px - 8, py - 16, 32, 32);
        } else {
            // Procedural fallback
            this.ctx.fillStyle = '#5c2b07'; this.ctx.fillRect(cx - 2, cy, 4, 10);
            this.ctx.fillStyle = '#14532d'; this.ctx.beginPath(); this.ctx.moveTo(cx, cy - 16); this.ctx.lineTo(cx + 8, cy); this.ctx.lineTo(cx - 8, cy); this.ctx.fill();
        }
    }

    drawRock(x, y) {
        let cx = x * CELL_SIZE + CELL_SIZE / 2;
        let cy = y * CELL_SIZE + CELL_SIZE / 2;
        this.drawShadow(cx, cy + 6, 8, 3);

        if (this.images && this.images.sprout_objects) {
            let px = x * CELL_SIZE;
            let py = y * CELL_SIZE;
            // Small rocks en Sprout Lands suelen estar en 16x16
            this.ctx.drawImage(this.images.sprout_objects, 112, 16, 16, 16, px, py, 16, 16);
        } else {
            this.ctx.fillStyle = '#475569';
            this.ctx.beginPath(); this.ctx.arc(cx, cy+4, 6, 0, Math.PI*2); this.ctx.fill();
        }
    }

    drawBridge(x, y) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        this.ctx.fillStyle = '#78350f'; // Base oscura
        this.ctx.fillRect(px, py + 4, CELL_SIZE, CELL_SIZE - 8);
        
        this.ctx.fillStyle = '#92400e'; // Tablones
        for(let i=0; i<4; i++) {
            this.ctx.fillRect(px + (i*CELL_SIZE/4) + 1, py + 4, (CELL_SIZE/4)-2, CELL_SIZE - 8);
        }
        // Clavos
        this.ctx.fillStyle = '#475569';
        for(let i=0; i<4; i++) {
            this.ctx.fillRect(px + (i*CELL_SIZE/4) + 2, py + 6, 2, 2);
            this.ctx.fillRect(px + (i*CELL_SIZE/4) + 2, py + CELL_SIZE - 10, 2, 2);
        }
    }

    drawHouse(x, y, hp) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        let cx = px + CELL_SIZE/2;
        
        this.drawShadow(cx, py + CELL_SIZE - 2, 14, 6);

        // Base de la casa ampliada levemente
        this.ctx.fillStyle = '#b45309';
        this.ctx.fillRect(px + 2, py + 10, CELL_SIZE - 4, CELL_SIZE - 10);
        
        // Techo superpuesto
        this.ctx.fillStyle = '#991b1b';
        this.ctx.beginPath();
        this.ctx.moveTo(px - 2, py + 12); this.ctx.lineTo(cx, py - 2); this.ctx.lineTo(px + CELL_SIZE + 2, py + 12);
        this.ctx.closePath(); this.ctx.fill();
        
        // Puerta
        this.ctx.fillStyle = '#451a03';
        this.ctx.fillRect(cx - 4, py + CELL_SIZE - 10, 8, 10);

        if (hp < 10) {
            let barWidth = 20;
            let segWidth = barWidth / 10;
            this.ctx.fillStyle = '#475569'; this.ctx.fillRect(cx - 10, py - 6, 20, 4);
            this.ctx.fillStyle = '#22c55e'; this.ctx.fillRect(cx - 10, py - 6, segWidth * hp, 4);
        }
    }

    drawBigHouse(x, y) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        let cx = px + CELL_SIZE;
        this.drawShadow(cx, py + CELL_SIZE * 2 - 4, CELL_SIZE * 1.5, 12);

        if (this.images && this.images.sprout_house) {
            this.ctx.drawImage(this.images.sprout_house, 0, 0, 112, 80, px - 48, py - 32, 112, 80);
        } else {
            this.ctx.fillStyle = '#b45309';
            this.ctx.fillRect(px, py, CELL_SIZE * 2, CELL_SIZE * 2);
        }
    }

    drawBook(x, y, timestamp) {
        let cx = x * CELL_SIZE + CELL_SIZE / 2;
        let cy = y * CELL_SIZE + CELL_SIZE / 2;
        let t = timestamp ? timestamp * 0.003 : 0;
        let hover = Math.sin(t) * 4; 

        this.drawShadow(cx, cy + 10, 10, 4);

        this.ctx.save();
        this.ctx.translate(cx, cy + hover);

        // Aura
        let aura = Math.abs(Math.sin(t*0.5)) * 5;
        this.ctx.shadowColor = '#fef08a';
        this.ctx.shadowBlur = 10 + aura;

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
        
        this.ctx.restore();
    }

    drawTelescope(x, y) {
        let cx = x * CELL_SIZE + CELL_SIZE / 2;
        let cy = y * CELL_SIZE + CELL_SIZE / 2;
        
        this.drawShadow(cx, cy + 12, 10, 4);

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

    drawWall(x, y, hp) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        let cx = px + CELL_SIZE/2;

        this.drawShadow(cx, py + CELL_SIZE - 2, 14, 5);

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
        let frame = Math.floor(t * 0.005) % 4; // Animación 4 frames

        if (type === 'agent') {
            this.drawShadow(cx, cy + 6, 6, 2);

            let dir = 0; // 0=down, 1=up, 2=left, 3=right
            if (entity.dx > 0) dir = 3;
            else if (entity.dx < 0) dir = 2;
            else if (entity.dy < 0) dir = 1;

            let isMoving = (entity.dx !== 0 || entity.dy !== 0);
            if (!isMoving) frame = 0; // Idle frame (col 0) o 0/1 para idle respirando
            if (!isMoving && Math.floor(t * 0.002) % 2 === 0) frame = 1; // Idle sutil

            if (this.images && this.images.sprout_agent) {
                // Sprout Lands Basic Charakter: 4x4 grid de 48x48
                let sx = frame * 48;
                let sy = dir * 48;
                this.ctx.drawImage(this.images.sprout_agent, sx, sy, 48, 48, px - 16, py - 24, 48, 48);
            } else {
                this.ctx.fillStyle = '#ef4444'; this.ctx.fillRect(px + 4, py + 4, 8, 8);
            }
        } else if (type === 'enemy') {
            this.drawShadow(cx, cy + 6, 8, 3);
            if (this.images && this.images.sprout_cow) {
                // Vaca es 96x64 (3 frames de 32x32?)
                let cowFrame = Math.floor(t * 0.003) % 3; 
                this.ctx.drawImage(this.images.sprout_cow, cowFrame * 32, 0, 32, 32, px - 8, py - 16, 32, 32);
            } else {
                this.ctx.fillStyle = '#d8b4fe'; this.ctx.fillRect(px + 4, py + 4, 8, 8);
            }
        } else if (type === 'wolf') {
            this.drawShadow(cx, cy + 6, 6, 2);
            if (this.images && this.images.sprout_chicken) {
                let chickFrame = Math.floor(t * 0.004) % 2; 
                this.ctx.drawImage(this.images.sprout_chicken, chickFrame * 16, 0, 16, 16, px, py, 16, 16);
            } else {
                this.ctx.fillStyle = '#94a3b8'; this.ctx.fillRect(px + 4, py + 4, 8, 8);
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
                // Noche
                opacity = 0.7;
                overlayColor = `rgba(15, 23, 42, ${opacity})`; 
            } else if (timeOfDay >= 500 && timeOfDay <= 700) {
                // Amanecer
                opacity = 0.4;
                overlayColor = `rgba(234, 88, 12, ${opacity})`;
            } else if (timeOfDay >= 1700 && timeOfDay <= 1800) {
                // Atardecer
                opacity = 0.4;
                overlayColor = `rgba(190, 24, 93, ${opacity})`;
            }
        }

        if (opacity > 0) {
            // Capa oscura principal
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.fillStyle = overlayColor;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Luces (Glow) que cortan la oscuridad
            this.ctx.globalCompositeOperation = 'destination-out';
            
            let drawLight = (worldX, worldY, radius, intensity = 1) => {
                let px = (worldX * CELL_SIZE + CELL_SIZE/2) * ZOOM - this.cameraX * ZOOM;
                let py = (worldY * CELL_SIZE + CELL_SIZE/2) * ZOOM - this.cameraY * ZOOM;
                let grad = this.ctx.createRadialGradient(px, py, 2, px, py, radius);
                grad.addColorStop(0, `rgba(0, 0, 0, ${intensity})`);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                this.ctx.fillStyle = grad;
                this.ctx.beginPath(); this.ctx.arc(px, py, radius, 0, Math.PI*2); this.ctx.fill();
            };

            // Luz del Agente
            if (agent) {
                let pulse = Math.sin((timestamp||0) * 0.002) * 5;
                drawLight(agent.x, agent.y, 80 + pulse, 0.9);
            }

            // Luz de casas grandes (iluminación de las ventanas)
            for (let item of renderQueue) {
                if (item.type === 'bighouse') {
                    // Casa ocupa 2x2. Centro es x+1, y+1
                    drawLight(item.x + 0.5, item.y + 0.5, 120, 0.7);
                }
            }

            // Luz de luciérnagas
            if (particles) {
                for (let p of particles.particles) {
                    if (p.type === 'FIREFLY') {
                        let px = p.x * ZOOM - this.cameraX * ZOOM;
                        let py = p.y * ZOOM - this.cameraY * ZOOM;
                        let grad = this.ctx.createRadialGradient(px, py, 1, px, py, 20);
                        grad.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
                        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                        this.ctx.fillStyle = grad;
                        this.ctx.beginPath(); this.ctx.arc(px, py, 20, 0, Math.PI*2); this.ctx.fill();
                    }
                }
            }
        }
        
        this.ctx.restore();
    }
}
