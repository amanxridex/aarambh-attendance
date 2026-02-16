// supabase.js - Include this in all HTML files

const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';

// Initialize Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper functions
async function getCurrentUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
}

async function getSession() {
    const session = localStorage.getItem('aarambh_session') || sessionStorage.getItem('aarambh_session');
    return session ? JSON.parse(session) : null;
}

async function requireAuth() {
    const session = await getSession();
    if (!session) {
        window.location.href = 'auth.html';
        return null;
    }
    return session;
}

// Check if user is management
function isManagement(session) {
    return session?.role === 'management';
}

// Export for use in other scripts
window.supabaseClient = supabaseClient;
window.getCurrentUser = getCurrentUser;
window.getSession = getSession;
window.requireAuth = requireAuth;
window.isManagement = isManagement;