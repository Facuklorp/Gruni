// js/god_controls.js
import { RESOURCES, CELL_SIZE } from './world.js';

import { Enemy } from './enemy.js';

export class GodControls {
    constructor(world, canvas, enemiesArray) {
        this.world = world;
        this.canvas = canvas;
        this.enemies = enemiesArray;
        this.currentTool = RESOURCES.FOOD;

        this.initEvents();
    }

    initEvents() {
        const buttons = document.querySelectorAll('.tool-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                let tool = btn.dataset.tool;
                if (tool === 'ENEMY') {
                    this.currentTool = 'ENEMY';
                } else if (tool === 'clear') {
                    this.currentTool = RESOURCES.EMPTY;
                } else {
                    this.currentTool = parseInt(tool);
                }
            });
        });

        this.canvas.addEventListener('mousedown', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => {
            if (e.buttons === 1) this.handleCanvasClick(e);
        });

        document.getElementById('btn-rain').addEventListener('click', () => {
            for(let i=0; i<15; i++){
                let x = Math.floor(Math.random() * this.world.grid[0].length);
                let y = Math.floor(Math.random() * this.world.grid.length);
                this.world.setCell(x, y, RESOURCES.WATER);
            }
        });

        document.getElementById('btn-lightning').addEventListener('click', () => {
             for(let i=0; i<10; i++){
                let x = Math.floor(Math.random() * this.world.grid[0].length);
                let y = Math.floor(Math.random() * this.world.grid.length);
                this.world.setCell(x, y, RESOURCES.EMPTY);
            }
        });
    }

    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const gridX = Math.floor((e.clientX - rect.left) / CELL_SIZE);
        const gridY = Math.floor((e.clientY - rect.top) / CELL_SIZE);

        if (this.currentTool === 'ENEMY') {
            if (e.type === 'mousedown') {
                this.enemies.push(new Enemy(this.world, gridX, gridY));
            }
        } else {
            this.world.setCell(gridX, gridY, this.currentTool);
        }
    }
}
