import { About, Contact, Hero, Navbar, Tech, Works } from "./";
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
      <Tech />
      <Works />
      <Contact />
    </div>
  );
};

export default Home;
