const { execSync } = require('child_process');
const { version } = require('../package.json');

// 確保版本號格式正確
if (!/^\d+\.\d+\.\d+(-\w+)?$/.test(version)) {
    console.error('Invalid version format in package.json');
    process.exit(1);
}

const tagName = `v${version}`;

try {
    // 檢查是否有未提交的更改
    const status = execSync('git status --porcelain').toString();
    if (status) {
        console.error('Working directory is not clean. Please commit all changes first.');
        process.exit(1);
    }

    // 刪除已存在的本地標籤
    try {
        execSync(`git tag -d ${tagName}`, { stdio: 'ignore' });
        console.log(`Deleted existing local tag: ${tagName}`);
    } catch (error) {
        // 忽略標籤不存在的錯誤
    }

    // 刪除遠程標籤
    try {
        execSync(`git push origin :refs/tags/${tagName}`, { stdio: 'ignore' });
        console.log(`Deleted existing remote tag: ${tagName}`);
    } catch (error) {
        // 忽略遠程標籤不存在的錯誤
    }

    // 創建新標籤
    execSync(`git tag -a ${tagName} -m "Release ${tagName}"`, { stdio: 'inherit' });
    console.log(`Created new tag: ${tagName}`);

    // 推送標籤到遠程
    execSync(`git push origin ${tagName}`, { stdio: 'inherit' });
    console.log(`Pushed tag to remote: ${tagName}`);

    console.log('\nRelease process completed successfully! 🎉');
    console.log('GitHub Actions will now build and create a release.');
    console.log(`You can check the progress at: https://github.com/yeongpin/git-helper/actions`);

} catch (error) {
    console.error('Error during release process:', error.message);
    process.exit(1);
} 