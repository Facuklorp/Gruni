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
                
                // Fondo pasto general
                this.ctx.fillStyle = '#86efac';
                this.ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

                let tv = cell.terrainVariant || 0;
                if (tv === 1) { // Flores
                    this.ctx.fillStyle = '#fde047';
                    this.ctx.beginPath(); this.ctx.arc(px + 10, py + 10, 2, 0, Math.PI*2); this.ctx.fill();
                    this.ctx.fillStyle = '#f87171';
                    this.ctx.beginPath(); this.ctx.arc(px + 22, py + 20, 2, 0, Math.PI*2); this.ctx.fill();
                } else if (tv === 2) { // Tierra (dirt patch)
                    this.ctx.fillStyle = '#d97706';
                    this.ctx.beginPath(); this.ctx.ellipse(px + 15, py + 15, 10, 6, 0, 0, Math.PI*2); this.ctx.fill();
                } else if (tv === 3) { // Pasto oscuro alto
                    this.ctx.fillStyle = '#22c55e';
                    this.ctx.fillRect(px + 5, py + 15, 2, 6);
                    this.ctx.fillRect(px + 8, py + 12, 2, 9);
                    this.ctx.fillRect(px + 20, py + 5, 2, 7);
                } else { // Pasto normal
                    this.ctx.strokeStyle = 'rgba(22, 163, 74, 0.4)';
                    this.ctx.lineWidth = 1.5;
                    this.ctx.lineCap = 'round';
                    this.ctx.beginPath();
                    this.ctx.moveTo(px + 15, py + 15); this.ctx.lineTo(px + 13, py + 11);
                    this.ctx.moveTo(px + 15, py + 15); this.ctx.lineTo(px + 17, py + 10);
                    this.ctx.stroke();
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
        
        let t = (timestamp || 0) * 0.002;
        let wave = Math.sin(x + y + t) * 2;
        
        this.ctx.fillStyle = '#0ea5e9';
        this.ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        
        // Highlight de agua (olas)
        this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
        this.ctx.fillRect(px + 5, py + 10 + wave, 15, 2);
        this.ctx.fillRect(px + 15, py + 20 - wave, 10, 2);

        // Orilla de arena con espuma animada
        this.ctx.fillStyle = '#fde047'; 
        let isWater = (dx, dy) => {
            let c = world.getCell(x + dx, y + dy);
            return c && (c.type === RESOURCES.WATER || c.type === RESOURCES.BRIDGE);
        };
        let b = 2; // Borde de arena
        let foamWave = Math.sin(t * 2 + x) * 1.5;
        let fw = Math.max(0, foamWave);
        
        if (!isWater(0, -1)) { this.ctx.fillStyle='#fde047'; this.ctx.fillRect(px, py, CELL_SIZE, b); this.ctx.fillStyle='white'; this.ctx.fillRect(px, py+b, CELL_SIZE, 1+fw); }
        if (!isWater(0, 1)) { this.ctx.fillStyle='#fde047'; this.ctx.fillRect(px, py + CELL_SIZE - b, CELL_SIZE, b); this.ctx.fillStyle='white'; this.ctx.fillRect(px, py+CELL_SIZE-b-1-fw, CELL_SIZE, 1+fw); }
        if (!isWater(-1, 0)) { this.ctx.fillStyle='#fde047'; this.ctx.fillRect(px, py, b, CELL_SIZE); this.ctx.fillStyle='white'; this.ctx.fillRect(px+b, py, 1+fw, CELL_SIZE); }
        if (!isWater(1, 0)) { this.ctx.fillStyle='#fde047'; this.ctx.fillRect(px + CELL_SIZE - b, py, b, CELL_SIZE); this.ctx.fillStyle='white'; this.ctx.fillRect(px+CELL_SIZE-b-1-fw, py, 1+fw, CELL_SIZE); }
    }

    drawApple(x, y, timestamp) {
        let cx = x * CELL_SIZE + CELL_SIZE / 2;
        let cy = y * CELL_SIZE + CELL_SIZE / 2;
        let t = timestamp ? timestamp * 0.003 : 0;
        let hover = Math.sin(t + x) * 2;
        
        this.drawShadow(cx, cy + 8, 8, 3);

        cy += hover + 2;
        this.ctx.fillStyle = '#ef4444';
        this.ctx.beginPath(); this.ctx.arc(cx, cy, 7, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.fillStyle = '#16a34a';
        this.ctx.beginPath(); this.ctx.ellipse(cx + 4, cy - 5, 5, 2.5, Math.PI / 4, 0, Math.PI * 2); this.ctx.fill();
        // Highlight
        this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
        this.ctx.beginPath(); this.ctx.arc(cx - 2, cy - 2, 2, 0, Math.PI * 2); this.ctx.fill();
    }

    drawTree(x, y) {
        let cx = x * CELL_SIZE + CELL_SIZE / 2;
        let cy = y * CELL_SIZE + CELL_SIZE / 2;
        this.drawShadow(cx, cy + 12, 12, 4);

        if (this.images && this.images.tree) {
            let px = x * CELL_SIZE;
            let py = y * CELL_SIZE;
            // Draw tree sprite slightly larger and overlapping upwards
            this.ctx.drawImage(this.images.tree, px - 10, py - 20, CELL_SIZE + 20, CELL_SIZE + 20);
        } else {
            // Tronco
            this.ctx.fillStyle = '#5c2b07';
            this.ctx.fillRect(cx - 3, cy, 6, 14);

            let drawPine = (yOffset, width, height, color) => {
                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.moveTo(cx, cy - yOffset - height);
                this.ctx.lineTo(cx + width, cy - yOffset);
                this.ctx.lineTo(cx - width, cy - yOffset);
                this.ctx.closePath();
                this.ctx.fill();
            };

            drawPine(4, 14, 18, '#14532d');
            drawPine(9, 12, 16, '#166534');
            drawPine(14, 10, 14, '#22c55e');
            drawPine(19, 8, 12, '#4ade80');
        }
    }

    drawRock(x, y) {
        let cx = x * CELL_SIZE + CELL_SIZE / 2;
        let cy = y * CELL_SIZE + CELL_SIZE / 2;
        this.drawShadow(cx, cy + 10, 12, 5);

        if (this.images && this.images.rock) {
            let px = x * CELL_SIZE;
            let py = y * CELL_SIZE;
            this.ctx.drawImage(this.images.rock, px, py, CELL_SIZE, CELL_SIZE);
        } else {
            this.ctx.fillStyle = '#475569';
            this.ctx.beginPath();
            this.ctx.moveTo(cx - 12, cy + 8); this.ctx.lineTo(cx - 6, cy - 6); this.ctx.lineTo(cx + 4, cy - 12);
            this.ctx.lineTo(cx + 14, cy - 2); this.ctx.lineTo(cx + 10, cy + 10); this.ctx.closePath(); this.ctx.fill();
            
            this.ctx.fillStyle = '#94a3b8';
            this.ctx.beginPath();
            this.ctx.moveTo(cx - 8, cy + 6); this.ctx.lineTo(cx - 4, cy - 4); this.ctx.lineTo(cx + 6, cy - 4);
            this.ctx.closePath(); this.ctx.fill();
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
        let w = CELL_SIZE * 2;
        let h = CELL_SIZE * 2;
        let cx = px + w/2;

        this.drawShadow(cx, py + h - 4, w/1.2, 12);

        // Base
        this.ctx.fillStyle = '#b45309';
        this.ctx.fillRect(px + 4, py + 20, w - 8, h - 24);
        
        // Techo principal
        this.ctx.fillStyle = '#991b1b';
        this.ctx.beginPath();
        this.ctx.moveTo(px - 4, py + 24);
        this.ctx.lineTo(cx, py - 4);
        this.ctx.lineTo(px + w + 4, py + 24);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Detalle de tejado
        this.ctx.fillStyle = '#ef4444';
        this.ctx.beginPath();
        this.ctx.moveTo(px + 4, py + 22);
        this.ctx.lineTo(cx, py + 2);
        this.ctx.lineTo(px + w - 4, py + 22);
        this.ctx.closePath();
        this.ctx.fill();

        // Puerta y ventana
        this.ctx.fillStyle = '#0ea5e9';
        this.ctx.beginPath(); this.ctx.arc(cx, py + 18, 6, 0, Math.PI*2); this.ctx.fill();
        
        this.ctx.fillStyle = '#451a03';
        this.ctx.fillRect(cx - 8, py + h - 20, 16, 16);
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
        let breathe = Math.sin(t * 0.005 + cx) * 1.5;

        if (type === 'agent') {
            this.drawShadow(cx, cy + 14, 10, 4);

            let frame = (Math.floor(entity.animationTimer / 2)) % 2; 
            let img = this.images && this.images.agent_basicas ? this.images.agent_basicas : null;
            let imgAcciones = this.images && this.images.agent_acciones ? this.images.agent_acciones : null;
            
            if (img && imgAcciones) {
                let sx = 512, sy = 512, sw = 256, sh = 512; // Default
                let activeImg = img;
                
                if (entity.isAttacking || entity.state === '¡Defendiendo Casa!') {
                    activeImg = imgAcciones;
                    sx = 0; sy = 512; sw = 1024; sh = 512; 
                } else if (entity.state === 'Talando' || (entity.state === 'Recolectando' && entity.lastGathered === 'WOOD') || entity.state === 'Construyendo Casa' || entity.state === 'Restaurando Casa' || entity.state === 'Construyendo Muralla' || entity.state === 'Construyendo Telescopio') {
                    activeImg = imgAcciones;
                    sx = 0; sy = 1024; sw = 512; sh = 512;
                } else if (entity.state === 'Picando' || (entity.state === 'Recolectando' && entity.lastGathered === 'ROCK')) {
                    activeImg = imgAcciones;
                    sx = 512; sy = 1024; sw = 512; sh = 512;
                } else if (entity.happyTimer > 0) {
                    activeImg = img;
                    sx = 768; sy = 0; sw = 256; sh = 512;
                } else {
                    let isMoving = (entity.target !== null && entity.state.startsWith('Buscando'));
                    if (isMoving || (entity.state === 'Deambulando' && entity.wanderTimer === 0)) {
                        if (entity.state === 'Buscando Agua') {
                            activeImg = imgAcciones;
                            sx = 1024 + (frame * 512); sy = 0; sw = 512; sh = 512;
                        } else if (entity.state === 'Buscando Comida') {
                            activeImg = imgAcciones;
                            sx = 1024 + (frame * 512); sy = 512; sw = 512; sh = 512;
                        } else {
                            activeImg = img;
                            sx = frame * 256; sy = 0; sw = 256; sh = 512;
                        }
                    } else {
                        activeImg = img;
                        if (entity.emotion === 'SAD') { sx = 256; sy = 512; sw = 256; sh = 512; }
                        else if (entity.emotion === 'ANGRY') { sx = 0; sy = 512; sw = 256; sh = 512; }
                        else if (entity.stuckTimer > 0) { sx = 768; sy = 512; sw = 256; sh = 512; }
                        else { sx = 512; sy = 512; sw = 256; sh = 512; }
                    }
                }

                this.ctx.save();
                this.ctx.translate(cx, cy);
                
                if (entity.dx === -1) {
                    this.ctx.scale(-1, 1);
                }

                let drawW = 34;
                let drawH = 68;
                let offsetY = -15;

                if (activeImg === imgAcciones) {
                    drawW = 68;
                    drawH = 68;
                    if (sw === 1024) drawW = 136;
                }

                let cropH = sh * 0.85; 
                let renderH = drawH * 0.85;
                
                let drawX = -drawW / 2;
                if (sw === 1024) drawX = -drawW / 4;

                let hover = Math.sin(t * 0.005) * 2;
                
                // Efecto de caminado por código (Wobble & Bobbing)
                let walkWobble = 0;
                let walkBounce = 0;
                let isMoving = (entity.target !== null && entity.state.startsWith('Buscando')) || (entity.state === 'Deambulando' && entity.wanderTimer === 0);
                
                if (isMoving) {
                    // Balanceo (rotación leve)
                    walkWobble = Math.sin(t * 0.02) * 0.15; 
                    // Salto vertical (bobbing)
                    walkBounce = Math.abs(Math.sin(t * 0.02)) * 6;
                }

                this.ctx.translate(drawX + drawW/2, -renderH/2 + offsetY + hover - walkBounce + renderH/2);
                this.ctx.rotate(walkWobble);
                this.ctx.translate(-(drawX + drawW/2), -(-renderH/2 + offsetY + hover - walkBounce + renderH/2));

                this.ctx.drawImage(activeImg, sx, sy, sw, cropH, drawX, -renderH/2 + offsetY + hover - walkBounce, drawW, renderH);
                this.ctx.restore();
            }
        } else {
            // Lobo o Enemigo
            this.drawShadow(cx, cy + 12, type === 'wolf' ? 14 : 10, 5);

            this.ctx.save();
            this.ctx.translate(cx, cy);
            
            let outline = '#0f172a';
            this.ctx.lineJoin = 'round';

            let drawPart = (pathFn, fillStyle) => {
                this.ctx.beginPath();
                pathFn();
                this.ctx.fillStyle = fillStyle;
                this.ctx.fill();
                this.ctx.lineWidth = 2.5 / ZOOM;
                this.ctx.strokeStyle = outline;
                this.ctx.stroke();
            };

            let walkCycle = Math.sin(t * 0.01 + cx * 10);

            if (type === 'wolf') {
                let bodyColor = '#94a3b8';
                let furColor = '#cbd5e1';
                let tailSwing = Math.sin(t * 0.01) * 3;
                
                drawPart(() => { this.ctx.roundRect(-8, 8, 4, 8, 2); }, bodyColor);
                drawPart(() => { this.ctx.roundRect(4, 8, 4, 8, 2); }, bodyColor);

                this.ctx.save();
                this.ctx.translate(-12, 0);
                this.ctx.rotate(tailSwing * 0.1);
                drawPart(() => { this.ctx.ellipse(-6, 4, 8, 3, Math.PI/4, 0, Math.PI*2); }, bodyColor);
                this.ctx.restore();

                drawPart(() => { this.ctx.ellipse(0, 2 + breathe*0.5, 14, 10, 0, 0, Math.PI*2); }, furColor);
                drawPart(() => { this.ctx.arc(10, -4 + breathe*0.5, 7, 0, Math.PI*2); }, furColor);
                drawPart(() => { this.ctx.ellipse(16, -2 + breathe*0.5, 5, 3, 0, 0, Math.PI*2); }, '#e2e8f0');
                
                this.ctx.fillStyle = outline;
                this.ctx.beginPath(); this.ctx.arc(20, -3 + breathe*0.5, 1.5, 0, Math.PI*2); this.ctx.fill();
                
                drawPart(() => { this.ctx.moveTo(8, -10 + breathe*0.5); this.ctx.lineTo(12, -16 + breathe*0.5); this.ctx.lineTo(14, -8 + breathe*0.5); this.ctx.closePath(); }, bodyColor);
                
                drawPart(() => { this.ctx.roundRect(-4, 10, 4, 8, 2); }, furColor);
                drawPart(() => { this.ctx.roundRect(8, 10, 4, 8, 2); }, furColor);

                this.ctx.fillStyle = outline;
                this.ctx.beginPath(); this.ctx.arc(12, -5 + breathe*0.5, 1.5, 0, Math.PI*2); this.ctx.fill();

                if (entity.isAttacking) {
                    this.ctx.shadowColor = '#3b82f6';
                    this.ctx.shadowBlur = 10;
                    drawPart(() => { this.ctx.arc(24, -2 + breathe*0.5, 5, 0, Math.PI*2); }, 'rgba(59, 130, 246, 0.8)');
                    this.ctx.shadowBlur = 0;
                }

                this.ctx.translate(0, -22);
                this.drawHpBar(entity.hp, 10, '#3b82f6');
                
            } else {
                // Enemy
                let skinColor = '#d8b4fe'; 
                let shirtColor = '#7e22ce'; 
                let pantsColor = '#4c1d95'; 
                
                let legSwing = entity.isAttacking ? 0 : walkCycle * 4;

                drawPart(() => { this.ctx.roundRect(-6, 6 - legSwing, 5, 8, 2); }, pantsColor);
                drawPart(() => { this.ctx.roundRect(-8, 0 + legSwing, 4, 7, 2); }, skinColor);

                drawPart(() => { 
                    this.ctx.moveTo(-7, -4 + breathe);
                    this.ctx.lineTo(7, -4 + breathe);
                    this.ctx.lineTo(6, 8 + breathe);
                    this.ctx.lineTo(-6, 8 + breathe);
                    this.ctx.closePath();
                }, shirtColor);

                drawPart(() => { this.ctx.arc(0, -12 + breathe, 8, 0, Math.PI*2); }, skinColor);

                drawPart(() => { this.ctx.moveTo(-5, -18 + breathe); this.ctx.lineTo(-8, -24 + breathe); this.ctx.lineTo(-2, -18 + breathe); this.ctx.closePath(); }, '#f1f5f9');
                drawPart(() => { this.ctx.moveTo(5, -18 + breathe); this.ctx.lineTo(8, -24 + breathe); this.ctx.lineTo(2, -18 + breathe); this.ctx.closePath(); }, '#f1f5f9');

                this.ctx.lineWidth = 2 / ZOOM;
                this.ctx.strokeStyle = outline;
                
                this.ctx.beginPath(); this.ctx.moveTo(-6, -14+breathe); this.ctx.lineTo(-2, -12+breathe); this.ctx.stroke();
                this.ctx.beginPath(); this.ctx.moveTo(6, -14+breathe); this.ctx.lineTo(2, -12+breathe); this.ctx.stroke();
                this.ctx.fillStyle = outline;
                this.ctx.beginPath(); this.ctx.arc(-3, -11+breathe, 1.5, 0, Math.PI*2); this.ctx.fill();
                this.ctx.beginPath(); this.ctx.arc(3, -11+breathe, 1.5, 0, Math.PI*2); this.ctx.fill();

                drawPart(() => { this.ctx.roundRect(1, 6 + legSwing, 5, 8, 2); }, pantsColor);
                drawPart(() => { this.ctx.roundRect(4, 0 - legSwing, 4, 7, 2); }, skinColor);

                this.ctx.translate(0, -28);
                this.drawHpBar(entity.hp, 4, '#22c55e');
            }
            this.ctx.restore();
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
