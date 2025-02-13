// Creature Behavior Module: Handles creature creation, mutation, and interactions

/**
 * Generates a randomly twisted shape for a creature.
 * @param {number} numVertices - Number of vertices for the shape.
 * @param {number} radius - Scaling factor for the shape.
 * @returns {Array} List of points defining the creature's shape.
 */
function generateTwistedShape(numVertices, radius) {
    let points = [];
    for (let i = 0; i < numVertices; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = radius * randRange(0.5, 1.5);
        points.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
    }
    return points;
}

let herbivoreSpeciesShapes = [];
let predatorSpeciesShapes = [];

function initSpeciesShapes() {
  // Pre-create fixed shapes for herbivores.
  for (let i = 0; i < SIMULATION.herbivoreSpeciesCount; i++) {
    const numVertices = Math.floor(randRange(SIMULATION.minVertices, SIMULATION.maxVertices + 1));
    const shape = generateTwistedShape(numVertices, SIMULATION.creatureRadius);
    herbivoreSpeciesShapes.push({ numVertices, baseShape: shape });
  }
  // Pre-create fixed shapes for predators.
  for (let i = 0; i < SIMULATION.predatorSpeciesCount; i++) {
    const numVertices = Math.floor(randRange(SIMULATION.minVertices, SIMULATION.maxVertices + 1));
    const shape = generateTwistedShape(numVertices, SIMULATION.creatureRadius);
    predatorSpeciesShapes.push({ numVertices, baseShape: shape });
  }
}

/**
 * Spawns a new creature with potential mutation.
 * @returns {Object} A creature object.
 */
function spawnCreature() {
  // Determine creature type only once.
  const isHerb = Math.random() < SIMULATION.herbivoreProbability;
  
  // Select a fixed species shape based on creature type.
  let speciesShape;
  let speciesIndex;
  if (isHerb) {
    speciesIndex = Math.floor(randRange(0, SIMULATION.herbivoreSpeciesCount));
    speciesShape = herbivoreSpeciesShapes[speciesIndex];
  } else {
    speciesIndex = Math.floor(randRange(0, SIMULATION.predatorSpeciesCount));
    speciesShape = predatorSpeciesShapes[speciesIndex];
  }
  
  // Determine multipliers (optional based on species shape vertices).
  let speedMultiplier = (SIMULATION.maxVertices + 1 - speciesShape.numVertices) / SIMULATION.maxVertices;
  let sizeMultiplier = 1 + (speciesShape.numVertices - SIMULATION.minVertices) / (SIMULATION.maxVertices - SIMULATION.minVertices) * 0.5;
  
  let creature = {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    dx: randRange(-SIMULATION.movementSpeed, SIMULATION.movementSpeed) * (isHerb ? 1 : SIMULATION.predatorBirthRate * speedMultiplier),
    dy: randRange(-SIMULATION.movementSpeed, SIMULATION.movementSpeed) * (isHerb ? 1 : SIMULATION.predatorBirthRate * speedMultiplier),
    numVertices: speciesShape.numVertices,
    baseShape: speciesShape.baseShape, // Use fixed species shape.
    color: randomColor(),
    energy: SIMULATION.baseEnergy,
    maxEnergy: SIMULATION.maxEnergyThreshold,
    radius: SIMULATION.creatureRadius * sizeMultiplier,
    colliding: false,
    cloneTimer: 0,
    herbivore: isHerb,
    species: speciesIndex // Optional, can be used for further species-specific behavior.
  };

  // (Optional) Apply mutation logic if needed.
  if (Math.random() < SIMULATION.spawnMutationChance) {
    // Mutation could maintain the species or trigger a change.
    // For now, we keep the species fixed so their shape remains the same.
  }
  
  return creature;
}

function isHerbivore(creature) {
    return creature.herbivore;
  }

/**
 * Handles herbivore feeding behavior.
 * Herbivores now feed at a constant rate for now.
 * @param {Object} creature - The creature object.
 */
function herbivoreFeeding(creature) {
  if (isHerbivore(creature)) {
    // Feed at a constant rate.
    creature.energy += SIMULATION.herbivoreConstantEnergyGain;
  }
}

/**
 * Makes a predator creature seek the closest herbivore prey.
 * @param {Object} creature - The predator creature.
 */
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

/**
 * Makes an herbivore seek nutrient-rich patches.
 * @param {Object} creature - The herbivore creature.
 */
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

/**
 * Tests if two creatures are colliding.
 * @param {Object} c1 - Creature 1.
 * @param {Object} c2 - Creature 2.
 * @returns {boolean} True if colliding.
 */
function creaturesCollide(c1, c2) {
    const dx = c1.x - c2.x;
    const dy = c1.y - c2.y;
    const dist = Math.hypot(dx, dy);
    return dist < (c1.radius + c2.radius);
}

/**
 * Handles collision interactions between creatures.
 */
function handleCreatureCollisions() {
    // Reset collision flags.
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