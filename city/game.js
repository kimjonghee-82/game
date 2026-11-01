'use strict';
/* =========================================================================
   메트로 플래너 — 독창적인 도시 건설 시뮬레이션
   ========================================================================= */
let W = 64, H = 64, N = W * H;
const TW = 64, TH = 32;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = Math.random;
const idx = (x, y) => y * W + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const fmt = n => Math.round(n).toLocaleString('ko-KR');

/* ---------------- 정의 ---------------- */
const OCC = { R: [0, 6, 16, 40, 90, 180, 320, 700, 1500], C: [0, 4, 10, 26, 55, 110, 200, 700, 2000], I: [0, 8, 16, 32, 60, 110, 180, 500, 1200] };
const MAXLV = [0, 2, 4, 8];
const LVGATE = [0, 0, 0, 45, 70, 100, 130, 150, 172];
const IEQ = { 5: 55, 6: 75, 7: 90, 8: 105 };   // 공업 고단계 교육 요건
const CEQ = { 7: 70, 8: 90 };                  // 상업 초고층 교육 요건
const RANKS = [[0, '마을'], [2000, '소도시'], [10000, '도시'], [50000, '대도시'], [250000, '광역시'], [1000000, '메트로폴리스'], [5000000, '메갈로폴리스'], [10000000, '세계 도시']];
function cityRank(p) { let r = RANKS[0][1]; for (const [n, name] of RANKS) if (p >= n) r = name; return r; }
const MAXH = 8, STEP = 8;   // 지형 최고 높이, 한 단 높이(px)
const SECT = {   // 산업 업종
  agri:    { n: '농업', c: 10, pol: 0, wp: 0.5, hi: 0, max: 2, col: '#c5e1a5' },
  textile: { n: '섬유·경공업', c: 25, pol: 1.8, wp: 1.2, hi: 0 },
  steel:   { n: '철강', c: 40, pol: 5, wp: 2.5, hi: 0, port: 1 },
  petro:   { n: '석유화학', c: 55, pol: 6, wp: 3, hi: 0, port: 1 },
  auto:    { n: '자동차', c: 75, pol: 3, wp: 1.5, hi: 0 },
  electro: { n: '전자', c: 95, pol: 0.8, wp: 0.6, hi: 1 },
  bio:     { n: '바이오', c: 115, pol: 0.4, wp: 0.8, hi: 1 },
  aero:    { n: '항공우주', c: 130, pol: 0.6, wp: 0.3, hi: 1, air: 1 },
};
const SECKEYS = Object.keys(SECT);
const secOf = t => SECT[t.sec] || SECT.textile;
const occFor = t => Math.round(OCC[t.z][t.lvl] * (t.z === 'I' && t.sec === 'agri' ? 0.5 : 1));
const NB_NAMES = ['한빛시', '솔내시', '가람시', '누리시'];
const SIDE_NAMES = ['북동쪽', '남동쪽', '남서쪽', '북서쪽'];
const ZCOL = { R: '#4caf50', C: '#2196f3', I: '#ffc107' };
const ZNAME = { R: '주거', C: '상업', I: '공업' };
const DNAME = ['', '저밀도', '중밀도', '고밀도'];

const BLD = {
  police:   { n: '경찰서', sz: 2, cost: 500, mt: 25, dept: 'police', r: 12, use: 3, col: '#4a6fb5', h: 22, ico: '🚓', d: '범죄 감소' },
  fire:     { n: '소방서', sz: 2, cost: 500, mt: 25, dept: 'fire', r: 12, use: 3, col: '#c0392b', h: 22, ico: '🚒', d: '화재 예방·진압' },
  hospital: { n: '병원', sz: 2, cost: 900, mt: 40, dept: 'health', r: 14, use: 4, col: '#e8eef0', h: 34, ico: '🏥', d: '기대수명·주거 선호 상승' },
  school:   { n: '초등학교', sz: 2, cost: 600, mt: 30, dept: 'edu', r: 9, use: 3, col: '#d4a373', h: 16, ico: '🎒', w: 0.8, d: '기초 교육' },
  highschool:{ n: '고등학교', sz: 2, cost: 1500, mt: 50, dept: 'edu', r: 13, use: 4, col: '#c97b4a', h: 22, ico: '🏫', w: 1.1, d: '중등 교육 · 교육 수준 상승' },
  museum:   { n: '박물관', sz: 2, cost: 3000, mt: 25, dept: 'edu', r: 12, w: 0.5, lvb: 20, lr: 10, use: 3, col: '#bcaaa4', h: 24, ico: '🖼️', d: '지가·교육 수준 상승' },
  jail:     { n: '교도소', sz: 3, cost: 5000, mt: 50, dept: 'police', jail: 4000, use: 5, lvb: -35, lr: 7, col: '#78909c', h: 18, ico: '⛓️', d: '수감 4,000명 · 주변 지가 하락' },
  zoo:      { n: '동물원', sz: 3, cost: 6000, mt: 45, dept: 'rec', park: 30, pr: 6, lvb: 30, lr: 12, cboost: 0.05, col: '#a5d6a7', h: 8, ico: '🦁', d: '지가·상업 수요 상승' },
  marina:   { n: '마리나', sz: 2, cost: 2500, mt: 15, dept: 'rec', needWater: 1, lvb: 40, lr: 9, col: '#e3f2fd', h: 6, ico: '⛵', d: '물가 지가 크게 상승' },
  station:  { n: '기차역', sz: 1, cost: 800, mt: 12, dept: 'trans', railR: 9, needRail: 1, use: 2, col: '#8d6e63', h: 12, ico: '🚉', d: '철도로 다른 역·이웃 도시와 이어지면 반경 9칸 교통 45% 감소' },
  wtreat:   { n: '하수처리장', sz: 2, cost: 2500, mt: 25, dept: 'water', treat: 25000, use: 5, col: '#26a69a', h: 12, ico: '🧪', d: '주민 25,000명분 하수 처리 · 수질 개선' },
  toxic:    { n: '유해폐기물 처리장', sz: 2, cost: 0, mt: 0, dept: 'special', biz: 1, inc: [80, 0.004], pol: 45, wp: 80, lvb: -60, lr: 8, ap: -3, col: '#827717', h: 10, ico: '☣️', d: '사업 계약 시설' },
  maxprison:{ n: '최고보안 교도소', sz: 3, cost: 0, mt: 0, dept: 'special', biz: 1, inc: [60, 0.003], jail: 12000, lvb: -40, lr: 8, ap: -2, col: '#546e7a', h: 20, ico: '🔒', d: '사업 계약 시설 · 수감 12,000명' },
  missile:  { n: '미사일 기지', sz: 3, cost: 0, mt: 0, dept: 'special', biz: 1, inc: [100, 0.004], lvb: -30, lr: 9, ap: -4, col: '#6b8e23', h: 8, ico: '🚀', d: '사업 계약 시설' },
  resort:   { n: '카지노 리조트', sz: 2, cost: 0, mt: 0, dept: 'special', biz: 1, inc: [70, 0.006], lvb: 10, lr: 6, crimeb: 20, cboost: 0.06, ap: -1, col: '#ad1457', h: 40, ico: '🎰', d: '사업 계약 시설 · 주변 범죄 증가' },
  univ:     { n: '대학교', sz: 3, cost: 3000, mt: 80, dept: 'edu', r: 20, use: 6, col: '#a0522d', h: 30, ico: '🎓', w: 1.4, d: '넓은 범위 교육, 첨단산업 유치' },
  library:  { n: '도서관', sz: 1, cost: 400, mt: 15, dept: 'edu', r: 8, use: 1, col: '#8e7cc3', h: 16, ico: '📚', w: 0.6, d: '소규모 교육 시설' },
  park:     { n: '소공원', sz: 1, cost: 60, mt: 1, dept: 'rec', park: 30, pr: 4, flat: 'park', d: '지가 상승, 오염 감소' },
  bigpark:  { n: '대공원', sz: 2, cost: 350, mt: 5, dept: 'rec', park: 45, pr: 7, flat: 'park', d: '넓은 범위 지가 상승' },
  plaza:    { n: '분수광장', sz: 1, cost: 180, mt: 3, dept: 'rec', park: 40, pr: 4, flat: 'plaza', d: '상업지 선호 상승' },
  bus:      { n: '버스정류장', sz: 1, cost: 120, mt: 4, dept: 'trans', bus: 7, flat: 'bus', d: '주변 교통량 35% 감소' },
  coal:     { n: '석탄발전소', sz: 2, cost: 4000, mt: 30, dept: 'power', mw: 400, pol: 70, life: 50, col: '#6d4c41', h: 24, chim: 2, d: '400MW · 오염 심함' },
  gas:      { n: '가스발전소', sz: 2, cost: 6000, mt: 40, dept: 'power', mw: 260, pol: 25, life: 50, col: '#90a4ae', h: 22, ico: '🔥', d: '260MW · 오염 보통' },
  nuke:     { n: '원자력발전소', sz: 3, cost: 16000, mt: 70, dept: 'power', mw: 1400, pol: 4, life: 50, col: '#cfd8dc', h: 30, nuke: 1, d: '1400MW · 노후 시 사고 위험' },
  wind:     { n: '풍력발전기', sz: 1, cost: 250, mt: 2, dept: 'power', mw: 18, pol: 0, life: 40, wind: 1, d: '18MW · 친환경' },
  solar:    { n: '태양광발전소', sz: 2, cost: 1500, mt: 8, dept: 'power', mw: 70, pol: 0, life: 40, solar: 1, d: '70MW · 친환경' },
  pump:     { n: '양수장', sz: 1, cost: 400, mt: 8, dept: 'water', wcap: 250, wcapW: 700, use: 4, col: '#5dade2', h: 12, ico: '💧', d: '물가에 지으면 700, 내륙 250 · 도로와 연결' },
  tower:    { n: '급수탑', sz: 1, cost: 250, mt: 5, dept: 'water', wcap: 300, use: 1, wtower: 1, d: '급수 300 · 도로와 연결' },
  landfill: { n: '매립지', sz: 2, cost: 300, mt: 6, dept: 'waste', fill: 30000, pol: 18, flat: 'landfill', d: '쓰레기 30,000t 매립' },
  incin:    { n: '소각장', sz: 2, cost: 3000, mt: 30, dept: 'waste', burn: 500, mw: 40, pol: 35, col: '#795548', h: 22, chim: 1, ico: '♨️', d: '월 500t 소각 · 40MW 발전' },
  recycle:  { n: '재활용센터', sz: 1, cost: 800, mt: 15, dept: 'waste', recyc: 1, use: 2, col: '#27ae60', h: 14, ico: '♻️', d: '쓰레기 발생 15% 감소(최대 45%)' },
  port:     { n: '항구', sz: 3, cost: 5000, mt: 40, dept: 'special', use: 6, col: '#5d6d7e', h: 14, ico: '⚓', needWater: 1, pol: 15, d: '공업 수요 증가 · 물가에 건설' },
  airport:  { n: '공항', sz: 4, cost: 12000, mt: 80, dept: 'special', use: 10, flat: 'airport', pol: 20, d: '상업 수요 증가' },
  mansion:  { n: '시장 관저', sz: 2, cost: 0, mt: 0, dept: 'special', reward: 2000, lvb: 40, lr: 8, col: '#f5deb3', h: 18, ico: '🏡', d: '보상: 인구 2,000' },
  cityhall: { n: '시청', sz: 2, cost: 0, mt: 10, dept: 'special', reward: 10000, lvb: 30, lr: 10, col: '#f2f2f2', h: 30, ico: '🏛️', d: '보상: 인구 10,000 · 지지율 상승' },
  statue:   { n: '기념 동상', sz: 1, cost: 0, mt: 0, dept: 'special', reward: 20000, lvb: 25, lr: 7, col: '#b0bec5', h: 22, ico: '🗿', d: '보상: 인구 20,000' },
  stadium:  { n: '경기장', sz: 3, cost: 0, mt: 20, dept: 'special', reward: 40000, lvb: 15, lr: 10, col: '#9e9e9e', h: 16, ico: '🏟️', d: '보상: 인구 40,000 · 상업 수요 증가' },
  subway:   { n: '지하철역', sz: 1, cost: 1500, mt: 25, dept: 'trans', metro: 10, use: 2, col: '#455a64', h: 10, ico: '🚇', unlock: 10000, d: '반경 10칸 교통량 60% 감소' },
  bigwater: { n: '대형 정수장', sz: 3, cost: 30000, mt: 150, dept: 'water', wcap: 12000, use: 60, col: '#0288d1', h: 16, ico: '🌊', unlock: 100000, d: '급수 12,000 · 도로와 연결' },
  bigwaste: { n: '자원순환센터', sz: 3, cost: 40000, mt: 200, dept: 'waste', burn: 30000, mw: 500, pol: 15, life: 80, col: '#558b2f', h: 24, chim: 1, ico: '♻️', unlock: 100000, d: '월 30,000t 처리 · 500MW 발전' },
  fusion:   { n: '핵융합발전소', sz: 3, cost: 120000, mt: 500, dept: 'power', mw: 15000, pol: 2, life: 80, col: '#7e57c2', h: 34, ico: '⚛️', unlock: 250000, d: '15,000MW · 청정 에너지' },
  arcology: { n: '메가 아콜로지', sz: 3, cost: 1500000, mt: 600, dept: 'special', arc: 60000, use: 600, wuse: 500, trips: 300, lvb: 20, lr: 8, col: '#9fa8da', h: 190, ico: '🏙️', unlock: 300000, d: '주민 60,000명 수용 · 전기 600MW, 물 500 필요' },
  landmark: { n: '랜드마크 타워', sz: 2, cost: 0, mt: 30, dept: 'special', reward: 80000, lvb: 50, lr: 14, col: '#b3e5fc', h: 110, ico: '🗼', d: '보상: 인구 80,000' },
};

const TOOLS = {
  inspect:  { n: '조회 / 이동', ico: '🔍', type: 'inspect', d: '드래그로 화면 이동, 클릭으로 정보 보기' },
  bulldoze: { n: '불도저', ico: '🚜', type: 'rect', cost: 1, d: '건물·도로·나무 철거' },
  road:     { n: '도로', ico: '🛣️', type: 'line', cost: 10, d: '물 위에 지으면 다리(60)' },
  avenue:   { n: '대로', ico: '🚗', type: 'line', cost: 25, d: '교통 용량 3배' },
  powerline:{ n: '송전선', ico: '🔌', type: 'line', cost: 5, d: '전력 연결' },
  R1: { n: '저밀도 주거', ico: '🏠', type: 'rect', cost: 5, zone: ['R', 1] },
  R2: { n: '중밀도 주거', ico: '🏘️', type: 'rect', cost: 10, zone: ['R', 2] },
  R3: { n: '고밀도 주거', ico: '🏢', type: 'rect', cost: 20, zone: ['R', 3] },
  C1: { n: '저밀도 상업', ico: '🏪', type: 'rect', cost: 5, zone: ['C', 1] },
  C2: { n: '중밀도 상업', ico: '🏬', type: 'rect', cost: 10, zone: ['C', 2] },
  C3: { n: '고밀도 상업', ico: '🏙️', type: 'rect', cost: 20, zone: ['C', 3] },
  I1: { n: '저밀도 공업', ico: '🔧', type: 'rect', cost: 5, zone: ['I', 1] },
  I2: { n: '중밀도 공업', ico: '⚙️', type: 'rect', cost: 10, zone: ['I', 2] },
  I3: { n: '고밀도 공업', ico: '🏭', type: 'rect', cost: 20, zone: ['I', 3] },
  dezone:   { n: '구역 해제', ico: '⬜', type: 'rect', cost: 1, d: '빈 구역 지정 해제' },
  tree:     { n: '나무 심기', ico: '🌲', type: 'rect', cost: 3, d: '오염 감소·지가 상승' },
  d_fire:   { n: '화재 발생', ico: '🔥', type: 'click', d: '선택한 곳에 화재' },
  d_quake:  { n: '지진', ico: '🌋', type: 'click', d: '선택한 곳을 진원으로 지진' },
  d_tornado:{ n: '토네이도', ico: '🌪️', type: 'click', d: '선택한 곳에 토네이도' },
  d_flood:  { n: '홍수', ico: '🌊', type: 'click', d: '물가 저지대에 홍수' },
  d_meteor: { n: '운석 낙하', ico: '☄️', type: 'click', d: '선택한 곳에 운석' },
  d_riot:   { n: '폭동', ico: '✊', type: 'click', d: '선택한 곳에서 폭동' },
  raise:    { n: '땅 올리기', ico: '⛰️', type: 'rect', cost: 15, d: '한 단 올림 · 물을 메우면 40' },
  lower:    { n: '땅 내리기', ico: '🕳️', type: 'rect', cost: 15, d: '한 단 내림 · 가장 낮은 땅은 물이 됨(40)' },
  level:    { n: '평탄화', ico: '📏', type: 'rect', cost: 15, d: '드래그 시작 지점 높이로 맞춤 (단당 15)' },
  hwy:      { n: '고속도로', ico: '🛣️', type: 'line', cost: 80, d: '용량 매우 큼 · 구역에 직접 연결되지 않음' },
  rail:     { n: '철도', ico: '🛤️', type: 'line', cost: 25, d: '기차역끼리 연결 · 도로와 교차 가능' },
};
for (const k in BLD) {
  const b = BLD[k];
  TOOLS[k] = { n: b.n, ico: b.ico || ({ park: '🌳', bigpark: '🌲', plaza: '⛲', bus: '🚌', coal: '🏭', nuke: '☢️', wind: '🌬️', solar: '☀️', tower: '🗼', landfill: '🗑️', airport: '✈️' }[k] || '🏗️'), type: 'place', bld: k, cost: b.cost, d: b.d };
}
TOOLS.tower.ico = '🚰';

const CATS = [
  { ico: '🔍', n: '기본', tools: ['inspect', 'bulldoze', 'tree'] },
  { ico: '⛰️', n: '지형', tools: ['raise', 'lower', 'level'] },
  { ico: '🛣️', n: '교통', tools: ['road', 'avenue', 'hwy', 'rail', 'station', 'bus', 'subway'] },
  { ico: '🏘️', n: '구역', tools: ['R1', 'R2', 'R3', 'C1', 'C2', 'C3', 'I1', 'I2', 'I3', 'dezone'] },
  { ico: '⚡', n: '전력', tools: ['powerline', 'coal', 'gas', 'nuke', 'wind', 'solar', 'fusion'] },
  { ico: '💧', n: '수도', tools: ['pump', 'tower', 'bigwater', 'wtreat'] },
  { ico: '🏛️', n: '공공', tools: ['police', 'fire', 'jail', 'hospital', 'school', 'highschool', 'univ', 'library', 'museum'] },
  { ico: '🌳', n: '여가', tools: ['park', 'bigpark', 'plaza', 'zoo', 'marina'] },
  { ico: '🗑️', n: '쓰레기', tools: ['landfill', 'incin', 'recycle', 'bigwaste'] },
  { ico: '⭐', n: '특수', tools: ['arcology', 'port', 'airport', 'mansion', 'cityhall', 'statue', 'stadium', 'landmark', 'toxic', 'maxprison', 'missile', 'resort'] },
  { ico: '🌪️', n: '재해', tools: ['d_fire', 'd_quake', 'd_tornado', 'd_flood', 'd_meteor', 'd_riot'] },
];

const DEPTS = { trans: '교통(도로)', police: '경찰', fire: '소방', health: '보건', edu: '교육', rec: '공원·여가' };
const ORDS = {
  antipol:  { n: '대기오염 방지법', d: '공업 오염 40% 감소, 공업 수요 소폭 감소', c: 0 },
  energy:   { n: '에너지 절약 캠페인', d: '전력 소비 15% 감소', c: 0.003 },
  watch:    { n: '주민 방범대', d: '범죄 감소', c: 0.002 },
  volfire:  { n: '자원 소방대', d: '화재 발생률 25% 감소', c: 0.002 },
  recycleO: { n: '분리수거 의무화', d: '쓰레기 발생 20% 감소', c: 0.003 },
  tourism:  { n: '관광 홍보', d: '상업 수요 증가', c: 0.004 },
  casino:   { n: '합법 카지노', d: '수입 증가, 범죄 증가', c: -0.012 },
  clinic:   { n: '무료 진료소', d: '기대수명 증가', c: 0.004 },
  carpool:  { n: '카풀 장려', d: '교통량 10% 감소', c: 0.002 },
  beauty:   { n: '도시 미화 사업', d: '전체 지가 소폭 상승', c: 0.003 },
  tutor:    { n: '방과후 교실', d: '교육 수준 상승 속도 증가', c: 0.003 },
};
const OVERLAYS = [
  ['none', '기본'], ['lv', '지가'], ['pol', '오염'], ['crime', '범죄'], ['traffic', '교통'],
  ['wpol', '수질'], ['height', '지형 높이'], ['commute', '통근'],
  ['power', '전력'], ['water', '수도'], ['police', '치안 범위'], ['fire', '소방 범위'], ['health', '의료 범위'], ['edu', '교육 범위'],
];

/* ---------------- 상태 ---------------- */
let S = null;    // 저장되는 게임 상태
let T = null;    // 타일 배열 (S.tiles)
const M = {};      // 매달 다시 계산하는 지도
const MAPKEYS = ['wpol', 'commute', 'down', 'lv', 'pol', 'crime', 'traffic', 'cong', 'noise', 'police', 'fire', 'health', 'edu', 'park', 'bus', 'metro', 'bonus', 'waterProx', 'trees'];
function setSize(w) { W = H = w; N = W * H; for (const k of MAPKEYS) M[k] = new Float32Array(N); M.roadDist = new Uint8Array(N); }
setSize(64);
const RT = { pop: 0, cJobs: 0, iJobs: 0, unemp: 0, powerCap: 0, powerUse: 0, waterCap: 0, waterUse: 0, garbage: 0, garbageDone: 0, avgCong: 0, avgPol: 0, avgCrime: 0, budget: null };
let tornado = null;
let speed = 2;
const SPEED_DAYS = [0, 3, 8, 24];

function newTile() { return { ter: 0, tree: 0, k: '', z: '', d: 0, lvl: 0, occ: 0, hi: 0, ab: 0, b: '', o: -1, pl: 0, burn: 0, rub: 0, v: (rnd() * 4) | 0, age: 0, np: 0, pw: 0, wt: 0, h: 1, sec: '', rl: 0 }; }

/* ---------------- 지형 생성 ---------------- */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function genMap(seed, waterAmt, treeAmt, hillAmt) {
  const r = mulberry32(seed);
  const tiles = []; for (let i = 0; i < N; i++) { const t = newTile(); t.v = (r() * 4) | 0; tiles.push(t); }
  // 값 노이즈
  function noise(scale) {
    const gw = Math.ceil(W / scale) + 2, g = []; for (let i = 0; i < gw * gw; i++) g.push(r());
    const out = new Float32Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const fx = x / scale, fy = y / scale, x0 = fx | 0, y0 = fy | 0, tx = fx - x0, ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = g[y0 * gw + x0], b = g[y0 * gw + x0 + 1], c = g[(y0 + 1) * gw + x0], d = g[(y0 + 1) * gw + x0 + 1];
      out[idx(x, y)] = (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
    }
    return out;
  }
  // 강
  if (waterAmt > 0) {
    let x, y, dx, dy;
    if (r() < 0.5) { x = 5 + r() * (W - 10); y = 0; dx = 0; dy = 1; } else { x = 0; y = 5 + r() * (H - 10); dx = 1; dy = 0; }
    const width = 1 + waterAmt;
    for (let s = 0; s < 400; s++) {
      for (let oy = -width; oy <= width; oy++) for (let ox = -width; ox <= width; ox++) {
        if (ox * ox + oy * oy <= width * width * 0.8) { const tx = Math.round(x + ox), ty = Math.round(y + oy); if (inb(tx, ty)) tiles[idx(tx, ty)].ter = 1; }
      }
      x += dx + (r() - 0.5) * 1.4; y += dy + (r() - 0.5) * 1.4;
      if (!inb(Math.round(x), Math.round(y)) && s > 10) break;
    }
  }
  // 호수 / 해안
  const wn = noise(10);
  const thr = [1, 0.8, 0.74, 0.68][waterAmt];
  for (let i = 0; i < N; i++) if (wn[i] > thr) tiles[i].ter = 1;
  // 숲
  const tn = noise(7);
  const tthr = [1, 0.62, 0.52, 0.44][treeAmt];
  for (let i = 0; i < N; i++) if (tiles[i].ter === 0 && (tn[i] > tthr || r() < 0.02 * treeAmt)) tiles[i].tree = 1;
  // 중앙부는 비워 둔다
  for (let y = (H >> 1) - 6; y < (H >> 1) + 6; y++) for (let x = (W >> 1) - 6; x < (W >> 1) + 6; x++) { const t = tiles[idx(x, y)]; if (t.ter === 1 && waterAmt < 3) t.ter = 0; }
  // 높낮이: 물에서 멀수록, 언덕 노이즈가 클수록 높다
  const hn = noise(16), hn2 = noise(6), amp = [0, 3, 5, 7][hillAmt === undefined ? 1 : hillAmt];
  const dist = new Float32Array(N).fill(99); const q = [];
  for (let i = 0; i < N; i++) if (tiles[i].ter === 1) { dist[i] = 0; q.push(i); }
  for (let hd = 0; hd < q.length; hd++) { const i = q[hd], x = i % W, y = (i / W) | 0; for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) { if (!inb(nx, ny)) continue; const j = idx(nx, ny); if (dist[j] > dist[i] + 1) { dist[j] = dist[i] + 1; q.push(j); } } }
  for (let i = 0; i < N; i++) {
    const t = tiles[i]; if (t.ter === 1) { t.h = 0; continue; }
    const e = clamp((hn[i] * 0.8 + hn2[i] * 0.2 - 0.35) / 0.55, 0, 1);
    const shore = clamp(dist[i] / 4, 0, 1);
    t.h = 1 + Math.round(e * amp * shore);
  }
  // 중앙 시작 지역은 평평하게
  const ch0 = tiles[idx(W >> 1, H >> 1)].h || 1;
  for (let y = (H >> 1) - 5; y < (H >> 1) + 5; y++) for (let x = (W >> 1) - 5; x < (W >> 1) + 5; x++) { const t = tiles[idx(x, y)]; if (t.ter === 0) t.h = ch0; }
  return tiles;
}
function calcWaterProx() {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let best = 99;
    for (let oy = -4; oy <= 4; oy++) for (let ox = -4; ox <= 4; ox++) {
      const tx = x + ox, ty = y + oy; if (!inb(tx, ty)) continue;
      if (T[idx(tx, ty)].ter === 1) { const d = Math.hypot(ox, oy); if (d < best) best = d; }
    }
    M.waterProx[idx(x, y)] = best > 4 ? 0 : 1 - best / 5;
  }
}

function newGame(opts) {
  setSize(opts.size || 128);
  S = {
    ver: 3, W, unlocked: {}, name: opts.name || '새 도시', seed: opts.seed, year: 2000, month: 3, day: 0,
    money: opts.money, tiles: genMap(opts.seed, opts.water, opts.trees, opts.hills),
    nb: NB_NAMES.map((n, k) => ({ name: n, side: k, pop: Math.round(20000 + rnd() * 180000) })), deals: [], inmates: 0,
    secTax: Object.fromEntries(SECKEYS.map(k => [k, 0])), biz: {}, bizCd: {}, petCd: {}, offer: null,
    tax: { R: 9, C: 9, I: 9 }, fund: { trans: 100, police: 100, fire: 100, health: 100, edu: 100, rec: 100 },
    ord: {}, loans: [], demand: { R: 0.6, C: 0.2, I: 0.6 }, eq: 40, life: 65, approval: 70,
    garbageStock: 0, fills: {}, rewards: {}, hist: [], disasters: opts.disasters !== false,
    news: [], adviceCd: {}, totalMonths: 0,
  };
  T = S.tiles;
  calcWaterProx();
  M.lv.fill(0);
  tornado = null;
  for (let i = 0; i < N; i++) M.lv[i] = 50 + M.waterProx[i] * 40;
  monthly(true);
  zoom = innerWidth < 700 ? 0.7 : 1;
  centerCamera(W / 2, H / 2);
  news('새 도시 「' + S.name + '」가 세워졌습니다. 발전소 → 송전선 → 구역 → 도로 순서로 시작해 보세요!', 'good');
  refreshUI();
}

/* ---------------- 유틸 ---------------- */
function footprint(i) { const t = T[i]; if (t.k !== 'bld') return [i]; const o = t.o, ox = o % W, oy = (o / W) | 0, sz = BLD[T[o].b].sz, out = []; for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) out.push(idx(ox + x, oy + y)); return out; }
function eachBld(fn) { for (let i = 0; i < N; i++) { const t = T[i]; if (t.k === 'bld' && t.o === i) fn(i, t, BLD[t.b]); } }
function isRoad(t) { return t.k === 'road' || t.k === 'avenue' || t.k === 'hwy'; }
function isStreet(t) { return t.k === 'road' || t.k === 'avenue'; }
function isRail(t) { return t.k === 'rail' || (isStreet(t) && t.rl); }
function conducts(t) { return t.k === 'zone' || t.k === 'power' || t.k === 'bld' || (isRoad(t) && t.pl); }
function powerLineAt(t) { return t.k === 'power' || (isRoad(t) && t.pl); }
function news(text, kind) {
  S.news.unshift({ text, kind: kind || 'info', date: dateStr() });
  if (S.news.length > 60) S.news.length = 60;
  const el = $('tickText'); el.textContent = text; el.className = kind || '';
  $('tickIcon').textContent = { good: '🎉', warn: '⚠️', bad: '🚨' }[kind] || '📰';
}
function dateStr() { return S.year + '년 ' + (S.month + 1) + '월'; }
function bldCenter(i) { const sz = BLD[T[i].b].sz; return [(i % W) + sz / 2, ((i / W) | 0) + sz / 2]; }
function stamp(arr, cx, cy, r, val, mode) {
  const r2 = Math.ceil(r);
  for (let y = Math.floor(cy - r2); y <= cy + r2; y++) for (let x = Math.floor(cx - r2); x <= cx + r2; x++) {
    if (!inb(x, y)) continue; const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d > r) continue;
    const v = val * (1 - d / (r + 1)); const j = idx(x, y);
    if (mode === 'max') { if (v > arr[j]) arr[j] = v; } else arr[j] += v;
  }
}
function blur(arr, iter, keep) {
  const tmp = new Float32Array(N);
  for (let k = 0; k < iter; k++) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = idx(x, y); let s = 0, c = 0;
      if (x > 0) { s += arr[i - 1]; c++; } if (x < W - 1) { s += arr[i + 1]; c++; }
      if (y > 0) { s += arr[i - W]; c++; } if (y < H - 1) { s += arr[i + W]; c++; }
      tmp[i] = arr[i] * keep + (s / c) * (1 - keep);
    }
    arr.set(tmp);
  }
}

/* ---------------- 시뮬레이션 ---------------- */
function computeRoadDist() {
  const d = M.roadDist; d.fill(255); const q = [];
  for (let i = 0; i < N; i++) if (isStreet(T[i])) { d[i] = 0; q.push(i); }
  let h = 0;
  while (h < q.length) {
    const i = q[h++], x = i % W, y = (i / W) | 0; if (d[i] >= 4) continue;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (!inb(nx, ny)) continue; const j = idx(nx, ny); if (d[j] === 255) { d[j] = d[i] + 1; q.push(j); }
    }
  }
}
const SEASON_POWER = [1.1, 1.1, 1, 1, 1, 1, 1.06, 1.06, 1, 1, 1, 1.1];
function powerUse(t, i) {
  if (t.k === 'zone') return t.lvl > 0 && !t.ab ? (1 + t.lvl) * (S.ord.energy ? 0.85 : 1) * SEASON_POWER[S.month] : 0;
  if (t.k === 'bld' && t.o === i) return BLD[t.b].use || 0;
  return 0;
}
function plantMW(t) {
  const b = BLD[t.b]; if (!b.mw) return 0;
  const age = S.year - t.age; let f = 1; if (b.life && age > b.life - 5) f = 0.75;
  if (b.wind) f *= (0.7 + 0.3 * Math.sin(S.totalMonths * 0.7 + t.v)) * (1 + 0.1 * (t.h - 1));
  return b.mw * f;
}
function computePower() {
  for (let i = 0; i < N; i++) T[i].pw = 0;
  const comp = new Int32Array(N).fill(-1);
  let cap = 0, use = 0, cid = 0, short = 0, isolated = 0;
  const plants = []; eachBld((i, t, b) => { if (b.mw) plants.push(i); });
  // 이웃 도시 전력 거래: 경계의 송전선 타일이 가상 발전소/소비처가 된다
  const vsrc = new Map(), vsink = new Map(); RT.dealOk = RT.dealOk || {};
  for (const d of S.deals || []) {
    if (d.type !== 'pBuy' && d.type !== 'pSell') continue;
    const tile = RT.conn ? RT.conn[d.side].powerTile : -1;
    RT.dealOk[d.id] = false;
    if (tile < 0) continue;
    const m = d.type === 'pBuy' ? vsrc : vsink; m.set(tile, (m.get(tile) || 0) + d.amt);
    if (d.type === 'pBuy') RT.dealOk[d.id] = true;
  }
  for (const k of vsrc.keys()) plants.push(k);
  for (const p of plants) {
    if (comp[p] >= 0) continue;
    const q = []; for (const j of footprint(p)) { comp[j] = cid; q.push(j); }
    let h = 0, capacity = 0; const order = [], sinks = [];
    while (h < q.length) {
      const i = q[h++], t = T[i]; order.push(i);
      if (t.k === 'bld' && t.o === i && BLD[t.b].mw) capacity += plantMW(t);
      if (vsrc.has(i)) capacity += vsrc.get(i);
      if (vsink.has(i)) { capacity -= vsink.get(i); sinks.push(i); }
      const x = i % W, y = (i / W) | 0;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (!inb(nx, ny)) continue; const j = idx(nx, ny);
        if (comp[j] < 0 && conducts(T[j]) && !T[j].burn) { comp[j] = cid; q.push(j); }
      }
    }
    if (sinks.length) { const ok = capacity >= 0; for (const d of S.deals) if (d.type === 'pSell' && sinks.includes(RT.conn[d.side].powerTile)) RT.dealOk[d.id] = ok; capacity = Math.max(0, capacity); }
    let consumers = 0; for (const i of order) if (!(T[i].k === 'bld' && BLD[T[T[i].o].b].mw)) consumers++;
    if (!consumers) { isolated++; cid++; continue; }
    cap += capacity; let remain = capacity;
    // 발전소 타일은 항상 전력 공급
    for (const i of order) { const t = T[i]; if (t.k === 'bld' && BLD[t.b].mw) t.pw = 1; }
    for (const i of order) {
      const t = T[i]; if (t.pw) continue;
      const u = powerUse(t, i); use += u;
      if (u <= remain) { remain -= u; t.pw = 1; } else if (u > 0) short++;
    }
    cid++;
  }
  // 다중 타일 건물: 원점 전력 상태를 전체에 반영
  eachBld((i, t) => { const p = t.pw; for (const j of footprint(i)) T[j].pw = p; });
  RT.powerCap = cap; RT.powerUse = use; RT.powerShort = short; RT.plantIsolated = isolated;
}
function computeWater() {
  for (let i = 0; i < N; i++) T[i].wt = 0;
  const comp = new Int32Array(N).fill(-1); const caps = [];
  let total = 0, used = 0, qs = 0, qw = 0;
  const label = start => {
    if (comp[start] >= 0) return comp[start];
    const c = caps.length; caps.push(0); const q = [start]; comp[start] = c;
    for (let h = 0; h < q.length; h++) { const k = q[h], x = k % W, y = (k / W) | 0; for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) { if (!inb(nx, ny)) continue; const j = idx(nx, ny); if (comp[j] < 0 && isRoad(T[j])) { comp[j] = c; q.push(j); } } }
    return c;
  };
  eachBld((i, t, b) => {
    if (!b.wcap || !t.pw) return;
    let cap = b.wcap;
    if (b.wcapW) { const fp = footprint(i); let nearW = false; for (const j of fp) { const x = j % W, y = (j / W) | 0; for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) if (inb(nx, ny) && T[idx(nx, ny)].ter === 1 && !isRoad(T[idx(nx, ny)])) nearW = true; } if (nearW) cap = b.wcapW; }
    // 수질 오염이 심한 곳의 물은 덜 쓸 수 있다
    const wp = M.wpol[i]; cap *= clamp(1 - wp / 140, 0.3, 1);
    qs += (100 - Math.min(100, wp)) * cap; qw += cap;
    total += cap;
    const x0 = i % W, y0 = (i / W) | 0, sz = b.sz; let start = -1;
    for (let y = y0 - 1; y <= y0 + sz && start < 0; y++) for (let x = x0 - 1; x <= x0 + sz; x++) { if (inb(x, y) && isRoad(T[idx(x, y)])) { start = idx(x, y); break; } }
    if (start < 0) return;
    caps[label(start)] += cap;
  });
  // 이웃 도시 물 거래 (경계 도로 = 상수도관)
  RT.dealOk = RT.dealOk || {};
  const sells = [];
  for (const d of S.deals || []) {
    if (d.type !== 'wBuy' && d.type !== 'wSell') continue;
    const tile = RT.conn ? RT.conn[d.side].roadTile : -1;
    RT.dealOk[d.id] = tile >= 0;
    if (tile < 0) continue;
    const c = label(tile);
    if (d.type === 'wBuy') { caps[c] += d.amt; total += d.amt; qs += 90 * d.amt; qw += d.amt; }
    else { caps[c] -= d.amt; sells.push([d, c]); }
  }
  for (const [d, c] of sells) if (caps[c] < 0) { RT.dealOk[d.id] = false; caps[c] = 0; }
  // 소비자 배분
  for (let i = 0; i < N; i++) {
    const t = T[i];
    let u = 0;
    if (t.k === 'zone') u = t.lvl > 0 && !t.ab ? t.lvl : 0.0001; else if (t.k === 'bld' && t.o === i && !BLD[t.b].wcap && !BLD[t.b].flat) u = BLD[t.b].wuse || 1; else continue;
    const sz = t.k === 'bld' ? BLD[t.b].sz : 1;
    if (sz === 1 && M.roadDist[i] > 2) continue;
    const x = i % W, y = (i / W) | 0; let got = false;
    for (let oy = -2; oy <= sz + 1 && !got; oy++) for (let ox = -2; ox <= sz + 1; ox++) {
      const nx = x + ox, ny = y + oy; if (!inb(nx, ny)) continue; const c = comp[idx(nx, ny)];
      if (c >= 0 && caps[c] >= u) { caps[c] -= u; used += u; t.wt = 1; got = true; break; }
    }
  }
  eachBld((i, t) => { const w = t.wt || BLD[t.b].wcap; for (const j of footprint(i)) T[j].wt = w ? 1 : 0; });
  RT.waterCap = total; RT.waterUse = used; RT.waterQ = qw ? qs / qw : 100;
}
function computeRail() {
  const comp = new Int32Array(N).fill(-1); const info = [];
  for (let i = 0; i < N; i++) {
    if (comp[i] >= 0 || !isRail(T[i])) continue;
    const c = info.length, q = [i]; comp[i] = c; let edge = false;
    for (let h = 0; h < q.length; h++) {
      const k = q[h], x = k % W, y = (k / W) | 0; if (x === 0 || y === 0 || x === W - 1 || y === H - 1) edge = true;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) { if (!inb(nx, ny)) continue; const j = idx(nx, ny); if (comp[j] < 0 && isRail(T[j])) { comp[j] = c; q.push(j); } }
    }
    info.push({ edge, st: 0 });
  }
  const st = [];
  eachBld((i, t, b) => {
    if (!b.railR) return; const cs = new Set(); const x0 = i % W, y0 = (i / W) | 0;
    for (let y = y0 - 1; y <= y0 + b.sz; y++) for (let x = x0 - 1; x <= x0 + b.sz; x++) if (inb(x, y) && comp[idx(x, y)] >= 0) cs.add(comp[idx(x, y)]);
    st.push([i, cs]); for (const c of cs) info[c].st++;
  });
  RT.stations = 0; RT.stationsLinked = 0;
  for (const [i, cs] of st) { let ok = false; for (const c of cs) if (info[c].st >= 2 || info[c].edge) ok = true; T[i].rc = ok ? 1 : 0; RT.stations++; if (ok) RT.stationsLinked++; }
}
function computeCoverage() {
  for (const k of ['police', 'fire', 'health', 'edu', 'park', 'bus', 'metro', 'bonus']) M[k].fill(0);
  eachBld((i, t, b) => {
    const [cx, cy] = bldCenter(i);
    if (b.park) stamp(M.park, cx, cy, b.pr, b.park, 'add');
    if (b.bus) stamp(M.bus, cx, cy, b.bus, 100, 'max');
    if (b.metro && t.pw) stamp(M.metro, cx, cy, b.metro, 100, 'max');
    if (b.railR && t.pw && t.rc) stamp(M.metro, cx, cy, b.railR, 75, 'max');
    if (b.lvb) stamp(M.bonus, cx, cy, b.lr, b.lvb, 'add');
    if (!b.r || !t.pw) return;
    const eff = Math.min(S.fund[b.dept] / 100, 1.25);
    const r = b.r * Math.sqrt(Math.max(eff, 0.1));
    if (b.dept === 'edu') stamp(M.edu, cx, cy, r, 100 * eff * (b.w || 1), 'add');
    else stamp(M[b.dept], cx, cy, r, 100 * eff, 'max');
  });
  for (let i = 0; i < N; i++) { if (M.edu[i] > 120) M.edu[i] = 120; if (M.park[i] > 80) M.park[i] = 80; }
}
function computeTraffic() {
  M.traffic.fill(0);
  const carF = S.ord.carpool ? 0.9 : 1;
  // 도로망 구성 요소: 같은 도로망 안에서만 출퇴근할 수 있다
  const rc = new Int32Array(N).fill(-1), cRes = [], cJob = [], cEdge = [];
  for (let i = 0; i < N; i++) {
    if (rc[i] >= 0 || !isRoad(T[i])) continue;
    const c = cRes.length, q = [i]; rc[i] = c; let edge = false;
    for (let h = 0; h < q.length; h++) { const k = q[h], x = k % W, y = (k / W) | 0; if (x === 0 || y === 0 || x === W - 1 || y === H - 1) edge = true; for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) { if (!inb(nx, ny)) continue; const j = idx(nx, ny); if (rc[j] < 0 && isRoad(T[j])) { rc[j] = c; q.push(j); } } }
    cRes.push(0); cJob.push(0); cEdge.push(edge);
  }
  const zc = new Int32Array(N).fill(-1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y), t = T[i];
    if (t.k !== 'zone' && !(t.k === 'bld' && t.o === i)) continue;
    let near = -1;
    for (let r = 1; r <= 3 && near < 0; r++) for (let oy = -r; oy <= r && near < 0; oy++) for (let ox = -r; ox <= r; ox++) { const nx = x + ox, ny = y + oy; if (inb(nx, ny) && isRoad(T[idx(nx, ny)])) { near = rc[idx(nx, ny)]; break; } }
    if (near < 0) continue; zc[i] = near;
    if (t.k === 'zone' && !t.ab) { if (t.z === 'R') cRes[near] += t.occ; else cJob[near] += t.occ; }
    else if (t.k === 'bld' && BLD[t.b].arc) cRes[near] += t.occ;
  }
  RT.roadComp = rc; RT.compPop = cRes.map((r, k) => r + cJob[k]);
  const ext = RT.extJobs || 0;
  M.commute.fill(1);
  for (let i = 0; i < N; i++) {
    const t = T[i]; if (t.k !== 'zone') continue; const c = zc[i]; if (c < 0) { M.commute[i] = 0; continue; }
    const e = cEdge[c] ? ext : 0;
    M.commute[i] = t.z === 'R' ? clamp((cJob[c] + e + 60) / (cRes[c] * 0.45 + 60), 0, 1) : clamp((cRes[c] * 0.45 + e + 60) / (cJob[c] + 60), 0, 1);
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y), t = T[i];
    let trips = 0;
    if (t.k === 'zone' && t.lvl > 0 && !t.ab) trips = Math.pow(t.occ, 0.7) * (t.z === 'R' ? 0.6 : t.z === 'C' ? 0.8 : 0.6);
    else if (t.k === 'bld' && t.o === i) { const b = BLD[t.b]; trips = b.trips !== undefined ? b.trips * Math.min(1, t.occ / (b.arc || 1) + 0.1) : (b.use || 0) * 2; }
    if (!trips) continue;
    trips *= (1 - Math.max(0.35 * M.bus[i], 0.6 * M.metro[i]) / 100) * carF;
    const roads = [];
    for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) { const nx = x + ox, ny = y + oy; if (inb(nx, ny) && isRoad(T[idx(nx, ny)])) roads.push(idx(nx, ny)); }
    if (!roads.length) continue;
    const per = trips / roads.length; for (const j of roads) M.traffic[j] += per;
  }
  const capF = clamp(S.fund.trans / 100, 0.3, 1.1);
  let sum = 0, cnt = 0;
  M.cong.fill(0);
  for (let i = 0; i < N; i++) { const t = T[i]; if (!isRoad(t)) continue; const cap = (t.k === 'hwy' ? 450 : t.k === 'avenue' ? 140 : 40) * capF; M.cong[i] = M.traffic[i] / cap; sum += Math.min(M.cong[i], 2); cnt++; }
  RT.avgCong = cnt ? sum / cnt : 0;
  M.noise.fill(0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let m = 0; for (const [nx, ny] of [[x, y], [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) if (inb(nx, ny)) m = Math.max(m, M.cong[idx(nx, ny)]);
    M.noise[idx(x, y)] = Math.min(m, 2);
  }
}
function computeConnections() {
  RT.conn = [0, 1, 2, 3].map(() => ({ road: 0, hwy: 0, rail: 0, power: 0, roadTile: -1, powerTile: -1 }));
  const side = (x, y) => y === 0 ? 0 : x === W - 1 ? 1 : y === H - 1 ? 2 : x === 0 ? 3 : -1;
  const live = i => { const c = RT.roadComp ? RT.roadComp[i] : -1; return c >= 0 && RT.compPop[c] > 0; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sd = side(x, y); if (sd < 0) continue; const i = idx(x, y), t = T[i], c = RT.conn[sd];
    if (isStreet(t) && live(i)) { c.road = 1; c.roadTile = i; }
    if (t.k === 'hwy' && live(i)) { c.hwy = 1; c.roadTile = i; }
    if (isRail(t)) c.rail = 1;
    if (powerLineAt(t)) { c.power = 1; c.powerTile = i; }
  }
  let ext = 0;
  for (const nb of S.nb) { const c = RT.conn[nb.side]; ext += nb.pop * 0.004 * ((c.road ? 1 : 0) + (c.hwy ? 2 : 0) + (c.rail ? 1.2 : 0)); }
  RT.extJobs = Math.min(ext, RT.pop * 0.6 + 3000);
  RT.railFreight = RT.conn.some(c => c.rail);
}
function neighborsGrow() {
  for (const nb of S.nb) {
    const c = RT.conn[nb.side]; let g = 1.0012 + (c.road || c.hwy || c.rail ? 0.0008 : 0);
    if (RT.pop > nb.pop * 2) g += 0.002;
    nb.pop = Math.round(nb.pop * g);
  }
}
function computeWaterPol() {
  const w = M.wpol; w.fill(0);
  const iF = S.ord.antipol ? 0.7 : 1;
  for (let i = 0; i < N; i++) {
    const t = T[i];
    if (t.k === 'zone' && t.z === 'I' && t.lvl > 0 && !t.ab) w[i] += Math.sqrt(t.occ) * secOf(t).wp * iF;
    else if (t.k === 'bld') { const b = BLD[T[t.o].b]; if (b.wp) w[i] += b.wp; else if (b.fill) w[i] += 25; else if (b.needWater) w[i] += 10; }
  }
  let treat = 0; eachBld((i, t, b) => { if (b.treat && t.pw) treat += b.treat; });
  RT.treat = treat;
  const un = RT.pop > 800 ? clamp(1 - treat / RT.pop, 0, 1) : 0; RT.untreated = un;
  for (let i = 0; i < N; i++) if (T[i].ter === 1) w[i] += un * 45;
  blur(w, 6, 0.45);
  for (let i = 0; i < N; i++) w[i] = clamp(w[i], 0, 100);
}
function computePollution() {
  const p = M.pol; p.fill(0);
  const iF = S.ord.antipol ? 0.6 : 1;
  for (let i = 0; i < N; i++) {
    const t = T[i];
    if (t.k === 'zone' && t.z === 'I' && t.lvl > 0 && !t.ab) p[i] += Math.sqrt(t.occ) * secOf(t).pol * iF;
    else if (t.k === 'bld') { const b = BLD[T[t.o].b]; if (b.pol) p[i] += b.pol; }
    if (isRoad(t)) p[i] += Math.min(M.cong[i], 2) * 18;
    if (t.tree) p[i] -= 10;
  }
  for (let i = 0; i < N; i++) p[i] -= M.park[i] * 0.2;
  if (S.garbageStock > 0) { const g = Math.min(S.garbageStock / 200, 15); for (let i = 0; i < N; i++) if (T[i].k === 'zone' && T[i].lvl) p[i] += g; }
  blur(p, 4, 0.4);
  let s = 0, c = 0;
  for (let i = 0; i < N; i++) { p[i] = clamp(p[i], 0, 150); if (T[i].k === 'zone' && T[i].lvl) { s += p[i]; c++; } }
  RT.avgPol = c ? s / c : 0;
}
function computeCrime() {
  const c = M.crime; c.fill(0);
  const extra = (S.ord.casino ? 14 : 0) - (S.ord.watch ? 10 : 0);
  for (let i = 0; i < N; i++) {
    const t = T[i];
    if (t.k === 'zone' && t.lvl > 0) {
      c[i] = 12 + Math.sqrt(t.occ) * 1.3 + RT.unemp * 90 + extra - M.lv[i] * 0.08 + (t.ab ? 30 : 0);
    } else if (t.k === 'zone') c[i] = 5;
  }
  eachBld((i, t, b) => { if (b.crimeb) { const [cx, cy] = bldCenter(i); stamp(c, cx, cy, 8, b.crimeb, 'add'); } });
  blur(c, 1, 0.6);
  const jo = RT.jailOver || 0, pf = 0.75 * (1 - 0.5 * jo);
  let s = 0, n = 0, ps = 0;
  for (let i = 0; i < N; i++) { c[i] = clamp(c[i] + jo * 10 - M.police[i] * pf, 0, 100); if (T[i].k === 'zone' && T[i].lvl) { s += c[i]; ps += M.police[i]; n++; } }
  RT.avgCrime = n ? s / n : 0; RT.avgPolice = n ? ps / n : 0;
}
function computeLandValue() {
  // 나무 밀도
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let n = 0; for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) { const nx = x + ox, ny = y + oy; if (inb(nx, ny) && T[idx(nx, ny)].tree) n++; }
    M.trees[idx(x, y)] = n;
  }
  // 도심 효과: 상업 일자리 밀집 지역 주변 지가 상승
  const dn = M.down; dn.fill(0);
  for (let i = 0; i < N; i++) { const t = T[i]; if (t.k === 'zone' && t.z === 'C' && !t.ab) dn[i] = t.occ; else if (t.k === 'bld' && BLD[T[t.o].b].arc) dn[i] = 150; }
  blur(dn, 5, 0.3);
  const beauty = S.ord.beauty ? 10 : 0;
  for (let i = 0; i < N; i++) {
    const v = 60 + M.waterProx[i] * 40 + Math.min(M.trees[i], 8) * 3 + M.park[i] * 0.8 + M.bonus[i]
      + (M.police[i] + M.health[i]) * 0.1 + Math.min(M.edu[i], 100) * 0.12 + beauty + Math.min(50, Math.sqrt(dn[i]) * 4)
      - M.pol[i] * 0.6 - M.crime[i] * 0.35 - M.noise[i] * 8 + (T[i].ter ? 0 : (T[i].h - 1) * 4) - M.wpol[i] * 0.2;
    M.lv[i] = M.lv[i] * 0.5 + clamp(v, 0, 250) * 0.5;
  }
}
function computeTotals() {
  let pop = 0, cj = 0, ij = 0; const sj = {}; for (const k of SECKEYS) sj[k] = 0;
  for (let i = 0; i < N; i++) {
    const t = T[i]; if (t.k !== 'zone' || t.ab) continue;
    if (t.z === 'R') pop += t.occ; else if (t.z === 'C') cj += t.occ; else { ij += t.occ; sj[t.sec || 'textile'] += t.occ; }
  }
  RT.secJobs = sj;
  eachBld((i, t, b) => { if (b.arc) pop += t.occ; });
  RT.pop = pop; RT.cJobs = cj; RT.iJobs = ij;
  const wf = pop * 0.45; RT.unemp = wf > 50 ? clamp((wf - cj - ij) / wf, 0, 1) : 0;
}
function hasBld(key) { let f = false; eachBld((i, t) => { if (t.b === key && t.pw) f = true; }); return f; }
function computeDemand() {
  const pop = RT.pop, cj = RT.cJobs, ij = RT.iJobs, wf = pop * 0.45, jobs = cj + ij;
  const port = hasBld('port'), air = hasBld('airport'), stad = hasBld('stadium');
  RT.hasPort = port; RT.hasAir = air;
  let cb = 0; eachBld((i, t, b) => { if (b.cboost && t.pw !== 0) cb += b.cboost; });
  const ext = RT.extJobs || 0;
  let rD = (jobs - wf + 60 + pop * 0.04 + ext * 0.5) / Math.max(80, wf);
  rD += -(S.tax.R - 9) * 0.06 + (S.eq - 50) / 600 + (S.life - 65) / 500 - Math.min(S.garbageStock / 20000, 0.3) - RT.avgPol / 400 - RT.avgCrime / 400;
  const cT = pop * 0.22 * (S.ord.tourism ? 1.15 : 1) * (air ? 1.2 : 1) * (stad ? 1.1 : 1) * (1 + Math.min(cb, 0.3)) + 10 + ext * 0.3;
  let cD = (cT - cj) / Math.max(40, cT) - (S.tax.C - 9) * 0.06 - RT.avgCong * 0.1;
  const iT = pop * 0.28 * (port ? 1.25 : 1) * (RT.railFreight ? 1.1 : 1) + 50 + (port ? 80 : 0) + ext * 0.4;
  let iD = (iT - ij) / Math.max(50, iT) - (S.tax.I - 9) * 0.06 - (S.ord.antipol ? 0.1 : 0);
  if (RT.powerShort > 20) { rD -= 0.1; cD -= 0.1; iD -= 0.15; }
  S.demand.R = S.demand.R * 0.6 + clamp(rD, -1, 1) * 0.4;
  S.demand.C = S.demand.C * 0.6 + clamp(cD, -1, 1) * 0.4;
  S.demand.I = S.demand.I * 0.6 + clamp(iD, -1, 1) * 0.4;
}
function desirability(i, t) {
  const lv = M.lv[i], pol = M.pol[i], cr = M.crime[i], noise = M.noise[i];
  const cm = (M.commute[i] - 1) * (t.z === 'R' ? 0.6 : 0.5);
  if (t.z === 'R') return cm + (lv - 80) / 140 - pol / 110 - cr / 140 - noise * 0.12 + M.health[i] * 0.0015 + Math.min(M.edu[i], 100) * 0.0015 + M.park[i] * 0.004 - (S.tax.R - 9) * 0.03;
  if (t.z === 'C') return cm + (lv - 60) / 150 - cr / 150 + Math.min(M.noise[i], 1) * 0.12 - Math.max(0, M.noise[i] - 1.3) * 0.2 + M.park[i] * 0.002 - (S.tax.C - 9) * 0.03;
  return cm + 0.15 - (S.tax.I - 9) * 0.03 - cr / 300 + (M.waterProx[i] > 0 ? 0.05 : 0);
}
function growZones() {
  for (let i = 0; i < N; i++) {
    const t = T[i]; if (t.k !== 'zone' || t.burn) continue;
    if (t.rub) { t.rub--; continue; }
    const road = M.roadDist[i] <= 3;
    if (t.lvl > 0) { if (!t.pw) t.np++; else t.np = 0; }
    if (t.lvl > 0 && (t.np >= 4 || !road)) { if (!t.ab && rnd() < 0.3) { t.ab = 1; t.occ = 0; } continue; }
    if (!road || !t.pw) continue;
    const D = S.demand[t.z], s = desirability(i, t), g = D * 0.65 + s * 0.35;
    if (t.ab) { if (g > -0.15 && rnd() < 0.12) { t.ab = 0; t.lvl = Math.max(1, t.lvl - 1); t.occ = occFor(t); } continue; }
    let cap = MAXLV[t.d]; if (!t.wt) cap = Math.min(cap, 2);
    if (t.z === 'I' && t.sec && SECT[t.sec].max) cap = Math.min(cap, SECT[t.sec].max);
    if (g > 0 && t.lvl < cap && rnd() < g * 0.3) {
      const nl = t.lvl + 1;
      if (t.z === 'I' && (t.lvl === 0 || !t.sec || rnd() < 0.12)) { t.sec = pickSector(t, i); t.hi = secOf(t).hi; }
      let ok = true;
      if (t.z === 'I' && secOf(t).max && nl > secOf(t).max) ok = false;
      if (t.z !== 'I' && M.lv[i] < LVGATE[nl]) ok = false;
      if (t.z === 'I' && IEQ[nl] && S.eq < IEQ[nl]) ok = false;
      if (t.z === 'I' && nl >= 7 && !t.hi) ok = false;
      if (t.z === 'C' && CEQ[nl] && S.eq < CEQ[nl]) ok = false;
      if (ok) {
        t.lvl = nl; t.occ = occFor(t); t.v = (rnd() * 4) | 0;
      }
    } else if (g < -0.25 && t.lvl > 0 && rnd() < -g * 0.12) {
      const slum = M.crime[i] > 60 || M.pol[i] > 75 || (t.z === 'R' && M.lv[i] < 12);
      if (slum && rnd() < 0.3) { t.ab = 1; t.occ = 0; }
      else { t.lvl--; t.occ = occFor(t); }
    } else if (t.lvl > 0) t.occ = occFor(t);
  }
}
function sectorWeights() {
  const w = {};
  for (const k of SECKEYS) { const sc = SECT[k]; let v = Math.exp(-(((S.eq - sc.c) / 32) ** 2)) + 0.02; if (sc.port && RT.hasPort) v *= 1.6; if (sc.air && RT.hasAir) v *= 1.8; v *= Math.exp(-0.35 * (S.secTax[k] || 0)); w[k] = v; }
  return w;
}
function pickSector(t, i) {
  const w = Object.assign({}, RT.secW || sectorWeights());
  if (t.d === 1 && M.lv[i] < 95) w.agri = (w.agri + 0.15) * 2.2; else w.agri = 0;
  let sum = 0; for (const k in w) sum += w[k]; let r = rnd() * sum;
  for (const k in w) { r -= w[k]; if (r <= 0) return k; } return 'textile';
}
function growArcologies() {
  eachBld((i, t, b) => {
    if (!b.arc) return;
    if (!t.pw || !t.wt) { t.occ = Math.max(0, t.occ - b.arc * 0.08); return; }
    const D = S.demand.R;
    if (D > 0) t.occ = Math.min(b.arc, t.occ + b.arc * 0.04 * (0.4 + D));
    else if (D < -0.3) t.occ = Math.max(0, t.occ - b.arc * 0.02);
    t.occ = Math.round(t.occ);
  });
}
function processGarbage() {
  let recyc = 0, burnCap = 0;
  eachBld((i, t, b) => { if (b.recyc && t.pw) recyc++; if (b.burn && t.pw) burnCap += b.burn; });
  const factor = (1 - Math.min(recyc * 0.15, 0.45)) * (S.ord.recycleO ? 0.8 : 1);
  const produced = (RT.pop * 0.012 + (RT.cJobs + RT.iJobs) * 0.014) * factor;
  let left = produced + S.garbageStock * 0.5;
  S.garbageStock *= 0.5;
  const burned = Math.min(left, burnCap); left -= burned;
  RT.dealOk = RT.dealOk || {};
  for (const d of S.deals || []) {
    if (d.type !== 'gExp') continue; const c = RT.conn ? RT.conn[d.side] : null;
    const ok = !!(c && (c.road || c.hwy || c.rail)); RT.dealOk[d.id] = ok;
    if (ok) left -= Math.min(left, d.amt);
  }
  for (const k in S.fills) {
    if (left <= 0) break;
    const take = Math.min(left, S.fills[k]); S.fills[k] -= take; left -= take;
    if (S.fills[k] <= 0) { S.fills[k] = 0; }
  }
  S.garbageStock += left;
  RT.garbage = produced; RT.garbageDone = produced - left;
  RT.landfillLeft = Object.values(S.fills).reduce((a, b) => a + b, 0);
}
function processJail() {
  let cap = 0; eachBld((i, t, b) => { if (b.jail && t.pw) cap += b.jail; }); RT.jailCap = cap;
  const arrests = RT.pop * (RT.avgCrime / 100) * ((RT.avgPolice || 0) / 100) * 0.012;
  S.inmates = Math.max(0, (S.inmates || 0) * 0.95 + arrests);
  RT.jailOver = S.inmates > cap ? clamp((S.inmates - cap) / Math.max(S.inmates, 1), 0, 1) : 0;
}
const DEAL_T = { pSell: ['전력 판매', 'MW', 1], pBuy: ['전력 구매', 'MW', -1], wSell: ['물 판매', '', 1], wBuy: ['물 구매', '', -1], gExp: ['쓰레기 위탁', 't', -1] };
function budgetMonth(apply) {
  const b = { inc: {}, exp: {} };
  b.inc['주거세'] = RT.pop * S.tax.R * 0.011;
  b.inc['상업세'] = RT.cJobs * S.tax.C * 0.014;
  let itax = 0; for (const k of SECKEYS) itax += ((RT.secJobs || {})[k] || 0) * clamp(S.tax.I + (S.secTax[k] || 0), 0, 25) * 0.014;
  b.inc['공업세'] = itax;
  const dexp = { trans: 0, police: 0, fire: 0, health: 0, edu: 0, rec: 0, power: 0, water: 0, waste: 0, special: 0 };
  let roads = 0; for (let i = 0; i < N; i++) { const t = T[i]; if (t.k === 'road') roads += T[i].ter ? 0.4 : 0.1; else if (t.k === 'avenue') roads += 0.25; else if (t.k === 'power') roads += 0.02; }
  dexp.trans += roads;
  eachBld((i, t, d) => { dexp[d.dept] += d.mt; });
  for (const k in DEPTS) dexp[k] *= S.fund[k] / 100;
  const names = { trans: '교통', police: '경찰', fire: '소방', health: '보건', edu: '교육', rec: '공원·여가', power: '전력', water: '수도', waste: '쓰레기', special: '특수시설' };
  for (const k in dexp) if (dexp[k] > 0) b.exp[names[k]] = dexp[k];
  let ordc = 0, casino = 0;
  for (const k in S.ord) if (S.ord[k]) { const c = ORDS[k].c * RT.pop; if (c < 0) casino -= c; else ordc += c; }
  if (casino) b.inc['카지노 수입'] = casino;
  if (ordc) b.exp['조례'] = ordc;
  if (hasBld('port')) b.inc['항구 사용료'] = 40 + RT.iJobs * 0.02;
  if (hasBld('airport')) b.inc['공항 사용료'] = 60 + RT.cJobs * 0.03;
  eachBld((i, t, d) => { if (d.biz && d.inc) b.inc['계약: ' + d.n] = d.inc[0] + RT.pop * d.inc[1]; });
  const failed = [];
  for (const d of S.deals || []) {
    const [n, , sg] = DEAL_T[d.type]; const v = d.amt * d.price; const label = `${n} (${S.nb[d.side].name})`;
    const ok = !RT.dealOk || RT.dealOk[d.id] !== false;
    if (!ok) { if (sg > 0) failed.push(d); continue; }
    if (sg > 0) b.inc[label] = (b.inc[label] || 0) + v; else b.exp[label] = (b.exp[label] || 0) + v;
  }
  let loanPay = 0; for (const l of S.loans) loanPay += l.pay;
  if (loanPay) b.exp['대출 상환'] = loanPay;
  b.totalInc = Object.values(b.inc).reduce((a, c) => a + c, 0);
  b.totalExp = Object.values(b.exp).reduce((a, c) => a + c, 0);
  b.net = b.totalInc - b.totalExp;
  if (apply) {
    S.money += b.net;
    for (const l of S.loans) l.left--;
    const done = S.loans.filter(l => l.left <= 0); if (done.length) news('대출 상환이 완료되었습니다.', 'good');
    S.loans = S.loans.filter(l => l.left > 0);
    for (const d of failed) { const fine = d.amt * d.price * 3; S.money -= fine; news(`🤝 ${S.nb[d.side].name}에 약속한 ${DEAL_T[d.type][0]}을(를) 공급하지 못해 위약금 ₩${fmt(fine)}을 냈고 계약이 해지되었습니다.`, 'bad'); }
    S.deals = (S.deals || []).filter(d => !failed.includes(d));
    for (const d of S.deals) d.left--;
    for (const d of S.deals.filter(d => d.left <= 0)) news(`🤝 ${S.nb[d.side].name}와의 ${DEAL_T[d.type][0]} 계약이 만료되었습니다.`, 'info');
    S.deals = S.deals.filter(d => d.left > 0);
  }
  RT.budget = b;
  return b;
}
function updateCityStats() {
  // 교육 수준
  let es = 0, ew = 0, hs = 0;
  for (let i = 0; i < N; i++) { const t = T[i]; if (t.k === 'zone' && t.z === 'R' && t.occ) { es += Math.min(M.edu[i], 120) * t.occ; hs += M.health[i] * t.occ; ew += t.occ; } }
  const eT = ew ? es / ew : 0, hT = ew ? hs / ew : 0;
  S.eq += (eT * 1.1 + 15 - S.eq) * (S.ord.tutor ? 0.06 : 0.035);
  const wq = RT.pop > 500 ? 100 - (RT.waterQ === undefined ? 100 : RT.waterQ) : 0;
  S.life += (55 + hT * 0.25 + (S.ord.clinic ? 6 : 0) - RT.avgPol * 0.12 - wq * 0.12 - S.life) * 0.05;
  const avgTax = (S.tax.R + S.tax.C + S.tax.I) / 3;
  let ap = 78 - (avgTax - 9) * 4 - RT.avgCrime * 0.35 - RT.avgPol * 0.25 - RT.unemp * 60 - Math.max(0, RT.avgCong - 0.6) * 20
    - Math.min(S.garbageStock / 300, 20) + (S.eq - 50) * 0.1 + (S.life - 65) * 0.2 + (hasBld('cityhall') ? 5 : 0);
  if (RT.powerShort > 0) ap -= Math.min(10, RT.powerShort / 5);
  ap -= wq * 0.08 + (RT.jailOver || 0) * 10 + (riots.length ? 5 : 0);
  eachBld((i, t, d) => { if (d.ap) ap += d.ap; });
  if (RT.pop > 200 && RT.waterUse < RT.pop * 0.005) ap -= 5;
  S.approval += (clamp(ap, 0, 100) - S.approval) * 0.15;
}
function checkRewards() {
  for (const k in BLD) {
    const b = BLD[k]; if (!b.unlock || S.unlocked[k]) continue;
    if (RT.pop >= b.unlock) { S.unlocked[k] = 1; news(`🔓 새 시설 「${b.n}」을(를) 지을 수 있습니다!`, 'good'); buildToolbar(); }
  }
  for (const k in BLD) {
    const b = BLD[k]; if (!b.reward || S.rewards[k]) continue;
    if (RT.pop >= b.reward) { S.rewards[k] = 'unlocked'; news('🏅 보상 건물 「' + b.n + '」을(를) 지을 수 있습니다! (특수 메뉴)', 'good'); buildToolbar(); }
  }
}
function agePlants() {
  eachBld((i, t, b) => {
    if (!b.life) return; const age = S.year - t.age;
    if (age === b.life - 5 && S.month === 0) news('⚠️ ' + b.n + '이(가) 노후되어 출력이 떨어지고 있습니다. 교체를 준비하세요.', 'warn');
    if (age >= b.life && rnd() < 0.03) {
      if (b.nuke) { news('🚨 노후된 원자력발전소에서 사고가 발생했습니다!', 'bad'); const [cx, cy] = bldCenter(i); destroyBld(i); for (let k = 0; k < 6; k++) igniteAt(Math.round(cx + (rnd() - 0.5) * 8), Math.round(cy + (rnd() - 0.5) * 8)); }
      else { news(b.n + '이(가) 수명을 다해 가동을 멈추고 철거되었습니다.', 'bad'); destroyBld(i); }
    }
  });
}
function advise() {
  const cd = S.adviceCd; for (const k in cd) if (cd[k] > 0) cd[k]--;
  const say = (key, text, kind, cool) => { if (cd[key] > 0) return false; cd[key] = cool || 12; news(text, kind); return true; };
  let anyZone = false, anyPlant = false; for (let i = 0; i < N; i++) { if (T[i].k === 'zone') anyZone = true; if (T[i].k === 'bld' && BLD[T[i].b].mw) anyPlant = true; }
  if (!anyPlant && anyZone) { if (say('noplant', '전력 고문: 구역에 전기가 없습니다. 발전소를 짓고 송전선으로 연결하세요.', 'warn', 4)) return; }
  let unp = 0; for (let i = 0; i < N; i++) if (T[i].k === 'zone' && !T[i].pw) unp++;
  if (anyPlant && unp >= 4) { if (say('unpow', `전력 고문: 전기가 닿지 않는 구역이 ${unp}칸 있습니다. 도로는 전기를 전달하지 않으니 송전선을 도로 위로 건너 연결하세요.`, 'warn', 8)) return; }
  if (RT.plantIsolated) { if (say('isol', `전력 고문: 전력망에 연결되지 않은 발전소가 ${RT.plantIsolated}곳 있습니다. 송전선으로 도시와 이어 주세요.`, 'warn', 6)) return; }
  if (RT.powerShort > 0) { if (say('short', `전력 고문: 전력이 모자라 ${RT.powerShort}칸이 정전 상태입니다. 발전소를 추가하거나 송전망을 연결하세요.`, 'bad', 6)) return; }
  if (RT.powerCap > 0 && RT.powerUse > RT.powerCap) { if (say('power', `전력 고문: 전력 부족! 수요 ${fmt(RT.powerUse)}MW / 공급 ${fmt(RT.powerCap)}MW. 발전소를 추가하세요.`, 'bad', 6)) return; }
  if (S.money < 0) { if (say('money', '재정 고문: 시 재정이 적자입니다! 세금을 올리거나 지출을 줄이거나 대출을 받으세요.', 'bad', 4)) return; }
  if (RT.pop > 300 && RT.waterCap === 0) { if (say('water', '수도 고문: 상수도가 없어 건물이 2단계 이상 성장하지 못합니다. 양수장을 도로 옆에 지으세요.', 'warn', 10)) return; }
  if (RT.pop > 300 && RT.waterCap > 0 && RT.waterUse >= RT.waterCap * 0.97) { if (say('water2', '수도 고문: 급수 용량이 한계입니다. 양수장이나 급수탑을 추가하세요.', 'warn', 10)) return; }
  if (S.garbageStock > 500) { if (say('garbage', '환경 고문: 수거되지 않은 쓰레기가 쌓이고 있습니다. 매립지나 소각장을 지으세요.', 'warn', 8)) return; }
  if (RT.landfillLeft !== undefined && Object.keys(S.fills).length && RT.landfillLeft < RT.garbage * 6 && !S.garbageStock) { if (say('fill', '환경 고문: 매립지가 거의 찼습니다.', 'warn', 12)) return; }
  if (RT.pop > 800 && !hasBld('fire')) { if (say('fire', '안전 고문: 도시에 소방서가 없습니다. 화재가 크게 번질 수 있습니다.', 'warn', 18)) return; }
  if (RT.avgCrime > 35) { if (say('crime', '치안 고문: 범죄율이 높습니다. 경찰서를 늘리거나 경찰 예산을 올리세요.', 'warn', 12)) return; }
  if (RT.avgPol > 45) { if (say('pol', '환경 고문: 오염이 심각합니다. 나무와 공원, 친환경 발전소를 고려하세요.', 'warn', 12)) return; }
  if (RT.avgCong > 1) { if (say('traffic', '교통 고문: 교통 체증이 심합니다. 대로와 버스정류장을 늘리세요.', 'warn', 12)) return; }
  if (RT.unemp > 0.15) { if (say('unemp', `경제 고문: 실업률 ${Math.round(RT.unemp * 100)}%. 상업·공업 구역을 늘리세요.`, 'warn', 10)) return; }
  if (S.demand.R > 0.5 && RT.pop > 100) { if (say('dR', '도시계획 고문: 주거 수요가 높습니다. 주거 구역을 더 지정하세요.', 'info', 15)) return; }
  if (S.demand.C > 0.5 && RT.pop > 300) { if (say('dC', '도시계획 고문: 상업 수요가 높습니다.', 'info', 15)) return; }
  if (S.demand.I > 0.5 && RT.pop > 100) { if (say('dI', '도시계획 고문: 공업 수요가 높습니다.', 'info', 15)) return; }
  if (RT.pop > 2000 && S.eq < 40 && !hasBld('school')) { if (say('edu', '교육 고문: 학교가 없어 교육 수준이 낮습니다. 첨단 산업이 들어오지 않습니다.', 'info', 18)) return; }
  if (RT.pop > 1500 && !hasBld('hospital')) { say('health', '보건 고문: 병원을 지으면 기대수명과 주거 선호도가 올라갑니다.', 'info', 24); }
}
const popups = [];
function maybeOffer() {
  for (const k in S.bizCd) if (S.bizCd[k] > 0) S.bizCd[k]--;
  if (RT.pop < 2500 || S.offer || rnd() > 1 / 30) return;
  const keys = Object.keys(BLD).filter(k => BLD[k].biz && !S.biz[k] && !(S.bizCd[k] > 0));
  if (!keys.length) return;
  const k = keys[(rnd() * keys.length) | 0]; S.offer = k; popups.push({ type: 'offer', key: k });
}
const PETS = [
  { k: 'taxR', c: () => S.tax.R > 10, t: '주거세가 너무 높습니다. 주거세를 1%p 내려 주세요.', a: () => S.tax.R-- },
  { k: 'taxC', c: () => S.tax.C > 11, t: '상인들이 상업세를 1%p 내려 달라고 요구합니다.', a: () => S.tax.C-- },
  { k: 'taxI', c: () => S.tax.I > 11, t: '기업들이 공업세를 1%p 내려 달라고 요구합니다.', a: () => S.tax.I-- },
  { k: 'police', c: () => RT.avgCrime > 22 && S.fund.police < 110, t: '범죄가 걱정됩니다. 경찰 예산을 110%로 올려 주세요.', a: () => S.fund.police = 110 },
  { k: 'watch', c: () => RT.avgCrime > 18 && !S.ord.watch, t: '동네를 지킬 주민 방범대를 운영해 주세요.', a: () => S.ord.watch = true },
  { k: 'antipol', c: () => RT.avgPol > 25 && !S.ord.antipol, t: '공기가 너무 나쁩니다. 대기오염 방지법을 시행해 주세요.', a: () => S.ord.antipol = true },
  { k: 'clinic', c: () => S.life < 68 && !S.ord.clinic, t: '병원비가 부담됩니다. 무료 진료소를 열어 주세요.', a: () => S.ord.clinic = true },
  { k: 'tutor', c: () => S.eq < 70 && !S.ord.tutor && RT.pop > 3000, t: '아이들을 위한 방과후 교실을 만들어 주세요.', a: () => S.ord.tutor = true },
  { k: 'recycle', c: () => S.garbageStock > 100 && !S.ord.recycleO, t: '쓰레기가 넘쳐납니다. 분리수거를 의무화해 주세요.', a: () => S.ord.recycleO = true },
  { k: 'carpool', c: () => RT.avgCong > 0.6 && !S.ord.carpool, t: '출퇴근길이 너무 막힙니다. 카풀을 장려해 주세요.', a: () => S.ord.carpool = true },
  { k: 'nocasino', c: () => S.ord.casino, t: '카지노 때문에 동네가 위험해졌습니다. 카지노를 폐지해 주세요.', a: () => S.ord.casino = false },
  { k: 'edu', c: () => S.fund.edu < 100, t: '교육 예산을 100%로 되돌려 주세요.', a: () => S.fund.edu = 100 },
  { k: 'health', c: () => S.fund.health < 100, t: '보건 예산을 100%로 되돌려 주세요.', a: () => S.fund.health = 100 },
  { k: 'beauty', c: () => RT.pop > 8000 && !S.ord.beauty, t: '도시를 더 아름답게! 도시 미화 사업을 시작해 주세요.', a: () => S.ord.beauty = true },
];
function maybePetition() {
  for (const k in S.petCd) if (S.petCd[k] > 0) S.petCd[k]--;
  if (RT.pop < 800 || popups.some(p => p.type === 'pet') || rnd() > 1 / 8) return;
  const ok = PETS.filter(p => !(S.petCd[p.k] > 0) && p.c());
  if (!ok.length) return;
  const p = ok[(rnd() * ok.length) | 0]; S.petCd[p.k] = 24;
  popups.push({ type: 'pet', key: p.k, n: Math.round(50 + RT.pop * (0.01 + rnd() * 0.03)) });
}
let riots = [];
function maybeRiot() {
  if (RT.pop < 3000 || riots.length) return;
  const summer = S.month >= 5 && S.month <= 7;
  const p = Math.max(0, (45 - S.approval) / 45) * clamp(RT.avgCrime / 30, 0, 2) * (summer ? 1 : 0.35) * 0.25;
  if (rnd() >= p) return;
  let best = -1, bc = -1; for (let k = 0; k < 400; k++) { const i = (rnd() * N) | 0; if (T[i].k === 'zone' && T[i].lvl && M.crime[i] > bc) { bc = M.crime[i]; best = i; } }
  if (best >= 0) startRiot(best % W, (best / W) | 0);
}
function startRiot(x, y) { riots.push({ x: x + 0.5, y: y + 0.5, life: 40 }); news('✊ 시민 폭동이 일어났습니다! 경찰이 많을수록 빨리 진압됩니다.', 'bad'); }
function riotStep() {
  if (!riots.length) return;
  for (const r of riots) {
    r.x = clamp(r.x + (rnd() - 0.5) * 1.2, 0.5, W - 0.5); r.y = clamp(r.y + (rnd() - 0.5) * 1.2, 0.5, H - 0.5);
    const x = r.x | 0, y = r.y | 0, i = idx(x, y), t = T[i];
    if (t.k === 'zone' && t.lvl > 0 && rnd() < 0.15) { t.lvl--; t.occ = occFor(t); if (!t.lvl) t.rub = 3; }
    if (rnd() < 0.04) igniteAt(x, y);
    r.life -= 1 + M.police[i] / 15;
  }
  riots = riots.filter(r => r.life > 0);
  if (!riots.length) news('폭동이 진압되었습니다.', 'info');
}
const MILESTONES = [500, 1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2000000, 5000000, 10000000];
function monthly(init) {
  computeRoadDist();
  computeRail();
  computePower();
  computeWater();
  computeCoverage();
  computeTotals();
  computeTraffic();
  computeConnections();
  computePollution();
  computeWaterPol();
  computeCrime();
  computeLandValue();
  if (init) { budgetMonth(false); return; }
  RT.secW = sectorWeights();
  computeDemand();
  growZones();
  growArcologies();
  const prevPop = RT.pop;
  computeTotals();
  processGarbage();
  processJail();
  budgetMonth(true);
  updateCityStats();
  checkRewards();
  agePlants();
  neighborsGrow();
  maybeOffer();
  maybePetition();
  maybeRiot();
  for (const m of MILESTONES) if (prevPop < m && RT.pop >= m && !(S.ms || {})[m]) { S.ms = S.ms || {}; S.ms[m] = 1; news(`🎉 인구 ${fmt(m)}명 달성! 도시가 성장하고 있습니다.`, 'good'); }
  S.hist.push({ p: RT.pop, m: Math.round(S.money), r: RT.pop, c: RT.cJobs, i: RT.iJobs, ap: Math.round(S.approval) });
  if (S.hist.length > 240) S.hist.shift();
  S.totalMonths++;
  if (S.disasters && RT.pop > 1500 && rnd() < 1 / 150) randomDisaster();
  advise();
  if (S.month === 0) autosave();
  miniDirty = true;
}

/* ---------------- 화재·재해 ---------------- */
function igniteAt(x, y) {
  if (!inb(x, y)) return false; const t = T[idx(x, y)];
  if (t.ter === 1 || t.burn) return false;
  if ((t.k === 'zone' && t.lvl > 0) || t.k === 'bld' || t.tree) {
    if (t.k === 'bld') { for (const j of footprint(idx(x, y))) T[j].burn = 6 + (rnd() * 4 | 0); }
    else t.burn = 5 + (rnd() * 4 | 0);
    return true;
  }
  return false;
}
function destroyBld(o) {
  const t = T[o]; if (t.k !== 'bld') return;
  for (const j of footprint(o)) { const u = T[j]; u.k = 'rubble'; u.b = ''; u.o = -1; u.burn = 0; u.pl = 0; }
  delete S.fills[o];
}
function burnOut(i) {
  const t = T[i]; t.burn = 0;
  if (t.k === 'zone') { t.lvl = 0; t.occ = 0; t.ab = 0; t.rub = 6; }
  else if (t.k === 'bld') destroyBld(t.o);
  if (t.tree) t.tree = 0;
}
function fireStep() {
  const fireMul = S.ord.volfire ? 0.75 : 1;
  // 자연 발화
  for (let n = 0; n < 6; n++) {
    const i = (rnd() * N) | 0, t = T[i];
    if (t.k === 'zone' && t.lvl > 0 && !t.burn) {
      const base = (t.z === 'I' ? 0.012 : 0.006) * fireMul * (1 - M.fire[i] / 120);
      if (rnd() < base) { if (igniteAt(i % W, (i / W) | 0)) news(`🔥 (${i % W},${(i / W) | 0}) 부근에서 화재가 발생했습니다!`, 'bad'); }
    }
  }
  const burning = []; for (let i = 0; i < N; i++) if (T[i].burn) burning.push(i);
  for (const i of burning) {
    const t = T[i]; if (!t.burn) continue;
    const fc = M.fire[i];
    if (fc > 20 && rnd() < fc / 160) { // 진압
      t.burn = 0; if (t.k === 'zone' && t.lvl > 1) { t.lvl--; t.occ = occFor(t); }
      continue;
    }
    const x = i % W, y = (i / W) | 0;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) if (rnd() < 0.18 * (1 - fc / 110)) igniteAt(nx, ny);
    t.burn--; if (t.burn <= 0) burnOut(i);
  }
}
function quake(cx, cy) {
  news('🌋 규모 6.4의 지진이 발생했습니다!', 'bad');
  shake = 40;
  for (let y = cy - 10; y <= cy + 10; y++) for (let x = cx - 10; x <= cx + 10; x++) {
    if (!inb(x, y)) continue; const d = Math.hypot(x - cx, y - cy); if (d > 10) continue;
    const p = (1 - d / 10) * 0.55, i = idx(x, y), t = T[i];
    if (rnd() > p) continue;
    if (t.k === 'zone' && t.lvl > 0) { t.lvl = 0; t.occ = 0; t.ab = 0; t.rub = 8; }
    else if (t.k === 'bld' && rnd() < 0.5) destroyBld(t.o);
    else if (isRoad(t) && rnd() < 0.3) { t.k = t.ter ? '' : 'rubble'; t.pl = 0; }
    else if (t.k === 'power' && rnd() < 0.5) t.k = 'rubble';
  }
  for (let k = 0; k < 5; k++) igniteAt(cx + ((rnd() - 0.5) * 12 | 0), cy + ((rnd() - 0.5) * 12 | 0));
  monthlyMaps();
}
function startTornado(x, y) { tornado = { x: x + 0.5, y: y + 0.5, a: rnd() * 6.28, life: 50 }; news('🌪️ 토네이도가 도시를 덮쳤습니다!', 'bad'); }
function tornadoStep() {
  if (!tornado) return;
  const tn = tornado;
  tn.a += (rnd() - 0.5) * 1.2; tn.x += Math.cos(tn.a) * 0.6; tn.y += Math.sin(tn.a) * 0.6; tn.life--;
  const x = Math.floor(tn.x), y = Math.floor(tn.y);
  if (!inb(x, y) || tn.life <= 0) { tornado = null; monthlyMaps(); return; }
  for (const [nx, ny] of [[x, y], [x + 1, y], [x, y + 1]]) {
    if (!inb(nx, ny)) continue; const t = T[idx(nx, ny)];
    if (t.k === 'zone' && t.lvl > 0) { t.lvl = 0; t.occ = 0; t.rub = 6; t.ab = 0; }
    else if (t.k === 'bld') destroyBld(t.o);
    else if (t.k === 'power' || (isRoad(t) && t.ter === 0 && rnd() < 0.5)) { t.k = 'rubble'; t.pl = 0; }
    t.tree = 0;
  }
}
let flood = null, floodSet = null, meteor = null;
function startFlood(x, y) {
  // 클릭 지점 근처에서 물과 맞닿은 저지대를 찾는다
  let best = -1, bd = 1e9;
  for (let yy = y - 14; yy <= y + 14; yy++) for (let xx = x - 14; xx <= x + 14; xx++) {
    if (!inb(xx, yy)) continue; const i = idx(xx, yy), t = T[i]; if (t.ter === 1 || t.h > 2 || M.waterProx[i] < 0.75) continue;
    const d = Math.hypot(xx - x, yy - y); if (d < bd) { bd = d; best = i; }
  }
  if (best < 0) { flash('근처에 물가 저지대가 없습니다'); return false; }
  flood = { days: 0, cells: [best], maxH: T[best].h + 1 }; floodSet = new Set([best]);
  news('🌊 홍수가 발생했습니다! 저지대가 물에 잠기고 있습니다.', 'bad'); return true;
}
function floodStep() {
  if (!flood) return;
  flood.days++;
  if (flood.days <= 14) {
    const add = [];
    for (const i of flood.cells) { const x = i % W, y = (i / W) | 0; for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) { if (!inb(nx, ny)) continue; const j = idx(nx, ny), t = T[j]; if (t.ter === 0 && t.h <= flood.maxH && !floodSet.has(j) && rnd() < 0.35) add.push(j); } }
    for (const j of add) if (floodSet.size < 240) { floodSet.add(j); flood.cells.push(j); }
  }
  for (const i of floodSet) T[i].burn = 0;
  if (flood.days >= 35) {
    for (const i of floodSet) { const t = T[i]; if (t.k === 'zone' && t.lvl > 0 && rnd() < 0.4) { t.lvl--; t.occ = occFor(t); if (!t.lvl) t.rub = 4; } else if (t.k === 'bld' && rnd() < 0.15) destroyBld(t.o); else if (isRoad(t) && rnd() < 0.1) { t.k = 'rubble'; t.pl = 0; } }
    news('🌊 홍수가 물러갔습니다. 피해를 복구하세요.', 'warn'); flood = null; floodSet = null; monthlyMaps();
  }
}
function startMeteor(x, y) { meteor = { x, y, t0: performance.now() }; news('☄️ 운석이 떨어지고 있습니다!', 'bad'); }
function meteorImpact() {
  const { x, y } = meteor; meteor = null; shake = 50;
  for (let yy = y - 3; yy <= y + 3; yy++) for (let xx = x - 3; xx <= x + 3; xx++) {
    if (!inb(xx, yy) || Math.hypot(xx - x, yy - y) > 2.6) continue; const t = T[idx(xx, yy)];
    if (t.k === 'zone') { t.lvl = 0; t.occ = 0; t.ab = 0; t.rub = 8; }
    else if (t.k === 'bld') destroyBld(t.o);
    else if (t.k) { t.k = t.ter ? '' : 'rubble'; t.pl = 0; t.rl = 0; }
    t.tree = 0;
  }
  const c = T[idx(x, y)]; if (c.ter === 0 && c.h > 1) c.h--;
  for (let k = 0; k < 6; k++) igniteAt(x + ((rnd() - 0.5) * 10 | 0), y + ((rnd() - 0.5) * 10 | 0));
  news('☄️ 운석이 떨어져 큰 피해가 났습니다!', 'bad'); calcWaterProx(); monthlyMaps();
}
function randomDisaster() {
  const r = rnd();
  const land = () => { for (let k = 0; k < 200; k++) { const x = 8 + (rnd() * (W - 16) | 0), y = 8 + (rnd() * (H - 16) | 0); const t = T[idx(x, y)]; if (t.k === 'zone' && t.lvl) return [x, y]; } return [W / 2 | 0, H / 2 | 0]; };
  const [x, y] = land();
  if (r < 0.4) { for (let k = 0; k < 3; k++) igniteAt(x + k, y); news('🔥 대형 화재가 발생했습니다!', 'bad'); }
  else if (r < 0.6) quake(x, y);
  else if (r < 0.75) startTornado(x, y);
  else if (r < 0.93) { if (!startFlood(x, y)) startTornado(x, y); }
  else startMeteor(x, y);
}
function monthlyMaps() { computeRoadDist(); computeRail(); computePower(); computeWater(); computeCoverage(); miniDirty = true; }

/* ---------------- 시간 진행 ---------------- */
let dayAcc = 0;
function tick(dt) {
  if (!S || speed === 0 || modalOpen) return;
  dayAcc += dt * SPEED_DAYS[speed];
  let steps = 0;
  while (dayAcc >= 1 && steps < 30) {
    dayAcc -= 1; steps++;
    S.day++;
    if (S.day % 3 === 0) fireStep();
    tornadoStep(); floodStep(); riotStep();
    if (S.day >= 30) {
      S.day = 0; S.month++;
      if (S.month >= 12) { S.month = 0; S.year++; }
      monthly(false);
      refreshUI();
    }
  }
}

/* ---------------- 건설 동작 ---------------- */
function lineTiles(a, b) {
  const out = []; const [x0, y0] = a, [x1, y1] = b;
  const sx = Math.sign(x1 - x0) || 1, sy = Math.sign(y1 - y0) || 1;
  if (Math.abs(x1 - x0) >= Math.abs(y1 - y0)) { for (let x = x0; x !== x1 + sx; x += sx) out.push([x, y0]); for (let y = y0 + sy; y !== y1 + sy; y += sy) out.push([x1, y]); }
  else { for (let y = y0; y !== y1 + sy; y += sy) out.push([x0, y]); for (let x = x0 + sx; x !== x1 + sx; x += sx) out.push([x, y1]); }
  return out.filter(([x, y]) => inb(x, y));
}
function rectTiles(a, b) {
  const out = []; const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inb(x, y)) out.push([x, y]);
  return out;
}
function placeOrigin(tool, x, y) { const sz = BLD[TOOLS[tool].bld].sz; const o = Math.floor((sz - 1) / 2); return [x - o, y - o]; }
function canPlaceBld(key, ox, oy) {
  const b = BLD[key];
  if (b.reward && S.rewards[key] !== 'unlocked') return '아직 잠겨 있습니다';
  if (b.unlock && !S.unlocked[key]) return `인구 ${fmt(b.unlock)} 달성 시 해금`;
  for (let y = oy; y < oy + b.sz; y++) for (let x = ox; x < ox + b.sz; x++) {
    if (!inb(x, y)) return '지도 밖입니다';
    const t = T[idx(x, y)];
    if (t.ter === 1) return '물 위에는 지을 수 없습니다';
    if (!(t.k === '' || (t.k === 'zone' && t.lvl === 0 && !t.rub))) return '공간이 비어 있지 않습니다';
    if (t.h !== T[idx(ox, oy)].h) return '땅이 평평하지 않습니다 (평탄화 도구 사용)';
  }
  if (b.biz && S.biz[key] !== 'ok') return S.biz[key] === 'built' ? '이미 건설했습니다' : '사업 제안을 수락해야 지을 수 있습니다';
  if (b.needRail) {
    let ok = false;
    for (let y = oy - 1; y <= oy + b.sz; y++) for (let x = ox - 1; x <= ox + b.sz; x++) if (inb(x, y) && isRail(T[idx(x, y)])) ok = true;
    if (!ok) return '철도 옆에 지어야 합니다';
  }
  if (b.needWater) {
    let ok = false;
    for (let y = oy - 1; y <= oy + b.sz; y++) for (let x = ox - 1; x <= ox + b.sz; x++) if (inb(x, y) && T[idx(x, y)].ter === 1) ok = true;
    if (!ok) return '물가에 지어야 합니다';
  }
  return '';
}
// 반환: 비용 (실패 시 -1). dry=true면 계산만
function opTile(tool, x, y, dry) {
  const i = idx(x, y), t = T[i], tl = TOOLS[tool];
  const treeC = t.tree ? 3 : 0;
  switch (tool) {
    case 'road': case 'avenue': {
      if (t.k === tool) return 0;
      if (t.k === 'hwy') return -1;
      if (t.k === 'rail') { if (t.ter === 1) return -1; if (!dry) { t.k = tool; t.rl = 1; } return tl.cost; }
      if (t.ter === 1) { if (tool !== 'road' || (t.k !== '' && t.k !== 'power')) return -1; if (!dry) { t.k = 'road'; t.pl = t.pl || 0; } return 60; }
      if (t.k === 'road' && tool === 'avenue') { if (!dry) t.k = 'avenue'; return 18; }
      if (t.k === 'avenue') return 0;
      if (t.k === 'power') { if (!dry) { t.k = tool; t.pl = 1; } return tl.cost; }
      if (t.k === '' || (t.k === 'zone' && t.lvl === 0) || t.k === 'rubble') { if (!dry) { Object.assign(t, { k: tool, z: '', d: 0, lvl: 0, occ: 0, tree: 0, rub: 0, pl: 0 }); } return tl.cost + treeC; }
      return -1;
    }
    case 'hwy': {
      if (t.k === 'hwy') return 0;
      if (t.ter === 1) { if (t.k !== '' && t.k !== 'power') return -1; if (!dry) { Object.assign(t, { k: 'hwy', pl: t.k === 'power' ? 1 : 0 }); } return 200; }
      if (isStreet(t)) { if (t.rl) return -1; if (!dry) t.k = 'hwy'; return 70; }
      if (t.k === 'power') { if (!dry) { t.k = 'hwy'; t.pl = 1; } return tl.cost; }
      if (t.k === '' || (t.k === 'zone' && t.lvl === 0) || t.k === 'rubble') { if (!dry) Object.assign(t, { k: 'hwy', z: '', d: 0, lvl: 0, occ: 0, tree: 0, rub: 0, pl: 0 }); return tl.cost + treeC; }
      return -1;
    }
    case 'rail': {
      if (isRail(t)) return 0;
      if (isStreet(t)) { if (t.ter === 1) return -1; if (!dry) t.rl = 1; return 20; }
      if (t.ter === 1) { if (t.k !== '') return -1; if (!dry) t.k = 'rail'; return 120; }
      if (t.k === '' || (t.k === 'zone' && t.lvl === 0) || t.k === 'rubble') { if (!dry) Object.assign(t, { k: 'rail', z: '', d: 0, lvl: 0, occ: 0, tree: 0, rub: 0, pl: 0 }); return tl.cost + treeC; }
      return -1;
    }
    case 'raise': case 'lower': case 'level': {
      const free = t.k === '' || (t.k === 'zone' && t.lvl === 0 && !t.rub);
      if (!free) return -1;
      let target = tool === 'raise' ? t.h + 1 : tool === 'lower' ? t.h - 1 : levelTarget;
      if (t.ter === 1) {   // 물
        if (target < 1) return -1;
        if (!dry) Object.assign(t, { ter: 0, h: target });
        return 40 + (target - 1) * 15;
      }
      if (target > MAXH) return -1;
      if (target === t.h) return 0;
      if (target < 1) { if (tool === 'level') target = 1; else { if (!dry) Object.assign(t, { ter: 1, h: 0, tree: 0, k: '', z: '', d: 0 }); return 40; } }
      const c = Math.abs(target - t.h) * 15;
      if (!dry) t.h = target;
      return c;
    }
    case 'powerline': {
      if (powerLineAt(t)) return 0;
      if (isRoad(t)) { if (!dry) t.pl = 1; return 5; }
      if (t.k === '' ) { if (!dry) { t.k = 'power'; t.tree = 0; } return t.ter ? 15 : 5 + treeC; }
      return -1;
    }
    case 'bulldoze': {
      if (t.k === 'bld') { const c = 10 * BLD[T[t.o].b].sz ** 2; if (!dry) { const o = t.o; for (const j of footprint(i)) { Object.assign(T[j], { k: '', b: '', o: -1, burn: 0, pl: 0 }); } delete S.fills[o]; } return c; }
      if (t.k === 'zone') { if (t.lvl === 0 && !t.rub) return -1; const c = 2 + t.lvl * 4; if (!dry) Object.assign(t, { lvl: 0, occ: 0, ab: 0, rub: 0, burn: 0 }); return c; }
      if (t.k !== '') { if (!dry) Object.assign(t, { k: '', pl: 0, rl: 0, burn: 0 }); return t.ter ? 10 : 1; }
      if (t.tree) { if (!dry) t.tree = 0; return 2; }
      return -1;
    }
    case 'dezone': { if (t.k === 'zone' && t.lvl === 0) { if (!dry) Object.assign(t, { k: '', z: '', d: 0, rub: 0 }); return 1; } return -1; }
    case 'tree': { if (t.ter === 0 && t.k === '' && !t.tree) { if (!dry) t.tree = 1; return 3; } return -1; }
  }
  if (tl.zone) {
    const [z, d] = tl.zone;
    if (t.ter === 1) return -1;
    if (t.k === '' || t.k === 'rubble') { if (!dry) Object.assign(t, { k: 'zone', z, d, lvl: 0, occ: 0, ab: 0, rub: 0, tree: 0, np: 0 }); return tl.cost + treeC; }
    if (t.k === 'zone') {
      if (t.z === z && t.d === d) return 0;
      if (t.lvl === 0) { if (!dry) Object.assign(t, { z, d }); return tl.cost; }
      if (t.z === z && d > t.d) { if (!dry) t.d = d; return tl.cost; }
    }
    return -1;
  }
  return -1;
}
let levelTarget = 1;
function applyTool(tool, tiles, start) {
  const tl = TOOLS[tool];
  if (tool === 'level') { const st = start || tiles[0]; levelTarget = Math.max(1, T[idx(st[0], st[1])].h); }
  let spent = 0, fail = 0, poor = false;
  if (tl.type === 'place') {
    const [x, y] = tiles[0]; const [ox, oy] = placeOrigin(tool, x, y); const key = tl.bld, b = BLD[key];
    const err = canPlaceBld(key, ox, oy);
    if (err) { flash(err); return; }
    let extra = 0; for (let yy = oy; yy < oy + b.sz; yy++) for (let xx = ox; xx < ox + b.sz; xx++) if (T[idx(xx, yy)].tree) extra += 3;
    const cost = b.cost + extra;
    if (cost > S.money) { flash('예산이 부족합니다'); return; }
    const o = idx(ox, oy);
    for (let yy = oy; yy < oy + b.sz; yy++) for (let xx = ox; xx < ox + b.sz; xx++) Object.assign(T[idx(xx, yy)], { k: 'bld', b: key, o, z: '', d: 0, lvl: 0, occ: 0, tree: 0, rub: 0, pl: 0, burn: 0 });
    T[o].age = S.year;
    if (b.fill) S.fills[o] = b.fill;
    if (b.reward) { S.rewards[key] = 'built'; buildToolbar(); news(`「${b.n}」이(가) 완공되었습니다!`, 'good'); }
    if (b.biz) { S.biz[key] = 'built'; buildToolbar(); news(`「${b.n}」이(가) 들어섰습니다. 매달 계약금이 들어옵니다.`, 'info'); }
    S.money -= cost; spent = cost;
  } else if (tl.type === 'click') {
    const [x, y] = tiles[0];
    if (tool === 'd_fire') { if (!igniteAt(x, y)) flash('불이 붙을 대상이 없습니다'); else news('🔥 화재가 발생했습니다!', 'bad'); }
    if (tool === 'd_quake') quake(x, y);
    if (tool === 'd_tornado') startTornado(x, y);
    if (tool === 'd_flood') startFlood(x, y);
    if (tool === 'd_meteor') startMeteor(x, y);
    if (tool === 'd_riot') startRiot(x, y);
    return;
  } else {
    for (const [x, y] of tiles) {
      const c = opTile(tool, x, y, true);
      if (c < 0) { fail++; continue; }
      if (c > S.money) { poor = true; break; }
      opTile(tool, x, y, false); S.money -= c; spent += c;
    }
    if (poor) flash('예산이 부족합니다');
    if (tool === 'raise' || tool === 'lower' || tool === 'level') calcWaterProx();
  }
  if (spent > 0) { floatText('-₩' + fmt(spent)); sfx('build'); }
  monthlyMaps();
  refreshUI();
}

/* ---------------- 렌더링 ---------------- */
const cv = $('view'), ctx = cv.getContext('2d');
let cw = 0, ch = 0, dpr = 1, zoom = 1, camX = 0, camY = 0, hw = 32, hh = 16, elev = 0;
let overlay = 'none', shake = 0, miniDirty = true;
let hover = null, drag = null;
let tool = 'inspect';
let floats = [];
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cw = innerWidth; ch = innerHeight;
  cv.width = cw * dpr; cv.height = ch * dpr; cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
}
function centerCamera(x, y) { hw = TW / 2 * zoom; hh = TH / 2 * zoom; camX = cw / 2 - (x - y) * hw; camY = ch / 2 - (x + y) * hh; }
function ws(x, y) { return [(x - y) * hw + camX, (x + y) * hh + camY - elev]; }
function setElev(i) { elev = T[i].h * STEP * zoom; }
function sw(sx, sy) { const a = (sx - camX) / hw, b = (sy - camY) / hh; return [(a + b) / 2, (b - a) / 2]; }
function tileAt(sx, sy) {
  // 높이를 고려해 화면 좌표 아래에 보이는 가장 앞쪽 타일을 찾는다
  let best = null, bd = -1;
  for (let h = 0; h <= MAXH; h++) {
    const [x, y] = sw(sx, sy + h * STEP * zoom); const tx = Math.floor(x), ty = Math.floor(y);
    if (inb(tx, ty) && T[idx(tx, ty)].h === h && tx + ty > bd) { bd = tx + ty; best = [tx, ty]; }
  }
  if (best) return best;
  const [x, y] = sw(sx, sy + STEP * zoom); const tx = Math.floor(x), ty = Math.floor(y); return inb(tx, ty) ? [tx, ty] : null;
}
function setZoom(nz, sx, sy) {
  nz = clamp(nz, 0.2, 3);
  const [wx, wy] = sw(sx, sy);
  zoom = nz; hw = TW / 2 * zoom; hh = TH / 2 * zoom;
  camX = sx - (wx - wy) * hw; camY = sy - (wx + wy) * hh;
}

const shadeCache = new Map();
function shade(hex, f) {
  const key = hex + f; let v = shadeCache.get(key); if (v) return v;
  const n = parseInt(hex.slice(1), 16); const r = clamp(((n >> 16) & 255) * f, 0, 255) | 0, g = clamp(((n >> 8) & 255) * f, 0, 255) | 0, b = clamp((n & 255) * f, 0, 255) | 0;
  v = `rgb(${r},${g},${b})`; shadeCache.set(key, v); return v;
}
function poly(pts, fill, stroke) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); } }
function diamond(x, y, fill, inset, stroke) {
  inset = inset || 0;
  poly([ws(x + inset, y + inset), ws(x + 1 - inset, y + inset), ws(x + 1 - inset, y + 1 - inset), ws(x + inset, y + 1 - inset)], fill, stroke);
}
function heat(v) { v = clamp(v, 0, 1); return `hsla(${(1 - v) * 120},80%,48%,0.62)`; }

const GRASS = ['#6aa84f', '#66a34b', '#70ad52', '#62a048'];
const SEASON_GRASS = { winter: ['#e6ecef', '#dde5ea', '#edf1f3', '#d9e2e7'], spring: ['#74b84f', '#6db24b', '#7bbd57', '#68ad48'], summer: GRASS, autumn: ['#9aa54f', '#a2a24c', '#93a052', '#a89f4a'] };
function season() { const m = S ? S.month : 5; return m === 11 || m <= 1 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn'; }
let SEASON = 'summer';
function cliff(x, y, t) {
  // 앞쪽 두 면(+x, +y)에 절벽 그리기
  const h0 = t.h;
  const nr = x + 1 < W ? T[idx(x + 1, y)].h : -1, nl = y + 1 < H ? T[idx(x, y + 1)].h : -1;
  const base = t.ter === 1 ? '#2f6aa3' : SEASON === 'winter' ? '#9e9e9e' : '#8d6e63';
  if (h0 > nr) { const a = ws(x + 1, y), b = ws(x + 1, y + 1), d = (h0 - nr) * STEP * zoom; poly([a, b, [b[0], b[1] + d], [a[0], a[1] + d]], shade(base, 0.62)); }
  if (h0 > nl) { const a = ws(x, y + 1), b = ws(x + 1, y + 1), d = (h0 - nl) * STEP * zoom; poly([a, b, [b[0], b[1] + d], [a[0], a[1] + d]], shade(base, 0.8)); }
}
function drawGround(x, y, t, time) {
  const i = idx(x, y);
  if (t.ter === 1) {
    diamond(x, y, (x + y + ((time / 900) | 0)) % 7 === 0 ? '#4a90d0' : '#3d85c6');
    if (zoom > 0.6) { const [sx, sy] = ws(x + 0.5, y + 0.5); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; const o = Math.sin(time / 600 + x * 0.7 + y) * 4 * zoom; ctx.beginPath(); ctx.moveTo(sx - 8 * zoom + o, sy); ctx.lineTo(sx - 2 * zoom + o, sy); ctx.stroke(); }
  } else diamond(x, y, SEASON_GRASS[SEASON][t.v]);
  if (t.k === 'rail') {
    if (t.ter === 1) diamond(x, y, '#6d4c41', 0.12); else diamond(x, y, '#a1887f', 0.12);
    drawRails(x, y);
  } else if (t.k === 'zone') {
    if (t.lvl === 0) {
      diamond(x, y, '#d6d2b4', 0.03, null);
      diamond(x, y, ZCOL[t.z] + '70', 0.06, null);
      ctx.lineWidth = Math.max(1, zoom); diamond(x, y, null, 0.08, ZCOL[t.z]);
      if (t.d > 1 && zoom > 0.6) { diamond(x, y, null, 0.2 + 0.06 * (t.d - 2), ZCOL[t.z] + 'aa'); }
    } else diamond(x, y, t.z === 'R' ? '#8fbf6f' : t.z === 'C' ? '#a7a9ac' : '#9b9282');
    if (t.rub) drawRubble(x, y);
  } else if (isRoad(t)) {
    if (t.ter === 1) { diamond(x, y, '#8d6e63', 0.1); }
    const av = t.k === 'avenue', hw2 = t.k === 'hwy';
    diamond(x, y, hw2 ? '#3a3d40' : av ? '#4f5357' : '#6b6e72', t.ter ? 0.14 : hw2 ? 0 : 0.02);
    if (hw2 && zoom > 0.45) { ctx.lineWidth = Math.max(1, zoom); diamond(x, y, null, 0.08, 'rgba(255,255,255,0.55)'); }
    // 차선
    if (zoom > 0.45) {
      const c = ws(x + 0.5, y + 0.5);
      ctx.strokeStyle = av || hw2 ? '#f4d03f' : 'rgba(255,255,255,0.75)'; ctx.lineWidth = Math.max(1, zoom * (av || hw2 ? 1.6 : 1));
      ctx.setLineDash([3 * zoom, 3 * zoom]);
      let n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (!inb(nx, ny) || !isRoad(T[idx(nx, ny)])) continue; n++;
        const e = ws(x + 0.5 + dx * 0.5, y + 0.5 + dy * 0.5); ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    if (t.rl) drawRails(x, y);
    if (overlay !== 'traffic' && zoom > 0.6 && M.cong[i] > 0.9) diamond(x, y, 'rgba(230,60,40,0.25)', 0.25);
  } else if (t.k === 'bld') {
    const b = BLD[T[t.o].b];
    if (b.flat === 'park') diamond(x, y, '#4e9a3a');
    else if (b.flat === 'plaza') { diamond(x, y, '#d7ccc8'); diamond(x, y, null, 0.15, '#bcaaa4'); }
    else if (b.flat === 'landfill') { diamond(x, y, '#8d7b5a'); }
    else if (b.flat === 'airport') { diamond(x, y, '#9ea3a8'); }
    else if (b.flat === 'bus') { diamond(x, y, '#c8c8c0'); }
    else if (b.solar) diamond(x, y, '#c9cfc4');
    else diamond(x, y, '#b5b5ad');
  } else if (t.k === 'rubble') {
    if (t.ter === 1) diamond(x, y, '#3d85c6'); else diamond(x, y, '#8b7d6b'); drawRubble(x, y);
  } else if (t.k === 'power' && t.ter === 0) { /* 잔디 위 송전선 */ }
}
function drawRails(x, y) {
  if (zoom < 0.35) return;
  const c = ws(x + 0.5, y + 0.5);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy; if (!inb(nx, ny) || !(isRail(T[idx(nx, ny)]) || (T[idx(nx, ny)].k === 'bld' && BLD[T[T[idx(nx, ny)].o].b].needRail))) continue;
    const e = ws(x + 0.5 + dx * 0.5, y + 0.5 + dy * 0.5);
    // 침목
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 3 * zoom; ctx.setLineDash([1.5 * zoom, 3 * zoom]); ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(e[0], e[1]); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#cfd8dc'; ctx.lineWidth = Math.max(1, 0.9 * zoom);
    const px = dy !== 0 ? 2.5 * zoom : 2.5 * zoom, py = dy !== 0 ? -1.25 * zoom : 1.25 * zoom;
    for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(c[0] + px * sgn, c[1] + py * sgn); ctx.lineTo(e[0] + px * sgn, e[1] + py * sgn); ctx.stroke(); }
  }
}
const CAR_COLS = ['#e53935', '#1e88e5', '#fdd835', '#f5f5f5', '#43a047', '#212121', '#fb8c00'];
function drawCars(x, y, t, time) {
  const i = idx(x, y); const cg = M.cong[i]; if (cg < 0.05) return;
  const n = Math.min(t.k === 'hwy' ? 6 : 4, Math.ceil(cg * 3));
  const ex = (x + 1 < W && isRoad(T[idx(x + 1, y)])) || (x > 0 && isRoad(T[idx(x - 1, y)]));
  const ey = (y + 1 < H && isRoad(T[idx(x, y + 1)])) || (y > 0 && isRoad(T[idx(x, y - 1)]));
  const alongX = ex || !ey;
  for (let k = 0; k < n; k++) {
    const dir = k % 2 ? 1 : -1, sp = cg > 1.2 ? 0.25 : 1;
    let f = ((time / 2200) * sp * dir + k * 0.37 + (x * 13 + y * 7) * 0.031) % 1; if (f < 0) f += 1;
    const lane = 0.5 + dir * 0.17;
    const cx = alongX ? x + f : x + lane, cy = alongX ? y + lane : y + f;
    const sx = alongX ? 0.2 : 0.12, sy = alongX ? 0.12 : 0.2;
    box(cx - sx / 2, cy - sy / 2, sx, sy, 0, 4, CAR_COLS[(k + x + y) % CAR_COLS.length]);
  }
}
function drawRubble(x, y) {
  if (zoom < 0.5) { diamond(x, y, '#7b6a58', 0.2); return; }
  ctx.fillStyle = '#6d5f50';
  for (let k = 0; k < 5; k++) { const [sx, sy] = ws(x + 0.25 + ((k * 37) % 50) / 100, y + 0.25 + ((k * 61) % 50) / 100); ctx.fillRect(sx - 2 * zoom, sy - 1.5 * zoom, 4 * zoom, 3 * zoom); }
}
function drawTree(x, y, k, s) {
  const [sx, sy] = ws(x, y);
  const h = 14 * zoom * s;
  ctx.fillStyle = '#5d4037'; ctx.fillRect(sx - 1 * zoom, sy - h * 0.35, 2 * zoom, h * 0.35);
  ctx.fillStyle = SEASON === 'autumn' && k % 3 !== 0 ? (k % 2 ? '#d35400' : '#e6a020') : SEASON === 'spring' && k % 4 === 1 ? '#f48fb1' : k % 2 ? '#2e7d32' : '#388e3c';
  ctx.beginPath(); ctx.moveTo(sx, sy - h * 1.2); ctx.lineTo(sx + 5.5 * zoom * s, sy - h * 0.25); ctx.lineTo(sx - 5.5 * zoom * s, sy - h * 0.25); ctx.closePath(); ctx.fill();
  ctx.fillStyle = SEASON === 'winter' ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.moveTo(sx, sy - h * 1.2); ctx.lineTo(sx - 5.5 * zoom * s, sy - h * 0.25); ctx.lineTo(sx, sy - h * 0.3); ctx.closePath(); ctx.fill();
}
function drawTrees(x, y, t) {
  const n = 1 + (t.v % 3);
  const pos = [[0.35, 0.4], [0.7, 0.55], [0.45, 0.78], [0.72, 0.3]];
  for (let k = 0; k < n; k++) drawTree(x + pos[(k + t.v) % 4][0], y + pos[(k + t.v) % 4][1], k + t.v, 0.8 + ((k + t.v) % 3) * 0.15);
}
// 상자형 건물. 반환 꼭짓점
function box(x0, y0, w, h, inset, height, col, alpha) {
  const a = ws(x0 + inset, y0 + inset), b = ws(x0 + w - inset, y0 + inset), c = ws(x0 + w - inset, y0 + h - inset), d = ws(x0 + inset, y0 + h - inset);
  const Hh = height * zoom;
  const up = p => [p[0], p[1] - Hh];
  poly([d, c, up(c), up(d)], shade(col, 0.78));
  poly([c, b, up(b), up(c)], shade(col, 0.62));
  poly([up(a), up(b), up(c), up(d)], shade(col, 1.06));
  return { a, b, c, d, H: Hh, up };
}
function windows(bx, floors, col) {
  if (zoom < 0.7 || floors < 1) return;
  const { b, c, d, H: Hh } = bx; const fh = Hh / (floors + 0.5);
  ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, 1.6 * zoom); ctx.setLineDash([2.5 * zoom, 2.5 * zoom]);
  const glow = nightK > 0.12 && !/^rgba\((40|60),/.test(col) && lights.length < 8000;
  for (let f = 0; f < floors; f++) {
    const oy = -(f + 0.6) * fh;
    const l1 = [d[0] + (c[0] - d[0]) * 0.15, d[1] + (c[1] - d[1]) * 0.15 + oy, d[0] + (c[0] - d[0]) * 0.88, d[1] + (c[1] - d[1]) * 0.88 + oy];
    const l2 = [c[0] + (b[0] - c[0]) * 0.12, c[1] + (b[1] - c[1]) * 0.12 + oy, c[0] + (b[0] - c[0]) * 0.85, c[1] + (b[1] - c[1]) * 0.85 + oy];
    ctx.beginPath(); ctx.moveTo(l1[0], l1[1]); ctx.lineTo(l1[2], l1[3]); ctx.moveTo(l2[0], l2[1]); ctx.lineTo(l2[2], l2[3]); ctx.stroke();
    if (glow && (f * 7 + floors) % 3 !== 0) { lights.push(l1); if (f % 2) lights.push(l2); }
  }
  ctx.setLineDash([]);
}
function roof(bx, col, peak) {
  const { a, b, c, d, up } = bx; const A = up(a), B = up(b), C = up(c), D = up(d);
  const ap = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2 - peak * zoom];
  poly([A, D, ap], shade(col, 0.95)); poly([A, B, ap], shade(col, 0.8));
  poly([D, C, ap], shade(col, 1.08)); poly([C, B, ap], shade(col, 0.72));
}
function smoke(sx, sy, seed, time, dark) {
  if (zoom < 0.5) return;
  for (let k = 0; k < 4; k++) {
    const ph = ((time / 1400 + k / 4 + seed * 0.13) % 1);
    ctx.fillStyle = dark ? `rgba(70,70,70,${0.45 * (1 - ph)})` : `rgba(230,230,230,${0.5 * (1 - ph)})`;
    ctx.beginPath(); ctx.arc(sx + ph * 10 * zoom, sy - ph * 26 * zoom, (2 + ph * 6) * zoom, 0, 7); ctx.fill();
  }
}
function chimney(x, y, height, time, seed, dark) {
  const bx = box(x - 0.06, y - 0.06, 0.12, 0.12, 0, height, '#8d6e63');
  const top = bx.up(bx.a); smoke(top[0], top[1] + 2 * zoom, seed, time, dark);
}
function drawZoneBld(x, y, t, time) {
  const v = t.v, L = t.lvl, ab = t.ab;
  const dim = c => ab ? '#7d7468' : c;
  const lit = ab ? 'rgba(40,40,40,0.6)' : (S.month >= 0 ? 'rgba(255,240,180,0.85)' : '#fff');
  if (t.z === 'R') {
    if (L <= 2) {
      const n = L === 1 ? 1 : 2;
      const spots = n === 1 ? [[0.2, 0.2, 0.6]] : [[0.08, 0.1, 0.45], [0.48, 0.45, 0.45]];
      const wallC = ['#f3e5d0', '#e8d6bd', '#f6eee2', '#dfcfb8'][v];
      const roofC = ['#c0392b', '#8e5b3e', '#5d6d7e', '#a04030'][v];
      for (const [ox, oy, s] of spots) { const bx = box(x + ox, y + oy, s, s, 0, 9 + v, dim(wallC)); roof(bx, dim(roofC), 7); }
    } else {
      const hgt = [0, 0, 0, 24, 36, 56, 78, 112, 150][L] + v * 4;
      const col = ['#e8d9c0', '#d9cbb5', '#cdbfa7', '#e3d4bd'][v];
      const bx = box(x, y, 1, 1, L >= 5 ? 0.12 : 0.1, hgt, dim(col));
      windows(bx, Math.round(hgt / 8), lit);
      if (L >= 5) { const tp = bx.up(bx.a); }
    }
  } else if (t.z === 'C') {
    if (L <= 2) {
      const col = ['#9ec5e8', '#f0b27a', '#aed6f1', '#f5cba7'][v];
      const bx = box(x, y, 1, 1, 0.12, 11 + L * 3, dim(col));
      // 차양
      const { c, d, b } = bx; const y1 = -bx.H * 0.45;
      poly([[d[0], d[1] + y1], [c[0], c[1] + y1], [c[0], c[1] + y1 + 3 * zoom], [d[0], d[1] + y1 + 3 * zoom]], dim('#e74c3c'));
      poly([[c[0], c[1] + y1], [b[0], b[1] + y1], [b[0], b[1] + y1 + 3 * zoom], [c[0], c[1] + y1 + 3 * zoom]], dim('#c0392b'));
    } else {
      const hgt = [0, 0, 0, 32, 46, 74, 104, 140, 190][L] + v * 6;
      const col = ['#7fa7d1', '#5b86b5', '#86a8c4', '#6c8fb0'][v];
      const bx = box(x, y, 1, 1, L >= 5 ? 0.16 : 0.1, hgt, dim(col));
      windows(bx, Math.round(hgt / 7), ab ? lit : 'rgba(210,235,255,0.75)');
      if (L >= 6 && zoom > 0.6) { const tp = bx.up(bx.a), cc = bx.up(bx.c); const mx = (tp[0] + cc[0]) / 2, my = (tp[1] + cc[1]) / 2; ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1.5 * zoom; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx, my - 14 * zoom); ctx.stroke(); }
    }
  } else if (t.sec === 'agri') {
    // 농장: 밭고랑 + 작은 헛간
    const crop = SEASON === 'winter' ? '#cfd8dc' : SEASON === 'autumn' ? '#e0b44c' : SEASON === 'spring' ? '#9ccc65' : '#7cb342';
    diamond(x, y, crop, 0.04);
    if (zoom > 0.5) { ctx.strokeStyle = 'rgba(80,60,30,0.35)'; ctx.lineWidth = Math.max(1, zoom); for (let k = 1; k < 5; k++) { const a = ws(x + k / 5, y + 0.05), b = ws(x + k / 5, y + 0.95); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } }
    if (L >= 2 || v % 2) { const bx = box(x + 0.62, y + 0.62, 0.3, 0.3, 0, 9, dim('#b23b2e')); roof(bx, dim('#5d4037'), 5); }
  } else {
    const hi = t.hi && !ab;
    const hgt = [0, 10, 14, 18, 22, 28, 34, 40, 48][L];
    const col = hi ? ['#cfd8dc', '#b0bec5', '#eceff1', '#c5cae9'][v] : ['#b8a07a', '#a58e66', '#9c8a6c', '#ad9776'][v];
    const bx = box(x, y, 1, 1, 0.08, hgt, dim(col));
    if (hi) { const { c, d, b } = bx; const yy = -bx.H * 0.5; ctx.strokeStyle = '#4fc3f7'; ctx.lineWidth = 2 * zoom; ctx.beginPath(); ctx.moveTo(d[0], d[1] + yy); ctx.lineTo(c[0], c[1] + yy); ctx.lineTo(b[0], b[1] + yy); ctx.stroke(); }
    else {
      // 톱니 지붕
      if (L >= 3 && zoom > 0.6) windows(bx, 1, 'rgba(60,50,40,0.5)');
      if (!ab) { const nC = L >= 5 ? 2 : 1; for (let k = 0; k < nC; k++) chimney(x + 0.3 + k * 0.4, y + 0.3, hgt + 6 + k * 3, time, x * 7 + y + k, true); }
    }
  }
}
function drawBld(o, time, alpha) {
  const t = T[o], key = t.b, b = BLD[key], x = o % W, y = (o / W) | 0, sz = b.sz;
  if (b.flat === 'park') { for (let yy = 0; yy < sz; yy++) for (let xx = 0; xx < sz; xx++) { drawTree(x + xx + 0.3, y + yy + 0.35, xx + yy, 0.9); drawTree(x + xx + 0.72, y + yy + 0.62, xx + yy + 1, 0.75); } if (sz > 1) { const bx = box(x + 0.85, y + 0.85, 0.3, 0.3, 0, 3, '#64b5f6'); } return; }
  if (b.flat === 'plaza') { const bx = box(x + 0.32, y + 0.32, 0.36, 0.36, 0, 4, '#b0bec5'); const tp = bx.up(bx.a), tc = bx.up(bx.c); ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.ellipse((tp[0] + tc[0]) / 2, (tp[1] + tc[1]) / 2, 7 * zoom, 3.5 * zoom, 0, 0, 7); ctx.fill(); const j = Math.sin(time / 200) * 2; ctx.fillStyle = 'rgba(200,240,255,.8)'; ctx.fillRect((tp[0] + tc[0]) / 2 - 1 * zoom, (tp[1] + tc[1]) / 2 - (10 + j) * zoom, 2 * zoom, (10 + j) * zoom); return; }
  if (b.flat === 'landfill') { const fillP = 1 - (S.fills[o] || 0) / b.fill; ctx.fillStyle = '#6d5f45'; for (let k = 0; k < 3 + fillP * 8; k++) { const [sx, sy] = ws(x + 0.3 + (k * 0.37) % 1.4, y + 0.3 + (k * 0.61) % 1.4); ctx.beginPath(); ctx.ellipse(sx, sy - 3 * zoom, 9 * zoom, 5 * zoom, 0, 0, 7); ctx.fill(); } return; }
  if (b.flat === 'airport') {
    ctx.lineWidth = 10 * zoom; ctx.strokeStyle = '#50555a'; const p1 = ws(x + 0.4, y + 0.6), p2 = ws(x + 3.8, y + 0.6); ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
    ctx.lineWidth = 1.2 * zoom; ctx.strokeStyle = '#fff'; ctx.setLineDash([5 * zoom, 4 * zoom]); ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke(); ctx.setLineDash([]);
    const bx = box(x + 1, y + 2, 2.4, 1.6, 0.1, 16, '#eceff1'); windows(bx, 1, 'rgba(79,195,247,0.9)');
    const tw = box(x + 0.3, y + 2.4, 0.4, 0.4, 0, 34, '#cfd8dc'); const tp = tw.up(tw.a); ctx.fillStyle = '#4fc3f7'; ctx.fillRect(tp[0] - 5 * zoom, tp[1] - 2 * zoom, 10 * zoom, 6 * zoom);
    const ph = (time / 6000) % 1; const pp = ws(x + 0.4 + ph * 3.4, y + 0.6); ctx.font = `${16 * zoom}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('✈️', pp[0], pp[1] - ph * 30 * zoom);
    return;
  }
  if (b.flat === 'bus') { const bx = box(x + 0.2, y + 0.35, 0.6, 0.3, 0, 10, '#f1c40f'); emoji(b, bx, 0.7); return; }
  if (b.wind) {
    const [sx, sy] = ws(x + 0.5, y + 0.5); const hgt = 46 * zoom;
    ctx.strokeStyle = '#eceff1'; ctx.lineWidth = 3 * zoom; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - hgt); ctx.stroke();
    const ang = t.pw || true ? time / 300 + x : 0; ctx.lineWidth = 2.2 * zoom;
    for (let k = 0; k < 3; k++) { const a = ang + k * 2.094; ctx.beginPath(); ctx.moveTo(sx, sy - hgt); ctx.lineTo(sx + Math.cos(a) * 16 * zoom, sy - hgt + Math.sin(a) * 16 * zoom); ctx.stroke(); }
    return;
  }
  if (b.solar) {
    for (let yy = 0; yy < sz; yy++) for (let xx = 0; xx < sz; xx++) for (const [px, py] of [[0.1, 0.1], [0.55, 0.1], [0.1, 0.55], [0.55, 0.55]]) {
      const bx = box(x + xx + px, y + yy + py, 0.36, 0.36, 0, 2, '#1a3c6e');
    }
    return;
  }
  if (b.wtower) {
    const [sx, sy] = ws(x + 0.5, y + 0.5);
    ctx.strokeStyle = '#78909c'; ctx.lineWidth = 2 * zoom; for (const dx of [-6, 6]) { ctx.beginPath(); ctx.moveTo(sx + dx * zoom, sy); ctx.lineTo(sx + dx * 0.4 * zoom, sy - 26 * zoom); ctx.stroke(); }
    ctx.fillStyle = '#90caf9'; ctx.beginPath(); ctx.ellipse(sx, sy - 32 * zoom, 11 * zoom, 9 * zoom, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#64b5f6'; ctx.beginPath(); ctx.ellipse(sx, sy - 30 * zoom, 11 * zoom, 6 * zoom, 0, 0, 3.14); ctx.fill();
    return;
  }
  if (b.nuke) {
    const bx = box(x + 1.6, y + 0.2, 1.2, 1.4, 0.05, 22, '#cfd8dc'); ctx.fillStyle = '#eceff1';
    for (const [cx, cy] of [[0.9, 1.0], [1.0, 2.2]]) {
      const [sx, sy] = ws(x + cx, y + cy); const r1 = 20 * zoom, r2 = 13 * zoom, hgt = 46 * zoom;
      ctx.fillStyle = '#d6dbdf'; ctx.beginPath(); ctx.moveTo(sx - r1, sy); ctx.quadraticCurveTo(sx - r2 * 0.8, sy - hgt * 0.6, sx - r2, sy - hgt); ctx.lineTo(sx + r2, sy - hgt); ctx.quadraticCurveTo(sx + r2 * 0.8, sy - hgt * 0.6, sx + r1, sy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b0b8bf'; ctx.beginPath(); ctx.ellipse(sx, sy - hgt, r2, r2 * 0.4, 0, 0, 7); ctx.fill();
      smoke(sx - 4 * zoom, sy - hgt, cx * 5, time, false);
    }
    return;
  }
  const bx = box(x, y, sz, sz, 0.12, b.h, b.col);
  if (b.h >= 20) windows(bx, Math.min(4, Math.round(b.h / 10)), 'rgba(255,245,200,0.7)');
  if (b.chim) for (let k = 0; k < b.chim; k++) chimney(x + 0.4 + k * 0.7, y + 0.35, b.h + 26, time, o + k, key === 'coal');
  if (key === 'landmark' && zoom > 0.4) { const tp = bx.up(bx.a), tc = bx.up(bx.c); const mx = (tp[0] + tc[0]) / 2, my = (tp[1] + tc[1]) / 2; ctx.strokeStyle = '#e1f5fe'; ctx.lineWidth = 3 * zoom; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx, my - 40 * zoom); ctx.stroke(); ctx.fillStyle = Math.sin(time / 300) > 0 ? '#ff5252' : '#b71c1c'; ctx.beginPath(); ctx.arc(mx, my - 40 * zoom, 3 * zoom, 0, 7); ctx.fill(); }
  emoji(b, bx, sz * 0.55);
}
function emoji(b, bx, scale) {
  if (!b.ico || zoom < 0.45) return;
  const tp = bx.up(bx.a), tc = bx.up(bx.c); const mx = (tp[0] + tc[0]) / 2, my = (tp[1] + tc[1]) / 2;
  ctx.font = `${Math.round(22 * zoom * Math.max(scale, 0.6))}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(b.ico, mx, my); ctx.textBaseline = 'alphabetic';
}
function drawPole(x, y) {
  const [sx, sy] = ws(x + 0.5, y + 0.5); const hgt = 18 * zoom;
  ctx.strokeStyle = '#5d4037'; ctx.lineWidth = Math.max(1, 1.6 * zoom);
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - hgt); ctx.moveTo(sx - 4 * zoom, sy - hgt + 2 * zoom); ctx.lineTo(sx + 4 * zoom, sy - hgt + 2 * zoom); ctx.stroke();
  ctx.strokeStyle = 'rgba(30,30,30,0.7)'; ctx.lineWidth = Math.max(0.7, zoom * 0.8);
  for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
    const nx = x + dx, ny = y + dy; if (!inb(nx, ny) || !powerLineAt(T[idx(nx, ny)])) continue;
    const [ex, ey] = ws(x + 0.5 + dx * 0.5, y + 0.5 + dy * 0.5);
    ctx.beginPath(); ctx.moveTo(sx, sy - hgt + 2 * zoom); ctx.quadraticCurveTo((sx + ex) / 2, (sy + ey) / 2 - hgt + 5 * zoom, ex, ey - hgt + 2 * zoom); ctx.stroke();
  }
}
function drawFire(x, y, time) {
  const [sx, sy] = ws(x + 0.5, y + 0.5);
  for (let k = 0; k < 3; k++) {
    const f = Math.sin(time / 90 + k * 2 + x) * 3;
    ctx.fillStyle = k === 0 ? 'rgba(255,87,34,0.9)' : k === 1 ? 'rgba(255,152,0,0.85)' : 'rgba(255,235,59,0.8)';
    ctx.beginPath(); const s = (14 - k * 4) * zoom; ctx.moveTo(sx - s * 0.7 + k * 3 * zoom, sy); ctx.quadraticCurveTo(sx, sy - (30 - k * 7 + f) * zoom, sx + s * 0.7, sy); ctx.closePath(); ctx.fill();
  }
  smoke(sx, sy - 24 * zoom, x + y, time, true);
}
let tod = 0.1, dayNight = true, nightK = 0, lights = [];
function drawEffects(time) {
  for (const r of riots) {
    setElev(idx(r.x | 0, r.y | 0)); const [sx, sy] = ws(r.x, r.y);
    for (let k = 0; k < 12; k++) { const a = k * 0.52 + time / 400, rr = (6 + (k % 4) * 4) * zoom; ctx.fillStyle = k % 3 ? '#e53935' : '#ffb300'; ctx.beginPath(); ctx.arc(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr * 0.5, 2.2 * zoom, 0, 7); ctx.fill(); }
    ctx.font = `${18 * zoom}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('✊', sx, sy - 14 * zoom);
  }
  if (meteor) {
    const p = (performance.now() - meteor.t0) / 1300;
    if (p >= 1) meteorImpact();
    else { setElev(idx(meteor.x, meteor.y)); const [tx, ty] = ws(meteor.x + 0.5, meteor.y + 0.5); const sx = tx + (1 - p) * 500, sy = ty - (1 - p) * 700;
      const g = ctx.createLinearGradient(sx + 80, sy - 110, sx, sy); g.addColorStop(0, 'rgba(255,200,80,0)'); g.addColorStop(1, 'rgba(255,120,40,0.95)');
      ctx.strokeStyle = g; ctx.lineWidth = 8 * zoom; ctx.beginPath(); ctx.moveTo(sx + 80, sy - 110); ctx.lineTo(sx, sy); ctx.stroke(); ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.arc(sx, sy, 7 * zoom, 0, 7); ctx.fill(); }
  }
  // 밤: 어둡게 덮고 창문·가로등 불빛을 더한다
  if (nightK > 0.02) {
    ctx.fillStyle = `rgba(8,14,42,${nightK})`; ctx.fillRect(-50, -50, cw + 100, ch + 100);
    if (lights.length) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,214,120,${Math.min(1, nightK * 1.5)})`; ctx.setLineDash([2.5 * zoom, 2.5 * zoom]); ctx.lineWidth = Math.max(1, 1.6 * zoom);
      ctx.beginPath(); for (const l of lights) if (l.length === 4) { ctx.moveTo(l[0], l[1]); ctx.lineTo(l[2], l[3]); } ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = `rgba(255,200,110,${nightK * 0.55})`;
      for (const l of lights) if (l.length === 2) { ctx.beginPath(); ctx.arc(l[0], l[1], 5 * zoom, 0, 7); ctx.fill(); }
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  lights = [];
}
function overlayColor(i, t) {
  switch (overlay) {
    case 'lv': return heat(1 - M.lv[i] / 180);
    case 'pol': return M.pol[i] > 2 ? heat(M.pol[i] / 80) : null;
    case 'crime': return M.crime[i] > 1 ? heat(M.crime[i] / 60) : null;
    case 'traffic': return isRoad(t) ? heat(M.cong[i] / 1.5) : null;
    case 'power': if (conducts(t)) return t.pw ? 'rgba(255,235,59,0.6)' : 'rgba(244,67,54,0.6)'; return null;
    case 'water': if ((t.k === 'zone') || (t.k === 'bld' && !BLD[T[t.o].b].flat)) return t.wt ? 'rgba(33,150,243,0.6)' : 'rgba(244,67,54,0.5)'; if (isRoad(t)) return 'rgba(144,202,249,0.35)'; return null;
    case 'wpol': return M.wpol[i] > 2 ? heat(M.wpol[i] / 60) : null;
    case 'height': return t.ter ? null : `hsla(${130 - t.h * 15},55%,45%,0.6)`;
    case 'commute': return t.k === 'zone' ? heat(1 - M.commute[i]) : null;
    case 'police': case 'fire': case 'health': case 'edu': { const v = M[overlay][i]; return v > 1 ? `rgba(79,195,247,${clamp(v / 110, 0.08, 0.7)})` : null; }
  }
  return null;
}

function render(time) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#1b2631'; ctx.fillRect(0, 0, cw, ch);
  if (!S) return;
  let sx0 = 0, sy0 = 0;
  if (shake > 0) { sx0 = (rnd() - 0.5) * shake * 0.4; sy0 = (rnd() - 0.5) * shake * 0.4; shake--; ctx.translate(sx0, sy0); }
  hw = TW / 2 * zoom; hh = TH / 2 * zoom;
  const margin = TW * zoom * 2;
  const vis = (x, y, extraUp) => { const [sx, sy] = ws(x, y); return sx > -margin && sx < cw + margin && sy > -margin - (extraUp || 0) && sy < ch + margin; };
  SEASON = season();
  // 지면 (뒤에서 앞으로, 절벽 포함)
  for (let s = 0; s <= W + H - 2; s++) for (let x = Math.max(0, s - H + 1); x <= Math.min(s, W - 1); x++) {
    const y = s - x; if (!vis(x, y, MAXH * STEP * zoom)) continue; const i = idx(x, y), t = T[i];
    setElev(i); drawGround(x, y, t, time); cliff(x, y, t);
    if (floodSet && floodSet.has(i)) diamond(x, y, 'rgba(61,133,198,0.72)');
  }
  // 오버레이
  if (overlay !== 'none') {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!vis(x, y, MAXH * STEP * zoom)) continue; const i = idx(x, y); const c = overlayColor(i, T[i]); if (c) { setElev(i); diamond(x, y, c); } }
  }
  // 미리보기 (지면)
  drawPreview();
  // 객체 (뒤에서 앞으로)
  const alpha = overlay === 'none' ? 1 : 0.4;
  ctx.globalAlpha = alpha;
  const tallUp = 300 * zoom;
  for (let s = 0; s <= W + H - 2; s++) {
    for (let x = Math.max(0, s - H + 1); x <= Math.min(s, W - 1); x++) {
      const y = s - x; if (!vis(x, y, tallUp)) continue;
      const i = idx(x, y), t = T[i];
      setElev(i);
      if (isRoad(t) && zoom > 0.55 && overlay === 'none') drawCars(x, y, t, time);
      if (nightK > 0.12 && isRoad(t) && (x + y) % 2 === 0 && lights.length < 8000) lights.push(ws(x + 0.5, y + 0.5));
      if (t.k === 'zone' && t.lvl > 0) drawZoneBld(x, y, t, time);
      else if (t.k === 'bld') { const o = t.o, b = BLD[T[o].b]; if (x === (o % W) + b.sz - 1 && y === ((o / W) | 0) + b.sz - 1) { setElev(o); drawBld(o, time); setElev(i); } }
      if (t.tree && t.k !== 'bld') drawTrees(x, y, t);
      if (powerLineAt(t) && zoom > 0.4) drawPole(x, y);
      if (t.burn) { ctx.globalAlpha = 1; drawFire(x, y, time); ctx.globalAlpha = alpha; }
      if (zoom > 0.55 && overlay === 'none' && ((t.k === 'zone' && !t.pw && !t.ab && !t.rub) || (t.k === 'bld' && t.o === i && !t.pw && (BLD[t.b].use || BLD[t.b].r)))) {
        if (Math.floor(time / 500) % 2) { const b = t.k === 'bld' ? BLD[t.b].sz : 1; const [px, py] = ws(x + b / 2, y + b / 2); ctx.font = `${14 * zoom}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('⚡', px, py - 30 * zoom); }
      }
    }
  }
  ctx.globalAlpha = 1;
  if (tornado) {
    if (inb(tornado.x | 0, tornado.y | 0)) setElev(idx(tornado.x | 0, tornado.y | 0));
    const [sx, sy] = ws(tornado.x, tornado.y);
    for (let k = 0; k < 10; k++) { const r = (4 + k * 2.6) * zoom; const off = Math.sin(time / 120 + k) * 4 * zoom; ctx.fillStyle = `rgba(90,90,100,${0.55 - k * 0.03})`; ctx.beginPath(); ctx.ellipse(sx + off, sy - k * 8 * zoom, r, r * 0.35, 0, 0, 7); ctx.fill(); }
  }
  drawEffects(time);
  elev = 0;
  // 떠오르는 글자
  const now = performance.now();
  floats = floats.filter(f => now - f.t < 1200);
  for (const f of floats) { const p = (now - f.t) / 1200; ctx.globalAlpha = 1 - p; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(f.s, f.x + 1, f.y - p * 40 + 1); ctx.fillStyle = '#ffeb3b'; ctx.fillText(f.s, f.x, f.y - p * 40); }
  ctx.globalAlpha = 1;
}
function previewTiles() {
  if (!hover) return null;
  const tl = TOOLS[tool];
  if (tl.type === 'place') { const [ox, oy] = placeOrigin(tool, hover[0], hover[1]); const sz = BLD[tl.bld].sz; const out = []; for (let y = oy; y < oy + sz; y++) for (let x = ox; x < ox + sz; x++) out.push([x, y]); return { tiles: out, ok: !canPlaceBld(tl.bld, ox, oy) }; }
  if (drag && drag.mode === 'paint' && drag.start) {
    if (tl.type === 'line') return { tiles: lineTiles(drag.start, hover) };
    if (tl.type === 'rect') return { tiles: rectTiles(drag.start, hover) };
  }
  if (tl.type === 'line' || tl.type === 'rect' || tl.type === 'click') return { tiles: [hover] };
  return { tiles: [hover], neutral: true };
}
function drawPreview() {
  const p = previewTiles(); if (!p) return;
  const tl = TOOLS[tool];
  for (const [x, y] of p.tiles) {
    if (!inb(x, y)) continue;
    setElev(idx(x, y));
    let ok = p.ok;
    if (ok === undefined) ok = p.neutral || tl.type === 'click' ? true : opTile(tool, x, y, true) >= 0;
    const col = p.neutral ? 'rgba(255,255,255,0.25)' : ok ? (tl.zone ? ZCOL[tl.zone[0]] + '99' : 'rgba(129,199,132,0.55)') : 'rgba(239,83,80,0.55)';
    diamond(x, y, col); ctx.lineWidth = 1; diamond(x, y, null, 0, 'rgba(255,255,255,0.7)');
  }
  // 서비스 범위 표시
  if (tl.type === 'place' && hover) {
    const b = BLD[tl.bld]; const rr = b.r || b.pr || b.bus || b.lr;
    if (rr) { const [ox, oy] = placeOrigin(tool, hover[0], hover[1]); if (inb(ox, oy)) setElev(idx(ox, oy)); const c = ws(ox + b.sz / 2, oy + b.sz / 2); ctx.strokeStyle = 'rgba(79,195,247,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.ellipse(c[0], c[1], rr * hw * Math.SQRT2, rr * hh * Math.SQRT2, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  }
}
function previewCost() {
  const p = previewTiles(); if (!p || p.neutral) return null;
  const tl = TOOLS[tool];
  if (tl.type === 'place') return BLD[tl.bld].cost;
  if (tl.type === 'click') return null;
  let c = 0; for (const [x, y] of p.tiles) { const v = opTile(tool, x, y, true); if (v > 0) c += v; } return c;
}

/* ---------------- 미니맵 ---------------- */
const mini = $('mini'), mctx = mini.getContext('2d');
let mimg = null;
function drawMini() {
  if (!S) return;
  if (!mimg || mimg.width !== W) mimg = mctx.createImageData(W, H);
  const d = mimg.data;
  for (let i = 0; i < N; i++) {
    const t = T[i]; let c;
    if (t.burn) c = [255, 87, 34];
    else if (t.k === 'zone') { const base = t.z === 'R' ? [76, 175, 80] : t.z === 'C' ? [33, 150, 243] : [255, 193, 7]; const f = t.lvl ? 0.55 + t.lvl * 0.08 : 0.35; c = base.map(v => v * f); }
    else if (isRoad(t)) c = [120, 120, 120];
    else if (t.k === 'bld') c = [200, 200, 210];
    else if (t.k === 'power') c = [180, 150, 60];
    else if (t.k === 'rubble') c = [120, 100, 80];
    else if (t.ter === 1) c = [52, 120, 190];
    else if (t.tree) c = [46, 110, 50];
    else c = [96, 160, 72];
    d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255;
  }
  const tmp = drawMini.c || (drawMini.c = document.createElement('canvas')); tmp.width = W; tmp.height = H; tmp.getContext('2d').putImageData(mimg, 0, 0);
  mctx.imageSmoothingEnabled = false; mctx.clearRect(0, 0, 128, 128); mctx.drawImage(tmp, 0, 0, 128, 128);
  // 시야
  const c = sw(cw / 2, ch / 2); mctx.strokeStyle = '#fff'; mctx.lineWidth = 1.5;
  const corners = [sw(0, 52), sw(cw, 52), sw(cw, ch), sw(0, ch)];
  mctx.beginPath(); corners.forEach((p, k) => { const px = p[0] * 128 / W, py = p[1] * 128 / H; k ? mctx.lineTo(px, py) : mctx.moveTo(px, py); }); mctx.closePath(); mctx.stroke();
}
mini.addEventListener('pointerdown', e => { const r = mini.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H; centerCamera(x, y); e.stopPropagation(); });

/* ---------------- 입력 ---------------- */
const pointers = new Map();
let pinch = null, spaceDown = false;
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  closeSub();
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, z: zoom };
    drag = null; return;
  }
  const tl = TOOLS[tool];
  hover = tileAt(e.clientX, e.clientY);
  if (e.button === 1 || e.button === 2 || tl.type === 'inspect' || spaceDown) {
    drag = { mode: 'pan', sx: e.clientX, sy: e.clientY, cx: camX, cy: camY, moved: 0 };
  } else {
    drag = { mode: 'paint', start: hover, sx: e.clientX, sy: e.clientY };
  }
});
cv.addEventListener('pointermove', e => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    camX += cx - pinch.cx; camY += cy - pinch.cy; pinch.cx = cx; pinch.cy = cy;
    setZoom(pinch.z * d / pinch.d, cx, cy);
    return;
  }
  hover = tileAt(e.clientX, e.clientY);
  if (drag && drag.mode === 'pan') {
    camX = drag.cx + e.clientX - drag.sx; camY = drag.cy + e.clientY - drag.sy;
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy));
  }
  updateTip(e.clientX, e.clientY);
});
function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pinch) { if (pointers.size < 2) pinch = null; drag = null; return; }
  if (!drag) return;
  if (drag.mode === 'pan') {
    if (drag.moved < 6 && TOOLS[tool].type === 'inspect' && e.button !== 2) { const t = tileAt(e.clientX, e.clientY); if (t) showInfo(t[0], t[1]); }
  } else if (drag.mode === 'paint') {
    const end = tileAt(e.clientX, e.clientY) || hover;
    const tl = TOOLS[tool];
    if (end && drag.start) {
      if (tl.type === 'line') applyTool(tool, lineTiles(drag.start, end));
      else if (tl.type === 'rect') applyTool(tool, rectTiles(drag.start, end), drag.start);
      else applyTool(tool, [end]);
    }
  }
  drag = null;
  if (e.pointerType !== 'mouse') hover = null;
  $('tip').classList.add('hidden');
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); drag = null; pinch = null; });
cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !drag) { hover = null; $('tip').classList.add('hidden'); } });
cv.addEventListener('wheel', e => { e.preventDefault(); setZoom(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12), e.clientX, e.clientY); }, { passive: false });
const keys = new Set();
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  keys.add(e.key);
  if (e.key === ' ') { spaceDown = true; e.preventDefault(); }
  if (e.key === 'Escape') { if (modalOpen) closeModal(); else selectTool('inspect'); }
  if (e.key === '+' || e.key === '=') setZoom(zoom * 1.15, cw / 2, ch / 2);
  if (e.key === '-') setZoom(zoom / 1.15, cw / 2, ch / 2);
  if (e.key === 'p' || e.key === 'P') setSpeed(speed ? 0 : 2);
  if (e.key === 'b' || e.key === 'B') selectTool('bulldoze');
  if (e.key === 'r') selectTool('road');
});
addEventListener('keyup', e => { keys.delete(e.key); if (e.key === ' ') spaceDown = false; });
function panKeys(dt) {
  const v = 600 * dt;
  if (keys.has('ArrowLeft') || keys.has('a')) camX += v; if (keys.has('ArrowRight') || keys.has('d')) camX -= v;
  if (keys.has('ArrowUp') || keys.has('w')) camY += v; if (keys.has('ArrowDown') || keys.has('s')) camY -= v;
}
function updateTip(mx, my) {
  const tip = $('tip');
  const c = previewCost();
  const tl = TOOLS[tool];
  if (c === null || tl.type === 'inspect') {
    if (tl.type === 'place' && hover) { const [ox, oy] = placeOrigin(tool, hover[0], hover[1]); const err = canPlaceBld(tl.bld, ox, oy); tip.textContent = err || ''; tip.classList.toggle('hidden', !err); }
    else tip.classList.add('hidden');
  } else {
    let s = '₩' + fmt(c);
    if (tl.type === 'place') { const [ox, oy] = placeOrigin(tool, hover[0], hover[1]); const err = canPlaceBld(tl.bld, ox, oy); if (err) s = err; }
    tip.textContent = s; tip.classList.remove('hidden');
  }
  tip.style.left = (mx + 16) + 'px'; tip.style.top = (my + 14) + 'px';
}
function floatText(s) { if (hover) setElev(idx(hover[0], hover[1])); const p = hover ? ws(hover[0] + 0.5, hover[1] + 0.5) : [cw / 2, ch / 2]; elev = 0; floats.push({ s, x: p[0], y: p[1] - 20, t: performance.now() }); }
let flashT = 0;
function flash(msg) { const el = $('tickText'); el.textContent = msg; el.className = 'bad'; $('tickIcon').textContent = '⛔'; sfx('err'); }

/* ---------------- 효과음 ---------------- */
let actx = null, soundOn = true;
function sfx(kind) {
  if (!soundOn) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain(); o.connect(g); g.connect(actx.destination);
    const t = actx.currentTime;
    if (kind === 'build') { o.type = 'square'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.08); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1); o.start(t); o.stop(t + 0.1); }
    else { o.type = 'sawtooth'; o.frequency.setValueAtTime(140, t); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.start(t); o.stop(t + 0.18); }
  } catch (e) { /* 무음 */ }
}

/* ---------------- UI ---------------- */
let curCat = -1;
function buildToolbar() {
  const tb = $('toolbar'); tb.innerHTML = '';
  CATS.forEach((c, k) => {
    const b = document.createElement('button'); b.className = 'cat' + (k === curCat ? ' on' : '');
    b.innerHTML = `${c.ico}<span>${c.n}</span>`;
    b.onclick = e => { e.stopPropagation(); if (curCat === k && !$('sub').classList.contains('hidden')) closeSub(); else openSub(k); };
    tb.appendChild(b);
  });
  if (curCat >= 0 && !$('sub').classList.contains('hidden')) openSub(curCat);
}
function openSub(k) {
  curCat = k; const c = CATS[k]; const sub = $('sub'); sub.innerHTML = `<div class="subhead">${c.n}</div>`;
  for (const key of c.tools) {
    const tl = TOOLS[key]; const b = BLD[tl.bld];
    const locked = b && ((b.reward && !S.rewards[key]) || (b.unlock && !S.unlocked[key]) || (b.biz && !S.biz[key]));
    const built = b && ((b.reward && S.rewards[key] === 'built') || (b.biz && S.biz[key] === 'built'));
    const el = document.createElement('button'); el.className = 'tool' + (tool === key ? ' on' : '') + (locked || built ? ' locked' : '');
    const desc = locked ? (b.biz ? '사업 제안을 받으면 지을 수 있음' : `인구 ${fmt(b.reward || b.unlock)} 달성 시 해금`) : built ? '건설 완료' : (tl.d || (tl.zone ? ZNAME[tl.zone[0]] + ' 구역 (' + DNAME[tl.zone[1]] + ')' : ''));
    const cost = tl.cost ? '₩' + fmt(tl.cost) + (b ? '' : '') : (b && b.reward ? '무료' : '');
    el.innerHTML = `<span class="ic">${tl.ico}</span><span class="nm">${tl.n}<small>${desc}</small></span><span class="co">${cost}</span>`;
    el.onclick = e => { e.stopPropagation(); if (locked || built) return; selectTool(key); closeSub(); };
    sub.appendChild(el);
  }
  sub.classList.remove('hidden');
  [...$('toolbar').children].forEach((b, i) => b.classList.toggle('on', i === k));
}
function closeSub() { $('sub').classList.add('hidden'); [...$('toolbar').children].forEach(b => b.classList.remove('on')); markCat(); }
function markCat() { const k = CATS.findIndex(c => c.tools.includes(tool)); [...$('toolbar').children].forEach((b, i) => b.classList.toggle('on', i === k)); }
function selectTool(k) {
  tool = k; markCat(); const tl = TOOLS[k];
  cv.style.cursor = tl.type === 'inspect' ? 'grab' : 'crosshair';
  if (k !== 'inspect') { const el = $('tickText'); el.className = ''; el.textContent = `도구: ${tl.n}` + (tl.type === 'line' ? ' — 드래그해서 선 긋기' : tl.type === 'rect' ? ' — 드래그해서 영역 지정' : tl.type === 'place' ? ' — 위치를 클릭해 건설' : ''); $('tickIcon').textContent = tl.ico; }
  $('info').classList.add('hidden');
}
function setSpeed(s) { speed = s; document.querySelectorAll('.sp').forEach(b => b.classList.toggle('on', +b.dataset.s === s)); }
document.querySelectorAll('.sp').forEach(b => b.onclick = () => setSpeed(+b.dataset.s));

function refreshUI() {
  if (!S) return;
  $('cityName').textContent = S.name;
  $('date').textContent = dateStr() + ' ' + ({ winter: '❄️', spring: '🌸', summer: '☀️', autumn: '🍁' })[season()];
  const m = $('money'); m.textContent = '₩ ' + fmt(S.money); m.classList.toggle('neg', S.money < 0);
  $('pop').textContent = fmt(RT.pop); $('rank').textContent = cityRank(RT.pop);
  for (const z of ['R', 'C', 'I']) {
    const el = $('d' + z), v = clamp(S.demand[z], -1, 1);
    el.style.background = ZCOL[z];
    if (v >= 0) { el.style.bottom = '50%'; el.style.top = ''; el.style.height = (v * 50) + '%'; }
    else { el.style.top = '50%'; el.style.bottom = ''; el.style.height = (-v * 50) + '%'; el.style.background = '#e57373'; }
  }
  $('approval').textContent = Math.round(S.approval) + '%';
  $('approval').style.color = S.approval > 60 ? 'var(--good)' : S.approval > 40 ? 'var(--warn)' : 'var(--bad)';
  if (modalOpen === 'budget') renderBudget(); else if (modalOpen === 'stats') renderStats();
  if (infoTile) showInfo(infoTile[0], infoTile[1], true);
}

// 정보 창
let infoTile = null;
function bar(v, max, col) { return `<div class="bar"><i style="width:${clamp(v / max * 100, 0, 100)}%;background:${col}"></i></div>`; }
function showInfo(x, y, refresh) {
  const i = idx(x, y), t = T[i]; infoTile = [x, y];
  let title = '빈 땅', lines = [];
  if (t.ter === 1 && !isRoad(t)) title = '물';
  if (t.tree && !t.k) title = '숲';
  if (t.k === 'zone') {
    title = `${ZNAME[t.z]} 구역 (${DNAME[t.d]})`;
    if (t.lvl === 0) lines.push(t.rub ? '잔해 정리 중' : '개발 대기 중');
    else lines.push(`건물 단계: ${t.lvl} / ${MAXLV[t.d]}` + (t.ab ? ' <b style="color:#ef5350">(버려짐)</b>' : ''), `${t.z === 'R' ? '주민' : '일자리'}: ${fmt(t.occ)}` + (t.z === 'I' && t.hi ? ' · 첨단산업' : ''));
    const why = [];
    if (M.roadDist[i] > 3) why.push('도로가 멀다(3칸 이내 필요)');
    if (!t.pw) why.push('전기가 없다');
    if (!t.wt && t.lvl >= 2) why.push('물이 없어 2단계 이상 불가');
    if (t.z !== 'I' && t.lvl < MAXLV[t.d] && M.lv[i] < LVGATE[t.lvl + 1]) why.push(`지가 부족(다음 단계 ${LVGATE[t.lvl + 1]} 필요)`);
    if (S.demand[t.z] < 0) why.push(ZNAME[t.z] + ' 수요 부족');
    if (why.length) lines.push('<span style="color:#ffca28">⚠ ' + why.join(', ') + '</span>');
  } else if (isRoad(t)) { title = t.ter ? '다리' : (t.k === 'avenue' ? '대로' : '도로'); lines.push(`교통량: ${fmt(M.traffic[i])} (혼잡도 ${Math.round(M.cong[i] * 100)}%)`); if (t.pl) lines.push('송전선 통과'); }
  else if (t.k === 'power') title = '송전선';
  else if (t.k === 'rubble') { title = '잔해'; lines.push('불도저로 치우세요'); }
  else if (t.k === 'bld') {
    const o = t.o, ot = T[o], b = BLD[ot.b]; title = b.n;
    if (b.mw) lines.push(`출력: ${fmt(plantMW(ot))}MW · 가동 ${S.year - ot.age}년 / 수명 ${b.life}년`);
    if (b.wcap) lines.push(t.pw ? '가동 중' : '<span style="color:#ef5350">전기 없음 — 가동 중지</span>');
    if (b.fill) lines.push(`남은 용량: ${fmt(S.fills[o] || 0)}t / ${fmt(b.fill)}t`);
    if (b.r) lines.push(t.pw ? `서비스 반경 ${b.r}칸 · 예산 ${S.fund[b.dept]}%` : '<span style="color:#ef5350">전기 없음 — 서비스 중단</span>');
    if (b.mt) lines.push(`유지비: 월 ₩${fmt(b.mt)}`);
    if (b.d) lines.push(`<small style="color:var(--muted)">${b.d}</small>`);
  }
  if (t.k === 'zone' && t.z === 'I' && t.lvl && t.sec) lines.push(`업종: <b>${secOf(t).n}</b>` + (secOf(t).hi ? ' (첨단)' : ''));
  if (t.k === 'zone' && M.commute[i] < 0.8) lines.push(`<span style="color:#ffca28">⚠ 같은 도로망에 ${t.z === 'R' ? '일자리' : '일할 사람'}가 부족 (통근 ${Math.round(M.commute[i] * 100)}%)</span>`);
  if (t.k === 'bld' && BLD[T[t.o].b].railR) lines.push(T[t.o].rc ? '🚆 철도망 연결됨' : '<span style="color:#ffca28">⚠ 다른 역이나 이웃 도시와 철도로 이어지지 않음</span>');
  lines.push(`<div style="margin-top:6px">지가 ${Math.round(M.lv[i])}${bar(M.lv[i], 200, '#66bb6a')}</div>`);
  if (M.wpol[i] > 3) lines.push(`수질 오염 ${Math.round(M.wpol[i])}${bar(M.wpol[i], 100, '#8d6e63')}`);
  lines.push(`<small style="color:var(--muted)">높이 ${t.h}단</small>`);
  lines.push(`오염 ${Math.round(M.pol[i])}${bar(M.pol[i], 100, '#a1887f')}`);
  lines.push(`범죄 ${Math.round(M.crime[i])}${bar(M.crime[i], 100, '#ef5350')}`);
  if (conducts(t) || t.k === 'zone') lines.push(`전력: ${t.pw ? '✅' : '❌'} · 수도: ${t.wt ? '✅' : '❌'}`);
  lines.push(`<small style="color:var(--muted)">좌표 (${x}, ${y})</small>`);
  const el = $('info'); el.innerHTML = `<div class="t"><span>${title}</span><button id="infoX">✕</button></div>` + lines.map(l => `<div>${l}</div>`).join('');
  el.classList.remove('hidden');
  $('infoX').onclick = () => { el.classList.add('hidden'); infoTile = null; };
}

// 모달
let modalOpen = null;
let modalOnClose = null;
function openModal(name, title, html) { modalOnClose = null; modalOpen = name; $('ptitle').textContent = title; $('pbody').innerHTML = html; $('modal').classList.remove('hidden'); }
function closeModal() { if (modalOpen === 'newgame' && !S) return; const f = modalOnClose; modalOnClose = null; modalOpen = null; $('modal').classList.add('hidden'); if (f) f(); }
$('pclose').onclick = closeModal;
$('modal').addEventListener('pointerdown', e => { if (e.target === $('modal')) closeModal(); });

function renderBudget() {
  const b = budgetMonth(false);
  const rows = (o, cls) => Object.entries(o).map(([k, v]) => `<tr><td>${k}</td><td class="${cls}">₩${fmt(v)}</td></tr>`).join('');
  const slider = (grp, k, label, min, max) => `<div class="row"><label>${label}</label><input type="range" min="${min}" max="${max}" value="${S[grp][k]}" data-g="${grp}" data-k="${k}"><span class="val">${S[grp][k]}%</span></div>`;
  let html = `<div class="grid2"><div><h3>월 수입</h3><table class="bt">${rows(b.inc, 'pos')}<tr class="sum"><td>합계</td><td class="pos">₩${fmt(b.totalInc)}</td></tr></table></div>
  <div><h3>월 지출</h3><table class="bt">${rows(b.exp, 'negc')}<tr class="sum"><td>합계</td><td class="negc">₩${fmt(b.totalExp)}</td></tr></table></div></div>
  <div class="kv" style="margin-top:8px;font-size:15px"><span>월 순이익</span><b class="${b.net >= 0 ? 'pos' : 'negc'}">₩${fmt(b.net)}</b></div>
  <div class="kv"><span>보유 자금</span><b>₩${fmt(S.money)}</b></div>
  <h3>세율 (높으면 수요·지지율 하락)</h3>
  ${slider('tax', 'R', '주거세', 0, 20)}${slider('tax', 'C', '상업세', 0, 20)}${slider('tax', 'I', '공업세', 0, 20)}
  <h3>업종별 공업세 조정 (기본 공업세에 ± 가감)</h3>
  <small style="color:var(--muted)">세율을 낮춘 업종은 더 많이 들어오고, 높인 업종은 줄어듭니다. 오염이 심한 업종에 세금을 올려 보세요.</small>
  ${SECKEYS.map(k => `<div class="row"><label>${SECT[k].n}</label><input type="range" min="-3" max="3" value="${S.secTax[k] || 0}" data-g="secTax" data-k="${k}"><span class="val">${(S.secTax[k] > 0 ? '+' : '') + (S.secTax[k] || 0)}%p</span></div>`).join('')}
  <h3>부서 예산 (낮추면 서비스 효과 감소)</h3>
  ${Object.entries(DEPTS).map(([k, n]) => slider('fund', k, n, 0, 120)).join('')}
  <h3>대출</h3>
  <div>${S.loans.length ? S.loans.map(l => `<div class="kv"><span>₩${fmt(l.amt)} (연 ${l.rate}%)</span><span>월 ₩${fmt(l.pay)} · ${l.left}개월 남음</span></div>`).join('') : '<small style="color:var(--muted)">대출 없음</small>'}</div>
  <div class="row" style="margin-top:8px"><button class="btn" id="loan1" ${S.loans.length >= 3 ? 'disabled' : ''}>₩10,000 대출 (10년)</button><button class="btn sec" id="loan2" ${S.loans.length >= 3 ? 'disabled' : ''}>₩30,000 대출 (10년)</button></div>`;
  const body = $('pbody'); const st = body.scrollTop; body.innerHTML = html; body.scrollTop = st;
  body.querySelectorAll('input[type=range]').forEach(inp => {
    inp.oninput = () => { S[inp.dataset.g][inp.dataset.k] = +inp.value; inp.nextElementSibling.textContent = inp.dataset.g === 'secTax' ? ((+inp.value > 0 ? '+' : '') + inp.value + '%p') : inp.value + '%'; };
    inp.onchange = () => { computeCoverage(); renderBudget(); };
  });
  const loan = amt => { const rate = 6 + S.loans.length * 2; const r = rate / 1200, n = 120; const pay = amt * r / (1 - Math.pow(1 + r, -n)); S.loans.push({ amt, rate, pay, left: n }); S.money += amt; news(`₩${fmt(amt)}을 대출받았습니다.`, 'info'); refreshUI(); renderBudget(); };
  $('loan1').onclick = () => loan(10000); $('loan2').onclick = () => loan(30000);
}
$('bBudget').onclick = () => { openModal('budget', '💰 예산'); renderBudget(); };

function renderOrd() {
  const html = Object.entries(ORDS).map(([k, o]) => {
    const cost = o.c > 0 ? `월 약 ₩${fmt(o.c * RT.pop)} 지출` : o.c < 0 ? `월 약 ₩${fmt(-o.c * RT.pop)} 수입` : '비용 없음';
    return `<label class="ord"><input type="checkbox" data-k="${k}" ${S.ord[k] ? 'checked' : ''}><div><b>${o.n}</b><small>${o.d}</small><small style="color:var(--warn)">${cost}</small></div></label>`;
  }).join('');
  $('pbody').innerHTML = '<small style="color:var(--muted)">조례 비용은 인구에 비례합니다.</small>' + html;
  $('pbody').querySelectorAll('input').forEach(c => c.onchange = () => { S.ord[c.dataset.k] = c.checked; news(`조례 「${ORDS[c.dataset.k].n}」이(가) ${c.checked ? '시행' : '폐지'}되었습니다.`, 'info'); });
}
$('bOrd').onclick = () => { openModal('ord', '📜 조례'); renderOrd(); };

function chart(canvas, series, colors) {
  const r = canvas.getBoundingClientRect(); const d = Math.min(devicePixelRatio || 1, 2);
  canvas.width = r.width * d; canvas.height = r.height * d; const c = canvas.getContext('2d'); c.scale(d, d);
  const w = r.width, h = r.height, pad = 6;
  let max = 1, min = 0; for (const s of series) for (const v of s) { if (v > max) max = v; if (v < min) min = v; }
  c.strokeStyle = '#2c4253'; c.lineWidth = 1; for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(0, h * k / 4); c.lineTo(w, h * k / 4); c.stroke(); }
  if (min < 0) { const zy = h - pad - (0 - min) / (max - min) * (h - 2 * pad); c.strokeStyle = '#777'; c.beginPath(); c.moveTo(0, zy); c.lineTo(w, zy); c.stroke(); }
  series.forEach((s, k) => {
    if (s.length < 2) return; c.strokeStyle = colors[k]; c.lineWidth = 2; c.beginPath();
    s.forEach((v, j) => { const x = j / (s.length - 1) * w, y = h - pad - (v - min) / (max - min) * (h - 2 * pad); j ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
  });
  c.fillStyle = '#9fb3c4'; c.font = '11px sans-serif'; c.fillText(fmt(max), 4, 12);
}
function renderStats() {
  const kv = (k, v) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`;
  const hist = S.hist.slice(-120);
  $('pbody').innerHTML = `<div class="grid2">
   ${kv('인구', fmt(RT.pop))}${kv('일자리 (상업/공업)', fmt(RT.cJobs) + ' / ' + fmt(RT.iJobs))}
   ${kv('실업률', Math.round(RT.unemp * 100) + '%')}${kv('지지율', Math.round(S.approval) + '%')}
   ${kv('교육 수준(EQ)', Math.round(S.eq))}${kv('기대수명', Math.round(S.life) + '세')}
   ${kv('전력', fmt(RT.powerUse) + ' / ' + fmt(RT.powerCap) + ' MW' + (RT.powerShort ? ` (정전 ${RT.powerShort}칸)` : ''))}${kv('수도', fmt(RT.waterUse) + ' / ' + fmt(RT.waterCap))}
   ${kv('쓰레기 (월)', fmt(RT.garbage) + 't · 처리 ' + fmt(RT.garbageDone) + 't')}${kv('미수거 쓰레기', fmt(S.garbageStock) + 't')}
   ${kv('평균 범죄', Math.round(RT.avgCrime))}${kv('평균 오염', Math.round(RT.avgPol))}
   ${kv('교통 혼잡', Math.round(RT.avgCong * 100) + '%')}${kv('매립지 잔여', fmt(RT.landfillLeft || 0) + 't')}
   ${kv('수질', Math.round(RT.waterQ === undefined ? 100 : RT.waterQ) + '점')}${kv('하수 처리', RT.pop > 800 ? Math.round((1 - (RT.untreated || 0)) * 100) + '%' : '불필요')}
   ${kv('수감자 / 정원', fmt(S.inmates || 0) + ' / ' + fmt(RT.jailCap || 0))}${kv('기차역 (연결)', (RT.stations || 0) + ' (' + (RT.stationsLinked || 0) + ')')}
  </div>
  <h3>산업 구성</h3>${(() => { const tot = Object.values(RT.secJobs || {}).reduce((a, b) => a + b, 0) || 1; return SECKEYS.map(k => { const v = (RT.secJobs || {})[k] || 0; return `<div class="row" style="margin:3px 0"><label style="flex-basis:96px">${SECT[k].n}</label><div class="bar" style="flex:1;height:10px"><i style="width:${v / tot * 100}%;background:${SECT[k].hi ? '#4fc3f7' : k === 'agri' ? '#9ccc65' : '#ffb74d'}"></i></div><span class="val">${Math.round(v / tot * 100)}%</span></div>`; }).join(''); })()}
  <h3>인구 (최근 10년)</h3><canvas class="chart" id="ch1"></canvas>
  <h3>주거 / 상업 / 공업</h3><div class="legendrow"><span><i style="background:var(--R)"></i>주민</span><span><i style="background:var(--C)"></i>상업 일자리</span><span><i style="background:var(--I)"></i>공업 일자리</span></div><canvas class="chart" id="ch2"></canvas>
  <h3>자금</h3><canvas class="chart" id="ch3"></canvas>
  <h3>최근 소식</h3><div style="max-height:160px;overflow:auto;font-size:12px">${S.news.slice(0, 25).map(n => `<div class="kv"><span>${n.date}</span><span style="text-align:right;flex:1;margin-left:8px">${n.text}</span></div>`).join('')}</div>`;
  chart($('ch1'), [hist.map(h => h.p)], ['#4fc3f7']);
  chart($('ch2'), [hist.map(h => h.r), hist.map(h => h.c), hist.map(h => h.i)], ['#4caf50', '#2196f3', '#ffc107']);
  chart($('ch3'), [hist.map(h => h.m)], ['#ffca28']);
}
$('bStats').onclick = () => { openModal('stats', '📊 도시 통계'); renderStats(); };

// 이웃 도시
let nbOffers = {};
function dealOffer(side, type) {
  const sc = Math.max(1, RT.pop / 20000);
  const r = (a, b) => a + rnd() * (b - a);
  const amt = Math.round(type[0] === 'p' ? r(50, 300) * sc : type[0] === 'w' ? r(100, 500) * sc : r(200, 1000) * sc);
  const price = +({ pSell: r(0.18, 0.3), pBuy: r(0.3, 0.45), wSell: r(0.12, 0.2), wBuy: r(0.22, 0.34), gExp: r(0.4, 0.7) })[type].toFixed(2);
  return { side, type, amt, price, left: 120 };
}
function renderNb() {
  const need = { pSell: 'power', pBuy: 'power', wSell: 'water', wBuy: 'water', gExp: 'any' };
  const has = (c, n) => n === 'power' ? c.power : n === 'water' ? (c.road || c.hwy) : (c.road || c.hwy || c.rail);
  let html = `<small style="color:var(--muted)">지도 가장자리까지 도로·고속도로·철도를 이으면 이웃과 연결됩니다. 연결되면 일자리와 손님이 늘고(수요 증가), 전기·물·쓰레기를 사고팔 수 있습니다. 전기는 송전선, 물은 도로(상수도관)로 이어야 합니다. 계약 기간은 10년입니다.</small>`;
  for (const nb of S.nb) {
    const c = RT.conn ? RT.conn[nb.side] : { road: 0, hwy: 0, rail: 0, power: 0 };
    const ic = (on, e, n) => `<span title="${n}" style="opacity:${on ? 1 : 0.25}">${e}</span>`;
    html += `<h3>${nb.name} <small style="color:var(--muted);font-weight:normal">${SIDE_NAMES[nb.side]} · 인구 ${fmt(nb.pop)}</small></h3>
    <div class="row" style="gap:12px;font-size:18px">${ic(c.road, '🛣️', '도로')}${ic(c.hwy, '🚘', '고속도로')}${ic(c.rail, '🚆', '철도')}${ic(c.power, '⚡', '송전선')}</div>`;
    for (const d of S.deals.filter(d => d.side === nb.side)) {
      const [n, u, sg] = DEAL_T[d.type];
      html += `<div class="kv"><span>${n} ${fmt(d.amt)}${u} × ₩${d.price} · ${d.left}개월 남음 ${RT.dealOk && RT.dealOk[d.id] === false ? '<b style="color:#ef5350">(연결 끊김)</b>' : ''}</span><span class="${sg > 0 ? 'pos' : 'negc'}">월 ₩${fmt(d.amt * d.price)} <button class="btn sec" style="padding:2px 6px" data-cancel="${d.id}">해지</button></span></div>`;
    }
    html += '<div class="row" style="flex-wrap:wrap;gap:6px">';
    for (const ty of Object.keys(DEAL_T)) {
      if (S.deals.some(d => d.side === nb.side && d.type === ty)) continue;
      const key = nb.side + ty, of = nbOffers[key], ok = has(c, need[ty]);
      if (of) html += `<div class="ord" style="width:100%;margin:2px 0"><div><b>${DEAL_T[ty][0]} 제안</b><small>${fmt(of.amt)}${DEAL_T[ty][1]} · 단가 ₩${of.price} → 월 ₩${fmt(of.amt * of.price)} ${DEAL_T[ty][2] > 0 ? '수입' : '지출'}</small></div><button class="btn" data-acc="${key}">수락</button><button class="btn sec" data-rej="${key}">거절</button></div>`;
      else html += `<button class="btn sec" data-ask="${key}" ${ok ? '' : 'disabled title="연결이 필요합니다"'}>${DEAL_T[ty][0]} 협상</button>`;
    }
    html += '</div>';
  }
  $('pbody').innerHTML = html;
  $('pbody').querySelectorAll('[data-ask]').forEach(b => b.onclick = () => { const k = b.dataset.ask; nbOffers[k] = dealOffer(+k[0], k.slice(1)); renderNb(); });
  $('pbody').querySelectorAll('[data-rej]').forEach(b => b.onclick = () => { delete nbOffers[b.dataset.rej]; renderNb(); });
  $('pbody').querySelectorAll('[data-acc]').forEach(b => b.onclick = () => { const of = nbOffers[b.dataset.acc]; delete nbOffers[b.dataset.acc]; S.dealSeq = (S.dealSeq || 0) + 1; of.id = S.dealSeq; S.deals.push(of); news(`🤝 ${S.nb[of.side].name}와 ${DEAL_T[of.type][0]} 계약을 맺었습니다.`, 'good'); monthlyMaps(); renderNb(); });
  $('pbody').querySelectorAll('[data-cancel]').forEach(b => b.onclick = () => { const d = S.deals.find(x => x.id === +b.dataset.cancel); if (!d) return; const fine = d.amt * d.price * 6; if (!confirm(`계약을 해지하면 위약금 ₩${fmt(fine)}을 냅니다. 해지할까요?`)) return; S.money -= fine; S.deals = S.deals.filter(x => x !== d); news(`${S.nb[d.side].name}와의 계약을 해지했습니다.`, 'warn'); refreshUI(); renderNb(); });
}
$('bNb').onclick = () => { openModal('nb', '🤝 이웃 도시'); renderNb(); };

// 신문
function renderPaper() {
  const pick = k => S.news.find(n => n.kind === k);
  const head = pick('bad') || pick('warn') || pick('good') || S.news[0] || { text: '평온한 하루' };
  const dm = S.demand, b = RT.budget || { net: 0 };
  const trend = S.hist.length > 12 ? RT.pop - S.hist[S.hist.length - 13].p : 0;
  const ed = S.approval > 75 ? '시민들은 시정에 크게 만족하고 있다. 지금의 방향을 유지하길 바란다.' : S.approval > 55 ? '대체로 무난하지만, 시민들의 불만이 조금씩 쌓이고 있다.' : S.approval > 35 ? '시청을 향한 불만이 커지고 있다. 세금과 치안부터 돌아봐야 한다.' : '민심이 폭발 직전이다. 시장은 즉시 대책을 내놓아야 한다.';
  const wx = { winter: '추운 겨울, 난방 수요로 전력 소비가 늘었습니다.', spring: '따뜻한 봄 날씨가 이어지고 있습니다.', summer: '무더운 여름, 냉방 전력 수요가 늘고 시민들이 예민해지는 시기입니다.', autumn: '선선한 가을, 단풍이 아름답습니다.' }[season()];
  const big = Object.entries(RT.secJobs || {}).sort((a, b) => b[1] - a[1])[0];
  $('pbody').innerHTML = `<div style="font-family:serif;border-bottom:3px double var(--line);text-align:center;padding-bottom:6px"><div style="font-size:26px;font-weight:bold;letter-spacing:4px">${S.name} 일보</div><small style="color:var(--muted)">${dateStr()} · 인구 ${fmt(RT.pop)} · ${cityRank(RT.pop)}</small></div>
  <h2 style="font-size:19px;margin:12px 0 6px">${head.text.replace(/^[^가-힣「]*/, '')}</h2>
  <div class="grid2">
   <div><h3>경제</h3><p style="margin:4px 0;line-height:1.5">시 재정은 월 ₩${fmt(b.net)} ${b.net >= 0 ? '흑자' : '적자'}. 실업률 ${Math.round(RT.unemp * 100)}%. ${dm.R > 0.3 ? '집을 찾는 사람이 많다.' : dm.R < -0.2 ? '빈집이 늘고 있다.' : ''} ${dm.C > 0.3 ? '상가 임대 문의가 늘었다.' : ''} ${dm.I > 0.3 ? '공장 부지가 부족하다는 목소리.' : ''}${big && big[1] ? ` 지역 최대 산업은 ${SECT[big[0]].n}.` : ''}</p></div>
   <div><h3>사회</h3><p style="margin:4px 0;line-height:1.5">지난 1년 인구 ${trend >= 0 ? '+' : ''}${fmt(trend)}명. 평균 범죄 지수 ${Math.round(RT.avgCrime)}, 기대수명 ${Math.round(S.life)}세, 교육 지수 ${Math.round(S.eq)}.${riots.length ? ' 시내에서 폭동이 이어지고 있다.' : ''}</p></div>
   <div><h3>환경</h3><p style="margin:4px 0;line-height:1.5">대기오염 ${Math.round(RT.avgPol)}, 수질 ${Math.round(RT.waterQ === undefined ? 100 : RT.waterQ)}점. ${S.garbageStock > 100 ? '거리에 쓰레기가 쌓이고 있다.' : '쓰레기 수거는 원활하다.'}</p></div>
   <div><h3>날씨</h3><p style="margin:4px 0;line-height:1.5">${wx}</p></div>
  </div>
  <h3>사설</h3><p style="margin:4px 0;line-height:1.5;font-style:italic">"${ed}" (시장 지지율 ${Math.round(S.approval)}%)</p>
  <h3>이웃 소식</h3><p style="margin:4px 0;line-height:1.5">${S.nb.map(n => `${n.name} 인구 ${fmt(n.pop)}`).join(' · ')}</p>
  <h3>지난 기사</h3><div style="max-height:150px;overflow:auto;font-size:12px">${S.news.slice(0, 20).map(n => `<div class="kv"><span>${n.date}</span><span style="text-align:right;flex:1;margin-left:8px">${n.text}</span></div>`).join('')}</div>`;
}
$('bPaper').onclick = () => { openModal('paper', '📰 신문'); renderPaper(); };

// 사업 제안·시민 청원 팝업
function showPopup() {
  const p = popups.shift(); if (!p) return;
  if (p.type === 'offer') {
    const b = BLD[p.key]; const inc = b.inc[0] + RT.pop * b.inc[1];
    const cons = { toxic: '주변 지가가 크게 떨어지고 대기·수질이 오염됩니다.', maxprison: '주변 지가가 떨어지지만 수감 공간이 크게 늘어납니다.', missile: '주변 지가가 떨어지고 시민들이 불안해합니다.', resort: '상업이 살아나지만 주변 범죄가 늘어납니다.' }[p.key];
    openModal('offer', '💼 사업 제안', `<p style="line-height:1.6">한 기업이 우리 시에 <b>${b.n}</b>을(를) 짓고 싶다고 제안했습니다.</p>
      <div class="kv"><span>예상 수입</span><b class="pos">월 약 ₩${fmt(inc)}</b></div><div class="kv"><span>부작용</span><span>${cons}</span></div><div class="kv"><span>지지율</span><span class="negc">${b.ap}%p</span></div>
      <p style="color:var(--muted);font-size:12px">수락하면 특수 메뉴에서 원하는 곳에 무료로 지을 수 있습니다.</p>
      <div class="row"><button class="btn" id="pYes">수락</button><button class="btn sec" id="pNo">거절</button></div>`);
    const no = () => { S.offer = null; S.bizCd[p.key] = 48; S.approval = Math.min(100, S.approval + 1); news(`「${b.n}」 유치 제안을 거절했습니다.`, 'info'); };
    modalOnClose = no;
    $('pYes').onclick = () => { modalOnClose = null; S.offer = null; S.biz[p.key] = 'ok'; news(`💼 「${b.n}」 유치 계약을 맺었습니다. 특수 메뉴에서 지으세요.`, 'good'); buildToolbar(); closeModal(); };
    $('pNo').onclick = () => closeModal();
  } else {
    const pt = PETS.find(x => x.k === p.key);
    if (!pt || !pt.c()) return;
    openModal('pet', '📢 시민 청원', `<p style="line-height:1.6;font-size:15px">"${pt.t}"</p><div class="kv"><span>서명</span><b>${fmt(p.n)}명</b></div>
      <p style="color:var(--muted);font-size:12px">받아들이면 지지율이 오르고, 거절하면 조금 떨어집니다.</p>
      <div class="row"><button class="btn" id="pYes">받아들이기</button><button class="btn sec" id="pNo">거절</button></div>`);
    modalOnClose = () => { S.approval = Math.max(0, S.approval - 2); news('시민 청원을 거절했습니다.', 'info'); };
    $('pYes').onclick = () => { modalOnClose = null; pt.a(); S.approval = Math.min(100, S.approval + 4); news('📢 시민 청원을 받아들였습니다.', 'good'); computeCoverage(); closeModal(); refreshUI(); };
    $('pNo').onclick = () => closeModal();
  }
}

// 지도 보기
function buildOverlays() {
  const l = $('ovList'); l.innerHTML = '';
  for (const [k, n] of OVERLAYS) { const b = document.createElement('button'); b.textContent = n; b.className = overlay === k ? 'on' : ''; b.onclick = () => { setOverlay(k); l.classList.add('hidden'); }; l.appendChild(b); }
}
function setOverlay(k) {
  overlay = k; const n = OVERLAYS.find(o => o[0] === k)[1]; $('ovBtn').textContent = '🗺️ 지도: ' + n; buildOverlays();
  const lg = $('legend');
  if (k === 'none') lg.classList.add('hidden');
  else { lg.classList.remove('hidden'); lg.innerHTML = ({ lv: '지가: 초록=높음 · 빨강=낮음', wpol: '수질 오염 (강·호수·지하수)', height: '높이: 초록=낮음 → 보라=높음', commute: '통근: 초록=일자리 연결됨 · 빨강=도로망에 일자리 없음', pol: '오염도', crime: '범죄율', traffic: '도로 혼잡도', power: '노랑=전기 있음 · 빨강=없음', water: '파랑=급수 · 빨강=없음', police: '파랑이 진할수록 강함', fire: '파랑이 진할수록 강함', health: '파랑이 진할수록 강함', edu: '파랑이 진할수록 강함' })[k] + (['pol', 'crime', 'traffic'].includes(k) ? '<div class="grad"></div><small>낮음 → 높음</small>' : k === 'lv' ? '<div class="grad" style="transform:scaleX(-1)"></div>' : ''); }
}
$('ovBtn').onclick = () => { $('ovList').classList.toggle('hidden'); buildOverlays(); };

// 메뉴
$('bMenu').onclick = () => {
  openModal('menu', '☰ 메뉴', `
  <div class="row"><button class="btn" id="mSave">💾 저장</button><button class="btn sec" id="mLoad">📂 불러오기</button><button class="btn sec" id="mNew">🆕 새 도시</button></div>
  <div class="row"><button class="btn sec" id="mExport">⬇️ 파일로 내보내기</button><label class="btn sec" style="cursor:pointer">⬆️ 파일 불러오기<input type="file" id="mImport" accept=".json" class="hidden"></label></div>
  <h3>설정</h3>
  <label class="ord"><input type="checkbox" id="mDis" ${S.disasters ? 'checked' : ''}><div><b>무작위 재해</b><small>화재·지진·토네이도가 가끔 발생합니다</small></div></label>
  <label class="ord"><input type="checkbox" id="mSnd" ${soundOn ? 'checked' : ''}><div><b>효과음</b></div></label>
  <label class="ord"><input type="checkbox" id="mDay" ${dayNight ? 'checked' : ''}><div><b>낮과 밤</b><small>시간이 흐르면 밤이 되고 불빛이 켜집니다</small></div></label>
  <div class="row"><label>도시 이름</label><input type="text" id="mName" value="${S.name.replace(/"/g, '&quot;')}"></div>
  <h3>도움말</h3>
  <div class="help">
   <p><b>1. 전기</b> — ⚡ 메뉴에서 발전소를 짓고 송전선으로 구역까지 연결하세요. 구역 타일끼리는 전기가 서로 통합니다.</p>
   <p><b>2. 구역</b> — 🏘️ 메뉴에서 주거(R)·상업(C)·공업(I) 구역을 드래그로 지정하세요. 상단 RCI 막대가 수요입니다.</p>
   <p><b>3. 도로</b> — 구역은 3칸 이내에 도로가 있어야 개발됩니다. 혼잡하면 대로나 버스정류장을 쓰세요.</p>
   <p><b>4. 수도</b> — 양수장/급수탑을 도로 옆에 지으면 도로를 따라 물이 공급됩니다. 물이 없으면 건물이 2단계까지만 자랍니다.</p>
   <p><b>5. 서비스</b> — 경찰·소방·병원·학교는 범위 안의 지가와 선호도를 올립니다. 지가가 높아야 고층 건물이 들어섭니다.</p>
   <p><b>6. 예산</b> — 세금이 너무 높으면 시민이 떠납니다. 쓰레기 처리, 오염, 범죄, 교통도 관리하세요.</p>
   <p><b>조작</b> — 🔍 도구로 드래그하면 이동, 클릭하면 정보. 휠/두 손가락으로 확대·축소. 우클릭 드래그로 언제든 이동. 단축키: P 일시정지, B 불도저, R 도로, Esc 조회.</p>
  </div>`);
  $('mSave').onclick = () => { save('metro_save'); news('💾 도시를 저장했습니다.', 'good'); closeModal(); };
  $('mLoad').onclick = () => { if (load('metro_save') || load('metro_autosave')) { news('📂 도시를 불러왔습니다.', 'good'); closeModal(); } else alert('저장된 도시가 없습니다.'); };
  $('mNew').onclick = () => showNewGame();
  $('mDis').onchange = e => S.disasters = e.target.checked;
  $('mSnd').onchange = e => soundOn = e.target.checked;
  $('mDay').onchange = e => dayNight = e.target.checked;
  $('mName').onchange = e => { S.name = e.target.value || '새 도시'; refreshUI(); };
  $('mExport').onclick = () => { const blob = new Blob([serialize()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (S.name || 'city') + '.json'; a.click(); };
  $('mImport').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(txt => { if (deserialize(txt)) { news('📂 파일에서 도시를 불러왔습니다.', 'good'); closeModal(); } else alert('파일을 읽을 수 없습니다.'); }); };
};

/* ---------------- 저장 ---------------- */
const TKEYS = ['ter', 'tree', 'k', 'z', 'd', 'lvl', 'occ', 'hi', 'ab', 'b', 'o', 'pl', 'burn', 'rub', 'v', 'age', 'np', 'h', 'sec', 'rl'];
function serialize() { const o = Object.assign({}, S); o.tiles = T.map(t => TKEYS.map(k => t[k])); return JSON.stringify(o); }
function deserialize(txt) {
  try {
    const o = JSON.parse(txt); if (!o || !o.tiles) return false;
    const w = o.W || 64; if (o.tiles.length !== w * w) return false;
    setSize(w); o.W = w; o.unlocked = o.unlocked || {};
    o.tiles = o.tiles.map(a => { const t = newTile(); TKEYS.forEach((k, j) => { if (a[j] !== undefined && a[j] !== null) t[k] = a[j]; }); if (t.ter === 1) t.h = 0; return t; });
    o.nb = o.nb || NB_NAMES.map((n, k) => ({ name: n, side: k, pop: 50000 })); o.deals = o.deals || []; o.inmates = o.inmates || 0;
    o.secTax = o.secTax || Object.fromEntries(SECKEYS.map(k => [k, 0])); o.biz = o.biz || {}; o.bizCd = o.bizCd || {}; o.petCd = o.petCd || {}; o.offer = null;
    flood = null; floodSet = null; meteor = null; riots = []; popups.length = 0;
    S = o; T = S.tiles; tornado = null; calcWaterProx();
    for (let i = 0; i < N; i++) M.lv[i] = 50 + M.waterProx[i] * 40;
    for (let k = 0; k < 3; k++) monthly(true);
    centerCamera(W / 2, H / 2); buildToolbar(); refreshUI(); miniDirty = true;
    return true;
  } catch (e) { console.error(e); return false; }
}
function save(key) { try { localStorage.setItem(key, serialize()); return true; } catch (e) { return false; } }
function load(key) { try { const s = localStorage.getItem(key); return s ? deserialize(s) : false; } catch (e) { return false; } }
function autosave() { save('metro_autosave'); }

/* ---------------- 새 게임 ---------------- */
function showNewGame() {
  let hasSave = false; try { hasSave = !!(localStorage.getItem('metro_save') || localStorage.getItem('metro_autosave')); } catch (e) { }
  openModal('newgame', '🏙️ 메트로 플래너 — 새 도시', `
   <p style="margin-top:0;color:var(--muted)">빈 땅에 나만의 도시를 설계하세요. 전력·수도·교통·치안·교육·환경·재정을 관리해 대도시로 키우는 시뮬레이션입니다.</p>
   <div class="row"><label>도시 이름</label><input type="text" id="ngName" value="푸른시"></div>
   <div class="row"><label>지도 번호</label><input type="text" id="ngSeed" value="${(Math.random() * 99999) | 0}" style="width:110px;flex:0 0 auto"><button class="btn sec" id="ngRand">🎲</button></div>
   <div class="row"><label>물</label><select id="ngWater"><option value="0">없음</option><option value="1">적음</option><option value="2" selected>보통</option><option value="3">많음</option></select></div>
   <div class="row"><label>지형</label><select id="ngHills"><option value="0">평지</option><option value="1">구릉</option><option value="2" selected>언덕</option><option value="3">산악</option></select></div>
   <div class="row"><label>숲</label><select id="ngTrees"><option value="0">없음</option><option value="1">적음</option><option value="2" selected>보통</option><option value="3">많음</option></select></div>
   <div class="row"><label>지도 크기</label><select id="ngSize"><option value="64">작음 64×64</option><option value="96">보통 96×96</option><option value="128" selected>큼 128×128 (천만 도전)</option></select></div>
   <div class="row"><label>난이도</label><select id="ngDiff"><option value="50000">쉬움 (₩50,000)</option><option value="20000" selected>보통 (₩20,000)</option><option value="10000">어려움 (₩10,000)</option></select></div>
   <label class="ord"><input type="checkbox" id="ngDis" checked><div><b>무작위 재해</b><small>끄면 직접 일으킬 때만 발생</small></div></label>
   <div class="row" style="margin-top:12px"><button class="btn" id="ngGo">도시 세우기</button>${hasSave ? '<button class="btn sec" id="ngCont">이어하기</button>' : ''}</div>`);
  $('ngRand').onclick = () => $('ngSeed').value = (Math.random() * 99999) | 0;
  $('ngGo').onclick = () => {
    const seed = parseInt($('ngSeed').value, 10) || 1;
    modalOpen = null; $('modal').classList.add('hidden');
    newGame({ size: +$('ngSize').value, name: $('ngName').value.trim() || '새 도시', seed, water: +$('ngWater').value, trees: +$('ngTrees').value, hills: +$('ngHills').value, money: +$('ngDiff').value, disasters: $('ngDis').checked });
    buildToolbar(); selectTool('inspect'); setSpeed(2);
  };
  if (hasSave) $('ngCont').onclick = () => { modalOpen = null; $('modal').classList.add('hidden'); if (!(load('metro_save') || load('metro_autosave'))) showNewGame(); };
}

/* ---------------- 메인 루프 ---------------- */
let last = performance.now(), miniT = 0;
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.25); last = now;
  if (S) { tick(dt); panKeys(dt); if (speed && !modalOpen) tod = (tod + dt / 180) % 1; }
  nightK = dayNight && S ? clamp(-Math.cos(tod * Math.PI * 2) * 0.8 - 0.15, 0, 0.6) : 0;   // tod 0 = 정오, 0.5 = 자정
  if (S && !modalOpen && popups.length) showPopup();
  render(now);
  miniT += dt; if (S && (miniT > 0.5 || miniDirty)) { drawMini(); miniT = 0; miniDirty = false; }
  requestAnimationFrame(loop);
}
addEventListener('resize', () => { resize(); });
resize();
buildToolbar();
setOverlay('none');
showNewGame();
requestAnimationFrame(loop);
window.__game = { get S() { return S; }, RT, M, computePower, conducts, canPlace: canPlaceBld, forcePopup: (type, key) => popups.push({ type, key, n: 123 }), clearPopups: () => { popups.length = 0; if (modalOpen) { modalOnClose = null; closeModal(); } }, setTod: v => { tod = v; }, refresh: () => refreshUI(), applyTool, monthly, lineTiles, rectTiles, newGame, setSpeed, idx, T: () => T, selectTool, placeOrigin, save, load, serialize, deserialize };
