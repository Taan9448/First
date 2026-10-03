# hero-trace — GIF 두 장에서 다섯 영웅 도트 만들기 (개발 전용)

올려 받은 GIF(붉은 옷 A · 검은 옷 B, 각 16장면)를 1:1 도트로 따고, 영웅마다 색 · 머리 장식 · 갑옷 색 · 무기를 입힌다. 원본 GIF와 거기서 딴 도트 데이터(`*_sprite.json`, `heroes2.json`)는 저장소에 넣지 않는다.

1. ffmpeg 으로 GIF 장면을 PNG로 뽑는다(`raw_01.png` …)
2. `gif2px.js` / `g17px.js`: 2배 확대 격자를 1:1로 줄이고 배경 · 빛 번짐을 떼어 낸다 → `*_frames.json`
3. `gifclean.js` / `g17clean.js`: 남은 번짐 · 나비 · 파편을 지우고 팔레트를 줄인다 → `gif_sprite.json`, `g17_sprite.json`. `g17fix.js` 는 B의 파편을 한 번 더 지운다
4. `heroes2.js`: A에는 리라 · 세라, B에는 하린 · 브리아 · 소연을 입힌다 → `heroes2.json`
