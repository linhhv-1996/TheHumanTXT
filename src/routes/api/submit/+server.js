// @ts-nocheck
// src/routes/api/submit/+server.js
import { json, error } from '@sveltejs/kit';
import { adminDb } from '$lib/server/firebaseAdmin';
import admin from 'firebase-admin';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function POST({ request }) {
    // ── 1. Verify Firebase ID token ──────────────────────────────────────────
    const authHeader = request.headers.get('authorization') ?? '';
    const idToken = authHeader.replace('Bearer ', '').trim();
    if (!idToken) throw error(401, 'Unauthorized');

    let decoded;
    try {
        decoded = await admin.auth().verifyIdToken(idToken);
    } catch {
        throw error(401, 'Invalid or expired token');
    }

    const { uid, email } = decoded;

    // ── 2. Parse + validate body ─────────────────────────────────────────────
    let body;
    try { body = await request.json(); } catch { throw error(400, 'Invalid body'); }

    const { paymentId, text, why, name, location, link } = body;

    if (!paymentId) throw error(400, 'Missing payment_id');
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw error(400, 'Text is required');
    }

    // ── 3. Firestore transaction — atomic ────────────────────────────────────
    const paymentRef  = adminDb.collection('payments').doc(paymentId);
    const counterRef  = adminDb.collection('metadata').doc('stats');
    const newRecordRef = adminDb.collection('records').doc();

    try {
        await adminDb.runTransaction(async (tx) => {
            const paymentDoc = await tx.get(paymentRef);

            // Payment phải tồn tại (đã qua /api/payment/register)
            if (!paymentDoc.exists) {
                throw new Error('PAYMENT_NOT_REGISTERED');
            }

            const paymentData = paymentDoc.data();

            // Đúng user
            if (paymentData.userId !== uid) {
                throw new Error('PAYMENT_USER_MISMATCH');
            }

            // Chưa dùng
            if (paymentData.status === 'used') {
                throw new Error('PAYMENT_ALREADY_USED');
            }

            // Lấy counter
            const counterDoc = await tx.get(counterRef);
            const currentCount = counterDoc.exists ? (counterDoc.data().totalClaimed ?? 0) : 0;
            const newCount = currentCount + 1;
            const now = admin.firestore.FieldValue.serverTimestamp();

            // Ghi record
            tx.set(newRecordRef, {
                text:      text.trim().slice(0, 500),
                why:       (why      ?? '').trim().slice(0, 160),
                name:      (name     ?? '').trim().slice(0, 160),
                location:  (location ?? '').trim().slice(0, 160),
                link:      (link     ?? '').trim().slice(0, 160),
                userId:    uid,
                userEmail: email ?? '',
                createdAt: now,
                sequenceId: newCount,
                txHash:    null,
                status:    'pending',
                paymentId,
            });

            // Đánh dấu payment đã dùng
            tx.update(paymentRef, {
                status:   'used',
                usedAt:   now,
                recordId: newRecordRef.id,
            });

            // Tăng counter
            tx.set(counterRef, { totalClaimed: newCount }, { merge: true });
        });
    } catch (err) {
        if (err.message === 'PAYMENT_NOT_REGISTERED') throw error(402, 'Payment not registered — please go back and try again');
        if (err.message === 'PAYMENT_USER_MISMATCH')  throw error(403, 'Payment does not belong to this user');
        if (err.message === 'PAYMENT_ALREADY_USED')   throw error(409, 'This payment has already been used');
        console.error('[submit] transaction failed:', err);
        throw error(500, 'Failed to save record — your payment is safe, please try again');
    }

    return json({ recordId: newRecordRef.id });
}
