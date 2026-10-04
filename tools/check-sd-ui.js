// Run with the environment's Playwright installation. Uses a fresh file:// profile.
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
(async () => {
  const out = process.env.SD_PREVIEW_DIR || '/tmp/sd-ui-preview';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath:'/usr/bin/chromium', headless:true, args:['--no-sandbox'] });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport:{width:1280,height:800} });
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/^https?:/, r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
    await page.goto((process.env.SD_URL || 'file://' + path.resolve(__dirname,'../index.html')) + '?debug=1');
    await page.waitForSelector('#screen-title.on');
    await page.evaluate(() => {
      Game.Stage.newGame('normal');
      Game.Stage.data.characters = Game.Data.characters.map(c => c.id);
      Game.Stage.data.party = ['kai','bram','lyra'];
      Game.Meta.lobby();
    });
    await page.waitForTimeout(700);
    await page.screenshot({path:path.join(out,'lobby.png')});
    await page.evaluate(() => Game.Meta.party(Game.Meta.lobby,'확인',Game.Meta.lobby));
    await page.waitForTimeout(400);
    if (await page.locator('.squad-grid .hero-pick').count() !== 6) throw Error('Squad must show six heroes');
    await page.locator('[data-hero="kai"]').focus();
    await page.keyboard.press('Enter');
    if (await page.locator('[data-hero="kai"]').getAttribute('aria-pressed') !== 'false') throw Error('Keyboard deselection failed');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);
    await page.screenshot({path:path.join(out,'party.png')});
    await page.evaluate(() => Game.Meta.map());
    await page.waitForTimeout(400);
    await page.screenshot({path:path.join(out,'map.png')});
    await page.evaluate(() => Game.Meta.forge());
    await page.waitForTimeout(400);
    await page.screenshot({path:path.join(out,'forge.png')});
    await page.evaluate(() => { Game.Meta.lobby(); Game.Extra.codex('cards'); });
    await page.waitForTimeout(400);
    await page.screenshot({path:path.join(out,'codex.png')});
    await page.evaluate(() => {
      Game.Stage.startStage(1);
      Game.Stage.data.run.pending = {kind:'normal',gold:20,cards:Game.Data.cards.filter(c=>c.basic && c.owner==='common').slice(0,3).map(c=>c.id)};
      Game.Meta.reward();
    });
    await page.waitForTimeout(800);
    await page.screenshot({path:path.join(out,'reward.png')});
    await page.evaluate(() => { Game.Stage.data.run.pending = null; Game.Meta.shop(); });
    await page.waitForTimeout(800);
    await page.screenshot({path:path.join(out,'shop.png')});
    await page.evaluate(() => Game.Meta.rest());
    await page.waitForTimeout(800);
    await page.screenshot({path:path.join(out,'rest.png')});
    await page.evaluate(() => {
      document.querySelectorAll('.modal-wrap').forEach(e => e.remove());
      const deck = Game.Data.cards.filter(c => c.basic && ['common','kai','bram','lyra'].includes(c.owner)).map(c => c.id);
      Game.BattleUI.start({title:'UI 확인',party:[{id:'kai'},{id:'bram'},{id:'lyra'}],monsters:['slime','slime','slime','slime'],deck,gold:100,undo:true,theme:'forest'},{onExit:Game.Meta.lobby});
    });
    await page.waitForTimeout(1700);
    await page.screenshot({path:path.join(out,'battle.png')});
    const cardInfo = await page.locator('#screen-battle .hand .card').evaluateAll(cards => cards.map(c => {
      const text = c.querySelector('.ctext span'), name = c.querySelector('.cname');
      return {font:parseFloat(getComputedStyle(text).fontSize),writing:getComputedStyle(name).writingMode};
    }));
    if (!cardInfo.length || cardInfo.some(c=>c.font < 14 || c.writing !== 'horizontal-tb')) throw Error('Card text unreadable');
    await page.locator('#screen-battle .log-btn').click();
    await page.locator('#screen-battle .log-btn').click();
    await page.evaluate(async () => { if (Game.Battle.current) await Game.Battle.current.endTurn(); });
    for (const [width,height] of [[1000,680],[1440,900]]) {
      await page.setViewportSize({width,height});
      await page.evaluate(() => Game.Meta.lobby());
      await page.waitForTimeout(1100);
      const overlaps = await page.evaluate(() => {
        const a=document.querySelector('.lb-voice').getBoundingClientRect(),b=document.querySelector('.lb-banner').getBoundingClientRect();
        return a.bottom > b.top && a.left < b.right && a.right > b.left;
      });
      if (overlaps) throw Error('Lobby dialogue overlaps banner at '+width+'x'+height);
      await page.screenshot({path:path.join(out,'lobby-'+width+'.png')});
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    const fontReady = await page.evaluate(() => document.fonts.load('15px "SD Sans"').then(f=>f.length>0));
    if (!fontReady) throw Error('Embedded SD font not loaded offline');
    if (errors.length) throw Error(errors.join('\n'));
    console.log(JSON.stringify({externalNetworkDisabled:true,transport:process.env.SD_URL?'localhost HTTP':'file',viewports:['1280x800','1000x680','1440x900'],screens:9,errors,cardInfo,preview:out}));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
