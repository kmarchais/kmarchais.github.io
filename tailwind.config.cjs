/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Editorial dark — a refined cool navy ladder.
        ink: {
          900: "#0a1220",   // page background
          800: "#0e1828",   // surface
          700: "#142036",   // elev
          600: "#1c2a44",   // border solid
        },
        bone: {
          50:  "#f1f3f8",   // primary text (slight cool)
          200: "#c5ccda",   // mid
          400: "#7e8ba3",   // muted
          600: "#4d586d",   // ultra muted
        },
        ember: {
          300: "#f3c789",
          400: "#e8b06a",
          500: "#d99a4e",   // accent
        },
        // Aliases kept for backwards-compat with showcase pages still
        // referencing the old token names.
        primary: "#0a1220",
        secondary: "#7e8ba3",
        tertiary: "#c5ccda",
        accent: "#d99a4e",
        "accent-hover": "#e8b06a",
        surface: "#0e1828",
      },
      fontFamily: {
        display: ['"Cabinet Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Satoshi', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        widish: '0.08em',
        wider2: '0.14em',
        wider3: '0.22em',
      },
      screens: {
        xs: '450px',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.bone.200'),
            fontFamily: theme('fontFamily.sans').join(','),
            a: {
              color: theme('colors.ember.400'),
              textDecoration: 'none',
              borderBottom: `1px solid ${theme('colors.ember.500')}40`,
              '&:hover': { color: theme('colors.ember.300'), borderBottomColor: theme('colors.ember.300') },
            },
            h1: { color: theme('colors.bone.50'), fontFamily: theme('fontFamily.display').join(','), fontWeight: 600 },
            h2: { color: theme('colors.bone.50'), fontFamily: theme('fontFamily.display').join(','), fontWeight: 500 },
            h3: { color: theme('colors.bone.50'), fontFamily: theme('fontFamily.display').join(','), fontWeight: 500 },
            h4: { color: theme('colors.bone.50') },
            strong: { color: theme('colors.bone.50') },
            code: {
              color: theme('colors.ember.300'),
              fontFamily: theme('fontFamily.mono').join(','),
              fontWeight: 400,
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            pre: {
              backgroundColor: theme('colors.ink.800'),
              border: `1px solid ${theme('colors.ink.600')}`,
              color: theme('colors.bone.200'),
            },
            blockquote: {
              color: theme('colors.bone.200'),
              borderLeftColor: theme('colors.ember.500'),
              fontFamily: theme('fontFamily.sans').join(','),
            },
            hr: { borderColor: theme('colors.ink.600') },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
