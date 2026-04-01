// ================== DATA & STORAGE ==================
let db = {
    inv: JSON.parse(localStorage.getItem('f6_inv')) || [],
    cli: JSON.parse(localStorage.getItem('f6_cli')) || [],
    hist: JSON.parse(localStorage.getItem('f6_hist')) || [],
    jobs: JSON.parse(localStorage.getItem('f6_jobs')) || [],
    sch: JSON.parse(localStorage.getItem('f6_sch')) || [],
    coupons: JSON.parse(localStorage.getItem('f6_coupons')) || { 'RAYA20': 20 },
    ref: JSON.parse(localStorage.getItem('f6_ref')) || { QUO: 1001, INV: 1001, REC: 1001 },
    refRecycle: JSON.parse(localStorage.getItem('f6_refRecycle')) || { QUO: [], INV: [], REC: [] },
    prof: JSON.parse(localStorage.getItem('f6_prof')) || { name: '', addr: '', bank: '', logo: '', cop: '' },
    tax: JSON.parse(localStorage.getItem('f6_tax')) || [],
    ar: JSON.parse(localStorage.getItem('f6_ar')) || [],
    lowStockThreshold: parseInt(localStorage.getItem('lowStockThreshold')) || 5
};

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

// ================== ACTIVATION SYSTEM (No Backend) ==================
const MASTER_SECRET = "BiZpro2025!@#"; // GANTI dengan rahsia anda

function getDeviceId() {
    let id = localStorage.getItem('bizpro_device_id');
    if (!id) {
        id = 'DEV-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem('bizpro_device_id', id);
    }
    return id;
}

async function hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generateActivationKey(deviceId) {
    const raw = deviceId + MASTER_SECRET;
    return await hashString(raw);
}

async function validateActivationKey(inputKey, deviceId) {
    const expected = await generateActivationKey(deviceId);
    return inputKey.toLowerCase() === expected.toLowerCase();
}

function isActivated() {
    return localStorage.getItem('bizpro_activated') === 'true';
}

async function activateSystem(key) {
    const deviceId = getDeviceId();
    if (await validateActivationKey(key, deviceId)) {
        localStorage.setItem('bizpro_activated', 'true');
        return true;
    }
    return false;
}

function showActivationModal() {
    const deviceId = getDeviceId(); // dapatkan ID peranti semasa
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 z-[2000] glass-modal-overlay flex items-center justify-center';
        modal.innerHTML = `
            <div class="glass-panel w-[90%] max-w-md p-8 rounded-[32px]">
                <div class="text-5xl mb-4 drop-shadow-md text-center"><i class="fas fa-key text-purple-500"></i></div>
                <h3 class="text-2xl font-black mb-2 text-center">Aktifkan Sistem</h3>
                <div class="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
                    <p class="text-xs text-gray-600 dark:text-gray-300 mb-1">ID Peranti Anda:</p>
                    <p class="text-xs font-mono break-all bg-white dark:bg-gray-900 p-2 rounded">${deviceId}</p>
                    <button id="copy-device-id" class="mt-2 text-xs bg-blue-500 text-white px-3 py-1 rounded-full hover:bg-blue-600 transition">📋 Salin ID Peranti</button>
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-300 mb-4 text-center">Masukkan kunci yang diberikan oleh admin.</p>
                <input type="text" id="activation-key-input" class="w-full p-3 flux-input rounded-xl text-center uppercase" placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX">
                <div class="flex gap-3 justify-center mt-6">
                    <button id="key-cancel" class="flex-1 py-3 rounded-2xl bg-white/50 dark:bg-black/50 border border-white/40 text-gray-800 dark:text-white font-bold">Batal</button>
                    <button id="key-submit" class="flex-1 py-3 rounded-2xl bg-purple-600 text-white font-bold">Aktifkan</button>
                </div>
                <div id="key-error" class="text-red-500 text-xs mt-2 text-center hidden"></div>
            </div>
        `;
        document.body.appendChild(modal);
        const input = modal.querySelector('#activation-key-input');
        const submitBtn = modal.querySelector('#key-submit');
        const cancelBtn = modal.querySelector('#key-cancel');
        const errorDiv = modal.querySelector('#key-error');
        const copyBtn = modal.querySelector('#copy-device-id');

        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(deviceId).then(() => {
                const originalText = copyBtn.innerText;
                copyBtn.innerText = '✓ Disalin!';
                setTimeout(() => { copyBtn.innerText = originalText; }, 1500);
            }).catch(() => alert('Gagal menyalin. Salin secara manual.'));
        });

        const cleanup = () => modal.remove();

        const doActivate = async () => {
            const key = input.value.trim();
            if (!key) {
                errorDiv.textContent = 'Sila masukkan kunci.';
                errorDiv.classList.remove('hidden');
                return;
            }
            errorDiv.classList.add('hidden');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Mengesahkan...';
            const success = await activateSystem(key);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Aktifkan';
            if (success) {
                cleanup();
                resolve(true);
            } else {
                errorDiv.textContent = 'Kunci tidak sah.';
                errorDiv.classList.remove('hidden');
            }
        };

        submitBtn.onclick = doActivate;
        cancelBtn.onclick = () => { cleanup(); resolve(false); };
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') doActivate(); });
        modal.addEventListener('click', (e) => { if (e.target === modal) cancelBtn.onclick(); });
    });
}

// ================== LOG ACTIVITY (localStorage) ==================
function logActivity(event, data = {}) {
    const logs = JSON.parse(localStorage.getItem('bizpro_activity_log') || '[]');
    logs.push({ event, data, timestamp: new Date().toISOString() });
    if (logs.length > 500) logs.shift();
    localStorage.setItem('bizpro_activity_log', JSON.stringify(logs));
}

// ================== ADMIN GESTURE (click logo 5 times) ==================
let logoClickCount = 0;
let logoTimeout;
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

// ================== MODULE LOADING ==================
let currentModule = 'dashboard';

async function loadModule(moduleName) {
    document.getElementById('reviewModal')?.classList.add('hidden');
    document.getElementById('tax-modal')?.classList.add('hidden');

    const appContent = document.getElementById('app-content');
    if (!appContent) return;

    const response = await fetch(`src/modules/${moduleName}/${moduleName}.html`);
    if (!response.ok) {
        console.error(`Failed to load module: ${moduleName}`);
        return;
    }
    const html = await response.text();
    appContent.innerHTML = html;

    currentModule = moduleName;

    const renderFunc = {
        'dashboard': renderDashboard,
        'pos': () => { renderProductGrid(); renderCart(); },
        'inventory': renderInventory,
        'crm': renderCRM,
        'billing': () => { populateBillingClients(); updateBillingTheme(); },
        'promo': renderCoupons,
        'social': renderSchedule,
        'blast': renderBlastClientList,
        'autoreply': renderAR,
        'lhdn': renderTax,
        'history': renderHistory
    }[moduleName];

    if (renderFunc) renderFunc();

    // Log module view
    logActivity('module_view', { module: moduleName });

    document.querySelectorAll('.nav-item-drawer').forEach(btn => {
        const onclick = btn.getAttribute('onclick');
        if (onclick && onclick.includes(moduleName)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// ================== INITIAL LOAD ==================
function enterSystem() {
    document.getElementById('login-overlay').classList.add('hidden');
    setupAdminGesture();

    if (!isActivated()) {
        const setupBtn = document.getElementById('first-time-setup-btn');
        if (setupBtn) {
            setupBtn.classList.remove('hidden');
            setupBtn.onclick = async () => {
                const activated = await showActivationModal();
                if (activated) {
                    setupBtn.classList.add('hidden');
                    logActivity('app_open', { deviceId: getDeviceId() });
                    loadModule('dashboard');
                    initAppAfterActivation();
                }
            };
        } else {
            // No button found, directly show activation modal
            (async () => {
                const activated = await showActivationModal();
                if (activated) {
                    logActivity('app_open', { deviceId: getDeviceId() });
                    loadModule('dashboard');
                    initAppAfterActivation();
                }
            })();
        }
        return;
    } else {
        const setupBtn = document.getElementById('first-time-setup-btn');
        if (setupBtn) setupBtn.classList.add('hidden');
        logActivity('app_open', { deviceId: getDeviceId() });
        loadModule('dashboard');
        initAppAfterActivation();
    }
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

// ================== DWIBAHASA & THEME ==================
let currentLang = localStorage.getItem('f6_lang') || 'BM';
let isDarkTheme = localStorage.getItem('f6_dark') === 'true';

const i18nDict = {
    'BM': {
        'welcome': 'Selamat Datang', 'enter-system': 'Masuk Sistem',
        'menu-dash': 'Dashboard', 'menu-pos': 'Mini POS', 'menu-inv': 'Inventori', 'menu-crm': 'Pangkalan Data CRM', 'menu-bill': 'Pengebilan', 'menu-promo': 'Pengurus Kupon', 'menu-social': 'Pemasaran Sosial', 'menu-blast': 'Blast Pintar', 'menu-auto': 'Chatbox WhatsApp', 'menu-tax': 'Rekod Cukai LHDN', 'menu-hist': 'Sejarah',
        'btn-export': 'Eksport Backup', 'btn-import': 'Import Data', 'btn-threshold': 'Set Stok Rendah (Ambang)',
        'dash-title': 'Ringkasan Niaga', 'dash-subtitle': 'Prestasi semasa anda hari ini.', 'dash-alert-stock': '⚠️ Stok Kritikal (≤ ambang)', 'lbl-rev-title': 'Revenue Terkini (Receipt)', 'btn-tax-record': 'REKOD CUKAI', 'lbl-rev-sub': 'Berdasarkan jualan yang telah dibayar (Receipt)', 'lbl-margin': 'Margin Keuntungan', 'lbl-exp': 'Belanja (Cukai)', 'lbl-stk': 'Jumlah Item Stok', 'lbl-biz-info': 'Business Info', 'lbl-job-title': 'Jadual Kerja & Temujanji', 'btn-add-job': '+ Tambah Nota',
        'pos-cust-info': 'Maklumat Pelanggan', 'btn-use': 'GUNA', 'pos-cart': 'Keranjang', 'pos-total': 'Jumlah:', 'pos-discount': 'Diskaun Kupon:', 'pos-after-disc': 'Selepas Diskaun:', 'pos-cash': 'Tunai (RM):', 'pos-change': 'Baki:', 'btn-complete': 'Selesai', 'btn-clear': 'Kosong', 'btn-print': 'Cetak Resit',
        'inv-title': 'Inventori Stok', 'btn-new-prod': '+ Produk Baru', 'th-image': 'Imej', 'th-info': 'Informasi Produk', 'th-cost': 'Kos (RM)', 'th-sell': 'Jual (RM)', 'th-stock': 'Baki Stok', 'th-action': 'Tindakan',
        'crm-title': 'Pangkalan Data Pelanggan', 'btn-add-lead': '+ Tambah Lead',
        'bill-gen-title': 'Penjana Dokumen', 'bill-client': 'Pelanggan', 'bill-coupon': 'Kod Kupon (Diskaun)', 'bill-doc-type': 'Jenis Dokumen', 'btn-add-prod': '+ Tambah Produk', 'btn-save-record': 'SAHKAN & SIMPAN REKOD', 'btn-save-pdf': 'Simpan PDF',
        'doc-date': 'Tarikh', 'doc-bill-to': 'Kepada / Bill To:', 'doc-payment-info': 'Maklumat Pembayaran:', 'doc-item-desc': 'Perihalan Item', 'doc-unit': 'Unit', 'doc-price': 'Harga (RM)', 'doc-total': 'Jumlah (RM)', 'doc-discount': 'Diskaun Kupon', 'doc-digital': 'Dokumen ini dijana secara digital.', 'doc-grand': 'Jumlah Keseluruhan',
        'promo-add': 'Tambah Kupon Baru', 'btn-save': 'SIMPAN', 'promo-list': 'Senarai Kupon',
        'social-plan': 'Rancang Content', 'social-schedule': 'Jadual',
        'blast-cat': 'KATALOG', 'blast-select': 'Pilih Penerima', 'blast-msg': 'Mesej', 'blast-img': 'Gambar', 'blast-delay': 'Sela (saat)',
        'auto-save': 'Simpan Template', 'auto-list': 'Senarai Template',
        'btn-record': '+ Rekod', 'tax-total': 'Total Tuntutan', 'tax-count': 'Bilangan Resit', 'tax-top': 'Kategori Tertinggi', 'tax-status': 'Status Audit', 'tax-ok': 'Tersusun', 'th-date': 'Tarikh', 'th-receipt': 'Resit', 'th-category': 'Kategori', 'th-vendor': 'Vendor', 'th-amount': 'Jumlah',
        'hist-title': 'Rekod Transaksi', 'th-ref': 'No. Rujukan', 'th-client': 'Pelanggan', 'th-type': 'Jenis',
        'review-title': 'Review Dokumen', 'btn-close': 'Tutup', 'tax-new': 'Rekod Baru', 'tax-upload': 'Muat Naik Resit', 'btn-cancel': 'Batal',
        'Tiada Kupon.': 'Tiada Kupon.', 'Tiada Jadual.': 'Tiada Jadual.', 'Imej Sedia': 'Imej Sedia', 'Tiada template sapaan.': 'Tiada template sapaan.', 'SALIN': 'SALIN', 'Tiada rekod perbelanjaan.': 'Tiada rekod perbelanjaan.', 'SET PAID': 'SET PAID', 'TAMBAH SPEC': 'TAMBAH SPEC', 'SOROK': 'SOROK', 'LIHAT': 'LIHAT', 'Pergi ke Inventory': 'Pergi ke Inventory', 'Keranjang kosong': 'Keranjang kosong'
    },
    'EN': {
        'welcome': 'Welcome', 'enter-system': 'Enter System',
        'menu-dash': 'Dashboard', 'menu-pos': 'Mini POS', 'menu-inv': 'Inventory', 'menu-crm': 'CRM Database', 'menu-bill': 'Billing', 'menu-promo': 'Coupon Manager', 'menu-social': 'Social Marketing', 'menu-blast': 'Smart Blast', 'menu-auto': 'WhatsApp Chatbox', 'menu-tax': 'Tax Records', 'menu-hist': 'History',
        'btn-export': 'Export Backup', 'btn-import': 'Import Data', 'btn-threshold': 'Set Low Stock Threshold',
        'dash-title': 'Business Summary', 'dash-subtitle': 'Your current performance today.', 'dash-alert-stock': '⚠️ Critical Stock (≤ threshold)', 'lbl-rev-title': 'Current Revenue (Receipt)', 'btn-tax-record': 'TAX RECORD', 'lbl-rev-sub': 'Based on paid sales (Receipt)', 'lbl-margin': 'Profit Margin', 'lbl-exp': 'Expenses (Tax)', 'lbl-stk': 'Total Stock Items', 'lbl-biz-info': 'Business Info', 'lbl-job-title': 'Work Schedule & Appointments', 'btn-add-job': '+ Add Note',
        'pos-cust-info': 'Customer Information', 'btn-use': 'APPLY', 'pos-cart': 'Shopping Cart', 'pos-total': 'Total:', 'pos-discount': 'Coupon Discount:', 'pos-after-disc': 'After Discount:', 'pos-cash': 'Cash (RM):', 'pos-change': 'Change:', 'btn-complete': 'Complete', 'btn-clear': 'Clear', 'btn-print': 'Print Receipt',
        'inv-title': 'Stock Inventory', 'btn-new-prod': '+ New Product', 'th-image': 'Image', 'th-info': 'Product Info', 'th-cost': 'Cost (RM)', 'th-sell': 'Sell (RM)', 'th-stock': 'Stock Bal', 'th-action': 'Action',
        'crm-title': 'Customer Database', 'btn-add-lead': '+ Add Lead',
        'bill-gen-title': 'Document Generator', 'bill-client': 'Customer', 'bill-coupon': 'Coupon Code (Discount)', 'bill-doc-type': 'Document Type', 'btn-add-prod': '+ Add Product', 'btn-save-record': 'CONFIRM & SAVE RECORD', 'btn-save-pdf': 'Save PDF',
        'doc-date': 'Date', 'doc-bill-to': 'To / Bill To:', 'doc-payment-info': 'Payment Info:', 'doc-item-desc': 'Item Description', 'doc-unit': 'Unit', 'doc-price': 'Price (RM)', 'doc-total': 'Total (RM)', 'doc-discount': 'Coupon Discount', 'doc-digital': 'This document is digitally generated.', 'doc-grand': 'Grand Total',
        'promo-add': 'Add New Coupon', 'btn-save': 'SAVE', 'promo-list': 'Coupon List',
        'social-plan': 'Plan Content', 'social-schedule': 'Schedule',
        'blast-cat': 'CATALOG', 'blast-select': 'Select Recipient', 'blast-msg': 'Message', 'blast-img': 'Image', 'blast-delay': 'Delay (sec)',
        'auto-save': 'Save Template', 'auto-list': 'Template List',
        'btn-record': '+ Record', 'tax-total': 'Total Claims', 'tax-count': 'Receipt Count', 'tax-top': 'Top Category', 'tax-status': 'Audit Status', 'tax-ok': 'Organized', 'th-date': 'Date', 'th-receipt': 'Receipt', 'th-category': 'Category', 'th-vendor': 'Vendor', 'th-amount': 'Amount',
        'hist-title': 'Transaction Records', 'th-ref': 'Ref. No', 'th-client': 'Customer', 'th-type': 'Type',
        'review-title': 'Review Document', 'btn-close': 'Close', 'tax-new': 'New Record', 'tax-upload': 'Upload Receipt', 'btn-cancel': 'Cancel',
        'Tiada Kupon.': 'No Coupons.', 'Tiada Jadual.': 'No Schedule.', 'Imej Sedia': 'Image Ready', 'Tiada template sapaan.': 'No greeting templates.', 'SALIN': 'COPY', 'Tiada rekod perbelanjaan.': 'No expense records.', 'SET PAID': 'SET PAID', 'TAMBAH SPEC': 'ADD SPEC', 'SOROK': 'HIDE', 'LIHAT': 'VIEW', 'Pergi ke Inventory': 'Go to Inventory', 'Keranjang kosong': 'Cart is empty'
    }
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
        if (i18nDict[currentLang] && i18nDict[currentLang][key]) { el.innerText = i18nDict[currentLang][key]; }
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
    if (isDarkTheme) { document.body.classList.add('dark-mode'); if (btn) btn.innerHTML = '<i class="fas fa-sun text-amber-500"></i>'; } 
    else { document.body.classList.remove('dark-mode'); if (btn) btn.innerHTML = '<i class="fas fa-moon"></i>'; }
}

// ================== MODAL GLASS (for alerts & confirmations) ==================
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

// ================== FUNGSI UTAMA ==================
let activeDiscount = 0; let cart = []; let posDiscount = 0; let currentReviewDoc = null;

// Low Stock
function getLowStockItems() { return db.inv.filter(item => item.qty <= db.lowStockThreshold); }
function showLowStockToast(message) { const oldToast = document.querySelector('.toast-notify'); if (oldToast) oldToast.remove(); const toast = document.createElement('div'); toast.className = 'toast-notify'; toast.innerHTML = `<i class="fas fa-exclamation-triangle text-red-400 mr-2"></i> ${message} <button onclick="this.parentElement.remove()" class="ml-2 text-white font-bold">✕</button>`; document.body.appendChild(toast); setTimeout(() => toast.remove(), 5000); }
function updateLowStockPanel() { const lowItems = getLowStockItems(); const panel = document.getElementById('low-stock-panel'); const container = document.getElementById('low-stock-list'); if (lowItems.length === 0) { if(panel) panel.classList.add('hidden'); return; } if(panel) panel.classList.remove('hidden'); if(container) container.innerHTML = lowItems.map(item => `<div class="flex justify-between items-center border-b border-red-100 pb-2"><span class="font-bold">${item.name}</span><span class="text-red-600 font-black">Stok: ${item.qty}</span><button onclick="loadModule('inventory'); closeDrawer();" class="text-xs bg-red-100 px-2 py-1 rounded-full">${t('Pergi ke Inventory')}</button></div>`).join(''); }
function checkLowStockAndNotify(previousLowIds = []) { const lowItems = getLowStockItems(); const currentLowIds = lowItems.map(i => i.id); const newLow = lowItems.filter(i => !previousLowIds.includes(i.id)); if (newLow.length > 0) { const names = newLow.map(i => i.name).join(', '); showLowStockToast(`⚠️ Stok kritikal: ${names} (≤ ${db.lowStockThreshold})`); } updateLowStockPanel(); return currentLowIds; }
async function openThresholdModal() { const newVal = await showPrompt(currentLang==='BM'?`Tetapkan ambang stok rendah (stok ≤ nilai ini dianggap kritikal):`:`Set low stock threshold:`, db.lowStockThreshold); if (newVal !== null && !isNaN(parseInt(newVal))) { db.lowStockThreshold = parseInt(newVal); save(); checkLowStockAndNotify([]); renderInventory(); showAlert(currentLang==='BM'?`Ambang ditukar kepada ${db.lowStockThreshold}`:`Threshold changed to ${db.lowStockThreshold}`); } }

// Inventory
function renderInventory() { const tbody = document.getElementById('inventory-table-body'); if(!tbody) return; const lowIds = getLowStockItems().map(i => i.id); tbody.innerHTML = db.inv.map((item, idx) => `<tr class="border-b border-gray-50 align-top hover:bg-gray-50/50 transition ${lowIds.includes(item.id) ? 'low-stock-row' : ''}"><td class="p-6"><div class="w-16 h-16 bg-gray-100 rounded-2xl overflow-hidden relative border border-white flex items-center justify-center">${item.img ? `<img src="${item.img}" class="w-full h-full object-cover">` : `<i class="fas fa-camera text-gray-300"></i>`}<input type="file" onchange="updateInvImg(this, ${idx})" class="absolute inset-0 opacity-0 cursor-pointer"></div> <td class="p-6"><input type="text" value="${item.name}" onchange="updateInv(${idx}, 'name', this.value)" class="font-bold w-full bg-transparent outline-none text-gray-800"><div class="mt-2 space-y-1 ${item.showDetails ? '' : 'hidden'}">${(item.details || []).map((d, dIdx) => `<div class="flex gap-1"><input type="text" value="${d}" onchange="db.inv[${idx}].details[${dIdx}]=this.value; save();" placeholder="Spec" class="block text-[10px] p-2 w-full bg-white border border-gray-100 rounded-lg shadow-sm"><button onclick="db.inv[${idx}].details.splice(${dIdx},1); renderInventory(); save();" class="text-red-300 text-[10px]">&times;</button></div>`).join('')}</div><div class="flex gap-4 mt-3"><button onclick="if(!db.inv[${idx}].details) db.inv[${idx}].details=[]; db.inv[${idx}].details.push(''); renderInventory();" class="text-[9px] font-black text-blue-600 uppercase"><i class="fas fa-plus mr-1"></i> ${t('TAMBAH SPEC')}</button><button onclick="db.inv[${idx}].showDetails=!db.inv[${idx}].showDetails; renderInventory();" class="text-[9px] font-bold text-gray-400 uppercase"><i class="fas ${item.showDetails ? 'fa-eye-slash' : 'fa-eye'} mr-1"></i> ${item.showDetails ? t('SOROK') : t('LIHAT')}</button></div> <td class="p-6"><input type="number" value="${item.kos}" onchange="updateInv(${idx}, 'kos', this.value)" class="w-20 p-2 flux-input text-xs font-bold"> <td class="p-6"><input type="number" value="${item.jual}" onchange="updateInv(${idx}, 'jual', this.value)" class="w-20 p-2 flux-input text-xs font-bold text-blue-600"> <td class="p-6"><input type="number" value="${item.qty}" onchange="updateInv(${idx}, 'qty', this.value)" class="w-16 p-2 flux-input text-xs text-center font-bold"> <td class="p-6 text-center"><button onclick="db.inv.splice(${idx},1); save(); renderInventory();" class="text-gray-300 hover:text-red-500 text-xs"><i class="fas fa-trash-alt"></i></button>     \)`).join(''); }
function addInventoryItem() { db.inv.push({ id: Date.now(), name: currentLang==='BM'?'Produk Baru':'New Product', kos: 0, jual: 0, qty: 0, details: [], img: '', showDetails: true }); renderInventory(); save(); checkLowStockAndNotify([]); }
function updateInv(idx, field, val) { db.inv[idx][field] = (field === 'name') ? val : parseFloat(val); save(); renderInventory(); if (field === 'qty') { const lowItems = getLowStockItems(); if (lowItems.some(i => i.id === db.inv[idx].id)) showLowStockToast(`⚠️ Stok ${db.inv[idx].name} kini kritikal (${db.inv[idx].qty})`); updateLowStockPanel(); } }
function updateInvImg(input, idx) { const reader = new FileReader(); reader.onload = (e) => { db.inv[idx].img = e.target.result; save(); renderInventory(); }; reader.readAsDataURL(input.files[0]); }

// Dashboard
function renderDashboard() { const paidTransactions = db.hist.filter(h => h.type === 'REC'); const totalRev = paidTransactions.reduce((sum, h) => sum + h.total, 0); const totalMargin = paidTransactions.reduce((sum, h) => sum + h.margin, 0); const totalTax = db.tax.reduce((sum, t) => sum + t.amt, 0); const dashRev = document.getElementById('dash-total-rev'); if(dashRev) dashRev.innerText = `RM ${totalRev.toFixed(2)}`; const dashMargin = document.getElementById('dash-total-margin'); if(dashMargin) dashMargin.innerText = `RM ${totalMargin.toFixed(2)}`; const dashTax = document.getElementById('dash-tax-expense'); if(dashTax) dashTax.innerText = `RM ${totalTax.toFixed(2)}`; const dashInvCount = document.getElementById('dash-inv-count'); if(dashInvCount) dashInvCount.innerText = `${db.inv.length} Unit`; renderJobs(); updateLowStockPanel(); }

// Mini POS
function renderProductGrid() { const searchTerm = (document.getElementById('pos-search')?.value || '').toLowerCase(); const filtered = db.inv.filter(p => p.name.toLowerCase().includes(searchTerm)); const lowIds = getLowStockItems().map(i => i.id); const container = document.getElementById('product-grid'); if (!container) return; container.innerHTML = filtered.map(p => `<div class="product-btn ${lowIds.includes(p.id) ? 'low-stock' : ''}" onclick="addToCart(${p.id})"><div class="font-bold text-sm truncate">${p.name}</div><div class="text-blue-600 font-black text-lg">RM ${p.jual.toFixed(2)}</div><div class="text-[10px] text-gray-400">Stok: ${p.qty}</div></div>`).join(''); }
function filterProducts() { renderProductGrid(); }
async function addToCart(productId) { const product = db.inv.find(p => p.id === productId); if (!product) return; if (product.qty <= 0) { await showAlert(currentLang==='BM'?"Stok habis!":"Out of stock!"); return; } const existing = cart.find(i => i.id === productId); if (existing) { if (existing.qty + 1 > product.qty) { await showAlert(currentLang==='BM'?"Stok tidak mencukupi":"Insufficient stock"); return; } existing.qty++; } else { cart.push({ id: product.id, name: product.name, price: product.jual, qty: 1 }); } renderCart(); }
async function updateCartQty(id, delta) { const idx = cart.findIndex(i => i.id === id); if (idx === -1) return; const product = db.inv.find(p => p.id === id); const newQty = cart[idx].qty + delta; if (newQty <= 0) { cart.splice(idx,1); } else if (product && newQty > product.qty) { await showAlert(currentLang==='BM'?"Stok tidak mencukupi":"Insufficient stock"); return; } else { cart[idx].qty = newQty; } renderCart(); }
function removeCartItem(id) { cart = cart.filter(i => i.id !== id); renderCart(); }
function renderCart() { const container = document.getElementById('cart-items'); if (!container) return; if (cart.length === 0) { container.innerHTML = `<div class="text-center text-gray-400 py-4">${t('Keranjang kosong')}</div>`; document.getElementById('cart-total').innerText = 'RM 0.00'; document.getElementById('cart-grand').innerText = 'RM 0.00'; document.getElementById('discount-row').style.display = 'none'; calculateChange(); return; } let total = 0; container.innerHTML = cart.map(item => { const lineTotal = item.price * item.qty; total += lineTotal; return `<div class="cart-item"><div><span class="font-bold">${item.name}</span><div class="text-xs text-gray-500">RM ${item.price.toFixed(2)}</div></div><div class="cart-qty"><button onclick="updateCartQty(${item.id}, -1)">-</button><span class="w-8 text-center">${item.qty}</span><button onclick="updateCartQty(${item.id}, 1)">+</button><button onclick="removeCartItem(${item.id})" class="text-red-500 ml-2"><i class="fas fa-trash-alt"></i></button></div><div class="font-bold">RM ${lineTotal.toFixed(2)}</div></div>`; }).join(''); document.getElementById('cart-total').innerText = `RM ${total.toFixed(2)}`; const grand = total - posDiscount; document.getElementById('cart-grand').innerText = `RM ${grand.toFixed(2)}`; if (posDiscount > 0) { document.getElementById('discount-row').style.display = 'flex'; document.getElementById('cart-discount').innerText = `- RM ${posDiscount.toFixed(2)}`; } else { document.getElementById('discount-row').style.display = 'none'; } calculateChange(); }
function calculateChange() { const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0); const grand = total - posDiscount; const cash = parseFloat(document.getElementById('cash-paid')?.value) || 0; const change = cash - grand; const changeSpan = document.getElementById('change-amount'); if (changeSpan) changeSpan.innerText = `RM ${change >= 0 ? change.toFixed(2) : '0.00'}`; return change; }
function clearCart() { cart = []; posDiscount = 0; document.getElementById('pos-coupon').value = ''; renderCart(); document.getElementById('cash-paid').value = ''; calculateChange(); }
async function applyPosCoupon() { const code = document.getElementById('pos-coupon').value.toUpperCase(); if (db.coupons[code]) { posDiscount = db.coupons[code]; await showAlert(currentLang==='BM'?`Kupon ${code} digunakan: RM ${posDiscount} diskaun`:`Coupon ${code} applied: RM ${posDiscount} discount`); renderCart(); } else { await showAlert(currentLang==='BM'?"Kupon tidak sah":"Invalid Coupon"); posDiscount = 0; renderCart(); } }
async function completeSale() { if (cart.length === 0) { await showAlert(currentLang==='BM'?"Keranjang kosong":"Cart is empty"); return; } const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0); const grand = total - posDiscount; const cash = parseFloat(document.getElementById('cash-paid')?.value) || 0; if (cash < grand) { await showAlert(currentLang==='BM'?"Tunai tidak mencukupi":"Insufficient cash"); return; } const custName = document.getElementById('pos-cust-name').value.trim(); const custPhone = document.getElementById('pos-cust-phone').value.trim(); if (custName) { const existing = db.cli.find(c => c.name.toLowerCase() === custName.toLowerCase()); if (!existing) { db.cli.push({ id: Date.now(), name: custName, phone: custPhone, addr: '' }); save(); renderCRM(); } else if (custPhone && existing.phone !== custPhone) { existing.phone = custPhone; save(); renderCRM(); } } let margin = 0; const items = []; const previousLowIds = getLowStockItems().map(i => i.id); for (let item of cart) { const product = db.inv.find(p => p.id === item.id); if (product) { if (product.qty < item.qty) { await showAlert(currentLang==='BM'?`Stok ${product.name} tidak mencukupi`:`Not enough stock for ${product.name}`); return; } product.qty -= item.qty; margin += (product.jual - product.kos) * item.qty; items.push({ name: product.name, qty: item.qty, jual: product.jual, kos: product.kos }); } } const newRef = `REC${getNextRef('REC')}`; db.hist.push({ id: Date.now(), date: new Date().toLocaleDateString('en-GB'), ref: newRef, type: 'REC', clientName: custName || 'POS Walk-in', total: grand, margin: margin, items: items, discount: posDiscount }); save(); checkLowStockAndNotify(previousLowIds); renderInventory(); renderDashboard(); const change = cash - grand; printReceiptNow(grand, cash, change, custName, custPhone); clearCart(); await showAlert(currentLang==='BM'?"Jualan selesai. Resit dibuka.":"Sale complete. Receipt generated."); }
async function printReceipt() { if (cart.length === 0) { await showAlert(currentLang==='BM'?"Tiada item dalam keranjang":"No items in cart"); return; } const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0); const grand = total - posDiscount; const cash = parseFloat(document.getElementById('cash-paid')?.value) || 0; const change = cash - grand; const custName = document.getElementById('pos-cust-name').value.trim(); const custPhone = document.getElementById('pos-cust-phone').value.trim(); printReceiptNow(grand, cash, change, custName, custPhone); }
function printReceiptNow(total, cash, change, custName, custPhone) { const bizName = db.prof.name || "SYARIKAT ANDA"; const bizAddr = db.prof.addr || ""; const date = new Date().toLocaleString(); let itemsHtml = ''; cart.forEach(item => { itemsHtml += `<div style="display:flex; justify-content:space-between;"><span>${item.name} x${item.qty}</span><span>RM ${(item.price * item.qty).toFixed(2)}</span></div>`; }); const receiptHtml = `<div style="width: 300px; margin:0 auto; font-family: monospace; padding: 16px; border: 1px solid #ccc; border-radius: 12px;"><div style="text-align: center; font-weight: bold; font-size: 16px;">${bizName}</div><div style="text-align: center; font-size: 10px;">${bizAddr}</div><div style="text-align: center; font-size: 10px;">${date}</div>${custName ? `<div style="margin-top:8px;">Pelanggan: ${custName} ${custPhone ? `(${custPhone})` : ''}</div>` : ''}<hr style="margin: 8px 0;">${itemsHtml}${posDiscount > 0 ? `<div style="display:flex; justify-content:space-between;"><span>Diskaun</span><span>- RM ${posDiscount.toFixed(2)}</span></div>` : ''}<hr style="margin: 8px 0;"><div style="display:flex; justify-content:space-between;"><strong>JUMLAH</strong><strong>RM ${total.toFixed(2)}</strong></div><div style="display:flex; justify-content:space-between;">TUNAI: RM ${cash.toFixed(2)}</div><div style="display:flex; justify-content:space-between;">BAKI: RM ${change >= 0 ? change.toFixed(2) : '0.00'}</div><hr style="margin: 8px 0;"><div style="text-align: center; font-size: 10px;">Terima kasih! Selamat datang lagi.</div></div>`; const printWindow = window.open('', '_blank'); printWindow.document.write(`<html><head><title>Resit POS</title><style>body { display: flex; justify-content: center; align-items: center; min-height: 100vh; }</style></head><body>${receiptHtml}<script>window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 500); };<\/script></body></html>`); printWindow.document.close(); }

// Billing
async function generateFinalBilling() { const type = document.getElementById('billing-type')?.value; const selects = document.querySelectorAll('.item-select'), qtys = document.querySelectorAll('.qty-input'); const clientId = document.getElementById('bill-client-select')?.value; const client = db.cli.find(c => c.id == clientId); let total = 0, margin = 0, items = []; selects.forEach((s, idx) => { const item = db.inv.find(i => i.id == s.value); const q = parseInt(qtys[idx].value); if(item) { if(type !== 'QUO') item.qty -= q; total += item.jual * q; if(type === 'REC') margin += (item.jual - item.kos) * q; items.push({ name: item.name, qty: q, jual: item.jual, kos: item.kos }); } }); const finalTotal = total - activeDiscount; const finalMargin = (type === 'REC') ? (margin - activeDiscount) : 0; const refNum = getNextRef(type); const newRef = `${type}${refNum}`; db.hist.push({ id: Date.now(), date: new Date().toLocaleDateString('en-GB'), ref: newRef, type: type, clientName: client ? client.name : 'Umum', total: finalTotal, margin: finalMargin, items: items, discount: activeDiscount }); save(); await showAlert(currentLang==='BM'?`Rekod ${type} Berjaya Disimpan! No: ${newRef}`:`${type} Record Saved! No: ${newRef}`); location.reload(); }
async function deleteDoc(id) { const doc = db.hist.find(h => h.id === id); if (doc) { const type = doc.type; const refNum = parseInt(doc.ref.slice(3)); recycleRef(type, refNum); db.hist = db.hist.filter(h => h.id !== id); save(); renderHistory(); await showAlert(currentLang==='BM'?`Dokumen ${doc.ref} dibatalkan. Nombor akan diguna semula.`:`Document ${doc.ref} cancelled. Number will be recycled.`); } }
function populateBillingClients() { const s = document.getElementById('bill-client-select'); if(s) s.innerHTML = '<option value="">-- Pilih Pelanggan --</option>' + db.cli.map(c => `<option value="${c.id}">${c.name}</option>`).join(''); }
function addBillingItemRow() { const div = document.createElement('div'); div.className = "flex gap-2"; div.innerHTML = `<select class="w-3/4 p-3 text-xs flux-input item-select" onchange="calcBilling()"><option value="">Pilih Produk...</option>${db.inv.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}</select><input type="number" class="w-1/4 p-3 text-xs flux-input qty-input text-center" value="1" onchange="calcBilling()">`; document.getElementById('billing-items-input')?.appendChild(div); }
function calcBilling() { const selects = document.querySelectorAll('.item-select'), qtys = document.querySelectorAll('.qty-input'), body = document.getElementById('preview-items-body'); if(!body) return; body.innerHTML = ''; let sub = 0; selects.forEach((s, idx) => { const item = db.inv.find(i => i.id == s.value); if(item) { const line = item.jual * qtys[idx].value; sub += line; body.innerHTML += `\(\s*<td class="p-5 font-bold text-gray-800">${item.name}\s*<td class="p-5 text-center font-bold">${qtys[idx].value}\s*<td class="p-5 text-right">RM ${item.jual.toFixed(2)}\s*<td class="p-5 text-right font-black doc-accent-text">RM ${line.toFixed(2)}\s*`); } }); const grand = sub - activeDiscount; document.getElementById('grandtotal').innerText = `RM ${Math.max(0, grand).toFixed(2)}`; const discountRow = document.getElementById('preview-discount-row'); if(activeDiscount>0) { discountRow.classList.remove('hidden'); document.getElementById('prev-discount-val').innerText = `- RM ${activeDiscount.toFixed(2)}`; } else { discountRow.classList.add('hidden'); } }
async function applyCoupon() { const c = document.getElementById('coupon-input')?.value.toUpperCase(); if(db.coupons[c]) { activeDiscount = db.coupons[c]; await showAlert(currentLang==='BM'?"Kupon Guna!":"Coupon Applied!"); calcBilling(); } else { await showAlert(currentLang==='BM'?"Kupon Salah!":"Invalid Coupon!"); activeDiscount = 0; calcBilling(); } }
function updateBillTo() { const id = document.getElementById('bill-client-select')?.value, c = db.cli.find(x => x.id == id); const billTo = document.getElementById('bill-to-client'); if(billTo) billTo.innerText = c ? `${c.name}\n${c.phone}\n${c.addr}` : '---'; }
function shareWhatsapp() { const clientId = document.getElementById('bill-client-select')?.value; const client = db.cli.find(c => c.id == clientId); const phone = client ? client.phone : ''; const total = document.getElementById('grandtotal')?.innerText; const msg = encodeURIComponent(`Terima kasih. Sila lihat dokumen anda. Jumlah: ${total}`); if(phone) window.open(`https://wa.me/${phone}?text=${msg}`, '_blank'); else window.open(`https://wa.me/?text=${msg}`, '_blank'); }
function updateBillingTheme() { const type = document.getElementById('billing-type')?.value; document.body.className = `theme-${type} ${isDarkTheme ? 'dark-mode' : ''}`; const previewTitle = document.getElementById('preview-title'); if(previewTitle) previewTitle.innerText = type; const watermark = document.getElementById('watermark'); if(watermark) watermark.innerText = type; const refNo = document.getElementById('ref-no'); if(refNo) refNo.innerText = `${type}${db.ref[type]}`; const prevDate = document.getElementById('prev-date'); if(prevDate) prevDate.innerText = new Date().toLocaleDateString('en-GB'); }

// CRM
async function addClient() { const n = await showPrompt(currentLang==='BM'?"Nama Pelanggan:":"Customer Name:"); if(n) { db.cli.push({ id: Date.now(), name: n, phone: '', addr: '' }); save(); renderCRM(); } }
function renderCRM() { const container = document.getElementById('crm-list-grid'); if(container) container.innerHTML = db.cli.map((c, idx) => `<div class="flux-card p-6 border-none shadow-md group"><div class="flex justify-between items-start mb-4"><div class="w-12 h-12 bg-blue-100 rounded-[18px] flex items-center justify-center text-blue-600 font-black text-xl">${c.name.charAt(0)}</div><button onclick="db.cli.splice(${idx},1); save(); renderCRM();" class="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100"><i class="fas fa-times-circle"></i></button></div><input type="text" value="${c.name}" onchange="db.cli[${idx}].name=this.value; save();" class="font-bold w-full text-gray-800 bg-transparent outline-none"><div class="mt-4 space-y-2"><input type="text" value="${c.phone}" onchange="db.cli[${idx}].phone=this.value; save();" placeholder="601..." class="text-xs w-full p-2 flux-input"><textarea onchange="db.cli[${idx}].addr=this.value; save();" class="text-[10px] w-full p-2 flux-input h-14">${c.addr}</textarea></div></div>`).join(''); }

// Business Profile
function updateBizProfile() { db.prof.name = document.getElementById('set-biz-name')?.value || ''; db.prof.addr = document.getElementById('set-biz-addr')?.value || ''; db.prof.bank = document.getElementById('set-biz-bank')?.value || ''; const prevName = document.getElementById('prev-biz-name'); if(prevName) prevName.innerText = db.prof.name || "NAMA SYARIKAT"; const prevAddr = document.getElementById('prev-biz-addr'); if(prevAddr) prevAddr.innerText = db.prof.addr || "ALAMAT"; const prevBank = document.getElementById('prev-biz-bank'); if(prevBank) prevBank.innerText = db.prof.bank || "BANK"; if(db.prof.logo) { const logo = document.getElementById('prev-logo'); if(logo) { logo.src = db.prof.logo; logo.classList.remove('hidden'); } } if(db.prof.cop) { const cop = document.getElementById('prev-cop'); if(cop) { cop.src = db.prof.cop; cop.classList.remove('hidden'); } } save(); }
function uploadProfileImg(i, t) { const r = new FileReader(); r.onload = (e) => { db.prof[t] = e.target.result; save(); updateBizProfile(); }; r.readAsDataURL(i.files[0]); }

// ================== JOBS (JADUAL KERJA) with Glassmorphism Modal ==================
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
                    reminderDateTime = `${date}T${time}`;
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

    if (Notification.permission !== 'granted') {
        Notification.requestPermission();
    }

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
        if (job.reminder && job.reminderTimestamp) {
            scheduleReminder(job);
        }
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

    if (reminder && reminderTimestamp) {
        scheduleReminder(newJob);
    }

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

// Coupons
function renderCoupons() { const container = document.getElementById('coupon-list'); if(container) container.innerHTML = Object.entries(db.coupons).map(([c, v]) => `<div class="bg-white p-4 rounded-2xl border border-dashed border-purple-200 flex justify-between items-center"><div><p class="text-xs font-black text-purple-600">${c}</p><p class="text-lg font-bold">RM ${v}</p></div><button onclick="deleteCoupon('${c}')" class="text-gray-200 hover:text-red-500"><i class="fas fa-trash"></i></button></div>`).join('') || `<p class="text-xs">${t('Tiada Kupon.')}</p>`; }
function addNewCoupon() { const c = document.getElementById('new-coupon-code')?.value.toUpperCase(), v = parseFloat(document.getElementById('new-coupon-val')?.value); if(c && v) { db.coupons[c] = v; save(); renderCoupons(); } }
function deleteCoupon(c) { delete db.coupons[c]; save(); renderCoupons(); }

// PDF Export
async function exportAndShare() { const e = document.getElementById('print-area'); if(e) { const o = { margin: 0.2, filename: 'BizProDoc.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 3, useCORS: true }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } }; await html2pdf().set(o).from(e).save(); } }
function exportData() { const d = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db)); const a = document.createElement('a'); a.href = d; a.download = 'BizPro_Flux_Backup.json'; a.click(); }
function importData(e) { const r = new FileReader(); r.onload = (ev) => { db = JSON.parse(ev.target.result); save(); location.reload(); }; r.readAsText(e.target.files[0]); }

// Social Schedule
function addSchedule() { const p = document.getElementById('sch-platform')?.value, tStr = document.getElementById('sch-title')?.value, d = document.getElementById('sch-date')?.value, tm = document.getElementById('sch-time')?.value; if(tStr && d && tm) { db.sch.push({ id: Date.now(), platform: p, title: tStr, date: d, time: tm, status: 'PENDING' }); save(); renderSchedule(); } }
function renderSchedule() { const container = document.getElementById('schedule-list'); if(container) container.innerHTML = db.sch.map(s => `<div class="bg-white p-5 rounded-2xl border border-gray-100 flex justify-between items-center group shadow-sm"><div><h4 class="font-bold text-sm">${s.title}</h4><p class="text-[10px] text-gray-400 font-bold uppercase">${s.platform} | ${s.date} ${s.time}</p></div><button onclick="db.sch=db.sch.filter(x=>x.id!==${s.id});save();renderSchedule();" class="text-gray-200 hover:text-red-500"><i class="fas fa-trash"></i></button></div>`).join('') || `<p class="text-xs text-center py-4">${t('Tiada Jadual.')}</p>`; }

// Blast
function renderBlastClientList() { const container = document.getElementById('blast-client-list'); if(container) container.innerHTML = db.cli.map(c => `<label class="flex items-center p-3 hover:bg-emerald-50 rounded-2xl cursor-pointer"><input type="checkbox" class="blast-checkbox w-5 h-5 mr-4 accent-emerald-500" data-phone="${c.phone}" data-name="${c.name}"><div><p class="text-sm font-bold">${c.name}</p><p class="text-[10px] text-gray-400 font-bold">${c.phone}</p></div></label>`).join(''); }
async function startBlast() { const cs = document.querySelectorAll('.blast-checkbox:checked'), m = document.getElementById('blast-msg')?.value; for(let c of cs) { const f = encodeURIComponent(m.replace('{name}', c.dataset.name)); window.open(`https://wa.me/${c.dataset.phone}?text=${f}`, '_blank'); await new Promise(r => setTimeout(r, 2000)); } }
function generateCatalogText() { let c = "KATALOG:\n"; db.inv.slice(0, 10).forEach(i => c += `- ${i.name} RM${i.jual}\n`); const msgArea = document.getElementById('blast-msg'); if(msgArea) msgArea.value = c; }

// Autoreply
function renderAR() { const container = document.getElementById('ar-list'); if(container) container.innerHTML = db.ar.map(item => `<div class="bg-gray-50 p-4 rounded-2xl flex justify-between items-center border border-gray-100"><div class="flex-1 pr-4"><p class="font-bold text-sm text-gray-800">${item.title}</p><p class="text-[10px] text-gray-400 line-clamp-1">${item.msg}</p></div><div class="flex gap-2"><button onclick="copyToClipboard('${encodeURIComponent(item.msg)}')" class="bg-blue-600 text-white p-2 px-3 rounded-lg text-[10px] font-bold uppercase">${t('SALIN')}</button><button onclick="deleteAR(${item.id})" class="text-red-400 text-xs px-2"><i class="fas fa-trash"></i></button></div></div>`).join('') || `<p class="text-gray-400 text-xs italic py-4">${t('Tiada template sapaan.')}</p>`; }
async function saveAR() { const title = document.getElementById('ar-title')?.value, msg = document.getElementById('ar-msg')?.value; if(!title || !msg) return await showAlert(currentLang==='BM'?"Sila isi tajuk dan mesej!":"Please fill title and message!"); db.ar.push({ id: Date.now(), title, msg }); save(); renderAR(); document.getElementById('ar-title').value = ''; document.getElementById('ar-msg').value = ''; }
function copyToClipboard(msg) { const text = decodeURIComponent(msg); navigator.clipboard.writeText(text).then(async () => { await showAlert(currentLang==='BM'?"Template disalin ke papan klip!":"Template copied to clipboard!"); }); }
async function deleteAR(id) { const confirmed = await showConfirm(currentLang==='BM'?"Padam template?":"Delete template?"); if(confirmed) { db.ar = db.ar.filter(x => x.id !== id); save(); renderAR(); } }

// LHDN Tax
async function saveTaxRecord() { const date = document.getElementById('tax-date')?.value, amt = parseFloat(document.getElementById('tax-amount')?.value), cat = document.getElementById('tax-category')?.value, vendor = document.getElementById('tax-vendor')?.value, imgInput = document.getElementById('tax-img-input'); if(!date || isNaN(amt) || !vendor) return await showAlert(currentLang==='BM'?"Sila isi semua maklumat!":"Please fill all information!"); const processSave = (imgData) => { db.tax.push({ id: Date.now(), date, amt, cat, vendor, img: imgData }); save(); renderTax(); document.getElementById('tax-modal').classList.add('hidden'); }; if(imgInput.files[0]) { const reader = new FileReader(); reader.onload = (e) => processSave(e.target.result); reader.readAsDataURL(imgInput.files[0]); } else { processSave(''); } }
function renderTax() { const tbody = document.getElementById('tax-table-body'); if(!tbody) return; let total = 0; const categories = {}; tbody.innerHTML = db.tax.sort((a,b) => new Date(b.date) - new Date(a.date)).map(t => { total += t.amt; categories[t.cat] = (categories[t.cat] || 0) + t.amt; return `<tr class="border-b border-gray-50 hover:bg-gray-50/50 transition"><td class="p-6 text-xs font-bold text-gray-500 uppercase">${t.date}</td><td class="p-6">${t.img ? `<img src="${t.img}" class="w-10 h-10 rounded object-cover cursor-pointer" onclick="window.open('${t.img}')">` : '<i class="fas fa-file-excel text-gray-200"></i>'}</td><td class="p-6"><span class="bg-gray-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase">${t.cat}</span></td><td class="p-6 font-bold text-sm text-gray-800">${t.vendor}</td><td class="p-6 text-right font-black text-orange-600">RM ${t.amt.toFixed(2)}</td><td class="p-6 text-center"><button onclick="deleteTax(${t.id})" class="text-gray-200 hover:text-red-500"><i class="fas fa-trash"></i></button></td></tr>`; }).join('') || `<tr><td colspan="6" class="p-10 text-center text-gray-400 font-bold">${t('Tiada rekod perbelanjaan.')}</td></tr>`; document.getElementById('tax-total-amt').innerText = `RM ${total.toFixed(2)}`; document.getElementById('tax-receipt-count').innerText = db.tax.length; const topCat = Object.keys(categories).reduce((a, b) => categories[a] > categories[b] ? a : b, '-'); document.getElementById('tax-top-cat').innerText = topCat; }
async function deleteTax(id) { const confirmed = await showConfirm(currentLang==='BM'?"Padam rekod ini?":"Delete this record?"); if(confirmed) { db.tax = db.tax.filter(t => t.id !== id); save(); renderTax(); } }

// History
async function convertInvToRec(id) { const idx = db.hist.findIndex(h => h.id === id); if(idx !== -1 && db.hist[idx].type === 'INV') { const inv = db.hist[idx]; inv.type = 'REC'; const newRefNum = getNextRef('REC'); inv.ref = `REC${newRefNum}`; let m = 0; inv.items.forEach(i => { m += (i.jual - i.kos) * i.qty; }); inv.margin = m - (inv.discount || 0); save(); renderHistory(); await showAlert(currentLang==='BM'?"Invoice ditukar kepada Receipt!":"Invoice converted to Receipt!"); } }
function renderHistory() { const container = document.getElementById('history-body'); if(!container) return; container.innerHTML = db.hist.map(h => `<tr class="hover:bg-gray-50 transition"><td class="p-6">${h.date}</td><td class="p-6 font-bold text-blue-600">${h.ref}</td><td class="p-6 font-medium">${h.clientName}</td><td class="p-6"><span class="px-3 py-1 rounded-full text-[10px] font-black uppercase ${h.type === 'REC' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}">${h.type}</span></td><td class="p-6 text-right font-black">RM ${h.total.toFixed(2)}</td><td class="p-6 text-center space-x-2"><button onclick="viewDocument(${JSON.stringify(h).replace(/"/g, '&quot;')})" class="text-blue-500 hover:text-blue-700 text-xs font-bold"><i class="fas fa-eye mr-1"></i> Review</button><button onclick="downloadDocument(${JSON.stringify(h).replace(/"/g, '&quot;')})" class="text-emerald-500 hover:text-emerald-700 text-xs font-bold"><i class="fas fa-download mr-1"></i> Download</button>${h.type === 'INV' ? `<button onclick="convertInvToRec(${h.id})" class="text-emerald-500 hover:text-emerald-700 text-xs font-bold"><i class="fas fa-check-double mr-1"></i> ${t('SET PAID')}</button>` : ''}<button onclick="deleteDoc(${h.id})" class="text-gray-200 hover:text-red-500"><i class="fas fa-trash-alt"></i></button></td></tr>`).reverse().join(''); }

// Document review and PDF
function viewDocument(hist) { currentReviewDoc = hist; const type = hist.type; const docColor = type === 'QUO' ? '#007AFF' : (type === 'INV' ? '#1c1c1e' : '#10b981'); const bizName = db.prof.name || "SYARIKAT ANDA"; const bizAddr = db.prof.addr || "Alamat Perniagaan"; const bizBank = db.prof.bank || "Bank & No Akaun"; const clientName = hist.clientName || "Pelanggan"; const itemsHtml = hist.items.map(item => `<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:12px 8px; font-weight:600;">${item.name}</td><td style="padding:12px 8px; text-align:center;">${item.qty}</td><td style="padding:12px 8px; text-align:right;">RM ${item.jual.toFixed(2)}</td><td style="padding:12px 8px; text-align:right;">RM ${(item.jual * item.qty).toFixed(2)}</td></tr>`).join(''); const subtotal = hist.items.reduce((sum, i) => sum + (i.jual * i.qty), 0); const discount = hist.discount || 0; const grand = subtotal - discount; const discountRow = discount > 0 ? `<tr><td colspan="3" style="padding:12px 8px; text-align:right; font-weight:bold; color:red;">Diskaun Kupon</td><td style="padding:12px 8px; text-align:right; font-weight:bold; color:red;">- RM ${discount.toFixed(2)}</td></tr>` : ''; const docHtml = `<div style="font-family: 'Plus Jakarta Sans', sans-serif; max-width: 800px; margin:0 auto;"><div style="display:flex; justify-content:space-between; margin-bottom:30px;"><div><h2 style="font-size:24px; font-weight:900; text-transform:uppercase;">${bizName}</h2><p style="font-size:12px; color:#6b7280;">${bizAddr}</p></div><div style="text-align:right;"><h1 style="font-size:48px; font-weight:900; font-style:italic; color:${docColor};">${type}</h1><p style="font-weight:900; font-size:20px;">${hist.ref}</p><p style="font-size:10px;">Tarikh: ${hist.date}</p></div></div><div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:30px;"><div style="background:#f9fafb; padding:16px; border-radius:16px; border-left:4px solid ${docColor};"><p style="font-size:9px; font-weight:bold; color:${docColor};">Kepada:</p><p style="font-weight:600;">${clientName}</p></div><div style="padding:16px; text-align:right;"><p style="font-size:9px; font-weight:bold;">Maklumat Pembayaran:</p><p style="font-size:12px;">${bizBank}</p></div></div><table style="width:100%; border-collapse:collapse; margin-bottom:30px;"><thead><tr style="background:${docColor}; color:white;"><th style="padding:12px 8px; text-align:left;">Perihalan</th><th style="padding:12px 8px; text-align:center;">Unit</th><th style="padding:12px 8px; text-align:right;">Harga (RM)</th><th style="padding:12px 8px; text-align:right;">Jumlah (RM)</th></tr></thead><tbody>${itemsHtml}${discountRow}</tbody><tfoot><tr><td colspan="3" style="padding:12px 8px; text-align:right; font-weight:bold;">JUMLAH KESELURUHAN</td><td style="padding:12px 8px; text-align:right; font-weight:bold; font-size:20px;">RM ${grand.toFixed(2)}</td></tr></tfoot></table><div style="text-align:center; font-size:10px; color:#9ca3af;">Dokumen ini dijana secara digital.</div></div>`; document.getElementById('reviewDocContent').innerHTML = docHtml; document.getElementById('reviewModal').classList.remove('hidden'); }
function closeReviewModal() { document.getElementById('reviewModal').classList.add('hidden'); currentReviewDoc = null; }
async function downloadReviewAsPDF() { if (!currentReviewDoc) return; const element = document.getElementById('reviewDocContent'); const opt = { margin: 0.2, filename: `${currentReviewDoc.ref}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } }; await html2pdf().set(opt).from(element).save(); }
async function downloadDocument(hist) { const type = hist.type; const docColor = type === 'QUO' ? '#007AFF' : (type === 'INV' ? '#1c1c1e' : '#10b981'); const bizName = db.prof.name || "SYARIKAT ANDA"; const bizAddr = db.prof.addr || "Alamat Perniagaan"; const bizBank = db.prof.bank || "Bank & No Akaun"; const clientName = hist.clientName || "Pelanggan"; const itemsHtml = hist.items.map(item => `<tr style="border-bottom:1px solid #e5e7eb;"><td style="padding:12px 8px; font-weight:600;">${item.name}</td><td style="padding:12px 8px; text-align:center;">${item.qty}</td><td style="padding:12px 8px; text-align:right;">RM ${item.jual.toFixed(2)}</td><td style="padding:12px 8px; text-align:right;">RM ${(item.jual * item.qty).toFixed(2)}</td></tr>`).join(''); const subtotal = hist.items.reduce((sum, i) => sum + (i.jual * i.qty), 0); const discount = hist.discount || 0; const grand = subtotal - discount; const discountRow = discount > 0 ? `<tr><td colspan="3" style="padding:12px 8px; text-align:right; font-weight:bold; color:red;">Diskaun Kupon</td><td style="padding:12px 8px; text-align:right; font-weight:bold; color:red;">- RM ${discount.toFixed(2)}</td></tr>` : ''; const docHtml = `<div style="font-family: 'Plus Jakarta Sans', sans-serif; max-width: 800px; margin:0 auto; padding:20px;"><div style="display:flex; justify-content:space-between; margin-bottom:30px;"><div><h2 style="font-size:24px; font-weight:900; text-transform:uppercase;">${bizName}</h2><p style="font-size:12px; color:#6b7280;">${bizAddr}</p></div><div style="text-align:right;"><h1 style="font-size:48px; font-weight:900; font-style:italic; color:${docColor};">${type}</h1><p style="font-weight:900; font-size:20px;">${hist.ref}</p><p style="font-size:10px;">Tarikh: ${hist.date}</p></div></div><div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:30px;"><div style="background:#f9fafb; padding:16px; border-radius:16px; border-left:4px solid ${docColor};"><p style="font-size:9px; font-weight:bold; color:${docColor};">Kepada:</p><p style="font-weight:600;">${clientName}</p></div><div style="padding:16px; text-align:right;"><p style="font-size:9px; font-weight:bold;">Maklumat Pembayaran:</p><p style="font-size:12px;">${bizBank}</p></div></div><table style="width:100%; border-collapse:collapse; margin-bottom:30px;"><thead><tr style="background:${docColor}; color:white;"><th style="padding:12px 8px; text-align:left;">Perihalan</th><th style="padding:12px 8px; text-align:center;">Unit</th><th style="padding:12px 8px; text-align:right;">Harga (RM)</th><th style="padding:12px 8px; text-align:right;">Jumlah (RM)</th></tr></thead><tbody>${itemsHtml}${discountRow}</tbody><tfoot><tr><td colspan="3" style="padding:12px 8px; text-align:right; font-weight:bold;">JUMLAH KESELURUHAN</td><td style="padding:12px 8px; text-align:right; font-weight:bold; font-size:20px;">RM ${grand.toFixed(2)}</td></tr></tfoot></table><div style="text-align:center; font-size:10px; color:#9ca3af;">Dokumen ini dijana secara digital.</div></div>`; const tempDiv = document.createElement('div'); tempDiv.innerHTML = docHtml; document.body.appendChild(tempDiv); const opt = { margin: 0.2, filename: `${hist.ref}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } }; await html2pdf().set(opt).from(tempDiv).save(); document.body.removeChild(tempDiv); }

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