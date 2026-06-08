// js/renderer.js
import { WORLD_WIDTH, WORLD_HEIGHT, CELL_SIZE, RESOURCES } from './world.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        // Pre-generar un patrón de ruido estático para el pasto (para optimizar)
        this.grassPattern = this.createGrassPattern();
    }

    createGrassPattern() {
        const pCanvas = document.createElement('canvas');
        pCanvas.width = 100;
        pCanvas.height = 100;
        const pCtx = pCanvas.getContext('2d');
        
        pCtx.fillStyle = '#4ade80'; // Base verde
        pCtx.fillRect(0, 0, 100, 100);
        
        // Dibujar pequeñas "briznas" de pasto
        for(let i=0; i<300; i++) {
            let x = Math.random() * 100;
            let y = Math.random() * 100;
            pCtx.fillStyle = Math.random() > 0.5 ? '#22c55e' : '#16a34a';
            pCtx.fillRect(x, y, 2, Math.random() * 4 + 2);
        }
        return pCtx.createPattern(pCanvas, 'repeat');
    }

    draw(world, agent, enemies, wolf = null, isEclipse = false, timestamp = 0) {
        // Fondo base (pasto)
        this.ctx.fillStyle = this.grassPattern;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        
        // Primero dibujamos el terreno base (agua) y puentes
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            for (let x = 0; x < WORLD_WIDTH; x++) {
                let cell = world.getCell(x, y);
                if (cell && cell.type === RESOURCES.WATER) {
                    this.drawWater(x, y, timestamp);
                } else if (cell && cell.type === RESOURCES.BRIDGE) {
                    this.drawWater(x, y, timestamp);
                    this.drawBridge(x, y);
                }
            }
        }

        // Activamos las sombras para los elementos elevados
        this.ctx.shadowColor = 'rgba(0,0,0,0.4)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 4;

        // Dibujar recursos y construcciones
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

                switch(cell.type) {
                    case RESOURCES.FOOD: this.drawApple(x, y); break;
                    case RESOURCES.WOOD: this.drawTree(x, y); break;
                    case RESOURCES.ROCK: this.drawRock(x, y); break;
                    case RESOURCES.HOUSE: 
                        if (!isAgentHome) this.drawHouse(x, y, cell.capacity); 
                        break;
                    case RESOURCES.BOOK: this.drawBook(x, y, timestamp); break;
                    case RESOURCES.TELESCOPE: this.drawTelescope(x, y); break;
                    case RESOURCES.WALL: this.drawWall(x, y, cell.capacity); break;
                }

                // Dibujar capacidad restante de vida del recurso
                if (cell.type !== RESOURCES.HOUSE && cell.type !== RESOURCES.EMPTY && cell.type !== RESOURCES.BRIDGE && cell.type !== RESOURCES.WATER && cell.type !== RESOURCES.WALL && cell.capacity > 0) {
                    this.drawResourceDots(x, y, cell.capacity);
                }
            }
        }

        // Casa grande del Agente
        if (agent.home) {
            let hx = agent.home.x;
            let hy = agent.home.y;
            this.drawBigHouse(hx, hy);
        }

        // Entidades (Enemigos, Lobo, Agente)
        if (enemies) {
            for (let e of enemies) {
                this.drawEntity(e, 'enemy', timestamp);
            }
        }

        if (wolf) {
            this.drawEntity(wolf, 'wolf', timestamp);
        }

        this.drawEntity(agent, 'agent', timestamp);

        this.ctx.restore();

        // Eclipse y luces
        if (isEclipse) {
            this.drawEclipseOverlay(agent, wolf, timestamp);
        }
    }

    drawWater(x, y, timestamp) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        
        let timeOffset = timestamp ? timestamp * 0.002 : 0;
        let wave = Math.sin(x + y + timeOffset) * 2; 
        
        this.ctx.save();
        this.ctx.shadowColor = 'transparent';
        
        this.ctx.fillStyle = '#0ea5e9'; 
        this.ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        
        this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
        this.ctx.fillRect(px + CELL_SIZE/4, py + CELL_SIZE/4 + wave, CELL_SIZE/2, 2);
        this.ctx.fillRect(px + CELL_SIZE/2, py + CELL_SIZE/2 - wave, CELL_SIZE/3, 2);
        
        this.ctx.restore();
    }

    drawApple(x, y) {
        let cx = x * CELL_SIZE + CELL_SIZE / 2;
        let cy = y * CELL_SIZE + CELL_SIZE / 2;
        this.ctx.fillStyle = '#ef4444';
        this.ctx.beginPath(); this.ctx.arc(cx, cy + 2, 6, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.fillStyle = '#16a34a';
        this.ctx.beginPath(); this.ctx.ellipse(cx + 4, cy - 4, 4, 2, Math.PI / 4, 0, Math.PI * 2); this.ctx.fill();
    }

    drawTree(x, y) {
        let cx = x * CELL_SIZE + CELL_SIZE / 2;
        let cy = y * CELL_SIZE + CELL_SIZE / 2;
        this.ctx.fillStyle = '#78350f';
        this.ctx.fillRect(cx - 3, cy, 6, 10);
        this.ctx.fillStyle = '#15803d';
        this.ctx.beginPath(); this.ctx.arc(cx, cy - 6, 8, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.beginPath(); this.ctx.arc(cx - 6, cy - 2, 7, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.beginPath(); this.ctx.arc(cx + 6, cy - 2, 7, 0, Math.PI * 2); this.ctx.fill();
    }

    drawRock(x, y) {
        let cx = x * CELL_SIZE + CELL_SIZE / 2;
        let cy = y * CELL_SIZE + CELL_SIZE / 2;
        this.ctx.fillStyle = '#64748b';
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 8, cy + 6); this.ctx.lineTo(cx - 5, cy - 4); this.ctx.lineTo(cx + 2, cy - 8);
        this.ctx.lineTo(cx + 9, cy - 2); this.ctx.lineTo(cx + 7, cy + 8); this.ctx.closePath(); this.ctx.fill();
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.beginPath();
        this.ctx.moveTo(cx - 5, cy + 4); this.ctx.lineTo(cx - 2, cy - 2); this.ctx.lineTo(cx + 4, cy - 2);
        this.ctx.closePath(); this.ctx.fill();
    }

    drawBridge(x, y) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        this.ctx.fillStyle = '#92400e';
        this.ctx.fillRect(px + 2, py + 4, CELL_SIZE - 4, CELL_SIZE - 8);
        this.ctx.fillStyle = '#78350f';
        for(let i=1; i<4; i++) {
            this.ctx.fillRect(px + 2 + (i*CELL_SIZE/4) - 2, py + 4, 2, CELL_SIZE - 8);
        }
    }

    drawHouse(x, y, hp) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        this.ctx.fillStyle = '#d97706';
        this.ctx.fillRect(px + 4, py + 10, CELL_SIZE - 8, CELL_SIZE - 12);
        this.ctx.fillStyle = '#b91c1c';
        this.ctx.beginPath();
        this.ctx.moveTo(px + 2, py + 10); this.ctx.lineTo(px + CELL_SIZE / 2, py + 2); this.ctx.lineTo(px + CELL_SIZE - 2, py + 10);
        this.ctx.closePath(); this.ctx.fill();
        this.ctx.fillStyle = '#78350f';
        this.ctx.fillRect(px + CELL_SIZE / 2 - 3, py + CELL_SIZE - 10, 6, 8);
        if (hp < 10) {
            this.ctx.save();
            this.ctx.shadowColor = 'transparent';
            let cx = px + CELL_SIZE / 2;
            this.ctx.fillStyle = '#475569'; this.ctx.fillRect(cx - 10, py + CELL_SIZE - 6, 20, 4);
            this.ctx.fillStyle = '#22c55e'; this.ctx.fillRect(cx - 10, py + CELL_SIZE - 6, 2 * hp, 4);
            this.ctx.restore();
        }
    }

    drawBigHouse(x, y) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        let w = CELL_SIZE * 2;
        let h = CELL_SIZE * 2;

        this.ctx.fillStyle = '#d97706';
        this.ctx.fillRect(px + 6, py + 20, w - 12, h - 24);
        
        this.ctx.fillStyle = '#b91c1c';
        this.ctx.beginPath();
        this.ctx.moveTo(px + 2, py + 20);
        this.ctx.lineTo(px + w / 2, py + 4);
        this.ctx.lineTo(px + w - 2, py + 20);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Ventana redonda
        this.ctx.fillStyle = '#0ea5e9';
        this.ctx.beginPath(); this.ctx.arc(px + w / 2, py + 18, 5, 0, Math.PI*2); this.ctx.fill();

        this.ctx.fillStyle = '#78350f';
        this.ctx.fillRect(px + w / 2 - 5, py + h - 18, 10, 14);
    }

    drawBook(x, y, timestamp) {
        let cx = x * CELL_SIZE + CELL_SIZE / 2;
        let cy = y * CELL_SIZE + CELL_SIZE / 2;
        
        let t = timestamp ? timestamp * 0.003 : 0;
        let hover = Math.sin(t) * 3; 

        this.ctx.save();
        this.ctx.shadowColor = '#eab308';
        this.ctx.shadowBlur = 15;
        this.ctx.translate(cx, cy + hover);

        // Tapas del libro abierto
        this.ctx.fillStyle = '#431407'; 
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0); this.ctx.lineTo(-10, -5); this.ctx.lineTo(-10, 8); this.ctx.lineTo(0, 12);
        this.ctx.closePath(); this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0); this.ctx.lineTo(10, -5); this.ctx.lineTo(10, 8); this.ctx.lineTo(0, 12);
        this.ctx.closePath(); this.ctx.fill();

        // Hojas
        this.ctx.fillStyle = '#fef08a'; 
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0); this.ctx.lineTo(-8, -4); this.ctx.lineTo(-8, 7); this.ctx.lineTo(0, 11);
        this.ctx.closePath(); this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0); this.ctx.lineTo(8, -4); this.ctx.lineTo(8, 7); this.ctx.lineTo(0, 11);
        this.ctx.closePath(); this.ctx.fill();
        
        // Marca
        this.ctx.fillStyle = '#eab308';
        this.ctx.fillRect(-2, 0, 4, 12);
        
        this.ctx.restore();
    }

    drawTelescope(x, y) {
        let cx = x * CELL_SIZE + CELL_SIZE / 2;
        let cy = y * CELL_SIZE + CELL_SIZE / 2;
        
        this.ctx.save();
        this.ctx.translate(cx, cy);

        // Trípode
        this.ctx.strokeStyle = '#451a03';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath(); this.ctx.moveTo(0, 5); this.ctx.lineTo(-5, 12); this.ctx.stroke();
        this.ctx.beginPath(); this.ctx.moveTo(0, 5); this.ctx.lineTo(5, 12); this.ctx.stroke();

        // Tubo
        this.ctx.fillStyle = '#f59e0b';
        this.ctx.rotate(-Math.PI / 6);
        this.ctx.fillRect(-8, -3, 16, 6);
        // Lente
        this.ctx.fillStyle = '#0ea5e9';
        this.ctx.fillRect(6, -2, 3, 4);

        this.ctx.restore();
    }

    drawWall(x, y, hp) {
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        this.ctx.fillStyle = '#475569';
        this.ctx.fillRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        
        this.ctx.strokeStyle = '#1e293b';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(px+2, py + CELL_SIZE/2); this.ctx.lineTo(px+CELL_SIZE-2, py+CELL_SIZE/2);
        this.ctx.moveTo(px+CELL_SIZE/2, py+2); this.ctx.lineTo(px+CELL_SIZE/2, py+CELL_SIZE/2);
        this.ctx.moveTo(px+CELL_SIZE/4, py+CELL_SIZE/2); this.ctx.lineTo(px+CELL_SIZE/4, py+CELL_SIZE-2);
        this.ctx.moveTo(px+CELL_SIZE*0.75, py+CELL_SIZE/2); this.ctx.lineTo(px+CELL_SIZE*0.75, py+CELL_SIZE-2);
        this.ctx.stroke();
    }

    drawResourceDots(x, y, capacity) {
        this.ctx.save();
        this.ctx.shadowColor = 'transparent';
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;
        let cx = px + CELL_SIZE / 2;
        let dotRadius = 2;
        let startX = cx - (capacity * 6) / 2 + 3;
        for (let i = 0; i < capacity; i++) {
            this.ctx.fillStyle = '#f8fafc';
            this.ctx.beginPath();
            this.ctx.arc(startX + i * 6, py + CELL_SIZE - 4, dotRadius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
    }

    drawEntity(entity, type, timestamp) {
        if (type !== 'agent' && entity.hp <= 0) return;

        let cx = entity.x * CELL_SIZE + CELL_SIZE / 2;
        let cy = entity.y * CELL_SIZE + CELL_SIZE / 2;
        
        let t = timestamp || 0;
        let breathe = Math.sin(t * 0.005) * 1.5;

        this.ctx.save();
        this.ctx.translate(cx, cy);
        
        if (entity.isAttacking) {
            this.ctx.save();
            let swing = Math.sin(t * 0.03) * 0.5;
            this.ctx.rotate(Math.PI / 4 + swing);
            if (type === 'wolf') {
                this.ctx.fillStyle = '#3b82f6';
                this.ctx.beginPath(); this.ctx.arc(8, -8, 6, 0, Math.PI*2); this.ctx.fill();
            } else {
                this.ctx.fillStyle = '#9ca3af'; 
                this.ctx.fillRect(6, -10, 4, 12);
                this.ctx.fillStyle = '#b45309'; 
                this.ctx.fillRect(6, 2, 4, 6);
            }
            this.ctx.restore();
        }

        let bodyColor, limbColor, hpColor;
        if (type === 'agent') {
            bodyColor = '#f8fafc'; limbColor = '#cbd5e1'; 
        } else if (type === 'enemy') {
            bodyColor = '#a855f7'; limbColor = '#7e22ce'; hpColor = '#22c55e';
        } else if (type === 'wolf') {
            bodyColor = '#94a3b8'; limbColor = '#64748b'; hpColor = '#3b82f6';
        }

        // Extremidades
        this.ctx.fillStyle = limbColor;
        let limbRadius = 3;
        
        if (type === 'wolf') {
            let tailSwing = Math.sin(t * 0.01) * 2;
            this.ctx.beginPath(); this.ctx.ellipse(-10, 2 + tailSwing, 4, 2, Math.PI/4, 0, Math.PI*2); this.ctx.fill();
            
            this.ctx.beginPath(); this.ctx.arc(-4, 6 + breathe*0.2, limbRadius, 0, Math.PI*2); this.ctx.fill();
            this.ctx.beginPath(); this.ctx.arc(4, 6 - breathe*0.2, limbRadius, 0, Math.PI*2); this.ctx.fill();
            this.ctx.beginPath(); this.ctx.arc(-8, 8, 2, 0, Math.PI*2); this.ctx.fill();
            this.ctx.beginPath(); this.ctx.arc(8, 8, 2, 0, Math.PI*2); this.ctx.fill();
            
            this.ctx.beginPath(); this.ctx.moveTo(-5, -6); this.ctx.lineTo(-8, -12); this.ctx.lineTo(-2, -8); this.ctx.fill();
            this.ctx.beginPath(); this.ctx.moveTo(5, -6); this.ctx.lineTo(8, -12); this.ctx.lineTo(2, -8); this.ctx.fill();
        } else {
            this.ctx.beginPath(); this.ctx.arc(-5, 8 + breathe*0.2, limbRadius, 0, Math.PI*2); this.ctx.fill();
            this.ctx.beginPath(); this.ctx.arc(5, 8 - breathe*0.2, limbRadius, 0, Math.PI*2); this.ctx.fill();
            this.ctx.beginPath(); this.ctx.arc(-8, 2, limbRadius, 0, Math.PI*2); this.ctx.fill();
            this.ctx.beginPath(); this.ctx.arc(8, 2, limbRadius, 0, Math.PI*2); this.ctx.fill();
        }

        // Cuerpo principal
        this.ctx.fillStyle = bodyColor;
        this.ctx.beginPath();
        if (type === 'wolf') {
            this.ctx.ellipse(0, 0 + breathe/2, CELL_SIZE / 2.2, CELL_SIZE / 3, 0, 0, Math.PI * 2);
        } else {
            this.ctx.ellipse(0, 0 + breathe/2, CELL_SIZE / 2.5, (CELL_SIZE / 2.5) + breathe/2, 0, 0, Math.PI * 2);
        }
        this.ctx.fill();

        // Rostro y Barra de vida
        this.ctx.fillStyle = '#0f172a';
        this.ctx.strokeStyle = '#0f172a';
        this.ctx.lineWidth = 1.5;
        this.ctx.shadowColor = 'transparent';

        if (type === 'agent') {
            this.drawAgentFace(entity, 0, breathe/2);
        } else if (type === 'enemy') {
            this.drawEnemyFace(entity, 0, breathe/2);
            this.drawHpBar(entity.hp, 4, hpColor);
        } else if (type === 'wolf') {
            this.drawWolfFace(0, breathe/2);
            this.drawHpBar(entity.hp, 10, hpColor);
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
    }

    drawAgentFace(agent, cx, cy) {
        if (agent.emotion === 'KO') {
            this.ctx.beginPath(); this.ctx.moveTo(cx - 6, cy - 6); this.ctx.lineTo(cx - 2, cy - 2); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(cx - 2, cy - 6); this.ctx.lineTo(cx - 6, cy - 2); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(cx + 2, cy - 6); this.ctx.lineTo(cx + 6, cy - 2); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(cx + 6, cy - 6); this.ctx.lineTo(cx + 2, cy - 2); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.arc(cx, cy + 3, 2, 0, Math.PI * 2); this.ctx.stroke();
        } else if (agent.emotion === 'HAPPY') {
            this.ctx.beginPath(); this.ctx.arc(cx - 4, cy - 4, 1.5, 0, Math.PI * 2); this.ctx.arc(cx + 4, cy - 4, 1.5, 0, Math.PI * 2); this.ctx.fill();
            this.ctx.beginPath(); this.ctx.arc(cx, cy + 2, 4, 0, Math.PI); this.ctx.stroke();
        } else if (agent.emotion === 'SAD') {
            this.ctx.fillRect(cx - 5, cy - 5, 2, 2); this.ctx.fillRect(cx + 3, cy - 5, 2, 2);
            this.ctx.beginPath(); this.ctx.arc(cx, cy + 4, 4, Math.PI, 0); this.ctx.stroke();
        } else if (agent.emotion === 'ANGRY') {
            this.ctx.beginPath(); this.ctx.moveTo(cx - 6, cy - 6); this.ctx.lineTo(cx - 2, cy - 4); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(cx + 6, cy - 6); this.ctx.lineTo(cx + 2, cy - 4); this.ctx.stroke();
            this.ctx.fillRect(cx - 5, cy - 3, 2, 2); this.ctx.fillRect(cx + 3, cy - 3, 2, 2);
            this.ctx.beginPath(); this.ctx.moveTo(cx - 3, cy + 4); this.ctx.lineTo(cx + 3, cy + 4); this.ctx.stroke();
        } else {
            this.ctx.fillRect(cx - 5, cy - 5, 2, 2); this.ctx.fillRect(cx + 3, cy - 5, 2, 2);
            this.ctx.beginPath(); this.ctx.moveTo(cx - 2, cy + 3); this.ctx.lineTo(cx + 2, cy + 3); this.ctx.stroke();
        }
    }

    drawEnemyFace(enemy, cx, cy) {
        if (enemy.hurtTimer > 0) {
            this.ctx.beginPath(); this.ctx.moveTo(cx - 6, cy - 6); this.ctx.lineTo(cx - 2, cy - 2); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(cx - 2, cy - 6); this.ctx.lineTo(cx - 6, cy - 2); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(cx + 2, cy - 6); this.ctx.lineTo(cx + 6, cy - 2); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(cx + 6, cy - 6); this.ctx.lineTo(cx + 2, cy - 2); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(cx - 3, cy + 4); this.ctx.lineTo(cx + 3, cy + 4); this.ctx.stroke();
        } else {
            this.ctx.beginPath(); this.ctx.moveTo(cx - 6, cy - 6); this.ctx.lineTo(cx - 2, cy - 4); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(cx + 6, cy - 6); this.ctx.lineTo(cx + 2, cy - 4); this.ctx.stroke();
            this.ctx.fillRect(cx - 5, cy - 3, 2, 2); this.ctx.fillRect(cx + 3, cy - 3, 2, 2);
            this.ctx.beginPath(); this.ctx.moveTo(cx - 3, cy + 4); this.ctx.lineTo(cx + 3, cy + 4); this.ctx.stroke();
        }
    }

    drawWolfFace(cx, cy) {
        this.ctx.beginPath(); this.ctx.arc(cx, cy + 4, 2, 0, Math.PI*2); this.ctx.fill();
        this.ctx.fillRect(cx - 5, cy - 2, 2, 2); this.ctx.fillRect(cx + 3, cy - 2, 2, 2);
    }

    drawEclipseOverlay(agent, wolf, timestamp) {
        this.ctx.save();
        
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.globalCompositeOperation = 'destination-out';
        
        let ax = agent.x * CELL_SIZE + CELL_SIZE/2;
        let ay = agent.y * CELL_SIZE + CELL_SIZE/2;
        let pulse = Math.sin((timestamp||0) * 0.002) * 5;
        let grad = this.ctx.createRadialGradient(ax, ay, 10, ax, ay, 80 + pulse);
        grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        this.ctx.fillStyle = grad;
        this.ctx.beginPath(); this.ctx.arc(ax, ay, 80 + pulse, 0, Math.PI*2); this.ctx.fill();

        if (wolf) {
            let wx = wolf.x * CELL_SIZE + CELL_SIZE/2;
            let wy = wolf.y * CELL_SIZE + CELL_SIZE/2;
            let wPulse = Math.sin((timestamp||0) * 0.003) * 3;
            let wGrad = this.ctx.createRadialGradient(wx, wy, 5, wx, wy, 40 + wPulse);
            wGrad.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
            wGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            this.ctx.fillStyle = wGrad;
            this.ctx.beginPath(); this.ctx.arc(wx, wy, 40 + wPulse, 0, Math.PI*2); this.ctx.fill();
        }

        this.ctx.restore();
    }
}
