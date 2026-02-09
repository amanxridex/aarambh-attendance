// Auth state
let isLoading = false;

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
function handleLogin(event) {
    event.preventDefault();
    
    if (isLoading) return;
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;
    const submitBtn = document.getElementById('submit-btn');
    
    // Validation
    if (!username || !password) {
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
    
    // Simulate API call
    setTimeout(() => {
        // Check credentials (demo: admin/admin123 or user/user123)
        const validCredentials = [
            { username: 'admin', password: 'admin123', name: 'Administrator' },
            { username: 'user', password: 'user123', name: 'John Doe' },
            { username: 'test', password: 'test123', name: 'Test User' }
        ];
        
        const user = validCredentials.find(u => 
            u.username === username.toLowerCase() && u.password === password
        );
        
        if (user) {
            // Success
            const authData = {
                username: user.username,
                name: user.name,
                loginTime: new Date().toISOString(),
                remember: remember
            };
            
            if (remember) {
                localStorage.setItem('auth_user', JSON.stringify(authData));
            } else {
                sessionStorage.setItem('auth_user', JSON.stringify(authData));
            }
            
            showToast(`Welcome back, ${user.name}!`);
            
            // Redirect to main app
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            // Failed
            isLoading = false;
            submitBtn.classList.remove('loading');
            showError('Invalid username or password');
            
            // Shake animation
            const authCard = document.querySelector('.auth-card');
            authCard.classList.add('shake');
            setTimeout(() => authCard.classList.remove('shake'), 500);
        }
    }, 1500);
}

// Show success toast
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Show error toast
function showError(message) {
    const toast = document.getElementById('error-toast');
    const errorMessage = document.getElementById('error-message');
    
    errorMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Social login handlers
function socialLogin(provider) {
    showToast(`${provider.charAt(0).toUpperCase() + provider.slice(1)} login coming soon!`);
}

// Show forgot password
function showForgotPassword() {
    showToast('Password reset link sent to your email!');
}

// Show sign up
function showSignUp() {
    showToast('Registration page coming soon!');
}

// Check if already logged in
function checkExistingAuth() {
    const authUser = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
    if (authUser) {
        // Optional: Auto-redirect if already logged in
        // window.location.href = 'index.html';
    }
}

// Input focus effects
document.querySelectorAll('.input-wrapper input').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.querySelector('.input-icon').style.color = 'var(--accent-green)';
    });
    
    input.addEventListener('blur', function() {
        if (!this.value) {
            this.parentElement.querySelector('.input-icon').style.color = 'var(--text-muted)';
        }
    });
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkExistingAuth();
    
    // Add enter key support
    document.getElementById('password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin(e);
        }
    });
});