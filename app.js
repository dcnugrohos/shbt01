/**
 * TemenBoss - Main Application Logic
 * Frontend Controller with Dexie.js Persistence
 */

// ==================== DEXIE DATABASE SETUP ====================
class TemenBossDB extends Dexie {
  constructor() {
    super('TemenBossDB');
    
    this.version(1).stores({
      // Web instances (multi-account support)
      webInstances: '++id, name, url, icon, partition, createdAt, updatedAt',
      
      // User settings
      settings: 'key, value, updatedAt',
      
      // Instansi info
      instansi: '++id, name, address, phone, email, logo, createdAt, updatedAt',
      
      // Users & Roles
      users: '++id, name, email, username, password, role, avatar, isActive, createdAt, updatedAt',
      roles: '++id, name, permissions, source, createdAt, updatedAt',
      
      // AI API Keys (encrypted in production)
      aiKeys: 'provider, apiKey, isValid, updatedAt',
      
      // Notifications
      notifications: '++id, title, message, type, read, createdAt',
      
      // Active sessions
      sessions: '++id, userId, token, expiresAt, createdAt'
    });
  }
}

const db = new TemenBossDB();

// ==================== DUMMY DATA FOR ADDONS ====================
const installedAddons = [
  {
    id: 'pos-retail',
    name: 'POS Retail',
    description: 'Sistem Point of Sale untuk retail dengan fitur penjualan, stok, dan laporan',
    version: '2.1.0',
    author: 'TemenBoss Team',
    icon: 'fas fa-cash-register',
    entryPoint: 'index.html',
    status: 'active',
    roles: ['Kasir', 'Manajer Toko', 'Supervisor'],
    permissions: ['transaksi', 'refund', 'laporan_harian', 'manajemen_stok'],
    lastUpdated: '2024-01-15'
  },
  {
    id: 'accounting',
    name: 'Akuntansi',
    description: 'Modul akuntansi dengan jurnal, ledger, dan laporan keuangan',
    version: '1.5.2',
    author: 'TemenBoss Team',
    icon: 'fas fa-calculator',
    entryPoint: 'index.html',
    status: 'active',
    roles: ['Akuntan', 'Keuangan', 'Direktur'],
    permissions: ['jurnal', 'buku_besar', 'neraca', 'laba_rugi'],
    lastUpdated: '2024-01-10'
  },
  {
    id: 'inventory',
    name: 'Inventory Pro',
    description: 'Manajemen inventori lengkap dengan tracking dan forecast',
    version: '3.0.1',
    author: 'TemenBoss Team',
    icon: 'fas fa-boxes',
    entryPoint: 'index.html',
    status: 'inactive',
    roles: ['Gudang', 'Purchasing', 'Admin'],
    permissions: ['stok_masuk', 'stok_keluar', 'opname', 'forecast'],
    lastUpdated: '2024-01-05'
  },
  {
    id: 'hr-payroll',
    name: 'HR & Payroll',
    description: 'Manajemen karyawan, absensi, dan penggajian',
    version: '1.8.0',
    author: 'TemenBoss Team',
    icon: 'fas fa-users',
    entryPoint: 'index.html',
    status: 'active',
    roles: ['HRD', 'Admin HR', 'Direktur'],
    permissions: ['karyawan', 'absensi', 'penggajian', 'cuti'],
    lastUpdated: '2024-01-12'
  },
  {
    id: 'crm',
    name: 'CRM',
    description: 'Customer Relationship Management untuk mengelola pelanggan',
    version: '2.0.0',
    author: 'TemenBoss Team',
    icon: 'fas fa-handshake',
    entryPoint: 'index.html',
    status: 'inactive',
    roles: ['Sales', 'Customer Service', 'Manager'],
    permissions: ['pelanggan', 'follow_up', 'deal', 'laporan_sales'],
    lastUpdated: '2023-12-28'
  }
];

// ==================== MAIN APPLICATION CLASS ====================
class TemenBossApp {
  constructor() {
    this.state = {
      sidebarState: 'expanded', // 'hidden', 'collapsed', 'expanded'
      currentView: 'dashboard',
      currentTheme: 'light',
      activeWebviewId: null,
      activeAddonId: null,
      user: {
        name: 'Administrator',
        email: 'admin@temenboss.com',
        role: 'Super Admin',
        avatar: null
      },
      notifications: [],
      webInstances: [],
      addons: [],
      isWifiServerOn: false
    };
    
    this.init();
  }
  
  // ==================== INITIALIZATION ====================
  async init() {
    console.log('[TemenBoss] Initializing...');
    
    // Load settings from database
    await this.loadSettings();
    
    // Initialize UI
    this.initUI();
    
    // Load web instances
    await this.loadWebInstances();
    
    // Load addons
    await this.loadAddons();
    
    // Initialize event listeners
    this.initEventListeners();
    
    // Setup IPC listeners
    this.initIPCListeners();
    
    // Check for app info
    this.loadAppInfo();
    
    console.log('[TemenBoss] Initialized successfully');
  }
  
  async loadSettings() {
    try {
      // Load theme
      const themeSetting = await db.settings.get('theme');
      if (themeSetting) {
        this.state.currentTheme = themeSetting.value;
        this.applyTheme(themeSetting.value);
      }
      
      // Load sidebar state
      const sidebarSetting = await db.settings.get('sidebarState');
      if (sidebarSetting) {
        this.state.sidebarState = sidebarSetting.value;
        this.applySidebarState(sidebarSetting.value);
      }
      
      // Load user info
      const userSetting = await db.settings.get('currentUser');
      if (userSetting) {
        this.state.user = { ...this.state.user, ...userSetting.value };
        this.updateUserUI();
      }
      
      // Load WiFi server state
      const wifiSetting = await db.settings.get('wifiServer');
      if (wifiSetting) {
        this.state.isWifiServerOn = wifiSetting.value;
      }
      
    } catch (error) {
      console.error('[TemenBoss] Error loading settings:', error);
    }
  }
  
  initUI() {
    // Set initial sidebar state
    this.applySidebarState(this.state.sidebarState);
    
    // Set initial theme
    this.applyTheme(this.state.currentTheme);
    
    // Update user UI
    this.updateUserUI();
    
    // Render addon list
    this.renderAddonList();
    
    // Render web instance list
    this.renderWebInstanceList();
  }
  
  initEventListeners() {
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      const notifDropdown = document.getElementById('notif-dropdown');
      const userDropdown = document.getElementById('user-dropdown');
      
      if (!e.target.closest('[onclick="app.toggleNotifications()"]') && 
          !e.target.closest('#notif-dropdown')) {
        notifDropdown.classList.add('hidden');
      }
      
      if (!e.target.closest('[onclick="app.toggleUserMenu()"]') && 
          !e.target.closest('#user-dropdown')) {
        userDropdown.classList.add('hidden');
      }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // F11 for fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        this.toggleFullscreen();
      }
      
      // Ctrl+B for sidebar toggle
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        this.toggleSidebar();
      }
      
      // Escape to close modals
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });
    
    // Webview events
    const webview = document.getElementById('active-webview');
    if (webview) {
      webview.addEventListener('did-start-loading', () => {
        this.showLoading(true);
      });
      
      webview.addEventListener('did-stop-loading', () => {
        this.showLoading(false);
        this.updateWebviewURL(webview.getURL());
      });
      
      webview.addEventListener('did-navigate', (e) => {
        this.updateWebviewURL(e.url);
      });
      
      webview.addEventListener('new-window', (e) => {
        e.preventDefault();
        webview.loadURL(e.url);
      });
    }
  }
  
  initIPCListeners() {
    // Listen for theme changes from main process
    if (window.TemenBossAPI?.theme?.onChange) {
      window.TemenBossAPI.theme.onChange((theme) => {
        this.applyTheme(theme);
      });
    }
    
    // Listen for hardware events
    if (window.TemenBossAPI?.hardware?.onPrintComplete) {
      window.TemenBossAPI.hardware.onPrintComplete((data) => {
        this.showToast('Print selesai', 'success');
      });
    }
    
    if (window.TemenBossAPI?.hardware?.onScanResult) {
      window.TemenBossAPI.hardware.onScanResult((data) => {
        this.showToast(`Barcode: ${data.barcode}`, 'info');
      });
    }
    
    // Listen for socket events
    if (window.TemenBossAPI?.server?.onClientConnected) {
      window.TemenBossAPI.server.onClientConnected((data) => {
        this.showToast(`Client terhubung: ${data.clientId}`, 'info');
      });
    }
    
    if (window.TemenBossAPI?.server?.onClientDisconnected) {
      window.TemenBossAPI.server.onClientDisconnected((data) => {
        this.showToast(`Client terputus: ${data.clientId}`, 'warning');
      });
    }
  }
  
  async loadAppInfo() {
    if (window.TemenBossAPI?.app?.getInfo) {
      try {
        const info = await window.TemenBossAPI.app.getInfo();
        console.log('[TemenBoss] App Info:', info);
      } catch (error) {
        console.error('[TemenBoss] Error getting app info:', error);
      }
    }
  }
  
  // ==================== SIDEBAR MANAGEMENT ====================
  toggleSidebar() {
    const states = ['expanded', 'collapsed', 'hidden'];
    const currentIndex = states.indexOf(this.state.sidebarState);
    const nextIndex = (currentIndex + 1) % states.length;
    const newState = states[nextIndex];
    
    this.setSidebarState(newState);
  }
  
  setSidebarState(state) {
    this.state.sidebarState = state;
    this.applySidebarState(state);
    
    // Save to database
    db.settings.put({
      key: 'sidebarState',
      value: state,
      updatedAt: new Date()
    });
  }
  
  applySidebarState(state) {
    const sidebar = document.getElementById('sidebar');
    const mainArea = document.getElementById('main-area');
    const logoFull = document.getElementById('logo-full');
    const logoIconOnly = document.getElementById('logo-icon-only');
    const sidebarTexts = document.querySelectorAll('.sidebar-text');
    const iconOnlyDividers = document.querySelectorAll('.icon-only-divider');
    const iconOnlyFooter = document.querySelector('.icon-only-footer');
    const sidebarFooterText = document.querySelector('.sidebar-text.text-center');
    const toggleIcon = document.getElementById('sidebar-toggle-icon');
    
    sidebar.setAttribute('data-state', state);
    
    switch (state) {
      case 'expanded':
        sidebar.style.width = '16rem';
        sidebar.style.transform = 'translateX(0)';
        mainArea.style.marginLeft = '16rem';
        
        logoFull.classList.remove('hidden');
        logoIconOnly.classList.add('hidden');
        
        sidebarTexts.forEach(el => el.classList.remove('hidden'));
        iconOnlyDividers.forEach(el => el.classList.add('hidden'));
        if (iconOnlyFooter) iconOnlyFooter.classList.add('hidden');
        if (sidebarFooterText) sidebarFooterText.classList.remove('hidden');
        
        toggleIcon.className = 'fas fa-bars text-gray-600 dark:text-gray-400';
        break;
        
      case 'collapsed':
        sidebar.style.width = '4.5rem';
        sidebar.style.transform = 'translateX(0)';
        mainArea.style.marginLeft = '4.5rem';
        
        logoFull.classList.add('hidden');
        logoIconOnly.classList.remove('hidden');
        
        sidebarTexts.forEach(el => el.classList.add('hidden'));
        iconOnlyDividers.forEach(el => el.classList.remove('hidden'));
        if (iconOnlyFooter) iconOnlyFooter.classList.remove('hidden');
        if (sidebarFooterText) sidebarFooterText.classList.add('hidden');
        
        toggleIcon.className = 'fas fa-chevron-right text-gray-600 dark:text-gray-400';
        break;
        
      case 'hidden':
        sidebar.style.width = '16rem';
        sidebar.style.transform = 'translateX(-100%)';
        mainArea.style.marginLeft = '0';
        
        logoFull.classList.remove('hidden');
        logoIconOnly.classList.add('hidden');
        
        sidebarTexts.forEach(el => el.classList.remove('hidden'));
        iconOnlyDividers.forEach(el => el.classList.add('hidden'));
        if (iconOnlyFooter) iconOnlyFooter.classList.add('hidden');
        if (sidebarFooterText) sidebarFooterText.classList.remove('hidden');
        
        toggleIcon.className = 'fas fa-chevron-left text-gray-600 dark:text-gray-400';
        break;
    }
  }
  
  // ==================== THEME MANAGEMENT ====================
  toggleTheme() {
    const newTheme = this.state.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }
  
  setTheme(theme) {
    this.state.currentTheme = theme;
    this.applyTheme(theme);
    
    // Save to database
    db.settings.put({
      key: 'theme',
      value: theme,
      updatedAt: new Date()
    });
    
    // Broadcast to iframes/webviews
    this.broadcastTheme(theme);
  }
  
  applyTheme(theme) {
    const html = document.documentElement;
    const themeIcon = document.getElementById('theme-icon');
    
    if (theme === 'dark') {
      html.classList.add('dark');
      themeIcon.className = 'fas fa-moon text-gray-600 dark:text-gray-400';
    } else {
      html.classList.remove('dark');
      themeIcon.className = 'fas fa-sun text-gray-600 dark:text-gray-400';
    }
  }
  
  broadcastTheme(theme) {
    // Broadcast to main process
    if (window.TemenBossAPI?.theme?.broadcast) {
      window.TemenBossAPI.theme.broadcast(theme);
    }
    
    // Post message to iframes
    const addonIframe = document.getElementById('addon-iframe');
    if (addonIframe && addonIframe.contentWindow) {
      addonIframe.contentWindow.postMessage({
        type: 'THEME_CHANGE',
        theme: theme
      }, '*');
    }
    
    // Post message to dashboard iframe
    const dashboardIframe = document.querySelector('#view-dashboard iframe');
    if (dashboardIframe && dashboardIframe.contentWindow) {
      dashboardIframe.contentWindow.postMessage({
        type: 'THEME_CHANGE',
        theme: theme
      }, '*');
    }
  }
  
  // ==================== NAVIGATION ====================
  navigateTo(view, params = {}) {
    // Hide all views
    document.querySelectorAll('.view-section').forEach(el => {
      el.classList.add('hidden');
    });
    
    // Update menu active state
    document.querySelectorAll('.menu-item').forEach(el => {
      el.classList.remove('active', 'bg-primary-50', 'dark:bg-primary-900/20', 'text-primary-600', 'dark:text-primary-400');
    });
    
    // Show selected view
    let targetView;
    let breadcrumbText;
    
    switch (view) {
      case 'dashboard':
        targetView = document.getElementById('view-dashboard');
        document.getElementById('nav-dashboard').classList.add('active');
        breadcrumbText = 'Dashboard';
        this.state.currentView = 'dashboard';
        this.state.activeAddonId = null;
        this.state.activeWebviewId = null;
        break;
        
      case 'settings':
        targetView = document.getElementById('view-settings');
        document.getElementById('nav-settings').classList.add('active');
        breadcrumbText = 'Pengaturan';
        this.state.currentView = 'settings';
        this.state.activeAddonId = null;
        this.state.activeWebviewId = null;
        this.renderSettingsView();
        break;
        
      case 'addon':
        targetView = document.getElementById('view-addon');
        breadcrumbText = params.addonName || 'Add-on';
        this.state.currentView = 'addon';
        this.state.activeAddonId = params.addonId;
        this.state.activeWebviewId = null;
        this.loadAddon(params.addonId);
        break;
        
      case 'webview':
        targetView = document.getElementById('view-webview');
        breadcrumbText = params.name || 'Web Instance';
        this.state.currentView = 'webview';
        this.state.activeAddonId = null;
        this.state.activeWebviewId = params.id;
        this.loadWebview(params.id);
        break;
        
      default:
        targetView = document.getElementById('view-dashboard');
        breadcrumbText = 'Dashboard';
    }
    
    if (targetView) {
      targetView.classList.remove('hidden');
    }
    
    // Update breadcrumb
    document.getElementById('breadcrumb-current').textContent = breadcrumbText;
    
    // Show/hide webview nav in header
    const webviewNav = document.getElementById('webview-nav');
    if (view === 'webview') {
      webviewNav.classList.remove('hidden');
    } else {
      webviewNav.classList.add('hidden');
    }
  }
  
  // ==================== ADDON MANAGEMENT ====================
  async loadAddons() {
    // In production, this would scan the addons folder via IPC
    // For now, use dummy data
    this.state.addons = installedAddons;
    
    // Also try to get from main process
    if (window.TemenBossAPI?.addon?.scan) {
      try {
        const addons = await window.TemenBossAPI.addon.scan();
        if (addons && addons.length > 0) {
          this.state.addons = addons;
        }
      } catch (error) {
        console.error('[TemenBoss] Error scanning addons:', error);
      }
    }
    
    this.renderAddonList();
  }
  
  renderAddonList() {
    const container = document.getElementById('addon-list');
    container.innerHTML = '';
    
    this.state.addons
      .filter(addon => addon.status === 'active')
      .forEach(addon => {
        const btn = document.createElement('button');
        btn.className = 'menu-item w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors';
        btn.onclick = () => this.navigateTo('addon', { addonId: addon.id, addonName: addon.name });
        btn.innerHTML = `
          <i class="${addon.icon} w-5 text-center"></i>
          <span class="sidebar-text">${addon.name}</span>
        `;
        container.appendChild(btn);
      });
  }
  
  loadAddon(addonId) {
    const addon = this.state.addons.find(a => a.id === addonId);
    if (!addon) return;
    
    const iframe = document.getElementById('addon-iframe');
    const addonPath = `../addons/${addonId}/${addon.entryPoint || 'index.html'}`;
    iframe.src = addonPath;
    
    // Send theme info when iframe loads
    iframe.onload = () => {
      iframe.contentWindow.postMessage({
        type: 'THEME_CHANGE',
        theme: this.state.currentTheme
      }, '*');
      
      iframe.contentWindow.postMessage({
        type: 'INIT',
        addonId: addonId,
        user: this.state.user
      }, '*');
    };
  }
  
  // ==================== WEB INSTANCE MANAGEMENT ====================
  async loadWebInstances() {
    try {
      const instances = await db.webInstances.toArray();
      this.state.webInstances = instances;
      this.renderWebInstanceList();
    } catch (error) {
      console.error('[TemenBoss] Error loading web instances:', error);
    }
  }
  
  renderWebInstanceList() {
    const container = document.getElementById('webinstance-list');
    container.innerHTML = '';
    
    this.state.webInstances.forEach(instance => {
      const btn = document.createElement('button');
      btn.className = `menu-item w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${this.state.activeWebviewId === instance.id ? 'active' : ''}`;
      btn.onclick = () => this.navigateTo('webview', { id: instance.id, name: instance.name });
      btn.innerHTML = `
        <i class="${instance.icon || 'fas fa-globe'} w-5 text-center"></i>
        <span class="sidebar-text">${instance.name}</span>
        <button onclick="event.stopPropagation(); app.deleteWebInstance(${instance.id})" class="ml-auto opacity-0 group-hover:opacity-100 hover:text-red-500">
          <i class="fas fa-times text-xs"></i>
        </button>
      `;
      btn.classList.add('group');
      container.appendChild(btn);
    });
  }
  
  showAddWebInstanceModal() {
    document.getElementById('modal-add-webinstance').classList.remove('hidden');
    document.getElementById('wi-name').focus();
  }
  
  async saveWebInstance() {
    const name = document.getElementById('wi-name').value.trim();
    const url = document.getElementById('wi-url').value.trim();
    const icon = document.getElementById('wi-icon').value;
    
    if (!name || !url) {
      this.showToast('Nama dan URL wajib diisi', 'error');
      return;
    }
    
    try {
      const partition = `persist:webinstance_${Date.now()}`;
      
      await db.webInstances.add({
        name,
        url,
        icon,
        partition,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await this.loadWebInstances();
      this.closeModal('modal-add-webinstance');
      this.showToast('Web instance berhasil ditambahkan', 'success');
      
      // Clear form
      document.getElementById('wi-name').value = '';
      document.getElementById('wi-url').value = '';
      
    } catch (error) {
      console.error('[TemenBoss] Error saving web instance:', error);
      this.showToast('Gagal menyimpan web instance', 'error');
    }
  }
  
  async deleteWebInstance(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus web instance ini?')) return;
    
    try {
      await db.webInstances.delete(id);
      await this.loadWebInstances();
      
      if (this.state.activeWebviewId === id) {
        this.navigateTo('dashboard');
      }
      
      this.showToast('Web instance dihapus', 'success');
    } catch (error) {
      console.error('[TemenBoss] Error deleting web instance:', error);
      this.showToast('Gagal menghapus web instance', 'error');
    }
  }
  
  loadWebview(instanceId) {
    const instance = this.state.webInstances.find(wi => wi.id === instanceId);
    if (!instance) return;
    
    const webview = document.getElementById('active-webview');
    webview.setAttribute('partition', instance.partition);
    webview.src = instance.url;
    
    this.updateWebviewURL(instance.url);
  }
  
  webviewBack() {
    const webview = document.getElementById('active-webview');
    if (webview.canGoBack()) {
      webview.goBack();
    }
  }
  
  webviewForward() {
    const webview = document.getElementById('active-webview');
    if (webview.canGoForward()) {
      webview.goForward();
    }
  }
  
  webviewRefresh() {
    const webview = document.getElementById('active-webview');
    webview.reload();
  }
  
  updateWebviewURL(url) {
    document.getElementById('webview-url').textContent = url;
    document.getElementById('mini-webview-url').textContent = url;
  }
  
  closeWebview() {
    const webview = document.getElementById('active-webview');
    webview.src = 'about:blank';
    this.navigateTo('dashboard');
  }
  
  // ==================== SETTINGS VIEW ====================
  renderSettingsView() {
    const container = document.getElementById('view-settings');
    
    container.innerHTML = `
      <div class="p-6 max-w-6xl mx-auto">
        <div class="mb-6">
          <h1 class="text-2xl font-bold">Pengaturan</h1>
          <p class="text-gray-500 dark:text-gray-400">Kelola pengaturan aplikasi dan sistem</p>
        </div>
        
        <!-- Settings Tabs -->
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div class="border-b border-gray-200 dark:border-gray-700">
            <nav class="flex overflow-x-auto">
              <button onclick="app.switchSettingsTab('info')" id="tab-info" class="tab-btn active px-6 py-4 text-sm font-medium text-primary-600 border-b-2 border-primary-600 whitespace-nowrap">
                <i class="fas fa-building mr-2"></i>Info Instansi
              </button>
              <button onclick="app.switchSettingsTab('users')" id="tab-users" class="tab-btn px-6 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 whitespace-nowrap">
                <i class="fas fa-users-cog mr-2"></i>User & Role
              </button>
              <button onclick="app.switchSettingsTab('addons')" id="tab-addons" class="tab-btn px-6 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 whitespace-nowrap">
                <i class="fas fa-puzzle-piece mr-2"></i>Add-on Manager
              </button>
              <button onclick="app.switchSettingsTab('ai')" id="tab-ai" class="tab-btn px-6 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 whitespace-nowrap">
                <i class="fas fa-robot mr-2"></i>AI Integration
              </button>
              <button onclick="app.switchSettingsTab('bcc')" id="tab-bcc" class="tab-btn px-6 py-4 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 whitespace-nowrap">
                <i class="fas fa-cloud mr-2"></i>BCC
              </button>
            </nav>
          </div>
          
          <!-- Tab Content -->
          <div id="settings-content" class="p-6">
            <!-- Content loaded dynamically -->
          </div>
        </div>
      </div>
    `;
    
    // Load initial tab
    this.switchSettingsTab('info');
  }
  
  switchSettingsTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active', 'text-primary-600', 'border-b-2', 'border-primary-600');
      btn.classList.add('text-gray-500', 'dark:text-gray-400');
    });
    
    const activeTab = document.getElementById(`tab-${tab}`);
    if (activeTab) {
      activeTab.classList.add('active', 'text-primary-600', 'border-b-2', 'border-primary-600');
      activeTab.classList.remove('text-gray-500', 'dark:text-gray-400');
    }
    
    // Load tab content
    const content = document.getElementById('settings-content');
    
    switch (tab) {
      case 'info':
        this.renderInfoSettings(content);
        break;
      case 'users':
        this.renderUsersSettings(content);
        break;
      case 'addons':
        this.renderAddonsSettings(content);
        break;
      case 'ai':
        this.renderAISettings(content);
        break;
      case 'bcc':
        this.renderBCCSettings(content);
        break;
    }
  }
  
  async renderInfoSettings(container) {
    const instansi = await db.instansi.toArray();
    const data = instansi[0] || {};
    
    container.innerHTML = `
      <div class="max-w-2xl">
        <h3 class="text-lg font-semibold mb-4">Informasi Instansi</h3>
        <form onsubmit="event.preventDefault(); app.saveInstansiInfo();" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Nama Instansi</label>
              <input type="text" id="instansi-name" value="${data.name || ''}" class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary-500 outline-none">
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Telepon</label>
              <input type="tel" id="instansi-phone" value="${data.phone || ''}" class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary-500 outline-none">
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Alamat</label>
            <textarea id="instansi-address" rows="3" class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary-500 outline-none">${data.address || ''}</textarea>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Email</label>
            <input type="email" id="instansi-email" value="${data.email || ''}" class="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary-500 outline-none">
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Logo</label>
            <div class="flex items-center gap-4">
              <div class="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                ${data.logo ? `<img src="${data.logo}" class="w-full h-full object-cover">` : '<i class="fas fa-image text-gray-400 text-2xl"></i>'}
              </div>
              <button type="button" onclick="app.selectLogo()" class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Pilih File
              </button>
            </div>
          </div>
          <div class="pt-4">
            <button type="submit" class="px-6 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors">
              <i class="fas fa-save mr-2"></i>Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    `;
  }
  
  async renderUsersSettings(container) {
    const users = await db.users.toArray();
    const roles = await this.getAllRoles();
    
    container.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">Manajemen User</h3>
          <button onclick="app.showAddUserModal()" class="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors">
            <i class="fas fa-plus mr-2"></i>Tambah User
          </button>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">User</th>
                <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Role</th>
                <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              ${users.map(user => `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                      <img src="${user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=fff`}" class="w-8 h-8 rounded-full">
                      <div>
                        <p class="font-medium">${user.name}</p>
                        <p class="text-xs text-gray-500">${user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400">
                      ${user.role}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}">
                      ${user.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <button onclick="app.editUser(${user.id})" class="text-primary-600 hover:text-primary-700 mr-2">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="app.deleteUser(${user.id})" class="text-red-600 hover:text-red-700">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
              ${users.length === 0 ? `
                <tr>
                  <td colspan="4" class="px-4 py-8 text-center text-gray-500">
                    <i class="fas fa-users text-4xl mb-2 opacity-30"></i>
                    <p>Belum ada user</p>
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
        
        <div class="mt-6">
          <h4 class="font-medium mb-2">Role Tersedia (dari Add-on)</h4>
          <div class="flex flex-wrap gap-2">
            ${roles.map(role => `
              <span class="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                ${role.name} <span class="text-gray-400">(${role.source})</span>
              </span>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
  
  async getAllRoles() {
    const dbRoles = await db.roles.toArray();
    const addonRoles = [];
    
    installedAddons.forEach(addon => {
      if (addon.roles) {
        addon.roles.forEach(role => {
          addonRoles.push({
            name: role,
            source: addon.name,
            permissions: addon.permissions || []
          });
        });
      }
    });
    
    return [...dbRoles, ...addonRoles];
  }
  
  renderAddonsSettings(container) {
    container.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold">Add-on Manager</h3>
          <button onclick="app.scanAddons()" class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors">
            <i class="fas fa-sync-alt mr-2"></i>Scan Ulang
          </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${installedAddons.map(addon => `
            <div class="card-hover bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
              <div class="flex items-start justify-between mb-3">
                <div class="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                  <i class="${addon.icon} text-primary-600 text-xl"></i>
                </div>
                <span class="px-2 py-1 rounded-full text-xs font-medium ${addon.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400'}">
                  ${addon.status === 'active' ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <h4 class="font-semibold mb-1">${addon.name}</h4>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">${addon.description}</p>
              <div class="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>Versi ${addon.version}</span>
                <span>by ${addon.author}</span>
              </div>
              <div class="flex gap-2">
                <button onclick="app.toggleAddon('${addon.id}')" class="flex-1 px-3 py-2 rounded-lg ${addon.status === 'active' ? 'bg-red-100 dark:bg-red-900/20 text-red-600' : 'bg-green-100 dark:bg-green-900/20 text-green-600'} text-sm font-medium transition-colors">
                  ${addon.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button onclick="app.updateAddon('${addon.id}')" class="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                  <i class="fas fa-arrow-up"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  async renderAISettings(container) {
    const aiKeys = await db.aiKeys.toArray();
    const providers = [
      { id: 'gemini', name: 'Google Gemini', icon: 'fas fa-brain' },
      { id: 'openai', name: 'OpenAI ChatGPT', icon: 'fas fa-robot' },
      { id: 'deepseek', name: 'Deepseek', icon: 'fas fa-water' },
      { id: 'groq', name: 'Groq', icon: 'fas fa-bolt' },
      { id: 'openrouter', name: 'OpenRouter', icon: 'fas fa-network-wired' }
    ];
    
    container.innerHTML = `
      <div class="max-w-2xl">
        <h3 class="text-lg font-semibold mb-4">AI Integration</h3>
        <div class="space-y-4">
          ${providers.map(provider => {
            const keyData = aiKeys.find(k => k.provider === provider.id);
            return `
              <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                    <i class="${provider.icon} text-primary-600"></i>
                  </div>
                  <div>
                    <h4 class="font-medium">${provider.name}</h4>
                    <span class="text-xs ${keyData?.isValid ? 'text-green-600' : 'text-gray-500'}">
                      ${keyData?.isValid ? '✓ Tervalidasi' : 'Belum dikonfigurasi'}
                    </span>
                  </div>
                </div>
                <div class="flex gap-2">
                  <input type="password" id="ai-key-${provider.id}" value="${keyData?.apiKey || ''}" placeholder="Masukkan API Key" class="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-primary-500 outline-none">
                  <button onclick="app.testAIKey('${provider.id}')" class="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-sm transition-colors">
                    Test
                  </button>
                  <button onclick="app.saveAIKey('${provider.id}')" class="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm transition-colors">
                    Simpan
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
  
  renderBCCSettings(container) {
    container.innerHTML = `
      <div class="max-w-2xl space-y-6">
        
        <!-- Backup & Restore -->
        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
          <h4 class="font-semibold mb-2"><i class="fas fa-database mr-2"></i>Backup & Restore</h4>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Backup atau restore data aplikasi</p>
          <div class="flex gap-2">
            <button onclick="app.exportData()" class="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm transition-colors">
              <i class="fas fa-download mr-2"></i>Export Data
            </button>
            <button onclick="app.importData()" class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors">
              <i class="fas fa-upload mr-2"></i>Import Data
            </button>
          </div>
        </div>
        
        <!-- Cloud Sync -->
        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
          <h4 class="font-semibold mb-2"><i class="fas fa-cloud mr-2"></i>Cloud Sync (Supabase)</h4>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Sinkronisasi database ke cloud</p>
          <button onclick="app.pushDatabaseSchema()" class="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm transition-colors">
            <i class="fas fa-server mr-2"></i>Push Database Structure
          </button>
        </div>
        
        <!-- WiFi Server -->
        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-semibold mb-1"><i class="fas fa-wifi mr-2"></i>Server Wi-Fi</h4>
              <p class="text-sm text-gray-500 dark:text-gray-400">Aktifkan akses IP lokal untuk perangkat lain</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="wifi-toggle" ${this.state.isWifiServerOn ? 'checked' : ''} onchange="app.toggleWifiServer(this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div id="wifi-status" class="mt-3 text-sm ${this.state.isWifiServerOn ? 'text-green-600' : 'text-gray-500'}">
            ${this.state.isWifiServerOn ? '✓ Server Wi-Fi aktif di port 3000' : 'Server Wi-Fi nonaktif'}
          </div>
        </div>
        
      </div>
    `;
  }
  
  // ==================== SETTINGS ACTIONS ====================
  async saveInstansiInfo() {
    const data = {
      name: document.getElementById('instansi-name').value,
      phone: document.getElementById('instansi-phone').value,
      address: document.getElementById('instansi-address').value,
      email: document.getElementById('instansi-email').value,
      updatedAt: new Date()
    };
    
    try {
      const existing = await db.instansi.toArray();
      if (existing.length > 0) {
        await db.instansi.update(existing[0].id, data);
      } else {
        await db.instansi.add({ ...data, createdAt: new Date() });
      }
      this.showToast('Informasi instansi disimpan', 'success');
    } catch (error) {
      this.showToast('Gagal menyimpan', 'error');
    }
  }
  
  async testAIKey(provider) {
    const key = document.getElementById(`ai-key-${provider}`).value;
    if (!key) {
      this.showToast('Masukkan API Key terlebih dahulu', 'error');
      return;
    }
    
    this.showLoading(true);
    
    try {
      if (window.TemenBossAPI?.ai?.ask) {
        const result = await window.TemenBossAPI.ai.ask({
          provider,
          apiKey: key,
          prompt: 'Hello, this is a test.'
        });
        
        if (result.success) {
          this.showToast(`API Key ${provider} valid!`, 'success');
          await db.aiKeys.update(provider, { isValid: true });
        } else {
          this.showToast(`API Key tidak valid`, 'error');
        }
      } else {
        // Simulate test
        await new Promise(r => setTimeout(r, 1000));
        this.showToast(`API Key ${provider} valid (simulasi)`, 'success');
      }
    } catch (error) {
      this.showToast('Gagal menguji API Key', 'error');
    } finally {
      this.showLoading(false);
    }
  }
  
  async saveAIKey(provider) {
    const key = document.getElementById(`ai-key-${provider}`).value;
    
    try {
      await db.aiKeys.put({
        provider,
        apiKey: key,
        isValid: false,
        updatedAt: new Date()
      });
      this.showToast('API Key disimpan', 'success');
    } catch (error) {
      this.showToast('Gagal menyimpan', 'error');
    }
  }
  
  async toggleWifiServer(enable) {
    try {
      if (window.TemenBossAPI?.server?.toggleWifi) {
        await window.TemenBossAPI.server.toggleWifi(enable);
      }
      
      this.state.isWifiServerOn = enable;
      await db.settings.put({
        key: 'wifiServer',
        value: enable,
        updatedAt: new Date()
      });
      
      const statusEl = document.getElementById('wifi-status');
      if (statusEl) {
        statusEl.textContent = enable ? '✓ Server Wi-Fi aktif di port 3000' : 'Server Wi-Fi nonaktif';
        statusEl.className = `mt-3 text-sm ${enable ? 'text-green-600' : 'text-gray-500'}`;
      }
      
      this.showToast(`Server Wi-Fi ${enable ? 'diaktifkan' : 'dinonaktifkan'}`, 'success');
    } catch (error) {
      this.showToast('Gagal mengubah status server', 'error');
    }
  }
  
  async exportData() {
    try {
      const data = {
        webInstances: await db.webInstances.toArray(),
        settings: await db.settings.toArray(),
        instansi: await db.instansi.toArray(),
        users: await db.users.toArray(),
        roles: await db.roles.toArray(),
        aiKeys: await db.aiKeys.toArray(),
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `temenboss-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      this.showToast('Data berhasil diexport', 'success');
    } catch (error) {
      this.showToast('Gagal export data', 'error');
    }
  }
  
  async importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Import data
        if (data.webInstances) await db.webInstances.bulkPut(data.webInstances);
        if (data.settings) await db.settings.bulkPut(data.settings);
        if (data.instansi) await db.instansi.bulkPut(data.instansi);
        if (data.users) await db.users.bulkPut(data.users);
        if (data.roles) await db.roles.bulkPut(data.roles);
        if (data.aiKeys) await db.aiKeys.bulkPut(data.aiKeys);
        
        this.showToast('Data berhasil diimport', 'success');
        await this.loadWebInstances();
      } catch (error) {
        this.showToast('Gagal import data', 'error');
      }
    };
    input.click();
  }
  
  async pushDatabaseSchema() {
    this.showLoading(true);
    
    try {
      if (window.TemenBossAPI?.db?.pushSchema) {
        const result = await window.TemenBossAPI.db.pushSchema({
          tables: ['webInstances', 'settings', 'instansi', 'users', 'roles', 'aiKeys', 'notifications']
        });
        
        if (result.success) {
          this.showToast('Schema berhasil dipush ke Supabase', 'success');
        } else {
          this.showToast('Gagal push schema', 'error');
        }
      } else {
        await new Promise(r => setTimeout(r, 1500));
        this.showToast('Schema berhasil dipush (simulasi)', 'success');
      }
    } catch (error) {
      this.showToast('Gagal push schema', 'error');
    } finally {
      this.showLoading(false);
    }
  }
  
  // ==================== UTILITY METHODS ====================
  toggleFullscreen() {
    if (window.TemenBossAPI?.window?.fullscreen) {
      const isFullscreen = !!document.fullscreenElement;
      window.TemenBossAPI.window.fullscreen(!isFullscreen);
    } else {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  }
  
  toggleNotifications() {
    const dropdown = document.getElementById('notif-dropdown');
    dropdown.classList.toggle('hidden');
  }
  
  toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown.classList.toggle('hidden');
  }
  
  clearNotifications() {
    this.state.notifications = [];
    document.getElementById('notif-list').innerHTML = '<div class="p-4 text-center text-gray-500 text-sm">Tidak ada notifikasi</div>';
    document.getElementById('notif-badge').classList.add('hidden');
  }
  
  closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
  }
  
  closeAllModals() {
    document.querySelectorAll('[id^="modal-"]').forEach(modal => {
      modal.classList.add('hidden');
    });
  }
  
  showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }
  
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    const colors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    };
    
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    
    toast.className = `${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in`;
    toast.innerHTML = `
      <i class="${icons[type]}"></i>
      <span class="text-sm">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  updateUserUI() {
    const { user } = this.state;
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('user-role').textContent = user.role;
    document.getElementById('dropdown-user-name').textContent = user.name;
    document.getElementById('dropdown-user-email').textContent = user.email;
    
    if (user.avatar) {
      document.getElementById('user-avatar').src = user.avatar;
    }
  }
  
  logout() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
      // Clear session
      db.settings.delete('currentUser');
      
      // Reload or redirect to login
      location.reload();
    }
  }
  
  // ==================== BRIDGE API (for addons) ====================
  async askAI(prompt, provider = 'gemini') {
    const aiKey = await db.aiKeys.get(provider);
    if (!aiKey || !aiKey.apiKey) {
      throw new Error(`API Key untuk ${provider} tidak ditemukan`);
    }
    
    if (window.TemenBossAPI?.ai?.ask) {
      return await window.TemenBossAPI.ai.ask({
        provider,
        apiKey: aiKey.apiKey,
        prompt
      });
    }
    
    throw new Error('AI API tidak tersedia');
  }
  
  async printStruk(data) {
    if (window.TemenBossAPI?.hardware?.print) {
      return await window.TemenBossAPI.hardware.print(data);
    }
    throw new Error('Printer tidak tersedia');
  }
  
  async scanBarcode() {
    if (window.TemenBossAPI?.hardware?.scan) {
      return await window.TemenBossAPI.hardware.scan();
    }
    throw new Error('Scanner tidak tersedia');
  }
}

// ==================== INITIALIZE APP ====================
const app = new TemenBossApp();

// ==================== GLOBAL EXPOSE (for addons) ====================
window.TemenBoss = {
  askAI: (prompt, provider) => app.askAI(prompt, provider),
  printStruk: (data) => app.printStruk(data),
  scanBarcode: () => app.scanBarcode(),
  getTheme: () => app.state.currentTheme,
  getUser: () => app.state.user,
  showToast: (msg, type) => app.showToast(msg, type)
};

// ==================== MESSAGE LISTENER (from addons) ====================
window.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'REQUEST_THEME':
      event.source.postMessage({
        type: 'THEME_CHANGE',
        theme: app.state.currentTheme
      }, '*');
      break;
      
    case 'SHOW_TOAST':
      app.showToast(data.message, data.type);
      break;
      
    case 'NAVIGATE':
      app.navigateTo(data.view, data.params);
      break;
  }
});

console.log('[TemenBoss] App.js loaded successfully');
