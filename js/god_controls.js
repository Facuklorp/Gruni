// js/god_controls.js
import { RESOURCES, CELL_SIZE, ZOOM, ISO_W, ISO_H } from './world.js';
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

                const tool = btn.dataset.tool;
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
            for (let i = 0; i < 15; i++) {
                const x = Math.floor(Math.random() * this.world.grid[0].length);
                const y = Math.floor(Math.random() * this.world.grid.length);
                this.world.setCell(x, y, RESOURCES.WATER);
            }
        });

        document.getElementById('btn-lightning').addEventListener('click', () => {
            for (let i = 0; i < 10; i++) {
                const x = Math.floor(Math.random() * this.world.grid[0].length);
                const y = Math.floor(Math.random() * this.world.grid.length);
                this.world.setCell(x, y, RESOURCES.EMPTY);
            }
        });
    }

    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width  / rect.width;
        const scaleY = this.canvas.height / rect.height;

        // Coordenada en el canvas (píxeles físicos)
        const canvasX = (e.clientX - rect.left) * scaleX;
        const canvasY = (e.clientY - rect.top)  * scaleY;

        // Coordenada en espacio iso (pre-zoom, con cámara)
        const camX = this.renderer ? (this.renderer.cameraX || 0) : 0;
        const camY = this.renderer ? (this.renderer.cameraY || 0) : 0;

        const isoX = (canvasX / ZOOM) + camX;  // posición en espacio iso
        const isoY = (canvasY / ZOOM) + camY;

        // Conversión inversa isométrica:
        // sx = (x - y) * ISO_W/2  →  x - y = sx / (ISO_W/2) = sx * 2/ISO_W
        // sy = (x + y) * ISO_H/2  →  x + y = sy / (ISO_H/2) = sy * 2/ISO_H
        const a = isoX * 2 / ISO_W;  // x - y
        const b = isoY * 2 / ISO_H;  // x + y

        const gridX = Math.floor((a + b) / 2);
        const gridY = Math.floor((b - a) / 2);

        if (this.currentTool === 'ENEMY') {
            if (e.type === 'mousedown') {
                this.enemies.push(new Enemy(this.world, gridX, gridY));
            }
        } else {
            this.world.setCell(gridX, gridY, this.currentTool);
        }
    }
}
