// ===== 상태 관리 =====
// localStorage 안전 래퍼 (file://·프라이빗 모드 등 차단 환경에서도 앱이 멈추지 않도록)
const memoryStore = {};
const safeStorage = {
  getItem(k) {
    try { return localStorage.getItem(k); }
    catch { return (k in memoryStore) ? memoryStore[k] : null; }
  },
  setItem(k, v) {
    try { localStorage.setItem(k, v); }
    catch { memoryStore[k] = String(v); }
  }
};

// 날짜별 완료 기록 (영구 저장, 절대 리셋 안 함)
// 구조: { "2026-9-12": ["mon-1", "mon-2", ...], ... }
const DAILY_STORE_KEY = 'routine_daily_v2';

// ===== 한국시간(KST) 기준 처리 =====
// 기기 시간대와 무관하게 항상 한국시간(UTC+9)으로 계산한다.
// Date 객체의 UTC 값에 +9시간을 더해, 그 UTC 필드를 'KST 벽시계 값'으로 사용한다.
function nowKST() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

// KST "오늘"을 나타내는 Date (자정 기준). 넘겨보기용 viewDate의 기준점.
function kstToday() {
  const k = nowKST();
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()));
}

// 사용자가 넘겨보는 날짜 (기본: 오늘). 표시(미사/오늘 할 일/루틴)에만 영향.
let viewDate = kstToday();

// viewDate 기준 날짜 문자열/요일 (표시용)
function getTodayStr() {
  return `${viewDate.getUTCFullYear()}-${viewDate.getUTCMonth()+1}-${viewDate.getUTCDate()}`;
}
function getTodayDow() {
  return viewDate.getUTCDay(); // 0=일 ~ 6=토
}

// ===== 날짜별 영구 저장 (절대 리셋 안 함) =====
function loadDailyStore() {
  try {
    return JSON.parse(safeStorage.getItem(DAILY_STORE_KEY) || '{}');
  } catch { return {}; }
}
function saveDailyStore(store) {
  safeStorage.setItem(DAILY_STORE_KEY, JSON.stringify(store));
}

// 전체 날짜별 기록 (메모리 캐시)
let dailyStore = loadDailyStore();

// 특정 날짜(키)의 완료 Set 얻기
function getDoneSetFor(dateKey) {
  const arr = dailyStore[dateKey] || [];
  return new Set(arr);
}

// 특정 날짜의 task 완료 여부
function isDoneOn(dateKey, taskId) {
  const arr = dailyStore[dateKey];
  return Array.isArray(arr) && arr.includes(taskId);
}

// 특정 날짜의 task 완료 토글 → 영구 저장
function toggleDoneOn(dateKey, taskId) {
  const set = getDoneSetFor(dateKey);
  if (set.has(taskId)) set.delete(taskId);
  else set.add(taskId);
  if (set.size === 0) delete dailyStore[dateKey];
  else dailyStore[dateKey] = [...set];
  saveDailyStore(dailyStore);
}

// 현재 보고 있는 날짜(viewDate)의 완료 Set
function currentDoneSet() {
  return getDoneSetFor(getTodayStr());
}

// ===== 유틸 =====
// viewDate가 실제 오늘(KST)인지
function isViewingToday() {
  const t = kstToday();
  return viewDate.getTime() === t.getTime();
}

// 현재 시각(분). 마감 강조용 — 오늘을 볼 때만 실제 KST 시각, 아니면 0시로 취급
function getNow() {
  if (!isViewingToday()) return 0;
  const k = nowKST();
  return k.getUTCHours() * 60 + k.getUTCMinutes();
}

function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h < 12 ? '오전' : '오후';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${ampm} ${hour}:${String(m).padStart(2,'0')}`;
}

// ===== 오늘 날짜 표시 =====
function renderHeader() {
  const days = ['일','월','화','수','목','금','토'];
  const badge = document.getElementById('todayBadge');
  const mon = viewDate.getUTCMonth() + 1;
  const day = viewDate.getUTCDate();
  const dow = days[viewDate.getUTCDay()];
  const todayMark = isViewingToday() ? '' : ' · 다른 날 보기';
  badge.textContent = `${mon}월 ${day}일 (${dow})${todayMark}`;
}

// ===== 날짜 넘기기 =====
function shiftView(deltaDays) {
  const d = new Date(viewDate.getTime());
  d.setUTCDate(d.getUTCDate() + deltaDays);
  viewDate = d;
  render();
}
function resetViewToToday() {
  viewDate = kstToday();
  render();
}

// ===== 카드 생성 =====
function createTaskCard(task, showCheckbox = true) {
  const dateKey = getTodayStr();
  const isDone = isDoneOn(dateKey, task.id);
  const cat = CATEGORY_META[task.category] || CATEGORY_META.work;
  const nowMin = getNow();
  const taskMin = timeToMinutes(task.time);

  // 곧 다가오는 마감 강조 (2시간 이내)
  const isUrgent = task.deadline && taskMin !== null
    && taskMin > nowMin && (taskMin - nowMin) <= 120;

  const card = document.createElement('div');
  card.className = [
    'task-card',
    `cat-${task.category}`,
    task.deadline ? 'deadline' : '',
    isDone ? 'done' : ''
  ].filter(Boolean).join(' ');

  // 체크 버튼
  const checkBtn = showCheckbox ? `
    <button class="check-btn" data-id="${task.id}" title="완료 토글">
      ${isDone ? '✓' : ''}
    </button>` : '';

  // 배지
  const catBadge = `<span class="badge badge-cat cat-${task.category}">${cat.label}</span>`;
  const deadlineBadge = task.deadline
    ? `<span class="badge badge-deadline">${isUrgent ? '⚠️ 곧 마감' : '마감'}</span>`
    : '';
  const flexBadge = task.flexible
    ? `<span class="badge badge-flexible">유동</span>`
    : '';
  const timeBadge = task.time
    ? `<span style="font-size:0.72rem;color:#6B7280;">${formatTime(task.time)}</span>`
    : '';

  const noteBadge = task.note
    ? `<span class="task-note">📌 ${task.note}</span>`
    : '';

  card.innerHTML = `
    ${checkBtn}
    <span class="task-icon">${task.icon}</span>
    <div class="task-body">
      <div class="task-title">${task.title}</div>
      <div class="task-detail">${task.detail}</div>
      ${noteBadge}
    </div>
    <div class="task-badges">
      ${timeBadge}
      ${catBadge}
      ${deadlineBadge}
      ${flexBadge}
    </div>
  `;

  // 체크 토글 이벤트 (현재 보고 있는 날짜에 기록, 영구 저장)
  if (showCheckbox) {
    const btn = card.querySelector('.check-btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDoneOn(getTodayStr(), task.id);
      render();
    });
  }

  return card;
}

// 이번 주(viewDate 포함 주) 안에서 특정 그룹(예: 빨래)이 완료됐는지
// 주의 어느 날짜든 그 그룹의 task가 체크됐으면 true
function isGroupDoneInViewWeek(group) {
  // viewDate 기준 일요일 찾기
  const sunday = new Date(viewDate.getTime());
  sunday.setUTCDate(sunday.getUTCDate() - sunday.getUTCDay());
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday.getTime());
    d.setUTCDate(d.getUTCDate() + i);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`;
    const dow = d.getUTCDay();
    const tasks = WEEK_DATA[dow]?.tasks || [];
    for (const t of tasks) {
      if (t.group === group && isDoneOn(key, t.id)) return true;
    }
  }
  return false;
}

// ===== 오늘의 업무 렌더링 =====
function isTaskDone(task) {
  return isDoneOn(getTodayStr(), task.id);
}

function updateTodayProgress(visible) {
  const countEl = document.getElementById('todayCount');
  const barEl = document.getElementById('todayBar');
  const section = document.getElementById('todaySection');
  if (!countEl) return;

  const total = visible.length;
  const doneCount = visible.filter(isTaskDone).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const allDone = total > 0 && doneCount === total;

  countEl.textContent = allDone ? `🎉 ${doneCount} / ${total} 완료!` : `${doneCount} / ${total}`;
  if (barEl) barEl.style.width = pct + '%';
  if (section) section.classList.toggle('all-done', allDone);
}

function renderToday() {
  const dow = getTodayDow();
  const dayData = WEEK_DATA[dow];
  const container = document.getElementById('todayTasks');
  container.innerHTML = '';

  if (!dayData || !dayData.tasks.length) {
    container.innerHTML = '<p class="empty-msg">오늘은 등록된 할 일이 없어요 🎉</p>';
    updateTodayProgress([]);
    return;
  }

  const visible = dayData.tasks;

  // 시간순 정렬 (null은 마지막)
  const sorted = [...visible].sort((a, b) => {
    const ta = a.time ? timeToMinutes(a.time) : 9999;
    const tb = b.time ? timeToMinutes(b.time) : 9999;
    return ta - tb;
  });

  sorted.forEach(task => {
    container.appendChild(createTaskCard(task, true));
  });

  updateTodayProgress(visible);
}

// ===== 주간 그리드 렌더링 (viewDate가 속한 주 기준) =====
function renderWeekGrid() {
  const grid = document.getElementById('weekGrid');
  grid.innerHTML = '';

  // 실제 오늘(KST) 요일 — '오늘' 강조용
  const realToday = kstToday();
  const realTodayKey = `${realToday.getUTCFullYear()}-${realToday.getUTCMonth()+1}-${realToday.getUTCDate()}`;

  // viewDate가 속한 주의 일요일
  const sunday = new Date(viewDate.getTime());
  sunday.setUTCDate(sunday.getUTCDate() - sunday.getUTCDay());

  // 일~토 순서로
  for (let d = 0; d < 7; d++) {
    const cellDate = new Date(sunday.getTime());
    cellDate.setUTCDate(cellDate.getUTCDate() + d);
    const cellKey = `${cellDate.getUTCFullYear()}-${cellDate.getUTCMonth()+1}-${cellDate.getUTCDate()}`;
    const dayData = WEEK_DATA[d];
    const isToday = cellKey === realTodayKey;

    const col = document.createElement('div');
    col.className = `day-col${isToday ? ' today' : ''}`;

    const todayDot = isToday ? '<span class="today-dot"></span>' : '';
    col.innerHTML = `
      <div class="day-header">
        <span class="day-emoji">${dayData.emoji}</span>
        <div class="day-name">${dayData.label} ${cellDate.getUTCDate()}${todayDot}</div>
      </div>
      <div class="day-tasks" id="miniTasks-${d}"></div>
    `;

    grid.appendChild(col);

    const miniContainer = col.querySelector(`#miniTasks-${d}`);

    // 시간순 정렬
    const sorted = [...dayData.tasks].sort((a, b) => {
      const ta = a.time ? timeToMinutes(a.time) : 9999;
      const tb = b.time ? timeToMinutes(b.time) : 9999;
      return ta - tb;
    });

    sorted.forEach(task => {
      const isDone = isDoneOn(cellKey, task.id);
      const mini = document.createElement('div');
      mini.className = [
        'mini-task',
        `cat-${task.category}`,
        task.deadline ? 'is-deadline' : '',
        isDone ? 'done-mini' : ''
      ].filter(Boolean).join(' ');
      mini.textContent = `${task.icon} ${task.title}`;
      mini.title = task.detail;
      miniContainer.appendChild(mini);
    });
  }
}

// ===== 루틴(아침/저녁) 렌더링 =====
function renderRoutine(routine, stepsElId, progressElId, barElId) {
  const stepsEl = document.getElementById(stepsElId);
  const progressEl = document.getElementById(progressElId);
  const barEl = document.getElementById(barElId);
  stepsEl.innerHTML = '';

  const dateKey = getTodayStr();
  // 아직 완료 안 된 첫 스텝 = 현재 스텝
  const currentIdx = routine.findIndex(s => !isDoneOn(dateKey, s.id));

  routine.forEach((step, idx) => {
    const isDone = isDoneOn(dateKey, step.id);
    const isCurrent = idx === currentIdx;

    const row = document.createElement('div');
    row.className = [
      'step-row',
      isDone ? 'step-done' : '',
      isCurrent ? 'step-current' : ''
    ].filter(Boolean).join(' ');

    row.innerHTML = `
      <div class="step-num">${isDone ? '✓' : step.icon}</div>
      <div class="step-body">
        <div class="step-text">${step.title}</div>
        <div class="step-detail">${step.detail}</div>
      </div>
    `;

    row.addEventListener('click', () => { toggleDoneOn(dateKey, step.id); render(); });
    stepsEl.appendChild(row);
  });

  // 진행률
  const doneCount = routine.filter(s => isDoneOn(dateKey, s.id)).length;
  const pct = Math.round((doneCount / routine.length) * 100);
  progressEl.textContent = `${doneCount} / ${routine.length}`;
  if (barEl) barEl.style.width = pct + '%';
}

// ===== 시험 D-day 렌더링 =====
function daysUntil(dateStr) {
  // KST 오늘 자정 기준
  const today = kstToday(); // UTC 필드가 KST 날짜
  const [yy, mm, dd] = dateStr.split('-').map(Number);
  const target = new Date(Date.UTC(yy, mm - 1, dd));
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function formatExamDate(dateStr) {
  const days = ['일','월','화','수','목','금','토'];
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}. ${d.getMonth()+1}. ${d.getDate()} (${days[d.getDay()]})`;
}

const TYPE_LABEL = {
  exam:         '시험',
  report:       '보고서',
  presentation: '발표'
};

function renderExams() {
  const section = document.getElementById('examSection');
  const list = document.getElementById('examList');
  list.innerHTML = '';

  // 날짜 있는 항목: 아직 안 지난 것만, 가까운 순
  const dated = EXAMS
    .filter(e => e.date)
    .map(e => ({ ...e, dday: daysUntil(e.date) }))
    .filter(e => e.dday >= 0)
    .sort((a, b) => a.dday - b.dday);

  // 날짜 미정 항목 (항상 맨 아래 표시)
  const undated = EXAMS.filter(e => !e.date);

  const all = [...dated, ...undated];

  if (all.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = '';

  all.forEach(exam => {
    const typeLabel = TYPE_LABEL[exam.type] || '일정';
    const detailLine = exam.detail ? ` · ${exam.detail}` : '';

    // 날짜 미정
    if (exam.date == null) {
      const card = document.createElement('div');
      card.className = 'exam-card exam-tbd';
      card.innerHTML = `
        <span class="exam-icon">${exam.icon}</span>
        <div class="exam-body">
          <div class="exam-title">${exam.title} <span class="exam-type">${typeLabel}</span></div>
          <div class="exam-detail">${exam.subject}${detailLine}</div>
        </div>
        <div class="exam-dday exam-dday-tbd">
          <span class="dday-num">?</span>
          <span class="dday-label">날짜 미정</span>
        </div>
      `;
      list.appendChild(card);
      return;
    }

    const isUrgent = exam.dday <= 7;   // 7일 이내 빨간 강조
    const card = document.createElement('div');
    card.className = `exam-card ${isUrgent ? 'exam-urgent' : 'exam-soft'}`;

    const ddayText = exam.dday === 0 ? '오늘' : `D-${exam.dday}`;

    card.innerHTML = `
      <span class="exam-icon">${exam.icon}</span>
      <div class="exam-body">
        <div class="exam-title">${exam.title} <span class="exam-type">${typeLabel}</span></div>
        <div class="exam-detail">${exam.subject}${detailLine} · ${formatExamDate(exam.date)}</div>
      </div>
      <div class="exam-dday">
        <span class="dday-num">${ddayText}</span>
        <span class="dday-label">${exam.dday === 0 ? '제출일!' : '남음'}</span>
      </div>
    `;
    list.appendChild(card);
  });
}

// ===== 월간 달력 렌더링 (9~12월, 대학원 일정) =====
function renderCalendars() {
  const wrap = document.getElementById('calendars');
  if (!wrap) return;
  wrap.innerHTML = '';

  const dowLabels = ['일','월','화','수','목','금','토'];
  const months = [9, 10, 11, 12];
  const year = 2026; // EXAMS 기준 연도

  // 날짜별 일정 매핑: "YYYY-M-D" -> [{type, title, subject, icon}, ...]
  const eventsByDate = {};
  EXAMS.forEach(e => {
    if (!e.date) return;
    const d = new Date(e.date + 'T00:00:00');
    const key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
    (eventsByDate[key] = eventsByDate[key] || []).push(e);
  });

  const now = new Date();
  const todayKey = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;

  months.forEach(month => {
    const card = document.createElement('div');
    card.className = 'month-card';

    const firstDay = new Date(year, month - 1, 1).getDay(); // 1일의 요일
    const daysInMonth = new Date(year, month, 0).getDate();

    let html = `<div class="month-title">${year}년 ${month}월</div><div class="cal-grid">`;

    // 요일 헤더
    dowLabels.forEach((lbl, i) => {
      const cls = i === 0 ? 'sun' : i === 6 ? 'sat' : '';
      html += `<div class="cal-dow ${cls}">${lbl}</div>`;
    });

    // 앞쪽 빈 칸
    for (let i = 0; i < firstDay; i++) {
      html += `<div class="cal-cell empty"></div>`;
    }

    // 날짜 칸
    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${year}-${month}-${day}`;
      const events = eventsByDate[key] || [];
      const isToday = key === todayKey;
      const hasEvent = events.length > 0;

      const cellClass = ['cal-cell', hasEvent ? 'has-event' : '', isToday ? 'today' : '']
        .filter(Boolean).join(' ');

      let dots = '';
      let label = '';
      if (hasEvent) {
        dots = '<div class="cell-dots">' +
          events.map(e => `<span class="cell-dot type-${e.type}"></span>`).join('') +
          '</div>';
        // 라벨: 과목 축약 (첫 일정 기준, 2개 이상이면 +N)
        const first = events[0];
        const extra = events.length > 1 ? ` +${events.length - 1}` : '';
        label = `<div class="cell-label" title="${events.map(e => e.subject + ' ' + e.title).join(', ')}">${first.icon}${extra}</div>`;
      }

      html += `<div class="${cellClass}">
        <span class="cell-date">${day}</span>
        ${dots}${label}
      </div>`;
    }

    html += `</div>`;
    card.innerHTML = html;
    wrap.appendChild(card);
  });
}

// ===== 오늘의 미사 3줄 묵상 렌더링 =====
function renderMass() {
  const linesEl = document.getElementById('massLines');
  const krEl = document.getElementById('massKr');
  const usEl = document.getElementById('massUs');
  if (!linesEl) return;

  // 링크 연결
  if (typeof MASS_LINKS === 'object') {
    if (krEl && MASS_LINKS.kr) krEl.href = MASS_LINKS.kr;
    if (usEl && MASS_LINKS.us) usEl.href = MASS_LINKS.us;
  }

  const todayKey = getTodayStr();

  // 1) 자동화가 생성한 reflections.json 우선, 2) 없으면 data.js의 MASS_REFLECTIONS
  let lines = null;
  if (window.__MASS_AUTO && window.__MASS_AUTO[todayKey] && Array.isArray(window.__MASS_AUTO[todayKey].lines)) {
    lines = window.__MASS_AUTO[todayKey].lines;
  } else if (typeof MASS_REFLECTIONS === 'object' && MASS_REFLECTIONS[todayKey]) {
    lines = MASS_REFLECTIONS[todayKey];
  }

  linesEl.innerHTML = '';

  if (lines && lines.length) {
    lines.forEach(text => {
      const li = document.createElement('li');
      li.textContent = text;
      linesEl.appendChild(li);
    });
  } else {
    // 오늘 요약이 아직 없을 때 안내
    const li = document.createElement('li');
    li.className = 'mass-empty-row';
    li.innerHTML = `<span class="mass-empty">오늘의 3줄 묵상이 아직 없어요. 위 링크에서 오늘 본문을 읽어보세요 🙏<br>(Kiro에게 "오늘 미사 3줄 요약해줘"라고 하면 채워드려요.)</span>`;
    linesEl.appendChild(li);
  }
}

// ===== Daily 날짜 표시 & 주간 타이틀 =====
function renderDailyDate() {
  const el = document.getElementById('dailyDate');
  const nav = document.querySelector('.daily-nav');
  if (!el) return;
  const days = ['일','월','화','수','목','금','토'];
  const mon = viewDate.getUTCMonth() + 1;
  const day = viewDate.getUTCDate();
  const dow = days[viewDate.getUTCDay()];
  const year = viewDate.getUTCFullYear();

  let label;
  const t = kstToday();
  const diff = Math.round((viewDate - t) / 86400000);
  if (diff === 0) label = '오늘';
  else if (diff === -1) label = '어제';
  else if (diff === 1) label = '내일';
  else label = `${diff > 0 ? '+' : ''}${diff}일`;

  el.innerHTML = `${mon}월 ${day}일 (${dow})<span class="daily-date-sub">${year} · ${label}</span>`;
  if (nav) nav.classList.toggle('not-today', diff !== 0);
}

function renderWeekTitle() {
  const el = document.getElementById('weekTitle');
  if (!el) return;
  const sunday = new Date(viewDate.getTime());
  sunday.setUTCDate(sunday.getUTCDate() - sunday.getUTCDay());
  const sat = new Date(sunday.getTime());
  sat.setUTCDate(sat.getUTCDate() + 6);

  // 이번 주인지
  const realSunday = kstToday();
  realSunday.setUTCDate(realSunday.getUTCDate() - realSunday.getUTCDay());
  const isThisWeek = sunday.getTime() === realSunday.getTime();

  const fmt = (d) => `${d.getUTCMonth()+1}.${d.getUTCDate()}`;
  el.textContent = `🗓️ ${fmt(sunday)} ~ ${fmt(sat)}${isThisWeek ? ' (이번 주)' : ''}`;
}

// ===== 전체 렌더 =====
function render() {
  renderHeader();
  renderDailyDate();
  renderWeekTitle();
  renderMass();
  renderExams();
  renderCalendars();

  const dow = getTodayDow();
  const isWeekday = dow >= 1 && dow <= 5; // 월~금

  // 아침 루틴: 월~금만
  const morningSection = document.getElementById('morningSection');
  if (isWeekday) {
    morningSection.style.display = '';
    renderRoutine(MORNING_ROUTINE, 'morningSteps', 'morningProgress', 'morningBar');
  } else {
    morningSection.style.display = 'none';
  }

  renderToday();

  // 퇴근 후 루틴: 월~금만
  const eveningSection = document.getElementById('eveningSection');
  if (isWeekday) {
    eveningSection.style.display = '';
    renderRoutine(EVENING_ROUTINE, 'eveningSteps', 'eveningProgress', 'eveningBar');
  } else {
    eveningSection.style.display = 'none';
  }

  renderWeekGrid();
}

// ===== 탭 전환 =====
function switchTab(tab) {
  const isWeekly = tab === 'weekly';
  document.getElementById('tabWeekly').classList.toggle('active', isWeekly);
  document.getElementById('tabDaily').classList.toggle('active', !isWeekly);
  document.getElementById('panelWeekly').classList.toggle('active', isWeekly);
  document.getElementById('panelDaily').classList.toggle('active', !isWeekly);
}

// ===== 이벤트 연결 =====
function bindControls() {
  // 탭 버튼
  document.getElementById('tabWeekly').addEventListener('click', () => switchTab('weekly'));
  document.getElementById('tabDaily').addEventListener('click', () => switchTab('daily'));

  // Daily 날짜 넘기기
  document.getElementById('dayPrev').addEventListener('click', () => shiftView(-1));
  document.getElementById('dayNext').addEventListener('click', () => shiftView(1));
  document.getElementById('dayToday').addEventListener('click', () => resetViewToToday());

  // 주간 넘기기
  document.getElementById('weekPrev').addEventListener('click', () => shiftView(-7));
  document.getElementById('weekNext').addEventListener('click', () => shiftView(7));
  document.getElementById('weekToday').addEventListener('click', () => resetViewToToday());
}

// ===== 초기 실행 =====
bindControls();

// 자동화가 갱신하는 reflections.json을 먼저 불러온 뒤 렌더 (실패해도 앱은 정상 동작)
window.__MASS_AUTO = null;
fetch('reflections.json', { cache: 'no-store' })
  .then(r => r.ok ? r.json() : null)
  .then(data => { window.__MASS_AUTO = data; })
  .catch(() => { /* 파일 없거나 file:// 환경 → data.js 값으로 대체 */ })
  .finally(() => render());

// 혹시 fetch가 매우 느릴 때를 대비해 즉시 1회 렌더
render();

// 1분마다 긴급 마감 여부 갱신 (실제 오늘을 보고 있을 때만 의미)
setInterval(render, 60 * 1000);
