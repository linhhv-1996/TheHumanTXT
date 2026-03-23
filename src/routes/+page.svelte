<script>
    // @ts-nocheck

    import { onMount, onDestroy } from "svelte";
    import { fade } from "svelte/transition";
    import { authStore, logout } from "$lib/stores/auth";
    import LoginPopup from "$lib/components/LoginPopup.svelte";
    import { saveRecordToFirebase, getUserRecords, getAllRecords } from "$lib/stores/db";
    import { goto } from "$app/navigation";
    import { NebulaEngine, DetailEngine } from "$lib/nebula";

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
    let txtInput         = $state("");
    let whyInput          = $state("");
    let fieldName         = $state("");
    let fieldLocation     = $state("");
    let fieldLink         = $state("");
    let hasTxtError      = $state(false);
    let hasWhyError       = $state(false);
    let isCheckingRecords = $state(false);
    let codeCharsLeft     = $derived(500 - txtInput.length);
    let whyCharsLeft      = $derived(160 - whyInput.length);
    let claimed           = $state(data.dbData.claimed);

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
    let travelFlying   = $state(false);  // true khi engine đang drift/fly, chưa hiện card
    let travelCard     = $state(false);  // true khi fly xong → hiện card
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

    onMount(() => {
        mouseX = window.innerWidth  / 2;
        mouseY = window.innerHeight / 2;
        engine = new NebulaEngine(canvasEl, { count: 100, texts: data.dbData.texts });
        engine._isDetail = false;
        startHomeLoop();
    });

    onDestroy(() => {
        if (animationId) cancelAnimationFrame(animationId);
        engine?.stop?.();
    });

    function handleMouseMove(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (travelMode && engine?._isDetail) engine.setMouse(e.clientX, e.clientY);
    }

    // ─── Swap → DetailEngine ──────────────────────────────────────────────────
    function mountDetailEngine(commit) {
        if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
        engine?.stop?.();

        const de = new DetailEngine(canvasEl, { texts: data.dbData.texts });
        de._isDetail = true;

        de.onHideLanding = () => { /* drift phase done — không cần làm gì */ };
        de.onShowDetail  = () => { travelFlying = false; travelCard = true; };
        de.onLabelUpdate = (style, show) => { youLabelStyle = style; showYouLabel = show; };

        de.init(commit.id, commit.code || commit.text || '');
        de.start();
        engine = de;
    }

    // ─── Swap → NebulaEngine ─────────────────────────────────────────────────
    function mountHomeEngine() {
        if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
        engine?.stop?.();

        const ne = new NebulaEngine(canvasEl, { count: 100, texts: data.dbData.texts });
        ne._isDetail = false;
        engine = ne;
        startHomeLoop();
    }

    // ─── Travel: enter ────────────────────────────────────────────────────────
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

    // ─── Travel: exit ────────────────────────────────────────────────────────
    function exitTravel() {
        travelMode   = false;
        travelCard   = false;
        travelFlying = false;
        showYouLabel = false;
        mountHomeEngine();
    }

    // ─── Travel: fetch ────────────────────────────────────────────────────────
    async function fetchMoreRecords() {
        if (travelLoading || !travelHasMore) return;
        travelLoading = true;
        const { records, lastDoc, hasMore } = await getAllRecords(50, travelLastDoc);
        travelRecords = [...travelRecords, ...records];
        travelLastDoc = lastDoc;
        travelHasMore = hasMore;
        travelLoading = false;
    }

    // ─── Travel: navigate ────────────────────────────────────────────────────
    async function travelNext() {
        if (travelFlying) return;
        const nextIdx = travelIndex + 1;

        // prefetch khi gần hết
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

    // ─── Submit ───────────────────────────────────────────────────────────────
    function handleLeaveAction() {
        if ($authStore.user) { activePanel = "submit"; hasTxtError = hasWhyError = false; }
        else showLoginPopup = true;
    }

    function onLoginSuccess() {
        showLoginPopup = false;
        activePanel    = "submit";
        hasTxtError   = hasWhyError = false;
    }

    async function processSubmission(isPaid) {
        const raw = txtInput.trim();
        if (!raw || raw.length > 500) { hasTxtError = true; return; }
        isSubmitting = true;
        try {
            const docId = await saveRecordToFirebase({
                text:     raw,
                why:      whyInput.trim().slice(0, 160),
                name:     fieldName.trim().slice(0, 160),
                location: fieldLocation.trim().slice(0, 160),
                link:     fieldLink.trim().slice(0, 160),
                isPaid,
            });
            goto(`/record/${docId}`);
        } catch (error) {
            alert("Lỗi: " + error.message);
        } finally {
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
            // Nhiều records → enter travel mode với records của user (không goto /my-archive)
            travelMode    = true;
            travelIndex   = 0;
            travelRecords = myThoughts;
            travelLastDoc = null;
            travelHasMore = false; // getUserRecords đã fetch hết, không cần load thêm
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
            if (isSubmitting) return;
            if (showManifest)   { showManifest   = false; return; }
            if (showLoginPopup) { showLoginPopup = false; return; }
        }
    }}
/>

{#if showLoginPopup}
    <LoginPopup on:close={() => (showLoginPopup = false)} on:success={onLoginSuccess} />
{/if}

<!-- Canvas luôn visible — engine swap phía dưới, animation chạy xuyên suốt -->
<canvas bind:this={canvasEl} id="canvas"></canvas>

<!-- You-label (travel mode, giống detail page) -->
{#if travelMode}
    <div id="you-label" style="{youLabelStyle}" class:show={showYouLabel}>— the thought</div>
{/if}

<!-- TOP BAR & FOOTER — ẩn khi travel -->
{#if !travelMode}
    <div id="top-bar" transition:fade={{ duration: 300 }}>
        <button id="manifest-link" onclick={() => (showManifest = true)}>Manifest</button>
        <div class="top-bar-auth">
            {#if $authStore.user}
                <span class="auth-email">{$authStore.user.email}</span>
                <button class="auth-btn" onclick={logout}>logout</button>
            {:else}
                <button class="auth-btn" onclick={() => (showLoginPopup = true)}>login</button>
            {/if}
        </div>
    </div>
    <div id="footer-links" transition:fade={{ duration: 300 }}>
        <a class="footer-link" target="_blank" href="/privacy">Privacy Policy</a>
        <a class="footer-link" target="_blank" href="/terms">Terms of Service</a>
        <a class="footer-link" target="_blank" href="https://x.com/hlinhbuilds">X(Twitter)</a>
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

<!-- HERO — ẩn khi travel -->
{#if activePanel === "hero" && !travelMode}
    <div class="hero" transition:fade={{ duration: 500 }}>
        <p class="hero-eyebrow">AI is writing more words every day. Yours was human.</p>
        <h1 class="hero-title">Before AI forgets<br />where it learned<br />everything.</h1>
        <div class="hero-actions">
            <button class="btn-main" onclick={handleLeaveAction}>Leave your mark — $5</button>
            <a
                class="btn-ghost"
                href="https://arbiscan.io/address/0xDIA_CHI_CONTRACT_CUA_MAY#readContract"
                target="_blank" rel="noopener noreferrer"
                style="text-decoration:none;display:flex;align-items:center;justify-content:center;"
            >Verify on-chain ↗</a>
        </div>
        <p class="hero-note">{claimed} records &nbsp;·&nbsp; On-chain forever.</p>
    </div>
{/if}

<!-- FAB BUTTONS — ẩn khi travel -->
{#if activePanel === "hero" && !travelMode}
    <button class="fab-travel" onclick={enterTravel} transition:fade={{ duration: 300 }}>
        EXPLORE →
    </button>
    <button
        class="fab-submissions"
        onclick={handleViewMySubmission}
        disabled={isCheckingRecords}
        transition:fade={{ duration: 300 }}
    >{isCheckingRecords ? "LOCATING..." : "YOUR SUBMISSION →"}</button>
{/if}

<!-- SUBMIT PANEL -->
{#if activePanel === "submit" && !travelMode}
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <button class="panel-backdrop" onclick={() => { if (!isSubmitting) activePanel = "hero"; }} transition:fade></button>
    <div class="submit-panel active" transition:fade>
        <p class="submit-label">Entry #{claimed + 1} &nbsp;·&nbsp; your mark</p>
        <div style="width:100%;position:relative;">
            <textarea
                class:error={hasTxtError}
                bind:value={txtInput}
                placeholder="Write something real. A thought, a moment, an opinion. Something only you could write."
                maxlength="500" rows="6"
                style="font-size:13px;resize:vertical;"
                oninput={() => (hasTxtError = false)}
            ></textarea>
            <p class="char-counter {codeCharsLeft <= 50 ? 'danger' : ''}">{codeCharsLeft}</p>
        </div>
        <div style="width:100%;position:relative;margin-top:8px;">
            <input
                class="field-input {hasWhyError ? 'error' : ''}"
                bind:value={whyInput}
                placeholder="Why did you write this? (optional)"
                maxlength="160" style="width:100%;"
                oninput={() => (hasWhyError = false)}
            />
            <p class="char-counter {whyCharsLeft <= 15 ? 'danger' : ''}">{whyCharsLeft}</p>
        </div>
        <div class="fields-row">
            <div class="field-group">
                <span class="field-label">Name</span>
                <input class="field-input" bind:value={fieldName} placeholder="anonymous" maxlength="160" />
            </div>
            <div class="field-group">
                <span class="field-label">Location</span>
                <input class="field-input" bind:value={fieldLocation} placeholder="somewhere" maxlength="160" />
            </div>
            <div class="field-group full-width">
                <span class="field-label">X / Link</span>
                <input class="field-input" bind:value={fieldLink} placeholder="@handle or https://..." maxlength="160" />
            </div>
        </div>
        <div class="submit-footer">
            <button class="btn-back" onclick={() => (activePanel = "hero")} disabled={isSubmitting}>← back</button>
            <button class="btn-main" onclick={() => processSubmission(false)} disabled={isSubmitting}>
                {isSubmitting ? "PROCESSING..." : "Record your mark — $5"}
            </button>
        </div>
    </div>
{/if}

<!-- ══════════════════════════════════════════════
     TRAVEL MODE — chỉ UI mỏng, canvas vẫn live
     ══════════════════════════════════════════════ -->
{#if travelMode}
    <!-- Loading khi fetch lần đầu chưa xong -->
    {#if travelLoading && travelRecords.length === 0}
        <div id="loading" transition:fade={{ duration: 300 }}>
            <p class="loading-text">Locating thought</p>
        </div>
    {/if}

    <!-- Cancel button (thay thế top-bar) -->
    <button class="travel-cancel" onclick={exitTravel} transition:fade={{ duration: 200 }}>
        ✕ Cancel
    </button>

    <!-- Counter -->
    {#if travelRecords.length > 0}
        <div class="travel-counter" transition:fade={{ duration: 200 }}>
            {travelIndex + 1} / {travelHasMore ? travelRecords.length + '+' : travelRecords.length}
        </div>
    {/if}

    <!-- Prev / Next — chỉ hiện sau khi card đã hiện (fly xong) -->
    {#if travelCard}
        <!-- Desktop: arrows 2 cạnh, không đè data -->
        {#if travelIndex > 0}
            <button class="travel-nav travel-nav--prev" onclick={travelPrev} transition:fade={{ duration: 150 }}>‹</button>
        {/if}
        {#if travelIndex < travelRecords.length - 1 || travelHasMore}
            <button class="travel-nav travel-nav--next" onclick={travelNext} transition:fade={{ duration: 150 }}>›</button>
        {/if}

        <!-- Mobile: thanh ngang cố định dưới cùng -->
        <div class="travel-nav-bar" transition:fade={{ duration: 150 }}>
            <button class="travel-nav-btn" onclick={travelPrev} disabled={travelIndex === 0}>‹ prev</button>
            <button class="travel-nav-btn" onclick={travelNext} disabled={travelIndex >= travelRecords.length - 1 && !travelHasMore}>next ›</button>
        </div>
    {/if}

    <!-- Detail card — xuất hiện sau khi DetailEngine fire onShowDetail -->
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

            {#if currentCommit.code}
                <div class="code-block">
                    <pre><code class="hljs">{@html highlightCode(currentCommit.code)}</code></pre>
                </div>
            {/if}

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
