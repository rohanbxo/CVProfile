document.addEventListener('DOMContentLoaded', () => {
    const EMAIL = 'rohanburugapalli@gmail.com';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    // Phones and small screens get the lighter rendering path.
    const mobile = window.matchMedia('(hover: none) and (pointer: coarse), (max-width: 768px)');

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
    const stars = createStarfield(document.getElementById('stars'), reducedMotion, mobile);

    // --- 3D folded scroll ----------------------------------------------
    // #center-fold is the real, native scroll container. The top and bottom
    // folds are decorative mirrors (aria-hidden, inert) that follow its
    // scrollTop: via a CSS scroll-driven animation where supported (runs on
    // the compositor with the scroll), otherwise via one rAF per scroll.
    const centerFold = document.getElementById('center-fold');
    const centerContent = document.getElementById('center-content');
    document.getElementById('top-content').innerHTML = centerContent.innerHTML;
    document.getElementById('bottom-content').innerHTML = centerContent.innerHTML;

    const mirrors = document.querySelectorAll('.foldTop .fold-content, .foldBottom .fold-content');
    const progressFill = document.querySelector('.progress-fill');
    const useTimeline = window.CSS && CSS.supports
        && CSS.supports('animation-timeline: scroll()')
        && CSS.supports('timeline-scope: --fold');
    if (useTimeline) document.documentElement.classList.add('sda');
    let maxScroll = 0;

    function measure() {
        maxScroll = Math.max(0, centerFold.scrollHeight - centerFold.clientHeight);
        document.documentElement.style.setProperty('--max-scroll', `${maxScroll}px`);
        render();
    }

    function render() {
        // Clamp: iOS rubber-band overscroll can report out-of-range values.
        const y = Math.max(0, Math.min(centerFold.scrollTop, maxScroll));
        if (!useTimeline) {
            const t = `translate3d(0, ${-y}px, 0)`;
            mirrors.forEach((el) => { el.style.transform = t; });
            progressFill.style.transform = `scaleY(${maxScroll ? y / maxScroll : 0})`;
        }
        stars.onScroll(y);
    }

    let ticking = false;
    centerFold.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            ticking = false;
            render();
        });
    }, { passive: true });

    // Phones fire resizes as the address bar moves; only a width change (or
    // a big height change) alters the scroll range. The folds use dvh there.
    let lastW = window.innerWidth, lastH = window.innerHeight;
    window.addEventListener('resize', () => {
        const w = window.innerWidth, h = window.innerHeight;
        if (mobile.matches && w === lastW && Math.abs(h - lastH) <= 150) return;
        lastW = w;
        lastH = h;
        measure();
    });
    window.addEventListener('load', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    if ('ResizeObserver' in window) {
        const ro = new ResizeObserver(measure);
        ro.observe(centerContent);
        ro.observe(centerFold);
    }

    // The page itself does not scroll, so input that lands outside the
    // centre fold (mirror strips, margins) is passed on to it.
    const outside = (target) => !centerFold.contains(target);

    window.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.defaultPrevented || !outside(e.target)) return;
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? centerFold.clientHeight : 1;
        e.preventDefault();
        centerFold.scrollBy({ top: e.deltaY * unit, behavior: 'instant' });
    }, { passive: false });

    // Touch on the strips: passive listeners (they never block native
    // scrolling of the fold), with a short glide on release.
    let touchY = null, touchT = 0, velocity = 0;
    window.addEventListener('touchstart', (e) => {
        touchY = e.touches.length === 1 && outside(e.target) ? e.touches[0].clientY : null;
        touchT = performance.now();
        velocity = 0;
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
        if (touchY === null) return;
        const y = e.touches[0].clientY, now = performance.now();
        const dy = touchY - y;
        centerFold.scrollTop += dy;
        velocity = dy / Math.max(1, now - touchT);
        touchY = y;
        touchT = now;
    }, { passive: true });
    window.addEventListener('touchend', () => {
        if (touchY === null) return;
        touchY = null;
        if (Math.abs(velocity) > 0.2 && performance.now() - touchT < 100) {
            centerFold.scrollBy({ top: velocity * 300, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
        }
    }, { passive: true });

    // Keyboard: when nothing inside the fold has focus, the browser has no
    // scroller to send Space/arrows/PageDown to, so route them to the fold.
    const keySteps = {
        ArrowDown: () => 40, ArrowUp: () => -40,
        PageDown: () => centerFold.clientHeight * 0.85, PageUp: () => -centerFold.clientHeight * 0.85,
        ' ': (e) => (e.shiftKey ? -1 : 1) * centerFold.clientHeight * 0.85,
        Home: () => -Infinity, End: () => Infinity,
    };
    document.addEventListener('keydown', (e) => {
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        const t = e.target;
        const free = t === document.body || t === document.documentElement
            || (t.tagName === 'A' && outside(t));
        if (!free) return;
        const step = keySteps[e.key];
        if (!step) return;
        e.preventDefault();
        const d = step(e);
        const behavior = reducedMotion.matches ? 'instant' : 'smooth';
        if (d === Infinity || d === -Infinity) centerFold.scrollTo({ top: d > 0 ? maxScroll : 0, behavior });
        else centerFold.scrollBy({ top: d, behavior });
    });

    // Keyboard focus: bring the focused element to the middle of the
    // centre fold, where the text is flat and readable.
    centerContent.addEventListener('focusin', (e) => {
        const el = e.target;
        requestAnimationFrame(() => {
            const offset = el.getBoundingClientRect().top - centerContent.getBoundingClientRect().top;
            const target = offset - centerFold.clientHeight / 2 + el.offsetHeight / 2;
            centerFold.scrollTo({
                top: Math.max(0, Math.min(maxScroll, target)),
                behavior: reducedMotion.matches ? 'instant' : 'smooth',
            });
        });
    });

    // --- Exhaust trail --------------------------------------------------
    createTrail(document.getElementById('trail'), finePointer, reducedMotion);

    measure();
});

// On mobile the starfield is static: half the stars, DPR 1, no twinkle loop,
// redrawn only on a width change and (throttled to 30fps) for parallax.
function createStarfield(canvas, reducedMotion, mobile) {
    const ctx = canvas.getContext('2d');
    const MOBILE_FRAME = 1000 / 30;
    let w = 0, h = 0, dpr = 1, list = [], scrollY = 0, rafId = 0;
    let lastDraw = 0, trailing = 0, builtWidth = 0;

    function build() {
        dpr = mobile.matches ? 1 : Math.min(window.devicePixelRatio || 1, 2);
        builtWidth = window.innerWidth;
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const count = Math.round((w * h) / (mobile.matches ? 13000 : 6500));
        list = Array.from({ length: count }, () => {
            const big = Math.random() < 0.08;
            return {
                x: Math.random() * w,
                y: Math.random() * h,
                r: big ? 0.9 + Math.random() * 0.3 : 0.3 + Math.random() * 0.6,
                color: big ? '#fff6c4' : '#ffffff',
                depth: 0.05 + Math.random() * 0.25,
                base: 0.35 + Math.random() * 0.5,
                speed: 0.0004 + Math.random() * 0.0012,
                phase: Math.random() * Math.PI * 2,
            };
        });
    }

    function draw(time) {
        lastDraw = performance.now();
        ctx.clearRect(0, 0, w, h);
        const animate = !reducedMotion.matches;
        for (const s of list) {
            let y = (s.y - scrollY * s.depth) % h;
            if (y < 0) y += h;
            const twinkle = animate ? 0.3 * Math.sin(time * s.speed + s.phase) : 0;
            ctx.globalAlpha = Math.max(0.1, Math.min(1, s.base + twinkle));
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function loop(time) {
        draw(time);
        rafId = requestAnimationFrame(loop);
    }

    function start() {
        cancelAnimationFrame(rafId);
        rafId = 0;
        if (mobile.matches || reducedMotion.matches || document.hidden) {
            draw(0);
        } else {
            rafId = requestAnimationFrame(loop);
        }
    }

    build();
    start();
    window.addEventListener('resize', () => {
        // Mobile: ignore the address bar's height changes; rebuild on width only.
        if (mobile.matches && window.innerWidth === builtWidth) return;
        build();
        if (!rafId) draw(0);
    });
    document.addEventListener('visibilitychange', start);
    if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', start);
    if (mobile.addEventListener) mobile.addEventListener('change', () => { build(); start(); });

    return {
        onScroll(y) {
            scrollY = y;
            if (rafId) return;
            if (!mobile.matches) { draw(0); return; } // static mode only redraws on scroll
            // Mobile: parallax redraws at most 30 times a second, plus one
            // trailing draw so the stars land where the scroll stopped.
            const wait = MOBILE_FRAME - (performance.now() - lastDraw);
            if (wait <= 0) { clearTimeout(trailing); trailing = 0; draw(0); return; }
            if (!trailing) trailing = setTimeout(() => { trailing = 0; draw(0); }, wait);
        },
    };
}

function createTrail(canvas, finePointer, reducedMotion) {
    const ctx = canvas.getContext('2d');
    const MAX = 160;
    const LIFE = 30;
    let particles = [];
    let rafId = 0;
    let dpr = 1, w = 0, h = 0;

    const enabled = () => finePointer.matches && !reducedMotion.matches;

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function step() {
        ctx.clearRect(0, 0, w, h);
        particles = particles.filter((p) => ++p.age < LIFE);
        for (const p of particles) {
            const t = p.age / LIFE;
            p.x += p.vx;
            p.y += p.vy;
            // yellow-white (255,246,196) → orange (255,122,26)
            const g = Math.round(246 - 124 * t);
            const b = Math.round(196 - 170 * t);
            ctx.globalAlpha = 1 - t;
            ctx.fillStyle = `rgb(255,${g},${b})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.2, p.r * (1 - t)), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        rafId = particles.length ? requestAnimationFrame(step) : 0;
    }

    window.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || !enabled()) return;
        const n = 1 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) {
            particles.push({
                x: e.clientX + 12 + (Math.random() - 0.5) * 3,
                y: e.clientY + 12 + (Math.random() - 0.5) * 3,
                vx: 0.3 + Math.random() * 0.6,
                vy: 0.3 + Math.random() * 0.6,
                r: 1 + Math.random() * 1.6,
                age: 0,
            });
        }
        if (particles.length > MAX) particles.splice(0, particles.length - MAX);
        if (!rafId) rafId = requestAnimationFrame(step);
    }, { passive: true });

    window.addEventListener('resize', resize);
    resize();
}
