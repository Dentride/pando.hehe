import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initScene } from './scene.js';

gsap.registerPlugin(ScrollTrigger);

// Init Landing Page
function init() {
    initScene();
    
    // Reveal animation for all .scroll-reveal elements
    gsap.utils.toArray('.scroll-reveal').forEach((elem) => {
        gsap.from(elem, {
            y: 50,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: elem,
                start: 'top 85%', // Triggers when the top of the element is 85% down the viewport
                toggleActions: 'play none none reverse' // Reverses when scrolling back up
            }
        });
    });

    document.getElementById('btn-start').addEventListener('click', () => {
        window.location.href = '/app.html';
    });
}

init();
