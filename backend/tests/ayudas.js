/**
 * Dobles de prueba para peticiones y respuestas de Express.
 *
 * Se escriben a mano en lugar de usar supertest o sinon: el proyecto no
 * incorpora dependencias nuevas, y para probar middlewares basta con objetos
 * que registren lo que el código les hizo.
 */

/** Respuesta falsa que guarda el estado, el cuerpo y las cabeceras. */
export const crearRes = () => {
    const res = {
        statusCode: null,
        cuerpo: null,
        cabeceras: {},
        terminada: false,
    };
    res.status = (codigo) => {
        res.statusCode = codigo;
        return res;
    };
    res.json = (cuerpo) => {
        res.cuerpo = cuerpo;
        res.terminada = true;
        return res;
    };
    res.set = (clave, valor) => {
        res.cabeceras[clave] = valor;
        return res;
    };
    res.setHeader = res.set;
    return res;
};

/** Petición falsa. Por defecto, sin cabeceras y con una IP cualquiera. */
export const crearReq = (opciones = {}) => ({
    headers: {},
    ip: '198.51.100.7',
    socket: { remoteAddress: '198.51.100.7' },
    ...opciones,
});

/**
 * Ejecuta un middleware y devuelve qué ocurrió: si llamó a next() o si
 * respondió, y con qué estado y cuerpo.
 */
export const ejecutar = async (middleware, req) => {
    const res = crearRes();
    let siguio = false;
    await middleware(req, res, () => {
        siguio = true;
    });
    return { siguio, estado: res.statusCode, cuerpo: res.cuerpo, cabeceras: res.cabeceras, req };
};

export const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
