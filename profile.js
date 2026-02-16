// Load profile data from localStorage or use defaults
function loadProfile() {
    const saved = localStorage.getItem('profile_data');
    if (saved) {
        const data = JSON.parse(saved);
        updateProfileUI(data);
    }
}

function updateProfileUI(data) {
    document.getElementById('profile-name').textContent = data.name;
    document.getElementById('profile-designation').textContent = data.designation;
    document.getElementById('profile-mobile').textContent = data.mobile;
    document.getElementById('profile-email').textContent = data.email;
    document.getElementById('profile-id').textContent = data.empId || 'EMP2024001';
    document.getElementById('profile-dept').textContent = data.department || 'Engineering';
    
    if (data.image) {
        document.getElementById('profile-img').src = data.image;
    }
}

// Edit profile
function editProfile() {
    const modal = document.getElementById('edit-modal');
    const name = document.getElementById('profile-name').textContent;
    const mobile = document.getElementById('profile-mobile').textContent;
    const email = document.getElementById('profile-email').textContent;
    const designation = document.getElementById('profile-designation').textContent;
    
    document.getElementById('edit-name').value = name;
    document.getElementById('edit-mobile').value = mobile;
    document.getElementById('edit-email').value = email;
    document.getElementById('edit-designation').value = designation;
    
    modal.classList.add('show');
}

// Close modal
function closeModal() {
    document.getElementById('edit-modal').classList.remove('show');
}

// Save profile
function saveProfile(event) {
    event.preventDefault();
    
    const data = {
        name: document.getElementById('edit-name').value,
        mobile: document.getElementById('edit-mobile').value,
        email: document.getElementById('edit-email').value,
        designation: document.getElementById('edit-designation').value,
        empId: document.getElementById('profile-id').textContent,
        department: document.getElementById('profile-dept').textContent,
        image: document.getElementById('profile-img').src
    };
    
    localStorage.setItem('profile_data', JSON.stringify(data));
    updateProfileUI(data);
    closeModal();
    showToast('Profile updated successfully!');
}

// Change image - Open file picker
function changeImage() {
    // Create hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.capture = 'environment'; // Allows camera on mobile too
    
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file');
            return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image size should be less than 5MB');
            return;
        }
        
        // Read and display image
        const reader = new FileReader();
        reader.onload = function(event) {
            const imageData = event.target.result;
            
            // Update profile image
            document.getElementById('profile-img').src = imageData;
            
            // Save to localStorage
            const saved = localStorage.getItem('profile_data');
            let data;
            if (saved) {
                data = JSON.parse(saved);
            } else {
                // Create default data if none exists
                data = {
                    name: document.getElementById('profile-name').textContent,
                    designation: document.getElementById('profile-designation').textContent,
                    mobile: document.getElementById('profile-mobile').textContent,
                    email: document.getElementById('profile-email').textContent,
                    empId: document.getElementById('profile-id').textContent,
                    department: document.getElementById('profile-dept').textContent
                };
            }
            data.image = imageData;
            localStorage.setItem('profile_data', JSON.stringify(data));
            
            showToast('Profile picture updated!');
        };
        
        reader.onerror = function() {
            showToast('Error reading image file');
        };
        
        reader.readAsDataURL(file);
    };
    
    // Trigger file picker
    fileInput.click();
}

// Logout
function logout() {
    localStorage.removeItem('auth_user');
    sessionStorage.removeItem('auth_user');
    showToast('Logged out successfully!');
    setTimeout(() => {
        window.location.href = 'auth.html';
    }, 1000);
}

// Show toast
function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Close modal on outside click
document.getElementById('edit-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        closeModal();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
});