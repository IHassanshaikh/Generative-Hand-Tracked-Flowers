// flower.js

export class FlowerSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Virtual resolution for consistent drawing regardless of screen size
    this.virtualWidth = 1280;
    this.virtualHeight = 720;
    
    this.flowers = [];
    
    // Create a few flowers with base positions
    const numFlowers = 5;
    for (let i = 0; i < numFlowers; i++) {
      this.flowers.push({
        baseX: this.virtualWidth * (0.2 + (i / numFlowers) * 0.6),
        baseY: this.virtualHeight + 50, // Start slightly below screen
        targetHeight: this.virtualHeight * 0.4 + Math.random() * this.virtualHeight * 0.3,
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: 0.02 + Math.random() * 0.02,
        colorHue: 330 + Math.random() * 40, // Pinks and reds
      });
    }
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  draw(growFactor, bloomFactor) {
    const { ctx, canvas, virtualWidth, virtualHeight } = this;
    const time = Date.now() / 1000;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Scale context to fit virtual resolution into actual canvas
    ctx.save();
    const scaleX = canvas.width / virtualWidth;
    const scaleY = canvas.height / virtualHeight;
    // We'll use uniform scaling based on height to keep aspect ratio of flowers
    const scale = Math.max(scaleX, scaleY);
    ctx.scale(scale, scale);
    
    // Center it horizontally if scaling makes it wider
    const xOffset = (canvas.width - virtualWidth * scale) / 2 / scale;
    ctx.translate(xOffset, 0);

    // Draw flowers
    for (const f of this.flowers) {
      // 1. Calculate Stem
      const currentHeight = f.targetHeight * growFactor;
      const sway = Math.sin(time * f.swaySpeed + f.swayOffset) * 50 * growFactor;
      
      const startX = f.baseX;
      const startY = f.baseY;
      
      const endX = startX + sway;
      const endY = startY - currentHeight;
      
      const cp1X = startX;
      const cp1Y = startY - currentHeight * 0.5;
      const cp2X = endX;
      const cp2Y = endY + currentHeight * 0.2;

      // Draw Stem (Straight/Wireframe look)
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      
      // We still use bezier but make it look more like a glowing light beam
      ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
      
      // Neon glow effect for stem
      ctx.strokeStyle = `hsl(210, 100%, 75%)`; // Light blue wireframe stem
      ctx.lineWidth = 2 + 1.5 * growFactor;
      ctx.shadowBlur = 20;
      ctx.shadowColor = `hsl(210, 100%, 60%)`;
      ctx.stroke();
      
      // Draw a subtle core line for the stem
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 5;
      ctx.stroke();
      
      // 2. Calculate and Draw Petals if grown enough
      if (growFactor > 0.1) {
        ctx.shadowBlur = 20 * bloomFactor;
        ctx.shadowColor = `hsl(${f.colorHue}, 100%, 60%)`;
        
        const numPetals = 7;
        const petalLength = 50 + 150 * bloomFactor;
        const petalWidth = 10 + 35 * bloomFactor;
        
        for(let p = 0; p < numPetals; p++) {
          // Petals spread out based on bloomFactor
          const spread = Math.PI * 0.8 * bloomFactor; 
          
          ctx.save();
          ctx.translate(endX, endY);
          
          // Base rotation for the flower pointing up, slightly angled by sway
          const flowerAngle = Math.atan2(endY - cp2Y, endX - cp2X) + Math.PI/2;
          ctx.rotate(flowerAngle);
          
          // Spread petals
          const petalAngle = -spread/2 + (spread / (numPetals-1 || 1)) * p;
          ctx.rotate(petalAngle);
          
          // Draw geometric/sharp Petal (diamond/kite shape)
          ctx.beginPath();
          ctx.moveTo(0, 0); // Base
          ctx.lineTo(-petalWidth / 2, -petalLength * 0.25); // Left point
          ctx.lineTo(0, -petalLength); // Tip
          ctx.lineTo(petalWidth / 2, -petalLength * 0.25); // Right point
          ctx.closePath();
          
          // Gradient for realism/glowing light effect
          const gradient = ctx.createLinearGradient(0, 0, 0, -petalLength);
          gradient.addColorStop(0, '#fff'); // White glowing base
          gradient.addColorStop(0.2, `hsl(${f.colorHue}, 100%, 65%)`);
          gradient.addColorStop(1, `hsla(${f.colorHue}, 100%, 50%, 0)`); // Fade to transparent at tip
          
          ctx.fillStyle = gradient;
          ctx.shadowBlur = 15 * bloomFactor;
          ctx.shadowColor = `hsl(${f.colorHue}, 100%, 50%)`;
          ctx.fill();
          
          // Inner bright structural line
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, -petalLength * 0.8);
          ctx.strokeStyle = `hsla(0, 0%, 100%, ${0.6 + 0.4 * bloomFactor})`;
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#fff';
          ctx.stroke();
          
          ctx.restore();
        }
        
        // Center core glowing orb
        ctx.beginPath();
        ctx.arc(endX, endY, 3 + 6 * bloomFactor, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = `hsl(${f.colorHue}, 100%, 80%)`;
        ctx.fill();
      }
    }
    
    ctx.restore();
  }
}
