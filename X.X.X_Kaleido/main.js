const { app, BrowserWindow, ipcMain, desktopCapturer, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const { execFile, spawn, exec } = require('child_process');
// Only require chokidar in development mode
const chokidar = process.env.NODE_ENV !== 'production' ? require('chokidar') : null;

// Set application name for macOS dock and menu bar
app.setName('Kaleido');

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

  // Load icon for window - try .icns first, fallback to PNG
  let iconPath = path.join(__dirname, 'assets', 'icon.icns');
  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    iconPath = path.join(__dirname, 'assets', 'icon_dock.png');
    icon = nativeImage.createFromPath(iconPath);
  }

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
    icon: icon.isEmpty() ? undefined : icon, // Set window icon
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

// IPC Handler für Developer Tools (toggle)
ipcMain.on('toggle-dev-tools', () => {
  if (mainWindow) {
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      // Open as detached (separate floating window)
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  }
});

// Also keep the old handler for backwards compatibility
ipcMain.on('open-dev-tools', () => {
  if (mainWindow) {
    // Open as detached (separate floating window)
    mainWindow.webContents.openDevTools({ mode: 'detach' });
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
  // Set dock icon (macOS) - try .icns first, fallback to PNG
  if (process.platform === 'darwin' && app.dock) {
    // Try .icns file first
    let iconPath = path.join(__dirname, 'assets', 'icon.icns');
    let icon = nativeImage.createFromPath(iconPath);
    
    // If .icns doesn't work, try PNG
    if (icon.isEmpty()) {
      iconPath = path.join(__dirname, 'assets', 'icon_dock.png');
      icon = nativeImage.createFromPath(iconPath);
    }
    
    if (!icon.isEmpty()) {
      app.dock.setIcon(icon);
      console.log('Dock icon set successfully from:', iconPath);
    } else {
      console.error('Failed to load dock icon from both .icns and PNG');
    }
  }
  
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
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) {
      wins[0].focus();
      if (message.includes('TOGGLE_SCREENSHOT')) {
        wins[0].webContents.send('toggle-screenshot');
      } else if (message.includes('OPEN_CANVAS')) {
        wins[0].webContents.send('open-canvas');
      }
    }
  });

  keyListener.stderr.on('data', (data) => {
    const errorMessage = data.toString();
    console.error('Key listener error:', errorMessage);
    
    // Check if it's a permission error
    if (errorMessage.includes('Accessibility permissions') || errorMessage.includes('Failed to create global keyboard monitor')) {
      // Show native dialog after a short delay to ensure window is ready
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          dialog.showMessageBox(mainWindow, {
            type: 'warning',
            title: 'Accessibility Permissions Required',
            message: 'Keyboard shortcuts require accessibility permissions',
            detail: 'Kaleido needs accessibility permissions to monitor keyboard shortcuts.\n\n' +
                    'Please grant permissions:\n' +
                    '1. Open System Settings\n' +
                    '2. Go to Privacy & Security > Accessibility\n' +
                    '3. Enable Kaleido\n' +
                    '4. Restart the app',
            buttons: ['Open System Settings', 'OK'],
            defaultId: 0,
            cancelId: 1
          }).then((result) => {
            if (result.response === 0) {
              // Open System Settings to Accessibility pane
              exec('open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"');
            }
          });
        }
      }, 1000);
    }
  });

  keyListener.on('error', (error) => {
    console.error('Failed to start key listener:', error);
    if (mainWindow) {
      mainWindow.webContents.send('key-listener-error', 'Failed to start keyboard listener. Please check accessibility permissions in System Settings > Privacy & Security > Accessibility.');
    }
  });

  keyListener.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`Key listener exited with code ${code}`);
      if (mainWindow) {
        mainWindow.webContents.send('key-listener-error', 'Keyboard listener stopped. Please grant accessibility permissions in System Settings > Privacy & Security > Accessibility and restart the app.');
      }
    }
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

