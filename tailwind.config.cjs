/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx,mdx}"],
  mode: "jit",
  theme: {
    extend: {
      colors: {
        primary: "#0d1b2a",
        secondary: "#415A77",
        tertiary: "#E0e1dd",
        accent: "#778da9",
        "accent-hover": "#8a9db8",
        surface: "#1B263B",
        "surface-dark": "#0a0f18",
        "black-100": "#100d25",
        "black-200": "#090325",
        "white-100": "#f3f3f3",
      },
      boxShadow: {
        card: "0px 35px 120px -15px #211e35",
      },
      screens: {
        xs: "450px",
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.tertiary'),
            a: {
              color: theme('colors.secondary'),
              '&:hover': {
                color: theme('colors.tertiary'),
              },
            },
            h1: { color: theme('colors.white') },
            h2: { color: theme('colors.white') },
            h3: { color: theme('colors.white') },
            h4: { color: theme('colors.white') },
            strong: { color: theme('colors.white') },
            code: { color: theme('colors.tertiary') },
            blockquote: {
              color: theme('colors.tertiary'),
              borderLeftColor: theme('colors.secondary'),
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
