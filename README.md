# FinPulse

Una plataforma moderna de gestión financiera e integración CRM que conecta Salesforce con una base de datos en tiempo real, permitiendo a los equipos de ventas acceder a información financiera consolidada y automatizar procesos comerciales.

## Características Principales

- **Autenticación M2M con Salesforce**: Integración segura usando OAuth 2.0 Client Credentials
- **Base de datos en tiempo real**: Supabase (PostgreSQL) para persistencia y escalabilidad
- **Chat en tiempo real**: Sistema de chat integrado para comunicación entre usuarios
- **Gestión de usuarios**: Registro, autenticación y administración de cuentas
- **APIs REST**: Endpoints bien documentados para operaciones CRUD
- **Interfaz moderna**: Frontend responsive con HTML5, CSS3 y JavaScript vanilla

## Tecnologías Utilizadas

### Backend
- **Node.js**: Runtime de JavaScript para servidor
- **Express.js** (v5.2.1): Framework web minimalista y flexible
- **Supabase** (v2.106.2): Backend as a Service basado en PostgreSQL
- **OAuth 2.0**: Autenticación M2M con Salesforce

### Frontend
- **HTML5**: Marcado semántico
- **CSS3**: Estilos responsive
- **JavaScript (Vanilla)**: Lógica del cliente sin dependencias externas

### Herramientas de Desarrollo
- **dotenv**: Gestión de variables de entorno
- **npm**: Gestor de paquetes

## Estructura del Proyecto

```
FinPulse/
├── server.js                 # Servidor Express principal
├── supabase.js              # Configuración del cliente Supabase
├── admin-provision.js       # Scripts de aprovisionamiento de admin
├── register-user.js         # Lógica de registro de usuarios
├── test-connection.js       # Pruebas de conexión a Supabase
├── test-login.js            # Pruebas de autenticación
├── test-sf-auth.js          # Pruebas de autenticación con Salesforce
├── package.json             # Dependencias del proyecto
├── index.html               # Página principal
├── public/                  # Activos estáticos
│   ├── app.js              # Lógica de aplicación del frontend
│   ├── chat.js             # Sistema de chat
│   ├── chat.html           # Interfaz del chat
│   ├── index.html          # Dashboard principal
│   └── styles.css          # Estilos globales
└── README.md               # Este archivo
```

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENTE (Frontend)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Browser (HTML5, CSS3, JavaScript)                      │  │
│  │  - Dashboard                                            │  │
│  │  - Chat en tiempo real                                  │  │
│  │  - Autenticación de usuario                             │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬──────────────────────────────────────┘
                             │ HTTP/REST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  SERVIDOR (Backend - Node.js)                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Express.js Server (Puerto 3000)                        │  │
│  │  - Autenticación M2M Salesforce (OAuth 2.0)            │  │
│  │  - Gestión de sesiones                                  │  │
│  │  - Caché de tokens                                      │  │
│  │  - Enrutamiento de APIs                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────┬─────────────────────────────────────────┬──────────────┘
         │                                         │
         │ OAuth                                   │ SDK Supabase
         ▼                                         ▼
┌──────────────────────┐              ┌──────────────────────────┐
│  Salesforce API      │              │  Supabase / PostgreSQL   │
│  - Datos CRM         │              │  - Usuarios              │
│  - Configuración     │              │  - Sesiones              │
└──────────────────────┘              │  - Datos financieros     │
                                      └──────────────────────────┘
```

### Flujo de Autenticación

1. **Inicio de sesión**: Usuario proporciona credenciales
2. **Validación en Supabase**: Verificación contra la base de datos
3. **Token M2M**: Sistema obtiene token de Salesforce para operaciones backend
4. **Sesión activa**: Usuario accede a resources protegidas
5. **Sincronización**: Datos se sincronizan entre Salesforce y Supabase

## Instalación

### Requisitos Previos
- Node.js (v14 o superior)
- npm (v6 o superior)
- Cuenta en Supabase
- Cuenta en Salesforce Developer

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/finpulse.git
cd finpulse
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
Crear archivo `.env` en la raíz del proyecto:
```env
# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-clave-anonima

# Salesforce OAuth M2M
SF_LOGIN_URL=https://login.salesforce.com
SF_CLIENT_ID=tu-client-id
SF_CLIENT_SECRET=tu-client-secret

# Configuración del servidor
PORT=3000
NODE_ENV=development
```

4. **Ejecutar el servidor**
```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

## Configuración

### Variables de Entorno Requeridas

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `SUPABASE_URL` | URL de tu proyecto Supabase | `https://abc123.supabase.co` |
| `SUPABASE_ANON_KEY` | Clave de acceso anónimo | `...` |
| `SF_LOGIN_URL` | URL de login de Salesforce | `https://login.salesforce.com` |
| `SF_CLIENT_ID` | Client ID de app Salesforce | `...` |
| `SF_CLIENT_SECRET` | Client Secret de app Salesforce | `abc123...` |
| `PORT` | Puerto del servidor | `3000` |

## Uso

### Scripts Disponibles

```bash
# Iniciar servidor de desarrollo
npm start

# Ejecutar pruebas de conexión
node test-connection.js

# Verificar autenticación con Salesforce
node test-sf-auth.js

# Probar login
node test-login.js

# Provisionar admin
node admin-provision.js
```

### Endpoints API Principales

- `GET /` - Página principal
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/chat/message` - Enviar mensaje de chat
- `GET /api/chat/history` - Obtener historial de chat

## Base de Datos

### Esquema Principal (Supabase/PostgreSQL)

```sql
-- Usuarios
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sesiones
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Mensajes de Chat
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Testing

Para verificar que todo está funcionando correctamente:

```bash
# Conectividad a Supabase
node test-connection.js

# Autenticación M2M de Salesforce
node test-sf-auth.js

# Funcionalidad de login
node test-login.js
```

## Documentación API

### Registrar Usuario
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secure123"}'
```

### Iniciar Sesión
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secure123"}'
```

### Enviar Mensaje de Chat
```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"message":"Hola, ¿cómo estás?"}'
```

## Seguridad

- **Variables de entorno**: No versionas archivos `.env`
- **OAuth 2.0**: Autenticación M2M segura con Salesforce
- **Tokens**: Los tokens se cachean pero se regeneran automáticamente
- **HTTPS**: Se recomienda usar HTTPS en producción
- **Validación**: Todo input se valida antes de procesarse

## Deployment

### Heroku
```bash
heroku create finpulse
git push heroku main
heroku config:set SUPABASE_URL="..."
heroku config:set SUPABASE_ANON_KEY="..."
```

### AWS/Railway/Vercel
Se pueden usar variables de entorno en cada plataforma.

## Troubleshooting

### Error: "SUPABASE_URL o SUPABASE_ANON_KEY no definidas"
Verifica que el archivo `.env` existe y contiene las variables correctas.

### Error: "Fallo de autorización M2M"
Verifica que las credenciales de Salesforce (CLIENT_ID, CLIENT_SECRET) son correctas y que el usuario tiene permisos M2M.

### Puerto ya en uso
Cambia el puerto en `.env` o usa un puerto diferente:
```bash
PORT=3001 npm start
```

## Licencia

Este proyecto está licenciado bajo la Licencia ISC.

## Contribuidores

Las contribuciones son bienvenidas. Por favor:
1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📧 Contacto

Para preguntas o sugerencias, abre un issue en el repositorio.

---

**FinPulse** - Conectando finanzas y CRM en tiempo real
