import { showNotification } from '../notification/notification.js';
import { TagManager } from '../tag-manager/tag-manager.js';

export class RepositoryMonitor {
    constructor(repoPath) {
        this.repoPath = repoPath;
        this.isWatching = false;
        this.interval = null;
    }

    async startWatching() {
        if (this.isWatching) return;
        
        this.isWatching = true;
        await this.checkStatus();
        
        // 每30秒檢查一次狀態
        this.interval = setInterval(() => this.checkStatus(), 30000);
    }

    stopWatching() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isWatching = false;
    }

    async checkStatus() {
        try {
            const status = await window.gitAPI.watchRepository(this.repoPath);
            if (status.success) {
                this.updateStatusUI(status);
                // 如果有需要注意的變更，顯示通知
                if (status.needsCommit || status.needsPull || status.needsPush) {
                    this.showStatusNotification(status);
                }
            } else {
                console.error('Failed to check repository status:', status.error);
            }
        } catch (error) {
            console.error('Error checking repository status:', error);
        }
    }

    showStatusNotification(status) {
        let message = '';
        if (status.needsCommit) {
            message += `Changes to commit (${status.modified.length + status.untracked.length} files)\n`;
        }
        if (status.needsPull) {
            message += `Need to pull (${status.behind} commits behind)\n`;
        }
        if (status.needsPush) {
            message += `Need to push (${status.ahead} commits ahead)`;
        }
        if (message) {
            showNotification(`Repository ${this.repoPath}:\n${message}`, 'info');
        }
    }

    updateStatusUI(status) {
        const statusElement = document.getElementById(`repo-status-${this.repoPath}`);
        if (!statusElement) return;

        let html = '<div class="repo-status">';
        
        if (status.needsCommit) {
            html += `
                <div class="status-item warning">
                    <span class="status-icon">📝</span>
                    <span>Changes to commit (${status.modified.length + status.untracked.length} files)</span>
                </div>
            `;
        }

        if (status.needsPull) {
            html += `
                <div class="status-item warning">
                    <span class="status-icon">⬇️</span>
                    <span>Need to pull (${status.behind} commits behind)</span>
                </div>
            `;
        }

        if (status.needsPush) {
            html += `
                <div class="status-item info">
                    <span class="status-icon">⬆️</span>
                    <span>Need to push (${status.ahead} commits ahead)</span>
                </div>
            `;
        }

        if (!status.needsCommit && !status.needsPull && !status.needsPush) {
            html += `
                <div class="status-item success">
                    <span class="status-icon">✅</span>
                    <span>Repository is up to date</span>
                </div>
            `;
        }

        // 添加操作按鈕
        html += `
            <div class="repo-operations">
                <div class="git-actions">
                    <button class="action-btn pull-btn" data-path="${this.repoPath}">
                        <i class="pull-icon">⬇️</i> Pull
                    </button>
                    <button class="action-btn push-btn" data-path="${this.repoPath}">
                        <i class="push-icon">⬆️</i> Push
                    </button>
                </div>
                <div class="tag-actions">
                    <button class="action-btn tags-btn" data-path="${this.repoPath}">
                        <i class="tags-icon">🏷️</i> Manage Tags
                    </button>
                </div>
            </div>
        `;

        html += '</div>';
        statusElement.innerHTML = html;

        // 添加事件監聽器
        const actionsContainer = statusElement.querySelector('.repo-operations');
        if (actionsContainer) {
            actionsContainer.addEventListener('click', async (e) => {
                const button = e.target.closest('button');
                if (!button) return;

                const path = button.dataset.path;
                if (!path) return;

                try {
                    if (button.classList.contains('pull-btn')) {
                        const result = await this.pullRepository(path);
                        if (result.success) {
                            showNotification('Pull completed successfully');
                            await this.checkStatus();
                        } else {
                            showNotification(result.error, 'error');
                        }
                    } else if (button.classList.contains('push-btn')) {
                        const result = await this.pushRepository(path);
                        if (result.success) {
                            showNotification('Push completed successfully');
                            await this.checkStatus();
                        } else {
                            showNotification(result.error, 'error');
                        }
                    } else if (button.classList.contains('tags-btn')) {
                        await this.manageTags(path);
                    }
                } catch (error) {
                    showNotification(`Operation failed: ${error.message}`, 'error');
                }
            });
        }
    }

    async pullRepository(path) {
        const result = await window.gitAPI.pull(path);
        if (result.success) {
            showNotification(result.message);
            await this.checkStatus();
        } else {
            showNotification(result.error, 'error');
        }
    }

    async pushRepository(path) {
        const result = await window.gitAPI.push(path);
        if (result.success) {
            showNotification(result.message);
            await this.checkStatus();
        } else {
            showNotification(result.error, 'error');
        }
    }

    async manageTags(path) {
        const tagManager = new TagManager(path);
        await tagManager.showTagsDialog();
    }
} 