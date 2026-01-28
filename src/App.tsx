import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";

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
const HelixViewer = lazy(() =>
  import("./components/projects/simulations/helix/HelixViewer")
);

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2, ease: "easeInOut" }}
  >
    {children}
  </motion.div>
);

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Main pages */}
        <Route path="/" element={<HomeNew />} />
        <Route path="/blog" element={<PageTransition><Blog /></PageTransition>} />
        <Route path="/blog/:slug" element={<PageTransition><BlogPostPage /></PageTransition>} />

        {/* Showcase - Interactive demos */}
        <Route path="/showcase/geometry" element={<PageTransition><ComputationalGeometry /></PageTransition>} />
        <Route path="/showcase/simulations" element={<PageTransition><SimulationsGallery /></PageTransition>} />
        <Route path="/showcase/simulations/nbody" element={<PageTransition><NBodySimulation /></PageTransition>} />
        <Route path="/showcase/simulations/granular" element={<PageTransition><DEMSimulation /></PageTransition>} />
        <Route path="/showcase/simulations/fluid" element={<PageTransition><SPHSimulation /></PageTransition>} />
        <Route path="/showcase/chess" element={<PageTransition><Chess /></PageTransition>} />

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
        <Route path="/NBody" element={<PageTransition><NBody /></PageTransition>} />
        <Route path="/Particles" element={<PageTransition><Particles /></PageTransition>} />
        <Route path="/TPMS" element={<PageTransition><TPMS /></PageTransition>} />
        <Route path="/Vtk" element={<PageTransition><Vtk /></PageTransition>} />
        <Route path="/Example" element={<PageTransition><Example /></PageTransition>} />
        <Route path="/Collisions" element={<PageTransition><Collisions /></PageTransition>} />
        <Route path="/Shader" element={<PageTransition><Shader /></PageTransition>} />
        <Route path="/Helix" element={<PageTransition><HelixViewer /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <AnimatedRoutes />
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </MotionConfig>
  );
};

export default App;
