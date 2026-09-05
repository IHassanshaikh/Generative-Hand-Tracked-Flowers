import './style.css';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { FlowerSystem } from './flower.js';

const video = document.getElementById('webcam');
const canvas = document.getElementById('output_canvas');
const ctx = canvas.getContext('2d');
const appDiv = document.getElementById('app');

// Add debug info overlay
const debugDiv = document.createElement('div');
debugDiv.id = 'debug-info';
appDiv.appendChild(debugDiv);

let handLandmarker = undefined;
let webcamRunning = false;
let lastVideoTime = -1;

const flowerSystem = new FlowerSystem(canvas);

let currentGrow = 0;
let currentBloom = 0;
let currentColorShift = 0;
let handPositions = [];

// Initialize MediaPipe HandLandmarker
async function createHandLandmarker() {
  debugDiv.innerText = "Loading hand tracking model...";
  
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numHands: 2
  });
  
  debugDiv.innerText = "Model loaded. Starting camera...";
  enableCam();
}

// Calculate distance between two landmarks
function calculateDistance(lm1, lm2) {
  const dx = lm1.x - lm2.x;
  const dy = lm1.y - lm2.y;
  const dz = lm1.z - lm2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Calculate hand openness (all fingers spread vs fist) for extra control
function calculateHandOpenness(landmarks) {
  // Average distance of all fingertips from palm center
  const palmCenter = landmarks[9]; // middle finger base
  const fingertips = [landmarks[4], landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
  let totalDist = 0;
  for (const tip of fingertips) {
    totalDist += calculateDistance(palmCenter, tip);
  }
  return Math.min(1, (totalDist / 5 - 0.05) / 0.2);
}

// Enable webcam — called once on startup
function enableCam() {
  if (!handLandmarker) {
    console.log("Wait! Hand landmarker not loaded yet.");
    return;
  }

  // Detect if mobile
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const constraints = {
    video: {
      width: { ideal: isMobile ? 640 : 1280 },
      height: { ideal: isMobile ? 480 : 720 },
      facingMode: "user"
    }
  };

  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", () => {
      handleResize();
      predictWebcam();
    }, { once: true });
    webcamRunning = true;
  }).catch((err) => {
    console.error("Error accessing webcam:", err);
    debugDiv.innerText = "Webcam access denied. Please allow camera access.";
  });
}

function handleResize() {
  // Use the actual display size, accounting for device pixel ratio for sharp rendering
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap at 2x for performance
  const displayWidth = window.innerWidth;
  const displayHeight = window.innerHeight;
  
  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;
  canvas.style.width = displayWidth + 'px';
  canvas.style.height = displayHeight + 'px';
  
  flowerSystem.resize(canvas.width, canvas.height);
}

// Debounced resize for orientation changes
let orientationTimeout = null;
function handleOrientationChange() {
  clearTimeout(orientationTimeout);
  // Delay to let the viewport dimensions settle after rotation
  orientationTimeout = setTimeout(handleResize, 300);
}

window.addEventListener('resize', handleResize);
// Handle mobile orientation changes
screen.orientation?.addEventListener?.('change', handleOrientationChange);
// Fallback for browsers/webviews that fire the legacy event
window.addEventListener('orientationchange', handleOrientationChange);

async function predictWebcam() {
  // Check if canvas CSS size matches the viewport (compare CSS pixels to CSS pixels)
  if (parseInt(canvas.style.width) !== window.innerWidth ||
      parseInt(canvas.style.height) !== window.innerHeight) {
    handleResize();
  }

  let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    
    const results = handLandmarker.detectForVideo(video, startTimeMs);
    
    let targetGrow = 0;
    let targetBloom = 0;
    let targetColorShift = currentColorShift;
    handPositions = [];

    if (results.landmarks && results.landmarks.length > 0) {
       for (let i = 0; i < results.landmarks.length; i++) {
         const landmarks = results.landmarks[i];
         
         const thumbTip = landmarks[4];
         const indexTip = landmarks[8];
         
         const distance = calculateDistance(thumbTip, indexTip);
         const normalizedVal = Math.max(0, Math.min(1, (distance - 0.03) / 0.25));
         
         // Extra control: hand openness affects color shift
         const openness = calculateHandOpenness(landmarks);

         // Save hand position data for HUD rendering
         handPositions.push({
           thumb: thumbTip,
           index: indexTip,
           wrist: landmarks[0],
           value: normalizedVal,
           openness: openness
         });

         // Hand 1 = Grow (stem height), Hand 2 = Bloom (petal opening)
         if (i === 0) {
           targetGrow = normalizedVal;
           targetColorShift = openness; // spread all fingers to shift flower colors!
         } else if (i === 1) {
           targetBloom = normalizedVal;
         }
       }
       
       // If only one hand, use its value for both grow and bloom
       if (results.landmarks.length === 1) {
         targetBloom = targetGrow;
       }
    }

    // Smoothly interpolate values for fluid animation
    currentGrow += (targetGrow - currentGrow) * 0.08;
    currentBloom += (targetBloom - currentBloom) * 0.08;
    currentColorShift += (targetColorShift - currentColorShift) * 0.05;
  }

  // Draw the bouquet of flowers controlled by hand gestures
  flowerSystem.draw(currentGrow, currentBloom, handPositions, currentColorShift);

  // Draw tracking HUD overlay
  drawHUD();

  // Update debug info
  if (handPositions.length > 0) {
    let info = `🌱 Grow: ${currentGrow.toFixed(2)} | 🌸 Bloom: ${currentBloom.toFixed(2)}`;
    if (handPositions.length === 2) {
      info += ` | 🎨 Color: ${(currentColorShift * 100).toFixed(0)}%`;
    }
    info += ` | ✋ Hands: ${handPositions.length}`;
    debugDiv.innerText = info;
  } else {
    debugDiv.innerText = "Show your hands 🌸 Hand 1 = Grow | Hand 2 = Bloom | Spread fingers = Color shift";
  }

  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}

function drawHUD() {
  if (handPositions.length === 0) return;
  
  const w = canvas.width;
  const h = canvas.height;
  
  ctx.save();
  
  // Scale HUD elements based on screen size
  const isMobileScreen = w < 800;
  const dotRadius = isMobileScreen ? 6 : 8;
  const dotInner = isMobileScreen ? 1.5 : 2;
  const fontSize = isMobileScreen ? 12 : 15;
  const pillPad = isMobileScreen ? 10 : 14;
  const pillHeight = isMobileScreen ? 22 : 28;
  
  for (let i = 0; i < handPositions.length; i++) {
    const hp = handPositions[i];
    const thumb = hp.thumb;
    const index = hp.index;
    
    const tx = thumb.x * w;
    const ty = thumb.y * h;
    const ix = index.x * w;
    const iy = index.y * h;
    
    // Measurement line between thumb and index finger
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(ix, iy);
    ctx.strokeStyle = i === 0 ? 'rgba(100, 200, 255, 0.5)' : 'rgba(255, 150, 200, 0.5)';
    ctx.lineWidth = isMobileScreen ? 1.5 : 2;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Small circles at fingertips
    const color = i === 0 ? 'rgba(100, 200, 255, 0.8)' : 'rgba(255, 150, 200, 0.8)';
    const drawDot = (x, y) => {
      ctx.beginPath();
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, dotInner, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    };
    drawDot(tx, ty);
    drawDot(ix, iy);
    
    // Value label
    const val = hp.value.toFixed(2);
    const label = i === 0 ? "🌱 Grow" : "🌸 Bloom";
    const midX = (tx + ix) / 2;
    const midY = (ty + iy) / 2 - (isMobileScreen ? 14 : 20);
    
    ctx.font = `bold ${fontSize}px "Segoe UI", -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    
    // Background pill
    const textWidth = ctx.measureText(`${label}: ${val}`).width;
    const pillBg = i === 0 ? 'rgba(0, 30, 60, 0.7)' : 'rgba(40, 0, 30, 0.7)';
    ctx.fillStyle = pillBg;
    ctx.beginPath();
    ctx.roundRect(midX - textWidth/2 - pillPad, midY - pillHeight/2, textWidth + pillPad * 2, pillHeight, pillHeight/2);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.fillText(`${label}: ${val}`, midX, midY + fontSize * 0.2);
  }
  
  ctx.restore();
}

// Start the app
createHandLandmarker();
