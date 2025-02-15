const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');  // 使用普通的 fs
const fsPromises = require('fs').promises;  // 使用 promises API
const { app } = require('electron');

class GitService {
    constructor() {
        this.configPath = path.join(app.getPath('userData'), 'repositories.json');
        this.ensureConfigFile();
    }

    async ensureConfigFile() {
        try {
            if (!fs.existsSync(this.configPath)) {
                await fsPromises.writeFile(this.configPath, JSON.stringify({ repositories: [] }), 'utf8');
            }
        } catch (error) {
            console.error('Failed to create config file:', error);
        }
    }

    async getStoredRepositories() {
        try {
            if (!fs.existsSync(this.configPath)) {
                await this.ensureConfigFile();
                return [];
            }

            const data = await fsPromises.readFile(this.configPath, 'utf8');
            const parsed = JSON.parse(data);
            
            // 確保我們從正確的屬性讀取倉庫列表
            const repositories = parsed.repositories || [];
            
            // 過濾掉不存在的目錄
            const validRepos = repositories.filter(repo => fs.existsSync(repo.path));
            
            // 如果有無效的倉庫，更新配置文件
            if (validRepos.length !== repositories.length) {
                await this.saveRepositories(validRepos);
            }
            
            return validRepos;
        } catch (error) {
            console.error('Failed to read repositories:', error);
            return [];
        }
    }

    async saveRepositories(repositories) {
        try {
            console.log('Saving repositories:', repositories);
            // 確保我們保存的是正確的數據結構
            const data = {
                repositories: repositories
            };
            await fsPromises.writeFile(
                this.configPath, 
                JSON.stringify(data, null, 2), 
                'utf8'
            );
            console.log('Save completed');
        } catch (error) {
            console.error('Error saving repositories:', error);
            throw error;
        }
    }

    async createRepository(name, path, type, description = '') {
        try {
            const git = simpleGit(path);
            // 初始化本地倉庫
            await git.init();
            
            // 創建並提交初始文件
            const readmeContent = `# ${name}\n\n${description}`;
            const gitignoreContent = `node_modules/\n.DS_Store\n.env\n`;
            
            await this.createFile(path, 'README.md', readmeContent);
            await this.createFile(path, '.gitignore', gitignoreContent);
            
            // 添加並提交
            await git.add('.');
            await git.commit('Initial commit');
            
            // 設置分支為 main
            await git.branch(['-M', 'main']);
            
            // 如果是要推送到 GitHub
            if (type === 'public' || type === 'private') {
                try {
                    // 修改 GitHub URL 的格式
                    const githubUrl = `https://github.com/yeongpin/${name}.git`;  // 使用你的 GitHub 用戶名
                    
                    // 檢查遠程倉庫是否已存在
                    const remotes = await git.getRemotes();
                    if (remotes.find(remote => remote.name === 'origin')) {
                        await git.removeRemote('origin');
                    }
                    
                    // 添加遠程倉庫
                    await git.addRemote('origin', githubUrl);
                    
                    // 推送到 GitHub
                    try {
                        await git.push(['-u', 'origin', 'main']);
                        return { 
                            success: true,
                            message: 'Repository created and pushed to GitHub successfully',
                            githubUrl 
                        };
                    } catch (pushError) {
                        console.error('Push error:', pushError);
                        return {
                            success: false,
                            error: `Failed to push to GitHub: ${pushError.message}`
                        };
                    }
                } catch (error) {
                    console.error('GitHub setup error:', error);
                    return {
                        success: false,
                        error: `Failed to setup GitHub repository: ${error.message}`
                    };
                }
            }

            return { 
                success: true, 
                message: 'Local repository created successfully' 
            };
        } catch (error) {
            console.error('Repository creation error:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    async cloneRepository(url, targetPath) {
        try {
            // 確保目標路徑存在
            if (!fs.existsSync(targetPath)) {
                await fsPromises.mkdir(targetPath, { recursive: true });
            }

            const git = simpleGit();
            await git.clone(url, targetPath);

            // 克隆成功後，將倉庫添加到本地列表
            const repoName = url.split('/').pop().replace('.git', '');
            await this.addRepository({ name: repoName, path: targetPath });

            return { 
                success: true, 
                message: 'Repository cloned successfully',
                path: targetPath
            };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    async listLocalRepositories() {
        try {
            // 從配置文件或數據庫中獲取已知的倉庫路徑
            const repos = await this.getStoredRepositories();
            const repoStatus = await Promise.all(
                repos.map(async repo => {
                    try {
                        const git = simpleGit(repo.path);
                        // 先檢查是否是 git 倉庫
                        const isRepo = await git.checkIsRepo();
                        if (!isRepo) {
                            return {
                                name: repo.name,
                                path: repo.path,
                                status: {
                                    modified: [],
                                    untracked: [],
                                    ahead: 0,
                                    behind: 0,
                                    current: 'main',
                                    remote: null
                                }
                            };
                        }

                        const status = await git.status();
                        const remote = await git.getRemotes(true);
                        const branch = await git.branch();
                        
                        return {
                            name: repo.name,
                            path: repo.path,
                            status: {
                                modified: status.modified,
                                untracked: status.not_added,
                                ahead: status.ahead,
                                behind: status.behind,
                                current: branch.current,
                                remote: remote[0]?.refs.fetch || null
                            }
                        };
                    } catch (error) {
                        console.warn(`Error getting status for ${repo.path}:`, error);
                        // 返回基本信息，避免整個列表失敗
                        return {
                            name: repo.name,
                            path: repo.path,
                            status: {
                                modified: [],
                                untracked: [],
                                ahead: 0,
                                behind: 0,
                                current: 'main',
                                remote: null
                            }
                        };
                    }
                })
            );
            return { success: true, repositories: repoStatus };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async watchRepository(path) {
        try {
            const git = simpleGit(path);
            const status = await git.status();
            const remote = await git.getRemotes(true);
            const branch = await git.branch();

            return {
                success: true,
                needsCommit: status.modified.length > 0 || status.not_added.length > 0,
                needsPull: status.behind > 0,
                needsPush: status.ahead > 0,
                modified: status.modified,
                untracked: status.not_added,
                ahead: status.ahead,
                behind: status.behind,
                current: branch.current,
                remote: remote[0]?.refs.fetch || null
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async isGitDirectory(dirPath) {
        try {
            const git = simpleGit(dirPath);
            return await git.checkIsRepo();
        } catch (error) {
            return false;
        }
    }

    async addRepository(data) {
        try {
            const repos = await this.getStoredRepositories();
            if (!repos.some(repo => repo.path === data.path)) {
                repos.push({ 
                    name: data.name, 
                    path: data.path 
                });
                await this.saveRepositories(repos);
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async removeRepository(path) {
        try {
            console.log('Removing repository:', path);
            const repos = await this.getStoredRepositories();
            console.log('Current repositories:', repos);
            
            // 使用嚴格比較來確保路徑匹配
            const newRepos = repos.filter(repo => repo.path.replace(/\\/g, '/') !== path.replace(/\\/g, '/'));
            console.log('Repositories after filter:', newRepos);
            
            await this.saveRepositories(newRepos);
            
            return { success: true };
        } catch (error) {
            console.error('Error removing repository:', error);
            return { 
                success: false, 
                error: `Failed to remove repository: ${error.message}` 
            };
        }
    }

    // Tag 相關操作
    async listTags(repoPath) {
        try {
            const git = simpleGit(repoPath);
            
            // 先獲取遠程標籤
            try {
                await git.fetch(['--tags']);
            } catch (error) {
                console.warn('Failed to fetch remote tags:', error);
            }

            // 獲取所有標籤（包括本地和遠程）
            const tags = await git.tags();
            
            // 獲取當前分支
            const branchResult = await git.branch();
            const currentBranch = branchResult.current;

            // 獲取每個標籤的詳細信息
            const tagDetails = await Promise.all(tags.all.map(async (tagName) => {
                try {
                    // 獲取標籤的完整信息
                    const showResult = await git.raw(['show', '--quiet', tagName]);
                    const lines = showResult.split('\n');
                    
                    // 獲取標籤信息
                    const messageStartIndex = lines.findIndex(line => line === '') + 1;
                    const message = lines[messageStartIndex]?.trim() || '';

                    // 獲取標籤的創建日期和提交哈希
                    const dateResult = await git.raw(['log', '-1', '--format=%ai|%H', tagName]);
                    const [date, commitHash] = dateResult.trim().split('|');

                    // 獲取該提交所在的分支
                    const branchesForCommit = await git.raw(['branch', '--contains', commitHash]);
                    const branches = branchesForCommit.split('\n')
                        .map(b => b.trim().replace('*', '').trim())
                        .filter(Boolean);

                    // 檢查標籤是否在遠程
                    const isRemote = await git.raw(['ls-remote', '--tags', 'origin', tagName])
                        .then(result => result.length > 0)
                        .catch(() => false);

                    return {
                        name: tagName,
                        message: message,
                        date: date,
                        branch: branches.includes(currentBranch) ? currentBranch : (branches[0] || 'main'),
                        isRemote: isRemote
                    };
                } catch (error) {
                    console.error(`Error getting details for tag ${tagName}:`, error);
                    return {
                        name: tagName,
                        message: '',
                        date: new Date().toISOString(),
                        branch: currentBranch,
                        isRemote: false
                    };
                }
            }));

            // 按日期排序，最新的在前面
            tagDetails.sort((a, b) => new Date(b.date) - new Date(a.date));

            return {
                success: true,
                tags: tagDetails
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async createTag(repoPath, tagName, message) {
        try {
            const git = simpleGit(repoPath);
            await git.addTag(tagName, message);
            return { success: true, message: `Tag ${tagName} created successfully` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async deleteTag(repoPath, tagName) {
        try {
            const git = simpleGit(repoPath);
            
            // 先檢查標籤是否存在於遠程
            const isRemote = await git.raw(['ls-remote', '--tags', 'origin', tagName])
                .then(result => result.length > 0)
                .catch(() => false);

            if (isRemote) {
                // 如果是遠程標籤，先刪除遠程標籤
                try {
                    await git.push(['origin', ':refs/tags/' + tagName]);
                } catch (error) {
                    console.error('Failed to delete remote tag:', error);
                    return { 
                        success: false, 
                        error: `Failed to delete remote tag: ${error.message}` 
                    };
                }
            }

            // 刪除本地標籤
            await git.tag(['-d', tagName]);

            // 重新獲取標籤列表以確保同步
            await git.fetch(['--prune', '--prune-tags']);

            return { 
                success: true, 
                message: `Tag ${tagName} deleted successfully${isRemote ? ' (local and remote)' : ''}` 
            };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    async pushTag(repoPath, tagName) {
        try {
            const git = simpleGit(repoPath);
            
            // 推送特定標籤
            await git.push('origin', tagName);
            
            return { 
                success: true, 
                message: `Tag ${tagName} pushed successfully` 
            };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    // 遠程操作
    async pull(repoPath) {
        try {
            const git = simpleGit(repoPath);
            const result = await git.pull();
            return { 
                success: true, 
                message: 'Pull completed successfully',
                details: result
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 幫助函數來處理 GitHub URL
    formatGitHubUrl(url) {
        // 移除結尾的 .git（如果有的話）
        url = url.replace(/\.git$/, '');
        // 如果沒有 .git 結尾，添加它
        if (!url.endsWith('.git')) {
            url = `${url}.git`;
        }
        return url;
    }

    // 修改 setRemote 方法
    async setRemote(repoPath, remoteUrl) {
        try {
            const git = simpleGit(repoPath);
            
            // 格式化 GitHub URL
            remoteUrl = this.formatGitHubUrl(remoteUrl);
            
            // 先檢查是否已有遠程倉庫
            const remotes = await git.getRemotes();
            const hasOrigin = remotes.some(remote => remote.name === 'origin');
            
            if (hasOrigin) {
                await git.removeRemote('origin');
            }
            
            // 添加新的遠程倉庫
            await git.addRemote('origin', remoteUrl);
            
            // 設置主分支名稱為 main
            await git.branch(['-M', 'main']);
            
            // 添加並提交所有更改（如果有的話）
            const status = await git.status();
            if (status.files.length > 0) {
                await git.add('.');
                await git.commit('Initial commit');
            }
            
            // 推送到遠程倉庫
            await git.push(['-u', 'origin', 'main']);
            
            return {
                success: true,
                message: 'Remote repository configured and changes pushed successfully'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 修改 push 方法
    async push(repoPath, branch = 'main') {  // 默認使用 main 而不是 master
        try {
            const git = simpleGit(repoPath);
            
            // 檢查是否有遠程倉庫
            const remotes = await git.getRemotes();
            if (remotes.length === 0) {
                return {
                    success: false,
                    error: 'no_remote',
                    message: 'No remote repository configured'
                };
            }

            try {
                // 確保當前分支是 main
                await git.branch(['-M', 'main']);
                // 嘗試推送
                await git.push(['-u', 'origin', 'main']);
                return {
                    success: true,
                    message: 'Push completed successfully'
                };
            } catch (pushError) {
                if (pushError.message.includes('no upstream branch')) {
                    try {
                        await git.push(['-u', 'origin', 'main']);
                        return {
                            success: true,
                            message: 'Branch pushed and upstream set successfully'
                        };
                    } catch (error) {
                        return {
                            success: false,
                            error: error.message
                        };
                    }
                }
                throw pushError;
            }
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async runGitCommand(repoPath, command) {
        try {
            const git = simpleGit(repoPath);
            
            // 處理特殊情況：只輸入 "git"
            if (command === 'git') {
                return {
                    success: true,
                    output: `usage: git <command>

These are common Git commands:

   clone      Clone a repository
   init       Create an empty Git repository
   add        Add file contents to the index
   mv         Move or rename a file or directory
   restore    Restore working tree files
   rm         Remove files from working tree and index
   status     Show the working tree status
   commit     Record changes to the repository
   branch     List, create, or delete branches
   checkout   Switch branches or restore working tree files
   merge      Join two or more development histories together
   push       Update remote refs along with associated objects
   pull       Fetch from and integrate with another repository
   fetch      Download objects and refs from another repository
   log        Show commit logs
   tag        Create, list, delete or verify a tag object

'git help -a' and 'git help -g' list available subcommands`
                };
            }

            // 如果命令不是以 "git" 開頭，自動添加
            if (!command.startsWith('git ')) {
                command = `git ${command}`;
            }

            try {
                const result = await git.raw(command.split(' ').slice(1));
                return { 
                    success: true, 
                    output: result || 'Command executed successfully (no output)' 
                };
            } catch (error) {
                // Git 命令執行錯誤時的處理
                return { 
                    success: false, 
                    error: error.message || 'Command failed'
                };
            }
        } catch (error) {
            return { 
                success: false, 
                error: `Failed to execute command: ${error.message}` 
            };
        }
    }

    static setupIPCHandlers(ipcMain) {
        const service = new GitService();

        ipcMain.handle('git-create-repository', async (event, name, path, type, description) => {
            return await service.createRepository(name, path, type, description);
        });

        ipcMain.handle('git-clone-repository', async (event, { url, path }) => {
            return await service.cloneRepository(url, path);
        });

        ipcMain.handle('git-list-repositories', async () => {
            return await service.listLocalRepositories();
        });

        ipcMain.handle('git-watch-repository', async (event, path) => {
            return await service.watchRepository(path);
        });

        ipcMain.handle('git-add-repository', async (event, data) => {
            return await service.addRepository(data);
        });

        ipcMain.handle('git-remove-repository', async (event, path) => {
            return await service.removeRepository(path);
        });

        // Tag 操作
        ipcMain.handle('git-list-tags', async (event, path) => {
            return await service.listTags(path);
        });

        ipcMain.handle('git-create-tag', async (event, { path, name, message }) => {
            return await service.createTag(path, name, message);
        });

        ipcMain.handle('git-delete-tag', async (event, { path, name }) => {
            return await service.deleteTag(path, name);
        });

        ipcMain.handle('git-push-tag', async (event, { path, name }) => {
            return await service.pushTag(path, name);
        });

        // 遠程操作
        ipcMain.handle('git-pull', async (event, path) => {
            return await service.pull(path);
        });

        ipcMain.handle('git-push', async (event, { path, branch }) => {
            return await service.push(path, branch);
        });

        ipcMain.handle('git-run-command', async (event, { path, command }) => {
            return await service.runGitCommand(path, command);
        });

        // 添加新的 IPC 處理器
        ipcMain.handle('git-status', async (event, path) => {
            return await service.getStatus(path);
        });

        ipcMain.handle('git-add', async (event, path, files) => {
            return await service.addFiles(path, files);
        });

        ipcMain.handle('git-commit', async (event, path, message) => {
            return await service.commit(path, message);
        });

        ipcMain.handle('git-discard', async (event, path, file) => {
            return await service.discardChanges(path, file);
        });

        ipcMain.handle('git-create-file', async (event, path, filename, content) => {
            return await service.createFile(path, filename, content);
        });

        ipcMain.handle('git-set-remote', async (event, path, url) => {
            return await service.setRemote(path, url);
        });

        ipcMain.handle('git-is-directory', async (event, path) => {
            return await service.isGitDirectory(path);
        });
    }

    // 將新函數移到類內部
    async getStatus(repoPath) {
        try {
            const git = simpleGit(repoPath);
            const status = await git.status();
            
            const files = [
                ...status.modified.map(path => ({ path, status: 'Modified' })),
                ...status.not_added.map(path => ({ path, status: 'Added' })),
                ...status.deleted.map(path => ({ path, status: 'Deleted' }))
            ];

            return {
                success: true,
                files
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async addFiles(repoPath, files) {
        try {
            const git = simpleGit(repoPath);
            await git.add(files);
            return {
                success: true
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async commit(repoPath, message) {
        try {
            const git = simpleGit(repoPath);
            const result = await git.commit(message);
            return {
                success: true,
                message: result.summary
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async discardChanges(repoPath, filePath) {
        try {
            const git = simpleGit(repoPath);
            const status = await git.status();
            
            // 檢查文件狀態
            const fullPath = path.join(repoPath, filePath);
            
            if (status.not_added.includes(filePath)) {
                // 如果是未追蹤的文件，直接刪除
                try {
                    await fs.unlink(fullPath);
                    return {
                        success: true
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: `Failed to delete file: ${error.message}`
                    };
                }
            } else {
                // 如果是已追蹤的文件，使用 git checkout
                try {
                    await git.checkout(['--', filePath]);
                    return {
                        success: true
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: `Cannot discard changes: ${error.message}`
                    };
                }
            }
        } catch (error) {
            return {
                success: false,
                error: `Operation failed: ${error.message}`
            };
        }
    }

    async createFile(repoPath, filename, content) {
        try {
            const filePath = path.join(repoPath, filename);
            await fs.writeFile(filePath, content, 'utf8');
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Failed to create file: ${error.message}`
            };
        }
    }

    // 獲取指定路徑的 git 實例
    getGit(repoPath) {
        return simpleGit(repoPath);
    }

    async listRepositories() {
        try {
            const repos = await this.getStoredRepositories();
            
            // 檢查每個倉庫的狀態
            const validRepos = [];
            for (const repo of repos) {
                try {
                    const git = this.getGit(repo.path);
                    const status = await git.status();
                    validRepos.push({
                        ...repo,
                        branch: status.current,
                        remote: await this.getRemoteUrl(repo.path)
                    });
                } catch (error) {
                    console.warn(`Skipping invalid repository ${repo.path}:`, error);
                }
            }

            return {
                success: true,
                repositories: validRepos
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to list repositories: ${error.message}`
            };
        }
    }

    async getRemoteUrl(repoPath) {
        try {
            const git = this.getGit(repoPath);
            const remote = await git.remote(['get-url', 'origin']);
            return remote.trim();
        } catch (error) {
            return null;
        }
    }
}

// 只導出 GitService 類
module.exports = GitService; 