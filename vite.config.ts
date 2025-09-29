import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        // Cache busting para arquivos estáticos
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
        manualChunks: (id) => {
          // Separate vendor chunks for better caching
          if (id.includes('node_modules')) {
            // React core libraries
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // Radix UI components
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            // Supabase and query libraries
            if (id.includes('@supabase') || id.includes('@tanstack')) {
              return 'data-vendor';
            }
            // Chart and visualization libraries
            if (id.includes('recharts') || id.includes('date-fns')) {
              return 'chart-vendor';
            }
            // Other vendors
            return 'vendor';
          }
          // Separate admin routes
          if (id.includes('/pages/Admin')) {
            return 'admin';
          }
          // Separate member area routes
          if (id.includes('/pages/Members') || id.includes('/pages/ModernMembers')) {
            return 'members';
          }
          // Separate seller dashboard
          if (id.includes('/pages/Seller')) {
            return 'seller';
          }
        }
      }
    },
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 1000,
  }
}));
