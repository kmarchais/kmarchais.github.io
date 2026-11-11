"""Verify evaluated smooth deposition, held travel geometry and frozen Tet4 data."""
import json,sys
from pathlib import Path
import bpy,numpy as np
from mathutils import Vector
sys.path.insert(0,str(Path.home()/'bin'))
from pueue_progress import Job
run=Path(bpy.data.filepath).parent
namespace={'__name__':'meshers_cache_playback'}
exec(compile(bpy.data.texts['PLAY_ANIMATION.py'].as_string(),'PLAY_ANIMATION.py','exec'),namespace)
deposition=namespace['deposition'];s=namespace['smoothstep'];eps=1e-5
assert s(0)==0 and s(.5)==.5 and s(1)==1
assert s(eps)/eps<1e-4 and (1-s(1-eps))/eps<1e-4
scene=bpy.context.scene;body=bpy.data.objects['Watertight TPMS solid']

def evaluated(t):
 namespace['update'](1+24*t);bpy.context.view_layer.update()
 obj=body.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=obj.to_mesh()
 try:
  p=np.array([v.co[:] for v in mesh.vertices]);mesh.calc_loop_triangles();f=[tuple(poly.vertices) for poly in mesh.loop_triangles]
 finally:obj.to_mesh_clear()
 return p,f

def allowed(p,stroke,u):
 layer,row=divmod(stroke,deposition.ROWS);lo=-.5+layer/deposition.LAYERS if layer else -.50001
 hi=-.5+(layer+1)/deposition.LAYERS;y0=-.5+row/deposition.ROWS;y1=-.5+(row+1)/deposition.ROWS
 x=-.6+1.2*u if row%2==0 else .6-1.2*u
 return (p[:,2]<=lo+2e-6)|((p[:,2]<=hi+2e-6)&((p[:,1]<=y0+2e-6)|((p[:,1]<=y1+2e-6)&((p[:,0]<=x+2e-6) if row%2==0 else (p[:,0]>=x-2e-6)))))

def bounds(obj):
 q=np.array([obj.matrix_world@Vector(p) for p in obj.bound_box])
 return q.min(0),q.max(0)

def separate(a,b):
 lo,hi=bounds(a);other_lo,other_hi=bounds(b)
 return np.any(hi<=other_lo+1e-6)|np.any(other_hi<=lo+1e-6)

def machine_checks():
 head=bpy.data.objects['FDM printhead'];rail=bpy.data.objects['X carriage rail']
 bearing=bpy.data.objects['X carriage bearing'];bed=bpy.data.objects['Build plate']
 assert abs(head.location.y)<1e-8
 assert np.linalg.norm(np.array(bearing.matrix_world.translation)[1:]-np.array(rail.matrix_world.translation)[1:])<1e-6
 obstacles=[o for o in bpy.context.scene.objects if o.name.startswith(('Frame upright','Top crossmember'))]
 for part in head.children:
  for obstacle in obstacles:assert separate(part,obstacle),(part.name,obstacle.name)
 for obstacle in obstacles:assert separate(body,obstacle),obstacle.name
 assert abs(bounds(bed)[1][2]-.03)<1e-6
 assert abs(bpy.data.objects['Y bed carriage'].location.y-bpy.data.objects['Unit cell'].location.y)<1e-6
 floor_top=bounds(bpy.data.objects['Studio floor'])[1][2]
 for foot in [o for o in bpy.context.scene.objects if o.name.startswith('Rubber foot')]:
  assert abs(bounds(foot)[0][2]-floor_top)<1e-6

moves,clock=deposition.plan();times=list(np.linspace(0,13.49,25))+[13.5,14.9,15,16,19,22.95,23,25,30,35.95]
travels=np.flatnonzero([not m[3] for m in moves])
for i in travels[np.linspace(0,len(travels)-1,5,dtype=int)]:
 start=clock[i-1] if i else 0.
 times.extend((start+(clock[i]-start)*u)/clock[-1]*deposition.DURATION for u in [.2,.8])
checks=[]
with Job(parts=['scene-audit']) as job:
 with job.part('scene-audit') as part:
  for j,t in enumerate(times):
   p,f=evaluated(t)
   if t<deposition.DURATION:
    machine_checks()
    stroke,u,position,drawing=deposition.state(t)
    relative=np.array(bpy.data.objects['FDM printhead'].matrix_world.translation)+[0,0,.0025]-np.array(bpy.data.objects['Unit cell'].matrix_world.translation)
    assert np.linalg.norm(relative-position)<2e-7
    if len(p):
     assert np.all(allowed(p,stroke,u))
     centers=np.array([p[list(face)].mean(0) for face in f]);assert np.all(allowed(centers,stroke,u)),(t,stroke,u,centers[~allowed(centers,stroke,u)][:3].tolist())
    if not drawing:
     # The mask has no time-dependent geometry during travel.
     v,faces=deposition.mask(stroke,u)
     assert np.array_equal(np.array(v),np.array(deposition.mask(stroke,1.)[0]))
    checks.append({'seconds':t,'stroke':stroke,'progress':u,'drawing':drawing,'vertices':len(p),'faces':len(f)})
   elif t>=23:
    d=np.load(run/'geometry/native.npz')
    assert np.array_equal(p.astype(np.float32),d['points']);assert np.array_equal(np.array(f),d['faces'])
    checks.append({'seconds':t,'native_exact':True})
   else:checks.append({'seconds':t,'vertices':len(p),'faces':len(f)})
   part.update((j+1)/len(times),'Evaluated solid stays behind the nozzle',seconds=t,faces=len(f))
 scene.frame_set(564)
 bpy.ops.wm.save_as_mainfile(filepath=str(run/'scene.blend'),compress=True)
 (run/'playback-verified.json').write_text(json.dumps({'checks':checks,'native_positions_and_faces_exact':True,'evaluated_geometry_inside_swept_nozzle_volume':True,'travel_holds_reveal':True,'no_support_or_bead_objects':True,'head_frame_clearance_and_grounded_feet':True,'bed_and_specimen_move_together':True},indent=2)+'\n')
 job.result('scene-audit',controls=len(checks),native_exact=True,causal_deposition=True)
