import { BrowserRouter, Route, Routes } from "react-router-dom";

import {
  Collisions,
  Example,
  Home,
  NBody,
  Particles,
  Shader,
  TPMS,
  Vtk,
} from "./components";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
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
