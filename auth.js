// Supabase Configuration - REPLACE THESE WITH YOUR ACTUAL VALUES
const SUPABASE_URL = 'https://zbfgytxlnnddkurhiziy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiZmd5dHhsbm5kZGt1cmhpeml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjkxODksImV4cCI6MjA4NjgwNTE4OX0.RKsFVWA1gktyXa1BqRqYv_i6_74OnEHdJatg03WeDMM';

// Initialize Supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth state
let isLoading = false;
let isManagementMode = false;

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
        if (isManagementMode) {
            // Management Login - Check if user has admin role in database
            const { data: adminData, error: adminError } = await supabase
                .from('admins')
                .select('*')
                .eq('email', email)
                .single();
            
            if (adminError || !adminData) {
                throw new Error('Invalid management credentials');
            }
            
            // Verify password (in production, use proper hashing)
            // For demo, we'll use Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (authError) throw authError;
            
            // Store management session
            const sessionData = {
                user: authData.user,
                role: 'management',
                adminData: adminData,
                remember: remember
            };
            
            storeSession(sessionData, remember);
            showToast(`Welcome back, ${adminData.name || 'Admin'}!`);
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } else {
            // Employee Login
            const { data: empData, error: empError } = await supabase
                .from('employees')
                .select('*')
                .eq('email', email)
                .single();
            
            if (empError || !empData) {
                throw new Error('Employee not found');
            }
            
            // Sign in with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (authError) throw authError;
            
            // Store employee session
            const sessionData = {
                user: authData.user,
                role: 'employee',
                empData: empData,
                remember: remember
            };
            
            storeSession(sessionData, remember);
            showToast(`Welcome back, ${empData.name}!`);
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        }
        
    } catch (error) {
        console.error('Login error:', error);
        isLoading = false;
        submitBtn.classList.remove('loading');
        showError(error.message || 'Login failed. Please try again.');
        
        // Shake animation
        const authCard = document.querySelector('.auth-card');
        authCard.classList.add('shake');
        setTimeout(() => authCard.classList.remove('shake'), 500);
    }
}

// Store session in localStorage or sessionStorage
function storeSession(data, remember) {
    if (remember) {
        localStorage.setItem('aarambh_session', JSON.stringify(data));
    } else {
        sessionStorage.setItem('aarambh_session', JSON.stringify(data));
    }
}

// Show success toast
function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Show error toast
function showError(message) {
    const toast = document.getElementById('error-toast');
    document.getElementById('error-message').textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Show forgot password
async function showForgotPassword() {
    const email = document.getElementById('email').value;
    
    if (!email) {
        showError('Please enter your email first');
        return;
    }
    
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        showToast('Password reset link sent to your email!');
    } catch (error) {
        showError('Failed to send reset link');
    }
}

// Check existing session
async function checkExistingSession() {
    const session = localStorage.getItem('aarambh_session') || sessionStorage.getItem('aarambh_session');
    
    if (session) {
        const data = JSON.parse(session);
        
        // Verify session with Supabase
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (user && !error) {
            // Valid session, redirect
            if (data.role === 'management') {
                window.location.href = 'dashboard.html';
            } else {
                window.location.href = 'index.html';
            }
        } else {
            // Invalid session, clear storage
            localStorage.removeItem('aarambh_session');
            sessionStorage.removeItem('aarambh_session');
        }
    }
}

// Logout function (can be called from other pages)
async function logout() {
    await supabase.auth.signOut();
    localStorage.removeItem('aarambh_session');
    sessionStorage.removeItem('aarambh_session');
    window.location.href = 'auth.html';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkExistingSession();
    document.getElementById('emp-label').classList.add('active');
    
    // Add enter key support
    document.getElementById('password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin(e);
        }
    });
});