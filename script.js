document.addEventListener('DOMContentLoaded', () => {
    // 1. Theme Switcher (The Grand Budapest Switch)
    const themeSwitcher = document.getElementById('theme-switcher');
    const themes = ['', 'theme-budapest', 'theme-moonrise', 'theme-aquatic'];
    let currentThemeIndex = 0;

    themeSwitcher.addEventListener('click', () => {
        // Remove current theme
        if (themes[currentThemeIndex] !== '') {
            document.body.classList.remove(themes[currentThemeIndex]);
        }
        
        // Move to next theme
        currentThemeIndex = (currentThemeIndex + 1) % themes.length;
        
        // Add new theme
        if (themes[currentThemeIndex] !== '') {
            document.body.classList.add(themes[currentThemeIndex]);
        }
    });

    // 2. Hidden Item & Modal (The "Mendl's" Secret)
    const hiddenKey = document.getElementById('hidden-key');
    const modal = document.getElementById('secret-modal');
    const closeBtn = document.querySelector('.close-btn');

    hiddenKey.addEventListener('click', () => {
        modal.classList.add('show');
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.classList.remove('show');
        }
    });

    // 3. Smooth Cursor Trailer (Wes Anderson's Camera Trailer)
    const trailer = document.getElementById('cursor-trailer');
    let mouseX = 0;
    let mouseY = 0;
    let trailerX = 0;
    let trailerY = 0;
    const speed = 0.15; // Easing speed

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Reveal trailer on first move
        if (trailer.style.opacity !== '1') {
            trailer.style.opacity = '1';
        }

        // Active state when hovering interactive elements
        const target = e.target;
        const isInteractive = target.closest('a') || 
                              target.closest('button') || 
                              target.closest('.card') || 
                              target.closest('.ornament') || 
                              target.closest('.hidden-item') || 
                              target.closest('.close-btn');
        
        if (isInteractive) {
            trailer.classList.add('active');
        } else {
            trailer.classList.remove('active');
        }
    });

    function animateTrailer() {
        // Linear interpolation for smooth lag effect
        const distX = mouseX - trailerX;
        const distY = mouseY - trailerY;
        
        trailerX += distX * speed;
        trailerY += distY * speed;
        
        // Apply transformation using translation
        trailer.style.transform = `translate3d(${trailerX}px, ${trailerY}px, 0)`;
        
        requestAnimationFrame(animateTrailer);
    }
    animateTrailer();

    // Hide trailer when leaving window
    document.addEventListener('mouseleave', () => {
        trailer.style.opacity = '0';
    });
    
    document.addEventListener('mouseenter', () => {
        trailer.style.opacity = '1';
    });

    // 4. Interactive Card Flip (Mobile-friendly click toggle)
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            // Check if user clicked inside the modal content to prevent unwanted flips
            if (e.target.closest('.modal-content')) return;
            
            // Toggle flip state
            card.classList.toggle('is-flipped');
        });
    });
});
