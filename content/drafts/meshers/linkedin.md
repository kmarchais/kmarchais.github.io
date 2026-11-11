# LinkedIn draft

I've been developing Meshers, a tetrahedral meshing library written in Rust with a Python API, and integrating it as an optional backend in Microgen.

The video starts with a Gyroid being printed, then morphs through several closed TPMS unit cells. It returns to Gyroid, reveals the actual Meshers Tet4 mesh and compares the recorded meshing results.

At comparable element counts, the recorded five-pair medians on an Apple M4 are:

• Microgen+MMG: 12,250 tetrahedra, 1.780 s
• Meshers: 10,832 tetrahedra, 0.093 s

Meshers improves minimum, median, mean, p10 and p90 element quality in this pair. MMG has a slightly higher maximum. Both meshes match opposite nodes and cap triangulations; MMG also has four oriented-facet conflicts elsewhere in the mesh.

There is an important limit: neither coarse mesh meets the study's strict boundary-accuracy target. These are fixed-budget measurements, not a claimed speedup at matched accuracy.

The article includes one interactive Three.js Gyroid, comparison plots for all six quality statistics, periodicity checks, recipes and remaining limitations.

I'm preparing the first release. Existing VTK and MMG workflows remain available alongside Meshers in the integration branch.

Article: [ADD THE PUBLISHED ARTICLE URL]
Code: https://github.com/kmarchais/meshers

#Meshing #FiniteElementAnalysis #Microgen #Python #Rust

---

Editorial notes, not part of the post:

- Attach `assets/meshers-gyroid-print.mp4` as the lead video. The printing and TPMS morphs are illustrations. The later Tet4 reveal preserves the actual benchmark connectivity.
- Video description: "A conventional extrusion nozzle builds a capped solid Gyroid. The cell morphs through Schwarz P, Diamond and Neovius with smoothstep easing, then returns to Gyroid. Actual Meshers Tet4 edges appear, followed by generation-time, count and quality plots. Both coarse comparison meshes miss the strict boundary target."
- Replace the article placeholder only after publication. No post has been sent.
- Source hashes and all five generation durations per route are in `gyroid-comparison.json`.
