// Sample employee data
let employees = [
    { id: 'EMP001', name: 'John Doe', email: 'john@company.com', dept: 'Engineering', designation: 'Senior Developer', joinDate: '2023-01-15', shift: '9-6', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
    { id: 'EMP002', name: 'Jane Smith', email: 'jane@company.com', dept: 'Design', designation: 'UI/UX Designer', joinDate: '2023-03-20', shift: '10-7', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face' },
    { id: 'EMP003', name: 'Mike Johnson', email: 'mike@company.com', dept: 'Marketing', designation: 'Marketing Manager', joinDate: '2022-11-10', shift: '9-6', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face' },
    { id: 'EMP004', name: 'Sarah Williams', email: 'sarah@company.com', dept: 'HR', designation: 'HR Executive', joinDate: '2023-06-01', shift: '9-6', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face' },
    { id: 'EMP005', name: 'David Brown', email: 'david@company.com', dept: 'Sales', designation: 'Sales Lead', joinDate: '2022-08-15', shift: '10-7', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face' }
];

// Attendance data for today
let todayAttendance = {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadActivities();
    generateTodayAttendance();
    document.getElementById('attendance-date').valueAsDate = new Date();
});

// Generate random attendance for today
function generateTodayAttendance() {
    employees.forEach(emp => {
        const rand = Math.random();
        if (rand > 0.2) {
            const checkIn = new Date();
            checkIn.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
            const checkOut = new Date();
            checkOut.setHours(17 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60));
            
            todayAttendance[emp.id] = {
                status: 'present',
                checkIn: checkIn,
                checkOut: checkOut,
                duration: Math.round((checkOut - checkIn) / (1000 * 60))
            };
        } else if (rand > 0.1) {
            todayAttendance[emp.id] = {
                status: 'leave',
                checkIn: null,
                checkOut: null,
                duration: 0
            };
        } else {
            todayAttendance[emp.id] = {
                status: 'absent',
                checkIn: null,
                checkOut: null,
                duration: 0
            };
        }
    });
    updateStats();
}

// Update stats bar
function updateStats() {
    const present = Object.values(todayAttendance).filter(a => a.status === 'present').length;
    const absent = Object.values(todayAttendance).filter(a => a.status === 'absent').length;
    const leave = Object.values(todayAttendance).filter(a => a.status === 'leave').length;
    
    document.getElementById('total-employees').textContent = employees.length;
    document.getElementById('present-today').textContent = present;
    document.getElementById('absent-today').textContent = absent;
    document.getElementById('pending-leaves').textContent = leave;
}

// Load recent activities
function loadActivities() {
    const activities = [
        { type: 'add', title: 'New employee added', desc: 'Alice Cooper joined as Developer', time: '2 mins ago', icon: 'add' },
        { type: 'checkin', title: 'Bulk check-in', desc: '18 employees checked in', time: '1 hour ago', icon: 'checkin' },
        { type: 'leave', title: 'Leave approved', desc: 'Mike Johnson - 2 days', time: '3 hours ago', icon: 'leave' },
        { type: 'add', title: 'Department updated', desc: 'Design team restructured', time: '5 hours ago', icon: 'add' }
    ];
    
    const container = document.getElementById('activity-list');
    container.innerHTML = activities.map(act => `
        <div class="activity-item">
            <div class="activity-icon ${act.icon}">
                <i class="fas fa-${act.icon === 'add' ? 'user-plus' : act.icon === 'checkin' ? 'check-circle' : 'calendar-check'}"></i>
            </div>
            <div class="activity-content">
                <h4>${act.title}</h4>
                <p>${act.desc}</p>
            </div>
            <span class="activity-time">${act.time}</span>
        </div>
    `).join('');
}

// Open Create Employee Modal
function openCreateEmployee() {
    document.getElementById('create-modal').classList.add('show');
    document.getElementById('emp-join-date').valueAsDate = new Date();
}

// Close Create Modal
function closeCreateModal() {
    document.getElementById('create-modal').classList.remove('show');
}

// Save Employee
function saveEmployee(event) {
    event.preventDefault();
    
    const newEmployee = {
        id: document.getElementById('emp-id').value,
        name: document.getElementById('emp-name').value,
        email: document.getElementById('emp-email').value,
        mobile: document.getElementById('emp-mobile').value,
        dept: document.getElementById('emp-dept').value,
        designation: document.getElementById('emp-designation').value,
        joinDate: document.getElementById('emp-join-date').value,
        shift: document.getElementById('emp-shift').value,
        image: `https://ui-avatars.com/api/?name=${document.getElementById('emp-name').value}&background=random`
    };
    
    employees.push(newEmployee);
    
    // Add to today's attendance as absent (not checked in yet)
    todayAttendance[newEmployee.id] = {
        status: 'absent',
        checkIn: null,
        checkOut: null,
        duration: 0
    };
    
    updateStats();
    closeCreateModal();
    showToast('Employee created successfully!', 'success');
    event.target.reset();
    
    // Add to activities
    const activityList = document.getElementById('activity-list');
    const newActivity = document.createElement('div');
    newActivity.className = 'activity-item';
    newActivity.innerHTML = `
        <div class="activity-icon add">
            <i class="fas fa-user-plus"></i>
        </div>
        <div class="activity-content">
            <h4>New employee added</h4>
            <p>${newEmployee.name} joined as ${newEmployee.designation}</p>
        </div>
        <span class="activity-time">Just now</span>
    `;
    activityList.insertBefore(newActivity, activityList.firstChild);
}

// Open Attendance Details Modal
function openAttendanceDetails() {
    document.getElementById('attendance-modal').classList.add('show');
    loadAttendanceTable();
}

// Close Attendance Modal
function closeAttendanceModal() {
    document.getElementById('attendance-modal').classList.remove('show');
}

// Load attendance table
function loadAttendanceTable(filter = 'all') {
    const tbody = document.getElementById('attendance-tbody');
    let filteredEmployees = employees;
    
    if (filter !== 'all') {
        filteredEmployees = employees.filter(emp => todayAttendance[emp.id]?.status === filter);
    }
    
    tbody.innerHTML = filteredEmployees.map(emp => {
        const attendance = todayAttendance[emp.id] || { status: 'absent', checkIn: null, checkOut: null, duration: 0 };
        const checkInTime = attendance.checkIn ? attendance.checkIn.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false}) : '--:--';
        const checkOutTime = attendance.checkOut ? attendance.checkOut.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false}) : '--:--';
        const duration = attendance.duration > 0 ? `${Math.floor(attendance.duration/60)}h ${attendance.duration%60}m` : '--';
        
        return `
            <tr>
                <td>
                    <div class="emp-cell">
                        <img src="${emp.image}" alt="${emp.name}" class="emp-img">
                        <div class="emp-info">
                            <h4>${emp.name}</h4>
                            <span>${emp.designation}</span>
                        </div>
                    </div>
                </td>
                <td>${emp.id}</td>
                <td>${emp.dept}</td>
                <td><span class="status-badge ${attendance.status}">${attendance.status}</span></td>
                <td>${checkInTime}</td>
                <td>${checkOutTime}</td>
                <td>${duration}</td>
                <td>
                    <div class="action-btns">
                        <button onclick="editAttendance('${emp.id}')" title="Edit"><i class="fas fa-pen"></i></button>
                        <button onclick="viewDetails('${emp.id}')" title="View"><i class="fas fa-eye"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('showing-text').textContent = `Showing ${filteredEmployees.length} of ${employees.length} employees`;
}

// Filter attendance
function filterAttendance(type) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    loadAttendanceTable(type);
}

// Quick action handlers
function showNotifications() {
    showToast('3 pending notifications', 'success');
}

function goToProfile() {
    window.location.href = 'profile.html';
}

function exportReport() {
    showToast('Report downloaded successfully!', 'success');
}

function bulkNotify() {
    showToast('Notification sent to all employees', 'success');
}

function viewCalendar() {
    showToast('Calendar view coming soon!', 'success');
}

function settings() {
    showToast('Settings page coming soon!', 'success');
}

function viewAllActivity() {
    showToast('Loading all activities...', 'success');
}

function editAttendance(empId) {
    showToast(`Editing attendance for ${empId}`, 'success');
}

function viewDetails(empId) {
    const emp = employees.find(e => e.id === empId);
    showToast(`Viewing details for ${emp.name}`, 'success');
}

function prevPage() {
    showToast('Previous page', 'success');
}

function nextPage() {
    showToast('Next page', 'success');
}

// Show toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Close modals on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeCreateModal();
        closeAttendanceModal();
    }
});