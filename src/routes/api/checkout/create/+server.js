// @ts-nocheck
// src/routes/api/checkout/create/+server.js
import { json, error } from '@sveltejs/kit';
import DodoPayments from 'dodopayments';
import { adminDb } from '$lib/server/firebaseAdmin';
import admin from 'firebase-admin';
import {
    DODO_PAYMENTS_API_KEY,
    DODO_PAYMENTS_ENV,
    DODO_PRODUCT_ID,
    ORIGIN,
} from '$env/static/private';

const dodo = new DodoPayments({
    bearerToken: DODO_PAYMENTS_API_KEY,
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

    const { uid, email } = decoded;

    // ── 2. Tạo Dodo checkout session ─────────────────────────────────────────
    let session;
    try {
        session = await dodo.checkoutSessions.create({
            product_cart: [{ product_id: DODO_PRODUCT_ID, quantity: 1 }],
            customer: {
                email: email ?? '',
            },
            // Dodo tự append ?payment_id=xxx&status=succeeded vào return_url
            return_url: `${ORIGIN}/`,
            metadata: { userId: uid },
        });
    } catch (err) {
        console.error('[checkout/create] Dodo error:', err);
        throw error(502, 'Failed to create checkout session');
    }

    return json({ checkout_url: session.checkout_url });
}
