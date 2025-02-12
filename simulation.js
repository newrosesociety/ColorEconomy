/* ================================
   Global Variables & Canvas Setup
=============================== */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let patches = [];
let creatures = [];
let paused = false;

/* ================================
   Update Loop
=============================== */
function updateCreatures() {
  for (let creature of creatures) {
    creature.x += creature.dx;
    creature.y += creature.dy;
    // Toroidal wrapping.
    if (creature.x < 0) creature.x += canvas.width;
    if (creature.x > canvas.width) creature.x -= canvas.width;
    if (creature.y < 0) creature.y += canvas.height;
    if (creature.y > canvas.height) creature.y -= canvas.height;
    creature.energy -= SIMULATION.energyDecayRate;
    creature.energy += patchEnergyBoost(creature);
    if (isHerbivore(creature)) {
      herbivoreFeeding(creature);
      herbivoreSeekPatch(creature);
    } else {
      predatorSeekPrey(creature);
    }
    let birthRate = isHerbivore(creature) ? SIMULATION.preyBirthRate : SIMULATION.predatorBirthRate;
    if (creature.energy >= creature.maxEnergy / birthRate) {
      creature.energy /= 2;
      creature.cloneTimer = 20;
      let clone = spawnCreature();
      clone.x = creature.x + randRange(-5, 5);
      clone.y = creature.y + randRange(-5, 5);
      clone.color = creature.color;
      clone.energy = creature.energy;
      clone.maxEnergy = creature.maxEnergy;
      creatures.push(clone);
    }
    if (creature.cloneTimer && creature.cloneTimer > 0) {
      creature.cloneTimer--;
    }
  }
  handleCreatureCollisions();
  if (creatures.length > SIMULATION.maxPopulation) {
    creatures.sort((a, b) => a.energy - b.energy);
    creatures = creatures.slice(creatures.length - SIMULATION.maxPopulation);
  }
  creatures = creatures.filter(c => c.energy > 0);
}

function handleCreatureCollisions() {
  // Reset collision flags.
  for (let creature of creatures) {
    creature.colliding = false;
  }
  
  for (let i = 0; i < creatures.length; i++) {
    for (let j = i + 1; j < creatures.length; j++) {
      let a = creatures[i];
      let b = creatures[j];
      if (creaturesCollide(a, b)) {
        a.colliding = true;
        b.colliding = true;
        
        if (!isHerbivore(a) && isHerbivore(b)) {
          // Predator (a) vs. Herbivore (b)
          a.energy += SIMULATION.predatorEnergyGain;
          b.energy -= SIMULATION.predatorEnergyLoss;
        } else if (isHerbivore(a) && !isHerbivore(b)) {
          // Herbivore (a) vs. Predator (b)
          b.energy += SIMULATION.predatorEnergyGain;
          a.energy -= SIMULATION.predatorEnergyLoss;
        } else {
          // Otherwise, both are of the same type; just bounce them
          const angle = Math.atan2(b.y - a.y, b.x - a.x);
          a.dx = -Math.cos(angle) * SIMULATION.bounceFactor;
          a.dy = -Math.sin(angle) * SIMULATION.bounceFactor;
          b.dx = Math.cos(angle) * SIMULATION.bounceFactor;
          b.dy = Math.sin(angle) * SIMULATION.bounceFactor;
        }
      }
    }
  }
}

/* ================================
   Click Replacement
   Replace all creatures in a radius with a new type.
=============================== */
canvas.addEventListener("click", function(e) {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  let indicesToReplace = [];
  for (let i = 0; i < creatures.length; i++) {
    let creature = creatures[i];
    let dx = creature.x - clickX;
    let dy = creature.y - clickY;
    if (Math.hypot(dx, dy) < SIMULATION.clickReplacementRadius) {
      indicesToReplace.push(i);
    }
  }
  if (indicesToReplace.length > 0) {
    let newConfig = spawnCreature();
    indicesToReplace.forEach(index => {
      let old = creatures[index];
      let speedMultiplier = (SIMULATION.maxVertices + 1 - newConfig.numVertices) / SIMULATION.maxVertices;
      let sizeMultiplier = 1 + (newConfig.numVertices - SIMULATION.minVertices) / (SIMULATION.maxVertices - SIMULATION.minVertices) * 0.5;
      creatures[index] = {
        x: old.x,
        y: old.y,
        dx: randRange(-SIMULATION.movementSpeed, SIMULATION.movementSpeed) * (isHerbivore(newConfig) ? 1 : SIMULATION.predatorBirthRate * speedMultiplier),
        dy: randRange(-SIMULATION.movementSpeed, SIMULATION.movementSpeed) * (isHerbivore(newConfig) ? 1 : SIMULATION.predatorBirthRate * speedMultiplier),
        numVertices: newConfig.numVertices,
        baseShape: generateTwistedShape(newConfig.numVertices, SIMULATION.creatureRadius * sizeMultiplier),
        color: newConfig.color,
        energy: SIMULATION.baseEnergy,
        maxEnergy: SIMULATION.maxEnergyThreshold,
        radius: SIMULATION.creatureRadius * sizeMultiplier,
        colliding: false,
        cloneTimer: 0
      };
    });
  }
});

/* ================================
   Stats Panel Update
=============================== */
function updateStats() {
  const statsDiv = document.getElementById("statsValues");
  const { total, predators, prey, energyProportion, plantProportion, stdDev, distinctTypes } = getStats();
  statsDiv.innerHTML = `<strong>Simulation Stats</strong><br>
                        Total Population: ${total}<br>
                        Predators: ${predators} | Prey: ${prey}<br>
                        Avg Creature Energy: ${energyProportion}<br>
                        Avg Plant Energy: ${plantProportion}<br>
                        Biodiversity (distinct types): ${distinctTypes}<br>
                        Vertex Variation: ${stdDev}<br>
                        <hr>
                        <strong>Controls:</strong><br>
                        Starting Creatures, Predator/Prey Birth Rates, Diversity<br>
                        <em>(Adjust the sliders below.)</em><br>
                        <hr>
                        <strong>About ColorEconomy:</strong><br>`;
}

/* ================================
   Simulation Initialization
=============================== */
function initSimulation() {
  createPatches();
  initPatchResources();
  
  if (creatures.length === 0) {
    for (let i = 0; i < SIMULATION.initialCreatures; i++) {
      creatures.push(spawnCreature());
    }
  }
  console.log("Initial creature count:", creatures.length);
  
  setupUIControls();
  gameLoop();
}

// Helper function for patch initialization.
function initPatchResources() {
  for (let patch of patches) {
    patch.resource = SIMULATION.patchResourceInitial;
  }
}

/* ================================
   Main Game Loop & Update Functions
=============================== */
function updateSimulation() {
  if (!paused) {
    updatePatches();
    updateCreatures();
  }
}

function renderSimulation() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPatches();
  drawCreatures();
  updateStats();
}

function gameLoop() {
  updateSimulation();
  renderSimulation();
  requestAnimationFrame(gameLoop);
}

/* ================================
   UI Controls Setup
=============================== */
function setupUIControls() {
  document.getElementById("resetButton").addEventListener("click", function() {
    creatures = [];
    for (let i = 0; i < SIMULATION.initialCreatures; i++) {
      creatures.push(spawnCreature());
    }
  });

  const pauseButton = document.getElementById("pauseButton");
  pauseButton.addEventListener("click", function() {
    paused = !paused;
    pauseButton.innerText = paused ? "Play" : "Pause";
  });

  // Slider Controls – use the proper element IDs from index.html
  const sliderStart = document.getElementById("sliderStart");
  const valStart = document.getElementById("valStart");

  const sliderPredator = document.getElementById("sliderPredatorBirth");
  const valPredator = document.getElementById("valPredatorBirth");

  const sliderPrey = document.getElementById("sliderHerbivoreBirth");
  const valPrey = document.getElementById("valHerbivoreBirth");

  sliderStart.addEventListener("input", function() {
    SIMULATION.initialCreatures = parseInt(sliderStart.value);
    SIMULATION.maxPopulation = SIMULATION.initialCreatures * 10;
    valStart.innerText = sliderStart.value;
  });

  sliderPredator.addEventListener("input", function() {
    SIMULATION.predatorBirthThreshold = parseFloat(sliderPredator.value);
    valPredator.innerText = sliderPredator.value;
  });

  sliderPrey.addEventListener("input", function() {
    SIMULATION.herbivoreBirthThreshold = parseFloat(sliderPrey.value);
    valPrey.innerText = sliderPrey.value;
  });


  // Canvas Click Replacement (if needed)
  canvas.addEventListener("click", function(e) {

  });
}

/* ================================
   Start Simulation
=============================== */
document.addEventListener("DOMContentLoaded", function() {
  setupUIControls();
  initSimulation();
});