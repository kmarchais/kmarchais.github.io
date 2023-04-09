import {
    ariane, backend, blender, cpp, creator, cuda, github, github_logo, hivelix, i2m, linux, matlab, microgen, mobile, pdf, phd, python, reactjs, safran, survitec, threejs, unreal, web, website
} from "../assets";

export const navLinks = [
    {
        id: "about",
        title: "About",
    },
    {
        id: "work",
        title: "Work",
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
        title: "3D web applications",
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

const experiences = [
    {
        title: "Research Engineer",
        company_name: "Hivelix",
        icon: hivelix,
        iconBg: "#ffffff",
        date: "Jan 2023 - Present",
        points: [
            "Developing particle physics simulations on GPU.",
            "Characterizing of granular behavior of different granular media."
        ],
    },
    {
        title: "Research Engineer",
        company_name: "I2M Bordeaux",
        icon: i2m,
        iconBg: "#ffffff",
        date: "Nov 2021 - Nov 2022",
        points: [
            "Developing Python and C++ codes for additive manufacturing simulations.",
            "Implementing of a continuous integration process for softwares developed in the DuMAS department of the I2M laboratory.",
        ],
    },
    {
        title: "PhD thesis - Numerical simulation of 3D printing process of metallic materials",
        company_name: "Safran Additive Manufacturing",
        icon: safran,
        iconBg: "#ffffff",
        date: "Feb 2018 - Feb 2021",
        points: [
            "Numerical analysis of the spreadability of a metal powder - Application to the Laser Powder Bed Fusion process.",
            "Research work in collaboration with the Institute of Mechanics and Engineering (I2M) laboratory of Bordeaux.",
            "Developing a 3D numerical model of powder spreading process with Discrete Element Method (DEM).",
            "Developing an identification method for material properties.",
            "Analyzing the influence of process parameters on powder bed quality.",
        ],
    },
    {
        title: "Internship",
        company_name: "ArianeGroup",
        icon: ariane,
        iconBg: "#ffffff",
        date: "Mar 2017 - Sep 2017",
        points: [
            "Developing multi physics simulations to simulate the cooking process of organic matrix composite pieces in real time for Ariane launchers.",
            "Developing a numerical reduced order model based on Proper Generalized Decomposition (PGD) method.",
        ],
    },
    {
        title: "Internship",
        company_name: "Survitec - Zodiac",
        icon: survitec,
        iconBg: "#ffffff",
        date: "Juin 2016 - Sep 2016",
        points: [
            "Heat transfer numerical simulations for liferaft containers in extreme cold conditions (polar code).",
            "Developing a numerical model and a graphical user interface.",
        ],
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

export { services, technologies, experiences, projects };

