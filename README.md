# 🎮 Stop! - Juego de Palabras Multiplayer

![Stop Game Banner](public/stop-banner.png)

Stop! es un juego de palabras en línea donde los jugadores compiten para encontrar palabras que comiencen con una letra específica para diferentes categorías. ¡El primero en completar todas las categorías y gritar "¡Stop!" gana la ronda!

## 🚀 Características

- 🔐 Autenticación de usuarios con Supabase
- 🌐 Juego en tiempo real
- 🎨 Interfaz moderna y responsiva
- 🎭 Multiples categorías personalizables
- 🏆 Sistema de puntuación y ranking
- 📱 Diseño responsive para móviles y escritorio

## 🛠️ Requisitos Previos

- Node.js 16.x o superior
- npm 8.x o superior
- Una cuenta en [Supabase](https://supabase.com/)

## 🚀 Instalación

1. **Clona el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/stop-game.git
   cd stop-game
   ```

2. **Instala las dependencias**
   ```bash
   npm install
   ```

3. **Configura las variables de entorno**
   Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:
   ```env
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
   ```

4. **Configuración de Supabase**
   - Crea un nuevo proyecto en [Supabase](https://supabase.com/)
   - Configura las tablas necesarias ejecutando el script SQL proporcionado en `supabase/migrations/001_initial_schema.sql`
   - Habilita la autenticación con correo electrónico/contraseña y proveedores OAuth si lo deseas

## 🏃‍♂️ Ejecutando el Proyecto

### Desarrollo
```bash
npm run dev
```

### Construir para Producción
```bash
npm run build
```

### Vista Previa de Producción
```bash
npm run preview
```

## 🗂️ Estructura del Proyecto

```
src/
├── components/       # Componentes reutilizables
│   ├── game/        # Componentes específicos del juego
│   ├── layout/      # Componentes de diseño
│   └── ui/          # Componentes de interfaz de usuario
├── contexts/        # Contextos de React
├── lib/             # Utilidades y configuraciones
├── pages/           # Componentes de páginas
└── types/           # Definiciones de tipos TypeScript
```

## 🔧 Tecnologías Utilizadas

- ⚛️ React 18
- 🔵 TypeScript
- 🎨 Tailwind CSS
- 🔄 React Router
- 🔐 Supabase
- 🎭 Framer Motion (animaciones)
- 🔔 React Hot Toast (notificaciones)
- 🎯 Headless UI (componentes accesibles)

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor, lee nuestras [pautas de contribución](CONTRIBUTING.md) antes de enviar un pull request.

## 📧 Contacto

¿Tienes preguntas o comentarios? ¡No dudes en abrir un issue o contactarme directamente!

---

<div align="center">
  <p>Hecho con ❤️ por Nani</p>
  <p>✨ ¡Diviértete jugando! ✨</p>
</div>
