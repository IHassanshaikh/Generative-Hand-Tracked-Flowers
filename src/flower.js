// flower.js

export class FlowerSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Virtual resolution for consistent drawing regardless of screen size
    this.virtualWidth = 1280;
    this.virtualHeight = 720;
    
    this.flowers = [];
    this.particles = [];
    
    // Create a few flowers with base positions
    const numFlowers = 6;
    for (let i = 0; i < numFlowers; i++) {
      this.flowers.push({
        baseX: this.virtualWidth * (0.15 + (i / numFlowers) * 0.7),
        baseY: this.virtualHeight + 100, // Start slightly below screen
        targetHeight: this.virtualHeight * 0.4 + Math.random() * this.virtualHeight * 0.4,
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: 0.015 + Math.random() * 0.015,
        colorHue: 300 + Math.random() * 60, // Deep purples, pinks, magentas
      });
    }
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }
  
  emitParticle(x, y, hue) {
     if(Math.random() > 0.3) return; // limit emission rate
     this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4 - 2,
        life: 1.0,
        hue: hue
     });
  }

  draw(growFactor, bloomFactor) {
    const { ctx, canvas, virtualWidth, virtualHeight } = this;
    const time = Date.now() / 1000;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Enable additive blending for intense glow
    ctx.globalCompositeOperation = 'lighter';
    
    // Scale context to fit virtual resolution into actual canvas
    ctx.save();
    const scaleX = canvas.width / virtualWidth;
    const scaleY = canvas.height / virtualHeight;
    const scale = Math.max(scaleX, scaleY);
    ctx.scale(scale, scale);
    
    const xOffset = (canvas.width - virtualWidth * scale) / 2 / scale;
    ctx.translate(xOffset, 0);

    // Draw flowers
    for (const f of this.flowers) {
      const currentHeight = f.targetHeight * growFactor;
      if (currentHeight < 1) continue;
      
      const sway = Math.sin(time * f.swaySpeed + f.swayOffset) * 80 * growFactor;
      
      const startX = f.baseX;
      const startY = f.baseY;
      
      const endX = startX + sway;
      const endY = startY - currentHeight;
      
      const cp1X = startX;
      const cp1Y = startY - currentHeight * 0.3;
      const cp2X = endX - sway * 0.5;
      const cp2Y = endY + currentHeight * 0.3;

      // Pulse effect for energy
      const energyPulse = Math.sin(time * 3 + f.swayOffset) * 0.5 + 0.5;
      
      // Draw Stem (Energy Vine)
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
      
      // Outer glow
      ctx.strokeStyle = `hsla(${f.colorHue - 40}, 100%, 50%, ${0.5 + 0.3 * energyPulse})`; 
      ctx.lineWidth = 10 + 5 * growFactor;
      ctx.shadowBlur = 30;
      ctx.shadowColor = `hsl(${f.colorHue - 40}, 100%, 50%)`;
      ctx.stroke();
      
      // Inner energy core
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2 + 2 * growFactor;
      ctx.shadowBlur = 10;
      ctx.stroke();
      
      // Calculate and Draw Petals
      if (growFactor > 0.1) {
        
        const numPetals = 8;
        const baseLength = 80 + 150 * bloomFactor;
        
        // Emit particles from core if blooming
        if (bloomFactor > 0.5) {
           this.emitParticle(endX, endY, f.colorHue);
        }
        
        ctx.save();
        ctx.translate(endX, endY);
        
        const flowerAngle = Math.atan2(endY - cp2Y, endX - cp2X) + Math.PI/2;
        ctx.rotate(flowerAngle);
        
        // Draw multiple layers of petals for depth
        for(let layer = 0; layer < 2; layer++) {
            const layerScale = layer === 0 ? 1 : 0.6; // Inner petals are smaller
            const layerAlpha = layer === 0 ? 0.6 : 0.9;
            const layerRotOffset = layer === 0 ? 0 : Math.PI / numPetals;
            
            for(let p = 0; p < numPetals; p++) {
              const baseRot = (Math.PI * 2 / numPetals) * p + layerRotOffset + time * 0.1 * (layer === 0 ? 1 : -1);
              
              // Spread petals outward organically
              const targetAngle = baseRot * bloomFactor;
              
              ctx.save();
              ctx.rotate(targetAngle);
              
              const pLength = baseLength * layerScale;
              
              // Draw ethereal energy petal (flame/teardrop shape)
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.bezierCurveTo(-30 * bloomFactor, -pLength * 0.3, -40 * bloomFactor, -pLength * 0.8, 0, -pLength);
              ctx.bezierCurveTo(40 * bloomFactor, -pLength * 0.8, 30 * bloomFactor, -pLength * 0.3, 0, 0);
              ctx.closePath();
              
              const gradient = ctx.createLinearGradient(0, 0, 0, -pLength);
              gradient.addColorStop(0, '#fff'); // Blinding white core
              gradient.addColorStop(0.2, `hsla(${f.colorHue}, 100%, 70%, ${layerAlpha})`); // Vivid color
              gradient.addColorStop(1, `hsla(${f.colorHue + 30}, 100%, 50%, 0)`); // Dissolve to transparent neon edge
              
              ctx.fillStyle = gradient;
              ctx.shadowBlur = 20 * bloomFactor;
              ctx.shadowColor = `hsl(${f.colorHue}, 100%, 50%)`;
              ctx.fill();
              
              // Energy filament in petal center
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(0, -pLength * (0.6 + 0.4 * energyPulse));
              ctx.strokeStyle = `hsla(255, 255%, 255%, ${0.5 + 0.5 * bloomFactor})`;
              ctx.lineWidth = layer === 0 ? 1 : 2;
              ctx.stroke();
              
              ctx.restore();
            }
        }
        
        // Super bright glowing orb in the center
        ctx.beginPath();
        ctx.arc(0, 0, (5 + 15 * bloomFactor) * (1 + 0.2 * energyPulse), 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 50;
        ctx.shadowColor = `hsl(${f.colorHue}, 100%, 60%)`;
        ctx.fill();
        ctx.restore();
      }
    }
    
    // Draw and update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
       let p = this.particles[i];
       p.x += p.vx;
       p.y += p.vy;
       p.vy -= 0.1; // gravity floats up
       p.life -= 0.02;
       
       if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
       }
       
       ctx.beginPath();
       ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
       ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.life})`;
       ctx.shadowBlur = 10;
       ctx.shadowColor = `hsl(${p.hue}, 100%, 50%)`;
       ctx.fill();
    }
    
    ctx.restore();
    ctx.globalCompositeOperation = 'source-over'; // reset
  }
}
