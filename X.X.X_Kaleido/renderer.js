const { ipcRenderer } = require('electron');

// DOM Elements
const overlayContainer = document.getElementById('overlay-container');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
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
const circleSpeedSlider = document.getElementById('circle-speed-slider');
const circleSpeedValue = document.getElementById('circle-speed-value');
const reflectionButton = document.getElementById('reflection-button');
const circleButton = document.getElementById('circle-button');
const actionSettingsButton = document.getElementById('action-settings-button');
const actionOpenCanvasButton = document.getElementById('action-open-canvas-button');
const actionCaptureArtefactButton = document.getElementById('action-capture-artefact-button');

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
let screenshotHandlers = null; // Store screenshot event handlers for cleanup
let savedCanvasScale = null; // Saved canvas scale when overlay is closed
let savedCanvasTranslateX = null; // Saved canvas translate X when overlay is closed
let savedCanvasTranslateY = null; // Saved canvas translate Y when overlay is closed

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
  
  // Check settings button position directly
  const settingsRect = settingsButton.getBoundingClientRect();
  if (x >= settingsRect.left && x <= settingsRect.right &&
      y >= settingsRect.top && y <= settingsRect.bottom) {
    return true;
  }
  
  // Check circle button position directly
  if (circleButton) {
    const circleButtonRect = circleButton.getBoundingClientRect();
    if (x >= circleButtonRect.left && x <= circleButtonRect.right &&
        y >= circleButtonRect.top && y <= circleButtonRect.bottom) {
      return true;
    }
  }
  
  // Check settings popup position
  if (settingsPopup.classList.contains('visible')) {
    const popupRect = settingsPopup.getBoundingClientRect();
    if (x >= popupRect.left && x <= popupRect.right &&
        y >= popupRect.top && y <= popupRect.bottom) {
      return true;
    }
  }
  
  // Check action buttons position
  if (actionSettingsButton && actionSettingsButton.classList.contains('visible')) {
    const buttonRect = actionSettingsButton.getBoundingClientRect();
    if (x >= buttonRect.left && x <= buttonRect.right &&
        y >= buttonRect.top && y <= buttonRect.bottom) {
      return true;
    }
  }
  if (actionOpenCanvasButton && actionOpenCanvasButton.classList.contains('visible')) {
    const buttonRect = actionOpenCanvasButton.getBoundingClientRect();
    if (x >= buttonRect.left && x <= buttonRect.right &&
        y >= buttonRect.top && y <= buttonRect.bottom) {
      return true;
    }
  }
  if (actionCaptureArtefactButton && actionCaptureArtefactButton.classList.contains('visible')) {
    const buttonRect = actionCaptureArtefactButton.getBoundingClientRect();
    if (x >= buttonRect.left && x <= buttonRect.right &&
        y >= buttonRect.top && y <= buttonRect.bottom) {
      return true;
    }
  }
  
  // Try elementFromPoint as fallback
  try {
    const el = document.elementFromPoint(x, y);
    if (el) {
      if (el.closest('#settings-button') ||
          el.closest('#circle-button') ||
          el.closest('#settings-popup') ||
          el.closest('.action-button') ||
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
    // Hide selection box when overlay becomes active (in case it's still visible)
    selectionBox.style.display = 'none';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    
    overlayContainer.classList.add('active');
    ipcRenderer.send('set-ignore-mouse-events', false);
    // Ensure canvas is properly sized
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Restore saved canvas position, or use defaults if first time opening
    if (savedCanvasScale !== null && savedCanvasTranslateX !== null && savedCanvasTranslateY !== null) {
      canvasScale = savedCanvasScale;
      canvasTranslateX = savedCanvasTranslateX;
      canvasTranslateY = savedCanvasTranslateY;
    } else {
      // First time opening - use defaults
      canvasScale = 0.5; // Further out zoom
      canvasTranslateX = 0;
      canvasTranslateY = 0;
    }
    
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
    // Exit reflection mode if active (without animation since we're closing)
    if (isReflectionMode) {
      // Get the image that was in reflection mode
      const reflectionImg = reflectionImageIndex >= 0 && reflectionImageIndex < images.length 
        ? images[reflectionImageIndex] 
        : null;
      
      // If the image has a finalPosition (from screenshot overlap avoidance), move it there
      if (reflectionImg && reflectionImg.finalPosition) {
        reflectionImg.x = reflectionImg.finalPosition.x;
        reflectionImg.y = reflectionImg.finalPosition.y;
        reflectionImg.finalPosition = null; // Clear it after moving
      }
      
      // Show all images again when exiting reflection mode
      images.forEach((img) => {
        img.hidden = false;
      });
      
      // Exit reflection mode without animation
      isReflectionMode = false;
      reflectionImageIndex = -1;
    }
    
    // Show all images when closing overlay (in case any were hidden)
    images.forEach((img) => {
      img.hidden = false;
    });
    
    // Deselect any selected image
    selectedImageIndex = -1;
    
    // Save current canvas position before closing
    savedCanvasScale = canvasScale;
    savedCanvasTranslateX = canvasTranslateX;
    savedCanvasTranslateY = canvasTranslateY;
    
    overlayContainer.classList.remove('active');
    toolbar.classList.remove('visible');
    // Hide reflection button when overlay is closed
    reflectionButton.classList.remove('visible');
    // Reset cursor to default
    canvas.style.cursor = 'default';
    
    // Uncollect circles when overlay closes
    if (isCirclesCollected) {
      isCirclesCollected = false;
      // Start rotation animation back to plus
      startIconRotation = currentIconRotation;
      iconRotationStartTime = Date.now();
      targetIconRotation = Math.PI / 4; // Plus icon when not collected
      // Animate back to moving state
      hoverAnimationStartTime = Date.now();
      hoverAnimationProgress = 1; // Start from 1 to animate to 0
    }
    
    // Check if mouse is still over UI before enabling click-through
    if (!isMouseOverUI(lastMouseX, lastMouseY)) {
      ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
    }
    // Don't clear images - they should persist
    // Just clear the canvas visually
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

// Toggle Action Buttons
function toggleActionButtons() {
  const isVisible = actionSettingsButton.classList.contains('visible');
  if (isVisible) {
    // Hide buttons
    actionSettingsButton.classList.remove('visible');
    actionOpenCanvasButton.classList.remove('visible');
    actionCaptureArtefactButton.classList.remove('visible');
    
    // Uncollect circles (restore normal state)
    if (isCirclesCollected) {
      isCirclesCollected = false;
      // Start rotation animation back to plus
      startIconRotation = currentIconRotation;
      iconRotationStartTime = Date.now();
      targetIconRotation = Math.PI / 4; // Plus icon when not collected
      // Animate back to moving state
      hoverAnimationStartTime = Date.now();
      hoverAnimationProgress = 1; // Start from 1 to animate to 0
    }
    
    // Re-enable click-through if overlay is not active
    if (!isOverlayActive && !isScreenshotMode) {
      if (!isMouseOverUI(lastMouseX, lastMouseY)) {
        ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
      }
    }
  } else {
    // Show buttons
    actionSettingsButton.classList.add('visible');
    actionOpenCanvasButton.classList.add('visible');
    actionCaptureArtefactButton.classList.add('visible');
    
    // Collect circles (show X state)
    if (!isCirclesCollected) {
      isCirclesCollected = true;
      // Start rotation animation
      startIconRotation = currentIconRotation;
      iconRotationStartTime = Date.now();
      targetIconRotation = 0; // X icon when collected
      // Store current circle positions as starting point for animation
      collectedStartPositions = circles.map(circle => ({ x: circle.x, y: circle.y }));
      // Store actual center as target position
      const centerX = circleButtonCanvas.width / 2;
      const centerY = circleButtonCanvas.height / 2;
      convergedCenterX = centerX;
      convergedCenterY = centerY;
      // Animate to collected state
      hoverAnimationStartTime = Date.now();
      hoverAnimationProgress = 0; // Start from 0 to animate to 1
    }
    
    ipcRenderer.send('set-ignore-mouse-events', false);
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
    // Set pointer cursor when over circle button
    if (circleButton) {
      const circleButtonRect = circleButton.getBoundingClientRect();
      if (e.clientX >= circleButtonRect.left && e.clientX <= circleButtonRect.right &&
          e.clientY >= circleButtonRect.top && e.clientY <= circleButtonRect.bottom) {
        document.body.style.cursor = 'pointer';
        circleButton.style.cursor = 'pointer';
        if (circleButtonCanvas) {
          circleButtonCanvas.style.cursor = 'pointer';
        }
      }
    }
  } else {
    ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
    // Reset cursor when not over UI
    document.body.style.cursor = 'default';
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
    const reflectionImg = images[reflectionImageIndex];
    drawImage(reflectionImg, reflectionImageIndex === selectedImageIndex);
    
    // Animate fade-out of other images during reflection mode transition
    const currentTime = Date.now();
    images.forEach((img, index) => {
      if (index !== reflectionImageIndex && img.fadeStartTime !== undefined) {
        const fadeElapsed = currentTime - img.fadeStartTime;
        const fadeProgress = Math.min(fadeElapsed / img.fadeDuration, 1);
        img.opacity = 1.0 - fadeProgress; // Fade from 1.0 to 0.0
        if (fadeProgress < 1) {
          // Continue drawing during fade
          drawImage(img, false);
        }
      }
    });
  } else {
    // Normal mode - draw all images that are not hidden
    // Animate fade-in if images are fading in
    const currentTime = Date.now();
    images.forEach((img, index) => {
      if (!img.hidden) {
        // Update opacity if fading in
        if (img.fadeStartTime !== undefined) {
          const fadeElapsed = currentTime - img.fadeStartTime;
          const fadeProgress = Math.min(fadeElapsed / img.fadeDuration, 1);
          img.opacity = fadeProgress; // Fade from 0.0 to 1.0
          if (fadeProgress >= 1) {
            img.opacity = 1.0;
            img.fadeStartTime = undefined; // Clear fade animation
          }
        }
        drawImage(img, index === selectedImageIndex);
      }
    });
  }

  ctx.restore();

  // Draw red control panel in reflection mode (after transform is restored for screen coordinates)
  if (isReflectionMode && reflectionImageIndex >= 0) {
    drawReflectionControlPanel(images[reflectionImageIndex]);
  }

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

  // Use image opacity (defaults to 1.0 if not set)
  const opacity = img.opacity !== undefined ? img.opacity : 1.0;
  ctx.save();
  ctx.globalAlpha = opacity;
  
  ctx.drawImage(img.element, img.x, img.y, img.width, img.height);
  
  ctx.restore();

  if (isSelected) {
    // Draw selection border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2 / canvasScale;
    ctx.strokeRect(img.x, img.y, img.width, img.height);

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

// Draw red control panel in reflection mode
function drawReflectionControlPanel(img) {
  if (!img || !isReflectionMode) return;
  
  // Control panel dimensions (in screen coordinates)
  const panelWidth = 500; // Fixed 500px width
  const spacing = 40; // Responsive spacing between image and panel
  
  // Get image position and dimensions in screen coordinates
  const imageTopLeft = canvasToScreen(img.x, img.y);
  const imageBottomLeft = canvasToScreen(img.x, img.y + img.height);
  const imageTopRight = canvasToScreen(img.x + img.width, img.y);
  
  // Panel height matches image height
  const panelHeight = imageBottomLeft.y - imageTopLeft.y;
  
  // Calculate panel position (to the right of the image, aligned with top)
  const panelX = imageTopRight.x + spacing;
  const panelY = imageTopLeft.y; // Align with top of image
  
  // Draw red control panel (already in screen coordinates since transform is restored)
  ctx.fillStyle = '#ef4444'; // Red background
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
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
  // Red background for "Exit reflection", blue for "Enter reflection" (same as selection frame)
  ctx.fillStyle = isReflectionMode ? 'rgba(239, 68, 68, 0.95)' : 'rgba(59, 130, 246, 0.95)';
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
  // White text for both buttons
  ctx.fillStyle = 'rgba(255, 255, 255, 1)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(buttonText, buttonScreenX, buttonScreenY + buttonHeight / 2);
  
  ctx.restore();
}

// Easing function for smooth animation (ease-in-out)
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Check if an image is visible in the current viewport
function isImageVisible(img) {
  // Convert image bounds to screen coordinates
  const topLeft = canvasToScreen(img.x, img.y);
  const bottomRight = canvasToScreen(img.x + img.width, img.y + img.height);
  
  // Check if any part of the image is visible
  return !(
    bottomRight.x < 0 ||
    topLeft.x > canvas.width ||
    bottomRight.y < 0 ||
    topLeft.y > canvas.height
  );
}

// Immediately position canvas to show a specific image (no animation)
function positionCanvasToShowImage(img) {
  // Calculate image center in canvas coordinates
  const imageCenterX = img.x + img.width / 2;
  const imageCenterY = img.y + img.height / 2;
  
  // Keep current scale (or use a reasonable scale if too zoomed in/out)
  // This preserves the user's zoom level while centering the new image
  const targetScale = Math.max(0.3, Math.min(1.0, canvasScale));
  
  // Calculate target position to center image in viewport
  const targetTranslateX = canvas.width / 2 - imageCenterX * targetScale;
  const targetTranslateY = canvas.height / 2 - imageCenterY * targetScale;
  
  // Immediately set canvas position (no animation)
  canvasScale = targetScale;
  canvasTranslateX = targetTranslateX;
  canvasTranslateY = targetTranslateY;
  
  // Redraw with new position
  draw();
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
  
  // Animate image opacity fade during transition
  if (isReflectionMode && reflectionImageIndex >= 0) {
    // Fade out other images
    const currentTime = Date.now();
    images.forEach((img, index) => {
      if (index !== reflectionImageIndex && img.fadeStartTime !== undefined) {
        const fadeElapsed = currentTime - img.fadeStartTime;
        const fadeProgress = Math.min(fadeElapsed / img.fadeDuration, 1);
        img.opacity = 1.0 - fadeProgress;
      }
    });
  } else if (!isReflectionMode) {
    // Fade in images when exiting reflection mode
    const currentTime = Date.now();
    images.forEach((img) => {
      if (img.fadeStartTime !== undefined) {
        const fadeElapsed = currentTime - img.fadeStartTime;
        const fadeProgress = Math.min(fadeElapsed / img.fadeDuration, 1);
        img.opacity = fadeProgress; // Fade from 0.0 to 1.0
        if (fadeProgress >= 1) {
          img.opacity = 1.0;
          img.fadeStartTime = undefined; // Clear fade animation
        }
      }
    });
  }
  
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
    
    // Continue fade-in animation if images are still fading in (after exiting reflection mode)
    if (!isReflectionMode) {
      const checkFade = () => {
        let stillFading = false;
        const currentTime = Date.now();
        images.forEach((img) => {
          if (img.fadeStartTime !== undefined) {
            const fadeElapsed = currentTime - img.fadeStartTime;
            const fadeProgress = Math.min(fadeElapsed / img.fadeDuration, 1);
            img.opacity = fadeProgress;
            if (fadeProgress < 1) {
              stillFading = true;
            } else {
              img.opacity = 1.0;
              img.fadeStartTime = undefined;
            }
          }
        });
        if (stillFading) {
          draw();
          requestAnimationFrame(checkFade);
        }
      };
      checkFade();
    }
  }
}

// Enter reflection mode
function enterReflectionMode(fromScreenshot = false) {
  if (selectedImageIndex < 0 || selectedImageIndex >= images.length) return;
  
  // Store current canvas state
  previousCanvasScale = canvasScale;
  previousCanvasTranslateX = canvasTranslateX;
  previousCanvasTranslateY = canvasTranslateY;
  
  const img = images[selectedImageIndex];
  
  // Control panel dimensions (in screen coordinates)
  const panelWidth = 500; // Fixed 500px width
  const spacing = 40; // Responsive spacing between image and panel
  
  // Calculate zoom to fit image + control panel in viewport (with 90% padding)
  // Account for control panel width and spacing
  const availableWidth = (canvas.width * 0.9) - panelWidth - spacing;
  const scaleX = availableWidth / img.width;
  const scaleY = (canvas.height * 0.9) / img.height;
  const fitScale = Math.min(scaleX, scaleY);
  
  // Calculate total width of image + spacing + panel in screen coordinates
  const imageScreenWidth = img.width * fitScale;
  const totalGroupWidth = imageScreenWidth + spacing + panelWidth;
  
  // Calculate image center in canvas coordinates
  const imageCenterX = img.x + img.width / 2;
  const imageCenterY = img.y + img.height / 2;
  
  // Calculate target position to center the group (image + spacing + panel) horizontally
  // The group should be centered, so the left edge of the image in screen coordinates should be at:
  // (canvas.width - totalGroupWidth) / 2
  const groupLeftScreenX = (canvas.width - totalGroupWidth) / 2;
  
  // Convert to canvas coordinates: screenX = canvasX * scale + translateX
  // So: translateX = screenX - canvasX * scale
  const targetTranslateX = groupLeftScreenX - img.x * fitScale;
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
  
  // Handle opacity of other images
  images.forEach((image, index) => {
    if (index !== selectedImageIndex) {
      if (fromScreenshot) {
        // For screenshots, immediately hide other images (no fade)
        image.opacity = 0.0;
        image.fadeStartTime = undefined; // No fade animation
      } else {
        // For button click, start fade-out animation
        image.opacity = 1.0;
        image.fadeStartTime = Date.now();
        image.fadeDuration = animationDuration; // Use same duration as canvas animation
      }
    } else {
      // Keep reflection image fully visible
      image.opacity = 1.0;
    }
  });
  
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
  
  // Get the image that was in reflection mode
  const reflectionImg = reflectionImageIndex >= 0 && reflectionImageIndex < images.length 
    ? images[reflectionImageIndex] 
    : null;
  
  // If the image has a finalPosition (from screenshot overlap avoidance), move it there
  if (reflectionImg && reflectionImg.finalPosition) {
    reflectionImg.x = reflectionImg.finalPosition.x;
    reflectionImg.y = reflectionImg.finalPosition.y;
    reflectionImg.finalPosition = null; // Clear it after moving
  }
  
  // Fade in all images when exiting reflection mode
  images.forEach((img, index) => {
    img.hidden = false;
    if (index !== reflectionImageIndex) {
      // Start fade-in animation
      img.opacity = 0.0;
      img.fadeStartTime = Date.now();
      img.fadeDuration = animationDuration;
    } else {
      // Keep reflection image fully visible
      img.opacity = 1.0;
    }
  });
  
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
      // Keep selection box visible - it will be hidden right before screenshot capture
      // Small delay before capture
      await new Promise(resolve => setTimeout(resolve, 50));
      await captureScreenshot(rect);
    } else {
      // If selection was too small, hide selection box and end screenshot mode
      selectionBox.style.display = 'none';
      selectionBox.style.width = '0px';
      selectionBox.style.height = '0px';
      
      screenshotOverlay.classList.remove('active');
      screenshotIndicator.classList.remove('visible');
      isScreenshotMode = false;
      screenshotOverlay.removeEventListener('mousedown', handleMouseDown);
      screenshotOverlay.removeEventListener('mousemove', handleMouseMove);
      screenshotOverlay.removeEventListener('mouseup', handleMouseUp);
      
      // Clear stored handlers
      screenshotHandlers = null;
    }
  };

  screenshotOverlay.addEventListener('mousedown', handleMouseDown);
  screenshotOverlay.addEventListener('mousemove', handleMouseMove);
  screenshotOverlay.addEventListener('mouseup', handleMouseUp);
  
  // Store handlers for cleanup
  screenshotHandlers = {
    mousedown: handleMouseDown,
    mousemove: handleMouseMove,
    mouseup: handleMouseUp
  };
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
          // Hide selection box right before capturing screenshot to avoid capturing it
          selectionBox.style.display = 'none';
          
          // Small additional delay to ensure the box is fully hidden before capture
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
            
            // Selection box is already hidden, just reset dimensions
            selectionBox.style.width = '0px';
            selectionBox.style.height = '0px';
            
            // End screenshot mode and clean up event listeners
            screenshotOverlay.classList.remove('active');
            screenshotIndicator.classList.remove('visible');
            isScreenshotMode = false;
            
            // Remove event listeners
            if (screenshotHandlers) {
              screenshotOverlay.removeEventListener('mousedown', screenshotHandlers.mousedown);
              screenshotOverlay.removeEventListener('mousemove', screenshotHandlers.mousemove);
              screenshotOverlay.removeEventListener('mouseup', screenshotHandlers.mouseup);
              screenshotHandlers = null;
            }
            
            if (!isOverlayActive) {
              toggleOverlay();
            }
            
            resolve();
          }, 50); // Small delay to ensure selection box is hidden
        }, 300);
      };
    });
  } catch (error) {
    console.error('Error capturing screenshot:', error);
  }
}

// Check if two rectangles overlap
function doRectanglesOverlap(rect1, rect2, padding = 60) {
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
  
  // Always place new screenshots to the right of the rightmost image, aligned at the top
  // This creates a horizontal row of screenshots
  let rightmostX = -Infinity;
  let rightmostImage = null;
  for (const img of images) {
    const rightEdge = img.x + img.width;
    if (rightEdge > rightmostX) {
      rightmostX = rightEdge;
      rightmostImage = img;
    }
  }
  
  if (rightmostImage) {
    const spacing = 60; // Padding between images
    const newX = rightmostImage.x + rightmostImage.width + spacing;
    const newY = rightmostImage.y; // Align top edges
    
    return { x: newX, y: newY };
  }
  
  // Fallback: use intended position even if it overlaps
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
    
    // For screenshots, use the intended position (where it was taken) for the animation
    // After exiting reflection mode, it will be repositioned to avoid overlap
    let position;
    let useIntendedPositionForScreenshot = false;
    
    if (screenX !== null && screenY !== null) {
      // For screenshots, use intended position initially (for smooth animation)
      position = { x: intendedX, y: intendedY };
      useIntendedPositionForScreenshot = true;
    } else {
      // For uploaded images, use overlap avoidance
      position = findNonOverlappingPosition(intendedX, intendedY, img.width, img.height);
    }
    
    const imageObj = {
      element: img,
      x: position.x,
      y: position.y,
      width: img.width,
      height: img.height,
      aspectRatio: img.width / img.height, // Store original aspect ratio
      finalPosition: null // Will store final position after reflection mode (for overlap avoidance)
    };
    
    // Calculate final position (for after reflection mode) if this is a screenshot
    if (useIntendedPositionForScreenshot) {
      const finalPos = findNonOverlappingPosition(intendedX, intendedY, img.width, img.height);
      imageObj.finalPosition = finalPos;
    }
    
    images.push(imageObj);
    selectedImageIndex = images.length - 1;
    handleSelectionChange(selectedImageIndex);
    
    // For screenshots, hide all other images for smooth transition to reflection mode
    if (screenX !== null && screenY !== null) {
      // Hide all other images and set opacity to 0 immediately
      images.forEach((img, index) => {
        if (index !== selectedImageIndex) {
          img.hidden = true;
          img.opacity = 0.0; // Immediately invisible
          img.fadeStartTime = undefined; // No fade animation
        }
      });
    }
    
    // For screenshots, position canvas so image appears at the screen position where it was captured
    // Then animate directly to reflection mode
    if (screenX !== null && screenY !== null) {
      // Position canvas so the image center appears at the screen position where screenshot was taken
      // Use a reasonable initial scale
      const initialScale = 0.5;
      const imageCenterX = imageObj.x + imageObj.width / 2;
      const imageCenterY = imageObj.y + imageObj.height / 2;
      
      // Calculate translate to position image center at screen position
      // screenX = imageCenterX * scale + translateX
      // So: translateX = screenX - imageCenterX * scale
      canvasScale = initialScale;
      canvasTranslateX = screenX - imageCenterX * initialScale;
      canvasTranslateY = screenY - imageCenterY * initialScale;
      
      draw();
      
      // Automatically enter reflection mode after screenshot is added
      // Small delay to ensure image is fully rendered, then animate to reflection mode
      setTimeout(() => {
        if (selectedImageIndex >= 0 && selectedImageIndex < images.length && !isReflectionMode) {
          enterReflectionMode(true); // Pass true to indicate it's from a screenshot
        }
      }, 100);
    } else {
      // For uploaded images (not screenshots), use normal positioning
      if (images.length > 1) {
        // Immediately position canvas (no animation)
        positionCanvasToShowImage(imageObj);
      } else {
        // First image - just draw normally
        draw();
      }
    }
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

// Helper function to hide buttons and uncollect circles
function hideActionButtons() {
  actionSettingsButton.classList.remove('visible');
  actionOpenCanvasButton.classList.remove('visible');
  actionCaptureArtefactButton.classList.remove('visible');
  
  if (isCirclesCollected) {
    isCirclesCollected = false;
    // Start rotation animation back to plus
    startIconRotation = currentIconRotation;
    iconRotationStartTime = Date.now();
    targetIconRotation = Math.PI / 4; // Plus icon when not collected
    // Animate back to moving state
    hoverAnimationStartTime = Date.now();
    hoverAnimationProgress = 1; // Start from 1 to animate to 0
  }
}

// Action button handlers
actionSettingsButton.addEventListener('click', (e) => {
  e.stopPropagation();
  // Hide action buttons and uncollect circles
  hideActionButtons();
  // Open settings popup (same as clicking settings button)
  settingsPopup.classList.add('visible');
  ipcRenderer.send('set-ignore-mouse-events', false);
});

actionOpenCanvasButton.addEventListener('click', (e) => {
  e.stopPropagation();
  // Hide action buttons and uncollect circles
  hideActionButtons();
  // Open overlay (toggleOverlay handles click-through)
  if (!isOverlayActive) {
    toggleOverlay();
  }
});

actionCaptureArtefactButton.addEventListener('click', (e) => {
  e.stopPropagation();
  // Hide action buttons and uncollect circles
  hideActionButtons();
  // Start screenshot mode
  startScreenshotMode();
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

// Handle circle speed slider
circleSpeedSlider.addEventListener('input', (e) => {
  const speedPercent = parseInt(e.target.value);
  circleSpeedMultiplier = speedPercent / 100; // Convert 0-200% to 0.0-2.0 multiplier
  circleSpeedValue.textContent = speedPercent + '%';
});

// Initialize circle speed value display
circleSpeedValue.textContent = circleSpeedSlider.value + '%';

// Close settings popup and action buttons when clicking outside
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
  
  const isAnyActionButtonVisible = actionSettingsButton.classList.contains('visible') ||
                                   actionOpenCanvasButton.classList.contains('visible') ||
                                   actionCaptureArtefactButton.classList.contains('visible');
  
  if (isAnyActionButtonVisible) {
    const isClickOnActionButton = actionSettingsButton.contains(e.target) ||
                                  actionOpenCanvasButton.contains(e.target) ||
                                  actionCaptureArtefactButton.contains(e.target);
    
    if (!isClickOnActionButton && !circleButton.contains(e.target)) {
      // Hide buttons and uncollect circles
      hideActionButtons();
      
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

// Ensure action buttons are always clickable
[actionSettingsButton, actionOpenCanvasButton, actionCaptureArtefactButton].forEach(button => {
  button.addEventListener('mouseenter', () => {
    if (!isOverlayActive && !isScreenshotMode) {
      ipcRenderer.send('set-ignore-mouse-events', false);
    }
  });

  button.addEventListener('mouseleave', () => {
    if (!isOverlayActive && !isScreenshotMode) {
      const isAnyActionButtonVisible = actionSettingsButton.classList.contains('visible') ||
                                       actionOpenCanvasButton.classList.contains('visible') ||
                                       actionCaptureArtefactButton.classList.contains('visible');
      if (!isAnyActionButtonVisible) {
        if (!isMouseOverUI(lastMouseX, lastMouseY)) {
          ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
        }
      }
    }
  });
});

// Circle Button Implementation
const circleButtonCanvas = document.getElementById('circle-button-canvas');
let circleButtonCtx = null;
let circles = [];
let isCircleButtonHovered = false;
let circleAnimationFrameId = null;
let animationTime = 0;
let lastFrameTime = Date.now();
let circleSpeedMultiplier = 0.72; // Default speed (72% of base speed)
let hoverAnimationProgress = 0; // 0 = not hovered, 1 = fully hovered
let hoverAnimationStartTime = 0;
const hoverAnimationDuration = 400; // milliseconds
let circleButtonMouseX = 0; // Mouse X position relative to circle button
let circleButtonMouseY = 0; // Mouse Y position relative to circle button
let targetMouseX = 0; // Target position for smooth following
let targetMouseY = 0; // Target position for smooth following
let storedPatternPositions = []; // Store pattern positions when hover starts for smooth return
let convergedCenterX = 0; // Store converged center position when hover ends
let convergedCenterY = 0; // Store converged center position when hover ends
let collectedStartPositions = []; // Store circle positions when toggling to collected state
let currentHoverCenterX = 0; // Current hover center X (follows mouse)
let currentHoverCenterY = 0; // Current hover center Y (follows mouse)
let isBackgroundLight = false; // Whether background behind circles is light
let backgroundCheckInterval = null; // Interval for checking background
let isCheckingBackground = false; // Flag to prevent multiple simultaneous checks
let lastBackgroundCheck = 0; // Timestamp of last check
const BACKGROUND_CHECK_COOLDOWN = 3000; // Minimum 3 seconds between checks
let isCirclesCollected = false; // Toggle state: true = collected, false = moving
let currentIconRotation = Math.PI / 4; // Current rotation angle of X icon (default: 45° = plus)
let targetIconRotation = Math.PI / 4; // Target rotation angle of X icon (default: 45° = plus)
let startIconRotation = Math.PI / 4; // Starting rotation angle when animation begins
let iconRotationStartTime = 0; // Start time for rotation animation
const iconRotationDuration = 300; // Rotation animation duration in milliseconds

// Bounce easing function (ease-out-back with bounce)
function easeOutBounce(t) {
  if (t < 1 / 2.75) {
    return 7.5625 * t * t;
  } else if (t < 2 / 2.75) {
    return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
  } else if (t < 2.5 / 2.75) {
    return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
  } else {
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  }
}

// Ease-out-back for bouncy effect
function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// Initialize circle button
function initCircleButton() {
  if (!circleButtonCanvas) return;
  
  circleButtonCtx = circleButtonCanvas.getContext('2d');
  circleButtonCanvas.width = 120;
  circleButtonCanvas.height = 120;
  
  // Initialize three circles with different patterns
  const centerX = circleButtonCanvas.width / 2;
  const centerY = circleButtonCanvas.height / 2;
  
  // Initialize mouse follow target to center
  targetMouseX = centerX;
  targetMouseY = centerY;
  const wanderRadius = 35; // Smaller wander area
  
  // Circle 1: Orbital pattern
  circles.push({
    x: centerX,
    y: centerY,
    baseX: centerX,
    baseY: centerY,
    angle: Math.random() * Math.PI * 2,
    angleSpeed: 0.002 + Math.random() * 0.002, // 0.002-0.004 radians per frame (even slower)
    targetAngleSpeed: 0.002 + Math.random() * 0.002, // Target for smooth transitions
    radius: 30, // Fixed size for all circles
    orbitRadius: 8 + Math.random() * 7, // 8-15px (smaller movements)
    patternType: 'orbital',
    phase: Math.random() * Math.PI * 2,
    timeOffset: Math.random() * 1000,
    freq1: 0.08 + Math.random() * 0.05, // 0.08-0.13 Hz (even slower)
    freq2: 0.12 + Math.random() * 0.05, // 0.12-0.17 Hz (even slower)
    targetFreq1: 0.08 + Math.random() * 0.05,
    targetFreq2: 0.12 + Math.random() * 0.05,
    freqChangeTime: Date.now() + 3000 + Math.random() * 2000,
  });
  
  // Circle 2: Figure-8 pattern
  circles.push({
    x: centerX,
    y: centerY,
    baseX: centerX,
    baseY: centerY,
    angle: Math.random() * Math.PI * 2,
    angleSpeed: 0.0025 + Math.random() * 0.0025, // 0.0025-0.005 radians per frame (even slower)
    targetAngleSpeed: 0.0025 + Math.random() * 0.0025,
    radius: 30, // Fixed size for all circles
    orbitRadius: 10 + Math.random() * 8, // 10-18px (smaller amplitude)
    patternType: 'figure8',
    phase: Math.random() * Math.PI * 2,
    timeOffset: Math.random() * 1000,
    freq1: 0.1 + Math.random() * 0.05, // 0.1-0.15 Hz (even slower)
    freq2: 0.15 + Math.random() * 0.05, // 0.15-0.2 Hz (even slower)
    targetFreq1: 0.1 + Math.random() * 0.05,
    targetFreq2: 0.15 + Math.random() * 0.05,
    freqChangeTime: Date.now() + 3000 + Math.random() * 2000,
  });
  
  // Circle 3: Rhythmic random walk
  circles.push({
    x: centerX,
    y: centerY,
    baseX: centerX,
    baseY: centerY,
    angle: Math.random() * Math.PI * 2,
    angleSpeed: 0.002 + Math.random() * 0.002, // Even slower
    targetAngleSpeed: 0.002 + Math.random() * 0.002,
    radius: 30, // Fixed size for all circles
    orbitRadius: 0,
    patternType: 'rhythmic',
    phase: Math.random() * Math.PI * 2,
    timeOffset: Math.random() * 1000,
    freq1: 0.09 + Math.random() * 0.04, // 0.09-0.13 Hz (even slower)
    freq2: 0.14 + Math.random() * 0.04, // 0.14-0.18 Hz (even slower)
    targetFreq1: 0.09 + Math.random() * 0.04,
    targetFreq2: 0.14 + Math.random() * 0.04,
    freqChangeTime: Date.now() + 3000 + Math.random() * 2000,
    randomOffsetX: 0,
    randomOffsetY: 0,
    randomTargetX: (Math.random() - 0.5) * 10, // 10px instead of 20px (smaller)
    randomTargetY: (Math.random() - 0.5) * 10, // 10px instead of 20px (smaller)
    randomChangeTime: Date.now() + 2000 + Math.random() * 2000,
    prevRandomTargetX: (Math.random() - 0.5) * 10,
    prevRandomTargetY: (Math.random() - 0.5) * 10,
    randomTransitionProgress: 1, // 0 to 1, starts at 1 (fully at new target)
  });
  
  // Start animation
  drawCircles();
  
  // Check background color periodically (less frequently to avoid rapid changes)
  checkBackgroundColor(); // Initial check
  backgroundCheckInterval = setInterval(checkBackgroundColor, 5000); // Check every 5 seconds
  
  // Event handlers
  circleButton.addEventListener('mouseenter', () => {
    isCircleButtonHovered = true;
    hoverAnimationStartTime = Date.now();
    // Set pointer cursor
    circleButton.style.cursor = 'pointer';
    circleButtonCanvas.style.cursor = 'pointer';
    // Store current pattern positions for smooth return animation
    storedPatternPositions = circles.map(circle => ({ x: circle.x, y: circle.y }));
    if (!isOverlayActive && !isScreenshotMode) {
      ipcRenderer.send('set-ignore-mouse-events', false);
    }
  });
  
  circleButton.addEventListener('mouseleave', () => {
    isCircleButtonHovered = false;
    
    // Only animate away if not collected (toggled)
    if (!isCirclesCollected) {
      hoverAnimationStartTime = Date.now();
      // Store the converged center position where all circles are currently
      // This will be the starting point for the spread-apart animation
      if (circles.length > 0) {
        convergedCenterX = circles[0].x; // All circles should be at same position when converged
        convergedCenterY = circles[0].y;
      } else {
        convergedCenterX = circleButtonCanvas.width / 2;
        convergedCenterY = circleButtonCanvas.height / 2;
      }
      // Reset mouse follow target to center when leaving
      targetMouseX = circleButtonCanvas.width / 2;
      targetMouseY = circleButtonCanvas.height / 2;
    }
    
    if (!isOverlayActive && !isScreenshotMode) {
      if (!isMouseOverUI(lastMouseX, lastMouseY)) {
        ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
      }
    }
  });
  
  // Track mouse movement for sticky effect
  circleButton.addEventListener('mousemove', (e) => {
    const rect = circleButtonCanvas.getBoundingClientRect();
    circleButtonMouseX = e.clientX - rect.left;
    circleButtonMouseY = e.clientY - rect.top;
    // Ensure pointer cursor is set
    circleButton.style.cursor = 'pointer';
    circleButtonCanvas.style.cursor = 'pointer';
  });
  
  circleButton.addEventListener('click', (e) => {
    // Toggle action buttons visibility
    toggleActionButtons();
  });
}

// Update circle positions based on patterns
function updateCirclePositions() {
  const currentTime = Date.now();
  const deltaTime = (currentTime - lastFrameTime) / 1000; // Convert to seconds
  lastFrameTime = currentTime;
  
  animationTime += deltaTime;
  
  const centerX = circleButtonCanvas.width / 2;
  const centerY = circleButtonCanvas.height / 2;
  const wanderRadius = 35; // Smaller wander area
  
  // Update hover animation progress
  if (isCirclesCollected) {
    // When collected (toggled), animate to fully converged
    if (hoverAnimationProgress < 1) {
      const elapsed = currentTime - hoverAnimationStartTime;
      hoverAnimationProgress = Math.min(1, elapsed / hoverAnimationDuration);
    } else {
      hoverAnimationProgress = 1; // Keep at 1 when collected
    }
  } else if (isCircleButtonHovered && hoverAnimationProgress < 1) {
    // Normal hover: converge
    const elapsed = currentTime - hoverAnimationStartTime;
    hoverAnimationProgress = Math.min(1, elapsed / hoverAnimationDuration);
  } else if (!isCircleButtonHovered && hoverAnimationProgress > 0 && !isCirclesCollected) {
    // Normal hover end: spread apart (only if not collected)
    const elapsed = currentTime - hoverAnimationStartTime;
    hoverAnimationProgress = Math.max(0, 1 - (elapsed / hoverAnimationDuration));
  }
  
  // Apply bounce easing only when converging (hovering), smooth easing when leaving
  const easedHoverProgress = isCircleButtonHovered 
    ? easeOutBack(hoverAnimationProgress)  // Bouncy when converging
    : hoverAnimationProgress;  // Smooth linear when separating (no bounce)
  
  // Update target mouse position for sticky effect (smooth following)
  // Only follow mouse when hovering (not when collected)
  if (isCircleButtonHovered && hoverAnimationProgress > 0.5 && !isCirclesCollected) {
    // Follow mouse when mostly converged from hover (not when collected)
    const mouseLerp = 0.15; // Sticky factor - how much to follow mouse
    targetMouseX += (circleButtonMouseX - targetMouseX) * mouseLerp;
    targetMouseY += (circleButtonMouseY - targetMouseY) * mouseLerp;
  } else {
    // Return to center when not hovered or when collected
    const centerLerp = 0.1;
    targetMouseX += (centerX - targetMouseX) * centerLerp;
    targetMouseY += (centerY - targetMouseY) * centerLerp;
  }
  
  // Calculate offset from center based on mouse position (only when converged and not collected)
  const mouseFollowStrength = Math.max(0, (hoverAnimationProgress - 0.5) * 2); // 0 to 1 when >50% converged
  // When collected, don't follow mouse (no stickiness)
  const effectiveMouseFollowStrength = isCirclesCollected ? 0 : mouseFollowStrength;
  const mouseOffsetX = (targetMouseX - centerX) * effectiveMouseFollowStrength * 0.12; // 12% of mouse offset (less sticky)
  const mouseOffsetY = (targetMouseY - centerY) * effectiveMouseFollowStrength * 0.12; // 12% of mouse offset (less sticky)
  // When collected, use stored converged center; otherwise use regular center
  const baseCenterX = isCirclesCollected && hoverAnimationProgress > 0.5 ? convergedCenterX : centerX;
  const baseCenterY = isCirclesCollected && hoverAnimationProgress > 0.5 ? convergedCenterY : centerY;
  const hoverCenterX = baseCenterX + mouseOffsetX;
  const hoverCenterY = baseCenterY + mouseOffsetY;
  
  // Store hover center for X icon positioning
  currentHoverCenterX = hoverCenterX;
  currentHoverCenterY = hoverCenterY;
  
  circles.forEach((circle, index) => {
    // Calculate pattern position first
    let patternX = centerX;
    let patternY = centerY;
    
    // Normal pattern movement
    const t = animationTime + circle.timeOffset / 1000;
    
    // Smoothly transition angle speed and frequencies (only when not hovered to avoid bouncing)
    if (hoverAnimationProgress === 0) {
      // In default state, make transitions very smooth and slow
      if (circle.targetAngleSpeed !== undefined) {
        const speedLerp = 0.005; // Much slower transition
        circle.angleSpeed += (circle.targetAngleSpeed - circle.angleSpeed) * speedLerp;
      }
      
      // Smoothly transition frequencies (very slowly)
      if (circle.targetFreq1 !== undefined && currentTime > circle.freqChangeTime) {
        const freqLerp = 0.003; // Much slower transition
        circle.freq1 += (circle.targetFreq1 - circle.freq1) * freqLerp;
        circle.freq2 += (circle.targetFreq2 - circle.freq2) * freqLerp;
        
        // Periodically set new target frequencies (less frequently)
        if (Math.abs(circle.freq1 - circle.targetFreq1) < 0.0001) {
          circle.targetFreq1 = 0.08 + Math.random() * 0.05;
          circle.targetFreq2 = 0.12 + Math.random() * 0.05;
          circle.freqChangeTime = currentTime + 5000 + Math.random() * 3000; // Less frequent changes
        }
      }
    } else {
      // When hovered, keep original smooth transitions
      if (circle.targetAngleSpeed !== undefined) {
        const speedLerp = 0.02;
        circle.angleSpeed += (circle.targetAngleSpeed - circle.angleSpeed) * speedLerp;
      }
      
      if (circle.targetFreq1 !== undefined && currentTime > circle.freqChangeTime) {
        const freqLerp = 0.01;
        circle.freq1 += (circle.targetFreq1 - circle.freq1) * freqLerp;
        circle.freq2 += (circle.targetFreq2 - circle.freq2) * freqLerp;
        
        if (Math.abs(circle.freq1 - circle.targetFreq1) < 0.001) {
          circle.targetFreq1 = 0.08 + Math.random() * 0.05;
          circle.targetFreq2 = 0.12 + Math.random() * 0.05;
          circle.freqChangeTime = currentTime + 3000 + Math.random() * 2000;
        }
      }
    }
    
    if (circle.patternType === 'orbital') {
      // Orbital: base point drifts, circle orbits around it
      const baseDriftX = Math.sin(t * circle.freq1 * 2 * Math.PI * circleSpeedMultiplier) * 8; // Apply speed multiplier
      const baseDriftY = Math.cos(t * circle.freq2 * 2 * Math.PI * circleSpeedMultiplier) * 8; // Apply speed multiplier
      circle.baseX = centerX + baseDriftX;
      circle.baseY = centerY + baseDriftY;
      
      circle.angle += circle.angleSpeed * circleSpeedMultiplier; // Apply speed multiplier
      const orbitX = Math.cos(circle.angle + circle.phase) * circle.orbitRadius;
      const orbitY = Math.sin(circle.angle + circle.phase) * circle.orbitRadius;
      
      patternX = circle.baseX + orbitX;
      patternY = circle.baseY + orbitY;
    } else if (circle.patternType === 'figure8') {
      // Figure-8: parametric lemniscate
      circle.angle += circle.angleSpeed * circleSpeedMultiplier; // Apply speed multiplier
      const a = circle.orbitRadius;
      const tParam = circle.angle + circle.phase;
      // Lemniscate of Bernoulli: x = a*sin(t), y = a*sin(t)*cos(t)
      const figure8X = a * Math.sin(tParam);
      const figure8Y = a * Math.sin(tParam) * Math.cos(tParam);
      
      // Add slow drift to base
      const baseDriftX = Math.sin(t * circle.freq1 * 2 * Math.PI * circleSpeedMultiplier) * 6; // Apply speed multiplier
      const baseDriftY = Math.cos(t * circle.freq2 * 2 * Math.PI * circleSpeedMultiplier) * 6; // Apply speed multiplier
      
      patternX = centerX + figure8X + baseDriftX;
      patternY = centerY + figure8Y + baseDriftY;
    } else if (circle.patternType === 'rhythmic') {
      // Rhythmic random walk: sine wave base with random walk
      const baseX = centerX + Math.sin(t * circle.freq1 * 2 * Math.PI * circleSpeedMultiplier) * 10; // Apply speed multiplier
      const baseY = centerY + Math.cos(t * circle.freq2 * 2 * Math.PI * circleSpeedMultiplier) * 10; // Apply speed multiplier
      
      // Update random walk target periodically with smooth transition
      if (currentTime > circle.randomChangeTime) {
        circle.prevRandomTargetX = circle.randomTargetX;
        circle.prevRandomTargetY = circle.randomTargetY;
        circle.randomTargetX = (Math.random() - 0.5) * 10;
        circle.randomTargetY = (Math.random() - 0.5) * 10;
        circle.randomChangeTime = currentTime + 2000 + Math.random() * 2000;
        circle.randomTransitionProgress = 0; // Start transition
      }
      
      // Smoothly transition between old and new random targets (slower in default state)
      const transitionSpeed = hoverAnimationProgress === 0 ? 0.01 : 0.02; // Slower when not hovered
      const randomLerpSpeed = hoverAnimationProgress === 0 ? 0.01 * circleSpeedMultiplier : 0.02 * circleSpeedMultiplier;
      
      if (circle.randomTransitionProgress < 1) {
        circle.randomTransitionProgress = Math.min(1, circle.randomTransitionProgress + transitionSpeed);
        const smoothProgress = circle.randomTransitionProgress * circle.randomTransitionProgress * (3 - 2 * circle.randomTransitionProgress); // Smoothstep
        const currentTargetX = circle.prevRandomTargetX + (circle.randomTargetX - circle.prevRandomTargetX) * smoothProgress;
        const currentTargetY = circle.prevRandomTargetY + (circle.randomTargetY - circle.prevRandomTargetY) * smoothProgress;
        
        // Smoothly move toward current target
        circle.randomOffsetX += (currentTargetX - circle.randomOffsetX) * randomLerpSpeed;
        circle.randomOffsetY += (currentTargetY - circle.randomOffsetY) * randomLerpSpeed;
      } else {
        // Smoothly move toward random target (speed multiplier affects lerp speed)
        circle.randomOffsetX += (circle.randomTargetX - circle.randomOffsetX) * randomLerpSpeed;
        circle.randomOffsetY += (circle.randomTargetY - circle.randomOffsetY) * randomLerpSpeed;
      }
      
      patternX = baseX + circle.randomOffsetX;
      patternY = baseY + circle.randomOffsetY;
    }
    
    // Constrain pattern position within wander area
    const dx = patternX - centerX;
    const dy = patternY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > wanderRadius) {
      const angle = Math.atan2(dy, dx);
      patternX = centerX + Math.cos(angle) * wanderRadius;
      patternY = centerY + Math.sin(angle) * wanderRadius;
    }
    
    // Handle position based on collected state and hover
    if (isCirclesCollected && hoverAnimationProgress > 0) {
      // When collected (toggled), animate from stored start position to center
      if (collectedStartPositions.length > index) {
        const startX = collectedStartPositions[index].x;
        const startY = collectedStartPositions[index].y;
        circle.x = startX + (hoverCenterX - startX) * easedHoverProgress;
        circle.y = startY + (hoverCenterY - startY) * easedHoverProgress;
      } else {
        // Fallback: lerp from pattern to center
        circle.x = patternX + (hoverCenterX - patternX) * easedHoverProgress;
        circle.y = patternY + (hoverCenterY - patternY) * easedHoverProgress;
      }
    } else if (!isCircleButtonHovered && hoverAnimationProgress > 0 && !isCirclesCollected) {
      // When leaving hover (and not collected), bouncy spread apart from converged center to pattern positions
      const returnProgress = 1 - hoverAnimationProgress; // 0 to 1 as we spread apart
      // Use bounce easing for spreading apart (bouncy effect)
      const easedReturnProgress = easeOutBack(returnProgress);
      circle.x = convergedCenterX + (patternX - convergedCenterX) * easedReturnProgress;
      circle.y = convergedCenterY + (patternY - convergedCenterY) * easedReturnProgress;
    } else if (hoverAnimationProgress > 0) {
      // When hovering, lerp between pattern and hover center
      circle.x = patternX + (hoverCenterX - patternX) * easedHoverProgress;
      circle.y = patternY + (hoverCenterY - patternY) * easedHoverProgress;
    } else {
      // Default state - use pattern position directly with no transformations or easing
      // This ensures smooth, non-bouncy movement
      circle.x = patternX;
      circle.y = patternY;
    }
  });
}

// Draw circles
function drawCircles() {
  if (!circleButtonCtx || !circleButtonCanvas) return;
  
  // Clear canvas
  circleButtonCtx.clearRect(0, 0, circleButtonCanvas.width, circleButtonCanvas.height);
  
  // Update positions
  updateCirclePositions();
  
  // Draw each circle (color depends on background)
  const circleColor = isBackgroundLight ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)'; // Black if light bg, white if dark bg
  circles.forEach(circle => {
    circleButtonCtx.beginPath();
    circleButtonCtx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    circleButtonCtx.fillStyle = circleColor; // 30% opacity
    circleButtonCtx.fill();
  });
  
  // Draw X icon when hovered or collected (fades in/out with hover animation, follows mouse)
  if (hoverAnimationProgress > 0 || isCirclesCollected) {
    const iconSize = 14; // Smaller size for the X icon
    const iconOpacity = isCirclesCollected ? 1 : hoverAnimationProgress; // Full opacity when collected, fade when hovering
    
    // Use hover center position (which follows mouse) for icon position
    // When collected, use the converged center; otherwise use current hover center
    const centerX = circleButtonCanvas.width / 2;
    const centerY = circleButtonCanvas.height / 2;
    const iconX = isCirclesCollected && hoverAnimationProgress > 0.5 
      ? (convergedCenterX || centerX) 
      : currentHoverCenterX;
    const iconY = isCirclesCollected && hoverAnimationProgress > 0.5 
      ? (convergedCenterY || centerY) 
      : currentHoverCenterY;
    
    circleButtonCtx.save();
    circleButtonCtx.globalAlpha = iconOpacity;
    // X color: white if light background, black if dark background
    circleButtonCtx.strokeStyle = isBackgroundLight ? '#FFFFFF' : '#000000';
    circleButtonCtx.lineWidth = 2;
    circleButtonCtx.lineCap = 'round';
    
    // Animate rotation smoothly
    const rotationElapsed = Date.now() - iconRotationStartTime;
    const rotationProgress = Math.min(1, rotationElapsed / iconRotationDuration);
    const easedRotationProgress = rotationProgress * rotationProgress * (3 - 2 * rotationProgress); // Smoothstep easing
    
    // Interpolate between start and target rotation
    if (rotationProgress < 1) {
      currentIconRotation = startIconRotation + (targetIconRotation - startIconRotation) * easedRotationProgress;
    } else {
      currentIconRotation = targetIconRotation; // Ensure we end at exact target
    }
    
    // Apply rotation around the icon center
    circleButtonCtx.translate(iconX, iconY);
    circleButtonCtx.rotate(currentIconRotation);
    circleButtonCtx.translate(-iconX, -iconY);
    
    // Draw X icon (Lucide X icon - two diagonal lines)
    const offset = iconSize / 2;
    circleButtonCtx.beginPath();
    // First diagonal line (top-left to bottom-right)
    circleButtonCtx.moveTo(iconX - offset, iconY - offset);
    circleButtonCtx.lineTo(iconX + offset, iconY + offset);
    // Second diagonal line (top-right to bottom-left)
    circleButtonCtx.moveTo(iconX + offset, iconY - offset);
    circleButtonCtx.lineTo(iconX - offset, iconY + offset);
    circleButtonCtx.stroke();
    
    circleButtonCtx.restore();
  }
  
  // Continue animation
  circleAnimationFrameId = requestAnimationFrame(drawCircles);
}

// Check background color behind circle button
async function checkBackgroundColor() {
  // Prevent multiple simultaneous checks and respect cooldown
  const now = Date.now();
  if (isCheckingBackground || (now - lastBackgroundCheck) < BACKGROUND_CHECK_COOLDOWN) {
    return;
  }
  
  isCheckingBackground = true;
  lastBackgroundCheck = now;
  
  try {
    const buttonRect = circleButton.getBoundingClientRect();
    const centerX = Math.floor(buttonRect.left + buttonRect.width / 2);
    const centerY = Math.floor(buttonRect.top + buttonRect.height / 2);
    
    // Sample a larger area (40x40px) around the center, but avoid the circle area itself
    // Sample from corners to avoid the circles
    const sampleSize = 15;
    const offset = 25; // Offset from center to avoid sampling the circles
    const sampleAreas = [
      { x: centerX - offset, y: centerY - offset }, // Top-left
      { x: centerX + offset, y: centerY - offset }, // Top-right
      { x: centerX - offset, y: centerY + offset }, // Bottom-left
      { x: centerX + offset, y: centerY + offset }  // Bottom-right
    ];
    
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
          
          // Create temporary canvas to sample the area
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = sampleSize;
          tempCanvas.height = sampleSize;
          const tempCtx = tempCanvas.getContext('2d');
          
          // Sample from multiple corner areas to avoid the circles
          let totalLuminance = 0;
          let totalSamples = 0;
          
          for (const area of sampleAreas) {
            const sampleX = area.x;
            const sampleY = area.y;
            
            // Draw the sampled area
            tempCtx.clearRect(0, 0, sampleSize, sampleSize);
            tempCtx.drawImage(
              video,
              sampleX * scaleX, sampleY * scaleY, sampleSize * scaleX, sampleSize * scaleY,
              0, 0, sampleSize, sampleSize
            );
            
            // Get image data and calculate average luminance for this area
            const imageData = tempCtx.getImageData(0, 0, sampleSize, sampleSize);
            const data = imageData.data;
            
            let areaLuminance = 0;
            let areaPixelCount = 0;
            
            // Calculate luminance for each pixel (sample every 4th pixel)
            for (let i = 0; i < data.length; i += 16) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              // Relative luminance formula (ITU-R BT.709)
              const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
              areaLuminance += luminance;
              areaPixelCount++;
            }
            
            if (areaPixelCount > 0) {
              totalLuminance += areaLuminance / areaPixelCount;
              totalSamples++;
            }
          }
          
          const avgLuminance = totalLuminance / totalSamples;
          // Use hysteresis to prevent rapid switching
          // Only switch to dark mode (black circles) when background is very light (white/very light gray)
          // Threshold: >85% for light (to switch to dark mode), <80% for dark (to switch back to light mode)
          const threshold = isBackgroundLight ? 0.80 : 0.85;
          isBackgroundLight = avgLuminance > threshold;
          
          stream.getTracks().forEach(track => track.stop());
          isCheckingBackground = false;
          resolve();
        }, 100);
      };
    });
  } catch (error) {
    console.error('Error checking background color:', error);
    // Default to dark if check fails
    isBackgroundLight = false;
    isCheckingBackground = false;
  }
}

// Initialize circle button when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCircleButton);
} else {
  initCircleButton();
}

// Initial draw
draw();

