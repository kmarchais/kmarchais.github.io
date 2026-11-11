# Gyroid printing and TPMS animation

The video is a 30-second, 1080 × 1350 Blender animation at 24 fps. One conventional FDM nozzle builds a capped Gyroid sheet. Its walls enclose a solid volume. The scene then morphs through Gyroid, Schwarz P, Diamond, Neovius and back to Gyroid, using cubic smoothstep `s = u*u*(3-2*u)` for every field blend.

The printing sequence uses a curved Meshers Gyroid display boundary. The intermediate morphs are closed nodal-field illustrations with wall projection constrained to the box faces. They are not FE candidates or live meshing benchmarks. Every prepared frame checks positive enclosed volume and two incident triangles per boundary edge. These checks do not certify self-intersection freedom or manufacturability. The FDM motion is an accelerated illustration, not slicer G-code.

The final mesh reveal retains the original frozen Tet4 positions and connectivity. Display coordinates use Float32. The charts read `gyroid-comparison.json`, whose measurements and quality statistics come from the original Float64 meshes. They show all six requested quality summaries, including MMG's slightly higher maximum. Both coarse routes miss the strict boundary-distance target; the video states that limit. No render or printing time is used as a meshing measurement.

`tpms.py` owns the illustrative fields and smoothstep. `prepare.py` builds the display geometry and verifies the native mesh hash. `blender_scene.py` builds the scene, renders with native Blender animation, and embeds a cache playback script in the saved `.blend`. `compose.py` adds titles and measured plots, then encodes H.264. `finish_scene.py` checks the embedded playback, smoothstep endpoint derivatives, continuous printer retraction and exact native mesh arrays. `bounded.py` enforces the timeout and 12 GiB process-tree RSS ceiling while the child reports through the standard `Job` helper.

Use the shared one-worker `gpu` queue for every heavy stage, with `qrun --check-start --progress report --interrupt restart`. Read each result before starting the next stage. Run from the website root. The data environment needs Meshers, NumPy, PyVista/VTK and Pillow; the supervisor needs psutil and the standard progress helper. The final render uses Blender 4.5.16 LTS, Eevee, 64 samples, two CPU render threads and the Mac's native graphics backend.

Pass these stage commands as children of `bounded.py` inside qrun:

- Data Python: `prepare.py --run RUN`. Use a 300-second timeout, `RUN/geometry`, pattern `frame_*.npz`, and 372 output files. The 408-frame index reuses the completed Gyroid during the printer transition.
- Blender: `blender -b --factory-startup --python-exit-code 1 -P blender_scene.py -- --run RUN --engine eevee`. Use a 1,800-second timeout, `RUN/frames`, and 720 PNG files.
- Data Python: `compose.py --run RUN --output VIDEO.mp4`. Use a 300-second timeout, `RUN/composite`, and 720 PNG files.

Use complete script paths from this directory. `RUN` must be a persistent output directory. Use a new one after changing preparation inputs. Render folders retain their configuration hashes, and restart checks the PNG completion chunk before reusing a frame. The full Blender output goes to a log beside the cache; the queue receives the measured frame progress, ETA and values.

Run `finish_scene.py` in background Blender with script auto-execution disabled before loading `scene.blend`. It enables only the generated embedded driver for its checks. Keep `scene.blend` beside its `geometry` directory for playback. Run its embedded `PLAY_ANIMATION.py` once if Blender disables trusted script auto-execution. The source and geometry cache remain editable. The final video and cover image belong to the website draft, outside the Meshers release PR.
