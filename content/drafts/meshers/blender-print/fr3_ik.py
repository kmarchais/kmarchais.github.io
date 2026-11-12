"""Bounded CPU inverse-kinematics controls for the authored FR3 joint limits."""
import json,sys
from pathlib import Path
import numpy as np
from scipy.optimize import least_squares
from scipy.spatial.transform import Rotation
from fr3_kinematics import FR3
sys.path.insert(0,str(Path.home()/'bin'))
from pueue_progress import Job

TOOL=np.eye(4);TOOL[2,3]=.055
DOWN=np.diag([1.,-1.,-1.])
HOME=np.array([0.,-.6,0.,-2.2,0.,1.6,.8])

def solve(model,target,orientation,previous=HOME):
 def residual(q):
  m=model.forward(q)@TOOL
  return np.r_[m[:3,3]-target,.2*Rotation.from_matrix(orientation@m[:3,:3].T).as_rotvec()]
 seeds=[previous,HOME.copy()]
 for yaw in [-1.5,-.7,.7,1.5]:
  q=HOME.copy();q[0]=yaw;seeds.append(q)
 best=None
 for seed in seeds:
  seed=np.clip(seed,model.limits[:,0]+1e-7,model.limits[:,1]-1e-7)
  result=least_squares(lambda q:np.r_[residual(q),.0005*(q-previous)],seed,bounds=model.limits.T,xtol=1e-10,ftol=1e-10,gtol=1e-10,max_nfev=180)
  r=residual(result.x);score=np.linalg.norm(np.r_[r,.0005*(result.x-previous)])
  if best is None or score<best[0]:best=(score,result.x,r)
  if np.linalg.norm(r[:3])<1e-5 and np.linalg.norm(r[3:])<2e-4:break
 return best[1],float(np.linalg.norm(best[2][:3])),float(np.linalg.norm(best[2][3:])/.2)

def main():
 run=Path(sys.argv[1]);model=FR3(json.loads((run/'fr3-model.json').read_text()));base=np.array([-.08,.08,.03]);scale=1.3
 q0=model.frames(np.zeros(7));error=max(np.abs(m-np.array(model.model['zero_frames'][k])).max() for k,m in q0.items());assert error<3e-6
 targets=[(0,-r,z) for r in [.37,.55,.75,.95] for z in [.04,.15,.35]]+[(.20,-.10,.12),(.20,-.10,.30),(.20,-.10,.45)]
 results=[];last=HOME
 with Job(parts=['IK-controls']) as job:
  with job.part('IK-controls') as part:
   for i,p in enumerate(targets):
    target=(np.array(p)-base)/scale;q,e,a=solve(model,target,DOWN,last);last=q
    results.append({'target':p,'q':q.tolist(),'position_error_world':e*scale,'orientation_error':a})
    part.update((i+1)/len(targets),'FR3 pose and reach controls',position_error_mm=e*scale*1000,orientation_error_deg=np.rad2deg(a))
  (run/'reach-controls.json').write_text(json.dumps({'zero_pose_error':error,'robot_scale':scale,'base':base.tolist(),'controls':results},indent=2)+'\n')
  failures=[v for v in results if v['position_error_world']>1e-4 or v['orientation_error']>1e-3]
  job.result('fr3-reach',controls=len(results),failures=len(failures),max_position_error=max(v['position_error_world'] for v in results))
  assert not failures,failures
if __name__=='__main__':main()
