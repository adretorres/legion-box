importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDv21TtSaK8W5ewTgM9oVgCf7CMoRFSW_o",
  authDomain: "legion-box.firebaseapp.com",
  projectId: "legion-box",
  storageBucket: "legion-box.firebasestorage.app",
  messagingSenderId: "466827904574",
  appId: "1:466827904574:web:abb454a6f79f00517ff36f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: '/img/logo-legion.png',
    badge: '/img/logo-legion.png'
  });
});