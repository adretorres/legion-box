# Legión Box — App de Gestión

Aplicación web para la gestión interna del centro de entrenamiento CrossFit Legión Box, Formosa Capital.

## Stack
- HTML + CSS + JavaScript Vanilla (ES Modules)
- Firebase Firestore (base de datos)
- Firebase Cloud Messaging (notificaciones push)
- GitHub Pages (hosting)
- Cloudflare DNS

## Estructura del proyecto
legion-box/
├── index.html
├── style.css
├── firebase-messaging-sw.js   # Service Worker para notificaciones push
├── img/
└── js/
├── firebase.js            # Configuración Firebase + estado global + CRUD
├── auth.js                # Login, sesión y cierre de sesión
├── atletas.js             # Gestión de atletas, pagos y vencimientos
├── clases.js              # Programación semanal y publicación de clases
├── ranking.js             # Ranking diario y semanal de resultados
├── competencia.js         # Módulo de competencias y leaderboard público
├── cronometro.js          # Cronómetro con múltiples modos (AMRAP, EMOM, etc)
├── rm.js                  # Calculadora de RM y perfil del atleta
├── notificaciones.js      # Notificaciones push FCM
├── horarios.js            # Gestión de horarios por disciplina
└── main.js                # Orquestador principal + DOMContentLoaded

## Funcionalidades
- Login por rol (Coach / Atleta)
- Gestión de atletas con historial de pagos y control de vencimientos
- Publicación de programación semanal por disciplina
- Ranking diario y semanal con soporte para tiempo, reps y peso
- Calculadora de RM con historial de progreso
- Cronómetro con modos: For Time, AMRAP, EMOM, Tabata, Intervalos y WOD Compuesto
- Módulo de competencias con leaderboard público
- Notificaciones push para atletas
- Gestión de horarios por disciplina
- Exportación de atletas en Excel y PDF

## Desarrollo local
Requiere un servidor local para los ES Modules. Usar Live Server en VS Code o:

npx serve .

## Contacto
Fotheringham 65 - Este · Formosa Capital  
(370) 4818550 · @legion.box