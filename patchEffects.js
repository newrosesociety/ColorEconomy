// Patch Effects Module: Contains helper functions for patch color evolution, resource, & splash effects

/**
 * Calculates and returns the center point of a polygon given its vertices.
 * @param {Array} vertices - List of points with {x, y}
 * @returns {Object} - Center point with {x, y}
 */
function calculateCenter(vertices) {
  let center = { x: 0, y: 0 };
  for (let p of vertices) {
    center.x += p.x;
    center.y += p.y;
  }
  center.x /= vertices.length;
  center.y /= vertices.length;
  return center;
}

/* ================================
   Terrain (Patch) Generation using Voronoi
=============================== */
function createPatches() {
  // Define bounds using the canvas dimensions
  const bounds = { x: 0, y: 0, w: canvas.width, h: canvas.height };

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
  
  for (let patch of patches) {
    patch.center = calculateCenter(patch.vertices);
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

/**
 * Updates the color, light, resource, and splash effect for one patch.
 * @param {Object} patch - The patch object to update.
 * @param {Array} allPatches - Array of all patches (used to compute neighbors).
 */
function updatePatchColorAndResource(patch, allPatches) {
  // Disable automatic patch color updates by returning immediately.
  return;
  
  // The code below used to update patch.baseColor – it's now disabled.
  /*
  // Always compute the polygon's center.
  patch.center = calculateCenter(patch.vertices);

  // If the patch is essentially untouched, force it to be white.
  if (patch.whiteOverlay >= 0.99) {
    patch.baseColor = "#ffffff";
    return;
  }
  
  // Otherwise, adjust the patch colors.
  let sumHue = 0, count = 0;
  for (let other of allPatches) {
    if (other === patch || !other.center) continue;
    const dx = other.center.x - patch.center.x;
    const dy = other.center.y - patch.center.y;
    if (Math.hypot(dx, dy) < SIMULATION.neighborThreshold) {
      sumHue += other.hue;
      count++;
    }
  }
  if (count > 0) {
    let avgHue = sumHue / count;
    patch.hue += (avgHue - patch.hue) * SIMULATION.hueAdjustmentFactor;
  }
  
  // Apply random drift.
  patch.hue += randRange(-SIMULATION.hueRandomDrift, SIMULATION.hueRandomDrift);
  patch.hue = (patch.hue + 360) % 360;
  
  // Slightly adjust the light value.
  patch.light += randRange(-SIMULATION.lightDrift, SIMULATION.lightDrift);
  patch.light = Math.min(90, Math.max(60, patch.light));
  
  // Recover patch resources.
  patch.resource = Math.min(100, patch.resource + SIMULATION.patchResourceRecovery);
  const effectiveSat = SIMULATION.boldSaturation * (patch.resource / 100);
  
  // Handle splash effects.
  if (!patch.splash && Math.random() < SIMULATION.splashProbability) {
    patch.splash = {
      hueOffset: randRange(-SIMULATION.splashMaxOffset, SIMULATION.splashMaxOffset),
      life: 1
    };
  }
  if (patch.splash) {
    patch.splash.life -= SIMULATION.splashLifeDecay;
    if (patch.splash.life <= 0) patch.splash = null;
  }
  
  // Compute the effective hue including any splash effect.
  const effectiveHue = patch.hue + (patch.splash ? patch.splash.hueOffset * patch.splash.life : 0);
  patch.baseColor = `hsl(${Math.round(effectiveHue)}, ${Math.round(effectiveSat)}%, ${Math.round(patch.light)}%)`;
  */
}

/**
 * Updates each patch in the global patches array.
 */
function updatePatches() {
  for (let patch of patches) {
    if (!patch.vertices || patch.vertices.length === 0) continue;
    updatePatchColorAndResource(patch, patches);
  }
}

/**
 * Initialize each patch with a white overlay.
 */
function initPatches() {
  for (let patch of patches) {
    patch.whiteOverlay = 1.0;
    // Force starting color to white so that the mosaic appears white initially.
    patch.baseColor = "#ffffff";
    console.log("Initialized patch:", patch);
  }
}

/**
 * When a herbivore feeds on a patch, its feeding reduces the white overlay
 * and shifts the patch's color toward the herbivore's species hue.
 * If the patch is being fed on by different hues, blend toward a murky tone.
 * @param {Object} patch - The patch object.
 * @param {string} herbColor - The feeding herbivore's hue.
 */
function feedPatch(patch, herbColor) {
  // Reduce the white overlay so the underlying color shows.
  patch.whiteOverlay = Math.max(0, patch.whiteOverlay - 0.15);
  
  // Set the patch baseColor directly to the creature's color.
  patch.baseColor = herbColor;
}

/**
 * During each update, patches recover white overlay if left undisturbed.
 */
function updatePatchRecovery() {
  for (let patch of patches) {
    // Ensure the patch has a whiteOverlay property.
    if (patch.whiteOverlay === undefined) {
      patch.whiteOverlay = 1.0;
    }
    patch.whiteOverlay = Math.min(1.0, patch.whiteOverlay + SIMULATION.patchRecoveryRate);
  }
}

function drawPatch(patch) {
  ctx.beginPath();
  ctx.moveTo(patch.vertices[0].x, patch.vertices[0].y);
  for (let i = 1; i < patch.vertices.length; i++) {
    ctx.lineTo(patch.vertices[i].x, patch.vertices[i].y);
  }
  ctx.closePath();

  // Draw the underlying vibrant base color.
  ctx.fillStyle = patch.baseColor;
  ctx.fill();

  // Draw the white overlay with opacity equal to patch.whiteOverlay.
  ctx.fillStyle = `rgba(255,255,255,${patch.whiteOverlay})`;
  ctx.fill();
}

function initSimulation() {
  createPatches();
  initPatches();   // Ensure this is called!
  initPatchResources();
  
  if (creatures.length === 0) {
    for (let i = 0; i < SIMULATION.initialCreatures; i++) {
      creatures.push(spawnCreature());
    }
  }
  console.log("Initial creature count:", creatures.length);
  
  gameLoop();
}

function herbivoreSeekPatch(creature) {
  const patch = patches[creature.targetPatch];
  if (!patch) return; // Avoid referencing an undefined patch!
  
  // ... your existing logic ...
}