import React, {useMemo} from 'react';
import * as THREE from 'three';

/** Océano low-poly animado: h(x, z) definido por la escena; color con espuma en crestas. */
export const Water: React.FC<{
  width: number; depth: number; segX: number; segZ: number; center?: [number, number];
  height: (x: number, z: number) => number; foam?: (x: number, z: number, h: number) => number; opacity?: number;
}> = ({width, depth, segX, segZ, center = [0, 0], height, foam, opacity = 0.96}) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, depth, segX, segZ);
    g.rotateX(-Math.PI / 2);
    g.translate(center[0], 0, center[1]);
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
    return g;
  }, [width, depth, segX, segZ, center[0], center[1]]);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const col = geo.attributes.color as THREE.BufferAttribute;
  const deep = new THREE.Color('#1667c9');
  const mid = new THREE.Color('#2a95ee');
  const white = new THREE.Color('#f2fbff');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = height(x, z);
    pos.setY(i, h);
    c.copy(deep).lerp(mid, Math.min(1, Math.max(0, h * 0.35 + 0.4)));
    const f = foam ? foam(x, z, h) : 0;
    if (f > 0) c.lerp(white, Math.min(1, f));
    col.setXYZ(i, c.r, c.g, c.b);
  }
  pos.needsUpdate = true;
  col.needsUpdate = true;
  geo.computeVertexNormals();
  return (
    <mesh geometry={geo} receiveShadow castShadow>
      <meshStandardMaterial vertexColors flatShading roughness={0.55} metalness={0.0} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  );
};
