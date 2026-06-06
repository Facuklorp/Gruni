// js/wolf.js
import { WORLD_WIDTH, WORLD_HEIGHT, RESOURCES } from './world.js';

export class Wolf {
    constructor(world, x, y) {
        this.world = world;
        this.x = x;
        this.y = y;
        this.hp = 10; // Lobo es fuerte
        this.maxHp = 10;
        this.hurtTimer = 0;
        this.isAttacking = false;
        this.attackPower = 2; // Mata de 2 golpes a enemigos
    }

    update(gruni, enemies) {
        this.isAttacking = false;
        if (this.hp <= 0) return;

        if (this.hurtTimer > 0) {
            this.hurtTimer--;
        }

        // Recuperar vida pasivamente
        if (this.hp < this.maxHp && Math.random() < 0.05) {
            this.hp++;
        }

        let closestDist = Infinity;
        let targetEnemy = null;

        for (let e of enemies) {
            if (e.hp > 0) {
                let distToWolf = Math.abs(this.x - e.x) + Math.abs(this.y - e.y);
                if (distToWolf < closestDist) {
                    closestDist = distToWolf;
                    targetEnemy = e;
                }
            }
        }

        if (targetEnemy && closestDist <= 6) { // Si hay un enemigo a 6 bloques o menos
            if (closestDist <= 1) {
                this.isAttacking = true;
                if (Math.random() > 0.2) { // 80% hit chance
                    targetEnemy.takeDamage(this.attackPower);
                }
            } else {
                this.moveTowards(targetEnemy.x, targetEnemy.y);
            }
        } else {
            // Sigue a Gruni pero mantiene un bloque de distancia
            let distToGruni = Math.abs(this.x - gruni.x) + Math.abs(this.y - gruni.y);
            if (distToGruni > 2) {
                this.moveTowards(gruni.x, gruni.y);
            } else if (distToGruni <= 1) {
                if (Math.random() > 0.5) this.wander();
            } else {
                if (Math.random() > 0.8) this.wander(); // A veces deambula un poco
            }
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.hurtTimer = 5;
    }

    moveTowards(tx, ty) {
        let oldX = this.x;
        let oldY = this.y;

        if (this.x < tx && this.tryStep(this.x + 1, this.y)) this.x++;
        else if (this.x > tx && this.tryStep(this.x - 1, this.y)) this.x--;
        else if (this.y < ty && this.tryStep(this.x, this.y + 1)) this.y++;
        else if (this.y > ty && this.tryStep(this.x, this.y - 1)) this.y--;

        if (this.x === oldX && this.y === oldY) {
            this.wander(); // Si se traba, deambula
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
