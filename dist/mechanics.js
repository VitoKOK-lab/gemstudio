// Illustrative screw backlash, not a manufacturer's measured tolerance.
export const BACKLASH_DEG = 0.08;
export function turnAngle(output, delta, drive=output) {
 const command=Math.max(0,Math.min(90,drive+delta));
 // A play operator: shaft rests within a backlash band around the screw input.
 const actual=Math.max(0,Math.min(90,Math.max(command-BACKLASH_DEG/2,Math.min(command+BACKLASH_DEG/2,output))));
 return {angle:actual,angleDrive:command};
}
export const indicatedAngle=a=>Number(a.toFixed(1));
