# assets — 게임 이미지 리소스

ChatGPT(Art Director)가 만든 그림을 두는 곳이다. Claude는 이 폴더의 그림을 다시 만들거나 덮어쓰지 않고, 게임 코드에 연결만 한다.

- **규격(크기 · 투명 · 방향 · 이름)**: `docs/ASSET_SPEC.md` (기준 데이터 `data/asset-spec.js`)
- **필요한 그림 전체 목록과 요청서**: `docs/IMAGE_REQUESTS.md`
- **ChatGPT 작업 브리프**: `docs/CHATGPT_BRIEF.md` · 공동 개발 규칙: `docs/COLLAB.md`

```
assets/
  characters/heroes/      {동료id}_{idle|attack|skill|hit|down}.png · {동료id}_portrait.png · {동료id}_face.png
  characters/monsters/    {몬스터id}_{idle|attack|hit|down}.png
  cards/art/              {카드id}.png
  cards/frames/           {ink|split}_{등급}.png · duo.png
  backgrounds/            battle_{테마}.jpg · battle_{테마}_fore.png · world_map.jpg · title.jpg · lobby.jpg · dungeon_map.jpg
  backgrounds/story/      ch{장 번호}.jpg
  backgrounds/events/     {이벤트id}.jpg
  icons/{아무 하위 폴더}/  {아이콘 이름}.png
  items/relics/           {유물id}.png
  items/consumables/      {소모품id}.png
  ui/ · effects/          39 · 42단계에 정한다
```

## 올린 뒤 (Claude)
1. `node tools/sync-assets.js` — 크기 · 비율 · 투명을 검사하고 목록 `data/assets.js`를 다시 쓴다(오류가 있으면 덮어쓰지 않고 다시 요청)
2. `node tools/gen-image-requests.js` — 요청서의 '있음' 표시를 갱신한다
3. `index.html?assets=1` — 리소스 확인 화면에서 들어간 그림과 남은 그림을 본다. 그림이 없는 곳은 지금의 코드 그림이 그대로 보인다

## 승인된 주인공·동료 목업 적용 (2026-10-04)

| 동료 id | 파일 | 원본 크기 | 디자인 |
|---|---|---|---|
| kai | `characters/kai_poses.png` | 2172×724 | 검은 머리·붉은 장식·흑백 도포·서예 붓 |
| bram | `characters/bram_poses.png` | 2160×728 | 금발·은색 갑옷·파란 망토·검과 방패 |
| lyra | `characters/lyra_poses.png` | 2171×724 | 적갈색 머리·보라색 로브·수정 지팡이 |
| sera | `characters/sera_poses.png` | 2172×724 | 은발·흰색과 금색 사제복·태양 지팡이 |
| nox | `characters/nox_poses.png` | 2172×724 | 검은 머리·초록색 복면과 무복·단검과 비도 |
| ciel | `characters/ciel_poses.png` | 2172×724 | 은녹색 머리·초록색 사냥꾼 의상·활 |

- 모두 투명 RGBA PNG이며 왼쪽부터 **대기 / 공격 / 스킬 / 피격** 4개의 독립 자세다. 연속 동작 프레임 시트는 아니다. 기존 돌진·점프·피격·파티클 연출과 자세 전환을 함께 사용하며, 대기에 작은 CSS 숨쉬기 움직임을 더했다.
- `data/character-art.js`에 원본 크기, 자세별 가로 영역, 공통 세로 영역·발 기준, 몸 높이와 얼굴·무기 끝 좌표가 있다. 이미지는 균일한 4등분이 아니므로 이 좌표를 사용한다.
- `js/character-art.js`가 `Image`로 미리 읽고 크기를 확인한다. 로딩 실패·크기 불일치·6초 시간 초과 시 해당 동료는 기존 코드 그림을 사용한다. PNG는 CSS 배경으로 직접 표시하며 캔버스로 읽거나 변환하지 않는다.
- 공통 `UI.spriteEl`을 통해 타이틀·로비·편성·도감·스토리·전투·얼굴 컷인에 연결된다. 얼굴 컷인은 대기 자세를 고정하고 `face` 좌표를 기준으로 확대한다. 전투 왼쪽 가장자리에는 긴 무기의 여백을 확보한다.
- 몬스터·그림자 변형과 기존 도트/퍼펫 정의는 그대로 사용할 수 있다. 새 파일로 교체할 때는 실제 PNG 크기와 좌표를 함께 검증한다.

- 공용 36단계 로더와 함께 미리 읽으며, `heroAtlas` 규격으로 목록에 등록된다. `node tools/sync-assets.js --check`는 원본 크기·알파·영역·얼굴·무기 좌표를 검사한다. 리소스 확인 화면은 대기·공격·스킬·피격 24개를 리소스로 표시한다.
