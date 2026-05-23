import { lazy, Suspense, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons/faGithub";
import { faLinkedin } from "@fortawesome/free-brands-svg-icons/faLinkedin";

import { openSource, social, stack } from "@/constants";
import type { OpenSourceProject } from "@/types";
import profile from "@/assets/profile.jpg";

const GyroidFlowWidget = lazy(() => import("./canvas/GyroidFlowWidget"));

// Motion variants ---------------------------------------------------------
const reveal = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.1 + i * 0.06,
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

// Small typographic atoms -------------------------------------------------
const Eyebrow = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span
    className={`font-mono text-[10.5px] tracking-wider3 uppercase text-bone-400 ${className}`}
  >
    {children}
  </span>
);

const HairRule = ({ className = "" }: { className?: string }) => (
  <div className={`rule ${className}`} aria-hidden="true" />
);

// Sections ----------------------------------------------------------------

const TopBar = () => (
  <motion.header
    custom={0}
    initial="hidden"
    animate="show"
    variants={reveal}
    className="fixed top-0 left-0 right-0 z-30 bg-ink-900 border-b border-ink-600/40 lg:bg-transparent lg:border-b-0 px-5 sm:px-8 lg:px-14 py-4 lg:py-5"
  >
    <div className="flex items-center justify-between max-w-[1480px] mx-auto">
      <Link to="/" className="group inline-flex items-baseline gap-3" aria-label="Kevin Marchais, home">
        <span className="font-mono text-[11px] tracking-wider3 uppercase text-bone-400 group-hover:text-bone-50 transition-colors">
          KM
        </span>
      </Link>
      <nav className="flex items-center gap-7" aria-label="Primary">
        <Link
          to="/blog"
          className="font-mono text-[11px] tracking-wider2 uppercase text-bone-400 hover:text-bone-50 transition-colors"
        >
          Blog
        </Link>
      </nav>
    </div>
  </motion.header>
);

const Identity = () => (
  <div className="space-y-5">
    <motion.div
      custom={1}
      initial="hidden"
      animate="show"
      variants={reveal}
      className="flex items-center gap-4"
    >
      <img
        src={profile}
        alt="Portrait of Kevin Marchais"
        className="w-14 h-14 rounded-full object-cover ring-1 ring-bone-50/15 grayscale-[35%]"
      />
      <Eyebrow>Research Engineer · Simulation Software</Eyebrow>
    </motion.div>

    <motion.h1
      custom={2}
      initial="hidden"
      animate="show"
      variants={reveal}
      className="font-display text-bone-50 font-medium leading-[0.9] tracking-[-0.035em] text-[clamp(2.6rem,7vw,5.5rem)]"
    >
      Kevin <span className="text-ember-400">Marchais</span>
    </motion.h1>

    <motion.p
      custom={3}
      initial="hidden"
      animate="show"
      variants={reveal}
      className="text-bone-200 text-[0.98rem] sm:text-[1.05rem] leading-[1.55] max-w-[48ch] text-left sm:text-justify hyphens-auto"
    >
      Research engineer working on numerical simulation of mechanical
      systems. I build the GPU-accelerated code that runs the simulations,
      the tools that visualize their output, and the neural networks that
      learn to accelerate them. The aim, across all three: heavy
      computation, made fast enough to be useful.
    </motion.p>
  </div>
);

const Stack = () => (
  <motion.div
    custom={4}
    initial="hidden"
    animate="show"
    variants={reveal}
    className="flex items-center gap-3"
  >
    <Eyebrow>Stack</Eyebrow>
    <span className="text-bone-600">·</span>
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[12px] text-bone-200">
      {stack.map((s, i) => (
        <li key={s} className="inline-flex items-center gap-3">
          <span>{s}</span>
          {i < stack.length - 1 && <span aria-hidden className="text-bone-600">/</span>}
        </li>
      ))}
    </ul>
  </motion.div>
);

const ProjectRow = ({ project, index }: { project: OpenSourceProject; index: number }) => {
  const expandable = (project.children?.length ?? 0) > 0;
  const [expanded, setExpanded] = useState(false);
  const reducedMotion = useReducedMotion();

  const baseRowClass =
    "group grid grid-cols-[60px_1fr_auto] items-baseline gap-4 py-3 hover:bg-ink-800/60 -mx-3 px-3 transition-colors duration-300 rounded-[2px] w-full text-left";

  const RowInner = (
    <>
      <span className="font-mono text-[10px] tracking-wider2 uppercase text-bone-600">
        {project.role === "author" ? "Author" : "Contrib"}
      </span>
      <span className="min-w-0">
        <span className="font-display text-bone-50 text-[1.25rem] leading-tight font-medium tracking-[-0.015em] group-hover:text-ember-300 transition-colors">
          {project.name}
        </span>
        <span className="block mt-0.5 text-bone-400 text-[0.825rem] leading-[1.45] max-w-[48ch]">
          {project.blurb}
        </span>
      </span>
      <span className="font-mono text-[11px] text-bone-600 group-hover:text-ember-400 transition-colors flex items-center self-center w-4 justify-end">
        {expandable ? (
          <motion.span
            aria-hidden
            initial={false}
            animate={{ rotate: expanded ? 45 : 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="inline-block"
          >
            +
          </motion.span>
        ) : (
          <span aria-hidden className="inline-block transition-transform group-hover:translate-x-1 group-hover:-translate-y-1">
            ↗
          </span>
        )}
      </span>
    </>
  );

  return (
    <motion.li
      custom={6 + index}
      initial="hidden"
      animate="show"
      variants={reveal}
    >
      {expandable ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className={baseRowClass}
        >
          {RowInner}
        </button>
      ) : (
        <a
          href={project.links[0]?.url}
          target="_blank"
          rel="noopener noreferrer"
          className={baseRowClass + " block"}
        >
          {RowInner}
        </a>
      )}

      {expandable && (
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="children"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { duration: 0.32, ease: [0.16, 1, 0.3, 1] }
              }
              className="overflow-hidden"
            >
              <ul className="pl-[60px] pr-3 -mx-3 pb-2 pt-1">
                {project.children!.map((child, i) => (
                  <li
                    key={child.url}
                    className={`relative pl-5 py-2.5 ${i > 0 ? 'border-t border-ink-600/40' : ''}`}
                  >
                    <span aria-hidden className="absolute left-0 top-0 bottom-0 w-px bg-ink-600/60" />
                    <a
                      href={child.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/child block"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-mono text-[12px] text-bone-200 group-hover/child:text-ember-300 transition-colors">
                          {child.name}
                        </span>
                        <span
                          aria-hidden
                          className="font-mono text-[11px] text-bone-600 group-hover/child:text-ember-400 transition-all duration-300 group-hover/child:translate-x-1 group-hover/child:-translate-y-0.5"
                        >
                          ↗
                        </span>
                      </div>
                      <p className="mt-1 text-bone-400 text-[0.8rem] leading-[1.5] max-w-[52ch]">
                        {child.blurb}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.li>
  );
};

const OpenSource = () => (
  <motion.section
    custom={5}
    initial="hidden"
    animate="show"
    variants={reveal}
    aria-labelledby="oss-heading"
    className="space-y-2"
  >
    <div className="flex items-baseline justify-between gap-4">
      <h2 id="oss-heading">
        <Eyebrow>Open Source</Eyebrow>
      </h2>
      <Eyebrow className="text-bone-600">{String(openSource.length).padStart(2, "0")} entries</Eyebrow>
    </div>
    <HairRule />
    <ul className="divide-y divide-ink-600/60">
      {openSource.map((p, i) => (
        <ProjectRow key={p.name} project={p} index={i} />
      ))}
    </ul>
  </motion.section>
);

const Footer = () => (
  <motion.footer
    custom={9}
    initial="hidden"
    animate="show"
    variants={reveal}
    className="flex items-center justify-between gap-6"
  >
    <div className="flex items-center gap-5">
      <a
        href={social.github}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub"
        className="group inline-flex items-center gap-2 text-bone-400 hover:text-bone-50 transition-colors"
      >
        <FontAwesomeIcon icon={faGithub} className="text-[1.25rem]" />
        <span className="font-mono text-[11px] tracking-wider2 uppercase opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
          github
        </span>
      </a>
      <a
        href={social.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="LinkedIn"
        className="group inline-flex items-center gap-2 text-bone-400 hover:text-bone-50 transition-colors"
      >
        <FontAwesomeIcon icon={faLinkedin} className="text-[1.25rem]" />
        <span className="font-mono text-[11px] tracking-wider2 uppercase opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
          linkedin
        </span>
      </a>
    </div>
    <Link
      to="/blog"
      className="group font-mono text-[11px] tracking-wider2 uppercase text-bone-400 hover:text-ember-400 transition-colors flex items-center gap-2"
    >
      <span>Read the blog</span>
      <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
    </Link>
  </motion.footer>
);

// `id` is the geometryType passed into GyroidFlowWidget (1 = gyroid, 0 =
// hourglass, set by the widget). Array ORDER controls how figures are
// numbered on the page.
const SCENES: { id: number; name: string; subtitle: string }[] = [
  { id: 1, name: "Gyroid",    subtitle: "particles through a TPMS field" },
  { id: 0, name: "Hourglass", subtitle: "granular flow through an hourglass" },
];

const Specimen = () => {
  const reducedMotion = useReducedMotion();
  const [sceneId, setSceneId] = useState<number>(SCENES[0].id);
  const sceneIndex = Math.max(0, SCENES.findIndex((s) => s.id === sceneId));
  const scene = SCENES[sceneIndex];

  return (
    <motion.aside
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.55, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="relative h-full flex flex-col"
      aria-label="Real-time WebGPU particle simulation"
    >
      <div className="flex items-center justify-between gap-4 mb-3">
        <Eyebrow>
          Fig. {String(sceneIndex + 1).padStart(2, "0")} · {scene.name}
        </Eyebrow>
        <div role="radiogroup" aria-label="Simulation scene" className="flex items-center gap-3">
          {SCENES.map((s, i) => {
            const active = s.id === sceneId;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSceneId(s.id)}
                className={`group font-mono text-[10.5px] tracking-wider2 uppercase transition-colors duration-300 ${
                  active ? "text-bone-50" : "text-bone-600 hover:text-bone-200"
                }`}
              >
                <span className={`mr-1 ${active ? "text-ember-400" : "text-bone-600"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={`relative ${active ? "pb-0.5 border-b border-ember-400" : ""}`}>
                  {s.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {/* Below lg: fixed aspect ratio (slightly taller than square) so the
          gyroid/hourglass scenes have room without dominating the page.
          At lg+: flex-1 fills the column height like before. */}
      <div className="specimen relative w-full max-w-[520px] mx-auto aspect-[4/5] lg:max-w-none lg:mx-0 lg:aspect-auto lg:flex-1 min-h-[280px] lg:min-h-0">
        <div className="absolute inset-0 border border-ink-600/80 bg-ink-800/40 overflow-hidden">
          <Suspense
            fallback={
              <div className="absolute inset-0 grid place-items-center">
                <span className="canvas-loader" />
              </div>
            }
          >
            <GyroidFlowWidget
              className="absolute inset-0"
              particleCount={reducedMotion ? 600 : 2000}
              showHourglass={true}
              geometryType={sceneId}
            />
          </Suspense>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <Eyebrow className="text-bone-600">{scene.subtitle}</Eyebrow>
        <Eyebrow className="text-bone-600">interactive</Eyebrow>
      </div>
    </motion.aside>
  );
};

const HomeNew = () => {
  return (
    // h-screen + overflow-hidden ONLY at lg. Below that the page scrolls
    // naturally so the content column and the specimen don't fight for
    // vertical space.
    <div className="relative min-h-screen lg:h-screen text-bone-200 grain lg:overflow-hidden">
      <TopBar />

      <main
        className="
          relative z-10
          mx-auto max-w-[1480px]
          px-5 sm:px-8 lg:px-14
          pt-20 sm:pt-24 lg:pt-20 pb-10 lg:pb-8
          grid grid-cols-1 gap-10 lg:gap-12
          lg:grid-cols-12 lg:h-full
        "
      >
        <div className="lg:col-span-7 xl:col-span-6 flex flex-col gap-8 lg:gap-5 lg:justify-between lg:py-2 lg:min-h-0">
          <div className="space-y-7 lg:space-y-7">
            <Identity />
            <Stack />
            <OpenSource />
          </div>
          <Footer />
        </div>

        <div className="lg:col-span-5 xl:col-span-6 lg:py-2 lg:min-h-0">
          <Specimen />
        </div>
      </main>
    </div>
  );
};

export default HomeNew;
