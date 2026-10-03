# assets — 게임 이미지 리소스

ChatGPT(Art Director)가 만든 이미지를 두는 곳이다. 규칙 전체는 `docs/COLLAB.md`.
Claude는 이 폴더의 이미지를 다시 만들거나 덮어쓰지 않고, 게임 코드에 연결만 한다.

```
assets/
  characters/   동료 6명 · 몬스터(전투 도트, 초상화)
  cards/        카드 일러스트(카드 id 이름: K01.png …)
  icons/        상태 · 행동 예고 · 메뉴 · 유물 · 소모품 아이콘
  backgrounds/  전투 · 지도 · 로비 배경
  ui/           카드 틀 · 패널 · 버튼 · 장식
  effects/      스킬 이펙트 이미지
  items/        유물 · 소모품
```

## 이름 규칙
- 영문 소문자와 숫자, 단어 사이는 `_` (예: `characters/kai_idle.png`, `backgrounds/forest.png`)
- 게임 데이터의 id를 그대로 쓴다 — 동료 `kai` `bram` `lyra` `sera` `nox` `ciel`, 몬스터는 `data/monsters.js`의 id(`toad_king` 등), 카드는 `data/cards.js`의 id(`K01` 등), 테마는 `forest` `desert` `snow` `volcano` `castle` `rift`
- 투명 배경은 PNG, 불투명 배경은 PNG 또는 JPG

## 지금 게임 화면의 크기(참고)
- 카드: 틀 125×175 비율(약 5:7), 화면에서는 높이 200px(전투 손패 168px). 카드 그림 창은 약 80×66(가로가 조금 긴 비율)
- 도트 그림: 화면 도트 1칸 = 4px(`--px`). 동료·몬스터는 왼쪽(동료) / 오른쪽(몬스터)을 마주 보고 서 있다 — 몬스터 그림은 **왼쪽을 보도록**
- 전투 화면 기준 해상도: 1280×800

이미지가 추가되면 Claude가 위치·크기·비율을 확인하고 게임에 연결한다. 크기나 비율이 맞지 않으면 덮어쓰지 않고 [IMAGE REQUEST]로 다시 요청한다.
