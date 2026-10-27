# Bibliotech


Aplicación web **cerrada** para la gestión institucional de material educativo en PDF.

Los alumnos se registran, eligen carrera, año y materias, y solicitan acceso a clases concretas. El profesor responsable aprueba o rechaza esas solicitudes. Una vez aprobados, los alumnos pueden consultar y descargar los PDF de sus clases.

---

## Características

- **Tres roles**: administrador, profesor y alumno, cada uno con su propio panel.
- **Modelo académico**: Carrera → Año → Materia → Clase concreta (con un único profesor).
- **Solicitudes de acceso**: el alumno solicita acceso a clases; el profesor aprueba, rechaza o desasigna.
- **Materiales PDF**: carga (hasta 50 MB), edición de metadatos, asociación a múltiples clases, visor integrado y descarga autorizada.
- **Seguridad**: JWT, contraseñas con bcrypt, control de acceso por rol y por recurso, y protección contra XSS y *path traversal*.
- **Sin dependencias de frontend**: HTML estático + JavaScript vanilla + W3.CSS.

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Backend | Node.js (≥ 18), Express, MySQL2 |
| Base de datos | MariaDB / MySQL |
| Autenticación | JWT (`jsonwebtoken`), bcrypt (costo 12) |
| Carga de archivos | Multer |
| Frontend | HTML estático, JavaScript vanilla, W3.CSS |

No se usa ORM: el acceso a datos es SQL parametrizado dentro de los repositorios.

---

## Arquitectura

Aplicación **monolítica de dos capas** servida por un único proceso Node.js:

```text
Frontend (HTML + JS vanilla)
   -> routes
        -> middleware (JWT, roles)
             -> controllers
                  -> repositories
                       -> MariaDB
```

El backend sigue una separación estricta en capas:

- `routes/`: declara endpoints y aplica autenticación/roles.
- `middleware/`: verificación de JWT, roles, límite de intentos y manejo global de errores.
- `controllers/`: coordina peticiones y respuestas (status HTTP, validación de entrada).
- `repositories/`: todo el SQL parametrizado y las transacciones.
- `validators/`: reglas de validación de entrada.
- `utils/`: manejo de archivos, internacionalización (`es`/`en`) y utilidades de base de datos.

Los PDF se guardan fuera del árbol público, en `backend/uploads/`, y solo se sirven mediante endpoints autenticados.

> Detalle completo en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Requisitos previos

- Node.js 18 o superior y npm.
- MariaDB Server o MySQL compatible.
- Cliente de base de datos (CLI `mysql`, phpMyAdmin, HeidiSQL, etc.).

Comprobar versión:

```bash
node --version
npm --version
```

---

## Instalación y puesta en marcha

### 1. Base de datos

El script `backend/config/init.sql` crea la base `bibliotech`, las tablas, los roles y un administrador inicial.

> **Importante**: el script contiene `DROP DATABASE IF EXISTS bibliotech`. Al ejecutarlo se elimina la base anterior y se crea de nuevo. Usar solo al inicializar o reinicializar el entorno de desarrollo.

#### Opción recomendada (script automatizado)

Desde la carpeta `backend`:

```bash
npm run db:setup
```

Pide confirmación (la operación es destructiva). Para modo no interactivo:

```bash
npm run db:setup -- --force
```

Para diagnosticar la conexión en cualquier momento (sin modificar nada):

```bash
npm run db:check
```

#### Importación manual

```bash
mysql -u root -p < backend/config/init.sql
```

En Windows con XAMPP (PowerShell):

```powershell
Get-Content .\backend\config\init.sql | & "C:\xampp\mysql\bin\mysql.exe" -u root -p
```

Las tablas esperadas son:

```text
careers          classes          materials
material_classes roles            student_subject_requests
subjects         users            users_roles
```

### 2. Variables de entorno

Crear `backend/.env` a partir del ejemplo:

```bash
cp backend/.env.example backend/.env
```

Contenido mínimo:

```text
PORT=3000
DB_HOST=localhost
DB_USER=bibliotech
DB_PASS=bibliotech
DB_NAME=bibliotech
JWT_SECRET=una-clave-larga-privada
NODE_ENV=development
```

Opcionales:

```text
DB_ROOT_USER=root       # usa npm run db:setup
DB_ROOT_PASS=           # usa npm run db:setup
DEFAULT_LANGUAGE=es     # idioma por defecto de la API
CORS_ORIGIN=            # origen permitido (vacío = cualquier origen)
```

> Para un entorno real, cambiar `JWT_SECRET` y la contraseña de MariaDB. Nunca subir `backend/.env` al repositorio.

### 3. Dependencias

```bash
cd backend
npm install
```

### 4. Ejecutar

```bash
npm start
# o bien: node server.js
```

Abrir en el navegador: **http://localhost:3000**

Scripts disponibles (desde `backend`):

| Comando | Descripción |
|---|---|
| `npm start` | Levanta el servidor Express. |
| `npm test` | Ejecuta la suite de tests (Node Test Runner). |
| `npm run db:setup` | Inicializa la base ejecutando `init.sql` (pide confirmación). |
| `npm run db:check` | Diagnostica conexión, tablas y usuarios registrados. |

---

## Usuarios iniciales

El seed crea tres usuarios de prueba, todos con la contraseña `12345`:

```text
Usuario: admin      (administrador)
Usuario: profesor   (profesor demo)
Usuario: alumno     (alumno demo)
```

También crea datos académicos de ejemplo (una carrera, la materia "Prácticas II" y una clase asignada al profesor demo) para probar el flujo completo sin configuración previa. Cambiar estas contraseñas antes de usar el sistema fuera de desarrollo.

---

## Uso por rol

### Administrador

1. Ingresar con la cuenta inicial.
2. Usar las pestañas de la barra superior (Usuarios, Profesores, Carreras, Materias, Clases, Perfil).
3. Crear carreras, profesores, materias y clases, y asignarles un profesor.
4. Gestionar usuarios, estados y asignaciones de alumnos.
5. Asignar alumnos directamente o cambiar su carrera.

### Profesor

1. Ingresar con una cuenta creada por el administrador.
2. Revisar las solicitudes de sus clases y aprobar, rechazar o desasignar.
3. Cargar PDF (hasta 50 MB) y seleccionar las clases propias que tendrán acceso.
4. Editar metadatos y clases de sus propios materiales, o eliminarlos.
5. Visualizar sus PDF en el visor integrado.

### Alumno

1. Registrarse en `/register` (la contraseña se ingresa dos veces).
2. Elegir carrera, año y materias.
3. Solicitar acceso a clases desde la pestaña `Solicitudes`.
4. Esperar la aprobación del profesor.
5. Consultar, visualizar y descargar los PDF aprobados desde `Mis Materiales`.

---

## Rutas web

```text
/                  página de ingreso (login)
/login             inicio de sesión
/register          registro de alumnos
/admin-dashboard   panel de administrador
/professor-dashboard panel de profesor
/student-dashboard panel de alumno
```

---

## API principal

Todas las rutas devuelven JSON. Los errores tienen la forma `{ message, errors? }`.

### Autenticación — `/api/auth`

```text
POST  /api/auth/register
POST  /api/auth/login
GET   /api/auth/careers
GET   /api/auth/me
PATCH /api/auth/profile
PATCH /api/auth/password
```

`POST /login` y `POST /register` tienen límite de intentos (responden `429` con `Retry-After`).

### Académico — `/api/academic`

```text
GET    /api/academic/catalog       solo clases activas
GET    /api/academic/classes       clases propias (profesor)
GET    /api/academic/requests      solicitudes (profesor)
GET    /api/academic/my-requests   solicitudes propias (alumno)
POST   /api/academic/requests      crear solicitud (alumno)
PATCH  /api/academic/requests/:id  aprobar/rechazar/desasignar (profesor)
DELETE /api/academic/requests/:id  cancelar pendiente (alumno)
GET    /api/academic/my-classes    clases aprobadas (alumno)
```

### Materiales — `/api/materials`

```text
GET    /api/materials               lista según rol
POST   /api/materials               carga (profesor/admin, Multer)
PATCH  /api/materials/:id           metadatos y clases (propietario/admin)
DELETE /api/materials/:id           borrado definitivo (propietario/admin)
GET    /api/materials/:id/download  descarga autorizada
GET    /api/materials/:id/view      visualización inline autorizada
```

### Administración — `/api/admin` (todo requiere JWT de admin)

```text
GET   /api/admin/users
PATCH /api/admin/users/:id/active
DELETE /api/admin/users/:id
POST  /api/admin/professors
PATCH /api/admin/professors/:id
GET   /api/admin/careers
POST  /api/admin/careers
PATCH /api/admin/careers/:id
DELETE /api/admin/careers/:id
GET   /api/admin/subjects
POST  /api/admin/subjects
PATCH /api/admin/subjects/:id
PATCH /api/admin/subjects/:id/active
DELETE /api/admin/subjects/:id
GET   /api/admin/classes
POST  /api/admin/classes
PATCH /api/admin/classes/:id
PATCH /api/admin/classes/:id/active
DELETE /api/admin/classes/:id
POST  /api/admin/classes/:id/students
PATCH /api/admin/users/:id/career
```

> Especificación completa de requisitos en [docs/SRS.md](docs/SRS.md).

---

## Tests

Desde `backend`:

```bash
npm test
```

La suite usa Node Test Runner y cubre validación de registro, email y contraseña, perfil, JWT, autorización por roles, carga de rutas, configuración de Multer, controlador de materiales y helpers de archivos.

Además existe un **laboratorio de pruebas en el navegador** servido en `/`. Para habilitarlo, poner `NODE_ENV=testing` en `backend/.env` y abrir `http://localhost:3000/`. En modo `testing` solo se monta `testsRoutes` (los dashboards responden 404).

---

## Seguridad (resumen)

- **JWT** con vigencia de 8 h; incluye un `bootId` que invalida todas las sesiones al reiniciar el backend.
- **bcrypt** con costo 12; se rechazan contraseñas de más de 72 bytes.
- **Control de acceso**: `verifyToken` + `requireRoles`/`isAdmin` en cada router de datos; revalidación del estado del usuario en cada petición.
- **SQL parametrizado** en todos los repositorios (sin inyección SQL).
- **Anti-XSS** en el motor de tablas del frontend (sanitizador con lista blanca, cero `innerHTML`).
- **Path traversal** bloqueado en la resolución de rutas de archivos.
- **Límite de intentos** en login y registro.
- **Principio de menor privilegio** en la base de datos: el usuario de la aplicación no puede hacer `DROP` ni `ALTER`.

---

## Estructura del proyecto

```text
backend/
  config/            db.js, multerConfig.js, init.sql, sessionContext.js
  controllers/       auth, admin, academic, material
  middleware/        auth, globalError, language, rateLimit
  repositories/      user, admin, academic, material
  routes/            auth, admin, academic, material, view, tests
  test/              tests con Node Test Runner
  uploads/           PDF subidos (fuera del árbol público)
  validators/        reglas de validación
  utils/             fileHelper, i18n (es/en), dbutils
  .env.example
frontend/
  css/               w3.css, style.css
  html/              login, register, dashboards, tests
  img/
  js/
    components/      Table, Modal, Navigation, uiHandlers
    frontControllers/ admin, professor, student, materials, profile, auth
    services/        apiService
    utils/           authHelper, dateHelper, routeGuard
    tests/           laboratorio de pruebas del navegador
docs/
  SRS.md
  ARCHITECTURE.md
  database-uml.puml
  class-uml.puml
```

---

## Documentación y licencia

- [SRS — Especificación de requisitos](docs/SRS.md)
- [Arquitectura (diagramas Mermaid)](docs/ARCHITECTURE.md)
- [UML de base de datos (PlantUML)](docs/database-uml.puml)
- [UML de clases (PlantUML)](docs/class-uml.puml)

Consultar `LICENSE`.
=======
Gestor de textos educativos
>>>>>>> 0d8f619f7434816493e5a19d65e26f66f56331f4
