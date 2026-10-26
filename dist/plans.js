import {GEM_SCALE} from './contact.js?v=contact-29';
import {box,clip,volume,dot} from './geometry.js?v=contact-29';
// Original game-only constructions. No angles or facet layouts transcribed from reference sheets.
// These are geometric practice designs for simulated glass, not optically certified cutting recipes.
const specs=[
['learn-triangle','三角晶','初光','入門','triangle',3,'learn',1,1,0],
['learn-square','方晶','四方光','入門','asscher',4,'learn',1,1,1],
['learn-long','長方晶','雙角光','入門','emerald',4,'learn',1,1,2],
['single','八面單式','初光','入門','round',8,'simple',1,1,0],
['step','方形階梯','方庭','熟練','emerald',8,'step',.83,1.1,1],
['brilliant','圓形練習式','晨星','熟練','round',16,'brilliant',1,1,2],
['round','圓形明亮式風格','星芒','進階','round',16,'brilliant',1,1,3],
['oval','橢圓形','月舟','進階','oval',16,'brilliant',.78,1.12,4],
['emerald','祖母綠式','翠窗','熟練','emerald',8,'step',.78,1.12,5],
['marquise','馬眼形','雙尖月','高難度','marquise',16,'brilliant',.72,1.1,6],
['pear','梨形','晨露','高難度','pear',16,'brilliant',.86,1.05,7],
['oldmine','老礦式風格','舊時光','進階','cushion',8,'antique',1,1,8],
['rose','玫瑰式','花穹','熟練','round',12,'rose',1,1,9],
['mughal','莫臥兒風格','蓮影','高難度','oval',12,'rose',.86,1.08,10],
['portrait','肖像式','清影','高難度','emerald',8,'portrait',.85,1.12,11],
['cushion','長形墊形','柔枕','進階','cushion',16,'brilliant',.82,1.12,12],
['radiant','雷迪恩式風格','光窗','高難度','emerald',16,'brilliant',.82,1.08,13],
['asscher','阿斯切式風格','鏡庭','進階','emerald',8,'step',1,1,14],
['heart','愛心切割','心語','高難度','pear',16,'brilliant',.92,1.03,18],
['meteor','流星切割','流星','高難度','kite',12,'brilliant',.82,1.22,19],
['star','星芒切割','星芒','高難度','hexagon',12,'brilliant',1,1,20],
['french','法式切割','法式窗','進階','emerald',8,'step',.9,.9,21],
['hexagon','六角形','六瓣星','熟練','hexagon',6,'simple',1,1,15],
['lozenge','菱形','菱光','進階','lozenge',16,'simple',.85,1.12,16],
['kite','風箏形','紙鳶','進階','kite',16,'brilliant',.9,1.05,17]
];
const polygon={emerald:[[-.72,-1],[.72,-1],[1,-.72],[1,.72],[.72,1],[-.72,1],[-1,.72],[-1,-.72]],marquise:[[0,1],[.55,.5],[.74,0],[.55,-.5],[0,-1],[-.55,-.5],[-.74,0],[-.55,.5]],pear:[[0,1],[.45,.55],[.8,0],[.67,-.6],[.32,-.82],[-.32,-.82],[-.67,-.6],[-.8,0],[-.45,.55]],lozenge:[[0,1],[.78,0],[0,-1],[-.78,0]],kite:[[0,.72],[.85,.25],[0,-1],[-.85,.25]],hexagon:Array.from({length:6},(_,i)=>[Math.cos(i*Math.PI/3),Math.sin(i*Math.PI/3)])};
function outlineSupport(shape,theta,rx,rz){const c=Math.cos(theta),s=Math.sin(theta);if(polygon[shape])return Math.max(...polygon[shape].map(([x,z])=>x*rx*c+z*rz*s));if(shape==='cushion'){const p=1.4;return (Math.abs(rx*c)**p+Math.abs(rz*s)**p)**(1/p);}return Math.hypot(rx*c,rz*s);}
export function planeNormal(angle,index,flip){const a=angle*Math.PI/180,t=index*Math.PI/48;return [Math.sin(a)*Math.cos(t),(flip?1:-1)*Math.cos(a),Math.sin(a)*Math.sin(t)];}
const cache=new Map();
export const plans=Object.fromEntries(specs.map(([id,family,name,difficulty,shape,n,style,rx,rz,variant])=>[id,{id,family,name:`${name} · ${family}`,difficulty,shape,n,style,rx,rz,variant,description:'FACET 原創幾何練習圖 · 適用遊戲玻璃。角度未經實體或光學驗證。'}]));
export const catalogPlanIds=['round','oval','emerald','marquise','pear','oldmine','rose','mughal','portrait','intaglio','cushion','radiant','asscher','heart','meteor','star','french','hexagon','lozenge','kite','cabochon'];
export const specialistPlans={
 cabochon:{name:'水滴穹 · 弧面研磨',difficulty:'專門工藝',kind:'曲面研磨',steps:[['選向與畫線','觀察材料內部結構，畫出橢圓底線。若要星光或貓眼，先依材料定向。','底線完整，標記方向可追溯。'],['粗磨輪廓','使用粗磨輪沿底線定形，預留修整量。持續移動工件，避免磨出平面。','俯視輪廓對稱，邊緣無崩缺。'],['形成圓頂','從肩部逐步向頂部連續掃磨，維持平滑曲率。','側視輪廓連續，沒有固定刻面或高低斷點。'],['逐級細磨','依材料與磨具逐級變細，每一級都去除上一級刮痕。','擦乾後轉動檢查，不留深刮痕。'],['表面拋光','選合適的柔性拋光工具，低負荷持續移動。','燈線連續滑過圓頂，沒有凹坑。'],['驗收與收藏','檢查底緣、輪廓和光學方向，記錄重量。','星光與貓眼只能來自適合的材料。']]},
 intaglio:{name:'月葉印 · 凹雕',difficulty:'專門工藝',kind:'局部雕刻',steps:[['構圖與定位','在可雕刻材料表面畫出原創月葉圖案，設定保留邊界。','圖案在輪廓內，預留足夠底厚。'],['建立淺槽','使用適合的雕刻磨頭低負荷刻出引導線。','淺槽連續，未越過邊界。'],['分層雕深','分區少量移除，保留未雕區；深度依材料與圖案調整。','側光能看出層次，沒有穿底。'],['修整細節','更換小磨頭整理葉脈和邊緣，清除局部毛邊。','線條清楚，轉折沒有意外崩口。'],['細磨與局部拋光','使用適合形狀的磨頭處理槽底與側壁，避免磨平細節。','槽底可檢查，原設計線條仍保留。'],['印面檢查','依設計檢查凹面或試印效果，記錄殘餘底厚。','圖案完整且結構穩定。']]}
};
export function buildPlan(id){if(cache.has(id))return cache.get(id);const cfg=plans[id];if(!cfg)throw Error('Unknown facet plan');if(cfg.style==='learn')return buildLearnPlan(cfg);const {shape,n,style,variant}=cfg;const rx=.64*cfg.rx,rz=.64*cfg.rz,indices=Array.from({length:n},(_,i)=>Math.round(i*96/n)%96);let faces=box(),cuts=[];const add=(part,angle,index,flip,d,group)=>{const normal=planeNormal(angle,index,flip),next=clip(faces,normal,d);if(volume(faces)-volume(next)<1e-7)return;const cut={id:group+(cuts.filter(c=>c.group===group).length+1),part,angle,index,flip,d,normal,group};faces=next;cuts.push(cut);};
 const support=i=>outlineSupport(shape,i*Math.PI/48,rx,rz);
 for(const i of indices)add('腰圍',90,i,false,support(i),'G');
 if(style==='portrait'){add('底面',0,0,false,.09,'B');}
 else if(style==='rose'){add('底面',0,0,false,.07,'B');}
 else if(style==='step'){for(const [tier,a,factor,depth]of [[1,59,1,.055],[2,49,.80,.22],[3,40,.51,.42]])for(const i of indices)add('亭部',a,i,false,Math.sin(a*Math.PI/180)*support(i)*factor+Math.cos(a*Math.PI/180)*depth,'P'+tier+'-');}
 else{const a=40+(variant%4);for(const i of indices)add('亭部',a,i,false,Math.sin(a*Math.PI/180)*support(i)+Math.cos(a*Math.PI/180)*.055,'P');if(style==='brilliant'){for(const i of indices.map(i=>(i+Math.round(48/n))%96)){const a2=45+(variant%3),normal=planeNormal(a2,i,false),max=Math.max(...faces.flat().map(p=>dot(p,normal)));add('亭部',a2,i,false,max-.025,'L');}}if(style==='antique')add('底尖',0,0,false,.53,'K');}
 if(style==='step'){for(const [tier,a,factor,y]of [[1,47,1,.055],[2,33,.81,.17],[3,22,.58,.27]])for(const i of indices)add('冠部',a,i,true,Math.sin(a*Math.PI/180)*support(i)*factor+Math.cos(a*Math.PI/180)*y,'C'+tier+'-');add('台面',0,0,true,.32,'T');}
 else if(style==='portrait'){for(const i of indices)add('冠部',24,i,true,Math.sin(24*Math.PI/180)*support(i)+.035,'C');add('台面',0,0,true,.09,'T');}
 else if(style==='rose'){for(const i of indices)add('冠部',43,i,true,Math.sin(43*Math.PI/180)*support(i)+.035,'C');for(const i of indices.map(i=>(i+Math.round(48/n))%96))add('冠部',24,i,true,Math.sin(24*Math.PI/180)*support(i)*.6+Math.cos(24*Math.PI/180)*.23,'R');}
 else {const a=style==='antique'?39:31+variant%4;for(const i of indices)add('冠部',a,i,true,Math.sin(a*Math.PI/180)*support(i)+Math.cos(a*Math.PI/180)*.055,'C');if(style==='brilliant')for(const i of indices.map(i=>(i+Math.round(48/n))%96)){const as=21+variant%3,normal=planeNormal(as,i,true),max=Math.max(...faces.flat().map(p=>dot(p,normal)));add('冠部',as,i,true,max-.035,'S');}add('台面',0,0,true,style==='antique'?.38:.28,'T');}
 // Keep the geometry steps, including preform facets that later stages refine.
 const sequence=[];for(const flip of [false,true]){const side=cuts.filter(c=>c.flip===flip);for(const [lap,stage]of [['cut','粗磨'],['fine','細磨'],['polish','拋光']])for(const c of side){const retained=faces.some(f=>Math.abs(dot(f[0],c.normal)-c.d)<1e-5&&f.every(p=>Math.abs(dot(p,c.normal)-c.d)<1e-5));if(lap!=='cut'&&!retained)continue;sequence.push({...c,lap,stage,retained,stepId:`${c.id}-${lap}`,targetHeight:(.865+GEM_SCALE*c.d+1.75*Math.cos(c.angle*Math.PI/180))*50,inspect:lap==='cut'?'檢查亮起刻面的邊界與相鄰交點；依圖保留腰圍，深度不要超過目標。':lap==='fine'?'擦乾查看本面磨痕；前一道深刮痕消失後再換下一面。':'轉動檢查本面燈線與交點；只拋這一面，不以整顆亮度判斷。'});}}
 const result={...cfg,cuts,faces,sequence,facets:faces.length,volume:volume(faces)};cache.set(id,result);return result;}
function project(p,view){if(view==='side')return [p[2],-p[1]];if(view==='pavilion')return [-p[0],p[2]];return [p[0],-p[2]];}
export function planSVG(id,step=0,view='crown'){const plan=buildPlan(id),s=plan.sequence[step]||plan.sequence[0];let geometry=plan.faces;if(!s.retained){geometry=box();for(const c of plan.cuts){geometry=clip(geometry,c.normal,c.d);if(c.id===s.id)break;}}const current=geometry.filter(f=>f.every(p=>Math.abs(dot(p,s.normal)-s.d)<1e-5));const points=geometry.flat().map(p=>project(p,view)),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),scale=160/Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;const polygon=f=>f.map(p=>{const [x,y]=project(p,view);return `${(110+(x-cx)*scale).toFixed(2)},${(110+(y-cy)*scale).toFixed(2)}`;}).join(' ');const faces=geometry.slice().sort((a,b)=>a.reduce((n,p)=>n+p[1],0)/a.length-b.reduce((n,p)=>n+p[1],0)/b.length);return `<svg viewBox="0 0 220 220" role="img" aria-label="${plan.name} ${view==='side'?'側面':view==='pavilion'?'亭部':'冠部'}圖；目前 ${s.id}"><path d="M110 8V212M8 110H212" stroke="#e3d4df" stroke-dasharray="3 5"/>${faces.map(f=>`<polygon points="${polygon(f)}" fill="#faf5f9" fill-opacity=".24" stroke="#9a7a92" stroke-width=".8"/>`).join('')}${current.map(f=>`<polygon points="${polygon(f)}" fill="#bc86a9" fill-opacity=".8" stroke="#71475f" stroke-width="2"/>`).join('')}<text x="110" y="211" text-anchor="middle" fill="#77516c" font-size="14">${s.id} · ${s.stage}${s.retained?'':' · 定形'}</text></svg>`;}

function buildLearnPlan(cfg){let faces=box().map(f=>f.map(p=>p.map(v=>v*3)));const cuts=[];function add(angle,index,flip,d,part,id){const normal=planeNormal(angle,index,flip);faces=clip(faces,normal,d);cuts.push({angle,index,flip,d,normal,part,id,group:part==='台面'?'T':'P',retained:true});}add(0,0,true,.65,'台面','T1');const indices=cfg.n===3?[0,32,64]:cfg.variant===2?[0,48,24,72]:[0,24,48,72];indices.forEach((index,i)=>add(cfg.variant===2&&index%48===24?55:45,index,false,.15,'亭部','P'+(i+1)));const sequence=[];for(const [lap,stage]of [['cut','粗磨'],['fine','細磨'],['polish','拋光']])for(const c of cuts)sequence.push({...c,lap,stage,stepId:c.id+'-'+lap,targetHeight:(.865+GEM_SCALE*c.d+1.75*Math.cos(c.angle*Math.PI/180))*50,inspect:'觀察刻面交點。'});const result={...cfg,cuts,faces,sequence,facets:faces.length,volume:volume(faces)};cache.set(cfg.id,result);return result;}
