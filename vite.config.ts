import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Yayın yeri GitHub Pages: site alt dizinde sunulur (1batu.github.io/dolmus/),
// bu yüzden derlemede base '/dolmus/' olur. Yerel geliştirmede kök kalır ki
// localhost:5173 doğrudan açılsın. Repo adı değişirse BASE_PATH ile ez —
// Actions akışı bu değeri repo adından geçirir
export default defineConfig(({ command }) => ({
  base: command === 'build' ? (process.env.BASE_PATH ?? '/dolmus/') : '/',
  plugins: [react(), tailwindcss()],
}))
