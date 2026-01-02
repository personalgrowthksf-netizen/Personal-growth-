/**
 * Personal Growth & Career OS - Core Logic
 * Fixes: Shared Secret Code, User Session Persistence, Resume Flow.
 */

const CONFIG = {
    STORAGE_KEYS: {
        ADMIN_CONFIG: 'pgos_admin_config', // Shared code and settings
        SESSIONS: 'pgos_user_sessions',    // Map of userId -> session data
        ACTIVE_USER: 'pgos_active_user_id' // Current logged-in user ID
    },
    ADMIN_PASSWORD: 'admin123',
    ADMIN_TRIGGER: '786786'
};

// --- SAFE STORAGE WRAPPER ---
const Storage = {
    get: (key) => {
        try {
            const data = localStorage.getItem(key);
            if (!data) return null;
            return JSON.parse(data);
        } catch (e) {
            console.error("Storage Error:", e);
            return null;
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error("Storage Save Error:", e);
        }
    },
    remove: (key) => localStorage.removeItem(key)
};

// --- CORE UTILS ---
const getAdminConfig = () => Storage.get(CONFIG.STORAGE_KEYS.ADMIN_CONFIG) || { sharedCode: 'KSF-2026-FEST' };
const saveAdminConfig = (cfg) => Storage.set(CONFIG.STORAGE_KEYS.ADMIN_CONFIG, cfg);

const getAllSessions = () => Storage.get(CONFIG.STORAGE_KEYS.SESSIONS) || {};
const saveAllSessions = (sessions) => Storage.set(CONFIG.STORAGE_KEYS.SESSIONS, sessions);

const getActiveUserId = () => Storage.get(CONFIG.STORAGE_KEYS.ACTIVE_USER);
const setActiveUserId = (id) => Storage.set(CONFIG.STORAGE_KEYS.ACTIVE_USER, id);

const getSession = (id) => {
    const sessions = getAllSessions();
    return sessions[id] || null;
};

const updateSession = (id, data) => {
    const sessions = getAllSessions();
    sessions[id] = { ...(sessions[id] || {}), ...data, updatedAt: new Date().toISOString() };
    saveAllSessions(sessions);
};

// --- APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    
    // Global Keyboard Listener (Secret Admin Access)
    let buffer = "";
    document.addEventListener('keydown', (e) => {
        buffer = (buffer + e.key).slice(-10);
        if (buffer.endsWith(CONFIG.ADMIN_TRIGGER)) {
            const admin = document.getElementById('adminAccess');
            if (admin) {
                admin.classList.remove('hidden');
                document.getElementById('mainContent')?.classList.add('hidden');
                initAdmin();
            }
        }
    });

    // Page Specific Initialization
    if (path.includes('questions.html')) initQuestions();
    else if (path.includes('result.html')) initResult();
    else initIndex();
});

// --- 1) INDEX LOGIC (Shared Code & User ID) ---
function initIndex() {
    const form = document.getElementById('loginForm');
    const codeInput = document.getElementById('accessCode');
    const nameInput = document.getElementById('userName'); // NEW: Ask name for identification
    const error = document.getElementById('loginError');
    const loginView = document.getElementById('loginView');
    const resumeView = document.getElementById('resumeView');
    const verifiedView = document.getElementById('accessVerifiedView');
    
    if (!form) return;

    // Check for existing session on load
    const activeId = getActiveUserId();
    if (activeId) {
        const session = getSession(activeId);
        if (session) {
            showResumeView(session);
        }
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = codeInput.value.trim().toUpperCase();
        const name = nameInput?.value.trim();
        const config = getAdminConfig();

        if (code !== config.sharedCode.toUpperCase()) {
            return showError("Invalid access code.");
        }

        if (!name) {
            return showError("Please enter your name to continue.");
        }

        // Identify or Create User
        const userId = name.toLowerCase().replace(/\s+/g, '_');
        const existing = getSession(userId);

        setActiveUserId(userId);

        if (existing) {
            showResumeView(existing);
        } else {
            updateSession(userId, { name, code, answers: {}, lastStep: 'index' });
            loginView.classList.add('hidden');
            verifiedView.classList.remove('hidden');
        }
    });

    document.getElementById('startAssessmentBtn')?.addEventListener('click', () => {
        window.location.href = 'questions.html';
    });

    document.getElementById('resumeBtn')?.addEventListener('click', () => {
        const session = getSession(getActiveUserId());
        if (session?.lastStep === 'result') window.location.href = 'result.html';
        else window.location.href = 'questions.html';
    });

    document.getElementById('startFreshBtn')?.addEventListener('click', () => {
        const id = getActiveUserId();
        const session = getSession(id);
        updateSession(id, { answers: {}, lastStep: 'index' });
        resumeView.classList.add('hidden');
        verifiedView.classList.remove('hidden');
    });

    function showResumeView(session) {
        loginView.classList.add('hidden');
        if (resumeView) {
            document.getElementById('resumeName').textContent = session.name;
            resumeView.classList.remove('hidden');
        }
    }

    function showError(msg) {
        if (error) {
            error.textContent = msg;
            error.classList.remove('hidden');
        }
    }
}

// --- 2) QUESTIONS LOGIC (Persistence after each step) ---
function initQuestions() {
    const userId = getActiveUserId();
    const session = getSession(userId);
    if (!session) return window.location.href = 'index.html';

    const questions = [
        { id: 'status', label: 'What is your current status?', type: 'select', options: ['Student', 'Job Seeker', 'Working Professional', 'Founder'] },
        { id: 'goal', label: 'What is your primary goal?', type: 'select', options: ['Get a Job', 'Build a Startup', 'Learn a New Skill', 'Not Sure Yet'] },
        { id: 'risk', label: 'Your risk appetite?', type: 'select', options: ['Low (Prefer Stability)', 'Medium (Calculated Risks)', 'High (All In)'] },
        { id: 'skill', label: 'Current skill level?', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'] },
        { id: 'challenge', label: 'Biggest challenge right now?', type: 'textarea' }
    ];

    // Find first unanswered question
    let currentIdx = 0;
    for (let i = 0; i < questions.length; i++) {
        if (session.answers[questions[i].id]) {
            currentIdx = i + 1;
        } else {
            currentIdx = i;
            break;
        }
    }

    const intro = document.getElementById('questionIntroView');
    const flow = document.getElementById('questionFlow');
    const qLabel = document.getElementById('qLabel');
    const qInputContainer = document.getElementById('qInputContainer');
    const nextBtn = document.getElementById('nextQBtn');
    const progressFill = document.getElementById('progressFill');

    // If already started, skip intro
    if (currentIdx > 0) {
        intro?.classList.add('hidden');
        flow?.classList.remove('hidden');
        renderQuestion();
    }

    document.getElementById('continueToFormBtn')?.addEventListener('click', () => {
        intro.classList.add('hidden');
        flow.classList.remove('hidden');
        renderQuestion();
    });

    nextBtn?.addEventListener('click', () => {
        const input = qInputContainer.querySelector('input, select, textarea');
        if (!input?.value) return alert("Please provide an answer.");
        
        session.answers[questions[currentIdx].id] = input.value;
        session.lastStep = 'questions';
        updateSession(userId, session);
        
        currentIdx++;
        if (currentIdx >= questions.length) {
            session.lastStep = 'result';
            updateSession(userId, session);
            window.location.href = 'result.html';
        } else {
            renderQuestion();
        }
    });

    function renderQuestion() {
        if (currentIdx >= questions.length) return;
        const q = questions[currentIdx];
        qLabel.textContent = q.label;
        qInputContainer.innerHTML = '';
        
        let el;
        if (q.type === 'select') {
            el = document.createElement('select');
            el.innerHTML = '<option value="" disabled selected>Choose...</option>' + 
                          q.options.map(o => `<option value="${o}">${o}</option>`).join('');
            // Pre-fill if exists
            if (session.answers[q.id]) el.value = session.answers[q.id];
        } else {
            el = document.createElement('textarea');
            el.rows = 4;
            el.placeholder = "Briefly explain...";
            if (session.answers[q.id]) el.value = session.answers[q.id];
        }
        qInputContainer.appendChild(el);
        if (progressFill) progressFill.style.width = `${((currentIdx) / questions.length) * 100}%`;
    }
}

// --- 3) RESULT LOGIC ---
function initResult() {
    const userId = getActiveUserId();
    const session = getSession(userId);
    if (!session || !session.answers) return window.location.href = 'index.html';

    const introView = document.getElementById('resultIntroView');
    const reportView = document.getElementById('reportView');
    const loading = document.getElementById('loadingOverlay');

    document.getElementById('showFullReportBtn')?.addEventListener('click', () => {
        introView.classList.add('hidden');
        loading.classList.remove('hidden');
        
        setTimeout(() => {
            loading.classList.add('hidden');
            reportView.classList.remove('hidden');
            renderReport(session.answers);
        }, 1500);
    });

    function renderReport(ans) {
        const greeting = document.getElementById('userGreeting');
        if (greeting) greeting.textContent = `Report for ${ans.name}`;
        
        let path = "Growth & Exploration";
        let desc = "You are in discovery mode.";
        let s30 = ["Audit interests", "Talk to mentors"];
        let s90 = ["Pick one project", "Iterate daily"];

        if (ans.goal === 'Build a Startup') {
            path = "Founder Track";
            desc = "Validate before building.";
            s30 = ["User interviews", "Landing page"];
            s90 = ["MVP launch", "First user"];
        } else if (ans.goal === 'Get a Job') {
            path = "Professional Track";
            desc = "Focus on proof of work.";
            s30 = ["Build portfolio", "Network"];
            s90 = ["Interviews", "Offer"];
        }

        document.getElementById('pathTitle').textContent = path;
        document.getElementById('pathDescription').textContent = desc;
        document.getElementById('list30Day').innerHTML = s30.map(i => `<li>${i}</li>`).join('');
        document.getElementById('list90Day').innerHTML = s90.map(i => `<li>${i}</li>`).join('');
    }
}

// --- 4) ADMIN LOGIC (WhatsApp delivery remains) ---
function initAdmin() {
    const loginForm = document.getElementById('adminLoginForm');
    const dashboard = document.getElementById('adminDashboard');
    const accessView = document.getElementById('adminAccess');

    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (document.getElementById('adminSecret')?.value === CONFIG.ADMIN_PASSWORD) {
            accessView.classList.add('hidden');
            dashboard.classList.remove('hidden');
            renderAdmin();
        }
    });

    const configForm = document.getElementById('configForm');
    const config = getAdminConfig();
    if (configForm) {
        document.getElementById('currentSharedCode').value = config.sharedCode;
        configForm.addEventListener('submit', (e) => {
            e.preventDefault();
            config.sharedCode = document.getElementById('currentSharedCode').value.trim().toUpperCase();
            saveAdminConfig(config);
            alert("Shared code updated!");
        });
    }

    const genForm = document.getElementById('generateCodeForm');
    genForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('attendeeName').value.trim();
        let phone = document.getElementById('attendeePhone').value.trim().replace(/\D/g, '');
        const sharedCode = getAdminConfig().sharedCode;

        if (phone.length === 10) phone = "91" + phone;

        // Delivery only UI (since code is shared)
        const resultView = document.getElementById('generatedResult');
        const codeDisp = document.getElementById('displayCode');
        const waLink = document.getElementById('whatsappLink');

        if (resultView && codeDisp && waLink) {
            codeDisp.textContent = sharedCode;
            const msg = `Hi ${name},\nWelcome to Kerala Startup Fest.\n\nYour Access Code:\n${sharedCode}\n\nUse this to unlock your Career OS.`;
            waLink.href = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
            resultView.classList.remove('hidden');
        }
        genForm.reset();
    });
}

function renderAdmin() {
    const tbody = document.getElementById('attendeesTableBody');
    if (!tbody) return;
    const sessions = getAllSessions();
    tbody.innerHTML = Object.values(sessions).reverse().map(s => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0;">${s.name}</td>
            <td style="color: #666;">${s.lastStep}</td>
            <td style="color: var(--primary); font-weight: bold;">ACTIVE</td>
        </tr>
    `).join('');
}
