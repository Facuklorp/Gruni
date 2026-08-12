// js/enemy.js
import { RESOURCES } from './world.js';

export class Enemy {
    constructor(world, x, y) {
        this.world = world;
        this.x = x;
        this.y = y;
        this.hp = 4;
        this.maxHp = 4;
        this.hurtTimer = 0;
        this.inventory = { wood: 0, rock: 0 };
        this.swordDurability = 5; // Empieza con espada (durabilidad 5)
        this.isAttacking = false;
        this.lastDx = 0;
        this.lastDy = 1;
        this.animationTimer = 0;
    }

    update(gruni, wolf = null) {
        let startX = this.x;
        let startY = this.y;
        this.isAttacking = false;
        this.animationTimer++;
        if (this.hp <= 0) return;

        if (this.hurtTimer > 0) {
            this.hurtTimer--;
        }

        this.craft();
        
        if (this.swordDurability > 0) {
            let wallTarget = this.world.findNearest(this.x, this.y, RESOURCES.WALL);
            let houseTarget = this.world.findNearest(this.x, this.y, RESOURCES.HOUSE);
            
            let primaryTarget = wallTarget || houseTarget;

            if (wolf && wolf.hp > 0) {
                let distToWolf = Math.abs(this.x - wolf.x) + Math.abs(this.y - wolf.y);
                if (distToWolf <= 1) {
                    this.isAttacking = true;
                    if (Math.random() > 0.3) wolf.takeDamage(1);
                    this.swordDurability--;
                    return;
                }
            }

            if (primaryTarget) {
                // Asedio a la Muralla/Casa
                let distToTarget = Math.abs(this.x - primaryTarget.x) + Math.abs(this.y - primaryTarget.y);
                if (distToTarget <= 1) {
                    this.isAttacking = true;
                    if (Math.random() > 0.3) {
                        this.world.consumeResource(primaryTarget.x, primaryTarget.y);
                    }
                    this.swordDurability--;
                } else {
                    let adjacentWall = null;
                    let moves = [{dx:0,dy:-1},{dx:0,dy:1},{dx:-1,dy:0},{dx:1,dy:0}];
                    for (let m of moves) {
                        let cell = this.world.getCell(this.x+m.dx, this.y+m.dy);
                        if (cell && cell.type === RESOURCES.WALL) {
                            adjacentWall = {x: this.x+m.dx, y: this.y+m.dy};
                            break;
                        }
                    }
                    if (adjacentWall) {
                        this.isAttacking = true;
                        if (Math.random() > 0.3) this.world.consumeResource(adjacentWall.x, adjacentWall.y);
                        this.swordDurability--;
                    } else {
                        this.moveTowards(primaryTarget.x, primaryTarget.y);
                    }
                }
            } else {
                // Cazar a Gruni
                let dist = Math.abs(this.x - gruni.x) + Math.abs(this.y - gruni.y);
                if (dist <= 1) {
                    this.isAttacking = true;
                    if (Math.random() > 0.3) {
                        gruni.takeDamage(1);
                    }
                    this.swordDurability--;
                } else {
                    let adjacentWall = null;
                    let moves = [{dx:0,dy:-1},{dx:0,dy:1},{dx:-1,dy:0},{dx:1,dy:0}];
                    for (let m of moves) {
                        let cell = this.world.getCell(this.x+m.dx, this.y+m.dy);
                        if (cell && cell.type === RESOURCES.WALL) {
                            adjacentWall = {x: this.x+m.dx, y: this.y+m.dy};
                            break;
                        }
                    }
                    if (adjacentWall) {
                        this.isAttacking = true;
                        if (Math.random() > 0.3) this.world.consumeResource(adjacentWall.x, adjacentWall.y);
                        this.swordDurability--;
                    } else {
                        this.moveTowards(gruni.x, gruni.y);
                    }
                }
            }
        } else {
            // Fase de Crafteo (buscar materiales)
            if (this.inventory.wood < 1) {
                let w = this.world.findNearest(this.x, this.y, RESOURCES.WOOD);
                if (w) this.moveAndGather(w.x, w.y, RESOURCES.WOOD);
                else this.wander();
            } else if (this.inventory.rock < 1) {
                let r = this.world.findNearest(this.x, this.y, RESOURCES.ROCK);
                if (r) this.moveAndGather(r.x, r.y, RESOURCES.ROCK);
                else this.wander();
            } else {
                this.wander(); // Esperando crafteo
            }
        }
        
        let diffX = this.x - startX;
        let diffY = this.y - startY;
        if (diffX !== 0 || diffY !== 0) {
            this.lastDx = diffX;
            this.lastDy = diffY;
        }
    }

    craft() {
        if (this.inventory.wood >= 1 && this.inventory.rock >= 1 && this.swordDurability === 0) {
            this.inventory.wood -= 1;
            this.inventory.rock -= 1;
            this.swordDurability = 5;
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
        if (nx < 0 || nx >= world.width || ny < 0 || ny >= world.height) return false;
        let cell = this.world.getCell(nx, ny);
        if (cell && cell.type === RESOURCES.WATER) {
            this.world.consumeResource(nx, ny);
            return true;
        }
        if (cell && (cell.type === RESOURCES.ROCK || cell.type === RESOURCES.VOID)) return false;
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
