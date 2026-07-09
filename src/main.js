// ponytail: using GSAP from CDN to avoid build dependency churn

// YouTube Iframe API for robust background video looping
let ytPlayer;
window.onYouTubeIframeAPIReady = function() {
  ytPlayer = new YT.Player('bg-video', {
    videoId: 'iUtnZpzkbG8',
    playerVars: {
      'autoplay': 1, 'controls': 0, 'showinfo': 0, 'rel': 0, 'loop': 1, 
      'playlist': 'iUtnZpzkbG8', 'modestbranding': 1, 'mute': 1, 'playsinline': 1, 'disablekb': 1
    },
    events: {
      'onReady': (e) => { e.target.mute(); e.target.playVideo(); },
      'onStateChange': (e) => { if (e.data === YT.PlayerState.ENDED) e.target.playVideo(); }
    }
  });
};
const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
document.head.appendChild(tag);

document.addEventListener('DOMContentLoaded', () => {
  // Register ScrollTrigger
  gsap.registerPlugin(ScrollTrigger);

  // 1. Initial Load Animation (Hero)
  gsap.from(".hero-content", {
    y: 50,
    opacity: 0,
    duration: 1.2,
    ease: "power3.out",
    delay: 0.2
  });

  // 2. Parallax Video Background (Disabled for iframe stability)

  // 3. Staggered Grid Cards Entrance with 3D perspective
  gsap.utils.toArray('.cards-grid').forEach(grid => {
    gsap.from(grid.children, {
      z: -100,
      scale: 0.85,
      opacity: 0,
      rotationX: -15, // 3D tilt effect
      duration: 1,
      stagger: 0.2, // DOM dominoes
      ease: "power3.out",
      scrollTrigger: {
        trigger: grid,
        start: "top 85%", // when top of grid hits 85% of viewport
        toggleActions: "play none none reverse"
      }
    });
  });

  // 4. Floating Effect (Weightlessness)
  gsap.to(".ecosystem-card, .resource-card", {
    y: "-=10",
    duration: 2.5,
    ease: "sine.inOut",
    yoyo: true,
    repeat: -1,
    stagger: {
      amount: 1,
      from: "random"
    }
  });

  // 5. Conservation Card Entrance
  gsap.from(".wide-card", {
    scale: 0.9,
    opacity: 0,
    duration: 1,
    ease: "back.out(1.7)",
    scrollTrigger: {
      trigger: ".conservation-section",
      start: "top 75%",
      toggleActions: "play none none reverse"
    }
  });

  // 6. Hover Popup Effect (Crosshair/Mouse Cursor)
  const interactiveElements = document.querySelectorAll('.glass-card, .glass-btn, .nav-links a');
  interactiveElements.forEach(el => {
    // Only scale up if it's not the massive hero card to avoid weirdness
    const targetScale = el.classList.contains('hero-content') ? 1.01 : 1.05;
    
    el.addEventListener('mouseenter', () => {
      gsap.to(el, { scale: targetScale, duration: 0.3, ease: "power2.out", overwrite: "auto" });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(el, { scale: 1, duration: 0.3, ease: "power2.out", overwrite: "auto" });
    });
  });

  // 7. Water Ripple Effect on Click
  document.addEventListener('click', (e) => {
    createRipple(e.clientX, e.clientY, 0);
    createRipple(e.clientX, e.clientY, 0.2); // Double ripple
  });

  function createRipple(x, y, delay) {
    const ripple = document.createElement('div');
    ripple.className = 'water-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    document.body.appendChild(ripple);
    
    gsap.set(ripple, { xPercent: -50, yPercent: -50 });
    gsap.fromTo(ripple, 
      { scale: 0, opacity: 0.8 },
      { 
        scale: 8, 
        opacity: 0, 
        duration: 2, 
        delay: delay,
        ease: "power2.out",
        onComplete: () => ripple.remove() 
      }
    );
  }

  // 8. Custom Leaf Cursor
  const leafCursor = document.createElement('div');
  leafCursor.className = 'leaf-cursor';
  leafCursor.innerHTML = '🍁';
  document.body.appendChild(leafCursor);

  gsap.set(leafCursor, { xPercent: -50, yPercent: -50 });

  window.addEventListener('mousemove', (e) => {
    gsap.to(leafCursor, {
      x: e.clientX,
      y: e.clientY,
      duration: 0.15,
      ease: "power2.out",
      overwrite: "auto"
    });
  });
});
