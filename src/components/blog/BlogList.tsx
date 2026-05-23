import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import { getAllPosts } from "../../utils/blogUtils";

const reveal = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.1 + i * 0.05,
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
  }),
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const EmptyState = () => (
  <motion.div
    custom={1}
    initial="hidden"
    animate="show"
    variants={reveal}
    className="border border-ink-600/60 bg-ink-800/30 px-6 py-12 text-center max-w-2xl mx-auto"
  >
    <span className="font-mono text-[10.5px] tracking-wider3 uppercase text-bone-600">
      Vol. I · No Articles Yet
    </span>
    <p className="mt-5 font-display text-[1.6rem] sm:text-[1.85rem] leading-tight text-bone-50 font-medium tracking-[-0.02em]">
      The blog is quiet<span className="text-ember-400">,</span> for now.
    </p>
    <p className="mt-4 text-bone-400 text-[0.95rem] leading-[1.6] max-w-[44ch] mx-auto">
      One post per open source project is planned, plus longer notes on
      simulation, meshing, and GPU compute.
    </p>
    <div className="mt-7 flex items-center justify-center gap-3">
      <span className="rule flex-1 max-w-[60px]" />
      <span className="font-mono text-[10px] tracking-wider3 uppercase text-bone-600">
        Check back soon
      </span>
      <span className="rule flex-1 max-w-[60px]" />
    </div>
  </motion.div>
);

const PostRow = ({
  index,
  slug,
  title,
  date,
  excerpt,
  tags,
  draft,
}: {
  index: number;
  slug: string;
  title: string;
  date: string;
  excerpt?: string;
  tags?: string[];
  draft?: boolean;
}) => (
  <motion.li
    custom={index + 1}
    initial="hidden"
    animate="show"
    variants={reveal}
    className="border-t border-ink-600/60 first:border-t-0"
  >
    <Link
      to={`/blog/${slug}`}
      className="group grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3 md:gap-10 py-7 hover:bg-ink-800/50 -mx-3 px-3 transition-colors duration-300"
    >
      <span className="font-mono text-[10.5px] tracking-wider2 uppercase text-bone-600 md:pt-2">
        {formatDate(date)}
      </span>
      <div className="min-w-0">
        <div className="flex items-baseline flex-wrap gap-x-3 gap-y-1">
          <h3 className="font-display text-bone-50 text-[1.6rem] sm:text-[1.85rem] leading-[1.1] tracking-[-0.01em] font-medium group-hover:text-ember-300 transition-colors">
            {title}
          </h3>
          {draft && (
            <span className="font-mono text-[10px] tracking-wider3 uppercase text-ember-400 border border-ember-500/40 px-1.5 py-px">
              Draft
            </span>
          )}
        </div>
        {excerpt && (
          <p className="mt-3 text-bone-400 text-[0.95rem] leading-[1.55] max-w-[60ch]">
            {excerpt}
          </p>
        )}
        {tags && tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="font-mono text-[10.5px] tracking-wider2 uppercase text-bone-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  </motion.li>
);

const BlogList = () => {
  const posts = getAllPosts();
  // Filter out posts marked `hidden` — they remain reachable via direct URL
  // (e.g. linked from elsewhere) but stay off the public listing.
  const visiblePosts = posts.filter((p) => !p.hidden);
  const sortedPosts = [...visiblePosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <section className="relative z-10 max-w-[1480px] mx-auto px-6 sm:px-10 lg:px-14 pt-28 pb-16">
      <motion.header
        custom={0}
        initial="hidden"
        animate="show"
        variants={reveal}
        className="mb-12"
      >
        <span className="font-mono text-[10.5px] tracking-wider3 uppercase text-bone-400">
          Notes · Field reports
        </span>
        <h1 className="mt-4 font-display opsz-display text-bone-50 font-light leading-[0.95] tracking-[-0.02em] text-[clamp(2.6rem,6vw,4.5rem)]">
          Blog
        </h1>
        <p className="mt-5 max-w-[52ch] text-bone-200 text-[1.02rem] leading-[1.55]">
          Technical writing on simulation, meshing, GPU compute, and
          adjacent topics. Most posts grow out of an open source project.
        </p>
        <div className="rule mt-10" />
      </motion.header>

      {sortedPosts.length > 0 ? (
        <ul role="list">
          {sortedPosts.map((post, index) => (
            <PostRow key={post.slug} index={index} {...post} />
          ))}
        </ul>
      ) : (
        <EmptyState />
      )}
    </section>
  );
};

export default BlogList;
