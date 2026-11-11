import * as THREE from 'three';
import {generateSDFGeometry} from '../../../../src/utils/marchingCubes.ts';
import metadata from '../../../../public/meshers/gyroid-meshers.json';
import bytes from '../../../../public/meshers/gyroid-meshers.bin';

// Only the opening uses marching cubes. The payoff preserves actual Tet4 cells.
const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
const positions = new Float32Array(buffer, 0, metadata.positionsBytes/4);
const tets = new Uint32Array(buffer, metadata.positionsBytes, metadata.tetrahedraBytes/4);
const surface = new Uint32Array(buffer, metadata.positionsBytes + metadata.tetrahedraBytes + metadata.qualityBytes);
const key = ids => [...ids].sort((a,b)=>a-b).join(',');
const original = new Set();
for(let i=0;i<surface.length;i+=3) original.add(key(surface.slice(i,i+3)));
const localFaces = [[1,2,3],[0,3,2],[0,1,3],[0,2,1]];
function actualGeometry(cut) {
  const boundary = new Map();
  for(let i=0;i<tets.length;i+=4) {
    const ids = [...tets.slice(i,i+4)];
    if(cut<1 && ids.reduce((s,id)=>s+positions[3*id],0)/4 > cut-.5) continue;
    for(const f of localFaces) {
      const face=f.map(j=>ids[j]), k=key(face);
      if(boundary.has(k)) boundary.delete(k); else boundary.set(k,face);
    }
  }
  const xyz=[],rgb=[],teal=new THREE.Color('#79c8bc'),brass=new THREE.Color('#d9ac72');
  for(const [k,ids] of boundary) {
    const c=original.has(k)?teal:brass;
    for(const id of ids) { xyz.push(...positions.slice(3*id,3*id+3)); rgb.push(c.r,c.g,c.b); }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(xyz,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(rgb,3)); g.computeVertexNormals();
  return g;
}
const canvas=document.getElementById('stage');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setSize(1080,860); renderer.setPixelRatio(1);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.2;
const scene=new THREE.Scene(),group=new THREE.Group(); scene.add(group);
scene.add(new THREE.HemisphereLight('#dcf1ed','#183132',2.2));
const keyLight=new THREE.DirectionalLight('#fff0d5',3.8);keyLight.position.set(3,4,3);scene.add(keyLight);
const rim=new THREE.DirectionalLight('#79c8bc',2.4);rim.position.set(-3,1,-2);scene.add(rim);
const fill=new THREE.DirectionalLight('#c9dbe4',1.1);fill.position.set(0,-2,3);scene.add(fill);
const camera=new THREE.PerspectiveCamera(34,1080/860,.05,30);
const material=new THREE.MeshStandardMaterial({color:'#79c8bc',roughness:.46,metalness:.18,side:THREE.DoubleSide});
const morph=new THREE.Mesh(new THREE.BufferGeometry(),material);group.add(morph);
const actual=new THREE.Mesh(actualGeometry(1),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.48,metalness:.13,side:THREE.DoubleSide}));group.add(actual);
const edges=new THREE.LineSegments(new THREE.WireframeGeometry(actual.geometry),new THREE.LineBasicMaterial({color:'#123436',transparent:true,opacity:.52,depthWrite:false}));group.add(edges);
const frame=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.006,1.006,1.006)),new THREE.LineBasicMaterial({color:'#a1b8bc',transparent:true,opacity:.2}));group.add(frame);
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
function field(x,y,z,t) {
  const a=2*Math.PI*x,b=2*Math.PI*y,c=2*Math.PI*z;
  const sx=Math.sin(a),sy=Math.sin(b),sz=Math.sin(c),cx=Math.cos(a),cy=Math.cos(b),cz=Math.cos(c);
  const g=sx*cy+sy*cz+sz*cx, p=(cx+cy+cz)*.72;
  const d=(sx*sy*sz+sx*cy*cz+cx*sy*cz+cx*cy*sz)*1.15;
  let f=g;
  if(t<2.6) f=THREE.MathUtils.lerp(g,p,smooth((t-.5)/1.7));
  else if(t<4.6) f=THREE.MathUtils.lerp(p,d,smooth((t-2.6)/1.7));
  else f=THREE.MathUtils.lerp(d,g,smooth((t-4.6)/1.6));
  return Math.abs(f)-.55;
}
let previousCut=-1, previousTime=-1;
function renderAt(t) {
  const reveal=smooth((t-6.5)/.9);
  morph.visible=reveal<1;actual.visible=edges.visible=reveal>0;
  material.transparent=true;material.opacity=1-reveal;
  actual.material.transparent=true;actual.material.opacity=reveal;
  edges.material.opacity=.52*reveal;
  if(morph.visible && t!==previousTime) {
    const {positions: xyz}=generateSDFGeometry((x,y,z)=>field(x,y,z,t),1,40);
    morph.geometry.dispose();morph.geometry=new THREE.BufferGeometry();
    morph.geometry.setAttribute('position',new THREE.BufferAttribute(xyz,3));
    // Smooth across coincident triangles with area-weighted normals.
    morph.geometry.computeVertexNormals();
    const normals=morph.geometry.attributes.normal, sum=new Map();
    for(let i=0;i<xyz.length;i+=3) {
      const k=[xyz[i],xyz[i+1],xyz[i+2]].map(x=>Math.round(x*1e6)).join(',');
      const v=sum.get(k)||new THREE.Vector3();v.add(new THREE.Vector3(normals.array[i],normals.array[i+1],normals.array[i+2]));sum.set(k,v);
    }
    for(let i=0;i<xyz.length;i+=3) {
      const k=[xyz[i],xyz[i+1],xyz[i+2]].map(x=>Math.round(x*1e6)).join(',');
      const v=sum.get(k).clone().normalize(); normals.array.set([v.x,v.y,v.z],i);
    }
    normals.needsUpdate=true;
  }
  const cut=1-.36*smooth((t-8)/2.2),step=Math.round(cut*70)/70;
  if(actual.visible && step!==previousCut) {
    actual.geometry.dispose();edges.geometry.dispose();actual.geometry=actualGeometry(step);
    edges.geometry=new THREE.WireframeGeometry(actual.geometry);previousCut=step;
  }
  const yaw=.9-.028*t;
  camera.position.set(Math.sin(yaw)*2.8,1.24,Math.cos(yaw)*2.8);camera.lookAt(0,-.015,0);
  renderer.render(scene,camera);previousTime=t;
}
window.addEventListener('hf-seek',e=>renderAt(e.detail.time));
window.meshersRenderAt=renderAt;
renderAt(0);
