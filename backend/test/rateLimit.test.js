const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const i18n = require('../utils/i18n/i18n');
const { createRateLimiter } = require('../middleware/rateLimitMiddleware');

/**
 * Doble de respuesta HTTP: registra status, headers y body, y emite `finish`
 * igual que Express cuando la respuesta termina.
 */
function createResponse() {
    const res = new EventEmitter();
    res.statusCode = 200;
    res.headers = {};
    res.body = null;
    res.set = (name, value) => { res.headers[name] = value; return res; };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.body = body; res.emit('finish'); return res; };
    return res;
}

function createRequest({ ip = '10.0.0.1', username = 'alumno', language = 'es' } = {}) {
    return { ip, body: { username }, language };
}

function passThrough(limiter, req, res = createResponse()) {
    let nextCalled = false;
    limiter(req, res, () => { nextCalled = true; });
    return { res, nextCalled };
}

function failAttempt(limiter, req, statusCode = 401) {
    const result = passThrough(limiter, req);
    if (result.nextCalled) {
        result.res.statusCode = statusCode;
        result.res.emit('finish');
    }
    return result;
}

function succeedAttempt(limiter, req) {
    const result = passThrough(limiter, req);
    if (result.nextCalled) {
        result.res.statusCode = 200;
        result.res.emit('finish');
    }
    return result;
}

test('blocks the next failed login after reaching the limit', () => {
    const limiter = createRateLimiter({
        windowMs: 60_000,
        max: 2,
        countFailuresOnly: true,
        keyGenerator: (req) => req.ip,
        now: () => 1_000
    });
    const req = createRequest();

    assert.equal(failAttempt(limiter, req).nextCalled, true);
    assert.equal(failAttempt(limiter, req).nextCalled, true);

    const blocked = passThrough(limiter, req);
    assert.equal(blocked.nextCalled, false);
    assert.equal(blocked.res.statusCode, 429);
    assert.equal(blocked.res.headers['Retry-After'], '60');
    assert.equal(blocked.res.body.message, i18n.getMessage('CT_AUTH_TOO_MANY_ATTEMPTS', 'es'));
});

test('a successful login resets the failure counter', () => {
    const limiter = createRateLimiter({
        windowMs: 60_000,
        max: 2,
        countFailuresOnly: true,
        keyGenerator: (req) => req.ip,
        now: () => 1_000
    });
    const req = createRequest();

    failAttempt(limiter, req);
    succeedAttempt(limiter, req);
    assert.equal(failAttempt(limiter, req).nextCalled, true);
    assert.equal(failAttempt(limiter, req).nextCalled, true);
    assert.equal(passThrough(limiter, req).nextCalled, false);
});

test('allows requests again after the window expires', () => {
    let currentTime = 1_000;
    const limiter = createRateLimiter({
        windowMs: 60_000,
        max: 2,
        countFailuresOnly: true,
        keyGenerator: (req) => req.ip,
        now: () => currentTime
    });
    const req = createRequest();

    failAttempt(limiter, req);
    failAttempt(limiter, req);
    assert.equal(passThrough(limiter, req).nextCalled, false);

    currentTime += 60_001;
    assert.equal(passThrough(limiter, req).nextCalled, true);
});

test('counts every request when countFailuresOnly is false', () => {
    const limiter = createRateLimiter({
        windowMs: 60_000,
        max: 2,
        keyGenerator: (req) => req.ip,
        now: () => 1_000
    });
    const req = createRequest();

    assert.equal(passThrough(limiter, req).nextCalled, true);
    assert.equal(passThrough(limiter, req).nextCalled, true);
    assert.equal(passThrough(limiter, req).nextCalled, false);
});

test('responds 429 in the request language', () => {
    const limiter = createRateLimiter({
        windowMs: 60_000,
        max: 1,
        countFailuresOnly: true,
        keyGenerator: (req) => req.ip,
        now: () => 1_000
    });
    const req = createRequest({ language: 'en' });

    failAttempt(limiter, req);
    const blocked = passThrough(limiter, req);

    assert.equal(blocked.res.body.message, i18n.getMessage('CT_AUTH_TOO_MANY_ATTEMPTS', 'en'));
});

test('keeps independent counters per key', () => {
    const limiter = createRateLimiter({
        windowMs: 60_000,
        max: 1,
        countFailuresOnly: true,
        keyGenerator: (req) => req.ip,
        now: () => 1_000
    });

    failAttempt(limiter, createRequest({ ip: '10.0.0.1' }));
    assert.equal(passThrough(limiter, createRequest({ ip: '10.0.0.1' })).nextCalled, false);
    assert.equal(passThrough(limiter, createRequest({ ip: '10.0.0.2' })).nextCalled, true);
});

test('rejects invalid configuration values', () => {
    assert.throws(() => createRateLimiter({ windowMs: 0, max: 1 }), TypeError);
    assert.throws(() => createRateLimiter({ windowMs: 1_000, max: 0 }), TypeError);
    assert.throws(() => createRateLimiter({ windowMs: 1_000, max: 1.5 }), TypeError);
});
