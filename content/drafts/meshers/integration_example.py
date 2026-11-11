"""Run against Microgen's meshers-backend-integration branch and candidate SDK."""
from microgen import Tpms
from microgen.shape.surface_functions import gyroid

shape = Tpms(gyroid, offset=1.1, resolution=24)

# Existing behavior stays available.
vtk_mesh = shape.generate_volume_mesh()

# Direct tetrahedral meshing with periodic node and cap correspondence.
mesh = shape.generate_volume_mesh(
    backend="meshers",
    cells=24,
    adapt=True,
    adapt_tolerance=0.0018,
    geometry_tolerance=0.002,
    minimum_quality=0.1,
    optimize_passes=1,
    max_tetrahedra=250_000,
    periodic=(True, True, True),
)
assert mesh.n_cells > 0
print(f"Meshers: {mesh.n_points} nodes, {mesh.n_cells} Tet4 elements")
