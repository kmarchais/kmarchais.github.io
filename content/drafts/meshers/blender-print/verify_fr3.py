"""Verify the actual saved Blender scene, source inventory and posed clearances."""

import json, sys, time
from pathlib import Path
import bpy, numpy as np

sys.path.insert(0, str(Path.home() / "bin"))
from pueue_progress import Job


def main():
    np.seterr(all="raise")
    run = Path(sys.argv[sys.argv.index("--") + 1])
    director = bpy.data.texts["ASSEMBLY_DIRECTOR.py"].as_module()
    t = np.load(run / "trajectory.npz")
    stock = np.load(run / "all-tetrahedra-stock.npz")
    meshes = np.load(run / "fr3-meshes.npz")
    meta = json.loads((run / "fr3-model.json").read_text())
    model = director.model
    scene = bpy.context.scene
    root = director.root
    n = len(stock["tets"])
    checks = []
    minimum = 1e9
    collisions = []
    started = time.monotonic()
    with Job(parts=["source", "posed-scene", "morph-playback"]) as job:
        with job.part("source") as part:
            for item in meta["meshes"]:
                mesh = bpy.data.objects[
                    "NVIDIA FR3 " + item["link"].rsplit("/", 1)[-1]
                ].data
                normals = np.empty((len(mesh.corner_normals), 3), np.float32)
                mesh.corner_normals.foreach_get("vector", normals.ravel())
                assert np.isfinite(normals).all()
            assert np.array_equal(np.sort(t["order"]), np.arange(n))
            assert not np.any(t["theta"]), "The stock tray must stay fixed"
            flat = stock["flat"]
            assert np.all(np.isclose(flat[:, :, 2], 0, atol=1e-8).sum(1) == 3)
            assert np.all(flat[:, :, 2].max(1) > 0)
            assert np.all(np.linalg.det(stock["rotation"]) > 0.999999)
            rectangles = stock["rectangles"]
            nearest = np.maximum(np.maximum(rectangles[:, :2], -rectangles[:, 2:]), 0)
            stock_inner = float(np.linalg.norm(nearest, axis=1).min())
            column_reach = float(np.linalg.norm(t["center"][:2]) + 0.095)
            stock_top = float(flat[:, :, 2].max() + 0.03)
            assert stock_inner > column_reach
            assert stock_top < 0.13
            column = bpy.data.objects["Gyroid pedestal column"]
            plate = bpy.data.objects["Gyroid build pedestal"]
            assert abs(column.location.z - column.dimensions.z / 2 - 0.03) < 1e-6
            assert abs(column.location.z + column.dimensions.z / 2 - 0.13) < 1e-6
            assert abs(plate.location.z - plate.dimensions.z / 2 - 0.13) < 1e-6
            assert abs(plate.location.z + plate.dimensions.z / 2 - 0.15) < 1e-6

            director.update(1)
            bpy.context.view_layer.update()
            loose = director.loose_count
            scene = bpy.context.scene
            obj = bpy.data.objects["All 10832 original source cells on stable faces"]
            assert len(obj.data.polygons) == 4 * n
            # Every initial vertex lies within the overview camera, before editorial captions.
            points = (flat + stock["positions"][:, None, :]).reshape(-1, 3)
            points = np.column_stack([points, np.ones(len(points))])
            cam = scene.camera
            matrix = np.array(cam.matrix_world.inverted() @ obj.matrix_world)
            camera_points = np.einsum("ni,ji->nj", points, matrix)
            assert np.isfinite(camera_points).all()
            half_y = cam.data.ortho_scale / 2
            half_x = half_y * scene.render.resolution_x / scene.render.resolution_y
            assert np.abs(camera_points[:, 0]).max() < half_x
            assert np.abs(camera_points[:, 1]).max() < half_y
            part.update(
                1,
                "All initial source cells are stable and within the overview",
                cells=n,
            )
        stock_obj = bpy.data.objects["All 10832 original source cells on stable faces"]
        fixed_stock_matrix = np.array(stock_obj.matrix_world).copy()
        fixed_stock_vertices = np.array([v.co[:] for v in stock_obj.data.vertices])
        with job.part("posed-scene") as part:
            for f in range(432):
                director.update(f + 1)
                scene.frame_set(f + 1)
                assert scene["source_inventory_total"] == n
                bpy.context.view_layer.update()
                np.testing.assert_array_equal(np.array(stock_obj.matrix_world), fixed_stock_matrix)
                current_stock_vertices = np.empty(fixed_stock_vertices.size, np.float32)
                stock_obj.data.vertices.foreach_get("co", current_stock_vertices)
                np.testing.assert_array_equal(current_stock_vertices.reshape(-1, 3), fixed_stock_vertices)
                assert np.all(t["q"][f] >= model.limits[:, 0] - 1e-9) and np.all(
                    t["q"][f] <= model.limits[:, 1] + 1e-9
                )
                frames = model.frames(t["q"][f], opening=0.0105)
                for item in meta["meshes"]:
                    vertices = meshes[item["key"] + "_points"].astype(np.float64)
                    m = root @ frames[item["link"]]
                    assert np.isfinite(vertices).all() and np.isfinite(m).all()
                    z = (
                        vertices[:, 0] * m[2, 0]
                        + vertices[:, 1] * m[2, 1]
                        + vertices[:, 2] * m[2, 2]
                        + m[2, 3]
                    )
                    assert np.isfinite(z).all()
                    minimum = min(minimum, float(z.min()))
                    if float(z.min()) < 0.03 - 1e-5:
                        collisions.append(
                            {
                                "frame": f + 1,
                                "link": item["link"],
                                "surface": "table",
                                "min_z": float(z.min()),
                            }
                        )
                    if float(z.min()) < stock_top:
                        xy = (
                            vertices[:, 0, None] * m[:2, 0]
                            + vertices[:, 1, None] * m[:2, 1]
                            + vertices[:, 2, None] * m[:2, 2]
                            + m[:2, 3]
                        )
                        assert np.isfinite(xy).all()
                        radius = float(np.linalg.norm(xy, axis=1).max())
                        if radius >= stock_inner:
                            collisions.append(
                                {
                                    "frame": f + 1,
                                    "link": item["link"],
                                    "surface": "stock-ring-conservative-bound",
                                    "radius": radius,
                                }
                            )
                    low = z < 0.15 - 1e-5
                    if low.any():
                        v = vertices[low]
                        xy = (
                            v[:, 0, None] * m[:2, 0]
                            + v[:, 1, None] * m[:2, 1]
                            + v[:, 2, None] * m[:2, 2]
                            + m[:2, 3]
                        )
                        assert np.isfinite(xy).all()
                        inside = (
                            np.linalg.norm(xy - t["center"][:2], axis=1) < 0.14 - 1e-5
                        )
                        if inside.any():
                            collisions.append(
                                {
                                    "frame": f + 1,
                                    "link": item["link"],
                                    "surface": "build-pedestal",
                                    "inside_vertices": int(inside.sum()),
                                }
                            )
                # Evaluate the real GN meshes at identity transitions and regular intervals.
                if f % 12 == 0 or f in [
                    0,
                    68,
                    69,
                    108,
                    109,
                    140,
                    141,
                    180,
                    181,
                    212,
                    213,
                    252,
                    253,
                    431,
                ]:
                    bpy.context.view_layer.update()
                    dep = bpy.context.evaluated_depsgraph_get()
                    counts = []
                    for name in [
                        "All 10832 original source cells on stable faces",
                        "Assembled original source cells",
                    ]:
                        obj = bpy.data.objects[name].evaluated_get(dep)
                        mesh = obj.to_mesh()
                        faces = len(mesh.polygons)
                        assert faces % 4 == 0
                        counts.append(faces // 4)
                        obj.to_mesh_clear()
                    assert counts == [n - int(t["picked"][f]), int(t["placed"][f])], (
                        f,
                        counts,
                    )
                    assert sum(counts) + int(t["carry"][f] >= 0) == n
                    checks.append(
                        {
                            "frame": f + 1,
                            "stock": counts[0],
                            "assembled": counts[1],
                            "carried": int(t["carry"][f]),
                        }
                    )
                part.update(
                    (f + 1) / 432,
                    "Audit saved scene inventory and mesh clearances",
                    frame=f + 1,
                    min_robot_z=minimum,
                    collision_frames=len(collisions),
                )
        with job.part("morph-playback") as part:
            morph_checks = []
            phases = [
                433,
                456,
                480,
                504,
                528,
                552,
                576,
                600,
                624,
                625,
                672,
                888,
                936,
                1,
            ]
            for k, frame in enumerate(phases):
                director.update(frame)
                scene.frame_set(frame)
                bpy.context.view_layer.update()
                assert scene["source_inventory_total"] == n
                bpy.context.view_layer.update()
                np.testing.assert_array_equal(np.array(stock_obj.matrix_world), fixed_stock_matrix)
                current_stock_vertices = np.empty(fixed_stock_vertices.size, np.float32)
                stock_obj.data.vertices.foreach_get("co", current_stock_vertices)
                np.testing.assert_array_equal(current_stock_vertices.reshape(-1, 3), fixed_stock_vertices)
                if 433 <= frame <= 624:
                    obj = bpy.data.objects["Closed smooth TPMS morph"]
                    assert not obj.hide_render
                    mesh = obj.data
                    v = np.array([p.co[:] for p in mesh.vertices])
                    faces = np.array([p.vertices[:] for p in mesh.polygons])
                    assert faces.shape[1] == 3
                    edge = np.sort(
                        faces[:, [[0, 1], [1, 2], [2, 0]]].reshape(-1, 2), axis=1
                    )
                    unused, counts = np.unique(edge, axis=0, return_counts=True)
                    assert np.all(counts == 2)
                    cross = np.cross(
                        v[faces[:, 1]] - v[faces[:, 0]], v[faces[:, 2]] - v[faces[:, 0]]
                    )
                    areas = np.linalg.norm(cross, axis=1)
                    assert np.isfinite(areas).all() and areas.min() > 0
                    morph_checks.append(
                        {
                            "frame": frame,
                            "triangles": len(faces),
                            "closed": True,
                            "min_doubled_area": float(areas.min()),
                        }
                    )
                part.update(
                    (k + 1) / len(phases),
                    "Verify closed morphs and rewind",
                    frame=frame,
                    closed_samples=len(morph_checks),
                )
            receipt = {
                "source_cells": n,
                "stationary_stock_world_transforms": True,
                "stationary_stock_vertices": True,
                "stock_inner_radius": stock_inner,
                "fixed_column_outer_radius": column_reach,
                "stock_top_z": stock_top,
                "pedestal_flange_bottom_z": 0.13,
                "frames": 936,
                "morph_controls": morph_checks,
                "all_initial_cells_stable": True,
                "all_initial_cells_in_camera": True,
                "all_joint_limits_pass": True,
                "all_robot_corner_normals_finite": True,
                "inventory_evaluated": checks,
                "minimum_robot_z": minimum,
                "table_top_z": 0.03,
                "collisions": collisions,
                "seconds": time.monotonic() - started,
                "scope": "Vertex clearance against table/build pedestal and conservative full-mesh clearance from the stationary stock rows; not a certified industrial robot collision plan.",
            }
            (run / "fr3-scene-verified.json").write_text(
                json.dumps(receipt, indent=2) + "\n"
            )
            job.result(
                "fr3-scene-audit",
                frames=432,
                cells=n,
                collisions=len(collisions),
                min_robot_z=minimum,
            )
            assert not collisions, "Clearance flags recorded in fr3-scene-verified.json"


if __name__ == "__main__":
    main()
