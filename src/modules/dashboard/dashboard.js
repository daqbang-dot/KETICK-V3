// ================================================
// KETICK BizPro v6 - Modul Dashboard
// ================================================

let dashChartInstance = null; // Simpan rujukan graf supaya boleh di-reset

function renderDashboard() { 
    // 1. Kira-kira utama
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

    // 2. Papar Aktiviti Terkini (5 dokumen terakhir)
    const recentList = document.getElementById('recent-activity-list');
    if (recentList) {
        if (db.hist.length === 0) {
            recentList.innerHTML = `<p class="text-xs text-gray-400 italic text-center py-6">Tiada rekod transaksi.</p>`;
        } else {
            const recents = [...db.hist].reverse().slice(0, 5);
            recentList.innerHTML = recents.map(h => {
                let badgeColor = h.type === 'REC' ? 'bg-emerald-100 text-emerald-600' : (h.type === 'INV' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600');
                let icon = h.type === 'REC' ? 'fa-check-circle' : (h.type === 'INV' ? 'fa-file-invoice' : 'fa-file-alt');
                return `
                <div class="flex justify-between items-center p-3 bg-white/50 dark:bg-black/30 rounded-xl border border-gray-100 dark:border-gray-700 backdrop-blur-sm mb-2">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full ${badgeColor} flex items-center justify-center text-xs"><i class="fas ${icon}"></i></div>
                        <div>
                            <p class="text-xs font-bold text-gray-800 dark:text-gray-200 line-clamp-1">${h.clientName || 'POS'}</p>
                            <p class="text-[9px] text-gray-500 uppercase">${h.ref} • ${h.date}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-xs font-black text-gray-800 dark:text-white">RM${h.total.toFixed(2)}</p>
                    </div>
                </div>`;
            }).join('');
        }
    }

    // 3. Janaan Graf Chart.js (Prestasi 7 Transaksi Terakhir)
    const ctx = document.getElementById('dashboardChart');
    if (ctx) {
        if (dashChartInstance) dashChartInstance.destroy();

        const chartData = [...db.hist].slice(-7); 
        const labels = chartData.map(h => h.ref);
        const totals = chartData.map(h => h.total);
        
        let textColor = isDarkTheme ? '#d1d5db' : '#6b7280';
        let gridColor = isDarkTheme ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

        dashChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.length ? labels : ['Tiada Data'],
                datasets: [{
                    label: 'Nilai Dokumen (RM)',
                    data: totals.length ? totals : [0],
                    borderColor: '#2563eb', 
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 3,
                    tension: 0.4, 
                    fill: true,
                    pointBackgroundColor: '#2563eb',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, cornerRadius: 8, displayColors: false }
                },
                scales: {
                    x: { ticks: { font: { size: 10 }, color: textColor }, grid: { display: false } },
                    y: { beginAtZero: true, ticks: { font: { size: 10 }, color: textColor }, grid: { color: gridColor } }
                }
            }
        });
    }
}
