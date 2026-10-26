// Refresh short vibration only while the simulation is actually doing work.
// A browser may omit or reject vibrate; the game must remain playable either way.
export function workHaptics({vibrate,clock=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout}={}){
 let active=false,last=-Infinity,timer=null,pulses=0;
 function stop(){if(timer!==null){cancel(timer);timer=null;}if(active){try{vibrate?.(0);}catch{}}active=false;last=-Infinity;}
 function work(){if(typeof vibrate!=='function')return;const now=clock();if(now-last>=70){try{const accepted=vibrate(120);active=accepted!==false;last=now;if(active)pulses++;}catch{active=false;}}if(timer!==null)cancel(timer);timer=schedule(stop,145);}
 return {work,stop,get active(){return active;},get pulses(){return pulses;},get supported(){return typeof vibrate==='function';}};
}
