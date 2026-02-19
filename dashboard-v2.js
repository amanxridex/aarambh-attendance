// Supabase Configuration
const SUPABASE_URL = 'https://zbfgytxlnnddkurhiziy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiZmd5dHhsbm5kZGt1cmhpeml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjkxODksImV4cCI6MjA4NjgwNTE4OX0.RKsFVWA1gktyXa1BqRqYv_i6_74OnEHdJatg03WeDMM';

let supabase = null;
let employees = [];
let todayAttendance = {};

window.onload = function() {
    initSupabase();
};

function initSupabase() {
    if (typeof window.supabase === 'undefined') {
        setTimeout(initSupabase, 500);
        return;
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    checkAuth();
    loadEmployees();
    loadTodayAttendance();
}

async function checkAuth() {
    const session = localStorage.getItem('aarambh_session') || sessionStorage.getItem('aarambh_session');
    if (!session) {
        window.location.href = 'auth.html';
        return;
    }
    const sessionData = JSON.parse(session);
    if (sessionData.role !== 'management') {
        window.location.href = 'index.html';
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
        updateStats();
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
        updateStats();
    } catch (error) {
        console.error('Error loading attendance:', error);
    }
}

function updateStats() {
    document.getElementById('total-employees').textContent = employees.length;
    const present = Object.values(todayAttendance).filter(a => a.status === 'present').length;
    const absent = Object.values(todayAttendance).filter(a => a.status === 'absent').length;
    document.getElementById('present-today').textContent = present;
    document.getElementById('absent-today').textContent = absent;
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

// SIMPLE SAVE - NO SUPABASE AUTH
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
        
        // Check duplicate username
        const { data: existing } = await supabase
            .from('employees')
            .select('username')
            .eq('username', employeeData.username)
            .maybeSingle();
        if (existing) throw new Error('Username already exists');
        
        // Check duplicate emp_id
        const { data: existingId } = await supabase
            .from('employees')
            .select('emp_id')
            .eq('emp_id', employeeData.emp_id)
            .maybeSingle();
        if (existingId) throw new Error('Employee ID already exists');
        
        // SIMPLE INSERT - NO AUTH
        const { data, error } = await supabase
            .from('employees')
            .insert([employeeData])
            .select()
            .single();
        
        if (error) throw error;
        
        employees.unshift(data);
        updateStats();
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
        updateStats();
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
    window.location.href = 'auth.html';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeCreateModal();
        closeViewModal();
    }
});