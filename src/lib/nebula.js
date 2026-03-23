// @ts-nocheck
/**
 * NebulaEngine — 2D Canvas, Perspective Projection
 * Trang chủ: hạt bay từ xa → gần, mouse parallax, dim zone trung tâm.
 *
 * v2 — Nâng cấp visual:
 *   • Mỗi BgParticle có dot sáng + text float riêng (layered depth)
 *   • Palette nebula đa sắc: xanh lạnh, tím, vàng amber, trắng
 *   • Pulse shimmer theo sin wave — mỗi hạt có phase độc lập
 *   • Streak motion trail khi hạt lao gần (z < 500)
 *   • Dim zone trung tâm + z-depth fade giữ nguyên
 */
export class NebulaEngine {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');
        this.count  = options.count || (window.innerWidth < 768 ? 80 : 200);
        this.texts  = options.texts || [];
        this.W = this.H = 0;
        this._targetMouseX = this._mouseX = 0;
        this._targetMouseY = this._mouseY = 0;
        this.particles = [];
        this._animId   = null;
        this._paused   = false;
        this._frame    = 0;
        this._resize();
        this._init();
    }

    _resize() {
        this.W = this.canvas.width  = window.innerWidth;
        this.H = this.canvas.height = window.innerHeight;
    }

    _lerp(a, b, t) { return a + (b - a) * t; }

    _init() {
        this.particles = [];
        for (let i = 0; i < this.count; i++)
            this.particles.push(new BgParticle(this.texts, true));
    }

    update(mouseX, mouseY, isPaused = false) {
        this._paused = isPaused;
        if (!isPaused) { this._targetMouseX = mouseX; this._targetMouseY = mouseY; }
        this._mouseX = this._lerp(this._mouseX, this._targetMouseX, 0.03);
        this._mouseY = this._lerp(this._mouseY, this._targetMouseY, 0.03);
        this._frame++;

        const { W, H, ctx } = this;
        // Trail dài hơn một chút (0.88 thay vì 0.92) → streak rõ hơn khi nhìn tổng thể
        ctx.fillStyle = 'rgba(0,0,0,0.88)';
        ctx.fillRect(0, 0, W, H);

        const pX = (this._mouseX / W - 0.5) * 600;
        const pY = (this._mouseY / H - 0.5) * 600;
        this.particles.forEach(p => p.draw(ctx, W, H, pX, pY, this.texts, isPaused, this._frame));
    }

    resize() { this._resize(); }

    start() {
        const loop = () => {
            this.update(this._targetMouseX, this._targetMouseY, this._paused);
            this._animId = requestAnimationFrame(loop);
        };
        this._animId = requestAnimationFrame(loop);
    }

    stop() {
        if (this._animId) cancelAnimationFrame(this._animId);
        this._animId = null;
    }

    setMouse(x, y) { this._targetMouseX = x; this._targetMouseY = y; }
}

// ─── Nebula colour palette ────────────────────────────────────────────────────
// Mỗi màu: [r, g, b] — xác suất phân phối theo vẻ đẹp thực tế của nebula
const NEBULA_PALETTE = [
    // [180, 215, 255],   // xanh lạnh — phổ biến nhất (~40%)
    [255, 255, 255],
    [200, 180, 255],   // tím lavender
    [160, 200, 255],   // ice blue
    [255, 255, 255],   // trắng thuần — điểm sáng
    [255, 230, 180],   // vàng amber — hiếm, điểm nhấn
    [180, 255, 220],   // xanh lá lạnh — hiếm
    [220, 160, 255],   // tím hồng — hiếm
];
const PALETTE_WEIGHTS = [0.40, 0.18, 0.16, 0.12, 0.06, 0.05, 0.03];

function pickColour() {
    const r = Math.random();
    let acc = 0;
    for (let i = 0; i < PALETTE_WEIGHTS.length; i++) {
        acc += PALETTE_WEIGHTS[i];
        if (r < acc) return NEBULA_PALETTE[i];
    }
    return NEBULA_PALETTE[0];
}

// ─── BgParticle (trang chủ) v2 ───────────────────────────────────────────────

class BgParticle {
    constructor(texts, isInitial = false) { this.reset(texts, isInitial); }

    reset(texts, isInitial = false) {
        this.x = (Math.random() - 0.5) * 3500;
        this.y = (Math.random() - 0.5) * 3500;
        this.z = isInitial ? Math.random() * 4000 : 4000 + Math.random() * 500;

        this.text      = texts?.length ? texts[Math.floor(Math.random() * texts.length)] : '';
        this.speedZ    = 0.8 + Math.random() * 1.2;
        this.speedY    = (Math.random() - 0.5) * 0.15;
        this.baseAlpha = 0.25 + Math.random() * 0.35;

        // Dot size — nhỏ có nhiều hơn, lớn thì hiếm (điểm sáng)
        this.baseR = Math.random() < 0.08
            ? 2.2 + Math.random() * 1.2   // điểm sáng hiếm
            : 0.6 + Math.random() * 1.1;  // hạt bình thường

        // Colour
        const [r, g, b] = pickColour();
        this.r = r; this.g = g; this.b = b;

        // Pulse — phase độc lập cho mỗi hạt
        this.pulse      = Math.random() * Math.PI * 2;
        this.pulseSpeed = 0.008 + Math.random() * 0.016;
        this.pulseAmp   = 0.10 + Math.random() * 0.20;  // biên độ shimmer

        // Text hiển thị hay không — không phải hạt nào cũng cần text
        // Hạt ở xa (z lớn) → ẩn text; chỉ hiện khi đủ gần
        this.showText = Math.random() < 0.35;  // 70% → 35%
    }

    draw(ctx, W, H, pX, pY, texts, isPaused, frame) {
        if (!isPaused) { this.z -= this.speedZ; this.y += this.speedY; }
        if (this.z < 50) { this.reset(texts, false); return; }

        this.pulse += this.pulseSpeed;

        const scale = 800 / this.z;
        const x2d   = (this.x + pX) * scale + W / 2;
        const y2d   = (this.y + pY) * scale + H / 2;

        // Z-depth fade
        let zAlpha = 1;
        if (this.z > 3000) zAlpha = (4000 - this.z) / 1000;
        else if (this.z < 600) zAlpha = (this.z - 50) / 550;

        // Dim zone ở trung tâm
        const dist     = Math.hypot(x2d - W / 2, y2d - H / 2);
        const uiRadius = Math.min(W, H) * 0.42;
        let centreAlpha = 1, centreScale = 1;
        if (dist < uiRadius) {
            const ease  = Math.pow(dist / uiRadius, 1.5);
            centreAlpha = 0.30 + 0.70 * ease;
            centreScale = 0.65 + 0.35 * ease;
        }

        // Pulse shimmer
        const shimmer    = 1 + Math.sin(this.pulse) * this.pulseAmp;
        const finalAlpha = this.baseAlpha * zAlpha * centreAlpha * shimmer;
        if (finalAlpha <= 0.02) return;
        if (x2d < -300 || x2d > W + 300 || y2d < -200 || y2d > H + 200) return;

        const dotR = Math.max(0.5, this.baseR * scale * centreScale);

        // ── Streak trail khi hạt đang lao gần ──
        // Chỉ vẽ streak khi z < 500, scale đủ lớn để nhìn thấy
        if (this.z < 500 && !isPaused) {
            const trailLen  = Math.min(18, (500 - this.z) * 0.055) * scale;
            const trailAlpha = finalAlpha * 0.35;
            // Trail theo hướng motion thật (từ xa → gần, tức từ center ra ngoài)
            const dx = x2d - W / 2;
            const dy = y2d - H / 2;
            const dist2 = Math.hypot(dx, dy) || 1;
            const nx = dx / dist2;
            const ny = dy / dist2;
            const grad = ctx.createLinearGradient(
                x2d - nx * trailLen, y2d - ny * trailLen,
                x2d, y2d
            );
            grad.addColorStop(0, `rgba(${this.r},${this.g},${this.b},0)`);
            grad.addColorStop(1, `rgba(${this.r},${this.g},${this.b},${Math.min(0.5, trailAlpha)})`);
            ctx.beginPath();
            ctx.moveTo(x2d - nx * trailLen - ny * dotR * 0.4, y2d - ny * trailLen + nx * dotR * 0.4);
            ctx.lineTo(x2d - nx * trailLen + ny * dotR * 0.4, y2d - ny * trailLen - nx * dotR * 0.4);
            ctx.lineTo(x2d + ny * dotR * 0.6, y2d - nx * dotR * 0.6);
            ctx.lineTo(x2d - ny * dotR * 0.6, y2d + nx * dotR * 0.6);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();
        }

        // ── Dot chính ──
        // Hạt sáng (baseR lớn) → thêm glow bằng cách vẽ 2 lớp
        if (this.baseR > 2.0) {
            // Halo mờ phía ngoài
            ctx.beginPath();
            ctx.arc(x2d, y2d, dotR * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.r},${this.g},${this.b},${Math.min(0.12, finalAlpha * 0.2)})`;
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(x2d, y2d, dotR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.r},${this.g},${this.b},${Math.min(1, finalAlpha)})`;
        ctx.fill();

        // ── Text — chỉ hiện khi đủ gần + đủ scale + hạt được chọn showText ──
        if (this.showText && this.text) {
            // Hiện text sớm hơn — từ xa hơn, không đợi scale lớn
            // const tAlpha = Math.min(finalAlpha * 1.2, 0.80) * Math.min(1, (scale - 0.04) * 5.0);
            const tAlpha = Math.min(finalAlpha * 0.7, 0.45) * Math.min(1, (scale - 0.08) * 4.0);
            if (tAlpha > 0.04) {
                // Font size có floor cao hơn — đọc được ngay cả khi còn xa
                // const fontSize   = Math.max(13, 18 * scale) * centreScale;
                const fontSize = Math.max(11, 15 * scale) * centreScale;
                const maxWidth   = Math.max(360, 480 * scale);
                const lineHeight = fontSize * 1.4;

                ctx.font         = `italic ${fontSize}px Georgia`;
                ctx.textAlign    = 'left';
                ctx.textBaseline = 'middle';

                // Single line, truncate 40 chars
                const displayText = this.text.length > 65 ? this.text.slice(0, 65) + '…' : this.text;
                ctx.shadowColor   = 'rgba(0,0,0,0.85)';
                ctx.shadowBlur    = 6;
                ctx.fillStyle     = `rgba(${this.r},${this.g},${this.b},${tAlpha})`;
                ctx.fillText(displayText, x2d + dotR + 6, y2d);
                ctx.shadowBlur    = 0;
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
/**
 * DetailEngine — dành cho trang /thought/[id]
 *
 * Giữ nguyên 100% logic gốc:
 *  - phase 'drift'  : camera lao về phía trước, mouse parallax tự do
 *  - phase 'fly'    : camera lerp đến myParticle
 *  - phase 'done'   : camera bám myParticle, nhẹ nhàng drift theo chuột
 *
 * Cách dùng trong Svelte:
 *
 *   import { DetailEngine } from '$lib/nebula';
 *
 *   let engine;
 *   onMount(async () => {
 *       engine = new DetailEngine(canvasEl);
 *       engine.onHideLanding  = () => { showLoading = false; };
 *       engine.onShowDetail   = () => { showDetailView = true; };
 *       engine.onLabelUpdate  = (style, show) => { youLabelStyle = style; showYouLabel = show; };
 *
 *       const dbData      = await fetch('/api/records').then(r => r.json());
 *       const thoughtData = await getRecordFromFirebase(thoughtId);
 *
 *       engine.texts = dbData.texts;
 *       engine.init(thoughtId, thoughtData.text);
 *       engine.start();
 *
 *       return () => engine.stop();
 *   });
 */
export class DetailEngine {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');
        this.texts  = options.texts || [];
        this.count  = options.count || 1800;
        this.W = this.H = 0;

        this.camX  = 0; this.camY  = 0; this.camZ  = 0;
        this.tCamX = 0; this.tCamY = 0; this.tCamZ = 0;
        this._mouseX = 0; this._mouseY = 0;

        this.phase          = 'drift';
        this.flyDone        = false;
        this.flyTarget      = null;
        this.driftStart     = null;
        this.DRIFT_DURATION = 1000;

        this.particles  = [];
        this.myParticle = null;

        // Callbacks
        this.onHideLanding = null;   // () => void  — gọi khi drift xong, tắt loading
        this.onShowDetail  = null;   // () => void  — gọi khi fly xong, hiện card
        this.onLabelUpdate = null;   // (styleStr, show: bool) => void
        this.onPhaseChange = null;   // (phase: string) => void

        this._animId = null;
        this._resize();
    }

    // ─── public API ─────────────────────────────────────────────────────────

    init(thoughtId, thoughtText) {
        this._buildParticles(thoughtId, thoughtText);
    }

    start() {
        this._animId = requestAnimationFrame(ts => this._animate(ts));
    }

    stop() {
        if (this._animId) cancelAnimationFrame(this._animId);
        this._animId = null;
    }

    setMouse(x, y) { this._mouseX = x; this._mouseY = y; }

    resize() { this._resize(); }

    // ─── private ────────────────────────────────────────────────────────────

    _resize() {
        this.W = this.canvas.width  = window.innerWidth;
        this.H = this.canvas.height = window.innerHeight;
        if (!this._mouseX) this._mouseX = this.W / 2;
        if (!this._mouseY) this._mouseY = this.H / 2;
    }

    _lerp(a, b, t) { return a + (b - a) * t; }

    _buildParticles(thoughtId, thoughtText) {
        this.particles = [];
        for (let i = 0; i < this.count; i++)
            this.particles.push(new DetailParticle(false, null, this.texts));

        const mp = new DetailParticle(true, thoughtId, this.texts);
        mp.text  = thoughtText;
        mp.z     = this.camZ + 2000 + Math.random() * 600;
        mp.x     = (Math.random() - 0.5) * 1600;
        mp.y     = (Math.random() - 0.5) * 1600;

        this.particles.push(mp);
        this.myParticle = mp;
        this.flyTarget  = mp;
    }

    _setPhase(p) {
        this.phase = p;
        if (this.onPhaseChange) this.onPhaseChange(p);
    }

    _animate(ts) {
        const { ctx, W, H } = this;
        if (!ctx) return;

        ctx.fillStyle = 'rgba(0,0,0,0.92)';
        ctx.fillRect(0, 0, W, H);

        if (this.phase === 'drift') {
            if (!this.driftStart) this.driftStart = ts;
            this.camZ  += 3.0;
            this.tCamZ  = this.camZ;
            this.tCamX  = (this._mouseX - W / 2) * 0.4;
            this.tCamY  = (this._mouseY - H / 2) * 0.4;
            if (ts - this.driftStart > this.DRIFT_DURATION) {
                this._setPhase('fly');
                if (this.onHideLanding) this.onHideLanding();
            }

        } else if (this.phase === 'fly' && this.flyTarget) {
            this.tCamX = this._lerp(this.tCamX, this.flyTarget.x, 0.045);
            this.tCamY = this._lerp(this.tCamY, this.flyTarget.y, 0.045);
            this.tCamZ = this._lerp(this.tCamZ, this.flyTarget.z - 90, 0.035);

            if (Math.abs(this.camZ - (this.flyTarget.z - 90)) < 6) {
                this._setPhase('done');
                this.flyDone = true;
                setTimeout(() => { if (this.onShowDetail) this.onShowDetail(); }, 150);
            }

        } else if (this.phase === 'done' && this.flyTarget) {
            this.flyTarget.z += 1.5;
            this.tCamZ = this.flyTarget.z - 90;
            this.tCamX = this._lerp(this.tCamX, this.flyTarget.x + (this._mouseX - W / 2) * 0.08, 0.012);
            this.tCamY = this._lerp(this.tCamY, this.flyTarget.y + (this._mouseY - H / 2) * 0.08, 0.012);
        }

        this.camX = this._lerp(this.camX, this.tCamX, 0.05);
        this.camY = this._lerp(this.camY, this.tCamY, 0.05);
        this.camZ = this._lerp(this.camZ, this.tCamZ, 0.05);

        let labelStyle = '', showLabel = false;

        this.particles.forEach(p => {
            if (!p.isMine && p.z < this.camZ) p.z += 5500;
            const result = p.draw(ctx, W, H, this.camX, this.camY, this.camZ, this.flyDone);
            if (result) { labelStyle = result.labelStyle; showLabel = true; }
        });

        if (this.onLabelUpdate) this.onLabelUpdate(labelStyle, showLabel);

        this._animId = requestAnimationFrame(ts => this._animate(ts));
    }
}

// ─── DetailParticle ───────────────────────────────────────────────────────────

class DetailParticle {
    constructor(isMine, id, texts) {
        this.isMine = isMine || false;
        this.id     = id    || null;
        this.pulse  = Math.random() * Math.PI * 2;

        if (this.id !== null) {
            let seed = 0;
            for (let i = 0; i < this.id.length; i++) seed += this.id.charCodeAt(i);
            const rng = this._seededRand(seed * 9973 + 1234567);
            this.x = (rng() - 0.5) * 7000;
            this.y = (rng() - 0.5) * 7000;
            this.z = 200 + rng() * 5000;
        } else {
            this.x = (Math.random() - 0.5) * 7000;
            this.y = (Math.random() - 0.5) * 7000;
            this.z = 200 + Math.random() * 5000;
        }

        this.text  = texts?.length ? texts[Math.floor(Math.random() * texts.length)] : '';
        this.baseR = this.isMine ? 2.8 : (0.5 + Math.random() * 1.5);
        this.alpha = 0.25 + Math.random() * 0.45;

        const t = Math.random();
        this.r  = t < 0.06 ? 160 : 255;
        this.g  = t < 0.06 ? 190 : 255;
        this.b  = t < 0.06 ? 255 : (t < 0.1 ? 200 : 255);
    }

    _seededRand(seed) {
        let s = seed;
        return () => {
            s = (s * 1664525 + 1013904223) & 0xffffffff;
            return (s >>> 0) / 0xffffffff;
        };
    }

    _project(cx, cy, cz, W, H) {
        const dz = this.z - cz;
        if (dz <= 1) return null;
        const sc = 500 / dz;
        return { x: (this.x - cx) * sc + W / 2, y: (this.y - cy) * sc + H / 2, sc };
    }

    draw(ctx, W, H, cx, cy, cz, flyDone) {
        const p = this._project(cx, cy, cz, W, H);
        if (!p) return null;
        const { x, y, sc } = p;
        if (x < -200 || x > W + 200 || y < -200 || y > H + 200) return null;

        this.pulse += 0.012;

        // isMine particle — ẩn hoàn toàn khi flyDone, chỉ dùng làm fly target
        if (this.isMine && flyDone) return null;

        const dotR = Math.max(0.5, this.baseR * sc * 0.7);
        ctx.beginPath();
        ctx.arc(x, y, dotR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.r},${this.g},${this.b},${Math.min(1, this.alpha)})`;
        ctx.fill();

        if (sc > 0.1 && this.text) {
            const displayText = this.text.length > 45 ? this.text.slice(0, 45) + '…' : this.text;
            const fontSize = Math.min(16, Math.max(10, 11 * sc));
            const tAlpha   = Math.min(0.45, (sc - 0.1) * 0.5);
            ctx.font         = `italic ${fontSize}px Georgia`;
            ctx.fillStyle    = `rgba(255,255,255,${tAlpha})`;
            ctx.textAlign    = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(displayText, x + dotR + 6, y + 4);
        }

        return null;
    }
}
