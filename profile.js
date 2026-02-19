const supabase = window.supabaseClient;

let currentUser = null;
let userData = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

// Check if user is logged in
async function checkAuth() {
    const session = localStorage.getItem('aarambh_session') || sessionStorage.getItem('aarambh_session');
    
    if (!session) {
        window.location.href = 'auth.html';
        return;
    }
    
    const sessionData = JSON.parse(session);
    currentUser = sessionData.user;
    
    if (!currentUser) {
        window.location.href = 'auth.html';
        return;
    }
    
    await loadProfile();
}

// Load profile from Supabase
async function loadProfile() {
    try {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (error) throw error;
        
        userData = data;
        updateProfileUI(userData);
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Failed to load profile', 'error');
    }
}

function updateProfileUI(data) {
    // Set text fields
    document.getElementById('profile-name').textContent = data.name || 'No Name';
    document.getElementById('profile-designation').textContent = data.designation || 'No Designation';
    document.getElementById('profile-username').textContent = data.username || '-';
    document.getElementById('profile-mobile').textContent = data.mobile || '-';
    document.getElementById('profile-email').textContent = data.email || '-';
    document.getElementById('profile-id').textContent = data.emp_id || '-';
    document.getElementById('profile-dept').textContent = data.department || '-';
    
    // Set profile image
    const imgElement = document.getElementById('profile-img');
    if (data.profile_image) {
        imgElement.src = data.profile_image;
    } else {
        // Default avatar with initials
        const initials = data.name ? data.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
        imgElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'User')}&background=random&color=fff&size=200`;
    }
}

// Edit profile
function editProfile() {
    if (!userData) return;
    
    document.getElementById('edit-mobile').value = userData.mobile || '';
    document.getElementById('edit-email').value = userData.email || '';
    
    document.getElementById('edit-modal').classList.add('show');
}

// Close modal
function closeModal() {
    document.getElementById('edit-modal').classList.remove('show');
}

// Save profile
async function saveProfile(event) {
    event.preventDefault();
    
    if (!userData) return;
    
    const updates = {
        mobile: document.getElementById('edit-mobile').value.trim(),
        email: document.getElementById('edit-email').value.trim(),
        updated_at: new Date().toISOString()
    };
    
    try {
        const { error } = await supabase
            .from('employees')
            .update(updates)
            .eq('id', userData.id);
        
        if (error) throw error;
        
        // Update local data
        userData = { ...userData, ...updates };
        updateProfileUI(userData);
        closeModal();
        showToast('Profile updated successfully!');
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Failed to update profile', 'error');
    }
}

// Change image - Upload to Supabase Storage
async function changeImage() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.capture = 'environment';
    
    fileInput.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file');
            return;
        }
        
        if (file.size > 2 * 1024 * 1024) {
            showToast('Image size should be less than 2MB');
            return;
        }
        
        try {
            showToast('Uploading...');
            
            // Create unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${userData.id}_${Date.now()}.${fileExt}`;
            const filePath = `profile_images/${fileName}`;
            
            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('employee-assets')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });
            
            if (uploadError) throw uploadError;
            
            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('employee-assets')
                .getPublicUrl(filePath);
            
            // Update employee record with new image URL
            const { error: updateError } = await supabase
                .from('employees')
                .update({ profile_image: publicUrl })
                .eq('id', userData.id);
            
            if (updateError) throw updateError;
            
            // Update UI
            userData.profile_image = publicUrl;
            document.getElementById('profile-img').src = publicUrl;
            showToast('Profile picture updated!');
            
        } catch (error) {
            console.error('Upload error:', error);
            showToast('Failed to upload image', 'error');
        }
    };
    
    fileInput.click();
}

// Logout
function logout() {
    localStorage.removeItem('aarambh_session');
    sessionStorage.removeItem('aarambh_session');
    showToast('Logged out successfully!');
    setTimeout(() => {
        window.location.href = 'auth.html';
    }, 1000);
}

// Show toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Close modal on outside click
document.getElementById('edit-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        closeModal();
    }
});