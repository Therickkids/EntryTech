import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

/*
  La documentación del proyecto indicaba "Configuración de Vite + SSL" y el
  manual pedía abrir https://localhost:5173, pero el plugin de SSL nunca se
  había activado: la dependencia estaba instalada y sin usar. Sin HTTPS,
  navigator.mediaDevices no existe fuera de localhost, así que el escáner del
  kiosco no podía probarse desde un móvil en la red local.
*/
export default defineConfig({
    plugins: [react(), basicSsl()],
    server: {
        host: true,
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                secure: false,
            },
        },
    },
    build: {
        // Divide las librerías grandes para que el paquete inicial no incluya
        // el lector de QR, que solo hace falta en la pantalla del kiosco.
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ['react', 'react-dom', 'react-router-dom'],
                    qr: ['html5-qrcode', 'qrcode.react'],
                },
            },
        },
    },
});
