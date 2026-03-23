import { json } from '@sveltejs/kit';
import { Client } from "@upstash/qstash";
import { QSTASH_TOKEN } from '$env/static/private';

const client = new Client({ baseUrl: "https://qstash-us-east-1.upstash.io", token: QSTASH_TOKEN });

export async function POST({ request, url }) {
    try {
        const payload = await request.json();
        
        const origin = url.origin.includes('localhost') 
            ? 'https://thehumantxt.com/' 
            : url.origin;

        // Webhook URL để QStash gọi ngược lại sau khi queue
        const webhookUrl = `${origin}/api/sync-to-chain`;

        // Dùng SDK chuẩn của nó
        const result = await client.publishJSON({
            url: webhookUrl,
            body: payload,
        });

        console.log("QStash Message ID:", result.messageId);
        return json({ success: true, messageId: result.messageId });
        
    } catch (error) {
        console.error("Lỗi khi đẩy sang QStash:", error);
        // @ts-ignore
        return json({ success: false, error: error.message }, { status: 500 });
    }
}
