# Despliegue — GitHub + Vercel

## App en producción

**https://inventario-app-blond-eight.vercel.app**

- Cuenta Vercel: `acaifactorypr-8466`
- Base de datos: Neon (PostgreSQL), conectada vía integración Vercel
- Login: `admin@acaifactory.com` / `admin123`

---

## Primera vez: crear repo en GitHub

En PowerShell, desde la carpeta del proyecto:

```powershell
cd c:\Users\onixo\inventario-app

# 1. Autenticarse en GitHub (solo una vez)
gh auth login

# 2. Crear repo y subir código
gh repo create inventario-app --public --source=. --remote=origin --push
```

Si el repo ya existe:

```powershell
git push -u origin main
```

**Importante:** el correo de Git en el proyecto debe ser `acaifactorypr@gmail.com` (igual que GitHub) para que Vercel no bloquee deploys:

```powershell
git config user.email "acaifactorypr@gmail.com"
git config user.name "acaifactory"
```

---

## Publicar cambios (cada actualización)

```powershell
.\scripts\publish-github-vercel.ps1
```

O manualmente:

```powershell
git add -A
git commit -m "Descripcion del cambio"
git push origin main
npx vercel deploy --prod --yes
```

---

## Deploy automático (Git → Vercel)

Después de tener el repo en GitHub:

```powershell
npx vercel git connect
```

Cada `git push` a `main` desplegará automáticamente en Vercel.

Si Vercel muestra **Deployment Blocked**, reconecta GitHub en:
https://vercel.com/account/settings/authentication

---

## Variables de entorno en Vercel

Ya configuradas en el proyecto `inventario-app`:

| Variable | Requerida |
|----------|-----------|
| `DATABASE_URL` | Sí (Neon) |
| `JWT_SECRET` | Sí |
| `APP_URL` | Sí → `https://inventario-app-blond-eight.vercel.app` |
| `RESEND_API_KEY` | Para emails |
| `EMAIL_FROM` | Para emails |

Ver/editar: https://vercel.com/acaifactorypr-8466s-projects/inventario-app/settings/environment-variables

---

## Build en Vercel

El `vercel.json` ejecuta en cada deploy:

1. `prisma generate`
2. `prisma db push` (sincroniza schema con Neon)
3. `npm run db:seed` (catálogo y usuarios demo)
4. `next build`

---

## Usar en el celular

1. Abre https://inventario-app-blond-eight.vercel.app
2. Inicia sesión
3. **Añadir a inicio** (Chrome/Safari) para usarla como app

---

## Flujo para alcanzar el objetivo (food cost)

1. **Compras** — facturas con conversión de empaque
2. **Salidas** — motivo *Venta* al usar mercancía
3. **Food Cost** — período + ventas en $ → ver Full Cost %
4. **Uso** — revisar consumo semanal en cantidad y $
