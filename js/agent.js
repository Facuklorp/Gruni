// js/agent.js
import { RESOURCES } from './world.js';

export const STATES = {
    WANDERING: 'Deambulando',
    SEEK_WATER: 'Buscando Agua',
    SEEK_FOOD: 'Buscando Comida',
    SEEK_WOOD: 'Buscando Madera',
    SEEK_ROCK: 'Buscando Roca',
    GATHERING: 'Recolectando',
    DRINKING: 'Bebiendo',
    EATING: 'Comiendo',
    BUILDING_HOUSE: 'Construyendo Casa',
    DEFENDING: '¡Defendiendo Casa!',
    RESTORING_HOUSE: 'Restaurando Casa',
    SEEK_BOOK: 'Buscando Libro Mágico',
    BUILDING_TELESCOPE: 'Construyendo Telescopio',
    BUILDING_WALL: 'Construyendo Muralla'
};

export class Agent {
    constructor(world) {
        this.world = world;
        this.x = Math.floor(this.world.width / 2);
        this.y = Math.floor(this.world.height / 2);
        // Find safe spawn
        while (this.world.grid[this.y] && this.world.grid[this.y][this.x] && (this.world.grid[this.y][this.x].type === RESOURCES.WATER || this.world.grid[this.y][this.x].type === RESOURCES.ROCK)) {
            this.x++;
            if (this.x >= this.world.width) { this.x = 0; this.y++; }
            if (this.y >= this.world.height) { this.x = 0; this.y = 0; break; }
        }
        
        this.hunger = 0;
        this.thirst = 0;
        
        this.inventory = {
            wood: 0,
            rock: 0,
            bridges: 0,
            pickaxes: 0
        };

        this.swordDurability = 0; // max 5
        this.isAttacking = false;

        this.hp = 10;
        this.maxHp = 10;
        this.applesEaten = 0;
        this.koTimer = 0;

        this.state = STATES.WANDERING;
        this.target = null;
        this.emotion = 'NEUTRAL';
        this.happyTimer = 0;
        this.bookFound = false;
        
        // Timer to escape local minima
        this.wanderTimer = 0;
        this.ignoreTarget = null;

        this.stuckTimer = 0;
        this.emergencyMission = null;
        this.craftedFirstPickaxe = false;
        this.craftedFirstSword = false;
        this.craftedFirstBridge = false;
        this.home = null;
        this.homeStage = 0;
        
        this.branches = []; 
        this.hasTelescope = false;
        this.inaccessibleBooks = []; // Libros bloqueados por agua sin madera
        this.inaccessibleTargets = []; // Cualquier recurso bloqueado por agua sin madera
        this.eclipseWarning = false;
        
        // Animaciones
        this.dx = 1;
        this.animationTimer = 0;
        this.lastGathered = null;
    }

    update(enemies, eclipseWarning = false) {
        this.animationTimer++;
        this.isAttacking = false;
        this.isActioning = false;
        this.actionType = null;
        this.actionTimer = 0;
        this.eclipseWarning = eclipseWarning;
        if (this.koTimer > 0) {
            this.koTimer--;
            this.emotion = 'KO';
            if (this.koTimer <= 0) {
                this.hp = this.maxHp; // Revive
            }
            return;
        }

        this.hunger += 0.5;
        this.thirst += 0.8;

        if (this.hunger > 100) this.hunger = 100;
        if (this.thirst > 100) this.thirst = 100;

        if (this.happyTimer > 0) {
            this.happyTimer--;
        }

        this.craft();

        // Lógica de Combate Defensivo
        let attacked = false;
        if (this.swordDurability > 0) {
            for (let e of enemies) {
                if (e.hp > 0) {
                    let dist = Math.abs(this.x - e.x) + Math.abs(this.y - e.y);
                    if (dist <= 1) {
                        this.isAttacking = true;
                        // 70% chance de acertar el golpe
                        if (Math.random() > 0.3) {
                            e.takeDamage(1);
                        }
                        this.swordDurability--;
                        attacked = true;
                        break; // Solo un ataque por turno
                    }
                }
            }
        }

        if (!attacked) {
            this.decideState(enemies);
            this.act();
        }
        this.updateEmotion();

        // Determinar acción activa para sprites animados
        if (this.isAttacking || this.state === STATES.DEFENDING) {
            this.actionType = 'ATTACK';
        } else if (this.state === STATES.GATHERING) {
            this.actionType = (this.lastGathered === 'ROCK') ? 'MINE' : 'CHOP';
        } else if (this.state === STATES.BUILDING_HOUSE || this.state === STATES.RESTORING_HOUSE || 
                   this.state === STATES.BUILDING_TELESCOPE || this.state === STATES.BUILDING_WALL) {
            this.actionType = 'BUILD';
        } else {
            this.actionType = null;
        this.actionTimer = 0;
        }
    }

    craft(type = null) {
        // Auto-craft: check if we should start building a house
        if (this.homeStage < 3 && this.emergencyMission !== 'BUILD_HOUSE' && this.craftedFirstSword) {
            if (this.inventory.wood >= 3 && this.inventory.rock >= 3) {
                this.emergencyMission = 'BUILD_HOUSE';
                this.happyTimer = 5;
            }
        }

        // Typed craft from emergency missions
        if (type === 'PICKAXE' && this.inventory.wood >= 2 && this.inventory.rock >= 2) {
            this.inventory.wood -= 2;
            this.inventory.rock -= 2;
            this.inventory.pickaxes++;
            this.craftedFirstPickaxe = true;
            this.happyTimer = 10;
            this.emergencyMission = null;
        } else if (type === 'SWORD' && this.inventory.wood >= 2 && this.inventory.rock >= 2) {
            this.inventory.wood -= 2;
            this.inventory.rock -= 2;
            this.swordDurability = this.branches.includes('BLACKSMITH') ? 15 : 5;
            this.craftedFirstSword = true;
            this.happyTimer = 5;
            this.emergencyMission = null;
        }
    }

    takeDamage(amount) {
        if (this.koTimer > 0) return;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.koTimer = 10; // KO state for 10 ticks (5 secs)
            this.inventory = { wood: 0, rock: 0, pickaxes: 0 };
            this.swordDurability = 0;
            this.target = null;
            this.emergencyMission = null;
        }
    }

    updateEmotion(enemies) {
        if (this.koTimer > 0) {
            this.emotion = 'KO';
            return;
        }

        let seeEnemy = false;
        if (enemies) {
            for (let e of enemies) {
                if (e.hp > 0) {
                    let dist = Math.abs(this.x - e.x) + Math.abs(this.y - e.y);
                    if (dist <= 4) {
                        seeEnemy = true;
                        break;
                    }
                }
            }
        }

        if (this.isAttacking || seeEnemy || this.state === STATES.DEFENDING) {
            this.emotion = 'ANGRY';
        } else if (this.hunger > 80 || this.thirst > 80) {
            this.emotion = 'ANGRY';
        } else if ((this.state === STATES.SEEK_WATER || this.state === STATES.SEEK_FOOD) && !this.target) {
            this.emotion = 'SAD';
        } else if (this.happyTimer > 0) {
            this.emotion = 'HAPPY';
        } else {
            this.emotion = 'NEUTRAL';
        }
    }

    decideState(enemies) {
        let enemyThreat = false;
        let targetEnemy = null;
        let closestDist = Infinity;
        
        let ix = this.ignoreTarget ? this.ignoreTarget.x : -1;
        let iy = this.ignoreTarget ? this.ignoreTarget.y : -1;
        // Clear ignoreTarget after one decision cycle so it doesn't permanently block
        this.ignoreTarget = null;

        // Si conseguimos madera, todos los targets inaccesibles pueden volver a intentarse
        if (this.inventory.wood > 0) {
            this.inaccessibleBooks = [];
            this.inaccessibleTargets = [];
        }

        // Helper: filtra targets bloqueados por agua de findNearest
        const findNearestAccessible = (x, y, types, ignX = -1, ignY = -1) => {
            if (!Array.isArray(types)) types = [types];
            let nearest = null;
            let minDist = Infinity;
            for (let ty = 0; ty < this.world.height; ty++) {
                for (let tx = 0; tx < this.world.width; tx++) {
                    if (tx === ignX && ty === ignY) continue;
                    if (this.inaccessibleTargets.some(t => t.x === tx && t.y === ty)) continue;
                    if (types.includes(this.world.grid[ty][tx].type)) {
                        let dist = Math.abs(tx - x) + Math.abs(ty - y);
                        if (dist < minDist) { minDist = dist; nearest = {x: tx, y: ty}; }
                    }
                }
            }
            return nearest;
        };

        let bookTarget = findNearestAccessible(this.x, this.y, RESOURCES.BOOK, ix, iy);
        if (bookTarget && this.inaccessibleBooks.some(b => b.x === bookTarget.x && b.y === bookTarget.y)) {
            bookTarget = null;
        }
        if (bookTarget && !enemyThreat && this.branches.length < 3) {
            // Cancelar misiones secundarias si aparece un libro
            if (this.emergencyMission === 'BUILD_WALLS' || this.emergencyMission === 'BUILD_TELESCOPE') {
                this.emergencyMission = null;
            }
            
            if (!this.emergencyMission) {
                this.state = STATES.SEEK_BOOK;
                this.target = bookTarget;
                return;
            }
        }

        if (this.home) {
            if (!this._settlementCleared) {
                this.clearSettlementClearing(this.home.x, this.home.y);
                this._settlementCleared = true;
            }
            let hx = this.home.x, hy = this.home.y;
            let cells = [
                this.world.getCell(hx, hy),
                this.world.getCell(hx+1, hy),
                this.world.getCell(hx, hy+1),
                this.world.getCell(hx+1, hy+1)
            ];
            let houseExists = false;
            let totalCap = 0;
            for (let c of cells) {
                if (c && c.type === RESOURCES.HOUSE) {
                    houseExists = true;
                    totalCap += c.capacity;
                }
            }

            if (!houseExists) {
                this.home = null; // La casa fue destruida totalmente
                this.homeStage = 0;
                this.emotion = 'SAD';
            } else {
                for (let e of enemies) {
                    if (e.hp > 0) {
                        let distToHouse = Math.abs(e.x - this.home.x) + Math.abs(e.y - this.home.y);
                        if (distToHouse <= 6) { // Enemigo cerca de la casa
                            let distToGruni = Math.abs(this.x - e.x) + Math.abs(this.y - e.y);
                            if (distToGruni < closestDist) {
                                closestDist = distToGruni;
                                targetEnemy = e;
                                enemyThreat = true;
                            }
                        }
                    }
                }
                if (!enemyThreat && totalCap < 40) {
                    if (this.swordDurability === 0) {
                        if (this.emergencyMission !== 'SWORD') this.emergencyMission = 'SWORD';
                    } else {
                        if (this.emergencyMission !== 'RESTORE_HOUSE') this.emergencyMission = 'RESTORE_HOUSE';
                    }
                } else if (this.emergencyMission === 'RESTORE_HOUSE') {
                    if (enemyThreat || totalCap >= 40) {
                        this.emergencyMission = null;
                    }
                }
                
                // Tareas de tiempo libre cuando la casa está en perfectas condiciones
                if (!enemyThreat && totalCap >= 40) {
                    if (!this.emergencyMission || this.emergencyMission === 'RESTORE_HOUSE') {
                        if (this.homeStage < 3) {
                            this.emergencyMission = 'BUILD_HOUSE';
                        } else if (this.branches.includes('ASTRONOMY') && !this.hasTelescope) {
                            this.emergencyMission = 'BUILD_TELESCOPE';
                        } else {
                            this.emergencyMission = 'BUILD_WALLS';
                        }
                    }
                }
            }
        }

        if (!enemyThreat && enemies) {
            for (let e of enemies) {
                if (e.hp > 0) {
                    let dist = Math.abs(this.x - e.x) + Math.abs(this.y - e.y);
                    if (dist <= 4) {
                        enemyThreat = true;
                        break;
                    }
                }
            }
        }

        // Si la casa está bajo ataque y TENEMOS espada, defendemos
        if (targetEnemy && this.swordDurability > 0) {
            this.state = STATES.DEFENDING;
            this.target = { x: targetEnemy.x, y: targetEnemy.y };
            return;
        }

        // Extreme Thirst/Hunger overrides emergency missions
        if (!enemyThreat) {
            if (this.thirst > 80) {
                let wTarget = findNearestAccessible(this.x, this.y, RESOURCES.WATER, ix, iy);
                if (wTarget) {
                    this.state = STATES.SEEK_WATER;
                    this.target = wTarget;
                    return;
                }
            }
            if (this.hunger > 80) {
                let fTarget = findNearestAccessible(this.x, this.y, RESOURCES.FOOD, ix, iy);
                if (fTarget) {
                    this.state = STATES.SEEK_FOOD;
                    this.target = fTarget;
                    return;
                }
            }
        }

        // Secuencia Tutorial
        if (!this.emergencyMission) {
            if (!this.craftedFirstPickaxe) {
                if (this.inventory.pickaxes === 0) this.emergencyMission = 'PICKAXE';
                else this.craftedFirstPickaxe = true;
            } else if (this.swordDurability === 0) {
                this.emergencyMission = 'SWORD';
            } else if (this.homeStage < 3) {
                this.emergencyMission = 'BUILD_HOUSE';
            } else if (this.branches.length > 0 && this.swordDurability === 0) {
                this.emergencyMission = 'SWORD';
            }
        }

        // MODO EMERGENCIA: Si estamos atrapados y necesitamos herramientas
        if (this.emergencyMission) {
            if (this.emergencyMission === 'PICKAXE') {
                if (this.inventory.wood < 2) {
                    let w = findNearestAccessible(this.x, this.y, [RESOURCES.WOOD, RESOURCES.BUSH], ix, iy);
                    if (w) { this.state = STATES.SEEK_WOOD; this.target = w; return; }
                } else if (this.inventory.rock < 2) {
                    let r = findNearestAccessible(this.x, this.y, RESOURCES.ROCK, ix, iy);
                    if (r) { this.state = STATES.SEEK_ROCK; this.target = r; return; }
                } else {
                    this.craft('PICKAXE');
                    this.state = STATES.WANDERING;
                    this.target = null;
                    return;
                }
            } else if (this.emergencyMission === 'SWORD') {
                if (this.inventory.wood < 2) {
                    let w = findNearestAccessible(this.x, this.y, [RESOURCES.WOOD, RESOURCES.BUSH], ix, iy);
                    if (w) { this.state = STATES.SEEK_WOOD; this.target = w; return; }
                } else if (this.inventory.rock < 2) {
                    let r = findNearestAccessible(this.x, this.y, RESOURCES.ROCK, ix, iy);
                    if (r) { this.state = STATES.SEEK_ROCK; this.target = r; return; }
                } else {
                    this.craft('SWORD');
                    this.state = STATES.WANDERING;
                    this.target = null;
                    return;
                }
            } else if (this.emergencyMission === 'BUILD_HOUSE') {
                if (this.inventory.wood < 3) {
                    let w = findNearestAccessible(this.x, this.y, [RESOURCES.WOOD, RESOURCES.BUSH], ix, iy);
                    if (w) { this.state = STATES.SEEK_WOOD; this.target = w; return; }
                } else if (this.inventory.rock < 3) {
                    let r = findNearestAccessible(this.x, this.y, RESOURCES.ROCK, ix, iy);
                    if (r) { this.state = STATES.SEEK_ROCK; this.target = r; return; }
                } else {
                    if (this.homeStage === 0) {
                        let empty = this.world.findNearest2x2Empty(this.x, this.y);
                        if (empty) { 
                            this.state = STATES.BUILDING_HOUSE; 
                            this.target = empty; 
                            return; 
                        } else {
                            this.emergencyMission = null;
                        }
                    } else {
                        this.state = STATES.BUILDING_HOUSE;
                        this.target = {x: this.home.x, y: this.home.y};
                        return;
                    }
                }
            } else if (this.emergencyMission === 'RESTORE_HOUSE') {
                if (this.inventory.wood >= 1) {
                    this.state = STATES.RESTORING_HOUSE;
                    this.target = { x: this.home.x, y: this.home.y };
                    return;
                } else {
                    let w = findNearestAccessible(this.x, this.y, [RESOURCES.WOOD, RESOURCES.BUSH], ix, iy);
                    if (w) { this.state = STATES.SEEK_WOOD; this.target = w; return; }
                }
            } else if (this.emergencyMission === 'BUILD_WALLS') {
                if (this.home) {
                    this.clearSettlementClearing(this.home.x, this.home.y);
                }
                if (this.inventory.wood >= 1) {
                    let emptyWallPos = null;
                    let hx = this.home.x, hy = this.home.y;
                    // Límites perfectamente centrados respecto a la casa (4.5 casillas a cada lado)
                    let minX = hx - 4, maxX = hx + 5;
                    let minY = hy - 4, maxY = hy + 5;
                    for (let y = minY; y <= maxY; y++) {
                        for (let x = minX; x <= maxX; x++) {
                            // Solo construir en el perímetro exterior
                            if (x > minX && x < maxX && y > minY && y < maxY) continue;
                            
                            // Dejar libre el acceso (portón de entrada) frente a la escalera y puerta de la casa
                            if (y === maxY && (x === hx || x === hx + 1)) continue;
                            
                            let cell = this.world.getCell(x, y);
                            if (cell && cell.type !== RESOURCES.WALL && cell.type !== RESOURCES.HOUSE) {
                                // Si está ignorado por estar trabado, pasamos al siguiente
                                if (this.ignoreTarget && this.ignoreTarget.x === x && this.ignoreTarget.y === y) continue;
                                if (cell.type !== RESOURCES.EMPTY) {
                                    this.world.setCell(x, y, RESOURCES.EMPTY);
                                }
                                emptyWallPos = {x, y};
                                break;
                            }
                        }
                        if (emptyWallPos) break;
                    }
                    if (emptyWallPos) {
                        this.state = STATES.BUILDING_WALL;
                        this.target = emptyWallPos;
                        return;
                    } else {
                        this.emergencyMission = null; // No hay más lugar para murallas
                    }
                } else {
                    let w = findNearestAccessible(this.x, this.y, [RESOURCES.WOOD, RESOURCES.BUSH], ix, iy);
                    if (w) { this.state = STATES.SEEK_WOOD; this.target = w; return; }
                }
            } else if (this.emergencyMission === 'BUILD_TELESCOPE') {
                if (this.inventory.wood >= 2 && this.inventory.rock >= 2) {
                    let empty = findNearestAccessible(this.x, this.y, RESOURCES.EMPTY, ix, iy);
                    if (empty) {
                        this.state = STATES.BUILDING_TELESCOPE;
                        this.target = empty;
                        return;
                    }
                } else if (this.inventory.wood < 2) {
                    let w = findNearestAccessible(this.x, this.y, [RESOURCES.WOOD, RESOURCES.BUSH], ix, iy);
                    if (w) { this.state = STATES.SEEK_WOOD; this.target = w; return; }
                } else if (this.inventory.rock < 2) {
                    let r = findNearestAccessible(this.x, this.y, RESOURCES.ROCK, ix, iy);
                    if (r) { this.state = STATES.SEEK_ROCK; this.target = r; return; }
                }
            }
        }

        let waterTarget = findNearestAccessible(this.x, this.y, RESOURCES.WATER, ix, iy);
        let foodTarget = findNearestAccessible(this.x, this.y, RESOURCES.FOOD, ix, iy);

        let waterPriority = this.thirst > 60 ? this.thirst : 0;
        let foodPriority = this.hunger > 60 ? this.hunger : 0;

        if (waterPriority > 0 || foodPriority > 0) {
            if (waterPriority >= foodPriority) {
                if (waterTarget) {
                    this.state = STATES.SEEK_WATER;
                    this.target = waterTarget;
                } else if (foodTarget && foodPriority > 0) {
                    this.state = STATES.SEEK_FOOD;
                    this.target = foodTarget;
                } else {
                    this.state = STATES.WANDERING;
                    this.target = null;
                }
            } else {
                if (foodTarget) {
                    this.state = STATES.SEEK_FOOD;
                    this.target = foodTarget;
                } else if (waterTarget && waterPriority > 0) {
                    this.state = STATES.SEEK_WATER;
                    this.target = waterTarget;
                } else {
                    this.state = STATES.WANDERING;
                    this.target = null;
                }
            }
            return;
        }

        let woodTarget = findNearestAccessible(this.x, this.y, [RESOURCES.WOOD, RESOURCES.BUSH], ix, iy);
        let rockTarget = findNearestAccessible(this.x, this.y, RESOURCES.ROCK, ix, iy);

        // Límites más altos para poder craftear herramientas caras
        if (this.inventory.wood < 5 && woodTarget) {
            this.state = STATES.SEEK_WOOD;
            this.target = woodTarget;
        } else if (this.inventory.rock < 4 && rockTarget) {
            this.state = STATES.SEEK_ROCK;
            this.target = rockTarget;
        } else {
            this.state = STATES.WANDERING;
            this.target = null;
        }

        // Action flags for animation
        if (this.target) {
            let targetCell = this.world.getCell(this.target.x, this.target.y);
            if (this.state === STATES.SEEK_WOOD && targetCell && (targetCell.type === RESOURCES.WOOD || targetCell.type === RESOURCES.BUSH)) this.isActioning = true;
            if (this.state === STATES.SEEK_ROCK && targetCell && targetCell.type === RESOURCES.ROCK) this.isActioning = true;
            if (this.state === STATES.BUILDING_HOUSE || this.state === STATES.RESTORING_HOUSE || this.state === STATES.BUILDING_TELESCOPE || this.state === STATES.BUILDING_WALL) this.isActioning = true;
        }
    }

    act() {
        if (this.wanderTimer > 0) {
            this.wanderTimer--;
            this.wander();
            return;
        }

        if (this.state !== STATES.WANDERING && this.target) {
            let dist = Math.abs(this.x - this.target.x) + Math.abs(this.y - this.target.y);
            
            if (dist <= 1) {
                this.ignoreTarget = null;
                if (this.state === STATES.SEEK_WATER) {
                    this.thirst = Math.max(0, this.thirst - 50);
                    this.world.consumeResource(this.target.x, this.target.y);
                    this.state = STATES.DRINKING;
                    this.happyTimer = 5;
                } else if (this.state === STATES.SEEK_FOOD) {
                    this.hunger = Math.max(0, this.hunger - 50);
                    this.world.consumeResource(this.target.x, this.target.y);
                    this.state = STATES.EATING;
                    this.happyTimer = 5;
                    this.applesEaten++;
                    if (this.applesEaten >= 3) {
                        this.hp = Math.min(this.maxHp, this.hp + 3);
                        this.applesEaten = 0;
                    }
                } else if (this.state === STATES.SEEK_WOOD) {
                    if (this.actionTimer <= 0) {
                        this.actionTimer = 2;
                        this.actionType = 'CHOP';
                        this.renderX = this.x;
                        this.renderY = this.y;
                        return;
                    }
                    this.actionTimer--;
                    if (this.actionTimer > 0) {
                        this.actionType = 'CHOP';
                        return;
                    }
                    this.inventory.wood++;
                    this.lastGathered = 'WOOD';
                    this.world.consumeResource(this.target.x, this.target.y);
                    this.state = STATES.GATHERING;
                    this.happyTimer = 3;
                } else if (this.state === STATES.SEEK_ROCK) {
                    if (this.actionTimer <= 0) {
                        this.actionTimer = 2;
                        this.actionType = 'MINE';
                        this.renderX = this.x;
                        this.renderY = this.y;
                        return;
                    }
                    this.actionTimer--;
                    if (this.actionTimer > 0) {
                        this.actionType = 'MINE';
                        return;
                    }
                    this.inventory.rock++;
                    this.lastGathered = 'ROCK';
                    this.world.consumeResource(this.target.x, this.target.y);
                    this.state = STATES.GATHERING;
                    this.happyTimer = 3;
                } else if (this.state === STATES.SEEK_BOOK) {
                    let bookCell = this.world.getCell(this.target.x, this.target.y);
                    if (bookCell) {
                        this.pickedBookBranch = bookCell.capacity;
                    }
                    this.world.consumeResource(this.target.x, this.target.y);
                    this.state = STATES.WANDERING;
                    this.happyTimer = 10;
                    // El evento modal es disparado desde main.js al detectar que el libro desaparece o por el inventario.
                    // Para simplificar, main.js revisará si el agente se comió el libro comprobando this.branch
                    // o usando una flag. Añadiremos una flag.
                    this.bookFound = true;
                } else if (this.state === STATES.BUILDING_HOUSE) {
                    if (this.actionTimer <= 0) {
                        this.actionTimer = 3;
                        this.actionType = 'BUILD';
                        this.renderX = this.x;
                        this.renderY = this.y;
                        return;
                    }
                    this.actionTimer--;
                    if (this.actionTimer > 0) {
                        this.actionType = 'BUILD';
                        return;
                    }
                    let tx = this.target.x;
                    let ty = this.target.y;
                    if (this.inventory.wood >= 3 && this.inventory.rock >= 3) {
                        if (this.homeStage === 0) {
                            if (this.isValidCoord(tx, ty) && this.isValidCoord(tx+1, ty+1)) {
                                this.world.setCell(tx, ty, RESOURCES.HOUSE);
                                this.world.setCell(tx+1, ty, RESOURCES.HOUSE);
                                this.world.setCell(tx, ty+1, RESOURCES.HOUSE);
                                this.world.setCell(tx+1, ty+1, RESOURCES.HOUSE);
                                this.home = {x: tx, y: ty};
                                this.homeStage = 1;
                                this.inventory.wood -= 3;
                                this.inventory.rock -= 3;
                                this.clearSettlementClearing(tx, ty);
                            }
                        } else if (this.homeStage < 3) {
                            this.homeStage++;
                            this.inventory.wood -= 3;
                            this.inventory.rock -= 3;
                            if (this.home) this.clearSettlementClearing(this.home.x, this.home.y);
                        }
                    }
                    this.emergencyMission = null;
                    this.state = STATES.WANDERING;
                    this.happyTimer = 10;
                } else if (this.state === STATES.RESTORING_HOUSE) {
                    let hx = this.target.x, hy = this.target.y;
                    let coords = [[hx, hy], [hx+1, hy], [hx, hy+1], [hx+1, hy+1]];
                    if (this.inventory.wood > 0) {
                        for (let [cx, cy] of coords) {
                            let c = this.world.getCell(cx, cy);
                            if (!c || c.type !== RESOURCES.HOUSE) {
                                this.world.setCell(cx, cy, RESOURCES.HOUSE);
                                this.inventory.wood--;
                                if (this.inventory.wood === 0) break;
                            } else if (c.capacity < 10) {
                                c.capacity = Math.min(10, c.capacity + 5);
                                this.inventory.wood--;
                                if (this.inventory.wood === 0) break;
                            }
                        }
                    }
                    this.emergencyMission = null;
                    this.state = STATES.WANDERING;
                    this.happyTimer = 5;
                } else if (this.state === STATES.BUILDING_TELESCOPE) {
                    if (this.world.getCell(this.target.x, this.target.y).type === RESOURCES.EMPTY) {
                        this.world.setCell(this.target.x, this.target.y, RESOURCES.TELESCOPE);
                        this.inventory.wood -= 2;
                        this.inventory.rock -= 2;
                        this.hasTelescope = true;
                    }
                    this.emergencyMission = null;
                    this.state = STATES.WANDERING;
                    this.happyTimer = 10;
                } else if (this.state === STATES.BUILDING_WALL) {
                    if (this.world.getCell(this.target.x, this.target.y).type === RESOURCES.EMPTY) {
                        this.world.setCell(this.target.x, this.target.y, RESOURCES.WALL);
                        this.inventory.wood--;
                    }
                    this.state = STATES.WANDERING;
                    this.happyTimer = 5;
                } else if (this.state === STATES.DEFENDING) {
                    this.state = STATES.WANDERING;
                }
                this.target = null;
            } else {
                this.moveTowards(this.target.x, this.target.y);
            }
        } else {
            this.wander();
        }
    }

    findPathStep(tx, ty) {
        if (this.x === tx && this.y === ty) return null;

        const targetWalkable = this.tryStep(tx, ty);
        const isGoal = (gx, gy) => {
            if (targetWalkable) return gx === tx && gy === ty;
            return Math.abs(gx - tx) + Math.abs(gy - ty) <= 1;
        };

        if (isGoal(this.x, this.y)) return null;

        const visited = new Set();
        visited.add(this.x + ',' + this.y);

        const moves = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 }
        ];

        const sortMoves = (cx, cy) => {
            return [...moves].sort((a, b) => {
                const da = Math.abs((cx + a.dx) - tx) + Math.abs((cy + a.dy) - ty);
                const db = Math.abs((cx + b.dx) - tx) + Math.abs((cy + b.dy) - ty);
                return da - db;
            });
        };

        const queue = [];
        const initialMoves = sortMoves(this.x, this.y);

        for (let m of initialMoves) {
            let nx = this.x + m.dx;
            let ny = this.y + m.dy;
            if (isGoal(nx, ny)) {
                return { x: nx, y: ny, dx: m.dx, dy: m.dy };
            }
            if (this.tryStep(nx, ny)) {
                visited.add(nx + ',' + ny);
                queue.push({ x: nx, y: ny, firstStep: { x: nx, y: ny, dx: m.dx, dy: m.dy } });
            }
        }

        let iterations = 0;
        const maxIterations = 350;

        while (queue.length > 0 && iterations < maxIterations) {
            iterations++;
            const { x: cx, y: cy, firstStep } = queue.shift();
            const curMoves = sortMoves(cx, cy);

            for (let m of curMoves) {
                let nx = cx + m.dx;
                let ny = cy + m.dy;
                const key = nx + ',' + ny;
                if (visited.has(key)) continue;

                if (isGoal(nx, ny)) {
                    return firstStep;
                }

                if (this.tryStep(nx, ny)) {
                    visited.add(key);
                    queue.push({ x: nx, y: ny, firstStep });
                }
            }
        }

        return null;
    }

    moveTowards(tx, ty) {
        // Intentar paso inteligente con pathfinding para esquivar murallas, ramas y obstáculos
        const step = this.findPathStep(tx, ty);
        if (step) {
            this.x = step.x;
            this.y = step.y;
            this.dx = step.dx;
            this.dy = step.dy;
            this.stepOnCell(this.x, this.y);
            this.checkZoneTransition();
            this.stuckTimer = 0;
            return;
        }

        // Si el pathfinding directo no encuentra camino (obstáculos como roca o agua en el camino directo)
        let dx = 0, dy = 0;
        if (this.x < tx) dx = 1;
        else if (this.x > tx) dx = -1;
        else if (this.y < ty) dy = 1;
        else if (this.y > ty) dy = -1;

        let nx = this.x + dx;
        let ny = this.y + dy;

        if (this.isValidCoord(nx, ny)) {
            let cell = this.world.getCell(nx, ny);
            if (cell && cell.type === RESOURCES.ROCK) {
                if (this.inventory.pickaxes > 0) {
                    this.inventory.pickaxes--;
                    this.world.setCell(nx, ny, RESOURCES.EMPTY);
                    this.happyTimer = 5;
                    this.stuckTimer = 0;
                    return;
                } else if (this.stuckTimer > 3) {
                    this.wanderTimer = 8;
                    this.stuckTimer = 0;
                    if (!this.emergencyMission) this.emergencyMission = 'PICKAXE';
                    return;
                }
            } else if (cell && cell.type === RESOURCES.WATER) {
                if (this.inventory.wood > 0) {
                    this.inventory.wood--;
                    this.inventory.bridges++;
                    this.world.setCell(nx, ny, RESOURCES.BRIDGE);
                    this.happyTimer = 5;
                    this.stuckTimer = 0;
                    return;
                } else if (this.stuckTimer > 5) {
                    if (this.target) {
                        this.ignoreTarget = { x: this.target.x, y: this.target.y };
                        this.inaccessibleTargets.push({ x: this.target.x, y: this.target.y });
                        if (this.state === STATES.SEEK_BOOK) {
                            this.inaccessibleBooks.push({ x: this.target.x, y: this.target.y });
                        }
                        this.target = null;
                    }
                    this.wanderTimer = 8;
                    this.stuckTimer = 0;
                    return;
                }
            }
        }

        this.stuckTimer++;
        if (this.stuckTimer > 4) {
            if (this.target) {
                this.ignoreTarget = { x: this.target.x, y: this.target.y };
            }
            this.wanderTimer = 6;
            this.stuckTimer = 0;
        }
        this.wander();
    }

    tryStep(nx, ny) {
        if (!this.isValidCoord(nx, ny)) {
            if (nx < 0 && this.world.currentZone && this.world.currentZone.connections.west) return true;
            if (nx >= this.world.width && this.world.currentZone && this.world.currentZone.connections.east) return true;
            if (ny < 0 && this.world.currentZone && this.world.currentZone.connections.north) return true;
            if (ny >= this.world.height && this.world.currentZone && this.world.currentZone.connections.south) return true;
            return false;
        }
        let cell = this.world.getCell(nx, ny);
        if (!cell) return true;
        if (cell.type === RESOURCES.ROCK) return false;
        if (cell.type === RESOURCES.WATER) return false;
        if (cell.type === RESOURCES.WALL) return false; // Bloquea murallas sólidas (se debe usar el portón)
        if (cell.type === RESOURCES.WOOD_EMPTY || cell.type === RESOURCES.FOOD_EMPTY) return false; // Bloquea ramas y troncos caídos
        if (cell.type === RESOURCES.HOUSE) return false; // Bloquea paredes de la casa
        return true;
    }

    checkZoneTransition() {
        if (!this.world || !this.world.transitionZone) return;
        if (this.x < 0) this.world.transitionZone(this, 'west');
        else if (this.x >= this.world.width) this.world.transitionZone(this, 'east');
        else if (this.y < 0) this.world.transitionZone(this, 'north');
        else if (this.y >= this.world.height) this.world.transitionZone(this, 'south');
    }

    stepOnCell(nx, ny) {
        let cell = this.world.getCell(nx, ny);
        if (cell && cell.type === RESOURCES.WATER) {
            // Ya no pisamos agua directamente porque bloquea, pero si lo hacemos:
            this.thirst = Math.max(0, this.thirst - 20);
            this.world.consumeResource(nx, ny);
        } else if (cell && cell.type === RESOURCES.BRIDGE) {
            // Cruzando el puente no da sed ni lo rompe
        }
    }

    isValidCoord(x, y) {
        return (x >= 0 && x < this.world.width && y >= 0 && y < this.world.height);
    }

    wander() {
        let moves = [
            {dx: 0, dy: -1},
            {dx: 0, dy: 1},
            {dx: -1, dy: 0},
            {dx: 1, dy: 0}
        ];
        moves.sort(() => Math.random() - 0.5);
        
        for (let m of moves) {
            let nx = this.x + m.dx;
            let ny = this.y + m.dy;
            if (this.tryStep(nx, ny)) {
                if (m.dx !== 0) { this.dx = m.dx; this.dy = 0; }
                if (m.dy !== 0) { this.dy = m.dy; this.dx = 0; }
                this.x = nx;
                this.y = ny;
                this.stepOnCell(nx, ny);
                this.checkZoneTransition();
                break;
            }
        }
    }
    clearSettlementClearing(hx, hy) {
        if (!hx && this.home) { hx = this.home.x; hy = this.home.y; }
        if (hx === undefined || hy === undefined) return;

        const minX = hx - 4, maxX = hx + 5;
        const minY = hy - 4, maxY = hy + 5;

        // Limpiar un claro amplio alrededor de la casa y la muralla centrada:
        let clearedWood = 0;
        for (let cy = minY - 3; cy <= maxY + 3; cy++) {
            for (let cx = minX - 3; cx <= maxX + 3; cx++) {
                if (this.isValidCoord(cx, cy)) {
                    let cell = this.world.getCell(cx, cy);
                    if (!cell) continue;

                    // Preservar la casa
                    if (cell.type === RESOURCES.HOUSE) continue;

                    // Si hay murallas viejas dentro del nuevo patio centrado, removerlas
                    if (cell.type === RESOURCES.WALL && cx > minX && cx < maxX && cy > minY && cy < maxY) {
                        this.world.setCell(cx, cy, RESOURCES.EMPTY);
                        continue;
                    }
                    if (cell.type === RESOURCES.WALL) continue;

                    // Si es árbol, tocón, arbusto, roca o árbol mágico, limpiar celda
                    const isObstacle = 
                        cell.type === RESOURCES.WOOD || cell.type === RESOURCES.WOOD_EMPTY ||
                        cell.type === RESOURCES.FOOD || cell.type === RESOURCES.FOOD_EMPTY ||
                        cell.type === RESOURCES.BUSH || cell.type === RESOURCES.BUSH_EMPTY ||
                        cell.type === RESOURCES.MAGIC_TREE ||
                        cell.type === RESOURCES.ROCK || cell.type === RESOURCES.ROCK_EMPTY;

                    if (isObstacle) {
                        if (cell.type === RESOURCES.WOOD) clearedWood++;
                        this.world.setCell(cx, cy, RESOURCES.EMPTY);
                    }
                }
            }
        }
        if (clearedWood > 0) {
            this.inventory.wood = Math.min(this.inventory.wood + Math.min(clearedWood, 10), 25);
        }
    }
}