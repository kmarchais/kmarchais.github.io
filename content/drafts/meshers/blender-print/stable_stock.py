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


def pack_concentric(flat, outer=1.22, inner=.37, padding=.00065, pickup_ids=()):
    """Pack stable cells in fixed concentric rows with six clear radial aisles."""
    from scipy.spatial import cKDTree
    center=flat[:,:,:2].mean(1)
    radii=np.linalg.norm(flat[:,:,:2]-center[:,None,:],axis=2).max(1)
    order=np.argsort(-radii,kind='stable');positions=np.zeros((len(flat),3));ring_ids=np.empty(len(flat),int)
    cursor=0;outside=outer;row=0
    while cursor<len(order):
        height=2*radii[order[cursor]]+padding
        radius=outside-height/2
        assert radius-height/2>=inner, 'All original cells must fit without rescaling'
        for sector in range(6):
            start=sector*np.pi/3+.025;end=(sector+1)*np.pi/3-.025
            ids=[];widths=[];used=0.
            while cursor<len(order):
                i=order[cursor];width=2*np.arcsin((radii[i]+padding/2)/radius)
                if used+width>end-start:break
                ids.append(i);widths.append(width);used+=width;cursor+=1
            if not ids:continue
            gap=(end-start-used)/(len(ids)+1);angle=start+gap
            for i,width in zip(ids,widths):
                a=angle+width/2
                positions[i,:2]=radius*np.array([np.cos(a),np.sin(a)])-center[i]
                ring_ids[i]=row;angle+=width+gap
        outside-=height;row+=1
    assert len(pickup_ids) in (0,3)
    for i,x in zip(pickup_ids,[-.06,0.,.06]):
        positions[i,:2]=[x,-.43]-center[i]
    slots=positions[:,:2]+center
    pairs=cKDTree(slots).query_pairs(2*radii.max()+padding,output_type='ndarray')
    gaps=np.linalg.norm(slots[pairs[:,0]]-slots[pairs[:,1]],axis=1)-radii[pairs[:,0]]-radii[pairs[:,1]]
    assert gaps.min()>0
    xy=flat[:,:,:2]+positions[:,None,:2]
    assert np.linalg.norm(xy,axis=2).max()<=outer+1e-8
    assert np.linalg.norm(slots,axis=1).min()-radii.max()>inner-.02
    rectangles=np.column_stack([xy.min(1),xy.max(1)])
    return positions,rectangles
