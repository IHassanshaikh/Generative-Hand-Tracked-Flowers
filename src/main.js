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

// Enable webcam
function enableCam() {
  if (!handLandmarker) {
    console.log("Wait! Hand landmarker not loaded yet.");
    return;
  }

  const constraints = {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: "user"
    }
  };

  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
    webcamRunning = true;
  }).catch((err) => {
    console.error("Error accessing webcam:", err);
    debugDiv.innerText = "Webcam access denied or unavailable.";
  });
}

function handleResize() {
  const videoRect = video.getBoundingClientRect();
  canvas.width = videoRect.width;
  canvas.height = videoRect.height;
  flowerSystem.resize(canvas.width, canvas.height);
}

window.addEventListener('resize', handleResize);

async function predictWebcam() {
  if (canvas.width !== video.getBoundingClientRect().width) {
    handleResize();
  }

  let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    
    const results = handLandmarker.detectForVideo(video, startTimeMs);
    
    let targetGrow = 0;
    let targetBloom = 0;
    handPositions = [];

    if (results.landmarks && results.landmarks.length > 0) {
       for (let i = 0; i < results.landmarks.length; i++) {
         const landmarks = results.landmarks[i];
         
         const thumbTip = landmarks[4];
         const indexTip = landmarks[8];
         const wrist = landmarks[0];
         const middleTip = landmarks[12];
         
         const distance = calculateDistance(thumbTip, indexTip);
         const normalizedVal = Math.max(0, Math.min(1, (distance - 0.03) / 0.25));

         // Save hand position data for flower rendering
         handPositions.push({
           wrist: wrist,
           middle: middleTip,
           thumb: thumbTip,
           index: indexTip,
           value: normalizedVal
         });

         if (i === 0) {
           targetGrow = normalizedVal;
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
  }

  // Draw generative flowers, passing hand positions so flowers grow from hands
  flowerSystem.draw(currentGrow, currentBloom, handPositions);

  // Draw tracking HUD overlay
  drawHUD();

  // Update debug info
  if (handPositions.length > 0) {
    debugDiv.innerText = `Grow: ${currentGrow.toFixed(2)} | Bloom: ${currentBloom.toFixed(2)} | Hands: ${handPositions.length}`;
  } else {
    debugDiv.innerText = "Show your hands and pinch/spread fingers 🌸";
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
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Small circles at fingertips
    const drawDot = (x, y) => {
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    };
    drawDot(tx, ty);
    drawDot(ix, iy);
    
    // Value label
    const val = hp.value.toFixed(2);
    const label = i === 0 ? "Grow" : "Bloom";
    const midX = (tx + ix) / 2;
    const midY = (ty + iy) / 2 - 20;
    
    ctx.font = 'bold 16px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    
    // Background pill
    const textWidth = ctx.measureText(`${label}: ${val}`).width;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(midX - textWidth/2 - 12, midY - 14, textWidth + 24, 28, 14);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.fillText(`${label}: ${val}`, midX, midY + 5);
  }
  
  ctx.restore();
}

// Start the app
createHandLandmarker();
