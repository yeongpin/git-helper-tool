export function parseGitUrl(url) {
    try {
        const urlObj = new URL(url);
        return {
            isValid: true,
            protocol: urlObj.protocol,
            host: urlObj.host,
            path: urlObj.pathname.replace(/^\/|\.git$/g, ''),
            repoName: urlObj.pathname.split('/').pop().replace('.git', '')
        };
    } catch (error) {
        return {
            isValid: false,
            error: 'Invalid Git URL'
        };
    }
}

export function getRepoNameFromPath(path) {
    return path.split('/').pop();
}

export function isGitDirectory(path) {
    // 這個函數將在主進程中實現
    return window.systemAPI.isGitDirectory(path);
} 