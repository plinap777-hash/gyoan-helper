/* 질문중심 수업지도안 & AI 프롬프트 생성기 — 교과 탐구 독서 · 질문중심 수업 (v0.3)
   순수 HTML/JS. 서버 없이 GitHub Pages에서 동작합니다. */
(function () {
  'use strict';

  const STORAGE_KEY = 'gyoan-qpg-v1';
  const AI_TOOLS = ['웹페이지', '에듀테크', '스마트패드', '피지컬컴퓨터', '기타'];
  const AI_ACT_TITLES = ['질문생성하기', '질문에 대한 답을 찾는 방법 탐색하기', '문제해결 및 성찰하기'];
  const DEFAULT_REF = '질문중심 수업설계(2025). 『질문중심수업 일반화 모형』. 교육부.\n질문중심 수업모델(2025). 『질문중심 수업모델』. 교육부.';
  const STD = window.STD_DATA || { subjects: {}, groups: {}, items: [] };
  const GRADES = [1, 2, 3, 4, 5, 6].flatMap((g) => [g + '학년 1학기', g + '학년 2학기']);
  const SUBJ_BY_BAND = {
    2: ['국어', '수학', '바른 생활', '슬기로운 생활', '즐거운 생활'],
    4: ['국어', '사회', '도덕', '수학', '과학', '체육', '음악', '미술', '영어'],
    6: ['국어', '사회', '도덕', '수학', '과학', '실과', '체육', '음악', '미술', '영어'],
  };
  const AREA_SUBJ = ['국어', '수학', '도덕', '실과', '체육', '음악', '미술', '영어'];
  const gradeBand = (g) => { const n = parseInt(g, 10); return n >= 1 && n <= 2 ? '2' : n <= 4 ? '4' : n <= 6 ? '6' : ''; };
  const subjChar = (name) => Object.keys(STD.subjects).find((k) => STD.subjects[k] === name) || '';
  function groupsFor(subject, grade) {
    const b = gradeBand(grade), ch = subjChar(subject);
    if (!b || !ch) return [];
    return Object.keys(STD.groups).filter((k) => k === b + ch + k.slice(-2)).map((k) => ({ k, name: STD.groups[k] }));
  }
  const stdOf = (key) => STD.items.filter((it) => it[0].startsWith('[' + key));
  const CSD = window.CS_DATA || { subjects: {}, groupArea: {} };
  const csAreas = () => CSD.subjects[state.overview.subject] || [];
  function curAreaName() {
    const c = state.curriculum, o = state.overview, names = csAreas().map((a) => a.a);
    if (c.areaSel && names.includes(c.areaSel)) return c.areaSel;
    const g = (CSD.groupArea[o.unitKey] || [])[0];
    if (g && names.includes(g)) return g;
    const m = names.find((n) => n.replace(/\s/g, '') === String(c.area).replace(/\s/g, ''));
    return m || '';
  }
  const MATERIALS = ['도서(온책)', '도서(발췌)', '기사', '인터넷 자료', '기타'];
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- 데이터 ---------- */
  const emptyState = () => ({
    type: 'read',
    ai: { ethics: '', refAI: '', refBook: '', refEtc: DEFAULT_REF, video: '' },
    overview: { topic: '', subject: '', subjectEtc: false, grade: '', unitKey: '', unit: '', sessions: '', materials: [], aiTools: [] },
    curriculum: { areaSel: '', area: '', idea: '', knowledge: '', skill: '', value: '', standard: '' },
    flow: { understanding: '', essentialQ: '', lessons: [{ no: '1', content: '', inquiry: false }] },
    design: { inquiryQ: '', why: '', sourceName: '', reason: '', usage: '', expected: '', before: '', after: '', newQ: '' },
    practice: { unit: '', session: '', goal: '', source: '', intro: '', inquiryQ: '', activities: [newActivity()], outro: '' },
    evalu: { elements: '', method: '', high: '', mid: '', low: '' },
    appendix: { title: '', text: '', origin: '' },
    interview: { idea: '', confusion: '', scene: '', keep: '' },
    aiMarks: [],
    pg: { tpl: '', level: '보통', count: '5', format: '표', book: '', paste: '', extra: '', history: [] },
  });
  function newActivity() { return { title: '', points: '', strategyName: '', strategyDesc: '', tipTitle: '', tipDesc: '', aiUse: '' }; }

  let state = load() || emptyState();
  let current = 0;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return fixType(merge(emptyState(), JSON.parse(raw)));
    } catch (e) { return null; }
  }
  function fixType(st) { if (!['read', 'extra'].includes(st.type)) st.type = 'read'; return st; }
  function merge(base, src) {
    if (!src || typeof src !== 'object') return base;
    Object.keys(base).forEach((k) => {
      if (Array.isArray(base[k])) { if (Array.isArray(src[k]) && src[k].length) base[k] = src[k]; }
      else if (base[k] && typeof base[k] === 'object') base[k] = merge(base[k], src[k]);
      else if (src[k] !== undefined) base[k] = src[k];
    });
    return base;
  }
  let saveTimer;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); $('#saveState').textContent = '자동 저장됨 ' + new Date().toLocaleTimeString('ko-KR'); }
      catch (e) { $('#saveState').textContent = '자동 저장을 사용할 수 없습니다. [작업 저장(.json)]을 이용하세요.'; }
    }, 300);
  }
  const getp = (p) => p.split('.').reduce((o, k) => (o == null ? o : o[k]), state);
  const setp = (p, v) => { const ks = p.split('.'); const last = ks.pop(); ks.reduce((o, k) => o[k], state)[last] = v; };
  const filled = (v) => String(v == null ? '' : v).trim().length > 0;

  /* ---------- 단계 정의 ---------- */
  const TYPES = {
    read: { name: '교과 탐구 독서', sub: '초등 교과 탐구 독서 수업' },
    extra: { name: '질문중심 수업', sub: '초등 질문중심 수업' },
  };
  const L = () => (state.type === 'ai'
    ? { subject: '교과', h3: '3 질문중심 인공지능 활용 수업의 흐름', h4: '4 질문중심 인공지능 활용수업 설계하기', before: '수업 전 학생 생각', after: '수업 후 바뀐 학생 생각', strat: '', tip: '', hp: '5 수업의 실제', he: '6 학생 평가', levels: ['매우 잘함', '잘함', '기초'] }
    : state.type === 'extra'
    ? { subject: '교과', h3: '2 질문중심 수업의 흐름', h4: '3 질문중심 수업 설계하기', before: '수업 전 학생 생각', after: '수업 후 바뀐 학생 생각', strat: '', tip: '', hp: '4 수업의 실제', he: '5 학생 평가', levels: ['매우 잘함', '잘함', '기초'] }
    : { subject: '교과', h3: '3 교과 탐구 독서 수업 흐름', h4: '4 교과 탐구 독서 설계하기', before: '읽기 전 학생 생각', after: '탐구 후 바뀐 학생 생각', hp: '5 수업의 실제', he: '6 학생 평가', tip: '교과 탐구 독서의 포인트!', strat: '[독서전략]', levels: ['매우 잘함', '잘함', '기초'] });
  const BASE_STEPS = [
    {
      id: 'overview', title: '수업 개요', req: ['overview.topic', 'overview.subject', 'overview.grade', 'overview.unit', 'overview.sessions'],
      lead: '수업의 기본 정보를 입력합니다. 수업 주제는 학생의 호기심을 끄는 한 문장으로 만들면 좋습니다.',
      fields: [
        { p: 'overview.topic', label: '수업 주제(프로그램명)', ph: '예: 택배 상자 속에 숨은 비례배분의 비밀', hint: '탐구 질문이 연상되는 흥미로운 제목' },
        { type: 'pickers' },
        { p: 'overview.sessions', label: '운영 차시', ph: '예: 8~9/10', hint: '공개수업 차시 / 단원 전체 차시' },
        { p: 'overview.materials', label: '자료 형태', type: 'checks', options: MATERIALS },
      ],
      tips: ['수업 주제에는 교과 개념과 실생활 맥락이 함께 드러나면 좋습니다.', '운영 차시는 “공개수업 차시/전체 차시” 형식으로 적습니다.'],
      examples: ['<b>사회 3-2</b> 사라진 풍습, 이어지는 풍습!', '<b>수학 6-2</b> 택배 상자 속에 숨은 비례배분의 비밀'],
      check: (s) => [
        [filled(s.overview.topic), '수업 주제를 입력했나요?'],
        [filled(s.overview.subject) && filled(s.overview.grade) && filled(s.overview.unit), '교과·학년-학기·단원을 입력했나요?'],
        [/\d/.test(s.overview.sessions), '운영 차시에 숫자가 들어 있나요? (예: 8~9/10)'],
        [s.overview.materials.length > 0, '자료 형태를 하나 이상 선택했나요?'],
      ],
      prompt: (s) => `아래 단원에서 학생의 호기심을 끄는 수업 주제(프로그램명) 후보 5개를 제안해 주세요. 교과 개념과 실생활 맥락이 함께 드러나야 하고, 한 문장이며 20자 안팎이어야 합니다.\n- 교과/학년-학기: ${s.overview.subject} ${s.overview.grade}\n- 단원: ${s.overview.unit}\n- 자료 형태: ${s.overview.materials.join(', ') || '(미정)'}`,
    },
    {
      id: 'curriculum', title: '교육과정 분석', req: ['curriculum.area', 'curriculum.idea', 'curriculum.knowledge', 'curriculum.skill', 'curriculum.value', 'curriculum.standard'],
      lead: '성취기준과 내용 체계(영역·핵심 아이디어·내용 요소)를 목록에서 골라 채웁니다. 목록은 2026 세종 생각자람교육과정(학습2)에서 가져왔습니다.',
      fields: [
        { type: 'stdPicker' },
        { p: 'curriculum.standard', label: '관련 성취기준', type: 'textarea', rows: 3, ph: '위 목록에서 체크하면 자동으로 들어갑니다. 직접 입력도 됩니다.', hint: '성취기준 코드를 [ ] 안에 함께 적습니다.' },
        { type: 'csPicker' },
        { p: 'curriculum.area', label: '영역', ph: '예: 변화와 관계', hint: '위에서 영역을 고르면 자동으로 채워집니다.' },
        { p: 'curriculum.idea', label: '핵심 아이디어', type: 'textarea', rows: 3, ph: '교육과정 문서의 핵심 아이디어를 옮겨 적습니다.' },
        { p: 'curriculum.knowledge', label: '내용 요소 ① 지식·이해', type: 'textarea', rows: 2, ph: '예: 비와 비율', hint: '위 목록에서 체크하면 한 줄씩 들어갑니다.' },
        { p: 'curriculum.skill', label: '내용 요소 ② 과정·기능', type: 'textarea', rows: 2, ph: '예: 비례식을 풀고, 주어진 양을 비례배분하기', hint: '위 목록에서 체크하면 한 줄씩 들어갑니다.' },
        { p: 'curriculum.value', label: '내용 요소 ③ 가치·태도', type: 'textarea', rows: 2, ph: '예: 비와 비율의 유용성 인식', hint: '위 목록에서 체크하면 한 줄씩 들어갑니다.' },
      ],
      tips: ['목록에서 고르면 교육과정 원문이 그대로 들어갑니다. 필요한 것만 골라 쓰세요.', '단원과 관련된 영역에는 “← 고른 단원과 관련” 표시가 붙습니다. 사회처럼 한 단원이 여러 영역에 걸치면 수업 의도에 맞는 영역을 고르세요.', '성취기준 코드 형식: [6수02-05], [4사04-01] 등.'],
      examples: ['<b>[4사04-01]</b> 옛날 풍습에 대해 알아보고, 오늘날과 비교하여 변화상을 파악한다.'],
      check: (s) => [
        [filled(s.curriculum.area) && filled(s.curriculum.idea), '영역과 핵심 아이디어를 입력했나요?'],
        [filled(s.curriculum.knowledge) && filled(s.curriculum.skill) && filled(s.curriculum.value), '내용 요소 3가지(지식·이해/과정·기능/가치·태도)를 모두 채웠나요?'],
        [/\[\d[가-힣]+\d{2}-\d{2}\]/.test(s.curriculum.standard), '성취기준에 코드([6수02-05] 형식)가 있나요?'],
      ],
      prompt: (s) => `다음 단원의 2022 개정 교육과정 정보(영역, 핵심 아이디어, 내용 체계의 지식·이해/과정·기능/가치·태도, 관련 성취기준)를 찾아 정리해 주세요. 반드시 교육과정 원문 그대로 인용하고, 확실하지 않은 부분은 “확인 필요”라고 표시해 주세요.\n- 교과/학년-학기: ${s.overview.subject} ${s.overview.grade}\n- 단원: ${s.overview.unit}`,
    },
    {
      id: 'flow', title: '수업 흐름', req: ['flow.understanding', 'flow.essentialQ'],
      lead: '단원 전체를 관통하는 본질적 이해와 본질 질문을 정하고, 차시별 흐름 중 탐구 자료가 투입되는 차시를 표시합니다.',
      fields: [
        { p: 'flow.understanding', label: '본질적 이해(지향점)', type: 'textarea', rows: 3, ph: '예: 비례배분은 전체를 정해진 비로 나누는 수학적 원리로, 일상생활의 다양한 문제를 합리적으로 해결하는 데 쓰인다.', hint: '학습 후 학생이 도달해야 할 핵심 생각을 서술문으로' },
        { p: 'flow.essentialQ', label: '본질 질문', type: 'textarea', rows: 2, ph: '예: 비례배분은 우리 생활 속 문제를 해결하는 데 어떻게 활용될까?', hint: '성취기준에 도달하기 위한 교사 주도적 질문 (핵심 아이디어·성취기준에서 추출)' },
        { p: 'flow.lessons', label: '차시별 수업 흐름', type: 'lessons' },
      ],
      tips: ['<b>본질 질문</b>은 교사가 핵심 아이디어·성취기준에서 뽑은 큰 질문, <b>탐구 질문</b>(다음 단계)은 이를 바탕으로 학생이 자료로 답을 찾는 구체적 질문입니다.', '본질 질문은 “예/아니오”로 답할 수 없고 “왜·어떻게”로 끝나는 열린 질문이 좋습니다.', '탐구 자료가 투입되는 차시에 체크하면 표에서 강조됩니다.'],
      examples: ['<b>본질 질문</b> 시간이 지나면서 우리의 풍습은 왜 변하며, 그 속에서 변하지 않는 것은 무엇일까?'],
      check: (s) => [
        [filled(s.flow.understanding), '본질적 이해를 서술문으로 적었나요?'],
        [/\?\s*$/.test(s.flow.essentialQ.trim()), '본질 질문이 물음표(?)로 끝나나요?'],
        [s.flow.lessons.filter((l) => filled(l.content)).length >= 2, '차시별 흐름을 2개 이상 적었나요?'],
        [s.flow.lessons.some((l) => l.inquiry), '탐구 자료가 투입되는 차시를 표시했나요?'],
      ],
      prompt: (s) => `다음 교육과정 정보를 바탕으로 ‘본질적 이해’ 1문장과 ‘본질 질문’ 후보 3개를 제안하고, 단원 차시별 수업 흐름(차시, 내용, 탐구 자료 투입 차시 표시) 초안을 표로 만들어 주세요.\n- 교과/단원: ${s.overview.subject} ${s.overview.grade} ${s.overview.unit} (전체 차시 ${s.overview.sessions})\n- 영역: ${s.curriculum.area}\n- 핵심 아이디어: ${s.curriculum.idea}\n- 내용 요소: 지식·이해(${s.curriculum.knowledge}) / 과정·기능(${s.curriculum.skill}) / 가치·태도(${s.curriculum.value})\n- 성취기준: ${s.curriculum.standard}\n\n[조건]\n- 본질적 이해는 서술문, 본질 질문은 “왜·어떻게”가 드러나는 열린 질문\n- 본질 질문은 성취기준·핵심 아이디어에서 추출\n- 탐구 자료(${s.overview.materials.join(', ') || '자료'})를 읽고 탐구하는 차시를 1~2개 지정`,
    },
    {
      id: 'design', title: '탐구 설계', req: ['design.inquiryQ', 'design.why', 'design.sourceName', 'design.reason', 'design.usage', 'design.expected', 'design.before', 'design.after', 'design.newQ'],
      lead: '“왜 이 자료로 탐구해야 하는가”를 중심으로 탐구 질문, 자료 활용 설계, 예상 결과, 성찰(생각의 변화·새로운 질문)을 설계합니다.',
      fields: [
        { p: 'design.inquiryQ', label: '탐구 질문', type: 'textarea', rows: 2, ph: '예: 택배 상자의 빈 공간을 백분율에 따라 비례배분하면, 과대포장 문제를 어떻게 해결할 수 있을까?', hint: '본질 질문을 바탕으로 학생이 자료를 통해 스스로 답을 찾아가며 해결할 핵심 질문' },
        { p: 'design.why', label: '왜 탐구 독서여야 하는가?', type: 'textarea', rows: 3, ph: '읽기 자료를 읽음으로써 얻는 탐구의 이점을 적습니다.' },
        { p: 'design.sourceName', label: '탐구 자료 — 자료명(출처)', ph: '예: 「그래서 이런 풍속이 생겼대요」(우리누리 글, 길벗스쿨)' },
        { p: 'design.reason', label: '탐구 자료 — 선정 이유', type: 'textarea', rows: 3, ph: '발달 수준, 실생활 연계, 성취기준과의 관련성 등' },
        { p: 'design.usage', label: '탐구 자료 — 활용 방법', type: 'textarea', rows: 5, ph: '한 줄에 한 가지씩 적으면 문서에서 • 목록으로 표시됩니다.\n예) 읽기자료를 제공하여 핵심 정보를 찾도록 안내함.', hint: '줄바꿈으로 항목을 구분' },
        { p: 'design.expected', label: '예상 탐구 결과', type: 'textarea', rows: 4, ph: '학생이 도달할 것으로 예상되는 탐구 결과 (줄바꿈으로 항목 구분)' },
        { h: '성찰' },
        { p: 'design.before', label: '읽기 전 학생 생각', type: 'textarea', rows: 3, ph: '탐구 전 학생이 가질 법한 생각이나 오개념 (줄바꿈으로 항목 구분)' },
        { p: 'design.after', label: '탐구 후 바뀐 학생 생각', type: 'textarea', rows: 3, ph: '읽기 전 생각과 대비되도록 (줄바꿈으로 항목 구분)' },
        { p: 'design.newQ', label: '새로운 질문', type: 'textarea', rows: 3, ph: '탐구 후 학생이 스스로 던질 만한 확장 질문 (줄바꿈으로 항목 구분)' },
      ],
      tips: ['<b>탐구 질문</b>은 본질 질문보다 구체적이고, 선택한 자료로 답을 찾을 수 있어야 합니다.', '<b>읽기 전 생각 ↔ 탐구 후 생각</b>이 짝을 이루도록 쓰면 성찰이 선명해집니다.', '<b>새로운 질문</b>은 다음 탐구로 이어지는 질문이며 2개 이상을 권장합니다.', '자료는 한 가지 사례만 다루는 것보다 다양한 사례가 있어 비교·분류할 수 있는 것이 좋습니다.'],
      examples: ['<b>탐구 질문</b> 우리 일상 속 옛날 풍습 중 사라진 것과 남아있는 것은 무엇이며, 왜 그렇게 달라졌을까?', '<b>읽기 전</b> 옛날 풍속은 그냥 오래되고 불편해서 다 사라졌을 것이다. → <b>탐구 후</b> 형태를 바꾸어 지속된다.'],
      check: (s) => {
        const q = s.design.inquiryQ.trim();
        const lines = (t) => t.split('\n').filter((x) => x.trim()).length;
        return [
          [/\?\s*$/.test(q), '탐구 질문이 물음표(?)로 끝나나요?'],
          [!q || q !== s.flow.essentialQ.trim(), '탐구 질문이 본질 질문과 다른 문장인가요? (더 구체적으로)'],
          [filled(s.design.why), '“왜 탐구 독서여야 하는가”를 적었나요?'],
          [filled(s.design.sourceName) && filled(s.design.reason), '자료명(출처)과 선정 이유를 적었나요?'],
          [lines(s.design.usage) >= 3, '자료 활용 방법을 3단계 이상(줄바꿈) 적었나요?'],
          [filled(s.design.before) && filled(s.design.after), '읽기 전 생각과 탐구 후 생각을 모두 적었나요?'],
          [lines(s.design.newQ) >= 2, '새로운 질문을 2개 이상 적었나요?'],
        ];
      },
      prompt: (s) => `다음 수업의 '교과 탐구 독서 설계' 초안을 작성해 주세요.\n\n[수업 정보]\n- ${s.overview.subject} ${s.overview.grade} ${s.overview.unit} / 주제: ${s.overview.topic}\n- 성취기준: ${s.curriculum.standard}\n- 본질적 이해: ${s.flow.understanding}\n- 본질 질문: ${s.flow.essentialQ}\n- 탐구 자료: ${s.design.sourceName || '(자료 미정 — 적합한 자료 유형을 제안해 주세요)'}\n\n[작성 항목]\n1) 탐구 질문 (본질 질문보다 구체적, 자료로 답을 찾을 수 있는 열린 질문 1개)\n2) 왜 탐구 독서여야 하는가 (3~4문장)\n3) 자료 선정 이유 (3문장 이내)\n4) 자료 활용 방법 (5단계, 각 문장은 “~함.”으로 종결)\n5) 예상 탐구 결과 (3~5개)\n6) 성찰: 읽기 전 학생 생각 / 탐구 후 바뀐 학생 생각(서로 대응) / 새로운 질문 2~3개\n\n[주의] 초등학생 발달 수준에 맞게, 실제 존재하는 자료·사실만 사용하고 확실하지 않은 내용은 “확인 필요”로 표시하세요.`,
    },
    {
      id: 'practice', title: '수업의 실제', req: ['practice.unit', 'practice.session', 'practice.goal', 'practice.source', 'practice.intro', 'practice.inquiryQ', 'practice.outro'],
      lead: '공개수업 차시의 교수·학습 과정을 도입-전개-정리로 구성합니다. 전개는 활동별로 독서 전략과 “교과 탐구 독서의 포인트”를 함께 적습니다.',
      fields: [
        { type: 'importPractice' },
        { row: [
          { p: 'practice.unit', label: '단원', ph: '단원명' },
          { p: 'practice.session', label: '차시', ph: '예: 8~9/10' } ] },
        { p: 'practice.goal', label: '학습 목표', type: 'textarea', rows: 2, ph: '예: 자료를 읽고 …할 수 있다.', hint: '“~할 수 있다.”로 종결' },
        { p: 'practice.source', label: '탐구 자료', ph: '자료명' },
        { p: 'practice.intro', label: '도입', type: 'textarea', rows: 3, ph: '- 경험·지난 시간 내용 떠올리기\n- 학습 문제 확인하기', hint: '줄바꿈으로 항목 구분' },
        { p: 'practice.inquiryQ', label: '전개 — 탐구 질문', type: 'textarea', rows: 2, ph: '이번 차시의 탐구 질문' },
        { p: 'practice.activities', label: '전개 — 활동', type: 'activities' },
        { p: 'practice.outro', label: '정리', type: 'textarea', rows: 3, ph: '- 오늘 발견한 내용 정리하기\n- 새로운 질문 스스로 던지기\n- 다음 차시 안내', hint: '“새로운 질문 던지기”를 포함하면 좋습니다.' },
      ],
      tips: ['<b>활동</b>은 2~3개로 “정보 수집 → 분석·추론 → 공유·발표” 흐름을 권장합니다.', '<b>독서 전략</b>은 활동에 필요한 읽기 방법 하나만 골라 간단히 설명합니다. (예: 그래픽 조직자, 요약기법, 질문 만들며 읽기)', '<b>교과 탐구 독서의 포인트</b>는 “○○자/가처럼 읽기”로 교과의 관점을 제시합니다. (사회학자, 수학자, 과학자, 역사학자 …)', '정리 단계에서 학생이 새로운 질문을 던지게 하면 탐구가 이어집니다.'],
      examples: ['<b>독서 전략</b> 그래픽 조직자: 핵심 내용·구조를 표, 마인드맵, 벤다이어그램 등 시각적 틀로 정리하는 전략', '<b>포인트</b> 사회학자처럼 읽기: “이 풍습은 왜 생겨났을까?”, “오늘날에는 왜 사라지거나 변했을까?”'],
      check: (s) => [
        [filled(s.practice.unit) && filled(s.practice.session), '단원·차시를 입력했나요?'],
        [/할 수 있다\.?\s*$/.test(s.practice.goal.trim()), '학습 목표가 “~할 수 있다.”로 끝나나요?'],
        [filled(s.practice.source), '탐구 자료를 적었나요?'],
        [filled(s.practice.intro), '도입을 적었나요?'],
        [/\?\s*$/.test(s.practice.inquiryQ.trim()), '전개의 탐구 질문이 물음표(?)로 끝나나요?'],
        [s.practice.activities.filter((a) => filled(a.title)).length >= 2, '활동을 2개 이상 구성했나요?'],
        [s.practice.activities.some((a) => filled(a.strategyName)), '독서 전략을 최소 1개 이상 넣었나요?'],
        [s.practice.activities.some((a) => filled(a.tipTitle)), '“교과 탐구 독서의 포인트”를 넣었나요?'],
        [/\?/.test(s.practice.outro), '정리에 새로운 질문 던지기가 들어 있나요?'],
      ],
      prompt: (s) => `다음 정보를 바탕으로 공개수업 차시의 교수·학습 과정안(도입-전개-정리)을 작성해 주세요.\n\n- 교과/단원: ${s.overview.subject} ${s.overview.grade} ${s.overview.unit} (${s.practice.session || s.overview.sessions}차시)\n- 성취기준: ${s.curriculum.standard}\n- 본질 질문: ${s.flow.essentialQ}\n- 탐구 질문: ${s.design.inquiryQ}\n- 탐구 자료: ${s.design.sourceName}\n- 자료 활용 방법: ${s.design.usage.replace(/\n/g, ' / ')}\n- 새로운 질문 후보: ${s.design.newQ.replace(/\n/g, ' / ')}\n\n[작성 형식]\n1) 학습 목표 (“~할 수 있다.” 종결, 1문장)\n2) 도입 (2~3개 항목)\n3) 전개: 탐구 질문 + 활동 2~3개. 각 활동은 [활동N] 제목 / 학생 활동 2~3개 항목. 그중 한 활동에는 [독서전략] 이름과 한 줄 설명, 또 한 활동에는 “교과 탐구 독서의 포인트 — ○○자처럼 읽기” 안내 문구(학생에게 던질 질문 2~3개 포함)\n4) 정리 (성찰 학습지, 새로운 질문 던지기, 다음 차시 안내)\n\n초등학생 눈높이로, 실제 수업 시간(40분 기준 ${s.practice.session ? '블록수업 가능' : ''})에 가능한 분량으로 작성해 주세요.`,
    },
    {
      id: 'evalu', title: '학생 평가', req: ['evalu.elements', 'evalu.high', 'evalu.mid', 'evalu.low'],
      lead: '평가 요소와 3수준(매우 잘함·잘함·기초) 성취 수준을 학습 목표와 일관되게 적습니다.',
      fields: [
        { p: 'evalu.elements', label: '평가 요소', type: 'textarea', rows: 4, ph: '탐구 자료를 읽고 …를 이해하고 설명하기\n모둠 활동에 적극 참여하며 …', hint: '줄바꿈으로 항목 구분 (• 목록으로 표시)' },
        { p: 'evalu.method', label: '평가 방법 (선택)', ph: '예: 관찰 평가, 산출물 평가(탐구 활동지, 성찰지)' },
        { p: 'evalu.high', label: '성취 수준 — 매우 잘함', type: 'textarea', rows: 3, ph: '정확하게·다각도로·타당하게 …' },
        { p: 'evalu.mid', label: '성취 수준 — 잘함', type: 'textarea', rows: 3 },
        { p: 'evalu.low', label: '성취 수준 — 기초', type: 'textarea', rows: 3, ph: '안내에 따라 …' },
      ],
      tips: ['평가 요소는 <b>학습 목표 → 활동 → 성취 수준</b>이 일관되게 이어져야 합니다.', '3수준은 같은 기준에서 수행의 정확성·깊이·독립성으로 구분합니다. (예: 정확하게 / 찾고 / 안내에 따라)'],
      examples: ['<b>기초</b> 탐구 자료에서 정보를 찾고, 안내에 따라 주어진 백분율을 이용하여 문제를 해결할 수 있다.'],
      check: (s) => [
        [filled(s.evalu.elements), '평가 요소를 적었나요?'],
        [filled(s.evalu.high) && filled(s.evalu.mid) && filled(s.evalu.low), '3개 수준을 모두 작성했나요?'],
        [s.evalu.high.trim().length > s.evalu.low.trim().length || !filled(s.evalu.high), '“매우 잘함”이 “기초”보다 구체적·심화된 서술인가요?'],
      ],
      prompt: (s) => `아래 학습 목표와 활동을 바탕으로 학생 평가 계획을 작성해 주세요.\n\n- 학습 목표: ${s.practice.goal}\n- 성취기준: ${s.curriculum.standard}\n- 주요 활동: ${s.practice.activities.map((a) => a.title).filter(Boolean).join(' / ')}\n\n[작성 항목] 평가 요소 2~3개(“~하기” 종결), 평가 방법(관찰·산출물 등), 성취 수준 3단계(매우 잘함/잘함/기초). 3수준은 같은 기준에서 정확성·깊이·독립성으로 구분하고 성취기준과 일관되게 서술해 주세요.`,
    },
    {
      id: 'appendix', title: '붙임·내보내기', req: ['appendix.title', 'appendix.text', 'appendix.origin'],
      lead: '읽기 자료(발췌 본문)를 붙임으로 정리하고, 완성된 지도안을 Word 파일로 내려받습니다.',
      fields: [
        { p: 'appendix.title', label: '읽기 자료 제목', ph: '예: 택배 상자 속에 숨은 비밀 이야기' },
        { p: 'appendix.text', label: '읽기 자료 본문 (발췌)', type: 'textarea', rows: 8, ph: '학생에게 제공할 읽기 자료 본문을 붙여 넣습니다.' },
        { p: 'appendix.origin', label: '원자료 출처', ph: '예: 기후에너지환경부, 「…」 보도자료(2026.3.4.)', hint: '저작권을 고려해 필요한 분량만 발췌하고 출처를 반드시 밝힙니다.' },
        { type: 'exportPanel' },
      ],
      tips: ['저작물은 <b>수업에 필요한 범위</b>에서만 발췌하고 출처를 명시합니다.', '기사·보도자료는 발행 일자까지 적습니다.', '내려받은 .docx는 한글(HWP)에서 열어 양식에 맞게 다듬을 수 있습니다.'],
      examples: [],
      check: (s) => [
        [filled(s.appendix.title) && filled(s.appendix.text), '읽기 자료 제목과 본문을 넣었나요?'],
        [filled(s.appendix.origin), '원자료 출처를 밝혔나요?'],
      ],
      prompt: (s) => `다음은 제가 작성한 동료장학 수업지도안(교과 탐구 독서)입니다. 아래 지도안 전체를 읽고, ① 본질 질문-탐구 질문-학습 목표-평가 요소의 일관성, ② 탐구 질문의 적절성, ③ 독서 전략과 활동의 연결, ④ 성찰(읽기 전/후 생각·새로운 질문) 완성도를 점검해 개선점을 항목별로 제안해 주세요.\n\n${toPlainText(s)}`,
    },
  ];

  function stepsFor() {
    const t = state.type;
    let st = BASE_STEPS.map((x) => Object.assign({}, x));
    const strip = (x, fn) => { x.fields = fn(x.fields); };
    if (t === 'extra') {
      st = st.filter((x) => x.id !== 'curriculum');
      st.forEach((x) => {
        if (x.id === 'overview') {
          strip(x, (f) => f.filter((q) => q.p !== 'overview.materials'));
          const c = x.check; x.check = (s) => c(s).filter((r) => !/자료 형태/.test(r[1]));
        }
        if (x.id === 'flow') {
          x.title = '질문중심 수업 흐름';
          x.lead = '단원 전체를 관통하는 본질적 이해와 본질 질문을 정하고, 차시별 수업 흐름을 적습니다.';
          x.tips = ['<b>본질적 이해</b>는 “(핵심개념)은 ~하는 데 쓰인다.” 같은 서술문, <b>본질 질문</b>은 “(핵심개념)은 우리 생활 속 문제를 해결하는 데 어떻게 활용될까?” 같은 열린 질문입니다.'];
          const c = x.check; x.check = (s) => c(s).filter((r) => !/탐구 자료가 투입/.test(r[1]));
        }
        if (x.id === 'design') {
          x.title = '질문중심 수업 설계';
          strip(x, (f) => f.filter((q) => q.p !== 'design.why').map((q) => (q.p === 'design.before' ? Object.assign({}, q, { label: '수업 전 학생 생각' }) : q.p === 'design.after' ? Object.assign({}, q, { label: '수업 후 바뀐 학생 생각' }) : q)));
          x.req = x.req.filter((r) => r !== 'design.why');
          const c = x.check; x.check = (s) => c(s).filter((r) => !/탐구 독서여야/.test(r[1]));
          x.tips = ['<b>탐구 질문</b>은 “~문제를 어떻게 해결할 수 있을까?” 형식이 좋습니다.', '자료 선정 이유는 “~는 ~ 자료임.”, 활용 방법은 “~도록 안내함.”으로 씁니다.', '<b>수업 전 ↔ 수업 후 생각</b>이 짝을 이루도록 쓰고, 새로운 질문은 “~을까?”로 끝냅니다.'];
        }
        if (x.id === 'practice') {
          x.lead = '공개수업 차시의 도입-전개-정리를 구성합니다. 전개는 [활동1]~[활동3]을 “~하기” 항목으로 적고, 활동3은 “내 말로 학습 종합하기”를 기본으로 합니다.';
          x.tips = ['도입에는 “질문을 생성하기 위한 자료 제시”처럼 질문이 생겨나게 하는 장치를 넣습니다.', '정리에는 “오늘 발견한 ( ) 정리하기”와 새로운 질문 던지기(“~까?”)를 넣습니다.'];
          x.check = (s) => [
            [filled(s.practice.unit) && filled(s.practice.session), '단원·차시를 입력했나요?'],
            [/할 수 있다\.?\s*$/.test(s.practice.goal.trim()), '학습 목표가 “~할 수 있다.”로 끝나나요?'],
            [filled(s.practice.source), '탐구 자료를 적었나요?'],
            [filled(s.practice.intro), '도입을 적었나요?'],
            [/\?\s*$/.test(s.practice.inquiryQ.trim()), '탐구 질문이 물음표(?)로 끝나나요?'],
            [s.practice.activities.filter((a) => filled(a.title)).length >= 2, '활동을 2개 이상 구성했나요?'],
            [/\?/.test(s.practice.outro), '정리에 새로운 질문 던지기가 들어 있나요?'],
          ];
          x.prompt = (s) => `다음 정보를 바탕으로 공개수업 차시의 교수·학습 과정안(도입-전개-정리)을 작성해 주세요.\n\n- 교과/단원: ${s.overview.subject} ${s.overview.grade} ${s.overview.unit} (${s.practice.session || s.overview.sessions}차시)\n- 본질 질문: ${s.flow.essentialQ}\n- 탐구 질문: ${s.design.inquiryQ}\n- 자료 활용 방법: ${s.design.usage.replace(/\n/g, ' / ')}\n\n[형식] 학습 목표(“~할 수 있다.”), 도입(질문 생성을 위한 자료 제시), 전개: 탐구 질문 + [활동1] ~하기 / [활동2] ~하기 / [활동3] 내 말로 학습 종합하기(발표 포함), 정리(오늘 발견한 것 정리, 새로운 질문 던지기). 활동마다 “~하기” 항목 2~3개.`;
        }
        if (x.id === 'evalu') { strip(x, (f) => f.filter((q) => q.p !== 'evalu.method')); }
      });
      st = st.filter((x) => x.id !== 'appendix');
      st.push({
        id: 'appendix', title: '참고자료·내보내기', req: [],
        lead: '지도안 끝에 붙는 [참고] 참고자료입니다. 사용한 도서와 그 외 참고 문헌을 적고 Word로 내려받습니다.',
        fields: [
          { p: 'ai.refBook', label: '참고 — 도서분류주제 (예: 생태적 가치)', type: 'textarea', rows: 3, ph: '지은이(연도).『책제목』. 출판사.\n예) 황근기(2009).『꼬물꼬물 갯벌 생물 이야기』. 꿈소담이.', hint: '줄바꿈으로 항목 구분' },
          { p: 'ai.refEtc', label: '참고 — 그 외', type: 'textarea', rows: 3, hint: '양식 기본 문구가 들어 있습니다. 필요에 맞게 고쳐 쓰세요.' },
          { type: 'exportPanel' },
        ],
        tips: ['도서는 “지은이(연도).『책제목』. 출판사.” 형식으로 적습니다.', '내려받은 .docx는 한글(HWP)에서 열어 양식에 맞게 다듬을 수 있습니다.'],
        examples: [], check: (s) => [[filled(s.ai.refBook) || filled(s.ai.refEtc), '참고자료를 적었나요?']],
        prompt: (s) => `다음 질문중심 수업 지도안을 읽고, ① 본질 질문-탐구 질문-학습 목표-평가 요소의 일관성, ② 탐구 질문의 적절성, ③ 활동 흐름(질문 생성-탐구-내 말로 종합), ④ 성찰(수업 전/후 생각·새로운 질문)을 점검해 개선점을 제안해 주세요.\n\n${toPlainText(s)}`,
      });
    }
    if (t === 'ai') {
      st.forEach((x) => {
        if (x.id === 'overview') {
          strip(x, (f) => f.map((q) => (q.p === 'overview.materials' ? { p: 'overview.aiTools', label: '인공지능 도구', type: 'checks', options: AI_TOOLS } : q)));
          const c = x.check; x.check = (s) => c(s).map((r) => (/자료 형태/.test(r[1]) ? [s.overview.aiTools.length > 0, '인공지능 도구를 하나 이상 선택했나요?'] : r));
        }
        if (x.id === 'flow') { x.title = '질문중심 수업 흐름'; x.lead = '단원 전체를 관통하는 본질적 이해와 본질 질문을 정하고, 차시별 흐름 중 탐구 자료(인공지능 활용)가 투입되는 차시를 표시합니다.'; }
        if (x.id === 'design') {
          x.title = 'AI 활용 설계';
          x.lead = '탐구 질문을 정하고, 인공지능 도구·자료와 선정 이유, 활용 방법, 윤리·안전 검증을 설계한 뒤 예상 결과와 성찰을 적습니다.';
          const map = { 'design.sourceName': ['AI활용 도구 및 자료', '예: 「제목」 / 원자료: 출처, 「…」 보도자료(2026.3.4.)'], 'design.reason': ['도구 선정 이유', '예: ~는 ~ 자료임.'], 'design.usage': ['자료 활용 방법', null] };
          strip(x, (f) => {
            const out = [];
            f.forEach((q) => {
              if (q.p === 'design.why') return;
              let n = q;
              if (map[q.p]) n = Object.assign({}, q, { label: map[q.p][0], ph: map[q.p][1] || q.ph });
              if (q.p === 'design.before') n = Object.assign({}, q, { label: '수업 전 학생 생각' });
              if (q.p === 'design.after') n = Object.assign({}, q, { label: '수업 후 바뀐 학생 생각' });
              out.push(n);
              if (q.p === 'design.usage') out.push({ p: 'ai.ethics', label: '인공지능 윤리·안전 검증', type: 'textarea', rows: 3, ph: '예: 개인정보를 입력하지 않도록 안내함.\n인공지능 답변은 자료와 비교해 사실 여부를 확인하게 함.', hint: '줄바꿈으로 항목 구분' });
            });
            return out;
          });
          x.req = x.req.filter((r) => r !== 'design.why').concat(['ai.ethics']);
          x.tips = ['<b>AI활용 도구 및 자료</b>에는 도구(웹페이지, 에듀테크, 스마트패드 등)와 자료 제목·출처를 적습니다.', '<b>윤리·안전 검증</b>에는 개인정보 보호, 답변의 사실 확인 방법을 적습니다.', '<b>수업 전 ↔ 수업 후 생각</b>이 짝을 이루도록 쓰면 성찰이 선명해집니다.'];
          const c = x.check; x.check = (s) => c(s).filter((r) => !/탐구 독서여야/.test(r[1])).concat([[filled(s.ai.ethics), '인공지능 윤리·안전 검증을 적었나요?']]);
          x.prompt = (s) => `다음 수업의 '질문중심 인공지능 활용 수업 설계' 초안을 작성해 주세요.\n\n[수업 정보]\n- ${s.overview.subject} ${s.overview.grade} ${s.overview.unit} / 주제: ${s.overview.topic}\n- 인공지능 도구: ${s.overview.aiTools.join(', ') || '(미정)'}\n- 성취기준: ${s.curriculum.standard}\n- 본질 질문: ${s.flow.essentialQ}\n\n[작성 항목]\n1) 탐구 질문(“~문제를 어떻게 해결할 수 있을까?” 형식 1개)\n2) AI활용 도구 및 자료(제목·출처)와 도구 선정 이유(“~는 ~ 자료임.”)\n3) 자료 활용 방법(3~5개, “~도록 안내함.” 종결)\n4) 인공지능 윤리·안전 검증(개인정보, 답변의 사실 확인)\n5) 예상 탐구 결과 2~3개\n6) 성찰: 수업 전 학생 생각 / 수업 후 바뀐 학생 생각 / 새로운 질문\n\n인공지능이 답을 대신 내리지 않고 학생의 질문·탐구를 돕는 도구로 쓰이게 하고, 실제 존재하는 자료·사실만 사용해 주세요.`;
        }
        if (x.id === 'practice') {
          x.lead = '공개수업 차시의 도입-전개-정리를 구성합니다. 전개는 [활동1] 질문생성하기 → [활동2] 답을 찾는 방법 탐색하기 → [활동3] 문제해결 및 성찰하기 흐름을 기본으로 합니다.';
          x.tips = ['<b>[활동2]</b>에는 구체적인 검색 방법이나 활용 가능한 자료(도구) 안내를 넣습니다.', '정리에는 “오늘 발견한 ( ) 정리하기”와 새로운 질문 던지기(“~까?”)를 넣습니다.'];
          x.check = (s) => [
            [filled(s.practice.unit) && filled(s.practice.session), '단원·차시를 입력했나요?'],
            [/할 수 있다\.?\s*$/.test(s.practice.goal.trim()), '학습 목표가 “~할 수 있다.”로 끝나나요?'],
            [filled(s.practice.source), '탐구 자료를 적었나요?'],
            [filled(s.practice.intro), '도입을 적었나요?'],
            [/\?\s*$/.test(s.practice.inquiryQ.trim()), '탐구 질문이 물음표(?)로 끝나나요?'],
            [s.practice.activities.filter((a) => filled(a.title)).length >= 2, '활동을 2개 이상 구성했나요?'],
            [/\?/.test(s.practice.outro), '정리에 새로운 질문 던지기가 들어 있나요?'],
          ];
          x.prompt = (s) => `다음 정보를 바탕으로 공개수업 차시의 교수·학습 과정안(도입-전개-정리)을 작성해 주세요.\n\n- 교과/단원: ${s.overview.subject} ${s.overview.grade} ${s.overview.unit} (${s.practice.session || s.overview.sessions}차시)\n- 인공지능 도구: ${s.overview.aiTools.join(', ')}\n- 본질 질문: ${s.flow.essentialQ}\n- 탐구 질문: ${s.design.inquiryQ}\n- 활용 방법: ${s.design.usage.replace(/\n/g, ' / ')}\n\n[형식] 학습 목표(“~할 수 있다.”), 도입(1~2개), 전개: 탐구 질문 + [활동1] 질문생성하기 / [활동2] 질문에 대한 답을 찾는 방법 탐색하기(구체적 검색 방법·자료 안내) / [활동3] 문제해결 및 성찰하기(발표 포함), 정리(오늘 발견한 것 정리, 새로운 질문 던지기). 각 활동은 “~하기” 항목 2~3개로 작성해 주세요.`;
        }
        if (x.id === 'evalu') { strip(x, (f) => f.filter((q) => q.p !== 'evalu.method')); }
      });
      st = st.filter((x) => x.id !== 'appendix');
      st.push({
        id: 'appendix', title: '참고자료·내보내기', req: [],
        lead: '지도안 끝에 붙는 [참고] 참고자료입니다. 사용한 생성형 AI와 그 외 참고 문헌·동영상을 적고 Word로 내려받습니다.',
        fields: [
          { p: 'ai.refAI', label: '참고 — 생성형 AI', type: 'textarea', rows: 3, ph: '예: 사용한 생성형 AI 서비스명과 활용 내용 (줄바꿈으로 항목 구분)' },
          { p: 'ai.refEtc', label: '참고 — 그 외', type: 'textarea', rows: 3, hint: '양식 기본 문구가 들어 있습니다. 필요에 맞게 고쳐 쓰세요.' },
          { p: 'ai.video', label: '기타 자료 — 동영상 설명·링크 (선택)', type: 'textarea', rows: 2, ph: "동영상 설명 ‘동영상 제목’(교사 참고 자료)\nhttps://www.링크주소" },
          { type: 'exportPanel' },
        ],
        tips: ['생성형 AI를 사용했다면 서비스명과 어떤 용도로 썼는지 밝힙니다.', '내려받은 .docx는 한글(HWP)에서 열어 양식에 맞게 다듬을 수 있습니다.'],
        examples: [], check: (s) => [[filled(s.ai.refAI), '사용한 생성형 AI를 적었나요? (사용하지 않았다면 “없음”)']],
        prompt: (s) => `다음 교과탐구 인공지능활용 수업 지도안을 읽고, ① 본질 질문-탐구 질문-학습 목표-평가 요소의 일관성, ② AI 도구 활용의 적절성과 윤리·안전 검증, ③ 활동 흐름(질문생성-답 찾기-문제해결·성찰)을 점검해 개선점을 제안해 주세요.\n\n${toPlainText(s)}`,
      });
    }
    return st;
  }
  let STEPS = stepsFor();

  /* ---------- 렌더링 ---------- */
  function renderSteps() {
    $('#steps').innerHTML = STEPS.map((st, i) => {
      const done = st.req.every((p) => filled(getp(p)));
      return `<button class="step-btn ${i === current && !viewPG && !viewAI && !viewBlank ? 'active' : ''} ${done ? 'done' : ''}" data-step="${i}"><span class="n">${done ? '✓' : i + 1}</span>${esc(st.title)}</button>`;
    }).join('') + `<button class="step-btn ${current === STEPS.length && !viewPG && !viewAI && !viewBlank ? 'active' : ''}" data-step="${STEPS.length}"><span class="n">★</span>전체 미리보기</button>` + `<button class="step-btn pg-chip ${viewPG ? 'active' : ''}" data-act="openPG"><span class="n">✦</span>AI 프롬프트 생성기</button>`;
  }

  function fieldHtml(f) {
    if (f.row) return `<div class="row2">${f.row.map(fieldHtml).join('')}</div>`;
    if (f.h) return `<h3 style="margin:20px 0 10px;font-size:1rem">${esc(f.h)}</h3>`;
    if (f.type === 'importPractice') return `<div class="sub no-print"><div class="sub-head"><span>앞 단계 내용 가져오기</span><button class="btn small" data-act="import">단원·차시·자료·탐구 질문 불러오기</button></div><span class="hint" style="color:var(--muted);font-size:.8rem">개요·탐구 설계에 입력한 내용을 이 단계에 복사합니다. (이미 입력한 칸은 덮어씁니다)</span></div>`;
    if (f.type === 'exportPanel') return exportPanelHtml();
    if (f.type === 'pickers') return pickersHtml();
    if (f.type === 'stdPicker') return stdPickerHtml();
    if (f.type === 'csPicker') return csPickerHtml();
    if (f.type === 'checks') {
      const cur = getp(f.p) || [];
      return `<div class="field${aiCls(f.p)}"><span class="lbl">${esc(f.label)}${aiTag(f.p)}</span><div class="checks">${f.options.map((o) => `<label><input type="checkbox" data-check="${f.p}" value="${esc(o)}" ${cur.includes(o) ? 'checked' : ''}> ${esc(o)}</label>`).join('')}</div></div>`;
    }
    if (f.type === 'lessons') return lessonsHtml();
    if (f.type === 'activities') return activitiesHtml();
    const v = getp(f.p);
    const hint = f.hint ? `<span class="hint">${esc(f.hint)}</span>` : '';
    const input = f.type === 'textarea'
      ? `<textarea data-p="${f.p}" rows="${f.rows || 3}" placeholder="${esc(f.ph || '')}">${esc(v)}</textarea>`
      : `<input type="text" data-p="${f.p}" value="${esc(v)}" placeholder="${esc(f.ph || '')}">`;
    return `<div class="field${aiCls(f.p)}"><label>${esc(f.label)}${hint}${aiTag(f.p)}</label>${input}</div>`;
  }

  function pickersHtml() {
    const o = state.overview, band = gradeBand(o.grade);
    const subs = SUBJ_BY_BAND[band] || [];
    const isEtc = o.subjectEtc || (filled(o.subject) && !subs.includes(o.subject));
    const groups = groupsFor(o.subject, o.grade);
    const opt = (val, label, sel) => `<option value="${esc(val)}" ${sel ? 'selected' : ''}>${esc(label)}</option>`;
    const unitHint = groups.length ? (AREA_SUBJ.includes(o.subject) ? '목록은 교육과정 영역입니다. 영역을 고른 뒤 교과서 단원명으로 고쳐 쓰세요.' : '목록은 교육과정 성취기준 묶음(단원·주제)입니다. 고르면 단원명이 채워지고, 고쳐 쓸 수 있어요.') : '학년-학기와 교과를 고르면 목록이 나타납니다.';
    return `<div class="row2">
      <div class="field"><label>학년-학기</label><select data-sel="grade">${opt('', '선택하세요', !o.grade)}${GRADES.map((g) => opt(g, g, o.grade === g)).join('')}${o.grade && !GRADES.includes(o.grade) ? opt(o.grade, o.grade, true) : ''}</select></div>
      <div class="field"><label>${state.type === 'extra' ? '교과(관련 교과)' : '교과'}</label><select data-sel="subject" ${band ? '' : 'disabled'}>${opt('', band ? '선택하세요' : '학년-학기를 먼저 고르세요', !o.subject && !isEtc)}${subs.map((x) => opt(x, x, !isEtc && o.subject === x)).join('')}${opt('__etc', '기타(직접 입력)', isEtc)}</select>
        ${isEtc ? `<input type="text" data-p="overview.subject" value="${esc(o.subject)}" placeholder="예: 보건, 창의적 체험활동" style="margin-top:6px">` : ''}</div>
    </div>
    <div class="field"><label>단원<span class="hint">${esc(unitHint)}</span></label>
      ${groups.length ? `<select data-sel="unitKey">${opt('', '목록에서 고르기 (선택)', !o.unitKey)}${groups.map((g) => opt(g.k, (AREA_SUBJ.includes(o.subject) ? '[영역] ' : '') + g.name, o.unitKey === g.k)).join('')}</select>` : ''}
      <input type="text" data-p="overview.unit" value="${esc(o.unit)}" placeholder="예: 비례식과 비례배분" style="margin-top:6px"></div>`;
  }

  function stdPickerHtml() {
    const o = state.overview, band = gradeBand(o.grade), ch = subjChar(o.subject);
    if (!band || !ch) return `<div class="field"><span class="lbl">성취기준 고르기</span><div class="sub">1단계(수업 개요)에서 <b>학년-학기와 교과</b>를 고르면 해당 학년군의 성취기준 목록이 나타납니다.</div></div>`;
    const groups = groupsFor(o.subject, o.grade);
    const cur = state.curriculum.standard;
    const ordered = o.unitKey ? groups.filter((g) => g.k === o.unitKey).concat(groups.filter((g) => g.k !== o.unitKey)) : groups;
    const gHtml = ordered.map((g) => {
      const list = stdOf(g.k);
      const nSel = list.filter((it) => cur.includes(it[0])).length;
      return `<details class="std-group" ${g.k === o.unitKey || nSel ? 'open' : ''}><summary>${esc(g.name)} <span class="hint">(${list.length}개${nSel ? ', ' + nSel + '개 선택' : ''})</span></summary>
        ${list.map((it) => `<label class="std"><input type="checkbox" data-std="${esc(it[0])}" ${cur.includes(it[0]) ? 'checked' : ''}><span><b>${esc(it[0])}</b> ${esc(it[1])}</span></label>`).join('')}</details>`;
    }).join('');
    return `<div class="field"><span class="lbl">성취기준 고르기<span class="hint">${esc(o.grade)} ${esc(o.subject)} — 학년군(${band === '2' ? '1~2' : band === '4' ? '3~4' : '5~6'}학년) 성취기준입니다. 체크하면 아래 ‘관련 성취기준’ 칸에 들어갑니다. (출처: 2026 세종 생각자람교육과정)</span></span>
      <input type="search" data-stdq placeholder="검색 (예: 비례, 풍습)" style="margin-bottom:8px">
      <div class="std-list">${gHtml}</div></div>`;
  }

  function csPickerHtml() {
    const o = state.overview, c = state.curriculum, band = gradeBand(o.grade);
    const areas = csAreas();
    if (!band || !areas.length) return `<div class="field"><span class="lbl">영역·핵심 아이디어·내용 요소 고르기</span><div class="sub">1단계에서 <b>학년-학기와 교과</b>를 고르면 내용 체계(영역, 핵심 아이디어, 내용 요소)를 고를 수 있습니다.</div></div>`;
    const sel = curAreaName();
    const rec = CSD.groupArea[o.unitKey] || [];
    const A = areas.find((a) => a.a === sel);
    const opt = (val, label, on) => `<option value="${esc(val)}" ${on ? 'selected' : ''}>${esc(label)}</option>`;
    const has = (field, t) => lines(c[field]).includes(t);
    const box = (field, items) => (items && items.length)
      ? items.map((t) => `<label class="std"><input type="checkbox" data-cs="${field}" data-v="${esc(t)}" ${has(field, t) ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('')
      : '<div class="hint" style="padding:4px">이 학년군에는 해당 내용 요소가 없습니다.</div>';
    const bandName = band === '2' ? '1~2학년' : band === '4' ? '3~4학년' : '5~6학년';
    return `<div class="field"><span class="lbl">영역·핵심 아이디어·내용 요소 고르기<span class="hint">${esc(o.subject)} 내용 체계(${bandName})입니다. 체크하면 아래 칸에 들어가고, 고쳐 쓸 수 있습니다. (출처: 2026 세종 생각자람교육과정)</span></span>
      <select data-sel="areaSel">${opt('', '영역을 고르세요', !sel)}${areas.map((a) => opt(a.a, a.a + (rec.includes(a.a) ? '  ← 고른 단원과 관련' : ''), a.a === sel)).join('')}</select>
      ${A ? `<div class="std-list" style="margin-top:8px">
        <details class="std-group" open><summary>핵심 아이디어 <span class="hint">(${A.i.length})</span></summary>${box('idea', A.i)}</details>
        <details class="std-group" open><summary>지식·이해 <span class="hint">(${(A.k[band] || []).length})</span></summary>${box('knowledge', A.k[band])}</details>
        <details class="std-group" open><summary>과정·기능 <span class="hint">(${(A.s[band] || []).length})</span></summary>${box('skill', A.s[band])}</details>
        <details class="std-group" open><summary>가치·태도 <span class="hint">(${(A.v[band] || []).length})</span></summary>${box('value', A.v[band])}</details>
      </div>` : ''}</div>`;
  }

  function lessonsHtml() {
    const rows = state.flow.lessons.map((l, i) => `
      <div class="lesson-row">
        <input type="text" data-lp="${i}.no" value="${esc(l.no)}" placeholder="차시" aria-label="차시">
        <input type="text" data-lp="${i}.content" value="${esc(l.content)}" placeholder="수업 내용 (예: 비례식 알아보기)" aria-label="내용">
        ${state.type === 'extra' ? '<span></span>' : `<label class="tg"><input type="checkbox" data-lpc="${i}" ${l.inquiry ? 'checked' : ''}> 탐구 자료 투입</label>`}
        <button class="btn ghost small danger" data-act="delLesson" data-i="${i}" aria-label="삭제">삭제</button>
      </div>`).join('');
    return `<div class="field${aiCls('flow.lessons')}"><span class="lbl">차시별 수업 흐름${aiTag('flow.lessons')}<span class="hint">${state.type === 'extra' ? '단원 전체 차시와 내용을 적으세요.' : '단원 전체 차시를 적고, 탐구 자료가 투입되는 차시(공개수업)를 체크하세요.'}</span></span>${rows}<button class="btn ghost small" data-act="addLesson">+ 차시 추가</button></div>`;
  }

  function activitiesHtml() {
    const acts = state.practice.activities.map((a, i) => `
      <div class="sub">
        <div class="sub-head"><span>[활동${i + 1}]</span><button class="btn ghost small danger" data-act="delAct" data-i="${i}">삭제</button></div>
        <div class="field"><label>활동 제목<span class="hint">${state.type === 'read' ? '예: 책 속 풍습 탐색하기 (정보수집)' : '예: ' + (state.type === 'ai' ? '질문생성하기' : '~하기')}</span></label><input type="text" data-ap="${i}.title" value="${esc(a.title)}" placeholder="${esc(state.type === 'ai' ? AI_ACT_TITLES[i] || '~하기' : state.type === 'extra' ? (i === 2 ? '내 말로 학습 종합하기' : '~하기') : '')}"></div>
        <div class="field"><label>학생 활동<span class="hint">줄바꿈으로 항목 구분</span></label><textarea data-ap="${i}.points" rows="3">${esc(a.points)}</textarea></div>
        ${state.type === 'read' ? `<div class="row2">
          <div class="field"><label>${state.type === 'extra' ? '수업전략 이름' : '독서 전략 이름'} (선택)</label><input type="text" data-ap="${i}.strategyName" value="${esc(a.strategyName)}" placeholder="예: 그래픽 조직자"></div>
          <div class="field"><label>${state.type === 'extra' ? '수업전략 설명' : '독서 전략 설명'} (선택)</label><input type="text" data-ap="${i}.strategyDesc" value="${esc(a.strategyDesc)}" placeholder="한 줄 설명"></div>
        </div>
        <div class="row2">
          <div class="field"><label>${state.type === 'extra' ? '수업자의 의도 — 제목' : '탐구 독서의 포인트 — 제목'} (선택)</label><input type="text" data-ap="${i}.tipTitle" value="${esc(a.tipTitle)}" placeholder="예: 사회학자처럼 읽기"></div>
          <div class="field"><label>${state.type === 'extra' ? '수업자의 의도 — 내용' : '포인트 — 안내 문구'} (선택)</label><input type="text" data-ap="${i}.tipDesc" value="${esc(a.tipDesc)}" placeholder="학생에게 던질 질문"></div>
        </div>` : ''}
      </div>`).join('');
    return `<div class="field${aiCls('practice.activities')}"><span class="lbl">전개 — 활동${aiTag('practice.activities')}</span>${acts}<button class="btn ghost small" data-act="addAct">+ 활동 추가</button></div>`;
  }

  function exportPanelHtml() {
    return `<div class="sub no-print">
      <div class="sub-head"><span>내보내기</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        <button class="btn" data-act="docx">Word(.docx) 내려받기</button>
        <button class="btn ghost" data-act="print">인쇄 / PDF 저장</button>
        <button class="btn ghost" data-act="copyText">전체 텍스트 복사</button>
      </div></div>`;
  }

  let viewBlank = false;
  function renderForm() {
    if (viewPG) { $('#formCol').innerHTML = pgPanelHtml(); $('#sideCol').innerHTML = pgSideHtml(); return; }
    if (viewAI) { $('#formCol').innerHTML = aiPanelHtml(); $('#sideCol').innerHTML = aiSideHtml(); return; }
    if (viewBlank) {
      $('#formCol').innerHTML = `<div class="card"><h2>빈 양식 — ${esc(TYPES[state.type].name)}</h2><p class="lead">작성 전 지도안 양식입니다. 위 [지도안 유형]을 바꾸면 다른 유형의 빈 양식이 보입니다.</p><div class="no-print" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px"><button class="btn" data-act="blankDocx">빈 양식 Word(.docx)</button><button class="btn ghost" data-act="print">인쇄 / PDF</button><button class="btn ghost" data-act="closeBlank">작성 시작 →</button></div><div class="doc">${withBlank(previewHtml)}</div></div>`;
      $('#sideCol').innerHTML = '';
      return;
    }
    if (current === STEPS.length) {
      $('#formCol').innerHTML = `<div class="card"><h2>전체 미리보기</h2><p class="lead">입력한 내용이 지도안 양식 순서대로 정리됩니다. 비어 있는 항목은 회색으로 표시됩니다.</p>${exportPanelHtml()}<div class="doc">${previewHtml()}</div></div>`;
      renderSide();
      $('#sideCol').insertAdjacentHTML('afterbegin', designMapHtml() + reviewHtml());
      return;
    }
    const st = STEPS[current];
    $('#formCol').innerHTML = `
      <div class="card">
        <h2>${current + 1}. ${esc(st.title)}</h2>
        <p class="lead">${esc(st.lead)}</p>
        ${st.fields.map(fieldHtml).join('')}
        <div class="nav-btns no-print">
          <button class="btn ghost" data-act="prev" ${current === 0 ? 'disabled style="visibility:hidden"' : ''}>← 이전</button>
          <button class="btn" data-act="next">${current === STEPS.length - 1 ? '전체 미리보기 →' : '다음 →'}</button>
        </div>
      </div>`;
    renderSide();
  }

  function renderSide() {
    if (current === STEPS.length) {
      const total = STEPS.reduce((n, s) => n + s.req.length, 0);
      const done = STEPS.reduce((n, s) => n + s.req.filter((p) => filled(getp(p))).length, 0);
      $('#sideCol').innerHTML = `<div class="card"><h3>작성 현황</h3><div class="progress"><i style="width:${Math.round(done / total * 100)}%"></i></div><div class="tip">필수 항목 ${done}/${total} 작성</div>${STEPS.map((s) => { const m = s.req.filter((p) => !filled(getp(p))).length; return `<div class="tip">${m ? '△' : '✓'} ${esc(s.title)} ${m ? `— ${m}개 비어 있음` : ''}</div>`; }).join('')}</div>`;
      return;
    }
    const st = STEPS[current];
    const checks = st.check(state);
    const total = st.req.length, done = st.req.filter((p) => filled(getp(p))).length;
    $('#sideCol').innerHTML = `
      <div class="card"><h3>이 단계 작성 현황</h3><div class="progress"><i style="width:${Math.round(done / total * 100)}%"></i></div><div class="tip">필수 항목 ${done}/${total}</div></div>
      <div class="card tip"><h3>작성 요령</h3><ul>${st.tips.map((t) => `<li>${t}</li>`).join('')}</ul>${st.examples.length ? `<h3>예시 (양식 속 예)</h3>${st.examples.map((e) => `<div class="ex">${e}</div>`).join('')}` : ''}</div>
      <div class="card"><h3>자동 점검</h3><ul class="checklist" id="checklist">${checkHtml(checks)}</ul></div>
      <div class="card no-print"><h3>이 단계 프롬프트</h3><div class="tip">지금까지 입력한 내용으로 ChatGPT·Claude·Gemini 등에 붙여 넣을 프롬프트를 만듭니다. ${current === STEPS.length - 1 ? '(마지막 단계에서는 지도안 전체 점검 요청이 만들어집니다.)' : ''}</div>
        <div style="display:flex;gap:6px;margin-top:8px"><button class="btn small" data-act="mkPrompt">프롬프트 만들기</button><button class="btn ghost small" data-act="cpPrompt">복사</button></div>
        <div class="prompt-box"><textarea id="promptOut" readonly placeholder="[프롬프트 만들기]를 누르세요."></textarea></div>
        <div class="tip" style="margin-top:6px"><button class="link-btn" data-act="openPG">✦ 주제·질문·활동지·평가 등 더 많은 프롬프트 만들기</button></div>
        <div class="tip" style="margin-top:6px">AI가 만든 초안은 사실과 교육과정 원문을 반드시 확인한 뒤 선생님의 수업에 맞게 고쳐 쓰세요.</div></div>`;
  }
  const checkHtml = (cs) => cs.map(([ok, msg]) => `<li class="${ok ? 'ok' : 'ng'}">${esc(msg)}</li>`).join('');

  /* ---------- 미리보기/내보내기 공통 ---------- */
  const lines = (t) => String(t || '').split('\n').map((x) => x.trim()).filter(Boolean);
  let blankMode = false;
  const blankHtml = () => (blankMode ? '&nbsp;' : '<span class="empty">(미입력)</span>');
  const v = (t) => (filled(t) ? esc(t) : blankHtml());
  const bullets = (t) => (lines(t).length ? lines(t).map((x) => '• ' + esc(x.replace(/^[•\-·]\s*/, ''))).join('\n') : blankHtml());

  /* 문서 모델: 미리보기·Word·텍스트가 같은 구조를 공유합니다. */
  function docModel() {
    const s = state, o = s.overview, c = s.curriculum, f = s.flow, d = s.design, p = s.practice, e = s.evalu, a = s.appendix, t = s.type, lb = L();
    const b = (x) => ({ b: x });
    const M = [];
    M.push({ h: '1 수업의 개요' });
    const ov = [['수업 주제', o.topic], [lb.subject, o.subject], ['학년-학기', o.grade], ['단원', o.unit], ['운영 차시', o.sessions]];
    if (t === 'read') ov.push(['자료 형태', { checks: MATERIALS, sel: o.materials }]);
    if (t === 'ai') ov.push(['인공지능 도구', { checks: AI_TOOLS, sel: o.aiTools }]);
    M.push({ kv: ov });
    if (t !== 'extra') {
      M.push({ h: '2 교육과정 분석하기' });
      M.push({ kv: [['영역', c.area], ['핵심 아이디어', c.idea], ['내용 요소', { k3: [['지식·이해', c.knowledge], ['과정·기능', c.skill], ['가치·태도', c.value]] }], ['관련 성취기준', c.standard]] });
    }
    M.push({ h: lb.h3 });
    M.push({ kv: [['본질적 이해(지향점)', f.understanding], ['본질 질문', f.essentialQ]] });
    M.push({ lessons: f.lessons, inq: t !== 'extra' });
    M.push({ h: lb.h4 });
    const dr = [['탐구 질문', d.inquiryQ]];
    if (t === 'read') dr.push(['왜 탐구 독서여야 하는가?', d.why]);
    if (t === 'ai') dr.push(['AI활용 도구 및 자료', d.sourceName], ['도구 선정 이유', d.reason], ['자료 활용 방법', b(d.usage)], ['인공지능 윤리·안전 검증', b(s.ai.ethics)]);
    else dr.push(['자료명(출처)', d.sourceName], ['자료 선정 이유', d.reason], ['자료 활용 방법', b(d.usage)]);
    dr.push(['예상 탐구 결과', b(d.expected)], ['성찰 — ' + lb.before, b(d.before)], ['성찰 — ' + lb.after, b(d.after)], ['성찰 — 새로운 질문', b(d.newQ)]);
    M.push({ kv: dr });
    M.push({ h: lb.hp });
    const pr = [['단원 / 차시', { pair: [p.unit, p.session] }], ['학습 목표', p.goal], ['탐구 자료', p.source], ['도입', b(p.intro)], ['전개 — 탐구 질문', p.inquiryQ]];
    p.activities.forEach((x, i) => pr.push(['[활동' + (i + 1) + ']', { act: x }]));
    pr.push(['정리', b(p.outro)]);
    M.push({ kv: pr });
    M.push({ h: lb.he });
    const er = [['평가 요소', b(e.elements)]];
    if (filled(e.method)) er.push(['평가 방법', e.method]);
    er.push([lb.levels[0], e.high], [lb.levels[1], e.mid], [lb.levels[2], e.low]);
    M.push({ kv: er });
    if (t === 'read') { M.push({ h: '붙임 읽기 자료' }); M.push({ kv: [['제목', a.title], ['본문', a.text], ['원자료', a.origin]] }); }
    if (t === 'ai') { M.push({ h: '[참고] 참고자료' }); const rr = [['생성형 AI', b(s.ai.refAI)], ['그 외', b(s.ai.refEtc)]]; if (filled(s.ai.video)) rr.push(['기타 자료', s.ai.video]); M.push({ kv: rr }); }
    if (t === 'extra') { M.push({ h: '[참고] 참고자료' }); M.push({ kv: [['도서분류주제 (예: 생태적 가치)', b(s.ai.refBook)], ['그 외', b(s.ai.refEtc)]] }); }
    return M;
  }
  const bulletRaw = (t) => lines(t).map((x) => '• ' + x.replace(/^[•\-·]\s*/, '')).join('\n');
  function actRaw(x) {
    const lb = L();
    return [x.title, bulletRaw(x.points)].filter(Boolean).join('\n')
      + (state.type === 'read' && filled(x.strategyName) ? `\n\n${lb.strat} ${x.strategyName}${x.strategyDesc ? ' — ' + x.strategyDesc : ''}` : '')
      + (state.type === 'read' && filled(x.tipTitle) ? `\n\n${lb.tip} ${x.tipTitle}\n${x.tipDesc}` : '');
  }
  // 값 -> 원문(Word·텍스트용)
  function valRaw(val) {
    if (val && typeof val === 'object') {
      if (val.b !== undefined) return bulletRaw(val.b);
      if (val.checks) return val.checks.map((m) => (val.sel.includes(m) ? '■' : '□') + m).join('  ');
      if (val.k3) return val.k3.map(([k, x]) => `${k}: ${lines(x).join(', ')}`).join('\n');
      if (val.pair) return `${val.pair[0]} / ${val.pair[1]}`;
      if (val.act) return actRaw(val.act);
    }
    return String(val == null ? '' : val);
  }
  // 값 -> 미리보기 HTML
  function valHtml(val) {
    if (val && typeof val === 'object') {
      if (val.b !== undefined) return bullets(val.b);
      if (val.checks) return esc(valRaw(val));
      if (val.k3) return val.k3.map(([k, x]) => `${esc(k)}: ${v(lines(x).join(', '))}`).join('\n');
      if (val.pair) return `${v(val.pair[0])}  /  ${v(val.pair[1])}`;
      if (val.act) return filled(actRaw(val.act)) ? esc(actRaw(val.act)) : blankHtml();
    }
    return v(val);
  }

  function previewHtml() {
    const o = state.overview;
    const head = `<div class="doc-title">${filled(o.topic) ? esc(o.topic) : (blankMode ? esc(TYPES[state.type].name.replace(/ 수업$/, '')) + ' 수업 지도안' : '(수업 주제)')}</div><div class="center" style="margin-bottom:10px">${esc(TYPES[state.type].sub)} 지도안</div>`;
    return head + docModel().map((m) => {
      if (m.h) return `<h3>${esc(m.h)}</h3>`;
      if (m.kv) return `<table>${m.kv.map(([k, val]) => `<tr><th>${esc(k)}</th><td>${valHtml(val)}</td></tr>`).join('')}</table>`;
      if (m.lessons) return `<table><tr><th class="center">차시</th><th class="center" style="width:auto">내용</th>${m.inq ? '<th class="center">탐구 자료 투입</th>' : ''}</tr>${m.lessons.map((l) => `<tr><td class="center">${v(l.no)}</td><td>${v(l.content)}</td>${m.inq ? `<td class="center">${l.inquiry ? '● 탐구자료 투입' : ''}</td>` : ''}</tr>`).join('')}</table>`;
      return '';
    }).join('');
  }

  function toPlainText(s0) {
    const old = state; if (s0) state = s0;
    try {
      return docModel().map((m) => {
        if (m.h) return '\n[' + m.h + ']';
        if (m.kv) return m.kv.map(([k, val]) => `${k}: ${valRaw(val).replace(/\n/g, '\n  ')}`).join('\n');
        if (m.lessons) return m.lessons.map((l) => `${l.no}차시: ${l.content}${m.inq && l.inquiry ? ' (탐구자료 투입)' : ''}`).join('\n');
        return '';
      }).join('\n').trim();
    } finally { state = old; }
  }

  /* ---------- Word(.docx) ---------- */
  function buildDocx() {
    const D = window.docx;
    if (!D) { toast('Word 라이브러리를 불러오지 못했습니다.'); return null; }
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType, BorderStyle } = D;
    const FONT = '맑은 고딕';
    const border = { style: BorderStyle.SINGLE, size: 4, color: '888888' };
    const borders = { top: border, bottom: border, left: border, right: border };
    const run = (t, o) => new TextRun(Object.assign({ text: t, font: FONT, size: 20 }, o || {}));
    const paras = (text, o) => String(text || '').split('\n').map((l) => new Paragraph({ children: [run(l, o)], spacing: { after: 40 } }));
    const cell = (text, w, o) => new TableCell({
      width: { size: w, type: WidthType.PERCENTAGE }, borders,
      shading: o && o.head ? { type: ShadingType.CLEAR, fill: 'E9EEE9', color: 'auto' } : undefined,
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: paras(text, o && o.head ? { bold: true } : undefined),
    });
    const children = [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [run('세종형 「질문·탐구·성찰」 동료장학 수업 지도안', { bold: true, size: 30 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [run(TYPES[state.type].sub, { size: 22 })] }),
    ];
    docModel().forEach((m) => {
      if (m.h) children.push(new Paragraph({ spacing: { before: 280, after: 100 }, children: [run(m.h, { bold: true, size: 24 })] }));
      else if (m.kv) children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: m.kv.map(([k, val]) => new TableRow({ children: [cell(k, 22, { head: true }), cell(valRaw(val), 78)] })) }));
      else if (m.lessons) {
        const w = m.inq ? [14, 66, 20] : [14, 86];
        children.push(new Paragraph({ children: [run('')] }));
        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({ children: [cell('차시', w[0], { head: true }), cell('내용', w[1], { head: true })].concat(m.inq ? [cell('탐구 자료 투입', w[2], { head: true })] : []) })]
            .concat(m.lessons.map((l) => new TableRow({ children: [cell(l.no, w[0]), cell(l.content, w[1])].concat(m.inq ? [cell(l.inquiry ? '● 투입' : '', w[2])] : []) }))),
        }));
      }
    });
    const doc = new Document({ sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } }, children }] });
    return Packer.toBlob(doc);
  }

  /* ---------- 유틸 ---------- */
  const blankState = () => { const b = emptyState(); b.type = state.type; b.flow.lessons = ['', '', '', ''].map(() => ({ no: '', content: '', inquiry: false })); b.practice.activities = [newActivity(), newActivity(), newActivity()]; if (b.type === 'ai') b.practice.activities.forEach((x, i) => { x.title = AI_ACT_TITLES[i]; }); if (b.type === 'extra') b.practice.activities[2].title = '내 말로 학습 종합하기'; if (b.type === 'extra') b.flow.lessons.push({ no: '', content: '', inquiry: false }, { no: '', content: '', inquiry: false }); return b; };
  function withBlank(fn) { const old = state, oldB = blankMode; state = blankState(); blankMode = true; try { return fn(); } finally { state = old; blankMode = oldB; } }
  function syncHeader() { const sel = $('#typeSel'); if (sel) sel.value = state.type; const sub = $('#subTitle'); if (sub) sub.textContent = '세종형 「질문·탐구·성찰」 · ' + TYPES[state.type].sub + ' 지도안'; }
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200); }
  async function download(blob, name) {
    try {
      const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
      if (dl) { await dl.save({ filename: name, data: blob }); return true; }
    } catch (e) { if (e && e.code === 'declined') return false; }
    plainDownload(blob, name); return true;
  }
  function plainDownload(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function fileBase() { return ('동료장학지도안_' + (state.overview.subject || '') + '_' + (state.overview.topic || '초안')).replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60); }
  function copyFallback(text) { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) { /* 아래 상자에서 직접 복사 */ } t.remove(); }
  function copy(text) { if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(() => copyFallback(text)); copyFallback(text); return Promise.resolve(); }
  function go(i) { viewBlank = false; viewAI = false; viewPG = false; STEPS = stepsFor(); current = Math.min(i, STEPS.length); syncHeader(); renderSteps(); renderForm(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function refreshLive() { renderSteps(); if (viewPG || viewAI || viewBlank) return; if (current < STEPS.length) { const st = STEPS[current]; const ul = $('#checklist'); if (ul) ul.innerHTML = checkHtml(st.check(state)); const total = st.req.length, done = st.req.filter((p) => filled(getp(p))).length; const bar = $('#sideCol .progress i'); if (bar) bar.style.width = Math.round(done / total * 100) + '%'; const tx = $('#sideCol .card .tip'); if (tx) tx.textContent = `필수 항목 ${done}/${total}`; } }

  function onSelect(kind, val) {
    const o = state.overview;
    const groupNames = Object.values(STD.groups);
    if (kind === 'grade') {
      o.grade = val;
      if (o.unitKey && o.unitKey[0] !== gradeBand(val)) o.unitKey = '';
    } else if (kind === 'subject') {
      if (val === '__etc') { o.subjectEtc = true; o.subject = ''; } else { o.subjectEtc = false; o.subject = val; }
      o.unitKey = '';
    } else if (kind === 'areaSel') {
      const c = state.curriculum, prev = curAreaName();
      c.areaSel = val;
      if (val && (!filled(c.area) || c.area.trim() === prev)) c.area = val;
    } else if (kind === 'unitKey') {
      o.unitKey = val;
      if (val && (!filled(o.unit) || groupNames.includes(o.unit.trim()))) o.unit = STD.groups[val];
    }
    unmark('overview.' + kind);
    save(); renderForm(); refreshLive();
  }
  function onCs(field, text, on) {
    const c = state.curriculum;
    let ls = lines(c[field]);
    if (on) { if (!ls.includes(text)) ls.push(text); } else ls = ls.filter((l) => l !== text);
    c[field] = ls.join('\n');
    const el = document.querySelector('[data-p="curriculum.' + field + '"]'); if (el) el.value = c[field];
    if (on && !filled(c.area) && curAreaName()) { c.area = curAreaName(); const ar = document.querySelector('[data-p="curriculum.area"]'); if (ar) ar.value = c.area; }
    save(); refreshLive();
  }
  function onStd(code, on) {
    const c = state.curriculum;
    const item = STD.items.find((it) => it[0] === code);
    let ls = c.standard.split('\n').filter((l) => l.trim());
    if (on) { if (!ls.some((l) => l.includes(code))) ls.push(code + ' ' + (item ? item[1] : '')); }
    else ls = ls.filter((l) => !l.includes(code));
    c.standard = ls.join('\n');
    const ta = document.querySelector('[data-p="curriculum.standard"]'); if (ta) ta.value = c.standard;
    if (on && !c.areaSel) {
      const g = (CSD.groupArea[code.slice(1, code.indexOf('-'))] || [])[0];
      if (g && csAreas().some((x) => x.a === g)) { c.areaSel = g; if (!filled(c.area)) c.area = g; save(); renderForm(); refreshLive(); return; }
    }
    save(); refreshLive();
  }

  /* ---------- AI로 한 번에 만들기 ----------
     구조(양식·점검·내보내기)는 도우미가, 내용은 선생님이 쓰던 AI가 채운다.
     인터뷰 → 설계표 확인 → JSON 한 덩어리 → 붙여 넣으면 모든 칸이 채워지고, AI가 채운 칸은 확인 전까지 표시된다. */
  let viewAI = false;
  let aiBackup = null;
  const isAi = (p) => (state.aiMarks || []).includes(p);
  const aiCls = (p) => (isAi(p) ? ' ai-filled' : '');
  const aiTag = (p) => (isAi(p) ? '<span class="ai-badge">AI 초안 · 확인 필요</span>' : '');
  function unmark(p, el) {
    if (!p || !isAi(p)) return;
    state.aiMarks = state.aiMarks.filter((x) => x !== p);
    const box = el && el.closest('.ai-filled');
    if (box) { box.classList.remove('ai-filled'); const bd = box.querySelector('.ai-badge'); if (bd) bd.remove(); }
  }

  /* 지금 유형에서 쓰는 칸 목록(단계 정의에서 자동으로 뽑는다) */
  function fieldSpecs() {
    const out = [];
    const walk = (f) => {
      if (f.row) return f.row.forEach(walk);
      if (f.type === 'pickers') {
        out.push({ p: 'overview.grade', label: '학년-학기', hint: '예: 6학년 2학기' });
        out.push({ p: 'overview.subject', label: '교과' });
        out.push({ p: 'overview.unit', label: '단원명' });
        return;
      }
      if (f.p) out.push(f);
    };
    stepsFor().forEach((st) => st.fields.forEach(walk));
    return out;
  }
  const actKeys = () => (state.type === 'read' ? ['title', 'points', 'strategyName', 'strategyDesc', 'tipTitle', 'tipDesc'] : ['title', 'points']);
  function schemaObj() {
    const o = {};
    fieldSpecs().forEach((f) => {
      const ks = f.p.split('.'); const last = ks.pop();
      const parent = ks.reduce((a, k) => (a[k] = a[k] || {}), o);
      let v = getp(f.p);
      if (f.type === 'activities') v = v.map((a) => Object.fromEntries(actKeys().map((k) => [k, a[k] || ''])));
      if (f.type === 'lessons') v = v.map((l) => (state.type === 'extra' ? { no: l.no, content: l.content } : { no: l.no, content: l.content, inquiry: !!l.inquiry }));
      parent[last] = v;
    });
    return o;
  }
  function specLines() {
    return fieldSpecs().map((f) => {
      const h = f.hint ? ` (${f.hint})` : '';
      if (f.type === 'activities') return `- ${f.p}: 전개 활동 배열(2~3개). 각 활동의 칸: title=활동 제목(“~하기”), points=학생 활동(줄바꿈 구분)` + (state.type === 'read' ? ', strategyName·strategyDesc=독서 전략 이름·한 줄 설명, tipTitle·tipDesc=교과 탐구 독서의 포인트 제목·학생에게 던질 질문' : '');
      if (f.type === 'lessons') return `- ${f.p}: 단원 차시별 흐름 배열. no=차시, content=수업 내용` + (state.type === 'extra' ? '' : ', inquiry=탐구 자료 투입(공개수업) 차시면 true');
      if (f.type === 'checks') return `- ${f.p}: ${f.label} — 다음 중에서만 고른 배열: ${f.options.join(', ')}`;
      return `- ${f.p}: ${f.label}${h}`;
    }).join('\n');
  }
  function allChecks() {
    return STEPS.map((st, i) => ({ i, title: st.title, items: st.check(state) }));
  }
  const ruleLines = () => [...new Set(allChecks().flatMap((g) => g.items.map((r) => r[1])))].map((m) => '  - ' + m).join('\n');
  const jsonBlock = () => '```json\n' + JSON.stringify(schemaObj(), null, 2) + '\n```';
  const RULES_COMMON = () => `- 교사 문서체(“~함.”, “~하도록 안내함.”)로 간결하게 씁니다. 여러 항목은 줄바꿈(\\n)으로 구분합니다.
- 성취기준·핵심 아이디어·내용 요소는 2022 개정 교육과정 원문 그대로 씁니다. 확실하지 않으면 지어내지 말고 끝에 “[확인 필요]”를 붙입니다.
- 도서·기사·보도자료의 제목과 출처는 실제로 있는 것만 씁니다. 모르면 “[확인 필요]”를 붙입니다.
- 학생 실명이나 개인정보는 쓰지 않습니다.
- JSON의 키 이름과 구조는 바꾸지 않습니다. 설명 문장 없이 JSON 코드 블록 하나만 출력합니다.
- 다음 점검 기준을 모두 통과해야 합니다.
${ruleLines()}`;

  function masterPrompt() {
    const it = state.interview, T = TYPES[state.type].name.replace(/ 수업$/, '');
    const ans = (v) => (filled(v) ? v.trim() : '(아직 없음 — 필요하면 물어봐 주세요)');
    return `당신은 초등학교 수업 설계를 돕는 교육과정 전문가입니다. 세종형 「질문·탐구·성찰」 ${T} 수업 지도안(동료장학 공개수업용)을 함께 만듭니다.

[진행 순서 — 꼭 지켜 주세요]
1. 아래 [선생님 인터뷰]와 [지금까지 입력한 내용]을 읽고, 지도안에 꼭 필요한데 빠진 정보가 있으면 먼저 3개 이내로 한 번에 물어봐 주세요. 짐작한 답에는 (추천)을 붙입니다. 제가 “알아서”라고 하면 추천대로 진행합니다. 첨부한 자료(교과서·PPT·읽기 자료)가 있으면 먼저 읽습니다.
2. 바로 쓰지 말고 아래 설계표를 먼저 보여 주고 “이대로 만들까요?”라고 확인을 받아 주세요.
   | 본질 질문 | 탐구 질문 | 학습 목표 | 활동(2~3개) | 평가 요소 |
3. 확인을 받으면 [출력 형식]의 JSON을 모두 채워 코드 블록 하나로 출력해 주세요.

[선생님 인터뷰]
- 수업 아이디어·쓰려는 자료: ${ans(it.idea)}
- 학생이 헷갈리거나 어려워하는 지점: ${ans(it.confusion)}
- 공개수업에서 보여 주고 싶은 장면: ${ans(it.scene)}
- 꼭 지킬 것(그대로 둘 문장, 성취기준, 차시 등): ${ans(it.keep)}

[칸 설명]
${specLines()}

[작성 규칙]
- 이미 채워진 값은 그대로 두고 빈 값("")만 채웁니다.
${RULES_COMMON()}

[지금까지 입력한 내용 = 출력 형식]
${jsonBlock()}`;
  }

  function fixPrompt() {
    const bad = allChecks().flatMap((g) => g.items.filter((r) => !r[0]).map((r) => `- [${g.title}] ${r[1]}`));
    const unsure = fieldSpecs().filter((f) => /확인 필요/.test(JSON.stringify(getp(f.p)))).map((f) => `- ${f.label}(${f.p})에 “[확인 필요]”가 남아 있음`);
    return `당신은 초등학교 수업 설계를 돕는 교육과정 전문가입니다. 아래는 세종형 「질문·탐구·성찰」 ${TYPES[state.type].name.replace(/ 수업$/, '')} 수업 지도안입니다.

[고칠 곳 — 도우미 자동 점검 결과]
${bad.length ? bad.join('\n') : '- 자동 점검은 모두 통과했습니다.'}
${unsure.join('\n')}

[함께 봐 주세요]
- 본질 질문 → 탐구 질문 → 학습 목표 → 활동 → 평가 요소가 한 줄로 이어지나요? 어긋난 곳이 있으면 고칩니다.

[작성 규칙]
- 위에서 지적한 칸과 일관성에 꼭 필요한 칸만 고치고, 나머지는 한 글자도 바꾸지 않습니다.
- 정보가 부족해 고칠 수 없는 칸이 있으면 JSON 앞에 한 줄로 물어봐 주세요.
${RULES_COMMON()}

[지도안 = 출력 형식]
${jsonBlock()}`;
  }

  function parseAI(text) {
    const m = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
    let src = m ? m[1] : text;
    const a = src.indexOf('{'), b = src.lastIndexOf('}');
    if (a < 0 || b < a) throw new Error('JSON을 찾지 못했습니다.');
    return JSON.parse(src.slice(a, b + 1));
  }
  const str = (v) => (v == null ? '' : Array.isArray(v) ? v.join('\n') : typeof v === 'object' ? '' : String(v));
  function applyAI(text) {
    const obj = parseAI(text);
    const pick = (p) => p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
    aiBackup = JSON.parse(JSON.stringify(state));
    let n = 0;
    const marks = new Set(state.aiMarks || []);
    fieldSpecs().forEach((f) => {
      const raw = pick(f.p);
      if (raw === undefined) return;
      let val;
      if (f.type === 'activities') {
        if (!Array.isArray(raw) || !raw.length) return;
        val = raw.slice(0, 6).map((x) => { const a = newActivity(); actKeys().forEach((k) => { a[k] = str(x && x[k]); }); return a; });
      } else if (f.type === 'lessons') {
        if (!Array.isArray(raw) || !raw.length) return;
        val = raw.slice(0, 30).map((x) => ({ no: str(x && x.no), content: str(x && x.content), inquiry: !!(x && x.inquiry) }));
      } else if (f.type === 'checks') {
        if (!Array.isArray(raw)) return;
        val = raw.map(String).filter((x) => f.options.includes(x));
      } else {
        val = str(raw);
        if (!filled(val)) return;
      }
      if (JSON.stringify(val) === JSON.stringify(getp(f.p))) return;
      setp(f.p, val); marks.add(f.p); n++;
    });
    if (filled(state.overview.subject)) {
      const subs = SUBJ_BY_BAND[gradeBand(state.overview.grade)] || [];
      state.overview.subjectEtc = !subs.includes(state.overview.subject);
    }
    state.aiMarks = [...marks];
    save();
    return n;
  }

  function aiPanelHtml() {
    const it = state.interview;
    const ta = (k, label, ph) => `<div class="field"><label>${label}</label><textarea data-p="interview.${k}" rows="2" placeholder="${esc(ph)}">${esc(it[k])}</textarea></div>`;
    return `<div class="card">
      <h2>AI로 한 번에 만들기</h2>
      <p class="lead">양식과 점검은 도우미가 맡고, 내용은 쓰던 AI가 채웁니다. AI가 먼저 묻고 설계표를 확인받은 뒤 답을 줍니다. 그 답을 아래에 붙여 넣으면 모든 단계의 칸이 한 번에 채워집니다.</p>
      <div class="sub"><div class="sub-head"><span>① 인터뷰 — 아는 만큼만 적으세요</span></div>
        <p class="hint" style="margin:0 0 10px;color:var(--muted);font-size:.85rem">지금 유형: <b>${esc(TYPES[state.type].name)}</b> (위에서 바꿀 수 있습니다). 1단계에 학년·교과·단원을 적어 두면 더 정확해집니다.</p>
        ${ta('idea', '수업 아이디어·쓰려는 자료', '예: 택배 과대포장 기사로 비례배분을 탐구하게 하고 싶음')}
        ${ta('confusion', '학생이 헷갈리거나 어려워하는 지점', '예: 백분율을 비로 바꾸는 과정')}
        ${ta('scene', '공개수업에서 보여 주고 싶은 장면', '예: 모둠이 서로 다른 포장 비율로 계산해 비교·발표하는 장면')}
        ${ta('keep', '꼭 지킬 것', '예: 성취기준 [6수02-05], 8~9/10차시, 활동은 3개')}
      </div>
      <div class="sub"><div class="sub-head"><span>② 프롬프트 복사 → 쓰던 AI에 붙여 넣기</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button class="btn" data-act="cpMaster">프롬프트 만들어 복사</button>
          <a class="btn ghost" href="https://chatgpt.com/" target="_blank" rel="noopener">ChatGPT 열기</a>
          <a class="btn ghost" href="https://gemini.google.com/app" target="_blank" rel="noopener">Gemini 열기</a>
          <a class="btn ghost" href="https://claude.ai/new" target="_blank" rel="noopener">Claude 열기</a>
        </div>
        <p class="hint" style="margin:8px 0 0;color:var(--muted);font-size:.85rem">교과서 쪽, 읽기 자료, PPT가 있으면 AI 대화창에 함께 올리세요. AI의 질문에 답하고 설계표를 확인하면 JSON 답이 나옵니다.</p>
        <div class="prompt-box"><textarea id="masterOut" readonly placeholder="[프롬프트 만들어 복사]를 누르면 여기에 나타납니다."></textarea></div>
      </div>
      <div class="sub"><div class="sub-head"><span>③ AI 답 붙여 넣기</span></div>
        <textarea id="aiPaste" rows="7" placeholder="AI가 준 답을 통째로 붙여 넣으세요. 앞뒤 설명이 섞여 있어도 JSON 부분만 읽습니다."></textarea>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
          <button class="btn" data-act="applyAI">지도안에 채우기</button>
          ${aiBackup ? '<button class="btn ghost danger" data-act="undoAI">방금 채운 것 되돌리기</button>' : ''}
        </div>
      </div>
      <div class="nav-btns no-print"><button class="btn ghost" data-act="closeAI">← 단계별로 쓰기</button><button class="btn ghost" data-step="${STEPS.length}">전체 미리보기 →</button></div>
    </div>`;
  }
  function aiSideHtml() {
    return `<div class="card tip"><h3>이렇게 진행됩니다</h3><ul>
      <li>AI가 <b>먼저 묻습니다.</b> 모르면 “알아서”라고 답해도 됩니다.</li>
      <li>AI가 <b>설계표</b>(본질 질문→탐구 질문→학습 목표→활동→평가)를 보여 주면 확인하고 고칩니다.</li>
      <li>확인하면 AI가 JSON 답을 줍니다. 통째로 복사해 ③에 붙여 넣습니다.</li>
      <li>AI가 채운 칸은 <span class="ai-badge" style="margin:0">AI 초안 · 확인 필요</span> 표시가 붙습니다. 읽고 고치면 표시가 사라집니다.</li>
      <li>전체 미리보기의 <b>전체 점검</b>에서 고칠 곳을 AI에게 다시 보낼 수 있습니다.</li></ul>
      <div class="ex">이미 적어 둔 칸은 AI에게 그대로 두라고 알려 줍니다. 먼저 쓴 내용은 지켜집니다.</div>
      <div class="ex">학생 실명·사진·개인정보는 적지 마세요.</div></div>`;
  }

  /* 전체 미리보기 옆: 설계 한눈에 보기 + 전체 점검 */
  function designMapHtml() {
    const s = state;
    const acts = s.practice.activities.map((a) => a.title).filter(filled);
    const row = (k, val) => `<li><span class="dm-k">${k}</span><span class="dm-v">${filled(val) ? esc(val) : '<span class="empty">(미입력)</span>'}</span></li>`;
    return `<div class="card"><h3>한눈에 보는 수업 설계</h3><p class="tip" style="margin:0 0 6px;color:var(--muted)">위에서 아래로 한 줄로 이어지는지 확인하세요.</p><ul class="dmap">
      ${row('본질 질문', s.flow.essentialQ)}${row('탐구 질문', s.design.inquiryQ || s.practice.inquiryQ)}${row('학습 목표', s.practice.goal)}${row('활동', acts.join(' → '))}${row('평가 요소', lines(s.evalu.elements).join(' / '))}</ul></div>`;
  }
  function reviewHtml() {
    const groups = allChecks().map((g) => ({ ...g, bad: g.items.filter((r) => !r[0]) })).filter((g) => g.bad.length);
    const nBad = groups.reduce((n, g) => n + g.bad.length, 0);
    const nAi = (state.aiMarks || []).length;
    const nUnsure = fieldSpecs().filter((f) => /확인 필요/.test(JSON.stringify(getp(f.p)))).length;
    const list = groups.map((g) => `<li><button class="link-btn" data-step="${g.i}">${esc(g.title)}</button><ul class="checklist">${g.bad.map((r) => `<li class="ng">${esc(r[1])}</li>`).join('')}</ul></li>`).join('');
    return `<div class="card no-print"><h3>전체 점검 ${nBad ? `<span class="pill-warn">${nBad}</span>` : '<span class="pill-ok">통과</span>'}</h3>
      ${nBad ? `<ul class="review">${list}</ul>` : '<p class="tip">자동 점검을 모두 통과했습니다.</p>'}
      ${nAi ? `<p class="tip warn-t">AI가 채운 뒤 아직 확인하지 않은 칸 ${nAi}개</p>` : ''}
      ${nUnsure ? `<p class="tip warn-t">“[확인 필요]”가 남은 칸 ${nUnsure}개</p>` : ''}
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
        <button class="btn small" data-act="cpFix">AI에게 고쳐 달라고 할 말 복사</button>
        <button class="btn ghost small" data-act="openAI">AI 답 붙여 넣기</button>
        ${nAi ? '<button class="btn ghost small" data-act="clearMarks">AI 표시 모두 지우기</button>' : ''}
      </div>
      <p class="tip" style="margin-top:6px;color:var(--muted)">복사한 말을 AI에 붙여 넣고, 받은 답을 [AI 답 붙여 넣기]에 넣으면 고친 칸만 바뀝니다.</p></div>`;
  }

  /* ---------- AI 프롬프트 생성기 ---------- */
  let viewPG = false;
  const PG_LEVELS = ['기초', '보통', '심화'];
  const PG_COUNTS = ['3', '5', '7', '10'];
  const PG_FORMATS = ['표', '번호 목록', '교사 문서체(~함.)'];
  const PG_GROUPS = ['수업 설계', '자료·질문', '활동·평가', '학생·동료장학'];
  const PG = [
    { id: 'topic', g: '수업 설계', name: '수업 주제 아이디어', desc: '호기심을 끄는 주제(프로그램명) 후보',
      task: (c) => `학생의 호기심을 끄는 수업 주제(프로그램명) 후보를 ${c.count}개 제안해 주세요. ${c.isRead ? '교과 개념과 읽기 자료의 맥락' : '학생 삶과 연결된 문제 상황'}이 함께 드러나야 하고, 한 문장 20자 안팎이어야 합니다. 각 후보마다 그 주제에서 자연스럽게 떠오를 탐구 질문 1개를 함께 적어 주세요.`,
      out: '주제 | 떠오르는 탐구 질문 | 한 줄 이유' },
    { id: 'essential', g: '수업 설계', name: '본질 질문·탐구 질문', desc: '본질적 이해 → 본질 질문 → 탐구 질문 세트',
      task: (c) => `이 ${c.isRead ? '단원' : '프로그램'}을 관통하는 [본질적 이해 – 본질 질문 – 탐구 질문] 세트를 3개 제안해 주세요.\n- 본질적 이해: “(핵심 개념)은 ~하는 데 쓰인다.” 같은 서술문\n- 본질 질문: 단원 전체를 관통하는 열린 질문(정답이 하나가 아님)\n- 탐구 질문: 공개수업 차시에서 학생이 실제로 탐구할 수 있는 구체적 질문, “~을 어떻게 해결할 수 있을까?” 형식, 물음표로 끝남\n세트마다 세 문장이 한 줄로 이어지는지 짧게 설명해 주세요.`,
      out: '세트 번호 | 본질적 이해 | 본질 질문 | 탐구 질문 | 연결 설명' },
    { id: 'lesson', g: '수업 설계', name: '수업의 실제(도입-전개-정리)', desc: '공개수업 차시 교수·학습 과정안 초안',
      task: (c) => `공개수업 차시의 교수·학습 과정안(도입-전개-정리)을 작성해 주세요.\n- 도입: ${c.isRead ? '읽기 자료와 만나며 궁금증이 생기는 장치' : '질문을 생성하기 위한 자료 제시'}\n- 전개: [활동1]~[활동3]을 “~하기” 제목으로, 활동마다 주요 내용 2~3줄${c.isRead ? ', 활동1에는 읽기 전략(전략명·설명)과 교사 팁 포함' : ', 활동3은 “내 말로 학습 종합하기”'}\n- 정리: “오늘 발견한 ( ) 정리하기”와 새로운 질문 스스로 던지기\n학습 목표는 “~할 수 있다.”로 끝나게 해 주세요.`,
      out: '단계 | 활동 제목 | 주요 내용 | 시간(분) | 자료·유의점' },
    { id: 'book', g: '자료·질문', name: '탐구 독서 자료 추천', desc: '학년 수준 도서·기사 후보와 선정 이유', only: 'read',
      task: (c) => `이 수업에 쓸 탐구 독서 자료(도서·그림책·기사) 후보를 ${c.count}개 추천해 주세요. ${c.grade || '해당 학년'} 학생이 읽을 수 있는 수준이어야 합니다. 각 자료마다 [지은이(연도). 『제목』. 출판사.] 형식의 서지, 탐구 질문과 연결되는 지점, 발췌하면 좋을 부분을 적어 주세요.\n실제로 출간된 자료만 추천하고, 서지 정보가 확실하지 않으면 반드시 [확인 필요]를 붙여 주세요.`,
      out: '서지 | 연결 지점 | 발췌 추천 부분 | 확실성' },
    { id: 'excerpt', g: '자료·질문', name: '읽기 자료 재구성', desc: '붙여 넣은 원문을 학년 수준 읽기 자료로', only: 'read', paste: '재구성할 원문(기사·도서 발췌)',
      task: (c) => `아래 [원문]을 ${c.grade || '해당 학년'} 학생용 탐구 읽기 자료로 재구성해 주세요.\n- 분량: A4 1쪽 이내, 문장은 짧고 쉽게\n- 탐구 질문을 해결하는 데 필요한 정보(숫자·사실·근거)는 빠뜨리지 않기\n- 원문에 없는 사실은 덧붙이지 않기\n- 끝에 출처 표기 한 줄\n재구성한 뒤, 학생이 읽으며 멈춰 생각할 지점 3곳을 따로 표시해 주세요.`,
      out: '제목 / 본문 / 출처 / 멈춤 지점 3곳' },
    { id: 'readQ', g: '자료·질문', name: '읽기 전·중·후 질문', desc: '독서 단계별 발문 만들기', only: 'read',
      task: (c) => `읽기 자료를 활용한 읽기 전·중·후 질문을 단계별로 ${c.count}개씩 만들어 주세요.\n- 읽기 전: 배경지식 활성화, 예측\n- 읽기 중: 정보 확인, 추론, 교과 개념과 연결(“이 숫자는 무엇을 나타낼까?” 같은 교과 전문가처럼 읽기)\n- 읽기 후: 탐구 질문과 연결, 적용, 새로운 질문\n각 질문에 사실·해석·평가 중 어떤 수준인지 표시해 주세요.`,
      out: '단계 | 질문 | 수준(사실/해석/평가)' },
    { id: 'qft', g: '자료·질문', name: '질문 생성 자료(질문 초점)', desc: '학생이 질문을 쏟아 내게 할 자료 설계',
      task: (c) => `학생이 스스로 질문을 많이 만들어 내도록 돕는 “질문 초점” 자료를 ${c.count}개 설계해 주세요(질문형성기법 QFT 방식).\n- 질문 초점은 질문이 아니라 짧은 문장·사진 설명·자료 한 장면이어야 함\n- 학생 삶과 가깝고, 정답이 하나로 정해지지 않으며, 탐구 질문으로 이어질 수 있어야 함\n- 각 자료마다 학생이 만들 법한 질문 예시 4개(닫힌 질문 2, 열린 질문 2)\n- 질문 만들기 규칙 안내 문구(최대한 많이, 판단하지 않기, 그대로 적기, 진술은 질문으로 바꾸기) 포함`,
      out: '질문 초점 | 제시 방법 | 예상 학생 질문 4개 | 탐구 질문으로 이어지는 길' },
    { id: 'qsort', g: '자료·질문', name: '학생 질문 분류·다듬기', desc: '붙여 넣은 학생 질문을 분류하고 탐구 질문 후보로', paste: '학생들이 만든 질문 목록(이름 빼고)',
      task: () => `아래 [학생 질문]을 분석해 주세요.\n1) 닫힌 질문/열린 질문, 사실·해석·평가 수준으로 분류\n2) 비슷한 질문끼리 묶고 묶음 이름 붙이기\n3) 탐구 질문으로 발전시키기 좋은 질문 3개를 고르고, 학생의 말투를 살려 다듬은 문장 제시\n4) 닫힌 질문을 열린 질문으로 바꾸는 예 3개\n학생 질문을 깎아내리는 표현은 쓰지 말아 주세요.`,
      out: '분류표 → 묶음 → 탐구 질문 후보 3개 → 바꾸기 예' },
    { id: 'worksheet', g: '활동·평가', name: '학생 활동지', desc: '탐구 흐름을 따라가는 1~2쪽 활동지',
      task: (c) => `공개수업 차시에 쓸 학생 활동지를 만들어 주세요.\n- 구성: ${c.isRead ? '읽기 전 생각 → 읽으며 정보 찾기 → 탐구 질문 해결 → 탐구 후 바뀐 생각' : '내가 만든 질문 → 질문 고르기 → 답을 찾는 과정 → 내 말로 학습 종합하기'} → 새로운 질문\n- 학생이 직접 쓰는 칸은 빈칸 ( )으로, 칸마다 쓰는 방법 한 줄 안내\n- ${c.grade || '해당 학년'} 눈높이의 쉬운 말, 1~2쪽 분량\n- 스스로 점검 체크리스트 3문항 포함`,
      out: '활동지 본문(제목·이름 칸 포함)' },
    { id: 'rubric', g: '활동·평가', name: '평가 기준(상·중·하)', desc: '평가 요소와 수준별 기준',
      task: () => `학습 목표와 탐구 질문에 맞는 평가 요소 2개와 상·중·하 평가 기준을 작성해 주세요.\n- 평가 요소는 탐구 과정(질문·자료 활용)과 결과(해결·표현)를 각각 담기\n- 기준은 관찰 가능한 행동으로, “~함.”으로 끝나게\n- 하 수준 학생을 위한 지도 방안 한 줄씩\n- 관찰 평가·산출물 평가 중 알맞은 방법 제안`,
      out: '평가 요소 | 상 | 중 | 하 | 하 수준 지도 방안 | 평가 방법' },
    { id: 'reflect', g: '활동·평가', name: '정리·성찰 활동', desc: '새로운 질문으로 이어지는 마무리',
      task: (c) => `수업 정리 단계에서 쓸 성찰 활동을 ${c.count}가지 제안해 주세요.\n- “오늘 발견한 ( )”, “처음 생각 → 바뀐 생각”, “새롭게 생긴 질문”이 드러나게\n- 5분 안에 할 수 있고 기록이 남는 방법(출구 카드, 한 줄 생각 등)\n- 각 활동의 학생 발문 예시와 다음 차시·생활로 이어지는 방법`,
      out: '활동 이름 | 방법 | 발문 예시 | 이어지는 방법' },
    { id: 'student', g: '학생·동료장학', name: '학생용 AI 질문 도우미 프롬프트', desc: '답 대신 질문으로 이끄는 학생용 프롬프트 카드',
      task: (c) => `학생이 생성형 AI를 “답을 받는 도구”가 아니라 “내 질문을 다듬는 도우미”로 쓰도록, 학생용 프롬프트 카드 ${c.count}장을 만들어 주세요.\n- 각 카드: 카드 이름, 학생이 그대로 입력할 프롬프트(학생 말투, 3줄 이내), 언제 쓰는지\n- 프롬프트 안에 “정답을 바로 말하지 말고 질문으로 생각을 이끌어 줘”, “초등학생이 이해할 수 있게” 같은 조건을 넣기\n- 카드 예: 내 질문 넓히기, 닫힌 질문을 열린 질문으로, 답을 찾는 방법 묻기, 내 생각 근거 점검받기\n- 마지막에 학생용 AI 사용 약속 4가지(개인정보 입력 금지, AI 답 확인하기 등)\n※ 생성형 AI 서비스마다 이용 가능 연령이 다르므로, 교사 시연이나 학교에서 허용한 도구로 쓰는 것을 전제로 합니다.`,
      out: '카드 표 + 사용 약속' },
    { id: 'peer', g: '학생·동료장학', name: '동료장학 협의 질문', desc: '수업자 성찰·참관자 관찰 질문',
      task: (c) => `이 수업의 동료장학(수업 나눔)에 쓸 질문을 만들어 주세요.\n1) 수업 전 수업자 자기 점검 질문 ${c.count}개\n2) 참관자 관찰 포인트와 관찰 질문 ${c.count}개(“학생이 질문을 만들어 내는 순간”, ${c.isRead ? '“읽기 자료가 탐구에 쓰이는 장면”' : '“학생 질문이 탐구로 이어지는 장면”'} 등 장면 중심)\n3) 사후 협의회 질문 ${c.count}개(평가가 아니라 함께 성장하는 대화가 되도록, 열린 질문으로)`,
      out: '구분 | 질문 | 관찰·대화 포인트' },
    { id: 'review', g: '학생·동료장학', name: '지도안 전체 점검', desc: '입력한 지도안 전체를 AI에게 점검받기', full: true,
      task: () => `아래 [지도안]을 읽고 점검해 주세요.\n① 본질 질문 – 탐구 질문 – 학습 목표 – 활동 – 평가 요소의 일관성\n② 탐구 질문이 학생 수준에서 탐구 가능한지\n③ 활동 흐름(질문 생성 → 탐구 → 성찰)이 자연스러운지\n④ 표현(문서체, “~할 수 있다.”, 물음표 등) 다듬을 곳\n잘된 점 2가지를 먼저 말한 뒤, 고칠 점은 [항목 – 지금 문장 – 고친 문장]으로 제시해 주세요.`,
      out: '잘된 점 → 고칠 점 표(항목 | 지금 | 고친 문장)' },
  ];
  const pgList = () => PG.filter((t) => !t.only || t.only === state.type);
  function pgCtx() {
    const s = state, o = s.overview, pg = s.pg;
    const acts = s.practice.activities.map((a) => a.title).filter(filled);
    const rows = [
      ['지도안 유형', TYPES[s.type].name.replace(/ 수업$/, '') + ' 수업'],
      ['학년-학기', o.grade], [s.type === 'extra' ? '관련 교과' : '교과', o.subject], ['단원', o.unit], ['수업 주제', o.topic], ['운영 차시', o.sessions],
      ['관련 성취기준', s.type === 'read' ? s.curriculum.standard : ''],
      ['본질 질문', s.flow.essentialQ], ['탐구 질문', s.design.inquiryQ || s.practice.inquiryQ],
      [s.type === 'read' ? '탐구 독서 자료' : '탐구 자료', pg.book || s.design.sourceName || s.practice.source],
      ['학습 목표', s.practice.goal], ['활동', acts.join(' → ')], ['평가 요소', lines(s.evalu.elements).join(' / ')],
    ].filter((r) => filled(r[1]));
    return { rows, isRead: s.type === 'read', grade: o.grade, count: pg.count || '5' };
  }
  function pgBuild() {
    const t = PG.find((x) => x.id === state.pg.tpl); if (!t) return '';
    const c = pgCtx(), pg = state.pg;
    const role = c.isRead
      ? '당신은 초등학교 교과 탐구 독서 수업을 설계하는 교육과정·독서교육 전문가입니다. 세종형 「질문·탐구·성찰」 교과 탐구 독서 수업을 돕고 있습니다.'
      : '당신은 초등학교 질문중심 수업을 설계하는 교육과정 전문가입니다. 세종형 「질문·탐구·성찰」 질문중심 수업(학생이 질문을 만들고, 탐구하고, 성찰하는 수업)을 돕고 있습니다.';
    const parts = [`[역할]\n${role}`];
    parts.push(`[수업 정보]\n${c.rows.length ? c.rows.map((r) => `- ${r[0]}: ${r[1]}`).join('\n') : '- (아직 입력한 정보가 없습니다. 필요한 정보를 먼저 저에게 물어봐 주세요.)'}`);
    parts.push(`[요청]\n${t.task(c)}`);
    if (t.paste) parts.push(`[${t.id === 'qsort' ? '학생 질문' : '원문'}]\n${filled(pg.paste) ? pg.paste.trim() : '(여기에 붙여 넣으세요)'}`);
    if (t.full) parts.push(`[지도안]\n${toPlainText(state)}`);
    const cond = [
      `학생 수준: ${pg.level || '보통'}${pg.level === '기초' ? ' — 쉬운 낱말, 짧은 문장, 단계를 잘게 나눠 주세요.' : pg.level === '심화' ? ' — 근거 대기, 비교·평가 같은 높은 수준의 사고를 요구해도 됩니다.' : ''}`,
      '한국어로, 초등 교사가 바로 고쳐 쓸 수 있게 간결하게',
      '사실·통계·출처가 확실하지 않으면 지어내지 말고 [확인 필요]라고 표시',
      '학생 개인정보(실명·사진 등)는 다루지 않음',
    ];
    if (c.rows.length < 4) cond.push('수업 정보가 부족하면 답하기 전에 꼭 필요한 것만 2~3개 먼저 물어보기');
    parts.push(`[조건]\n${cond.map((x) => '- ' + x).join('\n')}`);
    parts.push(`[출력 형식]\n${pg.format || '표'}로 정리 — ${t.out}`);
    if (filled(pg.extra)) parts.push(`[추가 요청]\n${pg.extra.trim()}`);
    return parts.join('\n\n');
  }
  function pgPanelHtml() {
    const pg = state.pg, list = pgList();
    if (!list.find((t) => t.id === pg.tpl)) pg.tpl = list[0].id;
    const cur = PG.find((t) => t.id === pg.tpl);
    const sel = (p, opts, label) => `<div class="field"><label>${label}</label><select data-p="${p}">${opts.map((x) => `<option ${getp(p) === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>`;
    const grid = PG_GROUPS.map((g) => {
      const items = list.filter((t) => t.g === g); if (!items.length) return '';
      return `<div class="pg-group"><div class="pg-gname">${g}</div><div class="pg-grid">${items.map((t) => `<button class="pg-card ${t.id === pg.tpl ? 'on' : ''}" data-act="pgTpl" data-id="${t.id}"><b>${esc(t.name)}</b><span>${esc(t.desc)}</span></button>`).join('')}</div></div>`;
    }).join('');
    return `<div class="card">
      <h2>AI 프롬프트 생성기 <span class="pg-type">${esc(TYPES[state.type].name)}</span></h2>
      <p class="lead">만들고 싶은 것을 고르면, 지금까지 입력한 지도안 내용을 넣어 ChatGPT·Gemini·Claude 등에 바로 붙여 넣을 프롬프트를 만듭니다. 위에서 지도안 유형을 바꾸면 그 유형에 맞는 프롬프트로 바뀝니다.</p>
      <div class="sub"><div class="sub-head"><span>① 무엇을 만들까요?</span></div>${grid}</div>
      <div class="sub"><div class="sub-head"><span>② 조건 정하기 — ${esc(cur.name)}</span></div>
        <div class="pg-opts">${sel('pg.level', PG_LEVELS, '학생 수준')}${sel('pg.count', PG_COUNTS, '개수')}${sel('pg.format', PG_FORMATS, '출력 형식')}</div>
        <div class="field"><label>${state.type === 'read' ? '탐구 독서 자료(도서·기사명)' : '탐구 자료'} <span class="hint">비워 두면 지도안에 적은 자료를 씁니다.</span></label><input type="text" data-p="pg.book" value="${esc(pg.book)}" placeholder="${state.type === 'read' ? '예: 황근기(2009).『꼬물꼬물 갯벌 생물』' : '예: 학교 급식 잔반 사진, 우리 동네 지도'}"></div>
        ${cur.paste ? `<div class="field"><label>${esc(cur.paste)}</label><textarea data-p="pg.paste" rows="5" placeholder="여기에 붙여 넣으면 프롬프트에 함께 들어갑니다.">${esc(pg.paste)}</textarea></div>` : ''}
        <div class="field"><label>추가 요청 <span class="hint">선택 — 예: 모둠 활동으로, 40분 안에, 다문화 학생도 참여하기 쉽게</span></label><textarea data-p="pg.extra" rows="2">${esc(pg.extra)}</textarea></div>
      </div>
      <div class="sub"><div class="sub-head"><span>③ 프롬프트 복사 → AI에 붙여 넣기</span></div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button class="btn" data-act="pgMake">프롬프트 만들어 복사</button>
          <a class="btn ghost" href="https://chatgpt.com/" target="_blank" rel="noopener">ChatGPT</a>
          <a class="btn ghost" href="https://gemini.google.com/app" target="_blank" rel="noopener">Gemini</a>
          <a class="btn ghost" href="https://claude.ai/new" target="_blank" rel="noopener">Claude</a>
        </div>
        <p class="hint" style="margin:8px 0 0;color:var(--muted);font-size:.85rem">아래 상자에서 직접 고친 뒤 [고친 내용 복사]를 눌러도 됩니다.</p>
        <div class="prompt-box"><textarea id="pgOut" rows="12" placeholder="[프롬프트 만들어 복사]를 누르면 여기에 나타납니다.">${esc(pgLast)}</textarea></div>
        <div style="display:flex;gap:8px;margin-top:6px"><button class="btn ghost small" data-act="pgCopy">고친 내용 복사</button></div>
      </div>
      <div class="nav-btns no-print"><button class="btn ghost" data-act="closePG">← 지도안 쓰기로</button><button class="btn ghost" data-step="${STEPS.length}">전체 미리보기 →</button></div>
    </div>`;
  }
  let pgLast = '';
  function pgSideHtml() {
    const c = pgCtx(), h = state.pg.history || [];
    return `<div class="card tip"><h3>프롬프트에 들어가는 내용</h3>
        ${c.rows.length ? `<ul>${c.rows.map((r) => `<li><b>${esc(r[0])}</b>: ${esc(String(r[1]).slice(0, 40))}${String(r[1]).length > 40 ? '…' : ''}</li>`).join('')}</ul>` : '<p>아직 입력한 내용이 없습니다. AI가 필요한 정보를 먼저 묻도록 프롬프트가 만들어집니다.</p>'}
        <div class="ex">지도안 단계에서 학년·교과·단원·탐구 질문을 적어 둘수록 결과가 정확해집니다.</div></div>
      <div class="card tip"><h3>좋은 결과를 얻는 요령</h3><ul>
        <li>AI 답이 마음에 들지 않으면 “2번을 더 쉽게”, “표로 다시”처럼 <b>짧게 이어서 요청</b>하세요.</li>
        <li>교과서 쪽·읽기 자료가 있으면 AI 대화창에 <b>파일로 함께</b> 올리세요.</li>
        <li><b>[확인 필요]</b> 표시가 붙은 내용은 반드시 원문으로 확인하세요.</li>
        <li>학생 실명·사진·개인정보는 넣지 마세요.</li></ul></div>
      ${h.length ? `<div class="card no-print"><h3>최근 만든 프롬프트</h3><ul class="pg-hist">${h.map((x, i) => `<li><button class="link-btn" data-act="pgHist" data-i="${i}">${esc(x.name)}</button> <span>${esc(x.at)}</span></li>`).join('')}</ul><button class="btn ghost small" data-act="pgClear" style="margin-top:6px">기록 지우기</button></div>` : ''}`;
  }
  function openPG() { viewBlank = false; viewAI = false; viewPG = true; STEPS = stepsFor(); syncHeader(); renderSteps(); renderForm(); window.scrollTo({ top: 0 }); }

  /* ---------- 이벤트 ---------- */
  document.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t.dataset.stdq !== undefined) {
      const q = t.value.trim();
      document.querySelectorAll('.std-group').forEach((d) => {
        let n = 0;
        d.querySelectorAll('label.std').forEach((lb) => { const hit = !q || lb.textContent.includes(q); lb.style.display = hit ? '' : 'none'; if (hit) n++; });
        d.style.display = n ? '' : 'none'; if (q && n) d.open = true;
      });
      return;
    }
    if (t.dataset.p) setp(t.dataset.p, t.value);
    else if (t.dataset.lp) { const [i, k] = t.dataset.lp.split('.'); state.flow.lessons[+i][k] = t.value; }
    else if (t.dataset.ap) { const [i, k] = t.dataset.ap.split('.'); state.practice.activities[+i][k] = t.value; }
    else return;
    unmark(t.dataset.p || (t.dataset.lp ? 'flow.lessons' : 'practice.activities'), t);
    save(); refreshLive();
  });
  document.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.dataset.lpc !== undefined) unmark('flow.lessons', t);
    if (t.dataset.check) unmark(t.dataset.check, t);
    if (t.dataset.check) { const arr = getp(t.dataset.check); const i = arr.indexOf(t.value); if (t.checked && i < 0) arr.push(t.value); if (!t.checked && i >= 0) arr.splice(i, 1); }
    else if (t.dataset.lpc !== undefined) state.flow.lessons[+t.dataset.lpc].inquiry = t.checked;
    else if (t.dataset.sel) { onSelect(t.dataset.sel, t.value); return; }
    else if (t.dataset.std) { onStd(t.dataset.std, t.checked); return; }
    else if (t.dataset.cs) { onCs(t.dataset.cs, t.dataset.v, t.checked); return; }
    else return;
    save(); refreshLive();
  });
  document.addEventListener('click', async (ev) => {
    const sb = ev.target.closest('[data-step]'); if (sb) return go(+sb.dataset.step);
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act, i = +b.dataset.i;
    switch (act) {
      case 'blankDocx': { const blob = await withBlank(buildDocx); if (blob) download(blob, '빈양식_' + TYPES[state.type].name.replace(/\s/g, '') + '.docx'); return; }
      case 'closeBlank': return go(0);
      case 'prev': return go(Math.max(0, current - 1));
      case 'next': return go(current + 1);
      case 'addLesson': { const last = state.flow.lessons[state.flow.lessons.length - 1]; const n = parseInt(last && last.no, 10); state.flow.lessons.push({ no: isNaN(n) ? '' : String(n + 1), content: '', inquiry: false }); save(); return renderForm(); }
      case 'delLesson': if (state.flow.lessons.length > 1) state.flow.lessons.splice(i, 1); save(); return renderForm();
      case 'addAct': state.practice.activities.push(newActivity()); save(); return renderForm();
      case 'delAct': if (state.practice.activities.length > 1) state.practice.activities.splice(i, 1); save(); return renderForm();
      case 'import': {
        const p = state.practice;
        p.unit = state.overview.unit || p.unit; p.session = state.overview.sessions || p.session;
        p.source = state.design.sourceName || p.source; p.inquiryQ = state.design.inquiryQ || p.inquiryQ;
        save(); renderForm(); return toast('앞 단계 내용을 가져왔습니다.');
      }
      case 'mkPrompt': { const st = STEPS[current]; $('#promptOut').value = promptHead() + st.prompt(state) + PROMPT_TAIL; return; }
      case 'cpPrompt': { const t = $('#promptOut').value; if (!t) return toast('먼저 [프롬프트 만들기]를 눌러 주세요.'); await copy(t); return toast('프롬프트를 복사했습니다.'); }
      case 'docx': { const blob = await buildDocx(); if (blob) { download(blob, fileBase() + '.docx'); toast('Word 파일을 내려받았습니다.'); } return; }
      case 'print': { if (!viewBlank && current !== STEPS.length) go(STEPS.length); setTimeout(() => window.print(), 150); return; }
      case 'cpMaster': { const t = masterPrompt(); const o = $('#masterOut'); if (o) o.value = t; await copy(t); return toast('프롬프트를 복사했습니다. 쓰던 AI에 붙여 넣으세요.'); }
      case 'applyAI': {
        const t = ($('#aiPaste') || {}).value || '';
        if (!t.trim()) return toast('AI가 준 답을 먼저 붙여 넣어 주세요.');
        try { const n = applyAI(t); STEPS = stepsFor(); syncHeader(); renderSteps(); renderForm(); return toast(n ? `${n}개 칸을 채웠습니다. 표시된 칸을 확인하세요.` : '바뀐 칸이 없습니다.'); }
        catch (e) { return toast('JSON을 읽지 못했습니다. AI에게 “JSON 코드 블록만 다시 출력해 줘”라고 부탁하세요.'); }
      }
      case 'undoAI': { if (!aiBackup) return; state = aiBackup; aiBackup = null; save(); renderSteps(); renderForm(); return toast('채우기 전으로 되돌렸습니다.'); }
      case 'openAI': viewBlank = false; viewPG = false; viewAI = true; renderSteps(); renderForm(); window.scrollTo({ top: 0 }); return;
      case 'closeAI': return go(0);
      case 'openPG': return openPG();
      case 'closePG': return go(0);
      case 'pgTpl': state.pg.tpl = b.dataset.id; save(); pgLast = ''; renderForm(); return;
      case 'pgMake': {
        const t = pgBuild(); pgLast = t; const o = $('#pgOut'); if (o) o.value = t;
        const tp = PG.find((x) => x.id === state.pg.tpl);
        const h = state.pg.history || []; h.unshift({ name: tp.name + ' · ' + TYPES[state.type].name, at: new Date().toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }), text: t });
        state.pg.history = h.slice(0, 8); save(); $('#sideCol').innerHTML = pgSideHtml();
        await copy(t); return toast('프롬프트를 복사했습니다. 쓰던 AI에 붙여 넣으세요.');
      }
      case 'pgCopy': { const t = ($('#pgOut') || {}).value || ''; if (!t.trim()) return toast('먼저 [프롬프트 만들어 복사]를 눌러 주세요.'); pgLast = t; await copy(t); return toast('복사했습니다.'); }
      case 'pgHist': { const x = (state.pg.history || [])[i]; if (!x) return; pgLast = x.text; const o = $('#pgOut'); if (o) o.value = x.text; await copy(x.text); return toast('이전 프롬프트를 불러와 복사했습니다.'); }
      case 'pgClear': state.pg.history = []; save(); $('#sideCol').innerHTML = pgSideHtml(); return;
      case 'cpFix': await copy(fixPrompt()); return toast('고칠 곳을 담은 말을 복사했습니다. 쓰던 AI에 붙여 넣으세요.');
      case 'clearMarks': state.aiMarks = []; save(); renderForm(); return toast('AI 표시를 모두 지웠습니다.');
      case 'copyText': await copy(toPlainText(state)); return toast('지도안 전체 텍스트를 복사했습니다.');
    }
  });
  const promptHead = () => '당신은 초등학교 수업 설계를 돕는 교육과정 전문가입니다. 세종형 「질문·탐구·성찰」 ' + TYPES[state.type].name.replace(/ 수업$/, '') + ' 수업 지도안 작성을 돕고 있습니다.\n\n';
  const PROMPT_TAIL = '\n\n[출력 지침] 한국어, 교사 문서체(“~함.”, “~하도록 안내함.”)로 간결하게 작성하고, 항목별로 구분해 주세요.';

  $('#typeSel').addEventListener('change', (ev) => { state.type = ev.target.value; save(); if (viewBlank || viewAI || viewPG) { STEPS = stepsFor(); syncHeader(); renderSteps(); renderForm(); return; } go(0); toast('지도안 유형: ' + TYPES[state.type].name + ' (입력한 내용은 유지됩니다)'); });
  $('#btnAI').addEventListener('click', () => { viewBlank = false; viewPG = false; viewAI = true; STEPS = stepsFor(); syncHeader(); renderSteps(); renderForm(); window.scrollTo({ top: 0 }); });
  $('#btnPG').addEventListener('click', openPG);
  $('#btnBlank').addEventListener('click', () => { viewAI = false; viewPG = false; viewBlank = true; renderSteps(); renderForm(); window.scrollTo({ top: 0 }); });
  $('#btnSave').addEventListener('click', () => { download(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), fileBase() + '.json'); toast('작업 파일을 저장했습니다.'); });
  $('#fileLoad').addEventListener('change', (ev) => {
    const file = ev.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => { try { state = fixType(merge(emptyState(), JSON.parse(r.result))); save(); go(0); toast('작업을 불러왔습니다.'); } catch (e) { toast('파일을 읽을 수 없습니다.'); } };
    r.readAsText(file); ev.target.value = '';
  });
  $('#btnReset').addEventListener('click', () => { if (confirm('입력한 내용을 모두 지우고 새로 시작할까요?\n(필요하면 먼저 [작업 저장]을 해 두세요.)')) { state = emptyState(); save(); go(0); } });
  $('#btnSample').addEventListener('click', () => { if (!confirm('양식의 예시(6학년 수학)를 불러옵니다. 현재 입력한 내용은 대체됩니다.')) return; state = merge(emptyState(), SAMPLE); save(); go(0); toast('예시를 불러왔습니다.'); });

  /* ---------- 예시 데이터 (양식 파일 속 예시를 요약) ---------- */
  const SAMPLE = {
    overview: { topic: '택배 상자 속에 숨은 비례배분의 비밀', subject: '수학', grade: '6학년 2학기', unitKey: '6수02', unit: '비례식과 비례배분', sessions: '8~9/10', materials: ['기사'] },
    curriculum: { area: '변화와 관계', idea: '동치 관계, 대응 관계, 비례 관계 등은 여러 현상에 들어있는 대상들 사이의 다양한 관계를 기술하고 복잡한 문제를 해결하는 데 유용하게 활용된다.', knowledge: '비와 비율, 비례식과 비례배분', skill: '비례식을 풀고, 주어진 양을 비례배분하기', value: '비와 비율의 유용성 인식, 변화와 관계 관련 문제해결에서 비판적으로 사고하는 태도', standard: '[6수02-05] 비례배분을 알고, 주어진 양을 비례배분 할 수 있다.' },
    flow: { understanding: '비례배분은 전체를 정해진 비로 나누는 수학적 원리로, 일상생활의 다양한 문제를 합리적으로 해결하는 데 쓰인다.', essentialQ: '비례배분은 우리 생활 속 문제를 해결하는 데 어떻게 활용될까?', lessons: [
      { no: '1~2', content: '단원 도입 및 비의 성질을 알아보기', inquiry: false }, { no: '3', content: '간단한 자연수의 비로 나타내기', inquiry: false }, { no: '4', content: '비례식 알아보기', inquiry: false }, { no: '5', content: '비례식의 성질 알아보기', inquiry: false }, { no: '6', content: '비례식 활용하기', inquiry: false }, { no: '7', content: '비례배분 하기', inquiry: false }, { no: '8~10', content: '확인 및 실생활에 적용하기', inquiry: true }] },
    design: { inquiryQ: '택배 상자의 빈 공간을 백분율에 따라 비례배분하면, 과대포장 문제를 어떻게 해결할 수 있을까?', why: '택배 포장과 관련된 실제 생활 속 사례를 담은 읽기자료를 읽음으로써, 단순히 비례배분의 계산 방법을 익히는 것을 넘어 ‘왜 택배 포장에 비율이 필요할까?’, ‘비례배분은 실제로 어떻게 활용될까?’에 대한 정보를 수집하고 수학적으로 탐구할 수 있음.', sourceName: '「택배 상자 속에 숨은 비밀 이야기」 (원자료: 기후에너지환경부 보도자료)', reason: '정부 부처의 기사를 활용하여 택배 포장이라는 친숙한 생활 소재에서 비율과 비례배분의 필요성을 자연스럽게 발견할 수 있는 자료임.', usage: '읽기자료를 제공하여 과대포장 관련 포장공간비율(50%, 60%, 70%) 등 핵심 수학 정보를 찾도록 안내함.\n제시된 비율을 ‘물건 : 빈 공간’의 비로 바꾸어 표현해 보도록 지도함.\n모둠별 상자의 전체 부피를 구한 뒤, 비율에 따라 물건과 빈 공간의 양을 비례배분으로 계산하도록 이끎.\n탐구 결과를 공유하고 실생활 속 비례배분의 활용 가치를 종합적으로 정리하게 함.', expected: '빈 공간이 50%이면 물건과 빈 공간의 비는 1:1이 됨.\n빈 공간이 60%이면 2:3, 70%이면 3:7이 됨.\n전체 부피를 알면 비례배분으로 물건과 빈 공간의 부피를 구할 수 있음.', before: '택배 상자의 빈 공간은 어쩔 수 없이 생기는 것이라고 생각함.\n비례배분은 수학 시간에 문제를 풀 때만 쓰는 계산 방법이라고 생각함.', after: '상자 크기가 달라도 비율을 이용하면 공평하게 비교할 수 있음을 알게 됨.\n비례배분이 실생활 문제를 해결하는 데 활용되는 수학임을 깨달음.', newQ: '택배 상자의 크기가 달라지면 같은 비율이라도 물건과 빈 공간의 양은 어떻게 달라질까?\n비례배분을 활용하면 환경 문제를 해결하는 데 어떤 도움을 줄 수 있을까?' },
    practice: { unit: '비례식과 비례배분', session: '8~9/10', goal: '자료를 읽고 택배 상자의 빈 공간을 비와 비율로 나타내며, 주어진 백분율에 따라 물건과 빈 공간의 양을 비례배분할 수 있다.', source: '「택배 상자 속에 숨은 비밀 이야기」', intro: '택배 상자를 받아 본 경험 떠올리기\n상자 속 빈 공간에 대해 이야기하기', inquiryQ: '택배 상자의 빈 공간 비율이 달라지면 물건과 빈 공간의 비율은 어떻게 달라지고, 이를 비례배분으로 어떻게 나타낼 수 있을까?', activities: [
      { title: '읽기자료에서 수학 정보 찾기', points: '읽기자료를 읽으며 수학과 관련된 숫자와 정보를 찾아보기\n빈 공간 50%, 60%, 70%의 의미 확인하기', strategyName: '요약기법', strategyDesc: '글의 핵심 내용을 간결하게 재구성하는 전략', tipTitle: '수학자처럼 읽기', tipDesc: '“이 숫자는 무엇을 나타내지?”, “이것을 비로 나타내면 어떻게 되지?”라고 질문하며 읽어요.' },
      { title: '백분율을 비로 바꾸어 비례배분하기', points: '빈 공간이 50%, 60%, 70%일 때 물건과 빈 공간의 비 비교하기\n전체 상자의 부피를 알 때 비례배분으로 구하기', strategyName: '', strategyDesc: '', tipTitle: '', tipDesc: '' },
      { title: '탐구 결과 공유 및 발표하기', points: '모둠별 계산 결과 발표하기\n비례배분이 실제 택배 포장 문제에 어떻게 활용되는지 이야기하기', strategyName: '', strategyDesc: '', tipTitle: '', tipDesc: '' }], outro: '오늘 발견한 비례배분의 활용 사례 정리하기\n새로운 질문 스스로 던지기: “택배 상자 말고 우리 생활에서 비례배분이 사용되는 곳은 어디일까?”' },
    evalu: { elements: '탐구 자료를 읽고 포장공간비율과 비례배분의 관계를 이해하고 설명하기\n주어진 백분율에 따라 전체를 비례배분하여 문제를 해결하기', method: '관찰 평가, 산출물 평가(탐구 활동지, 성찰지)', high: '탐구 자료에서 포장공간비율과 관련된 정보를 정확하게 찾아 비와 비율의 관계를 이해하고, 주어진 상황을 적절한 비로 나타내어 비례배분할 수 있으며, 활용 이유를 타당하게 설명할 수 있다.', mid: '탐구 자료에서 포장공간비율과 관련된 정보를 찾고, 주어진 백분율에 따라 전체를 비례배분하여 문제를 해결할 수 있다.', low: '탐구 자료에서 정보를 찾고, 안내에 따라 주어진 백분율을 이용하여 비례배분 문제를 해결할 수 있다.' },
    appendix: { title: '택배 상자 속에 숨은 비밀 이야기', text: '(발췌한 읽기 자료 본문을 여기에 붙여 넣습니다.)', origin: '기후에너지환경부, 「제품의 포장재질 및 포장방법에 대한 간이측정방법 고시」 일부개정안 보도자료(2026.3.4.)' },
  };

  /* ---------- 시작 ---------- */
  renderSteps(); renderForm();
})();
