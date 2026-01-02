// ====================================================
// GLOBAL CONFIG & UTILITIES
// ====================================================
const ADMIN_TRIGGER_CODE = "786786";
const ADMIN_PASSWORD = "admin123";
const STORAGE_KEY_ATTENDEES = "pgos_attendees";
const STORAGE_KEY_CURRENT_SESSION = "pgos_current_user";

let keyBuffer = "";

document.addEventListener("DOMContentLoaded", () => {
    // Determine which page we are on and init accordingly
    const path = window.location.pathname;
    const isIndex = path === "/" || path === "/index.html" || path === "";
    
    // Global keyboard listener for secret code
    document.addEventListener("keydown", (e) => {
        // Prevent buffer from growing too large and check for code
        keyBuffer += e.key;
        if (keyBuffer.length > 20) keyBuffer = keyBuffer.substring(keyBuffer.length - 20);
        
        if (keyBuffer.endsWith(ADMIN_TRIGGER_CODE)) {
            keyBuffer = ""; // Reset
            console.log("Admin trigger detected!");
            // Use location.href with origin to ensure absolute redirection
            const adminUrl = window.location.origin + "/admin.html";
            window.location.href = adminUrl;
        }
    });

    if (path.includes("admin.html") || path.endsWith("/admin") || path.endsWith("/admin.html")) {
        initAdmin();
    } else if (path.includes("questions.html") || path.endsWith("/questions")) {
        initQuestions();
    } else if (path.includes("result.html")) {
        initResult();
    } else if (isIndex) {
        // Default to index (login) if no specific match
        initIndex();
    }
});

// Helper to safely get data from localStorage
function getAttendees() {
    const data = localStorage.getItem(STORAGE_KEY_ATTENDEES);
    return data ? JSON.parse(data) : [];
}

// Helper to save data
function saveAttendees(attendees) {
    localStorage.setItem(STORAGE_KEY_ATTENDEES, JSON.stringify(attendees));
}

// ====================================================
// 1) INDEX.HTML - LOGIN LOGIC
// ====================================================
function initIndex() {
    const form = document.getElementById("loginForm");
    const errorMsg = document.getElementById("loginError");

    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const inputCode = document.getElementById("accessCode").value.trim();
        const attendees = getAttendees();
        
        // Find attendee by code
        const attendee = attendees.find(a => a.code === inputCode);

        if (attendee) {
            if (attendee.used) {
                // Code already used logic
                // NOTE: Project requirement says "Cannot be used ONLY once" -> "used=false" initially.
                // "Each access code... Can be used ONLY once" -> After result, we mark used.
                // However, for UX, if they crash, maybe allow re-entry?
                // Requirement says "Cannot be reused". Let's enforce strictness.
                errorMsg.textContent = "This code has already been used.";
                errorMsg.classList.remove("hidden");
            } else {
                // SUCCESS
                // Save current session for questions page
                localStorage.setItem(STORAGE_KEY_CURRENT_SESSION, JSON.stringify({
                    code: attendee.code,
                    name: attendee.name,
                    phone: attendee.phone
                }));
                window.location.href = "questions.html";
            }
        } else {
            errorMsg.textContent = "Invalid access code. Please check again.";
            errorMsg.classList.remove("hidden");
        }
    });
}

// ====================================================
// 2) ADMIN.HTML - DASHBOARD LOGIC
// ====================================================
function initAdmin() {
    const loginSection = document.getElementById("adminLoginSection");
    const dashboardSection = document.getElementById("adminDashboard");
    const loginForm = document.getElementById("adminLoginForm");
    const generateForm = document.getElementById("generateCodeForm");
    
    // Check if already logged in (simple session check)
    if (sessionStorage.getItem("admin_auth") === "true") {
        showDashboard();
    }

    // Login Handler
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const secret = document.getElementById("adminSecret").value;
            
            if (secret === ADMIN_PASSWORD) {
                sessionStorage.setItem("admin_auth", "true");
                showDashboard();
            } else {
                document.getElementById("adminLoginError").classList.remove("hidden");
            }
        });
    }

    // Generate Code Handler
    if (generateForm) {
        generateForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const name = document.getElementById("attendeeName").value.trim();
            const phone = document.getElementById("attendeePhone").value.trim();

            if (name && phone) {
                const newCode = generateUniqueCode();
                
                // Save to Storage
                const newAttendee = {
                    name: name,
                    phone: phone,
                    code: newCode,
                    used: false,
                    createdAt: new Date().toISOString()
                };
                
                const attendees = getAttendees();
                attendees.push(newAttendee);
                saveAttendees(attendees);

                // Show Result
                displayGeneratedCode(newAttendee);
                
                // Refresh Table
                renderAttendeesTable();
                
                // Reset Form
                generateForm.reset();
            }
        });
    }

    // Logout
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        sessionStorage.removeItem("admin_auth");
        window.location.reload();
    });

    function showDashboard() {
        // Ensure elements are found before manipulating
        if (loginSection && dashboardSection) {
            loginSection.classList.add("hidden");
            loginSection.style.display = "none";
            dashboardSection.classList.remove("hidden");
            dashboardSection.style.display = "block";
            renderAttendeesTable();
        }
    }

    function generateUniqueCode() {
        // Format: KSF-XXXX-XXXX
        const randPart = () => Math.random().toString(36).substr(2, 4).toUpperCase();
        return `KSF-${randPart()}-${randPart()}`;
    }

    function displayGeneratedCode(attendee) {
        const resultDiv = document.getElementById("generatedResult");
        const codeDisplay = document.getElementById("displayCode");
        const waLink = document.getElementById("whatsappLink");

        resultDiv.classList.remove("hidden");
        codeDisplay.textContent = attendee.code;

        // WhatsApp URL construction
        const message = `Hi ${attendee.name},\nThank you for upgrading at Kerala Startup Fest.\n\nYour Premium Access Code:\n${attendee.code}\n\nUse this code to unlock your Personal Growth & Career OS.`;
        const encodedMsg = encodeURIComponent(message);
        
        // WhatsApp API format: https://wa.me/PHONE?text=MESSAGE
        // Phone number needs to be clean (no + or spaces usually, but API handles some)
        // Ensure '91' prefix is there if not typed
        let cleanPhone = attendee.phone.replace(/\D/g, ''); 
        // If user entered 10 digits, prepend 91 (assuming India context from "Kerala Startup Fest")
        if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;

        waLink.href = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
    }

    function renderAttendeesTable() {
        const tbody = document.getElementById("attendeesTableBody");
        const attendees = getAttendees().reverse(); // Show newest first
        
        tbody.innerHTML = "";
        
        if (attendees.length === 0) {
            tbody.innerHTML = "<tr><td colspan='4' class='text-center'>No codes generated yet.</td></tr>";
            return;
        }

        attendees.forEach(a => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${a.name}</td>
                <td>${a.phone}</td>
                <td class="text-teal font-bold">${a.code}</td>
                <td>
                    <span class="${a.used ? 'text-red' : 'text-teal'}">
                        ${a.used ? 'USED' : 'UNUSED'}
                    </span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// ====================================================
// 3) QUESTIONS.HTML - ASSESSMENT LOGIC
// ====================================================
function initQuestions() {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEY_CURRENT_SESSION));
    
    // Security Check: Must have a session from login
    if (!session || !session.code) {
        window.location.href = "index.html";
        return;
    }

    // Prefill Name if available
    const nameInput = document.getElementById("userName");
    if (nameInput && session.name) {
        nameInput.value = session.name;
    }

    const form = document.getElementById("questionsForm");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            
            // Gather Answers
            const answers = {
                name: document.getElementById("userName").value,
                status: document.getElementById("currentStatus").value,
                goal: document.getElementById("primaryGoal").value,
                risk: document.getElementById("riskAppetite").value,
                skill: document.getElementById("skillLevel").value,
                challenge: document.getElementById("challenge").value
            };

            // Save answers to session (temp)
            session.answers = answers;
            localStorage.setItem(STORAGE_KEY_CURRENT_SESSION, JSON.stringify(session));

            // Redirect to result
            window.location.href = "result.html";
        });
    }
}

// ====================================================
// 4) RESULT.HTML - LOGIC ENGINE
// ====================================================
function initResult() {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEY_CURRENT_SESSION));
    
    // Security Check
    if (!session || !session.code || !session.answers) {
        window.location.href = "index.html";
        return;
    }

    const { goal, risk, skill, name } = session.answers;

    // Greeting
    document.getElementById("userGreeting").textContent = `Prepared for ${name}`;

    // Logic Engine
    let path = "";
    let desc = "";
    let focus30 = [];
    let focus90 = [];
    let mistake = "";

    // LOGIC RULES
    // IF goal == Startup AND risk == High
    if (goal === "Startup" && risk === "High") {
        path = "Startup Fast Track";
        desc = "You have the ambition and risk appetite to build something big. Your focus is speed and validation.";
        focus30 = [
            "Identify a problem worth solving and talk to 20 potential customers.",
            "Build a 'No-Code' MVP or prototype within 2 weeks.",
            "Get your first paying customer (or Letter of Intent)."
        ];
        focus90 = [
            "Launch V1 of your product to a wider audience.",
            "Iterate based on feedback loop (Build-Measure-Learn).",
            "Secure early-stage funding or reach profitability ramens."
        ];
        mistake = "Building a full product before validating that people actually want it.";
    } 
    // IF goal == Startup AND risk != High
    else if (goal === "Startup" && risk !== "High") {
        path = "Side-Hustle / Bootstrapper Path";
        desc = "You want to build, but you prefer stability. The best path is to build while you earn.";
        focus30 = [
            "Allocate 2 hours daily for your startup idea (no excuses).",
            "Validate your idea with zero budget.",
            "Join a community of indie hackers or bootstrappers."
        ];
        focus90 = [
            "Launch a micro-SaaS or service product.",
            "Generate your first $1000 online.",
            "Decide whether to go full-time based on revenue."
        ];
        mistake = "Quitting your job too early before you have revenue validation.";
    }
    // IF goal == Job AND skill == Beginner
    else if (goal === "Job" && skill === "Beginner") {
        path = "Skill Foundation Path";
        desc = "Your focus must be on aggressive learning and building a proof of work.";
        focus30 = [
            "Pick ONE high-demand skill (e.g., Full Stack, Data, Sales) and stick to it.",
            "Complete a capstone project that solves a real problem.",
            "Update your LinkedIn profile to reflect your new learning journey."
        ];
        focus90 = [
            "Build a portfolio with 3 solid projects.",
            "Start networking with people in your target role.",
            "Apply to 50+ entry-level roles or internships."
        ];
        mistake = "Tutorial hell: Watching videos without actually building anything.";
    }
    // IF goal == Job AND skill != Beginner
    else if (goal === "Job" && skill !== "Beginner") {
        path = "Career Acceleration Path";
        desc = "You have the skills; now you need visibility, authority, and a better network.";
        focus30 = [
            "Optimize your resume and LinkedIn for specific high-value keywords.",
            "Write one case study about a difficult problem you solved.",
            "Reach out to 10 recruiters or founders directly."
        ];
        focus90 = [
            "Secure interviews at Tier-1 companies.",
            "Negotiate your salary based on value, not just market rate.",
            "Mentor a junior to solidify your own understanding."
        ];
        mistake = "Waiting for job postings instead of networking directly with decision makers.";
    }
    // IF goal == Skill
    else if (goal === "Skill") {
        path = "Mastery Path";
        desc = "Deep diving into a new competency to future-proof your career.";
        focus30 = [
            "Deconstruct the skill into sub-skills and create a learning roadmap.",
            "Practice deliberately for 1 hour every single day.",
            "Teach what you learn (blog, tweet, or explain to a friend)."
        ];
        focus90 = [
            "Achieve a certification or public recognition for this skill.",
            "Apply this skill in a real-world paid project.",
            "Connect with top 5 experts in this field."
        ];
        mistake = "Learning broadly without depth. Jack of all trades, master of none.";
    }
    // IF goal == Not Sure (or fallback)
    else {
        path = "Exploration & Discovery Path";
        desc = "It's okay not to know. Your goal is to run small experiments to find your Ikigai.";
        focus30 = [
            "Audit your interests: What do you do in your free time?",
            "Talk to 5 people in different careers (Job, Startup, Freelance).",
            "Read 'Design Your Life' or similar career clarity books."
        ];
        focus90 = [
            "Try 3 different mini-projects (1 week each).",
            "Eliminate what you definitely hate doing.",
            "Commit to one path for the next 6 months."
        ];
        mistake = "Paralysis by analysis. Thinking too much instead of doing.";
    }

    // Render Data
    document.getElementById("pathTitle").textContent = path;
    document.getElementById("pathDescription").textContent = desc;
    
    const ul30 = document.getElementById("list30Day");
    focus30.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        ul30.appendChild(li);
    });

    const ul90 = document.getElementById("list90Day");
    focus90.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        ul90.appendChild(li);
    });

    document.getElementById("mistakeToAvoid").textContent = mistake;

    // FINAL STEP: Mark code as USED in database
    // "Mark access code as USED... Lock further access"
    markCodeAsUsed(session.code);
    
    // Clear session so back button doesn't work easily (simple protection)
    // We keep it briefly to allow printing, but maybe clear on exit or reload
    // For now, the "used" flag in DB prevents re-login.
}

function markCodeAsUsed(code) {
    const attendees = getAttendees();
    const index = attendees.findIndex(a => a.code === code);
    
    if (index !== -1 && !attendees[index].used) {
        attendees[index].used = true;
        saveAttendees(attendees);
        console.log(`Code ${code} marked as used.`);
    }
}
