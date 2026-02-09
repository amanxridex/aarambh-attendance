// Current view state
let currentDate = new Date();
let selectedDate = null;

// Sample data - Replace with your actual data source
const attendanceData = generateSampleData();

function generateSampleData() {
    const data = {};
    const today = new Date();
    
    // Generate sample data for current month
    for (let i = 1; i <= 28; i++) {
        const date = new Date(today.getFullYear(), today.getMonth(), i);
        const dateKey = formatDateKey(date);
        
        // Random status for demo
        const rand = Math.random();
        if (rand > 0.2) { // 80% present
            const checkIn = new Date(date);
            checkIn.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
            
            const checkOut = new Date(date);
            checkOut.setHours(17 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
            
            data[dateKey] = {
                status: 'present',
                checkIn: checkIn,
                checkOut: checkOut,
                duration: Math.round((checkOut - checkIn) / (1000 * 60)) // minutes
            };
        } else if (rand > 0.1) { // 10% half day
            const checkIn = new Date(date);
            checkIn.setHours(9, 0);
            
            const checkOut = new Date(date);
            checkOut.setHours(13, 0);
            
            data[dateKey] = {
                status: 'half-day',
                checkIn: checkIn,
                checkOut: checkOut,
                duration: 240
            };
        } else { // 10% absent
            data[dateKey] = {
                status: 'absent',
                checkIn: null,
                checkOut: null,
                duration: 0
            };
        }
    }
    return data;
}

function formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTime(date) {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

function formatDuration(minutes) {
    if (!minutes || minutes === 0) return '--';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}

function getMonthName(monthIndex) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthIndex];
}

function getDayName(dayIndex) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dayIndex];
}

function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    renderCalendar();
}

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
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateKey = formatDateKey(date);
        const record = attendanceData[dateKey];
        
        const card = document.createElement('div');
        card.className = 'date-card';
        
        // Check if today
        if (date.toDateString() === today.toDateString()) {
            card.classList.add('today');
        }
        
        // Check if selected
        if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
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
        if (record) {
            const dot = document.createElement('div');
            dot.className = `status-dot ${record.status}`;
            card.appendChild(dot);
        }
        
        card.onclick = () => selectDate(date);
        grid.appendChild(card);
    }
}

function selectDate(date) {
    selectedDate = date;
    renderCalendar();
    showDayDetails(date);
}

function showDayDetails(date) {
    const details = document.getElementById('day-details');
    const dateKey = formatDateKey(date);
    const record = attendanceData[dateKey];
    
    // Update header
    document.getElementById('selected-date').textContent = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const statusBadge = document.getElementById('detail-status');
    
    if (!record) {
        statusBadge.textContent = 'No Record';
        statusBadge.className = 'status-badge';
        document.getElementById('check-in-time').textContent = '--:--';
        document.getElementById('check-out-time').textContent = '--:--';
        document.getElementById('duration-value').textContent = '--';
    } else {
        statusBadge.textContent = record.status.replace('-', ' ');
        statusBadge.className = `status-badge ${record.status}`;
        document.getElementById('check-in-time').textContent = formatTime(record.checkIn);
        document.getElementById('check-out-time').textContent = formatTime(record.checkOut);
        document.getElementById('duration-value').textContent = formatDuration(record.duration);
    }
    
    details.classList.add('show');
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderCalendar();
    
    // Select today by default
    const today = new Date();
    if (today.getMonth() === currentDate.getMonth()) {
        selectDate(today);
    }
});