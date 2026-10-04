'use strict';
const fs=require('fs'),path=require('path'),root=__dirname,source=path.resolve(root,'../card-v2');
const original=JSON.parse(fs.readFileSync(source+'/manifest.json','utf8')).cards;
for(const dir of ['art','previews','frames','rarity'])fs.mkdirSync(root+'/'+dir,{recursive:true});
for(const dir of ['frames','rarity'])for(const name of fs.readdirSync(source+'/'+dir))if(name.endsWith('.png'))fs.copyFileSync(source+'/'+dir+'/'+name,root+'/'+dir+'/'+name);
fs.copyFileSync(source+'/preview.css',root+'/preview.css');
const cards=original.map(c=>({id:c.id,name:c.name,cost:c.cost,type:c.type,typeLabel:c.typeLabel,school:c.school,owner:c.owner,rarity:c.rarity,rank:c.rank,descriptionTemplate:c.descriptionTemplate,scene:c.effect.scene,art:c.art.path,frame:c.frame,rarityStrip:c.rarityStrip,preview:c.preview,previewPng:c.previewPng,generated:fs.existsSync(source+'/'+c.art.path)}));
for(const c of cards){if(!c.generated)continue;for(const p of [c.art,c.preview,c.previewPng])fs.copyFileSync(source+'/'+p,root+'/'+p);}
const pending=JSON.parse(fs.readFileSync(source+'/production-jobs.json','utf8')).filter(j=>j.kind==='art'&&!fs.existsSync(source+'/art/'+j.id+'.png'));
fs.writeFileSync(root+'/resume-art-only-jobs.json',JSON.stringify(pending,null,2));
fs.writeFileSync(root+'/cards.json',JSON.stringify(cards,null,2));
fs.writeFileSync(root+'/cards.js','window.Game=window.Game||{};Game.CardPreviewCards='+JSON.stringify(cards)+';\n');
fs.writeFileSync(root+'/mapping.csv','id,name,rank,type,cost,art,previewPng,generated\n'+cards.map(c=>[c.id,c.name,c.rank,c.typeLabel,c.cost,c.art,c.previewPng,c.generated].map(x=>'"'+String(x??'').replace(/"/g,'""')+'"').join(',')).join('\n'));
const status={priority:'cards-first',expectedCards:296,generatedArt:cards.filter(c=>c.generated).length,singleCardPreviews:cards.filter(c=>c.generated).length,missingArt:pending.map(c=>c.id),effectsIncluded:false,newEffectsPaused:true,quotaResetUtc:'2026-10-04T23:58:15Z'};
fs.writeFileSync(root+'/status.json',JSON.stringify(status,null,2));console.log(JSON.stringify({generatedArt:status.generatedArt,singleCardPreviews:status.singleCardPreviews,remainingArt:pending.length,effectsIncluded:false}));
