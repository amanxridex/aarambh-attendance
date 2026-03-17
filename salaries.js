const supabase = window.supabaseClient;

let employees = [];
let salaries = [];
let attendanceData = {};
let currentDate = new Date();
let currentEmpId = null;
let currentSalaryData = null;

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
    await loadData();
}

async function loadData() {
    await loadEmployees();
    await loadSalaries();
    await loadAttendance();
    calculateAllSalaries();
    renderSalaries();
    updateStats();
}

async function loadEmployees() {
    try {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .order('name');

        if (error) throw error;
        employees = data || [];
    } catch (error) {
        showToast('Failed to load employees', 'error');
    }
}

async function loadSalaries() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    try {
        const { data, error } = await supabase
            .from('salaries')
            .select('*')
            .eq('month', monthKey);

        if (error) throw error;
        salaries = data || [];
    } catch (error) {
        // Table might not exist, continue with empty
        salaries = [];
    }
}

async function loadAttendance() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;

    try {
        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate);

        if (error) throw error;

        attendanceData = {};
        data?.forEach(record => {
            if (!attendanceData[record.employee_id]) {
                attendanceData[record.employee_id] = [];
            }
            attendanceData[record.employee_id].push(record);
        });
    } catch (error) {
        attendanceData = {};
    }
}

function calculateAllSalaries() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    employees.forEach(emp => {
        let salaryRecord = salaries.find(s => s.employee_id === emp.id && s.month === monthKey);

        if (!salaryRecord) {
            // Create default salary record
            salaryRecord = {
                employee_id: emp.id,
                month: monthKey,
                base_salary: emp.base_salary || 0,
                daily_wage: 0,
                hourly_rate: 0,
                full_days: 0,
                half_days: 0,
                absent_days: 0,
                overtime_hours: 0,
                bonus: 0,
                advance_taken: 0,
                deductions: 0,
                earned_amount: 0,
                net_payable: 0,
                paid_amount: 0,
                status: 'pending',
                created_at: new Date().toISOString()
            };
            salaries.push(salaryRecord);
        }

        // Calculate from attendance
        const empAttendance = attendanceData[emp.id] || [];
        let fullDays = 0, halfDays = 0, absentDays = 0, totalHours = 0;

        empAttendance.forEach(record => {
            if (record.check_in) {
                const duration = record.duration_minutes || 0;
                const hours = duration / 60;
                totalHours += hours;

                if (duration >= 240) fullDays++;
                else halfDays++;
            } else {
                absentDays++;
            }
        });

        // Calculate amounts
        const baseSalary = salaryRecord.base_salary || 0;
        const dailyWage = baseSalary / 30;
        const hourlyRate = dailyWage / 8;

        const fullDayPay = fullDays * dailyWage;
        const halfDayPay = halfDays * (dailyWage * 0.5);
        const overtimePay = Math.max(0, (totalHours - (fullDays * 8 + halfDays * 4))) * hourlyRate * 1.5;

        const earnedAmount = fullDayPay + halfDayPay + overtimePay;
        const netPayable = earnedAmount + (salaryRecord.bonus || 0) - (salaryRecord.advance_taken || 0) - (salaryRecord.deductions || 0);

        // Update record
        salaryRecord.daily_wage = Math.round(dailyWage);
        salaryRecord.hourly_rate = Math.round(hourlyRate);
        salaryRecord.full_days = fullDays;
        salaryRecord.half_days = halfDays;
        salaryRecord.absent_days = absentDays;
        salaryRecord.overtime_hours = Math.round((totalHours - (fullDays * 8 + halfDays * 4)) * 10) / 10;
        salaryRecord.earned_amount = Math.round(earnedAmount);
        salaryRecord.net_payable = Math.round(netPayable);

        // Determine status
        if (salaryRecord.paid_amount >= netPayable) {
            salaryRecord.status = 'paid';
        } else if (salaryRecord.paid_amount > 0) {
            salaryRecord.status = 'partial';
        } else {
            salaryRecord.status = 'pending';
        }
    });
}

function renderSalaries(filtered = null) {
    const list = document.getElementById('salaries-list');
    const statusFilter = document.getElementById('status-filter').value;
    const searchQuery = document.getElementById('search-emp').value.toLowerCase();

    let displaySalaries = filtered || salaries;

    // Apply filters
    if (statusFilter !== 'all') {
        displaySalaries = displaySalaries.filter(s => s.status === statusFilter);
    }

    if (searchQuery) {
        displaySalaries = displaySalaries.filter(s => {
            const emp = employees.find(e => e.id === s.employee_id);
            return emp && (emp.name.toLowerCase().includes(searchQuery) ||
                emp.emp_id.toLowerCase().includes(searchQuery));
        });
    }

    // Add Skeletons before loading
    list.innerHTML = Array(5).fill(`
        <div class="salary-card skeleton" style="border:none;">
            <div class="salary-header">
                <div class="skeleton-avatar"></div>
                <div style="flex:1;">
                    <div class="skeleton-text short"></div>
                    <div class="skeleton-text title"></div>
                </div>
            </div>
        </div>
    `).join('');

    list.innerHTML = displaySalaries.map(sal => {
        const emp = employees.find(e => e.id === sal.employee_id);
        if (!emp) return '';

        const progress = sal.net_payable > 0 ? (sal.paid_amount / sal.net_payable) * 100 : 0;

        return `
            <div class="salary-card ${sal.status}" onclick="openSalaryModal('${sal.employee_id}')">
                <div class="salary-header">
                    <div class="emp-info-sal">
                        <div class="emp-avatar-sal">
                            <img src="${emp.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random&color=fff&size=100`}" alt="${emp.name}">
                        </div>
                        <div class="emp-details-sal">
                            <h4>${emp.name}</h4>
                            <span>${emp.emp_id} • ${emp.department}</span>
                        </div>
                    </div>
                    <span class="status-badge ${sal.status}">${sal.status}</span>
                </div>
                
                <div class="salary-amounts">
                    <div class="amount-box earned">
                        <label>Earned</label>
                        <span class="value">₹${formatNumber(sal.earned_amount)}</span>
                    </div>
                    <div class="amount-box advance">
                        <label>Advance</label>
                        <span class="value">₹${formatNumber(sal.advance_taken)}</span>
                    </div>
                    <div class="amount-box net">
                        <label>Net Pay</label>
                        <span class="value">₹${formatNumber(sal.net_payable)}</span>
                    </div>
                </div>
                
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                
                <div class="salary-meta">
                    <span><i class="fas fa-calendar-check"></i> ${sal.full_days} Full • ${sal.half_days} Half</span>
                    <span><i class="fas fa-rupee-sign"></i> Paid: ₹${formatNumber(sal.paid_amount)}</span>
                </div>
            </div>
        `;
    }).join('');
}

function formatNumber(num) {
    return num.toLocaleString('en-IN');
}

function updateStats() {
    const totalPayroll = salaries.reduce((sum, s) => sum + s.net_payable, 0);
    const totalPaid = salaries.reduce((sum, s) => sum + s.paid_amount, 0);
    const totalPending = totalPayroll - totalPaid;

    document.getElementById('total-payroll').textContent = `₹${formatNumber(totalPayroll)}`;
    document.getElementById('total-paid').textContent = `₹${formatNumber(totalPaid)}`;
    document.getElementById('total-pending').textContent = `₹${formatNumber(totalPending)}`;

    const statusEl = document.getElementById('payroll-status');
    if (totalPending === 0) {
        statusEl.textContent = 'Completed';
        statusEl.className = 'payroll-status';
    } else {
        statusEl.textContent = 'Processing';
        statusEl.className = 'payroll-status pending';
    }
}

function filterSalaries() {
    renderSalaries();
}

function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    document.getElementById('current-month').textContent = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    loadData();
}

async function openSalaryModal(empId) {
    currentEmpId = empId;
    const emp = employees.find(e => e.id === empId);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    let salary = salaries.find(s => s.employee_id === empId && s.month === monthKey);

    if (!salary) {
        salary = {
            employee_id: empId,
            month: monthKey,
            base_salary: 0,
            daily_wage: 0,
            hourly_rate: 0,
            full_days: 0,
            half_days: 0,
            absent_days: 0,
            overtime_hours: 0,
            bonus: 0,
            advance_taken: 0,
            deductions: 0,
            earned_amount: 0,
            net_payable: 0
        };
    }

    currentSalaryData = salary;

    // Update UI
    document.getElementById('modal-avatar').src = emp.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random&color=fff&size=150`;
    document.getElementById('modal-name').textContent = emp.name;
    document.getElementById('modal-id').textContent = emp.emp_id;

    document.getElementById('base-salary').value = salary.base_salary || '';
    document.getElementById('daily-wage').value = salary.daily_wage || 0;
    document.getElementById('hourly-rate').value = salary.hourly_rate || 0;

    document.getElementById('att-full').textContent = salary.full_days;
    document.getElementById('att-half').textContent = salary.half_days;
    document.getElementById('att-absent').textContent = salary.absent_days;

    calculateTotals();
    loadPaymentHistory(empId);

    document.getElementById('salary-modal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function updateSalaryConfig() {
    const baseSalary = parseFloat(document.getElementById('base-salary').value) || 0;
    const dailyWage = Math.round(baseSalary / 30);
    const hourlyRate = Math.round(dailyWage / 8);

    document.getElementById('daily-wage').value = dailyWage;
    document.getElementById('hourly-rate').value = hourlyRate;

    // Recalculate
    if (currentSalaryData) {
        currentSalaryData.base_salary = baseSalary;
        currentSalaryData.daily_wage = dailyWage;
        currentSalaryData.hourly_rate = hourlyRate;

        const fullDayPay = currentSalaryData.full_days * dailyWage;
        const halfDayPay = currentSalaryData.half_days * (dailyWage * 0.5);
        currentSalaryData.earned_amount = Math.round(fullDayPay + halfDayPay);

        calculateTotals();
    }
}

function calculateTotals() {
    if (!currentSalaryData) return;

    const bonus = parseFloat(document.getElementById('bonus-input').value) || 0;
    const deductions = parseFloat(document.getElementById('deduction-input').value) || 0;

    currentSalaryData.bonus = bonus;
    currentSalaryData.deductions = deductions;

    const fullPay = currentSalaryData.full_days * currentSalaryData.daily_wage;
    const halfPay = currentSalaryData.half_days * (currentSalaryData.daily_wage * 0.5);
    const overtimePay = currentSalaryData.overtime_hours * currentSalaryData.hourly_rate * 1.5;

    const earned = fullPay + halfPay + overtimePay;
    const net = earned + bonus - currentSalaryData.advance_taken - deductions;

    currentSalaryData.earned_amount = Math.round(earned);
    currentSalaryData.net_payable = Math.round(net);

    // Update display
    document.getElementById('calc-full').textContent = `₹${formatNumber(Math.round(fullPay))}`;
    document.getElementById('calc-half').textContent = `₹${formatNumber(Math.round(halfPay))}`;
    document.getElementById('calc-overtime').textContent = `₹${formatNumber(Math.round(overtimePay))}`;
    document.getElementById('calc-advance').textContent = `₹${formatNumber(currentSalaryData.advance_taken)}`;
    document.getElementById('calc-net').textContent = `₹${formatNumber(currentSalaryData.net_payable)}`;
}

async function loadPaymentHistory(empId) {
    try {
        const { data } = await supabase
            .from('salary_payments')
            .select('*')
            .eq('employee_id', empId)
            .order('created_at', { ascending: false })
            .limit(5);

        const list = document.getElementById('payment-history-list');

        if (!data || data.length === 0) {
            list.innerHTML = '<div class="history-item"><span>No payment history</span></div>';
            return;
        }

        list.innerHTML = data.map(p => `
            <div class="history-item">
                <div class="history-info">
                    <span class="history-date">${new Date(p.created_at).toLocaleDateString()}</span>
                    <span class="history-type">${p.type === 'advance' ? 'Advance' : 'Salary Payment'}</span>
                </div>
                <span class="history-amount ${p.type === 'advance' ? 'negative' : ''}">
                    ${p.type === 'advance' ? '-' : '+'}₹${formatNumber(p.amount)}
                </span>
            </div>
        `).join('');
    } catch (error) {
        document.getElementById('payment-history-list').innerHTML = '<div class="history-item"><span>No payment history</span></div>';
    }
}

function recordAdvance() {
    document.getElementById('advance-amount').value = '';
    document.getElementById('advance-reason').value = '';
    document.getElementById('advance-modal').classList.add('show');
}

function closeAdvanceModal() {
    document.getElementById('advance-modal').classList.remove('show');
}

async function saveAdvance() {
    const amount = parseFloat(document.getElementById('advance-amount').value);
    const reason = document.getElementById('advance-reason').value;

    if (!amount || amount <= 0) {
        showToast('Please enter valid amount', 'error');
        return;
    }

    try {
        // Save payment record
        await supabase.from('salary_payments').insert([{
            employee_id: currentEmpId,
            amount: amount,
            type: 'advance',
            reason: reason,
            month: currentSalaryData.month,
            created_at: new Date().toISOString()
        }]);

        // Update salary record
        currentSalaryData.advance_taken += amount;

        await supabase.from('salaries').upsert([{
            ...currentSalaryData,
            updated_at: new Date().toISOString()
        }]);

        calculateTotals();
        closeAdvanceModal();
        showToast('Advance recorded successfully', 'success');
        loadData();
    } catch (error) {
        showToast('Failed to record advance', 'error');
    }
}

async function processPayment() {
    const remaining = currentSalaryData.net_payable - currentSalaryData.paid_amount;

    if (remaining <= 0) {
        showToast('Already fully paid', 'success');
        return;
    }

    if (!confirm(`Process payment of ₹${formatNumber(remaining)}?`)) return;

    try {
        // Save payment
        await supabase.from('salary_payments').insert([{
            employee_id: currentEmpId,
            amount: remaining,
            type: 'salary',
            month: currentSalaryData.month,
            created_at: new Date().toISOString()
        }]);

        // Update salary
        currentSalaryData.paid_amount += remaining;
        currentSalaryData.status = 'paid';
        currentSalaryData.paid_at = new Date().toISOString();

        await supabase.from('salaries').upsert([{
            ...currentSalaryData,
            updated_at: new Date().toISOString()
        }]);

        showToast('Payment processed successfully', 'success');
        closeModal();
        loadData();
    } catch (error) {
        showToast('Failed to process payment', 'error');
    }
}

function closeModal() {
    document.getElementById('salary-modal').classList.remove('show');
    document.body.style.overflow = '';
    currentEmpId = null;
    currentSalaryData = null;
}

// Bulk Update
function openBulkUpdate() {
    document.getElementById('bulk-dept').value = 'all';
    document.getElementById('bulk-salary').value = '';
    document.getElementById('bulk-modal').classList.add('show');
}

function closeBulkModal() {
    document.getElementById('bulk-modal').classList.remove('show');
}

async function applyBulkUpdate() {
    const dept = document.getElementById('bulk-dept').value;
    const salary = parseFloat(document.getElementById('bulk-salary').value);

    if (!salary || salary <= 0) {
        showToast('Please enter valid salary', 'error');
        return;
    }

    const targets = dept === 'all' ? employees : employees.filter(e => e.department === dept);

    try {
        for (const emp of targets) {
            await supabase.from('employees').update({ base_salary: salary }).eq('id', emp.id);
        }

        showToast(`Updated ${targets.length} employees`, 'success');
        closeBulkModal();
        loadData();
    } catch (error) {
        showToast('Failed to update', 'error');
    }
}

function exportSalaries() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    let csv = 'Employee ID,Name,Department,Base Salary,Daily Wage,Full Days,Half Days,Absent,Overtime Hours,Earned,Bonus,Advance,Deductions,Net Payable,Paid,Status\n';

    salaries.forEach(sal => {
        const emp = employees.find(e => e.id === sal.employee_id);
        if (!emp) return;

        csv += `${emp.emp_id},${emp.name},${emp.department},${sal.base_salary},${sal.daily_wage},${sal.full_days},${sal.half_days},${sal.absent_days},${sal.overtime_hours},${sal.earned_amount},${sal.bonus},${sal.advance_taken},${sal.deductions},${sal.net_payable},${sal.paid_amount},${sal.status}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salaries_${monthKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        closeAdvanceModal();
        closeBulkModal();
        closeModal();
    }
});