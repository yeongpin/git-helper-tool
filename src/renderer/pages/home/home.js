import { showModal, closeModal } from '../../components/modal/modal.js';
import { showNotification } from '../../components/notification/notification.js';
import { createRepository } from '../../js/commands/repository/create.js';
import { cloneRepository } from '../../js/commands/repository/clone.js';
import { handleTags } from '../../js/commands/tag/tag-manager.js';
import { RepositoryMonitor } from '../../components/repository-monitor/repository-monitor.js';
import { RepositoryManager } from '../../components/repository-manager/repository-manager.js';
import { validateGitUrl } from '../../js/utils/validator.js';
import { Logger } from '../../components/logger/logger.js';

let activeMonitors = new Map();
let repoManager;

document.addEventListener('DOMContentLoaded', () => {
    // 初始化倉庫管理器
    repoManager = new RepositoryManager();
    
    // 初始化事件監聽
    initializeEventListeners();
    
    // 加載倉庫列表
    loadRepositories();

    // 在 DOMContentLoaded 事件處理中添加
    window.addEventListener('repository-changed', () => {
        loadRepositories();
    });
});

function initializeEventListeners() {
    document.getElementById('createRepoBtn').addEventListener('click', handleCreateRepo);
    document.getElementById('cloneRepoBtn').addEventListener('click', cloneRepository);  // 直接使用 cloneRepository

    document.getElementById('notificationBtn').addEventListener('click', async () => {
        await window.systemAPI.openNotificationHistory();
    });

    // 窗口控制
    document.querySelector('.titlebar-minimize').addEventListener('click', () => {
        window.systemAPI.minimizeWindow();
    });

    document.querySelector('.titlebar-maximize').addEventListener('click', () => {
        window.systemAPI.maximizeWindow();
    });

    document.querySelector('.titlebar-close').addEventListener('click', () => {
        window.systemAPI.closeWindow();
    });
}

async function handleCreateRepo() {
    const modalContent = `
        <form id="createRepoForm">
            <div class="form-group">
                <label for="repoName">Repository Name:</label>
                <input type="text" id="repoName" required placeholder="my-awesome-project">
            </div>
            <div class="form-group">
                <label for="repoPath">Location:</label>
                <div class="path-input">
                    <input type="text" id="repoPath" required readonly>
                    <button type="button" class="browse-btn">Browse</button>
                </div>
            </div>
            <div class="form-group">
                <label>Repository Type:</label>
                <div class="repo-type-options">
                    <label class="radio-label">
                        <input type="radio" name="repoType" value="local" checked>
                        <span>Local Only</span>
                        <small>Create repository only on your computer</small>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="repoType" value="private">
                        <span>Private on GitHub</span>
                        <small>Create private repository on GitHub</small>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="repoType" value="public">
                        <span>Public on GitHub</span>
                        <small>Create public repository on GitHub</small>
                    </label>
                </div>
            </div>
            <div class="form-group github-info" style="display: none;">
                <div class="alert info">
                    <p>Please follow these steps:</p>
                    <ol>
                        <li>Go to GitHub and create a new repository named <span class="repo-name-display"></span></li>
                        <li>Do not initialize it with README, .gitignore, or license</li>
                        <li>Come back here and click Create Repository</li>
                    </ol>
                </div>
            </div>
            <div class="form-group">
                <label for="repoDescription">Description: (optional)</label>
                <textarea id="repoDescription" rows="3" placeholder="Brief description of your project"></textarea>
            </div>
            <div class="form-actions">
                <button type="submit" class="commit-submit">Create Repository</button>
                <button type="button" class="cancel-btn" id="cancelBtn">Cancel</button>
            </div>
        </form>
    `;

    showModal('Create New Repository', modalContent);

    // 只使用一個事件監聽器
    const browseBtn = document.querySelector('.browse-btn');
    if (browseBtn) {
        browseBtn.addEventListener('click', async (e) => {
            e.preventDefault();  // 防止表單提交
            const path = await window.systemAPI.selectDirectory();
            if (path) {
                document.getElementById('repoPath').value = path;
            }
        });
    }

    // 當倉庫類型改變時顯示/隱藏 GitHub 信息
    document.querySelectorAll('input[name="repoType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const githubInfo = document.querySelector('.github-info');
            const repoName = document.getElementById('repoName').value;
            if (e.target.value !== 'local') {
                githubInfo.style.display = 'block';
                document.querySelector('.repo-name-display').textContent = repoName;
            } else {
                githubInfo.style.display = 'none';
            }
        });
    });

    // 當倉庫名稱改變時更新顯示
    document.getElementById('repoName').addEventListener('input', (e) => {
        const repoNameDisplay = document.querySelector('.repo-name-display');
        if (repoNameDisplay) {
            repoNameDisplay.textContent = e.target.value;
        }
    });

    document.getElementById('createRepoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('repoName').value;
        const path = document.getElementById('repoPath').value;
        const type = document.querySelector('input[name="repoType"]:checked').value;
        const description = document.getElementById('repoDescription').value || '';
        
        if (!path) {
            showNotification('Please select a directory', 'error');
            return;
        }

        try {
            // 1. 初始化倉庫
            const initResult = await window.gitAPI.createRepository(name, path, type, description);
            if (!initResult.success) {
                throw new Error(initResult.error);
            }

            // 2. 添加 README.md
            const readmeContent = `# ${name}\n\n${description}`;
            await window.gitAPI.createFile(path, 'README.md', readmeContent);

            // 3. 添加 .gitignore
            const gitignoreContent = `node_modules/\n.DS_Store\n.env\n`;
            await window.gitAPI.createFile(path, '.gitignore', gitignoreContent);

            // 4. 添加所有文件並提交
            const addResult = await window.gitAPI.addFiles(path, ['.']);
            if (!addResult.success) {
                throw new Error(addResult.error);
            }

            const commitResult = await window.gitAPI.commit(path, 'Initial commit');
            if (!commitResult.success) {
                throw new Error(commitResult.error);
            }

            showNotification('Repository created successfully');
            await loadRepositories();
            closeModal();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });

    // 修改 handleCreateRepo 中的取消按鈕處理
    document.getElementById('cancelBtn').addEventListener('click', () => {
        closeModal();  // 使用 closeModal 而不是 window.modal.close
    });
}

// 將工具函數添加到 window 對象
window.selectDirectory = async function() {
    const path = await window.systemAPI.selectDirectory();
    if (path) {
        const input = document.querySelector('.path-input input');
        if (input) {
            input.value = path;
        }
    }
}

window.openInExplorer = async function(repoPath) {
    await window.systemAPI.openInExplorer(repoPath);
}

window.openInTerminal = async function(repoPath) {
    await window.systemAPI.openInTerminal(repoPath);
}

// 修改移除倉庫的處理
async function removeRepository(path) {
    if (confirm('Are you sure you want to remove this repository from the list?')) {
        try {
            const result = await window.gitAPI.removeRepository(path);
            if (result.success) {
                // 找到並移除對應的監控器
                const monitor = activeMonitors.get(path);
                if (monitor) {
                    monitor.stopWatching();
                    activeMonitors.delete(path);
                }
                
                // 從 UI 中移除
                const repoItem = document.querySelector(`.repo-item[data-path="${path}"]`);
                if (repoItem) {
                    repoItem.classList.add('removing');
                    setTimeout(() => {
                        repoItem.remove();
                        if (document.querySelectorAll('.repo-item').length === 0) {
                            document.getElementById('repoList').innerHTML = 
                                '<div class="no-repos">No repositories found</div>';
                        }
                    }, 300);
                }
                showNotification('Repository removed successfully', 'success');
                // 觸發倉庫變更事件
                window.dispatchEvent(new CustomEvent('repository-changed'));
            } else {
                showNotification(result.error || 'Failed to remove repository', 'error');
            }
        } catch (error) {
            showNotification(`Failed to remove repository: ${error.message}`, 'error');
        }
    }
}

function generateRepoHTML(repo) {
    const normalizedPath = repo.path.replace(/\\/g, '/');
    const safeId = normalizedPath.replace(/[:\\/]/g, '_');
    
    return `
        <div class="repo-item" data-path="${normalizedPath}">
            <div class="repo-header">
                <div class="repo-title">
                    <h3>${repo.name}</h3>
                    <div class="repo-branch">
                        <span class="branch-info">
                            <i class="branch-icon">⑂</i> ${repo.status.current}
                        </span>
                        ${repo.status.remote ? `
                            <span class="remote-info">
                                <i class="remote-icon">⇄</i> ${repo.status.remote}
                            </span>
                        ` : ''}
                    </div>
                </div>
                <div class="repo-expand-icon">▼</div>
            </div>
            <div class="repo-content">
                <div class="repo-info">
                    <p class="repo-path">${repo.path}</p>
                </div>
                <div id="repo-status-${normalizedPath}" class="repo-status-container"></div>
                <div class="repo-actions">
                    <div class="action-buttons">
                        <button class="action-btn open-explorer" data-path="${normalizedPath}">
                            <i class="folder-icon">📁</i> Open
                        </button>
                        <button class="action-btn open-terminal" data-path="${normalizedPath}">
                            <i class="terminal-icon">⌘</i> Terminal
                        </button>
                        <button class="action-btn pull-btn" data-path="${normalizedPath}">
                            <i class="pull-icon">⬇️</i> Pull
                        </button>
                        <button class="action-btn push-btn" data-path="${normalizedPath}">
                            <i class="push-icon">⬆️</i> Push
                        </button>
                        <button class="action-btn tags-btn" data-path="${normalizedPath}">
                            <i class="tags-icon">🏷️</i> Tags
                        </button>
                        <button class="action-btn commit-btn" data-path="${normalizedPath}">
                            <i class="commit-icon">📝</i> Commit
                        </button>
                        <button class="action-btn danger remove-repo" data-path="${normalizedPath}">
                            <i class="remove-icon">🗑</i> Remove
                        </button>
                    </div>
                    <div class="repo-terminal">
                        <div class="terminal-header">
                            <span>Terminal</span>
                            <button class="terminal-clear" title="Clear terminal">Clear</button>
                        </div>
                        <div class="terminal-content">
                            <div class="terminal-output" id="terminal-${safeId}"></div>
                            <div class="terminal-input-line">
                                <span class="prompt">$</span>
                                <input type="text" class="terminal-input" placeholder="Enter git command...">
                            </div>
                        </div>
                    </div>
                    <div class="repo-logs">
                        <div class="logs-header">
                            <span>Activity Log</span>
                            <button class="logs-clear" title="Clear logs">Clear</button>
                        </div>
                        <div class="logs-content" id="logs-${safeId}"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 修改日誌函數
function addLog(repoPath, action, details = '') {
    const safeId = repoPath.replace(/[:\\/]/g, '_');
    const logsContainer = document.getElementById(`logs-${safeId}`);
    if (!logsContainer) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.innerHTML = `
        <span class="log-time">${timeString}</span>
        <span class="log-action">${action}</span>
        ${details ? `<span class="log-details">${details}</span>` : ''}
    `;

    logsContainer.insertBefore(logEntry, logsContainer.firstChild);

    // 保持最多5條日誌
    while (logsContainer.children.length > 5) {
        logsContainer.removeChild(logsContainer.lastChild);
    }
}

export async function loadRepositories() {
    const repoList = document.getElementById('repoList');
    try {
        const result = await window.gitAPI.listRepositories();
        if (result.success) {
            if (result.repositories.length === 0) {
                repoList.innerHTML = `
                    <div class="empty-state">
                        <p>No repositories found</p>
                        <p>Click "Add Repository" to add an existing repository or create a new one</p>
                    </div>
                `;
                return;
            }

            repoList.innerHTML = result.repositories.map(repo => generateRepoHTML(repo)).join('');

            result.repositories.forEach(repo => {
                if (!activeMonitors.has(repo.path)) {
                    const monitor = new RepositoryMonitor(repo.path);
                    activeMonitors.set(repo.path, monitor);
                }
            });
        } else {
            showNotification(result.error, 'error');
        }
    } catch (error) {
        showNotification(`Failed to load repositories: ${error.message}`, 'error');
    }
}

// 清理函數
function cleanup() {
    activeMonitors.forEach(monitor => monitor.stopWatching());
    activeMonitors.clear();
}

// 在頁面卸載時清理
window.addEventListener('beforeunload', cleanup);

// 修改事件委託處理
document.addEventListener('click', async (e) => {
    const button = e.target.closest('button');
    if (!button) return;

    const path = button.dataset.path;
    if (!path) return;

    try {
        if (button.classList.contains('open-explorer')) {
            const result = await window.systemAPI.openInExplorer(path);
            if (result.success) {
                addLog(path, 'Opened in Explorer');
            } else {
                showNotification(result.error, 'error');
            }
        } else if (button.classList.contains('open-terminal')) {
            const result = await window.systemAPI.openInTerminal(path);
            if (result.success) {
                addLog(path, 'Opened in Terminal');
            } else {
                showNotification(result.error, 'error');
            }
        } else if (button.classList.contains('pull-btn')) {
            const result = await window.gitAPI.pull(path);
            if (result.success) {
                showNotification('Pull completed successfully');
                addLog(path, 'Git Pull', result.message || 'Successfully pulled changes');
            } else {
                showNotification(result.error, 'error');
                addLog(path, 'Git Pull Failed', result.error);
            }
        } else if (button.classList.contains('push-btn')) {
            const result = await window.gitAPI.push(path);
            if (result.success) {
                showNotification('Push completed successfully');
                addLog(path, 'Git Push', result.message || 'Successfully pushed changes');
            } else if (result.error === 'no_remote') {
                // 顯示設置遠程倉庫的對話框
                const modalContent = `
                    <form id="remoteForm">
                        <div class="form-group">
                            <label for="remoteUrl">Remote Repository URL:</label>
                            <input type="text" id="remoteUrl" required 
                                   placeholder="https://github.com/username/repo.git">
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="commit-submit">Set Remote</button>
                            <button type="button" class="cancel-btn" id="cancelBtn">Cancel</button>
                        </div>
                    </form>
                `;

                showModal('Set Remote Repository', modalContent);

                document.getElementById('remoteForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const remoteUrl = document.getElementById('remoteUrl').value;
                    
                    // 設置遠程倉庫
                    const setResult = await window.gitAPI.setRemote(path, remoteUrl);
                    if (setResult.success) {
                        // 重新嘗試推送
                        const pushResult = await window.gitAPI.push(path);
                        if (pushResult.success) {
                            showNotification('Repository pushed successfully');
                            addLog(path, 'Git Push', 'Remote set and changes pushed');
                            closeModal();
                        } else {
                            showNotification(pushResult.error, 'error');
                        }
                    } else {
                        showNotification(setResult.error, 'error');
                    }
                });
            } else {
                showNotification(result.error, 'error');
                addLog(path, 'Git Push Failed', result.error);
            }
        } else if (button.classList.contains('remove-repo')) {
            // 使用 repoManager 的方法
            await repoManager.removeRepository(path);
        } else if (button.classList.contains('commit-btn')) {
            await handleCommit(path);
        } else if (button.classList.contains('tags-btn')) {
            await handleTags(path);
        }
    } catch (error) {
        showNotification(`Operation failed: ${error.message}`, 'error');
        addLog(path, 'Operation Failed', error.message);
    }
});

// 終端輸入處理
document.addEventListener('keypress', async (e) => {
    if (e.target.classList.contains('terminal-input') && e.key === 'Enter') {
        const command = e.target.value.trim();
        if (!command) return;

        const repoPath = e.target.closest('.repo-item').dataset.path;
        const safeId = repoPath.replace(/[:\\/]/g, '_');
        const terminalOutput = document.getElementById(`terminal-${safeId}`);
        
        if (!terminalOutput) return;

        // 添加命令到輸出
        const commandLine = document.createElement('div');
        commandLine.className = 'terminal-line command';
        commandLine.textContent = `$ ${command}`;
        terminalOutput.appendChild(commandLine);

        // 處理特殊命令
        if (command === 'help' || command === 'git') {
            const helpText = `
usage: git <command>

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

'git help -a' and 'git help -g' list available subcommands`.trim();
            const helpLine = document.createElement('div');
            helpLine.className = 'terminal-line help';
            helpLine.textContent = helpText;
            terminalOutput.appendChild(helpLine);
        } else {
            // 執行 Git 命令
            try {
                const result = await window.gitAPI.runGitCommand(repoPath, command);
                const outputLine = document.createElement('div');
                outputLine.className = 'terminal-line';
                
                if (result.success) {
                    outputLine.textContent = result.output || 'Command executed successfully (no output)';
                } else {
                    outputLine.className += ' error';
                    outputLine.textContent = result.error;
                }
                
                terminalOutput.appendChild(outputLine);
                addLog(repoPath, 'Git Command', command);
            } catch (error) {
                const errorLine = document.createElement('div');
                errorLine.className = 'terminal-line error';
                errorLine.textContent = error.message;
                terminalOutput.appendChild(errorLine);
            }
        }

        // 清空輸入
        e.target.value = '';
        
        // 滾動到底部
        requestAnimationFrame(() => {
            terminalOutput.scrollTop = terminalOutput.scrollHeight;
        });

        // 保持輸入框焦點
        e.target.focus();
    }
});

// 處理清除按鈕點擊
document.addEventListener('click', e => {
    if (e.target.classList.contains('terminal-clear')) {
        const repoPath = e.target.closest('.repo-item').dataset.path;
        const safeId = repoPath.replace(/[:\\/]/g, '_');
        const terminalOutput = document.getElementById(`terminal-${safeId}`);
        if (terminalOutput) {
            terminalOutput.innerHTML = '';
        }
    }
});

// 添加展開/收縮功能
document.addEventListener('click', e => {
    const header = e.target.closest('.repo-header');
    if (header) {
        const repoItem = header.closest('.repo-item');
        if (repoItem) {
            repoItem.classList.toggle('expanded');
        }
    }
});

// 處理 Commit 按鈕點擊
async function handleCommit(path) {
    // 首先獲取變更狀態
    const status = await window.gitAPI.getStatus(path);
    if (!status.success) {
        showNotification(status.error, 'error');
        return;
    }

    // 如果沒有需要提交的文件
    if (status.files.length === 0) {
        showNotification('No files need to be committed', 'info');
        addLog(path, 'Git Commit', 'No files need to be committed');
        return;
    }

    // 創建提交對話框
    const modalContent = `
        <form id="commitForm" data-repo-path="${path}">
            <div class="changes-list">
                <h3>Changes to be committed:</h3>
                <div class="file-list">
                    ${status.files.map(file => `
                        <div class="file-item">
                            <label class="file-label">
                                <input type="checkbox" name="files" value="${file.path}" checked>
                                <span class="file-status ${file.status.toLowerCase()}">${file.status}</span>
                                <span class="file-path">${file.path}</span>
                            </label>
                            <button type="button" class="discard-btn" data-path="${file.path}">
                                <i class="discard-icon">✕</i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="form-group">
                <label for="commitMessage">Commit Message:</label>
                <textarea id="commitMessage" required rows="3" placeholder="Enter commit message..."></textarea>
            </div>
            <div class="form-actions">
                <button type="submit" class="commit-submit">Commit</button>
                <button type="button" class="cancel-btn" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    `;

    showModal('Commit Changes', modalContent);

    // 處理表單提交
    document.getElementById('commitForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = document.getElementById('commitMessage').value;
        const selectedFiles = Array.from(document.querySelectorAll('input[name="files"]:checked'))
            .map(input => input.value);

        if (selectedFiles.length === 0) {
            showNotification('Please select at least one file to commit', 'error');
            return;
        }

        try {
            // 首先添加選中的文件
            const addResult = await window.gitAPI.addFiles(path, selectedFiles);
            if (!addResult.success) {
                throw new Error(addResult.error);
            }

            // 然後提交
            const commitResult = await window.gitAPI.commit(path, message);
            if (commitResult.success) {
                showNotification('Changes committed successfully');
                addLog(path, 'Git Commit', `Committed ${selectedFiles.length} files: ${message}`);
                closeModal();
            } else {
                throw new Error(commitResult.error);
            }
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });

    // 處理放棄更改
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.discard-btn')) {
            const fileItem = e.target.closest('.file-item');
            const filePath = e.target.closest('.discard-btn').dataset.path;
            const repoPath = document.getElementById('commitForm').dataset.repoPath;
            
            if (confirm(`Are you sure you want to discard changes in ${filePath}?`)) {
                try {
                    const result = await window.gitAPI.discardChanges(repoPath, filePath);
                    if (result.success) {
                        // 從 UI 中移除文件項目
                        fileItem.remove();
                        showNotification(`Changes in ${filePath} discarded`);
                        addLog(repoPath, 'Git Discard', `Discarded changes in ${filePath}`);

                        // 如果沒有更多文件，關閉模態框
                        if (document.querySelectorAll('.file-item').length === 0) {
                            closeModal();
                            showNotification('No files to commit');
                        }
                    } else {
                        showNotification(result.error, 'error');
                    }
                } catch (error) {
                    showNotification(error.message, 'error');
                }
            }
        }
    });
}