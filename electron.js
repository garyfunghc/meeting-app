const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const path = require('path');
const userDataPath = app.getPath('userData');
const { app: expressApp, server } = require('./server')(userDataPath);

let mainWindow;

function createWindow() {
  try {
    console.log('Creating main window...');
    
    // Create the browser window
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
        webSecurity: false,
        sandbox: false // Disable sandbox to prevent sandbox errors
      },
      icon: path.join(__dirname, './build/logo512.png'),
      show: false // Don't show until ready to prevent flickering
    });

    // Load the app
    mainWindow.loadFile(path.join(__dirname, './build/index.html'));

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
      console.log('Window ready to show');
      mainWindow.show();
      mainWindow.focus();
    });

    // Handle window content loaded
    mainWindow.webContents.once('did-finish-load', () => {
      console.log('Window content loaded successfully');
    });

    // Handle window load errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Window failed to load:', errorCode, errorDescription);
    });

    // Open DevTools in development
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools();
    }

    // Handle window closed
    mainWindow.on('closed', () => {
      console.log('Main window closed');
      mainWindow = null;
    });

  } catch (error) {
    console.error('Error creating window:', error);
  }
}

// App event handlers
app.whenReady().then(() => {
  // The server is already started by the server module when required
  console.log('Backend server started on port 13001');

  // Create main window
  createWindow();

  // Register Ctrl + F12 to toggle DevTools
  globalShortcut.register('CommandOrControl+F12', () => {
    if (mainWindow) {
      const webContents = mainWindow.webContents;
      if (webContents.isDevToolsOpened()) {
        webContents.closeDevTools();
      } else {
        webContents.openDevTools();
      }
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Unregister all shortcuts before quit
  globalShortcut.unregisterAll();
  server.close();
});

// IPC handlers
ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});
