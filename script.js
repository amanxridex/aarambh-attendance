// script.js

// State management
let isCheckedIn = false;
let checkInTime = null;
let stream = null;
let capturedImageData = null;
let currentLocation = null;

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
    
    // Update camera timestamp if modal is open
    const timestampEl = document.getElementById('camera-timestamp');
    if (timestampEl && document.getElementById('selfie-modal').classList.contains('show')) {
        const seconds = String(now.getSeconds()).padStart(2, '0');
        timestampEl.textContent = `${hours}:${minutes}:${seconds}`;
    }
}

// Handle action card clicks
function handleAction(action) {
    switch(action) {
        case 'check-in':
            if (isCheckedIn) {
                showToast('You are already checked in!');
                return;
            }
            openSelfieModal();
            break;
        case 'check-out':
            performCheckOut();
            break;
        case 'history':
            window.location.href = 'history.html';
            break;
        case 'stats':
            window.location.href = 'statistics.html';
            break;
    }
}

// Open Selfie Modal
function openSelfieModal() {
    const modal = document.getElementById('selfie-modal');
    modal.classList.add('show');
    
    // Reset state
    capturedImageData = null;
    document.getElementById('camera-video').style.display = 'block';
    document.getElementById('captured-image').style.display = 'none';
    document.getElementById('camera-controls').style.display = 'flex';
    document.getElementById('preview-controls').style.display = 'none';
    document.querySelector('.camera-frame').classList.remove('captured');
    
    // Start camera
    startCamera();
    
    // Get location
    getLocation();
}

// Close Selfie Modal
function closeSelfieModal() {
    const modal = document.getElementById('selfie-modal');
    modal.classList.remove('show');
    
    // Stop camera
    stopCamera();
}

// Start Camera
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        
        const video = document.getElementById('camera-video');
        video.srcObject = stream;
        
        // Update timestamp every second
        window.cameraInterval = setInterval(() => {
            updateDateTime();
        }, 1000);
        
    } catch (err) {
        console.error('Camera error:', err);
        showToast('Unable to access camera. Please allow camera permissions.');
    }
}

// Stop Camera
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    if (window.cameraInterval) {
        clearInterval(window.cameraInterval);
    }
}

// Get Location
function getLocation() {
    const locationEl = document.getElementById('location-info');
    locationEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Fetching location...</span>';
    
    if (!navigator.geolocation) {
        locationEl.innerHTML = '<i class="fas fa-times"></i><span>Location not supported</span>';
        locationEl.classList.add('error');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            locationEl.innerHTML = '<i class="fas fa-check-circle"></i><span>Location captured</span>';
            locationEl.classList.add('success');
        },
        (error) => {
            locationEl.innerHTML = '<i class="fas fa-times"></i><span>Location denied</span>';
            locationEl.classList.add('error');
            currentLocation = null;
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

// Capture Selfie
function captureSelfie() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const capturedImg = document.getElementById('captured-image');
    
    // Flash effect
    const flash = document.createElement('div');
    flash.className = 'flash-effect active';
    document.querySelector('.camera-frame').appendChild(flash);
    setTimeout(() => flash.remove(), 300);
    
    // Capture to canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Flip horizontally (mirror effect)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    
    // Get image data
    capturedImageData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Show captured image
    capturedImg.src = capturedImageData;
    video.style.display = 'none';
    capturedImg.style.display = 'block';
    
    // Update UI
    document.getElementById('camera-controls').style.display = 'none';
    document.getElementById('preview-controls').style.display = 'flex';
    document.querySelector('.camera-frame').classList.add('captured');
    
    // Stop camera to save battery
    stopCamera();
}

// Retake Selfie
function retakeSelfie() {
    capturedImageData = null;
    document.getElementById('camera-video').style.display = 'block';
    document.getElementById('captured-image').style.display = 'none';
    document.getElementById('camera-controls').style.display = 'flex';
    document.getElementById('preview-controls').style.display = 'none';
    document.querySelector('.camera-frame').classList.remove('captured');
    
    startCamera();
}

// Submit Check In
function submitCheckIn() {
    if (!capturedImageData) {
        showToast('Please capture a selfie first!');
        return;
    }
    
    // Save check in data
    isCheckedIn = true;
    checkInTime = new Date();
    
    const checkInData = {
        isCheckedIn: true,
        checkInTime: checkInTime.toISOString(),
        selfie: capturedImageData,
        location: currentLocation,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('attendance_status', JSON.stringify(checkInData));
    
    // Save to history
    const records = JSON.parse(localStorage.getItem('attendance_records') || '[]');
    records.push({
        date: new Date().toISOString().split('T')[0],
        checkIn: checkInTime.toISOString(),
        checkOut: null,
        duration: 0,
        selfie: capturedImageData,
        location: currentLocation
    });
    localStorage.setItem('attendance_records', JSON.stringify(records));
    
    // Update UI
    const badge = document.getElementById('status-badge');
    badge.textContent = 'Checked In';
    badge.classList.add('active');
    
    closeSelfieModal();
    showToast('Successfully checked in with selfie!');
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
    
    // Update last record with check out
    const records = JSON.parse(localStorage.getItem('attendance_records') || '[]');
    if (records.length > 0) {
        const lastRecord = records[records.length - 1];
        if (!lastRecord.checkOut) {
            lastRecord.checkOut = checkOutTime.toISOString();
            lastRecord.duration = duration;
        }
        localStorage.setItem('attendance_records', JSON.stringify(records));
    }
    
    localStorage.removeItem('attendance_status');
    
    showToast(`Checked out! Duration: ${duration} mins`);
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

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeSelfieModal();
    }
});