export function showModal(title, content) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    
    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    modal.style.display = 'block';

    // 關閉按鈕事件
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => closeModal();

    // 點擊模態框外部關閉
    window.onclick = (event) => {
        if (event.target === modal) {
            closeModal();
        }
    };
}

export function closeModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'none';
} 