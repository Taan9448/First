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
