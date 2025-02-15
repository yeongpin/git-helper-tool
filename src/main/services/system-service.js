const { dialog, shell } = require('electron');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class SystemService {
    async selectDirectory() {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory']
        });
        return result.filePaths[0];
    }

    async openInExplorer(dirPath) {
        try {
            // 檢查路徑是否存在
            await fs.access(dirPath);
            await shell.openPath(dirPath);
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: `Could not open directory: ${error.message}` 
            };
        }
    }

    async openInTerminal(dirPath) {
        try {
            // 檢查路徑是否存在
            await fs.access(dirPath);
            
            // 根據不同操作系統打開終端
            switch (process.platform) {
                case 'darwin': // macOS
                    exec(`open -a Terminal "${dirPath}"`);
                    break;
                case 'win32': // Windows
                    exec(`start cmd /K "cd /d "${dirPath}"`);
                    break;
                default: // Linux
                    exec(`x-terminal-emulator --working-directory="${dirPath}"`);
                    break;
            }
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: `Could not open terminal: ${error.message}` 
            };
        }
    }

    async isGitDirectory(dirPath) {
        try {
            const gitPath = path.join(dirPath, '.git');
            const stats = await fs.stat(gitPath);
            return stats.isDirectory();
        } catch (error) {
            return false;
        }
    }

    static setupIPCHandlers(ipcMain) {
        const service = new SystemService();

        ipcMain.handle('select-directory', async () => {
            return await service.selectDirectory();
        });

        ipcMain.handle('open-in-explorer', async (event, path) => {
            return await service.openInExplorer(path);
        });

        ipcMain.handle('open-in-terminal', async (event, path) => {
            return await service.openInTerminal(path);
        });

        ipcMain.handle('is-git-directory', async (event, path) => {
            return await service.isGitDirectory(path);
        });

        ipcMain.handle('show-notification', async (event, message) => {
            // 實現系統通知
            return true;
        });

        ipcMain.handle('read-directory', async (event, dirPath) => {
            try {
                const files = await fs.readdir(dirPath);
                return files;
            } catch (error) {
                return null;
            }
        });
    }
}

module.exports = SystemService; 