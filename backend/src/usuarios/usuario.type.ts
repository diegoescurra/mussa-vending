export type RolUsuario = 'ADMIN' | 'REPONEDOR';

export type Usuario = {
    id_usuario: number;
    nombre: string;
    apellido: string;
    email: string;
    password_hash: string;
    rol: RolUsuario;
    estado: boolean;
    fecha_creacion: Date;
}

export type UsuarioResponse = Omit<Usuario, 'password_hash'>;
