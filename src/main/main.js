const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const GitService = require('./services/git-service');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            sandbox: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/pages/home/index.html'));
    
    // 開發時打開開發者工具
    //mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();

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

// 設置IPC監聽器
GitService.setupIPCHandlers(ipcMain);
require('./services/system-service').setupIPCHandlers(ipcMain);

// 添加通知歷史窗口創建函數
function createNotificationHistoryWindow() {
    const notificationWindow = new BrowserWindow({
        width: 400,
        height: 600,
        frame: false,
        parent: mainWindow,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            sandbox: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    notificationWindow.loadFile(path.join(__dirname, '../renderer/pages/notifications/index.html'));
}

// 添加 IPC 處理器
ipcMain.handle('open-notification-history', () => {
    createNotificationHistoryWindow();
});

// 添加窗口控制處理器
ipcMain.handle('window-minimize', () => {
    mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});

ipcMain.handle('window-close', () => {
    mainWindow.close();
}); 