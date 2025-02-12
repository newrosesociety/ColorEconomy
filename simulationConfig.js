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
  debugMode: false,

  // New property
  herbivoreConstantEnergyGain: 0.2,
  herbivoreProbability: 0.5, // 50% chance that a creature is herbivore
};