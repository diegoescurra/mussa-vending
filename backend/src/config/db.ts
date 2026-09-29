import { loadEnvFile } from 'node:process';
import pg from 'pg';

try {
  loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}
const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    ...(connectionString
        ? {
            connectionString,
            // Neon requires TLS. Set DB_SSL=false only for a local URL that explicitly needs it.
            ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
        }
        : {
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT) || 5432,
        }),
});


export const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log("Base de datos conectada correctamente");
    client.release();
  } catch (error) {
    console.error("Error al conectar con la base de datos");
    console.error(error);
    process.exit(1);
  }
};

export default pool;
