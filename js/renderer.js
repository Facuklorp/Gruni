// js/renderer.js
import { WORLD_WIDTH, WORLD_HEIGHT, CELL_SIZE, RESOURCES } from './world.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    draw(world, agent, enemies) {
        this.ctx.fillStyle = '#020617';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (let y = 0; y < WORLD_HEIGHT; y++) {
            for (let x = 0; x < WORLD_WIDTH; x++) {
                let cell = world.getCell(x, y);
                this.drawCell(x, y, cell);
            }
        }

        if (enemies) {
            for (let e of enemies) {
                this.drawEnemy(e);
            }
        }

        this.drawAgent(agent);
    }

    drawCell(x, y, cell) {
        if (!cell) return;
        let px = x * CELL_SIZE;
        let py = y * CELL_SIZE;

        this.ctx.strokeStyle = '#1e293b';
        this.ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);

        if (cell.type === RESOURCES.EMPTY) return;

        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        let cx = px + CELL_SIZE / 2;
        let cy = py + CELL_SIZE / 2;

        switch (cell.type) {
            case RESOURCES.FOOD: this.ctx.fillText('🍎', cx, cy - 2); break;
            case RESOURCES.WATER: this.ctx.fillText('💧', cx, cy - 2); break;
            case RESOURCES.WOOD: this.ctx.fillText('🌳', cx, cy - 2); break;
            case RESOURCES.ROCK: this.ctx.fillText('🪨', cx, cy - 2); break;
            case RESOURCES.HOUSE: this.ctx.fillText('🏠', cx, cy - 2); break;
            case RESOURCES.BRIDGE:
                // Fondo de agua porque es un puente sobre ella
                this.ctx.fillStyle = '#0f172a'; // O podrías usar un azul oscuro
                this.ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
                this.ctx.fillText('🌉', cx, cy - 2);
                break;
        }

        if (cell.type === RESOURCES.HOUSE) {
            // Dibujar barra de vida de la casa si está dañada
            if (cell.capacity < 10) {
                let barWidth = 20;
                let segWidth = barWidth / 10;
                this.ctx.fillStyle = '#475569';
                this.ctx.fillRect(cx - barWidth/2, py + CELL_SIZE - 6, barWidth, 4);
                this.ctx.fillStyle = '#22c55e';
                this.ctx.fillRect(cx - barWidth/2, py + CELL_SIZE - 6, segWidth * cell.capacity, 4);
            }
        } else if (cell.capacity > 0 && cell.type !== RESOURCES.BRIDGE) {
            let dotRadius = 2;
            let startX = cx - (cell.capacity * 6) / 2 + 3;
            for (let i = 0; i < cell.capacity; i++) {
                this.ctx.fillStyle = '#94a3b8';
                this.ctx.beginPath();
                this.ctx.arc(startX + i * 6, py + CELL_SIZE - 4, dotRadius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    drawAgent(agent) {
        let px = agent.x * CELL_SIZE + CELL_SIZE / 2;
        let py = agent.y * CELL_SIZE + CELL_SIZE / 2;

        this.ctx.fillStyle = '#f8fafc';
        this.ctx.beginPath();
        this.ctx.arc(px, py, CELL_SIZE / 2.5, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#0f172a';
        this.ctx.strokeStyle = '#0f172a';
        this.ctx.lineWidth = 1.5;

        if (agent.emotion === 'KO') {
            this.ctx.beginPath(); this.ctx.moveTo(px - 6, py - 6); this.ctx.lineTo(px - 2, py - 2); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(px - 2, py - 6); this.ctx.lineTo(px - 6, py - 2); this.ctx.stroke();

            this.ctx.beginPath(); this.ctx.moveTo(px + 2, py - 6); this.ctx.lineTo(px + 6, py - 2); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(px + 6, py - 6); this.ctx.lineTo(px + 2, py - 2); this.ctx.stroke();

            this.ctx.beginPath(); this.ctx.arc(px, py + 3, 2, 0, Math.PI * 2); this.ctx.stroke();

            this.ctx.font = '12px Arial';
            this.ctx.fillStyle = '#f8fafc';
            this.ctx.fillText('Zzz', px + 10, py - 10);
        } else if (agent.emotion === 'HAPPY') {
            this.ctx.beginPath();
            this.ctx.arc(px - 4, py - 4, 1.5, 0, Math.PI * 2);
            this.ctx.arc(px + 4, py - 4, 1.5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(px, py + 2, 4, 0, Math.PI);
            this.ctx.stroke();
        } else if (agent.emotion === 'SAD') {
            this.ctx.fillRect(px - 5, py - 5, 2, 2);
            this.ctx.fillRect(px + 3, py - 5, 2, 2);
            this.ctx.beginPath();
            this.ctx.arc(px, py + 4, 4, Math.PI, 0);
            this.ctx.stroke();
        } else if (agent.emotion === 'ANGRY') {
            this.ctx.beginPath();
            this.ctx.moveTo(px - 6, py - 6);
            this.ctx.lineTo(px - 2, py - 4);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(px + 6, py - 6);
            this.ctx.lineTo(px + 2, py - 4);
            this.ctx.stroke();
            this.ctx.fillRect(px - 5, py - 3, 2, 2);
            this.ctx.fillRect(px + 3, py - 3, 2, 2);
            this.ctx.beginPath();
            this.ctx.moveTo(px - 3, py + 4);
            this.ctx.lineTo(px + 3, py + 4);
            this.ctx.stroke();
        } else {
            this.ctx.fillRect(px - 5, py - 5, 2, 2);
            this.ctx.fillRect(px + 3, py - 5, 2, 2);
            this.ctx.beginPath();
            this.ctx.moveTo(px - 2, py + 3);
            this.ctx.lineTo(px + 2, py + 3);
            this.ctx.stroke();
        }

        if (agent.isAttacking) {
            this.ctx.font = '16px Arial';
            this.ctx.fillText('🗡️', px + 12, py);
        }
    }

    drawEnemy(enemy) {
        if (enemy.hp <= 0) return;
        let px = enemy.x * CELL_SIZE + CELL_SIZE / 2;
        let py = enemy.y * CELL_SIZE + CELL_SIZE / 2;

        this.ctx.fillStyle = '#ef4444'; // Rojo malo
        this.ctx.beginPath();
        this.ctx.arc(px, py, CELL_SIZE / 2.5, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#020617';
        this.ctx.strokeStyle = '#020617';
        this.ctx.lineWidth = 1.5;

        // Cara del enemigo
        if (enemy.hurtTimer > 0) {
            // X X eyes
            this.ctx.beginPath(); this.ctx.moveTo(px - 6, py - 6); this.ctx.lineTo(px - 2, py - 2); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(px - 2, py - 6); this.ctx.lineTo(px - 6, py - 2); this.ctx.stroke();

            this.ctx.beginPath(); this.ctx.moveTo(px + 2, py - 6); this.ctx.lineTo(px + 6, py - 2); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(px + 6, py - 6); this.ctx.lineTo(px + 2, py - 2); this.ctx.stroke();

            // Boca recta
            this.ctx.beginPath(); this.ctx.moveTo(px - 3, py + 4); this.ctx.lineTo(px + 3, py + 4); this.ctx.stroke();
        } else {
            // Angry face
            this.ctx.beginPath(); this.ctx.moveTo(px - 6, py - 6); this.ctx.lineTo(px - 2, py - 4); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(px + 6, py - 6); this.ctx.lineTo(px + 2, py - 4); this.ctx.stroke();
            this.ctx.fillRect(px - 5, py - 3, 2, 2);
            this.ctx.fillRect(px + 3, py - 3, 2, 2);
            this.ctx.beginPath(); this.ctx.moveTo(px - 3, py + 4); this.ctx.lineTo(px + 3, py + 4); this.ctx.stroke();
        }

        // Draw Health bar (4 segments)
        let barWidth = 16;
        let segWidth = barWidth / 4;
        this.ctx.fillStyle = '#475569';
        this.ctx.fillRect(px - barWidth/2, py - 14, barWidth, 3);
        
        this.ctx.fillStyle = '#22c55e'; // verde
        this.ctx.fillRect(px - barWidth/2, py - 14, segWidth * enemy.hp, 3);

        if (enemy.isAttacking) {
            this.ctx.font = '16px Arial';
            this.ctx.fillText('🗡️', px + 12, py);
        }
    }
}
