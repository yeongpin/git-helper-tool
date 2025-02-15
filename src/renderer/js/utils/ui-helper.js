export function disableButton(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = true;
        button.classList.add('disabled');
    }
}

export function enableButton(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = false;
        button.classList.remove('disabled');
    }
}

export function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        const loadingSpinner = document.createElement('div');
        loadingSpinner.className = 'loading-spinner';
        element.appendChild(loadingSpinner);
    }
}

export function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        const spinner = element.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    }
} 