-- EntryTech: Script de inicialización de Base de Datos (PostgreSQL)

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    cedula VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(50) DEFAULT 'usuario' CHECK (rol IN ('admin', 'usuario'))
);

CREATE TABLE IF NOT EXISTS carnet (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    codigo_nfc VARCHAR(255) UNIQUE NOT NULL,
    codigo_qr VARCHAR(255) UNIQUE NOT NULL
);

-- Para los accesos:
CREATE TABLE IF NOT EXISTS accesos (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('entrada', 'salida')),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ejemplos de insert si quieres jugar con ellos inicialmente:
-- Se crearán desde la API, pero este sería el formato.
-- INSERT INTO usuarios (nombre, correo, password, rol) VALUES ('Admin', 'admin@entrytech.com', 'bcrypt_hash_aqui', 'admin');
