const { contextBridge, ipcRenderer } = require('electron');
const nodePath = require('path');  // 改名以避免衝突

// 暴露安全的API到渲染進程
contextBridge.exposeInMainWorld('gitAPI', {
    // Repository operations
    createRepository: (name, path, type, description) => ipcRenderer.invoke('git-create-repository', name, path, type, description),
    cloneRepository: (url) => ipcRenderer.invoke('git-clone-repository', url),
    listRepositories: () => ipcRenderer.invoke('git-list-repositories'),
    addRepository: (data) => ipcRenderer.invoke('git-add-repository', data),
    removeRepository: (path) => ipcRenderer.invoke('git-remove-repository', path),
    watchRepository: (path) => ipcRenderer.invoke('git-watch-repository', path),
    
    // Branch operations
    createBranch: (name) => ipcRenderer.invoke('git-create-branch', name),
    listBranches: () => ipcRenderer.invoke('git-list-branches'),
    switchBranch: (name) => ipcRenderer.invoke('git-switch-branch', name),
    
    // Commit operations
    addFiles: (path, files) => ipcRenderer.invoke('git-add', path, files),
    commit: (path, message) => ipcRenderer.invoke('git-commit', path, message),
    push: () => ipcRenderer.invoke('git-push'),

    // Tag operations
    listTags: (path) => ipcRenderer.invoke('git-list-tags', path),
    createTag: (path, name, message) => ipcRenderer.invoke('git-create-tag', { path, name, message }),
    deleteTag: (path, name) => ipcRenderer.invoke('git-delete-tag', { path, name }),
    pushTag: (path, name) => ipcRenderer.invoke('git-push-tag', { path, name }),

    // Remote operations
    pull: (path) => ipcRenderer.invoke('git-pull', path),
    push: (path, branch) => ipcRenderer.invoke('git-push', { path, branch }),

    // New command operation
    runGitCommand: (path, command) => ipcRenderer.invoke('git-run-command', { path, command }),

    // New functions
    getStatus: (path) => ipcRenderer.invoke('git-status', path),
    discardChanges: (path, file) => ipcRenderer.invoke('git-discard', path, file),
    createFile: (path, filename, content) => ipcRenderer.invoke('git-create-file', path, filename, content),

    // New API
    setRemote: (path, url) => ipcRenderer.invoke('git-set-remote', path, url),

    // New isGitDirectory API
    isGitDirectory: (path) => ipcRenderer.invoke('git-is-directory', path)
});

contextBridge.exposeInMainWorld('systemAPI', {
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    showNotification: (message) => ipcRenderer.invoke('show-notification', message),
    openInExplorer: (path) => ipcRenderer.invoke('open-in-explorer', path),
    openInTerminal: (path) => ipcRenderer.invoke('open-in-terminal', path),
    isGitDirectory: (path) => ipcRenderer.invoke('is-git-directory', path),
    path: {
        basename: (path) => nodePath.basename(path)
    },
    openNotificationHistory: () => ipcRenderer.invoke('open-notification-history'),
    minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
    maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
    closeWindow: () => ipcRenderer.invoke('window-close'),
    readDirectory: (path) => ipcRenderer.invoke('read-directory', path),
}); 