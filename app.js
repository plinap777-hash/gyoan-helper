/* 동료장학 수업지도안 도우미 — 초등 교과 탐구 독서 수업 지도안 (v0.1)
   순수 HTML/JS. 서버 없이 GitHub Pages에서 동작합니다. */
(function () {
  'use strict';

  const STORAGE_KEY = 'gyoan-helper-v1';
  const AI_TOOLS = ['웹페이지', '에듀테크', '스마트패드', '피지컬컴퓨터', '기타'];
  const AI_ACT_TITLES = ['질문생성하기', '질문에 대한 답을 찾는 방법 탐색하기', '문제해결 및 성찰하기'];
  const DEFAULT_REF = '질문중심 수업설계(2025). 『질문중심수업 일반화 모형』. 교육부.\n질문중심 수업모델(2025). 『질문중심 수업모델』. 교육부.';
  const CFG = window.APP_CONFIG || {};
  const SUBMIT = { url: /^https:\/\//.test(String(CFG.SUBMIT_URL || '').trim()) ? String(CFG.SUBMIT_URL).trim() : '', label: CFG.SUBMIT_LABEL || '최종 지도안 제출하기', notice: String(CFG.SUBMIT_NOTICE || '').trim() };
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
  });
  function newActivity() { return { title: '', points: '', strategyName: '', strategyDesc: '', tipTitle: '', tipDesc: '', aiUse: '' }; }

  let state = load() || emptyState();
  let current = 0;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return merge(emptyState(), JSON.parse(raw));
    } catch (e) { return null; }
  }
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
    ai: { name: '교과탐구 인공지능활용', sub: '초등 교과탐구 인공지능활용 수업' },
    extra: { name: '비교과 질문중심', sub: '초등 비교과 질문중심 수업' },
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
        prompt: (s) => `다음 비교과 질문중심 수업 지도안을 읽고, ① 본질 질문-탐구 질문-학습 목표-평가 요소의 일관성, ② 탐구 질문의 적절성, ③ 활동 흐름(질문 생성-탐구-내 말로 종합), ④ 성찰(수업 전/후 생각·새로운 질문)을 점검해 개선점을 제안해 주세요.\n\n${toPlainText(s)}`,
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
      return `<button class="step-btn ${i === current ? 'active' : ''} ${done ? 'done' : ''}" data-step="${i}"><span class="n">${done ? '✓' : i + 1}</span>${esc(st.title)}</button>`;
    }).join('') + `<button class="step-btn ${current === STEPS.length ? 'active' : ''}" data-step="${STEPS.length}"><span class="n">★</span>전체 미리보기</button>`;
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
      return `<div class="field"><span class="lbl">${esc(f.label)}</span><div class="checks">${f.options.map((o) => `<label><input type="checkbox" data-check="${f.p}" value="${esc(o)}" ${cur.includes(o) ? 'checked' : ''}> ${esc(o)}</label>`).join('')}</div></div>`;
    }
    if (f.type === 'lessons') return lessonsHtml();
    if (f.type === 'activities') return activitiesHtml();
    const v = getp(f.p);
    const hint = f.hint ? `<span class="hint">${esc(f.hint)}</span>` : '';
    const input = f.type === 'textarea'
      ? `<textarea data-p="${f.p}" rows="${f.rows || 3}" placeholder="${esc(f.ph || '')}">${esc(v)}</textarea>`
      : `<input type="text" data-p="${f.p}" value="${esc(v)}" placeholder="${esc(f.ph || '')}">`;
    return `<div class="field"><label>${esc(f.label)}${hint}</label>${input}</div>`;
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
    return `<div class="field"><span class="lbl">차시별 수업 흐름<span class="hint">${state.type === 'extra' ? '단원 전체 차시와 내용을 적으세요.' : '단원 전체 차시를 적고, 탐구 자료가 투입되는 차시(공개수업)를 체크하세요.'}</span></span>${rows}<button class="btn ghost small" data-act="addLesson">+ 차시 추가</button></div>`;
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
    return `<div class="field"><span class="lbl">전개 — 활동</span>${acts}<button class="btn ghost small" data-act="addAct">+ 활동 추가</button></div>`;
  }

  function exportPanelHtml() {
    return `<div class="sub no-print">
      <div class="sub-head"><span>내보내기</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        <button class="btn" data-act="docx">Word(.docx) 내려받기</button>
        <button class="btn ghost" data-act="print">인쇄 / PDF 저장</button>
        <button class="btn ghost" data-act="copyText">전체 텍스트 복사</button>
      </div>${SUBMIT.url || SUBMIT.notice ? `<div class="submit-box">${SUBMIT.notice ? `<b>📢 ${esc(SUBMIT.notice)}</b>` : ''}
        <div class="hint" style="margin-top:4px">Word(.docx)로 내려받은 뒤 한글파일에서 열어주세요. 제출시에는 “학년반_이름_지도안”처럼 바꾸어 제출하면 정리하기 좋습니다.</div>
        ${SUBMIT.url ? `<div style="margin-top:8px"><a class="btn submit" href="${esc(SUBMIT.url)}" target="_blank" rel="noopener">${esc(SUBMIT.label)} ↗</a></div>` : ''}</div>` : ''}</div>`;
  }

  let viewBlank = false;
  function renderForm() {
    if (viewBlank) {
      $('#formCol').innerHTML = `<div class="card"><h2>빈 양식 — ${esc(TYPES[state.type].name)}</h2><p class="lead">작성 전 지도안 양식입니다. 위 [지도안 유형]을 바꾸면 다른 유형의 빈 양식이 보입니다.</p><div class="no-print" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px"><button class="btn" data-act="blankDocx">빈 양식 Word(.docx)</button><button class="btn ghost" data-act="print">인쇄 / PDF</button><button class="btn ghost" data-act="closeBlank">작성 시작 →</button></div><div class="doc">${withBlank(previewHtml)}</div></div>`;
      $('#sideCol').innerHTML = '';
      return;
    }
    if (current === STEPS.length) {
      $('#formCol').innerHTML = `<div class="card"><h2>전체 미리보기</h2><p class="lead">입력한 내용이 지도안 양식 순서대로 정리됩니다. 비어 있는 항목은 회색으로 표시됩니다.</p>${exportPanelHtml()}<div class="doc">${previewHtml()}</div></div>`;
      renderSide();
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
      <div class="card no-print"><h3>AI 프롬프트 생성기</h3><div class="tip">지금까지 입력한 내용으로 ChatGPT·Claude·Gemini 등에 붙여 넣을 프롬프트를 만듭니다. ${current === STEPS.length - 1 ? '(마지막 단계에서는 지도안 전체 점검 요청이 만들어집니다.)' : ''}</div>
        <div style="display:flex;gap:6px;margin-top:8px"><button class="btn small" data-act="mkPrompt">프롬프트 만들기</button><button class="btn ghost small" data-act="cpPrompt">복사</button></div>
        <div class="prompt-box"><textarea id="promptOut" readonly placeholder="[프롬프트 만들기]를 누르세요."></textarea></div>
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
    const head = `<div class="doc-title">${filled(o.topic) ? esc(o.topic) : (blankMode ? esc(TYPES[state.type].name) + ' 수업 지도안' : '(수업 주제)')}</div><div class="center" style="margin-bottom:10px">${esc(TYPES[state.type].sub)} 지도안</div>`;
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
  function copy(text) { if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text); const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); return Promise.resolve(); }
  function go(i) { viewBlank = false; STEPS = stepsFor(); current = Math.min(i, STEPS.length); syncHeader(); renderSteps(); renderForm(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function refreshLive() { renderSteps(); if (current < STEPS.length) { const st = STEPS[current]; const ul = $('#checklist'); if (ul) ul.innerHTML = checkHtml(st.check(state)); const total = st.req.length, done = st.req.filter((p) => filled(getp(p))).length; const bar = $('#sideCol .progress i'); if (bar) bar.style.width = Math.round(done / total * 100) + '%'; const tx = $('#sideCol .card .tip'); if (tx) tx.textContent = `필수 항목 ${done}/${total}`; } }

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
    save(); refreshLive();
  });
  document.addEventListener('change', (ev) => {
    const t = ev.target;
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
      case 'copyText': await copy(toPlainText(state)); return toast('지도안 전체 텍스트를 복사했습니다.');
    }
  });
  const promptHead = () => '당신은 초등학교 수업 설계를 돕는 교육과정 전문가입니다. 세종형 「질문·탐구·성찰」 ' + TYPES[state.type].name + ' 수업 지도안 작성을 돕고 있습니다.\n\n';
  const PROMPT_TAIL = '\n\n[출력 지침] 한국어, 교사 문서체(“~함.”, “~하도록 안내함.”)로 간결하게 작성하고, 항목별로 구분해 주세요.';

  $('#typeSel').addEventListener('change', (ev) => { state.type = ev.target.value; save(); if (viewBlank) { STEPS = stepsFor(); syncHeader(); renderSteps(); renderForm(); return; } go(0); toast('지도안 유형: ' + TYPES[state.type].name + ' (입력한 내용은 유지됩니다)'); });
  $('#btnBlank').addEventListener('click', () => { viewBlank = true; renderSteps(); renderForm(); window.scrollTo({ top: 0 }); });
  $('#btnSave').addEventListener('click', () => { download(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), fileBase() + '.json'); toast('작업 파일을 저장했습니다.'); });
  $('#fileLoad').addEventListener('change', (ev) => {
    const file = ev.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => { try { state = merge(emptyState(), JSON.parse(r.result)); save(); go(0); toast('작업을 불러왔습니다.'); } catch (e) { toast('파일을 읽을 수 없습니다.'); } };
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
  (function initSubmit() { const b = $('#btnSubmit'); if (b && SUBMIT.url) { b.href = SUBMIT.url; b.textContent = SUBMIT.label + ' ↗'; if (SUBMIT.notice) b.title = SUBMIT.notice; b.hidden = false; } })();
  renderSteps(); renderForm();
})();
