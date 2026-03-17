// loader.js - Handles smooth page transitions

document.addEventListener('DOMContentLoaded', () => {
    // Make sure all links that stay within the app use the soft transition
    const links = document.querySelectorAll('a');

    links.forEach(link => {
        link.addEventListener('click', function (e) {
            // Only intercept internal links that aren't opening a new tab
            if (this.hostname === window.location.hostname &&
                !this.hasAttribute('download') &&
                this.getAttribute('target') !== '_blank' &&
                !this.getAttribute('href').startsWith('#') &&
                !this.getAttribute('href').startsWith('javascript:')) {

                e.preventDefault();
                const targetUrl = this.href;
                triggerFadeOut(targetUrl);
            }
        });
    });

    // Also handle programmatic navigation (like back buttons triggered by JS)
    window.smoothNavigate = function (url) {
        triggerFadeOut(url);
    };

    // Make sure app container has the transition class
    const appContainer = document.querySelector('.app-container');
    if (appContainer && !appContainer.classList.contains('page-transition')) {
        appContainer.classList.add('page-transition');
    }
});

function triggerFadeOut(targetUrl) {
    document.body.classList.add('fade-out');

    // Wait for the animation to finish before actually changing URL
    setTimeout(() => {
        window.location.href = targetUrl;
    }, 300); // 300ms matches the transition duration in CSS
}
