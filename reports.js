const supabase = window.supabaseClient;

let employees = [];
let allAttendanceRaw = [];
let currentFilter = 'week';
let dateStartStr = '';
let dateEndStr = '';
let chartsData = { trends: null, dept: null };

document.addEventListener('DOMContentLoaded', () => {
    // Set default dark mode styles globally for Chart.js
    Chart.defaults.color = '#888888';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
    Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

    checkAuth();
});

async function checkAuth() {
    const session = localStorage.getItem('aarambh_session') || sessionStorage.getItem('aarambh_session');
    if (!session) {
        window.location.replace('auth.html');
        return;
    }
    const data = JSON.parse(session);
    if (data.role !== 'management') {
        window.location.replace('index.html');
        return;
    }

    setDateRange('week'); // Init default data range
}

async function loadOrganizationData() {
    try {
        // Fetch Employees
        const { data: emps, error: err1 } = await supabase
            .from('employees')
            .select('*');
        if (err1) throw err1;
        employees = emps || [];

        // Fetch Attendance for the given Date Range
        const { data: att, error: err2 } = await supabase
            .from('attendance')
            .select('*')
            .gte('date', dateStartStr)
            .lte('date', dateEndStr)
            .order('date', { ascending: true });
        if (err2) throw err2;
        allAttendanceRaw = att || [];

        processAnalytics();
    } catch (e) {
        console.error(e);
        showToast('Failed to load analytics data', 'error');
    }
}

function processAnalytics() {
    // Show skeleton loaders in KPIs momentarily
    document.getElementById('kpi-total-emps').innerHTML = '<div class="skeleton-text short"></div>';
    document.getElementById('kpi-avg-presence').innerHTML = '<div class="skeleton-text short"></div>';
    document.getElementById('kpi-avg-hours').innerHTML = '<div class="skeleton-text short"></div>';

    // 1. Resolve Work Days array in range
    const startObj = new Date(dateStartStr);
    const endObj = new Date(dateEndStr);
    const dateKeys = [];

    // Safety limit 90 days max for array to avoid blowing up memory if custom range is massive
    let curr = new Date(startObj);
    let limit = 0;
    while (curr <= endObj && limit < 90) {
        const key = curr.toISOString().split('T')[0];
        // We do include weekends here so it's a true visualization of the system usage
        dateKeys.push(key);
        curr.setDate(curr.getDate() + 1);
        limit++;
    }

    // KPI Math Data
    let cumulativePresenceCount = 0;
    let cumulativeAbsenceCount = 0;
    let totalCompanyHours = 0;

    // Arrays for Line Chart
    const trendLabels = [];
    const trendPresent = [];
    const trendAbsent = [];

    // Array for Dept Chart
    const deptRollup = {};
    employees.forEach(e => {
        if (!deptRollup[e.department]) deptRollup[e.department] = { present: 0, possible: 0 };
    });

    // Leaderboard dictionary
    const punctuality = {};
    employees.forEach(e => {
        punctuality[e.id] = { name: e.name, avatar: e.profile_image, hours: 0, fullDays: 0 };
    });

    // Crunch numbers day by day
    dateKeys.forEach(dateStr => {
        const recordsOnDay = allAttendanceRaw.filter(a => a.date === dateStr);
        let presentToday = 0;
        let absentToday = employees.length - recordsOnDay.length; // Approximate baseline; not everyone is scheduled though

        recordsOnDay.forEach(r => {
            const emp = employees.find(e => e.id === r.employee_id);
            if (!emp) return;

            deptRollup[emp.department].possible += 1;

            // Just basic presence check
            if (r.check_in) {
                presentToday++;
                cumulativePresenceCount++;
                deptRollup[emp.department].present += 1;

                const hrs = (r.duration_minutes || 0) / 60;
                totalCompanyHours += hrs;

                punctuality[emp.id].hours += hrs;
                if (r.duration_minutes >= 240) punctuality[emp.id].fullDays++;
            }
        });

        // Exact absent formula: The entire company count minus people who checked in
        absentToday = employees.length - presentToday;
        cumulativeAbsenceCount += absentToday;

        // Formatter for tight chart labels "Feb 15"
        const dObj = new Date(dateStr);
        trendLabels.push(dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        trendPresent.push(presentToday);
        trendAbsent.push(absentToday);
    });

    // 2. Render KPIs
    document.getElementById('kpi-total-emps').textContent = employees.length;

    const possibleTotalShifts = cumulativePresenceCount + cumulativeAbsenceCount;
    const avgRate = possibleTotalShifts > 0 ? Math.round((cumulativePresenceCount / possibleTotalShifts) * 100) : 0;
    document.getElementById('kpi-avg-presence').textContent = `${avgRate}%`;

    const overallAvgHours = cumulativePresenceCount > 0 ? (totalCompanyHours / cumulativePresenceCount).toFixed(1) : "0";
    document.getElementById('kpi-avg-hours').textContent = `${overallAvgHours}h`;

    // 3. Render Trend Chart
    renderTrendChart(trendLabels, trendPresent, trendAbsent);

    // 4. Render Dept Chart (Calculating average % per dept)
    const deptLabels = [];
    const deptData = [];
    Object.keys(deptRollup).forEach(deptKey => {
        const d = deptRollup[deptKey];
        deptLabels.push(deptKey || 'Unknown');
        if (d.possible > 0) {
            deptData.push(Math.round((d.present / d.possible) * 100)); // Win rate
        } else {
            deptData.push(0);
        }
    });
    renderDeptChart(deptLabels, deptData);

    // 5. Render Punctuality Leaderboard
    const leaders = Object.values(punctuality)
        .sort((a, b) => b.fullDays - a.fullDays || b.hours - a.hours)
        .slice(0, 3); // Top 3

    const lbHtml = leaders.map((L, index) => {
        return `
            <div class="leader-card">
                <span class="leader-rank">#${index + 1}</span>
                <img class="leader-avatar" src="${L.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(L.name)}&background=random&color=fff&size=50`}">
                <div class="leader-info">
                    <span class="leader-name">${L.name}</span>
                    <span class="leader-score">${L.fullDays} Full Days • ${Math.round(L.hours)}h total</span>
                </div>
            </div>
        `;
    }).join("");

    document.getElementById('leaderboard').innerHTML = lbHtml || "<span style='font-size:12px;color:gray'>No data</span>";
}

// ==== HTML Handlers & Date Ranges ==== 
function setDateRange(rangeType, evt) {
    document.querySelectorAll('.date-tab').forEach(t => t.classList.remove('active'));

    if (evt && evt.target) {
        evt.target.classList.add('active');
    } else {
        // Fallback for programmatic calls
        const tabs = document.querySelectorAll('.date-tab');
        if (rangeType === 'week' && tabs.length > 0) tabs[0].classList.add('active');
        else if (rangeType === 'month' && tabs.length > 1) tabs[1].classList.add('active');
    }

    const today = new Date();
    dateEndStr = today.toISOString().split('T')[0];

    if (rangeType === 'week') {
        const lw = new Date();
        lw.setDate(lw.getDate() - 6);
        dateStartStr = lw.toISOString().split('T')[0];
        document.getElementById('current-range-display').textContent = `Last 7 Days (${dateStartStr} to ${dateEndStr})`;

    } else if (rangeType === 'month') {
        dateStartStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        document.getElementById('current-range-display').textContent = `This Month (${dateStartStr} to ${dateEndStr})`;
    }

    loadOrganizationData();
}

function openCustomDateModal() {
    document.getElementById('date-start').value = dateStartStr;
    document.getElementById('date-end').value = dateEndStr;
    document.getElementById('date-modal').classList.add('show');
}
function closeCustomDateModal() {
    document.getElementById('date-modal').classList.remove('show');
}

function applyCustomDate() {
    const s = document.getElementById('date-start').value;
    const e = document.getElementById('date-end').value;
    if (!s || !e) {
        showToast("Both dates required", "error");
        return;
    }
    dateStartStr = s;
    dateEndStr = e;

    document.querySelectorAll('.date-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('current-range-display').textContent = `Custom: ${dateStartStr} to ${dateEndStr}`;
    closeCustomDateModal();
    loadOrganizationData();
}


// ==== Chart Renders ====

function renderTrendChart(labels, presentData, absentData) {
    const ctx = document.getElementById('trendsChart').getContext('2d');

    if (chartsData.trends) chartsData.trends.destroy();

    chartsData.trends = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Present',
                    data: presentData,
                    backgroundColor: 'rgba(0, 208, 132, 0.8)',
                    borderRadius: 4,
                },
                {
                    label: 'Absent',
                    data: absentData,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true }
            },
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } }
            }
        }
    });
}

function renderDeptChart(labels, dataArr) {
    const ctx = document.getElementById('deptChart').getContext('2d');

    if (chartsData.dept) chartsData.dept.destroy();

    chartsData.dept = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataArr,
                backgroundColor: [
                    '#3b82f6', // Blue
                    '#8b5cf6', // Purple
                    '#00d084', // Green
                    '#f59e0b', // Orange
                    '#ef4444'  // Red
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, font: { size: 10 } } }
            }
        }
    });
}


// Export
function exportMasterReport() {
    if (allAttendanceRaw.length === 0) {
        showToast("No data to export", "error");
        return;
    }

    let csv = "Date,Employee ID,Employee Name,Department,Check In,Check Out,Total Hours\n";
    allAttendanceRaw.forEach(r => {
        const emp = employees.find(e => e.id === r.employee_id);
        const name = emp ? emp.name : "Unknown";
        const dpt = emp ? emp.department : "Unknown";
        const empCode = emp ? emp.emp_id : "Unknown";

        const ci = r.check_in ? new Date(r.check_in).toLocaleTimeString() : "-";
        const co = r.check_out ? new Date(r.check_out).toLocaleTimeString() : "-";
        const hrs = r.duration_minutes ? (r.duration_minutes / 60).toFixed(2) : "0";

        csv += `${r.date},${empCode},${name},${dpt},${ci},${co},${hrs}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Organization_Attendance_Report_${dateStartStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Report exported successfully!");
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}
