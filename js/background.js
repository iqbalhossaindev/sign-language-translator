/* ═══════════════════════════════════════════════════
   SignAI — Three.js Cinematic Background
   Particle field + light beams + mouse parallax
   ═══════════════════════════════════════════════════ */

(function initBackground() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  /* ─── SCENE SETUP ───────────────────────────── */
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 5);

  /* ─── MOUSE PARALLAX ────────────────────────── */
  let mouseX = 0, mouseY = 0;
  let targetX = 0, targetY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // DeviceOrientation for mobile
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma !== null) mouseX = (e.gamma / 45) * 0.5;
    if (e.beta  !== null) mouseY = ((e.beta - 45) / 45) * 0.5;
  });

  /* ─── PARTICLE FIELD ─────────────────────────── */
  const PARTICLE_COUNT = window.innerWidth < 768 ? 1200 : 2500;

  const positions   = new Float32Array(PARTICLE_COUNT * 3);
  const colors      = new Float32Array(PARTICLE_COUNT * 3);
  const sizes       = new Float32Array(PARTICLE_COUNT);
  const velocities  = new Float32Array(PARTICLE_COUNT * 3);
  const phases      = new Float32Array(PARTICLE_COUNT);

  // Color palette: cyan → blue → purple
  const palette = [
    new THREE.Color(0x00e5ff),  // cyan
    new THREE.Color(0x3b82f6),  // blue
    new THREE.Color(0x7c3aed),  // purple
    new THREE.Color(0xec4899),  // pink accent
    new THREE.Color(0x0ea5e9),  // sky blue
  ];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;

    // Spread particles in a wide sphere
    const r     = 4 + Math.random() * 12;
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);

    positions[i3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi) - 4;

    // Random color from palette
    const c = palette[Math.floor(Math.random() * palette.length)];
    colors[i3]     = c.r;
    colors[i3 + 1] = c.g;
    colors[i3 + 2] = c.b;

    // Particle size
    sizes[i] = 1.5 + Math.random() * 3;

    // Slow drift velocity
    velocities[i3]     = (Math.random() - 0.5) * 0.003;
    velocities[i3 + 1] = (Math.random() - 0.5) * 0.002;
    velocities[i3 + 2] = (Math.random() - 0.5) * 0.001;

    // Phase for oscillation
    phases[i] = Math.random() * Math.PI * 2;
  }

  const particleGeo  = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions,  3));
  particleGeo.setAttribute('color',    new THREE.BufferAttribute(colors,     3));
  particleGeo.setAttribute('size',     new THREE.BufferAttribute(sizes,      1));

  // Round particle shader
  const particleMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      varying float vAlpha;
      uniform float time;
      void main() {
        vColor = color;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (250.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
        vAlpha = 0.5 + 0.5 * sin(time * 0.5 + position.x * 3.0);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float alpha = (1.0 - d * 2.0) * vAlpha * 0.8;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true
  });

  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  /* ─── FLOATING GEOMETRY ORBS ─────────────────── */
  const orbGroup = new THREE.Group();

  function createOrb(radius, color, x, y, z, wireframe = false) {
    const geo = new THREE.IcosahedronGeometry(radius, wireframe ? 1 : 3);
    const mat = new THREE.MeshBasicMaterial({
      color,
      wireframe,
      transparent: true,
      opacity: wireframe ? 0.06 : 0.04,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    return mesh;
  }

  const orbs = [
    createOrb(2.5,  0x00e5ff, -4, 1.5, -3,  true),
    createOrb(1.8,  0x7c3aed,  4, -2,  -4,  true),
    createOrb(3.5,  0x3b82f6,  0, 0,   -8,  true),
    createOrb(1.2,  0xec4899, -2.5, -1.5, -2, true),
    createOrb(0.8,  0x00e5ff,  3.5, 2.5, -2, true),
  ];

  orbs.forEach(o => orbGroup.add(o));
  scene.add(orbGroup);

  /* ─── LIGHT BEAMS / RAYS ────────────────────── */
  const rayGroup = new THREE.Group();

  function createRay(x, y, z, rx, ry) {
    const geo = new THREE.CylinderGeometry(0.002, 0.08, 8, 8, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, 0);
    return mesh;
  }

  const rays = [
    createRay(-3, 5, -5, 0.3,  0.2),
    createRay( 3, 5, -5, 0.3, -0.2),
    createRay( 0, 6, -6, 0.1,  0.0),
  ];
  rays.forEach(r => rayGroup.add(r));
  scene.add(rayGroup);

  /* ─── GRID PLANE ────────────────────────────── */
  const gridGeo = new THREE.PlaneGeometry(30, 30, 30, 30);
  const gridMat = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    wireframe: true,
    transparent: true,
    opacity: 0.025,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const grid = new THREE.Mesh(gridGeo, gridMat);
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = -5;
  scene.add(grid);

  /* ─── NEBULA / GLOW QUAD ────────────────────── */
  const nebulaGeo = new THREE.PlaneGeometry(20, 15);
  const nebulaMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float time;
      void main() {
        vec2 c = vUv - 0.5;
        float d = length(c);
        float t = time * 0.2;
        // Two color nodes
        vec3 col1 = vec3(0.0, 0.898, 1.0) * 0.08;   // cyan
        vec3 col2 = vec3(0.486, 0.231, 0.929) * 0.06; // purple
        float f1 = exp(-d * 3.5 + sin(t + c.x * 4.0) * 0.15);
        float f2 = exp(-length(c - vec2(0.2, 0.15)) * 4.0 + cos(t * 1.3) * 0.1);
        vec3 col = col1 * f1 + col2 * f2;
        gl_FragColor = vec4(col, (f1 + f2) * 0.4);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const nebula = new THREE.Mesh(nebulaGeo, nebulaMat);
  nebula.position.set(0, 0, -8);
  scene.add(nebula);

  /* ─── ANIMATION LOOP ─────────────────────────── */
  let clock = new THREE.Clock();
  let frame = 0;
  let isActive = true;

  // Allow the app to pause background when camera is running (performance)
  window._bgPause = () => { isActive = false; };
  window._bgResume = () => { isActive = true; };

  function animate() {
    requestAnimationFrame(animate);
    if (!isActive && frame % 4 !== 0) { frame++; return; } // throttle when paused

    const t   = clock.getElapsedTime();
    const dt  = clock.getDelta();
    frame++;

    // Update particle positions (drift)
    const posArr = particleGeo.attributes.position.array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      posArr[i3]     += velocities[i3]     + Math.sin(t * 0.3 + phases[i]) * 0.0008;
      posArr[i3 + 1] += velocities[i3 + 1] + Math.cos(t * 0.2 + phases[i]) * 0.0006;
      posArr[i3 + 2] += velocities[i3 + 2];

      // Wrap around boundary
      if (Math.abs(posArr[i3])     > 16) posArr[i3]     *= -0.9;
      if (Math.abs(posArr[i3 + 1]) > 12) posArr[i3 + 1] *= -0.9;
      if (posArr[i3 + 2] < -14 || posArr[i3 + 2] > 2) velocities[i3 + 2] *= -1;
    }
    particleGeo.attributes.position.needsUpdate = true;
    particleMat.uniforms.time.value = t;

    // Rotate orbs
    orbs.forEach((orb, i) => {
      orb.rotation.x += 0.003 * (i % 2 === 0 ? 1 : -0.7);
      orb.rotation.y += 0.005 * (i % 3 === 0 ? 1 : 0.8);
    });

    // Animate ray opacity
    rays.forEach((ray, i) => {
      ray.material.opacity = 0.03 + 0.015 * Math.sin(t * 0.5 + i * 1.2);
    });

    // Nebula animation
    nebulaMat.uniforms.time.value = t;

    // Mouse parallax — smooth lerp
    targetX += (mouseX - targetX) * 0.04;
    targetY += (mouseY - targetY) * 0.04;

    particles.rotation.x = targetY * 0.15;
    particles.rotation.y = targetX * 0.15;
    particles.rotation.z += 0.0003;

    orbGroup.rotation.y = targetX * 0.08;
    orbGroup.rotation.x = targetY * 0.06;

    grid.rotation.z = t * 0.02;
    grid.material.opacity = 0.018 + 0.008 * Math.sin(t * 0.4);

    rayGroup.rotation.y = targetX * 0.04;

    // Slow camera drift
    camera.position.x = targetX * 0.3;
    camera.position.y = -targetY * 0.2;

    renderer.render(scene, camera);
  }

  animate();

  /* ─── RESIZE HANDLER ─────────────────────────── */
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

})();
