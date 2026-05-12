-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.accesos (
  id integer NOT NULL DEFAULT nextval('accesos_id_seq'::regclass),
  usuario_id integer,
  tipo character varying CHECK (tipo::text = ANY (ARRAY['entrada'::character varying, 'salida'::character varying]::text[])),
  fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT accesos_pkey PRIMARY KEY (id),
  CONSTRAINT accesos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);

CREATE TABLE public.carnet (
  id integer NOT NULL DEFAULT nextval('carnet_id_seq'::regclass),
  usuario_id integer,
  codigo_nfc character varying NOT NULL UNIQUE,
  codigo_qr character varying NOT NULL UNIQUE,
  emitido_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT carnet_pkey PRIMARY KEY (id),
  CONSTRAINT carnet_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id)
);

CREATE TABLE public.usuarios (
  id integer NOT NULL DEFAULT nextval('usuarios_id_seq'::regclass),
  cedula character varying NOT NULL UNIQUE,
  nombre character varying NOT NULL,
  correo character varying NOT NULL UNIQUE,
  password character varying NOT NULL,
  rol character varying DEFAULT 'usuario'::character varying CHECK (rol::text = ANY (ARRAY['admin'::character varying, 'usuario'::character varying]::text[])),
  foto_url text,
  creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT usuarios_pkey PRIMARY KEY (id)
);
