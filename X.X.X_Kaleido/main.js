const { app, BrowserWindow, ipcMain, desktopCapturer, Menu } = require('electron');
const path = require('path');
const { execFile, spawn } = require('child_process');
const chokidar = require('chokidar');

let mainWindow;
let keyListener;
let selectionListener;
let fileWatcher;

function createWindow() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  // Use bounds to get full screen size (including menu bar area)
  const bounds = primaryDisplay.bounds;
  const { width, height, x, y } = bounds;

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: x, // Start at display origin (usually 0, 0)
    y: y, // Start at display origin to cover menu bar
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    fullscreen: false,
    resizable: false, // Prevent resizing
    enableLargerThanScreen: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
  
  // Set always on top with screen-saver level (covers menu bar)
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  
  // Ensure window covers the entire screen including menu bar
  mainWindow.setBounds(bounds);

  // Initial: Ignoriere Maus-Events (Click-Through)
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  // macOS Spaces Support - sichtbar auf allen Desktops
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  
  // Ensure window covers full screen including menu bar
  mainWindow.once('ready-to-show', () => {
    mainWindow.setBounds(bounds);
  });

  // Update window size when screen size changes
  screen.on('display-added', () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const bounds = primaryDisplay.bounds;
    mainWindow.setBounds(bounds);
  });

  screen.on('display-removed', () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const bounds = primaryDisplay.bounds;
    mainWindow.setBounds(bounds);
  });

  screen.on('display-metrics-changed', () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const bounds = primaryDisplay.bounds;
    mainWindow.setBounds(bounds);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Make sure app quits when window is closed
  mainWindow.on('close', (event) => {
    // On macOS, apps typically stay running even when all windows are closed
    // Force quit to prevent background processes
    if (process.platform === 'darwin') {
      app.quit();
    }
  });
}

// IPC Handler für Click-Through
ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setIgnoreMouseEvents(ignore, options || { forward: true });
  }
});

// IPC Handler für Desktop Capturer
ipcMain.handle('get-sources', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  return sources.map(source => ({
    id: source.id,
    name: source.name
  }));
});

// IPC Handler für Window Detection
ipcMain.handle('get-window-bounds', async () => {
  return new Promise((resolve, reject) => {
    const getWindowsPath = path.join(__dirname, 'get_windows');
    execFile(getWindowsPath, (error, stdout, stderr) => {
      if (error) {
        console.error('Error getting windows:', error);
        resolve([]);
      } else {
        try {
          const windows = JSON.parse(stdout);
          resolve(windows);
        } catch (e) {
          console.error('Error parsing windows:', e);
          resolve([]);
        }
      }
    });
  });
});

app.whenReady().then(() => {
  // Show app in dock (macOS)
  app.dock?.show();
  
  createWindow();
  
  // Create application menu with Quit option
  if (process.platform === 'darwin') {
    const template = [
      {
        label: app.getName(),
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideothers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit', accelerator: 'Command+Q' }
        ]
      }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  // Starte Key Listener
  const keyListenerPath = path.join(__dirname, 'key_listener');
  keyListener = spawn(keyListenerPath);

  keyListener.stdout.on('data', (data) => {
    const message = data.toString().trim();
    if (message.includes('TOGGLE_SCREENSHOT')) {
      const wins = BrowserWindow.getAllWindows();
      if (wins.length > 0) {
        wins[0].focus();
        wins[0].webContents.send('toggle-screenshot');
      }
    }
  });

  keyListener.stderr.on('data', (data) => {
    console.error('Key listener error:', data.toString());
  });

  // Auto-Reload: Watch for file changes
  if (process.env.NODE_ENV !== 'production') {
    fileWatcher = chokidar.watch([
      path.join(__dirname, 'index.html'),
      path.join(__dirname, 'renderer.js'),
      path.join(__dirname, 'main.js')
    ], {
      ignored: /node_modules/,
      persistent: true,
      ignoreInitial: true
    });

    fileWatcher.on('change', (filePath) => {
      console.log(`File changed: ${filePath}`);
      
      // Reload the window if it exists
      if (mainWindow) {
        // If main.js changed, we need to restart the app
        if (filePath.endsWith('main.js')) {
          console.log('main.js changed - restarting app...');
          app.relaunch();
          app.exit(0);
        } else {
          // For HTML/JS changes, just reload the window
          mainWindow.reload();
        }
      }
    });

    console.log('Auto-reload enabled - watching for file changes...');
  }

  app.on('will-quit', () => {
    if (keyListener) {
      keyListener.kill();
    }
    if (selectionListener) {
      selectionListener.kill();
    }
    if (fileWatcher) {
      fileWatcher.close();
    }
  });

  app.on('window-all-closed', () => {
    // Always quit, even on macOS, to prevent background processes
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  if (keyListener) {
    keyListener.kill();
  }
  if (selectionListener) {
    selectionListener.kill();
  }
  if (fileWatcher) {
    fileWatcher.close();
  }
});

