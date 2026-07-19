import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initScene() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Lighting (Soft, Romantic)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffeaeb, 1);
    directionalLight.position.set(5, 5, 2);
    scene.add(directionalLight);

    const rimLight = new THREE.DirectionalLight(0xff4d6d, 0.5);
    rimLight.position.set(-5, 5, -2);
    scene.add(rimLight);

    // 3. 3D Object Setup
    // Group to hold the mesh so we can independently float it and scroll-animate it.
    const heartGroup = new THREE.Group();
    scene.add(heartGroup);

    // --- 3D HEART MODEL ---
    // Procedurally generated 3D heart shape
    const heartShape = new THREE.Shape();
    const x = 0, y = 0;
    heartShape.moveTo( x + 5, y + 5 );
    heartShape.bezierCurveTo( x + 5, y + 5, x + 4, y, x, y );
    heartShape.bezierCurveTo( x - 6, y, x - 6, y + 7, x - 6, y + 7 );
    heartShape.bezierCurveTo( x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19 );
    heartShape.bezierCurveTo( x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7 );
    heartShape.bezierCurveTo( x + 16, y + 7, x + 16, y, x + 10, y );
    heartShape.bezierCurveTo( x + 7, y, x + 5, y + 5, x + 5, y + 5 );

    const extrudeSettings = { depth: 2, bevelEnabled: true, bevelSegments: 3, steps: 2, bevelSize: 1, bevelThickness: 1 };
    const geometry = new THREE.ExtrudeGeometry( heartShape, extrudeSettings );
    
    // Center and orient the heart correctly
    geometry.center();
    geometry.rotateZ(Math.PI); // Flip it upright
    geometry.scale(0.08, 0.08, 0.08); // Scale it down

    const material = new THREE.MeshStandardMaterial({
        color: 0xff4d6d,
        roughness: 0.1,
        metalness: 0.3,
    });
    let heartMesh = new THREE.Mesh(geometry, material);
    heartGroup.add(heartMesh);
    // --- 3D PARTICLE SYSTEM (VISUALS) ---
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 150;
    const posArray = new Float32Array(particlesCount * 3);
    for(let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 10; // Spread across scene
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.05,
        color: 0xffeaeb,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Initial position: align to the left side of the screen
    let isMobile = window.innerWidth < 768;
    heartMesh.position.x = isMobile ? -1 : -2;
    if (isMobile) heartMesh.scale.set(0.05, 0.05, 0.05); // Smaller heart for mobile

    // 4. Base Floating Animation (Breathing Effect)
    const clock = new THREE.Clock();
    
    function animate() {
        requestAnimationFrame(animate);
        
        const elapsedTime = clock.getElapsedTime();
        // Gentle floating up and down
        heartGroup.position.y += Math.sin(elapsedTime * 2) * 0.002;
        
        // Slowly rotate particles
        particlesMesh.rotation.y = elapsedTime * 0.05;
        particlesMesh.rotation.x = elapsedTime * 0.02;

        renderer.render(scene, camera);
    }
    animate();

    // 5. GSAP ScrollTrigger Logic
    
    // We animate the heartMesh directly so it doesn't fight with the heartGroup's floating logic
    gsap.to(heartMesh.position, {
        x: isMobile ? 1 : 2, // Shift Right (smaller shift on mobile)
        y: isMobile ? -1.5 : -0.5, // Shift Down
        ease: "none",
        scrollTrigger: {
            trigger: ".section-about",
            start: "top bottom", 
            end: "center center", 
            scrub: 1, 
        }
    });

    gsap.to(heartMesh.rotation, {
        y: Math.PI * 2, // Exactly one full 360 degree rotation
        ease: "none",
        scrollTrigger: {
            trigger: ".section-about",
            start: "top bottom",
            end: "center center",
            scrub: 1,
        }
    });

    // Reset rotation past Section 2
    gsap.to(heartMesh.position, {
        y: 3, // Move it up and out of the way for the App section
        opacity: 0,
        ease: "power2.in",
        scrollTrigger: {
            trigger: ".section-app",
            start: "top bottom",
            end: "top center",
            scrub: 1,
        }
    });

    // 6. Responsive Handling
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
