const { ipcRenderer } = require('electron');
const { Fullscreen, Camera } = require('lucide');
const fs = require('fs');
const path = require('path');

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
const demoModeToggle = document.getElementById('demo-mode-toggle');
const openScreenRecordingPermissionsButton = document.getElementById('open-screen-recording-permissions');
const openAccessibilityPermissionsButton = document.getElementById('open-accessibility-permissions');
const openAllPermissionsButton = document.getElementById('open-all-permissions');

// State
let isOverlayActive = false;
let isScreenshotMode = false;
let isExitingScreenshotMode = false; // Track if we're transitioning out of screenshot mode
let isOpeningFromScreenshot = false; // Track if we're opening overlay from a screenshot
let isTransitioningToReflectionMode = false; // Track if we're transitioning to reflection mode (prevents toolbar from showing)
let hasExitedReflectionModeOnce = false; // Track if we've exited reflection mode at least once (for showing other images)
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
let screenshotSelectionBounds = null; // Store screenshot selection box bounds {left, top, width, height} for excluding from fade-in
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
const ANIMATION_DPR = 1.0; // Lower DPR during animations for smooth performance
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
let expandedPinId = null; // Currently expanded pin ID (for showing aspect dots in orbits)
let isPlacingPin = false; // Whether currently placing a pin
let tempPinLocation = null; // Temporary pin location during placement {x, y} in normalized coordinates
let pinFeatureText = ''; // Text for feature during pin placement

// Pin expansion animation state
let pinExpansionAnimation = null; // { pinId, startTime, duration, fromState: 'collapsed'|'expanded', toState: 'collapsed'|'expanded' }
const PIN_EXPANSION_DURATION = 350; // Animation duration in milliseconds

// Hovered aspect dot state - tracks which dot is currently hovered
let hoveredAspectDot = null; // { pinId, type: 'emotional'|'value', index, text, x, y }

// Dot position animation state - tracks repositioning animations for aspect dots
// Structure: { pinId: { emotional: { startTime, duration, oldAngles: [], newAngles: [], isNewDot: [] }, value: { ... } } }
let dotPositionAnimations = {};
const DOT_REPOSITION_DURATION = 400; // Animation duration in milliseconds

// Values area appearance animation - tracks when values area first appears
// Structure: { pinId: { startTime, duration } }
let valuesAreaAnimations = {};
const VALUES_AREA_ANIMATION_DURATION = 350; // Same duration as pin expansion

// Helper function to start values area appearance animation
function startValuesAreaAnimation(pinId) {
  valuesAreaAnimations[pinId] = {
    startTime: Date.now(),
    duration: VALUES_AREA_ANIMATION_DURATION
  };
  
  // Trigger continuous redraw during animation
  const animate = () => {
    if (!valuesAreaAnimations[pinId]) {
      return; // Animation was cancelled or completed
    }
    
    const anim = valuesAreaAnimations[pinId];
    const elapsed = Date.now() - anim.startTime;
    const progress = elapsed / anim.duration;
    
    if (progress < 1.0) {
      requestDraw();
      requestAnimationFrame(animate);
    } else {
      // Animation complete
      delete valuesAreaAnimations[pinId];
      requestDraw();
    }
  };
  
  requestAnimationFrame(animate);
}

// Helper function to get values area animation progress
function getValuesAreaProgress(pinId) {
  if (!valuesAreaAnimations[pinId]) {
    return 1.0; // No animation, fully visible
  }
  
  const anim = valuesAreaAnimations[pinId];
  const elapsed = Date.now() - anim.startTime;
  const progress = Math.min(elapsed / anim.duration, 1.0);
  
  // Apply bouncy easing (same as pin expansion)
  const easedProgress = easeOutBack(progress);
  
  // If animation is complete, clean it up
  if (progress >= 1.0) {
    delete valuesAreaAnimations[pinId];
    return 1.0;
  }
  
  return easedProgress;
}

// SVG label images
let emotionsLabelImage = null;
let valuesLabelImage = null;

// Load SVG label images
function loadLabelImages() {
  // Load from assets folder
  const emotionsPath = path.join(__dirname, 'assets', 'Emotions.svg');
  const valuesPath = path.join(__dirname, 'assets', 'Values.svg');
  
  // Load Emotions SVG
  emotionsLabelImage = new Image();
  emotionsLabelImage.onload = () => {
    requestDraw();
  };
  emotionsLabelImage.onerror = () => {
    console.error('Failed to load Emotions.svg from:', emotionsPath);
  };
  emotionsLabelImage.src = 'file://' + emotionsPath;
  
  // Load Values SVG
  valuesLabelImage = new Image();
  valuesLabelImage.onload = () => {
    requestDraw();
  };
  valuesLabelImage.onerror = () => {
    console.error('Failed to load Values.svg from:', valuesPath);
  };
  valuesLabelImage.src = 'file://' + valuesPath;
}

// Initialize label images on load
if (typeof window !== 'undefined') {
  window.addEventListener('load', loadLabelImages);
  // Also try loading immediately in case window is already loaded
  if (document.readyState === 'complete') {
    loadLabelImages();
  } else {
    // Try loading after a short delay
    setTimeout(loadLabelImages, 100);
  }
}

// Reflection mode exit hold state
let isHoldingEscapeToExit = false; // Whether Escape is currently being held to exit reflection mode
let escapeHoldStartTime = 0; // Timestamp when Escape key was pressed (for hold-to-exit)
let escapeHoldTimeout = null; // Timeout for completing the exit after hold duration
const ESCAPE_HOLD_DURATION = 500; // Duration to hold Escape key to exit reflection mode (ms)

// Canvas exit hold state
let isHoldingEscapeToExitCanvas = false; // Whether Escape is currently being held to exit canvas
let canvasExitHoldStartTime = 0; // Timestamp when Escape key was pressed (for hold-to-exit canvas)
let canvasExitHoldTimeout = null; // Timeout for completing the canvas exit after hold duration
let escapeKeyWasReleased = true; // Track if Escape key has been released (prevents holding through from reflection mode to canvas exit)
const CANVAS_EXIT_HOLD_DURATION = 500; // Duration to hold Escape key to exit canvas (ms)

// Generate unique ID for images and pins
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Helper function to get device pixel ratio
// Get the base device pixel ratio from the browser
function getBaseDevicePixelRatio() {
  return window.devicePixelRatio || 1;
}

// Get effective DPR (dynamic based on interaction state, animation state, or manual mode)
function getDevicePixelRatio() {
  // Check if manual DPR mode is set
  if (dprMode === '1') {
    return 1.0;
  } else if (dprMode === '1.5') {
    return 1.5;
  } else if (dprMode === '2') {
    return 2.0;
  }
  
  // Check if pin expansion animation is active - use lower DPR for smooth animation
  if (pinExpansionAnimation) {
    const baseDPR = getBaseDevicePixelRatio();
    // Use animation DPR, but don't go below base DPR
    return Math.max(ANIMATION_DPR, baseDPR);
  }
  
  // Check if dot repositioning animation is active
  if (Object.keys(dotPositionAnimations).length > 0) {
    const baseDPR = getBaseDevicePixelRatio();
    // Use animation DPR, but don't go below base DPR
    return Math.max(ANIMATION_DPR, baseDPR);
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
    overlayContainer.style.setProperty('transform', 'none', 'important');
    overlayContainer.style.setProperty('min-width', width + 'px', 'important');
    overlayContainer.style.setProperty('min-height', height + 'px', 'important');
    overlayContainer.style.setProperty('max-width', width + 'px', 'important');
    overlayContainer.style.setProperty('max-height', height + 'px', 'important');
    
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
    // Animate circles gathering to form X icon instead of instantly switching
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
    // Start animation from current state (will animate to 1.0 over hoverAnimationDuration)
    // Don't set hoverAnimationProgress immediately - let it animate from current value to 1.0
    hoverAnimationStartTime = Date.now();
    // Don't move circles immediately - let the animation handle the transition
    // The animation loop will handle moving circles from their current positions to center
    
    // Function to show overlay and setup canvas
    const showOverlayAndSetupCanvas = () => {
      overlayContainer.classList.add('active');
      overlayContainer.style.setProperty('display', 'block', 'important');
      overlayContainer.style.setProperty('visibility', 'visible', 'important');
      
      // Force a reflow to ensure styles are applied
      void overlayContainer.offsetWidth;
      void overlayContainer.offsetHeight;
      
      ipcRenderer.send('set-ignore-mouse-events', false);
      // Ensure canvas is properly sized with high-DPI support
      // Use requestAnimationFrame to ensure DOM is fully updated
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
        
          // Apply fade-in animation immediately (start as soon as canvas is ready)
          // Remove fade-out class if present
          canvas.classList.remove('fade-out');
          // Set initial opacity to 0
          canvas.style.opacity = '0';
          // Start fade-in immediately - canvas is ready
          canvas.classList.add('fade-in');
          // Remove class after animation completes (150ms - fast fade)
          setTimeout(() => {
            canvas.classList.remove('fade-in');
            canvas.style.opacity = ''; // Reset to default
            if (isOpeningFromScreenshot) {
              isOpeningFromScreenshot = false; // Reset flag
            }
          }, 150);
        
        // Draw immediately - fade-in will happen in parallel
        draw();
      });
    };
    
    // If background is already captured from screenshot mode, show overlay immediately
    if (isOpeningFromScreenshot && backgroundImage && backgroundImage.complete) {
      // Mark background cache as dirty (needs update)
      backgroundCacheDirty = true;
      cachedBlurredBackground = null;
      // Start fade-in animation for existing background
      backgroundFadeOpacity = 0;
      isBackgroundFading = true;
      backgroundFadeStartTime = Date.now();
      // Show overlay and setup canvas
      showOverlayAndSetupCanvas();
      // Update toolbar visibility (will show when background fades in)
      updateToolbarVisibility();
      requestDraw();
    } else {
      // When opening via button, capture background first while overlay is hidden
      // Overlay is already hidden (display: none by default), so we can capture immediately
      // Ensure overlay is explicitly hidden before capturing (just to be safe)
      overlayContainer.classList.remove('active');
      overlayContainer.style.setProperty('display', 'none', 'important');
      overlayContainer.style.setProperty('visibility', 'hidden', 'important');
      
      // Hide toolbar initially - it will appear when background is loaded
      updateToolbarVisibility();
      
      // Capture background immediately (overlay is already hidden, no delay needed)
      captureBackground().then(() => {
        // Once background is captured, show overlay and fade it in immediately
        showOverlayAndSetupCanvas();
        // Background fade-in will be handled by captureBackground's onload callback
      }).catch(() => {
        // If capture fails, still show overlay (will show black background)
        showOverlayAndSetupCanvas();
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
    
    // Remove fade-in class if present
    canvas.classList.remove('fade-in');
    // Add fade-out class for smooth exit animation
    canvas.classList.add('fade-out');
    
    // Wait for fade-out animation to complete before hiding overlay
    setTimeout(() => {
      overlayContainer.classList.remove('active');
      updateToolbarVisibility();
      // Hide reflection button when overlay is closed
      reflectionButton.classList.remove('visible');
      // Hide control panel inputs when overlay is closed
      if (controlPanelInputs) controlPanelInputs.style.display = 'none';
      // Reset cursor to default
      canvas.style.cursor = 'default';
      // Remove fade-out class and reset opacity
      canvas.classList.remove('fade-out');
      canvas.style.opacity = '';
      isOpeningFromScreenshot = false;
    }, 150); // Match fade-out duration (150ms)
    
    // Reset canvas exit hold state
    isHoldingEscapeToExitCanvas = false;
    canvasExitHoldStartTime = 0;
    if (canvasExitHoldTimeout) {
      clearTimeout(canvasExitHoldTimeout);
      canvasExitHoldTimeout = null;
    }
    escapeKeyWasReleased = true; // Reset for next time
    
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
        // Reduced delay - video should be ready quickly after metadata loads
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
            // Start fade-in animation immediately
            backgroundFadeOpacity = 0;
            isBackgroundFading = true;
            backgroundFadeStartTime = Date.now();
            // Update toolbar visibility (will show when background fades in)
            updateToolbarVisibility();
            requestDraw();
            resolve();
          };
        }, 100); // Reduced from 300ms to 100ms - video should be ready faster
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
        // Clear selection bounds after fade-in completes if they weren't already cleared
        // (They might have been cleared when image was added to canvas)
        if (screenshotSelectionBounds && !isScreenshotMode) {
          screenshotSelectionBounds = null;
        }
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
      
      // If we have a selection (even if screenshot mode ended, keep exclusion during fade-in), exclude the selection area from the tint
      if (screenshotSelectionBounds && 
          screenshotSelectionBounds.width > 0 && screenshotSelectionBounds.height > 0) {
        const sel = screenshotSelectionBounds;
        // Draw tint in 4 rectangles around the selection area
        // Top rectangle
        ctx.fillRect(0, 0, clearWidth, sel.top);
        // Bottom rectangle
        ctx.fillRect(0, sel.top + sel.height, clearWidth, clearHeight - (sel.top + sel.height));
        // Left rectangle
        ctx.fillRect(0, sel.top, sel.left, sel.height);
        // Right rectangle
        ctx.fillRect(sel.left + sel.width, sel.top, clearWidth - (sel.left + sel.width), sel.height);
      } else {
        // No selection or not in screenshot mode - fill entire canvas
        ctx.fillRect(0, 0, clearWidth, clearHeight);
      }
    } else {
      // Fill with black background when fully faded in to prevent desktop showing through blurred edges
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, clearWidth, clearHeight);
    }
    
    // Draw cached blurred background (much faster than applying blur filter every frame)
    if (cachedBlurredBackground && cachedBlurredBackground.complete) {
      ctx.globalAlpha = backgroundFadeOpacity;
      
      // If we have a selection (even if screenshot mode ended, keep exclusion during fade-in), exclude the selection area from the blurred background
      if (screenshotSelectionBounds && 
          screenshotSelectionBounds.width > 0 && screenshotSelectionBounds.height > 0) {
        const sel = screenshotSelectionBounds;
        ctx.save();
        // Create a clipping path that excludes the selection area
        ctx.beginPath();
        // Top rectangle
        ctx.rect(0, 0, clearWidth, sel.top);
        // Bottom rectangle
        ctx.rect(0, sel.top + sel.height, clearWidth, clearHeight - (sel.top + sel.height));
        // Left rectangle
        ctx.rect(0, sel.top, sel.left, sel.height);
        // Right rectangle
        ctx.rect(sel.left + sel.width, sel.top, clearWidth - (sel.left + sel.width), sel.height);
        ctx.clip();
        // Draw cached background scaled up to full size (it's stored at 50% resolution)
        ctx.drawImage(cachedBlurredBackground, 0, 0, clearWidth, clearHeight);
        ctx.restore();
      } else {
        // No selection or not in screenshot mode - draw normally
        // Draw cached background scaled up to full size (it's stored at 50% resolution)
        ctx.drawImage(cachedBlurredBackground, 0, 0, clearWidth, clearHeight);
      }
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
  // CRITICAL: Never draw images with hidden = true, regardless of any other conditions
  if (isReflectionMode && reflectionImageIndex >= 0) {
    // In reflection mode, only draw the reflection image
    const reflectionImg = images[reflectionImageIndex];
    if (reflectionImg && !reflectionImg.hidden) {
      drawImage(reflectionImg, selectedImageIndices.includes(reflectionImageIndex));
    }
    
    // Animate fade-out of other images during reflection mode transition
    // But only if we've exited reflection mode at least once (for button-click entry)
    // NEVER draw hidden images
    const currentTime = Date.now();
    images.forEach((img, index) => {
      if (index !== reflectionImageIndex && !img.hidden && img.fadeStartTime !== undefined && hasExitedReflectionModeOnce) {
        const fadeElapsed = currentTime - img.fadeStartTime;
        const fadeProgress = Math.min(fadeElapsed / img.fadeDuration, 1);
        img.opacity = 1.0 - fadeProgress; // Fade from 1.0 to 0.0
        if (fadeProgress < 1) {
          // Continue drawing during fade
          drawImage(img, false);
        }
      }
    });
  } else if (isTransitioningToReflectionMode || !hasExitedReflectionModeOnce) {
    // During transition to reflection mode OR before first exit from reflection mode
    // ONLY draw the selected image(s) - absolutely never draw other images
    // This ensures other images stay invisible until first exit
    images.forEach((img, index) => {
      // Only draw if it's selected AND not hidden
      if (selectedImageIndices.includes(index) && !img.hidden) {
        const currentTime = Date.now();
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
        drawImage(img, true);
      }
      // Explicitly skip all other images - don't draw them at all
    });
  } else {
    // Normal mode - after first exit from reflection mode
    // Draw all images that are not hidden
    const currentTime = Date.now();
    images.forEach((img, index) => {
      // Still respect the hidden flag - never draw hidden images
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
  } else if (isTransitioningToReflectionMode) {
    // During transition, only draw pins for the selected image
    if (selectedImageIndices.length === 1 && selectedImageIndices[0] >= 0 && selectedImageIndices[0] < images.length) {
      const selectedImg = images[selectedImageIndices[0]];
      if (!selectedImg.hidden) {
        drawPins(selectedImg, true);
      }
    }
  } else {
    // In normal mode, draw pins for all visible images
    // Only show pins for other images if we've exited reflection mode at least once
    images.forEach((img, index) => {
      if (!img.hidden) {
        // During initial transition (before first exit), only show pins for selected image
        if (!hasExitedReflectionModeOnce && !selectedImageIndices.includes(index)) {
          return; // Skip other images
        }
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
  
  // Don't draw selection border or handles in reflection mode
  if (isReflectionMode) {
    return;
  }
  
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

// Helper function to calculate angle for dot, with SVG treated as one item in even spacing
// SVG is at 12 o'clock (-90°), all items (SVG + dots) are evenly spaced around the circle
// First dot is opposite SVG (6 o'clock, 90°), then dots continue evenly spaced
// For emotional type, excludes a larger reserved area around the SVG to prevent overlap
function calculateDotAngle(index, totalCount, type = 'emotional') {
  if (totalCount === 0) return 0;
  
  const svgAngle = -Math.PI / 2; // -90 degrees (12 o'clock) where SVG is positioned
  const totalItems = totalCount + 1; // Total items: dots + SVG
  
  // Calculate angle spacing between all items (including SVG)
  const angleStep = (2 * Math.PI) / totalItems;
  
  // For emotional type, define a larger reserved area around the SVG to prevent overlap
  // Reserved area is centered at -90° (12 o'clock) where the SVG is
  const reservedAreaSize = type === 'emotional' ? Math.PI / 3 : 0; // 60 degrees for emotional, none for value
  const reservedAreaStart = svgAngle - reservedAreaSize / 2;
  const reservedAreaEnd = svgAngle + reservedAreaSize / 2;
  
  // Calculate all available positions (excluding position 0 where SVG is)
  const availablePositions = [];
  for (let i = 1; i < totalItems; i++) {
    let angle = svgAngle + (i * angleStep);
    angle = ((angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    
    // For emotional type, exclude positions within the reserved area
    if (type === 'emotional' && reservedAreaSize > 0) {
      // Check if angle is within reserved area (accounting for wrapping)
      let inReservedArea = false;
      
      // Normalize reserved area bounds
      let startNorm = ((reservedAreaStart % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
      let endNorm = ((reservedAreaEnd % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
      
      if (startNorm <= endNorm) {
        // Normal case: reserved area doesn't wrap
        inReservedArea = angle >= startNorm && angle <= endNorm;
      } else {
        // Wrapped case: reserved area crosses 0°
        inReservedArea = angle >= startNorm || angle <= endNorm;
      }
      
      if (inReservedArea) {
        continue; // Skip this position - it's in the reserved area
      }
    }
    
    availablePositions.push(i);
  }
  
  // If we excluded too many positions, fall back to all positions (except 0)
  if (availablePositions.length < totalCount) {
    availablePositions.length = 0;
    for (let i = 1; i < totalItems; i++) {
      availablePositions.push(i);
    }
  }
  
  // Find which position is closest to opposite (90°)
  const oppositeAngle = Math.PI / 2; // 90°
  let closestPos = availablePositions[0];
  let minDiff = Infinity;
  
  for (const pos of availablePositions) {
    let angle = svgAngle + (pos * angleStep);
    angle = ((angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    
    // Calculate difference to opposite, considering wrapping
    let diff = Math.abs(angle - oppositeAngle);
    if (diff > Math.PI) {
      diff = 2 * Math.PI - diff;
    }
    
    if (diff < minDiff) {
      minDiff = diff;
      closestPos = pos;
    }
  }
  
  // Sort positions starting from closest to opposite, then going clockwise
  const sortedPositions = availablePositions.sort((a, b) => {
    // First position is the one closest to opposite
    if (a === closestPos) return -1;
    if (b === closestPos) return 1;
    
    // For others, sort by angle going clockwise from closest
    let angleA = ((svgAngle + (a * angleStep)) % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI);
    let angleB = ((svgAngle + (b * angleStep)) % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI);
    let closestAngle = ((svgAngle + (closestPos * angleStep)) % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI);
    
    // Normalize relative to closest
    let relA = angleA - closestAngle;
    let relB = angleB - closestAngle;
    if (relA < 0) relA += 2 * Math.PI;
    if (relB < 0) relB += 2 * Math.PI;
    
    return relA - relB;
  });
  
  // Get position for this dot index
  if (index >= sortedPositions.length) {
    // Fallback if index is out of range
    return oppositeAngle;
  }
  
  const dotPosition = sortedPositions[index];
  let angle = svgAngle + (dotPosition * angleStep);
  
  // Normalize to 0-2π range
  angle = ((angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
  
  return angle;
}

// Helper function to get animated angle for dot repositioning
function getAnimatedDotAngle(pinId, type, index, currentAngle) {
  const animation = dotPositionAnimations[pinId];
  if (!animation || !animation[type]) {
    return currentAngle; // No animation, return current angle
  }
  
  const anim = animation[type];
  const elapsed = Date.now() - anim.startTime;
  const progress = Math.min(elapsed / anim.duration, 1.0);
  
  // Apply ease-out easing
  const easedProgress = 1 - Math.pow(1 - progress, 3);
  
  // If animation is complete, clean it up
  if (progress >= 1.0) {
    delete dotPositionAnimations[pinId][type];
    if (Object.keys(dotPositionAnimations[pinId]).length === 0) {
      delete dotPositionAnimations[pinId];
    }
    return currentAngle;
  }
  
  // Interpolate between old and new angle
  const oldAngle = anim.oldAngles[index];
  const newAngle = anim.newAngles[index];
  
  if (oldAngle === undefined || newAngle === undefined) {
    return currentAngle; // Fallback if angles not found
  }
  
  // Handle angle wrapping (shortest path)
  let angleDiff = newAngle - oldAngle;
  if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
  
  return oldAngle + angleDiff * easedProgress;
}

// Helper function to get animated radius for new dots (starts from 0, animates to target radius)
function getAnimatedDotRadius(pinId, type, index, targetRadius) {
  const animation = dotPositionAnimations[pinId];
  if (!animation || !animation[type]) {
    return targetRadius; // No animation, return target radius
  }
  
  const anim = animation[type];
  const isNew = anim.isNewDot && anim.isNewDot[index];
  
  if (!isNew) {
    return targetRadius; // Existing dot, use target radius immediately
  }
  
  const elapsed = Date.now() - anim.startTime;
  const progress = Math.min(elapsed / anim.duration, 1.0);
  
  // Apply ease-out easing for smooth animation
  const easedProgress = 1 - Math.pow(1 - progress, 3);
  
  // Start from 0, animate to target radius
  return targetRadius * easedProgress;
}

// Helper function to get animated opacity for new dots (starts from 0, fades in to 1)
function getAnimatedDotOpacity(pinId, type, index, baseOpacity) {
  const animation = dotPositionAnimations[pinId];
  if (!animation || !animation[type]) {
    return baseOpacity; // No animation, return base opacity
  }
  
  const anim = animation[type];
  const isNew = anim.isNewDot && anim.isNewDot[index];
  
  if (!isNew) {
    return baseOpacity; // Existing dot, use base opacity immediately
  }
  
  const elapsed = Date.now() - anim.startTime;
  const progress = Math.min(elapsed / anim.duration, 1.0);
  
  // Apply ease-out easing for smooth fade-in
  const easedProgress = 1 - Math.pow(1 - progress, 3);
  
  // Start from 0, fade in to base opacity
  return baseOpacity * easedProgress;
}

// Helper function to start dot repositioning animation
function startDotRepositionAnimation(pinId, type, oldCount, newCount) {
  if (!dotPositionAnimations[pinId]) {
    dotPositionAnimations[pinId] = {};
  }
  
  // Calculate old and new angles (with SVG as part of even spacing)
  const oldAngles = [];
  const newAngles = [];
  const isNewDot = []; // Track which dots are newly added
  
  for (let i = 0; i < newCount; i++) {
    if (i < oldCount) {
      // Existing dot - calculate old and new positions
      oldAngles.push(calculateDotAngle(i, oldCount, type));
      newAngles.push(calculateDotAngle(i, newCount, type));
      isNewDot.push(false);
    } else {
      // New dot - start from center (angle doesn't matter, radius will be 0)
      // We'll use the final angle but start from center
      const finalAngle = calculateDotAngle(i, newCount, type);
      oldAngles.push(finalAngle); // Angle doesn't matter since radius starts at 0
      newAngles.push(finalAngle);
      isNewDot.push(true);
    }
  }
  
  dotPositionAnimations[pinId][type] = {
    startTime: Date.now(),
    duration: DOT_REPOSITION_DURATION,
    oldAngles: oldAngles,
    newAngles: newAngles,
    isNewDot: isNewDot
  };
  
  // Lower DPR during animation for smooth performance
  canvasNeedsReinit = true; // Force canvas reinit to apply new DPR
  
  // Trigger continuous redraw during animation
  const animate = () => {
    if (!dotPositionAnimations[pinId] || !dotPositionAnimations[pinId][type]) {
      // Animation was cancelled or completed - restore DPR if needed
      canvasNeedsReinit = true;
      requestDraw();
      return;
    }
    
    const anim = dotPositionAnimations[pinId][type];
    const elapsed = Date.now() - anim.startTime;
    const progress = elapsed / anim.duration;
    
    if (progress < 1.0) {
      requestDraw();
      requestAnimationFrame(animate);
    } else {
      // Animation complete - restore DPR
      delete dotPositionAnimations[pinId][type];
      if (Object.keys(dotPositionAnimations[pinId]).length === 0) {
        delete dotPositionAnimations[pinId];
      }
      canvasNeedsReinit = true; // Trigger canvas reinit to restore normal DPR
      requestDraw();
    }
  };
  
  requestAnimationFrame(animate);
}

// Helper function to start pin expansion animation
function startPinExpansionAnimation(pinId, fromState, toState) {
  pinExpansionAnimation = {
    pinId: pinId,
    startTime: Date.now(),
    duration: PIN_EXPANSION_DURATION,
    fromState: fromState,
    toState: toState
  };
  
  // Lower DPR during animation for smooth performance
  // Check if DPR will change and trigger canvas reinit if needed
  const oldDPR = getDevicePixelRatio();
  canvasNeedsReinit = true; // Force canvas reinit to apply new DPR
  
  // Trigger continuous redraw during animation
  const animate = () => {
    if (!pinExpansionAnimation || pinExpansionAnimation.pinId !== pinId) {
      // Animation was cancelled or completed - restore DPR if needed
      canvasNeedsReinit = true;
      requestDraw();
      return;
    }
    
    const elapsed = Date.now() - pinExpansionAnimation.startTime;
    const progress = elapsed / pinExpansionAnimation.duration;
    
    if (progress < 1.0) {
      requestDraw();
      requestAnimationFrame(animate);
    } else {
      // Animation complete - restore DPR
      pinExpansionAnimation = null;
      canvasNeedsReinit = true; // Trigger canvas reinit to restore normal DPR
      requestDraw();
    }
  };
  
  requestAnimationFrame(animate);
}

// Helper function to get animation progress for pin expansion
function getPinExpansionProgress(pinId) {
  if (!pinExpansionAnimation || pinExpansionAnimation.pinId !== pinId) {
    // No animation for this pin - check if it's expanded
    return expandedPinId === pinId ? 1.0 : 0.0;
  }
  
  const elapsed = Date.now() - pinExpansionAnimation.startTime;
  const progress = Math.min(elapsed / pinExpansionAnimation.duration, 1.0);
  
  // Apply bouncy easing (ease-out-back for overshoot effect)
  const easedProgress = easeOutBack(progress);
  
  // Handle direction: if collapsing, reverse the progress
  let finalProgress;
  if (pinExpansionAnimation.toState === 'collapsed') {
    // Collapsing: animate from 1.0 to 0.0 (reverse the bouncy easing)
    finalProgress = 1.0 - easedProgress;
  } else {
    // Expanding: animate from 0.0 to 1.0
    finalProgress = easedProgress;
  }
  
  // If animation is complete, clean it up and update expandedPinId
  if (progress >= 1.0) {
    if (pinExpansionAnimation.toState === 'collapsed') {
      expandedPinId = null;
    }
    pinExpansionAnimation = null;
  }
  
  return finalProgress;
}

// Draw pins on an image (called after transform is restored, so we draw in screen coordinates)
function drawPins(img, isImageSelected) {
  if (!img || !img.pins || img.pins.length === 0) return;
  
  const dpr = getDevicePixelRatio();
  ctx.save();
  
  // Clear hovered dot at start of each draw (will be set if mouse is over a dot)
  hoveredAspectDot = null;
  
  img.pins.forEach(pin => {
    // Filter pins based on reflection mode
    // When NOT in reflection mode: only show pins with feature, emotional aspects, and value aspects
    // When IN reflection mode: show all pins
    if (!isReflectionMode) {
      const hasFeature = pin.feature && pin.feature.trim().length > 0;
      const hasEmotionalAspects = pin.emotionalAspects && pin.emotionalAspects.length > 0;
      const hasValueAspects = pin.valueAspects && pin.valueAspects.length > 0;
      
      // Skip this pin if it doesn't have all required aspects
      if (!hasFeature || !hasEmotionalAspects || !hasValueAspects) {
        return; // Skip this pin
      }
    }
    
    // Calculate pin position in canvas coordinates
    const canvasX = img.x + (pin.location.x * img.width);
    const canvasY = img.y + (pin.location.y * img.height);
    
    // Convert to screen coordinates (transform is already restored, CSS pixels)
    const screenPos = canvasToScreen(canvasX, canvasY);
    const screenX = screenPos.x;
    const screenY = screenPos.y;
    
    const isSelected = selectedPinId === pin.id;
    const isExpanded = expandedPinId === pin.id;
    const hasEmotionalAspects = pin.emotionalAspects && pin.emotionalAspects.length > 0;
    const hasValueAspects = pin.valueAspects && pin.valueAspects.length > 0;
    const canExpand = hasEmotionalAspects || hasValueAspects; // Only expandable if aspects exist
    
    // Get animation progress (0.0 = collapsed, 1.0 = expanded)
    const expansionProgress = canExpand ? getPinExpansionProgress(pin.id) : 0.0;
    const isExpandedState = expansionProgress > 0.5 || (isExpanded && expansionProgress === 0.0);
    
    // Define radii for concentric rings (in CSS pixels - context is already scaled by dpr)
    const baseBlueRadius = isSelected ? 14 : 12; // Base blue circle size - bigger when selected
    // Blue pin is smaller in collapsed view when rings exist
    const blueRadiusCollapsed = baseBlueRadius * 0.75; // 75% of base size when collapsed with rings
    const blueRadiusExpanded = baseBlueRadius; // Full size when expanded
    // Interpolate blue radius during transition (smaller when collapsed, full size when expanded)
    const blueRadius = canExpand 
      ? blueRadiusCollapsed + (blueRadiusExpanded - blueRadiusCollapsed) * expansionProgress
      : baseBlueRadius; // No rings, use base size
    const whiteStrokeWidth = 3; // White stroke width
    
    // Collapsed state radii
    const collapsedRingThickness = 10; // Thickness of yellow rings in collapsed state (increased by 2px)
    const collapsedGreenRingThickness = 10; // Thickness of green ring in collapsed state
    let collapsedYellowRingInnerRadius = blueRadius;
    let collapsedYellowRingOuterRadius = collapsedYellowRingInnerRadius + collapsedRingThickness;
    let collapsedGreenRingInnerRadius = hasEmotionalAspects ? collapsedYellowRingOuterRadius : blueRadius;
    let collapsedGreenRingOuterRadius = collapsedGreenRingInnerRadius + collapsedGreenRingThickness;
    
    // Limit collapsed pin size to max 1/4 of image width (in screen coordinates)
    // Calculate image width in screen coordinates
    const imageTopLeft = canvasToScreen(img.x, img.y);
    const imageTopRight = canvasToScreen(img.x + img.width, img.y);
    const imageScreenWidth = Math.abs(imageTopRight.x - imageTopLeft.x);
    const maxCollapsedRadius = imageScreenWidth * 0.25; // Max 1/4 of image width
    
    // If collapsed pin exceeds max size, scale all radii down proportionally
    if (collapsedGreenRingOuterRadius > maxCollapsedRadius && collapsedGreenRingOuterRadius > 0) {
      const scaleFactor = maxCollapsedRadius / collapsedGreenRingOuterRadius;
      // Scale all collapsed radii proportionally to maintain relative sizes
      collapsedGreenRingOuterRadius = maxCollapsedRadius;
      collapsedGreenRingInnerRadius *= scaleFactor;
      collapsedYellowRingOuterRadius *= scaleFactor;
      collapsedYellowRingInnerRadius *= scaleFactor;
    }
    
    // Expanded state radii with gaps
    const gapSize = 5; // Small gap between areas (reduced from 8 to 5)
    const expandedInnerOrbitRadius = 70; // Inner orbit for emotions (outer edge) - reduced thickness
    const expandedOuterOrbitRadius = 130; // Outer orbit for values (outer edge)
    const dotRadius = blueRadius; // Same size as blue pin
    const dotStrokeWidth = 3; // White border on dots (same as blue pin)
    const blurRadius = 4; // Blur radius for background blur effect (lighter blur)
    
    // Calculate expanded ring boundaries with gaps
    // Emotions area: starts after gap from blue, ends at innerOrbitRadius (thinner now)
    const emotionsAreaInnerRadius = blueRadius + gapSize;
    const emotionsAreaOuterRadius = expandedInnerOrbitRadius;
    // Values area: starts after gap from emotions, ends at outerOrbitRadius
    const valuesAreaInnerRadius = expandedInnerOrbitRadius + gapSize;
    const valuesAreaOuterRadius = expandedOuterOrbitRadius;
    
    // Calculate middle radius for dot positioning (center of each ring)
    const emotionsDotRadius = (emotionsAreaInnerRadius + emotionsAreaOuterRadius) / 2;
    const valuesDotRadius = (valuesAreaInnerRadius + valuesAreaOuterRadius) / 2;
    
    // Interpolate between collapsed and expanded states for smooth transition
    const innerOrbitRadius = collapsedYellowRingOuterRadius + (expandedInnerOrbitRadius - collapsedYellowRingOuterRadius) * expansionProgress;
    const outerOrbitRadius = collapsedGreenRingOuterRadius + (expandedOuterOrbitRadius - collapsedGreenRingOuterRadius) * expansionProgress;
    
    // Get values area animation progress (for scaling when first value aspect is added)
    // This animates separately when the first value aspect is added to an already-expanded pin
    const valuesAreaProgress = hasValueAspects ? getValuesAreaProgress(pin.id) : 1.0;
    
    // Interpolate gap and ring boundaries during animation
    const currentGapSize = gapSize * expansionProgress;
    const currentEmotionsAreaInnerRadius = blueRadius + currentGapSize;
    const currentEmotionsAreaOuterRadius = innerOrbitRadius;
    
    // Values area radii: interpolate from collapsed green ring to expanded size
    // When pin is already expanded (expansionProgress = 1.0), use valuesAreaProgress to scale from collapsed to expanded
    // When pin is expanding (expansionProgress < 1.0), use expansionProgress so it scales with the pin expansion
    const valuesAreaStartInnerRadius = hasEmotionalAspects ? collapsedYellowRingOuterRadius : blueRadius;
    const valuesAreaStartOuterRadius = collapsedGreenRingOuterRadius;
    const valuesAreaEndInnerRadius = innerOrbitRadius + currentGapSize;
    const valuesAreaEndOuterRadius = outerOrbitRadius;
    
    // Use valuesAreaProgress only if pin expansion is complete, otherwise use expansionProgress
    const valuesAreaScaleProgress = expansionProgress >= 1.0 ? valuesAreaProgress : expansionProgress;
    const currentValuesAreaInnerRadius = valuesAreaStartInnerRadius + (valuesAreaEndInnerRadius - valuesAreaStartInnerRadius) * valuesAreaScaleProgress;
    const currentValuesAreaOuterRadius = valuesAreaStartOuterRadius + (valuesAreaEndOuterRadius - valuesAreaStartOuterRadius) * valuesAreaScaleProgress;
    
    // Interpolate dot positions during animation
    const currentEmotionsDotRadius = (currentEmotionsAreaInnerRadius + currentEmotionsAreaOuterRadius) / 2;
    const currentValuesDotRadius = (currentValuesAreaInnerRadius + currentValuesAreaOuterRadius) / 2;
    
    // Draw from outside to inside to create proper layering
    
    // During transition, show both states with opacity based on progress
    // When progress < 0.5: show collapsed state fading out
    // When progress >= 0.5: show expanded state fading in
    
    if (expansionProgress < 0.5 && canExpand) {
      // TRANSITION: Collapsed state fading out (during expansion) or fading in (during collapse)
      const collapsedFade = expansionProgress < 0.5 ? (1.0 - expansionProgress * 2) : (expansionProgress - 0.5) * 2;
      
      // Draw green ring (outermost) if value aspects exist
      if (hasValueAspects) {
        ctx.save();
        ctx.globalAlpha = collapsedFade;
        
        // Interpolate ring size during transition
        const currentGreenOuter = collapsedGreenRingOuterRadius + (expandedOuterOrbitRadius - collapsedGreenRingOuterRadius) * expansionProgress;
        const currentGreenInner = collapsedGreenRingInnerRadius + (expandedOuterOrbitRadius - collapsedGreenRingInnerRadius) * expansionProgress;
        
        // Draw green ring as a donut shape
        ctx.fillStyle = '#4CB948'; // Green
        ctx.beginPath();
        ctx.arc(screenX, screenY, currentGreenOuter, 0, Math.PI * 2);
        ctx.arc(screenX, screenY, currentGreenInner, 0, Math.PI * 2, true); // Counter-clockwise to create hole
        ctx.fill();
        
        // White stroke on outer edge of green ring only
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = whiteStrokeWidth;
        ctx.beginPath();
        ctx.arc(screenX, screenY, currentGreenOuter, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
      }
      
      // Draw yellow ring if emotional aspects exist
      if (hasEmotionalAspects) {
        ctx.save();
        ctx.globalAlpha = collapsedFade;
        
        // Interpolate ring size during transition
        const currentYellowOuter = collapsedYellowRingOuterRadius + (expandedInnerOrbitRadius - collapsedYellowRingOuterRadius) * expansionProgress;
        const currentYellowInner = collapsedYellowRingInnerRadius + (expandedInnerOrbitRadius - collapsedYellowRingInnerRadius) * expansionProgress;
        
        // Draw yellow ring as a donut shape
        ctx.fillStyle = '#F0CE25'; // Yellow
        ctx.beginPath();
        ctx.arc(screenX, screenY, currentYellowOuter, 0, Math.PI * 2);
        ctx.arc(screenX, screenY, currentYellowInner, 0, Math.PI * 2, true); // Counter-clockwise to create hole
        ctx.fill();
        
        // White stroke on outer edge of yellow ring only
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = whiteStrokeWidth;
        ctx.beginPath();
        ctx.arc(screenX, screenY, currentYellowOuter, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
      }
    }
    
    if (isExpandedState && canExpand) {
      // EXPANDED STATE: Draw orbital rings with dots
      
      // Draw semi-transparent green background ring for values orbit (outermost)
      if (hasValueAspects) {
        // Use the same progress that was used for scaling the radii (valuesAreaScaleProgress)
        // This ensures opacity matches the scale animation
        const combinedProgress = valuesAreaScaleProgress;
        
        // Create blurred background effect
        const blurAmount = blurRadius * combinedProgress;
        if (blurAmount > 0 && img.element) {
          // Get the area to blur (in screen coordinates)
          const areaSize = Math.ceil(currentValuesAreaOuterRadius * 2);
          const areaX = Math.floor(screenX - currentValuesAreaOuterRadius);
          const areaY = Math.floor(screenY - currentValuesAreaOuterRadius);
          
          // Calculate pin position in canvas coordinates
          const canvasX = img.x + (pin.location.x * img.width);
          const canvasY = img.y + (pin.location.y * img.height);
          
          // Convert screen coordinates to canvas coordinates for the area
          const areaCanvasTopLeft = screenToCanvas(areaX, areaY);
          const areaCanvasBottomRight = screenToCanvas(areaX + areaSize, areaY + areaSize);
          const areaCanvasWidth = areaCanvasBottomRight.x - areaCanvasTopLeft.x;
          const areaCanvasHeight = areaCanvasBottomRight.y - areaCanvasTopLeft.y;
          
          // Calculate position within the image (in image pixel coordinates)
          const pinImageX = pin.location.x * img.element.naturalWidth;
          const pinImageY = pin.location.y * img.element.naturalHeight;
          
          // Calculate the area size in image coordinates (scale by image size / canvas size)
          const imageToCanvasScaleX = img.element.naturalWidth / img.width;
          const imageToCanvasScaleY = img.element.naturalHeight / img.height;
          const areaImageSizeX = areaCanvasWidth * imageToCanvasScaleX;
          const areaImageSizeY = areaCanvasHeight * imageToCanvasScaleY;
          let areaImageX = pinImageX - areaImageSizeX / 2;
          let areaImageY = pinImageY - areaImageSizeY / 2;
          
          // Clamp to image bounds
          const imageWidth = img.element.naturalWidth;
          const imageHeight = img.element.naturalHeight;
          areaImageX = Math.max(0, Math.min(areaImageX, imageWidth - areaImageSizeX));
          areaImageY = Math.max(0, Math.min(areaImageY, imageHeight - areaImageSizeY));
          
          // Create temporary canvas for blur effect
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = areaSize;
          tempCanvas.height = areaSize;
          const tempCtx = tempCanvas.getContext('2d');
          
          // Fill with transparent background first
          tempCtx.clearRect(0, 0, areaSize, areaSize);
          
          // Draw only the image content to temp canvas (not the entire canvas)
          tempCtx.drawImage(
            img.element,
            areaImageX, areaImageY, areaImageSizeX, areaImageSizeY, // Source: image coordinates
            0, 0, areaSize, areaSize // Destination: temp canvas
          );
          
          // Create a second temp canvas for the blurred result
          const blurCanvas = document.createElement('canvas');
          blurCanvas.width = areaSize;
          blurCanvas.height = areaSize;
          const blurCtx = blurCanvas.getContext('2d');
          
          // Apply blur filter and draw the captured content
          blurCtx.filter = `blur(${blurAmount}px)`;
          blurCtx.drawImage(tempCanvas, 0, 0);
          
          // Create clipping path for donut shape
          ctx.save();
          ctx.beginPath();
          ctx.arc(screenX, screenY, currentValuesAreaOuterRadius, 0, Math.PI * 2);
          ctx.arc(screenX, screenY, currentValuesAreaInnerRadius, 0, Math.PI * 2, true);
          ctx.clip();
          
          // Draw blurred background
          ctx.drawImage(blurCanvas, areaX, areaY);
          ctx.restore();
        }
        
        // Then draw the semi-transparent colored overlay
        const bgOpacity = 0.35 * combinedProgress; // Moderate transparency (0.3-0.4)
        ctx.fillStyle = `rgba(76, 185, 72, ${bgOpacity})`; // Green with transparency
        ctx.beginPath();
        ctx.arc(screenX, screenY, currentValuesAreaOuterRadius, 0, Math.PI * 2);
        ctx.arc(screenX, screenY, currentValuesAreaInnerRadius, 0, Math.PI * 2, true); // Counter-clockwise to create hole
        ctx.fill();
        
        // Draw value aspect dots
        const valueAspectCount = pin.valueAspects.length;
        if (valueAspectCount > 0) {
          const dotOpacity = combinedProgress; // Fade in dots as ring expands
          
          pin.valueAspects.forEach((aspect, index) => {
            // Calculate target angle for even distribution (excluding upper eighth for text)
            const targetAngle = calculateDotAngle(index, valueAspectCount, 'value');
            // Get animated angle (interpolates during repositioning)
            const angle = getAnimatedDotAngle(pin.id, 'value', index, targetAngle);
            // Get animated radius (new dots start from center, existing dots use full radius)
            const animatedRadius = getAnimatedDotRadius(pin.id, 'value', index, currentValuesDotRadius);
            // Position dots - new dots start from center, existing dots use animated radius
            const dotX = screenX + Math.cos(angle) * animatedRadius;
            const dotY = screenY + Math.sin(angle) * animatedRadius;
            
            // Get animated opacity (new dots fade in)
            const animatedOpacity = getAnimatedDotOpacity(pin.id, 'value', index, dotOpacity);
            
            // Draw dot with white border (same size as blue pin)
            ctx.save();
            ctx.globalAlpha = animatedOpacity;
            ctx.fillStyle = '#4CB948'; // Green
            ctx.beginPath();
            ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = dotStrokeWidth;
            ctx.stroke();
            ctx.restore();
            
            // Store dot position for hover detection (only if expanded and visible)
            if (combinedProgress > 0.5) {
              // Check if mouse is hovering over this dot
              const dx = lastMouseX - dotX;
              const dy = lastMouseY - dotY;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance <= dotRadius + 5) { // 5px hover margin
                hoveredAspectDot = {
                  pinId: pin.id,
                  type: 'value',
                  index: index,
                  text: aspect,
                  x: dotX,
                  y: dotY
                };
              }
            }
          });
        }
        
        // Draw "Values" label SVG (curved along the ring, upper-middle section)
        if (valuesLabelImage && valuesLabelImage.complete && valuesLabelImage.naturalWidth > 0) {
          ctx.save();
          ctx.globalAlpha = combinedProgress;
          
          // Position SVG along the curve of the values ring (upper-middle, angle = -90 degrees)
          const valuesLabelAngle = -Math.PI / 2; // -90 degrees (top)
          const valuesLabelRadius = currentValuesDotRadius; // Use middle radius of the ring
          const valuesLabelX = screenX + Math.cos(valuesLabelAngle) * valuesLabelRadius;
          const valuesLabelY = screenY + Math.sin(valuesLabelAngle) * valuesLabelRadius;
          
          // Transform to rotate SVG along the curve
          ctx.translate(valuesLabelX, valuesLabelY);
          ctx.rotate(valuesLabelAngle + Math.PI / 2); // Rotate 90 degrees to align with curve
          
          // Draw SVG image (scale to appropriate size - bigger)
          const svgWidth = 48; // SVG viewBox width
          const svgHeight = 15; // SVG viewBox height
          const scale = 1.4; // Scale factor (bigger)
          ctx.drawImage(valuesLabelImage, -svgWidth / 2 * scale, -svgHeight / 2 * scale, svgWidth * scale, svgHeight * scale);
          ctx.restore();
        }
      }
      
      // Draw semi-transparent yellow background ring for emotions orbit
      if (hasEmotionalAspects) {
        // Create blurred background effect
        const blurAmount = blurRadius * expansionProgress;
        if (blurAmount > 0 && img.element) {
          // Get the area to blur (in screen coordinates)
          const areaSize = Math.ceil(currentEmotionsAreaOuterRadius * 2);
          const areaX = Math.floor(screenX - currentEmotionsAreaOuterRadius);
          const areaY = Math.floor(screenY - currentEmotionsAreaOuterRadius);
          
          // Calculate pin position in canvas coordinates
          const canvasX = img.x + (pin.location.x * img.width);
          const canvasY = img.y + (pin.location.y * img.height);
          
          // Convert screen coordinates to canvas coordinates for the area
          const areaCanvasTopLeft = screenToCanvas(areaX, areaY);
          const areaCanvasBottomRight = screenToCanvas(areaX + areaSize, areaY + areaSize);
          const areaCanvasWidth = areaCanvasBottomRight.x - areaCanvasTopLeft.x;
          const areaCanvasHeight = areaCanvasBottomRight.y - areaCanvasTopLeft.y;
          
          // Calculate position within the image (in image pixel coordinates)
          const pinImageX = pin.location.x * img.element.naturalWidth;
          const pinImageY = pin.location.y * img.element.naturalHeight;
          
          // Calculate the area size in image coordinates (scale by image size / canvas size)
          const imageToCanvasScaleX = img.element.naturalWidth / img.width;
          const imageToCanvasScaleY = img.element.naturalHeight / img.height;
          const areaImageSizeX = areaCanvasWidth * imageToCanvasScaleX;
          const areaImageSizeY = areaCanvasHeight * imageToCanvasScaleY;
          let areaImageX = pinImageX - areaImageSizeX / 2;
          let areaImageY = pinImageY - areaImageSizeY / 2;
          
          // Clamp to image bounds
          const imageWidth = img.element.naturalWidth;
          const imageHeight = img.element.naturalHeight;
          areaImageX = Math.max(0, Math.min(areaImageX, imageWidth - areaImageSizeX));
          areaImageY = Math.max(0, Math.min(areaImageY, imageHeight - areaImageSizeY));
          
          // Create temporary canvas for blur effect
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = areaSize;
          tempCanvas.height = areaSize;
          const tempCtx = tempCanvas.getContext('2d');
          
          // Fill with transparent background first
          tempCtx.clearRect(0, 0, areaSize, areaSize);
          
          // Draw only the image content to temp canvas (not the entire canvas)
          tempCtx.drawImage(
            img.element,
            areaImageX, areaImageY, areaImageSizeX, areaImageSizeY, // Source: image coordinates
            0, 0, areaSize, areaSize // Destination: temp canvas
          );
          
          // Create a second temp canvas for the blurred result
          const blurCanvas = document.createElement('canvas');
          blurCanvas.width = areaSize;
          blurCanvas.height = areaSize;
          const blurCtx = blurCanvas.getContext('2d');
          
          // Apply blur filter and draw the captured content
          blurCtx.filter = `blur(${blurAmount}px)`;
          blurCtx.drawImage(tempCanvas, 0, 0);
          
          // Create clipping path for donut shape
          ctx.save();
          ctx.beginPath();
          ctx.arc(screenX, screenY, currentEmotionsAreaOuterRadius, 0, Math.PI * 2);
          ctx.arc(screenX, screenY, currentEmotionsAreaInnerRadius, 0, Math.PI * 2, true);
          ctx.clip();
          
          // Draw blurred background
          ctx.drawImage(blurCanvas, areaX, areaY);
          ctx.restore();
        }
        
        // Then draw the semi-transparent colored overlay
        const bgOpacity = 0.35 * expansionProgress; // Moderate transparency (0.3-0.4)
        ctx.fillStyle = `rgba(240, 206, 37, ${bgOpacity})`; // Yellow with transparency
        ctx.beginPath();
        ctx.arc(screenX, screenY, currentEmotionsAreaOuterRadius, 0, Math.PI * 2);
        ctx.arc(screenX, screenY, currentEmotionsAreaInnerRadius, 0, Math.PI * 2, true); // Counter-clockwise to create hole
        ctx.fill();
        
        // Draw emotional aspect dots
        const emotionalAspectCount = pin.emotionalAspects.length;
        if (emotionalAspectCount > 0) {
          const dotOpacity = expansionProgress; // Fade in dots as ring expands
          
          pin.emotionalAspects.forEach((aspect, index) => {
            // Calculate target angle for even distribution (excluding upper quarter for text)
            const targetAngle = calculateDotAngle(index, emotionalAspectCount, 'emotional');
            // Get animated angle (interpolates during repositioning)
            const angle = getAnimatedDotAngle(pin.id, 'emotional', index, targetAngle);
            // Get animated radius (new dots start from center, existing dots use full radius)
            const animatedRadius = getAnimatedDotRadius(pin.id, 'emotional', index, currentEmotionsDotRadius);
            // Position dots - new dots start from center, existing dots use animated radius
            const dotX = screenX + Math.cos(angle) * animatedRadius;
            const dotY = screenY + Math.sin(angle) * animatedRadius;
            
            // Get animated opacity (new dots fade in)
            const animatedOpacity = getAnimatedDotOpacity(pin.id, 'emotional', index, dotOpacity);
            
            // Draw dot with white border (same size as blue pin)
            ctx.save();
            ctx.globalAlpha = animatedOpacity;
            ctx.fillStyle = '#F0CE25'; // Yellow
            ctx.beginPath();
            ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = dotStrokeWidth;
            ctx.stroke();
            ctx.restore();
            
            // Store dot position for hover detection (only if expanded and visible)
            if (expansionProgress > 0.5) {
              // Check if mouse is hovering over this dot
              const dx = lastMouseX - dotX;
              const dy = lastMouseY - dotY;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance <= dotRadius + 5) { // 5px hover margin
                hoveredAspectDot = {
                  pinId: pin.id,
                  type: 'emotional',
                  index: index,
                  text: aspect,
                  x: dotX,
                  y: dotY
                };
              }
            }
          });
        }
        
        // Draw "Emotions" label SVG (curved along the ring, 12 o'clock position)
        if (emotionsLabelImage && emotionsLabelImage.complete && emotionsLabelImage.naturalWidth > 0) {
          ctx.save();
          ctx.globalAlpha = expansionProgress;
          
          // Position SVG along the curve of the emotions ring (12 o'clock, angle = -90 degrees)
          const emotionsLabelAngle = -Math.PI / 2; // -90 degrees (12 o'clock)
          const emotionsLabelRadius = currentEmotionsDotRadius; // Use middle radius of the ring
          const emotionsLabelX = screenX + Math.cos(emotionsLabelAngle) * emotionsLabelRadius;
          const emotionsLabelY = screenY + Math.sin(emotionsLabelAngle) * emotionsLabelRadius;
          
          // Transform to rotate SVG along the curve
          ctx.translate(emotionsLabelX, emotionsLabelY);
          ctx.rotate(emotionsLabelAngle + Math.PI / 2); // Rotate 90 degrees to align with curve
          
          // Draw SVG image (scale to appropriate size - bigger)
          const svgWidth = 64; // SVG viewBox width
          const svgHeight = 23; // SVG viewBox height
          const scale = 1.4; // Scale factor (bigger)
          ctx.drawImage(emotionsLabelImage, -svgWidth / 2 * scale, -svgHeight / 2 * scale, svgWidth * scale, svgHeight * scale);
          ctx.restore();
        }
      }
    } else if (expansionProgress === 0.0) {
      // FULLY COLLAPSED STATE: Draw solid rings (existing behavior, no animation)
      
      // Draw green ring (outermost) if value aspects exist
      if (hasValueAspects) {
        // Draw green ring as a donut shape
        ctx.fillStyle = '#4CB948'; // Green
        ctx.beginPath();
        ctx.arc(screenX, screenY, collapsedGreenRingOuterRadius, 0, Math.PI * 2);
        ctx.arc(screenX, screenY, collapsedGreenRingInnerRadius, 0, Math.PI * 2, true); // Counter-clockwise to create hole
        ctx.fill();
        
        // White stroke on outer edge of green ring only
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = whiteStrokeWidth;
        ctx.beginPath();
        ctx.arc(screenX, screenY, collapsedGreenRingOuterRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Draw yellow ring if emotional aspects exist
      if (hasEmotionalAspects) {
        // Draw yellow ring as a donut shape
        ctx.fillStyle = '#F0CE25'; // Yellow
        ctx.beginPath();
        ctx.arc(screenX, screenY, collapsedYellowRingOuterRadius, 0, Math.PI * 2);
        ctx.arc(screenX, screenY, collapsedYellowRingInnerRadius, 0, Math.PI * 2, true); // Counter-clockwise to create hole
        ctx.fill();
        
        // White stroke on outer edge of yellow ring only
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = whiteStrokeWidth;
        ctx.beginPath();
        ctx.arc(screenX, screenY, collapsedYellowRingOuterRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    
    // Draw blue circle (innermost) - always visible, same size in both states
    ctx.fillStyle = '#008CFF'; // Blue
    ctx.beginPath();
    ctx.arc(screenX, screenY, blueRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // White stroke around blue circle
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = whiteStrokeWidth;
    ctx.beginPath();
    ctx.arc(screenX, screenY, blueRadius, 0, Math.PI * 2);
    ctx.stroke();
  });
  
  // Draw tooltip for hovered aspect dot
  if (hoveredAspectDot) {
    ctx.save();
    
    // Tooltip styling
    const tooltipPadding = 8;
    const tooltipFontSize = 14;
    const tooltipMaxWidth = 200;
    
    ctx.font = `${tooltipFontSize}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    // Measure text
    const textMetrics = ctx.measureText(hoveredAspectDot.text);
    const textWidth = Math.min(textMetrics.width, tooltipMaxWidth);
    const textHeight = tooltipFontSize;
    
    // Calculate tooltip position (offset from dot)
    const tooltipOffsetX = 20; // Offset to the right of dot (increased from 15 to 20)
    const tooltipOffsetY = -textHeight / 2 - 10; // Center vertically with dot, then move 10px up
    const tooltipX = hoveredAspectDot.x + tooltipOffsetX;
    const tooltipY = hoveredAspectDot.y + tooltipOffsetY;
    
    // Tooltip background
    const tooltipWidth = textWidth + tooltipPadding * 2;
    const tooltipHeight = textHeight + tooltipPadding * 2;
    
    // Draw tooltip background with rounded corners
    ctx.fillStyle = 'rgba(128, 128, 128, 0.9)'; // Gray background
    const cornerRadius = 6;
    ctx.beginPath();
    ctx.moveTo(tooltipX + cornerRadius, tooltipY);
    ctx.lineTo(tooltipX + tooltipWidth - cornerRadius, tooltipY);
    ctx.quadraticCurveTo(tooltipX + tooltipWidth, tooltipY, tooltipX + tooltipWidth, tooltipY + cornerRadius);
    ctx.lineTo(tooltipX + tooltipWidth, tooltipY + tooltipHeight - cornerRadius);
    ctx.quadraticCurveTo(tooltipX + tooltipWidth, tooltipY + tooltipHeight, tooltipX + tooltipWidth - cornerRadius, tooltipY + tooltipHeight);
    ctx.lineTo(tooltipX + cornerRadius, tooltipY + tooltipHeight);
    ctx.quadraticCurveTo(tooltipX, tooltipY + tooltipHeight, tooltipX, tooltipY + tooltipHeight - cornerRadius);
    ctx.lineTo(tooltipX, tooltipY + cornerRadius);
    ctx.quadraticCurveTo(tooltipX, tooltipY, tooltipX + cornerRadius, tooltipY);
    ctx.closePath();
    ctx.fill();
    
    // Draw tooltip border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw tooltip text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(hoveredAspectDot.text, tooltipX + tooltipPadding, tooltipY + tooltipPadding);
    
    ctx.restore();
  }
  
  ctx.restore();
}

// Get pin at screen coordinates
function getPinAt(screenX, screenY, img) {
  if (!img || !img.pins || img.pins.length === 0) return null;
  
  // Convert viewport coordinates to canvas-relative screen coordinates for comparison (CSS pixels)
  const rect = canvas.getBoundingClientRect();
  const canvasRelativeX = screenX - rect.left;
  const canvasRelativeY = screenY - rect.top;
  const baseHitRadius = 18; // Base hit radius in CSS pixels (increased for easier clicking)
  const expandedHitRadius = 150; // Hit radius for expanded pins (outer orbit + margin)
  
  for (let i = img.pins.length - 1; i >= 0; i--) {
    const pin = img.pins[i];
    const canvasX = img.x + (pin.location.x * img.width);
    const canvasY = img.y + (pin.location.y * img.height);
    const screenPos = canvasToScreen(canvasX, canvasY); // Returns canvas-relative coordinates (CSS pixels)
    
    const dx = canvasRelativeX - screenPos.x;
    const dy = canvasRelativeY - screenPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Use expanded hit radius if pin is expanded, otherwise use base hit radius
    const isExpanded = expandedPinId === pin.id;
    const hitRadius = isExpanded ? expandedHitRadius : baseHitRadius;
    
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
  const cornerRadius = 8; // Fixed pixel corner radius (screen coordinates)
  const buttonLeft = buttonScreenX - buttonWidth / 2;
  
  // Calculate progress fill width if holding Escape to exit
  let progressFillWidth = 0;
  if (isReflectionMode && isHoldingEscapeToExit && escapeHoldStartTime > 0) {
    const holdElapsed = Date.now() - escapeHoldStartTime;
    const progress = Math.min(holdElapsed / ESCAPE_HOLD_DURATION, 1);
    progressFillWidth = buttonWidth * progress;
  }
  
  // Draw base button background (darker red for exit, blue for enter)
  ctx.fillStyle = isReflectionMode ? 'rgba(239, 68, 68, 0.95)' : 'rgba(59, 130, 246, 0.95)';
  
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
  
  // Draw progress fill from left to right (darker red) if holding Escape
  if (progressFillWidth > 0 && isReflectionMode) {
    // Use a darker red for the progress fill to show contrast
    ctx.fillStyle = 'rgba(185, 28, 28, 1.0)'; // Darker red for contrast
    
    // Draw progress fill with rounded left corners
    const fillRight = buttonLeft + progressFillWidth;
    // Only draw rounded corners if fill is wider than corner radius
    if (progressFillWidth > cornerRadius) {
      ctx.beginPath();
      ctx.moveTo(buttonLeft + cornerRadius, buttonScreenY);
      ctx.lineTo(fillRight, buttonScreenY);
      ctx.lineTo(fillRight, buttonScreenY + buttonHeight);
      ctx.lineTo(buttonLeft + cornerRadius, buttonScreenY + buttonHeight);
      ctx.quadraticCurveTo(buttonLeft, buttonScreenY + buttonHeight, buttonLeft, buttonScreenY + buttonHeight - cornerRadius);
      ctx.lineTo(buttonLeft, buttonScreenY + cornerRadius);
      ctx.quadraticCurveTo(buttonLeft, buttonScreenY, buttonLeft + cornerRadius, buttonScreenY);
      ctx.closePath();
      ctx.fill();
    } else {
      // If fill is narrower than corner radius, draw a simple rectangle
      ctx.fillRect(buttonLeft, buttonScreenY, progressFillWidth, buttonHeight);
    }
  }
  
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
  // Clear expanded pin state
  if (expandedPinId !== null) {
    expandedPinId = null;
    pinExpansionAnimation = null;
  }
  
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
        // Also set hidden flag to ensure they're not drawn
        image.hidden = true;
        image.opacity = 0.0;
        image.fadeStartTime = undefined; // No fade animation
        // Ensure flag is set so other images don't show until first exit
        hasExitedReflectionModeOnce = false;
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
  // Clear expanded pin state
  if (expandedPinId !== null) {
    expandedPinId = null;
    pinExpansionAnimation = null;
  }
  if (controlPanelInputs) controlPanelInputs.style.display = 'none';
  
  // Reset escape hold state
  isHoldingEscapeToExit = false;
  escapeHoldStartTime = 0;
  if (escapeHoldTimeout) {
    clearTimeout(escapeHoldTimeout);
    escapeHoldTimeout = null;
  }
  
  // Reset key release flag so user must release and press Escape again to exit canvas
  escapeKeyWasReleased = false;
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
  
  // Mark that we've exited reflection mode at least once
  hasExitedReflectionModeOnce = true;
  
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
  // Escape key - hierarchical handling: input fields → pin placement → reflection mode → image selection → close canvas
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
        document.removeEventListener('mouseup', screenshotHandlers.mouseup);
        screenshotHandlers = null;
      }
      return;
    }
    
    // Only handle escape for canvas operations when overlay is active
    if (!isOverlayActive) return;
    
    // Check if an input field is currently focused
    const activeElement = document.activeElement;
    if (activeElement && (activeElement === pinFeatureInput || activeElement === emotionalAspectInput || activeElement === valueAspectInput)) {
      // Blur the input field and cancel pin placement if placing a pin
      activeElement.blur();
      if (isPlacingPin && tempPinLocation) {
        hidePinPlacementUI();
        draw();
      }
      e.preventDefault();
      return;
    }
    
    // If placing a pin (even if input not focused), cancel pin placement
    if (isPlacingPin && tempPinLocation) {
      hidePinPlacementUI();
      draw();
      e.preventDefault();
      return;
    }
    
    // If in reflection mode, start hold-to-exit timer (don't close canvas immediately)
    if (isReflectionMode) {
      if (!isHoldingEscapeToExit) {
        // Start holding Escape to exit
        isHoldingEscapeToExit = true;
        escapeHoldStartTime = Date.now();
        escapeKeyWasReleased = false; // Mark that key is held (prevents immediate canvas exit)
        
        // Set timeout to exit after hold duration
        escapeHoldTimeout = setTimeout(() => {
          if (isHoldingEscapeToExit && isReflectionMode) {
            // Reset hold state before exiting
            isHoldingEscapeToExit = false;
            escapeHoldStartTime = 0;
            escapeHoldTimeout = null;
            exitReflectionMode();
          }
        }, ESCAPE_HOLD_DURATION);
        
        // Continuously redraw while holding to animate progress fill
        const animateProgress = () => {
          if (isHoldingEscapeToExit && isReflectionMode) {
            requestDraw();
            requestAnimationFrame(animateProgress);
          }
        };
        animateProgress();
      }
      e.preventDefault();
      return;
    }
    
    // If an image is selected, deselect all images (but don't close canvas)
    if (selectedImageIndices.length > 0) {
      selectedImageIndices = [];
      handleSelectionChange(-1);
      e.preventDefault();
      return;
    }
    
    // Only start hold-to-exit canvas if none of the above conditions are met and key was released
    if (isOverlayActive && escapeKeyWasReleased) {
      if (!isHoldingEscapeToExitCanvas) {
        // Start holding Escape to exit canvas
        isHoldingEscapeToExitCanvas = true;
        canvasExitHoldStartTime = Date.now();
        
        // Set timeout to exit after hold duration
        canvasExitHoldTimeout = setTimeout(() => {
          if (isHoldingEscapeToExitCanvas && isOverlayActive) {
            // Reset hold state before exiting
            isHoldingEscapeToExitCanvas = false;
            canvasExitHoldStartTime = 0;
            canvasExitHoldTimeout = null;
            toggleOverlay();
          }
        }, CANVAS_EXIT_HOLD_DURATION);
        
        // Continuously trigger redraw while holding to animate progress stroke
        // The drawCircles function is already in an animation loop, so we just need to ensure it runs
        // The progress will be calculated on each frame in drawCircles based on canvasExitHoldStartTime
      }
      e.preventDefault();
      return;
    } else if (isOverlayActive && !escapeKeyWasReleased) {
      // Key was not released, prevent canvas exit (prevents holding through from reflection mode)
      e.preventDefault();
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
    const isDeletingReflectionImage = sortedIndices.includes(reflectionImageIndex);
    
    // Remove images
    sortedIndices.forEach(index => {
      if (index >= 0 && index < images.length) {
        images.splice(index, 1);
      }
    });
    
    // Clear selection
    selectedImageIndices = [];
    // Update button visibility (this will call requestDraw())
    handleSelectionChange(-1);
    
    // If reflection image was deleted, exit reflection mode
    if (isDeletingReflectionImage && isReflectionMode) {
      exitReflectionMode();
    }
  }
});

// Handle Escape key release for hold-to-exit reflection mode and canvas exit
window.addEventListener('keyup', (e) => {
  if (e.key === 'Escape') {
    // Mark that Escape key was released (required before canvas exit can be triggered)
    escapeKeyWasReleased = true;
    
    // Cancel reflection mode hold-to-exit if Escape is released before duration completes
    if (isHoldingEscapeToExit) {
      isHoldingEscapeToExit = false;
      escapeHoldStartTime = 0;
      if (escapeHoldTimeout) {
        clearTimeout(escapeHoldTimeout);
        escapeHoldTimeout = null;
      }
      // Trigger redraw to remove progress fill
      requestDraw();
    }
    
    // Cancel canvas exit hold-to-exit if Escape is released before duration completes
    if (isHoldingEscapeToExitCanvas) {
      isHoldingEscapeToExitCanvas = false;
      canvasExitHoldStartTime = 0;
      if (canvasExitHoldTimeout) {
        clearTimeout(canvasExitHoldTimeout);
        canvasExitHoldTimeout = null;
      }
      // Trigger redraw of circle button to remove progress stroke
      if (circleAnimationFrameId) {
        drawCircles();
      }
    }
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
      const hasEmotionalAspects = clickedPin.emotionalAspects && clickedPin.emotionalAspects.length > 0;
      const hasValueAspects = clickedPin.valueAspects && clickedPin.valueAspects.length > 0;
      const canExpand = hasEmotionalAspects || hasValueAspects;
      const isCurrentlyExpanded = expandedPinId === clickedPin.id;
      
      // Select the pin and hide pin placement UI if it's showing
      selectedPinId = clickedPin.id;
      hidePinPlacementUI();
      
      // Handle pin expansion
      if (canExpand) {
        if (isCurrentlyExpanded) {
          // Pin is already expanded - keep it expanded (no change)
          // Just update control panel
          updateControlPanelInputs();
          requestDraw();
        } else {
          // Collapse any currently expanded pin
          if (expandedPinId !== null && expandedPinId !== clickedPin.id) {
            startPinExpansionAnimation(expandedPinId, 'expanded', 'collapsed');
            // Don't clear expandedPinId here - let animation complete first
          }
          // Expand this pin
          expandedPinId = clickedPin.id;
          startPinExpansionAnimation(clickedPin.id, 'collapsed', 'expanded');
          updateControlPanelInputs();
          requestDraw();
        }
      } else {
        // Pin cannot be expanded (no aspects) - just select it
        // Collapse any currently expanded pin
        if (expandedPinId !== null) {
          startPinExpansionAnimation(expandedPinId, 'expanded', 'collapsed');
          // Don't clear expandedPinId here - let animation complete first
        }
        updateControlPanelInputs();
        requestDraw();
      }
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
    
    // Check if clicking within expanded pin bounds (to prevent collapsing when clicking on expanded pin area)
    let clickedOnExpandedPin = false;
    if (expandedPinId !== null) {
      const expandedPin = reflectionImg.pins.find(p => p.id === expandedPinId);
      if (expandedPin) {
        const canvasX = reflectionImg.x + (expandedPin.location.x * reflectionImg.width);
        const canvasY = reflectionImg.y + (expandedPin.location.y * reflectionImg.height);
        const screenPos = canvasToScreen(canvasX, canvasY);
        const expandedRadius = 130 + 20; // Outer orbit radius + margin for hit detection
        const canvasPos = screenToCanvas(e.clientX, e.clientY);
        const clickCanvasX = canvasPos.x;
        const clickCanvasY = canvasPos.y;
        const dx = clickCanvasX - canvasX;
        const dy = clickCanvasY - canvasY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= expandedRadius) {
          clickedOnExpandedPin = true;
        }
      }
    }
    
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    if (canvasPos.x >= reflectionImg.x && 
        canvasPos.x <= reflectionImg.x + reflectionImg.width &&
        canvasPos.y >= reflectionImg.y && 
        canvasPos.y <= reflectionImg.y + reflectionImg.height) {
      // Start pin placement
      e.preventDefault();
      e.stopPropagation();
      
      // Deselect any previously selected pin when clicking on image (but not on a pin)
      if (selectedPinId !== null) {
        selectedPinId = null;
      }
      
      isPlacingPin = true;
      const normalizedX = (canvasPos.x - reflectionImg.x) / reflectionImg.width;
      const normalizedY = (canvasPos.y - reflectionImg.y) / reflectionImg.height;
      tempPinLocation = { x: normalizedX, y: normalizedY };
      pinFeatureText = '';
      
      // Collapse expanded pin if clicking on image (but not on expanded pin area)
      if (expandedPinId !== null && !clickedOnExpandedPin) {
        startPinExpansionAnimation(expandedPinId, 'expanded', 'collapsed');
        // Don't clear expandedPinId here - let animation complete first
      }
      
      // Show pin placement UI
      showPinPlacementUI(e.clientX, e.clientY);
      updateControlPanelInputs();
      requestDraw();
      return;
    }
    
    // Click outside - deselect pin and collapse expanded pin (but not if clicking on control panel)
    if (!window.reflectionPanelBounds || 
        e.clientX < window.reflectionPanelBounds.x ||
        e.clientX > window.reflectionPanelBounds.x + window.reflectionPanelBounds.width ||
        e.clientY < window.reflectionPanelBounds.y ||
        e.clientY > window.reflectionPanelBounds.y + window.reflectionPanelBounds.height) {
      selectedPinId = null;
      // Collapse expanded pin
      if (expandedPinId !== null) {
        startPinExpansionAnimation(expandedPinId, 'expanded', 'collapsed');
        // Don't clear expandedPinId here - let animation complete first
      }
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
    
    if (isAlreadySelected) {
      // Clicked on already selected image (single or multi-select) - start dragging immediately
      // Keep all selected images selected
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      setInteracting(true); // Track interaction for dynamic DPR
    } else {
      // Clicked on different image - select it (single select)
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
  // Update last mouse position for hover detection
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  
  // Trigger redraw to update tooltip
  if (isOverlayActive) {
    requestDraw();
  }
  
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

    // Set minimum width to 400 pixels and maximum width to 4000 pixels (in canvas coordinates)
    const minWidth = 400;
    const maxWidth = 4000;
    const minHeight = 10; // Keep minimum height as fallback

    // Calculate new dimensions while maintaining aspect ratio
    let newWidth, newHeight;
    let anchorX, anchorY; // Point that stays fixed during resize

    switch (resizeHandle) {
      case 'nw': // Top-left corner - anchor is bottom-right
        anchorX = img.x + img.width;
        anchorY = img.y + img.height;
        newWidth = Math.max(minWidth, Math.min(maxWidth, img.width - deltaX));
        newHeight = newWidth / img.aspectRatio;
        // Adjust if height would be too small
        if (newHeight < minHeight) {
          newHeight = minHeight;
          newWidth = newHeight * img.aspectRatio;
          // Ensure width still meets minimum and maximum
          if (newWidth < minWidth) {
            newWidth = minWidth;
            newHeight = newWidth / img.aspectRatio;
          } else if (newWidth > maxWidth) {
            newWidth = maxWidth;
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
        newWidth = Math.max(minWidth, Math.min(maxWidth, img.width + deltaX));
        newHeight = newWidth / img.aspectRatio;
        if (newHeight < minHeight) {
          newHeight = minHeight;
          newWidth = newHeight * img.aspectRatio;
          if (newWidth < minWidth) {
            newWidth = minWidth;
            newHeight = newWidth / img.aspectRatio;
          } else if (newWidth > maxWidth) {
            newWidth = maxWidth;
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
        newWidth = Math.max(minWidth, Math.min(maxWidth, img.width + deltaX));
        newHeight = newWidth / img.aspectRatio;
        if (newHeight < minHeight) {
          newHeight = minHeight;
          newWidth = newHeight * img.aspectRatio;
          if (newWidth < minWidth) {
            newWidth = minWidth;
            newHeight = newWidth / img.aspectRatio;
          } else if (newWidth > maxWidth) {
            newWidth = maxWidth;
            newHeight = newWidth / img.aspectRatio;
          }
        }
        img.width = newWidth;
        img.height = newHeight;
        break;
      case 'sw': // Bottom-left corner - anchor is top-right
        anchorX = img.x + img.width;
        anchorY = img.y;
        newWidth = Math.max(minWidth, Math.min(maxWidth, img.width - deltaX));
        newHeight = newWidth / img.aspectRatio;
        if (newHeight < minHeight) {
          newHeight = minHeight;
          newWidth = newHeight * img.aspectRatio;
          if (newWidth < minWidth) {
            newWidth = minWidth;
            newHeight = newWidth / img.aspectRatio;
          } else if (newWidth > maxWidth) {
            newWidth = maxWidth;
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
  } else if (isDragging && selectedImageIndices.length > 0) {
    // Convert viewport coordinates to canvas coordinates for proper delta calculation
    const currentCanvasPos = screenToCanvas(e.clientX, e.clientY);
    const startCanvasPos = screenToCanvas(dragStartX, dragStartY);
    const deltaX = currentCanvasPos.x - startCanvasPos.x;
    const deltaY = currentCanvasPos.y - startCanvasPos.y;
    
    // Move all selected images together
    selectedImageIndices.forEach(index => {
      if (index >= 0 && index < images.length) {
        const img = images[index];
        img.x += deltaX;
        img.y += deltaY;
      }
    });
    
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
  // Reset clip-path when ending screenshot mode
  if (screenshotOverlay) {
    screenshotOverlay.style.removeProperty('--selection-clip-path');
  }
  screenshotOverlay.classList.remove('active');
  document.body.classList.remove('screenshot-mode');
  isScreenshotMode = false;
  // Don't clear selection bounds here - keep them during fade-in
  // They will be cleared when fade-in completes or overlay opens
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
  // Clear selection bounds when starting screenshot mode
  screenshotSelectionBounds = null;
  
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
  
  // Initialize clip-path to dim everything (no selection yet)
  screenshotOverlay.style.setProperty('--selection-clip-path', 'polygon(0 0, 100% 0, 100% 100%, 0 100%)');
  
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
  let rafId = null; // RequestAnimationFrame ID for throttling updates
  let lastMouseX = 0;
  let lastMouseY = 0;
  let lastLeft = -1;
  let lastTop = -1;
  let lastWidth = -1;
  let lastHeight = -1;

  const handleMouseDown = (e) => {
    startX = e.clientX;
    startY = e.clientY;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    isSelecting = true;
    lastLeft = -1;
    lastTop = -1;
    lastWidth = -1;
    lastHeight = -1;
    
    selectionBox.style.display = 'block';
    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    
    // Initialize clip-path to dim everything (no selection yet)
    screenshotOverlay.style.setProperty('--selection-clip-path', 'polygon(0 0, 100% 0, 100% 100%, 0 100%)');
    
    // Camera cursor is already applied, keep it while selecting
    applyCameraCursor();
    
    // Start capturing background immediately when dragging starts
    backgroundCapturePromise = captureBackground();
  };

  const updateSelection = () => {
    if (!isSelecting) return;
    
    const width = Math.abs(lastMouseX - startX);
    const height = Math.abs(lastMouseY - startY);
    const left = Math.min(lastMouseX, startX);
    const top = Math.min(lastMouseY, startY);
    
    // Only update if values actually changed (performance optimization)
    if (left !== lastLeft || top !== lastTop || width !== lastWidth || height !== lastHeight) {
      lastLeft = left;
      lastTop = top;
      lastWidth = width;
      lastHeight = height;
      
      // Update selection box (fast - direct style updates)
      selectionBox.style.left = left + 'px';
      selectionBox.style.top = top + 'px';
      selectionBox.style.width = width + 'px';
      selectionBox.style.height = height + 'px';
      
      // Store selection bounds globally for excluding from canvas fade-in
      if (width > 0 && height > 0) {
        screenshotSelectionBounds = { left, top, width, height };
      } else {
        screenshotSelectionBounds = null;
      }
      
      // Update clip-path to cut out selection box area from dimming
      if (width > 0 && height > 0) {
        const right = left + width;
        const bottom = top + height;
        // Simplified clip-path for better performance
        const clipPath = `polygon(0% 0%, 0% 100%, ${left}px 100%, ${left}px ${top}px, ${right}px ${top}px, ${right}px ${bottom}px, ${left}px ${bottom}px, ${left}px 100%, 100% 100%, 100% 0%)`;
        screenshotOverlay.style.setProperty('--selection-clip-path', clipPath);
      } else {
        // No selection yet, dim everything
        screenshotOverlay.style.setProperty('--selection-clip-path', 'polygon(0 0, 100% 0, 100% 100%, 0 100%)');
      }
    }
    
    rafId = null;
  };

  const handleMouseMove = (e) => {
    // Always maintain camera cursor when in screenshot mode
    applyCameraCursor();
    
    if (isSelecting) {
      // Update mouse position immediately
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      
      // Throttle updates using requestAnimationFrame for smooth performance
      if (rafId === null) {
        rafId = requestAnimationFrame(updateSelection);
      }
    }
  };

  const handleMouseUp = async (e) => {
    // Prevent double execution if called from both overlay and document
    if (!isSelecting) return;
    
    // Cancel any pending animation frame
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    
    // Update mouse position from event
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    
    // Final update to ensure selection box is at correct position
    updateSelection();
    
    // Mark as no longer selecting to prevent double execution
    isSelecting = false;
    
    // Keep camera cursor after selection ends (screenshot mode is still active)
    applyCameraCursor();
    
    const rect = {
      left: Math.min(startX, lastMouseX),
      top: Math.min(startY, lastMouseY),
      width: Math.abs(lastMouseX - startX),
      height: Math.abs(lastMouseY - startY)
    };

    // Store final selection bounds for excluding from canvas fade-in
    if (rect.width > 10 && rect.height > 10) {
      screenshotSelectionBounds = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    } else {
      screenshotSelectionBounds = null;
    }

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
      screenshotSelectionBounds = null; // Clear selection bounds
      
      endScreenshotMode();
      screenshotOverlay.removeEventListener('mousedown', handleMouseDown);
      screenshotOverlay.removeEventListener('mousemove', handleMouseMove);
      screenshotOverlay.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Clear stored handlers
      screenshotHandlers = null;
    }
  };

  screenshotOverlay.addEventListener('mousedown', handleMouseDown);
  screenshotOverlay.addEventListener('mousemove', handleMouseMove);
  screenshotOverlay.addEventListener('mouseup', handleMouseUp);
  // Also listen on document to ensure mouseup always fires, even if mouse leaves overlay
  document.addEventListener('mouseup', handleMouseUp);
  
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
          // Clear selection bounds now that image is on canvas (no longer needed for fade-in exclusion)
          screenshotSelectionBounds = null;
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
          document.removeEventListener('mouseup', screenshotHandlers.mouseup);
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
    
    // For screenshots, hide all other images IMMEDIATELY for smooth transition to reflection mode
    // Do this BEFORE handleSelectionChange and BEFORE any draw calls
    if (screenX !== null && screenY !== null) {
      // Hide all other images and set opacity to 0 immediately
      // This must happen before any draw() calls to prevent them from showing
      // Set transition flag early to ensure draw function respects it
      hasExitedReflectionModeOnce = false;
      images.forEach((img, index) => {
        if (!selectedImageIndices.includes(index)) {
          img.hidden = true;
          img.opacity = 0.0; // Immediately invisible
          img.fadeStartTime = undefined; // No fade animation
        }
      });
    }
    
    // Now call handleSelectionChange - it will trigger a draw, but draw function will only show selected images
    handleSelectionChange(selectedImageIndices[0]);
    
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
      
      // Force a redraw to ensure hidden images are not shown
      // The draw function will now only show selected images
      requestDraw();
      
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

// Permission buttons handlers
if (openScreenRecordingPermissionsButton) {
  openScreenRecordingPermissionsButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Opening screen recording permissions...');
    ipcRenderer.send('open-system-settings', 'screen-recording');
    closeSettingsModal();
  });
} else {
  console.warn('openScreenRecordingPermissionsButton not found');
}

if (openAccessibilityPermissionsButton) {
  openAccessibilityPermissionsButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Opening accessibility permissions...');
    ipcRenderer.send('open-system-settings', 'accessibility');
    closeSettingsModal();
  });
} else {
  console.warn('openAccessibilityPermissionsButton not found');
}

if (openAllPermissionsButton) {
  openAllPermissionsButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Opening privacy & security settings...');
    ipcRenderer.send('open-system-settings', 'privacy');
    closeSettingsModal();
  });
} else {
  console.warn('openAllPermissionsButton not found');
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

// Demo mode functions
function loadDemoMode() {
  // Clear existing images first
  images = [];
  selectedImageIndices = [];
  
  // Load the demo image - read file and convert to data URL
  const demoImagePath = path.join(__dirname, 'assets', 'demo-weather-app.png');
  
  try {
    // Read the image file
    const imageBuffer = fs.readFileSync(demoImagePath);
    const imageBase64 = imageBuffer.toString('base64');
    const imageDataURL = `data:image/png;base64,${imageBase64}`;
    
    // Load image with custom sizing (bigger than default)
    const img = new Image();
    img.onload = () => {
      // Scale image to be bigger - use 90% of viewport instead of 70%, and no max size limit
      const cssDims = getCanvasCSSDimensions();
      const maxWidth = cssDims.width * 0.9; // 90% of viewport width
      const maxHeight = cssDims.height * 0.9; // 90% of viewport height
      
      let scaledWidth = img.width;
      let scaledHeight = img.height;
      
      // Scale down if image is too large
      if (scaledWidth > maxWidth || scaledHeight > maxHeight) {
        const scaleX = maxWidth / scaledWidth;
        const scaleY = maxHeight / scaledHeight;
        const scale = Math.min(scaleX, scaleY);
        scaledWidth = scaledWidth * scale;
        scaledHeight = scaledHeight * scale;
      }
      
      // Center the image on canvas
      const visibleCenterX = -canvasTranslateX / canvasScale + (cssDims.width / canvasScale) / 2;
      const visibleCenterY = -canvasTranslateY / canvasScale + (cssDims.height / canvasScale) / 2;
      const imageX = visibleCenterX - scaledWidth / 2;
      const imageY = visibleCenterY - scaledHeight / 2;
      
      const imageObj = {
        element: img,
        x: imageX,
        y: imageY,
        width: scaledWidth,
        height: scaledHeight,
        aspectRatio: img.width / img.height,
        finalPosition: null,
        id: generateId(),
        version: 1,
        pins: []
      };
      
      // Create a pin in the center of the image with demo data: feature, 2 emotions, and 3 values
      const centerPin = {
        id: generateId(),
        imageId: imageObj.id,
        imageVersion: imageObj.version,
        location: { x: 0.5, y: 0.5 }, // Center of image (normalized coordinates)
        semanticLocation: '',
        feature: 'Weather Display',
        emotionalAspects: ['Calm', 'Pleasant'],
        valueAspects: ['Clarity', 'Accessibility', 'Aesthetics']
      };
      
      imageObj.pins.push(centerPin);
      
      images.push(imageObj);
      selectedImageIndices = [0];
      
      // Open canvas if not already open
      if (!isOverlayActive) {
        toggleOverlay();
      }
      
      // Small delay to ensure canvas is open before entering reflection mode
      setTimeout(() => {
        if (reflectionButton && !isReflectionMode) {
          enterReflectionMode();
        }
      }, 200);
      
      draw();
    };
    
    img.onerror = () => {
      console.error('Failed to load demo image:', demoImagePath);
      alert('Failed to load demo image. Please make sure the file exists at: ' + demoImagePath);
    };
    
    img.src = imageDataURL;
  } catch (error) {
    console.error('Failed to load demo image:', error);
    alert('Failed to load demo image. Please make sure the file exists at: ' + demoImagePath);
  }
}

function clearDemoMode() {
  // Exit reflection mode if active
  if (isReflectionMode) {
    exitReflectionMode();
  }
  
  // Clear all images
  images = [];
  selectedImageIndices = [];
  
  // Close canvas if open
  if (isOverlayActive) {
    toggleOverlay();
  }
  
  draw();
}

// Demo mode toggle handler
if (demoModeToggle) {
  // Load saved demo mode state - default to true if not set
  const savedDemoMode = localStorage.getItem('demoMode');
  const isDemoModeEnabled = savedDemoMode === null ? true : savedDemoMode === 'true';
  demoModeToggle.checked = isDemoModeEnabled;
  
  // Save the default state if it wasn't set
  if (savedDemoMode === null) {
    localStorage.setItem('demoMode', 'true');
  }
  
  // If demo mode was enabled, load it on startup
  if (isDemoModeEnabled) {
    // Wait for canvas to be ready
    setTimeout(() => {
      loadDemoMode();
    }, 500);
  }
  
  demoModeToggle.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    localStorage.setItem('demoMode', isEnabled.toString());
    
    if (isEnabled) {
      loadDemoMode();
    } else {
      clearDemoMode();
    }
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
  
  // Draw progress stroke around circle button when holding Escape to exit canvas
  if (isHoldingEscapeToExitCanvas && canvasExitHoldStartTime > 0 && isOverlayActive) {
    const centerX = CIRCLE_BUTTON_DISPLAY_SIZE / 2;
    const centerY = CIRCLE_BUTTON_DISPLAY_SIZE / 2;
    const strokeRadius = 32; // Radius for the stroke (matches circle radius 30 + small offset, same as blue outline)
    const strokeWidth = 3;
    
    // Calculate progress (0 to 1)
    const holdElapsed = Date.now() - canvasExitHoldStartTime;
    const progress = Math.min(holdElapsed / CANVAS_EXIT_HOLD_DURATION, 1);
    
    // Draw the progress stroke (circular arc from top, going clockwise)
    circleButtonCtx.save();
    circleButtonCtx.strokeStyle = 'rgba(239, 68, 68, 1.0)'; // Red stroke
    circleButtonCtx.lineWidth = strokeWidth;
    circleButtonCtx.lineCap = 'round';
    
    // Start from top (270 degrees in canvas coordinates, which is -Math.PI/2)
    const startAngle = -Math.PI / 2;
    // End angle based on progress (full circle = 2 * Math.PI)
    const endAngle = startAngle + (progress * 2 * Math.PI);
    
    circleButtonCtx.beginPath();
    circleButtonCtx.arc(centerX, centerY, strokeRadius, startAngle, endAngle);
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
  
  // Automatically select the newly created pin
  selectedPinId = newPin.id;
  
  // Collapse any expanded pin when a new pin is placed
  if (expandedPinId !== null) {
    startPinExpansionAnimation(expandedPinId, 'expanded', 'collapsed');
    // Don't clear expandedPinId here - let animation complete first
  }
  
  hidePinPlacementUI();
  updateControlPanelInputs();
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
  
  // Store old count before adding
  const oldCount = selectedPin.emotionalAspects.length;
  selectedPin.emotionalAspects.push(aspectText);
  const newCount = selectedPin.emotionalAspects.length;
  
  // Automatically expand pin if it's not already expanded and now has aspects
  const hasValueAspects = selectedPin.valueAspects && selectedPin.valueAspects.length > 0;
  const canExpand = newCount > 0 || hasValueAspects;
  if (canExpand && expandedPinId !== selectedPinId) {
    // Pin can now expand and isn't expanded yet - expand it
    expandedPinId = selectedPinId;
    startPinExpansionAnimation(selectedPinId, 'collapsed', 'expanded');
  }
  
  // Start dot repositioning animation if pin is expanded
  if (expandedPinId === selectedPinId) {
    startDotRepositionAnimation(selectedPinId, 'emotional', oldCount, newCount);
  }
  
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
  
  // Store old count before adding
  const oldCount = selectedPin.valueAspects.length;
  selectedPin.valueAspects.push(aspectText);
  const newCount = selectedPin.valueAspects.length;
  
  // Automatically expand pin if it's not already expanded and now has aspects
  const hasEmotionalAspects = selectedPin.emotionalAspects && selectedPin.emotionalAspects.length > 0;
  const canExpand = hasEmotionalAspects || newCount > 0;
  const wasAlreadyExpanded = expandedPinId === selectedPinId;
  if (canExpand && !wasAlreadyExpanded) {
    // Pin can now expand and isn't expanded yet - expand it
    expandedPinId = selectedPinId;
    startPinExpansionAnimation(selectedPinId, 'collapsed', 'expanded');
  }
  
  // Start values area animation if this is the first value aspect
  // Either pin was already expanded, or it just expanded (in which case values area animates with expansion)
  if (oldCount === 0 && newCount === 1) {
    if (wasAlreadyExpanded) {
      // Pin was already expanded - animate values area separately
      startValuesAreaAnimation(selectedPinId);
    }
    // If pin just expanded, the values area will animate as part of the expansion (expansionProgress handles it)
  }
  
  // Start dot repositioning animation if pin is expanded
  if (expandedPinId === selectedPinId) {
    startDotRepositionAnimation(selectedPinId, 'value', oldCount, newCount);
  }
  
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
    // Store old count before removing
    const oldCount = selectedPin.emotionalAspects.length;
    selectedPin.emotionalAspects.splice(index, 1);
    const newCount = selectedPin.emotionalAspects.length;
    
    // Start dot repositioning animation if pin is expanded
    if (expandedPinId === selectedPinId && newCount > 0) {
      startDotRepositionAnimation(selectedPinId, 'emotional', oldCount, newCount);
    }
    
    // Disable value aspects if no emotional aspects remain
    if (selectedPin.emotionalAspects.length === 0) {
      updateControlPanelInputs();
    }
  } else if (type === 'value' && selectedPin.valueAspects) {
    // Store old count before removing
    const oldCount = selectedPin.valueAspects.length;
    selectedPin.valueAspects.splice(index, 1);
    const newCount = selectedPin.valueAspects.length;
    
    // Start dot repositioning animation if pin is expanded
    if (expandedPinId === selectedPinId && newCount > 0) {
      startDotRepositionAnimation(selectedPinId, 'value', oldCount, newCount);
    }
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

