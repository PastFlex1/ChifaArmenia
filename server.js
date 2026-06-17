import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Servir archivos estáticos desde la carpeta 'dist'
app.use(express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Para cualquier otra ruta, redirigir a index.html (soporte para Single Page Application / React Router si lo hay)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'), {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
