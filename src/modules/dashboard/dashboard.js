// ================================================
// KETICK BizPro v6 - Modul Dashboard (Web3 Edition)
// ================================================

let dashChartInstance = null;

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
    
    const dashMarginSmall = document.getElementById('dash-margin-small');
    if(dashMarginSmall) dashMarginSmall.innerText = `RM ${totalMargin.toFixed(2)}`;

    const dashTaxExp = document.getElementById('dash-tax-expense'); 
    if(dashTaxExp) dashTaxExp.innerText = `RM ${totalTax.toFixed(2)}`; 
    
    const dashInvCount = document.getElementById('dash-inv-count'); 
    if(dashInvCount) dashInvCount.innerText = `${db.inv.length}`; 
    
    // 2. Papar Aktiviti Terkini (Bentuk Table Baris)
    const recentList = document.getElementById('recent-activity-list');
    if (recentList) {
        if (db.hist.length === 0) {
            recentList.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-xs text-gray-500">Tiada rekod transaksi dijumpai.</td></tr>`;
        } else {
            const recents = [...db.hist].reverse().slice(0, 5);
            recentList.innerHTML = recents.map(h => {
                let badgeColor = h.type === 'REC' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20' : (h.type === 'INV' ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20');
                let dotColor = h.type === 'REC' ? 'bg-[#10B981]' : (h.type === 'INV' ? 'bg-[#F59E0B]' : 'bg-gray-400');
                let statusText = h.type === 'REC' ? 'Completed' : (h.type === 'INV' ? 'Pending' : 'Draft');
                let amountColor = h.type === 'REC' ? 'text-[#CCFF00]' : 'text-white';
                let sign = h.type === 'REC' ? '+' : '';

                return `
                <tr class="hover:bg-[#0B101E]/50 transition-colors">
                    <td class="py-4 pr-4 text-xs font-mono text-gray-300 w-32">${h.ref} <i class="fas fa-copy text-gray-600 ml-2 hover:text-white cursor-pointer"></i></td>
                    <td class="py-4 pr-4 text-xs text-gray-400 truncate max-w-[120px]">${h.clientName || 'POS Walk-in'}</td>
                    <td class="py-4 pr-4">
                        <span class="${badgeColor} border px-2 py-1 rounded-md text-[10px] flex items-center w-max gap-1.5">
                            <div class="w-1.5 h-1.5 rounded-full ${dotColor} shadow-[0_0_5px_${dotColor.replace('bg-','')}]"></div> ${statusText}
                        </span>
                    </td>
                    <td class="py-4 pr-4 text-xs text-gray-400 w-24">${h.date}</td>
                    <td class="py-4 text-xs font-semibold ${amountColor} text-right">${sign} RM${h.total.toFixed(2)}</td>
                </tr>`;
            }).join('');
        }
    }

    // 3. Janaan Graf Chart.js (Neon Style)
    const ctx = document.getElementById('dashboardChart');
    if (ctx) {
        if (dashChartInstance) dashChartInstance.destroy();

        const chartData = [...db.hist].slice(-7); 
        const labels = chartData.map(h => h.ref);
        const totals = chartData.map(h => h.total);

        dashChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.length ? labels : ['Tiada Data'],
                datasets: [{
                    label: 'Nilai Dokumen (RM)',
                    data: totals.length ? totals : [0],
                    borderColor: '#00F0FF', // Neon Cyan
                    backgroundColor: 'rgba(0, 240, 255, 0.1)',
                    borderWidth: 3,
                    tension: 0.4, 
                    fill: true,
                    pointBackgroundColor: '#CCFF00', // Lime Green
                    pointBorderColor: '#0B101E',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { backgroundColor: 'rgba(11, 16, 30, 0.9)', padding: 10, cornerRadius: 8, displayColors: false, titleFont: {family: 'Inter'}, bodyFont: {family: 'Inter'} }
                },
                scales: {
                    x: { ticks: { font: { family: 'Inter', size: 10 }, color: '#6b7280' }, grid: { display: false } },
                    y: { beginAtZero: true, ticks: { font: { family: 'Inter', size: 10 }, color: '#6b7280' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }
}
