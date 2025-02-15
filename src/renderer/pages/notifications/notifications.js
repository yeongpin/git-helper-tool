document.addEventListener('DOMContentLoaded', () => {
    // 關閉按鈕
    document.querySelector('.titlebar-close').addEventListener('click', () => {
        window.close();
    });

    // 加載通知歷史
    const notificationList = document.querySelector('.notification-list');
    const history = JSON.parse(localStorage.getItem('notificationHistory') || '[]');

    history.reverse().forEach(notification => {
        const item = document.createElement('div');
        item.className = 'notification-item';
        
        const time = new Date(notification.time).toLocaleString();
        item.innerHTML = `
            <span class="notification-time">${time}</span>
            <span class="notification-message">${notification.message}</span>
            <span class="notification-type ${notification.type}">${notification.type}</span>
        `;
        
        notificationList.appendChild(item);
    });
}); 