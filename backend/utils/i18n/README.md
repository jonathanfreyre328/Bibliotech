# Modulo i18n (`utils/i18n`)

El modulo **i18n** (*Internationalization*: 'i' + 18 letras + 'n') centraliza los
mensajes del backend en diccionarios JSON y los resuelve segun el idioma de cada
peticion.

---

## Patron Singleton

`i18n.js` exporta una unica instancia compartida por toda la aplicacion
(`Object.freeze`). Los diccionarios se cargan **una sola vez** al arrancar: durante
las peticiones la resolucion es una busqueda en memoria (sin I/O de disco).

El estado mutable vive en `this._state = { language }`. Congelar la instancia no
impide cambiar `_state.language`, que es lo que usa el setter `language` para
modificar el idioma por defecto.

---

## Estructura

```text
utils/i18n/
├── locales/
│   ├── es.json
│   └── en.json
├── i18n.js
├── businessError.js
└── README.md
```

---

## Convencion de claves: `CT_` (Constant Text)

Todas las claves llevan el prefijo `CT_` y se escriben en `UPPER_SNAKE_CASE`.
Los prefijos por area permiten ubicarlas rapido:

| Prefijo | Uso |
|---|---|
| `CT_VALIDATION_*` | reglas de validacion |
| `CT_AUTH_*` | autenticacion, tokens y permisos |
| `CT_ACADEMIC_*` | catalogo y solicitudes |
| `CT_ADMIN_*` | panel de administracion |
| `CT_MATERIAL_*` | PDFs |
| `CT_ERROR_*` | traduccion de errores tecnicos |
| `CT_REPO_*` | errores de negocio de los repositorios |

Los `es.json` y `en.json` deben tener **exactamente las mismas claves**; hay un test
(`backend/test/i18n.test.js`) que lo verifica.

---

## Uso

```js
const i18n = require('../utils/i18n/i18n');

// Idioma explicito (el que resuelve languageMiddleware en req.language)
i18n.getMessage('CT_MATERIAL_DELETED', 'en');

// Interpolacion: %s se reemplaza en orden
i18n.format('CT_AUTH_FIELD_TAKEN', 'en', ['email']);
// -> "The email is already registered."

// Errores de negocio creados con businessError(...)
i18n.translateError(error, req.language);
```

`getMessage` **nunca lanza**: si la clave no existe en ningun diccionario devuelve
`CT_INVALID_RESOURCE_CONSTANT`. Es deliberado: este modulo tambien lo usa el
`globalErrorMiddleware`, que no puede fallar mientras responde un error.

---

## Negociacion de idioma (`languageMiddleware`)

Precedencia:

1. `?lang=en` (override explicito para pruebas o `curl`).
2. Encabezado `X-Language: en`.
3. Encabezado `Accept-Language` (automatico desde el navegador).
4. `DEFAULT_LANGUAGE` del `.env` (por defecto `es`).

La respuesta incluye `Content-Language` y `Vary: Accept-Language`.

```bash
curl -H "Accept-Language: en-US,en;q=0.9" http://localhost:3000/api/...
```

---

## Agregar un mensaje

1. Agregar la clave a `locales/es.json` **y** `locales/en.json`.
2. Usarla desde el controller/middleware con `i18n.getMessage('CT_...', req.language)`.
3. Si es un error de negocio de un repositorio:
   `throw businessError(mensajeBase, 'CT_...', [params])`.
4. Correr `npm test` (valida paridad de claves).
