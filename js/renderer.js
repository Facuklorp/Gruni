// js/renderer.js
import { WORLD_WIDTH, WORLD_HEIGHT, CELL_SIZE, RESOURCES } from './world.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.grassPattern = this.createGrassPattern();
    }

    createGrassPattern() {
        const pCanvas = document.createElement('canvas');
        pCanvas.width = 120;
        pCanvas.height = 120;
        const pCtx = pCanvas.getContext('2d');
        
        // Base verde suave y premium
        pCtx.fillStyle = '#86efac'; 
        pCtx.fillRect(0, 0, 120, 120);
        
        // Manchas más suaves
        for(let i=0; i<80; i++) {
            let x = Math.random() * 120;
            let y = Math.random() * 120;
            let r = Math.random() * 8 + 4;
            pCtx.fillStyle = Math.random() > 0.5 ? 'rgba(74, 222, 128, 0.4)' : 'rgba(134, 239, 172, 0.6)';
            pCtx.beginPath();
            pCtx.arc(x, y, r, 0, Math.PI * 2);
            pCtx.fill();
        }
        return pCtx.createPattern(pCanvas, 'repeat');
    }

    draw(world, agent, enemies, wolf = null, isEclipse = false, timestamp = 0) {
        this.cameraX = 0;
        this.cameraY = 0;
        if (agent) {
            let targetX = agent.x * CELL_SIZE + CELL_SIZE / 2;
            let targetY = agent.y * CELL_SIZE + CELL_SIZE / 2;
            this.cameraX = targetX - this.canvas.width / 2;
            this.cameraY = targetY - this.canvas.height / 2;
            
            let mapPxWidth = WORLD_WIDTH * CELL_SIZE;
            let mapPxHeight = WORLD_HEIGHT * CELL_SIZE;
            
            this.cameraX = Math.max(0, Math.min(this.cameraX, mapPxWidth - this.canvas.width));
            this.cameraY = Math.max(0, Math.min(this.cameraY, mapPxHeight - this.canvas.height));
        }

        this.ctx.save();
        this.ctx.translate(-this.cameraX, -this.cameraY);

        // Fondo base (pasto) - Anclado al mundo
        this.ctx.fillStyle = this.grassPattern;
        this.ctx.fillRect(this.cameraX, this.cameraY, this.canvas.width, this.canvas.height);

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
        
        let t = timestamp ? timestamp * 0.001 : 0;
        
        this.ctx.fillStyle = '#38bdf8'; // Celeste vibrante
        
        // Sobredibujamos un poco (1 pixel extra) para evitar líneas entre celdas
        this.ctx.fillRect(px - 1, py - 1, CELL_SIZE + 2, CELL_SIZE + 2);
        
        // Oleaje sutil
        this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
        let wave = Math.sin(x*0.5 + y*0.5 + t) * 3;
        this.ctx.fillRect(px + CELL_SIZE/4, py + CELL_SIZE/2 + wave, CELL_SIZE/2, 2);

        // Orillas (Si el vecino no es agua, dibujamos un borde clarito)
        this.ctx.fillStyle = '#bae6fd'; // Espuma
        let isWater = (dx, dy) => {
            let c = world.getCell(x + dx, y + dy);
            return c && (c.type === RESOURCES.WATER || c.type === RESOURCES.BRIDGE);
        };

        if (!isWater(0, -1)) this.ctx.fillRect(px, py, CELL_SIZE, 3); // Arriba
        if (!isWater(0, 1)) this.ctx.fillRect(px, py + CELL_SIZE - 3, CELL_SIZE, 3); // Abajo
        if (!isWater(-1, 0)) this.ctx.fillRect(px, py, 3, CELL_SIZE); // Izquierda
        if (!isWater(1, 0)) this.ctx.fillRect(px + CELL_SIZE - 3, py, 3, CELL_SIZE); // Derecha
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
        
        this.drawShadow(cx, cy + 12, 14, 6);

        // Tronco
        this.ctx.fillStyle = '#78350f';
        this.ctx.fillRect(cx - 4, cy, 8, 14);

        // Copa del árbol sobre escalada para ocultar grilla
        this.ctx.fillStyle = '#166534'; // Oscuro fondo
        this.ctx.beginPath(); this.ctx.arc(cx, cy - 8, 16, 0, Math.PI * 2); this.ctx.fill();
        
        this.ctx.fillStyle = '#22c55e'; // Claro medio
        this.ctx.beginPath(); this.ctx.arc(cx - 6, cy - 12, 12, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.beginPath(); this.ctx.arc(cx + 6, cy - 12, 12, 0, Math.PI * 2); this.ctx.fill();
        
        this.ctx.fillStyle = '#4ade80'; // Highlight superior
        this.ctx.beginPath(); this.ctx.arc(cx, cy - 18, 10, 0, Math.PI * 2); this.ctx.fill();
    }

    drawRock(x, y) {
        let cx = x * CELL_SIZE + CELL_SIZE / 2;
        let cy = y * CELL_SIZE + CELL_SIZE / 2;
        
        this.drawShadow(cx, cy + 10, 12, 5);

        this.ctx.fillStyle = '#475569';
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 12, cy + 8); this.ctx.lineTo(cx - 6, cy - 6); this.ctx.lineTo(cx + 4, cy - 12);
        this.ctx.lineTo(cx + 14, cy - 2); this.ctx.lineTo(cx + 10, cy + 10); this.ctx.closePath(); this.ctx.fill();
        
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 8, cy + 6); this.ctx.lineTo(cx - 4, cy - 4); this.ctx.lineTo(cx + 6, cy - 4);
        this.ctx.closePath(); this.ctx.fill();
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
        this.ctx.lineWidth = 3;
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

    drawEntity(entity, type, timestamp) {
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

        // Helper to draw segmented parts with thick stroke
        let drawPart = (pathFn, fillStyle) => {
            this.ctx.beginPath();
            pathFn();
            this.ctx.fillStyle = fillStyle;
            this.ctx.fill();
            this.ctx.lineWidth = 2.5;
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
            
        } else {
            // Humanoids (Agent / Enemy)
            let isAgent = type === 'agent';
            let skinColor = isAgent ? '#fef08a' : '#d8b4fe'; // Piel clara elfa
            let shirtColor = isAgent ? '#3b82f6' : '#7e22ce'; // Azul liso enterizo
            let pantsColor = isAgent ? '#1e3a8a' : '#4c1d95'; 
            let hairColor = isAgent ? '#3b82f6' : '#000000'; // Pelo azul
            
            let legSwing = entity.isAttacking ? 0 : walkCycle * 4;

            // Arma atrás (si ataca)
            if (entity.isAttacking) {
                this.ctx.save();
                let swing = Math.sin(t * 0.03) * 0.5;
                this.ctx.rotate(Math.PI / 4 + swing);
                drawPart(() => { this.ctx.rect(12, -15, 4, 16); }, '#cbd5e1'); // Espada
                drawPart(() => { this.ctx.rect(10, -1, 8, 3); }, '#f59e0b'); // Guarda
                drawPart(() => { this.ctx.rect(12, 2, 4, 6); }, '#78350f'); // Mango
                this.ctx.restore();
            }

            // Pierna Izquierda (Atrás)
            drawPart(() => { this.ctx.roundRect(-6, 6 - legSwing, 5, 8, 2); }, pantsColor);
            
            // Brazo Izquierdo (Atrás)
            drawPart(() => { this.ctx.roundRect(-8, 0 + legSwing, 4, 7, 2); }, skinColor);

            // Torso (Enterizo Azul liso)
            drawPart(() => { 
                this.ctx.moveTo(-7, -4 + breathe);
                this.ctx.lineTo(7, -4 + breathe);
                this.ctx.lineTo(6, 8 + breathe);
                this.ctx.lineTo(-6, 8 + breathe);
                this.ctx.closePath();
            }, shirtColor);

            if (isAgent) {
                // Orejas de elfo (Atrás de la cabeza)
                drawPart(() => {
                    this.ctx.moveTo(-7, -12 + breathe);
                    this.ctx.lineTo(-14, -14 + breathe);
                    this.ctx.lineTo(-7, -9 + breathe);
                    this.ctx.closePath();
                }, skinColor);
                drawPart(() => {
                    this.ctx.moveTo(7, -12 + breathe);
                    this.ctx.lineTo(14, -14 + breathe);
                    this.ctx.lineTo(7, -9 + breathe);
                    this.ctx.closePath();
                }, skinColor);
            }

            // Cabeza
            drawPart(() => { this.ctx.arc(0, -12 + breathe, 8, 0, Math.PI*2); }, skinColor);

            // Pelo / Sombrero / Cuernos
            if (isAgent) {
                // Pelo azul asomando
                drawPart(() => {
                    this.ctx.arc(0, -14 + breathe, 8, Math.PI, 0);
                    this.ctx.lineTo(6, -10 + breathe);
                    this.ctx.lineTo(4, -8 + breathe);
                    this.ctx.lineTo(0, -10 + breathe);
                    this.ctx.lineTo(-4, -8 + breathe);
                    this.ctx.lineTo(-6, -10 + breathe);
                    this.ctx.closePath();
                }, hairColor);

                // Sombrero de Paja
                drawPart(() => { this.ctx.ellipse(0, -16 + breathe, 14, 4, 0, 0, Math.PI*2); }, '#fde047'); // Ala ancha
                drawPart(() => { this.ctx.arc(0, -17 + breathe, 7, Math.PI, 0); }, '#facc15'); // Copa
            } else {
                // Cuernos enemigo
                drawPart(() => { this.ctx.moveTo(-5, -18 + breathe); this.ctx.lineTo(-8, -24 + breathe); this.ctx.lineTo(-2, -18 + breathe); this.ctx.closePath(); }, '#f1f5f9');
                drawPart(() => { this.ctx.moveTo(5, -18 + breathe); this.ctx.lineTo(8, -24 + breathe); this.ctx.lineTo(2, -18 + breathe); this.ctx.closePath(); }, '#f1f5f9');
            }

            // Cara (Ojos y boca expresiva)
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = outline;
            
            let drawAnimeEye = (x, y) => {
                this.ctx.fillStyle = outline;
                this.ctx.beginPath(); this.ctx.ellipse(x, y, 1.5, 2.5, 0, 0, Math.PI*2); this.ctx.fill();
                this.ctx.fillStyle = 'white';
                this.ctx.beginPath(); this.ctx.arc(x - 0.5, y - 1, 0.8, 0, Math.PI*2); this.ctx.fill();
            };

            if (entity.hp <= 0 && isAgent) {
                // KO
                this.ctx.beginPath(); this.ctx.moveTo(-5, -13+breathe); this.ctx.lineTo(-1, -9+breathe); this.ctx.moveTo(-1, -13+breathe); this.ctx.lineTo(-5, -9+breathe); this.ctx.stroke();
                this.ctx.beginPath(); this.ctx.moveTo(1, -13+breathe); this.ctx.lineTo(5, -9+breathe); this.ctx.moveTo(5, -13+breathe); this.ctx.lineTo(1, -9+breathe); this.ctx.stroke();
            } else {
                if (isAgent) {
                    if (entity.emotion === 'HAPPY') {
                        // Ojos felices cerrados
                        this.ctx.beginPath(); this.ctx.arc(-3, -11+breathe, 2, Math.PI, 0); this.ctx.stroke();
                        this.ctx.beginPath(); this.ctx.arc(3, -11+breathe, 2, Math.PI, 0); this.ctx.stroke();
                        // Boca sonriente grande
                        this.ctx.fillStyle = '#ef4444';
                        this.ctx.beginPath(); this.ctx.arc(0, -7+breathe, 3, 0, Math.PI); this.ctx.fill(); this.ctx.stroke();
                    } else if (entity.emotion === 'SAD') {
                        drawAnimeEye(-3, -11+breathe);
                        drawAnimeEye(3, -11+breathe);
                        // Cejas tristes
                        this.ctx.beginPath(); this.ctx.moveTo(-5, -14+breathe); this.ctx.lineTo(-2, -15+breathe); this.ctx.stroke();
                        this.ctx.beginPath(); this.ctx.moveTo(5, -14+breathe); this.ctx.lineTo(2, -15+breathe); this.ctx.stroke();
                        // Boca triste
                        this.ctx.beginPath(); this.ctx.arc(0, -6+breathe, 2, Math.PI, 0); this.ctx.stroke();
                    } else if (entity.emotion === 'ANGRY') {
                        drawAnimeEye(-3, -11+breathe);
                        drawAnimeEye(3, -11+breathe);
                        // Cejas enojadas
                        this.ctx.beginPath(); this.ctx.moveTo(-5, -15+breathe); this.ctx.lineTo(-1, -13+breathe); this.ctx.stroke();
                        this.ctx.beginPath(); this.ctx.moveTo(5, -15+breathe); this.ctx.lineTo(1, -13+breathe); this.ctx.stroke();
                        // Boca enojada
                        this.ctx.beginPath(); this.ctx.moveTo(-2, -7+breathe); this.ctx.lineTo(2, -7+breathe); this.ctx.stroke();
                    } else {
                        // Neutral (Anime)
                        drawAnimeEye(-3, -11+breathe);
                        drawAnimeEye(3, -11+breathe);
                        // Boca neutral
                        this.ctx.beginPath(); this.ctx.arc(0, -8+breathe, 1.5, 0, Math.PI); this.ctx.stroke();
                    }
                } else {
                    // Enemy Face
                    this.ctx.beginPath(); this.ctx.moveTo(-6, -14+breathe); this.ctx.lineTo(-2, -12+breathe); this.ctx.stroke();
                    this.ctx.beginPath(); this.ctx.moveTo(6, -14+breathe); this.ctx.lineTo(2, -12+breathe); this.ctx.stroke();
                    this.ctx.fillStyle = outline;
                    this.ctx.beginPath(); this.ctx.arc(-3, -11+breathe, 1.5, 0, Math.PI*2); this.ctx.fill();
                    this.ctx.beginPath(); this.ctx.arc(3, -11+breathe, 1.5, 0, Math.PI*2); this.ctx.fill();
                }
            }

            // Pierna Derecha (Frente)
            drawPart(() => { this.ctx.roundRect(1, 6 + legSwing, 5, 8, 2); }, pantsColor);
            
            // Brazo Derecho (Frente)
            drawPart(() => { this.ctx.roundRect(4, 0 - legSwing, 4, 7, 2); }, skinColor);

            if (!isAgent) {
                this.ctx.translate(0, -28);
                this.drawHpBar(entity.hp, 4, '#22c55e');
            }
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
        this.ctx.fillRect(this.cameraX, this.cameraY, this.canvas.width, this.canvas.height);

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
