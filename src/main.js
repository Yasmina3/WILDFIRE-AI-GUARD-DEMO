import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import gsap from 'gsap';
import './style.css';

// --- CONFIG & CONSTANTS ---
const COLORS = {
    forest: 0x2d5a27,
    sand: 0xd2b48c,
    hq: 0x4a4a4a,
    village: 0x8b4513,
    hub: 0x00d4ff,
    fire: 0xff4d00,
    link: 0x00d4ff,
    satellite: 0xcccccc,
    drone: 0xffffff,
    alert: 0xff0000
};

class WildfireSimulation {
    constructor() {
        this.canvas = document.getElementById('app');
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f4f8);
        this.scene.fog = new THREE.FogExp2(0xf0f4f8, 0.002);

        this.init();
        this.createLights();
        this.createEnvironment();
        this.createAIHub();
        this.createSatellite();
        this.createCommunicationLinks();
        this.setupLabels();
        this.setupUI();

        this.animate();
    }

    init() {
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('app').appendChild(this.renderer.domElement);

        // Label Renderer
        this.labelRenderer = new CSS2DRenderer();
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.labelRenderer.domElement.style.pointerEvents = 'none';
        document.getElementById('app').appendChild(this.labelRenderer.domElement);

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(100, 80, 100);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true; // Better panning
        this.controls.enablePan = true;         // Ensure panning is enabled
        this.controls.maxPolarAngle = Math.PI / 2.1;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 500;

        window.addEventListener('resize', this.onResize.bind(this));
    }

    createLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        sunLight.position.set(50, 100, 50);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.left = -150;
        sunLight.shadow.camera.right = 150;
        sunLight.shadow.camera.top = 150;
        sunLight.shadow.camera.bottom = -150;
        this.scene.add(sunLight);

        const fillLight = new THREE.PointLight(0xffffff, 1, 300);
        fillLight.position.set(-100, 50, -50);
        this.scene.add(fillLight);

        // Hub Light
        this.hubLight = new THREE.PointLight(COLORS.hub, 3, 60);
        this.hubLight.position.set(0, 15, 40);
        this.scene.add(this.hubLight);
    }

    createEnvironment() {
        const groundWidth = 240;
        const groundDepth = 120;

        const groundGeometry = new THREE.PlaneGeometry(groundWidth, groundDepth, 100, 50);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0xe8ecef, // Very light grey/white
            roughness: 0.8,
            metalness: 0
        });

        const ground = new THREE.Mesh(groundGeometry, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        this.createForestZone(-80, 0);
        this.createHQZone(0, 0);
        this.createVillageZone(80, 0);
    }

    createForestZone(xOffset, zOffset) {
        const group = new THREE.Group();
        group.position.set(xOffset, 0, zOffset);
        this.scene.add(group);

        const patch = new THREE.Mesh(
            new THREE.CircleGeometry(40, 32),
            new THREE.MeshStandardMaterial({ color: 0x1e3a1a })
        );
        patch.rotation.x = -Math.PI / 2;
        patch.position.y = 0.01;
        patch.receiveShadow = true;
        group.add(patch);

        const firePos = new THREE.Vector3(25, 0, 25);
        for (let i = 0; i < 60; i++) {
            const tree = this.createTree();
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 35;
            const tx = Math.cos(angle) * radius;
            const tz = Math.sin(angle) * radius;

            // Clear space for the fire
            if (new THREE.Vector2(tx, tz).distanceTo(new THREE.Vector2(firePos.x, firePos.z)) < 12) {
                continue;
            }

            tree.position.set(tx, 0, tz);
            tree.scale.setScalar(0.5 + Math.random() * 1);
            group.add(tree);
        }

        this.forestTower = this.createTower();
        this.forestTower.position.set(-20, 0, -20);
        group.add(this.forestTower);

        const towerLabel = this.createSmallLabel("5G TOWER");
        towerLabel.position.set(0, 12, 0);
        this.forestTower.add(towerLabel);

        this.drones = [];
        for (let i = 0; i < 3; i++) {
            const drone = this.createDrone();
            group.add(drone);
            this.drones.push(drone);
            this.animateDrone(drone, i);
        }
        // Improved Fire Visuals (Multi-layered flames)
        this.fireGroup = new THREE.Group();
        this.fireGroup.position.copy(firePos);
        this.fireGroup.scale.setScalar(0.001); // Start hidden
        group.add(this.fireGroup);

        this.flames = [];
        const flameColors = [0xff4d00, 0xffa500, 0xffd700];
        for (let i = 0; i < 5; i++) {
            const flame = new THREE.Mesh(
                new THREE.ConeGeometry(0.5 + i * 0.2, 2.5 + i * 0.5, 8),
                new THREE.MeshBasicMaterial({
                    color: flameColors[i % 3],
                    transparent: true,
                    opacity: 0.8 - i * 0.1
                })
            );
            flame.position.y = (1.2 + i * 0.2);
            this.fireGroup.add(flame);
            this.flames.push(flame);
        }

        this.fireSpread = new THREE.Mesh(
            new THREE.CircleGeometry(1, 32),
            new THREE.MeshBasicMaterial({ color: COLORS.fire, transparent: true, opacity: 0.3 })
        );
        this.fireSpread.rotation.x = -Math.PI / 2;
        this.fireSpread.position.y = 0.05;
        this.fireGroup.add(this.fireSpread);

        // Core glow
        this.fireLight = new THREE.PointLight(0xff4d00, 0, 30);
        this.fireLight.position.set(15, 5, 10);
        group.add(this.fireLight);

        this.forestZone = group;
    }

    createTree() {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.3, 1.5),
            new THREE.MeshStandardMaterial({ color: 0x4a2c10 })
        );
        trunk.position.y = 0.75;
        trunk.castShadow = true;
        tree.add(trunk);

        const foliage = new THREE.Mesh(
            new THREE.ConeGeometry(1.2, 3, 8),
            new THREE.MeshStandardMaterial({ color: COLORS.forest })
        );
        foliage.position.y = 2.5;
        foliage.castShadow = true;
        tree.add(foliage);

        return tree;
    }

    createDrone() {
        const drone = new THREE.Group();
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.4, 1.5),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        drone.add(body);

        const lights = new THREE.PointLight(0x00ff00, 1, 5);
        lights.position.y = -0.5;
        drone.add(lights);

        for (let i = 0; i < 4; i++) {
            const rotor = new THREE.Mesh(
                new THREE.BoxGeometry(0.8, 0.05, 0.1),
                new THREE.MeshStandardMaterial({ color: 0x888888 })
            );
            const angle = (i / 4) * Math.PI * 2;
            rotor.position.set(Math.cos(angle) * 0.8, 0.2, Math.sin(angle) * 0.8);
            drone.add(rotor);
            gsap.to(rotor.rotation, { y: Math.PI * 2, duration: 0.2, repeat: -1, ease: "none" });
        }

        drone.scale.setScalar(0.8);
        return drone;
    }

    animateDrone(drone, index) {
        const angle = (index / 3) * Math.PI * 2;
        const radius = 15 + Math.random() * 15;
        const height = 10 + Math.random() * 5;

        gsap.to(drone.position, {
            duration: 10 + Math.random() * 5,
            repeat: -1,
            ease: "none",
            onUpdate: () => {
                const time = Date.now() * 0.001 * (0.5 + index * 0.1);
                drone.position.x = Math.cos(time + angle) * radius;
                drone.position.z = Math.sin(time + angle) * radius;
                drone.position.y = height + Math.sin(time * 2) * 2;
                drone.rotation.y = -time - angle + Math.PI / 2;
            }
        });
    }

    createSmallLabel(text) {
        const div = document.createElement('div');
        div.className = 'label-container small';
        div.textContent = text;
        div.style.fontSize = '8px';
        div.style.padding = '2px 6px';
        return new CSS2DObject(div);
    }

    createTower() {
        const tower = new THREE.Group();
        const beam = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 10, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        beam.position.y = 5;
        tower.add(beam);

        const top = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        top.position.y = 10;
        tower.add(top);

        const light = new THREE.PointLight(0xff0000, 1, 10);
        light.position.y = 10.2;
        tower.add(light);
        gsap.to(light, { intensity: 0, duration: 1, repeat: -1, yoyo: true });

        return tower;
    }

    createHQZone(xOffset, zOffset) {
        const group = new THREE.Group();
        group.position.set(xOffset, 0, zOffset);
        this.scene.add(group);

        const patch = new THREE.Mesh(
            new THREE.PlaneGeometry(60, 80),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        patch.rotation.x = -Math.PI / 2;
        patch.position.y = 0.01;
        group.add(patch);

        this.hqBuilding = new THREE.Mesh(
            new THREE.BoxGeometry(15, 12, 10),
            new THREE.MeshStandardMaterial({ color: 0x4a4a4a })
        );
        this.hqBuilding.position.set(-10, 6, -10);
        this.hqBuilding.castShadow = true;
        group.add(this.hqBuilding);

        for (let i = 0; i < 3; i++) {
            const truck = new THREE.Mesh(
                new THREE.BoxGeometry(4, 2, 2),
                new THREE.MeshStandardMaterial({ color: 0xcc0000 })
            );
            truck.position.set(5 + i * 6, 1, -20);
            truck.castShadow = true;
            group.add(truck);
        }
    }

    createVillageZone(xOffset, zOffset) {
        const group = new THREE.Group();
        group.position.set(xOffset, 0, zOffset);
        this.scene.add(group);

        const patch = new THREE.Mesh(
            new THREE.CircleGeometry(40, 32),
            new THREE.MeshStandardMaterial({ color: 0x223311 })
        );
        patch.rotation.x = -Math.PI / 2;
        patch.position.y = 0.01;
        group.add(patch);

        for (let i = 0; i < 15; i++) {
            const house = this.createHouse();
            const angle = Math.random() * Math.PI * 2;
            const radius = 10 + Math.random() * 25;
            house.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
            house.rotation.y = Math.random() * Math.PI;
            group.add(house);
        }

        this.villageZone = group;
    }

    createHouse() {
        const house = new THREE.Group();
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(3, 3, 3),
            new THREE.MeshStandardMaterial({ color: 0xdddddd })
        );
        base.position.y = 1.5;
        base.castShadow = true;
        house.add(base);

        const roof = new THREE.Mesh(
            new THREE.ConeGeometry(2.5, 2, 4),
            new THREE.MeshStandardMaterial({ color: 0x8b4513 })
        );
        roof.position.y = 4;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        house.add(roof);

        return house;
    }

    createAIHub() {
        this.hubGroup = new THREE.Group();
        this.hubGroup.position.set(0, 15, 40);
        this.scene.add(this.hubGroup);

        this.hubCore = new THREE.Mesh(
            new THREE.OctahedronGeometry(2, 0),
            new THREE.MeshStandardMaterial({ color: COLORS.hub, emissive: COLORS.hub, emissiveIntensity: 2, wireframe: true })
        );
        this.hubGroup.add(this.hubCore);

        const innerCore = new THREE.Mesh(
            new THREE.SphereGeometry(1.2, 16, 16),
            new THREE.MeshStandardMaterial({ color: COLORS.hub, emissive: COLORS.hub, emissiveIntensity: 1 })
        );
        this.hubGroup.add(innerCore);

        this.rings = [];
        for (let i = 0; i < 3; i++) {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(3.5 + i * 1, 0.05, 16, 100),
                new THREE.MeshStandardMaterial({ color: COLORS.hub, transparent: true, opacity: 0.5 })
            );
            this.hubGroup.add(ring);
            this.rings.push(ring);
        }

        gsap.to(this.hubGroup.position, { y: 18, duration: 3, repeat: -1, yoyo: true, ease: "power1.inOut" });
    }

    createSatellite() {
        this.satGroup = new THREE.Group();
        this.satGroup.position.set(-60, 80, -20);
        this.scene.add(this.satGroup);

        const body = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 2), new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 }));
        this.satGroup.add(body);

        this.satBeam = new THREE.Mesh(
            new THREE.ConeGeometry(10, 80, 4, 1, true),
            new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.1, side: THREE.DoubleSide })
        );
        this.satBeam.position.y = -40;
        this.satGroup.add(this.satBeam);

        gsap.to(this.satGroup.position, { x: 60, duration: 20, repeat: -1, yoyo: true, ease: "none" });
    }

    createCommunicationLinks() {
        this.links = [];
        this.linkPairs = [
            { from: this.forestTower, to: this.hubGroup, key: 'forest-hub' },
            { from: this.satGroup, to: this.hubGroup, key: 'sat-hub' },
            { from: this.hubGroup, to: this.hqBuilding, key: 'hub-hq' },
            { from: this.hubGroup, to: this.villageZone, key: 'hub-village' }
        ];

        this.linkPairs.forEach(pair => {
            const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
            const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: COLORS.link, transparent: true, opacity: 0.2 }));
            this.scene.add(line);
            this.links.push({ mesh: line, from: pair.from, to: pair.to });
        });
    }

    setupLabels() {
        const labels = [
            { text: 'SATELLITE', obj: this.satGroup },
            { text: 'FOREST MONITORING', obj: this.forestZone, y: 15 },
            { text: 'AI PROCESSING UNIT', obj: this.hubGroup, y: 8 },
            { text: 'CIVIL PROTECTION HQ', obj: this.hqBuilding, y: 8 },
            { text: 'VILLAGE AREA', obj: this.villageZone, y: 15 }
        ];

        labels.forEach(l => {
            const div = document.createElement('div');
            div.className = 'label-container';
            div.textContent = l.text;
            const labelObj = new CSS2DObject(div);
            labelObj.position.set(0, l.y || 5, 0);
            l.obj.add(labelObj);
        });
    }

    setupUI() {
        document.getElementById('view-forest').onclick = () => this.focusOn(-80, 20, 40);
        document.getElementById('view-hub').onclick = () => this.focusOn(0, 30, 60);
        document.getElementById('view-hq').onclick = () => this.focusOn(20, 20, 30);
        document.getElementById('view-village').onclick = () => this.focusOn(80, 20, 40);

        document.getElementById('trigger-fire').onclick = () => this.simulateDetection();

        document.getElementById('modal-btn-1').onclick = () => {
            this.closeModal('ai-modal-1');
            this.igniteFireAndDispatch();
        };

        document.getElementById('modal-btn-2').onclick = () => {
            this.closeModal('ai-modal-2');
            this.prepareAlerts();
        };

        document.getElementById('modal-btn-3').onclick = () => {
            this.closeModal('ai-modal-3');
            this.completeSimulation();
        };

        document.getElementById('reset-sim').onclick = () => this.resetSimulation();
    }

    showModal(id) {
        const modal = document.getElementById(id);
        modal.style.display = 'flex';
        gsap.fromTo(modal, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" });
    }

    closeModal(id) {
        const modal = document.getElementById(id);
        gsap.to(modal, { opacity: 0, scale: 0.8, duration: 0.3, onComplete: () => modal.style.display = 'none' });
    }

    focusOn(x, y, z, tx = null, ty = 0, tz = null) {
        gsap.to(this.camera.position, { x, y, z, duration: 2, ease: "power2.inOut", onUpdate: () => this.controls.update() });
        const targetX = tx !== null ? tx : x;
        const targetZ = tz !== null ? tz : 0;
        gsap.to(this.controls.target, { x: targetX, y: ty, z: targetZ, duration: 2, ease: "power2.inOut" });
    }

    simulateDetection() {
        const status = document.getElementById('ai-status');
        const btn = document.getElementById('trigger-fire');

        btn.disabled = true;
        status.textContent = 'ANALYZING RISK...';
        status.className = 'value alert';

        // 1. Zoom to Processing Unit first to show the plan
        this.focusOnProcessingUnit();

        setTimeout(() => {
            this.showModal('ai-modal-1');
        }, 2200);
    }

    igniteFireAndDispatch() {
        const status = document.getElementById('ai-status');
        status.textContent = 'FIRE IGNITION!';

        // 2. Zoom to Forest to show the fire starting
        this.focusOn(-50, 30, 60, -55, 0, 25);

        // Dynamic flame scale
        gsap.to(this.fireGroup.scale, { x: 1, y: 1, z: 1, duration: 1 });
        gsap.to(this.fireLight, { intensity: 5, duration: 1.5 });
        gsap.to(this.fireSpread.scale, { x: 15, y: 15, duration: 30, ease: "none" });

        // Wait a bit to see the fire, then send drone
        setTimeout(() => {
            this.dispatchDrone();
        }, 3000);
    }

    dispatchDrone() {
        const status = document.getElementById('ai-status');
        status.textContent = 'DISPATCHING DRONE...';

        const activeDrone = this.drones[0];
        gsap.killTweensOf(activeDrone.position);

        // Zoom into fire closer
        this.focusOn(-45, 15, 45, -55, 0, 25);

        this.sendData(this.hubGroup, activeDrone, 0x00d4ff);

        setTimeout(() => {
            const firePos = new THREE.Vector3();
            this.fireGroup.getWorldPosition(firePos);
            const localTarget = activeDrone.parent.worldToLocal(firePos);

            gsap.to(activeDrone.position, {
                x: localTarget.x,
                y: 12,
                z: localTarget.z,
                duration: 4,
                ease: "power2.inOut",
                onComplete: () => {
                    status.textContent = 'CAPTURING FIRE IMAGES...';
                    const flash = activeDrone.children.find(c => c.type === 'PointLight');
                    gsap.to(flash, { intensity: 15, duration: 0.1, repeat: 5, yoyo: true });

                    setTimeout(() => {
                        status.textContent = 'SENDING CONFIRMATION...';
                        this.sendData(activeDrone, this.hubGroup, 0xffffff);

                        setTimeout(() => {
                            this.focusOnProcessingUnit(); // Zoom back to show modal from computer
                            setTimeout(() => {
                                this.showModal('ai-modal-2');
                            }, 2200);
                        }, 1000);
                    }, 2000);
                }
            });
        }, 1500);
    }

    prepareAlerts() {
        this.showModal('ai-modal-3');
    }

    completeSimulation() {
        const status = document.getElementById('ai-status');
        status.textContent = 'SENDING ALERTS...';

        // Red alerts to Village and HQ
        this.sendAlertData(this.hubGroup, this.hqBuilding, COLORS.alert);
        this.sendAlertData(this.hubGroup, this.villageZone, COLORS.alert);

        setTimeout(() => {
            status.textContent = 'RESPONSE DISPATCHED';
            this.triggerVisualAlerts();
        }, 2000);
    }

    sendData(from, to, color) {
        for (let i = 0; i < 5; i++) {
            const p = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshBasicMaterial({ color }));
            this.scene.add(p);
            const start = new THREE.Vector3();
            const end = new THREE.Vector3();
            from.getWorldPosition(start);
            to.getWorldPosition(end);

            gsap.fromTo(p.position,
                { x: start.x, y: start.y, z: start.z },
                {
                    x: end.x, y: end.y, z: end.z,
                    duration: 1,
                    delay: i * 0.2,
                    ease: "power2.in",
                    onComplete: () => {
                        this.scene.remove(p);
                        p.geometry.dispose();
                        p.material.dispose();
                    }
                }
            );
        }
    }

    sendAlertData(from, to, color) {
        for (let i = 0; i < 15; i++) {
            const p = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), new THREE.MeshBasicMaterial({ color }));
            this.scene.add(p);
            const start = new THREE.Vector3();
            const end = new THREE.Vector3();
            from.getWorldPosition(start);
            to.getWorldPosition(end);

            gsap.fromTo(p.position,
                { x: start.x, y: start.y, z: start.z },
                {
                    x: end.x + (Math.random() - 0.5) * 10, y: end.y, z: end.z + (Math.random() - 0.5) * 10,
                    duration: 1.5,
                    delay: i * 0.1,
                    onComplete: () => {
                        this.scene.remove(p);
                    }
                }
            );
        }
    }

    focusOnProcessingUnit() {
        const hubPos = new THREE.Vector3();
        this.hubGroup.getWorldPosition(hubPos);
        gsap.to(this.camera.position, { x: hubPos.x + 10, y: hubPos.y + 10, z: hubPos.z + 20, duration: 2, ease: "power3.inOut" });
        gsap.to(this.controls.target, { x: hubPos.x, y: hubPos.y, z: hubPos.z, duration: 2, ease: "power3.inOut" });
    }

    triggerVisualAlerts() {
        const hqLight = new THREE.PointLight(0xff0000, 5, 40);
        this.hqBuilding.add(hqLight);
        gsap.to(hqLight, { intensity: 0, duration: 0.5, repeat: 10, yoyo: true });

        const villageLight = new THREE.PointLight(0xff0000, 5, 60);
        this.villageZone.add(villageLight);
        gsap.to(villageLight, { intensity: 0, duration: 0.5, repeat: 10, yoyo: true });
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
    }

    resetSimulation() {
        const status = document.getElementById('ai-status');
        const btn = document.getElementById('trigger-fire');

        // Hide any open modals
        ['ai-modal-1', 'ai-modal-2', 'ai-modal-3'].forEach(id => {
            document.getElementById(id).style.display = 'none';
        });

        // Reset Fire
        gsap.to(this.fireGroup.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 1 });
        gsap.to(this.fireSpread.scale, { x: 1, y: 1, duration: 1 });
        gsap.to(this.fireLight, { intensity: 0, duration: 1 });

        // Reset Drones
        this.drones.forEach((drone, i) => {
            gsap.killTweensOf(drone.position);
            this.animateDrone(drone, i);
        });

        // Reset HUD and Camera
        status.textContent = 'MONITORING';
        status.className = 'value';
        btn.disabled = false;
        this.focusOn(100, 80, 100);

        // Remove any persistent alert lights if they exist
        this.hqBuilding.children.forEach(c => { if (c.type === 'PointLight') this.hqBuilding.remove(c); });
        this.villageZone.children.forEach(c => { if (c.type === 'PointLight') this.villageZone.remove(c); });
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();

        if (this.hubCore) {
            this.hubCore.rotation.y += 0.01;
            this.rings.forEach((r, i) => {
                r.rotation.y += 0.01 * (i + 1);
                r.rotation.x += 0.005 * (i + 1);
            });
        }

        // Animate Flames
        if (this.flames && this.fireGroup.scale.x > 0.1) {
            this.flames.forEach((flame, i) => {
                flame.rotation.y += 0.05;
                flame.scale.x = 0.8 + Math.sin(Date.now() * 0.01 + i) * 0.2;
                flame.scale.z = 0.8 + Math.sin(Date.now() * 0.01 + i) * 0.2;
            });
        }

        this.links.forEach((l, i) => {
            const start = new THREE.Vector3();
            const end = new THREE.Vector3();
            l.from.getWorldPosition(start);
            l.to.getWorldPosition(end);
            const positions = l.mesh.geometry.attributes.position.array;
            positions[0] = start.x; positions[1] = start.y; positions[2] = start.z;
            positions[3] = end.x; positions[4] = end.y; positions[5] = end.z;
            l.mesh.geometry.attributes.position.needsUpdate = true;
            l.mesh.material.opacity = 0.3 + Math.sin(Date.now() * 0.005 + i) * 0.1;
        });

        this.renderer.render(this.scene, this.camera);
        this.labelRenderer.render(this.scene, this.camera);
    }
}

new WildfireSimulation();
