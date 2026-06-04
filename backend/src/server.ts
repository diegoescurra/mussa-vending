import { connectDB } from './config/db.js';
import app from './index.js';
import { loadEnvFile } from 'node:process';
loadEnvFile();

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
  });
});