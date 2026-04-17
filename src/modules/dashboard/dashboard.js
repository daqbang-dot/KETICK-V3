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
                // Tentukan warna dan ikon berdasarkan jenis dokumen
                let badgeColor = h.type === 'REC' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20' : (h.type === 'INV' ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20');
                let dotColor = h.type === 'REC' ? 'bg-[#10B981]' : (h.type === 'INV' ? 'bg-[#F59E0B]' : 'bg-gray-400');
                let statusText = h.type === 'REC' ? 'Completed' : (h.type === 'INV' ? 'Pending' : 'Draft');
                let amountColor = h.type === 'REC' ? 'text-[#CCFF00]' : 'text-white';
                let sign = h.type === 'REC' ? '+' : '';

                return `
                <tr class="hover:bg-[#0B101E]/50 transition-colors">
                    <td class="py-4 text-xs font-mono text-gray-300">${h.ref}</td>
                    <td class="py-4 text-xs text-gray-400 line-clamp-1">${h.clientName || 'POS Walk-in'}</td>
                    <td class="py-4">
                        <span class="${badgeColor} border px-2 py-1 rounded-md text-[10px] flex items-center w-max gap-1.5">
                            <div class="w-1.5 h-1.5 rounded-full ${dotColor}"></div> ${statusText}
                        </span>
                    </td>
                    <td class="py-4 text-xs text-gray-400">${h.date}</td>
                    <td class="py-4 text-xs font-semibold ${amountColor} text-right">${sign} RM${h.total.toFixed(2)}</td>
                </tr>`;
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
