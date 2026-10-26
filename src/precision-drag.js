// Derive values from total pointer travel, never from rounded intermediate values.
export function dragSetting(kind,start,dx,{intro=false,fine=false}={}){
 const rate=kind==='height'?(fine?.001:.02):intro?1/12:fine?.005:.1;
 const value=start+dx*rate;
 return kind==='height'?Math.round(value*100)/100:intro?Math.round(value):Math.round(value*1000)/1000;
}
