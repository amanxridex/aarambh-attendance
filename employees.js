const supabase = window.supabaseClient;

let employees = [];
let currentEmpId = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

async function checkAuth() {
    const session = localStorage.getItem('aarambh_session') || sessionStorage.getItem('aarambh_session');
    if (!session) {
        window.location.href = 'auth.html';
        return;
    }
    const data = JSON.parse(session);
    if (data.role !== 'management') {
        window.location.href = 'index.html';
        return;
    }
    await loadEmployees();
}

async function loadEmployees() {
    try {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        employees = data || [];
        document.getElementById('emp-count').textContent = employees.length;
        renderEmployees();
    } catch (error) {
        showToast('Failed to load employees', 'error');
    }
}

function renderEmployees(filtered = employees) {
    const list = document.getElementById('employees-list');
    
    if (filtered.length === 0) {
        list.innerHTML = '<div class="loading">No employees found</div>';
        return;
    }
    
    list.innerHTML = filtered.map(emp => `
        <div class="emp-card" onclick="openEmployeeModal('${emp.id}')">
            <div class="emp-avatar">
                <img src="${emp.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random&color=fff&size=100`}" alt="${emp.name}">
            </div>
            <div class="emp-details">
                <div class="emp-name">${emp.name}</div>
                <div class="emp-meta">
                    <span class="emp-dept">${emp.department}</span>
                    <span>${emp.designation}</span>
                </div>
            </div>
            <div class="emp-arrow">
                <i class="fas fa-chevron-right"></i>
            </div>
        </div>
    `).join('');
}

function searchEmployees() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const filtered = employees.filter(emp => 
        emp.name.toLowerCase().includes(query) ||
        emp.emp_id.toLowerCase().includes(query) ||
        emp.username.toLowerCase().includes(query) ||
        emp.department.toLowerCase().includes(query)
    );
    renderEmployees(filtered);
}

async function openEmployeeModal(id) {
    currentEmpId = id;
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    
    // Get this month's attendance
    const today = new Date();
    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    
    const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', id)
        .gte('date', monthStart)
        .order('date', { ascending: false });
    
    // Calculate stats
    let fullDays = 0, halfDays = 0, absentDays = 0;
    attendance?.forEach(record => {
        const duration = record.duration_minutes || 0;
        if (duration >= 240) fullDays++;
        else if (duration > 0) halfDays++;
        else if (!record.check_in) absentDays++;
    });
    
    // Render profile
    document.getElementById('emp-profile').innerHTML = `
        <div class="profile-avatar">
            <img src="${emp.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random&color=fff&size=150`}" alt="${emp.name}">
        </div>
        <div class="profile-info">
            <h4>${emp.name}</h4>
            <p>${emp.emp_id} • ${emp.username}</p>
            <span class="profile-badge">${emp.department}</span>
        </div>
    `;
    
    // Render stats
    document.getElementById('attendance-stats').innerHTML = `
        <div class="stat-item present">
            <span class="stat-value">${fullDays}</span>
            <span class="stat-label">Full Days</span>
        </div>
        <div class="stat-item half">
            <span class="stat-value">${halfDays}</span>
            <span class="stat-label">Half Days</span>
        </div>
        <div class="stat-item absent">
            <span class="stat-value">${absentDays}</span>
            <span class="stat-label">Absent</span>
        </div>
    `;
    
    // Render recent activity (last 5 records)
    const recent = attendance?.slice(0, 5) || [];
    document.getElementById('activity-list').innerHTML = recent.length ? recent.map(record => {
        const date = new Date(record.date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
        const checkIn = record.check_in ? new Date(record.check_in).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false}) : '--:--';
        const checkOut = record.check_out ? new Date(record.check_out).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false}) : '--:--';
        const duration = record.duration_minutes ? `${Math.floor(record.duration_minutes/60)}h ${record.duration_minutes%60}m` : '--';
        
        return `
            <div class="activity-item">
                <div class="activity-icon ${record.check_out ? 'checkout' : 'checkin'}">
                    <i class="fas fa-${record.check_out ? 'sign-out-alt' : 'sign-in-alt'}"></i>
                </div>
                <div class="activity-info">
                    <div class="activity-title">${date} • ${duration}</div>
                    <div class="activity-time">In: ${checkIn} • Out: ${checkOut}</div>
                </div>
            </div>
        `;
    }).join('') : '<div class="activity-item"><div class="activity-info"><div class="activity-title">No activity this month</div></div></div>';
    
    document.getElementById('emp-modal').classList.add('show');
}

function closeModal() {
    document.getElementById('emp-modal').classList.remove('show');
    currentEmpId = null;
}

async function deleteCurrentEmployee() {
    if (!currentEmpId) return;
    if (!confirm('Delete this employee permanently?')) return;
    
    try {
        const { error } = await supabase.from('employees').delete().eq('id', currentEmpId);
        if (error) throw error;
        
        employees = employees.filter(e => e.id !== currentEmpId);
        document.getElementById('emp-count').textContent = employees.length;
        renderEmployees();
        closeModal();
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
    setTimeout(() => toast.classList.remove('show'), 3000);
}