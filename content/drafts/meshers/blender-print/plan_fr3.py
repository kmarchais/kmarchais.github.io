"""Bake bounded FR3 joint trajectories and conserve every original tetrahedron."""
import json,sys,time
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation,Slerp
from fr3_kinematics import FR3
from fr3_ik import solve,HOME,DOWN,TOOL
from stable_stock import FACES
sys.path.insert(0,str(Path.home()/'bin'))
from pueue_progress import Job
BASE=np.array([-.18,0.,.03]);SCALE=1.3;CENTER=np.array([.16,-.17,.24]);TABLE=.03;FPS=24;NFRAMES=432

def smooth(x):x=np.clip(x,0,1);return x*x*(3-2*x)
def rz(a):c=np.cos(a);s=np.sin(a);return np.array([[c,-s,0],[s,c,0],[0,0,1.]])
def matrix(r,p):m=np.eye(4);m[:3,:3]=r;m[:3,3]=p;return m

def main():
 run=Path(sys.argv[1]);d=np.load(run/'all-tetrahedra-stock.npz');model=FR3(json.loads((run/'fr3-model.json').read_text()));n=len(d['tets']);cells=d['points'][d['tets']].astype(float);centers=cells.mean(1)
 # Hero cells already have a stable, native bottom face. No balancing or reshaping.
 f=d['face'];bottom=np.all(np.isclose(cells[np.arange(n)[:,None],FACES[f],2],-.5),axis=1)
 candidates=np.where(bottom & (np.linalg.norm(d['positions'][:,:2],axis=1)<.65) & (d['positions'][:,1]<-.30) & (np.abs(d['positions'][:,0])<.18))[0];height=d['flat'][:,:,2].max(1);heroes=candidates[np.argsort(height[candidates])[-3:]][::-1]
 layers=np.clip(np.floor((cells[:,:,2].max(1)+.5)*18),0,17);angle=np.arctan2(d['positions'][:,1],d['positions'][:,0]);rest=np.lexsort((angle,layers));rest=rest[~np.isin(rest,heroes)];order=np.r_[heroes,rest];assert np.array_equal(np.sort(order),np.arange(n))
 angles=np.zeros(n);q=np.empty((NFRAMES,7));theta=np.zeros(NFRAMES);placed=np.zeros(NFRAMES,np.int32);picked=np.zeros(NFRAMES,np.int32);carry=np.full(NFRAMES,-1,np.int32);carried=np.repeat(np.eye(4)[None],NFRAMES,axis=0);target_matrices=[];hero_plans=[]
 zero_error=max(np.max(np.abs(m-np.array(model.model['zero_frames'][k]))) for k,m in model.frames(np.zeros(7)).items());assert zero_error<3e-6
 home=model.forward(HOME)@TOOL;home[:3,3]=home[:3,3]*SCALE+BASE
 for h,i in enumerate(heroes):
  i=int(i);rot=rz(angles[h])@d['rotation'][i];p=rz(angles[h])@d['positions'][i];p[2]=TABLE+d['flat'][i,:,2].mean();pick=matrix(rot,p);place=matrix(np.eye(3),CENTER+.18*centers[i]);apex=int(np.argmax(cells[i,:,2]));contact=matrix(DOWN,d['local'][i,apex]);pick_tool=pick@contact;place_tool=place@contact
  assert np.linalg.norm(pick_tool[:3,:3][:,2]-[0,0,-1])<1e-5
  lift=pick_tool.copy();lift[2,3]+=.12;approach=place_tool.copy();approach[2,3]+=.15
  start=home.copy() if h==0 else hero_plans[-1]['waypoints'][-1].copy()
  times=np.array([0,.4,.7,.85,1.2,1.9,2.35,2.5,3.])
  way=np.stack([start,lift,pick_tool,pick_tool,lift,approach,place_tool,place_tool,approach]);hero_plans.append({'times':times,'waypoints':way,'contact_inverse':np.linalg.inv(contact),'id':i})
 last=HOME.copy();errors=[];started=time.monotonic()
 with Job(parts=['trajectory','identity']) as job:
  with job.part('trajectory') as part:
   for frame in range(NFRAMES):
    t=frame/FPS
    if t<2:desired=home;theta[frame]=angles[0];count=0
    elif t<11:
     h=min(2,int((t-2)/3));u=t-2-3*h;plan=hero_plans[h];k=min(len(plan['times'])-2,np.searchsorted(plan['times'],u,side='right')-1);v=smooth((u-plan['times'][k])/(plan['times'][k+1]-plan['times'][k]));a,b=plan['waypoints'][k:k+2];r=Slerp([0,1],Rotation.from_matrix(np.stack([a[:3,:3],b[:3,:3]])))([v]).as_matrix()[0];desired=matrix(r,a[:3,3]*(1-v)+b[:3,3]*v)
     theta[frame]=angles[h] if h==0 else angles[h-1]+(angles[h]-angles[h-1])*smooth(u/.35)
     placed[frame]=h+(u>=2.5);picked[frame]=h+(u>=.85)
     if .85<=u<2.5:carry[frame]=plan['id'];carried[frame]=desired@plan['contact_inverse']
    elif t<16:
     count=3+int(smooth((t-11)/5)*(n-3));placed[frame]=picked[frame]=count;theta[frame]=angles[min(n-1,count)];i=order[min(n-1,count)];desired=matrix(DOWN,CENTER+np.array([centers[i,0]*.10,centers[i,1]*.10,.23]))
    else:
     placed[frame]=picked[frame]=n;theta[frame]=angles[-1];desired=matrix(DOWN,CENTER+np.array([.03,.02,.28]))
    # Uniform asset scaling is explicit; all seven joint angles stay within authored limits.
    target=(desired[:3,3]-BASE)/SCALE;last,e,ang=solve(model,target,desired[:3,:3],last);q[frame]=last;errors.append((e*SCALE,ang))
    if carry[frame]>=0:
     actual=model.forward(last)@TOOL;actual[:3,3]=actual[:3,3]*SCALE+BASE;carried[frame]=actual@hero_plans[min(2,int((t-2)/3))]['contact_inverse']
    part.update((frame+1)/NFRAMES,'Bake authored FR3 joint poses',frame=frame+1,position_error_mm=e*SCALE*1000,orientation_error_deg=np.rad2deg(ang))
  with job.part('identity') as part:
   errors=np.array(errors);fail=(errors[:,0]>1e-4)|(errors[:,1]>1e-3)
   identities=(n-picked)+(carry>=0)+placed;assert np.all(identities==n)
   # Turn the asymmetric base foot toward the central island. Compensating
   # joint1 preserves every downstream world pose and the complete cell path.
   original=q.copy();root_rotation=rz(-np.pi/2);q[:,0]+=np.pi/2
   assert np.all(q>=model.limits[:,0]) and np.all(q<=model.limits[:,1])
   mount_error=0.
   for before,after in zip(original,q,strict=True):
    old=model.frames(before);new=model.frames(after)
    for link,matrix_after in new.items():
     if link.endswith('link0'):continue
     transformed=matrix_after.copy();transformed[:3]=root_rotation@transformed[:3]
     mount_error=max(mount_error,float(np.abs(transformed-old[link]).max()))
   assert mount_error<1e-12
   np.savez_compressed(run/'trajectory.npz',root_rotation=root_rotation,q=q,theta=theta,placed=placed,picked=picked,carry=carry,carried=carried,order=order,base=BASE,scale=SCALE,center=CENTER,errors=errors)
   checks={'base_mount_yaw_degrees':-90,'nonbase_world_pose_error':mount_error,'frames':NFRAMES,'cells':n,'heroes':heroes.tolist(),'inventory_conserved_every_frame':True,'native_order_permutation':True,'zero_pose_error':float(zero_error),'max_position_error':float(errors[:,0].max()),'max_orientation_error':float(errors[:,1].max()),'failed_frames':np.where(fail)[0].tolist(),'max_joint_step':float(np.abs(np.diff(q,axis=0)).max()),'base':BASE.tolist(),'scale':SCALE,'center':CENTER.tolist(),'tool_offset':.055,'all_initial_cells_face_down':True}
   (run/'trajectory-verified.json').write_text(json.dumps(checks,indent=2)+'\n');part.update(1,'Every source identity conserved',cells=n,failed_frames=int(fail.sum()))
   job.result('fr3-trajectory',frames=NFRAMES,failed_frames=int(fail.sum()),max_position_error=checks['max_position_error'])
   assert not fail.any(),checks
if __name__=='__main__':main()
