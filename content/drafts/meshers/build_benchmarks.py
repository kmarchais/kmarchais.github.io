"""Export the frozen study measurements used by the article and its figures.

Run: python build_benchmarks.py /path/to/meshers
Only publication-safe metrics and source receipts are exported, not local paths.
"""
import argparse
import csv
import hashlib
import json
import subprocess
from collections import defaultdict
from pathlib import Path
from statistics import median

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parent
STUDY_COMMIT = '4eea25af3d6f0aa6f8eb15a60030458263224183'
SOURCES = {
    'solids': 'experiments/adaptive/runs/macbook-implicit-tet4-modified-repeated-v1/study/summary.json',
    'spinodoids': 'experiments/adaptive/runs/macbook-spinodoid-release-repeated-v1/study/summary.json',
}


def export(study):
    receipts, records = {}, []
    for family, relative in SOURCES.items():
        path = study / relative
        content = path.read_bytes()
        frozen = subprocess.check_output(['git', '-C', str(study), 'show', f'{STUDY_COMMIT}:{relative}'])
        assert content == frozen, f'Input differs from the frozen commit: {relative}'
        data = json.loads(content)
        assert data['complete']
        receipts[family] = {
            'sha256': hashlib.sha256(content).hexdigest(),
            'url': f'https://github.com/kmarchais/meshers/blob/{STUDY_COMMIT}/{relative}',
            'selection_sha256': data['selection_sha256'],
        }
        groups = defaultdict(list)
        for row in data['rows']:
            if row.get('warmup'):
                continue
            if family == 'solids' and row['case'] not in (
                'primitive-capsule', 'primitive-ellipsoid', 'primitive-sphere'
            ):
                continue
            groups[(row['case'], row['arm'])].append(row)
        for (case, route), rows in sorted(groups.items()):
            assert len(rows) == 5
            assert len({r['mesh_sha256'] for r in rows}) == 1
            row = rows[0]
            geometry = row['geometry']
            admitted = all(r['qualified'] for r in rows)
            if family == 'solids' or route != 'actual':
                assert admitted
                assert all(r['geometry']['distance_audit_complete'] for r in rows)
                assert abs(geometry['relative_volume_error']) <= .01
                assert geometry['sampled_two_sided_max'] <= .002
                assert geometry['q_min_corner'] >= .1
            records.append({
                'family': family, 'case': case, 'route': route,
                'recipe': row['config'], 'admitted_all_five': admitted,
                'repetitions': 5,
                'generation_seconds_median': median(r['generation_s'] for r in rows),
                'generation_seconds_all': [r['generation_s'] for r in rows],
                'tetrahedra': row['elements'], 'nodes': row['nodes'],
                'quality_min': geometry['q_min_corner'],
                'quality_median': row['quality_quantiles']['median'],
                'sampled_two_sided_distance': geometry.get('sampled_two_sided_max'),
                'absolute_volume_error_percent': abs(geometry['relative_volume_error']) * 100,
                'mesh_sha256': row['mesh_sha256'],
                'source': receipts[family]['url'],
            })
    result = {'study_commit': STUDY_COMMIT, 'source_receipts': receipts,
              'protocol': {'host': 'Apple M4 MacBook Pro', 'numerical_threads': 1,
                           'tetrahedron_order': 1, 'boundary_gate': .002,
                           'absolute_volume_gate_percent': 1, 'minimum_quality_gate': .1,
                           'node_and_tet_caps': 250000,
                           'timing': 'generation only; excludes independent audits and FEA'},
              'records': records}
    (ROOT / 'benchmark-data.json').write_text(json.dumps(result, indent=2) + '\n')
    keys = ['family', 'case', 'route', 'admitted_all_five', 'repetitions',
            'generation_seconds_median', 'tetrahedra', 'nodes', 'quality_min',
            'quality_median', 'sampled_two_sided_distance', 'absolute_volume_error_percent', 'source']
    with (ROOT / 'benchmark-data.csv').open('w', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=keys, extrasaction='ignore')
        writer.writeheader(); writer.writerows(records)
    return records


def figures(records):
    plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 10,
                         'axes.spines.top': False, 'axes.spines.right': False,
                         'svg.hashsalt': 'meshers-first-use-case'})
    colors = {'actual': '#7662aa', 'native': '#008b83', 'before': '#65758b'}
    solids = ['primitive-capsule', 'primitive-ellipsoid', 'primitive-sphere']
    fig, axes = plt.subplots(2, 2, figsize=(12, 8))
    metrics = [('generation_seconds_median', 'Generation time (s), lower is better', 1),
               ('tetrahedra', 'Tetrahedra (thousands), lower is better', .001),
               ('quality_min', 'Minimum quality, higher is better', 1),
               ('sampled_two_sided_distance', 'Sampled boundary error (×10⁻³ cell length), lower is better', 1000)]
    for ax, (key, label, scale) in zip(axes.flat, metrics):
        for i, route in enumerate(['actual', 'native']):
            values = [next(r[key] for r in records if r['case'] == c and r['route'] == route) * scale for c in solids]
            bars = ax.bar(np.arange(3) + (i - .5) * .36, values, .36, color=colors[route],
                          label='Microgen + MMG (modified route)' if route == 'actual' else 'Meshers')
            ax.bar_label(bars, fmt='%.3f' if key != 'tetrahedra' else '%.1f', fontsize=9, padding=3)
        ax.set_xticks(np.arange(3), ['Capsule', 'Ellipsoid', 'Sphere'])
        ax.set_title(label, loc='left', fontsize=10)
        ax.set_ylim(0, ax.get_ylim()[1] * 1.19)
        ax.grid(axis='y', alpha=.15); ax.set_axisbelow(True)
    fig.suptitle('Meshers: three fixed Tet4 solid benchmarks', fontsize=18, x=.06, ha='left')
    handles, labels = axes[0, 0].get_legend_handles_labels()
    fig.legend(handles, labels, loc='upper left', bbox_to_anchor=(.055, .94), ncol=2, frameon=False)
    fig.text(.06, .025, 'Both routes pass the declared admission gates. Five paired-run medians on Apple M4, one numerical thread.\n'
             'Modified competitor: sampling 24, first MMG pass only, relocation repair charged. Generation excludes audits and FEA.', fontsize=9)
    fig.tight_layout(rect=(.03, .09, .99, .88))
    save(fig, 'solids-tet4')
    spin = ['spinodoid', 'spinodoid-anisotropic']
    fig, axes = plt.subplots(1, 3, figsize=(12, 5.3))
    for ax, (key, label, scale) in zip(axes, metrics[:3]):
        for i, route in enumerate(['before', 'native']):
            values = [next(r[key] for r in records if r['case'] == c and r['route'] == route) * scale for c in spin]
            bars = ax.bar(np.arange(2) + (i - .5) * .36, values, .36, color=colors[route],
                          label='Previous Meshers recipe' if route == 'before' else 'Improved Meshers recipe')
            ax.bar_label(bars, fmt='%.5f' if key == 'quality_min' else ('%.3f' if key != 'tetrahedra' else '%.1f'), fontsize=9, padding=3)
        ax.set_xticks(np.arange(2), ['Isotropic', 'Anisotropic'])
        ax.set_title(label, loc='left', fontsize=10)
        ax.set_ylim(0, ax.get_ylim()[1] * 1.20)
        ax.grid(axis='y', alpha=.15); ax.set_axisbelow(True)
    axes[2].axhline(.1, color='#b64f32', linestyle='--', linewidth=1)
    fig.suptitle('Spinodoids: lower cost, with a quality tradeoff', fontsize=18, x=.06, ha='left')
    handles, labels = axes[0].get_legend_handles_labels()
    fig.legend(handles, labels, loc='upper left', bbox_to_anchor=(.055, .91), ncol=2, frameon=False)
    fig.text(.06, .025, 'Meshers before/after, not a matched-accuracy win over MMG. All four native selections pass the gates.\n'
             'Dashed line: minimum-quality gate 0.1. Both minimum and median quality decrease with the improved recipes.', fontsize=9)
    fig.tight_layout(rect=(.03, .12, .99, .82))
    save(fig, 'spinodoid-progress')


def save(fig, name):
    assets = ROOT / 'assets'; assets.mkdir(exist_ok=True)
    fig.savefig(assets / f'{name}.png', dpi=180, facecolor='white')
    fig.savefig(assets / f'{name}.svg', facecolor='white', metadata={'Date': None})
    plt.close(fig)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('study', type=Path)
    args = parser.parse_args()
    figures(export(args.study))
