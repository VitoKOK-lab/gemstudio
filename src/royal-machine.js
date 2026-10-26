// Gold-and-onyx trim for the royal (advanced) levels: base plate, lit finials, crest and a gauge.
import * as THREE from 'three';

export function buildRoyalMachine() {
  const group = new THREE.Group();
  group.name = 'royal-faceting-machine';
  const gold = new THREE.MeshStandardMaterial({color: '#d1a552', metalness: 0.88, roughness: 0.2}),
    onyx = new THREE.MeshStandardMaterial({color: '#171719', metalness: 0.45, roughness: 0.25}),
    light = new THREE.MeshStandardMaterial({color: '#fff0b5', emissive: '#e7ab4c', emissiveIntensity: 1.5});
  const add = (geo, mat, [x, y, z], rot) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rot) m.rotation.set(...rot);
    group.add(m);
    return m;
  };
  add(new THREE.BoxGeometry(4.85, 0.07, 3.75), onyx, [0.4, 0.13, 0]);
  for (const x of [-2.02, 2.7]) {
    add(new THREE.CylinderGeometry(0.09, 0.13, 0.34, 16), gold, [x, 0.64, -1.48]);
    add(new THREE.SphereGeometry(0.075, 16, 12), light, [x, 0.84, -1.48]);
  }
  add(new THREE.TorusKnotGeometry(0.16, 0.035, 40, 8), gold, [2.18, 2.25, -0.12], [Math.PI / 2, 0, 0]);
  add(new THREE.CylinderGeometry(0.29, 0.29, 0.055, 40), onyx, [2.18, 1.58, -0.11], [Math.PI / 2, 0, 0]);
  add(new THREE.BoxGeometry(0.018, 0.18, 0.018), gold, [2.18, 1.58, -0.145], [0, 0, 0.6]);
  return group;
}
