// ===== 상태 관리 =====
const STORAGE_KEY = 'routine_done_tasks';
const STORAGE_DATE_KEY = 'routine_done_date';

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

function loadDoneSet() {
  // 날짜가 바뀌면 체크 초기화
  const savedDate = localStorage.getItem(STORAGE_DATE_KEY);
  const today = getTodayStr();
  if (savedDate !== today) {
    localStorage.setItem(STORAGE_DATE_KEY, today);
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
  localStorage.setItem(STORAGE_DATE_KEY, getTodayStr());
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
  const isDone = doneSet.has(task.id);
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
      toggleDone(task.id);
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

  // 시간순 정렬 (null은 마지막)
  const sorted = [...dayData.tasks].sort((a, b) => {
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

    // 시간순 정렬
    const sorted = [...dayData.tasks].sort((a, b) => {
      const ta = a.time ? timeToMinutes(a.time) : 9999;
      const tb = b.time ? timeToMinutes(b.time) : 9999;
      return ta - tb;
    });

    sorted.forEach(task => {
      const isDone = doneSet.has(task.id);
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

// ===== 전체 렌더 =====
function render() {
  renderHeader();
  renderExams();

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
