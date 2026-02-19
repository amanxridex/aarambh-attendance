const supabase = window.supabaseClient;

let employees = [];
let currentEmpId = null;
let currentModalDate = new Date();
let todayAttendance = {};
let selectedDateData = null;

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
    await loadTodayAttendance();
    await loadEmployees();
}

async function loadTodayAttendance() {
    const today = new Date().toISOString().split('T')[0];
    try {
        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('date', today);
        
        if (error) throw error;
        data?.forEach(record => {
            todayAttendance[record.employee_id] = record;
        });
        
        updateOverviewStats();
    } catch (error) {
        console.error('Error loading today attendance:', error);
    }
}

function updateOverviewStats() {
    const present = Object.values(todayAttendance).filter(a => {
        // PRESENT if checked in (don't wait for checkout)
        return a.check_in !== null && a.check_in !== undefined;
    }).length;
    
    const total = employees.length;
    const absent = total - present;
    
    document.getElementById('total-count').textContent = total;
    document.getElementById('present-count').textContent = present;
    document.getElementById('absent-count').textContent = absent;
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
        updateOverviewStats();
        renderEmployees();
    } catch (error) {
        showToast('Failed to load employees', 'error');
    }
}

function getEmployeeStatus(empId) {
    const record = todayAttendance[empId];
    // ONLINE if checked in (don't wait for checkout)
    if (record && record.check_in) return 'online';
    return 'offline';
}

function renderEmployees(filtered = employees) {
    const list = document.getElementById('employees-list');
    
    if (filtered.length === 0) {
        list.innerHTML = '<div class="loading">No employees found</div>';
        return;
    }
    
    list.innerHTML = filtered.map(emp => {
        const status = getEmployeeStatus(emp.id);
        const record = todayAttendance[emp.id];
        // Show duration if available, else show "Present" if checked in
        let timeDisplay = '--';
        if (record) {
            if (record.duration_minutes) {
                timeDisplay = `${Math.floor(record.duration_minutes/60)}h ${record.duration_minutes%60}m`;
            } else if (record.check_in) {
                timeDisplay = 'Present';
            }
        }
        
        return `
        <div class="emp-card" onclick="openEmployeeModal('${emp.id}')">
            <div class="emp-avatar">
                <img src="${emp.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random&color=fff&size=100`}" alt="${emp.name}">
                <div class="status-dot ${status}"></div>
            </div>
            <div class="emp-info">
                <div class="emp-name">
                    ${emp.name}
                    ${status === 'online' ? '<i class="fas fa-check-circle" style="color: var(--accent-green); font-size: 14px;"></i>' : ''}
                </div>
                <div class="emp-role">${emp.designation}</div>
                <div class="emp-meta">
                    <span class="dept-tag">${emp.department}</span>
                    <div class="emp-stats">
                        <span><i class="fas fa-clock"></i> ${timeDisplay}</span>
                        <span><i class="fas fa-calendar"></i> ${new Date(emp.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
            <div class="emp-arrow">
                <i class="fas fa-chevron-right"></i>
            </div>
        </div>
    `}).join('');
}

function searchEmployees() {
    const query = document.getElementById('search-input').value.toLowerCase();
    filterAndRender(query, currentDeptFilter);
}

let currentDeptFilter = 'all';

function filterByDept(dept) {
    currentDeptFilter = dept;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    const query = document.getElementById('search-input').value.toLowerCase();
    filterAndRender(query, dept);
}

function filterAndRender(query, dept) {
    let filtered = employees;
    
    if (dept !== 'all') {
        filtered = filtered.filter(e => e.department === dept);
    }
    
    if (query) {
        filtered = filtered.filter(emp => 
            emp.name.toLowerCase().includes(query) ||
            emp.emp_id.toLowerCase().includes(query) ||
            emp.username.toLowerCase().includes(query)
        );
    }
    
    renderEmployees(filtered);
}

async function openEmployeeModal(id) {
    currentEmpId = id;
    currentModalDate = new Date();
    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    
    // Update profile header
    document.getElementById('modal-avatar').src = emp.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random&color=fff&size=200`;
    document.getElementById('modal-name').textContent = emp.name;
    document.getElementById('modal-role').textContent = emp.designation;
    document.getElementById('modal-dept').textContent = emp.department;
    document.getElementById('modal-id').textContent = emp.emp_id;
    document.getElementById('modal-email').textContent = emp.email || 'No email';
    document.getElementById('modal-phone').textContent = emp.mobile || 'No phone';
    
    const status = getEmployeeStatus(emp.id);
    document.getElementById('status-dot').className = `status-indicator ${status}`;
    
    await loadModalData();
    
    document.getElementById('emp-modal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

async function loadModalData() {
    const emp = employees.find(e => e.id === currentEmpId);
    if (!emp) return;
    
    const year = currentModalDate.getFullYear();
    const month = currentModalDate.getMonth();
    const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;
    
    document.getElementById('modal-month').textContent = `${currentModalDate.toLocaleString('default', { month: 'long' })} ${year}`;
    
    const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', currentEmpId)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .order('date', { ascending: false });
    
    // Calculate stats
    let fullDays = 0, halfDays = 0, absentDays = 0, totalHours = 0;
    const attendanceMap = {};
    
    attendance?.forEach(record => {
        attendanceMap[record.date] = record;
        const duration = record.duration_minutes || 0;
        const hours = duration / 60;
        
        // PRESENT if checked in (don't wait for checkout)
        if (record.check_in) {
            if (duration >= 240) {
                fullDays++;
                totalHours += hours;
            } else {
                // If checked in but less than 4 hours = half day
                halfDays++;
                totalHours += hours;
            }
        } else {
            // No check_in = ABSENT
            absentDays++;
        }
    });
    
    // Count absents for days with no record (working days only)
    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
    
    for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, month, day);
        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        // If no record for this day, it's absent
        if (!attendanceMap[dateKey]) {
            // Only count as absent if it's in the past or today
            if (date <= today) {
                absentDays++;
            }
        }
    }
    
    // Update stats
    document.getElementById('stat-present').textContent = fullDays;
    document.getElementById('stat-half').textContent = halfDays;
    document.getElementById('stat-absent').textContent = absentDays;
    
    const avgHours = (fullDays + halfDays) > 0 ? (totalHours / (fullDays + halfDays)).toFixed(1) : 0;
    document.getElementById('stat-hours').textContent = `${avgHours}h`;
    
    // Render calendar
    renderMiniCalendar(year, month, attendanceMap);
    
    // Render timeline (last 5)
    const recent = attendance?.slice(0, 5) || [];
    document.getElementById('activity-timeline').innerHTML = recent.length ? recent.map(record => {
        const date = new Date(record.date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const checkIn = record.check_in ? new Date(record.check_in).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false}) : '--:--';
        const checkOut = record.check_out ? new Date(record.check_out).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false}) : '--:--';
        const duration = record.duration_minutes ? `${Math.floor(record.duration_minutes/60)}h ${record.duration_minutes%60}m` : (record.check_in ? 'Present' : '--');
        const isCheckOut = record.check_out;
        
        return `
            <div class="timeline-item">
                <div class="timeline-icon ${isCheckOut ? 'checkout' : 'checkin'}">
                    <i class="fas fa-${isCheckOut ? 'sign-out-alt' : 'sign-in-alt'}"></i>
                </div>
                <div class="timeline-content">
                    <div class="timeline-date">${dateStr}</div>
                    <div class="timeline-title">${isCheckOut ? 'Checked Out' : 'Checked In'} • ${duration}</div>
                    <div class="timeline-meta">
                        <span><i class="fas fa-arrow-right"></i> ${checkIn}</span>
                        <span><i class="fas fa-arrow-left"></i> ${checkOut}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('') : '<div class="timeline-item"><div class="timeline-content"><div class="timeline-title">No activity this month</div></div></div>';
}

function renderMiniCalendar(year, month, attendanceMap) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
    const todayKey = today.toISOString().split('T')[0];
    
    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    let html = weekdays.map(d => `<div class="cal-day-header">${d}</div>`).join('');
    
    // Empty cells
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="cal-day empty"></div>';
    }
    
    // Days - ALL days same rule: green if has check_in, red if not (no weekend exception)
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const record = attendanceMap[dateKey];
        const isToday = isCurrentMonth && day === today.getDate();
        const dateObj = new Date(year, month, day);
        const isPastOrToday = dateObj <= today;
        
        let status = '';
        let dot = '';
        
        // SAME RULE FOR ALL DAYS - NO WEEKEND EXCEPTION
        if (record && record.check_in) {
            // Has check_in = PRESENT (green)
            const duration = record.duration_minutes || 0;
            if (duration >= 240) {
                status = 'present';
                dot = '<div class="cal-dot present"></div>';
            } else {
                status = 'half';
                dot = '<div class="cal-dot half"></div>';
            }
        } else if (isPastOrToday) {
            // No record and past/today = ABSENT (red)
            status = 'absent';
            dot = '<div class="cal-dot absent"></div>';
        }
        // Future days stay neutral (no color)
        
        const todayClass = isToday ? 'today' : '';
        
        html += `
            <div class="cal-day ${status} ${todayClass}" onclick="showDayDetail('${dateKey}')">
                ${day}
                ${dot}
            </div>
        `;
    }
    
    document.getElementById('mini-calendar').innerHTML = html;
}

async function showDayDetail(dateKey) {
    const emp = employees.find(e => e.id === currentEmpId);
    if (!emp) return;
    
    const { data: records } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', currentEmpId)
        .eq('date', dateKey);
    
    const record = records?.[0];
    selectedDateData = { date: dateKey, record, emp };
    
    const date = new Date(dateKey);
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // Create day modal if not exists
    let dayModal = document.getElementById('day-detail-modal');
    if (!dayModal) {
        dayModal = document.createElement('div');
        dayModal.id = 'day-detail-modal';
        dayModal.className = 'day-modal';
        dayModal.innerHTML = `
            <div class="day-modal-content">
                <div class="day-modal-header">
                    <h3 id="day-modal-date">Date</h3>
                    <button class="close-btn" onclick="closeDayModal()" style="position: static; background: var(--bg-secondary);">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="day-modal-body"></div>
            </div>
        `;
        document.body.appendChild(dayModal);
    }
    
    document.getElementById('day-modal-date').textContent = dateStr;
    
    let bodyHtml = '';
    
    // ALL DAYS SAME RULE - NO WEEKEND EXCEPTION
    if (!record || !record.check_in) {
        // ABSENT (red) - regardless of weekend
        bodyHtml = `
            <div class="selfie-container">
                <div class="selfie-placeholder">
                    <i class="fas fa-user-slash"></i>
                    <p>No Check-in</p>
                </div>
            </div>
            <div class="status-badge-large absent">
                <i class="fas fa-times-circle"></i> ABSENT
            </div>
        `;
    } else {
        // PRESENT (has check_in)
        const duration = record.duration_minutes || 0;
        const status = duration >= 240 ? 'present' : 'half';
        const statusText = duration >= 240 ? 'FULL DAY' : 'HALF DAY';
        const statusIcon = duration >= 240 ? 'check-circle' : 'adjust';
        const checkIn = new Date(record.check_in).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false});
        const checkOut = record.check_out ? new Date(record.check_out).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false}) : 'Not checked out';
        const durationText = record.duration_minutes ? `${Math.floor(record.duration_minutes/60)}h ${record.duration_minutes%60}m` : 'In Progress';
        
        // Selfie
        bodyHtml += `
            <div class="selfie-container">
                ${record.selfie_url ? `<img src="${record.selfie_url}" alt="Selfie" onclick="window.open('${record.selfie_url}', '_blank')">` : `
                    <div class="selfie-placeholder">
                        <i class="fas fa-camera"></i>
                        <p>No selfie available</p>
                    </div>
                `}
            </div>
        `;
        
        // Location
        if (record.location_lat && record.location_lng) {
            const mapsUrl = `https://www.google.com/maps?q=${record.location_lat},${record.location_lng}`;
            bodyHtml += `
                <div class="location-box">
                    <div class="location-header">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>Location</span>
                        <a href="${mapsUrl}" target="_blank" style="margin-left: auto; color: var(--accent-green);">
                            <i class="fas fa-external-link-alt"></i>
                        </a>
                    </div>
                    <div class="location-address" id="day-location-address">
                        Lat: ${record.location_lat}, Lng: ${record.location_lng}
                    </div>
                </div>
            `;
            
            // Try to get address
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${record.location_lat}&lon=${record.location_lng}`)
                .then(r => r.json())
                .then(data => {
                    if (data.display_name) {
                        const addr = document.getElementById('day-location-address');
                        if (addr) addr.textContent = data.display_name;
                    }
                })
                .catch(() => {});
        }
        
        // Time grid
        bodyHtml += `
            <div class="time-grid">
                <div class="time-box">
                    <label>Check In</label>
                    <div class="time">${checkIn}</div>
                </div>
                <div class="time-box">
                    <label>Check Out</label>
                    <div class="time" style="${!record.check_out ? 'color: var(--text-secondary);' : ''}">${checkOut}</div>
                </div>
            </div>
        `;
        
        // Duration
        bodyHtml += `
            <div class="duration-box">
                <label>Total Duration</label>
                <div class="duration">${durationText}</div>
            </div>
        `;
        
        // Status
        bodyHtml += `
            <div class="status-badge-large ${status}">
                <i class="fas fa-${statusIcon}"></i> ${statusText}
            </div>
        `;
    }
    
    document.getElementById('day-modal-body').innerHTML = bodyHtml;
    dayModal.classList.add('show');
}

function closeDayModal() {
    const dayModal = document.getElementById('day-detail-modal');
    if (dayModal) {
        dayModal.classList.remove('show');
    }
}

function changeModalMonth(direction) {
    currentModalDate.setMonth(currentModalDate.getMonth() + direction);
    loadModalData();
}

function closeModal() {
    document.getElementById('emp-modal').classList.remove('show');
    document.body.style.overflow = '';
    currentEmpId = null;
    closeDayModal();
}

function viewFullHistory() {
    if (currentEmpId) {
        localStorage.setItem('view_employee_id', currentEmpId);
        window.location.href = `history.html?view=${currentEmpId}`;
    }
}

async function deleteCurrentEmployee() {
    if (!currentEmpId) return;
    
    const emp = employees.find(e => e.id === currentEmpId);
    const confirmMsg = `Delete ${emp?.name || 'this employee'} permanently?\n\nThis will remove all their attendance records too.`;
    
    if (!confirm(confirmMsg)) return;
    
    try {
        await supabase.from('attendance').delete().eq('employee_id', currentEmpId);
        const { error } = await supabase.from('employees').delete().eq('id', currentEmpId);
        if (error) throw error;
        
        employees = employees.filter(e => e.id !== currentEmpId);
        document.getElementById('emp-count').textContent = employees.length;
        updateOverviewStats();
        renderEmployees();
        closeModal();
        showToast('Employee deleted successfully', 'success');
    } catch (error) {
        showToast('Failed to delete employee: ' + error.message, 'error');
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeDayModal();
        closeModal();
    }
});