// js/enemy.js
import { WORLD_WIDTH, WORLD_HEIGHT, RESOURCES } from './world.js';

export class Enemy {
    constructor(world, x, y) {
        this.world = world;
        this.x = x;
        this.y = y;
        this.hp = 4;
        this.maxHp = 4;
        this.hurtTimer = 0;
        this.swordDurability = 2;
        this.inventory = { wood: 0, rock: 0 };
        this.isAttacking = false;
    }

    update(gruni) {
        this.isAttacking = false;
        if (this.hp <= 0) return;

        if (this.hurtTimer > 0) {
            this.hurtTimer--;
        }

        this.craft();
        
        if (this.swordDurability > 0) {
            // Fase de Ataque
            let dist = Math.abs(this.x - gruni.x) + Math.abs(this.y - gruni.y);
            if (dist <= 1) {
                this.isAttacking = true;
                if (Math.random() > 0.3) {
                    gruni.takeDamage(1);
                }
                this.swordDurability--;
            } else {
                this.moveTowards(gruni.x, gruni.y);
            }
        } else {
            // Fase de Crafteo (buscar materiales)
            if (this.inventory.wood < 2) {
                let w = this.world.findNearest(this.x, this.y, RESOURCES.WOOD);
                if (w) this.moveAndGather(w.x, w.y, RESOURCES.WOOD);
                else this.wander();
            } else if (this.inventory.rock < 2) {
                let r = this.world.findNearest(this.x, this.y, RESOURCES.ROCK);
                if (r) this.moveAndGather(r.x, r.y, RESOURCES.ROCK);
                else this.wander();
            } else {
                this.wander(); // Esperando crafteo
            }
        }
    }

    craft() {
        if (this.inventory.wood >= 2 && this.inventory.rock >= 2 && this.swordDurability === 0) {
            this.inventory.wood -= 2;
            this.inventory.rock -= 2;
            this.swordDurability = 2;
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.hurtTimer = 5; // 5 ticks de cara X X
    }

    moveAndGather(tx, ty, resType) {
        let dist = Math.abs(this.x - tx) + Math.abs(this.y - ty);
        if (dist <= 1) {
            this.world.consumeResource(tx, ty);
            if (resType === RESOURCES.WOOD) this.inventory.wood++;
            if (resType === RESOURCES.ROCK) this.inventory.rock++;
        } else {
            this.moveTowards(tx, ty);
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
            this.wander(); // Si se traba, simplemente deambula
        }
    }

    tryStep(nx, ny) {
        if (nx < 0 || nx >= WORLD_WIDTH || ny < 0 || ny >= WORLD_HEIGHT) return false;
        let cell = this.world.getCell(nx, ny);
        if (cell && (cell.type === RESOURCES.ROCK || cell.type === RESOURCES.WATER)) return false;
        return true;
    }

    wander() {
        let moves = [ {dx:0,dy:-1}, {dx:0,dy:1}, {dx:-1,dy:0}, {dx:1,dy:0} ];
        moves.sort(() => Math.random() - 0.5);
        for (let m of moves) {
            if (this.tryStep(this.x + m.dx, this.y + m.dy)) {
                this.x += m.dx;
                this.y += m.dy;
                break;
            }
        }
    }
}
