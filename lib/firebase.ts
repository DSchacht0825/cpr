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

  // Initialize Firebase if not already done
  if (!app) {
    initializeFirebase();
  }

  if (!messaging) {
    console.log('Messaging not available');
    return null;
  }

  try {
    console.log('Requesting notification permission...');
    const permission = await Notification.requestPermission();
    console.log('Permission result:', permission);

    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Get FCM token
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    console.log('Getting FCM token with VAPID key:', vapidKey ? 'present' : 'missing');

    const token = await getToken(messaging, { vapidKey });
    console.log('FCM Token received:', token ? 'yes' : 'no');
    return token;
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
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
