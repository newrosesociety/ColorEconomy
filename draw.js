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