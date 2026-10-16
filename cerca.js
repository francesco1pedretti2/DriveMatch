// Usa l'archivio modelli di data.js (MODELS, FUEL, BODY, GEAR, eur, useScore)
const $ = id => document.getElementById(id);

const STEPS = [
    { key: 'budget', title: 'Qual è il tuo budget massimo?', type: 'range' },
    { key: 'fuel', title: 'Che alimentazione preferisci?', options: [
        ['any', 'Indifferente', 'fa-shuffle'], ['B', 'Benzina', 'fa-gas-pump'], ['D', 'Diesel', 'fa-oil-can'],
        ['G', 'GPL', 'fa-fire-flame-simple'], ['M', 'Mild hybrid', 'fa-leaf'], ['H', 'Ibrida', 'fa-seedling'],
        ['P', 'Plug-in', 'fa-plug-circle-bolt'], ['E', 'Elettrica', 'fa-bolt']] },
    { key: 'body', title: 'Che tipo di carrozzeria cerchi?', options: [
        ['any', 'Indifferente', 'fa-shuffle'], ['u', 'Utilitaria', 'fa-car'], ['b', 'Berlina', 'fa-car-side'],
        ['w', 'Station wagon', 'fa-car-rear'], ['s', 'SUV', 'fa-truck-monster'], ['c', 'Coupé', 'fa-bolt-lightning'],
        ['k', 'Cabrio', 'fa-sun'], ['m', 'Monovolume', 'fa-van-shuttle']] },
    { key: 'seats', title: 'Quanti posti ti servono almeno?', options: [
        ['any', 'Indifferente', 'fa-shuffle'], ['2', 'Almeno 2', 'fa-user'], ['4', 'Almeno 4', 'fa-user-group'],
        ['5', 'Almeno 5', 'fa-people-group'], ['7', 'Almeno 7', 'fa-people-roof']] },
    { key: 'tank', title: 'Quanta autonomia vuoi tra un rifornimento e l\'altro?', options: [
        ['any', 'Non mi interessa', 'fa-shuffle'], ['media', 'Media (35 L o più)', 'fa-gas-pump'], ['alta', 'Alta (55 L o più)', 'fa-battery-full']] },
    { key: 'use', title: 'Come la userai di più?', options: [
        ['citta', 'In città', 'fa-city'], ['viaggi', 'Viaggi lunghi', 'fa-road'],
        ['famiglia', 'In famiglia', 'fa-people-roof'], ['sport', 'Per divertirmi', 'fa-flag-checkered']] },
    { key: 'gearbox', title: 'Che cambio vuoi?', options: [
        ['any', 'Indifferente', 'fa-shuffle'], ['A', 'Automatico', 'fa-gears'], ['M', 'Manuale', 'fa-gear']] }
];
const LABEL_USE = { citta: 'la città', viaggi: 'i viaggi lunghi', famiglia: 'la famiglia', sport: 'il divertimento' };

let step = 0;
const answers = { budget: 25000 };

function renderStep() {
    const s = STEPS[step];
    $('stepLabel').textContent = `Domanda ${step + 1} di ${STEPS.length}`;
    $('progress').style.width = `${(step + 1) / STEPS.length * 100}%`;
    $('backBtn').classList.toggle('hidden', step === 0);

    let html = `<h2 class="font-tech text-xl text-white mb-6">${s.title}</h2>`;
    if (s.type === 'range') {
        html += `
            <p class="range-value mb-4" id="budgetOut">${eur(answers.budget)}</p>
            <input type="range" id="budgetRange" class="range" min="12000" max="150000" step="500" value="${answers.budget}" aria-label="Budget massimo">
            <div class="flex justify-between text-xs text-slate-400 mt-2"><span>${eur(12000)}</span><span>${eur(150000)}</span></div>
            <div class="magnet-wrapper !w-auto mt-8">
                <button type="button" id="nextBtn" class="apple-glass-btn px-8 py-3.5 font-tech text-sm font-bold tracking-wider text-white">
                    <div class="glass-surface"></div><div class="liquid-core"></div><div class="specular-highlight"></div>
                    <span class="btn-text">AVANTI <i class="fa-solid fa-arrow-right ml-2"></i></span>
                </button>
            </div>`;
    } else {
        html += `<div class="opts ${s.key === 'fuel' || s.key === 'body' ? 'tight' : ''}" role="radiogroup" aria-label="${s.title}">` + s.options.map(([v, label, icon]) =>
            `<button type="button" class="opt ${answers[s.key] === v ? 'on' : ''}" role="radio" aria-checked="${answers[s.key] === v}" data-v="${v}"><i class="fa-solid ${icon}"></i>${label}</button>`).join('') + '</div>';
    }
    $('stepBody').innerHTML = html;

    if (s.type === 'range') {
        $('budgetRange').addEventListener('input', e => { answers.budget = Number(e.target.value); $('budgetOut').textContent = eur(answers.budget); });
        $('nextBtn').addEventListener('click', next);
    } else {
        document.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
            answers[s.key] = b.dataset.v;
            document.querySelectorAll('.opt').forEach(o => { const on = o === b; o.classList.toggle('on', on); o.setAttribute('aria-checked', String(on)); });
            setTimeout(next, reduceMotion.matches ? 0 : 250);
        }));
    }
    initMagnets();
}
function next() { if (step < STEPS.length - 1) { step++; renderStep(); } else showResults(); }
$('backBtn').addEventListener('click', () => { if (step > 0) { step--; renderStep(); } });
$('restartBtn').addEventListener('click', () => {
    $('results').hidden = true; $('wizard').hidden = false; step = 0; renderStep();
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
});

// --- CALCOLO DEI MATCH ---
function score(m) {
    const a = answers;
    const over = Math.max(0, m.price - a.budget);
    const sBudget = Math.max(0, Math.round(100 - over / a.budget * 250));
    const sUse = useScore(m, a.use);
    const sFuel = a.fuel === 'any' || m.fuels.includes(a.fuel) ? 100 : 25;
    const sBody = a.body === 'any' || m.body === a.body ? 100 : 30;
    const sSeats = a.seats === 'any' || m.seats >= Number(a.seats) ? 100 : Math.max(0, 100 - (Number(a.seats) - m.seats) * 35);
    const sGear = a.gearbox === 'any' || m.gears.includes(a.gearbox) ? 100 : 40;
    const need = a.tank === 'media' ? 35 : a.tank === 'alta' ? 55 : 0;
    const isElectric = m.fuels.length === 1 && m.fuels[0] === 'E';
    const sTank = need === 0 ? 100 : isElectric ? 60 : m.tank >= need ? 100 : Math.max(0, 100 - (need - m.tank) * 4);
    const total = Math.round(sBudget * .20 + sUse * .15 + sFuel * .20 + sBody * .15 + sSeats * .10 + sGear * .10 + sTank * .10);

    const chips = [];
    chips.push(over === 0 ? ['Rientra nel budget', true] : [`${eur(over)} sopra il budget`, false]);
    if (sUse >= 85) chips.push([`Ottima per ${LABEL_USE[a.use]}`, true]); else if (sUse < 50) chips.push([`Meno adatta a ${LABEL_USE[a.use]}`, false]);
    if (a.fuel !== 'any') chips.push([sFuel === 100 ? `Alimentazione ${FUEL[a.fuel].toLowerCase()}` : `Non disponibile in ${FUEL[a.fuel].toLowerCase()}`, sFuel === 100]);
    if (a.body !== 'any') chips.push([sBody === 100 ? BODY[m.body] : `È una ${BODY[m.body].toLowerCase()}, non ${BODY[a.body].toLowerCase()}`, sBody === 100]);
    if (a.seats !== 'any') chips.push([sSeats === 100 ? `${m.seats} posti` : `Solo ${m.seats} posti`, sSeats === 100]);
    if (a.tank !== 'any') chips.push(isElectric ? ['Elettrica: si ricarica, non fa rifornimento', true] : [sTank === 100 ? `Serbatoio ${m.tank} L` : `Serbatoio piccolo (${m.tank} L)`, sTank === 100]);
    if (a.gearbox !== 'any') chips.push([sGear === 100 ? `Cambio ${GEAR[a.gearbox].toLowerCase()}` : `Solo ${m.gears.map(g => GEAR[g]).join('/').toLowerCase()}`, sGear === 100]);
    return { m, total, sBudget, sUse, sFuel, sBody, sSeats, sGear, sTank, chips };
}

function showResults() {
    const list = MODELS.map(score).sort((x, y) => y.total - x.total).slice(0, 12);
    $('wizard').hidden = true;
    $('results').hidden = false;
    const parts = [eur(answers.budget)];
    if (answers.fuel !== 'any') parts.push(FUEL[answers.fuel]);
    if (answers.body !== 'any') parts.push(BODY[answers.body]);
    parts.push(LABEL_USE[answers.use]);
    $('resSummary').textContent = parts.join(' · ');

    $('resList').classList.remove('is-ready');
    $('resList').innerHTML = list.map((r, i) => {
        const m = r.m;
        const href = `modello.html?make=${encodeURIComponent(m.make)}&model=${encodeURIComponent(m.model)}`;
        return `<article class="tech-card ${i === 0 ? 'tech-corners' : ''} res-card ${i === 0 ? 'top' : ''} rounded-2xl p-5">
            ${i === 0 ? '<span class="top-tag">Miglior match</span>' : ''}
            <div class="car-visual thumb-box" data-make="${m.make}" data-model="${m.model}" aria-hidden="true"><i class="fa-solid fa-car-side"></i></div>
            <div class="flex items-start justify-between gap-3 mt-4">
                <div>
                    <h3 class="font-tech text-sm text-white"><a href="${href}" class="stretched">${m.make} ${m.model}</a></h3>
                    <p class="text-xs text-slate-400 mt-1">Da ${eur(m.price)} circa</p>
                </div>
                <div class="text-right shrink-0"><p class="font-tech text-3xl font-black text-cyan-400 text-glow"><span class="count" data-t="${r.total}">0</span>%</p><p class="text-[11px] text-slate-400">compatibilità</p></div>
            </div>
            <div class="spec-line mt-3">
                <span><i class="fa-solid fa-car"></i>${BODY[m.body]}</span>
                <span><i class="fa-solid fa-users"></i>${m.seats} posti</span>
                <span><i class="fa-solid fa-gas-pump"></i>${m.fuels.map(f => FUEL[f]).join(' / ')}</span>
                <span><i class="fa-solid fa-gauge"></i>${m.tank ? m.tank + ' L' : 'Elettrica'}</span>
            </div>
            <ul class="space-y-2 text-xs mt-4">
                ${[['Budget', r.sBudget], ['Uso', r.sUse], ['Alimentazione', r.sFuel], ['Carrozzeria', r.sBody]].map(([l, v]) =>
                    `<li><div class="flex justify-between text-slate-300 mb-1"><span>${l}</span><span>${v}%</span></div><div class="bar"><i style="--w:${v}%"></i></div></li>`).join('')}
            </ul>
            <div class="flex flex-wrap gap-2 mt-4">${r.chips.map(([t, ok]) => `<span class="chip ${ok ? '' : 'warn'}">${t}</span>`).join('')}</div>
        </article>`;
    }).join('');

    setTimeout(() => $('resList').classList.add('is-ready'), 60);
    animateCounts();
    document.querySelectorAll('.thumb-box').forEach(b => loadThumb(b));
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    initMagnets();
}

function animateCounts() {
    const els = [...document.querySelectorAll('.count')];
    if (reduceMotion.matches) { els.forEach(e => e.textContent = e.dataset.t); return; }
    const t0 = performance.now(), dur = 1200;
    (function tick(now) {
        const t = Math.min((now - t0) / dur, 1), k = 1 - Math.pow(1 - t, 3);
        els.forEach(e => e.textContent = Math.round(e.dataset.t * k));
        if (t < 1) requestAnimationFrame(tick);
    })(t0);
}

// --- FOTO ONLINE (Wikimedia Commons), con l'icona come ripiego ---
async function loadThumb(box) {
    const make = box.dataset.make, model = box.dataset.model, key = `dm-thumb-${make}|${model}`;
    let url = null;
    try { url = sessionStorage.getItem(key); } catch (e) {}
    if (!url) {
        try {
            const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 6000);
            const r = await fetch('https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=15&gsrsearch='
                + encodeURIComponent(`${make} ${model} filetype:bitmap`) + '&prop=imageinfo&iiprop=url|mime&iiurlwidth=600&format=json&origin=*', { signal: ctrl.signal });
            clearTimeout(t);
            const data = await r.json();
            
            if (data.query && data.query.pages) {
                const skip = /interior|interni|engine|motore|logo|badge|wheel|cruscotto|dashboard|diagram|map|charging|seat/i;
                const p = Object.values(data.query.pages).sort((a, b) => a.index - b.index)
                    .find(p => p.imageinfo && p.imageinfo[0].mime === 'image/jpeg' && !skip.test(p.title));
                if (p) url = p.imageinfo[0].thumburl || p.imageinfo[0].url;
            }
            if (url) try { sessionStorage.setItem(key, url); } catch (e) {}
        } catch (e) { return; }
    }
    if (!url) return;
    const img = new Image();
    img.alt = '';
    img.onload = () => box.replaceChildren(img);
    img.src = url;
}

renderStep();
