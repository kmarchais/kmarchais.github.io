"""Prepare a curved Gyroid print, closed illustrative morphs, and the frozen Tet4 reveal."""
import argparse,hashlib,json,sys
from pathlib import Path
import numpy as np
import pyvista as pv
import meshers
from tpms import fields,smoothstep
sys.path.insert(0,str(Path.home()/'bin'))
from pueue_progress import Job

def save(mesh,path):
    # Blender stores coordinates as Float32. Snap roundoff at cube cuts and
    # merge at that precision before checking the topology that it will draw.
    points=np.asarray(mesh.points,dtype=np.float32).copy()
    for axis in range(3):
        for side in [-.5,.5]:points[np.abs(points[:,axis]-side)<1e-7,axis]=side
    mesh=mesh.copy();mesh.points=points
    mesh=mesh.clean(tolerance=1e-7,absolute=True).triangulate(pass_verts=False,pass_lines=False)
    mesh=mesh.triangulate().clean(tolerance=0,absolute=True)
    faces=mesh.faces.reshape(-1,4)[:,1:]
    p=mesh.points.astype(float)
    assert np.all(np.linalg.norm(np.cross(p[faces[:,1]]-p[faces[:,0]],p[faces[:,2]]-p[faces[:,0]]),axis=1)>0)
    edges=np.sort(np.concatenate([faces[:,[0,1]],faces[:,[1,2]],faces[:,[2,0]]]),axis=1)
    counts=np.unique(edges,axis=0,return_counts=True)[1]
    assert len(faces)>0 and np.all(counts==2),(path.name,np.unique(counts,return_counts=True))
    mesh=pv.PolyData(mesh.points,np.column_stack([np.full(len(faces),3),faces]).ravel())
    mesh=mesh.compute_normals(auto_orient_normals=True,consistent_normals=True,split_vertices=False)
    assert mesh.volume>0
    np.savez_compressed(path,points=np.asarray(mesh.points,dtype=np.float32),faces=mesh.faces.reshape(-1,4)[:,1:].astype(np.int32))
    return mesh

def main():
    p=argparse.ArgumentParser();p.add_argument('--run',type=Path,required=True);p.add_argument('--frames');args=p.parse_args()
    root=Path(__file__).resolve().parents[4]
    run=args.run;run.mkdir(parents=True,exist_ok=True);(run/'geometry').mkdir(exist_ok=True)
    def solid(weights):
        def field(x,y,z):return np.abs(sum(a*b for a,b in zip(weights,fields(x,y,z))))-.55
        m=meshers.generate(field,bounds=(-.5,.5)*3,cells=12,order=2,geometry_tolerance=1.,minimum_quality=.1,
            optimize_passes=1,max_tetrahedra=250000,periodic=(True,True,True))
        cells=np.column_stack([np.full(len(m.tetrahedra),10),m.tetrahedra]).ravel()
        u=pv.UnstructuredGrid(cells,np.full(len(m.tetrahedra),24,dtype=np.uint8),m.points)
        return u.extract_surface(nonlinear_subdivision=2,algorithm='dataset_surface').clean(tolerance=1e-9,absolute=True)
    # Morphing fields can pass through thin/singular configurations. Their
    # closed display boundaries are illustrations, never FE admission results.
    axis=np.linspace(-.609375,.609375,157)
    x,y,z=np.meshgrid(axis,axis,axis,indexing='ij')
    fs=fields(x,y,z);box=np.maximum.reduce([np.abs(x),np.abs(y),np.abs(z)])-.58
    image=pv.ImageData(dimensions=x.shape,spacing=(axis[1]-axis[0],)*3,origin=(axis[0],)*3)
    def morph(weights):
        image.point_data['field']=np.maximum(np.abs(sum(a*b for a,b in zip(weights,fs)))-.55,box).ravel(order='F')
        mesh=image.contour([0],scalars='field',method='flying_edges').triangulate().clean()
        mesh=mesh.compute_normals(auto_orient_normals=True,consistent_normals=True,split_vertices=False)
        # Cut the smooth wall with exact planes. Contouring max(field, box)
        # at the final cut creates stepped rims where the two fields meet.
        import trimesh
        cut=trimesh.Trimesh(vertices=mesh.points,faces=mesh.faces.reshape(-1,4)[:,1:],process=False)
        cut.fix_normals(multibody=True)
        for axis_id in range(3):
            for side in [-.5,.5]:
                origin=np.zeros(3);origin[axis_id]=side
                normal=np.zeros(3);normal[axis_id]=-np.sign(side)
                cut=cut.slice_plane(plane_origin=origin,plane_normal=normal,cap=True,engine='triangle')
                assert cut.is_watertight
        mesh=pv.PolyData(cut.vertices,np.column_stack([np.full(len(cut.faces),3),cut.faces]).ravel())
        return mesh
    with Job(parts=['native','closed-solids']) as job:
        with job.part('native') as part:
            meta=json.loads((root/'public/meshers/gyroid-meshers.json').read_text());b=(root/'public/meshers/gyroid-meshers.bin').read_bytes()
            assert hashlib.sha256(b).hexdigest()==meta['binarySha256']
            points=np.frombuffer(b,dtype=np.float32,count=meta['positionsBytes']//4).reshape(-1,3)
            offset=meta['positionsBytes']+meta['tetrahedraBytes']+meta['qualityBytes'];faces=np.frombuffer(b,dtype=np.uint32,offset=offset).reshape(-1,3)
            np.savez_compressed(run/'geometry/native.npz',points=points,faces=faces)
            part.update(1,'Frozen native boundary retained',tets=meta['tetrahedra'])
        with job.part('closed-solids') as part:
            base=save(solid([1,0,0,0]),run/'geometry/gyroid.npz');receipt=[]
            selected=list(map(int,args.frames.split(','))) if args.frames else list(range(181,409))
            for i,frame in enumerate(selected):
                t=(frame-1)/24;head=[0.,0.,0.]
                if t<9:mesh=base;path=run/'geometry/gyroid.npz'
                else:
                    u=min((t-9)/2,3.999999);k=int(u);w=float(smoothstep(u-k));weights=[0.]*4;weights[k]=1-w;weights[(k+1)%4]+=w
                    mesh=morph(weights);path=run/f'geometry/frame_{frame:05d}.npz'
                if path.name!='gyroid.npz':mesh=save(mesh,path)
                receipt.append({'frame':frame,'file':path.name,'head':list(map(float,head)),
                    'height':.5,'vertices':mesh.n_points,'triangles':mesh.n_cells,'volume':mesh.volume})
                part.update((i+1)/len(selected),f'Closed curved solid {i+1}/{len(selected)}',vertices=mesh.n_points,triangles=mesh.n_cells)
            (run/'geometry/index.json').write_text(json.dumps(receipt))
            (run/'geometry/receipt.json').write_text(json.dumps({'display_method':'Print: slicer G-code beads; morph: capped 128-cell nodal fields without vertex projection; reveal: unchanged frozen Tet4',
                'frames':len(receipt),'all_edges_incidence':2,'native_display_mesh_sha256':meta['binarySha256'],'native_tetrahedra':meta['tetrahedra'],
                'morph':'abs((1-s)*fieldA+s*fieldB)<=0.55; s=u*u*(3-2*u); unit-box caps',
                'illustration_only':True,'timing_is_not_the_frozen_benchmark':True,
                'sources':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [Path(__file__),Path(__file__).with_name('tpms.py')]}},indent=2)+'\n')
            job.result('closed-solids',frames=len(receipt),all_edges_incidence=2)
if __name__=='__main__':main()
