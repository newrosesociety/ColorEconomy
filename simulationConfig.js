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
  predatorBirthRate: 1.0,  // (optional; might not be used after adding thresholds)
  preyBirthRate: 1.0,      // (optional; might not be used after adding thresholds)
  diversity: 1.0,
  
  debugMode: false,
  herbivoreConstantEnergyGain: 0.2,
  
  // New Parameters:
  herbivoreProbability: 0.5,   // Probability that a creature is herbivore (adjust slider)
  herbivoreBirthThreshold: 80, // Energy needed for herbivore reproduction
  predatorBirthThreshold: 150  // Energy needed for predator reproduction
};