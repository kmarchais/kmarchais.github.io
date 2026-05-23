import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";

import HomeNew from "./components/HomeNew";
import ErrorBoundary from "./components/ErrorBoundary";
import PageLoader from "./components/PageLoader";

// Lazy load blog pages (MDX processing)
const Blog = lazy(() => import("./pages/Blog"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));

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

        {/* Legacy showcase routes — point everything to the blog now that
            interactive demos live inside articles. */}
        <Route path="/showcase/geometry" element={<Navigate to="/blog/microgen" replace />} />
        <Route path="/showcase/simulations" element={<Navigate to="/blog" replace />} />
        <Route path="/showcase/simulations/nbody" element={<Navigate to="/blog" replace />} />
        <Route path="/showcase/simulations/granular" element={<Navigate to="/blog" replace />} />
        <Route path="/showcase/simulations/fluid" element={<Navigate to="/blog" replace />} />
        <Route path="/showcase/chess" element={<Navigate to="/blog" replace />} />
        <Route path="/tpms-gallery" element={<Navigate to="/blog/microgen" replace />} />
        <Route path="/lattice-studio" element={<Navigate to="/blog/microgen" replace />} />
        <Route path="/simulations" element={<Navigate to="/blog" replace />} />
        <Route path="/Chess" element={<Navigate to="/blog" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
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
