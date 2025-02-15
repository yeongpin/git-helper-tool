const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

class ConfigService {
    constructor() {
        // 使用 app.getPath('userData') 來獲取應用程序的數據目錄
        this.configDir = app.getPath('userData');
        this.configPath = path.join(this.configDir, 'repositories.json');
    }

    async ensureConfigDirectory() {
        try {
            await fs.access(this.configDir);
        } catch (error) {
            // 如果目錄不存在，創建它
            await fs.mkdir(this.configDir, { recursive: true });
        }
    }

    async getRepositories() {
        try {
            await this.ensureConfigDirectory();
            const data = await fs.readFile(this.configPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                // 如果文件不存在，返回空數組並創建文件
                await fs.writeFile(this.configPath, JSON.stringify([], null, 2));
                return [];
            }
            throw error;
        }
    }

    async addRepository(repo) {
        try {
            await this.ensureConfigDirectory();
            let repos = await this.getRepositories();
            // 檢查是否已存在
            if (!repos.some(r => r.path === repo.path)) {
                repos.push(repo);
                await fs.writeFile(this.configPath, JSON.stringify(repos, null, 2));
            }
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: `Failed to add repository: ${error.message}` 
            };
        }
    }

    async removeRepository(repoPath) {
        try {
            await this.ensureConfigDirectory();
            let repos = await this.getRepositories();
            repos = repos.filter(repo => repo.path !== repoPath);
            await fs.writeFile(this.configPath, JSON.stringify(repos, null, 2));
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: `Failed to remove repository: ${error.message}` 
            };
        }
    }

    async updateSettings(settings) {
        try {
            await this.ensureConfigDirectory();
            const config = {
                settings: settings,
                repositories: await this.getRepositories()
            };
            await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: `Failed to update settings: ${error.message}` 
            };
        }
    }
}

module.exports = new ConfigService(); 