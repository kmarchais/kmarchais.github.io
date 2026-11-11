"""Candidate API example; measured benchmark results remain frozen separately."""
from microgen import Tpms
from microgen.shape.surface_functions import gyroid
shape = Tpms(gyroid, offset=1.1)
vtk_mesh = shape.generate_volume_mesh()
mmg_mesh = shape.generate_volume_mesh(backend="mmg", periodic=True)
meshers_mesh = shape.generate_volume_mesh(
    backend="meshers", cells=12, geometry_tolerance=1.0, minimum_quality=0.1,
    optimize_passes=1, max_tetrahedra=250_000, periodic=(True, True, True),
)
assert vtk_mesh.n_cells > 0 and mmg_mesh.n_cells > 0 and meshers_mesh.n_cells > 0
print(f"Example only: MMG {mmg_mesh.n_cells} tets; Meshers {meshers_mesh.n_cells} tets")
