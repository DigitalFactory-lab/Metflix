import test from 'node:test';
import assert from 'node:assert/strict';
import {person,drawEpisodeOptions,episodeExchangesLeft} from '../appli/core.mjs';
const deck=Array.from({length:24},(_,i)=>'Épisode '+i);
test('Premier tirage gratuit, deux échanges, puis blocage sans mutation',()=>{
 const p=person('A','a');
 drawEpisodeOptions(p,deck,()=>0);assert.equal(p.draw.length,2);assert.equal(episodeExchangesLeft(p),2);
 const first=[...p.draw];p.episode=first[0];
 drawEpisodeOptions(p,deck,()=>0);assert.equal(episodeExchangesLeft(p),1);assert.equal(p.episode,'');assert.ok(p.draw.every(c=>!first.includes(c)));
 drawEpisodeOptions(p,deck,()=>0);assert.equal(episodeExchangesLeft(p),0);
 p.episode=p.draw[0];const before=JSON.stringify(p);
 assert.throws(()=>drawEpisodeOptions(p,deck),/deux échanges/);assert.equal(JSON.stringify(p),before);
});
test('Le quota appartient au participant et survit à la sauvegarde/recharge',()=>{
 let state={people:[person('A','a'),person('B','b')],active:0,step:0};
 for(let n=0;n<3;n++)drawEpisodeOptions(state.people[0],deck);
 state.active=1;drawEpisodeOptions(state.people[1],deck);
 assert.equal(episodeExchangesLeft(state.people[1]),2);
 state.step=3;state=JSON.parse(JSON.stringify(state));state.active=0;state.step=0;
 assert.equal(episodeExchangesLeft(state.people[0]),0);assert.throws(()=>drawEpisodeOptions(state.people[0],deck));
});
test('Une fiche existante sans compteur peut encore faire deux échanges',()=>{
 const p={...person('Ancienne fiche','old'),draw:deck.slice(0,2)};delete p.episodeExchanges;
 assert.equal(episodeExchangesLeft(p),2);
 drawEpisodeOptions(p,deck);drawEpisodeOptions(p,deck);assert.throws(()=>drawEpisodeOptions(p,deck));
});
