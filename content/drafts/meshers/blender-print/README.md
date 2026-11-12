# Gyroid assembly and TPMS film

The current cut uses NVIDIA's Franka FR3 to assemble a Gyroid from the 10,832
actual Meshers Tet4 cells in the frozen benchmark binary. All pieces start on
an indexed annular tray. Each rests on a triangular face whose support polygon
contains its projected centre of mass. Footprints do not overlap. Three visible
pick/place cycles lead into an assembly time-lapse. The inventory never
replenishes: stock plus carried plus assembled cells stays 10,832.

The 39-second film then morphs through Gyroid, Schwarz P, Diamond, Neovius and
Gyroid. It returns to the actual tetrahedra before presenting generation time,
element count and all six quality summaries. Morphs use cubic smoothstep,
`s = u*u*(3-2*u)`. They are closed display solids, not benchmark candidates.
The source meshes and measurements remain unchanged. A 0.965 contraction about
each tetrahedron's centroid exaggerates the display seams; this is not a
material-strength prediction.

The plots read `../gyroid-comparison.json`. Both coarse routes miss the strict
boundary-distance target, and the film states that limitation. These are
fixed-budget measurements, not an accuracy-qualified speedup. MMG retains its
slightly higher maximum quality. Robot and rendering durations are unrelated
to meshing time.

## Robot source and licenses

The robot comes from [NVIDIA Isaac Sim assets on Hugging Face](https://huggingface.co/datasets/nvidia/isaacsim-assets),
package `frankarobotics_frankafr3_fr3`, at revision
`a0d9dfbac5163a7005442ae4fe8f954ff6780093`. The 28 downloaded files total 23,299,546
bytes. `fr3-asset-manifest.json` records every SHA256; `fetch_fr3.py` downloads
that exact revision and verifies each file. The robot's Apache 2.0 license and
NVIDIA material notices are retained in `licenses`. No endorsement is implied.

Native arm64 `usd-core==25.11` reads the USD. `prepare_fr3.py` converts 11 visual
meshes, authored corner normals and material subsets. Zero-length authored
normals stay zero for Blender's automatic-normal handling. The saved scene
requires finite corner normals. It also prepares stable
staging from the source cells. `fr3_kinematics.py` uses the authored joint frames
and limits. The fixed hand attachment preserves the composed visual-body
transform, including its offset. Zero-pose transforms reproduce the USD within
2.03e-7. The Mac renders with Metal; it needs neither IsaacSim nor CUDA.

`plan_fr3.py` bakes 432 introductory poses. A previous-pose penalty keeps the
seven-joint inverse kinematics continuous. A quarter-turn base mount and an
opposite first-joint offset preserve all downstream world poses while keeping
the complete asymmetric base foot clear of the stock ring. The fine pickup adapter is an
illustrative tool held by the asset's original parallel gripper. This is an
animation, not a manufacturing program or industrial collision certificate.

## Rebuilding

Heavy stages use the shared one-worker `gpu` queue, with
`qrun --check-start --progress report --interrupt restart`. Read each result
before submitting its successor. The child reports measured progress through
`Job`. `bounded.py` enforces explicit timeouts and a 12 GiB process-tree RSS
ceiling. Exact JSON completion receipts must be newly written. Children share
the queued process group so cancellation reaches the renderer; an intentional
cancellation control checks that no child survives.

Use Blender 4.5.16 LTS with Metal Cycles, 32 samples and two CPU render threads.
Every Blender invocation must include `--python-exit-code 1`; its default exit
status can otherwise hide a Python error. The data environment needs NumPy,
SciPy, Pillow and usd-core 25.11. The previous smooth-solid preparation uses
Trimesh 4.11.2, Shapely 2.1.2, Triangle 20250106, NetworkX 3.5 and Rtree 1.4.1.

From the website root, run these stages through the bounded queue wrapper:

1. `fetch_fr3.py --out CACHE` verifies the pinned asset.
2. `prepare_fr3.py --asset CACHE/frankarobotics_frankafr3_fr3/fr3.usda --source BENCHMARK.json --run RUN`
   reads `public/meshers/gyroid-meshers.json` and its adjacent binary, verifies the hash,
   converts the asset and stages every source cell. The earlier source NPZ is
   also accepted. Allow 300 seconds.
3. Keep the verified smooth-solid `geometry` cache beside the new scene.
   `plan_fr3.py RUN` bakes and verifies the trajectories. Allow 900 seconds.
4. `fr3_scene.py --run RUN --preview --frames FRAMES --samples 16` renders
   controls. Inspect pickup, carry, placement, the complete tray and each morph.
   Preview mode independently renders static hold endpoints.
5. Load `RUN/fr3-assembly.blend` and run `verify_fr3.py -- RUN`. The audit
   evaluates the saved geometry-node counts, initial framing, joint limits,
   table/pedestal vertex clearances, a conservative low-body bound against the
   complete stock ring, closed morph samples and rewind.
6. `fr3_scene.py --run RUN --samples 32` renders 936 full-resolution frames.
   Allow 4,800 seconds. Existing PNGs are reused only with a complete PNG footer
   and unchanged input hashes. Static camera holds reuse verified poses.
7. Repeat the saved-scene audit, then run
   `fr3_compose.py --run RUN --output VIDEO.mp4`. Allow 600 seconds. It checks the
   frozen measurement hash, encodes 1080 × 1350 H.264/yuv420p at 24 fps and decodes
   the entire film.
8. `fr3_finish.py --run RUN --video VIDEO.mp4 --cover COVER.png` verifies source
   identity and the encoded hash, extracts 20 phase frames and a contact sheet,
   and writes the cover and artifact receipt. Allow 300 seconds. Inspect those
   encoded frames before changing `assistant_visual_review` from `pending`.

Keep `fr3-assembly.blend`, `trajectory.npz`, `all-tetrahedra-stock.npz` and
`geometry` together. Run the embedded `ASSEMBLY_DIRECTOR.py` if trusted script
execution is disabled. Playback uses the converted data and baked joint poses;
it does not need USD or SciPy. The 11 original robot meshes are in the blend.

## Preserved earlier versions

The successful 36-second smooth-print film, its scene and receipt are retained.
`deposition.py`, `blender_scene.py` and `compose.py` reproduce that cut. It uses
one shared raster cursor for the nozzle and Boolean reveal, without supports
or extrusion tubes. `prepare.py` builds capped, Float32-safe morph geometry;
`finish_scene.py` audits that saved printer scene.

The procedural two-link robot and its 20 replenished staging positions were
rejected. Its incomplete render was canceled and is not promoted. Draft media
and editorial sources stay outside the Meshers release PR. Nothing here
deploys the website or publishes a LinkedIn post.
