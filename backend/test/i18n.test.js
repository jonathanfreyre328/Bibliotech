const test = require('node:test');
const assert = require('node:assert/strict');

const i18n = require('../utils/i18n/i18n');
const businessError = require('../utils/i18n/businessError');
const { validateStudent } = require('../validators/userValidator');

const es = require('../utils/i18n/locales/es.json');
const en = require('../utils/i18n/locales/en.json');

test('carga los diccionarios es y en', () => {
    assert.deepEqual(i18n.supportedLanguages.sort(), ['en', 'es']);
});

test('es.json y en.json tienen exactamente las mismas claves', () => {
    assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
});

test('getMessage devuelve el texto del idioma pedido', () => {
    assert.equal(i18n.getMessage('CT_MATERIAL_DELETED', 'es'), 'Material eliminado.');
    assert.equal(i18n.getMessage('CT_MATERIAL_DELETED', 'en'), 'Material deleted.');
});

test('getMessage usa espanol por defecto', () => {
    assert.equal(i18n.language, 'es');
    assert.equal(i18n.getMessage('CT_MATERIAL_DELETED'), 'Material eliminado.');
});

test('getMessage cae al idioma por defecto si el idioma no existe', () => {
    assert.equal(i18n.getMessage('CT_MATERIAL_DELETED', 'fr-FR'), 'Material eliminado.');
});

test('getMessage nunca lanza: clave inexistente devuelve CT_INVALID_RESOURCE_CONSTANT', () => {
    assert.equal(
        i18n.getMessage('CT_CLAVE_QUE_NO_EXISTE', 'en'),
        en.CT_INVALID_RESOURCE_CONSTANT
    );
});

test('resolve interpreta Accept-Language', () => {
    assert.equal(i18n.resolve('en-US,en;q=0.9,es;q=0.8'), 'en');
    assert.equal(i18n.resolve('es-AR,es;q=0.9'), 'es');
    assert.equal(i18n.resolve('EN'), 'en');
});

test('resolve usa el idioma por defecto si no hay coincidencia', () => {
    assert.equal(i18n.resolve('fr-FR,fr;q=0.9'), 'es');
    assert.equal(i18n.resolve(''), 'es');
    assert.equal(i18n.resolve(undefined), 'es');
});

test('el setter de language cambia el idioma sin lanzar (bug del profe)', () => {
    try {
        assert.doesNotThrow(() => { i18n.language = 'en'; });
        assert.equal(i18n.language, 'en');
        assert.equal(i18n.getMessage('CT_MATERIAL_DELETED'), 'Material deleted.');
    } finally {
        i18n.language = 'es';
    }
    assert.equal(i18n.language, 'es');
});

test('el setter rechaza un idioma no soportado y conserva el actual', () => {
    i18n.language = 'es';
    i18n.language = 'fr';
    assert.equal(i18n.language, 'es');
});

test('format interpola %s en orden', () => {
    assert.equal(
        i18n.format('CT_REPO_DELETE_CAREER_DEPS', 'en', [2, 5]),
        'Cannot delete: the career has 2 subjects and 5 students associated'
    );
    assert.equal(
        i18n.format('CT_AUTH_FIELD_TAKEN', 'es', ['email']),
        'El email ya está registrado.'
    );
});

test('translateError traduce errores de negocio', () => {
    const error = businessError('La materia tiene 3 clases', 'CT_REPO_DELETE_SUBJECT_DEPS', [3]);
    assert.equal(i18n.translateError(error, 'es'), 'No se puede eliminar: la materia tiene 3 clases creadas');
    assert.equal(i18n.translateError(error, 'en'), 'Cannot delete: the subject has 3 classes created');
});

test('translateError devuelve el mensaje original si el error no tiene clave', () => {
    assert.equal(i18n.translateError(new Error('Error tecnico'), 'en'), 'Error tecnico');
});

test('validateStudent respeta el idioma recibido', () => {
    const english = validateStudent({ email: 'correo-invalido' }, 'en');
    assert.equal(english.valid, false);
    assert.ok(english.errors.some((error) => error.message === 'This field is required.'));
    assert.ok(english.errors.some((error) => error.message === 'The email address is not valid.'));

    const spanish = validateStudent({});
    assert.ok(spanish.errors.some((error) => error.message === 'Este campo es obligatorio.'));
});
