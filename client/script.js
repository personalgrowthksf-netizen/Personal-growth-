/**
 * Personal Growth & Career OS - Core Logic (Final)
 * Features: Unique per-user codes, WhatsApp Delivery, Rule-based Intelligence Guide.
 */

const CONFIG = {
    STORAGE_KEYS: {
        USER_DATA: 'pgos_users', // Key -> Unique Code
        ACTIVE_CODE: 'pgos_active_code'
    },
    ADMIN_PASSWORD: 'admin123',
    ADMIN_TRIGGER: '786786'
};

// --- STORAGE UTILS ---
const Storage = {
    getUsers: () => JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}'),
    saveUsers: (users) => localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(users)),
    getActiveCode: () => localStorage.getItem(CONFIG.STORAGE_KEYS.ACTIVE_CODE),
    setActiveCode: (code) => localStorage.setItem(CONFIG.STORAGE_KEYS.ACTIVE_CODE, code)
};

// --- APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    
    // Admin Shortcut
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

    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = input.value.trim().toUpperCase();
        const users = Storage.getUsers();

        if (users[code]) {
            Storage.setActiveCode(code);
            const user = users[code];
            if (user.lastStep === 'result') window.location.href = 'result.html';
            else window.location.href = 'questions.html';
        } else {
            error.textContent = "Invalid access code. Please check your WhatsApp.";
            error.classList.remove('hidden');
        }
    });
}

// --- 2) QUESTIONS LOGIC ---
function initQuestions() {
    const code = Storage.getActiveCode();
    const users = Storage.getUsers();
    const user = users[code];
    if (!user) return window.location.href = 'index.html';

    const questions = [
        { id: 'status', label: 'Current status?', type: 'select', options: ['Student', 'Job Seeker', 'Professional', 'Founder'] },
        { id: 'goal', label: 'Primary goal?', type: 'select', options: ['Get a Job', 'Build a Startup', 'Learn Skills'] },
        { id: 'risk', label: 'Risk appetite?', type: 'select', options: ['Low', 'Medium', 'High'] },
        { id: 'skill', label: 'Skill level?', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'] },
        { id: 'challenge', label: 'Biggest challenge?', type: 'textarea' }
    ];

    let currentIdx = 0;
    while (user.answers[questions[currentIdx]?.id]) currentIdx++;

    const intro = document.getElementById('questionIntroView');
    const flow = document.getElementById('questionFlow');
    const qLabel = document.getElementById('qLabel');
    const qInputContainer = document.getElementById('qInputContainer');
    const nextBtn = document.getElementById('nextQBtn');
    const progressFill = document.getElementById('progressFill');

    if (!intro || !flow) return;

    document.getElementById('continueToFormBtn')?.addEventListener('click', () => {
        intro.classList.add('hidden');
        flow.classList.remove('hidden');
        renderQuestion();
    });

    nextBtn?.addEventListener('click', () => {
        const input = qInputContainer.querySelector('input, select, textarea');
        if (!input?.value) return alert("Please answer.");
        
        user.answers[questions[currentIdx].id] = input.value;
        user.lastStep = 'questions';
        users[code] = user;
        Storage.saveUsers(users);
        
        currentIdx++;
        if (currentIdx >= questions.length) {
            user.lastStep = 'result';
            users[code] = user;
            Storage.saveUsers(users);
            window.location.href = 'result.html';
        } else {
            renderQuestion();
        }
    });

    function renderQuestion() {
        const q = questions[currentIdx];
        qLabel.textContent = q.label;
        qInputContainer.innerHTML = '';
        const el = q.type === 'select' ? document.createElement('select') : document.createElement('textarea');
        if (q.type === 'select') {
            el.innerHTML = '<option value="" disabled selected>Select...</option>' + q.options.map(o => `<option value="${o}">${o}</option>`).join('');
        } else {
            el.rows = 4; el.placeholder = "Briefly explain...";
        }
        qInputContainer.appendChild(el);
        progressFill.style.width = `${(currentIdx / questions.length) * 100}%`;
    }
}

// --- 3) RESULT & GUIDE LOGIC ---
function initResult() {
    const code = Storage.getActiveCode();
    const users = Storage.getUsers();
    const user = users[code];
    if (!user) return window.location.href = 'index.html';

    renderReport(user.answers);
    initGuide(user);

    function renderReport(ans) {
        document.getElementById('pathTitle').textContent = ans.goal === 'Build a Startup' ? 'Founder Track' : 'Career Accelerator';
        document.getElementById('list30Day').innerHTML = '<li>Set foundation</li><li>Network</li>';
        document.getElementById('list90Day').innerHTML = '<li>Launch</li><li>Iterate</li>';
    }
}

function initGuide(user) {
    const chatBox = document.getElementById('chatBox');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendChatBtn');

    if (!sendBtn) return;

    sendBtn.addEventListener('click', () => {
        const q = chatInput.value.trim().toLowerCase();
        if (!q) return;

        appendMsg(chatInput.value, 'user');
        chatInput.value = '';

        setTimeout(() => {
            const reply = getIntelligence(q, user.answers);
            appendMsg(reply, 'bot');
        }, 600);
    });

    function appendMsg(txt, sender) {
        const div = document.createElement('div');
        div.className = `msg ${sender}`;
        div.textContent = txt;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

function getIntelligence(q, profile) {
    const startupKeys = ['startup', 'founder', 'business', 'quit', 'funding'];
    const jobKeys = ['job', 'career', 'salary', 'resume', 'interview'];
    const skillKeys = ['learn', 'skill', 'course', 'study', 'master'];

    if (startupKeys.some(k => q.includes(k))) {
        if (profile.risk === 'Medium' && q.includes('quit')) return "Based on your medium risk appetite, validate your idea with 20 users before quitting your current role.";
        return "Focus on building an MVP first. Don't worry about funding until you have traction.";
    }
    if (jobKeys.some(k => q.includes(k))) {
        return "Optimize your LinkedIn and focus on 'Proof of Work' rather than just a resume.";
    }
    return "I can help with career, skills, or startup growth. Try asking about those!";
}

// --- 4) ADMIN LOGIC ---
function initAdmin() {
    const loginForm = document.getElementById('adminLoginForm');
    const dashboard = document.getElementById('adminDashboard');
    const genForm = document.getElementById('generateCodeForm');

    loginForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (document.getElementById('adminSecret').value === CONFIG.ADMIN_PASSWORD) {
            document.getElementById('adminAccess').classList.add('hidden');
            dashboard.classList.remove('hidden');
            renderAdmin();
        }
    });

    document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
        location.reload();
    });

    genForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('attendeeName').value.trim();
        let phone = document.getElementById('attendeePhone').value.trim().replace(/\D/g, '');
        if (phone.length === 10) phone = "91" + phone;

        const code = `KSF-${Math.random().toString(36).substring(2,6).toUpperCase()}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
        const users = Storage.getUsers();
        users[code] = { name, phone, code, answers: {}, lastStep: 'index' };
        Storage.saveUsers(users);

        const waLink = document.getElementById('whatsappLink');
        const msg = `Hi ${name},\nYour Personal Access Code:\n${code}\n\nUse this to unlock your Career OS.`;
        waLink.href = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
        document.getElementById('displayCode').textContent = code;
        document.getElementById('generatedResult').classList.remove('hidden');
        renderAdmin();
    });
}

function renderAdmin() {
    const tbody = document.getElementById('attendeesTableBody');
    if (!tbody) return;
    tbody.innerHTML = Object.values(Storage.getUsers()).reverse().map(u => `
        <tr><td>${u.name}</td><td>${u.code}</td><td>${u.lastStep}</td></tr>
    `).join('');
}
