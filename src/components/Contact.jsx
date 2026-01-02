import { motion } from "framer-motion";

import { styles } from "../styles";

import { SectionWrapper } from "../hoc";

import { textVariant } from "../utils/motion";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { faGithub } from "@fortawesome/free-brands-svg-icons/faGithub";
import { faGitlab } from "@fortawesome/free-brands-svg-icons/faGitlab";
import { faLinkedin } from "@fortawesome/free-brands-svg-icons/faLinkedin";
import { faTwitter } from "@fortawesome/free-brands-svg-icons/faTwitter";
const Contact = () => {
  return (
    <>
      <motion.div variants={textVariant()}>
        <p className={styles.sectionSubText}>How to reach me</p>
        <h2 className={styles.sectionHeadText}>Social medias.</h2>
      </motion.div>

      <div className="mt-10 flex justify-center flex-wrap space-x-10 text-5xl ">
        <a
          href="https://www.linkedin.com/in/kevin-marchais/"
          title="LinkedIn"
          className="hover:text-[#555]"
        >
          <FontAwesomeIcon icon={faLinkedin} />
        </a>
        <a
          href="https://twitter.com/kmarchais_"
          title="Twitter"
          className="hover:text-[#555]"
        >
          <FontAwesomeIcon icon={faTwitter} />
        </a>
        <a
          href="https://github.com/kmarchais"
          title="GitHub"
          className="hover:text-[#555]"
        >
          <FontAwesomeIcon icon={faGithub} />
        </a>
        <a
          href="https://gitlab.com/kmarchais"
          title="GitLab"
          className="hover:text-[#555]"
        >
          <FontAwesomeIcon icon={faGitlab} />
        </a>
      </div>
    </>
  );
};

export default SectionWrapper(Contact, "contact");
