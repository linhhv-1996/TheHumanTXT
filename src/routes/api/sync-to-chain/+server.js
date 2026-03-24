import { error, json } from '@sveltejs/kit';
import { ethers } from 'ethers';
import { Receiver } from "@upstash/qstash";
import { PRIVATE_KEY, RPC_URL, CONTRACT_ADDRESS, QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY } from '$env/static/private';
import { adminDb } from '$lib/server/firebaseAdmin';

// ABI: Bản đồ để ethers biết hàm recordThought nằm ở đâu trong contract
const ABI = [
    "function recordThought(string _text, string _why, string _name, string _location, string _link) public"
];

const receiver = new Receiver({
    currentSigningKey: QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: QSTASH_NEXT_SIGNING_KEY,
});

export async function POST({ request }) {
    // 1. Xác thực xem có đúng là QStash gọi không (bảo mật)
    const signature = request.headers.get("upstash-signature");
    const body = await request.text();
    // @ts-ignore
    const isValid = await receiver.verify({ signature, body });
    if (!isValid) throw error(401, "Unauthorized");

    const { text, why, name, location, link, firebaseId } = JSON.parse(body);

    try {
        // 2. Kết nối tới Blockchain bằng Ví của bác
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

        // 3. Thực hiện ghi dữ liệu lên Chain
        console.log(`Đang đẩy Thought ${firebaseId} lên mạng...`);
        const tx = await contract.recordThought(text, why, name, location, link);
        
        // 4. Đợi giao dịch được xác nhận (Mining)
        const receipt = await tx.wait();
        
        console.log("Thành công! Tx Hash:", receipt.hash);

        await adminDb.collection('records').doc(firebaseId).update({
            txHash: receipt.hash,
            status: "mined"
        });

        // (Tùy chọn) Bác có thể dùng Firebase Admin ở đây để update 
        // trạng thái "isOnChain: true" và lưu txHash vào Firebase.

        return json({ success: true, txHash: receipt.hash });
    } catch (err) {
        console.error("Lỗi khi đẩy lên chain:", err);
        throw error(500, "Blockchain transaction failed");
    }
}
