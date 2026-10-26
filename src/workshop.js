import * as THREE from 'three';
// All bench accessories are measured from one tabletop datum, y = 0.
export function addWorkshop(scene){
 const room=new THREE.Group();room.name='workshop';scene.add(room);
 const mat=(color,roughness=.65,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const oakCanvas=document.createElement('canvas');oakCanvas.width=1024;oakCanvas.height=512;const ctx=oakCanvas.getContext('2d');ctx.fillStyle='#a8896a';ctx.fillRect(0,0,1024,512);let seed=241;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<1400;i++){const y=random()*512;ctx.strokeStyle=`rgba(57,37,23,${.015+random()*.1})`;ctx.lineWidth=.3+random();ctx.beginPath();ctx.moveTo(0,y);ctx.bezierCurveTo(300,y+random()*9,700,y-random()*9,1024,y);ctx.stroke();}for(const y of [128,256,384]){ctx.fillStyle='#6f55391c';ctx.fillRect(0,y,1024,1);}
 const wood=new THREE.CanvasTexture(oakCanvas);wood.colorSpace=THREE.SRGBColorSpace;wood.wrapS=wood.wrapT=THREE.RepeatWrapping;wood.repeat.set(1.5,1);
 const oak=new THREE.MeshStandardMaterial({map:wood,roughness:.52,bumpMap:wood,bumpScale:.0015});
 function box(name,w,h,d,m,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.name=name;o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;room.add(o);return o;}
 function onBench(name,w,h,d,m,x,z){const o=box(name,w,h,d,m,x,h/2,z);o.userData.benchAccessory=true;return o;}
 const steel=mat('#50575a',.38,.78),ivory=mat('#ddd5c8',.58),brass=mat('#a38b66',.32,.75),rubber=mat('#34383a',.94);
 box('tabletop',9.4,.24,6,oak,0,-.12,0);
 for(const x of [-4,4])for(const z of [-2.5,2.5])box('table-leg',.18,3.36,.18,steel,x,-1.92,z);
 box('rear-table-brace',8,.16,.12,steel,0,-2.8,-2.5);
 box('floor',26,.12,26,mat('#e4d8c4',.82),0,-3.66,0);
 box('rear-wall',20,14,.18,mat('#f6eedf',.82),0,3.4,-4.7);
 box('side-wall',.18,14,18,mat('#eee3d1',.82),7,3.4,0);
 // Window frame, recess and sill occupy the room wall, never the table volume.
 box('window-recess',4.7,3.15,.16,mat('#d8c6aa'),.7,2.8,-4.52);
 const skyCanvas=document.createElement('canvas');skyCanvas.width=64;skyCanvas.height=256;const sky=skyCanvas.getContext('2d'),gradient=sky.createLinearGradient(0,0,0,256);gradient.addColorStop(0,'#d7ecf8');gradient.addColorStop(.65,'#fff7df');gradient.addColorStop(1,'#ecd19b');sky.fillStyle=gradient;sky.fillRect(0,0,64,256);const skyTexture=new THREE.CanvasTexture(skyCanvas);skyTexture.colorSpace=THREE.SRGBColorSpace;
 box('window-daylight',4.45,2.9,.02,new THREE.MeshBasicMaterial({map:skyTexture}),.7,2.8,-4.42);
 for(const x of [-1.57,.7,2.97])box('window-mullion',.065,3.1,.12,ivory,x,2.8,-4.34);
 for(const y of [1.27,2.8,4.33])box('window-crossbar',4.65,.065,.12,ivory,.7,y,-4.34);
 box('window-sill',4.9,.12,.44,ivory,.7,1.2,-4.2);
 box('shelf',2.1,.1,.5,oak,-3.3,1.9,-4.3);
 for(let i=0;i<3;i++){const h=.32+i*.06;box('compound-container',.32,h,.28,mat(['#b5aaa4','#a9b5b3','#d3c6af'][i]),-3.9+i*.53,1.95+h/2,-4.22);box('container-lid',.34,.035,.3,steel,-3.9+i*.53,1.95+h+.018,-4.22);}
 const rod=(name,a,b,r,m)=>{const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,v.length(),20),m);o.name=name;o.position.copy(new THREE.Vector3(...a).addScaledVector(v,.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());o.castShadow=true;room.add(o);};
 onBench('lamp-base',.7,.12,.55,steel,3.25,-1.75);rod('lamp-upright',[3.25,.12,-1.75],[3.25,2.6,-1.75],.045,steel);rod('lamp-arm',[3.25,2.6,-1.75],[.1,3.6,-.75],.04,steel);
 box('lamp-shade',1.4,.15,.4,steel,.1,3.6,-.75);box('lamp-diffuser',1.25,.02,.31,new THREE.MeshStandardMaterial({color:'#f8f4e7',emissive:'#fff4da',emissiveIntensity:2}),.1,3.515,-.75);
 const lamp=new THREE.SpotLight(0xffe7ce,35,10,Math.PI/3,.75,1.5);lamp.position.set(.1,3.49,-.75);lamp.target.position.set(-.65,.865,0);scene.add(lamp,lamp.target);
 const daylight=new THREE.DirectionalLight(0xfff4d9,1.7);daylight.position.set(.7,5,-4.3);scene.add(daylight);
 onBench('folded-cloth',1.05,.05,.7,mat('#bcaaa6',.99),-3.1,1.4);
 onBench('tool-tray',.95,.075,.75,steel,3.35,1.1);box('tray-liner',.85,.01,.65,rubber,3.35,.08,1.1);
 for(let i=0;i<3;i++)rod('spare-dop',[3.07+i*.24,.105,.9],[3.07+i*.24,.105,1.32],.025,brass);
 // Pale wall trim and a framed crystal study sit above the bench, clear of the tools.
 box('wall-dado',20,.06,.08,ivory,0,.25,-4.56);
 box('study-frame',1.05,1.36,.075,brass,-3.25,3.15,-4.54);
 box('study-paper',.96,1.27,.02,mat('#f2eee4',.98),-3.25,3.15,-4.49);
 const study=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(.38)),new THREE.LineBasicMaterial({color:'#8b7b93'}));study.scale.set(.8,1.25,.1);study.position.set(-3.25,3.15,-4.46);room.add(study);
 // Advanced courses unveil a separate palace suite around the same working machine.
 const royal=new THREE.Group();royal.name='royal-suite';royal.visible=false;room.add(royal);
 const royalStone=mat('#d8c39b',.72),royalGold=mat('#c7a35b',.24,.82),royalGlass=new THREE.MeshPhysicalMaterial({color:'#86c6bd',roughness:.12,metalness:.08,transmission:.35,transparent:true,opacity:.72});
 const royalBox=(w,h,d,m,x,y,z)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;royal.add(o);return o;};
 // Pointed arches, brass display cabinets and a chandelier make the room distinct without entering the bench volume.
 for(const x of [-5.5,5.5]){const arch=new THREE.Mesh(new THREE.TorusGeometry(1.45,.12,12,36,Math.PI),royalGold);arch.position.set(x,3.8,-4.42);arch.rotation.z=Math.PI;royal.add(arch);royalBox(.12,2.4,.12,royalGold,x-1.45,2.6,-4.42);royalBox(.12,2.4,.12,royalGold,x+1.45,2.6,-4.42);}
 for(const x of [-5.35,5.35]){royalBox(1.42,2.1,.22,royalGold,x,1.65,-4.36);royalBox(1.24,1.85,.03,royalGlass,x,1.66,-4.22);for(let i=0;i<3;i++){const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.16+i*.025),new THREE.MeshStandardMaterial({color:['#4ba99c','#8c65b8','#d0a555'][i],metalness:.35,roughness:.2,emissive:['#123d39','#271337','#4b2f0b'][i],emissiveIntensity:.25}));gem.position.set(x-.32+i*.32,1.18+i*.22,-4.15);royal.add(gem);}}
 const chain=mat('#b78f4b',.3,.75);for(let i=0;i<3;i++){const c=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.72+i*.12,12),chain);c.position.set((i-1)*.28,5.6-(i*.06),-.6);royal.add(c);}const chandelier=new THREE.Mesh(new THREE.TorusGeometry(.55,.05,10,32),royalGold);chandelier.position.set(0,4.95,-.6);chandelier.rotation.x=Math.PI/2;royal.add(chandelier);for(let i=0;i<6;i++){const a=i*Math.PI/3,light=new THREE.Mesh(new THREE.SphereGeometry(.075,16,12),new THREE.MeshStandardMaterial({color:'#fff1bd',emissive:'#ffc96b',emissiveIntensity:2}));light.position.set(Math.cos(a)*.52,4.95,Math.sin(a)*.52-.6);royal.add(light);}
 return room;
}
