// js/main.js
import { World } from './world.js';
import { Agent } from './agent.js';
import { Renderer } from './renderer.js';
import { GodControls } from './god_controls.js';
import { Enemy } from './enemy.js';
import { WORLD_WIDTH, WORLD_HEIGHT } from './world.js';

const canvas = document.getElementById('gameCanvas');
const world = new World();
const agent = new Agent(world);
let enemies = [];
const renderer = new Renderer(canvas);
const controls = new GodControls(world, canvas, enemies);

// Elementos de la UI
const barHunger = document.getElementById('bar-hunger');
const barThirst = document.getElementById('bar-thirst');
const barHp = document.getElementById('bar-hp');
const stateText = document.getElementById('agent-state');
const invWood = document.getElementById('inv-wood');
const invRock = document.getElementById('inv-rock');
const invBridges = document.getElementById('inv-bridges');
const invPickaxes = document.getElementById('inv-pickaxes');
const invSword = document.getElementById('inv-sword');
const invHouse = document.getElementById('inv-house');

const craftBridgeText = document.getElementById('craft-bridge-text');
const barCraftBridge = document.getElementById('bar-craft-bridge');
const craftPickW = document.getElementById('craft-pick-w');
const craftPickR = document.getElementById('craft-pick-r');
const barCraftPickaxe = document.getElementById('bar-craft-pickaxe');

const craftSwordW = document.getElementById('craft-sword-w');
const craftSwordR = document.getElementById('craft-sword-r');
const barCraftSword = document.getElementById('bar-craft-sword');

const craftHouseText = document.getElementById('craft-house-text');
const barCraftHouse = document.getElementById('bar-craft-house');

let lastTime = 0;
let spawnTimer = 0;
const TICK_RATE = 500; // Milisegundos por cada tick lógico del agente

function updateUI() {
    barHunger.style.width = `${agent.hunger}%`;
    barThirst.style.width = `${agent.thirst}%`;
    barHp.style.width = `${(agent.hp / agent.maxHp) * 100}%`;
    stateText.innerText = agent.state;
    invWood.innerText = agent.inventory.wood;
    invRock.innerText = agent.inventory.rock;
    invBridges.innerText = agent.inventory.bridges;
    invPickaxes.innerText = agent.inventory.pickaxes;
    
    // Sword durability shows as 1 sword if durability > 0, or just show durability (uses left)
    // The user asked "falta la Espada", showing 1 or 0 is good enough. Or showing durability.
    // Let's show durability as number of swords, wait... if durability is >0 he has 1 sword.
    invSword.innerText = agent.swordDurability > 0 ? "1" : "0";
    
    invHouse.innerText = agent.home ? "🏠 Sí" : "No";

    let bridgeWood = Math.min(agent.inventory.wood, 3);
    craftBridgeText.innerText = bridgeWood;
    barCraftBridge.style.width = `${(bridgeWood / 3) * 100}%`;

    let pickWood = Math.min(agent.inventory.wood, 2);
    let pickRock = Math.min(agent.inventory.rock, 2);
    craftPickW.innerText = pickWood;
    craftPickR.innerText = pickRock;
    let pickProgress = ((pickWood / 2) * 50) + ((pickRock / 2) * 50);
    barCraftPickaxe.style.width = `${pickProgress}%`;

    let swordWood = Math.min(agent.inventory.wood, 2);
    let swordRock = Math.min(agent.inventory.rock, 2);
    craftSwordW.innerText = swordWood;
    craftSwordR.innerText = swordRock;
    let swordProgress = ((swordWood / 2) * 50) + ((swordRock / 2) * 50);
    // Si la espada ya está crafteada, mostramos 100% de otro color
    if (agent.swordDurability > 0) {
        barCraftSword.style.width = `100%`;
        barCraftSword.style.background = '#eab308';
    } else {
        barCraftSword.style.width = `${swordProgress}%`;
        barCraftSword.style.background = '#a16207';
    }

    let houseWood = Math.min(agent.inventory.wood, 5);
    craftHouseText.innerText = houseWood;
    if (agent.home) {
        barCraftHouse.style.width = `100%`;
        barCraftHouse.style.background = '#22c55e'; // Verde si está construida
    } else {
        barCraftHouse.style.width = `${(houseWood / 5) * 100}%`;
        barCraftHouse.style.background = '#f43f5e'; // Rojo mientras junta madera
    }
}

function gameLoop(timestamp) {
    if (timestamp - lastTime >= TICK_RATE) {
        agent.update(enemies);

        for (let i = enemies.length - 1; i >= 0; i--) {
            enemies[i].update(agent);
            if (enemies[i].hp <= 0) {
                enemies.splice(i, 1);
            }
        }

        spawnTimer++;
        if (spawnTimer >= 120) { // 120 ticks = 60 segs
            spawnTimer = 0;
            let edgeX = Math.random() > 0.5 ? 0 : WORLD_WIDTH - 1;
            let edgeY = Math.floor(Math.random() * WORLD_HEIGHT);
            enemies.push(new Enemy(world, edgeX, edgeY));
        }

        world.regenLoop();
        agent.updateEmotion(enemies);
        renderer.draw(world, agent, enemies);
        updateUI();
        lastTime = timestamp;
    }
    
    requestAnimationFrame(gameLoop);
}

// Iniciar el bucle
requestAnimationFrame(gameLoop);
