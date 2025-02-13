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

/**
 * Generates a virus-like shape: round with evenly spaced angles and a bit of radial jitter.
 * @param {number} numVertices - Number of vertices for the shape.
 * @param {number} radius - Base radius for the shape.
 * @returns {Array} List of points defining the shape.
 */
function generateVirusShape(numVertices, radius) {
  let points = [];
  const angleStep = (Math.PI * 2) / numVertices;
  for (let i = 0; i < numVertices; i++) {
    const angle = i * angleStep;
    // Apply a jitter between 0.8 and 1.2 for a jagged but round edge.
    const jitter = randRange(0.8, 1.2);
    const r = radius * jitter;
    points.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
  }
  return points;
}

let herbivoreSpeciesShapes = [];
let predatorSpeciesShapes = [];

/**
 * Pre-creates fixed species shapes for both herbivores and predators.
 */
function initSpeciesShapes() {
  // Pre-create fixed virus-like shapes for herbivores (prey).
  for (let i = 0; i < SIMULATION.herbivoreSpeciesCount; i++) {
    // Use a moderate number of vertices to keep the shape round and simple.
    const numVertices = Math.floor(randRange(6, 10));
    const shape = generateVirusShape(numVertices, SIMULATION.creatureRadius);
    herbivoreSpeciesShapes.push({ numVertices, baseShape: shape });
  }
  // Pre-create fixed shapes for predators using existing twisted shape.
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
  
  // Base multipliers from the pre-generated species shape.
  let baseSpeedMultiplier = (SIMULATION.maxVertices + 1 - speciesShape.numVertices) / SIMULATION.maxVertices;
  let baseSizeMultiplier = 1 + (speciesShape.numVertices - SIMULATION.minVertices) / (SIMULATION.maxVertices - SIMULATION.minVertices) * 0.5;
  
  // Updated factors:
  // Prey (herbivores) are now fat and fluffy (bigger and slower),
  // while predators remain skinny and sharp (smaller and faster).
  const sizeFactor = isHerb ? 2.0 : 0.7;
  const speedFactor = isHerb ? 0.7 : 1.3;
  
  const adjustedSize = SIMULATION.creatureRadius * baseSizeMultiplier * sizeFactor;
  const adjustedSpeed = SIMULATION.movementSpeed * baseSpeedMultiplier * speedFactor;
  
  let creature = {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    dx: randRange(-adjustedSpeed, adjustedSpeed),
    dy: randRange(-adjustedSpeed, adjustedSpeed),
    numVertices: speciesShape.numVertices,
    baseShape: speciesShape.baseShape, // Fixed species shape.
    color: randomColor(),
    energy: SIMULATION.baseEnergy,
    maxEnergy: SIMULATION.maxEnergyThreshold,
    radius: adjustedSize,
    colliding: false,
    cloneTimer: 0,
    herbivore: isHerb,
    species: speciesIndex // Optional species identifier.
  };

  // Optional: Apply mutation logic if desired, but keep the species shape fixed.
  if (Math.random() < SIMULATION.spawnMutationChance) {
    // Mutation logic here
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

function updateCreatures() {
  for (const creature of creatures) {
    // Move the creature, etc.

    // Find the patch under the creature.
    const patch = getPatchUnderCreature(creature);
    if (patch) {
      // If the creature is an herbivore, feed on the patch!
      if (creature.herbivore) {
        feedPatch(patch, creature.color);
      }
    }
  }
}

// This can be a helper function that returns the patch under a given creature.
function getPatchUnderCreature(creature) {
  for (const patch of patches) {
    if (pointInPolygon({ x: creature.x, y: creature.y }, patch.vertices)) {
      return patch;
    }
  }
  return null;
}

function feedPatch(patch, herbColor) {
  patch.whiteOverlay = 0;      // Force the patch to be fully visible
  patch.baseColor = herbColor; // Set the patch’s color
}

function updatePatchColorAndResource(patch, allPatches) {
  return; // Temporarily disable automatic color updates

}

