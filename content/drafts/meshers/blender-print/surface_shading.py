"""Geometric split normals: smooth walls, flat caps, no opposing loop normals."""
import numpy as np

def loop_normals(points,faces,flat):
    cross=np.cross(points[faces[:,1]]-points[faces[:,0]],points[faces[:,2]]-points[faces[:,0]])
    length=np.linalg.norm(cross,axis=1);face=cross/np.maximum(length[:,None],1e-30)
    summed=np.zeros_like(points,dtype=float)
    for corner in range(3):np.add.at(summed,faces[~flat,corner],cross[~flat])
    summed/=np.maximum(np.linalg.norm(summed,axis=1)[:,None],1e-30)
    loops=summed[faces].copy();loops[flat]=face[flat,None,:]
    bad=np.einsum('fki,fi->fk',loops,face)<=.05
    loops[bad]=np.broadcast_to(face[:,None,:],loops.shape)[bad]
    return loops
