document.addEventListener("DOMContentLoaded", () => {
    // --- Loading Screen Jet Animation ---
    const loader = document.getElementById('loader');
    
    // We let the CSS animation run (1.8s duration). After it's nearly off-screen, fade out the black background.
    setTimeout(() => {
        loader.classList.add('hidden');
    }, 1000); // 1. seconds in

    // --- Copy Email Logic ---
    const copyEmailBtn = document.getElementById('copy-email-btn');
    const toast = document.getElementById('toast');
    
    copyEmailBtn.addEventListener('click', (e) => {
        e.preventDefault(); // prevents page from jumping to top
        navigator.clipboard.writeText('rohanburugapalli@gmail.com').then(() => {
            toast.classList.remove('hidden');
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 3000); // hide the toast after 3 seconds
        });
    });

    // --- Music Toggle Logic ---
    const music = document.getElementById('bg-music');
    const musicToggle = document.getElementById('music-toggle');
    const iconOn = document.getElementById('music-icon-on');
    const iconOff = document.getElementById('music-icon-off');
    let playing = false;

    musicToggle.addEventListener('click', () => {
        if (playing) {
            music.pause();
            iconOn.style.display = 'none';
            iconOff.style.display = '';
        } else {
            music.play().catch(() => {});
            iconOn.style.display = '';
            iconOff.style.display = 'none';
        }
        playing = !playing;
    });

    // --- 3D Folding Logic ---
    // 1. First, duplicate the actual inner content into the top and bottom folds
    //    so we only have to write our HTML once.
    const actualContent = document.getElementById('actual-content').outerHTML;
    document.getElementById('top-content').innerHTML = actualContent;
    document.getElementById('bottom-content').innerHTML = actualContent;

    // 2. Select elements we need to animate over scroll
    const centerFold = document.getElementById('center-fold');
    const foldsContent = document.querySelectorAll('.fold-content'); // grabs top, center, bottom
    const centerContent = document.getElementById('center-content');
    
    // We need to store original body height so resetting on resize works perfectly
    const originalBodyHeight = document.body.style.height;

    // Calculate how tall the page actually needs to be
    function updateBodyHeight() {
        // How much taller is the content inside the box than the box itself?
        const overflowHeight = centerContent.clientHeight - centerFold.clientHeight;
        
        // Make the body height = overflow + 1 viewport height
        document.body.style.height = `${overflowHeight + window.innerHeight}px`;
    }

    // Scroll loop using requestAnimationFrame for 60fps smoothness
    function tick() {
        // Find current scroll position
        const scroll = -(window.scrollY || document.documentElement.scrollTop || 0);
        
        // Translate the inner content of all 3 folds simultaneously up
        // Because of our CSS transforms (transform: translateY(100% / -100%)) 
        // they visually align completely seamlessly on the seams
        foldsContent.forEach((content) => {
            content.style.transform = `translateY(${scroll}px)`;
        });
        
        requestAnimationFrame(tick);
    }

    // Recalculate if user resizes the browser window
    window.addEventListener('resize', updateBodyHeight);
    
    // Initialize everything
    updateBodyHeight();
    requestAnimationFrame(tick);
});