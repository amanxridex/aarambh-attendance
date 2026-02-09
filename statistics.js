// Current view state
let currentDate = new Date();

// Get attendance data from localStorage or use sample data
function getAttendanceData() {
    const stored = localStorage.getItem('attendanceData');
    if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        Object.keys(parsed).forEach(key => {
            if (parsed[key].checkIn) parsed[key].checkIn = new Date(parsed[key].checkIn);
            if (parsed[key].checkOut) parsed[key].checkOut = new Date(parsed[key].checkOut);
        });
        return parsed;
    }
    return generateSampleData();
}

function generateSampleData() {
    const data = {};
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Generate for current month and previous month
    for (let monthOffset = 0; monthOffset < 2; monthOffset++) {
        const month = currentMonth - monthOffset;
        const year = month < 0 ? currentYear - 1 : currentYear;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            // Skip weekends
            if (date.getDay() === 0 || date.getDay() === 6) continue;
            
            const dateKey = formatDateKey(date);
            const rand = Math.random();
            
            if (rand > 0.15) { // 85% present
                const checkIn = new Date(date);
                checkIn.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
                
                const checkOut = new Date(date);
                checkOut.setHours(17 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60));
                
                const duration = Math.round((checkOut - checkIn) / (1000 * 60));
                
                data[dateKey] = {
                    status: duration > 360 ? 'present' : 'half-day',
                    checkIn: checkIn,
                    checkOut: checkOut,
                    duration: duration
                };
            } else { // 15% absent
                data[dateKey] = {
                    status: 'absent',
                    checkIn: null,
                    checkOut: null,
                    duration: 0
                };
            }
        }
    }
    
    // Save to localStorage for history page to use
    localStorage.setItem('attendanceData', JSON.stringify(data));
    return data;
}

function formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getMonthName(monthIndex) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthIndex];
}

function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    renderStatistics();
}

function calculateMonthlyStats(year, month) {
    const data = getAttendanceData();
    const stats = {
        present: 0,
        absent: 0,
        halfDay: 0,
        totalWorkingDays: 0,
        totalHours: 0,
        totalDays: 0,
        weeklyHours: [0, 0, 0, 0] // Last 4 weeks
    };
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        // Skip weekends (0 = Sunday, 6 = Saturday)
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        
        stats.totalWorkingDays++;
        const dateKey = formatDateKey(date);
        const record = data[dateKey];
        
        if (record) {
            stats.totalDays++;
            if (record.status === 'present') {
                stats.present++;
                stats.totalHours += (record.duration / 60);
            } else if (record.status === 'absent') {
                stats.absent++;
            } else if (record.status === 'half-day') {
                stats.halfDay++;
                stats.totalHours += (record.duration / 60);
            }
            
            // Calculate weekly hours (last 4 weeks)
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 28);
            if (date >= weekAgo) {
                const weekIndex = Math.floor((new Date() - date) / (7 * 24 * 60 * 60 * 1000));
                if (weekIndex < 4 && record.duration) {
                    stats.weeklyHours[3 - weekIndex] += (record.duration / 60);
                }
            }
        }
    }
    
    return stats;
}

function renderStatistics() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Update header
    document.getElementById('current-month').textContent = getMonthName(month);
    document.getElementById('current-year').textContent = year;
    
    const stats = calculateMonthlyStats(year, month);
    
    // Update stat cards
    document.getElementById('present-days').textContent = stats.present;
    document.getElementById('absent-days').textContent = stats.absent;
    document.getElementById('working-days').textContent = stats.totalWorkingDays;
    
    const avgHours = stats.present > 0 ? (stats.totalHours / stats.present).toFixed(1) : 0;
    document.getElementById('avg-hours').textContent = `${avgHours}h`;
    
    // Calculate percentages
    const presentPercent = stats.totalWorkingDays > 0 ? 
        Math.round((stats.present / stats.totalWorkingDays) * 100) : 0;
    const absentPercent = stats.totalWorkingDays > 0 ? 
        Math.round((stats.absent / stats.totalWorkingDays) * 100) : 0;
    
    document.getElementById('present-percent').innerHTML = 
        `<i class="fas fa-arrow-up"></i> ${presentPercent}%`;
    document.getElementById('absent-percent').innerHTML = 
        `<i class="fas fa-arrow-down"></i> ${absentPercent}%`;
    
    // Update donut chart
    updateDonutChart(stats, stats.totalWorkingDays);
    
    // Update weekly chart
    updateWeeklyChart(stats.weeklyHours);
    
    // Generate insights
    generateInsights(stats, avgHours, presentPercent);
}

function updateDonutChart(stats, totalDays) {
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    
    const presentDeg = totalDays > 0 ? (stats.present / totalDays) * 360 : 0;
    const absentDeg = totalDays > 0 ? (stats.absent / totalDays) * 360 : 0;
    const halfDeg = totalDays > 0 ? (stats.halfDay / totalDays) * 360 : 0;
    
    const presentOffset = circumference - (presentDeg / 360) * circumference;
    const absentOffset = circumference - (absentDeg / 360) * circumference;
    const halfOffset = circumference - (halfDeg / 360) * circumference;
    
    const presentSegment = document.querySelector('.present-segment');
    const absentSegment = document.querySelector('.absent-segment');
    const halfSegment = document.querySelector('.half-segment');
    
    presentSegment.style.strokeDasharray = `${circumference} ${circumference}`;
    presentSegment.style.strokeDashoffset = presentOffset;
    
    absentSegment.style.strokeDasharray = `${circumference} ${circumference}`;
    absentSegment.style.strokeDashoffset = absentOffset;
    absentSegment.style.transform = `rotate(${presentDeg}deg)`;
    absentSegment.style.transformOrigin = '100px 100px';
    
    halfSegment.style.strokeDasharray = `${circumference} ${circumference}`;
    halfSegment.style.strokeDashoffset = halfOffset;
    halfSegment.style.transform = `rotate(${presentDeg + absentDeg}deg)`;
    halfSegment.style.transformOrigin = '100px 100px';
    
    // Update center text
    const attendanceRate = totalDays > 0 ? 
        Math.round(((stats.present + (stats.halfDay * 0.5)) / totalDays) * 100) : 0;
    document.getElementById('attendance-rate').textContent = `${attendanceRate}%`;
}

function updateWeeklyChart(weeklyHours) {
    const container = document.getElementById('weekly-chart');
    container.innerHTML = '';
    
    const maxHours = Math.max(...weeklyHours, 40); // Minimum scale 40 hours
    const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    
    weeklyHours.forEach((hours, index) => {
        const percentage = (hours / maxHours) * 100;
        
        const barItem = document.createElement('div');
        barItem.className = 'bar-item';
        
        barItem.innerHTML = `
            <div class="bar-wrapper">
                <div class="bar-value">${hours.toFixed(1)}h</div>
                <div class="bar-fill" style="height: 0%"></div>
            </div>
            <span class="bar-label">${labels[index]}</span>
        `;
        
        container.appendChild(barItem);
        
        // Animate bar
        setTimeout(() => {
            barItem.querySelector('.bar-fill').style.height = `${Math.max(percentage, 5)}%`;
        }, 100 * index);
    });
}

function generateInsights(stats, avgHours, presentPercent) {
    const container = document.getElementById('insights-list');
    container.innerHTML = '';
    
    const insights = [];
    
    // Performance insight
    if (presentPercent >= 90) {
        insights.push({
            icon: 'good',
            iconClass: 'fas fa-trophy',
            title: 'Excellent Performance!',
            desc: `You've maintained ${presentPercent}% attendance this month. Keep up the great work!`
        });
    } else if (presentPercent >= 75) {
        insights.push({
            icon: 'warning',
            iconClass: 'fas fa-exclamation-triangle',
            title: 'Good but improvable',
            desc: `Your attendance is ${presentPercent}%. Try to reach 90% for better performance.`
        });
    } else {
        insights.push({
            icon: 'warning',
            iconClass: 'fas fa-chart-line',
            title: 'Attendance Alert',
            desc: `Your attendance is ${presentPercent}%. Regular attendance is important for productivity.`
        });
    }
    
    // Hours insight
    if (avgHours >= 8) {
        insights.push({
            icon: 'good',
            iconClass: 'fas fa-clock',
            title: 'Perfect Work Hours',
            desc: `You're averaging ${avgHours} hours per day. Great time management!`
        });
    } else if (avgHours >= 6) {
        insights.push({
            icon: 'info',
            iconClass: 'fas fa-hourglass-half',
            title: 'Average Hours',
            desc: `Your average is ${avgHours} hours. Standard full-time is 8 hours.`
        });
    } else {
        insights.push({
            icon: 'warning',
            iconClass: 'fas fa-user-clock',
            title: 'Low Hours Alert',
            desc: `Average ${avgHours} hours/day detected. Check your check-out times.`
        });
    }
    
    // Consistency insight
    if (stats.absent === 0) {
        insights.push({
            icon: 'good',
            iconClass: 'fas fa-calendar-check',
            title: 'Full Attendance',
            desc: 'No absences this month! You have a perfect attendance streak.'
        });
    } else {
        insights.push({
            icon: 'info',
            iconClass: 'fas fa-calendar-day',
            title: 'Absence Record',
            desc: `You've been absent ${stats.absent} day${stats.absent > 1 ? 's' : ''} this month.`
        });
    }
    
    insights.forEach(insight => {
        const item = document.createElement('div');
        item.className = 'insight-item';
        item.innerHTML = `
            <div class="insight-icon ${insight.icon}">
                <i class="${insight.iconClass}"></i>
            </div>
            <div class="insight-content">
                <div class="insight-title">${insight.title}</div>
                <div class="insight-desc">${insight.desc}</div>
            </div>
        `;
        container.appendChild(item);
    });
}

function exportData() {
    const data = getAttendanceData();
    const month = getMonthName(currentDate.getMonth());
    const year = currentDate.getFullYear();
    
    let csv = 'Date,Status,Check In,Check Out,Duration (hours)\n';
    
    Object.keys(data).sort().forEach(dateKey => {
        const record = data[dateKey];
        const date = new Date(dateKey);
        if (date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()) {
            csv += `${dateKey},${record.status},`;
            csv += record.checkIn ? record.checkIn.toLocaleTimeString() : '-';
            csv += ',';
            csv += record.checkOut ? record.checkOut.toLocaleTimeString() : '-';
            csv += ',';
            csv += record.duration ? (record.duration / 60).toFixed(2) : '0';
            csv += '\n';
        }
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${month}_${year}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderStatistics();
});