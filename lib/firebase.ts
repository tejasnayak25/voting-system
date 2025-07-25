// lib/firebase.ts
import admin from "firebase-admin";

// Replace with the path to your service account key JSON file
let json = {};
let serviceAccount;
if(process.env.FIREBASE_ADMIN) {
    serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN);
} else {
    serviceAccount = json;
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const db = admin.firestore();
export const firestore = admin.firestore;