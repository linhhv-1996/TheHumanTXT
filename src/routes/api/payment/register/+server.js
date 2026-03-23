// src/routes/api/payment/register/+server.js
import { json, error } from '@sveltejs/kit';
import DodoPayments from 'dodopayments';
import { adminDb } from '$lib/server/firebaseAdmin';
import admin from 'firebase-admin';
import {
    DODO_PAYMENTS_API_KEY,
    DODO_PAYMENTS_ENV,
    DODO_PRODUCT_ID,
} from '$env/static/private';

const dodo = new DodoPayments({
    bearerToken: DODO_PAYMENTS_API_KEY,
    // @ts-ignore
    environment: DODO_PAYMENTS_ENV,
});

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

    const { uid } = decoded;

    // ── 2. Parse body ────────────────────────────────────────────────────────
    let body;
    try { body = await request.json(); } catch { throw error(400, 'Invalid body'); }

    const { paymentId } = body;
    if (!paymentId || typeof paymentId !== 'string') throw error(400, 'Missing payment_id');

    // ── 3. Idempotent check — payment đã register rồi thì trả về luôn ────────
    const paymentRef = adminDb.collection('payments').doc(paymentId);
    const existing = await paymentRef.get();

    if (existing.exists) {
        const data = existing.data();
        // Nếu payment này của đúng user và chưa dùng → OK, cho submit tiếp
        // @ts-ignore
        if (data.userId !== uid) throw error(403, 'Payment does not belong to this user');
        // @ts-ignore
        if (data.status === 'used') throw error(409, 'Payment already used');
        // status === 'paid_pending_submission' → trả về OK để user submit tiếp
        return json({ ok: true });
    }

    // ── 4. Verify payment với Dodo ────────────────────────────────────────────
    let payment;
    try {
        payment = await dodo.payments.retrieve(paymentId);
    } catch {
        throw error(400, 'Invalid payment_id');
    }

    if (payment.status !== 'succeeded') {
        throw error(400, `Payment not succeeded (status: ${payment.status})`);
    }

    // Đúng product
    const productMatch = payment.product_cart?.some(i => i.product_id === DODO_PRODUCT_ID);
    if (!productMatch) throw error(400, 'Payment product mismatch');

    // Đúng user — A mua, B không dùng được
    if (payment.metadata?.userId !== uid) {
        throw error(403, 'Payment does not belong to this user');
    }

    // ── 5. Lưu vào Firestore — đánh dấu đã verify, chờ submit ────────────────
    await paymentRef.set({
        userId:    uid,
        status:    'paid_pending_submission',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return json({ ok: true });
}
