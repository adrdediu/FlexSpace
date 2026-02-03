import * as THREE from 'three';

export function createGlowEffect(glowColor: string, glowIntensity: number): THREE.Mesh {
    const glowGeometry = new THREE.SphereGeometry(100, 64,64);
    const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            'c': {value: 0},
            'p': {value: 0},
            'glowColor': {value: new THREE.Color(glowColor)},
            'viewVector': {value: new THREE.Vector3(0,0,220)}
        },
        vertexShader: `
            uniform vec3 viewVector;
            varying float intensity;
            void main () {
                vec3 vNormal = normalize(normalMatrix * normal);
                vec3 vNormel = normalize(normalMatrix * viewVector);
                intensity = pow(0.72 - dot(vNormal, vNormel), 2.0);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 glowColor;
            uniform float c;
            uniform float p;
            varying float intensity;
            void main() {
                vec3 glow = glowColor * c * pow(intensity, p);
                gl_FragColor = vec4(glow, intensity * ${glowIntensity});
            }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true
    });

    const glowMesh = new THREE.Mesh(glowGeometry,glowMaterial);
    glowMesh.scale.set(0.8,0.8,0.8);
    return glowMesh;
}