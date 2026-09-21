/**
 * Redimensionado y compresión de imágenes en el navegador.
 *
 * Las fotografías de perfil se almacenan en Base64 dentro de PostgreSQL, y la
 * sección 8.2 del documento del proyecto señala el crecimiento de la base de
 * datos como una limitación conocida. Hasta ahora el archivo se enviaba tal
 * cual: una foto de 2 MB tomada con el móvil ocupaba unos 2,7 MB ya codificada,
 * y se guardaba entera.
 *
 * Reducirla a 400 píxeles de lado antes de subirla la deja en torno a 40-60 kB,
 * que es más que suficiente para un avatar de carnet. La reducción se hace en
 * el dispositivo del usuario, así que también ahorra tiempo de subida.
 */

const LADO_MAX = 400;
const CALIDAD = 0.85;

/**
 * Decodifica el archivo respetando la orientación EXIF.
 *
 * Importa: las fotos tomadas con el teléfono en vertical llevan la rotación en
 * los metadatos, no en los píxeles. Al dibujarlas en un lienzo sin tener eso en
 * cuenta aparecen giradas 90 grados, que es el defecto clásico de las fotos de
 * perfil. createImageBitmap con imageOrientation lo resuelve; si el navegador no
 * lo admite, se recurre a la decodificación normal.
 */
const decodificar = async (file) => {
    if (typeof createImageBitmap === 'function') {
        try {
            return await createImageBitmap(file, { imageOrientation: 'from-image' });
        } catch {
            // Algunos navegadores no aceptan la opción: se intenta sin ella.
            try {
                return await createImageBitmap(file);
            } catch {
                /* se continúa con el método alternativo */
            }
        }
    }

    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('No se pudo leer la imagen.'));
        };
        img.src = url;
    });
};

/**
 * Devuelve la imagen como data URI JPEG, recortada a un cuadrado centrado y
 * reducida a LADO_MAX píxeles.
 *
 * El recorte cuadrado evita que un retrato muy alargado quede deformado dentro
 * del avatar circular del carnet.
 *
 * @returns {Promise<{dataUrl: string, bytesOriginal: number, bytesFinal: number}>}
 */
export const prepararFoto = async (file) => {
    const fuente = await decodificar(file);

    const anchoFuente = fuente.width;
    const altoFuente = fuente.height;
    const lado = Math.min(anchoFuente, altoFuente);
    const recorteX = (anchoFuente - lado) / 2;
    const recorteY = (altoFuente - lado) / 2;

    // No se amplía una imagen pequeña: solo se reduce.
    const destino = Math.min(LADO_MAX, lado);

    const lienzo = document.createElement('canvas');
    lienzo.width = destino;
    lienzo.height = destino;

    const ctx = lienzo.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // Fondo blanco: el JPEG no admite transparencia, y sin esto las zonas
    // transparentes de un PNG saldrían negras.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, destino, destino);
    ctx.drawImage(fuente, recorteX, recorteY, lado, lado, 0, 0, destino, destino);

    if (typeof fuente.close === 'function') fuente.close();

    const dataUrl = lienzo.toDataURL('image/jpeg', CALIDAD);

    return {
        dataUrl,
        bytesOriginal: file.size,
        // Longitud aproximada en bytes del contenido Base64.
        bytesFinal: Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75),
    };
};

export const formatearPeso = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
