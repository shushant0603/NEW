/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sure: {
          primary: '#0F2D64',      // Buttons, Active Links (#0F2D64)
          blue: '#2563EB',         // Primary Light / Hover / Links (#2563EB)
          emerald: '#10B981',      // Accent Success / Growth (#10B981)
          emeraldLight: '#D1FAE5', // Accent Light background (#D1FAE5)
          dark: '#1F2937',         // Text Primary Headings (#1F2937)
          muted: '#6B7280',        // Text Secondary Subtext (#6B7280)
          border: '#E5E7EB',       // Input & Card borders (#E5E7EB)
          sidebarBg: '#F0F6FF',    // Sidebar tint (#F0F6FF)
          pageBg: '#F8FAFC',       // Page background (#F8FAFC)
          cardBg: '#FFFFFF',       // White card background
        },
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#10B981',
          600: '#0d9488',
          700: '#0F2D64',
          800: '#0F2D64',
          900: '#0A1E42',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
