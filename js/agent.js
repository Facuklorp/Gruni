// js/agent.js
import { WORLD_WIDTH, WORLD_HEIGHT, RESOURCES } from './world.js';

export const STATES = {
    WANDERING: 'Deambulando',
    SEEK_WATER: 'Buscando Agua',
    SEEK_FOOD: 'Buscando Comida',
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
            rock: 0
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

        this.decideState();
        this.act();
        this.updateEmotion();
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

        if (waterPriority === 0 && foodPriority === 0) {
            this.state = STATES.WANDERING;
            this.target = null;
            return;
        }

        // Elegir la necesidad más urgente
        if (waterPriority >= foodPriority) {
            if (waterTarget) {
                this.state = STATES.SEEK_WATER;
                this.target = waterTarget;
            } else if (foodTarget && foodPriority > 0) {
                // Si necesita agua pero no hay, y también necesita comida, busca comida
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
    }

    act() {
        if (this.state === STATES.SEEK_WATER || this.state === STATES.SEEK_FOOD) {
            if (this.target) {
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
                    }
                    this.target = null;
                } else {
                    this.moveTowards(this.target.x, this.target.y);
                }
            } else {
                this.wander(); 
            }
        } else {
            this.wander();
        }
    }

    moveTowards(tx, ty) {
        let oldX = this.x;
        let oldY = this.y;

        if (this.x < tx && this.canMove(this.x + 1, this.y)) this.x++;
        else if (this.x > tx && this.canMove(this.x - 1, this.y)) this.x--;
        else if (this.y < ty && this.canMove(this.x, this.y + 1)) this.y++;
        else if (this.y > ty && this.canMove(this.x, this.y - 1)) this.y--;

        // Si la IA intenta moverse hacia su objetivo pero choca con un obstáculo
        // (es decir, sus coordenadas no cambiaron), damos un paso aleatorio para destrabarlo.
        if (this.x === oldX && this.y === oldY) {
            this.wander();
        }
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
            if (this.canMove(nx, ny)) {
                this.x = nx;
                this.y = ny;
                break;
            }
        }
    }

    canMove(x, y) {
        if (x < 0 || x >= WORLD_WIDTH || y < 0 || y >= WORLD_HEIGHT) return false;
        let cell = this.world.getCell(x, y);
        if (cell && cell.type === RESOURCES.ROCK) return false;
        return true;
    }
}
