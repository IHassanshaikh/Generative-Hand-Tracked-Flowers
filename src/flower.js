// flower.js - Realistic generative flower system

export class FlowerSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.fallingPetals = [];
    this.fireflies = [];
    
    // Spawn some ambient fireflies
    for (let i = 0; i < 40; i++) {
      this.fireflies.push({
        x: Math.random() * 1280,
        y: Math.random() * 720,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        phase: Math.random() * Math.PI * 2,
        size: 1 + Math.random() * 2,
        hue: 30 + Math.random() * 30 // warm golden
      });
    }
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  // Draw a single realistic petal shape using bezier curves
  drawPetal(ctx, length, width, curvature, color1, color2, alpha, rotation) {
    ctx.save();
    ctx.rotate(rotation);
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    // Left side of petal
    ctx.bezierCurveTo(
      -width * 0.8, -length * 0.2 * curvature,
      -width * 0.6, -length * 0.7,
      0, -length
    );
    // Right side of petal
    ctx.bezierCurveTo(
      width * 0.6, -length * 0.7,
      width * 0.8, -length * 0.2 * curvature,
      0, 0
    );
    ctx.closePath();
    
    // Radial gradient for realistic petal coloring
    const gradient = ctx.createRadialGradient(0, -length * 0.3, 0, 0, -length * 0.4, length);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    
    ctx.fillStyle = gradient;
    ctx.globalAlpha = alpha;
    ctx.fill();
    
    // Subtle vein line down the center
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(width * 0.05, -length * 0.5, 0, -length * 0.85);
    ctx.strokeStyle = `rgba(255,255,255,${0.15 * alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Draw a realistic multi-layered rose
  drawRose(ctx, x, y, bloomFactor, hue, time, flowerAngle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(flowerAngle);
    
    const numLayers = 4;
    const petalsPerLayer = [5, 7, 9, 11]; // more petals on outer layers
    
    for (let layer = numLayers - 1; layer >= 0; layer--) {
      const layerProgress = Math.max(0, Math.min(1, (bloomFactor - layer * 0.15) / 0.5));
      if (layerProgress <= 0) continue;
      
      const numPetals = petalsPerLayer[layer];
      const layerRadius = (15 + layer * 18) * layerProgress;
      const petalLength = (20 + layer * 14) * layerProgress;
      const petalWidth = (10 + layer * 6) * layerProgress;
      const curvature = 1.0 + layer * 0.3; // outer petals curl more
      
      // Slightly different shade per layer
      const lightness = 65 - layer * 8;
      const saturation = 85 + layer * 5;
      const alpha = 0.7 + layer * 0.08;
      
      const color1 = `hsl(${hue}, ${saturation}%, ${lightness + 15}%)`;
      const color2 = `hsl(${hue}, ${saturation}%, ${lightness - 10}%)`;
      
      for (let p = 0; p < numPetals; p++) {
        const angle = (Math.PI * 2 / numPetals) * p + layer * 0.3 + Math.sin(time * 0.5) * 0.02;
        
        ctx.save();
        ctx.rotate(angle);
        ctx.translate(0, -layerRadius * 0.3);
        
        this.drawPetal(ctx, petalLength, petalWidth, curvature, color1, color2, alpha, 0);
        ctx.restore();
      }
    }
    
    // Center pistil/stamen
    if (bloomFactor > 0.2) {
      const coreSize = 5 + 6 * Math.min(1, bloomFactor);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize);
      gradient.addColorStop(0, `hsl(${hue + 30}, 90%, 80%)`);
      gradient.addColorStop(0.5, `hsl(${hue + 20}, 100%, 60%)`);
      gradient.addColorStop(1, `hsl(${hue}, 100%, 40%)`);
      
      ctx.beginPath();
      ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Tiny dots for pollen
      if (bloomFactor > 0.5) {
        for (let d = 0; d < 8; d++) {
          const da = (Math.PI * 2 / 8) * d + time * 0.3;
          const dr = coreSize * 0.5;
          ctx.beginPath();
          ctx.arc(Math.cos(da) * dr, Math.sin(da) * dr, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsl(50, 100%, 70%)`;
          ctx.fill();
        }
      }
    }
    
    ctx.restore();
  }

  // Draw a realistic stem with leaves
  drawStem(ctx, startX, startY, endX, endY, cp1X, cp1Y, cp2X, cp2Y, growFactor, time) {
    // Main stem - thick green
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
    
    // Green gradient for stem
    const stemGrad = ctx.createLinearGradient(startX, startY, endX, endY);
    stemGrad.addColorStop(0, 'hsl(120, 50%, 25%)');
    stemGrad.addColorStop(0.5, 'hsl(130, 60%, 30%)');
    stemGrad.addColorStop(1, 'hsl(125, 55%, 35%)');
    
    ctx.strokeStyle = stemGrad;
    ctx.lineWidth = 4 + 2 * growFactor;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Lighter highlight on stem edge
    ctx.beginPath();
    ctx.moveTo(startX + 1, startY);
    ctx.bezierCurveTo(cp1X + 1, cp1Y, cp2X + 1, cp2Y, endX + 1, endY);
    ctx.strokeStyle = 'rgba(100, 200, 100, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw leaves along the stem
    if (growFactor > 0.3) {
      const leafPositions = [0.3, 0.55, 0.75];
      for (let i = 0; i < leafPositions.length; i++) {
        const t = leafPositions[i];
        if (t > growFactor) break;
        
        // Get point on bezier
        const lx = this.bezierPoint(startX, cp1X, cp2X, endX, t);
        const ly = this.bezierPoint(startY, cp1Y, cp2Y, endY, t);
        
        const leafSize = 15 + 10 * growFactor;
        const leafAngle = Math.PI * 0.3 * (i % 2 === 0 ? 1 : -1) + Math.sin(time + i) * 0.1;
        
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(leafAngle);
        
        // Leaf shape
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-leafSize * 0.4, -leafSize * 0.3, -leafSize * 0.3, -leafSize * 0.8, 0, -leafSize);
        ctx.bezierCurveTo(leafSize * 0.3, -leafSize * 0.8, leafSize * 0.4, -leafSize * 0.3, 0, 0);
        ctx.closePath();
        
        const leafGrad = ctx.createLinearGradient(0, 0, 0, -leafSize);
        leafGrad.addColorStop(0, 'hsl(125, 60%, 28%)');
        leafGrad.addColorStop(1, 'hsl(130, 65%, 40%)');
        ctx.fillStyle = leafGrad;
        ctx.fill();
        
        // Leaf vein
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -leafSize * 0.85);
        ctx.strokeStyle = 'rgba(200, 255, 200, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.restore();
      }
    }
  }
  
  // Bezier point helper
  bezierPoint(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    return mt*mt*mt*p0 + 3*mt*mt*t*p1 + 3*mt*t*t*p2 + t*t*t*p3;
  }

  // Emit a falling petal
  emitFallingPetal(x, y, hue) {
    if (this.fallingPetals.length > 80) return;
    if (Math.random() > 0.08) return;
    
    this.fallingPetals.push({
      x, y,
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 1 + 0.5,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.05,
      size: 5 + Math.random() * 8,
      life: 1.0,
      hue: hue,
      swayPhase: Math.random() * Math.PI * 2,
    });
  }

  draw(growFactor, bloomFactor, handPositions, colorShift) {
    const { ctx, canvas } = this;
    const time = Date.now() / 1000;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const w = canvas.width;
    const h = canvas.height;
    
    const hueShift = (colorShift || 0) * 120; // shift hue based on hand distance
    
    // Always show a bouquet of flowers from the bottom (like the reference video)
    const flowerConfigs = [
      { xPct: 0.08, heightPct: 0.55, swaySeed: 0.5,  swayAmp: 40,  hue: 345, delay: 0 },
      { xPct: 0.18, heightPct: 0.70, swaySeed: 1.2,  swayAmp: 55,  hue: 335, delay: 0.05 },
      { xPct: 0.30, heightPct: 0.60, swaySeed: 2.0,  swayAmp: 35,  hue: 350, delay: 0.08 },
      { xPct: 0.42, heightPct: 0.80, swaySeed: 3.1,  swayAmp: 50,  hue: 320, delay: 0.03 },
      { xPct: 0.55, heightPct: 0.65, swaySeed: 4.5,  swayAmp: 45,  hue: 340, delay: 0.10 },
      { xPct: 0.68, heightPct: 0.75, swaySeed: 5.8,  swayAmp: 55,  hue: 355, delay: 0.02 },
      { xPct: 0.80, heightPct: 0.58, swaySeed: 6.7,  swayAmp: 40,  hue: 310, delay: 0.07 },
      { xPct: 0.92, heightPct: 0.68, swaySeed: 7.9,  swayAmp: 50,  hue: 330, delay: 0.06 },
    ];
    
    // Draw each flower
    for (let fi = 0; fi < flowerConfigs.length; fi++) {
      const cfg = flowerConfigs[fi];
      
      // Staggered grow — flowers don't all appear at once
      const localGrow = Math.max(0, Math.min(1, (growFactor - cfg.delay) / (1 - cfg.delay)));
      if (localGrow < 0.01) continue;
      
      const startX = w * cfg.xPct;
      const startY = h + 40;
      
      const targetH = h * cfg.heightPct * localGrow;
      const sway = Math.sin(time * 0.8 + cfg.swaySeed) * cfg.swayAmp * localGrow;
      
      const endX = startX + sway;
      const endY = startY - targetH;
      
      // Natural S-curve control points
      const cp1X = startX + sway * 0.2;
      const cp1Y = startY - targetH * 0.35;
      const cp2X = endX - sway * 0.3;
      const cp2Y = endY + targetH * 0.25;
      
      const hue = (cfg.hue + hueShift) % 360;
      
      // Draw stem
      this.drawStem(ctx, startX, startY, endX, endY, cp1X, cp1Y, cp2X, cp2Y, localGrow, time + cfg.swaySeed);
      
      // Draw flower at the end — bloom is staggered per flower too
      const localBloom = Math.max(0, Math.min(1, (bloomFactor - cfg.delay * 0.5) / (1 - cfg.delay * 0.5)));
      const flowerAngle = Math.sin(time * 0.3 + cfg.swaySeed) * 0.15; // gentle tilt
      this.drawRose(ctx, endX, endY, localBloom, hue, time, flowerAngle);
      
      // Emit falling petals when in full bloom
      if (localBloom > 0.6) {
        this.emitFallingPetal(endX, endY, hue);
      }
    }
    
    // Update and draw falling petals
    for (let i = this.fallingPetals.length - 1; i >= 0; i--) {
      const p = this.fallingPetals[i];
      p.x += p.vx + Math.sin(time * 2 + p.swayPhase) * 0.8;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      p.life -= 0.005;
      
      if (p.life <= 0 || p.y > h + 20) {
        this.fallingPetals.splice(i, 1);
        continue;
      }
      
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.life;
      
      // Small petal shape
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-p.size * 0.5, -p.size * 0.3, -p.size * 0.3, -p.size, 0, -p.size * 1.2);
      ctx.bezierCurveTo(p.size * 0.3, -p.size, p.size * 0.5, -p.size * 0.3, 0, 0);
      ctx.fillStyle = `hsl(${p.hue}, 80%, ${55 + p.life * 15}%)`;
      ctx.fill();
      
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    
    // Update and draw ambient fireflies
    for (const ff of this.fireflies) {
      ff.x += ff.vx + Math.sin(time + ff.phase) * 0.3;
      ff.y += ff.vy + Math.cos(time * 0.7 + ff.phase) * 0.3;
      
      // Wrap around screen
      if (ff.x < 0) ff.x = w;
      if (ff.x > w) ff.x = 0;
      if (ff.y < 0) ff.y = h;
      if (ff.y > h) ff.y = 0;
      
      const flicker = 0.3 + 0.7 * (Math.sin(time * 3 + ff.phase) * 0.5 + 0.5);
      
      ctx.beginPath();
      ctx.arc(ff.x, ff.y, ff.size * flicker, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${ff.hue}, 100%, 70%, ${0.4 * flicker * bloomFactor})`;
      ctx.shadowBlur = 15;
      ctx.shadowColor = `hsl(${ff.hue}, 100%, 60%)`;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}
