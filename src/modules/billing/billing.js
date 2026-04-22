// ================================================
// KETICK BizPro v6 - Modul Pengebilan (Web3 Edition)
// ================================================

let billItems = [];

// Fungsi ini dipanggil bila modul billing dibuka dari app.js
function initBilling() {
    billItems = [];
    document.getElementById('bill-type').addEventListener('change', updateBillRef);
    updateBillRef();
    renderBillItems();
}

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
        tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-xs text-gray-500 uppercase tracking-widest">Tiada item ditambah</td></tr>`;
        calcBill();
        return;
    }

    tbody.innerHTML = billItems.map((item, index) => {
        const total = item.qty * item.price;
        return `
        <tr class="hover:bg-[#0B101E]/50 transition-colors group">
            <td class="py-3 text-gray-300 font-medium">${item.name}</td>
            <td class="py-3 text-center text-gray-400">${item.qty}</td>
            <td class="py-3 text-right text-gray-400">RM ${item.price.toFixed(2)}</td>
            <td class="py-3 text-right font-semibold text-[#00F0FF]">RM ${total.toFixed(2)}</td>
            <td class="py-3 text-right">
                <button onclick="removeBillItem(${index})" class="text-red-500/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
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

        // Simpan ke sejarah
        db.hist.push({
            id: Date.now(),
            date: new Date().toLocaleDateString('en-GB'),
            ref: ref,
            type: type,
            clientName: custName,
            phone: custPhone,
            total: totals.grandTotal,
            margin: totals.grandTotal, // Anggaran margin penuh untuk bil manual (boleh adjust nanti)
            items: [...billItems],
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
        initBilling(); 
        
        if(typeof renderHistory === 'function') renderHistory();
        if(typeof renderDashboard === 'function') renderDashboard();
    } else if (action === 'preview') {
        // Tunjukkan resit/invois
        previewHTMLDocument(type, ref, custName, custPhone, custAddr, totals);
    }
}

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
