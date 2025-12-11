const { app, BrowserWindow, ipcMain, screen, desktopCapturer } = require('electron');
const path = require('path');

// Set App Name explicitly
app.setName('Drift');


// Enable hot reloading
try {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
  });
} catch (_) { }

let mainWindow = null;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().bounds;

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    fullscreen: false,
    enableLargerThanScreen: true,
    hasShadow: false,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Dynamic Dock Icon Logic
  const { nativeTheme } = require('electron');

  const updateDockIcon = () => {
    if (process.platform === 'darwin') {
      const iconName = nativeTheme.shouldUseDarkColors ? 'icon-dark.png' : 'icon-light.png';
      app.dock.setIcon(path.join(__dirname, 'assets', iconName));
    }
  };

  // Set initial icon
  updateDockIcon();

  // Listen for theme changes
  nativeTheme.on('updated', () => {
    updateDockIcon();
  });

  mainWindow.loadFile('index.html');
  // mainWindow.webContents.openDevTools({ mode: 'detach' });

  // Initially ignore mouse events (click-through)
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // Ensure window appears on all workspaces (Mission Control spaces)
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Re-assert always on top to prevent losing floating status
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  // IPC listener to toggle mouse events
  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win.setIgnoreMouseEvents(ignore, options);
  });

  // IPC listener for logging from renderer
  ipcMain.on('log', (event, message) => {
    console.log(`[Renderer] ${message}`);
  });

  // IPC listener to refresh window (force repaint/focus)
  ipcMain.on('refresh-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win.show();
    win.moveTop();
  });

  // IPC listener for background vibrancy (blur)
  ipcMain.on('set-vibrancy', (event, type) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (type) {
      win.setVibrancy(type); // e.g. 'fullscreen-ui'
    } else {
      win.setVibrancy(null);
    }
  });

  // IPC listener to open dev tools
  ipcMain.on('open-devtools', (event) => {
    console.log("Main Process: Received open-devtools request");
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      // Try 'undocked' as it might handle z-index better or at least be distinct
      win.webContents.openDevTools({ mode: 'detach' });
      console.log("Main Process: Attempted to open DevTools");
    } else {
      console.error("Main Process: Could not find window for event sender");
    }
  });

  // IPC handler for screen sources
  ipcMain.handle('get-sources', async () => {
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    // Return only necessary data to avoid serialization issues with NativeImage
    return sources.map(source => ({
      id: source.id,
      name: source.name
    }));
  });

  // IPC handler to get window bounds via Swift script
  ipcMain.handle('get-window-bounds', async () => {
    const { execFile } = require('child_process');
    return new Promise((resolve, reject) => {
      execFile(path.join(__dirname, 'get_windows'), (error, stdout, stderr) => {
        if (error) {
          console.error('Error getting windows:', error);
          resolve([]); // Return empty on error to avoid breaking app
        } else {
          try {
            const windows = JSON.parse(stdout);
            resolve(windows);
          } catch (e) {
            console.error('Error parsing window data:', e);
            resolve([]);
          }
        }
      });
    });
  });

  // --- Dynamic Resizing Logic ---
  const updateBounds = () => {
    if (mainWindow) {
      const { width, height, x, y } = screen.getPrimaryDisplay().bounds;
      mainWindow.setBounds({ width, height, x, y });
    }
  };

  screen.on('display-metrics-changed', updateBounds);
  screen.on('display-added', updateBounds);
  screen.on('display-removed', updateBounds);
}

app.whenReady().then(() => {
  // Explicitly show Dock icon
  if (process.platform === 'darwin') {
    app.dock.show();
  }

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Spawn key listener
  console.log("Attempting to spawn key_listener at:", path.join(__dirname, 'key_listener'));
  const { spawn } = require('child_process');
  const keyListener = spawn(path.join(__dirname, 'key_listener'));
  const selectionListener = spawn(path.join(__dirname, 'selection_listener'));

  // --- Key Listener Handling ---
  keyListener.on('error', (err) => {
    console.error('Failed to start key_listener:', err);
  });

  keyListener.on('close', (code) => {
    console.log(`key_listener exited with code ${code}`);
  });

  keyListener.stdout.on('data', (data) => {
    const message = data.toString().trim();

    if (message.includes('TOGGLE_SCREENSHOT')) {
      const wins = BrowserWindow.getAllWindows();
      if (wins.length > 0) {
        wins[0].focus(); // Ensure window has focus for Escape key
        wins[0].webContents.send('toggle-screenshot');
      }
    }
  });

  keyListener.stderr.on('data', (data) => {
    console.error(`[KeyListener Error] ${data}`);
  });

  // --- Selection Listener Handling ---
  selectionListener.on('error', (err) => {
    console.error('Failed to start selection_listener:', err);
  });

  selectionListener.on('close', (code) => {
    console.log(`selection_listener exited with code ${code}`);
  });

  selectionListener.stdout.on('data', (data) => {
    const message = data.toString().trim();
    // console.log(`[SelectionListener] ${message}`);
    const wins = BrowserWindow.getAllWindows();

    if (wins.length > 0) {
      if (message.includes('TEXT_SELECTED')) {
        wins[0].webContents.send('toggle-selection-icon', true);
      } else if (message.includes('TEXT_CLEARED')) {
        wins[0].webContents.send('toggle-selection-icon', false);
      }
    }
  });

  selectionListener.stderr.on('data', (data) => {
    console.error(`[SelectionListener Error] ${data}`);
  });

  // Ensure we kill the listeners on exit
  app.on('will-quit', () => {
    keyListener.kill();
    selectionListener.kill();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
