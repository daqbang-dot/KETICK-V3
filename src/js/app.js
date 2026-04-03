// ================================================
// KETICK BizPro v6 - Flux Edition
// app.js - LENGKAP dengan Activation System Versi A (1 Key = 1 Device)
// ================================================

// ================== DATA & STORAGE ==================
let db = {
    inv: JSON.parse(localStorage.getItem('f6_inv')) || [],
    cli: JSON.parse(localStorage.getItem('f6_cli')) || [],
    hist: JSON.parse(localStorage.getItem('f6_hist')) || [],
    jobs: JSON.parse(localStorage.getItem('f6_jobs')) || [],
    sch: JSON.parse(localStorage.getItem('f6_sch')) || [],
    coupons: JSON.parse(localStorage.getItem('f6_coupons')) || [],
    ref: JSON.parse(localStorage.getItem('f6_ref')) || { QUO: 1001, INV: 1001, REC: 1001 },
    refRecycle: JSON.parse(localStorage.getItem('f6_refRecycle')) || { QUO: [], INV: [], REC: [] },
    prof: JSON.parse(localStorage.getItem('f6_prof')) || { name: '', addr: '', bank: '', logo: '', cop: '' },
    tax: JSON.parse(localStorage.getItem('f6_tax')) || [],
    ar: JSON.parse(localStorage.getItem('f6_ar')) || [],
    lowStockThreshold: parseInt(localStorage.getItem('lowStockThreshold')) || 5
};

// TAMBAH DATA CONTOH JIKA KOSONG
if (db.inv.length === 0) {
    db.inv.push({ id: Date.now(), name: 'Produk Demo 1', kos: 10, jual: 20, qty: 100, details: ['Spesifikasi A'], img: '', showDetails: true, salesCount: 0 });
    db.inv.push({ id: Date.now()+1, name: 'Produk Demo 2', kos: 15, jual: 30, qty: 50, details: [], img: '', showDetails: true, salesCount: 0 });
    localStorage.setItem('f6_inv', JSON.stringify(db.inv));
}
if (db.cli.length === 0) {
    db.cli.push({ id: Date.now(), name: 'Pelanggan Demo', phone: '60123456789', addr: 'Alamat Demo' });
    localStorage.setItem('f6_cli', JSON.stringify(db.cli));
}
if (db.tax.length === 0) {
    db.tax.push({ id: Date.now(), date: new Date().toISOString().slice(0,10), amt: 100, cat: 'Sewa', vendor: 'Tuan Rumah', img: '' });
    localStorage.setItem('f6_tax', JSON.stringify(db.tax));
}

if (db.coupons && !Array.isArray(db.coupons)) {
    const old = db.coupons;
    db.coupons = Object.entries(old).map(([code, value]) => ({ code, value, quantity: 999 }));
    localStorage.setItem('f6_coupons', JSON.stringify(db.coupons));
}

const defaultTemplates = [
    { id: 101, title: '⭐ Sapaan Professional', msg: 'Salam Sejahtera {name}, terima kasih kerana menghubungi kami. Ada apa yang boleh kami bantu hari ini?' },
    { id: 102, title: '📄 Info Sebut Harga', msg: 'Hai {name}, ini adalah sebut harga bagi produk yang diminta. Harga kami adalah yang terbaik mengikut kualiti yang ditawarkan. Sila semak fail dilampirkan.' },
    { id: 103, title: '⏳ Follow-up Lembut', msg: 'Salam {name}, saya ingin menyusul (follow-up) berkenaan tawaran semalam. Adakah anda mempunyai sebarang soalan tambahan?' },
    { id: 104, title: '✅ Close Deal / Terima Kasih', msg: 'Terima kasih {name} atas tempahan anda! Kami akan proses pesanan anda secepat mungkin. Harap anda berpuas hati dengan servis kami.' },
    { id: 105, title: '🌙 Di Luar Waktu Pejabat', msg: 'Terima kasih atas mesej anda. Kami kini di luar waktu operasi. Kami akan menghubungi anda semula pada hari bekerja berikutnya. Terima kasih atas kesabaran anda.' }
];

if (db.ar.length === 0) {
    db.ar = [...defaultTemplates];
    localStorage.setItem('f6_ar', JSON.stringify(db.ar));
}

function save() {
    Object.keys(db).forEach(key => {
        if (key !== 'lowStockThreshold') localStorage.setItem(`f6_${key}`, JSON.stringify(db[key]));
    });
    localStorage.setItem('lowStockThreshold', db.lowStockThreshold);
}

function getNextRef(type) {
    if (db.refRecycle[type].length > 0) {
        const num = db.refRecycle[type].pop();
        save();
        return num;
    } else {
        const next = db.ref[type];
        db.ref[type]++;
        save();
        return next;
    }
}

function recycleRef(type, num) {
    db.refRecycle[type].push(num);
    save();
}

// ================== ACTIVATION SYSTEM VERSI A (1 Key = 1 Device) ==================
const MASTER_SECRET = "KETICK_BIZPRO_2026_AZLAN_SECURE_V2_8K3M9P2X"; // MESTI SAMA DENGAN keygen.html

let activationData = JSON.parse(localStorage.getItem('bizpro_activation')) || {
    activated: false,
    deviceFingerprint: null,
    serialNumber: null,
    activationDate: null,
    userNote: null,
    keyUsed: null
};

async function generateDeviceFingerprint() {
    const parts = [];
    parts.push(screen.width + "x" + screen.height);
    parts.push(screen.colorDepth);
    parts.push(navigator.platform);
    parts.push(navigator.language);
    parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
    parts.push(new Date().getTimezoneOffset());

    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                parts.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '');
                parts.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '');
            }
        }
    } catch (e) {}

    const str = parts.join('|');
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hash));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

async function verifyActivationKey(inputKey) {
    if (!inputKey || typeof inputKey !== 'string') return false;

    const parts = inputKey.split('-');
    if (parts.length < 3) return false;

    const serial = parts[0] + '-' + parts[1];
    const signature = parts.slice(2).join('-');

    const deviceFingerprint = await generateDeviceFingerprint();
    const dataToVerify = `\( {deviceFingerprint}| \){activationData.userNote || ''}|LIFETIME|\( {activationData.activationDate || ''}| \){MASTER_SECRET}`;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(dataToVerify);
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 24).toUpperCase();

    if (computedSignature === signature) {
        activationData = {
            activated: true,
            deviceFingerprint: deviceFingerprint,
            serialNumber: serial,
            activationDate: new Date().toISOString(),
            userNote: activationData.userNote || "Pengguna Baru",
            keyUsed: inputKey
        };
        localStorage.setItem('bizpro_activation', JSON.stringify(activationData));
        console.log(`✅ Activation berjaya! Serial: ${serial}`);
        return true;
    }
    return false;
}

function isActivated() {
    return activationData.activated === true && activationData.deviceFingerprint !== null;
}

async function showActivationModal() {
    const deviceFingerprint = await generateDeviceFingerprint();

    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-[2000] glass-modal-overlay flex items-center justify-center';
        modal.innerHTML = `
            <div class="glass-panel w-[92%] max-w-md p-8 rounded-[32px]">
                <div class="text-5xl mb-6 text-center"><i class="fas fa-shield-alt text-purple-500"></i></div>
                <h3 class="text-2xl font-black text-center mb-2">Aktifkan KETICK BizPro</h3>
                <p class="text-sm text-gray-400 text-center mb-6">Masukkan Lifetime Key</p>

                <div class="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl text-xs font-mono break-all">
                    ${deviceFingerprint}
                </div>

                <input type="text" id="activation-key-input" 
                       class="w-full p-5 rounded-2xl text-center text-lg font-mono tracking-widest bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:border-purple-500 outline-none"
                       placeholder="KET-001-XXXXXXXXXXXXXXXXXXXXXXXX" autocomplete="off">

                <div id="key-error" class="text-red-500 text-sm mt-3 text-center hidden"></div>

                <div class="flex gap-3 mt-8">
                    <button id="key-cancel" class="flex-1 py-4 rounded-2xl bg-gray-200 dark:bg-gray-700 font-bold">Batal</button>
                    <button id="key-submit" class="flex-1 py-4 rounded-2xl bg-purple-600 text-white font-bold">Aktifkan</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const input = modal.querySelector('#activation-key-input');
        const submitBtn = modal.querySelector('#key-submit');
        const cancelBtn = modal.querySelector('#key-cancel');
        const errorDiv = modal.querySelector('#key-error');

        const cleanup = () => modal.remove();

        submitBtn.onclick = async () => {
            const key = input.value.trim().toUpperCase();
            submitBtn.disabled = true;
            submitBtn.textContent = 'Mengesahkan...';

            const success = await verifyActivationKey(key);

            if (success) {
                cleanup();
                resolve(true);
            } else {
                errorDiv.textContent = 'Key tidak sah atau tidak sepadan dengan peranti ini.';
                errorDiv.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Aktifkan';
            }
        };

        cancelBtn.onclick = () => { cleanup(); resolve(false); };
        input.focus();
    });
}

// ================== GLOBAL VARIABLES ==================
let currentModule = 'dashboard';
let logoClickCount = 0;
let logoTimeout;
let activeDiscount = 0;
let cart = [];
let posDiscount = 0;
let currentReviewDoc = null;
let blastImageData = null;

// ================== ENTER SYSTEM ==================
async function enterSystem() {
    document.getElementById('login-overlay').classList.add('hidden');
    setupAdminGesture();

    if (!isActivated()) {
        const setupBtn = document.getElementById('first-time-setup-btn');
        if (setupBtn) setupBtn.classList.remove('hidden');

        const activated = await showActivationModal();
        
        if (!activated) {
            document.getElementById('login-overlay').classList.remove('hidden');
            return;
        }

        if (setupBtn) setupBtn.classList.add('hidden');
    }

    logActivity('app_open', { 
        serial: activationData.serialNumber,
        device: activationData.deviceFingerprint 
    });

    loadModule('dashboard');
    initAppAfterActivation();
}

function initAppAfterActivation() {
    const now = new Date();
    const dateDisplay = document.getElementById('current-date-display');
    if (dateDisplay) dateDisplay.innerText = now.toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    
    const bizName = document.getElementById('set-biz-name');
    if (bizName) bizName.value = db.prof.name;
    const bizAddr = document.getElementById('set-biz-addr');
    if (bizAddr) bizAddr.value = db.prof.addr;
    const bizBank = document.getElementById('set-biz-bank');
    if (bizBank) bizBank.value = db.prof.bank;

    applyTheme();
    applyLanguage();
    updateBizProfile();
    renderDashboard();

    if (db.jobs.length === 0) {
        const today = new Date().toISOString().slice(0,10);
        db.jobs.push({ t: "Contoh: Mesyuarat", d: today, id: Date.now() });
        save();
        renderJobs();
    }
    
    checkLowStockAndNotify([]);
    scheduleAllReminders();
    if (Notification.permission === 'default') Notification.requestPermission();
}

// ================== BACK NAVIGATION ==================
function setupHistoryNavigation() {
    window.addEventListener('popstate', (event) => {
        const state = event.state;
        if (state && state.module) loadModule(state.module);
        else if (currentModule) loadModule(currentModule);
    });
}
setupHistoryNavigation();

// ================== MODULE LOADER ==================
async function loadModule(moduleName) {
    if (!isActivated()) {
        const activated = await showActivationModal();
        if (!activated) return;
    }

    document.getElementById('reviewModal')?.classList.add('hidden');
    document.getElementById('tax-modal')?.classList.add('hidden');

    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    try {
        const response = await fetch(`src/modules/\( {moduleName}/ \){moduleName}.html`);
        if (!response.ok) {
            alert(`Gagal memuat modul: ${moduleName}`);
            return;
        }
        const html = await response.text();
        appContent.innerHTML = html;
    } catch (err) {
        alert('Ralat memuat modul: ' + err);
        return;
    }

    currentModule = moduleName;
    history.pushState({ module: moduleName }, '', `#${moduleName}`);

    const renderFunc = {
        'dashboard': renderDashboard,
        'pos': () => { renderProductGrid(); renderCart(); setupPosExtra(); },
        'inventory': renderInventory,
        'crm': renderCRM,
        'billing': () => { populateBillingClients(); updateBillingTheme(); },
        'promo': renderCoupons,
        'social': () => { renderSchedule(); setupSocialExtra(); },
        'blast': () => { renderBlastClientList(); setupBlastExtra(); },
        'autoreply': renderAR,
        'lhdn': () => { renderTax(); setupTaxModalReset(); },
        'history': () => { renderHistory(); setupHistoryExtra(); },
        'report': () => { initReportModule(); }
    }[moduleName];

    if (renderFunc) renderFunc();

    logActivity('module_view', { module: moduleName });

    document.querySelectorAll('.nav-item-drawer').forEach(btn => {
        const onclick = btn.getAttribute('onclick');
        if (onclick && onclick.includes(moduleName)) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

// ================== LOG ACTIVITY ==================
function logActivity(event, data = {}) {
    const logs = JSON.parse(localStorage.getItem('bizpro_activity_log') || '[]');
    logs.push({ event, data, timestamp: new Date().toISOString() });
    if (logs.length > 500) logs.shift();
    localStorage.setItem('bizpro_activity_log', JSON.stringify(logs));
}

// ================== ADMIN GESTURE ==================
function setupAdminGesture() {
    const logo = document.getElementById('app-logo');
    if (!logo) return;
    logo.addEventListener('click', () => {
        logoClickCount++;
        clearTimeout(logoTimeout);
        logoTimeout = setTimeout(() => { logoClickCount = 0; }, 1000);
        if (logoClickCount >= 5) {
            window.open('admin.html', '_blank');
            logoClickCount = 0;
        }
    });
}

// ================== DWIBAHASA & THEME ==================
let currentLang = localStorage.getItem('f6_lang') || 'BM';
let isDarkTheme = localStorage.getItem('f6_dark') === 'true';

const i18nDict = {
    'BM': { /* semua terjemahan BM anda */ },
    'EN': { /* semua terjemahan EN anda */ }
};

function t(key) { return i18nDict[currentLang][key] || key; }

function toggleLanguage() {
    currentLang = currentLang === 'BM' ? 'EN' : 'BM';
    localStorage.setItem('f6_lang', currentLang);
    applyLanguage();
}

function applyLanguage() {
    const btn = document.getElementById('btn-lang');
    if (btn) btn.innerText = currentLang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18nDict[currentLang] && i18nDict[currentLang][key]) el.innerText = i18nDict[currentLang][key];
    });
    renderDashboard(); renderProductGrid(); renderCart(); renderInventory(); renderCRM(); renderCoupons(); renderSchedule(); renderAR(); renderTax(); renderHistory();
}

function toggleDarkMode() {
    isDarkTheme = !isDarkTheme;
    localStorage.setItem('f6_dark', isDarkTheme);
    applyTheme();
}

function applyTheme() {
    const btn = document.getElementById('btn-theme');
    if (isDarkTheme) { 
        document.body.classList.add('dark-mode'); 
        if (btn) btn.innerHTML = '<i class="fas fa-sun text-amber-500"></i>'; 
    } else { 
        document.body.classList.remove('dark-mode'); 
        if (btn) btn.innerHTML = '<i class="fas fa-moon"></i>'; 
    }
}

// ================== CUSTOM MODAL ==================
function showCustomModal(type, title, msg, defaultValue = '') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMsg = document.getElementById('modal-msg');
        const modalInput = document.getElementById('modal-input');
        const btnOk = document.getElementById('modal-ok');
        const btnCancel = document.getElementById('modal-cancel');
        const modalIcon = document.getElementById('modal-icon');

        modalTitle.innerText = title;
        modalMsg.innerText = msg;
        modal.classList.remove('hidden');
        setTimeout(() => { modal.classList.remove('opacity-0'); modal.querySelector('.glass-panel').classList.remove('scale-95'); }, 10);
        btnCancel.classList.add('hidden'); modalInput.classList.add('hidden');
        if (type === 'alert') modalIcon.innerHTML = '<i class="fas fa-info-circle text-blue-500"></i>';
        else if (type === 'confirm') { modalIcon.innerHTML = '<i class="fas fa-question-circle text-amber-500"></i>'; btnCancel.classList.remove('hidden'); }
        else if (type === 'prompt') { modalIcon.innerHTML = '<i class="fas fa-pen text-emerald-500"></i>'; btnCancel.classList.remove('hidden'); modalInput.classList.remove('hidden'); modalInput.value = defaultValue; setTimeout(() => modalInput.focus(), 100); }

        const cleanup = () => {
            modal.classList.add('opacity-0'); modal.querySelector('.glass-panel').classList.add('scale-95');
            setTimeout(() => modal.classList.add('hidden'), 300);
            btnOk.onclick = null; btnCancel.onclick = null;
        };
        btnOk.onclick = () => { cleanup(); if (type === 'prompt') resolve(modalInput.value); else resolve(true); };
        btnCancel.onclick = () => { cleanup(); if (type === 'prompt') resolve(null); else resolve(false); };
    });
}

const showAlert = async (msg) => await showCustomModal('alert', currentLang==='BM'?'Perhatian':'Attention', msg);
const showConfirm = async (msg) => await showCustomModal('confirm', currentLang==='BM'?'Pengesahan':'Confirmation', msg);
const showPrompt = async (msg, def='') => await showCustomModal('prompt', currentLang==='BM'?'Sila Masukkan Maklumat':'Please Enter Details', msg, def);

// ================== LOW STOCK ==================
function getLowStockItems() { return db.inv.filter(item => item.qty <= db.lowStockThreshold); }
function showLowStockToast(message) { 
    const oldToast = document.querySelector('.toast-notify'); 
    if (oldToast) oldToast.remove(); 
    const toast = document.createElement('div'); 
    toast.className = 'toast-notify'; 
    toast.innerHTML = `<i class="fas fa-exclamation-triangle text-red-400 mr-2"></i> ${message} <button onclick="this.parentElement.remove()" class="ml-2 text-white font-bold">✕</button>`; 
    document.body.appendChild(toast); 
    setTimeout(() => toast.remove(), 5000); 
}
function updateLowStockPanel() { 
    const lowItems = getLowStockItems(); 
    const panel = document.getElementById('low-stock-panel'); 
    const container = document.getElementById('low-stock-list'); 
    if (lowItems.length === 0) { if(panel) panel.classList.add('hidden'); return; } 
    if(panel) panel.classList.remove('hidden'); 
    if(container) container.innerHTML = lowItems.map(item => `<div class="flex justify-between items-center border-b border-red-100 pb-2"><span class="font-bold">${item.name}</span><span class="text-red-600 font-black">Stok: \( {item.qty}</span><button onclick="loadModule('inventory'); closeDrawer();" class="text-xs bg-red-100 px-2 py-1 rounded-full"> \){t('Pergi ke Inventory')}</button></div>`).join(''); 
}
function checkLowStockAndNotify(previousLowIds = []) { 
    const lowItems = getLowStockItems(); 
    const currentLowIds = lowItems.map(i => i.id); 
    const newLow = lowItems.filter(i => !previousLowIds.includes(i.id)); 
    if (newLow.length > 0) { 
        const names = newLow.map(i => i.name).join(', '); 
        showLowStockToast(`⚠️ Stok kritikal: ${names} (≤ ${db.lowStockThreshold})`); 
    } 
    updateLowStockPanel(); 
    return currentLowIds; 
}
async function openThresholdModal() { 
    const newVal = await showPrompt(currentLang==='BM'?`Tetapkan ambang stok rendah:`:`Set low stock threshold:`, db.lowStockThreshold); 
    if (newVal !== null && !isNaN(parseInt(newVal))) { 
        db.lowStockThreshold = parseInt(newVal); 
        save(); 
        checkLowStockAndNotify([]); 
        renderInventory(); 
        showAlert(currentLang==='BM'?`Ambang ditukar kepada ${db.lowStockThreshold}`:`Threshold changed to ${db.lowStockThreshold}`); 
    } 
}

// ================== INVENTORY ==================
function renderInventory() { 
    const tbody = document.getElementById('inventory-table-body'); 
    if(!tbody) return; 
    const lowIds = getLowStockItems().map(i => i.id); 
    tbody.innerHTML = db.inv.map((item, idx) => {
        return `<tr class="border-b border-gray-50 align-top hover:bg-gray-50/50 transition ${lowIds.includes(item.id) ? 'low-stock-row' : ''}">
            <td class="p-6"><div class="w-16 h-16 bg-gray-100 rounded-2xl overflow-hidden relative border border-white flex items-center justify-center">\( {item.img ? `<img src=" \){item.img}" class="w-full h-full object-cover">` : `<i class="fas fa-camera text-gray-300"></i>`}<input type="file" onchange="updateInvImg(this, ${idx})" class="absolute inset-0 opacity-0 cursor-pointer"></div><\/td>
            <td class="p-6"><input type="text" value="\( {item.name}" onchange="updateInv( \){idx}, 'name', this.value)" class="font-bold w-full bg-transparent outline-none text-gray-800">
            <div class="mt-2 space-y-1 \( {item.showDetails ? '' : 'hidden'}"> \){(item.details || []).map((d, dIdx) => `<div class="flex gap-1"><input type="text" value="\( {d}" onchange="db.inv[ \){idx}].details[\( {dIdx}]=this.value; save();" placeholder="Spec" class="block text-[10px] p-2 w-full bg-white border border-gray-100 rounded-lg shadow-sm"><button onclick="db.inv[ \){idx}].details.splice(${dIdx},1); renderInventory(); save();" class="text-red-300 text-[10px]">&times;</button></div>`).join('')}</div>
            <div class="flex gap-4 mt-3"><button onclick="if(!db.inv[\( {idx}].details) db.inv[ \){idx}].details=[]; db.inv[${idx}].details.push(''); renderInventory();" class="text-[9px] font-black text-blue-600 uppercase"><i class="fas fa-plus mr-1"></i> \( {t('TAMBAH SPEC')}</button><button onclick="db.inv[ \){idx}].showDetails=!db.inv[${idx}].showDetails; renderInventory();" class="text-[9px] font-bold text-gray-400 uppercase"><i class="fas ${item.showDetails ? 'fa-eye-slash' : 'fa-eye'} mr-1"></i> ${item.showDetails ? t('SOROK') : t('LIHAT')}</button></div><\/td>
            <td class="p-6"><input type="number" value="\( {item.kos}" onchange="updateInv( \){idx}, 'kos', this.value)" class="w-20 p-2 flux-input text-xs font-bold"><\/td>
            <td class="p-6"><input type="number" value="\( {item.jual}" onchange="updateInv( \){idx}, 'jual', this.value)" class="w-20 p-2 flux-input text-xs font-bold text-blue-600"><\/td>
            <td class="p-6"><input type="number" value="\( {item.qty}" onchange="updateInv( \){idx}, 'qty', this.value)" class="w-16 p-2 flux-input text-xs text-center font-bold"><\/td>
            <td class="p-6 text-center"><button onclick="db.inv.splice(${idx},1); save(); renderInventory();" class="text-gray-300 hover:text-red-500 text-xs"><i class="fas fa-trash-alt"></i></button><\/td>
         <\/tr>`;
    }).join(''); 
}
function addInventoryItem() { 
    db.inv.push({ id: Date.now(), name: currentLang==='BM'?'Produk Baru':'New Product', kos: 0, jual: 0, qty: 0, details: [], img: '', showDetails: true, salesCount: 0 }); 
    renderInventory(); save(); checkLowStockAndNotify([]); 
}
function updateInv(idx, field, val) { 
    db.inv[idx][field] = (field === 'name') ? val : parseFloat(val); 
    save(); renderInventory(); 
    if (field === 'qty') { 
        const lowItems = getLowStockItems(); 
        if (lowItems.some(i => i.id === db.inv[idx].id)) showLowStockToast(`⚠️ Stok \( {db.inv[idx].name} kini kritikal ( \){db.inv[idx].qty})`); 
        updateLowStockPanel(); 
    } 
}
function updateInvImg(input, idx) { 
    const reader = new FileReader(); 
    reader.onload = (e) => { db.inv[idx].img = e.target.result; save(); renderInventory(); }; 
    reader.readAsDataURL(input.files[0]); 
}

// ================== DASHBOARD ==================
function renderDashboard() { 
    const paidTransactions = db.hist.filter(h => h.type === 'REC'); 
    const totalRev = paidTransactions.reduce((sum, h) => sum + h.total, 0); 
    const totalMargin = paidTransactions.reduce((sum, h) => sum + h.margin, 0); 
    const totalTax = db.tax.reduce((sum, t) => sum + t.amt, 0); 
    const dashRev = document.getElementById('dash-total-rev'); 
    if(dashRev) dashRev.innerText = `RM ${totalRev.toFixed(2)}`; 
    const dashMargin = document.getElementById('dash-total-margin'); 
    if(dashMargin) dashMargin.innerText = `RM ${totalMargin.toFixed(2)}`; 
    const dashTax = document.getElementById('dash-tax-expense'); 
    if(dashTax) dashTax.innerText = `RM ${totalTax.toFixed(2)}`; 
    const dashInvCount = document.getElementById('dash-inv-count'); 
    if(dashInvCount) dashInvCount.innerText = `${db.inv.length} Unit`; 
    renderJobs(); 
    updateLowStockPanel(); 
}

// ================== MINI POS ==================
function renderProductGrid() {
    const searchTerm = (document.getElementById('pos-search')?.value || '').toLowerCase();
    let filtered = db.inv.filter(p => p.name.toLowerCase().includes(searchTerm));
    const sorted = [...filtered].sort((a,b) => (b.salesCount || 0) - (a.salesCount || 0));
    const top4 = sorted.slice(0,4);
    const others = sorted.slice(4);
    const container = document.getElementById('product-grid');
    if (!container) return;
    let html = '';
    if (top4.length) {
        html += `<div class="col-span-full text-xs font-bold text-gray-500 mb-2">🔥 Best Seller</div><div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">`;
        html += top4.map(p => productCard(p)).join('');
        html += `</div>`;
    }
    if (others.length) {
        html += `<div class="col-span-full text-xs font-bold text-gray-500 mt-4 mb-2">📦 Semua Produk</div><div class="product-grid">`;
        html += others.map(p => productCard(p)).join('');
        html += `</div>`;
    }
    container.innerHTML = html;
}
function productCard(p) {
    const lowIds = getLowStockItems().map(i => i.id);
    return `<div class="product-btn \( {lowIds.includes(p.id) ? 'low-stock' : ''}" onclick="addToCart( \){p.id})">
        <div class="flex justify-center mb-1">\( {p.img ? `<img src=" \){p.img}" class="w-12 h-12 object-cover rounded-lg">` : '<i class="fas fa-box text-gray-400 text-2xl"></i>'}</div>
        <div class="font-bold text-sm truncate">${p.name}</div>
        <div class="text-blue-600 font-black text-lg">RM ${p.jual.toFixed(2)}</div>
        <div class="text-[10px] text-gray-400">Stok: ${p.qty}</div>
    </div>`;
}
function setupPosExtra() {}
async function addToCart(productId) { 
    const product = db.inv.find(p => p.id === productId); 
    if (!product) return; 
    if (product.qty <= 0) { await showAlert(currentLang==='BM'?"Stok habis!":"Out of stock!"); return; } 
    const existing = cart.find(i => i.id === productId); 
    if (existing) { 
        if (existing.qty + 1 > product.qty) { await showAlert(currentLang==='BM'?"Stok tidak mencukupi":"Insufficient stock"); return; } 
        existing.qty++; 
    } else { 
        cart.push({ id: product.id, name: product.name, price: product.jual, qty: 1 }); 
    } 
    renderCart(); 
}
async function updateCartQty(id, delta) { 
    const idx = cart.findIndex(i => i.id === id); 
    if (idx === -1) return; 
    const product = db.inv.find(p => p.id === id); 
    const newQty = cart[idx].qty + delta; 
    if (newQty <= 0) { cart.splice(idx,1); } 
    else if (product && newQty > product.qty) { await showAlert(currentLang==='BM'?"Stok tidak mencukupi":"Insufficient stock"); return; } 
    else { cart[idx].qty = newQty; } 
    renderCart(); 
}
function removeCartItem(id) { cart = cart.filter(i => i.id !== id); renderCart(); }
function renderCart() { 
    const container = document.getElementById('cart-items'); 
    if (!container) return; 
    if (cart.length === 0) { 
        container.innerHTML = `<div class="text-center text-gray-400 py-4">${t('Keranjang kosong')}</div>`; 
        document.getElementById('cart-total').innerText = 'RM 0.00'; 
        document.getElementById('cart-grand').innerText = 'RM 0.00'; 
        document.getElementById('discount-row').style.display = 'none'; 
        calculateChange(); return; 
    } 
    let total = 0; 
    container.innerHTML = cart.map(item => { 
        const lineTotal = item.price * item.qty; total += lineTotal; 
        return `<div class="cart-item"><div><span class="font-bold">${item.name}</span><div class="text-xs text-gray-500">RM \( {item.price.toFixed(2)}</div></div><div class="cart-qty"><button onclick="updateCartQty( \){item.id}, -1)">-</button><span class="w-8 text-center">\( {item.qty}</span><button onclick="updateCartQty( \){item.id}, 1)">+</button><button onclick="removeCartItem(${item.id})" class="text-red-500 ml-2"><i class="fas fa-trash-alt"></i></button></div><div class="font-bold">RM ${lineTotal.toFixed(2)}</div></div>`; 
    }).join(''); 
    document.getElementById('cart-total').innerText = `RM ${total.toFixed(2)}`; 
    const grand = total - posDiscount; 
    document.getElementById('cart-grand').innerText = `RM ${grand.toFixed(2)}`; 
    if (posDiscount > 0) { 
        document.getElementById('discount-row').style.display = 'flex'; 
        document.getElementById('cart-discount').innerText = `- RM ${posDiscount.toFixed(2)}`; 
    } else { 
        document.getElementById('discount-row').style.display = 'none'; 
    } 
    calculateChange(); 
}
function calculateChange() { 
    const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0); 
    const grand = total - posDiscount; 
    const cash = parseFloat(document.getElementById('cash-paid')?.value) || 0; 
    const change = cash - grand; 
    const changeSpan = document.getElementById('change-amount'); 
    if (changeSpan) changeSpan.innerText = `RM ${change >= 0 ? change.toFixed(2) : '0.00'}`; 
    return change; 
}
function clearCart() { cart = []; posDiscount = 0; document.getElementById('pos-coupon').value = ''; renderCart(); document.getElementById('cash-paid').value = ''; calculateChange(); }
async function applyPosCoupon() { 
    const code = document.getElementById('pos-coupon').value.toUpperCase(); 
    const coupon = db.coupons.find(c => c.code === code && c.quantity > 0); 
    if (coupon) { 
        posDiscount = coupon.value; 
        coupon.quantity--; 
        if (coupon.quantity === 0) { const idx = db.coupons.indexOf(coupon); db.coupons.splice(idx,1); } 
        save(); renderCoupons(); 
        await showAlert(currentLang==='BM'?`Kupon ${code} digunakan: RM ${posDiscount} diskaun`:`Coupon ${code} applied: RM ${posDiscount} discount`); 
        renderCart(); 
    } else { 
        await showAlert(currentLang==='BM'?"Kupon tidak sah atau habis!":"Invalid or expired coupon!"); 
        posDiscount = 0; renderCart(); 
    } 
}
async function completeSale() { 
    if (cart.length === 0) { await showAlert(currentLang==='BM'?"Keranjang kosong":"Cart is empty"); return; } 
    const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0); 
    const grand = total - posDiscount; 
    const cash = parseFloat(document.getElementById('cash-paid')?.value) || 0; 
    if (cash < grand) { await showAlert(currentLang==='BM'?"Tunai tidak mencukupi":"Insufficient cash"); return; } 
    const custName = document.getElementById('pos-cust-name').value.trim(); 
    const custPhone = document.getElementById('pos-cust-phone').value.trim(); 
    if (custName) { 
        const existing = db.cli.find(c => c.name.toLowerCase() === custName.toLowerCase()); 
        if (!existing) { db.cli.push({ id: Date.now(), name: custName, phone: custPhone, addr: '' }); save(); renderCRM(); } 
        else if (custPhone && existing.phone !== custPhone) { existing.phone = custPhone; save(); renderCRM(); } 
    } 
    let margin = 0; const items = []; const previousLowIds = getLowStockItems().map(i => i.id); 
    for (let item of cart) { 
        const product = db.inv.find(p => p.id === item.id); 
        if (product) { 
            if (product.qty < item.qty) { await showAlert(currentLang==='BM'?`Stok ${product.name} tidak mencukupi`:`Not enough stock for ${product.name}`); return; } 
            product.qty -= item.qty; 
            product.salesCount = (product.salesCount || 0) + item.qty; 
            margin += (product.jual - product.kos) * item.qty; 
            items.push({ name: product.name, qty: item.qty, jual: product.jual, kos: product.kos }); 
        } 
    } 
    const newRef = `REC${getNextRef('REC')}`; 
    db.hist.push({ id: Date.now(), date: new Date().toLocaleDateString('en-GB'), ref: newRef, type: 'REC', clientName: custName || 'POS Walk-in', phone: custPhone, total: grand, margin: margin, items: items, discount: posDiscount }); 
    save(); 
    checkLowStockAndNotify(previousLowIds); 
    renderInventory(); renderDashboard(); 
    const change = cash - grand; 
    printReceiptNow(grand, cash, change, custName, custPhone); 
    if (custPhone) { 
        const receiptMsg = generateReceiptMessage(grand, custName, items); 
        const encodedMsg = encodeURIComponent(receiptMsg); 
        window.open(`https://wa.me/\( {custPhone}?text= \){encodedMsg}`, '_blank'); 
    } 
    clearCart(); 
    await showAlert(currentLang==='BM'?"Jualan selesai. Resit dibuka.":"Sale complete. Receipt generated."); 
}
async function printReceipt() { 
    if (cart.length === 0) { await showAlert(currentLang==='BM'?"Tiada item dalam keranjang":"No items in cart"); return; } 
    const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0); 
    const grand = total - posDiscount; 
    const cash = parseFloat(document.getElementById('cash-paid')?.value) || 0; 
    const change = cash - grand; 
    const custName = document.getElementById('pos-cust-name').value.trim(); 
    const custPhone = document.getElementById('pos-cust-phone').value.trim(); 
    printReceiptNow(grand, cash, change, custName, custPhone); 
}
function printReceiptNow(total, cash, change, custName, custPhone) { 
    const bizName = db.prof.name || "SYARIKAT ANDA"; 
    const bizAddr = db.prof.addr || ""; 
    const date = new Date().toLocaleString(); 
    let itemsHtml = ''; 
    cart.forEach(item => { itemsHtml += `<div style="display:flex; justify-content:space-between;"><span>\( {item.name} x \){item.qty}</span><span>RM ${(item.price * item.qty).toFixed(2)}</span></div>`; }); 
    const receiptHtml = `<div style="width: 300px; margin:0 auto; font-family: monospace; padding: 16px; border: 1px solid #ccc; border-radius: 12px;"><div style="text-align: center; font-weight: bold; font-size: 16px;">\( {bizName}</div><div style="text-align: center; font-size: 10px;"> \){bizAddr}</div><div style="text-align: center; font-size: 10px;">\( {date}</div> \){custName ? `<div style="margin-top:8px;">Pelanggan: ${custName} \( {custPhone ? `( \){custPhone})` : ''}</div>` : ''}<hr style="margin: 8px 0;">\( {itemsHtml} \){posDiscount > 0 ? `<div style="display:flex; justify-content:space-between;"><span>Diskaun</span><span>- RM ${posDiscount.toFixed(2)}</span></div>` : ''}<hr style="margin: 8px 0;"><div style="display:flex; justify-content:space-between;"><strong>JUMLAH</strong><strong>RM ${total.toFixed(2)}</strong></div><div style="display:flex; justify-content:space-between;">TUNAI: RM ${cash.toFixed(2)}</div><div style="display:flex; justify-content:space-between;">BAKI: RM ${change >= 0 ? change.toFixed(2) : '0.00'}</div><hr style="margin: 8px 0;"><div style="text-align: center; font-size: 10px;">Terima kasih! Selamat datang lagi.</div></div>`; 
    const printWindow = window.open('', '_blank'); 
    printWindow.document.write(`<html><head><title>Resit POS</title><style>body { display: flex; justify-content: center; align-items: center; min-height: 100vh; }</style></head><body>${receiptHtml}<script>window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 500); };<\/script></body></html>`); 
    printWindow.document.close(); 
}

function generateReceiptMessage(total, custName, items) {
    let msg = `🧾 *RESIT PEMBELIAN*\n`;
    if (custName) msg += `Pelanggan: ${custName}\n`;
    msg += `Tarikh: ${new Date().toLocaleString()}\n\n`;
    items.forEach(i => { msg += `\( {i.name} x \){i.qty} = RM ${(i.jual * i.qty).toFixed(2)}\n`; });
    if (posDiscount > 0) msg += `Diskaun: -RM ${posDiscount.toFixed(2)}\n`;
    msg += `\n*JUMLAH: RM ${total.toFixed(2)}*\n\nTerima kasih!`;
    return msg;
}

// ================== BILLING ==================
async function generateFinalBilling() { 
    const type = document.getElementById('billing-type')?.value; 
    const selects = document.querySelectorAll('.item-select'), qtys = document.querySelectorAll('.qty-input'); 
    const clientId = document.getElementById('bill-client-select')?.value; 
    const client = db.cli.find(c => c.id == clientId); 
    let total = 0, margin = 0, items = []; 
    selects.forEach((s, idx) => { 
        const item = db.inv.find(i => i.id == s.value); 
        const q = parseInt(qtys[idx].value); 
        if(item) { 
            if(type !== 'QUO') item.qty -= q; 
            total += item.jual * q; 
            if(type === 'REC') margin += (item.jual - item.kos) * q; 
            items.push({ name: item.name, qty: q, jual: item.jual, kos: item.kos }); 
        } 
    }); 
    const finalTotal = total - activeDiscount; 
    const finalMargin = (type === 'REC') ? (margin - activeDiscount) : 0; 
    const refNum = getNextRef(type); 
    const newRef = `\( {type} \){refNum}`; 
    db.hist.push({ id: Date.now(), date: new Date().toLocaleDateString('en-GB'), ref: newRef, type: type, clientName: client ? client.name : 'Umum', phone: client?.phone || '', total: finalTotal, margin: finalMargin, items: items, discount: activeDiscount }); 
    save(); 
    await showAlert(currentLang==='BM'?`Rekod ${type} Berjaya Disimpan! No: \( {newRef}`:` \){type} Record Saved! No: ${newRef}`); 
    location.reload(); 
}
async function deleteDoc(id) { const doc = db.hist.find(h => h.id === id); if (doc) { const type = doc.type; const refNum = parseInt(doc.ref.slice(3)); recycleRef(type, refNum); db.hist = db.hist.filter(h => h.id !== id); save(); renderHistory(); await showAlert(currentLang==='BM'?`Dokumen ${doc.ref} dibatalkan. Nombor akan diguna semula.`:`Document ${doc.ref} cancelled. Number will be recycled.`); } }
function populateBillingClients() { const s = document.getElementById('bill-client-select'); if(s) s.innerHTML = '<option value="">-- Pilih Pelanggan --</option>' + db.cli.map(c => `<option value="\( {c.id}"> \){c.name}</option>`).join(''); }
function addBillingItemRow() { const div = document.createElement('div'); div.className = "flex gap-2"; div.innerHTML = `<select class="w-3/4 p-3 text-xs flux-input item-select" onchange="calcBilling()"><option value="">Pilih Produk...</option>\( {db.inv.map(i => `<option value=" \){i.id}">${i.name}</option>`).join('')}</select><input type="number" class="w-1/4 p-3 text-xs flux-input qty-input text-center" value="1" onchange="calcBilling()">`; document.getElementById('billing-items-input')?.appendChild(div); }
function calcBilling() { 
    const selects = document.querySelectorAll('.item-select'), qtys = document.querySelectorAll('.qty-input'), body = document.getElementById('preview-items-body'); 
    if(!body) return; 
    body.innerHTML = ''; 
    let sub = 0; 
    selects.forEach((s, idx) => { 
        const item = db.inv.find(i => i.id == s.value); 
        if(item) { 
            const line = item.jual * qtys[idx].value; 
            sub += line; 
            body.innerHTML += `<tr>
                <td class="p-5 font-bold text-gray-800">${item.name}<\/td>
                <td class="p-5 text-center font-bold">${qtys[idx].value}<\/td>
                <td class="p-5 text-right">RM ${item.jual.toFixed(2)}<\/td>
                <td class="p-5 text-right font-black doc-accent-text">RM ${line.toFixed(2)}<\/td>
             <\/tr>`; 
        } 
    }); 
    const grand = sub - activeDiscount; 
    document.getElementById('grandtotal').innerText = `RM ${Math.max(0, grand).toFixed(2)}`; 
    const discountRow = document.getElementById('preview-discount-row'); 
    if(activeDiscount>0) { 
        discountRow.classList.remove('hidden'); 
        document.getElementById('prev-discount-val').innerText = `- RM ${activeDiscount.toFixed(2)}`; 
    } else { 
        discountRow.classList.add('hidden'); 
    } 
}
async function applyCoupon() { const c = document.getElementById('coupon-input')?.value.toUpperCase(); const coupon = db.coupons.find(coupon => coupon.code === c && coupon.quantity > 0); if (coupon) { activeDiscount = coupon.value; coupon.quantity--; if (coupon.quantity === 0) { const idx = db.coupons.indexOf(coupon); db.coupons.splice(idx,1); } save(); renderCoupons(); await showAlert(currentLang==='BM'?"Kupon Guna!":"Coupon Applied!"); calcBilling(); } else { await showAlert(currentLang==='BM'?"Kupon tidak sah atau habis!":"Invalid or expired coupon!"); activeDiscount = 0; calcBilling(); } }
function updateBillTo() { const id = document.getElementById('bill-client-select')?.value, c = db.cli.find(x => x.id == id); const billTo = document.getElementById('bill-to-client'); if(billTo) billTo.innerText = c ? `\( {c.name}\n \){c.phone}\n${c.addr}` : '---'; }
function shareWhatsapp() { const clientId = document.getElementById('bill-client-select')?.value; const client = db.cli.find(c => c.id == clientId); const phone = client ? client.phone : ''; const total = document.getElementById('grandtotal')?.innerText; const msg = encodeURIComponent(`Terima kasih. Sila lihat dokumen anda. Jumlah: \( {total}`); if(phone) window.open(`https://wa.me/ \){phone}?text=\( {msg}`, '_blank'); else window.open(`https://wa.me/?text= \){msg}`, '_blank'); }
function updateBillingTheme() { const type = document.getElementById('billing-type')?.value; document.body.className = `theme-${type} \( {isDarkTheme ? 'dark-mode' : ''}`; const previewTitle = document.getElementById('preview-title'); if(previewTitle) previewTitle.innerText = type; const watermark = document.getElementById('watermark'); if(watermark) watermark.innerText = type; const refNo = document.getElementById('ref-no'); if(refNo) refNo.innerText = ` \){type}${db.ref[type]}`; const prevDate = document.getElementById('prev-date'); if(prevDate) prevDate.innerText = new Date().toLocaleDateString('en-GB'); }

// ================== CRM ==================
async function addClient() { const n = await showPrompt(currentLang==='BM'?"Nama Pelanggan:":"Customer Name:"); if(n) { db.cli.push({ id: Date.now(), name: n, phone: '', addr: '' }); save(); renderCRM(); } }
function renderCRM() { const container = document.getElementById('crm-list-grid'); if(container) container.innerHTML = db.cli.map((c, idx) => `<div class="flux-card p-6 border-none shadow-md group"><div class="flex justify-between items-start mb-4"><div class="w-12 h-12 bg-blue-100 rounded-[18px] flex items-center justify-center text-blue-600 font-black text-xl">\( {c.name.charAt(0)}</div><button onclick="db.cli.splice( \){idx},1); save(); renderCRM();" class="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100"><i class="fas fa-times-circle"></i></button></div><input type="text" value="\( {c.name}" onchange="db.cli[ \){idx}].name=this.value; save();" class="font-bold w-full text-gray-800 bg-transparent outline-none"><div class="mt-4 space-y-2"><input type="text" value="\( {c.phone}" onchange="db.cli[ \){idx}].phone=this.value; save();" placeholder="601..." class="text-xs w-full p-2 flux-input"><textarea onchange="db.cli[\( {idx}].addr=this.value; save();" class="text-[10px] w-full p-2 flux-input h-14"> \){c.addr}</textarea></div></div>`).join(''); }

// ================== BUSINESS PROFILE ==================
function updateBizProfile() { db.prof.name = document.getElementById('set-biz-name')?.value || ''; db.prof.addr = document.getElementById('set-biz-addr')?.value || ''; db.prof.bank = document.getElementById('set-biz-bank')?.value || ''; const prevName = document.getElementById('prev-biz-name'); if(prevName) prevName.innerText = db.prof.name || "NAMA SYARIKAT"; const prevAddr = document.getElementById('prev-biz-addr'); if(prevAddr) prevAddr.innerText = db.prof.addr || "ALAMAT"; const prevBank = document.getElementById('prev-biz-bank'); if(prevBank) prevBank.innerText = db.prof.bank || "BANK"; if(db.prof.logo) { const logo = document.getElementById('prev-logo'); if(logo) { logo.src = db.prof.logo; logo.classList.remove('hidden'); } } if(db.prof.cop) { const cop = document.getElementById('prev-cop'); if(cop) { cop.src = db.prof.cop; cop.classList.remove('hidden'); } } save(); }
function uploadProfileImg(i, t) { const r = new FileReader(); r.onload = (e) => { db.prof[t] = e.target.result; save(); updateBizProfile(); }; r.readAsDataURL(i.files[0]); }

// ================== JOBS ==================
function showJobModal() {
    return new Promise((resolve) => {
        const modal = document.getElementById('job-modal');
        const subjectInput = document.getElementById('job-subject');
        const dateInput = document.getElementById('job-date');
        const timeInput = document.getElementById('job-time');
        const reminderCheck = document.getElementById('job-reminder');
        const btnOk = document.getElementById('job-modal-ok');
        const btnCancel = document.getElementById('job-modal-cancel');

        subjectInput.value = '';
        dateInput.value = new Date().toISOString().slice(0,10);
        timeInput.value = '';
        reminderCheck.checked = false;

        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.querySelector('.glass-panel').classList.remove('scale-95');
        }, 10);

        const cleanup = () => {
            modal.classList.add('opacity-0');
            modal.querySelector('.glass-panel').classList.add('scale-95');
            setTimeout(() => modal.classList.add('hidden'), 300);
            btnOk.onclick = null;
            btnCancel.onclick = null;
        };

        btnOk.onclick = () => {
            const subject = subjectInput.value.trim();
            const date = dateInput.value;
            const time = timeInput.value;
            const reminder = reminderCheck.checked;

            if (!subject) {
                showAlert(currentLang === 'BM' ? 'Sila masukkan perkara.' : 'Please enter a subject.');
                return;
            }
            if (!date) {
                showAlert(currentLang === 'BM' ? 'Sila pilih tarikh.' : 'Please select a date.');
                return;
            }

            let reminderTimestamp = null;
            if (reminder) {
                let reminderDateTime = date;
                if (time) {
                    reminderDateTime = `\( {date}T \){time}`;
                } else {
                    reminderDateTime = `${date}T09:00`;
                }
                const ts = new Date(reminderDateTime).getTime();
                if (isNaN(ts)) {
                    showAlert(currentLang === 'BM' ? 'Tarikh atau masa tidak sah.' : 'Invalid date or time.');
                    return;
                }
                if (ts <= Date.now()) {
                    showAlert(currentLang === 'BM' ? 'Masa peringatan mestilah pada masa hadapan.' : 'Reminder time must be in the future.');
                    return;
                }
                reminderTimestamp = ts;
            }

            cleanup();
            resolve({ subject, date, time, reminder, reminderTimestamp });
        };

        btnCancel.onclick = () => {
            cleanup();
            resolve(null);
        };
    });
}
function scheduleReminder(job) {
    if (!job.reminder || !job.reminderTimestamp) return;
    const now = Date.now();
    const delay = job.reminderTimestamp - now;
    if (delay <= 0) return;
    if (Notification.permission !== 'granted') Notification.requestPermission();
    setTimeout(() => {
        if (Notification.permission === 'granted') {
            new Notification('📅 Peringatan Jadual Kerja', {
                body: `${job.t} pada ${job.d} ${job.time ? job.time : ''}`,
                icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
            });
        } else {
            showAlert(`🔔 Peringatan: ${job.t} pada ${job.d} ${job.time ? job.time : ''}`);
        }
    }, delay);
}
function scheduleAllReminders() {
    db.jobs.forEach(job => {
        if (job.reminder && job.reminderTimestamp) scheduleReminder(job);
    });
}
async function addJob() {
    const result = await showJobModal();
    if (!result) return;
    const { subject, date, time, reminder, reminderTimestamp } = result;
    const newJob = {
        t: subject,
        d: date,
        time: time || '',
        reminder: reminder,
        reminderTimestamp: reminderTimestamp || null,
        id: Date.now()
    };
    db.jobs.push(newJob);
    save();
    renderJobs();
    if (reminder && reminderTimestamp) scheduleReminder(newJob);
    showAlert(currentLang === 'BM' ? 'Nota berjaya ditambah!' : 'Note added successfully!');
}
function renderJobs() {
    const container = document.getElementById('calendar-widget');
    if (!container) return;
    if (db.jobs.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-gray-400 py-8 text-sm">${t('Tiada Jadual.')}</div>`;
        return;
    }
    container.innerHTML = db.jobs.map(j => `
        <div class="bg-white p-5 rounded-[22px] border border-gray-100 relative group transition-all hover:shadow-xl">
            <div class="flex justify-between items-start">
                <p class="text-[10px] font-black text-blue-500 uppercase mb-1">${j.d} ${j.time ? '• ' + j.time : ''}</p>
                ${j.reminder ? '<i class="fas fa-bell text-amber-500 text-xs"></i>' : ''}
            </div>
            <h4 class="font-bold text-gray-800 text-sm">${j.t}</h4>
            <button onclick="db.jobs = db.jobs.filter(x => x.id !== ${j.id}); save(); renderJobs();" class="absolute top-4 right-4 text-gray-200 hover:text-emerald-500 opacity-0 group-hover:opacity-100">
                <i class="fas fa-check-circle text-lg"></i>
            </button>
        </div>
    `).join('');
}

// ================== COUPON MANAGER ==================
function renderCoupons() {
    const container = document.getElementById('coupon-list');
    if (!container) return;
    if (!db.coupons.length) {
        container.innerHTML = `<p class="text-xs">${t('Tiada Kupon.')}</p>`;
        return;
    }
    container.innerHTML = db.coupons.map((c, idx) => `
        <div class="bg-white p-4 rounded-2xl border border-dashed border-purple-200 flex justify-between items-center">
            <div>
                <p class="text-xs font-black text-purple-600">${c.code}</p>
                <p class="text-lg font-bold">RM ${c.value}</p>
                <p class="text-xs text-gray-500">Baki: ${c.quantity}</p>
            </div>
            <button onclick="deleteCoupon(${idx})" class="text-gray-200 hover:text-red-500"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
}
function addNewCoupon() {
    const code = document.getElementById('new-coupon-code')?.value.toUpperCase();
    const value = parseFloat(document.getElementById('new-coupon-val')?.value);
    const qty = parseInt(document.getElementById('new-coupon-qty')?.value) || 1;
    if (code && value && qty > 0) {
        db.coupons.push({ code, value, quantity: qty });
        save();
        renderCoupons();
        document.getElementById('new-coupon-code').value = '';
        document.getElementById('new-coupon-val').value = '';
        document.getElementById('new-coupon-qty').value = '';
    }
}
function deleteCoupon(index) {
    db.coupons.splice(index,1);
    save();
    renderCoupons();
}

// ================== SOCIAL MARKETING ==================
function setupSocialExtra() {
    const dateInput = document.getElementById('sch-date');
    const timeInput = document.getElementById('sch-time');
    if (dateInput) {
        const parent = dateInput.parentNode;
        if (!parent.querySelector('.fa-calendar-alt')) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none';
            iconSpan.innerHTML = '<i class="fas fa-calendar-alt"></i>';
            parent.style.position = 'relative';
            parent.appendChild(iconSpan);
        }
    }
    if (timeInput) {
        const parent = timeInput.parentNode;
        if (!parent.querySelector('.fa-clock')) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none';
            iconSpan.innerHTML = '<i class="fas fa-clock"></i>';
            parent.style.position = 'relative';
            parent.appendChild(iconSpan);
        }
    }
    if (Notification.permission === 'default') {
        Notification.requestPermission();
    }
    const socialBtns = document.querySelectorAll('a.flux-card');
    socialBtns.forEach(btn => {
        const span = btn.querySelector('span');
        if (!span) return;
        const platform = span.innerText.trim().toLowerCase();
        let url = '';
        if (platform === 'facebook') url = 'https://www.facebook.com/';
        else if (platform === 'tiktok') url = 'https://www.tiktok.com/';
        else if (platform === 'instagram') url = 'https://www.instagram.com/';
        else if (platform === 'threads') url = 'https://www.threads.net/';
        if (url) {
            btn.href = url;
            btn.target = '_blank';
        }
    });
}

function addSchedule() {
    const platform = document.getElementById('sch-platform')?.value;
    const title = document.getElementById('sch-title')?.value;
    const date = document.getElementById('sch-date')?.value;
    const time = document.getElementById('sch-time')?.value;
    const fileInput = document.getElementById('sch-file');
    let fileData = null;
    if (fileInput && fileInput.files[0]) {
        const reader = new FileReader();
        reader.readAsDataURL(fileInput.files[0]);
        reader.onload = () => { fileData = reader.result; };
    }
    if (title && date && time) {
        const timestamp = new Date(`\( {date}T \){time}`).getTime();
        if (isNaN(timestamp) || timestamp <= Date.now()) {
            showAlert(currentLang === 'BM' ? 'Tarikh dan masa mestilah pada masa hadapan.' : 'Date and time must be in the future.');
            return;
        }
        const scheduleItem = {
            id: Date.now(),
            platform,
            title,
            date,
            time,
            fileData: fileData || null,
            status: 'PENDING',
            reminderTimestamp: timestamp,
            notified: false
        };
        db.sch.push(scheduleItem);
        save();
        renderSchedule();
        
        const delay = timestamp - Date.now();
        setTimeout(() => {
            if (!scheduleItem.notified) {
                scheduleItem.notified = true;
                save();
                let platformUrl = '';
                switch(platform) {
                    case 'FB': platformUrl = 'https://www.facebook.com/'; break;
                    case 'TT': platformUrl = 'https://www.tiktok.com/'; break;
                    case 'IG': platformUrl = 'https://www.instagram.com/'; break;
                    case 'TH': platformUrl = 'https://www.threads.net/'; break;
                    default: platformUrl = 'https://www.facebook.com/';
                }
                if (Notification.permission === 'granted') {
                    const notification = new Notification('📢 Masa untuk Post!', {
                        body: `${scheduleItem.title}\nPlatform: ${scheduleItem.platform}`,
                        icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
                    });
                    notification.onclick = () => {
                        window.open(platformUrl, '_blank');
                        notification.close();
                    };
                } else {
                    showAlert(`🔔 Peringatan: ${scheduleItem.title} pada ${scheduleItem.date} ${scheduleItem.time}\nSila post secara manual di ${scheduleItem.platform}.`);
                }
            }
        }, delay);
        
        if (fileInput) fileInput.value = '';
        showAlert(currentLang === 'BM' ? 'Content dijadualkan! Notifikasi akan dihantar pada masa yang ditetapkan.' : 'Content scheduled! Notification will be sent at the scheduled time.');
    } else {
        showAlert(currentLang === 'BM' ? 'Sila lengkapkan semua maklumat (platform, kapsyen, tarikh, masa).' : 'Please fill all fields (platform, caption, date, time).');
    }
}

function renderSchedule() {
    const container = document.getElementById('schedule-list');
    if (!container) return;
    if (db.sch.length === 0) {
        container.innerHTML = `<p class="text-xs text-center py-4">${t('Tiada Jadual.')}</p>`;
        return;
    }
    container.innerHTML = db.sch.map(s => `
        <div class="bg-white p-5 rounded-2xl border border-gray-100 flex justify-between items-center group shadow-sm">
            <div>
                <h4 class="font-bold text-sm">${s.title}</h4>
                <p class="text-[10px] text-gray-400 font-bold uppercase">${s.platform} | ${s.date} ${s.time}</p>
                ${s.fileData ? `<p class="text-[8px] text-blue-500">📎 Fail ada</p>` : ''}
                <p class="text-[8px] \( {s.notified ? 'text-green-500' : 'text-orange-500'}"> \){s.notified ? '✅ Notified' : '⏳ Pending'}</p>
            </div>
            <button onclick="db.sch=db.sch.filter(x=>x.id!==${s.id});save();renderSchedule();" class="text-gray-200 hover:text-red-500"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
}

// ================== BLAST PINTAR ==================
function setupBlastExtra() {
    const delayInput = document.getElementById('blast-delay');
    if (delayInput) delayInput.value = 30;
    delayInput.max = 999;
    const imgInput = document.getElementById('blast-img-input');
    if (imgInput) {
        imgInput.onchange = (e) => {
            if (e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (ev) => { blastImageData = ev.target.result; };
                reader.readAsDataURL(e.target.files[0]);
            } else {
                blastImageData = null;
            }
        };
    }
    const container = document.querySelector('.flux-card.p-6:first-of-type');
    if (container && !document.getElementById('template-selector')) {
        const btn = document.createElement('button');
        btn.id = 'template-selector';
        btn.className = 'mt-3 w-full bg-blue-500 text-white p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2';
        btn.innerHTML = '<i class="fas fa-comment-dots"></i> Ambil Template';
        btn.onclick = showTemplatePicker;
        container.appendChild(btn);
    }
}
function showTemplatePicker() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[2000] glass-modal-overlay flex items-center justify-center';
    modal.innerHTML = `
        <div class="glass-panel w-[90%] max-w-md p-6 rounded-[32px]">
            <h3 class="text-xl font-black mb-4">Pilih Template</h3>
            <div id="template-list-modal" class="max-h-96 overflow-y-auto space-y-2"></div>
            <div class="flex justify-end mt-4">
                <button class="close-modal py-2 px-4 bg-gray-200 rounded-xl">Tutup</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const listContainer = modal.querySelector('#template-list-modal');
    listContainer.innerHTML = db.ar.map(t => `
        <div class="p-3 border rounded-lg cursor-pointer hover:bg-gray-100" data-msg="${encodeURIComponent(t.msg)}">
            <div class="font-bold">${t.title}</div>
            <div class="text-xs text-gray-500 truncate">${t.msg}</div>
        </div>
    `).join('');
    listContainer.querySelectorAll('[data-msg]').forEach(el => {
        el.addEventListener('click', () => {
            const msg = decodeURIComponent(el.dataset.msg);
            const msgArea = document.getElementById('blast-msg');
            if (msgArea) msgArea.value = msg;
            modal.remove();
        });
    });
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
}
function renderBlastClientList() { const container = document.getElementById('blast-client-list'); if(container) container.innerHTML = db.cli.map(c => `<label class="flex items-center p-3 hover:bg-emerald-50 rounded-2xl cursor-pointer"><input type="checkbox" class="blast-checkbox w-5 h-5 mr-4 accent-emerald-500" data-phone="\( {c.phone}" data-name=" \){c.name}"><div><p class="text-sm font-bold">\( {c.name}</p><p class="text-[10px] text-gray-400 font-bold"> \){c.phone}</p></div></label>`).join(''); }
async function startBlast() { const cs = document.querySelectorAll('.blast-checkbox:checked'); let m = document.getElementById('blast-msg')?.value; const delay = parseInt(document.getElementById('blast-delay')?.value) || 30; if (delay < 30 || delay > 999) { await showAlert('Sela masa mesti antara 30 hingga 999 saat.'); return; } for (let c of cs) { const randomKey = Math.random().toString(36).substring(2, 8).toUpperCase(); const footer = `\n\n\( {randomKey}\n\nDihantar oleh BizPro System`; const fullMsg = m + footer; const text = encodeURIComponent(fullMsg.replace('{name}', c.dataset.name)); window.open(`https://wa.me/ \){c.dataset.phone}?text=${text}`, '_blank'); await new Promise(r => setTimeout(r, delay * 1000)); } }
function generateCatalogText() { let c = "KATALOG:\n"; db.inv.slice(0, 10).forEach(i => c += `- \( {i.name} RM \){i.jual}\n`); const msgArea = document.getElementById('blast-msg'); if(msgArea) msgArea.value = c; }

// ================== AUTOREPLY ==================
function renderAR() { const container = document.getElementById('ar-list'); if(container) container.innerHTML = db.ar.map(item => `<div class="bg-gray-50 p-4 rounded-2xl flex justify-between items-center border border-gray-100"><div class="flex-1 pr-4"><p class="font-bold text-sm text-gray-800">\( {item.title}</p><p class="text-[10px] text-gray-400 line-clamp-1"> \){item.msg}</p></div><div class="flex gap-2"><button onclick="copyToClipboard('\( {encodeURIComponent(item.msg)}')" class="bg-blue-600 text-white p-2 px-3 rounded-lg text-[10px] font-bold uppercase"> \){t('SALIN')}</button><button onclick="deleteAR(\( {item.id})" class="text-red-400 text-xs px-2"><i class="fas fa-trash"></i></button></div></div>`).join('') || `<p class="text-gray-400 text-xs italic py-4"> \){t('Tiada template sapaan.')}</p>`; }
async function saveAR() { const title = document.getElementById('ar-title')?.value, msg = document.getElementById('ar-msg')?.value; if(!title || !msg) return await showAlert(currentLang==='BM'?"Sila isi tajuk dan mesej!":"Please fill title and message!"); db.ar.push({ id: Date.now(), title, msg }); save(); renderAR(); document.getElementById('ar-title').value = ''; document.getElementById('ar-msg').value = ''; }
function copyToClipboard(msg) { const text = decodeURIComponent(msg); navigator.clipboard.writeText(text).then(async () => { await showAlert(currentLang==='BM'?"Template disalin ke papan klip!":"Template copied to clipboard!"); }); }
async function deleteAR(id) { const confirmed = await showConfirm(currentLang==='BM'?"Padam template?":"Delete template?"); if(confirmed) { db.ar = db.ar.filter(x => x.id !== id); save(); renderAR(); } }

// ================== LHDN TAX ==================
function resetTaxModal() {
    const modal = document.getElementById('tax-modal');
    if (!modal) return;
    const dateInput = document.getElementById('tax-date');
    if (dateInput) dateInput.value = '';
    const amountInput = document.getElementById('tax-amount');
    if (amountInput) amountInput.value = '';
    const categorySelect = document.getElementById('tax-category');
    if (categorySelect) categorySelect.selectedIndex = 0;
    const vendorInput = document.getElementById('tax-vendor');
    if (vendorInput) vendorInput.value = '';
    const imgInput = document.getElementById('tax-img-input');
    if (imgInput) imgInput.value = '';
    const imgStatus = document.getElementById('tax-img-status');
    if (imgStatus) imgStatus.innerText = t('tax-upload');
}
function setupTaxModalReset() {
    const openModalBtn = document.querySelector('#lhdn-section .bg-orange-600');
    if (openModalBtn) {
        openModalBtn.removeEventListener('click', resetTaxModal);
        openModalBtn.addEventListener('click', () => {
            setTimeout(resetTaxModal, 50);
        });
    }
    const closeModalBtn = document.querySelector('#tax-modal button[onclick*="hidden"]');
    if (closeModalBtn) {
        closeModalBtn.removeEventListener('click', resetTaxModal);
        closeModalBtn.addEventListener('click', resetTaxModal);
    }
}
async function saveTaxRecord() {
    const date = document.getElementById('tax-date')?.value;
    const amt = parseFloat(document.getElementById('tax-amount')?.value);
    const cat = document.getElementById('tax-category')?.value;
    const vendor = document.getElementById('tax-vendor')?.value;
    const imgInput = document.getElementById('tax-img-input');
    if (!date || isNaN(amt) || !vendor) {
        await showAlert(currentLang==='BM'?"Sila isi semua maklumat!":"Please fill all information!");
        return;
    }
    const processSave = (imgData) => {
        db.tax.push({ id: Date.now(), date, amt, cat, vendor, img: imgData });
        save();
        renderTax();
        document.getElementById('tax-modal').classList.add('hidden');
        resetTaxModal();
        showAlert(currentLang==='BM'?"Rekod disimpan!":"Record saved!");
    };
    if (imgInput && imgInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => processSave(e.target.result);
        reader.readAsDataURL(imgInput.files[0]);
    } else {
        processSave('');
    }
}
function renderTax() { 
    const tbody = document.getElementById('tax-table-body'); 
    if(!tbody) return; 
    let total = 0; 
    const categories = {}; 
    tbody.innerHTML = db.tax.sort((a,b) => new Date(b.date) - new Date(a.date)).map(t => { 
        total += t.amt; 
        categories[t.cat] = (categories[t.cat] || 0) + t.amt; 
        return `<tr class="border-b border-gray-50 hover:bg-gray-50/50 transition">
            <td class="p-6 text-xs font-bold text-gray-500 uppercase">${t.date}<\/td>
            <td class="p-6">\( {t.img ? `<img src=" \){t.img}" class="w-10 h-10 rounded object-cover cursor-pointer" onclick="window.open('${t.img}')">` : '<i class="fas fa-file-excel text-gray-200"></i>'}<\/td>
            <td class="p-6"><span class="bg-gray-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase">${t.cat}</span><\/td>
            <td class="p-6 font-bold text-sm text-gray-800">${t.vendor}<\/td>
            <td class="p-6 text-right font-black text-orange-600">RM ${t.amt.toFixed(2)}<\/td>
            <td class="p-6 text-center"><button onclick="deleteTax(${t.id})" class="text-gray-200 hover:text-red-500"><i class="fas fa-trash"></i></button><\/td>
         <\/tr>`; 
    }).join('') || `<tr><td colspan="6" class="p-10 text-center text-gray-400 font-bold">${t('Tiada rekod perbelanjaan.')}<\/td><\/tr>`; 
    document.getElementById('tax-total-amt').innerText = `RM ${total.toFixed(2)}`; 
    document.getElementById('tax-receipt-count').innerText = db.tax.length; 
    const topCat = Object.keys(categories).reduce((a, b) => categories[a] > categories[b] ? a : b, '-'); 
    document.getElementById('tax-top-cat').innerText = topCat; 
}
async function deleteTax(id) { 
    const confirmed = await showConfirm(currentLang==='BM'?"Padam rekod ini?":"Delete this record?"); 
    if(confirmed) { 
        db.tax = db.tax.filter(t => t.id !== id); 
        save();
