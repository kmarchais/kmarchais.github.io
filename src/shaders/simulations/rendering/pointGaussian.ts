/**
 * Point Gaussian Shader
 *
 * Renders particles as billboarded quads with Gaussian falloff.
 * Supports soft splat (alpha blending) and additive blending modes.
 * Color can be mapped from velocity magnitude using various colormaps.
 */

// Vertex shader - creates billboarded quads from point positions
export const vertexShader = /* glsl */ `
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
uniform int uColormap;  // 0 = viridis, 1 = plasma, 2 = turbo, 3 = coolwarm, 4 = rdylbu
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

// Apply colormap based on uniform selection
vec3 applyColormap(float t, int colormap) {
  if (colormap == 0) return viridis(t);
  if (colormap == 1) return plasma(t);
  if (colormap == 2) return turbo(t);
  if (colormap == 3) return coolwarm(t);
  if (colormap == 4) return rdylbu(t);
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
`;

// Fragment shader - applies Gaussian falloff or sphere shading
export const fragmentShader = /* glsl */ `
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
`;

// Shader uniforms type definition
export interface PointGaussianUniforms {
  uPointSize: { value: number };
  uMinSize: { value: number };
  uMaxSize: { value: number };
  uVelocityScale: { value: number };
  uColorMode: { value: number };
  uGaussianSigma: { value: number };
  uMinAlpha: { value: number };
  uBlendMode: { value: number };
  uBrightness: { value: number };
  uBaseColor: { value: [number, number, number] };
  uLightDir: { value: [number, number, number] };
}

// Default uniform values
export const defaultUniforms: PointGaussianUniforms = {
  uPointSize: { value: 0.1 },
  uMinSize: { value: 0.01 },
  uMaxSize: { value: 1.0 },
  uVelocityScale: { value: 0.1 },
  uColorMode: { value: 1 }, // Velocity magnitude
  uGaussianSigma: { value: 0.4 },
  uMinAlpha: { value: 0.01 },
  uBlendMode: { value: 2 }, // Sphere (default)
  uBrightness: { value: 1.0 },
  uBaseColor: { value: [1.0, 1.0, 1.0] },
  uLightDir: { value: [0.5, 0.7, 1.0] }, // Top-right-front light
};

// Color mode options for UI
export const COLOR_MODES = [
  { value: 0, label: 'Solid' },
  { value: 1, label: 'Velocity (Viridis)' },
  { value: 2, label: 'Velocity Direction' },
  { value: 3, label: 'Velocity (Plasma)' },
  { value: 4, label: 'Velocity (Turbo)' },
  { value: 5, label: 'Velocity (Coolwarm)' },
  { value: 6, label: 'Velocity (RdYlBu)' },
] as const;

// Field type options for UI (what value to color by)
export const FIELD_TYPES = [
  { value: 0, label: 'Velocity' },
  { value: 1, label: 'Radius' },
  { value: 5, label: 'Gyroid Channel' },
] as const;

// Colormap options for UI
export const COLORMAPS = [
  { value: 0, label: 'Viridis' },
  { value: 1, label: 'Plasma' },
  { value: 2, label: 'Turbo' },
  { value: 3, label: 'Coolwarm' },
  { value: 4, label: 'RdYlBu' },
] as const;

// Blend mode options for UI
export const BLEND_MODES = [
  { value: 2, label: 'Sphere' },
  { value: 0, label: 'Gaussian' },
  { value: 1, label: 'Additive' },
] as const;
