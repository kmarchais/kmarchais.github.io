# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build locally

# Deployment
npm run deploy       # Build and deploy to GitHub Pages (gh-pages branch)
```

## Architecture

This is a React + Vite personal portfolio website with 3D visualizations using Three.js. Deployed to GitHub Pages at kmarchais.github.io.

### Tech Stack
- **React 18** with React Router for routing
- **Three.js** via @react-three/fiber, @react-three/drei, @react-three/cannon (physics)
- **Tailwind CSS** with custom theme colors (primary, secondary, tertiary)
- **Framer Motion** for animations
- **VTK.js** for scientific visualization components

### Structure

- `src/App.jsx` - Routes configuration (/, /NBody, /Particles, /TPMS, /Vtk, /Example, /Collisions, /Shader)
- `src/components/` - Main page sections (Hero, About, Tech, Works, Contact, Navbar)
- `src/components/canvas/` - Three.js canvas components (Ball, Tpms, GradientBackground)
- `src/components/projects/` - Interactive 3D project pages (physics simulations, shaders)
- `src/constants/index.js` - Site content data (navLinks, services, technologies, projects)
- `src/assets/` - Images and icons with centralized exports via index.js
- `src/hoc/SectionWrapper.jsx` - Higher-order component for consistent section styling
- `src/utils/motion.js` - Framer Motion animation variants

### Patterns
- Three.js components use Canvas from @react-three/fiber
- Section components are wrapped with SectionWrapper HOC
- Asset imports centralized through `src/assets/index.js`
