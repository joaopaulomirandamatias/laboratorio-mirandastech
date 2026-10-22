// Functional scene objects: real beveled meshes with editable texture labels.
// The surrounding terrain is a generated image; all selectable layers remain 3D.
export function createMachine(T, root) {
  const mat = (color, extra = {}) => {
    const m = new T.MeshPhysicalMaterial({ color, metalness: .7, roughness: .26, clearcoat: .8, clearcoatRoughness: .2, envMapIntensity: 1.1, ...extra });
    m.color.convertSRGBToLinear(); return m;
  };
  const metal = mat(0x5a6c88, {roughness:.25,envMapIntensity:1.2}), dark = mat(0x35475e, { roughness: .22, envMapIntensity:1.5 });
  const copper = mat(0xe0a473, { metalness: .68, roughness: .26, envMapIntensity: 1.8 });
  const glass = mat(0x97c5f0, { metalness: .18, transparent: true, opacity: .21, roughness: .1, clearcoat: 1, side: T.DoubleSide, depthWrite: false });
  const lightBlue = new T.MeshBasicMaterial({ color: new T.Color(.4, .9, 2), toneMapped: false });
  const lightCopper = new T.MeshBasicMaterial({ color: new T.Color(1.1, .5, .2), toneMapped: false });
  const lightTeal = new T.MeshBasicMaterial({ color: new T.Color(.2, 1.3, 1.1), toneMapped: false });
  const layers = [], edges = [], glowMaterials = [], sourceObjects = [], textures = [];
  const loader = new T.TextureLoader();
  const icons = {};
  for (const name of ['search', 'code-xml', 'database', 'check', 'x', 'send']) {
    icons[name] = loader.load(`../../assets/icons/${name}.svg`);
    icons[name].encoding = T.sRGBEncoding; textures.push(icons[name]);
  }
  function roundedShape(w, h, r) {
    const s = new T.Shape();
    s.moveTo(-w/2+r,-h/2); s.lineTo(w/2-r,-h/2);
    s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r); s.lineTo(w/2,h/2-r);
    s.quadraticCurveTo(w/2,h/2,w/2-r,h/2); s.lineTo(-w/2+r,h/2);
    s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r); s.lineTo(-w/2,-h/2+r);
    s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2); return s;
  }
  function roundedBox(w,h,d,r=.07) {
    const b = Math.min(.035, d*.22, h*.15, w*.15);
    const g = new T.ExtrudeGeometry(roundedShape(w-b*2,h-b*2,Math.min(r,w*.2,h*.2)), { depth:Math.max(.005,d-b*2), bevelEnabled:true, bevelSize:b, bevelThickness:b, bevelSegments:3, curveSegments:8, steps:1 });
    g.translate(0,0,-(d-b*2)/2); return g;
  }
  function box(group,w,h,d,x,y,z,material=dark) {
    const m = new T.Mesh(roundedBox(w,h,d), material);
    m.position.set(x,y,z); m.castShadow = !material.transparent; m.receiveShadow = !material.transparent; group.add(m); return m;
  }
  function line(group, points, material=lightBlue, radius=.007) {
    const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
    const tube = new T.Mesh(new T.TubeGeometry(curve,Math.max(12,points.length*3),radius,4,false),material);
    group.add(tube); return tube;
  }
  function frame(group,w,h,r,x,y,z,material=lightBlue,horizontal=false) {
    const points = roundedShape(w,h,r).getPoints(56).map(p => horizontal ? [p.x+x,y,p.y+z] : [p.x+x,p.y+y,z]);
    return line(group,points,material,.006);
  }
  function icon(group,name,x,y,z,size=.28) {
    const m = new T.Mesh(new T.PlaneGeometry(size,size),new T.MeshBasicMaterial({map:icons[name],transparent:true,depthWrite:false,toneMapped:false,color:0xffffff}));
    m.position.set(x,y,z); group.add(m); return m;
  }
  function faceTexture(type) {
    const c=document.createElement('canvas'); c.width=512; c.height=384;
    const ctx=c.getContext('2d');
    ctx.fillStyle=type==='reply'?'rgba(210,231,255,.86)':'rgba(44,84,130,.26)';
    ctx.fillRect(0,0,512,384);
    ctx.fillStyle=type==='reply'?'#7898c4':'rgba(169,208,255,.66)';
    if(type==='question') {
      ctx.fillStyle='#dceaff';ctx.font='24px sans-serif';
      ctx.fillText('Explique como agentes',34,128);ctx.fillText('usam ferramentas.',34,165);
      ctx.fillStyle='#d47e55';ctx.fillRect(397,205,64,64);
    } else {
      ctx.fillRect(40,48,24,11);
      for(let i=0;i<4;i++)ctx.fillRect(40,100+i*46, 350-(i%2)*75,9);
      ctx.fillStyle='#4fc1b0';ctx.fillRect(40,308,155,10);
    }
    const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding; textures.push(t);return t;
  }
  function card(group,x,y,z,w,h,type='doc',rotation=0) {
    const g=new T.Group();g.position.set(x,y,z);g.rotation.y=rotation;group.add(g);
    box(g,w,h,.065,0,0,0,glass);
    const faceGeometry=new T.ShapeGeometry(roundedShape(w-.045,h-.045,.06));
    const positions=faceGeometry.attributes.position,uv=faceGeometry.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,(positions.getX(i)+w/2)/w,(positions.getY(i)+h/2)/h);
    const face=new T.Mesh(faceGeometry,new T.MeshBasicMaterial({map:faceTexture(type),transparent:true,opacity:type==='reply'?.98:.88,depthWrite:false}));
    face.position.z=.04;g.add(face);
    frame(g,w,h,.075,0,0,.048,type==='reply'?lightBlue:lightBlue);
    frame(g,w+.02,h+.02,.08,0,0,-.04,new T.MeshBasicMaterial({color:0x83aee0,transparent:true,opacity:.24}),false);
    return g;
  }
  for(let i=0;i<6;i++){
    const g=new T.Group();g.userData.layer=i;g.userData.width=3.35-i*.1;
    const w=g.userData.width,d=1.91-i*.04;
    const slab=box(g,w,.17,d,0,0,0,metal); slab.receiveShadow=true;
    const lower=box(g,w-.09,.035,d-.08,0,-.1,0,dark);
    const rimMat=new T.MeshBasicMaterial({color:i===4?new T.Color(1.1,.55,.25):new T.Color(.29,.5,.82),toneMapped:false,transparent:true,opacity:.65});
    frame(g,w-.04,d-.04,.1,0,.083,0,rimMat,true);edges.push(rimMat);
    frame(g,w-.02,d-.02,.1,0,-.065,0,new T.MeshBasicMaterial({color:0xd0a37d,transparent:true,opacity:.3}),true);
    const glowMat=new T.MeshBasicMaterial({color:i===4?0xd2694a:0x65b7fa,transparent:true,opacity:.03,depthWrite:false});
    const under=new T.Mesh(new T.PlaneGeometry(w-.1,d-.1),glowMat);under.rotation.x=-Math.PI/2;under.position.y=.094;g.add(under);glowMaterials.push(glowMat);
    g.position.set((i-2.5)*.57,(i-2.5)*1.58,0); root.add(g);layers.push(g);
  }
  // The question is a screen in a substantial glass housing.
  card(layers[0],0,.54,.24,2.56,.83,'question',-.04);
  icon(layers[0],'send',.94,.42,.31,.23);
  // Documents are staggered in depth and can be removed by the context control.
  for(const p of [[-.86,.61,-.2,.68,.91,-.11],[-.15,.72,-.28,.79,1.12,.02],[.62,.58,-.15,.73,.88,.12],[-.5,.51,.42,.77,.78,-.05],[.36,.54,.46,.83,.84,.05]]) {
    sourceObjects.push(card(layers[1],...p.slice(0,5),'doc',p[5]));
  }
  // A beveled compute core with etched traces on its three visible faces.
  const chip=box(layers[2],1.27,1.02,1.14,0,.64,0,dark);
  const etchMat = new T.MeshStandardMaterial({color:0xc29b74,metalness:.8,roughness:.28,envMapIntensity:1.2});
  const circuitPaths=[[-.58,.21,-.12,.37,.08,.26,.53,.51],[-.58,.52,-.29,.62,-.1,.53,.18,.8,.58,.66],[-.58,.93,-.18,.85,.1,1.1,.58,1.03]];
  for(const coords of circuitPaths){
    const ps=[];for(let i=0;i<coords.length;i+=2)ps.push([coords[i],coords[i+1],.58]);line(layers[2],ps,etchMat,.006);
  }
  for(let i=0;i<4;i++){
    line(layers[2],[[.64,.22+i*.23,-.52],[.64,.4+i*.2,-.1],[.64,.32+i*.22,.48]],etchMat,.005);
    line(layers[2],[[-.58+i*.33,1.16,-.53],[-.37+i*.28,1.16,-.12],[-.48+i*.34,1.16,.52]],etchMat,.005);
  }
  const core=new T.Mesh(new T.IcosahedronGeometry(.105,1),new T.MeshBasicMaterial({color:new T.Color(3,1.35,.45),toneMapped:false}));
  core.position.set(-.12,.63,.61);layers[2].add(core);
  const coreLight=new T.PointLight(0xffbb76,.8,2.7);coreLight.position.copy(core.position);layers[2].add(coreLight);
  // Rounded tool sockets with library icons instead of placeholder marks.
  [-.86,0,.86].forEach((x,i)=>{
    const g=new T.Group();g.position.set(x,.47,.05);g.rotation.y=i===0?-.05:i===2?.05:0;layers[3].add(g);
    box(g,.63,.78,.54,0,0,0,dark);
    frame(g,.54,.68,.06,0,0,.28,new T.MeshBasicMaterial({color:0x6a8db6,transparent:true,opacity:.45}));
    icon(g,['search','code-xml','database'][i],0,.02,.293,.34);
  });
  // One-piece copper portal: bevels catch the white studio highlights.
  const gateShape=new T.Shape();
  gateShape.moveTo(-.72,0);gateShape.lineTo(-.72,1.12);gateShape.quadraticCurveTo(-.72,1.23,-.6,1.23);gateShape.lineTo(.6,1.23);gateShape.quadraticCurveTo(.72,1.23,.72,1.12);gateShape.lineTo(.72,0);gateShape.lineTo(.43,0);gateShape.lineTo(.43,.94);gateShape.lineTo(-.43,.94);gateShape.lineTo(-.43,0);gateShape.closePath();
  const gateGeometry=new T.ExtrudeGeometry(gateShape,{depth:.25,bevelEnabled:true,bevelSize:.045,bevelThickness:.045,bevelSegments:4,curveSegments:10,steps:1});
  const gate=new T.Mesh(gateGeometry,copper);gate.position.set(-.24,.1,-.04);gate.castShadow=true;gate.receiveShadow=true;layers[4].add(gate);
  frame(layers[4],1.42,1.2,.1,-.24,.73,.267,new T.MeshBasicMaterial({color:new T.Color(1.5,.78,.42),toneMapped:false,transparent:true,opacity:.6}));
  box(layers[4],.57,.78,.37,.9,.49,.07,dark);icon(layers[4],'x',.9,.49,.269,.3);
  const gateStatusMat=mat(0x4fc1b0,{metalness:.12,roughness:.14,emissive:0x1f8f80,emissiveIntensity:.8});
  box(layers[4],.42,.5,.08,-.25,.64,.34,gateStatusMat);
  const check=icon(layers[4],'check',-.25,.64,.388,.27);
  const blockedCross=icon(layers[4],'x',-.25,.64,.39,.27);blockedCross.visible=false;
  const gateLight=new T.PointLight(0x4fc1b0,.5,2.4);gateLight.position.set(-.25,.7,.6);layers[4].add(gateLight);
  card(layers[5],0,.65,.03,1.56,1.1,'reply',-.03);

  // A thin, continuous helical path with traveling points connects the layers.
  const trajectory=new T.Group();root.add(trajectory);
  const pathPoints=[];
  function pathAt(t){const a=t*Math.PI*7;return new T.Vector3((t-.5)*2.85+Math.sin(a)*.19,-3.9+t*8.4,.19+Math.cos(a)*.33);}
  for(let i=0;i<=160;i++)pathPoints.push(pathAt(i/160));
  const trail=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pathPoints),200,.009,4,false),new T.MeshBasicMaterial({color:new T.Color(.2,1.3,2.8),toneMapped:false,transparent:true,opacity:.48,depthWrite:false}));trajectory.add(trail);
  const particles=new T.InstancedMesh(new T.SphereGeometry(.022,6,4),new T.MeshBasicMaterial({color:new T.Color(.6,1.9,3.2),toneMapped:false}),88);trajectory.add(particles);
  const dummy=new T.Object3D();
  // The orbit arcs are subtle depth cues, not a background substitute.
  const arcMat=new T.MeshBasicMaterial({color:0x6591c4,transparent:true,opacity:.13,depthWrite:false});
  for(let k=0;k<2;k++){
    const pts=[];for(let i=0;i<90;i++){const a=i/89*Math.PI*1.7+.25;pts.push([Math.cos(a)*(3.9+k*.35),Math.sin(a)*.7+(k?-.8:1.0),Math.sin(a)*2.1]);}
    line(root,pts,arcMat,.006);
  }
  return { layers, edges, glowMaterials, core, gateStatusMat, check, blockedCross, trajectory, particles, dummy, sourceObjects, textures, pathAt };
}
