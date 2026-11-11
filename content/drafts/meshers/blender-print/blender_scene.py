"""Native Blender/Metal studio scene: FDM timelapse, closed TPMS morph, native Tet4 edges."""
import argparse,hashlib,inspect,json,math,sys,textwrap,time
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
sys.path.insert(0,str(Path.home()/'bin'))
from pueue_progress import Job
sys.path.insert(0,str(Path(__file__).resolve().parent))
from tpms import fields
from surface_shading import loop_normals
import deposition

FPS=24

def smoothstep(u):
    u=max(0.,min(1.,u));return u*u*(3-2*u)

def material(name,color,metal=0.,rough=.4):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
    return m

def cube(name,loc,scale,mat,bevel=.02,parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat)
    if bevel:
        mod=o.modifiers.new('Machined edge','BEVEL');mod.width=bevel;mod.segments=3
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    if parent:o.parent=parent
    return o

def cylinder(name,loc,radius,depth,mat,parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=radius,depth=depth,location=loc)
    o=bpy.context.object;o.name=name;o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    if parent:o.parent=parent
    return o

def main():
    p=argparse.ArgumentParser();p.add_argument('--run',type=Path,required=True);p.add_argument('--frames',default='1-864');p.add_argument('--preview',action='store_true');p.add_argument('--out',type=Path);p.add_argument('--engine',choices=['cycles','eevee'],default='cycles');a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
    run=a.run.resolve();out=a.out or run/('preview' if a.preview else 'frames');out.mkdir(exist_ok=True)
    assert (run/'geometry/index.json').exists(),'Geometry preparation must finish before rendering'
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    scene=bpy.context.scene;scene.render.engine='CYCLES'
    prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='METAL'
    devices=prefs.get_devices_for_type('METAL')
    for d in devices:d.use=d.type=='METAL'
    assert prefs.has_active_device(),'No Metal GPU; refusing silent CPU fallback'
    scene.cycles.device='GPU';scene.cycles.samples=16 if a.preview else 32
    scene.cycles.use_denoising=True;scene.cycles.adaptive_threshold=.08
    scene.cycles.max_bounces=6;scene.cycles.transparent_max_bounces=6
    if a.engine=='eevee':
        scene.render.engine='BLENDER_EEVEE_NEXT'
        scene.eevee.taa_render_samples=32 if a.preview else 64
        scene.eevee.use_raytracing=False
    samples=scene.eevee.taa_render_samples if a.engine=='eevee' else scene.cycles.samples
    scene.render.threads_mode='FIXED';scene.render.threads=2
    scene.render.resolution_x=1080;scene.render.resolution_y=1350;scene.render.resolution_percentage=50 if a.preview else 100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
    scene.render.fps=FPS;scene.frame_start=1;scene.frame_end=864
    scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
    config={'script_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'deposition_sha256':hashlib.sha256(Path(__file__).with_name('deposition.py').read_bytes()).hexdigest(),
        'shading_sha256':hashlib.sha256(Path(__file__).with_name('surface_shading.py').read_bytes()).hexdigest(),
                'fields_sha256':hashlib.sha256(Path(__file__).with_name('tpms.py').read_bytes()).hexdigest(),
        'geometry_index_sha256':hashlib.sha256((run/'geometry/index.json').read_bytes()).hexdigest(),
        'engine':a.engine,'samples':samples,'preview':a.preview}
    config_path=out/'render-config.json'
    if config_path.exists():assert json.loads(config_path.read_text())==config,'Use a new frame folder after changing render inputs'
    else:config_path.write_text(json.dumps(config,indent=2)+'\n')
    scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.07,.11,.12,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.32
    polymer=material('Teal polymer',(.19,.48,.40),.08,.33)
    cap=material('Solid cut faces',(.28,.56,.47),.04,.37)
    bedmat=material('Textured build plate',(.026,.042,.048),.55,.48)
    alloy=material('Anodised aluminium',(.055,.065,.071),.85,.3)
    steel=material('Stainless steel',(.45,.49,.51),.9,.22)
    brass=material('Brass nozzle',(.65,.37,.11),.78,.27)
    dark=material('Fan housing',(.018,.023,.027),.3,.38)
    gridmat=material('Build plate grid',(.09,.14,.15),.6,.46)
    floor=cube('Studio floor',(0,0,-.26),(200,200,.08),material('Studio ground',(.013,.024,.028),.05,.5),0)
    cube('Printer base',(0,0,-.15),(1.98,2.45,.10),alloy,.025)
    cube('Front accent',(0,-1.226,-.14),(1.45,.003,.012),polymer,.002)
    for x in [-.78,.78]:
        for y in [-1.03,1.03]:cylinder('Rubber foot',(x,y,-.21),.055,.02,dark)
    for x in [-.50,.50]:
        cube('Y bed guide',(x,0,-.07),(.04,2.25,.04),steel,.004)
    bed_carriage=bpy.data.objects.new('Y bed carriage',None);scene.collection.objects.link(bed_carriage)
    bed=cube('Build plate',(0,0,-.005),(1.36,1.36,.07),bedmat,.012,bed_carriage)
    for x in [-.60,.60]:cube('Build area edge',(x,0,.0303),(.002,1.2,.0002),gridmat,0,bed_carriage)
    for y in [-.60,.60]:cube('Build area edge',(0,y,.0303),(1.2,.002,.0002),gridmat,0,bed_carriage)
    for x in [-.50,.50]:
        for y in [-.38,.38]:cube('Bed bearing',(x,y,-.055),(.10,.16,.06),dark,.007,bed_carriage)
    for x in [-.88,.88]:
        cube('Frame upright',(x,.18,.85),(.075,.095,1.9),alloy,.007)
        cylinder('Z lead screw',(x+.055*np.sign(x),.18,.85),.012,1.88,steel)
    cube('Top crossmember',(0,.18,1.80),(1.84,.095,.075),alloy,.007)
    gantry=[cube('Z bearing block',(x,.18,0),(.13,.16,.14),dark,.012) for x in [-.88,.88]]
    head=bpy.data.objects.new('FDM printhead',None);scene.collection.objects.link(head)
    bpy.ops.mesh.primitive_cone_add(vertices=64,radius1=.008,radius2=.046,depth=.085,location=(0,0,.045))
    nozzle=bpy.context.object;nozzle.name='Single extrusion nozzle';nozzle.data.materials.append(brass);nozzle.parent=head
    for q in nozzle.data.polygons:q.use_smooth=True
    cube('Heater block',(0,0,.115),(.13,.105,.065),steel,.008,head)
    cylinder('Heat break',(0,0,.18),.024,.09,steel,head)
    for i in range(7):cylinder('Heat-sink fin',(0,0,.21+.018*i),.065,.008,steel,head)
    cube('Cooling fan',(0,.09,.27),(.17,.075,.17),dark,.012,head)
    cube('Tool mounting plate',(0,.10,.35),(.20,.10,.12),alloy,.012,head)
    cube('X carriage bearing',(0,.18,.4),(.20,.11,.11),dark,.01,head)
    cylinder('Filament inlet',(0,0,.4),.022,.09,brass,head)
    cylinder('Filament',(0,0,.64),.009,.42,polymer,head)
    rail=cube('X carriage rail',(0,.18,.4),(1.76,.055,.055),steel,.004)
    printer_parts=[o for o in scene.objects if o!=floor]
    machine=bpy.data.objects.new('Printer assembly',None);scene.collection.objects.link(machine)
    for o in printer_parts:
        if o.parent is None:o.parent=machine
    # Hairline wireframe is generated from the actual exported surface triangles.
    native=np.load(run/'geometry/native.npz')
    nm=bpy.data.meshes.new('Original native boundary');nm.from_pydata(native['points'].tolist(),[],native['faces'].tolist());nm.update()
    wiremat=bpy.data.materials.new('Native mesh edge reveal');wiremat.use_nodes=True
    nodes=wiremat.node_tree.nodes;nodes.clear();bs=nodes.new('ShaderNodeBsdfPrincipled');bs.inputs['Base Color'].default_value=(.014,.04,.037,1);bs.inputs['Roughness'].default_value=.5
    tr=nodes.new('ShaderNodeBsdfTransparent');mix=nodes.new('ShaderNodeMixShader');output=nodes.new('ShaderNodeOutputMaterial')
    wiremat.node_tree.links.new(tr.outputs[0],mix.inputs[1]);wiremat.node_tree.links.new(bs.outputs[0],mix.inputs[2]);wiremat.node_tree.links.new(mix.outputs[0],output.inputs[0])
    wire=bpy.data.objects.new('Actual Meshers Tet4 edges',nm.copy());scene.collection.objects.link(wire);wire.data.materials.clear();wire.data.materials.append(wiremat)
    modifier=wire.modifiers.new('Original triangle edges','WIREFRAME');modifier.thickness=.0012;modifier.use_replace=True;modifier.use_boundary=True
    body=bpy.data.objects.new('Watertight TPMS solid',bpy.data.meshes.new('initial'));scene.collection.objects.link(body)
    model=bpy.data.objects.new('Unit cell',None);scene.collection.objects.link(model);body.parent=model;wire.parent=model;model.location.z=.53
    for name,loc,power,size,color in [('Warm key',(1,-2,4),360,3,(1,.88,.72)),('Cool rim',(-2,1.5,3),430,2,(.65,.9,1)),('Soft fill',(-1,-3,1.6),110,3,(.8,1,.92))]:
        light=bpy.data.lights.new(name,'AREA');light.energy=power;light.shape='DISK';light.size=size;light.color=color
        light.use_shadow_jitter=False
        o=bpy.data.objects.new(name,light);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,.5))-o.location).to_track_quat('-Z','Y').to_euler()
    camera=bpy.data.cameras.new('Portrait studio');cam=bpy.data.objects.new('Portrait studio',camera);scene.collection.objects.link(cam);scene.camera=cam
    camera.type='ORTHO';camera.ortho_scale=2.5
    cutter,deposit_modifier=deposition.create(body,model,polymer)
    records={r['frame']:r for r in json.loads((run/'geometry/index.json').read_text())}
    last=None
    def update(frame):
        nonlocal last
        video_t=(frame-1)/FPS;t=video_t-6
        printing=video_t<13.5
        body.hide_render=False;deposit_modifier.show_render=printing;deposit_modifier.show_viewport=printing
        if printing:file='gyroid.npz'
        elif t<17:file=records[min(408,max(181,int(round(frame-144))))]['file']
        else:file='native.npz'
        if file!=last:
            d=np.load(run/'geometry'/file);old=body.data
            m=bpy.data.meshes.new('Closed solid' if file!='native.npz' else 'Actual Meshers boundary');m.from_pydata(d['points'].tolist(),[],d['faces'].tolist());m.update()
            m.materials.append(polymer);m.materials.append(cap)
            xyz=d['points'];f=d['faces']
            flat=np.zeros(len(f),dtype=bool)
            for axis in range(3):
                for side in [-.5,.5]:flat|=np.all(np.abs(xyz[f,axis]-side)<2e-5,axis=1)
            m.polygons.foreach_set('use_smooth',~flat);m.polygons.foreach_set('material_index',flat.astype(np.int32));body.data=m
            loops=loop_normals(xyz.astype(float),f,flat)
            m.normals_split_custom_set(loops.reshape(-1,3).tolist())
            if old.users==0:bpy.data.meshes.remove(old)
            last=file
        move=smoothstep((t-7.5)/1.5)
        for o in printer_parts:o.hide_render=t>=9
        if printing:
            deposition.update(video_t,head,cutter)
            model.location.y=-head.location.y;bed_carriage.location.y=model.location.y
            head.location.y=0
        else:
            park=smoothstep((video_t-13.5)/.5)
            start=Vector(deposition.state(13.5)[2])+Vector((0,0,.53-.0025));start.y=0
            head.location=start.lerp(Vector((-.68,0,1.18)),park)
            bed_carriage.location.y=-deposition.state(13.5)[2][1]*(1-park)
            model.location.y=bed_carriage.location.y
        # The complete machine exits along the floor after the head parks.
        machine.location.y=4*smoothstep((video_t-14)/1)
        rail.location=(0,.18,head.location.z+.4)
        for o in gantry:o.location.z=head.location.z+.4
        cam.data.ortho_scale=3.5-1.0*move
        wire.hide_render=t<17;mix.inputs[0].default_value=smoothstep((t-17)/1.7)
        panel=smoothstep((t-18.5)/.8)*(1-smoothstep((t-27.5)/1))
        model.scale=(1-.50*panel,)*3;model.location.z=.53+.50*panel
        yaw=.30+.32*smoothstep((t-7.5)/1.5)+.20*smoothstep((t-9)/9)
        cam.location=(3.5*math.sin(yaw),-3.5*math.cos(yaw),2.45)
        cam.rotation_euler=(Vector((0,0,.48))-cam.location).to_track_quat('-Z','Y').to_euler()
    # Keep the .blend playable with its adjacent geometry cache. Blender may
    # require Run Script once when trusted script auto-execution is disabled.
    for module in ['deposition']:
        text=bpy.data.texts.new(module.upper()+'.py');text.write((Path(__file__).parent/(module+'.py')).read_text())
    normal_text=bpy.data.texts.new('SURFACE_SHADING.py');normal_text.write((Path(__file__).parent/'surface_shading.py').read_text())
    fields_text=bpy.data.texts.new('TPMS_FIELDS.py');fields_text.write((Path(__file__).parent/'tpms.py').read_text())
    driver=bpy.data.texts.new('PLAY_ANIMATION.py')
    header="""import bpy,json,math,numpy as np
FPS=24
from pathlib import Path
from mathutils import Vector
from bpy.app.handlers import persistent
run=Path(bpy.path.abspath('//'))
scene=bpy.context.scene
records={r['frame']:r for r in json.loads((run/'geometry/index.json').read_text())}
deposition=bpy.data.texts['DEPOSITION.py'].as_module()
cutter=bpy.data.objects['Nozzle swept reveal volume']
deposit_modifier=bpy.data.objects['Watertight TPMS solid'].modifiers['Smooth solid deposited behind nozzle']
field_module=bpy.data.texts['TPMS_FIELDS.py'].as_module()
fields=field_module.fields
loop_normals=bpy.data.texts['SURFACE_SHADING.py'].as_module().loop_normals
smoothstep=field_module.smoothstep
last=None
body=bpy.data.objects['Watertight TPMS solid']
wire=bpy.data.objects['Actual Meshers Tet4 edges']
model=bpy.data.objects['Unit cell']
head=bpy.data.objects['FDM printhead']
rail=bpy.data.objects['X carriage rail']
cam=scene.camera
polymer=bpy.data.materials['Teal polymer']
cap=bpy.data.materials['Solid cut faces']
mix=next(n for n in bpy.data.materials['Native mesh edge reveal'].node_tree.nodes if n.type=='MIX_SHADER')
machine=bpy.data.objects['Printer assembly']
printer_parts=list(machine.children_recursive)
bed_carriage=bpy.data.objects['Y bed carriage']
gantry=[o for o in printer_parts if o.name.startswith('Z bearing block')]
"""
    driver.write(header+textwrap.dedent(inspect.getsource(update)).replace('nonlocal last','global last')+"""
@persistent
def meshers_frame_update(scene):
    update(scene.frame_current)
bpy.app.handlers.frame_change_pre[:]=[h for h in bpy.app.handlers.frame_change_pre if h.__name__!='meshers_frame_update']
bpy.app.handlers.frame_change_pre.append(meshers_frame_update)
update(scene.frame_current)
""")
    driver.use_module=True
    scene.render.use_lock_interface=True
    frames=[]
    for part in a.frames.split(','):
        lo,_,hi=part.partition('-');frames+=list(range(int(lo),int(hi or lo)+1))
    with Job(parts=['frames']) as job:
        with job.part('frames') as part:
            start=time.monotonic();done=0
            part.update(0,'Starting native Blender render',force=True,samples=samples)
            def complete(path):
                try:
                    with path.open('rb') as file:
                        file.seek(-12,2)
                        return file.read()==bytes.fromhex('0000000049454e44ae426082')
                except (OSError,ValueError):return False
            todo=[f for f in frames if not complete(out/f'frame_{f:05d}.png')]
            done=len(frames)-len(todo);written=0
            def on_frame(scene):update(scene.frame_current)
            def on_write(scene):
                nonlocal done,written
                done+=1;written+=1
                part.update(done/len(frames),f'Blender frame {done}/{len(frames)}',frame=scene.frame_current,seconds_per_frame=(time.monotonic()-start)/written)
            bpy.app.handlers.frame_change_pre.append(on_frame);bpy.app.handlers.render_write.append(on_write)
            try:
                groups=[]
                for f in todo:
                    if groups and f==groups[-1][-1]+1:groups[-1].append(f)
                    else:groups.append([f])
                for group in groups:
                    scene.frame_start=group[0];scene.frame_end=group[-1]
                    scene.render.filepath=str(out/'frame_#####')
                    bpy.ops.render.render(animation=True)
            finally:
                bpy.app.handlers.frame_change_pre.remove(on_frame);bpy.app.handlers.render_write.remove(on_write)
            assert all(complete(out/f'frame_{f:05d}.png') for f in frames)
            scene.frame_start=1;scene.frame_end=864
            update(564);scene.frame_set(564)
            bpy.ops.wm.save_as_mainfile(filepath=str(run/'scene.blend'),compress=True)
            (run/'blender-receipt.json').write_text(json.dumps({'blender':bpy.app.version_string,'devices':[(d.name,d.type,d.use) for d in devices],
                'frames':len(frames),'samples':samples,'resolution':[scene.render.resolution_x,scene.render.resolution_y],
                'preview':a.preview,'engine':scene.render.engine,'smoothstep':'u*u*(3-2*u)','native_mesh_unmodified':True},indent=2)+'\n')
            job.result('blender-render',frames=len(frames),seconds=time.monotonic()-start,samples=samples)

if __name__=='__main__':main()
