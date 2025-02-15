export class Logger {
    constructor(repoPath) {
        this.repoPath = repoPath;
        // 對路徑進行編碼以創建有效的 ID
        const safeId = this.getSafeId(repoPath);
        this.logsContainer = document.getElementById(`logs-${safeId}`);
        this.setupEventListeners();
    }

    // 添加一個方法來生成安全的 ID
    getSafeId(path) {
        return path.replace(/[:\\/]/g, '_');
    }

    setupEventListeners() {
        // 修改清除按鈕的選擇器
        const clearButton = document.querySelector(`#logs-${this.getSafeId(this.repoPath)}`).previousElementSibling.querySelector('.logs-clear');
        if (clearButton) {
            clearButton.addEventListener('click', () => this.clear());
        }
    }

    addLog(action, details = '') {
        if (!this.logsContainer) return;

        const now = new Date();
        const timeString = now.toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `
            <span class="log-time">${timeString}</span>
            <span class="log-action">${action}</span>
            ${details ? `<span class="log-details">${details}</span>` : ''}
        `;

        this.logsContainer.insertBefore(logEntry, this.logsContainer.firstChild);

        // 保持最多5條日誌
        while (this.logsContainer.children.length > 5) {
            this.logsContainer.removeChild(this.logsContainer.lastChild);
        }
    }

    clear() {
        if (this.logsContainer) {
            this.logsContainer.innerHTML = '';
        }
    }
} 