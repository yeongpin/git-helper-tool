export const repository = {
    async create() {
        const repoName = await showPromptDialog('Enter repository name:');
        if (!repoName) return;

        try {
            const result = await window.gitAPI.init(repoName);
            if (result.success) {
                showNotification('Repository created successfully!');
                await refreshRepositoryList();
            } else {
                showError(result.error);
            }
        } catch (error) {
            showError('Failed to create repository');
        }
    },

    async clone() {
        const repoUrl = await showPromptDialog('Enter repository URL:');
        if (!repoUrl) return;

        try {
            const result = await window.gitAPI.clone(repoUrl);
            if (result.success) {
                showNotification('Repository cloned successfully!');
                await refreshRepositoryList();
            } else {
                showError(result.error);
            }
        } catch (error) {
            showError('Failed to clone repository');
        }
    }
}; 