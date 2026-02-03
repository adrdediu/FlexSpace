import * as THREE from 'three';

export function createStarfield(scene: THREE.Scene): THREE.Points {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 3000;
    const positions = new Float32Array(starCount*3);
    const sizes = new Float32Array(starCount);

    for(let i = 0; i< starCount; i++) {
        const phi = Math.acos(2* Math.random() -1);
        const theta = 2 * Math.PI * Math.random();
        const radius = 400 + Math.random() *200;

        positions[i*3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i*3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i*3 + 2] = radius * Math.cos(phi);

        sizes[i] = Math.random() *1.5 + 0.5;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions,3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.5,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.8
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    return stars;
}