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
    mesh=mesh.triangulate().clean(tolerance=0,absolute=True)
    faces=mesh.faces.reshape(-1,4)[:,1:]
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
    axis=np.linspace(-.5-1/72,.5+1/72,76)
    x,y,z=np.meshgrid(axis,axis,axis,indexing='ij')
    fs=fields(x,y,z);box=np.maximum.reduce([np.abs(x),np.abs(y),np.abs(z)])-.5
    image=pv.ImageData(dimensions=x.shape,spacing=(axis[1]-axis[0],)*3,origin=(axis[0],)*3)
    def project_walls(mesh,weights):
        # Project the curved boundary while keeping its box-face constraints.
        # This is display geometry, separate from the frozen comparison mesh.
        mesh=mesh.triangulate().clean(tolerance=0,absolute=True).triangulate(pass_verts=False,pass_lines=False)
        points=np.asarray(mesh.points,dtype=float).copy();original=points.copy();faces=mesh.faces.reshape(-1,4)[:,1:]
        caps=np.zeros((len(points),3),bool);cap_faces=np.zeros(len(faces),bool)
        for axis_id in range(3):
            for side in [-.5,.5]:
                at=np.all(np.abs(points[faces,axis_id]-side)<2e-6,axis=1)
                caps[np.unique(faces[at]),axis_id]=True;cap_faces|=at
        active=np.unique(faces[~cap_faces]);q=points[active].copy();constraints=caps[active]
        def f(p):return sum(a*b for a,b in zip(weights,fields(p[:,0],p[:,1],p[:,2])))
        for iteration in range(7):
            value=f(q);residual=np.abs(value)-.55;gradient=[]
            for axis_id in range(3):
                delta=np.zeros_like(q);delta[:,axis_id]=1e-5
                gradient.append((f(q+delta)-f(q-delta))/(2e-5)*np.sign(value))
            gradient=np.column_stack(gradient);gradient[constraints]=0
            move=residual[:,None]*gradient/np.maximum(np.sum(gradient**2,axis=1)[:,None],1e-14)
            length=np.linalg.norm(move,axis=1);move*=np.minimum(1,.015/np.maximum(length,1e-14))[:,None]
            q=np.clip(q-move,-.5,.5)
        points[active]=q
        # Separate samples on a box crease can converge to the same root.
        # Damp those moves instead of welding away their boundary topology.
        delta=points-original;blend=np.full(len(points),.999)
        for iteration in range(16):
            candidate=original+blend[:,None]*delta
            _,inverse,counts=np.unique(candidate.astype(np.float32),axis=0,return_inverse=True,return_counts=True)
            duplicates=counts[inverse]>1
            if not np.any(duplicates):break
            blend[duplicates]*=.5
        else:
            blend[duplicates]=0;candidate=original+blend[:,None]*delta
        mesh.points=candidate
        return mesh
    def morph(weights):
        image.point_data['field']=np.maximum(np.abs(sum(a*b for a,b in zip(weights,fs)))-.55,box).ravel(order='F')
        return project_walls(image.contour([0],scalars='field',method='flying_edges'),weights)
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
            selected=list(map(int,args.frames.split(','))) if args.frames else list(range(1,409))
            for i,frame in enumerate(selected):
                t=(frame-1)/24;head=[0.,0.,0.]
                if t<7.5:
                    h=-.48+.98*smoothstep(t/7.5)
                    mesh=base.clip_closed_surface(normal='-z',origin=(0,0,h),tolerance=1e-9).clean(tolerance=1e-9,absolute=True)
                    # Smooth XY motion with a small Z hop over a void. This is
                    # an accelerated deposition illustration, not slicer G-code.
                    hx=.38*np.sin(2*np.pi*.65*t);hy=.38*np.sin(2*np.pi*.95*t+.7)
                    void=max(0.,abs(float(fields(hx,hy,h)[0]))-.50)
                    head=[hx,hy,h+.025*float(smoothstep(void/.08))]
                    path=run/f'geometry/frame_{frame:05d}.npz'
                elif t<9:mesh=base;path=run/'geometry/gyroid.npz'
                else:
                    u=min((t-9)/2,3.999999);k=int(u);w=float(smoothstep(u-k));weights=[0.]*4;weights[k]=1-w;weights[(k+1)%4]+=w
                    mesh=morph(weights);path=run/f'geometry/frame_{frame:05d}.npz'
                if path.name!='gyroid.npz':mesh=save(mesh,path)
                receipt.append({'frame':frame,'file':path.name,'head':list(map(float,head)),
                    'height':float(h) if t<7.5 else .5,'vertices':mesh.n_points,'triangles':mesh.n_cells,'volume':mesh.volume})
                part.update((i+1)/len(selected),f'Closed curved solid {i+1}/{len(selected)}',vertices=mesh.n_points,triangles=mesh.n_cells)
            (run/'geometry/index.json').write_text(json.dumps(receipt))
            (run/'geometry/receipt.json').write_text(json.dumps({'display_method':'Print: curved Meshers Gyroid; morph: capped nodal fields with constrained wall projection; reveal: unchanged frozen Tet4',
                'frames':len(receipt),'all_edges_incidence':2,'native_display_mesh_sha256':meta['binarySha256'],'native_tetrahedra':meta['tetrahedra'],
                'morph':'abs((1-s)*fieldA+s*fieldB)<=0.55; s=u*u*(3-2*u); unit-box caps',
                'illustration_only':True,'timing_is_not_the_frozen_benchmark':True,
                'sources':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [Path(__file__),Path(__file__).with_name('tpms.py')]}},indent=2)+'\n')
            job.result('closed-solids',frames=len(receipt),all_edges_incidence=2)
if __name__=='__main__':main()
