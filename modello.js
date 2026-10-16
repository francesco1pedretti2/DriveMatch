const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stars = n => [1, 2, 3, 4, 5].map(i => `<i class="fa-solid fa-star ${i <= Math.round(n) ? '' : 'off'}"></i>`).join('');
const dateIt = d => new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
const plain = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent.trim(); };

const qs = new URLSearchParams(location.search);
const make = qs.get('make') || '', model = qs.get('model') || '', year = qs.get('year') || '';
const fullName = `${make} ${model}`.trim();
const revKey = `dm-reviews-${make}|${model}`;
let photos = [], credits = [], info = null, idx = 0, myRating = 0, reviews = [];

// Se il modello è nel nostro archivio (data.js) recuperiamo carrozzeria, posti, serbatoio, prezzo
const known = (typeof MODELS !== 'undefined')
    ? MODELS.find(x => x.make.toLowerCase() === make.toLowerCase() &&
        (x.model.toLowerCase() === model.toLowerCase() || model.toLowerCase().startsWith(x.model.toLowerCase()) || x.model.toLowerCase().startsWith(model.toLowerCase()))) || null
    : null;

async function getJSON(url) {
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 8000);
    try { const r = await fetch(url, { signal: ctrl.signal }); if (!r.ok) throw new Error(r.status); return await r.json(); }
    finally { clearTimeout(t); }
}

async function loadWeb() {
    const key = 'dm-model-' + fullName;
    try { const c = JSON.parse(sessionStorage.getItem(key)); if (c) { ({ photos, credits, info } = c); return; } } catch (e) {}
    const [ph, wk] = await Promise.allSettled([
        getJSON('https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=25&gsrsearch='
            + encodeURIComponent(fullName + ' filetype:bitmap') + '&prop=imageinfo&iiprop=url|mime|extmetadata&iiurlwidth=1200&format=json&origin=*'),
        getJSON('https://it.wikipedia.org/w/api.php?action=query&generator=search&gsrlimit=1&gsrsearch='
            + encodeURIComponent(fullName) + '&prop=extracts|info&inprop=url&exintro=1&explaintext=1&exsentences=3&format=json&origin=*')
    ]);
    if (ph.status === 'fulfilled' && ph.value.query) {
        const skip = /interior|interni|engine|motore|logo|badge|wheel|cruscotto|dashboard|diagram|map|charging|seat/i;
        Object.values(ph.value.query.pages).sort((a, b) => a.index - b.index)
            .filter(p => p.imageinfo && p.imageinfo[0].mime === 'image/jpeg' && !skip.test(p.title)).slice(0, 8)
            .forEach(p => {
                const ii = p.imageinfo[0], m = ii.extmetadata || {};
                photos.push(ii.thumburl || ii.url);
                credits.push(`${plain(m.Artist && m.Artist.value) || 'Autore sconosciuto'}, ${plain(m.LicenseShortName && m.LicenseShortName.value) || 'licenza libera'}`);
            });
    }
    if (wk.status === 'fulfilled' && wk.value.query) {
        const p = Object.values(wk.value.query.pages)[0];
        if (p && p.extract) info = { text: p.extract, url: p.fullurl };
    }
    try { sessionStorage.setItem(key, JSON.stringify({ photos, credits, info })); } catch (e) {}
}

function loadReviews() { try { reviews = JSON.parse(localStorage.getItem(revKey)) || []; } catch (e) { reviews = []; } }
function saveReviews() { try { localStorage.setItem(revKey, JSON.stringify(reviews)); } catch (e) {} }

async function init() {
    if (!make || !model) {
        $('app').innerHTML = `<div class="tech-card rounded-2xl p-10 text-center"><h1 class="font-tech text-xl text-white mb-2">Modello non specificato</h1><a href="catalogo.html" class="text-cyan-400 underline text-sm">Vai al catalogo</a></div>`;
        return;
    }
    document.title = `${fullName} | DriveMatch`;
    $('app').innerHTML = `<p class="text-slate-300 text-sm"><i class="fa-solid fa-circle-notch fa-spin text-cyan-400 mr-2"></i>Cerco foto e informazioni…</p>`;
    await loadWeb();
    loadReviews();
    render();
}

function render() {
    const back = `catalogo.html?make=${encodeURIComponent(make)}${year ? '&year=' + year : ''}`;
    const gallery = photos.length ? `
        <div class="gallery-main" id="mainBox"><img id="mainImg" src="${esc(photos[0])}" alt="${esc(fullName)}">
            ${photos.length > 1 ? `<button type="button" class="g-btn left-3" data-dir="-1" aria-label="Foto precedente"><i class="fa-solid fa-chevron-left"></i></button>
            <button type="button" class="g-btn right-3" data-dir="1" aria-label="Foto successiva"><i class="fa-solid fa-chevron-right"></i></button>` : ''}
            <span class="g-counter" id="counter">1 / ${photos.length}</span></div>
        <p class="text-[11px] text-slate-500 mt-2" id="credit"></p>
        <div class="thumbs">${photos.map((p, i) => `<button type="button" class="thumb ${i ? '' : 'on'}" data-i="${i}" aria-label="Foto ${i + 1}"><img src="${esc(p)}" alt=""></button>`).join('')}</div>`
        : `<div class="car-visual" style="height:320px;font-size:96px" aria-hidden="true"><i class="fa-solid fa-car-side"></i></div><p class="text-xs text-slate-400 mt-3">Nessuna foto libera trovata per questo modello.</p>`;

    $('app').innerHTML = `
        <a href="${back}" class="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-cyan-400 mb-6"><i class="fa-solid fa-arrow-left"></i>Torna al catalogo</a>
        <div class="grid lg:grid-cols-5 gap-6">
            <section class="lg:col-span-3" aria-label="Foto">${gallery}</section>
            <aside class="lg:col-span-2 tech-card tech-corners rounded-2xl p-6 h-fit">
                <div class="glass-blobs" aria-hidden="true"><span></span><span></span><span></span></div>
                ${year ? `<span class="badge">Anno modello ${esc(year)}</span>` : ''}
                <h1 class="font-tech text-2xl text-white mt-3">${esc(fullName)}</h1>
                <div class="flex items-center gap-2 mt-2"><span class="stars" id="topStars"></span><span class="text-xs text-slate-400" id="topRating"></span></div>
                <div class="grid grid-cols-2 gap-2 mt-5">
                    <div class="spec"><b>Marca</b><span>${esc(make)}</span></div>
                    <div class="spec"><b>Modello</b><span>${esc(model)}</span></div>
                    ${year ? `<div class="spec"><b>Anno modello</b><span>${esc(year)}</span></div>` : ''}
                    ${known ? `<div class="spec"><b>Carrozzeria</b><span>${BODY[known.body]}</span></div><div class="spec"><b>Posti</b><span>${known.seats}</span></div><div class="spec"><b>Serbatoio</b><span>${known.tank ? known.tank + ' L' : 'Elettrica'}</span></div><div class="spec"><b>Alimentazioni</b><span>${known.fuels.map(f => FUEL[f]).join(', ')}</span></div><div class="spec"><b>Prezzo da</b><span>${eur(known.price)}</span></div>` : ''}
                </div>
                ${info ? `<div class="mt-4 p-4 rounded-xl bg-slate-900/60 border border-slate-700/60"><p class="text-xs text-cyan-300 mb-1"><i class="fa-brands fa-wikipedia-w mr-1"></i>Sul modello</p><p class="text-xs text-slate-300 leading-relaxed">${esc(info.text)}</p><a href="${esc(info.url)}" target="_blank" rel="noopener" class="text-[11px] text-cyan-400 underline">Fonte: Wikipedia</a></div>` : ''}
                <div class="magnet-wrapper mt-5">
                    <a href="cerca.html" class="apple-glass-btn w-full py-3.5 font-tech text-sm font-bold tracking-wider text-white">
                        <div class="glass-surface"></div><div class="liquid-core"></div><div class="specular-highlight"></div>
                        <span class="btn-text"><i class="fa-solid fa-sliders mr-2 text-cyan-400"></i>TROVA IL TUO MATCH</span>
                    </a>
                </div>
            </aside>
        </div>

        <section class="mt-12" aria-labelledby="revTitle">
            <h2 id="revTitle" class="font-tech text-2xl text-white mb-6">Recensioni degli utenti</h2>
            <div class="grid lg:grid-cols-3 gap-6">
                <div class="tech-card rounded-2xl p-6 h-fit" id="summary"></div>
                <div class="lg:col-span-2">
                    <div class="tech-card rounded-2xl p-6 mb-4">
                        <h3 class="font-tech text-sm text-white mb-3">Hai guidato questo modello? Scrivi una recensione</h3>
                        <div class="flex gap-1 mb-3" role="radiogroup" aria-label="Valutazione">
                            ${[1, 2, 3, 4, 5].map(i => `<button type="button" class="rate-btn" data-v="${i}" role="radio" aria-checked="false" aria-label="${i} su 5"><i class="fa-solid fa-star"></i></button>`).join('')}
                        </div>
                        <input id="revName" type="text" maxlength="30" placeholder="Il tuo nome" aria-label="Il tuo nome" class="w-full tech-input rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-400 mb-3">
                        <textarea id="revText" rows="3" maxlength="400" placeholder="Com'è guidarla? Cosa ti è piaciuto e cosa no?" aria-label="Testo della recensione" class="w-full tech-input rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-400 mb-3"></textarea>
                        <div class="magnet-wrapper !w-auto">
                            <button type="button" id="sendRev" class="apple-glass-btn px-6 py-3 font-tech text-xs font-bold tracking-wider text-white">
                                <div class="glass-surface"></div><div class="liquid-core"></div><div class="specular-highlight"></div>
                                <span class="btn-text">PUBBLICA RECENSIONE</span>
                            </button>
                        </div>
                    </div>
                    <div class="space-y-3" id="revList"></div>
                </div>
            </div>
        </section>`;
    renderReviews(); bind(); initMagnets();
    if (photos.length) setCredit();
}

function renderReviews() {
    const n = reviews.length, avg = n ? reviews.reduce((s, r) => s + r.rating, 0) / n : 0;
    $('topStars').innerHTML = stars(avg);
    $('topRating').textContent = n ? `${avg.toFixed(1)} (${n} ${n === 1 ? 'recensione' : 'recensioni'})` : 'Ancora nessuna recensione';
    $('summary').innerHTML = `<p class="font-tech text-5xl text-white">${n ? avg.toFixed(1) : '–'}</p><div class="stars mt-2">${stars(avg)}</div>
        <p class="text-xs text-slate-400 mt-1 mb-4">${n} ${n === 1 ? 'recensione' : 'recensioni'}</p><ul class="space-y-2">${[5, 4, 3, 2, 1].map(k => {
            const c = reviews.filter(r => r.rating === k).length;
            return `<li class="flex items-center gap-2 text-xs text-slate-300"><span class="w-3">${k}</span><div class="bar gold flex-1"><i style="--w:${n ? c / n * 100 : 0}%"></i></div><span class="w-5 text-right">${c}</span></li>`;
        }).join('')}</ul>`;
    $('revList').innerHTML = n ? reviews.map(r => `<article class="review"><div class="flex items-center gap-3 mb-2">
        <span class="avatar">${esc(r.name.charAt(0).toUpperCase())}</span><div class="flex-1"><p class="text-sm text-white">${esc(r.name)}</p><p class="text-xs text-slate-400">${dateIt(r.date)}</p></div>
        <span class="stars">${stars(r.rating)}</span></div><p class="text-sm text-slate-300 leading-relaxed">${esc(r.text)}</p></article>`).join('')
        : '<p class="text-sm text-slate-400">Nessuna recensione: scrivi la prima. Le recensioni restano salvate su questo dispositivo.</p>';
}

// --- galleria ---
function setCredit() { $('credit').textContent = 'Foto: ' + credits[idx] + ' · Wikimedia Commons'; }
function updateLb() { $('lbImg').src = photos[idx]; $('lbImg').alt = `${fullName}, foto ${idx + 1}`; }
function goTo(i) {
    if (!photos.length) return;
    idx = (i + photos.length) % photos.length;
    $('mainImg').src = photos[idx];
    $('counter').textContent = `${idx + 1} / ${photos.length}`;
    document.querySelectorAll('.thumb').forEach((t, k) => t.classList.toggle('on', k === idx));
    setCredit();
    if (!$('lightbox').hidden) updateLb();
}
function bind() {
    document.querySelectorAll('[data-dir]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); goTo(idx + Number(b.dataset.dir)); }));
    document.querySelectorAll('.thumb').forEach(t => t.addEventListener('click', () => goTo(Number(t.dataset.i))));
    if ($('mainBox')) $('mainBox').addEventListener('click', () => { $('lightbox').hidden = false; updateLb(); $('lbClose').focus(); });
    $('lbClose').onclick = () => { $('lightbox').hidden = true; };
    $('lbPrev').onclick = () => goTo(idx - 1);
    $('lbNext').onclick = () => goTo(idx + 1);
    $('lightbox').addEventListener('click', e => { if (e.target === $('lightbox')) $('lightbox').hidden = true; });
    document.addEventListener('keydown', e => {
        if (e.target.matches('input, textarea')) return;
        if (e.key === 'ArrowLeft') goTo(idx - 1);
        if (e.key === 'ArrowRight') goTo(idx + 1);
        if (e.key === 'Escape') $('lightbox').hidden = true;
    });

    document.querySelectorAll('.rate-btn').forEach(b => b.addEventListener('click', () => {
        myRating = Number(b.dataset.v);
        document.querySelectorAll('.rate-btn').forEach(x => { x.classList.toggle('on', Number(x.dataset.v) <= myRating); x.setAttribute('aria-checked', String(Number(x.dataset.v) === myRating)); });
    }));
    $('sendRev').addEventListener('click', () => {
        const name = $('revName').value.trim(), text = $('revText').value.trim();
        if (!myRating) return showToast('Scegli da 1 a 5 stelle', 'error');
        if (!name) return showToast('Inserisci il tuo nome', 'error');
        if (text.length < 10) return showToast('Scrivi almeno 10 caratteri', 'error');
        reviews.unshift({ name, rating: myRating, date: new Date().toISOString().slice(0, 10), text });
        saveReviews(); renderReviews();
        $('revName').value = ''; $('revText').value = ''; myRating = 0;
        document.querySelectorAll('.rate-btn').forEach(x => { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); });
        showToast('Recensione pubblicata', 'success');
    });
}

init();
