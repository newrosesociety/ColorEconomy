// Utility Functions for ColorEconomy

function randomColor() {
  return `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`;
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
                      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function getSickColor(color, sickFactor) {
  const m = color.match(/hsl\((\d+),\s*(\d+)%\s*,\s*(\d+)%\)/);
  if (!m) return color;
  let h = m[1], s = parseInt(m[2], 10), l = parseInt(m[3], 10);
  let newS = Math.round(s * (1 - sickFactor));
  return `hsl(${h}, ${newS}%, ${l}%)`;
}

function blendHSL(color1, color2, weight) {
  const m1 = color1.match(/hsl\((\d+),\s*(\d+)%\s*,\s*(\d+)%\)/);
  const m2 = color2.match(/hsl\((\d+),\s*(\d+)%\s*,\s*(\d+)%\)/);
  if (!m1 || !m2) return color1;
  let h1 = parseInt(m1[1]), s1 = parseInt(m1[2]), l1 = parseInt(m1[3]);
  let h2 = parseInt(m2[1]), s2 = parseInt(m2[2]), l2 = parseInt(m2[3]);
  let dh = h2 - h1;
  if (Math.abs(dh) > 180) { dh = dh > 0 ? dh - 360 : dh + 360; }
  let h = (h1 + weight * dh + 360) % 360;
  let s = Math.round(s1 * weight + s2 * (1 - weight));
  let l = Math.round(l1 * weight + l2 * (1 - weight));
  return `hsl(${h}, ${s}%, ${l}%)`;
}

// Helper function to determine creature type
function isHerbivore(creature) {
  // For example, classify herbivores by odd number of vertices.
  return creature.numVertices % 2 === 1;
}

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