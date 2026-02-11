import{d as we,j as l,b as e,C as ye,i as Me,f as Ce,G as Pe,e as De,S as Fe,F as W}from"./vendor-r3f-b9e513d9.js";import{r as g}from"./vendor-react-11ad1bf9.js";import{m as re,a4 as Ne,D as ne}from"./vendor-three-a8671fcb.js";import{F as de,N as oe,C as Se,S as ke}from"./index-c8982a94.js";import{B as Re}from"./Breadcrumb-746ada9d.js";import"./vendor-ui-4807b111.js";import{g as Be,u as Ee}from"./gpuCapabilities-6d047e77.js";import{W as Le}from"./WebGPUNotSupported-857de87f.js";import{d as ze,h as Ae,w as ue,c as me,u as pe,b as Te,i as Ge,e as fe,s as $,f as se}from"./pipelineBuilder-ebda840f.js";import{S as ge,s as Ie,a as Oe}from"./spatialHash-a3a691f9.js";const xe=256,je=`
// Workgroup size
const WORKGROUP_SIZE: u32 = ${xe}u;

struct DEMParams {
  particleCount: u32,
  radius: f32,
  kn: f32,           // Normal stiffness
  kt: f32,           // Tangential stiffness
  dampingN: f32,     // Normal damping coefficient
  dampingT: f32,     // Tangential damping coefficient
  friction: f32,     // Coulomb friction coefficient
  restitution: f32,  // Coefficient of restitution
  gravity: vec3f,
  dt: f32,
  boxMin: vec3f,
  boxMax: vec3f,
  containerType: u32,  // 0=box, 1=drum
  drumRadius: f32,     // Drum inner radius
  drumLength: f32,     // Drum length along X
  drumOmega: f32,      // Angular velocity (rad/s)
  drumCenterY: f32,    // Y position of drum axis
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

// Main simulation buffers
@group(0) @binding(0) var<uniform> params: DEMParams;
@group(0) @binding(1) var<storage, read> positions_in: array<vec4f>;
@group(0) @binding(2) var<storage, read> velocities_in: array<vec4f>;
@group(0) @binding(3) var<storage, read_write> positions_out: array<vec4f>;
@group(0) @binding(4) var<storage, read_write> velocities_out: array<vec4f>;
@group(0) @binding(5) var<storage, read_write> forces: array<vec4f>;

// Spatial hash buffers (simplified - no sorting needed)
// Maximum particles per cell
const MAX_PARTICLES_PER_CELL: u32 = 32u;

@group(1) @binding(0) var<uniform> hashParams: SpatialHashParams;
@group(1) @binding(1) var<storage, read> cellCounts: array<u32>;
@group(1) @binding(2) var<storage, read> cellParticles: array<u32>;

/**
 * Convert world position to grid cell coordinate
 */
fn positionToCell(pos: vec3f) -> vec3u {
  let gridMin = vec3f(hashParams.gridMinX, hashParams.gridMinY, hashParams.gridMinZ);
  let localPos = pos - gridMin;
  let cellCoord = vec3u(floor(localPos / hashParams.cellSize));
  return clamp(
    cellCoord,
    vec3u(0u),
    vec3u(hashParams.gridDimX - 1u, hashParams.gridDimY - 1u, hashParams.gridDimZ - 1u)
  );
}

/**
 * Convert 3D cell coordinate to 1D index
 */
fn cellToIndex(cell: vec3u) -> u32 {
  return cell.x + cell.y * hashParams.gridDimX + cell.z * hashParams.gridDimX * hashParams.gridDimY;
}

/**
 * Total number of cells
 */
fn numCells() -> u32 {
  return hashParams.gridDimX * hashParams.gridDimY * hashParams.gridDimZ;
}

/**
 * Linear Spring-Dashpot contact force (Hookean model)
 *
 * This is a simple, numerically stable contact model.
 * Normal force: F_n = k_n * delta - c_n * v_n (spring + dashpot)
 * Tangential force: F_t = -c_t * v_t, capped by Coulomb friction
 *
 * The damping coefficient c_n is computed from the restitution coefficient:
 *   gamma = -ln(e) / sqrt(pi^2 + ln(e)^2)
 *   c_n = 2 * gamma * sqrt(m * k_n)
 *
 * Critical time step for stability: dt_crit = pi * sqrt(m / k_n)
 * We use dt << dt_crit for safety.
 *
 * Supports per-particle radii: contact_dist = radius_i + radius_j
 */
fn linearSpringDashpotForce(
  pos_i: vec3f, vel_i: vec3f, radius_i: f32,
  pos_j: vec3f, vel_j: vec3f, radius_j: f32
) -> vec3f {
  let delta_pos = pos_j - pos_i;
  let dist = length(delta_pos);
  let contact_dist = radius_i + radius_j;

  // No contact if particles don't overlap
  if (dist >= contact_dist || dist < 1e-6) {
    return vec3f(0.0);
  }

  // Overlap depth (penetration)
  let delta = contact_dist - dist;

  // Normal direction (from i to j)
  let n = delta_pos / dist;

  // Relative velocity of i with respect to j
  let v_rel = vel_i - vel_j;

  // Normal component of relative velocity (positive = approaching)
  let v_n_scalar = dot(v_rel, n);
  let v_n = v_n_scalar * n;

  // Tangential component of relative velocity
  let v_t = v_rel - v_n;

  // Normal force: linear spring + viscous damping
  // F = k * delta + c * v_n (in -n direction)
  // When approaching (v_n > 0): stronger repulsion (slows approach)
  // When separating (v_n < 0): weaker repulsion (slows separation)
  let F_n_spring = params.kn * delta;
  let F_n_damp = params.dampingN * v_n_scalar;

  // Total normal force magnitude (must be repulsive, i.e., >= 0)
  let F_n_mag = max(F_n_spring + F_n_damp, 0.0);

  // Normal force vector (points from j to i, i.e., repels i)
  let F_n = -F_n_mag * n;

  // Tangential force: viscous damping capped by Coulomb friction
  let v_t_mag = length(v_t);
  var F_t = vec3f(0.0);

  if (v_t_mag > 1e-6) {
    let t = v_t / v_t_mag;

    // Viscous tangential damping
    let F_t_visc = params.dampingT * v_t_mag;

    // Coulomb friction limit
    let F_t_coulomb = params.friction * F_n_mag;

    // Take minimum (friction-limited)
    let F_t_mag = min(F_t_visc, F_t_coulomb);

    // Tangential force opposes relative tangential motion
    F_t = -F_t_mag * t;
  }

  return F_n + F_t;
}

/**
 * Wall contact force (linear spring-dashpot)
 * Damping: + when approaching (stronger repulsion), - when leaving (weaker)
 */
fn wallForce(pos: vec3f, vel: vec3f, radius: f32) -> vec3f {
  var force = vec3f(0.0);

  // Bottom wall (y = boxMin.y)
  let bottom_dist = pos.y - params.boxMin.y - radius;
  if (bottom_dist < 0.0) {
    let delta = -bottom_dist;
    let v_n = -vel.y; // velocity into wall (positive = approaching)
    let F = max(params.kn * delta + params.dampingN * v_n, 0.0);
    force.y += F;
  }

  // Top wall (y = boxMax.y)
  let top_dist = params.boxMax.y - pos.y - radius;
  if (top_dist < 0.0) {
    let delta = -top_dist;
    let v_n = vel.y;
    let F = max(params.kn * delta + params.dampingN * v_n, 0.0);
    force.y -= F;
  }

  // Left wall (x = boxMin.x)
  let left_dist = pos.x - params.boxMin.x - radius;
  if (left_dist < 0.0) {
    let delta = -left_dist;
    let v_n = -vel.x;
    let F = max(params.kn * delta + params.dampingN * v_n, 0.0);
    force.x += F;
  }

  // Right wall (x = boxMax.x)
  let right_dist = params.boxMax.x - pos.x - radius;
  if (right_dist < 0.0) {
    let delta = -right_dist;
    let v_n = vel.x;
    let F = max(params.kn * delta + params.dampingN * v_n, 0.0);
    force.x -= F;
  }

  // Back wall (z = boxMin.z)
  let back_dist = pos.z - params.boxMin.z - radius;
  if (back_dist < 0.0) {
    let delta = -back_dist;
    let v_n = -vel.z;
    let F = max(params.kn * delta + params.dampingN * v_n, 0.0);
    force.z += F;
  }

  // Front wall (z = boxMax.z)
  let front_dist = params.boxMax.z - pos.z - radius;
  if (front_dist < 0.0) {
    let delta = -front_dist;
    let v_n = vel.z;
    let F = max(params.kn * delta + params.dampingN * v_n, 0.0);
    force.z -= F;
  }

  return force;
}

/**
 * Drum wall contact force (cylindrical wall + end caps)
 * Drum axis is along X, centered at (0, drumCenterY, 0)
 * Includes tangential friction from rotating wall
 */
fn drumWallForce(pos: vec3f, vel: vec3f, radius: f32) -> vec3f {
  var force = vec3f(0.0);

  // Position relative to drum axis
  let relY = pos.y - params.drumCenterY;
  let relZ = pos.z;

  // Distance from drum axis in YZ plane
  let distFromAxis = sqrt(relY * relY + relZ * relZ);

  // Cylindrical wall collision
  let wallDist = params.drumRadius - distFromAxis - radius;
  if (wallDist < 0.0) {
    let delta = -wallDist;

    // Radial direction pointing OUTWARD from axis (toward wall)
    let radialOut = vec3f(0.0, relY / distFromAxis, relZ / distFromAxis);

    // Normal for force application (pointing INWARD toward axis, pushes particle away from wall)
    let n = -radialOut;

    // Wall velocity at contact point (rotating drum)
    // v_wall = omega × r, where r is position from axis
    // For rotation around X-axis: v = (0, -omega*z, omega*y)
    let wallVel = vec3f(0.0, -params.drumOmega * relZ, params.drumOmega * relY);

    // Relative velocity of particle with respect to wall
    let v_rel = vel - wallVel;

    // Normal component of relative velocity INTO the wall (positive = approaching wall)
    // Use radialOut so positive means moving toward wall
    let v_into_wall = dot(v_rel, radialOut);
    let v_n = v_into_wall * radialOut;

    // Tangential component of relative velocity
    let v_t = v_rel - v_n;

    // Normal force: spring + damping
    // When approaching (v_into_wall > 0): damping adds to repulsion (slows approach)
    // When leaving (v_into_wall < 0): damping reduces repulsion (allows separation)
    let F_n_spring = params.kn * delta;
    let F_n_damp = params.dampingN * v_into_wall;
    let F_n_mag = max(F_n_spring + F_n_damp, 0.0);

    // Normal force vector (points inward, toward axis - pushes particle away from wall)
    force += F_n_mag * n;

    // Tangential friction force
    let v_t_mag = length(v_t);
    if (v_t_mag > 1e-6) {
      let t = v_t / v_t_mag;
      let F_t_visc = params.dampingT * v_t_mag;
      let F_t_coulomb = params.friction * F_n_mag;
      let F_t_mag = min(F_t_visc, F_t_coulomb);
      force -= F_t_mag * t;
    }
  }

  // End cap collisions (flat walls at X = ±drumLength/2)
  let halfLength = params.drumLength / 2.0;

  // Left end cap (X = -halfLength)
  let leftDist = pos.x - (-halfLength) - radius;
  if (leftDist < 0.0 && distFromAxis < params.drumRadius) {
    let delta = -leftDist;
    let v_n = -vel.x;
    let F = max(params.kn * delta + params.dampingN * v_n, 0.0);
    force.x += F;
  }

  // Right end cap (X = +halfLength)
  let rightDist = halfLength - pos.x - radius;
  if (rightDist < 0.0 && distFromAxis < params.drumRadius) {
    let delta = -rightDist;
    let v_n = vel.x;
    let F = max(params.kn * delta + params.dampingN * v_n, 0.0);
    force.x -= F;
  }

  return force;
}

/**
 * Kernel: Compute contact forces using spatial hash
 * Uses per-particle radius stored in positions.w
 * Uses simplified cell-based hash (no sorting, fixed max per cell)
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn computeForces(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  let pos_i = positions_in[idx].xyz;
  let vel_i = velocities_in[idx].xyz;
  let radius_i = positions_in[idx].w;  // Per-particle radius

  // Start with gravity
  var total_force = params.gravity;

  // Add wall forces based on container type
  if (params.containerType == 1u) {
    // Drum container
    total_force += drumWallForce(pos_i, vel_i, radius_i);
  } else {
    // Box container (default)
    total_force += wallForce(pos_i, vel_i, radius_i);
  }

  // Get this particle's cell
  let cell = positionToCell(pos_i);

  // Iterate over neighbor cells (3x3x3 = 27 cells)
  for (var dz: i32 = -1; dz <= 1; dz++) {
    for (var dy: i32 = -1; dy <= 1; dy++) {
      for (var dx: i32 = -1; dx <= 1; dx++) {
        let nx = i32(cell.x) + dx;
        let ny = i32(cell.y) + dy;
        let nz = i32(cell.z) + dz;

        // Check bounds
        if (nx < 0 || nx >= i32(hashParams.gridDimX) ||
            ny < 0 || ny >= i32(hashParams.gridDimY) ||
            nz < 0 || nz >= i32(hashParams.gridDimZ)) {
          continue;
        }

        let neighborCell = vec3u(u32(nx), u32(ny), u32(nz));
        let cellIdx = cellToIndex(neighborCell);

        // Get number of particles in this cell (capped at MAX_PARTICLES_PER_CELL)
        let count = min(cellCounts[cellIdx], MAX_PARTICLES_PER_CELL);

        // Check each particle in the cell
        for (var k = 0u; k < count; k++) {
          let j = cellParticles[cellIdx * MAX_PARTICLES_PER_CELL + k];
          if (j == idx) {
            continue; // Skip self
          }

          let pos_j = positions_in[j].xyz;
          let vel_j = velocities_in[j].xyz;
          let radius_j = positions_in[j].w;  // Per-particle radius

          // Compute contact force with per-particle radii
          total_force += linearSpringDashpotForce(pos_i, vel_i, radius_i, pos_j, vel_j, radius_j);
        }
      }
    }
  }

  // Store force
  forces[idx] = vec4f(total_force, 0.0);
}

/**
 * Kernel: Compute forces without spatial hash (for small particle counts)
 * Uses direct O(N²) neighbor search
 * Uses per-particle radius stored in positions.w
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn computeForcesDirect(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  let pos_i = positions_in[idx].xyz;
  let vel_i = velocities_in[idx].xyz;
  let radius_i = positions_in[idx].w;  // Per-particle radius

  // Start with gravity (gravity is a vec3f, e.g., (0, -9.81, 0))
  var total_force = params.gravity;

  // Add wall forces based on container type
  if (params.containerType == 1u) {
    // Drum container
    total_force += drumWallForce(pos_i, vel_i, radius_i);
  } else {
    // Box container (default)
    total_force += wallForce(pos_i, vel_i, radius_i);
  }

  // Direct N² neighbor search for particle-particle contacts
  for (var j = 0u; j < params.particleCount; j++) {
    if (j == idx) {
      continue;
    }
    let pos_j = positions_in[j].xyz;
    let vel_j = velocities_in[j].xyz;
    let radius_j = positions_in[j].w;  // Per-particle radius
    total_force += linearSpringDashpotForce(pos_i, vel_i, radius_i, pos_j, vel_j, radius_j);
  }

  forces[idx] = vec4f(total_force, 0.0);
}

/**
 * Kernel: Velocity Verlet integration (first half - update velocity)
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn integrateVelocityHalf(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  let vel = velocities_in[idx].xyz;
  let force = forces[idx].xyz;
  let mass = 1.0; // Assuming unit mass

  // v(t + dt/2) = v(t) + a(t) * dt/2
  let new_vel = vel + (force / mass) * params.dt * 0.5;

  velocities_out[idx] = vec4f(new_vel, 0.0);
}

/**
 * Kernel: Velocity Verlet integration (update position)
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn integratePosition(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  let pos = positions_in[idx];
  let vel = velocities_in[idx].xyz;

  // x(t + dt) = x(t) + v(t + dt/2) * dt
  let new_pos = pos.xyz + vel * params.dt;

  // Keep mass/radius in w component
  positions_out[idx] = vec4f(new_pos, pos.w);
}

/**
 * Kernel: Velocity Verlet integration (second half - update velocity with new forces)
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn integrateVelocityFull(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  let vel = velocities_in[idx].xyz;
  let force = forces[idx].xyz;
  let mass = 1.0;

  // v(t + dt) = v(t + dt/2) + a(t + dt) * dt/2
  let new_vel = vel + (force / mass) * params.dt * 0.5;

  velocities_out[idx] = vec4f(new_vel, 0.0);
}

/**
 * Check if a vector contains NaN or very large values
 * NaN check: a value is NaN if it's not equal to itself
 */
fn isValidVec3(v: vec3f) -> bool {
  let maxVal = 1e10;
  // NaN check: v != v is true only for NaN
  let hasNaN = (v.x != v.x) || (v.y != v.y) || (v.z != v.z);
  return all(abs(v) < vec3f(maxVal)) && !hasNaN;
}

/**
 * Kernel: Simple Euler integration
 * No clamping - boundaries are enforced by wall contact forces
 */
@compute @workgroup_size(WORKGROUP_SIZE)
fn integrate(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.particleCount) {
    return;
  }

  let pos = positions_in[idx];
  let vel = velocities_in[idx].xyz;
  let force = forces[idx].xyz;
  let mass = 1.0;

  // Acceleration
  let acc = force / mass;

  // Update velocity (simple Euler)
  let new_vel = vel + acc * params.dt;

  // Update position (no clamping - wall forces handle boundaries)
  let new_pos = pos.xyz + new_vel * params.dt;

  // Store results
  positions_out[idx] = vec4f(new_pos, pos.w);
  velocities_out[idx] = vec4f(new_vel, 0.0);
}
`;function We(){const a=Math.random(),t=Math.random(),m=Math.sqrt(-2*Math.log(a)),i=2*Math.PI*t;return[m*Math.cos(i),m*Math.sin(i)]}function be(a){switch(a.radiusDistribution){case"mono":return a.radius;case"uniform":return a.radiusMin+Math.random()*(a.radiusMax-a.radiusMin);case"normal":{const[t]=We(),m=a.radiusMean+t*a.radiusStdDev;return Math.max(a.radiusMin,Math.min(a.radiusMax,m))}default:return a.radius}}function Ue(a){switch(a.radiusDistribution){case"mono":return a.radius;case"uniform":return(a.radiusMin+a.radiusMax)/2;case"normal":return a.radiusMean;default:return a.radius}}function Ve(a,t){const m=new Float32Array(a*4),i=new Float32Array(a*4),c=Ue(t),d=c*2.5,h=c*2+d/2,b=t.boxSize[0]/2-h,_=t.boxSize[2]/2-h,x=Math.max(1,Math.floor(b*2/d)),M=Math.max(1,Math.floor(_*2/d));for(let p=0;p<a;p++){const N=p%x,v=Math.floor(p/x)%M,w=Math.floor(p/(x*M)),P=w%2*(d/2),o=w%2*(d/2),n=-b+N*d+P,S=-_+v*d+o,T=c+.3+w*d;m[p*4]=n,m[p*4+1]=T,m[p*4+2]=S,m[p*4+3]=be(t),i[p*4]=0,i[p*4+1]=0,i[p*4+2]=0,i[p*4+3]=0}return{positions:m,velocities:i}}function Ye(a,t){const m=new Float32Array(a*4),i=new Float32Array(a*4),c=t.radiusDistribution==="mono"?t.radius:t.radiusMax,d=t.drumRadius??4,h=t.drumLength??6,b=t.drumCenterY??4.5,_=c*4,x=d-_,M=c*4;for(let p=0;p<a;p++){const N=be(t),v=(Math.random()-.5)*(h-M*2);let w,P;const o=x-N;do w=(Math.random()-.5)*2*o,P=(Math.random()-.5)*2*o;while(w*w+P*P>o*o);const n=w*.4-o*.4+b;m[p*4]=v,m[p*4+1]=n,m[p*4+2]=P,m[p*4+3]=N,i[p*4]=0,i[p*4+1]=0,i[p*4+2]=0,i[p*4+3]=0}return{positions:m,velocities:i}}const Q={boxPacking:{name:"Box Packing",description:"Particles falling into a box container",generator:Ve},drum:{name:"Rotating Drum",description:"Particles in a rotating cylindrical drum",generator:Ye}},He={boxPacking:"Box Packing",drum:"Rotating Drum"};function Ze(a,t,m=1){const i=Math.max(.01,Math.min(.99,a)),c=Math.log(i);return 2*(-c/Math.sqrt(Math.PI*Math.PI+c*c))*Math.sqrt(m*t)}function he(a,t=1,m=.3){return Math.PI*Math.sqrt(t/a)*m}const Xe={particleCount:5e3,radiusDistribution:"uniform",radius:.1,radiusMin:.05,radiusMax:.15,radiusMean:.1,radiusStdDev:.02,stiffness:1e4,tangentialRatio:.5,dampingN:70,dampingT:35,friction:.5,restitution:.6,gravity:-9.81,dt:.001,preset:"boxPacking",boxSize:[5,8,5],containerType:"box",drumRadius:4,drumLength:6,drumRPM:15,drumCenterY:4.5};function Ke(a,t){return[Math.ceil(a[0]/t)+2,Math.ceil(a[1]/t)+2,Math.ceil(a[2]/t)+2]}function qe(a={}){const t=g.useRef({device:null,buffers:null,hashBuffers:null,hashParams:null,forcesPipeline:null,integratePipeline:null,hashPipelines:null,bindGroupLayout:null,hashBindGroupLayout:null,hashBuildLayout:null,gridDimensions:[1,1,1],gridMin:[0,0,0],cellSize:.2,pingPong:!1,config:{...Xe,...a}}),[m,i]=g.useState({running:!1,frame:0,time:0,initialized:!1,error:null}),c=g.useRef(!1),[d,h]=g.useState(null),[b,_]=g.useState(null),x=g.useRef(0),M=g.useRef(!1),p=g.useCallback(r=>{const s=new ArrayBuffer(128),f=new Uint32Array(s),u=new Float32Array(s),y=r.boxSize.map(I=>I/2),F=Ze(r.restitution,r.stiffness),D=F*r.tangentialRatio,L=he(r.stiffness),G=Math.min(r.dt,L),z=(r.drumRPM??15)*Math.PI*2/60;return f[0]=r.particleCount,u[1]=r.radius,u[2]=r.stiffness,u[3]=r.stiffness*r.tangentialRatio,u[4]=F,u[5]=D,u[6]=r.friction,u[7]=r.restitution,u[8]=0,u[9]=r.gravity,u[10]=0,u[11]=G,u[12]=-y[0],u[13]=0,u[14]=-y[2],u[16]=y[0],u[17]=r.boxSize[1],u[18]=y[2],f[19]=r.containerType==="drum"?1:0,u[20]=r.drumRadius??4,u[21]=r.drumLength??6,u[22]=z,u[23]=r.drumCenterY??4.5,s},[]),N=g.useCallback((r,s,f,u)=>{const y=new ArrayBuffer(ge),F=new Uint32Array(y),D=new Float32Array(y);return F[0]=r.particleCount,F[1]=s[0],F[2]=s[1],F[3]=s[2],D[4]=u,D[5]=f[0],D[6]=f[1],D[7]=f[2],y},[]);g.useEffect(()=>{let r=!0;return(async()=>{try{const f=await Be();if(!f){r&&i(B=>({...B,error:"WebGPU not available"}));return}if(!r){f.destroy();return}t.current.device=f;const u=t.current.config,y=u.boxSize.map(B=>B/2),D=(u.radiusDistribution==="mono"?u.radius:u.radiusMax)*2,L=Ke(u.boxSize,D),G=[-y[0]-D,-D,-y[2]-D];t.current.gridDimensions=L,t.current.gridMin=G,t.current.cellSize=D;const z=Te(f,u.particleCount,128);t.current.buffers=z;const I=Ge(f,u.particleCount,L);t.current.hashBuffers=I;const A=f.createBuffer({size:ge,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"spatial_hash_params"});t.current.hashParams=A;const U=N(u,L,G,D);f.queue.writeBuffer(A,0,U);const O=(Q[u.preset]||Q.boxPacking).generator(u.particleCount,u);pe(f,z,O.positions,O.velocities);const ee=p(u);f.queue.writeBuffer(z.params,0,ee);const V=f.createBindGroupLayout({entries:[fe(0),$(1),$(2),se(3),se(4),se(5)],label:"dem_main_bind_group_layout"});t.current.bindGroupLayout=V;const k=f.createBindGroupLayout({entries:[fe(0),$(1),$(2)],label:"dem_hash_bind_group_layout"});t.current.hashBindGroupLayout=k;const R=f.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:6,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}}],label:"hash_build_layout"});t.current.hashBuildLayout=R;const te=f.createPipelineLayout({bindGroupLayouts:[V,k],label:"dem_force_pipeline_layout"}),ae=f.createPipelineLayout({bindGroupLayouts:[V],label:"dem_integrate_pipeline_layout"}),Y=f.createPipelineLayout({bindGroupLayouts:[R],label:"hash_build_pipeline_layout"}),E=f.createShaderModule({code:je,label:"dem_shader"}),H=f.createComputePipeline({layout:te,compute:{module:E,entryPoint:"computeForces"},label:"dem_forces"}),ie=f.createComputePipeline({layout:ae,compute:{module:E,entryPoint:"integrate"},label:"dem_integrate"});t.current.forcesPipeline=H,t.current.integratePipeline=ie;const X=f.createShaderModule({code:Ie,label:"spatial_hash_shader"}),K=f.createComputePipeline({layout:Y,compute:{module:X,entryPoint:"resetCellCounts"},label:"reset_cell_counts"}),j=f.createComputePipeline({layout:Y,compute:{module:X,entryPoint:"buildHash"},label:"build_hash"});t.current.hashPipelines={resetCellCounts:K,buildHash:j},h(new Float32Array(O.positions)),_(new Float32Array(O.velocities)),r&&i(B=>({...B,initialized:!0}))}catch(f){r&&i(u=>({...u,error:f instanceof Error?f.message:"Unknown error"}))}})(),()=>{r=!1,t.current.buffers&&ze(t.current.buffers),t.current.hashBuffers&&Ae(t.current.hashBuffers),t.current.hashParams&&t.current.hashParams.destroy(),t.current.device&&t.current.device.destroy()}},[p,N]);const v=g.useRef(0);we(()=>{const{device:r,buffers:s,hashBuffers:f,hashParams:u,forcesPipeline:y,integratePipeline:F,hashPipelines:D,bindGroupLayout:L,hashBindGroupLayout:G,hashBuildLayout:z,gridDimensions:I,config:A}=t.current;if(!r||!s||!f||!u||!y||!F||!D||!L||!G||!z||!c.current)return;const U=ue(A.particleCount,xe),le=I[0]*I[1]*I[2],O=ue(le,Oe),ee=he(A.stiffness),V=Math.min(A.dt,ee);let k=t.current.pingPong;const R=r.createCommandEncoder();{const E=k?s.positionsB:s.positionsA,H=k?s.positionsA:s.positionsB,ie=k?s.velocitiesB:s.velocitiesA,X=k?s.velocitiesA:s.velocitiesB,K=r.createBindGroup({layout:z,entries:[{binding:0,resource:{buffer:u}},{binding:1,resource:{buffer:E}},{binding:3,resource:{buffer:f.cellCounts}},{binding:6,resource:{buffer:f.cellParticles}}]}),j=R.beginComputePass();j.setPipeline(D.resetCellCounts),j.setBindGroup(0,K),j.dispatchWorkgroups(O),j.end();const B=R.beginComputePass();B.setPipeline(D.buildHash),B.setBindGroup(0,K),B.dispatchWorkgroups(U),B.end();const ce=me(r,L,[{binding:0,resource:{buffer:s.params}},{binding:1,resource:{buffer:E}},{binding:2,resource:{buffer:ie}},{binding:3,resource:{buffer:H}},{binding:4,resource:{buffer:X}},{binding:5,resource:{buffer:s.forces}}]),_e=me(r,G,[{binding:0,resource:{buffer:u}},{binding:1,resource:{buffer:f.cellCounts}},{binding:2,resource:{buffer:f.cellParticles}}]),Z=R.beginComputePass();Z.setPipeline(y),Z.setBindGroup(0,ce),Z.setBindGroup(1,_e),Z.dispatchWorkgroups(U),Z.end();const q=R.beginComputePass();q.setPipeline(F),q.setBindGroup(0,ce),q.dispatchWorkgroups(U),q.end(),k=!k,x.current++,v.current+=V}t.current.pingPong=k;const te=k?s.positionsB:s.positionsA,ae=k?s.velocitiesB:s.velocitiesA,Y=!M.current;Y&&(R.copyBufferToBuffer(te,0,s.stagingPositions,0,A.particleCount*16),R.copyBufferToBuffer(ae,0,s.stagingVelocities,0,A.particleCount*16)),r.queue.submit([R.finish()]),i(E=>({...E,frame:x.current,time:v.current})),Y&&(M.current=!0,Promise.all([s.stagingPositions.mapAsync(GPUMapMode.READ),s.stagingVelocities.mapAsync(GPUMapMode.READ)]).then(()=>{const E=new Float32Array(s.stagingPositions.getMappedRange().slice(0)),H=new Float32Array(s.stagingVelocities.getMappedRange().slice(0));s.stagingPositions.unmap(),s.stagingVelocities.unmap(),h(E),_(H),M.current=!1}).catch(()=>{M.current=!1}))});const w=g.useCallback(()=>{c.current=!0,i(r=>({...r,running:!0}))},[]),P=g.useCallback(()=>{c.current=!1,i(r=>({...r,running:!1}))},[]),o=g.useCallback(()=>{c.current=!c.current,i(r=>({...r,running:c.current}))},[]),n=g.useCallback(()=>{const{device:r,buffers:s,config:f}=t.current;if(!r||!s)return;const y=(Q[f.preset]||Q.boxPacking).generator(f.particleCount,f);pe(r,s,y.positions,y.velocities),t.current.pingPong=!1,x.current=0,v.current=0,h(new Float32Array(y.positions)),_(new Float32Array(y.velocities)),i(F=>({...F,frame:0,time:0}))},[]),S=g.useCallback(r=>{const{device:s,buffers:f,config:u}=t.current;t.current.config={...u,...r};const y=t.current.config;if(s&&f){const F=p(y);s.queue.writeBuffer(f.params,0,F)}},[p]);return[m,{start:w,pause:P,toggle:o,reset:n,updateConfig:S},d,b,t.current.config]}function $e({colormap:a,min:t,max:m,label:i}){const c=g.useMemo(()=>{const d={0:["#440154","#482777","#3F4A8A","#31678D","#26838E","#1F9E89","#35B778","#6DCD59","#B4DD2C","#FDE724"],1:["#0D0887","#47039F","#7301A8","#9C179E","#BD3786","#D8576B","#ED7953","#FA9E3B","#FDC328","#F0F921"],2:["#30123B","#4662D7","#35ABE8","#1AE4B6","#72FE5E","#C8EF34","#FCCE2E","#F98E09","#D65F0E","#7A0403"],3:["#3B4CC0","#6788EE","#9ABBFF","#C9D7F0","#EDDBD5","#F6BDA2","#F18E6F","#D95847","#B40426"],4:["#A50026","#D73027","#F46D43","#FDAE61","#FEE090","#FFFFBF","#E0F3F8","#ABD9E9","#74ADD1","#4575B4","#313695"]},h=d[a]||d[0];return{background:`linear-gradient(to top, ${h.map((_,x)=>`${_} ${x/(h.length-1)*100}%`).join(", ")})`}},[a]);return l("div",{className:"absolute bottom-8 right-[328px] z-30 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg p-3",children:[l("div",{className:"flex flex-col items-center gap-1",children:[e("span",{className:"text-white text-xs font-mono",children:m.toFixed(2)}),e("div",{className:"w-5 h-40 rounded",style:c}),e("span",{className:"text-white text-xs font-mono",children:t.toFixed(2)})]}),e("div",{className:"flex items-center justify-center h-40",children:e("span",{className:"text-white text-sm -rotate-90 whitespace-nowrap",children:i})})]})}function Qe({size:a}){return l("mesh",{position:[0,a[1]/2,0],children:[e("boxGeometry",{args:[a[0],a[1],a[2]]}),e("meshStandardMaterial",{color:"#ffffff",opacity:.2,transparent:!0,side:Ne,depthWrite:!1})]})}function Je({size:a}){return e("gridHelper",{args:[Math.max(a[0],a[2]),Math.max(a[0],a[2])],position:[0,.001,0],children:e("meshBasicMaterial",{color:"#444444",opacity:.5,transparent:!0})})}function et({radius:a,length:t,centerY:m,rpm:i,time:c}){const d=i*c*Math.PI*2/60;return l("group",{position:[0,m,0],rotation:[0,0,-Math.PI/2],children:[l("mesh",{rotation:[0,d,0],children:[e("cylinderGeometry",{args:[a,a,t,64,1,!0]}),e("meshStandardMaterial",{color:"#6699ff",opacity:.15,transparent:!0,side:ne,depthWrite:!1})]}),l("mesh",{position:[0,t/2,0],rotation:[-Math.PI/2,0,d],children:[e("circleGeometry",{args:[a,64]}),e("meshStandardMaterial",{color:"#6699ff",opacity:.1,transparent:!0,side:ne,depthWrite:!1})]}),l("mesh",{position:[0,-t/2,0],rotation:[Math.PI/2,0,-d],children:[e("circleGeometry",{args:[a,64]}),e("meshStandardMaterial",{color:"#6699ff",opacity:.1,transparent:!0,side:ne,depthWrite:!1})]})]})}function C({label:a,value:t,min:m,max:i,step:c,onChange:d,unit:h=""}){const b=c<1?Math.max(2,-Math.floor(Math.log10(c))):0,_=(t-m)/(i-m)*100;return l("div",{className:"group",children:[l("div",{className:"flex items-center justify-between mb-1.5",children:[e("span",{className:"text-[11px] text-white/60 font-medium uppercase tracking-wide",children:a}),l("span",{className:"text-xs text-white font-mono bg-white/10 px-1.5 py-0.5 rounded",children:[t.toFixed(b),h]})]}),l("div",{className:"relative h-1.5 bg-white/10 rounded-full overflow-hidden",children:[e("div",{className:"absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all",style:{width:`${_}%`}}),e("input",{type:"range",min:m,max:i,step:c,value:t,onChange:x=>d(parseFloat(x.target.value)),className:"absolute inset-0 w-full h-full opacity-0 cursor-pointer"})]})]})}function ve({label:a,value:t,options:m,onChange:i}){return l("div",{children:[e("span",{className:"text-[11px] text-white/60 font-medium uppercase tracking-wide block mb-1.5",children:a}),l("div",{className:"relative",children:[e("select",{value:t,onChange:c=>{const d=c.target.value,h=parseFloat(d);i(isNaN(h)?d:h)},className:"w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white appearance-none cursor-pointer hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-primary transition-colors",children:m.map(c=>e("option",{value:c.value,className:"bg-gray-900",children:c.label},c.value))}),e("div",{className:"absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40",children:e("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M19 9l-7 7-7-7"})})})]})]})}function J({title:a,icon:t,children:m,defaultOpen:i=!0}){const[c,d]=g.useState(i);return l("div",{className:"bg-white/[0.02] rounded-xl border border-white/5 overflow-hidden",children:[l("button",{onClick:()=>d(!c),className:"w-full flex items-center gap-2 px-4 py-3 hover:bg-white/5 transition-colors",children:[t&&e("span",{className:"text-cyan-400",children:t}),e("span",{className:"text-sm font-semibold text-white flex-1 text-left",children:a}),e("svg",{className:`w-4 h-4 text-white/40 transition-transform ${c?"rotate-180":""}`,fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M19 9l-7 7-7-7"})})]}),e("div",{className:`transition-all duration-200 ${c?"max-h-[1000px] opacity-100":"max-h-0 opacity-0 overflow-hidden"}`,children:e("div",{className:"px-4 pb-4 space-y-4",children:m})})]})}function tt({physics:a,setPhysics:t,container:m,setContainer:i,particleCount:c,setParticleCount:d,isRunning:h,frame:b,time:_,onToggle:x,onReset:M}){const p=Object.entries(He).map(([o,n])=>({value:o,label:n})),N=l("svg",{className:"w-4 h-4",fill:"currentColor",viewBox:"0 0 20 20",children:[e("circle",{cx:"10",cy:"10",r:"3"}),e("circle",{cx:"4",cy:"6",r:"2"}),e("circle",{cx:"16",cy:"6",r:"2"}),e("circle",{cx:"6",cy:"15",r:"2"}),e("circle",{cx:"14",cy:"14",r:"2.5"})]}),v=e("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"})}),w=e("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"})}),P=e("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"})});return e("div",{className:"fixed right-0 top-20 bottom-0 w-80 bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-xl border-l border-white/10 overflow-y-auto z-10",children:l("div",{className:"p-5 space-y-5",children:[l("div",{className:"flex items-center gap-3",children:[e("div",{className:"w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20",children:l("svg",{className:"w-5 h-5 text-white",fill:"currentColor",viewBox:"0 0 20 20",children:[e("circle",{cx:"10",cy:"10",r:"3"}),e("circle",{cx:"5",cy:"5",r:"2"}),e("circle",{cx:"15",cy:"5",r:"2"}),e("circle",{cx:"5",cy:"15",r:"2"}),e("circle",{cx:"15",cy:"15",r:"2"})]})}),l("div",{children:[e("h2",{className:"text-lg font-bold text-white",children:"DEM Simulation"}),e("p",{className:"text-[11px] text-white/40",children:"Discrete Element Method"})]})]}),l("div",{className:"flex gap-2",children:[e("button",{onClick:x,className:`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${h?"bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30":"bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"}`,children:h?l(W,{children:[e("svg",{className:"w-4 h-4",fill:"currentColor",viewBox:"0 0 20 20",children:e("path",{fillRule:"evenodd",d:"M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z",clipRule:"evenodd"})}),"Pause"]}):l(W,{children:[e("svg",{className:"w-4 h-4",fill:"currentColor",viewBox:"0 0 20 20",children:e("path",{fillRule:"evenodd",d:"M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z",clipRule:"evenodd"})}),"Play"]})}),l("button",{onClick:M,className:"py-2.5 px-4 rounded-xl text-sm font-semibold bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white transition-all duration-200 flex items-center gap-2",children:[e("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"})}),"Reset"]})]}),l("div",{className:"flex gap-3",children:[l("div",{className:"flex-1 bg-white/5 rounded-lg px-3 py-2 border border-white/5",children:[e("div",{className:"text-[10px] text-white/40 uppercase tracking-wider",children:"Frame"}),e("div",{className:"text-sm font-mono text-white",children:b.toLocaleString()})]}),l("div",{className:"flex-1 bg-white/5 rounded-lg px-3 py-2 border border-white/5",children:[e("div",{className:"text-[10px] text-white/40 uppercase tracking-wider",children:"Time"}),l("div",{className:"text-sm font-mono text-white",children:[_.toFixed(3),"s"]})]}),l("div",{className:"flex-1 bg-white/5 rounded-lg px-3 py-2 border border-white/5",children:[e("div",{className:"text-[10px] text-white/40 uppercase tracking-wider",children:"Count"}),e("div",{className:"text-sm font-mono text-white",children:c.toLocaleString()})]})]}),l("div",{className:"space-y-3",children:[l(J,{title:"Particles",icon:N,children:[e(C,{label:"Count",value:c,min:100,max:1e4,step:100,onChange:d}),e(ve,{label:"Size Distribution",value:a.radiusDistribution,options:[{value:"mono",label:"Monosize"},{value:"uniform",label:"Uniform"},{value:"normal",label:"Normal (Gaussian)"}],onChange:o=>t(n=>({...n,radiusDistribution:o}))}),a.radiusDistribution==="mono"&&e(C,{label:"Radius",value:a.radius,min:.02,max:.3,step:.01,onChange:o=>t(n=>({...n,radius:o}))}),a.radiusDistribution==="uniform"&&l("div",{className:"grid grid-cols-2 gap-3",children:[e(C,{label:"Min",value:a.radiusMin,min:.02,max:.3,step:.01,onChange:o=>t(n=>({...n,radiusMin:o}))}),e(C,{label:"Max",value:a.radiusMax,min:.02,max:.3,step:.01,onChange:o=>t(n=>({...n,radiusMax:o}))})]}),a.radiusDistribution==="normal"&&l(W,{children:[l("div",{className:"grid grid-cols-2 gap-3",children:[e(C,{label:"Mean",value:a.radiusMean,min:.02,max:.3,step:.01,onChange:o=>t(n=>({...n,radiusMean:o}))}),e(C,{label:"Std Dev",value:a.radiusStdDev,min:.01,max:.1,step:.005,onChange:o=>t(n=>({...n,radiusStdDev:o}))})]}),l("div",{className:"grid grid-cols-2 gap-3",children:[e(C,{label:"Min",value:a.radiusMin,min:.02,max:.3,step:.01,onChange:o=>t(n=>({...n,radiusMin:o}))}),e(C,{label:"Max",value:a.radiusMax,min:.02,max:.3,step:.01,onChange:o=>t(n=>({...n,radiusMax:o}))})]})]}),e(ve,{label:"Initial Setup",value:a.preset,options:p,onChange:o=>t(n=>({...n,preset:o}))})]}),l(J,{title:"Material",icon:v,defaultOpen:!1,children:[e(C,{label:"Stiffness",value:a.stiffness,min:1e3,max:5e4,step:1e3,onChange:o=>t(n=>({...n,stiffness:o}))}),l("div",{className:"grid grid-cols-2 gap-3",children:[e(C,{label:"Friction",value:a.friction,min:0,max:1,step:.05,onChange:o=>t(n=>({...n,friction:o}))}),e(C,{label:"Restitution",value:a.restitution,min:0,max:1,step:.05,onChange:o=>t(n=>({...n,restitution:o}))})]}),e(C,{label:"Tangent Ratio",value:a.tangentialRatio,min:.1,max:1,step:.05,onChange:o=>t(n=>({...n,tangentialRatio:o}))})]}),l(J,{title:"Environment",icon:w,defaultOpen:!1,children:[e(C,{label:"Gravity",value:a.gravity,min:-20,max:0,step:.1,unit:" m/s²",onChange:o=>t(n=>({...n,gravity:o}))}),e("p",{className:"text-[10px] text-white/30 leading-relaxed",children:"Time step and damping are auto-computed for numerical stability."})]}),l(J,{title:"Container",icon:P,defaultOpen:!1,children:[a.preset==="boxPacking"&&l("div",{className:"grid grid-cols-3 gap-3",children:[e(C,{label:"W",value:m.boxWidth,min:2,max:10,step:.5,onChange:o=>i(n=>({...n,boxWidth:o}))}),e(C,{label:"H",value:m.boxHeight,min:4,max:15,step:.5,onChange:o=>i(n=>({...n,boxHeight:o}))}),e(C,{label:"D",value:m.boxDepth,min:2,max:10,step:.5,onChange:o=>i(n=>({...n,boxDepth:o}))})]}),a.preset==="drum"&&l(W,{children:[e(C,{label:"RPM",value:a.drumRPM,min:0,max:60,step:1,onChange:o=>t(n=>({...n,drumRPM:o}))}),l("div",{className:"grid grid-cols-2 gap-3",children:[e(C,{label:"Radius",value:a.drumRadius,min:2,max:8,step:.1,onChange:o=>t(n=>({...n,drumRadius:o}))}),e(C,{label:"Length",value:a.drumLength,min:3,max:12,step:.5,onChange:o=>t(n=>({...n,drumLength:o}))})]}),e(C,{label:"Axis Height",value:a.drumCenterY,min:2,max:10,step:.1,onChange:o=>t(n=>({...n,drumCenterY:o}))})]})]})]}),e("div",{className:"pt-4 border-t border-white/5",children:l("div",{className:"flex items-start gap-3 text-[11px] text-white/30",children:[e("div",{className:"flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center",children:e("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:e("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:1.5,d:"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"})})}),l("p",{className:"leading-relaxed",children:["Hertz-Mindlin contact model with spatial hashing for O(N) collision detection.",e("span",{className:"block mt-1 text-white/20",children:"Drag to rotate • Scroll to zoom • Middle-click to pan"})]})]})})]})})}function at({particleCount:a,renderConfig:t,boxSize:m,physics:i,fieldType:c,onStateChange:d,onFieldRangeChange:h}){const[b,_,x,M]=qe({particleCount:a,boxSize:m}),p=g.useRef({min:1/0,max:-1/0}),N=g.useRef(c);return g.useEffect(()=>{N.current!==c&&(p.current={min:1/0,max:-1/0},N.current=c)},[c]),g.useEffect(()=>{if(!x||!M)return;let v=p.current.min,w=p.current.max,P=!1;const o=Math.max(1,Math.floor(a/500));if(c===0)for(let n=0;n<a;n+=o){const S=M[n*4],T=M[n*4+1],r=M[n*4+2],s=Math.sqrt(S*S+T*T+r*r);s<v&&(v=s,P=!0),s>w&&(w=s,P=!0)}else if(c===1)for(let n=0;n<a;n+=o){const S=x[n*4+3];S<v&&(v=S,P=!0),S>w&&(w=S,P=!0)}P&&(p.current={min:v,max:w},h({min:v,max:w}))},[x,M,a,c,h]),g.useEffect(()=>{d(b,_)},[b,_,d]),g.useEffect(()=>{_.updateConfig({radiusDistribution:i.radiusDistribution,radius:i.radius,radiusMin:i.radiusMin,radiusMax:i.radiusMax,radiusMean:i.radiusMean,radiusStdDev:i.radiusStdDev,stiffness:i.stiffness,tangentialRatio:i.tangentialRatio,dampingN:i.dampingN,dampingT:i.dampingT,friction:i.friction,restitution:i.restitution,gravity:i.gravity,dt:i.dt,preset:i.preset,containerType:i.containerType,drumRadius:i.drumRadius,drumLength:i.drumLength,drumRPM:i.drumRPM,drumCenterY:i.drumCenterY})},[i,_]),g.useEffect(()=>{_.reset(),p.current={min:1/0,max:-1/0},h({min:1/0,max:-1/0})},[i.preset,h]),b.error?null:l(W,{children:[e(ke,{positions:x,velocities:M,particleCount:a,config:t}),i.containerType==="drum"?e(et,{radius:i.drumRadius,length:i.drumLength,centerY:i.drumCenterY,rpm:i.drumRPM,time:b.time}):l(W,{children:[e(Qe,{size:m}),e(Je,{size:m})]})]})}function pt(){const a=Ee(),[t,m]=g.useState(5e3),[i,c]=g.useState({radiusDistribution:"uniform",radius:.1,radiusMin:.05,radiusMax:.15,radiusMean:.1,radiusStdDev:.02,stiffness:1e4,tangentialRatio:.5,dampingN:70,dampingT:35,friction:.5,restitution:.6,gravity:-9.81,dt:.001,preset:"boxPacking",containerType:"box",drumRadius:4,drumLength:6,drumRPM:15,drumCenterY:4.5}),[d,h]=g.useState({pointSize:1,gaussianSigma:.5,brightness:1.5,colorMode:1,fieldType:0,colormap:4,velocityScale:.5,blendMode:2}),[b,_]=g.useState({boxWidth:5,boxHeight:8,boxDepth:5}),[x,M]=g.useState({running:!1,frame:0,time:0}),[p,N]=g.useState(null),[v,w]=g.useState({min:0,max:1}),P=g.useCallback((r,s)=>{M(r),N(s)},[]),o=g.useCallback(r=>{w(r)},[]);g.useEffect(()=>{i.preset==="drum"&&i.containerType!=="drum"&&c(r=>({...r,containerType:"drum"})),i.preset==="boxPacking"&&i.containerType!=="box"&&c(r=>({...r,containerType:"box"}))},[i.preset,i.containerType]);const n=[b.boxWidth,b.boxHeight,b.boxDepth],S=g.useMemo(()=>{const r=de.find(s=>s.value===d.fieldType);return(r==null?void 0:r.label)||"Value"},[d.fieldType]),T=g.useMemo(()=>({pointSize:d.pointSize,minSize:.01,maxSize:.5,velocityScale:d.velocityScale,colorMode:d.colorMode,fieldType:d.fieldType,colormap:d.colormap,fieldMin:isFinite(v.min)?v.min:0,fieldMax:isFinite(v.max)?v.max:1,gaussianSigma:d.gaussianSigma,minAlpha:.01,blendMode:d.blendMode,brightness:d.brightness,baseColor:[1,1,1]}),[d,v]);return a===null?l("div",{className:"min-h-screen bg-primary",children:[e(oe,{}),e("div",{className:"flex items-center justify-center h-[calc(100vh-80px)]",children:e("div",{className:"text-secondary",children:"Detecting GPU capabilities..."})})]}):a.webgpu?l("div",{className:"min-h-screen bg-primary",children:[e(oe,{}),e("div",{className:"pt-16",children:e(Re,{items:[{label:"Home",path:"/"},{label:"Simulations",path:"/showcase/simulations"},{label:"Granular (DEM)"}]})}),e(tt,{physics:i,setPhysics:c,container:b,setContainer:_,particleCount:t,setParticleCount:m,isRunning:x.running,frame:x.frame,time:x.time,onToggle:()=>p==null?void 0:p.toggle(),onReset:()=>{p==null||p.reset(),w({min:1/0,max:-1/0})}}),l("section",{className:"w-full h-screen pt-20 pr-80 relative",children:[d.colorMode!==0&&d.colorMode!==2&&e($e,{colormap:d.colormap,min:isFinite(v.min)?v.min:0,max:isFinite(v.max)?v.max:1,label:S}),l("div",{className:"absolute top-24 right-[328px] z-30 flex gap-2",children:[e("select",{value:d.fieldType,onChange:r=>h(s=>({...s,fieldType:parseInt(r.target.value)})),className:"bg-black/70 text-white text-sm px-2 py-1 rounded border border-white/20 backdrop-blur-sm cursor-pointer hover:border-white/40",children:de.map(({value:r,label:s})=>e("option",{value:r,children:s},r))}),e("select",{value:d.colormap,onChange:r=>h(s=>({...s,colormap:parseInt(r.target.value)})),className:"bg-black/70 text-white text-sm px-2 py-1 rounded border border-white/20 backdrop-blur-sm cursor-pointer hover:border-white/40",children:Se.map(({value:r,label:s})=>e("option",{value:r,children:s},r))})]}),l(ye,{dpr:[1,2],gl:{antialias:!0,powerPreference:"high-performance"},children:[e("color",{attach:"background",args:["#1a1a24"]}),e(Me,{makeDefault:!0,position:[10,8,10],fov:50}),e(Ce,{enableDamping:!0,dampingFactor:.05,target:i.containerType==="drum"?[0,i.drumCenterY,0]:[0,b.boxHeight/2,0],mouseButtons:{LEFT:re.ROTATE,MIDDLE:re.PAN,RIGHT:re.DOLLY}}),e("ambientLight",{intensity:.6}),e("directionalLight",{position:[10,10,5],intensity:.8}),e("directionalLight",{position:[-5,8,-5],intensity:.4}),e("pointLight",{position:[0,15,0],intensity:.5}),e(at,{particleCount:t,renderConfig:T,boxSize:n,physics:i,fieldType:d.fieldType,onStateChange:P,onFieldRangeChange:o},`dem-${t}-${n.join("-")}-${i.containerType}-${i.drumRadius}-${i.drumLength}`),e(Pe,{alignment:"bottom-left",margin:[80,80],children:e(De,{axisColors:["#ff4444","#44ff44","#4444ff"]})}),e(Fe,{className:"!absolute !left-4 !top-20"})]})]})]}):l("div",{className:"min-h-screen bg-primary",children:[e(oe,{}),e(Le,{})]})}export{pt as DEMSimulation,pt as default};
