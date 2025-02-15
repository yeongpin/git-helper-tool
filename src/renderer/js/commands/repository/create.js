import { showNotification } from '../../../components/notification/notification.js';

export async function createRepository(name) {
    try {
        // 先選擇目錄
        const directory = await window.systemAPI.selectDirectory();
        if (!directory) {
            return { success: false, error: 'No directory selected' };
        }

        // 在選定目錄下創建倉庫
        const result = await window.gitAPI.createRepository({
            name,
            path: directory
        });

        if (result.success) {
            showNotification(`Repository "${name}" created successfully`);
        } else {
            showNotification(result.error, 'error');
        }

        return result;
    } catch (error) {
        showNotification(error.message, 'error');
        return { success: false, error: error.message };
    }
} 