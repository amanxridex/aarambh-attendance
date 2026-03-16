// Supabase Configuration
const SUPABASE_URL = 'https://zbfgytxlnnddkurhiziy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiZmd5dHhsbm5kZGt1cmhpeml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjkxODksImV4cCI6MjA4NjgwNTE4OX0.RKsFVWA1gktyXa1BqRqYv_i6_74OnEHdJatg03WeDMM';

let supabase = null;
let isLoading = false;
let isManagementMode = false;

// Initialize
window.onload = function () {
    if (typeof window.supabase === 'undefined') {
        setTimeout(window.onload, 500);
        return;
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    initApp();
    initPWA();
};

function initApp() {
    document.getElementById('emp-label').classList.add('active');
    checkExistingSession();

    // Enter key on password field submits form
    document.getElementById('password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin(e);
    });
}

function toggleLoginMode() {
    const toggle = document.getElementById('login-mode');
    const modeText = document.getElementById('mode-text');
    const empLabel = document.getElementById('emp-label');
    const mgmtLabel = document.getElementById('mgmt-label');
    const body = document.body;

    isManagementMode = toggle.checked;

    if (isManagementMode) {
        modeText.innerHTML = '<i class="fas fa-user-tie"></i><span>Management Login</span>';
        modeText.classList.add('management');
        body.classList.add('mode-management');
        empLabel.classList.remove('active');
        mgmtLabel.classList.add('active');
        document.getElementById('username').placeholder = 'admin username';
    } else {
        modeText.innerHTML = '<i class="fas fa-user"></i><span>Employee Login</span>';
        modeText.classList.remove('management');
        body.classList.remove('mode-management');
        empLabel.classList.add('active');
        mgmtLabel.classList.remove('active');
        document.getElementById('username').placeholder = 'employee username';
    }

    // Clear inputs when switching modes
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

function togglePassword() {
    const input = document.getElementById('password');
    const icon = document.getElementById('eye-icon');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

async function handleLogin(event) {
    event.preventDefault();

    if (isLoading || !supabase) return;

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;
    const btn = document.getElementById('submit-btn');
    const btnText = btn.querySelector('.btn-text');
    const btnIcon = btn.querySelector('.btn-icon');
    const btnLoader = btn.querySelector('.btn-loader');

    if (!username || !password) {
        showError('Please fill in all fields');
        return;
    }

    // Show loading
    isLoading = true;
    btn.disabled = true;
    btnText.style.display = 'none';
    btnIcon.style.display = 'none';
    btnLoader.style.display = 'block';

    try {
        let user = null;
        let role = '';
        let table = isManagementMode ? 'admins' : 'employees';

        console.log(`Checking ${table} for username: ${username}`);

        // Simple username/password check - no email auth
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();

        if (error || !data) {
            throw new Error('Invalid username or password');
        }

        user = data;
        role = isManagementMode ? 'management' : 'employee';

        console.log('Login successful:', user.name);

        // Store session
        const sessionData = {
            user: user,
            role: role,
            username: username,
            loginTime: new Date().toISOString()
        };

        if (remember) {
            localStorage.setItem('aarambh_session', JSON.stringify(sessionData));
        } else {
            sessionStorage.setItem('aarambh_session', JSON.stringify(sessionData));
        }

        showToast(`Welcome, ${user.name}!`);

        setTimeout(() => {
            window.location.replace(role === 'management' ? 'dashboard.html' : 'index.html');
        }, 1500);

    } catch (error) {
        console.error('Login error:', error);
        isLoading = false;
        btn.disabled = false;
        btnText.style.display = 'block';
        btnIcon.style.display = 'block';
        btnLoader.style.display = 'none';

        showError(error.message || 'Login failed');

        // Shake animation
        document.querySelector('.auth-card').classList.add('shake');
        setTimeout(() => document.querySelector('.auth-card').classList.remove('shake'), 500);
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function showError(message) {
    const toast = document.getElementById('error-toast');
    document.getElementById('error-message').textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function checkExistingSession() {
    const session = localStorage.getItem('aarambh_session') || sessionStorage.getItem('aarambh_session');
    if (session) {
        const data = JSON.parse(session);
        // Redirect based on role
        window.location.replace(data.role === 'management' ? 'dashboard.html' : 'index.html');
    }
}

// Logout function (can be called from other pages)
async function logout() {
    localStorage.removeItem('aarambh_session');
    sessionStorage.removeItem('aarambh_session');
    window.location.replace('auth.html');
}

// PWA Install Logic
let deferredPrompt;

function initPWA() {
    // Inject PWA Popup HTML
    const pwaHTML = `
        <div id="pwa-popup" class="pwa-popup">
            <img src="assets/aarambh.ico" alt="App Icon" class="pwa-icon">
            <div class="pwa-content">
                <h4>Install Aarambh</h4>
                <p id="pwa-message">Install our app for a better full-screen experience.</p>
            </div>
            <div class="pwa-actions">
                <button id="pwa-install-btn" class="pwa-btn pwa-install-btn">Install</button>
                <button id="pwa-close-btn" class="pwa-btn pwa-close-btn">Not Now</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', pwaHTML);

    const pwaPopup = document.getElementById('pwa-popup');
    const installBtn = document.getElementById('pwa-install-btn');
    const closeBtn = document.getElementById('pwa-close-btn');
    const pwaMessage = document.getElementById('pwa-message');

    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches;

    // Show popup
    function showPopup() {
        if (!isStandalone) {
            setTimeout(() => {
                pwaPopup.classList.add('show');
            }, 3000); // show 3 seconds after load
        }
    }

    if (isIOS && !isStandalone) {
        installBtn.style.display = 'none';
        pwaMessage.innerHTML = 'To install, tap <strong>Share</strong> <i class="fas fa-share-square"></i><br> then <strong>Add to Home Screen</strong> <i class="fas fa-plus-square"></i>';
        showPopup();
    } else {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            showPopup();
        });
    }

    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                pwaPopup.classList.remove('show');
            }
            deferredPrompt = null;
        }
    });

    closeBtn.addEventListener('click', () => {
        pwaPopup.classList.remove('show');
    });
}