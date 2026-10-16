// Facoltativo: chiave Google Maps con "Places API (New)" abilitata, per mostrare le recensioni Google del venditore.
// Lasciala vuota per disattivare la sezione. Limitala al tuo dominio dalla Google Cloud Console.
const GOOGLE_MAPS_KEY = '';

// --- DATI DI ESEMPIO ---
// Foto e informazioni sul modello vengono cercate online (Wikimedia Commons e Wikipedia).
// Se la rete non risponde si usano le foto locali img/<id>-1.jpg ... oppure un segnaposto.
const CARS = {
    giulia: {
        name: 'Alfa Romeo Giulia 2.2 Diesel', price: 24900, year: 2019, km: 62000, fuel: 'Diesel', power: '160 CV',
        gearbox: 'Automatico', city: 'Milano', seller: 'Garage Navigli', photos: 4,
        body: 'Berlina', seats: 5, tank: 58,
        desc: 'Unico proprietario, tagliandi in concessionaria, interni in pelle. Consumi contenuti e ottimo comfort in autostrada.',
        reviews: [
            { name: 'Luca M.', rating: 5, date: '2026-08-12', text: 'Tenuta di strada eccezionale e consumi migliori del previsto: faccio 18 km/l in viaggio.' },
            { name: 'Sara B.', rating: 4, date: '2026-07-03', text: 'Bellissima e comoda. Il sistema multimediale è un po\' lento, ma niente di grave.' },
            { name: 'Andrea R.', rating: 5, date: '2026-05-21', text: 'Il cambio automatico è fluido, l\'auto è silenziosa e rifinita bene.' }
        ]
    },
    500: {
        name: 'Fiat 500 Hybrid', price: 14900, year: 2022, km: 18000, fuel: 'Ibrida', power: '70 CV',
        gearbox: 'Manuale', city: 'Torino', seller: 'Auto Centro Torino', photos: 4,
        body: 'Utilitaria', seats: 4, tank: 35,
        desc: 'Perfetta per la città: piccola, agile e con consumi molto bassi. Neopatentati ammessi.',
        reviews: [
            { name: 'Giulia T.', rating: 5, date: '2026-08-30', text: 'Parcheggia ovunque e consuma pochissimo. La uso ogni giorno per andare al lavoro.' },
            { name: 'Marco P.', rating: 4, date: '2026-06-14', text: 'Ottima in città, in autostrada si sente un po\' la mancanza di potenza.' }
        ]
    },
    bmw118: {
        name: 'BMW Serie 1 118d', price: 21500, year: 2020, km: 47000, fuel: 'Diesel', power: '150 CV',
        gearbox: 'Automatico', city: 'Bologna', seller: 'Prestige Motors', photos: 4,
        body: 'Berlina', seats: 5, tank: 45,
        desc: 'Allestimento Sport, fari LED, navigatore e sensori di parcheggio. Trazione posteriore, guida molto divertente.',
        reviews: [
            { name: 'Davide C.', rating: 5, date: '2026-09-02', text: 'Si guida che è un piacere, sterzo preciso e ottime finiture.' },
            { name: 'Elena F.', rating: 4, date: '2026-07-19', text: 'Bella e ben equipaggiata. Il bagagliaio è un po\' piccolo per le vacanze.' },
            { name: 'Paolo S.', rating: 3, date: '2026-04-08', text: 'Buona auto, ma la manutenzione costa più di quanto pensassi.' }
        ]
    },
    tesla: {
        name: 'Tesla Model 3', price: 27800, year: 2021, km: 33000, fuel: 'Elettrica', power: '283 CV',
        gearbox: 'Automatico', city: 'Roma', seller: 'EV Point Roma', photos: 4,
        body: 'Berlina', seats: 5, tank: 0,
        desc: 'Long Range con Autopilot, batteria in ottima salute. Ricarica gratuita inclusa per i primi mesi.',
        reviews: [
            { name: 'Nicola V.', rating: 5, date: '2026-08-25', text: 'Accelerazione da urlo e costi di gestione bassissimi. Non tornerei indietro.' },
            { name: 'Chiara D.', rating: 4, date: '2026-06-30', text: 'Molto tecnologica. Le finiture interne potrebbero essere migliori.' },
            { name: 'Franco L.', rating: 5, date: '2026-05-11', text: 'Autonomia reale di oltre 450 km, l\'app è comodissima.' }
        ]
    }
};

// Cosa cercare online per ogni auto (modifica le stringhe per affinare i risultati)
const SOURCES = {
    giulia: { q: 'Alfa Romeo Giulia 952', wiki: 'Alfa Romeo Giulia 2015' },
    500: { q: 'Fiat 500 Hybrid 2020', wiki: 'Fiat 500 2007' },
    bmw118: { q: 'BMW 118d F40', wiki: 'BMW Serie 1 F40' },
    tesla: { q: 'Tesla Model 3', wiki: 'Tesla Model 3' }
};
let photoList = [], credits = [], modelInfo = null;

async function getJSON(url) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    try {
        const r = await fetch(url, { signal: ctrl.signal });
        if (!r.ok) throw new Error(r.status);
        return await r.json();
    } finally { clearTimeout(t); }
}
const plain = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent.trim(); };

async function loadWeb() {
    const key = 'dm-web-' + carId;
    try {
        const c = JSON.parse(sessionStorage.getItem(key));
        if (c && c.photoList.length) { ({ photoList, credits, modelInfo } = c); return; }
    } catch (e) {}
    const src = SOURCES[carId];
    if (src) {
        const [ph, info] = await Promise.allSettled([
            getJSON('https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=25&gsrsearch='
                + encodeURIComponent(src.q + ' filetype:bitmap') + '&prop=imageinfo&iiprop=url|mime|extmetadata&iiurlwidth=1200&format=json&origin=*'),
            getJSON('https://it.wikipedia.org/w/api.php?action=query&generator=search&gsrlimit=1&gsrsearch='
                + encodeURIComponent(src.wiki) + '&prop=extracts|info&inprop=url&exintro=1&explaintext=1&exsentences=3&format=json&origin=*')
        ]);
        if (ph.status === 'fulfilled' && ph.value.query) {
            const skip = /interior|interni|engine|motore|logo|badge|wheel|cruscotto|dashboard|diagram|map|charging|seat/i;
            Object.values(ph.value.query.pages)
                .sort((a, b) => a.index - b.index)
                .filter(p => p.imageinfo && p.imageinfo[0].mime === 'image/jpeg' && !skip.test(p.title))
                .slice(0, 6)
                .forEach(p => {
                    const ii = p.imageinfo[0], m = ii.extmetadata || {};
                    photoList.push(ii.thumburl || ii.url);
                    credits.push(`${plain(m.Artist && m.Artist.value) || 'Autore sconosciuto'}, ${plain(m.LicenseShortName && m.LicenseShortName.value) || 'licenza libera'}`);
                });
        }
        if (info.status === 'fulfilled' && info.value.query) {
            const p = Object.values(info.value.query.pages)[0];
            if (p && p.extract) modelInfo = { text: p.extract, url: p.fullurl };
        }
    }
    if (!photoList.length) photoList = [1, 2, 3, 4].map(i => `img/${carId}-${i}.jpg`);
    try { sessionStorage.setItem(key, JSON.stringify({ photoList, credits, modelInfo })); } catch (e) {}
}

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = n => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const stars = n => [1, 2, 3, 4, 5].map(i => `<i class="fa-solid fa-star ${i <= Math.round(n) ? '' : 'off'}"></i>`).join('');
const dateIt = d => new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

// Segnaposto se la foto non esiste
function placeholder(label) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1220"/><stop offset="1" stop-color="#0c2a3a"/></linearGradient></defs><rect width="800" height="500" fill="url(#g)"/><text x="400" y="250" font-size="26" fill="#00f0ff" text-anchor="middle" font-family="sans-serif">${label}</text><text x="400" y="290" font-size="15" fill="#64748b" text-anchor="middle" font-family="sans-serif">Foto non disponibile</text></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
function imgTag(src, label, alt, id) {
    return `<img ${id ? `id="${id}"` : ''} src="${src}" alt="${esc(alt)}" onerror="this.onerror=null;this.src='${placeholder(label)}'">`;
}

// --- STATO ---
const params = new URLSearchParams(location.search);
const carId = params.get('id');
const car = CARS[carId];
let photoIdx = 0, myRating = 0;
let reviews = [];

function loadReviews() {
    let mine = [];
    try { mine = JSON.parse(localStorage.getItem('dm-reviews-' + carId)) || []; } catch (e) {}
    reviews = [...mine, ...car.reviews];
}
function saveReview(r) {
    try {
        const mine = JSON.parse(localStorage.getItem('dm-reviews-' + carId)) || [];
        localStorage.setItem('dm-reviews-' + carId, JSON.stringify([r, ...mine]));
    } catch (e) {}
}

const photoSrc = i => photoList[i];
const photoLabel = i => `${car.name} · foto ${i + 1}`;

// --- RENDER ---
function render() {
    if (!car) {
        $('app').innerHTML = `<div class="tech-card rounded-2xl p-10 text-center"><h1 class="font-tech text-xl text-white mb-2">Auto non trovata</h1><p class="text-slate-300 text-sm mb-6">Questo annuncio non esiste o è stato rimosso.</p><a href="home.html#in-evidenza" class="text-cyan-400 underline text-sm">Torna agli annunci</a></div>`;
        return;
    }
    document.title = `${car.name} | DriveMatch`;
    loadReviews();

    const thumbs = Array.from({ length: photoList.length }, (_, i) =>
        `<button type="button" class="thumb ${i === 0 ? 'on' : ''}" data-i="${i}" aria-label="Foto ${i + 1}">${imgTag(photoSrc(i), photoLabel(i), '')}</button>`).join('');

    $('app').innerHTML = `
        <a href="home.html#in-evidenza" class="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-cyan-400 mb-6"><i class="fa-solid fa-arrow-left"></i>Tutti gli annunci</a>

        <div class="grid lg:grid-cols-5 gap-6">
            <section class="lg:col-span-3" aria-label="Foto">
                <div class="gallery-main" id="mainBox">
                    ${imgTag(photoSrc(0), photoLabel(0), car.name, 'mainImg')}
                    <button type="button" class="g-btn left-3" data-dir="-1" aria-label="Foto precedente"><i class="fa-solid fa-chevron-left"></i></button>
                    <button type="button" class="g-btn right-3" data-dir="1" aria-label="Foto successiva"><i class="fa-solid fa-chevron-right"></i></button>
                    <span class="g-counter" id="counter">1 / ${photoList.length}</span>
                </div>
                <div class="thumbs" id="thumbs">${thumbs}</div>
                <p class="text-[11px] text-slate-500 mt-2" id="credit"></p>
            </section>

            <aside class="lg:col-span-2 tech-card tech-corners rounded-2xl p-6 h-fit">
                <div class="glass-blobs" aria-hidden="true"><span></span><span></span><span></span></div>
                <span class="badge">${esc(car.fuel)}</span>
                <h1 class="font-tech text-2xl text-white mt-3">${esc(car.name)}</h1>
                <div class="flex items-center gap-2 mt-2"><span class="stars" id="topStars"></span><span class="text-xs text-slate-400" id="topRating"></span></div>
                <p class="font-tech text-3xl text-cyan-400 text-glow mt-4">${eur(car.price)}</p>
                <div class="grid grid-cols-2 gap-2 mt-5">
                    <div class="spec"><b>Anno</b><span>${car.year}</span></div>
                    <div class="spec"><b>Chilometri</b><span>${car.km.toLocaleString('it-IT')} km</span></div>
                    <div class="spec"><b>Potenza</b><span>${car.power}</span></div>
                    <div class="spec"><b>Cambio</b><span>${car.gearbox}</span></div>
                    <div class="spec"><b>Carrozzeria</b><span>${car.body}</span></div>
                    <div class="spec"><b>Posti</b><span>${car.seats}</span></div>
                    <div class="spec"><b>Serbatoio</b><span>${car.tank ? car.tank + ' L' : 'Elettrica'}</span></div>
                </div>
                <p class="text-sm text-slate-300 leading-relaxed mt-5">${esc(car.desc)}</p>
                ${modelInfo ? `<div class="mt-4 p-4 rounded-xl bg-slate-900/60 border border-slate-700/60"><p class="text-xs text-cyan-300 mb-1"><i class="fa-brands fa-wikipedia-w mr-1"></i>Sul modello</p><p class="text-xs text-slate-300 leading-relaxed">${esc(modelInfo.text)}</p><a href="${esc(modelInfo.url)}" target="_blank" rel="noopener" class="text-[11px] text-cyan-400 underline">Fonte: Wikipedia</a></div>` : ''}
                <div class="mt-5 pt-5 border-t border-slate-800/80 flex items-center justify-between text-sm">
                    <div><p class="text-white">${esc(car.seller)}</p><p class="text-xs text-slate-400"><i class="fa-solid fa-location-dot mr-1"></i>${esc(car.city)}</p></div>
                </div>
                <div class="magnet-wrapper mt-4">
                    <button type="button" id="contactBtn" class="apple-glass-btn w-full py-3.5 font-tech text-sm font-bold tracking-wider text-white">
                        <div class="glass-surface"></div><div class="liquid-core"></div><div class="specular-highlight"></div>
                        <span class="btn-text"><i class="fa-solid fa-envelope mr-2 text-cyan-400"></i>CONTATTA IL VENDITORE</span>
                    </button>
                </div>
            </aside>
        </div>

        <section class="mt-12" aria-labelledby="revTitle">
            <h2 id="revTitle" class="font-tech text-2xl text-white mb-6">Recensioni</h2>
            <div class="grid lg:grid-cols-3 gap-6">
                <div class="tech-card rounded-2xl p-6 h-fit" id="summary"></div>
                <div class="lg:col-span-2">
                    <div class="tech-card rounded-2xl p-6 mb-4">
                        <h3 class="font-tech text-sm text-white mb-3">Scrivi una recensione</h3>
                        <div class="flex gap-1 mb-3" id="rateRow" role="radiogroup" aria-label="Valutazione">
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
                    <div id="gReviews"></div>
                    <div class="space-y-3" id="revList"></div>
                </div>
            </div>
        </section>`;

    setCredit();
    renderReviews();
    bind();
    initMagnets();
}

function renderReviews() {
    const n = reviews.length;
    const avg = n ? reviews.reduce((s, r) => s + r.rating, 0) / n : 0;
    $('topStars').innerHTML = stars(avg);
    $('topRating').textContent = n ? `${avg.toFixed(1)} (${n} recensioni)` : 'Nessuna recensione';

    const rows = [5, 4, 3, 2, 1].map(k => {
        const c = reviews.filter(r => r.rating === k).length;
        return `<li class="flex items-center gap-2 text-xs text-slate-300"><span class="w-3">${k}</span><div class="bar gold flex-1"><i style="--w:${n ? c / n * 100 : 0}%"></i></div><span class="w-5 text-right">${c}</span></li>`;
    }).join('');
    $('summary').innerHTML = `
        <p class="font-tech text-5xl text-white">${n ? avg.toFixed(1) : '–'}</p>
        <div class="stars mt-2">${stars(avg)}</div>
        <p class="text-xs text-slate-400 mt-1 mb-4">${n} ${n === 1 ? 'recensione' : 'recensioni'}</p>
        <ul class="space-y-2">${rows}</ul>`;

    $('revList').innerHTML = reviews.length ? reviews.map(r => `
        <article class="review">
            <div class="flex items-center gap-3 mb-2">
                <span class="avatar">${esc(r.name.trim().charAt(0).toUpperCase())}</span>
                <div class="flex-1"><p class="text-sm text-white">${esc(r.name)}</p><p class="text-xs text-slate-400">${dateIt(r.date)}</p></div>
                <span class="stars">${stars(r.rating)}</span>
            </div>
            <p class="text-sm text-slate-300 leading-relaxed">${esc(r.text)}</p>
        </article>`).join('') : '<p class="text-sm text-slate-400">Nessuna recensione: scrivi la prima.</p>';
}

// --- GALLERIA ---
function goTo(i) {
    photoIdx = (i + photoList.length) % photoList.length;
    const img = $('mainImg');
    img.classList.add('fade');
    setTimeout(() => {
        img.src = photoSrc(photoIdx);
        img.alt = `${car.name}, foto ${photoIdx + 1}`;
        img.onerror = () => { img.onerror = null; img.src = placeholder(photoLabel(photoIdx)); };
        img.classList.remove('fade');
    }, reduceMotion.matches ? 0 : 200);
    setCredit();
    $('counter').textContent = `${photoIdx + 1} / ${photoList.length}`;
    document.querySelectorAll('.thumb').forEach((t, k) => t.classList.toggle('on', k === photoIdx));
    if (!$('lightbox').hidden) updateLightbox();
}
function setCredit() {
    const el = $('credit');
    if (el) el.textContent = credits[photoIdx] ? `Foto: ${credits[photoIdx]} · Wikimedia Commons` : '';
}
function updateLightbox() {
    const lb = $('lbImg');
    lb.onerror = () => { lb.onerror = null; lb.src = placeholder(photoLabel(photoIdx)); };
    lb.src = photoSrc(photoIdx);
    lb.alt = `${car.name}, foto ${photoIdx + 1}`;
}
function openLightbox() { $('lightbox').hidden = false; updateLightbox(); $('lbClose').focus(); }
function closeLightbox() { $('lightbox').hidden = true; }

function bind() {
    document.querySelectorAll('[data-dir]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); goTo(photoIdx + Number(b.dataset.dir)); }));
    document.querySelectorAll('.thumb').forEach(t => t.addEventListener('click', () => goTo(Number(t.dataset.i))));
    $('mainBox').addEventListener('click', openLightbox);
    $('lbClose').onclick = closeLightbox;
    $('lbPrev').onclick = () => goTo(photoIdx - 1);
    $('lbNext').onclick = () => goTo(photoIdx + 1);
    $('lightbox').addEventListener('click', e => { if (e.target === $('lightbox')) closeLightbox(); });
    document.addEventListener('keydown', e => {
        if (e.target.matches('input, textarea')) return;
        if (e.key === 'ArrowLeft') goTo(photoIdx - 1);
        if (e.key === 'ArrowRight') goTo(photoIdx + 1);
        if (e.key === 'Escape') closeLightbox();
    });

    $('contactBtn').addEventListener('click', () => showToast('Messaggio inviato al venditore (demo)', 'success'));

    // Recensioni
    document.querySelectorAll('.rate-btn').forEach(b => b.addEventListener('click', () => {
        myRating = Number(b.dataset.v);
        document.querySelectorAll('.rate-btn').forEach(x => {
            const on = Number(x.dataset.v) <= myRating;
            x.classList.toggle('on', on);
            x.setAttribute('aria-checked', String(Number(x.dataset.v) === myRating));
        });
    }));
    $('sendRev').addEventListener('click', () => {
        const name = $('revName').value.trim(), text = $('revText').value.trim();
        if (!myRating) return showToast('Scegli da 1 a 5 stelle', 'error');
        if (!name) return showToast('Inserisci il tuo nome', 'error');
        if (text.length < 10) return showToast('Scrivi almeno 10 caratteri', 'error');
        const r = { name, rating: myRating, date: new Date().toISOString().slice(0, 10), text };
        saveReview(r);
        reviews.unshift(r);
        renderReviews();
        $('revName').value = ''; $('revText').value = '';
        myRating = 0;
        document.querySelectorAll('.rate-btn').forEach(x => { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); });
        showToast('Recensione pubblicata', 'success');
    });
}

// --- RECENSIONI GOOGLE DEL VENDITORE (Places API, opzionale) ---
async function loadGoogleReviews() {
    if (!GOOGLE_MAPS_KEY || !car || !$('gReviews')) return;
    try {
        await new Promise((ok, ko) => {
            window.__gmReady = ok;
            const sc = document.createElement('script');
            sc.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_KEY)}&loading=async&callback=__gmReady&language=it`;
            sc.onerror = ko;
            document.head.appendChild(sc);
        });
        const { Place } = await google.maps.importLibrary('places');
        const { places } = await Place.searchByText({
            textQuery: `${car.seller} ${car.city}`,
            fields: ['displayName', 'rating', 'userRatingCount', 'reviews', 'googleMapsURI'],
            maxResultCount: 1
        });
        const p = places && places[0];
        if (!p || !p.reviews || !p.reviews.length) return;
        $('gReviews').innerHTML = `
            <div class="tech-card rounded-2xl p-6 mb-4">
                <h3 class="font-tech text-sm text-white mb-1"><i class="fa-brands fa-google mr-2 text-cyan-400"></i>Recensioni Google di ${esc(p.displayName)}</h3>
                <p class="text-xs text-slate-400 mb-4"><span class="stars">${stars(p.rating || 0)}</span> ${p.rating ? p.rating.toFixed(1) : ''} · ${p.userRatingCount || 0} recensioni sul venditore</p>
                <div class="space-y-3">${p.reviews.slice(0, 3).map(r => `
                    <article class="review">
                        <div class="flex items-center gap-3 mb-2">
                            <span class="avatar">${esc((r.authorAttribution?.displayName || '?').charAt(0).toUpperCase())}</span>
                            <div class="flex-1"><p class="text-sm text-white">${esc(r.authorAttribution?.displayName || 'Utente Google')}</p><p class="text-xs text-slate-400">${esc(r.relativePublishTimeDescription || '')}</p></div>
                            <span class="stars">${stars(r.rating || 0)}</span>
                        </div>
                        <p class="text-sm text-slate-300 leading-relaxed">${esc(r.text || '')}</p>
                    </article>`).join('')}</div>
                <a href="${esc(p.googleMapsURI || '#')}" target="_blank" rel="noopener" class="inline-block mt-3 text-xs text-cyan-400 underline">Vedi su Google Maps</a>
            </div>`;
    } catch (e) { /* sezione omessa se la chiave o l'API non funzionano */ }
}

$('app').innerHTML = '<p class="text-center text-slate-300 text-sm py-20"><i class="fa-solid fa-circle-notch fa-spin mr-2 text-cyan-400"></i>Carico foto e informazioni…</p>';
if (car) loadWeb().catch(() => {}).finally(() => { render(); loadGoogleReviews(); }); else render();
