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
    EATING: 'Comiendo'
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

        this.state = STATES.WANDERING;
        this.target = null;
        this.emotion = 'NEUTRAL';
        this.happyTimer = 0;
    }

    update() {
        this.hunger += 0.5;
        this.thirst += 0.8;

        if (this.hunger > 100) this.hunger = 100;
        if (this.thirst > 100) this.thirst = 100;

        if (this.happyTimer > 0) {
            this.happyTimer--;
        }

        this.craft();
        this.decideState();
        this.act();
        this.updateEmotion();
    }

    craft() {
        // Craftear puente (máximo 2 a la vez)
        if (this.inventory.wood >= 1 && this.inventory.bridges < 2) {
            this.inventory.wood--;
            this.inventory.bridges++;
            this.happyTimer = 5;
        }
        // Craftear pico (máximo 2 a la vez)
        if (this.inventory.wood >= 1 && this.inventory.rock >= 1 && this.inventory.pickaxes < 2) {
            this.inventory.wood--;
            this.inventory.rock--;
            this.inventory.pickaxes++;
            this.happyTimer = 5;
        }
    }

    updateEmotion() {
        if (this.hunger > 80 || this.thirst > 80) {
            this.emotion = 'ANGRY';
        } else if ((this.state === STATES.SEEK_WATER || this.state === STATES.SEEK_FOOD) && !this.target) {
            this.emotion = 'SAD';
        } else if (this.happyTimer > 0) {
            this.emotion = 'HAPPY';
        } else {
            this.emotion = 'NEUTRAL';
        }
    }

    decideState() {
        let waterTarget = this.world.findNearest(this.x, this.y, RESOURCES.WATER);
        let foodTarget = this.world.findNearest(this.x, this.y, RESOURCES.FOOD);

        let waterPriority = this.thirst > 60 ? this.thirst : 0;
        let foodPriority = this.hunger > 60 ? this.hunger : 0;

        // Supervivencia prioritaria
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

        // Tiempo libre: Recolección proactiva
        let woodTarget = this.world.findNearest(this.x, this.y, RESOURCES.WOOD);
        let rockTarget = this.world.findNearest(this.x, this.y, RESOURCES.ROCK);

        if (this.inventory.wood < 3 && woodTarget) {
            this.state = STATES.SEEK_WOOD;
            this.target = woodTarget;
        } else if (this.inventory.rock < 3 && rockTarget) {
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
            // Atascado, intentar usar herramientas en la dirección que queremos ir
            let dx = 0, dy = 0;
            if (this.x < tx) dx = 1;
            else if (this.x > tx) dx = -1;
            else if (this.y < ty) dy = 1;
            else if (this.y > ty) dy = -1;

            let nx = this.x + dx;
            let ny = this.y + dy;

            if (this.isValidCoord(nx, ny)) {
                let cell = this.world.getCell(nx, ny);
                if (cell && cell.type === RESOURCES.ROCK && this.inventory.pickaxes > 0) {
                    // Minar roca
                    this.inventory.pickaxes--;
                    this.world.setCell(nx, ny, RESOURCES.EMPTY);
                    this.happyTimer = 5;
                } else if (cell && cell.type === RESOURCES.WATER && this.inventory.bridges > 0) {
                    // Evitar poner puente justo en el agua de la que queremos beber
                    if (!(this.state === STATES.SEEK_WATER && this.target && this.target.x === nx && this.target.y === ny)) {
                        this.inventory.bridges--;
                        this.world.setCell(nx, ny, RESOURCES.BRIDGE);
                        this.happyTimer = 5;
                    } else {
                        this.wander(); // Solo queremos beber de ella
                    }
                } else {
                    this.wander(); // No podemos escapar, deambulamos
                }
            } else {
                this.wander();
            }
        }
    }

    tryStep(nx, ny) {
        if (!this.isValidCoord(nx, ny)) return false;
        let cell = this.world.getCell(nx, ny);
        if (!cell) return true;
        // El agua y las rocas ahora son obstáculos sólidos
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
