// ==========================================
// Orbit v3 - アプリ初期化・ルーティング
// ==========================================

import { renderSidebar } from './components/sidebar.js';
import { renderDashboard } from './components/dashboard.js';
import { renderAreaPage } from './components/area-page.js';
import { renderMonthlyReview } from './components/monthly-review.js';
import { renderArchives } from './components/archives.js';
import { migrateIfNeeded, getFullData, restoreFullData, getLastModified, initializeSampleDataIfNeeded } from './store.js';
import { initDriveApi, isDriveAuthorized, downloadBackup, uploadBackup, findExistingBackupFile } from './services/drive-api.js';

export const appState = { syncStatus: 'init' };
let syncDebounceTimer = null;

let currentPage = 'dashboard';

const sidebarEl = document.getElementById('sidebar');
const mainContentEl = document.getElementById('main-content');

function navigateTo(page) {
  currentPage = page;
  renderSidebar(sidebarEl, currentPage, navigateTo);
  renderPage();
}

export function triggerSidebarRender() {
  if (sidebarEl.innerHTML !== '') {
    renderSidebar(sidebarEl, currentPage, navigateTo);
  }
}

function handleDriveStatusChange(status) {
  appState.syncStatus = status;
  if (status === 'authorized') {
    performStartupSync();
  } else {
    triggerSidebarRender();
  }
}

async function performStartupSync() {
  appState.syncStatus = 'syncing';
  triggerSidebarRender();

  try {
    const backupMeta = await findExistingBackupFile();
    if (backupMeta) {
      const driveModifiedStr = backupMeta.modifiedTime; 
      const driveModified = new Date(driveModifiedStr).getTime();
      const localModified = getLastModified();

      // Give 5 seconds buffer for timestamp skew
      if (driveModified > localModified + 5000) {
        const data = await downloadBackup();
        if (data) {
          restoreFullData(data);
          renderPage(); // Refresh UI
        }
      } else if (localModified > driveModified + 5000) {
        await uploadBackup(getFullData());
      }
    } else {
      await uploadBackup(getFullData());
    }
  } catch (err) {
    console.error('Startup sync failed', err);
    appState.syncStatus = 'error';
  }
  
  if (appState.syncStatus === 'syncing') appState.syncStatus = 'synced';
  triggerSidebarRender();
}

window.addEventListener('orbitDataChanged', () => {
  if (!isDriveAuthorized()) return;
  
  appState.syncStatus = 'syncing';
  triggerSidebarRender();

  clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(async () => {
    try {
      await uploadBackup(getFullData());
    } catch(err) {
      console.error(err);
      appState.syncStatus = 'error';
      triggerSidebarRender();
    }
  }, 5000); // 5 seconds debounce
});

function renderPage() {
  const refreshCurrentPage = () => navigateTo(currentPage);

  if (currentPage.startsWith('area-')) {
    const areaId = currentPage.replace('area-', '');
    renderAreaPage(mainContentEl, areaId, navigateTo, refreshCurrentPage);
    return;
  }

  switch (currentPage) {
    case 'dashboard':
      renderDashboard(mainContentEl, navigateTo);
      break;
    case 'monthly-review':
      renderMonthlyReview(mainContentEl);
      break;
    case 'archives':
      renderArchives(mainContentEl, refreshCurrentPage);
      break;
    default:
      renderDashboard(mainContentEl, navigateTo);
  }
}

// 初期レンダリング
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('orbit_theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }

  migrateIfNeeded(); // v2からのマイグレーション
  initializeSampleDataIfNeeded(); // サンプルデータの投入
  initDriveApi(handleDriveStatusChange);

  const openBtn = document.getElementById('sidebar-open-btn');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      document.querySelector('.app-layout').classList.remove('sidebar-collapsed');
    });
  }

  navigateTo('dashboard');
});
