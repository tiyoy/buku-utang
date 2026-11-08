/* ===================================================
   UtangKu Simpel - Simple Everyday Logic Engine
   Pure ES6+ JavaScript - Fresh 0 Transaction Start
   =================================================== */

document.addEventListener('DOMContentLoaded', () => {
  
  const STORAGE_KEY = 'utangku_simple_db_v2';

  let transactions = [];
  let currentFilter = 'all';
  let searchQuery = '';
  let activeWaTx = null;

  // Sample Data (Only loaded when user clicks "Contoh Data" button)
  const DEMO_SAMPLE_DATA = [
    {
      id: 'tx_1',
      name: 'Budi Santoso',
      phone: '081234567890',
      type: 'piutang',
      amount: 500000,
      date: '2026-09-01',
      dueDate: '2026-09-20',
      category: 'Pribadi',
      notes: 'Pinjam modal usaha',
      payments: [
        { id: 'p_1', amount: 200000, date: '2026-09-08', note: 'Transfer BCA' }
      ],
      createdAt: Date.now() - 864000000
    },
    {
      id: 'tx_2',
      name: 'Toko Sembako Jaya',
      phone: '081987654321',
      type: 'hutang',
      amount: 350000,
      date: '2026-09-05',
      dueDate: '2026-09-25',
      category: 'Belanja',
      notes: 'Beli stok barang warung',
      payments: [],
      createdAt: Date.now() - 500000000
    }
  ];

  // DOM Elements
  const elements = {
    navButtons: document.querySelectorAll('[data-view]'),
    views: document.querySelectorAll('.view-section'),
    
    totalPiutang: document.getElementById('metric-total-piutang'),
    totalHutang: document.getElementById('metric-total-hutang'),
    saldoBersih: document.getElementById('metric-saldo-bersih'),
    alertBannerContainer: document.getElementById('alert-banner-container'),
    
    transactionList: document.getElementById('transaction-list'),
    transactionCount: document.getElementById('transaction-count'),
    contactList: document.getElementById('contact-list'),
    contactCount: document.getElementById('contact-count'),
    
    searchInput: document.getElementById('search-input'),
    filterPills: document.querySelectorAll('.pill-btn'),
    
    btnOpenBackup: document.getElementById('btn-open-backup'),
    btnQuickSample: document.getElementById('btn-quick-sample'),
    btnFabAdd: document.getElementById('btn-fab-add'),
    btnInstallPwa: document.getElementById('btn-install-pwa'),
    
    modalTransaction: document.getElementById('modal-transaction'),
    formTransaction: document.getElementById('form-transaction'),
    modalTxTitle: document.getElementById('modal-tx-title'),
    txId: document.getElementById('tx-id'),
    txName: document.getElementById('tx-name'),
    txPhone: document.getElementById('tx-phone'),
    txAmount: document.getElementById('tx-amount'),
    txDate: document.getElementById('tx-date'),
    txDue: document.getElementById('tx-due'),
    txCategory: document.getElementById('tx-category'),
    txNotes: document.getElementById('tx-notes'),
    typeButtons: document.querySelectorAll('.type-btn'),
    quickAmountButtons: document.querySelectorAll('.tag-btn[data-add]'),
    
    modalPayment: document.getElementById('modal-payment'),
    formPayment: document.getElementById('form-payment'),
    paymentSummaryBox: document.getElementById('payment-summary-box'),
    payTxId: document.getElementById('pay-tx-id'),
    payAmount: document.getElementById('pay-amount'),
    payDate: document.getElementById('pay-date'),
    payNote: document.getElementById('pay-note'),
    btnPayFull: document.getElementById('btn-pay-full'),
    
    modalWa: document.getElementById('modal-wa'),
    waTemplateType: document.getElementById('wa-template-type'),
    waPreviewText: document.getElementById('wa-preview-text'),
    btnSendWaNow: document.getElementById('btn-send-wa-now'),
    
    modalReceipt: document.getElementById('modal-receipt'),
    receiptCardContainer: document.getElementById('receipt-card-container'),
    btnCopyReceipt: document.getElementById('btn-copy-receipt'),
    
    btnExportJson: document.getElementById('btn-export-json'),
    btnExportCsv: document.getElementById('btn-export-csv'),
    inputImportJson: document.getElementById('input-import-json'),
    btnResetData: document.getElementById('btn-reset-data'),
    
    toastContainer: document.getElementById('toast-container')
  };

  /* ===================================================
     UTILITIES
     =================================================== */

  function formatIDR(amount) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  function formatThousandsInput(value) {
    if (value === null || value === undefined) return '';
    const rawNumber = value.toString().replace(/\D/g, '');
    if (!rawNumber) return '';
    return new Intl.NumberFormat('id-ID').format(Number(rawNumber));
  }

  function parseFormattedInput(value) {
    if (!value) return 0;
    const raw = value.toString().replace(/\./g, '').replace(/\D/g, '');
    return Number(raw) || 0;
  }

  function formatDateID(dateString) {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  function formatDateShort(dateString) {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }

  function formatShortIDR(amount) {
    amount = Number(amount) || 0;
    if (amount < 1000) return String(amount);
    if (amount >= 1000000) {
      const jt = amount / 1000000;
      return (Number.isInteger(jt) ? jt : jt.toLocaleString('id-ID', { maximumFractionDigits: 1 })) + 'jt';
    }
    return Math.round(amount / 1000) + 'rb';
  }

  function getDueStatus(dueDateString, isPaidOff) {
    if (isPaidOff || !dueDateString) {
      return { text: 'Sudah Lunas', class: '', icon: 'ri-checkbox-circle-fill' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDateString);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `Terlambat ${Math.abs(diffDays)} Hari! 🔥`,
        class: 'overdue',
        icon: 'ri-error-warning-fill'
      };
    } else if (diffDays === 0) {
      return {
        text: 'Harus Lunas HARI INI ⚠️',
        class: 'today',
        icon: 'ri-alarm-warning-fill'
      };
    } else {
      return {
        text: `Target: ${formatDateID(dueDateString)}`,
        class: '',
        icon: 'ri-calendar-line'
      };
    }
  }

  function getPaidTotal(tx) {
    if (!tx.payments || !Array.isArray(tx.payments)) return 0;
    return tx.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }

  // Riwayat pinjaman dengan nama sama yang digabung. Data lama (belum punya riwayat)
  // otomatis dianggap satu pinjaman dari field utama.
  function getLoans(tx) {
    if (Array.isArray(tx.loans) && tx.loans.length > 0) return tx.loans;
    return [{ id: null, amount: tx.amount, date: tx.date, notes: tx.notes || null }];
  }

  function generateId(prefix = 'tx') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="ri-information-fill"></i> <span>${message}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  /* ===================================================
     DATA PERSISTENCE (START FRESH FROM 0 TRANSACTIONS)
     =================================================== */

  function loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        transactions = JSON.parse(stored);
      } else {
        // Start completely clean with 0 transactions!
        transactions = [];
        saveData();
      }
    } catch (e) {
      transactions = [];
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (e) {
      showToast('Gagal menyimpan data!', 'error');
    }
  }

  /* ===================================================
     METRICS CALCULATOR
     =================================================== */

  function updateMetrics() {
    let totalPiutang = 0;
    let totalHutang = 0;
    let overdueCount = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    transactions.forEach(tx => {
      const paid = getPaidTotal(tx);
      const remaining = Math.max(0, tx.amount - paid);
      
      if (remaining > 0) {
        if (tx.type === 'piutang') {
          totalPiutang += remaining;
        } else {
          totalHutang += remaining;
        }

        if (tx.dueDate && tx.dueDate <= todayStr) {
          overdueCount++;
        }
      }
    });

    const saldoBersih = totalPiutang - totalHutang;

    elements.totalPiutang.textContent = formatIDR(totalPiutang);
    elements.totalHutang.textContent = formatIDR(totalHutang);
    elements.saldoBersih.textContent = formatIDR(saldoBersih);

    if (saldoBersih < 0) {
      elements.saldoBersih.style.color = 'var(--hutang)';
    } else {
      elements.saldoBersih.style.color = 'var(--primary)';
    }

    if (overdueCount > 0) {
      elements.alertBannerContainer.innerHTML = `
        <div class="alert-banner">
          <div class="alert-content">
            <i class="ri-error-warning-fill alert-icon"></i>
            <div>
              <strong>Perhatian:</strong> Ada <strong>${overdueCount} catatan</strong> yang sudah lewat tanggal bayar!
            </div>
          </div>
          <button class="sm-btn" id="btn-filter-overdue-banner" style="background: #d97706; color: white;">
            Lihat Sekarang
          </button>
        </div>
      `;

      document.getElementById('btn-filter-overdue-banner')?.addEventListener('click', () => {
        setFilter('overdue');
      });
    } else {
      elements.alertBannerContainer.innerHTML = '';
    }
  }

  /* ===================================================
     RENDER TRANSACTIONS FEED
     =================================================== */

  function renderTransactions() {
    let filtered = transactions.filter(tx => {
      const paid = getPaidTotal(tx);
      const remaining = Math.max(0, tx.amount - paid);
      const isPaidOff = remaining === 0;

      if (currentFilter === 'piutang' && tx.type !== 'piutang') return false;
      if (currentFilter === 'hutang' && tx.type !== 'hutang') return false;
      if (currentFilter === 'lunas' && !isPaidOff) return false;
      if (currentFilter === 'cicilan' && isPaidOff) return false;
      
      if (currentFilter === 'overdue') {
        if (isPaidOff) return false;
        const dueStatus = getDueStatus(tx.dueDate, isPaidOff);
        if (dueStatus.class !== 'overdue' && dueStatus.class !== 'today') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = tx.name.toLowerCase().includes(q);
        const matchPhone = (tx.phone || '').includes(q);
        const matchNotes = (tx.notes || '').toLowerCase().includes(q);
        return matchName || matchPhone || matchNotes;
      }

      return true;
    });

    filtered.sort((a, b) => b.createdAt - a.createdAt);
    elements.transactionCount.textContent = `${filtered.length} Catatan`;

    if (filtered.length === 0) {
      elements.transactionList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon-badge">
            <i class="ri-book-open-line"></i>
          </div>
          <h4 class="empty-title">Belum Ada Catatan Utang / Piutang</h4>
          <p class="empty-sub">Buku utang Anda masih kosong. Tekan tombol di bawah untuk menambah catatan pertama Anda.</p>
          <button class="empty-action-btn" id="btn-empty-add">
            <i class="ri-add-circle-fill"></i> Tambah Catatan Pertama
          </button>
        </div>
      `;
      document.getElementById('btn-empty-add')?.addEventListener('click', () => openTxModal());
      return;
    }

    elements.transactionList.innerHTML = filtered.map(tx => {
      const paid = getPaidTotal(tx);
      const remaining = Math.max(0, tx.amount - paid);
      const isPaidOff = remaining === 0;
      const progress = Math.min(100, Math.round((paid / tx.amount) * 100));
      const dueStatus = getDueStatus(tx.dueDate, isPaidOff);
      const initialLetter = (tx.name || 'U').charAt(0).toUpperCase();

      const avatarColors = ['#4f46e5', '#0284c7', '#059669', '#d97706', '#dc2626'];
      const avatarColor = avatarColors[tx.name.length % avatarColors.length];

      return `
        <div class="transaction-card" data-id="${tx.id}">
          <div class="card-top">
            <div class="contact-info">
              <div class="avatar-circle" style="background: ${avatarColor};">
                ${initialLetter}
              </div>
              <div class="contact-details">
                <h4>${escapeHtml(tx.name)}</h4>
                <div class="contact-phone">
                  <i class="ri-phone-line"></i> ${tx.phone ? escapeHtml(tx.phone) : 'Tanpa No HP'}
                </div>
              </div>
            </div>

            <div class="amount-box">
              <div class="amount-val ${tx.type}">
                ${tx.type === 'piutang' ? '+' : '-'}${formatIDR(tx.amount)}
              </div>
              <div class="sisa-val">
                ${isPaidOff ? '<span style="color: var(--piutang);">LUNAS</span>' : `Sisa: ${formatIDR(remaining)}`}
              </div>
            </div>
          </div>

          <div class="card-mid">
            <span class="badge badge-${tx.type}">
              ${tx.type === 'piutang' ? 'Orang Utang ke Saya' : 'Saya Utang ke Orang'}
            </span>

            <span class="badge ${isPaidOff ? 'badge-lunas' : (paid > 0 ? 'badge-cicilan' : 'badge-belum')}">
              ${isPaidOff ? 'Sudah Lunas' : (paid > 0 ? `Dicicil (${progress}%)` : 'Belum Dibayar')}
            </span>

            <span class="due-tag ${dueStatus.class}">
              <i class="${dueStatus.icon}"></i> ${dueStatus.text}
            </span>
          </div>

          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${progress}%; background: ${tx.type === 'piutang' ? 'var(--piutang)' : 'var(--hutang)'}"></div>
          </div>

          <div class="card-bottom-actions">
            <div class="card-notes">
              ${tx.notes ? escapeHtml(tx.notes) : 'Tanpa catatan'}
            </div>

            <div class="action-btn-group">
              ${tx.phone ? `
                <button class="sm-btn wa-btn" onclick="app.openWaModal('${tx.id}')">
                  <i class="ri-whatsapp-line"></i> WA
                </button>
              ` : ''}

              <button class="sm-btn" onclick="app.openReceiptModal('${tx.id}')">
                <i class="ri-file-text-line"></i> Nota
              </button>

              ${!isPaidOff ? `
                <button class="sm-btn pay-btn" onclick="app.openPaymentModal('${tx.id}')">
                  <i class="ri-money-dollar-circle-line"></i> Bayar
                </button>
              ` : ''}

              <button class="sm-btn" onclick="app.editTx('${tx.id}')">
                <i class="ri-edit-line"></i> Edit
              </button>

              <button class="sm-btn btn-delete-tx" data-id="${tx.id}" onclick="app.deleteTx('${tx.id}')" style="color: var(--hutang);">
                <i class="ri-delete-bin-line"></i> Hapus
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ===================================================
     RENDER REKAP PER ORANG
     =================================================== */

  function renderContacts() {
    const contactMap = {};

    transactions.forEach(tx => {
      const nameKey = tx.name.trim().toLowerCase();
      const paid = getPaidTotal(tx);
      const remaining = Math.max(0, tx.amount - paid);

      if (!contactMap[nameKey]) {
        contactMap[nameKey] = {
          name: tx.name,
          phone: tx.phone || '',
          totalPiutang: 0,
          totalHutang: 0,
          txCount: 0
        };
      }

      if (remaining > 0) {
        if (tx.type === 'piutang') {
          contactMap[nameKey].totalPiutang += remaining;
        } else {
          contactMap[nameKey].totalHutang += remaining;
        }
      }

      contactMap[nameKey].txCount++;
    });

    const contactList = Object.values(contactMap);
    elements.contactCount.textContent = `${contactList.length} Orang`;

    if (contactList.length === 0) {
      elements.contactList.innerHTML = `
        <div class="empty-state">
          <i class="ri-user-search-line"></i>
          <h4 style="font-size: 1.05rem; font-weight: 800; color: #0f172a;">Belum Ada Kontak Terdaftar</h4>
          <p style="font-size: 0.88rem; color: #64748b;">Rekap per orang akan otomatis muncul setelah Anda mencatat utang/piutang.</p>
        </div>
      `;
      return;
    }

    elements.contactList.innerHTML = contactList.map(c => {
      const net = c.totalPiutang - c.totalHutang;
      const avatarColors = ['#4f46e5', '#0284c7', '#059669', '#d97706'];
      const avatarColor = avatarColors[c.name.length % avatarColors.length];

      return `
        <div class="contact-card">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="avatar-circle" style="background: ${avatarColor};">
              ${c.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 style="font-weight: 800; font-size: 1rem;">${escapeHtml(c.name)}</h4>
              <span style="font-size: 0.82rem; color: var(--text-muted);">
                ${c.phone ? escapeHtml(c.phone) : 'Tanpa No HP'} • ${c.txCount} Catatan
              </span>
            </div>
          </div>

          <div style="text-align: right;">
            <div style="font-size: 1rem; font-weight: 800; color: ${net >= 0 ? 'var(--piutang)' : 'var(--hutang)'}">
              ${net >= 0 ? 'Utang ke Saya: +' : 'Saya Utang: '}${formatIDR(Math.abs(net))}
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">Sisa Bersih</div>
          </div>
        </div>
      `;
    }).join('');
  }

  /* ===================================================
     RENDER CANVAS CHARTS
     =================================================== */

  function renderCharts() {
    let totalPiutang = 0;
    let totalHutang = 0;
    let countLunas = 0;
    let countBelum = 0;

    transactions.forEach(tx => {
      const paid = getPaidTotal(tx);
      const remaining = Math.max(0, tx.amount - paid);
      
      if (remaining === 0) {
        countLunas++;
      } else {
        countBelum++;
        if (tx.type === 'piutang') totalPiutang += remaining;
        else totalHutang += remaining;
      }
    });

    const canvasPie = document.getElementById('chart-pie');
    if (canvasPie) {
      const ctx = canvasPie.getContext('2d');
      ctx.clearRect(0, 0, canvasPie.width, canvasPie.height);

      const total = totalPiutang + totalHutang;
      const centerX = canvasPie.width / 2;
      const centerY = canvasPie.height / 2 - 10;
      const radius = 65;

      if (total === 0) {
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 13px Plus Jakarta Sans';
        ctx.textAlign = 'center';
        ctx.fillText('Belum ada data sisa utang', centerX, centerY);
      } else {
        const anglePiutang = (totalPiutang / total) * Math.PI * 2;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, 0, anglePiutang);
        ctx.closePath();
        ctx.fillStyle = '#15803d';
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, anglePiutang, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = '#b91c1c';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.font = 'bold 12px Plus Jakarta Sans';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(`Di Orang: ${Math.round((totalPiutang / total) * 100)}%`, centerX - 60, canvasPie.height - 10);
        ctx.fillText(`Saya Utang: ${Math.round((totalHutang / total) * 100)}%`, centerX + 60, canvasPie.height - 10);
      }
    }

    const canvasBar = document.getElementById('chart-bar');
    if (canvasBar) {
      const ctx = canvasBar.getContext('2d');
      ctx.clearRect(0, 0, canvasBar.width, canvasBar.height);

      const data = [
        { label: 'Belum Lunas', count: countBelum, color: '#b91c1c' },
        { label: 'Sudah Lunas', count: countLunas, color: '#15803d' }
      ];

      const maxCount = Math.max(...data.map(d => d.count), 1);
      const barWidth = 60;
      const gap = 50;
      const startX = 65;
      const chartHeight = 130;
      const baseCanvasY = 160;

      data.forEach((item, index) => {
        const x = startX + index * (barWidth + gap);
        const barH = (item.count / maxCount) * chartHeight;
        const y = baseCanvasY - barH;

        ctx.fillStyle = item.color;
        ctx.fillRect(x, y, barWidth, barH);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 13px Plus Jakarta Sans';
        ctx.textAlign = 'center';
        ctx.fillText(`${item.count} Catatan`, x + barWidth / 2, y - 8);

        ctx.font = 'bold 12px Plus Jakarta Sans';
        ctx.fillStyle = '#475569';
        ctx.fillText(item.label, x + barWidth / 2, baseCanvasY + 20);
      });
    }
  }

  /* ===================================================
     MODALS HANDLERS
     =================================================== */

  function openTxModal(tx = null) {
    if (tx) {
      elements.modalTxTitle.textContent = 'Edit Catatan Utang';
      elements.txId.value = tx.id;
      elements.txName.value = tx.name;
      elements.txPhone.value = tx.phone || '';
      elements.txAmount.value = formatThousandsInput(tx.amount);
      elements.txDate.value = tx.date;
      elements.txDue.value = tx.dueDate || '';
      elements.txCategory.value = tx.category || 'Pribadi';
      elements.txNotes.value = tx.notes || '';
      setTxType(tx.type);
    } else {
      elements.modalTxTitle.textContent = 'Catat Utang Baru';
      elements.formTransaction.reset();
      elements.txId.value = '';
      elements.txAmount.value = '';
      elements.txDate.value = new Date().toISOString().split('T')[0];
      setTxType('piutang');
    }
    openModal('modal-transaction');
  }

  elements.txAmount.addEventListener('input', (e) => {
    e.target.value = formatThousandsInput(e.target.value);
  });

  elements.payAmount.addEventListener('input', (e) => {
    e.target.value = formatThousandsInput(e.target.value);
  });

  function setTxType(type) {
    elements.typeButtons.forEach(btn => {
      if (btn.dataset.type === type) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  elements.formTransaction.addEventListener('submit', (e) => {
    e.preventDefault();

    const id = elements.txId.value;
    const activeTypeBtn = document.querySelector('.type-btn.active');
    const type = activeTypeBtn ? activeTypeBtn.dataset.type : 'piutang';

    const amountValue = parseFormattedInput(elements.txAmount.value);
    const dateValue = elements.txDate.value;
    const notesValue = elements.txNotes.value.trim();
    const preserved = id ? transactions.find(t => t.id === id) : null;
    const initialLoan = { id: generateId('ln'), amount: amountValue, date: dateValue, notes: notesValue || null };

    const newTx = {
      id: preserved ? preserved.id : generateId('tx'),
      name: elements.txName.value.trim(),
      phone: elements.txPhone.value.trim(),
      type: type,
      amount: amountValue,
      date: dateValue,
      dueDate: elements.txDue.value || null,
      category: elements.txCategory.value,
      notes: notesValue,
      payments: preserved ? (preserved.payments || []) : [],
      loans: preserved ? (preserved.loans || [initialLoan]) : [initialLoan],
      createdAt: preserved ? (preserved.createdAt || Date.now()) : Date.now()
    };

    if (preserved) {
      const idx = transactions.findIndex(t => t.id === id);
      if (idx !== -1) transactions[idx] = newTx;
      showToast('Catatan diperbarui!', 'success');
    } else {
      // Anti-duplikat: nama sudah ada (tidak peduli huruf besar/kecil & spasi) -> gabung ke catatan lama
      const nameKey = newTx.name.toLowerCase();
      const existing = transactions.find(t => t.name.trim().toLowerCase() === nameKey && t.type === newTx.type);

      if (existing) {
        // Data lama (versi sebelum ada riwayat) dibuatkan entry pinjaman pertamanya dulu
        if (!Array.isArray(existing.loans) || existing.loans.length === 0) {
          existing.loans = [{ id: generateId('ln'), amount: existing.amount, date: existing.date, notes: existing.notes || null }];
        }

        // Label nominal pada catatan pinjaman pertama, sekali saja
        if (existing.loans.length === 1 && existing.notes) {
          existing.notes = `${existing.notes} (Rp ${formatShortIDR(existing.amount)})`;
        }

        // Catatan pinjaman baru versi berlabel
        const entryText = newTx.notes ? `${newTx.notes} (Rp ${formatShortIDR(newTx.amount)})` : `Rp ${formatShortIDR(newTx.amount)}`;
        existing.notes = existing.notes ? `${existing.notes} | ${entryText}` : entryText;
        existing.loans.push(initialLoan);

        existing.amount += newTx.amount;
        if (!existing.phone && newTx.phone) existing.phone = newTx.phone;
        if (newTx.dueDate) existing.dueDate = newTx.dueDate;
        existing.date = newTx.date;
        existing.createdAt = Date.now();
        showToast(`+${formatIDR(newTx.amount)} ditambahkan ke catatan ${existing.name}. Total sekarang: ${formatIDR(existing.amount)}`, 'success');
      } else {
        const sameNameDiffType = transactions.find(t => t.name.trim().toLowerCase() === nameKey && t.type !== newTx.type);
        transactions.push(newTx);
        if (sameNameDiffType) {
          showToast('Nama sudah ada dengan jenis berbeda, disimpan sebagai catatan terpisah!', 'info');
        } else {
          showToast('Catatan baru berhasil disimpan!', 'success');
        }
      }
    }

    saveData();
    closeModal('modal-transaction');
    renderAll();
  });

  elements.typeButtons.forEach(btn => {
    btn.addEventListener('click', () => setTxType(btn.dataset.type));
  });

  elements.quickAmountButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const current = parseFormattedInput(elements.txAmount.value);
      const add = Number(btn.dataset.add) || 0;
      elements.txAmount.value = formatThousandsInput(current + add);
    });
  });

  /* ===================================================
     PAYMENT HANDLER
     =================================================== */

  function openPaymentModal(txId) {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;

    const paid = getPaidTotal(tx);
    const remaining = Math.max(0, tx.amount - paid);

    elements.payTxId.value = tx.id;
    elements.formPayment.reset();
    elements.payDate.value = new Date().toISOString().split('T')[0];

    elements.paymentSummaryBox.innerHTML = `
      <div style="font-weight: 800; font-size: 1.05rem; color: #0f172a;">
        ${escapeHtml(tx.name)}
      </div>
      <div style="font-size: 0.9rem; color: #475569; display: flex; justify-content: space-between; margin-top: 4px;">
        <span>Total Pinjaman: <strong>${formatIDR(tx.amount)}</strong></span>
        <span>Sudah Dibayar: <strong style="color: var(--piutang);">${formatIDR(paid)}</strong></span>
      </div>
      <div style="margin-top: 8px; font-size: 1.1rem; font-weight: 800; color: var(--primary); text-align: right;">
        Sisa yang Harus Dibayar: ${formatIDR(remaining)}
      </div>
    `;

    elements.btnPayFull.onclick = () => {
      elements.payAmount.value = formatThousandsInput(remaining);
    };

    openModal('modal-payment');
  }

  elements.formPayment.addEventListener('submit', (e) => {
    e.preventDefault();

    const txId = elements.payTxId.value;
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;

    const payAmount = parseFormattedInput(elements.payAmount.value);
    const paid = getPaidTotal(tx);
    const remaining = Math.max(0, tx.amount - paid);

    if (payAmount > remaining) {
      showToast(`Jumlah bayar melebihi sisa (${formatIDR(remaining)})`, 'error');
      return;
    }

    const newPayment = {
      id: generateId('pay'),
      amount: payAmount,
      date: elements.payDate.value,
      note: elements.payNote.value.trim() || 'Pembayaran / Cicilan'
    };

    if (!tx.payments) tx.payments = [];
    tx.payments.push(newPayment);

    saveData();
    closeModal('modal-payment');
    showToast('Pembayaran disimpan!', 'success');
    renderAll();
  });

  /* ===================================================
     WHATSAPP & RECEIPT HANDLER
     =================================================== */

  function openWaModal(txId) {
    const tx = transactions.find(t => t.id === txId);
    if (!tx || !tx.phone) {
      showToast('Nomor HP belum diisi!', 'error');
      return;
    }

    activeWaTx = tx;
    updateWaPreview();
    openModal('modal-wa');
  }

  function updateWaPreview() {
    if (!activeWaTx) return;

    const tx = activeWaTx;
    const paid = getPaidTotal(tx);
    const remaining = Math.max(0, tx.amount - paid);
    const typeStr = elements.waTemplateType.value;
    const dueStr = tx.dueDate ? formatDateID(tx.dueDate) : 'secepatnya';

    // Riwayat pinjaman (muncul kalau nomornya pernah digabung/ditambah lebih dari satu kali)
    const loans = getLoans(tx);
    const riwayatList = loans.map((l, i) =>
      `${i + 1}. ${l.date ? formatDateShort(l.date) : '-'} — +Rp ${formatShortIDR(l.amount)}${l.notes ? ` — ${l.notes}` : ''}`
    ).join('\n');
    const riwayatCompact = loans.map(l =>
      `+Rp ${formatShortIDR(l.amount)}${l.date ? ` (${formatDateShort(l.date)})` : ''}`
    ).join(', ');
    const hasRiwayat = loans.length > 1;

    let text = '';

    if (typeStr === 'santai') {
      text = `Halo ${tx.name} 🙏,\n\nSekadar mengingatkan sisa catatannya sebesar *${formatIDR(remaining)}* (Catatan: ${tx.notes || '-'}).${hasRiwayat ? `\n\nRiwayat pinjaman: ${riwayatCompact}` : ''}\n\nNanti kalau ada kelapangan bisa di-transfer/bayar ya. Terima kasih banyak! 😊`;
    } else if (typeStr === 'formal') {
      text = `Halo Bapak/Ibu ${tx.name},\n\nSemoga sehat selalu. Mengonfirmasikan sisa catatannya sebesar *${formatIDR(remaining)}* dengan tanggal jatuh tempo ${dueStr}.\nCatatan: ${tx.notes || '-'}${hasRiwayat ? `\n\nRiwayat Pinjaman:\n${riwayatList}` : ''}\n\nTerima kasih atas perhatiannya.`;
    } else if (typeStr === 'overdue') {
      text = `Halo ${tx.name},\n\nMengingatkan kembali bahwa catatannya sebesar *${formatIDR(remaining)}* telah lewat batas tanggal (${dueStr}).${hasRiwayat ? `\n\nRiwayat pinjaman: ${riwayatCompact}` : ''}\n\nMohon kabarnya ya untuk jadwal pelunasannya. Terima kasih.`;
    } else if (typeStr === 'receipt') {
      text = `🧾 *NOTA RINGKASAN BUKU UTANG*\nNama: ${tx.name}\nTotal: ${formatIDR(tx.amount)}\nSudah Dibayar: ${formatIDR(paid)}\n*SISA TAGIHAN: ${formatIDR(remaining)}*${hasRiwayat ? `\n\n*RIWAYAT PINJAMAN:*\n${riwayatList}` : ''}\n\nTerima kasih.`;
    }

    elements.waPreviewText.value = text;
  }

  elements.waTemplateType.addEventListener('change', updateWaPreview);

  elements.btnSendWaNow.addEventListener('click', () => {
    if (!activeWaTx || !activeWaTx.phone) return;

    let phone = activeWaTx.phone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);

    const message = encodeURIComponent(elements.waPreviewText.value);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    closeModal('modal-wa');
  });

  function openReceiptModal(txId) {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;

    const paid = getPaidTotal(tx);
    const remaining = Math.max(0, tx.amount - paid);
    const isPaidOff = remaining === 0;
    const loans = getLoans(tx);
    const riwayatRows = loans.length > 1 ? `
      <div class="receipt-row" style="font-weight: 800;">
        <span>Riwayat Pinjaman (${loans.length}x)</span>
        <span></span>
      </div>
      ${loans.map((l, i) => `
      <div class="receipt-row">
        <span>${i + 1}. ${l.date ? formatDateShort(l.date) : '-'}${l.notes ? ` — ${escapeHtml(l.notes)}` : ''}</span>
        <span style="color: var(--piutang);">+${formatIDR(l.amount)}</span>
      </div>
      `).join('')}
    ` : '';

    elements.receiptCardContainer.innerHTML = `
      <div class="receipt-header">
        <h3>Buku Utang Simpel</h3>
        <p style="font-size: 0.85rem; color: #64748b;">Nota Rincian Catatan</p>
      </div>

      <div class="receipt-row">
        <span>Nama</span>
        <strong>${escapeHtml(tx.name)}</strong>
      </div>
      <div class="receipt-row">
        <span>No HP</span>
        <span>${tx.phone ? escapeHtml(tx.phone) : '-'}</span>
      </div>
      <div class="receipt-row">
        <span>Jenis</span>
        <strong>${tx.type === 'piutang' ? 'Orang Utang ke Saya' : 'Saya Utang ke Orang'}</strong>
      </div>
      <div class="receipt-row">
        <span>Tanggal Catat</span>
        <span>${formatDateID(tx.date)}</span>
      </div>
      <div class="receipt-row">
        <span>Catatan</span>
        <span>${tx.notes ? escapeHtml(tx.notes) : '-'}</span>
      </div>

      ${riwayatRows}

      <div class="receipt-total">
        <div class="receipt-row">
          <span>Total Pinjaman</span>
          <span>${formatIDR(tx.amount)}</span>
        </div>
        <div class="receipt-row" style="color: #15803d;">
          <span>Sudah Dibayar</span>
          <span>${formatIDR(paid)}</span>
        </div>
        <div class="receipt-row" style="font-size: 1.15rem; margin-top: 8px; color: ${isPaidOff ? '#15803d' : '#b91c1c'};">
          <span>SISA BALANCE</span>
          <span>${formatIDR(remaining)}</span>
        </div>
      </div>
    `;

    elements.btnCopyReceipt.onclick = () => {
      const summaryText = `*NOTA BUKU UTANG*\nNama: ${tx.name}\nTotal: ${formatIDR(tx.amount)}\nSudah Dibayar: ${formatIDR(paid)}\nSisa: ${formatIDR(remaining)}\nStatus: ${isPaidOff ? 'LUNAS' : 'BELUM LUNAS'}`;
      navigator.clipboard.writeText(summaryText).then(() => {
        showToast('Teks nota berhasil disalin!', 'success');
      });
    };

    openModal('modal-receipt');
  }

  /* ===================================================
     EXPORT & IMPORT
     =================================================== */

  elements.btnExportJson.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `Backup_Buku_Utang_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    showToast('File JSON didownload!', 'success');
  });

  elements.btnExportCsv.addEventListener('click', () => {
    let csv = 'Nama,No HP,Jenis,Nominal,Tanggal,Catatan,Sisa Tagihan\n';
    transactions.forEach(t => {
      const paid = getPaidTotal(t);
      const remaining = Math.max(0, t.amount - paid);
      csv += `"${t.name}","${t.phone || ''}","${t.type === 'piutang' ? 'Orang Utang' : 'Saya Utang'}",${t.amount},"${t.date}","${t.notes || ''}",${remaining}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Buku_Utang_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Laporan CSV didownload!', 'success');
  });

  elements.inputImportJson.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          transactions = imported;
          saveData();
          renderAll();
          showToast('Data berhasil dibuka!', 'success');
        }
      } catch (err) {
        showToast('File tidak valid!', 'error');
      }
    };
    reader.readAsText(file);
  });

  elements.btnResetData.addEventListener('click', () => {
    if (confirm('Hapus seluruh catatan?')) {
      transactions = [];
      saveData();
      renderAll();
      showToast('Seluruh data dihapus!', 'info');
    }
  });

  // Load sample demo data on click
  elements.btnQuickSample.addEventListener('click', () => {
    transactions = [...DEMO_SAMPLE_DATA];
    saveData();
    renderAll();
    showToast('Contoh data demo berhasil diisi!', 'success');
  });

  /* ===================================================
     NAVIGATION
     =================================================== */

  function switchView(viewName) {
    elements.navButtons.forEach(btn => {
      if (btn.dataset.view === viewName) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    elements.views.forEach(sec => {
      if (sec.id === `view-${viewName}`) sec.classList.add('active');
      else sec.classList.remove('active');
    });

    if (viewName === 'analytics') renderCharts();
    else if (viewName === 'contacts') renderContacts();
  }

  elements.navButtons.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  function setFilter(filterName) {
    currentFilter = filterName;
    elements.filterPills.forEach(pill => {
      if (pill.dataset.filter === filterName) pill.classList.add('active');
      else pill.classList.remove('active');
    });
    renderTransactions();
  }

  elements.filterPills.forEach(pill => {
    pill.addEventListener('click', () => setFilter(pill.dataset.filter));
  });

  elements.searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderTransactions();
  });

  elements.btnOpenBackup.addEventListener('click', () => switchView('settings'));
  elements.btnFabAdd.addEventListener('click', () => openTxModal());

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  function openModal(id) {
    document.getElementById(id)?.classList.add('active');
  }

  function closeModal(id) {
    document.getElementById(id)?.classList.remove('active');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }

  let pendingDeleteTxId = null;

  function confirmDeleteTx(id) {
    pendingDeleteTxId = id;
    openModal('modal-confirm-delete');
  }

  document.getElementById('btn-confirm-delete-yes')?.addEventListener('click', () => {
    if (pendingDeleteTxId) {
      transactions = transactions.filter(t => t.id !== pendingDeleteTxId);
      saveData();
      renderAll();
      showToast('Catatan berhasil dihapus!', 'info');
      pendingDeleteTxId = null;
    }
    closeModal('modal-confirm-delete');
  });

  // Event Delegation for transaction list buttons
  elements.transactionList.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.btn-delete-tx');
    if (deleteBtn) {
      e.preventDefault();
      e.stopPropagation();
      confirmDeleteTx(deleteBtn.dataset.id);
    }
  });

  window.deleteTx = confirmDeleteTx;

  window.app = {
    openWaModal,
    openReceiptModal,
    openPaymentModal,
    editTx: (id) => {
      const tx = transactions.find(t => t.id === id);
      if (tx) openTxModal(tx);
    },
    deleteTx: (id) => {
      confirmDeleteTx(id);
    }
  };

  function renderAll() {
    updateMetrics();
    renderTransactions();
    renderContacts();
    renderCharts();
  }

  loadData();
  renderAll();

  /* ===================================================
     PWA: SERVICE WORKER & TOMBOL INSTALL
     Bisa dipakai penuh saat di-hosting (https) atau localhost.
     Dibuka langsung via file:// tetap normal (SW/manifest dilewati).
     =================================================== */

  const canInstallPwa = 'serviceWorker' in navigator &&
    (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname));

  if (canInstallPwa) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        // Mode offline tidak tersedia di lingkungan ini — aplikasi tetap normal
      });
    });
  }

  let deferredInstall = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e;
    elements.btnInstallPwa.hidden = false;
  });

  elements.btnInstallPwa.addEventListener('click', async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    const choice = await deferredInstall.userChoice;
    if (choice && choice.outcome === 'accepted') {
      showToast('Aplikasi berhasil di-install! 🎉', 'success');
    }
    deferredInstall = null;
    elements.btnInstallPwa.hidden = true;
  });

});
