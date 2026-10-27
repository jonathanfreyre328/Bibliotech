const test = require('node:test');
const assert = require('node:assert/strict');

const i18n = require('../utils/i18n/i18n');
const businessError = require('../utils/i18n/businessError');
const globalErrorMiddleware = require('../middleware/globalErrorMiddleware');

function createRequest(language = 'es') {
    return { method: 'POST', originalUrl: '/api/test', language };
}

function createResponse() {
    return {
        headersSent: false,
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
}

/**
 * Ejecuta el middleware con un `console.error` silenciado para no ensuciar la
 * salida de los tests con el stack de los errores esperados.
 */
function run(error, { language = 'es', headersSent = false } = {}) {
    const req = createRequest(language);
    const res = createResponse();
    res.headersSent = headersSent;
    let delegatedError = null;

    const originalConsoleError = console.error;
    console.error = () => {};
    try {
        globalErrorMiddleware(error, req, res, (delegated) => { delegatedError = delegated; });
    } finally {
        console.error = originalConsoleError;
    }

    return { res, delegatedError };
}

test('translates ER_DATA_TOO_LONG to 400', () => {
    const error = Object.assign(new Error('Data too long for column'), { code: 'ER_DATA_TOO_LONG' });
    const { res } = run(error);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, i18n.getMessage('CT_ERROR_DATA_TOO_LONG', 'es'));
});

test('translates ER_TRUNCATED_WRONG_VALUE to 400', () => {
    const error = Object.assign(new Error('Incorrect value'), { code: 'ER_TRUNCATED_WRONG_VALUE' });
    const { res } = run(error);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, i18n.getMessage('CT_ERROR_INVALID_VALUE', 'es'));
});

test('translates a Multer file size error to 400', () => {
    const error = Object.assign(new Error('File too large'), {
        name: 'MulterError',
        code: 'LIMIT_FILE_SIZE'
    });
    const { res } = run(error);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, i18n.getMessage('CT_ERROR_FILE_TOO_LARGE', 'es'));
});

test('uses the language of the request', () => {
    const error = Object.assign(new Error('Data too long for column'), { code: 'ER_DATA_TOO_LONG' });
    const { res } = run(error, { language: 'en' });

    assert.equal(res.body.message, i18n.getMessage('CT_ERROR_DATA_TOO_LONG', 'en'));
});

test('keeps the status and details of a business error', () => {
    const error = businessError('Carrera no encontrada o inactiva', 'CT_AUTH_CAREER_INVALID');
    error.statusCode = 400;
    error.errors = [{ field: 'careerId', message: 'La carrera no existe.' }];
    const { res } = run(error);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, i18n.getMessage('CT_AUTH_CAREER_INVALID', 'es'));
    assert.deepEqual(res.body.errors, error.errors);
});

test('never exposes internal details in production', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    try {
        process.env.NODE_ENV = 'production';
        const { res } = run(new Error('detalle interno'));
        assert.equal(res.statusCode, 500);
        assert.equal(res.body.message, i18n.getMessage('CT_ERROR_INTERNAL', 'es'));
        assert.equal(res.body.error, undefined);
        assert.equal(res.body.details, undefined);
    } finally {
        process.env.NODE_ENV = originalNodeEnv;
    }
});

test('exposes internal details in development', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    try {
        process.env.NODE_ENV = 'development';
        const { res } = run(new Error('detalle interno'));
        assert.equal(res.statusCode, 500);
        assert.equal(res.body.details, 'detalle interno');
        assert.ok(res.body.error);
    } finally {
        process.env.NODE_ENV = originalNodeEnv;
    }
});

test('delegates to Express when the response already started', () => {
    const sentinel = new Error('respuesta ya enviada');
    const { res, delegatedError } = run(sentinel, { headersSent: true });

    assert.equal(delegatedError, sentinel);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, null);
});
