import Tilt from "react-parallax-tilt";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { fadeIn } from "../../utils/motion";

interface BlogCardProps {
  index: number;
  slug: string;
  title: string;
  date: string;
  excerpt?: string;
  tags?: string[];
}

const BlogCard = ({ index, slug, title, date, excerpt, tags }: BlogCardProps) => {
  return (
    <motion.div variants={fadeIn("up", "spring", 0.5 * index, 0.75)}>
      <Tilt
        className="bg-[#1B263B] p-5 rounded-2xl sm:w-[360px] w-full"
      >
        <Link to={`/blog/${slug}`}>
          <div className="mb-3">
            <p className="text-secondary text-[12px]">
              {new Date(date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <h3 className="text-white font-bold text-[20px] leading-tight">{title}</h3>
          <p className="mt-3 text-tertiary text-[14px] line-clamp-3">{excerpt}</p>
          {tags && tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="text-[12px] text-secondary">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </Link>
      </Tilt>
    </motion.div>
  );
};

export default BlogCard;
