// js/agent.js
import { WORLD_WIDTH, WORLD_HEIGHT, RESOURCES } from './world.js';

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
    DEFENDING: '¡Defendiendo Casa!'
};

export class Agent {
    constructor(world) {
        this.world = world;
        this.x = Math.floor(WORLD_WIDTH / 2);
        this.y = Math.floor(WORLD_HEIGHT / 2);
        
        this.hunger = 0;
        this.thirst = 0;
        
        this.inventory = {
            wood: 0,
            rock: 0,
            bridges: 0,
            pickaxes: 0
        };

        this.swordDurability = 0; // max 2
        this.isAttacking = false;

        this.hp = 10;
        this.maxHp = 10;
        this.applesEaten = 0;
        this.koTimer = 0;

        this.state = STATES.WANDERING;
        this.target = null;
        this.emotion = 'NEUTRAL';
        this.happyTimer = 0;

        this.stuckTimer = 0;
        this.emergencyMission = null; // 'BRIDGE', 'PICKAXE' o 'BUILD_HOUSE'
        this.home = null;
    }

    update(enemies) {
        if (this.koTimer > 0) {
            this.koTimer--;
            this.emotion = 'KO';
            if (this.koTimer <= 0) {
                this.hp = this.maxHp; // Revive
            }
            return;
        }

        this.isAttacking = false;
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
    }

    craft() {
        if (this.inventory.wood >= 5 && !this.home && this.emergencyMission !== 'BUILD_HOUSE') {
            this.inventory.wood -= 5;
            this.emergencyMission = 'BUILD_HOUSE';
            this.happyTimer = 5;
        }
        if (this.inventory.wood >= 3 && this.inventory.bridges < 2) {
            this.inventory.wood -= 3;
            this.inventory.bridges++;
            this.happyTimer = 5;
            this.emergencyMission = null; 
        }
        if (this.inventory.wood >= 2 && this.inventory.rock >= 2 && this.swordDurability === 0) {
            this.inventory.wood -= 2;
            this.inventory.rock -= 2;
            this.swordDurability = 2;
            this.happyTimer = 5;
        }
        if (this.inventory.wood >= 2 && this.inventory.rock >= 2 && this.inventory.pickaxes < 2) {
            this.inventory.wood -= 2;
            this.inventory.rock -= 2;
            this.inventory.pickaxes++;
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
            this.inventory = { wood: 0, rock: 0, bridges: 0, pickaxes: 0 };
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

        if (this.home) {
            let homeCell = this.world.getCell(this.home.x, this.home.y);
            if (!homeCell || homeCell.type !== RESOURCES.HOUSE) {
                this.home = null; // La casa fue destruida
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

        // Si hay una amenaza y no tenemos espada, misión urgente: fabricar espada
        if (enemyThreat && this.swordDurability === 0 && this.emergencyMission !== 'BUILD_HOUSE') {
            this.emergencyMission = 'SWORD';
        }

        // Si la casa está bajo ataque y TENEMOS espada, defendemos
        if (targetEnemy && this.swordDurability > 0) {
            this.state = STATES.DEFENDING;
            this.target = { x: targetEnemy.x, y: targetEnemy.y };
            return;
        }

        // MODO EMERGENCIA: Si estamos atrapados y necesitamos herramientas
        if (this.emergencyMission) {
            if (this.emergencyMission === 'SWORD') {
                if (this.inventory.wood >= 2 && this.inventory.rock >= 2) {
                    this.emergencyMission = null; // Ya tenemos los mats, se crafteará en craft()
                } else if (this.inventory.wood < 2) {
                    let w = this.world.findNearest(this.x, this.y, RESOURCES.WOOD);
                    if (w) { this.state = STATES.SEEK_WOOD; this.target = w; return; }
                } else if (this.inventory.rock < 2) {
                    let r = this.world.findNearest(this.x, this.y, RESOURCES.ROCK);
                    if (r) { this.state = STATES.SEEK_ROCK; this.target = r; return; }
                }
            } else if (this.emergencyMission === 'BUILD_HOUSE') {
                let empty = this.world.findNearest(this.x, this.y, RESOURCES.EMPTY);
                if (empty) { 
                    this.state = STATES.BUILDING_HOUSE; 
                    this.target = empty; 
                    return; 
                }
            } else if (this.emergencyMission === 'BRIDGE') {
                if (this.inventory.wood >= 3) {
                    this.emergencyMission = null; 
                } else {
                    let w = this.world.findNearest(this.x, this.y, RESOURCES.WOOD);
                    if (w) { this.state = STATES.SEEK_WOOD; this.target = w; return; }
                }
            } else if (this.emergencyMission === 'PICKAXE') {
                if (this.inventory.wood >= 2 && this.inventory.rock >= 2) {
                    this.emergencyMission = null;
                } else if (this.inventory.wood < 2) {
                    let w = this.world.findNearest(this.x, this.y, RESOURCES.WOOD);
                    if (w) { this.state = STATES.SEEK_WOOD; this.target = w; return; }
                } else if (this.inventory.rock < 2) {
                    let r = this.world.findNearest(this.x, this.y, RESOURCES.ROCK);
                    if (r) { this.state = STATES.SEEK_ROCK; this.target = r; return; }
                }
            }
        }

        let waterTarget = this.world.findNearest(this.x, this.y, RESOURCES.WATER);
        let foodTarget = this.world.findNearest(this.x, this.y, RESOURCES.FOOD);

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

        let woodTarget = this.world.findNearest(this.x, this.y, RESOURCES.WOOD);
        let rockTarget = this.world.findNearest(this.x, this.y, RESOURCES.ROCK);

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
    }

    act() {
        if (this.state !== STATES.WANDERING && this.target) {
            let dist = Math.abs(this.x - this.target.x) + Math.abs(this.y - this.target.y);
            
            if (dist <= 1) {
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
                    this.inventory.wood++;
                    this.world.consumeResource(this.target.x, this.target.y);
                    this.state = STATES.GATHERING;
                    this.happyTimer = 3;
                } else if (this.state === STATES.SEEK_ROCK) {
                    this.inventory.rock++;
                    this.world.consumeResource(this.target.x, this.target.y);
                    this.state = STATES.GATHERING;
                    this.happyTimer = 3;
                } else if (this.state === STATES.BUILDING_HOUSE) {
                    if (this.world.getCell(this.target.x, this.target.y).type === RESOURCES.EMPTY) {
                        this.world.setCell(this.target.x, this.target.y, RESOURCES.HOUSE);
                        this.home = {x: this.target.x, y: this.target.y};
                    } else {
                        // Reembolsar si el bloque ya no está vacío
                        this.inventory.wood += 5; 
                    }
                    this.emergencyMission = null;
                    this.state = STATES.WANDERING;
                    this.happyTimer = 10;
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

    moveTowards(tx, ty) {
        let oldX = this.x;
        let oldY = this.y;

        if (this.x < tx && this.tryStep(this.x + 1, this.y)) this.x++;
        else if (this.x > tx && this.tryStep(this.x - 1, this.y)) this.x--;
        else if (this.y < ty && this.tryStep(this.x, this.y + 1)) this.y++;
        else if (this.y > ty && this.tryStep(this.x, this.y - 1)) this.y--;

        if (this.x === oldX && this.y === oldY) {
            this.stuckTimer++;
            
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
                    } else if (this.stuckTimer > 2) {
                        this.emergencyMission = 'PICKAXE';
                    }
                } else if (cell && cell.type === RESOURCES.WATER) {
                    if (this.inventory.bridges > 0) {
                        if (!(this.state === STATES.SEEK_WATER && this.target && this.target.x === nx && this.target.y === ny)) {
                            this.inventory.bridges--;
                            this.world.setCell(nx, ny, RESOURCES.BRIDGE);
                            this.happyTimer = 5;
                            this.stuckTimer = 0;
                        } else {
                            this.wander(); 
                        }
                    } else if (this.stuckTimer > 2) {
                        this.emergencyMission = 'BRIDGE';
                    }
                } else {
                    this.wander(); 
                }
            } else {
                this.wander();
            }
        } else {
            this.stuckTimer = 0;
        }
    }

    tryStep(nx, ny) {
        if (!this.isValidCoord(nx, ny)) return false;
        let cell = this.world.getCell(nx, ny);
        if (!cell) return true;
        if (cell.type === RESOURCES.ROCK || cell.type === RESOURCES.WATER) return false;
        return true;
    }

    isValidCoord(x, y) {
        return (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT);
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
                this.x = nx;
                this.y = ny;
                break;
            }
        }
    }
}
