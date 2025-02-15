import { showNotification } from '../notification/notification.js';

export class RepositoryManager {
    constructor() {
        this.initializeUI();
    }

    initializeUI() {
        // 添加倉庫按鈕
        const addButton = document.createElement('button');
        addButton.className = 'action-btn primary';
        addButton.innerHTML = '<i class="add-icon">+</i> Add Repository';
        addButton.onclick = () => this.showAddRepositoryDialog();
        
        // 搜索輸入框
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'search-input';
        searchInput.placeholder = 'Search repositories...';
        searchInput.oninput = (e) => this.filterRepositories(e.target.value);

        // 創建工具欄容器
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.appendChild(searchInput);

        // 添加到工具欄
        const toolbar = document.querySelector('.repositories-toolbar');
        if (toolbar) {
            toolbar.appendChild(searchContainer);
            toolbar.appendChild(addButton);
        }
    }

    async showAddRepositoryDialog() {
        try {
            const directory = await window.systemAPI.selectDirectory();
            if (!directory) return;

            // 檢查是否是 Git 倉庫
            const isRepo = await window.gitAPI.isGitDirectory(directory);
            if (!isRepo) {
                showNotification('Selected directory is not a Git repository', 'error');
                return;
            }

            const result = await window.gitAPI.addRepository({ 
                name: window.systemAPI.path.basename(directory), 
                path: directory 
            });

            if (result.success) {
                showNotification('Repository added successfully', 'success');
                window.dispatchEvent(new CustomEvent('repository-changed'));
            } else {
                showNotification(result.error, 'error');
            }
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    filterRepositories(searchTerm) {
        const repoItems = document.querySelectorAll('.repo-item');
        searchTerm = searchTerm.toLowerCase();

        repoItems.forEach(item => {
            const name = item.querySelector('h3')?.textContent.toLowerCase() || '';
            const repoPath = item.querySelector('.repo-path')?.textContent.toLowerCase() || '';
            
            if (name.includes(searchTerm) || repoPath.includes(searchTerm)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    }

    async removeRepository(path) {
        if (confirm('Are you sure you want to remove this repository from the list?')) {
            try {
                // 找到要刪除的倉庫的完整信息
                const repoItem = document.querySelector(`.repo-item[data-path="${path}"]`);
                const repoName = repoItem.querySelector('h3').textContent;
                
                const result = await window.gitAPI.removeRepository(path);  // 只傳遞 path
                if (result.success) {
                    // 找到並移除對應的監控器
                    const monitor = window.activeMonitors?.get(path);
                    if (monitor) {
                        monitor.stopWatching();
                        window.activeMonitors.delete(path);
                    }
                    
                    // 從 UI 中移除
                    if (repoItem) {
                        repoItem.classList.add('removing');
                        setTimeout(() => {
                            repoItem.remove();
                            if (document.querySelectorAll('.repo-item').length === 0) {
                                document.getElementById('repoList').innerHTML = `
                                    <div class="empty-state">
                                        <p>No repositories found</p>
                                        <p>Click "Add Repository" to add an existing repository or create a new one</p>
                                    </div>
                                `;
                            }
                        }, 300);
                    }
                    
                    showNotification('Repository removed successfully', 'success');
                } else {
                    showNotification(result.error || 'Failed to remove repository', 'error');
                }
            } catch (error) {
                showNotification(error.message, 'error');
            }
        }
    }
} 