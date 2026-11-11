"""Export the two frozen, count-comparable Gyroid Tet4 meshes without alteration."""
import hashlib
import csv
import json
from pathlib import Path
from statistics import median
import subprocess
import sys
import numpy as np

study = Path(sys.argv[1])
root = Path(__file__).resolve().parents[3]
output = root / 'public/meshers'
relative = 'experiments/adaptive/runs/macbook-gyroid-tet4-paired-counts-v1/result.json'
source = study / relative
commit = '4eea25af3d6f0aa6f8eb15a60030458263224183'
assert source.read_bytes() == subprocess.check_output(['git','-C',str(study),'show',f'{commit}:{relative}'])
summary = json.loads(source.read_text())
assert summary['complete']
records = []
for arm, label, slug in [('meshers','Meshers','gyroid-meshers'),('microgen','Microgen + MMG','gyroid-mmg')]:
    rows = [r for r in summary['rows'] if r['config']['arm'] == arm and not r['excluded_warmup']]
    assert len(rows) == 5
    arrays = None
    for row in rows:
        path = source.parent / f'repeat-{row["repeat"]}-{arm}' / 'mesh.npz'
        assert hashlib.sha256(path.read_bytes()).hexdigest() == row['mesh_sha256']
        current = dict(np.load(path))
        if arrays is None: arrays = current
        else:
            for key in ('points','tetrahedra','surface'):
                np.testing.assert_array_equal(current[key], arrays[key])
    points, tets, surface = (arrays[k] for k in ('points','tetrahedra','surface'))
    corners = points[tets]
    determinants = np.linalg.det(corners[:,1:] - corners[:,:1])
    assert determinants.min() > 0
    edge_sum = sum(np.sum((corners[:,i]-corners[:,j])**2, axis=1)
                   for i in range(4) for j in range(i+1,4))
    quality = np.sqrt(432*determinants**2 / edge_sum**3)
    stats = dict(zip(('min','p10','median','p90','max'), map(float,np.quantile(quality,[0,.1,.5,.9,1]))))
    stats['mean'] = float(np.mean(quality))
    for name in ('min','p10','median','p90','max'):
        np.testing.assert_allclose(stats[name],rows[0]['quality_quantiles'][name],atol=1e-12,rtol=1e-12)
    parts = [points.astype('<f4').tobytes(),tets.astype('<u4').tobytes(),quality.astype('<f4').tobytes(),surface.astype('<u4').tobytes()]
    content = b''.join(parts)
    (output/f'{slug}.bin').write_bytes(content)
    periodic = rows[0]['periodic']; geometry = rows[0]['geometry']
    assert periodic['periodic_triangles_match'] and periodic['complete_existing_node_classes']
    record = {'name':label, 'slug':slug, 'nodes':len(points),'tetrahedra':len(tets),
        'generationSeconds':median(r['generation_s'] for r in rows),
        'generationSecondsAll':[r['generation_s'] for r in rows],
        'qualityStats':stats,'minimumQuality':stats['min'],
        'qualityCdf':{'q':np.linspace(0,1,201).tolist(),'fraction':(np.searchsorted(np.sort(quality),np.linspace(0,1,201),side='right')/len(quality)).tolist()},
        'periodicNodesMatch':True,'periodicCapsMatch':periodic['periodic_triangles_match'],
        'maximumPairError':max(periodic['periodic_coordinate_errors']),
        'pairCounts':periodic['periodic_pair_counts'],
        'orientedFacetConflicts':geometry['facet_consistency']['same_orientation_shared_faces'],
        'overallAdmitted':all(r['qualified'] for r in rows),
        'failedGates':geometry['failed_gates'],
        'sampledTwoSidedDistance':geometry.get('sampled_two_sided_max'),
        'sampledReverseDistance':geometry.get('sampled_reverse_max'),
        'bounds':np.array([points.min(axis=0),points.max(axis=0)]).tolist(),
        'positionsBytes':len(parts[0]),'tetrahedraBytes':len(parts[1]),'qualityBytes':len(parts[2]),
        'binarySha256':hashlib.sha256(content).hexdigest(),'sourceMeshSha256':rows[0]['mesh_sha256'],
        'recipe':rows[0]['config'], 'sourceCommit':commit,
        'displayPrecision':'Float32 display positions and quality; original Uint32 Tet4 connectivity. Statistics computed from original Float64 arrays.'}
    (output/f'{slug}.json').write_text(json.dumps(record,indent=2)+'\n')
    records.append(record)
    print(label,len(tets),stats)
report = {'case':'Fixed Gyroid sheet unit cell, offset 1.1, Tet4',
    'source':f'https://github.com/kmarchais/meshers/blob/{commit}/{relative}',
    'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
    'protocol':{'host':'Apple M4 MacBook Pro','numericalThreads':1,'measuredPairs':5,'excludedWarmupPairs':1,
                'boundaryGate':.002,'qualityGate':.1,'timing':'Generation only; excludes independent audits and FEA',
                'scope':'Count-comparable raw mesh comparison. Neither route passes all strict gates.'},
    'records':records}
(root/'content/drafts/meshers/gyroid-comparison.json').write_text(json.dumps(report,indent=2)+'\n')

with (root/'content/drafts/meshers/gyroid-comparison.csv').open('w',newline='') as f:
    keys=['route','generation_s','tetrahedra','nodes','q_min','q_max','q_median','q_mean','q_p10','q_p90','periodic_nodes','periodic_caps','oriented_facet_conflicts','overall_admitted']
    writer=csv.DictWriter(f,fieldnames=keys,lineterminator="\n");writer.writeheader()
    for r in records:
        writer.writerow(dict(route=r['name'],generation_s=r['generationSeconds'],tetrahedra=r['tetrahedra'],nodes=r['nodes'],
            **{'q_'+k:v for k,v in r['qualityStats'].items()},periodic_nodes=r['periodicNodesMatch'],periodic_caps=r['periodicCapsMatch'],
            oriented_facet_conflicts=r['orientedFacetConflicts'],overall_admitted=r['overallAdmitted']))
