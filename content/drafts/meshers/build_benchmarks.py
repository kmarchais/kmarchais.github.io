"""Draw the flagship Gyroid comparison from the verified frozen-mesh export."""
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

root = Path(__file__).resolve().parent
data = json.loads((root / 'gyroid-comparison.json').read_text())
actual = next(r for r in data['records'] if r['slug'] == 'gyroid-mmg')
native = next(r for r in data['records'] if r['slug'] == 'gyroid-meshers')
bg, panel, ink, muted = '#0b1a20', '#11272e', '#edf2ec', '#a1b8bc'
old, new, amber = '#a9b3c8', '#a6d9cc', '#d9ac72'
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 11, 'text.color': ink,
    'figure.facecolor': bg, 'axes.facecolor': panel, 'axes.labelcolor': muted,
    'xtick.color': muted, 'ytick.color': muted, 'axes.spines.top': False,
    'axes.spines.right': False, 'axes.spines.left': False, 'axes.spines.bottom': False,
    'svg.hashsalt': 'meshers-gyroid-flagship'})
fig = plt.figure(figsize=(15, 11))
fig.text(.065, .965, 'MESHERS / GYROID UNIT CELL / TET4', color=amber, fontsize=11)
fig.text(.065, .918, 'Same cell. Comparable element budgets.', fontsize=27)
fig.text(.065, .882, 'Meshers', color=new, fontsize=12)
fig.text(.175, .882, 'Microgen + MMG', color=old, fontsize=12)

ax = fig.add_axes([.12, .64, .21, .16])
values = [native['generationSeconds'], actual['generationSeconds']]
ax.barh([1, 0], values, height=.4, color=[new, old])
ax.set_yticks([1, 0], ['Meshers', 'MMG']); ax.set_xlim(0, 2.5)
ax.set_xticks([0, 1, 2]); ax.set_xlabel('Seconds · lower is better')
ax.set_title('Generation time', loc='left', color=ink, pad=20)
for y, v in zip([1, 0], values):
    ax.text(v + .05, y, f'{v:.3f}', va='center')

ax = fig.add_axes([.425, .64, .21, .16])
y = np.arange(2)
for r, dy, color in [(native, .16, new), (actual, -.16, old)]:
    v = [r['tetrahedra'], r['nodes']]
    ax.barh(y + dy, np.array(v) / 1000, height=.29, color=color)
ax.set_yticks(y, ['Tets', 'Nodes']); ax.set_xlim(0, 14)
ax.set_xlabel('Thousands · same Tet4 order')
ax.set_title('Mesh size', loc='left', color=ink, pad=20)

ax = fig.add_axes([.735, .64, .21, .16])
ax.scatter([native['maximumPairError'], actual['maximumPairError']], [1, 0], c=[new, old], s=80)
ax.axvline(1e-10, color=amber, ls='--', lw=1)
ax.set_xscale('log'); ax.set_xlim(1e-17, 1e-9)
ax.set_xticks([1e-16, 1e-13, 1e-10]); ax.minorticks_off()
ax.set_yticks([1, 0], ['Meshers', 'MMG']); ax.set_ylim(-.6, 1.6)
ax.set_title('Periodic node error', loc='left', color=ink, pad=20)
ax.set_xlabel('Cell lengths · gate at 10⁻¹⁰')
for axis in fig.axes:
    axis.tick_params(length=0); axis.grid(axis='x', alpha=.1); axis.set_axisbelow(True)

ax = fig.add_axes([.12, .255, .34, .265])
keys = ['min', 'p10', 'mean', 'median', 'p90', 'max']; ys = np.arange(6)
a = [actual['qualityStats'][k] for k in keys]
n = [native['qualityStats'][k] for k in keys]
for y, x1, x2 in zip(ys, a, n):
    ax.plot([x1, x2], [y, y], color='#46616a', lw=2)
ax.scatter(a, ys, s=62, color=old, zorder=3)
ax.scatter(n, ys, s=62, color=new, zorder=3)
ax.axvline(.1, color=amber, ls='--', lw=1)
ax.set_yticks(ys, ['Minimum', 'P10', 'Mean', 'Median', 'P90', 'Maximum']); ax.invert_yaxis()
ax.set_xlim(-.02, 1.03); ax.set_xlabel('Tetrahedron quality · higher is better')
ax.set_title('Every requested quality statistic', loc='left', color=ink, pad=20)
ax.grid(axis='x', alpha=.1); ax.tick_params(length=0); ax.set_axisbelow(True)

ax = fig.add_axes([.595, .255, .35, .265])
for slug, color in [('gyroid-mmg', old), ('gyroid-meshers', new)]:
    r = json.loads((root.parent.parent.parent / 'public' / 'meshers' / f'{slug}.json').read_text())
    ax.plot(r['qualityCdf']['q'], np.array(r['qualityCdf']['fraction']) * 100, color=color, lw=2.5)
ax.axvline(.1, color=amber, ls='--', lw=1)
ax.set_xlim(0, 1); ax.set_ylim(0, 100); ax.set_xlabel('Tetrahedron quality')
ax.set_ylabel('Elements at or below this quality (%)')
ax.set_title('The whole quality distribution', loc='left', color=ink, pad=20)
ax.grid(alpha=.1); ax.tick_params(length=0)
fig.text(.065, .173, 'Both pass opposite-node and cap-triangulation matching. Oriented-face conflicts: Meshers 0 / MMG 4.', color=muted, fontsize=11)
fig.text(.065, .124, 'Both miss the strict 0.002 boundary target. This is not an accuracy-qualified speedup.', color=amber, fontsize=12)
fig.text(.065, .080, 'Five interleaved pair medians / Apple M4 / one numerical thread / fixed specimen.', color=muted, fontsize=10)
fig.text(.065, .050, 'Generation excludes independent audits and FEA. MMG also fails the quality, volume and oriented-facet gates.', color=muted, fontsize=10)
fig.text(.065, .024, 'Regular tetrahedron quality = 1.0. Dashed quality line = minimum gate 0.1. Statistics use original Float64 meshes.', color=muted, fontsize=10)
assets = root / 'assets'; assets.mkdir(exist_ok=True)
fig.savefig(assets / 'gyroid-metrics.png', dpi=160, facecolor=bg)
fig.savefig(assets / 'gyroid-metrics.svg', facecolor=bg, metadata={'Date': None})
p = assets / 'gyroid-metrics.svg'
p.write_text('\n'.join(line.rstrip() for line in p.read_text().splitlines()) + '\n')
plt.close(fig)
