# ✍️ Club de Escritura — App de retos mensuales

App web mobile-first para gestionar retos de escritura con votación anónima y por subcategorías.

---

## 🗂 Estructura del proyecto

```
writing-club/
├── src/
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── PhaseBadge.jsx
│   │   └── phases/
│   │       ├── SubmissionPhase.jsx   ← Envío de historias
│   │       ├── CommentingPhase.jsx   ← Comentarios (requisito para votar)
│   │       ├── VotingPhase.jsx       ← Votación escalonada + subcategorías
│   │       └── RevealPhase.jsx       ← Resultados con autores revelados
│   ├── hooks/
│   │   └── useAuth.jsx               ← Contexto de autenticación
│   ├── lib/
│   │   └── supabase.js               ← Cliente Supabase
│   ├── pages/
│   │   ├── AuthPage.jsx              ← Login / Registro
│   │   ├── HomePage.jsx              ← Lista de retos
│   │   ├── ChallengePage.jsx         ← Reto activo (orquesta las fases)
│   │   └── AdminPage.jsx             ← Panel de administración
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── supabase_schema.sql               ← Schema de base de datos
├── .env.example                      ← Variables de entorno necesarias
└── package.json
```

---

## 🚀 Instalación paso a paso

### 1. Crear proyecto en Supabase (gratis)

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto (elige región más cercana, ej: `South America (São Paulo)`)
3. Espera a que el proyecto se inicialice (~2 minutos)

### 2. Ejecutar el schema de base de datos

1. En tu proyecto Supabase, ve a **SQL Editor** (menú izquierdo)
2. Copia todo el contenido de `supabase_schema.sql`
3. Pégalo en el editor y haz clic en **Run**
4. Verifica que todas las tablas aparecen en **Table Editor**

### 3. Configurar credenciales

1. Ve a **Project Settings → API** en Supabase
2. Copia la **Project URL** y la **anon/public key**
3. En la raíz del proyecto, crea el archivo `.env.local`:

```env
VITE_SUPABASE_URL=https://tuproyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Instalar y correr

```bash
npm install
npm run dev
```

La app estará en `http://localhost:5173`

---

## 👑 Crear el primer admin

Después de registrarte con tu correo:

1. Ve a **Supabase → Table Editor → profiles**
2. Busca tu usuario
3. Cambia `is_admin` de `false` a `true`
4. Guarda

A partir de ese momento verás el enlace **Admin** en la navegación.

---

## 🎯 Flujo del reto

### Fases (el admin las avanza manualmente)

| Fase | Qué pasa |
|------|----------|
| **Envío** | Los escritores suben su historia (anónima) |
| **Comentarios** | Todos deben comentar CADA historia para desbloquear votos |
| **Votación** | Sistema de puntos escalonados + 3 subcategorías |
| **Resultados** | Se revelan autores, puntos totales y ganadores por categoría |

### Sistema de votos

Si hay **N historias inscritas**, cada votante debe asignar:
- **N puntos** → su favorita
- **N-1 puntos** → la segunda
- …
- **1 punto** → incluyendo la propia (sin poder abstenerse)

Cada puntaje se usa exactamente una vez.

### Subcategorías (opcional al votar)
- 🧑 Mejor personaje
- 📖 Mejor trama  
- ✨ Mejor inicio

---

## 🌐 Deploy a producción (Vercel — gratis)

```bash
npm install -g vercel
vercel
```

Cuando Vercel te pida las variables de entorno, agrega:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

O agrégalas desde el dashboard de Vercel en **Project → Settings → Environment Variables**.

---

## 📱 Diseñada para móvil

La app está optimizada para usarse desde el celular con:
- Viewport de máximo 672px
- Botones y áreas táctiles grandes
- Guardado automático del progreso de votos

---

## 🔒 Privacidad y anonimato

- Las historias **no muestran el autor** hasta que el admin avanza a fase "Resultados"
- Los votos **solo los ve el propio votante** (Row Level Security en Supabase)
- Los comentarios son públicos (necesario para verificar el requisito)
