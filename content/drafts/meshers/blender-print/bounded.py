"""Bound the child, log its output, and report real completed-file progress with Job."""
import argparse,subprocess,sys,time
from pathlib import Path
import psutil
sys.path.insert(0,str(Path.home()/'bin'))
from pueue_progress import Job,report
p=argparse.ArgumentParser();p.add_argument('--timeout',type=float,required=True);p.add_argument('--log',type=Path,required=True)
p.add_argument('--units-dir',type=Path,required=True);p.add_argument('--pattern',default='frame_*.png');p.add_argument('--total',type=int,required=True)
p.add_argument('command',nargs=argparse.REMAINDER);a=p.parse_args()
a.log.parent.mkdir(parents=True,exist_ok=True)
command=a.command[1:] if a.command[:1]==['--'] else a.command
started=time.monotonic();started_wall=time.time();peak=0
with Job() as job,a.log.open('w') as log:
    job.update(0,'Starting bounded worker',force=True,eta_s=a.timeout,rss_gib=0)
    child=subprocess.Popen(command,stdout=log,stderr=subprocess.STDOUT,start_new_session=False)
    try:
        while child.poll() is None:
            try:
                processes=[psutil.Process(child.pid)]+psutil.Process(child.pid).children(recursive=True)
                rss=sum(proc.memory_info().rss for proc in processes if proc.is_running());peak=max(peak,rss)
            except psutil.Error:pass
            elapsed=time.monotonic()-started
            # The child's Job owns the global fraction and its part bars.
            # A second fraction here would compete with that measured plan.
            if elapsed>a.timeout or peak>12*1024**3:raise RuntimeError('Exceeded timeout or 12 GiB process-tree RSS ceiling')
            time.sleep(.5)
        if child.returncode:raise RuntimeError(f'Child failed with exit {child.returncode}')
        matches=list(a.units_dir.glob(a.pattern));assert len(matches)>=a.total,'Missing completed frame files'
        if a.pattern.endswith('.json') and '*' not in a.pattern:assert matches[0].stat().st_mtime>=started_wall,'Result receipt was not rewritten by this worker'
    except BaseException:
        try:
            descendants=psutil.Process(child.pid).children(recursive=True)
            for process in reversed(descendants):
                try:process.kill()
                except psutil.NoSuchProcess:pass
            child.kill();child.wait(timeout=10)
        except (ProcessLookupError,psutil.NoSuchProcess):pass
        print('\n'.join(a.log.read_text().splitlines()[-24:]),flush=True);raise
    job.update(1,'Complete',force=True,eta_s=0,peak_gib=peak/1024**3,elapsed_s=time.monotonic()-started)
# Job.__exit__ publishes an empty final values map; keep the measured totals
# visible after that finalizer rather than losing the queue's resource chips.
report(1,'Complete',eta_s=0,peak_gib=peak/1024**3,elapsed_s=time.monotonic()-started)
for line in a.log.read_text().splitlines():
    if '\x1b]7717;result;' in line:print(line,flush=True)
print(f'Completed in {time.monotonic()-started:.1f} s; peak process-tree RSS {peak/1024**3:.3f} GiB. Log: {a.log}',flush=True)
