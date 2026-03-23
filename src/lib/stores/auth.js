import { writable } from 'svelte/store';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { 
    PUBLIC_FIREBASE_API_KEY, 
    PUBLIC_FIREBASE_AUTH_DOMAIN, 
    PUBLIC_FIREBASE_PROJECT_ID, 
    PUBLIC_FIREBASE_STORAGE_BUCKET, 
    PUBLIC_FIREBASE_MESSAGING_SENDER_ID, 
    PUBLIC_FIREBASE_APP_ID, 
    PUBLIC_FIREBASE_MEASUREMENT_ID 
} from '$env/static/public';

// Cập nhật lại key tương ứng
const firebaseConfig = {
    apiKey: PUBLIC_FIREBASE_API_KEY,
    authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: PUBLIC_FIREBASE_APP_ID,
    measurementId: PUBLIC_FIREBASE_MEASUREMENT_ID
};


// Khởi tạo
export const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Store lưu trữ trạng thái user
export const authStore = writable({
    user: null,
    loading: true
});

// Lắng nghe thay đổi trạng thái đăng nhập
onAuthStateChanged(auth, (user) => {
    // @ts-ignore
    authStore.set({ user, loading: false });
});

// Hàm Login
export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        throw error;
    }
};

// Hàm Logout
export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Lỗi đăng xuất:", error);
    }
};
