// Supabase Configuration
const SUPABASE_URL = 'https://zbfgytxlnnddkurhiziy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiZmd5dHhsbm5kZGt1cmhpeml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjkxODksImV4cCI6MjA4NjgwNTE4OX0.RKsFVWA1gktyXa1BqRqYv_i6_74OnEHdJatg03WeDMM';

// Global supabase instance
let supabase = null;

// Auth state
let isLoading = false;
let isManagementMode = false;

// Initialize when page loads
window.onload = function() {
    console.log('Window loaded, checking Supabase...');
    
    // Retry checking for Supabase
    let attempts = 0;
    const maxAttempts = 10;
    
    const checkSupabase = setInterval(() => {
        attempts++;
        console.log(`Attempt ${attempts}: Checking window.supabase...`);
        
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            clearInterval(checkSupabase);
            console.log('Supabase found! Initializing...');
            initSupabase();
        } else if (attempts >= maxAttempts) {
            clearInterval(checkSupabase);
            console.error('Supabase failed to load after', maxAttempts, 'attempts');
            showError('Failed to load Supabase. Please check your internet connection and refresh.');
        }
    }, 500); // Check every 500ms
};

function initSupabase() {
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase initialized successfully:', supabase);
        
        // Now initialize the app
        initApp();
    } catch (error) {
        console.error('Error initializing Supabase:', error);
        showError('Error initializing app. Please refresh.');
    }
}

function initApp() {
    console.log('Initializing app...');
    checkExistingSession();
    document.getElementById('emp-label').classList.add('active');
    
    // Add enter key support
    document.getElementById('password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin(e);
        }
    });
}

// Toggle between Employee and Management login
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
        document.getElementById('email').placeholder = 'admin@company.com';
    } else {
        modeText.innerHTML = '<i class="fas fa-user"></i><span>Employee Login</span>';
        modeText.classList.remove('management');
        body.classList.remove('mode-management');
        empLabel.classList.add('active');
        mgmtLabel.classList.remove('active');
        document.getElementById('email').placeholder = 'employee@company.com';
    }
    
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
}

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eye-icon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    if (!supabase) {
        showError('System not ready. Please wait or refresh.');
        return;
    }
    
    if (isLoading) return;
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;
    const submitBtn = document.getElementById('submit-btn');
    
    // Validation
    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters');
        return;
    }
    
    // Start loading
    isLoading = true;
    submitBtn.classList.add('loading');
    
    try {
        console.log('Attempting login...');
        
        // Sign in with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (authError) {
            console.error('Auth error:', authError);
            throw new Error(authError.message);
        }
        
        const user = authData.user;
        console.log('User logged in:', user);
        
        // Check if user is admin
        console.log('Checking admin status for user ID:', user.id);
        const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .select('*')
            .eq('id', user.id)
            .single();
        
        console.log('Admin query result:', { adminData, adminError });
        
        const isAdmin = adminData && !adminError;
        
        // Validate mode
        if (isManagementMode && !isAdmin) {
            console.log('User tried management login but is not admin');
            await supabase.auth.signOut();
            throw new Error('You do not have management access');
        }
        
        // Store session
        const sessionData = {
            user: user,
            role: isAdmin ? 'management' : 'employee',
            profile: isAdmin ? adminData : null,
            remember: remember
        };
        
        storeSession(sessionData, remember);
        showToast(`Welcome back, ${adminData?.name || user.email}!`);
        
        // Redirect
        setTimeout(() => {
            window.location.href = isAdmin ? 'dashboard.html' : 'index.html';
        }, 1500);
        
    } catch (error) {
        console.error('Login error:', error);
        isLoading = false;
        submitBtn.classList.remove('loading');
        showError(error.message || 'Login failed. Please try again.');
        
        const authCard = document.querySelector('.auth-card');
        authCard.classList.add('shake');
        setTimeout(() => authCard.classList.remove('shake'), 500);
    }
}

// Store session
function storeSession(data, remember) {
    if (remember) {
        localStorage.setItem('aarambh_session', JSON.stringify(data));
    } else {
        sessionStorage.setItem('aarambh_session', JSON.stringify(data));
    }
}

// Show toast
function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Show error
function showError(message) {
    const toast = document.getElementById('error-toast');
    document.getElementById('error-message').textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Forgot password
async function showForgotPassword() {
    if (!supabase) {
        showError('System not ready. Please wait.');
        return;
    }
    
    const email = document.getElementById('email').value;
    if (!email) {
        showError('Please enter your email first');
        return;
    }
    
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        showToast('Password reset link sent!');
    } catch (error) {
        showError('Failed to send reset link');
    }
}

// Check existing session
async function checkExistingSession() {
    if (!supabase) return;
    
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            const saved = localStorage.getItem('aarambh_session') || sessionStorage.getItem('aarambh_session');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.role === 'management') {
                    window.location.href = 'dashboard.html';
                } else {
                    window.location.href = 'index.html';
                }
            }
        }
    } catch (error) {
        console.error('Session check error:', error);
    }
}

// Logout
async function logout() {
    if (!supabase) return;
    
    await supabase.auth.signOut();
    localStorage.removeItem('aarambh_session');
    sessionStorage.removeItem('aarambh_session');
    window.location.href = 'auth.html';
}