// A small workshop apprentice (Kenney Mini Characters, CC0) who stands on a stool beside the machine,
// reaches for the angle dial whenever a setting turns, nods when a facet finishes and shakes her head on an impact.
const BASE='models/kenney/';
export function createApprentice({THREE,GLTFLoader,scene,position=[3.45,0,1.05],face=[0.3,2.67,0.83],scale=2.1}){
  const root=new THREE.Group();root.name='apprentice';root.position.set(...position);scene.add(root);
  let mixer=null,actions={},current=null,oneShotUntil=0;const loader=new GLTFLoader();
  const stoolH=.46;
  loader.load(BASE+'stoolBar.glb',g=>{const s=g.scene;s.scale.setScalar(1.2);s.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;if(o.material?.name==='carpet')o.material.color.set('#6b2d4a');if(o.material?.name==='wood')o.material.color.set('#7a5230');}});root.add(s);},undefined,()=>{});
  loader.load(BASE+'character-female-a.glb',g=>{const c=g.scene;c.scale.setScalar(scale);c.position.y=stoolH;c.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    root.add(c);const target=new THREE.Vector3(face[0],root.position.y+stoolH,face[2]);c.lookAt(target.x,c.getWorldPosition(new THREE.Vector3()).y,target.z);
    mixer=new THREE.AnimationMixer(c);for(const clip of g.animations)actions[clip.name]=mixer.clipAction(clip);
    for(const n of ['interact-right','emote-yes','emote-no','pick-up']){const a=actions[n];if(a){a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;}}play('idle');},undefined,()=>{});
  function play(name,fade=.25){const next=actions[name];if(!next||next===current&&next.loop!==THREE.LoopOnce)return;next.reset().setEffectiveWeight(1).fadeIn(fade).play();if(current&&current!==next)current.fadeOut(fade);current=next;
    if(next.loop===THREE.LoopOnce)oneShotUntil=performance.now()+next.getClip().duration*1000;}
  function gesture(name){if(performance.now()<oneShotUntil-150)return;play(name,.15);}
  return {root,gesture,update(dt){if(!mixer)return;mixer.update(dt);if(current&&current.loop===THREE.LoopOnce&&performance.now()>oneShotUntil)play('idle',.35);}};
}
