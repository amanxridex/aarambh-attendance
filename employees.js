const supabase = window.supabaseClient;

let employees = [];
let currentUser = null;

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
    currentUser = data.user;
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
        renderEmployees();
    } catch (error) {
        showToast('Failed to load employees', 'error');
    }
}

function renderEmployees(filtered = employees) {
    const grid = document.getElementById('employees-grid');
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="empty-state">No employees found</div>';
        return;
    }
    
    grid.innerHTML = filtered.map(emp => `
        <div class="employee-card" onclick="viewEmployee('${emp.id}')">
            <div class="emp-avatar">
                <img src="${emp.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random&color=fff&size=100`}" alt="${emp.name}">
            </div>
            <div class="emp-info">
                <h3>${emp.name}</h3>
                <p class="emp-dept">${emp.department}</p>
                <p class="emp-designation">${emp.designation}</p>
            </div>
            <div class="emp-arrow">
                <i class="fas fa-chevron-right"></i>
            </div>
        </div>
    `).join('');
}

function searchEmployees() {
    const query = document.getElementById('search-emp').value.toLowerCase();
    const filtered = employees.filter(emp => 
        emp.name.toLowerCase().includes(query) ||
        emp.username.toLowerCase().includes(query) ||
        emp.emp_id.toLowerCase().includes(query) ||
        emp.department.toLowerCase().includes(query)
    );
    renderEmployees(filtered);
}

async function viewEmployee(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    
    // Get attendance stats
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 8) + '01';
    
    const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', id)
        .gte('date', monthStart);
    
    const present = attendance?.filter(a => a.status === 'present').length || 0;
    const absent = attendance?.filter(a => !a.check_in).length || 0;
    
    const detailHtml = `
        <div class="detail-header">
            <img src="${emp.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random&color=fff&size=150`}" alt="${emp.name}">
            <h3>${emp.name}</h3>
            <p>${emp.designation}</p>
        </div>
        <div class="detail-stats">
            <div class="stat-box present">
                <span class="stat-num">${present}</span>
                <span class="stat-label">Present</span>
            </div>
            <div class="stat-box absent">
                <span class="stat-num">${absent}</span>
                <span class="stat-label">Absent</span>
            </div>
        </div>
        <div class="detail-info">
            <div class="info-row">
                <span class="info-label">Employee ID</span>
                <span class="info-value">${emp.emp_id}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Username</span>
                <span class="info-value">${emp.username}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Department</span>
                <span class="info-value">${emp.department}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Email</span>
                <span class="info-value">${emp.email || '-'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Mobile</span>
                <span class="info-value">${emp.mobile || '-'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Joined</span>
                <span class="info-value">${new Date(emp.created_at).toLocaleDateString()}</span>
            </div>
        </div>
        <div class="detail-actions">
            <button class="btn-danger" onclick="deleteEmployee('${emp.id}')">
                <i class="fas fa-trash"></i> Delete Employee
            </button>
        </div>
    `;
    
    document.getElementById('employee-detail').innerHTML = detailHtml;
    document.getElementById('detail-modal').classList.add('show');
}

function closeDetailModal() {
    document.getElementById('detail-modal').classList.remove('show');
}

async function deleteEmployee(id) {
    if (!confirm('Are you sure you want to delete this employee?')) return;
    
    try {
        const { error } = await supabase.from('employees').delete().eq('id', id);
        if (error) throw error;
        
        employees = employees.filter(e => e.id !== id);
        renderEmployees();
        closeDetailModal();
        showToast('Employee deleted successfully', 'success');
    } catch (error) {
        showToast('Failed to delete employee', 'error');
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function logout() {
    localStorage.removeItem('aarambh_session');
    sessionStorage.removeItem('aarambh_session');
    window.location.href = 'auth.html';
}