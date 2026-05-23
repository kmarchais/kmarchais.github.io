import{j as d,a as n,F as j,C as vn,P as gn,O as bn,G as yn,b as xn,u as De,d as Ee}from"./vendor-r3f-79d7e21d.js";import{u as G}from"./vendor-mdx-798a370b.js";import{u as Sn,L as fe,r as m}from"./vendor-react-0f206cf5.js";import{M as be,d as B}from"./vendor-three-e4da4b44.js";import"./index-825f1487.js";const Cn={"/blog":"Blog"},Pn=()=>{const{pathname:e}=Sn(),t=Cn[e]??"";return d("header",{className:"fixed top-0 left-0 right-0 z-30 bg-ink-900/85 backdrop-blur-sm",children:[d("div",{className:"max-w-[1480px] mx-auto px-6 sm:px-10 lg:px-14 py-4 flex items-center justify-between gap-6",children:[d(fe,{to:"/",className:"group inline-flex items-baseline gap-3","aria-label":"Kevin Marchais, home",children:[n("span",{className:"font-mono text-[11px] tracking-wider3 uppercase text-bone-400 group-hover:text-bone-50 transition-colors",children:"KM"}),t&&d(j,{children:[n("span",{"aria-hidden":!0,className:"text-bone-600 font-mono text-[11px]",children:"/"}),n("span",{className:"font-mono text-[10.5px] tracking-wider2 uppercase text-bone-200 truncate max-w-[60vw]",children:t})]})]}),d("nav",{"aria-label":"Primary",className:"flex items-center gap-6",children:[n(fe,{to:"/",className:"font-mono text-[11px] tracking-wider2 uppercase text-bone-400 hover:text-bone-50 transition-colors",children:"Home"}),n(fe,{to:"/blog",className:"font-mono text-[11px] tracking-wider2 uppercase text-bone-400 hover:text-bone-50 transition-colors",children:"Blog"})]})]}),n("div",{className:"rule","aria-hidden":"true"})]})},wn={title:"periodic chess",date:"2026-05-23",excerpt:"A chess variant on a periodic board, where files a and h wrap around. Walking through the rules, the engine, and a playable demo.",tags:["chess","game-engine","periodic-boundary"],draft:!0,hidden:!0};function We(e){const t={h2:"h2",li:"li",p:"p",ul:"ul",...G(),...e.components};return d(j,{children:[n(t.h2,{children:"Why a periodic board"}),`
`,n(t.p,{children:`Most chess variants change the pieces. Periodic chess changes the topology
instead: the board is a cylinder. The a-file and the h-file are adjacent,
so a rook on a1 attacks h1 directly, and a bishop slides off one side and
re-enters on the other.`}),`
`,n(t.p,{children:"That single change cascades into the rest of the game:"}),`
`,d(t.ul,{children:[`
`,n(t.li,{children:"Knights gain new wrap-around squares"}),`
`,n(t.li,{children:"Discovered checks become harder to anticipate"}),`
`,n(t.li,{children:`Endgames where one side has only a king become winning for the other side
much more often, because the king can no longer hide in a corner`}),`
`]}),`
`,n(t.h2,{children:"To be written"}),`
`,d(t.ul,{children:[`
`,n(t.li,{children:"A short history of cylindrical chess and why people have tried it"}),`
`,n(t.li,{children:"The board representation and move generator"}),`
`,n(t.li,{children:"How check / checkmate / stalemate detection work on a wrapped board"}),`
`,n(t.li,{children:"The minimax+alpha-beta engine and what the difficulty levels actually do"}),`
`,n(t.li,{children:"Playable demo embedded below"}),`
`]})]})}function Ln(e={}){const{wrapper:t}={...G(),...e.components};return t?n(t,{...e,children:n(We,{...e})}):We(e)}const Mn=Object.freeze(Object.defineProperty({__proto__:null,default:Ln,frontmatter:wn},Symbol.toStringTag,{value:"Module"})),kn={title:"granular flow (DEM) on the GPU",date:"2026-05-23",excerpt:"A Hertz-Mindlin discrete-element method solver running entirely on WebGPU. Spatial hashing for neighbour search, contact resolution, and notes on what makes powder simulations slow.",tags:["DEM","granular","WebGPU","physics"],draft:!0,hidden:!0};function He(e){const t={h2:"h2",li:"li",p:"p",ul:"ul",...G(),...e.components};return d(j,{children:[n(t.h2,{children:"Why DEM is hard"}),`
`,n(t.p,{children:`The discrete element method tracks every particle, every contact, every
tangential history. It's the simulation method behind powder-bed metal 3D
printing , the topic of my PhD , and it scales badly. A million-particle
simulation can take days on a single CPU. Moving the contact resolution
loop to a GPU is a big win.`}),`
`,n(t.p,{children:"To be covered:"}),`
`,d(t.ul,{children:[`
`,n(t.li,{children:"Hertz-Mindlin contact model: normal force, tangential history, damping"}),`
`,n(t.li,{children:"Spatial hashing on the GPU , the part that actually saves the day"}),`
`,n(t.li,{children:"Why the timestep collapses with stiffness (it's not just CFL)"}),`
`,n(t.li,{children:"The role of restitution and friction coefficients"}),`
`,n(t.li,{children:"A playable demo with a rotating drum and an avalanche scene"}),`
`]})]})}function Rn(e={}){const{wrapper:t}={...G(),...e.components};return t?n(t,{...e,children:n(He,{...e})}):He(e)}const Tn=Object.freeze(Object.defineProperty({__proto__:null,default:Rn,frontmatter:kn},Symbol.toStringTag,{value:"Module"})),C=({label:e,value:t,min:o,max:s,step:r,onChange:a})=>d("div",{className:"flex flex-col gap-1",children:[d("div",{className:"flex justify-between text-xs",children:[n("span",{className:"text-secondary",children:e}),n("span",{className:"text-tertiary font-mono",children:t.toFixed(r<1?2:0)})]}),n("input",{type:"range",min:o,max:s,step:r,value:t,onChange:u=>a(parseFloat(u.target.value)),className:`w-full h-1.5 bg-surface rounded-lg appearance-none cursor-pointer
        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent
        [&::-webkit-slider-thumb]:hover:bg-accent-hover [&::-webkit-slider-thumb]:transition-colors`})]}),Z=({label:e,value:t,options:o,onChange:s})=>d("div",{className:"flex flex-col gap-1",children:[n("span",{className:"text-xs text-secondary",children:e}),n("select",{value:t,onChange:r=>s(r.target.value),className:`w-full px-2 py-1.5 bg-surface text-tertiary text-sm rounded border border-surface
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-primary cursor-pointer`,children:o.map(r=>n("option",{value:r,children:r},r))})]}),st=({label:e,checked:t,onChange:o})=>d("label",{className:"flex items-center gap-2 cursor-pointer group",children:[n("input",{type:"checkbox",checked:t,onChange:s=>o(s.target.checked),className:"sr-only"}),n("div",{className:`w-4 h-4 rounded border ${t?"bg-accent border-accent":"bg-surface border-surface"}
      flex items-center justify-center transition-colors group-hover:border-accent`,children:t&&n("svg",{className:"w-3 h-3 text-primary",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:n("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:3,d:"M5 13l4 4L19 7"})})}),n("span",{className:"text-xs text-secondary",children:e})]}),$=({title:e,defaultOpen:t=!0,children:o})=>{const[s,r]=m.useState(t);return d("div",{className:"border-b border-surface last:border-b-0",children:[d("button",{onClick:()=>r(!s),className:"w-full flex items-center justify-between py-2 text-xs font-semibold text-tertiary uppercase tracking-wider hover:text-white transition-colors",children:[e,n("svg",{className:`w-4 h-4 transition-transform ${s?"rotate-180":""}`,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:n("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M19 9l-7 7-7-7"})})]}),s&&n("div",{className:"pb-3 space-y-3",children:o})]})},Nn=()=>d("div",{className:"absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm p-3 rounded-lg",children:[n("h3",{className:"text-sm font-semibold text-tertiary mb-1",children:"Controls"}),d("ul",{className:"text-xs text-secondary/80 space-y-0.5",children:[n("li",{children:"Left-click + drag: Rotate"}),n("li",{children:"Middle-click + drag: Pan"}),n("li",{children:"Scroll / Right-click: Zoom"})]})]}),zn=({appName:e})=>d("section",{className:"h-screen flex items-center justify-center text-center px-8 text-secondary",children:["The ",e," requires a desktop browser for optimal performance."]}),_n=({items:e})=>n("nav",{"aria-label":"Breadcrumb",className:"px-6 py-2 text-sm",children:n("ol",{className:"flex items-center gap-1.5",children:e.map((t,o)=>{const s=o===e.length-1;return d("li",{className:"flex items-center gap-1.5",children:[o>0&&n("svg",{className:"w-3.5 h-3.5 text-secondary/50",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",children:n("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M9 5l7 7-7 7"})}),s||!t.path?n("span",{"aria-current":s?"page":void 0,className:"text-tertiary",children:t.label}):n(fe,{to:t.path,className:"text-secondary hover:text-tertiary transition-colors",children:t.label})]},t.label)})})}),Fn=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`,ye={low:{volSteps:48,surfSteps:48,label:"Low (Mobile)"},medium:{volSteps:96,surfSteps:96,label:"Medium"},high:{volSteps:128,surfSteps:128,label:"High"}};function Dn(e=96,t=96){return`
precision highp float;
varying vec2 vUv;

uniform vec2 uResolution;
uniform float uTime;
uniform float uFov;
uniform float uFrequency;
uniform float uScale;
uniform float uThickness;
uniform float uIso;
uniform float uRotation;
uniform float uLightIntensity;
uniform float uAmbient;
uniform float uContrast;
uniform float uSpecular;
uniform float uShininess;
uniform float uFieldRange;
uniform float uSurfaceType;
uniform float uMorphTarget;
uniform float uMorphFactor;
uniform float uRenderMode;
uniform float uFog;
uniform float uAoStrength;
uniform float uColormap;
uniform float uProjection;
uniform float uOrthoScale;
uniform float uPhaseX;
uniform float uPhaseY;
uniform float uPhaseZ;
uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamForward;

const int VOL_STEPS = ${e};
const int SURF_STEPS = ${t};
const float MAX_DIST = 12.0;
const vec3 BOX_SIZE = vec3(0.5);
const float PI = 3.14159265359;

// ============================================================================
// TPMS Surface Functions (all 14 types from microgen)
// ============================================================================

float gyroid(vec3 p) {
  return sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z) + sin(p.z) * cos(p.x);
}

float schwarzP(vec3 p) {
  return cos(p.x) + cos(p.y) + cos(p.z);
}

float schwarzD(vec3 p) {
  return sin(p.x) * sin(p.y) * sin(p.z)
       + sin(p.x) * cos(p.y) * cos(p.z)
       + cos(p.x) * sin(p.y) * cos(p.z)
       + cos(p.x) * cos(p.y) * sin(p.z);
}

float neovius(vec3 p) {
  return 3.0 * (cos(p.x) + cos(p.y) + cos(p.z))
       + 4.0 * cos(p.x) * cos(p.y) * cos(p.z);
}

float schoenIWP(vec3 p) {
  return 2.0 * (cos(p.x) * cos(p.y) + cos(p.y) * cos(p.z) + cos(p.z) * cos(p.x))
       - (cos(2.0 * p.x) + cos(2.0 * p.y) + cos(2.0 * p.z));
}

float schoenFRD(vec3 p) {
  return 4.0 * cos(p.x) * cos(p.y) * cos(p.z)
       - (cos(2.0 * p.x) * cos(2.0 * p.y)
        + cos(2.0 * p.y) * cos(2.0 * p.z)
        + cos(2.0 * p.z) * cos(2.0 * p.x));
}

float fischerKochS(vec3 p) {
  return cos(2.0 * p.x) * sin(p.y) * cos(p.z)
       + cos(p.x) * cos(2.0 * p.y) * sin(p.z)
       + sin(p.x) * cos(p.y) * cos(2.0 * p.z);
}

float lidinoid(vec3 p) {
  return 0.5 * (sin(2.0 * p.x) * cos(p.y) * sin(p.z)
              + sin(2.0 * p.y) * cos(p.z) * sin(p.x)
              + sin(2.0 * p.z) * cos(p.x) * sin(p.y))
       - 0.5 * (cos(2.0 * p.x) * cos(2.0 * p.y)
              + cos(2.0 * p.y) * cos(2.0 * p.z)
              + cos(2.0 * p.z) * cos(2.0 * p.x))
       + 0.15;
}

float splitP(vec3 p) {
  return 1.1 * (sin(2.0 * p.x) * cos(p.y) * sin(p.z)
              + sin(2.0 * p.y) * cos(p.z) * sin(p.x)
              + sin(2.0 * p.z) * cos(p.x) * sin(p.y))
       - 0.2 * (cos(2.0 * p.x) * cos(2.0 * p.y)
              + cos(2.0 * p.y) * cos(2.0 * p.z)
              + cos(2.0 * p.z) * cos(2.0 * p.x))
       - 0.4 * (cos(2.0 * p.x) + cos(2.0 * p.y) + cos(2.0 * p.z));
}

float pmy(vec3 p) {
  return 2.0 * cos(p.x) * cos(p.y) * cos(p.z)
       + sin(2.0 * p.x) * sin(p.y)
       + sin(p.x) * sin(2.0 * p.z)
       + sin(2.0 * p.y) * sin(p.z);
}

// Honeycomb variants (absolute value)
float honeycombGyroid(vec3 p) {
  return abs(gyroid(p));
}

float honeycombSchwarzP(vec3 p) {
  return abs(schwarzP(p));
}

float honeycombSchwarzD(vec3 p) {
  return abs(schwarzD(p));
}

float honeycombIWP(vec3 p) {
  return abs(schoenIWP(p));
}

// Surface selector
float evaluateSurface(float surfaceType, vec3 p) {
  float t = floor(surfaceType + 0.5);
  if (t < 0.5) return gyroid(p);
  if (t < 1.5) return schwarzP(p);
  if (t < 2.5) return schwarzD(p);
  if (t < 3.5) return neovius(p);
  if (t < 4.5) return schoenIWP(p);
  if (t < 5.5) return schoenFRD(p);
  if (t < 6.5) return fischerKochS(p);
  if (t < 7.5) return lidinoid(p);
  if (t < 8.5) return splitP(p);
  if (t < 9.5) return pmy(p);
  if (t < 10.5) return honeycombGyroid(p);
  if (t < 11.5) return honeycombSchwarzP(p);
  if (t < 12.5) return honeycombSchwarzD(p);
  return honeycombIWP(p);
}

// ============================================================================
// Field Evaluation with Morphing
// ============================================================================

vec3 rotateY(vec3 p, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

float field(vec3 p) {
  vec3 q = rotateY(p, uRotation) * uFrequency;
  q += vec3(uPhaseX, uPhaseY, uPhaseZ);

  float base = evaluateSurface(uSurfaceType, q);

  // Apply morphing if factor > 0
  if (uMorphFactor > 0.001) {
    float target = evaluateSurface(uMorphTarget, q);
    base = mix(base, target, uMorphFactor);
  }

  return base - uIso;
}

float densityFromField(float f) {
  float d = abs(f);
  return smoothstep(uThickness, 0.0, d);
}

float fieldWorld(vec3 p) {
  return field(p * uScale);
}

// ============================================================================
// Colormaps
// ============================================================================

vec3 ramp5(float t, vec3 a, vec3 b, vec3 c, vec3 d, vec3 e) {
  float u = clamp(t, 0.0, 1.0);
  float x = u * 4.0;
  if (x < 1.0) return mix(a, b, x);
  if (x < 2.0) return mix(b, c, x - 1.0);
  if (x < 3.0) return mix(c, d, x - 2.0);
  return mix(d, e, x - 3.0);
}

vec3 colormap(float t) {
  float m = floor(uColormap + 0.5);
  if (m < 0.5) {
    // Blue-White-Red
    vec3 negCol = vec3(0.1, 0.35, 0.9);
    vec3 posCol = vec3(0.9, 0.2, 0.1);
    vec3 midCol = vec3(1.0);
    return t < 0.5
      ? mix(negCol, midCol, smoothstep(0.0, 0.5, t))
      : mix(midCol, posCol, smoothstep(0.5, 1.0, t));
  }
  if (m < 1.5) {
    // Viridis
    return ramp5(t,
      vec3(0.267, 0.004, 0.329),
      vec3(0.283, 0.141, 0.458),
      vec3(0.127, 0.566, 0.551),
      vec3(0.369, 0.789, 0.383),
      vec3(0.993, 0.906, 0.144));
  }
  if (m < 2.5) {
    // Plasma
    return ramp5(t,
      vec3(0.050, 0.030, 0.528),
      vec3(0.417, 0.031, 0.595),
      vec3(0.742, 0.215, 0.483),
      vec3(0.940, 0.501, 0.274),
      vec3(0.940, 0.975, 0.131));
  }
  if (m < 3.5) {
    // Magma
    return ramp5(t,
      vec3(0.001, 0.000, 0.013),
      vec3(0.270, 0.047, 0.407),
      vec3(0.673, 0.165, 0.294),
      vec3(0.956, 0.468, 0.268),
      vec3(0.987, 0.991, 0.750));
  }
  if (m < 4.5) {
    // Inferno
    return ramp5(t,
      vec3(0.001, 0.000, 0.014),
      vec3(0.258, 0.038, 0.406),
      vec3(0.578, 0.148, 0.404),
      vec3(0.894, 0.383, 0.201),
      vec3(0.988, 0.998, 0.645));
  }
  if (m < 5.5) {
    // Turbo
    return ramp5(t,
      vec3(0.189, 0.071, 0.232),
      vec3(0.163, 0.471, 0.884),
      vec3(0.315, 0.870, 0.469),
      vec3(0.928, 0.736, 0.110),
      vec3(0.645, 0.107, 0.043));
  }
  // Gray
  return vec3(t);
}

// ============================================================================
// Ambient Occlusion
// ============================================================================

float aoSample(vec3 p, vec3 n) {
  float occ = 0.0;
  float sca = 1.0;
  for (int i = 1; i <= 5; i++) {
    float h = 0.03 * float(i);
    float d = abs(field((p + n * h) * uScale));
    float a = smoothstep(0.0, uThickness, d);
    occ += (1.0 - a) * sca;
    sca *= 0.7;
  }
  return clamp(1.0 - occ * uAoStrength, 0.0, 1.0);
}

// ============================================================================
// Ray-Box Intersection
// ============================================================================

vec2 intersectBox(vec3 ro, vec3 rd, vec3 boxSize) {
  vec3 tMin = (-boxSize - ro) / rd;
  vec3 tMax = (boxSize - ro) / rd;
  vec3 t1 = min(tMin, tMax);
  vec3 t2 = max(tMin, tMax);
  float tNear = max(max(t1.x, t1.y), t1.z);
  float tFar = min(min(t2.x, t2.y), t2.z);
  return vec2(tNear, tFar);
}

vec3 boxNormal(vec3 p) {
  vec3 ap = abs(p);
  if (ap.x > ap.y && ap.x > ap.z) return vec3(sign(p.x), 0.0, 0.0);
  if (ap.y > ap.z) return vec3(0.0, sign(p.y), 0.0);
  return vec3(0.0, 0.0, sign(p.z));
}

// ============================================================================
// Main
// ============================================================================

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
  uv *= 2.0;

  vec3 ro = uCamPos;
  vec3 rd;
  if (uProjection > 0.5) {
    ro += (uCamRight * uv.x + uCamUp * uv.y) * uOrthoScale;
    rd = normalize(uCamForward);
  } else {
    float fovScale = tan(uFov * 0.5);
    rd = normalize(
      uCamForward +
      uv.x * uCamRight * fovScale +
      uv.y * uCamUp * fovScale
    );
  }

  vec2 bounds = intersectBox(ro, rd, BOX_SIZE);
  float tNear = bounds.x;
  float tFar = bounds.y;
  if (tNear > tFar || tFar < 0.0) {
    gl_FragColor = vec4(0.05, 0.05, 0.07, 1.0);
    return;
  }

  vec3 bg = vec3(0.05, 0.05, 0.07);
  float t0 = max(tNear, 0.0);
  float t1 = min(tFar, MAX_DIST);

  vec3 keyDir = normalize(-uCamForward + 0.5 * uCamRight + 0.4 * uCamUp);
  vec3 fillDir = normalize(-uCamForward - 0.6 * uCamRight + 0.1 * uCamUp);
  vec3 rimDir = normalize(-uCamForward - 0.2 * uCamRight - 0.7 * uCamUp);
  vec3 eps = vec3(0.003, 0.0, 0.0);

  // Volume rendering mode
  if (uRenderMode < 0.5) {
    float stepSize = (t1 - t0) / float(VOL_STEPS);
    vec3 acc = vec3(0.0);
    float alpha = 0.0;

    for (int i = 0; i < VOL_STEPS; i++) {
      float tStep = t0 + (float(i) + 0.5) * stepSize;
      vec3 p = ro + rd * tStep;
      float f = field(p * uScale);
      float density = densityFromField(f);
      if (density > 0.001) {
        float fx = field((p + eps.xyy) * uScale) - field((p - eps.xyy) * uScale);
        float fy = field((p + eps.yxy) * uScale) - field((p - eps.yxy) * uScale);
        float fz = field((p + eps.yyx) * uScale) - field((p - eps.yyx) * uScale);
        vec3 n = normalize(vec3(fx, fy, fz));
        float diffKey = max(dot(n, keyDir), 0.0);
        float diffFill = max(dot(n, fillDir), 0.0) * 0.5;
        float diffRim = max(dot(n, rimDir), 0.0) * 0.35;
        float diff = diffKey + diffFill + diffRim;
        float diffBoost = pow(diff, max(uContrast, 0.01));
        float ambientBoost = uAmbient * (1.0 / max(uContrast, 0.25));
        vec3 viewDir = normalize(-rd);
        vec3 halfKey = normalize(keyDir + viewDir);
        float spec = pow(max(dot(n, halfKey), 0.0), uShininess) * uSpecular;
        float fieldT = clamp(f / uFieldRange, -1.0, 1.0);
        vec3 base = colormap(0.5 * (fieldT + 1.0));
        float ao = aoSample(p, n);
        vec3 sampleCol = base * (ambientBoost + diffBoost * uLightIntensity) * ao + vec3(spec) * ao;
        float opacity = clamp(density * 2.0, 0.0, 1.0);
        acc += (1.0 - alpha) * sampleCol * opacity;
        alpha += (1.0 - alpha) * opacity;
        if (alpha > 0.98) break;
      }
    }

    vec3 volCol = mix(bg, acc, alpha);
    float fog = exp(-uFog * t1);
    gl_FragColor = vec4(mix(bg, volCol, fog), 1.0);
    return;
  }

  // Surface rendering mode
  bool capHit = false;
  float tHit = t0;
  vec3 capNormal = vec3(0.0);
  if (tNear > 0.0) {
    vec3 pEntry = ro + rd * t0;
    float gEntry = abs(fieldWorld(pEntry)) - uThickness;
    if (gEntry < 0.0) {
      capHit = true;
      capNormal = boxNormal(pEntry);
    }
  }

  float tSurf = t0;
  float gPrev = abs(fieldWorld(ro + rd * tSurf)) - uThickness;
  bool hit = capHit;

  if (!capHit) {
    for (int i = 1; i <= SURF_STEPS; i++) {
      float tCurr = mix(t0, t1, float(i) / float(SURF_STEPS));
      float gCurr = abs(fieldWorld(ro + rd * tCurr)) - uThickness;
      if (gPrev == 0.0 || (gPrev > 0.0) != (gCurr > 0.0)) {
        float a = tSurf;
        float b = tCurr;
        float ga = gPrev;
        float gb = gCurr;
        for (int j = 0; j < 10; j++) {
          float m = 0.5 * (a + b);
          float gm = abs(fieldWorld(ro + rd * m)) - uThickness;
          if ((ga > 0.0) != (gm > 0.0)) {
            b = m;
            gb = gm;
          } else {
            a = m;
            ga = gm;
          }
        }
        tHit = 0.5 * (a + b);
        hit = true;
        break;
      }
      tSurf = tCurr;
      gPrev = gCurr;
    }
  }

  if (!hit) {
    gl_FragColor = vec4(bg, 1.0);
    return;
  }

  vec3 p = ro + rd * tHit;
  vec3 viewDir = normalize(-rd);
  vec3 n = capHit ? capNormal : normalize(vec3(
    fieldWorld(p + eps.xyy) - fieldWorld(p - eps.xyy),
    fieldWorld(p + eps.yxy) - fieldWorld(p - eps.yxy),
    fieldWorld(p + eps.yyx) - fieldWorld(p - eps.yyx)
  ));
  if (!capHit) {
    float s = fieldWorld(p) < 0.0 ? -1.0 : 1.0;
    n = normalize(n * s);
  }
  if (dot(n, viewDir) < 0.0) {
    n = -n;
  }

  float diffKey = max(dot(n, keyDir), 0.0);
  float diffFill = max(dot(n, fillDir), 0.0) * 0.5;
  float diffRim = max(dot(n, rimDir), 0.0) * 0.35;
  float diff = diffKey + diffFill + diffRim;
  float diffBoost = pow(diff, max(uContrast, 0.01));
  float ambientBoost = uAmbient * (1.0 / max(uContrast, 0.25));
  vec3 halfKey = normalize(keyDir + viewDir);
  vec3 halfFill = normalize(fillDir + viewDir);
  vec3 halfRim = normalize(rimDir + viewDir);
  float spec = (
    pow(max(dot(n, halfKey), 0.0), uShininess) +
    0.5 * pow(max(dot(n, halfFill), 0.0), uShininess) +
    0.25 * pow(max(dot(n, halfRim), 0.0), uShininess)
  ) * uSpecular;
  float fieldT = clamp(fieldWorld(p) / uFieldRange, -1.0, 1.0);
  vec3 base = colormap(0.5 * (fieldT + 1.0));
  float ao = aoSample(p, n);
  vec3 surfCol = base * (ambientBoost + diffBoost * uLightIntensity) * ao + vec3(spec) * ao;
  gl_FragColor = vec4(surfCol, 1.0);
}
`}const ce={Gyroid:0,"Schwarz P":1,"Schwarz D":2,Neovius:3,"Schoen IWP":4,"Schoen FRD":5,"Fischer-Koch S":6,Lidinoid:7,"Split-P":8,PMY:9,"Honeycomb Gyroid":10,"Honeycomb Schwarz P":11,"Honeycomb Schwarz D":12,"Honeycomb IWP":13},Be=Object.keys(ce),Pe={"Blue-White-Red":0,Viridis:1,Plasma:2,Magma:3,Inferno:4,Turbo:5,Gray:6},En=Object.keys(Pe),In=[{id:0,name:"gyroid",displayName:"Gyroid",glsl:"sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z) + sin(p.z) * cos(p.x)",description:"Discovered by Alan Schoen in 1970. Most common TPMS used in additive manufacturing.",category:"minimal",latex:"\\sin(x)\\cos(y) + \\sin(y)\\cos(z) + \\sin(z)\\cos(x)"},{id:1,name:"schwarzP",displayName:"Schwarz P",glsl:"cos(p.x) + cos(p.y) + cos(p.z)",description:"Primitive surface discovered by Karl Schwarz in 1865.",category:"minimal",latex:"\\cos(x) + \\cos(y) + \\cos(z)"},{id:2,name:"schwarzD",displayName:"Schwarz D",glsl:`sin(p.x) * sin(p.y) * sin(p.z)
         + sin(p.x) * cos(p.y) * cos(p.z)
         + cos(p.x) * sin(p.y) * cos(p.z)
         + cos(p.x) * cos(p.y) * sin(p.z)`,description:"Diamond surface by Karl Schwarz.",category:"minimal",latex:"\\sin x \\sin y \\sin z + \\sin x \\cos y \\cos z + \\cos x \\sin y \\cos z + \\cos x \\cos y \\sin z"},{id:3,name:"neovius",displayName:"Neovius",glsl:"3.0 * (cos(p.x) + cos(p.y) + cos(p.z)) + 4.0 * cos(p.x) * cos(p.y) * cos(p.z)",description:"Discovered by Edvard Neovius in 1883.",category:"minimal",latex:"3(\\cos x + \\cos y + \\cos z) + 4\\cos x \\cos y \\cos z"},{id:4,name:"schoenIWP",displayName:"Schoen IWP",glsl:`2.0 * (cos(p.x) * cos(p.y) + cos(p.y) * cos(p.z) + cos(p.z) * cos(p.x))
         - (cos(2.0 * p.x) + cos(2.0 * p.y) + cos(2.0 * p.z))`,description:"I-WP (Wrapped Package) surface by Alan Schoen.",category:"minimal",latex:"2(\\cos x \\cos y + \\cos y \\cos z + \\cos z \\cos x) - (\\cos 2x + \\cos 2y + \\cos 2z)"},{id:5,name:"schoenFRD",displayName:"Schoen FRD",glsl:`4.0 * cos(p.x) * cos(p.y) * cos(p.z)
         - (cos(2.0 * p.x) * cos(2.0 * p.y)
          + cos(2.0 * p.y) * cos(2.0 * p.z)
          + cos(2.0 * p.z) * cos(2.0 * p.x))`,description:"F-RD surface by Alan Schoen.",category:"minimal",latex:"4\\cos x \\cos y \\cos z - (\\cos 2x \\cos 2y + \\cos 2y \\cos 2z + \\cos 2z \\cos 2x)"},{id:6,name:"fischerKochS",displayName:"Fischer-Koch S",glsl:`cos(2.0 * p.x) * sin(p.y) * cos(p.z)
         + cos(p.x) * cos(2.0 * p.y) * sin(p.z)
         + sin(p.x) * cos(p.y) * cos(2.0 * p.z)`,description:"S surface discovered by Fischer and Koch.",category:"minimal",latex:"\\cos 2x \\sin y \\cos z + \\cos x \\cos 2y \\sin z + \\sin x \\cos y \\cos 2z"},{id:7,name:"lidinoid",displayName:"Lidinoid",glsl:`0.5 * (sin(2.0 * p.x) * cos(p.y) * sin(p.z)
              + sin(2.0 * p.y) * cos(p.z) * sin(p.x)
              + sin(2.0 * p.z) * cos(p.x) * sin(p.y))
         - 0.5 * (cos(2.0 * p.x) * cos(2.0 * p.y)
                + cos(2.0 * p.y) * cos(2.0 * p.z)
                + cos(2.0 * p.z) * cos(2.0 * p.x))
         + 0.15`,description:"Discovered by Sven Lidin in 1990.",category:"minimal"},{id:8,name:"splitP",displayName:"Split-P",glsl:`1.1 * (sin(2.0 * p.x) * cos(p.y) * sin(p.z)
              + sin(2.0 * p.y) * cos(p.z) * sin(p.x)
              + sin(2.0 * p.z) * cos(p.x) * sin(p.y))
         - 0.2 * (cos(2.0 * p.x) * cos(2.0 * p.y)
                + cos(2.0 * p.y) * cos(2.0 * p.z)
                + cos(2.0 * p.z) * cos(2.0 * p.x))
         - 0.4 * (cos(2.0 * p.x) + cos(2.0 * p.y) + cos(2.0 * p.z))`,description:"Split-P variation of the P surface.",category:"minimal"},{id:9,name:"pmy",displayName:"PMY",glsl:`2.0 * cos(p.x) * cos(p.y) * cos(p.z)
         + sin(2.0 * p.x) * sin(p.y)
         + sin(p.x) * sin(2.0 * p.z)
         + sin(2.0 * p.y) * sin(p.z)`,description:"PMY surface structure.",category:"minimal"},{id:10,name:"honeycombGyroid",displayName:"Honeycomb Gyroid",glsl:"abs(sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z) + sin(p.z) * cos(p.x))",description:"Honeycomb variant of Gyroid using absolute value.",category:"honeycomb"},{id:11,name:"honeycombSchwarzP",displayName:"Honeycomb Schwarz P",glsl:"abs(cos(p.x) + cos(p.y) + cos(p.z))",description:"Honeycomb variant of Schwarz P.",category:"honeycomb"},{id:12,name:"honeycombSchwarzD",displayName:"Honeycomb Schwarz D",glsl:`abs(sin(p.x) * sin(p.y) * sin(p.z)
             + sin(p.x) * cos(p.y) * cos(p.z)
             + cos(p.x) * sin(p.y) * cos(p.z)
             + cos(p.x) * cos(p.y) * sin(p.z))`,description:"Honeycomb variant of Schwarz D.",category:"honeycomb"},{id:13,name:"honeycombIWP",displayName:"Honeycomb IWP",glsl:`abs(2.0 * (cos(p.x) * cos(p.y) + cos(p.y) * cos(p.z) + cos(p.z) * cos(p.x))
             - (cos(2.0 * p.x) + cos(2.0 * p.y) + cos(2.0 * p.z)))`,description:"Honeycomb variant of IWP surface.",category:"honeycomb"}],On=`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`,An=`
precision highp float;

// Uniforms
uniform vec2 uResolution;
uniform float uTime;
uniform float uFov;

// Lattice parameters
uniform int uLatticeType;
uniform float uStrutRadius;
uniform float uNodeRadius;
uniform float uNodeSmoothing;
uniform float uCellSize;
uniform vec3 uRepeatCount;
uniform float uRotation;

// Rendering
uniform int uColormap;
uniform int uColorMode; // 0 = SDF, 1 = Height
uniform int uBlendMode; // 0 = None, 1 = Quadratic, 2 = Cubic, 3 = Exponential
uniform bool uParallelProjection;
uniform float uOrthoScale;

// Lighting
uniform float uLightIntensity;
uniform float uAmbient;
uniform float uContrast;
uniform float uSpecular;
uniform float uShininess;
uniform float uAoStrength;
uniform float uFog;

// Camera vectors (computed on CPU)
uniform vec3 uCamPos;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamForward;

varying vec2 vUv;

// Constants
const int MAX_STEPS = 128;
const float MAX_DIST = 20.0;
const float SURF_DIST = 0.001;
const float PI = 3.14159265359;

// ============================================
// SDF Primitives
// ============================================

// Distance to line segment (skeleton distance, no radius)
// This is the key primitive for smooth strut intersections
float sdLine(vec3 p, vec3 a, vec3 b) {
  vec3 pa = p - a;
  vec3 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

// Capsule (strut between two points) - kept for compatibility
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  return sdLine(p, a, b) - r;
}

// Sphere (node)
float sdSphere(vec3 p, vec3 c, float r) {
  return length(p - c) - r;
}

// ============================================
// Smooth Minimum Variants for Fillets
// ============================================

// Quadratic smooth min - classic smooth blend
float smin_quadratic(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

// Cubic smooth min - tighter blending than quadratic
float smin_cubic(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * h * k / 6.0;
}

// Exponential smooth min - tightest blending profile
float smin_exp(float a, float b, float k) {
  float res = exp(-a / k) + exp(-b / k);
  return -k * log(max(res, 0.0001));
}

// Main smooth min function - selects based on blend mode
float smin(float a, float b, float k) {
  if (k <= 0.0001 || uBlendMode == 0) return min(a, b);

  if (uBlendMode == 1) {
    return smin_quadratic(a, b, k);
  } else if (uBlendMode == 2) {
    return smin_cubic(a, b, k);
  } else {
    return smin_exp(a, b, k);
  }
}

// Box SDF for clipping
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// ============================================
// Lattice Unit Cells
// ============================================

// Simple Cubic: struts along cube edges
// sr = strut radius, sm = smooth blend factor for fillets
float latticeCubic(vec3 p, float sr, float sm) {
  float d = 1e10;

  // 12 edge struts - skeleton distances combined with smin for smooth fillets
  // X-aligned edges
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 0.0), vec3(1.0, 0.0, 0.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 0.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 1.0, 1.0), vec3(1.0, 1.0, 1.0)), sm);

  // Y-aligned edges
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0)), sm);
  d = smin(d, sdLine(p, vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(1.0, 0.0, 1.0), vec3(1.0, 1.0, 1.0)), sm);

  // Z-aligned edges
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(1.0, 0.0, 0.0), vec3(1.0, 0.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(1.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0)), sm);

  // Subtract strut radius to create the surface
  return d - sr;
}

// BCC: Body-Centered Cubic - struts from corners to center
float latticeBCC(vec3 p, float sr, float sm) {
  float d = 1e10;
  vec3 center = vec3(0.5);

  // 8 struts from corners to center - skeleton distances with smin for smooth fillets
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 0.0), center), sm);
  d = smin(d, sdLine(p, vec3(1.0, 0.0, 0.0), center), sm);
  d = smin(d, sdLine(p, vec3(0.0, 1.0, 0.0), center), sm);
  d = smin(d, sdLine(p, vec3(1.0, 1.0, 0.0), center), sm);
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 1.0), center), sm);
  d = smin(d, sdLine(p, vec3(1.0, 0.0, 1.0), center), sm);
  d = smin(d, sdLine(p, vec3(0.0, 1.0, 1.0), center), sm);
  d = smin(d, sdLine(p, vec3(1.0, 1.0, 1.0), center), sm);

  return d - sr;
}

// FCC: Face-Centered Cubic - face diagonal struts
// Different from Octet: struts along face diagonals + edges
float latticeFCC(vec3 p, float sr, float sm) {
  float d = 1e10;

  // Cube edges (12 struts) - skeleton distances with smin for smooth fillets
  // X-aligned
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 0.0), vec3(1.0, 0.0, 0.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 0.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 1.0), vec3(1.0, 0.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 1.0, 1.0), vec3(1.0, 1.0, 1.0)), sm);
  // Y-aligned
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0)), sm);
  d = smin(d, sdLine(p, vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 1.0), vec3(0.0, 1.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(1.0, 0.0, 1.0), vec3(1.0, 1.0, 1.0)), sm);
  // Z-aligned
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(1.0, 0.0, 0.0), vec3(1.0, 0.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 1.0, 0.0), vec3(0.0, 1.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(1.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0)), sm);

  // Face diagonals (6 struts - one diagonal per face)
  // XY faces (z=0 and z=1)
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 0.0), vec3(1.0, 1.0, 0.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 1.0), vec3(1.0, 1.0, 1.0)), sm);
  // XZ faces (y=0 and y=1)
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 0.0), vec3(1.0, 0.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(0.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0)), sm);
  // YZ faces (x=0 and x=1)
  d = smin(d, sdLine(p, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 1.0)), sm);
  d = smin(d, sdLine(p, vec3(1.0, 0.0, 0.0), vec3(1.0, 1.0, 1.0)), sm);

  return d - sr;
}

// Octet Truss: tetrahedra + octahedra combination
float latticeOctet(vec3 p, float sr, float sm) {
  float d = 1e10;

  // Corners and face centers
  vec3 c000 = vec3(0.0, 0.0, 0.0);
  vec3 c100 = vec3(1.0, 0.0, 0.0);
  vec3 c010 = vec3(0.0, 1.0, 0.0);
  vec3 c110 = vec3(1.0, 1.0, 0.0);
  vec3 c001 = vec3(0.0, 0.0, 1.0);
  vec3 c101 = vec3(1.0, 0.0, 1.0);
  vec3 c011 = vec3(0.0, 1.0, 1.0);
  vec3 c111 = vec3(1.0, 1.0, 1.0);

  vec3 fx0 = vec3(0.0, 0.5, 0.5);
  vec3 fx1 = vec3(1.0, 0.5, 0.5);
  vec3 fy0 = vec3(0.5, 0.0, 0.5);
  vec3 fy1 = vec3(0.5, 1.0, 0.5);
  vec3 fz0 = vec3(0.5, 0.5, 0.0);
  vec3 fz1 = vec3(0.5, 0.5, 1.0);

  // Struts from corners to adjacent face centers (24 total) - with smin for smooth fillets
  // Corner (0,0,0)
  d = smin(d, sdLine(p, c000, fx0), sm);
  d = smin(d, sdLine(p, c000, fy0), sm);
  d = smin(d, sdLine(p, c000, fz0), sm);

  // Corner (1,0,0)
  d = smin(d, sdLine(p, c100, fx1), sm);
  d = smin(d, sdLine(p, c100, fy0), sm);
  d = smin(d, sdLine(p, c100, fz0), sm);

  // Corner (0,1,0)
  d = smin(d, sdLine(p, c010, fx0), sm);
  d = smin(d, sdLine(p, c010, fy1), sm);
  d = smin(d, sdLine(p, c010, fz0), sm);

  // Corner (1,1,0)
  d = smin(d, sdLine(p, c110, fx1), sm);
  d = smin(d, sdLine(p, c110, fy1), sm);
  d = smin(d, sdLine(p, c110, fz0), sm);

  // Corner (0,0,1)
  d = smin(d, sdLine(p, c001, fx0), sm);
  d = smin(d, sdLine(p, c001, fy0), sm);
  d = smin(d, sdLine(p, c001, fz1), sm);

  // Corner (1,0,1)
  d = smin(d, sdLine(p, c101, fx1), sm);
  d = smin(d, sdLine(p, c101, fy0), sm);
  d = smin(d, sdLine(p, c101, fz1), sm);

  // Corner (0,1,1)
  d = smin(d, sdLine(p, c011, fx0), sm);
  d = smin(d, sdLine(p, c011, fy1), sm);
  d = smin(d, sdLine(p, c011, fz1), sm);

  // Corner (1,1,1)
  d = smin(d, sdLine(p, c111, fx1), sm);
  d = smin(d, sdLine(p, c111, fy1), sm);
  d = smin(d, sdLine(p, c111, fz1), sm);

  return d - sr;
}

// Diamond Cubic: tetrahedral coordination (each atom bonds to 4 neighbors)
float latticeDiamond(vec3 p, float sr, float sm) {
  float d = 1e10;

  // Diamond structure: 8 atoms per unit cell
  // 4 at FCC positions, 4 offset by (0.25, 0.25, 0.25)
  // Each atom has exactly 4 tetrahedral bonds

  // FCC positions (corners + face centers mapped to [0,1))
  vec3 a1 = vec3(0.0, 0.0, 0.0);
  vec3 a2 = vec3(0.0, 0.5, 0.5);
  vec3 a3 = vec3(0.5, 0.0, 0.5);
  vec3 a4 = vec3(0.5, 0.5, 0.0);

  // Offset positions (tetrahedral interstitials)
  vec3 b1 = vec3(0.25, 0.25, 0.25);
  vec3 b2 = vec3(0.25, 0.75, 0.75);
  vec3 b3 = vec3(0.75, 0.25, 0.75);
  vec3 b4 = vec3(0.75, 0.75, 0.25);

  // Each 'b' atom bonds to 4 'a' atoms (tetrahedral) - with smin for smooth fillets
  // b1 (0.25, 0.25, 0.25) bonds to: a1, a2, a3, a4
  d = smin(d, sdLine(p, b1, a1), sm);
  d = smin(d, sdLine(p, b1, a2), sm);
  d = smin(d, sdLine(p, b1, a3), sm);
  d = smin(d, sdLine(p, b1, a4), sm);

  // b2 (0.25, 0.75, 0.75) bonds to: a2, and 3 in neighboring cells
  d = smin(d, sdLine(p, b2, a2), sm);
  d = smin(d, sdLine(p, b2, vec3(0.0, 1.0, 1.0)), sm);  // a1 + (0,1,1)
  d = smin(d, sdLine(p, b2, vec3(0.5, 0.5, 1.0)), sm);  // a4 + (0,0,1)
  d = smin(d, sdLine(p, b2, vec3(0.5, 1.0, 0.5)), sm);  // a3 + (0,1,0)

  // b3 (0.75, 0.25, 0.75) bonds to: a3, and 3 in neighboring cells
  d = smin(d, sdLine(p, b3, a3), sm);
  d = smin(d, sdLine(p, b3, vec3(1.0, 0.0, 1.0)), sm);  // a1 + (1,0,1)
  d = smin(d, sdLine(p, b3, vec3(1.0, 0.5, 0.5)), sm);  // a2 + (1,0,0)
  d = smin(d, sdLine(p, b3, vec3(0.5, 0.5, 1.0)), sm);  // a4 + (0,0,1)

  // b4 (0.75, 0.75, 0.25) bonds to: a4, and 3 in neighboring cells
  d = smin(d, sdLine(p, b4, a4), sm);
  d = smin(d, sdLine(p, b4, vec3(1.0, 1.0, 0.0)), sm);  // a1 + (1,1,0)
  d = smin(d, sdLine(p, b4, vec3(1.0, 0.5, 0.5)), sm);  // a2 + (1,0,0)
  d = smin(d, sdLine(p, b4, vec3(0.5, 1.0, 0.5)), sm);  // a3 + (0,1,0)

  return d - sr;
}

// Kelvin Cell (Tetrakaidecahedron): space-filling with 14 faces
float latticeKelvin(vec3 p, float sr, float sm) {
  float d = 1e10;

  // Kelvin cell vertices (scaled to unit cell)
  // The shape has 24 vertices forming a truncated octahedron
  float a = 0.25;
  float b = 0.5;

  // Square face vertices (6 squares, 4 vertices each = 24 but shared)
  vec3 v1 = vec3(0.0, a, b);
  vec3 v2 = vec3(0.0, b, a);
  vec3 v3 = vec3(0.0, 1.0-a, b);
  vec3 v4 = vec3(0.0, b, 1.0-a);

  vec3 v5 = vec3(1.0, a, b);
  vec3 v6 = vec3(1.0, b, a);
  vec3 v7 = vec3(1.0, 1.0-a, b);
  vec3 v8 = vec3(1.0, b, 1.0-a);

  vec3 v9 = vec3(a, 0.0, b);
  vec3 v10 = vec3(b, 0.0, a);
  vec3 v11 = vec3(1.0-a, 0.0, b);
  vec3 v12 = vec3(b, 0.0, 1.0-a);

  vec3 v13 = vec3(a, 1.0, b);
  vec3 v14 = vec3(b, 1.0, a);
  vec3 v15 = vec3(1.0-a, 1.0, b);
  vec3 v16 = vec3(b, 1.0, 1.0-a);

  vec3 v17 = vec3(a, b, 0.0);
  vec3 v18 = vec3(b, a, 0.0);
  vec3 v19 = vec3(1.0-a, b, 0.0);
  vec3 v20 = vec3(b, 1.0-a, 0.0);

  vec3 v21 = vec3(a, b, 1.0);
  vec3 v22 = vec3(b, a, 1.0);
  vec3 v23 = vec3(1.0-a, b, 1.0);
  vec3 v24 = vec3(b, 1.0-a, 1.0);

  // Square edges on X faces - with smin for smooth fillets
  d = smin(d, sdLine(p, v1, v2), sm);
  d = smin(d, sdLine(p, v2, v3), sm);
  d = smin(d, sdLine(p, v3, v4), sm);
  d = smin(d, sdLine(p, v4, v1), sm);

  d = smin(d, sdLine(p, v5, v6), sm);
  d = smin(d, sdLine(p, v6, v7), sm);
  d = smin(d, sdLine(p, v7, v8), sm);
  d = smin(d, sdLine(p, v8, v5), sm);

  // Square edges on Y faces
  d = smin(d, sdLine(p, v9, v10), sm);
  d = smin(d, sdLine(p, v10, v11), sm);
  d = smin(d, sdLine(p, v11, v12), sm);
  d = smin(d, sdLine(p, v12, v9), sm);

  d = smin(d, sdLine(p, v13, v14), sm);
  d = smin(d, sdLine(p, v14, v15), sm);
  d = smin(d, sdLine(p, v15, v16), sm);
  d = smin(d, sdLine(p, v16, v13), sm);

  // Square edges on Z faces
  d = smin(d, sdLine(p, v17, v18), sm);
  d = smin(d, sdLine(p, v18, v19), sm);
  d = smin(d, sdLine(p, v19, v20), sm);
  d = smin(d, sdLine(p, v20, v17), sm);

  d = smin(d, sdLine(p, v21, v22), sm);
  d = smin(d, sdLine(p, v22, v23), sm);
  d = smin(d, sdLine(p, v23, v24), sm);
  d = smin(d, sdLine(p, v24, v21), sm);

  // Hexagonal face edges (connecting squares)
  d = smin(d, sdLine(p, v1, v9), sm);
  d = smin(d, sdLine(p, v2, v17), sm);
  d = smin(d, sdLine(p, v4, v21), sm);
  d = smin(d, sdLine(p, v3, v13), sm);

  d = smin(d, sdLine(p, v5, v11), sm);
  d = smin(d, sdLine(p, v6, v19), sm);
  d = smin(d, sdLine(p, v8, v23), sm);
  d = smin(d, sdLine(p, v7, v15), sm);

  d = smin(d, sdLine(p, v10, v18), sm);
  d = smin(d, sdLine(p, v12, v22), sm);
  d = smin(d, sdLine(p, v14, v20), sm);
  d = smin(d, sdLine(p, v16, v24), sm);

  return d - sr;
}

// ============================================
// Lattice SDF with Repetition
// ============================================

// Evaluate single cell lattice SDF
// Passes smoothing parameter for smooth fillets at strut intersections
float evalCell(vec3 cellP) {
  if (uLatticeType == 0) {
    return latticeCubic(cellP, uStrutRadius, uNodeSmoothing);
  } else if (uLatticeType == 1) {
    return latticeBCC(cellP, uStrutRadius, uNodeSmoothing);
  } else if (uLatticeType == 2) {
    return latticeFCC(cellP, uStrutRadius, uNodeSmoothing);
  } else if (uLatticeType == 3) {
    return latticeOctet(cellP, uStrutRadius, uNodeSmoothing);
  } else if (uLatticeType == 4) {
    return latticeDiamond(cellP, uStrutRadius, uNodeSmoothing);
  } else {
    return latticeKelvin(cellP, uStrutRadius, uNodeSmoothing);
  }
}

float evaluateLattice(vec3 p) {
  // Offset to center the lattice at origin
  // This ensures unit cells are centered, not starting at origin
  vec3 offset = uRepeatCount * uCellSize * 0.5;
  vec3 centered = p + offset;

  // Scale to cell coordinates
  vec3 scaled = centered / uCellSize;

  // Get cell index and local position
  vec3 cellIdx = floor(scaled);
  vec3 localP = scaled - cellIdx;

  float d = 1e10;

  // Evaluate current cell and neighbors to handle boundary struts
  for (int dx = -1; dx <= 1; dx++) {
    for (int dy = -1; dy <= 1; dy++) {
      for (int dz = -1; dz <= 1; dz++) {
        vec3 cellOffset = vec3(float(dx), float(dy), float(dz));
        vec3 neighborIdx = cellIdx + cellOffset;

        // Check if neighbor cell is within bounds [0, repeatCount)
        if (all(greaterThanEqual(neighborIdx, vec3(0.0))) &&
            all(lessThan(neighborIdx, uRepeatCount))) {
          // Evaluate lattice at offset position
          vec3 evalP = localP - cellOffset;
          d = min(d, evalCell(evalP));
        }
      }
    }
  }

  // Scale distance by cell size
  // Note: smooth fillets are created by smin inside lattice functions
  return d * uCellSize;
}

// Scene SDF with bounding box
float sceneSDF(vec3 p) {
  // Rotation around Y axis
  float c = cos(uRotation);
  float s = sin(uRotation);
  p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);

  // Bounding box - slightly smaller to avoid edge artifacts
  vec3 halfExtent = uRepeatCount * uCellSize * 0.5;
  float boxDist = sdBox(p, halfExtent);

  // Early exit optimization for rays far from the geometry
  if (boxDist > 0.5) {
    return boxDist;
  }

  // Proper intersection: clip lattice to bounding box
  // max() creates a proper CSG intersection that cleanly cuts struts at boundaries
  float latticeDist = evaluateLattice(p);
  return max(boxDist, latticeDist);
}

// ============================================
// Ray Marching
// ============================================

vec3 calcNormal(vec3 p) {
  const float eps = 0.001;
  vec2 h = vec2(eps, 0.0);
  return normalize(vec3(
    sceneSDF(p + h.xyy) - sceneSDF(p - h.xyy),
    sceneSDF(p + h.yxy) - sceneSDF(p - h.yxy),
    sceneSDF(p + h.yyx) - sceneSDF(p - h.yyx)
  ));
}

float rayMarch(vec3 ro, vec3 rd) {
  float t = 0.0;

  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * t;
    float d = sceneSDF(p);

    if (d < SURF_DIST) {
      return t;
    }

    if (t > MAX_DIST) {
      break;
    }

    t += d * 0.8; // Slightly conservative step
  }

  return -1.0;
}

// ============================================
// Colormaps
// ============================================

vec3 viridis(float t) {
  const vec3 c0 = vec3(0.267, 0.005, 0.329);
  const vec3 c1 = vec3(0.283, 0.141, 0.458);
  const vec3 c2 = vec3(0.254, 0.265, 0.530);
  const vec3 c3 = vec3(0.163, 0.471, 0.558);
  const vec3 c4 = vec3(0.135, 0.659, 0.518);
  const vec3 c5 = vec3(0.478, 0.821, 0.318);
  const vec3 c6 = vec3(0.993, 0.906, 0.144);

  t = clamp(t, 0.0, 1.0);
  float idx = t * 6.0;
  int i = int(floor(idx));
  float f = fract(idx);

  if (i >= 6) return c6;
  if (i == 0) return mix(c0, c1, f);
  if (i == 1) return mix(c1, c2, f);
  if (i == 2) return mix(c2, c3, f);
  if (i == 3) return mix(c3, c4, f);
  if (i == 4) return mix(c4, c5, f);
  return mix(c5, c6, f);
}

vec3 plasma(float t) {
  const vec3 c0 = vec3(0.050, 0.030, 0.528);
  const vec3 c1 = vec3(0.418, 0.001, 0.654);
  const vec3 c2 = vec3(0.693, 0.165, 0.565);
  const vec3 c3 = vec3(0.881, 0.393, 0.383);
  const vec3 c4 = vec3(0.988, 0.652, 0.211);
  const vec3 c5 = vec3(0.940, 0.975, 0.131);

  t = clamp(t, 0.0, 1.0);
  float idx = t * 5.0;
  int i = int(floor(idx));
  float f = fract(idx);

  if (i >= 5) return c5;
  if (i == 0) return mix(c0, c1, f);
  if (i == 1) return mix(c1, c2, f);
  if (i == 2) return mix(c2, c3, f);
  if (i == 3) return mix(c3, c4, f);
  return mix(c4, c5, f);
}

vec3 turbo(float t) {
  const vec3 c0 = vec3(0.190, 0.072, 0.232);
  const vec3 c1 = vec3(0.276, 0.421, 0.819);
  const vec3 c2 = vec3(0.124, 0.712, 0.697);
  const vec3 c3 = vec3(0.493, 0.901, 0.332);
  const vec3 c4 = vec3(0.950, 0.879, 0.286);
  const vec3 c5 = vec3(0.960, 0.413, 0.056);

  t = clamp(t, 0.0, 1.0);
  float idx = t * 5.0;
  int i = int(floor(idx));
  float f = fract(idx);

  if (i >= 5) return c5;
  if (i == 0) return mix(c0, c1, f);
  if (i == 1) return mix(c1, c2, f);
  if (i == 2) return mix(c2, c3, f);
  if (i == 3) return mix(c3, c4, f);
  return mix(c4, c5, f);
}

vec3 getColormap(float t) {
  if (uColormap == 0) return vec3(1.0); // White
  if (uColormap == 1) return viridis(t);
  if (uColormap == 2) return plasma(t);
  if (uColormap == 3) return turbo(t);
  return vec3(0.8, 0.85, 0.9); // Gray
}

// ============================================
// Lighting
// ============================================

float calcAO(vec3 p, vec3 n) {
  float ao = 0.0;
  float scale = 1.0;

  for (int i = 1; i <= 5; i++) {
    float dist = 0.02 * float(i);
    float d = sceneSDF(p + n * dist);
    ao += (dist - d) * scale;
    scale *= 0.5;
  }

  return 1.0 - clamp(ao * uAoStrength, 0.0, 1.0);
}

vec3 shade(vec3 p, vec3 n, vec3 rd) {
  // Light directions
  vec3 light1 = normalize(vec3(0.8, 1.0, 0.6));
  vec3 light2 = normalize(vec3(-0.5, 0.3, -0.8));
  vec3 light3 = normalize(vec3(0.0, -1.0, 0.0));

  // Diffuse
  float diff1 = max(dot(n, light1), 0.0);
  float diff2 = max(dot(n, light2), 0.0) * 0.5;
  float diff3 = max(dot(n, -light3), 0.0) * 0.35;

  float diffuse = diff1 + diff2 + diff3;

  // Specular
  vec3 h = normalize(light1 - rd);
  float spec = pow(max(dot(n, h), 0.0), uShininess) * uSpecular;

  // AO
  float ao = calcAO(p, n);

  // Color value based on mode
  float colorValue;
  if (uColorMode == 0) {
    // SDF-based color: use distance from surface
    float d = evaluateLattice(p);
    // Normalize SDF to [0, 1] range (strut radius as reference)
    colorValue = clamp(0.5 + d / (uStrutRadius * 4.0), 0.0, 1.0);
  } else {
    // Height-based color
    vec3 halfExtent = uRepeatCount * uCellSize * 0.5;
    colorValue = (p.y + halfExtent.y) / (2.0 * halfExtent.y);
  }
  vec3 baseColor = getColormap(colorValue);

  // Combine
  vec3 color = baseColor * (uAmbient + diffuse * uLightIntensity) * ao;
  color += vec3(1.0) * spec;

  // Contrast
  color = pow(color, vec3(uContrast));

  return color;
}

// ============================================
// Main
// ============================================

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;

  vec3 ro, rd;

  if (uParallelProjection) {
    // Orthographic
    ro = uCamPos + uCamRight * uv.x * uOrthoScale + uCamUp * uv.y * uOrthoScale;
    rd = uCamForward;
  } else {
    // Perspective (uFov is already in radians)
    float scale = tan(uFov * 0.5);
    rd = normalize(uCamForward + uCamRight * uv.x * scale + uCamUp * uv.y * scale);
    ro = uCamPos;
  }

  // Ray march
  float t = rayMarch(ro, rd);

  vec3 color;

  if (t > 0.0) {
    vec3 p = ro + rd * t;
    vec3 n = calcNormal(p);
    color = shade(p, n, rd);

    // Distance fog
    float fog = exp(-t * uFog * 0.05);
    vec3 bgColor = vec3(0.02, 0.02, 0.04);
    color = mix(bgColor, color, fog);
  } else {
    // Background gradient
    color = vec3(0.02, 0.02, 0.04) + uv.y * 0.02;
  }

  // Gamma correction
  color = pow(color, vec3(1.0 / 2.2));

  gl_FragColor = vec4(color, 1.0);
}
`,we={"Simple Cubic":0,"BCC (Body-Centered)":1,"FCC (Face-Centered)":2,"Octet Truss":3,"Diamond Cubic":4,"Kelvin Cell":5},Wn=Object.keys(we),Le={White:0,Viridis:1,Plasma:2,Turbo:3,Gray:4},Hn=Object.keys(Le),Me={SDF:0,Height:1},Bn=Object.keys(Me),ke={"None (Sharp)":0,Quadratic:1,Cubic:2,Exponential:3},jn=Object.keys(ke),Ie=[{id:0,name:"cubic",displayName:"Simple Cubic",description:"The simplest lattice structure with struts along the edges of a cube. Low relative density but weak in diagonal loading.",category:"cubic",strutsPerCell:12,relativeDensity:.15},{id:1,name:"bcc",displayName:"BCC (Body-Centered)",description:"Body-centered cubic lattice with struts from corners to center. Good omnidirectional strength and energy absorption.",category:"cubic",strutsPerCell:8,relativeDensity:.2},{id:2,name:"fcc",displayName:"FCC (Face-Centered)",description:"Face-centered cubic lattice. Excellent packing efficiency and isotropic mechanical properties.",category:"cubic",strutsPerCell:12,relativeDensity:.22},{id:3,name:"octet",displayName:"Octet Truss",description:"Highly efficient structure combining tetrahedra and octahedra. Maximum strength-to-weight ratio, used in aerospace.",category:"space-filling",strutsPerCell:24,relativeDensity:.28},{id:4,name:"diamond",displayName:"Diamond Cubic",description:"Based on the diamond crystal structure. Each node connects to 4 neighbors in tetrahedral arrangement.",category:"cubic",strutsPerCell:16,relativeDensity:.18},{id:5,name:"kelvin",displayName:"Kelvin Cell",description:"Tetrakaidecahedron structure that tiles space with minimal surface area. Excellent for foam-like applications.",category:"space-filling",strutsPerCell:36,relativeDensity:.25}];Ie.map(e=>e.displayName);Object.fromEntries(Ie.map(e=>[e.displayName,e.id]));const Xn=({params:e,fragmentShader:t})=>{const o=m.useRef(null),{size:s,camera:r,gl:a}=De(),u=m.useRef(s.width/s.height),c=a.domElement.width,h=a.domElement.height,l=m.useMemo(()=>({uResolution:{value:[c,h]},uTime:{value:0},uFov:{value:Math.PI/4},uFrequency:{value:e.frequency},uScale:{value:e.scale},uThickness:{value:e.thickness},uIso:{value:e.iso},uRotation:{value:e.rotation},uLightIntensity:{value:e.lightIntensity},uAmbient:{value:e.ambient},uContrast:{value:e.contrast},uSpecular:{value:e.specular},uShininess:{value:e.shininess},uFieldRange:{value:e.fieldRange},uSurfaceType:{value:ce[e.surface]??0},uMorphTarget:{value:ce[e.morphTarget]??1},uMorphFactor:{value:e.morphFactor},uRenderMode:{value:e.renderMode==="Surface"?1:0},uFog:{value:e.fog},uAoStrength:{value:e.aoStrength},uColormap:{value:Pe[e.colormap]??0},uProjection:{value:e.parallelProjection?1:0},uOrthoScale:{value:1},uPhaseX:{value:e.phaseX},uPhaseY:{value:e.phaseY},uPhaseZ:{value:e.phaseZ},uCamPos:{value:r.position.clone()},uCamRight:{value:new B(1,0,0)},uCamUp:{value:new B(0,1,0)},uCamForward:{value:new B(0,0,-1)}}),[c,h]);return m.useEffect(()=>{const p=a.domElement.width,i=a.domElement.height,v=p/i;l.uResolution.value=[p,i],Math.abs(v-u.current)>.001&&(r.aspect=v,r.updateProjectionMatrix(),u.current=v)},[r,s,l,a]),Ee(({clock:p})=>{if(!o.current)return;const i=r;o.current.uniforms.uTime.value=p.getElapsedTime(),o.current.uniforms.uFov.value=i.fov*Math.PI/180,o.current.uniforms.uProjection.value=e.parallelProjection?1:0;const v=r.position.length();o.current.uniforms.uOrthoScale.value=Math.max(v*Math.tan(i.fov*Math.PI/360),.001),o.current.uniforms.uCamPos.value.copy(r.position),r.updateMatrixWorld();const f=new B;r.getWorldDirection(f).normalize();const g=new B().crossVectors(f,r.up).normalize(),x=new B().crossVectors(g,f).normalize();o.current.uniforms.uCamRight.value.copy(g),o.current.uniforms.uCamUp.value.copy(x),o.current.uniforms.uCamForward.value.copy(f),o.current.uniforms.uFrequency.value=e.frequency,o.current.uniforms.uScale.value=e.scale,o.current.uniforms.uThickness.value=e.thickness,o.current.uniforms.uIso.value=e.iso,o.current.uniforms.uRotation.value=e.rotation,o.current.uniforms.uLightIntensity.value=e.lightIntensity,o.current.uniforms.uAmbient.value=e.ambient,o.current.uniforms.uContrast.value=e.contrast,o.current.uniforms.uSpecular.value=e.specular,o.current.uniforms.uShininess.value=e.shininess,o.current.uniforms.uFieldRange.value=e.fieldRange,o.current.uniforms.uFog.value=e.fog,o.current.uniforms.uAoStrength.value=e.aoStrength,o.current.uniforms.uSurfaceType.value=ce[e.surface]??0,o.current.uniforms.uMorphTarget.value=ce[e.morphTarget]??1,o.current.uniforms.uMorphFactor.value=e.morphFactor,o.current.uniforms.uRenderMode.value=e.renderMode==="Surface"?1:0,o.current.uniforms.uColormap.value=Pe[e.colormap]??0,o.current.uniforms.uPhaseX.value=e.phaseX,o.current.uniforms.uPhaseY.value=e.phaseY,o.current.uniforms.uPhaseZ.value=e.phaseZ}),d("mesh",{children:[n("planeGeometry",{args:[2,2]}),n("shaderMaterial",{ref:o,uniforms:l,vertexShader:Fn,fragmentShader:t})]})},Gn=({params:e})=>{const t=m.useRef(null),{size:o,camera:s,gl:r}=De(),a=m.useRef(o.width/o.height),u=r.domElement.width,c=r.domElement.height,h=m.useMemo(()=>({uResolution:{value:[u,c]},uTime:{value:0},uFov:{value:Math.PI/4},uLatticeType:{value:we[e.latticeType]??0},uStrutRadius:{value:e.strutRadius},uNodeRadius:{value:e.nodeRadius},uNodeSmoothing:{value:e.nodeSmoothing},uCellSize:{value:e.cellSize},uRepeatCount:{value:new B(e.repeatX,e.repeatY,e.repeatZ)},uRotation:{value:e.rotation},uColormap:{value:Le[e.colormap]??1},uColorMode:{value:Me[e.colorMode]??0},uBlendMode:{value:ke[e.blendMode]??1},uParallelProjection:{value:e.parallelProjection},uOrthoScale:{value:1},uLightIntensity:{value:e.lightIntensity},uAmbient:{value:e.ambient},uContrast:{value:e.contrast},uSpecular:{value:e.specular},uShininess:{value:e.shininess},uAoStrength:{value:e.aoStrength},uFog:{value:e.fog},uCamPos:{value:s.position.clone()},uCamRight:{value:new B(1,0,0)},uCamUp:{value:new B(0,1,0)},uCamForward:{value:new B(0,0,-1)}}),[u,c]);return m.useEffect(()=>{const l=r.domElement.width,p=r.domElement.height,i=l/p;h.uResolution.value=[l,p],Math.abs(i-a.current)>.001&&(s.aspect=i,s.updateProjectionMatrix(),a.current=i)},[s,o,h,r]),Ee(({clock:l})=>{if(!t.current)return;const p=s;t.current.uniforms.uTime.value=l.getElapsedTime(),t.current.uniforms.uFov.value=p.fov*Math.PI/180,t.current.uniforms.uParallelProjection.value=e.parallelProjection;const i=s.position.length();t.current.uniforms.uOrthoScale.value=Math.max(i*Math.tan(p.fov*Math.PI/360),.001),t.current.uniforms.uCamPos.value.copy(s.position),s.updateMatrixWorld();const v=new B;s.getWorldDirection(v).normalize();const f=new B().crossVectors(v,s.up).normalize(),g=new B().crossVectors(f,v).normalize();t.current.uniforms.uCamRight.value.copy(f),t.current.uniforms.uCamUp.value.copy(g),t.current.uniforms.uCamForward.value.copy(v),t.current.uniforms.uLatticeType.value=we[e.latticeType]??0,t.current.uniforms.uStrutRadius.value=e.strutRadius,t.current.uniforms.uNodeRadius.value=e.nodeRadius,t.current.uniforms.uNodeSmoothing.value=e.nodeSmoothing,t.current.uniforms.uCellSize.value=e.cellSize,t.current.uniforms.uRepeatCount.value.set(e.repeatX,e.repeatY,e.repeatZ),t.current.uniforms.uRotation.value=e.rotation,t.current.uniforms.uColormap.value=Le[e.colormap]??1,t.current.uniforms.uColorMode.value=Me[e.colorMode]??0,t.current.uniforms.uBlendMode.value=ke[e.blendMode]??1,t.current.uniforms.uLightIntensity.value=e.lightIntensity,t.current.uniforms.uAmbient.value=e.ambient,t.current.uniforms.uContrast.value=e.contrast,t.current.uniforms.uSpecular.value=e.specular,t.current.uniforms.uShininess.value=e.shininess,t.current.uniforms.uAoStrength.value=e.aoStrength,t.current.uniforms.uFog.value=e.fog}),d("mesh",{children:[n("planeGeometry",{args:[2,2]}),n("shaderMaterial",{ref:t,uniforms:h,vertexShader:On,fragmentShader:An})]})};function Un(e,t,o,s){const r=Math.max(e,t,o),u=s*Math.PI/180/2,h=r*.85/Math.tan(u),l=1/Math.sqrt(3),p=h*l;return[p,p,p]}const Yn=({onUpdate:e})=>{const{gl:t}=De(),o=m.useRef(0),s=m.useRef(performance.now()),r=m.useRef([]),a=m.useRef(null);return m.useEffect(()=>{const u=t.getContext().getExtension("WEBGL_debug_renderer_info");u&&(a.current=t.getContext().getParameter(u.UNMASKED_RENDERER_WEBGL))},[t]),Ee(()=>{const u=performance.now(),c=u-s.current;if(s.current=u,r.current.push(c),r.current.length>60&&r.current.shift(),o.current++,o.current>=30){const h=r.current.reduce((v,f)=>v+f,0)/r.current.length,l=1e3/h,p=performance.memory?performance.memory.usedJSHeapSize/(1024*1024):null,i=t.info;e({fps:l,frameTime:h,memory:p,drawCalls:i.render.calls,triangles:i.render.triangles,gpuName:a.current}),o.current=0}}),null},je=({active:e,onClick:t,children:o})=>n("button",{onClick:t,className:`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${e?"bg-accent text-primary":"text-secondary hover:text-tertiary hover:bg-surface"}`,children:o}),qn=({params:e,setParams:t})=>d(j,{children:[n("div",{className:"mb-4",children:n(Z,{label:"Surface Type",value:e.surface,options:Be,onChange:t.setSurface})}),d($,{title:"Structure",children:[n(C,{label:"Thickness",value:e.thickness,min:.02,max:3,step:.01,onChange:t.setThickness}),n(C,{label:"Repetitions",value:e.frequency,min:.5,max:6,step:.1,onChange:t.setFrequency}),n(C,{label:"Cell Size",value:e.scale,min:.5,max:5,step:.1,onChange:t.setScale}),n(C,{label:"Offset",value:e.iso,min:-1,max:1,step:.01,onChange:t.setIso})]}),d($,{title:"Phase Shift",defaultOpen:!1,children:[n(C,{label:"X",value:e.phaseX,min:0,max:6.28,step:.01,onChange:t.setPhaseX}),n(C,{label:"Y",value:e.phaseY,min:0,max:6.28,step:.01,onChange:t.setPhaseY}),n(C,{label:"Z",value:e.phaseZ,min:0,max:6.28,step:.01,onChange:t.setPhaseZ})]}),d($,{title:"Morphing",defaultOpen:!1,children:[n(Z,{label:"Target",value:e.morphTarget,options:Be,onChange:t.setMorphTarget}),n(C,{label:"Blend",value:e.morphFactor,min:0,max:1,step:.01,onChange:t.setMorphFactor})]}),d($,{title:"Rendering",defaultOpen:!1,children:[n(Z,{label:"Mode",value:e.renderMode,options:["Volume","Surface"],onChange:t.setRenderMode}),n(Z,{label:"Colormap",value:e.colormap,options:En,onChange:t.setColormap}),n(st,{label:"Orthographic",checked:e.parallelProjection,onChange:t.setParallelProjection}),n(C,{label:"Rotation",value:e.rotation,min:0,max:6.28,step:.01,onChange:t.setRotation})]}),d($,{title:"Lighting",defaultOpen:!1,children:[n(C,{label:"Intensity",value:e.lightIntensity,min:.2,max:3,step:.05,onChange:t.setLightIntensity}),n(C,{label:"Ambient",value:e.ambient,min:0,max:1,step:.05,onChange:t.setAmbient}),n(C,{label:"Contrast",value:e.contrast,min:.5,max:4,step:.05,onChange:t.setContrast}),n(C,{label:"Specular",value:e.specular,min:0,max:1,step:.01,onChange:t.setSpecular}),n(C,{label:"Shininess",value:e.shininess,min:4,max:128,step:1,onChange:t.setShininess}),n(C,{label:"Field Range",value:e.fieldRange,min:.2,max:3,step:.05,onChange:t.setFieldRange}),n(C,{label:"AO",value:e.aoStrength,min:0,max:2,step:.05,onChange:t.setAoStrength}),n(C,{label:"Fog",value:e.fog,min:0,max:3,step:.05,onChange:t.setFog})]})]}),$n=({params:e,setParams:t})=>d(j,{children:[n("div",{className:"mb-4",children:n(Z,{label:"Lattice Type",value:e.latticeType,options:Wn,onChange:t.setLatticeType})}),d($,{title:"Structure",children:[n(C,{label:"Strut Radius",value:e.strutRadius,min:.01,max:.15,step:.005,onChange:t.setStrutRadius}),n(Z,{label:"Fillet Mode",value:e.blendMode,options:jn,onChange:t.setBlendMode}),n(C,{label:"Fillet Radius",value:e.nodeSmoothing,min:0,max:.5,step:.01,onChange:t.setNodeSmoothing}),n(C,{label:"Cell Size",value:e.cellSize,min:.5,max:2,step:.1,onChange:t.setCellSize})]}),d($,{title:"Repetitions",children:[n(C,{label:"X",value:e.repeatX,min:1,max:5,step:1,onChange:t.setRepeatX}),n(C,{label:"Y",value:e.repeatY,min:1,max:5,step:1,onChange:t.setRepeatY}),n(C,{label:"Z",value:e.repeatZ,min:1,max:5,step:1,onChange:t.setRepeatZ})]}),d($,{title:"Rendering",defaultOpen:!1,children:[n(Z,{label:"Color Mode",value:e.colorMode,options:Bn,onChange:t.setColorMode}),n(Z,{label:"Colormap",value:e.colormap,options:Hn,onChange:t.setColormap}),n(st,{label:"Orthographic",checked:e.parallelProjection,onChange:t.setParallelProjection}),n(C,{label:"Rotation",value:e.rotation,min:0,max:6.28,step:.01,onChange:t.setRotation})]}),d($,{title:"Lighting",defaultOpen:!1,children:[n(C,{label:"Intensity",value:e.lightIntensity,min:.2,max:3,step:.05,onChange:t.setLightIntensity}),n(C,{label:"Ambient",value:e.ambient,min:0,max:1,step:.05,onChange:t.setAmbient}),n(C,{label:"Contrast",value:e.contrast,min:.5,max:2,step:.05,onChange:t.setContrast}),n(C,{label:"Specular",value:e.specular,min:0,max:1,step:.05,onChange:t.setSpecular}),n(C,{label:"Shininess",value:e.shininess,min:4,max:128,step:1,onChange:t.setShininess}),n(C,{label:"AO",value:e.aoStrength,min:0,max:2,step:.05,onChange:t.setAoStrength}),n(C,{label:"Fog",value:e.fog,min:0,max:2,step:.05,onChange:t.setFog})]})]});function Kn(){const e=navigator.hardwareConcurrency??4;return e<=4?"low":e<=8?"medium":"high"}const Vn=({embedded:e=!1}={})=>{const[t,o]=m.useState(!1),[s,r]=m.useState("tpms"),[a,u]=m.useState(0),[c,h]=m.useState(Kn),l=m.useMemo(()=>{const N=ye[c];return Dn(N.volSteps,N.surfSteps)},[c]),[p,i]=m.useState({fps:0,frameTime:0,memory:null,drawCalls:0,triangles:0,gpuName:null}),v=m.useCallback(N=>{i(N)},[]),[f,g]=m.useState("Gyroid"),[x,L]=m.useState("Schwarz P"),[M,z]=m.useState(0),[O,R]=m.useState("Surface"),[A,_]=m.useState(!1),[I,J]=m.useState(2),[ie,re]=m.useState(3),[y,S]=m.useState(1),[b,P]=m.useState(0),[w,F]=m.useState(0),[X,ae]=m.useState(1.15),[ve,te]=m.useState(.6),[ne,le]=m.useState(.9),[de,oe]=m.useState(1),[mt,ht]=m.useState(20),[vt,gt]=m.useState(.2),[bt,yt]=m.useState(.8),[xt,St]=m.useState(.1),[Ct,Pt]=m.useState("Viridis"),[wt,Lt]=m.useState(0),[Mt,kt]=m.useState(0),[Rt,Tt]=m.useState(0),[Oe,Nt]=m.useState("Octet Truss"),[zt,_t]=m.useState(.04),[Ft,Dt]=m.useState(.06),[Et,It]=m.useState(.02),[Ot,At]=m.useState("Quadratic"),[Wt,Ht]=m.useState(1),[Bt,jt]=m.useState(1),[Xt,Gt]=m.useState(1),[Ut,Yt]=m.useState(1),[qt,$t]=m.useState("Viridis"),[Kt,Vt]=m.useState("SDF"),[Zt,Jt]=m.useState(!1),[Qt,en]=m.useState(0),[tn,nn]=m.useState(1.2),[on,sn]=m.useState(.5),[rn,an]=m.useState(1),[cn,ln]=m.useState(.8),[dn,un]=m.useState(32),[pn,fn]=m.useState(.3),[mn,hn]=m.useState(.5),Ae={surface:f,morphTarget:x,morphFactor:M,renderMode:O,parallelProjection:A,frequency:I,scale:ie,thickness:y,iso:b,rotation:w,lightIntensity:X,ambient:ve,contrast:ne,specular:de,shininess:mt,fieldRange:vt,fog:bt,aoStrength:xt,colormap:Ct,phaseX:wt,phaseY:Mt,phaseZ:Rt},K={latticeType:Oe,strutRadius:zt,nodeRadius:Ft,nodeSmoothing:Et,blendMode:Ot,cellSize:Wt,repeatX:Bt,repeatY:Xt,repeatZ:Ut,colormap:qt,colorMode:Kt,parallelProjection:Zt,rotation:Qt,lightIntensity:tn,ambient:on,contrast:rn,specular:cn,shininess:dn,aoStrength:pn,fog:mn};m.useEffect(()=>{const N=window.matchMedia("(max-width: 768px)"),ge=()=>o(N.matches);return ge(),N.addEventListener("change",ge),()=>N.removeEventListener("change",ge)},[]);const Q=In.find(N=>N.displayName===f),ee=Ie.find(N=>N.displayName===Oe);return d("div",{className:e?"relative w-full h-full min-h-[520px] bg-ink-800 border border-ink-600/60 flex flex-col overflow-hidden":"min-h-screen bg-primary flex flex-col",children:[!e&&n(Pn,{}),t?n(zn,{appName:"Computational Geometry Studio"}):d(j,{children:[d("div",{className:e?"bg-surface-dark border-b border-surface":"pt-16 bg-surface-dark border-b border-surface",children:[!e&&n(_n,{items:[{label:"Home",path:"/"},{label:"Computational Geometry"}]}),d("div",{className:"flex items-center justify-between px-6 py-3",children:[d("div",{children:[n("h1",{className:"text-xl font-bold text-tertiary",children:"Computational Geometry"}),n("p",{className:"text-secondary text-xs",children:s==="tpms"?d(j,{children:["TPMS from"," ",n("a",{href:"https://github.com/3MAH/microgen",target:"_blank",rel:"noopener noreferrer",className:"underline hover:text-tertiary",children:"microgen"})]}):"Strut-based lattice structures"})]}),d("div",{className:"flex items-center gap-3",children:[d("div",{className:"flex gap-1 bg-surface/50 rounded-lg p-1",children:[n(je,{active:s==="tpms",onClick:()=>r("tpms"),children:"TPMS"}),n(je,{active:s==="lattice",onClick:()=>r("lattice"),children:"Lattice"})]}),s==="tpms"&&n("select",{value:c,onChange:N=>h(N.target.value),className:"bg-surface/50 text-secondary text-xs rounded-lg px-2 py-1 border border-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer",title:"Shader quality",children:Object.keys(ye).map(N=>n("option",{value:N,children:ye[N].label},N))})]})]})]}),d("section",{className:"flex-1 flex min-h-0",children:[d("div",{className:"flex-1 relative min-w-0",children:[d(vn,{dpr:1.25,gl:{antialias:!0},style:{position:"absolute",top:0,left:0,width:"100%",height:"100%"},children:[n(gn,{makeDefault:!0,position:Un(s==="tpms"?1:K.repeatX*K.cellSize,s==="tpms"?1:K.repeatY*K.cellSize,s==="tpms"?1:K.repeatZ*K.cellSize,45),fov:45}),n(bn,{enableDamping:!0,target:[0,0,0],mouseButtons:{LEFT:be.ROTATE,MIDDLE:be.PAN,RIGHT:be.DOLLY}}),s==="tpms"?n(Xn,{params:Ae,fragmentShader:l}):n(Gn,{params:K}),n(yn,{alignment:"bottom-left",margin:[80,80],children:n(xn,{axisColors:["#d43d3d","#2fb36d","#2d6cdf"]})}),n(Yn,{onUpdate:v})]},`${s}-${a}`),d("div",{className:"absolute top-4 right-4 flex flex-col items-end gap-2",children:[n("div",{className:"px-3 py-2 bg-black/80 backdrop-blur-sm rounded-lg",children:d("div",{className:"flex flex-col gap-1 text-xs font-mono",children:[d("div",{className:"flex items-center gap-3",children:[d("span",{children:[n("span",{className:p.fps>=50?"text-green-400":p.fps>=30?"text-yellow-400":"text-red-400",children:p.fps.toFixed(0)}),n("span",{className:"text-tertiary/60 ml-1",children:"FPS"})]}),d("span",{children:[n("span",{className:"text-tertiary",children:p.frameTime.toFixed(1)}),n("span",{className:"text-tertiary/60 ml-1",children:"ms"})]})]}),d("div",{className:"flex items-center gap-3 text-tertiary/80",children:[p.memory!==null&&d("span",{children:[n("span",{className:"text-tertiary",children:p.memory.toFixed(0)}),n("span",{className:"text-tertiary/60 ml-1",children:"MB"})]}),d("span",{children:[n("span",{className:"text-tertiary",children:p.drawCalls}),n("span",{className:"text-tertiary/60 ml-1",children:"draws"})]}),d("span",{children:[d("span",{className:"text-tertiary",children:[(p.triangles/1e3).toFixed(1),"k"]}),n("span",{className:"text-tertiary/60 ml-1",children:"tris"})]})]}),p.gpuName&&n("div",{className:"text-[10px] text-tertiary/50 truncate max-w-[200px]",title:p.gpuName,children:p.gpuName})]})}),n("button",{onClick:()=>u(N=>N+1),className:`px-3 py-1.5 bg-black/80 backdrop-blur-sm text-secondary text-xs
                    rounded-lg hover:text-tertiary hover:bg-black/90 transition-colors`,title:"Reset camera view",children:"Reset View"})]}),n(Nn,{})]}),d("div",{className:"w-72 bg-surface-dark border-l border-surface flex flex-col",children:[n("div",{className:"flex-1 overflow-y-auto p-4",children:s==="tpms"?n(qn,{params:Ae,setParams:{setSurface:g,setMorphTarget:L,setMorphFactor:z,setRenderMode:R,setParallelProjection:_,setFrequency:J,setScale:re,setThickness:S,setIso:P,setRotation:F,setLightIntensity:ae,setAmbient:te,setContrast:le,setSpecular:oe,setShininess:ht,setFieldRange:gt,setFog:yt,setAoStrength:St,setColormap:Pt,setPhaseX:Lt,setPhaseY:kt,setPhaseZ:Tt}}):n($n,{params:K,setParams:{setLatticeType:Nt,setStrutRadius:_t,setNodeRadius:Dt,setNodeSmoothing:It,setBlendMode:At,setCellSize:Ht,setRepeatX:jt,setRepeatY:Gt,setRepeatZ:Yt,setColormap:$t,setColorMode:Vt,setParallelProjection:Jt,setRotation:en,setLightIntensity:nn,setAmbient:sn,setContrast:an,setSpecular:ln,setShininess:un,setAoStrength:fn,setFog:hn}})}),d("div",{className:"border-t border-surface p-4",children:[s==="tpms"&&Q&&d(j,{children:[n("h3",{className:"text-sm font-bold text-tertiary",children:Q.displayName}),n("p",{className:"text-secondary text-xs mt-1 leading-relaxed",children:Q.description}),Q.latex&&d("code",{className:"block mt-2 text-[10px] bg-black/50 p-1.5 rounded text-green-400 overflow-x-auto",children:["f(x,y,z) = ",Q.latex]}),n("span",{className:`text-[10px] px-1.5 py-0.5 rounded mt-2 inline-block ${Q.category==="minimal"?"bg-blue-900/50 text-blue-300":"bg-amber-900/50 text-amber-300"}`,children:Q.category})]}),s==="lattice"&&ee&&d(j,{children:[n("h3",{className:"text-sm font-bold text-tertiary",children:ee.displayName}),n("p",{className:"text-secondary text-xs mt-1 leading-relaxed",children:ee.description}),d("div",{className:"flex items-center gap-2 mt-2 flex-wrap",children:[n("span",{className:`text-[10px] px-1.5 py-0.5 rounded ${ee.category==="cubic"?"bg-blue-900/50 text-blue-300":"bg-emerald-900/50 text-emerald-300"}`,children:ee.category}),d("span",{className:"text-[10px] text-secondary",children:[ee.strutsPerCell," struts/cell"]}),d("span",{className:"text-[10px] text-secondary",children:["~",(ee.relativeDensity*100).toFixed(0),"% density"]})]})]})]})]})]})]})]})},Zn={title:"microgen",date:"2026-05-23",excerpt:"A Python toolbox for parametric lattice and TPMS generation. Walking through how the field functions are built, what the rendering looks like, and what microgen does on top.",tags:["microgen","TPMS","lattice","computational-geometry"],draft:!0,hidden:!0};function Xe(e){const t={a:"a",h2:"h2",li:"li",p:"p",strong:"strong",ul:"ul",...G(),...e.components};return d(j,{children:[n(t.h2,{children:"What microgen does"}),`
`,d(t.p,{children:[n(t.a,{href:"https://github.com/3MAH/microgen",children:"microgen"}),` is a Python library for generating
parametric microstructures: triply periodic minimal surfaces (TPMS), strut
lattices, foams, and other periodic geometries used in additive manufacturing
research. It produces meshes you can hand to a slicer, a solver, or an FEM
pipeline.`]}),`
`,n(t.p,{children:`This article will eventually walk through the underlying field functions, how
the surfaces are parameterised, and what was added on top to make the library
useful in practice. For now it's just the interactive viewer — a real-time
WebGL implementation of the same surfaces, rendered with SDF ray marching
straight in the browser.`}),`
`,n(t.h2,{children:"Interactive viewer"}),`
`,n("div",{className:"not-prose my-10",children:n(Vn,{embedded:!0})}),`
`,d(t.p,{children:["Switch between the ",n(t.strong,{children:"TPMS"})," tab and the ",n(t.strong,{children:"Lattice"}),` tab in the top-right of
the viewer. Drag to orbit; the side panel controls thickness, cell size,
morphing, phase shifts, and rendering parameters.`]}),`
`,n(t.h2,{children:"To be written"}),`
`,d(t.ul,{children:[`
`,n(t.li,{children:"How the SDF for each surface family is constructed"}),`
`,n(t.li,{children:"The morphing scheme between any two TPMS surfaces"}),`
`,n(t.li,{children:"How microgen wraps these into Python objects and meshes them"}),`
`,n(t.li,{children:"A walkthrough of generating a printable lattice"}),`
`,n(t.li,{children:"Notes on the parts of microgen I work on day-to-day"}),`
`]})]})}function Jn(e={}){const{wrapper:t}={...G(),...e.components};return t?n(t,{...e,children:n(Xe,{...e})}):Xe(e)}const Qn=Object.freeze(Object.defineProperty({__proto__:null,default:Jn,frontmatter:Zn},Symbol.toStringTag,{value:"Module"})),eo={title:"n-body on the GPU",date:"2026-05-23",excerpt:"Direct-summation N-body gravity at interactive frame rates with WebGPU compute. Notes on the integrator, the workgroup tiling, and what a few thousand bodies look like in real time.",tags:["N-body","WebGPU","compute","physics"],draft:!0,hidden:!0};function Ge(e){const t={h2:"h2",li:"li",p:"p",ul:"ul",...G(),...e.components};return d(j,{children:[n(t.h2,{children:"Direct summation, in your browser"}),`
`,n(t.p,{children:`The naïve O(N²) N-body solver is embarrassingly parallel: every body's
acceleration is a sum over every other body. With WebGPU compute, each
workgroup loads a tile of source bodies into shared memory, then every
thread in the workgroup accumulates contributions from that tile against
its assigned target body. Repeat for every tile and you have the full
force sum.`}),`
`,n(t.p,{children:"This article will walk through:"}),`
`,d(t.ul,{children:[`
`,n(t.li,{children:"The leapfrog integrator and why it's symplectic"}),`
`,n(t.li,{children:"Plummer softening so close encounters don't blow up"}),`
`,n(t.li,{children:"Workgroup tiling and the storage-barrier dance"}),`
`,n(t.li,{children:"Plummer / cold-collapse / cube initial conditions"}),`
`,n(t.li,{children:"A playable demo with sliders for G, softening, and damping"}),`
`]})]})}function to(e={}){const{wrapper:t}={...G(),...e.components};return t?n(t,{...e,children:n(Ge,{...e})}):Ge(e)}const no=Object.freeze(Object.defineProperty({__proto__:null,default:to,frontmatter:eo},Symbol.toStringTag,{value:"Module"})),T=.02625,oo=.142,so=2/5*oo*T*T,Ue=1/so,xe=9.81,io=.21,ro=.012,ao=.045,co=.94,lo=.6,uo=.2,po=.001,it=.005,Re=2*T,fo=Re*Re;function mo(e,t){const{speed:o,dir:s,yOffset:r,zOffset:a}=t;e.vel[0]=o*s[0],e.vel[1]=o*s[1];const u=o/(2/5*T),c=u*a,h=-u*r;e.spin[0]=c*-s[1],e.spin[1]=c*s[0],e.spin[2]=h}function ho(e,t){const[o,s]=e.vel,[r,a,u]=e.spin,c=o-T*a,h=s+T*r,l=Math.hypot(c,h);if(l>po){const i=io*xe,v=-i*(c/l),f=-i*(h/l);e.vel[0]=o+v*t,e.vel[1]=s+f*t;const g=T*f*Ue,x=-T*v*Ue;e.spin[0]=r+g*t,e.spin[1]=a+x*t;const L=e.vel[0]-T*e.spin[1],M=e.vel[1]+T*e.spin[0];c*L+h*M<0&&(e.spin[0]=-e.vel[1]/T,e.spin[1]=e.vel[0]/T)}else{const i=Math.hypot(o,s);if(i>it){const f=ro*xe*t,g=Math.max(0,(i-f)/i);e.vel[0]=o*g,e.vel[1]=s*g,e.spin[0]=-e.vel[1]/T,e.spin[1]=e.vel[0]/T}else e.vel[0]=0,e.vel[1]=0,e.spin[0]=0,e.spin[1]=0}const p=Math.abs(u);if(p>0){const i=ao*xe*t/T;p<i?e.spin[2]=0:e.spin[2]=u-Math.sign(u)*i}}function vo(e,t){for(const o of e)o.onTable&&(o.pos[0]+=o.vel[0]*t,o.pos[1]+=o.vel[1]*t)}function go(e,t){const o=t.pos[0]-e.pos[0],s=t.pos[1]-e.pos[1],r=o*o+s*s;if(r>=fo||r===0)return!1;const a=Math.sqrt(r),u=o/a,c=s/a,h=Re-a;e.pos[0]-=u*h*.5,e.pos[1]-=c*h*.5,t.pos[0]+=u*h*.5,t.pos[1]+=c*h*.5;const l=t.vel[0]-e.vel[0],p=t.vel[1]-e.vel[1],i=l*u+p*c;if(i>=0)return!0;const v=-(1+co)*i*.5;return e.vel[0]-=v*u,e.vel[1]-=v*c,t.vel[0]+=v*u,t.vel[1]+=v*c,!0}function bo(e,t){for(let o=0;o<e.length;o++){const s=e[o];if(s.onTable)for(let r=o+1;r<e.length;r++){const a=e[r];if(!a.onTable)continue;go(s,a)&&t.color===null&&(s.color==="cue"&&a.color!=="cue"?t.color=a.color:a.color==="cue"&&s.color!=="cue"&&(t.color=s.color))}}}function yo(e,t){const o=t.p2[0]-t.p1[0],s=t.p2[1]-t.p1[1],r=o*o+s*s;if(r<1e-12)return!1;const a=e.pos[0]-t.p1[0],u=e.pos[1]-t.p1[1],c=(a*o+u*s)/r,h=c<0?0:c>1?1:c,l=t.p1[0]+h*o,p=t.p1[1]+h*s,i=e.pos[0]-l,v=e.pos[1]-p,f=i*i+v*v;if(f>T*T||i*t.normal[0]+v*t.normal[1]>T*.25)return!1;const g=Math.sqrt(Math.max(f,1e-12)),x=i/g,L=v/g,M=T-g;e.pos[0]+=x*M,e.pos[1]+=L*M;const z=e.vel[0]*x+e.vel[1]*L;if(z<0){const O=-(1+lo)*z;e.vel[0]+=O*x,e.vel[1]+=O*L;const R=-L,A=x,_=e.vel[0]*R+e.vel[1]*A,I=uo*.5;return e.vel[0]-=I*_*R,e.vel[1]-=I*_*A,e.spin[2]*=.85,!0}return!1}function xo(e,t){if(!e.onTable)return!1;let o=!1;for(const s of t)yo(e,s)&&(o=!0);return o}function So(e,t,o){for(const s of e)if(s.onTable)for(const r of t){const a=s.pos[0]-r.pos[0],u=s.pos[1]-r.pos[1];if(a*a+u*u<r.radius*r.radius){s.onTable=!1,s.vel[0]=0,s.vel[1]=0,s.spin[0]=0,s.spin[1]=0,s.spin[2]=0,o.push(s);break}}}function Co(){return{firstHit:null,pocketed:[]}}function Po(e){for(const t of e)if(t.onTable&&Math.hypot(t.vel[0],t.vel[1])>it)return!0;return!1}function wo(e,t,o){const r=Math.max(1,Math.ceil(t/.001)),a=t/r,u={color:o.firstHit};for(let c=0;c<r;c++){vo(e.balls,a);for(const h of e.balls)h.onTable&&ho(h,a);bo(e.balls,u);for(const h of e.balls)xo(h,e.cushions);So(e.balls,e.pockets,o.pocketed)}o.firstHit=u.color}const k=3.569,H=1.778,Lo=.737,he=.292,se=Lo,Te=[se,he],Ne=[se,-he],ze=[se,0],_e=[k*.5,0],me=[k*.75,0],Mo=.3243,Fe=[k-Mo,0],rt=.105,at=.05,ct=.09,lt=.04,dt=Math.PI/4,ut=Math.PI/3,D=Math.cos(dt),E=Math.sin(dt),Y=Math.cos(ut),q=Math.sin(ut),ue=.072,Ye=.07,V=H/2,W=k/2,ko=[{pos:[0,-V],radius:ue},{pos:[0,V],radius:ue},{pos:[k,-V],radius:ue},{pos:[k,V],radius:ue},{pos:[W,-V],radius:Ye},{pos:[W,V],radius:Ye}];function Ro(){const e=k,t=V,o=rt,s=at,r=ct,a=lt,u=[],c=(h,l,p)=>{u.push({p1:h,p2:l,normal:p})};return c([0,-t+o],[0,t-o],[-1,0]),c([0,-t+o],[E*s,-t+o-D*s],[-D,-E]),c([0,t-o],[E*s,t-o+D*s],[-D,E]),c([e,-t+o],[e,t-o],[1,0]),c([e,-t+o],[e-E*s,-t+o-D*s],[D,-E]),c([e,t-o],[e-E*s,t-o+D*s],[D,E]),c([o,-t],[W-r,-t],[0,-1]),c([W+r,-t],[e-o,-t],[0,-1]),c([o,-t],[o-D*s,-t+E*s],[-E,-D]),c([e-o,-t],[e-o+D*s,-t+E*s],[E,-D]),c([W-r,-t],[W-r+Y*a,-t+q*a],[-q,-Y]),c([W+r,-t],[W+r-Y*a,-t+q*a],[q,-Y]),c([o,t],[W-r,t],[0,1]),c([W+r,t],[e-o,t],[0,1]),c([o,t],[o-D*s,t-E*s],[-E,D]),c([e-o,t],[e-o+D*s,t-E*s],[E,D]),c([W-r,t],[W-r+Y*a,t-q*a],[-q,Y]),c([W+r,t],[W+r-Y*a,t-q*a],[q,Y]),u}const pt=Ro();function To(){const e=V,t=rt,o=at,s=ct,r=lt,a=[],u=(h,l,p,i)=>{const v=[h-p*t,l],f=[h,l-i*t],g=[h-p*(t-D*o),l-i*E*o],x=[h-p*E*o,l-i*(t-D*o)],L=[h-p*t*.42,l-i*t*.42];return{notch:[v,[h,l],f,x,g],holeCenter:L,holeRadius:.042,openDir:[p,i]}};a.push(u(0,-e,-1,-1)),a.push(u(0,e,-1,1)),a.push(u(k,-e,1,-1)),a.push(u(k,e,1,1));const c=(h,l,p)=>({notch:[[h-s,l],[h+s,l],[h+s-Y*r,l-p*q*r],[h-s+Y*r,l-p*q*r]],holeCenter:[h,l-p*s*.1],holeRadius:.038,openDir:[0,-p]});return a.push(c(W,-e,-1)),a.push(c(W,e,1)),a}const qe=To();function $e(){const e=[];let t=0;const o=(h,l,p)=>({id:t++,color:h,pos:[l[0],l[1]],vel:[0,0],spin:[0,0,0],spot:p?[p[0],p[1]]:void 0,onTable:!0});e.push(o("cue",[se-he*.4,0])),e.push(o("yellow",[...Te],Te)),e.push(o("green",[...Ne],Ne)),e.push(o("brown",[...ze],ze)),e.push(o("blue",[..._e],_e)),e.push(o("pink",[...me],me)),e.push(o("black",[...Fe],Fe));const s=2*T,r=2e-4,a=(s+r)*Math.cos(Math.PI/6),u=s+r,c=me[0]+s+r+.001;for(let h=0;h<5;h++){const l=h+1,p=c+h*a,i=-((l-1)*.5)*u;for(let v=0;v<l;v++)e.push(o("red",[p,i+v*u]))}return e}const No={cue:"#f3eee4",red:"#c0392b",yellow:"#f1c40f",green:"#2e7d32",brown:"#6b4423",blue:"#1f6fb0",pink:"#e88aae",black:"#15151b"},zo="#249a48",_o="rgba(255,255,255,0.02)",Fo="#1f7d39",Do="rgba(0, 0, 0, 0.45)",Eo="#5d3a1f",Ke="#8a5a32",Io="#2a1607",Oo="#c9a35a",Ao="#0a0809",Wo="rgba(0, 0, 0, 0.7)",Ho="rgba(255, 255, 255, 0.22)",Bo="rgba(255, 255, 255, 0.28)";function Ve(e,t){const s=k+.36,r=H+.18*2,a=Math.min(e/s,t/r),u=k*a,c=H*a,h=(e-u)/2,l=(t-c)/2;return{scale:a,originX:h,originY:l,toPx:(p,i)=>[h+p*a,l+(H/2-i)*a],toWorld:(p,i)=>[(p-h)/a,H/2-(i-l)/a]}}const jo=({balls:e,cue:t,width:o,height:s,onPointerMove:r,onPointerDown:a,onPointerUp:u,frame:c})=>{const h=m.useRef(null);m.useEffect(()=>{const p=h.current;if(!p)return;const i=p.getContext("2d");if(!i)return;const v=window.devicePixelRatio||1;p.width=o*v,p.height=s*v,p.style.width=`${o}px`,p.style.height=`${s}px`,i.setTransform(v,0,0,v,0,0),i.clearRect(0,0,o,s);const f=Ve(o,s),g=T*f.scale,x=.105*f.scale,L=f.originX-x,M=f.originY-x,z=k*f.scale+x*2,O=H*f.scale+x*2,R=Math.min(x*.9,18),A=i.createLinearGradient(0,M,0,M+O);A.addColorStop(0,Ke),A.addColorStop(.4,Eo),A.addColorStop(1,Io),Ze(i,L,M,z,O,R),i.fillStyle=A,i.fill(),i.save(),Ze(i,L,M,z,O,R),i.clip(),i.globalAlpha=.07;for(let y=0;y<18;y++){const S=M+Math.random()*O;i.strokeStyle=y%2?Ke:"#3a2210",i.lineWidth=.5+Math.random()*1.2,i.beginPath(),i.moveTo(L,S),i.lineTo(L+z,S+(Math.random()-.5)*4),i.stroke()}i.globalAlpha=1,i.restore(),Xo(i,f,x),i.strokeStyle="rgba(0,0,0,0.55)",i.lineWidth=2,i.strokeRect(f.originX,f.originY,k*f.scale,H*f.scale),i.strokeStyle="rgba(255, 230, 200, 0.07)",i.lineWidth=1,i.strokeRect(f.originX-1,f.originY-1,k*f.scale+2,H*f.scale+2),i.fillStyle=zo,i.fillRect(f.originX,f.originY,k*f.scale,H*f.scale);const _=i.createRadialGradient(f.originX+k*f.scale/2,f.originY+H*f.scale/2,0,f.originX+k*f.scale/2,f.originY+H*f.scale/2,k*f.scale*.55);_.addColorStop(0,"rgba(255,255,255,0.02)"),_.addColorStop(.7,"rgba(0,0,0,0)"),_.addColorStop(1,"rgba(0,0,0,0.18)"),i.fillStyle=_,i.fillRect(f.originX,f.originY,k*f.scale,H*f.scale);const I=i.createLinearGradient(f.originX,f.originY,f.originX+k*f.scale,f.originY);I.addColorStop(0,"rgba(0,0,0,0.08)"),I.addColorStop(.5,_o),I.addColorStop(1,"rgba(0,0,0,0.08)"),i.fillStyle=I,i.fillRect(f.originX,f.originY,k*f.scale,H*f.scale);for(const y of qe){i.fillStyle=Fo,i.beginPath();for(let S=0;S<y.notch.length;S++){const[b,P]=f.toPx(y.notch[S][0],y.notch[S][1]);S===0?i.moveTo(b,P):i.lineTo(b,P)}i.closePath(),i.fill(),i.strokeStyle="rgba(0, 0, 0, 0.28)",i.lineWidth=1,i.stroke()}const[J,ie]=f.toPx(se,0);i.strokeStyle=Bo,i.lineWidth=1,i.beginPath(),i.moveTo(J,f.originY),i.lineTo(J,f.originY+H*f.scale),i.stroke(),i.beginPath(),i.arc(J,ie,he*f.scale,Math.PI/2,3*Math.PI/2,!1),i.stroke();const re=2;i.fillStyle=Ho;for(const y of[Te,Ne,ze,_e,me,Fe]){const[S,b]=f.toPx(y[0],y[1]);i.beginPath(),i.arc(S,b,re,0,Math.PI*2),i.fill()}for(const y of pt){const[S,b]=f.toPx(y.p1[0],y.p1[1]),[P,w]=f.toPx(y.p2[0],y.p2[1]);i.strokeStyle=Do,i.lineWidth=1.2,i.lineCap="round",i.beginPath(),i.moveTo(S,b),i.lineTo(P,w),i.stroke()}i.lineCap="butt";for(const y of qe){const[S,b]=f.toPx(y.holeCenter[0],y.holeCenter[1]),P=y.holeRadius*f.scale;i.fillStyle="rgba(0, 0, 0, 0.35)",i.beginPath(),i.arc(S,b,P+2,0,Math.PI*2),i.fill();const w=i.createRadialGradient(S-P*.25*y.openDir[0],b+P*.25*y.openDir[1],P*.1,S,b,P);w.addColorStop(0,"#1a1216"),w.addColorStop(.85,Ao),w.addColorStop(1,"#000"),i.fillStyle=w,i.beginPath(),i.arc(S,b,P,0,Math.PI*2),i.fill(),i.strokeStyle=Wo,i.lineWidth=1,i.stroke()}for(const y of e){if(!y.onTable)continue;const[S,b]=f.toPx(y.pos[0],y.pos[1]);i.fillStyle="rgba(0,0,0,0.35)",i.beginPath(),i.arc(S+1.5,b+2,g*.95,0,Math.PI*2),i.fill();const P=No[y.color],w=i.createRadialGradient(S-g*.35,b-g*.35,g*.1,S,b,g);w.addColorStop(0,Go(P,.4)),w.addColorStop(.5,P),w.addColorStop(1,Uo(P,.35)),i.fillStyle=w,i.beginPath(),i.arc(S,b,g,0,Math.PI*2),i.fill(),i.fillStyle="rgba(255,255,255,0.55)",i.beginPath(),i.arc(S-g*.35,b-g*.45,g*.18,0,Math.PI*2),i.fill()}if(t){const[y,S]=f.toPx(t.fromX,t.fromY),b=(.18+t.power*.45)*f.scale,P=t.dirX,w=-t.dirY;i.strokeStyle="rgba(241, 243, 248, 0.6)",i.lineWidth=1,i.setLineDash([4,5]),i.beginPath(),i.moveTo(y+P*g,S+w*g),i.lineTo(y+P*b,S+w*b),i.stroke(),i.setLineDash([]);const F=(.1+t.power*.28)*f.scale,X=.9*f.scale,ae=4,ve=8,te=y-P*(g+F),ne=S-w*(g+F),le=te-P*X,de=ne-w*X,oe=i.createLinearGradient(te,ne,le,de);oe.addColorStop(0,"#e0b485"),oe.addColorStop(.3,"#a76f3e"),oe.addColorStop(1,"#3a2716"),i.strokeStyle=oe,i.lineWidth=(ae+ve)/2,i.lineCap="round",i.beginPath(),i.moveTo(te,ne),i.lineTo(le,de),i.stroke(),i.fillStyle="#f3eee4",i.beginPath(),i.arc(te,ne,2.5,0,Math.PI*2),i.fill()}},[c,e,t,o,s]);const l=(p,i)=>{if(!p)return;const v=h.current;if(!v)return;const f=v.getBoundingClientRect(),g=i.clientX-f.left,x=i.clientY-f.top,L=Ve(f.width,f.height),[M,z]=L.toWorld(g,x);p(M,z)};return n("canvas",{ref:h,style:{width:o,height:s,display:"block",cursor:"crosshair"},onPointerMove:p=>l(r,p),onPointerDown:p=>l(a,p),onPointerUp:p=>l(u,p)})};function Ze(e,t,o,s,r,a){e.beginPath(),e.moveTo(t+a,o),e.lineTo(t+s-a,o),e.quadraticCurveTo(t+s,o,t+s,o+a),e.lineTo(t+s,o+r-a),e.quadraticCurveTo(t+s,o+r,t+s-a,o+r),e.lineTo(t+a,o+r),e.quadraticCurveTo(t,o+r,t,o+r-a),e.lineTo(t,o+a),e.quadraticCurveTo(t,o,t+a,o),e.closePath()}function Xo(e,t,o){const s=o*.5;for(let r=1;r<=7;r++){const a=k*r/8,[u]=t.toPx(a,0);pe(e,u,t.originY-s,3.2),pe(e,u,t.originY+H*t.scale+s,3.2)}for(let r=1;r<=3;r++){const a=H*(r/4-.5),[,u]=t.toPx(0,a);pe(e,t.originX-s,u,3.2),pe(e,t.originX+k*t.scale+s,u,3.2)}}function pe(e,t,o,s){e.save(),e.translate(t,o),e.rotate(Math.PI/4),e.fillStyle=Oo,e.fillRect(-s,-s,s*2,s*2),e.strokeStyle="rgba(0,0,0,0.35)",e.lineWidth=.5,e.strokeRect(-s,-s,s*2,s*2),e.restore()}function Go(e,t){const{r:o,g:s,b:r}=ft(e);return`rgb(${Math.round(o+(255-o)*t)}, ${Math.round(s+(255-s)*t)}, ${Math.round(r+(255-r)*t)})`}function Uo(e,t){const{r:o,g:s,b:r}=ft(e);return`rgb(${Math.round(o*(1-t))}, ${Math.round(s*(1-t))}, ${Math.round(r*(1-t))})`}function ft(e){const t=e.replace("#",""),o=parseInt(t,16);return{r:o>>16&255,g:o>>8&255,b:o&255}}const U={cue:0,red:1,yellow:2,green:3,brown:4,blue:5,pink:6,black:7},Je={scores:[0,0],currentPlayer:0,ballOn:"red",phase:"reds",redsRemaining:15,lastFoul:null,lastPotted:[],pendingRespot:[]},Se=["yellow","green","brown","blue","pink","black"];function Yo(e,t){e.lastPotted=[...t.pocketed],e.pendingRespot=[];const o=t.pocketed.includes("cue"),s=t.pocketed.filter(c=>c!=="cue"),r=e.ballOn;let a=null,u=4;if(o&&(a="Cue ball potted",u=Math.max(u,4)),t.firstHit===null?a=a??"No ball was struck":r==="red"&&t.firstHit!=="red"?(a=a??`Hit ${t.firstHit} first, expected red`,u=Math.max(u,U[t.firstHit])):r==="any-color"?t.firstHit==="red"&&(a=a??"Hit red, expected a colour"):r!=="red"&&t.firstHit!==r&&(a=a??`Hit ${t.firstHit} first, expected ${r}`,u=Math.max(u,U[t.firstHit])),a)for(const c of s)e.phase==="reds"?c!=="red"?u=Math.max(u,U[c]):u=Math.max(u,U.red):c!==r&&(u=Math.max(u,U[c]));if(!a){if(e.phase==="reds"){if(r==="red"){const c=s.filter(l=>l==="red").length,h=s.filter(l=>l!=="red");if(c===0&&h.length>0){a="Potted a colour while ball on red";for(const l of h)u=Math.max(u,U[l])}else{e.scores[e.currentPlayer]+=c*U.red,e.redsRemaining-=c,c>0&&(e.ballOn="any-color");for(const l of h)e.pendingRespot.push(l)}}else if(r==="any-color"){const c=s.filter(l=>l!=="red");if(s.filter(l=>l==="red").length>0)a="Red potted on a colour shot";else if(c.length>1){a="More than one colour potted";for(const l of c)u=Math.max(u,U[l])}else if(c.length===1){const l=c[0];e.scores[e.currentPlayer]+=U[l],e.pendingRespot.push(l)}a||(e.redsRemaining>0?e.ballOn="red":(e.phase="colors-sequence",e.ballOn="yellow"))}}else if(e.phase==="colors-sequence"){const c=r,h=s.filter(p=>p===c).length,l=s.filter(p=>p!==c);if(l.length>0){a=`Potted ${l.join(", ")} during ${c}`;for(const p of l)u=Math.max(u,U[p])}else if(h>0){e.scores[e.currentPlayer]+=U[c];const p=Se.indexOf(c);p===Se.length-1?(e.phase="frame-over",e.ballOn="red"):e.ballOn=Se[p+1]}}}if(a){const c=1-e.currentPlayer;e.scores[c]+=u,e.lastFoul=`${a} (${u} to opponent)`;for(const h of s)h!=="red"&&e.pendingRespot.push(h);e.currentPlayer=c}else e.lastFoul=null,s.length>0||(e.currentPlayer=1-e.currentPlayer,e.phase==="reds"&&(e.ballOn="red"));return e}const Qe=7.5,qo={cue:"cue",red:"red",yellow:"yellow",green:"green",brown:"brown",blue:"blue",pink:"pink",black:"black","any-color":"any colour"};function Ce(e){return{scores:[e.scores[0],e.scores[1]],currentPlayer:e.currentPlayer,ballOn:e.ballOn,phase:e.phase,redsRemaining:e.redsRemaining,lastFoul:e.lastFoul,lastPotted:[...e.lastPotted],pendingRespot:[...e.pendingRespot]}}const $o=({embedded:e=!1})=>{const[t,o]=m.useState(()=>Ce(Je)),[s,r]=m.useState(0),[a,u]=m.useState(.55),[c,h]=m.useState({y:0,z:0}),[l,p]=m.useState(!1),[i,v]=m.useState({w:800,h:410}),[f,g]=m.useState(0),x=m.useRef({balls:$e(),cushions:pt,pockets:ko}),L=m.useRef(null),M=m.useRef(null),z=m.useRef(null),O=m.useRef(null),R=x.current.balls.find(b=>b.color==="cue");m.useEffect(()=>{if(!M.current)return;const b=new ResizeObserver(P=>{for(const w of P){const F=w.contentRect.width,X=Math.min(F*.55,520);v({w:Math.max(380,F),h:Math.max(200,X)})}});return b.observe(M.current),()=>b.disconnect()},[]);const A=m.useCallback(b=>{z.current===null&&(z.current=b);const P=Math.min(.04,(b-z.current)/1e3);z.current=b;const w=Co();wo(x.current,P,w),w.firstHit&&!I.current.firstHit&&(I.current.firstHit=w.firstHit);for(const F of w.pocketed)I.current.pocketed.push(F);if(g(F=>F+1),Po(x.current.balls))O.current=requestAnimationFrame(A);else{const F={firstHit:I.current.firstHit,pocketed:I.current.pocketed.map(ae=>ae.color)},X=Ce(_.current);Yo(X,F),Zo(x.current.balls,X.pendingRespot,F.pocketed.includes("cue")),X.pendingRespot=[],_.current=X,o(X),p(!1),I.current={firstHit:null,pocketed:[]},z.current=null}},[]),_=m.useRef(t);m.useEffect(()=>{_.current=t},[t]);const I=m.useRef({firstHit:null,pocketed:[]});m.useEffect(()=>()=>{O.current&&cancelAnimationFrame(O.current)},[]);const J=()=>{if(l||!R)return;const b=a*Qe,P=[Math.cos(s),Math.sin(s)];mo(R,{speed:b,dir:P,yOffset:c.y,zOffset:c.z}),p(!0),I.current={firstHit:null,pocketed:[]},z.current=null,O.current=requestAnimationFrame(A)},ie=()=>{x.current.balls=$e();const b=Ce(Je);_.current=b,o(b),r(0),u(.55),h({y:0,z:0})},re=(b,P)=>{if(l||!R)return;const w=b-R.pos[0],F=P-R.pos[1];w*w+F*F<1e-6||r(Math.atan2(F,w))},y=qo[t.ballOn],S=m.useMemo(()=>R?{fromX:R.pos[0],fromY:R.pos[1],dirX:Math.cos(s),dirY:Math.sin(s),power:a}:null,[R,s,a]);return n("div",{ref:L,className:e?"relative w-full bg-ink-800 border border-ink-600/60 overflow-hidden":"relative w-full min-h-screen bg-ink-900",children:d("div",{className:"p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4",children:[d("div",{ref:M,className:"min-w-0",children:[n(jo,{balls:x.current.balls,cue:l?null:S,width:i.w,height:i.h,frame:f,onPointerMove:re}),d("div",{className:"mt-2 font-mono text-[10.5px] uppercase tracking-wider2 text-bone-600",children:["Drag the cursor around the table to aim. Click ",n("b",{className:"text-bone-200",children:"Shoot"})," to play."]})]}),d("aside",{className:"flex flex-col gap-5",children:[n(Ko,{game:t,ballOnLabel:y}),d(tt,{label:"Power",children:[n("input",{type:"range",min:0,max:1,step:.01,value:a,disabled:l,onChange:b=>u(parseFloat(b.target.value)),className:"w-full accent-ember-400"}),d("div",{className:"font-mono text-[11px] text-bone-400 mt-1",children:[(a*100).toFixed(0),"% · ",(a*Qe).toFixed(1)," m/s"]})]}),d(tt,{label:"Point of impact on the cue ball",children:[n(Vo,{value:c,onChange:h,disabled:l}),d("div",{className:"font-mono text-[10.5px] text-bone-600 mt-1.5",children:["vertical: ",c.z>0?"top":c.z<0?"back":"centre"," ·"," ","side: ",c.y>0?"left":c.y<0?"right":"centre"]})]}),d("div",{className:"flex gap-2",children:[n("button",{type:"button",onClick:J,disabled:l,className:"flex-1 px-4 py-2.5 font-mono text-[11px] tracking-wider2 uppercase border border-ember-500/60 text-ember-300 bg-ember-500/10 hover:bg-ember-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors",children:"Shoot"}),n("button",{type:"button",onClick:ie,disabled:l,className:"px-3 py-2.5 font-mono text-[11px] tracking-wider2 uppercase border border-ink-600 text-bone-400 hover:text-bone-50 hover:border-ink-600/80 transition-colors disabled:opacity-40",children:"New frame"})]})]})]})})};function Ko({game:e,ballOnLabel:t}){return d("div",{className:"border border-ink-600/60 bg-ink-800/40 p-4",children:[d("div",{className:"flex items-center justify-between gap-3",children:[n(et,{label:"Player 1",score:e.scores[0],active:e.currentPlayer===0}),n(et,{label:"Player 2",score:e.scores[1],active:e.currentPlayer===1})]}),n("div",{className:"mt-3 rule"}),d("div",{className:"mt-3 grid grid-cols-2 gap-2 font-mono text-[10.5px] uppercase tracking-wider2",children:[d("div",{children:[n("div",{className:"text-bone-600",children:"Ball on"}),n("div",{className:"text-bone-50",children:t})]}),d("div",{children:[n("div",{className:"text-bone-600",children:"Phase"}),d("div",{className:"text-bone-50",children:[e.phase==="reds"&&`${e.redsRemaining} reds left`,e.phase==="colors-sequence"&&"colours",e.phase==="frame-over"&&"frame over"]})]})]}),(e.lastFoul||e.lastPotted.length>0)&&n("div",{className:"mt-3 rule"}),e.lastFoul&&d("div",{className:"mt-3 text-[12px] text-ember-400 font-mono",children:["Foul: ",e.lastFoul]}),!e.lastFoul&&e.lastPotted.filter(o=>o!=="cue").length>0&&d("div",{className:"mt-3 text-[12px] text-bone-200 font-mono",children:["Potted: ",e.lastPotted.filter(o=>o!=="cue").join(", ")]})]})}function et({label:e,score:t,active:o}){return d("div",{className:"flex-1 "+(o?"":"opacity-50"),children:[n("div",{className:"font-mono text-[10px] uppercase tracking-wider2 text-bone-600",children:e}),n("div",{className:"font-display text-[1.8rem] leading-none mt-0.5 tracking-[-0.02em] "+(o?"text-ember-300":"text-bone-50"),children:t})]})}function tt({label:e,children:t}){return d("div",{children:[n("div",{className:"font-mono text-[10px] uppercase tracking-wider2 text-bone-400 mb-1.5",children:e}),t]})}function Vo({value:e,onChange:t,disabled:o}){const s=m.useRef(null),r=m.useRef(!1),a=(g,x)=>{const L=s.current;if(!L)return;const M=L.getBoundingClientRect(),z=(g-M.left)/M.width,O=(x-M.top)/M.height;let R=(.5-z)*2,A=(.5-O)*2;const _=Math.hypot(R,A);_>.95&&(R*=.95/_,A*=.95/_),t({y:R,z:A})},u=g=>{var x,L;o||(r.current=!0,(L=(x=g.target).setPointerCapture)==null||L.call(x,g.pointerId),a(g.clientX,g.clientY))},c=g=>{r.current&&a(g.clientX,g.clientY)},h=()=>{r.current=!1},l=96,p=l/2,i=l/2,v=p-e.y*(l/2-6),f=i-e.z*(l/2-6);return n("div",{ref:s,onPointerDown:u,onPointerMove:c,onPointerUp:h,style:{width:l,height:l},className:"relative select-none "+(o?"opacity-50":"cursor-crosshair"),children:d("svg",{width:l,height:l,children:[n("defs",{children:d("radialGradient",{id:"cue-ball-bg",cx:"40%",cy:"40%",r:"60%",children:[n("stop",{offset:"0%",stopColor:"#fefcf6"}),n("stop",{offset:"100%",stopColor:"#9c958a"})]})}),n("circle",{cx:p,cy:i,r:l/2-2,fill:"url(#cue-ball-bg)",stroke:"rgba(255,255,255,0.18)"}),n("line",{x1:p,y1:4,x2:p,y2:l-4,stroke:"rgba(0,0,0,0.18)",strokeWidth:.5}),n("line",{x1:4,y1:i,x2:l-4,y2:i,stroke:"rgba(0,0,0,0.18)",strokeWidth:.5}),n("circle",{cx:v,cy:f,r:5,fill:"#d99a4e",stroke:"#0a1220",strokeWidth:1.5})]})})}function Zo(e,t,o){const s=(r,a,u)=>{for(const c of e){if(!c.onTable||c.id===u)continue;const h=c.pos[0]-r,l=c.pos[1]-a;if(h*h+l*l<.0027562499999999996)return!0}return!1};for(const r of t){const a=e.find(h=>h.color===r&&!h.onTable);if(!a||!a.spot)continue;let[u,c]=a.spot;for(;s(u,c,a.id);)u+=2*.02625;a.pos[0]=u,a.pos[1]=c,a.vel[0]=0,a.vel[1]=0,a.spin[0]=0,a.spin[1]=0,a.spin[2]=0,a.onTable=!0}if(o){const r=e.find(a=>a.color==="cue");r&&(r.pos[0]=se-.16,r.pos[1]=0,r.vel[0]=0,r.vel[1]=0,r.spin[0]=0,r.spin[1]=0,r.spin[2]=0,r.onTable=!0)}}const Jo={title:"the physics of snooker",date:"2026-05-23",excerpt:"A playable snooker table backed by a real rigid-body solver. Adjustable cue power and impact point on the white ball. Walking through what controls spin, where it comes from, and why side English bends the ball.",tags:["snooker","billiards","rigid-body","physics"],draft:!0,hidden:!0};function nt(e){const t={h2:"h2",li:"li",p:"p",strong:"strong",ul:"ul",...G(),...e.components};return d(j,{children:[n(t.h2,{children:"Why snooker is a great physics demo"}),`
`,n(t.p,{children:`A snooker ball is a sphere on a felted slate. The physics is barely more
than Newtonian mechanics, but every detail of the game depends on getting
it right.`}),`
`,d(t.p,{children:["The cue ball is struck ",n(t.strong,{children:"once"}),`. Everything that follows is set by the
angle, the speed, and the `,n(t.strong,{children:"point of impact on the white"}),`: top spin,
back spin, side English, the deflection of the cue ball off an object
ball, the running side off a cushion.`]}),`
`,n(t.p,{children:`A struck ball doesn't just translate. It also spins, and the spin evolves
separately from the translation under friction with the cloth. A ball
can be moving forward but spinning backward, and that decides whether it
stops dead, draws back, or keeps rolling.`}),`
`,n(t.p,{children:`Ball-on-ball collisions are nearly elastic (restitution about 0.94).
Cushion bounces are less so (about 0.6). Spin transfers across these
contacts and it's what lets professional players bring the cue ball back
to a specific spot after the strike.`}),`
`,n(t.h2,{children:"The demo"}),`
`,d(t.p,{children:[`Drag the cursor on the table to aim. Use the power slider and the
point-of-impact selector to pick where the cue strikes the white. Then
click `,n(t.strong,{children:"Shoot"}),"."]}),`
`,n("div",{className:"not-prose my-10",children:n($o,{embedded:!0})}),`
`,n(t.p,{children:`The simulation runs a real rigid-body integrator: linear plus angular
velocity, sliding-to-rolling friction transition on the cloth, ball-ball
collisions with restitution, cushion bounces. Pockets are detected by
center proximity. Snooker rules are enforced: red-then-colour
alternation, ascending colour sequence once reds are exhausted, fouls
for cue-ball-pot, wrong-ball-first, and missed contact.`}),`
`,n(t.h2,{children:"What's still to write"}),`
`,d(t.ul,{children:[`
`,n(t.li,{children:"The state of a ball: position, velocity, angular velocity (3 spin axes)"}),`
`,n(t.li,{children:`Cue impact: how a single point of impact plus cue speed produces a
starting velocity and angular velocity on the white, including the
"squirt" (cue ball deflection from off-center contact)`}),`
`,n(t.li,{children:`The friction model: rolling vs sliding on cloth, and the time it takes
for a sliding ball to reach pure rolling`}),`
`,n(t.li,{children:`Ball-ball collision: normal impulse, tangential friction, spin transfer
(v1 simulation only models the normal impulse part)`}),`
`,n(t.li,{children:`Cushion bounce: angle of incidence is not the angle of reflection once
there's English on the ball`}),`
`,n(t.li,{children:`Numerical scheme: substepping when contacts cluster, avoiding
penetration drift`}),`
`]})]})}function Qo(e={}){const{wrapper:t}={...G(),...e.components};return t?n(t,{...e,children:n(nt,{...e})}):nt(e)}const es=Object.freeze(Object.defineProperty({__proto__:null,default:Qo,frontmatter:Jo},Symbol.toStringTag,{value:"Module"})),ts={title:"SPH fluid on the GPU",date:"2026-05-23",excerpt:"Smoothed-particle hydrodynamics in real-time with WebGPU , weakly compressible fluids, density estimation, pressure forces, and the surface visualisation problem.",tags:["SPH","fluid","WebGPU","physics"],draft:!0,hidden:!0};function ot(e){const t={h2:"h2",li:"li",p:"p",ul:"ul",...G(),...e.components};return d(j,{children:[n(t.h2,{children:"SPH in two paragraphs"}),`
`,n(t.p,{children:`Smoothed-particle hydrodynamics treats a fluid as a cloud of moving
sample points. Each point carries mass; density at any location is the
weighted sum of nearby particles' masses, where the weight is a smoothing
kernel. From density you get pressure (equation of state), and from
pressure gradients you get forces. Viscosity adds a velocity-diffusion
term. Integrate. Repeat.`}),`
`,n(t.p,{children:`It's a Lagrangian method, so free surfaces and splashes come for free ,
no mesh, no level set, no interface tracking. The trade-off is noise:
density estimates are noisy because particle distributions are.`}),`
`,n(t.p,{children:"To be covered:"}),`
`,d(t.ul,{children:[`
`,n(t.li,{children:`Weakly compressible vs incompressible SPH and why the former is fine
for visualisation`}),`
`,n(t.li,{children:"Cubic spline kernel and its derivative"}),`
`,n(t.li,{children:"Pressure with Tait's equation of state"}),`
`,n(t.li,{children:"Artificial viscosity vs proper viscous stress"}),`
`,n(t.li,{children:"Density-field marching cubes for surface rendering"}),`
`,n(t.li,{children:"Demo: dam break, droplet, double-dam break"}),`
`]})]})}function ns(e={}){const{wrapper:t}={...G(),...e.components};return t?n(t,{...e,children:n(ot,{...e})}):ot(e)}const os=Object.freeze(Object.defineProperty({__proto__:null,default:ns,frontmatter:ts},Symbol.toStringTag,{value:"Module"})),ss=Object.assign({"../content/blog/chess.mdx":Mn,"../content/blog/granular-dem.mdx":Tn,"../content/blog/microgen.mdx":Qn,"../content/blog/nbody.mdx":no,"../content/blog/snooker.mdx":es,"../content/blog/sph-fluid.mdx":os});function is(){return Object.entries(ss).map(([e,t])=>({slug:e.replace("../content/blog/","").replace(".mdx",""),...t.frontmatter,Component:t.default})).sort((e,t)=>new Date(t.date).getTime()-new Date(e.date).getTime())}function us(e){return is().find(o=>o.slug===e)||null}export{Pn as N,us as a,is as g};
