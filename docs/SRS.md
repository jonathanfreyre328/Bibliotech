# SRS - Bibliotech
## Especificacion de requisitos de software

**Version:** 2.3  
**Fecha:** 2026-10-26  
**Sistema:** Bibliotech  
**Dominio:** Gestion institucional de material educativo en PDF

## 1. Proposito y alcance

Bibliotech es una aplicacion web cerrada para un instituto educativo. Permite administrar carreras, anos, materias, clases concretas, profesores, alumnos y documentos PDF.

Los alumnos se registran, seleccionan carrera, anos y materias, solicitan acceso a clases concretas y, luego de la aprobacion del profesor responsable, pueden consultar y descargar los PDFs asociados.

El proyecto originalmente se llamaba SampleVault y gestionaba samples de audio. Ese dominio queda reemplazado.

### Fuera de alcance

- Acceso publico sin registro.
- Historial de actividad.
- ISBN.
- Deduplicacion de libros o archivos.
- Reemplazo del archivo fisico de un PDF.
- Archivos DOCX, EPUB, ODT o TXT.
- Aplicacion movil.
- Recuperacion automatica por correo.
- Verificacion de email.


## 2. Actores y permisos

### Admin

Es un superusuario con acceso total. Puede crear, editar, activar, desactivar y eliminar usuarios, carreras, anos, materias, clases, asignaciones y PDFs.

Ademas puede crear profesores, modificar datos personales y carreras de alumnos, aprobar o modificar cualquier solicitud, asignar alumnos directamente, crear nuevas clases cuando cambia un profesor y gestionar todas las relaciones entre PDFs y clases. Tambien puede editar su propio nombre, apellido, email y telefono y cambiar su contrasena desde `Perfil`.

### Professor

Es creado exclusivamente por el administrador. Puede tener muchas clases, pero cada clase concreta tiene un unico profesor.

Puede consultar sus clases, consultar alumnos relacionados con sus clases, aprobar o rechazar solicitudes sin motivo obligatorio, desasignar alumnos, cargar PDFs, editar metadata y permisos de sus propios PDFs y eliminarlos.

No puede consultar alumnos de todo el instituto ni modificar PDFs de otro profesor. Puede editar su propio nombre, apellido, email y telefono y cambiar su contrasena desde `Perfil`; la carrera y el resto de los datos de la cuenta son de solo lectura.

Si deja una clase, conserva acceso a los PDFs que subio, pero no puede cargar archivos nuevos en esa clase. El administrador crea otra clase concreta con el nuevo profesor.

### Student

Se registra por si mismo y define su contraseña (la ingresa dos veces para confirmarla). Proporciona nombre, apellido, DNI, email, telefono, fecha de nacimiento, usuario, contraseña y carrera.

Puede seleccionar varios anos y materias de distintos anos, editar sus materias solicitadas, cancelar solicitudes pendientes, volver a solicitar despues de un rechazo o desasignacion y consultar o descargar PDFs de clases aprobadas.

Puede editar su nombre, apellido, email y telefono, y cambiar su contrasena desde la pestaña `Perfil`. No puede cambiar su carrera ni el rol, DNI, usuario o fecha de alta. Solo el administrador cambia la carrera.

## 3. Modelo academico

```text
Carrera
   -> Año (1..duracion_años, atributo, no tabla)
        -> Materia
             -> Clase concreta
                  -> Un profesor
                  -> Alumnos asignados
                  -> PDFs asociados
```

No existen comisiones en el modelo final y no existe una tabla de años academicos. El año es un atributo numerico: `careers.duracion_años` define cuantos años tiene la carrera y `subjects.año` indica a que año pertenece cada materia.

### Carrera, año y materia

Una materia es un ente unico identificado por:

```text
carrera + año + nombre de materia
```

La misma materia puede repetirse en distintas carreras o anos. Por ejemplo:

```text
Sistemas - 1er año - Matematica
Sistemas - 2do año - Matematica
Administracion - 1er año - Matematica
```

### Clase concreta

Una clase concreta representa una instancia cursable de una materia y tiene un unico profesor.

Un profesor puede tener muchas clases. Diferentes clases de una misma materia pueden tener profesores diferentes.

Cuando un profesor deja una clase:

1. La clase anterior no se modifica.
2. El administrador crea una clase nueva con el profesor nuevo.
3. La clase anterior conserva alumnos y PDFs mientras siga activa.
4. Los PDFs de la clase anterior quedan disponibles automaticamente en la nueva clase de reemplazo.
5. El profesor anterior conserva acceso a los PDFs que subio.

Esta regla evita romper relaciones historicas.

### Estado de una clase

Una clase puede estar activa o inactiva. Una clase inactiva no aparece en el catalogo, no recibe solicitudes, no permite nuevas cargas, no permite consulta ni descarga y puede ser reactivada por el administrador.

El catalogo del endpoint `GET /api/academic/catalog` solo devuelve clases activas (el repositorio filtra con `AND cl.active = TRUE`).

## 4. Registro y acceso del alumno

1. El alumno se registra.
2. Elige carrera, uno o varios anos y una o varias materias.
3. Se crea con rol `student`.
4. No obtiene acceso automatico.
5. Se genera una solicitud por cada clase correspondiente.
6. El profesor responsable o el administrador decide la asignacion.
7. Solo una solicitud aprobada concede acceso.

El email no necesita ser institucional.

La interfaz del alumno tiene tres pestañas:

1. `Mis Materiales`: PDFs de las clases aprobadas, con visor integrado y descarga. La tabla se organiza por clase (un PDF asignado a varias clases se repite en cada una), se filtra por materia con chips que muestran la cantidad de PDFs de cada una, y se ordena por fecha de subida (mas recientes primero por defecto) mostrando fecha y hora.
2. `Solicitudes`: cascada Carrera -> Año -> Materia para crear solicitudes nuevas y tabla de solicitudes actuales.
3. `Perfil`: datos de la cuenta y cambio de contraseña.

En el registro la contraseña se ingresa dos veces. La confirmacion se valida en el frontend y en el backend (`PasswordConfirmation`) y no se persiste.

El alumno puede editar materias libremente. Al agregar una materia se crea una nueva solicitud pendiente. Al quitar una clase aprobada pierde el acceso y debe solicitarlo nuevamente. La interfaz debe mostrar una confirmacion antes de desasignarlo.

El alumno puede cancelar una solicitud pendiente desde la misma pestaña `Solicitudes`. La cancelacion exige confirmacion previa y solo se ofrece para solicitudes en estado `pending` (endpoint `DELETE /api/academic/requests/:id`).

El cambio de carrera solo lo realiza el administrador. Al cambiarla, se actualiza el usuario y se eliminan o desactivan sus solicitudes pendientes y aprobadas, por lo que pierde los accesos anteriores sin ser eliminado de la base.

### Perfil de usuario

Los tres paneles (administrador, profesor y alumno) incluyen una pestaña `Perfil`. El usuario puede editar su nombre, apellido, email y telefono (`PATCH /api/auth/profile`). Usuario, DNI, fecha de nacimiento, carrera, rol, estado y fecha de alta son de solo lectura; la carrera sigue siendo administrada por el admin. Un email ya registrado responde `409`.

El cambio de contraseña (`PATCH /api/auth/password`) exige la contraseña actual, la nueva y su repeticion. Si la actual no coincide responde `400` (no `401`, para no cerrar la sesion ni ocultar el mensaje). La nueva clave cumple la misma regla de fortaleza que el registro y debe ser distinta de la actual. Al completar el cambio, el frontend cierra la sesion y vuelve al login.

## 5. Solicitudes y asignaciones

El profesor solo debe ver solicitudes de sus propias clases. Asi no tiene acceso a datos de alumnos de todo el instituto.

El administrador puede asignar alumnos directamente y gestionar cualquier asignacion.

Estados permitidos:

```text
pending   -> approved
pending   -> rejected
pending   -> cancelled
approved  -> removed
rejected  -> pending
removed   -> pending
```

El rechazo no requiere motivo. El alumno puede enviar nuevamente la solicitud. No se permiten solicitudes duplicadas pendientes o aprobadas para el mismo alumno y clase.

## 6. PDFs y archivos

### Datos del material

```text
id
title
description
original_filename
author
file_path
uploaded_by
active
created_at
```

El titulo es obligatorio. El autor representa al autor del libro o documento, no necesariamente al profesor que carga el archivo. No se utiliza ISBN y se permiten archivos repetidos.

### Carga y acceso

Solo el profesor propietario y el administrador pueden cargar PDFs. El profesor selecciona durante la carga una o varias clases propias. El material no se comparte automaticamente con toda la carrera, ano o materia.

El backend verifica cada asignacion al crear o editar: si ninguna de las clases indicadas pertenece al profesor y esta activa, la operacion se rechaza con un error explicito. El dropdown de asignacion solo lista clases activas del profesor.

Un alumno puede acceder si:

- el PDF esta activo;
- la clase esta activa;
- existe una solicitud aprobada del alumno para esa clase.

El profesor propietario puede consultar sus materiales (devueltos con el detalle de sus clases asociadas: carrera, año, materia). El administrador tiene acceso total.

Ademas de la descarga (`GET /api/materials/:id/download`) existe visualizacion inline (`GET /api/materials/:id/view`) para el visor a pantalla completa. El frontend pide el PDF con `fetch` incluyendo el JWT en el header `Authorization`, recibe un `Blob` y lo muestra con `URL.createObjectURL`; por eso el token nunca viaja en la URL.

### Edicion

El propietario puede editar titulo, descripcion, autor y clases asociadas permitidas despues de subir el PDF. Puede agregar o quitar clases propias.

Quitar una clase no elimina el PDF: solo revoca el acceso de los alumnos de esa clase. Los alumnos de otras clases asociadas conservan acceso.

El archivo fisico no puede reemplazarse.

### Eliminacion

El propietario o el administrador pueden eliminar un PDF. Al hacerlo se eliminan las relaciones, el registro de MariaDB y el archivo fisico de `backend/uploads`. Todos pierden el acceso.

### Restricciones

- Solo `application/pdf`.
- Maximo de 50 MB.
- Multer administra la carga.
- Los archivos se guardan en `backend/uploads`.
- La carpeta no se publica como recurso estatico.
- La descarga exige JWT y autorizacion.

## 7. Autenticacion y seguridad

- JWT para sesiones.
- Duracion recomendada de 8 horas.
- El token contiene identificador, rol, emision, expiracion e identificador del arranque del backend.
- Al reiniciar el backend se invalidan todos los tokens emitidos antes del reinicio.
- BCrypt con costo 12.
- Contraseña minima de 8 caracteres, con una letra y un numero.
- El registro exige repetir la contrasena; la confirmacion se valida en frontend y backend y no se almacena.
- El cambio de contrasena exige la clave actual y la repeticion de la nueva; una clave actual incorrecta responde `400`.
- Username, DNI y email unicos.
- Usuarios desactivados no pueden iniciar sesion.
- Las contrasenas nunca se devuelven por API.
- El backend valida siempre autenticacion, rol y permisos del recurso.
- Los profesores solo reciben los datos minimos de alumnos de sus clases.
- Los secretos viven en `backend/.env` y no se suben a Git.

## 8. Validacion

La validacion de entrada se resuelve con un patron orientado a objetos:

- `Validation`: clase base abstracta con el contrato `validate(target, language) -> [{ field, message }]`.
- `ValidationHandler`: acumula validaciones con `.with(...)` y devuelve el resultado consolidado. Rechaza cualquier objeto que no implemente el contrato.
- `UserValidator`: arma el handler con las reglas que corresponden al alta de alumnos.
- `ProfileValidator`: valida la edicion del perfil (`validateProfile`) y el cambio de contrasena (`validatePasswordChange`).
- Reglas concretas (`validators/rules/`): `RequiredFields`, `Email`, `Password`, `PasswordConfirmation`, `BirthDate`, `CareerId` y `MaxLength`.

`BirthDate` exige una fecha real (rechaza 30 de febrero), no futura y posterior a 1900. `CareerId` exige un entero positivo; ademas `userRepo.create` verifica dentro de la transaccion que la carrera exista y este activa. `MaxLength` replica los limites de las columnas de `users` para responder `400` antes de que MariaDB corte con `ER_DATA_TOO_LONG`.

Los textos de los mensajes salen de `utils/i18n/i18n.js`, un Singleton que carga
`utils/i18n/locales/{es,en}.json` en memoria al arrancar. El idioma viaja como
parametro (`language`): los validadores no dependen de estado global.

El resultado es estructurado:

```json
{
  "valid": false,
  "errors": [
    { "field": "email", "message": "El email no es valido" }
  ]
}
```

La validacion de formato se separa de la autorizacion, propiedad y permisos.

## 9. Modelo de datos

Tablas:

```text
roles
users
users_roles
careers
subjects
classes
student_subject_requests
materials
material_classes
```

Relaciones y restricciones:

- `users.career_id` relaciona al alumno con su carrera.
- `careers.duracion_años` define la cantidad de años de la carrera (no existe tabla de años academicos).
- `subjects` relaciona carrera, año (`año`) y nombre.
- `classes` relaciona una materia concreta con un unico profesor.
- `student_subject_requests` relaciona alumnos con clases y estados de acceso.
- `materials` guarda el propietario del PDF.
- `material_classes` relaciona un PDF con una o varias clases (ON DELETE CASCADE).
- `UNIQUE users.username`.
- `UNIQUE users.dni`.
- `UNIQUE users.email`.
- `UNIQUE subjects(career_id, año, name)`.
- `UNIQUE student_subject_requests(student_id, class_id)`.
- Claves primarias compuestas en `users_roles` y `material_classes`.
- Eliminar una clase o un PDF elimina en cascada sus relaciones de `material_classes` y `student_subject_requests`.

Diagramas:

- [Fuente PlantUML de base de datos](database-uml.puml)
- [Fuente PlantUML de clases](class-uml.puml)

## 10. Arquitectura tecnica

```text
Frontend separado
  -> routes
       -> controllers
            -> repositories
                 -> MariaDB
```

Capas:

- `routes`: endpoints HTTP.
- `controllers`: coordinacion de peticiones y respuestas.
- `repositories`: consultas SQL y transacciones.
- `middleware`: JWT, roles y manejo global de errores.
- `validators`: validacion de entrada.
- `utils`: manejo de archivos, traducciones y utilidades de base de datos.
- `config`: MariaDB y Multer.

Tecnologias: Node.js, Express, MariaDB, MySQL2, Multer, JWT, BCrypt, Vanilla JavaScript y W3.CSS.

### 10.1 Manejo de errores

La aplicacion aplica un patron de **manejador global de errores** (`middleware/globalErrorMiddleware.js`), registrado como ultimo middleware de `server.js`. Los controllers no construyen respuestas 500 genericas: delegan la contingencia con `next(error)` y el manejador la traduce.

Respuesta de error estandar:

```json
{
  "message": "El registro ya existe. Verificá los datos ingresados."
}
```

En los errores de validacion se agrega el detalle por campo, que el frontend consume con `apiService.formatErrors()`:

```json
{
  "message": "Datos de registro inválidos.",
  "errors": [{ "field": "email", "message": "El email no es valido" }]
}
```

Traduccion de los errores tecnicos del driver MySQL y de Multer:

| Origen | Codigo HTTP | Mensaje al usuario |
|---|---|---|
| `ER_DUP_ENTRY` | 409 | El registro ya existe. Verificá los datos ingresados. |
| `ER_ROW_IS_REFERENCED_2` | 409 | No se puede eliminar: existen registros relacionados. |
| `ER_NO_REFERENCED_ROW_2` | 400 | El registro relacionado no existe. |
| `ECONNREFUSED` / `ETIMEDOUT` | 500 | Servicio de base de datos no disponible. |
| `MulterError` | 400 | Archivo supera el tamaño maximo o tipo invalido. |

Requisito de seguridad: el stack trace se registra en el servidor pero **nunca** se devuelve al cliente en produccion. Con `NODE_ENV=development` la respuesta 500 incluye el detalle tecnico para facilitar la depuracion.

### 10.2 Utilidades de base de datos

- `utils/dbutils/db_setup.js`: inicializa la base ejecutando `backend/config/init.sql` de forma nativa (operacion destructiva: pide confirmacion o `--force`).
- `utils/dbutils/db_check.js`: diagnostico de conectividad, tablas y usuarios registrados.

Comandos: `npm run db:setup` y `npm run db:check`.

El usuario de base de datos de la aplicacion se crea con permisos reducidos (`SELECT, INSERT, UPDATE, DELETE, EXECUTE`), sin `DROP` ni `ALTER`: la aplicacion no puede modificar el esquema (Principio de Menor Privilegio).

### 10.3 Seguridad en el frontend y en el manejo de archivos

**Sanitizacion de HTML (anti-XSS).** El motor de tablas (`components/table.js`) no asigna nunca `innerHTML`. Las columnas marcadas con `html: true` se renderizan a traves de un sanitizador con lista blanca:

- etiquetas permitidas: `span`, `b`, `strong`, `i`, `em`, `small`, `br`;
- unico atributo permitido: `class`, limitado a los tokens del framework (`w3-*`);
- se descartan los manejadores de eventos (`on*`) y los atributos `style`, `href` y `src`;
- `script`, `iframe`, `object` y equivalentes se eliminan junto con su contenido.

El HTML se parsea con `DOMParser` (que no ejecuta scripts ni carga recursos) y se reconstruye nodo a nodo. El formato visual de los indicadores de estado no se altera.

**Rutas de archivos.** La resolucion de las rutas fisicas de los PDFs es responsabilidad de un unico modulo (`utils/fileHelper.js`):

- la carpeta de subidas se define contra la raiz del backend, con independencia del directorio de trabajo del proceso;
- toda ruta se normaliza y se descarta si intenta salir de la carpeta de subidas (path traversal);
- el borrado del archivo recien subido (rollback) se centraliza en el mismo modulo.

El frontend es una SPA por dashboards con HTML estatico servido por rutas de vista. Cada dashboard se controla con un `frontController` (`admin`, `professor`, `student`, `materials`, `profile`, `auth`) que pagina y delega en componentes reutilizables:

- `components/table.js`: motor de tablas con busqueda persistente, filtros por columna (selects con criterio definido por tabla) y ordenamiento ascendente/descendente interno. Admite, de forma optativa: filtro multi-valor por columna, barra de filtros como chips con contador, orden por defecto visible, boton para invertir el orden, agrupacion de filas bajo un encabezado de grupo y una linea de resumen.
- `components/modal.js`: modales de confirmacion y formularios.
- `components/navigation.js`: navegador de pestañas por rol.
- `services/apiService.js`: cliente HTTP con JWT y `formatErrors()`.
- `utils/routeGuard.js`: protege la vista segun rol y token.

## 11. API principal

Autenticacion:

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/careers
GET    /api/auth/me
PATCH  /api/auth/profile
PATCH  /api/auth/password
```

`GET /api/auth/me` devuelve el perfil completo (sin contraseña). `PATCH /api/auth/profile` solo modifica `firstName`, `lastName`, `email` y `phone`. `PATCH /api/auth/password` requiere `currentPassword`, `newPassword` y `confirmPassword`.

`POST /api/auth/login` y `POST /api/auth/register` aplican limite de intentos y responden `429 Too Many Requests` con `Retry-After` al superarlo.

Academia:

```text
GET    /api/academic/catalog      (solo clases activas)
GET    /api/academic/classes      (profesor)
GET    /api/academic/requests     (profesor)
GET    /api/academic/my-requests  (alumno)
POST   /api/academic/requests     (alumno)
PATCH  /api/academic/requests/:id (profesor)
DELETE /api/academic/requests/:id (alumno, cancelar pendiente)
GET    /api/academic/my-classes   (alumno)
```

Materiales:

```text
GET    /api/materials
POST   /api/materials
PATCH  /api/materials/:id
DELETE /api/materials/:id
GET    /api/materials/:id/download
GET    /api/materials/:id/view
```

Administracion (router completo con verifyToken + isAdmin):

```text
GET    /api/admin/users
PATCH  /api/admin/users/:id/active
DELETE /api/admin/users/:id
POST   /api/admin/professors
PATCH  /api/admin/professors/:id
GET    /api/admin/careers
POST   /api/admin/careers
PATCH  /api/admin/careers/:id
DELETE /api/admin/careers/:id
GET    /api/admin/subjects
POST   /api/admin/subjects
PATCH  /api/admin/subjects/:id
PATCH  /api/admin/subjects/:id/active
DELETE /api/admin/subjects/:id
GET    /api/admin/classes
POST   /api/admin/classes
PATCH  /api/admin/classes/:id
PATCH  /api/admin/classes/:id/active
DELETE /api/admin/classes/:id
POST   /api/admin/classes/:id/students
PATCH  /api/admin/users/:id/career
```

## 12. Requisitos no funcionales

### RNF-01 Seguridad

Toda ruta protegida valida JWT, rol y permisos especificos del recurso. El login y el registro tienen limite de intentos (`429` con `Retry-After`): 5 fallos cada 15 minutos por IP y usuario en el login, 10 intentos por hora por IP en el registro. Las contrasenas se almacenan con bcrypt costo 12 y se rechazan las que superan los 72 bytes que bcrypt procesa. Falta de token, token invalido/expirado o usuario inactivo responden `401`; un rol sin permiso responde `403`.

### RNF-02 Integridad

El cambio de carrera, la creacion de usuarios, la carga de PDFs y la creacion de clases heredadas usan transacciones cuando modifican varias tablas.

### RNF-03 Mantenibilidad

El acceso a MariaDB esta encapsulado en repositories. El frontend no ejecuta SQL.

### RNF-04 Separacion

Frontend y backend se mantienen separados.

### RNF-05 Privacidad

Los PDFs no quedan disponibles por URL publica sin autorizacion.

### RNF-06 Compatibilidad

Node.js 18 o superior y MariaDB.

### RNF-07 Limite

Las cargas mayores a 50 MB deben rechazarse.

## 13. Criterios de aceptacion

1. El alumno puede registrarse con datos validos.
2. El alumno puede elegir varios anos y materias de distintos anos.
3. El alumno no obtiene acceso antes de la aprobacion.
4. El alumno puede editar materias y volver a solicitar acceso.
5. El alumno puede cancelar pendientes con confirmacion previa.
6. El profesor solo ve solicitudes de sus clases.
7. El profesor puede aprobar, rechazar y desasignar alumnos.
8. El administrador puede realizar todas las operaciones.
9. Cada clase concreta tiene un unico profesor.
10. Cambiar profesor crea una clase nueva y no rompe la clase historica.
11. Los PDFs pueden heredarse automaticamente a la clase nueva.
12. Solo se aceptan PDFs de hasta 50 MB.
13. Un PDF puede asociarse a varias clases concretas.
14. El profesor propietario puede editar metadata y permisos de sus PDFs.
15. Un profesor no puede modificar material ajeno.
16. Un alumno aprobado puede visualizar y descargar.
17. Un alumno no aprobado no puede descargar.
18. Una clase inactiva no permite acceso y no aparece en el catalogo.
19. Eliminar un PDF elimina el registro, las relaciones y el archivo fisico.
20. Cambiar carrera elimina accesos academicos del alumno.
21. Los tests automatizados pasan sin errores.
22. Subir un PDF sin ninguna clase propia activa valida se rechaza con error explicito.
23. El alumno puede cancelar solicitudes pendientes con confirmacion previa; no puede cancelar aprobadas o rechazadas.
24. Todas las grillas de los tres paneles ofrecen busqueda, filtros por columna y orden ascendente/descendente.
25. Los PDFs aprobados se pueden visualizar embebidos y descargar con JWT valido.
26. La tabla de materiales del alumno y del profesor se filtra por materia, se agrupa por clase y se ordena por fecha de subida (mas recientes primero) mostrando fecha y hora.
27. Un PDF asociado a varias clases aparece en el grupo de cada una de ellas.
28. El registro rechaza una confirmacion de contraseña distinta o ausente.
29. Los tres paneles ofrecen una pestaña Perfil con los cuatro campos editables y el cambio de contraseña; la carrera, el rol, el estado y la fecha de alta son de solo lectura.
