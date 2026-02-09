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
    const demoCreds = document.getElementById('demo-creds');
    
    isManagementMode = toggle.checked;
    
    if (isManagementMode) {
        // Management Mode
        modeText.innerHTML = '<i class="fas fa-user-tie"></i><span>Management Login</span>';
        modeText.classList.add('management');
        body.classList.add('mode-management');
        empLabel.classList.remove('active');
        mgmtLabel.classList.add('active');
        
        // Update demo credentials
        demoCreds.innerHTML = `
            <div class="demo-header">
                <i class="fas fa-info-circle"></i>
                <span>Demo Credentials</span>
            </div>
            <div class="demo-list">
                <div class="demo-item">
                    <span class="demo-user">admin / admin123</span>
                    <span class="demo-type">Management</span>
                </div>
            </div>
        `;
        
        // Update input placeholders
        document.getElementById('username').placeholder = 'Enter admin username';
    } else {
        // Employee Mode
        modeText.innerHTML = '<i class="fas fa-user"></i><span>Employee Login</span>';
        modeText.classList.remove('management');
        body.classList.remove('mode-management');
        empLabel.classList.add('active');
        mgmtLabel.classList.remove('active');
        
        // Update demo credentials
        demoCreds.innerHTML = `
            <div class="demo-header">
                <i class="fas fa-info-circle"></i>
                <span>Demo Credentials</span>
            </div>
            <div class="demo-list">
                <div class="demo-item">
                    <span class="demo-user">user / user123</span>
                    <span class="demo-type">Employee</span>
                </div>
            </div>
        `;
        
        // Update input placeholders
        document.getElementById('username').placeholder = 'Enter your username';
    }
    
    // Clear inputs
    document.getElementById('username').value = '';
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
        let user = null;
        let redirectUrl = '';
        
        if (isManagementMode) {
            // Management Credentials Check
            const managementCreds = [
                { username: 'admin', password: 'admin123', name: 'Administrator', role: 'management' },
                { username: 'manager', password: 'manager123', name: 'Manager', role: 'management' },
                { username: 'hr', password: 'hr123', name: 'HR Manager', role: 'management' }
            ];
            
            user = managementCreds.find(u => 
                u.username === username.toLowerCase() && u.password === password
            );
            
            redirectUrl = 'dashboard.html';
        } else {
            // Employee Credentials Check
            const employeeCreds = [
                { username: 'user', password: 'user123', name: 'John Doe', role: 'employee', empId: 'EMP001' },
                { username: 'john', password: 'john123', name: 'John Smith', role: 'employee', empId: 'EMP002' },
                { username: 'jane', password: 'jane123', name: 'Jane Doe', role: 'employee', empId: 'EMP003' }
            ];
            
            user = employeeCreds.find(u => 
                u.username === username.toLowerCase() && u.password === password
            );
            
            redirectUrl = 'index.html';
        }
        
        if (user) {
            // Success - Store auth data
            const authData = {
                username: user.username,
                name: user.name,
                role: user.role,
                loginTime: new Date().toISOString(),
                remember: remember
            };
            
            if (user.empId) authData.empId = user.empId;
            
            if (remember) {
                localStorage.setItem('auth_user', JSON.stringify(authData));
            } else {
                sessionStorage.setItem('auth_user', JSON.stringify(authData));
            }
            
            showToast(`Welcome back, ${user.name}!`);
            
            // Redirect based on role
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1500);
        } else {
            // Failed
            isLoading = false;
            submitBtn.classList.remove('loading');
            
            const errorMsg = isManagementMode ? 
                'Invalid management credentials' : 
                'Invalid employee credentials';
            showError(errorMsg);
            
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

// Show forgot password
function showForgotPassword() {
    const contact = isManagementMode ? 'IT Administrator' : 'HR Department';
    showToast(`Contact ${contact} for password reset`);
}

// Check if already logged in and redirect accordingly
function checkExistingAuth() {
    const authUser = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
    if (authUser) {
        const user = JSON.parse(authUser);
        // Redirect based on stored role
        if (user.role === 'management') {
            window.location.href = 'dashboard.html';
        } else {
            window.location.href = 'index.html';
        }
    }
}

// Input focus effects
document.querySelectorAll('.input-wrapper input').forEach(input => {
    input.addEventListener('focus', function() {
        const icon = this.parentElement.querySelector('.input-icon');
        if (isManagementMode) {
            icon.style.color = 'var(--accent-blue)';
        } else {
            icon.style.color = 'var(--accent-green)';
        }
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
    
    // Set initial state
    document.getElementById('emp-label').classList.add('active');
    
    // Add enter key support
    document.getElementById('password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin(e);
        }
    });
});