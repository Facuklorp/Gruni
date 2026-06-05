// js/main.js
import { World } from './world.js';
import { Agent } from './agent.js';
import { Renderer } from './renderer.js';
import { GodControls } from './god_controls.js';

const canvas = document.getElementById('gameCanvas');
const world = new World();
const agent = new Agent(world);
const renderer = new Renderer(canvas);
const controls = new GodControls(world, canvas);

// Elementos de la UI
const barHunger = document.getElementById('bar-hunger');
const barThirst = document.getElementById('bar-thirst');
const stateText = document.getElementById('agent-state');
const invWood = document.getElementById('inv-wood');
const invRock = document.getElementById('inv-rock');

let lastTime = 0;
const TICK_RATE = 500; // Milisegundos por cada tick lógico del agente

function updateUI() {
    barHunger.style.width = `${agent.hunger}%`;
    barThirst.style.width = `${agent.thirst}%`;
    stateText.innerText = agent.state;
    invWood.innerText = agent.inventory.wood;
    invRock.innerText = agent.inventory.rock;
}

function gameLoop(timestamp) {
    if (timestamp - lastTime > TICK_RATE) {
        world.regenLoop();
        agent.update();
        updateUI();
        lastTime = timestamp;
    }
    
    renderer.draw(world, agent);
    requestAnimationFrame(gameLoop);
}

// Iniciar el bucle
requestAnimationFrame(gameLoop);
