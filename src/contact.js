// Scene units are used internally; mast control maps 50 mm per scene unit.
export const LAP_Y=.865, ARM_LENGTH=1.75, GEM_SCALE=.155;
export const mastY=mm=>mm/50;
export function faceNormal(face){const a=face[0],b=face[1],c=face[2];const u=b.map((x,i)=>x-a[i]),v=c.map((x,i)=>x-a[i]);const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n)||1;return n.map(x=>x/l);}
export const normalKey=n=>n.map(v=>v.toFixed(3)).join(':');
// Rotate local crystal around its index axis, then flip for a transferred dop.
export function orientPoint(p,index,flip){const a=index*Math.PI/48,c=Math.cos(a),s=Math.sin(a);let x=c*p[0]+s*p[2],y=p[1],z=-s*p[0]+c*p[2];return [x,flip?-y:y,flip?-z:z];}
export function vertexWorld(p,angle,mast,index,flip){const [x0,y0,z0]=orientPoint(p,index,flip),x=x0*GEM_SCALE,y=y0*GEM_SCALE-ARM_LENGTH,c=Math.cos(angle),s=Math.sin(angle);return [.3+c*x+s*y,mast-s*x+c*y,z0*GEM_SCALE+.65];}
export function lowestY(faces,angle,mast,index,flip){let y=Infinity;for(const f of faces)for(const p of f)y=Math.min(y,vertexWorld(p,angle,mast,index,flip)[1]);return y;}
export function supportedAngle(faces,requested,mast,index,flip){if(lowestY(faces,requested,mast,index,flip)>=LAP_Y-1e-9)return requested;let lo=requested,hi=Math.max(requested+.1,Math.PI*.92);for(let i=0;i<22;i++){const mid=(lo+hi)/2;if(lowestY(faces,mid,mast,index,flip)<LAP_Y)lo=mid;else hi=mid;}return hi;}

// Mast height at first touch for the current geometry; independent of a design target.
export function contactHeight(faces,angle,index,flip){return (LAP_Y-lowestY(faces,angle,0,index,flip))*50;}
