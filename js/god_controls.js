// js/god_controls.js
import { RESOURCES, CELL_SIZE } from './world.js';

export class GodControls {
    constructor(world, canvas) {
        this.world = world;
        this.canvas = canvas;
        this.currentTool = RESOURCES.FOOD;

        this.initEvents();
    }

    initEvents() {
        const buttons = document.querySelectorAll('.tool-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const toolName = btn.dataset.tool;
                switch (toolName) {
                    case 'food': this.currentTool = RESOURCES.FOOD; break;
                    case 'water': this.currentTool = RESOURCES.WATER; break;
                    case 'wood': this.currentTool = RESOURCES.WOOD; break;
                    case 'rock': this.currentTool = RESOURCES.ROCK; break;
                    case 'clear': this.currentTool = RESOURCES.EMPTY; break;
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
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const gridX = Math.floor(x / CELL_SIZE);
        const gridY = Math.floor(y / CELL_SIZE);

        this.world.setCell(gridX, gridY, this.currentTool);
    }
}
