# Acceder sin PC encendida + usar en el celular

Tu app ya está lista para publicarse en internet. Así podrás entrar **24/7** desde el celular, tablet o cualquier computadora.

---

## Opción recomendada: Railway (más fácil, gratis para empezar)

Railway mantiene la app encendida en la nube. No necesitas tu computadora.

### Paso 1 — Subir el código a GitHub

1. Crea cuenta en **https://github.com**
2. Crea un repositorio nuevo llamado `inventario-app`
3. En la terminal de tu PC:

```bash
cd c:\Users\onixo\inventario-app
git init
git add .
git commit -m "Inventario Açaí Factory"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/inventario-app.git
git push -u origin main
```

(Cambia `TU-USUARIO` por tu usuario de GitHub.)

### Paso 2 — Publicar en Railway

1. Entra a **https://railway.app** y crea cuenta (con GitHub).
2. **New Project** → **Deploy from GitHub repo** → elige `inventario-app`.
3. En **Variables**, agrega:

| Variable | Valor |
|----------|--------|
| `JWT_SECRET` | Una frase larga secreta (ej: `acai-inventario-secreto-2026`) |
| `DATABASE_URL` | `file:./data/inventario.db` |

4. En **Settings** del servicio:
   - **Volume**: monta en `/app/prisma/data` (para que los datos no se borren)
5. **Settings** → **Networking** → **Generate Domain**
   - Te dará una URL como: `https://inventario-app-production.up.railway.app`

6. Espera que termine el deploy (3–5 min).

### Paso 3 — Cargar datos iniciales (primera vez)

En Railway, abre la terminal del servicio y ejecuta:

```bash
npm run db:seed
```

O desde tu PC con Railway CLI apuntando al proyecto.

### Paso 4 — Entrar desde el celular

1. Abre **Chrome** o **Safari** en el celular.
2. Ve a tu URL de Railway (la que generaste).
3. Inicia sesión:
   - **Correo:** `admin@acaifactory.com`
   - **Contraseña:** `admin123`

### Instalar como app en el celular

**Android:** Menú ⋮ → **Instalar aplicación** / **Añadir a inicio**

**iPhone:** Safari → Compartir → **Añadir a inicio**

Tendrás un ícono morado con la letra **A** en tu pantalla, como una app normal.

---

## Opción alternativa: Vercel + Neon (base de datos PostgreSQL)

Si prefieres Vercel:

1. Crea base de datos gratis en **https://neon.tech**
2. Cambia en `prisma/schema.prisma` la línea `provider = "sqlite"` por `provider = "postgresql"`
3. Publica en **https://vercel.com** conectando GitHub
4. Variables de entorno: `DATABASE_URL` (de Neon) y `JWT_SECRET`
5. Ejecuta `npm run db:seed` una vez con la URL de Neon

---

## Resumen: ¿qué logras?

| Antes | Después |
|-------|---------|
| Solo funciona con la PC encendida | Funciona **24/7** en la nube |
| Solo `localhost:3000` | URL pública `https://...` |
| Abrir navegador en la PC | Abrir desde **cualquier celular** |
| Pestaña del navegador | **App en pantalla de inicio** |

---

## Uso diario en el móvil

1. Toca el ícono **Inventario** en tu celular
2. Entra con tu usuario
3. Usa el menú inferior: **Inicio**, **Uso**, **Productos**, **Entrada**, **Reportes**

La interfaz ya está adaptada para pantallas pequeñas.

---

## ¿Necesitas ayuda?

Si quieres, en el próximo mensaje dime:
- Si ya tienes cuenta en GitHub
- Si prefieres Railway o Vercel

Y te guío paso a paso en tiempo real.
