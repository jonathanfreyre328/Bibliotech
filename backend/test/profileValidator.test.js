const test = require('node:test');
const assert = require('node:assert/strict');
const { validateProfile, validatePasswordChange } = require('../validators/profileValidator');

const validProfile = {
    firstName: 'Ana',
    lastName: 'Gomez',
    email: 'ana@example.com',
    phone: '2235555555'
};

test('accepts valid profile data', () => {
    const result = validateProfile(validProfile);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
});

test('requires all editable profile fields', () => {
    const result = validateProfile({});
    assert.equal(result.valid, false);
    for (const field of ['firstName', 'lastName', 'email', 'phone']) {
        assert.ok(result.errors.some((error) => error.field === field));
    }
});

test('rejects an invalid profile email', () => {
    const result = validateProfile({ ...validProfile, email: 'invalid-email' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.field === 'email'));
});

test('rejects profile fields longer than the database columns', () => {
    const result = validateProfile({ ...validProfile, firstName: 'a'.repeat(81), phone: '1'.repeat(41) });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.field === 'firstName'));
    assert.ok(result.errors.some((error) => error.field === 'phone'));
});

test('accepts a valid password change', () => {
    const result = validatePasswordChange({
        currentPassword: 'Clave1234',
        newPassword: 'Nueva1234',
        confirmPassword: 'Nueva1234'
    });
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
});

test('rejects a password change with mismatched confirmation', () => {
    const result = validatePasswordChange({
        currentPassword: 'Clave1234',
        newPassword: 'Nueva1234',
        confirmPassword: 'Otra1234'
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.field === 'confirmPassword'));
});

test('rejects a weak new password', () => {
    const result = validatePasswordChange({
        currentPassword: 'Clave1234',
        newPassword: 'password',
        confirmPassword: 'password'
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.field === 'newPassword'));
});

test('requires the current password', () => {
    const result = validatePasswordChange({
        currentPassword: '',
        newPassword: 'Nueva1234',
        confirmPassword: 'Nueva1234'
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.field === 'currentPassword'));
});
