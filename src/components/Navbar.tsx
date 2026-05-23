import { Link, useLocation } from "react-router-dom";

const ROUTE_LABEL: Record<string, string> = {
  "/blog": "Blog",
};

const Navbar = () => {
  const { pathname } = useLocation();
  const label = ROUTE_LABEL[pathname] ?? "";

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-ink-900/85 backdrop-blur-sm">
      <div className="max-w-[1480px] mx-auto px-6 sm:px-10 lg:px-14 py-4 flex items-center justify-between gap-6">
        <Link
          to="/"
          className="group inline-flex items-baseline gap-3"
          aria-label="Kevin Marchais, home"
        >
          <span className="font-mono text-[11px] tracking-wider3 uppercase text-bone-400 group-hover:text-bone-50 transition-colors">
            KM
          </span>
          {label && (
            <>
              <span aria-hidden className="text-bone-600 font-mono text-[11px]">/</span>
              <span className="font-mono text-[10.5px] tracking-wider2 uppercase text-bone-200 truncate max-w-[60vw]">
                {label}
              </span>
            </>
          )}
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-6">
          <Link
            to="/"
            className="font-mono text-[11px] tracking-wider2 uppercase text-bone-400 hover:text-bone-50 transition-colors"
          >
            Home
          </Link>
          <Link
            to="/blog"
            className="font-mono text-[11px] tracking-wider2 uppercase text-bone-400 hover:text-bone-50 transition-colors"
          >
            Blog
          </Link>
        </nav>
      </div>
      <div className="rule" aria-hidden="true" />
    </header>
  );
};

export default Navbar;
