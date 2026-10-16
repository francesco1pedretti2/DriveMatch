const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// --- CANVAS PARTICELLE ---
const canvas = document.getElementById('techCanvas');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, rafCanvas = null;
const particles = [];

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor() {
        this.x = Math.random() * W; this.y = Math.random() * H;
        this.vx = (Math.random() - 0.5) * 0.8; this.vy = (Math.random() - 0.5) * 0.8;
        this.size = Math.random() * 2 + 1; this.alpha = Math.random() * 0.5 + 0.2;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        if (this.x < 0 || this.x > W) this.vx *= -1;
        if (this.y < 0 || this.y > H) this.vy *= -1;
    }
    draw() {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 240, 255, ${this.alpha * 0.12})`; ctx.fill();
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 240, 255, ${this.alpha})`; ctx.fill();
    }
}
for (let i = 0; i < 40; i++) particles.push(new Particle());

function drawFrame(move) {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { if (move) p.update(); p.draw(); });
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const d = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
            if (d < 130) {
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.strokeStyle = `rgba(0, 240, 255, ${0.15 * (1 - d / 130)})`;
                ctx.lineWidth = 0.8; ctx.stroke();
            }
        }
    }
}
function animateCanvas() { drawFrame(true); rafCanvas = requestAnimationFrame(animateCanvas); }
function startCanvas() {
    cancelAnimationFrame(rafCanvas);
    if (reduceMotion.matches) drawFrame(false); else animateCanvas();
}
startCanvas();
reduceMotion.addEventListener('change', startCanvas);
document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(rafCanvas); else startCanvas();
});

// --- EFFETTO MAGNETICO ---
let magnets = [];
// da richiamare anche dopo aver creato pulsanti dinamici
function initMagnets() {
    magnets = [...document.querySelectorAll('.magnet-wrapper')]
        .map(el => ({ el, btn: el.querySelector('.apple-glass-btn'), x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, rest: true }))
        .filter(m => m.btn);
}
initMagnets();

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
            const rect = m.el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2 - m.x;
            const cy = rect.top + rect.height / 2 - m.y;
            const dx = mouse.x - cx, dy = mouse.y - cy;
            const dist = Math.hypot(dx, dy);
            if (dist < attractionRadius) {
                const p = (attractionRadius - dist) / attractionRadius;
                m.tx = dx * p * 0.45; m.ty = dy * p * 0.45;
                m.btn.style.setProperty('--mouse-x', `${((mouse.x - rect.left) / rect.width) * 100}%`);
                m.btn.style.setProperty('--mouse-y', `${((mouse.y - rect.top) / rect.height) * 100}%`);
            }
        }
        m.vx = (m.vx + (m.tx - m.x) * stiffness) * damping;
        m.vy = (m.vy + (m.ty - m.y) * stiffness) * damping;
        m.x += m.vx; m.y += m.vy;

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

// --- TOAST ---
let toastTimer = null;
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const styles = {
        success: ['fa-solid fa-circle-check text-emerald-400', 'rgba(52, 211, 153, 0.5)'],
        error:   ['fa-solid fa-circle-exclamation text-rose-400', 'rgba(251, 113, 133, 0.6)'],
        info:    ['fa-solid fa-circle-info text-cyan-400', 'rgba(56, 189, 248, 0.4)']
    };
    const [iconClass, border] = styles[type] || styles.info;
    document.getElementById('toastMsg').textContent = message;
    document.getElementById('toastIcon').className = iconClass;
    toast.style.borderColor = border;
    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}
