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

// Initialize MediaPipe HandLandmarker
async function createHandLandmarker() {
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
  
  // Start camera after loading model
  enableCam();
}

// Calculate distance between two landmarks
function calculateDistance(lm1, lm2) {
  const dx = lm1.x - lm2.x;
  const dy = lm1.y - lm2.y;
  const dz = lm1.z - lm2.z; // Optional, might improve robustness
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Enable webcam
function enableCam() {
  if (!handLandmarker) {
    console.log("Wait! objectDetector not loaded yet.");
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
  // Set canvas size to match video display size
  const videoRect = video.getBoundingClientRect();
  canvas.width = videoRect.width;
  canvas.height = videoRect.height;
  flowerSystem.resize(canvas.width, canvas.height);
}

window.addEventListener('resize', handleResize);

async function predictWebcam() {
  // Ensure canvas matches video size once video loads
  if (canvas.width !== video.getBoundingClientRect().width) {
    handleResize();
  }

  let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    
    // Perform detection
    const results = handLandmarker.detectForVideo(video, startTimeMs);
    window.lastResults = results; // Save for UI rendering later
    
    let targetGrow = currentGrow; // Maintain current if hands lost
    let targetBloom = currentBloom;

    if (results.landmarks && results.landmarks.length > 0) {
       for (let i = 0; i < results.landmarks.length; i++) {
         const landmarks = results.landmarks[i];
         const handedness = results.handednesses[i][0].categoryName; // "Left" or "Right"
         
         // In a mirrored video, "Left" hand in camera view is physical Right hand
         // But let's just use first hand for Grow, second for Bloom for simplicity
         
         const thumbTip = landmarks[4];
         const indexTip = landmarks[8];
         
         const distance = calculateDistance(thumbTip, indexTip);
         
         // Normalize distance (approx 0.05 min to 0.3 max depending on hand size to camera)
         const normalizedVal = Math.max(0, Math.min(1, (distance - 0.03) / 0.25));

         if (i === 0) {
           targetGrow = normalizedVal;
           debugDiv.innerText = `Grow (Hand 1): ${normalizedVal.toFixed(2)}\n`;
         } else if (i === 1) {
           targetBloom = normalizedVal;
           debugDiv.innerText += `Bloom (Hand 2): ${normalizedVal.toFixed(2)}`;
         }
       }
    } else {
       debugDiv.innerText = "No hands detected. Show hands and pinch/spread fingers.";
       // Optional: decay values if hands lost
       // targetGrow *= 0.95;
       // targetBloom *= 0.95;
    }

    // Smoothly interpolate values for fluid animation
    currentGrow += (targetGrow - currentGrow) * 0.1;
    currentBloom += (targetBloom - currentBloom) * 0.1;
  }

  // Draw generative graphics
  flowerSystem.draw(currentGrow, currentBloom);

  if (lastVideoTime === video.currentTime) {
      // Need results in scope to draw UI, so let's just do it inside the main block.
  }

  // Draw UI overlay if we have results
  if (window.lastResults && window.lastResults.landmarks) {
    ctx.save();
    const w = canvas.width;
    const h = canvas.height;
    
    for (let i = 0; i < window.lastResults.landmarks.length; i++) {
       const landmarks = window.lastResults.landmarks[i];
       const thumb = landmarks[4];
       const index = landmarks[8];
       
       const tx = thumb.x * w;
       const ty = thumb.y * h;
       const ix = index.x * w;
       const iy = index.y * h;
       
       ctx.beginPath();
       ctx.moveTo(tx, ty);
       ctx.lineTo(ix, iy);
       ctx.strokeStyle = '#2563eb'; // Blue line
       ctx.lineWidth = 3;
       ctx.shadowBlur = 10;
       ctx.shadowColor = '#2563eb';
       ctx.stroke();
       
       // Perpendicular ticks
       const dx = ix - tx;
       const dy = iy - ty;
       const dist = Math.sqrt(dx*dx + dy*dy) || 1;
       const nx = (-dy / dist) * 15;
       const ny = (dx / dist) * 15;
       
       ctx.beginPath();
       ctx.moveTo(tx - nx, ty - ny);
       ctx.lineTo(tx + nx, ty + ny);
       ctx.moveTo(ix - nx, iy - ny);
       ctx.lineTo(ix + nx, iy + ny);
       ctx.stroke();
       
       // Text
       ctx.font = '24px monospace';
       ctx.fillStyle = '#60a5fa';
       ctx.shadowBlur = 5;
       ctx.shadowColor = '#000';
       let val = i === 0 ? currentGrow : currentBloom;
       let label = i === 0 ? "Grow" : "Bloom";
       ctx.fillText(`${label}: ${val.toFixed(2)}`, ix + 20, iy);
    }
    ctx.restore();
  }

  // Call this function again to keep predicting when the browser is ready.
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}

// Start the app
createHandLandmarker();
