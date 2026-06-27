// ==========================================
// Orbit v3.5 - 月次振り返りコンポーネント
// ==========================================

import { el, clearElement, getCurrentYearMonth, formatDate, getSubtaskProgress } from '../utils.js';
import { t, getYearMonthOptionsI18n, formatYearMonthI18n } from '../i18n.js';
import { getReviewByYearMonth, saveReview, getAllReviews, getActiveAreas, getAllAreas, getAreaById, getAllGoals, updateGoal, updateArea } from '../store.js';

function isActiveInMonth(item, yearMonth) {
  const [y, m] = yearMonth.split('-');
  const startOfMonth = `${yearMonth}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const endOfMonth = `${yearMonth}-${lastDay.toString().padStart(2, '0')}`;
  
  const start = item.startDate || '';
  const end = item.completedDate || '';

  if (start && start > endOfMonth) return false;
  
  if (end) {
    if (end < startOfMonth) return false;
  } else {
    // If no completedDate, but it's archived, fallback to checking updatedAt
    if (item.archived && item.updatedAt) {
      const updatedMonth = item.updatedAt.slice(0, 7);
      if (updatedMonth < yearMonth) return false;
    }
  }
  
  return true;
}

export function renderMonthlyReview(container) {
  clearElement(container);

  let selectedMonth = getCurrentYearMonth();

  // ページヘッダー
  const header = el('div', { className: 'page-header' },
    el('div', {},
      el('h1', { className: 'page-title' },
        el('i', { 'data-lucide': 'calendar-check' }),
        el('span', {}, ` ${t('review.title')}`)
      ),
      el('p', { className: 'page-subtitle' }, t('review.subtitle'))
    )
  );
  container.appendChild(header);

  // 月選択
  const controlBar = el('div', { className: 'review-controls' });

  const monthSelect = el('select', {
    className: 'form-input month-select',
    onChange: (e) => {
      selectedMonth = e.target.value;
      renderReviewForm();
    }
  });
  getYearMonthOptionsI18n().forEach(opt => {
    const option = el('option', { value: opt.value }, opt.label);
    if (opt.value === selectedMonth) option.selected = true;
    monthSelect.appendChild(option);
  });
  controlBar.appendChild(
    el('div', { className: 'review-month-selector' },
      el('label', { className: 'form-label' }, t('review.selectMonth')),
      monthSelect
    )
  );

  container.appendChild(controlBar);

  // レビューフォーム
  const reviewContainer = el('div', { className: 'review-form-container' });
  container.appendChild(reviewContainer);

  // 過去のレビュー一覧
  const pastReviewsSection = el('div', { className: 'glass-card past-reviews-section' },
    el('h2', { className: 'card-title' },
      el('i', { 'data-lucide': 'history' }),
      el('span', {}, ` ${t('review.pastReviews')}`)
    )
  );
  renderPastReviews(pastReviewsSection);
  container.appendChild(pastReviewsSection);

  function renderReviewForm() {
    clearElement(reviewContainer);

    const review = getReviewByYearMonth(selectedMonth);
    const monthLabel = formatYearMonthI18n(selectedMonth);

    const formCard = el('div', { className: 'glass-card review-form-card' });

    formCard.appendChild(
      el('h2', { className: 'card-title review-title' }, t('review.reviewOf', monthLabel))
    );

    const form = el('form', { className: 'review-form', onSubmit: (e) => {
      e.preventDefault();
      handleSave(e.target, selectedMonth, reviewGoals, reviewAreas);
    }});

    // 対象のAreaと目標をフィルタリング
    const allAreas = getAllAreas();
    const reviewAreas = allAreas.filter(a => isActiveInMonth(a, selectedMonth));

    const allGoals = getAllGoals();
    const reviewGoals = allGoals.filter(g => {
      if (g.category === 'resources') return false;
      return isActiveInMonth(g, selectedMonth);
    });

    const routines = reviewGoals.filter(g => g.category === 'routines');
    const projects = reviewGoals.filter(g => g.category === 'projects');

    // 0. Areas セクション
    const areasSection = el('div', { className: 'review-category-section', style: 'margin-bottom: 24px;' },
      el('h3', { className: 'card-title', style: 'border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px; margin-bottom: 16px;' },
        el('i', { 'data-lucide': 'target', style: 'color: #3B82F6;' }),
        el('span', {}, ` Areas`)
      )
    );

    if (reviewAreas.length === 0) {
      areasSection.appendChild(
        el('p', { style: 'color: var(--text-tertiary); font-size: 0.88rem; padding-left: 8px;' }, '今月アクティブなAreaはありません。')
      );
    } else {
      const grid = el('div', { style: 'display: grid; grid-template-columns: 1fr; gap: 12px;' });
      reviewAreas.forEach(area => {
        grid.appendChild(createReviewAreaCard(area, review));
      });
      areasSection.appendChild(grid);
    }
    form.appendChild(areasSection);

    // 1. Routines (習慣) セクション
    const routinesSection = el('div', { className: 'review-category-section', style: 'margin-bottom: 24px;' },
      el('h3', { className: 'card-title', style: 'border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px; margin-bottom: 16px;' },
        el('i', { 'data-lucide': 'repeat', style: 'color: #F59E0B;' }),
        el('span', {}, ` ${t('cat.routines')}`)
      )
    );

    if (routines.length === 0) {
      routinesSection.appendChild(
        el('p', { style: 'color: var(--text-tertiary); font-size: 0.88rem; padding-left: 8px;' }, '今月のRoutines目標はありません。')
      );
    } else {
      const grid = el('div', { style: 'display: grid; grid-template-columns: 1fr; gap: 12px;' });
      routines.forEach(goal => {
        grid.appendChild(createReviewGoalCard(goal, review));
      });
      routinesSection.appendChild(grid);
    }
    form.appendChild(routinesSection);

    // 2. Projects (プロジェクト) セクション
    const projectsSection = el('div', { className: 'review-category-section', style: 'margin-bottom: 24px;' },
      el('h3', { className: 'card-title', style: 'border-bottom: 1px solid var(--border-subtle); padding-bottom: 8px; margin-bottom: 16px;' },
        el('i', { 'data-lucide': 'rocket', style: 'color: #8B5CF6;' }),
        el('span', {}, ` ${t('cat.projects')}`)
      )
    );

    if (projects.length === 0) {
      projectsSection.appendChild(
        el('p', { style: 'color: var(--text-tertiary); font-size: 0.88rem; padding-left: 8px;' }, '今月のProjects目標はありません。')
      );
    } else {
      const grid = el('div', { style: 'display: grid; grid-template-columns: 1fr; gap: 12px;' });
      projects.forEach(goal => {
        grid.appendChild(createReviewGoalCard(goal, review));
      });
      projectsSection.appendChild(grid);
    }
    form.appendChild(projectsSection);

    // 3. 全体の振り返り セクション
    const overallSection = el('div', { className: 'review-section', style: 'margin-top: 16px; border-top: 1px solid var(--border-subtle); padding-top: 16px;' },
      el('div', { className: 'review-section-header', style: 'margin-bottom: 10px;' },
        el('div', { className: 'review-section-dot', style: 'background: #6366F1' }),
        el('label', { className: 'form-label review-section-label' }, t('review.overallReview'))
      )
    );
    const overallTextarea = el('textarea', {
      name: 'overallReview',
      className: 'form-input form-textarea review-textarea',
      placeholder: t('review.overallPlaceholder'),
      rows: '4'
    });
    overallTextarea.value = review?.overallReview || '';
    overallSection.appendChild(overallTextarea);
    form.appendChild(overallSection);

    // 保存ボタン
    form.appendChild(
      el('div', { className: 'review-actions', style: 'margin-top: 16px;' },
        el('button', { type: 'submit', className: 'btn btn-primary btn-lg' },
          el('i', { 'data-lucide': 'save' }),
          el('span', {}, t('review.save'))
        )
      )
    );

    formCard.appendChild(form);
    reviewContainer.appendChild(formCard);

    if (window.lucide) window.lucide.createIcons();
  }

  function createReviewAreaCard(area, review) {
    let isAchieved = false;
    let commentText = '';

    if (review && review.goals && review.goals[area.id]) {
      isAchieved = !!review.goals[area.id].achieved;
      commentText = review.goals[area.id].comment || '';
    } else {
      if (area.archived) {
        isAchieved = true;
      }
    }

    const checkbox = el('input', {
      type: 'checkbox',
      id: `achieved-${area.id}`,
      checked: isAchieved,
      style: 'cursor: pointer; accent-color: var(--accent-primary); width: 16px; height: 16px; margin: 0;'
    });

    const checkLabel = el('label', {
      htmlFor: `achieved-${area.id}`,
      style: 'display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 550; cursor: pointer; color: var(--text-primary); user-select: none;'
    }, checkbox, el('span', {}, '完了'));

    const textarea = el('textarea', {
      id: `comment-${area.id}`,
      className: 'form-input form-textarea',
      placeholder: 'このAreaに関する振り返りを記入...',
      rows: '2',
      style: 'margin-top: 8px; font-size: 0.82rem; resize: vertical; min-height: 48px;'
    });
    textarea.value = commentText;

    const card = el('div', {
      className: 'glass-card',
      style: 'padding: 14px; border: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 4px; background: rgba(255, 255, 255, 0.015);'
    },
      el('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;' },
        el('div', { style: 'display: flex; align-items: center; gap: 8px; min-width: 0;' },
          el('span', { style: `width: 8px; height: 8px; border-radius: 50%; background: ${area.color}; flex-shrink: 0;` }),
          el('div', { style: 'min-width: 0;' },
            el('span', { style: 'font-size: 0.88rem; font-weight: 600; color: var(--text-primary); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;' }, area.name),
            el('span', { style: 'font-size: 0.72rem; color: var(--text-secondary);' }, 'Area')
          )
        ),
        checkLabel
      ),
      textarea
    );

    return card;
  }

  function createReviewGoalCard(goal, review) {
    const area = getAreaById(goal.areaId);
    const areaName = area ? area.name : 'Unknown';
    const areaColor = area ? area.color : '#6366F1';

    let isAchieved = false;
    let commentText = '';

    // 保存されているデータがある場合は復元
    if (review && review.goals && review.goals[goal.id]) {
      isAchieved = !!review.goals[goal.id].achieved;
      commentText = review.goals[goal.id].comment || '';
    } else {
      // 保存データがない場合、プロジェクトが完了状態であればデフォルトで達成チェックをオンにする
      if (goal.category === 'projects' && goal.status === 'completed') {
        isAchieved = true;
      }
    }

    const checkbox = el('input', {
      type: 'checkbox',
      id: `achieved-${goal.id}`,
      checked: isAchieved,
      style: 'cursor: pointer; accent-color: var(--accent-primary); width: 16px; height: 16px; margin: 0;'
    });

    const checkLabel = el('label', {
      htmlFor: `achieved-${goal.id}`,
      style: 'display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 550; cursor: pointer; color: var(--text-primary); user-select: none;'
    }, checkbox, el('span', {}, '達成'));

    const textarea = el('textarea', {
      id: `comment-${goal.id}`,
      className: 'form-input form-textarea',
      placeholder: 'この目標に関する振り返りを記入...',
      rows: '2',
      style: 'margin-top: 8px; font-size: 0.82rem; resize: vertical; min-height: 48px;'
    });
    textarea.value = commentText;

    // メタテキストの作成
    let metaText = '';
    if (goal.category === 'routines' && goal.frequency) {
      const fMap = { daily: t('frequency.daily'), weekly: t('frequency.weekly'), monthly: t('frequency.monthly'), custom: goal.frequencyCustom || t('frequency.custom') };
      metaText = `${t('dashboard.colFrequency')}: ${fMap[goal.frequency] || goal.frequency}`;
    } else if (goal.category === 'projects') {
      const progress = getSubtaskProgress(goal.subtasks);
      const progressPct = progress ? `${progress.percent}%` : '0%';
      const dueStr = goal.dueDate ? `${t('dashboard.colDueDate')}: ${formatDate(goal.dueDate)}` : t('dashboard.colDueDate') + ': ' + t('dashboard.noDueSoon');
      metaText = `${t('dashboard.colProgress')}: ${progressPct} · ${dueStr}`;
    }

    const card = el('div', {
      className: 'glass-card',
      style: 'padding: 14px; border: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 4px; background: rgba(255, 255, 255, 0.015);'
    },
      el('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;' },
        el('div', { style: 'display: flex; align-items: center; gap: 8px; min-width: 0;' },
          el('span', { style: `width: 8px; height: 8px; border-radius: 50%; background: ${areaColor}; flex-shrink: 0;` }),
          el('div', { style: 'min-width: 0;' },
            el('span', { style: 'font-size: 0.88rem; font-weight: 600; color: var(--text-primary); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;' }, goal.title),
            el('span', { style: 'font-size: 0.72rem; color: var(--text-secondary);' }, `${areaName} · ${metaText}`)
          )
        ),
        checkLabel
      ),
      textarea
    );

    return card;
  }

  function handleSave(form, yearMonth, reviewGoals, reviewAreas) {
    const goalsData = {};
    const combined = [...reviewGoals, ...reviewAreas];

    combined.forEach(item => {
      const checkbox = document.getElementById(`achieved-${item.id}`);
      const commentArea = document.getElementById(`comment-${item.id}`);

      const achieved = checkbox ? checkbox.checked : false;
      const comment = commentArea ? commentArea.value.trim() : '';

      goalsData[item.id] = { achieved, comment };

      // Projectsカテゴリの目標についての相互リレーション処理
      if (item.category === 'projects') {
        if (achieved && item.status !== 'completed') {
          updateGoal(item.id, { status: 'completed' });
        } else if (!achieved && item.status === 'completed') {
          updateGoal(item.id, { status: 'active' });
        }
      }
    });

    saveReview({
      yearMonth,
      categoryReviews: {},
      overallReview: form.overallReview.value.trim(),
      goals: goalsData
    });

    showToast(t('review.saved'));
    renderReviewForm(); // 保存後に再描画して状態を連動
    renderPastReviews(pastReviewsSection);
  }

  function renderPastReviews(section) {
    const existingList = section.querySelector('.past-reviews-list');
    if (existingList) existingList.remove();
    const existingEmpty = section.querySelector('.empty-state');
    if (existingEmpty) existingEmpty.remove();

    const reviews = getAllReviews().sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));

    if (reviews.length === 0) {
      section.appendChild(
        el('div', { className: 'empty-state small' },
          el('p', {}, t('review.noReviews'))
        )
      );
    } else {
      const list = el('div', { className: 'past-reviews-list' });
      reviews.forEach(r => {
        // 目標コメントまたは全体コメントの記入有無を判定
        const hasGoalsContent = r.goals && Object.values(r.goals).some(g => g.comment && g.comment.trim().length > 0);
        const hasOverall = r.overallReview && r.overallReview.trim().length > 0;
        const hasContent = hasGoalsContent || hasOverall;

        const item = el('div', {
          className: 'past-review-item',
          onClick: () => {
            monthSelect.value = r.yearMonth;
            selectedMonth = r.yearMonth;
            renderReviewForm();
            reviewContainer.scrollIntoView({ behavior: 'smooth' });
          }
        },
          el('span', { className: 'past-review-month' }, formatYearMonthI18n(r.yearMonth)),
          el('span', { className: `past-review-status ${hasContent ? 'written' : ''}` },
            hasContent ? t('review.written') : t('review.notWritten')
          )
        );
        list.appendChild(item);
      });
      section.appendChild(list);
    }

    if (window.lucide) window.lucide.createIcons();
  }

  renderReviewForm();
  if (window.lucide) window.lucide.createIcons();
}

function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = el('div', { className: 'toast' },
    el('i', { 'data-lucide': 'check-circle' }),
    el('span', {}, message)
  );
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('active'));

  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => toast.remove(), 300);
  }, 2500);

  if (window.lucide) window.lucide.createIcons();
}
