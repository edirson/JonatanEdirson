// ===== Forest Run 3D v2.0 Edirson-Oculus =====

// 1. Éléments du DOM et constantes
const game = document.getElementById('game');
const menu = document.getElementById('menu');
const gameover = document.getElementById('gameover');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const finalScoreEl = document.getElementById('finalScore');
const bestScoreEl = document.getElementById('bestScore');
const speedValueEl = document.getElementById('speedValue');
const nitroBarEl = document.getElementById('nitroBar');
const nitroBtn = document.getElementById('nitroBtn');
const speedLines = document.getElementById('speedLines');
const playBtn = document.getElementById('playBtn');
const retryBtn = document.getElementById('retryBtn');
const tiltBtn = document.getElementById('tiltBtn');
const leftZone = document.getElementById('leftZone');
const rightZone = document.getElementById('rightZone');

const BEST_SCORE_KEY = 'forestRunBestScore';

// 2. Initialisation de la scène 3D (Three.js)
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true; // Ombres activées
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Ombres douces
renderer.toneMapping = THREE.ACESFilmicToneMapping;
game.appendChild(renderer.domElement);

// Caméra en poursuite
camera.position.set(0, 3.5, 8);
camera.rotation.x = -0.15;

// 3. Variables de jeu
let running = false, score = 0, bestScore = 0;
let speed = 0, baseSpeed = 0.5;
let tilt = 0, touchDir = 0, tiltEnabled = false;
let nitro = 0, nitroActive = false;
let timeOfDay = 0; // 0 = jour, 1 = crépuscule

// 4. Éclairage et Cycle Jour/Crépuscule
const dayColors = {
  sky: new THREE.Color(0x87CEEB),
  fog: new THREE.Color(0x87CEEB),          
  sun: new THREE.Color(0xfffaed),
  ambient: new THREE.Color(0xffffff)
};
const duskColors = {
  sky: new THREE.Color(0x2c1e4d),
  fog: new THREE.Color(0x452859),
  sun: new THREE.Color(0xff8c42),
  ambient: new THREE.Color(0xada2c4)
};

scene.background = dayColors.sky.clone();
scene.fog = new THREE.Fog(dayColors.fog.clone(), -80, 180); //30, 180
const ambientLight = new THREE.AmbientLight(dayColors.ambient, 0.7);
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(dayColors.sun, 1.5);
sunLight.position.set(30, 150, -520 );  //30, 50, 20
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
sunLight.shadow.camera.top = 30;
sunLight.shadow.camera.bottom = -30;
sunLight.shadow.camera.left = -30;
sunLight.shadow.camera.right = 30;
scene.add(sunLight);

// 5. Construction du monde (Sol, Route, Décor)
const roadWidth = 13; //10
const grassGeo = new THREE.PlaneGeometry(150, 1000);
const grassMat = new THREE.MeshStandardMaterial({ color: 0x4d7c3c });
const grass = new THREE.Mesh(grassGeo, grassMat);
grass.rotation.x = -Math.PI / 2;
grass.receiveShadow = true;
scene.add(grass);

const roadGeo = new THREE.PlaneGeometry(roadWidth, 1000);
const roadMat = new THREE.MeshStandardMaterial({ color: 0x2e2e30 });
const road = new THREE.Mesh(roadGeo, roadMat);
road.rotation.x = -Math.PI / 2;
road.position.y = 0.01;
road.receiveShadow = true;
scene.add(road);

// Montagnes à l'horizon
const mountainGeo = new THREE.PlaneGeometry(500, 150, 100, 20);
const mountainMat = new THREE.MeshStandardMaterial({ color: 0x485844, roughness: 1.0 });
const mountain = new THREE.Mesh(mountainGeo, mountainMat);
const p = mountainGeo.attributes.position;
for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const noise = (Math.sin(p.getX(i) * 850.05) + Math.cos(y * 0.1)) * 8;     //* 0.05) + Math.cos(y * 0.1)) * 8;
    p.setZ(i, Math.max(0, (75 - Math.abs(y)) * 0.8 + noise));
}
p.needsUpdate = true;
mountain.position.set(0, -10, -350);
scene.add(mountain);

// Objets recyclables (décor, trafic, pièces)
let roadLines = [], scenery = [], enemies = [], coins = [];

function createObjectPools() {
    // Lignes blanches
    const lineGeo = new THREE.PlaneGeometry(0.18, 4);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < 20; i++) {
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(0, 0.02, -i * 16);
        scene.add(line);
        roadLines.push(line);
    }

    // Décor (arbres, rochers, buissons)
    for (let i = 10; i < 260; i++) {    //   for (let i = 0; i < 860; i++) {
        const obj = createSceneryObject();
        obj.position.set(
            (roadWidth / 142 + 165 + Math.random() * 30) * (Math.random() > 0.5 ? 1 : -1),  // (roadWidth / 2 + 5 + Math.random() * 30) * (Math.random() > 0.5 ? 1 : -1),
            0,
            -Math.random() * 10    //-Math.random() * 400
        );
        scene.add(obj);
        scenery.push(obj);
    }
}

function createSceneryObject() {
    const type = Math.random();
    if (type > 0.6) { // Arbre
        const tree = new THREE.Group();
        const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.8, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2e1b });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 0.9;
        const leavesGeo = new THREE.ConeGeometry(1.4, 3.2, 8);
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x234a1a });
        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
        leaves.position.y = 3.2;
        tree.add(trunk, leaves);
        tree.castShadow = true;
        return tree;
    } else if (type > 0.2) { // Rocher
        const rockGeo = new THREE.DodecahedronGeometry(0.6 + Math.random() * 0.8, 0);
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5a });
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.y = rock.geometry.parameters.radius / 2;
        rock.castShadow = true;
        return rock;
    } else { // Buisson
        const bushGeo = new THREE.SphereGeometry(0.8 + Math.random() * 0.5, 8, 6);
        const bushMat = new THREE.MeshStandardMaterial({ color: 0x295218 });
        const bush = new THREE.Mesh(bushGeo, bushMat);
        bush.position.y = 0.5;
        bush.castShadow = true;
        return bush;
    }
}
createObjectPools();

// 6. Joueur et Reflets
const player = createVehicle('car', 0x0044cc); // Bleu
scene.add(player.mesh);
player.mesh.position.set(0, 0.2, 4);

const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256);
const cubeCamera = new THREE.CubeCamera(1, 1000, cubeRenderTarget);
scene.add(cubeCamera);
player.body.material.envMap = cubeRenderTarget.texture;

// 7. Véhicules (Générique)
function createVehicle(type, color) {
    const vehicle = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
        color: color, metalness: 0.85, roughness: 0.1,
    });
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.1 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    let body;

    let wheelPositions = [];
    if (type === 'car') {
        const bodyGeo = new THREE.BoxGeometry(1.6, 0.45, 3.6);
        body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.5;
        const cabinGeo = new THREE.BoxGeometry(1.2, 0.45, 1.8);
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, 0.9, -0.2);
        vehicle.add(body, cabin);
        wheelPositions = [[-0.85, 0.35, 1.1], [0.85, 0.35, 1.1], [-0.85, 0.35, -1.1], [0.85, 0.35, -1.1]];
    } else if (type === 'truck') {
        const bodyGeo = new THREE.BoxGeometry(2.2, 1.5, 7);
        body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.75;
        const cabinGeo = new THREE.BoxGeometry(2.0, 1.2, 1.5);
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, 1.2, 2.5);
        vehicle.add(body, cabin);
        wheelPositions = [[-1.1, 0.4, 2.5], [1.1, 0.4, 2.5], [-1.1, 0.4, -2], [1.1, 0.4, -2]];
    } else { // Moto
        const bodyGeo = new THREE.BoxGeometry(0.4, 0.5, 2.0);
        body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.5;
        vehicle.add(body);
        wheelPositions = [[0, 0.35, 0.7], [0, 0.35, -0.7]];
    }

    vehicle.traverse(child => { child.castShadow = true; });
    
    const wheels = [];
    wheelPositions.forEach(pos => {
        const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16);
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(pos[0], pos[1], pos[2]);
        vehicle.add(wheel);
        wheels.push(wheel);
    });
    
    return { mesh: vehicle, wheels: wheels, body: body, type: type };
}

// 8. Particules (Fumée, Poussière, Feuilles)
const particleCount = 300;
const particlesGeo = new THREE.BufferGeometry();
const posArray = new Float32Array(particleCount * 3);
const particleData = [];
for(let i = 0; i < particleCount; i++) {
    posArray[i * 3] = 0; posArray[i * 3 + 1] = -10; posArray[i * 3 + 2] = 0;
    particleData.push({ lifetime: 0, velocity: new THREE.Vector3() });
}
particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const particleMat = new THREE.PointsMaterial({ size: 0.3, color: 0xffffff, transparent: true, opacity: 0.6, sizeAttenuation: true });
const particleSystem = new THREE.Points(particlesGeo, particleMat);
scene.add(particleSystem);
let particleCursor = 0;

function spawnParticle(origin, type) {
    const p = particleData[particleCursor];
    p.lifetime = 1.0 + Math.random() * 1.5;
    
    if (type === 'smoke') {
        posArray[particleCursor * 3] = origin.x + (Math.random() - 0.5) * 0.3;
        posArray[particleCursor * 3 + 1] = origin.y + 0.2;
        posArray[particleCursor * 3 + 2] = origin.z - 1.8;
        p.velocity.set(0, 0.5 + Math.random() * 0.5, speed * 0.5);
        particleMat.color.set(0xaaaaaa);
    } else { // dust
        posArray[particleCursor * 3] = origin.x + (Math.random() - 0.5) * 1.5;
        posArray[particleCursor * 3 + 1] = origin.y + 0.2;
        posArray[particleCursor * 3 + 2] = origin.z;
        p.velocity.set((Math.random() - 0.5) * 2, Math.random() * 0.5, speed * 1.1);
        particleMat.color.set(0x967969);
    }
    
    particleCursor = (particleCursor + 1) % particleCount;
}

// 9. Spawners (Trafic & Pièces)
let spawnTimer = 0;
function updateSpawns() {
    spawnTimer--;
    if (spawnTimer <= 0) {
        const type = Math.random();
        if (type > 0.85 && score > 10) spawn('truck');
        else if (type > 0.7 && score > 5) spawn('moto');
        else if (type > 0.2) spawn('car');

        if (Math.random() > 0.5) spawn('coin');
        
        spawnTimer = Math.max(25, 100 - score * 0.8); // Difficulté progressive
    }
}

function spawn(type) {
    const lane = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
    const xPos = lane * (roadWidth / 3);

    if (type === 'coin') {
        const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
        const coinMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.6, roughness: 0.2 });
        const coin = new THREE.Mesh(coinGeo, coinMat);
        coin.rotation.x = Math.PI / 2;
        coin.position.set(xPos, 0.8, -200);
        scene.add(coin);
        coins.push({ mesh: coin, isCoin: true });
    } else {
        const enemy = createVehicle(type, new THREE.Color(Math.random(), Math.random(), Math.random()));
        enemy.mesh.position.set(xPos, 0.2, -200);
        enemy.mesh.rotation.y = Math.PI;
        scene.add(enemy.mesh);
        enemies.push(enemy);
    }
}

// 10. Boucle de jeu
function update() {
    const delta = 0.016; // Simule un delta-temps stable

    // Cycle Jour/Crépuscule
    if (score > 15) {
        timeOfDay = Math.min(1, timeOfDay + delta / 100);
        scene.background.lerpColors(dayColors.sky, duskColors.sky, timeOfDay);
        scene.fog.color.lerpColors(dayColors.fog, duskColors.fog, timeOfDay);
        sunLight.color.lerpColors(dayColors.sun, duskColors.sun, timeOfDay);
        ambientLight.color.lerpColors(dayColors.ambient, duskColors.ambient, timeOfDay);
    }

    // Nitro
    nitro = Math.min(100, nitro + delta * 5);
    nitroBarEl.style.width = nitro + '%';
    if (nitro >= 100) {
        nitroBarEl.classList.add('ready');
        nitroBtn.classList.add('ready');
    }

    // Vitesse
    const effectiveSpeed = nitroActive ? baseSpeed * 2.8 : baseSpeed;
    speed += (effectiveSpeed - speed) * 0.1;
    speedValueEl.textContent = Math.floor(speed * 300);

    // Défilement environnement
    roadLines.forEach(l => {
        l.position.z += speed;
        if (l.position.z > 14) l.position.z -= 20 * 16;
    });
    scenery.forEach(o => {
        o.position.z += speed;
        if (o.position.z > 15) {
            o.position.z = -380 - Math.random() * 50;
            o.position.x = (roadWidth / 2 + 5 + Math.random() * 30) * (Math.random() > 0.5 ? 1 : -1);
        }
    });

    // Contrôle joueur (réactif)
    const dir = tiltEnabled ? tilt : touchDir;
    player.mesh.position.x += dir * 0.25;
    player.mesh.position.x = Math.max(-roadWidth/2 + 0.8, Math.min(roadWidth/2 - 0.8, player.mesh.position.x));
    player.mesh.rotation.y = dir * -0.2;
    player.mesh.rotation.z = dir * -0.1;
    player.wheels.forEach(w => { w.rotation.x -= speed * 0.5; });
    
    // Particules
    if (Math.random() > 0.5) spawnParticle(player.mesh.position, 'smoke');
    if (Math.abs(dir) > 0.1) spawnParticle(player.mesh.position, 'dust');
    for (let i = 0; i < particleCount; i++) {
        const p = particleData[i];
        if (p.lifetime > 0) {
            p.lifetime -= delta;
            posArray[i * 3] += p.velocity.x * delta;
            posArray[i * 3 + 1] += p.velocity.y * delta;
            posArray[i * 3 + 2] += p.velocity.z + speed;
            if (p.lifetime <= 0) posArray[i*3+1] = -10;
        }
    }
    particlesGeo.attributes.position.needsUpdate = true;
    
    // Spawners
    updateSpawns();
    
    // Update trafic et pièces
    const allObjects = [...enemies, ...coins];
    for (let i = allObjects.length - 1; i >= 0; i--) {
        const obj = allObjects[i];
        obj.mesh.position.z += speed * (obj.isCoin ? 1 : 1.4);

        // Collision
        if (obj.mesh.position.z > 2 && obj.mesh.position.z < 6 && Math.abs(player.mesh.position.x - obj.mesh.position.x) < 1.5) {
            if (obj.isCoin) {
                score += 5;
                scene.remove(obj.mesh);
                coins.splice(coins.indexOf(obj), 1);
            } else {
                endGame();
                return;
            }
        }
        
        if (obj.mesh.position.z > 15) {
            if (!obj.isCoin) {
                score++;
                enemies.splice(enemies.indexOf(obj), 1);
            } else {
                coins.splice(coins.indexOf(obj), 1);
            }
            scene.remove(obj.mesh);
            scoreEl.textContent = score;
            baseSpeed = 0.5 + score * 0.005; // Difficulté progressive
        }
    }

    // Caméra
    camera.position.x += (player.mesh.position.x * 0.5 - camera.position.x) * 0.1;
}

function render() {
    // Update reflets
    player.mesh.visible = false;
    cubeCamera.position.copy(player.mesh.position);
    cubeCamera.update(renderer, scene);
    player.mesh.visible = true;
    
    renderer.render(scene, camera);
}

function loop() {
    if (running) {
        update();
    }
    render();
    requestAnimationFrame(loop);
}

// 11. Gestion du jeu (Démarrage, Fin, Reset)
function reset() {
    score = 0;
    timeOfDay = 0;
    speed = 0;
    baseSpeed = 0.5;
    nitro = 0;
    
    [...enemies, ...coins].forEach(o => scene.remove(o.mesh));
    enemies = [];
    coins = [];
    
    player.mesh.position.set(0, 0.2, 4);
    player.mesh.rotation.set(0, 0, 0);
    camera.position.x = 0;

    scoreEl.textContent = '0';
    bestScore = localStorage.getItem(BEST_SCORE_KEY) || 0;
    bestEl.textContent = 'Record : ' + bestScore;
    nitroBtn.classList.add('visible');

    running = true;
}

function endGame() {
    running = false;
    if (navigator.vibrate) navigator.vibrate(100);

    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem(BEST_SCORE_KEY, bestScore);
    }
    
    finalScoreEl.textContent = 'Score : ' + score;
    bestScoreEl.textContent = 'Record : ' + bestScore;
    gameover.classList.remove('hidden');
    nitroBtn.classList.remove('visible');
}

// 12. Entrées & Listeners
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

playBtn.addEventListener('click', () => {
    menu.classList.add('hidden');
    reset();
});

retryBtn.addEventListener('click', () => {
    gameover.classList.add('hidden');
    reset();
});

// Clavier
window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') touchDir = -1;
    if (e.key === 'ArrowRight') touchDir = 1;
    if (e.code === 'Space') activateNitro();
});
window.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft' && touchDir === -1) touchDir = 0;
    if (e.key === 'ArrowRight' && touchDir === 1) touchDir = 0;
});

// Tactile
leftZone.addEventListener('touchstart', e => { e.preventDefault(); touchDir = -1; }, { passive: false });
rightZone.addEventListener('touchstart', e => { e.preventDefault(); touchDir = 1; }, { passive: false });
leftZone.addEventListener('touchend', () => { if (touchDir === -1) touchDir = 0; });
rightZone.addEventListener('touchend', () => { if (touchDir === 1) touchDir = 0; });

// Gyroscope
tiltBtn.addEventListener('click', async () => {
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    const permission = await DeviceOrientationEvent.requestPermission();
    if (permission === 'granted') {
      window.addEventListener('deviceorientation', handleOrientation);
      tiltEnabled = true;
      tiltBtn.textContent = '✓ Gyroscopio activado';  //Gyroscope activé'
    }
  } else {
    window.addEventListener('deviceorientation', handleOrientation);
    tiltEnabled = true;
    tiltBtn.textContent = '✓ Gyroscope activé';
  }
});
function handleOrientation(e) {
  tilt = Math.max(-1, Math.min(1, (e.gamma || 0) / 25));
}

// Nitro
function activateNitro() {
    if (nitro >= 100 && running) {
        nitroActive = true;
        speedLines.classList.add('active');
        setTimeout(() => {
            nitroActive = false;
            speedLines.classList.remove('active');
            nitro = 0;
            nitroBarEl.classList.remove('ready');
            nitroBtn.classList.remove('ready');
        }, 3000); // Durée du boost
    }
}
nitroBtn.addEventListener('click', activateNitro);

// 13. Démarrage initial
bestScore = localStorage.getItem(BEST_SCORE_KEY) || 0;
bestEl.textContent = 'Record : ' + bestScore;
loop();
