import React, {
    useEffect,
    useRef,
    useState,
    useImperativeHandle,
    forwardRef
} from 'react';
import * as THREE from 'three'
import ThreeGlobe from 'three-globe';
import {feature as topoToGeo} from 'topojson-client';
import {useTheme} from '../../contexts/ThemeContext';
import {createStarfield} from './starfield';
import {createGlowEffect} from './glowEffect';
import {createTooltip} from './tooltip';
import {getThemeColors,type ThemeColors} from './themeColors';
import {setupLighting} from './lighting';
import {generateArcsData, type ArcData} from './arcsData';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

export interface HighlightedCountry {
    country_code:string;
    name: string;
    color?: string;
}

export interface Location {
    id:string;
    name:string;
    lat:number;
    lng:number;
    country_code: string;
}

export type SpinningGlobeProps ={
    className?: string;
    countriesUrl?: string;
    autoRotateSpeed?: number;
    fillOpacity?: number;
    glowIntensity?: number;
    showStars?: boolean;
    pauseOnHover?: boolean;
    showArcs?: boolean;
    arcCount?: number;
    extended?: boolean;
    onReady?: () => void;
    highlightedCountries?: HighlightedCountry[];
    locations?: Location[];
    showLabels?: boolean;
    labelSize?:number;
    labelAltitude?:number;
    labelColor?: string;
    labelIncludeDot?: boolean;
    focusNorth?: boolean;
    focusLocation?: Location | null;
    isFocused?: boolean;
    onFocus?: (location: Location | null) => void;
};

export interface SpinningGlobeRef {
    updateExtendedMode: (isExtended: boolean) => void;
    updateTheme: (newThemeMode: string) => void;
    focusOnLocation: (location: Location) => void;
    resetView: () => void;
    globe: any;
}

const SpinningGlobe = forwardRef<SpinningGlobeRef, SpinningGlobeProps> (({
    className,
    countriesUrl= '/data/countries-110m.json',
    autoRotateSpeed = 0.001,
    fillOpacity = 0.3,
    glowIntensity = 0.15,
    showStars = true,
    showArcs = true,
    arcCount = 1,
    extended = false,
    onReady,
    highlightedCountries = [],
    locations = [],
    showLabels = true,
    labelSize = 0.2,
    labelAltitude = 0.012,
    labelColor,
    labelIncludeDot = false,
    focusLocation = null,
    isFocused = false,
    onFocus,
}, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const wheelTimer = useRef<any>(null);
    const globeRef = useRef<any>(null);
    const sceneRef = useRef<{
        scene?: THREE.Scene;
        camera?: THREE.PerspectiveCamera;
        renderer?:THREE.WebGLRenderer;
        glowMesh?: THREE.Mesh;
        pointLight?: THREE.PointLight;
        tooltip?: HTMLDivElement;
        controls?: any;
    }>({});
    const hasFocusedRef = useRef(false);
    const externalFocusRef = useRef(isFocused);
    const [needsReset, setNeedsReset] = React.useState(true);

    useEffect(() => {
        externalFocusRef.current = isFocused;
    },[isFocused]);

    const {themeMode} = useTheme();

    const [colors, setColors] = useState<ThemeColors>(() => 
        getThemeColors(themeMode, fillOpacity)
    );

    const getLabelColor = (override?: string, mode?: string) =>
        override ??((mode ?? themeMode) === 'dark' ? '#FFFFFF': '#111111');

    const [arcsData, setArcsData] = useState<ArcData[]>(
        showArcs ? generateArcsData(arcCount): []
    );

    const currentExtended = useRef(extended);
    const currentThemeMode = useRef(themeMode);
    const isAnimating = useRef(false);
    const userInteracting = useRef(false);

    const focusOnLocation = (location: Location) => {
        if(!globeRef.current || !sceneRef.current.camera) return;

        if(onFocus) onFocus(location);
        isAnimating.current = true;
        
        if(sceneRef.current.controls) {
            sceneRef.current.controls.enabled = false;
        }

        const camera = sceneRef.current.camera;

        const startCameraPos = camera.position.clone();
        const startRotation = new THREE.Euler().copy(globeRef.current.rotation);

        //Target position
        const targetCameraPos = new THREE.Vector3(0,0,100);
        const globeRotationTarget = new THREE.Euler(
            THREE.MathUtils.degToRad(location.lat),
            THREE.MathUtils.degToRad(-location.lng),
            0
        );
        
        const totalDuration = 1500;

        animateFocus();

        function animateFocus() {
            const startTime = Date.now();

            const step = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / totalDuration, 1);

                const ease = progress < 0.5
                    ? 4* progress * progress * progress
                    : 1-Math.pow(-2*progress +2,3)/2;
                
                camera.position.lerpVectors(startCameraPos,targetCameraPos,ease);

                globeRef.current.rotation.x =THREE.MathUtils.lerp(
                    startRotation.x,
                    globeRotationTarget.x,
                    ease
                );

                globeRef.current.rotation.y = THREE.MathUtils.lerp(
                    startRotation.y,
                    globeRotationTarget.y,
                    ease
                );
                globeRef.current.rotation.z = THREE.MathUtils.lerp(
                    startRotation.z,
                    globeRotationTarget.z,
                    ease
                );

                camera.lookAt(0,0,0);

                if(progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    isAnimating.current = false;

                    if(sceneRef.current.controls) {
                        sceneRef.current.controls.enabled = true;
                    }

                    setTimeout(() => {
                        userInteracting.current = false;
                    }, 500);
                }
            };
            step();
        }
    };

    const createHighlightedCountriesMap = () => {
        const idMap = new Map<string, string>();
        const nameMap = new Map<string, string>();

        highlightedCountries.forEach(country => {
            const color = colors.highlightFill;

            if(/^\d+$/.test(country.country_code)) {
                idMap.set(country.country_code, color);
            }

            nameMap.set(country.name.toLowerCase(), color);

            if(country.country_code)
                nameMap.set(country.country_code.toLowerCase(),color);
        });

        return {idMap, nameMap};
    };

    const generateLocationPointsData = () => {
        return locations.map(location => ({
            id:location.id,
            name:location.name,
            lat: location.lat,
            lng: location.lng,
            size: 0.4,
            color: colors.pointColor,
            country_code: location.country_code
        }));
    };

    const generateLocationArcsData = () => {
        const arcs = [];

        if(locations.length > 1) {
            for(let i = 0; i< locations.length-1; i++) {
                arcs.push({
                    startLat:locations[i].lat,
                    startLng:locations[i].lng,
                    endLat:locations[i+1].lat,
                    endLng:locations[i+1].lng,
                    color: '#4827af'
                });
            }

            if(locations.length > 2) {
                const first = locations[0];
                const last = locations[locations.length - 1];
                arcs.push({
                    startLat: last.lat,
                    startLng: last.lng,
                    endLat: first.lat,
                    endLng: first.lng,
                    color:'#4827af'
                });
            }
        }
        return arcs;
    };

    useEffect(() => {
        if(!globeRef.current) return;

        if(extended) {
            if(highlightedCountries.length > 0) {
                const highlightedCountriesMap = createHighlightedCountriesMap();

                globeRef.current.polygonCapColor((feature: any) => {
                    if(!feature || !feature.properties) return colors.fill;

                    const country_code = feature.properties.ISO_A2 ||
                                    feature.properties.ISO_A3 ||
                                    feature.id;

                    if(country_code && highlightedCountriesMap.idMap.has(country_code)) {
                        return highlightedCountriesMap.idMap.get(country_code);
                    }

                    return colors.fill;
                });
            } else {
                globeRef.current.polygonCapColor(() => colors.fill);
            }

            if(locations.length > 0) {
                const pointsData = generateLocationPointsData();

                globeRef.current
                    .pointsData(pointsData)
                    .pointColor('color')
                    .pointAltitude(0.01)
                    .pointRadius('size')
                    .pointsMerge(true);
                
                if(showLabels) {
                    globeRef.current
                        .labelsData(locations)
                        .labelText('name')
                        .labelLat('lat')
                        .labelLng('lng')
                        .labelColor(() => getLabelColor(labelColor))
                        .labelSize(labelSize)
                        .labelAltitude(labelAltitude)
                        .labelIncludeDot(labelIncludeDot)
                        .labelResolution(10);
                } else {
                    globeRef.current.labelsData([]);
                }

                if(locations.length > 1) {
                    const locationArcs = generateLocationArcsData();

                    if(showArcs) {
                        globeRef.current.arcsData([...arcsData, ...locationArcs]);
                    } else {
                        globeRef.current.arcsData(locationArcs);
                    }
                } else if (showArcs) {
                    globeRef.current.arcsData(arcsData);
                } else {
                    globeRef.current.arcsData([]);
                }
            } else if (showArcs) {
                globeRef.current.arcsData(arcsData);
                globeRef.current.labelsData([]);
            } else {
                globeRef.current.arcsData([]);
                globeRef.current.pointsData([]);
                globeRef.current.labelsData([]);
            }
        } else {
            globeRef.current.polygonCapColor(() => colors.fill);
            globeRef.current.arcsData([]);
            globeRef.current.pointsData([]);
            globeRef.current.labelsData([]);
        }
    },[extended, highlightedCountries, locations, colors.fill,colors.highlightFill, arcsData, showArcs, showLabels, labelSize, labelAltitude, labelColor, labelIncludeDot]);

    useEffect(() => {
        if(focusLocation && globeRef.current && sceneRef.current.camera){
            focusOnLocation(focusLocation);
        }
    }, [focusLocation]);

    useImperativeHandle(ref, () => ({
        updateExtendedMode: (isExtended: boolean) => {
            currentExtended.current = isExtended;

            if(globeRef.current) {
                if(isExtended) {
                    if(highlightedCountries.length > 0) {
                        const highlightedCountriesMap = createHighlightedCountriesMap();

                        globeRef.current.polygonCapColor((feature: any) => {
                            if(!feature || !feature.properties) return colors.fill;

                            const country_code = feature.properties.ISO_A2 ||
                                                feature.properties.ISO_A3 ||
                                                feature.id;
                            if(country_code && highlightedCountriesMap.idMap.has(country_code)) {
                                return highlightedCountriesMap.idMap.get(country_code);
                            }

                            return colors.fill;
                        });
                    }

                    if(locations.length > 0) {
                        const pointsData = generateLocationPointsData();
                        globeRef.current.pointsData(pointsData);

                        if(showLabels) {
                            globeRef.current
                                .labelsData(locations)
                                .labelText('name')
                                .labelLat('lat')
                                .labelLng('lng')
                                .labelColor(() => getLabelColor(labelColor))
                                .labelSize(labelSize)
                                .labelAltitude(labelAltitude)
                                .labelIncludeDot(labelIncludeDot)
                                .labelResolution(2);
                        }

                        if(showArcs) {
                            const newArcs = generateArcsData(arcCount);
                            setArcsData(newArcs);

                            if(locations.length > 1) {
                                const locationArcs = generateLocationArcsData();
                                globeRef.current.arcsData([...newArcs, ...locationArcs]);
                            } else {
                                globeRef.current.arcsData(newArcs);
                            }
                        } else if (locations.length > 1) {
                            const locationArcs = generateLocationArcsData();
                            globeRef.current.arcsData(locationArcs);
                        }
                    } else if (showArcs) {
                        const newArcs = generateArcsData(arcCount);
                        setArcsData(newArcs);
                        globeRef.current.arcsData(newArcs);
                    }
                } else {
                    globeRef.current.polygonCapColor(() => colors.fill);
                    globeRef.current.arcsData([]);
                    globeRef.current.pointsData([]);
                    globeRef.current.labelsData([]);
                }
            }
        },
    
    resetView: () => {
        if(!sceneRef.current.camera || !sceneRef.current.controls) return;

        if(onFocus) {
            onFocus(null);
        }

        setNeedsReset(true);

        isAnimating.current = true;
        
        const startPos = sceneRef.current.camera.position.clone();
        const endPos = new THREE.Vector3(0, 0 ,220);
        const currentRotation = new THREE.Euler().copy(globeRef.current.rotation);
        const targetRotation = new THREE.Euler(0,0,0);

        const duration = 3000;
        const startTime = Date.now();

        const animateReset = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed/ duration, 1);

            const ease = 1 - Math.pow(1- progress,3);
            sceneRef.current.camera?.position.lerpVectors(startPos,endPos, ease);

            globeRef.current.rotation.x = THREE.MathUtils.lerp(
                currentRotation.x,
                targetRotation.x,
                ease
            );

            globeRef.current.rotation.y = THREE.MathUtils.lerp(
                currentRotation.y,
                targetRotation.y,
                ease
            );

            globeRef.current.rotation.z = THREE.MathUtils.lerp(
                currentRotation.z,
                targetRotation.z,
                ease
            );

            sceneRef.current.camera?.lookAt(0, 0, 0);

            if(progress < 1) {
                requestAnimationFrame(animateReset);
            } else {
                isAnimating.current = false;

                if(sceneRef.current.controls) {
                    sceneRef.current.controls.reset();
                    userInteracting.current = false;
                }
            }
        };

        animateReset();

        if (sceneRef.current.controls) {
            sceneRef.current.controls.enabled = true;
        }
    },
    updateTheme: (newThemeMode: string) => {
        currentThemeMode.current = newThemeMode;
        const newColors = getThemeColors(newThemeMode, fillOpacity);
        setColors(newColors);

        if(globeRef.current) {
            globeRef.current.polygonStrokeColor(() => newColors.stroke);

            if(highlightedCountries.length > 0) {
                const {idMap} = createHighlightedCountriesMap();

                globeRef.current.polygonCapColor((feature: any) => {
                    if(!feature || !feature.properties) return newColors.fill;
                    
                    const country_code = feature.properties.ISO_A2 ||
                                        feature.properties.ISO_A3 ||
                                        feature.id;
                    
                    if(country_code && idMap.has(country_code)) {
                        return idMap.get(country_code);
                    }

                    return newColors.fill;
                });
            } else {
                globeRef.current.polygonCapColor(() => newColors.fill);
            }

            globeRef.current.arcColor(() => newColors.arcColor);
            globeRef.current.labelColor(() => getLabelColor(labelColor, newThemeMode));

            if(typeof globeRef.current.globeMaterial === 'function'){
                const mat = globeRef.current.globeMaterial();
                if(mat) {
                    mat.color.set(newColors.globeColor);
                    mat.needsUpdate = true;
                }
            }
        }
        if(sceneRef.current.glowMesh) {
            const material = sceneRef.current.glowMesh.material as THREE.ShaderMaterial;
            if(material?.uniforms?.glowColor){
                material.uniforms.glowColor.value = new THREE.Color(newColors.glow);
            }
        }
        if(sceneRef.current.pointLight) {
            sceneRef.current.pointLight.color.set(
                newThemeMode ==='dark'? 0x4827AF: 0xFF4208
            );
        }
        if(sceneRef.current.tooltip) {
            sceneRef.current.tooltip.style.background =
            newThemeMode === 'dark'
                ? 'rgba(72,39,175, 0.8)'
                : 'rgba(255,66,8,0.8)';
        }
    },
    focusOnLocation,
    get globe() {
        return globeRef.current;
    }

    }), []);

    useEffect(() => {
        const newColors = getThemeColors(themeMode, fillOpacity);
        setColors(newColors);

        if(globeRef.current) {
            globeRef.current.polygonStrokeColor(() => newColors.stroke);

            if(highlightedCountries.length > 0) {
                const {idMap, nameMap} = createHighlightedCountriesMap();

                globeRef.current.polygonCapColor((feature: any) => {
                    if(!feature || !feature.properties) return newColors.fill;

                    const country_code = feature.properties.ISO_A2 ||
                                        feature.properties.ISO_A3 ||
                                        feature.id;
                    
                    if(country_code && idMap.has(country_code.toString())) {
                        return idMap.get(country_code.toString());
                    }

                    const countryName = feature.properties.NAME || feature.properties.name;
                    if(countryName && nameMap.has(countryName.toLowerCase())) {
                        return nameMap.get(countryName.toLowerCase());
                    }

                    return newColors.fill;
                });
            } else {
                globeRef.current.polygonCapColor(() => newColors.fill);
            }

            globeRef.current.arcColor(() => newColors.arcColor);
            globeRef.current.labelColor(() => getLabelColor(labelColor));

            if(typeof globeRef.current.globeMaterial === 'function') {
                const mat = globeRef.current.globeMaterial();
                if(mat) {
                    mat.color.set(newColors.globeColor);
                    mat.needsUpdate = true;
                }
            }
        }
        if(sceneRef.current.glowMesh) {
            const material = sceneRef.current.glowMesh.material as THREE.ShaderMaterial;
            if(material?.uniforms?.glowColor) {
                material.uniforms.glowColor.value = new THREE.Color(newColors.glow);
            }
        }
        if(sceneRef.current.pointLight) {
            sceneRef.current.pointLight.color.set(
                themeMode === 'dark'? 0x4827AF: 0xff4208
            );
        }
        if(sceneRef.current.tooltip) {
            sceneRef.current.tooltip.style.background =
                themeMode ==='dark'
                ? 'rgba(72,39, 175, 0.8)'
                : 'rgba(255, 66, 8, 0.8)';
        }
    }, [themeMode, fillOpacity, highlightedCountries, labelColor]);

    useEffect(() => {
        const next = showArcs ? generateArcsData(arcCount): [];
        setArcsData(next);
    },[showArcs,arcCount]);

    useEffect(() => {
        if(!globeRef.current) return;

        if(showArcs) {
            if(locations.length > 1) {
                const locationArcs = generateLocationArcsData();
                globeRef.current.arcsData([...arcsData,...locationArcs]);
            } else {
                globeRef.current.arcsData(arcsData);
            }
        } else if (locations.length > 1) {
            const locationArcs = generateLocationArcsData();
            globeRef.current.arcsData(locationArcs);
        } else {
            globeRef.current.arcsData([]);
        }
    }, [arcsData, showArcs, locations]);

    useEffect(() => {
        if(!containerRef.current) return;
        const container = containerRef.current;

        const width = container.clientWidth || 600;
        const height = container.clientHeight || 600;

        const scene = new THREE.Scene();
        sceneRef.current.scene = scene;

        const camera = new THREE.PerspectiveCamera(50, width/height, 0.1, 1000);

        camera.position.set(0,0,220);

        sceneRef.current.camera = camera;

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,2));
        renderer.setSize(width, height);
        renderer.setClearColor(0x000000,0);
        container.appendChild(renderer.domElement);
        sceneRef.current.renderer = renderer;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.rotateSpeed = 0.5;

        const handleWheel = (event: WheelEvent) => {
            event.preventDefault();
            userInteracting.current = true;

            clearTimeout(wheelTimer.current);
            wheelTimer.current = setTimeout(() => {
                userInteracting.current = false;
            }, 1500);
        };

        container.addEventListener('wheel', handleWheel, {passive: false});

        controls.addEventListener('start', () => {
            userInteracting.current = true;
        });

        controls.addEventListener('end', () => {
            setTimeout(() => {
                userInteracting.current = false;
            }, 1500);
        })

        controls.enablePan = true;
        controls.panSpeed = 0.5;
        controls.screenSpacePanning = true;
        controls.enableZoom = true;
        controls.minDistance = 90;
        controls.maxDistance = 300;
        sceneRef.current.controls = controls;

        const lights = setupLighting(scene, themeMode);
        sceneRef.current.pointLight = lights.pointLight;

        const stars = showStars ? createStarfield(scene): null;
        const globe = new(ThreeGlobe as any)()
        .globeImageUrl(null)
        .polygonsTransitionDuration(200)
        .polygonAltitude(0.005)
        .polygonSideColor(()=> 'transparent')
        .polygonStrokeColor(()=> colors.stroke)
        .arcColor(() => colors.arcColor)
        .arcDashLength(0.4)
        .arcDashGap(0.2)
        .arcDashAnimateTime(6000)
        .arcStroke(0.5)
        .arcsTransitionDuration(4000)
        .arcAltitudeAutoScale(1)
        .pointColor('color')
        .pointAltitude(0.01)
        .pointRadius('size')
        .pointsMerge(true)
        .labelText('name')
        .labelLat('lat')
        .labelLng('lng')
        .labelColor(() => getLabelColor(labelColor))
        .labelSize(labelSize)
        .labelAltitude(labelAltitude)
        .labelIncludeDot(labelIncludeDot)
        .labelResolution(2);

        globe.polygonCapColor(() => colors.fill);

        if(typeof globe.globeMaterial === 'function') {
            const sphereMat = globe.globeMaterial();
            if(sphereMat) {
                sphereMat.visible = true;
                sphereMat.color = new THREE.Color(colors.globeColor);
                sphereMat.opacity = 1;
                sphereMat.transparent = true;
                sphereMat.needsUpdate = true;
            }
        }

        const glowMesh = createGlowEffect(colors.glow, glowIntensity);
        scene.add(glowMesh);
        sceneRef.current.glowMesh = glowMesh;

        globe.scale.set(0.8,0.8,0.8);

        globeRef.current = globe;
        scene.add(globe);

        fetch(countriesUrl)
            .then(res => res.json())
            .then( json => {
                let features: any[] = [];
                if(json.type ==='Topology') {
                    const objectKey= json.objects.countries
                        ?'countries'
                        : Object.keys(json.objects)[0];
                    const geo = topoToGeo(json,json.objects[objectKey]);
                    features = (geo as any).features || [];
                } else if(json.type ==='FeatureCollection'){
                    features = json.features || [];
                }

                globe.polygonsData(features);

                if(extended && highlightedCountries.length > 0) {
                    const {idMap, nameMap} = createHighlightedCountriesMap();

                    globe.polygonCapColor((feature: any) => {
                        if(!feature) return colors.fill;

                        if(feature.id && idMap.has(feature.id.toString())) {
                            return idMap.get(feature.id.toString());
                        }

                        if(feature.properties && feature.properties.name) {
                            const name = feature.properties.name.toLowerCase();
                            if(nameMap.has(name)) {
                                return nameMap.get(name);
                            }
                        }

                        return colors.fill;
                    });
                }
                if(onReady) {
                    onReady();
                }
            })
            .catch(err => {
                console.error('Failed to load countries JSON:',err);

                if(onReady) {
                    onReady();
                }
            });
        const tooltip = createTooltip(container, themeMode);
        sceneRef.current.tooltip = tooltip;

        const mouse = new THREE.Vector2();
        const raycaster = new THREE.Raycaster();

        const onMouseMove = (event: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left)/ width) *2 -1;
            mouse.y = -((event.clientY - rect.top)/ height)*2 +1;

            tooltip.style.left = `${event.clientX - rect.left +10}px`;
            tooltip.style.top = `${event.clientY - rect.top +10}px`;
        };
        container.addEventListener('mousemove', onMouseMove);

        let rafId: number;
        let isPaused = false;
        let wobbleAngle = 0;

        const animate = () => {
            rafId = requestAnimationFrame(animate);

            controls.update();

            if(!isPaused && !userInteracting.current && !isAnimating.current && !externalFocusRef.current){
                globe.rotation.y += autoRotateSpeed;
            }

            if(!isAnimating.current &&
                !externalFocusRef.current){
                wobbleAngle += 0.003;
                const wobbleAmount = 0.02;
                globe.rotation.x = Math.sin(wobbleAngle) * wobbleAmount;
                globe.rotation.z = Math.cos(wobbleAngle * 0.7) * wobbleAmount * 0.5;
            }


            if (
                glowMesh.material instanceof THREE.ShaderMaterial &&
                glowMesh.material.uniforms
            ){
                glowMesh.material.uniforms.viewVector.value = new THREE.Vector3().subVectors(
                    camera.position,
                    globe.position
                );
            }

            if(stars){
                stars.rotation.y += 0.0001;
                stars.rotation.x += 0.00005;
            }

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(globe, true);

            let tooltipText = ' ';
            if (intersects.length > 0) {
                const obj = intersects[0].object as any;

                if(obj.__data?.properties) {
                    tooltipText = obj.__data.properties.NAME || obj.__data.properties.name || ''; 
                }

                if (obj.__data?.name) {
                    tooltipText = obj.__data.name;
                }
            }

            if(tooltipText) {
                tooltip.textContent = tooltipText;
                tooltip.style.opacity = '1';
            } else {
                tooltip.style.opacity = '0';
            }

            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            if(!containerRef.current) return;
            const w = containerRef.current.clientWidth || width;
            const h = containerRef.current.clientHeight || height;
            renderer.setSize(w, h);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        };
        const ro = new ResizeObserver(handleResize);
        ro.observe(container);
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(rafId);
            ro.disconnect();
            window.removeEventListener('resize', handleResize);
            container.removeEventListener('mousemove', onMouseMove);
            container.removeEventListener('wheel', handleWheel);
            controls.dispose();
            scene.remove(globe);
            scene.remove(glowMesh);
            if (stars) scene.remove(stars);
            renderer.dispose();

            try {
                renderer.forceContextLoss?.();
            }catch {}

            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
            if (container.contains(tooltip)) {
                container.removeChild(tooltip);
            }
        };
    }, [countriesUrl]);

    useEffect(() => {
        if(!globeRef.current) return;

        if(highlightedCountries.length > 0) {
            const {idMap,nameMap} = createHighlightedCountriesMap();

            globeRef.current.polygonCapColor((feature: any) => {
                if(!feature) return colors.fill;

                if(feature.id && idMap.has(feature.id.toString())) {
                    return idMap.get(feature.id.toString());
                }

                if(feature.properties && feature.properties.name) {
                    const name = feature.properties.name.toLowerCase();
                    if(nameMap.has(name)) {
                        return nameMap.get(name);
                    }
                }
                
                return colors.fill;
            });
        }
        if(showArcs && arcsData.length > 0) {
            globeRef.current.arcsData(arcsData);
        }
        if(locations.length > 0) {
            const pointsData = generateLocationPointsData();
            globeRef.current.pointsData(pointsData);

            if(showLabels) {
                globeRef.current
                    .labelsData(locations)
                    .labelText('name')
                    .labelLat('lat')
                    .labelLng('lng')
                    .labelColor(() => getLabelColor(labelColor))
                    .labelSize(labelSize)
                    .labelAltitude(labelAltitude)
                    .labelIncludeDot(labelIncludeDot)
                    .labelResolution(2);
            }

            if(locations.length > 1) {
                const locationArcs = generateLocationArcsData();

                if(showArcs) {
                    globeRef.current.arcsData([...arcsData,...locationArcs]);
                } else {
                    globeRef.current.arcsData(locationArcs);
                }
            }
        } else {
            globeRef.current.polygonCapColor(()=> colors.fill);
            globeRef.current.arcsData([]);
            globeRef.current.pointsData([]);
            globeRef.current.labelsData([]);

            hasFocusedRef.current = false;
        }
    }, [extended, highlightedCountries, locations, showArcs, arcsData, showLabels, labelColor, labelSize, labelAltitude, focusLocation, colors.fill, colors.highlightFill]);

    return (
        <div 
            ref={containerRef}
            className={className}
            style={{
                width:'100%',
                height:'100%',
                pointerEvents: 'auto',
                zIndex: 0,
                position:'relative',
            }}
        />
    );
});

export default SpinningGlobe;