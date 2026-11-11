"""A stylized raster nozzle reveals one smooth solid, without extrusion beads."""
import bpy
import numpy as np

DURATION=13.5
LAYERS=12
ROWS=8
EXTENT=.6


def plan():
    moves=[];clock=[];elapsed=0.;last=None
    for layer in range(LAYERS):
        for row in range(ROWS):
            z=-.5+(layer+1)/LAYERS;y=-.5+(row+.5)/ROWS
            a=np.array([-EXTENT if row%2==0 else EXTENT,y,z])
            b=np.array([EXTENT if row%2==0 else -EXTENT,y,z])
            stroke=layer*ROWS+row
            if last is not None:
                elapsed+=.15;moves.append((last,a,stroke-1,False));clock.append(elapsed)
            elapsed+=1.;moves.append((a,b,stroke,True));clock.append(elapsed);last=b
    return moves,np.array(clock)


def state(t):
    moves,clock=plan();s=np.clip(t/DURATION,0,1)*clock[-1]
    index=min(int(np.searchsorted(clock,s,side='right')),len(moves)-1)
    a,b,stroke,drawing=moves[index];start=clock[index-1] if index else 0.
    u=float(np.clip((s-start)/(clock[index]-start),0,1))
    # Travel holds the completed footprint while the nozzle moves to its next row.
    progress=u if drawing else 1.
    return stroke,progress,a*(1-u)+b*u,drawing


def mask(stroke,u):
    layer,row=divmod(stroke,ROWS)
    lo=-.5+layer/LAYERS if layer else -.50001
    hi=-.5+(layer+1)/LAYERS
    y0=-.5+row/ROWS;y1=-.5+(row+1)/ROWS
    front=-EXTENT+2*EXTENT*u if row%2==0 else EXTENT-2*EXTENT*u
    # Keep a nonzero cell even at an exact stroke endpoint. It lies outside the
    # Gyroid's [-.5,.5] cube until the nozzle actually reaches the specimen.
    front=float(np.clip(front,-EXTENT+1e-7,EXTENT-1e-7))
    xs=[-EXTENT,front,EXTENT];ys=[-EXTENT,y0,y1,EXTENT]
    heights=np.full((2,3),lo)
    heights[:,0]=hi
    heights[0 if row%2==0 else 1,1]=hi
    vertices=[];faces=[];lookup={}
    def face(points):
        indices=[]
        for p in points:
            p=tuple(p)
            if p not in lookup:lookup[p]=len(vertices);vertices.append(p)
            indices.append(lookup[p])
        faces.append(indices)
    bottom=-.65
    for i in range(2):
        for j in range(3):
            x0,x1=xs[i:i+2];a,b=ys[j:j+2];h=heights[i,j]
            face([(x0,a,h),(x1,a,h),(x1,b,h),(x0,b,h)])
            face([(x0,b,bottom),(x1,b,bottom),(x1,a,bottom),(x0,a,bottom)])
            # A step face is emitted only by its higher cell.
            for di,dj,xy in [(-1,0,[(x0,b),(x0,a)]),(1,0,[(x1,a),(x1,b)]),
                             (0,-1,[(x0,a),(x1,a)]),(0,1,[(x1,b),(x0,b)])]:
                ni,nj=i+di,j+dj
                other=heights[ni,nj] if 0<=ni<2 and 0<=nj<3 else bottom
                if h>other:
                    (p,q),(r,s)=xy
                    levels=[other,lo,h] if other<lo<h else [other,h]
                    for z0,z1 in zip(levels,levels[1:]):
                        face([(p,q,z0),(r,s,z0),(r,s,z1),(p,q,z1)])
    return vertices,faces


def create(body,model,polymer):
    mesh=bpy.data.meshes.new('Nozzle swept reveal volume')
    cutter=bpy.data.objects.new('Nozzle swept reveal volume',mesh);bpy.context.scene.collection.objects.link(cutter)
    cutter.parent=model;cutter.hide_render=True;cutter.display_type='WIRE';mesh.materials.append(polymer)
    modifier=body.modifiers.new('Smooth solid deposited behind nozzle','BOOLEAN')
    modifier.operation='INTERSECT';modifier.solver='EXACT';modifier.object=cutter
    return cutter,modifier


def update(t,head,cutter):
    stroke,u,position,drawing=state(t)
    vertices,faces=mask(stroke,u)
    old=cutter.data;mesh=bpy.data.meshes.new('Current swept volume');mesh.from_pydata(vertices,[],faces);mesh.update()
    for mat in old.materials:mesh.materials.append(mat)
    cutter.data=mesh
    if old.users==0:bpy.data.meshes.remove(old)
    head.location=position+np.array([0,0,.53-.0025])
    return stroke,u,position,drawing
