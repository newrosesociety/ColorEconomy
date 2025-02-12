/* ================================
   Simulation Parameters
=============================== */
const SIMULATION = {
  // Terrain (Patch) Settings
  numPatches: 100,
  minPatchSides: 3,
  maxPatchSides: 8,
  
  // Patch Color Evolution & Food Resource Settings:
  neighborThreshold: 300,
  hueAdjustmentFactor: 0.01,
  hueRandomDrift: 0.5,
  lightDrift: 0.2,
  boldSaturation: 100,
  boldLightMin: 50,
  boldLightMax: 70,
  splashProbability: 0.03,
  splashMaxOffset: 30,
  splashLifeDecay: 0.02,
  patchResourceInitial: 100,
  patchResourceRecovery: 0.1,
  patchResourceDrain: 0.5,
  
  // Creature Settings
  initialCreatures: 100,
  minVertices: 3,
  maxVertices: 8,
  baseEnergy: 80,
  maxEnergyThreshold: 150,
  energyDecayRate: 0.1,
  herbivoreEnergyGain: 0.2,
  predatorEnergyGain: 10,
  predatorEnergyLoss: 20,
  movementSpeed: 1,
  creatureRadius: 15,
  bounceFactor: 1,
  
  // Wiggle Settings
  wiggleRadius: 2,
  
  // Mutation Settings
  spawnMutationChance: 0.3,
  mutationChance: 1.0,
  clickReplacementRadius: 100,
  
  // Population Limit (max is 10x starting creatures)
  maxPopulation: 1000,
  
  // Slider-controlled parameters:
  predatorBirthRate: 1.0,
  preyBirthRate: 1.0,
  diversity: 1.0,
  
  // Debug mode
  debugMode: false
};

/* ================================
   Global Variables & Canvas Setup
=============================== */
let paused = false;
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const bounds = { x: 0, y: 0, w: canvas.width, h: canvas.height };
let patches = [];
let creatures = [];

/* ================================
   Utility Functions (from utils.js)
   (Note: They are already loaded via utils.js)
=============================== */

/* ================================
   Stats Functions & Helpers
=============================== */
function getStats() {
  const total = creatures.length;
  let predators = 0, prey = 0, totalCreatureEnergy = 0;
  let vertexCounts = [];
  for (let creature of creatures) {
    totalCreatureEnergy += creature.energy;
    vertexCounts.push(creature.numVertices);
    if (isHerbivore(creature)) prey++;
    else predators++;
  }
  const avgCreatureEnergy = total ? (totalCreatureEnergy / total).toFixed(1) : 0;
  const energyProportion = total ? `${avgCreatureEnergy}/${SIMULATION.maxEnergyThreshold}` : "0";
  const meanVertices = vertexCounts.reduce((a, b) => a + b, 0) / (vertexCounts.length || 1);
  const variance = vertexCounts.reduce((a, b) => a + Math.pow(b - meanVertices, 2), 0) / (vertexCounts.length || 1);
  const stdDev = Math.sqrt(variance).toFixed(1);
  let totalPlantEnergy = 0;
  for (let patch of patches) {
    totalPlantEnergy += patch.resource;
  }
  const avgPlantEnergy = patches.length ? (totalPlantEnergy / patches.length).toFixed(1) : 0;
  const plantProportion = `${avgPlantEnergy}/100`;
  const distinctTypes = new Set(vertexCounts).size;
  return { total, predators, prey, energyProportion, plantProportion, stdDev, distinctTypes };
}

/* ================================
   Patch Energy Boost Function
=============================== */
function patchEnergyBoost(creature) {
  for (let patch of patches) {
    if (pointInPolygon({ x: creature.x, y: creature.y }, patch.vertices)) {
      return (patch.light - 60) * 0.01;
    }
  }
  return 0;
}

/* ================================
   Terrain (Patch) Generation using Voronoi
=============================== */
function createPatches() {
  let seeds = [];
  const gridCols = Math.ceil(Math.sqrt(SIMULATION.numPatches));
  const gridRows = Math.ceil(SIMULATION.numPatches / gridCols);
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      if (seeds.length >= SIMULATION.numPatches) break;
      const x = (c + 0.5) * canvas.width / gridCols + randRange(-50, 50);
      const y = (r + 0.5) * canvas.height / gridRows + randRange(-50, 50);
      seeds.push({ x, y });
    }
  }
  patches = [];
  for (let seed of seeds) {
    let cell = computeVoronoiCell(seed, seeds, bounds);
    if (cell.length < SIMULATION.minPatchSides) continue;
    while (cell.length > SIMULATION.maxPatchSides) {
      cell.splice(Math.floor(Math.random() * cell.length), 1);
    }
    let hue = randRange(0, 360);
    let sat = SIMULATION.boldSaturation;
    let light = randRange(SIMULATION.boldLightMin, SIMULATION.boldLightMax);
    patches.push({
      vertices: cell,
      hue: hue,
      sat: sat,
      light: light,
      resource: SIMULATION.patchResourceInitial,
      baseColor: `hsl(${Math.round(hue)}, ${sat}%, ${Math.round(light)}%)`,
      splash: null
    });
  }
}

function computeVoronoiCell(seed, seeds, bounds) {
  let cell = [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.w, y: bounds.y },
    { x: bounds.x + bounds.w, y: bounds.y + bounds.h },
    { x: bounds.x, y: bounds.y + bounds.h }
  ];
  for (let other of seeds) {
    if (other === seed) continue;
    const mid = { x: (seed.x + other.x) / 2, y: (seed.y + other.y) / 2 };
    let normal = { x: seed.x - other.x, y: seed.y - other.y };
    const len = Math.hypot(normal.x, normal.y);
    if (len === 0) continue;
    normal.x /= len;
    normal.y /= len;
    cell = clipPolygon(cell, mid, normal);
    if (cell.length === 0) break;
  }
  return cell;
}

function clipPolygon(subjectPolygon, p, normal) {
  let outputList = [];
  for (let i = 0; i < subjectPolygon.length; i++) {
    const cur = subjectPolygon[i];
    const prev = subjectPolygon[(i - 1 + subjectPolygon.length) % subjectPolygon.length];
    const curDot = (cur.x - p.x) * normal.x + (cur.y - p.y) * normal.y;
    const prevDot = (prev.x - p.x) * normal.x + (prev.y - p.y) * normal.y;
    if (curDot >= 0) {
      if (prevDot < 0) {
        const intersect = lineIntersection(prev, cur, p, { x: p.x + normal.y, y: p.y - normal.x });
        if (intersect) outputList.push(intersect);
      }
      outputList.push(cur);
    } else if (prevDot >= 0) {
      const intersect = lineIntersection(prev, cur, p, { x: p.x + normal.y, y: p.y - normal.x });
      if (intersect) outputList.push(intersect);
    }
  }
  return outputList;
}

function lineIntersection(p1, p2, p3, p4) {
  const A1 = p2.y - p1.y;
  const B1 = p1.x - p2.x;
  const C1 = A1 * p1.x + B1 * p1.y;
  const A2 = p4.y - p3.y;
  const B2 = p3.x - p4.x;
  const C2 = A2 * p3.x + B2 * p3.y;
  const det = A1 * B2 - A2 * B1;
  if (Math.abs(det) < 0.00001) return null;
  const x = (B2 * C1 - B1 * C2) / det;
  const y = (A1 * C2 - A2 * C1) / det;
  return { x, y };
}



/* ================================
   Creature Generation & Mutation
=============================== */
function generateTwistedShape(numVertices, radius) {
  let points = [];
  for (let i = 0; i < numVertices; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = radius * randRange(0.5, 1.5);
    points.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
  }
  return points;
}
function spawnCreature() {
  const effectiveMax = Math.max(SIMULATION.minVertices + 1, Math.round(SIMULATION.maxVertices * SIMULATION.diversity));
  let numVertices = Math.floor(randRange(SIMULATION.minVertices, effectiveMax + 1));
  let speedMultiplier = (SIMULATION.maxVertices + 1 - numVertices) / SIMULATION.maxVertices;
  let sizeMultiplier = 1 + (numVertices - SIMULATION.minVertices) / (SIMULATION.maxVertices - SIMULATION.minVertices) * 0.5;
  let creature = {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    dx: randRange(-SIMULATION.movementSpeed, SIMULATION.movementSpeed) * (isHerbivore({numVertices}) ? 1 : SIMULATION.predatorBirthRate * speedMultiplier),
    dy: randRange(-SIMULATION.movementSpeed, SIMULATION.movementSpeed) * (isHerbivore({numVertices}) ? 1 : SIMULATION.predatorBirthRate * speedMultiplier),
    numVertices: numVertices,
    baseShape: generateTwistedShape(numVertices, SIMULATION.creatureRadius * sizeMultiplier),
    color: randomColor(),
    energy: SIMULATION.baseEnergy,
    maxEnergy: SIMULATION.maxEnergyThreshold,
    radius: SIMULATION.creatureRadius * sizeMultiplier,
    colliding: false,
    cloneTimer: 0
  };
  if (Math.random() < SIMULATION.spawnMutationChance) {
    numVertices = Math.floor(randRange(SIMULATION.minVertices, effectiveMax + 1));
    creature.numVertices = numVertices;
    speedMultiplier = (SIMULATION.maxVertices + 1 - numVertices) / SIMULATION.maxVertices;
    sizeMultiplier = 1 + (numVertices - SIMULATION.minVertices) / (SIMULATION.maxVertices - SIMULATION.minVertices) * 0.5;
    creature.dx = randRange(-SIMULATION.movementSpeed, SIMULATION.movementSpeed) * (isHerbivore({numVertices}) ? 1 : SIMULATION.predatorBirthRate * speedMultiplier);
    creature.dy = randRange(-SIMULATION.movementSpeed, SIMULATION.movementSpeed) * (isHerbivore({numVertices}) ? 1 : SIMULATION.predatorBirthRate * speedMultiplier);
    creature.radius = SIMULATION.creatureRadius * sizeMultiplier;
    creature.baseShape = generateTwistedShape(numVertices, creature.radius);
  }
  return creature;
}
for (let i = 0; i < SIMULATION.initialCreatures; i++) {
  creatures.push(spawnCreature());
}

/* ================================
   Creature Behavior: Seeking & Interaction
=============================== */
function herbivoreFeeding(creature) {
  for (let patch of patches) {
    if (pointInPolygon({ x: creature.x, y: creature.y }, patch.vertices)) {
      if (patch.vertices.length % creature.numVertices === 0 && patch.resource > 0) {
        creature.energy += SIMULATION.herbivoreEnergyGain;
        patch.resource = Math.max(0, patch.resource - SIMULATION.patchResourceDrain);
      }
      break;
    }
  }
}
function predatorSeekPrey(creature) {
  let closest = null;
  let minDist = Infinity;
  for (let other of creatures) {
    if (isHerbivore(other)) {
      let d = Math.hypot(creature.x - other.x, creature.y - other.y);
      if (d < minDist) {
        minDist = d;
        closest = other;
      }
    }
  }
  if (closest) {
    let angle = Math.atan2(closest.y - creature.y, closest.x - creature.x);
    creature.dx += 0.05 * Math.cos(angle);
    creature.dy += 0.05 * Math.sin(angle);
  }
}
function herbivoreSeekPatch(creature) {
  let bestPatch = null;
  let bestValue = -Infinity;
  for (let patch of patches) {
    if (pointInPolygon({ x: creature.x, y: creature.y }, patch.vertices)) continue;
    if (patch.vertices.length % creature.numVertices === 0 && patch.resource > 0) {
      let d = Math.hypot(creature.x - patch.center.x, creature.y - patch.center.y);
      let value = patch.resource - d * 0.05;
      if (value > bestValue) {
        bestValue = value;
        bestPatch = patch;
      }
    }
  }
  if (bestPatch) {
    let angle = Math.atan2(bestPatch.center.y - creature.y, bestPatch.center.x - creature.x);
    creature.dx += 0.05 * Math.cos(angle);
    creature.dy += 0.05 * Math.sin(angle);
  }
}
function creaturesCollide(c1, c2) {
  const dx = c1.x - c2.x;
  const dy = c1.y - c2.y;
  const dist = Math.hypot(dx, dy);
  return dist < (c1.radius + c2.radius);
}
function handleCreatureCollisions() {
  for (let creature of creatures) { creature.colliding = false; }
  for (let i = 0; i < creatures.length; i++) {
    for (let j = i + 1; j < creatures.length; j++) {
      let a = creatures[i];
      let b = creatures[j];
      if (creaturesCollide(a, b)) {
        a.colliding = true;
        b.colliding = true;
        if (!isHerbivore(a) || !isHerbivore(b)) {
          if (a.energy > b.energy * 1.1) {
            a.energy += SIMULATION.predatorEnergyGain;
            b.energy -= SIMULATION.predatorEnergyLoss;
          } else if (b.energy > a.energy * 1.1) {
            b.energy += SIMULATION.predatorEnergyGain;
            a.energy -= SIMULATION.predatorEnergyLoss;
          } else {
            const angle = Math.atan2(b.y - a.y, b.x - a.x);
            a.dx = -Math.cos(angle) * SIMULATION.bounceFactor;
            a.dy = -Math.sin(angle) * SIMULATION.bounceFactor;
            b.dx = Math.cos(angle) * SIMULATION.bounceFactor;
            b.dy = Math.sin(angle) * SIMULATION.bounceFactor;
          }
        } else {
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

/* ================================
   Drawing Functions
=============================== */
function drawPatches() {
  for (let patch of patches) {
    if (!patch.vertices || patch.vertices.length === 0) continue;
    ctx.beginPath();
    ctx.moveTo(patch.vertices[0].x, patch.vertices[0].y);
    for (let i = 1; i < patch.vertices.length; i++) {
      ctx.lineTo(patch.vertices[i].x, patch.vertices[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = patch.baseColor;
    ctx.fill();
  }
}
function drawCreatures() {
  for (let creature of creatures) {
    let currentPatch = null;
    for (let patch of patches) {
      if (pointInPolygon({ x: creature.x, y: creature.y }, patch.vertices)) {
        currentPatch = patch;
        break;
      }
    }
    let blendedColor = creature.color;
    if (currentPatch) {
      blendedColor = blendHSL(creature.color, currentPatch.baseColor, 0.5);
    }
    ctx.save();
    ctx.translate(creature.x, creature.y);
    ctx.beginPath();
    let pts = creature.baseShape;
    for (let i = 0; i < pts.length; i++) {
      let offsetX = randRange(-SIMULATION.wiggleRadius, SIMULATION.wiggleRadius);
      let offsetY = randRange(-SIMULATION.wiggleRadius, SIMULATION.wiggleRadius);
      let x = pts[i].x + offsetX;
      let y = pts[i].y + offsetY;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    let sickFactor = Math.min(1, Math.max(0, 1 - (creature.energy / SIMULATION.baseEnergy)));
    let finalColor = getSickColor(blendedColor, sickFactor);
    ctx.fillStyle = finalColor;
    ctx.fill();
    if (creature.colliding) {
      ctx.strokeStyle = "red";
      ctx.lineWidth = 3;
    } else if (creature.cloneTimer && creature.cloneTimer > 0) {
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 3;
    } else {
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1;
    }
    ctx.stroke();
    ctx.restore();
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
   Pause/Play Functionality
=============================== */
const pauseButton = document.getElementById("pauseButton");
pauseButton.addEventListener("click", function() {
  paused = !paused;
  pauseButton.innerText = paused ? "Play" : "Pause";
});

/* ================================
   Main Game Loop
=============================== */
function gameLoop() {
  if (!paused) {
    updatePatches();
    updateCreatures();
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPatches();
  drawCreatures();
  updateStats();
  requestAnimationFrame(gameLoop);
}

/* ================================
   Reset Simulation Functionality
=============================== */
document.getElementById("resetButton").addEventListener("click", function() {
  creatures = [];
  for (let i = 0; i < SIMULATION.initialCreatures; i++) {
    creatures.push(spawnCreature());
  }
});

/* ================================
   Initialization
=============================== */
function initPatchResources() {
  for (let patch of patches) {
    patch.resource = SIMULATION.patchResourceInitial;
  }
}
createPatches();
initPatchResources();
gameLoop();

/* ================================
   Slider Controls Setup
=============================== */
const sliderStart = document.getElementById("sliderStart");
const valStart = document.getElementById("valStart");
const sliderPredator = document.getElementById("sliderPredatorBirthRate");
const valPredator = document.getElementById("valPredatorBirthRate");
const sliderPrey = document.getElementById("sliderPreyBirthRate");
const valPrey = document.getElementById("valPreyBirthRate");
const sliderDiversity = document.getElementById("sliderDiversity");
const valDiversity = document.getElementById("valDiversity");

sliderStart.addEventListener("input", function() {
  SIMULATION.initialCreatures = parseInt(sliderStart.value);
  SIMULATION.maxPopulation = SIMULATION.initialCreatures * 10;
  valStart.innerText = sliderStart.value;
});
sliderPredator.addEventListener("input", function() {
  SIMULATION.predatorBirthRate = parseFloat(sliderPredator.value);
  valPredator.innerText = sliderPredator.value;
});
sliderPrey.addEventListener("input", function() {
  SIMULATION.preyBirthRate = parseFloat(sliderPrey.value);
  valPrey.innerText = sliderPrey.value;
});
sliderDiversity.addEventListener("input", function() {
  SIMULATION.diversity = parseFloat(sliderDiversity.value);
  valDiversity.innerText = sliderDiversity.value;
});