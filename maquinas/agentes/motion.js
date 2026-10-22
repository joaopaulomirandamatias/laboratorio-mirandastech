// Camera and motion for the layered artwork; independent of WebGL and AI video.
export function createIllustratedScene(plate, surface, { reducedMotion = false } = {}) {
  const camera = plate.querySelector('.machine-camera');
  const tilt = plate.querySelector('.machine-tilt');
  const svg = plate.querySelector('.machine-effects');
  const layers = [...plate.querySelectorAll('[data-art-layer]')];
  const centers = [[.32,.885],[.39,.775],[.48,.615],[.58,.455],[.66,.30],[.73,.10]];
  const animations = [];
  let requested = !reducedMotion, visible = true, illustrated = true, current = -2, disposed = false;

  // Web Animations let the pause button work independently of OS preferences.
  layers.forEach((layer, i) => {
    const amplitude = 6 + i * .3;
    const bob = layer.querySelector('.layer-bob');
    const animation = bob.animate([
      { transform:`translate3d(0,${amplitude}px,0) rotate(-.22deg)` },
      { transform:`translate3d(${2}px,${-amplitude}px,0) rotate(.22deg)` },
      { transform:`translate3d(0,${amplitude}px,0) rotate(-.22deg)` },
    ], { duration:5200, delay:-i*90, iterations:Infinity, easing:'ease-in-out' });
    animations.push(animation);
  });
  const pulse = plate.querySelector('.core-pulse');
  animations.push(pulse.animate([{opacity:.2},{opacity:.85},{opacity:.2}], {duration:2600, iterations:Infinity, easing:'ease-in-out'}));
  for (const orbit of plate.querySelectorAll('.energy-orbit')) {
    animations.push(orbit.animate([{strokeDashoffset:0},{strokeDashoffset:-300}], {duration:9000,iterations:Infinity}));
  }

  function sync() {
    if (disposed) return;
    const running = requested && visible && illustrated && !document.hidden;
    plate.dataset.motion = running ? 'running' : 'paused';
    for (const animation of animations) running ? animation.play() : animation.pause();
    if (running) svg.unpauseAnimations(); else svg.pauseAnimations();
    if (!running) tilt.style.transform = 'none';
  }
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
  observer.observe(surface);
  document.addEventListener('visibilitychange', sync);
  const pointer = event => {
    if (!requested || !illustrated || event.pointerType === 'touch') return;
    const rect = surface.getBoundingClientRect();
    const x = Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1));
    const y = Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1));
    tilt.style.transform = `perspective(1200px) rotateX(${-y*2.5}deg) rotateY(${x*4}deg)`;
  };
  const resetPointer = () => { tilt.style.transform = 'none'; };
  surface.addEventListener('pointermove',pointer);
  surface.addEventListener('pointerleave',resetPointer);
  sync();

  return {
    update(index, progress, result) {
      if (current !== index) {
        current = index;
        const zoom = index < 0 ? 1 : (innerWidth < 700 ? 1.12 : 1.18);
        const [x,y] = centers[index] || [.5,.5];
        camera.style.setProperty('--camera-scale',String(zoom));
        camera.style.setProperty('--camera-y',`${index < 0 ? 0 : (.53-(.5+(y-.5)*zoom))*100}%`);
        camera.style.setProperty('--camera-x',`${index < 0 ? 0 : (.56-(.5+(x-.5)*zoom))*100}%`);
        plate.dataset.active = String(index);
        plate.querySelector('.active-ring').setAttribute('transform', `translate(${x*1024} ${y*1536+85}) rotate(12)`);
        layers.forEach((layer,i) => { layer.dataset.focus = index < 0 || i === index ? 'active' : Math.abs(i-index) === 1 ? 'near' : 'far'; });
      }
      plate.dataset.context = String(result.sources.length > 0);
      plate.dataset.status = result.status;
      surface.dataset.sceneStep = String(index);
    },
    setMotion(enabled) { requested = enabled; sync(); },
    setVisible(enabled) { illustrated = enabled; sync(); },
    setReduced(enabled) { reducedMotion = enabled; requested = !enabled; sync(); },
    dispose() {
      disposed = true; observer.disconnect(); animations.forEach(animation=>animation.cancel());
      svg.pauseAnimations(); document.removeEventListener('visibilitychange',sync);
      surface.removeEventListener('pointermove',pointer);surface.removeEventListener('pointerleave',resetPointer);
    },
  };
}
