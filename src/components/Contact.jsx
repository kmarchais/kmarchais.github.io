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
          aria-label="Visit my LinkedIn profile"
          className="hover:text-[#555]"
        >
          <FontAwesomeIcon icon={faLinkedin} aria-hidden="true" />
        </a>
        <a
          href="https://twitter.com/kmarchais_"
          title="Twitter"
          aria-label="Visit my Twitter profile"
          className="hover:text-[#555]"
        >
          <FontAwesomeIcon icon={faTwitter} aria-hidden="true" />
        </a>
        <a
          href="https://github.com/kmarchais"
          title="GitHub"
          aria-label="Visit my GitHub profile"
          className="hover:text-[#555]"
        >
          <FontAwesomeIcon icon={faGithub} aria-hidden="true" />
        </a>
        <a
          href="https://gitlab.com/kmarchais"
          title="GitLab"
          aria-label="Visit my GitLab profile"
          className="hover:text-[#555]"
        >
          <FontAwesomeIcon icon={faGitlab} aria-hidden="true" />
        </a>
      </div>
    </>
  );
};

export default SectionWrapper(Contact, "contact");
