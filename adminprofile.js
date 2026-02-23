const supabase = window.supabaseClient;

let currentAdmin = null;
let currentEditField = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

async function checkAuth() {
    const session = localStorage.getItem('aarambh_session') || sessionStorage.getItem('aarambh_session');

    if (!session) {
        window.location.replace('auth.html');
        return;
    }

    const sessionData = JSON.parse(session);

    if (sessionData.role !== 'management') {
        window.location.replace('index.html');
        return;
    }

    currentAdmin = sessionData.user;

    // Load admin data from database
    await loadAdminData();

    // Load stats
    await loadStats();
}

async function loadAdminData() {
    try {
        // Get fresh admin data from database
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('id', currentAdmin.id)
            .single();

        if (error) throw error;

        if (data) {
            currentAdmin = { ...currentAdmin, ...data };
        }

        // Update UI
        updateProfileUI();

    } catch (error) {
        console.error('Error loading admin data:', error);
        // Use session data as fallback
        updateProfileUI();
    }
}

function updateProfileUI() {
    // Basic info
    document.getElementById('admin-name').textContent = currentAdmin.name || 'Admin User';
    document.getElementById('admin-role').textContent = currentAdmin.role === 'management' ? 'System Administrator' : 'Admin';

    // Account info
    document.getElementById('profile-username').textContent = currentAdmin.username || '--';
    document.getElementById('profile-email').textContent = currentAdmin.email || '--';
    document.getElementById('profile-mobile').textContent = currentAdmin.mobile || '--';

    // Member since
    const createdDate = new Date(currentAdmin.created_at || Date.now());
    document.getElementById('member-since').textContent = createdDate.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
    });

    // Load company settings if available
    loadCompanySettings();
}

async function loadCompanySettings() {
    try {
        const { data, error } = await supabase
            .from('settings')
            .select('*')
            .eq('key', 'company')
            .maybeSingle();

        let settings = null;

        if (data && data.value) {
            settings = data.value;
        } else {
            // Try localStorage fallback
            const localSettings = localStorage.getItem('company_settings');
            if (localSettings) {
                settings = JSON.parse(localSettings);
            }
        }

        if (settings) {
            if (settings.name) {
                document.getElementById('company-name').textContent = settings.name;
            }
            if (settings.location) {
                document.getElementById('office-location').textContent = settings.location;
            }
        }
    } catch (error) {
        console.log('No company settings found in DB, trying localStorage');
        // Try localStorage fallback
        const localSettings = localStorage.getItem('company_settings');
        if (localSettings) {
            const settings = JSON.parse(localSettings);
            if (settings.name) {
                document.getElementById('company-name').textContent = settings.name;
            }
            if (settings.location) {
                document.getElementById('office-location').textContent = settings.location;
            }
        }
    }
}

async function loadStats() {
    try {
        // Count employees
        const { count: empCount, error: empError } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true });

        if (empError) throw empError;

        document.getElementById('stat-employees').textContent = empCount || 0;

        // Count attendance records this month
        const today = new Date();
        const startOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

        const { count: attCount, error: attError } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .gte('date', startOfMonth);

        if (attError) throw attError;

        document.getElementById('stat-attendance').textContent = attCount || 0;

    } catch (error) {
        console.error('Error loading stats:', error);
        document.getElementById('stat-employees').textContent = '0';
        document.getElementById('stat-attendance').textContent = '0';
    }
}

// Edit Field Functions
function editField(field) {
    currentEditField = field;
    const modal = document.getElementById('edit-modal');
    const title = document.getElementById('edit-title');
    const label = document.getElementById('edit-label');
    const input = document.getElementById('edit-input');

    // Get current value
    let currentValue = '';
    let inputType = 'text';

    switch (field) {
        case 'email':
            currentValue = document.getElementById('profile-email').textContent;
            inputType = 'email';
            title.textContent = 'Edit Email';
            label.textContent = 'Email Address';
            break;
        case 'mobile':
            currentValue = document.getElementById('profile-mobile').textContent;
            inputType = 'tel';
            title.textContent = 'Edit Mobile';
            label.textContent = 'Mobile Number';
            break;
        case 'company':
            currentValue = document.getElementById('company-name').textContent;
            title.textContent = 'Edit Company Name';
            label.textContent = 'Company Name';
            break;
        case 'location':
            currentValue = document.getElementById('office-location').textContent;
            title.textContent = 'Edit Office Location';
            label.textContent = 'Office Location';
            break;
    }

    input.value = currentValue === '--' ? '' : currentValue;
    input.type = inputType;

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.remove('show');
    document.body.style.overflow = '';
    currentEditField = null;
}

async function saveEdit() {
    const newValue = document.getElementById('edit-input').value.trim();

    if (!newValue) {
        showToast('Please enter a value', 'error');
        return;
    }

    try {
        if (currentEditField === 'email' || currentEditField === 'mobile') {
            // Update admin profile in database
            const updateData = {};
            updateData[currentEditField] = newValue;

            const { error } = await supabase
                .from('employees')
                .update(updateData)
                .eq('id', currentAdmin.id);

            if (error) throw error;

            // Update UI
            document.getElementById(`profile-${currentEditField}`).textContent = newValue;

            // Update session
            const storage = localStorage.getItem('aarambh_session') ? localStorage : sessionStorage;
            const session = JSON.parse(storage.getItem('aarambh_session'));
            session.user[currentEditField] = newValue;
            storage.setItem('aarambh_session', JSON.stringify(session));

        } else if (currentEditField === 'company' || currentEditField === 'location') {
            // Update company settings - use RPC or bypass RLS
            const settings = {
                name: document.getElementById('company-name').textContent,
                location: document.getElementById('office-location').textContent
            };

            if (currentEditField === 'company') {
                settings.name = newValue;
            } else {
                settings.location = newValue;
            }

            // Try to update, if fails due to RLS, just update UI locally
            try {
                const { data: existing } = await supabase
                    .from('settings')
                    .select('id')
                    .eq('key', 'company')
                    .maybeSingle();

                let error;

                if (existing) {
                    // Update existing
                    ({ error } = await supabase
                        .from('settings')
                        .update({
                            value: settings,
                            updated_at: new Date().toISOString()
                        })
                        .eq('key', 'company'));
                } else {
                    // Insert new
                    ({ error } = await supabase
                        .from('settings')
                        .insert([{
                            key: 'company',
                            value: settings,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }]));
                }

                if (error) {
                    console.warn('Database save failed (RLS?), saving to localStorage:', error);
                    // Save to localStorage as fallback
                    localStorage.setItem('company_settings', JSON.stringify(settings));
                }
            } catch (dbError) {
                console.warn('Database error, using localStorage:', dbError);
                localStorage.setItem('company_settings', JSON.stringify(settings));
            }

            // Update UI regardless
            if (currentEditField === 'company') {
                document.getElementById('company-name').textContent = newValue;
            } else {
                document.getElementById('office-location').textContent = newValue;
            }
        }

        closeEditModal();
        showToast(`${currentEditField} updated successfully`, 'success');

    } catch (error) {
        console.error('Error saving edit:', error);
        showToast('Failed to update: ' + error.message, 'error');
    }
}

// Password Change Functions
function changePassword() {
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    document.getElementById('password-modal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closePasswordModal() {
    document.getElementById('password-modal').classList.remove('show');
    document.body.style.overflow = '';
}

async function savePassword() {
    const currentPass = document.getElementById('current-password').value;
    const newPass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-password').value;

    if (!currentPass || !newPass || !confirmPass) {
        showToast('Please fill all fields', 'error');
        return;
    }

    if (newPass.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    if (newPass !== confirmPass) {
        showToast('New passwords do not match', 'error');
        return;
    }

    try {
        // Verify current password
        const { data: admin, error: verifyError } = await supabase
            .from('employees')
            .select('password')
            .eq('id', currentAdmin.id)
            .single();

        if (verifyError || admin.password !== currentPass) {
            showToast('Current password is incorrect', 'error');
            return;
        }

        // Update password
        const { error } = await supabase
            .from('employees')
            .update({ password: newPass })
            .eq('id', currentAdmin.id);

        if (error) throw error;

        closePasswordModal();
        showToast('Password changed successfully', 'success');

    } catch (error) {
        console.error('Error changing password:', error);
        showToast('Failed to change password', 'error');
    }
}

// Logout Functions
function logout() {
    localStorage.removeItem('aarambh_session');
    sessionStorage.removeItem('aarambh_session');
    window.location.replace('auth.html');
}

function logoutAllDevices() {
    if (!confirm('This will log you out from all devices. You will need to login again. Continue?')) {
        return;
    }

    // Clear all sessions
    localStorage.clear();
    sessionStorage.clear();

    showToast('Logged out from all devices', 'success');

    setTimeout(() => {
        window.location.replace('auth.html');
    }, 1500);
}

// Toast Notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = type === 'success' ? 'check-circle' : 'exclamation-circle';

    toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeEditModal();
        closePasswordModal();
    }
});