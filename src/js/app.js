// ================================================
// KETICK BizPro v6 - Flux Edition
// app.js - Activation System Versi A (Clean) & Hover Sidebar
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

// ================== ACTIVATION SYSTEM VERSI A ==================
const MASTER_SECRET = "KETICK_BIZPRO_2026_AZLAN_SECURE_V2_8K3M9P2X";

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

    // Bersihkan input: buang kurungan, ruang, dan tukar ke uppercase
    let cleanKey = inputKey.replace(/[()\s]/g, '').toUpperCase();
    const parts = cleanKey.split('-');
    if (parts.length < 3) return false;  // Format mesti: SERIAL-XXXX-... (sekurang2nya 3 bahagian)

    // Serial adalah dua bahagian pertama: contoh KET-001
    const serial = parts[0] + '-' + parts[1];
    // Signature adalah baki selepas dua bahagian pertama
    const signature = parts.slice(2).join('-');

    const deviceFingerprint = await generateDeviceFingerprint();
    
    // Hanya gunakan device fingerprint + master secret (tanpa userNote/tarikh)
    const dataToVerify = `${deviceFingerprint}|${MASTER_SECRET}`;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(dataToVerify);
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase().substring(0, 24);

    if (computedSignature === signature) {
        activationData = {
            activated: true,
            deviceFingerprint: deviceFingerprint,
            serialNumber: serial,
            activationDate: new Date().toISOString(),
            userNote: "Pengguna Sah",
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
                    <strong>Device ID:</strong><br>${deviceFingerprint}
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
                errorDiv.textContent = 'Key tidak sah atau tidak sepadan dengan peranti ini. Pastikan Device ID tepat dan key dijana dengan Device ID yang sama.';
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
let isDarkTheme = localStorage.getItem('f6_dark') === 'true';
let customBg = localStorage.getItem('f6_custom_bg') || '';

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
    applyCustomBg();
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
        const response = await fetch(`src/modules/${moduleName}/${moduleName}.html`);
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

    // Kemas kini active menu pada Drawer lama (jika wujud) dan Sidebar Baru
    document.querySelectorAll('.nav-item-drawer, .sidebar .nav-link').forEach(btn => {
        const onclick = btn.getAttribute('onclick');
        if (onclick && onclick.includes(`loadModule('${moduleName}')`)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
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

// ================== THEME ==================
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

// ================== CUSTOM MODALS ==================
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

const showAlert = async (msg) => await showCustomModal('alert', 'Perhatian', msg);
const showConfirm = async (msg) => await showCustomModal('confirm', 'Pengesahan', msg);
const showPrompt = async (msg, def='') => await showCustomModal('prompt', 'Sila Masukkan Maklumat', msg, def);

// ================== LOW STOCK & UTILS ==================
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
    if(container) container.innerHTML = lowItems.map(item => `<div class="flex justify-between items-center border-b border-red-100 pb-2"><span class="font-bold">${item.name}</span><span class="text-red-600 font-black">Stok: ${item.qty}</span><button onclick="loadModule('inventory'); closeDrawer();" class="text-xs bg-red-100 px-2 py-1 rounded-full">Pergi ke Inventory</button></div>`).join(''); 
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
    const newVal = await showPrompt('Tetapkan ambang stok rendah (stok ≤ nilai ini dianggap kritikal):', db.lowStockThreshold); 
    if (newVal !== null && !isNaN(parseInt(newVal))) { 
        db.lowStockThreshold = parseInt(newVal); 
        save(); 
        checkLowStockAndNotify([]); 
        renderInventory(); 
        showAlert(`Ambang ditukar kepada ${db.lowStockThreshold}`); 
    } 
}

// ================== INVENTORY ==================
function renderInventory() { 
    const tbody = document.getElementById('inventory-table-body'); 
    if(!tbody) return; 
    const lowIds = getLowStockItems().map(i => i.id); 
    tbody.innerHTML = db.inv.map((item, idx) => {
        return `<tr class="border-b border-gray-50 align-top hover:bg-gray-50/50 transition ${lowIds.includes(item.id) ? 'low-stock-row' : ''}">
            <td class="p-6"><div class="w-16 h-16 bg-gray-100 rounded-2xl overflow-hidden relative border border-white flex items-center justify-center">${item.img ? `<img src="${item.img}" class="w-full h-full object-cover">` : `<i class="fas fa-camera text-gray-300"></i>`}<input type="file" onchange="updateInvImg(this, ${idx})" class="absolute inset-0 opacity-0 cursor-pointer"></div><\/td>
            <td class="p-6"><input type="text" value="${item.name}" onchange="updateInv(${idx}, 'name', this.value)" class="font-bold w-full bg-transparent outline-none text-gray-800">
            <div class="mt-2 space-y-1 ${item.showDetails ? '' : 'hidden'}">${(item.details || []).map((d, dIdx) => `<div class="flex gap-1"><input type="text" value="${d}" onchange="db.inv[${idx}].details[${dIdx}]=this.value; save();" placeholder="Spec" class="block text-[10px] p-2 w-full bg-white border border-gray-100 rounded-lg shadow-sm"><button onclick="db.inv[${idx}].details.splice(${dIdx},1); renderInventory(); save();" class="text-red-300 text-[10px]">&times;</button></div>`).join('')}</div>
            <div class="flex gap-4 mt-3"><button onclick="if(!db.inv[${idx}].details) db.inv[${idx}].details=[]; db.inv[${idx}].details.push(''); renderInventory();" class="text-[9px] font-black text-blue-600 uppercase"><i class="fas fa-plus mr-1"></i> TAMBAH SPEC</button><button onclick="db.inv[${idx}].showDetails=!db.inv[${idx}].showDetails; renderInventory();" class="text-[9px] font-bold text-gray-400 uppercase"><i class="fas ${item.showDetails ? 'fa-eye-slash' : 'fa-eye'} mr-1"></i> ${item.showDetails ? 'SOROK' : 'LIHAT'}</button></div><\/td>
            <td class="p-6"><input type="number" value="${item.kos}" onchange="updateInv(${idx}, 'kos', this.value)" class="w-20 p-2 flux-input text-xs font-bold"><\/td>
            <td class="p-6"><input type="number" value="${item.jual}" onchange="updateInv(${idx}, 'jual', this.value)" class="w-20 p-2 flux-input text-xs font-bold text-blue-600"><\/td>
            <td class="p-6"><input type="number" value="${item.qty}" onchange="updateInv(${idx}, 'qty', this.value)" class="w-16 p-2 flux-input text-xs text-center font-bold"><\/td>
            <td class="p-6 text-center"><button onclick="db.inv.splice(${idx},1); save(); renderInventory();" class="text-gray-300 hover:text-red-500 text-xs"><i class="fas fa-trash-alt"></i></button><\/td>
         <\/tr>`;
    }).join(''); 
}
function addInventoryItem() { 
    db.inv.push({ id: Date.now(), name: 'Produk Baru', kos: 0, jual: 0, qty: 0, details: [], img: '', showDetails: true, salesCount: 0 }); 
    renderInventory(); save(); checkLowStockAndNotify([]); 
}
function updateInv(idx, field, val) { 
    db.inv[idx][field] = (field === 'name') ? val : parseFloat(val); 
    save(); renderInventory(); 
    if (field === 'qty') { 
        const lowItems = getLowStockItems(); 
        if (lowItems.some(i => i.id === db.inv[idx].id)) showLowStockToast(`⚠️ Stok ${db.inv[idx].name} kini kritikal (${db.inv[idx].qty})`); 
        updateLowStockPanel(); 
    } 
}
function updateInvImg(input, idx) { 
    const reader = new FileReader(); 
    reader.onload = (e) => { db.inv[idx].img = e.target.result; save(); renderInventory(); }; 
    reader.readAsDataURL(input.files[0]); 
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
    const newRef = `${type}${refNum}`; 
    db.hist.push({ id: Date.now(), date: new Date().toLocaleDateString('en-GB'), ref: newRef, type: type, clientName: client ? client.name : 'Umum', phone: client?.phone || '', total: finalTotal, margin: finalMargin, items: items, discount: activeDiscount }); 
    save(); 
    await showAlert(`Rekod ${type} Berjaya Disimpan! No: ${newRef}`); 
    location.reload(); 
}
async function deleteDoc(id) { const doc = db.hist.find(h => h.id === id); if (doc) { const type = doc.type; const refNum = parseInt(doc.ref.slice(3)); recycleRef(type, refNum); db.hist = db.hist.filter(h => h.id !== id); save(); renderHistory(); await showAlert(`Dokumen ${doc.ref} dibatalkan. Nombor akan diguna semula.`); } }
function populateBillingClients() { const s = document.getElementById('bill-client-select'); if(s) s.innerHTML = '<option value="">-- Pilih Pelanggan --</option>' + db.cli.map(c => `<option value="${c.id}">${c.name}</option>`).join(''); }
function addBillingItemRow() { const div = document.createElement('div'); div.className = "flex gap-2"; div.innerHTML = `<select class="w-3/4 p-3 text-xs flux-input item-select" onchange="calcBilling()"><option value="">Pilih Produk...</option>${db.inv.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}</select><input type="number" class="w-1/4 p-3 text-xs flux-input qty-input text-center" value="1" onchange="calcBilling()">`; document.getElementById('billing-items-input')?.appendChild(div); }
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
async function applyCoupon() { const c = document.getElementById('coupon-input')?.value.toUpperCase(); const coupon = db.coupons.find(coupon => coupon.code === c && coupon.quantity > 0); if (coupon) { activeDiscount = coupon.value; coupon.quantity--; if (coupon.quantity === 0) { const idx = db.coupons.indexOf(coupon); db.coupons.splice(idx,1); } save(); renderCoupons(); await showAlert("Kupon Guna!"); calcBilling(); } else { await showAlert("Kupon tidak sah atau habis!"); activeDiscount = 0; calcBilling(); } }
function updateBillTo() { const id = document.getElementById('bill-client-select')?.value, c = db.cli.find(x => x.id == id); const billTo = document.getElementById('bill-to-client'); if(billTo) billTo.innerText = c ? `${c.name}\n${c.phone}\n${c.addr}` : '---'; }
function shareWhatsapp() { const clientId = document.getElementById('bill-client-select')?.value; const client = db.cli.find(c => c.id == clientId); const phone = client ? client.phone : ''; const total = document.getElementById('grandtotal')?.innerText; const msg = encodeURIComponent(`Terima kasih. Sila lihat dokumen anda. Jumlah: ${total}`); if(phone) window.open(`https://wa.me/${phone}?text=${msg}`, '_blank'); else window.open(`https://wa.me/?text=${msg}`, '_blank'); }
function updateBillingTheme() { const type = document.getElementById('billing-type')?.value; document.body.className = `theme-${type} ${isDarkTheme ? 'dark-mode' : ''}`; const previewTitle = document.getElementById('preview-title'); if(previewTitle) previewTitle.innerText = type; const watermark = document.getElementById('watermark'); if(watermark) watermark.innerText = type; const refNo = document.getElementById('ref-no'); if(refNo) refNo.innerText = `${type}${db.ref[type]}`; const prevDate = document.getElementById('prev-date'); if(prevDate) prevDate.innerText = new Date().toLocaleDateString('en-GB'); }

// ================== CRM ==================
async function addClient() { const n = await showPrompt("Nama Pelanggan:"); if(n) { db.cli.push({ id: Date.now(), name: n, phone: '', addr: '' }); save(); renderCRM(); } }
function renderCRM() { const container = document.getElementById('crm-list-grid'); if(container) container.innerHTML = db.cli.map((c, idx) => `<div class="flux-card p-6 border-none shadow-md group"><div class="flex justify-between items-start mb-4"><div class="w-12 h-12 bg-blue-100 rounded-[18px] flex items-center justify-center text-blue-600 font-black text-xl">${c.name.charAt(0)}</div><button onclick="db.cli.splice(${idx},1); save(); renderCRM();" class="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100"><i class="fas fa-times-circle"></i></button></div><input type="text" value="${c.name}" onchange="db.cli[${idx}].name=this.value; save();" class="font-bold w-full text-gray-800 bg-transparent outline-none"><div class="mt-4 space-y-2"><input type="text" value="${c.phone}" onchange="db.cli[${idx}].phone=this.value; save();" placeholder="601..." class="text-xs w-full p-2 flux-input"><textarea onchange="db.cli[${idx}].addr=this.value; save();" class="text-[10px] w-full p-2 flux-input h-14">${c.addr}</textarea></div></div>`).join(''); }

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
                showAlert('Sila masukkan perkara.');
                return;
            }
            if (!date) {
                showAlert('Sila pilih tarikh.');
                return;
            }

            let reminderTimestamp = null;
            if (reminder) {
                let reminderDateTime = date;
                if (time) {
                    reminderDateTime = `${date}T${time}`;
                } else {
                    reminderDateTime = `${date}T09:00`;
                }
                const ts = new Date(reminderDateTime).getTime();
                if (isNaN(ts)) {
                    showAlert('Tarikh atau masa tidak sah.');
                    return;
                }
                if (ts <= Date.now()) {
                    showAlert('Masa peringatan mestilah pada masa hadapan.');
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
    showAlert('Nota berjaya ditambah!');
}
function renderJobs() {
    const container = document.getElementById('calendar-widget');
    if (!container) return;
    if (db.jobs.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-gray-400 py-8 text-sm">Tiada Jadual.</div>`;
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
        container.innerHTML = `<p class="text-xs">Tiada Kupon.</p>`;
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
    // Minta kebenaran notifikasi
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
        const timestamp = new Date(`${date}T${time}`).getTime();
        if (isNaN(timestamp) || timestamp <= Date.now()) {
            showAlert('Tarikh dan masa mestilah pada masa hadapan.');
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
        
        // Jadualkan notifikasi
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
        showAlert('Content dijadualkan! Notifikasi akan dihantar pada masa yang ditetapkan.');
    } else {
        showAlert('Sila lengkapkan semua maklumat (platform, kapsyen, tarikh, masa).');
    }
}

function renderSchedule() {
    const container = document.getElementById('schedule-list');
    if (!container) return;
    if (db.sch.length === 0) {
        container.innerHTML = `<p class="text-xs text-center py-4">Tiada Jadual.</p>`;
        return;
    }
    container.innerHTML = db.sch.map(s => `
        <div class="bg-white p-5 rounded-2xl border border-gray-100 flex justify-between items-center group shadow-sm">
            <div>
                <h4 class="font-bold text-sm">${s.title}</h4>
                <p class="text-[10px] text-gray-400 font-bold uppercase">${s.platform} | ${s.date} ${s.time}</p>
                ${s.fileData ? `<p class="text-[8px] text-blue-500">📎 Fail ada</p>` : ''}
                <p class="text-[8px] ${s.notified ? 'text-green-500' : 'text-orange-500'}">${s.notified ? '✅ Notified' : '⏳ Pending'}</p>
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
function renderBlastClientList() { const container = document.getElementById('blast-client-list'); if(container) container.innerHTML = db.cli.map(c => `<label class="flex items-center p-3 hover:bg-emerald-50 rounded-2xl cursor-pointer"><input type="checkbox" class="blast-checkbox w-5 h-5 mr-4 accent-emerald-500" data-phone="${c.phone}" data-name="${c.name}"><div><p class="text-sm font-bold">${c.name}</p><p class="text-[10px] text-gray-400 font-bold">${c.phone}</p></div></label>`).join(''); }
async function startBlast() { const cs = document.querySelectorAll('.blast-checkbox:checked'); let m = document.getElementById('blast-msg')?.value; const delay = parseInt(document.getElementById('blast-delay')?.value) || 30; if (delay < 30 || delay > 999) { await showAlert('Sela masa mesti antara 30 hingga 999 saat.'); return; } for (let c of cs) { const randomKey = Math.random().toString(36).substring(2, 8).toUpperCase(); const footer = `\n\n${randomKey}\n\nDihantar oleh BizPro System`; const fullMsg = m + footer; const text = encodeURIComponent(fullMsg.replace('{name}', c.dataset.name)); window.open(`https://wa.me/${c.dataset.phone}?text=${text}`, '_blank'); await new Promise(r => setTimeout(r, delay * 1000)); } }
function generateCatalogText() { let c = "KATALOG:\n"; db.inv.slice(0, 10).forEach(i => c += `- ${i.name} RM${i.jual}\n`); const msgArea = document.getElementById('blast-msg'); if(msgArea) msgArea.value = c; }

// ================== AUTOREPLY ==================
function renderAR() { const container = document.getElementById('ar-list'); if(container) container.innerHTML = db.ar.map(item => `<div class="bg-gray-50 p-4 rounded-2xl flex justify-between items-center border border-gray-100"><div class="flex-1 pr-4"><p class="font-bold text-sm text-gray-800">${item.title}</p><p class="text-[10px] text-gray-400 line-clamp-1">${item.msg}</p></div><div class="flex gap-2"><button onclick="copyToClipboard('${encodeURIComponent(item.msg)}')" class="bg-blue-600 text-white p-2 px-3 rounded-lg text-[10px] font-bold uppercase">SALIN</button><button onclick="deleteAR(${item.id})" class="text-red-400 text-xs px-2"><i class="fas fa-trash"></i></button></div></div>`).join('') || `<p class="text-gray-400 text-xs italic py-4">Tiada template sapaan.</p>`; }
async function saveAR() { const title = document.getElementById('ar-title')?.value, msg = document.getElementById('ar-msg')?.value; if(!title || !msg) return await showAlert("Sila isi tajuk dan mesej!"); db.ar.push({ id: Date.now(), title, msg }); save(); renderAR(); document.getElementById('ar-title').value = ''; document.getElementById('ar-msg').value = ''; }
function copyToClipboard(msg) { const text = decodeURIComponent(msg); navigator.clipboard.writeText(text).then(async () => { await showAlert("Template disalin ke papan klip!"); }); }
async function deleteAR(id) { const confirmed = await showConfirm("Padam template?"); if(confirmed) { db.ar = db.ar.filter(x => x.id !== id); save(); renderAR(); } }

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
    if (imgStatus) imgStatus.innerText = 'Muat Naik Resit';
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
        await showAlert("Sila isi semua maklumat!");
        return;
    }
    const processSave = (imgData) => {
        db.tax.push({ id: Date.now(), date, amt, cat, vendor, img: imgData });
        save();
        renderTax();
        document.getElementById('tax-modal').classList.add('hidden');
        resetTaxModal();
        showAlert("Rekod disimpan!");
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
            <td class="p-6">${t.img ? `<img src="${t.img}" class="w-10 h-10 rounded object-cover cursor-pointer" onclick="window.open('${t.img}')">` : '<i class="fas fa-file-excel text-gray-200"></i>'}<\/td>
            <td class="p-6"><span class="bg-gray-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase">${t.cat}</span><\/td>
            <td class="p-6 font-bold text-sm text-gray-800">${t.vendor}<\/td>
            <td class="p-6 text-right font-black text-orange-600">RM ${t.amt.toFixed(2)}<\/td>
            <td class="p-6 text-center"><button onclick="deleteTax(${t.id})" class="text-gray-200 hover:text-red-500"><i class="fas fa-trash"></i></button><\/td>
         <\/tr>`; 
    }).join('') || `<tr><td colspan="6" class="p-10 text-center text-gray-400 font-bold">Tiada rekod perbelanjaan.<\/td><\/tr>`; 
    document.getElementById('tax-total-amt').innerText = `RM ${total.toFixed(2)}`; 
    document.getElementById('tax-receipt-count').innerText = db.tax.length; 
    const topCat = Object.keys(categories).reduce((a, b) => categories[a] > categories[b] ? a : b, '-'); 
    document.getElementById('tax-top-cat').innerText = topCat; 
}
async function deleteTax(id) { 
    const confirmed = await showConfirm("Padam rekod ini?"); 
    if(confirmed) { 
        db.tax = db.tax.filter(t => t.id !== id); 
        save(); 
        renderTax(); 
    } 
}

// ================== HISTORY ==================
function setupHistoryExtra() {
    const searchInput = document.getElementById('history-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderHistory());
    }
}
function renderHistory() {
    const container = document.getElementById('history-body');
    if (!container) return;
    let filtered = [...db.hist];
    const searchTerm = document.getElementById('history-search')?.value.toLowerCase() || '';
    if (searchTerm) {
        filtered = filtered.filter(h => 
            h.clientName?.toLowerCase().includes(searchTerm) ||
            h.ref?.toLowerCase().includes(searchTerm) ||
            h.phone?.toLowerCase().includes(searchTerm)
        );
    }
    container.innerHTML = filtered.map(h => `
        <tr class="hover:bg-gray-50 transition">
            <td class="p-6">${h.date}<\/td>
            <td class="p-6 font-bold text-blue-600">${h.ref}<\/td>
            <td class="p-6 font-medium">${h.clientName}<\/td>
            <td class="p-6">${h.phone || '-'}<\/td>
            <td class="p-6"><span class="px-3 py-1 rounded-full text-[10px] font-black uppercase ${h.type === 'REC' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}">${h.type}</span><\/td>
            <td class="p-6 text-right font-black">RM ${h.total.toFixed(2)}<\/td>
            <td class="p-6 text-center space-x-2">
                <button onclick="viewDocument(${JSON.stringify(h).replace(/"/g, '&quot;')})" class="text-blue-500 hover:text-blue-700 text-xs font-bold"><i class="fas fa-eye mr-1"></i> Review</button>
                <button onclick="downloadDocument(${JSON.stringify(h).replace(/"/g, '&quot;')})" class="text-emerald-500 hover:text-emerald-700 text-xs font-bold"><i class="fas fa-download mr-1"></i> Download</button>
                ${h.type === 'INV' ? `<button onclick="convertInvToRec(${h.id})" class="text-emerald-500 hover:text-emerald-700 text-xs font-bold"><i class="fas fa-check-double mr-1"></i> SET PAID</button>` : ''}
                <button onclick="deleteDoc(${h.id})" class="text-gray-200 hover:text-red-500"><i class="fas fa-trash-alt"></i></button>
                ${h.phone ? `<button onclick="sendReceiptViaWhatsApp(${h.id})" class="text-green-500 hover:text-green-700 text-xs font-bold"><i class="fab fa-whatsapp mr-1"></i> WhatsApp</button>` : ''}
            <\/td>
        <\/tr>
    `).reverse().join('');
}
function sendReceiptViaWhatsApp(id) {
    const trans = db.hist.find(t => t.id === id);
    if (trans && trans.phone) {
        const items = trans.items || [];
        const msg = generateReceiptMessage(trans.total, trans.clientName, items);
        const encoded = encodeURIComponent(msg);
        window.open(`https://wa.me/${trans.phone}?text=${encoded}`, '_blank');
    }
}
async function convertInvToRec(id) { const idx = db.hist.findIndex(h => h.id === id); if(idx !== -1 && db.hist[idx].type === 'INV') { const inv = db.hist[idx]; inv.type = 'REC'; const newRefNum = getNextRef('REC'); inv.ref = `REC${newRefNum}`; let m = 0; inv.items.forEach(i => { m += (i.jual - i.kos) * i.qty; }); inv.margin = m - (inv.discount || 0); save(); renderHistory(); await showAlert("Invoice ditukar kepada Receipt!"); } }

// ================== DOCUMENT REVIEW & PDF ==================
function viewDocument(hist) { 
    currentReviewDoc = hist; 
    const type = hist.type; 
    const docColor = type === 'QUO' ? '#007AFF' : (type === 'INV' ? '#1c1c1e' : '#10b981'); 
    const bizName = db.prof.name || "SYARIKAT ANDA"; 
    const bizAddr = db.prof.addr || "Alamat Perniagaan"; 
    const bizBank = db.prof.bank || "Bank & No Akaun"; 
    const clientName = hist.clientName || "Pelanggan"; 
    const itemsHtml = hist.items.map(item => `<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:12px 8px; font-weight:600;">${item.name}<\/td><td style="padding:12px 8px; text-align:center;">${item.qty}<\/td><td style="padding:12px 8px; text-align:right;">RM ${item.jual.toFixed(2)}<\/td><td style="padding:12px 8px; text-align:right;">RM ${(item.jual * item.qty).toFixed(2)}<\/td><\/tr>`).join(''); 
    const subtotal = hist.items.reduce((sum, i) => sum + (i.jual * i.qty), 0); 
    const discount = hist.discount || 0; 
    const grand = subtotal - discount; 
    const discountRow = discount > 0 ? `<tr><td colspan="3" style="padding:12px 8px; text-align:right; font-weight:bold; color:red;">Diskaun Kupon<\/td><td style="padding:12px 8px; text-align:right; font-weight:bold; color:red;">- RM ${discount.toFixed(2)}<\/td><\/tr>` : ''; 
    const docHtml = `<div style="font-family: 'Plus Jakarta Sans', sans-serif; max-width: 800px; margin:0 auto;"><div style="display:flex; justify-content:space-between; margin-bottom:30px;"><div><h2 style="font-size:24px; font-weight:900; text-transform:uppercase;">${bizName}</h2><p style="font-size:12px; color:#6b7280;">${bizAddr}</p></div><div style="text-align:right;"><h1 style="font-size:48px; font-weight:900; font-style:italic; color:${docColor};">${type}</h1><p style="font-weight:900; font-size:20px;">${hist.ref}</p><p style="font-size:10px;">Tarikh: ${hist.date}</p></div></div><div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:30px;"><div style="background:#f9fafb; padding:16px; border-radius:16px; border-left:4px solid ${docColor};"><p style="font-size:9px; font-weight:bold; color:${docColor};">Kepada:</p><p style="font-weight:600;">${clientName}</p></div><div style="padding:16px; text-align:right;"><p style="font-size:9px; font-weight:bold;">Maklumat Pembayaran:</p><p style="font-size:12px;">${bizBank}</p></div></div><table style="width:100%; border-collapse:collapse; margin-bottom:30px;"><thead><tr style="background:${docColor}; color:white;"><th style="padding:12px 8px; text-align:left;">Perihalan</th><th style="padding:12px 8px; text-align:center;">Unit</th><th style="padding:12px 8px; text-align:right;">Harga (RM)</th><th style="padding:12px 8px; text-align:right;">Jumlah (RM)</th><\/tr><\/thead><tbody>${itemsHtml}${discountRow}<\/tbody><tfoot><tr><td colspan="3" style="padding:12px 8px; text-align:right; font-weight:bold;">JUMLAH KESELURUHAN<\/td><td style="padding:12px 8px; text-align:right; font-weight:bold; font-size:20px;">RM ${grand.toFixed(2)}<\/td><\/tr><\/tfoot><\/table><div style="text-align:center; font-size:10px; color:#9ca3af;">Dokumen ini dijana secara digital.</div></div>`; 
    document.getElementById('reviewDocContent').innerHTML = docHtml; 
    document.getElementById('reviewModal').classList.remove('hidden'); 
}
function closeReviewModal() { document.getElementById('reviewModal').classList.add('hidden'); currentReviewDoc = null; }
async function downloadReviewAsPDF() { if (!currentReviewDoc) return; const element = document.getElementById('reviewDocContent'); const opt = { margin: 0.2, filename: `${currentReviewDoc.ref}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } }; await html2pdf().set(opt).from(element).save(); }
async function downloadDocument(hist) { 
    const type = hist.type; 
    const docColor = type === 'QUO' ? '#007AFF' : (type === 'INV' ? '#1c1c1e' : '#10b981'); 
    const bizName = db.prof.name || "SYARIKAT ANDA"; 
    const bizAddr = db.prof.addr || "Alamat Perniagaan"; 
    const bizBank = db.prof.bank || "Bank & No Akaun"; 
    const clientName = hist.clientName || "Pelanggan"; 
    const itemsHtml = hist.items.map(item => `<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:12px 8px; font-weight:600;">${item.name}<\/td><td style="padding:12px 8px; text-align:center;">${item.qty}<\/td><td style="padding:12px 8px; text-align:right;">RM ${item.jual.toFixed(2)}<\/td><td style="padding:12px 8px; text-align:right;">RM ${(item.jual * item.qty).toFixed(2)}<\/td><\/tr>`).join(''); 
    const subtotal = hist.items.reduce((sum, i) => sum + (i.jual * i.qty), 0); 
    const discount = hist.discount || 0; 
    const grand = subtotal - discount; 
    const discountRow = discount > 0 ? `<tr><td colspan="3" style="padding:12px 8px; text-align:right; font-weight:bold; color:red;">Diskaun Kupon<\/td><td style="padding:12px 8px; text-align:right; font-weight:bold; color:red;">- RM ${discount.toFixed(2)}<\/td><\/tr>` : ''; 
    const docHtml = `<div style="font-family: 'Plus Jakarta Sans', sans-serif; max-width: 800px; margin:0 auto; padding:20px;"><div style="display:flex; justify-content:space-between; margin-bottom:30px;"><div><h2 style="font-size:24px; font-weight:900; text-transform:uppercase;">${bizName}</h2><p style="font-size:12px; color:#6b7280;">${bizAddr}</p></div><div style="text-align:right;"><h1 style="font-size:48px; font-weight:900; font-style:italic; color:${docColor};">${type}</h1><p style="font-weight:900; font-size:20px;">${hist.ref}</p><p style="font-size:10px;">Tarikh: ${hist.date}</p></div></div><div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:30px;"><div style="background:#f9fafb; padding:16px; border-radius:16px; border-left:4px solid ${docColor};"><p style="font-size:9px; font-weight:bold; color:${docColor};">Kepada:</p><p style="font-weight:600;">${clientName}</p></div><div style="padding:16px; text-align:right;"><p style="font-size:9px; font-weight:bold;">Maklumat Pembayaran:</p><p style="font-size:12px;">${bizBank}</p></div></div><table style="width:100%; border-collapse:collapse; margin-bottom:30px;"><thead><tr style="background:${docColor}; color:white;"><th style="padding:12px 8px; text-align:left;">Perihalan</th><th style="padding:12px 8px; text-align:center;">Unit</th><th style="padding:12px 8px; text-align:right;">Harga (RM)</th><th style="padding:12px 8px; text-align:right;">Jumlah (RM)</th><\/tr><\/thead><tbody>${itemsHtml}${discountRow}<\/tbody><tfoot><tr><td colspan="3" style="padding:12px 8px; text-align:right; font-weight:bold;">JUMLAH KESELURUHAN<\/td><td style="padding:12px 8px; text-align:right; font-weight:bold; font-size:20px;">RM ${grand.toFixed(2)}<\/td><\/tr><\/tfoot><\/table><div style="text-align:center; font-size:10px; color:#9ca3af;">Dokumen ini dijana secara digital.</div></div>`; 
    const tempDiv = document.createElement('div'); 
    tempDiv.innerHTML = docHtml; 
    document.body.appendChild(tempDiv); 
    const opt = { margin: 0.2, filename: `${hist.ref}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } }; 
    await html2pdf().set(opt).from(tempDiv).save(); 
    document.body.removeChild(tempDiv); 
}

// ================== REPORT MODULE ==================
function exportReport(type) {
    if (typeof html2pdf === 'undefined') {
        showAlert('Pustaka PDF tidak dimuatkan. Sila muat semula halaman.');
        return;
    }
    
    let title, headers, rows;
    if (type === 'inventory') {
        if (!db.inv.length) { showAlert('Tiada data inventori.'); return; }
        title = 'Laporan Inventori';
        headers = ['ID', 'Nama Produk', 'Kos (RM)', 'Harga Jual (RM)', 'Stok', 'Spesifikasi'];
        rows = db.inv.map(item => [
            item.id, item.name, item.kos, item.jual, item.qty,
            (item.details || []).join('; ')
        ]);
    } else if (type === 'crm') {
        if (!db.cli.length) { showAlert('Tiada data pelanggan.'); return; }
        title = 'Laporan Pelanggan (CRM)';
        headers = ['ID', 'Nama', 'Telefon', 'Alamat'];
        rows = db.cli.map(c => [c.id, c.name, c.phone, c.addr]);
    } else if (type === 'lhdn') {
        if (!db.tax.length) { showAlert('Tiada rekod cukai.'); return; }
        title = 'Laporan Cukai (LHDN)';
        headers = ['Tarikh', 'Kategori', 'Vendor', 'Jumlah (RM)', 'Resit'];
        rows = db.tax.map(t => [t.date, t.cat, t.vendor, t.amt, t.img ? 'Ada' : 'Tiada']);
    } else {
        return;
    }

    if (!rows || rows.length === 0) {
        showAlert('Tiada data untuk dilaporkan.');
        return;
    }

    const html = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 20px;">
            <h1 style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 10px;">${title}</h1>
            <p style="text-align: center; color: #666; margin-bottom: 20px;">Dijana pada: ${new Date().toLocaleString()}</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead><tr style="background-color: #f3f4f6; border-bottom: 2px solid #ddd;">${headers.map(h => `<th style="padding: 8px; text-align: left; border: 1px solid #ddd;">${h}</th>`).join('')}<\/tr><\/thead>
                <tbody>${rows.map(row => `<tr style="border-bottom: 1px solid #eee;">${row.map(cell => `<td style="padding: 8px; border: 1px solid #ddd;">${cell}<\/td>`).join('')}<\/tr>`).join('')}<\/tbody>
            <\/table>
        <\/div>
    `;
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.innerHTML = html;
    document.body.appendChild(tempDiv);
    const opt = { margin: 0.5, filename: `${type}_report_${new Date().toISOString().slice(0,19)}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } };
    html2pdf().set(opt).from(tempDiv).save();
    setTimeout(() => document.body.removeChild(tempDiv), 1000);
    
    // Update preview
    const previewDiv = document.getElementById('report-preview');
    if (previewDiv) {
        previewDiv.innerHTML = `<table class="w-full text-sm"><thead class="bg-gray-100"><tr>${headers.map(h => `<th class="p-2 text-left">${h}</th>`).join('')}</tr></thead><tbody>${rows.slice(0,10).map(row => `<tr>${row.map(cell => `<td class="p-2 border-b">${cell}</tr>`).join('')}</tr>`).join('')}</tbody></table>`;
    }
}

function initReportModule() {
    const invBtn = document.getElementById('report-inventory-btn');
    if (invBtn) {
        invBtn.onclick = () => exportReport('inventory');
    }
    const crmBtn = document.getElementById('report-crm-btn');
    if (crmBtn) {
        crmBtn.onclick = () => exportReport('crm');
    }
    const lhdnBtn = document.getElementById('report-lhdn-btn');
    if (lhdnBtn) {
        lhdnBtn.onclick = () => exportReport('lhdn');
    }
}

// ================== CUSTOM BACKGROUND ==================
function uploadBgImg(input) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            customBg = e.target.result;
            localStorage.setItem('f6_custom_bg', customBg);
            applyCustomBg();
        } catch (err) {
            // Pelayar telefon ada had memori, jika gambar saiz terlalu gergasi ia akan ralat
            await showAlert('Saiz gambar terlalu besar! Sila pilih gambar yang lebih kecil.');
            removeBgImg();
        }
    };
    if(input.files[0]) reader.readAsDataURL(input.files[0]);
}

function removeBgImg() {
    customBg = '';
    localStorage.removeItem('f6_custom_bg');
    applyCustomBg();
}

function applyCustomBg() {
    if (customBg) {
        document.body.style.backgroundImage = `url(${customBg})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
    } else {
        document.body.style.backgroundImage = 'none';
    }
    
    // Kemas kini butang Buang Wallpaper di Dashboard jika wujud
    const btnRemove = document.getElementById('btn-remove-bg');
    if (btnRemove) {
        if (customBg) btnRemove.classList.remove('hidden');
        else btnRemove.classList.add('hidden');
    }
}

// ================== DRAWER & PWA ==================
function openDrawer() { document.getElementById('drawer').classList.remove('drawer-closed'); document.getElementById('drawer').classList.add('drawer-open'); document.getElementById('drawerOverlay').classList.remove('hidden'); }
function closeDrawer() { document.getElementById('drawer').classList.add('drawer-closed'); document.getElementById('drawer').classList.remove('drawer-open'); document.getElementById('drawerOverlay').classList.add('hidden'); }
document.getElementById('menuToggleBtn')?.addEventListener('click', openDrawer);
document.getElementById('closeDrawerBtn')?.addEventListener('click', closeDrawer);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

// PWA
let deferredPrompt; const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; installBtn.classList.remove('hidden'); });
installBtn.addEventListener('click', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === 'accepted') { installBtn.classList.add('hidden'); } deferredPrompt = null; });
window.addEventListener('appinstalled', () => { installBtn.classList.add('hidden'); });
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').then(reg => console.log('SW registered')).catch(err => console.log('SW fail', err)); }

// ================== SIDEBAR UI/UX LOGIC (TOUCH FIX) ==================
document.addEventListener("DOMContentLoaded", () => {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content-wrapper');
    const navLinks = document.querySelectorAll('.sidebar .nav-link');

    if(sidebar) {
        sidebar.addEventListener('click', function(e) {
            // Jika sidebar belum kembang (lebar kurang 300px), kembangkan DULU & sekat klik
            if (!this.classList.contains('expanded') && this.offsetWidth < 300) {
                this.classList.add('expanded');
                e.preventDefault();
                e.stopPropagation(); 
            }
        }, true); 
    }

    if(mainContent) {
        mainContent.addEventListener('click', function(e) {
            if(sidebar && sidebar.classList.contains('expanded')) {
                sidebar.classList.remove('expanded');
            }
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // 🔥 INI PENYELESAIAN UTAMA: 
            // Halang browser dari cuba pergi ke href="#" yang membatalkan loading modul!
            e.preventDefault(); 
            
            navLinks.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            this.classList.add('tergedik');
            
            setTimeout(() => {
                this.classList.remove('tergedik');
            }, 500);

            setTimeout(() => {
                if(sidebar) sidebar.classList.remove('expanded');
            }, 300);
        });
    });
});

console.log('✅ KETICK BizPro v6 - app.js loaded successfully with smooth touch sidebar fix');
