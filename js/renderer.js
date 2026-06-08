// js/renderer.js
import { WORLD_WIDTH, WORLD_HEIGHT, CELL_SIZE, ZOOM, RESOURCES } from './world.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cameraX = 0;
        this.cameraY = 0;
        this.images = null;
        this.grassPattern = this.createGrassPattern();
    }

    initImages(images) {
        this.images = images;
        if (images.grass) {
            this.grassPattern = this.ctx.createPattern(images.grass, 'repeat');
        }
        if (images.water) {
            this.waterPattern = this.ctx.createPattern(images.water, 'repeat');
        }
    }

    createGrassPattern() {
        const pCanvas = document.createElement('canvas');
        pCanvas.width = 100;
        pCanvas.height = 100;
        const pCtx = pCanvas.getContext('2d');
        
        pCtx.fillStyle = '#86efac'; 
        pCtx.fillRect(0, 0, 100, 100);
        
        // Dibujar pequeñas espigas de pasto
        pCtx.strokeStyle = 'rgba(22, 163, 74, 0.4)';
        pCtx.lineWidth = 1.5;
        pCtx.lineCap = 'round';
        
        for(let i=0; i<40; i++) {
            let x = Math.random() * 100;
            let y = Math.random() * 100;
            pCtx.beginPath();
            pCtx.moveTo(x, y);
            pCtx.lineTo(x - 2, y - 4);
            pCtx.moveTo(x, y);
            pCtx.lineTo(x + 2, y - 5);
            pCtx.stroke();
        }
        return pCtx.createPattern(pCanvas, 'repeat');
    }

    draw(world, agent, enemies, wolf = null, isEclipse = false, timestamp = 0) {
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

        // Fondo base (pasto) - Anclado al mundo
        this.ctx.fillStyle = this.grassPattern;
        this.ctx.fillRect(this.cameraX, this.cameraY, viewW, viewH);

        // Iluminación global sutil (fija a la pantalla)
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        let grad = this.ctx.createRadialGradient(this.canvas.width/2, this.canvas.height/2, 50, this.canvas.width/2, this.canvas.height/2, this.canvas.width);
        grad.addColorStop(0, 'rgba(255,255,255,0.05)');
        grad.addColorStop(1, 'rgba(0,0,0,0.1)');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
        
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

        this.ctx.restore();

        // Eclipse y luces
        if (isEclipse) {
            this.drawEclipseOverlay(agent, wolf, timestamp);
        }
    }

    drawShadow(cx, cy, width, height) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.beginPath();
        this.ctx.ellipse(cx, cy, width, height, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawContinuousWater(x, y, world, timestamp) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        
        if (this.waterPattern) {
            this.ctx.save();
            this.ctx.translate(px, py);
            this.ctx.fillStyle = this.waterPattern;
            this.ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
            this.ctx.restore();
        } else {
            this.ctx.fillStyle = '#0ea5e9';
            this.ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        }

        // Orilla de arena
        this.ctx.fillStyle = '#fde047'; 
        let isWater = (dx, dy) => {
            let c = world.getCell(x + dx, y + dy);
            return c && (c.type === RESOURCES.WATER || c.type === RESOURCES.BRIDGE);
        };
        let b = 2; // Borde de arena
        if (!isWater(0, -1)) this.ctx.fillRect(px, py, CELL_SIZE, b);
        if (!isWater(0, 1)) this.ctx.fillRect(px, py + CELL_SIZE - b, CELL_SIZE, b);
        if (!isWater(-1, 0)) this.ctx.fillRect(px, py, b, CELL_SIZE);
        if (!isWater(1, 0)) this.ctx.fillRect(px + CELL_SIZE - b, py, b, CELL_SIZE);
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
        let walkSwing = Math.sin(entity.x * 10) * 4; 
        if (timestamp === 0) walkSwing = 0; // Animación de idle o movimiento

        if (type === 'agent' && this.images && this.images.agent) {
            let px = entity.x * CELL_SIZE;
            let py = entity.y * CELL_SIZE;
            let cx = px + CELL_SIZE / 2;
            let cy = py + CELL_SIZE / 2;

            // Sombra
            this.drawShadow(cx, cy + 14, 10, 4);
            
            let hover = Math.sin((timestamp||0) * 0.005) * 2;
            
            // Draw agent sprite
            this.ctx.drawImage(this.images.agent, px - 5, py - 15 + hover, CELL_SIZE + 10, CELL_SIZE + 15);
            return;
        }

        if (type !== 'agent' && entity.hp <= 0) return;

        let cx = entity.x * CELL_SIZE + CELL_SIZE / 2;
        let cy = entity.y * CELL_SIZE + CELL_SIZE / 2;
        
        let t = timestamp || 0;
        let walkCycle = Math.sin(t * 0.01 + cx * 10);
        let breathe = Math.sin(t * 0.005 + cx) * 1.5;

        // Shadow
        this.drawShadow(cx, cy + 12, type === 'wolf' ? 14 : 10, 5);

        this.ctx.save();
        this.ctx.translate(cx, cy);
        
        let outline = '#0f172a'; // Dark outline
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

        if (type === 'wolf') {
            let bodyColor = '#94a3b8';
            let furColor = '#cbd5e1';
            let tailSwing = Math.sin(t * 0.01) * 3;
            
            // Patas traseras (atrás)
            drawPart(() => { this.ctx.roundRect(-8, 8, 4, 8, 2); }, bodyColor);
            drawPart(() => { this.ctx.roundRect(4, 8, 4, 8, 2); }, bodyColor);

            // Cola
            this.ctx.save();
            this.ctx.translate(-12, 0);
            this.ctx.rotate(tailSwing * 0.1);
            drawPart(() => { this.ctx.ellipse(-6, 4, 8, 3, Math.PI/4, 0, Math.PI*2); }, bodyColor);
            this.ctx.restore();

            // Cuerpo
            drawPart(() => { this.ctx.ellipse(0, 2 + breathe*0.5, 14, 10, 0, 0, Math.PI*2); }, furColor);
            
            // Cabeza
            drawPart(() => { this.ctx.arc(10, -4 + breathe*0.5, 7, 0, Math.PI*2); }, furColor);
            // Hocico
            drawPart(() => { this.ctx.ellipse(16, -2 + breathe*0.5, 5, 3, 0, 0, Math.PI*2); }, '#e2e8f0');
            // Nariz
            this.ctx.fillStyle = outline;
            this.ctx.beginPath(); this.ctx.arc(20, -3 + breathe*0.5, 1.5, 0, Math.PI*2); this.ctx.fill();
            // Oreja
            drawPart(() => { this.ctx.moveTo(8, -10 + breathe*0.5); this.ctx.lineTo(12, -16 + breathe*0.5); this.ctx.lineTo(14, -8 + breathe*0.5); this.ctx.closePath(); }, bodyColor);
            
            // Patas delanteras (frente)
            drawPart(() => { this.ctx.roundRect(-4, 10, 4, 8, 2); }, furColor);
            drawPart(() => { this.ctx.roundRect(8, 10, 4, 8, 2); }, furColor);

            // Ojo
            this.ctx.fillStyle = outline;
            this.ctx.beginPath(); this.ctx.arc(12, -5 + breathe*0.5, 1.5, 0, Math.PI*2); this.ctx.fill();

            // Mordida si ataca
            if (entity.isAttacking) {
                this.ctx.shadowColor = '#3b82f6';
                this.ctx.shadowBlur = 10;
                drawPart(() => { this.ctx.arc(24, -2 + breathe*0.5, 5, 0, Math.PI*2); }, 'rgba(59, 130, 246, 0.8)');
                this.ctx.shadowBlur = 0;
            }

            // HP Bar
            this.ctx.translate(0, -22);
            this.drawHpBar(entity.hp, 10, '#3b82f6');
            
        if (type === 'agent') {
            let px = entity.x * CELL_SIZE;
            let py = entity.y * CELL_SIZE;
            let cx = px + CELL_SIZE / 2;
            let cy = py + CELL_SIZE / 2;

            this.drawShadow(cx, cy + 14, 10, 4);

            let t = timestamp || 0;
            // Alternar frame entre 0 y 1 para la animación de caminar
            let frame = (Math.floor(entity.animationTimer / 2)) % 2; 
            
            let img = this.images.agent_basicas;
            let sx = 512, sy = 512, sw = 256, sh = 512; // Default: Contento (Idle)
            
            if (entity.isAttacking || entity.state === '¡Defendiendo Casa!') {
                img = this.images.agent_acciones;
                sx = 0; sy = 512; sw = 1024; sh = 512; // Atacando
            } else if (entity.state === 'Talando' || (entity.state === 'Recolectando' && entity.lastGathered === 'WOOD') || entity.state === 'Construyendo Casa' || entity.state === 'Restaurando Casa' || entity.state === 'Construyendo Muralla' || entity.state === 'Construyendo Telescopio') {
                img = this.images.agent_acciones;
                sx = 0; sy = 1024; sw = 512; sh = 512; // Talando
            } else if (entity.state === 'Picando' || (entity.state === 'Recolectando' && entity.lastGathered === 'ROCK')) {
                img = this.images.agent_acciones;
                sx = 512; sy = 1024; sw = 512; sh = 512; // Picando
            } else if (entity.happyTimer > 0) {
                img = this.images.agent_basicas;
                sx = 768; sy = 0; sw = 256; sh = 512; // Saltando
            } else {
                let isMoving = (entity.target !== null && entity.state.startsWith('Buscando'));
                if (isMoving || entity.state === 'Deambulando' && entity.wanderTimer === 0) {
                    if (entity.state === 'Buscando Agua') {
                        img = this.images.agent_acciones;
                        sx = 1024 + (frame * 512); sy = 0; sw = 512; sh = 512; // Con balde
                    } else if (entity.state === 'Buscando Comida') {
                        img = this.images.agent_acciones;
                        sx = 1024 + (frame * 512); sy = 512; sw = 512; sh = 512; // Con canasta
                    } else {
                        img = this.images.agent_basicas;
                        sx = frame * 256; sy = 0; sw = 256; sh = 512; // Caminando normal
                    }
                } else {
                    img = this.images.agent_basicas;
                    if (entity.emotion === 'SAD') { sx = 256; sy = 512; sw = 256; sh = 512; }
                    else if (entity.emotion === 'ANGRY') { sx = 0; sy = 512; sw = 256; sh = 512; }
                    else if (entity.stuckTimer > 0) { sx = 768; sy = 512; sw = 256; sh = 512; } // Pensando si se atasca
                    else { sx = 512; sy = 512; sw = 256; sh = 512; } // Neutral
                }
            }

            if (img) {
                this.ctx.save();
                this.ctx.translate(cx, cy);
                
                // Efecto espejo según la dirección de movimiento
                if (entity.dx === -1) {
                    this.ctx.scale(-1, 1);
                }

                let drawW = 34;
                let drawH = 68;
                let offsetY = -15;

                if (img === this.images.agent_acciones) {
                    drawW = 68;
                    drawH = 68;
                    if (sw === 1024) {
                        drawW = 136; // Espada es ancha
                    }
                }

                // Recortar texto inferio (un 15% del alto)
                let cropH = sh * 0.85; 
                let renderH = drawH * 0.85;
                
                let drawX = -drawW / 2;
                if (sw === 1024) drawX = -drawW / 4; // Ajuste para la espada

                let hover = Math.sin((timestamp||0) * 0.005) * 2;
                
                this.ctx.drawImage(img, sx, sy, sw, cropH, drawX, -renderH/2 + offsetY + hover, drawW, renderH);

                this.ctx.restore();
            }
        } else {
            // Humanoids (Enemy)
            let isAgent = false;
            let skinColor = '#d8b4fe'; 
            let shirtColor = '#7e22ce'; 
            let pantsColor = '#4c1d95'; 
            
            let legSwing = entity.isAttacking ? 0 : walkCycle * 4;

            // Pierna Izquierda (Atrás)
            drawPart(() => { this.ctx.roundRect(-6, 6 - legSwing, 5, 8, 2); }, pantsColor);
            
            // Brazo Izquierdo (Atrás)
            drawPart(() => { this.ctx.roundRect(-8, 0 + legSwing, 4, 7, 2); }, skinColor);

            // Torso (Enterizo)
            drawPart(() => { 
                this.ctx.moveTo(-7, -4 + breathe);
                this.ctx.lineTo(7, -4 + breathe);
                this.ctx.lineTo(6, 8 + breathe);
                this.ctx.lineTo(-6, 8 + breathe);
                this.ctx.closePath();
            }, shirtColor);

            // Cabeza
            drawPart(() => { this.ctx.arc(0, -12 + breathe, 8, 0, Math.PI*2); }, skinColor);

            // Cuernos enemigo
            drawPart(() => { this.ctx.moveTo(-5, -18 + breathe); this.ctx.lineTo(-8, -24 + breathe); this.ctx.lineTo(-2, -18 + breathe); this.ctx.closePath(); }, '#f1f5f9');
            drawPart(() => { this.ctx.moveTo(5, -18 + breathe); this.ctx.lineTo(8, -24 + breathe); this.ctx.lineTo(2, -18 + breathe); this.ctx.closePath(); }, '#f1f5f9');

            // Cara
            this.ctx.lineWidth = 2 / ZOOM;
            this.ctx.strokeStyle = outline;
            
            this.ctx.beginPath(); this.ctx.moveTo(-6, -14+breathe); this.ctx.lineTo(-2, -12+breathe); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(6, -14+breathe); this.ctx.lineTo(2, -12+breathe); this.ctx.stroke();
            this.ctx.fillStyle = outline;
            this.ctx.beginPath(); this.ctx.arc(-3, -11+breathe, 1.5, 0, Math.PI*2); this.ctx.fill();
            this.ctx.beginPath(); this.ctx.arc(3, -11+breathe, 1.5, 0, Math.PI*2); this.ctx.fill();

            // Pierna Derecha (Frente)
            drawPart(() => { this.ctx.roundRect(1, 6 + legSwing, 5, 8, 2); }, pantsColor);
            
            // Brazo Derecho (Frente)
            drawPart(() => { this.ctx.roundRect(4, 0 - legSwing, 4, 7, 2); }, skinColor);

            this.ctx.translate(0, -28);
            this.drawHpBar(entity.hp, 4, '#22c55e');
        }

        this.ctx.restore();
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

    drawEclipseOverlay(agent, wolf, timestamp) {
        this.ctx.save();
        
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
        this.ctx.fillRect(this.cameraX, this.cameraY, this.canvas.width / ZOOM, this.canvas.height / ZOOM);

        this.ctx.globalCompositeOperation = 'destination-out';
        
        let ax = agent.x * CELL_SIZE + CELL_SIZE/2;
        let ay = agent.y * CELL_SIZE + CELL_SIZE/2;
        let pulse = Math.sin((timestamp||0) * 0.002) * 8;
        let grad = this.ctx.createRadialGradient(ax, ay, 10, ax, ay, 90 + pulse);
        grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        this.ctx.fillStyle = grad;
        this.ctx.beginPath(); this.ctx.arc(ax, ay, 90 + pulse, 0, Math.PI*2); this.ctx.fill();

        if (wolf) {
            let wx = wolf.x * CELL_SIZE + CELL_SIZE/2;
            let wy = wolf.y * CELL_SIZE + CELL_SIZE/2;
            let wPulse = Math.sin((timestamp||0) * 0.003) * 5;
            let wGrad = this.ctx.createRadialGradient(wx, wy, 5, wx, wy, 50 + wPulse);
            wGrad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
            wGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            this.ctx.fillStyle = wGrad;
            this.ctx.beginPath(); this.ctx.arc(wx, wy, 50 + wPulse, 0, Math.PI*2); this.ctx.fill();
        }

        this.ctx.restore();
    }
}
