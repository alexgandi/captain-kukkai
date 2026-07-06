import { defineConfig } from 'vite';

// base: './' -> percorsi RELATIVI negli asset compilati. Serve perché su
// GitHub Pages il gioco è servito da una sottocartella (es. /captain-kukkai/),
// non dalla radice del dominio. Con i percorsi relativi funziona ovunque.
export default defineConfig({
  base: './',
});
