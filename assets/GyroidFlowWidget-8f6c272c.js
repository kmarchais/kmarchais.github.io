import{a as P,d as Pe,j as X,C as Be,P as Ye,O as Ae,F as Ue}from"./vendor-r3f-79d7e21d.js";import{r as m}from"./vendor-react-0f206cf5.js";import{I as ke,p as te,q as fe,r as Re,s as me,t as he,u as le,v as ze,e as Le,w as Ie,x as Ee,d as A,y as Ce,z as Oe,E as Ze,G as ge,J as ve,K as Xe,n as se,X as He,Y as Ve,Q as We,Z as Ne}from"./vendor-three-e4da4b44.js";const je=`
precision highp float;

// Attributes (from instanced buffer)
attribute vec4 instancePosition; // xyz = position, w = mass/size
attribute vec4 instanceVelocity; // xyz = velocity, w = unused

// Uniforms
uniform float uPointSize;
uniform float uMinSize;
uniform float uMaxSize;
uniform float uVelocityScale;
uniform int uColorMode; // 0 = solid, 1 = velocity magnitude, 2 = velocity direction (legacy)
uniform int uFieldType; // 0 = velocity mag, 1 = radius, 5 = gyroid channel
uniform int uColormap;  // 0 = viridis, 1 = plasma, 2 = turbo, 3 = coolwarm, 4 = rdylbu, 5 = editorial
uniform float uFieldMin; // Dynamic min for colormap normalization
uniform float uFieldMax; // Dynamic max for colormap normalization
uniform bool uColormapReversed; // Reverse colormap direction

// Gyroid parameters (for channel coloring)
uniform float uGyroidScale;
uniform float uGyroidYMin;
uniform float uGyroidYMax;

// Varyings
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;

// Colormap functions
vec3 viridis(float t) {
  const vec3 c0 = vec3(0.267004, 0.004874, 0.329415);
  const vec3 c1 = vec3(0.282327, 0.140926, 0.457517);
  const vec3 c2 = vec3(0.253935, 0.265254, 0.529983);
  const vec3 c3 = vec3(0.206756, 0.371758, 0.553117);
  const vec3 c4 = vec3(0.163625, 0.471133, 0.558148);
  const vec3 c5 = vec3(0.127568, 0.566949, 0.550556);
  const vec3 c6 = vec3(0.134692, 0.658636, 0.517649);
  const vec3 c7 = vec3(0.266941, 0.748751, 0.440573);
  const vec3 c8 = vec3(0.477504, 0.821444, 0.318195);
  const vec3 c9 = vec3(0.741388, 0.873449, 0.149561);
  const vec3 c10 = vec3(0.993248, 0.906157, 0.143936);

  float idx = t * 10.0;
  int i = int(floor(idx));
  float f = fract(idx);

  if (i >= 10) return c10;
  if (i <= 0) return c0;

  vec3 colors[11];
  colors[0] = c0; colors[1] = c1; colors[2] = c2; colors[3] = c3;
  colors[4] = c4; colors[5] = c5; colors[6] = c6; colors[7] = c7;
  colors[8] = c8; colors[9] = c9; colors[10] = c10;

  return mix(colors[i], colors[i + 1], f);
}

vec3 plasma(float t) {
  const vec3 c0 = vec3(0.050383, 0.029803, 0.527975);
  const vec3 c1 = vec3(0.254627, 0.013882, 0.615419);
  const vec3 c2 = vec3(0.417642, 0.000564, 0.653659);
  const vec3 c3 = vec3(0.562738, 0.051545, 0.641509);
  const vec3 c4 = vec3(0.692840, 0.165141, 0.564522);
  const vec3 c5 = vec3(0.798216, 0.280197, 0.469538);
  const vec3 c6 = vec3(0.881443, 0.392529, 0.383229);
  const vec3 c7 = vec3(0.949217, 0.517763, 0.295662);
  const vec3 c8 = vec3(0.988362, 0.652325, 0.211364);
  const vec3 c9 = vec3(0.988648, 0.809579, 0.145357);
  const vec3 c10 = vec3(0.940015, 0.975158, 0.131326);

  float idx = t * 10.0;
  int i = int(floor(idx));
  float f = fract(idx);

  if (i >= 10) return c10;
  if (i <= 0) return c0;

  vec3 colors[11];
  colors[0] = c0; colors[1] = c1; colors[2] = c2; colors[3] = c3;
  colors[4] = c4; colors[5] = c5; colors[6] = c6; colors[7] = c7;
  colors[8] = c8; colors[9] = c9; colors[10] = c10;

  return mix(colors[i], colors[i + 1], f);
}

vec3 turbo(float t) {
  const vec3 c0 = vec3(0.18995, 0.07176, 0.23217);
  const vec3 c1 = vec3(0.25107, 0.25237, 0.63374);
  const vec3 c2 = vec3(0.27628, 0.42118, 0.81865);
  const vec3 c3 = vec3(0.18995, 0.58039, 0.82637);
  const vec3 c4 = vec3(0.12386, 0.71191, 0.69672);
  const vec3 c5 = vec3(0.23666, 0.82178, 0.52243);
  const vec3 c6 = vec3(0.49298, 0.90098, 0.33243);
  const vec3 c7 = vec3(0.75549, 0.93824, 0.21471);
  const vec3 c8 = vec3(0.95016, 0.87866, 0.28623);
  const vec3 c9 = vec3(0.99324, 0.70676, 0.19837);
  const vec3 c10 = vec3(0.96043, 0.41317, 0.05629);

  float idx = t * 10.0;
  int i = int(floor(idx));
  float f = fract(idx);

  if (i >= 10) return c10;
  if (i <= 0) return c0;

  vec3 colors[11];
  colors[0] = c0; colors[1] = c1; colors[2] = c2; colors[3] = c3;
  colors[4] = c4; colors[5] = c5; colors[6] = c6; colors[7] = c7;
  colors[8] = c8; colors[9] = c9; colors[10] = c10;

  return mix(colors[i], colors[i + 1], f);
}

vec3 coolwarm(float t) {
  // Blue to white to red
  vec3 cool = vec3(0.2298, 0.2987, 0.7537);
  vec3 mid = vec3(0.865, 0.865, 0.865);
  vec3 warm = vec3(0.7059, 0.0157, 0.1490);

  if (t < 0.5) {
    return mix(cool, mid, t * 2.0);
  } else {
    return mix(mid, warm, (t - 0.5) * 2.0);
  }
}

vec3 rdylbu(float t) {
  // RdYlBu diverging colormap: Red -> Yellow -> Blue
  const vec3 c0 = vec3(0.647, 0.0, 0.149);       // Dark red
  const vec3 c1 = vec3(0.843, 0.188, 0.153);     // Red
  const vec3 c2 = vec3(0.957, 0.427, 0.263);     // Red-orange
  const vec3 c3 = vec3(0.992, 0.682, 0.380);     // Orange
  const vec3 c4 = vec3(0.996, 0.878, 0.565);     // Light orange
  const vec3 c5 = vec3(1.0, 1.0, 0.749);         // Yellow/cream
  const vec3 c6 = vec3(0.878, 0.953, 0.973);     // Pale cyan
  const vec3 c7 = vec3(0.671, 0.851, 0.914);     // Very light blue
  const vec3 c8 = vec3(0.455, 0.678, 0.820);     // Light blue
  const vec3 c9 = vec3(0.271, 0.459, 0.706);     // Medium blue
  const vec3 c10 = vec3(0.192, 0.212, 0.584);    // Dark blue

  float idx = t * 10.0;
  int i = int(floor(idx));
  float f = fract(idx);

  if (i >= 10) return c10;
  if (i <= 0) return c0;

  vec3 colors[11];
  colors[0] = c0; colors[1] = c1; colors[2] = c2; colors[3] = c3;
  colors[4] = c4; colors[5] = c5; colors[6] = c6; colors[7] = c7;
  colors[8] = c8; colors[9] = c9; colors[10] = c10;

  return mix(colors[i], colors[i + 1], f);
}

// Editorial diverging colormap matching the site palette:
// cool slate-blue ↔ warm bone ↔ ember amber. Symmetric around 0.5.
vec3 editorial(float t) {
  vec3 cool = vec3(0.43, 0.64, 0.77);   // #6da3c4 (cool slate)
  vec3 mid  = vec3(0.83, 0.86, 0.91);   // #d4dbe8 (warm bone)
  vec3 warm = vec3(0.91, 0.69, 0.41);   // #e8b06a (ember)

  if (t < 0.5) {
    return mix(cool, mid, t * 2.0);
  } else {
    return mix(mid, warm, (t - 0.5) * 2.0);
  }
}

// Apply colormap based on uniform selection
vec3 applyColormap(float t, int colormap) {
  if (colormap == 0) return viridis(t);
  if (colormap == 1) return plasma(t);
  if (colormap == 2) return turbo(t);
  if (colormap == 3) return coolwarm(t);
  if (colormap == 4) return rdylbu(t);
  if (colormap == 5) return editorial(t);
  return viridis(t); // default
}

// Gyroid SDF function for channel coloring
// G(x,y,z) = sin(x)cos(y) + sin(y)cos(z) + sin(z)cos(x)
float gyroidSDF(vec3 p, float scale) {
  vec3 sp = p * scale;
  return sin(sp.x) * cos(sp.y) + sin(sp.y) * cos(sp.z) + sin(sp.z) * cos(sp.x);
}

void main() {
  // Get particle position and velocity
  vec3 pos = instancePosition.xyz;
  float radius = instancePosition.w;  // Per-particle radius stored in w
  vec3 vel = instanceVelocity.xyz;
  float speed = length(vel);

  // Calculate point size from per-particle radius
  // uPointSize acts as a scale factor (1.0 = true size)
  float size = radius * uPointSize;
  size = clamp(size, uMinSize, uMaxSize);

  // UV coordinates for quad corners
  // position attribute contains quad corner offset (-1 to 1)
  vUv = position.xy;

  // Billboard: offset in screen space
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  mvPosition.xy += position.xy * size;

  gl_Position = projectionMatrix * mvPosition;

  // Get raw field value based on field type
  float rawFieldValue = 0.0;
  if (uFieldType == 0) {
    // Velocity magnitude
    rawFieldValue = speed;
  } else if (uFieldType == 1) {
    // Radius
    rawFieldValue = radius;
  } else if (uFieldType == 5) {
    // Gyroid channel: stored in velocity.w by the simulation shader
    // 0.0 = negative channel, 1.0 = positive channel, 0.5 = neutral (not yet assigned)
    rawFieldValue = instanceVelocity.w;
  }

  // Normalize using dynamic min/max range
  float fieldRange = uFieldMax - uFieldMin;
  float fieldValue = 0.0;
  if (fieldRange > 0.0001) {
    fieldValue = (rawFieldValue - uFieldMin) / fieldRange;
  }
  fieldValue = clamp(fieldValue, 0.0, 1.0);

  // Reverse colormap if requested
  if (uColormapReversed) {
    fieldValue = 1.0 - fieldValue;
  }

  // Color based on mode (legacy support) or new field/colormap system
  if (uColorMode == 0) {
    // Solid color (white, will be modulated by uniform)
    vColor = vec3(1.0);
  } else if (uColorMode == 2) {
    // Velocity direction (RGB from XYZ) - special case
    vColor = normalize(vel) * 0.5 + 0.5;
  } else {
    // Use new field + colormap system
    vColor = applyColormap(fieldValue, uColormap);
  }

  vAlpha = 1.0;
}
`,qe=`
precision highp float;

// Uniforms
uniform float uGaussianSigma;
uniform float uMinAlpha;
uniform int uBlendMode; // 0 = soft splat (alpha), 1 = additive, 2 = sphere
uniform float uBrightness;
uniform vec3 uBaseColor;
uniform vec3 uLightDir; // Light direction for sphere mode

// Varyings
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;

void main() {
  // Distance from center
  float r2 = dot(vUv, vUv);

  // Discard outside unit circle
  if (r2 > 1.0) {
    discard;
  }

  vec3 color = vColor * uBaseColor;

  if (uBlendMode == 2) {
    // Sphere shading mode (like ParaView)
    // Compute sphere normal from UV (z = sqrt(1 - x^2 - y^2))
    float z = sqrt(1.0 - r2);
    vec3 normal = vec3(vUv, z);

    // Lighting calculation
    vec3 lightDir = normalize(uLightDir);

    // Ambient
    float ambient = 0.3;

    // Diffuse (Lambertian)
    float diffuse = max(dot(normal, lightDir), 0.0);

    // Specular (Blinn-Phong)
    vec3 viewDir = vec3(0.0, 0.0, 1.0); // View is along Z in view space
    vec3 halfDir = normalize(lightDir + viewDir);
    float specular = pow(max(dot(normal, halfDir), 0.0), 32.0);

    // Combine lighting
    float lighting = ambient + 0.6 * diffuse + 0.3 * specular;
    color *= lighting * uBrightness;

    gl_FragColor = vec4(color, 1.0);
  } else if (uBlendMode == 0) {
    // Soft splat: Gaussian with alpha
    float sigma2 = uGaussianSigma * uGaussianSigma;
    float gaussian = exp(-r2 / (2.0 * sigma2));

    color *= uBrightness;
    float alpha = gaussian * vAlpha;
    if (alpha < uMinAlpha) {
      discard;
    }
    gl_FragColor = vec4(color, alpha);
  } else {
    // Additive: Gaussian modulates intensity
    float sigma2 = uGaussianSigma * uGaussianSigma;
    float gaussian = exp(-r2 / (2.0 * sigma2));

    color *= gaussian * uBrightness;
    gl_FragColor = vec4(color, 1.0);
  }
}
`,Ke={pointSize:.1,minSize:.01,maxSize:1,velocityScale:.1,colorMode:1,fieldType:0,colormap:4,colormapReversed:!1,fieldMin:0,fieldMax:1,gaussianSigma:.4,minAlpha:.01,blendMode:2,brightness:1,baseColor:[1,1,1],lightDir:[.5,.7,1],gyroidScale:2*Math.PI,gyroidYMin:2,gyroidYMax:4},$e=m.memo(function({positions:t,velocities:o,particleCount:a,config:d={}}){const v=m.useRef(null),h=m.useRef(null),c=m.useRef(null),r=m.useMemo(()=>({...Ke,...d}),[d]),u=m.useMemo(()=>{const s=new ke,p=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,1,1,0]),g=new Uint16Array([0,1,2,1,3,2]);s.setAttribute("position",new te(p,3)),s.setIndex(new te(g,1));const y=new Float32Array(a*4),M=new Float32Array(a*4);for(let C=0;C<a;C++)y[C*4+3]=1;const z=new fe(y,4),S=new fe(M,4);return z.setUsage(35048),S.setUsage(35048),s.setAttribute("instancePosition",z),s.setAttribute("instanceVelocity",S),s.instanceCount=a,s},[a]),f=m.useMemo(()=>new Re({uniforms:{uPointSize:{value:r.pointSize},uMinSize:{value:r.minSize},uMaxSize:{value:r.maxSize},uVelocityScale:{value:r.velocityScale},uColorMode:{value:r.colorMode},uFieldType:{value:r.fieldType},uColormap:{value:r.colormap},uColormapReversed:{value:r.colormapReversed??!1},uFieldMin:{value:r.fieldMin},uFieldMax:{value:r.fieldMax},uGaussianSigma:{value:r.gaussianSigma},uMinAlpha:{value:r.minAlpha},uBlendMode:{value:r.blendMode},uBrightness:{value:r.brightness},uBaseColor:{value:r.baseColor},uLightDir:{value:r.lightDir||[.5,.7,1]},uGyroidScale:{value:r.gyroidScale??2*Math.PI},uGyroidYMin:{value:r.gyroidYMin??2},uGyroidYMax:{value:r.gyroidYMax??4}},vertexShader:je,fragmentShader:qe,transparent:!0,depthWrite:r.blendMode!==1,blending:r.blendMode===1?me:he,side:le}),[r]);return m.useEffect(()=>{h.current=u},[u]),m.useEffect(()=>{c.current=f},[f]),m.useEffect(()=>{if(!h.current)return;const s=h.current.getAttribute("instancePosition"),p=h.current.getAttribute("instanceVelocity");if(t&&s){const g=s.array,y=Math.min(t.length,g.length);g.set(t.subarray(0,y)),s.needsUpdate=!0}if(o&&p){const g=p.array,y=Math.min(o.length,g.length);g.set(o.subarray(0,y)),p.needsUpdate=!0}},[t,o]),m.useEffect(()=>{if(!c.current)return;const s=c.current.uniforms;s.uPointSize.value=r.pointSize,s.uMinSize.value=r.minSize,s.uMaxSize.value=r.maxSize,s.uVelocityScale.value=r.velocityScale,s.uColorMode.value=r.colorMode,s.uFieldType.value=r.fieldType,s.uColormap.value=r.colormap,s.uColormapReversed.value=r.colormapReversed??!1,s.uFieldMin.value=r.fieldMin,s.uFieldMax.value=r.fieldMax,s.uGaussianSigma.value=r.gaussianSigma,s.uMinAlpha.value=r.minAlpha,s.uBlendMode.value=r.blendMode,s.uBrightness.value=r.brightness,s.uBaseColor.value=r.baseColor,s.uLightDir.value=r.lightDir||[.5,.7,1],s.uGyroidScale.value=r.gyroidScale??2*Math.PI,s.uGyroidYMin.value=r.gyroidYMin??2,s.uGyroidYMax.value=r.gyroidYMax??4,c.current.blending=r.blendMode===1?me:he,c.current.depthWrite=r.blendMode!==1,c.current.needsUpdate=!0},[r]),P("mesh",{ref:v,geometry:u,material:f,frustumCulled:!1})});function Qe(){return typeof navigator<"u"&&"gpu"in navigator}async function Je(){if(!Qe())return null;try{const e=await navigator.gpu.requestAdapter();if(!e)return null;const t=e.limits,o={};return t.maxStorageBuffersPerShaderStage>=10&&(o.maxStorageBuffersPerShaderStage=10),await e.requestDevice({requiredLimits:o})}catch{return null}}const et=32;function tt(e,t=4){return Math.ceil(e/t)*t}function at(e,t,o){const d=t*16,v=t*16,h=t*16,c=e.createBuffer({size:d,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,label:"positions_A"}),r=e.createBuffer({size:d,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,label:"positions_B"}),u=e.createBuffer({size:v,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,label:"velocities_A"}),f=e.createBuffer({size:v,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,label:"velocities_B"}),s=e.createBuffer({size:h,usage:GPUBufferUsage.STORAGE,label:"forces"}),p=e.createBuffer({size:d,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST,label:"staging_positions"}),g=e.createBuffer({size:v,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST,label:"staging_velocities"}),y=e.createBuffer({size:tt(o,16),usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"simulation_params"});return{positionsA:c,positionsB:r,velocitiesA:u,velocitiesB:f,forces:s,stagingPositions:p,stagingVelocities:g,params:y,particleCount:t}}function it(e,t,o){const a=o[0]*o[1]*o[2],d=e.createBuffer({size:t*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"cell_indices"}),v=e.createBuffer({size:a*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC,label:"cell_counts"}),h=e.createBuffer({size:(a+1)*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"cell_offsets"}),c=e.createBuffer({size:t*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"sorted_indices"}),r=e.createBuffer({size:a*et*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"cell_particles"});return{cellIndices:d,cellCounts:v,cellOffsets:h,sortedIndices:c,numCells:a,cellParticles:r}}function ye(e,t,o,a){e.queue.writeBuffer(t.positionsA,0,o.buffer.slice(o.byteOffset,o.byteOffset+o.byteLength)),e.queue.writeBuffer(t.positionsB,0,o.buffer.slice(o.byteOffset,o.byteOffset+o.byteLength)),e.queue.writeBuffer(t.velocitiesA,0,a.buffer.slice(a.byteOffset,a.byteOffset+a.byteLength)),e.queue.writeBuffer(t.velocitiesB,0,a.buffer.slice(a.byteOffset,a.byteOffset+a.byteLength))}function rt(e){e.positionsA.destroy(),e.positionsB.destroy(),e.velocitiesA.destroy(),e.velocitiesB.destroy(),e.forces.destroy(),e.stagingPositions.destroy(),e.stagingVelocities.destroy(),e.params.destroy()}function st(e){e.cellIndices.destroy(),e.cellCounts.destroy(),e.cellOffsets.destroy(),e.sortedIndices.destroy(),e.cellParticles&&e.cellParticles.destroy()}function xe(e,t,o,a){return e.createBindGroup({layout:t,entries:o.map(d=>({binding:d.binding,resource:d.resource})),label:a})}function _e(e){return{binding:e,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}}function oe(e){return{binding:e,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}}}function ue(e){return{binding:e,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}}}function Me(e,t=256){return Math.ceil(e/t)}const Fe=256,Te=160;function ot(e){const t=new ArrayBuffer(Te),o=new Uint32Array(t),a=new Float32Array(t);return o[0]=e.particleCount,a[1]=e.radius,a[2]=e.kn,a[3]=e.kt,a[4]=e.dampingN,a[5]=e.dampingT,a[6]=e.friction,a[7]=e.restitution,a[8]=e.gravity[0],a[9]=e.gravity[1],a[10]=e.gravity[2],a[11]=e.dt,a[12]=e.hourglassRadiusTop,a[13]=e.hourglassYMin,a[14]=e.hourglassYMax,a[15]=e.spawnXMin,a[16]=e.spawnXMax,a[17]=e.spawnYMin,a[18]=e.spawnYMax,a[19]=e.spawnZMin,a[20]=e.spawnZMax,a[21]=e.respawnYThreshold,o[22]=e.seed,a[23]=e.hourglassRadiusWaist,a[24]=e.topCapEnabled,a[25]=e.geometryType,a[26]=e.gyroidScale,a[27]=e.gyroidThreshold,a[28]=(e.hourglassYMax-e.hourglassYMin)/6,a[29]=e.helixPitch??.35,a[30]=e.helixRadius??.4,a[31]=e.helixShaftRadius??.08,a[32]=e.helixThickness??.05,a[33]=e.stadiumMajorRadius??.5,a[34]=e.stadiumStraightLength??1,a[35]=e.stadiumTubeRadius??.5,t}const nt=`
const WORKGROUP_SIZE: u32 = ${Fe}u;

struct GyroidFlowParams {
  particleCount: u32,
  radius: f32,
  kn: f32,
  kt: f32,
  dampingN: f32,
  dampingT: f32,
  friction: f32,
  restitution: f32,
  gravity: vec3f,
  dt: f32,
  hourglassRadiusTop: f32,
  hourglassYMin: f32,
  hourglassYMax: f32,
  spawnXMin: f32,
  spawnXMax: f32,
  spawnYMin: f32,
  spawnYMax: f32,
  spawnZMin: f32,
  spawnZMax: f32,
  respawnYThreshold: f32,
  seed: u32,
  hourglassRadiusWaist: f32,
  topCapEnabled: f32,
  geometryType: f32,
  gyroidScale: f32,
  gyroidThreshold: f32,
  boxHalfSize: f32,
  // Helix+Stadium parameters (geometryType = 2)
  helixPitch: f32,
  helixRadius: f32,
  helixShaftRadius: f32,
  helixThickness: f32,
  stadiumMajorRadius: f32,
  stadiumStraightLength: f32,
  stadiumTubeRadius: f32,
}

struct SpatialHashParams {
  particleCount: u32,
  gridDimX: u32,
  gridDimY: u32,
  gridDimZ: u32,
  cellSize: f32,
  gridMinX: f32,
  gridMinY: f32,
  gridMinZ: f32,
}

@group(0) @binding(0) var<uniform> params: GyroidFlowParams;
@group(0) @binding(1) var<storage, read> positions_in: array<vec4f>;
@group(0) @binding(2) var<storage, read> velocities_in: array<vec4f>;
@group(0) @binding(3) var<storage, read_write> positions_out: array<vec4f>;
@group(0) @binding(4) var<storage, read_write> velocities_out: array<vec4f>;
@group(0) @binding(5) var<storage, read_write> forces: array<vec4f>;

const MAX_PARTICLES_PER_CELL: u32 = 32u;

@group(1) @binding(0) var<uniform> hashParams: SpatialHashParams;
@group(1) @binding(1) var<storage, read> cellCounts: array<u32>;
@group(1) @binding(2) var<storage, read> cellParticles: array<u32>;

fn positionToCell(pos: vec3f) -> vec3u {
  let gridMin = vec3f(hashParams.gridMinX, hashParams.gridMinY, hashParams.gridMinZ);
  let localPos = pos - gridMin;
  // Clamp as floats BEFORE converting to u32 to avoid wraparound issues
  let cellCoordF = floor(localPos / hashParams.cellSize);
  let maxCell = vec3f(
    f32(hashParams.gridDimX - 1u),
    f32(hashParams.gridDimY - 1u),
    f32(hashParams.gridDimZ - 1u)
  );
  let clampedF = clamp(cellCoordF, vec3f(0.0), maxCell);
  return vec3u(clampedF);
}

fn cellToIndex(cell: vec3u) -> u32 {
  return cell.x + cell.y * hashParams.gridDimX + cell.z * hashParams.gridDimX * hashParams.gridDimY;
}

/**
 * Wrap a coordinate to stay within [-halfSize, halfSize]
 * Simple if-else version to avoid floating point edge cases
 */
fn wrapCoord(x: f32, halfSize: f32) -> f32 {
  let size = halfSize * 2.0;
  var result = x;
  // Use while loops to handle multiple wraps (shouldn't happen normally)
  if (result > halfSize) {
    result = result - size;
  }
  if (result < -halfSize) {
    result = result + size;
  }
  return result;
}

/**
 * Compute minimum image distance for periodic boundaries in X and Z
 * Returns the delta vector adjusted for periodic boundaries
 */
fn periodicDelta(delta: vec3f, halfSize: f32) -> vec3f {
  let size = halfSize * 2.0;
  var dx = delta.x;
  var dz = delta.z;

  if (dx > halfSize) { dx = dx - size; }
  else if (dx < -halfSize) { dx = dx + size; }

  if (dz > halfSize) { dz = dz - size; }
  else if (dz < -halfSize) { dz = dz + size; }

  return vec3f(dx, delta.y, dz);
}

/**
 * Hourglass radius at a given height (quadratic profile)
 * Wide at top/bottom, narrow at waist (center)
 * r(y) = waist + (top - waist) * yNorm^2
 */
fn hourglassRadius(y: f32) -> f32 {
  let height = params.hourglassYMax - params.hourglassYMin;
  let yCenter = params.hourglassYMin + height * 0.5;
  let yNorm = clamp((y - yCenter) / (height * 0.5), -1.0, 1.0);
  return params.hourglassRadiusWaist + (params.hourglassRadiusTop - params.hourglassRadiusWaist) * yNorm * yNorm;
}

/**
 * Derivative of hourglass radius with respect to y
 * dr/dy = (top - waist) * 2 * yNorm / halfHeight
 */
fn hourglassRadiusDerivative(y: f32) -> f32 {
  let height = params.hourglassYMax - params.hourglassYMin;
  let halfHeight = height * 0.5;
  let yCenter = params.hourglassYMin + halfHeight;
  let yNorm = clamp((y - yCenter) / halfHeight, -1.0, 1.0);
  return (params.hourglassRadiusTop - params.hourglassRadiusWaist) * 2.0 * yNorm / halfHeight;
}

/**
 * Gyroid implicit function: G(x,y,z) = sin(x)cos(y) + sin(y)cos(z) + sin(z)cos(x)
 */
fn gyroidImplicit(pos: vec3f, scale: f32) -> f32 {
  let p = pos * scale;
  return sin(p.x) * cos(p.y) + sin(p.y) * cos(p.z) + sin(p.z) * cos(p.x);
}

/**
 * Gyroid implicit function gradient
 */
fn gyroidImplicitGradient(pos: vec3f, scale: f32) -> vec3f {
  let p = pos * scale;
  let gx = cos(p.x) * cos(p.y) - sin(p.z) * sin(p.x);
  let gy = -sin(p.x) * sin(p.y) + cos(p.y) * cos(p.z);
  let gz = -sin(p.y) * sin(p.z) + cos(p.z) * cos(p.x);
  return vec3f(gx, gy, gz) * scale;
}

/**
 * Approximate SDF to the thick-walled gyroid VOLUME
 * Wall exists where |G| <= wallThickness (same as marching cubes visualization)
 * Channel (void) exists where |G| > wallThickness
 *
 * Uses first-order approximation: distance ≈ (|G| - t) / |∇G|
 * Returns: negative inside wall, positive in channel
 */
fn gyroidVolumeSDF(pos: vec3f, scale: f32, wallThickness: f32) -> f32 {
  let g = gyroidImplicit(pos, scale);
  let grad = gyroidImplicitGradient(pos, scale);
  let gradLen = length(grad);

  if (gradLen < 0.001) {
    // At a saddle point, use raw value
    return abs(g) - wallThickness;
  }

  // Approximate distance to wall boundary (|G| = wallThickness)
  return (abs(g) - wallThickness) / gradLen;
}

/**
 * Stadium torus SDF (Inigo Quilez sdLink formula)
 * A torus with a stretched straight section - perfect for a capsule-shaped ring
 *
 * @param p - Point to evaluate
 * @param le - Half-length of the straight section
 * @param r1 - Major radius (radius of the ring)
 * @param r2 - Minor radius (tube thickness)
 */
fn sdLink(p: vec3f, le: f32, r1: f32, r2: f32) -> f32 {
  // For stadium torus oriented along Y axis:
  // - le is half the straight length
  // - r1 is the major radius (XZ plane)
  // - r2 is the tube radius
  let q = vec3f(p.x, max(abs(p.y) - le, 0.0), p.z);
  return length(vec2f(length(q.xz) - r1, q.y)) - r2;
}

/**
 * Stadium torus gradient for normal calculation
 */
fn sdLinkGradient(p: vec3f, le: f32, r1: f32, r2: f32) -> vec3f {
  let eps = 0.001;
  let dx = sdLink(p + vec3f(eps, 0.0, 0.0), le, r1, r2) - sdLink(p - vec3f(eps, 0.0, 0.0), le, r1, r2);
  let dy = sdLink(p + vec3f(0.0, eps, 0.0), le, r1, r2) - sdLink(p - vec3f(0.0, eps, 0.0), le, r1, r2);
  let dz = sdLink(p + vec3f(0.0, 0.0, eps), le, r1, r2) - sdLink(p - vec3f(0.0, 0.0, eps), le, r1, r2);
  return normalize(vec3f(dx, dy, dz));
}

/**
 * Helix SDF using derivative-based closest point search
 * Based on Shadertoy approach - searches for closest point on helix curve
 *
 * The helix is parameterized as:
 *   x(t) = R * cos(t)
 *   z(t) = R * sin(t)
 *   y(t) = pitch * t / (2π)
 *
 * @param p - Point to evaluate (in helix local space, helix along Y axis)
 * @param R - Helix outer radius
 * @param pitch - Vertical distance per revolution
 * @param shaftR - Shaft (inner) radius
 * @param thickness - Blade half-thickness
 */
fn helixSDF(p: vec3f, R: f32, pitch: f32, shaftR: f32, thickness: f32) -> f32 {
  let PI = 3.14159265359;
  let TAU = 6.28318530718;

  // Helix pitch factor: y = pitch * t / TAU, so t = y * TAU / pitch
  let k = pitch / TAU;  // dy/dt

  // Initial guess for parameter t based on angle and height
  let angle = atan2(p.z, p.x);  // Range: [-π, π]
  let tFromAngle = angle;
  let tFromY = p.y / k;

  // Search across multiple periods to find closest point
  var minDist = 1e10;

  // Search in a window around the expected t value
  let numPeriods = 3;  // Search ±3 periods

  for (var period = -numPeriods; period <= numPeriods; period++) {
    // Start with angle-based guess plus period offset
    var t = tFromAngle + f32(period) * TAU;

    // Newton-Raphson iterations to find closest point on helix
    for (var iter = 0; iter < 5; iter++) {
      // Point on helix at parameter t
      let hx = R * cos(t);
      let hz = R * sin(t);
      let hy = k * t;

      // Vector from helix point to query point
      let dx = p.x - hx;
      let dy = p.y - hy;
      let dz = p.z - hz;

      // Helix tangent at t: d/dt (R*cos(t), k*t, R*sin(t)) = (-R*sin(t), k, R*cos(t))
      let tx = -R * sin(t);
      let ty = k;
      let tz = R * cos(t);

      // Project delta onto tangent to find correction
      let dot_delta_tangent = dx * tx + dy * ty + dz * tz;
      let tangent_len_sq = tx * tx + ty * ty + tz * tz;

      if (tangent_len_sq < 1e-10) { break; }

      // Newton step
      let dt = dot_delta_tangent / tangent_len_sq;
      t = t + dt;

      // Early exit if converged
      if (abs(dt) < 0.001) { break; }
    }

    // Compute final distance to helix curve at converged t
    let hx = R * cos(t);
    let hz = R * sin(t);
    let hy = k * t;

    let dist = length(vec3f(p.x - hx, p.y - hy, p.z - hz));
    minDist = min(minDist, dist);
  }

  // Distance to helicoid blade = distance to helix curve - thickness
  let bladeDist = minDist - thickness;

  // Distance to central shaft (cylinder along Y)
  let shaftDist = length(p.xz) - shaftR;

  // Union of blade and shaft
  return min(bladeDist, shaftDist);
}

/**
 * Helix SDF gradient for normal calculation
 */
fn helixSDFGradient(p: vec3f, R: f32, pitch: f32, shaftR: f32, thickness: f32) -> vec3f {
  let eps = 0.001;
  let dx = helixSDF(p + vec3f(eps, 0.0, 0.0), R, pitch, shaftR, thickness)
         - helixSDF(p - vec3f(eps, 0.0, 0.0), R, pitch, shaftR, thickness);
  let dy = helixSDF(p + vec3f(0.0, eps, 0.0), R, pitch, shaftR, thickness)
         - helixSDF(p - vec3f(0.0, eps, 0.0), R, pitch, shaftR, thickness);
  let dz = helixSDF(p + vec3f(0.0, 0.0, eps), R, pitch, shaftR, thickness)
         - helixSDF(p - vec3f(0.0, 0.0, eps), R, pitch, shaftR, thickness);
  let grad = vec3f(dx, dy, dz);
  let len = length(grad);
  if (len < 1e-6) {
    return vec3f(0.0, 1.0, 0.0);
  }
  return grad / len;
}

/**
 * Helix + Stadium Torus boundary force
 * - Stadium torus acts as outer container (particles inside)
 * - Helix acts as obstacle (particles outside)
 *
 * Helix is positioned along the straight section of the stadium torus
 */
fn helixStadiumBoundaryForce(pos: vec3f, vel: vec3f, radius: f32) -> vec3f {
  var force = vec3f(0.0);

  // Stadium torus parameters (oriented along Y axis, centered at origin)
  let stadiumR1 = params.stadiumMajorRadius;
  let stadiumLe = params.stadiumStraightLength;
  let stadiumR2 = params.stadiumTubeRadius;

  // Helix parameters
  let helixR = params.helixRadius;
  let helixPitch = params.helixPitch;
  let helixShaftR = params.helixShaftRadius;
  let helixThick = params.helixThickness;

  // === Stadium Torus (outer container) ===
  // Particles should be INSIDE the torus (negative SDF)
  let stadiumDist = sdLink(pos, stadiumLe, stadiumR1, stadiumR2);
  let penetrationStadium = stadiumDist + radius;  // Positive when particle penetrates wall

  if (penetrationStadium > 0.0) {
    // Particle is penetrating the stadium torus wall
    let n = sdLinkGradient(pos, stadiumLe, stadiumR1, stadiumR2);
    let v_n_scalar = dot(vel, n);

    let F_spring = params.kn * penetrationStadium;
    let F_damp = params.dampingN * max(v_n_scalar, 0.0);  // Damp when moving outward
    let F_n_mag = F_spring + F_damp;

    // Push inward (opposite to gradient which points outward)
    force -= F_n_mag * n;

    // Tangential friction
    let v_t = vel - v_n_scalar * n;
    let v_t_mag = length(v_t);
    if (v_t_mag > 1e-6) {
      let t = v_t / v_t_mag;
      let F_t_visc = params.dampingT * v_t_mag;
      let F_t_coulomb = params.friction * F_n_mag;
      force -= min(F_t_visc, F_t_coulomb) * t;
    }
  }

  // === Helix (obstacle in straight section) ===
  // Only apply helix collision in the straight section of stadium torus
  if (abs(pos.y) <= stadiumLe + stadiumR2) {
    // Transform to helix local space (helix is along Y axis at the center)
    // The helix is at distance stadiumR1 from the stadium center, along Z axis
    let helixLocalPos = vec3f(pos.x, pos.y, pos.z - stadiumR1);

    let helixDist = helixSDF(helixLocalPos, helixR, helixPitch, helixShaftR, helixThick);
    let penetrationHelix = -(helixDist - radius);  // Positive when inside helix solid

    if (penetrationHelix > 0.0) {
      // Particle is penetrating the helix
      let n = helixSDFGradient(helixLocalPos, helixR, helixPitch, helixShaftR, helixThick);
      let v_n_scalar = dot(vel, n);

      let F_spring = params.kn * penetrationHelix;
      let F_damp = params.dampingN * max(-v_n_scalar, 0.0);  // Damp when moving into helix
      let F_n_mag = F_spring + F_damp;

      // Push outward (along gradient which points away from helix surface)
      force += F_n_mag * n;

      // Tangential friction
      let v_t = vel - v_n_scalar * n;
      let v_t_mag = length(v_t);
      if (v_t_mag > 1e-6) {
        let t = v_t / v_t_mag;
        let F_t_visc = params.dampingT * v_t_mag;
        let F_t_coulomb = params.friction * F_n_mag;
        force -= min(F_t_visc, F_t_coulomb) * t;
      }
    }
  }

  return force;
}

/**
 * Gyroid boundary force - keeps particles inside gyroid channels
 * Particles flow through the channel where G < 0
 *
 * Geometry: 3 equal cubes stacked vertically
 * - Bottom cube: solid box
 * - Middle cube: gyroid unit cell (2 periods)
 * - Top cube: solid box
 */
fn gyroidBoundaryForce(pos: vec3f, vel: vec3f, radius: f32) -> vec3f {
  var force = vec3f(0.0);

  // Use precomputed boxHalfSize, derive other values
  let boxHalfSize = params.boxHalfSize;
  let cubeSize = boxHalfSize * 2.0;
  let boxYMin = params.hourglassYMin;
  let boxYMax = params.hourglassYMax;

  let gyroidYMin = boxYMin + cubeSize;  // Gyroid starts after bottom cube
  let gyroidYMax = boxYMax - cubeSize;  // Gyroid ends before top cube
  let gyroidCenterY = (gyroidYMin + gyroidYMax) * 0.5;

  // Gyroid position (centered on gyroid region)
  let gyroidPos = vec3f(pos.x, pos.y - gyroidCenterY, pos.z);

  // Bottom box floor
  if (pos.y - radius < boxYMin) {
    let delta = boxYMin - (pos.y - radius);
    let v_n = -vel.y;
    let F = max(params.kn * delta + params.dampingN * max(v_n, 0.0), 0.0);
    force.y += F;
  }

  // Top box ceiling (when enabled)
  if (params.topCapEnabled > 0.5 && pos.y + radius > boxYMax) {
    let delta = (pos.y + radius) - boxYMax;
    let v_n = vel.y;
    let F = max(params.kn * delta + params.dampingN * max(v_n, 0.0), 0.0);
    force.y -= F;
  }

  // Determine which region the particle is in
  let inBottomBox = pos.y < gyroidYMin;
  let inTopBox = pos.y > gyroidYMax;

  let wallThickness = params.gyroidThreshold;

  // XZ walls for all regions (periodic boundaries disabled)
  if (pos.x - radius < -boxHalfSize) {
    let delta = -boxHalfSize - (pos.x - radius);
    let v_n = -vel.x;
    force.x += max(params.kn * delta + params.dampingN * max(v_n, 0.0), 0.0);
  }
  if (pos.x + radius > boxHalfSize) {
    let delta = (pos.x + radius) - boxHalfSize;
    let v_n = vel.x;
    force.x -= max(params.kn * delta + params.dampingN * max(v_n, 0.0), 0.0);
  }
  if (pos.z - radius < -boxHalfSize) {
    let delta = -boxHalfSize - (pos.z - radius);
    let v_n = -vel.z;
    force.z += max(params.kn * delta + params.dampingN * max(v_n, 0.0), 0.0);
  }
  if (pos.z + radius > boxHalfSize) {
    let delta = (pos.z + radius) - boxHalfSize;
    let v_n = vel.z;
    force.z -= max(params.kn * delta + params.dampingN * max(v_n, 0.0), 0.0);
  }

  // Box regions: just floor/ceiling
  if (inBottomBox || inTopBox) {
    return force;
  }

  // === Gyroid region collision ===
  // Simple approach: if |G| < threshold, particle is in wall, push toward channel

  let g = gyroidImplicit(gyroidPos, params.gyroidScale);
  let absG = abs(g);

  // Check if particle is inside the wall region
  if (absG < wallThickness) {
    let grad = gyroidImplicitGradient(gyroidPos, params.gyroidScale);
    let gradLen = length(grad);

    if (gradLen > 0.01) {
      // How deep inside the wall (0 at boundary, wallThickness at G=0)
      let depthInWall = wallThickness - absG;

      // Normalized depth (0 to 1)
      let normalizedDepth = depthInWall / wallThickness;

      // Normal pointing toward increasing |G| (out of wall, into channel)
      var sdfSign = 1.0;
      if (g < 0.0) { sdfSign = -1.0; }
      let n = grad / gradLen * sdfSign;

      let v_n_scalar = dot(vel, n);

      // Soft spring force - use normalized depth for smoother response
      let F_spring = params.kn * radius * normalizedDepth;

      // Damping when moving into the wall
      let F_damp = params.dampingN * max(-v_n_scalar, 0.0);

      let F_n_mag = F_spring + F_damp;
      force += F_n_mag * n;

      // Tangential friction
      let v_t = vel - v_n_scalar * n;
      let v_t_mag = length(v_t);
      if (v_t_mag > 1e-6) {
        let t = v_t / v_t_mag;
        let F_t_visc = params.dampingT * v_t_mag;
        let F_t_coulomb = params.friction * F_n_mag;
        force -= min(F_t_visc, F_t_coulomb) * t;
      }
    }
  }

  return force;
}

/**
 * Hourglass boundary force - keeps particles inside the hourglass wall
 */
fn hourglassBoundaryForce(pos: vec3f, vel: vec3f, radius: f32) -> vec3f {
  var force = vec3f(0.0);

  // Bottom cap collision (solid floor)
  if (pos.y - radius < params.hourglassYMin) {
    let r = length(pos.xz);
    if (r < params.hourglassRadiusTop) {
      let delta = params.hourglassYMin - (pos.y - radius);
      let v_n = -vel.y;
      let F = max(params.kn * delta + params.dampingN * v_n, 0.0);
      force.y += F;

      // Floor friction
      let v_t = vec2f(vel.x, vel.z);
      let v_t_mag = length(v_t);
      if (v_t_mag > 1e-6) {
        let F_t_visc = params.dampingT * v_t_mag;
        let F_t_coulomb = params.friction * F;
        let t = v_t / v_t_mag;
        force.x -= min(F_t_visc, F_t_coulomb) * t.x;
        force.z -= min(F_t_visc, F_t_coulomb) * t.y;
      }
    }
  }

  // Top cap collision (solid ceiling) - only when enabled
  if (params.topCapEnabled > 0.5 && pos.y + radius > params.hourglassYMax) {
    let r = length(pos.xz);
    if (r < params.hourglassRadiusTop) {
      let delta = (pos.y + radius) - params.hourglassYMax;
      let v_n = vel.y;
      let F = max(params.kn * delta + params.dampingN * v_n, 0.0);
      force.y -= F;

      // Ceiling friction
      let v_t = vec2f(vel.x, vel.z);
      let v_t_mag = length(v_t);
      if (v_t_mag > 1e-6) {
        let F_t_visc = params.dampingT * v_t_mag;
        let F_t_coulomb = params.friction * F;
        let t = v_t / v_t_mag;
        force.x -= min(F_t_visc, F_t_coulomb) * t.x;
        force.z -= min(F_t_visc, F_t_coulomb) * t.y;
      }
    }
  }

  // Cylinder collision above hourglass (spawn area) - only when top cap disabled
  if (params.topCapEnabled < 0.5 && pos.y >= params.hourglassYMax) {
    let r = length(pos.xz);
    let penetration = (r + radius) - params.hourglassRadiusTop;

    if (penetration > 0.0 && r > 0.001) {
      // Inward radial normal (horizontal, pointing toward axis)
      let n = vec3f(-pos.x / r, 0.0, -pos.z / r);

      let v_n_scalar = dot(vel, n);
      let F_spring = params.kn * penetration;
      let F_damp = params.dampingN * max(-v_n_scalar, 0.0);
      let F_n_mag = max(F_spring + F_damp, 0.0);

      force += F_n_mag * n;

      // Tangential friction
      let v_t = vel - v_n_scalar * n;
      let v_t_mag = length(v_t);
      if (v_t_mag > 1e-6) {
        let t = v_t / v_t_mag;
        let F_t_visc = params.dampingT * v_t_mag;
        let F_t_coulomb = params.friction * F_n_mag;
        force -= min(F_t_visc, F_t_coulomb) * t;
      }
    }
    return force;
  }

  // Only apply hourglass wall collision within hourglass height range
  if (pos.y < params.hourglassYMin || pos.y > params.hourglassYMax) {
    return force;
  }

  let r = length(pos.xz);
  let targetR = hourglassRadius(pos.y);
  let penetration = (r + radius) - targetR;

  if (penetration > 0.0 && r > 0.001) {
    // Compute inward normal to hourglass surface
    let dRdy = hourglassRadiusDerivative(pos.y);

    // Radial direction in XZ plane
    let radialDir = vec2f(pos.x / r, pos.z / r);

    // For implicit surface F = r - f(y) = 0, gradient is (x/r, -f'(y), z/r)
    // Inward normal (toward axis) is negative gradient: (-x/r, f'(y), -z/r) normalized
    let nLen = sqrt(1.0 + dRdy * dRdy);
    let n_radial = -1.0 / nLen;  // inward radial component
    let n_y = dRdy / nLen;       // vertical component (positive when wall widens upward)

    let n = vec3f(n_radial * radialDir.x, n_y, n_radial * radialDir.y);

    // Spring-dashpot force
    let v_n_scalar = dot(vel, n);
    let F_spring = params.kn * penetration;
    let F_damp = params.dampingN * max(-v_n_scalar, 0.0);
    let F_n_mag = max(F_spring + F_damp, 0.0);

    force += F_n_mag * n;

    // Tangential friction
    let v_t = vel - v_n_scalar * n;
    let v_t_mag = length(v_t);
    if (v_t_mag > 1e-6) {
      let t = v_t / v_t_mag;
      let F_t_visc = params.dampingT * v_t_mag;
      let F_t_coulomb = params.friction * F_n_mag;
      force -= min(F_t_visc, F_t_coulomb) * t;
    }
  }

  return force;
}

/**
 * Linear spring-dashpot collision force between two particles
 */
fn linearSpringDashpotForce(
  pos_i: vec3f, vel_i: vec3f, radius_i: f32,
  pos_j: vec3f, vel_j: vec3f, radius_j: f32,
  usePeriodic: bool
) -> vec3f {
  let delta_pos = pos_j - pos_i;
  let dist = length(delta_pos);
  let contact_dist = radius_i + radius_j;

  if (dist >= contact_dist || dist < 1e-6) {
    return vec3f(0.0);
  }

  let delta = contact_dist - dist;
  let n = delta_pos / dist;
  let v_rel = vel_i - vel_j;
  let v_n_scalar = dot(v_rel, n);
  let v_t = v_rel - v_n_scalar * n;

  let F_n_mag = max(params.kn * delta + params.dampingN * v_n_scalar, 0.0);
  let F_n = -F_n_mag * n;

  var F_t = vec3f(0.0);
  let v_t_mag = length(v_t);
  if (v_t_mag > 1e-6) {
    let t = v_t / v_t_mag;
    F_t = -min(params.dampingT * v_t_mag, params.friction * F_n_mag) * t;
  }

  return F_n + F_t;
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn computeForces(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) { return; }

  let pos_i = positions_in[idx].xyz;
  let vel_i = velocities_in[idx].xyz;
  let radius_i = positions_in[idx].w;

  let geomType = i32(params.geometryType + 0.5);  // Round to nearest int

  var total_force = params.gravity;
  if (geomType == 2) {
    total_force += helixStadiumBoundaryForce(pos_i, vel_i, radius_i);
  } else if (geomType == 1) {
    total_force += gyroidBoundaryForce(pos_i, vel_i, radius_i);
  } else {
    total_force += hourglassBoundaryForce(pos_i, vel_i, radius_i);
  }

  let cell = positionToCell(pos_i);
  let gridDimX = i32(hashParams.gridDimX);
  let gridDimY = i32(hashParams.gridDimY);
  let gridDimZ = i32(hashParams.gridDimZ);

  for (var dz: i32 = -1; dz <= 1; dz++) {
    for (var dy: i32 = -1; dy <= 1; dy++) {
      for (var dx: i32 = -1; dx <= 1; dx++) {
        var nx = i32(cell.x) + dx;
        let ny = i32(cell.y) + dy;
        var nz = i32(cell.z) + dz;

        // Skip out-of-bounds cells
        if (ny < 0 || ny >= gridDimY) { continue; }
        if (nx < 0 || nx >= gridDimX || nz < 0 || nz >= gridDimZ) { continue; }

        let neighborCell = vec3u(u32(nx), u32(ny), u32(nz));
        let cellIdx = cellToIndex(neighborCell);
        let count = min(cellCounts[cellIdx], MAX_PARTICLES_PER_CELL);

        for (var k = 0u; k < count; k++) {
          let j = cellParticles[cellIdx * MAX_PARTICLES_PER_CELL + k];
          if (j == idx) { continue; }

          let pos_j = positions_in[j].xyz;
          let vel_j = velocities_in[j].xyz;
          let radius_j = positions_in[j].w;

          total_force += linearSpringDashpotForce(pos_i, vel_i, radius_i, pos_j, vel_j, radius_j, geomType == 1);
        }
      }
    }
  }

  forces[idx] = vec4f(total_force, 0.0);
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn computeForcesDirect(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) { return; }

  let pos_i = positions_in[idx].xyz;
  let vel_i = velocities_in[idx].xyz;
  let radius_i = positions_in[idx].w;

  let geomType = i32(params.geometryType + 0.5);  // Round to nearest int

  var total_force = params.gravity;
  if (geomType == 2) {
    total_force += helixStadiumBoundaryForce(pos_i, vel_i, radius_i);
  } else if (geomType == 1) {
    total_force += gyroidBoundaryForce(pos_i, vel_i, radius_i);
  } else {
    total_force += hourglassBoundaryForce(pos_i, vel_i, radius_i);
  }

  for (var j = 0u; j < params.particleCount; j++) {
    if (j == idx) { continue; }
    let pos_j = positions_in[j].xyz;
    let vel_j = velocities_in[j].xyz;
    let radius_j = positions_in[j].w;
    total_force += linearSpringDashpotForce(pos_i, vel_i, radius_i, pos_j, vel_j, radius_j, geomType == 1);
  }

  forces[idx] = vec4f(total_force, 0.0);
}

fn hash(seed: u32) -> u32 {
  var x = seed;
  x = ((x >> 16u) ^ x) * 0x45d9f3bu;
  x = ((x >> 16u) ^ x) * 0x45d9f3bu;
  x = (x >> 16u) ^ x;
  return x;
}

fn randomFloat(seed: u32) -> f32 {
  return f32(hash(seed) & 0x00FFFFFFu) / f32(0x01000000u);
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn integrate(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) { return; }

  let pos = positions_in[idx];
  let vel = velocities_in[idx];
  let force = forces[idx].xyz;

  let acc = force;
  var new_vel = vel.xyz + acc * params.dt;
  var new_pos = pos.xyz + new_vel * params.dt;

  // Preserve existing channel value (stored in velocity.w)
  var channel = vel.w;

  let geomType = i32(params.geometryType + 0.5);
  let boxHalfSize = params.boxHalfSize;

  // TODO: Periodic boundary wrapping (disabled - causes jumping at corners)
  // Needs debugging in a 2D test case first
  // if (isGyroid) {
  //   new_pos.x = wrapCoord(new_pos.x, boxHalfSize);
  //   new_pos.z = wrapCoord(new_pos.z, boxHalfSize);
  // }

  // Respawn if below threshold
  if (new_pos.y < params.respawnYThreshold) {
    let seedBase = params.seed + idx * 3u;
    let rx = randomFloat(seedBase);
    let ry = randomFloat(seedBase + 1u);
    let rz = randomFloat(seedBase + 2u);

    new_pos.x = params.spawnXMin + rx * (params.spawnXMax - params.spawnXMin);
    new_pos.y = params.spawnYMin + ry * (params.spawnYMax - params.spawnYMin);
    new_pos.z = params.spawnZMin + rz * (params.spawnZMax - params.spawnZMin);

    new_vel = vec3f(0.0, -0.5, 0.0);
    // Reset channel on respawn (will be set when entering gyroid)
    channel = 0.5;  // Neutral value
  }

  // Update channel when in gyroid region (only for gyroid geometry)
  if (geomType == 1) {
    let cubeSize = boxHalfSize * 2.0;
    let boxYMin = params.hourglassYMin;
    let boxYMax = params.hourglassYMax;
    let gyroidYMin = boxYMin + cubeSize;
    let gyroidYMax = boxYMax - cubeSize;

    // Only update channel when particle is inside the gyroid region
    if (new_pos.y >= gyroidYMin && new_pos.y <= gyroidYMax) {
      let gyroidCenterY = (gyroidYMin + gyroidYMax) * 0.5;
      // Use wrapped position for gyroid calculation (already wrapped above)
      let gyroidPos = vec3f(new_pos.x, new_pos.y - gyroidCenterY, new_pos.z);
      let g = gyroidImplicit(gyroidPos, params.gyroidScale);
      // Map to 0 or 1 based on sign of gyroid function
      channel = select(0.0, 1.0, g >= 0.0);
    }
  }

  positions_out[idx] = vec4f(new_pos, pos.w);
  velocities_out[idx] = vec4f(new_vel, channel);
}
`,Ge=256,be=32,lt=`
// Workgroup size for all spatial hash kernels
const WORKGROUP_SIZE: u32 = ${Ge}u;

struct SpatialHashParams {
  particleCount: u32,
  gridDimX: u32,
  gridDimY: u32,
  gridDimZ: u32,
  cellSize: f32,
  gridMinX: f32,
  gridMinY: f32,
  gridMinZ: f32,
}

@group(0) @binding(0) var<uniform> params: SpatialHashParams;
@group(0) @binding(1) var<storage, read> positions: array<vec4f>;
@group(0) @binding(2) var<storage, read_write> cellIndices: array<u32>;
@group(0) @binding(3) var<storage, read_write> cellCounts: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read> cellOffsets: array<u32>;
@group(0) @binding(5) var<storage, read_write> sortedIndices: array<u32>;

/**
 * Convert world position to grid cell coordinate
 */
fn positionToCell(pos: vec3f) -> vec3u {
  let gridMin = vec3f(params.gridMinX, params.gridMinY, params.gridMinZ);
  let localPos = pos - gridMin;
  let cellCoord = vec3u(floor(max(localPos, vec3f(0.0)) / params.cellSize));

  // Clamp to grid bounds
  return clamp(
    cellCoord,
    vec3u(0u),
    vec3u(params.gridDimX - 1u, params.gridDimY - 1u, params.gridDimZ - 1u)
  );
}

/**
 * Convert 3D cell coordinate to 1D cell index
 */
fn cellToIndex(cell: vec3u) -> u32 {
  return cell.x + cell.y * params.gridDimX + cell.z * params.gridDimX * params.gridDimY;
}

/**
 * Get total number of cells in the grid
 */
fn numCells() -> u32 {
  return params.gridDimX * params.gridDimY * params.gridDimZ;
}

/**
 * Kernel 1: Reset cell counts to zero
 * Dispatch: ceil(numCells / WORKGROUP_SIZE) workgroups
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn resetCellCounts(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  let totalCells = numCells();
  if (idx < totalCells) {
    atomicStore(&cellCounts[idx], 0u);
  }
}

/**
 * Kernel 2: Compute cell index for each particle and count particles per cell
 * Dispatch: ceil(particleCount / WORKGROUP_SIZE) workgroups
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn computeCellIndices(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  // Get particle position
  let pos = positions[idx].xyz;

  // Compute cell index
  let cell = positionToCell(pos);
  let cellIdx = cellToIndex(cell);

  // Store this particle's cell index
  cellIndices[idx] = cellIdx;

  // Atomically increment count for this cell
  atomicAdd(&cellCounts[cellIdx], 1u);
}

/**
 * Kernel 3: Sort particles by cell using prefix-sum offsets
 * After this, particles in cell c are at sortedIndices[cellOffsets[c]..cellOffsets[c+1]]
 * Dispatch: ceil(particleCount / WORKGROUP_SIZE) workgroups
 *
 * Note: cellOffsets must be computed on CPU as exclusive prefix sum of cellCounts
 *       before this kernel runs.
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn sortParticles(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  // Get this particle's cell
  let cellIdx = cellIndices[idx];

  // Atomically get a slot in the sorted array for this cell
  let slot = atomicAdd(&cellCounts[cellIdx], 1u);

  // The slot is relative to cellOffsets[cellIdx]
  // Note: cellCounts was reset, then incremented in computeCellIndices, then we build prefix sum,
  // then reset cellCounts again before sortParticles. So slot starts at 0 for each cell.
  let sortedPos = cellOffsets[cellIdx] + slot;

  // Store particle index at sorted position
  if (sortedPos < params.particleCount) {
    sortedIndices[sortedPos] = idx;
  }
}

// ============================================================================
// DEM-specific: Fixed max particles per cell (no prefix-sum needed)
// ============================================================================

const MAX_PARTICLES_PER_CELL: u32 = 32u;

// For DEM: cellParticles stores particle indices directly (fixed max per cell)
@group(0) @binding(6) var<storage, read_write> cellParticles: array<u32>;

/**
 * Kernel: Build spatial hash for DEM (fixed max per cell)
 * Each particle atomically adds itself to its cell's particle list.
 * Dispatch: ceil(particleCount / WORKGROUP_SIZE) workgroups
 *
 * This is simpler than the prefix-sum approach - just cap at MAX_PARTICLES_PER_CELL.
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn buildHash(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  // Get particle position
  let pos = positions[idx].xyz;

  // Compute cell index
  let cell = positionToCell(pos);
  let cellIdx = cellToIndex(cell);

  // Atomically get a slot in this cell (returns old count)
  let slot = atomicAdd(&cellCounts[cellIdx], 1u);

  // Only store if within max particles per cell
  if (slot < MAX_PARTICLES_PER_CELL) {
    cellParticles[cellIdx * MAX_PARTICLES_PER_CELL + slot] = idx;
  }
}
`;function ct(e,t){const o=new Float32Array(e*4),a=new Float32Array(e*4),d=t.spawnXMax-t.spawnXMin,v=t.spawnYMax-t.spawnYMin,h=t.spawnZMax-t.spawnZMin,c=t.radiusMax??t.radius,r=2.05*c,u=d*v*h,f=Math.cbrt(u/e);let s=Math.max(f,r),p=Math.max(1,Math.floor(d/s)),g=Math.max(1,Math.floor(v/s)),y=Math.max(1,Math.floor(h/s));for(;p*g*y<e&&s>r;)s=Math.max(r,s*.92),p=Math.max(1,Math.floor(d/s)),g=Math.max(1,Math.floor(v/s)),y=Math.max(1,Math.floor(h/s));const M=(p-1)*s,z=(g-1)*s,S=(y-1)*s,C=t.spawnXMin+(d-M)*.5,F=t.spawnYMin+Math.max(c,(v-z)*.5),w=t.spawnZMin+(h-S)*.5,_=c*.06;for(let i=0;i<e;i++){const n=i%p,l=Math.floor(i/p)%y,x=Math.floor(i/(p*y)),b=C+n*s+(Math.random()-.5)*_,R=F+x*s+(Math.random()-.5)*_,T=w+l*s+(Math.random()-.5)*_;o[i*4]=b,o[i*4+1]=R,o[i*4+2]=T,o[i*4+3]=c,a[i*4]=0,a[i*4+1]=0,a[i*4+2]=0,a[i*4+3]=.5}return{positions:o,velocities:a}}function ut(e,t){const o=new Float32Array(e*4),a=new Float32Array(e*4),d=t.radius*2.5,v=t.spawnXMax-t.spawnXMin,h=t.spawnZMax-t.spawnZMin,c=Math.max(1,Math.floor(v/d)),r=Math.max(1,Math.floor(h/d));for(let u=0;u<e;u++){const f=u%c,s=Math.floor(u/c)%r,p=Math.floor(u/(c*r)),g=p%2*(d/2),y=p%2*(d/2),M=t.spawnXMin+d/2+f*d+g,z=t.spawnYMin+t.radius+p*d,S=t.spawnZMin+d/2+s*d+y;o[u*4]=M,o[u*4+1]=z,o[u*4+2]=S,o[u*4+3]=t.radius,a[u*4]=0,a[u*4+1]=0,a[u*4+2]=0,a[u*4+3]=.5}return{positions:o,velocities:a}}const ne={default:{name:"Random Spawn",description:"Particles spawn randomly in the upper box",generator:ct},layered:{name:"Layered",description:"Particles spawn in organized layers",generator:ut}};function dt(e,t,o=1){const a=Math.max(.01,Math.min(.99,e)),d=Math.log(a);return 2*(-d/Math.sqrt(Math.PI*Math.PI+d*d))*Math.sqrt(o*t)}function we(e,t=1,o=.3){return Math.PI*Math.sqrt(t/e)*o}const pt={particleCount:2e3,radius:.08,radiusMin:.08,radiusMax:.08,stiffness:15e3,tangentialRatio:.5,friction:.3,restitution:.4,gravity:-9.81,dt:.001,hourglassRadiusTop:2.5,hourglassRadiusWaist:.5,hourglassYMin:0,hourglassYMax:6,spawnXMin:-1.5,spawnXMax:1.5,spawnYMin:6.5,spawnYMax:8,spawnZMin:-1.5,spawnZMax:1.5,respawnYThreshold:-.5,topCapEnabled:!1,geometryType:0,gyroidScale:2*Math.PI,gyroidThreshold:.3,preset:"default",autoStart:!1};function ft(e,t){const o=e.geometryType===1,a=(e.hourglassYMax-e.hourglassYMin)/6,d=o?a*2:e.spawnXMax-e.spawnXMin,v=e.hourglassYMax-e.hourglassYMin,h=o?a*2:e.spawnZMax-e.spawnZMin;return[o?Math.ceil(d/t):Math.ceil(d/t)+2,Math.ceil(v/t)+2,o?Math.ceil(h/t):Math.ceil(h/t)+2]}function mt(e={}){const t=m.useRef({device:null,buffers:null,hashBuffers:null,hashParams:null,forcesPipeline:null,integratePipeline:null,hashPipelines:null,bindGroupLayout:null,hashBindGroupLayout:null,hashBuildLayout:null,gridDimensions:[1,1,1],gridMin:[0,0,0],cellSize:.2,pingPong:!1,config:{...pt,...e},frameCounter:0}),[o,a]=m.useState({running:!1,frame:0,time:0,initialized:!1,error:null}),d=m.useRef(!1),[v,h]=m.useState(null),[c,r]=m.useState(null),u=m.useRef(0),f=m.useRef(!1),s=m.useRef(0),p=m.useRef(0),g=m.useRef(!0),y=m.useCallback((i,n)=>{const l=dt(i.restitution,i.stiffness),x=l*i.tangentialRatio,b=we(i.stiffness),R=Math.min(i.dt,b);return ot({particleCount:i.particleCount,radius:i.radius,kn:i.stiffness,kt:i.stiffness*i.tangentialRatio,dampingN:l,dampingT:x,friction:i.friction,restitution:i.restitution,gravity:[0,i.gravity,0],dt:R,hourglassRadiusTop:i.hourglassRadiusTop,hourglassYMin:i.hourglassYMin,hourglassYMax:i.hourglassYMax,spawnXMin:i.spawnXMin,spawnXMax:i.spawnXMax,spawnYMin:i.spawnYMin,spawnYMax:i.spawnYMax,spawnZMin:i.spawnZMin,spawnZMax:i.spawnZMax,respawnYThreshold:i.respawnYThreshold,seed:n,hourglassRadiusWaist:i.hourglassRadiusWaist,topCapEnabled:i.topCapEnabled?1:0,geometryType:i.geometryType,gyroidScale:i.gyroidScale,gyroidThreshold:i.gyroidThreshold,helixPitch:i.helixPitch??.35,helixRadius:i.helixRadius??.4,helixShaftRadius:i.helixShaftRadius??.08,helixThickness:i.helixThickness??.05,stadiumMajorRadius:i.stadiumMajorRadius??.5,stadiumStraightLength:i.stadiumStraightLength??1,stadiumTubeRadius:i.stadiumTubeRadius??.5})},[]),M=m.useCallback((i,n,l,x)=>{const b=new ArrayBuffer(be),R=new Uint32Array(b),T=new Float32Array(b);return R[0]=i.particleCount,R[1]=n[0],R[2]=n[1],R[3]=n[2],T[4]=x,T[5]=l[0],T[6]=l[1],T[7]=l[2],b},[]);m.useEffect(()=>{p.current+=1;const i=p.current;return g.current=!0,(async()=>{try{const l=await Je();if(!l){g.current&&p.current===i&&a(q=>({...q,error:"WebGPU not available"}));return}if(!g.current||p.current!==i){l.destroy();return}t.current.device=l;const x=t.current.config,b=x.radius*2,R=ft(x,b),T=x.geometryType===1,D=(x.hourglassYMax-x.hourglassYMin)/6,U=[T?-D:x.spawnXMin-b,x.hourglassYMin-b,T?-D:x.spawnZMin-b];t.current.gridDimensions=R,t.current.gridMin=U,t.current.cellSize=b;const B=at(l,x.particleCount,Te);t.current.buffers=B;const E=it(l,x.particleCount,R);t.current.hashBuffers=E;const Y=l.createBuffer({size:be,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"gyroid_hash_params"});t.current.hashParams=Y;const O=M(x,R,U,b);l.queue.writeBuffer(Y,0,O);const I=(ne[x.preset]||ne.default).generator(x.particleCount,x);ye(l,B,I.positions,I.velocities);const H=y(x,0);l.queue.writeBuffer(B.params,0,H);const V=l.createBindGroupLayout({entries:[_e(0),oe(1),oe(2),ue(3),ue(4),ue(5)],label:"gyroid_main_bind_group_layout"});t.current.bindGroupLayout=V;const G=l.createBindGroupLayout({entries:[_e(0),oe(1),oe(2)],label:"gyroid_hash_bind_group_layout"});t.current.hashBindGroupLayout=G;const $=l.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:6,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}}],label:"gyroid_hash_build_layout"});t.current.hashBuildLayout=$;const L=l.createPipelineLayout({bindGroupLayouts:[V,G],label:"gyroid_force_pipeline_layout"}),W=l.createPipelineLayout({bindGroupLayouts:[V],label:"gyroid_integrate_pipeline_layout"}),N=l.createPipelineLayout({bindGroupLayouts:[$],label:"gyroid_hash_build_pipeline_layout"}),j=l.createShaderModule({code:nt,label:"gyroid_flow_shader"}),Z=l.createShaderModule({code:lt,label:"gyroid_hash_shader"}),k=l.createComputePipeline({layout:L,compute:{module:j,entryPoint:"computeForces"},label:"gyroid_forces"}),Q=l.createComputePipeline({layout:W,compute:{module:j,entryPoint:"integrate"},label:"gyroid_integrate"});t.current.forcesPipeline=k,t.current.integratePipeline=Q;const J=l.createComputePipeline({layout:N,compute:{module:Z,entryPoint:"resetCellCounts"},label:"gyroid_reset_cell_counts"}),ce=l.createComputePipeline({layout:N,compute:{module:Z,entryPoint:"buildHash"},label:"gyroid_build_hash"});t.current.hashPipelines={resetCellCounts:J,buildHash:ce},g.current&&p.current===i&&(h(new Float32Array(I.positions)),r(new Float32Array(I.velocities)),a(q=>({...q,initialized:!0})),x.autoStart&&(d.current=!0,a(q=>({...q,running:!0}))))}catch(l){g.current&&p.current===i&&a(x=>({...x,error:l instanceof Error?l.message:"Unknown error"}))}})(),()=>{g.current=!1,t.current.buffers&&(rt(t.current.buffers),t.current.buffers=null),t.current.hashBuffers&&(st(t.current.hashBuffers),t.current.hashBuffers=null),t.current.hashParams&&(t.current.hashParams.destroy(),t.current.hashParams=null),t.current.device&&(t.current.device.destroy(),t.current.device=null)}},[y,M]),Pe(()=>{const{device:i,buffers:n,hashBuffers:l,hashParams:x,forcesPipeline:b,integratePipeline:R,hashPipelines:T,bindGroupLayout:D,hashBindGroupLayout:U,hashBuildLayout:B,gridDimensions:E,config:Y}=t.current;if(!i||!n||!l||!x||!b||!R||!T||!D||!U||!B||!d.current)return;const O=Me(Y.particleCount,Fe),K=E[0]*E[1]*E[2],I=Me(K,Ge),H=we(Y.stiffness),V=Math.min(Y.dt,H);let G=t.current.pingPong;t.current.frameCounter++;const $=y(Y,t.current.frameCounter);i.queue.writeBuffer(n.params,0,$);const L=i.createCommandEncoder(),W=16;for(let k=0;k<W;k++){const Q=G?n.positionsB:n.positionsA,J=G?n.positionsA:n.positionsB,ce=G?n.velocitiesB:n.velocitiesA,q=G?n.velocitiesA:n.velocitiesB,de=i.createBindGroup({layout:B,entries:[{binding:0,resource:{buffer:x}},{binding:1,resource:{buffer:Q}},{binding:3,resource:{buffer:l.cellCounts}},{binding:6,resource:{buffer:l.cellParticles}}]}),ae=L.beginComputePass();ae.setPipeline(T.resetCellCounts),ae.setBindGroup(0,de),ae.dispatchWorkgroups(I),ae.end();const ie=L.beginComputePass();ie.setPipeline(T.buildHash),ie.setBindGroup(0,de),ie.dispatchWorkgroups(O),ie.end();const pe=xe(i,D,[{binding:0,resource:{buffer:n.params}},{binding:1,resource:{buffer:Q}},{binding:2,resource:{buffer:ce}},{binding:3,resource:{buffer:J}},{binding:4,resource:{buffer:q}},{binding:5,resource:{buffer:n.forces}}]),De=xe(i,U,[{binding:0,resource:{buffer:x}},{binding:1,resource:{buffer:l.cellCounts}},{binding:2,resource:{buffer:l.cellParticles}}]),ee=L.beginComputePass();ee.setPipeline(b),ee.setBindGroup(0,pe),ee.setBindGroup(1,De),ee.dispatchWorkgroups(O),ee.end();const re=L.beginComputePass();re.setPipeline(R),re.setBindGroup(0,pe),re.dispatchWorkgroups(O),re.end(),G=!G,s.current+=V}u.current++,t.current.pingPong=G;const N=G?n.positionsB:n.positionsA,j=G?n.velocitiesB:n.velocitiesA,Z=!f.current;if(Z&&(L.copyBufferToBuffer(N,0,n.stagingPositions,0,Y.particleCount*16),L.copyBufferToBuffer(j,0,n.stagingVelocities,0,Y.particleCount*16)),i.queue.submit([L.finish()]),a(k=>({...k,frame:u.current,time:s.current})),Z){f.current=!0;const k=p.current;Promise.all([n.stagingPositions.mapAsync(GPUMapMode.READ),n.stagingVelocities.mapAsync(GPUMapMode.READ)]).then(()=>{if(!g.current||p.current!==k){try{n.stagingPositions.unmap(),n.stagingVelocities.unmap()}catch{}return}const Q=new Float32Array(n.stagingPositions.getMappedRange().slice(0)),J=new Float32Array(n.stagingVelocities.getMappedRange().slice(0));n.stagingPositions.unmap(),n.stagingVelocities.unmap(),h(Q),r(J),f.current=!1}).catch(()=>{f.current=!1})}});const z=m.useCallback(()=>{d.current=!0,a(i=>({...i,running:!0}))},[]),S=m.useCallback(()=>{d.current=!1,a(i=>({...i,running:!1}))},[]),C=m.useCallback(()=>{d.current=!d.current,a(i=>({...i,running:d.current}))},[]),F=m.useCallback(()=>{const{device:i,buffers:n,config:l}=t.current;if(!i||!n)return;p.current+=1;const b=(ne[l.preset]||ne.default).generator(l.particleCount,l);ye(i,n,b.positions,b.velocities),t.current.pingPong=!1,t.current.frameCounter=0,u.current=0,s.current=0,f.current=!1,h(new Float32Array(b.positions)),r(new Float32Array(b.velocities)),a(R=>({...R,frame:0,time:0}))},[]),w=m.useCallback(i=>{const{device:n,buffers:l,config:x}=t.current;t.current.config={...x,...i};const b=t.current.config;if(n&&l){const R=y(b,t.current.frameCounter);n.queue.writeBuffer(l.params,0,R)}},[y]);return[o,{start:z,pause:S,toggle:C,reset:F,updateConfig:w},v,c,t.current.config]}const Se=[0,265,515,778,1030,1295,1541,1804,2060,2309,2575,2822,3082,3331,3593,3840,400,153,915,666,1430,1183,1941,1692,2460,2197,2975,2710,3482,3219,3993,3728,560,825,51,314,1590,1855,1077,1340,2620,2869,2111,2358,3642,3891,3129,3376,928,681,419,170,1958,1711,1445,1196,2988,2725,2479,2214,4010,3747,3497,3232,1120,1385,1635,1898,102,367,613,876,3180,3429,3695,3942,2154,2403,2665,2912,1520,1273,2035,1786,502,255,1013,764,3580,3317,4095,3830,2554,2291,3065,2800,1616,1881,1107,1370,598,863,85,348,3676,3925,3167,3414,2650,2899,2137,2384,1984,1737,1475,1226,966,719,453,204,4044,3781,3535,3270,3018,2755,2505,2240,2240,2505,2755,3018,3270,3535,3781,4044,204,453,719,966,1226,1475,1737,1984,2384,2137,2899,2650,3414,3167,3925,3676,348,85,863,598,1370,1107,1881,1616,2800,3065,2291,2554,3830,4095,3317,3580,764,1013,255,502,1786,2035,1273,1520,2912,2665,2403,2154,3942,3695,3429,3180,876,613,367,102,1898,1635,1385,1120,3232,3497,3747,4010,2214,2479,2725,2988,1196,1445,1711,1958,170,419,681,928,3376,3129,3891,3642,2358,2111,2869,2620,1340,1077,1855,1590,314,51,825,560,3728,3993,3219,3482,2710,2975,2197,2460,1692,1941,1183,1430,666,915,153,400,3840,3593,3331,3082,2822,2575,2309,2060,1804,1541,1295,1030,778,515,265,0],ht=[[-1],[0,8,3,-1],[0,1,9,-1],[1,8,3,9,8,1,-1],[1,2,10,-1],[0,8,3,1,2,10,-1],[9,2,10,0,2,9,-1],[2,8,3,2,10,8,10,9,8,-1],[3,11,2,-1],[0,11,2,8,11,0,-1],[1,9,0,2,3,11,-1],[1,11,2,1,9,11,9,8,11,-1],[3,10,1,11,10,3,-1],[0,10,1,0,8,10,8,11,10,-1],[3,9,0,3,11,9,11,10,9,-1],[9,8,10,10,8,11,-1],[4,7,8,-1],[4,3,0,7,3,4,-1],[0,1,9,8,4,7,-1],[4,1,9,4,7,1,7,3,1,-1],[1,2,10,8,4,7,-1],[3,4,7,3,0,4,1,2,10,-1],[9,2,10,9,0,2,8,4,7,-1],[2,10,9,2,9,7,2,7,3,7,9,4,-1],[8,4,7,3,11,2,-1],[11,4,7,11,2,4,2,0,4,-1],[9,0,1,8,4,7,2,3,11,-1],[4,7,11,9,4,11,9,11,2,9,2,1,-1],[3,10,1,3,11,10,7,8,4,-1],[1,11,10,1,4,11,1,0,4,7,11,4,-1],[4,7,8,9,0,11,9,11,10,11,0,3,-1],[4,7,11,4,11,9,9,11,10,-1],[9,5,4,-1],[9,5,4,0,8,3,-1],[0,5,4,1,5,0,-1],[8,5,4,8,3,5,3,1,5,-1],[1,2,10,9,5,4,-1],[3,0,8,1,2,10,4,9,5,-1],[5,2,10,5,4,2,4,0,2,-1],[2,10,5,3,2,5,3,5,4,3,4,8,-1],[9,5,4,2,3,11,-1],[0,11,2,0,8,11,4,9,5,-1],[0,5,4,0,1,5,2,3,11,-1],[2,1,5,2,5,8,2,8,11,4,8,5,-1],[10,3,11,10,1,3,9,5,4,-1],[4,9,5,0,8,1,8,10,1,8,11,10,-1],[5,4,0,5,0,11,5,11,10,11,0,3,-1],[5,4,8,5,8,10,10,8,11,-1],[9,7,8,5,7,9,-1],[9,3,0,9,5,3,5,7,3,-1],[0,7,8,0,1,7,1,5,7,-1],[1,5,3,3,5,7,-1],[9,7,8,9,5,7,10,1,2,-1],[10,1,2,9,5,0,5,3,0,5,7,3,-1],[8,0,2,8,2,5,8,5,7,10,5,2,-1],[2,10,5,2,5,3,3,5,7,-1],[7,9,5,7,8,9,3,11,2,-1],[9,5,7,9,7,2,9,2,0,2,7,11,-1],[2,3,11,0,1,8,1,7,8,1,5,7,-1],[11,2,1,11,1,7,7,1,5,-1],[9,5,8,8,5,7,10,1,3,10,3,11,-1],[5,7,0,5,0,9,7,11,0,1,0,10,11,10,0,-1],[11,10,0,11,0,3,10,5,0,8,0,7,5,7,0,-1],[11,10,5,7,11,5,-1],[10,6,5,-1],[0,8,3,5,10,6,-1],[9,0,1,5,10,6,-1],[1,8,3,1,9,8,5,10,6,-1],[1,6,5,2,6,1,-1],[1,6,5,1,2,6,3,0,8,-1],[9,6,5,9,0,6,0,2,6,-1],[5,9,8,5,8,2,5,2,6,3,2,8,-1],[2,3,11,10,6,5,-1],[11,0,8,11,2,0,10,6,5,-1],[0,1,9,2,3,11,5,10,6,-1],[5,10,6,1,9,2,9,11,2,9,8,11,-1],[6,3,11,6,5,3,5,1,3,-1],[0,8,11,0,11,5,0,5,1,5,11,6,-1],[3,11,6,0,3,6,0,6,5,0,5,9,-1],[6,5,9,6,9,11,11,9,8,-1],[5,10,6,4,7,8,-1],[4,3,0,4,7,3,6,5,10,-1],[1,9,0,5,10,6,8,4,7,-1],[10,6,5,1,9,7,1,7,3,7,9,4,-1],[6,1,2,6,5,1,4,7,8,-1],[1,2,5,5,2,6,3,0,4,3,4,7,-1],[8,4,7,9,0,5,0,6,5,0,2,6,-1],[7,3,9,7,9,4,3,2,9,5,9,6,2,6,9,-1],[3,11,2,7,8,4,10,6,5,-1],[5,10,6,4,7,2,4,2,0,2,7,11,-1],[0,1,9,4,7,8,2,3,11,5,10,6,-1],[9,2,1,9,11,2,9,4,11,7,11,4,5,10,6,-1],[8,4,7,3,11,5,3,5,1,5,11,6,-1],[5,1,11,5,11,6,1,0,11,7,11,4,0,4,11,-1],[0,5,9,0,6,5,0,3,6,11,6,3,8,4,7,-1],[6,5,9,6,9,11,4,7,9,7,11,9,-1],[10,4,9,6,4,10,-1],[4,10,6,4,9,10,0,8,3,-1],[10,0,1,10,6,0,6,4,0,-1],[8,3,1,8,1,6,8,6,4,6,1,10,-1],[1,4,9,1,2,4,2,6,4,-1],[3,0,8,1,2,9,2,4,9,2,6,4,-1],[0,2,4,4,2,6,-1],[8,3,2,8,2,4,4,2,6,-1],[10,4,9,10,6,4,11,2,3,-1],[0,8,2,2,8,11,4,9,10,4,10,6,-1],[3,11,2,0,1,6,0,6,4,6,1,10,-1],[6,4,1,6,1,10,4,8,1,2,1,11,8,11,1,-1],[9,6,4,9,3,6,9,1,3,11,6,3,-1],[8,11,1,8,1,0,11,6,1,9,1,4,6,4,1,-1],[3,11,6,3,6,0,0,6,4,-1],[6,4,8,11,6,8,-1],[7,10,6,7,8,10,8,9,10,-1],[0,7,3,0,10,7,0,9,10,6,7,10,-1],[10,6,7,1,10,7,1,7,8,1,8,0,-1],[10,6,7,10,7,1,1,7,3,-1],[1,2,6,1,6,8,1,8,9,8,6,7,-1],[2,6,9,2,9,1,6,7,9,0,9,3,7,3,9,-1],[7,8,0,7,0,6,6,0,2,-1],[7,3,2,6,7,2,-1],[2,3,11,10,6,8,10,8,9,8,6,7,-1],[2,0,7,2,7,11,0,9,7,6,7,10,9,10,7,-1],[1,8,0,1,7,8,1,10,7,6,7,10,2,3,11,-1],[11,2,1,11,1,7,10,6,1,6,7,1,-1],[8,9,6,8,6,7,9,1,6,11,6,3,1,3,6,-1],[0,9,1,11,6,7,-1],[7,8,0,7,0,6,3,11,0,11,6,0,-1],[7,11,6,-1],[7,6,11,-1],[3,0,8,11,7,6,-1],[0,1,9,11,7,6,-1],[8,1,9,8,3,1,11,7,6,-1],[10,1,2,6,11,7,-1],[1,2,10,3,0,8,6,11,7,-1],[2,9,0,2,10,9,6,11,7,-1],[6,11,7,2,10,3,10,8,3,10,9,8,-1],[7,2,3,6,2,7,-1],[7,0,8,7,6,0,6,2,0,-1],[2,7,6,2,3,7,0,1,9,-1],[1,6,2,1,8,6,1,9,8,8,7,6,-1],[10,7,6,10,1,7,1,3,7,-1],[10,7,6,1,7,10,1,8,7,1,0,8,-1],[0,3,7,0,7,10,0,10,9,6,10,7,-1],[7,6,10,7,10,8,8,10,9,-1],[6,8,4,11,8,6,-1],[3,6,11,3,0,6,0,4,6,-1],[8,6,11,8,4,6,9,0,1,-1],[9,4,6,9,6,3,9,3,1,11,3,6,-1],[6,8,4,6,11,8,2,10,1,-1],[1,2,10,3,0,11,0,6,11,0,4,6,-1],[4,11,8,4,6,11,0,2,9,2,10,9,-1],[10,9,3,10,3,2,9,4,3,11,3,6,4,6,3,-1],[8,2,3,8,4,2,4,6,2,-1],[0,4,2,4,6,2,-1],[1,9,0,2,3,4,2,4,6,4,3,8,-1],[1,9,4,1,4,2,2,4,6,-1],[8,1,3,8,6,1,8,4,6,6,10,1,-1],[10,1,0,10,0,6,6,0,4,-1],[4,6,3,4,3,8,6,10,3,0,3,9,10,9,3,-1],[10,9,4,6,10,4,-1],[4,9,5,7,6,11,-1],[0,8,3,4,9,5,11,7,6,-1],[5,0,1,5,4,0,7,6,11,-1],[11,7,6,8,3,4,3,5,4,3,1,5,-1],[9,5,4,10,1,2,7,6,11,-1],[6,11,7,1,2,10,0,8,3,4,9,5,-1],[7,6,11,5,4,10,4,2,10,4,0,2,-1],[3,4,8,3,5,4,3,2,5,10,5,2,11,7,6,-1],[7,2,3,7,6,2,5,4,9,-1],[9,5,4,0,8,6,0,6,2,6,8,7,-1],[3,6,2,3,7,6,1,5,0,5,4,0,-1],[6,2,8,6,8,7,2,1,8,4,8,5,1,5,8,-1],[9,5,4,10,1,6,1,7,6,1,3,7,-1],[1,6,10,1,7,6,1,0,7,8,7,0,9,5,4,-1],[4,0,10,4,10,5,0,3,10,6,10,7,3,7,10,-1],[7,6,10,7,10,8,5,4,10,4,8,10,-1],[6,9,5,6,11,9,11,8,9,-1],[3,6,11,0,6,3,0,5,6,0,9,5,-1],[0,11,8,0,5,11,0,1,5,5,6,11,-1],[6,11,3,6,3,5,5,3,1,-1],[1,2,10,9,5,11,9,11,8,11,5,6,-1],[0,11,3,0,6,11,0,9,6,5,6,9,1,2,10,-1],[11,8,5,11,5,6,8,0,5,10,5,2,0,2,5,-1],[6,11,3,6,3,5,2,10,3,10,5,3,-1],[5,8,9,5,2,8,5,6,2,3,8,2,-1],[9,5,6,9,6,0,0,6,2,-1],[1,5,8,1,8,0,5,6,8,3,8,2,6,2,8,-1],[1,5,6,2,1,6,-1],[1,3,6,1,6,10,3,8,6,5,6,9,8,9,6,-1],[10,1,0,10,0,6,9,5,0,5,6,0,-1],[0,3,8,5,6,10,-1],[10,5,6,-1],[11,5,10,7,5,11,-1],[11,5,10,11,7,5,8,3,0,-1],[5,11,7,5,10,11,1,9,0,-1],[10,7,5,10,11,7,9,8,1,8,3,1,-1],[11,1,2,11,7,1,7,5,1,-1],[0,8,3,1,2,7,1,7,5,7,2,11,-1],[9,7,5,9,2,7,9,0,2,2,11,7,-1],[7,5,2,7,2,11,5,9,2,3,2,8,9,8,2,-1],[2,5,10,2,3,5,3,7,5,-1],[8,2,0,8,5,2,8,7,5,10,2,5,-1],[9,0,1,5,10,3,5,3,7,3,10,2,-1],[9,8,2,9,2,1,8,7,2,10,2,5,7,5,2,-1],[1,3,5,3,7,5,-1],[0,8,7,0,7,1,1,7,5,-1],[9,0,3,9,3,5,5,3,7,-1],[9,8,7,5,9,7,-1],[5,8,4,5,10,8,10,11,8,-1],[5,0,4,5,11,0,5,10,11,11,3,0,-1],[0,1,9,8,4,10,8,10,11,10,4,5,-1],[10,11,4,10,4,5,11,3,4,9,4,1,3,1,4,-1],[2,5,1,2,8,5,2,11,8,4,5,8,-1],[0,4,11,0,11,3,4,5,11,2,11,1,5,1,11,-1],[0,2,5,0,5,9,2,11,5,4,5,8,11,8,5,-1],[9,4,5,2,11,3,-1],[2,5,10,3,5,2,3,4,5,3,8,4,-1],[5,10,2,5,2,4,4,2,0,-1],[3,10,2,3,5,10,3,8,5,4,5,8,0,1,9,-1],[5,10,2,5,2,4,1,9,2,9,4,2,-1],[8,4,5,8,5,3,3,5,1,-1],[0,4,5,1,0,5,-1],[8,4,5,8,5,3,9,0,5,0,3,5,-1],[9,4,5,-1],[4,11,7,4,9,11,9,10,11,-1],[0,8,3,4,9,7,9,11,7,9,10,11,-1],[1,10,11,1,11,4,1,4,0,7,4,11,-1],[3,1,4,3,4,8,1,10,4,7,4,11,10,11,4,-1],[4,11,7,9,11,4,9,2,11,9,1,2,-1],[9,7,4,9,11,7,9,1,11,2,11,1,0,8,3,-1],[11,7,4,11,4,2,2,4,0,-1],[11,7,4,11,4,2,8,3,4,3,2,4,-1],[2,9,10,2,7,9,2,3,7,7,4,9,-1],[9,10,7,9,7,4,10,2,7,8,7,0,2,0,7,-1],[3,7,10,3,10,2,7,4,10,1,10,0,4,0,10,-1],[1,10,2,8,7,4,-1],[4,9,1,4,1,7,7,1,3,-1],[4,9,1,4,1,7,0,8,1,8,7,1,-1],[4,0,3,7,4,3,-1],[4,8,7,-1],[9,10,8,10,11,8,-1],[3,0,9,3,9,11,11,9,10,-1],[0,1,10,0,10,8,8,10,11,-1],[3,1,10,11,3,10,-1],[1,2,11,1,11,9,9,11,8,-1],[3,0,9,3,9,11,1,2,9,2,11,9,-1],[0,2,11,8,0,11,-1],[3,2,11,-1],[2,3,8,2,8,10,10,8,9,-1],[9,10,2,0,9,2,-1],[2,3,8,2,8,10,0,1,8,1,10,8,-1],[1,10,2,-1],[1,3,8,9,1,8,-1],[0,9,1,-1],[0,3,8,-1],[-1]],gt=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];function vt(e,t,o=40){const a=t/o,d=t/2,v=[];for(let r=0;r<=o;r++){v[r]=[];for(let u=0;u<=o;u++){v[r][u]=[];for(let f=0;f<=o;f++){const s=-d+r*a,p=-d+u*a,g=-d+f*a;v[r][u][f]=e(s,p,g)}}}const h=(r,u,f,s)=>{if(Math.abs(f)<1e-6)return r;if(Math.abs(s)<1e-6)return u;if(Math.abs(f-s)<1e-6)return r;const p=-f/(s-f);return[r[0]+p*(u[0]-r[0]),r[1]+p*(u[1]-r[1]),r[2]+p*(u[2]-r[2])]},c=[];for(let r=0;r<o;r++)for(let u=0;u<o;u++)for(let f=0;f<o;f++){const s=-d+r*a,p=-d+u*a,g=-d+f*a,y=[v[r][u][f],v[r+1][u][f],v[r+1][u+1][f],v[r][u+1][f],v[r][u][f+1],v[r+1][u][f+1],v[r+1][u+1][f+1],v[r][u+1][f+1]];let M=0;if(y[0]<0&&(M|=1),y[1]<0&&(M|=2),y[2]<0&&(M|=4),y[3]<0&&(M|=8),y[4]<0&&(M|=16),y[5]<0&&(M|=32),y[6]<0&&(M|=64),y[7]<0&&(M|=128),Se[M]===0)continue;const z=[[s,p,g],[s+a,p,g],[s+a,p+a,g],[s,p+a,g],[s,p,g+a],[s+a,p,g+a],[s+a,p+a,g+a],[s,p+a,g+a]],S=new Array(12).fill(null),C=Se[M];for(let w=0;w<12;w++)if(C&1<<w){const[_,i]=gt[w];S[w]=h(z[_],z[i],y[_],y[i])}const F=ht[M];for(let w=0;F[w]!==-1;w+=3){const _=S[F[w]],i=S[F[w+1]],n=S[F[w+2]];_&&i&&n&&(c.push(_[0],_[1],_[2]),c.push(i[0],i[1],i[2]),c.push(n[0],n[1],n[2]))}}return{positions:new Float32Array(c),vertexCount:c.length/3}}function yt(e,t,o,a=40){const d=(h,c,r)=>{const u=h*t,f=c*t,s=r*t;return Math.sin(u)*Math.cos(f)+Math.sin(f)*Math.cos(s)+Math.sin(s)*Math.cos(u)};return vt((h,c,r)=>Math.abs(d(h,c,r))-o,e,a)}const xt=({radiusTop:e,radiusWaist:t,yMin:o,yMax:a,showTopCap:d=!0})=>{const v=m.useMemo(()=>new ze({color:8956620,transparent:!0,opacity:.2,roughness:.1,metalness:0,side:le,depthWrite:!1}),[]),h=m.useMemo(()=>{const r=a-o,u=o+r*.5,f=r*.5,s=64,p=[];for(let g=0;g<=s;g++){const y=o+g/s*r,M=(y-u)/f,z=t+(e-t)*M*M;p.push(new Le(z,y))}return new Ie(p,64)},[e,t,o,a]),c=m.useMemo(()=>new Ee(e,64),[e]);return X("group",{children:[P("mesh",{geometry:h,material:v}),P("mesh",{geometry:c,material:v,position:[0,o,0],rotation:[-Math.PI/2,0,0]}),d&&P("mesh",{geometry:c,material:v,position:[0,a,0],rotation:[Math.PI/2,0,0]})]})},_t=`
varying vec3 vWorldPosition;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`,Mt=`
precision highp float;

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

// Helix SDF with height limits
float sdHelix(vec3 p, float R, float pitch, float shaftR, float thickness) {
  float heightLimit = stadiumStraightLength - 0.05;
  float clampedY = clamp(p.y, -heightLimit, heightLimit);
  vec3 clampedP = vec3(p.x, clampedY, p.z);

  if (abs(p.y) > heightLimit + 0.1) {
    return length(p.xz) - shaftR + abs(p.y) - heightLimit;
  }

  float shaftDist = length(clampedP.xz) - shaftR;
  float k = pitch / TAU;
  float angle = atan(clampedP.z, clampedP.x);
  float expectedY = k * angle;
  float r = length(clampedP.xz);

  if (r > shaftR * 0.9 && r < R) {
    float dy = mod(clampedP.y - expectedY + pitch * 0.5, pitch) - pitch * 0.5;
    float bladeDist = abs(dy) - thickness;
    float bladeWeight = smoothstep(shaftR * 0.9, shaftR * 1.1, r);
    return mix(shaftDist, min(shaftDist, bladeDist), bladeWeight);
  }

  return shaftDist;
}

float sceneSDF(vec3 p) {
  vec3 helixP = vec3(p.x, p.y, p.z - stadiumMajorRadius);
  return sdHelix(helixP, helixRadius, helixPitch, helixShaftRadius, helixThickness);
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
    d += dist * 0.8;
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

  vec3 lightDir = normalize(vec3(1.0, 2.0, 1.0));
  float diff = max(dot(n, lightDir), 0.0);
  float amb = 0.35;

  vec3 color = vec3(0.75, 0.85, 0.95);
  vec3 finalColor = color * (amb + diff * 0.65);

  gl_FragColor = vec4(finalColor, 1.0);
}
`,bt=({majorRadius:e,straightLength:t,tubeRadius:o,helixRadius:a,helixShaftRadius:d,helixPitch:v,helixThickness:h})=>{const c=m.useMemo(()=>({stadiumMajorRadius:{value:e},stadiumStraightLength:{value:t},stadiumTubeRadius:{value:o},helixRadius:{value:a},helixShaftRadius:{value:d},helixPitch:{value:v},helixThickness:{value:h}}),[e,t,o,a,d,v,h]),r=(e+o)*2+.5,u=t*2+o*2+.5,f=m.useMemo(()=>{const p=Math.PI,g=2*Math.PI,y=[],M=[],z=24,S=80,C=w=>{w=(w%1+1)%1;const _=p*e,i=2*_+2*t*2,n=w*i;if(n<t*2)return new A(-t+n,0,-e);if(n<t*2+_){const l=-p/2+(n-t*2)/e;return new A(t+e*Math.cos(l),0,e*Math.sin(l))}else if(n<t*4+_){const l=n-t*2-_;return new A(t-l,0,e)}else{const l=p/2+(n-t*4-_)/e;return new A(-t+e*Math.cos(l),0,e*Math.sin(l))}};for(let w=0;w<=S;w++){const _=w/S,i=C(_),n=C((_+.001)%1),l=new A().subVectors(n,i).normalize(),x=new A(0,1,0),b=new A().crossVectors(l,x).normalize(),R=new A().crossVectors(b,l).normalize();for(let T=0;T<=z;T++){const D=T/z*g,U=Math.cos(D),B=Math.sin(D);y.push(i.x+o*(U*b.x+B*R.x),i.y+o*(U*b.y+B*R.y),i.z+o*(U*b.z+B*R.z))}}for(let w=0;w<S;w++)for(let _=0;_<z;_++){const i=w*(z+1)+_,n=i+1,l=i+(z+1),x=l+1;M.push(i,l,n,n,l,x)}const F=new Ce;return F.setAttribute("position",new te(new Float32Array(y),3)),F.setIndex(M),F.computeVertexNormals(),F},[e,t,o]),s=m.useMemo(()=>new ze({color:4491434,transparent:!0,opacity:.25,side:le,depthWrite:!1}),[]);return X("group",{rotation:[0,0,Math.PI/2],children:[P("mesh",{geometry:f,material:s}),X("mesh",{children:[P("boxGeometry",{args:[r,u,r]}),P("shaderMaterial",{vertexShader:_t,fragmentShader:Mt,uniforms:c,side:Oe,transparent:!1,depthWrite:!0})]})]})},wt=({yMin:e,yMax:t})=>{const v=t-e,h=v/3,c=(e+t)/2,r=c,u=h/2,f=.4,s=4*Math.PI/h,p=.4,g=m.useMemo(()=>new Ze({color:12963034,transparent:!0,opacity:.38}),[]),y=.78,M=m.useMemo(()=>new ge({color:15249514,roughness:.55,metalness:.1,side:ve,flatShading:!1,transparent:!0,opacity:y}),[]),z=m.useMemo(()=>new ge({color:1186605,transparent:!0,opacity:.55,roughness:.6,metalness:.05,side:le}),[]),S=m.useMemo(()=>new Re({uniforms:{uScale:{value:s},uThreshold:{value:p},uColor:{value:new Xe(15249514)},uFaceNormal:{value:new A(0,0,1)},uLightDir:{value:new A(5,10,5).normalize()},uAlpha:{value:y},uCapToGyroidLocal:{value:new se}},vertexShader:`
        uniform mat4 uCapToGyroidLocal;
        varying vec3 vGyroidLocal;
        void main() {
          vGyroidLocal = (uCapToGyroidLocal * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,fragmentShader:`
        precision highp float;
        varying vec3 vGyroidLocal;
        uniform float uScale;
        uniform float uThreshold;
        uniform vec3 uColor;
        uniform vec3 uFaceNormal;
        uniform vec3 uLightDir;
        uniform float uAlpha;
        void main() {
          float sx = uScale * vGyroidLocal.x;
          float sy = uScale * vGyroidLocal.y;
          float sz = uScale * vGyroidLocal.z;
          float g = sin(sx) * cos(sy) + sin(sy) * cos(sz) + sin(sz) * cos(sx);
          if (abs(g) > uThreshold) discard;
          float ndl = max(0.0, dot(normalize(uFaceNormal), normalize(uLightDir)));
          vec3 c = uColor * (0.42 + 0.58 * ndl);
          gl_FragColor = vec4(c, uAlpha);
        }
      `,side:ve,transparent:!0}),[s,p]),C=m.useMemo(()=>{const _=new se().makeTranslation(0,-c,0),i=(n,l,x)=>{const b=new se().compose(new A(n[0],n[1],n[2]),new We().setFromEuler(new Ne(l[0],l[1],l[2])),new A(1,1,1)),R=new se().multiplyMatrices(_,b);return{pos:n,rot:l,normal:x,capToGyroidLocal:R}};return[i([u,c,0],[0,Math.PI/2,0],[1,0,0]),i([-u,c,0],[0,-Math.PI/2,0],[-1,0,0]),i([0,c+u,0],[-Math.PI/2,0,0],[0,1,0]),i([0,c-u,0],[Math.PI/2,0,0],[0,-1,0]),i([0,c,u],[0,0,0],[0,0,1]),i([0,c,-u],[0,Math.PI,0],[0,0,-1])]},[u,c]),F=m.useMemo(()=>{const{positions:_}=yt(h,s,f,40),i=new Float32Array(_.length),n=s;for(let x=0;x<_.length;x+=3){const b=_[x],R=_[x+1],T=_[x+2],D=n*b,U=n*R,B=n*T,E=Math.sin(D),Y=Math.cos(D),O=Math.sin(U),K=Math.cos(U),I=Math.sin(B),H=Math.cos(B),V=E*K+O*H+I*Y,G=Y*K-I*E,$=-E*O+K*H,L=-O*I+H*Y,W=V>=0?1:-1;let N=W*G,j=W*$,Z=W*L;const k=1/Math.max(1e-9,Math.hypot(N,j,Z));i[x]=N*k,i[x+1]=j*k,i[x+2]=Z*k}const l=new Ce;return l.setAttribute("position",new te(_,3)),l.setAttribute("normal",new te(i,3)),l},[h,s,f]),w=m.useMemo(()=>new He(new Ve(h,v,h)),[h,v]);return X("group",{children:[P("mesh",{position:[0,e+.005,0],rotation:[-Math.PI/2,0,0],material:z,children:P("planeGeometry",{args:[h,h]})}),P("lineSegments",{position:[0,r,0],geometry:w,material:g}),P("mesh",{position:[0,c,0],geometry:F,material:M,castShadow:!0,receiveShadow:!0}),C.map((_,i)=>{const n=S.clone();return n.uniforms.uFaceNormal={value:new A(..._.normal)},n.uniforms.uCapToGyroidLocal={value:_.capToGyroidLocal},n.uniforms.uScale=S.uniforms.uScale,n.uniforms.uThreshold=S.uniforms.uThreshold,n.uniforms.uColor=S.uniforms.uColor,n.uniforms.uLightDir=S.uniforms.uLightDir,n.uniforms.uAlpha=S.uniforms.uAlpha,P("mesh",{position:_.pos,rotation:_.rot,material:n,children:P("planeGeometry",{args:[h,h]})},i)})]})},St=10,Pt=2,Rt=({config:e,showHourglass:t=!0,resetTrigger:o=0})=>{const[a,d,v,h,c]=mt({...e,autoStart:!0}),[r,u]=m.useState(e.geometryType??0);m.useEffect(()=>{e.geometryType!==void 0&&e.geometryType!==r&&(u(e.geometryType),d.updateConfig({geometryType:e.geometryType}))},[e.geometryType,r,d]);const f=m.useRef(null),s=m.useRef(0),p=m.useRef(0),g=m.useRef(!1),y=m.useRef(0),M=m.useRef(!1),[z,S]=m.useState(!1),C=m.useRef(o),F=m.useRef(d);F.current=d,m.useEffect(()=>{o!==C.current&&a.initialized&&(C.current=o,F.current.updateConfig({geometryType:e.geometryType,spawnXMin:e.spawnXMin,spawnXMax:e.spawnXMax,spawnYMin:e.spawnYMin,spawnYMax:e.spawnYMax,spawnZMin:e.spawnZMin,spawnZMax:e.spawnZMax,gravity:-9.81,topCapEnabled:!1}),F.current.reset(),s.current=0,p.current=0,g.current=!1,y.current=0,M.current=!1,S(!1),f.current&&(f.current.rotation.z=0))},[o,a.initialized,e]);const w=(c.hourglassYMin+c.hourglassYMax)/2;return Pe((_,i)=>{if(s.current+=i,!g.current&&s.current>=St&&(M.current||(M.current=!0,S(!0),d.updateConfig({topCapEnabled:!0})),g.current=!0,y.current=p.current+Math.PI,s.current=0),g.current&&f.current){const n=s.current,l=Math.min(n/Pt,1),x=l<.5?2*l*l:1-Math.pow(-2*l+2,2)/2,R=y.current-Math.PI+x*Math.PI;if(f.current.rotation.z=R,l>=.5&&p.current!==y.current){p.current=y.current;const D=Math.round(p.current/Math.PI)%2===1?9.81:-9.81;d.updateConfig({gravity:D})}l>=1&&(g.current=!1,f.current.rotation.z=y.current)}}),a.error?X("mesh",{children:[P("boxGeometry",{args:[1,1,1]}),P("meshBasicMaterial",{color:"red"})]}):X(Ue,{children:[P("group",{ref:f,position:[0,w,0],children:X("group",{position:[0,-w,0],children:[t&&r===0&&P(xt,{radiusTop:c.hourglassRadiusTop,radiusWaist:c.hourglassRadiusWaist,yMin:c.hourglassYMin,yMax:c.hourglassYMax,showTopCap:z}),t&&r===1&&P(wt,{yMin:c.hourglassYMin,yMax:c.hourglassYMax,showTopCap:z}),t&&r===2&&P(bt,{majorRadius:c.stadiumMajorRadius??.8,straightLength:c.stadiumStraightLength??1.25,tubeRadius:c.stadiumTubeRadius??.5,helixRadius:(c.stadiumTubeRadius??.5)*.8,helixShaftRadius:c.helixShaftRadius??.08,helixPitch:c.helixPitch??.35,helixThickness:c.helixThickness??.05}),v&&h&&P($e,{positions:v,velocities:h,particleCount:c.particleCount,config:r===1?{pointSize:1,colorMode:1,fieldType:5,colormap:5,colormapReversed:!1,fieldMin:0,fieldMax:1,blendMode:2,brightness:1.25,gaussianSigma:.42,gyroidScale:c.gyroidScale,gyroidYMin:c.hourglassYMin+(c.hourglassYMax-c.hourglassYMin)/3,gyroidYMax:c.hourglassYMax-(c.hourglassYMax-c.hourglassYMin)/3}:{pointSize:1,colorMode:1,fieldType:0,colormap:4,colormapReversed:!0,fieldMin:0,fieldMax:5,blendMode:2,brightness:1.2,gaussianSigma:.4}})]})}),P("ambientLight",{intensity:.5}),P("directionalLight",{position:[5,10,5],intensity:1})]})},Tt=({className:e="",particleCount:t=1e4,showHourglass:o=!0,geometryType:a=0})=>{const[d,v]=m.useState(null),h=m.useRef(null),[c,r]=m.useState(0),u=m.useRef(a);if(m.useEffect(()=>{(async()=>{if(typeof navigator>"u"||!("gpu"in navigator)){v(!1);return}try{const F=await navigator.gpu.requestAdapter();v(F!==null)}catch{v(!1)}})()},[]),m.useEffect(()=>{a!==u.current&&(u.current=a,r(C=>C+1))},[a]),d===null)return P("div",{ref:h,className:`${e} flex items-center justify-center bg-primary`,children:P("div",{className:"text-tertiary/50 text-sm",children:"Checking WebGPU..."})});if(!d)return P("div",{ref:h,className:`${e} flex items-center justify-center bg-primary`,children:P("div",{className:"text-tertiary/50 text-sm text-center px-4",children:"WebGPU not supported in this browser"})});const f=2,s=.8,p=1.25,g=.5,M=(()=>{if(a===0)return{spawnXMin:-1,spawnXMax:1,spawnYMin:6.5,spawnYMax:8.5,spawnZMin:-1,spawnZMax:1};if(a===1)return{spawnXMin:-f/2*.8,spawnXMax:f/2*.8,spawnYMin:4.5,spawnYMax:5.8,spawnZMin:-f/2*.8,spawnZMax:f/2*.8};{const C=g*.7;return{spawnXMin:-C,spawnXMax:C,spawnYMin:p*.5,spawnYMax:p*.95,spawnZMin:s-C,spawnZMax:s+C}}})(),z={particleCount:t,radius:a===2?.03:.06,radiusMin:a===2?.02:.04,radiusMax:a===2?.04:.08,stiffness:15e3,friction:.3,restitution:.4,gravity:a===2?-4:-9.81,hourglassRadiusTop:1.25,hourglassRadiusWaist:.25,hourglassYMin:0,hourglassYMax:6,...M,respawnYThreshold:-10,topCapEnabled:!1,geometryType:a,gyroidScale:4*Math.PI/f,gyroidThreshold:.4,stadiumMajorRadius:s,stadiumStraightLength:p,stadiumTubeRadius:g,helixPitch:.35,helixRadius:g*.8,helixShaftRadius:.08,helixThickness:.05},S=a===2?{position:[3.4,1.4,3.4],target:[0,.4,.4]}:a===1?{position:[6.5,4,6.5],target:[0,3,0]}:{position:[8,5,8],target:[0,3,0]};return P("div",{ref:h,className:`${e} bg-primary`,children:X(Be,{dpr:[1,1.5],gl:{antialias:!0,alpha:!0},style:{background:"transparent"},children:[P(Ye,{makeDefault:!0,position:S.position,fov:45}),P(Ae,{target:S.target,enableZoom:!1,enablePan:!1,autoRotate:!0,autoRotateSpeed:.5,minPolarAngle:Math.PI/6,maxPolarAngle:Math.PI/2}),P(Rt,{config:z,showHourglass:o,resetTrigger:c})]},a)})};export{Tt as default};
