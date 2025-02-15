import { showModal, closeModal } from '../../../components/modal/modal.js';
import { showNotification } from '../../../components/notification/notification.js';

export async function cloneRepository() {
    const modalContent = `
        <form id="cloneForm">
            <div class="form-group">
                <label for="repoUrl">Repository URL:</label>
                <input type="text" id="repoUrl" required placeholder="https://github.com/username/repo.git">
            </div>
            <div class="form-group">
                <label for="clonePath">Clone to:</label>
                <div class="path-input">
                    <input type="text" id="clonePath" required readonly>
                    <button type="button" class="browse-btn">Browse</button>
                </div>
            </div>
            <div class="form-actions">
                <button type="submit" class="commit-submit">Clone</button>
                <button type="button" class="cancel-btn">Cancel</button>
            </div>
        </form>
    `;

    showModal('Clone Repository', modalContent);

    // 處理目錄選擇
    const browseBtn = document.querySelector('.browse-btn');
    if (browseBtn) {
        browseBtn.addEventListener('click', async (e) => {
            e.stopPropagation();  // 阻止事件冒泡
            const path = await window.systemAPI.selectDirectory();
            if (path) {
                document.getElementById('clonePath').value = path;
            }
        }, { once: true });  // 確保事件只觸發一次
    }

    // 處理表單提交
    document.getElementById('cloneForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = document.getElementById('repoUrl').value.trim();
        const path = document.getElementById('clonePath').value.trim();

        if (!url || !path) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        try {
            const notification = showNotification('Cloning repository...', 'info');
            const result = await window.gitAPI.cloneRepository({ url, path });
            
            if (result && result.success) {
                notification.update('Repository cloned successfully', 'success');
                closeModal();
                window.dispatchEvent(new CustomEvent('repository-changed'));
            } else {
                notification.update(result?.error || 'Failed to clone repository', 'error');
            }
        } catch (error) {
            showNotification(`Failed to clone repository: ${error.message}`, 'error');
        }
    });

    // 處理取消按鈕
    document.querySelector('.cancel-btn').addEventListener('click', closeModal);
} 