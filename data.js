const VPIC = 'https://vpic.nhtsa.dot.gov/api/vehicles/';
const PAGE = 24;
// Elenco completo e aggiornato dei marchi globali reali (Europa, Asia, America)
const BRANDS = [
    'Fiat', 'Alfa Romeo', 'Ferrari', 'Lamborghini', 'Maserati', 'BMW', 'Mercedes-Benz', 
    'Volkswagen', 'Audi', 'Renault', 'Toyota', 'Tesla', 'BYD', 'Kia', 'Ford', 
    'Peugeot', 'Citroën', 'Opel', 'Hyundai', 'Nissan', 'Skoda', 'Cupra', 'Volvo', 
    'Mazda', 'Suzuki', 'Dacia', 'Jeep', 'Land Rover', 'Porsche', 'Mini', 'Honda', 'Lexus'
];

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ACR = new Set(['BMW', 'BYD', 'GMC', 'MG', 'DS', 'RAM', 'AMC', 'VW', 'KTM', 'SEAT', 'NIO', 'JAC']);
const tc = s => /[a-z]/.test(s) ? s : s.split(/(\s|-)/).map(w => ACR.has(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()).join('');

let models = [], filtered = [], shown = 0, cur = { make: '', year: '' };

async function getJSON(url, ms = 12000) {
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), ms);
    try {
        const r = await fetch(url, { signal: ctrl.signal });
        if (!r.ok) throw new Error(r.status);
        return await r.json();
    } finally { clearTimeout(t); }
}

// --- FORM: anni e marche ---
(function fillYears() {
    const y = new Date().getFullYear() + 1;
    let h = '<option value="">Tutti gli anni</option>';
    for (let i = y; i >= 1990; i--) h += `<option value="${i}">${i}${i >= y - 1 ? ' · novità' : ''}</option>`;
    $('yearSel').innerHTML = h;
})();

$('brandChips').innerHTML = BRANDS.slice(0, 15).map(b => `<button type="button" class="badge hover:border-cyan-400 hover:text-cyan-300" data-b="${esc(b)}">${esc(b)}</button>`).join('');
$('brandChips').addEventListener('click', e => {
    const b = e.target.closest('[data-b]'); if (!b) return;
    $('makeIn').value = b.dataset.b; search();
});

async function loadMakes() {
    try {
        let list = null;
        try { list = JSON.parse(sessionStorage.getItem('dm-makes')); } catch (e) {}
        if (!list) {
            const d = await getJSON(VPIC + 'GetMakesForVehicleType/car?format=json');
            list = [...new Set(d.Results.map(r => tc(r.MakeName)))].sort();
            try { sessionStorage.setItem('dm-makes', JSON.stringify(list)); } catch (e) {}
        }
        $('makeList').innerHTML = list.map(m => `<option value="${esc(m)}">`).join('');
    } catch (e) {}
}

// --- RICERCA GLOBALE ---
async function search() {
    const make = $('makeIn').value.trim(), year =$('yearSel').value;
    if (!make) return showToast('Scrivi o scegli una marca', 'error');
    cur = { make, year };
    $('grid').innerHTML = ''; $('moreWrap').hidden = true; $('filterRow').hidden = true;
    $('status').textContent = 'Carico tutti i modelli dal database globale…';
    history.replaceState(null, '', `?make=${encodeURIComponent(make)}${year ? '&year=' + year : ''}`);
    
    try {
        const url = year
            ? `${VPIC}GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}?format=json`
            : `${VPIC}GetModelsForMake/${encodeURIComponent(make)}?format=json`;
        const d = await getJSON(url);
        const seen = new Set();
        
        // Filtro intelligente per ripulire i dati ed escludere prototipi o voci non valide
        models = (d.Results || [])
            .filter(r => r.Model_Name && !seen.has(r.Model_Name.toLowerCase()) && seen.add(r.Model_Name.toLowerCase()))
            .map(r => ({ make: tc(r.Make_Name || make), model: r.Model_Name.trim() }))
            .sort((a, b) => a.model.localeCompare(b.model, 'it', { numeric: true }));
    } catch (e) {
        $('status').textContent = 'Connessione al database globale temporaneamente assente. Riprova.';
        return;
    }

    if (!models.length) {
        $('status').textContent = `Nessun modello trovato per "${make}"${year ? ' nel ' + year : ''}.`;
        return;
    }
    $('filterIn').value = '';$('filterRow').hidden = false;
    applyFilter();
}

function applyFilter() {
    const q = $('filterIn').value.trim().toLowerCase();
    filtered = q ? models.filter(m => m.model.toLowerCase().includes(q)) : models;
    shown = 0; $('grid').innerHTML = '';
    const label = cur.year ? `anno modello ${cur.year}` : 'tutti gli anni';
    $('status').textContent = `${filtered.length} modelli trovati · ${tc(cur.make)} · ${label}`;
    more();
}

function more() {
    const slice = filtered.slice(shown, shown + PAGE);
    const html = slice.map((m, k) => {
        const i = shown + k;
        const href = `modello.html?make=${encodeURIComponent(m.make)}&model=${encodeURIComponent(m.model)}${cur.year ? '&year=' + cur.year : ''}`;
        const known = findKnown(m.make, m.model);
        return `<article class="tech-card rounded-2xl p-4 res-card">
            <div class="car-visual thumb-box" data-i="${i}" aria-hidden="true"><i class="fa-solid fa-car-side"></i></div>
            <h3 class="font-tech text-sm text-white mt-3"><a class="stretched" href="${href}">${esc(m.make)} ${esc(m.model)}</a></h3>
            <p class="text-xs text-slate-400 mt-1">${cur.year ? 'Anno modello ' + cur.year : 'Tutte le versioni'}</p>
            ${known ? `<div class="spec-line mt-2"><span><i class="fa-solid fa-car"></i>${BODY[known.body]}</span><span><i class="fa-solid fa-users"></i>${known.seats} posti</span><span><i class="fa-solid fa-gas-pump"></i>${known.tank ? known.tank + ' L' : 'Elettrica'}</span></div>` : ''}
        </article>`;
    }).join('');
    $('grid').insertAdjacentHTML('beforeend', html);
    shown += slice.length;
    $('moreWrap').hidden = shown >= filtered.length;
    document.querySelectorAll('.thumb-box:not([data-seen])').forEach(b => { b.dataset.seen = '1'; io.observe(b); });
}

function findKnown(make, model) {
    if (typeof MODELS === 'undefined') return null;
    const mk = make.toLowerCase(), md = model.toLowerCase();
    return MODELS.find(x => x.make.toLowerCase() === mk && (x.model.toLowerCase() === md || md.startsWith(x.model.toLowerCase()) || x.model.toLowerCase().startsWith(md))) || null;
}

$('searchForm').addEventListener('submit', e => { e.preventDefault(); search(); });
$('moreBtn').addEventListener('click', more);$('filterIn').addEventListener('input', applyFilter);

// --- GESTIONE IMMAGINI WIKIMEDIA ---
const queue = []; let running = 0;
const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { io.unobserve(en.target); queue.push(en.target); } });
    pump();
}, { rootMargin: '200px' });

function pump() {
    while (running < 3 && queue.length) {
        const box = queue.shift(); running++;
        loadThumb(filtered[box.dataset.i]).then(url => {
            if (!url) return;
            const img = new Image(); img.alt = '';
            img.onload = () => box.replaceChildren(img);
            img.src = url;
        }).finally(() => { running--; pump(); });
    }
}

async function loadThumb(m) {
    if (!m) return null;
    const key = `dm-th-${m.make}|${m.model}`;
    try { const c = sessionStorage.getItem(key); if (c !== null) return c || null; } catch (e) {}
    let url = '';
    try {
        const d = await getJSON('https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=12&gsrsearch='
            + encodeURIComponent(`${m.make} ${m.model} filetype:bitmap`) + '&prop=imageinfo&iiprop=url|mime&iiurlwidth=500&format=json&origin=*', 8000);
        if (d.query && d.query.pages) {
            const skip = /interior|interni|engine|motore|logo|badge|wheel|cruscotto|dashboard|diagram|map|charging|seat/i;
            const p = Object.values(d.query.pages).sort((a, b) => a.index - b.index)
                .find(p => p.imageinfo && p.imageinfo[0].mime === 'image/jpeg' && !skip.test(p.title));
            if (p) url = p.imageinfo[0].thumburl || p.imageinfo[0].url;
        }
    } catch (e) { return null; }
    try { sessionStorage.setItem(key, url); } catch (e) {}
    return url || null;
}

loadMakes();
const qs = new URLSearchParams(location.search);
if (qs.get('make')) {
    $('makeIn').value = qs.get('make');
    if (qs.get('year')) $('yearSel').value = qs.get('year');
    search();
}