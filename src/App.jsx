import { BrowserRouter, Route, Routes } from "react-router-dom"

import { Collisions, Example, Home, NBody, Particles, Vtk } from './components'

const App = () => {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/NBody" element={<NBody />} />
        <Route path="/Particles" element={<Particles />} />
        <Route path="/Vtk" element={<Vtk />} />
        <Route path="/Example" element={<Example />} />
        <Route path="/Collisions" element={<Collisions />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
