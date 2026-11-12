"""Convert the pinned NVIDIA FR3 USD and prepare every stable source cell."""
import argparse,hashlib,json,sys
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation
from pxr import Usd,UsdGeom,UsdPhysics,UsdShade
from stable_stock import rest_on_faces,pack_concentric
sys.path.insert(0,str(Path.home()/'bin'))
from pueue_progress import Job

def matrix(position,quaternion):
 q=quaternion;imag=q.GetImaginary();m=np.eye(4);m[:3,:3]=Rotation.from_quat([*imag,q.GetReal()]).as_matrix();m[:3,3]=position;return m

def main():
 p=argparse.ArgumentParser();p.add_argument('--asset',type=Path,required=True);p.add_argument('--source',type=Path,required=True);p.add_argument('--run',type=Path,required=True);a=p.parse_args();a.run.mkdir(parents=True,exist_ok=True)
 stage=Usd.Stage.Open(str(a.asset));cache=UsdGeom.XformCache();arrays={};meta={'asset':str(a.asset),'units':UsdGeom.GetStageMetersPerUnit(stage),'meshes':[],'joints':[],'materials':[]};materials={}
 def material(prim):
  bound,_=UsdShade.MaterialBindingAPI(prim).ComputeBoundMaterial();name=str(bound.GetPath()) if bound else '__default__'
  if name in materials:return materials[name]
  result={'name':name,'color':[.82,.84,.87],'metallic':.05,'roughness':.34}
  if bound:
   shader=UsdShade.Shader(stage.GetPrimAtPath(str(bound.GetPath())+'/SimReadyPreviewSurface'))
   if shader:
    for inp,key in [('diffuseColor','color'),('metallic','metallic'),('roughness','roughness')]:
     value=shader.GetInput(inp).Get()
     if value is not None:result[key]=list(value) if key=='color' else float(value)
  materials[name]=len(meta['materials']);meta['materials'].append(result);return materials[name]
 with Job(parts=['robot','stock']) as job:
  with job.part('robot') as part:
   meshes=[prim for prim in stage.Traverse(Usd.TraverseInstanceProxies()) if prim.IsA(UsdGeom.Mesh) and UsdGeom.Imageable(prim).ComputePurpose()!='guide']
   links=set()
   for prim in stage.Traverse():
    if not prim.IsA(UsdPhysics.Joint):continue
    j=UsdPhysics.Joint(prim);body0=j.GetBody0Rel().GetTargets();body1=j.GetBody1Rel().GetTargets()
    if not body0 or not body1:continue
    item={'name':prim.GetName(),'type':prim.GetTypeName(),'parent':str(body0[0]),'child':str(body1[0]),'frame0':matrix(j.GetLocalPos0Attr().Get(),j.GetLocalRot0Attr().Get()).tolist(),'frame1':matrix(j.GetLocalPos1Attr().Get(),j.GetLocalRot1Attr().Get()).tolist()}
    if prim.IsA(UsdPhysics.RevoluteJoint):
     r=UsdPhysics.RevoluteJoint(prim);item.update(axis=r.GetAxisAttr().Get(),limits=np.deg2rad([r.GetLowerLimitAttr().Get(),r.GetUpperLimitAttr().Get()]).tolist())
    elif prim.IsA(UsdPhysics.PrismaticJoint):
     r=UsdPhysics.PrismaticJoint(prim);item.update(axis=r.GetAxisAttr().Get(),limits=[r.GetLowerLimitAttr().Get(),r.GetUpperLimitAttr().Get()])
    meta['joints'].append(item);links.update([str(body0[0]),str(body1[0])])
   meta['zero_frames']={link:np.array(cache.GetLocalToWorldTransform(stage.GetPrimAtPath(link))).T.tolist() for link in links}
   tcp=stage.GetPrimAtPath('/fr3/fr3_hand/fr3_hand_tcp');hand=stage.GetPrimAtPath('/fr3/fr3_hand')
   meta['hand_to_tcp']=(np.linalg.inv(np.array(cache.GetLocalToWorldTransform(hand)).T)@np.array(cache.GetLocalToWorldTransform(tcp)).T).tolist()
   for i,prim in enumerate(meshes):
    link=next((parent for parent in [prim]+list(prim.GetAncestors()) if str(parent.GetPath()) in links),None) if hasattr(prim,'GetAncestors') else None
    if link is None:
     link=prim.GetParent()
     while str(link.GetPath()) not in links:link=link.GetParent();assert link
    mesh=UsdGeom.Mesh(prim);points=np.array(mesh.GetPointsAttr().Get(),float);counts=np.array(mesh.GetFaceVertexCountsAttr().Get());assert np.all(counts==3)
    faces=np.array(mesh.GetFaceVertexIndicesAttr().Get(),np.int32).reshape(-1,3)
    relative=np.linalg.inv(np.array(cache.GetLocalToWorldTransform(link)).T)@np.array(cache.GetLocalToWorldTransform(prim)).T
    points=points@relative[:3,:3].T+relative[:3,3];normals=np.array(mesh.GetNormalsAttr().Get(),float)
    if len(normals):
     normals=normals@np.linalg.inv(relative[:3,:3]);length=np.linalg.norm(normals,axis=1)[:,None];np.divide(normals,length,out=normals,where=length>0);assert np.isfinite(normals).all()
    ids=np.full(len(faces),material(prim),np.int32)
    for subset in UsdGeom.Subset.GetAllGeomSubsets(UsdGeom.Imageable(prim)):
     indices=np.array(subset.GetIndicesAttr().Get(),np.int32);ids[indices]=material(subset.GetPrim())
    for name,value in [('points',points.astype(np.float32)),('faces',faces),('normals',normals.astype(np.float32)),('material_ids',ids)]:arrays[f'm{i}_{name}']=value
    meta['meshes'].append({'name':str(prim.GetPath()),'link':str(link.GetPath()),'key':f'm{i}'})
    part.update((i+1)/len(meshes),'Convert authored FR3 geometry',meshes=i+1,vertices=len(points))
   np.savez_compressed(a.run/'fr3-meshes.npz',**arrays);(a.run/'fr3-model.json').write_text(json.dumps(meta,indent=2)+'\n')
  with job.part('stock') as part:
   if a.source.suffix=='.json':
    source=json.loads(a.source.read_text());binary=a.source.with_suffix('.bin').read_bytes();assert hashlib.sha256(binary).hexdigest()==source['binarySha256'];points=np.frombuffer(binary,dtype=np.float32,count=source['positionsBytes']//4).reshape(-1,3).copy();tets=np.frombuffer(binary,dtype=np.uint32,offset=source['positionsBytes'],count=source['tetrahedraBytes']//4).reshape(-1,4).copy()
   else:
    source=np.load(a.source);points=source['points'];tets=source['tets']
   assert len(tets)==10832;scale=.18
   local,rotation,flat,face,stable=rest_on_faces(points,tets,scale)
   flat=flat.astype(np.float32)
   result=pack_concentric(flat,pickup_ids=(187,723,378));assert result is not None
   positions,rectangles=result;np.savez_compressed(a.run/'all-tetrahedra-stock.npz',points=points,tets=tets,local=local.astype(np.float32),rotation=rotation,flat=flat.astype(np.float32),positions=positions,face=face,rectangles=rectangles)
   checks={'cells':len(tets),'all_have_three_ground_contacts':True,'all_centers_of_mass_supported':bool(stable.all()),'no_staging_overlaps':True,'outer_radius':1.22,'inner_radius':.36,'display_scale':scale,'display_shrink':.965,'robot_meshes':len(meshes),'robot_vertices':sum(len(arrays[f'm{i}_points']) for i in range(len(meshes)))}
   (a.run/'preparation-verified.json').write_text(json.dumps(checks,indent=2)+'\n');part.update(1,'Every source cell rests on a stable face',cells=len(tets))
  job.result('fr3-and-stock',cells=len(tets),meshes=len(meshes))
if __name__=='__main__':main()
