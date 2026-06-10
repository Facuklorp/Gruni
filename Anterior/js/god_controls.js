// js/god_controls.js
import { RESOURCES, CELL_SIZE, ZOOM } from './world.js';

import { Enemy } from './enemy.js';

export class GodControls {
    constructor(world, canvas, enemiesArray, renderer) {
        this.world = world;
        this.canvas = canvas;
        this.enemies = enemiesArray;
        this.renderer = renderer;
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
        // Escala real del canvas vs CSS
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const canvasX = (e.clientX - rect.left) * scaleX;
        const canvasY = (e.clientY - rect.top) * scaleY;

        // Desplazamiento de la cámara
        const camX = this.renderer ? (this.renderer.cameraX || 0) : 0;
        const camY = this.renderer ? (this.renderer.cameraY || 0) : 0;

        const worldX = (canvasX / ZOOM) + camX;
        const worldY = (canvasY / ZOOM) + camY;

        const gridX = Math.floor(worldX / CELL_SIZE);
        const gridY = Math.floor(worldY / CELL_SIZE);

        if (this.currentTool === 'ENEMY') {
            if (e.type === 'mousedown') {
                this.enemies.push(new Enemy(this.world, gridX, gridY));
            }
        } else {
            this.world.setCell(gridX, gridY, this.currentTool);
        }
    }
}
