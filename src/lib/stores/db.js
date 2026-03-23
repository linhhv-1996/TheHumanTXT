// @ts-nocheck

// src/lib/stores/db.js
import { collection, getFirestore, serverTimestamp, doc, getDoc, runTransaction, query, where, getDocs, onSnapshot, updateDoc, orderBy, limit, startAfter } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from './auth';

const db = getFirestore(app);
const auth = getAuth(app);

export const saveRecordToFirebase = async (data) => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Please Login.");

        const safeTxt = data.text ? String(data.text).trim().slice(0, 500) : "";
        if (!safeTxt) throw new Error("Text is required.");

        const safeWhy = data.why ? String(data.why).trim().slice(0, 160) : "";
        const safeName = data.name ? String(data.name).trim().slice(0, 160) : "";
        const safeLocation = data.location ? String(data.location).trim().slice(0, 160) : "";
        const safeLink = data.link ? String(data.link).trim().slice(0, 160) : "";

        // Ref tới document lưu biến đếm tổng (tạo collection metadata, doc stats)
        const counterRef = doc(db, "metadata", "stats");
        // Ref tạo sẵn cho thought mới (để lấy được ID)
        const newRecordRef = doc(collection(db, "records"));

        // Chạy Transaction
        await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            let currentCount = 0;
            
            if (counterDoc.exists()) {
                currentCount = counterDoc.data().totalClaimed || 0;
            }

            const newCount = currentCount + 1;

            // 1. Cập nhật lại biến đếm tổng
            transaction.set(counterRef, { totalClaimed: newCount }, { merge: true });

            // 2. Lưu thought với sequenceId (thứ tự)
            const payload = {
                text: safeTxt,
                why: safeWhy,
                name: safeName,
                location: safeLocation,
                link: safeLink,
                userId: user.uid,
                userEmail: user.email,
                createdAt: serverTimestamp(),
                sequenceId: newCount,
                txHash: null,
                status: "pending"
            };

            transaction.set(newRecordRef, payload);
        });

        // Trả về Doc ID (dạng hash như cũ) để đẩy sang trang detail
        return newRecordRef.id; 
    } catch (error) {
        console.error("Lỗi khi lưu dữ liệu lên Firebase: ", error);
        throw error; // Quăng lỗi ra cho UI xử lý
    }
};


// THÊM HÀM NÀY ĐỂ FETCH THOUGHT THEO ID
export const getRecordFromFirebase = async (id) => {
    try {
        const docRef = doc(db, "records", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            return null;
        }
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu từ Firebase: ", error);
        throw error;
    }
};


export const getUserRecords = async (uid) => {
    try {
        const q = query(collection(db, "records"), where("userId", "==", uid));
        const querySnapshot = await getDocs(q);
        const records = [];
        querySnapshot.forEach((doc) => {
            records.push({ id: doc.id, ...doc.data() });
        });
        return records.sort((a, b) => b.sequenceId - a.sequenceId);
    } catch (error) {
        console.error("Lỗi lấy danh sách records của user:", error);
        return [];
    }
};


export const updateRecordTxHash = async (id, txHash) => {
    try {
        const docRef = doc(db, "records", id);
        await updateDoc(docRef, {
            txHash: txHash,
            status: "mined"
        });
    } catch (error) {
        console.error("Lỗi update txHash:", error);
        throw error;
    }
};

// 3. THÊM HÀM LẮNG NGHE REALTIME (Cho màn Detail)
export const subscribeToRecord = (id, callback) => {
    const docRef = doc(db, "records", id);
    // onSnapshot tự động kích hoạt callback mỗi khi document thay đổi
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() });
        } else {
            callback(null);
        }
    });
    return unsubscribe;
};


// ── Travel: lấy toàn bộ records theo thứ tự, lazy batch ─────────────────────
/**
 * @param {number} batchSize  - số lượng mỗi lần fetch (default 50)
 * @param {any}    lastSnap   - document snapshot cuối của batch trước (Firestore cursor)
 * @returns {{ records: Array, lastDoc: any, hasMore: boolean }}
 */
export const getAllRecords = async (batchSize = 50, lastSnap = null) => {
    try {
        let q;
        if (lastSnap) {
            q = query(
                collection(db, "records"),
                orderBy("sequenceId", "asc"),
                startAfter(lastSnap),
                limit(batchSize)
            );
        } else {
            q = query(
                collection(db, "records"),
                orderBy("sequenceId", "asc"),
                limit(batchSize)
            );
        }

        const snap = await getDocs(q);
        const records = [];
        snap.forEach(d => records.push({ id: d.id, ...d.data() }));

        const lastDoc = snap.docs[snap.docs.length - 1] ?? null;

        return {
            records,
            lastDoc,                            // truyền lại làm cursor lần sau
            hasMore: snap.docs.length === batchSize
        };
    } catch (error) {
        console.error("Lỗi lấy toàn bộ records:", error);
        return { records: [], lastDoc: null, hasMore: false };
    }
};

