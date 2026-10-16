// Solo la logica specifica della home (il resto è in common.js)
// --- SCHEDA MATCH: barre + contatore all'apertura (unico momento animato) ---
const matchCard = document.getElementById('matchCard');
const matchNum = document.getElementById('matchNum');
const target = 94;

function runMatch() {
    matchCard.classList.add('is-ready');
    if (reduceMotion.matches) { matchNum.textContent = target; return; }
    const start = performance.now(), dur = 1400;
    (function tick(now) {
        const t = Math.min((now - start) / dur, 1);
        matchNum.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(tick);
    })(start);
}
setTimeout(runMatch, 400);

// --- PREFERITI e link segnaposto ---
document.querySelectorAll('.fav').forEach(btn => {
    btn.addEventListener('click', () => {
        const on = btn.classList.toggle('on');
        const icon = btn.querySelector('i');
        icon.classList.toggle('fa-solid', on);
        icon.classList.toggle('fa-regular', !on);
        showToast(on ? 'Aggiunta ai preferiti' : 'Rimossa dai preferiti', on ? 'success' : 'info');
    });
});
document.querySelectorAll('a[data-toast]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); showToast(a.dataset.toast, 'info'); });
});

