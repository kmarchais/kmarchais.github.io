import { BrowserRouter, Route, Routes } from "react-router-dom";

import {
  Collisions,
  Example,
  HomeNew,
  NBody,
  Particles,
  Shader,
  TPMS,
  Vtk,
} from "./components";

import { Blog, BlogPostPage } from "./pages";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeNew />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/NBody" element={<NBody />} />
        <Route path="/Particles" element={<Particles />} />
        <Route path="/TPMS" element={<TPMS />} />
        <Route path="/Vtk" element={<Vtk />} />
        <Route path="/Example" element={<Example />} />
        <Route path="/Collisions" element={<Collisions />} />
        <Route path="/Shader" element={<Shader />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
