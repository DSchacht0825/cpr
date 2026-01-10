'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

// Detect iOS Safari
function isIOSSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isWebkit = /WebKit/.test(ua);
  const isChrome = /CriOS/.test(ua);
  return isIOS && isWebkit && !isChrome;
}

// Check if running as installed PWA
function isInstalledPWA(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function initializeFirebase() {
  if (typeof window === 'undefined') return;

  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }

    if (app && 'Notification' in window) {
      messaging = getMessaging(app);
    }
  } catch (error) {
    console.error('Firebase init error:', error);
  }
}

// Request notification permission and get FCM token
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === 'undefined') {
    console.log('Not in browser');
    return null;
  }

  // Check if notifications are supported
  if (!('Notification' in window)) {
    console.log('Notifications not supported in this browser');
    throw new Error('Notifications are not supported in this browser');
  }

  const isiOS = isIOSSafari();
  const isPWA = isInstalledPWA();

  console.log('Device info:', { isiOS, isPWA, userAgent: navigator.userAgent });

  // iOS Safari requires PWA mode for push notifications
  if (isiOS && !isPWA) {
    console.log('iOS detected but not running as PWA');
    throw new Error('On iPhone, please add this app to your Home Screen first, then open it from there to enable notifications.');
  }

  // Check if service worker is supported
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers not supported');
    throw new Error('Service workers are not supported in this browser');
  }

  try {
    // First, request permission using native API
    console.log('Requesting notification permission...');
    const permission = await Notification.requestPermission();
    console.log('Permission result:', permission);

    if (permission !== 'granted') {
      if (permission === 'denied') {
        throw new Error('Notification permission was denied. Please enable notifications in your device settings.');
      }
      throw new Error('Notification permission was not granted.');
    }

    // Register service worker if not already registered
    console.log('Registering service worker...');
    let swRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (!swRegistration) {
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service worker registered:', swRegistration);
    } else {
      console.log('Service worker already registered');
    }

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    console.log('Service worker ready');

    // Initialize Firebase if not already done
    if (!app) {
      initializeFirebase();
    }

    if (!messaging) {
      console.log('Firebase messaging not available');
      // On iOS, we might not get FCM token but native notifications should still work
      if (isiOS) {
        return 'ios-native-' + Date.now(); // Return a placeholder token for iOS
      }
      throw new Error('Firebase messaging could not be initialized');
    }

    // Get FCM token
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    console.log('Getting FCM token with VAPID key:', vapidKey ? 'present' : 'missing');

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration
    });
    console.log('FCM Token received:', token ? 'yes' : 'no');

    if (!token) {
      if (isiOS) {
        return 'ios-native-' + Date.now(); // Return a placeholder token for iOS
      }
      throw new Error('Could not get FCM token');
    }

    return token;
  } catch (error) {
    console.error('Error getting notification permission:', error);
    throw error; // Re-throw to show the user the specific error
  }
}

// Listen for foreground messages
export function onForegroundMessage(callback: (payload: unknown) => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if (!app) {
    initializeFirebase();
  }

  if (!messaging) {
    return () => {};
  }

  return onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    callback(payload);
  });
}
