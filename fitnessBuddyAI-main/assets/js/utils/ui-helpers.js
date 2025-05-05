


export async function loadComponent(selector, path) {
    const targetElement = document.querySelector(selector);
    if (!targetElement) {
        console.error(`Error loading component: Target element "${selector}" not found.`);
        return Promise.reject(`Target element "${selector}" not found.`);
    }

    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to fetch component ${path}: ${response.status} ${response.statusText}`);
        }
        const html = await response.text();
        targetElement.innerHTML = html;


    } catch (error) {
        console.error(`Error loading component into "${selector}" from "${path}":`, error);
        targetElement.innerHTML = `<p style="color: red; text-align: center;">Failed to load component (${path}).</p>`;
        return Promise.reject(error);
    }
}



export function showNotification(message, type = 'info', duration = 3000) {

    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';

        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        document.body.appendChild(container);
    }


    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;


    notification.style.padding = '15px 20px';
    notification.style.borderRadius = '8px';
    notification.style.color = '#fff';
    notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    notification.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    notification.style.fontFamily = 'var(--font-primary, sans-serif)';
    notification.style.fontSize = '0.95rem';



    switch (type) {
        case 'success':
            notification.style.backgroundColor = 'var(--success-color, #28a745)';
            break;
        case 'error':
            notification.style.backgroundColor = 'var(--error-color, #dc3545)';
            break;
        case 'info':
        default:
            notification.style.backgroundColor = 'var(--info-color, #17a2b8)';
            break;
    }


    container.appendChild(notification);


    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    });



    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';

        notification.addEventListener('transitionend', () => {
            notification.remove();

            if (container && container.children.length === 0) {

            }
        });
    }, duration);


    notification.addEventListener('click', () => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        notification.addEventListener('transitionend', () => notification.remove());
    });
}

console.log("ui-helpers.js loaded");
