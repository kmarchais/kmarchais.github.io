import{b as o,j as T,C as F,i as k,f as I}from"./vendor-r3f-b9e513d9.js";import{r as w}from"./vendor-react-11ad1bf9.js";import{a4 as L,c,B as A,as as C,D as _}from"./vendor-three-a8671fcb.js";const H=`
varying vec3 vWorldPosition;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`,W=`
precision highp float;

// cameraPosition is already provided by Three.js
uniform float stadiumMajorRadius;
uniform float stadiumStraightLength;
uniform float stadiumTubeRadius;
uniform float helixRadius;
uniform float helixShaftRadius;
uniform float helixPitch;
uniform float helixThickness;

varying vec3 vWorldPosition;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const int MAX_STEPS = 64;
const float MAX_DIST = 20.0;
const float SURF_DIST = 0.002;

// Stadium torus SDF (Inigo Quilez sdLink formula)
// Oriented along Y axis
float sdLink(vec3 p, float le, float r1, float r2) {
  vec3 q = vec3(p.x, max(abs(p.y) - le, 0.0), p.z);
  return length(vec2(length(q.xz) - r1, q.y)) - r2;
}

// Helix SDF with height limits
float sdHelix(vec3 p, float R, float pitch, float shaftR, float thickness) {
  // Height limit - helix only exists within straight section
  float heightLimit = stadiumStraightLength - 0.05;

  // Clamp Y to height bounds for distance calculation
  float clampedY = clamp(p.y, -heightLimit, heightLimit);
  vec3 clampedP = vec3(p.x, clampedY, p.z);

  // If outside height bounds, return large distance
  if (abs(p.y) > heightLimit + 0.1) {
    return length(p.xz) - shaftR + abs(p.y) - heightLimit;
  }

  // Shaft distance (cylinder along Y)
  float shaftDist = length(clampedP.xz) - shaftR;

  // Helical blade using angle and height
  float k = pitch / TAU;
  float angle = atan(clampedP.z, clampedP.x);
  float expectedY = k * angle;

  // Distance to helical blade
  float r = length(clampedP.xz);
  if (r > shaftR * 0.9 && r < R) {
    // Wrap the height difference to nearest blade
    float dy = mod(clampedP.y - expectedY + pitch * 0.5, pitch) - pitch * 0.5;
    float bladeDist = abs(dy) - thickness;
    // Smooth blend near shaft
    float bladeWeight = smoothstep(shaftR * 0.9, shaftR * 1.1, r);
    return mix(shaftDist, min(shaftDist, bladeDist), bladeWeight);
  }

  return shaftDist;
}

// Combined scene SDF - helix only (stadium will be rendered as transparent mesh)
float sceneSDF(vec3 p) {
  // Helix (positioned at Z = majorRadius, along Y axis)
  vec3 helixP = vec3(p.x, p.y, p.z - stadiumMajorRadius);
  float helix = sdHelix(helixP, helixRadius, helixPitch, helixShaftRadius, helixThickness);

  return helix;
}

vec3 getNormal(vec3 p) {
  float eps = 0.002;
  return normalize(vec3(
    sceneSDF(p + vec3(eps, 0.0, 0.0)) - sceneSDF(p - vec3(eps, 0.0, 0.0)),
    sceneSDF(p + vec3(0.0, eps, 0.0)) - sceneSDF(p - vec3(0.0, eps, 0.0)),
    sceneSDF(p + vec3(0.0, 0.0, eps)) - sceneSDF(p - vec3(0.0, 0.0, eps))
  ));
}

float raymarch(vec3 ro, vec3 rd) {
  float d = 0.0;
  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * d;
    float dist = sceneSDF(p);
    d += dist * 0.8; // Slow down for stability
    if (abs(dist) < SURF_DIST || d > MAX_DIST) break;
  }
  return d;
}

void main() {
  vec3 ro = cameraPosition;
  vec3 rd = normalize(vWorldPosition - cameraPosition);

  float d = raymarch(ro, rd);

  if (d >= MAX_DIST - 0.1) {
    discard;
  }

  vec3 p = ro + rd * d;
  vec3 n = getNormal(p);

  // Simple lighting
  vec3 lightDir = normalize(vec3(1.0, 2.0, 1.0));
  float diff = max(dot(n, lightDir), 0.0);
  float amb = 0.35;

  // Color based on which surface was hit
  vec3 helixP = vec3(p.x, p.y, p.z - stadiumMajorRadius);
  float helixDist = sdHelix(helixP, helixRadius, helixPitch, helixShaftRadius, helixThickness);
  float stadiumDist = abs(sdLink(p, stadiumStraightLength, stadiumMajorRadius, stadiumTubeRadius)) - 0.012;

  vec3 color;
  if (helixDist < stadiumDist) {
    color = vec3(0.75, 0.85, 0.95); // Light blue for helix
  } else {
    color = vec3(0.35, 0.55, 0.75); // Darker blue for stadium
  }

  vec3 finalColor = color * (amb + diff * 0.65);

  gl_FragColor = vec4(finalColor, 1.0);
}
`,Y=({stadiumMajorRadius:e,stadiumStraightLength:t,stadiumTubeRadius:l,helixRadius:p,helixShaftRadius:h,helixPitch:x,helixThickness:f})=>{const v=w.useRef(null),d=w.useMemo(()=>({stadiumMajorRadius:{value:e},stadiumStraightLength:{value:t},stadiumTubeRadius:{value:l},helixRadius:{value:p},helixShaftRadius:{value:h},helixPitch:{value:x},helixThickness:{value:f}}),[e,t,l,p,h,x,f]),m=(e+l)*2+.5,u=t*2+l*2+.5;return T("mesh",{ref:v,children:[o("boxGeometry",{args:[m,u,m]}),o("shaderMaterial",{vertexShader:H,fragmentShader:W,uniforms:d,side:L,transparent:!1,depthWrite:!0})]})},V=({majorRadius:e,straightLength:t,tubeRadius:l})=>{const p=w.useMemo(()=>{const h=Math.PI,x=2*Math.PI,f=[],v=[],d=24,m=80,u=t,z=n=>{n=(n%1+1)%1;const a=h*e,r=2*a+2*t*2,s=n*r;if(s<t*2)return new c(-u+s,0,-e);if(s<t*2+a){const i=-h/2+(s-t*2)/e;return new c(u+e*Math.cos(i),0,e*Math.sin(i))}else if(s<t*4+a){const i=s-t*2-a;return new c(u-i,0,e)}else{const i=h/2+(s-t*4-a)/e;return new c(-u+e*Math.cos(i),0,e*Math.sin(i))}};for(let n=0;n<=m;n++){const a=n/m,r=z(a),s=z((a+.001)%1),i=new c().subVectors(s,r).normalize(),b=new c(0,1,0),S=new c().crossVectors(i,b).normalize(),y=new c().crossVectors(S,i).normalize();for(let P=0;P<=d;P++){const R=P/d*x,D=Math.cos(R),M=Math.sin(R);f.push(r.x+l*(D*S.x+M*y.x),r.y+l*(D*S.y+M*y.y),r.z+l*(D*S.z+M*y.z))}}for(let n=0;n<m;n++)for(let a=0;a<d;a++){const r=n*(d+1)+a,s=r+1,i=r+(d+1),b=i+1;v.push(r,i,s,s,i,b)}const g=new A;return g.setAttribute("position",new C(new Float32Array(f),3)),g.setIndex(v),g.computeVertexNormals(),g},[e,t,l]);return o("mesh",{geometry:p,children:o("meshPhysicalMaterial",{color:4491434,transparent:!0,opacity:.25,side:_,depthWrite:!1})})},B=({className:e=""})=>o("div",{className:`${e||"w-full h-screen"} bg-primary relative`,children:T(F,{children:[o(k,{makeDefault:!0,position:[4,3,4],fov:50}),o(I,{}),o("ambientLight",{intensity:.4}),o("directionalLight",{position:[5,10,5],intensity:1}),o(V,{majorRadius:.8,straightLength:1.25,tubeRadius:.5}),o(Y,{stadiumMajorRadius:.8,stadiumStraightLength:1.25,stadiumTubeRadius:.5,helixRadius:.4,helixShaftRadius:.08,helixPitch:.35,helixThickness:.05}),o("gridHelper",{args:[6,12,4473924,2236962],rotation:[0,0,0]})]})});export{B as default};
