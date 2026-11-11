"""Shared illustrative TPMS fields and cubic smoothstep."""
import numpy as np

def smoothstep(u):
    u=np.clip(u,0,1)
    return u*u*(3-2*u)

def fields(x,y,z):
    a,b,c=[2*np.pi*v for v in (x,y,z)]
    sx,sy,sz=np.sin(a),np.sin(b),np.sin(c)
    cx,cy,cz=np.cos(a),np.cos(b),np.cos(c)
    return [sx*cy+sy*cz+sz*cx, .72*(cx+cy+cz),
        1.15*(sx*sy*sz+sx*cy*cz+cx*sy*cz+cx*cy*sz),
        .27*(3*(cx+cy+cz)+4*cx*cy*cz)]
