// @ts-nocheck
import { json } from '@sveltejs/kit';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { app } from '$lib/stores/auth';

export async function GET() {
    try {
        // Khởi tạo instance Firestore từ app đã cấu hình trong auth.js
        const db = getFirestore(app);
        
        // Truy vấn vào collection "records"
        const querySnapshot = await getDocs(collection(db, "records"));
        
        const records = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Chỉ lấy các record có tồn tại field code
            if (data.text) {
                records.push(data.text);
            }
        });

        console.log(records);

        // Trả về đúng format như lúc dùng data tĩnh
        return json({
            totalSlots: 5000000,
            claimed: records.length,
            texts: records
        });

    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu thoughts từ Firebase: ", error);
        
        // Trả về mảng rỗng và status 500 nếu lỗi để UI không bị crash
        return json({
            totalSlots: 50000,
            claimed: 0,
            texts: []
        }, { status: 500 });
    }
}
