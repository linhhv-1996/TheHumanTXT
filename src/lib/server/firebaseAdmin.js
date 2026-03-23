// src/lib/server/firebaseAdmin.js
import admin from 'firebase-admin';
import { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } from '$env/static/private';

// Kiểm tra xem admin đã khởi tạo chưa (tránh lỗi khởi tạo nhiều lần khi dùng hot-reload ở localhost)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: FIREBASE_PROJECT_ID,
            clientEmail: FIREBASE_CLIENT_EMAIL,
            privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        })
    });
}

export const adminDb = admin.firestore();
