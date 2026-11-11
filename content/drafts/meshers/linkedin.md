# LinkedIn draft

I've been developing Meshers, a tetrahedral meshing library written in Rust with a Python API, and integrating it as an optional backend in Microgen.

The flagship example is a periodic Gyroid unit cell. The image shows the actual Tet4 meshes, including exposed interior element faces.

At comparable element counts, the recorded five-pair medians on an Apple M4 are:

• Microgen+MMG: 12,250 tetrahedra, 1.780 s
• Meshers: 10,832 tetrahedra, 0.093 s

Meshers improves minimum, median, mean, p10 and p90 element quality in this pair. MMG has a slightly higher maximum. Both meshes match opposite nodes and cap triangulations; MMG also has four oriented-facet conflicts elsewhere in the mesh.

There is an important limit: neither coarse mesh meets the study's strict boundary-accuracy target. These are fixed-budget measurements, not a claimed speedup at matched accuracy.

The article includes interactive Three.js views of both actual meshes, the complete quality statistics, periodicity checks, recipes and remaining limitations.

I'm preparing the first release. Existing VTK and MMG workflows remain available alongside Meshers in the integration branch.

Article: [ADD THE PUBLISHED ARTICLE URL]
Code: https://github.com/kmarchais/meshers

#Meshing #FiniteElementAnalysis #Microgen #Python #Rust

---

Editorial notes, not part of the post:

- Attach `assets/meshers-gyroid-comparison.png` as the lead image.
- Alt text: "The same Gyroid cell meshed with Microgen+MMG and Meshers. Both actual tetrahedral meshes are shown with an element cutaway. The table includes time, counts, all six quality statistics and periodic/coherence checks. Both fail the strict boundary target."
- Replace the article placeholder only after publication. No post has been sent.
- Source hashes and all five generation durations per route are in `gyroid-comparison.json`.
