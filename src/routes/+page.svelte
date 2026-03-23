<script>
    // @ts-nocheck

    import { onMount, onDestroy } from "svelte";
    import { fade } from "svelte/transition";
    import { authStore, logout, app } from "$lib/stores/auth";
    import LoginPopup from "$lib/components/LoginPopup.svelte";
    import { getUserRecords, getAllRecords } from "$lib/stores/db";
    import { goto } from "$app/navigation";
    import { NebulaEngine, DetailEngine } from "$lib/nebula";
    import { getAuth } from "firebase/auth";

    const firebaseAuth = getAuth(app);

    function formatDate(createdAt) {
        if (!createdAt) return '';
        const ms = createdAt.toMillis ? createdAt.toMillis() : Date.now();
        return new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    // ─── props & base state ───────────────────────────────────────────────────
    let { data } = $props();
    let activePanel       = $state("hero");
    let showManifest      = $state(false);
    let showLoginPopup    = $state(false);
    let isSubmitting      = $state(false);
    let isRedirecting     = $state(false); // đang redirect sang Dodo
    let isRegistering     = $state(false); // đang verify payment sau khi redirect về
    let txtInput          = $state("");
    let whyInput          = $state("");
    let fieldName         = $state("");
    let fieldLocation     = $state("");
    let fieldLink         = $state("");
    let hasTxtError       = $state(false);
    let isCheckingRecords = $state(false);
    let codeCharsLeft     = $derived(500 - txtInput.length);
    let whyCharsLeft      = $derived(160 - whyInput.length);
    let claimed           = $state(data.dbData.claimed);

    // payment_id đã verify — có rồi mới cho mở popup submit
    let pendingPaymentId  = $state("");
    let registerError     = $state(""); // lỗi khi verify payment

    let canvasEl;
    let engine;
    let mouseX = $state(0);
    let mouseY = $state(0);
    let animationId;

    // ─── Travel state ─────────────────────────────────────────────────────────
    let travelMode     = $state(false);
    let travelRecords  = $state([]);
    let travelIndex    = $state(0);
    let travelLoading  = $state(false);
    let travelFlying   = $state(false);
    let travelCard     = $state(false);
    let travelLastDoc  = $state(null);
    let travelHasMore  = $state(true);
    let youLabelStyle  = $state('');
    let showYouLabel   = $state(false);

    let currentCommit = $derived(travelRecords[travelIndex] ?? null);

    // ─── Home loop ────────────────────────────────────────────────────────────
    function startHomeLoop() {
        const loop = () => {
            if (!engine || engine._isDetail) return;
            const isPaused = activePanel !== "hero" || showManifest || showLoginPopup;
            engine.update(mouseX, mouseY, isPaused);
            animationId = requestAnimationFrame(loop);
        };
        animationId = requestAnimationFrame(loop);
    }

    onMount(async () => {
        mouseX = window.innerWidth  / 2;
        mouseY = window.innerHeight / 2;
        engine = new NebulaEngine(canvasEl, { count: 150, texts: data.dbData.texts });
        engine._isDetail = false;
        startHomeLoop();

        // ── Detect redirect về từ Dodo ────────────────────────────────────
        const params    = new URLSearchParams(window.location.search);
        const status    = params.get('status');
        const paymentId = params.get('payment_id');

        if (status === 'succeeded' && paymentId) {
            history.replaceState({}, '', window.location.pathname);
            await registerPayment(paymentId);
            return;
        }

        // ── Watch auth — login/logout xong update pendingPaymentId ngay ────
        authStore.subscribe(s => {
            if (s.loading) return;
            if (s.user) {
                const saved = localStorage.getItem('pendingPaymentId');
                pendingPaymentId = saved ?? "";
            } else {
                // Logout → reset state nhưng GIỮ localStorage
                // (user login lại vẫn còn payment)
                pendingPaymentId = "";
            }
        });
    });

    // Verify payment với server, lưu vào Firestore, mở popup submit
    async function registerPayment(paymentId) {
        isRegistering = true;
        registerError = "";

        // Chờ auth load xong (trường hợp onMount chạy trước onAuthStateChanged)
        await waitForAuth();

        if (!$authStore.user) {
            // Chưa login — lưu paymentId vào sessionStorage để xử lý sau khi login
            sessionStorage.setItem('pendingPaymentId', paymentId);
            showLoginPopup = true;
            isRegistering = false;
            return;
        }

        try {
            const idToken = await firebaseAuth.currentUser.getIdToken(true);
            const res = await fetch('/api/payment/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({ paymentId }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                // Payment đã dùng rồi → đưa về trang record luôn nếu có
                if (res.status === 409) {
                    // Tìm record của user để redirect
                    const myRecords = await getUserRecords($authStore.user.uid);
                    if (myRecords.length > 0) {
                        goto(`/record/${myRecords[0].id}`);
                        return;
                    }
                }
                throw new Error(err.message ?? 'Payment verification failed');
            }

            // Payment hợp lệ → lưu localStorage + state, mở popup submit luôn
            localStorage.setItem('pendingPaymentId', paymentId);
            pendingPaymentId = paymentId;
            activePanel      = 'submit';
            hasTxtError      = false;
        } catch (err) {
            registerError = err.message;
        } finally {
            isRegistering = false;
        }
    }

    // Chờ Firebase auth load xong (max 3s)
    function waitForAuth() {
        return new Promise((resolve) => {
            if (!$authStore.loading) { resolve(); return; }
            const unsub = authStore.subscribe(s => {
                if (!s.loading) { unsub(); resolve(); }
            });
            setTimeout(resolve, 3000); // fallback
        });
    }

    onDestroy(() => {
        if (animationId) cancelAnimationFrame(animationId);
        engine?.stop?.();
    });

    function handleMouseMove(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (travelMode && engine?._isDetail) engine.setMouse(e.clientX, e.clientY);
    }

    // ─── Swap engines ─────────────────────────────────────────────────────────
    function mountDetailEngine(commit) {
        if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
        engine?.stop?.();
        const de = new DetailEngine(canvasEl, { texts: data.dbData.texts });
        de._isDetail = true;
        de.onHideLanding = () => {};
        de.onShowDetail  = () => { travelFlying = false; travelCard = true; };
        de.onLabelUpdate = (style, show) => { youLabelStyle = style; showYouLabel = show; };
        de.init(commit.id, commit.code || commit.text || '');
        de.start();
        engine = de;
    }

    function mountHomeEngine() {
        if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
        engine?.stop?.();
        const ne = new NebulaEngine(canvasEl, { count: 100, texts: data.dbData.texts });
        ne._isDetail = false;
        engine = ne;
        startHomeLoop();
    }

    // ─── Travel ───────────────────────────────────────────────────────────────
    async function enterTravel() {
        travelMode    = true;
        travelIndex   = 0;
        travelRecords = [];
        travelLastDoc = null;
        travelHasMore = true;
        travelCard    = false;
        travelFlying  = true;
        showYouLabel  = false;
        await fetchMoreRecords();
        if (travelRecords.length > 0) mountDetailEngine(travelRecords[0]);
    }

    function exitTravel() {
        travelMode   = false;
        travelCard   = false;
        travelFlying = false;
        showYouLabel = false;
        mountHomeEngine();
    }

    async function fetchMoreRecords() {
        if (travelLoading || !travelHasMore) return;
        travelLoading = true;
        const { records, lastDoc, hasMore } = await getAllRecords(50, travelLastDoc);
        travelRecords = [...travelRecords, ...records];
        travelLastDoc = lastDoc;
        travelHasMore = hasMore;
        travelLoading = false;
    }

    async function travelNext() {
        if (travelFlying) return;
        const nextIdx = travelIndex + 1;
        if (nextIdx >= travelRecords.length - 10 && travelHasMore) fetchMoreRecords();
        if (nextIdx >= travelRecords.length) {
            if (!travelHasMore) return;
            await fetchMoreRecords();
            if (nextIdx >= travelRecords.length) return;
        }
        travelIndex  = nextIdx;
        travelCard   = false;
        travelFlying = true;
        showYouLabel = false;
        mountDetailEngine(travelRecords[travelIndex]);
    }

    async function travelPrev() {
        if (travelFlying || travelIndex === 0) return;
        travelIndex--;
        travelCard   = false;
        travelFlying = true;
        showYouLabel = false;
        mountDetailEngine(travelRecords[travelIndex]);
    }

    // ─── Checkout: redirect sang Dodo ─────────────────────────────────────────
    async function handleLeaveAction() {
        if (!$authStore.user) { showLoginPopup = true; return; }

        // Đã mua rồi chưa submit → mở popup submit luôn
        if (pendingPaymentId) {
            activePanel = 'submit';
            hasTxtError = false;
            return;
        }

        isRedirecting = true;
        try {
            const idToken = await firebaseAuth.currentUser.getIdToken(true);
            const res = await fetch('/api/checkout/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message ?? 'Could not start checkout');
            }

            const { checkout_url } = await res.json();
            window.location.href = checkout_url;
        } catch (err) {
            alert('Error: ' + err.message);
            isRedirecting = false;
        }
    }

    function onLoginSuccess() {
        showLoginPopup = false;

        // Nếu có pendingPaymentId trong sessionStorage (user chưa login lúc redirect về)
        const storedPaymentId = sessionStorage.getItem('pendingPaymentId');
        if (storedPaymentId) {
            sessionStorage.removeItem('pendingPaymentId');
            registerPayment(storedPaymentId);
        }
    }

    // ─── Submit form sau khi đã có payment ────────────────────────────────────
    async function processSubmission() {
        const raw = txtInput.trim();
        if (!raw || raw.length > 500) { hasTxtError = true; return; }

        isSubmitting = true;
        try {
            const idToken = await firebaseAuth.currentUser.getIdToken(true);
            const res = await fetch('/api/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    paymentId: pendingPaymentId,
                    text:      raw,
                    why:       whyInput.trim().slice(0, 160),
                    name:      fieldName.trim().slice(0, 160),
                    location:  fieldLocation.trim().slice(0, 160),
                    link:      fieldLink.trim().slice(0, 160),
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message ?? 'Submit failed');
            }

            const { recordId } = await res.json();
            localStorage.removeItem('pendingPaymentId');

            /// GỌI QSTASH
            try {
                await fetch('/api/publish-qstash', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        firebaseId: recordId,
                        text: raw,
                        why: whyInput.trim().slice(0, 160),
                        name: fieldName.trim().slice(0, 160),
                        location: fieldLocation.trim().slice(0, 160),
                        link: fieldLink.trim().slice(0, 160)
                    })
                });
            } catch (qErr) {
                console.error('Lỗi khi đẩy message sang QStash:', qErr);
            }

            goto(`/record/${recordId}`);
        } catch (err) {
            // Lỗi submit — tiền vẫn còn đó, payment vẫn pending → user thử lại được
            alert('Something went wrong — your payment is safe.\n\n' + err.message);
            isSubmitting = false;
        }
    }

    async function handleViewMySubmission() {
        if (!$authStore.user) { showLoginPopup = true; return; }
        isCheckingRecords = true;
        const myThoughts = await getUserRecords($authStore.user.uid);
        isCheckingRecords = false;
        if (myThoughts.length === 0) {
            activePanel = "submit";
        } else if (myThoughts.length === 1) {
            goto(`/record/${myThoughts[0].id}`);
        } else {
            travelMode    = true;
            travelIndex   = 0;
            travelRecords = myThoughts;
            travelLastDoc = null;
            travelHasMore = false;
            travelCard    = false;
            travelFlying  = true;
            showYouLabel  = false;
            mountDetailEngine(myThoughts[0]);
        }
    }
</script>

<svelte:window
    on:resize={() => engine?.resize?.()}
    on:mousemove={handleMouseMove}
    onkeydown={(e) => {
        if (travelMode) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') travelNext();
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') travelPrev();
            else if (e.key === 'Escape') exitTravel();
            return;
        }
        if (e.key === 'Escape') {
            if (isSubmitting || isRegistering) return;
            if (showManifest)   { showManifest   = false; return; }
            if (showLoginPopup) { showLoginPopup = false; return; }
            if (activePanel === 'submit' && pendingPaymentId) return; // đừng đóng khi đang chờ submit
        }
    }}
/>

{#if showLoginPopup}
    <LoginPopup on:close={() => (showLoginPopup = false)} on:success={onLoginSuccess} />
{/if}

<canvas bind:this={canvasEl} id="canvas"></canvas>

{#if travelMode}
    <div id="you-label" style="{youLabelStyle}" class:show={showYouLabel}>— the thought</div>
{/if}

<!-- TOP BAR & FOOTER -->
{#if !travelMode}
    <div id="top-bar" transition:fade={{ duration: 300 }}>
        <button id="manifest-link" onclick={() => (showManifest = true)}>Manifest</button>
        <div class="top-bar-auth">
            {#if $authStore.user}
                <button
                    class="auth-btn auth-btn--submission"
                    onclick={handleViewMySubmission}
                    disabled={isCheckingRecords}
                >{isCheckingRecords ? "LOCATING..." : "YOUR SUBMISSION"}</button>
                <div class="auth-row">
                    <span class="auth-email">{$authStore.user.email}</span>
                    <span class="auth-sep">·</span>
                    <button class="auth-btn" onclick={logout}>logout</button>
                </div>
            {:else}
                <button class="auth-btn" onclick={() => (showLoginPopup = true)}>login</button>
            {/if}
        </div>
    </div>
    <div id="footer-links" transition:fade={{ duration: 300 }}>
        <a class="footer-link" target="_blank" href="/privacy">Privacy Policy</a>
        <a class="footer-link" target="_blank" href="/terms">Terms of Service</a>
        <a class="footer-link" target="_blank" href="https://x.com/hlinhbuilds">X(Twitter)</a>
        <a class="footer-link" target="_blank" rel="noopener noreferrer" href="https://arbiscan.io/address/0xDIA_CHI_CONTRACT_CUA_MAY#readContract">Verify on-chain ↗</a>
    </div>
{/if}

<!-- MANIFEST -->
{#if showManifest}
    <div id="manifest-overlay" transition:fade={{ duration: 200 }}>
        <button id="manifest-backdrop" onclick={() => (showManifest = false)} aria-label="Close"></button>
        <div id="manifest-box">
            <p class="manifest-label">The Human TXT &nbsp;·&nbsp; 2026</p>
            <h2 class="manifest-title">Why this exists.</h2>
            <div class="manifest-body">
                <p>AI is writing more words every day. Trained on yours. Sounding like you. Thinking like you.</p>
                <p><strong>500 characters. Five dollars. One permanent record</strong> — on-chain, timestamped, owned by no one. Not even us.</p>
                <p>No algorithm decides if it gets seen. No platform can delete it. No feed buries it. You wrote something real. It stays. Long after the models forget where they learned everything.</p>
                <p>You were here.</p>
            </div>
            <div class="manifest-footer">
                <button class="manifest-close" onclick={() => (showManifest = false)}>close</button>
            </div>
        </div>
    </div>
{/if}

<!-- HERO -->
{#if activePanel === "hero" && !travelMode}
    <div class="hero" transition:fade={{ duration: 500 }}>
        <p class="hero-eyebrow">AI is writing more words every day. Yours was human.</p>
        <h1 class="hero-title">Before AI forgets<br />where it learned<br />everything.</h1>
        <p class="hero-whisper">What you'd want AI to learn from you — not the other way around.</p>
        <div class="hero-actions">
            <button class="btn-main" onclick={handleLeaveAction} disabled={isRedirecting}>
                {#if isRedirecting}
                    Redirecting...
                {:else if pendingPaymentId}
                    Leave your mark →
                {:else}
                    Leave your mark — $5
                {/if}
            </button>
            <button class="btn-explore" onclick={enterTravel}>
                Explore →
            </button>
        </div>
        <p class="hero-note">{claimed} records &nbsp;·&nbsp; On-chain forever.</p>
    </div>
{/if}



<!-- VERIFYING PAYMENT — overlay nhẹ, không block canvas -->
{#if isRegistering}
    <div class="payment-verifying" transition:fade={{ duration: 200 }}>
        <p>Verifying payment…</p>
    </div>
{/if}

<!-- REGISTER ERROR — thanh toán xong nhưng verify thất bại -->
{#if registerError && !isRegistering}
    <div class="payment-error" transition:fade={{ duration: 200 }}>
        <p>⚠️ {registerError}</p>
        <p class="payment-error-sub">Your payment is safe. <a href="/cdn-cgi/l/email-protection#7f0c0a0f0f100d0b3f06100a0d1b10121e1611511c1012">Contact support</a> with your payment ID.</p>
        <button onclick={() => (registerError = "")}>Dismiss</button>
    </div>
{/if}

<!-- SUBMIT PANEL — chỉ mở khi đã có pendingPaymentId -->
{#if activePanel === "submit" && !travelMode && pendingPaymentId}
    <div class="submit-panel active" transition:fade>
        <p class="submit-label">Entry #{claimed + 1} &nbsp;·&nbsp; payment confirmed ✓</p>
        <div style="width:100%;position:relative;">
            <textarea
                class:error={hasTxtError}
                bind:value={txtInput}
                placeholder="Write something real. A thought, a moment, an opinion. Something only you could write."
                maxlength="500" rows="6"
                style="font-size:13px;resize:vertical;"
                oninput={() => (hasTxtError = false)}
                disabled={isSubmitting}
            ></textarea>
            <p class="char-counter {codeCharsLeft <= 50 ? 'danger' : ''}">{codeCharsLeft}</p>
        </div>
        <div style="width:100%;position:relative;margin-top:8px;">
            <input
                class="field-input"
                bind:value={whyInput}
                placeholder="Why did you write this? (optional)"
                maxlength="160" style="width:100%;"
                disabled={isSubmitting}
            />
            <p class="char-counter {whyCharsLeft <= 15 ? 'danger' : ''}">{whyCharsLeft}</p>
        </div>
        <div class="fields-row">
            <div class="field-group">
                <span class="field-label">Name</span>
                <input class="field-input" bind:value={fieldName} placeholder="anonymous" maxlength="160" disabled={isSubmitting} />
            </div>
            <div class="field-group">
                <span class="field-label">Location</span>
                <input class="field-input" bind:value={fieldLocation} placeholder="somewhere" maxlength="160" disabled={isSubmitting} />
            </div>
            <div class="field-group full-width">
                <span class="field-label">X / Link</span>
                <input class="field-input" bind:value={fieldLink} placeholder="@handle or https://..." maxlength="160" disabled={isSubmitting} />
            </div>
        </div>
        <div class="submit-footer">
            <button class="btn-back" onclick={() => (activePanel = 'hero')} disabled={isSubmitting}>← back</button>
            <button class="btn-main" onclick={processSubmission} disabled={isSubmitting}>
                {isSubmitting ? "SAVING..." : "Submit your mark →"}
            </button>
        </div>
    </div>
{/if}

<!-- TRAVEL MODE -->
{#if travelMode}
    {#if travelLoading && travelRecords.length === 0}
        <div id="loading" transition:fade={{ duration: 300 }}>
            <p class="loading-text">Locating thought</p>
        </div>
    {/if}

    <button class="travel-cancel" onclick={exitTravel} transition:fade={{ duration: 200 }}>
        ✕ Cancel
    </button>

    {#if travelRecords.length > 0}
        <div class="travel-counter" transition:fade={{ duration: 200 }}>
            {travelIndex + 1} / {travelHasMore ? travelRecords.length + '+' : travelRecords.length}
        </div>
    {/if}

    {#if travelCard}
        {#if travelIndex > 0}
            <button class="travel-nav travel-nav--prev" onclick={travelPrev} transition:fade={{ duration: 150 }}>‹</button>
        {/if}
        {#if travelIndex < travelRecords.length - 1 || travelHasMore}
            <button class="travel-nav travel-nav--next" onclick={travelNext} transition:fade={{ duration: 150 }}>›</button>
        {/if}

        <div class="travel-nav-bar" transition:fade={{ duration: 150 }}>
            <button class="travel-nav-btn" onclick={travelPrev} disabled={travelIndex === 0}>‹ prev</button>
            <button class="travel-nav-btn" onclick={travelNext} disabled={travelIndex >= travelRecords.length - 1 && !travelHasMore}>next ›</button>
        </div>
    {/if}

    {#if travelCard && currentCommit}
        {#key currentCommit.id}
        <div id="voice-card" class="show" transition:fade={{ duration: 400 }}>
            <p class="voice-eyebrow">
                {#if currentCommit.sequenceId}
                    RECORD #{String(currentCommit.sequenceId).padStart(5, '0')}
                {:else}
                    Permanent record
                {/if}
            </p>

            {#if currentCommit.text}
                <p class="voice-why">"{currentCommit.text}"</p>
            {/if}

            <div class="identity-row">
                {#if currentCommit.name}
                    <div class="id-avatar">
                        {currentCommit.name.trim().split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <span class="id-name">{currentCommit.name}</span>
                {/if}
                {#if currentCommit.location}
                    {#if currentCommit.name}<span class="id-sep">·</span>{/if}
                    <span class="id-location">{currentCommit.location}</span>
                {/if}
                {#if currentCommit.link}
                    {#if currentCommit.name || currentCommit.location}<span class="id-sep">·</span>{/if}
                    <a
                        class="id-social"
                        href={currentCommit.link.startsWith('http') ? currentCommit.link : `https://${currentCommit.link}`}
                        target="_blank" rel="noopener"
                    >{currentCommit.link}</a>
                {/if}
            </div>

            <div class="onchain-row">
                <span class="onchain-item">{formatDate(currentCommit.createdAt)}</span>
                <span class="onchain-sep">·</span>
                {#if currentCommit.status === 'pending' || !currentCommit.txHash}
                    <span class="onchain-item" style="color:#d1b866;animation:blink 1.5s infinite;">
                        Etching into Base L2…
                    </span>
                {:else}
                    <span class="onchain-item">
                        <a href="https://basescan.org/tx/{currentCommit.txHash}" target="_blank" rel="noopener">
                            {currentCommit.txHash.slice(0,10)}…{currentCommit.txHash.slice(-6)}
                        </a>
                    </span>
                    <span class="onchain-sep">·</span>
                    <span class="onchain-item">
                        <a href="https://basescan.org/tx/{currentCommit.txHash}" target="_blank" rel="noopener">View on Base ↗</a>
                    </span>
                {/if}
            </div>

            <div class="travel-cta">
                <a class="btn-ghost travel-permalink" href="/record/{currentCommit.id}">↗ permalink</a>
            </div>
        </div>
        {/key}
    {/if}
{/if}
