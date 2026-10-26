// Kraft-paper faceting blueprints drawn from a level's real cutting plan: crown, pavilion and profile views,
// the 96-tooth index wheel and the tier table all come from plan.faces and plan.sequence.
const W=1000,H=1500,INK='#3a2414',RED='#8f2a1c',FAINT='rgba(58,36,20,.35)';
const TIER_COLORS=['#8f2a1c','#2f5d62','#a0662a','#5b3f78','#3f6b2f','#7a2e52','#2b4a7a','#8a6d1d'];
const f2=v=>+v.toFixed(2);
function rng(seed){let s=seed%2147483647||7;return ()=>(s=s*16807%2147483647)/2147483647;}
function newell(f){let x=0,y=0,z=0;for(let i=0;i<f.length;i++){const a=f[i],b=f[(i+1)%f.length];x+=(a[1]-b[1])*(a[2]+b[2]);y+=(a[2]-b[2])*(a[0]+b[0]);z+=(a[0]-b[0])*(a[1]+b[1]);}const l=Math.hypot(x,y,z)||1;return [x/l,y/l,z/l];}
const key=p=>p.map(v=>Math.round(v*1e4)).join(',');
// Stroke every facet edge once; silhouette edges (one side facing the viewer, the other away) get a heavy line.
function view(faces,facing,project,{hidden=false,labels=null,tint=null}={}){
  const edges=new Map();const fill=[],marks=[];
  faces.forEach((f,fi)=>{const n=newell(f),vis=facing(n)>1e-6;
    if(vis){const pts=f.map(project);fill.push(`<polygon points="${pts.map(p=>p.map(f2).join(',')).join(' ')}" fill="${tint?tint(n):'none'}"/>`);
      if(labels){const l=labels(n);if(l){const c=pts.reduce((a,p)=>[a[0]+p[0]/pts.length,a[1]+p[1]/pts.length],[0,0]);let area=0;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];area+=a[0]*b[1]-b[0]*a[1];}if(Math.abs(area)/2>260)marks.push(`<text x="${f2(c[0])}" y="${f2(c[1]+4)}" class="bp-facet" fill="${l.color}">${l.text}</text>`);}}}
    for(let i=0;i<f.length;i++){const a=f[i],b=f[(i+1)%f.length],k=[key(a),key(b)].sort().join('|');const e=edges.get(k)||{a,b,vis:0,all:0};e.all++;if(vis)e.vis++;edges.set(k,e);}});
  let back='',front='',sil='';
  for(const e of edges.values()){const a=project(e.a),b=project(e.b),d=`M${f2(a[0])} ${f2(a[1])}L${f2(b[0])} ${f2(b[1])}`;if(e.vis===0){if(hidden)back+=d;}else if(e.vis===1&&e.all===2)sil+=d;else front+=d;}
  return `<g>${fill.join('')}${hidden?`<path d="${back}" class="bp-hidden"/>`:''}<path d="${front}" class="bp-line"/><path d="${sil}" class="bp-sil"/>${marks.join('')}</g>`;
}
function tiers(plan){const out=[];for(const s of plan.sequence){if(s.lap!=='cut')continue;let t=out.find(t=>t.part===s.part&&t.flip===s.flip&&Math.abs(t.angle-s.angle)<.01);if(!t){t={part:s.part,flip:s.flip,angle:s.angle,index:[],normals:[]};out.push(t);}if(!t.index.includes(s.index)){t.index.push(s.index);t.normals.push(s.normal);}}
  out.sort((a,b)=>(a.part==='腰圍'?0:a.flip?2:1)-(b.part==='腰圍'?0:b.flip?2:1));out.forEach((t,i)=>{t.letter=String.fromCharCode(65+i);t.color=TIER_COLORS[i%TIER_COLORS.length];t.index.sort((a,b)=>a-b);});const seen={};out.forEach(t=>{const k=t.part==='腰圍'?'g':t.part==='台面'?'t':t.flip?'c':'p';seen[k]=(seen[k]||0)+1;t.role=k==='g'?'定外形':k==='t'?'桌面':k==='c'?(seen[k]===1?'冠主面':seen[k]===2?'星面':'冠輔面'):(seen[k]===1?'亭主面':'亭輔面');});return out;}
function indexText(list){if(list.length>2){const step=list[1]-list[0];if(step>0&&list.every((v,i)=>v===list[0]+i*step))return `${list[0]}–${list.at(-1)}　每 ${step} 齒`;}return list.join(' · ');}
function deckle(r,x0,y0,x1,y1,amp){const pts=[];const side=(ax,ay,bx,by,n)=>{for(let i=0;i<n;i++){const t=i/n;pts.push([ax+(bx-ax)*t+(ay===by?0:(r()-.5)*amp),ay+(by-ay)*t+(ax===bx?0:(r()-.5)*amp)]);}};side(x0,y0,x1,y0,90);side(x1,y0,x1,y1,120);side(x1,y1,x0,y1,90);side(x0,y1,x0,y0,120);return 'M'+pts.map(p=>p.map(f2).join(' ')).join('L')+'Z';}
function dimension(x1,y1,x2,y2,label,off=0,vertical=false){const a=vertical?`M${x1} ${y1}L${x2} ${y2}`:`M${x1} ${y1}L${x2} ${y2}`;const mx=(x1+x2)/2,my=(y1+y2)/2;
  return `<g class="bp-dim"><path d="${a}" marker-start="url(#bpArrow)" marker-end="url(#bpArrow)"/><text x="${vertical?mx+off:mx}" y="${vertical?my:my+off}" ${vertical?`transform="rotate(-90 ${mx+off} ${my})"`:''}>${label}</text></g>`;}
function waxSeal(cx,cy,r,rand){const pts=[];for(let i=0;i<48;i++){const a=i/48*Math.PI*2,rr=r*(1+(rand()-.5)*.12+(i%6===0?.06:0));pts.push([cx+Math.cos(a)*rr,cy+Math.sin(a)*rr]);}
  return `<g filter="url(#bpSealShade)"><path d="M${pts.map(p=>p.map(f2).join(' ')).join('L')}Z" fill="url(#bpWax)"/><circle cx="${cx}" cy="${cy}" r="${r*.72}" fill="none" stroke="#5e130c" stroke-width="2.5" opacity=".7"/><circle cx="${cx}" cy="${cy}" r="${r*.64}" fill="none" stroke="#e07a62" stroke-width="1" opacity=".5"/>
  <path d="M${cx-r*.36} ${cy+r*.12}L${cx-r*.4} ${cy-r*.24}L${cx-r*.18} ${cy-r*.06}L${cx} ${cy-r*.34}L${cx+r*.18} ${cy-r*.06}L${cx+r*.4} ${cy-r*.24}L${cx+r*.36} ${cy+r*.12}Z" fill="#5e130c" opacity=".75"/>
  <text x="${cx}" y="${cy+r*.42}" class="bp-seal">TZG</text></g>`;}
function corner(x,y,sx,sy){return `<g transform="translate(${x} ${y}) scale(${sx} ${sy})" class="bp-orn"><path d="M0 70V18Q0 0 18 0H70"/><path d="M10 60V24Q10 10 24 10H60"/><path d="M22 22q14 2 18 16q-14-2-18-16z"/><circle cx="22" cy="22" r="3"/><path d="M40 4q8 6 0 12M4 40q6 8 12 0"/></g>`;}
function compass(cx,cy,r){let t='';for(let i=0;i<16;i++){const a=i*Math.PI/8,l=i%4===0?r:i%2===0?r*.62:r*.4,w=i%4===0?7:4;const p=(ang,rad)=>[cx+Math.sin(ang)*rad,cy-Math.cos(ang)*rad].map(f2).join(' ');t+=`<path d="M${p(a,l)}L${p(a+Math.PI/2,w)}L${cx} ${cy}Z" fill="${i%2?'none':INK}" stroke="${INK}" stroke-width=".8" opacity="${i%4===0?.85:.6}"/>`;}
  return `<g>${t}<circle cx="${cx}" cy="${cy}" r="${r*.3}" fill="none" class="bp-line"/><circle cx="${cx}" cy="${cy}" r="${r+6}" fill="none" class="bp-faint"/><text x="${cx}" y="${cy-r-10}" class="bp-small" text-anchor="middle">N</text></g>`;}
function indexWheel(cx,cy,r,tierList){let t=`<circle cx="${cx}" cy="${cy}" r="${r}" class="bp-sil" fill="none"/><circle cx="${cx}" cy="${cy}" r="${r-18}" class="bp-faint" fill="none"/><circle cx="${cx}" cy="${cy}" r="9" class="bp-line" fill="none"/>`;
  for(let i=0;i<96;i++){const a=i/96*Math.PI*2,l=i%8===0?14:i%4===0?9:5,p=rad=>[cx+Math.sin(a)*rad,cy-Math.cos(a)*rad].map(f2);const[a1,b1]=p(r),[a2,b2]=p(r-l);t+=`<path d="M${a1} ${b1}L${a2} ${b2}" class="bp-line"/>`;if(i%8===0){const[tx,ty]=p(r+14);t+=`<text x="${tx}" y="${f2(ty+4)}" class="bp-tick">${i}</text>`;}}
  tierList.forEach((tier,ti)=>{const rad=r-26-ti*11;for(const i of tier.index){const a=i/96*Math.PI*2;t+=`<circle cx="${f2(cx+Math.sin(a)*rad)}" cy="${f2(cy-Math.cos(a)*rad)}" r="3.6" fill="${tier.color}"/>`;}});
  return t;}
export function blueprintSVG({plan,level,name,materialName,ior,seed=1}){
  const rand=rng(seed*7919+level*131);const faces=plan.faces,pts=faces.flat();
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),zs=pts.map(p=>p[2]);const L=Math.max(...xs)-Math.min(...xs),Wd=Math.max(...zs)-Math.min(...zs),D=Math.max(...ys)-Math.min(...ys);
  const cx0=(Math.max(...xs)+Math.min(...xs))/2,cz0=(Math.max(...zs)+Math.min(...zs))/2,top=Math.max(...ys),bottom=Math.min(...ys);
  const girdleY=(()=>{const g=plan.sequence.filter(s=>s.part==='腰圍');return 0;})();
  const tierList=tiers(plan);const s=290/Math.max(L,Wd);
  const label=n=>{let best=null,bd=.995;for(const t of tierList)for(const m of t.normals){const d=n[0]*m[0]+n[1]*m[1]+n[2]*m[2];if(d>bd){bd=d;best=t;}}if(!best)return n[1]>.995?{text:'T',color:INK}:null;return {text:best.letter,color:best.color};};
  const tint=n=>`rgba(58,36,20,${f2(.04+.1*(1-Math.abs(n[1])))})`;
  const crownC=[275,490],pavC=[725,490],profC=[520,880];
  const crown=view(faces,n=>n[1],p=>[crownC[0]+(p[0]-cx0)*s,crownC[1]+(p[2]-cz0)*s],{labels:label,tint});
  const pav=view(faces,n=>-n[1],p=>[pavC[0]+(p[0]-cx0)*s,pavC[1]+(p[2]-cz0)*s],{labels:label,tint});
  const ps=s*.95,profMid=(top+bottom)/2;
  const prof=view(faces,n=>n[2],p=>[profC[0]+(p[0]-cx0)*ps,profC[1]-(p[1]-profMid)*ps],{hidden:true,tint});
  const tableFaces=faces.filter(f=>newell(f)[1]>.995),tableW=tableFaces.length?Math.max(...tableFaces.flat().map(p=>p[0]))-Math.min(...tableFaces.flat().map(p=>p[0])):0;
  const crownAngle=tierList.find(t=>t.flip)?.angle,pavAngle=tierList.find(t=>!t.flip&&t.part!=='腰圍')?.angle;
  const serial=`TZG-${String(level).padStart(2,'0')}-${plan.id.toUpperCase()}-${(seed*97+level*13)%9000+1000}`;
  const rows=tierList.map((t,i)=>`<g transform="translate(70 ${1100+i*30})"><circle cx="10" cy="-5" r="9" fill="${t.color}"/><text x="10" y="-1" class="bp-letter">${t.letter}</text><text x="34" y="0" class="bp-cell">${t.part}</text><text x="128" y="0" class="bp-cell">${t.role} ${t.part==='台面'?'■':t.flip?'▲':t.part==='腰圍'?'◆':'▼'}</text><text x="236" y="0" class="bp-cell bp-num">${t.angle.toFixed(1)}°</text><text x="330" y="0" class="bp-cell bp-num">${t.index.length}</text><text x="380" y="0" class="bp-cell bp-idx">${indexText(t.index)}</text></g>`).join('');
  const tableH=1094+tierList.length*30;
  const stains=Array.from({length:5},()=>`<circle cx="${f2(80+rand()*840)}" cy="${f2(120+rand()*1180)}" r="${f2(30+rand()*90)}" fill="url(#bpStain)" opacity="${f2(.25+rand()*.35)}"/>`).join('');
  const ring=`<circle cx="${f2(760+rand()*120)}" cy="${f2(1180+rand()*120)}" r="58" fill="none" stroke="#6b4423" stroke-width="5" opacity=".18" filter="url(#bpBlur)"/>`;
  const fibers=Array.from({length:70},()=>{const x=rand()*W,y=rand()*H,a=rand()*Math.PI,l=8+rand()*26;return `<path d="M${f2(x)} ${f2(y)}l${f2(Math.cos(a)*l)} ${f2(Math.sin(a)*l)}" stroke="${rand()<.5?'#5a3a1c':'#f1d7a6'}" stroke-width="${f2(.4+rand()*.8)}" opacity="${f2(.15+rand()*.25)}"/>`;}).join('');
  const edge=deckle(rand,14,14,W-14,H-14,9);
  const grid=Array.from({length:Math.floor(W/40)},(_,i)=>`M${40+i*40} 150V${H-90}`).join('')+Array.from({length:Math.floor(H/40)-5},(_,i)=>`M50 ${160+i*40}H${W-50}`).join('');
  const ratio=(L/Wd).toFixed(2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="bp-svg" role="img" aria-label="${name}圖紙">
<defs>
 <filter id="bpPaper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="4" seed="${level}" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .32  0 0 0 0 .2  0 0 0 0 .09  0 0 0 -.9 .62"/><feComposite in2="SourceGraphic" operator="in"/></filter>
 <filter id="bpMottle" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="3" seed="${level+4}"/><feColorMatrix type="matrix" values="0 0 0 0 .45  0 0 0 0 .28  0 0 0 0 .12  0 0 0 -1.4 .9"/><feComposite in2="SourceGraphic" operator="in"/></filter>
 <filter id="bpBurn"><feGaussianBlur stdDeviation="14"/></filter><filter id="bpBlur"><feGaussianBlur stdDeviation="2"/></filter>
 <filter id="bpInk" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="1.4"/></filter>
 <filter id="bpSealShade"><feGaussianBlur in="SourceAlpha" stdDeviation="3" result="b"/><feOffset dx="2" dy="4" result="o"/><feFlood flood-color="#2a0c06" flood-opacity=".45"/><feComposite in2="o" operator="in" result="s"/><feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
 <radialGradient id="bpKraft" cx="45%" cy="40%" r="75%"><stop offset="0" stop-color="#d9b47c"/><stop offset=".55" stop-color="#c99d62"/><stop offset="1" stop-color="#a87a43"/></radialGradient>
 <radialGradient id="bpStain"><stop offset="0" stop-color="#7a4f25" stop-opacity=".0"/><stop offset=".75" stop-color="#7a4f25" stop-opacity=".12"/><stop offset=".92" stop-color="#6a4120" stop-opacity=".28"/><stop offset="1" stop-color="#6a4120" stop-opacity="0"/></radialGradient>
 <radialGradient id="bpWax" cx="38%" cy="32%"><stop offset="0" stop-color="#d6513a"/><stop offset=".6" stop-color="#a3261a"/><stop offset="1" stop-color="#6d140c"/></radialGradient>
 <linearGradient id="bpTape" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f5ecd2" stop-opacity=".75"/><stop offset="1" stop-color="#e6d6ac" stop-opacity=".6"/></linearGradient>
 <marker id="bpArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1L10 5L0 9z" fill="${RED}"/></marker>
 <clipPath id="bpEdge"><path d="${edge}"/></clipPath>
 <style>.bp-line{stroke:${INK};stroke-width:1.15;fill:none;stroke-linejoin:round}.bp-sil{stroke:${INK};stroke-width:2.6;fill:none;stroke-linejoin:round}.bp-hidden{stroke:${INK};stroke-width:.8;stroke-dasharray:4 4;fill:none;opacity:.45}.bp-faint{stroke:${FAINT};stroke-width:.8}.bp-center{stroke:${RED};stroke-width:.8;stroke-dasharray:18 4 3 4;opacity:.7;fill:none}
 .bp-dim path{stroke:${RED};stroke-width:1;fill:none}.bp-dim text{fill:${RED};font:600 15px 'Noto Serif TC',serif;text-anchor:middle}
 text{font-family:'Noto Serif TC','Songti TC',serif}.bp-title{font-size:58px;font-weight:700;fill:${INK};letter-spacing:6px}.bp-sub{font-size:17px;letter-spacing:7px;fill:${INK};opacity:.8}.bp-small{font-size:13px;fill:${INK};letter-spacing:2px;opacity:.8}.bp-label{font-size:19px;font-weight:700;fill:${INK};letter-spacing:5px;text-anchor:middle}.bp-label-en{font-size:11px;fill:${INK};letter-spacing:4px;text-anchor:middle;opacity:.7}
 .bp-facet{font-size:12px;font-weight:700;text-anchor:middle;font-family:Georgia,serif}.bp-tick{font-size:10px;fill:${INK};text-anchor:middle;font-family:Georgia,serif}.bp-letter{font-size:12px;fill:#f6e7c8;text-anchor:middle;font-weight:700;font-family:Georgia,serif}
 .bp-cell{font-size:16px;fill:${INK}}.bp-num{font-family:Georgia,serif;font-weight:700}.bp-idx{font-size:13px;font-family:Georgia,serif}.bp-head{font-size:12px;fill:${INK};letter-spacing:3px;opacity:.75}.bp-seal{font:700 15px Georgia,serif;fill:#f0b49e;text-anchor:middle;letter-spacing:3px;opacity:.85}
 .bp-orn{fill:none;stroke:${INK};stroke-width:1.4;opacity:.7}.bp-hand{font:italic 30px 'Snell Roundhand','Apple Chancery',cursive;fill:#1f2f55;opacity:.8}.bp-stamp{font:700 22px 'Noto Serif TC',serif;fill:${RED};letter-spacing:6px}</style>
</defs>
<g clip-path="url(#bpEdge)">
 <rect width="${W}" height="${H}" fill="url(#bpKraft)"/>
 <rect width="${W}" height="${H}" fill="#000" filter="url(#bpMottle)" opacity=".55"/>
 <rect width="${W}" height="${H}" fill="#000" filter="url(#bpPaper)" opacity=".5"/>
 ${fibers}${stains}${ring}
 <path d="${grid}" stroke="rgba(58,36,20,.09)" stroke-width="1"/>
 <path d="M0 ${H/2}H${W}" stroke="#f3dcae" stroke-width="3" opacity=".35"/><path d="M0 ${H/2+3}H${W}" stroke="#5e3b1b" stroke-width="2" opacity=".25"/>
 <path d="M${W/2} 0V${H}" stroke="#f3dcae" stroke-width="3" opacity=".3"/><path d="M${W/2+3} 0V${H}" stroke="#5e3b1b" stroke-width="2" opacity=".2"/>
 <g filter="url(#bpInk)">
  <rect x="38" y="38" width="${W-76}" height="${H-76}" fill="none" stroke="${INK}" stroke-width="3"/><rect x="48" y="48" width="${W-96}" height="${H-96}" fill="none" stroke="${INK}" stroke-width="1"/>
  ${corner(48,48,1,1)}${corner(W-48,48,-1,1)}${corner(48,H-48,1,-1)}${corner(W-48,H-48,-1,-1)}
  <text x="${W/2}" y="92" class="bp-sub" text-anchor="middle">ROYAL JEWEL ATELIER · 泰熙爾札娜 皇室工坊</text>
  <path d="M260 106H740" stroke="${INK}" stroke-width="1"/><path d="M300 112H700" stroke="${INK}" stroke-width=".6"/>
  <text x="${W/2}" y="178" class="bp-title" text-anchor="middle">${name}</text>
  <text x="${W/2}" y="210" class="bp-sub" text-anchor="middle">FACETING DIAGRAM · 第 ${level} 關 圖紙</text>
  <text x="80" y="140" class="bp-small">No. ${String(level).padStart(3,'0')}</text><text x="80" y="162" class="bp-small">${serial}</text>
  <g class="bp-center"><path d="M${crownC[0]-200} ${crownC[1]}H${crownC[0]+200}M${crownC[0]} ${crownC[1]-200}V${crownC[1]+200}"/><path d="M${pavC[0]-200} ${pavC[1]}H${pavC[0]+200}M${pavC[0]} ${pavC[1]-200}V${pavC[1]+200}"/><path d="M${profC[0]-260} ${profC[1]}H${profC[0]+260}"/></g>
  <circle cx="${crownC[0]}" cy="${crownC[1]}" r="${f2(Math.max(L,Wd)*s/2+22)}" class="bp-faint" fill="none" stroke-dasharray="2 5"/><circle cx="${pavC[0]}" cy="${pavC[1]}" r="${f2(Math.max(L,Wd)*s/2+22)}" class="bp-faint" fill="none" stroke-dasharray="2 5"/>
  ${crown}${pav}${prof}
  ${dimension(f2(crownC[0]-L*s/2),f2(crownC[1]+Wd*s/2+44),f2(crownC[0]+L*s/2),f2(crownC[1]+Wd*s/2+44),'L 1.00',-8)}
  ${dimension(f2(crownC[0]-L*s/2-40),f2(crownC[1]-Wd*s/2),f2(crownC[0]-L*s/2-40),f2(crownC[1]+Wd*s/2),`W ${(Wd/L).toFixed(2)}`,-10,true)}
  ${dimension(f2(profC[0]+L*ps/2+46),f2(profC[1]-(top-profMid)*ps),f2(profC[0]+L*ps/2+46),f2(profC[1]-(bottom-profMid)*ps),`全深 ${(D/Wd*100).toFixed(0)}%`,22,true)}
  <text x="${crownC[0]}" y="${crownC[1]-215}" class="bp-label">冠部 俯視</text><text x="${crownC[0]}" y="${crownC[1]-197}" class="bp-label-en">CROWN VIEW</text>
  <text x="${pavC[0]}" y="${pavC[1]-215}" class="bp-label">亭部 仰視</text><text x="${pavC[0]}" y="${pavC[1]-197}" class="bp-label-en">PAVILION VIEW</text>
  <text x="${profC[0]-250}" y="${profC[1]-110}" class="bp-label" text-anchor="start" style="text-anchor:start">側面 PROFILE</text>
  <text x="${profC[0]-250}" y="${profC[1]+120}" class="bp-small">冠角 ${crownAngle?.toFixed(1)??'—'}° · 亭角 ${pavAngle?.toFixed(1)??'—'}°</text>
  <g transform="translate(${W-190} ${profC[1]-30})">${compass(0,0,40)}</g>
  <g transform="translate(150 ${profC[1]})"><text x="0" y="-110" class="bp-label">分度盤 96 齒</text>${indexWheel(0,0,72,tierList)}</g>
  <path d="M60 1050H${W-60}" stroke="${INK}" stroke-width="1.6"/><path d="M60 1056H${W-60}" stroke="${INK}" stroke-width=".6"/>
  <text x="64" y="1080" class="bp-head">層</text><text x="104" y="1080" class="bp-head">部位</text><text x="198" y="1080" class="bp-head">用途</text><text x="306" y="1080" class="bp-head">角度</text><text x="390" y="1080" class="bp-head">面數</text><text x="450" y="1080" class="bp-head">分度齒位</text>
  ${rows}
  <path d="M60 ${tableH}H${W-60}" stroke="${INK}" stroke-width="1"/>
  <g transform="translate(70 ${tableH+36})" class="bp-cell"><text x="0" y="0">總面數 <tspan class="bp-num">${plan.facets}</tspan></text><text x="170" y="0">長寬比 <tspan class="bp-num">${ratio}</tspan></text><text x="340" y="0">桌面 <tspan class="bp-num">${tableW?(tableW/Wd*100).toFixed(0)+'%':'—'}</tspan></text><text x="0" y="28">材料 ${materialName} · 折射率 <tspan class="bp-num">${ior}</tspan></text></g>
  <text x="130" y="${tableH+92}" class="bp-small">腰圍定外形 → 亭部主面再輔面 → 翻面磨冠部；每層角度只調一次</text>
  <text x="${W-330}" y="${H-122}" class="bp-small">首席切磨師</text><text x="${W-330}" y="${H-80}" class="bp-hand">Tahir Han</text><path d="M${W-335} ${H-70}q60 10 120-4t110 4" stroke="#1f2f55" stroke-width="1.4" fill="none" opacity=".7"/>
 </g>
 <g transform="rotate(-11 800 1180)" opacity=".78"><rect x="700" y="1140" width="200" height="72" rx="6" fill="none" stroke="${RED}" stroke-width="3"/><rect x="707" y="1147" width="186" height="58" rx="4" fill="none" stroke="${RED}" stroke-width="1"/><text x="800" y="1182" class="bp-stamp" text-anchor="middle">皇室核准</text><text x="800" y="1200" text-anchor="middle" style="font:600 10px Georgia,serif;fill:${RED};letter-spacing:4px">APPROVED · ROYAL</text></g>
 ${waxSeal(W-120,150,46,rand)}
 <rect x="-20" y="40" width="150" height="40" fill="url(#bpTape)" transform="rotate(-38 55 60)"/><rect x="${W-130}" y="${H-90}" width="150" height="40" fill="url(#bpTape)" transform="rotate(-38 ${W-55} ${H-70})"/>
 <path d="${edge}" fill="none" stroke="#3b230f" stroke-width="40" opacity=".45" filter="url(#bpBurn)"/>
</g>
<path d="${edge}" fill="none" stroke="#6b4423" stroke-width="1.2" opacity=".6"/>
</svg>`;
}
