import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {privateArrangements} from './private-arrangements'
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [privateArrangements(), react(), visualizer()],
})
