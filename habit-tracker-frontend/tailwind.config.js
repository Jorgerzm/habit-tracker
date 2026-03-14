/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Playfair Display + DM Sans cargadas desde Google Fonts en index.css
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // La paleta principal viene de las clases de Tailwind (stone, amber, emerald).
        // Solo añadimos los tokens semánticos del diseño editorial.
        habit: {
          completed: '#10b981',   // emerald-500
          pending:   '#d97706',   // amber-600
          failed:    '#ef4444',   // red-500
          skipped:   '#d6d3d1',   // stone-300
        }
      },
      borderRadius: {
        xl:  '12px',
        '2xl': '18px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,.05), 0 1px 2px rgba(0,0,0,.04)',
        'card-hover': '0 6px 20px rgba(0,0,0,.09), 0 2px 6px rgba(0,0,0,.05)',
      }
    },
  },
  plugins: [],
}
