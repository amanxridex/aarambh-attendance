const supabase = window.supabaseClient;

// State management
let currentUser = null;
let todayRecord = null;
let canCheckIn = false;
let canCheckOut = false;
let stream = null;
let capturedImageData = null;
let currentLocation = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updateDateTime();
    setInterval(updateDateTime, 1000);
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
    
    // Load today's attendance status
    await loadTodayStatus();
}

// Load today's attendance from Supabase - MAIN LOGIC
async function loadTodayStatus() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('employee_id', currentUser.id)
            .eq('date', today)
            .maybeSingle();
        
        if (error) throw error;
        
        todayRecord = data;
        
        // LOGIC: Determine what user can do today
        if (!data) {
            // No record today - can check in
            canCheckIn = true;
            canCheckOut = false;
            updateStatusUI('Not Checked In', 'ready');
        } else if (data.check_in && !data.check_out) {
            // Checked in but not out - can check out
            canCheckIn = false;
            canCheckOut = true;
            updateStatusUI('Checked In', 'active');
        } else if (data.check_in && data.check_out) {
            // Both done - NOTHING allowed today
            canCheckIn = false;
            canCheckOut = false;
            updateStatusUI('Completed', 'completed');
        }
        
    } catch (error) {
        console.error('Error loading status:', error);
        showToast('Failed to load attendance status');
    }
}

function updateStatusUI(status, type) {
    const badge = document.getElementById('status-badge');
    badge.textContent = status;
    
    // Remove all classes
    badge.classList.remove('active', 'completed', 'ready');
    
    // Add appropriate class
    if (type === 'active') badge.classList.add('active');
    else if (type === 'completed') badge.classList.add('completed');
    else if (type === 'ready') badge.classList.add('ready');
}

// Update date and time
function updateDateTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('current-time').textContent = `${hours}:${minutes}`;
    
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', options);
    
    const timestampEl = document.getElementById('camera-timestamp');
    if (timestampEl && document.getElementById('selfie-modal').classList.contains('show')) {
        const seconds = String(now.getSeconds()).padStart(2, '0');
        timestampEl.textContent = `${hours}:${minutes}:${seconds}`;
    }
}

// Handle action card clicks - WITH PROPER VALIDATION
function handleAction(action) {
    switch(action) {
        case 'check-in':
            if (!canCheckIn) {
                if (todayRecord && todayRecord.check_out) {
                    showToast('You have completed attendance for today. Come back tomorrow!');
                } else if (todayRecord && todayRecord.check_in) {
                    showToast('You are already checked in! Please check out first.');
                } else {
                    showToast('Cannot check in at this time');
                }
                return;
            }
            openSelfieModal();
            break;
            
        case 'check-out':
            if (!canCheckOut) {
                if (todayRecord && todayRecord.check_out) {
                    showToast('You have already checked out for today!');
                } else if (!todayRecord) {
                    showToast('You need to check in first!');
                } else {
                    showToast('Cannot check out at this time');
                }
                return;
            }
            performCheckOut();
            break;
    }
}

// Open Selfie Modal
function openSelfieModal() {
    const modal = document.getElementById('selfie-modal');
    modal.classList.add('show');
    
    capturedImageData = null;
    document.getElementById('camera-video').style.display = 'block';
    document.getElementById('captured-image').style.display = 'none';
    document.getElementById('camera-controls').style.display = 'flex';
    document.getElementById('preview-controls').style.display = 'none';
    document.querySelector('.camera-frame').classList.remove('captured');
    
    startCamera();
    getLocation();
}

// Close Selfie Modal
function closeSelfieModal() {
    const modal = document.getElementById('selfie-modal');
    modal.classList.remove('show');
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
        
        window.cameraInterval = setInterval(() => {
            updateDateTime();
        }, 1000);
        
    } catch (err) {
        console.error('Camera error:', err);
        showToast('Unable to access camera. Please allow permissions.');
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
    
    const flash = document.createElement('div');
    flash.className = 'flash-effect active';
    document.querySelector('.camera-frame').appendChild(flash);
    setTimeout(() => flash.remove(), 300);
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    
    capturedImageData = canvas.toDataURL('image/jpeg', 0.8);
    
    capturedImg.src = capturedImageData;
    video.style.display = 'none';
    capturedImg.style.display = 'block';
    
    document.getElementById('camera-controls').style.display = 'none';
    document.getElementById('preview-controls').style.display = 'flex';
    document.querySelector('.camera-frame').classList.add('captured');
    
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

// Convert base64 to blob for upload
function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

// Submit Check In to Supabase
async function submitCheckIn() {
    if (!capturedImageData) {
        showToast('Please capture a selfie first!');
        return;
    }
    
    // Double check - prevent duplicate check-in
    if (!canCheckIn) {
        showToast('Check-in not allowed at this time');
        return;
    }
    
    const btn = document.getElementById('submit-btn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    
    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'block';
    
    try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        // Upload selfie to storage
        const fileName = `${currentUser.id}_${Date.now()}.jpg`;
        const filePath = `attendance_selfies/${today}/${fileName}`;
        
        const blob = dataURLtoBlob(capturedImageData);
        
        const { error: uploadError } = await supabase.storage
            .from('employee-assets')
            .upload(filePath, blob, {
                contentType: 'image/jpeg',
                cacheControl: '3600'
            });
        
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('employee-assets')
            .getPublicUrl(filePath);
        
        // Create attendance record
        const attendanceData = {
            employee_id: currentUser.id,
            date: today,
            check_in: now.toISOString(),
            status: 'present',
            selfie_url: publicUrl,
            location_lat: currentLocation?.lat || null,
            location_lng: currentLocation?.lng || null
        };
        
        const { data, error } = await supabase
            .from('attendance')
            .insert([attendanceData])
            .select()
            .single();
        
        if (error) throw error;
        
        // Update state
        todayRecord = data;
        canCheckIn = false;
        canCheckOut = true;
        
        updateStatusUI('Checked In', 'active');
        closeSelfieModal();
        showToast('Successfully checked in! Don\'t forget to check out.');
        
    } catch (error) {
        console.error('Check-in error:', error);
        showToast('Failed to check in: ' + error.message);
    } finally {
        btn.disabled = false;
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
    }
}

// Perform Check Out
async function performCheckOut() {
    if (!canCheckOut || !todayRecord) {
        showToast('Check-out not allowed at this time');
        return;
    }
    
    try {
        const now = new Date();
        const checkInTime = new Date(todayRecord.check_in);
        const durationMinutes = Math.round((now - checkInTime) / 1000 / 60);
        
        const { error } = await supabase
            .from('attendance')
            .update({
                check_out: now.toISOString(),
                duration_minutes: durationMinutes
            })
            .eq('id', todayRecord.id);
        
        if (error) throw error;
        
        // Update state - NOTHING allowed after check-out
        todayRecord.check_out = now.toISOString();
        canCheckIn = false;
        canCheckOut = false;
        
        updateStatusUI('Completed', 'completed');
        showToast(`Checked out! Duration: ${durationMinutes} mins. See you tomorrow!`);
        
    } catch (error) {
        console.error('Check-out error:', error);
        showToast('Failed to check out');
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