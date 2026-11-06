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
        if (bgImg) {
            this.ctx.save();
            // Reseteamos la escala para no perder calidad. Si lo dibujamos achicado
            // y el canvas luego le aplica el ZOOMx3, se ve borroso.
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);

            const coverScale = Math.max(bgW / bgImg.width, bgH / bgImg.height);
            
            // Calculamos el tamaño y posición en píxeles reales de la pantalla
            const drawW = bgImg.width  * coverScale * ZOOM * dpr;
            const drawH = bgImg.height * coverScale * ZOOM * dpr;
            
            // Posición base del fondo en el mundo, ajustada por la cámara, y convertida a pantalla
            const screenX = (bgX - this.cameraX) * ZOOM * dpr;
            const screenY = (bgY - this.cameraY) * ZOOM * dpr;
            
            // Centrar la imagen (cover) dentro de esos límites en pantalla
            const drawX = screenX + (bgW * ZOOM * dpr - drawW) / 2;
            const drawY = screenY + (bgH * ZOOM * dpr - drawH) / 2;

            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';
            this.ctx.drawImage(bgImg, drawX, drawY, drawW, drawH);

            this.ctx.restore();

            // Sincronizar píxeles del fondo con la grilla del mundo (agua, caminos de tierra, pasto real)
            this.syncZoneWithBackground(world, bgImg, bgX, bgY, bgW, bgH);
        } else {
            this.ctx.fillStyle = '#111';
            this.ctx.fillRect(bgX, bgY, bgW, bgH);
        }

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

    // ─── Sincronización inteligente entre los píxeles del fondo y la grilla ─────
    syncZoneWithBackground(world, bgImg, bgX, bgY, bgW, bgH) {
        if (!world || !world.grid || !bgImg || !bgImg.width) return;
        const syncKey = `${world.currentZoneId}_${bgImg.src}`;
        if (world._bgSyncedKey === syncKey) return;

        try {
            const sampleW = 384;
            const sampleH = 216;
            if (!this._bgSampleCanvas) {
                this._bgSampleCanvas = document.createElement('canvas');
                this._bgSampleCanvas.width = sampleW;
                this._bgSampleCanvas.height = sampleH;
                this._bgSampleCtx = this._bgSampleCanvas.getContext('2d', { willReadFrequently: true });
            }
            const sctx = this._bgSampleCtx;
            sctx.clearRect(0, 0, sampleW, sampleH);
            sctx.drawImage(bgImg, 0, 0, sampleW, sampleH);
            const imgData = sctx.getImageData(0, 0, sampleW, sampleH).data;

            const coverScale = Math.max(bgW / bgImg.width, bgH / bgImg.height);
            const worldDrawW = bgImg.width * coverScale;
            const worldDrawH = bgImg.height * coverScale;
            const worldDrawX = bgX + (bgW - worldDrawW) / 2;
            const worldDrawY = bgY + (bgH - worldDrawH) / 2;

            const zoneId = world.currentZoneId || 'pradera';
            const hasRealWater = (zoneId === 'bosque_rio' || zoneId === 'playa');

            for (let y = 0; y < world.height; y++) {
                for (let x = 0; x < world.width; x++) {
                    const cell = world.getCell(x, y);
                    if (!cell) continue;

                    const { cx, cy } = this.getIsoBase(x, y);
                    const u = Math.max(0, Math.min(0.999, (cx - worldDrawX) / worldDrawW));
                    const v = Math.max(0, Math.min(0.999, (cy - worldDrawY) / worldDrawH));
                    const px = Math.floor(u * sampleW);
                    const py = Math.floor(v * sampleH);
                    const idx = (py * sampleW + px) * 4;
                    const r = imgData[idx];
                    const g = imgData[idx + 1];
                    const b = imgData[idx + 2];

                    cell.groundColor = [r, g, b];

                    const isWaterPixel = hasRealWater && (
                        (b > r + 15 && b > g - 20 && b > 75 && r < 145) ||
                        (b > 125 && g > 105 && r < 115)
                    );
                    const isGreenGrass = !isWaterPixel && (g > r + 6 && g > b + 16 && g > 45);
                    const isDirtRoad = !isWaterPixel && !isGreenGrass && (r > g + 8 && r > b + 18 && r > 75);

                    if (isWaterPixel) {
                        cell.groundType = 'WATER';
                        // Quitar árboles, rocas o arbustos generados encima de ríos o mar
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
                        // En Aldea y Campo o Bosque y Río, despejar árboles que bloqueen el centro de caminos de tierra
                        if ((zoneId === 'aldea_campo' || zoneId === 'bosque_rio') && (r > g + 16 && r > b + 28)) {
                            if (cell.type === RESOURCES.WOOD || cell.type === RESOURCES.FOOD || cell.type === RESOURCES.BUSH) {
                                cell.type = RESOURCES.EMPTY;
                                cell.capacity = 0;
                            }
                        }
                    } else {
                        cell.groundType = 'OTHER';
                    }
                }
            }
            world._bgSyncedKey = syncKey;
        } catch (err) {
            console.warn('No se pudo muestrear el fondo de la zona:', err);
            world._bgSyncedKey = syncKey;
        }
    }

    // ─── Detalles 2.5D del terreno (micro-vegetación, flores, piedras y senderos) ─
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
                if (!cell || cell.type === RESOURCES.WATER || cell.type === RESOURCES.VOID) continue;
                if (cell.groundType === 'WATER') continue;

                // Hash determinístico por celda (x, y)
                const h = ((x * 374761393) ^ (y * 668265263) ^ ((x * y) * 1274126177)) >>> 0;
                const ox = ((h & 0xff) / 255 - 0.5) * 14;
                const oy = (((h >> 8) & 0xff) / 255 - 0.5) * 7;
                const px = cx + ox;
                const py = cy + oy;

                if (cell.biome === BIOMES.GRASS) {
                    // Solo dibujar pasto y flores si el píxel real del fondo es pasto verde (no tierra ni río)
                    if (cell.groundType && cell.groundType !== 'GRASS') continue;

                    const gc = cell.groundColor || [88, 145, 38];
                    const darkGreen = `rgb(${Math.max(15, gc[0] - 32)}, ${Math.max(35, gc[1] - 42)}, ${Math.max(8, gc[2] - 18)})`;
                    const midGreen  = `rgb(${Math.max(25, gc[0] - 12)}, ${Math.max(55, gc[1] - 14)}, ${Math.max(12, gc[2] - 8)})`;
                    const lightTip  = `rgb(${Math.min(235, gc[0] + 34)}, ${Math.min(248, gc[1] + 42)}, ${Math.min(180, gc[2] + 18)})`;

                    // 1. Pinceladas sutiles de textura sobre el pasto para dar nitidez en ZOOM x3
                    if ((h % 3) !== 0) {
                        ctx.fillStyle = (h & 1) ? 'rgba(22, 58, 12, 0.08)' : 'rgba(180, 235, 65, 0.07)';
                        ctx.beginPath();
                        ctx.ellipse(px, py, 6.5 + (h % 4), 2.6 + (h % 2), 0, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    // 2. Matas de pasto 2.5D estilo pintura (como las raíces de los árboles)
                    if ((h % 100) < 48) {
                        const sway = Math.sin(windTime + x * 0.45 + y * 0.35) * 0.95;
                        const bladeCount = 3 + (h % 3);

                        // Sombra suave en la raíz de la mata
                        ctx.fillStyle = 'rgba(18, 45, 10, 0.22)';
                        ctx.beginPath();
                        ctx.ellipse(px, py + 0.9, 3.6, 1.4, 0, 0, Math.PI * 2);
                        ctx.fill();

                        for (let b = 0; b < bladeCount; b++) {
                            const normB = (b - (bladeCount - 1) / 2);
                            const spread = normB * 1.85;
                            const bh = 3.6 + ((h >> (b + 2)) % 3) * 1.15 - Math.abs(normB) * 0.45;
                            const tipX = px + spread * 1.35 + sway;
                            const tipY = py - bh;

                            // Hoja cónica rellena (más gruesa en la base y fina en la punta)
                            ctx.fillStyle = (b % 2 === 0) ? darkGreen : midGreen;
                            ctx.beginPath();
                            ctx.moveTo(px + spread * 0.35 - 0.85, py + 0.4);
                            ctx.quadraticCurveTo(px + spread * 0.75 + sway * 0.4, py - bh * 0.55, tipX, tipY);
                            ctx.quadraticCurveTo(px + spread * 0.95 + sway * 0.4, py - bh * 0.45, px + spread * 0.35 + 0.85, py + 0.4);
                            ctx.closePath();
                            ctx.fill();

                            // Brillo superior iluminado en las hojas centrales
                            if (b === 1 || b === bladeCount - 2) {
                                ctx.strokeStyle = lightTip;
                                ctx.lineWidth = 0.65;
                                ctx.lineCap = 'round';
                                ctx.beginPath();
                                ctx.moveTo(px + spread * 0.75 + sway * 0.5, py - bh * 0.5);
                                ctx.lineTo(tipX, tipY);
                                ctx.stroke();
                            }
                        }
                    }

                    // 3. Agrupaciones orgánicas (clusters) de florcitas silvestres en claros naturales
                    const meadowCluster = Math.sin(x * 0.32 + y * 0.24) * Math.cos(x * 0.21 - y * 0.29);
                    const flowerRoll = (h >> 12) % 100;
                    if (meadowCluster > 0.32 && flowerRoll < 22 && cell.type === RESOURCES.EMPTY) {
                        // El color se define por manchón/cluster para que las flores cercanas sean de la misma especie
                        const patchType = Math.abs(Math.floor(Math.sin(x * 0.14 + y * 0.17) * 10)) % 3;
                        const petalColor = patchType === 0 ? '#fffbeb' : (patchType === 1 ? '#fde047' : '#bae6fd');
                        const centerColor = patchType === 1 ? '#b45309' : '#facc15';
                        const flowerCount = 1 + (h % 3);

                        for (let f = 0; f < flowerCount; f++) {
                            const fh = (h >> (f * 5)) & 0xff;
                            const fx = px + ((fh & 0x0f) / 15 - 0.5) * 7.5;
                            const fy = py + (((fh >> 4) & 0x0f) / 15 - 0.5) * 3.8 - 1.2;

                            // Hojitas verdes en la base de la flor
                            ctx.fillStyle = darkGreen;
                            ctx.beginPath();
                            ctx.ellipse(fx, fy + 1.1, 1.8, 0.8, 0, 0, Math.PI * 2);
                            ctx.fill();

                            // Pétalos suaves
                            ctx.fillStyle = petalColor;
                            for (let p = 0; p < 4; p++) {
                                const ang = (p * Math.PI) / 2 + (fh % 3) * 0.25;
                                ctx.beginPath();
                                ctx.arc(fx + Math.cos(ang) * 0.95, fy + Math.sin(ang) * 0.75, 0.8, 0, Math.PI * 2);
                                ctx.fill();
                            }
                            // Centro
                            ctx.fillStyle = centerColor;
                            ctx.beginPath();
                            ctx.arc(fx, fy, 0.6, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    } else if (flowerRoll === 45 && cell.type === RESOURCES.EMPTY) {
                        // Piedrita natural ocasional
                        ctx.fillStyle = 'rgba(20, 40, 10, 0.22)';
                        ctx.beginPath();
                        ctx.ellipse(px, py + 0.6, 2.3, 1.1, 0, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.fillStyle = '#78716c';
                        ctx.beginPath();
                        ctx.ellipse(px, py, 1.9, 1.1, 0, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.fillStyle = '#d6d3d1';
                        ctx.beginPath();
                        ctx.ellipse(px - 0.4, py - 0.3, 1.0, 0.5, 0, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else if (cell.biome === BIOMES.DESERT || cell.biome === BIOMES.SAND) {
                    if ((h % 100) < 16 && cell.type === RESOURCES.EMPTY) {
                        ctx.strokeStyle = 'rgba(180, 120, 50, 0.20)';
                        ctx.lineWidth = 0.8;
                        ctx.beginPath();
                        ctx.arc(px, py + 3, 5, -Math.PI * 0.75, -Math.PI * 0.25);
                        ctx.stroke();
                    }
                } else if (cell.biome === BIOMES.SNOW) {
                    if ((h % 100) < 18 && cell.type === RESOURCES.EMPTY) {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
                        ctx.beginPath();
                        ctx.ellipse(px, py, 4, 1.8, 0, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else if (cell.biome === BIOMES.PINE) {
                    // Bosque mágico: esporas luminosas (fix de rgba)
                    if ((h % 100) < 20 && cell.type === RESOURCES.EMPTY) {
                        const glow = (0.45 + 0.35 * Math.sin(windTime * 1.5 + x + y)).toFixed(2);
                        ctx.fillStyle = (h & 1) ? `rgba(56, 189, 248, ${glow})` : `rgba(192, 132, 252, ${glow})`;
                        ctx.beginPath();
                        ctx.arc(px, py - 1.5, 1.15, 0, Math.PI * 2);
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
