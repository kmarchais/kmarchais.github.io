"""Add measured plots and legible titles to the Blender-rendered frames."""
import argparse,json,os,selectors,sys,time,subprocess
from pathlib import Path
from functools import lru_cache
from PIL import Image,ImageDraw,ImageFont
sys.path.insert(0,str(Path.home()/'bin'))
from pueue_progress import Job
BG=(11,26,32);INK=(237,242,236);MUTED=(161,184,188);TEAL=(166,217,204);SLATE=(169,179,200);BRASS=(217,172,114)
FONT=Path('/System/Library/Fonts/Supplemental')
HEADER=Image.new('RGBA',(1080,1350))
_header_draw=ImageDraw.Draw(HEADER)
for _y in range(300):
    _u=max(0,min(1,(_y-205)/95));_alpha=round(228*(1-_u*_u*(3-2*_u)))
    _header_draw.line((0,_y,1080,_y),fill=BG+(_alpha,))
@lru_cache(maxsize=32)
def font(size,bold=False):return ImageFont.truetype(str(FONT/('Arial Bold.ttf' if bold else 'Arial.ttf')),size)
def smoothstep(u):u=max(0,min(1,u));return u*u*(3-2*u)
def text(draw,xy,s,size=32,fill=INK,bold=False):draw.text(xy,s,font=font(size,bold),fill=fill)
def panel(d):d.rounded_rectangle((60,660,1020,1210),radius=22,fill=(15,36,42,250),outline=(54,79,82,255),width=2)
def time_chart(d,n,a,u):
    panel(d);text(d,(92,683),'Generation time',34,bold=True)
    maxv=2.2
    for y,r,c in [(760,n,TEAL),(852,a,SLATE)]:
        text(d,(92,y-3),r['name'],28,fill=c,bold=True)
        x=400;w=500*r['generationSeconds']/maxv
        d.rounded_rectangle((x,y,x+max(w*u,3*u),y+38),radius=5,fill=c)
        text(d,(x+w+16,y-2),f"{r['generationSeconds']:.3f} s",30,fill=c)
    text(d,(92,941),'Tetrahedra',30,bold=True)
    for y,r,c in [(995,n,TEAL),(1053,a,SLATE)]:
        text(d,(92,y),r['name'],28,fill=c)
        w=490*r['tetrahedra']/14000;d.rectangle((400,y,400+w*u,y+29),fill=c)
        text(d,(400+w+14,y-4),f"{r['tetrahedra']:,}",28,fill=c)
    text(d,(92,1138),'Five paired medians · Apple M4 · one thread',27,fill=MUTED)
    text(d,(92,1173),f"Nodes: {n['nodes']:,} Meshers · {a['nodes']:,} Microgen + MMG",25,fill=MUTED)
def quality_chart(d,n,a,u):
    panel(d);text(d,(92,680),'Element quality',34,bold=True)
    text(d,(580,686),'● Meshers',27,fill=TEAL);text(d,(780,686),'● Microgen + MMG',27,fill=SLATE)
    left,right=290,960
    for q in [0,.25,.5,.75,1]:
        x=left+q*(right-left);d.line((x,762,x,1070),fill=(55,78,83),width=1);text(d,(x-15,1083),f'{q:g}',24,fill=MUTED)
    x=left+.1*(right-left);d.line((x,762,x,1070),fill=BRASS,width=2)
    text(d,(92,723),'MMG-normalized q · gold line = gate 0.1',26,fill=MUTED)
    for i,k in enumerate(['min','p10','mean','median','p90','max']):
        y=778+i*54;text(d,(92,y-12),{'min':'Minimum','max':'Maximum'}.get(k,k.capitalize()),27,fill=MUTED)
        xa=left+a['qualityStats'][k]*(right-left);xn=left+n['qualityStats'][k]*(right-left)
        d.line((xa,y-5,xa+(xn-xa)*u,y-5+10*u),fill=(91,116,119),width=3)
        for x,c,dy in [(xa,SLATE,-5),(xn,TEAL+(int(255*u),),5)]:d.ellipse((x-7,y-7+dy,x+7,y+7+dy),fill=c)
    text(d,(92,1138),'Both match periodic nodes and cap triangles.',27,fill=MUTED)
    text(d,(92,1173),'Oriented-face conflicts: Meshers 0 · MMG 4',25,fill=MUTED)
def overlay(frame,n,a):
    video_t=(frame-1)/24;t=video_t*9/15 if video_t<15 else video_t-6;im=Image.new('RGBA',(1080,1350));d=ImageDraw.Draw(im)
    if t<19 or t>=28:
        d.rounded_rectangle((60,1125,1020,1320),radius=18,fill=(11,26,32,236))
    if t<9:
        title='From a field to a solid.'
        text(d,(76,117),title,62,bold=True)
        text(d,(76,1190),'A Gyroid unit cell, printed layer by layer.',35,bold=True)
        text(d,(76,1250),'Stylized deposition · smooth solid · accelerated',27,fill=MUTED)
    elif t<17:
        text(d,(76,117),'One cell. Many geometries.',59,bold=True)
        names=['Gyroid','Schwarz P','Diamond','Neovius','Gyroid'];k=min(3,int((t-9)/2))
        text(d,(76,1170),names[k]+' → '+names[k+1],42,bold=True)
        text(d,(76,1240),'Closed solids · smoothstep morph illustration',29,fill=MUTED)
    elif t<19:
        text(d,(76,117),'A volume mesh. Directly.',60,bold=True)
        text(d,(76,1170),'Original Meshers Tet4 connectivity',38,bold=True)
        text(d,(76,1240),'10,832 tetrahedra · 3,283 nodes · periodic',29,fill=MUTED)
    elif t<23:
        text(d,(76,117),'Less waiting. Fewer cells.',59,bold=True);time_chart(d,n,a,smoothstep((t-19)/.9))
    elif t<28:
        text(d,(76,117),'Inspect the weak elements.',56,bold=True);quality_chart(d,n,a,smoothstep((t-23)/1.))
    else:
        text(d,(76,117),'Meshers × Microgen',68,bold=True)
        text(d,(76,1150),'backend="meshers"',44,bold=True)
        text(d,(76,1220),'Optional backend · Rust + Python',30,fill=MUTED)
        text(d,(76,1270),'github.com/kmarchais/meshers',27,fill=BRASS)
    if 19<=t<28:
        d.rounded_rectangle((60,1242,1020,1305),radius=12,fill=(11,26,32,245))
        text(d,(76,1255),'Coarse Tet4 pair. Both miss the boundary target.',28,fill=BRASS)
    cuts=[0,15,23,25,29,34,36]
    start=max(v for v in cuts if v<=video_t);end=min(v for v in cuts if v>video_t)
    fade=min(smoothstep((video_t-start)/.25),smoothstep((end-video_t)/.25))
    im.putalpha(im.getchannel('A').point(lambda a:round(a*fade)))
    im=Image.alpha_composite(HEADER,im)
    text(ImageDraw.Draw(im),(76,54),'M E S H E R S',29,fill=BRASS,bold=True)
    return im

def main():
    p=argparse.ArgumentParser();p.add_argument('--run',type=Path,required=True);p.add_argument('--preview',action='store_true');p.add_argument('--source',type=Path);p.add_argument('--output',type=Path);a=p.parse_args()
    root=Path(__file__).resolve().parents[4]
    records=json.loads((root/'content/drafts/meshers/gyroid-comparison.json').read_text())['records']
    n=next(r for r in records if r['slug']=='gyroid-meshers');mmg=next(r for r in records if r['slug']=='gyroid-mmg')
    src=a.source or a.run/('preview' if a.preview else 'frames');out=a.run/('review' if a.preview else 'composite');out.mkdir(exist_ok=True)
    files=sorted(src.glob('frame_*.png'))
    if not a.preview:assert [p.name for p in files]==[f'frame_{f:05d}.png' for f in range(1,865)]
    with Job(parts=['composite']+(['encode','verify'] if a.output else [])) as job:
        with job.part('composite') as part:
            for i,path in enumerate(files):
                frame=int(path.stem.split('_')[-1]);dest=out/path.name
                base=Image.open(path).convert('RGBA');ov=overlay(frame,n,mmg)
                if base.size!=ov.size:ov=ov.resize(base.size,Image.Resampling.LANCZOS)
                Image.alpha_composite(base,ov).convert('RGB').save(dest)
                part.update((i+1)/len(files),f'Graphics {i+1}/{len(files)}',frames=i+1)
        if a.output:
            with job.part('encode') as part:
                part.update(0,'Encoding H.264 video',force=True)
                command=['ffmpeg','-y','-v','error','-progress','pipe:1','-nostats','-framerate','24','-threads','2',
                    '-i',str(out/'frame_%05d.png'),'-c:v','libx264','-threads','2','-pix_fmt','yuv420p','-crf','18',
                    '-maxrate','12M','-bufsize','24M','-movflags','+faststart',str(a.output)]
                process=subprocess.Popen(command,stdout=subprocess.PIPE)
                selector=selectors.DefaultSelector();selector.register(process.stdout,selectors.EVENT_READ)
                started=time.monotonic();buffer=b''
                try:
                    while process.poll() is None:
                        if time.monotonic()-started>180:raise subprocess.TimeoutExpired(command,180)
                        for key,event in selector.select(.5):
                            buffer+=os.read(key.fd,65536)
                            lines=buffer.split(b'\n');buffer=lines.pop()
                            for line in lines:
                                if line.startswith(b'frame='):
                                    count=int(line.split(b'=',1)[1]);part.update(min(count/864,1),'Encoding H.264',video_frames=count,elapsed_s=time.monotonic()-started)
                    if process.returncode:raise subprocess.CalledProcessError(process.returncode,command)
                finally:
                    selector.close()
                    if process.poll() is None:process.kill();process.wait()
                part.update(1,'Encoded',bytes=a.output.stat().st_size)
            with job.part('verify') as part:
                part.update(0,'Decoding the complete encoded film',force=True)
                probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0',
                    '-show_entries','stream=codec_name,width,height,pix_fmt,avg_frame_rate,nb_frames:format=duration,size',
                    '-of','json',str(a.output)],timeout=30))
                stream=probe['streams'][0]
                assert stream['codec_name']=='h264' and stream['pix_fmt']=='yuv420p'
                assert [stream['width'],stream['height']]==[1080,1350]
                assert stream['avg_frame_rate']=='24/1' and int(stream['nb_frames'])==len(files)
                assert abs(float(probe['format']['duration'])-len(files)/24)<.001
                subprocess.run(['ffmpeg','-v','error','-threads','2','-i',str(a.output),'-f','null','-'],check=True,timeout=120)
                (a.run/'video-verified.json').write_text(json.dumps({'probe':probe,'full_decode':'passed'},indent=2)+'\n')
                part.update(1,'Complete film decodes without errors',frames=len(files))
        job.result('composition',frames=len(files))
if __name__=='__main__':main()
