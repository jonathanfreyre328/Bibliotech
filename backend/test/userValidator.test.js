const test = require('node:test');
const assert = require('node:assert/strict');
const { validateStudent } = require('../validators/userValidator');

const validStudent = {
    username: 'alumno01',
    password: 'Clave1234',
    confirmPassword: 'Clave1234',
    firstName: 'Ana',
    lastName: 'Gomez',
    dni: '30111222',
    email: 'ana@example.com',
    phone: '2235555555',
    birthDate: '2000-05-10',
    careerId: 1
};

test('accepts a complete student registration', () => {
    const result = validateStudent(validStudent);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
});

test('reports every required field missing from registration', () => {
    const result = validateStudent({});
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.field === 'email'));
    assert.ok(result.errors.some((error) => error.field === 'password'));
});

test('rejects an invalid email', () => {
    const result = validateStudent({ ...validStudent, email: 'invalid-email' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.field === 'email'));
});

test('rejects a weak password', () => {
    const result = validateStudent({ ...validStudent, password: 'password', confirmPassword: 'password' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.field === 'password'));
});

test('rejects a registration when the passwords do not match', () => {
    const result = validateStudent({ ...validStudent, confirmPassword: 'OtraClave1234' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.field === 'confirmPassword'));
});

test('requires the password confirmation', () => {
    const result = validateStudent({ ...validStudent, confirmPassword: '' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.field === 'confirmPassword'));
});

test('accepts a password of exactly 72 bytes', () => {
    const password = 'a1'.repeat(36);
    const result = validateStudent({ ...validStudent, password, confirmPassword: password });
    assert.equal(result.valid, true);
});

test('rejects a password longer than 72 bytes', () => {
    const password = 'a1'.repeat(37);
    const result = validateStudent({ ...validStudent, password, confirmPassword: password });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.field === 'password'));
});

test('rejects a birth date that does not exist', () => {
    const result = validateStudent({ ...validStudent, birthDate: '2000-02-30' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.field === 'birthDate'));
});

test('rejects a birth date in the future', () => {
    const result = validateStudent({ ...validStudent, birthDate: '2999-01-01' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.field === 'birthDate'));
});

test('rejects a birth date with an invalid format', () => {
    const result = validateStudent({ ...validStudent, birthDate: '10/05/2000' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.field === 'birthDate'));
});

test('rejects a username longer than the column', () => {
    const result = validateStudent({ ...validStudent, username: 'a'.repeat(51) });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.field === 'username'));
});

test('rejects a first name longer than the column', () => {
    const result = validateStudent({ ...validStudent, firstName: 'a'.repeat(81) });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) => error.field === 'firstName'));
});

test('rejects a career id that is not a positive integer', () => {
    const zero = validateStudent({ ...validStudent, careerId: 0 });
    assert.equal(zero.valid, false);
    assert.ok(zero.errors.some((error) => error.field === 'careerId'));

    const boolean = validateStudent({ ...validStudent, careerId: true });
    assert.equal(boolean.valid, false);
    assert.ok(boolean.errors.some((error) => error.field === 'careerId'));
});

test('accepts a numeric career id sent as a string', () => {
    const result = validateStudent({ ...validStudent, careerId: '1' });
    assert.equal(result.valid, true);
});
