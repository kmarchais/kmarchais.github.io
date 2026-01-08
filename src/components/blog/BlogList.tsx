import { motion } from "framer-motion";
import { styles } from "../../styles";
import { textVariant, fadeIn } from "../../utils/motion";
import { SectionWrapper } from "../../hoc";
import BlogCard from "./BlogCard";
import { getAllPosts } from "../../utils/blogUtils";

const BlogList = () => {
  const posts = getAllPosts();
  const sortedPosts = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <>
      <motion.div variants={textVariant()}>
        <p className={styles.sectionSubText}>Tutorials & Notes</p>
        <h2 className={styles.sectionHeadText}>Blog.</h2>
      </motion.div>

      <motion.p
        variants={fadeIn("", "", 0.1, 1)}
        className="mt-3 text-secondary text-[17px] max-w-3xl leading-[30px]"
      >
        Technical articles, tutorials, and notes on simulation, software development, and physics.
      </motion.p>

      <div className="mt-20 flex flex-wrap gap-7">
        {sortedPosts.length > 0 ? (
          sortedPosts.map((post, index) => (
            <BlogCard key={post.slug} index={index} {...post} />
          ))
        ) : (
          <p className="text-tertiary">No posts yet. Check back soon!</p>
        )}
      </div>
    </>
  );
};

export default SectionWrapper(BlogList, "blog");
