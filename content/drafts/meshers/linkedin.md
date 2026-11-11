# LinkedIn draft

I've been working on Meshers, a tetrahedral meshing library written in Rust
with a Python API. Its first integration is in Microgen.

The aim: better boundary fidelity and element quality, with less meshing time
at a comparable number of elements.

The first results are encouraging. On three fixed Tet4 solid benchmarks,
capsule, ellipsoid and sphere, both routes passed the same geometry and quality
checks. Meshers generated the meshes in about 0.10 s, versus 1.58–1.77 s for a
modified Microgen+MMG workflow, with fewer tetrahedra and nodes and better
minimum and median quality.

That is about 16–17 times faster mesh generation for those three comparisons.
The competitor uses explicitly modified settings and charged relocation repair;
this is not a comparison against untouched defaults. Measurements use five
paired runs on the same Apple M4, and exclude independent audits and FEA.

Periodic TPMS and spinodoids bring harder questions. The study checks node
pairing and cap triangulations, boundary distance and volume error. Some cases
still fail, and I don't count a fast rejected mesh as a win.

The Microgen integration is optional. Existing VTK and MMG workflows remain
available alongside direct meshing with Meshers.

I'm preparing the first release and an article covering the method, benchmark
settings, results and remaining limitations.

Article: [ADD THE PUBLISHED ARTICLE URL]
Code: https://github.com/kmarchais/meshers

If you work on implicit geometries or periodic FEA, which geometry would you
want to see tested next?

#Meshing #FiniteElementAnalysis #Microstructures #Python #Rust

---

Editorial notes, not part of the post:

- Attach `assets/solids-tet4.png`; its legend labels the modified competitor.
- Alt text: "Three admitted Tet4 solid comparisons. Meshers takes about 0.10
  seconds versus 1.58–1.77 seconds for the modified Microgen+MMG route, with fewer
  tetrahedra, higher minimum quality and lower sampled boundary error."
- Replace the article placeholder and verify repository/article visibility
  before posting. Change release wording only after publication is verified.
- Data and source receipts are in `benchmark-data.json`. No post has been sent.
