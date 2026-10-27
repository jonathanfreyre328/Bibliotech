const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
const db = require('../config/db');
const { BOOT_ID } = require('../config/sessionContext');
const { verifyToken, requireRoles } = require('../middleware/authMiddleware');

function responseDouble() {
    return {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

test('verifyToken stores the current active user id and role', async () => {
    const token = jwt.sign({ id: 7, role: 'student', bootId: BOOT_ID }, 'test-secret');
    const req = { headers: { authorization: 'Bearer ' + token } };
    const res = responseDouble();
    const execute = db.execute;
    let called = false;

    db.execute = async () => [[{ id: 7, active: 1, role: 'student' }]];
    try {
        await verifyToken(req, res, () => { called = true; });
    } finally {
        db.execute = execute;
    }

    assert.equal(called, true);
    assert.equal(req.userId, 7);
    assert.equal(req.userRole, 'student');
});

test('verifyToken rejects a missing bearer token', async () => {
    const req = { headers: {} };
    const res = responseDouble();

    await verifyToken(req, res, () => {});

    assert.equal(res.statusCode, 401);
});

test('verifyToken rejects a token issued before the last server restart', async () => {
    const token = jwt.sign({ id: 7, role: 'student', bootId: 'boot-anterior' }, 'test-secret');
    const req = { headers: { authorization: 'Bearer ' + token } };
    const res = responseDouble();
    const execute = db.execute;
    let lookupCalled = false;

    db.execute = async () => {
        lookupCalled = true;
        return [[{ id: 7, active: 1, role: 'student' }]];
    };
    try {
        await verifyToken(req, res, () => {});
    } finally {
        db.execute = execute;
    }

    assert.equal(res.statusCode, 401);
    assert.equal(lookupCalled, false);
});

test('verifyToken rejects a user that is no longer active', async () => {
    const token = jwt.sign({ id: 7, role: 'student', bootId: BOOT_ID }, 'test-secret');
    const req = { headers: { authorization: 'Bearer ' + token } };
    const res = responseDouble();
    const execute = db.execute;

    db.execute = async () => [[]];
    try {
        await verifyToken(req, res, () => {});
    } finally {
        db.execute = execute;
    }

    assert.equal(res.statusCode, 401);
});

test('requireRoles rejects a role outside the allowlist', () => {
    const req = { userRole: 'student' };
    const res = responseDouble();
    let called = false;

    requireRoles('professor')(req, res, () => { called = true; });

    assert.equal(called, false);
    assert.equal(res.statusCode, 403);
});

test('requireRoles allows an authorized role', () => {
    const req = { userRole: 'professor' };
    const res = responseDouble();
    let called = false;

    requireRoles('professor', 'admin')(req, res, () => { called = true; });

    assert.equal(called, true);
    assert.equal(res.statusCode, null);
});
