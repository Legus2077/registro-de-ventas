const crypto = require('crypto');

// Parámetros de scrypt. Se guardan dentro del hash para poder cambiarlos
// en el futuro sin invalidar las contraseñas existentes.
const PARAMETROS = { N: 16384, r: 8, p: 1, longitud: 64 };
const PREFIJO = 'scrypt';

/**
 * Genera un hash con sal aleatoria.
 * Formato: scrypt$N$r$p$salHex$hashHex
 */
function hashPassword(password) {
    const sal = crypto.randomBytes(16).toString('hex');
    const derivada = crypto.scryptSync(String(password), sal, PARAMETROS.longitud, {
        N: PARAMETROS.N,
        r: PARAMETROS.r,
        p: PARAMETROS.p,
    });

    return [PREFIJO, PARAMETROS.N, PARAMETROS.r, PARAMETROS.p, sal, derivada.toString('hex')].join('$');
}

function esHash(almacenada) {
    return typeof almacenada === 'string' && almacenada.startsWith(`${PREFIJO}$`);
}

/**
 * Verifica una contraseña contra el valor guardado.
 * Acepta contraseñas antiguas en texto plano e indica que hay que migrarlas.
 * @returns {{ ok: boolean, necesitaMigracion: boolean }}
 */
function verificarPassword(password, almacenada) {
    if (!almacenada) return { ok: false, necesitaMigracion: false };

    // Compatibilidad con contraseñas viejas guardadas en texto plano
    if (!esHash(almacenada)) {
        const ok = almacenada === String(password);
        return { ok, necesitaMigracion: ok };
    }

    const partes = almacenada.split('$');
    if (partes.length !== 6) return { ok: false, necesitaMigracion: false };

    const [, nTexto, rTexto, pTexto, sal, hashHex] = partes;
    const N = Number(nTexto);
    const r = Number(rTexto);
    const p = Number(pTexto);

    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
        return { ok: false, necesitaMigracion: false };
    }

    try {
        const esperado = Buffer.from(hashHex, 'hex');
        const derivada = crypto.scryptSync(String(password), sal, esperado.length, { N, r, p });

        const ok = esperado.length === derivada.length && crypto.timingSafeEqual(esperado, derivada);
        return { ok, necesitaMigracion: false };
    } catch (error) {
        return { ok: false, necesitaMigracion: false };
    }
}

module.exports = { hashPassword, verificarPassword, esHash };
