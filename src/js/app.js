<div class="max-w-6xl mx-auto">
    <h2 class="text-3xl font-black mb-6" data-i18n="report-title">Laporan Sistem</h2>
    <p class="text-gray-500 mb-8" data-i18n="report-subtitle">Pilih jenis laporan dan muat turun dalam format PDF.</p>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div class="flux-card p-6 hover:shadow-lg transition">
            <div class="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center mb-4"><i class="fas fa-boxes text-amber-600 text-xl"></i></div>
            <h3 class="font-bold text-xl mb-2" data-i18n="report-inv-title">Laporan Inventori</h3>
            <p class="text-gray-500 text-sm mb-4" data-i18n="report-inv-desc">Senarai semua produk, kuantiti, harga kos & jualan.</p>
            <button id="report-inventory-btn" class="w-full bg-amber-500 text-white py-2 rounded-xl font-bold hover:bg-amber-600 transition"><i class="fas fa-file-pdf mr-2"></i> <span data-i18n="btn-download">Muat Turun PDF</span></button>
        </div>
        <div class="flux-card p-6 hover:shadow-lg transition">
            <div class="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4"><i class="fas fa-user-friends text-indigo-600 text-xl"></i></div>
            <h3 class="font-bold text-xl mb-2" data-i18n="report-crm-title">Laporan Pelanggan (CRM)</h3>
            <p class="text-gray-500 text-sm mb-4" data-i18n="report-crm-desc">Senarai pelanggan, nombor telefon, dan alamat.</p>
            <button id="report-crm-btn" class="w-full bg-indigo-500 text-white py-2 rounded-xl font-bold hover:bg-indigo-600 transition"><i class="fas fa-file-pdf mr-2"></i> <span data-i18n="btn-download">Muat Turun PDF</span></button>
        </div>
        <div class="flux-card p-6 hover:shadow-lg transition">
            <div class="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center mb-4"><i class="fas fa-file-invoice-dollar text-orange-600 text-xl"></i></div>
            <h3 class="font-bold text-xl mb-2" data-i18n="report-lhdn-title">Laporan Cukai (LHDN)</h3>
            <p class="text-gray-500 text-sm mb-4" data-i18n="report-lhdn-desc">Rekod perbelanjaan, kategori, vendor, dan jumlah.</p>
            <button id="report-lhdn-btn" class="w-full bg-orange-500 text-white py-2 rounded-xl font-bold hover:bg-orange-600 transition"><i class="fas fa-file-pdf mr-2"></i> <span data-i18n="btn-download">Muat Turun PDF</span></button>
        </div>
    </div>

    <div class="flux-card p-6">
        <h3 class="font-bold text-lg mb-4" data-i18n="report-preview">Pratonton Data (10 rekod terakhir)</h3>
        <div id="report-preview" class="overflow-x-auto"><p class="text-gray-400 text-center py-8">Pilih jenis laporan untuk pratonton.</p></div>
    </div>
</div>