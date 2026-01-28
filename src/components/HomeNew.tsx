import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { profile } from "../assets";
import { technologies, projects, demos } from "../constants";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons/faGithub";
import { faLinkedin } from "@fortawesome/free-brands-svg-icons/faLinkedin";
import { faTwitter } from "@fortawesome/free-brands-svg-icons/faTwitter";
import { faGitlab } from "@fortawesome/free-brands-svg-icons/faGitlab";

// Lazy load the gyroid flow widget to avoid blocking initial render
const GyroidFlowWidget = lazy(() => import("./canvas/GyroidFlowWidget"));

interface State {
  name: string;
}

const STATES: State[] = [
  { name: "Hero" },
  { name: "About" },
  { name: "Projects" },
  { name: "Tech" },
  { name: "Contact" },
];

const TRANSITION_DURATION = 50;

interface StateIndicatorProps {
  currentState: number;
  onStateChange: (index: number) => void;
}

const StateIndicator = ({ currentState, onStateChange }: StateIndicatorProps) => {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-30">
      {STATES.map((state, index) => (
        <button
          key={state.name}
          onClick={() => onStateChange(index)}
          className={`w-3 h-3 rounded-full transition-all duration-300 ${
            currentState === index
              ? "bg-white scale-125"
              : "bg-white/30 hover:bg-white/50"
          }`}
          aria-label={`Go to ${state.name}`}
        />
      ))}
    </div>
  );
};

interface NavbarProps {
  currentState: number;
  onStateChange: (index: number) => void;
}

const Navbar = ({ currentState, onStateChange }: NavbarProps) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-30 px-6 sm:px-16 py-5">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <button
          onClick={() => onStateChange(0)}
          className="flex items-center gap-3"
        >
          <img src={profile} alt="Kevin Marchais" className="w-10 h-10 rounded-full object-cover" />
          <p className="text-white text-[18px] font-bold hidden sm:block">Kevin Marchais</p>
        </button>
        <ul className="hidden sm:flex flex-row gap-8">
          {STATES.slice(1).map((state, index) => (
            <li key={state.name}>
              <button
                onClick={() => onStateChange(index + 1)}
                className={`text-[16px] font-medium transition-colors ${
                  currentState === index + 1
                    ? "text-white"
                    : "text-tertiary hover:text-white"
                }`}
              >
                {state.name}
              </button>
            </li>
          ))}
          <li>
            <Link
              to="/blog"
              className="text-[16px] font-medium text-tertiary hover:text-white transition-colors"
            >
              Blog
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

const HeroContent = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.5 }}
    className="text-left"
  >
    <div className="flex items-center gap-6 mb-6">
      <div className="relative">
        <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl scale-110" />
        <img
          src={profile}
          alt="Kevin Marchais"
          className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover ring-2 ring-accent/50"
        />
      </div>
      <h1 className="text-white font-black text-[36px] sm:text-[56px] lg:text-[64px] leading-tight">
        Hi, I'm <span className="text-accent">Kevin</span>
      </h1>
    </div>
    <p className="text-tertiary text-[16px] sm:text-[20px] max-w-xl">
      Research engineer specializing in physics simulation,
      particle-based methods, and scientific computing.
    </p>
    <div className="mt-8 flex gap-4">
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('changeState', { detail: 1 }))}
        className="px-6 py-3 bg-accent text-primary font-semibold rounded-lg hover:bg-accent-hover transition-colors"
      >
        Learn More
      </button>
      <Link
        to="/blog"
        className="px-6 py-3 border border-tertiary text-tertiary font-semibold rounded-lg hover:bg-tertiary/10 transition-colors"
      >
        Read Blog
      </Link>
    </div>
  </motion.div>
);

const AboutContent = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.5 }}
    className="max-w-2xl"
  >
    <h2 className="text-white font-bold text-[32px] sm:text-[48px] mb-6">
      About Me
    </h2>
    <p className="text-tertiary text-[16px] sm:text-[18px] leading-relaxed mb-6">
      I'm a research engineer with expertise in numerical simulation and scientific software development.
      My work focuses on particle-based methods like DEM (Discrete Element Method) for simulating granular materials in additive manufacturing processes.
    </p>
    <div className="grid grid-cols-2 gap-4 mt-8">
      {[
        "Physics Simulations",
        "Particle Methods",
        "Additive Manufacturing",
        "Machine Learning"
      ].map((skill) => (
        <div
          key={skill}
          className="bg-surface/50 backdrop-blur-sm px-4 py-3 rounded-lg text-tertiary text-sm"
        >
          {skill}
        </div>
      ))}
    </div>
  </motion.div>
);

const ProjectsContent = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.5 }}
    className="max-w-3xl"
  >
    <h2 className="text-white font-bold text-[32px] sm:text-[48px] mb-4">
      Projects
    </h2>

    {/* Interactive Demos */}
    <h3 className="text-accent font-semibold text-sm uppercase tracking-wider mb-3">
      Interactive Demos
    </h3>
    <div className="grid grid-cols-2 gap-3 mb-6">
      {demos.map((demo) => (
        <Link
          key={demo.name}
          to={demo.path}
          className="bg-surface/50 backdrop-blur-sm p-3 rounded-lg hover:bg-surface/70 transition-colors group"
        >
          <h4 className="text-white font-semibold text-sm group-hover:text-accent transition-colors">
            {demo.name}
          </h4>
          <p className="text-tertiary text-xs mt-1 line-clamp-2">
            {demo.description}
          </p>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {demo.tags.slice(0, 2).map((tag) => (
              <span key={tag.name} className={`text-[10px] ${tag.color}`}>
                #{tag.name}
              </span>
            ))}
          </div>
        </Link>
      ))}
    </div>

    {/* Research Projects */}
    <h3 className="text-accent font-semibold text-sm uppercase tracking-wider mb-3">
      Research & Open Source
    </h3>
    <div className="grid gap-3">
      {projects.slice(0, 2).map((project) => (
        <a
          key={project.name}
          href={project.source_code_link}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-surface/50 backdrop-blur-sm p-3 rounded-lg hover:bg-surface/70 transition-colors group"
        >
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-white font-semibold text-sm group-hover:text-accent transition-colors">
                {project.name}
              </h4>
              <p className="text-tertiary text-xs mt-1 line-clamp-1">
                {project.description}
              </p>
            </div>
            <span className="text-tertiary text-lg">↗</span>
          </div>
        </a>
      ))}
    </div>
    <Link
      to="/blog"
      className="inline-block mt-4 text-accent hover:text-white transition-colors text-sm"
    >
      View blog →
    </Link>
  </motion.div>
);

const TechContent = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.5 }}
    className="max-w-2xl"
  >
    <h2 className="text-white font-bold text-[32px] sm:text-[48px] mb-6">
      Tech Stack
    </h2>
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-6">
      {technologies.map((tech) => (
        <div
          key={tech.name}
          className="flex flex-col items-center gap-2 group"
        >
          <div className="w-16 h-16 bg-surface/50 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:bg-surface/70 transition-colors">
            <img src={tech.icon} alt={tech.name} className="w-10 h-10 object-contain" />
          </div>
          <span className="text-tertiary text-xs text-center">{tech.name}</span>
        </div>
      ))}
    </div>
  </motion.div>
);

const ContactContent = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.5 }}
    className="max-w-xl"
  >
    <h2 className="text-white font-bold text-[32px] sm:text-[48px] mb-6">
      Get in Touch
    </h2>
    <p className="text-tertiary text-[16px] sm:text-[18px] mb-8">
      Interested in collaboration or have questions about my work?
      Feel free to reach out through any of these platforms.
    </p>
    <div className="flex gap-8 text-4xl">
      <a
        href="https://www.linkedin.com/in/kevin-marchais/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="LinkedIn"
        className="text-tertiary hover:text-white transition-colors"
      >
        <FontAwesomeIcon icon={faLinkedin} />
      </a>
      <a
        href="https://github.com/kmarchais"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub"
        className="text-tertiary hover:text-white transition-colors"
      >
        <FontAwesomeIcon icon={faGithub} />
      </a>
      <a
        href="https://twitter.com/kmarchais_"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Twitter"
        className="text-tertiary hover:text-white transition-colors"
      >
        <FontAwesomeIcon icon={faTwitter} />
      </a>
      <a
        href="https://gitlab.com/kmarchais"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitLab"
        className="text-tertiary hover:text-white transition-colors"
      >
        <FontAwesomeIcon icon={faGitlab} />
      </a>
    </div>
  </motion.div>
);

const CONTENT_COMPONENTS = [
  HeroContent,
  AboutContent,
  ProjectsContent,
  TechContent,
  ContactContent,
];

const HomeNew = () => {
  const [currentState, setCurrentState] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const lastWheelTime = useRef(0);
  const touchStartY = useRef(0);
  const isMounted = useRef(true);

  const changeState = useCallback((newState: number) => {
    if (!isMounted.current) return;
    if (isTransitioning || newState === currentState) return;
    if (newState < 0 || newState >= STATES.length) return;

    setIsTransitioning(true);

    // Simple transition timing
    setTimeout(() => {
      if (isMounted.current) {
        setCurrentState(newState);
        setIsTransitioning(false);
      }
    }, TRANSITION_DURATION);
  }, [currentState, isTransitioning]);

  // Cleanup mounted ref on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheelTime.current < 50) return;
      lastWheelTime.current = now;

      if (e.deltaY > 0) {
        changeState(currentState + 1);
      } else {
        changeState(currentState - 1);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        changeState(currentState + 1);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        changeState(currentState - 1);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const deltaY = touchStartY.current - e.changedTouches[0].clientY;
      if (Math.abs(deltaY) > 50) {
        if (deltaY > 0) {
          changeState(currentState + 1);
        } else {
          changeState(currentState - 1);
        }
      }
    };

    const handleCustomStateChange = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      changeState(customEvent.detail);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("changeState", handleCustomStateChange);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("changeState", handleCustomStateChange);
    };
  }, [currentState, changeState]);


  const ContentComponent = CONTENT_COMPONENTS[currentState];

  return (
    <div className="fixed inset-0 bg-primary overflow-hidden">
      <Navbar currentState={currentState} onStateChange={changeState} />

      {/* Main content area with 50/50 split on large screens */}
      <div className="relative z-10 h-full flex">
        {/* Left side: Content */}
        <div className="w-full lg:w-1/2 h-full flex items-center">
          <div className="w-full max-w-2xl mx-auto px-6 sm:px-16 lg:pr-8">
            <AnimatePresence mode="wait">
              <ContentComponent key={currentState} />
            </AnimatePresence>
          </div>
        </div>

        {/* Right side: Gyroid Flow Simulation (hidden on mobile) */}
        <div className="hidden lg:block lg:w-1/2 h-full relative">
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-primary">
                <div className="text-tertiary/50 text-sm">Loading simulation...</div>
              </div>
            }
          >
            <GyroidFlowWidget
              className="w-full h-full"
              particleCount={2000}
              showHourglass={true}
              geometryType={currentState >= 1 ? 1 : 0}
            />
          </Suspense>
        </div>
      </div>

      <StateIndicator currentState={currentState} onStateChange={changeState} />

      <div className="fixed bottom-8 right-8 text-tertiary/50 text-sm hidden lg:block z-20">
        <span>Scroll or use arrow keys</span>
      </div>
    </div>
  );
};

export default HomeNew;
