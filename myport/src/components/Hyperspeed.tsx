"use client";

import { BloomEffect, EffectComposer, EffectPass, RenderPass } from 'postprocessing';
import { FC, useEffect, useRef } from 'react';
import * as THREE from 'three';
import './Hyperspeed.css';

interface Distortion {
  uniforms: Record<string, { value: unknown }>;
  getDistortion: string;
  getJS?: (progress: number, time: number) => THREE.Vector3;
}
interface Colors {
  roadColor: number; islandColor: number; background: number;
  shoulderLines: number; brokenLines: number;
  leftCars: number[]; rightCars: number[]; sticks: number;
}
interface HyperspeedOptions {
  onSpeedUp?: (ev: MouseEvent | TouchEvent) => void;
  onSlowDown?: (ev: MouseEvent | TouchEvent) => void;
  distortion?: string | Distortion;
  length: number; roadWidth: number; islandWidth: number; lanesPerRoad: number;
  fov: number; fovSpeedUp: number; speedUp: number; carLightsFade: number;
  totalSideLightSticks: number; lightPairsPerRoadWay: number;
  shoulderLinesWidthPercentage: number; brokenLinesWidthPercentage: number;
  brokenLinesLengthPercentage: number;
  lightStickWidth: [number, number]; lightStickHeight: [number, number];
  movingAwaySpeed: [number, number]; movingCloserSpeed: [number, number];
  carLightsLength: [number, number]; carLightsRadius: [number, number];
  carWidthPercentage: [number, number]; carShiftX: [number, number];
  carFloorSeparation: [number, number];
  colors: Colors;
}
interface HyperspeedProps {
  effectOptions?: Partial<HyperspeedOptions>;
}

const defaultOptions: HyperspeedOptions = {
  onSpeedUp: () => {}, onSlowDown: () => {},
  distortion: 'turbulentDistortion',
  length: 400, roadWidth: 10, islandWidth: 2, lanesPerRoad: 4,
  fov: 90, fovSpeedUp: 150, speedUp: 2, carLightsFade: 0.4,
  totalSideLightSticks: 20, lightPairsPerRoadWay: 40,
  shoulderLinesWidthPercentage: 0.05, brokenLinesWidthPercentage: 0.1,
  brokenLinesLengthPercentage: 0.5,
  lightStickWidth: [0.12, 0.5], lightStickHeight: [1.3, 1.7],
  movingAwaySpeed: [60, 80], movingCloserSpeed: [-120, -160],
  carLightsLength: [400 * 0.03, 400 * 0.2], carLightsRadius: [0.05, 0.14],
  carWidthPercentage: [0.3, 0.5], carShiftX: [-0.8, 0.8],
  carFloorSeparation: [0, 5],
  colors: {
    roadColor: 0x080808, islandColor: 0x0a0a0a, background: 0x000000,
    shoulderLines: 0xffffff, brokenLines: 0xffffff,
    leftCars: [0xd856bf, 0x6750a2, 0xc247ac],
    rightCars: [0x03b3c3, 0x0e5ea5, 0x324555],
    sticks: 0x03b3c3,
  },
};

function nsin(val: number) { return Math.sin(val) * 0.5 + 0.5; }
function random(base: number | [number, number]): number {
  if (Array.isArray(base)) return Math.random() * (base[1] - base[0]) + base[0];
  return Math.random() * base;
}
function pickRandom<T>(arr: T | T[]): T {
  if (Array.isArray(arr)) return arr[Math.floor(Math.random() * arr.length)];
  return arr;
}
function lerp(current: number, target: number, speed = 0.1, limit = 0.001): number {
  let change = (target - current) * speed;
  if (Math.abs(change) < limit) change = target - current;
  return change;
}

// ── Uniforms & distortions ───────────────────────────────────────────────────
const mountainUniforms = { uFreq: { value: new THREE.Vector3(3,6,10) }, uAmp: { value: new THREE.Vector3(30,30,20) } };
const xyUniforms = { uFreq: { value: new THREE.Vector2(5,2) }, uAmp: { value: new THREE.Vector2(25,15) } };
const LongRaceUniforms = { uFreq: { value: new THREE.Vector2(2,3) }, uAmp: { value: new THREE.Vector2(35,10) } };
const turbulentUniforms = { uFreq: { value: new THREE.Vector4(4,8,8,1) }, uAmp: { value: new THREE.Vector4(25,5,10,10) } };
const deepUniforms = { uFreq: { value: new THREE.Vector2(4,8) }, uAmp: { value: new THREE.Vector2(10,20) }, uPowY: { value: new THREE.Vector2(20,2) } };
const distortion_uniforms = { uDistortionX: { value: new THREE.Vector2(80,3) }, uDistortionY: { value: new THREE.Vector2(-40,2.5) } };

const distortions: Record<string, Distortion> = {
  mountainDistortion: { uniforms: mountainUniforms, getDistortion: `uniform vec3 uAmp;uniform vec3 uFreq;#define PI 3.14159265358979\nfloat nsin(float val){return sin(val)*0.5+0.5;}vec3 getDistortion(float progress){float f=0.02;return vec3(cos(progress*PI*uFreq.x+uTime)*uAmp.x-cos(f*PI*uFreq.x+uTime)*uAmp.x,nsin(progress*PI*uFreq.y+uTime)*uAmp.y-nsin(f*PI*uFreq.y+uTime)*uAmp.y,nsin(progress*PI*uFreq.z+uTime)*uAmp.z-nsin(f*PI*uFreq.z+uTime)*uAmp.z);}`, getJS:(p,t)=>{const f=0.02,u=mountainUniforms.uFreq.value,a=mountainUniforms.uAmp.value;return new THREE.Vector3(Math.cos(p*Math.PI*u.x+t)*a.x-Math.cos(f*Math.PI*u.x+t)*a.x,nsin(p*Math.PI*u.y+t)*a.y-nsin(f*Math.PI*u.y+t)*a.y,nsin(p*Math.PI*u.z+t)*a.z-nsin(f*Math.PI*u.z+t)*a.z).multiply(new THREE.Vector3(2,2,2)).add(new THREE.Vector3(0,0,-5));}},
  xyDistortion: { uniforms: xyUniforms, getDistortion: `uniform vec2 uFreq;uniform vec2 uAmp;#define PI 3.14159265358979\nvec3 getDistortion(float progress){float f=0.02;return vec3(cos(progress*PI*uFreq.x+uTime)*uAmp.x-cos(f*PI*uFreq.x+uTime)*uAmp.x,sin(progress*PI*uFreq.y+PI/2.+uTime)*uAmp.y-sin(f*PI*uFreq.y+PI/2.+uTime)*uAmp.y,0.);}`, getJS:(p,t)=>{const f=0.02,u=xyUniforms.uFreq.value,a=xyUniforms.uAmp.value;return new THREE.Vector3(Math.cos(p*Math.PI*u.x+t)*a.x-Math.cos(f*Math.PI*u.x+t)*a.x,Math.sin(p*Math.PI*u.y+t+Math.PI/2)*a.y-Math.sin(f*Math.PI*u.y+t+Math.PI/2)*a.y,0).multiply(new THREE.Vector3(2,0.4,1)).add(new THREE.Vector3(0,0,-3));}},
  LongRaceDistortion: { uniforms: LongRaceUniforms, getDistortion: `uniform vec2 uFreq;uniform vec2 uAmp;#define PI 3.14159265358979\nvec3 getDistortion(float progress){float c=0.0125;return vec3(sin(progress*PI*uFreq.x+uTime)*uAmp.x-sin(c*PI*uFreq.x+uTime)*uAmp.x,sin(progress*PI*uFreq.y+uTime)*uAmp.y-sin(c*PI*uFreq.y+uTime)*uAmp.y,0.);}`, getJS:(p,t)=>{const c=0.0125,u=LongRaceUniforms.uFreq.value,a=LongRaceUniforms.uAmp.value;return new THREE.Vector3(Math.sin(p*Math.PI*u.x+t)*a.x-Math.sin(c*Math.PI*u.x+t)*a.x,Math.sin(p*Math.PI*u.y+t)*a.y-Math.sin(c*Math.PI*u.y+t)*a.y,0).multiply(new THREE.Vector3(1,1,0)).add(new THREE.Vector3(0,0,-5));}},
  turbulentDistortion: { uniforms: turbulentUniforms, getDistortion: `uniform vec4 uFreq;uniform vec4 uAmp;float nsin(float v){return sin(v)*0.5+0.5;}#define PI 3.14159265358979\nfloat getDistortionX(float p){return(cos(PI*p*uFreq.r+uTime)*uAmp.r+pow(cos(PI*p*uFreq.g+uTime*(uFreq.g/uFreq.r)),2.)*uAmp.g);}float getDistortionY(float p){return(-nsin(PI*p*uFreq.b+uTime)*uAmp.b+-pow(nsin(PI*p*uFreq.a+uTime/(uFreq.b/uFreq.a)),5.)*uAmp.a);}vec3 getDistortion(float p){return vec3(getDistortionX(p)-getDistortionX(0.0125),getDistortionY(p)-getDistortionY(0.0125),0.);}`, getJS:(p,t)=>{const u=turbulentUniforms.uFreq.value,a=turbulentUniforms.uAmp.value;const gx=(v:number)=>Math.cos(Math.PI*v*u.x+t)*a.x+Math.pow(Math.cos(Math.PI*v*u.y+t*(u.y/u.x)),2)*a.y;const gy=(v:number)=>-nsin(Math.PI*v*u.z+t)*a.z-Math.pow(nsin(Math.PI*v*u.w+t/(u.z/u.w)),5)*a.w;return new THREE.Vector3(gx(p)-gx(p+0.007),gy(p)-gy(p+0.007),0).multiply(new THREE.Vector3(-2,-5,0)).add(new THREE.Vector3(0,0,-10));}},
  turbulentDistortionStill: { uniforms: turbulentUniforms, getDistortion: `uniform vec4 uFreq;uniform vec4 uAmp;float nsin(float v){return sin(v)*0.5+0.5;}#define PI 3.14159265358979\nfloat getDistortionX(float p){return(cos(PI*p*uFreq.r)*uAmp.r+pow(cos(PI*p*uFreq.g*(uFreq.g/uFreq.r)),2.)*uAmp.g);}float getDistortionY(float p){return(-nsin(PI*p*uFreq.b)*uAmp.b+-pow(nsin(PI*p*uFreq.a/(uFreq.b/uFreq.a)),5.)*uAmp.a);}vec3 getDistortion(float p){return vec3(getDistortionX(p)-getDistortionX(0.02),getDistortionY(p)-getDistortionY(0.02),0.);}` },
  deepDistortion: { uniforms: deepUniforms, getDistortion: `uniform vec2 uFreq;uniform vec2 uAmp;uniform vec2 uPowY;float nsin(float v){return sin(v)*0.5+0.5;}#define PI 3.14159265358979\nfloat getDistortionX(float p){return(sin(p*PI*uFreq.x+uTime)*uAmp.x);}float getDistortionY(float p){return(pow(abs(p*uPowY.x),uPowY.y)+sin(p*PI*uFreq.y+uTime)*uAmp.y);}vec3 getDistortion(float p){return vec3(getDistortionX(p)-getDistortionX(0.02),getDistortionY(p)-getDistortionY(0.02),0.);}`, getJS:(p,t)=>{const u=deepUniforms.uFreq.value,a=deepUniforms.uAmp.value,py=deepUniforms.uPowY.value;const gx=(v:number)=>Math.sin(v*Math.PI*u.x+t)*a.x;const gy=(v:number)=>Math.pow(v*py.x,py.y)+Math.sin(v*Math.PI*u.y+t)*a.y;return new THREE.Vector3(gx(p)-gx(p+0.01),gy(p)-gy(p+0.01),0).multiply(new THREE.Vector3(-2,-4,0)).add(new THREE.Vector3(0,0,-10));}},
};

const distortion_vertex = `#define PI 3.14159265358979\nuniform vec2 uDistortionX;uniform vec2 uDistortionY;float nsin(float v){return sin(v)*0.5+0.5;}vec3 getDistortion(float p){p=clamp(p,0.,1.);return vec3(uDistortionX.r*nsin(p*PI*uDistortionX.g-PI/2.),uDistortionY.r*nsin(p*PI*uDistortionY.g-PI/2.),0.);}`;

// ── GLSL shaders ─────────────────────────────────────────────────────────────
const carLightsFragment = `#define USE_FOG;\n${THREE.ShaderChunk['fog_pars_fragment']}\nvarying vec3 vColor;varying vec2 vUv;uniform vec2 uFade;void main(){vec3 color=vec3(vColor);float alpha=smoothstep(uFade.x,uFade.y,vUv.x);gl_FragColor=vec4(color,alpha);if(gl_FragColor.a<0.0001)discard;\n${THREE.ShaderChunk['fog_fragment']}}`;
const carLightsVertex = `#define USE_FOG;\n${THREE.ShaderChunk['fog_pars_vertex']}\nattribute vec3 aOffset;attribute vec3 aMetrics;attribute vec3 aColor;uniform float uTravelLength;uniform float uTime;varying vec2 vUv;varying vec3 vColor;#include <getDistortion_vertex>\nvoid main(){vec3 transformed=position.xyz;float radius=aMetrics.r;float myLength=aMetrics.g;float speed=aMetrics.b;transformed.xy*=radius;transformed.z*=myLength;transformed.z+=myLength-mod(uTime*speed+aOffset.z,uTravelLength);transformed.xy+=aOffset.xy;float progress=abs(transformed.z/uTravelLength);transformed.xyz+=getDistortion(progress);vec4 mvPosition=modelViewMatrix*vec4(transformed,1.);gl_Position=projectionMatrix*mvPosition;vUv=uv;vColor=aColor;\n${THREE.ShaderChunk['fog_vertex']}}`;
const sideSticksVertex = `#define USE_FOG;\n${THREE.ShaderChunk['fog_pars_vertex']}\nattribute float aOffset;attribute vec3 aColor;attribute vec2 aMetrics;uniform float uTravelLength;uniform float uTime;varying vec3 vColor;mat4 rotationY(in float a){return mat4(cos(a),0,sin(a),0,0,1,0,0,-sin(a),0,cos(a),0,0,0,0,1);}#include <getDistortion_vertex>\nvoid main(){vec3 transformed=position.xyz;float width=aMetrics.x;float height=aMetrics.y;transformed.xy*=vec2(width,height);float time=mod(uTime*60.*2.+aOffset,uTravelLength);transformed=(rotationY(3.14/2.)*vec4(transformed,1.)).xyz;transformed.z+=-uTravelLength+time;float progress=abs(transformed.z/uTravelLength);transformed.xyz+=getDistortion(progress);transformed.y+=height/2.;transformed.x+=-width/2.;vec4 mvPosition=modelViewMatrix*vec4(transformed,1.);gl_Position=projectionMatrix*mvPosition;vColor=aColor;\n${THREE.ShaderChunk['fog_vertex']}}`;
const sideSticksFragment = `#define USE_FOG;\n${THREE.ShaderChunk['fog_pars_fragment']}\nvarying vec3 vColor;void main(){gl_FragColor=vec4(vColor,1.);\n${THREE.ShaderChunk['fog_fragment']}}`;
const roadVertex = `#define USE_FOG;\nuniform float uTime;\n${THREE.ShaderChunk['fog_pars_vertex']}\nuniform float uTravelLength;varying vec2 vUv;#include <getDistortion_vertex>\nvoid main(){vec3 transformed=position.xyz;vec3 distortion=getDistortion((transformed.y+uTravelLength/2.)/uTravelLength);transformed.x+=distortion.x;transformed.z+=distortion.y;transformed.y+=-1.*distortion.z;vec4 mvPosition=modelViewMatrix*vec4(transformed,1.);gl_Position=projectionMatrix*mvPosition;vUv=uv;\n${THREE.ShaderChunk['fog_vertex']}}`;
const islandFragment = `#define USE_FOG;\nvarying vec2 vUv;uniform vec3 uColor;uniform float uTime;\n${THREE.ShaderChunk['fog_pars_fragment']}\nvoid main(){gl_FragColor=vec4(uColor,1.);\n${THREE.ShaderChunk['fog_fragment']}}`;
const roadFragment = `#define USE_FOG;\nvarying vec2 vUv;uniform vec3 uColor;uniform float uTime;uniform float uLanes;uniform vec3 uBrokenLinesColor;uniform vec3 uShoulderLinesColor;uniform float uShoulderLinesWidthPercentage;uniform float uBrokenLinesWidthPercentage;uniform float uBrokenLinesLengthPercentage;\n${THREE.ShaderChunk['fog_pars_fragment']}\nvoid main(){vec2 uv=vUv;vec3 color=vec3(uColor);uv.y=mod(uv.y+uTime*0.05,1.);float laneWidth=1.0/uLanes;float brokenLineWidth=laneWidth*uBrokenLinesWidthPercentage;float laneEmptySpace=1.-uBrokenLinesLengthPercentage;float brokenLines=step(1.0-brokenLineWidth,fract(uv.x*2.0))*step(laneEmptySpace,fract(uv.y*10.0));float sideLines=step(1.0-brokenLineWidth,fract((uv.x-laneWidth*(uLanes-1.0))*2.0))+step(brokenLineWidth,uv.x);brokenLines=mix(brokenLines,sideLines,uv.x);gl_FragColor=vec4(color,1.);\n${THREE.ShaderChunk['fog_fragment']}}`;

// ── Scene classes ─────────────────────────────────────────────────────────────
class CarLights {
  webgl: App; options: HyperspeedOptions; colors: number[]; speed: [number,number]; fade: THREE.Vector2; mesh!: THREE.Mesh;
  constructor(w: App, o: HyperspeedOptions, c: number[], s: [number,number], f: THREE.Vector2) { this.webgl=w; this.options=o; this.colors=c; this.speed=s; this.fade=f; }
  init() {
    const o=this.options; const curve=new THREE.LineCurve3(new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-1));
    const geo=new THREE.TubeGeometry(curve,40,1,8,false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inst=new THREE.InstancedBufferGeometry().copy(geo as any) as THREE.InstancedBufferGeometry;
    inst.instanceCount=o.lightPairsPerRoadWay*2;
    const laneW=o.roadWidth/o.lanesPerRoad; const aOffset:number[]=[]; const aMetrics:number[]=[]; const aColor:number[]=[];
    const colorArr=this.colors.map(c=>new THREE.Color(c));
    for(let i=0;i<o.lightPairsPerRoadWay;i++){
      const radius=random(o.carLightsRadius),length=random(o.carLightsLength),spd=random(this.speed);
      const lane=i%o.lanesPerRoad; let lx=lane*laneW-o.roadWidth/2+laneW/2+random(o.carShiftX)*laneW;
      const cw=random(o.carWidthPercentage)*laneW; const oy=random(o.carFloorSeparation)+radius*1.3; const oz=-random(o.length);
      aOffset.push(lx-cw/2,oy,oz,lx+cw/2,oy,oz); aMetrics.push(radius,length,spd,radius,length,spd);
      const col=pickRandom<THREE.Color>(colorArr); aColor.push(col.r,col.g,col.b,col.r,col.g,col.b);
    }
    inst.setAttribute('aOffset',new THREE.InstancedBufferAttribute(new Float32Array(aOffset),3,false));
    inst.setAttribute('aMetrics',new THREE.InstancedBufferAttribute(new Float32Array(aMetrics),3,false));
    inst.setAttribute('aColor',new THREE.InstancedBufferAttribute(new Float32Array(aColor),3,false));
    const mat=new THREE.ShaderMaterial({ fragmentShader:carLightsFragment, vertexShader:carLightsVertex, transparent:true,
      uniforms:Object.assign({uTime:{value:0},uTravelLength:{value:o.length},uFade:{value:this.fade}},this.webgl.fogUniforms,typeof o.distortion==='object'?o.distortion.uniforms:{}) });
    mat.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <getDistortion_vertex>',typeof o.distortion==='object'?o.distortion.getDistortion:'');};
    this.mesh=new THREE.Mesh(inst,mat); this.mesh.frustumCulled=false; this.webgl.scene.add(this.mesh);
  }
  update(t:number){(this.mesh.material as THREE.ShaderMaterial).uniforms.uTime.value=t;}
}

class LightsSticks {
  webgl: App; options: HyperspeedOptions; mesh!: THREE.Mesh;
  constructor(w:App,o:HyperspeedOptions){this.webgl=w;this.options=o;}
  init(){
    const o=this.options; const geo=new THREE.PlaneGeometry(1,1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inst=new THREE.InstancedBufferGeometry().copy(geo as any) as THREE.InstancedBufferGeometry;
    inst.instanceCount=o.totalSideLightSticks;
    const step=o.length/(o.totalSideLightSticks-1); const aOffset:number[]=[]; const aColor:number[]=[]; const aMetrics:number[]=[];
    const colorArr=[new THREE.Color(o.colors.sticks)];
    for(let i=0;i<o.totalSideLightSticks;i++){
      aOffset.push((i-1)*step*2+step*Math.random());
      const col=pickRandom<THREE.Color>(colorArr); aColor.push(col.r,col.g,col.b);
      aMetrics.push(random(o.lightStickWidth),random(o.lightStickHeight));
    }
    inst.setAttribute('aOffset',new THREE.InstancedBufferAttribute(new Float32Array(aOffset),1,false));
    inst.setAttribute('aColor',new THREE.InstancedBufferAttribute(new Float32Array(aColor),3,false));
    inst.setAttribute('aMetrics',new THREE.InstancedBufferAttribute(new Float32Array(aMetrics),2,false));
    const mat=new THREE.ShaderMaterial({ fragmentShader:sideSticksFragment, vertexShader:sideSticksVertex, side:THREE.DoubleSide,
      uniforms:Object.assign({uTravelLength:{value:o.length},uTime:{value:0}},this.webgl.fogUniforms,typeof o.distortion==='object'?o.distortion.uniforms:{}) });
    mat.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <getDistortion_vertex>',typeof o.distortion==='object'?o.distortion.getDistortion:'');};
    this.mesh=new THREE.Mesh(inst,mat); this.mesh.frustumCulled=false; this.webgl.scene.add(this.mesh);
  }
  update(t:number){(this.mesh.material as THREE.ShaderMaterial).uniforms.uTime.value=t;}
}

class Road {
  webgl:App; options:HyperspeedOptions; uTime:{value:number};
  constructor(w:App,o:HyperspeedOptions){this.webgl=w;this.options=o;this.uTime={value:0};}
  createPlane(side:number,width:number,isRoad:boolean){
    const o=this.options; const geo=new THREE.PlaneGeometry(isRoad?o.roadWidth:o.islandWidth,o.length,20,100);
    let uni:Record<string,{value:unknown}>={uTravelLength:{value:o.length},uColor:{value:new THREE.Color(isRoad?o.colors.roadColor:o.colors.islandColor)},uTime:this.uTime};
    if(isRoad) uni=Object.assign(uni,{uLanes:{value:o.lanesPerRoad},uBrokenLinesColor:{value:new THREE.Color(o.colors.brokenLines)},uShoulderLinesColor:{value:new THREE.Color(o.colors.shoulderLines)},uShoulderLinesWidthPercentage:{value:o.shoulderLinesWidthPercentage},uBrokenLinesLengthPercentage:{value:o.brokenLinesLengthPercentage},uBrokenLinesWidthPercentage:{value:o.brokenLinesWidthPercentage}});
    const mat=new THREE.ShaderMaterial({fragmentShader:isRoad?roadFragment:islandFragment,vertexShader:roadVertex,side:THREE.DoubleSide,uniforms:Object.assign(uni,this.webgl.fogUniforms,typeof o.distortion==='object'?o.distortion.uniforms:{})});
    mat.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <getDistortion_vertex>',typeof o.distortion==='object'?o.distortion.getDistortion:'');};
    const mesh=new THREE.Mesh(geo,mat); mesh.rotation.x=-Math.PI/2; mesh.position.z=-o.length/2;
    mesh.position.x+=(o.islandWidth/2+o.roadWidth/2)*side; this.webgl.scene.add(mesh); return mesh;
  }
  init(){this.createPlane(-1,this.options.roadWidth,true);this.createPlane(1,this.options.roadWidth,true);this.createPlane(0,this.options.islandWidth,false);}
  update(t:number){this.uTime.value=t;}
}

// ── App ───────────────────────────────────────────────────────────────────────
class App {
  container:HTMLElement; options:HyperspeedOptions;
  renderer:THREE.WebGLRenderer; composer:EffectComposer;
  camera:THREE.PerspectiveCamera; scene:THREE.Scene;
  clock:THREE.Clock; assets:Record<string,unknown>; disposed:boolean;
  road:Road; leftCarLights:CarLights; rightCarLights:CarLights; leftSticks:LightsSticks;
  fogUniforms:Record<string,{value:unknown}>;
  fovTarget:number; speedUpTarget:number; speedUp:number; timeOffset:number; hasValidSize:boolean;

  constructor(container:HTMLElement, options:HyperspeedOptions){
    this.options=options;
    if(!this.options.distortion) this.options.distortion={uniforms:distortion_uniforms,getDistortion:distortion_vertex};
    this.container=container; this.hasValidSize=false;
    const w=Math.max(1,container.offsetWidth), h=Math.max(1,container.offsetHeight);
    this.renderer=new THREE.WebGLRenderer({antialias:false,alpha:true});
    this.renderer.setSize(w,h,false); this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
    this.composer=new EffectComposer(this.renderer);
    container.appendChild(this.renderer.domElement);
    this.camera=new THREE.PerspectiveCamera(options.fov,w/h,0.1,10000);
    this.camera.position.set(0,8,-5);
    this.scene=new THREE.Scene(); this.scene.background=null;
    const fog=new THREE.Fog(options.colors.background,options.length*0.2,options.length*500);
    this.scene.fog=fog;
    this.fogUniforms={fogColor:{value:fog.color},fogNear:{value:fog.near},fogFar:{value:fog.far}};
    this.clock=new THREE.Clock(); this.assets={}; this.disposed=false;
    this.road=new Road(this,options);
    this.leftCarLights=new CarLights(this,options,options.colors.leftCars,options.movingAwaySpeed,new THREE.Vector2(0,1-options.carLightsFade));
    this.rightCarLights=new CarLights(this,options,options.colors.rightCars,options.movingCloserSpeed,new THREE.Vector2(1,0+options.carLightsFade));
    this.leftSticks=new LightsSticks(this,options);
    this.fovTarget=options.fov; this.speedUpTarget=0; this.speedUp=0; this.timeOffset=0;
    this.tick=this.tick.bind(this); this.init=this.init.bind(this); this.setSize=this.setSize.bind(this);
    this.onMouseDown=this.onMouseDown.bind(this); this.onMouseUp=this.onMouseUp.bind(this);
    this.onTouchStart=this.onTouchStart.bind(this); this.onTouchEnd=this.onTouchEnd.bind(this);
    this.onWindowResize=this.onWindowResize.bind(this);
    window.addEventListener('resize',this.onWindowResize);
    if(w>0&&h>0) this.hasValidSize=true;
  }
  onWindowResize(){const w=this.container.offsetWidth,h=this.container.offsetHeight;if(w<=0||h<=0){this.hasValidSize=false;return;}this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.composer.setSize(w,h);this.hasValidSize=true;}
  initPasses(){
    const rp=new RenderPass(this.scene,this.camera);
    const bp=new EffectPass(this.camera,new BloomEffect({luminanceThreshold:0.2,luminanceSmoothing:0,resolutionScale:0.5}));
    rp.renderToScreen=false; bp.renderToScreen=true;
    this.composer.addPass(rp); this.composer.addPass(bp);
  }
  loadAssets():Promise<void>{return Promise.resolve();}
  init(){
    this.initPasses(); const o=this.options;
    this.road.init();
    this.leftCarLights.init(); this.leftCarLights.mesh.position.setX(-o.roadWidth/2-o.islandWidth/2);
    this.rightCarLights.init(); this.rightCarLights.mesh.position.setX(o.roadWidth/2+o.islandWidth/2);
    this.leftSticks.init(); this.leftSticks.mesh.position.setX(-(o.roadWidth+o.islandWidth/2));
    this.container.addEventListener('mousedown',this.onMouseDown);
    this.container.addEventListener('mouseup',this.onMouseUp);
    this.container.addEventListener('mouseout',this.onMouseUp);
    this.container.addEventListener('touchstart',this.onTouchStart,{passive:true});
    this.container.addEventListener('touchend',this.onTouchEnd,{passive:true});
    this.tick();
  }
  onMouseDown(ev:MouseEvent){if(this.options.onSpeedUp)this.options.onSpeedUp(ev);this.fovTarget=this.options.fovSpeedUp;this.speedUpTarget=this.options.speedUp;}
  onMouseUp(ev:MouseEvent){if(this.options.onSlowDown)this.options.onSlowDown(ev);this.fovTarget=this.options.fov;this.speedUpTarget=0;}
  onTouchStart(ev:TouchEvent){if(this.options.onSpeedUp)this.options.onSpeedUp(ev);this.fovTarget=this.options.fovSpeedUp;this.speedUpTarget=this.options.speedUp;}
  onTouchEnd(ev:TouchEvent){if(this.options.onSlowDown)this.options.onSlowDown(ev);this.fovTarget=this.options.fov;this.speedUpTarget=0;}
  update(delta:number){
    const lp=Math.exp(-(-60*Math.log2(1-0.1))*delta);
    this.speedUp+=lerp(this.speedUp,this.speedUpTarget,lp,0.00001);
    this.timeOffset+=this.speedUp*delta;
    const time=this.clock.elapsedTime+this.timeOffset;
    this.rightCarLights.update(time); this.leftCarLights.update(time);
    this.leftSticks.update(time); this.road.update(time);
    const fovChange=lerp(this.camera.fov,this.fovTarget,lp);
    if(fovChange!==0){this.camera.fov+=fovChange*delta*6;this.camera.updateProjectionMatrix();}
    if(typeof this.options.distortion==='object'&&this.options.distortion.getJS){
      const d=this.options.distortion.getJS(0.025,time);
      this.camera.lookAt(new THREE.Vector3(this.camera.position.x+d.x,this.camera.position.y+d.y,this.camera.position.z+d.z));
      this.camera.updateProjectionMatrix();
    }
  }
  setSize(w:number,h:number,s:boolean){this.composer.setSize(w,h,s);}
  tick(){
    if(this.disposed)return;
    if(!this.hasValidSize){const w=this.container.offsetWidth,h=this.container.offsetHeight;if(w>0&&h>0){this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.composer.setSize(w,h);this.hasValidSize=true;}else{requestAnimationFrame(this.tick);return;}}
    const canvas=this.renderer.domElement;
    if(canvas.clientWidth>0&&canvas.clientHeight>0&&(canvas.width!==canvas.clientWidth||canvas.height!==canvas.clientHeight)){this.setSize(canvas.clientWidth,canvas.clientHeight,false);this.camera.aspect=canvas.clientWidth/canvas.clientHeight;this.camera.updateProjectionMatrix();}
    const delta=this.clock.getDelta();
    this.composer.render(delta); this.update(delta);
    requestAnimationFrame(this.tick);
  }
  dispose(){
    this.disposed=true;
    this.scene.traverse(o=>{const m=o as unknown as THREE.Mesh;if(!m.isMesh)return;m.geometry?.dispose();if(Array.isArray(m.material))m.material.forEach(x=>x.dispose());else(m.material as THREE.Material)?.dispose();});
    this.scene.clear(); this.renderer.dispose(); this.renderer.forceContextLoss();
    this.renderer.domElement?.parentNode?.removeChild(this.renderer.domElement);
    this.composer.dispose(); window.removeEventListener('resize',this.onWindowResize);
    this.container.removeEventListener('mousedown',this.onMouseDown);
    this.container.removeEventListener('mouseup',this.onMouseUp);
    this.container.removeEventListener('mouseout',this.onMouseUp);
    this.container.removeEventListener('touchstart',this.onTouchStart);
    this.container.removeEventListener('touchend',this.onTouchEnd);
  }
}

// ── React component ───────────────────────────────────────────────────────────
const Hyperspeed: FC<HyperspeedProps> = ({ effectOptions = {} }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<App | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const options: HyperspeedOptions = {
      ...defaultOptions, ...effectOptions,
      colors: { ...defaultOptions.colors, ...effectOptions.colors },
    };
    if (typeof options.distortion === 'string') options.distortion = distortions[options.distortion];
    const app = new App(container, options);
    appRef.current = app;
    app.loadAssets().then(app.init);
    return () => { appRef.current?.dispose(); appRef.current = null; };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return <div id="lights" ref={containerRef} />;
};

export default Hyperspeed;
