"""Forward kinematics from the NVIDIA asset's authored USD joint frames."""
import numpy as np

class FR3:
 def __init__(self,model):
  self.model=model;self.joints=[]
  for item in model['joints']:
   j=dict(item);j['frame0']=np.array(j['frame0']);j['inverse1']=np.linalg.inv(j['frame1'])
   if j['type']=='PhysicsFixedJoint':j['fixed']=np.linalg.inv(model['zero_frames'][j['parent']])@np.array(model['zero_frames'][j['child']])
   self.joints.append(j)
  self.arm=[j for j in self.joints if j['type']=='PhysicsRevoluteJoint']
  self.limits=np.array([j['limits'] for j in self.arm]);self.tcp=np.array(model['hand_to_tcp'])
 def frames(self,q,opening=0.):
  frames={'/fr3/fr3_link0':np.eye(4)};index=0
  for j in self.joints:
   if j['type']=='PhysicsFixedJoint':
    frames[j['child']]=frames[j['parent']]@j['fixed'];continue
   m=np.eye(4)
   if j['type']=='PhysicsRevoluteJoint':
    a='XYZ'.index(j['axis']);angle=q[index];index+=1;c=np.cos(angle);s=np.sin(angle);b=(a+1)%3;d=(a+2)%3
    m[b,b]=c;m[d,d]=c;m[b,d]=-s;m[d,b]=s
   elif j['type']=='PhysicsPrismaticJoint':m['XYZ'.index(j['axis']),3]=opening
   frames[j['child']]=frames[j['parent']]@j['frame0']@m@j['inverse1']
  return frames
 def forward(self,q,opening=0.):return self.frames(q,opening)['/fr3/fr3_hand']@self.tcp
