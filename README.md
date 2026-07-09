# Studeo Backend REST

API REST de Studeo construida con NestJS, Firebase Admin SDK y Firestore. Este servicio maneja autenticacion contra Firebase ID Tokens, perfiles de usuario y CRUD basico de salas.

## Rol dentro del sistema

Studeo usa tres capas:

| Capa | Rol | Puerto local |
|---|---|---|
| `frontend` | SPA React/Vite | `5173` |
| `backend` | API REST NestJS | `3000` |
| `backend-realtime` | Socket.IO, presencia, chat live y WebRTC signaling | `3001` |

El backend REST usa el prefijo global `/api`. Swagger esta disponible en `/api/docs`.

## Stack

| Tecnologia | Uso |
|---|---|
| NestJS 11 | API HTTP |
| TypeScript 5.7 | Tipado |
| Firebase Admin 13 | Verificacion de JWT, Auth y Firestore |
| class-validator / class-transformer | Validacion de DTOs |
| Swagger | Documentacion interactiva |
| Jest | Pruebas unitarias y e2e |

## Estructura

```text
backend/
├── src/
│   ├── auth/                 # Registro/sincronizacion y guard Firebase
│   ├── common/               # Tipos y utilidades compartidas
│   ├── config/               # Firebase Admin
│   ├── daos/                 # Acceso a Firestore
│   ├── health/               # Health check
│   ├── rooms/                # CRUD de salas
│   ├── users/                # Perfil y disponibilidad de username/email
│   ├── app.module.ts
│   └── main.ts
├── test/
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

`FRONTEND_URL` se usa para CORS. Las variables `FIREBASE_*` se usan para inicializar Firebase Admin con una service account.

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
npm run build       # Compila con Nest
npm run start       # Ejecuta Nest
npm run start:dev   # Watch mode
npm run start:prod  # Ejecuta dist/main
npm run lint        # ESLint con --fix
npm run test        # Jest unitario
npm run test:e2e    # Jest e2e
npm run test:cov    # Cobertura
```

## Autenticacion

Las rutas protegidas usan `FirebaseAuthGuard`. El cliente debe enviar:

```http
Authorization: Bearer <firebase-id-token>
```

El guard verifica el token con Firebase Admin y coloca el usuario decodificado en `req.user`.

## Endpoints implementados

Todas las rutas viven bajo `/api`.

### Infraestructura

| Metodo | Ruta | Auth | Descripcion |
|---|---|---|---|
| `GET` | `/` | No | Mensaje base de la app |
| `GET` | `/health` | No | Estado basico del servicio |
| `GET` | `/docs` | No | Swagger UI |

### Auth

| Metodo | Ruta | Auth | Descripcion |
|---|---|---|---|
| `POST` | `/auth/register` | Si | Registra o sincroniza el usuario autenticado en Firestore |

### Users

| Metodo | Ruta | Auth | Descripcion |
|---|---|---|---|
| `GET` | `/users/check-username/:username` | No | Valida disponibilidad de username |
| `GET` | `/users/check-email/:email` | No | Valida disponibilidad de correo |
| `GET` | `/users/profile` | Si | Obtiene perfil del usuario autenticado |
| `POST` | `/users/complete-profile` | Si | Completa el perfil |
| `PATCH` | `/users/profile` | Si | Actualiza el perfil |
| `DELETE` | `/users/profile` | Si | Elimina perfil y cuenta Firebase Auth |

### Rooms

| Metodo | Ruta | Auth | Descripcion |
|---|---|---|---|
| `POST` | `/rooms` | Si | Crea una sala |
| `GET` | `/rooms/my-rooms` | Si | Lista salas creadas por el usuario |
| `GET` | `/rooms/:roomId` | Si | Obtiene una sala |
| `PATCH` | `/rooms/:roomId` | Si | Actualiza una sala si el usuario es owner |
| `DELETE` | `/rooms/:roomId` | Si | Elimina una sala si el usuario es owner |

## Estado de integracion con frontend

El frontend actual contiene clientes para rutas que este backend todavia no expone:

- `POST /api/rooms/join`
- `GET /api/rooms/:roomId/members`
- `GET /api/rooms/my-rooms/members`
- `DELETE /api/rooms/:roomId/membership`
- `GET /api/rooms/:roomId/messages`

Hasta que esas rutas se implementen en `backend`, esas funciones del frontend fallaran con `404`.

## Firestore

El backend usa DAOs para persistir usuarios y salas en Firestore. El chat en vivo y la escritura de mensajes pertenecen al servicio `backend-realtime`.
