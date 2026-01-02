/**
 * Personal Growth & Career OS - Core Logic
 * Clean, stable, vanilla JS.
 */

const CONFIG = {
    STORAGE_KEYS: {
        ATTENDEES: 'pgos_attendees',
        SESSION: 'pgos_session',
    },
    ADMIN_PASSWORD: 'admin123',
    ADMIN_TRIGGER: '786786'
};

// --- DEFENSIVE STORAGE UTILS ---
const Storage = {
    get: (key) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
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

// --- DATA HELPERS ---
const getAttendees = () => Storage.get(CONFIG.STORAGE_KEYS.ATTENDEES) || [];
const saveAttendees = (list) => Storage.set(CONFIG.STORAGE_KEYS.ATTENDEES, list);
const getSession = () => Storage.get(CONFIG.STORAGE_KEYS.SESSION);
const saveSession = (data) => Storage.set(CONFIG.STORAGE_KEYS.SESSION, data);

// --- ROUTER & INIT ---
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    
    // Secret Admin Trigger
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

    if (path.includes('questions.html')) initQuestions();
    else if (path.includes('result.html')) initResult();
    else initIndex();
});

// --- 1) INDEX LOGIC ---
function initIndex() {
    const form = document.getElementById('loginForm');
    const input = document.getElementById('accessCode');
    const error = document.getElementById('loginError');
    const verifiedView = document.getElementById('accessVerifiedView');
    const loginView = document.getElementById('loginView');

    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = input.value.trim().toUpperCase();
        const attendees = getAttendees();
        const attendee = attendees.find(a => a.code.toUpperCase() === code);

        if (!attendee) {
            showError("Invalid access code.");
        } else if (attendee.used) {
            showError("This code has already been used.");
        } else {
            saveSession({ code: attendee.code, name: attendee.name });
            loginView.classList.add('hidden');
            verifiedView.classList.remove('hidden');
        }
    });

    document.getElementById('startAssessmentBtn')?.addEventListener('click', () => {
        window.location.href = 'questions.html';
    });

    function showError(msg) {
        error.textContent = msg;
        error.classList.remove('hidden');
    }
}

// --- 2) QUESTIONS LOGIC ---
function initQuestions() {
    const session = getSession();
    if (!session) return window.location.href = 'index.html';

    const questions = [
        { id: 'status', label: 'Current Status', type: 'select', options: ['Student', 'Job Seeker', 'Working Professional', 'Founder'] },
        { id: 'goal', label: 'Primary Goal', type: 'select', options: ['Get a Job', 'Build a Startup', 'Learn a New Skill', 'Not Sure Yet'] },
        { id: 'risk', label: 'Risk Appetite', type: 'select', options: ['Low (Stability)', 'Medium (Calculated)', 'High (All In)'] },
        { id: 'skill', label: 'Skill Level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'] },
        { id: 'challenge', label: 'Biggest Challenge', type: 'textarea' }
    ];

    let currentIdx = -1; // -1 is intro
    const answers = { name: session.name };

    const intro = document.getElementById('questionIntroView');
    const flow = document.getElementById('questionFlow');
    const qLabel = document.getElementById('qLabel');
    const qInputContainer = document.getElementById('qInputContainer');
    const nextBtn = document.getElementById('nextQBtn');
    const progress = document.getElementById('progressFill');

    document.getElementById('continueToFormBtn')?.addEventListener('click', () => {
        intro.classList.add('hidden');
        flow.classList.remove('hidden');
        showNext();
    });

    nextBtn?.addEventListener('click', () => {
        const input = qInputContainer.querySelector('input, select, textarea');
        if (!input?.value) return alert("Please answer before continuing.");
        
        answers[questions[currentIdx].id] = input.value;
        showNext();
    });

    function showNext() {
        currentIdx++;
        if (currentIdx >= questions.length) {
            session.answers = answers;
            saveSession(session);
            return window.location.href = 'result.html';
        }

        const q = questions[currentIdx];
        qLabel.textContent = q.label;
        qInputContainer.innerHTML = '';
        
        let el;
        if (q.type === 'select') {
            el = document.createElement('select');
            el.innerHTML = '<option value="" disabled selected>Select...</option>' + 
                          q.options.map(o => `<option value="${o}">${o}</option>`).join('');
        } else {
            el = document.createElement('textarea');
            el.rows = 4;
            el.placeholder = "Tell us more...";
        }
        qInputContainer.appendChild(el);
        progress.style.width = `${(currentIdx / questions.length) * 100}%`;
    }
}

// --- 3) RESULT LOGIC ---
function initResult() {
    const session = getSession();
    if (!session || !session.answers) return window.location.href = 'index.html';

    const reportView = document.getElementById('reportView');
    const introView = document.getElementById('resultIntroView');
    const loading = document.getElementById('loadingOverlay');

    document.getElementById('showFullReportBtn')?.addEventListener('click', () => {
        introView.classList.add('hidden');
        loading.classList.remove('hidden');
        
        setTimeout(() => {
            loading.classList.add('hidden');
            reportView.classList.remove('hidden');
            generateReport(session.answers);
        }, 1500);
    });

    document.getElementById('finishSessionBtn')?.addEventListener('click', () => {
        const attendees = getAttendees();
        const idx = attendees.findIndex(a => a.code === session.code);
        if (idx > -1) {
            attendees[idx].used = true;
            saveAttendees(attendees);
        }
        Storage.remove(CONFIG.STORAGE_KEYS.SESSION);
        document.getElementById('reportView').classList.add('hidden');
        document.getElementById('sessionEndView').classList.remove('hidden');
    });

    function generateReport(ans) {
        document.getElementById('userGreeting').textContent = `Prepared for ${ans.name}`;
        
        let path = "Exploration Path";
        let desc = "You are currently in a discovery phase.";
        let steps30 = ["Audit interests", "Talk to 3 mentors"];
        let steps90 = ["Pick one project", "Commit to 3 months"];

        if (ans.goal.includes("Startup")) {
            path = "Startup Fast Track";
            desc = "You have the drive to build. Focus on validation first.";
            steps30 = ["Talk to 20 customers", "Build landing page"];
            steps90 = ["Launch MVP", "Get first sale"];
        } else if (ans.goal.includes("Job")) {
            path = "Career Accelerator";
            desc = "Focus on proof of work and networking.";
            steps30 = ["Update portfolio", "Connect with 5 recruiters"];
            steps90 = ["Land 3 interviews", "Secure offer"];
        }

        document.getElementById('pathTitle').textContent = path;
        document.getElementById('pathDescription').textContent = desc;
        renderList('list30Day', steps30);
        renderList('list90Day', steps90);
    }

    function renderList(id, items) {
        const el = document.getElementById(id);
        el.innerHTML = items.map(i => `<li>${i}</li>`).join('');
    }
}

// --- ADMIN LOGIC ---
function initAdmin() {
    const form = document.getElementById('adminLoginForm');
    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (document.getElementById('adminSecret').value === CONFIG.ADMIN_PASSWORD) {
            document.getElementById('adminAccess').classList.add('hidden');
            document.getElementById('adminDashboard').classList.remove('hidden');
            renderAdmin();
        }
    });

    document.getElementById('generateCodeForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('attendeeName').value;
        const phone = document.getElementById('attendeePhone').value;
        const code = `KSF-${Math.random().toString(36).substring(2,6).toUpperCase()}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
        
        const list = getAttendees();
        list.push({ name, phone, code, used: false });
        saveAttendees(list);
        renderAdmin();
        alert(`Generated: ${code}`);
    });
}

function renderAdmin() {
    const tbody = document.getElementById('attendeesTableBody');
    if (!tbody) return;
    tbody.innerHTML = getAttendees().map(a => `
        <tr>
            <td>${a.name}</td>
            <td>${a.code}</td>
            <td>${a.used ? 'USED' : 'ACTIVE'}</td>
        </tr>
    `).join('');
}
