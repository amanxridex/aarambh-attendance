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

// Change image
function changeImage() {
    // In real app, this would open file picker
    const images = [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face'
    ];
    
    const current = document.getElementById('profile-img').src;
    const currentIndex = images.findIndex(img => current.includes(img.split('?')[0]));
    const nextIndex = (currentIndex + 1) % images.length;
    
    document.getElementById('profile-img').src = images[nextIndex];
    
    // Save to localStorage
    const saved = localStorage.getItem('profile_data');
    if (saved) {
        const data = JSON.parse(saved);
        data.image = images[nextIndex];
        localStorage.setItem('profile_data', JSON.stringify(data));
    }
    
    showToast('Profile picture updated!');
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