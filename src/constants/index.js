import {
    backend,
    blender,
    cpp,
    creator,
    cuda,
    github,
    github_logo,
    linux,
    microgen,
    mobile,
    pdf,
    phd,
    python,
    reactjs,
    threejs,
    unreal,
    web,
    website
} from "../assets";

export const navLinks = [
    {
        id: "about",
        title: "About",
    },
    {
        id: "projects",
        title: "Projects",
    },
    {
        id: "contact",
        title: "Contact",
    },
];

const services = [
    {
        title: "Physics simulations",
        icon: web,
    },
    {
        title: "Particle based simulations",
        icon: mobile,
    },
    {
        title: "Additive manufacturing",
        icon: backend,
    },
    {
        title: "Machine Learning",
        icon: creator,
    },
];

const technologies = [
    {
        name: "Python",
        icon: python,
    },
    {
        name: "C++",
        icon: cpp,
    },
    {
        name: "CUDA",
        icon: cuda,
    },
    {
        name: "GitHub",
        icon: github_logo,
    },
    {
        name: "Linux",
        icon: linux,
    },
    {
        name: "React JS",
        icon: reactjs,
    },
    {
        name: "Three JS",
        icon: threejs,
    },
    {
        name: "Blender",
        icon: blender,
    },
    {
        name: "Unreal Engine",
        icon: unreal,
    },
];


const projects = [
    {
        name: "PhD - 3D printing",
        description:
            "Developed numerical simulation tools to predict the granular behaviour of powder in LPBF additive manufacturing process for metal pieces.",
        tags: [
            {
                name: "3Dprinting",
                color: "blue-text-gradient",
            },
            {
                name: "DEM",
                color: "green-text-gradient",
            },
            {
                name: "C++",
                color: "pink-text-gradient",
            },
        ],
        image: phd,
        source_code_link: "https://pastel.archives-ouvertes.fr/tel-03663374v1/document",
        link_logo: pdf
    },
    {
        name: "Microgen",
        description:
            "Development of an open source software to generate parametric lattice structures including Triply Periodic Minimal Surfaces with 3MAH team at I2M Bordeaux.",
        tags: [
            {
                name: "Lattice",
                color: "blue-text-gradient",
            },
            {
                name: "OpenSource",
                color: "green-text-gradient",
            },
            {
                name: "Python",
                color: "pink-text-gradient",
            },
        ],
        image: microgen,
        source_code_link: "https://github.com/3MAH/microgen",
        link_logo: github
    },
    {
        name: "Personal website",
        description:
            "This personal website to explore web development and experiment animated 3D scenes with Three.js.",
        tags: [
            {
                name: "WebDev",
                color: "blue-text-gradient",
            },
            {
                name: "ReactJS",
                color: "green-text-gradient",
            },
            {
                name: "ThreeJS",
                color: "pink-text-gradient",
            },
        ],
        image: website,
        source_code_link: "https://github.com/",
        link_logo: github
    },
];

export { services, technologies, projects };
