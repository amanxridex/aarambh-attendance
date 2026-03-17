const supabase = window.supabaseClient;

let employees = [];
let todayAttendance = {};

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadAdminProfile();
    loadEmployees();
    loadTodayAttendance();
    loadRecentActivity();
});

async function checkAuth() {
    const session = localStorage.getItem('aarambh_session') || sessionStorage.getItem('aarambh_session');
    if (!session) {
        window.location.replace('auth.html');
        return;
    }
    const data = JSON.parse(session);
    if (data.role !== 'management') {
        window.location.replace('index.html');
    }
}

async function loadAdminProfile() {
    const session = localStorage.getItem('aarambh_session') || sessionStorage.getItem('aarambh_session');
    if (!session) return;

    const data = JSON.parse(session);
    document.getElementById('admin-name').textContent = data.user.name || 'Admin';

    try {
        // Try fetching custom avatar from settings if we implemented one
        const { data: settings } = await supabase
            .from('settings')
            .select('adminprofile_image')
            .maybeSingle();

        if (settings && settings.adminprofile_image) {
            document.getElementById('admin-avatar').innerHTML = `
                <img src="${settings.adminprofile_image}" alt="Admin" style="width:100%; height:100%; border-radius:14px; object-fit:cover;">
            `;
        } else {
            document.getElementById('admin-avatar').innerHTML = `
                <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=${data.user.name || 'Admin'}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc" alt="Admin" style="width:100%; height:100%; border-radius:14px; object-fit:cover;">
            `;
        }
    } catch (e) {
        console.log("No custom admin avatar", e);
        document.getElementById('admin-avatar').innerHTML = `
            <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=${data.user.name || 'Admin'}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc" alt="Admin" style="width:100%; height:100%; border-radius:14px; object-fit:cover;">
        `;
    }
}

async function loadEmployees() {
    try {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        employees = data || [];
        document.getElementById('total-employees').textContent = employees.length;
    } catch (error) {
        showToast('Failed to load employees', 'error');
    }
}

async function loadTodayAttendance() {
    const today = new Date().toISOString().split('T')[0];
    try {
        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('date', today);

        if (error) throw error;
        todayAttendance = {};
        data?.forEach(record => { todayAttendance[record.employee_id] = record; });

        const present = Object.values(todayAttendance).filter(a => a.status === 'present').length;
        const absent = Object.values(todayAttendance).filter(a => a.status === 'absent').length;
        document.getElementById('present-today').textContent = present;
        document.getElementById('absent-today').textContent = absent;
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadRecentActivity() {
    try {
        const { data, error } = await supabase
            .from('attendance')
            .select('*, employees(name, profile_image)')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        const list = document.getElementById('recent-activity');

        if (!data || data.length === 0) {
            list.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-secondary);">No recent activity</div>';
            return;
        }

        list.innerHTML = data.map(record => {
            const isCheckIn = record.check_in && !record.check_out;
            const timeStr = isCheckIn ? record.check_in : (record.check_out || record.check_in);
            const timeObj = new Date(timeStr);
            const timeFormatted = timeObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const targetName = record.employees ? record.employees.name : 'Unknown';
            const actionText = isCheckIn ? 'Checked In' : 'Checked Out';

            return `
                <div class="activity-item">
                    <div class="activity-icon" style="background: ${isCheckIn ? 'rgba(0, 208, 132, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${isCheckIn ? 'var(--accent-green)' : 'var(--accent-red)'}">
                        <i class="fas ${isCheckIn ? 'fa-sign-in-alt' : 'fa-sign-out-alt'}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">
                            <span style="color: white; font-weight: 600;">${targetName}</span> ${actionText}
                        </div>
                        <div class="activity-time">${timeFormatted}</div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Failed loading recent activity", error);
        document.getElementById('recent-activity').innerHTML = '<div style="padding: 20px; color: var(--accent-red);">Failed to load activity</div>';
    }
}

function openCreateEmployee() {
    document.getElementById('create-modal').classList.add('show');
}

function closeCreateModal() {
    document.getElementById('create-modal').classList.remove('show');
    document.getElementById('create-emp-form').reset();
}

function openViewEmployees() {
    document.getElementById('view-modal').classList.add('show');
    renderEmployeesTable();
}

function closeViewModal() {
    document.getElementById('view-modal').classList.remove('show');
}

function renderEmployeesTable() {
    const tbody = document.getElementById('employees-tbody');
    if (employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No employees found</td></tr>';
        return;
    }
    tbody.innerHTML = employees.map(emp => `
        <tr>
            <td>${emp.name}</td>
            <td><code>${emp.username}</code></td>
            <td>${emp.emp_id}</td>
            <td>${emp.department}</td>
            <td>${emp.designation}</td>
            <td>
                <button onclick="deleteEmployee('${emp.id}')" class="btn-danger">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function saveEmployee(event) {
    event.preventDefault();
    const btn = document.getElementById('create-emp-btn');
    btn.disabled = true;

    try {
        const employeeData = {
            name: document.getElementById('emp-name').value.trim(),
            emp_id: document.getElementById('emp-id').value.trim(),
            username: document.getElementById('emp-username').value.trim(),
            password: document.getElementById('emp-password').value,
            email: document.getElementById('emp-email').value.trim() || null,
            mobile: document.getElementById('emp-mobile').value.trim() || null,
            department: document.getElementById('emp-dept').value,
            designation: document.getElementById('emp-designation').value.trim(),
            created_at: new Date().toISOString()
        };

        if (employeeData.password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }

        const { data: existing } = await supabase
            .from('employees')
            .select('username')
            .eq('username', employeeData.username)
            .maybeSingle();
        if (existing) throw new Error('Username already exists');

        const { data: existingId } = await supabase
            .from('employees')
            .select('emp_id')
            .eq('emp_id', employeeData.emp_id)
            .maybeSingle();
        if (existingId) throw new Error('Employee ID already exists');

        const { data, error } = await supabase
            .from('employees')
            .insert([employeeData])
            .select()
            .single();

        if (error) throw error;

        employees.unshift(data);
        document.getElementById('total-employees').textContent = employees.length;
        closeCreateModal();
        showToast(`Created! Username: ${data.username}, Password: ${employeeData.password}`, 'success');

    } catch (error) {
        showToast(error.message || 'Failed to create employee', 'error');
    } finally {
        btn.disabled = false;
    }
}

async function deleteEmployee(id) {
    if (!confirm('Delete this employee?')) return;
    try {
        const { error } = await supabase.from('employees').delete().eq('id', id);
        if (error) throw error;
        employees = employees.filter(e => e.id !== id);
        document.getElementById('total-employees').textContent = employees.length;
        renderEmployeesTable();
        showToast('Employee deleted', 'success');
    } catch (error) {
        showToast('Failed to delete', 'error');
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 5000);
}

function logout() {
    localStorage.removeItem('aarambh_session');
    sessionStorage.removeItem('aarambh_session');
    window.location.replace('auth.html');
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeCreateModal();
        closeViewModal();
    }
});