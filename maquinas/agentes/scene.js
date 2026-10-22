// Cena procedural, sem modelos externos, pós-processamento ou mapas de sombra.
export function createScene(host, labelRoot, { onSelect, reducedMotion = false, onFailure }) {
  const T = window.THREE;
  if (!T) return null;
  let renderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
  catch { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(34, 1, .1, 100);
  const root = new T.Group();
  scene.add(root);
  // A small studio environment gives metal surfaces a reflection without HDR downloads.
  const envCanvas = document.createElement('canvas'); envCanvas.width = 512; envCanvas.height = 256;
  const envContext = envCanvas.getContext('2d');
  const gradient = envContext.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#7a98b7'); gradient.addColorStop(.48, '#1e3048'); gradient.addColorStop(.53, '#080e18'); gradient.addColorStop(1, '#142638');
  envContext.fillStyle = gradient; envContext.fillRect(0, 0, 512, 256);
  envContext.fillStyle = '#bfdbf4'; envContext.fillRect(80, 35, 25, 75);
  envContext.fillStyle = '#637c96'; envContext.fillRect(300, 25, 45, 80);
  const envTexture = new T.CanvasTexture(envCanvas); envTexture.mapping = T.EquirectangularReflectionMapping; envTexture.encoding = T.sRGBEncoding;
  const pmrem = new T.PMREMGenerator(renderer); const environment = pmrem.fromEquirectangular(envTexture);
  scene.environment = environment.texture; envTexture.dispose(); pmrem.dispose();
  scene.add(new T.HemisphereLight(0xadcfff, 0x0a1425, .55));
  const blueLight = new T.DirectionalLight(0xa3ceff, 1.15);
  blueLight.position.set(-5, 7, 7); scene.add(blueLight);
  const warm = new T.PointLight(0xff9870, .85, 22);
  warm.position.set(4, 3, 3); scene.add(warm);
  const rim = new T.DirectionalLight(0x4fc1b0, .45);
  rim.position.set(2, 2, -6); scene.add(rim);
  const colors = [0x6fa3dc, 0x6fa3dc, 0x91b5ec, 0x6fa3dc, 0xd2694a, 0x4fc1b0];
  const baseMat = new T.MeshStandardMaterial({ color: 0x101b2b, metalness: .72, roughness: .28, envMapIntensity: .7 });
  const darkMat = new T.MeshStandardMaterial({ color: 0x0d192b, metalness: .65, roughness: .25, envMapIntensity: .85 });
  const glassMat = new T.MeshStandardMaterial({ color: 0x4d8abd, transparent: true, opacity: .43, metalness: .32, roughness: .2, side: T.DoubleSide, envMapIntensity: .6 });
  const copperMat = new T.MeshStandardMaterial({ color: 0xc56f46, metalness: .7, roughness: .26, emissive: 0x3c160a, emissiveIntensity: .3, envMapIntensity: .8 });
  const tealMat = new T.MeshStandardMaterial({ color: 0x4fc1b0, emissive: 0x246c62, emissiveIntensity: .45, metalness: .2, roughness: .35 });
  for (const material of [baseMat, darkMat, glassMat, copperMat, tealMat]) material.color.convertSRGBToLinear();
  const layers = [], edges = [], labels = [...labelRoot.querySelectorAll('[data-layer]')];
  const glowMaterials = [];
  function box(group, w, h, d, x, y, z, material = darkMat) {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); group.add(mesh); return mesh;
  }
  function outline(mesh, color, opacity = .6) {
    const material = new T.LineBasicMaterial({ color, transparent: true, opacity });
    const line = new T.LineSegments(new T.EdgesGeometry(mesh.geometry), material);
    mesh.add(line); return material;
  }
  function bar(group, x1, y1, z1, x2, y2, z2, color, opacity = .8) {
    const geo = new T.BufferGeometry().setFromPoints([new T.Vector3(x1, y1, z1), new T.Vector3(x2, y2, z2)]);
    group.add(new T.Line(geo, new T.LineBasicMaterial({ color, transparent: true, opacity })));
  }
  function documentCard(group, x, y, z, width = .78, height = .94, accent = 0x6fa3dc) {
    const card = box(group, width, height, .035, x, y, z, glassMat);
    outline(card, accent, .8);
    for (let i = 0; i < 4; i++) {
      box(group, width * (.75 - (i % 2) * .2), .025, .014, x - width * .03, y + height * (.24 - i * .15), z + .026,
        new T.MeshBasicMaterial({ color: i === 3 ? accent : 0xa4c3e7, transparent: true, opacity: i === 3 ? .9 : .5 }));
    }
    return card;
  }
  for (let i = 0; i < 6; i++) {
    const group = new T.Group();
    group.userData.layer = i;
    const shape = new T.Shape();
    const w = 3.15, d = 1.85, r = .1;
    shape.moveTo(-w/2 + r, -d/2); shape.lineTo(w/2-r, -d/2);
    shape.quadraticCurveTo(w/2, -d/2, w/2, -d/2+r); shape.lineTo(w/2, d/2-r);
    shape.quadraticCurveTo(w/2, d/2, w/2-r, d/2); shape.lineTo(-w/2+r, d/2);
    shape.quadraticCurveTo(-w/2, d/2, -w/2, d/2-r); shape.lineTo(-w/2, -d/2+r);
    shape.quadraticCurveTo(-w/2, -d/2, -w/2+r, -d/2);
    const slabGeometry = new T.ExtrudeGeometry(shape, { depth: .09, bevelEnabled: true, bevelThickness: .025, bevelSize: .025, bevelSegments: 2, steps: 1, curveSegments: 5 });
    slabGeometry.rotateX(-Math.PI / 2); slabGeometry.translate(0, -.045, 0);
    const slab = new T.Mesh(slabGeometry, baseMat); group.add(slab);
    edges.push(outline(slab, colors[i], .55));
    const under = box(group, 2.96, .025, 1.66, 0, -.09, 0,
      new T.MeshBasicMaterial({ color: colors[i], transparent: true, opacity: .09 }));
    glowMaterials.push(under.material);
    group.add(new T.PointLight(colors[i], .35, 3));
    group.position.set((i - 2.5) * .12, (i - 2.5) * 1.43, 0);
    root.add(group); layers.push(group);
  }
  // 01. Une question écrite sur une plaque de verre.
  documentCard(layers[0], 0, .56, .22, 2.23, .72);
  box(layers[0], .3, .3, .07, .87, .55, .3, copperMat);
  bar(layers[0], .79, .49, .35, .95, .64, .35, 0xffdfca);
  // 02. Fiches qui composent le contexte.
  documentCard(layers[1], -.78, .64, .08, .7, .94);
  documentCard(layers[1], -.04, .7, .2, .75, 1.05);
  documentCard(layers[1], .76, .61, .1, .68, .9);
  // 03. Circuit et noyau du modèle, pas un cerveau anthropomorphe.
  const chip = box(layers[2], 1.08, .8, 1.02, 0, .5, 0, darkMat);
  outline(chip, 0x7fa9d6, .8);
  const core = new T.Mesh(new T.IcosahedronGeometry(.23, 0), new T.MeshStandardMaterial({ color: 0xf1bb91, emissive: 0xb45d2c, emissiveIntensity: .7, metalness: .5, roughness: .2 }));
  core.position.set(0, 1.06, 0); layers[2].add(core);
  for (let i = -3; i <= 3; i++) {
    box(layers[2], .05, .04, 1.47, i * .21, .13, 0, copperMat);
    box(layers[2], 1.55, .04, .05, 0, .13, i * .21, copperMat);
  }
  // 04. Trois connecteurs: lecture, code et données.
  [-.85, 0, .85].forEach((x, i) => {
    const socket = box(layers[3], .61, .68, .5, x, .43, .06, darkMat);
    outline(socket, 0x83abd7, .6);
    if (i === 0) {
      const circle = new T.Mesh(new T.TorusGeometry(.12, .016, 8, 28), new T.MeshBasicMaterial({ color: 0xadd0ff }));
      circle.position.set(x - .025, .47, .32); layers[3].add(circle);
      bar(layers[3], x + .06, .37, .33, x + .17, .25, .33, 0xadd0ff);
    } else if (i === 1) {
      bar(layers[3], x - .04, .59, .32, x - .17, .45, .32, 0xadd0ff);
      bar(layers[3], x - .17, .45, .32, x - .04, .31, .32, 0xadd0ff);
      bar(layers[3], x + .04, .59, .32, x + .17, .45, .32, 0xadd0ff);
      bar(layers[3], x + .17, .45, .32, x + .04, .31, .32, 0xadd0ff);
    } else {
      for (let k = 0; k < 3; k++) {
        const ring = new T.Mesh(new T.TorusGeometry(.13, .013, 6, 22), new T.MeshBasicMaterial({ color: 0xadd0ff }));
        ring.scale.y = .45; ring.position.set(x, .57 - k * .1, .32); layers[3].add(ring);
      }
    }
  });
  // 05. Le portique matérialise la vérification AVANT exécution.
  box(layers[4], .23, 1.03, .27, -.57, .6, 0, copperMat);
  box(layers[4], .23, 1.03, .27, .57, .6, 0, copperMat);
  box(layers[4], 1.35, .22, .27, 0, 1.04, 0, copperMat);
  const gateStatusMat = tealMat.clone();
  const gateBadge = box(layers[4], .42, .5, .08, 0, .59, .19, gateStatusMat);
  const blockedCross = new T.Group();
  bar(blockedCross, -.11, -.11, 0, .11, .11, 0, 0xffdfd4);
  bar(blockedCross, -.11, .11, 0, .11, -.11, 0, 0xffdfd4);
  blockedCross.position.set(0, .59, .24); blockedCross.visible = false; layers[4].add(blockedCross);
  const check = new T.Group();
  bar(check, -.12, 0, 0, -.025, -.09, 0, 0xe0fff9);
  bar(check, -.025, -.09, 0, .14, .12, 0, 0xe0fff9);
  check.position.set(0, .59, .24); layers[4].add(check);
  // 06. Réponse accompagnée de sources.
  documentCard(layers[5], 0, .65, .07, 1.56, 1.05, 0x4fc1b0);
  box(layers[5], .31, .04, .05, -.39, .22, .12, tealMat);
  box(layers[5], .31, .04, .05, .04, .22, .12, tealMat);

  const trajectory = new T.Group(); root.add(trajectory);
  const particleMaterial = new T.MeshBasicMaterial({ color: 0x86c5f7, transparent: true, opacity: .85 });
  const particles = new T.InstancedMesh(new T.SphereGeometry(.027, 5, 4), particleMaterial, 44);
  trajectory.add(particles);
  const dummy = new T.Object3D();
  let stageIndex = -1, progress = 0, motion = !reducedMotion, visible = true, flat = false;
  let dragAngle = -.17, frameId = 0, lastTime = 0, clock = 0, disposed = false, width = 1, height = 1;
  let currentFocus = 0, targetFocus = 0;
  const target = new T.Vector3();
  const ray = new T.Raycaster(), pointer = new T.Vector2();
  const labelPoint = new T.Vector3();
  function invalidate() {
    if (!frameId && !disposed && visible && !flat && !document.hidden) frameId = requestAnimationFrame(frame);
  }
  function frame(time) {
    frameId = 0;
    if (disposed || !visible || flat || document.hidden) return;
    const dt = Math.min((time - lastTime) / 1000 || .016, .06); lastTime = time;
    if (motion) clock += dt;
    currentFocus += (targetFocus - currentFocus) * (reducedMotion ? 1 : .09);
    root.rotation.y = dragAngle;
    const spread = 1.43 + Math.sin(progress * Math.PI) * .12;
    layers.forEach((g, i) => {
      g.position.y = (i - 2.5) * spread;
      g.position.x = (i - 2.5) * .12 + (i === stageIndex ? -.1 : 0);
      edges[i].opacity = stageIndex === i ? .95 : .47;
      glowMaterials[i].opacity = stageIndex === i ? .28 : .07;
    });
    const aspect = width / height;
    const distance = (aspect < .9 ? 19.6 : aspect > 1.8 ? 17 : 16.3) * (stageIndex < 0 ? 1 : .88);
    camera.position.set(distance * .47, 4.3 + currentFocus * .8, distance * .88);
    target.set(0, currentFocus * .8, 0); camera.lookAt(target);
    core.rotation.y = clock * .22;
    for (let i = 0; i < 44; i++) {
      const t = ((i / 44) + clock * .025) % 1;
      const a = t * Math.PI * 7;
      dummy.position.set(Math.sin(a) * .31 + (t - .5) * .6, -3.65 + t * 8.2, Math.cos(a) * .36 + .14);
      dummy.updateMatrix(); particles.setMatrixAt(i, dummy.matrix);
    }
    particles.instanceMatrix.needsUpdate = true;
    scene.updateMatrixWorld(); camera.updateMatrixWorld();
    layers.forEach((g, i) => {
      // Labels follow the actual projected world coordinates on every frame.
      labelPoint.set(1.67, .18, -.1); g.localToWorld(labelPoint); labelPoint.project(camera);
      const x = (labelPoint.x * .5 + .5) * width, y = (-labelPoint.y * .5 + .5) * height;
      labels[i].style.left = `${Math.min(x, width - (width < 500 ? 78 : 105))}px`;
      labels[i].style.top = `${y}px`;
      labels[i].hidden = y < 40 || y > height - 25;
    });
    renderer.render(scene, camera);
    if (motion || Math.abs(targetFocus - currentFocus) > .005) invalidate();
  }
  const resize = new ResizeObserver(() => {
    width = host.clientWidth; height = host.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.setSize(width, height, false); invalidate();
  });
  resize.observe(host);
  const intersection = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) { lastTime = performance.now(); invalidate(); }
    else { cancelAnimationFrame(frameId); frameId = 0; }
  });
  intersection.observe(host);
  const visibility = () => { if (document.hidden) { cancelAnimationFrame(frameId); frameId = 0; } else { lastTime = performance.now(); invalidate(); } };
  document.addEventListener('visibilitychange', visibility);
  const canvas = renderer.domElement;
  let down = null, moved = false;
  const pointerDown = e => { down = { x: e.clientX, y: e.clientY, angle: dragAngle }; moved = false; };
  const pointerMove = e => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      moved = true; dragAngle = Math.max(-.8, Math.min(.65, down.angle + dx * .004)); invalidate();
    }
  };
  const pointerUp = e => {
    if (!down) return;
    const travel = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved || travel > 7) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(layers, true)[0];
    if (!hit) return;
    let object = hit.object;
    while (object && object.userData.layer === undefined) object = object.parent;
    if (object) onSelect(object.userData.layer);
  };
  const pointerCancel = () => { down = null; };
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerCancel);
  canvas.addEventListener('pointerleave', pointerCancel);
  const contextLost = e => { e.preventDefault(); cancelAnimationFrame(frameId); frameId = 0; onFailure(); };
  canvas.addEventListener('webglcontextlost', contextLost);
  invalidate();
  return {
    update(index, amount, result) {
      stageIndex = index; progress = amount; targetFocus = index < 0 ? 0 : (index - 2.5) * 1.43;
      const blocked = result.status === 'blocked';
      gateStatusMat.color.setHex(blocked ? 0xd2694a : 0x4fc1b0).convertSRGBToLinear();
      gateStatusMat.emissive.setHex(blocked ? 0x5c2714 : 0x246c62);
      blockedCross.visible = blocked; check.visible = !blocked;
      layers[1].children.forEach((child, i) => { if (i > 2) child.visible = result.sources.length > 0; });
      invalidate();
    },
    setMotion(enabled) { motion = enabled; lastTime = performance.now(); invalidate(); },
    setFlat(enabled) { flat = enabled; if (flat) { cancelAnimationFrame(frameId); frameId = 0; } else invalidate(); },
    setReduced(enabled) { reducedMotion = enabled; motion = !enabled; invalidate(); },
    dispose() {
      disposed = true; cancelAnimationFrame(frameId); resize.disconnect(); intersection.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('pointercancel', pointerCancel);
      canvas.removeEventListener('pointerleave', pointerCancel); canvas.removeEventListener('webglcontextlost', contextLost);
      const geometries = new Set(), materials = new Set();
      scene.traverse(o => { if (o.geometry) geometries.add(o.geometry); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); environment.dispose(); renderer.dispose(); canvas.remove();
    },
  };
}
