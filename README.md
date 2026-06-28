# Studeo Backend REST

API REST principal de Studeo, construida con NestJS. Esta capa administra usuarios, perfiles, salas, membresias e historial de mensajes. La comunicacion realtime y la senalizacion WebRTC viven en `backend-realtime`.

## Tabla de contenidos

1. [Rol dentro del sistema](#rol-dentro-del-sistema)
2. [Stack principal](#stack-principal)
3. [Arquitectura de modulos](#arquitectura-de-modulos)
4. [Estructura de carpetas](#estructura-de-carpetas)
5. [Variables de entorno](#variables-de-entorno)
6. [Scripts](#scripts)
7. [Arranque y configuracion global](#arranque-y-configuracion-global)
8. [Autenticacion y seguridad](#autenticacion-y-seguridad)
9. [Endpoints REST](#endpoints-rest)
10. [Modelo de datos en Firestore](#modelo-de-datos-en-firestore)
11. [Flujos principales](#flujos-principales)
12. [Swagger](#swagger)
13. [Relacion con frontend y realtime](#relacion-con-frontend-y-realtime)
14. [Verificacion y pruebas](#verificacion-y-pruebas)

## Rol dentro del sistema

El proyecto tiene tres capas:

| Capa | Proyecto | Responsabilidad |
|---|---|---|
| Web app | `frontend` | UI, autenticacion cliente, dashboard, lobby, llamada |
| REST API | `backend` | Usuarios, perfiles, salas, membresias, historial |
| Realtime | `backend-realtime` | Presencia, chat en vivo, moderacion y signaling WebRTC |

Este backend expone rutas bajo el prefijo global `/api`. No transporta audio/video ni maneja sockets. Los mensajes de chat se escriben en Firestore desde `backend-realtime`, y este backend los lee de forma paginada.

## Stack principal

| Tecnologia | Uso |
|---|---|
| NestJS 11 | Framework HTTP modular |
| TypeScript | Tipado estatico |
| Firebase Admin | Verificacion de tokens y acceso a Firestore/Auth |
| Firestore | Persistencia de usuarios, salas, codigos, miembros y mensajes |
| class-validator / class-transformer | Validacion de DTOs |
| Swagger / OpenAPI | Documentacion REST en `/api/docs` |
| Jest | Unit tests y e2e |

## Arquitectura de modulos

```text
AppModule
├── ConfigModule      # Variables de entorno globales
├── AuthModule        # Registro/sync con Firebase Auth
├── UsersModule       # Perfil, username, email, delete account
├── RoomsModule       # CRUD de salas y membresias
├── MessagesModule    # Lectura paginada del historial
└── HealthModule      # Health check
```

Capas internas:

- **Controllers**: exponen endpoints y documentacion Swagger.
- **Services**: reglas de negocio y validaciones.
- **DAOs**: acceso a Firestore.
- **DTOs**: contratos de entrada validados por `ValidationPipe`.
- **Entities/types**: forma de datos de dominio.
- **Guards**: validacion de Firebase Bearer Token.

## Estructura de carpetas

```text
backend/
├── src/
│   ├── auth/
│   │   ├── dto/
│   │   ├── guards/firebase-auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   └── auth.service.ts
│   ├── common/
│   │   ├── types/
│   │   └── utils/
│   ├── config/
│   │   └── firebase.config.ts
│   ├── daos/
│   │   ├── rooms.dao.ts
│   │   └── users.dao.ts
│   ├── health/
│   ├── messages/
│   │   ├── chat.service.ts
│   │   └── rooms-messages.controller.ts
│   ├── rooms/
│   │   ├── dto/
│   │   ├── entities/
│   │   ├── utils/
│   │   ├── rooms.controller.ts
│   │   ├── rooms.module.ts
│   │   └── rooms.service.ts
│   ├── users/
│   │   ├── dto/
│   │   ├── entities/
│   │   ├── users.controller.ts
│   │   ├── users.module.ts
│   │   └── users.service.ts
│   ├── app.module.ts
│   └── main.ts
├── test/
├── nest-cli.json
└── package.json
```

## Variables de entorno

Crear `.env` en `backend/`.

```env
# Servidor HTTP
PORT=3000

# Origenes permitidos para CORS, separados por coma
FRONTEND_URL=http://localhost:5173

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Notas:

- `FIREBASE_PRIVATE_KEY` acepta saltos `\n`; el backend los convierte a saltos reales.
- Si `FRONTEND_URL` esta vacio, CORS queda sin origenes permitidos explicitamente.
- El puerto por defecto es `3000`.

## Scripts

```bash
npm install
npm run start:dev   # Nest watch mode
npm run build       # Compila a dist/
npm run start:prod  # Ejecuta dist/main
npm run lint        # ESLint con --fix
npm run test        # Unit tests
npm run test:e2e    # E2E tests
npm run test:cov    # Coverage
```

## Arranque y configuracion global

`src/main.ts` hace:

1. Inicializa Firebase Admin con `initializeFirebase()`.
2. Crea la app Nest.
3. Aplica prefijo global `/api`.
4. Habilita CORS usando `FRONTEND_URL`.
5. Activa `ValidationPipe` con:
   - `whitelist: true`
   - `forbidNonWhitelisted: true`
   - `transform: true`
6. Publica Swagger en `/api/docs`.
7. Escucha en `PORT` o `3000`.

## Autenticacion y seguridad

Las rutas protegidas usan `FirebaseAuthGuard`.

Flujo:

1. El frontend obtiene un Firebase ID Token.
2. Lo envia como `Authorization: Bearer <token>`.
3. El guard valida el token con Firebase Admin.
4. Si es valido, agrega `req.user`.
5. Controllers y services usan `req.user.uid` como identidad confiable.

Rutas publicas:

- `GET /api/health`
- `GET /api`
- `GET /api/users/check-username/:username`
- `GET /api/users/check-email/:email`
- `GET /api/docs`

El resto requiere Bearer Token.

## Endpoints REST

Base local: `http://localhost:3000/api`

### Sistema

| Metodo | Ruta | Auth | Descripcion |
|---|---|---|---|
| `GET` | `/` | No | Mensaje base del servicio |
| `GET` | `/health` | No | Health check |
| `GET` | `/docs` | No | Swagger UI |

### Auth

| Metodo | Ruta | Auth | Descripcion |
|---|---|---|---|
| `POST` | `/auth/register` | Si | Registra o sincroniza usuario autenticado con Firestore |

### Users

| Metodo | Ruta | Auth | Descripcion |
|---|---|---|---|
| `GET` | `/users/check-username/:username` | No | Verifica disponibilidad de username |
| `GET` | `/users/check-email/:email` | No | Verifica disponibilidad de email |
| `GET` | `/users/profile` | Si | Obtiene estado completo del perfil |
| `GET` | `/users/profile/basic` | Si | Obtiene username, nombre, apellido y avatar |
| `POST` | `/users/complete-profile` | Si | Completa perfil inicial |
| `PATCH` | `/users/profile` | Si | Actualiza perfil |
| `DELETE` | `/users/profile` | Si | Elimina cuenta Firebase Auth y perfil Firestore |

### Rooms

| Metodo | Ruta | Auth | Descripcion |
|---|---|---|---|
| `POST` | `/rooms` | Si | Crea sala y asigna owner |
| `GET` | `/rooms/my-rooms` | Si | Lista salas del dashboard del usuario |
| `POST` | `/rooms/join` | Si | Une al usuario a una sala por codigo |
| `GET` | `/rooms/my-rooms/members` | Si | Mapa de miembros por sala del usuario |
| `GET` | `/rooms/:roomId/members` | Si | Miembros de una sala |
| `GET` | `/rooms/:roomId` | Si | Detalle de sala |
| `PATCH` | `/rooms/:roomId` | Si | Edita sala; solo owner |
| `DELETE` | `/rooms/:roomId/membership` | Si | Quita sala del dashboard del participante |
| `DELETE` | `/rooms/:roomId` | Si | Elimina sala; solo owner |

### Messages

| Metodo | Ruta | Auth | Descripcion |
|---|---|---|---|
| `GET` | `/rooms/:roomId/messages?cursor=...` | Si | Lee historial paginado de mensajes |

La escritura de mensajes no ocurre por REST. Se hace desde `backend-realtime` con `message:send`.

## Modelo de datos en Firestore

Colecciones principales:

```text
users/{uid}
  uid
  firstName
  lastName
  email
  username
  avatarUrl
  authProvider
  profileComplete
  createdAt
  updatedAt

usernames/{normalizedUsername}
  uid

rooms/{roomId}
  id
  roomCode
  name
  description?
  imageUrl?
  ownerUid
  createdAt
  updatedAt

rooms/{roomId}/members/{uid}
  uid
  joinedAt

rooms/{roomId}/messages/{messageId}
  uid
  username
  avatarUrl?
  text
  timestamp

roomCodes/{roomCode}
  roomId
```

Reglas importantes:

- `usernames` reserva nombres normalizados para evitar duplicados.
- `roomCodes` permite resolver codigos publicos de 6 caracteres hacia `roomId`.
- Al eliminar una sala se eliminan miembros, mensajes y codigo asociado.
- Al eliminar un usuario owner tambien se eliminan sus salas creadas.

## Flujos principales

### Registro/sync

1. Firebase Auth crea o autentica al usuario.
2. Frontend llama `POST /api/auth/register`.
3. Si no existe perfil, se crea stub con `profileComplete=false`.
4. Si ya existe, se retorna el perfil actual.

### Completar perfil

1. Frontend consulta `/users/profile`.
2. Si el perfil esta incompleto, muestra formulario.
3. `POST /users/complete-profile` valida username/avatar.
4. `users/{uid}` queda completo y `usernames/{username}` reservado.

### Crear sala

1. Usuario autenticado llama `POST /rooms`.
2. Se genera `roomId` y `roomCode`.
3. Se guarda `rooms/{roomId}`.
4. Se guarda `roomCodes/{roomCode}`.
5. El owner queda como miembro.

### Unirse a sala

1. Usuario ingresa codigo.
2. `POST /rooms/join` busca `roomCodes/{code}`.
3. Agrega `rooms/{roomId}/members/{uid}`.
4. La sala aparece en dashboard.

### Chat

1. Cliente envia mensaje por Socket.IO a `backend-realtime`.
2. `backend-realtime` emite `message:new` inmediatamente.
3. `backend-realtime` persiste en `rooms/{roomId}/messages`.
4. Este backend expone lectura historica por `GET /rooms/:roomId/messages`.

### Eliminacion de cuenta

1. `DELETE /users/profile`.
2. El backend intenta eliminar el usuario en Firebase Auth.
3. Elimina salas donde el usuario es owner.
4. Elimina perfil y username reservado.
5. Si Firebase requiere reautenticacion reciente, responde el error correspondiente.

## Swagger

Swagger esta disponible en:

```text
http://localhost:3000/api/docs
```

Incluye:

- Tags `auth`, `users`, `rooms`.
- Bearer Auth.
- DTOs y ejemplos de respuesta.
- Descripciones de errores comunes.

## Relacion con frontend y realtime

```text
frontend
  │
  ├── REST /api/* --------------------> backend
  │                                    perfiles, salas, historial
  │
  └── Socket.IO ----------------------> backend-realtime
                                       presencia, chat live, WebRTC signaling
```

Este backend no sabe si un usuario esta conectado a una llamada. Esa presencia vive en `backend-realtime`.

## Verificacion y pruebas

Comandos recomendados:

```bash
npm run build
npm run test
npm run test:e2e
```

Health check:

```bash
curl http://localhost:3000/api/health
```

Prueba manual de auth:

```bash
curl http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer <firebase-id-token>"
```

Checklist basico:

- Firebase Admin inicializa sin errores.
- Swagger abre en `/api/docs`.
- CORS permite el origen del frontend.
- `POST /auth/register` sincroniza un usuario autenticado.
- `POST /rooms` crea sala y codigo.
- `GET /rooms/:roomId/messages` lee mensajes persistidos por realtime.
