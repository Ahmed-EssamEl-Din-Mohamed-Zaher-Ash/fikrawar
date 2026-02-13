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


// ======================================================================
// RESILIENCE HUB - NEW SECTION
// ======================================================================

// ==================== RESILIENCE HUB ====================

function showResilienceHub() {
    showScreen("resilienceHubScreen");
}

// ==================== 1. NERVOUS SYSTEM RADAR ====================
function showNervousRadar() {
    showScreen("nervousRadarScreen");
    document.querySelectorAll('input[name="symptom"]').forEach(function(cb) { cb.checked = false; });
    document.getElementById("radarResult").style.display = "none";
    document.getElementById("breathingExercise").style.display = "none";
}

async function analyzeNervousState() {
    var checked = [];
    document.querySelectorAll('input[name="symptom"]:checked').forEach(function(cb) { checked.push(cb.value); });
    if (checked.length === 0) { showNotification("اختر عرضاً واحداً على الأقل"); return; }

    var sympMap = {
        heartfast: "ضربات قلب سريعة",
        muscletense: "شد عضلي",
        breathing: "صعوبة تنفس",
        numb: "تنميل أو برودة",
        dizzy: "دوخة",
        stomach: "اضطراب معدة",
        shake: "رجفة",
        frozen: "تجمد تام"
    };
    var sympText = checked.map(function(k) { return sympMap[k] || k; }).join(", ");

    var btn = document.getElementById("radarAnalyzeBtn");
    var txt = document.getElementById("radarBtnText");
    var loader = document.getElementById("radarLoader");
    btn.disabled = true;
    txt.textContent = "جاري التحليل...";
    loader.style.display = "inline-block";

    var prompt = "أنت معالج نفسي متخصص في علم الأعصاب. المستخدم يشعر ب: " + sympText + "\n\n" +
        "حلّل هل هو في حالة تجمد (freeze) أو هروب (flight) أو قتال (fight).\n" +
        "ارجع JSON فقط (بدون markdown):\n" +
        JSON.stringify({
            state: "تجمد/هروب/قتال",
            stateEn: "freeze/flight/fight",
            explanation: "شرح بسيط بالعربية للحالة",
            exercise: "تمرين تنفس أو تأريض مناسب بالعربية",
            tip: "نصيحة قصيرة"
        })
    ;

    var result = await AIService.call(prompt);
    btn.disabled = false;
    txt.textContent = "📡 تحليل الحالة";
    loader.style.display = "none";

    var parsed = AIService._parseJSON(result);
    if (!parsed) {
        parsed = { state: "تجمد", stateEn: "freeze", explanation: "يبدو أن جهازك العصبي في حالة تنبيه.", exercise: "تنفس بطيء: شهيق 4 ثوان، حبس 4 ثوان، زفير 4 ثوان.", tip: "تذكر: هذا مؤقت وسيمر." };
    }

    var stateClass = "state-freeze";
    if (parsed.stateEn === "flight") stateClass = "state-flight";
    if (parsed.stateEn === "fight") stateClass = "state-fight";

    var resultDiv = document.getElementById("radarResult");
    resultDiv.style.display = "block";
    resultDiv.innerHTML = '<div class="radar-state-badge ' + stateClass + '">' + parsed.state + '</div>' +
        '<p style="margin-bottom:12px">' + escapeHTML(parsed.explanation) + '</p>' +
        '<p style="color:var(--accent);font-weight:700">🌿 ' + escapeHTML(parsed.exercise) + '</p>' +
        '<p style="color:var(--gold);margin-top:10px">💡 ' + escapeHTML(parsed.tip) + '</p>';

    document.getElementById("breathingExercise").style.display = "block";
}

var breathingInterval = null;
function startBreathingExercise() {
    var circle = document.getElementById("breathingCircle");
    var textEl = document.getElementById("breathingText");
    var timerEl = document.getElementById("breathingTimer");
    var btn = document.getElementById("startBreathBtn");
    btn.disabled = true;
    var totalTime = 30;
    var elapsed = 0;
    var phases = [
        { name: "شهيق", cls: "inhale", dur: 4 },
        { name: "حبس", cls: "hold", dur: 4 },
        { name: "زفير", cls: "exhale", dur: 4 }
    ];
    var phaseIdx = 0;
    var phaseTime = 0;

    if (breathingInterval) clearInterval(breathingInterval);
    breathingInterval = setInterval(function() {
        elapsed++;
        phaseTime++;
        var remaining = totalTime - elapsed;
        timerEl.textContent = remaining + " ثانية";

        var p = phases[phaseIdx];
        circle.className = "breathing-circle " + p.cls;
        textEl.textContent = p.name + " (" + (p.dur - phaseTime + 1) + ")";

        if (phaseTime >= p.dur) {
            phaseTime = 0;
            phaseIdx = (phaseIdx + 1) % phases.length;
        }

        if (elapsed >= totalTime) {
            clearInterval(breathingInterval);
            circle.className = "breathing-circle";
            textEl.textContent = "✅ أحسنت!";
            timerEl.textContent = "انتهى";
            btn.disabled = false;
            showNotification("🌿 أحسنت! جهازك العصبي أهدأ الآن");
        }
    }, 1000);
}

// ==================== 2. BEHAVIORAL EXPERIMENT LAB ====================
var currentExperimentBelief = "";
function showBehaviorLab() {
    showScreen("behaviorLabScreen");
    document.getElementById("labStep1").style.display = "block";
    document.getElementById("labExperiment").style.display = "none";
    document.getElementById("labStep2").style.display = "none";
    document.getElementById("labComparison").style.display = "none";
    document.getElementById("labBeliefInput").value = "";
}

async function designExperiment() {
    var belief = document.getElementById("labBeliefInput").value.trim();
    if (!belief) { showNotification("اكتب الفكرة المقيدة أولاً"); return; }
    currentExperimentBelief = belief;

    var btn = document.getElementById("labDesignBtn");
    var txt = document.getElementById("labBtnText");
    var loader = document.getElementById("labLoader");
    btn.disabled = true;
    txt.textContent = "جاري تصميم التجربة...";
    loader.style.display = "inline-block";

    var prompt = "أنت معالج CBT. المستخدم لديه فكرة مقيدة: \"" + belief + "\"\n" +
        "صمم تجربة سلوكية صغيرة لاختبار هذه الفكرة.\nارجع JSON فقط:\n" +
        JSON.stringify({
            experiment: "وصف التجربة بالعربية",
            steps: ["خطوة 1", "خطوة 2", "خطوة 3"],
            prediction: "ماذا تتوقع أن يحدث حسب الفكرة السلبية",
            realistic: "ما الأرجح أن يحدث فعلاً"
        })
    ;

    var result = await AIService.call(prompt);
    btn.disabled = false;
    txt.textContent = "🧪 صمّم التجربة";
    loader.style.display = "none";

    var parsed = AIService._parseJSON(result);
    if (!parsed) {
        parsed = { experiment: "جرب القيام بخطوة صغيرة مما تخشاه", steps: ["اختر موقفاً بسيطاً", "نفذه خلال 24 ساعة", "سجل النتيجة"], prediction: "سأفشل", realistic: "الأرجح أنه سيمر بشكل طبيعي" };
    }

    var labDiv = document.getElementById("labExperiment");
    var stepsHTML = (parsed.steps || []).map(function(s, i) { return '<div class="experiment-step">' + (i+1) + ". " + escapeHTML(s) + "</div>"; }).join("");
    labDiv.innerHTML = '<h3>🧪 ' + escapeHTML(parsed.experiment) + '</h3>' + stepsHTML +
        '<p style="color:var(--danger);margin-top:12px">😨 توقعك السلبي: ' + escapeHTML(parsed.prediction) + '</p>' +
        '<p style="color:var(--accent)">🌟 الأرجح: ' + escapeHTML(parsed.realistic) + '</p>';
    labDiv.style.display = "block";
    document.getElementById("labStep2").style.display = "block";
    window._labPrediction = parsed.prediction;
    window._labRealistic = parsed.realistic;
}

function recordExperimentResult() {
    var result = document.getElementById("labResultInput").value.trim();
    if (!result) { showNotification("اكتب ماذا حدث فعلاً"); return; }

    var compDiv = document.getElementById("labComparison");
    compDiv.innerHTML = '<h3 style="color:var(--accent);margin-bottom:10px">📊 المقارنة</h3>' +
        '<div class="comparison-row">' +
        '<div class="comp-box prediction"><div class="comp-label">😨 توقعك السلبي</div><p>' + escapeHTML(window._labPrediction || "") + '</p></div>' +
        '<div class="comp-box reality"><div class="comp-label">✅ ما حدث فعلاً</div><p>' + escapeHTML(result) + '</p></div>' +
        '</div>' +
        '<p style="color:var(--gold);text-align:center;margin-top:15px;font-weight:700">💡 هل لاحظت الفرق؟ الأفكار السلبية غالباً تبالغ في التوقعات.</p>';
    compDiv.style.display = "block";
    document.getElementById("labStep2").style.display = "none";
    showNotification("✅ أحسنت! هذا دليل ضد الفكرة السلبية");
}

// ==================== 3. CORE BELIEF WELL ====================
var wellHistory = [];
var wellDepth = 0;
function showCoreBeliefWell() {
    showScreen("coreBeliefScreen");
    wellHistory = [];
    wellDepth = 0;
    document.getElementById("wellChat").innerHTML = "";
    document.getElementById("wellInput").value = "";
    document.getElementById("wellBtnText").textContent = "⬇️ ابدأ الغوص";
    document.getElementById("wellInput").placeholder = "اكتب الفكرة التلقائية (مثلاً: أخطأت في الكود)";
}

function wellAddMsg(text, type) {
    var chat = document.getElementById("wellChat");
    var div = document.createElement("div");
    div.className = "well-msg " + type;
    div.textContent = text;
    chat.appendChild(div);
    if (type === "ai" && wellDepth > 0) {
        var arrow = document.createElement("div");
        arrow.className = "well-arrow";
        arrow.textContent = "⬇️";
        chat.appendChild(arrow);
    }
    chat.scrollTop = chat.scrollHeight;
}

async function wellSendMessage() {
    var input = document.getElementById("wellInput");
    var text = input.value.trim();
    if (!text) { showNotification("اكتب إجابتك"); return; }

    wellAddMsg(text, "user");
    wellHistory.push(text);
    wellDepth++;
    input.value = "";

    var btn = document.getElementById("wellSendBtn");
    var txt = document.getElementById("wellBtnText");
    var loader = document.getElementById("wellLoader");
    btn.disabled = true;
    txt.textContent = "جاري الغوص...";
    loader.style.display = "inline-block";

    var historyText = wellHistory.map(function(h, i) { return "المستوى " + (i+1) + ": " + h; }).join("\n");
    var prompt = "أنت معالج CBT تستخدم تقنية السهم الهابط (Downward Arrow).\n" +
        "المستخدم غاص " + wellDepth + " مستويات:\n" + historyText + "\n\n" +
        "إذا كان العمق < 4، اسأل \"وماذا يعني هذا عنك؟\" بصيغة مختلفة.\n" +
        "إذا كان العمق >= 4، حدد المعتقد الجوهري وواجهه.\n" +
        "ارجع JSON فقط:\n" +
        JSON.stringify({ question: "السؤال التالي أو فارغ", coreBelief: "المعتقد الجوهري إذا وصلنا أو فارغ", challenge: "مواجهة المعتقد إذا وصلنا أو فارغ" })
    ;

    var result = await AIService.call(prompt);
    btn.disabled = false;
    loader.style.display = "none";

    var parsed = AIService._parseJSON(result);
    if (!parsed) {
        parsed = wellDepth < 4 ? { question: "وماذا يعني هذا عنك كشخص؟", coreBelief: "", challenge: "" } : { question: "", coreBelief: "أنا غير كفء", challenge: "هذا معتقد وليس حقيقة. لديك إنجازات تثبت عكس ذلك." };
    }

    if (parsed.coreBelief && parsed.coreBelief.length > 0) {
        wellAddMsg("🎯 المعتقد الجوهري: " + parsed.coreBelief, "core");
        if (parsed.challenge) {
            wellAddMsg("💪 المواجهة: " + parsed.challenge, "ai");
        }
        txt.textContent = "✅ اكتمل الغوص!";
        input.placeholder = "اكتمل! يمكنك البدء من جديد";
        wellHistory = [];
        wellDepth = 0;
        showNotification("🎯 وصلنا للجذر!");
    } else if (parsed.question) {
        wellAddMsg(parsed.question, "ai");
        txt.textContent = "⬇️ أجب واغوص أكثر";
        input.placeholder = "أجب على السؤال...";
    }
}

// ==================== 4. SCENARIO SIMULATOR ====================
var simState = { messages: [], scenario: "", round: 0 };
function showScenarioSim() {
    showScreen("scenarioSimScreen");
    simState = { messages: [], scenario: "", round: 0 };
    document.getElementById("simSetup").style.display = "block";
    document.getElementById("simChatSection").style.display = "none";
    document.getElementById("simChat").innerHTML = "";
    document.getElementById("simScenarioInput").value = "";
}

function simAddMsg(text, type) {
    var chat = document.getElementById("simChat");
    var div = document.createElement("div");
    div.className = "sim-msg " + type;
    div.innerHTML = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

async function startScenarioSim() {
    var scenario = document.getElementById("simScenarioInput").value.trim();
    if (!scenario) { showNotification("اكتب الموقف الذي تخشاه"); return; }

    simState.scenario = scenario;
    simState.round = 0;
    simState.messages = [];
    document.getElementById("simSetup").style.display = "none";
    document.getElementById("simChatSection").style.display = "block";
    document.getElementById("simChat").innerHTML = "";

    var startBtn = document.getElementById("simStartBtn");
    startBtn.disabled = true;
    startBtn.querySelector(".btn-text").textContent = "جاري التحضير...";

    var prompt = "أنت محاكي مواقف CBT. المستخدم يخشى هذا الموقف: \"" + scenario + "\"\n" +
        "ابدأ المحاكاة. العب دور الشخص الآخر في الموقف. ابدأ بجملة افتتاحية واقعية.\n" +
        "ارجع JSON:\n" + JSON.stringify({ dialogue: "جملة الشخص الآخر", tip: "نصيحة CBT للرد" })
    ;

    var result = await AIService.call(prompt);
    startBtn.disabled = false;
    startBtn.querySelector(".btn-text").textContent = "🎭 ابدأ المحاكاة";

    var parsed = AIService._parseJSON(result);
    if (!parsed) { parsed = { dialogue: "مرحباً، كيف يمكنني مساعدتك؟", tip: "خذ نفساً عميقاً وارد بهدوء" }; }

    simState.messages.push({ role: "other", text: parsed.dialogue });
    simAddMsg("🎭 " + escapeHTML(parsed.dialogue), "other");
    if (parsed.tip) {
        simAddMsg("💡 " + escapeHTML(parsed.tip), "tip");
    }
}

async function sendSimResponse() {
    var input = document.getElementById("simResponseInput");
    var text = input.value.trim();
    if (!text) { showNotification("اكتب ردك"); return; }

    simState.round++;
    simState.messages.push({ role: "user", text: text });
    simAddMsg(escapeHTML(text), "user");
    input.value = "";

    if (simState.round >= 4) {
        endScenarioSim();
        return;
    }

    var sendBtn = document.getElementById("simSendBtn");
    sendBtn.disabled = true;

    var historyText = simState.messages.map(function(m) { return (m.role === "user" ? "أنت" : "الآخر") + ": " + m.text; }).join("\n");
    var prompt = "أنت محاكي مواقف CBT. الموقف: \"" + simState.scenario + "\"\n" +
        "الحوار حتى الآن:\n" + historyText + "\n\n" +
        "استمر في دور الشخص الآخر. ارجع JSON:\n" +
        JSON.stringify({ dialogue: "رد الشخص الآخر", tip: "نصيحة CBT" })
    ;

    var result = await AIService.call(prompt);
    sendBtn.disabled = false;

    var parsed = AIService._parseJSON(result);
    if (!parsed) { parsed = { dialogue: "فهمت. أكمل...", tip: "أحسنت، استمر!" }; }

    simState.messages.push({ role: "other", text: parsed.dialogue });
    simAddMsg("🎭 " + escapeHTML(parsed.dialogue), "other");
    if (parsed.tip) {
        simAddMsg("💡 " + escapeHTML(parsed.tip), "tip");
    }
}

async function endScenarioSim() {
    var historyText = simState.messages.map(function(m) { return (m.role === "user" ? "أنت" : "الآخر") + ": " + m.text; }).join("\n");
    var prompt = "أنت معالج CBT. هذا حوار محاكاة موقف: \"" + simState.scenario + "\"\n" +
        historyText + "\n\nقيّم أداء المستخدم. ارجع JSON:\n" +
        JSON.stringify({ score: "8/10", strengths: ["نقطة قوة"], improvements: ["ما يمكن تحسينه"], encouragement: "رسالة تشجيعية" })
    ;

    simAddMsg("🏁 انتهت المحاكاة! جاري التقييم...", "system");
    document.getElementById("simResponseSection").style.display = "none";

    var result = await AIService.call(prompt);
    var parsed = AIService._parseJSON(result);
    if (!parsed) { parsed = { score: "7/10", strengths: ["حاولت التعامل بشجاعة"], improvements: ["حاول التعبير عن مشاعرك أكثر"], encouragement: "أحسنت! كل محاولة تزيد ثقتك." }; }

    var feedbackHTML = '<div style="text-align:center;margin:15px 0">' +
        '<div style="font-size:2.5rem;color:var(--gold)">' + escapeHTML(parsed.score || "7/10") + '</div>' +
        '<div style="color:var(--accent);font-weight:700;margin:10px 0">نقاط القوة:</div>';
    (parsed.strengths || []).forEach(function(s) { feedbackHTML += '<div style="color:var(--success)">✅ ' + escapeHTML(s) + '</div>'; });
    feedbackHTML += '<div style="color:var(--gold);font-weight:700;margin:10px 0">للتحسين:</div>';
    (parsed.improvements || []).forEach(function(s) { feedbackHTML += '<div style="color:var(--danger)">🔧 ' + escapeHTML(s) + '</div>'; });
    if (parsed.encouragement) {
        feedbackHTML += '<div style="color:var(--accent);margin-top:15px;font-size:1.1rem">💪 ' + escapeHTML(parsed.encouragement) + '</div>';
    }
    feedbackHTML += '</div>';
    simAddMsg(feedbackHTML, "feedback");
    showNotification("🏆 أحسنت! كل تدريب يزيد ثقتك");
}

// ==================== 5. LOGIC DECONSTRUCTOR ====================
function showLogicDeconstructor() {
    showScreen("logicDeconScreen");
    document.getElementById("deconInput").value = "";
    document.getElementById("deconResult").innerHTML = "";
    document.getElementById("deconResult").style.display = "none";
}

async function deconstructStatement() {
    var statement = document.getElementById("deconInput").value.trim();
    if (!statement) { showNotification("اكتب جملة التعميم"); return; }

    var btn = document.getElementById("deconBtn");
    var txt = document.getElementById("deconBtnText");
    var loader = document.getElementById("deconLoader");
    btn.disabled = true;
    txt.textContent = "جاري التفكيك...";
    loader.style.display = "inline-block";

    var prompt = "أنت معالج CBT. المستخدم قال: \"" + statement + "\"\n" +
        "هذه جملة تعميم (دائماً/أبداً/كل/لا أحد). فككها منطقياً.\n" +
        "ارجع JSON فقط:\n" +
        JSON.stringify({
            original: "الجملة الأصلية",
            generalization_type: "نوع التعميم",
            evidence_for: ["دليل يدعمها"],
            evidence_against: ["دليل يناقضها"],
            exceptions: ["استثناءات"],
            balanced: "جملة متوازنة بديلة"
        })
    ;

    var result = await AIService.call(prompt);
    btn.disabled = false;
    txt.textContent = "🔬 فكّك الجملة";
    loader.style.display = "none";

    var parsed = AIService._parseJSON(result);
    if (!parsed) {
        parsed = { original: statement, generalization_type: "تعميم مفرط", evidence_for: ["ربما حدث مرة أو مرتين"], evidence_against: ["لكن ليس دائماً"], exceptions: ["فكر في المرات التي لم يحدث فيها"], balanced: "أحياناً يحدث هذا، لكن ليس دائماً" };
    }

    var resDiv = document.getElementById("deconResult");
    var html = '<div class="decon-original">🗣️ ' + escapeHTML(parsed.original || statement) + '</div>';
    html += '<div class="decon-type">نوع التشوه: ' + escapeHTML(parsed.generalization_type || "") + '</div>';

    html += '<div class="decon-section"><div class="decon-section-title">✅ أدلة مؤيدة</div>';
    (parsed.evidence_for || []).forEach(function(e) { html += '<div class="decon-item for">' + escapeHTML(e) + '</div>'; });
    html += '</div>';

    html += '<div class="decon-section"><div class="decon-section-title">❌ أدلة معارضة</div>';
    (parsed.evidence_against || []).forEach(function(e) { html += '<div class="decon-item against">' + escapeHTML(e) + '</div>'; });
    html += '</div>';

    html += '<div class="decon-section"><div class="decon-section-title">✨ استثناءات</div>';
    (parsed.exceptions || []).forEach(function(e) { html += '<div class="decon-item exception">' + escapeHTML(e) + '</div>'; });
    html += '</div>';

    html += '<div class="decon-balanced">⚖️ الجملة المتوازنة: ' + escapeHTML(parsed.balanced || "") + '</div>';
    resDiv.innerHTML = html;
    resDiv.style.display = "block";
}

// ==================== 6. MICRO-ACTION BUDDY ====================
var currentMicroAction = "";
function showMicroAction() {
    showScreen("microActionScreen");
    document.getElementById("microStateInput").value = "";
    document.getElementById("microActionCard").style.display = "none";
    document.getElementById("microCelebration").style.display = "none";
}

async function getMicroAction() {
    var state = document.getElementById("microStateInput").value.trim();
    if (!state) { showNotification("اكتب حالتك الحالية"); return; }

    var btn = document.getElementById("microGetBtn");
    var txt = document.getElementById("microBtnText");
    var loader = document.getElementById("microLoader");
    btn.disabled = true;
    txt.textContent = "جاري التفكير...";
    loader.style.display = "inline-block";

    var prompt = "أنت رفيق CBT. المستخدم يشعر ب: \"" + state + "\"\n" +
        "أعطه خطوة جسدية صغيرة جداً (مجهرية) يمكنه فعلها الآن في 30 ثانية أو أقل.\n" +
        "ارجع JSON:\n" +
        JSON.stringify({ action: "الخطوة المجهرية", why: "لماذا تساعد", duration: "المدة بالثواني", encouragement: "رسالة تشجيع" })
    ;

    var result = await AIService.call(prompt);
    btn.disabled = false;
    txt.textContent = "🦶 أعطني خطوة";
    loader.style.display = "none";

    var parsed = AIService._parseJSON(result);
    if (!parsed) {
        parsed = { action: "اضغط على يديك بقوة لمدة 5 ثواني", why: "يعيد انتباهك للجسد", duration: "5", encouragement: "أنت تفعل شيئاً لنفسك!" };
    }

    currentMicroAction = parsed.action || "";
    var card = document.getElementById("microActionCard");
    card.innerHTML = '<div class="micro-action-icon">🦶</div>' +
        '<div class="micro-action-text">' + escapeHTML(parsed.action || "") + '</div>' +
        '<div class="micro-action-why">💡 ' + escapeHTML(parsed.why || "") + '</div>' +
        '<div class="micro-action-duration">⏱️ ' + escapeHTML(parsed.duration || "10") + ' ثانية</div>' +
        '<button class="btn btn-accent" onclick="completeMicroAction()" style="margin-top:15px">✅ أنجزتها!</button>';
    card.style.display = "block";
    document.getElementById("microCelebration").style.display = "none";
}

function completeMicroAction() {
    var celeb = document.getElementById("microCelebration");
    celeb.innerHTML = '<div class="micro-celebration-emoji">🎉</div>' +
        '<div class="micro-celebration-text">رائع! خطوة صغيرة = تغيير كبير</div>' +
        '<div style="color:var(--text-secondary);margin-top:8px">عقلك الآن يعرف أنك تستطيع التحرك رغم الإحساس</div>';
    celeb.style.display = "block";
    document.getElementById("microActionCard").style.display = "none";
    showNotification("🎉 أحسنت! هذه هي البداية");
}

