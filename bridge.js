/**
 * TemenBoss - Bridge Script for WebViews
 * This script is injected into webviews to enable communication with the shell
 */

(function() {
  'use strict';
  
  console.log('[TemenBoss Bridge] Initialized in webview');
  
  // ==================== BRIDGE API ====================
  const TemenBossBridge = {
    version: '1.0.0',
    
    /**
     * Send message to parent shell
     */
    postToParent(type, data) {
      if (window.parent !== window) {
        window.parent.postMessage({
          type,
          data,
          source: 'temenboss-webview',
          timestamp: new Date().toISOString()
        }, '*');
      }
    },
    
    /**
     * Request current theme from parent
     */
    requestTheme() {
      this.postToParent('REQUEST_THEME', {});
    },
    
    /**
     * Show toast notification in parent shell
     */
    showToast(message, type = 'info') {
      this.postToParent('SHOW_TOAST', { message, type });
    },
    
    /**
     * Navigate to a view in parent shell
     */
    navigate(view, params = {}) {
      this.postToParent('NAVIGATE', { view, params });
    },
    
    /**
     * Get user info from parent
     */
    getUser() {
      return new Promise((resolve) => {
        const handler = (event) => {
          if (event.data.type === 'USER_INFO_RESPONSE') {
            window.removeEventListener('message', handler);
            resolve(event.data.user);
          }
        };
        window.addEventListener('message', handler);
        this.postToParent('REQUEST_USER_INFO', {});
        
        // Timeout after 5 seconds
        setTimeout(() => {
          window.removeEventListener('message', handler);
          resolve(null);
        }, 5000);
      });
    },
    
    /**
     * Print data via parent shell hardware API
     */
    async print(data) {
      this.postToParent('HARDWARE_PRINT', data);
    },
    
    /**
     * Scan barcode via parent shell hardware API
     */
    async scanBarcode() {
      return new Promise((resolve) => {
        const handler = (event) => {
          if (event.data.type === 'SCAN_RESULT') {
            window.removeEventListener('message', handler);
            resolve(event.data.barcode);
          }
        };
        window.addEventListener('message', handler);
        this.postToParent('HARDWARE_SCAN', {});
        
        setTimeout(() => {
          window.removeEventListener('message', handler);
          resolve(null);
        }, 30000); // 30 second timeout for scan
      });
    },
    
    /**
     * Open cash drawer via parent shell hardware API
     */
    async openCashDrawer() {
      this.postToParent('HARDWARE_OPEN_CASHDRAWER', {});
    },
    
    /**
     * Query AI via parent shell
     */
    async askAI(prompt, provider = 'gemini') {
      return new Promise((resolve) => {
        const handler = (event) => {
          if (event.data.type === 'AI_RESPONSE') {
            window.removeEventListener('message', handler);
            resolve(event.data.response);
          }
        };
        window.addEventListener('message', handler);
        this.postToParent('AI_ASK', { prompt, provider });
        
        setTimeout(() => {
          window.removeEventListener('message', handler);
          resolve(null);
        }, 30000);
      });
    },
    
    /**
     * Save data to parent shell's IndexedDB
     */
    async saveData(store, data) {
      this.postToParent('DB_SAVE', { store, data });
    },
    
    /**
     * Load data from parent shell's IndexedDB
     */
    async loadData(store, query = {}) {
      return new Promise((resolve) => {
        const handler = (event) => {
          if (event.data.type === 'DB_LOAD_RESPONSE') {
            window.removeEventListener('message', handler);
            resolve(event.data.data);
          }
        };
        window.addEventListener('message', handler);
        this.postToParent('DB_LOAD', { store, query });
        
        setTimeout(() => {
          window.removeEventListener('message', handler);
          resolve(null);
        }, 5000);
      });
    }
  };
  
  // ==================== MESSAGE LISTENER ====================
  window.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    switch (type) {
      case 'THEME_CHANGE':
        // Apply theme to webview
        const html = document.documentElement;
        if (data.theme === 'dark') {
          html.classList.add('dark');
        } else {
          html.classList.remove('dark');
        }
        
        // Dispatch custom event for webview apps
        window.dispatchEvent(new CustomEvent('temenboss:themechange', {
          detail: { theme: data.theme }
        }));
        break;
        
      case 'INIT':
        // Initialize webview with data from parent
        window.dispatchEvent(new CustomEvent('temenboss:init', {
          detail: data
        }));
        break;
        
      case 'USER_INFO_RESPONSE':
        // User info response
        window.dispatchEvent(new CustomEvent('temenboss:userinfo', {
          detail: data
        }));
        break;
        
      case 'SCAN_RESULT':
        // Barcode scan result
        window.dispatchEvent(new CustomEvent('temenboss:scanresult', {
          detail: data
        }));
        break;
        
      case 'AI_RESPONSE':
        // AI response
        window.dispatchEvent(new CustomEvent('temenboss:airesponse', {
          detail: data
        }));
        break;
        
      case 'PRINT_COMPLETE':
        // Print complete
        window.dispatchEvent(new CustomEvent('temenboss:printcomplete', {
          detail: data
        }));
        break;
        
      case 'CASHDRAWER_OPENED':
        // Cash drawer opened
        window.dispatchEvent(new CustomEvent('temenboss:cashdrawer', {
          detail: data
        }));
        break;
    }
  });
  
  // ==================== EXPOSE GLOBALLY ====================
  window.TemenBossBridge = TemenBossBridge;
  
  // Also expose as TemenBoss for consistency
  window.TemenBoss = TemenBossBridge;
  
  // ==================== AUTO-INIT ====================
  // Request theme on load
  TemenBossBridge.requestTheme();
  
  console.log('[TemenBoss Bridge] Ready. Use window.TemenBossBridge or window.TemenBoss to access the API.');
})();
