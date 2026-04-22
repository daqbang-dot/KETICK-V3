// ================================================
// KETICK BizPro v6 - Modul Pengebilan (Web3 Edition)
// ================================================

let billItems = [];
let currentBillingFilter = 'ALL'; // Status tab: ALL, INV, QUO, REC

// Fungsi ini dipanggil bila modul billing dibuka dari app.js
function initBilling() {
    billItems = [];
    document.getElementById('bill-type').addEventListener('change', updateBillRef);
    updateBillRef();
    renderBillItems();
    setupBillingHistory();
}

// ================== PENGURUSAN BORANG REKOD BARU ==================

function updateBillRef() {
    const type = document.getElementById('bill-type').value;
    document.getElementById('bill-ref').value = `${type}${getNextRef(type)}`;
}

function addBillItem() {
    const name = document.getElementById('bill-item-name').value.trim();
    const qty = parseFloat(document.getElementById('bill-item-qty').value) || 0;
    const price = parseFloat(document.getElementById('bill-item-price').value) || 0;

    if (!name || qty <= 0 || price < 0) {
        showAlert("Sila masukkan butiran item yang sah.");
        return;
    }

    billItems.push({ name, qty, price });
    
    // Reset input
    document.getElementById('bill-item-name').value = '';
    document.getElementById('bill-item-qty').value = '1';
    document.getElementById('bill-item-price').value = '';
    
    renderBillItems();
}

function removeBillItem(index) {
    billItems.splice(index, 1);
    renderBillItems();
}

function renderBillItems() {
    const tbody = document.getElementById('bill-item-list');
    if (!tbody) return;

    if (billItems.length === 0) {
        tbody.innerHTML = `<div class="py-6 text-center text-xs text-gray-500 uppercase tracking-widest border border-dashed border-white/10 rounded-xl">Tiada item ditambah</div>`;
        calcBill();
        return;
    }

    tbody.innerHTML = billItems.map((item, index) => {
        const total = item.qty * item.price;
        return `
        <div class="grid grid-cols-12 gap-2 items-center hover:bg-[#0B101E]/50 transition-colors group p-2 border-b border-white/5">
            <div class="col-span-5 text-gray-300 font-medium truncate">${item.name}</div>
            <div class="col-span-2 text-center text-gray-400">${item.qty}</div>
            <div class="col-span-2 text-right text-gray-400">RM ${item.price.toFixed(2)}</div>
            <div class="col-span-2 text-right font-semibold text-[#00F0FF]">RM ${total.toFixed(2)}</div>
            <div class="col-span-1 text-right">
                <button onclick="removeBillItem(${index})" class="text-red-500/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
    
    calcBill();
}

function calcBill() {
    const subtotal = billItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const discount = parseFloat(document.getElementById('bill-discount')?.value) || 0;
    const taxRate = parseFloat(document.getElementById('bill-tax')?.value) || 0;
    
    const afterDiscount = subtotal - discount;
    const taxAmount = afterDiscount * (taxRate / 100);
    const grandTotal = afterDiscount + taxAmount;

    document.getElementById('bill-subtotal').innerText = `RM ${subtotal.toFixed(2)}`;
    document.getElementById('bill-grand').innerText = `RM ${Math.max(0, grandTotal).toFixed(2)}`;
    
    return { subtotal, discount, taxAmount, grandTotal };
}

async function generateDocument(action) {
    if (billItems.length === 0) {
        await showAlert("Sila tambah sekurang-kurangnya 1 item.");
        return;
    }

    const type = document.getElementById('bill-type').value;
    const ref = document.getElementById('bill-ref').value;
    const custName = document.getElementById('bill-cust-name').value.trim();
    const custPhone = document.getElementById('bill-cust-phone').value.trim();
    const custAddr = document.getElementById('bill-cust-addr').value.trim();
    
    const totals = calcBill();

    if (action === 'save') {
        if (!custName) {
            await showAlert("Sila masukkan nama pelanggan untuk simpan dokumen.");
            return;
        }

        // Simpan ke database CRM jika pelanggan baru
        const existingCust = db.cli.find(c => c.name.toLowerCase() === custName.toLowerCase());
        if (!existingCust) {
            db.cli.push({ id: Date.now(), name: custName, phone: custPhone, addr: custAddr });
        } else {
            if(custPhone) existingCust.phone = custPhone;
            if(custAddr) existingCust.addr = custAddr;
        }

        // Simpan ke sejarah (format seragam dengan app.js)
        db.hist.push({
            id: Date.now(),
            date: new Date().toLocaleDateString('en-GB'),
            ref: ref,
            type: type,
            clientName: custName,
            phone: custPhone,
            total: totals.grandTotal,
            margin: totals.grandTotal, // Anggaran margin sementara untuk bil manual
            items: billItems.map(i => ({ name: i.name, qty: i.qty, jual: i.price, kos: 0 })), // format selaras dengan POS
            discount: totals.discount
        });

        save();
        await showAlert(`Dokumen ${ref} berjaya disimpan!`);
        
        // Reset borang
        billItems = [];
        document.getElementById('bill-cust-name').value = '';
        document.getElementById('bill-cust-phone').value = '';
        document.getElementById('bill-cust-addr').value = '';
        document.getElementById('bill-discount').value = '';
        document.getElementById('bill-tax').value = '';
        
        toggleBillingForm(); // Tutup borang
        initBilling(); // Refresh data 
        
        if(typeof renderDashboard === 'function') renderDashboard();
    } else if (action === 'preview') {
        previewHTMLDocument(type, ref, custName, custPhone, custAddr, totals);
    }
}

// ================== PAPARAN SEJARAH (KAD WEB3) ==================

function setupBillingHistory() {
    const searchInput = document.getElementById('history-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => renderBillingHistory());
    }

    // Set up tab click listeners
    const tabs = document.querySelectorAll('.flex.gap-1.overflow-x-auto button');
    tabs.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Reset semua tab
            tabs.forEach(t => {
                t.className = "px-5 py-2.5 text-xs font-semibold whitespace-nowrap bg-[#151C2C] text-gray-400 hover:text-white rounded-lg border border-white/5 hover:border-white/10 transition-colors";
            });
            // Aktifkan tab yang ditekan
            e.target.className = "px-5 py-2.5 text-xs font-bold whitespace-nowrap bg-[#00F0FF]/10 text-[#00F0FF] rounded-lg border border-[#00F0FF]/30 shadow-[0_0_10px_rgba(0,240,255,0.2)]";
            
            // Set filter category
            const text = e.target.innerText;
            if (text.includes('Invois')) currentBillingFilter = 'INV';
            else if (text.includes('Sebut Harga')) currentBillingFilter = 'QUO';
            else if (text.includes('Resit')) currentBillingFilter = 'REC';
            else currentBillingFilter = 'ALL';
            
            renderBillingHistory();
        });
    });

    renderBillingHistory(); // Initial render
}

function renderBillingHistory() {
    const container = document.getElementById('history-body');
    if (!container) return;

    let filtered = [...db.hist];
    
    // 1. Tapis ikut Tab Filter
    if (currentBillingFilter !== 'ALL') {
        filtered = filtered.filter(h => h.type === currentBillingFilter);
    }

    // 2. Tapis ikut Search Bar
    const searchTerm = document.getElementById('history-search')?.value.toLowerCase() || '';
    if (searchTerm) {
        filtered = filtered.filter(h => 
            h.clientName?.toLowerCase().includes(searchTerm) ||
            h.ref?.toLowerCase().includes(searchTerm) ||
            h.phone?.toLowerCase().includes(searchTerm)
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-20 text-gray-500 font-semibold border border-dashed border-white/10 rounded-2xl">Tiada dokumen dijumpai untuk kategori ini.</div>`;
        return;
    }

    // Render kad Web3
    container.innerHTML = filtered.map(h => {
        // Warna tema ikut jenis dokumen
        let badgeColor = h.type === 'REC' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30' : (h.type === 'INV' ? 'bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]/30' : 'bg-[#B981FF]/10 text-[#B981FF] border-[#B981FF]/30');
        let hoverBorder = h.type === 'REC' ? 'hover:border-[#10B981]/50' : (h.type === 'INV' ? 'hover:border-[#00F0FF]/50' : 'hover:border-[#B981FF]/50');
        let amountColor = h.type === 'REC' ? 'text-[#CCFF00] drop-shadow-[0_0_8px_rgba(204,255,0,0.3)]' : 'text-white';

        return `
        <div class="bg-[#151C2C] border border-white/5 rounded-2xl p-6 shadow-lg ${hoverBorder} transition-all flex flex-col gap-4 group">
            <div class="flex justify-between items-start gap-2">
                <div class="flex items-center gap-3">
                    <span class="${badgeColor} px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest">${h.type}</span>
                    <span class="text-gray-300 font-mono text-xs">${h.ref}</span>
                </div>
                <span class="text-[10px] text-gray-500 font-medium">${h.date}</span>
            </div>
            
            <div class="flex-1">
                <h4 class="font-bold text-white text-lg mb-1 group-hover:text-white transition-colors line-clamp-1">${h.clientName || 'Pelanggan Walk-in'}</h4>
                <p class="text-xs text-gray-400 flex items-start gap-2"><i class="fas fa-phone-alt mt-0.5 text-[#B981FF]"></i> <span>${h.phone || '-'}</span></p>
            </div>
            
            <div class="flex justify-between items-center border-t border-white/5 pt-4">
                <span class="text-2xl font-bold ${amountColor}">RM ${h.total.toFixed(2)}</span>
                <div class="flex gap-3">
                    ${h.type === 'INV' ? `<button onclick="convertInvToRec(${h.id})" title="Tukar ke Resit" class="text-gray-500 hover:text-[#10B981] transition"><i class="fas fa-check-double"></i></button>` : ''}
                    <button onclick="viewDocument(${JSON.stringify(h).replace(/"/g, '&quot;')})" title="Lihat" class="text-gray-500 hover:text-[#00F0FF] transition"><i class="fas fa-eye"></i></button>
                    <button onclick="deleteDoc(${h.id})" title="Padam" class="text-gray-500 hover:text-red-400 transition"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
        </div>`;
    }).reverse().join('');
}

// Fungsi untuk preview PDF yang dipanggil dari borang
function previewHTMLDocument(type, ref, name, phone, addr, totals) {
    const bizName = db.prof.name || "SYARIKAT ANDA";
    const bizAddr = db.prof.addr || "";
    const date = new Date().toLocaleDateString('en-GB');
    const typeName = type === 'INV' ? 'INVOIS' : (type === 'QUO' ? 'SEBUT HARGA' : 'RESIT KAMI');

    let itemsHtml = billItems.map(item => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px 0;">${item.name}</td>
            <td style="padding: 8px 0; text-align: center;">${item.qty}</td>
            <td style="padding: 8px 0; text-align: right;">RM${item.price.toFixed(2)}</td>
            <td style="padding: 8px 0; text-align: right;">RM${(item.qty * item.price).toFixed(2)}</td>
        </tr>
    `).join('');

    const html = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
            <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px;">
                <h1 style="margin:0; font-size: 24px;">${bizName}</h1>
                <p style="margin:5px 0; font-size: 12px; color: #666; white-space: pre-wrap;">${bizAddr}</p>
                <h2 style="margin: 15px 0 0 0; color: #2563eb; letter-spacing: 2px;">${typeName}</h2>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px;">
                <div>
                    <strong>Kepada:</strong><br>
                    ${name || 'Pelanggan Tunai'}<br>
                    ${phone ? phone + '<br>' : ''}
                    ${addr ? addr : ''}
                </div>
                <div style="text-align: right;">
                    <strong>No. Rujukan:</strong> ${ref}<br>
                    <strong>Tarikh:</strong> ${date}
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
                <thead>
                    <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                        <th style="padding: 10px 0; text-align: left;">Perkara</th>
                        <th style="padding: 10px 0; text-align: center;">Kuantiti</th>
                        <th style="padding: 10px 0; text-align: right;">Harga</th>
                        <th style="padding: 10px 0; text-align: right;">Jumlah</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <div style="display: flex; justify-content: flex-end; font-size: 14px;">
                <table style="width: 300px;">
                    <tr><td style="padding: 5px 0;">Subtotal:</td><td style="text-align: right;">RM ${totals.subtotal.toFixed(2)}</td></tr>
                    ${totals.discount > 0 ? `<tr><td style="padding: 5px 0; color: red;">Diskaun:</td><td style="text-align: right; color: red;">- RM ${totals.discount.toFixed(2)}</td></tr>` : ''}
                    ${totals.taxAmount > 0 ? `<tr><td style="padding: 5px 0;">Cukai:</td><td style="text-align: right;">RM ${totals.taxAmount.toFixed(2)}</td></tr>` : ''}
                    <tr style="font-size: 18px; font-weight: bold; border-top: 2px solid #333;"><td style="padding: 10px 0;">Jumlah Besar:</td><td style="text-align: right; color: #2563eb;">RM ${totals.grandTotal.toFixed(2)}</td></tr>
                </table>
            </div>
            
            <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px;">
                Terima kasih kerana berurusan dengan kami!<br>
                Ini adalah dokumen janaan komputer, tandatangan tidak diperlukan.
            </div>
        </div>
    `;

    document.getElementById('reviewDocContent').innerHTML = html;
    document.getElementById('reviewModal').classList.remove('hidden');
}

async function deleteDoc(id) { 
    const confirmed = await showConfirm("Padam dokumen ini?"); 
    if(confirmed) { 
        db.hist = db.hist.filter(h => h.id !== id); 
        save(); 
        renderBillingHistory(); 
    } 
}
