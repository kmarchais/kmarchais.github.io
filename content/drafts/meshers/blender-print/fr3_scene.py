"""NVIDIA FR3 assembles all actual Meshers cells from a face-down indexed tray."""
import argparse,hashlib,inspect,json,shutil,sys,textwrap,time
from pathlib import Path
import bpy,numpy as np
from mathutils import Matrix,Vector
sys.path.insert(0,str(Path(__file__).resolve().parent));sys.path.insert(0,str(Path.home()/'bin'))
from pueue_progress import Job
from fr3_kinematics import FR3
from stable_stock import FACES
from surface_shading import loop_normals
FPS=24

def smooth(x):x=np.clip(x,0,1);return x*x*(3-2*x)
def material(name,color,metal=0.,rough=.4):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=rough;return m
def cylinder(name,loc,r,depth,mat):
 bpy.ops.mesh.primitive_cylinder_add(vertices=128,radius=r,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(mat)
 for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
 bevel=o.modifiers.new('Precision edge','BEVEL');bevel.width=.003;bevel.segments=3;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o

def ring(name,inner,outer,bottom,top,mat):
 angle=np.arange(256)*2*np.pi/256;xy=np.column_stack([np.cos(angle),np.sin(angle)]);vertices=np.vstack([np.column_stack([xy*r,np.full(256,z)]) for r,z in [(inner,bottom),(outer,bottom),(inner,top),(outer,top)]])
 faces=[]
 for i in range(256):
  j=(i+1)%256
  faces.extend([(i,j,j+256,i+256),(i+512,i+768,j+768,j+512),(i,i+512,j+512,j),(i+256,j+256,j+768,i+768)])
 m=bpy.data.meshes.new(name);m.from_pydata(vertices.tolist(),[],faces);m.update();m.materials.append(mat);o=bpy.data.objects.new(name,m);bpy.context.scene.collection.objects.link(o);return o

def volume(name,xyz,faces,mat,ranks=None,keep_prefix=False):
 m=bpy.data.meshes.new(name);m.from_pydata(xyz.reshape(-1,3).tolist(),[],faces.tolist());m.update();m.materials.append(mat);o=bpy.data.objects.new(name,m);bpy.context.scene.collection.objects.link(o)
 if ranks is None:return o,None
 attr=m.attributes.new('assembly_rank','INT','FACE');attr.data.foreach_set('value',np.repeat(ranks,4).astype(np.int32))
 group=bpy.data.node_groups.new(name+' visibility','GeometryNodeTree');group.interface.new_socket(name='Geometry',in_out='INPUT',socket_type='NodeSocketGeometry');group.interface.new_socket(name='Geometry',in_out='OUTPUT',socket_type='NodeSocketGeometry');nodes=group.nodes;links=group.links;a=nodes.new('NodeGroupInput');b=nodes.new('NodeGroupOutput');delete=nodes.new('GeometryNodeDeleteGeometry');delete.domain='FACE';read=nodes.new('GeometryNodeInputNamedAttribute');read.data_type='INT';read.inputs['Name'].default_value='assembly_rank';compare=nodes.new('FunctionNodeCompare');compare.data_type='INT';compare.operation='GREATER_EQUAL' if keep_prefix else 'LESS_THAN';compare.name='Inventory count';links.new(read.outputs['Attribute'],compare.inputs[2]);links.new(compare.outputs[0],delete.inputs['Selection']);links.new(a.outputs[0],delete.inputs['Geometry']);links.new(delete.outputs[0],b.inputs[0]);mod=o.modifiers.new('Original cell inventory','NODES');mod.node_group=group;return o,compare

def build(run,preview=False,samples=32):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);scene=bpy.context.scene;scene.render.engine='CYCLES';prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='METAL';devices=prefs.get_devices_for_type('METAL')
 for device in devices:device.use=device.type=='METAL'
 assert prefs.has_active_device();scene.cycles.device='GPU';scene.cycles.samples=samples;scene.cycles.use_denoising=True;scene.cycles.max_bounces=6;scene.cycles.adaptive_threshold=.07;scene.render.threads_mode='FIXED';scene.render.threads=2;scene.render.resolution_x=1080;scene.render.resolution_y=1350;scene.render.resolution_percentage=50 if preview else 100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB';scene.render.fps=FPS;scene.frame_start=1;scene.frame_end=936;scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.09,.13,.16,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35
 alloy=material('Satin anodized aluminium',(.12,.15,.18),.75,.34);dark=material('Graphite fixtures',(.025,.035,.045),.4,.4);traymat=material('Indexed tray',(.025,.055,.065),.4,.48);poly=material('Teal ceramic cells',(.055,.27,.19),.02,.4);gold=material('Fine pickup adapter',(.55,.35,.13),.75,.28);seam=poly.copy();seam.name='Actual cells with visible mesh edges';nodes=seam.node_tree.nodes;links=seam.node_tree.links;wire=nodes.new('ShaderNodeWireframe');wire.use_pixel_size=True;wire.inputs['Size'].default_value=.65;color=nodes.new('ShaderNodeMixRGB');color.inputs[1].default_value=(.055,.27,.19,1);color.inputs[2].default_value=(.012,.03,.026,1);links.new(wire.outputs[0],color.inputs[0]);links.new(color.outputs[0],nodes.get('Principled BSDF').inputs['Base Color'])
 cylinder('Ground',(0,0,-.82),200,.08,material('Studio backdrop',(.013,.025,.032),.03,.55));cylinder('Grounded workcell base',(0,0,-.72),.70,.12,dark)
 for x in [-.43,.43]:
  for y in [-.43,.43]:cylinder('Supported workcell leg',(x,y,-.38),.045,.64,alloy)
 cylinder('Stationary support deck',(0,0,-.06),1.01,.10,alloy);carousel=ring('Indexed annular staging tray',.355,.99,-.01,.03,traymat);ring('Tray bright outer rim',.985,1.,-.013,.027,alloy);cylinder('Fixed central island',(0,0,.01),.355,.04,dark)
 t=np.load(run/'trajectory.npz');stock=np.load(run/'all-tetrahedra-stock.npz');order=t['order'];n=len(order);rank=np.empty(n,np.int32);rank[order]=np.arange(n)
 xyz=stock['flat']+stock['positions'][:,None,:];faces=np.tile(FACES,(n,1))+np.repeat(np.arange(n)*4,4)[:,None];local=stock['local'];det=np.linalg.det(local[:,1:]-local[:,:1]);faces[np.repeat(det<0,4)]=faces[np.repeat(det<0,4),::-1]
 loose,loose_count=volume('All 10832 original source cells on stable faces',xyz,faces,poly,rank);loose.location.z=.03;loose.parent=carousel
 cells=stock['points'][stock['tets']].astype(float);centers=cells.mean(1);assembled_xyz=.18*centers[:,None,:]+local;assembled,count=volume('Assembled original source cells',assembled_xyz,faces,seam,rank,True);assembled.location=t['center'];cylinder('Gyroid pedestal column',(t['center'][0],t['center'][1],.08),.095,.10,alloy);cylinder('Gyroid build pedestal',(t['center'][0],t['center'][1],.14),.14,.02,alloy);ring('Build pedestal lip',.136,.142,.146,.15,dark)
 held,unused=volume('One carried original source cell',local[order[0]],FACES.copy(),poly)
 morph=bpy.data.objects.new('Closed smooth TPMS morph',bpy.data.meshes.new('Initial closed morph'));scene.collection.objects.link(morph);morph.location=t['center'];morph.scale=(.18,.18,.18);cap=material('Smooth TPMS plane cuts',(.08,.32,.23),.02,.45);cap.use_fake_user=True;records={x['frame']:x for x in json.loads((run/'geometry/index.json').read_text())};last_morph=None
 metadata=json.loads((run/'fr3-model.json').read_text());model=FR3(metadata);meshdata=np.load(run/'fr3-meshes.npz');mats=[material('NVIDIA '+x['name'],x['color'],x['metallic'],max(.2,x['roughness'])) for x in metadata['materials']];robot=[]
 for item in metadata['meshes']:
  k=item['key'];mesh=bpy.data.meshes.new(item['name']);mesh.from_pydata(meshdata[k+'_points'].tolist(),[],meshdata[k+'_faces'].tolist());mesh.update()
  for mat in mats:mesh.materials.append(mat)
  mesh.polygons.foreach_set('material_index',meshdata[k+'_material_ids']);mesh.polygons.foreach_set('use_smooth',np.ones(len(mesh.polygons),bool));normals=meshdata[k+'_normals'];assert len(normals)==len(mesh.loops);mesh.normals_split_custom_set(normals.tolist());obj=bpy.data.objects.new('NVIDIA FR3 '+item['link'].rsplit('/',1)[-1],mesh);scene.collection.objects.link(obj);robot.append((obj,item['link']))
 tool=bpy.data.objects.new('Fine vacuum pickup tool',None);scene.collection.objects.link(tool)
 for name,z,r,depth,mat in [('Gripped tool shank',.003,.0105,.05,alloy),('Vacuum adapter',.034,.004,.018,gold),('Fine vacuum tip',.049,.0008,.012,gold)]:
  obj=cylinder(name,(0,0,z),r,depth,mat);obj.parent=tool
 for name,loc,power,size,col in [('Large warm softbox',(1,-2,4),650,3,(1,.91,.80)),('Cool edge',(-2,1.5,3),800,2,(.65,.85,1)),('Front fill',(-1,-3,2),180,3,(.8,1,.94))]:
  light=bpy.data.lights.new(name,'AREA');light.energy=power;light.shape='DISK';light.size=size;light.color=col;o=bpy.data.objects.new(name,light);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,.4))-o.location).to_track_quat('-Z','Y').to_euler()
 camera=bpy.data.cameras.new('Assembly director');cam=bpy.data.objects.new('Assembly director',camera);scene.collection.objects.link(cam);scene.camera=cam;camera.type='ORTHO';camera.lens=50
 root=np.eye(4);root[:3,:3]=(t['root_rotation'] if 'root_rotation' in t.files else np.eye(3))*float(t['scale']);root[:3,3]=t['base'];last_held=-1
 def update(frame):
  nonlocal last_held,last_morph
  f=max(0,min(431,frame-1));seconds=(frame-1)/24;frames=model.frames(t['q'][f],opening=.0105)
  for obj,link in robot:obj.matrix_world=Matrix(root@frames[link])
  tool.matrix_world=Matrix(root@model.forward(t['q'][f],opening=.0105));carousel.rotation_euler.z=t['theta'][f];loose_count.inputs[3].default_value=int(t['picked'][f]);count.inputs[3].default_value=int(t['placed'][f]);i=int(t['carry'][f]);held.hide_render=i<0;held.hide_viewport=i<0
  if i>=0:
   if i!=last_held:held.data.vertices.foreach_set('co',local[i].reshape(-1));held.data.update();last_held=i
   held.matrix_world=Matrix(t['carried'][f])
  is_morph=433<=frame<=624;morph.hide_render=not is_morph;morph.hide_viewport=not is_morph;assembled.hide_render=is_morph;assembled.hide_viewport=is_morph
  if is_morph:
   file=records[frame-216]['file']
   if file!=last_morph:
    data=np.load(run/'geometry'/file);xyz=data['points'];triangles=data['faces'];mesh=bpy.data.meshes.new('Closed TPMS solid');mesh.from_pydata(xyz.tolist(),[],triangles.tolist());mesh.update();mesh.materials.append(poly);mesh.materials.append(cap);flat=np.zeros(len(triangles),bool)
    for axis in range(3):
     for side in [-.5,.5]:flat|=np.all(np.abs(xyz[triangles,axis]-side)<2e-5,axis=1)
    mesh.polygons.foreach_set('material_index',flat.astype(np.int32));mesh.polygons.foreach_set('use_smooth',~flat);mesh.normals_split_custom_set(loop_normals(xyz.astype(float),triangles,flat).reshape(-1,3).tolist());old=morph.data;morph.data=mesh
    if old.users==0:bpy.data.meshes.remove(old)
    last_morph=file
   morph.rotation_euler.z=2*np.pi*smooth((frame-433)/191)
  center=t['center'];wide_target=np.array([0,0,.38]);wide_offset=np.array([1.7,-2.7,3.5]);target=wide_target;offset=wide_offset;zoom=2.8
  if seconds>=2:
   h=min(2,int((seconds-2)/3));u=(seconds-2)%3
   if seconds<11:
    # A wide first transfer establishes the professional arm; subsequent cuts show actual parts.
    if h==0:target=np.array([0,-.22,.30]);offset=np.array([1.7,-2.7,2.5]);zoom=1.65
    else:
     pick_id=int(order[h]);p=np.array([0,-np.linalg.norm(stock['positions'][pick_id,:2]),.045]);mix=smooth((u-1.1)/.95);target=p*(1-mix)+center*mix;target[2]+=.035;offset=np.array([1.5,-2.,1.55]);zoom=.22 if u<1.1 else .22+.10*smooth((u-1.1)/.9)
     if i>=0:target=t['carried'][f,:3,3]+np.array([0,0,.035])
   elif seconds<16:
    target=center+np.array([0,0,.07]);offset=np.array([1.5,-2.4,1.8]);zoom=.65
   else:
    target=center+np.array([0,0,.02]);offset=np.array([1.5,-2.4,1.5]);zoom=.32
  if is_morph:target=center+np.array([0,0,.02]);offset=np.array([1.5,-2.4,1.5]);zoom=.32
  if 625<=frame<=888:target=center+np.array([0,0,.02-.18*smooth((frame-625)/47)]);offset=np.array([1.5,-2.4,1.5]);zoom=.32+.48*smooth((frame-625)/47)
  cam.location=target+offset;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();camera.ortho_scale=zoom
  scene['stock_cells']=n-int(t['picked'][f]);scene['assembled_cells']=int(t['placed'][f]);scene['carried_source_id']=i;scene['source_inventory_total']=scene['stock_cells']+scene['assembled_cells']+int(i>=0)
 update(1)
 # A saved scene replays the same baked joints and exact source identities, without USD/SciPy.
 for name,source in [('FR3_KINEMATICS.py',Path(__file__).with_name('fr3_kinematics.py').read_text()),('FR3_MODEL.json',json.dumps(metadata)),('SURFACE_SHADING.py',Path(__file__).with_name('surface_shading.py').read_text())]:
  text=bpy.data.texts.get(name) or bpy.data.texts.new(name);text.clear();text.write(source)
 header="""import bpy,json,numpy as np
from pathlib import Path
from mathutils import Matrix,Vector
from bpy.app.handlers import persistent
run=Path(bpy.path.abspath('//'))
FR3=bpy.data.texts['FR3_KINEMATICS.py'].as_module().FR3
model=FR3(json.loads(bpy.data.texts['FR3_MODEL.json'].as_string()))
loop_normals=bpy.data.texts['SURFACE_SHADING.py'].as_module().loop_normals
records={x['frame']:x for x in json.loads((run/'geometry/index.json').read_text())}
morph=bpy.data.objects['Closed smooth TPMS morph'];assembled=bpy.data.objects['Assembled original source cells'];poly=bpy.data.materials['Teal ceramic cells'];cap=bpy.data.materials['Smooth TPMS plane cuts'];last_morph=None
t=np.load(run/'trajectory.npz');stock=np.load(run/'all-tetrahedra-stock.npz');order=t['order'];local=stock['local'];n=len(order)
root=np.eye(4);root[:3,:3]=(t['root_rotation'] if 'root_rotation' in t.files else np.eye(3))*float(t['scale']);root[:3,3]=t['base']
robot=[(bpy.data.objects['NVIDIA FR3 '+item['link'].rsplit('/',1)[-1]],item['link']) for item in model.model['meshes']]
scene=bpy.context.scene;cam=scene.camera;camera=cam.data
held=bpy.data.objects['One carried original source cell'];tool=bpy.data.objects['Fine vacuum pickup tool'];carousel=bpy.data.objects['Indexed annular staging tray']
loose_count=bpy.data.node_groups['All 10832 original source cells on stable faces visibility'].nodes['Inventory count']
count=bpy.data.node_groups['Assembled original source cells visibility'].nodes['Inventory count'];last_held=-1
def smooth(x):x=np.clip(x,0,1);return x*x*(3-2*x)
"""
 driver=bpy.data.texts.get('ASSEMBLY_DIRECTOR.py') or bpy.data.texts.new('ASSEMBLY_DIRECTOR.py');driver.clear();driver.write(header+textwrap.dedent(inspect.getsource(update)).replace('nonlocal last_held,last_morph','global last_held,last_morph')+"""
@persistent
def meshers_fr3_frame(scene):update(scene.frame_current)
bpy.app.handlers.frame_change_pre[:]=[h for h in bpy.app.handlers.frame_change_pre if h.__name__!='meshers_fr3_frame']
bpy.app.handlers.frame_change_pre.append(meshers_fr3_frame)
update(scene.frame_current)
""");driver.use_module=True
 return scene,update,{'robot':robot,'loose':loose,'assembled':assembled,'held':held,'model':model,'trajectory':t,'stock':stock,'root':root,'carousel':carousel,'devices':[(d.name,d.type,d.use) for d in devices]}

def main():
 p=argparse.ArgumentParser();p.add_argument('--run',type=Path,required=True);p.add_argument('--frames',default='1-936');p.add_argument('--preview',action='store_true');p.add_argument('--samples',type=int,default=24);p.add_argument('--out',type=Path);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);run=a.run.resolve();out=a.out or run/('preview' if a.preview else 'frames');out.mkdir(parents=True,exist_ok=True);scene,update,state=build(run,a.preview,a.samples);frames=[]
 for group in a.frames.split(','):
  lo,sep,hi=group.partition('-');frames.extend(range(int(lo),int(hi or lo)+1))
 config={'inputs':{name:hashlib.sha256((run/name).read_bytes()).hexdigest() for name in ['fr3-model.json','fr3-meshes.npz','all-tetrahedra-stock.npz','geometry/index.json']},'kinematics_sha256':hashlib.sha256(Path(__file__).with_name('fr3_kinematics.py').read_bytes()).hexdigest(),'shading_sha256':hashlib.sha256(Path(__file__).with_name('surface_shading.py').read_bytes()).hexdigest(),'source_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'trajectory_sha256':hashlib.sha256((run/'trajectory.npz').read_bytes()).hexdigest(),'samples':a.samples,'preview':a.preview};cfg=out/'render-config.json'
 if cfg.exists():assert json.loads(cfg.read_text())==config,'Use a fresh frame directory after changing inputs'
 else:cfg.write_text(json.dumps(config,indent=2)+'\n')
 with Job(parts=['frames']) as job:
  with job.part('frames') as part:
   start=time.monotonic()
   def complete(path):
    try:
     with path.open('rb') as file:file.seek(-12,2);return file.read()==bytes.fromhex('0000000049454e44ae426082')
    except (OSError,ValueError):return False
   todo=[f for f in frames if not complete(out/f'frame_{f:05d}.png')];done=len(frames)-len(todo)
   reused=[]
   for f in todo:
    reuse=(672 if 673<=f<=888 else 432 if 889<=f<=936 else None) if not a.preview else None
    if reuse and complete(out/f'frame_{reuse:05d}.png'):
     shutil.copyfile(out/f'frame_{reuse:05d}.png',out/f'frame_{f:05d}.png');reused.append([f,reuse]);done+=1;part.update(done/len(frames),'Reuse independently checked static hold',frame=f,reused=len(reused));continue
    update(f);scene.frame_set(f);scene.render.filepath=str(out/f'frame_{f:05d}.png');bpy.ops.render.render(write_still=True);done+=1;elapsed=time.monotonic()-start;part.update(done/len(frames),'Render professional FR3 assembly',frame=f,rendered=done,seconds_per_frame=elapsed/max(1,done-(len(frames)-len(todo))))
   assert all(complete(out/f'frame_{f:05d}.png') for f in frames)
   update(1);scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(run/'fr3-assembly.blend'),compress=True);(out/'receipt.json').write_text(json.dumps({'devices':state['devices'],'frames':frames,'native_cells':10832,'reused_static_holds':reused,'all_cells_initially_on_stable_faces':True,'samples':a.samples,'seconds':time.monotonic()-start},indent=2)+'\n');job.result('fr3-render',frames=len(frames),seconds=time.monotonic()-start)
if __name__=='__main__':main()
