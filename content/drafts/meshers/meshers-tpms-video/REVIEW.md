# Video review, 11 November 2026

The 14-second 4:5 clip starts with Gyroid, Schwarz P and Diamond nodal fields interpolated into sheet surfaces. These intermediate fields are illustrations, not exact minimal surfaces or live volume meshing. The label stays visible through the opening. The payoff uses the supplied actual Meshers Gyroid Tet4 connectivity, then removes complete cells by centroid to expose interior faces. Teal is the original boundary; brass marks exposed cell faces. No benchmark clock or performance claim appears in the clip.

The actual mesh comes from the same verified frozen export as the article, source commit `4eea25af3d6f0aa6f8eb15a60030458263224183`. It has 10,832 tetrahedra and 3,283 nodes. Its periodic-node and cap checks pass, but this coarse specimen fails the strict boundary-distance gate. The visualization does not promote it to an admitted comparison.

The palette follows the article. The video is silent for feed viewing. The source is deterministic in `hf-seek`; no animation clock or stochastic geometry is used. Three.js is vendored separately from authored animation code, with its MIT license. GSAP is pinned at 3.15.0; Hyperframes is pinned at 0.9.33. The mesh is stored at display precision, with unchanged cell connectivity.

Checks pass for lint, runtime, layout and contrast. One retained craft warning calls the animated canvas a dead stretch because the checker only sees DOM animations; keyframes confirm the surface morph and camera motion. The full encoded H.264 video decodes without errors: 420 frames, 1080 × 1350, 30 fps, yuv420p, 14 seconds. Keyframes and an encoded payoff frame were inspected. The weakest moment is the short dissolve, which overlaps the outgoing and incoming captions; a later edit could use a sequential title transition.

Queue receipts are in the Meshers study checkout's ignored `.local-work` directories. Job 874 failed lint on bundled Three.js internals. Splitting the vendor code resolved it without hiding any authored animation. Jobs 875–877 passed corrected checks and keyframes. Job 878 rendered the final video in one worker under the shared queue and a 600-second timeout, with peak process-tree RSS 1.160 GiB. No content has been published or posted.

To rebuild the scene bundle, run from the website root:

```sh
node_modules/.bin/esbuild content/drafts/meshers/meshers-tpms-video/scene.js --bundle --format=esm --external:three --loader:.bin=binary --outfile=content/drafts/meshers/meshers-tpms-video/assets/scene.bundle.js --minify
```

Run the pinned Hyperframes check and render from this folder through the shared queue. The final output is `../assets/meshers-tpms-linkedin.mp4`. Use one worker and an explicit timeout. For visual editing, this source can also be opened in the HyperFrames desktop app.
