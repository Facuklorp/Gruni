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
    drawDiamond(sx, sy, fillColor, edgeColor = null, w = ISO_W, h = ISO_H) {
        const hw = w / 2;
        const hh = h / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(sx + hw, sy);          // arriba
        this.ctx.lineTo(sx + w, sy + hh);  // derecha
        this.ctx.lineTo(sx + hw, sy + h);  // abajo
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

    // Aplica un clip path en forma de rombo isométrico.
    // Llamar DENTRO de un ctx.save() / ctx.restore().
    // Las imágenes pueden ser cuadradas: el clip las recorta automáticamente.
    clipToDiamond(drawX, drawY, drawW, drawH) {
        const hw = drawW / 2;
        const hh = drawH / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(drawX + hw, drawY);           // arriba
        this.ctx.lineTo(drawX + drawW, drawY + hh);   // derecha
        this.ctx.lineTo(drawX + hw, drawY + drawH);   // abajo
        this.ctx.lineTo(drawX, drawY + hh);            // izquierda
        this.ctx.closePath();
        this.ctx.clip();
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
        // Limpiamos el canvas físico entero antes de dibujar el nuevo frame para evitar el "smearing" (bordes que dejan rastro)
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = '#020617';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.imageSmoothingEnabled = false;

        const dpr = window.devicePixelRatio || 1;
        const viewW = this.canvas.width  / (ZOOM * dpr);
        const viewH = this.canvas.height / (ZOOM * dpr);

        // Cámara isométrica con lerp suave
        if (agent && !this.manualCamera) {
            const ax = agent.renderX !== undefined ? agent.renderX : agent.x;
            const ay = agent.renderY !== undefined ? agent.renderY : agent.y;
            const { sx, sy } = this.isoProject(ax, ay);
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

        // Clamp camera to the bounds of the pre-rendered background image
        // Background bounds in isometric space: X: -1168 to (-1168+1920) = 752, Y: 304 to (304+960) = 1264
        const minCameraX = -1168;
        const maxCameraX = 752 - viewW;
        const minCameraY = 304;
        const maxCameraY = 1264 - viewH;

        if (viewW <= 1920) {
            this.cameraX = Math.max(minCameraX, Math.min(maxCameraX, this.cameraX));
        } else {
            this.cameraX = minCameraX + (1920 - viewW) / 2;
        }

        if (viewH <= 960) {
            this.cameraY = Math.max(minCameraY, Math.min(maxCameraY, this.cameraY));
        } else {
            this.cameraY = minCameraY + (960 - viewH) / 2;
        }

        this.ctx.save();
        this.ctx.scale(ZOOM * dpr, ZOOM * dpr);
        this.ctx.translate(-this.cameraX, -this.cameraY);

        // ── FONDO PRE-RENDERIZADO GIGANTE ──────────────────────────────────────
        if (this.images && this.images.fondo_gruni) {
            this.ctx.save();
            // Reseteamos todas las transformaciones para dibujar directo en los píxeles físicos
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            
            // Calculamos la posición en los PÍXELES FÍSICOS de la pantalla y REDONDEAMOS.
            // Esto elimina totalmente el desenfoque en monitores High-DPI (Retina, 125% Windows)
            const physX = Math.round((-1168 - this.cameraX) * ZOOM * dpr);
            const physY = Math.round((304 - this.cameraY) * ZOOM * dpr);
            const physW = Math.round(1920 * ZOOM * dpr); 
            const physH = Math.round(960 * ZOOM * dpr);  
            
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';
            this.ctx.drawImage(this.images.fondo_gruni, physX, physY, physW, physH);
            
            this.ctx.restore();
        } else {
            // Fondo de seguridad oscuro si no carga la imagen
            this.ctx.fillStyle = '#111';
            this.ctx.fillRect(-1168, 304, 1920, 960);
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

        // =========================================================================
        // Ya no vaciamos la cola de renderizado, permitiendo dibujar los árboles y entidades
        // =========================================================================

        for (const item of renderQueue) {
            if (item.type === 'resource') {
                const cell = item.cell;
                switch (cell.type) {
                    case RESOURCES.FOOD:
                    case RESOURCES.FOOD_EMPTY: this.drawFruitTree(item.x, item.y, cell.type, cell.biome, agent); break;
                    case RESOURCES.WOOD:
                    case RESOURCES.WOOD_EMPTY: this.drawTree(item.x, item.y, cell.type, cell.biome, agent); break;
                    case RESOURCES.BUSH:
                    case RESOURCES.BUSH_EMPTY: this.drawBush(item.x, item.y, cell.type); break;
                    case RESOURCES.ROCK:
                    case RESOURCES.ROCK_EMPTY: this.drawRock(item.x, item.y, cell.type); break;
                    case RESOURCES.HOUSE:      this.drawHouse(item.x, item.y, cell.capacity); break;
                    case RESOURCES.BOOK:       this.drawBook(item.x, item.y, timestamp, world); break;
                    case RESOURCES.TELESCOPE:  this.drawTelescope(item.x, item.y); break;
                    case RESOURCES.WALL:       this.drawWall(item.x, item.y, cell.capacity); break;
                    case RESOURCES.MARKET:     this.drawMarket(item.x, item.y); break;
                    case RESOURCES.MAGIC_TREE: this.drawMagicTree(item.x, item.y, cell.type, cell.biome, agent); break;
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
    drawMarket(x, y) {
        // La imagen del mercado ya está incluida en el fondo (Fondo_mapa_sin_arboles_2.png)
        // Por lo tanto, no la dibujamos para evitar superposiciones.
    }

    drawMagicTree(x, y, type, biome, agent) {
        // Placeholder for magic tree (reddish), until image is added
        const { sx, sy, cx } = this.getIsoBase(x, y);
        this.ctx.fillStyle = '#7f1d1d'; // Dark red trunk
        this.ctx.fillRect(cx - 2, sy - 15, 4, 15);
        this.ctx.fillStyle = '#ef4444'; // Red leaves
        this.ctx.beginPath();
        this.ctx.arc(cx, sy - 25, 12, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawFruitTree(x, y, type, biome, agent) {
        const { sx, sy, cx } = this.getIsoBase(x, y);
        const isAlive = type === RESOURCES.FOOD;

        let img = null;
        let isStump = false;
        
        if (biome === BIOMES.DESERT) {
            if (isAlive) {
                const idx = ((x * 11 + y * 17) % 3) + 1;
                img = this.images?.[`arbol_desierto_${idx}`];
            } else {
                const stumpIds = [1, 2, 3, 5, 6, 7, 8, 9, 10];
                const idx = stumpIds[(x * 17 + y * 19) % 9];
                img = this.images?.[`iso_tronco_${idx}`];
                isStump = true;
            }
        } else if (biome === BIOMES.SNOW) {
            if (isAlive) {
                const idx = ((x * 11 + y * 17) % 3) + 1;
                img = this.images?.[`nevado_${idx}`];
            } else {
                const stumpIds = [1, 2, 3, 5, 6, 7, 8, 9, 10];
                const idx = stumpIds[(x * 17 + y * 19) % 9];
                img = this.images?.[`iso_tronco_${idx}`];
                isStump = true;
            }
        } else if (biome === BIOMES.PINE) {
            if (isAlive) {
                const idx = ((x * 11 + y * 17) % 3) + 1;
                img = this.images?.[`pino_${idx}`];
            } else {
                const stumpIds = [1, 2, 3, 5, 6, 7, 8, 9, 10];
                const idx = stumpIds[(x * 17 + y * 19) % 9];
                img = this.images?.[`iso_tronco_${idx}`];
                isStump = true;
            }
        } else {
            if (isAlive) {
                const idx = ((x * 7 + y * 13) % 6) + 1; // 1 to 6
                img = this.images?.[`iso_frutal_${idx}`];
            } else {
                const stumpIds = [1, 2, 3, 5, 6, 7, 8, 9, 10];
                const idx = stumpIds[(x * 17 + y * 19) % 9];
                img = this.images?.[`iso_tronco_${idx}`];
                isStump = true;
            }
        }

        // Pseudo-random offset para desalinear un poco los árboles
        const offsetX = ((x * 31 + y * 17) % 20) - 10;
        const offsetY = ((x * 13 + y * 23) % 10) - 5;
        const drawX = cx + offsetX;
        const drawY = sy + offsetY;

        if (img) {
            let w = isStump && biome !== BIOMES.DESERT ? 28 : 38;
            let h = isStump && biome !== BIOMES.DESERT ? 20 : 60;
            
            if (img.width && img.height) {
                if (isStump && biome !== BIOMES.DESERT) {
                    h = w * (img.height / img.width);
                } else {
                    // Use the image's intrinsic size scaled down, but with a reasonable minimum
                    w = img.width * 0.25;
                    if (w < 38) w = 38;
                    h = w * (img.height / img.width);
                    if (h < 50) h = 50;
                }
            }

            // Check if agent is behind the tree to apply transparency
            let alpha = 1.0;
            if (agent && !isStump) {
                const agentIso = this.getIsoBase(agent.x, agent.y);
                const agentBodyY = agentIso.baseY - 6;
                const treeLeft = drawX - w / 2;
                const treeRight = treeLeft + w;
                const treeTop = drawY - h + ISO_H + 2;
                const treeBottom = treeTop + h;
                
                // If agent is drawn before or at same time as tree, and is inside tree rect
                if ((agent.x + agent.y) <= (x + y + 1.5)) {
                    if (agentIso.cx >= treeLeft && agentIso.cx <= treeRight &&
                        agentBodyY >= treeTop && agentBodyY <= treeBottom) {
                        alpha = 0.5;
                    }
                }
            }

            this.ctx.globalAlpha = alpha;
            this.ctx.drawImage(img, drawX - w / 2, drawY - h + ISO_H + 2, w, h);
            this.ctx.globalAlpha = 1.0;
        } else {
            // Tronco
            this.ctx.fillStyle = '#92400e';
            this.ctx.fillRect(drawX - 1.5, drawY - 8, 3, 10);
            // Copa
            this.ctx.fillStyle = isAlive ? '#15803d' : '#7c2d12';
            this.ctx.beginPath();
            this.ctx.arc(drawX, drawY - 12, 9, 0, Math.PI * 2);
            this.ctx.fill();
            // Frutos
            if (isAlive) {
                this.ctx.fillStyle = '#ef4444';
                for (let i = 0; i < 4; i++) {
                    const angle = (i / 4) * Math.PI * 2;
                    this.ctx.beginPath();
                    this.ctx.arc(drawX + Math.cos(angle) * 6, drawY - 12 + Math.sin(angle) * 5, 1.5, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
    }

    drawTree(x, y, type, biome, agent) {
        const { sx, sy, cx } = this.getIsoBase(x, y);
        const isAlive = type === RESOURCES.WOOD;

        let img = null;
        let isStump = false;

        if (biome === BIOMES.DESERT) {
            if (isAlive) {
                const idx = ((x * 11 + y * 17) % 3) + 1;
                img = this.images?.[`arbol_desierto_${idx}`];
            } else {
                const stumpIds = [1, 2, 3, 5, 6, 7, 8, 9, 10];
                const idx = stumpIds[(x * 23 + y * 29) % 9];
                img = this.images?.[`iso_tronco_${idx}`];
                isStump = true;
            }
        } else if (biome === BIOMES.SNOW) {
            if (isAlive) {
                const idx = ((x * 11 + y * 17) % 3) + 1;
                img = this.images?.[`nevado_${idx}`];
            } else {
                const stumpIds = [1, 2, 3, 5, 6, 7, 8, 9, 10];
                const idx = stumpIds[(x * 23 + y * 29) % 9];
                img = this.images?.[`iso_tronco_${idx}`];
                isStump = true;
            }
        } else if (biome === BIOMES.PINE) {
            if (isAlive) {
                const idx = ((x * 11 + y * 17) % 3) + 1;
                img = this.images?.[`pino_${idx}`];
            } else {
                const stumpIds = [1, 2, 3, 5, 6, 7, 8, 9, 10];
                const idx = stumpIds[(x * 23 + y * 29) % 9];
                img = this.images?.[`iso_tronco_${idx}`];
                isStump = true;
            }
        } else {
            if (isAlive) {
                const idx = ((x * 11 + y * 17) % 10) + 1; // 1 to 10
                img = this.images?.[`iso_arbol_${idx}`];
            } else {
                const stumpIds = [1, 2, 3, 5, 6, 7, 8, 9, 10];
                const idx = stumpIds[(x * 23 + y * 29) % 9];
                img = this.images?.[`iso_tronco_${idx}`];
                isStump = true;
            }
        }

        // Pseudo-random offset para desalinear un poco los árboles
        const offsetX = ((x * 31 + y * 17) % 20) - 10;
        const offsetY = ((x * 13 + y * 23) % 10) - 5;
        const drawX = cx + offsetX;
        const drawY = sy + offsetY;

        if (img) {
            let w = isStump && biome !== BIOMES.DESERT ? 28 : 38;
            let h = isStump && biome !== BIOMES.DESERT ? 20 : 60;
            
            if (img.width && img.height) {
                if (isStump && biome !== BIOMES.DESERT) {
                    h = w * (img.height / img.width);
                } else {
                    h = w * (img.height / img.width); // Use exact proportions for alive trees
                    if (h < 50) h = 50;
                }
            }

            // Check if agent is behind the tree to apply transparency
            let alpha = 1.0;
            if (agent && !isStump) {
                const agentIso = this.getIsoBase(agent.x, agent.y);
                const agentBodyY = agentIso.baseY - 6;
                const treeLeft = drawX - w / 2;
                const treeRight = treeLeft + w;
                const treeTop = drawY - h + ISO_H + 2;
                const treeBottom = treeTop + h;
                
                // If agent is drawn before or at same time as tree, and is inside tree rect
                if ((agent.x + agent.y) <= (x + y + 1.5)) {
                    if (agentIso.cx >= treeLeft && agentIso.cx <= treeRight &&
                        agentBodyY >= treeTop && agentBodyY <= treeBottom) {
                        alpha = 0.5;
                    }
                }
            }

            this.ctx.globalAlpha = alpha;
            this.ctx.drawImage(img, drawX - w / 2, drawY - h + ISO_H + 2, w, h);
            this.ctx.globalAlpha = 1.0;
        } else {
            this.ctx.fillStyle = isAlive ? '#78350f' : '#57534e';
            this.ctx.fillRect(drawX - 2, drawY - 10, 4, 12);
            this.ctx.fillStyle = isAlive ? '#166534' : '#44403c';
            this.ctx.beginPath();
            this.ctx.arc(drawX, drawY - 15, 10, 0, Math.PI * 2);
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

        if (entity.renderX === undefined) {
            entity.renderX = entity.x;
            entity.renderY = entity.y;
        }

        const t = timestamp || 0;
        let frame = 0;
        let moving = false;

        if (type === 'agent') {
            moving = !!(entity.dx || entity.dy);
            let animSpeed = 8; // Aumentado de 4 a 8 para hacer los pasos más lentos
            let fCount = 4;
            frame = moving ? Math.floor(t / animSpeed) % fCount : 0;

            // Gruni solo avanza físicamente en el frame 0 (img 1) y frame 2 (img 3)
            // Cuando frame es 1 o 3, se queda quieto (canMove = false)
            let canMove = !moving || (frame % 2 === 0);
            
            if (canMove) {
                // Usamos un lerp mayor (0.35) para compensar que solo se mueve la mitad del tiempo
                entity.renderX += (entity.x - entity.renderX) * (moving ? 0.35 : 0.15);
                entity.renderY += (entity.y - entity.renderY) * (moving ? 0.35 : 0.15);
            }
        } else {
            // Lerp normal para enemigos y lobo
            entity.renderX += (entity.x - entity.renderX) * 0.15;
            entity.renderY += (entity.y - entity.renderY) * 0.15;
        }

        const { cx, sy, baseY } = this.getIsoBase(entity.renderX, entity.renderY);

        // Animación de bobbing mientras se mueve
        const movingAny = !!(entity.dx || entity.dy || entity.lastDx || entity.lastDy);
        const bob = (movingAny && type !== 'agent') ? Math.abs(Math.sin(t * 0.014)) * 3.5 : 0;
        const bodyY = baseY - 6 - bob;

        // Sombra elíptica sobre el tile
        this.ctx.fillStyle = 'rgba(0,0,0,0.18)';
        this.ctx.beginPath();
        this.ctx.ellipse(cx, baseY, 5, 2.5, 0, 0, Math.PI * 2);
        this.ctx.fill();

        if (type === 'agent') {
            let dir = 0; // 0=frente, 1=espalda, 2=izq, 3=der
            if (entity.dx > 0 || entity.lastDx > 0) dir = 3;
            else if (entity.dx < 0 || entity.lastDx < 0) dir = 2;
            else if (entity.dy < 0 || entity.lastDy < 0) dir = 1;
            else dir = 0; // por defecto de frente

            
            let img = null;
            let flip = false;
            
            if (dir === 2 && this.images[`agent_walk_side_${frame + 1}`]) { 
                img = this.images[`agent_walk_side_${frame + 1}`];
                flip = true;
            } else if (dir === 3 && this.images[`agent_walk_side_${frame + 1}`]) {
                img = this.images[`agent_walk_side_${frame + 1}`];
            } else if (dir === 0 && this.images[`agent_walk_front_${frame + 1}`]) {
                img = this.images[`agent_walk_front_${frame + 1}`];
            } else if (dir === 1 && this.images[`agent_walk_back_${frame + 1}`]) {
                img = this.images[`agent_walk_back_${frame + 1}`];
            }

            if (img) {
                let fW = img.width || 78;
                let fH = img.height || 136;
                let scale = 0.32;
                let drawW = fW * scale;
                let drawH = fH * scale;

                let drawX = cx - drawW / 2;
                let drawY = baseY - drawH + 4 - bob; 

                this.ctx.save();
                if (flip) {
                    this.ctx.translate(cx, 0);
                    this.ctx.scale(-1, 1);
                    this.ctx.translate(-cx, 0);
                }
                this.ctx.drawImage(img, drawX, drawY, drawW, drawH);
                this.ctx.restore();
            } else {
                // Fallback a bola amarilla
                this.ctx.fillStyle = '#facc15';
                this.ctx.beginPath();
                this.ctx.arc(cx, bodyY, 5.5, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.strokeStyle = '#ca8a04';
                this.ctx.lineWidth = 0.7;
                this.ctx.stroke();
            }

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

    // ─── Iluminación global — siempre de día (noche desactivada) ────────────────
    drawGlobalLighting(timeOfDay, renderQueue, agent, particles, timestamp, isEclipse) {
        // Eclipse: overlay oscuro especial
        if (!isEclipse) return;

        this.ctx.save();
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }
}
