import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "lil-gui";
import waterVertexShader from "./shaders/water/vertex.glsl";
import waterFragmentShader from "./shaders/water/fragment.glsl";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

/**
 * Base
 */

// Debug
const gui = new dat.GUI({ width: 340 });
const debugObject = {};

// Colors
debugObject.depthColor = "#186691";
debugObject.surfaceColor = "#9bd8ff";

// Scene
const scene = new THREE.Scene();

// Canvas
const canvas = document.querySelector("canvas.webgl");

// GLTF Loader
const loader = new GLTFLoader();

let ship; // Placeholder for the ship model
loader.load(
    "/model.glb", // Path to the .glb file
    (gltf) => {
        ship = gltf.scene;
        scene.add(ship);

        // Optional: Animate the model if it contains animations
        const mixer = new THREE.AnimationMixer(ship);
        gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
    },
    (xhr) => {
        console.log(`Loaded ${(xhr.loaded / xhr.total) * 100}%`);
    },
    (error) => {
        console.error("An error occurred while loading the GLB model:", error);
    }
);

/**
 * Water
 */
const waterGeometry = new THREE.PlaneGeometry(4, 4, 128, 128);

const waterMaterial = new THREE.ShaderMaterial({
    vertexShader: waterVertexShader,
    fragmentShader: waterFragmentShader,
    uniforms: {
        uTime: { value: 0 },
        uBigWavesSpeed: { value: 0.75 },
        uBigWavesElevation: { value: 0.062 },
        uBigWavesFrequency: { value: new THREE.Vector2(5.259, 1.856) },
        uDepthColor: { value: new THREE.Color(debugObject.depthColor) },
        uSurfaceColor: { value: new THREE.Color(debugObject.surfaceColor) },
        uColorOffset: { value: 0.05 },
        uColorMultiplier: { value: 5 },
    },
});

const water = new THREE.Mesh(waterGeometry, waterMaterial);
water.rotation.x = -Math.PI * 0.5;
scene.add(water);

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
};

window.addEventListener("resize", () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(
    75,
    sizes.width / sizes.height,
    0.1,
    100
);
camera.position.set(1, 1, 1);
scene.add(camera);

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

/**
 * Controls
 */
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Utility Functions
 */

// Calculate wave height at (x, z) based on shader logic
const calculateWaveHeight = (x, z, time) => {
    const frequency = waterMaterial.uniforms.uBigWavesFrequency.value;
    const elevation = waterMaterial.uniforms.uBigWavesElevation.value;
    const speed = waterMaterial.uniforms.uBigWavesSpeed.value;

    return (
        (Math.sin(x * frequency.x + time * speed) +
            Math.cos(z * frequency.y + time * speed)) *
        elevation
    );
};

// Calculate wave slope at (x, z) based on shader logic
const calculateWaveSlope = (x, z, time) => {
    const frequency = waterMaterial.uniforms.uBigWavesFrequency.value;
    const speed = waterMaterial.uniforms.uBigWavesSpeed.value + 1.5;

    const dx = Math.cos(x * frequency.x + time * speed) * frequency.x;
    const dz = -Math.sin(z * frequency.y + time * speed) * frequency.y;

    return { dx, dz };
};

/**
 * Animate
 */
const clock = new THREE.Clock();

const tick = () => {
    const elapsedTime = clock.getElapsedTime();

    controls.update();
    waterMaterial.uniforms.uTime.value = elapsedTime;

    // Update ship position and rotation
    if (ship) {
        const waveHeight = calculateWaveHeight(
            ship.position.x,
            ship.position.z,
            elapsedTime
        );
        const { dx, dz } = calculateWaveSlope(
            ship.position.x,
            ship.position.z,
            elapsedTime
        );

        ship.position.y = waveHeight * 0.1 + 0.15; // Scale the wave effect by 0.5
        ship.rotation.x = dz * 0.015; // Rocking on x-axis
        ship.rotation.z = -dx * 0.015; // Rocking on z-axis
    }

    renderer.render(scene, camera);

    window.requestAnimationFrame(tick);
};

tick();
