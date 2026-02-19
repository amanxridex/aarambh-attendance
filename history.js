const supabase = window.supabaseClient;

// State
let currentUser = null;
let currentDate = new Date();
let selectedDate = null;
let attendanceData = {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

// Check authentication
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
    
    await loadMonthData();
}

// Load attendance data for current month
async function loadMonthData() {
    try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // CORRECT: Get last day of month properly
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        
        const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
        
        console.log('Fetching:', startDate, 'to', endDate); // Debug
        
        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('employee_id', currentUser.id)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });
        
        if (error) throw error;
        
        attendanceData = {};
        data?.forEach(record => {
            attendanceData[record.date] = record;
        });
        
        renderCalendar();
        
        // Select today by default if in current month
        const today = new Date();
        if (today.getMonth() === month && today.getFullYear() === year) {
            selectDate(today);
        }
        
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Failed to load attendance data');
    }
}

// Determine status based on duration
function getStatus(record) {
    if (!record || !record.check_in) {
        return 'absent'; // 🔴 Red - No record
    }
    
    const duration = record.duration_minutes || 0;
    
    if (duration >= 240) { // 4 hours = 240 minutes
        return 'present'; // 🟢 Green - Full day (4+ hours)
    } else {
        return 'half-day'; // 🟡 Orange - Half day (0-4 hours)
    }
}

// Format time from ISO string
function formatTime(isoString) {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

// Format duration
function formatDuration(minutes) {
    if (!minutes || minutes === 0) return '--';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

// Get month name
function getMonthName(monthIndex) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthIndex];
}

// Get day name
function getDayName(dayIndex) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayIndex];
}

// Change month
async function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    await loadMonthData();
}

// Render calendar
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Update header
    document.getElementById('current-month').textContent = getMonthName(month);
    document.getElementById('current-year').textContent = year;
    
    const grid = document.getElementById('dates-grid');
    grid.innerHTML = '';
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    // Previous month padding
    for (let i = 0; i < startingDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'date-card empty';
        emptyCell.style.opacity = '0.3';
        grid.appendChild(emptyCell);
    }
    
    // Date cards
    const today = new Date();
    const todayKey = today.toISOString().split('T')[0];
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateKey = formatDateKey(date);
        const record = attendanceData[dateKey];
        const status = getStatus(record);
        
        const card = document.createElement('div');
        card.className = 'date-card';
        
        // Today highlight
        if (dateKey === todayKey) {
            card.classList.add('today');
        }
        
        // Selected highlight
        if (selectedDate && formatDateKey(selectedDate) === dateKey) {
            card.classList.add('selected');
        }
        
        // Date number
        const dateNum = document.createElement('span');
        dateNum.className = 'date-number';
        dateNum.textContent = day;
        card.appendChild(dateNum);
        
        // Day name
        const dayName = document.createElement('span');
        dayName.className = 'date-day';
        dayName.textContent = getDayName(date.getDay());
        card.appendChild(dayName);
        
        // Status dot
        const dot = document.createElement('div');
        dot.className = `status-dot ${status}`;
        card.appendChild(dot);
        
        card.onclick = () => selectDate(date);
        grid.appendChild(card);
    }
}

function formatDateKey(date) {
    // Use local date components to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Select date and show details
function selectDate(date) {
    selectedDate = date;
    renderCalendar();
    showDayDetails(date);
}

// Show day details
function showDayDetails(date) {
    const details = document.getElementById('day-details');
    const dateKey = formatDateKey(date);
    const record = attendanceData[dateKey];
    const status = getStatus(record);
    
    // Update header
    document.getElementById('selected-date').textContent = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const statusBadge = document.getElementById('detail-status');
    const selfiePreview = document.getElementById('selfie-preview');
    const selfieImage = document.getElementById('selfie-image');
    
    if (!record) {
        // No record - Absent
        statusBadge.textContent = 'Absent';
        statusBadge.className = 'status-badge absent';
        document.getElementById('check-in-time').textContent = '--:--';
        document.getElementById('check-out-time').textContent = '--:--';
        document.getElementById('duration-value').textContent = '--';
        selfiePreview.style.display = 'none';
    } else {
        // Has record
        const statusText = status === 'present' ? 'Full Day' : 
                          status === 'half-day' ? 'Half Day' : 'Absent';
        
        statusBadge.textContent = statusText;
        statusBadge.className = `status-badge ${status}`;
        
        document.getElementById('check-in-time').textContent = formatTime(record.check_in);
        document.getElementById('check-out-time').textContent = formatTime(record.check_out);
        document.getElementById('duration-value').textContent = formatDuration(record.duration_minutes);
        
        // Show selfie if available
        if (record.selfie_url) {
            selfieImage.src = record.selfie_url;
            selfiePreview.style.display = 'block';
        } else {
            selfiePreview.style.display = 'none';
        }
    }
    
    details.classList.add('show');
}

// Toast notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast show';
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}