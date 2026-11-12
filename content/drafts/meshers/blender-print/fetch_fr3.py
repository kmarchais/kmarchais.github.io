"""Fetch the pinned, licensed NVIDIA FR3 asset with SHA256 verification."""
import argparse,hashlib,json,subprocess,sys
from pathlib import Path
sys.path.insert(0,str(Path.home()/'bin'))
from pueue_progress import Job
p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);a=p.parse_args();manifest=json.loads(Path(__file__).with_name('fr3-asset-manifest.json').read_text());total=sum(f['bytes'] for f in manifest['files']);done=0
with Job(parts=['download']) as job:
 with job.part('download') as part:
  for index,item in enumerate(manifest['files']):
   path=a.out/item['path'];path.parent.mkdir(parents=True,exist_ok=True)
   if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest()!=item['sha256']:
    temporary=path.with_suffix(path.suffix+'.partial');url=f"https://huggingface.co/datasets/{manifest['repository']}/resolve/{manifest['revision']}/{item['path']}";subprocess.run(['curl','-fLsS','--retry','2',url,'-o',str(temporary)],check=True,timeout=120);assert temporary.stat().st_size==item['bytes'];assert hashlib.sha256(temporary.read_bytes()).hexdigest()==item['sha256'];temporary.replace(path)
   done+=item['bytes'];part.update(done/total,'Verify pinned NVIDIA FR3 files',bytes=done,files=index+1)
 job.result('nvidia-fr3-asset',files=len(manifest['files']),bytes=done)
