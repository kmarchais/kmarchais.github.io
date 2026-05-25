import type { OpenSourceProject } from "../types";

export const stack = ["Python", "C++", "CUDA"] as const;

export const openSource: OpenSourceProject[] = [
  {
    name: "mmgpy",
    role: "author",
    blurb: "Python bindings for the MMG remeshing library with PyVista glue.",
    links: [{ label: "kmarchais/mmgpy", url: "https://github.com/kmarchais/mmgpy" }],
  },
  {
    name: "microgen",
    role: "author",
    blurb: "Parametric lattice + TPMS generator for additive manufacturing.",
    links: [{ label: "3MAH/microgen", url: "https://github.com/3MAH/microgen" }],
  },
  {
    name: "pyvista-blender",
    role: "author",
    blurb: "Render PyVista plotter scenes through Blender (bpy) for photoreal output.",
    links: [{ label: "kmarchais/pyvista-blender", url: "https://github.com/kmarchais/pyvista-blender" }],
  },
  {
    name: "blender extensions",
    role: "author",
    blurb: "Two Blender add-ons for parametric geometry and scientific mesh I/O.",
    links: [],
    children: [
      {
        name: "blender-tpms",
        blurb: "Generate triply periodic minimal surfaces (Gyroid, Schwarz, Neovius, …) parametrically inside Blender.",
        url: "https://github.com/kmarchais/blender-tpms",
      },
      {
        name: "blender-vtk",
        blurb: "Import and export VTK formats (.vtk, .vtu, .vtp, .pvd) so Blender can talk to scientific pipelines.",
        url: "https://github.com/kmarchais/blender-vtk-importer-exporter",
      },
    ],
  },
];

export const social = {
  github: "https://github.com/kmarchais",
  linkedin: "https://www.linkedin.com/in/kevin-marchais/",
};

