import {clip,dot,volume} from './geometry.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Input is hand travel, not screen pressure. The final stroke compresses against the lap.
export function leverResponse(travel){const t=clamp(travel,0,1.5),touch=.76;return {contact:clamp(t/touch,0,1),pressure:clamp(.06+(t-touch)*1.35,.06,1),handle:t<=touch?t:touch+(t-touch)*.22};}
// Deterministic, off-axis chip: material loss survives saving and server replay.
export function impactChip(faces,normal,speed){if(!Number.isFinite(speed)||speed<=2.2)return null;const severity=clamp((speed-2.2)/5,0,1),axis=Math.abs(normal[0])<.8?[1,0,0]:[0,0,1];const raw=normal.map((v,i)=>v*.8+axis[i]*.6),len=Math.hypot(...raw),n=raw.map(v=>v/len),max=Math.max(...faces.flat().map(p=>dot(p,n))),d=max-(.025+.13*severity),next=clip(faces,n,d);if(next.length<4||volume(next)<.012||volume(next)>=volume(faces)-1e-8)return null;return {faces:next,n,d,severity};}
