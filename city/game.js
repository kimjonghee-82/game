'use strict';
/* =========================================================================
   메트로 플래너 — 독창적인 도시 건설 시뮬레이션
   ========================================================================= */
const W = 64, H = 64, N = W * H;
const TW = 64, TH = 32;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = Math.random;
const idx = (x, y) => y * W + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const fmt = n => Math.round(n).toLocaleString('ko-KR');

/* ---------------- 정의 ---------------- */
const OCC = { R: [0, 6, 16, 40, 90, 180, 320], C: [0, 4, 10, 26, 55, 110, 200], I: [0, 8, 16, 32, 60, 110, 180] };
const MAXLV = [0, 2, 4, 6];
const LVGATE = [0, 0, 0, 50, 75, 105, 135];
const ZCOL = { R: '#4caf50', C: '#2196f3', I: '#ffc107' };
const ZNAME = { R: '주거', C: '상업', I: '공업' };
const DNAME = ['', '저밀도', '중밀도', '고밀도'];

const BLD = {
  police:   { n: '경찰서', sz: 2, cost: 500, mt: 25, dept: 'police', r: 12, use: 3, col: '#4a6fb5', h: 22, ico: '🚓', d: '범죄 감소' },
  fire:     { n: '소방서', sz: 2, cost: 500, mt: 25, dept: 'fire', r: 12, use: 3, col: '#c0392b', h: 22, ico: '🚒', d: '화재 예방·진압' },
  hospital: { n: '병원', sz: 2, cost: 900, mt: 40, dept: 'health', r: 14, use: 4, col: '#e8eef0', h: 34, ico: '🏥', d: '기대수명·주거 선호 상승' },
  school:   { n: '학교', sz: 2, cost: 600, mt: 30, dept: 'edu', r: 10, use: 3, col: '#d4a373', h: 18, ico: '🏫', d: '교육 수준 상승' },
  univ:     { n: '대학교', sz: 3, cost: 3000, mt: 80, dept: 'edu', r: 20, use: 6, col: '#a0522d', h: 30, ico: '🎓', w: 1.4, d: '넓은 범위 교육, 첨단산업 유치' },
  library:  { n: '도서관', sz: 1, cost: 400, mt: 15, dept: 'edu', r: 8, use: 1, col: '#8e7cc3', h: 16, ico: '📚', w: 0.6, d: '소규모 교육 시설' },
  park:     { n: '소공원', sz: 1, cost: 60, mt: 1, dept: 'rec', park: 30, pr: 4, flat: 'park', d: '지가 상승, 오염 감소' },
  bigpark:  { n: '대공원', sz: 2, cost: 350, mt: 5, dept: 'rec', park: 45, pr: 7, flat: 'park', d: '넓은 범위 지가 상승' },
  plaza:    { n: '분수광장', sz: 1, cost: 180, mt: 3, dept: 'rec', park: 40, pr: 4, flat: 'plaza', d: '상업지 선호 상승' },
  bus:      { n: '버스정류장', sz: 1, cost: 120, mt: 4, dept: 'trans', bus: 7, flat: 'bus', d: '주변 교통량 35% 감소' },
  coal:     { n: '석탄발전소', sz: 2, cost: 4000, mt: 30, dept: 'power', mw: 400, pol: 70, life: 50, col: '#6d4c41', h: 24, chim: 2, d: '400MW · 오염 심함' },
  gas:      { n: '가스발전소', sz: 2, cost: 6000, mt: 40, dept: 'power', mw: 260, pol: 25, life: 50, col: '#90a4ae', h: 22, ico: '🔥', d: '260MW · 오염 보통' },
  nuke:     { n: '원자력발전소', sz: 3, cost: 16000, mt: 90, dept: 'power', mw: 1400, pol: 4, life: 50, col: '#cfd8dc', h: 30, nuke: 1, d: '1400MW · 노후 시 사고 위험' },
  wind:     { n: '풍력발전기', sz: 1, cost: 250, mt: 2, dept: 'power', mw: 18, pol: 0, life: 40, wind: 1, d: '18MW · 친환경' },
  solar:    { n: '태양광발전소', sz: 2, cost: 1500, mt: 8, dept: 'power', mw: 70, pol: 0, life: 40, solar: 1, d: '70MW · 친환경' },
  pump:     { n: '양수장', sz: 1, cost: 400, mt: 8, dept: 'water', wcap: 120, wcapW: 450, use: 4, col: '#5dade2', h: 12, ico: '💧', d: '물가에 지으면 450, 내륙 120 · 도로와 연결' },
  tower:    { n: '급수탑', sz: 1, cost: 250, mt: 5, dept: 'water', wcap: 160, use: 1, wtower: 1, d: '급수 160 · 도로와 연결' },
  landfill: { n: '매립지', sz: 2, cost: 300, mt: 6, dept: 'waste', fill: 30000, pol: 18, flat: 'landfill', d: '쓰레기 30,000t 매립' },
  incin:    { n: '소각장', sz: 2, cost: 3000, mt: 30, dept: 'waste', burn: 500, mw: 40, pol: 35, col: '#795548', h: 22, chim: 1, ico: '♨️', d: '월 500t 소각 · 40MW 발전' },
  recycle:  { n: '재활용센터', sz: 1, cost: 800, mt: 15, dept: 'waste', recyc: 1, use: 2, col: '#27ae60', h: 14, ico: '♻️', d: '쓰레기 발생 15% 감소(최대 45%)' },
  port:     { n: '항구', sz: 3, cost: 5000, mt: 40, dept: 'special', use: 6, col: '#5d6d7e', h: 14, ico: '⚓', needWater: 1, pol: 15, d: '공업 수요 증가 · 물가에 건설' },
  airport:  { n: '공항', sz: 4, cost: 12000, mt: 80, dept: 'special', use: 10, flat: 'airport', pol: 20, d: '상업 수요 증가' },
  mansion:  { n: '시장 관저', sz: 2, cost: 0, mt: 0, dept: 'special', reward: 2000, lvb: 40, lr: 8, col: '#f5deb3', h: 18, ico: '🏡', d: '보상: 인구 2,000' },
  cityhall: { n: '시청', sz: 2, cost: 0, mt: 10, dept: 'special', reward: 10000, lvb: 30, lr: 10, col: '#f2f2f2', h: 30, ico: '🏛️', d: '보상: 인구 10,000 · 지지율 상승' },
  statue:   { n: '기념 동상', sz: 1, cost: 0, mt: 0, dept: 'special', reward: 20000, lvb: 25, lr: 7, col: '#b0bec5', h: 22, ico: '🗿', d: '보상: 인구 20,000' },
  stadium:  { n: '경기장', sz: 3, cost: 0, mt: 20, dept: 'special', reward: 40000, lvb: 15, lr: 10, col: '#9e9e9e', h: 16, ico: '🏟️', d: '보상: 인구 40,000 · 상업 수요 증가' },
  landmark: { n: '랜드마크 타워', sz: 2, cost: 0, mt: 30, dept: 'special', reward: 80000, lvb: 50, lr: 14, col: '#b3e5fc', h: 110, ico: '🗼', d: '보상: 인구 80,000' },
};

const TOOLS = {
  inspect:  { n: '조회 / 이동', ico: '🔍', type: 'inspect', d: '드래그로 화면 이동, 클릭으로 정보 보기' },
  bulldoze: { n: '불도저', ico: '🚜', type: 'rect', cost: 1, d: '건물·도로·나무 철거' },
  road:     { n: '도로', ico: '🛣️', type: 'line', cost: 10, d: '물 위에 지으면 다리(60)' },
  avenue:   { n: '대로', ico: '🛤️', type: 'line', cost: 25, d: '교통 용량 3배' },
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
};
for (const k in BLD) {
  const b = BLD[k];
  TOOLS[k] = { n: b.n, ico: b.ico || ({ park: '🌳', bigpark: '🌲', plaza: '⛲', bus: '🚌', coal: '🏭', nuke: '☢️', wind: '🌬️', solar: '☀️', tower: '🗼', landfill: '🗑️', airport: '✈️' }[k] || '🏗️'), type: 'place', bld: k, cost: b.cost, d: b.d };
}
TOOLS.tower.ico = '🚰';

const CATS = [
  { ico: '🔍', n: '기본', tools: ['inspect', 'bulldoze', 'tree'] },
  { ico: '🛣️', n: '교통', tools: ['road', 'avenue', 'bus'] },
  { ico: '🏘️', n: '구역', tools: ['R1', 'R2', 'R3', 'C1', 'C2', 'C3', 'I1', 'I2', 'I3', 'dezone'] },
  { ico: '⚡', n: '전력', tools: ['powerline', 'coal', 'gas', 'nuke', 'wind', 'solar'] },
  { ico: '💧', n: '수도', tools: ['pump', 'tower'] },
  { ico: '🏛️', n: '공공', tools: ['police', 'fire', 'hospital', 'school', 'univ', 'library'] },
  { ico: '🌳', n: '여가', tools: ['park', 'bigpark', 'plaza'] },
  { ico: '🗑️', n: '쓰레기', tools: ['landfill', 'incin', 'recycle'] },
  { ico: '⭐', n: '특수', tools: ['port', 'airport', 'mansion', 'cityhall', 'statue', 'stadium', 'landmark'] },
  { ico: '🌪️', n: '재해', tools: ['d_fire', 'd_quake', 'd_tornado'] },
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
  ['power', '전력'], ['water', '수도'], ['police', '치안 범위'], ['fire', '소방 범위'], ['health', '의료 범위'], ['edu', '교육 범위'],
];

/* ---------------- 상태 ---------------- */
let S = null;    // 저장되는 게임 상태
let T = null;    // 타일 배열 (S.tiles)
const M = {      // 매달 다시 계산하는 지도
  lv: new Float32Array(N), pol: new Float32Array(N), crime: new Float32Array(N), traffic: new Float32Array(N),
  cong: new Float32Array(N), noise: new Float32Array(N), police: new Float32Array(N), fire: new Float32Array(N),
  health: new Float32Array(N), edu: new Float32Array(N), park: new Float32Array(N), bus: new Float32Array(N),
  bonus: new Float32Array(N), roadDist: new Uint8Array(N), waterProx: new Float32Array(N), trees: new Float32Array(N),
};
const RT = { pop: 0, cJobs: 0, iJobs: 0, unemp: 0, powerCap: 0, powerUse: 0, waterCap: 0, waterUse: 0, garbage: 0, garbageDone: 0, avgCong: 0, avgPol: 0, avgCrime: 0, budget: null };
let tornado = null;
let speed = 2;
const SPEED_DAYS = [0, 3, 8, 24];

function newTile() { return { ter: 0, tree: 0, k: '', z: '', d: 0, lvl: 0, occ: 0, hi: 0, ab: 0, b: '', o: -1, pl: 0, burn: 0, rub: 0, v: (rnd() * 4) | 0, age: 0, np: 0, pw: 0, wt: 0 }; }

/* ---------------- 지형 생성 ---------------- */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function genMap(seed, waterAmt, treeAmt) {
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
  for (let y = 26; y < 38; y++) for (let x = 26; x < 38; x++) { const t = tiles[idx(x, y)]; if (t.ter === 1 && waterAmt < 3) t.ter = 0; }
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
  S = {
    ver: 1, name: opts.name || '새 도시', seed: opts.seed, year: 2000, month: 0, day: 0,
    money: opts.money, tiles: genMap(opts.seed, opts.water, opts.trees),
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
function isRoad(t) { return t.k === 'road' || t.k === 'avenue'; }
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
  for (let i = 0; i < N; i++) if (isRoad(T[i])) { d[i] = 0; q.push(i); }
  let h = 0;
  while (h < q.length) {
    const i = q[h++], x = i % W, y = (i / W) | 0; if (d[i] >= 4) continue;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (!inb(nx, ny)) continue; const j = idx(nx, ny); if (d[j] === 255) { d[j] = d[i] + 1; q.push(j); }
    }
  }
}
function powerUse(t, i) {
  if (t.k === 'zone') return t.lvl > 0 && !t.ab ? (1 + t.lvl) * (S.ord.energy ? 0.85 : 1) : 0;
  if (t.k === 'bld' && t.o === i) return BLD[t.b].use || 0;
  return 0;
}
function plantMW(t) {
  const b = BLD[t.b]; if (!b.mw) return 0;
  const age = S.year - t.age; let f = 1; if (b.life && age > b.life - 5) f = 0.75;
  if (b.wind) f *= 0.7 + 0.3 * Math.sin(S.totalMonths * 0.7 + t.v);
  return b.mw * f;
}
function computePower() {
  for (let i = 0; i < N; i++) T[i].pw = 0;
  const comp = new Int32Array(N).fill(-1);
  let cap = 0, use = 0, cid = 0;
  const plants = []; eachBld((i, t, b) => { if (b.mw) plants.push(i); });
  for (const p of plants) {
    if (comp[p] >= 0) continue;
    const q = []; for (const j of footprint(p)) { comp[j] = cid; q.push(j); }
    let h = 0, capacity = 0; const order = [];
    while (h < q.length) {
      const i = q[h++], t = T[i]; order.push(i);
      if (t.k === 'bld' && t.o === i && BLD[t.b].mw) capacity += plantMW(t);
      const x = i % W, y = (i / W) | 0;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (!inb(nx, ny)) continue; const j = idx(nx, ny);
        if (comp[j] < 0 && conducts(T[j]) && !T[j].burn) { comp[j] = cid; q.push(j); }
      }
    }
    cap += capacity; let remain = capacity;
    // 발전소 타일은 항상 전력 공급
    for (const i of order) { const t = T[i]; if (t.k === 'bld' && BLD[t.b].mw) t.pw = 1; }
    for (const i of order) {
      const t = T[i]; if (t.pw) continue;
      const u = powerUse(t, i); use += u;
      if (u <= remain) { remain -= u; t.pw = 1; }
    }
    cid++;
  }
  // 다중 타일 건물: 원점 전력 상태를 전체에 반영
  eachBld((i, t) => { const p = t.pw; for (const j of footprint(i)) T[j].pw = p; });
  RT.powerCap = cap; RT.powerUse = use;
}
function computeWater() {
  for (let i = 0; i < N; i++) T[i].wt = 0;
  const comp = new Int32Array(N).fill(-1); const caps = [];
  let total = 0, used = 0;
  eachBld((i, t, b) => {
    if (!b.wcap || !t.pw) return;
    let cap = b.wcap;
    if (b.wcapW) { const fp = footprint(i); let nearW = false; for (const j of fp) { const x = j % W, y = (j / W) | 0; for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) if (inb(nx, ny) && T[idx(nx, ny)].ter === 1 && !isRoad(T[idx(nx, ny)])) nearW = true; } if (nearW) cap = b.wcapW; }
    total += cap;
    // 인접 도로 찾기
    const x0 = i % W, y0 = (i / W) | 0, sz = b.sz; let start = -1;
    for (let y = y0 - 1; y <= y0 + sz && start < 0; y++) for (let x = x0 - 1; x <= x0 + sz; x++) { if (inb(x, y) && isRoad(T[idx(x, y)])) { start = idx(x, y); break; } }
    if (start < 0) return;
    let c = comp[start];
    if (c < 0) {
      c = caps.length; caps.push(0); const q = [start]; comp[start] = c; let h = 0;
      while (h < q.length) {
        const k = q[h++], x = k % W, y = (k / W) | 0;
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) { if (!inb(nx, ny)) continue; const j = idx(nx, ny); if (comp[j] < 0 && isRoad(T[j])) { comp[j] = c; q.push(j); } }
      }
    }
    caps[c] += cap;
  });
  // 소비자 배분
  for (let i = 0; i < N; i++) {
    const t = T[i];
    let u = 0;
    if (t.k === 'zone') u = t.lvl > 0 && !t.ab ? t.lvl : 0.0001; else if (t.k === 'bld' && t.o === i && !BLD[t.b].wcap && !BLD[t.b].flat) u = 1; else continue;
    if (M.roadDist[i] > 2) continue;
    const x = i % W, y = (i / W) | 0; let got = false;
    for (let oy = -2; oy <= 2 && !got; oy++) for (let ox = -2; ox <= 2; ox++) {
      const nx = x + ox, ny = y + oy; if (!inb(nx, ny)) continue; const c = comp[idx(nx, ny)];
      if (c >= 0 && caps[c] >= u) { caps[c] -= u; used += u; t.wt = 1; got = true; break; }
    }
  }
  eachBld((i, t) => { const w = t.wt || BLD[t.b].wcap; for (const j of footprint(i)) T[j].wt = w ? 1 : 0; });
  RT.waterCap = total; RT.waterUse = used;
}
function computeCoverage() {
  for (const k of ['police', 'fire', 'health', 'edu', 'park', 'bus', 'bonus']) M[k].fill(0);
  eachBld((i, t, b) => {
    const [cx, cy] = bldCenter(i);
    if (b.park) stamp(M.park, cx, cy, b.pr, b.park, 'add');
    if (b.bus) stamp(M.bus, cx, cy, b.bus, 100, 'max');
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
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y), t = T[i];
    let trips = 0;
    if (t.k === 'zone' && t.lvl > 0 && !t.ab) trips = t.occ * (t.z === 'R' ? 0.35 : t.z === 'C' ? 0.5 : 0.4);
    else if (t.k === 'bld' && t.o === i) trips = (BLD[t.b].use || 0) * 3;
    if (!trips) continue;
    trips *= (1 - 0.35 * M.bus[i] / 100) * carF;
    const roads = [];
    for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) { const nx = x + ox, ny = y + oy; if (inb(nx, ny) && isRoad(T[idx(nx, ny)])) roads.push(idx(nx, ny)); }
    if (!roads.length) continue;
    const per = trips / roads.length; for (const j of roads) M.traffic[j] += per;
  }
  const capF = clamp(S.fund.trans / 100, 0.3, 1.1);
  let sum = 0, cnt = 0;
  M.cong.fill(0);
  for (let i = 0; i < N; i++) { const t = T[i]; if (!isRoad(t)) continue; const cap = (t.k === 'avenue' ? 210 : 70) * capF; M.cong[i] = M.traffic[i] / cap; sum += Math.min(M.cong[i], 2); cnt++; }
  RT.avgCong = cnt ? sum / cnt : 0;
  M.noise.fill(0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let m = 0; for (const [nx, ny] of [[x, y], [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) if (inb(nx, ny)) m = Math.max(m, M.cong[idx(nx, ny)]);
    M.noise[idx(x, y)] = Math.min(m, 2);
  }
}
function computePollution() {
  const p = M.pol; p.fill(0);
  const iF = S.ord.antipol ? 0.6 : 1;
  for (let i = 0; i < N; i++) {
    const t = T[i];
    if (t.k === 'zone' && t.z === 'I' && t.lvl > 0 && !t.ab) p[i] += t.occ * (t.hi ? 0.12 : 0.55) * iF;
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
      c[i] = 12 + t.occ * 0.14 + RT.unemp * 90 + extra - M.lv[i] * 0.08 + (t.ab ? 30 : 0);
    } else if (t.k === 'zone') c[i] = 5;
  }
  blur(c, 1, 0.6);
  let s = 0, n = 0;
  for (let i = 0; i < N; i++) { c[i] = clamp(c[i] - M.police[i] * 0.75, 0, 100); if (T[i].k === 'zone' && T[i].lvl) { s += c[i]; n++; } }
  RT.avgCrime = n ? s / n : 0;
}
function computeLandValue() {
  // 나무 밀도
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let n = 0; for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) { const nx = x + ox, ny = y + oy; if (inb(nx, ny) && T[idx(nx, ny)].tree) n++; }
    M.trees[idx(x, y)] = n;
  }
  const beauty = S.ord.beauty ? 10 : 0;
  for (let i = 0; i < N; i++) {
    const v = 45 + M.waterProx[i] * 45 + Math.min(M.trees[i], 8) * 3 + M.park[i] * 0.6 + M.bonus[i]
      + (M.police[i] + M.health[i]) * 0.08 + Math.min(M.edu[i], 100) * 0.1 + beauty
      - M.pol[i] * 0.8 - M.crime[i] * 0.45 - M.noise[i] * 12;
    M.lv[i] = M.lv[i] * 0.5 + clamp(v, 0, 250) * 0.5;
  }
}
function computeTotals() {
  let pop = 0, cj = 0, ij = 0;
  for (let i = 0; i < N; i++) {
    const t = T[i]; if (t.k !== 'zone' || t.ab) continue;
    if (t.z === 'R') pop += t.occ; else if (t.z === 'C') cj += t.occ; else ij += t.occ;
  }
  RT.pop = pop; RT.cJobs = cj; RT.iJobs = ij;
  const wf = pop * 0.45; RT.unemp = wf > 50 ? clamp((wf - cj - ij) / wf, 0, 1) : 0;
}
function hasBld(key) { let f = false; eachBld((i, t) => { if (t.b === key && t.pw) f = true; }); return f; }
function computeDemand() {
  const pop = RT.pop, cj = RT.cJobs, ij = RT.iJobs, wf = pop * 0.45, jobs = cj + ij;
  const port = hasBld('port'), air = hasBld('airport'), stad = hasBld('stadium');
  let rD = (jobs - wf + 60 + pop * 0.04) / Math.max(80, wf);
  rD += -(S.tax.R - 9) * 0.06 + (S.eq - 50) / 600 + (S.life - 65) / 500 - Math.min(S.garbageStock / 20000, 0.3) - RT.avgPol / 400 - RT.avgCrime / 400;
  const cT = pop * 0.22 * (S.ord.tourism ? 1.15 : 1) * (air ? 1.2 : 1) * (stad ? 1.1 : 1) + 10;
  let cD = (cT - cj) / Math.max(40, cT) - (S.tax.C - 9) * 0.06 - RT.avgCong * 0.1;
  const iT = pop * 0.28 * (port ? 1.25 : 1) + 50 + (port ? 80 : 0);
  let iD = (iT - ij) / Math.max(50, iT) - (S.tax.I - 9) * 0.06 - (S.ord.antipol ? 0.1 : 0);
  if (RT.powerUse > RT.powerCap * 1.02 && RT.powerCap > 0) { rD -= 0.1; cD -= 0.1; iD -= 0.15; }
  S.demand.R = S.demand.R * 0.6 + clamp(rD, -1, 1) * 0.4;
  S.demand.C = S.demand.C * 0.6 + clamp(cD, -1, 1) * 0.4;
  S.demand.I = S.demand.I * 0.6 + clamp(iD, -1, 1) * 0.4;
}
function desirability(i, t) {
  const lv = M.lv[i], pol = M.pol[i], cr = M.crime[i], noise = M.noise[i];
  if (t.z === 'R') return (lv - 80) / 140 - pol / 110 - cr / 140 - noise * 0.12 + M.health[i] * 0.0015 + Math.min(M.edu[i], 100) * 0.0015 + M.park[i] * 0.004 - (S.tax.R - 9) * 0.03;
  if (t.z === 'C') return (lv - 60) / 150 - cr / 150 + Math.min(M.noise[i], 1) * 0.12 - Math.max(0, M.noise[i] - 1.3) * 0.2 + M.park[i] * 0.002 - (S.tax.C - 9) * 0.03;
  return 0.15 - (S.tax.I - 9) * 0.03 - cr / 300 + (M.waterProx[i] > 0 ? 0.05 : 0);
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
    if (t.ab) { if (g > 0.05 && rnd() < 0.15) { t.ab = 0; t.occ = OCC[t.z][t.lvl]; } continue; }
    let cap = MAXLV[t.d]; if (!t.wt) cap = Math.min(cap, 2);
    if (g > 0 && t.lvl < cap && rnd() < g * 0.3) {
      const nl = t.lvl + 1;
      let ok = true;
      if (t.z !== 'I' && M.lv[i] < LVGATE[nl]) ok = false;
      if (t.z === 'I' && nl >= 5 && S.eq < (nl === 5 ? 55 : 75)) ok = false;
      if (ok) {
        t.lvl = nl; t.occ = OCC[t.z][nl]; t.v = (rnd() * 4) | 0;
        if (t.z === 'I') t.hi = rnd() < (S.eq - 55) / 70 ? 1 : 0;
      }
    } else if (g < -0.25 && t.lvl > 0 && rnd() < -g * 0.12) {
      if (g < -0.6 && rnd() < 0.3) { t.ab = 1; t.occ = 0; }
      else { t.lvl--; t.occ = OCC[t.z][t.lvl]; }
    } else if (t.lvl > 0) t.occ = OCC[t.z][t.lvl];
  }
}
function processGarbage() {
  let recyc = 0, burnCap = 0;
  eachBld((i, t, b) => { if (b.recyc && t.pw) recyc++; if (b.burn && t.pw) burnCap += b.burn; });
  const factor = (1 - Math.min(recyc * 0.15, 0.45)) * (S.ord.recycleO ? 0.8 : 1);
  const produced = (RT.pop * 0.012 + (RT.cJobs + RT.iJobs) * 0.014) * factor;
  let left = produced + S.garbageStock * 0.5;
  S.garbageStock *= 0.5;
  const burned = Math.min(left, burnCap); left -= burned;
  for (const k in S.fills) {
    if (left <= 0) break;
    const take = Math.min(left, S.fills[k]); S.fills[k] -= take; left -= take;
    if (S.fills[k] <= 0) { S.fills[k] = 0; }
  }
  S.garbageStock += left;
  RT.garbage = produced; RT.garbageDone = produced - left;
  RT.landfillLeft = Object.values(S.fills).reduce((a, b) => a + b, 0);
}
function budgetMonth(apply) {
  const b = { inc: {}, exp: {} };
  b.inc['주거세'] = RT.pop * S.tax.R * 0.0065;
  b.inc['상업세'] = RT.cJobs * S.tax.C * 0.009;
  b.inc['공업세'] = RT.iJobs * S.tax.I * 0.009;
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
  S.life += (55 + hT * 0.25 + (S.ord.clinic ? 6 : 0) - RT.avgPol * 0.12 - S.life) * 0.05;
  const avgTax = (S.tax.R + S.tax.C + S.tax.I) / 3;
  let ap = 78 - (avgTax - 9) * 4 - RT.avgCrime * 0.35 - RT.avgPol * 0.25 - RT.unemp * 60 - Math.max(0, RT.avgCong - 0.6) * 20
    - Math.min(S.garbageStock / 300, 20) + (S.eq - 50) * 0.1 + (S.life - 65) * 0.2 + (hasBld('cityhall') ? 5 : 0);
  if (RT.powerUse > RT.powerCap * 1.02) ap -= 10;
  if (RT.pop > 200 && RT.waterUse < RT.pop * 0.005) ap -= 5;
  S.approval += (clamp(ap, 0, 100) - S.approval) * 0.15;
}
function checkRewards() {
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
const MILESTONES = [500, 1000, 5000, 10000, 25000, 50000, 100000, 200000];
function monthly(init) {
  computeRoadDist();
  computePower();
  computeWater();
  computeCoverage();
  computeTotals();
  computeTraffic();
  computePollution();
  computeCrime();
  computeLandValue();
  if (init) { budgetMonth(false); return; }
  computeDemand();
  growZones();
  const prevPop = RT.pop;
  computeTotals();
  processGarbage();
  budgetMonth(true);
  updateCityStats();
  checkRewards();
  agePlants();
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
      t.burn = 0; if (t.k === 'zone' && t.lvl > 1) { t.lvl--; t.occ = OCC[t.z][t.lvl]; }
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
function randomDisaster() {
  const r = rnd();
  const land = () => { for (let k = 0; k < 200; k++) { const x = 8 + (rnd() * (W - 16) | 0), y = 8 + (rnd() * (H - 16) | 0); const t = T[idx(x, y)]; if (t.k === 'zone' && t.lvl) return [x, y]; } return [W / 2 | 0, H / 2 | 0]; };
  const [x, y] = land();
  if (r < 0.5) { for (let k = 0; k < 3; k++) igniteAt(x + k, y); news('🔥 대형 화재가 발생했습니다!', 'bad'); }
  else if (r < 0.75) quake(x, y);
  else startTornado(x, y);
}
function monthlyMaps() { computeRoadDist(); computePower(); computeWater(); computeCoverage(); miniDirty = true; }

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
    tornadoStep();
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
  for (let y = oy; y < oy + b.sz; y++) for (let x = ox; x < ox + b.sz; x++) {
    if (!inb(x, y)) return '지도 밖입니다';
    const t = T[idx(x, y)];
    if (t.ter === 1) return '물 위에는 지을 수 없습니다';
    if (!(t.k === '' || (t.k === 'zone' && t.lvl === 0 && !t.rub))) return '공간이 비어 있지 않습니다';
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
      if (t.ter === 1) { if (tool !== 'road' || (t.k !== '' && t.k !== 'power')) return -1; if (!dry) { t.k = 'road'; t.pl = t.pl || 0; } return 60; }
      if (t.k === 'road' && tool === 'avenue') { if (!dry) t.k = 'avenue'; return 18; }
      if (t.k === 'avenue') return 0;
      if (t.k === 'power') { if (!dry) { t.k = tool; t.pl = 1; } return tl.cost; }
      if (t.k === '' || (t.k === 'zone' && t.lvl === 0) || t.k === 'rubble') { if (!dry) { Object.assign(t, { k: tool, z: '', d: 0, lvl: 0, occ: 0, tree: 0, rub: 0, pl: 0 }); } return tl.cost + treeC; }
      return -1;
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
      if (t.k !== '') { if (!dry) Object.assign(t, { k: '', pl: 0, burn: 0 }); return t.ter ? 10 : 1; }
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
function applyTool(tool, tiles) {
  const tl = TOOLS[tool];
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
    S.money -= cost; spent = cost;
  } else if (tl.type === 'click') {
    const [x, y] = tiles[0];
    if (tool === 'd_fire') { if (!igniteAt(x, y)) flash('불이 붙을 대상이 없습니다'); else news('🔥 화재가 발생했습니다!', 'bad'); }
    if (tool === 'd_quake') quake(x, y);
    if (tool === 'd_tornado') startTornado(x, y);
    return;
  } else {
    for (const [x, y] of tiles) {
      const c = opTile(tool, x, y, true);
      if (c < 0) { fail++; continue; }
      if (c > S.money) { poor = true; break; }
      opTile(tool, x, y, false); S.money -= c; spent += c;
    }
    if (poor) flash('예산이 부족합니다');
  }
  if (spent > 0) { floatText('-₩' + fmt(spent)); sfx('build'); }
  monthlyMaps();
  refreshUI();
}

/* ---------------- 렌더링 ---------------- */
const cv = $('view'), ctx = cv.getContext('2d');
let cw = 0, ch = 0, dpr = 1, zoom = 1, camX = 0, camY = 0, hw = 32, hh = 16;
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
function ws(x, y) { return [(x - y) * hw + camX, (x + y) * hh + camY]; }
function sw(sx, sy) { const a = (sx - camX) / hw, b = (sy - camY) / hh; return [(a + b) / 2, (b - a) / 2]; }
function tileAt(sx, sy) { const [x, y] = sw(sx, sy); const tx = Math.floor(x), ty = Math.floor(y); return inb(tx, ty) ? [tx, ty] : null; }
function setZoom(nz, sx, sy) {
  nz = clamp(nz, 0.35, 3);
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
function drawGround(x, y, t, time) {
  const i = idx(x, y);
  if (t.ter === 1) {
    diamond(x, y, (x + y + ((time / 900) | 0)) % 7 === 0 ? '#4a90d0' : '#3d85c6');
    if (zoom > 0.6) { const [sx, sy] = ws(x + 0.5, y + 0.5); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; const o = Math.sin(time / 600 + x * 0.7 + y) * 4 * zoom; ctx.beginPath(); ctx.moveTo(sx - 8 * zoom + o, sy); ctx.lineTo(sx - 2 * zoom + o, sy); ctx.stroke(); }
  } else diamond(x, y, GRASS[t.v]);
  if (t.k === 'zone') {
    if (t.lvl === 0) {
      diamond(x, y, '#d6d2b4', 0.03, null);
      diamond(x, y, ZCOL[t.z] + '70', 0.06, null);
      ctx.lineWidth = Math.max(1, zoom); diamond(x, y, null, 0.08, ZCOL[t.z]);
      if (t.d > 1 && zoom > 0.6) { diamond(x, y, null, 0.2 + 0.06 * (t.d - 2), ZCOL[t.z] + 'aa'); }
    } else diamond(x, y, t.z === 'R' ? '#8fbf6f' : t.z === 'C' ? '#a7a9ac' : '#9b9282');
    if (t.rub) drawRubble(x, y);
  } else if (isRoad(t)) {
    if (t.ter === 1) { diamond(x, y, '#8d6e63', 0.1); }
    const av = t.k === 'avenue';
    diamond(x, y, av ? '#4f5357' : '#6b6e72', t.ter ? 0.14 : 0.02);
    // 차선
    if (zoom > 0.45) {
      const c = ws(x + 0.5, y + 0.5);
      ctx.strokeStyle = av ? '#f4d03f' : 'rgba(255,255,255,0.75)'; ctx.lineWidth = Math.max(1, zoom * (av ? 1.6 : 1));
      ctx.setLineDash([3 * zoom, 3 * zoom]);
      let n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (!inb(nx, ny) || !isRoad(T[idx(nx, ny)])) continue; n++;
        const e = ws(x + 0.5 + dx * 0.5, y + 0.5 + dy * 0.5); ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    if (overlay === 'traffic' || (zoom > 0.6 && M.cong[i] > 0.9)) {
      if (overlay !== 'traffic' && M.cong[i] > 0.9) diamond(x, y, 'rgba(230,60,40,0.25)', 0.25);
    }
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
function drawRubble(x, y) {
  if (zoom < 0.5) { diamond(x, y, '#7b6a58', 0.2); return; }
  ctx.fillStyle = '#6d5f50';
  for (let k = 0; k < 5; k++) { const [sx, sy] = ws(x + 0.25 + ((k * 37) % 50) / 100, y + 0.25 + ((k * 61) % 50) / 100); ctx.fillRect(sx - 2 * zoom, sy - 1.5 * zoom, 4 * zoom, 3 * zoom); }
}
function drawTree(x, y, k, s) {
  const [sx, sy] = ws(x, y);
  const h = 14 * zoom * s;
  ctx.fillStyle = '#5d4037'; ctx.fillRect(sx - 1 * zoom, sy - h * 0.35, 2 * zoom, h * 0.35);
  ctx.fillStyle = k % 2 ? '#2e7d32' : '#388e3c';
  ctx.beginPath(); ctx.moveTo(sx, sy - h * 1.2); ctx.lineTo(sx + 5.5 * zoom * s, sy - h * 0.25); ctx.lineTo(sx - 5.5 * zoom * s, sy - h * 0.25); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.beginPath(); ctx.moveTo(sx, sy - h * 1.2); ctx.lineTo(sx - 5.5 * zoom * s, sy - h * 0.25); ctx.lineTo(sx, sy - h * 0.3); ctx.closePath(); ctx.fill();
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
  for (let f = 0; f < floors; f++) {
    const oy = -(f + 0.6) * fh;
    ctx.beginPath(); ctx.moveTo(d[0] + (c[0] - d[0]) * 0.15, d[1] + (c[1] - d[1]) * 0.15 + oy); ctx.lineTo(d[0] + (c[0] - d[0]) * 0.88, d[1] + (c[1] - d[1]) * 0.88 + oy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c[0] + (b[0] - c[0]) * 0.12, c[1] + (b[1] - c[1]) * 0.12 + oy); ctx.lineTo(c[0] + (b[0] - c[0]) * 0.85, c[1] + (b[1] - c[1]) * 0.85 + oy); ctx.stroke();
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
      const hgt = [0, 0, 0, 24, 36, 56, 78][L] + v * 4;
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
      const hgt = [0, 0, 0, 32, 46, 74, 104][L] + v * 6;
      const col = ['#7fa7d1', '#5b86b5', '#86a8c4', '#6c8fb0'][v];
      const bx = box(x, y, 1, 1, L >= 5 ? 0.16 : 0.1, hgt, dim(col));
      windows(bx, Math.round(hgt / 7), ab ? lit : 'rgba(210,235,255,0.75)');
      if (L === 6 && zoom > 0.6) { const tp = bx.up(bx.a), cc = bx.up(bx.c); const mx = (tp[0] + cc[0]) / 2, my = (tp[1] + cc[1]) / 2; ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1.5 * zoom; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx, my - 14 * zoom); ctx.stroke(); }
    }
  } else {
    const hi = t.hi && !ab;
    const hgt = [0, 10, 14, 18, 22, 28, 34][L];
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
function overlayColor(i, t) {
  switch (overlay) {
    case 'lv': return heat(1 - M.lv[i] / 180);
    case 'pol': return M.pol[i] > 2 ? heat(M.pol[i] / 80) : null;
    case 'crime': return M.crime[i] > 1 ? heat(M.crime[i] / 60) : null;
    case 'traffic': return isRoad(t) ? heat(M.cong[i] / 1.5) : null;
    case 'power': if (conducts(t)) return t.pw ? 'rgba(255,235,59,0.6)' : 'rgba(244,67,54,0.6)'; return null;
    case 'water': if ((t.k === 'zone') || (t.k === 'bld' && !BLD[T[t.o].b].flat)) return t.wt ? 'rgba(33,150,243,0.6)' : 'rgba(244,67,54,0.5)'; if (isRoad(t)) return 'rgba(144,202,249,0.35)'; return null;
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
  // 지면
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!vis(x, y)) continue; drawGround(x, y, T[idx(x, y)], time); }
  // 오버레이
  if (overlay !== 'none') {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!vis(x, y)) continue; const i = idx(x, y); const c = overlayColor(i, T[i]); if (c) diamond(x, y, c); }
  }
  // 미리보기 (지면)
  drawPreview();
  // 객체 (뒤에서 앞으로)
  const alpha = overlay === 'none' ? 1 : 0.4;
  ctx.globalAlpha = alpha;
  const tallUp = 200 * zoom;
  for (let s = 0; s <= W + H - 2; s++) {
    for (let x = Math.max(0, s - H + 1); x <= Math.min(s, W - 1); x++) {
      const y = s - x; if (!vis(x, y, tallUp)) continue;
      const i = idx(x, y), t = T[i];
      if (t.k === 'zone' && t.lvl > 0) drawZoneBld(x, y, t, time);
      else if (t.k === 'bld') { const o = t.o, b = BLD[T[o].b]; if (x === (o % W) + b.sz - 1 && y === ((o / W) | 0) + b.sz - 1) drawBld(o, time); }
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
    const [sx, sy] = ws(tornado.x, tornado.y);
    for (let k = 0; k < 10; k++) { const r = (4 + k * 2.6) * zoom; const off = Math.sin(time / 120 + k) * 4 * zoom; ctx.fillStyle = `rgba(90,90,100,${0.55 - k * 0.03})`; ctx.beginPath(); ctx.ellipse(sx + off, sy - k * 8 * zoom, r, r * 0.35, 0, 0, 7); ctx.fill(); }
  }
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
    let ok = p.ok;
    if (ok === undefined) ok = p.neutral || tl.type === 'click' ? true : opTile(tool, x, y, true) >= 0;
    const col = p.neutral ? 'rgba(255,255,255,0.25)' : ok ? (tl.zone ? ZCOL[tl.zone[0]] + '99' : 'rgba(129,199,132,0.55)') : 'rgba(239,83,80,0.55)';
    diamond(x, y, col); ctx.lineWidth = 1; diamond(x, y, null, 0, 'rgba(255,255,255,0.7)');
  }
  // 서비스 범위 표시
  if (tl.type === 'place' && hover) {
    const b = BLD[tl.bld]; const rr = b.r || b.pr || b.bus || b.lr;
    if (rr) { const [ox, oy] = placeOrigin(tool, hover[0], hover[1]); const c = ws(ox + b.sz / 2, oy + b.sz / 2); ctx.strokeStyle = 'rgba(79,195,247,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.ellipse(c[0], c[1], rr * hw * Math.SQRT2, rr * hh * Math.SQRT2, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
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
const mimg = mctx.createImageData(W, H);
function drawMini() {
  if (!S) return;
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
  mctx.beginPath(); corners.forEach((p, k) => { const px = p[0] * 2, py = p[1] * 2; k ? mctx.lineTo(px, py) : mctx.moveTo(px, py); }); mctx.closePath(); mctx.stroke();
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
      else if (tl.type === 'rect') applyTool(tool, rectTiles(drag.start, end));
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
function floatText(s) { const p = hover ? ws(hover[0] + 0.5, hover[1] + 0.5) : [cw / 2, ch / 2]; floats.push({ s, x: p[0], y: p[1] - 20, t: performance.now() }); }
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
    const locked = b && b.reward && !S.rewards[key];
    const built = b && b.reward && S.rewards[key] === 'built';
    const el = document.createElement('button'); el.className = 'tool' + (tool === key ? ' on' : '') + (locked || built ? ' locked' : '');
    const desc = locked ? `인구 ${fmt(b.reward)} 달성 시 해금` : built ? '건설 완료' : (tl.d || (tl.zone ? ZNAME[tl.zone[0]] + ' 구역 (' + DNAME[tl.zone[1]] + ')' : ''));
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
  $('date').textContent = dateStr();
  const m = $('money'); m.textContent = '₩ ' + fmt(S.money); m.classList.toggle('neg', S.money < 0);
  $('pop').textContent = fmt(RT.pop);
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
  lines.push(`<div style="margin-top:6px">지가 ${Math.round(M.lv[i])}${bar(M.lv[i], 200, '#66bb6a')}</div>`);
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
function openModal(name, title, html) { modalOpen = name; $('ptitle').textContent = title; $('pbody').innerHTML = html; $('modal').classList.remove('hidden'); }
function closeModal() { if (modalOpen === 'newgame' && !S) return; modalOpen = null; $('modal').classList.add('hidden'); }
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
  <h3>부서 예산 (낮추면 서비스 효과 감소)</h3>
  ${Object.entries(DEPTS).map(([k, n]) => slider('fund', k, n, 0, 120)).join('')}
  <h3>대출</h3>
  <div>${S.loans.length ? S.loans.map(l => `<div class="kv"><span>₩${fmt(l.amt)} (연 ${l.rate}%)</span><span>월 ₩${fmt(l.pay)} · ${l.left}개월 남음</span></div>`).join('') : '<small style="color:var(--muted)">대출 없음</small>'}</div>
  <div class="row" style="margin-top:8px"><button class="btn" id="loan1" ${S.loans.length >= 3 ? 'disabled' : ''}>₩10,000 대출 (10년)</button><button class="btn sec" id="loan2" ${S.loans.length >= 3 ? 'disabled' : ''}>₩30,000 대출 (10년)</button></div>`;
  const body = $('pbody'); const st = body.scrollTop; body.innerHTML = html; body.scrollTop = st;
  body.querySelectorAll('input[type=range]').forEach(inp => {
    inp.oninput = () => { S[inp.dataset.g][inp.dataset.k] = +inp.value; inp.nextElementSibling.textContent = inp.value + '%'; };
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
   ${kv('전력', fmt(RT.powerUse) + ' / ' + fmt(RT.powerCap) + ' MW')}${kv('수도', fmt(RT.waterUse) + ' / ' + fmt(RT.waterCap))}
   ${kv('쓰레기 (월)', fmt(RT.garbage) + 't · 처리 ' + fmt(RT.garbageDone) + 't')}${kv('미수거 쓰레기', fmt(S.garbageStock) + 't')}
   ${kv('평균 범죄', Math.round(RT.avgCrime))}${kv('평균 오염', Math.round(RT.avgPol))}
   ${kv('교통 혼잡', Math.round(RT.avgCong * 100) + '%')}${kv('매립지 잔여', fmt(RT.landfillLeft || 0) + 't')}
  </div>
  <h3>인구 (최근 10년)</h3><canvas class="chart" id="ch1"></canvas>
  <h3>주거 / 상업 / 공업</h3><div class="legendrow"><span><i style="background:var(--R)"></i>주민</span><span><i style="background:var(--C)"></i>상업 일자리</span><span><i style="background:var(--I)"></i>공업 일자리</span></div><canvas class="chart" id="ch2"></canvas>
  <h3>자금</h3><canvas class="chart" id="ch3"></canvas>
  <h3>최근 소식</h3><div style="max-height:160px;overflow:auto;font-size:12px">${S.news.slice(0, 25).map(n => `<div class="kv"><span>${n.date}</span><span style="text-align:right;flex:1;margin-left:8px">${n.text}</span></div>`).join('')}</div>`;
  chart($('ch1'), [hist.map(h => h.p)], ['#4fc3f7']);
  chart($('ch2'), [hist.map(h => h.r), hist.map(h => h.c), hist.map(h => h.i)], ['#4caf50', '#2196f3', '#ffc107']);
  chart($('ch3'), [hist.map(h => h.m)], ['#ffca28']);
}
$('bStats').onclick = () => { openModal('stats', '📊 도시 통계'); renderStats(); };

// 지도 보기
function buildOverlays() {
  const l = $('ovList'); l.innerHTML = '';
  for (const [k, n] of OVERLAYS) { const b = document.createElement('button'); b.textContent = n; b.className = overlay === k ? 'on' : ''; b.onclick = () => { setOverlay(k); l.classList.add('hidden'); }; l.appendChild(b); }
}
function setOverlay(k) {
  overlay = k; const n = OVERLAYS.find(o => o[0] === k)[1]; $('ovBtn').textContent = '🗺️ 지도: ' + n; buildOverlays();
  const lg = $('legend');
  if (k === 'none') lg.classList.add('hidden');
  else { lg.classList.remove('hidden'); lg.innerHTML = ({ lv: '지가: 초록=높음 · 빨강=낮음', pol: '오염도', crime: '범죄율', traffic: '도로 혼잡도', power: '노랑=전기 있음 · 빨강=없음', water: '파랑=급수 · 빨강=없음', police: '파랑이 진할수록 강함', fire: '파랑이 진할수록 강함', health: '파랑이 진할수록 강함', edu: '파랑이 진할수록 강함' })[k] + (['pol', 'crime', 'traffic'].includes(k) ? '<div class="grad"></div><small>낮음 → 높음</small>' : k === 'lv' ? '<div class="grad" style="transform:scaleX(-1)"></div>' : ''); }
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
  $('mName').onchange = e => { S.name = e.target.value || '새 도시'; refreshUI(); };
  $('mExport').onclick = () => { const blob = new Blob([serialize()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = (S.name || 'city') + '.json'; a.click(); };
  $('mImport').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(txt => { if (deserialize(txt)) { news('📂 파일에서 도시를 불러왔습니다.', 'good'); closeModal(); } else alert('파일을 읽을 수 없습니다.'); }); };
};

/* ---------------- 저장 ---------------- */
const TKEYS = ['ter', 'tree', 'k', 'z', 'd', 'lvl', 'occ', 'hi', 'ab', 'b', 'o', 'pl', 'burn', 'rub', 'v', 'age', 'np'];
function serialize() { const o = Object.assign({}, S); o.tiles = T.map(t => TKEYS.map(k => t[k])); return JSON.stringify(o); }
function deserialize(txt) {
  try {
    const o = JSON.parse(txt); if (!o || !o.tiles || o.tiles.length !== N) return false;
    o.tiles = o.tiles.map(a => { const t = newTile(); TKEYS.forEach((k, j) => t[k] = a[j]); return t; });
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
   <div class="row"><label>숲</label><select id="ngTrees"><option value="0">없음</option><option value="1">적음</option><option value="2" selected>보통</option><option value="3">많음</option></select></div>
   <div class="row"><label>난이도</label><select id="ngDiff"><option value="50000">쉬움 (₩50,000)</option><option value="20000" selected>보통 (₩20,000)</option><option value="10000">어려움 (₩10,000)</option></select></div>
   <label class="ord"><input type="checkbox" id="ngDis" checked><div><b>무작위 재해</b><small>끄면 직접 일으킬 때만 발생</small></div></label>
   <div class="row" style="margin-top:12px"><button class="btn" id="ngGo">도시 세우기</button>${hasSave ? '<button class="btn sec" id="ngCont">이어하기</button>' : ''}</div>`);
  $('ngRand').onclick = () => $('ngSeed').value = (Math.random() * 99999) | 0;
  $('ngGo').onclick = () => {
    const seed = parseInt($('ngSeed').value, 10) || 1;
    modalOpen = null; $('modal').classList.add('hidden');
    newGame({ name: $('ngName').value.trim() || '새 도시', seed, water: +$('ngWater').value, trees: +$('ngTrees').value, money: +$('ngDiff').value, disasters: $('ngDis').checked });
    buildToolbar(); selectTool('inspect'); setSpeed(2);
  };
  if (hasSave) $('ngCont').onclick = () => { modalOpen = null; $('modal').classList.add('hidden'); if (!(load('metro_save') || load('metro_autosave'))) showNewGame(); };
}

/* ---------------- 메인 루프 ---------------- */
let last = performance.now(), miniT = 0;
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.25); last = now;
  if (S) { tick(dt); panKeys(dt); }
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
window.__game = { get S() { return S; }, RT, M, applyTool, monthly, lineTiles, rectTiles, newGame, setSpeed, idx, T: () => T, selectTool, placeOrigin, save, load, serialize, deserialize };
