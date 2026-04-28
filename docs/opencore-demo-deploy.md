# OpenCore Demo Deploy

Esta guía deja OpenCore accesible para un cliente con un usuario de prueba real.

## 1. Variables obligatorias

Configura estas variables en el entorno de despliegue y también en tu terminal local para tareas administrativas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

`SUPABASE_SERVICE_KEY` puede mantenerse como alias legacy, pero OpenCore debe operar tomando `SUPABASE_SERVICE_ROLE_KEY` como referencia principal.

## 2. Subida recomendada

Para este repositorio de Next.js, el camino más directo es desplegarlo en una plataforma compatible con Next.js server runtime.

Pasos mínimos:

1. Conecta el repositorio al proveedor de deploy.
2. Define las tres variables de entorno anteriores.
3. Usa `npm install` como instalación.
4. Usa `npm run build` como build.
5. Publica la URL resultante.

## 3. Crear el usuario demo del cliente

Con las variables ya cargadas, ejecuta:

```bash
DEMO_USER_EMAIL="cliente.demo@tuempresa.com" \
DEMO_USER_PASSWORD="DefineUnaClaveTemporalSegura123!" \
npm run auth:demo-user
```

El script es idempotente a nivel operativo:

- si el usuario no existe, lo crea
- si ya existe, le actualiza la contraseña y confirma el correo

## 4. Qué quedó protegido

Con la autenticación ya activa:

- `/login` inicia sesión con Supabase
- el resto de páginas redirige a login si no hay sesión válida
- las rutas `/api/*` responden `401` si el usuario no está autenticado
- OpenCore permite cerrar sesión desde la barra lateral

## 5. Entrega al cliente

Comparte únicamente:

1. la URL desplegada
2. el correo demo
3. la contraseña temporal

Después de la prueba, puedes rotar la contraseña del mismo usuario ejecutando otra vez el script con una clave nueva.
