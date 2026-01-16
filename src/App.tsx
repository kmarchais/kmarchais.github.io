import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { HomeNew } from "./components";
import ErrorBoundary from "./components/ErrorBoundary";
import PageLoader from "./components/PageLoader";

// Lazy load showcase pages (heavy Three.js/WebGPU components)
const ComputationalGeometry = lazy(() => import("./components/projects/geometry/ComputationalGeometry"));
const SimulationsGallery = lazy(() => import("./components/projects/simulations/SimulationsGallery"));
const NBodySimulation = lazy(() =>
  import("./components/projects/simulations/nbody/NBodySimulation").then(m => ({ default: m.NBodySimulation }))
);
const DEMSimulation = lazy(() =>
  import("./components/projects/simulations/dem/DEMSimulation").then(m => ({ default: m.DEMSimulation }))
);
const SPHSimulation = lazy(() =>
  import("./components/projects/simulations/sph/SPHSimulation").then(m => ({ default: m.SPHSimulation }))
);
const Chess = lazy(() => import("./components/projects/chess/Chess"));

// Lazy load blog pages (MDX processing)
const Blog = lazy(() => import("./pages/Blog"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));

// Lazy load legacy experimental pages
const NBody = lazy(() => import("./components/projects/NBody"));
const Particles = lazy(() => import("./components/projects/Particles"));
const TPMS = lazy(() => import("./components/projects/TPMS"));
const Vtk = lazy(() => import("./components/projects/Vtk"));
const Example = lazy(() => import("./components/projects/example/Example"));
const Collisions = lazy(() => import("./components/projects/Collisions"));
const Shader = lazy(() => import("./components/projects/Shader"));

const App = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Main pages */}
            <Route path="/" element={<HomeNew />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />

            {/* Showcase - Interactive demos */}
            <Route path="/showcase/geometry" element={<ComputationalGeometry />} />
            <Route path="/showcase/simulations" element={<SimulationsGallery />} />
            <Route path="/showcase/simulations/nbody" element={<NBodySimulation />} />
            <Route path="/showcase/simulations/granular" element={<DEMSimulation />} />
            <Route path="/showcase/simulations/fluid" element={<SPHSimulation />} />
            <Route path="/showcase/chess" element={<Chess />} />

            {/* Legacy routes - redirect to new paths */}
            <Route path="/tpms-gallery" element={<Navigate to="/showcase/geometry" replace />} />
            <Route path="/lattice-studio" element={<Navigate to="/showcase/geometry" replace />} />
            <Route path="/showcase/tpms-gallery" element={<Navigate to="/showcase/geometry" replace />} />
            <Route path="/showcase/lattice-studio" element={<Navigate to="/showcase/geometry" replace />} />
            <Route path="/simulations" element={<Navigate to="/showcase/simulations" replace />} />
            <Route path="/simulations/nbody" element={<Navigate to="/showcase/simulations/nbody" replace />} />
            <Route path="/simulations/granular" element={<Navigate to="/showcase/simulations/granular" replace />} />
            <Route path="/simulations/fluid" element={<Navigate to="/showcase/simulations/fluid" replace />} />
            <Route path="/Chess" element={<Navigate to="/showcase/chess" replace />} />

            {/* Legacy experimental pages */}
            <Route path="/NBody" element={<NBody />} />
            <Route path="/Particles" element={<Particles />} />
            <Route path="/TPMS" element={<TPMS />} />
            <Route path="/Vtk" element={<Vtk />} />
            <Route path="/Example" element={<Example />} />
            <Route path="/Collisions" element={<Collisions />} />
            <Route path="/Shader" element={<Shader />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default App;
