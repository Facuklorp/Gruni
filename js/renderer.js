// js/renderer.js — Vista Isométrica
import { CELL_SIZE, ZOOM, RESOURCES, BIOMES, ISO_W, ISO_H } from './world.js';

// Árboles ocultos temporalmente mientras se ajusta el fondo anclado al mundo.
// Poner en true para volver a dibujarlos.
const SHOW_TREES = true;
const TREE_TYPES = [
    RESOURCES.WOOD, RESOURCES.WOOD_EMPTY,
    RESOURCES.FOOD, RESOURCES.FOOD_EMPTY,
    RESOURCES.MAGIC_TREE
];

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cameraX = 0;
        this.cameraY = 0;
        this.cameraInitialized = false;
        this.images = null;
        
        // Sistema de huellas (footprints)
        this.footprints = [];
        this.lastFootprintX = 0;
        this.lastFootprintY = 0;
        this.footprintStep = 0; // Alternar pie izquierdo/derecho

        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
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
        
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';

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

        // ── FONDO Y LÍMITES DE CÁMARA DINÁMICOS ─────────────────────────────────
        let bgKey = world.currentZone ? world.currentZone.background : 'bg_pradera';
        let bgImg = (this.images && this.images[bgKey]) ? this.images[bgKey] : (this.images ? this.images['bg_pradera'] : null);
        
        let bgX, bgY, bgW, bgH;
        
        // Límites exactos del rombo isométrico para TODAS las zonas
        bgW = (world.width + world.height) * (ISO_W / 2) + ISO_W;
        bgH = (world.width + world.height) * (ISO_H / 2) + ISO_H;
        bgX = -(world.height * (ISO_W / 2));
        bgY = 0;

        // Clamp camera to the bounds of the current background
        const minCameraX = bgX;
        const maxCameraX = bgX + bgW - viewW;
        const minCameraY = bgY;
        const maxCameraY = bgY + bgH - viewH;

        if (viewW <= bgW) {
            this.cameraX = Math.max(minCameraX, Math.min(maxCameraX, this.cameraX));
        } else {
            this.cameraX = minCameraX + (bgW - viewW) / 2;
        }

        if (viewH <= bgH) {
            this.cameraY = Math.max(minCameraY, Math.min(maxCameraY, this.cameraY));
        } else {
            this.cameraY = minCameraY + (bgH - viewH) / 2;
        }

        this.ctx.save();
        this.ctx.scale(ZOOM * dpr, ZOOM * dpr);
        this.ctx.translate(-this.cameraX, -this.cameraY);

        // ── FONDO ANCLADO AL MUNDO ──────────────────────────────────────────────────
        // El fondo se dibuja en coordenadas del mundo (mismo sistema que árboles,
        // Gruni y enemigos), así el suelo se desplaza exactamente igual que todo
        // lo demás cuando la cámara sigue a Gruni.
        // Escalado tipo "cover": la imagen cubre todo el rombo de la zona sin
        // deformarse (mantiene su proporción) y queda centrada; lo que sobra se recorta.
        // Sincronizar layout del bioma (ríos, caminos, costas) y asignar tiles HD por celda
        this.syncZoneWithBackground(world, bgImg, bgX, bgY, bgW, bgH);

        // Dibujar el suelo isométrico en HD (sin estirar imágenes de fondo borrosas)
        this.drawHDGround(world, bgX, bgY, bgW, bgH, dpr);

        // ── DETALLES DEL TERRENO 2.5D (MICRO-VEGETACIÓN, FLORES Y SENDEROS) ─────
        this.drawTerrainDetails(world, agent, timestamp, viewW, viewH);

        // ── HUELLAS (FOOTPRINTS) EN EL DESIERTO / NIEVE ────────────────────────
        if (agent) {
            const currentCell = world.getCell(Math.floor(agent.x), Math.floor(agent.y));
            if (currentCell && (currentCell.biome === BIOMES.DESERT || currentCell.biome === BIOMES.SNOW || currentCell.biome === BIOMES.WATER_BIOME || currentCell.biome === BIOMES.SAND)) {
                const dist = Math.hypot(agent.x - this.lastFootprintX, agent.y - this.lastFootprintY);
                if (dist > 0.15) { // Reducido: Dejar huellas más seguido
                    const ax = agent.renderX !== undefined ? agent.renderX : agent.x;
                    const ay = agent.renderY !== undefined ? agent.renderY : agent.y;
                    const { cx, baseY } = this.getIsoBase(ax, ay);
                    
                    const isRight = this.footprintStep % 2 === 0;
                    
                    // Mayor separación lateral para que se noten los dos pies
                    const offsetX = isRight ? 4 : -4;
                    const offsetY = isRight ? 2 : -2;
                    
                    this.footprints.push({
                        x: cx + offsetX,
                        y: baseY - 1 + offsetY,
                        createdAt: timestamp,
                        lifeTime: 8000
                    });
                    
                    this.lastFootprintX = agent.x;
                    this.lastFootprintY = agent.y;
                    this.footprintStep++;
                }
            }
        }

        // Dibujar huellas
        this.ctx.save();
        for (let i = this.footprints.length - 1; i >= 0; i--) {
            const fp = this.footprints[i];
            const age = timestamp - fp.createdAt;
            if (age >= fp.lifeTime) {
                this.footprints.splice(i, 1);
                continue;
            }
            
            const alpha = 1 - (age / fp.lifeTime);
            // Color de huella (marrón oscuro transparente)
            this.ctx.fillStyle = `rgba(100, 50, 20, ${alpha * 0.4})`;
            
            this.ctx.beginPath();
            this.ctx.ellipse(fp.x, fp.y, 3, 1.5, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();

        // ── COLA DE RENDER (objetos + entidades) ────────────────────────────────
        const renderQueue = [];

        for (let y = 0; y < world.height; y++) {
            for (let x = 0; x < world.width; x++) {
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
                    if (!SHOW_TREES && TREE_TYPES.includes(cell.type)) {
                        // Árboles ocultos temporalmente (ver SHOW_TREES)
                    } else if (cell.type === RESOURCES.HOUSE && isAgentHome) {
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
        
        if (biome === BIOMES.DESERT || biome === BIOMES.WATER_BIOME || biome === BIOMES.SAND) {
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
                const idx = 1; // Solo tenemos 1 frutal (Arbol D frutal)
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
                    w = 46;
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

            // Sombra suave de contacto en el suelo bajo el árbol
            this.ctx.fillStyle = 'rgba(15, 35, 10, 0.22)';
            this.ctx.beginPath();
            this.ctx.ellipse(drawX, drawY + ISO_H * 0.55, isStump ? 8 : 13, isStump ? 4 : 6.5, 0, 0, Math.PI * 2);
            this.ctx.fill();

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

        if (biome === BIOMES.DESERT || biome === BIOMES.WATER_BIOME || biome === BIOMES.SAND) {
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
                const idx = ((x * 11 + y * 17) % 5) + 1; // 1 to 5
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

            // Sombra suave de contacto en el suelo bajo el árbol
            this.ctx.fillStyle = 'rgba(15, 35, 10, 0.22)';
            this.ctx.beginPath();
            this.ctx.ellipse(drawX, drawY + ISO_H * 0.55, isStump ? 8 : 13, isStump ? 4 : 6.5, 0, 0, Math.PI * 2);
            this.ctx.fill();

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

        this.ctx.fillStyle = 'rgba(15, 35, 10, 0.2)';
        this.ctx.beginPath();
        this.ctx.ellipse(cx, sy + 6, 9, 4.5, 0, 0, Math.PI * 2);
        this.ctx.fill();

        let img = isAlive ? this.images?.arbusto_1 : this.images?.arbusto_2;
        if (img) {
            const w = 28, h = 28;
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

        // Sombra suave de contacto bajo las rocas
        this.ctx.fillStyle = 'rgba(15, 25, 10, 0.24)';
        this.ctx.beginPath();
        this.ctx.ellipse(cx, sy + 5, 11, 5.5, 0, 0, Math.PI * 2);
        this.ctx.fill();

        if (isEmpty) {
            if (this.images?.rocas_2) {
                this.ctx.drawImage(this.images.rocas_2, cx - 15, sy - 13, 30, 28);
            } else {
                this.ctx.fillStyle = '#94a3b8';
                this.ctx.beginPath();
                this.ctx.ellipse(cx, sy - 1, 6, 3.5, 0, 0, Math.PI * 2);
                this.ctx.fill();
            }
        } else {
            if (this.images?.rocas_1) {
                this.ctx.drawImage(this.images.rocas_1, cx - 16, sy - 16, 32, 32);
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

        const stage = Math.max(1, Math.min(3, homeStage || 1));
        const img = stage === 1 ? this.images?.casa_1 : (stage === 2 ? this.images?.casa_2 : this.images?.casa_3);
        if (img && img.width && img.height) {
            const w = 88;
            const h = w * (img.height / img.width);
            const bottomY = sy + ISO_H * 1.65;
            this.ctx.fillStyle = 'rgba(15, 30, 10, 0.26)';
            this.ctx.beginPath();
            this.ctx.ellipse(cx, bottomY - 6, 38, 18, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.drawImage(img, cx - w / 2, bottomY - h, w, h);
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

    // ─── Sincronización de layout de zona y asignación de Tiles Isométricos HD ──
    syncZoneWithBackground(world, bgImg, bgX, bgY, bgW, bgH) {
        if (!world || !world.grid) return;
        const zoneId = world.currentZoneId || 'pradera';
        const syncKey = `${zoneId}_${bgImg ? bgImg.src : 'procedural'}`;
        if (world._bgSyncedKey === syncKey) return;

        try {
            let imgData = null;
            const sampleW = 384;
            const sampleH = 216;
            let worldDrawW = bgW, worldDrawH = bgH, worldDrawX = bgX, worldDrawY = bgY;

            if (bgImg && bgImg.width) {
                if (!this._bgSampleCanvas) {
                    this._bgSampleCanvas = document.createElement('canvas');
                    this._bgSampleCanvas.width = sampleW;
                    this._bgSampleCanvas.height = sampleH;
                    this._bgSampleCtx = this._bgSampleCanvas.getContext('2d', { willReadFrequently: true });
                }
                const sctx = this._bgSampleCtx;
                sctx.clearRect(0, 0, sampleW, sampleH);
                sctx.drawImage(bgImg, 0, 0, sampleW, sampleH);
                imgData = sctx.getImageData(0, 0, sampleW, sampleH).data;

                const coverScale = Math.max(bgW / bgImg.width, bgH / bgImg.height);
                worldDrawW = bgImg.width * coverScale;
                worldDrawH = bgImg.height * coverScale;
                worldDrawX = bgX + (bgW - worldDrawW) / 2;
                worldDrawY = bgY + (bgH - worldDrawH) / 2;
            }

            const hasRealWater = (zoneId === 'bosque_rio' || zoneId === 'playa');

            for (let y = 0; y < world.height; y++) {
                for (let x = 0; x < world.width; x++) {
                    const cell = world.getCell(x, y);
                    if (!cell) continue;

                    const h = ((x * 374761393) ^ (y * 668265263) ^ ((x * y) * 1274126177)) >>> 0;
                    const patch = Math.sin(x * 0.32 + y * 0.24) + Math.cos(x * 0.21 - y * 0.35);
                    cell.tileFlip = ((h >> 4) & 1) === 1;

                    let r = 88, g = 142, b = 32;
                    if (imgData) {
                        const { cx, cy } = this.getIsoBase(x, y);
                        const u = Math.max(0, Math.min(0.999, (cx - worldDrawX) / worldDrawW));
                        const v = Math.max(0, Math.min(0.999, (cy - worldDrawY) / worldDrawH));
                        const px = Math.floor(u * sampleW);
                        const py = Math.floor(v * sampleH);
                        const idx = (py * sampleW + px) * 4;
                        r = imgData[idx];
                        g = imgData[idx + 1];
                        b = imgData[idx + 2];
                    }
                    cell.groundColor = [r, g, b];

                    const isWaterPixel = (cell.type === RESOURCES.WATER) || (hasRealWater && (
                        (b > r + 15 && b > g - 20 && b > 75 && r < 145) ||
                        (b > 125 && g > 105 && r < 115)
                    ));
                    const isGreenGrass = !isWaterPixel && (g > r + 6 && g > b + 16 && g > 45);
                    const isDirtRoad = !isWaterPixel && !isGreenGrass && (r > g + 8 && r > b + 18 && r > 75);

                    if (isWaterPixel) {
                        cell.groundType = 'WATER';
                        if (cell.type === RESOURCES.WOOD || cell.type === RESOURCES.WOOD_EMPTY ||
                            cell.type === RESOURCES.FOOD || cell.type === RESOURCES.FOOD_EMPTY ||
                            cell.type === RESOURCES.BUSH || cell.type === RESOURCES.BUSH_EMPTY ||
                            cell.type === RESOURCES.ROCK || cell.type === RESOURCES.ROCK_EMPTY ||
                            cell.type === RESOURCES.EMPTY) {
                            cell.type = RESOURCES.WATER;
                            cell.capacity = 5;
                        }
                    } else if (isGreenGrass) {
                        cell.groundType = 'GRASS';
                    } else if (isDirtRoad) {
                        cell.groundType = 'DIRT';
                        if ((zoneId === 'aldea_campo' || zoneId === 'bosque_rio') && (r > g + 16 && r > b + 28)) {
                            if (cell.type === RESOURCES.WOOD || cell.type === RESOURCES.FOOD || cell.type === RESOURCES.BUSH) {
                                cell.type = RESOURCES.EMPTY;
                                cell.capacity = 0;
                            }
                        }
                    } else {
                        cell.groundType = 'OTHER';
                    }

                    // Selección del tile isométrico HD y su capa de solapamiento (0=agua, 1=tierra/arena/nieve, 2=pasto)
                    if (cell.groundType === 'WATER') {
                        cell.tileLayer = 0;
                        if (zoneId === 'bosque_rio' && (h % 7 === 0)) {
                            cell.tileKey = 'tile_water_lily';
                        } else {
                            cell.tileKey = (h & 1) ? 'tile_water_1' : 'tile_water_2';
                        }
                    } else if (zoneId === 'pradera') {
                        if (cell.groundType === 'DIRT') {
                            cell.tileLayer = 1;
                            cell.tileKey = (h & 1) ? 'tile_dirt_1' : 'tile_dirt_2';
                        } else {
                            cell.tileLayer = 2;
                            if (patch > 0.72) {
                                cell.tileKey = (h % 3 === 0) ? 'tile_grass_flowers' : 'tile_grass_3';
                            } else if (patch < -0.65) {
                                cell.tileKey = (h & 1) ? 'tile_grass_2' : 'tile_grass_forest';
                            } else {
                                cell.tileKey = (h % 3 === 0) ? 'tile_grass_3' : 'tile_grass_1';
                            }
                        }
                    } else if (zoneId === 'aldea_campo') {
                        if (cell.groundType === 'DIRT') {
                            cell.tileLayer = 1;
                            cell.tileKey = (h % 4 === 0) ? 'tile_dirt_cracked' : ((h & 1) ? 'tile_dirt_1' : 'tile_dirt_2');
                        } else {
                            cell.tileLayer = 2;
                            if (patch > 0.55) {
                                cell.tileKey = (h % 4 === 0) ? 'tile_grass_flowers' : 'tile_grass_gold';
                            } else {
                                cell.tileKey = (h & 1) ? 'tile_grass_1' : 'tile_grass_3';
                            }
                        }
                    } else if (zoneId === 'bosque_rio') {
                        if (cell.groundType === 'DIRT') {
                            cell.tileLayer = 1;
                            cell.tileKey = (h & 1) ? 'tile_marsh_1' : 'tile_dirt_1';
                        } else {
                            cell.tileLayer = 2;
                            if (patch > 0.65) {
                                cell.tileKey = (h % 3 === 0) ? 'tile_grass_flowers' : 'tile_grass_olive';
                            } else if (patch < -0.45) {
                                cell.tileKey = (h & 1) ? 'tile_grass_forest' : 'tile_grass_2';
                            } else {
                                cell.tileKey = (h & 1) ? 'tile_grass_1' : 'tile_grass_2';
                            }
                        }
                    } else if (zoneId === 'bosque_magico') {
                        if (patch < -0.85) {
                            cell.tileLayer = 1;
                            cell.tileKey = (h & 1) ? 'tile_marsh_cracked' : 'tile_ice_2';
                        } else {
                            cell.tileLayer = 2;
                            if (patch > 0.45) {
                                cell.tileKey = (h & 1) ? 'tile_magic_2' : 'tile_magic_1';
                            } else {
                                cell.tileKey = (h % 3 === 0) ? 'tile_magic_short' : 'tile_magic_1';
                            }
                        }
                    } else if (zoneId === 'montanas_nevadas') {
                        if (patch < -0.6) {
                            cell.tileLayer = 1;
                            cell.tileKey = (h & 1) ? 'tile_ice_1' : 'tile_marsh_cracked';
                        } else {
                            cell.tileLayer = 2;
                            cell.tileKey = (patch > 0.4 && (h & 1)) ? 'tile_snow_tuft' : ((h & 1) ? 'tile_snow_1' : 'tile_snow_2');
                        }
                    } else if (zoneId === 'zonas_hielo') {
                        cell.tileLayer = 1;
                        if (patch > 0.5) {
                            cell.tileKey = (h & 1) ? 'tile_snow_1' : 'tile_snow_tuft';
                        } else if (patch < -0.4) {
                            cell.tileKey = 'tile_ice_crystal';
                        } else {
                            cell.tileKey = (h & 1) ? 'tile_ice_1' : 'tile_ice_2';
                        }
                    } else if (zoneId === 'playa') {
                        if (cell.groundType === 'GRASS') {
                            cell.tileLayer = 2;
                            cell.tileKey = (h & 1) ? 'tile_grass_gold' : 'tile_grass_1';
                        } else {
                            cell.tileLayer = 1;
                            if (patch > 0.65 && cell.type === RESOURCES.EMPTY) {
                                cell.tileKey = (h & 1) ? 'tile_sand_tuft' : 'tile_sand_2';
                            } else {
                                cell.tileKey = (h % 3 === 0) ? 'tile_sand_pebble' : ((h & 1) ? 'tile_sand_1' : 'tile_sand_flat');
                            }
                        }
                    } else if (zoneId === 'desierto') {
                        cell.tileLayer = 1;
                        if (patch > 0.7 && cell.type === RESOURCES.EMPTY && (h % 4 === 0)) {
                            cell.tileKey = 'tile_desert_shrub';
                        } else if (patch < -0.5) {
                            cell.tileKey = 'tile_desert_cracked';
                        } else if (patch > 0.3) {
                            cell.tileKey = (h & 1) ? 'tile_sand_tuft' : 'tile_sand_2';
                        } else {
                            cell.tileKey = (h % 3 === 0) ? 'tile_sand_pebble' : ((h & 1) ? 'tile_sand_1' : 'tile_sand_flat');
                        }
                    } else if (zoneId === 'cementerio_animales') {
                        cell.tileLayer = 1;
                        if (cell.type === RESOURCES.EMPTY && (h % 24 === 0)) {
                            cell.tileKey = 'tile_cemetery_skull';
                            cell.tileFlip = false;
                        } else if (patch > 0.55 && cell.type === RESOURCES.EMPTY && (h % 3 === 0)) {
                            cell.tileKey = 'tile_desert_shrub';
                        } else if (patch < -0.45) {
                            cell.tileKey = (h & 1) ? 'tile_marsh_cracked' : 'tile_desert_cracked';
                        } else {
                            cell.tileKey = (h & 1) ? 'tile_cemetery_1' : 'tile_cemetery_2';
                        }
                    } else {
                        cell.tileLayer = 2;
                        cell.tileKey = 'tile_grass_1';
                    }
                }
            }
            world._bgSyncedKey = syncKey;
            this._bakedZoneKey = null; // Forzar re-bake del lienzo HD de la zona
        } catch (err) {
            console.warn('No se pudo sincronizar la zona:', err);
            world._bgSyncedKey = syncKey;
        }
    }

    // ─── Renderizador de Suelo Isométrico HD Pre-Horneado (Nitidez 4K a 60 FPS) ──
    drawHDGround(world, bgX, bgY, bgW, bgH, dpr) {
        const zoneId = world.currentZoneId || 'pradera';
        const bakeKey = `${world._bgSyncedKey || zoneId}`;

        if (!this._zoneGroundCanvas || this._bakedZoneKey !== bakeKey) {
            const BAKE_SCALE = 3; // 3840 x 1920 píxeles reales para máxima nitidez en ZOOM = 3
            const cw = Math.round(bgW * BAKE_SCALE);
            const ch = Math.round(bgH * BAKE_SCALE);

            if (!this._zoneGroundCanvas) {
                this._zoneGroundCanvas = document.createElement('canvas');
            }
            if (this._zoneGroundCanvas.width !== cw || this._zoneGroundCanvas.height !== ch) {
                this._zoneGroundCanvas.width = cw;
                this._zoneGroundCanvas.height = ch;
            }

            const gctx = this._zoneGroundCanvas.getContext('2d');
            gctx.save();
            gctx.imageSmoothingEnabled = true;
            gctx.imageSmoothingQuality = 'high';

            // Color base profundo según bioma para evitar cualquier hueco entre bordes
            const baseColors = {
                pradera: '#4d7c0f',
                aldea_campo: '#4d7c0f',
                bosque_rio: '#3f6212',
                bosque_magico: '#1e5b4a',
                montanas_nevadas: '#b8cfe6',
                zonas_hielo: '#8ab8e6',
                playa: '#d4a853',
                desierto: '#cfa24e',
                cementerio_animales: '#8c7658'
            };
            gctx.fillStyle = baseColors[zoneId] || '#4d7c0f';
            gctx.fillRect(0, 0, cw, ch);

            // Escalar sistema de coordenadas del bake al espacio del mundo trasladado por (-bgX, -bgY)
            gctx.scale(BAKE_SCALE, BAKE_SCALE);
            gctx.translate(-bgX, -bgY);

            // Recolectar todas las celdas y ordenarlas por capa (0=agua, 1=tierra/arena, 2=pasto) y profundidad (x+y)
            const cellsToDraw = [];
            for (let y = 0; y < world.height; y++) {
                for (let x = 0; x < world.width; x++) {
                    const cell = world.getCell(x, y);
                    if (!cell) continue;
                    cellsToDraw.push({
                        x, y,
                        layer: cell.tileLayer !== undefined ? cell.tileLayer : 2,
                        key: cell.tileKey || 'tile_grass_1',
                        flip: !!cell.tileFlip,
                        groundType: cell.groundType
                    });
                }
            }

            cellsToDraw.sort((a, b) => {
                if (a.layer !== b.layer) return a.layer - b.layer;
                const da = a.x + a.y;
                const db = b.x + b.y;
                if (da !== db) return da - db;
                return a.x - b.x;
            });

            // Tamaño con solapamiento orgánico (44x27.5 sobre celda de 32x16)
            const drawW = 44.0;
            const drawH = drawW * (160.0 / 256.0);
            const anchorX = drawW / 2.0;
            const anchorY = drawH * (90.0 / 160.0);

            for (const item of cellsToDraw) {
                const { cx, cy } = this.getIsoBase(item.x, item.y);

                // Si es agua o camino de tierra, pintar primero una base sólida de su color para que no asome el verde del fondo
                if (item.layer === 0) {
                    gctx.fillStyle = '#0ea5c6';
                    gctx.beginPath();
                    gctx.ellipse(cx, cy, 18, 9.5, 0, 0, Math.PI * 2);
                    gctx.fill();
                } else if (item.groundType === 'DIRT') {
                    gctx.fillStyle = '#9a6834';
                    gctx.beginPath();
                    gctx.ellipse(cx, cy, 18, 9.5, 0, 0, Math.PI * 2);
                    gctx.fill();
                }

                const tileImg = this.images ? this.images[item.key] : null;
                if (tileImg && tileImg.width) {
                    if (item.flip) {
                        gctx.save();
                        gctx.translate(cx, cy - anchorY);
                        gctx.scale(-1, 1);
                        gctx.drawImage(tileImg, -anchorX, 0, drawW, drawH);
                        gctx.restore();
                    } else {
                        gctx.drawImage(tileImg, cx - anchorX, cy - anchorY, drawW, drawH);
                    }
                }
            }

            gctx.restore();
            this._bakedZoneKey = bakeKey;
        }

        // Volcar el lienzo HD pre-horneado directamente a resolución nativa de pantalla
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';

        const screenX = (bgX - this.cameraX) * ZOOM * dpr;
        const screenY = (bgY - this.cameraY) * ZOOM * dpr;
        const screenW = bgW * ZOOM * dpr;
        const screenH = bgH * ZOOM * dpr;

        this.ctx.drawImage(this._zoneGroundCanvas, screenX, screenY, screenW, screenH);
        this.ctx.restore();
    }

    // ─── Detalles dinámicos 2.5D (ondas de agua en vivo, brisa en flores y esporas) ─
    drawTerrainDetails(world, agent, timestamp, viewW, viewH) {
        const ctx = this.ctx;
        ctx.save();

        const minScreenX = this.cameraX - 48;
        const maxScreenX = this.cameraX + viewW + 48;
        const minScreenY = this.cameraY - 48;
        const maxScreenY = this.cameraY + viewH + 48;

        const windTime = (timestamp || 0) * 0.002;

        for (let y = 0; y < world.height; y++) {
            for (let x = 0; x < world.width; x++) {
                const { cx, cy } = this.getIsoBase(x, y);
                if (cx < minScreenX || cx > maxScreenX || cy < minScreenY || cy > maxScreenY) continue;

                const cell = world.getCell(x, y);
                if (!cell || cell.type === RESOURCES.VOID) continue;

                const h = ((x * 374761393) ^ (y * 668265263) ^ ((x * y) * 1274126177)) >>> 0;
                const ox = ((h & 0xff) / 255 - 0.5) * 12;
                const oy = (((h >> 8) & 0xff) / 255 - 0.5) * 6;
                const px = cx + ox;
                const py = cy + oy;

                // Brillos de agua animados sobre ríos, lagunas y mar
                if (cell.type === RESOURCES.WATER || cell.groundType === 'WATER') {
                    if ((h % 3) === 0) {
                        const waveOffset = Math.sin(windTime * 1.4 + x * 0.7 + y * 0.5) * 2.2;
                        const waveAlpha = (0.18 + 0.14 * Math.sin(windTime * 1.8 + x + y)).toFixed(2);
                        ctx.strokeStyle = `rgba(224, 242, 254, ${waveAlpha})`;
                        ctx.lineWidth = 0.85;
                        ctx.lineCap = 'round';
                        ctx.beginPath();
                        ctx.moveTo(px - 3.5 + waveOffset, py);
                        ctx.quadraticCurveTo(px + waveOffset, py - 1.1, px + 3.5 + waveOffset, py);
                        ctx.stroke();
                    }
                    continue;
                }

                if (cell.biome === BIOMES.PINE) {
                    // Bosque mágico: esporas luminosas flotando suavemente
                    if ((h % 100) < 18 && cell.type === RESOURCES.EMPTY) {
                        const glow = (0.45 + 0.35 * Math.sin(windTime * 1.5 + x + y)).toFixed(2);
                        const floatY = Math.cos(windTime * 1.2 + x * 0.5) * 1.5;
                        ctx.fillStyle = (h & 1) ? `rgba(56, 189, 248, ${glow})` : `rgba(192, 132, 252, ${glow})`;
                        ctx.beginPath();
                        ctx.arc(px, py - 2.0 + floatY, 1.15, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
        }

        ctx.restore();
    }

    // ─── Puntos de capacidad (sutiles en la base del recurso) ───────────────────
    drawResourceDots(x, y, capacity) {
        const { cx, sy } = this.getIsoBase(x, y);
        const startX = cx - (capacity * 4) / 2 + 2;
        const dotY = sy + ISO_H - 1;
        for (let i = 0; i < capacity; i++) {
            this.ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
            this.ctx.beginPath();
            this.ctx.arc(startX + i * 4, dotY, 1.4, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.fillStyle = '#fde68a';
            this.ctx.beginPath();
            this.ctx.arc(startX + i * 4, dotY, 0.95, 0, Math.PI * 2);
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
            // Detect if actually moving visually
            moving = Math.abs(entity.renderX - entity.x) > 0.05 || Math.abs(entity.renderY - entity.y) > 0.05;
            
            // 125ms per frame = 500ms per cycle
            let animSpeed = 125; 
            let fCount = 4;
            frame = moving ? Math.floor(t / animSpeed) % fCount : 0;
            
            // Wakfu style: Velocidad lineal constante (aprox. 1 casillero cada 500ms)
            let diffX = entity.x - entity.renderX;
            let diffY = entity.y - entity.renderY;
            let dist = Math.sqrt(diffX * diffX + diffY * diffY);
            let speed = 0.033; // 1 unit / ~30 frames (500ms at 60fps)

            if (dist > speed) {
                entity.renderX += (diffX / dist) * speed;
                entity.renderY += (diffY / dist) * speed;
            } else {
                entity.renderX = entity.x;
                entity.renderY = entity.y;
            }
        } else {
            // Lerp normal para enemigos y lobo
            entity.renderX += (entity.x - entity.renderX) * 0.15;
            entity.renderY += (entity.y - entity.renderY) * 0.15;
        }

        const { cx, sy, baseY } = this.getIsoBase(entity.renderX, entity.renderY);

        // Animación de bobbing mientras se mueve
        const movingAny = !!(entity.dx || entity.dy || entity.lastDx || entity.lastDy);
        let bob = 0;
        if (movingAny && type !== 'agent') {
            bob = Math.abs(Math.sin(t * 0.014)) * 3.5;
        }
        const bodyY = baseY - 6 - bob;

        // Sombra elíptica sobre el tile
        this.ctx.fillStyle = 'rgba(0,0,0,0.18)';
        this.ctx.beginPath();
        this.ctx.ellipse(cx, baseY, 5, 2.5, 0, 0, Math.PI * 2);
        this.ctx.fill();

        if (type === 'agent') {
            let dir = 0; // 0=frente, 1=espalda, 2=izq, 3=der
            
            // Calculate direction based on visual delta (diffX / diffY are computed above)
            if (typeof entity.renderDir === 'undefined') entity.renderDir = 3; // Default right
            
            if (moving) {
                let dx = entity.x - entity.renderX;
                let dy = entity.y - entity.renderY;
                
                if (dx > 0.05) entity.renderDir = 3;
                else if (dx < -0.05) entity.renderDir = 2;
                else if (dy < -0.05) entity.renderDir = 1;
                else if (dy > 0.05) entity.renderDir = 0;
            }
            
            dir = entity.renderDir;
            
            // Adjust frames for fluid walks
            let fCount = 4;
            let animSpeed = 125;
            
            if (dir === 0) {
                fCount = 35;
                animSpeed = 28;
            } else if (dir === 1) {
                fCount = 29;
                animSpeed = 34;
            } else if (dir === 2) {
                fCount = 32;
                animSpeed = 31;
            } else if (dir === 3) {
                fCount = 32;
                animSpeed = 31;
            }
            
            frame = moving ? Math.floor(t / animSpeed) % fCount : 0;

            
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
                let fW = img.width || 512;
                let fH = img.height || 512;
                let drawH = 42;
                let drawW = drawH * (fW / fH);

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
