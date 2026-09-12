// ===== 상태 관리 =====
const STORAGE_KEY = 'routine_done_tasks';
const STORAGE_DATE_KEY = 'routine_done_date';

// 주 단위 완료 저장 (빨래처럼 주 1회 하는 그룹 업무용)
const WEEK_GROUP_KEY = 'routine_week_groups';
const WEEK_ID_KEY = 'routine_week_id';

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

// 이번 주의 일요일 날짜를 주 식별자로 사용 (일요일 시작 기준)
function getWeekId() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - d.getDay()); // 이번 주 일요일로 이동
  return `${sunday.getFullYear()}-${sunday.getMonth()+1}-${sunday.getDate()}`;
}

// 주가 바뀌면 그룹 완료 상태 초기화
function loadWeekGroups() {
  const savedWeek = localStorage.getItem(WEEK_ID_KEY);
  const thisWeek = getWeekId();
  if (savedWeek !== thisWeek) {
    localStorage.setItem(WEEK_ID_KEY, thisWeek);
    localStorage.setItem(WEEK_GROUP_KEY, JSON.stringify({}));
    return {};
  }
  try {
    return JSON.parse(localStorage.getItem(WEEK_GROUP_KEY) || '{}');
  } catch { return {}; }
}

function saveWeekGroups(obj) {
  localStorage.setItem(WEEK_GROUP_KEY, JSON.stringify(obj));
  localStorage.setItem(WEEK_ID_KEY, getWeekId());
}

// weekGroups[group] = 완료 처리된 task id (그 주에 실제로 완료한 항목)
let weekGroups = loadWeekGroups();

// ===== 매일 핵심 습관 저장 (매일 자정 초기화) =====
const HABIT_KEY = 'routine_daily_habits';
const HABIT_DATE_KEY = 'routine_habit_date';

function loadHabitSet() {
  const savedDate = localStorage.getItem(HABIT_DATE_KEY);
  const today = getTodayStr();
  if (savedDate !== today) {
    localStorage.setItem(HABIT_DATE_KEY, today);
    localStorage.setItem(HABIT_KEY, JSON.stringify([]));
    return new Set();
  }
  try {
    return new Set(JSON.parse(localStorage.getItem(HABIT_KEY) || '[]'));
  } catch { return new Set(); }
}

function saveHabitSet(set) {
  localStorage.setItem(HABIT_KEY, JSON.stringify([...set]));
  localStorage.setItem(HABIT_DATE_KEY, getTodayStr());
}

let habitSet = loadHabitSet();

function loadDoneSet() {
  // 주가 바뀌면(매주 일요일 0시) 체크 초기화
  const savedWeek = localStorage.getItem(STORAGE_DATE_KEY);
  const thisWeek = getWeekId();
  if (savedWeek !== thisWeek) {
    localStorage.setItem(STORAGE_DATE_KEY, thisWeek);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return new Set();
  }
  try {
    const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return new Set(arr);
  } catch { return new Set(); }
}

function saveDoneSet(set) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  localStorage.setItem(STORAGE_DATE_KEY, getWeekId());
}

let doneSet = loadDoneSet();

// ===== 유틸 =====
function getTodayDow() {
  return new Date().getDay(); // 0=일 ~ 6=토
}

function getNow() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
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
  const d = new Date();
  const badge = document.getElementById('todayBadge');
  badge.textContent = `${d.getMonth()+1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

// ===== 카드 생성 =====
function createTaskCard(task, showCheckbox = true) {
  const isDone = task.group ? isGroupDone(task) : doneSet.has(task.id);
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

  // 체크 토글 이벤트
  if (showCheckbox) {
    const btn = card.querySelector('.check-btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (task.group) {
        toggleGroupDone(task);
      } else {
        toggleDone(task.id);
      }
    });
  }

  return card;
}

function toggleDone(id) {
  if (doneSet.has(id)) {
    doneSet.delete(id);
  } else {
    doneSet.add(id);
  }
  saveDoneSet(doneSet);
  render();
}

// 모든 요일에서 task id로 task 객체 찾기
function findTaskById(id) {
  for (let d = 0; d < 7; d++) {
    const t = (WEEK_DATA[d]?.tasks || []).find(t => t.id === id);
    if (t) return t;
  }
  return null;
}

// 그룹(예: 빨래) 완료 토글 — 주 단위로 저장
function toggleGroupDone(task) {
  const g = task.group;
  if (weekGroups[g] === task.id) {
    // 같은 항목 다시 클릭 → 이번 주 완료 취소
    delete weekGroups[g];
  } else {
    // 이 항목으로 이번 주 완료 처리 (다른 요일 항목은 자동 숨김)
    weekGroups[g] = task.id;
  }
  saveWeekGroups(weekGroups);
  render();
}

// 그룹 업무를 이번 주에 이미 (다른 날) 완료했는지 → 숨겨야 하는지 판단
function isGroupHiddenForToday(task) {
  if (!task.group) return false;
  const doneId = weekGroups[task.group];
  // 이번 주에 그룹을 완료했고, 그게 이 항목이 아니면 숨김
  return doneId && doneId !== task.id;
}

// 그룹 업무가 이번 주에 완료됐는지 (자기 자신 기준)
function isGroupDone(task) {
  return task.group && weekGroups[task.group] === task.id;
}

// ===== 오늘의 업무 렌더링 =====
function renderToday() {
  const dow = getTodayDow();
  const dayData = WEEK_DATA[dow];
  const container = document.getElementById('todayTasks');
  container.innerHTML = '';

  if (!dayData || !dayData.tasks.length) {
    container.innerHTML = '<p class="empty-msg">오늘은 등록된 업무가 없어요 🎉</p>';
    return;
  }

  // 그룹(빨래)을 이번 주 다른 날 완료했으면 오늘 목록에서 숨김
  const visible = dayData.tasks.filter(t => !isGroupHiddenForToday(t));

  if (!visible.length) {
    container.innerHTML = '<p class="empty-msg">오늘 할 일을 모두 마쳤어요 🎉</p>';
    return;
  }

  // 시간순 정렬 (null은 마지막)
  const sorted = [...visible].sort((a, b) => {
    const ta = a.time ? timeToMinutes(a.time) : 9999;
    const tb = b.time ? timeToMinutes(b.time) : 9999;
    return ta - tb;
  });

  sorted.forEach(task => {
    container.appendChild(createTaskCard(task, true));
  });
}

// ===== 주간 그리드 렌더링 =====
function renderWeekGrid() {
  const grid = document.getElementById('weekGrid');
  grid.innerHTML = '';
  const todayDow = getTodayDow();

  // 일~토 순서로
  for (let d = 0; d < 7; d++) {
    const dayData = WEEK_DATA[d];
    const isToday = d === todayDow;

    const col = document.createElement('div');
    col.className = `day-col${isToday ? ' today' : ''}`;

    const todayDot = isToday ? '<span class="today-dot"></span>' : '';
    col.innerHTML = `
      <div class="day-header">
        <span class="day-emoji">${dayData.emoji}</span>
        <div class="day-name">${dayData.label}${todayDot}</div>
      </div>
      <div class="day-tasks" id="miniTasks-${d}"></div>
    `;

    grid.appendChild(col);

    const miniContainer = col.querySelector(`#miniTasks-${d}`);

    // 그룹(빨래)을 다른 날 완료했으면 그 날엔 숨김
    const visible = dayData.tasks.filter(t => !isGroupHiddenForToday(t));

    // 시간순 정렬
    const sorted = [...visible].sort((a, b) => {
      const ta = a.time ? timeToMinutes(a.time) : 9999;
      const tb = b.time ? timeToMinutes(b.time) : 9999;
      return ta - tb;
    });

    sorted.forEach(task => {
      const isDone = task.group ? isGroupDone(task) : doneSet.has(task.id);
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

  // 아직 완료 안 된 첫 스텝 = 현재 스텝
  const currentIdx = routine.findIndex(s => !doneSet.has(s.id));

  routine.forEach((step, idx) => {
    const isDone = doneSet.has(step.id);
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

    row.addEventListener('click', () => toggleDone(step.id));
    stepsEl.appendChild(row);
  });

  // 진행률
  const doneCount = routine.filter(s => doneSet.has(s.id)).length;
  const pct = Math.round((doneCount / routine.length) * 100);
  progressEl.textContent = `${doneCount} / ${routine.length}`;
  if (barEl) barEl.style.width = pct + '%';
}

// ===== 시험 D-day 렌더링 =====
function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  target.setHours(0, 0, 0, 0);
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

// ===== 매일 핵심 습관 렌더링 =====
function toggleHabit(id) {
  if (habitSet.has(id)) habitSet.delete(id);
  else habitSet.add(id);
  saveHabitSet(habitSet);
  renderHabits();
}

function renderHabits() {
  const grid = document.getElementById('habitGrid');
  const countEl = document.getElementById('habitCount');
  const barEl = document.getElementById('habitBar');
  const section = document.getElementById('habitSection');
  if (!grid) return;
  grid.innerHTML = '';

  DAILY_HABITS.forEach(habit => {
    const isDone = habitSet.has(habit.id);
    const card = document.createElement('div');
    card.className = `habit-card${isDone ? ' habit-done' : ''}`;
    card.innerHTML = `
      <div class="habit-check">✓</div>
      <span class="habit-icon">${habit.icon}</span>
      <span class="habit-name">${habit.title}</span>
    `;
    card.addEventListener('click', () => toggleHabit(habit.id));
    grid.appendChild(card);
  });

  const doneCount = DAILY_HABITS.filter(h => habitSet.has(h.id)).length;
  const total = DAILY_HABITS.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  const allDone = doneCount === total && total > 0;
  countEl.textContent = allDone ? `🎉 ${doneCount} / ${total} 완료!` : `${doneCount} / ${total}`;
  if (barEl) barEl.style.width = pct + '%';
  section.classList.toggle('all-done', allDone);
}

// ===== 전체 렌더 =====
function render() {
  renderHeader();
  renderHabits();
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

// ===== 초기 실행 =====
render();

// 1분마다 긴급 마감 여부 갱신
setInterval(render, 60 * 1000);
