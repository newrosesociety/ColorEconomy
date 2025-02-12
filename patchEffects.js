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

/**
 * Updates the color, light, resource, and splash effect for one patch.
 * @param {Object} patch - The patch object to update.
 * @param {Array} allPatches - Array of all patches (used to compute neighbors).
 */
function updatePatchColorAndResource(patch, allPatches) {
  // Calculate center
  patch.center = calculateCenter(patch.vertices);

  // Adjust hue based on neighboring patches within a threshold.
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
  patch.light += randRange(-SIMULATION.lightDrift, SIMULATION.lightDrift);
  patch.hue = (patch.hue + 360) % 360;
  patch.light = Math.min(90, Math.max(60, patch.light));

  // Recover patch resources.
  patch.resource = Math.min(100, patch.resource + SIMULATION.patchResourceRecovery);
  const effectiveSat = SIMULATION.boldSaturation * (patch.resource / 100);

  // Manage random splash effects.
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

  // Compute base color with splash effect.
  const effectiveHue = patch.hue + (patch.splash ? patch.splash.hueOffset * patch.splash.life : 0);
  patch.baseColor = `hsl(${Math.round(effectiveHue)}, ${Math.round(effectiveSat)}%, ${Math.round(patch.light)}%)`;
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