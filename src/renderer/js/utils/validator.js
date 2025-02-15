export function validateRepoName(name) {
    // Git 倉庫名稱規則驗證
    const pattern = /^[a-zA-Z0-9_-]+$/;
    if (!pattern.test(name)) {
        return {
            isValid: false,
            error: 'Repository name can only contain letters, numbers, underscores and hyphens'
        };
    }
    return { isValid: true };
}

export function validateGitUrl(url) {
    // 支持的 Git URL 格式：
    // - HTTPS: https://github.com/user/repo.git
    // - SSH: git@github.com:user/repo.git
    const httpsPattern = /^https:\/\/[a-zA-Z0-9-_.]+\/[a-zA-Z0-9-_./]+\.git$/;
    const sshPattern = /^git@[a-zA-Z0-9-_.]+:[a-zA-Z0-9-_./]+\.git$/;

    if (!httpsPattern.test(url) && !sshPattern.test(url)) {
        return {
            isValid: false,
            error: 'Invalid Git URL format'
        };
    }
    return { isValid: true };
} 