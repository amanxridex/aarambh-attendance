// script.js

// State management
let isCheckedIn = false;
let checkInTime = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    loadStatus();
});

// Update date and time
function updateDateTime() {
    const now = new Date();
    
    // Format time (HH:MM)
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('current-time').textContent = `${hours}:${minutes}`;
    
    // Format date (Month Day, Year)
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', options);
}

// Handle action card clicks
function handleAction(action) {
    switch(action) {
        case 'check-in':
            performCheckIn();
            break;
        case 'check-out':
            performCheckOut();
            break;
        case 'history':
            showToast('Opening attendance history...');
            break;
        case 'stats':
            showToast('Loading statistics...');
            break;
    }
}

// Check In functionality
function performCheckIn() {
    if (isCheckedIn) {
        showToast('You are already checked in!');
        return;
    }
    
    isCheckedIn = true;
    checkInTime = new Date();
    
    // Update UI
    const badge = document.getElementById('status-badge');
    badge.textContent = 'Checked In';
    badge.classList.add('active');
    
    // Save to localStorage
    localStorage.setItem('attendance_status', JSON.stringify({
        isCheckedIn: true,
        checkInTime: checkInTime.toISOString()
    }));
    
    showToast('Successfully checked in!');
    
    // Add ripple effect to card
    createRipple(event);
}

// Check Out functionality
function performCheckOut() {
    if (!isCheckedIn) {
        showToast('You need to check in first!');
        return;
    }
    
    const checkOutTime = new Date();
    const duration = Math.round((checkOutTime - new Date(checkInTime)) / 1000 / 60); // minutes
    
    isCheckedIn = false;
    checkInTime = null;
    
    // Update UI
    const badge = document.getElementById('status-badge');
    badge.textContent = 'Not Checked In';
    badge.classList.remove('active');
    
    // Save record and clear status
    saveAttendanceRecord(checkOutTime, duration);
    localStorage.removeItem('attendance_status');
    
    showToast(`Checked out! Duration: ${duration} mins`);
}

// Save attendance record to history
function saveAttendanceRecord(checkOutTime, duration) {
    const records = JSON.parse(localStorage.getItem('attendance_records') || '[]');
    records.push({
        date: new Date().toISOString(),
        checkIn: checkInTime.toISOString(),
        checkOut: checkOutTime.toISOString(),
        duration: duration
    });
    localStorage.setItem('attendance_records', JSON.stringify(records));
}

// Load status from localStorage
function loadStatus() {
    const saved = localStorage.getItem('attendance_status');
    if (saved) {
        const data = JSON.parse(saved);
        if (data.isCheckedIn) {
            isCheckedIn = true;
            checkInTime = new Date(data.checkInTime);
            
            const badge = document.getElementById('status-badge');
            badge.textContent = 'Checked In';
            badge.classList.add('active');
        }
    }
}

// Show toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Create ripple effect on click
function createRipple(event) {
    const card = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = card.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
    `;
    
    card.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
}

// Add ripple animation to styles dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Add click event listeners to cards for ripple effect
document.querySelectorAll('.action-card').forEach(card => {
    card.addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const ripple = document.createElement('span');
        ripple.style.cssText = `
            position: absolute;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            pointer-events: none;
            width: 20px;
            height: 20px;
            left: ${x - 10}px;
            top: ${y - 10}px;
            animation: rippleEffect 0.6s ease-out;
        `;
        
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });
});

// Add ripple keyframes
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    @keyframes rippleEffect {
        to {
            transform: scale(20);
            opacity: 0;
        }
    }
`;
document.head.appendChild(rippleStyle);