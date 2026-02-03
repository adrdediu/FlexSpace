import * as THREE from 'three';

export function setupLighting(scene: THREE.Scene, themeMode: string) {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(-1,1,1);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
    backLight.position.set(1,-1,-1);
    scene.add(backLight);

    const pointLight = new THREE.PointLight(
        themeMode === 'dark' ? 0x4827AF: 0xFF4208,
        0.8,
        200
    );
    pointLight.position.set(0,0,0);
    scene.add(pointLight);

    return {
        ambientLight,directionalLight,backLight,pointLight
    };
}