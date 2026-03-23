<script>
// @ts-nocheck

    import { onMount, onDestroy } from 'svelte';
    import { fade } from 'svelte/transition';
    import { subscribeToRecord } from '$lib/stores/db';
    import { goto } from '$app/navigation';
    import { DetailEngine } from '$lib/nebula';
    import hljs from 'highlight.js';

    function dedent(code) {
        const lines = code.split('\n');
        const nonEmpty = lines.filter(l => l.trim().length > 0);
        if (!nonEmpty.length) return code;
        const minIndent = Math.min(...nonEmpty.map(l => {
            const match = l.match(/^([ \t]*)/);
            return match ? match[1].replace(/\t/g, '    ').length : 0;
        }));
        return lines.map(l => {
            let col = 0, i = 0;
            while (i < l.length && col < minIndent) {
                if (l[i] === '\t') col += 4;
                else col++;
                i++;
            }
            return l.slice(i);
        }).join('\n').trim();
    }

    function highlightCode(code) {
        if (!code) return '';
        return hljs.highlightAuto(dedent(code)).value;
    }

    let { data } = $props();
    let thoughtId   = data.id;
    let thoughtData = $state(null);
    let errorMsg    = $state(null);

    let showDetailView = $state(false);
    let showLoading    = $state(true);
    let showShareToast = $state(false);
    let youLabelStyle  = $state('');
    let showYouLabel   = $state(false);

    let canvasEl;
    let engine;

    let unsubscribeDb;

    let tsDate = $derived(
        thoughtData?.createdAt
            ? new Date(thoughtData.createdAt.toMillis
                ? thoughtData.createdAt.toMillis()
                : Date.now()
            ).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    );

    function handleMouseMove(e) {
        if (showDetailView) return;
        engine?.setMouse(e.clientX, e.clientY);
    }

    onMount(async () => {
        engine = new DetailEngine(canvasEl);

        // Gắn callbacks
        engine.onHideLanding = () => { showLoading = false; };
        engine.onShowDetail  = () => { showDetailView = true; };
        engine.onLabelUpdate = (style, show) => {
            youLabelStyle = style;
            showYouLabel  = show;
        };

        try {
            const res    = await fetch('/api/records');
            const dbData = await res.json();
            engine.texts = dbData.texts;

            unsubscribeDb = subscribeToRecord(thoughtId, (data) => {
                if (!data) {
                    errorMsg = 'Thought not found in the void.';
                    showLoading = false;
                    return;
                }

                thoughtData = data;
                
                // Khởi động engine nếu chưa chạy
                if (engine.phase === 'drift' && !engine.myParticle) {
                    engine.init(thoughtId, thoughtData.code || thoughtData.text);
                    engine.start();
                }
            });

        } catch (err) {
            console.error(err);
            errorMsg   = 'Error retrieving thought.';
            showLoading = false;
        }

        return () => engine?.stop();
    });

    function handleShareVoice() {
        const url = window.location.href;
        if (navigator.share) {
            navigator.share({ title: 'A commit in The Human TXT', url }).catch(() => {});
        } else {
            navigator.clipboard.writeText(url).then(() => {
                showShareToast = true;
                setTimeout(() => (showShareToast = false), 2200);
            });
        }
    }

    onDestroy(() => {
        if (unsubscribeDb) unsubscribeDb();
        engine?.stop();
    });

</script>

<svelte:window
    on:resize={() => engine?.resize()}
    on:mousemove={handleMouseMove}
    onkeydown={(e) => { if (e.key === 'Escape') goto('/'); }}
/>

<canvas bind:this={canvasEl}></canvas>

{#if errorMsg}
    <div id="loading" class="show" style="flex-direction: column;">
        <p class="loading-text" style="color: #aa5555; animation: none;">{errorMsg}</p>
        <button class="btn-ghost" style="margin-top: 24px; pointer-events: all;" onclick={() => goto('/')}>← Return to Canvas</button>
    </div>
{/if}

{#if showLoading && !errorMsg}
    <div id="loading" class:hidden={engine?.phase !== 'drift'} transition:fade={{ duration: 500 }}>
        <p class="loading-text">Locating thought</p>
    </div>
{/if}

<div id="share-toast" class:show={showShareToast}>link copied</div>
<div id="you-label" style="{youLabelStyle}" class:show={showYouLabel}>— the thought</div>

{#if showDetailView && thoughtData}
    <div id="voice-card" class="show" transition:fade={{ duration: 400 }}>
        <p class="voice-eyebrow">
            {#if thoughtData.sequenceId}
                RECORD #{String(thoughtData.sequenceId).padStart(5, '0')}
            {:else}
                Permanent record
            {/if}
        </p>
        {#if thoughtData.code}
            <div class="code-block">
                <pre><code class="hljs">{@html highlightCode(thoughtData.code)}</code></pre>
            </div>
        {/if}
        {#if thoughtData.text}
            <p class="voice-why">"{thoughtData.text}"</p>
        {/if}

        <div class="identity-row">
            {#if thoughtData.name}
                <div class="id-avatar">{thoughtData.name.trim().split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase()}</div>
                <span class="id-name">{thoughtData.name}</span>
            {/if}
            {#if thoughtData.location}
                {#if thoughtData.name}<span class="id-sep">·</span>{/if}
                <span class="id-location">{thoughtData.location}</span>
            {/if}
            {#if thoughtData.link}
                {#if thoughtData.name || thoughtData.location}<span class="id-sep">·</span>{/if}
                <a class="id-social" href={thoughtData.link.startsWith('http') ? thoughtData.link : `https://${thoughtData.link}`} target="_blank" rel="noopener">{thoughtData.link}</a>
            {/if}
        </div>

        <div class="onchain-row">
            <span class="onchain-item">{tsDate}</span>
            <span class="onchain-sep">·</span>

            {#if thoughtData.status === 'pending' || !thoughtData.txHash}
                <span class="onchain-item" style="color: #d1b866; animation: blink 1.5s infinite;">
                    Etching into Base L2...
                </span>
            {:else}
                <span class="onchain-item">
                    <a href="https://basescan.org/tx/{thoughtData.txHash}" target="_blank" rel="noopener">
                        {thoughtData.txHash.slice(0, 10)}...{thoughtData.txHash.slice(-6)}
                    </a>
                </span>
                <span class="onchain-sep">·</span>
                <span class="onchain-item">
                    <a href="https://basescan.org/tx/{thoughtData.txHash}" target="_blank" rel="noopener">View on Base ↗</a>
                </span>
            {/if}

        </div>

        <div class="cta-row">
            <button class="btn-ghost" onclick={handleShareVoice}>Share this commit</button>
            <button class="btn-ghost" onclick={() => goto('/')}>← Back</button>
        </div>
    </div>
{/if}

<style>
@media (max-width: 540px) {
    #voice-card {
        padding-bottom: 35px;
    }
}
</style>

