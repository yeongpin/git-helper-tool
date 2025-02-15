import { showModal, closeModal } from '../../../components/modal/modal.js';
import { showNotification } from '../../../components/notification/notification.js';

export async function handleTags(repoPath) {
    const modalContent = `
        <div class="tags-container">
            <div class="tags-tabs">
                <button class="tab-btn active" data-tab="list">Tags List</button>
                <button class="tab-btn" data-tab="create">Create Tag</button>
            </div>
            <div class="tab-content">
                <div class="tab-pane active" id="list">
                    <div class="tags-header">
                        <div class="tags-search">
                            <input type="text" id="tagSearch" placeholder="Search tags...">
                        </div>
                    </div>
                    <div class="tags-list" id="tagsList">
                        <div class="loading">Loading tags...</div>
                    </div>
                </div>
                <div class="tab-pane" id="create">
                    <form id="createTagForm">
                        <div class="form-group">
                            <label for="tagName">Tag Name:</label>
                            <input type="text" id="tagName" required 
                                   placeholder="v1.0.0"
                                   pattern="[a-zA-Z0-9_.-]+"
                                   title="Only letters, numbers, dots, dashes and underscores are allowed">
                        </div>
                        <div class="form-group">
                            <label for="tagMessage">Message:</label>
                            <textarea id="tagMessage" rows="3" 
                                     style="resize: none;"
                                     placeholder="Describe this release"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="commit-submit">Create Tag</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    showModal('Manage Tags', modalContent);

    // 標籤頁切換
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // 移除所有活動狀態
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            
            // 添加當前活動狀態
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    // 加載標籤列表
    await loadTags(repoPath);

    // 搜索功能
    document.getElementById('tagSearch').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const tagItems = document.querySelectorAll('.tag-item');
        tagItems.forEach(item => {
            const tagName = item.querySelector('.tag-name').textContent.toLowerCase();
            const tagMessage = item.querySelector('.tag-message').textContent.toLowerCase();
            if (tagName.includes(searchTerm) || tagMessage.includes(searchTerm)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    });

    // 處理創建標籤
    document.getElementById('createTagForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('tagName').value.trim();
        const message = document.getElementById('tagMessage').value.trim();

        if (!name) {
            showNotification('Tag name is required', 'error');
            return;
        }

        try {
            const result = await window.gitAPI.createTag(repoPath, name, message);
            if (result.success) {
                showNotification('Tag created successfully', 'success');
                await loadTags(repoPath);
                document.getElementById('createTagForm').reset();
            } else {
                showNotification(result.error, 'error');
            }
        } catch (error) {
            showNotification(`Failed to create tag: ${error.message}`, 'error');
        }
    });
}

async function loadTags(repoPath) {
    const tagsList = document.getElementById('tagsList');
    try {
        const result = await window.gitAPI.listTags(repoPath);
        if (result.success && result.tags.length > 0) {
            tagsList.innerHTML = result.tags.map(tag => `
                <div class="tag-item">
                    <div class="tag-info">
                        <div class="tag-header">
                            <span class="tag-name">${tag.name}</span>
                            <span class="tag-branch">${tag.branch}</span>
                            ${tag.isRemote ? '<span class="tag-remote">Remote</span>' : ''}
                            <span class="tag-date">${new Date(tag.date).toLocaleDateString()}</span>
                        </div>
                        <span class="tag-message">${tag.message || 'No description provided'}</span>
                    </div>
                    <div class="tag-actions">
                        ${!tag.isRemote ? `
                            <button class="push-tag" data-tag="${tag.name}">
                                <i class="icon">⬆️</i>
                                <span>Push</span>
                            </button>
                        ` : ''}
                        <button class="delete-tag" data-tag="${tag.name}">
                            <i class="icon">🗑️</i>
                            <span>Delete</span>
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            tagsList.innerHTML = '<div class="empty-state">No tags found. Create your first tag!</div>';
        }

        // 添加事件監聽器
        addTagEventListeners(repoPath);
    } catch (error) {
        tagsList.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    }
}

function addTagEventListeners(repoPath) {
    // 推送標籤
    document.querySelectorAll('.push-tag').forEach(button => {
        button.addEventListener('click', async () => {
            const tagName = button.dataset.tag;
            try {
                const result = await window.gitAPI.pushTag(repoPath, tagName);
                if (result.success) {
                    showNotification(`Tag ${tagName} pushed successfully`);
                    await loadTags(repoPath);  // 重新加載標籤列表
                } else {
                    showNotification(result.error, 'error');
                }
            } catch (error) {
                showNotification(`Failed to push tag: ${error.message}`, 'error');
            }
        });
    });

    // 刪除標籤
    document.querySelectorAll('.delete-tag').forEach(button => {
        button.addEventListener('click', async () => {
            const tagName = button.dataset.tag;
            if (confirm(`Are you sure you want to delete tag "${tagName}"? This will delete both local and remote tags if they exist.`)) {
                try {
                    const result = await window.gitAPI.deleteTag(repoPath, tagName);
                    if (result.success) {
                        showNotification(result.message);
                        await loadTags(repoPath);  // 重新加載標籤列表
                    } else {
                        showNotification(result.error, 'error');
                    }
                } catch (error) {
                    showNotification(`Failed to delete tag: ${error.message}`, 'error');
                }
            }
        });
    });
} 