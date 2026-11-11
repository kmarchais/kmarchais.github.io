"""Verify the saved Blender animation and its frozen native-mesh reveal."""
import json,sys
from pathlib import Path
import bpy,numpy as np
sys.path.insert(0,str(Path.home()/'bin'))
from pueue_progress import Job
run=Path(bpy.data.filepath).parent
text=bpy.data.texts['PLAY_ANIMATION.py']
source=text.as_string()
# Repair only missing embedded bindings in older scene-generator receipts.
if 'import math\n' not in source and ',math,' not in source:source='import math\n'+source
if '\nFPS=24\n' not in source:source='FPS=24\n'+source
text.clear();text.write(source);text.use_module=True
namespace={'__name__':'meshers_cache_playback'}
exec(compile(source,'PLAY_ANIMATION.py','exec'),namespace)
s=namespace['smoothstep'];eps=1e-5
assert s(0)==0 and s(.5)==.5 and s(1)==1
assert s(eps)/eps<1e-4 and (1-s(1-eps))/eps<1e-4
frames=[1,60,145,180,181,216,241,302,360,408,409,420,610,720]
checks=[];last_head=None
with Job(parts=['cache-playback']) as job:
 with job.part('cache-playback') as part:
  for i,frame in enumerate(frames):
   bpy.context.scene.frame_set(frame)
   body=bpy.data.objects['Watertight TPMS solid'];assert len(body.data.polygons)>0
   if frame==180:last_head=np.array(bpy.data.objects['FDM printhead'].location)
   if frame==181:assert np.linalg.norm(np.array(bpy.data.objects['FDM printhead'].location)-last_head)<1e-6
   if frame>=409:
    d=np.load(run/'geometry/native.npz');p=np.empty((len(body.data.vertices),3),np.float32)
    body.data.vertices.foreach_get('co',p.ravel());assert np.array_equal(p,d['points'])
    f=np.array([tuple(poly.vertices) for poly in body.data.polygons]);assert np.array_equal(f,d['faces'])
   checks.append({'frame':frame,'vertices':len(body.data.vertices),'faces':len(body.data.polygons)})
   part.update((i+1)/len(frames),'Saved Blender cache playback',frame=frame)
 bpy.ops.wm.save_as_mainfile(filepath=str(run/'scene.blend'),compress=True)
 (run/'playback-verified.json').write_text(json.dumps({'checks':checks,'native_positions_and_faces_exact':True,'printer_transition_continuous':True},indent=2)+'\n')
 job.result('cache-playback',frames=len(checks),native_exact=True)
