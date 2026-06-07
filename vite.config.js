import { defineConfig } from 'vite';
import htmlInject from 'vite-plugin-html-inject';

export default defineConfig({
  plugins: [
    htmlInject()
  ]
});