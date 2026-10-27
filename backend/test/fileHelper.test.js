const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fileHelper = require('../utils/fileHelper');

test('resolves an upload path against the backend uploads folder', () => {
    const resolved = fileHelper.resolveUploadPath('/uploads/guia.pdf');
    assert.equal(resolved, path.join(fileHelper.UPLOAD_ROOT, 'guia.pdf'));
});

test('accepts the upload path with or without a leading slash', () => {
    const conSlash = fileHelper.resolveUploadPath('/uploads/guia.pdf');
    const sinSlash = fileHelper.resolveUploadPath('uploads/guia.pdf');
    assert.equal(conSlash, sinSlash);
});

test('rejects paths that try to escape the uploads folder', () => {
    assert.equal(fileHelper.resolveUploadPath('/uploads/../../etc/passwd'), null);
    assert.equal(fileHelper.resolveUploadPath('/uploads/../../../Windows/System32'), null);
});

test('rejects paths that do not point to the uploads folder', () => {
    assert.equal(fileHelper.resolveUploadPath('/etc/passwd'), null);
    assert.equal(fileHelper.resolveUploadPath('materiales/guia.pdf'), null);
});

test('rejects empty or invalid paths', () => {
    assert.equal(fileHelper.resolveUploadPath(''), null);
    assert.equal(fileHelper.resolveUploadPath(null), null);
    assert.equal(fileHelper.resolveUploadPath(undefined), null);
    assert.equal(fileHelper.resolveUploadPath(123), null);
});

test('deleteUpload reports false when the file does not exist', () => {
    assert.equal(fileHelper.deleteUpload('/uploads/__archivo_inexistente__.pdf'), false);
});

test('deleteUploadedFile ignores missing file objects', () => {
    assert.equal(fileHelper.deleteUploadedFile(null), false);
    assert.equal(fileHelper.deleteUploadedFile({}), false);
});
