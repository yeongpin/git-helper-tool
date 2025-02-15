let notificationHistory = [];

function createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notificationContainer';
    container.className = 'notification-container';
    document.body.appendChild(container);
    return container;
}

export function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span class="notification-message">${message}</span>
        <button class="notification-close">×</button>
    `;

    const container = document.getElementById('notificationContainer') || createNotificationContainer();
    container.appendChild(notification);

    // 添加關閉按鈕事件
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });

    // 自動消失
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 5000);

    // 返回一個對象，允許更新通知
    return {
        update: (newMessage, newType) => {
            notification.className = `notification ${newType}`;
            notification.querySelector('.notification-message').textContent = newMessage;
        },
        remove: () => notification.remove()
    };
}

export function getNotificationHistory() {
    return notificationHistory;
}

// 在初始化時加載歷史記錄
try {
    const savedHistory = localStorage.getItem('notificationHistory');
    if (savedHistory) {
        notificationHistory = JSON.parse(savedHistory);
    }
} catch (error) {
    console.error('Failed to load notification history:', error);
} 