import React from 'react';
import {W, H, rng, rgba, clamp, project, Cam, V3, noise1, smoothPath, lerp} from './lib';
import {PAL} from './fx';
import {SPECS} from './People';

// ============================================================ IRIS MACRO
export const Eye: React.FC<{t: number; pupil: number; zoom?: number; reflect?: number; lid?: number}> = ({t, pupil, zoom = 1, reflect = 1, lid = 0}) => {
  const fibers = React.useMemo(() => {
    const r = rng(11);
    return Array.from({length: 320}, (_, i) => {
      const a = (i / 320) * Math.PI * 2 + (r() - 0.5) * 0.02;
      return {a, w: 1.5 + r() * 4, c: r(), wob: r() * 6, len: 0.8 + r() * 0.2};
    });
  }, []);
  const crypts = React.useMemo(() => {
    const r = rng(5);
    return Array.from({length: 26}, () => ({a: r() * Math.PI * 2, d: 0.45 + r() * 0.3, s: 10 + r() * 22}));
  }, []);
  const R = 430;
  const P = R * pupil;
  const cx = W / 2;
  const cy = H / 2;
  const fpath = (f: (typeof fibers)[number]) => {
    const pts: [number, number][] = [];
    for (let k = 0; k <= 6; k++) {
      const u = k / 6;
      const rr = lerp(P * 1.02, R * 0.97 * f.len, u);
      const aa = f.a + Math.sin(u * 7 + f.wob) * 0.025 + noise1(u * 3 + f.wob) * 0.02;
      pts.push([cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr]);
    }
    return smoothPath(pts);
  };
  const s = SPECS.B;
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
      <defs>
        <radialGradient id="irisG">
          <stop offset={`${(pupil * 100).toFixed(1)}%`} stopColor="#3b1a06" />
          <stop offset={`${(pupil * 100 + 8).toFixed(1)}%`} stopColor="#c9771e" />
          <stop offset="55%" stopColor="#8a5a1c" />
          <stop offset="80%" stopColor="#4d6b3a" />
          <stop offset="96%" stopColor="#1e2a16" />
          <stop offset="100%" stopColor="#05070a" />
        </radialGradient>
        <radialGradient id="scleraG" cx="0.5" cy="0.5" r="0.6">
          <stop offset="35%" stopColor="#e9d8d2" />
          <stop offset="75%" stopColor="#a8706e" />
          <stop offset="100%" stopColor="#3a1a20" />
        </radialGradient>
        <radialGradient id="pupilG">
          <stop offset="0%" stopColor="#000" />
          <stop offset="85%" stopColor="#020104" />
          <stop offset="100%" stopColor="#1a0a04" />
        </radialGradient>
        <radialGradient id="corneaG" cx="0.35" cy="0.3" r="0.7">
          <stop offset="0%" stopColor="#fff" stopOpacity={0.22} />
          <stop offset="50%" stopColor="#fff" stopOpacity={0.04} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0} />
        </radialGradient>
      </defs>
      <g transform={`translate(${cx},${cy}) scale(${zoom}) translate(${-cx},${-cy})`}>
        <rect x={-W} y={-H} width={W * 3} height={H * 3} fill="url(#scleraG)" />
        {/* vasos de la esclerótica */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const a = i * 0.8 + 0.3;
          const pts: [number, number][] = [0, 1, 2, 3, 4].map((k) => [cx + Math.cos(a + Math.sin(k * 2 + i) * 0.12) * (R + 30 + k * 90), cy + Math.sin(a + Math.sin(k * 2 + i) * 0.12) * (R + 30 + k * 90)]);
          return <path key={i} d={smoothPath(pts)} stroke={rgba('#c03040', 0.35)} strokeWidth={4 - i * 0.3} fill="none" />;
        })}
        <circle cx={cx} cy={cy} r={R + 30} fill={rgba('#000000', 0.35)} />
        <circle cx={cx} cy={cy} r={R} fill="url(#irisG)" />
        {fibers.map((f, i) => (
          <path key={i} d={fpath(f)} stroke={f.c < 0.33 ? rgba('#ffcf7a', 0.35) : f.c < 0.66 ? rgba('#3a1c08', 0.4) : rgba('#9fd08a', 0.22)} strokeWidth={f.w} fill="none" strokeLinecap="round" />
        ))}
        {crypts.map((c, i) => (
          <ellipse key={i} cx={cx + Math.cos(c.a) * R * c.d} cy={cy + Math.sin(c.a) * R * c.d} rx={c.s} ry={c.s * 0.45} transform={`rotate(${(c.a * 180) / Math.PI} ${cx + Math.cos(c.a) * R * c.d} ${cy + Math.sin(c.a) * R * c.d})`} fill={rgba('#1a0a02', 0.5)} />
        ))}
        {/* collarete */}
        <circle cx={cx} cy={cy} r={P * 1.45 + 20} fill="none" stroke={rgba('#ffd28a', 0.35)} strokeWidth={10} strokeDasharray="14 9" />
        <circle cx={cx} cy={cy} r={P} fill="url(#pupilG)" />
        {/* reflejo en la córnea: la persona amada */}
        <g opacity={reflect} transform={`translate(${cx + 80},${cy - 150}) scale(0.32,0.34)`}>
          <path d={smoothPath([...s.face, ...s.back], true, 0.9)} fill={rgba('#ffd9c0', 0.22)} transform="scale(-1,1) translate(-560,-500)" />
          <path d={smoothPath(s.hair, true, 0.9)} fill={rgba('#ffd9c0', 0.16)} transform="scale(-1,1) translate(-560,-500)" />
        </g>
        <circle cx={cx} cy={cy} r={R + 40} fill="url(#corneaG)" />
        <ellipse cx={cx - 170} cy={cy - 190} rx={80} ry={46} fill="#fff" opacity={0.75} transform={`rotate(-30 ${cx - 170} ${cy - 190})`} />
        <circle cx={cx + 210} cy={cy + 170} r={18} fill="#fff" opacity={0.5} />
      </g>
      {/* párpados con pestañas (encuadre macro) */}
      <g transform={`translate(${cx},${cy}) scale(${zoom}) translate(${-cx},${-cy})`}>
        <path d={`M-200,-200 L${W + 200},-200 L${W + 200},${cy - 470} C${cx + 380},${cy - 640} ${cx - 380},${cy - 640} -200,${cy - 470} Z`} fill="#2a1418" />
        <path d={`M-200,${cy - 470} C${cx - 380},${cy - 640} ${cx + 380},${cy - 640} ${W + 200},${cy - 470}`} stroke={rgba('#ffb08a', 0.35)} strokeWidth={10} fill="none" />
        {Array.from({length: 34}, (_, i) => {
          const u = i / 33;
          const x = lerp(-60, W + 60, u);
          const y = cy - 470 - Math.sin(u * Math.PI) * 128;
          const ang = lerp(-0.9, 0.9, u);
          return <path key={i} d={`M${x},${y} q${Math.sin(ang) * 40},-50 ${Math.sin(ang) * 90 + (i % 2) * 10},-120`} stroke="#0d0608" strokeWidth={7} fill="none" strokeLinecap="round" />;
        })}
        <path d={`M-200,${H + 200} L${W + 200},${H + 200} L${W + 200},${cy + 480} C${cx + 380},${cy + 600} ${cx - 380},${cy + 600} -200,${cy + 480} Z`} fill="#2a1418" />
        <path d={`M-200,${cy + 480} C${cx - 380},${cy + 600} ${cx + 380},${cy + 600} ${W + 200},${cy + 480}`} stroke={rgba('#ffb08a', 0.3)} strokeWidth={8} fill="none" />
      </g>
      {lid > 0 && (
        <>
          <rect x={0} y={0} width={W} height={H * 0.5 * lid} fill="#1a0c10" />
          <rect x={0} y={H - H * 0.5 * lid} width={W} height={H * 0.5 * lid} fill="#1a0c10" />
        </>
      )}
    </svg>
  );
};

// ============================================================ RED / TÚNEL NEURONAL 3D
interface Neuron {
  p: V3;
  branches: V3[][];
  ph: number;
  hue: number;
}
function makeNeurons(n: number, seed: number, spread: number, depth: number): Neuron[] {
  const r = rng(seed);
  return Array.from({length: n}, () => {
    const ang = r() * Math.PI * 2;
    const rad = spread * (0.35 + r() * 0.9);
    const p: V3 = [Math.cos(ang) * rad, Math.sin(ang) * rad * 1.4, r() * depth];
    const branches: V3[][] = [];
    const nb = 5 + Math.floor(r() * 4);
    for (let b = 0; b < nb; b++) {
      let dir: V3 = [r() - 0.5, r() - 0.5, (r() - 0.5) * 0.8];
      const len = Math.hypot(...dir) || 1;
      dir = [dir[0] / len, dir[1] / len, dir[2] / len];
      const pts: V3[] = [p];
      let q = p;
      const L = b === 0 ? 9 : 4 + Math.floor(r() * 3);
      for (let k = 0; k < L; k++) {
        dir = [dir[0] + (r() - 0.5) * 0.5, dir[1] + (r() - 0.5) * 0.5, dir[2] + (r() - 0.5) * 0.3];
        const step = b === 0 ? 70 : 40 + r() * 20;
        q = [q[0] + dir[0] * step, q[1] + dir[1] * step, q[2] + dir[2] * step];
        pts.push(q);
      }
      branches.push(pts);
    }
    return {p, branches, ph: r() * 10, hue: r()};
  });
}

export const NeuralField: React.FC<{
  t: number;
  cam: Cam;
  n?: number;
  seed?: number;
  spread?: number;
  depth?: number;
  colors?: string[];
  fire?: number;
  opacity?: number;
  focus?: number; // 0..1 resalta una neurona central (atención selectiva)
  calm?: number;
  synapses?: number;
}> = ({t, cam, n = 46, seed = 9, spread = 700, depth = 5000, colors = [PAL.violet, PAL.cyan, PAL.rose], fire = 1, opacity = 1, focus = 0, calm = 0, synapses = 0}) => {
  const ns = React.useMemo(() => makeNeurons(n, seed, spread, depth), [n, seed, spread, depth]);
  const items = ns
    .map((nn, i) => ({nn, i, z: project(nn.p, cam)[2]}))
    .filter((o) => o.z > 40 && o.z < 4800)
    .sort((a, b) => b.z - a.z);
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}} opacity={opacity}>
      <defs>
        <radialGradient id="nfSoma">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="35%" stopColor="#ffd6f4" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#b04dff" stopOpacity={0} />
        </radialGradient>
      </defs>
      {items.map(({nn, i, z}) => {
        const fog = clamp(1 - z / 4800) * clamp(z / 200);
        const isFocus = i === 0 && focus > 0;
        const dim = focus > 0 && !isFocus ? 1 - focus * 0.7 : 1;
        const col = colors[Math.floor(nn.hue * colors.length) % colors.length];
        const fireRate = calm > 0 ? lerp(1.4, 0.5, calm) : 1.4;
        const spike = clamp(Math.sin(t * fireRate * 2.2 + nn.ph) * 3 - 2) * fire;
        const [sx, sy, , sc] = project(nn.p, cam);
        return (
          <g key={i} opacity={fog * dim}>
            {nn.branches.map((br, b) => {
              const pts = br.map((q) => project(q, cam));
              if (pts.some((q) => q[2] < 20)) return null;
              const d = pts.map((q, k) => `${k ? 'L' : 'M'}${q[0].toFixed(1)},${q[1].toFixed(1)}`).join('');
              const w = Math.max(0.6, (b === 0 ? 7 : 5) * sc);
              // impulso viajando por la rama
              const u = ((t * (b === 0 ? 0.8 : 0.5) * (1 - calm * 0.5) + nn.ph + b * 0.21) % 1 + 1) % 1;
              const k = Math.min(pts.length - 2, Math.floor(u * (pts.length - 1)));
              const f = u * (pts.length - 1) - k;
              const px = lerp(pts[k][0], pts[k + 1][0], f);
              const py = lerp(pts[k][1], pts[k + 1][1], f);
              return (
                <g key={b}>
                  <path d={d} stroke={rgba(col, 0.25)} strokeWidth={w * 3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  <path d={d} stroke={rgba(col, 0.9)} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  {fire > 0 && <circle cx={px} cy={py} r={Math.max(2, 9 * sc)} fill="#fff" opacity={0.85 * fire} />}
                  {synapses > 0 && b > 0 && (
                    <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={Math.max(2, 14 * sc)} fill={PAL.gold} opacity={synapses * (0.4 + 0.6 * clamp(Math.sin(t * 3 + b + nn.ph)))} />
                  )}
                </g>
              );
            })}
            <circle cx={sx} cy={sy} r={Math.max(3, 60 * sc * (1 + spike * 0.4) * (isFocus ? 1 + focus : 1))} fill="url(#nfSoma)" />
            <circle cx={sx} cy={sy} r={Math.max(2, 16 * sc)} fill="#fff" opacity={0.6 + spike * 0.4} />
          </g>
        );
      })}
    </svg>
  );
};

// ============================================================ SINAPSIS
export const Synapse: React.FC<{t: number; release: number; bind: number; ap: number; others?: number; zoom?: number}> = ({t, release, bind, ap, others = 0, zoom = 1}) => {
  const cx = W / 2;
  const vesicles = React.useMemo(() => {
    const r = rng(21);
    return Array.from({length: 18}, () => ({x: cx + (r() - 0.5) * 520, y: 420 + r() * 330, s: 34 + r() * 16, ph: r() * 6}));
  }, [cx]);
  const parts = React.useMemo(() => {
    const r = rng(77);
    return Array.from({length: 150}, () => ({x0: cx + (r() - 0.5) * 520, vx: (r() - 0.5) * 900, vy: 260 + r() * 260, ph: r(), kind: r()}));
  }, [cx]);
  const receptors = Array.from({length: 9}, (_, i) => cx - 400 + i * 100);
  const memTop = 880;
  const memBot = 1200;
  const bilayer = (y: number, k: string, curve: number) =>
    Array.from({length: 60}, (_, i) => {
      const x = -60 + i * 21;
      const yy = y + curve * Math.pow((x - cx) / 600, 2) * 160;
      return (
        <g key={k + i}>
          <circle cx={x} cy={yy} r={9} fill={rgba('#ffb3d9', 0.85)} />
          <circle cx={x} cy={yy + 34 * Math.sign(curve || 1)} r={9} fill={rgba('#ffb3d9', 0.85)} />
          <line x1={x} y1={yy} x2={x} y2={yy + 34 * Math.sign(curve || 1)} stroke={rgba('#ffe0f0', 0.35)} strokeWidth={4} />
        </g>
      );
    });
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
      <defs>
        <radialGradient id="synBulb" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0%" stopColor="#5a2a8a" stopOpacity={0.95} />
          <stop offset="100%" stopColor="#1a0a33" stopOpacity={0.95} />
        </radialGradient>
        <radialGradient id="synVes" cx="0.4" cy="0.35">
          <stop offset="0%" stopColor="#fff" stopOpacity={0.5} />
          <stop offset="70%" stopColor={PAL.gold} stopOpacity={0.25} />
          <stop offset="100%" stopColor={PAL.gold} stopOpacity={0.8} />
        </radialGradient>
        <radialGradient id="synGlow">
          <stop offset="0%" stopColor={PAL.gold} stopOpacity={0.9} />
          <stop offset="100%" stopColor={PAL.gold} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="synAp">
          <stop offset="0%" stopColor="#fff" stopOpacity={1} />
          <stop offset="40%" stopColor={PAL.cyan} stopOpacity={0.6} />
          <stop offset="100%" stopColor={PAL.cyan} stopOpacity={0} />
        </radialGradient>
      </defs>
      <g transform={`translate(${cx},960) scale(${zoom}) translate(${-cx},-960)`}>
        {/* terminal presináptico */}
        <path d={`M${cx - 120},-100 L${cx - 120},180 C${cx - 420},260 ${cx - 560},560 ${cx - 560},${memTop} L${cx + 560},${memTop} C${cx + 560},560 ${cx + 420},260 ${cx + 120},180 L${cx + 120},-100 Z`} fill="url(#synBulb)" />
        {/* potencial de acción bajando por el axón */}
        {ap > 0 && <circle cx={cx} cy={-100 + ap * 700} r={160} fill="url(#synAp)" opacity={Math.sin(clamp(ap) * Math.PI)} />}
        {bilayer(memTop - 40, 'a', 0)}
        {/* vesículas: se acercan a la membrana y se fusionan al liberar */}
        {vesicles.map((v, i) => {
          const go = clamp(release * 1.6 - (i % 6) * 0.1);
          const y = lerp(v.y, memTop - 70, go);
          const open = clamp(go * 2 - 1);
          return (
            <g key={i} opacity={1 - open * 0.8}>
              <circle cx={v.x + Math.sin(t * 2 + v.ph) * 6} cy={y + Math.cos(t * 1.6 + v.ph) * 6} r={v.s * (1 + open * 0.3)} fill="url(#synVes)" stroke={rgba('#ffe7b0', 0.6)} strokeWidth={4} />
              {[0, 1, 2, 3].map((k) => (
                <circle key={k} cx={v.x + Math.cos(k * 1.6 + v.ph) * v.s * 0.45} cy={y + Math.sin(k * 1.6 + v.ph) * v.s * 0.45} r={6} fill={PAL.gold} />
              ))}
            </g>
          );
        })}
        {/* hendidura sináptica */}
        <rect x={-100} y={memTop + 6} width={W + 200} height={memBot - memTop - 30} fill={rgba('#0a0a24', 0.5)} />
        {/* neurotransmisores */}
        {parts.map((p, i) => {
          const isDA = p.kind < 0.78 || others === 0;
          const startT = (p.ph * 0.6) as number;
          const u = clamp((release - startT) / 0.5);
          if (u <= 0) return null;
          const x = p.x0 + p.vx * u * 0.6 + Math.sin(t * 3 + i) * 10;
          const y = memTop + 10 + Math.min(p.vy * u * 1.2, memBot - memTop - 50);
          const col = isDA ? PAL.gold : p.kind < 0.9 ? PAL.cyan : PAL.rose;
          return (
            <g key={i} opacity={isDA ? 1 : others}>
              <circle cx={x} cy={y} r={22} fill={rgba(col, 0.25)} />
              <circle cx={x} cy={y} r={9} fill={col} />
            </g>
          );
        })}
        {/* membrana postsináptica y receptores */}
        <path d={`M-100,${memBot} L${W + 100},${memBot} L${W + 100},${H + 200} L-100,${H + 200} Z`} fill={rgba('#3a1450', 0.9)} />
        {bilayer(memBot - 20, 'b', 0)}
        {receptors.map((x, i) => {
          const on = clamp(bind * 1.4 - (i % 3) * 0.15);
          return (
            <g key={i}>
              <circle cx={x} cy={memBot - 10} r={90 * on} fill="url(#synGlow)" opacity={on} />
              <path d={`M${x - 26},${memBot - 64} L${x - 12},${memBot - 20} L${x - 12},${memBot + 40} M${x + 26},${memBot - 64} L${x + 12},${memBot - 20} L${x + 12},${memBot + 40}`} stroke={on > 0.1 ? '#ffe9b0' : '#8fd8ff'} strokeWidth={14} fill="none" strokeLinecap="round" />
              {on > 0.2 && <circle cx={x} cy={memBot - 64} r={11} fill={PAL.gold} />}
            </g>
          );
        })}
        {/* señal postsináptica */}
        {bind > 0.3 &&
          [0, 1, 2].map((k) => {
            const u = ((t * 0.7 + k / 3) % 1 + 1) % 1;
            return <ellipse key={k} cx={cx} cy={memBot + 120 + u * 500} rx={460 * (0.4 + u)} ry={60 * (0.4 + u)} fill="none" stroke={PAL.gold} strokeWidth={4} opacity={(1 - u) * clamp(bind)} />;
          })}
      </g>
    </svg>
  );
};

// ============================================================ MOLÉCULA DE OXITOCINA (3D)
// Nonapéptido: Cys-Tyr-Ile-Gln-Asn-Cys (anillo cerrado por puente disulfuro) + Pro-Leu-Gly (cola).
const OXY: {p: V3; label: string}[] = (() => {
  const ring: {p: V3; label: string}[] = ['Cys', 'Tyr', 'Ile', 'Gln', 'Asn', 'Cys'].map((l, i) => {
    const a = (i / 6) * Math.PI * 2;
    return {p: [Math.cos(a) * 150, Math.sin(a) * 150, Math.sin(a * 2) * 40] as V3, label: l};
  });
  const tail: {p: V3; label: string}[] = [
    {p: [260, 150, 30], label: 'Pro'},
    {p: [380, 210, -30], label: 'Leu'},
    {p: [500, 180, 20], label: 'Gly'},
  ];
  return [...ring, ...tail];
})();

export const Oxytocin: React.FC<{t: number; x: number; y: number; scale?: number; opacity?: number; spin?: number; labels?: number}> = ({t, x, y, scale = 1, opacity = 1, spin = 1, labels = 0}) => {
  const cam: Cam = {x: 0, y: 0, z: -1400, yaw: t * 0.5 * spin, pitch: 0.35 + Math.sin(t * 0.4) * 0.2, f: 1400};
  const center: V3 = [170, 60, 0];
  const pts = OXY.map((a) => {
    const q: V3 = [a.p[0] - center[0], a.p[1] - center[1], a.p[2] - center[2]];
    // rotación del objeto (no de la cámara) para que la molécula gire sobre sí misma
    const cy = Math.cos(cam.yaw);
    const sy = Math.sin(cam.yaw);
    const rx = q[0] * cy - q[2] * sy;
    const rz = q[0] * sy + q[2] * cy;
    const cp = Math.cos(cam.pitch);
    const sp = Math.sin(cam.pitch);
    const ry = q[1] * cp - rz * sp;
    const rz2 = q[1] * sp + rz * cp;
    const s = 1400 / (1400 + rz2);
    return {sx: x + rx * s * scale, sy: y + ry * s * scale, z: rz2, s: s * scale, label: a.label};
  });
  const bonds: [number, number, boolean][] = [[0, 1, false], [1, 2, false], [2, 3, false], [3, 4, false], [4, 5, false], [5, 0, true], [5, 6, false], [6, 7, false], [7, 8, false]];
  const order = pts.map((p, i) => ({...p, i})).sort((a, b) => b.z - a.z);
  return (
    <svg width={W} height={H} style={{position: 'absolute', inset: 0}} opacity={opacity}>
      <defs>
        <radialGradient id="oxA" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0%" stopColor="#fff8e0" />
          <stop offset="40%" stopColor={PAL.gold} />
          <stop offset="100%" stopColor="#7a3a10" />
        </radialGradient>
        <radialGradient id="oxS" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0%" stopColor="#ffffd0" />
          <stop offset="45%" stopColor="#f0e040" />
          <stop offset="100%" stopColor="#6a5a00" />
        </radialGradient>
        <radialGradient id="oxGlow">
          <stop offset="0%" stopColor={PAL.gold} stopOpacity={0.5} />
          <stop offset="100%" stopColor={PAL.gold} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={x} cy={y} r={420 * scale} fill="url(#oxGlow)" />
      {bonds.map(([a, b, ss], i) => (
        <line key={i} x1={pts[a].sx} y1={pts[a].sy} x2={pts[b].sx} y2={pts[b].sy} stroke={ss ? '#f0e040' : rgba('#ffe6c0', 0.8)} strokeWidth={(ss ? 14 : 10) * scale} strokeDasharray={ss ? `${16 * scale} ${10 * scale}` : undefined} />
      ))}
      {order.map((p) => (
        <g key={p.i}>
          <circle cx={p.sx} cy={p.sy} r={44 * p.s} fill={p.label === 'Cys' ? 'url(#oxS)' : 'url(#oxA)'} />
          {labels > 0 && (
            <text x={p.sx} y={p.sy + 9 * p.s} textAnchor="middle" fontFamily="Montserrat" fontWeight={800} fontSize={24 * p.s} fill="#3a1a00" opacity={labels}>
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
};
