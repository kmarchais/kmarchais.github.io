import { About, Contact, Experience, Hero, Navbar, Tech, Works } from "./";

import { Html } from "@react-three/drei";
import GradientBackground from "./canvas/GradientBackground";

const Home = () => {
  return (
    <div className="bg-primary">
      <div className="w-screen">
        <Navbar />
        <div className="z-0 static h-screen">
          <GradientBackground />
          <div className="z-10 absolute top-0 left-0 w-screen">
            <Hero />
          </div>
        </div>
      </div>
      <About />
      <Experience />
      <Tech />
      <Works />
      <Contact />
    </div>
  );
};

export default Home;
