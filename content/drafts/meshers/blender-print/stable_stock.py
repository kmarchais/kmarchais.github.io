"""All source tetrahedra on stable triangular faces, packed without overlap."""
import numpy as np

FACES=np.array([[1,2,3],[0,3,2],[0,1,3],[0,2,1]])

def rest_on_faces(points,tets,scale=.13,shrink=.965):
    cells=points[tets].astype(float);centers=cells.mean(1);local=(cells-centers[:,None,:])*scale*shrink
    triangles=local[:,FACES];a=triangles[:,:,0];e0=triangles[:,:,1]-a;e1=triangles[:,:,2]-a
    normals=np.cross(e0,e1);area=np.linalg.norm(normals,axis=2);normals/=area[:,:,None]
    # Outward orientation is independent of the source tetrahedron convention.
    inside=np.einsum('nfi,nfi->nf',normals,-a)>0;normals[inside]*=-1
    foot=-np.einsum('nfi,nfi->nf',-a,normals)[:,:,None]*normals
    v=foot-a;aa=np.einsum('nfi,nfi->nf',e0,e0);bb=np.einsum('nfi,nfi->nf',e1,e1);ab=np.einsum('nfi,nfi->nf',e0,e1)
    av=np.einsum('nfi,nfi->nf',e0,v);bv=np.einsum('nfi,nfi->nf',e1,v);denom=aa*bb-ab*ab
    u=(bb*av-ab*bv)/denom;w=(aa*bv-ab*av)/denom;stable=(u>=-1e-10)&(w>=-1e-10)&(u+w<=1+1e-10)
    assert np.all(stable.any(1))
    face=np.argmax(np.where(stable,area,-1),axis=1);rows=np.arange(len(cells));n=normals[rows,face]
    x=e0[rows,face];x/=np.linalg.norm(x,axis=1)[:,None];y=np.cross(n,x)
    basis=np.stack([x,y,n],axis=2);rotation=np.diag([1,-1,-1])@basis.transpose(0,2,1)
    flat=np.einsum('nij,nkj->nki',rotation,local);flat[:,:,2]-=flat[:,:,2].min(1)[:,None]
    contacts=np.isclose(flat[:,:,2],0,atol=1e-10).sum(1)
    assert np.all(contacts==3) and np.all(np.linalg.det(rotation)>.999999)
    assert np.all(flat[:,:,2].max(1)>0)
    return local,rotation,flat,face,stable[rows,face]

def pack_ring(flat,outer=1.,inner=.36,padding=.0007):
    lo=flat[:,:,:2].min(1);hi=flat[:,:,:2].max(1);size=hi-lo+padding
    order=np.argsort(-size[:,1],kind='stable');positions=np.zeros((len(flat),3));shelf=-outer+padding;i=0;rectangles=np.empty((len(flat),4))
    while i<len(order):
        row_height=size[order[i],1];y=shelf
        if y+row_height>=outer:return None
        absmax=max(abs(y),abs(y+row_height));extent=np.sqrt(max(0,outer*outer-absmax*absmax))
        absmin=0 if y<=0<=y+row_height else min(abs(y),abs(y+row_height))
        hole=np.sqrt(max(0,inner*inner-absmin*absmin))
        intervals=[(-extent,-hole),(hole,extent)] if absmin<inner else [(-extent,extent)]
        for start,end in intervals:
            x=start
            while i<len(order) and x+size[order[i],0]<=end:
                j=order[i];width=size[j,0]
                positions[j,:2]=[x+padding/2,y+padding/2]-lo[j]
                rectangles[j]=[x,y,x+width,y+size[j,1]]
                x+=width;i+=1
        shelf+=row_height
    assert np.all(np.linalg.norm(flat[:,:,:2]+positions[:,None,:2],axis=2)<=outer+1e-9)
    # Independent broad-phase overlap control on every packed rectangle.
    from scipy.spatial import cKDTree
    center=(rectangles[:,:2]+rectangles[:,2:])/2
    radius=np.linalg.norm((rectangles[:,2:]-rectangles[:,:2])/2,axis=1).max()
    pairs=cKDTree(center).query_pairs(2*radius,output_type='ndarray')
    a,b=rectangles[pairs[:,0]],rectangles[pairs[:,1]]
    overlap=np.minimum(a[:,2:],b[:,2:])-np.maximum(a[:,:2],b[:,:2])
    assert not np.any(np.all(overlap>1e-10,axis=1))
    return positions,rectangles
