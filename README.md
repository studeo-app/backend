# Studeo Backend REST

API REST principal de Studeo, construida con NestJS, Firebase Admin SDK y Firestore. Esta capa administra usuarios, perfiles, salas, membresias e historial de mensajes. La comunicacion realtime y la senalizacion WebRTC viven en `backend-realtime`.

## Rol dentro del sistema

| Capa | Proyecto | Responsabilidad | Puerto local |
|---|---|---|---|
| Web app | `frontend` | UI, autenticacion cliente, dashboard, lobby y llamada | `5173` |
| REST API | `backend` | Usuarios, perfiles, salas, membresias e historial | `3000` |
| Realtime | `backend-realtime` | Presencia, chat live, moderacion y WebRTC signaling | `3001` |

Este backend expone rutas bajo el prefijo global `/api`. No transporta audio/video ni maneja sockets. Los mensajes de chat se escriben desde `backend-realtime`, y este backend los lee de Firestore de forma paginada.

## Stack

| Tecnologia | Uso |
|---|---|
| NestJS 11 | Framework HTTP modular |
| TypeScript 5.7 | Tipado estatico |
| Firebase Admin 13 | Verificacion de tokens y acceso a Firestore/Auth |
| Firestore | Persistencia de usuarios, salas, codigos, miembros y mensajes |
| class-validator / class-transformer | Validacion de DTOs |
| Swagger / OpenAPI | Documentacion REST en `/api/docs` |
| Jest | Pruebas unitarias y e2e |

## Arquitectura de modulos

```text
AppModule
├── ConfigModule      # Variables de entorno globales
├── AuthModule        # Registro/sync con Firebase Auth
├── UsersModule       # Perfil, username, email y delete account
├── RoomsModule       # CRUD de salas y membresias
├── MessagesModule    # Lectura paginada del historial
└── HealthModule      # Health check
```

## Estructura

```text
backend/
├── src/
│   ├── auth/
│   ├── common/
│   ├── config/
│   ├── daos/
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
│   ├── app.module.ts
│   └── main.ts
├── test/
├── nest-cli.json
├── package.json
└── tsconfig.json
```

## Variables de entorno

Crear `backend/.env` antes de ejecutar:

```env
PORT=3000
FRONTEND_URL=http://localhost:5173

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Notas:

- `FIREBASE_PRIVATE_KEY` acepta saltos `\n`; el backend los convierte a saltos reales.
- `FRONTEND_URL` se usa para CORS.
- El puerto por defecto es `3000`.

## Ejecutar en local

```bash
npm install
npm run start:dev
```

URLs utiles:

- API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api/docs`
- Health: `http://localhost:3000/api/health`

## Scripts

```bash
npm run build       # Compila a dist/
npm run start       # Ejecuta Nest
npm run start:dev   # Watch mode
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
5. Activa `ValidationPipe` con `whitelist`, `forbidNonWhitelisted` y `transform`.
6. Publica Swagger en `/api/docs`.
7. Escucha en `PORT` o `3000`.

## Autenticacion

Las rutas protegidas usan `FirebaseAuthGuard`. El cliente debe enviar:

```http
Authorization: Bearer <firebase-id-token>
```

El guard valida el token con Firebase Admin y agrega el usuario decodificado en `req.user`.

Rutas publicas:

- `GET /api`
- `GET /api/health`
- `GET /api/users/check-username/:username`
- `GET /api/users/check-email/:email`
- `GET /api/docs`

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

### Crear sala

1. Usuario autenticado llama `POST /api/rooms`.
2. Se genera `roomId` y `roomCode`.
3. Se guarda `rooms/{roomId}`.
4. Se guarda `roomCodes/{roomCode}`.
5. El owner queda como miembro.

### Unirse a sala

1. Usuario ingresa codigo.
2. `POST /api/rooms/join` busca `roomCodes/{code}`.
3. Agrega `rooms/{roomId}/members/{uid}`.
4. La sala aparece en dashboard.

### Chat

1. Cliente envia mensaje por Socket.IO a `backend-realtime`.
2. `backend-realtime` emite `message:new` inmediatamente.
3. `backend-realtime` persiste en `rooms/{roomId}/messages`.
4. Este backend expone lectura historica por `GET /api/rooms/:roomId/messages`.

## Relacion con frontend y realtime

```text
frontend
  ├── REST /api/* --------------------> backend
  │                                    perfiles, salas, historial
  │
  └── Socket.IO ----------------------> backend-realtime
                                       presencia, chat live, WebRTC signaling
```

Este backend no sabe si un usuario esta conectado a una llamada. Esa presencia vive en `backend-realtime`.

## Verificacion y pruebas

```bash
npm run build
npm run test
npm run test:e2e
```

Checklist basico:

- Firebase Admin inicializa sin errores.
- Swagger abre en `/api/docs`.
- CORS permite el origen del frontend.
- `POST /auth/register` sincroniza un usuario autenticado.
- `POST /rooms` crea sala y codigo.
- `GET /rooms/:roomId/messages` lee mensajes persistidos por realtime.
