const { ipcRenderer } = require('electron');

// DOM Elements
const overlayContainer = document.getElementById('overlay-container');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const toggleButton = document.getElementById('toggle-button');
const toolbar = document.getElementById('toolbar');
const screenshotOverlay = document.getElementById('screenshot-overlay');
const selectionBox = document.getElementById('selection-box');
const screenshotIndicator = document.getElementById('screenshot-indicator');
const fileInput = document.getElementById('file-input');
const selectTool = document.getElementById('select-tool');
const uploadTool = document.getElementById('upload-tool');
const settingsButton = document.getElementById('settings-button');
const settingsPopup = document.getElementById('settings-popup');
const tintColorInput = document.getElementById('tint-color-input');
const colorPreview = document.getElementById('color-preview');
const tintOpacitySlider = document.getElementById('tint-opacity-slider');
const tintOpacityValue = document.getElementById('tint-opacity-value');
const saturationSlider = document.getElementById('saturation-slider');
const saturationValue = document.getElementById('saturation-value');
const reflectionButton = document.getElementById('reflection-button');

// State
let isOverlayActive = false;
let isScreenshotMode = false;
let canvasScale = 0.5; // Default zoom - further out
let canvasTranslateX = 0;
let canvasTranslateY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let backgroundImage = null;
let images = [];
let selectedImageIndex = -1;
let isDragging = false;
let isResizing = false;
let resizeHandle = null;
let dragStartX = 0;
let dragStartY = 0;
let backgroundTintColor = '#C8C8C8'; // Default light gray
let backgroundTintOpacity = 0.5; // Default opacity (50%)
let backgroundSaturation = 0; // Default saturation (0% = grayscale)
let isReflectionMode = false;
let reflectionImageIndex = -1;
let previousCanvasScale = 0.5;
let previousCanvasTranslateX = 0;
let previousCanvasTranslateY = 0;
let reflectionButtonBounds = null; // Store button bounds for click detection
let isAnimating = false;
let animationStartTime = 0;
let animationDuration = 500; // Animation duration in milliseconds
let animationStartScale = 0.5;
let animationStartTranslateX = 0;
let animationStartTranslateY = 0;
let animationEndScale = 0.5;
let animationEndTranslateX = 0;
let animationEndTranslateY = 0;
let backgroundFadeOpacity = 0; // Background fade-in opacity (0 to 1)
let isBackgroundFading = false; // Track if background is currently fading in
let backgroundFadeStartTime = 0;
let backgroundFadeDuration = 500; // Fade duration in milliseconds

// Canvas setup
function setupCanvas() {
  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
  };

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

// Initialize
setupCanvas();

// Check if mouse is over UI element
function isMouseOverUI(x, y) {
  if (isOverlayActive || isScreenshotMode) return true;
  
  // Check toggle button position directly
  const toggleRect = toggleButton.getBoundingClientRect();
  if (x >= toggleRect.left && x <= toggleRect.right &&
      y >= toggleRect.top && y <= toggleRect.bottom) {
    return true;
  }
  
  // Check settings button position directly
  const settingsRect = settingsButton.getBoundingClientRect();
  if (x >= settingsRect.left && x <= settingsRect.right &&
      y >= settingsRect.top && y <= settingsRect.bottom) {
    return true;
  }
  
  // Check settings popup position
  if (settingsPopup.classList.contains('visible')) {
    const popupRect = settingsPopup.getBoundingClientRect();
    if (x >= popupRect.left && x <= popupRect.right &&
        y >= popupRect.top && y <= popupRect.bottom) {
      return true;
    }
  }
  
  // Try elementFromPoint as fallback
  try {
    const el = document.elementFromPoint(x, y);
    if (el) {
      if (el.closest('#toggle-button') ||
          el.closest('#settings-button') ||
          el.closest('#settings-popup') ||
          el.closest('button') ||
          el.closest('input')) {
        return true;
      }
    }
  } catch (e) {
    // elementFromPoint might fail with click-through
  }
  
  return false;
}

// Create custom cursor from provided SVG
let customCursorURL = null;

function createCustomCursor() {
  if (customCursorURL) {
    return `url(${customCursorURL}) 1 1, auto`;
  }
  
  // SVG from cursor_Vector.svg
  const svg = `<svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.04081 1.69181C1.00134 1.60072 0.990168 1.49988 1.00875 1.40236C1.02732 1.30485 1.07479 1.21517 1.14498 1.14498C1.21517 1.07479 1.30485 1.02732 1.40236 1.00875C1.49988 0.990168 1.60072 1.00134 1.69181 1.04081L17.6918 7.54081C17.7891 7.58044 17.8714 7.64971 17.9271 7.73879C17.9828 7.82787 18.009 7.93222 18.0021 8.03704C17.9951 8.14186 17.9553 8.24182 17.8883 8.32274C17.8213 8.40365 17.7305 8.46141 17.6288 8.48781L11.5048 10.0678C11.1588 10.1568 10.8429 10.3368 10.59 10.5891C10.3372 10.8415 10.1565 11.157 10.0668 11.5028L8.48781 17.6288C8.46141 17.7305 8.40365 17.8213 8.32274 17.8883C8.24182 17.9553 8.14186 17.9951 8.03704 18.0021C7.93222 18.009 7.82787 17.9828 7.73879 17.9271C7.64971 17.8714 7.58044 17.7891 7.54081 17.6918L1.04081 1.69181Z" fill="white" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  customCursorURL = URL.createObjectURL(blob);
  // Hotspot at (1, 1) - tip of the pointer
  return `url(${customCursorURL}) 1 1, auto`;
}

// Toggle Overlay
function toggleOverlay() {
  isOverlayActive = !isOverlayActive;
  
  if (isOverlayActive) {
    overlayContainer.classList.add('active');
    ipcRenderer.send('set-ignore-mouse-events', false);
    // Ensure canvas is properly sized
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Reset zoom and position to defaults when opening overlay
    canvasScale = 0.5; // Further out zoom
    canvasTranslateX = 0;
    canvasTranslateY = 0;
    
    // Set custom cursor when canvas is visible
    canvas.style.cursor = createCustomCursor();
    
    // If background is already captured (e.g., from screenshot mode), use it immediately
    if (backgroundImage && backgroundImage.complete) {
      // Start fade-in animation for existing background
      backgroundFadeOpacity = 0;
      isBackgroundFading = true;
      backgroundFadeStartTime = Date.now();
      // Show toolbar unless in reflection mode
      if (!isReflectionMode) {
        toolbar.classList.add('visible');
      }
      draw();
    } else {
      // Hide toolbar initially - it will appear when background is loaded
      toolbar.classList.remove('visible');
      // Draw black background immediately so user sees something
      draw();
      // Capture fresh background when opening overlay
      // captureBackground() will show toolbar and update draw() when the image is loaded
      captureBackground().catch(() => {
        // If capture fails, still draw (will show black background)
        draw();
      });
    }
  } else {
    overlayContainer.classList.remove('active');
    toolbar.classList.remove('visible');
    // Hide reflection button when overlay is closed
    reflectionButton.classList.remove('visible');
    // Reset cursor to default
    canvas.style.cursor = 'default';
    // Check if mouse is still over UI before enabling click-through
    if (!isMouseOverUI(lastMouseX, lastMouseY)) {
      ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
    }
    // Don't clear images - they should persist
    // Just clear the canvas visually
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

// Mouse move handler for click-through management
window.addEventListener('mousemove', (e) => {
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  
  if (isOverlayActive || isScreenshotMode) return;
  
  const overUI = isMouseOverUI(e.clientX, e.clientY);
  
  if (overUI) {
    ipcRenderer.send('set-ignore-mouse-events', false);
  } else {
    ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
  }
});

// Capture background screenshot
async function captureBackground() {
  try {
    const sources = await ipcRenderer.invoke('get-sources');
    if (sources.length === 0) return;

    const source = sources[0];
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: source.id,
          minWidth: window.innerWidth,
          maxWidth: window.innerWidth * 2,
          minHeight: window.innerHeight,
          maxHeight: window.innerHeight * 2
        }
      }
    });

    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();

    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        setTimeout(() => {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = video.videoWidth;
          tempCanvas.height = video.videoHeight;
          const tempCtx = tempCanvas.getContext('2d');
          
          tempCtx.drawImage(video, 0, 0);
          
          // Note: Grayscale conversion is now handled by the saturation filter in draw()
          // This allows users to control saturation dynamically
          
          backgroundImage = new Image();
          backgroundImage.src = tempCanvas.toDataURL('image/png');
          backgroundImage.onload = () => {
            stream.getTracks().forEach(track => track.stop());
            // Start fade-in animation
            backgroundFadeOpacity = 0;
            isBackgroundFading = true;
            backgroundFadeStartTime = Date.now();
            // Show toolbar only after background image is loaded (unless in reflection mode)
            if (!isReflectionMode) {
              toolbar.classList.add('visible');
            }
            draw();
            resolve();
          };
        }, 300);
      };
    });
  } catch (error) {
    console.error('Error capturing background:', error);
  }
}

// Draw function
function draw() {
  if (!isOverlayActive) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fill with black background first to prevent desktop showing through blurred edges
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw background with blur - fully opaque, black and white, light gray tint
  if (backgroundImage) {
    ctx.save();
    
    // Update fade-in opacity if fading
    if (isBackgroundFading) {
      const currentTime = Date.now();
      const elapsed = currentTime - backgroundFadeStartTime;
      const progress = Math.min(elapsed / backgroundFadeDuration, 1);
      backgroundFadeOpacity = progress;
      
      if (progress >= 1) {
        isBackgroundFading = false;
        backgroundFadeOpacity = 1;
      }
    }
    
    ctx.globalAlpha = backgroundFadeOpacity; // Use fade opacity
    // Apply blur and saturation filters
    ctx.filter = `blur(20px) saturate(${backgroundSaturation}%)`;
    // Scale image to fit canvas
    const scale = Math.max(canvas.width / backgroundImage.width, canvas.height / backgroundImage.height);
    const scaledWidth = backgroundImage.width * scale;
    const scaledHeight = backgroundImage.height * scale;
    const x = (canvas.width - scaledWidth) / 2;
    const y = (canvas.height - scaledHeight) / 2;
    ctx.drawImage(backgroundImage, x, y, scaledWidth, scaledHeight);
    ctx.filter = 'none';
    
    // Apply tint overlay with configurable color and opacity (no blend mode)
    // At 100% opacity, it's a solid color; at lower opacity, it's semi-transparent
    const hex = backgroundTintColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${backgroundTintOpacity * backgroundFadeOpacity})`;
    ctx.fillRect(x, y, scaledWidth, scaledHeight);
    
    ctx.restore();
    
    // Continue animation if fading
    if (isBackgroundFading) {
      requestAnimationFrame(() => draw());
    }
  }

  // Apply transform
  ctx.save();
  ctx.setTransform(canvasScale, 0, 0, canvasScale, canvasTranslateX, canvasTranslateY);

  // Draw grid
  drawGrid();

  // Draw images
  if (isReflectionMode && reflectionImageIndex >= 0) {
    // In reflection mode, only draw the reflection image
    drawImage(images[reflectionImageIndex], reflectionImageIndex === selectedImageIndex);
  } else {
    // Normal mode - draw all images
    images.forEach((img, index) => {
      drawImage(img, index === selectedImageIndex);
    });
  }

  ctx.restore();

  // Draw reflection button if an image is selected (after transform is restored for fixed size)
  if (selectedImageIndex >= 0 && selectedImageIndex < images.length) {
    drawReflectionButton(images[selectedImageIndex]);
  } else {
    reflectionButtonBounds = null;
  }
}

// Draw grid
function drawGrid() {
  const gridSize = 40;
  const startX = Math.floor(-canvasTranslateX / canvasScale / gridSize) * gridSize;
  const startY = Math.floor(-canvasTranslateY / canvasScale / gridSize) * gridSize;
  const endX = startX + (canvas.width / canvasScale) + gridSize * 2;
  const endY = startY + (canvas.height / canvasScale) + gridSize * 2;

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1;

  // Vertical lines
  for (let x = startX; x < endX; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = startY; y < endY; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
  }
}

// Draw image with selection
function drawImage(img, isSelected) {
  if (!img.element) return;

  ctx.drawImage(img.element, img.x, img.y, img.width, img.height);

  if (isSelected) {
    // Draw selection border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2 / canvasScale;
    ctx.setLineDash([5 / canvasScale, 5 / canvasScale]);
    ctx.strokeRect(img.x, img.y, img.width, img.height);
    ctx.setLineDash([]);

    // Draw resize handles
    const handleSize = 8 / canvasScale;
    const handles = [
      { x: img.x, y: img.y }, // top-left
      { x: img.x + img.width, y: img.y }, // top-right
      { x: img.x + img.width, y: img.y + img.height }, // bottom-right
      { x: img.x, y: img.y + img.height } // bottom-left
    ];

    ctx.fillStyle = '#3b82f6';
    handles.forEach(handle => {
      ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
    });
  }
}

// Draw reflection button on canvas (at fixed screen size)
function drawReflectionButton(img) {
  if (!img) return;
  
  const buttonText = isReflectionMode ? 'Exit reflection' : 'Enter reflection';
  const buttonPadding = 10; // Fixed pixel padding
  const buttonSpacing = 10; // Fixed pixel spacing between image and button
  
  // Calculate button position in canvas coordinates (below image, centered)
  const buttonCanvasX = img.x + img.width / 2;
  const buttonCanvasY = img.y + img.height;
  
  // Convert to screen coordinates
  const screenPos = canvasToScreen(buttonCanvasX, buttonCanvasY);
  const buttonScreenX = screenPos.x;
  const buttonScreenY = screenPos.y + buttonSpacing;
  
  // Measure text at fixed size
  ctx.save();
  ctx.font = `14px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const textMetrics = ctx.measureText(buttonText);
  const textWidth = textMetrics.width;
  const textHeight = 20; // Fixed pixel text height
  
  // Calculate button dimensions (fixed pixel size)
  const buttonWidth = textWidth + buttonPadding * 2;
  const buttonHeight = textHeight + buttonPadding * 2;
  
  // Store button bounds for click detection (in screen coordinates)
  reflectionButtonBounds = {
    x: buttonScreenX - buttonWidth / 2,
    y: buttonScreenY,
    width: buttonWidth,
    height: buttonHeight,
    isScreenCoords: true // Flag to indicate these are screen coordinates
  };
  
  // Draw button background with rounded corners (fixed pixel size)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  const cornerRadius = 8; // Fixed pixel corner radius
  const buttonLeft = buttonScreenX - buttonWidth / 2;
  
  // Draw rounded rectangle
  ctx.beginPath();
  ctx.moveTo(buttonLeft + cornerRadius, buttonScreenY);
  ctx.lineTo(buttonLeft + buttonWidth - cornerRadius, buttonScreenY);
  ctx.quadraticCurveTo(buttonLeft + buttonWidth, buttonScreenY, buttonLeft + buttonWidth, buttonScreenY + cornerRadius);
  ctx.lineTo(buttonLeft + buttonWidth, buttonScreenY + buttonHeight - cornerRadius);
  ctx.quadraticCurveTo(buttonLeft + buttonWidth, buttonScreenY + buttonHeight, buttonLeft + buttonWidth - cornerRadius, buttonScreenY + buttonHeight);
  ctx.lineTo(buttonLeft + cornerRadius, buttonScreenY + buttonHeight);
  ctx.quadraticCurveTo(buttonLeft, buttonScreenY + buttonHeight, buttonLeft, buttonScreenY + buttonHeight - cornerRadius);
  ctx.lineTo(buttonLeft, buttonScreenY + cornerRadius);
  ctx.quadraticCurveTo(buttonLeft, buttonScreenY, buttonLeft + cornerRadius, buttonScreenY);
  ctx.closePath();
  ctx.fill();
  
  // Draw button border
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1; // Fixed pixel line width
  ctx.stroke();
  
  // Draw button text
  ctx.fillStyle = 'oklch(0.145 0 0)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(buttonText, buttonScreenX, buttonScreenY + buttonHeight / 2);
  
  ctx.restore();
}

// Easing function for smooth animation (ease-in-out)
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Animate canvas transform
function animateCanvasTransform() {
  if (!isAnimating) return;
  
  const currentTime = Date.now();
  const elapsed = currentTime - animationStartTime;
  const progress = Math.min(elapsed / animationDuration, 1);
  const easedProgress = easeInOutCubic(progress);
  
  // Interpolate between start and end values
  canvasScale = animationStartScale + (animationEndScale - animationStartScale) * easedProgress;
  canvasTranslateX = animationStartTranslateX + (animationEndTranslateX - animationStartTranslateX) * easedProgress;
  canvasTranslateY = animationStartTranslateY + (animationEndTranslateY - animationStartTranslateY) * easedProgress;
  
  // Redraw during animation
  draw();
  
  if (progress < 1) {
    // Continue animation
    requestAnimationFrame(animateCanvasTransform);
  } else {
    // Animation complete
    isAnimating = false;
    // Ensure final values are set exactly
    canvasScale = animationEndScale;
    canvasTranslateX = animationEndTranslateX;
    canvasTranslateY = animationEndTranslateY;
    draw();
  }
}

// Enter reflection mode
function enterReflectionMode() {
  if (selectedImageIndex < 0 || selectedImageIndex >= images.length) return;
  
  // Store current canvas state
  previousCanvasScale = canvasScale;
  previousCanvasTranslateX = canvasTranslateX;
  previousCanvasTranslateY = canvasTranslateY;
  
  const img = images[selectedImageIndex];
  
  // Calculate zoom to fit image in viewport (with 90% padding)
  const scaleX = (canvas.width * 0.9) / img.width;
  const scaleY = (canvas.height * 0.9) / img.height;
  const fitScale = Math.min(scaleX, scaleY);
  
  // Calculate image center in canvas coordinates
  const imageCenterX = img.x + img.width / 2;
  const imageCenterY = img.y + img.height / 2;
  
  // Calculate target position (center image in viewport)
  const targetTranslateX = canvas.width / 2 - imageCenterX * fitScale;
  const targetTranslateY = canvas.height / 2 - imageCenterY * fitScale;
  
  // Set animation start values (current state)
  animationStartScale = canvasScale;
  animationStartTranslateX = canvasTranslateX;
  animationStartTranslateY = canvasTranslateY;
  
  // Set animation end values (target state)
  animationEndScale = fitScale;
  animationEndTranslateX = targetTranslateX;
  animationEndTranslateY = targetTranslateY;
  
  // Set reflection mode state
  isReflectionMode = true;
  reflectionImageIndex = selectedImageIndex;
  
  // Hide toolbar and HTML button (we're drawing on canvas now)
  toolbar.classList.remove('visible');
  reflectionButton.classList.remove('visible');
  
  // Start animation
  isAnimating = true;
  animationStartTime = Date.now();
  animateCanvasTransform();
}

// Exit reflection mode
function exitReflectionMode() {
  // Set animation start values (current state)
  animationStartScale = canvasScale;
  animationStartTranslateX = canvasTranslateX;
  animationStartTranslateY = canvasTranslateY;
  
  // Set animation end values (previous state)
  animationEndScale = previousCanvasScale;
  animationEndTranslateX = previousCanvasTranslateX;
  animationEndTranslateY = previousCanvasTranslateY;
  
  // Clear reflection mode state
  isReflectionMode = false;
  reflectionImageIndex = -1;
  
  // Show toolbar again (if overlay is active)
  if (isOverlayActive) {
    toolbar.classList.add('visible');
  }
  
  // Hide HTML button (we're drawing on canvas now)
  reflectionButton.classList.remove('visible');
  
  // Start animation
  isAnimating = true;
  animationStartTime = Date.now();
  animateCanvasTransform();
}

// Convert screen coordinates to canvas coordinates
function screenToCanvas(x, y) {
  return {
    x: (x - canvasTranslateX) / canvasScale,
    y: (y - canvasTranslateY) / canvasScale
  };
}

// Convert canvas coordinates to screen coordinates
function canvasToScreen(x, y) {
  return {
    x: x * canvasScale + canvasTranslateX,
    y: y * canvasScale + canvasTranslateY
  };
}

// Check if an image is visible in the current viewport
function isImageVisible(img) {
  const viewportLeft = -canvasTranslateX / canvasScale;
  const viewportRight = (-canvasTranslateX + canvas.width) / canvasScale;
  const viewportTop = -canvasTranslateY / canvasScale;
  const viewportBottom = (-canvasTranslateY + canvas.height) / canvasScale;
  
  const imgRight = img.x + img.width;
  const imgBottom = img.y + img.height;
  
  // Check if image overlaps with viewport (with some padding)
  const padding = 50 / canvasScale; // 50 pixels padding in screen space
  return !(
    imgRight + padding < viewportLeft ||
    img.x - padding > viewportRight ||
    imgBottom + padding < viewportTop ||
    img.y - padding > viewportBottom
  );
}

// Pan canvas to show an image (centered or at least visible)
function panToShowImage(img) {
  // Don't animate if already animating
  if (isAnimating) return;
  
  // Check if image is already visible
  if (isImageVisible(img)) {
    return;
  }
  
  // Calculate image center in canvas coordinates
  const imageCenterX = img.x + img.width / 2;
  const imageCenterY = img.y + img.height / 2;
  
  // Calculate target transform to center the image in viewport
  // Formula: screenX = canvasX * scale + translateX
  // To center: canvas.width/2 = imageCenterX * scale + translateX
  // So: translateX = canvas.width/2 - imageCenterX * scale
  const targetTranslateX = canvas.width / 2 - imageCenterX * canvasScale;
  const targetTranslateY = canvas.height / 2 - imageCenterY * canvasScale;
  
  // Set animation start values (current state)
  animationStartScale = canvasScale;
  animationStartTranslateX = canvasTranslateX;
  animationStartTranslateY = canvasTranslateY;
  
  // Set animation end values (target state)
  animationEndScale = canvasScale; // Keep same scale
  animationEndTranslateX = targetTranslateX;
  animationEndTranslateY = targetTranslateY;
  
  // Start animation
  isAnimating = true;
  animationStartTime = Date.now();
  animateCanvasTransform();
}

// Handle selection changes
function handleSelectionChange(newIndex) {
  // If selecting a different image while in reflection mode, exit reflection mode
  if (isReflectionMode && newIndex !== reflectionImageIndex) {
    exitReflectionMode();
  }
  
  // Button is now drawn on canvas, so we just need to redraw
  draw();
}

// Get image at point
function getImageAt(x, y) {
  const canvasPos = screenToCanvas(x, y);
  
  for (let i = images.length - 1; i >= 0; i--) {
    const img = images[i];
    if (canvasPos.x >= img.x && canvasPos.x <= img.x + img.width &&
        canvasPos.y >= img.y && canvasPos.y <= img.y + img.height) {
      return i;
    }
  }
  return -1;
}

// Check if point is on reflection button
function isPointOnReflectionButton(x, y) {
  if (!reflectionButtonBounds) return false;
  
  // Button bounds are now in screen coordinates
  if (reflectionButtonBounds.isScreenCoords) {
    return x >= reflectionButtonBounds.x &&
           x <= reflectionButtonBounds.x + reflectionButtonBounds.width &&
           y >= reflectionButtonBounds.y &&
           y <= reflectionButtonBounds.y + reflectionButtonBounds.height;
  } else {
    // Fallback for old canvas coordinate system (shouldn't happen, but just in case)
    const canvasPos = screenToCanvas(x, y);
    return canvasPos.x >= reflectionButtonBounds.x &&
           canvasPos.x <= reflectionButtonBounds.x + reflectionButtonBounds.width &&
           canvasPos.y >= reflectionButtonBounds.y &&
           canvasPos.y <= reflectionButtonBounds.y + reflectionButtonBounds.height;
  }
}

// Get resize handle at point
function getResizeHandleAt(x, y, img) {
  const canvasPos = screenToCanvas(x, y);
  const handleSize = 8 / canvasScale;
  const handles = [
    { x: img.x, y: img.y, corner: 'nw' },
    { x: img.x + img.width, y: img.y, corner: 'ne' },
    { x: img.x + img.width, y: img.y + img.height, corner: 'se' },
    { x: img.x, y: img.y + img.height, corner: 'sw' }
  ];

  for (const handle of handles) {
    if (Math.abs(canvasPos.x - handle.x) < handleSize && 
        Math.abs(canvasPos.y - handle.y) < handleSize) {
      return handle.corner;
    }
  }
  return null;
}

// Event Listeners
toggleButton.addEventListener('click', toggleOverlay);

// Ensure toggle button is always clickable
toggleButton.addEventListener('mouseenter', () => {
  if (!isOverlayActive && !isScreenshotMode) {
    ipcRenderer.send('set-ignore-mouse-events', false);
  }
});

toggleButton.addEventListener('mouseleave', () => {
  if (!isOverlayActive && !isScreenshotMode) {
    ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
  }
});

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (!isOverlayActive) return;
  
  // Escape key - close overlay
  if (e.key === 'Escape') {
    toggleOverlay();
    return;
  }
  
  // Delete key - delete selected image
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedImageIndex >= 0) {
    e.preventDefault();
    // If deleting the reflection image, exit reflection mode first
    if (isReflectionMode && selectedImageIndex === reflectionImageIndex) {
      exitReflectionMode();
    }
    // Remove the selected image from the array
    images.splice(selectedImageIndex, 1);
    // Clear selection
    selectedImageIndex = -1;
    // Update button visibility
    handleSelectionChange(-1);
    // Redraw canvas
    draw();
  }
});

// Canvas mouse events
canvas.addEventListener('mousedown', (e) => {
  if (!isOverlayActive) return;
  
  // Prevent interactions during animation
  if (isAnimating) return;
  
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;

  // Check if clicking on reflection button
  if (isPointOnReflectionButton(e.clientX, e.clientY)) {
    e.stopPropagation();
    // Prevent starting new animation if one is already in progress
    if (isAnimating) return;
    if (isReflectionMode) {
      exitReflectionMode();
    } else {
      enterReflectionMode();
    }
    return;
  }

  // In reflection mode, disable all interactions except clicking the button
  if (isReflectionMode) {
    return;
  }

  if (selectedImageIndex >= 0) {
    const img = images[selectedImageIndex];
    const handle = getResizeHandleAt(e.clientX, e.clientY, img);
    
    if (handle) {
      isResizing = true;
      resizeHandle = handle;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      return;
    }

    const imgIndex = getImageAt(e.clientX, e.clientY);
    if (imgIndex === selectedImageIndex) {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      return;
    }
  }

  const imgIndex = getImageAt(e.clientX, e.clientY);
  if (imgIndex >= 0) {
    selectedImageIndex = imgIndex;
    handleSelectionChange(imgIndex);
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
  } else {
    selectedImageIndex = -1;
    handleSelectionChange(-1);
    isPanning = true;
    panStartX = e.clientX - canvasTranslateX;
    panStartY = e.clientY - canvasTranslateY;
    canvas.classList.add('panning');
  }

  draw();
});

canvas.addEventListener('mousemove', (e) => {
  if (!isOverlayActive) return;

  lastMouseX = e.clientX;
  lastMouseY = e.clientY;

  // Prevent interactions during animation
  if (isAnimating) return;

  // In reflection mode, disable all interactions
  if (isReflectionMode) {
    return;
  }

  if (isResizing && selectedImageIndex >= 0) {
    const img = images[selectedImageIndex];
    const deltaX = (e.clientX - dragStartX) / canvasScale;
    const deltaY = (e.clientY - dragStartY) / canvasScale;

    // Calculate new dimensions while maintaining aspect ratio
    let newWidth, newHeight;
    let anchorX, anchorY; // Point that stays fixed during resize

    switch (resizeHandle) {
      case 'nw': // Top-left corner - anchor is bottom-right
        anchorX = img.x + img.width;
        anchorY = img.y + img.height;
        newWidth = Math.max(10, img.width - deltaX);
        newHeight = newWidth / img.aspectRatio;
        // Adjust if height would be too small
        if (newHeight < 10) {
          newHeight = 10;
          newWidth = newHeight * img.aspectRatio;
        }
        img.width = newWidth;
        img.height = newHeight;
        img.x = anchorX - img.width;
        img.y = anchorY - img.height;
        break;
      case 'ne': // Top-right corner - anchor is bottom-left
        anchorX = img.x;
        anchorY = img.y + img.height;
        newWidth = Math.max(10, img.width + deltaX);
        newHeight = newWidth / img.aspectRatio;
        if (newHeight < 10) {
          newHeight = 10;
          newWidth = newHeight * img.aspectRatio;
        }
        img.width = newWidth;
        img.height = newHeight;
        img.y = anchorY - img.height;
        break;
      case 'se': // Bottom-right corner - anchor is top-left
        anchorX = img.x;
        anchorY = img.y;
        newWidth = Math.max(10, img.width + deltaX);
        newHeight = newWidth / img.aspectRatio;
        if (newHeight < 10) {
          newHeight = 10;
          newWidth = newHeight * img.aspectRatio;
        }
        img.width = newWidth;
        img.height = newHeight;
        break;
      case 'sw': // Bottom-left corner - anchor is top-right
        anchorX = img.x + img.width;
        anchorY = img.y;
        newWidth = Math.max(10, img.width - deltaX);
        newHeight = newWidth / img.aspectRatio;
        if (newHeight < 10) {
          newHeight = 10;
          newWidth = newHeight * img.aspectRatio;
        }
        img.width = newWidth;
        img.height = newHeight;
        img.x = anchorX - img.width;
        break;
    }

    dragStartX = e.clientX;
    dragStartY = e.clientY;
    draw();
  } else if (isDragging && selectedImageIndex >= 0) {
    const img = images[selectedImageIndex];
    const deltaX = (e.clientX - dragStartX) / canvasScale;
    const deltaY = (e.clientY - dragStartY) / canvasScale;
    
    img.x += deltaX;
    img.y += deltaY;
    
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    draw();
  } else if (isPanning) {
    canvasTranslateX = e.clientX - panStartX;
    canvasTranslateY = e.clientY - panStartY;
    draw();
  } else if (isPointOnReflectionButton(e.clientX, e.clientY)) {
    // Show pointer cursor when hovering over reflection button
    canvas.style.cursor = 'pointer';
  } else if (selectedImageIndex >= 0) {
    const img = images[selectedImageIndex];
    const handle = getResizeHandleAt(e.clientX, e.clientY, img);
    if (handle) {
      const cursors = { nw: 'nw-resize', ne: 'ne-resize', se: 'se-resize', sw: 'sw-resize' };
      canvas.style.cursor = cursors[handle];
    } else {
      canvas.style.cursor = createCustomCursor();
    }
  } else {
    // Default cursor when canvas is visible
    canvas.style.cursor = createCustomCursor();
  }
});

canvas.addEventListener('mouseup', () => {
  isPanning = false;
  isDragging = false;
  isResizing = false;
  resizeHandle = null;
  canvas.classList.remove('panning');
  canvas.style.cursor = createCustomCursor();
});

// Trackpad and mouse wheel gestures
canvas.addEventListener('wheel', (e) => {
  if (!isOverlayActive) return;
  
  // Prevent interactions during animation
  if (isAnimating) {
    e.preventDefault();
    return;
  }
  
  // In reflection mode, disable all wheel interactions
  if (isReflectionMode) {
    e.preventDefault();
    return;
  }
  
  e.preventDefault();

  // macOS trackpad: Two-finger pan sends wheel events with deltaX/deltaY
  // Pinch zoom sends wheel events with ctrlKey + deltaY
  // Regular mouse wheel: just deltaY

  // Check if this is a pinch zoom (Ctrl key pressed on macOS trackpad)
  if (e.ctrlKey || e.metaKey) {
    // PINCH ZOOM - faster zoom speed
    const zoomSpeed = 0.01; // Zoom speed
    const zoomFactor = 1 - (e.deltaY * zoomSpeed);
    const newScale = Math.max(0.1, Math.min(10, canvasScale * zoomFactor));
    
    if (Math.abs(newScale - canvasScale) < 0.001) return;

    // Get mouse position relative to canvas
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    // Convert screen coordinates to canvas coordinates before zoom
    // This gives us the canvas point that's currently under the mouse
    const canvasPoint = screenToCanvas(mouseX, mouseY);
    
    // Apply new scale
    canvasScale = newScale;
    
    // Calculate new translation so the same canvas point stays under the mouse
    // Formula: mouseX = canvasPoint.x * newScale + newTranslateX
    // So: newTranslateX = mouseX - canvasPoint.x * newScale
    canvasTranslateX = mouseX - canvasPoint.x * canvasScale;
    canvasTranslateY = mouseY - canvasPoint.y * canvasScale;
    
    draw();
  } else if (e.deltaX !== 0 || e.deltaY !== 0) {
    // TWO-FINGER PAN (or regular mouse wheel scroll)
    // On trackpad, two-finger pan sends deltaX and deltaY
    // On mouse wheel, we only get deltaY, so we can use that for panning too
    
    // Invert panning direction (negative deltaX and deltaY)
    if (Math.abs(e.deltaX) > 0.1 || Math.abs(e.deltaY) > 0.1) {
      canvasTranslateX -= e.deltaX;
      canvasTranslateY -= e.deltaY;
      draw();
    }
  }
});

// IPC Listeners
ipcRenderer.on('toggle-screenshot', () => {
  startScreenshotMode();
});

// Screenshot mode
function startScreenshotMode() {
  isScreenshotMode = true;
  screenshotOverlay.classList.add('active');
  screenshotIndicator.classList.add('visible');
  ipcRenderer.send('set-ignore-mouse-events', false);
  
  // Reset selection box to ensure it's hidden when starting a new screenshot
  selectionBox.style.display = 'none';
  selectionBox.style.width = '0px';
  selectionBox.style.height = '0px';
  
  let startX = 0;
  let startY = 0;
  let isSelecting = false;
  let backgroundCapturePromise = null; // Store background capture promise

  const handleMouseDown = (e) => {
    startX = e.clientX;
    startY = e.clientY;
    isSelecting = true;
    selectionBox.style.display = 'block';
    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    
    // Start capturing background immediately when dragging starts
    backgroundCapturePromise = captureBackground();
  };

  const handleMouseMove = (e) => {
    if (!isSelecting) return;
    const width = Math.abs(e.clientX - startX);
    const height = Math.abs(e.clientY - startY);
    const left = Math.min(e.clientX, startX);
    const top = Math.min(e.clientY, startY);
    
    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
  };

  const handleMouseUp = async (e) => {
    if (!isSelecting) return;
    isSelecting = false;
    
    const rect = {
      left: Math.min(startX, e.clientX),
      top: Math.min(startY, e.clientY),
      width: Math.abs(e.clientX - startX),
      height: Math.abs(e.clientY - startY)
    };

    if (rect.width > 10 && rect.height > 10) {
      // Wait for background to be captured (if it was started)
      if (backgroundCapturePromise) {
        await backgroundCapturePromise;
      }
      // Hide selection box before capturing screenshot to avoid capturing it
      selectionBox.style.display = 'none';
      // Small delay to ensure the box is hidden before capture
      await new Promise(resolve => setTimeout(resolve, 50));
      await captureScreenshot(rect);
    }

    // Hide selection box when screenshot mode ends (if not already hidden)
    selectionBox.style.display = 'none';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    
    screenshotOverlay.classList.remove('active');
    screenshotIndicator.classList.remove('visible');
    isScreenshotMode = false;
    screenshotOverlay.removeEventListener('mousedown', handleMouseDown);
    screenshotOverlay.removeEventListener('mousemove', handleMouseMove);
    screenshotOverlay.removeEventListener('mouseup', handleMouseUp);
  };

  screenshotOverlay.addEventListener('mousedown', handleMouseDown);
  screenshotOverlay.addEventListener('mousemove', handleMouseMove);
  screenshotOverlay.addEventListener('mouseup', handleMouseUp);
}

// Capture screenshot
async function captureScreenshot(rect) {
  try {
    const sources = await ipcRenderer.invoke('get-sources');
    if (sources.length === 0) return;

    const source = sources[0];
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: source.id,
          minWidth: window.innerWidth,
          maxWidth: window.innerWidth * 2,
          minHeight: window.innerHeight,
          maxHeight: window.innerHeight * 2
        }
      }
    });

    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();

    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        setTimeout(() => {
          const scaleX = video.videoWidth / window.innerWidth;
          const scaleY = video.videoHeight / window.innerHeight;
          
          const outputWidth = rect.width * scaleX;
          const outputHeight = rect.height * scaleY;
          
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = outputWidth;
          tempCanvas.height = outputHeight;
          const tempCtx = tempCanvas.getContext('2d');
          
          tempCtx.drawImage(
            video,
            rect.left * scaleX, rect.top * scaleY, outputWidth, outputHeight,
            0, 0, outputWidth, outputHeight
          );
          
          const dataURL = tempCanvas.toDataURL('image/png');
          
          stream.getTracks().forEach(track => track.stop());
          
          // Pass the screenshot position to addImageToCanvas
          // Calculate the center of the screenshot rect in screen coordinates
          const screenshotCenterX = rect.left + rect.width / 2;
          const screenshotCenterY = rect.top + rect.height / 2;
          
          addImageToCanvas(dataURL, screenshotCenterX, screenshotCenterY);
          
          if (!isOverlayActive) {
            toggleOverlay();
          }
          
          resolve();
        }, 300);
      };
    });
  } catch (error) {
    console.error('Error capturing screenshot:', error);
  }
}

// Check if two rectangles overlap
function doRectanglesOverlap(rect1, rect2, padding = 20) {
  // Add padding to prevent images from being too close
  return !(
    rect1.x + rect1.width + padding < rect2.x ||
    rect2.x + rect2.width + padding < rect1.x ||
    rect1.y + rect1.height + padding < rect2.y ||
    rect2.y + rect2.height + padding < rect1.y
  );
}

// Check if a position would overlap with any existing image
function wouldOverlap(x, y, width, height) {
  const newRect = { x, y, width, height };
  for (const existingImg of images) {
    const existingRect = {
      x: existingImg.x,
      y: existingImg.y,
      width: existingImg.width,
      height: existingImg.height
    };
    if (doRectanglesOverlap(newRect, existingRect)) {
      return true;
    }
  }
  return false;
}

// Find a non-overlapping position for a new image
function findNonOverlappingPosition(intendedX, intendedY, imgWidth, imgHeight) {
  // If no existing images, use intended position
  if (images.length === 0) {
    return { x: intendedX, y: intendedY };
  }
  
  // Check if intended position is free
  if (!wouldOverlap(intendedX, intendedY, imgWidth, imgHeight)) {
    return { x: intendedX, y: intendedY };
  }
  
  // Find the rightmost image
  let rightmostX = -Infinity;
  let rightmostImage = null;
  for (const img of images) {
    const rightEdge = img.x + img.width;
    if (rightEdge > rightmostX) {
      rightmostX = rightEdge;
      rightmostImage = img;
    }
  }
  
  // Try placing to the right of the rightmost image
  if (rightmostImage) {
    const spacing = 20; // Padding between images
    const newX = rightmostImage.x + rightmostImage.width + spacing;
    const newY = rightmostImage.y; // Align top edges
    
    if (!wouldOverlap(newX, newY, imgWidth, imgHeight)) {
      return { x: newX, y: newY };
    }
  }
  
  // If right side doesn't work, try below the rightmost image
  if (rightmostImage) {
    const spacing = 20;
    const newX = rightmostImage.x;
    const newY = rightmostImage.y + rightmostImage.height + spacing;
    
    if (!wouldOverlap(newX, newY, imgWidth, imgHeight)) {
      return { x: newX, y: newY };
    }
  }
  
  // If that doesn't work, find the bottommost image
  let bottommostY = -Infinity;
  let bottommostImage = null;
  for (const img of images) {
    const bottomEdge = img.y + img.height;
    if (bottomEdge > bottommostY) {
      bottommostY = bottomEdge;
      bottommostImage = img;
    }
  }
  
  // Try placing below the bottommost image
  if (bottommostImage) {
    const spacing = 20;
    const newX = bottommostImage.x;
    const newY = bottommostImage.y + bottommostImage.height + spacing;
    
    if (!wouldOverlap(newX, newY, imgWidth, imgHeight)) {
      return { x: newX, y: newY };
    }
  }
  
  // If all else fails, try to the right of the bottommost image
  if (bottommostImage) {
    const spacing = 20;
    const newX = bottommostImage.x + bottommostImage.width + spacing;
    const newY = bottommostImage.y;
    
    if (!wouldOverlap(newX, newY, imgWidth, imgHeight)) {
      return { x: newX, y: newY };
    }
  }
  
  // Last resort: place it at a diagonal offset from the rightmost/bottommost point
  let maxRight = Math.max(...images.map(img => img.x + img.width), 0);
  let maxBottom = Math.max(...images.map(img => img.y + img.height), 0);
  const spacing = 20;
  
  // Try diagonal position
  let attempts = 0;
  while (attempts < 10) {
    const newX = maxRight + spacing;
    const newY = maxBottom + spacing;
    
    if (!wouldOverlap(newX, newY, imgWidth, imgHeight)) {
      return { x: newX, y: newY };
    }
    
    // Try with more spacing
    maxRight += spacing;
    maxBottom += spacing;
    attempts++;
  }
  
  // Final fallback: use intended position even if it overlaps
  return { x: intendedX, y: intendedY };
}

// Add image to canvas
function addImageToCanvas(dataURL, screenX = null, screenY = null) {
  const img = new Image();
  img.onload = () => {
    let intendedX, intendedY;
    
    if (screenX !== null && screenY !== null) {
      // Convert screen coordinates to canvas coordinates
      // This places the image at the same position in the viewport where it was captured
      const canvasPos = screenToCanvas(screenX, screenY);
      intendedX = canvasPos.x - img.width / 2;
      intendedY = canvasPos.y - img.height / 2;
    } else {
      // Fallback: Calculate center position of visible canvas area (for uploaded images)
      const visibleCenterX = -canvasTranslateX / canvasScale + (canvas.width / canvasScale) / 2;
      const visibleCenterY = -canvasTranslateY / canvasScale + (canvas.height / canvasScale) / 2;
      intendedX = visibleCenterX - img.width / 2;
      intendedY = visibleCenterY - img.height / 2;
    }
    
    // Find a non-overlapping position
    const position = findNonOverlappingPosition(intendedX, intendedY, img.width, img.height);
    
    const imageObj = {
      element: img,
      x: position.x,
      y: position.y,
      width: img.width,
      height: img.height,
      aspectRatio: img.width / img.height // Store original aspect ratio
    };
    
    images.push(imageObj);
    selectedImageIndex = images.length - 1;
    handleSelectionChange(selectedImageIndex);
    
    // Pan to show the new image if it's not visible
    // Only do this if overlay is active (to avoid panning when overlay is closed)
    if (isOverlayActive) {
      panToShowImage(imageObj);
    }
    
    draw();
  };
  img.src = dataURL;
}

// Upload tool
uploadTool.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      addImageToCanvas(event.target.result);
    };
    reader.readAsDataURL(file);
  }
  fileInput.value = '';
});

// Settings button and popup
settingsButton.addEventListener('click', (e) => {
  e.stopPropagation();
  const isVisible = settingsPopup.classList.contains('visible');
  if (isVisible) {
    settingsPopup.classList.remove('visible');
    // Re-enable click-through if overlay is not active
    if (!isOverlayActive && !isScreenshotMode) {
      if (!isMouseOverUI(lastMouseX, lastMouseY)) {
        ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
      }
    }
  } else {
    settingsPopup.classList.add('visible');
    ipcRenderer.send('set-ignore-mouse-events', false);
  }
});

// Update tint color
function updateTintColor(hex) {
  // Remove # if present for validation
  const cleanHex = hex.replace('#', '');
  // Validate hex color (6 characters)
  const hexPattern = /^[0-9A-Fa-f]{6}$/;
  if (hexPattern.test(cleanHex)) {
    // Ensure # prefix
    backgroundTintColor = '#' + cleanHex.toUpperCase();
    tintColorInput.value = backgroundTintColor;
    colorPreview.style.backgroundColor = backgroundTintColor;
    // Redraw if overlay is active
    if (isOverlayActive) {
      draw();
    }
  }
}

// Initialize color preview
colorPreview.style.backgroundColor = backgroundTintColor;

// Handle tint color input
tintColorInput.addEventListener('input', (e) => {
  updateTintColor(e.target.value);
});

tintColorInput.addEventListener('blur', (e) => {
  updateTintColor(e.target.value);
});

// Handle tint opacity slider
tintOpacitySlider.addEventListener('input', (e) => {
  const opacityPercent = parseInt(e.target.value);
  backgroundTintOpacity = opacityPercent / 100;
  tintOpacityValue.textContent = opacityPercent + '%';
  // Redraw if overlay is active
  if (isOverlayActive) {
    draw();
  }
});

// Handle saturation slider
saturationSlider.addEventListener('input', (e) => {
  const saturationPercent = parseInt(e.target.value);
  backgroundSaturation = saturationPercent;
  saturationValue.textContent = saturationPercent + '%';
  // Redraw if overlay is active
  if (isOverlayActive) {
    draw();
  }
});

// Initialize saturation value display
saturationValue.textContent = saturationSlider.value + '%';

// Close settings popup when clicking outside
document.addEventListener('click', (e) => {
  if (settingsPopup.classList.contains('visible')) {
    if (!settingsPopup.contains(e.target) && !settingsButton.contains(e.target)) {
      settingsPopup.classList.remove('visible');
      if (!isOverlayActive && !isScreenshotMode) {
        if (!isMouseOverUI(lastMouseX, lastMouseY)) {
          ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
        }
      }
    }
  }
});

// Ensure settings button is always clickable
settingsButton.addEventListener('mouseenter', () => {
  if (!isOverlayActive && !isScreenshotMode) {
    ipcRenderer.send('set-ignore-mouse-events', false);
  }
});

settingsButton.addEventListener('mouseleave', () => {
  if (!isOverlayActive && !isScreenshotMode && !settingsPopup.classList.contains('visible')) {
    ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
  }
});

// Initial draw
draw();

