import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import ErrorBoundary from '../ErrorBoundary';
import poster from '../../../content/drafts/meshers/assets/meshers-gyroid-comparison.png';

interface Metadata {
  name: string;
  nodes: number;
  tetrahedra: number;
  minimumQuality: number;
  positionsBytes: number;
  tetrahedraBytes: number;
  qualityBytes: number;
  bounds: number[][];
  slug: string;
  generationSeconds: number;
  qualityStats: Record<string, number>;
  periodicNodesMatch: boolean;
  periodicCapsMatch: boolean;
  maximumPairError: number;
  orientedFacetConflicts: number;
  overallAdmitted: boolean;
  failedGates: string[];
  sampledTwoSidedDistance: number | null;
  sampledReverseDistance: number;

}
interface Dataset {
  meta: Metadata;
  positions: Float32Array;
  tets: Uint32Array;
  quality: Float32Array;
  surface: Uint32Array;
}
const faceKey = (a: number, b: number, c: number) => {
  const lo = Math.min(a, b, c), hi = Math.max(a, b, c);
  return `${lo},${a + b + c - lo - hi},${hi}`;
};
const faces = [[1, 2, 3], [0, 3, 2], [0, 1, 3], [0, 2, 1]];
const viridis = ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151', '#fde725'].map(c => new THREE.Color(c));

function MeshGeometry({ data, cut, quality, wire, caps }: { data: Dataset; cut: number; quality: boolean; wire: boolean; caps: boolean }) {
  const originalFaces = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < data.surface.length; i += 3) {
      set.add(faceKey(data.surface[i], data.surface[i + 1], data.surface[i + 2]));
    }
    return set;
  }, [data]);
  const geometry = useMemo(() => {
    const boundary = new Map<string, { ids: number[]; q: number }>();
    const { positions, tets, meta } = data;
    const plane = meta.bounds[0][0] + cut * (meta.bounds[1][0] - meta.bounds[0][0]);
    for (let i = 0; i < tets.length; i += 4) {
      const ids = [tets[i], tets[i + 1], tets[i + 2], tets[i + 3]];
      if (cut < 1 && ids.reduce((v, id) => v + positions[id * 3], 0) / 4 > plane) continue;
      for (const f of faces) {
        const face = f.map(j => ids[j]);
        const key = faceKey(face[0], face[1], face[2]);
        if (boundary.has(key)) boundary.delete(key);
        else boundary.set(key, { ids: face, q: data.quality[i / 4] });
      }
    }
    const xyz = new Float32Array(boundary.size * 9), rgb = new Float32Array(xyz.length);
    let cursor = 0;
    const teal = new THREE.Color(data.meta.slug === 'gyroid-mmg' ? '#a9b3c8' : '#79c8bc'), brass = new THREE.Color('#e5ac67');
    for (const [key, face] of boundary) {
      let color = originalFaces.has(key) ? teal : brass;
      if (caps) {
        color = new THREE.Color('#b5bec4');
        const axisColors = ['#79b5e5', '#e5ac67', '#79c8bc'];
        for (let a = 0; a < 3; a++) {
          if ([0, 1].some(side => face.ids.every(id => Math.abs(positions[id*3+a] - meta.bounds[side][a]) < 1e-7))) {
            color = new THREE.Color(axisColors[a]); break;
          }
        }
      }
      if (quality) {
        const t = Math.max(0, Math.min(1, face.q)) * (viridis.length - 1);
        const lo = Math.floor(t);
        color = viridis[lo].clone().lerp(viridis[Math.min(lo + 1, viridis.length - 1)], t - lo);
      }
      for (const id of face.ids) {
        for (let a = 0; a < 3; a++) xyz[cursor + a] = positions[id * 3 + a] - (meta.bounds[0][a] + meta.bounds[1][a]) / 2;
        rgb.set([color.r, color.g, color.b], cursor);
        cursor += 3;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(xyz, 3));
    g.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
    g.computeVertexNormals();
    return g;
  }, [data, cut, quality, caps, originalFaces]);
  const edges = useMemo(() => new THREE.WireframeGeometry(geometry), [geometry]);
  useEffect(() => () => { geometry.dispose(); edges.dispose(); }, [geometry, edges]);
  return <group>
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial vertexColors roughness={.48} metalness={.13} side={THREE.DoubleSide} />
    </mesh>
    {wire && <lineSegments geometry={edges}>
      <lineBasicMaterial color="#08272b" transparent opacity={.34} depthWrite={false} />
    </lineSegments>}
  </group>;
}

function FitCamera({ full }: { full: boolean }) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    const halfFov = Math.atan(Math.tan(17 * Math.PI / 180) * Math.min(1, size.width / size.height));
    const radius = full ? Math.sqrt(3) / 2 : .75;
    camera.position.normalize().multiplyScalar(radius / Math.sin(halfFov) * 1.03);
    camera.lookAt(0, 0, 0);
    invalidate();
  }, [camera, size.width, size.height, full, invalidate]);
  return null;
}

export default function MeshersViewer() {
  const [data, setData] = useState<Dataset[] | null>(null);
  const [error, setError] = useState('');
  const [cutaway, setCutaway] = useState(true);
  const [cut, setCut] = useState(.65);
  const [quality, setQuality] = useState(false);
  const [wire, setWire] = useState(true);
  const [caps, setCaps] = useState(false);
  const [reset, setReset] = useState(0);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    Promise.all(['gyroid-mmg', 'gyroid-meshers'].map(async slug => {
      const [m, b] = await Promise.all([fetch(`/meshers/${slug}.json`, { signal }), fetch(`/meshers/${slug}.bin`, { signal })]);
      if (!m.ok || !b.ok) throw new Error('Mesh data unavailable');
      const meta: Metadata = await m.json(), buffer = await b.arrayBuffer();
      const p = meta.positionsBytes, t = meta.tetrahedraBytes, q = meta.qualityBytes;
      if (p !== meta.nodes * 12 || t !== meta.tetrahedra * 16 || q !== meta.tetrahedra * 4 || buffer.byteLength < p+t+q) throw new Error('Invalid mesh layout');
      return { meta, positions: new Float32Array(buffer, 0, p/4), tets: new Uint32Array(buffer, p, t/4),
        quality: new Float32Array(buffer, p+t, q/4), surface: new Uint32Array(buffer, p+t+q) };
    })).then(setData).catch(e => { if (!signal.aborted) setError(String(e)); });
    return () => controller.abort();
  }, []);

  const metricRows = data ? [
    ['Generation (s)', ...data.map(d => d.meta.generationSeconds.toFixed(6))],
    ['Tet4 elements', ...data.map(d => d.meta.tetrahedra.toLocaleString('en-US'))],
    ['Nodes', ...data.map(d => d.meta.nodes.toLocaleString('en-US'))],
    ...['min', 'max', 'median', 'mean', 'p10', 'p90'].map(k => [`Quality ${k}`, ...data.map(d => d.meta.qualityStats[k].toFixed(6))]),
    ['Node / cap match', ...data.map(d => d.meta.periodicNodesMatch && d.meta.periodicCapsMatch ? 'Pass / Pass' : 'Fail')],
    ['Pair error', ...data.map(d => d.meta.maximumPairError.toExponential(2))],
    ['Oriented facet conflicts', ...data.map(d => String(d.meta.orientedFacetConflicts))],
    ['Boundary distance', ...data.map(d => d.meta.sampledTwoSidedDistance !== null ? d.meta.sampledTwoSidedDistance.toFixed(6) : `≥${d.meta.sampledReverseDistance.toFixed(6)} (reverse only)`)],
    ['Strict overall admission', ...data.map(d => d.meta.overallAdmitted ? 'Pass' : 'Rejected')],
  ] : [];

  const exportImage = () => {
    if (!data || canvases.current.some(c => !c)) return;
    const out = document.createElement('canvas'); out.width = 1800; out.height = 2200;
    const c = out.getContext('2d'); if (!c) return;
    const bg = c.createLinearGradient(0,0,1800,2200); bg.addColorStop(0,'#10252b'); bg.addColorStop(1,'#071116');
    c.fillStyle=bg; c.fillRect(0,0,1800,2200);
    c.fillStyle='#e4b578'; c.font='26px monospace'; c.fillText('MESHERS / ACTUAL TETRAHEDRAL MESHES',120,110);
    c.fillStyle='#f2f2ec'; c.font='bold 130px Arial'; c.fillText('GYROID UNIT CELL',112,285);
    c.fillStyle='#b9d1d1'; c.font='34px Arial'; c.fillText('Same specimen. Comparable Tet4 counts. Original connectivity.',120,360);
    data.forEach((d,i)=>{
      const x=110+i*825;
      c.font='bold 30px Arial'; c.fillStyle=i===0?'#b2bdd3':'#a6d9cc';c.fillText(d.meta.name.toUpperCase(),x,450);
      const canvas=canvases.current[i]!; const scale=Math.min(760/canvas.width,650/canvas.height);
      const w=canvas.width*scale,h=canvas.height*scale;
      c.drawImage(canvas,x+(760-w)/2,475+(650-h)/2,w,h);
    });
    c.strokeStyle='#355154';c.beginPath();c.moveTo(120,1155);c.lineTo(1680,1155);c.stroke();
    c.font='23px monospace';c.fillStyle='#a1b8bc';c.fillText('MEASURED METRIC',120,1215);
    c.textAlign='right';c.fillStyle='#b2bdd3';c.fillText('MICROGEN + MMG',1080,1215);c.fillStyle='#a6d9cc';c.fillText('MESHERS',1670,1215);
    metricRows.slice(0,13).forEach((row,i)=>{
      const y=1280+i*49; c.textAlign='left';c.fillStyle='#b9cecf';c.font='28px Arial';c.fillText(row[0],120,y);
      c.textAlign='right';c.fillStyle='#e2e8e6';c.fillText(row[1].replace(' (reverse only)','*'),1080,y);
      c.fillStyle='#a6d9cc';c.fillText(row[2],1670,y);
    });
    c.textAlign='left';c.fillStyle='#e4b578';c.font='28px Arial';
    c.fillText('Both fail the strict 0.002 boundary target.',120,1990);
    c.fillStyle='#a1b8bc';c.font='23px Arial';
    c.fillText('5 paired runs · Apple M4 · one numerical thread · generation excludes audits and FEA.',120,2050);
    c.fillText('*Reverse-only lower bound. MMG also fails quality, volume and oriented facets.',120,2100);
    c.fillText('Fixed-budget comparison, not an accuracy-qualified speedup.',120,2150);
    const a=document.createElement('a');a.href=out.toDataURL('image/png');a.download='meshers-gyroid-comparison.png';a.click();
  };
  const button = (active: boolean) => `px-3 py-2 text-xs rounded-md border transition-colors ${active ? 'bg-[#c9e4dc] text-[#0a2025] border-[#c9e4dc]' : 'border-[#385256] text-[#b9cecf] hover:border-[#88bdb6]'}`;
  return <figure className="not-prose my-10 overflow-hidden rounded-2xl border border-[#344c50] bg-[#0b1a20]" aria-label="Interactive Gyroid meshing comparison">
    <div className="p-5 space-y-3">
      <p className="text-[10px] font-mono tracking-[.2em] text-[#dfb47d] uppercase">One Gyroid cell / two real meshes</p>
      <h3 className="text-2xl font-medium text-[#ecf1eb]">Inspect the comparison</h3>
      <p className="text-xs text-[#9ab4b8]">Same frozen sheet, offset 1.1. Tet4 on both sides. Five paired generation runs.</p>
      <div className="flex flex-wrap gap-2">
        <button className={button(cutaway)} onClick={() => { setCutaway(!cutaway); setCaps(false); }} aria-pressed={cutaway}>Element cutaway</button>
        <button className={button(wire)} onClick={() => setWire(!wire)} aria-pressed={wire}>Edges</button>
        <button className={button(quality)} onClick={() => { setQuality(!quality); setCaps(false); }} aria-pressed={quality}>Quality</button>
        <button className={button(caps)} onClick={() => { setCaps(!caps); setQuality(false); setCutaway(false); }} aria-pressed={caps}>Periodic caps</button>
      </div>
    </div>
    {error && <p className="p-8 text-[#dfb47d]" role="alert">{error}</p>}
    <div className="grid md:grid-cols-2">
      {data?.map((d,i)=><div key={d.meta.slug} className="border-y border-[#293f45]">
        <div className="px-5 pt-4"><h4 className="font-medium text-[#e6ede8]">{d.meta.name}</h4><p className="text-xs text-[#9ab4b8] mt-1">{d.meta.tetrahedra.toLocaleString()} tets · {d.meta.nodes.toLocaleString()} nodes · {d.meta.generationSeconds.toFixed(3)} s</p></div>
        <div className="h-[350px] bg-[radial-gradient(ellipse_at_center,#18363c_0%,#0b1a20_70%)]">
          <ErrorBoundary fallback={<img src={poster} alt="Gyroid mesh comparison" className="h-full w-full object-contain" />}>
            <Canvas key={`${reset}-${i}`} frameloop="demand" dpr={[1,2]} camera={{position:[1.6,1.05,1.65],fov:34}}
              gl={{antialias:true,preserveDrawingBuffer:true,alpha:true}} onCreated={({gl})=>{canvases.current[i]=gl.domElement;}}
              fallback={<p className="text-white p-5">WebGL is required for this viewer.</p>}>
              <FitCamera full={!cutaway} />
              <ambientLight intensity={.8}/><hemisphereLight args={['#d0edf0','#26372d',1.4]}/>
              <directionalLight position={[3,5,4]} intensity={3.2} color="#fff0d5"/>
              <directionalLight position={[-3,1,-2]} intensity={2.1} color="#69bac5"/>
              <MeshGeometry data={d} cut={cutaway?cut:1} quality={quality} wire={wire} caps={caps}/>
              <ContactShadows position={[0,-.65,0]} opacity={.45} scale={3} blur={2.5} far={2} resolution={512} frames={1}/>
              <OrbitControls makeDefault enablePan={false} minDistance={1.4} maxDistance={4.5}/>
            </Canvas>
          </ErrorBoundary>
        </div>
      </div>)}
    </div>
    <div className="p-5 space-y-4">
      {!data && !error && <p className="text-[#a9c0c3] text-sm">Loading original tetrahedra…</p>}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-[#a9c0c3]">
        <label className="flex items-center gap-3">Cut depth <input aria-label="Element cutaway depth" type="range" min="0.25" max="1" step="0.05" value={cut} disabled={!cutaway} onChange={e=>setCut(Number(e.target.value))} className="accent-[#a2d5c6] w-32"/></label>
        <div className="flex gap-4"><button onClick={()=>setReset(reset+1)}>Reset views</button><button onClick={exportImage} disabled={!data} className="text-[#dfb47d]">Save comparison image ↗</button></div>
      </div>
      {quality?<div className="flex items-center gap-3 text-xs text-[#b3c7c9]"><span>Tet4 quality</span><span className="h-2 w-40 rounded bg-[linear-gradient(90deg,#440154,#414487,#2a788e,#22a884,#7ad151,#fde725)]"/><span>0 → 1.0</span></div>
        :caps?<p className="text-xs text-[#a9c0c3]">Periodic caps: X blue, Y brass, Z teal. Opposite faces share a color; rotate to inspect their triangulations.</p>:<p className="text-xs text-[#a9c0c3]">Original boundaries: slate for MMG, teal for Meshers. Brass marks exposed tetrahedron faces. Drag either mesh to orbit; scroll to zoom.</p>}
      {data&&<div className="overflow-x-auto"><table className="w-full text-xs text-left text-[#bfd0d0]"><thead><tr className="border-b border-[#385256]"><th className="py-3">Full mesh metric</th><th>Microgen + MMG</th><th>Meshers</th></tr></thead><tbody>{metricRows.map(row=><tr key={row[0]} className="border-b border-[#253c41]"><td className="py-2 pr-3">{row[0]}</td><td className="pr-3">{row[1]}</td><td>{row[2]}</td></tr>)}</tbody></table></div>}
      <p className="text-xs leading-relaxed text-[#e1b57f]">Both meshes fail the strict 0.002 boundary-distance target. MMG also fails minimum quality, volume and oriented-facet checks. Matching nodes and caps does not imply that every tetrahedron is valid.</p>
      <figcaption className="text-[11px] leading-relaxed text-[#839fa5]">Original saved Tet4 cells, not an isosurface render. Cutaway removes cells by centroid. Float32 display coordinates; all six quality statistics use the original Float64 mesh. Neither mesh is modified or repaired for display.</figcaption>
    </div>
  </figure>;
}
