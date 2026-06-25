// js/renderer.js — Vista Isométrica
import { WORLD_WIDTH, WORLD_HEIGHT, CELL_SIZE, ZOOM, RESOURCES, BIOMES, ISO_W, ISO_H } from './world.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cameraX = 0;
        this.cameraY = 0;
        this.cameraInitialized = false;
        this.images = null;

        this.ctx.imageSmoothingEnabled = false;
    }

    initImages(images) {
        this.images = images;
    }

    // ─── Proyección isométrica ──────────────────────────────────────────────────
    // Convierte coords de grilla (x, y) a esquina superior-izquierda del rombo
    isoProject(x, y) {
        return {
            sx: (x - y) * (ISO_W / 2),
            sy: (x + y) * (ISO_H / 2)
        };
    }

    // Dibuja un rombo plano (cara superior de un tile isométrico)
    drawDiamond(sx, sy, fillColor, edgeColor = null) {
        const hw = ISO_W / 2;
        const hh = ISO_H / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(sx + hw, sy);          // arriba
        this.ctx.lineTo(sx + ISO_W, sy + hh);  // derecha
        this.ctx.lineTo(sx + hw, sy + ISO_H);  // abajo
        this.ctx.lineTo(sx, sy + hh);          // izquierda
        this.ctx.closePath();
        this.ctx.fillStyle = fillColor;
        this.ctx.fill();
        if (edgeColor) {
            this.ctx.strokeStyle = edgeColor;
            this.ctx.lineWidth = 0.4;
            this.ctx.stroke();
        }
    }

    // Helper: todas las coords útiles de un tile de la grilla
    getIsoBase(x, y) {
        const { sx, sy } = this.isoProject(x, y);
        return {
            sx,
            sy,
            cx:    sx + ISO_W / 2,   // centro horizontal del rombo
            cy:    sy + ISO_H / 2,   // centro vertical del rombo
            baseY: sy + ISO_H / 2    // "piso" donde se apoyan los objetos
        };
    }

    // ─── Draw principal ─────────────────────────────────────────────────────────
    draw(world, agent, enemies, wolf = null, isEclipse = false, timestamp = 0, timeOfDay = 600, particles = null) {
        this.ctx.imageSmoothingEnabled = false;

        const viewW = this.canvas.width  / ZOOM;
        const viewH = this.canvas.height / ZOOM;

        // Cámara isométrica con lerp suave
        if (agent) {
            const { sx, sy } = this.isoProject(agent.x, agent.y);
            const agentIsoX = sx + ISO_W / 2;
            const agentIsoY = sy + ISO_H / 2;
            const desiredX = agentIsoX - viewW / 2;
            const desiredY = agentIsoY - viewH / 2;

            if (!this.cameraInitialized) {
                this.cameraX = desiredX;
                this.cameraY = desiredY;
                this.cameraInitialized = true;
            } else {
                const LERP = 0.1;
                this.cameraX += (desiredX - this.cameraX) * LERP;
                this.cameraY += (desiredY - this.cameraY) * LERP;
            }
        }

        this.ctx.save();
        this.ctx.scale(ZOOM, ZOOM);
        this.ctx.translate(-this.cameraX, -this.cameraY);

        // ── FONDO: rellenar con color arena para eliminar el vacío negro ────────
        // Extendemos tiles de arena MAS ALLÁ de los límites del mundo real
        // para que jamas aparezca el fondo negro en los extremos.
        // Calculamos cuántos tiles extra necesitamos basados en el viewport.
        const EXTRA = Math.ceil(Math.max(this.canvas.width, this.canvas.height) / (ISO_W * ZOOM)) + 4;
        const sumMin = -(EXTRA * 2);
        const sumMax = WORLD_WIDTH + WORLD_HEIGHT - 1 + EXTRA * 2;
        for (let sum = sumMin; sum < sumMax; sum++) {
            const xMin = Math.max(-EXTRA, sum - (WORLD_HEIGHT - 1 + EXTRA));
            const xMax = Math.min(WORLD_WIDTH - 1 + EXTRA, sum + EXTRA);
            for (let x = xMin; x <= xMax; x++) {
                const y = sum - x;
                // Solo dibujar si está FUERA del mundo real (dentro se dibuja en el loop principal)
                if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) continue;

                const { sx, sy } = this.isoProject(x, y);
                const hw = ISO_W / 2;
                const hh = ISO_H / 2;

                // Cara lateral izquierda (extensión)
                this.ctx.fillStyle = '#d4a820';
                this.ctx.beginPath();
                this.ctx.moveTo(sx,      sy + hh);
                this.ctx.lineTo(sx + hw, sy + ISO_H);
                this.ctx.lineTo(sx + hw, sy + ISO_H + 3);
                this.ctx.lineTo(sx,      sy + hh + 3);
                this.ctx.closePath();
                this.ctx.fill();

                // Cara lateral derecha (extensión)
                this.ctx.fillStyle = '#b8901a';
                this.ctx.beginPath();
                this.ctx.moveTo(sx + hw,    sy + ISO_H);
                this.ctx.lineTo(sx + ISO_W, sy + hh);
                this.ctx.lineTo(sx + ISO_W, sy + hh + 3);
                this.ctx.lineTo(sx + hw,    sy + ISO_H + 3);
                this.ctx.closePath();
                this.ctx.fill();

                // Cara superior — imagen ISO de arena si está disponible
                if (this.images) {
                    const ax = x * 0.37;
                    const ay = y * 0.41;
                    const aval = (Math.sin(ax) + Math.sin(ay) + Math.sin(ax * 0.6 + ay * 0.8)) / 3;
                    let aidx = Math.floor((aval + 1) * 1.5);
                    if (aidx < 0) aidx = 0;
                    if (aidx > 2) aidx = 2;
                    const arenaImg = this.images[`arena_iso_${aidx + 1}`];
                    if (arenaImg) {
                        this.ctx.drawImage(arenaImg, sx, sy, ISO_W, ISO_H);
                    } else {
                        this.drawDiamond(sx, sy, '#f9ca24', '#a07a10');
                    }
                } else {
                    this.drawDiamond(sx, sy, '#f9ca24', '#a07a10');
                }
            }
        }

        // ── TERRENO ─────────────────────────────────────────────────────────────
        // Iterar en bandas diagonales (atrás → adelante) para pintor correcto
        for (let sum = 0; sum < WORLD_WIDTH + WORLD_HEIGHT - 1; sum++) {
            const xMin = Math.max(0, sum - WORLD_HEIGHT + 1);
            const xMax = Math.min(WORLD_WIDTH - 1, sum);
            for (let x = xMin; x <= xMax; x++) {
                const y = sum - x;
                const cell = world.getCell(x, y);
                if (!cell) continue;

                const { sx, sy } = this.isoProject(x, y);
                const hw = ISO_W / 2;
                const hh = ISO_H / 2;

                // Determinar colores de bioma
                let topColor, leftColor, rightColor, edgeColor;
                if (cell.biome === BIOMES.GRASS) {
                    leftColor  = '#5a9e42';
                    rightColor = '#4a8a35';
                    edgeColor  = '#3e7a2c';
                    topColor   = '#7cc654'; // fallback
                } else { // SAND
                    leftColor  = '#d4a820';
                    rightColor = '#b8901a';
                    edgeColor  = '#a07a10';
                    topColor   = '#f9ca24'; // fallback
                }

                // Caras laterales (dan profundidad 3D, siempre con color)
                this.ctx.fillStyle = leftColor;
                this.ctx.beginPath();
                this.ctx.moveTo(sx,      sy + hh);
                this.ctx.lineTo(sx + hw, sy + ISO_H);
                this.ctx.lineTo(sx + hw, sy + ISO_H + 3);
                this.ctx.lineTo(sx,      sy + hh + 3);
                this.ctx.closePath();
                this.ctx.fill();

                this.ctx.fillStyle = rightColor;
                this.ctx.beginPath();
                this.ctx.moveTo(sx + hw,    sy + ISO_H);
                this.ctx.lineTo(sx + ISO_W, sy + hh);
                this.ctx.lineTo(sx + ISO_W, sy + hh + 3);
                this.ctx.lineTo(sx + hw,    sy + ISO_H + 3);
                this.ctx.closePath();
                this.ctx.fill();

                // Cara superior: imagen iso si está disponible, sino color sólido
                if (cell.biome === BIOMES.GRASS && this.images) {
                    // Variación orgánica por posición — 4 variantes de pasto
                    const chunkX = Math.floor(x / 2);
                    const chunkY = Math.floor(y / 2);
                    const nx = chunkX * 0.5;
                    const ny = chunkY * 0.5;
                    const val = (Math.sin(nx) + Math.sin(ny) + Math.sin(nx * 0.5 + ny * 0.5)) / 3;
                    let idx = Math.floor((val + 1) * 2);
                    if (idx < 0) idx = 0;
                    if (idx > 3) idx = 3;
                    const isoImg = this.images[`pasto_iso_${idx + 1}`];

                    if (isoImg) {
                        this.ctx.drawImage(isoImg, sx, sy, ISO_W, ISO_H);
                    } else {
                        this.drawDiamond(sx, sy, topColor, edgeColor);
                    }
                } else if (cell.biome === BIOMES.SAND && this.images) {
                    // Variación orgánica por posición — 3 variantes de arena
                    const ax = x * 0.37;
                    const ay = y * 0.41;
                    const aval = (Math.sin(ax) + Math.sin(ay) + Math.sin(ax * 0.6 + ay * 0.8)) / 3;
                    let aidx = Math.floor((aval + 1) * 1.5); // 0, 1, 2
                    if (aidx < 0) aidx = 0;
                    if (aidx > 2) aidx = 2;
                    const arenaImg = this.images[`arena_iso_${aidx + 1}`];

                    if (arenaImg) {
                        this.ctx.drawImage(arenaImg, sx, sy, ISO_W, ISO_H);
                    } else {
                        this.drawDiamond(sx, sy, topColor, edgeColor);
                    }
                } else {
                    this.drawDiamond(sx, sy, topColor, edgeColor);
                }

                // ── AGUA ──────────────────────────────────────────────────────────
                if (cell.type === RESOURCES.WATER || cell.type === RESOURCES.BRIDGE) {
                    const wave = Math.sin(timestamp * 0.002 + x * 0.6 + y * 0.6) * 0.06;

                    // Cara lateral izquierda del agua
                    this.ctx.fillStyle = '#1565a0';
                    this.ctx.beginPath();
                    this.ctx.moveTo(sx,      sy + hh);
                    this.ctx.lineTo(sx + hw, sy + ISO_H);
                    this.ctx.lineTo(sx + hw, sy + ISO_H + 3);
                    this.ctx.lineTo(sx,      sy + hh + 3);
                    this.ctx.closePath();
                    this.ctx.fill();

                    // Cara lateral derecha del agua
                    this.ctx.fillStyle = '#0e4d8a';
                    this.ctx.beginPath();
                    this.ctx.moveTo(sx + hw,    sy + ISO_H);
                    this.ctx.lineTo(sx + ISO_W, sy + hh);
                    this.ctx.lineTo(sx + ISO_W, sy + hh + 3);
                    this.ctx.lineTo(sx + hw,    sy + ISO_H + 3);
                    this.ctx.closePath();
                    this.ctx.fill();

                    // Cara superior del agua (rombo animado)
                    const alpha = (0.88 + wave).toFixed(2);
                    this.drawDiamond(sx, sy, `rgba(28, 130, 210, ${alpha})`, '#1060a8');

                    // Destello
                    const shimX = sx + hw * 0.7 + Math.sin(timestamp * 0.004 + x + y) * 2;
                    const shimY = sy + hh * 0.6;
                    this.ctx.fillStyle = 'rgba(255,255,255,0.22)';
                    this.ctx.beginPath();
                    this.ctx.ellipse(shimX, shimY, 3, 1.2, 0.4, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }

        // ── COLA DE RENDER (objetos + entidades) ────────────────────────────────
        const renderQueue = [];

        for (let y = 0; y < WORLD_HEIGHT; y++) {
            for (let x = 0; x < WORLD_WIDTH; x++) {
                const cell = world.getCell(x, y);
                if (!cell) continue;

                let isAgentHome = false;
                if (agent && agent.home) {
                    if (x >= agent.home.x && x <= agent.home.x + 1 &&
                        y >= agent.home.y && y <= agent.home.y + 1) {
                        isAgentHome = true;
                    }
                }

                if (cell.type !== RESOURCES.EMPTY &&
                    cell.type !== RESOURCES.WATER &&
                    cell.type !== RESOURCES.BRIDGE) {
                    if (cell.type === RESOURCES.HOUSE && isAgentHome) {
                        // Se dibuja como bighouse
                    } else {
                        renderQueue.push({ type: 'resource', x, y, cell });
                    }
                }
            }
        }

        if (agent.home) {
            renderQueue.push({ type: 'bighouse', x: agent.home.x, y: agent.home.y, homeStage: agent.homeStage });
        }
        if (enemies) {
            enemies.forEach(e => renderQueue.push({ type: 'enemy', entity: e, x: e.x, y: e.y }));
        }
        if (wolf) {
            renderQueue.push({ type: 'wolf', entity: wolf, x: wolf.x, y: wolf.y });
        }
        renderQueue.push({ type: 'agent', entity: agent, x: agent.x, y: agent.y });

        // Ordenar por profundidad isométrica: x + y ascendente (atrás → adelante)
        renderQueue.sort((a, b) => {
            let da = a.x + a.y;
            let db = b.x + b.y;
            if (a.type === 'bighouse') da += 1;
            if (b.type === 'bighouse') db += 1;
            if (da !== db) return da - db;
            return a.x - b.x; // desempate por x
        });

        for (const item of renderQueue) {
            if (item.type === 'resource') {
                const cell = item.cell;
                switch (cell.type) {
                    case RESOURCES.FOOD:
                    case RESOURCES.FOOD_EMPTY: this.drawFruitTree(item.x, item.y, cell.type, cell.biome); break;
                    case RESOURCES.WOOD:
                    case RESOURCES.WOOD_EMPTY: this.drawTree(item.x, item.y, cell.type, cell.biome); break;
                    case RESOURCES.BUSH:
                    case RESOURCES.BUSH_EMPTY: this.drawBush(item.x, item.y, cell.type); break;
                    case RESOURCES.ROCK:
                    case RESOURCES.ROCK_EMPTY: this.drawRock(item.x, item.y, cell.type); break;
                    case RESOURCES.HOUSE:      this.drawHouse(item.x, item.y, cell.capacity); break;
                    case RESOURCES.BOOK:       this.drawBook(item.x, item.y, timestamp, world); break;
                    case RESOURCES.TELESCOPE:  this.drawTelescope(item.x, item.y); break;
                    case RESOURCES.WALL:       this.drawWall(item.x, item.y, cell.capacity); break;
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

        // Partículas (en espacio iso)
        if (particles) {
            particles.drawIso(this.ctx, this);
        }

        this.ctx.restore();

        // Iluminación global (día/noche/eclipse)
        this.drawGlobalLighting(timeOfDay, renderQueue, agent, particles, timestamp, isEclipse);
    }

    // ─── Sombra (desactivada, reemplazada por elipse en drawEntity) ─────────────
    drawShadow(cx, cy, width, height) { /* desactivada */ }

    // ─── Árboles ────────────────────────────────────────────────────────────────
    drawFruitTree(x, y, type, biome) {
        const { sx, sy, cx } = this.getIsoBase(x, y);
        const isAlive = type === RESOURCES.FOOD;

        let img = null;
        if (biome === BIOMES.SAND) {
            img = isAlive ? this.images?.arbol_desierto_1 : this.images?.arbol_desierto_2;
        } else {
            img = isAlive ? this.images?.frutal_1 : this.images?.frutal_2;
        }

        if (img) {
            const w = 40, h = 48;
            this.ctx.drawImage(img, cx - w / 2, sy - h + ISO_H + 2, w, h);
        } else {
            // Tronco
            this.ctx.fillStyle = '#92400e';
            this.ctx.fillRect(cx - 1.5, sy - 8, 3, 10);
            // Copa
            this.ctx.fillStyle = isAlive ? '#15803d' : '#7c2d12';
            this.ctx.beginPath();
            this.ctx.arc(cx, sy - 12, 9, 0, Math.PI * 2);
            this.ctx.fill();
            // Frutos
            if (isAlive) {
                this.ctx.fillStyle = '#ef4444';
                for (let i = 0; i < 4; i++) {
                    const angle = (i / 4) * Math.PI * 2;
                    this.ctx.beginPath();
                    this.ctx.arc(cx + Math.cos(angle) * 6, sy - 12 + Math.sin(angle) * 5, 1.5, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
    }

    drawTree(x, y, type, biome) {
        const { sx, sy, cx } = this.getIsoBase(x, y);
        const isAlive = type === RESOURCES.WOOD;

        let img = null;
        if (biome === BIOMES.SAND) {
            img = isAlive ? this.images?.arbol_desierto_1 : this.images?.arbol_desierto_2;
        } else {
            img = isAlive ? this.images?.arbol_1 : this.images?.arbol_2;
        }

        if (img) {
            const w = 40, h = 48;
            this.ctx.drawImage(img, cx - w / 2, sy - h + ISO_H + 2, w, h);
        } else {
            this.ctx.fillStyle = isAlive ? '#78350f' : '#57534e';
            this.ctx.fillRect(cx - 2, sy - 10, 4, 12);
            this.ctx.fillStyle = isAlive ? '#166534' : '#44403c';
            this.ctx.beginPath();
            this.ctx.arc(cx, sy - 15, 10, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    // ─── Arbusto ────────────────────────────────────────────────────────────────
    drawBush(x, y, type) {
        const { sx, sy, cx } = this.getIsoBase(x, y);
        const isAlive = type === RESOURCES.BUSH;

        let img = isAlive ? this.images?.arbusto_1 : this.images?.arbusto_2;
        if (img) {
            const w = 26, h = 26;
            this.ctx.drawImage(img, cx - w / 2, sy - h / 2 + 2, w, h);
        } else {
            this.ctx.fillStyle = isAlive ? '#22c55e' : '#854d0e';
            this.ctx.beginPath();
            this.ctx.ellipse(cx, sy - 3, 8, 6, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    // ─── Roca ───────────────────────────────────────────────────────────────────
    drawRock(x, y, type) {
        const { sx, sy, cx } = this.getIsoBase(x, y);
        const isEmpty = type === RESOURCES.ROCK_EMPTY;

        if (isEmpty) {
            if (this.images?.rocas_2) {
                this.ctx.drawImage(this.images.rocas_2, cx - 12, sy - 10, 24, 22);
            } else {
                this.ctx.fillStyle = '#94a3b8';
                this.ctx.beginPath();
                this.ctx.ellipse(cx, sy - 1, 6, 3.5, 0, 0, Math.PI * 2);
                this.ctx.fill();
            }
        } else {
            if (this.images?.rocas_1) {
                this.ctx.drawImage(this.images.rocas_1, cx - 12, sy - 14, 24, 24);
            } else {
                // Roca isométrica procedural
                this.ctx.fillStyle = '#64748b';
                this.ctx.beginPath();
                this.ctx.moveTo(cx,      sy - 12);
                this.ctx.lineTo(cx + 8,  sy - 5);
                this.ctx.lineTo(cx + 6,  sy + 1);
                this.ctx.lineTo(cx - 6,  sy + 1);
                this.ctx.lineTo(cx - 8,  sy - 5);
                this.ctx.closePath();
                this.ctx.fill();
                // Cara clara
                this.ctx.fillStyle = '#94a3b8';
                this.ctx.beginPath();
                this.ctx.moveTo(cx - 1, sy - 12);
                this.ctx.lineTo(cx + 4, sy - 6);
                this.ctx.lineTo(cx - 3, sy - 4);
                this.ctx.closePath();
                this.ctx.fill();
            }
        }
    }

    // ─── Puente ─────────────────────────────────────────────────────────────────
    drawBridge(x, y) {
        const { sx, sy } = this.getIsoBase(x, y);
        this.drawDiamond(sx, sy, '#92400e', '#78350f');
        // Tablones
        this.ctx.strokeStyle = '#78350f';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(sx + 4,         sy + ISO_H / 2);
        this.ctx.lineTo(sx + ISO_W - 4, sy + ISO_H / 2);
        this.ctx.stroke();
    }

    // ─── Casa en construcción ───────────────────────────────────────────────────
    drawHouse(x, y, hp) {
        const { sx, sy, cx } = this.getIsoBase(x, y);
        const h = 12; // altura de la caja

        // Cara superior
        this.drawDiamond(sx, sy - h, '#b45309', '#92400e');

        // Cara izquierda
        this.ctx.fillStyle = '#92400e';
        this.ctx.beginPath();
        this.ctx.moveTo(sx,           sy - h + ISO_H / 2);
        this.ctx.lineTo(sx + ISO_W/2, sy - h + ISO_H);
        this.ctx.lineTo(sx + ISO_W/2, sy + ISO_H / 2);
        this.ctx.lineTo(sx,           sy + ISO_H / 2);
        this.ctx.closePath();
        this.ctx.fill();

        // Cara derecha
        this.ctx.fillStyle = '#78350f';
        this.ctx.beginPath();
        this.ctx.moveTo(sx + ISO_W/2, sy - h + ISO_H);
        this.ctx.lineTo(sx + ISO_W,   sy - h + ISO_H / 2);
        this.ctx.lineTo(sx + ISO_W,   sy + ISO_H / 2);
        this.ctx.lineTo(sx + ISO_W/2, sy + ISO_H / 2);
        this.ctx.closePath();
        this.ctx.fill();

        if (hp < 10) {
            this.ctx.fillStyle = '#475569';
            this.ctx.fillRect(cx - 10, sy - h - 5, 20, 3);
            this.ctx.fillStyle = '#22c55e';
            this.ctx.fillRect(cx - 10, sy - h - 5, 20 * hp / 10, 3);
        }
    }

    // ─── Casa grande ────────────────────────────────────────────────────────────
    drawBigHouse(x, y, homeStage) {
        const { sx, sy, cx } = this.getIsoBase(x, y);

        if (homeStage === 1 && this.images?.casa_1) {
            this.ctx.drawImage(this.images.casa_1, cx - 44, sy - 52, 88, 68);
            return;
        } else if (homeStage === 2 && this.images?.casa_2) {
            this.ctx.drawImage(this.images.casa_2, cx - 44, sy - 52, 88, 68);
            return;
        } else if (homeStage === 3 && this.images?.casa_3) {
            this.ctx.drawImage(this.images.casa_3, cx - 44, sy - 52, 88, 68);
            return;
        }

        // Casa isométrica procedural 2×2
        const houseH = 22;

        // Techo (rombo doble de ancho, centrado en cx)
        const rx = cx - ISO_W;
        this.ctx.fillStyle = '#991b1b';
        this.ctx.beginPath();
        this.ctx.moveTo(cx,           sy - houseH);
        this.ctx.lineTo(cx + ISO_W,   sy - houseH + ISO_H / 2);
        this.ctx.lineTo(cx,           sy - houseH + ISO_H);
        this.ctx.lineTo(cx - ISO_W,   sy - houseH + ISO_H / 2);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.strokeStyle = '#7f1d1d';
        this.ctx.lineWidth = 0.5;
        this.ctx.stroke();

        // Pared izquierda
        this.ctx.fillStyle = '#b45309';
        this.ctx.beginPath();
        this.ctx.moveTo(cx - ISO_W, sy - houseH + ISO_H / 2);
        this.ctx.lineTo(cx,         sy - houseH + ISO_H);
        this.ctx.lineTo(cx,         sy + ISO_H / 2);
        this.ctx.lineTo(cx - ISO_W, sy);
        this.ctx.closePath();
        this.ctx.fill();

        // Pared derecha
        this.ctx.fillStyle = '#92400e';
        this.ctx.beginPath();
        this.ctx.moveTo(cx,         sy - houseH + ISO_H);
        this.ctx.lineTo(cx + ISO_W, sy - houseH + ISO_H / 2);
        this.ctx.lineTo(cx + ISO_W, sy);
        this.ctx.lineTo(cx,         sy + ISO_H / 2);
        this.ctx.closePath();
        this.ctx.fill();

        // Chimenea
        this.ctx.fillStyle = '#475569';
        this.ctx.fillRect(cx + 5, sy - houseH - 7, 5, 7);
        this.ctx.fillStyle = '#334155';
        this.ctx.fillRect(cx + 4, sy - houseH - 9, 7, 3);
    }

    // ─── Libro mágico ───────────────────────────────────────────────────────────
    drawBook(x, y, timestamp, world) {
        const { cx, sy } = this.getIsoBase(x, y);
        const t = (timestamp || 0) * 0.003;
        const hover = Math.sin(t) * 3;

        const cell = world.getCell(x, y);
        const branchId = cell ? cell.capacity : 0;

        let img = null;
        if (branchId === 0 && this.images?.libro_astronomia) img = this.images.libro_astronomia;
        if (branchId === 1 && this.images?.libro_fauna)      img = this.images.libro_fauna;
        if (branchId === 2 && this.images?.libro_herreria)   img = this.images.libro_herreria;

        this.ctx.save();
        this.ctx.translate(cx, sy - 6 + hover);

        const aura = Math.abs(Math.sin(t * 0.5)) * 5;
        this.ctx.shadowColor = '#fef08a';
        this.ctx.shadowBlur = 10 + aura;

        if (img) {
            const s = 14;
            this.ctx.drawImage(img, -s / 2, -s / 2, s, s);
        } else {
            this.ctx.fillStyle = '#431407';
            this.ctx.beginPath();
            this.ctx.moveTo(0,0); this.ctx.lineTo(-8,-4); this.ctx.lineTo(-8,6); this.ctx.lineTo(0,10);
            this.ctx.closePath(); this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.moveTo(0,0); this.ctx.lineTo(8,-4); this.ctx.lineTo(8,6); this.ctx.lineTo(0,10);
            this.ctx.closePath(); this.ctx.fill();
            this.ctx.fillStyle = '#fef08a';
            this.ctx.fillRect(-1, 0, 2, 10);
        }

        this.ctx.restore();
    }

    // ─── Telescopio ─────────────────────────────────────────────────────────────
    drawTelescope(x, y) {
        const { cx, sy } = this.getIsoBase(x, y);

        if (this.images?.telescopio) {
            const w = 22, h = 26;
            this.ctx.drawImage(this.images.telescopio, cx - w / 2, sy - h / 2, w, h);
        } else {
            this.ctx.save();
            this.ctx.translate(cx, sy - 4);
            this.ctx.strokeStyle = '#451a03';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath(); this.ctx.moveTo(0,0); this.ctx.lineTo(-5,8); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(0,0); this.ctx.lineTo(5,8); this.ctx.stroke();
            this.ctx.fillStyle = '#f59e0b';
            this.ctx.rotate(-Math.PI / 5);
            this.ctx.fillRect(-7, -3, 14, 5);
            this.ctx.fillStyle = '#0ea5e9';
            this.ctx.fillRect(6, -2, 3, 4);
            this.ctx.restore();
        }
    }

    // ─── Muralla ────────────────────────────────────────────────────────────────
    drawWall(x, y, hp) {
        const { sx, sy, cx } = this.getIsoBase(x, y);
        const wh = 9; // altura de la muralla

        if (this.images?.muralla) {
            this.ctx.drawImage(this.images.muralla, cx - 14, sy - wh - 2, 28, wh + ISO_H + 2);
        } else {
            // Cara superior
            this.drawDiamond(sx, sy - wh, '#64748b', '#475569');
            // Cara izquierda
            this.ctx.fillStyle = '#475569';
            this.ctx.beginPath();
            this.ctx.moveTo(sx,           sy - wh + ISO_H / 2);
            this.ctx.lineTo(sx + ISO_W/2, sy - wh + ISO_H);
            this.ctx.lineTo(sx + ISO_W/2, sy + ISO_H / 2);
            this.ctx.lineTo(sx,           sy + ISO_H / 2);
            this.ctx.closePath();
            this.ctx.fill();
            // Cara derecha
            this.ctx.fillStyle = '#334155';
            this.ctx.beginPath();
            this.ctx.moveTo(sx + ISO_W/2, sy - wh + ISO_H);
            this.ctx.lineTo(sx + ISO_W,   sy - wh + ISO_H / 2);
            this.ctx.lineTo(sx + ISO_W,   sy + ISO_H / 2);
            this.ctx.lineTo(sx + ISO_W/2, sy + ISO_H / 2);
            this.ctx.closePath();
            this.ctx.fill();
        }
    }

    // ─── Puntos de capacidad ────────────────────────────────────────────────────
    drawResourceDots(x, y, capacity) {
        const { cx, sy } = this.getIsoBase(x, y);
        const startX = cx - (capacity * 5) / 2 + 2.5;
        for (let i = 0; i < capacity; i++) {
            this.ctx.fillStyle = '#f8fafc';
            this.ctx.beginPath();
            this.ctx.arc(startX + i * 5, sy - 2, 1.5, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    // ─── Entidades (Gruni, enemigos, lobo) ──────────────────────────────────────
    drawEntity(entity, type, timestamp = 0) {
        if (type !== 'agent' && entity.hp <= 0) return;

        const { cx, sy, baseY } = this.getIsoBase(entity.x, entity.y);
        const t = timestamp || 0;

        // Animación de bobbing mientras se mueve
        const moving = !!(entity.dx || entity.dy || entity.lastDx || entity.lastDy);
        const bob = moving ? Math.abs(Math.sin(t * 0.014)) * 3.5 : 0;
        const bodyY = baseY - 6 - bob;

        // Sombra elíptica sobre el tile
        this.ctx.fillStyle = 'rgba(0,0,0,0.18)';
        this.ctx.beginPath();
        this.ctx.ellipse(cx, baseY, 5, 2.5, 0, 0, Math.PI * 2);
        this.ctx.fill();

        if (type === 'agent') {
            // Bola amarilla (Gruni)
            this.ctx.fillStyle = '#facc15';
            this.ctx.beginPath();
            this.ctx.arc(cx, bodyY, 5.5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#ca8a04';
            this.ctx.lineWidth = 0.7;
            this.ctx.stroke();

            // Ojos que siguen la dirección de movimiento
            let eyeOffX = 0, eyeOffY = -0.5;
            if (entity.dx > 0) eyeOffX = 1.5;
            else if (entity.dx < 0) eyeOffX = -1.5;
            else if (entity.dy < 0) eyeOffY = -2;
            else if (entity.dy > 0) eyeOffY = 0.5;

            this.ctx.fillStyle = '#1e293b';
            this.ctx.beginPath();
            this.ctx.arc(cx + eyeOffX - 1.5, bodyY + eyeOffY, 1.1, 0, Math.PI * 2);
            this.ctx.arc(cx + eyeOffX + 1.5, bodyY + eyeOffY, 1.1, 0, Math.PI * 2);
            this.ctx.fill();

        } else if (type === 'enemy') {
            // Bola roja (malo)
            this.ctx.fillStyle = '#f87171';
            this.ctx.beginPath();
            this.ctx.arc(cx, bodyY, 6, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#b91c1c';
            this.ctx.lineWidth = 0.7;
            this.ctx.stroke();

            this.ctx.fillStyle = '#1e293b';
            this.ctx.beginPath();
            this.ctx.arc(cx - 2, bodyY - 0.5, 1.1, 0, Math.PI * 2);
            this.ctx.arc(cx + 2, bodyY - 0.5, 1.1, 0, Math.PI * 2);
            this.ctx.fill();

            // Cejas fruncidas
            this.ctx.strokeStyle = '#1e293b';
            this.ctx.lineWidth = 0.8;
            this.ctx.beginPath();
            this.ctx.moveTo(cx - 3.5, bodyY - 3); this.ctx.lineTo(cx - 1, bodyY - 2);
            this.ctx.moveTo(cx + 3.5, bodyY - 3); this.ctx.lineTo(cx + 1, bodyY - 2);
            this.ctx.stroke();

        } else if (type === 'wolf') {
            // Bola gris (lobo)
            this.ctx.fillStyle = '#94a3b8';
            this.ctx.beginPath();
            this.ctx.arc(cx, bodyY, 5.5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#475569';
            this.ctx.lineWidth = 0.7;
            this.ctx.stroke();

            this.ctx.fillStyle = '#fde68a';
            this.ctx.beginPath();
            this.ctx.arc(cx - 1.5, bodyY - 0.5, 1.1, 0, Math.PI * 2);
            this.ctx.arc(cx + 1.5, bodyY - 0.5, 1.1, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    // ─── Barra de HP (no se usa actualmente pero se preserva) ───────────────────
    drawHpBar(hp, max, color) {
        const barWidth = 16;
        const segWidth = barWidth / max;
        this.ctx.fillStyle = '#475569';
        this.ctx.fillRect(-barWidth / 2, -18, barWidth, 3);
        this.ctx.fillStyle = color;
        this.ctx.fillRect(-barWidth / 2, -18, segWidth * hp, 3);
        this.ctx.strokeStyle = '#0f172a';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(-barWidth / 2, -18, barWidth, 3);
    }

    // ─── Iluminación global (día / noche / eclipse) ──────────────────────────────
    drawGlobalLighting(timeOfDay, renderQueue, agent, particles, timestamp, isEclipse) {
        this.ctx.save();

        let overlayColor = 'rgba(0,0,0,0)';
        let opacity = 0;

        if (isEclipse) {
            overlayColor = 'rgba(2, 6, 23, 0.85)';
            opacity = 0.85;
        } else {
            if (timeOfDay > 1800 || timeOfDay < 500) {
                opacity = 0.65;
                overlayColor = `rgba(12, 18, 55, ${opacity})`;
            } else if (timeOfDay >= 500 && timeOfDay <= 700) {
                opacity = 0.35;
                overlayColor = `rgba(234, 100, 20, ${opacity})`;
            } else if (timeOfDay >= 1700 && timeOfDay <= 1800) {
                opacity = 0.35;
                overlayColor = `rgba(190, 40, 80, ${opacity})`;
            }
        }

        if (opacity > 0) {
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.fillStyle = overlayColor;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.globalCompositeOperation = 'lighter';

            // Convierte posición de grilla a posición en pantalla (con cámara iso)
            const isoToScreen = (worldX, worldY) => {
                const { sx, sy } = this.isoProject(worldX, worldY);
                return {
                    px: (sx + ISO_W / 2 - this.cameraX) * ZOOM,
                    py: (sy + ISO_H / 2 - this.cameraY) * ZOOM
                };
            };

            const drawLight = (worldX, worldY, radius, intensity = 0.4, color = '255, 255, 200') => {
                const { px, py } = isoToScreen(worldX, worldY);
                const grad = this.ctx.createRadialGradient(px, py, 2, px, py, radius);
                grad.addColorStop(0, `rgba(${color}, ${intensity})`);
                grad.addColorStop(1, `rgba(${color}, 0)`);
                this.ctx.fillStyle = grad;
                this.ctx.beginPath();
                this.ctx.arc(px, py, radius, 0, Math.PI * 2);
                this.ctx.fill();
            };

            if (agent) {
                const pulse = Math.sin((timestamp || 0) * 0.002) * 5;
                drawLight(agent.x, agent.y, 90 + pulse, 0.35, '255, 240, 200');
            }

            for (const item of renderQueue) {
                if (item.type === 'bighouse') {
                    drawLight(item.x + 0.5, item.y + 0.5, 140, 0.4, '250, 180, 80');
                }
            }

            if (particles) {
                for (const p of particles.particles) {
                    if (p.type === 'FIREFLY') {
                        // p.x / p.y están en píxeles de mundo → convertir a grilla iso
                        const gx = p.x / CELL_SIZE;
                        const gy = p.y / CELL_SIZE;
                        const { px, py } = isoToScreen(gx, gy);
                        const grad = this.ctx.createRadialGradient(px, py, 0.5, px, py, 25);
                        grad.addColorStop(0, 'rgba(200, 255, 150, 0.6)');
                        grad.addColorStop(1, 'rgba(200, 255, 150, 0)');
                        this.ctx.fillStyle = grad;
                        this.ctx.beginPath();
                        this.ctx.arc(px, py, 25, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }
            }
        }

        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.restore();
    }
}
