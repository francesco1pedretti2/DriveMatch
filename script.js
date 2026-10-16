const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// --- CANVAS PARTICLES ---
const canvas = document.getElementById('techCanvas');
const ctx = canvas.getContext('2d');
const particleCount = 40;
let W = 0, H = 0;
let particles = [];
let rafCanvas = null;

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor() {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        this.size = Math.random() * 2 + 1;
        this.alpha = Math.random() * 0.5 + 0.2;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > W) this.vx *= -1;
        if (this.y < 0 || this.y > H) this.vy *= -1;
    }
    draw() {
        // alone finto (molto più leggero di shadowBlur)
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 240, 255, ${this.alpha * 0.12})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 240, 255, ${this.alpha})`;
        ctx.fill();
    }
}

for (let i = 0; i < particleCount; i++) particles.push(new Particle());

function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.hypot(dx, dy);
            if (dist < 130) {
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.strokeStyle = `rgba(0, 240, 255, ${0.15 * (1 - dist / 130)})`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
            }
        }
    }
}

function drawFrame(move) {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { if (move) p.update(); p.draw(); });
    drawConnections();
}

function animateCanvas() {
    drawFrame(true);
    rafCanvas = requestAnimationFrame(animateCanvas);
}

function startCanvas() {
    cancelAnimationFrame(rafCanvas);
    if (reduceMotion.matches) drawFrame(false);   // immagine fissa
    else animateCanvas();
}
startCanvas();
reduceMotion.addEventListener('change', startCanvas);

// Ferma l'animazione quando la scheda non è visibile
document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(rafCanvas);
    else startCanvas();
});

// --- EFFETTO MAGNETICO (un solo listener e un solo loop per tutti i pulsanti) ---
const magnets = [...document.querySelectorAll('.magnet-wrapper')]
    .map(el => ({ el, btn: el.querySelector('.apple-glass-btn'), x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, rest: true }))
    .filter(m => m.btn);

const canMagnet = window.matchMedia('(hover: hover)').matches && !reduceMotion.matches;
const stiffness = 0.08, damping = 0.72, attractionRadius = 250;
let mouse = null;

if (canMagnet) {
    document.addEventListener('mousemove', e => { mouse = { x: e.clientX, y: e.clientY }; });
    document.addEventListener('mouseleave', () => { mouse = null; });
    requestAnimationFrame(updateMagnets);
}

function updateMagnets() {
    for (const m of magnets) {
        m.tx = 0; m.ty = 0;
        if (mouse) {
            const rect = m.el.getBoundingClientRect();           // coordinate viewport
            const cx = rect.left + rect.width / 2 - m.x;         // centro senza lo spostamento attuale
            const cy = rect.top + rect.height / 2 - m.y;
            const dx = mouse.x - cx, dy = mouse.y - cy;
            const dist = Math.hypot(dx, dy);
            if (dist < attractionRadius) {
                const p = (attractionRadius - dist) / attractionRadius;
                m.tx = dx * p * 0.45;
                m.ty = dy * p * 0.45;
                m.btn.style.setProperty('--mouse-x', `${((mouse.x - rect.left) / rect.width) * 100}%`);
                m.btn.style.setProperty('--mouse-y', `${((mouse.y - rect.top) / rect.height) * 100}%`);
            }
        }

        // fisica a molla
        m.vx = (m.vx + (m.tx - m.x) * stiffness) * damping;
        m.vy = (m.vy + (m.ty - m.y) * stiffness) * damping;
        m.x += m.vx;
        m.y += m.vy;

        const still = Math.abs(m.x) < 0.01 && Math.abs(m.y) < 0.01 && Math.abs(m.vx) < 0.01 && Math.abs(m.vy) < 0.01;
        if (still) {
            if (!m.rest) { m.el.style.transform = ''; m.rest = true; }
        } else {
            m.rest = false;
            m.el.style.transform =
                `perspective(800px) translate3d(${m.x}px, ${m.y}px, 0) rotateX(${-m.y * 0.15}deg) rotateY(${m.x * 0.15}deg)`;
        }
    }
    requestAnimationFrame(updateMagnets);
}

// --- TAB LOGIN / REGISTRAZIONE ---
function switchTab(mode) {
    const isLogin = mode === 'login';
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');

    tabLogin.classList.toggle('is-active', isLogin);
    tabRegister.classList.toggle('is-active', !isLogin);
    tabLogin.setAttribute('aria-selected', String(isLogin));
    tabRegister.setAttribute('aria-selected', String(!isLogin));

    document.getElementById('formLogin').classList.toggle('hidden', !isLogin);
    document.getElementById('formRegister').classList.toggle('hidden', isLogin);
}

// --- MOSTRA / NASCONDI PASSWORD ---
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const btn = input.nextElementSibling;
    const icon = btn.querySelector('i');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    icon.classList.toggle('fa-eye', !show);
    icon.classList.toggle('fa-eye-slash', show);
    btn.setAttribute('aria-label', show ? 'Nascondi password' : 'Mostra password');
}

// --- DEMO RAPIDA (nessuna password nel codice) ---
function quickDemo(role) {
    switchTab('login');
    const isBuyer = role === 'buyer';
    document.getElementById('loginUser').value = isBuyer ? 'marco_driver' : 'garage_dealer';
    document.getElementById('loginPassword').value = '';
    showToast(`Accesso demo come ${isBuyer ? 'Acquirente' : 'Venditore'}...`, 'info');
    setTimeout(() => showToast('Accesso autorizzato! Benvenuto in DriveMatch', 'success'), 1000);
}

// --- AUTENTICAZIONE (simulata) ---
function handleAuth(e, mode) {
    e.preventDefault();
    if (mode === 'login') {
        showToast('Autenticazione in corso...', 'info');
        setTimeout(() => showToast('Accesso autorizzato! Benvenuto in DriveMatch', 'success'), 1000);
        return;
    }

    const pass = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regPasswordConfirm').value;
    if (pass.length < 8) {
        showToast('La password deve avere almeno 8 caratteri', 'error');
        return;
    }
    if (pass !== confirm) {
        showToast('Le due password non coincidono', 'error');
        return;
    }
    showToast('Creazione del profilo in corso...', 'info');
    setTimeout(() => {
        showToast('Registrazione completata! Effettua il login.', 'success');
        e.target.reset();
        switchTab('login');
    }, 1200);
}

// --- TOAST ---
let toastTimer = null;
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    const toastIcon = document.getElementById('toastIcon');

    toastMsg.textContent = message;

    const styles = {
        success: ['fa-solid fa-circle-check text-emerald-400', 'rgba(52, 211, 153, 0.5)'],
        error:   ['fa-solid fa-circle-exclamation text-rose-400', 'rgba(251, 113, 133, 0.6)'],
        info:    ['fa-solid fa-circle-info text-cyan-400', 'rgba(56, 189, 248, 0.4)']
    };
    const [iconClass, border] = styles[type] || styles.info;
    toastIcon.className = iconClass;
    toast.style.borderColor = border;

    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    clearTimeout(toastTimer);   // evita che un vecchio timer nasconda il nuovo messaggio
    toastTimer = setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}
