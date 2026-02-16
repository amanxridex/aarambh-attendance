// Supabase Configuration - REPLACE WITH YOUR VALUES
const SUPABASE_URL = 'https://zbfgytxlnnddkurhiziy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiZmd5dHhsbm5kZGt1cmhpeml5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMjkxODksImV4cCI6MjA4NjgwNTE4OX0.RKsFVWA1gktyXa1BqRqYv_i6_74OnEHdJatg03WeDMM';

// Initialize Supabase
let supabase = null;

// State
let employees = [];
let todayAttendance = {};
let currentPage = 1;
const itemsPerPage = 10;

// Initialize when page loads
window.onload = function() {
    initSupabase();
};

function initSupabase() {
    if (typeof window.supabase === 'undefined') {
        setTimeout(initSupabase, 500);
        return;
    }
    
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase initialized');
    
    // Check auth and load data
    checkAuth();
    loadEmployees();
    loadTodayAttendance();
    loadActivities();
    
    // Set today's date
    document.getElementById('emp-join-date').valueAsDate = new Date();
    document.getElementById('attendance-date').valueAsDate = new Date();
}

// Check if user is authenticated and is admin
async function checkAuth() {
    const session = localStorage.getItem('aarambh_session') || sessionStorage.getItem('aarambh_session');
    
    if (!session) {
        window.location.href = 'auth.html';
        return;
    }
    
    const sessionData = JSON.parse(session);
    
    if (sessionData.role !== 'management') {
        showToast('Access denied. Admins only.', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }
}

// Load employees from Supabase
async function loadEmployees() {
    try {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        employees = data || [];
        updateStats();
        updateLastAdded();
        
    } catch (error) {
        console.error('Error loading employees:', error);
        showToast('Failed to load employees', 'error');
    }
}

// Load today's attendance
async function loadTodayAttendance() {
    const today = new Date().toISOString().split('T')[0];
    
    try {
        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('date', today);
        
        if (error) throw error;
        
        // Convert to object keyed by employee_id
        todayAttendance = {};
        data?.forEach(record => {
            todayAttendance[record.employee_id] = record;
        });
        
        updateStats();
        
    } catch (error) {
        console.error('Error loading attendance:', error);
    }
}

// Update stats bar
function updateStats() {
    const total = employees.length;
    const present = Object.values(todayAttendance).filter(a => a.status === 'present').length;
    const absent = Object.values(todayAttendance).filter(a => a.status === 'absent').length;
    const onLeave = Object.values(todayAttendance).filter(a => a.status === 'leave').length;
    
    document.getElementById('total-employees').textContent = total;
    document.getElementById('present-today').textContent = present;
    document.getElementById('absent-today').textContent = absent;
    document.getElementById('pending-leaves').textContent = onLeave;
    
    // Calculate average attendance
    const avg = total > 0 ? Math.round(((present + onLeave) / total) * 100) : 0;
    document.getElementById('avg-attendance').textContent = `${avg}% Avg Attendance`;
}

// Update last added text
function updateLastAdded() {
    if (employees.length > 0) {
        const last = employees[0];
        const date = new Date(last.created_at);
        const timeAgo = getTimeAgo(date);
        document.getElementById('last-added').textContent = `Last added: ${last.name} (${timeAgo})`;
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

// Load activities
async function loadActivities() {
    try {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        const container = document.getElementById('activity-list');
        
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="empty-state">No recent activity</div>';
            return;
        }
        
        container.innerHTML = data.map(act => `
            <div class="activity-item">
                <div class="activity-icon ${act.type}">
                    <i class="fas fa-${getActivityIcon(act.type)}"></i>
                </div>
                <div class="activity-content">
                    <h4>${act.title}</h4>
                    <p>${act.description}</p>
                </div>
                <span class="activity-time">${getTimeAgo(new Date(act.created_at))}</span>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading activities:', error);
        document.getElementById('activity-list').innerHTML = '<div class="empty-state">Failed to load activities</div>';
    }
}

function getActivityIcon(type) {
    const icons = {
        'add': 'user-plus',
        'checkin': 'check-circle',
        'leave': 'calendar-check',
        'update': 'edit',
        'delete': 'trash'
    };
    return icons[type] || 'info-circle';
}

// Modal functions
function openCreateEmployee() {
    document.getElementById('create-modal').classList.add('show');
    document.getElementById('emp-join-date').valueAsDate = new Date();
}

function closeCreateModal() {
    document.getElementById('create-modal').classList.remove('show');
    document.querySelector('.create-form').reset();
}

function openAttendanceDetails() {
    document.getElementById('attendance-modal').classList.add('show');
    loadAttendanceTable();
}

function closeAttendanceModal() {
    document.getElementById('attendance-modal').classList.remove('show');
}

// Save employee to Supabase
async function saveEmployee(event) {
    event.preventDefault();
    
    const btn = document.getElementById('create-emp-btn');
    btn.classList.add('loading');
    
    try {
        const name = document.getElementById('emp-name').value.trim();
        const empId = document.getElementById('emp-id').value.trim();
        const email = document.getElementById('emp-email').value.trim();
        const mobile = document.getElementById('emp-mobile').value.trim();
        const password = document.getElementById('emp-password').value;
        const passwordConfirm = document.getElementById('emp-password-confirm').value;
        const dept = document.getElementById('emp-dept').value;
        const designation = document.getElementById('emp-designation').value.trim();
        const joinDate = document.getElementById('emp-join-date').value;
        const shift = document.getElementById('emp-shift').value;
        
        // Validation
        if (password !== passwordConfirm) {
            throw new Error('Passwords do not match');
        }
        
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }
        
        // Check if email already exists
        const { data: existing } = await supabase
            .from('employees')
            .select('email')
            .eq('email', email)
            .single();
        
        if (existing) {
            throw new Error('Email already registered');
        }
        
        // Step 1: Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: name,
                    emp_id: empId
                }
            }
        });
        
        if (authError) throw authError;
        
        const userId = authData.user.id;
        
        // Step 2: Create employee record
        const { data: empData, error: empError } = await supabase
            .from('employees')
            .insert([{
                id: userId,
                email: email,
                name: name,
                emp_id: empId,
                mobile: mobile,
                department: dept,
                designation: designation,
                join_date: joinDate,
                shift_timing: shift,
                profile_image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
            }])
            .select()
            .single();
        
        if (empError) throw empError;
        
        // Step 3: Log activity
        await supabase.from('activities').insert([{
            type: 'add',
            title: 'New employee added',
            description: `${name} joined as ${designation}`,
            created_at: new Date().toISOString()
        }]);
        
        // Update local state
        employees.unshift(empData);
        updateStats();
        updateLastAdded();
        
        closeCreateModal();
        showToast(`Employee ${name} created successfully! They can now login with ${email}`, 'success');
        loadActivities();
        
    } catch (error) {
        console.error('Error creating employee:', error);
        showToast(error.message || 'Failed to create employee', 'error');
    } finally {
        btn.classList.remove('loading');
    }
}

// Load attendance table
function loadAttendanceTable(filter = 'all', searchQuery = '') {
    const tbody = document.getElementById('attendance-tbody');
    let filtered = employees;
    
    // Apply search
    if (searchQuery) {
        filtered = filtered.filter(emp => 
            emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.emp_id.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    // Apply status filter
    if (filter !== 'all') {
        filtered = filtered.filter(emp => {
            const att = todayAttendance[emp.id];
            return att?.status === filter;
        });
    }
    
    // Pagination
    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);
    
    // Render
    tbody.innerHTML = paginated.map(emp => {
        const att = todayAttendance[emp.id] || { status: 'absent', check_in: null, check_out: null, duration_minutes: 0 };
        const checkIn = att.check_in ? new Date(att.check_in).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false}) : '--:--';
        const checkOut = att.check_out ? new Date(att.check_out).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false}) : '--:--';
        const duration = att.duration_minutes > 0 ? `${Math.floor(att.duration_minutes/60)}h ${att.duration_minutes%60}m` : '--';
        
        return `
            <tr>
                <td>
                    <div class="emp-cell">
                        <img src="${emp.profile_image}" alt="${emp.name}" class="emp-img">
                        <div class="emp-info">
                            <h4>${emp.name}</h4>
                            <span>${emp.email}</span>
                        </div>
                    </div>
                </td>
                <td>${emp.emp_id}</td>
                <td>${emp.department}</td>
                <td><span class="status-badge ${att.status}">${att.status}</span></td>
                <td>${checkIn}</td>
                <td>${checkOut}</td>
                <td>${duration}</td>
                <td>
                    <div class="action-btns">
                        <button onclick="viewEmployee('${emp.id}')" title="View"><i class="fas fa-eye"></i></button>
                        <button onclick="editEmployee('${emp.id}')" title="Edit"><i class="fas fa-pen"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('showing-text').textContent = `Showing ${paginated.length} of ${filtered.length} employees`;
    document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
}

function searchEmployees() {
    const query = document.getElementById('search-emp').value;
    loadAttendanceTable('all', query);
}

function filterAttendance(type) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    currentPage = 1;
    loadAttendanceTable(type);
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        loadAttendanceTable();
    }
}

function nextPage() {
    currentPage++;
    loadAttendanceTable();
}

// Quick actions
function showNotifications() {
    showToast('No new notifications', 'success');
}

function viewEmployee(id) {
    const emp = employees.find(e => e.id === id);
    showToast(`Viewing ${emp?.name}`, 'success');
}

function editEmployee(id) {
    showToast('Edit feature coming soon', 'success');
}

// Toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Logout
async function logout() {
    await supabase.auth.signOut();
    localStorage.removeItem('aarambh_session');
    sessionStorage.removeItem('aarambh_session');
    window.location.href = 'auth.html';
}

// Close modals on escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeCreateModal();
        closeAttendanceModal();
    }
});