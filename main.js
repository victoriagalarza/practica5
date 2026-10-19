import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// =============================================================================
// 1. MOTOR BIOINFORMÁTICO Y CLIENTE API REST (PHP)
// =============================================================================
const BioEngine = {
    especies: [],
    especieActual: null,
    modeloSeleccionado: 'logistico',
    
    tick: 0,
    temperatura: 20.0,
    humedadSuelo: 60.0,
    
    estresTermico: 0.0,
    estresHidrico: 0.0,
    alturaN: 0.05,
    biomasa: 0.0,
    icr: 0.0,
    
    modoAB: false,
    isPaused: false,
    telemetry: [],

    async cargarEspeciesAPI() {
        try {
            const res = await fetch('api/index.php/api/especies');
            if (res.ok) {
                this.especies = await res.json();
                this.poblarSelectEspecies();
            } else {
                throw new Error("Respuesta no OK");
            }
        } catch (e) {
            console.warn("Usando catálogo fallback de especies:", e);
            this.especies = [
                { id: 1, nombre_comun: 'Azucena', nombre_cientifico: 'Lilium candidum', tasa_crecimiento_base: 0.08, capacidad_carga_base: 2.50, temp_optima: 20.0, humedad_optima: 60.0, dias_madurez: 90 },
                { id: 2, nombre_comun: 'Maíz', nombre_cientifico: 'Zea mays', tasa_crecimiento_base: 0.12, capacidad_carga_base: 3.20, temp_optima: 25.0, humedad_optima: 65.0, dias_madurez: 100 },
                { id: 3, nombre_comun: 'Arabidopsis', nombre_cientifico: 'Arabidopsis thaliana', tasa_crecimiento_base: 0.15, capacidad_carga_base: 0.80, temp_optima: 22.0, humedad_optima: 55.0, dias_madurez: 45 },
                { id: 4, nombre_comun: 'Tomate', nombre_cientifico: 'Solanum lycopersicum', tasa_crecimiento_base: 0.10, capacidad_carga_base: 2.10, temp_optima: 23.0, humedad_optima: 70.0, dias_madurez: 80 }
            ];
            this.poblarSelectEspecies();
        }
    },

    poblarSelectEspecies() {
        const select = document.getElementById('select-especie');
        if (!select) return;
        select.innerHTML = '';
        this.especies.forEach(esp => {
            const opt = document.createElement('option');
            opt.value = esp.id;
            opt.textContent = `${esp.nombre_comun} (${esp.nombre_cientifico})`;
            select.appendChild(opt);
        });
        this.especieActual = this.especies[0];
        this.actualizarUIEspecie();
    },

    actualizarUIEspecie() {
        if (!this.especieActual) return;
        document.getElementById('kpi-cosecha').textContent = `${this.especieActual.dias_madurez} días`;
    },

    // Modelos Matemáticos de Crecimiento
    calcularAltura(t, r, K) {
        switch (this.modeloSeleccionado) {
            case 'lineal':
                return Math.min(K, 0.05 + 0.02 * r * t);
            case 'exponencial':
                return Math.min(K, 0.05 * Math.exp(r * t * 0.1));
            case 'gompertz':
                return K * Math.exp(-Math.exp(-r * (t * 0.1 - 2.0)));
            case 'logistico':
            default:
                return K / (1 + ((K - 0.05) / 0.05) * Math.exp(-r * t * 0.1));
        }
    },

    update(deltaSeconds) {
        if (this.isPaused || !this.especieActual) return;

        this.tick += deltaSeconds * 2.0;
        const r = this.especieActual.tasa_crecimiento_base;
        const K = this.especieActual.capacidad_carga_base;

        // Cálculo de Estrés (0-100%) por desviación de las condiciones óptimas
        this.estresTermico = Math.min(100, (Math.abs(this.temperatura - this.especieActual.temp_optima) / 15.0) * 100);
        this.estresHidrico = Math.min(100, (Math.abs(this.humedadSuelo - this.especieActual.humedad_optima) / 40.0) * 100);

        const factorEstres = Math.max(0.1, 1.0 - (this.estresTermico + this.estresHidrico) / 200.0);
        
        const alturaPrevia = this.alturaN;
        this.alturaN = this.calcularAltura(this.tick * factorEstres, r, K);
        
        // ICR = (ln(N2) - ln(N1)) / dt
        if (alturaPrevia > 0) {
            this.icr = (Math.log(this.alturaN) - Math.log(alturaPrevia)) / (deltaSeconds || 0.1);
        }
        
        this.biomasa = this.alturaN * 18.5;

        // Registrar serie temporal
        if (Math.floor(this.tick) % 2 === 0) {
            this.telemetry.push({
                tick: Math.round(this.tick),
                altura: parseFloat(this.alturaN.toFixed(2)),
                biomasa: parseFloat(this.biomasa.toFixed(2))
            });
        }
    }
};

BioEngine.cargarEspeciesAPI();

// =============================================================================
// 2. ESCENA 3D THREE.JS Y LABORATORIO
// =============================================================================
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdbeafe);
scene.fog = new THREE.Fog(0xdbeafe, 15, 38);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 4.0, 8.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 2.1, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.85));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
dirLight.position.set(6, 11, 7);
dirLight.castShadow = true;
scene.add(dirLight);

// Arquitectura del entorno
const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(32, 32), new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }));
floorMesh.rotation.x = -Math.PI / 2;
scene.add(floorMesh);

const mainTable = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.2, 2.6), new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.3 }));
mainTable.position.set(0, 1.2, 0);
scene.add(mainTable);

// Shaders GLSL de la planta
const shaderUniforms = {
    uTime: { value: 0.0 },
    uWindIntensity: { value: 1.0 },
    uBaseColor: { value: new THREE.Color(0x15803d) },
    uTipColor: { value: new THREE.Color(0x84cc16) },
    uGrowthProgress: { value: 0.0 }
};

let plantShaderMat = new THREE.MeshStandardMaterial({ color: 0x15803d, side: THREE.DoubleSide });
async function loadShaders() {
    try {
        const [v, f] = await Promise.all([fetch('shaders/plant.vert'), fetch('shaders/plant.frag')]);
        if (v.ok && f.ok) {
            plantShaderMat = new THREE.ShaderMaterial({
                vertexShader: await v.text(),
                fragmentShader: await f.text(),
                uniforms: shaderUniforms,
                side: THREE.DoubleSide
            });
        }
    } catch(e) {
        console.warn("Usando material estándar por defecto:", e);
    }
}
loadShaders();

// =============================================================================
// 3. CONSTRUCCIÓN 3D DE PLANTAS Y REBUILD
// =============================================================================
let plantGroups = [];
let clickableParts = [];

function buildPlant(posX, specimenName) {
    const root = new THREE.Group();
    root.position.set(posX, 1.3, 0);
    scene.add(root);
    plantGroups.push(root);

    // Maceta y Sustrato
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.52, 1.1, 32), new THREE.MeshStandardMaterial({ color: 0x8b4513 }));
    pot.position.y = 0.55;
    root.add(pot);

    const stemGroup = new THREE.Group();
    stemGroup.position.y = 1.1;
    root.add(stemGroup);

    const stemMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.85, 16), new THREE.MeshStandardMaterial({ color: 0x16a34a }));
    stemMesh.position.y = 0.92;
    stemGroup.add(stemMesh);

    stemMesh.userData = { name: `Tallo (${specimenName})`, geo: "Cilindro" };
    clickableParts.push(stemMesh);

    // Flor Apical
    const flower = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.95, 16), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    flower.position.y = 1.85;
    flower.rotation.x = Math.PI;
    stemGroup.add(flower);

    return root;
}

function rebuildPlants() {
    plantGroups.forEach(g => scene.remove(g));
    plantGroups = [];
    clickableParts = [];

    if (BioEngine.modoAB) {
        buildPlant(-2.0, "Escenario A (Optimizado)");
        buildPlant(2.0, "Escenario B (Estrés)");
    } else {
        buildPlant(-2.4, "Alfa");
        buildPlant(0.0, "Control");
        buildPlant(2.4, "Beta");
    }
}
rebuildPlants();

// =============================================================================
// 4. BUCLE DE ANIMACIÓN
// =============================================================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    BioEngine.update(delta);

    // Sincronizar escala de crecimiento 3D con N(t)
    const progressScale = Math.min(1.0, BioEngine.alturaN / (BioEngine.especieActual?.capacidad_carga_base || 2.5));
    plantGroups.forEach(group => {
        group.scale.set(progressScale, progressScale, progressScale);
    });

    shaderUniforms.uTime.value = time;
    shaderUniforms.uWindIntensity.value = parseFloat(document.getElementById('slider-wind').value);
    shaderUniforms.uGrowthProgress.value = progressScale;

    // Actualización de KPIs en la interfaz
    document.getElementById('kpi-tick').textContent = Math.round(BioEngine.tick);
    document.getElementById('kpi-altura').textContent = `${BioEngine.alturaN.toFixed(2)} u`;
    document.getElementById('kpi-biomasa').textContent = `${BioEngine.biomasa.toFixed(2)} g`;
    document.getElementById('kpi-icr').textContent = BioEngine.icr.toFixed(3);
    document.getElementById('kpi-estres-t').textContent = `${BioEngine.estresTermico.toFixed(0)} %`;
    document.getElementById('kpi-estres-h').textContent = `${BioEngine.estresHidrico.toFixed(0)} %`;

    // Motor de Decisiones y Recomendaciones
    const recEl = document.getElementById('kpi-recomendacion');
    if (BioEngine.estresHidrico > 40) recEl.textContent = "⚠️ Alerta: Aumentar riego inmediatamente.";
    else if (BioEngine.estresTermico > 40) recEl.textContent = "⚠️ Alerta: Ajustar temperatura del área.";
    else recEl.textContent = "✅ Tasa de fotosíntesis y crecimiento óptimos.";

    controls.update();
    renderer.render(scene, camera);
}
animate();

// =============================================================================
// 5. CONTROLES DE INTERFAZ Y COMUNICACIÓN REST
// =============================================================================
document.getElementById('select-especie').addEventListener('change', (e) => {
    BioEngine.especieActual = BioEngine.especies.find(esp => esp.id == e.target.value);
    BioEngine.actualizarUIEspecie();
    BioEngine.tick = 0;
});

document.getElementById('select-modelo').addEventListener('change', (e) => {
    BioEngine.modeloSeleccionado = e.target.value;
    document.getElementById('lbl-modelo').textContent = e.target.options[e.target.selectedIndex].text;
});

document.getElementById('slider-temp').addEventListener('input', (e) => {
    BioEngine.temperatura = parseFloat(e.target.value);
    document.getElementById('lbl-temp').textContent = `${BioEngine.temperatura} °C`;
});

document.getElementById('slider-humedad').addEventListener('input', (e) => {
    BioEngine.humedadSuelo = parseFloat(e.target.value);
    document.getElementById('lbl-humedad').textContent = `${BioEngine.humedadSuelo} %`;
});

document.getElementById('slider-branches').addEventListener('input', (e) => {
    document.getElementById('val-branches').textContent = e.target.value;
});

document.getElementById('slider-wind').addEventListener('input', (e) => {
    document.getElementById('val-wind').textContent = parseFloat(e.target.value).toFixed(1);
});

document.getElementById('btn-toggle-sim').addEventListener('click', (e) => {
    BioEngine.isPaused = !BioEngine.isPaused;
    e.target.textContent = BioEngine.isPaused ? "▶️ Reanudar" : "⏸️ Pausar";
});

document.getElementById('btn-reset-growth').addEventListener('click', () => {
    BioEngine.tick = 0;
    BioEngine.alturaN = 0.05;
    BioEngine.telemetry = [];
});

document.getElementById('btn-toggle-ab').addEventListener('click', () => {
    BioEngine.modoAB = !BioEngine.modoAB;
    document.getElementById('kpi-modo-ab').textContent = BioEngine.modoAB ? "Comparativa A/B" : "Estándar";
    rebuildPlants();
});

// Guardar simulación en MySQL vía API PHP
document.getElementById('btn-save-sim').addEventListener('click', async () => {
    const payload = {
        nombre: `Simulación ${BioEngine.especieActual?.nombre_comun || 'Cultivo'}`,
        especie_id: BioEngine.especieActual?.id || 1,
        modelo_matematico: BioEngine.modeloSeleccionado,
        temperatura_ambiente: BioEngine.temperatura,
        humedad_suelo: BioEngine.humedadSuelo,
        duracion_ticks: Math.round(BioEngine.tick),
        biomasa_final: BioEngine.biomasa,
        altura_final: BioEngine.alturaN
    };

    try {
        const res = await fetch('api/index.php/api/simulaciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert("✅ Simulación guardada en MySQL exitosamente.");
        } else {
            alert("⚠️ Error al guardar en la base de datos.");
        }
    } catch(e) {
        alert("Error de conexión con la API en PHP.");
    }
});

// Modal y Gráficas con Chart.js
let telemetryChart = null;
document.getElementById('btn-open-charts').addEventListener('click', () => {
    document.getElementById('chart-modal').classList.remove('hidden');
    const ctx = document.getElementById('growthChart').getContext('2d');
    
    if (telemetryChart) telemetryChart.destroy();

    telemetryChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: BioEngine.telemetry.map(d => `${d.tick}t`),
            datasets: [
                { label: 'Altura N(t)', data: BioEngine.telemetry.map(d => d.altura), borderColor: '#38bdf8', fill: false },
                { label: 'Biomasa (g)', data: BioEngine.telemetry.map(d => d.biomasa), borderColor: '#4ade80', fill: false }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
});

document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('chart-modal').classList.add('hidden');
});

// Raycasting / Inspección de elementos
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.hud-card') || e.target.closest('.modal')) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(clickableParts, false);

    if (hits.length > 0) {
        const obj = hits[0].object;
        document.getElementById('hint-text').classList.add('hidden');
        document.getElementById('plant-data').classList.remove('hidden');
        document.getElementById('part-name').textContent = obj.userData.name;
        document.getElementById('part-especie').textContent = BioEngine.especieActual?.nombre_comun || "Azucena";
        document.getElementById('part-geo').textContent = obj.userData.geo;
        document.getElementById('part-growth').textContent = `${Math.round((BioEngine.alturaN / (BioEngine.especieActual?.capacidad_carga_base || 2.5)) * 100)}%`;
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});