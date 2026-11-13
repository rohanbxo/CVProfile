document.addEventListener('DOMContentLoaded', () => {
    const EMAIL = 'rohanburugapalli@gmail.com';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

    // --- Loader ---------------------------------------------------------
    const loader = document.getElementById('loader');
    const removeLoader = () => loader.remove();
    if (reducedMotion.matches) {
        removeLoader();
    } else {
        setTimeout(() => {
            loader.classList.add('hidden');
            loader.addEventListener('transitionend', removeLoader, { once: true });
            setTimeout(removeLoader, 600); // in case transitionend never fires
        }, 1000);
    }

    // --- Toast ----------------------------------------------------------
    const toast = document.getElementById('toast');
    let toastTimer;
    function showToast(message) {
        toast.textContent = message;
        toast.classList.remove('hidden');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
    }

    // --- Copy email (falls back to the mail app) -------------------------
    const copyEmailBtn = document.getElementById('copy-email-btn');
    copyEmailBtn.addEventListener('click', (e) => {
        if (!navigator.clipboard || !navigator.clipboard.writeText) return; // let mailto: work
        e.preventDefault();
        navigator.clipboard.writeText(EMAIL)
            .then(() => showToast('Email copied to clipboard!'))
            .catch(() => { window.location.href = `mailto:${EMAIL}`; });
    });

    // --- Music toggle (hidden when the track is missing) -----------------
    const music = document.getElementById('bg-music');
    const musicSource = music.querySelector('source');
    const musicToggle = document.getElementById('music-toggle');
    const iconOn = document.getElementById('music-icon-on');
    const iconOff = document.getElementById('music-icon-off');
    let playing = false;

    const hideMusic = () => {
        music.pause();
        musicToggle.hidden = true;
    };
    musicSource.addEventListener('error', hideMusic);
    music.addEventListener('error', hideMusic);
    const checkMusicSource = () => {
        if (music.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) hideMusic();
    };
    checkMusicSource();
    window.addEventListener('load', checkMusicSource);

    function setPlaying(next) {
        playing = next;
        iconOn.hidden = !next;
        iconOff.hidden = next;
        const label = next ? 'Pause background music' : 'Play background music';
        musicToggle.setAttribute('aria-pressed', String(next));
        musicToggle.setAttribute('aria-label', label);
        musicToggle.title = label;
    }

    musicToggle.addEventListener('click', () => {
        if (playing) {
            music.pause();
            setPlaying(false);
        } else {
            setPlaying(true);
            const attempt = music.play();
            if (attempt && attempt.catch) attempt.catch(() => { setPlaying(false); hideMusic(); });
        }
    });

    // --- Starfield ------------------------------------------------------
    const stars = createStarfield(document.getElementById('stars'), reducedMotion);

    // --- 3D folded scroll ----------------------------------------------
    // Mirror the centre content into the decorative (aria-hidden, inert) folds.
    const root = document.documentElement;
    const centerFold = document.getElementById('center-fold');
    const centerContent = document.getElementById('center-content');
    document.getElementById('top-content').innerHTML = centerContent.innerHTML;
    document.getElementById('bottom-content').innerHTML = centerContent.innerHTML;

    const foldsContent = document.querySelectorAll('.fold-content');
    const progressFill = document.querySelector('.progress-fill');
    let maxScroll = 0;

    // Native scroll is the source of truth (`target`); the folds render at an
    // eased position (`current`) that chases it, frame-rate independently.
    const EASE = 0.12;          // fraction of the gap closed per 60Hz frame
    const SNAP = 0.1;           // px; closer than this and we land exactly
    const FRAME_60 = 1000 / 60;
    let target = 0;
    let current = 0;
    let rendered = NaN;
    let lastProgress = -1;
    let rafId = 0;
    let lastTime = 0;

    const clampScroll = (y) => Math.max(0, Math.min(maxScroll, y));

    // Snap to whole device pixels, like native scroll: text stays crisp, and
    // the long sub-pixel tail of the easing costs no style or composite work.
    function paint(exact) {
        const dpr = window.devicePixelRatio || 1;
        const y = Math.round(exact * dpr) / dpr;
        if (y === rendered) return;
        rendered = y;
        const t = `translate3d(0, ${-y}px, 0)`;
        foldsContent.forEach((el) => { el.style.transform = t; });
        const p = maxScroll ? y / maxScroll : 0;
        if (Math.abs(p - lastProgress) > 0.0005 || p === 0 || p === 1) {
            lastProgress = p;
            progressFill.style.transform = `scaleY(${p})`;
        }
        stars.setScroll(y);
    }

    // While content moves under a resting pointer, links slide in and out of
    // :hover and their colour transitions repaint the whole fold layer every
    // frame. Turn off hit-testing on the folds until the motion settles.
    let scrollingTimer = 0;
    let scrollingClass = false;
    function setScrollingClass(on) {
        if (on === scrollingClass) return;
        scrollingClass = on;
        root.classList.toggle('is-scrolling', on);
    }
    function markScrolling() {
        setScrollingClass(true);
        clearTimeout(scrollingTimer);
        scrollingTimer = setTimeout(() => {
            scrollingTimer = 0;
            if (!rafId) setScrollingClass(false);
        }, 150);
    }

    function step(now) {
        const dt = Math.min(now - (lastTime || now - FRAME_60), 100);
        lastTime = now;
        const k = 1 - Math.pow(1 - EASE, dt / FRAME_60);
        current += (target - current) * k;
        if (Math.abs(target - current) < SNAP) current = target;
        paint(current);
        if (current === target) {
            rafId = 0;
            lastTime = 0;
            if (!scrollingTimer) setScrollingClass(false);
            return;
        }
        rafId = requestAnimationFrame(step);
    }

    function sync() {
        target = clampScroll(window.scrollY);
        if (reducedMotion.matches || document.hidden) {
            cancelAnimationFrame(rafId);
            rafId = 0;
            lastTime = 0;
            current = target;
            paint(current);
            return;
        }
        if (!rafId && current !== target) rafId = requestAnimationFrame(step);
    }

    window.addEventListener('scroll', () => {
        markScrolling();
        sync();
    }, { passive: true });

    function updateBodyHeight() {
        maxScroll = Math.max(0, centerContent.offsetHeight - centerFold.clientHeight);
        document.body.style.height = `${maxScroll + window.innerHeight}px`;
        current = clampScroll(current);
        rendered = NaN;
        paint(current);
        sync();
    }

    window.addEventListener('resize', updateBodyHeight);
    window.addEventListener('load', updateBodyHeight);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateBodyHeight);
    if ('ResizeObserver' in window) new ResizeObserver(updateBodyHeight).observe(centerContent);
    document.addEventListener('visibilitychange', sync);

    // The fold clips its content with overflow:hidden, and the browser will
    // still scroll it for focus, find-in-page and screen-reader navigation.
    // That desyncs the three folds, so turn any fold scroll into page scroll.
    // The browser revealed the match relative to what is on screen (`current`),
    // so the new page position is current + the fold's scroll offset.
    centerFold.addEventListener('scroll', () => {
        const dy = centerFold.scrollTop;
        centerFold.scrollTop = 0;
        centerFold.scrollLeft = 0;
        if (dy) window.scrollTo(0, clampScroll(current + dy));
    });

    // Keyboard focus: bring the focused element to the middle of the
    // centre fold, where the text is flat and readable. The fold easing
    // already smooths the move, so the page scroll itself is instant.
    centerContent.addEventListener('focusin', (e) => {
        const el = e.target;
        requestAnimationFrame(() => {
            centerFold.scrollTop = 0;
            const offset = el.getBoundingClientRect().top - centerContent.getBoundingClientRect().top;
            window.scrollTo(0, clampScroll(offset - centerFold.clientHeight / 2 + el.offsetHeight / 2));
        });
    });

    // --- Exhaust trail --------------------------------------------------
    createTrail(document.getElementById('trail'), finePointer, reducedMotion);

    updateBodyHeight();
    current = target;
    paint(current);
});

// Starfield: static stars are grouped into buckets by brightness and tint so
// canvas state changes ~16 times a frame, not once per star. Only ~15% of
// stars twinkle.
// Scroll redraws happen in the same frame as the folds; idle twinkle redraws
// are capped at 30fps, and nothing runs while the tab is hidden.
function createStarfield(canvas, reducedMotion) {
    const ctx = canvas.getContext('2d');
    const TWINKLE_SHARE = 0.15;
    const TWINKLE_INTERVAL = 1000 / 30;
    const LEVELS = 8;                       // brightness buckets
    const COLORS = ['#ffffff', '#fff6c4'];  // plain, tinted (bigger) stars
    const MIN_DEPTH = 0.05, MAX_DEPTH = 0.3;
    let w = 0, h = 0, dpr = 1;
    let groups = [];                        // static stars: { alpha, color, stars[] }
    let twinklers = [];
    let scrollY = 0;
    let twinkleTimer = 0, rafId = 0, lastDraw = 0;

    function build() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const count = Math.round((w * h) / 6500);
        const buckets = new Map();
        twinklers = [];
        for (let i = 0; i < count; i++) {
            const big = Math.random() < 0.08;
            const star = {
                x: Math.random() * w,
                y: Math.random() * h,
                r: big ? 0.9 + Math.random() * 0.3 : 0.3 + Math.random() * 0.6,
                round: big,                   // sub-2px stars read the same as squares
                color: big ? 1 : 0,
                depth: MIN_DEPTH + Math.random() * (MAX_DEPTH - MIN_DEPTH),
                base: 0.35 + Math.random() * 0.5,
                speed: 0.0004 + Math.random() * 0.0012,
                phase: Math.random() * Math.PI * 2,
            };
            if (Math.random() < TWINKLE_SHARE) { twinklers.push(star); continue; }
            const level = Math.round(((star.base - 0.1) / 0.9) * (LEVELS - 1));
            const key = level * 2 + star.color;
            if (!buckets.has(key)) buckets.set(key, { alpha: 0.1 + (0.9 * level) / (LEVELS - 1), color: COLORS[star.color], stars: [] });
            buckets.get(key).stars.push(star);
        }
        groups = [...buckets.values()];
    }

    function wrapY(s) {
        let y = (s.y - scrollY * s.depth) % h;
        return y < 0 ? y + h : y;
    }

    // One shape per star. Measured: batching all stars of a bucket into one
    // multi-shape path is cheaper on the main thread but loses Skia's fast
    // paths and costs ~10x more GPU raster. Sub-2px stars are plain rects
    // (indistinguishable from circles at that size); bigger ones stay round.
    function drawStar(s, y) {
        if (s.round) {
            ctx.beginPath();
            ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(s.x - s.r, y - s.r, s.r * 2, s.r * 2);
        }
    }

    function draw(time) {
        lastDraw = time;
        ctx.clearRect(0, 0, w, h);
        for (const g of groups) {
            ctx.globalAlpha = g.alpha;
            ctx.fillStyle = g.color;
            for (const s of g.stars) drawStar(s, wrapY(s));
        }
        const animate = !reducedMotion.matches;
        for (const s of twinklers) {
            const a = animate ? s.base + 0.3 * Math.sin(time * s.speed + s.phase) : s.base;
            ctx.globalAlpha = Math.max(0.1, Math.min(1, a));
            ctx.fillStyle = COLORS[s.color];
            drawStar(s, wrapY(s));
        }
        ctx.globalAlpha = 1;
    }

    const twinkles = () => !reducedMotion.matches && !document.hidden;

    function scheduleTwinkle() {
        clearTimeout(twinkleTimer);
        twinkleTimer = 0;
        if (!twinkles()) return;
        const wait = Math.max(0, TWINKLE_INTERVAL - (performance.now() - lastDraw));
        twinkleTimer = setTimeout(() => {
            twinkleTimer = 0;
            rafId = requestAnimationFrame((t) => {
                rafId = 0;
                if (t - lastDraw >= TWINKLE_INTERVAL - 2) draw(t);
                scheduleTwinkle();
            });
        }, wait);
    }

    function stop() {
        clearTimeout(twinkleTimer);
        cancelAnimationFrame(rafId);
        twinkleTimer = rafId = 0;
    }

    function restart() {
        stop();
        if (!document.hidden) draw(performance.now());
        scheduleTwinkle();
    }

    build();
    restart();
    window.addEventListener('resize', () => { build(); restart(); });
    document.addEventListener('visibilitychange', restart);
    if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', restart);

    return {
        // Called from the fold render loop, so parallax moves in step with the folds.
        // Skip the redraw until the deepest stars would move half a device pixel.
        setScroll(y) {
            const moved = Math.abs(y - scrollY) * MAX_DEPTH * dpr;
            if (moved < 0.5 || document.hidden) return;
            scrollY = y;
            draw(performance.now());
        },
    };
}

// Exhaust trail: a rAF loop that only runs while particles are alive, clears
// only the area the last frame drew, and ages particles by real time so the
// trail looks the same at 60Hz and 120Hz.
function createTrail(canvas, finePointer, reducedMotion) {
    const ctx = canvas.getContext('2d');
    const MAX = 160;
    const LIFE = 500;            // ms (about 30 frames at 60Hz)
    const FRAME_60 = 1000 / 60;
    let particles = [];
    let rafId = 0, lastTime = 0;
    let dpr = 1, w = 0, h = 0;
    let dirty = null;            // bounding box drawn last frame, CSS px

    const enabled = () => finePointer.matches && !reducedMotion.matches && !document.hidden;

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        dirty = null;
    }

    function clearDirty() {
        if (!dirty) return;
        ctx.clearRect(dirty.x0 - 2, dirty.y0 - 2, dirty.x1 - dirty.x0 + 4, dirty.y1 - dirty.y0 + 4);
        dirty = null;
    }

    function stop() {
        cancelAnimationFrame(rafId);
        rafId = 0;
        lastTime = 0;
    }

    function step(now) {
        const dt = Math.min(now - (lastTime || now - FRAME_60), 100);
        lastTime = now;
        const f = dt / FRAME_60;
        clearDirty();
        particles = particles.filter((p) => (p.age += dt) < LIFE);
        if (!particles.length) { stop(); return; }

        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const p of particles) {
            const t = p.age / LIFE;
            p.x += p.vx * f;
            p.y += p.vy * f;
            const r = Math.max(0.2, p.r * (1 - t));
            // yellow-white (255,246,196) to orange (255,122,26)
            ctx.globalAlpha = 1 - t;
            ctx.fillStyle = `rgb(255,${Math.round(246 - 124 * t)},${Math.round(196 - 170 * t)})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fill();
            if (p.x - r < x0) x0 = p.x - r;
            if (p.y - r < y0) y0 = p.y - r;
            if (p.x + r > x1) x1 = p.x + r;
            if (p.y + r > y1) y1 = p.y + r;
        }
        ctx.globalAlpha = 1;
        dirty = { x0, y0, x1, y1 };
        rafId = requestAnimationFrame(step);
    }

    window.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || !enabled()) return;
        const n = 1 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) {
            particles.push({
                x: e.clientX + 18 + (Math.random() - 0.5) * 3,
                y: e.clientY + 18 + (Math.random() - 0.5) * 3,
                vx: 0.3 + Math.random() * 0.6,
                vy: 0.3 + Math.random() * 0.6,
                r: 1 + Math.random() * 1.6,
                age: 0,
            });
        }
        if (particles.length > MAX) particles.splice(0, particles.length - MAX);
        if (!rafId) rafId = requestAnimationFrame(step);
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) return;
        stop();
        particles = [];
        ctx.clearRect(0, 0, w, h);
        dirty = null;
    });

    window.addEventListener('resize', resize);
    resize();
}
