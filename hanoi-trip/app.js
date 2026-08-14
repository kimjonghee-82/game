/* ==========================================================================
   하노이·사파 여행 플래너
   모든 데이터는 브라우저 localStorage 에만 저장됩니다 (서버/백엔드 없음).
   ========================================================================== */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

const STORAGE_KEYS = {
  settings: 'hanoi_trip_settings_v1',
  itinerary: 'hanoi_trip_itinerary_v1',
  expenses: 'hanoi_trip_expenses_v1',
  reference: 'hanoi_trip_reference_v1',
  phrases: 'hanoi_trip_phrases_v1',
  fxCache: 'hanoi_trip_fx_cache_v1',
  otherVideos: 'hanoi_trip_other_videos_v1',
  translations: 'hanoi_trip_translations_v1',
  documents: 'hanoi_trip_documents_v1',
  localDocuments: 'hanoi_trip_local_documents_v1',
};

/** 여러 기기 간 실시간 동기화 대상 (Firestore 로 미러링됨). 번역/음성 기록 등은 기기 로컬 전용. */
const SYNC_STORAGE_KEYS = [STORAGE_KEYS.itinerary, STORAGE_KEYS.expenses, STORAGE_KEYS.reference, STORAGE_KEYS.otherVideos, STORAGE_KEYS.documents];

const TRANSLATE_SOURCE_LANGS = ['자동 감지', '베트남어', '영어', '중국어', '일본어'];

const ITINERARY_CATEGORIES = ['이동', '식사', '관광', '숙소', '쇼핑', '기타'];
const EXPENSE_CATEGORIES = ['교통', '식사', '관광/입장료', '숙박', '쇼핑', '기타'];
const ITIN_TO_EXPENSE_CATEGORY = {
  '이동': '교통', '식사': '식사', '관광': '관광/입장료',
  '숙소': '숙박', '쇼핑': '쇼핑', '기타': '기타',
};
const EXPENSE_CATEGORY_ICONS = {
  '교통': '🚌', '식사': '🍴', '관광/입장료': '🎫', '숙박': '🏨', '쇼핑': '🛍️', '기타': '📦',
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

/** 위시리스트 카테고리별 기본 항목("하노이·사파에서 꼭 먹어봐야 할 음식" 정리표 기준) */
const DEFAULT_WISHLIST = {
  wish_hanoi_food: [
    { type: '음식', name: '분짜 (Bún chả)', desc: '숯불에 구운 돼지고기와 새콤달콤한 느억맘 소스에 국수를 찍어 먹는 하노이 대표 요리. 추천: 분짜 닥킴, 꾸안안응온' },
    { type: '음식', name: '쌀국수 (Phở)', desc: '깊고 진한 육수와 부드러운 고기, 향긋한 허브가 어우러진 베트남 대표 쌀국수. 추천: 퍼틴, 퍼자' },
    { type: '음식', name: '반미 (Bánh mì)', desc: '바삭한 바게트에 고기·채소·소스가 듬뿍 들어간 베트남식 샌드위치. 추천: 반미25, 반미포홍' },
    { type: '음식', name: '반쎄오 (Bánh xèo)', desc: '쌀가루 반죽에 새우·돼지고기·숙주를 넣어 바삭하게 부친 베트남식 부침개. 추천: 반쎄오46A' },
    { type: '음식', name: '넴느엉 (Nem nướng)', desc: '숯불에 구운 돼지고기 완자구이. 채소·라이스페이퍼와 함께 싸먹는 인기 메뉴. 추천: 넴느엉 항동' },
    { type: '음식', name: '짜조 (Chả giò)', desc: '바삭하게 튀긴 베트남식 스프링롤. 속이 알차고 누구나 좋아하는 맛. 추천: 짜조 끼시에우' },
    { type: '음식', name: '분더우맘톰 (Bún đậu mắm tôm)', desc: '두부·돼지고기·쌀국수를 새우젓 소스에 찍어 먹는 음식. 호불호가 있을 수 있어요' },
    { type: '음식', name: '껌짱 / 볶음밥 (Cơm rang)', desc: '베트남식 볶음밥! 새우·닭고기·소고기 등 다양하게 즐길 수 있어요' },
    { type: '음식', name: '라우 / 전골 (Lẩu)', desc: '신선한 재료를 육수에 넣어 익혀 먹는 전골 요리 (소고기·해산물·채소 등)' },
    { type: '음식', name: '해산물 요리', desc: '새우·게·조개·오징어 등 신선한 해산물을 구이·찜·볶음으로 다양하게 즐기기' },
  ],
  wish_sapa_food: [
    { type: '음식', name: '연어 / 철갑상어 요리', desc: '전골·구이·찜·샐러드 등 신선하고 담백한 사파 대표 음식' },
    { type: '음식', name: '숯불 삼겹살 / 목살 구이', desc: '두툼한 고기를 숯불에 구워 채소·쌈장과 함께 먹는 현지 인기 메뉴' },
    { type: '음식', name: '흑닭 요리', desc: '쫄깃한 흑닭으로 만든 백숙·구이·전골 등 영양가 높은 사파 보양식' },
    { type: '음식', name: '대나무 찹쌀밥 (Cơm lam)', desc: '대나무 안에 찹쌀·콩·코코넛 밀크를 넣어 구운 사파 전통 음식. 향긋하고 고소해요' },
    { type: '음식', name: '산나물 볶음', desc: '사파의 신선한 산나물을 마늘과 함께 볶아 담백하고 건강한 맛' },
    { type: '음식', name: '버섯 요리', desc: '사파는 버섯이 유명해요! 볶음·전골·구이 등으로 다양하게 즐기기' },
    { type: '음식', name: '옥수수 구이', desc: '달콤하고 고소한 옥수수, 밤 간식으로 최고!' },
    { type: '음식', name: '오색 찹쌀밥 (Xôi ngũ sắc)', desc: '천연 재료로 색을 낸 예쁘고 건강한 사파 음식' },
    { type: '음식', name: '숯불 꼬치 구이', desc: '돼지고기·소고기·닭고기 등 다양한 꼬치구이! 야시장에서 부담 없이 즐기세요' },
    { type: '음식', name: '훈제 물소고기 (Trâu gác bếp)', desc: '훈제해 말린 물소고기 육포! 쫄깃하고 짭짤한 술안주, 간식으로 인기' },
    { type: '음식', name: '밤 요리', desc: '사파 밤은 달콤해요! 구워 먹거나 간식으로' },
    { type: '음식', name: '사과주 / 옥수수주', desc: '타오에오주, 옥수수주 등 사파에서만 맛볼 수 있는 특산 술' },
  ],
  wish_snacks: [
    { type: '간식', name: '반짱느엉 (Bánh tráng nướng)', desc: '베트남식 라이스페이퍼 피자! 돼지고기 등을 얹어 구운 길거리 간식' },
    { type: '간식', name: '반꾸온 (Bánh cuốn)', desc: '얇은 쌀떡피에 고기·목이버섯 등을 말아 만든 요리' },
    { type: '간식', name: '반깐 (Bánh căn)', desc: '작은 팬케이크! 다양한 재료를 넣어 만드는 길거리 간식' },
    { type: '간식', name: '짜까 (Chả cá)', desc: '생선을 향신료와 함께 구운 하노이 명물 길거리 간식' },
    { type: '간식', name: '코코넛 아이스크림', desc: '시원하고 달콤한 베트남 대표 디저트' },
    { type: '간식', name: '베트남식 요거트 (Sữa chua)', desc: '달콤하고 진한 현지 요거트' },
    { type: '간식', name: '계란빵 (Bánh trứng)', desc: '폭신하고 달콤한 베트남식 에그타르트/계란빵' },
  ],
  wish_fruits: [
    { type: '과일', name: '망고 (Xoài)', desc: '' },
    { type: '과일', name: '용과 (Thanh long)', desc: '' },
    { type: '과일', name: '수박 (Dưa hấu)', desc: '' },
    { type: '과일', name: '패션프루트 (Chanh leo)', desc: '' },
    { type: '과일', name: '망고스틴 (Măng cụt)', desc: '' },
    { type: '과일', name: '두리안 (Sầu riêng)', desc: '' },
    { type: '과일', name: '리치 (Vải)', desc: '' },
    { type: '과일', name: '롱안 (Nhãn)', desc: '' },
    { type: '과일', name: '람부탄 (Chôm chôm)', desc: '' },
    { type: '과일', name: '구아바 (Ổi)', desc: '' },
  ],
  wish_drinks: [
    { type: '음료', name: '에그커피 (Cà phê trứng)', desc: '달콤한 계란 크림이 올라간 하노이 명물 커피' },
    { type: '음료', name: '코코넛커피 (Cà phê dừa)', desc: '코코넛 아이스크림처럼 진한 커피' },
    { type: '음료', name: '연유커피 (Cà phê sữa đá)', desc: '연유의 달콤함이 가득한 베트남 대표 커피' },
    { type: '음료', name: '블랙커피 (Cà phê đen/nóng đá)', desc: '진하고 깊은 향의 베트남 로컬 스타일 커피' },
    { type: '음료', name: '코코넛 주스 (Nước dừa)', desc: '시원한 생코코넛 주스' },
    { type: '음료', name: '망고 스무디', desc: '향이 가득한 망고 스무디' },
    { type: '음료', name: '수박 주스', desc: '시원하고 달콤한 수박 주스' },
    { type: '음료', name: '사탕수수 주스', desc: '은은한 단맛의 사탕수수 주스' },
    { type: '음료', name: '연꽃차 (Trà sen)', desc: '향긋한 연꽃 향의 전통차' },
    { type: '음료', name: '연잎차 (Trà lá sen)', desc: '은은한 향의 연잎차' },
    { type: '음료', name: '계피차 (Trà quế)', desc: '따뜻하고 향긋한 계피차' },
  ],
  wish_alcohol: [
    { type: '주류', name: '사이공 스페셜 (Saigon Special)', desc: '' },
    { type: '주류', name: '하노이 맥주 (Bia Hà Nội)', desc: '' },
    { type: '주류', name: '333 맥주 (Ba Ba Ba)', desc: '' },
    { type: '주류', name: '타이거 맥주 (Tiger)', desc: '' },
  ],
  wish_tips: [
    { type: '팁', name: '고수 빼주세요', desc: '"Không rau mùi" (코옹 라우 무이)' },
    { type: '팁', name: '안 맵게 해주세요', desc: '"Không cay" (코옹 까이)' },
    { type: '팁', name: '베트남 물은 석회질이 많아요', desc: '수돗물 대신 생수 구매를 추천해요' },
    { type: '팁', name: '길거리 음식은 위생 상태 확인', desc: '사람 많고 회전 빠른 곳을 고르면 더 안전해요' },
    { type: '팁', name: '현금(VND) 준비하기', desc: '흥정은 미소와 함께 😊' },
  ],
  wish_howto: [
    { type: '방법', name: '쌈채소에 싸서 소스에 찍어 먹기', desc: '' },
    { type: '방법', name: '라이스페이퍼에 싸서 먹기', desc: '' },
    { type: '방법', name: '국수·쌀밥과 곁들여 먹기', desc: '' },
    { type: '방법', name: '핫팟(전골)은 여럿이 나눠 먹기', desc: '' },
  ],
  wish_areas: [
    { type: '지역', name: '호안끼엠 구시가지(Old Quarter) 주변', desc: '하노이' },
    { type: '지역', name: '떠이호(서호) 지역', desc: '하노이' },
    { type: '지역', name: '롯데센터 & 하노이역 주변', desc: '하노이' },
    { type: '지역', name: '미딩 / 짬자 / 틴비엔 지역', desc: '하노이' },
    { type: '지역', name: '사파 마켓 주변', desc: '사파' },
    { type: '지역', name: '센크라자 주변', desc: '사파' },
    { type: '지역', name: '깟깟마을 가는 길', desc: '사파' },
    { type: '지역', name: '따반 / 라오까이 지역', desc: '사파' },
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

/* 사용자가 정리해둔 실제 일정표(엑셀)를 옮겨온 기본 데이터. 처음 실행 시 한 번만 채워지며,
   이미 일정이 있으면(사용자가 뭔가 추가/수정했으면) 절대 덮어쓰지 않음. */
const SEED_ITINERARY = [
  { date: '2026-08-15', time: '08:30', text: '집 출발', category: '이동' },
  { date: '2026-08-15', time: '09:10', text: '리무진 출발', category: '이동' },
  { date: '2026-08-15', time: '12:00', text: '국민은행 환전', category: '기타' },
  { date: '2026-08-15', time: '13:00', text: '약국에서 멀미약·고산병약', category: '쇼핑' },
  { date: '2026-08-15', time: '14:00', text: '신세계면세점', category: '쇼핑' },
  { date: '2026-08-15', time: '19:55', text: '인천출발 T1', category: '이동' },
  { date: '2026-08-15', time: '22:50', text: '하노이 도착 T2', category: '이동' },
  { date: '2026-08-15', time: '15:00', text: '르퍼폼', category: '숙소', lodging: true },

  { date: '2026-08-16', time: '21:50', text: '역 도착', category: '이동' },
  { date: '2026-08-16', time: '22:40', text: '열차 출발', category: '이동' },
  { date: '2026-08-16', time: '15:00', text: '슬리핑기차', category: '숙소', lodging: true },

  { date: '2026-08-17', time: '06:25', text: '사파 도착, 픽업밴', category: '관광' },
  { date: '2026-08-17', time: '08:00', text: '캣캣힐스 도착', category: '관광' },
  { date: '2026-08-17', time: '15:00', text: '캣캣힐스', category: '숙소', lodging: true },

  { date: '2026-08-18', time: '15:00', text: '캣캣힐스', category: '숙소', lodging: true },

  { date: '2026-08-19', time: '09:00', text: '픽업서비스???', category: '이동' },
  { date: '2026-08-19', time: '11:00', text: '버스 출발', category: '이동' },
  { date: '2026-08-19', time: '15:00', text: '슬리핑버스', category: '숙소', lodging: true },

  { date: '2026-08-20', time: '15:00', text: '자르댕', category: '숙소', lodging: true },
  { date: '2026-08-21', time: '15:00', text: '자르댕', category: '숙소', lodging: true },

  { date: '2026-08-22', time: '08:00', text: '하노이 출발', category: '이동' },
  { date: '2026-08-22', time: '09:20', text: '공항 도착', category: '이동' },
  { date: '2026-08-22', time: '12:20', text: '하노이 출발 (항공편)', category: '이동' },
  { date: '2026-08-22', time: '15:00', text: '기내', category: '숙소', lodging: true },

  { date: '2026-08-23', time: '06:40', text: '인천 도착', category: '이동' },
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
  if (SYNC_STORAGE_KEYS.includes(key)) scheduleSyncPush();
}

function loadSettings() {
  return load(STORAGE_KEYS.settings, {
    startDate: '2026-08-15',
    endDate: '2026-08-23',
    groqApiKey: '',
    groqVisionModel: '',
    googleClientId: '',
    googleSpreadsheetId: '',
    translateSourceLang: '베트남어',
    tripCode: '',
  });
}
function saveSettings(s) { save(STORAGE_KEYS.settings, s); }

function loadItinerary() { return load(STORAGE_KEYS.itinerary, []); }
function saveItinerary(v) { save(STORAGE_KEYS.itinerary, v); }
function loadExpenses() { return load(STORAGE_KEYS.expenses, []); }
function saveExpenses(v) { save(STORAGE_KEYS.expenses, v); }
/** 예전 데이터엔 위시리스트 지역이 없었으므로, 없으면 빈 배열로 자동 추가 */
function loadReference() {
  const v = load(STORAGE_KEYS.reference, null);
  // 이전 버전엔 위시리스트가 카테고리 구분 없이 하나의 배열이었음. 그 데이터를 잃지 않도록
  // 새 "기타" 카테고리로 자동 이관.
  if (v && Array.isArray(v.wishlist)) {
    v.wish_etc = [...(v.wish_etc || []), ...v.wishlist];
    delete v.wishlist;
    save(STORAGE_KEYS.reference, v);
  }
  // 위시리스트 카테고리를 한 번도 채운 적이 없으면(카테고리 키 자체가 없으면) 기본 음식 목록으로 채워줌.
  // 사용자가 나중에 전부 지워도 다시 채워지지 않도록, 키가 하나라도 존재하면 건드리지 않음.
  if (v && !REF_WISHLIST_CATEGORIES.some(c => c.key in v)) {
    REF_WISHLIST_CATEGORIES.forEach(c => {
      v[c.key] = (DEFAULT_WISHLIST[c.key] || []).map(item => ({ id: uid(), done: false, ...item }));
    });
    save(STORAGE_KEYS.reference, v);
  }
  return v;
}
function saveReference(v) { save(STORAGE_KEYS.reference, v); }
function loadPhrases() { return load(STORAGE_KEYS.phrases, null); }
function savePhrases(v) { save(STORAGE_KEYS.phrases, v); }
function loadFxCache() { return load(STORAGE_KEYS.fxCache, {}); }
function saveFxCache(v) { save(STORAGE_KEYS.fxCache, v); }
/** 예전엔 영상이 평평한 배열로 저장됐음. 장소별 객체로 자동 이관해서 기존 영상을 잃지 않도록 함. */
function loadVideos() {
  const v = load(STORAGE_KEYS.otherVideos, null);
  if (Array.isArray(v)) {
    const migrated = { hanoi: v, sapa: [] };
    save(STORAGE_KEYS.otherVideos, migrated);
    return migrated;
  }
  return v || { hanoi: [], sapa: [] };
}
function saveVideos(v) { save(STORAGE_KEYS.otherVideos, v); }
function loadTranslations() { return load(STORAGE_KEYS.translations, []); }
function saveTranslations(v) { save(STORAGE_KEYS.translations, v); }
function loadDocuments() { return load(STORAGE_KEYS.documents, []); }
function saveDocuments(v) { save(STORAGE_KEYS.documents, v); }
/** 이 기기에 오프라인 사본(Cache Storage)이 있는 자료 id 목록. 기기 로컬 전용이라 동기화되지 않음.
    예전엔 로컬 자료가 loadDocuments()와 별개인 전체 레코드로 저장됐었는데, 지금은 자료 하나가
    링크와 오프라인 사본을 동시에 가질 수 있도록 메타데이터는 loadDocuments()로 통합하고 여기는
    "이 기기에 오프라인 사본이 있는지"만 id로 표시. 예전 형식 데이터는 최초 로드 시 자동 이관. */
function loadLocalCacheIds() {
  const raw = load(STORAGE_KEYS.localDocuments, []);
  if (raw.length && raw[0] && typeof raw[0] === 'object' && 'name' in raw[0]) {
    const docs = loadDocuments();
    raw.forEach(old => {
      if (!docs.find(d => d.id === old.id)) {
        docs.push({ id: old.id, name: old.name, kind: old.kind, topic: old.topic || '기타', url: null, addedAt: old.addedAt || Date.now() });
      }
    });
    saveDocuments(docs);
    const ids = raw.map(old => old.id);
    save(STORAGE_KEYS.localDocuments, ids);
    return ids;
  }
  return raw;
}
function saveLocalCacheIds(v) { save(STORAGE_KEYS.localDocuments, v); }
function localDocCacheKey(id) { return location.origin + '/__local-doc__/' + id; }

/* ============================== 실시간 동기화 (Firebase Firestore) ==============================
   일정/비용/투어 정보/기타(영상) 데이터를 기기 간 실시간으로 동기화합니다.
   firebaseConfig 의 apiKey 는 비밀키가 아니라 공개돼도 되는 값이며(구글 공식 안내),
   실제 데이터 보호는 Firestore 보안 규칙(트립 코드 문서 단위)으로 처리합니다. */

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCkoOhA13JI_ZeESSzPG_K3ZUEdQMWBdBw',
  authDomain: 'hanoi-trip-54221.firebaseapp.com',
  projectId: 'hanoi-trip-54221',
  storageBucket: 'hanoi-trip-54221.firebasestorage.app',
  messagingSenderId: '946787204606',
  appId: '1:946787204606:web:f5b58d59d7a185099094af',
};
const DEFAULT_TRIP_CODE = 'hanoi-sapa-2026';

let syncDb = null;
let syncUnsub = null;
let syncPushTimer = null;
let syncApplyingRemote = false;

function getTripCode() {
  const s = loadSettings();
  return (s.tripCode || '').trim() || DEFAULT_TRIP_CODE;
}

function setSyncStatus(state) {
  const el = document.getElementById('sync-status');
  if (!el) return;
  el.className = 'sync-status ' + state;
  el.title = state === 'synced' ? '동기화됨' : state === 'connecting' ? '동기화 연결 중' : '동기화 오류 (오프라인으로 계속 사용 가능)';
}

function initSync() {
  if (!window.firebase) return;
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    syncDb = firebase.firestore();
    attachSyncListener();
  } catch (e) {
    console.error('sync init failed', e);
    setSyncStatus('error');
  }
}

function attachSyncListener() {
  if (!syncDb) return;
  if (syncUnsub) { syncUnsub(); syncUnsub = null; }
  setSyncStatus('connecting');
  const ref = syncDb.collection('trips').doc(getTripCode());
  syncUnsub = ref.onSnapshot((snap) => {
    setSyncStatus('synced');
    if (snap.metadata.hasPendingWrites || !snap.exists) return;
    const data = snap.data();
    syncApplyingRemote = true;
    let changed = false;
    if (data.itinerary !== undefined && JSON.stringify(data.itinerary) !== JSON.stringify(loadItinerary())) { saveItinerary(data.itinerary); changed = true; }
    if (data.expenses !== undefined && JSON.stringify(data.expenses) !== JSON.stringify(loadExpenses())) { saveExpenses(data.expenses); changed = true; }
    if (data.reference !== undefined && JSON.stringify(data.reference) !== JSON.stringify(loadReference())) { saveReference(data.reference); changed = true; }
    if (data.otherVideos !== undefined && JSON.stringify(data.otherVideos) !== JSON.stringify(loadVideos())) { saveVideos(data.otherVideos); changed = true; }
    if (data.documents !== undefined && JSON.stringify(data.documents) !== JSON.stringify(loadDocuments())) { saveDocuments(data.documents); changed = true; }
    syncApplyingRemote = false;
    if (changed) {
      renderItineraryGrid();
      renderExpenseTab();
      renderReferenceTab();
      renderOtherTab();
      renderDocDrawer();
      toast('다른 기기의 변경사항을 동기화했어요');
    }
  }, (err) => {
    console.error('sync listen error', err);
    setSyncStatus('error');
  });
}

function pushSyncNow() {
  if (!syncDb) return Promise.reject(new Error('동기화가 연결되지 않았습니다'));
  return syncDb.collection('trips').doc(getTripCode()).set({
    itinerary: loadItinerary(),
    expenses: loadExpenses(),
    reference: loadReference(),
    otherVideos: loadVideos(),
    documents: loadDocuments(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  }, { merge: true }).catch(e => { console.error('sync push failed', e); setSyncStatus('error'); throw e; });
}

function scheduleSyncPush() {
  if (syncApplyingRemote || !syncDb) return;
  clearTimeout(syncPushTimer);
  syncPushTimer = setTimeout(pushSyncNow, 500);
}

/* ============================== 자료함 (바우처·여권 등 PDF/사진, 구글 드라이브 링크) ============================== */

function isDriveFolderLink(url) {
  return /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\//.test(url || '');
}

function parseDocLink(url) {
  const u = (url || '').trim();
  if (!u) return null;
  if (isDriveFolderLink(u)) return null;
  const gd = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/.exec(u);
  if (gd) return { type: 'gdrive', id: gd[1] };
  if (/^https?:\/\//i.test(u)) return { type: 'file', src: u };
  return null;
}

const LOCAL_DOC_CACHE_NAME = 'hanoi-trip-local-docs';

function getDocTopics() {
  const topics = new Set();
  loadDocuments().forEach(d => { if (d.topic) topics.add(d.topic); });
  return Array.from(topics);
}

function renderDocDrawer() {
  const localIds = new Set(loadLocalCacheIds()); // 먼저 호출: 예전 형식 로컬 자료 이관이 여기서 일어남
  const docs = loadDocuments();
  const list = document.getElementById('doc-list');
  if (!docs.length) {
    list.innerHTML = '<div class="exp-empty">아래 버튼으로 자료를 추가해보세요</div>';
    return;
  }
  const sorted = [...docs].sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
  const groups = {};
  const order = [];
  sorted.forEach(d => {
    const topic = d.topic || '기타';
    if (!groups[topic]) { groups[topic] = []; order.push(topic); }
    groups[topic].push(d);
  });
  list.innerHTML = order.map(topic => `
    <div class="doc-group">
      <div class="doc-group-title">${escapeHtml(topic)}</div>
      ${groups[topic].map(d => {
        const hasLink = !!d.url;
        const hasLocal = localIds.has(d.id);
        const badge = hasLink && hasLocal ? '☁️ 동기화 · 📵 오프라인' : hasLink ? '☁️ 동기화됨' : '📵 이 기기에만(오프라인)';
        return `
        <div class="doc-item" data-id="${d.id}">
          <div class="doc-icon">${d.kind === 'photo' ? '🖼️' : '📄'}</div>
          <div class="doc-info">
            <div class="doc-name">${escapeHtml(d.name)}</div>
            <div class="doc-meta">${d.kind === 'photo' ? '사진' : 'PDF/문서'} · ${badge}</div>
          </div>
        </div>`;
      }).join('')}
    </div>`).join('');
}

function openDocDrawer() {
  document.getElementById('doc-drawer').classList.add('open');
  document.getElementById('doc-drawer-backdrop').classList.remove('hidden');
}
function closeDocDrawer() {
  document.getElementById('doc-drawer').classList.remove('open');
  document.getElementById('doc-drawer-backdrop').classList.add('hidden');
}
document.getElementById('doc-drawer-tab').addEventListener('click', openDocDrawer);
document.getElementById('doc-drawer-close-btn').addEventListener('click', closeDocDrawer);
document.getElementById('doc-drawer-backdrop').addEventListener('click', closeDocDrawer);

function docAddRowTemplate() {
  const div = document.createElement('div');
  div.className = 'doc-add-row';
  div.innerHTML = `
    <input type="text" class="doc-row-name" placeholder="이름 (예: 대한항공 e티켓)">
    <input type="text" class="doc-row-link" placeholder="구글 드라이브 공유 링크 (선택)">
    <button type="button" class="btn small ghost doc-row-file-btn">📥 오프라인 파일 선택 (선택)</button>
    <input type="file" class="doc-row-file hidden" accept="application/pdf,image/*">
    <div class="doc-add-row-foot">
      <select class="doc-row-kind">
        <option value="pdf">PDF/문서</option>
        <option value="photo">사진</option>
      </select>
      <button type="button" class="doc-row-remove-btn" title="제거">✕</button>
    </div>`;
  return div;
}
function addDocAddRow() {
  document.getElementById('doc-add-rows').appendChild(docAddRowTemplate());
}
document.getElementById('doc-add-row-btn').addEventListener('click', addDocAddRow);
document.getElementById('doc-add-rows').addEventListener('change', (e) => {
  if (e.target.classList.contains('doc-row-file')) {
    const row = e.target.closest('.doc-add-row');
    const file = e.target.files[0];
    row.querySelector('.doc-row-file-btn').textContent = file ? '📥 ' + file.name : '📥 오프라인 파일 선택 (선택)';
  }
});
document.getElementById('doc-add-rows').addEventListener('click', (e) => {
  const fileBtn = e.target.closest('.doc-row-file-btn');
  if (fileBtn) { fileBtn.closest('.doc-add-row').querySelector('.doc-row-file').click(); return; }
  const removeBtn = e.target.closest('.doc-row-remove-btn');
  if (removeBtn) {
    const rows = document.querySelectorAll('.doc-add-row');
    if (rows.length <= 1) return;
    removeBtn.closest('.doc-add-row').remove();
  }
});

document.getElementById('btn-doc-upload').addEventListener('click', () => {
  document.getElementById('doc-add-topic').value = '';
  document.getElementById('doc-topic-list').innerHTML = getDocTopics().map(t => `<option value="${escapeHtml(t)}">`).join('');
  document.getElementById('doc-add-rows').innerHTML = '';
  addDocAddRow();
  openModal('modal-doc-add');
});
document.getElementById('doc-add-cancel-btn').addEventListener('click', () => closeModal('modal-doc-add'));
document.getElementById('doc-add-save-btn').addEventListener('click', async () => {
  const topic = document.getElementById('doc-add-topic').value.trim() || '기타';
  const rows = Array.from(document.querySelectorAll('.doc-add-row'));
  const toAdd = [];
  let skipped = 0;
  for (const row of rows) {
    const name = row.querySelector('.doc-row-name').value.trim();
    const link = row.querySelector('.doc-row-link').value.trim();
    const file = row.querySelector('.doc-row-file').files[0];
    const kind = row.querySelector('.doc-row-kind').value;
    if (!name && !link && !file) continue;
    const validLink = link && !isDriveFolderLink(link) && parseDocLink(link) ? link : null;
    if (!name || (!validLink && !file)) { skipped++; continue; }
    toAdd.push({ name, kind, url: validLink, file: file || null });
  }
  if (!toAdd.length) {
    toast(skipped ? '인식할 수 있는 자료가 없어요. 이름과 링크(또는 파일)를 확인해주세요' : '추가할 자료를 입력해주세요');
    return;
  }

  const docs = loadDocuments();
  const localIds = loadLocalCacheIds();
  let cache = null;
  for (const item of toAdd) {
    const id = uid();
    docs.push({ id, name: item.name, kind: item.kind, url: item.url, topic, addedAt: Date.now() });
    if (item.file) {
      try {
        if (!cache) cache = await caches.open(LOCAL_DOC_CACHE_NAME);
        await cache.put(localDocCacheKey(id), new Response(item.file, { headers: { 'Content-Type': item.file.type || 'application/octet-stream' } }));
        localIds.push(id);
      } catch (e) {
        console.error('local doc add failed', e);
      }
    }
  }
  saveDocuments(docs);
  saveLocalCacheIds(localIds);
  renderDocDrawer();
  closeModal('modal-doc-add');
  toast(`${toAdd.length}개 자료를 추가했습니다` + (skipped ? ` (인식 안 된 ${skipped}개는 제외)` : ''));
});

async function deleteDocument(id) {
  const docs = loadDocuments();
  saveDocuments(docs.filter((x) => x.id !== id));
  const localIds = loadLocalCacheIds();
  if (localIds.includes(id)) {
    const cache = await caches.open(LOCAL_DOC_CACHE_NAME);
    await cache.delete(localDocCacheKey(id));
    saveLocalCacheIds(localIds.filter((x) => x !== id));
  }
  renderDocDrawer();
}

async function openDocViewer(id) {
  const d = loadDocuments().find((x) => x.id === id);
  if (!d) return;
  document.getElementById('doc-viewer-title').textContent = d.name;
  const body = document.getElementById('doc-viewer-body');
  const dl = document.getElementById('doc-viewer-download-btn');
  const hasLocal = loadLocalCacheIds().includes(id);

  let shown = false;
  if (hasLocal) {
    const cache = await caches.open(LOCAL_DOC_CACHE_NAME);
    const res = await cache.match(localDocCacheKey(id));
    if (res) {
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      body.innerHTML = d.kind === 'photo'
        ? `<img src="${blobUrl}" alt="${escapeHtml(d.name)}">`
        : `<iframe src="${blobUrl}" title="${escapeHtml(d.name)}"></iframe>`;
      dl.href = blobUrl;
      dl.setAttribute('download', d.name);
      dl.textContent = '다운로드';
      shown = true;
    }
  }
  if (!shown) {
    const parsed = parseDocLink(d.url);
    if (parsed && parsed.type === 'gdrive') {
      body.innerHTML = `<iframe src="https://drive.google.com/file/d/${parsed.id}/preview" title="${escapeHtml(d.name)}" allow="autoplay"></iframe>`;
      dl.href = `https://drive.google.com/file/d/${parsed.id}/view`;
      dl.removeAttribute('download');
      dl.textContent = '구글 드라이브에서 열기';
    } else if (parsed && parsed.type === 'file') {
      body.innerHTML = d.kind === 'photo'
        ? `<img src="${escapeHtml(d.url)}" alt="${escapeHtml(d.name)}">`
        : `<iframe src="${escapeHtml(d.url)}" title="${escapeHtml(d.name)}"></iframe>`;
      dl.href = d.url;
      dl.setAttribute('download', d.name);
      dl.textContent = '다운로드';
    } else {
      body.innerHTML = '<div class="doc-broken">열 수 있는 자료가 없습니다</div>';
      dl.removeAttribute('href');
      dl.textContent = '다운로드';
    }
  }
  document.getElementById('doc-viewer-delete-btn').dataset.id = id;
  openModal('modal-doc-viewer');
}

document.getElementById('doc-list').addEventListener('click', (e) => {
  const item = e.target.closest('.doc-item');
  if (item) openDocViewer(item.dataset.id);
});
document.getElementById('doc-viewer-close-btn').addEventListener('click', () => closeModal('modal-doc-viewer'));
document.getElementById('doc-viewer-delete-btn').addEventListener('click', (e) => {
  if (!confirm('이 자료를 삭제할까요?')) return;
  deleteDocument(e.target.dataset.id);
  closeModal('modal-doc-viewer');
});

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
  if (loadItinerary().length === 0) {
    saveItinerary(SEED_ITINERARY.map(e => ({
      id: uid(), vendor: '', place: '', mapUrl: '', expenseId: null,
      photoThumb: null, photoMeta: null, lodging: false, ...e,
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

function dateStrLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateRange(start, end) {
  const out = [];
  let d = new Date(start + 'T00:00:00');
  const endD = new Date(end + 'T00:00:00');
  while (d <= endD) {
    out.push(dateStrLocal(d));
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
  return dateRange(s.startDate, s.endDate);
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

/* ============================== 날짜 이동(하루 단위 보기) ============================== */

function todayStr() {
  return dateStrLocal(new Date());
}

function computeInitialViewDate() {
  const dates = getTripDates();
  if (!dates.length) return null;
  const t = todayStr();
  if (t < dates[0]) return dates[0];
  if (t > dates[dates.length - 1]) return dates[dates.length - 1];
  return dates.includes(t) ? t : dates[0];
}

let viewDate = computeInitialViewDate();

function shiftViewDate(delta) {
  const dates = getTripDates();
  let idx = dates.indexOf(viewDate);
  if (idx === -1) idx = 0;
  idx = Math.min(dates.length - 1, Math.max(0, idx + delta));
  viewDate = dates[idx];
  renderItineraryGrid();
  renderExpenseTab();
}
function goToToday() {
  viewDate = computeInitialViewDate();
  renderItineraryGrid();
  renderExpenseTab();
}

function renderDayNav(prefix) {
  const dates = getTripDates();
  if (!dates.includes(viewDate)) viewDate = computeInitialViewDate();
  const idx = dates.indexOf(viewDate);
  document.getElementById(prefix + '-day-label').textContent =
    `${formatDateLabel(viewDate)} · ${idx + 1}/${dates.length}일차`;
  document.getElementById(prefix + '-prev-day').disabled = idx <= 0;
  document.getElementById(prefix + '-next-day').disabled = idx >= dates.length - 1;
}

document.getElementById('itin-prev-day').addEventListener('click', () => shiftViewDate(-1));
document.getElementById('itin-next-day').addEventListener('click', () => shiftViewDate(1));
document.getElementById('itin-today-btn').addEventListener('click', goToToday);
document.getElementById('exp-prev-day').addEventListener('click', () => shiftViewDate(-1));
document.getElementById('exp-next-day').addEventListener('click', () => shiftViewDate(1));
document.getElementById('exp-today-btn').addEventListener('click', goToToday);

/** 일정/비용 화면을 좌우로 스와이프해서 하루씩 이동 */
function swipeShiftDayFor(elId) {
  return function (delta) {
    const before = viewDate;
    shiftViewDate(delta);
    if (viewDate === before) return; // 첫날/마지막날 경계 - 변화 없음
    playSwipeAnim(document.getElementById(elId), delta);
  };
}
attachSwipeNav(document.getElementById('tab-itinerary'), swipeShiftDayFor('itinerary-day-view'));
attachSwipeNav(document.getElementById('tab-expense'), swipeShiftDayFor('expense-list'));

/* ============================== 일정 탭 ============================== */

function fillDateSelect(selectEl, selectedDate) {
  const dates = getTripDates();
  selectEl.innerHTML = dates.map(d => `<option value="${d}">${formatDateLabel(d)}</option>`).join('');
  if (selectedDate) selectEl.value = selectedDate;
}

function renderItineraryGrid() {
  renderDayNav('itin');
  const entries = loadItinerary();
  const dayEntries = entries.filter(e => e.date === viewDate && !e.lodging)
    .sort((a, b) => a.time.localeCompare(b.time));
  const lodgingEntries = entries.filter(e => e.date === viewDate && e.lodging);

  let html = dayEntries.length
    ? dayEntries.map(e => renderTimelineItem(e)).join('')
    : '<div class="tl-empty">이 날은 아직 일정이 없어요. 아래 + 버튼으로 추가해보세요.</div>';

  const lodgingText = lodgingEntries.map(e => escapeHtml(e.text)).join(', ');
  html += `<div class="tl-lodging" data-lodging="1">🏨 ${lodgingText || '<span class="tl-lodging-empty">숙소 정보 추가</span>'}</div>`;

  document.getElementById('itinerary-day-view').innerHTML = html;
  document.getElementById('itinerary-status').textContent = `이 날 ${dayEntries.length}개 일정`;
}

function renderTimelineItem(e) {
  const costHtml = e.expenseId ? renderChipCost(e.expenseId) : '';
  const subChips = [];
  if (e.vendor) subChips.push(`<span class="tl-chip">${escapeHtml(e.vendor)}</span>`);
  if (e.place) subChips.push(`<span class="tl-chip">📍 ${escapeHtml(e.place)}</span>`);
  return `<div class="tl-item" data-entry-id="${e.id}">
    <div class="tl-time">${e.time}</div>
    <div class="tl-rail"><span class="tl-dot"></span><span class="tl-connector"></span></div>
    <div class="tl-content">
      <div class="tl-title">${escapeHtml(e.text)}${e.photoThumb ? '<span class="tl-photo-mark">📷</span>' : ''}${costHtml}</div>
      ${subChips.length ? `<div class="tl-sub">${subChips.join('')}</div>` : ''}
    </div>
  </div>`;
}
function renderChipCost(expenseId) {
  const exp = loadExpenses().find(x => x.id === expenseId);
  if (!exp) return '';
  return `<span class="tl-cost">${fmtAmount(exp.amount)} ${exp.currency}</span>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

document.getElementById('itinerary-day-view').addEventListener('click', (e) => {
  const item = e.target.closest('.tl-item');
  if (item) { openEntryModal(item.dataset.entryId); return; }
  const lodgingRow = e.target.closest('.tl-lodging');
  if (lodgingRow) {
    const existing = loadItinerary().find(x => x.date === viewDate && x.lodging);
    if (existing) openEntryModal(existing.id);
    else openEntryModal(null, { date: viewDate, time: '15:00', lodging: true });
  }
});

document.getElementById('btn-add-entry').addEventListener('click', () => openEntryModal(null, { date: viewDate }));

let pendingEntryPhoto = null; // {thumb, meta} set by "사진으로 채우기", applied on save

function openEntryModal(entryId, prefill) {
  const isNew = !entryId;
  document.getElementById('entry-modal-title').textContent = isNew ? '일정 추가' : '일정 수정';
  document.getElementById('entry-id').value = entryId || '';
  fillDateSelect(document.getElementById('entry-date'));
  document.getElementById('entry-delete-btn').classList.toggle('hidden', isNew);
  document.getElementById('entry-photo-status').textContent = '';
  pendingEntryPhoto = null;

  let entry = { date: viewDate || getTripDates()[0], time: '09:00', text: '', vendor: '', place: '', mapUrl: '', category: '이동', lodging: false, expenseId: null, photoThumb: null, photoMeta: null };
  if (!isNew) {
    entry = { ...entry, ...(loadItinerary().find(x => x.id === entryId) || {}) };
  } else if (prefill) {
    entry = { ...entry, ...prefill };
  }

  document.getElementById('entry-date').value = entry.date;
  document.getElementById('entry-time').value = entry.time;
  updateKoreaTimeDisplay();
  refreshLocationMode();
  document.getElementById('entry-text').value = entry.text || '';
  document.getElementById('entry-vendor').value = entry.vendor || '';
  document.getElementById('entry-place').value = entry.place || '';
  document.getElementById('entry-map-url').value = entry.mapUrl || '';
  document.getElementById('entry-category').value = entry.category || '이동';
  document.getElementById('entry-lodging').checked = !!entry.lodging;

  const linkedExpense = entry.expenseId ? loadExpenses().find(x => x.id === entry.expenseId) : null;
  document.getElementById('entry-cost-amount').value = linkedExpense ? linkedExpense.amount : '';
  document.getElementById('entry-cost-currency').value = linkedExpense ? linkedExpense.currency : 'VND';

  openModal('modal-entry');
}

function toKoreaTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  let kh = h + 2;
  let suffix = '';
  if (kh >= 24) { kh -= 24; suffix = ' (다음날)'; }
  return `${String(kh).padStart(2, '0')}:${String(m).padStart(2, '0')}${suffix}`;
}
function formatTimeAmPm(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h < 12 ? '오전' : '오후';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${period} ${h12}:${String(m).padStart(2, '0')}`;
}

/* 지금 있는 위치가 한국인지 GPS로 확인해서, 한국이면 입력 시간을 한국 시간으로,
   해외(여행지)면 현지 시간을 메인으로 보여주고 아래 회색 글씨로 한국 시간을 덧붙임 */
let locationMode = 'unknown'; // 'korea' | 'abroad' | 'unknown'
function isKoreaCoords(lat, lon) {
  return lat >= 33.0 && lat <= 38.7 && lon >= 124.5 && lon <= 131.9;
}
function refreshLocationMode() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      locationMode = isKoreaCoords(pos.coords.latitude, pos.coords.longitude) ? 'korea' : 'abroad';
      updateKoreaTimeDisplay();
    },
    () => { /* 위치 권한 거부/실패 - 기본(해외 가정) 표시 유지 */ },
    { timeout: 8000, maximumAge: 10 * 60 * 1000 }
  );
}

function updateKoreaTimeDisplay() {
  const t = document.getElementById('entry-time').value;
  const labelText = document.getElementById('entry-time-label-text');
  const krLine = document.getElementById('entry-kr-time');
  if (locationMode === 'korea') {
    labelText.textContent = '시간 (한국)';
    krLine.textContent = '';
  } else {
    labelText.textContent = '현지 시간';
    krLine.textContent = t ? `🇰🇷 한국 시간 ${toKoreaTime(t)} · 베트남보다 2시간 빠름` : '';
  }
}
document.getElementById('entry-time').addEventListener('input', updateKoreaTimeDisplay);

function buildMapUrl(vendor, place) {
  const q = (vendor || place || '').trim();
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : '';
}
document.getElementById('entry-map-open-btn').addEventListener('click', () => {
  const manual = document.getElementById('entry-map-url').value.trim();
  const vendor = document.getElementById('entry-vendor').value.trim();
  const place = document.getElementById('entry-place').value.trim();
  const url = manual || buildMapUrl(vendor, place);
  if (!url) { toast('상호나 장소를 먼저 입력해주세요'); return; }
  window.open(url, '_blank');
});

document.getElementById('entry-cancel-btn').addEventListener('click', () => closeModal('modal-entry'));

document.getElementById('entry-save-btn').addEventListener('click', () => {
  const id = document.getElementById('entry-id').value;
  const entries = loadItinerary();
  const date = document.getElementById('entry-date').value;
  const time = document.getElementById('entry-time').value;
  const text = document.getElementById('entry-text').value.trim();
  const vendor = document.getElementById('entry-vendor').value.trim();
  const place = document.getElementById('entry-place').value.trim();
  const mapUrl = document.getElementById('entry-map-url').value.trim();
  const category = document.getElementById('entry-category').value;
  const lodging = document.getElementById('entry-lodging').checked;
  const costAmount = document.getElementById('entry-cost-amount').value;
  const costCurrency = document.getElementById('entry-cost-currency').value;

  if (!text) { toast('내용을 입력해주세요'); return; }
  if (!time) { toast('시간을 입력해주세요'); return; }

  let entry = entries.find(x => x.id === id);
  if (!entry) {
    entry = { id: uid(), date, time, text, vendor, place, mapUrl, category, lodging, expenseId: null, photoThumb: null, photoMeta: null };
    entries.push(entry);
  } else {
    Object.assign(entry, { date, time, text, vendor, place, mapUrl, category, lodging });
  }
  if (pendingEntryPhoto) {
    entry.photoThumb = pendingEntryPhoto.thumb;
    entry.photoMeta = pendingEntryPhoto.meta;
    pendingEntryPhoto = null;
  }

  syncEntryCost(entry, costAmount ? Number(costAmount) : null, costCurrency, vendor || text);
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

/* ============================== 비용 탭 ============================== */

function deleteExpense(expenseId) {
  const expenses = loadExpenses().filter(x => x.id !== expenseId);
  saveExpenses(expenses);
  const entries = loadItinerary();
  entries.forEach(e => { if (e.expenseId === expenseId) e.expenseId = null; });
  saveItinerary(entries);
}

let expenseCumulativeView = false;

function renderExpenseTab() {
  renderDayNav('exp');
  const allExpenses = loadExpenses();
  const dayExpenses = allExpenses.filter(e => e.date === viewDate).sort((a, b) => a.time.localeCompare(b.time));
  const list = document.getElementById('expense-list');
  list.innerHTML = dayExpenses.length
    ? dayExpenses.map(exp => `
      <div class="exp-row" data-id="${exp.id}">
        <div class="exp-icon">${EXPENSE_CATEGORY_ICONS[exp.category] || '📦'}</div>
        <div class="exp-main">
          <div class="exp-title">${escapeHtml(exp.place || '')}</div>
          <div class="exp-time">${formatTimeAmPm(exp.time)}${exp.memo ? ' · ' + escapeHtml(exp.memo) : ''}</div>
        </div>
        <div class="exp-amounts">
          <div class="exp-krw">${exp.currency === 'KRW' ? fmtAmount(exp.amount) + '원' : (exp.krw ? fmtAmount(Math.round(exp.krw)) + '원' : '조회중')}</div>
          ${exp.currency !== 'KRW' ? `<div class="exp-orig">${fmtAmount(exp.amount)} ${exp.currency}</div>` : ''}
        </div>
      </div>`).join('')
    : '<div class="exp-empty">아래 버튼으로 비용을 추가해보세요</div>';

  const dates = getTripDates();
  const dayIdx = dates.indexOf(viewDate);
  const totalExpenses = expenseCumulativeView
    ? allExpenses.filter(e => dates.indexOf(e.date) !== -1 && dates.indexOf(e.date) <= dayIdx)
    : dayExpenses;

  const totalKrw = totalExpenses.reduce((sum, e) => sum + (e.currency === 'KRW' ? e.amount : (e.krw || 0)), 0);
  const origSums = {};
  totalExpenses.forEach(e => {
    if (e.currency === 'KRW') return;
    origSums[e.currency] = (origSums[e.currency] || 0) + e.amount;
  });
  document.getElementById('expense-total-krw').innerHTML = (expenseCumulativeView ? '<span class="expense-total-prefix">누적 합계 </span>' : '') + fmtAmount(Math.round(totalKrw)) + '원';
  document.getElementById('expense-total-orig').textContent = Object.keys(origSums)
    .map(cur => `${fmtAmount(origSums[cur])} ${cur}`)
    .join(' · ');
  document.getElementById('expense-total').classList.toggle('cumulative', expenseCumulativeView);

  allExpenses.filter(e => e.currency !== 'KRW' && !e.krw).forEach(e => refreshExpenseKrw(e.id));
}

document.getElementById('expense-total').addEventListener('click', () => {
  expenseCumulativeView = !expenseCumulativeView;
  renderExpenseTab();
});

document.getElementById('expense-list').addEventListener('click', (e) => {
  const row = e.target.closest('.exp-row');
  if (row) openExpenseModal(row.dataset.id);
});

document.getElementById('btn-add-expense').addEventListener('click', () => openExpenseModal(null));

function openExpenseModal(expenseId) {
  const isNew = !expenseId;
  document.getElementById('expense-modal-title').textContent = isNew ? '비용 추가' : '비용 수정';
  document.getElementById('expense-id').value = expenseId || '';
  document.getElementById('expense-delete-btn').classList.toggle('hidden', isNew);

  let exp = { date: viewDate || getTripDates()[0], time: '12:00', place: '', category: '식사', amount: '', currency: 'VND', memo: '' };
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
  const today = todayStr();
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

/* ============================== 투어 정보 탭 ============================== */

/** 위시리스트 안의 고정 음식 카테고리(순서 고정). 명소(하노이/사파)와 달리 사용자가 임의로 늘릴 수 없음. */
const REF_WISHLIST_CATEGORIES = [
  { key: 'wish_hanoi_food', label: '하노이 대표 음식' },
  { key: 'wish_sapa_food', label: '사파 추천 음식' },
  { key: 'wish_snacks', label: '간식 & 길거리 음식' },
  { key: 'wish_fruits', label: '열대 과일' },
  { key: 'wish_drinks', label: '커피 & 음료' },
  { key: 'wish_alcohol', label: '맥주 & 술' },
  { key: 'wish_tips', label: '식사 팁' },
  { key: 'wish_howto', label: '즐기는 방법' },
  { key: 'wish_areas', label: '추천 맛집 지역' },
  { key: 'wish_etc', label: '기타' },
];
const REGION_LABELS = Object.assign(
  { hanoi: '하노이', sapa: '사파' },
  Object.fromEntries(REF_WISHLIST_CATEGORIES.map(c => [c.key, c.label]))
);
function regionLabel(key) { return REGION_LABELS[key] || key; }
function regionKeyForLabel(label) {
  const found = Object.keys(REGION_LABELS).find(k => REGION_LABELS[k] === label);
  return found || label;
}

/** 하노이/사파를 앞에 두고 그 외 커스텀 장소는 뒤에 붙이는 공통 정렬 규칙 (기타 탭 영상 등에서도 사용) */
function orderedRegionKeys(dataObj) {
  const keys = Object.keys(dataObj);
  const ordered = ['hanoi', 'sapa'].filter(k => keys.includes(k));
  const extra = keys.filter(k => k !== 'hanoi' && k !== 'sapa');
  return [...ordered, ...extra];
}

let refGroup = 'spots'; // 'wishlist' | 'spots'
let refRegion = 'hanoi';

function getWishlistRegionKeys() { return REF_WISHLIST_CATEGORIES.map(c => c.key); }
/** 명소는 하노이/사파를 기본으로 하되, "장소" 필드로 직접 입력한 커스텀 도시도 뒤에 붙음 */
function getSpotRegionKeys() {
  const keys = Object.keys(loadReference()).filter(k => !k.startsWith('wish_'));
  return orderedRegionKeys(Object.fromEntries(keys.map(k => [k, true])));
}
function getRegionKeys() {
  return refGroup === 'wishlist' ? getWishlistRegionKeys() : getSpotRegionKeys();
}

function renderRefGroupTabs() {
  document.getElementById('ref-group-tabs').innerHTML = `
    <button type="button" class="ref-group-btn${refGroup === 'wishlist' ? ' active' : ''}" data-group="wishlist">위시리스트</button>
    <button type="button" class="ref-group-btn${refGroup === 'spots' ? ' active' : ''}" data-group="spots">명소</button>`;
}
document.getElementById('ref-group-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.ref-group-btn');
  if (!btn || btn.dataset.group === refGroup) return;
  refGroup = btn.dataset.group;
  refRegion = getRegionKeys()[0];
  renderReferenceTab();
});

function renderRegionTabs() {
  const keys = getRegionKeys();
  if (!keys.includes(refRegion)) refRegion = keys[0] || 'hanoi';
  document.getElementById('region-tabs').innerHTML = keys.map(k =>
    `<button class="region-tab-btn${k === refRegion ? ' active' : ''}" data-region="${k}">${escapeHtml(regionLabel(k))}</button>`
  ).join('');
}

function renderReferenceTab() {
  renderRefGroupTabs();
  renderRegionTabs();
  const ref = loadReference();
  const items = ref[refRegion] || [];
  const isWishlist = refGroup === 'wishlist';
  const list = document.getElementById('ref-list-active');
  list.innerHTML = items.map(item => `
    <li class="ref-item${item.done ? ' done' : ''}" data-id="${item.id}">
      <div class="ref-item-row">
        ${isWishlist ? `<input type="checkbox" class="ref-item-check" data-id="${item.id}"${item.done ? ' checked' : ''} title="완료 체크">` : ''}
        <div class="ref-item-title"><span class="tag">${escapeHtml(item.type)}</span>${escapeHtml(item.name)}</div>
        <button type="button" class="icon-btn ref-item-map-btn" data-id="${item.id}" title="지도에서 보기">🗺️</button>
      </div>
      <div class="ref-item-desc">${escapeHtml(item.desc || '')}</div>
    </li>`).join('');
}

document.getElementById('region-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.region-tab-btn');
  if (!btn) return;
  refRegion = btn.dataset.region;
  renderReferenceTab();
});

function playSwipeAnim(el, delta) {
  el.style.setProperty('--swipe-dir', delta > 0 ? '24px' : '-24px');
  el.classList.remove('swipe-anim');
  void el.offsetWidth; // 애니메이션 재시작을 위한 강제 리플로우
  el.classList.add('swipe-anim');
}

/** 하노이/사파(및 추가된 지역) 사이를 화면 스와이프로 이동 */
function goToAdjacentRegion(delta) {
  const keys = getRegionKeys();
  const idx = keys.indexOf(refRegion);
  const nextIdx = idx + delta;
  if (nextIdx < 0 || nextIdx >= keys.length) return;
  refRegion = keys[nextIdx];
  renderReferenceTab();
  playSwipeAnim(document.getElementById('ref-list-active'), delta);
}

/** 화면을 좌우로 미는 동작을 감지해서 콜백(delta: -1|1)을 실행 */
function attachSwipeNav(sectionEl, onSwipe) {
  let startX = 0, startY = 0, tracking = false;
  sectionEl.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    startX = t.clientX; startY = t.clientY; tracking = true;
  }, { passive: true });
  sectionEl.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      onSwipe(dx < 0 ? 1 : -1);
    }
  }, { passive: true });
}

attachSwipeNav(document.getElementById('tab-reference'), goToAdjacentRegion);

document.getElementById('ref-list-active').addEventListener('click', (e) => {
  const checkbox = e.target.closest('.ref-item-check');
  if (checkbox) {
    e.stopPropagation();
    const ref = loadReference();
    const item = (ref[refRegion] || []).find(x => x.id === checkbox.dataset.id);
    if (item) {
      item.done = checkbox.checked;
      saveReference(ref);
      renderReferenceTab();
    }
    return;
  }
  const mapBtn = e.target.closest('.ref-item-map-btn');
  if (mapBtn) {
    e.stopPropagation();
    const ref = loadReference();
    const item = (ref[refRegion] || []).find(x => x.id === mapBtn.dataset.id);
    const url = (item && item.mapUrl) || buildMapUrl(item && item.name);
    if (!url) { toast('이름을 먼저 입력해주세요'); return; }
    window.open(url, '_blank');
    return;
  }
  const li = e.target.closest('.ref-item');
  if (li) openRefModal(refRegion, li.dataset.id);
});
document.getElementById('btn-add-ref').addEventListener('click', () => openRefModal(refRegion, null));

const REF_KNOWN_TYPES = ['맛집', '명소', '마사지'];
document.getElementById('ref-type').addEventListener('change', (e) => {
  document.getElementById('ref-type-custom').classList.toggle('hidden', e.target.value !== '__custom__');
});

function openRefModal(region, itemId) {
  document.getElementById('ref-id').value = itemId || '';
  document.getElementById('ref-region-original').value = region;
  document.getElementById('ref-delete-btn').classList.toggle('hidden', !itemId);
  document.getElementById('ref-photo-status').textContent = '';

  const isWishlist = REF_WISHLIST_CATEGORIES.some(c => c.key === region);
  document.getElementById('ref-region-select-wrap').classList.toggle('hidden', !isWishlist);
  document.getElementById('ref-region-input-wrap').classList.toggle('hidden', isWishlist);
  if (isWishlist) {
    document.getElementById('ref-region-select').innerHTML =
      REF_WISHLIST_CATEGORIES.map(c => `<option value="${c.key}">${escapeHtml(c.label)}</option>`).join('');
    document.getElementById('ref-region-select').value = region;
  } else {
    document.getElementById('ref-region-list').innerHTML =
      getSpotRegionKeys().map(k => `<option value="${escapeHtml(regionLabel(k))}">`).join('');
    document.getElementById('ref-region-input').value = regionLabel(region);
  }

  let item = { type: '맛집', name: '', desc: '', mapUrl: '', website: '' };
  if (itemId) {
    const ref = loadReference();
    item = { ...item, ...((ref[region] || []).find(x => x.id === itemId) || {}) };
  }
  if (REF_KNOWN_TYPES.includes(item.type)) {
    document.getElementById('ref-type').value = item.type;
    document.getElementById('ref-type-custom').value = '';
    document.getElementById('ref-type-custom').classList.add('hidden');
  } else {
    document.getElementById('ref-type').value = '__custom__';
    document.getElementById('ref-type-custom').value = item.type || '';
    document.getElementById('ref-type-custom').classList.remove('hidden');
  }
  document.getElementById('ref-name').value = item.name;
  document.getElementById('ref-desc').value = item.desc;
  document.getElementById('ref-map-url').value = item.mapUrl || '';
  document.getElementById('ref-website').value = item.website || '';
  openModal('modal-ref');
}

document.getElementById('ref-cancel-btn').addEventListener('click', () => closeModal('modal-ref'));

document.getElementById('ref-map-open-btn').addEventListener('click', () => {
  const name = document.getElementById('ref-name').value.trim();
  const manual = document.getElementById('ref-map-url').value.trim();
  const url = manual || buildMapUrl(name);
  if (!url) { toast('이름을 먼저 입력해주세요'); return; }
  window.open(url, '_blank');
});

document.getElementById('ref-save-btn').addEventListener('click', () => {
  const id = document.getElementById('ref-id').value;
  const originalRegion = document.getElementById('ref-region-original').value;
  const isWishlistField = !document.getElementById('ref-region-select-wrap').classList.contains('hidden');
  let region;
  if (isWishlistField) {
    region = document.getElementById('ref-region-select').value;
  } else {
    const regionLabelInput = document.getElementById('ref-region-input').value.trim();
    if (!regionLabelInput) { toast('장소를 입력해주세요'); return; }
    region = regionKeyForLabel(regionLabelInput);
  }
  const typeSelect = document.getElementById('ref-type').value;
  const type = typeSelect === '__custom__' ? (document.getElementById('ref-type-custom').value.trim() || '기타') : typeSelect;
  const name = document.getElementById('ref-name').value.trim();
  const desc = document.getElementById('ref-desc').value.trim();
  const mapUrl = document.getElementById('ref-map-url').value.trim();
  const website = document.getElementById('ref-website').value.trim();
  if (!name) { toast('이름을 입력해주세요'); return; }

  const ref = loadReference();
  if (id && originalRegion && originalRegion !== region) {
    ref[originalRegion] = (ref[originalRegion] || []).filter(x => x.id !== id);
  }
  ref[region] = ref[region] || [];
  let item = ref[region].find(x => x.id === id);
  if (!item) {
    item = { id: uid() };
    ref[region].push(item);
  }
  Object.assign(item, { type, name, desc, mapUrl, website });
  saveReference(ref);
  refRegion = region;
  renderReferenceTab();
  closeModal('modal-ref');
  toast('저장했습니다');
});

document.getElementById('ref-delete-btn').addEventListener('click', () => {
  const region = document.getElementById('ref-region-original').value;
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

document.getElementById('ref-photo-btn').addEventListener('click', () => document.getElementById('ref-photo-input').click());
document.getElementById('ref-photo-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const result = await analyzePhoto(file, document.getElementById('ref-photo-status'));

  const name = result.vendor || result.description;
  if (name) document.getElementById('ref-name').value = name;
  if (result.description && result.description !== name) document.getElementById('ref-desc').value = result.description;
  document.getElementById('ref-type').value = result.category === '식사' ? '맛집' : '명소';
  document.getElementById('ref-type-custom').classList.add('hidden');
  if (result.website) document.getElementById('ref-website').value = result.website;
  const mapUrl = buildMapUrl(name, result.place);
  if (mapUrl) document.getElementById('ref-map-url').value = mapUrl;
});

/* ============================== 기본 대화 탭 ============================== */

let phraseIndex = 0;

function renderPhrasesTab() {
  const cats = loadPhrases();
  if (phraseIndex > cats.length - 1) phraseIndex = cats.length - 1;
  if (phraseIndex < 0) phraseIndex = 0;
  const cat = cats[phraseIndex];

  document.getElementById('phrase-nav-label').textContent = cat ? `${cat.situation} · ${phraseIndex + 1}/${cats.length}` : '';
  document.getElementById('phrase-prev-btn').disabled = phraseIndex <= 0;
  document.getElementById('phrase-next-btn').disabled = phraseIndex >= cats.length - 1;

  document.getElementById('phrase-category-view').innerHTML = cat
    ? `<ul class="phrase-list">${cat.phrases.map(p => `<li><span class="p-vi">${escapeHtml(p.vi)}</span><span class="p-ko">${escapeHtml(p.ko)}</span><span class="p-pron">[${escapeHtml(p.pron)}]</span></li>`).join('')}</ul>`
    : '';
}

function shiftPhraseIndex(delta) {
  const cats = loadPhrases();
  const before = phraseIndex;
  phraseIndex = Math.min(cats.length - 1, Math.max(0, phraseIndex + delta));
  renderPhrasesTab();
  if (phraseIndex === before) return;
  playSwipeAnim(document.getElementById('phrase-category-view'), delta);
}

document.getElementById('phrase-prev-btn').addEventListener('click', () => shiftPhraseIndex(-1));
document.getElementById('phrase-next-btn').addEventListener('click', () => shiftPhraseIndex(1));
attachSwipeNav(document.getElementById('tab-phrases'), shiftPhraseIndex);

/* ============================== 기타(영상) 탭 ============================== */

function parseVideoEmbed(url) {
  const u = (url || '').trim();
  if (!u) return null;
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(u)) return { type: 'file', src: u };
  const yt = /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/.exec(u);
  if (yt) return { type: 'youtube', id: yt[1] };
  const gd = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/.exec(u);
  if (gd) return { type: 'gdrive', id: gd[1] };
  return null;
}

let videoRegion = 'hanoi';

function getVideoRegionKeys() {
  return orderedRegionKeys(loadVideos());
}

function renderVideoRegionTabs() {
  const keys = getVideoRegionKeys();
  if (!keys.includes(videoRegion)) videoRegion = keys[0] || 'hanoi';
  document.getElementById('video-region-tabs').innerHTML =
    keys.map(k => `<button class="region-tab-btn${k === videoRegion ? ' active' : ''}" data-region="${k}">${escapeHtml(regionLabel(k))}</button>`).join('')
    + `<button type="button" class="region-tab-add-btn" id="btn-add-video-region" title="장소 추가">+</button>`;
}

function renderOtherTab() {
  renderVideoRegionTabs();
  const videos = loadVideos();
  const items = videos[videoRegion] || [];
  const list = document.getElementById('other-video-list');
  list.innerHTML = items.length
    ? items.map(v => {
      const embed = parseVideoEmbed(v.url);
      let embedHtml;
      if (embed && embed.type === 'file') {
        embedHtml = `<video src="${escapeHtml(embed.src)}" controls preload="metadata"></video>`
          + `<button type="button" class="video-fullscreen-btn" data-fallback="${escapeHtml(embed.src)}" title="전체화면">⛶</button>`;
      } else if (embed && embed.type === 'youtube') {
        embedHtml = `<div class="video-thumb" data-yt-id="${embed.id}" data-title="${escapeHtml(v.title || '')}">
          <img src="https://img.youtube.com/vi/${embed.id}/hqdefault.jpg" alt="${escapeHtml(v.title || '')}" loading="lazy">
          <div class="video-play-btn">▶</div>
        </div>`;
      } else if (embed && embed.type === 'gdrive') {
        embedHtml = `<iframe src="https://drive.google.com/file/d/${embed.id}/preview" title="${escapeHtml(v.title || '')}" loading="lazy" allow="autoplay" allowfullscreen></iframe>`
          + `<button type="button" class="video-fullscreen-btn" data-fallback="https://drive.google.com/file/d/${embed.id}/view" title="전체화면">⛶</button>`;
      } else {
        embedHtml = `<div class="video-broken">유효한 영상 링크가 아닙니다</div>`;
      }
      return `<div class="video-card">
        <div class="video-embed${v.orientation === 'portrait' ? ' portrait' : ''}">${embedHtml}</div>
        <div class="video-title-row" data-id="${v.id}">
          <span class="video-title">${escapeHtml(v.title || '')}</span>
          <button type="button" class="icon-btn video-edit-btn" data-id="${v.id}" title="수정">✏️</button>
        </div>
      </div>`;
    }).join('')
    : '<div class="exp-empty">아래 버튼으로 영상을 추가해보세요</div>';
}

document.getElementById('video-region-tabs').addEventListener('click', (e) => {
  const addBtn = e.target.closest('#btn-add-video-region');
  if (addBtn) {
    const name = prompt('새 장소(대주제) 이름을 입력하세요');
    if (!name || !name.trim()) return;
    const key = regionKeyForLabel(name.trim());
    const videos = loadVideos();
    if (!videos[key]) { videos[key] = []; saveVideos(videos); }
    videoRegion = key;
    renderOtherTab();
    return;
  }
  const btn = e.target.closest('.region-tab-btn');
  if (!btn) return;
  videoRegion = btn.dataset.region;
  renderOtherTab();
});

/** 하노이/사파(및 추가된 장소) 사이를 화면 스와이프로 이동 */
function goToAdjacentVideoRegion(delta) {
  const keys = getVideoRegionKeys();
  const idx = keys.indexOf(videoRegion);
  const nextIdx = idx + delta;
  if (nextIdx < 0 || nextIdx >= keys.length) return;
  videoRegion = keys[nextIdx];
  renderOtherTab();
  playSwipeAnim(document.getElementById('other-video-list'), delta);
}
attachSwipeNav(document.getElementById('tab-other'), goToAdjacentVideoRegion);

document.getElementById('other-video-list').addEventListener('click', (e) => {
  const fsBtn = e.target.closest('.video-fullscreen-btn');
  if (fsBtn) {
    const wrap = fsBtn.closest('.video-embed');
    const media = wrap && wrap.querySelector('iframe, video');
    const fallbackUrl = fsBtn.dataset.fallback;
    const openFallback = () => { if (fallbackUrl) window.open(fallbackUrl, '_blank'); };
    const fn = media && (media.requestFullscreen || media.webkitRequestFullscreen || media.webkitEnterFullscreen);
    if (fn) {
      try {
        Promise.resolve(fn.call(media)).catch(openFallback);
      } catch (err) {
        openFallback();
      }
    } else {
      openFallback();
    }
    return;
  }
  const btn = e.target.closest('.video-edit-btn');
  if (btn) { openVideoModal(videoRegion, btn.dataset.id); return; }
  const thumb = e.target.closest('.video-thumb');
  if (thumb) {
    const id = thumb.dataset.ytId;
    const title = thumb.dataset.title;
    thumb.outerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1" title="${title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
      + `<button type="button" class="video-fullscreen-btn" data-fallback="https://www.youtube.com/watch?v=${id}" title="전체화면">⛶</button>`;
  }
});
document.getElementById('btn-add-video').addEventListener('click', () => openVideoModal(videoRegion, null));

function openVideoModal(region, videoId) {
  const isNew = !videoId;
  document.getElementById('video-modal-title').textContent = isNew ? '영상 추가' : '영상 수정';
  document.getElementById('video-id').value = videoId || '';
  document.getElementById('video-region-original').value = region;
  document.getElementById('video-delete-btn').classList.toggle('hidden', isNew);

  document.getElementById('video-region-list').innerHTML =
    getVideoRegionKeys().map(k => `<option value="${escapeHtml(regionLabel(k))}">`).join('');

  let v = { title: '', url: '' };
  if (!isNew) v = (loadVideos()[region] || []).find(x => x.id === videoId) || v;

  document.getElementById('video-region-input').value = regionLabel(region);
  document.getElementById('video-title').value = v.title || '';
  document.getElementById('video-url').value = v.url || '';
  document.getElementById('video-orientation').value = v.orientation === 'portrait' ? 'portrait' : 'landscape';
  openModal('modal-video');
}

document.getElementById('video-cancel-btn').addEventListener('click', () => closeModal('modal-video'));

document.getElementById('video-save-btn').addEventListener('click', () => {
  const id = document.getElementById('video-id').value;
  const originalRegion = document.getElementById('video-region-original').value;
  const regionLabelInput = document.getElementById('video-region-input').value.trim();
  if (!regionLabelInput) { toast('장소를 입력해주세요'); return; }
  const region = regionKeyForLabel(regionLabelInput);
  const title = document.getElementById('video-title').value.trim();
  const url = document.getElementById('video-url').value.trim();
  const orientation = document.getElementById('video-orientation').value === 'portrait' ? 'portrait' : 'landscape';
  if (!url) { toast('영상 링크를 입력해주세요'); return; }
  if (!parseVideoEmbed(url)) { toast('유튜브 링크 또는 mp4/webm 파일 링크를 입력해주세요'); return; }

  const videos = loadVideos();
  if (id && originalRegion && originalRegion !== region) {
    videos[originalRegion] = (videos[originalRegion] || []).filter(x => x.id !== id);
  }
  videos[region] = videos[region] || [];
  let v = videos[region].find(x => x.id === id);
  if (!v) { v = { id: uid() }; videos[region].push(v); }
  Object.assign(v, { title, url, orientation });
  saveVideos(videos);
  videoRegion = region;
  renderOtherTab();
  closeModal('modal-video');
  toast('영상을 저장했습니다');
});

document.getElementById('video-delete-btn').addEventListener('click', () => {
  const id = document.getElementById('video-id').value;
  const region = document.getElementById('video-region-original').value;
  const videos = loadVideos();
  videos[region] = (videos[region] || []).filter(x => x.id !== id);
  saveVideos(videos);
  renderOtherTab();
  closeModal('modal-video');
  toast('영상을 삭제했습니다');
});

/* ============================== 사진 분석 (OCR + Groq) ============================== */

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

function loadImageElement(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function wrapCanvasText(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [String(text || '')];
}

/**
 * 사진 위에 AI가 찾은 글자 영역(box)마다 배경색을 덮고 그 자리에 한국어 번역을 그려 넣습니다.
 * 무료 비전 모델은 정확한 좌표를 못 찾을 수 있어 100% 정밀하지는 않은 베스트 에포트 방식입니다.
 */
async function renderTranslatedOverlayImage(baseDataUrl, regions) {
  const img = await loadImageElement(baseDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  let drawn = 0;
  (regions || []).forEach(r => {
    if (!r || !r.box || !r.translated_text) return;
    const { x, y, w, h } = r.box;
    if ([x, y, w, h].some(v => typeof v !== 'number' || isNaN(v))) return;
    const px = Math.max(0, Math.min(canvas.width - 1, Math.round(x / 100 * canvas.width)));
    const py = Math.max(0, Math.min(canvas.height - 1, Math.round(y / 100 * canvas.height)));
    const pw = Math.max(6, Math.min(canvas.width - px, Math.round(w / 100 * canvas.width)));
    const ph = Math.max(6, Math.min(canvas.height - py, Math.round(h / 100 * canvas.height)));

    // 원문 글자를 덮기 위해 그 영역의 평균 색상을 배경으로 사용 (진짜 인페인팅은 아니지만 최대한 자연스럽게)
    let avg = [255, 255, 255];
    try {
      const data = ctx.getImageData(px, py, pw, ph).data;
      let rs = 0, gs = 0, bs = 0, n = 0;
      for (let i = 0; i < data.length; i += 16) { rs += data[i]; gs += data[i + 1]; bs += data[i + 2]; n++; }
      if (n > 0) avg = [Math.round(rs / n), Math.round(gs / n), Math.round(bs / n)];
    } catch (e) { /* 캔버스 보안 제약 등으로 실패하면 흰 배경으로 대체 */ }

    ctx.fillStyle = `rgb(${avg[0]},${avg[1]},${avg[2]})`;
    ctx.fillRect(px, py, pw, ph);

    const luminance = 0.299 * avg[0] + 0.587 * avg[1] + 0.114 * avg[2];
    ctx.fillStyle = luminance > 150 ? '#111111' : '#ffffff';
    ctx.textBaseline = 'top';

    let fontSize = Math.max(9, Math.min(30, Math.floor(ph * 0.7)));
    let lines = [String(r.translated_text)];
    while (fontSize > 8) {
      ctx.font = `bold ${fontSize}px sans-serif`;
      lines = wrapCanvasText(ctx, r.translated_text, pw - 6);
      if (lines.length * fontSize * 1.15 <= ph || fontSize <= 9) break;
      fontSize -= 1;
    }
    ctx.font = `bold ${fontSize}px sans-serif`;
    const lineHeight = fontSize * 1.15;
    const totalHeight = lines.length * lineHeight;
    let ty = py + Math.max(0, (ph - totalHeight) / 2);
    lines.forEach(line => {
      const tw = ctx.measureText(line).width;
      const tx = px + Math.max(2, (pw - tw) / 2);
      ctx.fillText(line, tx, ty);
      ty += lineHeight;
    });
    drawn++;
  });

  return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), drawn };
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

const RECEIPT_ANALYSIS_PROMPT = `당신은 베트남(하노이/사파) 여행 중 촬영하거나 캡처한 사진을 분석하는 도우미입니다. 사진은 영수증, 입장권/탑승권, 예약 확인서, 스크린샷, 간판, 메뉴판 등일 수 있고 한국어/영어/베트남어가 섞여 있을 수 있습니다.
사진 속 글자와 내용을 직접 읽고 상황에 맞게 이해해서, 아래 JSON 형식으로만 답변하세요 (다른 설명 없이 JSON만):
{
  "is_receipt": true 또는 false (영수증/입장권/티켓/예약확인서처럼 비용이 발생한 내역으로 보이면 true),
  "vendor": "가게/장소/서비스 이름(상호) 또는 null",
  "place": "주소나 지역/장소 이름 또는 null",
  "amount": 숫자 또는 null (영수증일 경우 총 결제금액 숫자만, 통화 기호/구분자 제외. 총액/합계 표시가 없고 품목별 개별 금액만 나열되어 있다면 모든 품목 금액을 직접 더해서 계산한 합계를 넣으세요),
  "currency": "VND" 또는 "KRW" 또는 "USD" 또는 null,
  "date_on_receipt": "YYYY-MM-DD" 또는 null (사진에 적힌 예약일/탑승일/결제일 등의 날짜. 사진을 촬영한 날짜가 아니라 사진 내용 속의 날짜),
  "time_on_receipt": "HH:MM" 또는 null (사진에 적힌 탑승/이용/결제 시간. 사진을 촬영한 시각이 아니라 사진 내용 속의 시간),
  "category": "이동" "식사" "관광" "숙소" "쇼핑" "기타" 중 하나,
  "website": "사진 속에 보이는 웹사이트/홈페이지 주소가 있다면 그 값, 없으면 null",
  "description": "내용에 대한 한 문장 요약 (한국어)"
}
추론 과정이나 설명을 출력하지 마세요. <think> 태그를 쓰지 말고, 다른 텍스트 없이 오직 위 JSON 객체 하나만 바로 출력하세요.`;

const DEFAULT_GROQ_VISION_MODEL = 'qwen/qwen3.6-27b';
// Groq는 종종 비전 모델을 교체/폐지합니다. 예전에 저장된 모델명이 더 이상 동작하지 않으면
// 자동으로 최신 기본 모델로 대체합니다 (설정 화면에서 직접 바꾼 값은 그대로 존중).
const DEPRECATED_GROQ_VISION_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'llama-3.2-11b-vision-preview',
  'llama-3.2-90b-vision-preview',
];
function resolveGroqVisionModel(saved) {
  const model = (saved || '').trim();
  if (!model || DEPRECATED_GROQ_VISION_MODELS.includes(model)) return DEFAULT_GROQ_VISION_MODEL;
  return model;
}

/** 답변에서 <think>...</think> 추론 블록을 제거. 잘려서 닫는 태그가 없으면 <think> 이후 전체를 버립니다. */
function stripThinkTags(rawText) {
  if (!rawText.includes('<think>')) return rawText;
  return rawText.includes('</think>')
    ? rawText.replace(/<think>[\s\S]*?<\/think>/g, '')
    : rawText.slice(0, rawText.indexOf('<think>'));
}

async function analyzeImageWithGroqVision(dataUrl, apiKey, model, prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model: model || DEFAULT_GROQ_VISION_MODEL,
      max_tokens: 2000,
      temperature: 0,
      reasoning_effort: 'none',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt || RECEIPT_ANALYSIS_PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`API 오류(${res.status}): ${t.slice(0, 150)}`);
  }
  const json = await res.json();
  const rawText = (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) || '';
  // 일부 Groq 모델(qwen3.6 등)은 답변 전에 <think>...</think> 추론 과정을 먼저 출력합니다.
  const text = stripThinkTags(rawText);
  const parsed = parseJsonLoose(text);
  if (!parsed) throw new Error('AI 응답을 이해하지 못했습니다: ' + (text.trim().slice(0, 150) || rawText.trim().slice(0, 150) || '(빈 응답)'));
  return parsed;
}

function parseJsonLoose(text) {
  try { return JSON.parse(text); } catch (e) {}
  const m = /\{[\s\S]*\}/.exec(text);
  if (m) { try { return JSON.parse(m[0]); } catch (e) {} }
  return null;
}

/** 사진 하나를 분석해서 정리된 정보를 반환. AI 비전 분석을 먼저 시도하고, 불가능하거나 실패하면 EXIF 메타데이터로 대체. statusEl에 진행 상태를 표시. */
async function analyzePhoto(file, statusEl) {
  const settings = loadSettings();
  const setStatus = (t) => { if (statusEl) statusEl.textContent = t; };

  setStatus('이미지 처리 중...');
  const resized = await resizeImageToDataUrl(file, 1024, 0.75);
  const thumb = await resizeImageToDataUrl(file, 400, 0.6);
  const exif = await readExifInfo(file);

  let vision = null;
  let aiError = null;
  if (settings.groqApiKey) {
    setStatus('AI가 사진을 분석하는 중...');
    try {
      const model = resolveGroqVisionModel(settings.groqVisionModel);
      vision = await analyzeImageWithGroqVision(resized, settings.groqApiKey, model);
    } catch (e) {
      aiError = e.message;
      toast('AI 분석 실패: ' + e.message, 5000);
    }
  }

  let geoPlace = null;
  if ((!vision || !vision.place) && exif.lat && exif.lon) {
    setStatus('위치 정보 확인 중...');
    geoPlace = await reverseGeocode(exif.lat, exif.lon);
  }

  setStatus(vision
    ? 'AI 분석 완료 — 내용을 확인하고 저장하세요'
    : aiError
      ? `AI 분석 실패: ${aiError} — ${exif.takenAt || exif.lat ? '메타데이터로 채웠습니다' : '직접 입력해주세요'}`
      : (exif.takenAt || exif.lat ? '사진 메타데이터로 채웠습니다 — 확인 후 저장하세요' : '인식된 정보가 없습니다. 직접 입력해주세요'));

  return {
    date: (vision && vision.date_on_receipt) || (exif.takenAt && exif.takenAt.date) || null,
    time: (vision && vision.time_on_receipt) || (exif.takenAt && exif.takenAt.time) || null,
    vendor: (vision && vision.vendor) || '',
    place: (vision && vision.place) || geoPlace || '',
    description: (vision && vision.description) || '',
    category: (vision && vision.category) || null,
    isReceipt: !!(vision && vision.is_receipt),
    amount: (vision && vision.amount) || null,
    currency: (vision && vision.currency) || null,
    website: (vision && vision.website) || '',
    thumb, meta: exif,
  };
}

document.getElementById('entry-photo-btn').addEventListener('click', () => document.getElementById('entry-photo-input').click());
document.getElementById('entry-photo-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const result = await analyzePhoto(file, document.getElementById('entry-photo-status'));

  if (result.date && getTripDates().includes(result.date)) document.getElementById('entry-date').value = result.date;
  if (result.time) { document.getElementById('entry-time').value = result.time; updateKoreaTimeDisplay(); }
  if (result.vendor) document.getElementById('entry-vendor').value = result.vendor;
  if (result.place) document.getElementById('entry-place').value = result.place;
  const title = result.vendor || result.description;
  if (title) document.getElementById('entry-text').value = title;
  if (result.category && ITINERARY_CATEGORIES.includes(result.category)) document.getElementById('entry-category').value = result.category;
  if (result.isReceipt && result.amount) {
    document.getElementById('entry-cost-amount').value = result.amount;
    document.getElementById('entry-cost-currency').value = result.currency || 'VND';
  }
  pendingEntryPhoto = { thumb: result.thumb, meta: result.meta };
});

document.getElementById('expense-photo-btn').addEventListener('click', () => document.getElementById('expense-photo-input').click());
document.getElementById('expense-photo-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const result = await analyzePhoto(file, document.getElementById('expense-photo-status'));

  document.getElementById('expense-date').value = result.date || viewDate || getTripDates()[0];
  document.getElementById('expense-time').value = result.time || document.getElementById('expense-time').value || '12:00';
  const place = result.vendor || result.place || result.description;
  if (place) document.getElementById('expense-place').value = place;
  const mapped = result.category ? (ITIN_TO_EXPENSE_CATEGORY[result.category] || result.category) : null;
  if (mapped && EXPENSE_CATEGORIES.includes(mapped)) document.getElementById('expense-category').value = mapped;
  if (result.amount) {
    document.getElementById('expense-amount').value = result.amount;
    document.getElementById('expense-currency').value = result.currency || 'VND';
  } else {
    toast('금액을 자동으로 인식하지 못했어요. 직접 입력해주세요', 4000);
  }
  const memoParts = [];
  if (result.place && result.place !== place) memoParts.push(result.place);
  if (result.description && result.description !== place) memoParts.push(result.description);
  if (memoParts.length) document.getElementById('expense-memo').value = memoParts.join(' · ');
});

/* ============================== 카메라 번역 ============================== */

function buildTranslatePrompt(sourceLang) {
  const langLine = sourceLang && sourceLang !== '자동 감지'
    ? `사진 속 글자는 ${sourceLang}로 되어 있을 가능성이 높습니다.`
    : `사진 속 글자의 언어를 자동으로 판단하세요.`;
  return `당신은 여행 중 촬영한 사진 속의 외국어 글자를 한국어로 번역하는 전문 번역가입니다. ${langLine}
사진에 보이는 모든 글자를 정확히 읽으세요. 번역은 단어를 하나씩 그대로 옮기는 축자 번역이 아니라, 문장 전체의 맥락과 상황(메뉴판, 안내문, 표지판, 대화 등)을 파악해서 한국어 원어민이 실제로 쓰는 자연스러운 문장으로 의역하세요.
아래 JSON 형식으로만 답변하세요 (다른 설명 없이 JSON만):
{
  "detected_language": "인식된 언어 이름(한국어로, 예: 베트남어/영어/중국어) 또는 null",
  "translated_text": "사진 전체 내용을 문맥에 맞게 자연스럽게 의역한 한국어 번역 (전체를 요약하지 말고 사진에 있는 모든 문장을 빠짐없이 번역)",
  "regions": [
    {
      "translated_text": "이 영역 글자의 한국어 번역",
      "box": { "x": 0, "y": 0, "w": 0, "h": 0 }
    }
  ]
}
regions는 사진에서 구분되는 글자 덩어리(문장, 줄, 간판 문구, 메뉴 항목 등)마다 하나씩 만드세요. box의 x,y는 그 글자 덩어리의 왼쪽 위 모서리 위치를 사진 전체 가로/세로 대비 백분율(0~100)로, w,h는 그 글자 덩어리의 가로/세로 크기를 같은 방식의 백분율로 최대한 정확하게 추정하세요 (예: 사진 왼쪽 위 구석의 작은 글자는 x,y가 0에 가깝고 w,h는 작은 숫자).
사진에서 글자를 전혀 찾을 수 없으면 translated_text를 빈 문자열로, regions를 빈 배열로 답하세요.
추론 과정이나 설명을 출력하지 마세요. <think> 태그를 쓰지 말고, 다른 텍스트 없이 오직 위 JSON 객체 하나만 바로 출력하세요.`;
}

let pendingTranslatePhoto = null;

document.getElementById('btn-translate-camera').addEventListener('click', () => {
  const settings = loadSettings();
  if (!settings.groqApiKey) {
    toast('먼저 설정에서 Groq API 키를 입력해주세요');
    openSettingsModal();
    return;
  }
  document.getElementById('translate-photo-input').click();
});
document.getElementById('translate-camera-btn').addEventListener('click', () => {
  document.getElementById('translate-photo-input').click();
});

document.getElementById('translate-photo-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;

  openTranslateModal(null);
  const setStatus = (t) => { document.getElementById('translate-status').textContent = t; };
  const settings = loadSettings();

  setStatus('이미지 처리 중...');
  const resized = await resizeImageToDataUrl(file, 1024, 0.75);
  const thumb = await resizeImageToDataUrl(file, 400, 0.6);
  document.getElementById('translate-thumb').src = thumb;
  document.getElementById('translate-thumb-wrap').classList.remove('hidden');
  document.getElementById('translate-scan-line').classList.remove('hidden');
  pendingTranslatePhoto = { thumb };

  setStatus('스캔 중... AI가 문맥에 맞게 번역하고 있어요');
  try {
    const model = resolveGroqVisionModel(settings.groqVisionModel);
    const prompt = buildTranslatePrompt(settings.translateSourceLang);
    const result = await analyzeImageWithGroqVision(resized, settings.groqApiKey, model, prompt);
    document.getElementById('translate-translated').value = result.translated_text || '';

    if (Array.isArray(result.regions) && result.regions.length) {
      try {
        const { dataUrl, drawn } = await renderTranslatedOverlayImage(resized, result.regions);
        if (drawn) {
          document.getElementById('translate-thumb').src = dataUrl;
          pendingTranslatePhoto = { thumb: dataUrl };
          setStatus('번역 완료 — 사진 위에 한국어로 표시했어요. 확인 후 저장하세요');
        } else {
          setStatus(result.translated_text ? '번역 완료 — 확인하고 저장하세요' : '사진에서 글자를 찾지 못했습니다');
        }
      } catch (overlayErr) {
        setStatus(result.translated_text ? '번역 완료 — 확인하고 저장하세요' : '사진에서 글자를 찾지 못했습니다');
      }
    } else {
      setStatus(result.translated_text ? '번역 완료 — 확인하고 저장하세요' : '사진에서 글자를 찾지 못했습니다');
    }
  } catch (err) {
    setStatus('번역 실패: ' + err.message);
    toast('번역 실패: ' + err.message, 5000);
  } finally {
    document.getElementById('translate-scan-line').classList.add('hidden');
  }
});

function renderTranslateHistory() {
  const list = loadTranslations();
  const historyEl = document.getElementById('translate-history-list');
  document.getElementById('translate-history-title').classList.toggle('hidden', list.length === 0);
  historyEl.innerHTML = list.slice().reverse().map(t => `
    <li class="translate-history-item" data-id="${t.id}">
      ${t.thumb ? `<img class="th-thumb" src="${t.thumb}" alt="">` : ''}
      <div class="th-text">
        <div class="th-translated">${escapeHtml(t.translated || '')}</div>
      </div>
    </li>`).join('');
}

document.getElementById('translate-history-list').addEventListener('click', (e) => {
  const li = e.target.closest('.translate-history-item');
  if (!li) return;
  const t = loadTranslations().find(x => x.id === li.dataset.id);
  if (t) openTranslateModal(t.id);
});

function openTranslateModal(translateId) {
  document.getElementById('translate-id').value = translateId || '';
  document.getElementById('translate-status').textContent = '';
  document.getElementById('translate-delete-btn').classList.toggle('hidden', !translateId);
  document.getElementById('translate-scan-line').classList.add('hidden');

  if (translateId) {
    const t = loadTranslations().find(x => x.id === translateId);
    document.getElementById('translate-translated').value = (t && t.translated) || '';
    document.getElementById('translate-thumb-wrap').classList.toggle('hidden', !(t && t.thumb));
    if (t && t.thumb) document.getElementById('translate-thumb').src = t.thumb;
    pendingTranslatePhoto = t ? { thumb: t.thumb } : null;
  } else {
    document.getElementById('translate-translated').value = '';
    document.getElementById('translate-thumb-wrap').classList.add('hidden');
    pendingTranslatePhoto = null;
  }

  renderTranslateHistory();
  openModal('modal-translate');
}

document.getElementById('translate-cancel-btn').addEventListener('click', () => closeModal('modal-translate'));

document.getElementById('translate-save-btn').addEventListener('click', () => {
  const id = document.getElementById('translate-id').value;
  const translated = document.getElementById('translate-translated').value.trim();
  if (!translated) { toast('번역 내용을 입력해주세요'); return; }

  const list = loadTranslations();
  let t = list.find(x => x.id === id);
  if (!t) { t = { id: uid(), date: todayStr() }; list.push(t); }
  Object.assign(t, { translated, thumb: (pendingTranslatePhoto && pendingTranslatePhoto.thumb) || t.thumb || '' });
  saveTranslations(list);
  document.getElementById('translate-id').value = t.id;
  document.getElementById('translate-delete-btn').classList.remove('hidden');
  renderTranslateHistory();
  toast('번역을 저장했습니다');
});

document.getElementById('translate-delete-btn').addEventListener('click', () => {
  const id = document.getElementById('translate-id').value;
  saveTranslations(loadTranslations().filter(x => x.id !== id));
  closeModal('modal-translate');
  toast('삭제했습니다');
});

/* ============================== 실시간 음성 번역 ============================== */

const VOICE_OTHER_LANGS = [
  { label: '베트남어', code: 'vi', whisperCode: 'vi', family: 'vietnamese' },
  { label: '영어', code: 'en', whisperCode: 'en', family: 'english' },
  { label: '중국어', code: 'zh-CN', whisperCode: 'zh', family: 'chinese' },
  { label: '일본어', code: 'ja', whisperCode: 'ja', family: 'japanese' },
];
document.getElementById('voice-other-lang').innerHTML =
  VOICE_OTHER_LANGS.map(l => `<option value="${l.code}">${l.label}</option>`).join('');
function voiceOtherLangMeta() {
  const code = document.getElementById('voice-other-lang').value;
  return VOICE_OTHER_LANGS.find(l => l.code === code) || VOICE_OTHER_LANGS[0];
}

const VOICE_HALLUCINATION_PHRASES = [
  '시청해주셔서 감사합니다', '시청해 주셔서 감사합니다', '구독과 좋아요', '구독 좋아요',
  '다음 영상에서 만나요', '다음 시간에 만나요', '영상 시청해주셔서', 'MBC 뉴스', 'KBS 뉴스',
  'SBS 뉴스', '자막 제공', '자막제공', '이 영상은', '오늘도 시청해주셔서',
];
/** Whisper가 무음/잡음 구간에서 자주 지어내는(환각) 유튜브 구독 유도 문구 등의 키워드.
    한국어뿐 아니라 상대 언어(베트남어 등) 인식 결과에도 똑같이 나타나므로 언어 구분 없이 검사. */
const VOICE_HALLUCINATION_KEYWORDS = [
  '구독', 'subscribe', 'kênh', 'đăng ký', 'channel', 'video hấp dẫn', '좋아요',
  'thanks for watching', 'cảm ơn đã xem', '자막', 'phụ đề', 'bỏ lỡ',
];
function isLikelyVoiceHallucination(text) {
  const t = text.replace(/\s/g, '');
  if (t.length < 2) return true;
  if (VOICE_HALLUCINATION_PHRASES.some(p => t === p.replace(/\s/g, ''))) return true;
  const lower = text.toLowerCase();
  return VOICE_HALLUCINATION_KEYWORDS.some(k => lower.includes(k.toLowerCase()));
}
function isDetectedKorean(langField) {
  const l = (langField || '').toLowerCase();
  return l === 'ko' || l.startsWith('korean');
}

/** 무음 구간은 API 호출 없이 건너뛰어 환각(hallucination) 방지 + 호출 절약 */
async function isSilentAudio(blob, threshold) {
  try {
    const arrayBuf = await blob.arrayBuffer();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0));
    const data = audioBuf.getChannelData(0);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
    const rms = Math.sqrt(sum / data.length);
    ctx.close();
    return rms < (threshold || 0.01);
  } catch (e) { return false; }
}

/** forcedLangCode를 안 주면 Whisper가 말하는 언어를 자동으로 판단. 주면 그 언어라고 강제. */
async function transcribeVoiceChunk(blob, apiKey, forcedLangCode) {
  const fd = new FormData();
  fd.append('file', blob, 'chunk.webm');
  fd.append('model', 'whisper-large-v3');
  if (forcedLangCode) fd.append('language', forcedLangCode);
  fd.append('response_format', 'verbose_json');
  fd.append('temperature', '0');
  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey },
    body: fd,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Whisper API 오류(${res.status}): ${t.slice(0, 150)}`);
  }
  const data = await res.json();
  // Whisper 자신이 매긴 "이 구간은 발화가 아닐 확률"의 평균. 무음/잡음을 그럴듯한 문장으로
  // 지어내는(환각) 상황을 사후 키워드 매칭보다 훨씬 일반적으로 걸러낼 수 있음.
  const segments = data.segments || [];
  const noSpeechProb = segments.length
    ? segments.reduce((sum, s) => sum + (typeof s.no_speech_prob === 'number' ? s.no_speech_prob : 0), 0) / segments.length
    : 0;
  return { text: (data.text || '').trim(), language: data.language || forcedLangCode || '', noSpeechProb };
}

async function googleTranslateText(text, sourceCode, targetCode) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceCode}&tl=${targetCode}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('번역 API 오류(' + res.status + ')');
  const data = await res.json();
  return data[0].map(s => s[0]).join('');
}

/** 한국어 화자가 상대 언어로 번역된 문장을 그대로 읽을 수 있도록 한글 발음을 만들어줌 */
async function getKoreanPronunciation(text, apiKey, model) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify({
      model: model || DEFAULT_GROQ_VISION_MODEL,
      max_tokens: 120,
      temperature: 0,
      reasoning_effort: 'none',
      messages: [
        { role: 'user', content: `다음 문장을 한국어로 발음 나는 대로만 표기해줘. 설명, 따옴표, 원문 반복 없이 한글 발음 한 줄만 답하세요 (예: "Xin chào" -> 신 짜오): ${text}` },
      ],
    }),
  });
  if (!res.ok) throw new Error('발음 변환 오류(' + res.status + ')');
  const json = await res.json();
  const raw = (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) || '';
  return stripThinkTags(raw).trim();
}

let voiceStream = null;
let voiceRecorder = null;
let voiceActive = false;
let voiceParas = [];
let voiceAudioCtx = null;
let voiceAnalyser = null;
let voiceMonitorHandle = null;

function setVoiceStatus(t) { document.getElementById('voice-status-text').textContent = t; }

function renderVoiceTranscript() {
  const el = document.getElementById('voice-transcript');
  el.innerHTML = voiceParas.length
    ? voiceParas.map(p => `
      <div class="voice-msg ${p.isKorean ? 'kr' : 'other'}">
        <div class="voice-msg-orig">${escapeHtml(p.orig)}</div>
        <div class="voice-msg-trans">${escapeHtml(p.trans)}</div>
        ${p.pron ? `<div class="voice-msg-pron">${escapeHtml(p.pron)}</div>` : ''}
      </div>`).join('')
    : '<div class="voice-empty">마이크를 눌러 대화를 시작하세요</div>';
  el.scrollTop = el.scrollHeight;
}

async function processVoiceChunk(blob) {
  const settings = loadSettings();
  if (await isSilentAudio(blob)) return;
  setVoiceStatus('인식 및 번역 중...');
  try {
    const otherMeta = voiceOtherLangMeta();
    let { text, language, noSpeechProb } = await transcribeVoiceChunk(blob, settings.groqApiKey);
    if (!text || text.length < 2) return;
    let korean = isDetectedKorean(language);
    const matchesOther = (language || '').toLowerCase().startsWith(otherMeta.family.slice(0, 4));

    // Whisper의 전체 언어 자동감지가 두 언어(한국어/상대 언어) 중 어느 쪽과도 안 맞으면
    // 오인식일 가능성이 높으므로, 상대 언어로 강제 지정해서 한 번 더 시도
    if (!korean && !matchesOther) {
      try {
        const retry = await transcribeVoiceChunk(blob, settings.groqApiKey, otherMeta.whisperCode);
        if (retry.text && retry.text.length >= 2) { text = retry.text; korean = false; noSpeechProb = retry.noSpeechProb; }
      } catch (e) { /* 재시도 실패 시 처음 인식 결과를 그대로 사용 */ }
    }

    // Whisper 스스로 "이건 발화가 아닐 가능성이 높다"고 판단한 구간은 무음/잡음을 지어낸
    // 환각일 확률이 높으므로 버림 (실제 사용자가 말한 적 없는 대화가 자동으로 채워지는 문제 방지)
    if (noSpeechProb > 0.5) return;
    if (isLikelyVoiceHallucination(text)) return;
    const sourceCode = korean ? 'ko' : otherMeta.code;
    const targetCode = korean ? otherMeta.code : 'ko';
    const translated = await googleTranslateText(text, sourceCode, targetCode);

    const para = { id: uid(), orig: text, trans: translated, isKorean: korean, pron: '' };
    voiceParas.push(para);
    renderVoiceTranscript();

    // 한국어 -> 상대 언어 번역일 때만, 화면을 막지 않고 발음을 나중에 채워 넣음
    if (korean) {
      const model = resolveGroqVisionModel(settings.groqVisionModel);
      getKoreanPronunciation(translated, settings.groqApiKey, model)
        .then(pron => {
          para.pron = pron;
          renderVoiceTranscript();
        })
        .catch(() => {});
    }
  } catch (e) {
    toast('음성 번역 오류: ' + e.message, 4000);
  } finally {
    if (voiceActive) setVoiceStatus('듣는 중...');
  }
}

/** 실시간 볼륨을 재서 말이 끝나고 잠깐 조용해지면 바로 녹음을 끊음 (고정 4초 대기 없이 빠르게 반응) */
function getVoiceRms() {
  if (!voiceAnalyser) return 0;
  const data = new Uint8Array(voiceAnalyser.fftSize);
  voiceAnalyser.getByteTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / data.length);
}

const VOICE_SPEAK_THRESHOLD = 0.02;
const VOICE_SILENCE_MS = 600;
const VOICE_MIN_CHUNK_MS = 400;
const VOICE_MAX_CHUNK_MS = 8000;

function startVoiceRecorderLoop() {
  if (!voiceStream || !voiceActive) return;
  voiceRecorder = new MediaRecorder(voiceStream, { mimeType: 'audio/webm' });
  const chunks = [];
  voiceRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
  voiceRecorder.onstop = () => {
    if (voiceMonitorHandle) { clearInterval(voiceMonitorHandle); voiceMonitorHandle = null; }
    const blob = new Blob(chunks, { type: 'audio/webm' });
    if (blob.size > 800) processVoiceChunk(blob);
    if (voiceActive) startVoiceRecorderLoop();
  };
  voiceRecorder.start();

  const startedAt = Date.now();
  let hasSpoken = false;
  let silenceStart = null;
  voiceMonitorHandle = setInterval(() => {
    if (!voiceRecorder || voiceRecorder.state !== 'recording') return;
    const elapsed = Date.now() - startedAt;
    const rms = getVoiceRms();
    if (rms > VOICE_SPEAK_THRESHOLD) {
      hasSpoken = true;
      silenceStart = null;
    } else if (hasSpoken) {
      if (silenceStart === null) silenceStart = Date.now();
      if (Date.now() - silenceStart > VOICE_SILENCE_MS && elapsed > VOICE_MIN_CHUNK_MS) {
        voiceRecorder.stop();
        return;
      }
    }
    if (elapsed > VOICE_MAX_CHUNK_MS) voiceRecorder.stop();
  }, 100);
}

async function startVoiceRecording() {
  try {
    voiceStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch (e) {
    toast('마이크 권한이 필요합니다: ' + e.message, 4000);
    return;
  }
  voiceAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = voiceAudioCtx.createMediaStreamSource(voiceStream);
  voiceAnalyser = voiceAudioCtx.createAnalyser();
  voiceAnalyser.fftSize = 512;
  source.connect(voiceAnalyser);

  voiceActive = true;
  document.getElementById('voice-mic-btn').classList.add('listening');
  setVoiceStatus('듣는 중...');
  startVoiceRecorderLoop();
}

function stopVoiceRecording() {
  voiceActive = false;
  if (voiceMonitorHandle) { clearInterval(voiceMonitorHandle); voiceMonitorHandle = null; }
  if (voiceRecorder && voiceRecorder.state === 'recording') { try { voiceRecorder.stop(); } catch (e) {} }
  voiceRecorder = null;
  if (voiceStream) { voiceStream.getTracks().forEach(t => t.stop()); voiceStream = null; }
  if (voiceAudioCtx) { voiceAudioCtx.close(); voiceAudioCtx = null; }
  voiceAnalyser = null;
  document.getElementById('voice-mic-btn').classList.remove('listening');
  setVoiceStatus('마이크를 눌러 대화를 시작하세요');
}

document.getElementById('voice-mic-btn').addEventListener('click', () => {
  if (voiceActive) stopVoiceRecording();
  else startVoiceRecording();
});

function openVoiceScreen() {
  renderVoiceTranscript();
  document.getElementById('voice-screen').classList.remove('hidden');
}
function closeVoiceScreen() {
  stopVoiceRecording();
  document.getElementById('voice-screen').classList.add('hidden');
}

document.getElementById('btn-voice-translate').addEventListener('click', () => {
  const settings = loadSettings();
  if (!settings.groqApiKey) {
    toast('먼저 설정에서 Groq API 키를 입력해주세요');
    openSettingsModal();
    return;
  }
  openVoiceScreen();
});
document.getElementById('voice-close-btn').addEventListener('click', closeVoiceScreen);
document.getElementById('voice-clear-btn').addEventListener('click', () => {
  voiceParas = [];
  renderVoiceTranscript();
});

/* ============================== 구글 시트 내보내기 ============================== */

function buildGridData() {
  const dates = getTripDates();
  const entries = loadItinerary();
  const expenses = loadExpenses();
  const header = ['날짜', '현지시간', '한국시간', '내용', '상호', '장소', '분류', '비용', '통화', '구글지도'];
  const rows = [header];
  dates.forEach(d => {
    const dayEntries = entries.filter(e => e.date === d && !e.lodging).sort((a, b) => a.time.localeCompare(b.time));
    dayEntries.forEach(e => {
      const exp = e.expenseId ? expenses.find(x => x.id === e.expenseId) : null;
      rows.push([
        formatDateLabel(d), e.time, toKoreaTime(e.time), e.text, e.vendor || '', e.place || '', e.category,
        exp ? exp.amount : '', exp ? exp.currency : '', e.mapUrl || buildMapUrl(e.vendor, e.place),
      ]);
    });
    const lodging = entries.filter(e => e.date === d && e.lodging).map(e => e.text).join(', ');
    if (lodging) rows.push([formatDateLabel(d), '숙소', '', lodging, '', '', '숙소', '', '', '']);
  });
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

document.getElementById('settings-translate-lang').innerHTML =
  TRANSLATE_SOURCE_LANGS.map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join('');

function openSettingsModal() {
  const s = loadSettings();
  document.getElementById('settings-start-date').value = s.startDate;
  document.getElementById('settings-end-date').value = s.endDate;
  document.getElementById('settings-groq-key').value = s.groqApiKey || '';
  document.getElementById('settings-groq-model').value = (s.groqVisionModel && !DEPRECATED_GROQ_VISION_MODELS.includes(s.groqVisionModel)) ? s.groqVisionModel : '';
  document.getElementById('settings-translate-lang').value = s.translateSourceLang || '베트남어';
  document.getElementById('settings-google-client-id').value = s.googleClientId || '';
  document.getElementById('settings-trip-code').value = s.tripCode || '';
  document.getElementById('settings-export-code').value = '';
  document.getElementById('settings-import-code').value = '';
  openModal('modal-settings');
}
document.getElementById('btn-settings').addEventListener('click', openSettingsModal);
document.getElementById('settings-cancel-btn').addEventListener('click', () => closeModal('modal-settings'));

document.getElementById('settings-save-btn').addEventListener('click', () => {
  const s = loadSettings();
  s.startDate = document.getElementById('settings-start-date').value || s.startDate;
  s.endDate = document.getElementById('settings-end-date').value || s.endDate;
  s.groqApiKey = document.getElementById('settings-groq-key').value.trim();
  s.groqVisionModel = document.getElementById('settings-groq-model').value.trim();
  s.translateSourceLang = document.getElementById('settings-translate-lang').value;
  s.googleClientId = document.getElementById('settings-google-client-id').value.trim();
  const prevTripCode = getTripCode();
  s.tripCode = document.getElementById('settings-trip-code').value.trim();
  saveSettings(s);
  renderItineraryGrid();
  renderExpenseTab();
  if (getTripCode() !== prevTripCode) attachSyncListener();
  closeModal('modal-settings');
  toast('설정을 저장했습니다');
});

document.getElementById('btn-sync-push-now').addEventListener('click', () => {
  const s = loadSettings();
  s.tripCode = document.getElementById('settings-trip-code').value.trim();
  saveSettings(s);
  attachSyncListener();
  toast('업로드 중...');
  pushSyncNow()
    .then(() => toast('이 기기의 데이터를 클라우드에 업로드했습니다'))
    .catch(() => toast('업로드에 실패했습니다. 잠시 후 다시 시도해주세요'));
});

/* -------- 설정 내보내기/가져오기 코드 (기기 간 공유용, 깃허브에는 저장되지 않음) -------- */

function toBase64Unicode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))));
}
function fromBase64Unicode(b64) {
  return decodeURIComponent(atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
}

document.getElementById('settings-export-btn').addEventListener('click', () => {
  const s = loadSettings();
  const current = {
    ...s,
    startDate: document.getElementById('settings-start-date').value || s.startDate,
    endDate: document.getElementById('settings-end-date').value || s.endDate,
    groqApiKey: document.getElementById('settings-groq-key').value.trim(),
    groqVisionModel: document.getElementById('settings-groq-model').value.trim(),
    translateSourceLang: document.getElementById('settings-translate-lang').value,
    googleClientId: document.getElementById('settings-google-client-id').value.trim(),
    tripCode: document.getElementById('settings-trip-code').value.trim(),
  };
  const code = toBase64Unicode(JSON.stringify(current));
  const ta = document.getElementById('settings-export-code');
  ta.value = code;
  ta.select();
  toast('코드를 생성했습니다. 복사해서 다른 기기에 붙여넣으세요');
});

document.getElementById('settings-copy-btn').addEventListener('click', async () => {
  const ta = document.getElementById('settings-export-code');
  if (!ta.value) { toast('먼저 코드 생성을 눌러주세요'); return; }
  ta.select();
  try {
    await navigator.clipboard.writeText(ta.value);
    toast('클립보드에 복사했습니다');
  } catch (e) {
    toast('자동 복사에 실패했습니다. 선택된 텍스트를 직접 복사(Ctrl/Cmd+C)해주세요');
  }
});

document.getElementById('settings-import-btn').addEventListener('click', () => {
  const raw = document.getElementById('settings-import-code').value.trim();
  if (!raw) { toast('가져올 코드를 붙여넣어주세요'); return; }
  let parsed;
  try {
    parsed = JSON.parse(fromBase64Unicode(raw));
  } catch (e) {
    toast('코드를 읽을 수 없습니다. 정확히 복사했는지 확인해주세요');
    return;
  }
  const prevTripCode = getTripCode();
  const s = Object.assign(loadSettings(), parsed);
  saveSettings(s);
  document.getElementById('settings-start-date').value = s.startDate;
  document.getElementById('settings-end-date').value = s.endDate;
  document.getElementById('settings-groq-key').value = s.groqApiKey || '';
  document.getElementById('settings-groq-model').value = (s.groqVisionModel && !DEPRECATED_GROQ_VISION_MODELS.includes(s.groqVisionModel)) ? s.groqVisionModel : '';
  document.getElementById('settings-translate-lang').value = s.translateSourceLang || '베트남어';
  document.getElementById('settings-google-client-id').value = s.googleClientId || '';
  document.getElementById('settings-trip-code').value = s.tripCode || '';
  document.getElementById('settings-import-code').value = '';
  renderItineraryGrid();
  renderExpenseTab();
  if (getTripCode() !== prevTripCode) attachSyncListener();
  toast('설정을 가져와서 바로 적용했습니다');
});

/* ================================ 초기화 ================================ */

seedDefaultsIfEmpty();
renderItineraryGrid();
renderExpenseTab();
renderReferenceTab();
renderPhrasesTab();
renderOtherTab();
renderDocDrawer();
initSync();
