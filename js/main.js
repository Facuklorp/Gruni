// js/main.js
import { World, WORLD_WIDTH, WORLD_HEIGHT, CELL_SIZE, RESOURCES } from './world.js';
import { Agent, STATES } from './agent.js';
import { Renderer } from './renderer.js';
import { ParticleSystem } from './particles.js';
import { Wolf } from './wolf.js';
import { Enemy } from './enemy.js';

const canvas = document.getElementById('gameCanvas');

export const IMAGES = {};
const imageUrls = {
    sprout_grass: 'assets/sprout_grass.png',
    sprout_water: 'assets/sprout_water.png',
    sprout_house: 'assets/sprout_house.png',
    sprout_roof: 'assets/sprout_roof.png',
    sprout_objects: 'assets/sprout_objects.png',
    sprout_bridge: 'assets/sprout_bridge.png',
    sprout_agent: 'assets/sprout_agent.png',
    sprout_agent_actions: 'assets/sprout_agent_actions.png',
    sprout_tools: 'assets/sprout_tools.png',
    sprout_cow: 'assets/sprout_cow.png',
    sprout_chicken: 'assets/sprout_chicken.png',
    gruni_walk: 'assets/sprites/gruni/gruni_walk.png',
    gruni_walk_side_1: 'Gruni Sprites/Paso 1.png',
    gruni_walk_side_2: 'Gruni Sprites/Paso 2.png',
    gruni_walk_side_3: 'Gruni Sprites/Paso 3.png',
    gruni_walk_side_4: 'Gruni Sprites/Paso 4.png',
    gruni_walk_side_5: 'Gruni Sprites/Paso 5.png',
    gruni_walk_front_1: 'Gruni Sprites/Paso frente 1.png',
    gruni_walk_front_2: 'Gruni Sprites/Paso frente 2.png',
    gruni_walk_front_3: 'Gruni Sprites/Paso frente 3.png',
    gruni_walk_front_4: 'Gruni Sprites/Paso frente 4.png',
    gruni_walk_front_5: 'Gruni Sprites/Paso frente 5.png',
    gruni_run: 'assets/sprites/gruni/gruni_run.png',
    gruni_axe: 'assets/sprites/gruni/gruni_axe.png',
    gruni_attack: 'assets/sprites/gruni/gruni_attack.png',
    gruni_mine: 'assets/sprites/gruni/gruni_mine.png',
    casa_1: 'Casa/Casa 1.png',
    casa_2: 'Casa/Casa 2.png',
    casa_3: 'Casa/Casa entera.png',
    arbol_1: 'Vegetación/Árbol 1.png',
    arbol_2: 'Vegetación/Árbol 2.png',
    frutal_1: 'Vegetación/Árbol frutal 1.png',
    frutal_2: 'Vegetación/Árbol frutal 2.png',
    arbol_desierto_1: 'Vegetación/Árbol desierto 1.png',
    arbol_desierto_2: 'Vegetación/Árbol desierto 2.png',
    arbusto_1: 'Vegetación/Arbusto 1.png',
    arbusto_2: 'Vegetación/Arbusto 2.png',
    telescopio: 'Telescopio/Telescopio.png',
    libro_astronomia: 'Libros/Libro-astronomía.png',
    libro_fauna: 'Libros/Libro-fauna.png',
    libro_herreria: 'Libros/Libro-herrería.png',
    muralla: 'Muralla/Muralla.png',
    rocas_1: 'Rocas/Rocas 1.png',
    rocas_2: 'Rocas/Rocas 2.png',
    bg_pasto: 'Biomas/GRANDES/Pasto.png',
    bg_agua: 'Biomas/GRANDES/Agua.png',
    bg_arena: 'Biomas/GRANDES/Arena.png'
};

function loadImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
            console.error('No se pudo cargar la imagen: ' + url);
            resolve(null); // Resolvemos null en vez de trabar todo
        };
        img.src = url;
    });
}

async function loadAssets() {
    for (let key in imageUrls) {
        let img = await loadImage(imageUrls[key]);
        IMAGES[key] = img;
    }
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const world = new World();
const agent = new Agent(world);
let enemies = [];
let wolf = null;
const renderer = new Renderer(canvas);


let gamePaused = false;
let eclipseTimer = 0;
let isEclipse = false;
let firstEnemySpawned = false;
let lastStateDesc = '';
let bookSpawned = false;
let bookCooldownTimer = 120; // Starts at 60 seconds

const BRANCH_DESCRIPTIONS = {
    'ASTRONOMY': '🔭 ASTRONOMÍA: Puede construir telescopios para predecir eclipses.',
    'BIOLOGY': '🐺 BIOLOGÍA: Gruni tiene una mascota lobo que lo ayuda.',
    'BLACKSMITH': '⚒️ HERRERÍA: Forja espadas más fuertes que duran más.'
};
let lastBranchesCount = 0;

// Elementos de la UI
const barHunger = document.getElementById('bar-hunger');
const barThirst = document.getElementById('bar-thirst');
const barHp = document.getElementById('bar-hp');
const invWood = document.getElementById('inv-wood');
const invRock = document.getElementById('inv-rock');
const invPickaxes = document.getElementById('inv-pickaxes');
const invSword = document.getElementById('inv-sword');
const invHouse = document.getElementById('inv-house');
const invTelescope = document.getElementById('inv-telescope');
const invWall = document.getElementById('inv-wall');

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

const craftHouseW = document.getElementById('craft-house-w');
const craftHouseR = document.getElementById('craft-house-r');
const barCraftHouse = document.getElementById('bar-craft-house');

let lastTime = 0;
let spawnTimer = 0;
let currentTickRate = 500; // Milisegundos por cada tick lógico del agente
let timeOfDay = 600; // Inicia a las 6:00 AM (Rango 0 - 2400)
const particles = new ParticleSystem();

const branchText = document.getElementById('agent-branch');

const dialogueBubble = document.getElementById('gruni-dialogue');
const dialogueText = document.getElementById('gruni-dialogue-text');
let dialogueTimer = 0;

function showDialogue(text, timeTicks = 15) {
    dialogueText.innerText = text;
    dialogueBubble.style.display = 'block';
    dialogueTimer = timeTicks;
}

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
}

function updateUI() {
    barHunger.style.width = `${agent.hunger}%`;
    barThirst.style.width = `${agent.thirst}%`;
    barHp.style.width = `${(agent.hp / agent.maxHp) * 100}%`;
    
    let stateDesc = agent.state;
    if (agent.state === STATES.SEEK_WOOD || agent.state === STATES.SEEK_ROCK) {
        let purpose = 'guardar en el inventario';
        switch (agent.emergencyMission) {
            case 'PICKAXE': purpose = 'hacer un Pico'; break;
            case 'SWORD': purpose = 'forjar una Espada'; break;
            case 'BUILD_HOUSE': purpose = 'construir su Casa'; break;
            case 'RESTORE_HOUSE': purpose = 'reparar su Casa'; break;
            case 'BUILD_TELESCOPE': purpose = 'construir un Telescopio'; break;
            case 'BUILD_WALLS': purpose = 'construir Murallas'; break;
        }
        stateDesc += ` para ${purpose}`;
    } else if (agent.state === STATES.SEEK_FOOD) {
        stateDesc += ' para comer';
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
    invTelescope.innerText = agent.hasTelescope ? 'Sí' : 'No';
    
    let wallsCount = 0;
    for (let y = 0; y < WORLD_HEIGHT; y++) {
        for (let x = 0; x < WORLD_WIDTH; x++) {
            if (world.grid[y][x].type === RESOURCES.WALL) wallsCount++;
        }
    }
    invWall.innerText = wallsCount;

    if (agent.branches.length > lastBranchesCount) {
        document.getElementById('knowledge-log').style.display = 'block';
        let newBranch = agent.branches[agent.branches.length - 1];
        let desc = BRANCH_DESCRIPTIONS[newBranch] || newBranch;
        let li = document.createElement('li');
        li.innerText = desc;
        li.style.marginBottom = '5px';
        document.getElementById('knowledge-list').appendChild(li);
        lastBranchesCount = agent.branches.length;
    }

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

    let houseWood = Math.min(agent.inventory.wood, 3);
    let houseRock = Math.min(agent.inventory.rock, 3);
    craftHouseW.innerText = houseWood;
    craftHouseR.innerText = houseRock;
    if (agent.homeStage >= 3) {
        let homeCell = world.getCell(agent.home.x, agent.home.y);
        let hpPct = homeCell ? (homeCell.capacity / 10) * 100 : 100;
        barCraftHouse.style.width = `${hpPct}%`;
        barCraftHouse.style.background = hpPct < 100 ? '#eab308' : '#22c55e'; // Amarillo si está dañada
    } else {
        barCraftHouse.style.width = `${((houseWood + houseRock) / 6) * 100}%`;
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
    if (!lastTime) lastTime = timestamp;
    let deltaTime = timestamp - lastTime;
    
    // Smooth time of day progression
    timeOfDay += 0.5;
    if (timeOfDay > 2400) timeOfDay = 0;

    if (!gamePaused) {
        particles.update(timeOfDay);

        // Ambient Spawns
        if (Math.random() < 0.05) { // 5% chance por frame de spawnear hoja
            let rx = Math.floor(Math.random() * WORLD_WIDTH);
            let ry = Math.floor(Math.random() * WORLD_HEIGHT);
            let cell = world.getCell(rx, ry);
            if (cell && cell.type === RESOURCES.WOOD) {
                particles.spawnLeaf(rx * CELL_SIZE + CELL_SIZE/2, ry * CELL_SIZE + CELL_SIZE/2 - 20);
            }
        }

        if (Math.random() < 0.02) { // 2% chance de luciérnaga
            let rx = Math.floor(Math.random() * WORLD_WIDTH);
            let ry = Math.floor(Math.random() * WORLD_HEIGHT);
            let cell = world.getCell(rx, ry);
            if (cell && cell.type === RESOURCES.WATER) {
                particles.spawnFirefly(rx * CELL_SIZE + Math.random()*CELL_SIZE, ry * CELL_SIZE + Math.random()*CELL_SIZE);
            }
        }

        if (deltaTime > currentTickRate) {
            if (dialogueTimer > 0) {
                dialogueTimer--;
            }

            let eclipseWarning = eclipseTimer > 80 && eclipseTimer < 120; // 20 ticks of warning (10 segundos)
            
            // Auto-select book branch (Twitch 24/7 Mode)
            if (agent.bookFound && agent.branches.length < 3) {
                let branchName = 'ASTRONOMY';
                if (agent.pickedBookBranch === 1) branchName = 'BIOLOGY';
                if (agent.pickedBookBranch === 2) branchName = 'BLACKSMITH';
                selectBranch(branchName);
                agent.bookFound = false; // Reset to avoid infinite loop
                bookSpawned = false; // Allow a new book to spawn later
                bookCooldownTimer = 180; // 90 seconds cooldown after reading
            }

            agent.update(enemies, eclipseWarning);

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
            
            // Book spawning
            if (agent.branches.length < 3) {
                if (agent.homeStage === 3 && !bookSpawned) {
                    if (bookCooldownTimer > 0) bookCooldownTimer--;
                    if (bookCooldownTimer === 0) {
                        let emptyX = Math.floor(Math.random() * WORLD_WIDTH);
                        let emptyY = Math.floor(Math.random() * WORLD_HEIGHT);
                        if (world.getCell(emptyX, emptyY).type === RESOURCES.EMPTY) {
                            const availableBranches = ['ASTRONOMY', 'BIOLOGY', 'BLACKSMITH'].filter(b => !agent.branches.includes(b));
                            if (availableBranches.length > 0) {
                                const randomBranch = availableBranches[Math.floor(Math.random() * availableBranches.length)];
                                world.setCell(emptyX, emptyY, RESOURCES.BOOK);
                                let branchId = 0;
                                if (randomBranch === 'BIOLOGY') branchId = 1;
                                if (randomBranch === 'BLACKSMITH') branchId = 2;
                                world.getCell(emptyX, emptyY).capacity = branchId;
                                bookSpawned = true;
                            }
                        } else {
                            bookCooldownTimer = 1; // Try again next tick
                        }
                    }
                }
            }

            world.regenLoop(agent);
            agent.updateEmotion(enemies);
            lastTime = timestamp;
        }
        updateUI();
    }
    
    let eclipseWarning = eclipseTimer > 80 && eclipseTimer < 120;
    renderer.draw(world, agent, enemies, wolf, eclipseWarning, timestamp, timeOfDay, particles);
    requestAnimationFrame(gameLoop);
}

// Iniciar el bucle
loadAssets().then(() => {
    renderer.initImages(IMAGES);
    window.game = { world, agent, getEnemies: () => enemies, setEnemies: (val) => enemies = val, getWolf: () => wolf, setWolf: (val) => wolf = val, Enemy, Wolf, RESOURCES, STATES };
    requestAnimationFrame(gameLoop);
});
