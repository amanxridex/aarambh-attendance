const supabase = window.supabaseClient;

let currentUser = null;
let currentDate = new Date();

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

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
    renderStatistics();
}

function getMonthName(monthIndex) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    return months[monthIndex];
}

async function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    await renderStatistics();
}

function getStatus(record) {
    if (!record || !record.check_in) return 'absent';
    const duration = record.duration_minutes || 0;
    if (duration >= 240) return 'present';
    return 'half-day';
}

async function renderStatistics() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    document.getElementById('current-month').textContent = getMonthName(month);
    document.getElementById('current-year').textContent = year;
    
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    try {
        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('employee_id', currentUser.id)
            .gte('date', startDate)
            .lte('date', endDate);
        
        if (error) throw error;
        
        const records = data || [];
        
        // Calculate working days (excluding weekends)
        let workingDays = 0;
        for (let day = 1; day <= lastDay; day++) {
            const date = new Date(year, month, day);
            if (date.getDay() !== 0 && date.getDay() !== 6) workingDays++;
        }
        
        // Count stats
        let present = 0, halfDay = 0, absent = 0, totalHours = 0;
        
        for (let day = 1; day <= lastDay; day++) {
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const date = new Date(year, month, day);
            if (date.getDay() === 0 || date.getDay() === 6) continue;
            
            const record = records.find(r => r.date === dateKey);
            const status = getStatus(record);
            
            if (status === 'present') {
                present++;
                totalHours += (record.duration_minutes || 0) / 60;
            } else if (status === 'half-day') {
                halfDay++;
                totalHours += (record.duration_minutes || 0) / 60;
            } else {
                absent++;
            }
        }
        
        // Update UI
        document.getElementById('present-days').textContent = present;
        document.getElementById('half-days').textContent = halfDay;
        document.getElementById('absent-days').textContent = absent;
        
        const avgHours = (present + halfDay) > 0 ? (totalHours / (present + halfDay)).toFixed(1) : 0;
        document.getElementById('avg-hours').textContent = `${avgHours}h`;
        document.getElementById('total-hours').textContent = `${Math.round(totalHours)}h total`;
        
        const presentPercent = workingDays > 0 ? Math.round((present / workingDays) * 100) : 0;
        const halfPercent = workingDays > 0 ? Math.round((halfDay / workingDays) * 100) : 0;
        const absentPercent = workingDays > 0 ? Math.round((absent / workingDays) * 100) : 0;
        
        document.getElementById('present-percent').textContent = `${presentPercent}%`;
        document.getElementById('half-percent').textContent = `${halfPercent}%`;
        document.getElementById('absent-percent').textContent = `${absentPercent}%`;
        
        updateDonutChart(present, halfDay, absent, workingDays);
        generateInsights(present, halfDay, absent, avgHours, presentPercent, workingDays);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

function updateDonutChart(present, halfDay, absent, total) {
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    
    const presentPct = total > 0 ? present / total : 0;
    const halfPct = total > 0 ? halfDay / total : 0;
    const absentPct = total > 0 ? absent / total : 0;
    
    const presentOffset = circumference - (presentPct * circumference);
    const halfOffset = circumference - (halfPct * circumference);
    const absentOffset = circumference - (absentPct * circumference);
    
    const presentSeg = document.querySelector('.present-segment');
    const halfSeg = document.querySelector('.half-segment');
    const absentSeg = document.querySelector('.absent-segment');
    
    presentSeg.style.strokeDasharray = `${circumference} ${circumference}`;
    presentSeg.style.strokeDashoffset = presentOffset;
    presentSeg.style.transform = 'rotate(0deg)';
    
    halfSeg.style.strokeDasharray = `${circumference} ${circumference}`;
    halfSeg.style.strokeDashoffset = halfOffset;
    halfSeg.style.transform = `rotate(${presentPct * 360}deg)`;
    halfSeg.style.transformOrigin = '100px 100px';
    
    absentSeg.style.strokeDasharray = `${circumference} ${circumference}`;
    absentSeg.style.strokeDashoffset = absentOffset;
    absentSeg.style.transform = `rotate(${(presentPct + halfPct) * 360}deg)`;
    absentSeg.style.transformOrigin = '100px 100px';
    
    const rate = total > 0 ? Math.round(((present + (halfDay * 0.5)) / total) * 100) : 0;
    document.getElementById('attendance-rate').textContent = `${rate}%`;
}

function generateInsights(present, halfDay, absent, avgHours, presentPercent, workingDays) {
    const container = document.getElementById('insights-list');
    container.innerHTML = '';
    
    const insights = [];
    
    if (presentPercent >= 90) {
        insights.push({icon: 'good', iconClass: 'fas fa-trophy', title: 'Excellent!', desc: `${presentPercent}% attendance. Great work!`});
    } else if (presentPercent >= 75) {
        insights.push({icon: 'warning', iconClass: 'fas fa-exclamation-triangle', title: 'Good', desc: `${presentPercent}%. Aim for 90%!`});
    } else {
        insights.push({icon: 'warning', iconClass: 'fas fa-chart-line', title: 'Alert', desc: `Only ${presentPercent}%. Improve attendance.`});
    }
    
    if (avgHours >= 8) {
        insights.push({icon: 'good', iconClass: 'fas fa-clock', title: 'Perfect Hours', desc: `Avg ${avgHours}h/day. Great!`});
    } else if (avgHours >= 6) {
        insights.push({icon: 'info', iconClass: 'fas fa-hourglass-half', title: 'Average', desc: `${avgHours}h/day. Standard is 8h.`});
    } else {
        insights.push({icon: 'warning', iconClass: 'fas fa-user-clock', title: 'Low Hours', desc: `Only ${avgHours}h/day. Check timings.`});
    }
    
    if (absent === 0 && halfDay === 0) {
        insights.push({icon: 'good', iconClass: 'fas fa-calendar-check', title: 'Perfect!', desc: 'No absences or half days!'});
    } else {
        insights.push({icon: 'info', iconClass: 'fas fa-calendar-day', title: 'Record', desc: `${absent} absent, ${halfDay} half days.`});
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

async function exportData() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', currentUser.id)
        .gte('date', startDate)
        .lte('date', endDate);
    
    if (error || !data) return;
    
    let csv = 'Date,Status,Check In,Check Out,Duration (hours)\n';
    
    data.forEach(record => {
        const status = getStatus(record);
        const duration = record.duration_minutes ? (record.duration_minutes / 60).toFixed(2) : '0';
        csv += `${record.date},${status},${record.check_in || '-'},${record.check_out || '-'},${duration}\n`;
    });
    
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${getMonthName(month)}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}