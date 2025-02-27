"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const EarthGlobe: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const issRef = useRef<THREE.Object3D | null>(null);
    const trailRef = useRef<THREE.Line | null>(null);
    const earthRef = useRef<THREE.Mesh | null>(null);

    const [issData, setIssData] = useState({
        latitude: 0,
        longitude: 0,
        altitude: 0,
        speed: 0,
        place: "Unknown",
    });

    useEffect(() => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.z = 15;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        const mount = mountRef.current;
        mount?.appendChild(renderer.domElement);

        // Starry Background
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 5000;
        const positions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 2000;
        }
        starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1 });
        const stars = new THREE.Points(starGeometry, starMaterial);
        scene.add(stars);

        // Earth with Texture
        const earthRadius = 5;
        const earthGeometry = new THREE.SphereGeometry(earthRadius, 64, 64);
        const textureLoader = new THREE.TextureLoader();
        const earthTexture = textureLoader.load("/earth-texture.jpg");
        const earthMaterial = new THREE.MeshPhongMaterial({ map: earthTexture, shininess: 10 });
        const earth = new THREE.Mesh(earthGeometry, earthMaterial);
        scene.add(earth);
        earthRef.current = earth;

        // Latitude/Longitude Grid
        const gridMaterial = new THREE.LineBasicMaterial({ color: 0xaaaaaa, opacity: 0.2, transparent: true });
        const gridGroup = new THREE.Group();
        for (let lat = -90; lat <= 90; lat += 15) {
            const latGeometry = new THREE.BufferGeometry();
            const latPoints: THREE.Vector3[] = [];
            for (let lon = -180; lon <= 180; lon += 5) {
                const phi = THREE.MathUtils.degToRad(90 - lat);
                const theta = THREE.MathUtils.degToRad(lon);
                latPoints.push(new THREE.Vector3(
                    earthRadius * Math.sin(phi) * Math.cos(theta),
                    earthRadius * Math.cos(phi),
                    earthRadius * Math.sin(phi) * Math.sin(theta)
                ));
            }
            latGeometry.setFromPoints(latPoints);
            gridGroup.add(new THREE.Line(latGeometry, gridMaterial));
        }
        for (let lon = -180; lon <= 180; lon += 15) {
            const lonGeometry = new THREE.BufferGeometry();
            const lonPoints: THREE.Vector3[] = [];
            for (let lat = -90; lat <= 90; lat += 5) {
                const phi = THREE.MathUtils.degToRad(90 - lat);
                const theta = THREE.MathUtils.degToRad(lon);
                lonPoints.push(new THREE.Vector3(
                    earthRadius * Math.sin(phi) * Math.cos(theta),
                    earthRadius * Math.cos(phi),
                    earthRadius * Math.sin(phi) * Math.sin(theta)
                ));
            }
            lonGeometry.setFromPoints(lonPoints);
            gridGroup.add(new THREE.Line(lonGeometry, gridMaterial));
        }
        scene.add(gridGroup);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Stronger ambient
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(20, 10, 20);
        scene.add(directionalLight);
        const issSpotLight = new THREE.SpotLight(0xffffff, 10, 20, Math.PI / 4); // Super bright spotlight
        scene.add(issSpotLight);

        // Load ISS .glb Model
        const loader = new GLTFLoader();
        loader.load(
            "/iss.glb",
            (gltf) => {
                const iss = gltf.scene;
                // Adjust scale to be appropriate relative to the Earth
                // A much smaller scale so it doesn't intersect with the Earth
                iss.scale.set(0.05, 0.05, 0.05);
                iss.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.material = new THREE.MeshStandardMaterial({
                            color: 0xaaaaaa,
                            metalness: 0.7,
                            roughness: 0.3,
                        });
                    }
                });
                issRef.current = iss;
                scene.add(iss);
                console.log("ISS Model Loaded:", iss);
                console.log("ISS Initial Position:", iss.position);
            },
            (progress) => console.log("Loading ISS:", progress.loaded / progress.total * 100 + "%"),
            (error) => console.error("ISS Load Error:", error)
        );

        // ISS Trail
        const trailGeometry = new THREE.BufferGeometry();
        const trailMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
        const trailPositions = new Float32Array(100 * 3);
        trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
        const trail = new THREE.Line(trailGeometry, trailMaterial);
        trailRef.current = trail;
        scene.add(trail);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enablePan = true;
        controls.minDistance = 6;
        controls.maxDistance = 50;

        // Coordinate Mapping
        const latLonToVector3 = (lat: number, lon: number, radius: number): THREE.Vector3 => {
            const phi = THREE.MathUtils.degToRad(90 - lat);
            const theta = THREE.MathUtils.degToRad(lon);
            return new THREE.Vector3(
                radius * Math.sin(phi) * Math.cos(theta),
                radius * Math.cos(phi),
                radius * Math.sin(phi) * Math.sin(theta)
            );
        };

        const getPlaceName = async (lat: number, lon: number): Promise<string> => {
            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
                );
                const data = await response.json();
                return data.display_name || "Unknown";
            } catch {
                return "Unknown";
            }
        };

        const updateISSPosition = async () => {
            try {
                const response = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
                const data = await response.json();
                const lat = data.latitude as number;
                const lon = data.longitude as number;
                const alt = data.altitude as number;
                const speed = data.velocity as number;
                
                // Changed the altitude scaling factor to properly position the ISS above Earth
                // The ISS orbits at ~400km, which is about 6-7% of Earth's radius
                const issOrbitScale = 0.07;  // Proportion of Earth's radius
                const issRadius = earthRadius * (1 + issOrbitScale);

                const issPosition = latLonToVector3(lat, lon, issRadius);
                if (issRef.current) {
                    issRef.current.position.copy(issPosition);
                    
                    // Orient the ISS model to face tangentially to the Earth's surface
                    const up = issPosition.clone().normalize();
                    const axis = new THREE.Vector3(0, 1, 0);
                    const tangent = axis.cross(up).normalize();
                    
                    // Create a matrix to properly orient the ISS
                    const lookMatrix = new THREE.Matrix4();
                    lookMatrix.lookAt(
                        new THREE.Vector3(0, 0, 0), // from origin
                        tangent, // looking in the tangent direction
                        up // with "up" pointing away from Earth
                    );
                    
                    // Apply orientation
                    issRef.current.quaternion.setFromRotationMatrix(lookMatrix);
                    console.log("ISS Position Updated:", issPosition);
                }

                const place = await getPlaceName(lat, lon);
                setIssData({ latitude: lat, longitude: lon, altitude: alt, speed, place });

                console.log("ISS Data:", { lat, lon, place, position: issPosition });

                if (earthRef.current) {
                    earthRef.current.rotation.y = THREE.MathUtils.degToRad(-lon);
                }
            } catch (error) {
                console.error("Error fetching ISS data:", error);
            }
        };

        updateISSPosition();
        const issInterval = setInterval(updateISSPosition, 5000);

        const trailHistory: THREE.Vector3[] = [];
        const animate = () => {
            requestAnimationFrame(animate);

            if (issRef.current) {
                // Don't manually set rotation here as we're handling it in updateISSPosition
                
                issSpotLight.position.copy(issRef.current.position.clone().add(new THREE.Vector3(0, 1, 0)));
                issSpotLight.target = issRef.current;

                trailHistory.push(issRef.current.position.clone());
                if (trailHistory.length > 100) trailHistory.shift();
                if (trailRef.current) {
                    const positions = trailRef.current.geometry.attributes.position.array as Float32Array;
                    trailHistory.forEach((pos, i) => {
                        positions[i * 3] = pos.x;
                        positions[i * 3 + 1] = pos.y;
                        positions[i * 3 + 2] = pos.z;
                    });
                    trailRef.current.geometry.attributes.position.needsUpdate = true;
                    trailRef.current.geometry.setDrawRange(0, trailHistory.length);
                }
            }

            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            clearInterval(issInterval);
            if (mount && renderer.domElement) {
                mount.removeChild(renderer.domElement);
            }
            earthGeometry.dispose();
            earthMaterial.dispose();
            earthTexture.dispose();
        };
    }, []);

    return (
        <div style={{ position: "relative", width: "100vw", height: "100vh", background: "#0a0a0a" }}>
            <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
            <div style={{
                position: "absolute",
                top: 20,
                left: 20,
                background: "rgba(10, 10, 10, 0.85)",
                color: "#ffffff",
                padding: "15px 20px",
                borderRadius: "10px",
                fontFamily: "'Roboto', sans-serif",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.5)",
                backdropFilter: "blur(5px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
            }}>
                <h3 style={{ margin: "0 0 10px", fontSize: "1.2em", color: "#00aaff" }}>ISS Live Tracker</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em" }}>
                    <tbody>
                        <tr><td style={{ padding: "5px 0", color: "#aaaaaa" }}>Latitude:</td><td>{issData.latitude.toFixed(2)}°</td></tr>
                        <tr><td style={{ padding: "5px 0", color: "#aaaaaa" }}>Longitude:</td><td>{issData.longitude.toFixed(2)}°</td></tr>
                        <tr><td style={{ padding: "5px 0", color: "#aaaaaa" }}>Altitude:</td><td>{issData.altitude.toFixed(2)} km</td></tr>
                        <tr><td style={{ padding: "5px 0", color: "#aaaaaa" }}>Speed:</td><td>{issData.speed.toFixed(2)} km/h</td></tr>
                        <tr><td style={{ padding: "5px 0", color: "#aaaaaa" }}>Location:</td><td>{issData.place}</td></tr>
                    </tbody>
                </table>
                <div style={{ marginTop: "10px", fontSize: "0.8em", color: "#00aaff" }}>
                    ISS 3D Model - Updates every 5 seconds
                </div>
            </div>
            <div style={{
                position: "absolute",
                bottom: 10,
                right: 10,
                color: "#ffffff",
                fontSize: "0.8em",
                fontFamily: "'Roboto', sans-serif",
                background: "rgba(10, 10, 10, 0.7)",
                padding: "5px 15px",
                borderRadius: "5px",
            }}>
                Created by Ranjan | ranjan.shitole3129@gmail.com | Feb 2025
            </div>
        </div>
    );
};

export default EarthGlobe;