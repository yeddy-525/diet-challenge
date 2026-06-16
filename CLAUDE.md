# 몸짱대결 (Diet Challenge)

YJ(예진)·JE(지은) 두 명이 쓰는 다이어트 챌린지 PWA.

## 배포
- GitHub Pages: https://yeddy-525.github.io/diet-challenge/
- 레포: https://github.com/yeddy-525/diet-challenge.git

## 기술 스택
- 프론트: `index.html` 단일 파일 SPA (vanilla JS)
- 백엔드: Google Apps Script (`files/Code.gs`) — Google Sheets에 저장
- PWA: `manifest.json`, `firebase-messaging-sw.js`, 아이콘: `icons/`

## GAS 연결
- URL: `https://script.google.com/macros/s/AKfycbwUvhZ1uP7Qo1SUQhx0whrA5KrJh6TrbCVZ--hKFhfeYscs3saIyuzvPbfh1-IsD0W-/exec`
- GAS actions: `get`, `set`, `calories`, `setGeminiKey`, `validateGuestCode`, `getGuestCodes`, `addGuestCode`, `deleteGuestCode`, `saveFcmToken`, `notifyFriend`, `sendCustomPush`, `getPushHistory`, `getSettings`, `saveSettings`
- Google Sheets 시트: `챌린지기록`, `게스트기록`, `게스트코드`, `설정`, `푸시기록`

## 주요 기능
- 주차별 운동/식단 기록 (월~일, 7일 도트)
- 식단 ✅/❌ 토글로 식단 성공/실패 수동 처리
- 치팅 사용 (2주에 1회)
- 벌금 계산: 운동 주 4회 미달 × 500원 / 식단 실패 1회 500원 / 치팅 초과 500원
- 상대방 기록 보기 탭
- 한 달 성과 탭 (주차별 벌금 차트, 비교표)
- FCM 푸시 알림 (점심 14:00, 저녁 20:00 KST 리마인더)
- 게스트 모드 (코드 입력)
- 관리자 모드 (코드: `0525`)

## 알려진 이슈 & 해결된 것들

### 치팅 날짜 PC 불일치 (해결)
- **증상**: 앱에선 치팅 사용 UI 보이는데 PC(첫 접속)에서 안 보임
- **원인**: GAS에 `_cheat = 1`만 있고 `_cheat_date` 키가 없는 구 데이터
- **해결**: `fetchRemote`에서 `_cheat = 1`인데 `cheatDate` 없으면 그 주 월요일을 fallback으로 설정

### AI 칼로리 추정 (미완성 — 나중에 재시도)
- Gemini Flash API를 GAS 프록시로 호출하는 구조
- GAS `estimateCalories_` 함수는 구현되어 있음 (`files/Code.gs` 하단)
- `responseMimeType: 'application/json'` + `responseSchema` 사용
- **문제**: Gemini가 `candidates` 없이 에러 응답을 줄 때 빈 text 파싱에서 SyntaxError 발생
- **다음 시도 때**: `apiRes.error` 체크 + `!text` 체크 로직이 이미 `Code.gs`에 있음
  - 프론트 `fetchCalories` 함수 + `cal-badge-m1/m2` div는 제거된 상태 → 다시 붙여야 함
  - 모델을 `gemini-1.5-flash` → `gemini-2.0-flash`로 바꾸면 해결될 가능성 있음
  - Gemini API 키는 관리자 페이지 → "AI 칼로리 추정" 카드에서 GAS Script Properties에 저장

## 데이터 구조 (localStorage)
```js
// diet_state
{
  '예진_2026-06-16': {
    days: [{ ex, m1, m2, m1ok, m2ok }, ...], // 7일
    cheat: false,
    cheatDate: null | 'YYYY-MM-DD'
  }
}
// diet_weight_예진 / diet_weight_지은
{ startWeight, goalWeight, weights: { 'YYYY-MM-DD': kg } }
// diet_settings
{ exGoal, endDate, guestCode }
```

## GAS 데이터 키 형식
| dateKey | 설명 |
|---|---|
| `2026-06-16_d0_ex` | 월요일 운동 |
| `2026-06-16_d0_m1` | 월요일 식단1 |
| `2026-06-16_d0_m1ok` | 월요일 식단1 성공여부 |
| `2026-06-16_cheat` | 치팅 사용 여부 (1/0) |
| `2026-06-16_cheat_date` | 치팅 사용 날짜 |
| `weight_setup` | 시작/목표 체중 JSON |
