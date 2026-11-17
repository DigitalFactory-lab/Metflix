export function person(name,id){return {id,name,episode:'',draw:[],episodeExchanges:0,powers:[],chosen:'',villain:null,parade:'',title:'',genre:'',script:'',before:'',after:''}}
export function drawTwo(deck,rng=Math.random){const a=Math.floor(rng()*deck.length);let b=Math.floor(rng()*(deck.length-1));if(b>=a)b++;return [deck[a],deck[b]]}
export function offer(p,card,proof,by){if(p.powers.some(x=>x.name===card.name))throw Error('Cette carte est déjà attribuée.');if(p.powers.length>=3)throw Error('Trois super-pouvoirs sont déjà attribués. Retirez-en un pour le remplacer.');if(!proof.trim())throw Error('Ajoutez un exemple tiré du récit.');p.powers.push({...card,proof,by});}
export function remove(p,name){p.powers=p.powers.filter(x=>x.name!==name);if(p.chosen===name)p.chosen=''}
export function remaining(t,now=Date.now()){return t.end?Math.max(0,Math.ceil((t.end-now)/1000)):t.left}
export function textFor(p){return `METFLIX · ${p.name}\n\nMA SÉRIE : ${p.title}\nGENRE : ${p.genre}\n\nMON ÉPISODE\n${p.episode}\n\nMES SUPER-POUVOIRS\n${p.powers.map(x=>`${x.name}${x.name===p.chosen?' ★ choisi pour la bande-annonce':''}\n${x.proof}${x.by?' — proposé par '+x.by:''}`).join('\n\n')}\n\nMON MÉCHANT\n${p.villain?.name||''}\n${p.villain?.desc||''}\nMA PARADE\n${p.parade}\n\nMA BANDE-ANNONCE\n${p.script}\n\nSTRESS PERÇU\nAvant : ${p.before}/10 · Après : ${p.after}/10\n`}

export const MAX_EPISODE_EXCHANGES=2;
export function episodeExchangesLeft(p){
  const used=Number.isInteger(p.episodeExchanges)?Math.max(0,p.episodeExchanges):0;
  return Math.max(0,MAX_EPISODE_EXCHANGES-used);
}
export function drawEpisodeOptions(p,deck,rng=Math.random){
  const previous=Array.isArray(p.draw)?p.draw:[];
  const exchanging=previous.length>0;
  if(exchanging&&episodeExchangesLeft(p)===0)throw Error('Tes deux échanges ont déjà été utilisés. Choisis un épisode affiché ou passe ton tour.');
  const available=deck.filter(episode=>!previous.includes(episode));
  const next=drawTwo(available.length>=2?available:deck,rng);
  p.episodeExchanges=exchanging?MAX_EPISODE_EXCHANGES-episodeExchangesLeft(p)+1:0;
  p.draw=next;
  p.episode='';
  return next;
}
