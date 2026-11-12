"""Verify frozen inputs and extract review frames from the encoded FR3 film."""
import argparse,hashlib,json,shutil,subprocess,sys
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
sys.path.insert(0,str(Path.home()/'bin'))
from pueue_progress import Job

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
 p=argparse.ArgumentParser();p.add_argument('--run',type=Path,required=True);p.add_argument('--video',type=Path,required=True);p.add_argument('--cover',type=Path,required=True);a=p.parse_args();run=a.run.resolve();root=Path(__file__).resolve().parents[4];review=run/'encoded-review';review.mkdir(exist_ok=True);selected=[1,36,72,96,144,165,195,240,300,384,410,457,480,528,576,624,650,720,810,900]
 with Job(parts=['inputs','frames','encoded-review']) as job:
  with job.part('inputs') as part:
   binary=root/'public/meshers/gyroid-meshers.bin';meta=json.loads(binary.with_suffix('.json').read_text());assert sha(binary)==meta['binarySha256']=='f29e7295440d9760a522be0fbbcf7fdf8b4398e930e9257b075968a889577b39';content=binary.read_bytes();points=np.frombuffer(content,dtype=np.float32,count=meta['positionsBytes']//4).reshape(-1,3);tets=np.frombuffer(content,dtype=np.uint32,offset=meta['positionsBytes'],count=meta['tetrahedraBytes']//4).reshape(-1,4);stock=np.load(run/'all-tetrahedra-stock.npz');trajectory=np.load(run/'trajectory.npz');assert np.array_equal(points,stock['points']) and np.array_equal(tets,stock['tets']);assert np.array_equal(np.sort(trajectory['order']),np.arange(10832));assert np.all(10832-trajectory['picked']+(trajectory['carry']>=0)+trajectory['placed']==10832);audit=json.loads((run/'fr3-scene-verified.json').read_text());assert audit['source_cells']==10832 and not audit['collisions'];benchmark=root/'content/drafts/meshers/gyroid-comparison.json';assert sha(benchmark)=='7db5d221b0d5b4845f31fb3f15f14704e0dd1b541428813f0e1df73bba0165e3';part.update(1,'Frozen source and final scene verified',cells=10832,pose_frames=432)
  with job.part('frames') as part:
   files=sorted((run/'frames').glob('frame_*.png'));assert [f.name for f in files]==[f'frame_{i:05d}.png' for i in range(1,937)]
   for i,f in enumerate(files):
    with f.open('rb') as handle:handle.seek(-12,2);assert handle.read()==bytes.fromhex('0000000049454e44ae426082')
    part.update((i+1)/936,'Verify complete rendered PNGs',frames=i+1)
  with job.part('encoded-review') as part:
   verification=json.loads((run/'video-verified.json').read_text());assert verification['full_decode']=='passed' and verification['sha256']==sha(a.video);selector='select='+'+'.join(f'eq(n\\,{f-1})' for f in selected);subprocess.run(['ffmpeg','-y','-v','error','-threads','2','-i',str(a.video),'-vf',selector,'-fps_mode','vfr','-frames:v',str(len(selected)),'-threads','2',str(review/'selected_%03d.png')],check=True,timeout=120);contact=Image.new('RGB',(1080,1800),(11,26,32));draw=ImageDraw.Draw(contact)
   for i,f in enumerate(selected):
    source=review/f'selected_{i+1:03d}.png';dest=review/f'frame_{f:05d}.png';source.replace(dest);image=Image.open(dest);assert image.size==(1080,1350);image.thumbnail((270,337));x=i%4*270;y=i//4*360;contact.paste(image,(x,y));draw.text((x+8,y+340),f'Frame {f} · {(f-1)/24:.2f}s',fill='white');part.update((i+1)/len(selected),'Extract encoded phase frames',extracted=i+1)
   contact.save(run/'encoded-contact.png');shutil.copyfile(review/'frame_00410.png',a.cover)
   result=dict(finisher_sha256=sha(Path(__file__)),artifact=str(a.video.relative_to(root)),video_sha256=sha(a.video),video_bytes=a.video.stat().st_size,cover_sha256=sha(a.cover),probe=verification['probe'],full_decode='passed',encoded_review_frames=selected,assistant_visual_review='pending',source_mesh_sha256=sha(binary),benchmark_sha256=sha(benchmark),native_cells=10832,initial_stock=10832,all_initial_cells_stable=True,all_source_identities_conserved=True,source_arrays_bit_exact=True,display_shrink=.965,render=json.loads((run/'frames/receipt.json').read_text()),scene_audit_sha256=sha(run/'fr3-scene-verified.json'),trajectory_audit_sha256=sha(run/'trajectory-verified.json'),asset=json.loads(Path(__file__).with_name('fr3-asset-manifest.json').read_text()),scope='Robot assembly and TPMS morphs are illustrations; both coarse comparison meshes miss the strict boundary target. No FEA or reference promotion.')
   (run/'artifact-receipt.json').write_text(json.dumps(result,indent=2)+'\n');job.result('fr3-artifacts',frames=936,seconds=39,review_frames=len(selected),bytes=a.video.stat().st_size)
if __name__=='__main__':main()
