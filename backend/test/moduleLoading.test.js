const test = require('node:test');
const assert = require('node:assert/strict');

test('all API routes load without import errors', () => {
    assert.doesNotThrow(() => {
        require('../routes/authRoutes');
        require('../routes/adminRoutes');
        require('../routes/academicRoutes');
        require('../routes/materialRoutes');
    });
});

test('PDF upload middleware loads as an Express middleware', () => {
    const upload = require('../config/multerConfig');
    assert.equal(typeof upload, 'function');
});

test('the material controller exposes protected operations', () => {
    const controller = require('../controllers/materialController');
    assert.equal(typeof controller.upload, 'function');
    assert.equal(typeof controller.download, 'function');
    assert.equal(typeof controller.remove, 'function');
});
