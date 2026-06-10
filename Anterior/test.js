import { World, RESOURCES, WORLD_WIDTH, WORLD_HEIGHT } from './js/world.js';
import { Agent } from './js/agent.js';
import { Enemy } from './js/enemy.js';

const world = new World();
const agent = new Agent(world);
agent.home = { x: 3, y: 5 }; // Gruni's house
world.setCell(3, 5, RESOURCES.HOUSE);
agent.x = 4;
agent.y = 5;
agent.inventory.bridges = 2; // He already has 2 bridges!

// Empty the world
for(let y=0; y<WORLD_HEIGHT; y++) {
    for(let x=0; x<WORLD_WIDTH; x++) {
        if(x!==3 || y!==5) world.setCell(x, y, RESOURCES.EMPTY);
    }
}

// Add wood
world.setCell(4, 6, RESOURCES.WOOD);
world.setCell(10, 10, RESOURCES.ROCK);

const enemies = [new Enemy(world, 5, 5)];

console.log("Tick 0", agent.x, agent.y, agent.state, agent.emergencyMission);
for(let i=1; i<=10; i++) {
    try {
        agent.update(enemies);
        enemies[0].update(agent);
        console.log(`Tick ${i}`, agent.x, agent.y, agent.state, agent.emergencyMission, "Wood:", agent.inventory.wood);
    } catch(e) {
        console.error("CRASH at tick", i, e);
        break;
    }
}
