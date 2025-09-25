const supabaseUrl = 'https://lgustmkqrzgkyesyfizh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxndXN0bWtxcnpna3llc3lmaXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NTUxNDgsImV4cCI6MjA3NDAzMTE0OH0.EC_holDfG0UvhRgQl0Kj6CYeTLZpIWtXZqXeGVmFW00';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// --- Helper Functions ---
function updateElementText(selector, text) {
    const element = document.querySelector(selector);
    if (element) {
        element.textContent = text;
    } else {
        console.error(`Element not found for selector: ${selector}`);
    }
}

function updateElementHTML(selector, html) {
    const element = document.getElementById(selector);
    if (element) {
        element.innerHTML = html;
    } else {
        console.error(`Element not found for id: #${selector}`);
    }
}

// --- Main Logic ---
async function loadDashboard() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    const [profileResponse, conversationCount] = await Promise.all([
        supabaseClient.from('Profiles').select('*').eq('id', session.user.id).single(),
        fetchConversationCount(session.user.id)
    ]);

    const { data: profile } = profileResponse;
    if (profile) {
        updateDashboardUI(profile, conversationCount);
    } else {
        alert('Could not fetch your profile.');
    }
}

async function fetchConversationCount(userId) {
    const { count, error } = await supabaseClient
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
    return error ? 0 : count;
}

function updateDashboardUI(profile, conversationCount) {
    updateElementText('.welcome-header h1', `Welcome back, ${profile.username || 'User'}`);
    
    const levelData = calculateLevel(profile.words_learned || 0);
    updateElementText('.progress-info span:first-child', `Level ${levelData.level}`);
    updateElementText('.progress-info span:last-child', `${levelData.percentage}%`);
    document.querySelector('.progress-bar-fill').style.width = `${levelData.percentage}%`;
    updateElementHTML('progress-note', `${levelData.wordsToNext} words to next level`);

    updateElementHTML('recent-convos-stat', conversationCount);
    updateElementHTML('words-learned-stat', profile.words_learned || 0);
    updateElementHTML('streak-stat', `${profile.conversation_streak || 0} <span class="stat-unit">days</span>`);

    const navActions = document.querySelector('.nav-actions');
    if (navActions) {
        navActions.innerHTML = `<button class="icon-button" aria-label="Notifications">🔔</button> <img src="${profile.avatar_url || 'https://i.pravatar.cc/40'}" alt="User Avatar" class="avatar"> <button id="settings-btn" class="icon-button" aria-label="Settings">⚙️</button> <button id="logout-button" class="btn btn-secondary">Logout</button>`;
    }
}

function calculateLevel(wordsLearned) {
    const thresholds = [0, 50, 150, 300, 500, 800, 1200];
    let currentLevel = 0;
    for (let i = thresholds.length - 1; i >= 0; i--) {
        if (wordsLearned >= thresholds[i]) {
            currentLevel = i;
            break;
        }
    }
    const currentLevelWords = thresholds[currentLevel];
    const nextLevelWords = thresholds[currentLevel + 1] || currentLevelWords;
    const wordsForNextLevel = nextLevelWords - currentLevelWords;
    const wordsProgressed = wordsLearned - currentLevelWords;
    const percentage = (wordsForNextLevel > 0) ? Math.floor((wordsProgressed / wordsForNextLevel) * 100) : 100;
    return { level: currentLevel, wordsToNext: nextLevelWords - wordsLearned, percentage: percentage };
}

// --- Event Listeners ---
document.addEventListener('click', async (event) => {
    // Logout Button
    if (event.target.id === 'logout-button') {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    }
    // Start Conversation Button
    if (event.target.closest('#start-conversation-btn')) {
        window.location.href = 'conversation.html';
    }
    // NEW: Settings Button
    if (event.target.id === 'settings-btn') {
        window.location.href = 'settings.html';
    }
});

document.addEventListener('DOMContentLoaded', loadDashboard);