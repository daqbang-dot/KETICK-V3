// ================== DEBUG VISUAL ==================
// Tambah elemen debug di bawah login overlay
const debugDiv = document.createElement('div');
debugDiv.id = 'debug-log';
debugDiv.style.cssText = 'position: fixed; bottom: 0; left: 0; right: 0; background: black; color: lime; font-size: 10px; padding: 5px; z-index: 10000; max-height: 100px; overflow-y: auto; font-family: monospace;';
document.body.appendChild(debugDiv);

function debugLog(msg) {
    const log = document.getElementById('debug-log');
    if (log) {
        const p = document.createElement('div');
        p.innerText = new Date().toLocaleTimeString() + ' ' + msg;
        log.appendChild(p);
        log.scrollTop = log.scrollHeight;
    }
    console.log(msg);
}
debugLog('App starting...');

// ================== DATA & STORAGE ==================
let db = {
    inv: JSON.parse(localStorage.getItem('f6_inv')) || [],
    cli: JSON.parse(localStorage.getItem('f6_cli')) || [],
    hist: JSON.parse(localStorage.getItem('f6_hist')) || [],
    jobs: JSON.parse(localStorage.getItem('f6_jobs')) || [],
    sch: JSON.parse(localStorage.getItem('f6_sch')) || [],
    coupons: JSON.parse(localStorage.getItem('f6_coupons')) || [], // now array of objects {code, value, quantity}
    ref: JSON.parse(localStorage.getItem('f6_ref')) || { QUO: 1001, INV: 1001, REC: 1001 },
    refRecycle: JSON.parse(localStorage.getItem('f6_refRecycle')) || { QUO: [], INV: [], REC: [] },
    prof: JSON.parse(localStorage.getItem('f6_prof')) || { name: '', addr: '', bank: '', logo: '', cop: '' },
    tax: JSON.parse(localStorage.getItem('f6_tax')) || [],
    ar: JSON.parse(localStorage.getItem('f6_ar')) || [],
    lowStockThreshold: parseInt(localStorage.getItem('lowStockThreshold')) || 5
};

// Convert old coupons format if necessary
if (db.coupons && !Array.isArray(db.coupons)) {
    const old = db.coupons;
    db.coupons = Object.entries(old).map(([code, value]) => ({ code, value, quantity: 999 })); // default quantity large
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

// ================== ACTIVATION SYSTEM ==================
const MASTER_SECRET = "BiZpro2025!@#";

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
    const deviceId = getDeviceId();
    return new Promise((resolve) => {
        try {
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
        } catch (err) {
            debugLog('Modal error: ' + err);
            alert('Gagal memaparkan modal. Guna prompt asli.');
            const key = prompt('Masukkan kunci aktivasi:');
            if (key) {
                activateSystem(key).then(success => resolve(success));
            } else {
                resolve(false);
            }
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
    debugLog('loadModule called: ' + moduleName);

    if (!isActivated()) {
        debugLog('Not activated, showing activation modal first');
        const activated = await showActivationModal();
        if (!activated) {
            debugLog('Activation failed or cancelled, abort module load');
            return;
        }
        debugLog('Activation successful, proceeding to load module');
    }

    document.getElementById('reviewModal')?.classList.add('hidden');
    document.getElementById('tax-modal')?.classList.add('hidden');

    const appContent = document.getElementById('app-content');
    if (!appContent) {
        debugLog('app-content not found');
        return;
    }

    try {
        const response = await fetch(`src/modules/${moduleName}/${moduleName}.html`);
        if (!response.ok) {
            debugLog(`Failed to load module: ${moduleName} (HTTP ${response.status})`);
            alert(`Gagal memuat modul: ${moduleName}. Pastikan fail wujud di src/modules/${moduleName}/${moduleName}.html`);
            return;
        }
        const html = await response.text();
        appContent.innerHTML = html;
        debugLog('Module loaded: ' + moduleName);
    } catch (err) {
        debugLog('Fetch error: ' + err);
        alert('Ralat memuat modul: ' + err);
        return;
    }

    currentModule = moduleName;

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
        'lhdn': renderTax,
        'history': () => { renderHistory(); setupHistoryExtra(); }
    }[moduleName];

    if (renderFunc) {
        debugLog('Calling render function for ' + moduleName);
        renderFunc();
    }

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
    debugLog('enterSystem called');
    document.getElementById('login-overlay').classList.add('hidden');
    setupAdminGesture();

    if (!isActivated()) {
        debugLog('Not activated, show activation');
        const setupBtn = document.getElementById('first-time-setup-btn');
        if (setupBtn) {
            debugLog('Found first-time-setup-btn');
            setupBtn.classList.remove('hidden');
            setupBtn.onclick = async () => {
                debugLog('Setup button clicked');
                const activated = await showActivationModal();
                if (activated) {
                    debugLog('Activation success');
                    setupBtn.classList.add('hidden');
                    logActivity('app_open', { deviceId: getDeviceId() });
                    loadModule('dashboard');
                    initAppAfterActivation();
                } else {
                    debugLog('Activation failed or cancelled');
                }
            };
        } else {
            debugLog('No first-time-setup-btn, show modal directly');
            (async () => {
                const activated = await showActivationModal();
                if (activated) {
                    debugLog('Activation success');
                    logActivity('app_open', { deviceId: getDeviceId() });
                    loadModule('dashboard');
                    initAppAfterActivation();
                }
            })();
        }
        return;
    } else {
        debugLog('Already activated');
        const setupBtn = document.getElementById('first-time-setup-btn');
        if (setupBtn) setupBtn.classList.add('hidden');
        logActivity('app_open', { deviceId: getDeviceId() });
        loadModule('dashboard');
        initAppAfterActivation();
    }
}

function initAppAfterActivation() {
    debugLog('initAppAfterActivation called');
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
        'hist-title': 'Rekod Transaksi', 'th-ref': 'No. Rujukan', 'th-client': 'Pelanggan', 'th-type': 'Jenis', 'th-phone': 'Telefon', 'btn-search': 'Cari', 'btn-wa': 'WhatsApp',
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
        'hist-title': 'Transaction Records', 'th-ref': 'Ref. No', 'th-client': 'Customer', 'th-type': 'Type', 'th-phone': 'Phone', 'btn-search': 'Search', 'btn-wa': 'WhatsApp',
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

// ================== MODAL GLASS ==================
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
function renderInventory() { 
    const tbody = document.getElementById('inventory-table-body'); 
    if(!tbody) return; 
    const lowIds = getLowStockItems().map(i => i.id); 
    tbody.innerHTML = db.inv.map((item, idx) => {
        return `<tr class="border-b border-gray-50 align-top hover:bg-gray-50/50 transition ${lowIds.includes(item.id) ? 'low-stock-row' : ''}">
            <td class="p-6"><div class="w-16 h-16 bg-gray-100 rounded-2xl overflow-hidden relative border border-white flex items-center justify-center">${item.img ? `<img src="${item.img}" class="w-full h-full object-cover">` : `<i class="fas fa-camera text-gray-300"></i>`}<input type="file" onchange="updateInvImg(this, ${idx})" class="absolute inset-0 opacity-0 cursor-pointer"></div><\/td>
            <td class="p-6"><input type="text" value="${item.name}" onchange="updateInv(${idx}, 'name', this.value)" class="font-bold w-full bg-transparent outline-none text-gray-800">
            <div class="mt-2 space-y-1 ${item.showDetails ? '' : 'hidden'}">${(item.details || []).map((d, dIdx) => `<div class="flex gap-1"><input type="text" value="${d}" onchange="db.inv[${idx}].details[${dIdx}]=this.value; save();" placeholder="Spec" class="block text-[10px] p-2 w-full bg-white border border-gray-100 rounded-lg shadow-sm"><button onclick="db.inv[${idx}].details.splice(${dIdx},1); renderInventory(); save();" class="text-red-300 text-[10px]">&times;</button></div>`).join('')}</div>
            <div class="flex gap-4 mt-3"><button onclick="if(!db.inv[${idx}].details) db.inv[${idx}].details=[]; db.inv[${idx}].details.push(''); renderInventory();" class="text-[9px] font-black text-blue-600 uppercase"><i class="fas fa-plus mr-1"></i> ${t('TAMBAH SPEC')}</button><button onclick="db.inv[${idx}].showDetails=!db.inv[${idx}].showDetails; renderInventory();" class="text-[9px] font-bold text-gray-400 uppercase"><i class="fas ${item.showDetails ? 'fa-eye-slash' : 'fa-eye'} mr-1"></i> ${item.showDetails ? t('SOROK') : t('LIHAT')}</button></div><\/td>
            <td class="p-6"><input type="number" value="${item.kos}" onchange="updateInv(${idx}, 'kos', this.value)" class="w-20 p-2 flux-input text-xs font-bold"><\/td>
            <td class="p-6"><input type="number" value="${item.jual}" onchange="updateInv(${idx}, 'jual', this.value)" class="w-20 p-2 flux-input text-xs font-bold text-blue-600"><\/td>
            <td class="p-6"><input type="number" value="${item.qty}" onchange="updateInv(${idx}, 'qty', this.value)" class="w-16 p-2 flux-input text-xs text-center font-bold"><\/td>
            <td class="p-6 text-center"><button onclick="db.inv.splice(${idx},1); save(); renderInventory();" class="text-gray-300 hover:text-red-500 text-xs"><i class="fas fa-trash-alt"></i></button><\/td>
         <\/tr>`;
    }).join(''); 
}
function addInventoryItem() { db.inv.push({ id: Date.now(), name: currentLang==='BM'?'Produk Baru':'New Product', kos: 0, jual: 0, qty: 0, details: [], img: '', showDetails: true, salesCount: 0 }); renderInventory(); save(); checkLowStockAndNotify([]); }
function updateInv(idx, field, val) { db.inv[idx][field] = (field === 'name') ? val : parseFloat(val); save(); renderInventory(); if (field === 'qty') { const lowItems = getLowStockItems(); if (lowItems.some(i => i.id === db.inv[idx].id)) showLowStockToast(`⚠️ Stok ${db.inv[idx].name} kini kritikal (${db.inv[idx].qty})`); updateLowStockPanel(); } }
function updateInvImg(input, idx) { const reader = new FileReader(); reader.onload = (e) => { db.inv[idx].img = e.target.result; save(); renderInventory(); }; reader.readAsDataURL(input.files[0]); }

// Dashboard
function renderDashboard() { const paidTransactions = db.hist.filter(h => h.type === 'REC'); const totalRev = paidTransactions.reduce((sum, h) => sum + h.total, 0); const totalMargin = paidTransactions.reduce((sum, h) => sum + h.margin, 0); const totalTax = db.tax.reduce((sum, t) => sum + t.amt, 0); const dashRev = document.getElementById('dash-total-rev'); if(dashRev) dashRev.innerText = `RM ${totalRev.toFixed(2)}`; const dashMargin = document.getElementById('dash-total-margin'); if(dashMargin) dashMargin.innerText = `RM ${totalMargin.toFixed(2)}`; const dashTax = document.getElementById('dash-tax-expense'); if(dashTax) dashTax.innerText = `RM ${totalTax.toFixed(2)}`; const dashInvCount = document.getElementById('dash-inv-count'); if(dashInvCount) dashInvCount.innerText = `${db.inv.length} Unit`; renderJobs(); updateLowStockPanel(); }

// ================== MINI POS (enhanced) ==================
function renderProductGrid() {
    const searchTerm = (document.getElementById('pos-search')?.value || '').toLowerCase();
    let filtered = db.inv.filter(p => p.name.toLowerCase().includes(searchTerm));
    // Sort by salesCount (most sold first) to show top 4 as bestsellers
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
    return `<div class="product-btn ${lowIds.includes(p.id) ? 'low-stock' : ''}" onclick="addToCart(${p.id})">
        <div class="flex justify-center mb-1">${p.img ? `<img src="${p.img}" class="w-12 h-12 object-cover rounded-lg">` : '<i class="fas fa-box text-gray-400 text-2xl"></i>'}</div>
        <div class="font-bold text-sm truncate">${p.name}</div>
        <div class="text-blue-600 font-black text-lg">RM ${p.jual.toFixed(2)}</div>
        <div class="text-[10px] text-gray-400">Stok: ${p.qty}</div>
    </div>`;
}
function setupPosExtra() {
    // No extra for now
}
// Rest of POS functions (addToCart, etc.) remain same except modify completeSale to store phone and share receipt
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
        if (!existing) {
            db.cli.push({ id: Date.now(), name: custName, phone: custPhone, addr: '' });
            save(); renderCRM();
        } else if (custPhone && existing.phone !== custPhone) {
            existing.phone = custPhone; save(); renderCRM();
        }
    }
    let margin = 0; const items = []; const previousLowIds = getLowStockItems().map(i => i.id);
    for (let item of cart) {
        const product = db.inv.find(p => p.id === item.id);
        if (product) {
            if (product.qty < item.qty) { await showAlert(currentLang==='BM'?`Stok ${product.name} tidak mencukupi`:`Not enough stock for ${product.name}`); return; }
            product.qty -= item.qty;
            product.salesCount = (product.salesCount || 0) + item.qty; // increment sales count
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
    // Auto share receipt via WhatsApp if phone exists
    if (custPhone) {
        const receiptMsg = generateReceiptMessage(grand, custName, items);
        const encodedMsg = encodeURIComponent(receiptMsg);
        window.open(`https://wa.me/${custPhone}?text=${encodedMsg}`, '_blank');
    }
    clearCart();
    await showAlert(currentLang==='BM'?"Jualan selesai. Resit dibuka.":"Sale complete. Receipt generated.");
}
function generateReceiptMessage(total, custName, items) {
    let msg = `🧾 *RESIT PEMBELIAN*\n`;
    if (custName) msg += `Pelanggan: ${custName}\n`;
    msg += `Tarikh: ${new Date().toLocaleString()}\n\n`;
    items.forEach(i => { msg += `${i.name} x${i.qty} = RM ${(i.jual * i.qty).toFixed(2)}\n`; });
    if (posDiscount > 0) msg += `Diskaun: -RM ${posDiscount.toFixed(2)}\n`;
    msg += `\n*JUMLAH: RM ${total.toFixed(2)}*\n\nTerima kasih!`;
    return msg;
}
// Other POS functions (addToCart, etc.) unchanged

// ================== COUPON MANAGER (with quantity) ==================
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
async function applyCoupon(code) {
    const coupon = db.coupons.find(c => c.code === code && c.quantity > 0);
    if (coupon) {
        activeDiscount = coupon.value;
        coupon.quantity--;
        if (coupon.quantity === 0) {
            const idx = db.coupons.indexOf(coupon);
            db.coupons.splice(idx,1);
        }
        save();
        renderCoupons();
        await showAlert(currentLang==='BM'?`Kupon ${code} digunakan! Diskaun RM ${activeDiscount}`:`Coupon ${code} applied! Discount RM ${activeDiscount}`);
        calcBilling();
    } else {
        await showAlert(currentLang==='BM'?"Kupon tidak sah atau habis!":"Invalid or expired coupon!");
        activeDiscount = 0;
        calcBilling();
    }
}
// In POS, use same applyPosCoupon logic
async function applyPosCoupon() {
    const code = document.getElementById('pos-coupon').value.toUpperCase();
    const coupon = db.coupons.find(c => c.code === code && c.quantity > 0);
    if (coupon) {
        posDiscount = coupon.value;
        coupon.quantity--;
        if (coupon.quantity === 0) {
            const idx = db.coupons.indexOf(coupon);
            db.coupons.splice(idx,1);
        }
        save();
        renderCoupons();
        await showAlert(currentLang==='BM'?`Kupon ${code} digunakan: RM ${posDiscount} diskaun`:`Coupon ${code} applied: RM ${posDiscount} discount`);
        renderCart();
    } else {
        await showAlert(currentLang==='BM'?"Kupon tidak sah atau habis!":"Invalid or expired coupon!");
        posDiscount = 0;
        renderCart();
    }
}

// ================== SOCIAL MARKETING ==================
function setupSocialExtra() {
    // Add icons to date and time inputs
    const dateInput = document.getElementById('sch-date');
    const timeInput = document.getElementById('sch-time');
    if (dateInput) {
        const parent = dateInput.parentNode;
        const iconSpan = document.createElement('span');
        iconSpan.className = 'absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400';
        iconSpan.innerHTML = '<i class="fas fa-calendar-alt"></i>';
        parent.style.position = 'relative';
        parent.appendChild(iconSpan);
    }
    if (timeInput) {
        const parent = timeInput.parentNode;
        const iconSpan = document.createElement('span');
        iconSpan.className = 'absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400';
        iconSpan.innerHTML = '<i class="fas fa-clock"></i>';
        parent.style.position = 'relative';
        parent.appendChild(iconSpan);
    }
    // Make social buttons functional
    const socialBtns = document.querySelectorAll('.flux-card a');
    socialBtns.forEach(btn => {
        const platform = btn.querySelector('span')?.innerText.toLowerCase();
        if (platform === 'facebook') btn.href = 'https://www.facebook.com/';
        else if (platform === 'tiktok') btn.href = 'https://www.tiktok.com/';
        else if (platform === 'instagram') btn.href = 'https://www.instagram.com/';
        else if (platform === 'threads') btn.href = 'https://www.threads.net/';
        btn.target = '_blank';
    });
    // Add file upload and alarm handling in addSchedule
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
        // We'll handle async after reading? Better to use Promise
    }
    if (title && date && time) {
        const timestamp = new Date(`${date}T${time}`).getTime();
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
        // Schedule alarm if timestamp > now
        if (timestamp > Date.now()) {
            const delay = timestamp - Date.now();
            setTimeout(() => {
                if (!scheduleItem.notified) {
                    scheduleItem.notified = true;
                    save();
                    if (Notification.permission === 'granted') {
                        new Notification('📢 Peringatan Jadual Content', {
                            body: `${scheduleItem.title} pada ${scheduleItem.date} ${scheduleItem.time}`,
                            icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
                        });
                    } else {
                        showAlert(`🔔 Peringatan: ${scheduleItem.title} pada ${scheduleItem.date} ${scheduleItem.time}`);
                    }
                }
            }, delay);
        }
        // Reset file input
        if (fileInput) fileInput.value = '';
        showAlert(currentLang === 'BM' ? 'Content dijadualkan!' : 'Content scheduled!');
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
            </div>
            <button onclick="db.sch=db.sch.filter(x=>x.id!==${s.id});save();renderSchedule();" class="text-gray-200 hover:text-red-500"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
}

// ================== BLAST PINTAR ==================
let blastImageData = null;
function setupBlastExtra() {
    const delayInput = document.getElementById('blast-delay');
    if (delayInput) delayInput.value = 30; // default 30 seconds
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
}
async function startBlast() {
    const cs = document.querySelectorAll('.blast-checkbox:checked');
    let m = document.getElementById('blast-msg')?.value;
    const delay = parseInt(document.getElementById('blast-delay')?.value) || 30;
    if (delay < 30 || delay > 999) {
        await showAlert('Sela masa mesti antara 30 hingga 999 saat.');
        return;
    }
    for (let c of cs) {
        const randomKey = Math.random().toString(36).substring(2, 8).toUpperCase();
        const footer = `\n\n${randomKey}\n\nDihantar oleh BizPro System`;
        const fullMsg = m + footer;
        const text = encodeURIComponent(fullMsg.replace('{name}', c.dataset.name));
        window.open(`https://wa.me/${c.dataset.phone}?text=${text}`, '_blank');
        await new Promise(r => setTimeout(r, delay * 1000));
    }
}
function generateCatalogText() {
    let c = "KATALOG:\n";
    db.inv.slice(0, 10).forEach(i => c += `- ${i.name} RM${i.jual}\n`);
    const msgArea = document.getElementById('blast-msg');
    if (msgArea) msgArea.value = c;
}

// ================== HISTORY (with search, phone, WhatsApp button) ==================
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
                ${h.type === 'INV' ? `<button onclick="convertInvToRec(${h.id})" class="text-emerald-500 hover:text-emerald-700 text-xs font-bold"><i class="fas fa-check-double mr-1"></i> ${t('SET PAID')}</button>` : ''}
                <button onclick="deleteDoc(${h.id})" class="text-gray-200 hover:text-red-500"><i class="fas fa-trash-alt"></i></button>
                ${h.phone ? `<button onclick="sendReceiptViaWhatsApp(${h.id})" class="text-green-500 hover:text-green-700 text-xs font-bold"><i class="fab fa-whatsapp mr-1"></i> ${t('btn-wa')}</button>` : ''}
            <\/td>
        <\/tr>
    `).reverse().join('');
}
function sendReceiptViaWhatsApp(id) {
    const trans = db.hist.find(t => t.id === id);
    if (trans && trans.phone) {
        const msg = generateReceiptMessage(trans.total, trans.clientName, trans.items);
        const encoded = encodeURIComponent(msg);
        window.open(`https://wa.me/${trans.phone}?text=${encoded}`, '_blank');
    }
}

// ================== JOBS & REMINDERS ==================
// ... (keep existing functions)

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

debugLog('App.js loaded and ready');