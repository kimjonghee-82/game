/* ==========================================================================
   하노이·사파 여행 플래너
   모든 데이터는 브라우저 localStorage 에만 저장됩니다 (서버/백엔드 없음).
   ========================================================================== */

const STORAGE_KEYS = {
  settings: 'hanoi_trip_settings_v1',
  itinerary: 'hanoi_trip_itinerary_v1',
  expenses: 'hanoi_trip_expenses_v1',
  reference: 'hanoi_trip_reference_v1',
  phrases: 'hanoi_trip_phrases_v1',
  fxCache: 'hanoi_trip_fx_cache_v1',
};

const ITINERARY_CATEGORIES = ['이동', '식사', '관광', '숙소', '쇼핑', '기타'];
const EXPENSE_CATEGORIES = ['교통', '식사', '관광/입장료', '숙박', '쇼핑', '기타'];
const ITIN_TO_EXPENSE_CATEGORY = {
  '이동': '교통', '식사': '식사', '관광': '관광/입장료',
  '숙소': '숙박', '쇼핑': '쇼핑', '기타': '기타',
};

/* ---------------------------- 기본 시드 데이터 ---------------------------- */

const DEFAULT_REFERENCE = {
  hanoi: [
    { type: '명소', name: '호안끼엠 호수 (Hoan Kiem Lake)', desc: '하노이 구시가지 한복판의 호수. 아침 산책과 옥썬사(Ngoc Son Temple), 후에콕교 풍경이 유명.' },
    { type: '명소', name: '올드쿼터 36거리 (Old Quarter)', desc: '업종별로 나뉜 좁은 골목들. 야시장, 길거리 음식, 기념품 쇼핑에 좋음.' },
    { type: '명소', name: '문묘 (Temple of Literature)', desc: '베트남 최초의 국립대학. 조용한 정원과 전통 건축을 볼 수 있는 명소.' },
    { type: '명소', name: '호치민 묘소·주석궁 단지', desc: '호치민 묘소, 목조 가옥, 원 필러 파고다가 모여 있는 구역. 복장 규정 있음.' },
    { type: '명소', name: '기찻길 마을 (Train Street)', desc: '주민 집 바로 옆으로 기차가 지나가는 명소. 카페에 앉아 기차 통과를 구경할 수 있음(안전 유의).' },
    { type: '맛집', name: '분짜 흐엉리엔 (Bun Cha Huong Lien)', desc: '오바마 전 대통령이 방문해 유명해진 분짜(숯불 돼지고기+쌀국수) 전문점.' },
    { type: '맛집', name: '퍼틴 (Pho Thin Lo Duc)', desc: '현지인들에게 사랑받는 소고기 쌀국수(퍼보) 노포.' },
    { type: '맛집', name: '카페 지앙 (Cafe Giang)', desc: '에그커피(까페 쯩)의 원조로 알려진 카페. 좁고 오래된 골목 안에 위치.' },
    { type: '명소', name: '서호(西湖)와 쩐꾸옥 사원', desc: '하노이에서 가장 큰 호수. 노을 산책과 베트남에서 가장 오래된 사원 관람.' },
    { type: '명소', name: '탕롱 수상인형극장', desc: '베트남 전통 수상 인형극 공연. 짧은 공연 시간으로 여행 중 부담 없이 관람 가능.' },
  ],
  sapa: [
    { type: '명소', name: '판시판 케이블카 (Fansipan Legend)', desc: '인도차이나 최고봉(3,143m) 정상까지 케이블카로 이동. 전망대에서 산악 파노라마 감상.' },
    { type: '명소', name: '므엉화 계곡 다랑논 뷰포인트', desc: '계단식 논이 펼쳐진 사파 대표 풍경. 시즌에 따라 초록·황금빛으로 변함.' },
    { type: '명소', name: '깟깟 마을 (Cat Cat Village)', desc: '몽족(H\'mong) 전통 마을. 트레킹 코스와 폭포, 수공예품 구경하기 좋음.' },
    { type: '명소', name: '은폭포 (Thac Bac, Silver Waterfall)', desc: '사파 시내에서 가까운 폭포. 짧은 등산로를 따라 시원한 물줄기를 볼 수 있음.' },
    { type: '명소', name: '함롱산 (Ham Rong Mountain)', desc: '사파 시내에서 가까운 전망 산책로. 꽃 정원과 시내 전망대가 있음.' },
    { type: '명소', name: '사랑폭포 & 대나무숲', desc: '전설이 깃든 폭포와 시원한 대나무 숲길. 무엉화 계곡 트레킹과 함께 즐기기 좋음.' },
    { type: '명소', name: '사파 호수 & 스톤 처치', desc: '사파 중심가의 작은 호수와 프랑스 식민지 시대 성당. 야경 산책 명소.' },
    { type: '명소', name: '따반 마을 트레킹 (Ta Van Village)', desc: '자이족(Giáy) 마을을 지나는 계곡 트레킹 코스. 현지 가이드 투어로 인기.' },
    { type: '맛집', name: '런까업나 (Lợn cắp nách, 아기돼지 통구이)', desc: '사파 지역 특산 요리. 현지 산악 흑돼지를 구워내는 명물 음식.' },
    { type: '맛집', name: '텅꼬 & 껌람 로컬 식당', desc: '텅꼬(내장 스튜)와 대나무통밥(껌람) 등 소수민족 전통 음식을 파는 사파 시장 주변 식당.' },
  ],
};

const DEFAULT_PHRASES = [
  { situation: '인사 및 기본 표현', phrases: [
    ['Xin chào', '안녕하세요', '씬 짜오'],
    ['Cảm ơn', '감사합니다', '깜 언'],
    ['Không có gì', '천만에요', '콩 꼬 지'],
    ['Xin lỗi', '죄송합니다 / 실례합니다', '씬 로이'],
    ['Vâng', '네 (공손한 대답)', '벙'],
    ['Không', '아니요', '콩'],
    ['Bạn khỏe không?', '잘 지내세요?', '반 코에 콩'],
    ['Tôi khỏe, cảm ơn', '저는 잘 지내요, 감사합니다', '또이 코에, 깜 언'],
    ['Tôi tên là ...', '제 이름은 ...입니다', '또이 뗀 라'],
    ['Rất vui được gặp bạn', '만나서 반갑습니다', '젓 부이 드억 갑 반'],
  ]},
  { situation: '공항 / 입국', phrases: [
    ['Hộ chiếu của tôi đây', '여기 제 여권입니다', '호 찌에우 꾸어 또이 더이'],
    ['Tôi đến đây du lịch', '저는 여행하러 왔습니다', '또이 덴 더이 주 릭'],
    ['Tôi sẽ ở lại vài ngày', '며칠 머무를 예정입니다', '또이 세 어 라이 바이 응아이'],
    ['Hành lý của tôi ở đâu?', '제 짐은 어디에 있나요?', '하잉 리 꾸어 또이 어 더우'],
    ['Quầy đổi tiền ở đâu?', '환전소가 어디에 있나요?', '꾸어이 도이 띠엔 어 더우'],
    ['Xe đón khách ở đâu?', '픽업 차량은 어디에 있나요?', '쎄 돈 카익 어 더우'],
    ['Tôi cần visa không?', '비자가 필요한가요?', '또이 껀 비자 콩'],
    ['Cửa ra là ở đâu?', '출구는 어디인가요?', '끄어 자 라 어 더우'],
    ['Tôi bị lạc hành lý', '짐을 분실했어요', '또이 비 락 하잉 리'],
    ['Cho tôi xem bản đồ sân bay', '공항 지도 좀 보여주세요', '쪼 또이 쎔 반 도 썬 바이'],
  ]},
  { situation: '숙소 / 체크인', phrases: [
    ['Tôi muốn nhận phòng', '체크인 하고 싶어요', '또이 무온 년 퐁'],
    ['Tôi đã đặt phòng trước', '예약했습니다', '또이 다 닷 퐁 쯔억'],
    ['Phòng có wifi không?', '방에 와이파이 있나요?', '퐁 꼬 와이파이 콩'],
    ['Mấy giờ trả phòng?', '체크아웃은 몇 시인가요?', '머이 저 짜 퐁'],
    ['Cho tôi thêm một cái chăn', '담요 하나 더 주세요', '쪼 또이 템 못 까이 짠'],
    ['Phòng này có ồn không?', '이 방은 시끄럽나요?', '퐁 나이 꼬 온 콩'],
    ['Tôi muốn đổi phòng', '방을 바꾸고 싶어요', '또이 무온 도이 퐁'],
    ['Bể bơi ở đâu?', '수영장은 어디에 있나요?', '베 버이 어 더우'],
    ['Cho tôi gọi taxi được không?', '택시 불러주실 수 있나요?', '쪼 또이 고이 딱씨 드억 콩'],
    ['Cảm ơn, phòng rất đẹp', '감사합니다, 방이 아주 좋네요', '깜 언, 퐁 젓 뎁'],
  ]},
  { situation: '식당 / 주문', phrases: [
    ['Cho tôi xem thực đơn', '메뉴판 좀 보여주세요', '쪼 또이 쎔 특 던'],
    ['Tôi muốn gọi món này', '이거 주문할게요', '또이 무온 고이 몬 나이'],
    ['Cho tôi một bát phở bò', '소고기 쌀국수 한 그릇 주세요', '쪼 또이 못 밧 퍼 보'],
    ['Không cay nhé', '맵지 않게 해주세요', '콩 까이 냬'],
    ['Cho tôi thêm nước', '물 좀 더 주세요', '쪼 또이 템 느억'],
    ['Món này ngon lắm', '이거 정말 맛있어요', '몬 나이 응온 람'],
    ['Tính tiền giúp tôi', '계산해 주세요', '띤 띠엔 줍 또이'],
    ['Có món chay không?', '채식 메뉴 있나요?', '꼬 몬 짜이 콩'],
    ['Tôi bị dị ứng với đậu phộng', '저는 땅콩 알레르기가 있어요', '또이 비 지 응 버이 더우 퐁'],
    ['Ngon quá, cảm ơn đầu bếp', '정말 맛있어요, 요리사님 감사해요', '응온 꾸아, 깜 언 더우 벱'],
  ]},
  { situation: '택시 / 교통', phrases: [
    ['Cho tôi đến chỗ này', '여기로 가주세요 (주소·지도를 보여주며)', '쪼 또이 덴 쪼 나이'],
    ['Bao nhiêu tiền đến đó?', '거기까지 얼마예요?', '바오 니에우 띠엔 덴 도'],
    ['Xin dùng đồng hồ tính tiền', '미터기 켜주세요', '씬 중 동 호 띤 띠엔'],
    ['Đi nhanh giúp tôi', '좀 빨리 가주세요', '디 냐잉 줍 또이'],
    ['Dừng lại ở đây', '여기 세워주세요', '증 라이 어 더이'],
    ['Bao lâu thì tới?', '얼마나 걸려요?', '바오 러우 티 떠이'],
    ['Ga tàu ở đâu?', '기차역이 어디예요?', '가 따우 어 더우'],
    ['Xe buýt này có đi đến... không?', '이 버스가 ...로 가나요?', '쎄 부잇 나이 꼬 디 덴 콩'],
    ['Tôi muốn thuê xe máy', '오토바이를 빌리고 싶어요', '또이 무온 투에 쎄 마이'],
    ['Vé một chiều hay khứ hồi?', '편도인가요, 왕복인가요?', '베 못 찌에우 하이 크 호이'],
  ]},
  { situation: '쇼핑 / 시장', phrases: [
    ['Cái này bao nhiêu tiền?', '이거 얼마예요?', '까이 나이 바오 니에우 띠엔'],
    ['Đắt quá, giảm giá được không?', '너무 비싸요, 깎아주실 수 있나요?', '닷 꾸아, 잠 자 드억 콩'],
    ['Cho tôi xem cái kia', '저것 좀 보여주세요', '쪼 또이 쎔 까이 끼아'],
    ['Tôi chỉ xem thôi', '그냥 구경하는 거예요', '또이 찌 쎔 토이'],
    ['Có màu khác không?', '다른 색깔 있나요?', '꼬 마우 칵 콩'],
    ['Cho tôi cái này', '이거 주세요 (구매)', '쪼 또이 까이 나이'],
    ['Có thể trả bằng thẻ không?', '카드 결제 가능한가요?', '꼬 테 짜 방 테 콩'],
    ['Cho tôi một túi nữa', '봉투 하나 더 주세요', '쪼 또이 못 뚜이 느어'],
    ['Cái này làm bằng gì?', '이건 무엇으로 만들었나요?', '까이 나이 람 방 지'],
    ['Tôi sẽ quay lại sau', '나중에 다시 올게요', '또이 세 꾸아이 라이 사우'],
  ]},
  { situation: '길찾기 / 방향', phrases: [
    ['Nhà vệ sinh ở đâu?', '화장실이 어디예요?', '냐 베 씬 어 더우'],
    ['Đường này đi đâu?', '이 길은 어디로 가나요?', '드엉 나이 디 더우'],
    ['Chỗ này cách đây bao xa?', '여기서 얼마나 먼가요?', '쪼 나이 까익 더이 바오 싸'],
    ['Rẽ trái ở đây', '여기서 좌회전하세요', '재 짜이 어 더이'],
    ['Rẽ phải ở kia', '저기서 우회전하세요', '재 파이 어 끼아'],
    ['Đi thẳng nhé', '직진하세요', '디 탕 냬'],
    ['Tôi bị lạc đường', '길을 잃었어요', '또이 비 락 드엉'],
    ['Có thể chỉ đường giúp tôi không?', '길 좀 알려주실 수 있나요?', '꼬 테 찌 드엉 줍 또이 콩'],
    ['Bến xe buýt gần nhất ở đâu?', '가까운 버스 정류장이 어디예요?', '벤 쎄 부잇 건 녓 어 더우'],
    ['Cảm ơn, tôi hiểu rồi', '감사합니다, 이해했어요', '깜 언, 또이 히에우 조이'],
  ]},
  { situation: '긴급상황 / 도움 요청', phrases: [
    ['Giúp tôi với!', '도와주세요!', '줍 또이 버이'],
    ['Gọi cấp cứu giúp tôi', '구급차 좀 불러주세요', '고이 껍 끄우 줍 또이'],
    ['Tôi bị ốm', '저 아파요', '또이 비 옴'],
    ['Tôi cần bác sĩ', '의사가 필요해요', '또이 껀 박 시'],
    ['Bệnh viện gần nhất ở đâu?', '가장 가까운 병원이 어디예요?', '벤 비엔 건 녓 어 더우'],
    ['Tôi bị mất hộ chiếu', '여권을 잃어버렸어요', '또이 비 멋 호 찌에우'],
    ['Gọi cảnh sát giúp tôi', '경찰을 불러주세요', '고이 까잉 삿 줍 또이'],
    ['Có ai nói được tiếng Anh không?', '영어 할 줄 아는 분 계세요?', '꼬 아이 노이 드억 띠엥 아잉 콩'],
    ['Tôi bị say độ cao', '고산병 증세가 있어요', '또이 비 사이 도 까오'],
    ['Xin đưa tôi đến bệnh viện', '병원에 데려다 주세요', '씬 드어 또이 덴 벤 비엔'],
  ]},
  { situation: '환전 / 결제', phrases: [
    ['Tôi muốn đổi tiền', '환전하고 싶어요', '또이 무온 도이 띠엔'],
    ['Tỷ giá hôm nay là bao nhiêu?', '오늘 환율이 어떻게 되나요?', '띠 자 홈 나이 라 바오 니에우'],
    ['Cho tôi đổi sang tiền Việt', '베트남 동으로 바꿔주세요', '쪼 또이 도이 상 띠엔 비엣'],
    ['Tôi trả bằng tiền mặt', '현금으로 낼게요', '또이 짜 방 띠엔 맛'],
    ['Tôi trả bằng thẻ', '카드로 낼게요', '또이 짜 방 테'],
    ['Cho tôi hóa đơn', '영수증 주세요', '쪼 또이 호아 던'],
    ['Ở đây có ATM không?', '여기 ATM 있나요?', '어 더이 꼬 에이티엠 콩'],
    ['Có tính phí thẻ không?', '카드 수수료가 있나요?', '꼬 띤 피 테 콩'],
    ['Bạn thối lại tiền cho tôi', '거스름돈 주세요', '반 토이 라이 띠엔 쪼 또이'],
    ['Tôi nghĩ tính sai rồi', '계산이 잘못된 것 같아요', '또이 응이 띤 사이 조이'],
  ]},
  { situation: '작별 / 감사 인사', phrases: [
    ['Cảm ơn rất nhiều', '정말 감사합니다', '깜 언 젓 니에우'],
    ['Tạm biệt', '잘 가요 (작별)', '땀 비엣'],
    ['Hẹn gặp lại', '또 만나요', '헨 갑 라이'],
    ['Chúc bạn một ngày tốt lành', '좋은 하루 보내세요', '쭉 반 못 응아이 똣 라잉'],
    ['Tôi rất thích Việt Nam', '저는 베트남이 정말 좋아요', '또이 젓 틱 비엣 남'],
    ['Chuyến đi rất tuyệt vời', '정말 멋진 여행이었어요', '쭈이엔 디 젓 뚜이엣 버이'],
    ['Mong sớm quay lại', '곧 다시 오고 싶어요', '몽 섬 꾸아이 라이'],
    ['Chúc bạn sức khỏe', '건강하세요', '쭉 반 슥 코에'],
    ['Xin lỗi vì đã làm phiền', '번거롭게 해서 죄송해요', '씬 로이 비 다 람 피엔'],
    ['Chào tạm biệt và cảm ơn', '안녕히 계세요, 감사했습니다', '짜오 땀 비엣 바 깜 언'],
  ]},
];

/* ------------------------------- 저장/로드 ------------------------------- */

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadSettings() {
  return load(STORAGE_KEYS.settings, {
    startDate: '2026-08-15',
    endDate: '2026-08-23',
    extraDates: [],
    groqApiKey: '',
    groqModel: 'llama-3.3-70b-versatile',
    googleClientId: '',
    googleSpreadsheetId: '',
  });
}
function saveSettings(s) { save(STORAGE_KEYS.settings, s); }

function loadItinerary() { return load(STORAGE_KEYS.itinerary, []); }
function saveItinerary(v) { save(STORAGE_KEYS.itinerary, v); }
function loadExpenses() { return load(STORAGE_KEYS.expenses, []); }
function saveExpenses(v) { save(STORAGE_KEYS.expenses, v); }
function loadReference() { return load(STORAGE_KEYS.reference, null); }
function saveReference(v) { save(STORAGE_KEYS.reference, v); }
function loadPhrases() { return load(STORAGE_KEYS.phrases, null); }
function savePhrases(v) { save(STORAGE_KEYS.phrases, v); }
function loadFxCache() { return load(STORAGE_KEYS.fxCache, {}); }
function saveFxCache(v) { save(STORAGE_KEYS.fxCache, v); }

function seedDefaultsIfEmpty() {
  if (!loadReference()) {
    saveReference({
      hanoi: DEFAULT_REFERENCE.hanoi.map(item => ({ id: uid(), ...item })),
      sapa: DEFAULT_REFERENCE.sapa.map(item => ({ id: uid(), ...item })),
    });
  }
  if (!loadPhrases()) {
    savePhrases(DEFAULT_PHRASES.map(cat => ({
      id: uid(),
      situation: cat.situation,
      phrases: cat.phrases.map(([vi, ko, pron]) => ({ vi, ko, pron })),
    })));
  }
}

/* -------------------------------- 유틸 -------------------------------- */

function uid() { return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8); }

function toast(msg, ms) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('hidden'), ms || 3200);
}

function dateRange(start, end) {
  const out = [];
  let d = new Date(start + 'T00:00:00');
  const endD = new Date(end + 'T00:00:00');
  while (d <= endD) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${dateStr.slice(5, 7)}/${dateStr.slice(8, 10)} (${WEEKDAYS[d.getDay()]})`;
}

function getTripDates() {
  const s = loadSettings();
  const set = new Set([...dateRange(s.startDate, s.endDate), ...(s.extraDates || [])]);
  return Array.from(set).sort();
}

function fmtAmount(n) {
  if (n === null || n === undefined || isNaN(n)) return '';
  return Number(n).toLocaleString('ko-KR');
}

/* ------------------------------ 모달 제어 ------------------------------ */

let openModalId = null;
function openModal(id) {
  document.getElementById('modal-backdrop').classList.remove('hidden');
  document.getElementById(id).classList.remove('hidden');
  openModalId = id;
}
function closeModal(id) {
  document.getElementById('modal-backdrop').classList.add('hidden');
  document.getElementById(id).classList.add('hidden');
  if (openModalId === id) openModalId = null;
}
document.getElementById('modal-backdrop').addEventListener('click', () => {
  if (openModalId) closeModal(openModalId);
});

/* -------------------------------- 탭 전환 -------------------------------- */

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

/* ============================== 일정 탭 ============================== */

function fillDateSelect(selectEl, selectedDate) {
  const dates = getTripDates();
  selectEl.innerHTML = dates.map(d => `<option value="${d}">${formatDateLabel(d)}</option>`).join('');
  if (selectedDate) selectEl.value = selectedDate;
}

function renderItineraryGrid() {
  const dates = getTripDates();
  const entries = loadItinerary();
  const table = document.getElementById('itinerary-grid');

  let thead = '<thead><tr><th class="time-col-head">시간</th>' +
    dates.map(d => `<th>${formatDateLabel(d)}</th>`).join('') + '</tr></thead>';

  let rows = '';
  for (let h = 0; h < 24; h++) {
    rows += `<tr><td class="time-col">${h}:00</td>`;
    for (const d of dates) {
      const cellEntries = entries.filter(e => e.date === d && !e.lodging && parseInt(e.time.split(':')[0], 10) === h);
      const chips = cellEntries.map(e => renderChip(e)).join('');
      rows += `<td class="day-cell" data-date="${d}" data-hour="${h}">${chips}</td>`;
    }
    rows += '</tr>';
  }

  let lodgingRow = '<tr class="lodging-row"><td class="time-col">숙소</td>';
  for (const d of dates) {
    const lodgingEntries = entries.filter(e => e.date === d && e.lodging);
    const text = lodgingEntries.map(e => e.text).join(', ');
    lodgingRow += `<td class="day-cell lodging-cell" data-date="${d}" data-lodging="1">${text ? escapeHtml(text) : '<span style="color:#bbb">+ 숙소 추가</span>'}</td>`;
  }
  lodgingRow += '</tr>';

  table.innerHTML = thead + '<tbody>' + rows + lodgingRow + '</tbody>';
  document.getElementById('itinerary-status').textContent = `총 ${entries.length}개 일정 · ${dates.length}일`;
}

function renderChip(e) {
  const costHtml = e.expenseId ? renderChipCost(e.expenseId) : '';
  return `<div class="entry-chip${e.photoThumb ? ' has-photo' : ''}" data-entry-id="${e.id}">` +
    `<span class="chip-time">${e.time}</span>${escapeHtml(e.text)}${costHtml}</div>`;
}
function renderChipCost(expenseId) {
  const exp = loadExpenses().find(x => x.id === expenseId);
  if (!exp) return '';
  return `<span class="chip-cost">${fmtAmount(exp.amount)} ${exp.currency}</span>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

document.getElementById('itinerary-grid').addEventListener('click', (e) => {
  const chip = e.target.closest('.entry-chip');
  if (chip) { openEntryModal(chip.dataset.entryId); return; }
  const lodgingCell = e.target.closest('.lodging-cell');
  if (lodgingCell) {
    const existing = loadItinerary().find(x => x.date === lodgingCell.dataset.date && x.lodging);
    if (existing) openEntryModal(existing.id);
    else openEntryModal(null, { date: lodgingCell.dataset.date, time: '15:00', lodging: true });
    return;
  }
  const cell = e.target.closest('td.day-cell');
  if (cell) {
    openEntryModal(null, { date: cell.dataset.date, time: `${cell.dataset.hour}:00` });
  }
});

document.getElementById('btn-add-entry').addEventListener('click', () => openEntryModal(null, {}));

function openEntryModal(entryId, prefill) {
  const isNew = !entryId;
  document.getElementById('entry-modal-title').textContent = isNew ? '일정 추가' : '일정 수정';
  document.getElementById('entry-id').value = entryId || '';
  fillDateSelect(document.getElementById('entry-date'));
  document.getElementById('entry-delete-btn').classList.toggle('hidden', isNew);

  let entry = { date: getTripDates()[0], time: '09:00', text: '', category: '이동', lodging: false, expenseId: null };
  if (!isNew) {
    entry = loadItinerary().find(x => x.id === entryId) || entry;
  } else if (prefill) {
    entry = { ...entry, ...prefill };
  }

  document.getElementById('entry-date').value = entry.date;
  document.getElementById('entry-time').value = entry.time;
  document.getElementById('entry-text').value = entry.text || '';
  document.getElementById('entry-category').value = entry.category || '이동';
  document.getElementById('entry-lodging').checked = !!entry.lodging;

  const linkedExpense = entry.expenseId ? loadExpenses().find(x => x.id === entry.expenseId) : null;
  document.getElementById('entry-cost-amount').value = linkedExpense ? linkedExpense.amount : '';
  document.getElementById('entry-cost-currency').value = linkedExpense ? linkedExpense.currency : 'VND';

  openModal('modal-entry');
}

document.getElementById('entry-cancel-btn').addEventListener('click', () => closeModal('modal-entry'));

document.getElementById('entry-save-btn').addEventListener('click', () => {
  const id = document.getElementById('entry-id').value;
  const entries = loadItinerary();
  const date = document.getElementById('entry-date').value;
  const time = document.getElementById('entry-time').value;
  const text = document.getElementById('entry-text').value.trim();
  const category = document.getElementById('entry-category').value;
  const lodging = document.getElementById('entry-lodging').checked;
  const costAmount = document.getElementById('entry-cost-amount').value;
  const costCurrency = document.getElementById('entry-cost-currency').value;

  if (!text) { toast('내용을 입력해주세요'); return; }
  if (!time) { toast('시간을 입력해주세요'); return; }

  let entry = entries.find(x => x.id === id);
  if (!entry) {
    entry = { id: uid(), date, time, text, category, lodging, expenseId: null, photoThumb: null, photoMeta: null };
    entries.push(entry);
  } else {
    Object.assign(entry, { date, time, text, category, lodging });
  }

  syncEntryCost(entry, costAmount ? Number(costAmount) : null, costCurrency, `${date} ${time} ${text}`);
  saveItinerary(entries);
  renderItineraryGrid();
  renderExpenseTab();
  closeModal('modal-entry');
  toast('일정을 저장했습니다');
});

document.getElementById('entry-delete-btn').addEventListener('click', () => {
  const id = document.getElementById('entry-id').value;
  if (!id) return;
  if (!confirm('이 일정을 삭제할까요?')) return;
  let entries = loadItinerary();
  const entry = entries.find(x => x.id === id);
  if (entry && entry.expenseId) deleteExpense(entry.expenseId);
  entries = entries.filter(x => x.id !== id);
  saveItinerary(entries);
  renderItineraryGrid();
  renderExpenseTab();
  closeModal('modal-entry');
  toast('일정을 삭제했습니다');
});

/** 일정 항목에 연결된 비용(expense)을 생성/수정/삭제로 동기화 */
function syncEntryCost(entry, amount, currency, placeText) {
  const expenses = loadExpenses();
  if (!amount) {
    if (entry.expenseId) {
      deleteExpense(entry.expenseId);
      entry.expenseId = null;
    }
    return;
  }
  let exp = expenses.find(x => x.id === entry.expenseId);
  if (!exp) {
    exp = { id: uid(), source: 'itinerary', itineraryId: entry.id };
    expenses.push(exp);
    entry.expenseId = exp.id;
  }
  Object.assign(exp, {
    date: entry.date,
    time: entry.time,
    place: placeText || entry.text,
    category: ITIN_TO_EXPENSE_CATEGORY[entry.category] || '기타',
    amount, currency,
  });
  saveExpenses(expenses);
  if (currency !== 'KRW') refreshExpenseKrw(exp.id);
}

document.getElementById('btn-add-day').addEventListener('click', () => {
  const input = prompt('추가할 날짜를 YYYY-MM-DD 형식으로 입력하세요');
  if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) { if (input) toast('날짜 형식이 올바르지 않습니다'); return; }
  const s = loadSettings();
  s.extraDates = s.extraDates || [];
  if (!s.extraDates.includes(input)) s.extraDates.push(input);
  saveSettings(s);
  renderItineraryGrid();
  toast(`${input} 날짜를 추가했습니다`);
});

/* ============================== 비용 탭 ============================== */

function deleteExpense(expenseId) {
  const expenses = loadExpenses().filter(x => x.id !== expenseId);
  saveExpenses(expenses);
  const entries = loadItinerary();
  entries.forEach(e => { if (e.expenseId === expenseId) e.expenseId = null; });
  saveItinerary(entries);
}

function renderExpenseTab() {
  const expenses = loadExpenses().slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const tbody = document.getElementById('expense-tbody');
  tbody.innerHTML = expenses.map(exp => `
    <tr data-id="${exp.id}">
      <td>${exp.date}</td>
      <td>${exp.time}</td>
      <td>${escapeHtml(exp.place || '')}</td>
      <td><span class="tag">${exp.category}</span></td>
      <td>${fmtAmount(exp.amount)} ${exp.currency}</td>
      <td>${exp.krw ? fmtAmount(Math.round(exp.krw)) + '원' : (exp.currency === 'KRW' ? '' : '<span style="color:#bbb">조회중...</span>')}</td>
      <td>${escapeHtml(exp.memo || '')}</td>
      <td><span class="tag">${sourceLabel(exp.source)}</span></td>
      <td><button class="btn small danger" data-del="${exp.id}">삭제</button></td>
    </tr>`).join('');

  const totalKrw = expenses.reduce((sum, e) => sum + (e.currency === 'KRW' ? e.amount : (e.krw || 0)), 0);
  const missing = expenses.filter(e => e.currency !== 'KRW' && !e.krw).length;
  document.getElementById('expense-summary').innerHTML = `
    <div class="summary-card"><div class="label">총 항목</div><div class="value">${expenses.length}건</div></div>
    <div class="summary-card"><div class="label">합계 (원화 환산)</div><div class="value">${fmtAmount(Math.round(totalKrw))}원</div></div>
    <div class="summary-card"><div class="label">환율 미조회</div><div class="value">${missing}건</div></div>
  `;
  document.getElementById('expense-status').textContent = expenses.length ? '행을 클릭하면 수정할 수 있습니다' : '아직 등록된 비용이 없습니다';

  expenses.filter(e => e.currency !== 'KRW' && !e.krw).forEach(e => refreshExpenseKrw(e.id));
}

function sourceLabel(s) {
  return s === 'photo' ? '사진분석' : s === 'itinerary' ? '일정연동' : '수기입력';
}

document.getElementById('expense-tbody').addEventListener('click', (e) => {
  const delBtn = e.target.closest('[data-del]');
  if (delBtn) {
    e.stopPropagation();
    if (confirm('이 비용 항목을 삭제할까요?')) { deleteExpense(delBtn.dataset.del); renderExpenseTab(); renderItineraryGrid(); }
    return;
  }
  const row = e.target.closest('tr[data-id]');
  if (row) openExpenseModal(row.dataset.id);
});

document.getElementById('btn-add-expense').addEventListener('click', () => openExpenseModal(null));

function openExpenseModal(expenseId) {
  const isNew = !expenseId;
  document.getElementById('expense-modal-title').textContent = isNew ? '비용 추가' : '비용 수정';
  document.getElementById('expense-id').value = expenseId || '';
  document.getElementById('expense-delete-btn').classList.toggle('hidden', isNew);

  let exp = { date: getTripDates()[0], time: '12:00', place: '', category: '식사', amount: '', currency: 'VND', memo: '' };
  if (!isNew) exp = loadExpenses().find(x => x.id === expenseId) || exp;

  document.getElementById('expense-date').value = exp.date;
  document.getElementById('expense-time').value = exp.time;
  document.getElementById('expense-place').value = exp.place || '';
  document.getElementById('expense-category').value = exp.category || '식사';
  document.getElementById('expense-amount').value = exp.amount || '';
  document.getElementById('expense-currency').value = exp.currency || 'VND';
  document.getElementById('expense-memo').value = exp.memo || '';

  openModal('modal-expense');
}

document.getElementById('expense-cancel-btn').addEventListener('click', () => closeModal('modal-expense'));

document.getElementById('expense-save-btn').addEventListener('click', () => {
  const id = document.getElementById('expense-id').value;
  const expenses = loadExpenses();
  const date = document.getElementById('expense-date').value;
  const time = document.getElementById('expense-time').value;
  const place = document.getElementById('expense-place').value.trim();
  const category = document.getElementById('expense-category').value;
  const amount = Number(document.getElementById('expense-amount').value);
  const currency = document.getElementById('expense-currency').value;
  const memo = document.getElementById('expense-memo').value.trim();

  if (!place) { toast('장소/항목을 입력해주세요'); return; }
  if (!amount) { toast('금액을 입력해주세요'); return; }

  let exp = expenses.find(x => x.id === id);
  if (!exp) {
    exp = { id: uid(), source: 'manual' };
    expenses.push(exp);
  }
  Object.assign(exp, { date, time, place, category, amount, currency, memo, krw: currency === 'KRW' ? amount : exp.krw });
  saveExpenses(expenses);
  if (currency !== 'KRW') refreshExpenseKrw(exp.id, true);
  renderExpenseTab();
  renderItineraryGrid();
  closeModal('modal-expense');
  toast('비용을 저장했습니다');
});

document.getElementById('expense-delete-btn').addEventListener('click', () => {
  const id = document.getElementById('expense-id').value;
  if (!id) return;
  if (!confirm('이 비용을 삭제할까요?')) return;
  deleteExpense(id);
  renderExpenseTab();
  renderItineraryGrid();
  closeModal('modal-expense');
  toast('비용을 삭제했습니다');
});

/* ---------------------------- 환율(VND/USD → KRW) ---------------------------- */

async function getRateToKrw(currency) {
  const cache = loadFxCache();
  const today = new Date().toISOString().slice(0, 10);
  const cacheEntry = cache[currency];
  if (cacheEntry && cacheEntry.fetchedOn === today) return cacheEntry.rate;

  const res = await fetch(`https://open.er-api.com/v6/latest/${currency}`);
  if (!res.ok) throw new Error('환율 API 응답 오류');
  const data = await res.json();
  const rate = data && data.rates && data.rates.KRW;
  if (!rate) throw new Error('환율 정보를 찾을 수 없습니다');

  cache[currency] = { rate, fetchedOn: today };
  saveFxCache(cache);
  return rate;
}

async function refreshExpenseKrw(expenseId, forceRerender) {
  const expenses = loadExpenses();
  const exp = expenses.find(x => x.id === expenseId);
  if (!exp || exp.currency === 'KRW') return;
  try {
    const rate = await getRateToKrw(exp.currency);
    exp.krw = exp.amount * rate;
    saveExpenses(expenses);
    if (document.getElementById('tab-expense').classList.contains('active')) renderExpenseTab();
  } catch (e) {
    console.warn('환율 조회 실패', e);
  }
}

/* ============================== 참고사항 탭 ============================== */

function renderReferenceTab() {
  const ref = loadReference();
  ['hanoi', 'sapa'].forEach(region => {
    const list = document.getElementById('ref-list-' + region);
    list.innerHTML = (ref[region] || []).map(item => `
      <li class="ref-item" data-id="${item.id}" data-region="${region}">
        <div class="ref-item-title"><span class="tag">${item.type}</span>${escapeHtml(item.name)}</div>
        <div class="ref-item-desc">${escapeHtml(item.desc || '')}</div>
      </li>`).join('');
  });
}

document.querySelectorAll('.ref-list').forEach(list => {
  list.addEventListener('click', (e) => {
    const li = e.target.closest('.ref-item');
    if (li) openRefModal(li.dataset.region, li.dataset.id);
  });
});
document.querySelectorAll('[data-add-ref]').forEach(btn => {
  btn.addEventListener('click', () => openRefModal(btn.dataset.addRef, null));
});

function openRefModal(region, itemId) {
  document.getElementById('ref-region').value = region;
  document.getElementById('ref-id').value = itemId || '';
  document.getElementById('ref-delete-btn').classList.toggle('hidden', !itemId);
  let item = { type: '맛집', name: '', desc: '' };
  if (itemId) {
    const ref = loadReference();
    item = (ref[region] || []).find(x => x.id === itemId) || item;
  }
  document.getElementById('ref-type').value = item.type;
  document.getElementById('ref-name').value = item.name;
  document.getElementById('ref-desc').value = item.desc;
  openModal('modal-ref');
}

document.getElementById('ref-cancel-btn').addEventListener('click', () => closeModal('modal-ref'));

document.getElementById('ref-save-btn').addEventListener('click', () => {
  const region = document.getElementById('ref-region').value;
  const id = document.getElementById('ref-id').value;
  const type = document.getElementById('ref-type').value;
  const name = document.getElementById('ref-name').value.trim();
  const desc = document.getElementById('ref-desc').value.trim();
  if (!name) { toast('이름을 입력해주세요'); return; }

  const ref = loadReference();
  ref[region] = ref[region] || [];
  let item = ref[region].find(x => x.id === id);
  if (!item) {
    item = { id: uid() };
    ref[region].push(item);
  }
  Object.assign(item, { type, name, desc });
  saveReference(ref);
  renderReferenceTab();
  closeModal('modal-ref');
  toast('저장했습니다');
});

document.getElementById('ref-delete-btn').addEventListener('click', () => {
  const region = document.getElementById('ref-region').value;
  const id = document.getElementById('ref-id').value;
  if (!id) return;
  if (!confirm('이 항목을 삭제할까요?')) return;
  const ref = loadReference();
  ref[region] = (ref[region] || []).filter(x => x.id !== id);
  saveReference(ref);
  renderReferenceTab();
  closeModal('modal-ref');
  toast('삭제했습니다');
});

/* ============================== 기본 대화 탭 ============================== */

function renderPhrasesTab(filter) {
  const cats = loadPhrases();
  const q = (filter || '').trim().toLowerCase();
  const wrap = document.getElementById('phrase-categories');
  wrap.innerHTML = cats.map(cat => {
    const phrases = cat.phrases.filter(p =>
      !q || p.vi.toLowerCase().includes(q) || p.ko.toLowerCase().includes(q) || cat.situation.toLowerCase().includes(q));
    if (q && phrases.length === 0) return '';
    return `<div class="phrase-category">
      <div class="phrase-category-head" data-cat="${cat.id}">${escapeHtml(cat.situation)} <span style="font-weight:normal;font-size:12px;color:#888">${phrases.length}개</span></div>
      <ul class="phrase-list">${phrases.map(p => `<li><span class="p-vi">${escapeHtml(p.vi)}</span><span class="p-ko">${escapeHtml(p.ko)}</span><span class="p-pron">[${escapeHtml(p.pron)}]</span></li>`).join('')}</ul>
    </div>`;
  }).join('');
}

document.getElementById('phrase-search').addEventListener('input', (e) => renderPhrasesTab(e.target.value));

document.getElementById('phrase-categories').addEventListener('click', (e) => {
  const head = e.target.closest('.phrase-category-head');
  if (!head) return;
  const list = head.nextElementSibling;
  list.style.display = list.style.display === 'none' ? '' : 'none';
});

/* ============================== 사진 분석 ============================== */

let photoModalMode = 'itinerary'; // 'itinerary' | 'expense'
let lastPhotoThumb = null;
let lastPhotoMeta = null;

document.getElementById('btn-upload-photo').addEventListener('click', () => {
  photoModalMode = 'itinerary';
  document.getElementById('photo-file-input').click();
});
document.getElementById('btn-upload-receipt').addEventListener('click', () => {
  photoModalMode = 'expense';
  document.getElementById('photo-file-input').click();
});

document.getElementById('photo-file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  await startPhotoAnalysis(file);
});

function resizeImageToDataUrl(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; }
        else if (height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality || 0.75));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readExifInfo(file) {
  return new Promise((resolve) => {
    try {
      EXIF.getData(file, function () {
        const dt = EXIF.getTag(this, 'DateTimeOriginal');
        const latArr = EXIF.getTag(this, 'GPSLatitude');
        const lonArr = EXIF.getTag(this, 'GPSLongitude');
        const latRef = EXIF.getTag(this, 'GPSLatitudeRef');
        const lonRef = EXIF.getTag(this, 'GPSLongitudeRef');
        let lat = null, lon = null;
        if (latArr && lonArr) {
          lat = dmsToDecimal(latArr, latRef);
          lon = dmsToDecimal(lonArr, lonRef);
        }
        let takenAt = null;
        if (dt) {
          const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/.exec(dt);
          if (m) takenAt = { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` };
        }
        resolve({ takenAt, lat, lon });
      });
    } catch (e) { resolve({ takenAt: null, lat: null, lon: null }); }
  });
}
function dmsToDecimal(dms, ref) {
  const deg = dms[0] + dms[1] / 60 + dms[2] / 3600;
  return (ref === 'S' || ref === 'W') ? -deg : deg;
}

async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ko`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.locality || data.city || data.principalSubdivision || null;
  } catch (e) { return null; }
}

const RECEIPT_ANALYSIS_PROMPT = `다음은 베트남(하노이/사파) 여행 중 촬영한 사진에서 OCR로 인식한 텍스트입니다. OCR 결과라 오탈자나 줄바꿈 깨짐이 있을 수 있습니다.
아래 JSON 형식으로만 답변하세요 (다른 설명 없이 JSON만):
{
  "is_receipt": true 또는 false (영수증/입장권/티켓으로 보이면 true),
  "vendor": "가게/장소 이름 또는 null",
  "amount": 숫자 또는 null (영수증일 경우 총액 숫자만, 통화 기호/구분자 제외),
  "currency": "VND" 또는 "KRW" 또는 "USD" 또는 null,
  "date_on_receipt": "YYYY-MM-DD" 또는 null,
  "time_on_receipt": "HH:MM" 또는 null,
  "category": "이동" "식사" "관광" "숙소" "쇼핑" "기타" 중 하나,
  "place_guess": "텍스트에서 유추한 장소 이름 (한국어, 알 수 없으면 null)",
  "description": "내용에 대한 한 문장 요약 (한국어)"
}`;

let _tesseractWorker = null;
async function getTesseractWorker() {
  if (_tesseractWorker) return _tesseractWorker;
  _tesseractWorker = await Tesseract.createWorker('eng+vie', 1, {
    workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
    corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd-lstm.wasm.js',
  });
  return _tesseractWorker;
}

async function ocrImage(dataUrl) {
  try {
    const worker = await getTesseractWorker();
    const { data } = await worker.recognize(dataUrl);
    return (data.text || '').replace(/\n+/g, ' ').trim();
  } catch (e) {
    console.warn('OCR 실패', e);
    return '';
  }
}

async function analyzeTextWithGroq(ocrText, apiKey, model) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model: model || 'llama-3.3-70b-versatile',
      max_tokens: 500,
      temperature: 0,
      messages: [
        { role: 'system', content: RECEIPT_ANALYSIS_PROMPT },
        { role: 'user', content: `OCR 텍스트:\n${ocrText}` },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`API 오류(${res.status}): ${t.slice(0, 150)}`);
  }
  const json = await res.json();
  const text = (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) || '';
  return parseJsonLoose(text);
}

function parseJsonLoose(text) {
  try { return JSON.parse(text); } catch (e) {}
  const m = /\{[\s\S]*\}/.exec(text);
  if (m) { try { return JSON.parse(m[0]); } catch (e) {} }
  return null;
}

async function startPhotoAnalysis(file) {
  const settings = loadSettings();
  document.getElementById('photo-result-fields').classList.add('hidden');
  document.getElementById('photo-save-btn').classList.add('hidden');
  document.getElementById('photo-analyze-status').textContent = '이미지 처리 중...';
  openModal('modal-photo');

  const resized = await resizeImageToDataUrl(file, 1024, 0.75);
  const thumb = await resizeImageToDataUrl(file, 400, 0.6);
  lastPhotoThumb = thumb;
  document.getElementById('photo-preview').src = resized;

  const exif = await readExifInfo(file);
  lastPhotoMeta = exif;

  let place = null;
  if (exif.lat && exif.lon) {
    document.getElementById('photo-analyze-status').textContent = '위치 정보 확인 중...';
    place = await reverseGeocode(exif.lat, exif.lon);
  }

  document.getElementById('photo-analyze-status').textContent = '사진에서 글자 인식 중 (OCR)...';
  const ocrText = await ocrImage(resized);

  let vision = null;
  if (settings.groqApiKey && ocrText.replace(/\s/g, '').length >= 2) {
    document.getElementById('photo-analyze-status').textContent = 'AI가 인식된 텍스트를 분석하는 중...';
    try {
      vision = await analyzeTextWithGroq(ocrText, settings.groqApiKey, settings.groqModel);
    } catch (e) {
      toast('AI 분석 실패: ' + e.message, 5000);
    }
  }

  applyPhotoAnalysisResult(exif, place, vision);
}

function applyPhotoAnalysisResult(exif, place, vision) {
  const isExpenseMode = photoModalMode === 'expense';
  const catSelect = document.getElementById('photo-category');
  const cats = isExpenseMode ? EXPENSE_CATEGORIES : ITINERARY_CATEGORIES;
  catSelect.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');

  const date = (vision && vision.date_on_receipt) || (exif.takenAt && exif.takenAt.date) || getTripDates()[0];
  const time = (vision && vision.time_on_receipt) || (exif.takenAt && exif.takenAt.time) || '12:00';
  const textParts = [];
  if (vision && vision.is_receipt && vision.vendor) textParts.push(vision.vendor);
  else if (vision && vision.place_guess) textParts.push(vision.place_guess);
  else if (place) textParts.push(place);
  if (vision && vision.description && !isExpenseMode) textParts.push(vision.description);
  const text = textParts.filter(Boolean).join(' - ') || place || '사진 기록';

  fillDateSelect(document.getElementById('photo-date'), getTripDates().includes(date) ? date : getTripDates()[0]);
  document.getElementById('photo-time').value = time;
  document.getElementById('photo-text').value = text;
  if (vision && vision.category) {
    const mapped = isExpenseMode ? (ITIN_TO_EXPENSE_CATEGORY[vision.category] || vision.category) : vision.category;
    if (cats.includes(mapped)) catSelect.value = mapped;
  }

  const isCostCheckbox = document.getElementById('photo-is-cost');
  const costFields = document.getElementById('photo-cost-fields');
  if (isExpenseMode) {
    document.getElementById('entry-lodging'); // no-op, keep structure
    isCostCheckbox.checked = true;
    isCostCheckbox.parentElement.classList.add('hidden');
    costFields.classList.remove('hidden');
  } else {
    isCostCheckbox.parentElement.classList.remove('hidden');
    isCostCheckbox.checked = !!(vision && vision.is_receipt);
    costFields.classList.toggle('hidden', !isCostCheckbox.checked);
  }
  document.getElementById('photo-cost-amount').value = (vision && vision.amount) || '';
  document.getElementById('photo-cost-currency').value = (vision && vision.currency) || 'VND';

  document.getElementById('photo-result-fields').classList.remove('hidden');
  document.getElementById('photo-save-btn').classList.remove('hidden');
  document.getElementById('photo-analyze-status').textContent = vision
    ? 'AI 분석 완료 — 내용을 확인하고 저장하세요'
    : (exif.takenAt || exif.lat ? '사진 메타데이터로 추정했습니다 — 내용을 확인하고 저장하세요' : '자동 인식된 정보가 없습니다 — 직접 입력 후 저장하세요');
}

document.getElementById('photo-is-cost').addEventListener('change', (e) => {
  document.getElementById('photo-cost-fields').classList.toggle('hidden', !e.target.checked);
});

document.getElementById('photo-cancel-btn').addEventListener('click', () => closeModal('modal-photo'));

document.getElementById('photo-save-btn').addEventListener('click', () => {
  const date = document.getElementById('photo-date').value;
  const time = document.getElementById('photo-time').value;
  const text = document.getElementById('photo-text').value.trim();
  const category = document.getElementById('photo-category').value;
  const isCost = document.getElementById('photo-is-cost').checked;
  const costAmount = document.getElementById('photo-cost-amount').value;
  const costCurrency = document.getElementById('photo-cost-currency').value;

  if (!text) { toast('내용을 입력해주세요'); return; }

  if (photoModalMode === 'expense') {
    if (!costAmount) { toast('금액을 입력해주세요'); return; }
    const expenses = loadExpenses();
    const exp = { id: uid(), source: 'photo', date, time, place: text, category, amount: Number(costAmount), currency: costCurrency, memo: '' };
    expenses.push(exp);
    saveExpenses(expenses);
    if (costCurrency !== 'KRW') refreshExpenseKrw(exp.id, true);
    renderExpenseTab();
    toast('사진으로 비용을 추가했습니다');
  } else {
    const entries = loadItinerary();
    const entry = { id: uid(), date, time, text, category, lodging: false, expenseId: null, photoThumb: lastPhotoThumb, photoMeta: lastPhotoMeta };
    entries.push(entry);
    if (isCost && costAmount) {
      syncEntryCost(entry, Number(costAmount), costCurrency, text);
    }
    saveItinerary(entries);
    renderItineraryGrid();
    renderExpenseTab();
    toast('사진으로 일정을 추가했습니다');
  }
  closeModal('modal-photo');
});

/* ============================== 구글 시트 내보내기 ============================== */

function buildGridData() {
  const dates = getTripDates();
  const entries = loadItinerary();
  const header = ['시간', ...dates.map(formatDateLabel)];
  const rows = [header];
  for (let h = 0; h < 24; h++) {
    const row = [`${h}:00`];
    for (const d of dates) {
      const cellEntries = entries.filter(e => e.date === d && !e.lodging && parseInt(e.time.split(':')[0], 10) === h);
      row.push(cellEntries.map(e => `${e.time} ${e.text}`).join(' / '));
    }
    rows.push(row);
  }
  const lodgingRow = ['숙소'];
  for (const d of dates) {
    lodgingRow.push(entries.filter(e => e.date === d && e.lodging).map(e => e.text).join(', '));
  }
  rows.push(lodgingRow);
  return rows;
}

document.getElementById('btn-export-sheet').addEventListener('click', () => {
  const settings = loadSettings();
  if (!settings.googleClientId) {
    toast('먼저 설정에서 Google 클라이언트 ID를 입력해주세요');
    openSettingsModal();
    return;
  }
  if (!window.google || !google.accounts || !google.accounts.oauth2) {
    toast('Google 로그인 스크립트를 아직 불러오는 중입니다. 잠시 후 다시 시도하세요.');
    return;
  }
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: settings.googleClientId,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    callback: async (resp) => {
      if (resp.error) { toast('Google 인증 실패: ' + resp.error); return; }
      await writeItineraryToSheet(resp.access_token);
    },
  });
  tokenClient.requestAccessToken();
});

async function writeItineraryToSheet(accessToken) {
  toast('구글 시트에 저장하는 중...');
  const settings = loadSettings();
  const grid = buildGridData();
  try {
    let spreadsheetId = settings.googleSpreadsheetId;
    if (!spreadsheetId) {
      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties: { title: '하노이 사파 여행 일정' }, sheets: [{ properties: { title: '일정' } }] }),
      });
      const createJson = await createRes.json();
      if (!createRes.ok) throw new Error((createJson.error && createJson.error.message) || '시트 생성 실패');
      spreadsheetId = createJson.spreadsheetId;
      settings.googleSpreadsheetId = spreadsheetId;
      saveSettings(settings);
    }
    const range = encodeURIComponent('일정!A1');
    const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: grid }),
    });
    const updateJson = await updateRes.json();
    if (!updateRes.ok) throw new Error((updateJson.error && updateJson.error.message) || '값 쓰기 실패');
    toast('구글 시트 저장 완료! 새 탭에서 엽니다.');
    window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`, '_blank');
  } catch (e) {
    toast('오류: ' + e.message, 5000);
  }
}

/* ================================ 설정 ================================ */

function openSettingsModal() {
  const s = loadSettings();
  document.getElementById('settings-start-date').value = s.startDate;
  document.getElementById('settings-end-date').value = s.endDate;
  document.getElementById('settings-groq-key').value = s.groqApiKey || '';
  document.getElementById('settings-groq-model').value = s.groqModel || 'llama-3.3-70b-versatile';
  document.getElementById('settings-google-client-id').value = s.googleClientId || '';
  openModal('modal-settings');
}
document.getElementById('btn-settings').addEventListener('click', openSettingsModal);
document.getElementById('settings-cancel-btn').addEventListener('click', () => closeModal('modal-settings'));

document.getElementById('settings-save-btn').addEventListener('click', () => {
  const s = loadSettings();
  s.startDate = document.getElementById('settings-start-date').value || s.startDate;
  s.endDate = document.getElementById('settings-end-date').value || s.endDate;
  s.groqApiKey = document.getElementById('settings-groq-key').value.trim();
  s.groqModel = document.getElementById('settings-groq-model').value.trim() || 'llama-3.3-70b-versatile';
  s.googleClientId = document.getElementById('settings-google-client-id').value.trim();
  saveSettings(s);
  renderItineraryGrid();
  closeModal('modal-settings');
  toast('설정을 저장했습니다');
});

/* ================================ 초기화 ================================ */

seedDefaultsIfEmpty();
renderItineraryGrid();
renderExpenseTab();
renderReferenceTab();
renderPhrasesTab();
