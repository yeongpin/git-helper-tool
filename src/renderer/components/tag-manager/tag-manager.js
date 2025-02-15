import { showNotification } from '../notification/notification.js';
import { showModal, closeModal } from '../modal/modal.js';

export class TagManager {
    constructor(repoPath) {
        this.repoPath = repoPath;
        this.tags = [];
    }

    async loadTags() {
        try {
            const result = await window.gitAPI.listTags(this.repoPath);
            if (result.success) {
                this.tags = result.tags;
                return this.tags;
            } else {
                showNotification(result.error, 'error');
                return [];
            }
        } catch (error) {
            showNotification(error.message, 'error');
            return [];
        }
    }

    async showTagsDialog() {
        const tags = await this.loadTags();
        const modalContent = `
            <div class="tags-container">
                <div class="tags-list">
                    ${tags.map(tag => `
                        <div class="tag-item">
                            <span class="tag-name">${tag}</span>
                            <div class="tag-actions">
                                <button class="action-btn push-tag" data-tag="${tag}">Push</button>
                                <button class="action-btn danger delete-tag" data-tag="${tag}">Delete</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="create-tag-form">
                    <h3>Create New Tag</h3>
                    <form id="createTagForm">
                        <div class="form-group">
                            <label for="tagName">Tag Name:</label>
                            <input type="text" id="tagName" required>
                        </div>
                        <div class="form-group">
                            <label for="tagMessage">Message:</label>
                            <textarea id="tagMessage" required></textarea>
                        </div>
                        <button type="submit" class="action-btn primary">Create Tag</button>
                    </form>
                </div>
            </div>
        `;

        showModal('Manage Tags', modalContent);

        // 事件處理
        document.getElementById('createTagForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('tagName').value;
            const message = document.getElementById('tagMessage').value;
            
            const result = await window.gitAPI.createTag(this.repoPath, name, message);
            if (result.success) {
                showNotification(result.message);
                await this.loadTags();
                closeModal();
            } else {
                showNotification(result.error, 'error');
            }
        });

        // 使用事件委託處理標籤操作
        document.querySelector('.tags-list').addEventListener('click', async (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const tagName = button.dataset.tag;
            if (button.classList.contains('delete-tag')) {
                if (confirm(`Are you sure you want to delete tag "${tagName}"?`)) {
                    const result = await window.gitAPI.deleteTag(this.repoPath, tagName);
                    if (result.success) {
                        showNotification(result.message);
                        await this.loadTags();
                    } else {
                        showNotification(result.error, 'error');
                    }
                }
            } else if (button.classList.contains('push-tag')) {
                const result = await window.gitAPI.pushTag(this.repoPath, tagName);
                if (result.success) {
                    showNotification(result.message);
                } else {
                    showNotification(result.error, 'error');
                }
            }
        });
    }
} 