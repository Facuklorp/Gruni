// js/main.js
import { World } from './world.js';
import { Agent, STATES } from './agent.js';
import { Renderer } from './renderer.js';
import { GodControls } from './god_controls.js';
import { Enemy } from './enemy.js';
import { Wolf } from './wolf.js';
import { WORLD_WIDTH, WORLD_HEIGHT, RESOURCES } from './world.js';

const canvas = document.getElementById('gameCanvas');
const world = new World();
const agent = new Agent(world);
let enemies = [];
let wolf = null;
const renderer = new Renderer(canvas);
const controls = new GodControls(world, canvas, enemies);

let gamePaused = false;
let eclipseTimer = 0;
let isEclipse = false;
let firstEnemySpawned = false;
let lastStateDesc = '';
let bookSpawned = false;
let bookCooldownTimer = 0;

// Elementos de la UI
const barHunger = document.getElementById('bar-hunger');
const barThirst = document.getElementById('bar-thirst');
const barHp = document.getElementById('bar-hp');
const invWood = document.getElementById('inv-wood');
const invRock = document.getElementById('inv-rock');
const invPickaxes = document.getElementById('inv-pickaxes');
const invSword = document.getElementById('inv-sword');
const invHouse = document.getElementById('inv-house');

const statTelescope = document.getElementById('stat-telescope');
const craftTeleW = document.getElementById('craft-tele-w');
const craftTeleR = document.getElementById('craft-tele-r');
const barCraftTele = document.getElementById('bar-craft-tele');

const statWall = document.getElementById('stat-wall');
const craftWallW = document.getElementById('craft-wall-w');
const barCraftWall = document.getElementById('bar-craft-wall');
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

const modal = document.getElementById('book-modal');
const branchText = document.getElementById('agent-branch');

const dialogueBubble = document.getElementById('gruni-dialogue');
const dialogueText = document.getElementById('gruni-dialogue-text');
let dialogueTimer = 0;

function showDialogue(text, timeTicks = 15) {
    dialogueText.innerText = text;
    dialogueBubble.style.display = 'block';
    dialogueTimer = timeTicks;
}

document.getElementById('btn-branch-astro').onclick = () => { selectBranch('ASTRONOMY'); };
document.getElementById('btn-branch-bio').onclick = () => { selectBranch('BIOLOGY'); };
document.getElementById('btn-branch-smith').onclick = () => { selectBranch('BLACKSMITH'); };

function selectBranch(branch) {
    if (!agent.branches.includes(branch)) {
        agent.branches.push(branch);
    }
    
    let text = [];
    if (agent.branches.includes('ASTRONOMY')) text.push('🔭 Astronomía');
    if (agent.branches.includes('BIOLOGY')) text.push('🐺 Biología');
    if (agent.branches.includes('BLACKSMITH')) text.push('⚒️ Herrería');
    branchText.innerText = text.join(' | ');

    if (branch === 'BIOLOGY') {
        wolf = new Wolf(world, agent.x, agent.y);
        showDialogue("¡Un lobo amistoso! Lo llamaré Firulais.", 15);
    } else if (branch === 'ASTRONOMY') {
        showDialogue("Las estrellas me guiarán...", 15);
    } else if (branch === 'BLACKSMITH') {
        showDialogue("¡Siento el poder del metal en mis manos!", 15);
    }

    if (agent.branches.includes('ASTRONOMY')) document.getElementById('btn-branch-astro').style.display = 'none';
    if (agent.branches.includes('BIOLOGY')) document.getElementById('btn-branch-bio').style.display = 'none';
    if (agent.branches.includes('BLACKSMITH')) document.getElementById('btn-branch-smith').style.display = 'none';

    modal.style.display = 'none';
    gamePaused = false;
}

function updateUI() {
    barHunger.style.width = `${agent.hunger}%`;
    barThirst.style.width = `${agent.thirst}%`;
    barHp.style.width = `${(agent.hp / agent.maxHp) * 100}%`;
    let stateDesc = agent.state;
    if (agent.state === STATES.SEEK_WOOD || agent.state === STATES.SEEK_ROCK) {
        if (agent.emergencyMission === 'BUILD_HOUSE') stateDesc += ' para construir su casa';
        else if (agent.emergencyMission === 'SWORD') stateDesc += ' para forjar una espada';
        else if (agent.emergencyMission === 'BUILD_TELESCOPE') stateDesc += ' para armar un telescopio';
        else if (agent.emergencyMission === 'BUILD_WALLS') stateDesc += ' para levantar murallas';
        else if (agent.emergencyMission === 'BRIDGE') stateDesc += ' para hacer un puente';
        else if (agent.emergencyMission === 'PICKAXE') stateDesc += ' para crear un pico';
        else stateDesc += ' para almacenar reservas';
    } else if (agent.state === STATES.SEEK_FOOD) {
        stateDesc += ' para calmar su hambre';
    } else if (agent.state === STATES.SEEK_WATER) {
        stateDesc += ' para saciar su sed';
    } else if (agent.state === STATES.BUILDING_HOUSE) {
        stateDesc = 'Construyendo el hogar de sus sueños...';
    } else if (agent.state === STATES.SEEK_BOOK) {
        stateDesc = '¡Intrigado por un misterioso libro mágico!';
    }
    
    if (dialogueTimer <= 0) {
        dialogueText.innerText = stateDesc || "...";
        dialogueBubble.style.display = 'block';
    }
    
    lastStateDesc = stateDesc;
    
    invWood.innerText = agent.inventory.wood;
    invRock.innerText = agent.inventory.rock;
    invPickaxes.innerText = agent.inventory.pickaxes;
    invSword.innerText = agent.swordDurability > 0 ? `Sí (${agent.swordDurability})` : 'No';
    invHouse.innerText = agent.home ? 'Sí' : 'No';

    let pw = Math.min(agent.inventory.wood, 2);
    let pr = Math.min(agent.inventory.rock, 2);
    craftPickW.innerText = pw;
    craftPickR.innerText = pr;
    if (agent.inventory.pickaxes > 0) {
        barCraftPickaxe.style.width = '100%';
        barCraftPickaxe.style.background = '#22c55e';
    } else {
        barCraftPickaxe.style.width = `${((pw + pr) / 4) * 100}%`;
        barCraftPickaxe.style.background = '#78716c';
    }

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
        let homeCell = world.getCell(agent.home.x, agent.home.y);
        let hpPct = homeCell ? (homeCell.capacity / 10) * 100 : 100;
        barCraftHouse.style.width = `${hpPct}%`;
        barCraftHouse.style.background = hpPct < 100 ? '#eab308' : '#22c55e'; // Amarillo si está dañada
    } else {
        barCraftHouse.style.width = `${(houseWood / 5) * 100}%`;
        barCraftHouse.style.background = '#f43f5e'; // Rojo mientras junta madera
    }

    // Telescopio
    let tw = Math.min(agent.inventory.wood, 2);
    let tr = Math.min(agent.inventory.rock, 2);
    craftTeleW.innerText = tw;
    craftTeleR.innerText = tr;
    if (agent.hasTelescope) {
        barCraftTele.style.width = '100%';
        barCraftTele.style.background = '#22c55e';
    } else {
        barCraftTele.style.width = `${((tw + tr) / 4) * 100}%`;
        barCraftTele.style.background = '#3b82f6';
    }

    // Muralla
    let ww = Math.min(agent.inventory.wood, 1);
    craftWallW.innerText = ww;
    barCraftWall.style.width = `${ww * 100}%`;
    barCraftWall.style.background = agent.emergencyMission === 'BUILD_WALLS' ? '#f43f5e' : '#64748b';
}

function gameLoop(timestamp) {
    if (timestamp - lastTime >= TICK_RATE) {
        if (!gamePaused) {
            
            if (dialogueTimer > 0) {
                dialogueTimer--;
            }

            let eclipseWarning = eclipseTimer > 80 && eclipseTimer < 120; // 20 ticks of warning (10 segundos)
            
            agent.update(enemies, eclipseWarning);

            if (bookCooldownTimer > 0) bookCooldownTimer--;

            if (agent.bookFound && agent.branches.length < 3) {
                gamePaused = true;
                modal.style.display = 'flex';
                agent.bookFound = false; // Reset to avoid infinite loop
                bookSpawned = false; // Allow a new book to spawn later
                bookCooldownTimer = 180; // 90 seconds cooldown
            }

            if (wolf) wolf.update(agent, enemies);

            for (let i = enemies.length - 1; i >= 0; i--) {
                enemies[i].update(agent, wolf);
                if (enemies[i].hp <= 0) {
                    enemies.splice(i, 1);
                }
            }

            // Eclipse logic (Ciclo de 70 segundos: 50s luz, 20s eclipse)
            if (firstEnemySpawned) {
                eclipseTimer++;

                if (eclipseTimer === 80 && agent.branches.includes('ASTRONOMY') && agent.hasTelescope) {
                    showDialogue("¡Un eclipse se acerca! Rápido, a prepararnos.", 15);
                }

                if (eclipseTimer === 100) { 
                    isEclipse = true;
                    
                    // Spawn inmediato de 2 enemigos al comenzar el eclipse
                    let edgeX = Math.random() > 0.5 ? 0 : WORLD_WIDTH - 1;
                    let edgeY = Math.floor(Math.random() * WORLD_HEIGHT);
                    enemies.push(new Enemy(world, edgeX, edgeY));
                    
                    let edgeX2 = Math.random() > 0.5 ? 0 : WORLD_WIDTH - 1;
                    let edgeY2 = Math.floor(Math.random() * WORLD_HEIGHT);
                    enemies.push(new Enemy(world, edgeX2, edgeY2));

                    if (!agent.branches.includes('ASTRONOMY')) {
                        showDialogue("¡Oh no! Un eclipse... De haber estudiado astronomía lo hubiese sabido.", 15);
                    }
                }
                if (eclipseTimer >= 140) { 
                    isEclipse = false;
                    eclipseTimer = 0;
                }
            }

            if (agent.branches.length > 0) {
                spawnTimer++;
                let spawnRate = isEclipse ? 20 : 60; // Más rápido en eclipse (10 seg), normal (30 seg)
                if (spawnTimer >= spawnRate) { 
                    spawnTimer = 0;
                    let edgeX = Math.random() > 0.5 ? 0 : WORLD_WIDTH - 1;
                    let edgeY = Math.floor(Math.random() * WORLD_HEIGHT);
                    enemies.push(new Enemy(world, edgeX, edgeY));
                    firstEnemySpawned = true;
                }
            }
            
            // Spawn del libro (sólo si tiene casa y no hay cooldown)
            if (!bookSpawned && agent.home && bookCooldownTimer === 0 && Math.random() < 0.05 && agent.branches.length < 3) { 
                let emptyX = Math.floor(Math.random() * WORLD_WIDTH);
                let emptyY = Math.floor(Math.random() * WORLD_HEIGHT);
                if (world.getCell(emptyX, emptyY).type === RESOURCES.EMPTY) {
                    world.setCell(emptyX, emptyY, RESOURCES.BOOK);
                    bookSpawned = true;
                }
            }

            world.regenLoop();
            agent.updateEmotion(enemies);
        }
        renderer.draw(world, agent, enemies, wolf, isEclipse);
        updateUI();
        lastTime = timestamp;
    }
    
    requestAnimationFrame(gameLoop);
}

// Iniciar el bucle
requestAnimationFrame(gameLoop);
