import { el } from '../utils.js';
import { t, getLang } from '../i18n.js';

export function openSyncConflictModal({ localModified, driveModified }) {
  return new Promise(resolve => {
    let settled = false;

    const finish = (choice) => {
      if (settled) return;
      settled = true;
      overlay.classList.remove('active');
      modal.classList.remove('active');
      setTimeout(() => overlay.remove(), 200);
      resolve(choice);
    };

    const formatDate = (timestamp) => new Date(timestamp).toLocaleString(
      getLang() === 'ja' ? 'ja-JP' : 'en-US'
    );

    const overlay = el('div', {
      className: 'modal-overlay',
      onClick: (event) => {
        if (event.target === overlay) finish('cancel');
      }
    });
    const modal = el('div', { className: 'modal' });

    modal.append(
      el('div', { className: 'modal-header' },
        el('h2', { className: 'modal-title' }, t('syncConflict.title')),
        el('button', {
          className: 'modal-close',
          'aria-label': t('syncConflict.cancel'),
          onClick: () => finish('cancel')
        }, el('i', { 'data-lucide': 'x' }))
      ),
      el('div', { className: 'modal-form' },
        el('p', { style: 'color: var(--text-secondary); line-height: 1.7; margin-bottom: 16px;' }, t('syncConflict.description')),
        el('div', { style: 'display: grid; gap: 8px; padding: 14px; margin-bottom: 18px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-tertiary);' },
          el('div', { style: 'display: flex; justify-content: space-between; gap: 16px;' },
            el('span', { style: 'color: var(--text-secondary);' }, t('syncConflict.localUpdated')),
            el('strong', {}, formatDate(localModified))
          ),
          el('div', { style: 'display: flex; justify-content: space-between; gap: 16px;' },
            el('span', { style: 'color: var(--text-secondary);' }, t('syncConflict.driveUpdated')),
            el('strong', {}, formatDate(driveModified))
          )
        ),
        el('p', { style: 'font-size: 0.85rem; color: var(--text-tertiary); line-height: 1.6; margin-bottom: 18px;' }, t('syncConflict.note')),
        el('div', { className: 'modal-buttons', style: 'flex-wrap: wrap;' },
          el('button', { type: 'button', className: 'btn btn-ghost', onClick: () => finish('cancel') }, t('syncConflict.cancel')),
          el('button', { type: 'button', className: 'btn btn-ghost', onClick: () => finish('local') }, t('syncConflict.useLocal')),
          el('button', { type: 'button', className: 'btn btn-primary', onClick: () => finish('drive') }, t('syncConflict.useDrive'))
        )
      )
    );

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      overlay.classList.add('active');
      modal.classList.add('active');
    });
    if (window.lucide) window.lucide.createIcons();
  });
}
