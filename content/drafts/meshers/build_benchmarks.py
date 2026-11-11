"""Draw the flagship Gyroid comparison from the verified frozen-mesh export."""
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

root=Path(__file__).resolve().parent
data=json.loads((root/'gyroid-comparison.json').read_text())
actual=next(r for r in data['records'] if r['slug']=='gyroid-mmg')
native=next(r for r in data['records'] if r['slug']=='gyroid-meshers')
bg,panel,ink,muted='#0b1a20','#11272e','#edf2ec','#a1b8bc'
old,new,amber='#a9b3c8','#a6d9cc','#d9ac72'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'text.color':ink,
 'figure.facecolor':bg,'axes.facecolor':panel,'axes.labelcolor':muted,'xtick.color':muted,'ytick.color':muted,
 'axes.spines.top':False,'axes.spines.right':False,'axes.spines.left':False,'axes.spines.bottom':False,
 'svg.hashsalt':'meshers-gyroid-flagship'})
fig=plt.figure(figsize=(14,8.5))
fig.text(.055,.956,'MESHERS / GYROID UNIT CELL / TET4',color=amber,fontsize=10)
fig.text(.055,.90,'Same cell. Comparable element budgets.',fontsize=25)
ax=fig.add_axes([.07,.51,.34,.24])
values=[native['generationSeconds'],actual['generationSeconds']]
ax.barh([0,1],values,height=.35,color=[new,old]);ax.set_yticks([0,1],['Meshers','Microgen\n+ MMG'])
ax.set_xlim(0,2.25);ax.set_xticks([]);ax.tick_params(length=0)
for y,v in enumerate(values):ax.text(v+.04,y,f'{v:.6f} s',va='center',color=ink)
ax.set_title('Generation time · five paired medians',loc='left',color=muted,pad=20)
ax=fig.add_axes([.55,.26,.40,.49])
keys=['min','p10','mean','median','p90','max'];ys=np.arange(6)
a=[actual['qualityStats'][k] for k in keys];n=[native['qualityStats'][k] for k in keys]
for y,x1,x2 in zip(ys,a,n):ax.plot([x1,x2],[y,y],color='#46616a',lw=2)
ax.scatter(a,ys,s=58,color=old,label='Microgen + MMG',zorder=3)
ax.scatter(n,ys,s=58,color=new,label='Meshers',zorder=3)
ax.axvline(.1,color=amber,linestyle='--',lw=1,label='Minimum-quality gate')
ax.set_yticks(ys,['Minimum','P10','Mean','Median','P90','Maximum']);ax.invert_yaxis()
ax.set_xlim(-.02,1.03);ax.set_xlabel('MMG-normalized tetrahedron quality')
ax.grid(axis='x',alpha=.1);ax.set_axisbelow(True);ax.tick_params(length=0)
ax.set_title('All six quality statistics',loc='left',color=muted,pad=20)
ax.legend(loc='upper center',bbox_to_anchor=(.5,-.19),ncol=1,frameon=False,labelcolor=muted,fontsize=9)
fig.text(.07,.405,'PERIODICITY AND MESH COHERENCE',color=amber,fontsize=9)
for i,(label,x,y) in enumerate([
 ('Tetrahedra',f"{actual['tetrahedra']:,}",f"{native['tetrahedra']:,}"),('Nodes',f"{actual['nodes']:,}",f"{native['nodes']:,}"),
 ('Opposite nodes','Match','Match'),('Cap triangulations','Match','Match'),
 ('Oriented face conflicts','4','0')]):
 h=.36-i*.042
 fig.text(.07,h,label,color=muted,fontsize=10)
 fig.text(.32,h,x,color=old,ha='right',fontsize=11)
 fig.text(.43,h,y,color=new,ha='right',fontsize=11)
fig.text(.32,.43,'MICROGEN + MMG',color=old,ha='right',fontsize=8)
fig.text(.43,.43,'MESHERS',color=new,ha='right',fontsize=8)
fig.text(.055,.085,'Both fail the strict 0.002 boundary target. MMG also fails quality, volume and oriented-facet gates.',color=amber,fontsize=10)
fig.text(.055,.048,'Apple M4 / one numerical thread / fixed specimen / generation excludes independent audits and FEA.',color=muted,fontsize=9)
fig.text(.055,.018,'Count-comparable raw measurements. This is not an accuracy-qualified speedup claim.',color=muted,fontsize=9)
assets=root/'assets';assets.mkdir(exist_ok=True)
fig.savefig(assets/'gyroid-metrics.png',dpi=180,facecolor=bg)
fig.savefig(assets/'gyroid-metrics.svg',facecolor=bg,metadata={'Date':None})
p=assets/'gyroid-metrics.svg';p.write_text('\n'.join(line.rstrip() for line in p.read_text().splitlines())+'\n')
plt.close(fig)
