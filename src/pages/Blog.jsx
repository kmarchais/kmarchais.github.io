import { Navbar } from "../components";
import { BlogList } from "../components/blog";

const Blog = () => {
  return (
    <div className="bg-primary min-h-screen">
      <Navbar />
      <div className="pt-20">
        <BlogList />
      </div>
    </div>
  );
};

export default Blog;
