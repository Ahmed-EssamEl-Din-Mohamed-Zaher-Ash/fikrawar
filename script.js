// ==================== API PROXY CONFIGURATION ====================
//  مهم: لا تضع مفتاح API مباشرة في الكود!
// استخدم Cloudflare Worker كوسيط آمن (انظر ملف worker.js)
// غيّر هذا الرابط إلى رابط الـ Worker الخاص بك بعد النشر

const API_PROXY_URL = "https://fikrawar-api.ahmedmo103.workers.dev";


const AIService = {
    async call(prompt) {
        try {
            console.log(" جاري الاتصال بالـ API...");

            const response = await fetch(API_PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) {
                let errorMsg = "خطأ في الاتصال";
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch(_) {}
                console.error(" API Error:", errorMsg);
                showNotification(" " + errorMsg);
                return null;
            }

            const data = await response.json();
            const result = data.choices?.[0]?.message?.content || data.result || null;
            if (result) {
                console.log(" حصلنا على الرد من API");
            }
            return result;
        } catch (error) {
            console.error(" Connection Error:", error);
            showNotification(" خطأ في الاتصال. تحقق من الإنترنت");
            return null;
        }
    },

    _parseJSON(text) {
        if (!text) return null;
        try {
            let clean = text.trim();
            // إزالة markdown code blocks
            if (clean.startsWith('```')) {
                clean = clean.replace(/```(?:json)?\n?/g, '').trim();
            }
            return JSON.parse(clean);
        } catch (_) {
            // محاولة استخراج JSON من النص
            try {
                const objMatch = text.match(/\{[\s\S]*\}/);
                if (objMatch) return JSON.parse(objMatch[0]);
                const arrMatch = text.match(/\[[\s\S]*\]/);
                if (arrMatch) return JSON.parse(arrMatch[0]);
            } catch (_) {}
            return null;
        }
    },

    async generateEnemy(userFear) {
        const prompt = `أنت لعبة CBT (العلاج السلوكي المعرفي). المستخدم يخاف من: "${userFear}"

أنشئ وحش فكرة سلبية بناءً على هذا الخوف.
ارجع JSON فقط (بدون markdown):

{
    "name": "اسم مخيف بالعربية",
    "avatar": "إيموجي واحد",
    "type": "نوع التشويه المعرفي بالعربية",
    "health": 100,
    "attacks": [
        "جملة هجوم 1 بالعربية",
        "جملة هجوم 2 بالعربية",
        "جملة هجوم 3 بالعربية"
    ]
}`;
        const text = await this.call(prompt);
        const parsed = this._parseJSON(text);

        if (parsed && parsed.name && parsed.attacks) {
            return parsed;
        }

        // وحش افتراضي عند فشل الاتصال
        return {
            name: "وحش القلق الغامض",
            avatar: "",
            type: "قلق عام",
            health: 100,
            attacks: ["أنت لست بخير", "شيء سيء سيحدث", "لن تنجح في هذا"]
        };
    },

    async getAdvice(enemyName, attackText) {
        const prompt = `في لعبة CBT، المستخدم يقاتل فكرة سلبية باسم "${enemyName}".
الفكرة قالت: "${attackText}"

أعط 3 ردود مختلفة بالعربية للاعب:
1. تحليل منطقي (logical)
2. إعادة صياغة إيجابية (reframe)
3. تقبل وشفقة على النفس (acceptance)

ارجع JSON فقط (بدون markdown):

[
    { "text": "نص الرد 1 بالعربية", "type": "logical", "dmg": 25 },
    { "text": "نص الرد 2 بالعربية", "type": "reframe", "dmg": 30 },
    { "text": "نص الرد 3 بالعربية", "type": "acceptance", "dmg": 20 }
]`;
        const text = await this.call(prompt);
        const parsed = this._parseJSON(text);

        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
        }
        return null;
    }
};

// ==================== GAME DATA ====================
const Bosses = [
    {
        id: "fomo_king",
        name: " ملك فوات الأوان",
        avatar: "",
        desc: "يوسوس بضياع الفرص.",
        phases: [
            { health: 100, attacks: ["انظر حولك، الجميع سبقك.", "فات الأوان لتصبح ناجحاً."] },
            { health: 80, attacks: ["لن تجد شريك حياة مناسب الآن.", "القطار فاتك تماماً."] }
        ]
    },
    {
        id: "perfection",
        name: " طاغية الكمال",
        avatar: "",
        desc: "لا يقبل بأقل من 100%.",
        phases: [
            { health: 100, attacks: ["لديك خطأ واحد، إذاً أنت فاشل.", "يجب أن تكون مثالياً."] }
        ]
    }
];

const RegularEnemies = [
    { name: "صوت القلق", avatar: "", type: "توقع الكوارث", health: 80, attacks: ["ماذا لو فشلت؟", "الجميع ينظر إليك.", "شيء سيحدث بالتأكيد."] },
    { name: "الجلاد", avatar: "", type: "لوم الذات", health: 80, attacks: ["أنت لا تستحق الراحة.", "كل هذا خطؤك.", "كان يجب أن تفعل أفضل."] },
    { name: "المقارن", avatar: "", type: "مقارنة اجتماعية", health: 70, attacks: ["انظر كيف نجح غيرك.", "أنت متأخر عن أقرانك.", "الكل أفضل منك."] }
];

const ProgrammingEnemies = [
    { name: "Bug الكود", avatar: "", type: "إحباط", health: 80, attacks: ["لن تفهم الـ pointers أبداً.", "أنت بطيء جداً.", "الكود لن يعمل."] },
    { name: "متلازمة المحتال", avatar: "", type: "تشكيك", health: 90, attacks: ["أنت تخدع الجميع، لست مبرمجاً حقيقياً.", "سيكتشفون أنك لا تعرف شيئاً.", "لا تستحق هذه الوظيفة."] }
];

// ==================== STATE & LOGIC ====================
const GameState = {
    xp: { python: 0, web: 0, cs: 0 },
    levels: { python: 1, web: 1, cs: 1 },
    stats: { wins: 0, streak: 0, lastPlayDate: null },
    thoughts: [],
    titles: [],
    activeTech: null,
    currentBattle: null,

    save() {
        try {
            localStorage.setItem('thoughtBattlesAI_v2', JSON.stringify({
                xp: this.xp,
                levels: this.levels,
                stats: this.stats,
                thoughts: this.thoughts,
                titles: this.titles
            }));
        } catch (e) {
            console.warn(" لم يتم حفظ البيانات:", e);
        }
    },

    load() {
        try {
            const d = localStorage.getItem('thoughtBattlesAI_v2');
            if (d) {
                const p = JSON.parse(d);
                this.xp = p.xp || this.xp;
                this.levels = p.levels || this.levels;
                this.stats = p.stats || this.stats;
                this.titles = p.titles || [];
                this.thoughts = p.thoughts || [];
            }
        } catch (e) {
            console.warn(" خطأ في تحميل البيانات:", e);
        }
    }
};

// ==================== STREAK SYSTEM ====================
function updateStreak() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const last = GameState.stats.lastPlayDate;

    if (!last) {
        // أول مرة يلعب
        GameState.stats.streak = 1;
    } else if (last === today) {
        // لعب اليوم بالفعل
        return;
    } else {
        const lastDate = new Date(last);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            GameState.stats.streak++;
        } else {
            GameState.stats.streak = 1; // أعِد البدء
        }
    }

    GameState.stats.lastPlayDate = today;
    GameState.save();
}

// ==================== INITIALIZATION ====================
window.addEventListener('DOMContentLoaded', () => {
    GameState.load();
    updateStatsUI();
    renderBossList();
    updateStreak();

    // دعم لوحة المفاتيح على البطاقات
    document.querySelectorAll('[role="button"][tabindex="0"]').forEach(el => {
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                el.click();
            }
        });
    });
});

// ==================== NAVIGATION ====================
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(id);
    if (screen) {
        screen.classList.add('active');
        // Scroll to top when switching screens
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function returnToMenu() {
    showScreen('menuScreen');
}

function showStats() {
    showScreen('statsScreen');
    renderTitles();
    updateStatsUI();
}

function showStudyCamp() {
    showScreen('studyCampScreen');
    updateStudyUI();
}

function showBossBattles() {
    showScreen('bossScreen');
}

function showCustomBattle() {
    showScreen('customBattleScreen');
}

// ==================== THOUGHT JOURNAL ====================
function showThoughtJournal() {
    showScreen('journalScreen');
    renderThoughts();
}

function addJournalEntry() {
    const input = document.getElementById('journalInput');
    const text = input.value.trim();

    if (text) {
        GameState.thoughts.push({
            id: Date.now(),
            text: text,
            date: new Date().toLocaleDateString('ar-EG')
        });
        GameState.save();
        input.value = '';
        renderThoughts();
        showNotification(" تم حفظ الفكرة");
    } else {
        showNotification(" اكتب فكرة أولاً");
    }
}

function renderThoughts() {
    const list = document.getElementById('journalList');
    if (!list) return;

    if (GameState.thoughts.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--muted)">لا توجد أفكار مسجلة بعد.</p>';
        return;
    }

    list.innerHTML = GameState.thoughts.map((t, idx) => `
        <div class="journal-entry">
            <span class="journal-date">${t.date}</span>
            <p class="journal-text">"${escapeHTML(t.text)}"</p>
            <div class="journal-actions">
                <button class="journal-btn journal-btn-battle" onclick="battleJournalThought(${idx})"> واجه الفكرة</button>
                <button class="journal-btn journal-btn-delete" onclick="deleteThought(${idx})"> حذف</button>
            </div>
        </div>
    `).join('');
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function deleteThought(idx) {
    GameState.thoughts.splice(idx, 1);
    GameState.save();
    renderThoughts();
    showNotification(" تم حذف الفكرة");
}

function battleJournalThought(idx) {
    const thought = GameState.thoughts[idx];
    if (!thought) return;
    const enemy = {
        name: "فكرة مسجلة",
        avatar: "",
        type: "فكرة سلبية",
        health: 100,
        attacks: [thought.text, "أنا حقيقة لا مفر منها.", "لن تتخلص مني."]
    };
    startBattle(enemy);
}

// ==================== AI CUSTOM BATTLE ====================
async function generateAIEnemy() {
    const input = document.getElementById('customFearInput').value.trim();

    if (!input) {
        showNotification(" اكتب شيئاً يقلقك أولاً");
        return;
    }

    const btn = document.getElementById('generateEnemyBtn');
    const txt = document.getElementById('genBtnText');
    const loader = document.getElementById('genLoader');

    btn.disabled = true;
    txt.textContent = "جاري استحضار الوحش...";
    loader.style.display = "inline-block";

    const enemy = await AIService.generateEnemy(input);

    btn.disabled = false;
    txt.textContent = " استدعاء الوحش";
    loader.style.display = "none";

    if (enemy) {
        document.getElementById('customFearInput').value = '';
        startBattle(enemy);
        showNotification(" الوحش استُحضر بنجاح!");
    } else {
        showNotification(" حدث خطأ في الاتصال");
    }
}

// ==================== BATTLE LOGIC ====================
function startQuickBattle() {
    const pool = [...RegularEnemies, ...ProgrammingEnemies];
    const enemy = pool[Math.floor(Math.random() * pool.length)];
    startBattle(enemy);
}

function startStudySession() {
    if (!GameState.activeTech) {
        showNotification(" اختر مساراً أولاً");
        return;
    }

    const enemy = ProgrammingEnemies[Math.floor(Math.random() * ProgrammingEnemies.length)];
    startBattle(enemy, false, true);
}

function startBattle(enemyData, isBoss = false, isStudy = false) {
    GameState.currentBattle = {
        enemy: JSON.parse(JSON.stringify(enemyData)),
        playerHealth: 100,
        isBoss,
        isStudy,
        phase: 0,
        currentAttack: ""
    };

    const health = isBoss ? enemyData.phases[0].health : enemyData.health;
    GameState.currentBattle.enemy.currentHealth = health;
    GameState.currentBattle.enemy.maxHealth = health;

    showScreen('battleScreen');
    updateBattleUI();

    document.getElementById('enemyAvatar').textContent = enemyData.avatar;
    document.getElementById('enemyName').textContent = enemyData.name;
    document.getElementById('enemyType').textContent = enemyData.type || "تحدي";
    document.getElementById('battleLog').innerHTML = '';
    document.getElementById('responseOptions').innerHTML = '';

    const phInd = document.getElementById('phaseIndicator');
    if (isBoss && enemyData.phases) {
        phInd.style.display = 'flex';
        phInd.innerHTML = enemyData.phases.map((_, i) =>
            `<div class="phase-dot ${i === 0 ? 'active' : ''}"></div>`
        ).join('');
    } else {
        phInd.style.display = 'none';
    }

    enemyTurn();
}

function enemyTurn() {
    const state = GameState.currentBattle;
    if (!state) return;

    let attacks;
    if (state.isBoss && state.enemy.phases && state.enemy.phases[state.phase]) {
        attacks = state.enemy.phases[state.phase].attacks;
    } else {
        attacks = state.enemy.attacks;
    }

    if (!attacks || attacks.length === 0) {
        attacks = ["أنت لن تنجح."];
    }

    const attack = attacks[Math.floor(Math.random() * attacks.length)];
    state.currentAttack = attack;

    document.getElementById('dialogueSpeaker').textContent = state.enemy.name;
    document.getElementById('dialogueText').textContent = attack;
    document.getElementById('dialogueText').className = "dialogue-text negative";

    logBattle("enemy", `${state.enemy.name}: ${attack}`);

    renderResponses([
        { text: "هذا غير دقيق، لدي أدلة عكس ذلك.", type: "logical", dmg: 20 },
        { text: "أقبل وجود هذا الشعور، لكنني سأكمل.", type: "acceptance", dmg: 15 },
        { text: "يمكنني رؤية الأمر بطريقة إيجابية.", type: "reframe", dmg: 25 }
    ]);

    document.getElementById('aiAssistBtn').style.display = 'flex';
}

async function getAIHelp() {
    const state = GameState.currentBattle;
    if (!state) return;

    const btn = document.getElementById('aiAssistBtn');
    const loader = document.getElementById('aiAssistLoader');

    btn.disabled = true;
    loader.style.display = 'block';

    const newResponses = await AIService.getAdvice(state.enemy.name, state.currentAttack);

    btn.disabled = false;
    loader.style.display = 'none';

    if (newResponses && newResponses.length > 0) {
        renderResponses(newResponses);
        showNotification(" تم توليد ردود ذكية!");
        btn.style.display = 'none';
    } else {
        showNotification(" لم أستطع توليد ردود، حاول مجدداً");
    }
}

function renderResponses(responses) {
    const container = document.getElementById('responseOptions');
    container.innerHTML = '';

    responses.forEach(r => {
        const btn = document.createElement('div');
        btn.className = 'response-btn';
        btn.setAttribute('role', 'button');
        btn.setAttribute('tabindex', '0');

        let icon = "";
        if (r.type === 'logical') icon = "";
        if (r.type === 'reframe') icon = "";
        if (r.type === 'acceptance') icon = "";

        const dmg = Math.max(0, parseInt(r.dmg) || 20);

        btn.innerHTML = `
            <div class="response-type">${icon} ${getTypeName(r.type)}</div>
            <div>${escapeHTML(r.text)}</div>
            <div style="margin-top:5px"><span class="stat-tag damage"> ${dmg} ضرر</span></div>
        `;
        const handleClick = () => playerTurn({ ...r, dmg });
        btn.onclick = handleClick;
        btn.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); }
        };
        container.appendChild(btn);
    });
}

function getTypeName(t) {
    const map = {
        'logical': 'منطقي',
        'reframe': 'إعادة صياغة',
        'acceptance': 'تقبل'
    };
    return map[t] || 'رد';
}

function playerTurn(resp) {
    const state = GameState.currentBattle;
    if (!state) return;

    state.enemy.currentHealth -= resp.dmg;
    state.playerHealth = Math.min(100, state.playerHealth + 5);
    updateBattleUI();

    document.getElementById('dialogueSpeaker').textContent = "أنت";
    document.getElementById('dialogueText').textContent = resp.text;
    document.getElementById('dialogueText').className = "dialogue-text positive";
    logBattle("player", `أنت: ${resp.text}`);

    document.getElementById('aiAssistBtn').style.display = 'none';
    // منع النقر المتعدد
    document.getElementById('responseOptions').innerHTML = '';

    if (state.enemy.currentHealth <= 0) {
        if (state.isBoss && state.enemy.phases && state.phase < state.enemy.phases.length - 1) {
            setTimeout(nextPhase, 1500);
        } else {
            setTimeout(victory, 1500);
        }
    } else {
        setTimeout(() => {
            const dmg = Math.floor(Math.random() * 15) + 5;
            state.playerHealth -= dmg;
            updateBattleUI();

            if (state.playerHealth <= 0) {
                defeat();
            } else {
                enemyTurn();
            }
        }, 1500);
    }
}

function nextPhase() {
    const state = GameState.currentBattle;
    if (!state || !state.enemy.phases) return;

    state.phase++;
    const p = state.enemy.phases[state.phase];
    if (!p) return;

    state.enemy.currentHealth = p.health;
    state.enemy.maxHealth = p.health;

    document.querySelectorAll('.phase-dot').forEach((d, i) => {
        d.className = `phase-dot ${i === state.phase ? 'active' : ''}`;
    });

    showNotification(` المرحلة ${state.phase + 1}`);
    setTimeout(enemyTurn, 1000);
}

function victory() {
    GameState.stats.wins++;
    updateStreak();

    if (GameState.currentBattle && GameState.currentBattle.isStudy) {
        gainXP(50);
    }

    // إضافة ألقاب
    const titleChecks = [
        { wins: 1,  title: " بداية الطريق" },
        { wins: 5,  title: " صائد الأفكار" },
        { wins: 10, title: " فارس الأفكار" },
        { wins: 25, title: " محارب لا يُقهر" },
        { wins: 50, title: " أسطورة الأفكار" }
    ];

    titleChecks.forEach(({ wins, title }) => {
        if (GameState.stats.wins >= wins && !GameState.titles.includes(title)) {
            GameState.titles.push(title);
        }
    });

    GameState.save();
    const isStudy = GameState.currentBattle && GameState.currentBattle.isStudy;
    showResult(" انتصار!", "لقد هزمت الفكرة السلبية بذكاء!", isStudy ? "+50 XP " : "");
}

function defeat() {
    showResult(" محاولة جيدة", "لا تيأس، الأفكار تحتاج تكراراً لتهزمها. حاول مجدداً!");
}

function showResult(title, msg, extra = "") {
    showScreen('resultScreen');
    document.getElementById('resultTitle').textContent = title;
    document.getElementById('resultMessage').textContent = msg;
    document.getElementById('resultIcon').textContent = title.includes("انتصار") ? "" : "";

    const xp = document.getElementById('xpGain');
    xp.style.display = extra ? 'block' : 'none';
    xp.textContent = extra;
}

// ==================== STATS & STUDY ====================
function selectTech(techName, element) {
    GameState.activeTech = techName;
    document.querySelectorAll('.tech-card').forEach(c => c.classList.remove('active'));
    if (element) element.classList.add('active');
    showNotification(` تم اختيار ${techName}`);
}

function gainXP(amt) {
    if (!GameState.activeTech) return;

    GameState.xp[GameState.activeTech] += amt;
    const next = GameState.levels[GameState.activeTech] * 100;

    if (GameState.xp[GameState.activeTech] >= next) {
        GameState.xp[GameState.activeTech] -= next;
        GameState.levels[GameState.activeTech]++;
        showNotification(` مستوى جديد في ${GameState.activeTech}!`);
    }

    GameState.save();
    updateStudyUI();
}

function updateStudyUI() {
    ['python', 'web', 'cs'].forEach(t => {
        const xp = GameState.xp[t];
        const lvl = GameState.levels[t];
        const next = lvl * 100;
        const percent = Math.min(100, Math.round((xp / next) * 100));

        const bar = document.getElementById('xp-' + t);
        const label = document.getElementById('lvl-' + t);

        if (bar) bar.style.width = percent + '%';
        if (label) label.textContent = `Lvl ${lvl}`;
    });
}

function updateBattleUI() {
    const state = GameState.currentBattle;
    if (!state) return;

    const enemyPercent = Math.max(0, (state.enemy.currentHealth / state.enemy.maxHealth) * 100);
    const playerPercent = Math.max(0, state.playerHealth);

    document.getElementById('enemyHealthFill').style.width = enemyPercent + '%';
    document.getElementById('playerHealthFill').style.width = playerPercent + '%';
}

function logBattle(type, text) {
    const log = document.getElementById('battleLog');
    if (!log) return;
    const div = document.createElement('div');
    div.className = 'log-entry ' + type;
    div.textContent = text;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

let notificationTimer = null;
function showNotification(msg) {
    const n = document.getElementById('notification');
    if (!n) return;
    n.textContent = msg;
    n.classList.add('show');

    if (notificationTimer) clearTimeout(notificationTimer);
    notificationTimer = setTimeout(() => n.classList.remove('show'), 2500);
}

function renderBossList() {
    const c = document.getElementById('bossList');
    if (!c) return;

    c.innerHTML = '';
    Bosses.forEach((b, index) => {
        const card = document.createElement('div');
        card.className = 'menu-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.innerHTML = `
            <div class="menu-card-icon">${b.avatar}</div>
            <div class="menu-card-title">${b.name}</div>
            <p class="menu-card-desc">${b.desc}</p>
        `;
        card.onclick = () => startBattle(Bosses[index], true, false);
        card.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
        };
        c.appendChild(card);
    });
}

function updateStatsUI() {
    const winsEl = document.getElementById('totalWins');
    const streakEl = document.getElementById('streak');

    if (winsEl) winsEl.textContent = GameState.stats.wins;
    if (streakEl) streakEl.textContent = GameState.stats.streak || 0;
}

function renderTitles() {
    const list = document.getElementById('titlesList');
    const playerTitleDisplay = document.getElementById('playerTitleDisplay');

    if (!list || !playerTitleDisplay) return;

    // منح الألقاب بناءً على الإنجازات
    const titleChecks = [
        { wins: 1,  title: " بداية الطريق" },
        { wins: 5,  title: " صائد الأفكار" },
        { wins: 10, title: " فارس الأفكار" },
        { wins: 25, title: " محارب لا يُقهر" },
        { wins: 50, title: " أسطورة الأفكار" }
    ];

    titleChecks.forEach(({ wins, title }) => {
        if (GameState.stats.wins >= wins && !GameState.titles.includes(title)) {
            GameState.titles.push(title);
        }
    });

    GameState.save();

    list.innerHTML = '';
    GameState.titles.forEach(t => {
        const span = document.createElement('span');
        span.className = 'player-title-badge';
        span.textContent = t;
        list.appendChild(span);
    });

    if (GameState.titles.length > 0) {
        playerTitleDisplay.innerHTML = `<span class="player-title-badge">${GameState.titles[GameState.titles.length - 1]}</span>`;
    } else {
        playerTitleDisplay.innerHTML = '';
    }
}

function surrender() {
    if (confirm("هل تريد حقاً الانسحاب من المعركة؟")) {
        defeat();
    }
}

console.log(" FikraWar v2 loaded successfully!");
