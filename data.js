// 요일 인덱스: 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
// ===== 대학원 주요 일정 (시험 / 보고서 / 발표) — D-day 미리 알림 =====
// date 형식: "YYYY-MM-DD". 날짜가 확정되면 아래 값을 수정하세요.
// type: "exam"(시험) | "report"(보고서) | "presentation"(발표)
const EXAMS = [
  // ── 상담사례및실습연구 ──
  {
    id: "sangdam-mid",
    type: "report",
    title: "중간 대체 보고서",
    subject: "상담사례및실습연구",
    detail: "이론별 상담기법 사례개념화",
    date: "2026-10-26",
    icon: "📝"
  },
  {
    id: "sangdam-final",
    type: "report",
    title: "기말 대체 종합사례연구보고서",
    subject: "상담사례및실습연구",
    detail: "치료계획: 이론에서 실제 종합사례연구",
    date: "2026-12-21",
    icon: "📚"
  },
  {
    id: "sangdam-present",
    type: "presentation",
    title: "조별 발표 (1회)",
    subject: "상담사례및실습연구",
    detail: "발표 날짜 미정",
    date: null,
    icon: "🗣️"
  },

  // ── 상담교육연구방법 ──
  {
    id: "yeongu-plan1",
    type: "report",
    title: "연구계획서 기획안 (1쪽)",
    subject: "상담교육연구방법",
    detail: "1쪽짜리 기획안 제출",
    date: "2026-10-22",
    icon: "📝"
  },
  {
    id: "yeongu-plan-final",
    type: "report",
    title: "최종 연구계획서 (5쪽)",
    subject: "상담교육연구방법",
    detail: "5쪽짜리 최종본 제출",
    date: "2026-12-17",
    icon: "📄"
  },
  {
    id: "yeongu-final",
    type: "exam",
    title: "기말고사",
    subject: "상담교육연구방법",
    detail: "성적의 60% 차지 ⚠️ 중요",
    date: "2026-12-17",
    icon: "📚"
  },

  // ── 특수아상담 ──
  {
    id: "teuksu-mid",
    type: "exam",
    title: "중간고사",
    subject: "특수아상담",
    detail: "",
    date: "2026-10-22",
    icon: "📝"
  },
  {
    id: "teuksu-present",
    type: "presentation",
    title: "중간 조별 발표 (1회)",
    subject: "특수아상담",
    detail: "",
    date: "2026-11-12",
    icon: "🗣️"
  },
  {
    id: "teuksu-final",
    type: "exam",
    title: "기말고사",
    subject: "특수아상담",
    detail: "",
    date: "2026-12-17",
    icon: "📚"
  },

  // ── 영국문학개관 ──
  {
    id: "yeongmun-present",
    type: "presentation",
    title: "개인 발표 (1회)",
    subject: "영국문학개관",
    detail: "",
    date: "2026-11-02",
    icon: "🎤"
  },
  {
    id: "yeongmun-mid",
    type: "exam",
    title: "중간시험",
    subject: "영국문학개관",
    detail: "",
    date: "2026-10-26",
    icon: "📝"
  },
  {
    id: "yeongmun-final",
    type: "exam",
    title: "기말고사",
    subject: "영국문학개관",
    detail: "",
    date: "2026-12-21",
    icon: "📚"
  }
];

// ===== 오늘의 미사 3줄 묵상 =====
// 날짜별로 3줄 요약을 넣어두면 그 날짜에 표시됩니다. (형식: "YYYY-M-D")
// 매일 아침, 아래 두 링크의 본문을 바탕으로 3줄을 채워 넣으세요.
// (Kiro에게 "오늘 미사 3줄 요약해줘"라고 하면 대신 채워드릴 수 있어요.)
const MASS_LINKS = {
  kr: "https://missa.cbck.or.kr/DailyMissa",             // 한국 매일미사
  us: "https://catholic-daily-reflections.com/daily-reflections/" // 미국 Daily Reflections
};

// 폴백용 (reflections.json 로드 실패 시 사용). 평소엔 자동화가 만든 reflections.json이 우선됩니다.
const MASS_REFLECTIONS = {
  // 2026-9-12 · 루카 6,43-49 (매일미사 '오늘의 묵상' 요약)
  "2026-9-12": [
    "복음을 전하는 일은 예수님께서 우리에게 주신 사명입니다.",
    "예수님을 믿고 따른다면서도 복음을 묵상·성찰하지 않으면 “주님, 주님!” 하고 부르기만 하는 사람이 될 수 있습니다.",
    "먼저 나 자신이 좋은 나무가 되어, 마음의 곳간을 선한 것으로 채워 나가요."
  ]
};

// ===== 퇴근 후 루틴 =====
const EVENING_ROUTINE = [
  { id: "pm-1", icon: "👘", title: "잠옷 갈아입기",      detail: "편한 옷으로 환복" },
  { id: "pm-2", icon: "🧴", title: "화장 지우기",        detail: "해면 · 화장솜으로 클렌징" },
  { id: "pm-3", icon: "🪥", title: "양치하기",           detail: "저녁 양치" }
];

// ===== 아침 루틴 (월~금 새벽 4시 기상 기준) =====
const MORNING_ROUTINE = [
  { id: "am-1",  icon: "🛏️", title: "이불 정리",            detail: "침대에서 일어나 이불 정리" },
  { id: "am-2",  icon: "🚿", title: "화장실",               detail: "세면 & 개인위생" },
  { id: "am-3",  icon: "💧", title: "코 세척 준비",          detail: "코세척기에 온수 + 염화나트륨 넣어 섞기" },
  { id: "am-4",  icon: "🎒", title: "준비물 챙기기",          detail: "수건 · 속옷 · 팬티라이너 · 코세척기" },
  { id: "am-5",  icon: "💨", title: "머리 말리기",           detail: "드라이어로 머리 건조" },
  { id: "am-6",  icon: "🍵", title: "뜨거운 차 내리기",       detail: "전기포트 or 주전자로 차 준비" },
  { id: "am-7",  icon: "♨️", title: "스팀다리미 예열",        detail: "코드 꽂아 예열 시작" },
  { id: "am-8",  icon: "👔", title: "옷 다리기",             detail: "스팀다리미로 출근복 다림질" },
  { id: "am-9",  icon: "💄", title: "화장",                 detail: "메이크업" },
  { id: "am-10", icon: "☕", title: "텀블러에 커피 내리기",    detail: "들고 나갈 커피 준비" },
  { id: "am-11", icon: "🚪", title: "외출",                 detail: "오전 6:30 집 출발!" }
];

const WEEK_DATA = {
  0: { // 일요일
    label: "일요일",
    emoji: "☀️",
    tasks: [
      {
        id: "sun-0a",
        title: "바이올린 레슨",
        detail: "오전 11:00 – 오후 12:30",
        time: "11:00",
        category: "personal",
        icon: "🎻"
      },
      {
        id: "sun-0b",
        title: "보컬 레슨",
        detail: "오후 2:00 – 3:00",
        time: "14:00",
        category: "personal",
        icon: "🎤"
      },
      {
        id: "sun-1",
        title: "청년 저녁 미사 참석",
        detail: "수서동 | 오후 7:00 – 8:00",
        time: "19:00",
        category: "personal",
        icon: "⛪"
      },
      {
        id: "sun-2",
        title: "빨래방 빨래",
        detail: "일/수 중 한 번 (퇴근 후)",
        time: null,
        category: "life",
        icon: "🧺",
        flexible: true,
        group: "laundry"
      },
      {
        id: "sun-3",
        title: "대학원 온라인 강의 수강",
        detail: "자정 전 완료",
        time: "23:59",
        deadline: true,
        category: "grad",
        icon: "🎓"
      },
      {
        id: "sun-4",
        title: "상담실습및사례연구 온라인 강의 듣기",
        detail: "대면 수업 전날 | 23:59까지 수강 완료",
        time: "23:59",
        deadline: true,
        category: "grad",
        icon: "🎧",
        note: "대면 수업 전날"
      }
    ]
  },

  1: { // 월요일
    label: "월요일",
    emoji: "🌙",
    tasks: [
      {
        id: "mon-1",
        title: "새벽 4시 기상 & 출근 준비",
        detail: "오전 6:30 집 출발",
        time: "04:00",
        category: "work",
        icon: "⏰"
      },
      {
        id: "mon-2",
        title: "초등학교 출근",
        detail: "오전 6:30 출발 | 근무 8:30 – 16:30",
        time: "06:30",
        category: "work",
        icon: "🏫"
      },
      {
        id: "mon-2a",
        title: "교실 준비 루틴",
        detail: "불 켜기 · 진공청소기 돌리기",
        time: "06:40",
        category: "work",
        icon: "🧹"
      },
      {
        id: "mon-2b",
        title: "독서록 검사",
        detail: "매주 월요일 | 약 40분 소요",
        time: "07:00",
        category: "work",
        icon: "📚",
        note: "월요일만"
      },
      {
        id: "mon-2c",
        title: "수업 준비 (연구)",
        detail: "오전 7:30 – 8:30 | 교실에서",
        time: "07:30",
        category: "work",
        icon: "📋"
      },
      {
        id: "mon-3",
        title: "특수아상담 강의 업로드 확인",
        detail: "이번 주 월요일 업로드 예정 확인",
        time: null,
        category: "grad",
        icon: "🎓",
        note: "업로드 여부 확인"
      },
      {
        id: "mon-4",
        title: "영국문학개관 온라인 강의 듣기",
        detail: "전전주 대면 수업 기준 | 월 23:59까지 수강 완료",
        time: "23:59",
        deadline: true,
        category: "grad",
        icon: "🎧",
        note: "다음 주 월요일까지"
      },
      {
        id: "mon-5",
        title: "대학원 대면 수업",
        detail: "저녁 6:20 – 10:00",
        time: "18:20",
        category: "grad",
        icon: "🎓"
      }
    ]
  },

  2: { // 화요일
    label: "화요일",
    emoji: "🎻",
    tasks: [
      {
        id: "tue-1",
        title: "새벽 4시 기상 & 출근 준비",
        detail: "오전 6:30 집 출발",
        time: "04:00",
        category: "work",
        icon: "⏰"
      },
      {
        id: "tue-2",
        title: "초등학교 출근",
        detail: "오전 6:30 출발 | 근무 8:30 – 16:30",
        time: "06:30",
        category: "work",
        icon: "🏫"
      },
      {
        id: "tue-2a",
        title: "교실 준비 루틴",
        detail: "불 켜기 · 진공청소기 돌리기",
        time: "06:40",
        category: "work",
        icon: "🧹"
      },
      {
        id: "tue-2b",
        title: "수업 준비 (연구)",
        detail: "오전 7:30 – 8:30 | 교실에서",
        time: "07:30",
        category: "work",
        icon: "📋"
      },
      {
        id: "tue-3",
        title: "오케스트라 연습",
        detail: "저녁 7:00 – 9:00",
        time: "19:00",
        category: "personal",
        icon: "🎻"
      }
    ]
  },

  3: { // 수요일
    label: "수요일",
    emoji: "📚",
    tasks: [
      {
        id: "wed-1",
        title: "새벽 4시 기상 & 출근 준비",
        detail: "오전 6:30 집 출발",
        time: "04:00",
        category: "work",
        icon: "⏰"
      },
      {
        id: "wed-2",
        title: "초등학교 출근",
        detail: "오전 6:30 출발 | 근무 8:30 – 16:30",
        time: "06:30",
        category: "work",
        icon: "🏫"
      },
      {
        id: "wed-2a",
        title: "교실 준비 루틴",
        detail: "불 켜기 · 진공청소기 돌리기",
        time: "06:40",
        category: "work",
        icon: "🧹"
      },
      {
        id: "wed-2b",
        title: "수업 준비 (연구)",
        detail: "오전 7:30 – 8:30 | 교실에서",
        time: "07:30",
        category: "work",
        icon: "📋"
      },
      {
        id: "wed-3",
        title: "빨래방 빨래",
        detail: "일/수 중 한 번 (퇴근 후)",
        time: null,
        category: "life",
        icon: "🧺",
        flexible: true,
        group: "laundry"
      },
      {
        id: "wed-4",
        title: "대학원 온라인 강의 수강",
        detail: "자정 전 완료",
        time: "23:59",
        deadline: true,
        category: "grad",
        icon: "🎓"
      },
      {
        id: "wed-5",
        title: "상담교육연구방법 온라인 강의 듣기",
        detail: "대면 수업 전날 | 23:59까지 수강 완료",
        time: "23:59",
        deadline: true,
        category: "grad",
        icon: "🎧",
        note: "대면 수업 전날"
      },
      {
        id: "wed-6",
        title: "특수아상담 온라인 강의 듣기",
        detail: "대면 수업 전날 | 23:59까지 수강 완료",
        time: "23:59",
        deadline: true,
        category: "grad",
        icon: "🎧",
        note: "대면 수업 전날"
      }
    ]
  },

  4: { // 목요일
    label: "목요일",
    emoji: "🌿",
    tasks: [
      {
        id: "thu-1",
        title: "새벽 4시 기상 & 출근 준비",
        detail: "오전 6:30 집 출발",
        time: "04:00",
        category: "work",
        icon: "⏰"
      },
      {
        id: "thu-2",
        title: "초등학교 출근",
        detail: "오전 6:30 출발 | 근무 8:30 – 16:30",
        time: "06:30",
        category: "work",
        icon: "🏫"
      },
      {
        id: "thu-2a",
        title: "교실 준비 루틴",
        detail: "불 켜기 · 진공청소기 돌리기",
        time: "06:40",
        category: "work",
        icon: "🧹"
      },
      {
        id: "thu-2b",
        title: "수업 준비 (연구)",
        detail: "오전 7:30 – 8:30 | 교실에서",
        time: "07:30",
        category: "work",
        icon: "📋"
      },
      {
        id: "thu-3",
        title: "대학원 대면 수업",
        detail: "저녁 6:20 – 10:00",
        time: "18:20",
        category: "grad",
        icon: "🎓"
      }
    ]
  },

  5: { // 금요일
    label: "금요일",
    emoji: "🎉",
    tasks: [
      {
        id: "fri-1",
        title: "새벽 4시 기상 & 출근 준비",
        detail: "오전 6:30 집 출발",
        time: "04:00",
        category: "work",
        icon: "⏰"
      },
      {
        id: "fri-2",
        title: "초등학교 출근",
        detail: "오전 6:30 출발 | 근무 8:30 – 16:30",
        time: "06:30",
        category: "work",
        icon: "🏫"
      },
      {
        id: "fri-2a",
        title: "교실 준비 루틴",
        detail: "불 켜기 · 진공청소기 돌리기",
        time: "06:40",
        category: "work",
        icon: "🧹"
      },
      {
        id: "fri-2b",
        title: "수업 준비 (연구)",
        detail: "오전 7:30 – 8:30 | 교실에서",
        time: "07:30",
        category: "work",
        icon: "📋"
      }
    ]
  },

  6: { // 토요일
    label: "토요일",
    emoji: "😴",
    tasks: [
      {
        id: "sat-1",
        title: "자유 & 휴식",
        detail: "충분히 쉬어요!",
        time: null,
        category: "personal",
        icon: "🛋️"
      }
    ]
  }
};

const CATEGORY_META = {
  work:     { label: "학교",    color: "#4A90D9", bg: "#EBF4FF" },
  grad:     { label: "대학원",  color: "#7B5EA7", bg: "#F3EEF9" },
  personal: { label: "개인",    color: "#E07B3A", bg: "#FEF3EB" },
  life:     { label: "생활",    color: "#3BAD7E", bg: "#E8F7F1" }
};
