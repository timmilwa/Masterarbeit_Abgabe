const { ipcRenderer } = require('electron');
const { Fullscreen, Camera } = require('lucide');

// DOM Elements
const overlayContainer = document.getElementById('overlay-container');
const canvas = document.getElementById('canvas');
// Context will be created after canvas is properly sized
let ctx = null;
const toolbar = document.getElementById('toolbar');
const screenshotOverlay = document.getElementById('screenshot-overlay');
const selectionBox = document.getElementById('selection-box');
const fileInput = document.getElementById('file-input');
const selectTool = document.getElementById('select-tool');
const uploadTool = document.getElementById('upload-tool');
const settingsPopup = document.getElementById('settings-popup');
const settingsModalOverlay = document.getElementById('settings-modal-overlay');
const settingsModal = document.getElementById('settings-modal');
const settingsModalClose = document.getElementById('settings-modal-close');
const settingsTabs = document.querySelectorAll('.settings-tab');
const settingsTabPanes = document.querySelectorAll('.settings-tab-pane');
const tintColorInput = document.getElementById('tint-color-input');
const openDevToolsButton = document.getElementById('open-dev-tools-button');
const colorPreview = document.getElementById('color-preview');
const tintOpacitySlider = document.getElementById('tint-opacity-slider');
const tintOpacityValue = document.getElementById('tint-opacity-value');
const saturationSlider = document.getElementById('saturation-slider');
const saturationValue = document.getElementById('saturation-value');
const circleSpeedSlider = document.getElementById('circle-speed-slider');
const circleSpeedValue = document.getElementById('circle-speed-value');
const circuitBlendModeSelect = document.getElementById('circuit-blend-mode-select');
const circle1ColorInput = document.getElementById('circle-1-color-input');
const circle2ColorInput = document.getElementById('circle-2-color-input');
const circle3ColorInput = document.getElementById('circle-3-color-input');
const reflectionButton = document.getElementById('reflection-button');
const circleButton = document.getElementById('circle-button');
const actionSettingsButton = document.getElementById('action-settings-button');
const actionOpenCanvasButton = document.getElementById('action-open-canvas-button');
const actionCaptureArtefactButton = document.getElementById('action-capture-artefact-button');
const pinPlacementUI = document.getElementById('pin-placement-ui');
const pinFeatureInput = document.getElementById('pin-feature-input');
const pinConfirmButton = document.getElementById('pin-confirm-button');
const controlPanelInputs = document.getElementById('control-panel-inputs');
const emotionalAspectInput = document.getElementById('emotional-aspect-input');
const emotionalAspectAddButton = document.getElementById('emotional-aspect-add-button');
const valueAspectInput = document.getElementById('value-aspect-input');
const valueAspectAddButton = document.getElementById('value-aspect-add-button');
const fpsCounter = document.getElementById('fps-counter');
const fpsCounterText = document.getElementById('fps-counter-text');
const fpsCounterDpr = document.getElementById('fps-counter-dpr');
const fpsCounterSettingsIcon = document.getElementById('fps-counter-settings-icon');
const dprModeSelect = document.getElementById('dpr-mode-select');
const fpsCounterToggle = document.getElementById('fps-counter-toggle');

// State
let isOverlayActive = false;
let isScreenshotMode = false;
let isExitingScreenshotMode = false; // Track if we're transitioning out of screenshot mode
let isOpeningFromScreenshot = false; // Track if we're opening overlay from a screenshot
let isTransitioningToReflectionMode = false; // Track if we're transitioning to reflection mode (prevents toolbar from showing)
let cameraCursorURL = null; // Store camera cursor URL globally
let canvasScale = 1.0; // Default zoom - normal size
let canvasTranslateX = 0;
let canvasTranslateY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let mouseDistanceToCircleButton = Infinity; // Distance from mouse to circle button center
let currentCircleOpacity = 0.5; // Current smoothed opacity value for circles (starts at max)
let backgroundImage = null;
let images = [];
let selectedImageIndices = []; // Array for multi-select
let isDragging = false;
let isResizing = false;
let resizeHandle = null;
let dragStartX = 0;
let dragStartY = 0;
let isSelecting = false; // True when creating selection box
let selectionBoxStartX = 0; // Selection box start (screen coordinates)
let selectionBoxStartY = 0;
let selectionBoxEndX = 0; // Selection box end (screen coordinates)
let selectionBoxEndY = 0;
let backgroundTintColor = '#F4F4F7'; // Default background color
let backgroundTintOpacity = 0.5; // Default opacity (50%)
let backgroundSaturation = 0; // Default saturation (0% = grayscale)
let isReflectionMode = false;
let reflectionImageIndex = -1;
let previousCanvasScale = 1.0;
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
let backgroundFadeDuration = 300; // Fade duration in milliseconds
let screenshotHandlers = null; // Store screenshot event handlers for cleanup
let savedCanvasScale = null; // Saved canvas scale when overlay is closed
let savedCanvasTranslateX = null; // Saved canvas translate X when overlay is closed
let savedCanvasTranslateY = null; // Saved canvas translate Y when overlay is closed

// Performance optimization: dirty flag and animation frame
let needsRedraw = false;
let animationFrameId = null;
let cachedBlurredBackground = null; // Cache the blurred background image
let backgroundCacheDirty = true; // Flag to indicate background cache needs update
let isUpdatingBackgroundCache = false; // Prevent multiple simultaneous cache updates

// Dynamic DPR for performance optimization
let isInteracting = false; // Track if user is panning/zooming/dragging
let interactionTimeout = null; // Timeout to switch back to high DPR after interaction stops
let wheelTimeout = null; // Timeout to detect when wheel events stop
let currentEffectiveDPR = 2.0; // Current effective DPR (starts at 2 for quality)
let canvasNeedsReinit = false; // Flag to reinitialize canvas when DPR changes
let dprMode = 'dynamic'; // DPR mode: 'dynamic', '1', '1.5', or '2'
const INTERACTION_DPR = 1.25; // Lower DPR during interaction for performance
const STATIC_DPR = 2.0; // Higher DPR when static for quality
const INTERACTION_TIMEOUT = 300; // Milliseconds to wait after interaction stops before switching to high DPR

// FPS tracking
let fpsLastTime = performance.now();
let fpsFrameCount = 0;
let fpsUpdateInterval = 1000; // Update FPS display every second
let fpsLastUpdateTime = performance.now();
let currentFPS = 0;
let fpsCounterVisible = true; // Default: FPS counter is visible

// Pin system state
let selectedPinId = null; // Currently selected pin ID
let isPlacingPin = false; // Whether currently placing a pin
let tempPinLocation = null; // Temporary pin location during placement {x, y} in normalized coordinates
let pinFeatureText = ''; // Text for feature during pin placement

// Generate unique ID for images and pins
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Helper function to get device pixel ratio
// Get the base device pixel ratio from the browser
function getBaseDevicePixelRatio() {
  return window.devicePixelRatio || 1;
}

// Get effective DPR (dynamic based on interaction state or manual mode)
function getDevicePixelRatio() {
  // Check if manual DPR mode is set
  if (dprMode === '1') {
    return 1.0;
  } else if (dprMode === '1.5') {
    return 1.5;
  } else if (dprMode === '2') {
    return 2.0;
  }
  
  // Dynamic mode: use interaction-based DPR
  // If base DPR is less than 2, use it as-is
  const baseDPR = getBaseDevicePixelRatio();
  if (baseDPR < 2) {
    return baseDPR;
  }
  
  // For high-DPI displays, use dynamic DPR based on interaction
  return currentEffectiveDPR;
}

// Mark that user is interacting (panning/zooming/dragging)
function setInteracting(value) {
  // Only apply dynamic DPR if mode is set to 'dynamic'
  if (dprMode !== 'dynamic') return;
  
  if (isInteracting === value) return; // No change needed
  
  isInteracting = value;
  
  // Clear any existing timeout
  if (interactionTimeout) {
    clearTimeout(interactionTimeout);
    interactionTimeout = null;
  }
  
  if (value) {
    // User started interacting - switch to lower DPR for performance
    if (currentEffectiveDPR !== INTERACTION_DPR) {
      currentEffectiveDPR = INTERACTION_DPR;
      canvasNeedsReinit = true;
      // Schedule reinit for next frame to prevent flash
      // Use requestAnimationFrame to ensure smooth transition
      requestAnimationFrame(() => {
        if (canvasNeedsReinit && isOverlayActive) {
          requestDraw();
        }
      });
    }
  } else {
    // User stopped interacting - wait a bit then switch to high DPR
    interactionTimeout = setTimeout(() => {
      if (!isInteracting && currentEffectiveDPR !== STATIC_DPR && dprMode === 'dynamic') {
        currentEffectiveDPR = STATIC_DPR;
        canvasNeedsReinit = true;
        // Schedule reinit for next frame to prevent flash
        requestAnimationFrame(() => {
          if (canvasNeedsReinit && isOverlayActive) {
            requestDraw();
          }
        });
      }
      interactionTimeout = null;
    }, INTERACTION_TIMEOUT);
  }
}

// Helper function to get canvas CSS pixel dimensions (not physical pixels)
// This is important because mouse coordinates and getBoundingClientRect() use CSS pixels
// Use window dimensions directly since canvas should be fullscreen
function getCanvasCSSDimensions() {
  // Always use window dimensions - canvas is fullscreen (100% width/height)
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}

// Helper function to update toolbar visibility based on current state
// Toolbar should only be visible when:
// 1. Overlay is active
// 2. Not in reflection mode
// 3. Not transitioning to reflection mode (prevents brief appearance during screenshot flow)
// 4. Background is visible (backgroundFadeOpacity > 0, meaning background has started fading in)
function updateToolbarVisibility() {
  const isBackgroundVisible = backgroundFadeOpacity > 0;
  const shouldShow = isOverlayActive && !isReflectionMode && !isTransitioningToReflectionMode && isBackgroundVisible;
  
  if (shouldShow) {
    toolbar.classList.add('visible');
  } else {
    toolbar.classList.remove('visible');
  }
}

// Helper function to setup high-DPI canvas
function setupHighDPICanvas(canvasElement, displayWidth, displayHeight) {
  const dpr = getDevicePixelRatio();
  
  // Use the provided dimensions (window.innerWidth/innerHeight)
  const width = displayWidth;
  const height = displayHeight;
  
  // CRITICAL: Set internal canvas size FIRST (this determines the drawing buffer size)
  // Setting width/height resets the canvas, so we must do this first
  // IMPORTANT: These must be set as numbers, not strings, and must match exactly
  const internalWidth = Math.floor(width * dpr);
  const internalHeight = Math.floor(height * dpr);
  canvasElement.width = internalWidth;
  canvasElement.height = internalHeight;
  
  // CRITICAL: Verify the canvas internal size was set correctly
  if (canvasElement.width !== internalWidth || canvasElement.height !== internalHeight) {
    console.error('Canvas internal size mismatch!', {
      requested: `${internalWidth}x${internalHeight}`,
      actual: `${canvasElement.width}x${canvasElement.height}`,
      width: width,
      height: height,
      dpr: dpr
    });
    // Force set again
    canvasElement.width = internalWidth;
    canvasElement.height = internalHeight;
  }
  
  // THEN set CSS size (this determines the displayed size)
  // Explicitly set CSS size to ensure fullscreen - override any CSS rules
  // Set CSS size - this is CRITICAL for the canvas to display at full size
  canvasElement.style.setProperty('width', width + 'px', 'important');
  canvasElement.style.setProperty('height', height + 'px', 'important');
  canvasElement.style.setProperty('position', 'absolute', 'important');
  canvasElement.style.setProperty('top', '0', 'important');
  canvasElement.style.setProperty('left', '0', 'important');
  canvasElement.style.setProperty('right', 'auto', 'important');
  canvasElement.style.setProperty('bottom', 'auto', 'important');
  canvasElement.style.setProperty('margin', '0', 'important');
  canvasElement.style.setProperty('padding', '0', 'important');
  canvasElement.style.setProperty('display', 'block', 'important');
  canvasElement.style.setProperty('visibility', 'visible', 'important');
  canvasElement.style.setProperty('transform', 'none', 'important'); // Ensure no scaling
  canvasElement.style.setProperty('transform-origin', 'top left', 'important');
  canvasElement.style.setProperty('min-width', width + 'px', 'important');
  canvasElement.style.setProperty('min-height', height + 'px', 'important');
  canvasElement.style.setProperty('max-width', width + 'px', 'important');
  canvasElement.style.setProperty('max-height', height + 'px', 'important');
  
  // Force a reflow to ensure styles are applied
  void canvasElement.offsetWidth;
  void canvasElement.offsetHeight;
  
  // CRITICAL: Verify canvas is actually in the DOM and visible
  if (!canvasElement.parentElement) {
    console.error('Canvas is not in the DOM!');
  } else {
    const parent = canvasElement.parentElement;
    const parentComputed = window.getComputedStyle(parent);
    console.log('Canvas parent check:', {
      parentTag: parent.tagName,
      parentId: parent.id,
      parentDisplay: parentComputed.display,
      parentVisibility: parentComputed.visibility,
      parentWidth: parentComputed.width,
      parentHeight: parentComputed.height,
      parentPosition: parentComputed.position
    });
  }
  
  // Get context AFTER canvas is sized (setting width/height resets the canvas)
  // Use willReadFrequently option to optimize getImageData performance
  const contextOptions = { willReadFrequently: true };
  const newCtx = canvasElement.getContext('2d', contextOptions);
  
  // Reset and scale context to account for device pixel ratio
  // Canvas internal size: width*dpr x height*dpr (physical pixels)
  // Canvas CSS size: width x height (CSS pixels)
  // Browser automatically scales canvas down by DPR for display
  // We scale context by DPR so 1 unit = 1 CSS pixel
  newCtx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
  newCtx.scale(dpr, dpr);
  
  // CRITICAL DEBUG: Verify the canvas is actually the size we expect
  // The canvas internal size should be width*dpr x height*dpr
  // The CSS size should be width x height
  // After DPR scaling, drawing at (width, height) should fill the canvas
  const computedStyle = window.getComputedStyle(canvasElement);
  const rect = canvasElement.getBoundingClientRect();
  console.log('Canvas setup verification:', {
    requestedSize: `${width}x${height}`,
    internalSize: `${canvasElement.width}x${canvasElement.height}`,
    inlineCSS: `${canvasElement.style.width}x${canvasElement.style.height}`,
    computedCSS: `${computedStyle.width}x${computedStyle.height}`,
    boundingRect: `${rect.width}x${rect.height} at (${rect.left}, ${rect.top})`,
    dpr: dpr,
    expectedInternal: `${width * dpr}x${height * dpr}`,
    match: canvasElement.width === width * dpr && canvasElement.height === height * dpr,
    boundingRectMatch: Math.abs(rect.width - width) < 1 && Math.abs(rect.height - height) < 1
  });
  
  return newCtx;
}

// Canvas setup
function setupCanvas() {
  // CRITICAL TEST: Log immediately to verify code is running
  console.log('=== SETUP CANVAS CALLED - CODE IS RUNNING ===');
  console.log('Window size:', window.innerWidth, 'x', window.innerHeight);
  console.log('Device Pixel Ratio:', window.devicePixelRatio);
  
  const resizeCanvas = () => {
    // Use window dimensions - ensure fullscreen
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Ensure overlay container is fullscreen
    if (overlayContainer) {
      overlayContainer.style.setProperty('width', width + 'px', 'important');
      overlayContainer.style.setProperty('height', height + 'px', 'important');
      overlayContainer.style.setProperty('position', 'fixed', 'important');
      overlayContainer.style.setProperty('top', '0', 'important');
      overlayContainer.style.setProperty('left', '0', 'important');
      overlayContainer.style.setProperty('margin', '0', 'important');
      overlayContainer.style.setProperty('padding', '0', 'important');
    }
    
    // Setup canvas and get context (context is created fresh each time)
    ctx = setupHighDPICanvas(canvas, width, height);
    
    // Debug: Verify canvas is actually fullscreen
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      const rect = canvas.getBoundingClientRect();
      const overlayRect = overlayContainer ? overlayContainer.getBoundingClientRect() : null;
      const computedCanvasStyle = window.getComputedStyle(canvas);
      const computedOverlayStyle = overlayContainer ? window.getComputedStyle(overlayContainer) : null;
      
      console.log('=== Canvas Resize Debug ===');
      console.log('Window:', width, 'x', height);
      console.log('Canvas Internal (physical pixels):', canvas.width, 'x', canvas.height);
      console.log('Canvas Inline CSS:', canvas.style.width, 'x', canvas.style.height);
      console.log('Canvas Computed CSS:', computedCanvasStyle.width, 'x', computedCanvasStyle.height);
      console.log('Canvas Computed Transform:', computedCanvasStyle.transform);
      console.log('Canvas Bounding Rect:', rect.width, 'x', rect.height, 'at', rect.left, ',', rect.top);
      console.log('Overlay Container Inline CSS:', overlayContainer?.style.width, 'x', overlayContainer?.style.height);
      if (computedOverlayStyle) {
        console.log('Overlay Container Computed CSS:', computedOverlayStyle.width, 'x', computedOverlayStyle.height);
      }
      if (overlayRect) {
        console.log('Overlay Container Rect:', overlayRect.width, 'x', overlayRect.height, 'at', overlayRect.left, ',', overlayRect.top);
      }
      console.log('Device Pixel Ratio:', getDevicePixelRatio());
      console.log('Canvas Scale:', canvasScale);
      console.log('Canvas Translate:', canvasTranslateX, ',', canvasTranslateY);
      console.log('Expected CSS size should match window:', width, 'x', height);
      console.log('Canvas actual size ratio:', rect.width / width, 'x', rect.height / height);
      console.log('==========================');
    }, 100);
    
    if (isOverlayActive) {
      draw();
    }
  };

  // Initial setup - use requestAnimationFrame to ensure DOM is ready
  requestAnimationFrame(() => {
    resizeCanvas();
  });
  
  window.addEventListener('resize', resizeCanvas);
}

// Initialize
setupCanvas();

// Check if mouse is over UI element
function isMouseOverUI(x, y) {
  if (isOverlayActive || isScreenshotMode) return true;
  
  // Check circle button position directly
  if (circleButton) {
    const circleButtonRect = circleButton.getBoundingClientRect();
    if (x >= circleButtonRect.left && x <= circleButtonRect.right &&
        y >= circleButtonRect.top && y <= circleButtonRect.bottom) {
      return true;
    }
  }
  
  // Check settings modal position
  if (settingsModalOverlay.classList.contains('visible')) {
    const popupRect = settingsModal.getBoundingClientRect();
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
      if (el.closest('#circle-button') ||
          el.closest('#settings-modal-overlay') ||
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
  
  // SVG from cursor_Vector 1.svg
  const svg = `<svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_453_10617)">
<path d="M1.04081 1.69181C1.00134 1.60072 0.990166 1.49988 1.00875 1.40236C1.02732 1.30485 1.07479 1.21517 1.14498 1.14498C1.21517 1.07479 1.30485 1.02732 1.40236 1.00875C1.49988 0.990166 1.60072 1.00134 1.69181 1.04081L17.6918 7.54081C17.7891 7.58044 17.8714 7.64971 17.9271 7.73879C17.9828 7.82787 18.009 7.93222 18.0021 8.03704C17.9951 8.14186 17.9553 8.24182 17.8883 8.32274C17.8213 8.40365 17.7305 8.46141 17.6288 8.48781L11.5048 10.0678C11.1588 10.1568 10.8429 10.3368 10.59 10.5891C10.3372 10.8415 10.1565 11.157 10.0668 11.5028L8.48781 17.6288C8.46141 17.7305 8.40365 17.8213 8.32274 17.8883C8.24182 17.9553 8.14186 17.9951 8.03704 18.0021C7.93222 18.009 7.82787 17.9828 7.73879 17.9271C7.64971 17.8714 7.58044 17.7891 7.54081 17.6918L1.04081 1.69181Z" fill="black" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</g>
<defs>
<clipPath id="clip0_453_10617">
<rect width="19" height="19" fill="white"/>
</clipPath>
</defs>
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
    // Reset FPS tracking when overlay opens
    fpsLastTime = performance.now();
    fpsFrameCount = 0;
    fpsLastUpdateTime = performance.now();
    currentFPS = 0;
    if (fpsCounterText) {
      fpsCounterText.textContent = 'FPS: --';
    }
    // Initialize DPR display
    if (fpsCounterDpr) {
      const currentDPR = getDevicePixelRatio();
      fpsCounterDpr.textContent = `DPR: ${currentDPR.toFixed(2)}`;
    }
    
    // Initialize DPR to static (high quality) when overlay opens
    currentEffectiveDPR = STATIC_DPR;
    isInteracting = false;
    if (interactionTimeout) {
      clearTimeout(interactionTimeout);
      interactionTimeout = null;
    }
    canvasNeedsReinit = false;
    // Hide selection box when overlay becomes active (in case it's still visible)
    selectionBox.style.display = 'none';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    
    overlayContainer.classList.add('active');
    
    // Ensure overlay container is fullscreen
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // CRITICAL: Set overlay container to fullscreen FIRST
    overlayContainer.style.setProperty('width', width + 'px', 'important');
    overlayContainer.style.setProperty('height', height + 'px', 'important');
    overlayContainer.style.setProperty('position', 'fixed', 'important');
    overlayContainer.style.setProperty('top', '0', 'important');
    overlayContainer.style.setProperty('left', '0', 'important');
    overlayContainer.style.setProperty('right', 'auto', 'important');
    overlayContainer.style.setProperty('bottom', 'auto', 'important');
    overlayContainer.style.setProperty('margin', '0', 'important');
    overlayContainer.style.setProperty('padding', '0', 'important');
    overlayContainer.style.setProperty('display', 'block', 'important');
    overlayContainer.style.setProperty('visibility', 'visible', 'important');
    overlayContainer.style.setProperty('transform', 'none', 'important');
    overlayContainer.style.setProperty('min-width', width + 'px', 'important');
    overlayContainer.style.setProperty('min-height', height + 'px', 'important');
    overlayContainer.style.setProperty('max-width', width + 'px', 'important');
    overlayContainer.style.setProperty('max-height', height + 'px', 'important');
    
    // Force a reflow to ensure styles are applied
    void overlayContainer.offsetWidth;
    void overlayContainer.offsetHeight;
    
    ipcRenderer.send('set-ignore-mouse-events', false);
    // Ensure canvas is properly sized with high-DPI support
    // Use multiple requestAnimationFrame calls to ensure DOM is fully updated
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // CRITICAL: Ensure overlay container is visible and sized BEFORE canvas setup
        if (overlayContainer) {
          overlayContainer.style.setProperty('display', 'block', 'important');
          overlayContainer.style.setProperty('visibility', 'visible', 'important');
          void overlayContainer.offsetWidth; // Force reflow
        }
        
        // Setup canvas and get fresh context
        ctx = setupHighDPICanvas(canvas, width, height);
        
        // Force another reflow after canvas setup
        void canvas.offsetWidth;
        void canvas.offsetHeight;
        
        // Apply fade-in animation if opening from screenshot
        if (isOpeningFromScreenshot) {
          // Set initial opacity to 0
          canvas.style.opacity = '0';
          // Add fade-in class after a brief delay to ensure canvas is ready
          requestAnimationFrame(() => {
            canvas.classList.add('fade-in');
            // Remove class after animation completes (400ms)
            setTimeout(() => {
              canvas.classList.remove('fade-in');
              canvas.style.opacity = ''; // Reset to default
              isOpeningFromScreenshot = false; // Reset flag
            }, 400);
          });
        }
        
        // Wait one more frame to ensure everything is rendered
        requestAnimationFrame(() => {
          draw();
        });
      });
    });
    // Restore saved canvas position, or use defaults if first time opening
    if (savedCanvasScale !== null && savedCanvasTranslateX !== null && savedCanvasTranslateY !== null) {
      canvasScale = savedCanvasScale;
      canvasTranslateX = savedCanvasTranslateX;
      canvasTranslateY = savedCanvasTranslateY;
    } else {
      // First time opening - use defaults
      canvasScale = 1.0; // Normal zoom
      canvasTranslateX = 0;
      canvasTranslateY = 0;
    }
    
    // Set custom cursor when canvas is visible
    canvas.style.cursor = createCustomCursor();
    
    // Collect circles when overlay opens (show X icon with all circles on top of each other)
    // Force circles into collected/X state regardless of current state
    isCirclesCollected = true;
    // Set icon rotation to X (0 radians)
    currentIconRotation = 0;
    targetIconRotation = 0;
    startIconRotation = 0;
    iconRotationStartTime = Date.now();
    // Store actual center as target position
    const centerX = CIRCLE_BUTTON_DISPLAY_SIZE / 2;
    const centerY = CIRCLE_BUTTON_DISPLAY_SIZE / 2;
    convergedCenterX = centerX;
    convergedCenterY = centerY;
    // Immediately set to collected state (no animation delay)
    hoverAnimationProgress = 1.0; // Fully collected (X state)
    hoverAnimationStartTime = Date.now();
    // Move all circles to center immediately
    if (circles && circles.length > 0) {
      circles.forEach(circle => {
        circle.x = centerX;
        circle.y = centerY;
      });
    }
    
    // If background is already captured (e.g., from screenshot mode), use it immediately
    if (backgroundImage && backgroundImage.complete) {
      // Mark background cache as dirty (needs update)
      backgroundCacheDirty = true;
      cachedBlurredBackground = null;
      // Start fade-in animation for existing background
      backgroundFadeOpacity = 0;
      isBackgroundFading = true;
      backgroundFadeStartTime = Date.now();
      // Update toolbar visibility (will show when background fades in)
      updateToolbarVisibility();
      requestDraw();
    } else {
      // Hide toolbar initially - it will appear when background is loaded
      updateToolbarVisibility();
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
    
    // Deselect any selected images
    selectedImageIndices = [];
    
    // Save current canvas position before closing
    savedCanvasScale = canvasScale;
    savedCanvasTranslateX = canvasTranslateX;
    savedCanvasTranslateY = canvasTranslateY;
    
    overlayContainer.classList.remove('active');
    updateToolbarVisibility();
    // Hide reflection button when overlay is closed
    reflectionButton.classList.remove('visible');
    // Hide control panel inputs when overlay is closed
    if (controlPanelInputs) controlPanelInputs.style.display = 'none';
    // Reset cursor to default
    canvas.style.cursor = 'default';
    // Remove fade-in class and reset flag if overlay is closed
    canvas.classList.remove('fade-in');
    canvas.style.opacity = '';
    isOpeningFromScreenshot = false;
    
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
    // Just clear the canvas visually (use CSS pixel dimensions)
    const cssDims = getCanvasCSSDimensions();
    ctx.clearRect(0, 0, cssDims.width, cssDims.height);
  }
}

// Toggle Action Buttons
function toggleActionButtons() {
  const isVisible = actionSettingsButton.classList.contains('visible');
  if (isVisible) {
    // Hide buttons with animation (fold back down)
    // Remove in reverse order (top to bottom) for smooth fold
    actionSettingsButton.classList.remove('visible');
    
    setTimeout(() => {
      actionOpenCanvasButton.classList.remove('visible');
    }, 50);
    
    setTimeout(() => {
      actionCaptureArtefactButton.classList.remove('visible');
    }, 100);
    
    // Wait for animation to complete before hiding
    setTimeout(() => {
      if (!actionSettingsButton.classList.contains('visible')) {
        actionSettingsButton.style.display = 'none';
        actionSettingsButton.style.opacity = '';
        actionOpenCanvasButton.style.display = 'none';
        actionOpenCanvasButton.style.opacity = '';
        actionCaptureArtefactButton.style.display = 'none';
        actionCaptureArtefactButton.style.opacity = '';
        // Reset bottom positions for next time
        actionSettingsButton.style.bottom = '';
        actionOpenCanvasButton.style.bottom = '';
        actionCaptureArtefactButton.style.bottom = '';
        
        // After animation completes, ensure circles stay converged if mouse is still hovering
        // This prevents the jump that occurs when animation finishes
        if (isCircleButtonHovered && hoverAnimationProgress < 1) {
          // Mouse is still hovering, ensure circles stay converged
          hoverAnimationProgress = 1;
          hoverAnimationStartTime = Date.now();
        }
      }
    }, 400); // Match animation duration
    
    // Uncollect circles (restore normal state) only if mouse is not hovering AND overlay is not active
    // If overlay is active, keep circles collected (X state)
    // If mouse is still hovering, keep circles collected via hover state
    if (isCirclesCollected && !isOverlayActive) {
      isCirclesCollected = false;
      // Start rotation animation back to plus
      startIconRotation = currentIconRotation;
      iconRotationStartTime = Date.now();
      targetIconRotation = Math.PI / 4; // Plus icon when not collected
      
      // If mouse is hovering, keep circles converged (don't spread)
      // This ensures circles stay collected when mouse is still over the button
      if (isCircleButtonHovered) {
        // If already converged, keep it at 1 to prevent jumping
        // Otherwise, ensure it animates to converged state
        if (hoverAnimationProgress >= 0.5) {
          // Already mostly converged, keep it converged
          hoverAnimationProgress = 1;
          hoverAnimationStartTime = Date.now();
        } else {
          // Not converged yet, animate to converged
          hoverAnimationStartTime = Date.now();
          hoverAnimationProgress = 0; // Start from 0 to animate to 1 (converge)
        }
      } else {
        // Animate back to moving state (spread apart)
        hoverAnimationStartTime = Date.now();
        hoverAnimationProgress = 1; // Start from 1 to animate to 0
      }
    }
    
    // Re-enable click-through if overlay is not active
    if (!isOverlayActive && !isScreenshotMode) {
      if (!isMouseOverUI(lastMouseX, lastMouseY)) {
        ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
      }
    }
  } else {
    // Show buttons with staggered animation
    // Remove any existing animation classes first
    actionSettingsButton.classList.remove('visible');
    actionOpenCanvasButton.classList.remove('visible');
    actionCaptureArtefactButton.classList.remove('visible');
    
    // Force reflow to reset animation
    void actionSettingsButton.offsetHeight;
    
    // Reset display and initial position before adding visible class
    // All buttons start at the same stacked position (60px from bottom)
    // Set them to be invisible initially (they'll fade in as they move up)
    actionSettingsButton.style.display = 'flex';
    actionSettingsButton.style.opacity = '0';
    actionOpenCanvasButton.style.display = 'flex';
    actionOpenCanvasButton.style.opacity = '0';
    actionCaptureArtefactButton.style.display = 'flex';
    actionCaptureArtefactButton.style.opacity = '0';
    
    // Add animating class to set initial position
    actionSettingsButton.classList.add('animating');
    actionOpenCanvasButton.classList.add('animating');
    actionCaptureArtefactButton.classList.add('animating');
    
    // Use requestAnimationFrame to ensure styles are applied
    requestAnimationFrame(() => {
      // Force reflow
      void actionSettingsButton.offsetHeight;
      
      // Remove animating class and add visible class with staggered delays
      // Start from bottom (capture artefact) and unfold upward
      setTimeout(() => {
        actionCaptureArtefactButton.classList.remove('animating');
        actionCaptureArtefactButton.classList.add('visible');
      }, 0);
      
      setTimeout(() => {
        actionOpenCanvasButton.classList.remove('animating');
        actionOpenCanvasButton.classList.add('visible');
      }, 80); // 80ms delay for second button
      
      setTimeout(() => {
        actionSettingsButton.classList.remove('animating');
        actionSettingsButton.classList.add('visible');
      }, 160); // 160ms delay for top button
    });
    
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
      const centerX = CIRCLE_BUTTON_DISPLAY_SIZE / 2;
      const centerY = CIRCLE_BUTTON_DISPLAY_SIZE / 2;
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
  
  // Calculate distance from mouse to circle button center for blend intensity
  if (circleButton) {
    const buttonRect = circleButton.getBoundingClientRect();
    const buttonCenterX = buttonRect.left + buttonRect.width / 2;
    const buttonCenterY = buttonRect.top + buttonRect.height / 2;
    const dx = e.clientX - buttonCenterX;
    const dy = e.clientY - buttonCenterY;
    mouseDistanceToCircleButton = Math.sqrt(dx * dx + dy * dy);
  }
  
  // Maintain camera cursor when in screenshot mode
  if (isScreenshotMode) {
    applyCameraCursor();
    return;
  }
  
  if (isOverlayActive) return;
  
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

// Update cached blurred background (only when needed - expensive operation)
function updateCachedBlurredBackground() {
  if (!backgroundImage || !ctx) {
    cachedBlurredBackground = null;
    return;
  }
  
  // Prevent multiple simultaneous updates
  if (isUpdatingBackgroundCache || (cachedBlurredBackground && !cachedBlurredBackground.complete)) {
    return; // Already updating
  }
  
  isUpdatingBackgroundCache = true;
  
  const clearWidth = window.innerWidth;
  const clearHeight = window.innerHeight;
  
  // OPTIMIZATION: Reduce resolution for cached background to improve performance
  // Since it's blurred anyway, we can use a lower resolution
  const scaleFactor = 0.5; // Use 50% resolution for cache (blur hides quality loss)
  const cacheWidth = Math.floor(clearWidth * scaleFactor);
  const cacheHeight = Math.floor(clearHeight * scaleFactor);
  
  // Create a temporary canvas for the blurred background (smaller for performance)
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = cacheWidth;
  tempCanvas.height = cacheHeight;
  const tempCtx = tempCanvas.getContext('2d');
  
  // Fill with black background
  tempCtx.fillStyle = '#000000';
  tempCtx.fillRect(0, 0, cacheWidth, cacheHeight);
  
  // Apply blur and saturation filters
  tempCtx.filter = `blur(${20 * scaleFactor}px) saturate(${backgroundSaturation}%)`;
  // Scale image to fit canvas
  const scale = Math.max(cacheWidth / backgroundImage.width, cacheHeight / backgroundImage.height);
  const scaledWidth = backgroundImage.width * scale;
  const scaledHeight = backgroundImage.height * scale;
  const x = (cacheWidth - scaledWidth) / 2;
  const y = (cacheHeight - scaledHeight) / 2;
  tempCtx.drawImage(backgroundImage, x, y, scaledWidth, scaledHeight);
  tempCtx.filter = 'none';
  
  // Apply tint overlay
  const hex = backgroundTintColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  tempCtx.fillStyle = `rgba(${r}, ${g}, ${b}, ${backgroundTintOpacity})`;
  tempCtx.fillRect(x, y, scaledWidth, scaledHeight);
  
    // Cache the result
    cachedBlurredBackground = new Image();
    cachedBlurredBackground.onload = () => {
      backgroundCacheDirty = false;
      isUpdatingBackgroundCache = false;
      requestDraw(); // Redraw once cache is ready
    };
    cachedBlurredBackground.onerror = () => {
      isUpdatingBackgroundCache = false;
    };
    cachedBlurredBackground.src = tempCanvas.toDataURL('image/png');
}

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
            // Mark background cache as dirty (needs update)
            backgroundCacheDirty = true;
            cachedBlurredBackground = null;
            // Start fade-in animation
            backgroundFadeOpacity = 0;
            isBackgroundFading = true;
            backgroundFadeStartTime = Date.now();
            // Update toolbar visibility (will show when background fades in)
            updateToolbarVisibility();
            requestDraw();
            resolve();
          };
        }, 300);
      };
    });
  } catch (error) {
    console.error('Error capturing background:', error);
  }
}

// Request a redraw (performance optimization - batches redraws)
function requestDraw() {
  if (!isOverlayActive) return;
  needsRedraw = true;
  if (animationFrameId === null) {
    animationFrameId = requestAnimationFrame(() => {
      animationFrameId = null;
      if (needsRedraw) {
        needsRedraw = false;
        draw();
      }
    });
  }
}

// Draw function
function draw() {
  if (!isOverlayActive) return;
  if (!ctx) {
    console.warn('Canvas context not initialized');
    return;
  }
  
  // Reinitialize canvas if DPR changed (do this before clearing to prevent flash)
  if (canvasNeedsReinit) {
    canvasNeedsReinit = false;
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Save current transform state before reinit (canvas will be cleared)
    const savedScale = canvasScale;
    const savedTranslateX = canvasTranslateX;
    const savedTranslateY = canvasTranslateY;
    
    // Reinitialize canvas (this clears it, but we'll redraw immediately in same frame)
    ctx = setupHighDPICanvas(canvas, width, height);
    
    // Restore transform state
    canvasScale = savedScale;
    canvasTranslateX = savedTranslateX;
    canvasTranslateY = savedTranslateY;
    
    // Note: Background cache is still valid (it's resolution-independent)
    // Continue with drawing in the same frame to prevent flash
    // Don't return - continue to draw immediately below
  }
  
  // Remove test logging to improve performance

  // Use CSS pixel dimensions for clearing
  // IMPORTANT: The context is scaled by DPR, so 1 unit = 1 CSS pixel
  // We need to clear the full canvas area in CSS pixels
  const clearWidth = window.innerWidth;
  const clearHeight = window.innerHeight;
  
  // Clear the entire canvas area (in CSS pixel coordinates)
  // Context is scaled by DPR, so 1 unit = 1 CSS pixel
  ctx.clearRect(0, 0, clearWidth, clearHeight);

  // Draw background with blur - use cached version for performance
  if (backgroundImage) {
    // Update cached background if needed (when settings change or first load)
    // Only update if cache is dirty AND we don't have a cached version yet
    if (backgroundCacheDirty && !cachedBlurredBackground) {
      updateCachedBlurredBackground();
      // Don't draw this frame if cache is being updated - wait for next frame
      ctx.restore();
      return;
    }
    
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
        // Update toolbar visibility when fade completes
        updateToolbarVisibility();
      } else {
        // Update toolbar visibility as background fades in
        updateToolbarVisibility();
      }
    }
    
    // When fading in, start with the background tint color as base instead of black
    if (isBackgroundFading && backgroundFadeOpacity < 1) {
      // Fill with background tint color that fades in as the base
      const hex = backgroundTintColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${backgroundFadeOpacity})`;
      ctx.fillRect(0, 0, clearWidth, clearHeight);
    } else {
      // Fill with black background when fully faded in to prevent desktop showing through blurred edges
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, clearWidth, clearHeight);
    }
    
    // Draw cached blurred background (much faster than applying blur filter every frame)
    if (cachedBlurredBackground && cachedBlurredBackground.complete) {
      ctx.globalAlpha = backgroundFadeOpacity;
      // Draw cached background scaled up to full size (it's stored at 50% resolution)
      ctx.drawImage(cachedBlurredBackground, 0, 0, clearWidth, clearHeight);
    } else if (!cachedBlurredBackground && backgroundImage.complete) {
      // Fallback: if cache isn't ready yet, draw a simple black background
      // This prevents performance issues while cache is being generated
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, clearWidth, clearHeight);
    }
    
    ctx.restore();
    
    // Continue animation if fading
    if (isBackgroundFading) {
      requestDraw();
    }
  } else {
    // Fill with black background if no background image (prevents desktop showing through)
    // Use CSS pixel dimensions (context is already scaled by dpr)
    const cssDims = getCanvasCSSDimensions();
    const clearWidth = Math.max(cssDims.width, window.innerWidth);
    const clearHeight = Math.max(cssDims.height, window.innerHeight);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, clearWidth, clearHeight);
  }

  // Apply transform
  // CRITICAL: The context is already scaled by DPR in setupHighDPICanvas (1 unit = 1 CSS pixel)
  // We need to apply canvas scale and translation on top of that
  // Use setTransform to combine: DPR scale * canvas scale, and translate (translate is already in CSS pixels)
  ctx.save();
  const currentDpr = getDevicePixelRatio();
  // Combined transform: scale = DPR * canvasScale, translate = canvasTranslate (already in CSS pixels, so scale by DPR)
  ctx.setTransform(
    canvasScale * currentDpr, 0, 0, canvasScale * currentDpr,
    canvasTranslateX * currentDpr, canvasTranslateY * currentDpr
  );

  // Draw grid
  drawGrid();

  // Draw images
  if (isReflectionMode && reflectionImageIndex >= 0) {
    // In reflection mode, only draw the reflection image
    const reflectionImg = images[reflectionImageIndex];
    drawImage(reflectionImg, selectedImageIndices.includes(reflectionImageIndex));
    
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
        drawImage(img, selectedImageIndices.includes(index));
      }
    });
  }

  ctx.restore();

  // Draw pins for all images (after transform is restored for fixed screen size)
  if (isReflectionMode && reflectionImageIndex >= 0) {
    // In reflection mode, only draw pins for reflection image
    const reflectionImg = images[reflectionImageIndex];
    if (reflectionImg) {
      drawPins(reflectionImg, selectedImageIndices.includes(reflectionImageIndex));
    }
  } else {
    // In normal mode, draw pins for all visible images
    images.forEach((img, index) => {
      if (!img.hidden) {
        drawPins(img, selectedImageIndices.includes(index));
      }
    });
  }

  // Draw red control panel in reflection mode (after transform is restored for screen coordinates)
  if (isReflectionMode && reflectionImageIndex >= 0) {
    drawReflectionControlPanel(images[reflectionImageIndex]);
  }

  // Draw pin placement UI if placing a pin
  if (isPlacingPin && tempPinLocation) {
    drawPinPlacementUI();
  }

  // Draw selection border and handles for all selected images (after transform is restored for fixed screen size)
  selectedImageIndices.forEach(index => {
    if (index >= 0 && index < images.length) {
      drawSelectionBorderAndHandles(images[index]);
    }
  });
  
  // Draw reflection button if exactly one image is selected (after transform is restored for fixed size)
  if (selectedImageIndices.length === 1 && selectedImageIndices[0] >= 0 && selectedImageIndices[0] < images.length) {
    drawReflectionButton(images[selectedImageIndices[0]]);
  } else {
    reflectionButtonBounds = null;
  }
  
  // Draw selection box if currently selecting
  if (isSelecting) {
    drawSelectionBox();
  }
  
  // Update FPS counter
  const currentTime = performance.now();
  fpsFrameCount++;
  const timeSinceLastUpdate = currentTime - fpsLastUpdateTime;
  
  if (timeSinceLastUpdate >= fpsUpdateInterval) {
    // Calculate average FPS over the last second
    currentFPS = Math.round((fpsFrameCount * 1000) / timeSinceLastUpdate);
    if (fpsCounterText) {
      fpsCounterText.textContent = `FPS: ${currentFPS}`;
    }
    fpsFrameCount = 0;
    fpsLastUpdateTime = currentTime;
  }
  
  // Update DPR display every frame (to show real-time changes during interaction)
  if (fpsCounterDpr && isOverlayActive) {
    const currentDPR = getDevicePixelRatio();
    fpsCounterDpr.textContent = `DPR: ${currentDPR.toFixed(2)}`;
  }
}

// Draw pin placement UI on canvas
function drawPinPlacementUI() {
  if (!tempPinLocation || !isPlacingPin) return;
  
  const reflectionImg = images[reflectionImageIndex];
  if (!reflectionImg) return;
  
  // Calculate pin position in screen coordinates
  const canvasX = reflectionImg.x + (tempPinLocation.x * reflectionImg.width);
  const canvasY = reflectionImg.y + (tempPinLocation.y * reflectionImg.height);
  const screenPos = canvasToScreen(canvasX, canvasY);
  
  ctx.save();
  
  // Draw temporary pin marker (in CSS pixels - context is already scaled by dpr)
  ctx.fillStyle = 'rgba(59, 130, 246, 0.7)'; // Semi-transparent blue
  ctx.beginPath();
  ctx.arc(screenPos.x, screenPos.y, 6, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

// Draw grid (optimized - batch all lines into single path)
function drawGrid() {
  const gridSize = 50; // Grid size in canvas coordinates
  const canvasWidth = window.innerWidth;
  const canvasHeight = window.innerHeight;
  
  // Calculate grid bounds in canvas coordinates
  const startX = Math.floor((-canvasTranslateX) / canvasScale / gridSize) * gridSize;
  const startY = Math.floor((-canvasTranslateY) / canvasScale / gridSize) * gridSize;
  const endX = startX + (canvasWidth / canvasScale) + gridSize * 2;
  const endY = startY + (canvasHeight / canvasScale) + gridSize * 2;

  // OPTIMIZATION: Batch all grid lines into a single path for better performance
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  
  // Add all vertical lines to the path
  for (let x = startX; x < endX; x += gridSize) {
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
  }
  
  // Add all horizontal lines to the path
  for (let y = startY; y < endY; y += gridSize) {
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
  }
  
  // Stroke all lines at once (much faster than individual strokes)
  ctx.stroke();
  ctx.restore();
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

  // Note: Selection border and handles are drawn after transform is restored (in draw function) for fixed screen size
  // Note: Pins are drawn after transform is restored (in draw function) for fixed screen size
}

// Draw selection border and handles (called after transform is restored, so we draw in screen coordinates)
function drawSelectionBorderAndHandles(img) {
  if (!img) return;
  
  // Convert image corners from canvas coordinates to screen coordinates
  const topLeft = canvasToScreen(img.x, img.y);
  const topRight = canvasToScreen(img.x + img.width, img.y);
  const bottomLeft = canvasToScreen(img.x, img.y + img.height);
  const bottomRight = canvasToScreen(img.x + img.width, img.y + img.height);
  
  // Calculate screen dimensions
  const screenWidth = topRight.x - topLeft.x;
  const screenHeight = bottomLeft.y - topLeft.y;
  
  // Draw selection border (fixed size in CSS pixels, independent of DPR)
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2; // Fixed 2 CSS pixels (context is already in screen coordinates, no DPR scaling)
  ctx.strokeRect(topLeft.x, topLeft.y, screenWidth, screenHeight);

  // Don't draw resize handles in reflection mode
  if (isReflectionMode) {
    return;
  }

  // Draw resize handles (fixed size in CSS pixels, independent of DPR)
  const handleSize = 12; // Fixed 12 CSS pixels (context is already in screen coordinates, no DPR scaling)
  const handles = [
    { x: topLeft.x, y: topLeft.y }, // top-left
    { x: topRight.x, y: topRight.y }, // top-right
    { x: bottomRight.x, y: bottomRight.y }, // bottom-right
    { x: bottomLeft.x, y: bottomLeft.y } // bottom-left
  ];

  ctx.fillStyle = '#3b82f6';
  handles.forEach(handle => {
    ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
  });
}

// Draw pins on an image (called after transform is restored, so we draw in screen coordinates)
function drawPins(img, isImageSelected) {
  if (!img || !img.pins || img.pins.length === 0) return;
  
  const dpr = getDevicePixelRatio();
  ctx.save();
  
  img.pins.forEach(pin => {
    // Calculate pin position in canvas coordinates
    const canvasX = img.x + (pin.location.x * img.width);
    const canvasY = img.y + (pin.location.y * img.height);
    
    // Convert to screen coordinates (transform is already restored, CSS pixels)
    const screenPos = canvasToScreen(canvasX, canvasY);
    const screenX = screenPos.x;
    const screenY = screenPos.y;
    
    const isSelected = selectedPinId === pin.id;
    const hasEmotionalAspects = pin.emotionalAspects && pin.emotionalAspects.length > 0;
    const hasValueAspects = pin.valueAspects && pin.valueAspects.length > 0;
    
    // Define radii for concentric rings (in CSS pixels - context is already scaled by dpr)
    const blueRadius = isSelected ? 14 : 12; // Blue circle (innermost) - bigger when selected
    const whiteStrokeWidth = 4; // White stroke width
    const yellowRingInnerRadius = blueRadius + whiteStrokeWidth * 2; // Start of yellow ring (after blue + white stroke)
    const yellowRingOuterRadius = yellowRingInnerRadius + 8; // End of yellow ring
    const greenRingInnerRadius = hasEmotionalAspects ? yellowRingOuterRadius + whiteStrokeWidth * 2 : yellowRingInnerRadius;
    const greenRingOuterRadius = greenRingInnerRadius + 8; // End of green ring
    
    // Draw from outside to inside to create proper layering
    
    // Draw green ring (outermost) if value aspects exist
    if (hasValueAspects) {
      // Draw green ring as a donut shape
      ctx.fillStyle = '#22c55e'; // Green
      ctx.beginPath();
      ctx.arc(screenX, screenY, greenRingOuterRadius, 0, Math.PI * 2);
      ctx.arc(screenX, screenY, greenRingInnerRadius, 0, Math.PI * 2, true); // Counter-clockwise to create hole
      ctx.fill();
      
      // White stroke on outer edge of green ring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = whiteStrokeWidth;
      ctx.beginPath();
      ctx.arc(screenX, screenY, greenRingOuterRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      // White stroke on inner edge of green ring
      ctx.beginPath();
      ctx.arc(screenX, screenY, greenRingInnerRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Draw yellow ring if emotional aspects exist
    if (hasEmotionalAspects) {
      // Draw yellow ring as a donut shape
      ctx.fillStyle = '#eab308'; // Yellow
      ctx.beginPath();
      ctx.arc(screenX, screenY, yellowRingOuterRadius, 0, Math.PI * 2);
      ctx.arc(screenX, screenY, yellowRingInnerRadius, 0, Math.PI * 2, true); // Counter-clockwise to create hole
      ctx.fill();
      
      // White stroke on outer edge of yellow ring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = whiteStrokeWidth;
      ctx.beginPath();
      ctx.arc(screenX, screenY, yellowRingOuterRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      // White stroke on inner edge of yellow ring
      ctx.beginPath();
      ctx.arc(screenX, screenY, yellowRingInnerRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Draw blue circle (innermost) - always visible
    ctx.fillStyle = isSelected ? '#2563eb' : '#3b82f6'; // Darker blue if selected
    ctx.beginPath();
    ctx.arc(screenX, screenY, blueRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // White stroke around blue circle
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = whiteStrokeWidth;
    ctx.beginPath();
    ctx.arc(screenX, screenY, blueRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Selection is indicated by larger size (blueRadius is already larger when selected)
  });
  
  ctx.restore();
}

// Get pin at screen coordinates
function getPinAt(screenX, screenY, img) {
  if (!img || !img.pins || img.pins.length === 0) return null;
  
  // Convert viewport coordinates to canvas-relative screen coordinates for comparison (CSS pixels)
  const rect = canvas.getBoundingClientRect();
  const canvasRelativeX = screenX - rect.left;
  const canvasRelativeY = screenY - rect.top;
  const hitRadius = 10; // Hit radius in CSS pixels
  
  for (let i = img.pins.length - 1; i >= 0; i--) {
    const pin = img.pins[i];
    const canvasX = img.x + (pin.location.x * img.width);
    const canvasY = img.y + (pin.location.y * img.height);
    const screenPos = canvasToScreen(canvasX, canvasY); // Returns canvas-relative coordinates (CSS pixels)
    
    const dx = canvasRelativeX - screenPos.x;
    const dy = canvasRelativeY - screenPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= hitRadius) {
      return pin;
    }
  }
  
  return null;
}

// Draw red control panel in reflection mode
function drawReflectionControlPanel(img) {
  if (!img || !isReflectionMode) return;
  
  const dpr = getDevicePixelRatio();
  // Control panel dimensions (in CSS pixels - context is already scaled by dpr)
  const panelWidth = 500; // Fixed 500px width (CSS pixels)
  const spacing = 40; // Responsive spacing between image and panel (CSS pixels)
  
  // Get image position and dimensions in screen coordinates (CSS pixels)
  const imageTopLeft = canvasToScreen(img.x, img.y);
  const imageBottomLeft = canvasToScreen(img.x, img.y + img.height);
  const imageTopRight = canvasToScreen(img.x + img.width, img.y);
  
  // Panel height matches image height (in CSS pixels)
  const panelHeight = imageBottomLeft.y - imageTopLeft.y;
  
  // Calculate panel position (to the right of the image, aligned with top)
  const panelX = imageTopRight.x + spacing;
  const panelY = imageTopLeft.y; // Align with top of image
  
  // Store panel bounds for input field positioning
  window.reflectionPanelBounds = {
    x: panelX,
    y: panelY,
    width: panelWidth,
    height: panelHeight
  };
  
  // Draw red control panel (already in screen coordinates since transform is restored)
  ctx.fillStyle = '#ef4444'; // Red background
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
  
  // Draw input fields and aspect tags
  drawControlPanelInputs(img, panelX, panelY, panelWidth, panelHeight);
  
  // Update control panel input positions after drawing
  if (isReflectionMode) {
    updateControlPanelInputs();
  }
}

// Draw input fields and aspect tags in control panel
function drawControlPanelInputs(img, panelX, panelY, panelWidth, panelHeight) {
  if (!img) return;
  
  const dpr = getDevicePixelRatio();
  // All dimensions in CSS pixels (context is already scaled by dpr)
  const padding = 20;
  const fieldHeight = 32;
  const labelHeight = 20;
  
  // Clear tag bounds
  window.aspectTagBounds = [];
  
  let currentY = panelY + padding;
  
  // Emotional Aspects Section
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = `12px ui-sans-serif, system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText('Emotional Aspects', panelX + padding, currentY);
  currentY += labelHeight + 8;
  
  // Draw input field background (visual representation, actual input is HTML)
  const emotionalInputEnabled = selectedPinId !== null;
  ctx.fillStyle = emotionalInputEnabled ? 'rgba(255, 255, 255, 0.3)' : 'rgba(200, 200, 200, 0.2)';
  ctx.fillRect(panelX + padding, currentY, panelWidth - padding * 2 - 40, fieldHeight);
  ctx.strokeStyle = emotionalInputEnabled ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX + padding, currentY, panelWidth - padding * 2 - 40, fieldHeight);
  
  // Draw plus button (visual representation)
  const plusButtonX = panelX + panelWidth - padding - 30;
  ctx.fillStyle = emotionalInputEnabled ? 'rgba(59, 130, 246, 0.8)' : 'rgba(200, 200, 200, 0.5)';
  ctx.fillRect(plusButtonX, currentY, 30, fieldHeight);
  ctx.fillStyle = 'white';
  ctx.font = `16px ui-sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', plusButtonX + 15, currentY + fieldHeight / 2);
  
  currentY += fieldHeight + 10;
  
  // Draw emotional aspects tags if pin is selected
  if (selectedPinId) {
    const selectedPin = img.pins.find(p => p.id === selectedPinId);
    if (selectedPin && selectedPin.emotionalAspects && selectedPin.emotionalAspects.length > 0) {
      selectedPin.emotionalAspects.forEach((aspect, index) => {
        const tagX = panelX + padding + (index % 3) * 150;
        const tagY = currentY + Math.floor(index / 3) * 35;
        drawAspectTag(aspect, tagX, tagY, 'emotional', index);
      });
      currentY += Math.ceil(selectedPin.emotionalAspects.length / 3) * 35;
    }
  }
  
  currentY += 20;
  
  // Value Aspects Section
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = `12px ui-sans-serif, system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText('Value Aspects', panelX + padding, currentY);
  currentY += labelHeight + 8;
  
  // Check if value aspects field should be enabled
  const selectedPin = selectedPinId ? img.pins.find(p => p.id === selectedPinId) : null;
  const valueInputEnabled = selectedPin && selectedPin.emotionalAspects && selectedPin.emotionalAspects.length > 0;
  
  // Draw input field background (visual representation)
  ctx.fillStyle = valueInputEnabled ? 'rgba(255, 255, 255, 0.3)' : 'rgba(200, 200, 200, 0.2)';
  ctx.fillRect(panelX + padding, currentY, panelWidth - padding * 2 - 40, fieldHeight);
  ctx.strokeStyle = valueInputEnabled ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX + padding, currentY, panelWidth - padding * 2 - 40, fieldHeight);
  
  // Draw plus button (visual representation)
  ctx.fillStyle = valueInputEnabled ? 'rgba(59, 130, 246, 0.8)' : 'rgba(200, 200, 200, 0.5)';
  ctx.fillRect(plusButtonX, currentY, 30, fieldHeight);
  ctx.fillStyle = 'white';
  ctx.fillText('+', plusButtonX + 15, currentY + fieldHeight / 2);
  
  currentY += fieldHeight + 10;
  
  // Draw value aspects tags if pin is selected
  if (selectedPin && selectedPin.valueAspects && selectedPin.valueAspects.length > 0) {
      selectedPin.valueAspects.forEach((aspect, index) => {
        const tagX = panelX + padding + (index % 3) * 150;
        const tagY = currentY + Math.floor(index / 3) * 35;
        drawAspectTag(aspect, tagX, tagY, 'value', index);
      });
  }
  
  ctx.restore();
}

// Draw an aspect tag
function drawAspectTag(text, x, y, type, index) {
  const dpr = getDevicePixelRatio();
  ctx.save();
  
  // All dimensions in CSS pixels (context is already scaled by dpr)
  ctx.font = `12px ui-sans-serif, system-ui, -apple-system, sans-serif`;
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width; // Already in CSS pixels
  const tagWidth = textWidth + 30; // Text + delete button (CSS pixels)
  const tagHeight = 24; // CSS pixels
  
  // Draw tag background
  ctx.fillStyle = type === 'emotional' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.2)';
  ctx.fillRect(x, y, tagWidth, tagHeight);
  ctx.strokeStyle = type === 'emotional' ? '#eab308' : '#22c55e';
  ctx.lineWidth = 1; // CSS pixels
  ctx.strokeRect(x, y, tagWidth, tagHeight);
  
  // Draw text
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 8, y + tagHeight / 2);
  
  // Draw delete button (X)
  const deleteX = x + textWidth + 10;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.font = `14px ui-sans-serif`;
  ctx.fillText('×', deleteX, y + tagHeight / 2);
  
  // Store tag bounds for click detection (in CSS pixels)
  if (!window.aspectTagBounds) window.aspectTagBounds = [];
  window.aspectTagBounds.push({
    x: deleteX - 5,
    y: y,
    width: 20,
    height: tagHeight,
    type: type,
    index: index
  });
  
  ctx.restore();
}

// Calculate reflection button width in canvas coordinates (for minimum image width)
function getReflectionButtonMinWidth() {
  const buttonText = isReflectionMode ? 'Exit reflection' : 'Enter reflection';
  const buttonPadding = 10; // Fixed pixel padding (screen coordinates)
  
  // Measure text at fixed size (screen coordinates)
  // Use a temporary canvas for text measurement to avoid dependency on main canvas context state
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.font = `14px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const textMetrics = tempCtx.measureText(buttonText);
  const textWidth = textMetrics.width;
  
  // Calculate button width in screen coordinates
  const buttonWidthScreen = textWidth + buttonPadding * 2;
  
  // Convert button width from screen coordinates to canvas coordinates
  // Screen coordinates are CSS pixels, canvas coordinates are scaled by canvasScale
  // So we divide by canvasScale to get canvas coordinate width
  return buttonWidthScreen / canvasScale;
}

// Draw reflection button on canvas (at fixed screen size)
function drawReflectionButton(img) {
  if (!img) return;
  
  const buttonText = isReflectionMode ? 'Exit reflection' : 'Enter reflection';
  const buttonPadding = 10; // Fixed pixel padding (screen coordinates, context already scaled by dpr)
  const buttonSpacing = 10; // Fixed pixel spacing between image and button (screen coordinates)
  
  // Calculate button position in canvas coordinates (below image, centered)
  const buttonCanvasX = img.x + img.width / 2;
  const buttonCanvasY = img.y + img.height;
  
  // Convert to screen coordinates
  const screenPos = canvasToScreen(buttonCanvasX, buttonCanvasY);
  const buttonScreenX = screenPos.x;
  const buttonScreenY = screenPos.y + buttonSpacing;
  
  // Measure text at fixed size (screen coordinates, context already scaled by dpr)
  ctx.save();
  ctx.font = `14px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const textMetrics = ctx.measureText(buttonText);
  const textWidth = textMetrics.width;
  const textHeight = 20; // Fixed pixel text height (screen coordinates)
  
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
  
  // Draw button background with rounded corners (fixed pixel size, screen coordinates)
  // Red background for "Exit reflection", blue for "Enter reflection" (same as selection frame)
  ctx.fillStyle = isReflectionMode ? 'rgba(239, 68, 68, 0.95)' : 'rgba(59, 130, 246, 0.95)';
  const cornerRadius = 8; // Fixed pixel corner radius (screen coordinates)
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
  ctx.lineWidth = 1; // Fixed pixel line width (screen coordinates)
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
  // Convert image bounds to screen coordinates (canvas-relative)
  const topLeft = canvasToScreen(img.x, img.y);
  const bottomRight = canvasToScreen(img.x + img.width, img.y + img.height);
  
  // Get canvas display size (CSS pixels, not physical pixels)
  const rect = canvas.getBoundingClientRect();
  const canvasDisplayWidth = rect.width;
  const canvasDisplayHeight = rect.height;
  
  // Check if any part of the image is visible (compare with canvas display size)
  return !(
    bottomRight.x < 0 ||
    topLeft.x > canvasDisplayWidth ||
    bottomRight.y < 0 ||
    topLeft.y > canvasDisplayHeight
  );
}

// Immediately position canvas to show a specific image (no animation)
function positionCanvasToShowImage(img) {
  // Calculate image center in canvas coordinates
  const imageCenterX = img.x + img.width / 2;
  const imageCenterY = img.y + img.height / 2;
  
  // Keep current scale (or use a reasonable scale if too zoomed in/out)
  // This preserves the user's zoom level while centering the new image
  const targetScale = Math.max(0.1, Math.min(2.0, canvasScale)); // Allow zoom in up to 2x, minimum 0.1x (allow zooming out further)
  
  // Get CSS pixel dimensions for calculations
  const cssDims = getCanvasCSSDimensions();
  
  // Calculate target position to center image in viewport (using CSS pixels)
  const targetTranslateX = cssDims.width / 2 - imageCenterX * targetScale;
  const targetTranslateY = cssDims.height / 2 - imageCenterY * targetScale;
  
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
  
  // Animate image opacity fade during transition (optimized - calculate once)
  const fadeCurrentTime = Date.now();
  if (isReflectionMode && reflectionImageIndex >= 0) {
    // Fade out other images
    images.forEach((img, index) => {
      if (index !== reflectionImageIndex && img.fadeStartTime !== undefined) {
        const fadeElapsed = fadeCurrentTime - img.fadeStartTime;
        const fadeProgress = Math.min(fadeElapsed / img.fadeDuration, 1);
        img.opacity = 1.0 - fadeProgress;
      }
    });
  } else if (!isReflectionMode) {
    // Fade in images when exiting reflection mode
    images.forEach((img) => {
      if (img.fadeStartTime !== undefined) {
        const fadeElapsed = fadeCurrentTime - img.fadeStartTime;
        const fadeProgress = Math.min(fadeElapsed / img.fadeDuration, 1);
        img.opacity = fadeProgress; // Fade from 0.0 to 1.0
        if (fadeProgress >= 1) {
          img.opacity = 1.0;
          img.fadeStartTime = undefined; // Clear fade animation
        }
      }
    });
  }
  
  // Use requestDraw for batched redraws (better performance)
  requestDraw();
  
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
    
    // Stop tracking interaction (animation is done)
    setInteracting(false);
    
    requestDraw();
    
    // Continue fade-in animation if images are still fading in (after exiting reflection mode)
    if (!isReflectionMode) {
      const checkFade = () => {
        let stillFading = false;
        const fadeCheckTime = Date.now();
        images.forEach((img) => {
          if (img.fadeStartTime !== undefined) {
            const fadeElapsed = fadeCheckTime - img.fadeStartTime;
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
          requestDraw(); // Use requestDraw instead of direct draw()
          requestAnimationFrame(checkFade);
        }
      };
      checkFade();
    }
  }
}

// Enter reflection mode
function enterReflectionMode(fromScreenshot = false) {
  // Only allow entering reflection mode with exactly one selected image
  if (selectedImageIndices.length !== 1 || selectedImageIndices[0] < 0 || selectedImageIndices[0] >= images.length) return;
  const selectedImageIndex = selectedImageIndices[0];
  
  // Reset pin placement state
  hidePinPlacementUI();
  selectedPinId = null;
  
  // Clear screenshot mode transition flag when entering reflection mode (canvas opens)
  // This ensures the icon switches to X immediately when canvas opens
  if (fromScreenshot && isExitingScreenshotMode) {
    isExitingScreenshotMode = false;
    // Keep circles collected (X state) when canvas/overlay is active
    // Don't uncollect - overlay should show X state
    if (!isCirclesCollected) {
      isCirclesCollected = true;
      currentIconRotation = 0;
      targetIconRotation = 0;
      hoverAnimationProgress = 1.0;
      const centerX = CIRCLE_BUTTON_DISPLAY_SIZE / 2;
      const centerY = CIRCLE_BUTTON_DISPLAY_SIZE / 2;
      if (circles && circles.length > 0) {
        circles.forEach(circle => {
          circle.x = centerX;
          circle.y = centerY;
        });
      }
    }
  }
  
  // Store current canvas state
  previousCanvasScale = canvasScale;
  previousCanvasTranslateX = canvasTranslateX;
  previousCanvasTranslateY = canvasTranslateY;
  
  const img = images[selectedImageIndex];
  
  // Get CSS pixel dimensions for calculations
  const cssDims = getCanvasCSSDimensions();
  
  // Control panel dimensions (in screen coordinates, CSS pixels)
  const panelWidth = 500; // Fixed 500px width
  const spacing = 40; // Responsive spacing between image and panel
  
  // Calculate zoom to fit image + control panel in viewport (with 90% padding)
  // Account for control panel width and spacing (all in CSS pixels)
  const availableWidth = (cssDims.width * 0.9) - panelWidth - spacing;
  const scaleX = availableWidth / img.width;
  const scaleY = (cssDims.height * 0.9) / img.height;
  const fitScale = Math.min(scaleX, scaleY);
  
  // Calculate total width of image + spacing + panel in screen coordinates (CSS pixels)
  const imageScreenWidth = img.width * fitScale;
  const totalGroupWidth = imageScreenWidth + spacing + panelWidth;
  
  // Calculate image center in canvas coordinates
  const imageCenterX = img.x + img.width / 2;
  const imageCenterY = img.y + img.height / 2;
  
  // Calculate target position to center the group (image + spacing + panel) horizontally
  // The group should be centered, so the left edge of the image in screen coordinates should be at:
  // (cssDims.width - totalGroupWidth) / 2
  const groupLeftScreenX = (cssDims.width - totalGroupWidth) / 2;
  
  // Convert to canvas coordinates: screenX = canvasX * scale + translateX
  // So: translateX = screenX - canvasX * scale (all in CSS pixels)
  const targetTranslateX = groupLeftScreenX - img.x * fitScale;
  const targetTranslateY = cssDims.height / 2 - imageCenterY * fitScale;
  
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
  // Clear transition flag since we're now in reflection mode
  isTransitioningToReflectionMode = false;
  
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
  updateToolbarVisibility();
  reflectionButton.classList.remove('visible');
  
  // Start animation
  isAnimating = true;
  animationStartTime = Date.now();
  
  // Use low DPR during animation for better performance
  setInteracting(true);
  
  animateCanvasTransform();
}

// Exit reflection mode
function exitReflectionMode() {
  // Reset pin-related state
  hidePinPlacementUI();
  selectedPinId = null;
  if (controlPanelInputs) controlPanelInputs.style.display = 'none';
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
  
  // Calculate translate values to keep the reflection image centered during zoom-out
  let targetTranslateX, targetTranslateY;
  
  if (reflectionImg) {
    // Get the image center in canvas coordinates
    const imageCenterX = reflectionImg.x + reflectionImg.width / 2;
    const imageCenterY = reflectionImg.y + reflectionImg.height / 2;
    
    // Calculate the current screen position of the image center (during reflection mode)
    // Screen position = canvasPosition * scale + translate
    const currentScreenCenterX = imageCenterX * canvasScale + canvasTranslateX;
    const currentScreenCenterY = imageCenterY * canvasScale + canvasTranslateY;
    
    // Calculate the translate values at the target scale to keep the same screen position
    // We want: currentScreenCenter = imageCenter * targetScale + targetTranslate
    // So: targetTranslate = currentScreenCenter - imageCenter * targetScale
    targetTranslateX = currentScreenCenterX - imageCenterX * previousCanvasScale;
    targetTranslateY = currentScreenCenterY - imageCenterY * previousCanvasScale;
  } else {
    // Fallback: use previous translate values if image is not available
    targetTranslateX = previousCanvasTranslateX;
    targetTranslateY = previousCanvasTranslateY;
  }
  
  // Set animation end values (previous scale, but adjusted translate to keep image centered)
  animationEndScale = previousCanvasScale;
  animationEndTranslateX = targetTranslateX;
  animationEndTranslateY = targetTranslateY;
  
  // Clear reflection mode state
  isReflectionMode = false;
  reflectionImageIndex = -1;
  
  // Update toolbar visibility (will show if overlay is active and background is visible)
  updateToolbarVisibility();
  
  // Hide HTML button (we're drawing on canvas now)
  reflectionButton.classList.remove('visible');
  
  // Start animation
  isAnimating = true;
  animationStartTime = Date.now();
  
  // Use low DPR during animation for better performance
  setInteracting(true);
  
  animateCanvasTransform();
}

// Convert screen coordinates to canvas coordinates
// Convert screen/viewport coordinates to canvas coordinates
function screenToCanvas(x, y) {
  // CRITICAL: Don't rely on getBoundingClientRect() which returns 0x0
  // Use window dimensions directly since canvas should be fullscreen at (0,0)
  // Canvas should start at (0, 0) since it's fullscreen and positioned absolutely
  const canvasX = x; // Mouse is already in viewport coordinates, canvas is at (0,0)
  const canvasY = y;
  
  // Apply canvas transform
  // The transform is: screenX = canvasX * canvasScale + canvasTranslateX
  // Where screenX is canvas-relative (CSS pixels) and canvasTranslateX is viewport-relative (CSS pixels)
  // Since canvas is at (0,0), we can use canvasTranslateX/Y directly
  return {
    x: (canvasX - canvasTranslateX) / canvasScale,
    y: (canvasY - canvasTranslateY) / canvasScale
  };
}

// Convert canvas coordinates to screen coordinates (canvas-relative, for drawing after transform is restored)
function canvasToScreen(x, y) {
  // CRITICAL: Don't rely on getBoundingClientRect() which returns 0x0
  // Canvas should be at (0, 0) since it's fullscreen, so use canvasTranslateX/Y directly
  // Apply transform: screenX = canvasX * scale + translateX (screenX is canvas-relative)
  // Return canvas-relative screen coordinates (for drawing after ctx.restore())
  return {
    x: x * canvasScale + canvasTranslateX,
    y: y * canvasScale + canvasTranslateY
  };
}

// Convert canvas coordinates to viewport coordinates (for hit detection, etc.)
function canvasToViewport(x, y) {
  const rect = canvas.getBoundingClientRect();
  const screenPos = canvasToScreen(x, y);
  return {
    x: screenPos.x + rect.left,
    y: screenPos.y + rect.top
  };
}

// Handle selection changes
function handleSelectionChange(newIndex) {
  // If selecting a different image while in reflection mode, exit reflection mode
  if (isReflectionMode && newIndex !== reflectionImageIndex) {
    exitReflectionMode();
  }
  
  // Button is now drawn on canvas, so we just need to redraw
  requestDraw();
}

// Get image at point
function getImageAt(x, y) {
  const canvasPos = screenToCanvas(x, y);
  
  // Check images in reverse order (top to bottom) to get the topmost image
  for (let i = images.length - 1; i >= 0; i--) {
    const img = images[i];
    // Skip hidden images
    if (img.hidden) continue;
    // Skip images without element
    if (!img.element) continue;
    
    // Check if point is inside image bounds (with small tolerance for edge cases)
    const tolerance = 0.1; // Small tolerance for floating point precision
    if (canvasPos.x >= img.x - tolerance && canvasPos.x <= img.x + img.width + tolerance &&
        canvasPos.y >= img.y - tolerance && canvasPos.y <= img.y + img.height + tolerance) {
      return i;
    }
  }
  return -1;
}

// Get images that intersect with selection box (in screen coordinates)
function getImagesInSelectionBox(startX, startY, endX, endY) {
  const indices = [];
  
  // Normalize selection box coordinates (start might be after end)
  const boxLeft = Math.min(startX, endX);
  const boxRight = Math.max(startX, endX);
  const boxTop = Math.min(startY, endY);
  const boxBottom = Math.max(startY, endY);
  
  // Convert selection box corners to canvas coordinates
  const topLeft = screenToCanvas(boxLeft, boxTop);
  const bottomRight = screenToCanvas(boxRight, boxBottom);
  
  const selectionLeft = topLeft.x;
  const selectionRight = bottomRight.x;
  const selectionTop = topLeft.y;
  const selectionBottom = bottomRight.y;
  
  // Check each image for intersection
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    // Skip hidden images
    if (img.hidden) continue;
    // Skip images without element
    if (!img.element) continue;
    
    // Check if image intersects with selection box
    // Image bounds in canvas coordinates
    const imgLeft = img.x;
    const imgRight = img.x + img.width;
    const imgTop = img.y;
    const imgBottom = img.y + img.height;
    
    // Check for intersection (including partial overlap)
    if (!(imgRight < selectionLeft || imgLeft > selectionRight || 
          imgBottom < selectionTop || imgTop > selectionBottom)) {
      indices.push(i);
    }
  }
  
  return indices;
}

// Draw selection box on canvas
function drawSelectionBox() {
  if (!isSelecting) return;
  
  ctx.save();
  
  // Calculate box dimensions
  const boxLeft = Math.min(selectionBoxStartX, selectionBoxEndX);
  const boxRight = Math.max(selectionBoxStartX, selectionBoxEndX);
  const boxTop = Math.min(selectionBoxStartY, selectionBoxEndY);
  const boxBottom = Math.max(selectionBoxStartY, selectionBoxEndY);
  const boxWidth = boxRight - boxLeft;
  const boxHeight = boxBottom - boxTop;
  
  // Draw blue selection box (screen coordinates, so we draw after transform restore)
  ctx.strokeStyle = '#3b82f6'; // Blue color
  ctx.lineWidth = 2; // 2 CSS pixels
  ctx.setLineDash([5, 5]); // Dashed border
  ctx.strokeRect(boxLeft, boxTop, boxWidth, boxHeight);
  
  // Fill with semi-transparent blue
  ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'; // 10% opacity blue
  ctx.fillRect(boxLeft, boxTop, boxWidth, boxHeight);
  
  ctx.restore();
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
  // Convert to screen coordinates for hit detection (handles are drawn in screen coordinates)
  const topLeft = canvasToScreen(img.x, img.y);
  const topRight = canvasToScreen(img.x + img.width, img.y);
  const bottomLeft = canvasToScreen(img.x, img.y + img.height);
  const bottomRight = canvasToScreen(img.x + img.width, img.y + img.height);
  
  const handles = [
    { x: topLeft.x, y: topLeft.y, corner: 'nw' },
    { x: topRight.x, y: topRight.y, corner: 'ne' },
    { x: bottomRight.x, y: bottomRight.y, corner: 'se' },
    { x: bottomLeft.x, y: bottomLeft.y, corner: 'sw' }
  ];
  
  // Handle size is fixed 12 CSS pixels in screen coordinates
  const handleSize = 12;

  for (const handle of handles) {
    if (Math.abs(x - handle.x) < handleSize && 
        Math.abs(y - handle.y) < handleSize) {
      return handle.corner;
    }
  }
  return null;
}

// Event Listeners

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  // Escape key - exit screenshot mode or close overlay
  if (e.key === 'Escape') {
    if (isScreenshotMode) {
      // Exit screenshot mode
      selectionBox.style.display = 'none';
      selectionBox.style.width = '0px';
      selectionBox.style.height = '0px';
      
      endScreenshotMode();
      
      // Remove event listeners
      if (screenshotHandlers) {
        screenshotOverlay.removeEventListener('mousedown', screenshotHandlers.mousedown);
        screenshotOverlay.removeEventListener('mousemove', screenshotHandlers.mousemove);
        screenshotOverlay.removeEventListener('mouseup', screenshotHandlers.mouseup);
        screenshotHandlers = null;
      }
      return;
    }
    
    if (isOverlayActive) {
      toggleOverlay();
      return;
    }
  }
  
  if (!isOverlayActive) return;
  
  // Command+Comma - open settings panel
  if (e.metaKey && (e.key === ',' || e.keyCode === 188)) {
    e.preventDefault();
    // Open settings modal
    settingsModalOverlay.classList.add('visible');
    ipcRenderer.send('set-ignore-mouse-events', false);
    return;
  }
  
  // Delete key - delete all selected images
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedImageIndices.length > 0) {
    e.preventDefault();
    
    // Sort indices in descending order to remove from highest to lowest (maintains correct indices)
    const sortedIndices = [...selectedImageIndices].sort((a, b) => b - a);
    
    // Check if reflection image is being deleted
    let wasReflectionImageDeleted = false;
    if (isReflectionMode && sortedIndices.includes(reflectionImageIndex)) {
      exitReflectionMode();
      wasReflectionImageDeleted = true;
    }
    
    // Remove all selected images from the array
    sortedIndices.forEach(index => {
      if (index >= 0 && index < images.length) {
        images.splice(index, 1);
      }
    });
    
    // Clear selection
    selectedImageIndices = [];
    // Update button visibility (this will call requestDraw())
    handleSelectionChange(-1);
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

  // In reflection mode, handle pin placement and selection
  if (isReflectionMode) {
    const reflectionImg = images[reflectionImageIndex];
    if (!reflectionImg) return;
    
    // Check if clicking on an existing pin
    const clickedPin = getPinAt(e.clientX, e.clientY, reflectionImg);
    if (clickedPin) {
      // Select the pin
      selectedPinId = clickedPin.id;
      updateControlPanelInputs();
      requestDraw();
      return;
    }
    
    // Check if clicking on the reflection image (for pin placement)
    // But not if clicking on pin placement UI or control panel
    if (pinPlacementUI && pinPlacementUI.contains(e.target)) {
      return; // Don't handle clicks on pin placement UI
    }
    if (controlPanelInputs && controlPanelInputs.contains(e.target)) {
      return; // Don't handle clicks on control panel inputs
    }
    
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    if (canvasPos.x >= reflectionImg.x && 
        canvasPos.x <= reflectionImg.x + reflectionImg.width &&
        canvasPos.y >= reflectionImg.y && 
        canvasPos.y <= reflectionImg.y + reflectionImg.height) {
      // Start pin placement
      e.preventDefault();
      e.stopPropagation();
      isPlacingPin = true;
      const normalizedX = (canvasPos.x - reflectionImg.x) / reflectionImg.width;
      const normalizedY = (canvasPos.y - reflectionImg.y) / reflectionImg.height;
      tempPinLocation = { x: normalizedX, y: normalizedY };
      pinFeatureText = '';
      
      // Show pin placement UI
      showPinPlacementUI(e.clientX, e.clientY);
      requestDraw();
      return;
    }
    
    // Click outside - deselect pin (but not if clicking on control panel)
    if (!window.reflectionPanelBounds || 
        e.clientX < window.reflectionPanelBounds.x ||
        e.clientX > window.reflectionPanelBounds.x + window.reflectionPanelBounds.width ||
        e.clientY < window.reflectionPanelBounds.y ||
        e.clientY > window.reflectionPanelBounds.y + window.reflectionPanelBounds.height) {
      selectedPinId = null;
      updateControlPanelInputs();
      requestDraw();
    }
    return;
  }

  // Check if clicking on resize handle of selected image (only for single selection)
  if (selectedImageIndices.length === 1 && selectedImageIndices[0] >= 0) {
    const img = images[selectedImageIndices[0]];
    const handle = getResizeHandleAt(e.clientX, e.clientY, img);
    
    if (handle) {
      // Resize handle clicked - start resizing immediately
      isResizing = true;
      resizeHandle = handle;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      setInteracting(true); // Track interaction for dynamic DPR
      return;
    }
  }

  const imgIndex = getImageAt(e.clientX, e.clientY);
  if (imgIndex >= 0) {
    // Clicked on an image - check if it's already selected
    const isAlreadySelected = selectedImageIndices.includes(imgIndex);
    
    if (isAlreadySelected && selectedImageIndices.length === 1) {
      // Clicked on already selected image - start dragging immediately
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      setInteracting(true); // Track interaction for dynamic DPR
    } else {
      // Clicked on different image or multi-select - select it (single select)
      selectedImageIndices = [imgIndex];
      handleSelectionChange(imgIndex);
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      setInteracting(true); // Track interaction for dynamic DPR
    }
  } else {
    // Clicked on empty space - deselect all and start selection box
    selectedImageIndices = [];
    handleSelectionChange(-1);
    isSelecting = true;
    selectionBoxStartX = e.clientX;
    selectionBoxStartY = e.clientY;
    selectionBoxEndX = e.clientX;
    selectionBoxEndY = e.clientY;
    setInteracting(true); // Track interaction for dynamic DPR
  }

  requestDraw();
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

  // Track interaction state for dynamic DPR
  if (isResizing || isDragging || isSelecting) {
    setInteracting(true);
  }
  
  // Update selection box if selecting
  if (isSelecting) {
    selectionBoxEndX = e.clientX;
    selectionBoxEndY = e.clientY;
    requestDraw();
  }
  
  // No threshold check needed - dragging starts immediately when clicking on image
  if (isResizing && selectedImageIndices.length === 1 && selectedImageIndices[0] >= 0) {
    const img = images[selectedImageIndices[0]];
    // Convert viewport coordinates to canvas coordinates for proper delta calculation
    const currentCanvasPos = screenToCanvas(e.clientX, e.clientY);
    const startCanvasPos = screenToCanvas(dragStartX, dragStartY);
    const deltaX = currentCanvasPos.x - startCanvasPos.x;
    const deltaY = currentCanvasPos.y - startCanvasPos.y;

    // Calculate minimum width based on reflection button width
    const minWidth = getReflectionButtonMinWidth();
    const minHeight = 10; // Keep minimum height as fallback

    // Calculate new dimensions while maintaining aspect ratio
    let newWidth, newHeight;
    let anchorX, anchorY; // Point that stays fixed during resize

    switch (resizeHandle) {
      case 'nw': // Top-left corner - anchor is bottom-right
        anchorX = img.x + img.width;
        anchorY = img.y + img.height;
        newWidth = Math.max(minWidth, img.width - deltaX);
        newHeight = newWidth / img.aspectRatio;
        // Adjust if height would be too small
        if (newHeight < minHeight) {
          newHeight = minHeight;
          newWidth = newHeight * img.aspectRatio;
          // Ensure width still meets minimum
          if (newWidth < minWidth) {
            newWidth = minWidth;
            newHeight = newWidth / img.aspectRatio;
          }
        }
        img.width = newWidth;
        img.height = newHeight;
        img.x = anchorX - img.width;
        img.y = anchorY - img.height;
        break;
      case 'ne': // Top-right corner - anchor is bottom-left
        anchorX = img.x;
        anchorY = img.y + img.height;
        newWidth = Math.max(minWidth, img.width + deltaX);
        newHeight = newWidth / img.aspectRatio;
        if (newHeight < minHeight) {
          newHeight = minHeight;
          newWidth = newHeight * img.aspectRatio;
          if (newWidth < minWidth) {
            newWidth = minWidth;
            newHeight = newWidth / img.aspectRatio;
          }
        }
        img.width = newWidth;
        img.height = newHeight;
        img.y = anchorY - img.height;
        break;
      case 'se': // Bottom-right corner - anchor is top-left
        anchorX = img.x;
        anchorY = img.y;
        newWidth = Math.max(minWidth, img.width + deltaX);
        newHeight = newWidth / img.aspectRatio;
        if (newHeight < minHeight) {
          newHeight = minHeight;
          newWidth = newHeight * img.aspectRatio;
          if (newWidth < minWidth) {
            newWidth = minWidth;
            newHeight = newWidth / img.aspectRatio;
          }
        }
        img.width = newWidth;
        img.height = newHeight;
        break;
      case 'sw': // Bottom-left corner - anchor is top-right
        anchorX = img.x + img.width;
        anchorY = img.y;
        newWidth = Math.max(minWidth, img.width - deltaX);
        newHeight = newWidth / img.aspectRatio;
        if (newHeight < minHeight) {
          newHeight = minHeight;
          newWidth = newHeight * img.aspectRatio;
          if (newWidth < minWidth) {
            newWidth = minWidth;
            newHeight = newWidth / img.aspectRatio;
          }
        }
        img.width = newWidth;
        img.height = newHeight;
        img.x = anchorX - img.width;
        break;
    }

    dragStartX = e.clientX;
    dragStartY = e.clientY;
    requestDraw();
  } else if (isDragging && selectedImageIndices.length === 1 && selectedImageIndices[0] >= 0) {
    const img = images[selectedImageIndices[0]];
    // Convert viewport coordinates to canvas coordinates for proper delta calculation
    const currentCanvasPos = screenToCanvas(e.clientX, e.clientY);
    const startCanvasPos = screenToCanvas(dragStartX, dragStartY);
    const deltaX = currentCanvasPos.x - startCanvasPos.x;
    const deltaY = currentCanvasPos.y - startCanvasPos.y;
    
    img.x += deltaX;
    img.y += deltaY;
    
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    requestDraw();
  } else if (isPointOnReflectionButton(e.clientX, e.clientY)) {
    // Show pointer cursor when hovering over reflection button
    canvas.style.cursor = 'pointer';
  } else if (selectedImageIndices.length === 1 && selectedImageIndices[0] >= 0) {
    const img = images[selectedImageIndices[0]];
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

canvas.addEventListener('mouseup', (e) => {
  // Don't interfere with pin placement
  if (isPlacingPin && isReflectionMode) {
    // Let pin placement handle its own mouseup
    return;
  }
  
  // Finalize selection box if selecting
  if (isSelecting) {
    // Get all images that intersect with the selection box
    const selectedIndices = getImagesInSelectionBox(
      selectionBoxStartX, selectionBoxStartY,
      selectionBoxEndX, selectionBoxEndY
    );
    selectedImageIndices = selectedIndices;
    
    // Update selection (use first index for backward compatibility, or -1 if none)
    if (selectedIndices.length > 0) {
      handleSelectionChange(selectedIndices[0]);
    } else {
      handleSelectionChange(-1);
    }
    
    isSelecting = false;
  }
  
  isDragging = false;
  isResizing = false;
  resizeHandle = null;
  canvas.style.cursor = createCustomCursor();
  
  // Clear wheel timeout since mouse interactions have stopped
  if (wheelTimeout) {
    clearTimeout(wheelTimeout);
    wheelTimeout = null;
  }
  
  // Stop tracking interaction (will switch to high DPR after timeout)
  // Only call if no other interactions are active
  if (!isSelecting && !isDragging && !isResizing) {
    setInteracting(false);
  }
});

// Trackpad and mouse wheel gestures
canvas.addEventListener('wheel', (e) => {
  if (!isOverlayActive) return;
  
  // Prevent interactions during animation
  if (isAnimating) {
    e.preventDefault();
    return;
  }
  
  // In reflection mode, disable all wheel interactions (locked canvas)
  if (isReflectionMode) {
    e.preventDefault();
    return;
  }
  
  e.preventDefault();

  // macOS trackpad: Two-finger pan sends wheel events with deltaX/deltaY
  // Pinch zoom sends wheel events with ctrlKey/metaKey + deltaY
  // Regular mouse wheel: just deltaY

  // Track interaction for dynamic DPR
  setInteracting(true);
  
  // Clear any existing wheel timeout
  if (wheelTimeout) {
    clearTimeout(wheelTimeout);
    wheelTimeout = null;
  }
  
  // Set timeout to detect when wheel events stop
  wheelTimeout = setTimeout(() => {
    // Check if no mouse interactions are active (panning, dragging, resizing)
    if (!isPanning && !isDragging && !isResizing) {
      setInteracting(false);
    }
    wheelTimeout = null;
  }, INTERACTION_TIMEOUT);
  
  // Check if this is a pinch zoom (Ctrl/Meta key pressed on macOS trackpad)
  if (e.ctrlKey || e.metaKey) {
    // PINCH ZOOM - fast/responsive zoom
    const zoomSpeed = 0.02; // Fast zoom speed (faster than previous 0.01)
    const zoomFactor = 1 - (e.deltaY * zoomSpeed);
    const newScale = Math.max(0.1, Math.min(5, canvasScale * zoomFactor)); // 0.1x to 5x limits (allow zooming out further)
    
    if (Math.abs(newScale - canvasScale) < 0.001) return;

    // Get mouse position in viewport coordinates (CSS pixels)
    const mouseViewportX = e.clientX;
    const mouseViewportY = e.clientY;
    
    // Convert viewport coordinates to canvas coordinates before zoom
    // This gives us the canvas point that's currently under the mouse
    const canvasPoint = screenToCanvas(mouseViewportX, mouseViewportY);
    
    // Canvas is at (0,0) since it's fullscreen, so mouse position is already canvas-relative
    const mouseCanvasX = mouseViewportX; // Canvas-relative X in CSS pixels
    const mouseCanvasY = mouseViewportY; // Canvas-relative Y in CSS pixels
    
    // Apply new scale
    canvasScale = newScale;
    
    // Calculate new translation so the same canvas point stays under the mouse
    // The transform is: mouseCanvasX = canvasPoint.x * canvasScale + canvasTranslateX
    // So: canvasTranslateX = mouseCanvasX - canvasPoint.x * canvasScale
    // All values are in CSS pixels
    canvasTranslateX = mouseCanvasX - canvasPoint.x * canvasScale;
    canvasTranslateY = mouseCanvasY - canvasPoint.y * canvasScale;
    
    // Use requestDraw for smooth zooming (batched with other redraws)
    requestDraw();
  } else if (e.deltaX !== 0 || e.deltaY !== 0) {
    // TWO-FINGER PAN (inverted direction - pan opposite to finger movement)
    // On trackpad, two-finger pan sends deltaX and deltaY
    // On mouse wheel, we only get deltaY, so we can use that for panning too
    
    // Inverted direction: pan opposite to finger movement
    if (Math.abs(e.deltaX) > 0.1 || Math.abs(e.deltaY) > 0.1) {
      canvasTranslateX -= e.deltaX; // Inverted direction
      canvasTranslateY -= e.deltaY; // Inverted direction
      // Use requestDraw for smooth panning (batched with other redraws)
      requestDraw();
    }
  }
});

// IPC Listeners
ipcRenderer.on('toggle-screenshot', () => {
  startScreenshotMode();
});

ipcRenderer.on('open-canvas', () => {
  // Hide action buttons and uncollect circles
  hideActionButtons();
  // Open overlay (toggleOverlay handles click-through)
  if (!isOverlayActive) {
    toggleOverlay();
  }
});

// Generate camera cursor data URL
function createCameraCursor() {
  try {
    const size = 24; // Cursor size (reduced from 32 for better compatibility)
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas with transparent background
    ctx.clearRect(0, 0, size, size);
    
    // Set up drawing style for blue camera icon
    ctx.strokeStyle = '#3b82f6'; // Same blue as selection box
    ctx.fillStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Scale to fit the icon (Lucide icons are 24x24, scale to fit in cursor)
    const scale = size / 24;
    const offsetX = size / 2 - 12 * scale;
    const offsetY = size / 2 - 12 * scale;
    
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    
    // Draw each element from the Camera icon
    if (Camera && Array.isArray(Camera)) {
      Camera.forEach((element) => {
        const [type, attrs] = element;
        
        if (type === 'path') {
          // Draw SVG path
          const path = new Path2D(attrs.d);
          // Check if path should be filled (has fill attribute and it's not 'none')
          if (attrs.fill && attrs.fill !== 'none' && attrs.fill !== 'transparent') {
            ctx.fill(path);
          }
          // Check if path should be stroked (has stroke attribute or no fill)
          if (!attrs.fill || attrs.fill === 'none' || attrs.stroke !== 'none') {
            ctx.stroke(path);
          }
        } else if (type === 'rect') {
          // Draw rectangle
          ctx.beginPath();
          ctx.rect(
            attrs.x || 0,
            attrs.y || 0,
            attrs.width || 0,
            attrs.height || 0
          );
          ctx.stroke();
        } else if (type === 'circle') {
          // Draw circle
          ctx.beginPath();
          ctx.arc(
            attrs.cx || 0,
            attrs.cy || 0,
            attrs.r || 0,
            0,
            Math.PI * 2
          );
          ctx.stroke();
        }
      });
    }
    
    ctx.restore();
    
    // Return data URL for cursor
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error creating camera cursor:', error);
    // Fallback to crosshair if cursor generation fails
    return 'crosshair';
  }
}

// Inject CSS style for camera cursor
let cameraCursorStyleElement = null;
function injectCameraCursorStyle(cursorURL) {
  // Remove existing style if any
  if (cameraCursorStyleElement) {
    cameraCursorStyleElement.remove();
  }
  
  // Create and inject style tag
  cameraCursorStyleElement = document.createElement('style');
  cameraCursorStyleElement.id = 'camera-cursor-style';
  const cursorValue = `url(${cursorURL}) 12 12, crosshair`;
  cameraCursorStyleElement.textContent = `
    #screenshot-overlay.active {
      cursor: ${cursorValue} !important;
    }
    body.screenshot-mode {
      cursor: ${cursorValue} !important;
    }
    body.screenshot-mode * {
      cursor: ${cursorValue} !important;
    }
  `;
  document.head.appendChild(cameraCursorStyleElement);
}

// Apply camera cursor (helper function to maintain cursor)
function applyCameraCursor() {
  if (isScreenshotMode && cameraCursorURL && cameraCursorURL !== 'crosshair') {
    const cursorValue = `url(${cameraCursorURL}) 12 12, crosshair`;
    screenshotOverlay.style.setProperty('cursor', cursorValue, 'important');
    document.body.style.setProperty('cursor', cursorValue, 'important');
    // Also apply to html element to ensure it's visible
    document.documentElement.style.setProperty('cursor', cursorValue, 'important');
  }
}

// Continuously maintain camera cursor when in screenshot mode
let cursorMaintenanceInterval = null;
function startCursorMaintenance() {
  if (cursorMaintenanceInterval) {
    clearInterval(cursorMaintenanceInterval);
  }
  cursorMaintenanceInterval = setInterval(() => {
    if (isScreenshotMode) {
      applyCameraCursor();
    } else {
      stopCursorMaintenance();
    }
  }, 50); // Reapply every 50ms to ensure it stays
}

function stopCursorMaintenance() {
  if (cursorMaintenanceInterval) {
    clearInterval(cursorMaintenanceInterval);
    cursorMaintenanceInterval = null;
  }
}

// End screenshot mode
function endScreenshotMode() {
  screenshotOverlay.classList.remove('active');
  document.body.classList.remove('screenshot-mode');
  isScreenshotMode = false;
  isExitingScreenshotMode = true; // Start transition state
  screenshotOutlineFadeStartTime = 0; // Reset fade start time
  // Stop cursor maintenance
  stopCursorMaintenance();
  
  // Remove injected CSS style
  if (cameraCursorStyleElement) {
    cameraCursorStyleElement.remove();
    cameraCursorStyleElement = null;
  }
  
  // Reset cursor to default
  screenshotOverlay.style.setProperty('cursor', 'crosshair', 'important');
  document.body.style.setProperty('cursor', 'default', 'important');
  document.documentElement.style.setProperty('cursor', 'default', 'important');
  cameraCursorURL = null; // Clear camera cursor
  
  // Uncollect circles when screenshot mode ends
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
  if (!isOverlayActive) {
    if (!isMouseOverUI(lastMouseX, lastMouseY)) {
      ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
    }
  }
}

// Screenshot mode
function startScreenshotMode() {
  isScreenshotMode = true;
  screenshotOverlay.classList.add('active');
  // Add camera cursor class immediately - this uses CSS which is more reliable
  screenshotOverlay.classList.add('camera-cursor');
  document.body.classList.add('screenshot-mode');
  ipcRenderer.send('set-ignore-mouse-events', false);
  
  // Collect circles when screenshot mode starts (show X icon with all circles on top of each other)
  if (!isCirclesCollected) {
    isCirclesCollected = true;
    screenshotOutlineFadeStartTime = 0; // Reset fade start time
    // Start rotation animation to X icon
    startIconRotation = currentIconRotation;
    iconRotationStartTime = Date.now();
    targetIconRotation = 0; // X icon when collected
    // Store current circle positions as starting point for animation
    collectedStartPositions = circles.map(circle => ({ x: circle.x, y: circle.y }));
    // Store actual center as target position (use logical coordinates)
    const centerX = CIRCLE_BUTTON_DISPLAY_SIZE / 2;
    const centerY = CIRCLE_BUTTON_DISPLAY_SIZE / 2;
    convergedCenterX = centerX;
    convergedCenterY = centerY;
    // Initialize mouse tracking for sticky behavior
    targetMouseX = centerX;
    targetMouseY = centerY;
    // Animate to collected state
    hoverAnimationStartTime = Date.now();
    hoverAnimationProgress = 0; // Start from 0 to animate to 1
  } else if (hoverAnimationProgress >= 1.0) {
    // If circles are already collected and converged, start outline fade immediately
    screenshotOutlineFadeStartTime = Date.now();
  }
  
  // Reset selection box to ensure it's hidden when starting a new screenshot
  selectionBox.style.display = 'none';
  selectionBox.style.width = '0px';
  selectionBox.style.height = '0px';
  
  // Generate camera cursor once and store it globally
  cameraCursorURL = createCameraCursor();
  
  // Inject CSS style with the cursor URL and apply classes
  if (cameraCursorURL && cameraCursorURL !== 'crosshair') {
    injectCameraCursorStyle(cameraCursorURL);
  }
  
  // Also apply inline as fallback
  applyCameraCursor();
  
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
    
    // Camera cursor is already applied, keep it while selecting
    applyCameraCursor();
    
    // Start capturing background immediately when dragging starts
    backgroundCapturePromise = captureBackground();
  };

  const handleMouseMove = (e) => {
    // Always maintain camera cursor when in screenshot mode
    applyCameraCursor();
    
    if (isSelecting) {
      const width = Math.abs(e.clientX - startX);
      const height = Math.abs(e.clientY - startY);
      const left = Math.min(e.clientX, startX);
      const top = Math.min(e.clientY, startY);
      
      selectionBox.style.left = left + 'px';
      selectionBox.style.top = top + 'px';
      selectionBox.style.width = width + 'px';
      selectionBox.style.height = height + 'px';
    }
  };

  const handleMouseUp = async (e) => {
    if (!isSelecting) return;
    isSelecting = false;
    
    // Keep camera cursor after selection ends (screenshot mode is still active)
    applyCameraCursor();
    
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
      // Keep selection box visible - it will be hidden after image is on canvas
      await captureScreenshot(rect);
    } else {
      // If selection was too small, hide selection box and end screenshot mode
      selectionBox.style.display = 'none';
      selectionBox.style.width = '0px';
      selectionBox.style.height = '0px';
      
      endScreenshotMode();
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
        // Take screenshot immediately - no delays
        // Keep selection box visible during transition, it will be hidden after image is on canvas
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
        
        // Callback to hide selection box after image is on canvas
        const onImageAdded = () => {
          // Hide selection box now that image is visible on canvas
          selectionBox.style.display = 'none';
          selectionBox.style.width = '0px';
          selectionBox.style.height = '0px';
        };
        
        // Pass the screenshot position to addImageToCanvas
        // Pass the full rect so the image appears at the exact position and size of the selection box
        // Pass callback to hide selection box after image is drawn
        addImageToCanvas(dataURL, rect.left, rect.top, rect.width, rect.height, onImageAdded);
        
        // End screenshot mode and clean up event listeners
        endScreenshotMode();
        
        // Remove event listeners
        if (screenshotHandlers) {
          screenshotOverlay.removeEventListener('mousedown', screenshotHandlers.mousedown);
          screenshotOverlay.removeEventListener('mousemove', screenshotHandlers.mousemove);
          screenshotOverlay.removeEventListener('mouseup', screenshotHandlers.mouseup);
          screenshotHandlers = null;
        }
        
        if (!isOverlayActive) {
          // Set flag to indicate we're opening from a screenshot
          isOpeningFromScreenshot = true;
          toggleOverlay();
        }
        
        resolve();
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
function addImageToCanvas(dataURL, screenX = null, screenY = null, screenWidth = null, screenHeight = null, onImageAdded = null) {
  const img = new Image();
  img.onload = () => {
    let scaledWidth = img.width;
    let scaledHeight = img.height;
    let intendedX, intendedY;
    
    // Check if this is a screenshot with full rect information
    const isScreenshotWithRect = screenX !== null && screenY !== null && screenWidth !== null && screenHeight !== null;
    
    if (isScreenshotWithRect) {
      // For screenshots, position and size the image to match the selection box exactly
      // The image should appear at the exact position and size where it was captured
      // We'll place the image at canvas position (0, 0) and then position the canvas
      // so it appears at the screen position where the selection box was
      
      // Calculate scale to match the selection box size
      // screenWidth and screenHeight are the selection box dimensions in screen coordinates
      // The image will be sized to match these dimensions
      scaledWidth = screenWidth;
      scaledHeight = screenHeight;
      
      // Position image at canvas origin (0, 0) - we'll position the canvas transform
      // so this appears at the screen position where the selection box was
      intendedX = 0;
      intendedY = 0;
    } else if (screenX !== null && screenY !== null) {
      // Legacy: center-based positioning (for backwards compatibility)
      // Scale image to a reasonable size (fit to 70% of viewport, max 2000px)
      const cssDims = getCanvasCSSDimensions();
      const maxWidth = Math.min(cssDims.width * 0.7, 2000);
      const maxHeight = Math.min(cssDims.height * 0.7, 2000);
      
      // Scale down if image is too large
      if (scaledWidth > maxWidth || scaledHeight > maxHeight) {
        const scaleX = maxWidth / scaledWidth;
        const scaleY = maxHeight / scaledHeight;
        const scale = Math.min(scaleX, scaleY);
        scaledWidth = scaledWidth * scale;
        scaledHeight = scaledHeight * scale;
      }
      
      // Convert screen coordinates to canvas coordinates
      // This places the image at the same position in the viewport where it was captured
      const canvasPos = screenToCanvas(screenX, screenY);
      intendedX = canvasPos.x - scaledWidth / 2;
      intendedY = canvasPos.y - scaledHeight / 2;
    } else {
      // Fallback: Calculate center position of visible canvas area (for uploaded images)
      // Scale image to a reasonable size (fit to 70% of viewport, max 2000px)
      const cssDims = getCanvasCSSDimensions();
      const maxWidth = Math.min(cssDims.width * 0.7, 2000);
      const maxHeight = Math.min(cssDims.height * 0.7, 2000);
      
      // Scale down if image is too large
      if (scaledWidth > maxWidth || scaledHeight > maxHeight) {
        const scaleX = maxWidth / scaledWidth;
        const scaleY = maxHeight / scaledHeight;
        const scale = Math.min(scaleX, scaleY);
        scaledWidth = scaledWidth * scale;
        scaledHeight = scaledHeight * scale;
      }
      
      // Use CSS pixel dimensions for coordinate calculations
      const visibleCenterX = -canvasTranslateX / canvasScale + (cssDims.width / canvasScale) / 2;
      const visibleCenterY = -canvasTranslateY / canvasScale + (cssDims.height / canvasScale) / 2;
      intendedX = visibleCenterX - scaledWidth / 2;
      intendedY = visibleCenterY - scaledHeight / 2;
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
      position = findNonOverlappingPosition(intendedX, intendedY, scaledWidth, scaledHeight);
    }
    
    const imageObj = {
      element: img,
      x: position.x,
      y: position.y,
      width: scaledWidth,
      height: scaledHeight,
      aspectRatio: img.width / img.height, // Store original aspect ratio (from native image)
      finalPosition: null, // Will store final position after reflection mode (for overlap avoidance)
      id: generateId(), // Unique identifier for the image
      version: 1, // Version number (starts at 1)
      pins: [] // Array of pin objects
    };
    
    // Calculate final position (for after reflection mode) if this is a screenshot
    if (useIntendedPositionForScreenshot) {
      const finalPos = findNonOverlappingPosition(intendedX, intendedY, scaledWidth, scaledHeight);
      imageObj.finalPosition = finalPos;
    }
    
    images.push(imageObj);
    selectedImageIndices = [images.length - 1];
    handleSelectionChange(selectedImageIndices[0]);
    
    // For screenshots, hide all other images for smooth transition to reflection mode
    if (screenX !== null && screenY !== null) {
      // Hide all other images and set opacity to 0 immediately
      images.forEach((img, index) => {
        if (!selectedImageIndices.includes(index)) {
          img.hidden = true;
          img.opacity = 0.0; // Immediately invisible
          img.fadeStartTime = undefined; // No fade animation
        }
      });
    }
    
    // For screenshots, position canvas so image appears at the screen position where it was captured
    // Then animate directly to reflection mode
    if (screenX !== null && screenY !== null) {
      if (isScreenshotWithRect) {
        // Position canvas so the image appears at the exact position and size of the selection box
        // The image is positioned at canvas (0, 0) and we want it to appear at (screenX, screenY)
        // screenX = imageObj.x * scale + translateX
        // Since imageObj.x = 0, we have: translateX = screenX
        const initialScale = 1.0;
        canvasScale = initialScale;
        canvasTranslateX = screenX;
        canvasTranslateY = screenY;
      } else {
        // Legacy: center-based positioning
        // Position canvas so the image center appears at the screen position where screenshot was taken
        const initialScale = 1.0;
        const imageCenterX = imageObj.x + imageObj.width / 2;
        const imageCenterY = imageObj.y + imageObj.height / 2;
        
        // Calculate translate to position image center at screen position
        // screenX = imageCenterX * scale + translateX
        // So: translateX = screenX - imageCenterX * scale
        canvasScale = initialScale;
        canvasTranslateX = screenX - imageCenterX * initialScale;
        canvasTranslateY = screenY - imageCenterY * initialScale;
      }
      
      // Set flag to prevent toolbar from showing during transition to reflection mode
      isTransitioningToReflectionMode = true;
      updateToolbarVisibility(); // Hide toolbar immediately
      
      draw();
      
      // Call callback to hide selection box now that image is visible on canvas
      if (onImageAdded) {
        onImageAdded();
      }
      
      // Automatically enter reflection mode after screenshot is added
      // Small delay to ensure image is fully rendered, then animate to reflection mode
      setTimeout(() => {
        if (selectedImageIndices.length === 1 && selectedImageIndices[0] >= 0 && selectedImageIndices[0] < images.length && !isReflectionMode) {
          enterReflectionMode(true); // Pass true to indicate it's from a screenshot
        } else {
          // If reflection mode entry failed, clear the transition flag
          isTransitioningToReflectionMode = false;
          updateToolbarVisibility(); // Update toolbar visibility in case it should be shown
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

// Settings modal can be opened via action button (action-settings-button)

// Close modal function
function closeSettingsModal() {
  settingsModalOverlay.classList.remove('visible');
  // Re-enable click-through if overlay is not active
  if (!isOverlayActive && !isScreenshotMode) {
    if (!isMouseOverUI(lastMouseX, lastMouseY)) {
      ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
    }
  }
}

// Close modal when clicking on overlay (but not on modal content)
settingsModalOverlay.addEventListener('click', (e) => {
  if (e.target === settingsModalOverlay) {
    closeSettingsModal();
  }
});

// Close button handler
if (settingsModalClose) {
  settingsModalClose.addEventListener('click', (e) => {
    e.stopPropagation();
    closeSettingsModal();
  });
}

// Tab switching functionality
if (settingsTabs && settingsTabs.length > 0) {
  settingsTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      
      // Remove active class from all tabs and panes
      settingsTabs.forEach(t => t.classList.remove('active'));
      if (settingsTabPanes && settingsTabPanes.length > 0) {
        settingsTabPanes.forEach(p => p.classList.remove('active'));
      }
      
      // Add active class to clicked tab and corresponding pane
      tab.classList.add('active');
      const targetPane = document.getElementById(`${targetTab}-tab`);
      if (targetPane) {
        targetPane.classList.add('active');
      }
    });
  });
}

// Prevent clicks inside modal from closing it
settingsModal.addEventListener('click', (e) => {
  e.stopPropagation();
});

// Toggle developer console button
if (openDevToolsButton) {
  openDevToolsButton.addEventListener('click', () => {
    // In Electron, toggle dev tools using remote or IPC
    try {
      const { remote } = require('electron');
      if (remote && remote.getCurrentWindow) {
        const win = remote.getCurrentWindow();
        if (win.webContents.isDevToolsOpened()) {
          win.webContents.closeDevTools();
        } else {
          // Open as detached (separate floating window)
          win.webContents.openDevTools({ mode: 'detach' });
        }
      } else {
        // Fallback: use IPC
        ipcRenderer.send('toggle-dev-tools');
      }
    } catch (error) {
      // If remote is not available, try IPC
      ipcRenderer.send('toggle-dev-tools');
    }
  });
}

// FPS counter visibility toggle
function updateFpsCounterVisibility() {
  if (fpsCounter) {
    if (fpsCounterVisible) {
      fpsCounter.classList.add('visible');
    } else {
      fpsCounter.classList.remove('visible');
    }
  }
}

// Initialize FPS counter as visible by default
if (fpsCounter) {
  fpsCounter.classList.add('visible');
}

// FPS counter toggle handler
if (fpsCounterToggle) {
  fpsCounterToggle.addEventListener('change', (e) => {
    fpsCounterVisible = e.target.checked;
    updateFpsCounterVisibility();
  });
}

// Helper function to hide buttons and uncollect circles
function hideActionButtons() {
  // Remove visible class to trigger fold animation (in reverse order)
  actionSettingsButton.classList.remove('visible');
  
  setTimeout(() => {
    actionOpenCanvasButton.classList.remove('visible');
  }, 50);
  
  setTimeout(() => {
    actionCaptureArtefactButton.classList.remove('visible');
  }, 100);
  
  // Wait for animation to complete before hiding
  setTimeout(() => {
    if (!actionSettingsButton.classList.contains('visible')) {
      actionSettingsButton.style.display = 'none';
      actionOpenCanvasButton.style.display = 'none';
      actionCaptureArtefactButton.style.display = 'none';
      // Reset bottom positions for next time
      actionSettingsButton.style.bottom = '';
      actionOpenCanvasButton.style.bottom = '';
      actionCaptureArtefactButton.style.bottom = '';
      
      // After animation completes, ensure circles stay converged if mouse is still hovering
      // This prevents the jump that occurs when animation finishes
      if (isCircleButtonHovered && hoverAnimationProgress < 1) {
        // Mouse is still hovering, ensure circles stay converged
        hoverAnimationProgress = 1;
        hoverAnimationStartTime = Date.now();
      }
    }
  }, 400); // Match animation duration
  
  if (isCirclesCollected) {
    isCirclesCollected = false;
    // Start rotation animation back to plus
    startIconRotation = currentIconRotation;
    iconRotationStartTime = Date.now();
    targetIconRotation = Math.PI / 4; // Plus icon when not collected
    
    // If mouse is hovering, keep circles converged (don't spread)
    // This ensures circles stay collected when mouse is still over the button
    if (isCircleButtonHovered) {
      // If already converged, keep it at 1 to prevent jumping
      // Otherwise, ensure it animates to converged state
      if (hoverAnimationProgress >= 0.5) {
        // Already mostly converged, keep it converged
        hoverAnimationProgress = 1;
        hoverAnimationStartTime = Date.now();
      } else {
        // Not converged yet, animate to converged
        hoverAnimationStartTime = Date.now();
        hoverAnimationProgress = 0; // Start from 0 to animate to 1 (converge)
      }
    } else {
      // Animate back to moving state (spread apart) only if not hovering
      hoverAnimationStartTime = Date.now();
      hoverAnimationProgress = 1; // Start from 1 to animate to 0
    }
  }
}

// Action button handlers
actionSettingsButton.addEventListener('click', (e) => {
  e.stopPropagation();
  // Hide action buttons and uncollect circles
  hideActionButtons();
  // Open settings modal (same as clicking settings button)
  settingsModalOverlay.classList.add('visible');
  ipcRenderer.send('set-ignore-mouse-events', false);
});

// FPS counter settings icon handler
if (fpsCounterSettingsIcon) {
  fpsCounterSettingsIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    // Open settings modal
    settingsModalOverlay.classList.add('visible');
    ipcRenderer.send('set-ignore-mouse-events', false);
  });
}

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
    // Mark background cache as dirty (needs update)
    backgroundCacheDirty = true;
    // Redraw if overlay is active
    if (isOverlayActive) {
      requestDraw();
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
  // Mark background cache as dirty (needs update)
  backgroundCacheDirty = true;
  // Redraw if overlay is active
  if (isOverlayActive) {
    requestDraw();
  }
});

// Handle saturation slider
saturationSlider.addEventListener('input', (e) => {
  const saturationPercent = parseInt(e.target.value);
  backgroundSaturation = saturationPercent;
  saturationValue.textContent = saturationPercent + '%';
  // Mark background cache as dirty (needs update)
  backgroundCacheDirty = true;
  // Redraw if overlay is active
  if (isOverlayActive) {
    requestDraw();
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

// Handle circuit blend mode select
circuitBlendModeSelect.addEventListener('change', (e) => {
  circuitBlendMode = e.target.value;
  // The blend mode will be applied in the next drawCircles call
});

// Handle circle color inputs (hex code text inputs)
function updateCircleColor(index, hexValue) {
  if (circles.length > index) {
    // Validate hex color format
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexPattern.test(hexValue)) {
      // Normalize 3-digit hex to 6-digit
      if (hexValue.length === 4) {
        hexValue = '#' + hexValue[1] + hexValue[1] + hexValue[2] + hexValue[2] + hexValue[3] + hexValue[3];
      }
      circles[index].color = hexValue;
    }
  }
}

circle1ColorInput.addEventListener('input', (e) => {
  updateCircleColor(0, e.target.value);
});

circle1ColorInput.addEventListener('blur', (e) => {
  updateCircleColor(0, e.target.value);
  // Update input to show normalized value
  if (circles.length > 0 && circles[0].color) {
    e.target.value = circles[0].color;
  }
});

circle2ColorInput.addEventListener('input', (e) => {
  updateCircleColor(1, e.target.value);
});

circle2ColorInput.addEventListener('blur', (e) => {
  updateCircleColor(1, e.target.value);
  if (circles.length > 1 && circles[1].color) {
    e.target.value = circles[1].color;
  }
});

circle3ColorInput.addEventListener('input', (e) => {
  updateCircleColor(2, e.target.value);
});

circle3ColorInput.addEventListener('blur', (e) => {
  updateCircleColor(2, e.target.value);
  if (circles.length > 2 && circles[2].color) {
    e.target.value = circles[2].color;
  }
});

// Handle DPR mode selection
if (dprModeSelect) {
  dprModeSelect.addEventListener('change', (e) => {
    const newMode = e.target.value;
    dprMode = newMode;
    
    // If switching to a fixed DPR mode, set it immediately
    if (newMode === '1') {
      currentEffectiveDPR = 1.0;
    } else if (newMode === '1.5') {
      currentEffectiveDPR = 1.5;
    } else if (newMode === '2') {
      currentEffectiveDPR = 2.0;
    } else if (newMode === 'dynamic') {
      // Reset to static DPR when switching to dynamic mode
      currentEffectiveDPR = STATIC_DPR;
      // Clear any interaction state
      isInteracting = false;
      if (interactionTimeout) {
        clearTimeout(interactionTimeout);
        interactionTimeout = null;
      }
    }
    
    // Update DPR display
    if (fpsCounterDpr) {
      const currentDPR = getDevicePixelRatio();
      fpsCounterDpr.textContent = `DPR: ${currentDPR.toFixed(2)}`;
    }
    
    // Reinitialize canvas with new DPR
    canvasNeedsReinit = true;
    if (isOverlayActive) {
      requestDraw();
    }
  });
}

// Handle keyboard icon scaling for Command and Option keys
let isMetaKeyPressed = false;
let isAltKeyPressed = false;

function updateKeyIcons() {
  const metaIcons = document.querySelectorAll('.key-icon[data-key="meta"]');
  const altIcons = document.querySelectorAll('.key-icon[data-key="alt"]');
  
  metaIcons.forEach(icon => {
    if (isMetaKeyPressed) {
      icon.classList.add('pressed');
    } else {
      icon.classList.remove('pressed');
    }
  });
  
  altIcons.forEach(icon => {
    if (isAltKeyPressed) {
      icon.classList.add('pressed');
    } else {
      icon.classList.remove('pressed');
    }
  });
}

window.addEventListener('keydown', (e) => {
  if (e.metaKey && !isMetaKeyPressed) {
    isMetaKeyPressed = true;
    updateKeyIcons();
  }
  if (e.altKey && !isAltKeyPressed) {
    isAltKeyPressed = true;
    updateKeyIcons();
  }
});

window.addEventListener('keyup', (e) => {
  if (!e.metaKey && isMetaKeyPressed) {
    isMetaKeyPressed = false;
    updateKeyIcons();
  }
  if (!e.altKey && isAltKeyPressed) {
    isAltKeyPressed = false;
    updateKeyIcons();
  }
});

// Also handle when window loses focus to reset key states
window.addEventListener('blur', () => {
  isMetaKeyPressed = false;
  isAltKeyPressed = false;
  updateKeyIcons();
});

// Close settings modal and action buttons when clicking outside
document.addEventListener('click', (e) => {
  if (settingsModalOverlay.classList.contains('visible')) {
    if (!settingsModal.contains(e.target) && e.target !== settingsModalOverlay) {
      settingsModalOverlay.classList.remove('visible');
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
const CIRCLE_BUTTON_DISPLAY_SIZE = 120; // Display size in logical pixels
let circleButtonCtx = null;
let circles = [];
let isCircleButtonHovered = false;
let isCircleButtonPressed = false; // Track if mouse button is pressed down on circle button
let circleAnimationFrameId = null;
let animationTime = 0;
let lastFrameTime = Date.now();
let circleSpeedMultiplier = 0.72; // Default speed (72% of base speed)
let circuitBlendMode = 'lighter'; // Default blend mode for circuits (additive)
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
let screenshotOutlineFadeStartTime = 0; // When to start fading in the outline in screenshot mode

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
  
  // Setup high-DPI canvas (120x120 display size)
  circleButtonCtx = setupHighDPICanvas(circleButtonCanvas, CIRCLE_BUTTON_DISPLAY_SIZE, CIRCLE_BUTTON_DISPLAY_SIZE);
  
  // Get the logical (scaled) dimensions for calculations
  const centerX = CIRCLE_BUTTON_DISPLAY_SIZE / 2;
  const centerY = CIRCLE_BUTTON_DISPLAY_SIZE / 2;
  
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
    color: '#FFFFFF', // Default white color
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
    color: '#FFFFFF', // Default white color
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
    color: '#FFFFFF', // Default white color
  });
  
  // Initialize color inputs with circle colors
  if (circles.length > 0 && circle1ColorInput) {
    circle1ColorInput.value = circles[0].color || '#FFFFFF';
  }
  if (circles.length > 1 && circle2ColorInput) {
    circle2ColorInput.value = circles[1].color || '#FFFFFF';
  }
  if (circles.length > 2 && circle3ColorInput) {
    circle3ColorInput.value = circles[2].color || '#FFFFFF';
  }
  
  // Start animation
  drawCircles();
  
  // Check background color periodically (less frequently to avoid rapid changes)
  checkBackgroundColor(); // Initial check
  backgroundCheckInterval = setInterval(checkBackgroundColor, 5000); // Check every 5 seconds
  
  // Event handlers
  circleButton.addEventListener('mouseenter', () => {
    isCircleButtonHovered = true;
    hoverAnimationStartTime = Date.now();
    // Set pointer cursor on button elements, but maintain camera cursor on body in screenshot mode
    circleButton.style.cursor = 'pointer';
    circleButtonCanvas.style.cursor = 'pointer';
    if (isScreenshotMode) {
      applyCameraCursor(); // Maintain camera cursor in screenshot mode
    } else {
      document.body.style.cursor = 'pointer';
    }
    // Store current pattern positions for smooth return animation
    storedPatternPositions = circles.map(circle => ({ x: circle.x, y: circle.y }));
    if (!isOverlayActive && !isScreenshotMode) {
      ipcRenderer.send('set-ignore-mouse-events', false);
    }
  });
  
  circleButton.addEventListener('mouseleave', () => {
    isCircleButtonHovered = false;
    
    // Reset cursor when leaving button (restore camera cursor for screenshot mode, or custom cursor for overlay)
    if (isScreenshotMode) {
      applyCameraCursor(); // Restore camera cursor in screenshot mode
    } else if (isOverlayActive) {
      document.body.style.cursor = createCustomCursor();
    } else {
      document.body.style.cursor = 'default';
    }
    
    // Only animate away if not collected (toggled) and not pressed
    // Keep circles collected when button is pressed, even if mouse leaves
    if (!isCirclesCollected && !isCircleButtonPressed) {
      hoverAnimationStartTime = Date.now();
      // Store the converged center position where all circles are currently
      // This will be the starting point for the spread-apart animation
      if (circles.length > 0) {
        convergedCenterX = circles[0].x; // All circles should be at same position when converged
        convergedCenterY = circles[0].y;
      } else {
        convergedCenterX = CIRCLE_BUTTON_DISPLAY_SIZE / 2;
        convergedCenterY = CIRCLE_BUTTON_DISPLAY_SIZE / 2;
      }
      // Reset mouse follow target to center when leaving
      targetMouseX = CIRCLE_BUTTON_DISPLAY_SIZE / 2;
      targetMouseY = CIRCLE_BUTTON_DISPLAY_SIZE / 2;
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
    // Ensure pointer cursor is set on button elements, but maintain camera cursor on body in screenshot mode
    circleButton.style.cursor = 'pointer';
    circleButtonCanvas.style.cursor = 'pointer';
    if (isScreenshotMode) {
      applyCameraCursor(); // Maintain camera cursor in screenshot mode
    } else {
      document.body.style.cursor = 'pointer';
    }
  });
  
  // Track mouse button press to keep circles collected during click
  circleButton.addEventListener('mousedown', (e) => {
    isCircleButtonPressed = true;
    // When button is pressed, ensure circles stay collected if they're already collected
    // or if hovering, trigger collection animation
    if (!isCirclesCollected && isCircleButtonHovered) {
      // Start collection animation
      isCirclesCollected = true;
      hoverAnimationStartTime = Date.now();
      collectedStartPositions = circles.map(circle => ({ x: circle.x, y: circle.y }));
      // Use logical coordinates for center position
      const centerX = CIRCLE_BUTTON_DISPLAY_SIZE / 2;
      const centerY = CIRCLE_BUTTON_DISPLAY_SIZE / 2;
      convergedCenterX = centerX;
      convergedCenterY = centerY;
      startIconRotation = currentIconRotation;
      iconRotationStartTime = Date.now();
      targetIconRotation = 0; // X icon when collected
    }
  });
  
  // Track mouse button release
  circleButton.addEventListener('mouseup', (e) => {
    isCircleButtonPressed = false;
  });
  
  // Also handle mouseup outside the button (in case user drags outside)
  document.addEventListener('mouseup', (e) => {
    if (!circleButton.contains(e.target)) {
      isCircleButtonPressed = false;
    }
  });
  
  circleButton.addEventListener('click', (e) => {
    // If overlay is active, close it when clicking the X icon
    if (isOverlayActive && isCirclesCollected) {
      toggleOverlay();
      return;
    }
    // If screenshot mode is active, close it when clicking the X icon
    if (isScreenshotMode && isCirclesCollected) {
      endScreenshotMode();
      return;
    }
    // Otherwise, toggle action buttons visibility
    toggleActionButtons();
  });
}

// Update circle positions based on patterns
// Completely rewritten for consistent speed and smooth movement
function updateCirclePositions() {
  const currentTime = Date.now();
  let deltaTime = (currentTime - lastFrameTime) / 1000; // Convert to seconds
  lastFrameTime = currentTime;
  
  // Clamp deltaTime to prevent large jumps (e.g., when tab becomes active after being inactive)
  // Max 1/30 second (30 FPS minimum) to ensure smooth, constant speed
  deltaTime = Math.min(deltaTime, 1 / 30);
  
  animationTime += deltaTime;
  
  const centerX = CIRCLE_BUTTON_DISPLAY_SIZE / 2;
  const centerY = CIRCLE_BUTTON_DISPLAY_SIZE / 2;
  const wanderRadius = 30; // Reduced to ensure all patterns stay well within bounds
  
  // Update hover animation progress
  // Keep circles collected if button is pressed, even if hover state changes
  const shouldKeepCollected = isCirclesCollected || isCircleButtonPressed;
  
  if (shouldKeepCollected) {
    // When collected (toggled) or pressed, animate to fully converged
    const previousProgress = hoverAnimationProgress;
    if (hoverAnimationProgress < 1) {
      const elapsed = currentTime - hoverAnimationStartTime;
      hoverAnimationProgress = Math.min(1, elapsed / hoverAnimationDuration);
      // Track when circles become fully converged in screenshot mode (just reached 1.0)
      if (isScreenshotMode && hoverAnimationProgress >= 1.0 && previousProgress < 1.0) {
        screenshotOutlineFadeStartTime = currentTime;
      }
    } else {
      hoverAnimationProgress = 1; // Keep at 1 when collected or pressed
      // Ensure fade start time is set if we're already converged and in screenshot mode
      if (isScreenshotMode && screenshotOutlineFadeStartTime === 0) {
        screenshotOutlineFadeStartTime = currentTime;
      }
    }
  } else if (isCircleButtonHovered && hoverAnimationProgress < 1) {
    // Normal hover: converge
    const elapsed = currentTime - hoverAnimationStartTime;
    hoverAnimationProgress = Math.min(1, elapsed / hoverAnimationDuration);
  } else if (!isCircleButtonHovered && hoverAnimationProgress > 0 && !isCirclesCollected) {
    // Normal hover end: spread apart (only if not collected and not pressed)
    const elapsed = currentTime - hoverAnimationStartTime;
    hoverAnimationProgress = Math.max(0, 1 - (elapsed / hoverAnimationDuration));
    // When animation completes and we're exiting screenshot mode, clear the transition flag
    if (isExitingScreenshotMode && hoverAnimationProgress <= 0) {
      isExitingScreenshotMode = false;
    }
  }
  
  // Use smooth easing for all transitions (no bouncing)
  // Use easeInOutCubic for smooth, non-bouncy animations
  const easedHoverProgress = easeInOutCubic(hoverAnimationProgress);
  
  // Update target mouse position for sticky effect (time-based for constant speed)
  // Follow mouse when hovering or when collected (X state) or when pressed
  // When collected or pressed, always follow mouse if hovering (don't require hoverAnimationProgress > 0.5)
  if ((isCirclesCollected || isCircleButtonPressed) && isCircleButtonHovered) {
    // When collected (X state) or pressed, follow mouse immediately when hovering
    const mouseLerpPerSecond = 8.0; // Lerp rate per second (time-based)
    targetMouseX += (circleButtonMouseX - targetMouseX) * mouseLerpPerSecond * deltaTime;
    targetMouseY += (circleButtonMouseY - targetMouseY) * mouseLerpPerSecond * deltaTime;
  } else if (isCircleButtonHovered && hoverAnimationProgress > 0.5) {
    // When not collected, follow mouse when mostly converged from hover
    const mouseLerpPerSecond = 8.0; // Lerp rate per second (time-based)
    targetMouseX += (circleButtonMouseX - targetMouseX) * mouseLerpPerSecond * deltaTime;
    targetMouseY += (circleButtonMouseY - targetMouseY) * mouseLerpPerSecond * deltaTime;
  } else {
    // Return to center when not hovered (time-based)
    const centerLerpPerSecond = 5.0; // Lerp rate per second (time-based)
    targetMouseX += (centerX - targetMouseX) * centerLerpPerSecond * deltaTime;
    targetMouseY += (centerY - targetMouseY) * centerLerpPerSecond * deltaTime;
  }
  
  // Calculate offset from center based on mouse position
  const mouseFollowStrength = (isCirclesCollected || isCircleButtonPressed)
    ? 1.0 // Full strength when collected (X state) or pressed for sticky behavior
    : Math.max(0, (hoverAnimationProgress - 0.5) * 2); // 0 to 1 when >50% converged during hover
  const effectiveMouseFollowStrength = mouseFollowStrength;
  const mouseOffsetX = (targetMouseX - centerX) * effectiveMouseFollowStrength * 0.08; // Reduced to 8% for smoother, less dramatic movement
  const mouseOffsetY = (targetMouseY - centerY) * effectiveMouseFollowStrength * 0.08; // Reduced to 8% for smoother, less dramatic movement
  // When collected or pressed, use stored converged center as base (if animation is complete), otherwise use regular center
  // For sticky behavior, we want to use the center as base and add the mouse offset
  const baseCenterX = (isCirclesCollected || isCircleButtonPressed) && hoverAnimationProgress > 0.5 ? convergedCenterX : centerX;
  const baseCenterY = (isCirclesCollected || isCircleButtonPressed) && hoverAnimationProgress > 0.5 ? convergedCenterY : centerY;
  const hoverCenterX = baseCenterX + mouseOffsetX;
  const hoverCenterY = baseCenterY + mouseOffsetY;
  
  // Store hover center for X icon positioning
  currentHoverCenterX = hoverCenterX;
  currentHoverCenterY = hoverCenterY;
  
  circles.forEach((circle, index) => {
    // Calculate pattern position with guaranteed bounds
    let patternX = centerX;
    let patternY = centerY;
    
    // Use consistent time-based movement
    const t = animationTime + circle.timeOffset / 1000;
    
    // Base speed in radians per second (constant, not frame-based)
    const baseSpeed = 0.3; // Radians per second - consistent speed
    const speed = baseSpeed * circleSpeedMultiplier;
    
    if (circle.patternType === 'orbital') {
      // Orbital: circle orbits around a drifting base point
      // Use fixed, bounded amplitudes to ensure we never exceed wander radius
      const maxDrift = 8; // Base drift amplitude
      const maxOrbit = 12; // Orbit radius
      // Ensure total never exceeds wander radius: maxDrift + maxOrbit < wanderRadius
      
      // Base point drifts slowly
      const driftX = Math.sin(t * circle.freq1 * 2 * Math.PI * circleSpeedMultiplier) * maxDrift;
      const driftY = Math.cos(t * circle.freq2 * 2 * Math.PI * circleSpeedMultiplier) * maxDrift;
      
      // Circle orbits around base point
      circle.angle += speed * deltaTime; // Constant angular velocity
      const orbitX = Math.cos(circle.angle + circle.phase) * maxOrbit;
      const orbitY = Math.sin(circle.angle + circle.phase) * maxOrbit;
      
      patternX = centerX + driftX + orbitX;
      patternY = centerY + driftY + orbitY;
      
    } else if (circle.patternType === 'figure8') {
      // Figure-8: Lemniscate of Bernoulli
      // Constrain size to ensure it stays within bounds
      const maxSize = 12; // Maximum size of figure-8
      
      circle.angle += speed * deltaTime; // Constant angular velocity
      const tParam = circle.angle + circle.phase;
      
      // Lemniscate: x = a*sin(t), y = a*sin(t)*cos(t)
      // Maximum distance from center is approximately a
      const figure8X = maxSize * Math.sin(tParam);
      const figure8Y = maxSize * Math.sin(tParam) * Math.cos(tParam);
      
      // Add slow drift
      const maxDrift = 6;
      const driftX = Math.sin(t * circle.freq1 * 2 * Math.PI * circleSpeedMultiplier) * maxDrift;
      const driftY = Math.cos(t * circle.freq2 * 2 * Math.PI * circleSpeedMultiplier) * maxDrift;
      
      patternX = centerX + figure8X + driftX;
      patternY = centerY + figure8Y + driftY;
      
    } else if (circle.patternType === 'rhythmic') {
      // Rhythmic: sine wave base with smooth random offset
      const baseAmplitude = 8; // Base sine wave amplitude
      const maxOffset = 6; // Maximum random offset
      // Total: baseAmplitude + maxOffset = 14, well within wanderRadius of 30
      
      // Base sine wave movement
      const baseX = centerX + Math.sin(t * circle.freq1 * 2 * Math.PI * circleSpeedMultiplier) * baseAmplitude;
      const baseY = centerY + Math.cos(t * circle.freq2 * 2 * Math.PI * circleSpeedMultiplier) * baseAmplitude;
      
      // Update random target periodically (every 3-5 seconds)
      if (currentTime > circle.randomChangeTime) {
        circle.randomTargetX = (Math.random() - 0.5) * maxOffset * 2; // -maxOffset to maxOffset
        circle.randomTargetY = (Math.random() - 0.5) * maxOffset * 2;
        circle.randomChangeTime = currentTime + 3000 + Math.random() * 2000;
      }
      
      // Smoothly move toward random target (constant speed lerp)
      const lerpSpeed = 2.0; // Units per second
      const lerpFactor = Math.min(1.0, lerpSpeed * deltaTime);
      circle.randomOffsetX += (circle.randomTargetX - circle.randomOffsetX) * lerpFactor;
      circle.randomOffsetY += (circle.randomTargetY - circle.randomOffsetY) * lerpFactor;
      
      // Constrain offset to maxOffset
      const offsetDist = Math.sqrt(circle.randomOffsetX * circle.randomOffsetX + circle.randomOffsetY * circle.randomOffsetY);
      if (offsetDist > maxOffset) {
        const scale = maxOffset / offsetDist;
        circle.randomOffsetX *= scale;
        circle.randomOffsetY *= scale;
      }
      
      patternX = baseX + circle.randomOffsetX;
      patternY = baseY + circle.randomOffsetY;
    }
    
    // Final safety constraint - clamp to wander radius if needed
    const dx = patternX - centerX;
    const dy = patternY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > wanderRadius) {
      const scale = wanderRadius / distance;
      patternX = centerX + dx * scale;
      patternY = centerY + dy * scale;
    }
    
    // Handle position based on collected state and hover
    // Keep circles collected when button is pressed
    if ((isCirclesCollected || isCircleButtonPressed) && hoverAnimationProgress > 0) {
      // When collected (toggled) or pressed, animate from stored start position to center
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
    } else if (!isCircleButtonHovered && hoverAnimationProgress > 0 && !isCirclesCollected && !isCircleButtonPressed) {
      // When leaving hover (and not collected and not pressed), smooth spread apart from converged center to pattern positions
      const returnProgress = 1 - hoverAnimationProgress; // 0 to 1 as we spread apart
      // Use smooth easing for spreading apart (no bounce)
      const easedReturnProgress = easeInOutCubic(returnProgress);
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
  
  // Clear canvas (use logical dimensions since context is scaled)
  circleButtonCtx.clearRect(0, 0, CIRCLE_BUTTON_DISPLAY_SIZE, CIRCLE_BUTTON_DISPLAY_SIZE);
  
  // Update positions
  updateCirclePositions();
  
  // Calculate target opacity based on mouse distance to circle button
  // When in X state (collected), always use max opacity regardless of mouse distance
  let targetOpacity;
  if (isScreenshotMode) {
    targetOpacity = 0.5; // Blue when screenshot mode is active (50% opacity)
    // Use normal blending for screenshot mode
    circleButtonCtx.globalCompositeOperation = 'source-over';
  } else {
    if (isCirclesCollected) {
      // In X state: always use maximum opacity
      targetOpacity = 0.5; // Maximum opacity
    } else {
      // Normal state: opacity based on mouse distance
      // Closer mouse = higher opacity (more intense blending)
      // Further mouse = lower opacity (lighter blending)
      const maxDistance = 350; // Distance at which opacity is at minimum
      const minOpacity = 0.25; // Minimum opacity when far away (very light)
      const maxOpacity = 0.5; // Maximum opacity when close (more intense)
      
      // Clamp distance and calculate opacity
      const clampedDistance = Math.min(mouseDistanceToCircleButton, maxDistance);
      const distanceRatio = clampedDistance / maxDistance; // 0 = close, 1 = far
      targetOpacity = maxOpacity - (maxOpacity - minOpacity) * distanceRatio;
    }
    
    // Use selected blend mode so overlapping circles can create different visual effects
    // 'screen' makes overlapping areas appear brighter and more solid
    // 'lighter' adds the colors together for additive blending
    // 'lighten' takes the lighter of the two colors
    circleButtonCtx.globalCompositeOperation = circuitBlendMode;
  }
  
  // Smoothly interpolate current opacity towards target opacity
  // Using a lerp factor of 0.12 for smooth but responsive transitions
  const opacityLerpFactor = 0.12;
  currentCircleOpacity = currentCircleOpacity + (targetOpacity - currentCircleOpacity) * opacityLerpFactor;
  
  // Draw each circle with its individual color
  circles.forEach((circle, index) => {
    // Get the circle's color (default to white if not set)
    let circleHexColor = circle.color || '#FFFFFF';
    
    // Keep circles white in screenshot mode (outline will be blue instead)
    
    // Convert hex to RGB
    const hex = circleHexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Apply smoothed dynamic opacity to the circle's color
    const circleColorWithOpacity = `rgba(${r}, ${g}, ${b}, ${currentCircleOpacity})`;
    
    circleButtonCtx.beginPath();
    circleButtonCtx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    circleButtonCtx.fillStyle = circleColorWithOpacity;
    circleButtonCtx.fill();
  });
  // Reset to default blend mode after drawing circles
  circleButtonCtx.globalCompositeOperation = 'source-over';
  
  // Draw blue outline when screenshot mode is active, fade in after circles are collected (not during exit transition)
  if (isScreenshotMode && !isExitingScreenshotMode && isCirclesCollected && hoverAnimationProgress >= 1.0) {
    const centerX = CIRCLE_BUTTON_DISPLAY_SIZE / 2;
    const centerY = CIRCLE_BUTTON_DISPLAY_SIZE / 2;
    // Draw outline just outside the circles (radius 30 + small offset for outline)
    const outlineRadius = 32; // Slightly larger than circle radius (30) to account for outline width
    
    // Fade in the outline after circles are fully collected
    const outlineFadeDuration = 400; // 400ms fade-in duration (slower fade)
    const currentTime = Date.now();
    let outlineOpacity = 1; // Default to fully visible
    
    if (screenshotOutlineFadeStartTime > 0) {
      const outlineFadeElapsed = currentTime - screenshotOutlineFadeStartTime;
      outlineOpacity = Math.min(1, Math.max(0, outlineFadeElapsed / outlineFadeDuration));
    }
    
    circleButtonCtx.save();
    circleButtonCtx.globalAlpha = outlineOpacity;
    circleButtonCtx.beginPath();
    circleButtonCtx.arc(centerX, centerY, outlineRadius, 0, Math.PI * 2);
    circleButtonCtx.strokeStyle = '#3B82F6'; // Blue outline
    circleButtonCtx.lineWidth = 2;
    circleButtonCtx.stroke();
    circleButtonCtx.restore();
  }
  
  // Draw X icon when hovered, collected, or pressed (fades in/out with hover animation, follows mouse)
  if (hoverAnimationProgress > 0 || isCirclesCollected || isCircleButtonPressed) {
    // Show fullscreen icon if in screenshot mode OR if transitioning out (fading)
    const showFullscreenIcon = isScreenshotMode || isExitingScreenshotMode;
    const iconSize = showFullscreenIcon ? 28 : 14; // Larger size for fullscreen icon, smaller for X icon
    const iconOpacity = (isCirclesCollected || isCircleButtonPressed) ? 1 : hoverAnimationProgress; // Full opacity when collected or pressed, fade when hovering
    
    // Use hover center position (which follows mouse) for icon position
    // Always use currentHoverCenterX/Y which includes sticky behavior
    const iconX = currentHoverCenterX;
    const iconY = currentHoverCenterY;
    
    circleButtonCtx.save();
    circleButtonCtx.globalAlpha = iconOpacity;
    // Icon color: blue when screenshot mode or exiting, white if light background, black if dark background
    const iconColor = showFullscreenIcon ? '#3B82F6' : (isBackgroundLight ? '#FFFFFF' : '#000000');
    circleButtonCtx.strokeStyle = iconColor;
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
      // When rotation completes and we're exiting screenshot mode, clear the transition flag
      if (isExitingScreenshotMode && hoverAnimationProgress <= 0) {
        isExitingScreenshotMode = false;
      }
    }
    
    // Apply rotation around the icon center
    circleButtonCtx.translate(iconX, iconY);
    circleButtonCtx.rotate(currentIconRotation);
    circleButtonCtx.translate(-iconX, -iconY);
    
    if (showFullscreenIcon) {
      // Draw fullscreen icon using Lucide Fullscreen icon
      // Lucide icons are designed for 24x24 viewBox, scale to iconSize
      const scale = iconSize / 24;
      const offsetX = iconX - 12 * scale; // Center the 24x24 icon
      const offsetY = iconY - 12 * scale;
      
      // Save context for transformations
      circleButtonCtx.save();
      circleButtonCtx.translate(offsetX, offsetY);
      circleButtonCtx.scale(scale, scale);
      
      // Draw each element from the Fullscreen icon
      Fullscreen.forEach((element) => {
        const [type, attrs] = element;
        
        if (type === 'path') {
          // Draw SVG path
          const path = new Path2D(attrs.d);
          circleButtonCtx.stroke(path);
        } else if (type === 'rect') {
          // Draw rectangle
          circleButtonCtx.beginPath();
          circleButtonCtx.rect(
            attrs.x || 0,
            attrs.y || 0,
            attrs.width || 0,
            attrs.height || 0
          );
          if (attrs.rx) {
            // If there's a border radius, we'd need to use roundedRect (if available)
            // or draw manually, but for now just stroke the rect
            circleButtonCtx.stroke();
          } else {
            circleButtonCtx.stroke();
          }
        }
      });
      
      // Restore context
      circleButtonCtx.restore();
    } else {
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
    }
    
    circleButtonCtx.restore();
  }
  
  // Draw blue quarter-circle indicator in bottom-right corner when screenshot mode is active (not during exit transition)
  if (isScreenshotMode && !isExitingScreenshotMode) {
    circleButtonCtx.save();
    const cornerRadius = 20; // Radius of the quarter-circle
    const cornerX = CIRCLE_BUTTON_DISPLAY_SIZE; // Bottom-right corner X (120)
    const cornerY = CIRCLE_BUTTON_DISPLAY_SIZE; // Bottom-right corner Y (120)
    
    // Draw quarter-circle in bottom-right corner
    // Arc center is at the corner, arc goes from -Math.PI/2 (up) to 0 (right)
    circleButtonCtx.beginPath();
    circleButtonCtx.moveTo(cornerX, cornerY - cornerRadius); // Start at top of arc
    circleButtonCtx.arc(cornerX, cornerY, cornerRadius, -Math.PI / 2, 0, false); // Arc from up to right
    circleButtonCtx.lineTo(cornerX, cornerY); // Line to corner
    circleButtonCtx.closePath(); // Close path back to start
    circleButtonCtx.fillStyle = '#3B82F6'; // Blue color
    circleButtonCtx.fill();
    
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

// Pin Placement UI Functions
function showPinPlacementUI(screenX, screenY) {
  if (!pinPlacementUI) return;
  
  pinPlacementUI.style.display = 'block';
  pinPlacementUI.style.left = (screenX + 20) + 'px';
  pinPlacementUI.style.top = (screenY - 20) + 'px';
  pinPlacementUI.style.pointerEvents = 'auto';
  
  if (pinFeatureInput) {
    pinFeatureInput.value = '';
    // Use setTimeout to ensure the input is visible before focusing
    setTimeout(() => {
      pinFeatureInput.focus();
    }, 10);
  }
}

function hidePinPlacementUI() {
  if (pinPlacementUI) {
    pinPlacementUI.style.display = 'none';
  }
  isPlacingPin = false;
  tempPinLocation = null;
  pinFeatureText = '';
  if (pinFeatureInput) {
    pinFeatureInput.blur();
  }
}

function confirmPinPlacement() {
  if (!isPlacingPin || !tempPinLocation || !pinFeatureInput) return;
  
  const reflectionImg = images[reflectionImageIndex];
  if (!reflectionImg) return;
  
  const featureText = pinFeatureInput.value.trim();
  if (!featureText) {
    // Don't create pin without feature text
    hidePinPlacementUI();
    draw();
    return;
  }
  
  // Create new pin
  const newPin = {
    id: generateId(),
    imageId: reflectionImg.id,
    imageVersion: reflectionImg.version,
    location: { x: tempPinLocation.x, y: tempPinLocation.y },
    semanticLocation: '',
    feature: featureText,
    emotionalAspects: [],
    valueAspects: []
  };
  
  reflectionImg.pins.push(newPin);
  
  hidePinPlacementUI();
  draw();
}

function updateControlPanelInputs() {
  if (!controlPanelInputs || !emotionalAspectInput || !valueAspectInput) return;
  
  const reflectionImg = images[reflectionImageIndex];
  if (!reflectionImg || !isReflectionMode) {
    if (controlPanelInputs) controlPanelInputs.style.display = 'none';
    return;
  }
  
  // Position control panel inputs in the red panel
  // Calculate positions based on the drawn labels and fields
  if (window.reflectionPanelBounds) {
    const bounds = window.reflectionPanelBounds;
    const padding = 20;
    const labelHeight = 20;
    const fieldHeight = 32;
    const spacing = 10;
    
    // Position container at top-left of red panel
    controlPanelInputs.style.display = 'block';
    controlPanelInputs.style.left = bounds.x + 'px';
    controlPanelInputs.style.top = bounds.y + 'px';
    
    // Emotional aspects input position (below "Emotional Aspects" label)
    // Label starts at padding, then labelHeight, then 8px spacing, then input field
    const emotionalInputTop = padding + labelHeight + 8;
    
    // Value aspects input position (below emotional aspects section)
    // Need to account for emotional aspects tags if they exist
    const selectedPin = selectedPinId ? reflectionImg.pins.find(p => p.id === selectedPinId) : null;
    const emotionalTagsHeight = selectedPin && selectedPin.emotionalAspects && selectedPin.emotionalAspects.length > 0
      ? Math.ceil(selectedPin.emotionalAspects.length / 3) * 35 + 10
      : 0;
    // Emotional section: label + input + tags + spacing, then value label + spacing, then value input
    const valueInputTop = emotionalInputTop + fieldHeight + spacing + emotionalTagsHeight + 20 + labelHeight + 8;
    
    // Position emotional aspect input (relative to container)
    if (emotionalAspectInput) {
      emotionalAspectInput.style.position = 'absolute';
      emotionalAspectInput.style.left = padding + 'px';
      emotionalAspectInput.style.top = emotionalInputTop + 'px';
      emotionalAspectInput.style.width = (bounds.width - padding * 2 - 40) + 'px';
    }
    if (emotionalAspectAddButton) {
      emotionalAspectAddButton.style.position = 'absolute';
      emotionalAspectAddButton.style.left = (bounds.width - padding - 30) + 'px';
      emotionalAspectAddButton.style.top = emotionalInputTop + 'px';
      emotionalAspectAddButton.style.width = '30px';
      emotionalAspectAddButton.style.height = fieldHeight + 'px';
    }
    
    // Position value aspect input (relative to container)
    if (valueAspectInput) {
      valueAspectInput.style.position = 'absolute';
      valueAspectInput.style.left = padding + 'px';
      valueAspectInput.style.top = valueInputTop + 'px';
      valueAspectInput.style.width = (bounds.width - padding * 2 - 40) + 'px';
    }
    if (valueAspectAddButton) {
      valueAspectAddButton.style.position = 'absolute';
      valueAspectAddButton.style.left = (bounds.width - padding - 30) + 'px';
      valueAspectAddButton.style.top = valueInputTop + 'px';
      valueAspectAddButton.style.width = '30px';
      valueAspectAddButton.style.height = fieldHeight + 'px';
    }
  } else {
    // Fallback positioning if bounds not set yet
    const imageTopRight = canvasToScreen(reflectionImg.x + reflectionImg.width, reflectionImg.y);
    controlPanelInputs.style.display = 'block';
    controlPanelInputs.style.left = (imageTopRight.x + 60) + 'px';
    controlPanelInputs.style.top = (imageTopRight.y + 20) + 'px';
  }
  
  // Update enabled/disabled state
  const hasSelectedPin = selectedPinId !== null;
  const selectedPin = hasSelectedPin ? reflectionImg.pins.find(p => p.id === selectedPinId) : null;
  const hasEmotionalAspects = selectedPin && selectedPin.emotionalAspects && selectedPin.emotionalAspects.length > 0;
  
  if (emotionalAspectInput) {
    emotionalAspectInput.disabled = !hasSelectedPin;
    emotionalAspectInput.value = '';
    emotionalAspectInput.style.opacity = hasSelectedPin ? '1' : '0.5';
    emotionalAspectInput.style.pointerEvents = hasSelectedPin ? 'auto' : 'none';
  }
  if (emotionalAspectAddButton) {
    emotionalAspectAddButton.disabled = !hasSelectedPin;
    emotionalAspectAddButton.style.opacity = hasSelectedPin ? '1' : '0.5';
    emotionalAspectAddButton.style.cursor = hasSelectedPin ? 'pointer' : 'not-allowed';
    emotionalAspectAddButton.style.pointerEvents = hasSelectedPin ? 'auto' : 'none';
  }
  if (valueAspectInput) {
    valueAspectInput.disabled = !hasEmotionalAspects;
    valueAspectInput.value = '';
    valueAspectInput.style.opacity = hasEmotionalAspects ? '1' : '0.5';
    valueAspectInput.style.pointerEvents = hasEmotionalAspects ? 'auto' : 'none';
  }
  if (valueAspectAddButton) {
    valueAspectAddButton.disabled = !hasEmotionalAspects;
    valueAspectAddButton.style.opacity = hasEmotionalAspects ? '1' : '0.5';
    valueAspectAddButton.style.cursor = hasEmotionalAspects ? 'pointer' : 'not-allowed';
    valueAspectAddButton.style.pointerEvents = hasEmotionalAspects ? 'auto' : 'none';
  }
}

function addEmotionalAspect() {
  if (!selectedPinId || !emotionalAspectInput) return;
  
  const reflectionImg = images[reflectionImageIndex];
  if (!reflectionImg) return;
  
  const selectedPin = reflectionImg.pins.find(p => p.id === selectedPinId);
  if (!selectedPin) return;
  
  const aspectText = emotionalAspectInput.value.trim();
  if (!aspectText) return;
  
  if (!selectedPin.emotionalAspects) {
    selectedPin.emotionalAspects = [];
  }
  
  selectedPin.emotionalAspects.push(aspectText);
  emotionalAspectInput.value = '';
  
  // Enable value aspects field if it wasn't already enabled
  updateControlPanelInputs();
  draw();
}

function addValueAspect() {
  if (!selectedPinId || !valueAspectInput) return;
  
  const reflectionImg = images[reflectionImageIndex];
  if (!reflectionImg) return;
  
  const selectedPin = reflectionImg.pins.find(p => p.id === selectedPinId);
  if (!selectedPin) return;
  
  const aspectText = valueAspectInput.value.trim();
  if (!aspectText) return;
  
  if (!selectedPin.valueAspects) {
    selectedPin.valueAspects = [];
  }
  
  selectedPin.valueAspects.push(aspectText);
  valueAspectInput.value = '';
  
  draw();
}

function deleteAspect(type, index) {
  if (!selectedPinId) return;
  
  const reflectionImg = images[reflectionImageIndex];
  if (!reflectionImg) return;
  
  const selectedPin = reflectionImg.pins.find(p => p.id === selectedPinId);
  if (!selectedPin) return;
  
  if (type === 'emotional' && selectedPin.emotionalAspects) {
    selectedPin.emotionalAspects.splice(index, 1);
    // Disable value aspects if no emotional aspects remain
    if (selectedPin.emotionalAspects.length === 0) {
      updateControlPanelInputs();
    }
  } else if (type === 'value' && selectedPin.valueAspects) {
    selectedPin.valueAspects.splice(index, 1);
  }
  
  draw();
}

// Event listeners for pin placement
if (pinConfirmButton) {
  pinConfirmButton.addEventListener('click', (e) => {
    e.stopPropagation();
    confirmPinPlacement();
  });
}

if (pinFeatureInput) {
  pinFeatureInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmPinPlacement();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      hidePinPlacementUI();
      draw();
    }
  });
}

// Event listeners for aspect inputs
if (emotionalAspectAddButton) {
  emotionalAspectAddButton.addEventListener('click', (e) => {
    e.stopPropagation();
    addEmotionalAspect();
  });
}

if (emotionalAspectInput) {
  emotionalAspectInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEmotionalAspect();
    }
  });
}

if (valueAspectAddButton) {
  valueAspectAddButton.addEventListener('click', (e) => {
    e.stopPropagation();
    addValueAspect();
  });
}

if (valueAspectInput) {
  valueAspectInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addValueAspect();
    }
  });
}

// Handle clicks on aspect tag delete buttons
canvas.addEventListener('click', (e) => {
  if (!isReflectionMode || !window.aspectTagBounds) return;
  
  // Check if clicking on a delete button
  for (let i = 0; i < window.aspectTagBounds.length; i++) {
    const tag = window.aspectTagBounds[i];
    if (e.clientX >= tag.x && e.clientX <= tag.x + tag.width &&
        e.clientY >= tag.y && e.clientY <= tag.y + tag.height) {
      deleteAspect(tag.type, tag.index);
      window.aspectTagBounds = [];
      return;
    }
  }
  
  // Clear tag bounds after click
  window.aspectTagBounds = [];
});

// Handle clicks outside pin placement UI to cancel (only on mousedown, not click)
// This prevents the UI from disappearing when mouse is released
document.addEventListener('mousedown', (e) => {
  if (isPlacingPin && pinPlacementUI && !pinPlacementUI.contains(e.target)) {
    // Check if clicking on canvas (not on other UI elements)
    if (e.target === canvas) {
      // Only cancel if clicking directly on canvas, not on any child elements
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Check if click is actually on canvas area and not on the reflection image
      // Use CSS pixel dimensions for comparison (x and y are in CSS pixels)
      const cssDims = getCanvasCSSDimensions();
      if (x >= 0 && x <= cssDims.width && y >= 0 && y <= cssDims.height) {
        // Don't cancel if clicking on the reflection image (that's where we place pins)
        if (isReflectionMode && reflectionImageIndex >= 0) {
          const reflectionImg = images[reflectionImageIndex];
          if (reflectionImg) {
            const canvasPos = screenToCanvas(e.clientX, e.clientY);
            const isOnImage = canvasPos.x >= reflectionImg.x && 
                            canvasPos.x <= reflectionImg.x + reflectionImg.width &&
                            canvasPos.y >= reflectionImg.y && 
                            canvasPos.y <= reflectionImg.y + reflectionImg.height;
            if (!isOnImage) {
              hidePinPlacementUI();
              draw();
            }
          }
        } else {
          hidePinPlacementUI();
          draw();
        }
      }
    }
  }
});

// Initial draw
draw();

