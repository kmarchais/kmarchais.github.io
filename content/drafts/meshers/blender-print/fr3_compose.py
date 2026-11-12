"""Editorial titles and measured plots for the 39-second NVIDIA FR3 film."""
import argparse,hashlib,json,os,selectors,subprocess,sys,time
from pathlib import Path
from PIL import Image,ImageDraw
from compose import HEADER,BRASS,MUTED,text,smoothstep,time_chart,quality_chart
sys.path.insert(0,str(Path.home()/'bin'))
from pueue_progress import Job
TOTAL=936

def overlay(frame,n,a):
 t=(frame-1)/24;im=Image.new('RGBA',(1080,1350));d=ImageDraw.Draw(im)
 if t<28 or t>=37:d.rounded_rectangle((60,1125,1020,1320),radius=18,fill=(11,26,32,236))
 if t<16:
  text(d,(76,117),'Some assembly required.',59,bold=True)
  text(d,(76,1170),'10,832 pieces. One patient robot.',37,bold=True)
  text(d,(76,1240),'Every tetrahedron starts on the tray.' if t<2 else 'Pick. Place. Repeat.' if t<11 else 'Assembly time-lapse · display seams exaggerated',28,fill=MUTED)
 elif t<18:
  text(d,(76,117),'A Gyroid, tetra by tetra.',59,bold=True);text(d,(76,1170),'Actual Meshers volume elements',37,bold=True);text(d,(76,1240),'Display seams exaggerated · source mesh unchanged',27,fill=MUTED)
 elif t<26:
  text(d,(76,117),'One cell. Many geometries.',59,bold=True);names=['Gyroid','Schwarz P','Diamond','Neovius','Gyroid'];k=min(3,int((t-18)/2));text(d,(76,1170),names[k]+' → '+names[k+1],42,bold=True);text(d,(76,1240),'Closed solids · smoothstep morph illustration',28,fill=MUTED)
 elif t<28:
  text(d,(76,117),'A volume mesh. Directly.',59,bold=True);text(d,(76,1170),'10,832 tetrahedra · 3,283 nodes',37,bold=True);text(d,(76,1240),'Source periodic · display seams exaggerated',28,fill=MUTED)
 elif t<32:
  text(d,(76,117),'Less waiting. Fewer cells.',59,bold=True);time_chart(d,n,a,smoothstep((t-28)/.9))
 elif t<37:
  text(d,(76,117),'Inspect the weak elements.',56,bold=True);quality_chart(d,n,a,smoothstep((t-32)/1.))
 else:
  text(d,(76,117),'Meshers × Microgen',68,bold=True);text(d,(76,1150),'backend="meshers"',44,bold=True);text(d,(76,1220),'Optional backend · Rust + Python',30,fill=MUTED);text(d,(76,1270),'github.com/kmarchais/meshers',27,fill=BRASS)
 if 28<=t<37:
  d.rounded_rectangle((60,1242,1020,1305),radius=12,fill=(11,26,32,245));text(d,(76,1255),'Coarse Tet4 pair. Both miss the boundary target.',28,fill=BRASS)
 cuts=[0,18,26,28,32,37,39];start=max(v for v in cuts if v<=t);end=min(v for v in cuts if v>t);fade=min(smoothstep((t-start)/.25),smoothstep((end-t)/.25));im.putalpha(im.getchannel('A').point(lambda x:round(x*fade)));im=Image.alpha_composite(HEADER,im);text(ImageDraw.Draw(im),(76,54),'M E S H E R S',29,fill=BRASS,bold=True);return im

def main():
 p=argparse.ArgumentParser();p.add_argument('--run',type=Path,required=True);p.add_argument('--source',type=Path);p.add_argument('--out',type=Path);p.add_argument('--output',type=Path);p.add_argument('--preview',action='store_true');a=p.parse_args();root=Path(__file__).resolve().parents[4];data=root/'content/drafts/meshers/gyroid-comparison.json';assert hashlib.sha256(data.read_bytes()).hexdigest()=='7db5d221b0d5b4845f31fb3f15f14704e0dd1b541428813f0e1df73bba0165e3';rows=json.loads(data.read_text())['records'];n=next(r for r in rows if r['slug']=='gyroid-meshers');mmg=next(r for r in rows if r['slug']=='gyroid-mmg');src=a.source or a.run/'frames';out=a.out or a.run/('review' if a.preview else 'composite');out.mkdir(parents=True,exist_ok=True);files=sorted(src.glob('frame_*.png'));assert files,'No rendered source frames'
 if not a.preview:assert [f.name for f in files]==[f'frame_{i:05d}.png' for i in range(1,TOTAL+1)]
 with Job(parts=['composite']+(['encode','verify'] if a.output else [])) as job:
  with job.part('composite') as part:
   for i,path in enumerate(files):
    frame=int(path.stem.split('_')[-1]);base=Image.open(path).convert('RGBA');titles=overlay(frame,n,mmg)
    if base.size!=titles.size:titles=titles.resize(base.size,Image.Resampling.LANCZOS)
    Image.alpha_composite(base,titles).convert('RGB').save(out/path.name);part.update((i+1)/len(files),'Compose titles and measured plots',frame=frame,frames=i+1)
  if a.output:
   with job.part('encode') as part:
    command=['ffmpeg','-y','-v','error','-progress','pipe:1','-nostats','-framerate','24','-threads','2','-i',str(out/'frame_%05d.png'),'-c:v','libx264','-threads','2','-pix_fmt','yuv420p','-crf','18','-maxrate','12M','-bufsize','24M','-movflags','+faststart',str(a.output)];process=subprocess.Popen(command,stdout=subprocess.PIPE);selector=selectors.DefaultSelector();selector.register(process.stdout,selectors.EVENT_READ);started=time.monotonic();buffer=b''
    try:
     while process.poll() is None:
      if time.monotonic()-started>180:raise TimeoutError('Video encoder exceeded 180 seconds')
      for key,event in selector.select(.5):
       buffer+=os.read(key.fd,65536);lines=buffer.split(b'\n');buffer=lines.pop()
       for line in lines:
        if line.startswith(b'frame='):count=int(line.split(b'=',1)[1]);part.update(min(count/TOTAL,1),'Encode H.264',video_frames=count,elapsed_s=time.monotonic()-started)
     assert process.returncode==0
    finally:
     selector.close()
     if process.poll() is None:process.kill();process.wait()
   with job.part('verify') as part:
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height,pix_fmt,avg_frame_rate,nb_frames:format=duration,size','-of','json',str(a.output)],timeout=30));s=probe['streams'][0];assert s['codec_name']=='h264' and s['pix_fmt']=='yuv420p';assert [s['width'],s['height']]==[1080,1350];assert s['avg_frame_rate']=='24/1' and int(s['nb_frames'])==TOTAL;assert abs(float(probe['format']['duration'])-39)<.001;subprocess.run(['ffmpeg','-v','error','-threads','2','-i',str(a.output),'-f','null','-'],check=True,timeout=120);(a.run/'video-verified.json').write_text(json.dumps({'probe':probe,'full_decode':'passed','sha256':hashlib.sha256(a.output.read_bytes()).hexdigest()},indent=2)+'\n');part.update(1,'Entire 39-second film decodes',frames=TOTAL,bytes=a.output.stat().st_size)
  job.result('fr3-composition',frames=len(files),encoded=bool(a.output))
if __name__=='__main__':main()
