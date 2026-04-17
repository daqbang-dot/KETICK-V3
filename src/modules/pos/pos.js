// ================================================
// KETICK BizPro v6 - Modul Mini POS (Web3 Edition)
// ================================================

function renderProductGrid() {
    const searchTerm = (document.getElementById('pos-search')?.value || '').toLowerCase();
    let filtered = db.inv.filter(p => p.name.toLowerCase().includes(searchTerm));
    const sorted = [...filtered].sort((a,b) => (b.salesCount || 0) - (a.salesCount || 0));
    const top4 = sorted.slice(0,4);
    const others = sorted.slice(4);
    const container = document.getElementById('product-grid');
    if (!container) return;
    
    let html = '';
    // Pastikan grid responsif: 2 kolum di phone, 3 atau 4 di tablet/PC
    if (top4.length) {
        html += `<div class="col-span-full text-xs font-semibold text-[#CCFF00] mb-2 flex items-center gap-2"><i class="fas fa-fire"></i> Best Seller</div><div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">`;
        html += top4.map(p => productCard(p)).join('');
        html += `</div>`;
    }
    if (others.length) {
        html += `<div class="col-span-full text-xs font-semibold text-gray-400 mt-2 mb-2 flex items-center gap-2"><i class="fas fa-box"></i> Semua Produk</div><div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">`;
        html += others.map(p => productCard(p)).join('');
        html += `</div>`;
    }
    container.innerHTML = html;
}

function productCard(p) {
    const lowIds = getLowStockItems().map(i => i.id);
    const isLow = lowIds.includes(p.id);
    const borderStyle = isLow ? 'border-red-500/50' : 'border-white/5 hover:border-[#00F0FF]/50';
    
    return `<div class="bg-[#151C2C] border ${borderStyle} rounded-xl p-3 shadow-lg hover:shadow-[0_0_15px_rgba(0,240,255,0.15)] transition-all cursor-pointer flex flex-col items-center text-center group" onclick="addToCart(${p.id})">
        <div class="w-16 h-16 rounded-lg bg-[#0B101E] flex justify-center items-center mb-2 overflow-hidden border border-white/5 group-hover:border-[#00F0FF]/30 transition-colors">
            ${p.img ? `<img src="${p.img}" class="w-full h-full object-cover">` : `<i class="fas fa-cube text-gray-600 text-2xl group-hover:text-[#00F0FF] transition-colors"></i>`}
        </div>
        <div class="font-semibold text-xs text-gray-300 line-clamp-2 w-full mb-1 group-hover:text-white transition-colors">${p.name}</div>
        <div class="text-[#CCFF00] font-bold text-sm mt-auto">RM ${p.jual.toFixed(2)}</div>
        <div class="text-[9px] text-gray-500 uppercase tracking-widest mt-1 ${isLow ? 'text-red-400' : ''}">Stok: ${p.qty}</div>
    </div>`;
}

function setupPosExtra() {}

async function addToCart(productId) { 
    const product = db.inv.find(p => p.id === productId); 
    if (!product) return; 
    if (product.qty <= 0) { await showAlert("Stok habis!"); return; } 
    const existing = cart.find(i => i.id === productId); 
    if (existing) { 
        if (existing.qty + 1 > product.qty) { await showAlert("Stok tidak mencukupi"); return; } 
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
    else if (product && newQty > product.qty) { await showAlert("Stok tidak mencukupi"); return; } 
    else { cart[idx].qty = newQty; } 
    renderCart(); 
}

function removeCartItem(id) { cart = cart.filter(i => i.id !== id); renderCart(); }

function renderCart() { 
    const container = document.getElementById('cart-items'); 
    if (!container) return; 
    if (cart.length === 0) { 
        container.innerHTML = `<div class="text-center text-gray-500 py-10 flex flex-col items-center justify-center gap-2"><i class="fas fa-shopping-cart text-3xl mb-1 opacity-20"></i><span class="text-xs font-semibold uppercase tracking-widest">Keranjang Kosong</span></div>`; 
        document.getElementById('cart-total').innerText = 'RM 0.00'; 
        document.getElementById('cart-grand').innerText = 'RM 0.00'; 
        document.getElementById('discount-row').style.display = 'none'; 
        calculateChange(); return; 
    } 
    let total = 0; 
    container.innerHTML = cart.map(item => { 
        const lineTotal = item.price * item.qty; total += lineTotal; 
        return `
        <div class="bg-[#0B101E] border border-white/5 p-2 rounded-lg flex justify-between items-center group">
            <div class="flex-1 pr-2">
                <span class="font-semibold text-[11px] text-gray-300 line-clamp-1">${item.name}</span>
                <div class="text-[9px] text-[#00F0FF]">RM ${item.price.toFixed(2)} /unit</div>
            </div>
            <div class="flex items-center gap-2">
                <div class="flex items-center bg-[#151C2C] border border-white/10 rounded-md">
                    <button onclick="updateCartQty(${item.id}, -1)" class="w-6 h-6 text-gray-400 hover:text-white transition">-</button>
                    <span class="w-6 text-center text-xs font-bold text-white">${item.qty}</span>
                    <button onclick="updateCartQty(${item.id}, 1)" class="w-6 h-6 text-gray-400 hover:text-white transition">+</button>
                </div>
                <div class="font-bold text-xs text-[#CCFF00] w-14 text-right">RM ${lineTotal.toFixed(2)}</div>
                <button onclick="removeCartItem(${item.id})" class="text-red-500/50 hover:text-red-400 ml-1"><i class="fas fa-times"></i></button>
            </div>
        </div>`; 
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

function setQuickCash(amount) {
    const input = document.getElementById('cash-paid');
    const grandText = document.getElementById('cart-grand').innerText;
    const grandValue = parseFloat(grandText.replace('RM ', '').replace(',', '')) || 0;
    if (amount === 'exact') {
        input.value = grandValue.toFixed(2);
    } else {
        input.value = parseFloat(amount).toFixed(2);
    }
    calculateChange();
}

function clearCart() { cart = []; posDiscount = 0; document.getElementById('pos-coupon').value = ''; renderCart(); document.getElementById('cash-paid').value = ''; calculateChange(); }

async function applyPosCoupon() { 
    const code = document.getElementById('pos-coupon').value.toUpperCase(); 
    const coupon = db.coupons.find(c => c.code === code && c.quantity > 0); 
    if (coupon) { 
        posDiscount = coupon.value; 
        coupon.quantity--; 
        if (coupon.quantity === 0) { const idx = db.coupons.indexOf(coupon); db.coupons.splice(idx,1); } 
        save(); 
        if(typeof renderCoupons === 'function') renderCoupons(); 
        await showAlert(`Kupon ${code} digunakan: RM ${posDiscount} diskaun`); 
        renderCart(); 
    } else { 
        await showAlert("Kupon tidak sah atau habis!"); 
        posDiscount = 0; renderCart(); 
    } 
}

async function completeSale() { 
    if (cart.length === 0) { await showAlert("Keranjang kosong"); return; } 
    const total = cart.reduce((sum, i) => sum + (i.price * i.qty), 0); 
    const grand = total - posDiscount; 
    const cash = parseFloat(document.getElementById('cash-paid')?.value) || 0; 
    if (cash < grand) { await showAlert("Tunai tidak mencukupi"); return; } 
    const custName = document.getElementById('pos-cust-name').value.trim(); 
    const custPhone = document.getElementById('pos-cust-phone').value.trim(); 
    if (custName) { 
        const existing = db.cli.find(c => c.name.toLowerCase() === custName.toLowerCase()); 
        if (!existing) { db.cli.push({ id: Date.now(), name: custName, phone: custPhone, addr: '' }); save(); if(typeof renderCRM === 'function') renderCRM(); } 
        else if (custPhone && existing.phone !== custPhone) { existing.phone = custPhone; save(); if(typeof renderCRM === 'function') renderCRM(); } 
    } 
    let margin = 0; const items = []; const previousLowIds = getLowStockItems().map(i => i.id); 
    for (let item of cart) { 
        const product = db.inv.find(p => p.id === item.id); 
        if (product) { 
            if (product.qty < item.qty) { await showAlert(`Stok ${product.name} tidak mencukupi`); return; } 
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
    if(typeof renderInventory === 'function') renderInventory(); 
    if(typeof renderDashboard === 'function') renderDashboard(); 
    
    const change = cash - grand; 
    printReceiptNow(grand, cash, change, custName, custPhone); 
    if (custPhone) { 
        const receiptMsg = generateReceiptMessage(grand, custName, items); 
        const encodedMsg = encodeURIComponent(receiptMsg); 
        window.open(`https://wa.me/${custPhone}?text=${encodedMsg}`, '_blank'); 
    } 
    clearCart(); 
    await showAlert("Jualan selesai. Resit dibuka."); 
}

async function printReceipt() { 
    if (cart.length === 0) { await showAlert("Tiada item dalam keranjang"); return; } 
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
    cart.forEach(item => { itemsHtml += `<div style="display:flex; justify-content:space-between; margin-bottom: 4px;"><span>${item.name} <span style="color:#666;font-size:10px;">x${item.qty}</span></span><span>RM ${(item.price * item.qty).toFixed(2)}</span></div>`; }); 
    const receiptHtml = `<div style="width: 300px; margin:0 auto; font-family: monospace; padding: 16px; border: 1px solid #ccc; border-radius: 12px;"><div style="text-align: center; font-weight: bold; font-size: 16px;">${bizName}</div><div style="text-align: center; font-size: 10px;">${bizAddr}</div><div style="text-align: center; font-size: 10px;">${date}</div>${custName ? `<div style="margin-top:8px;">Pelanggan: ${custName} ${custPhone ? `(${custPhone})` : ''}</div>` : ''}<hr style="margin: 8px 0; border:1px dashed #ccc;">${itemsHtml}${posDiscount > 0 ? `<div style="display:flex; justify-content:space-between; color:red;"><span>Diskaun</span><span>- RM ${posDiscount.toFixed(2)}</span></div>` : ''}<hr style="margin: 8px 0; border:1px dashed #ccc;"><div style="display:flex; justify-content:space-between;"><strong>JUMLAH</strong><strong>RM ${total.toFixed(2)}</strong></div><div style="display:flex; justify-content:space-between;">TUNAI: RM ${cash.toFixed(2)}</div><div style="display:flex; justify-content:space-between;">BAKI: RM ${change >= 0 ? change.toFixed(2) : '0.00'}</div><hr style="margin: 8px 0; border:1px dashed #ccc;"><div style="text-align: center; font-size: 10px;">Terima kasih! Sila datang lagi.</div></div>`; 
    const printWindow = window.open('', '_blank'); 
    printWindow.document.write(`<html><head><title>Resit POS</title><style>body { display: flex; justify-content: center; align-items: center; min-height: 100vh; margin:0; }</style></head><body>${receiptHtml}<script>window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 500); };<\/script></body></html>`); 
    printWindow.document.close(); 
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
