/**
 * Personal Growth & Career OS - Core Logic
 * Fixes: WhatsApp Delivery, One-time usage, Session locking, Guided UI.
 */

const CONFIG = {
    STORAGE_KEYS: {
        ATTENDEES: 'pgos_attendees',
        SESSION: 'pgos_session',
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
const getAttendees = () => Storage.get(CONFIG.STORAGE_KEYS.ATTENDEES) || [];
const saveAttendees = (list) => Storage.set(CONFIG.STORAGE_KEYS.ATTENDEES, list);
const getSession = () => Storage.get(CONFIG.STORAGE_KEYS.SESSION);
const saveSession = (data) => Storage.set(CONFIG.STORAGE_KEYS.SESSION, data);

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

// --- 1) INDEX LOGIC (Access Verification) ---
function initIndex() {
    const form = document.getElementById('loginForm');
    const input = document.getElementById('accessCode');
    const error = document.getElementById('loginError');
    const loginView = document.getElementById('loginView');
    const verifiedView = document.getElementById('accessVerifiedView');
    const startBtn = document.getElementById('startAssessmentBtn');

    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = input.value.trim().toUpperCase();
        const attendees = getAttendees();
        const attendee = attendees.find(a => a.code.toUpperCase() === code);

        if (!attendee) {
            showError("Invalid access code. Please check again.");
        } else if (attendee.used) {
            showError("This code has already been used.");
        } else {
            // SUCCESS - Create temporary session
            saveSession({ code: attendee.code, name: attendee.name });
            loginView.classList.add('hidden');
            verifiedView.classList.remove('hidden');
        }
    });

    startBtn?.addEventListener('click', () => {
        window.location.href = 'questions.html';
    });

    function showError(msg) {
        if (error) {
            error.textContent = msg;
            error.classList.remove('hidden');
        }
    }
}

// --- 2) QUESTIONS LOGIC (Guided Step-by-Step) ---
function initQuestions() {
    const session = getSession();
    // Safety check: redirect to index if no valid session
    if (!session || !session.code) return window.location.href = 'index.html';

    const questions = [
        { id: 'status', label: 'What is your current status?', type: 'select', options: ['Student', 'Job Seeker', 'Working Professional', 'Founder'] },
        { id: 'goal', label: 'What is your primary goal?', type: 'select', options: ['Get a Job', 'Build a Startup', 'Learn a New Skill', 'Not Sure Yet'] },
        { id: 'risk', label: 'Your risk appetite?', type: 'select', options: ['Low (Prefer Stability)', 'Medium (Calculated Risks)', 'High (All In)'] },
        { id: 'skill', label: 'Current skill level?', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'] },
        { id: 'challenge', label: 'Biggest challenge right now?', type: 'textarea' }
    ];

    let currentIdx = -1; // -1 = Intro screen
    const answers = { name: session.name };

    const intro = document.getElementById('questionIntroView');
    const flow = document.getElementById('questionFlow');
    const qLabel = document.getElementById('qLabel');
    const qInputContainer = document.getElementById('qInputContainer');
    const nextBtn = document.getElementById('nextQBtn');
    const progressFill = document.getElementById('progressFill');

    document.getElementById('continueToFormBtn')?.addEventListener('click', () => {
        intro.classList.add('hidden');
        flow.classList.remove('hidden');
        showNext();
    });

    nextBtn?.addEventListener('click', () => {
        const input = qInputContainer.querySelector('input, select, textarea');
        if (!input?.value) return alert("Please provide an answer before continuing.");
        
        answers[questions[currentIdx].id] = input.value;
        showNext();
    });

    function showNext() {
        currentIdx++;
        if (currentIdx >= questions.length) {
            // Assessment Complete
            session.answers = answers;
            saveSession(session);
            window.location.href = 'result.html';
            return;
        }

        const q = questions[currentIdx];
        qLabel.textContent = q.label;
        qInputContainer.innerHTML = '';
        
        let el;
        if (q.type === 'select') {
            el = document.createElement('select');
            el.innerHTML = '<option value="" disabled selected>Choose an option...</option>' + 
                          q.options.map(o => `<option value="${o}">${o}</option>`).join('');
        } else {
            el = document.createElement('textarea');
            el.rows = 4;
            el.placeholder = "Explain briefly...";
        }
        qInputContainer.appendChild(el);
        if (progressFill) progressFill.style.width = `${((currentIdx + 1) / questions.length) * 100}%`;
    }
}

// --- 3) RESULT LOGIC (Report Generation & Session Lock) ---
function initResult() {
    const session = getSession();
    if (!session || !session.answers) return window.location.href = 'index.html';

    const introView = document.getElementById('resultIntroView');
    const reportView = document.getElementById('reportView');
    const loading = document.getElementById('loadingOverlay');
    const finishBtn = document.getElementById('finishSessionBtn');

    document.getElementById('showFullReportBtn')?.addEventListener('click', () => {
        introView.classList.add('hidden');
        loading.classList.remove('hidden');
        
        // Simulate "Analyzing" UX
        setTimeout(() => {
            loading.classList.add('hidden');
            reportView.classList.remove('hidden');
            renderReport(session.answers);
        }, 1800);
    });

    finishBtn?.addEventListener('click', () => {
        // PERMANENT LOCK: Mark as used in storage
        const attendees = getAttendees();
        const idx = attendees.findIndex(a => a.code === session.code);
        if (idx > -1) {
            attendees[idx].used = true;
            saveAttendees(attendees);
        }
        
        // Clear active session
        Storage.remove(CONFIG.STORAGE_KEYS.SESSION);
        
        reportView.classList.add('hidden');
        document.getElementById('sessionEndView')?.classList.remove('hidden');
    });

    function renderReport(ans) {
        const greeting = document.getElementById('userGreeting');
        if (greeting) greeting.textContent = `Personal Direction for ${ans.name}`;
        
        // Path Logic Engine
        let path = "Exploration & Growth";
        let desc = "You are in a valuable stage of discovery. Your focus is finding the right intersection of your skills and passion.";
        let s30 = ["Audit your daily interests", "Talk to 3 people in target roles", "Read 'Design Your Life'"];
        let s90 = ["Pick one 3-month project", "Join a peer group", "Build a small portfolio"];

        if (ans.goal.includes("Startup")) {
            path = "Startup Fast Track";
            desc = "You have the drive to build something big. Focus on rapid validation before building.";
            s30 = ["Talk to 20 potential users", "Build a no-code prototype", "Validate core assumption"];
            s90 = ["Launch public beta", "Iterate on feedback", "Get first paying user"];
        } else if (ans.goal.includes("Job")) {
            path = "Career Acceleration";
            desc = "Focus on visibility, authority, and specialized networking to skip the standard queue.";
            s30 = ["Optimize LinkedIn for keywords", "Write 2 case studies", "Reach out to 5 target founders"];
            s90 = ["Secure 3 high-tier interviews", "Negotiate value-based pay", "Mentor a junior"];
        }

        document.getElementById('pathTitle').textContent = path;
        document.getElementById('pathDescription').textContent = desc;
        
        const r30 = document.getElementById('list30Day');
        const r90 = document.getElementById('list90Day');
        if (r30) r30.innerHTML = s30.map(i => `<li>${i}</li>`).join('');
        if (r90) r90.innerHTML = s90.map(i => `<li>${i}</li>`).join('');
    }
}

// --- 4) ADMIN LOGIC (WhatsApp Flow) ---
function initAdmin() {
    const loginForm = document.getElementById('adminLoginForm');
    const dashboard = document.getElementById('adminDashboard');
    const accessView = document.getElementById('adminAccess');

    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const pw = document.getElementById('adminSecret')?.value;
        if (pw === CONFIG.ADMIN_PASSWORD) {
            accessView.classList.add('hidden');
            dashboard.classList.remove('hidden');
            renderAdminTable();
        } else {
            alert("Access Denied");
        }
    });

    const genForm = document.getElementById('generateCodeForm');
    genForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('attendeeName').value.trim();
        let phone = document.getElementById('attendeePhone').value.trim().replace(/\D/g, '');

        if (!name || phone.length < 10) return alert("Valid name and phone required.");
        if (phone.length === 10) phone = "91" + phone;

        // Generate Code
        const rand = () => Math.random().toString(36).substring(2,6).toUpperCase();
        const code = `KSF-${rand()}-${rand()}`;

        // Save
        const attendees = getAttendees();
        attendees.push({ name, phone, code, used: false });
        saveAttendees(attendees);

        // Show WhatsApp UI
        const resultView = document.getElementById('generatedResult');
        const codeDisp = document.getElementById('displayCode');
        const waLink = document.getElementById('whatsappLink');

        if (resultView && codeDisp && waLink) {
            codeDisp.textContent = code;
            const msg = `Hi ${name},\nThank you for upgrading at Kerala Startup Fest.\n\nYour Premium Access Code:\n${code}\n\nUse this code to unlock your Personal Growth & Career OS.`;
            waLink.href = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
            resultView.classList.remove('hidden');
        }

        renderAdminTable();
        genForm.reset();
    });
}

function renderAdminTable() {
    const tbody = document.getElementById('attendeesTableBody');
    if (!tbody) return;
    const attendees = getAttendees().reverse();
    tbody.innerHTML = attendees.map(a => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0;">${a.name}</td>
            <td style="font-weight: bold; color: #009688;">${a.code}</td>
            <td style="color: ${a.used ? '#E53935' : '#009688'};">${a.used ? 'USED' : 'UNUSED'}</td>
        </tr>
    `).join('') || '<tr><td colspan="3" class="text-center">No data found</td></tr>';
}
