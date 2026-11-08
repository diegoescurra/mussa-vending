import pool from '../config/db.js';
import { hashPassword, validatePassword } from './password.js';

// Herramienta local de administración; nunca se expone por HTTP.
try {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error('Configura ADMIN_EMAIL con un correo válido.');
  }
  validatePassword(password);
  const hash = await hashPassword(password);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      'SELECT id_usuario, rol FROM usuarios WHERE lower(btrim(email)) = $1 FOR UPDATE',
      [email],
    );
    if (existing.rows[0]) {
      if (existing.rows[0].rol !== 'ADMIN')
        throw new Error('Ese correo pertenece a un usuario sin rol ADMIN. Usa un correo de administrador.');
      await client.query(
        'UPDATE usuarios SET password_hash = $1, estado = true, auth_version = auth_version + 1 WHERE id_usuario = $2',
        [hash, existing.rows[0].id_usuario],
      );
    } else {
      await client.query(
        "INSERT INTO usuarios (nombre, apellido, email, password_hash, rol) VALUES ($1, $2, $3, $4, 'ADMIN')",
        [
          process.env.ADMIN_NOMBRE?.trim() || 'Administrador',
          process.env.ADMIN_APELLIDO?.trim() || 'Mussa',
          email,
          hash,
        ],
      );
    }
    await client.query('COMMIT');
    console.log('Administrador habilitado. Ya puedes iniciar sesión con las credenciales indicadas.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} catch (error) {
  // No imprimir parámetros SQL ni credenciales en errores inesperados.
  console.error(
    error instanceof Error && !('code' in error)
      ? error.message
      : 'No se pudo habilitar el administrador. Revisa la conexión y aplica la migración 011.',
  );
  process.exitCode = 1;
} finally {
  delete process.env.ADMIN_PASSWORD;
  await pool.end();
}
