import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || ''),
        'process.env.OPENROUTER_API_KEY': JSON.stringify(process.env.OPENROUTER_API_KEY || ''),
        'process.env.NVIDIA_API_KEY': JSON.stringify(process.env.NVIDIA_API_KEY || process.env.VITE_NVIDIA_API_KEY || ''),
        'process.env.VITE_OPENROUTER_API_KEY_1': JSON.stringify(process.env.VITE_OPENROUTER_API_KEY_1 || ''),
        'process.env.VITE_OPENROUTER_API_KEY_2': JSON.stringify(process.env.VITE_OPENROUTER_API_KEY_2 || ''),
        'process.env.VITE_OPENROUTER_API_KEY_3': JSON.stringify(process.env.VITE_OPENROUTER_API_KEY_3 || ''),
        'process.env.VITE_OPENROUTER_API_KEY_4': JSON.stringify(process.env.VITE_OPENROUTER_API_KEY_4 || ''),
        'process.env.OPENROUTER_API_KEY_1': JSON.stringify(process.env.OPENROUTER_API_KEY_1 || ''),
        'process.env.OPENROUTER_API_KEY_2': JSON.stringify(process.env.OPENROUTER_API_KEY_2 || ''),
        'process.env.OPENROUTER_API_KEY_3': JSON.stringify(process.env.OPENROUTER_API_KEY_3 || ''),
        'process.env.OPENROUTER_API_KEY_4': JSON.stringify(process.env.OPENROUTER_API_KEY_4 || ''),
        'process.env.VITE_NVIDIA_API_KEY': JSON.stringify(process.env.VITE_NVIDIA_API_KEY || ''),
        'process.env.VITE_NVIDIA_API_KEY_2': JSON.stringify(process.env.VITE_NVIDIA_API_KEY_2 || ''),
        'process.env.VITE_NVIDIA_API_KEY_3': JSON.stringify(process.env.VITE_NVIDIA_API_KEY_3 || ''),
        'process.env.VITE_NVIDIA_API_KEY_4': JSON.stringify(process.env.VITE_NVIDIA_API_KEY_4 || ''),
        'process.env.NVIDIA_API_KEY_2': JSON.stringify(process.env.NVIDIA_API_KEY_2 || ''),
        'process.env.NVIDIA_API_KEY_3': JSON.stringify(process.env.NVIDIA_API_KEY_3 || ''),
        'process.env.NVIDIA_API_KEY_4': JSON.stringify(process.env.NVIDIA_API_KEY_4 || ''),
        'process.env.VITE_USE_MOCK_DATA': JSON.stringify(process.env.VITE_USE_MOCK_DATA || 'false'),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
