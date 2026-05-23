import Navbar from "../components/Navbar";
import BlogList from "../components/blog/BlogList";

const Blog = () => {
  return (
    <div className="min-h-screen text-bone-200 grain">
      <Navbar />
      <BlogList />
    </div>
  );
};

export default Blog;
