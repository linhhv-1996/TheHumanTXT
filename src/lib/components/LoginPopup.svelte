<script>
    import { createEventDispatcher } from 'svelte';
    import { fade, fly } from 'svelte/transition'; // Thêm transition ở đây
    import { loginWithGoogle } from '$lib/stores/auth';

    const dispatch = createEventDispatcher();
    let isLoggingIn = false;

    async function handleLogin() {
        isLoggingIn = true;
        try {
            await loginWithGoogle();
            dispatch('success');
        } catch (error) {
            alert("Đăng nhập thất bại, vui lòng thử lại.");
        } finally {
            isLoggingIn = false;
        }
    }

    function close() {
        dispatch('close');
    }
</script>

<div id="login-overlay" transition:fade={{ duration: 200 }}>
    <button id="login-backdrop" on:click={close} aria-label="Close"></button>
    
    <div id="login-box" in:fly={{ y: 20, duration: 300 }} out:fade={{ duration: 150 }}>
        <span class="login-label">Authentication</span>
        <h2 class="login-title">Identify Yourself</h2>
        <p class="login-desc">You must be recognized to leave a mark.</p>
        
        <div class="login-actions">
            <button class="btn-main" on:click={handleLogin} disabled={isLoggingIn}>
                {isLoggingIn ? 'AUTHENTICATING...' : 'LOGIN WITH GOOGLE'}
            </button>
            <button class="btn-ghost" on:click={close}>
                CANCEL
            </button>
        </div>
    </div>
</div>

