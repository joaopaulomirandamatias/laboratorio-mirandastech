import { createMachine } from './scene-objects.js';
// Cinematic, selectable Three.js cutaway with local assets and progressive fallback.
export function createScene(host, labelRoot, { onSelect, reducedMotion = false, onFailure }) {
  const T = window.THREE;
  if (!T) return null;
  let renderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, innerWidth < 700 ? 1.25 : 1.6));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  host.appendChild(renderer.domElement);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(30, 1, .1, 100);
  const root = new T.Group();
  scene.add(root);
  // HDR studio lighting: bright strip emitters reflected in the beveled metal.
  const room = new T.Scene();
  room.add(new T.Mesh(new T.BoxGeometry(30,24,30),new T.MeshBasicMaterial({color:0x0b101a,side:T.BackSide})));
  const emitter = (w,h,x,y,z,rx,ry,color) => {
    const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(...color),side:T.DoubleSide}));
    m.position.set(x,y,z);m.rotation.set(rx,ry,0);room.add(m);
  };
  emitter(3,12,-6,4,5,0,.7,[4,5.5,8]);
  emitter(1.4,10,7,5,1,0,-1.1,[6,4,2.5]);
  emitter(7,3,0,8,-3,-.7,0,[3,4,5]);
  emitter(2,5,-1,3,8,0,0,[1.5,2,3]);
  const pmrem=new T.PMREMGenerator(renderer);const environment=pmrem.fromScene(room,.02);scene.environment=environment.texture;pmrem.dispose();
  room.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  scene.add(new T.HemisphereLight(0xc2d9fc,0x050a14,.32));
  const key=new T.DirectionalLight(0xc3ddff,1.65);key.position.set(-5,10,8);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-8;key.shadow.camera.right=8;key.shadow.camera.top=9;key.shadow.camera.bottom=-9;key.shadow.camera.far=35;key.shadow.bias=-.0005;key.shadow.normalBias=.025;key.shadow.radius=3;scene.add(key);
  const warm=new T.DirectionalLight(0xffb785,.65);warm.position.set(6,5,2);scene.add(warm);
  const rim=new T.DirectionalLight(0x7baffe,.85);rim.position.set(-3,5,-5);scene.add(rim);
  renderer.shadowMap.enabled=false;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const {layers,edges,glowMaterials,core,gateStatusMat,blockedCross,check,trajectory,particles,dummy,sourceObjects,textures,pathAt}=createMachine(T,root);
  const labels=[...labelRoot.querySelectorAll('[data-layer]')];
  const leftLabels=new Set([0,2,3,4]);labels.forEach((label,i)=>label.classList.toggle('side-left',leftLabels.has(i)));
  // Bloom preserves the original alpha, so the photographic terrain stays visible.
  let composer=null,savePass=null,bloomPass=null;
  if(T.EffectComposer&&T.SavePass&&T.UnrealBloomPass){
    composer=new T.EffectComposer(renderer);composer.addPass(new T.RenderPass(scene,camera));
    savePass=new T.SavePass(new T.WebGLRenderTarget(1,1,{format:T.RGBAFormat}));composer.addPass(savePass);
    bloomPass=new T.UnrealBloomPass(new T.Vector2(1,1),.48,.55,.85);composer.addPass(bloomPass);
    const composite=new T.ShaderPass({uniforms:{tDiffuse:{value:null},original:{value:savePass.renderTarget.texture}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform sampler2D tDiffuse;uniform sampler2D original;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);float a=texture2D(original,vUv).a;float g=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c.rgb,a+(1.0-a)*min(g*.6,1.0));}'});
    composer.addPass(composite);
  }
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
    const spread = 1.58 + Math.sin(progress * Math.PI) * .1;
    layers.forEach((g, i) => {
      g.position.y = (i - 2.5) * spread;
      g.position.x = (i - 2.5) * .57 + (i === stageIndex ? -.08 : 0);
      edges[i].opacity = stageIndex === i ? .95 : .65;
      glowMaterials[i].opacity = stageIndex === i ? .17 : .025;
    });
    const aspect = width / height;
    const distance = (aspect < .85 ? 22 : 21.4) * (stageIndex < 0 ? 1 : .9);
    camera.position.set(distance * .44, distance * .44 + currentFocus * .76, distance * .8);
    target.set(0, .3 + currentFocus * .76, 0); camera.lookAt(target);
    core.rotation.y = clock * .22;
    for (let i=0;i<88;i++){
      const t=((i/88)+clock*.03)%1;
      dummy.position.copy(pathAt(t));
      dummy.position.x+=Math.sin(i*11.1)*.06;dummy.position.z+=Math.cos(i*9.7)*.05;
      dummy.scale.setScalar(.6+(i%5)*.2);dummy.updateMatrix();particles.setMatrixAt(i,dummy.matrix);
    }
    particles.instanceMatrix.needsUpdate = true;
    scene.updateMatrixWorld(); camera.updateMatrixWorld();
    layers.forEach((g, i) => {
      // Labels follow the actual projected world coordinates on every frame.
      labelPoint.set((leftLabels.has(i)?-1:1)*(g.userData.width/2+.1), .12, .05); g.localToWorld(labelPoint); labelPoint.project(camera);
      const x = (labelPoint.x * .5 + .5) * width, y = (-labelPoint.y * .5 + .5) * height;
      labels[i].style.left = `${Math.max(leftLabels.has(i)?65:0,Math.min(x,width-(leftLabels.has(i)?0:90)))}px`;
      labels[i].style.top = `${y}px`;
      labels[i].hidden = y < 55 || y > height - 20;
    });
    if(composer)composer.render();else renderer.render(scene,camera);
    if (motion || Math.abs(targetFocus - currentFocus) > .005) invalidate();
  }
  const resize = new ResizeObserver(() => {
    width = host.clientWidth; height = host.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height; camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);if(composer){composer.setSize(width,height);savePass.renderTarget.setSize(width*renderer.getPixelRatio(),height*renderer.getPixelRatio());}invalidate();
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
      stageIndex = index; progress = amount; targetFocus = index < 0 ? 0 : (index - 2.5) * 1.58;
      const blocked = result.status === 'blocked';
      gateStatusMat.color.setHex(blocked ? 0xd2694a : 0x4fc1b0).convertSRGBToLinear();
      gateStatusMat.emissive.setHex(blocked ? 0x5c2714 : 0x246c62);
      blockedCross.visible = blocked; check.visible = !blocked;
      sourceObjects.forEach(object=>{object.visible=result.sources.length>0;});
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
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); environment.dispose();textures.forEach(t=>t.dispose());if(composer){bloomPass.dispose();savePass.renderTarget.dispose();composer.renderTarget1.dispose();composer.renderTarget2.dispose();}key.shadow.map?.dispose();renderer.dispose(); canvas.remove();
    },
  };
}
