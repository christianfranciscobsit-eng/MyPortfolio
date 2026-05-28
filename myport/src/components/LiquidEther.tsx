"use client";

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import './LiquidEther.css';

export interface LiquidEtherProps {
  mouseForce?: number;
  cursorSize?: number;
  isViscous?: boolean;
  viscous?: number;
  iterationsViscous?: number;
  iterationsPoisson?: number;
  dt?: number;
  BFECC?: boolean;
  resolution?: number;
  isBounce?: boolean;
  colors?: string[];
  style?: React.CSSProperties;
  className?: string;
  autoDemo?: boolean;
  autoSpeed?: number;
  autoIntensity?: number;
  takeoverDuration?: number;
  autoResumeDelay?: number;
  autoRampDuration?: number;
}

interface SimOptions {
  iterations_poisson: number;
  iterations_viscous: number;
  mouse_force: number;
  resolution: number;
  cursor_size: number;
  viscous: number;
  isBounce: boolean;
  dt: number;
  isViscous: boolean;
  BFECC: boolean;
}

interface LiquidEtherWebGL {
  output?: { simulation?: { options: SimOptions; resize: () => void } };
  autoDriver?: {
    enabled: boolean;
    speed: number;
    resumeDelay: number;
    rampDurationMs: number;
    mouse?: { autoIntensity: number; takeoverDuration: number };
    forceStop: () => void;
  };
  resize: () => void;
  start: () => void;
  pause: () => void;
  dispose: () => void;
}

const defaultColors = ['#5227FF', '#FF9FFC', '#B497CF'];

// ── GLSL shaders ────────────────────────────────────────────────────────────
const face_vert = `attribute vec3 position;uniform vec2 px;uniform vec2 boundarySpace;varying vec2 uv;precision highp float;void main(){vec3 pos=position;vec2 scale=1.0-boundarySpace*2.0;pos.xy=pos.xy*scale;uv=vec2(0.5)+(pos.xy)*0.5;gl_Position=vec4(pos,1.0);}`;
const line_vert = `attribute vec3 position;uniform vec2 px;precision highp float;varying vec2 uv;void main(){vec3 pos=position;uv=0.5+pos.xy*0.5;vec2 n=sign(pos.xy);pos.xy=abs(pos.xy)-px*1.0;pos.xy*=n;gl_Position=vec4(pos,1.0);}`;
const mouse_vert = `precision highp float;attribute vec3 position;attribute vec2 uv;uniform vec2 center;uniform vec2 scale;uniform vec2 px;varying vec2 vUv;void main(){vec2 pos=position.xy*scale*2.0*px+center;vUv=uv;gl_Position=vec4(pos,0.0,1.0);}`;
const advection_frag = `precision highp float;uniform sampler2D velocity;uniform float dt;uniform bool isBFECC;uniform vec2 fboSize;uniform vec2 px;varying vec2 uv;void main(){vec2 ratio=max(fboSize.x,fboSize.y)/fboSize;if(isBFECC==false){vec2 vel=texture2D(velocity,uv).xy;vec2 uv2=uv-vel*dt*ratio;vec2 newVel=texture2D(velocity,uv2).xy;gl_FragColor=vec4(newVel,0.0,0.0);}else{vec2 spot_new=uv;vec2 vel_old=texture2D(velocity,uv).xy;vec2 spot_old=spot_new-vel_old*dt*ratio;vec2 vel_new1=texture2D(velocity,spot_old).xy;vec2 spot_new2=spot_old+vel_new1*dt*ratio;vec2 error=spot_new2-spot_new;vec2 spot_new3=spot_new-error/2.0;vec2 vel_2=texture2D(velocity,spot_new3).xy;vec2 spot_old2=spot_new3-vel_2*dt*ratio;vec2 newVel2=texture2D(velocity,spot_old2).xy;gl_FragColor=vec4(newVel2,0.0,0.0);}}`;
const color_frag = `precision highp float;uniform sampler2D velocity;uniform sampler2D palette;uniform vec4 bgColor;varying vec2 uv;void main(){vec2 vel=texture2D(velocity,uv).xy;float lenv=clamp(length(vel),0.0,1.0);vec3 c=texture2D(palette,vec2(lenv,0.5)).rgb;vec3 outRGB=mix(bgColor.rgb,c,lenv);float outA=mix(bgColor.a,1.0,lenv);gl_FragColor=vec4(outRGB,outA);}`;
const divergence_frag = `precision highp float;uniform sampler2D velocity;uniform float dt;uniform vec2 px;varying vec2 uv;void main(){float x0=texture2D(velocity,uv-vec2(px.x,0.0)).x;float x1=texture2D(velocity,uv+vec2(px.x,0.0)).x;float y0=texture2D(velocity,uv-vec2(0.0,px.y)).y;float y1=texture2D(velocity,uv+vec2(0.0,px.y)).y;float divergence=(x1-x0+y1-y0)/2.0;gl_FragColor=vec4(divergence/dt);}`;
const externalForce_frag = `precision highp float;uniform vec2 force;uniform vec2 center;uniform vec2 scale;uniform vec2 px;varying vec2 vUv;void main(){vec2 circle=(vUv-0.5)*2.0;float d=1.0-min(length(circle),1.0);d*=d;gl_FragColor=vec4(force*d,0.0,1.0);}`;
const poisson_frag = `precision highp float;uniform sampler2D pressure;uniform sampler2D divergence;uniform vec2 px;varying vec2 uv;void main(){float p0=texture2D(pressure,uv+vec2(px.x*2.0,0.0)).r;float p1=texture2D(pressure,uv-vec2(px.x*2.0,0.0)).r;float p2=texture2D(pressure,uv+vec2(0.0,px.y*2.0)).r;float p3=texture2D(pressure,uv-vec2(0.0,px.y*2.0)).r;float div=texture2D(divergence,uv).r;float newP=(p0+p1+p2+p3)/4.0-div;gl_FragColor=vec4(newP);}`;
const pressure_frag = `precision highp float;uniform sampler2D pressure;uniform sampler2D velocity;uniform vec2 px;uniform float dt;varying vec2 uv;void main(){float step=1.0;float p0=texture2D(pressure,uv+vec2(px.x*step,0.0)).r;float p1=texture2D(pressure,uv-vec2(px.x*step,0.0)).r;float p2=texture2D(pressure,uv+vec2(0.0,px.y*step)).r;float p3=texture2D(pressure,uv-vec2(0.0,px.y*step)).r;vec2 v=texture2D(velocity,uv).xy;vec2 gradP=vec2(p0-p1,p2-p3)*0.5;v=v-gradP*dt;gl_FragColor=vec4(v,0.0,1.0);}`;
const viscous_frag = `precision highp float;uniform sampler2D velocity;uniform sampler2D velocity_new;uniform float v;uniform vec2 px;uniform float dt;varying vec2 uv;void main(){vec2 old=texture2D(velocity,uv).xy;vec2 new0=texture2D(velocity_new,uv+vec2(px.x*2.0,0.0)).xy;vec2 new1=texture2D(velocity_new,uv-vec2(px.x*2.0,0.0)).xy;vec2 new2=texture2D(velocity_new,uv+vec2(0.0,px.y*2.0)).xy;vec2 new3=texture2D(velocity_new,uv-vec2(0.0,px.y*2.0)).xy;vec2 newv=4.0*old+v*dt*(new0+new1+new2+new3);newv/=4.0*(1.0+v*dt);gl_FragColor=vec4(newv,0.0,0.0);}`;

export default function LiquidEther({
  mouseForce = 20, cursorSize = 100, isViscous = false, viscous = 30,
  iterationsViscous = 32, iterationsPoisson = 32, dt = 0.014, BFECC = true,
  resolution = 0.5, isBounce = false, colors = defaultColors,
  style = {}, className = '', autoDemo = true, autoSpeed = 0.5,
  autoIntensity = 2.2, takeoverDuration = 0.25, autoResumeDelay = 1000,
  autoRampDuration = 0.6,
}: LiquidEtherProps): React.ReactElement {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const webglRef = useRef<LiquidEtherWebGL | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const isVisibleRef = useRef<boolean>(true);
  const resizeRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // ── palette texture ──────────────────────────────────────────────────────
    function makePaletteTexture(stops: string[]): THREE.DataTexture {
      const arr = stops.length === 0 ? ['#ffffff', '#ffffff'] : stops.length === 1 ? [stops[0], stops[0]] : stops;
      const w = arr.length;
      const data = new Uint8Array(w * 4);
      for (let i = 0; i < w; i++) {
        const c = new THREE.Color(arr[i]);
        data[i * 4] = Math.round(c.r * 255);
        data[i * 4 + 1] = Math.round(c.g * 255);
        data[i * 4 + 2] = Math.round(c.b * 255);
        data[i * 4 + 3] = 255;
      }
      const tex = new THREE.DataTexture(data, w, 1, THREE.RGBAFormat);
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      return tex;
    }
    const paletteTex = makePaletteTexture(colors);
    const bgVec4 = new THREE.Vector4(0, 0, 0, 0);

    // ── Common ───────────────────────────────────────────────────────────────
    class CommonClass {
      width = 0; height = 0; aspect = 1; pixelRatio = 1;
      fboWidth: number | null = null; fboHeight: number | null = null;
      time = 0; delta = 0;
      container: HTMLElement | null = null;
      renderer: THREE.WebGLRenderer | null = null;
      clock: THREE.Clock | null = null;
      init(container: HTMLElement) {
        this.container = container;
        this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        this.resize();
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.autoClear = false;
        this.renderer.setClearColor(new THREE.Color(0x000000), 0);
        this.renderer.setPixelRatio(this.pixelRatio);
        this.renderer.setSize(this.width, this.height);
        const el = this.renderer.domElement;
        el.style.width = '100%'; el.style.height = '100%'; el.style.display = 'block';
        this.clock = new THREE.Clock(); this.clock.start();
      }
      resize() {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.width = Math.max(1, Math.floor(rect.width));
        this.height = Math.max(1, Math.floor(rect.height));
        this.aspect = this.width / this.height;
        if (this.renderer) this.renderer.setSize(this.width, this.height, false);
      }
      update() {
        if (!this.clock) return;
        this.delta = this.clock.getDelta(); this.time += this.delta;
      }
    }
    const Common = new CommonClass();

    // ── Mouse ────────────────────────────────────────────────────────────────
    class MouseClass {
      mouseMoved = false; coords = new THREE.Vector2(); coords_old = new THREE.Vector2();
      diff = new THREE.Vector2(); timer: number | null = null;
      container: HTMLElement | null = null; docTarget: Document | null = null;
      listenerTarget: Window | null = null; isHoverInside = false;
      hasUserControl = false; isAutoActive = false; autoIntensity = 2.0;
      takeoverActive = false; takeoverStartTime = 0; takeoverDuration = 0.25;
      takeoverFrom = new THREE.Vector2(); takeoverTo = new THREE.Vector2();
      onInteract: (() => void) | null = null;
      private _onMouseMove = this.onDocumentMouseMove.bind(this);
      private _onTouchStart = this.onDocumentTouchStart.bind(this);
      private _onTouchMove = this.onDocumentTouchMove.bind(this);
      private _onTouchEnd = this.onTouchEnd.bind(this);
      private _onDocumentLeave = this.onDocumentLeave.bind(this);
      init(container: HTMLElement) {
        this.container = container;
        this.docTarget = container.ownerDocument || null;
        const dv = this.docTarget?.defaultView || (typeof window !== 'undefined' ? window : null);
        if (!dv) return;
        this.listenerTarget = dv;
        dv.addEventListener('mousemove', this._onMouseMove);
        dv.addEventListener('touchstart', this._onTouchStart, { passive: true });
        dv.addEventListener('touchmove', this._onTouchMove, { passive: true });
        dv.addEventListener('touchend', this._onTouchEnd);
        this.docTarget?.addEventListener('mouseleave', this._onDocumentLeave);
      }
      dispose() {
        this.listenerTarget?.removeEventListener('mousemove', this._onMouseMove);
        this.listenerTarget?.removeEventListener('touchstart', this._onTouchStart);
        this.listenerTarget?.removeEventListener('touchmove', this._onTouchMove);
        this.listenerTarget?.removeEventListener('touchend', this._onTouchEnd);
        this.docTarget?.removeEventListener('mouseleave', this._onDocumentLeave);
        this.listenerTarget = null; this.docTarget = null; this.container = null;
      }
      private isPointInside(cx: number, cy: number) {
        if (!this.container) return false;
        const r = this.container.getBoundingClientRect();
        return r.width > 0 && cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
      }
      private updateHoverState(cx: number, cy: number) { return (this.isHoverInside = this.isPointInside(cx, cy)); }
      setCoords(x: number, y: number) {
        if (!this.container) return;
        if (this.timer) window.clearTimeout(this.timer);
        const r = this.container.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        this.coords.set(((x - r.left) / r.width) * 2 - 1, -(((y - r.top) / r.height) * 2 - 1));
        this.mouseMoved = true;
        this.timer = window.setTimeout(() => { this.mouseMoved = false; }, 100);
      }
      setNormalized(nx: number, ny: number) { this.coords.set(nx, ny); this.mouseMoved = true; }
      onDocumentMouseMove(e: MouseEvent) {
        if (!this.updateHoverState(e.clientX, e.clientY)) return;
        if (this.onInteract) this.onInteract();
        if (this.isAutoActive && !this.hasUserControl && !this.takeoverActive) {
          if (!this.container) return;
          const r = this.container.getBoundingClientRect();
          this.takeoverFrom.copy(this.coords);
          this.takeoverTo.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
          this.takeoverStartTime = performance.now();
          this.takeoverActive = true; this.hasUserControl = true; this.isAutoActive = false; return;
        }
        this.setCoords(e.clientX, e.clientY); this.hasUserControl = true;
      }
      onDocumentTouchStart(e: TouchEvent) {
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        if (!this.updateHoverState(t.clientX, t.clientY)) return;
        if (this.onInteract) this.onInteract();
        this.setCoords(t.clientX, t.clientY); this.hasUserControl = true;
      }
      onDocumentTouchMove(e: TouchEvent) {
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        if (!this.updateHoverState(t.clientX, t.clientY)) return;
        if (this.onInteract) this.onInteract();
        this.setCoords(t.clientX, t.clientY);
      }
      onTouchEnd() { this.isHoverInside = false; }
      onDocumentLeave() { this.isHoverInside = false; }
      update() {
        if (this.takeoverActive) {
          const t = (performance.now() - this.takeoverStartTime) / (this.takeoverDuration * 1000);
          if (t >= 1) { this.takeoverActive = false; this.coords.copy(this.takeoverTo); this.coords_old.copy(this.coords); this.diff.set(0, 0); }
          else { const k = t * t * (3 - 2 * t); this.coords.copy(this.takeoverFrom).lerp(this.takeoverTo, k); }
        }
        this.diff.subVectors(this.coords, this.coords_old);
        this.coords_old.copy(this.coords);
        if (this.coords_old.x === 0 && this.coords_old.y === 0) this.diff.set(0, 0);
        if (this.isAutoActive && !this.takeoverActive) this.diff.multiplyScalar(this.autoIntensity);
      }
    }
    const Mouse = new MouseClass();

    // ── ShaderPass base ──────────────────────────────────────────────────────
    type Uniforms = Record<string, { value: unknown }>;
    class ShaderPass {
      props: Record<string, unknown>;
      uniforms?: Uniforms;
      scene: THREE.Scene | null = null;
      camera: THREE.Camera | null = null;
      material: THREE.RawShaderMaterial | null = null;
      geometry: THREE.BufferGeometry | null = null;
      plane: THREE.Mesh | null = null;
      constructor(props: Record<string, unknown>) {
        this.props = props || {};
        this.uniforms = (this.props.material as Record<string, unknown>)?.uniforms as Uniforms;
      }
      initBase() {
        this.scene = new THREE.Scene(); this.camera = new THREE.Camera();
        if (this.uniforms) {
          this.material = new THREE.RawShaderMaterial(this.props.material as THREE.ShaderMaterialParameters);
          this.geometry = new THREE.PlaneGeometry(2, 2);
          this.plane = new THREE.Mesh(this.geometry, this.material);
          this.scene.add(this.plane);
        }
      }
      update() {
        if (!Common.renderer || !this.scene || !this.camera) return;
        Common.renderer.setRenderTarget((this.props.output as THREE.WebGLRenderTarget) || null);
        Common.renderer.render(this.scene, this.camera);
        Common.renderer.setRenderTarget(null);
      }
    }

    // ── Advection ────────────────────────────────────────────────────────────
    class Advection extends ShaderPass {
      line!: THREE.LineSegments;
      constructor(p: Record<string, unknown>) {
        super({ material: { vertexShader: face_vert, fragmentShader: advection_frag, uniforms: { boundarySpace: { value: p.cellScale }, px: { value: p.cellScale }, fboSize: { value: p.fboSize }, velocity: { value: (p.src as THREE.WebGLRenderTarget).texture }, dt: { value: p.dt }, isBFECC: { value: true } } }, output: p.dst });
        this.uniforms = (this.props.material as Record<string, unknown>).uniforms as Uniforms;
        this.init();
      }
      init() {
        super.initBase();
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1,-1,0,-1,1,0,-1,1,0,1,1,0,1,1,0,1,-1,0,1,-1,0,-1,-1,0]), 3));
        this.line = new THREE.LineSegments(g, new THREE.RawShaderMaterial({ vertexShader: line_vert, fragmentShader: advection_frag, uniforms: this.uniforms! }));
        this.scene!.add(this.line);
      }
      update(args: { dt?: number; isBounce?: boolean; BFECC?: boolean } = {}) {
        if (!this.uniforms) return;
        if (args.dt !== undefined) this.uniforms.dt.value = args.dt;
        if (args.isBounce !== undefined) this.line.visible = args.isBounce;
        if (args.BFECC !== undefined) this.uniforms.isBFECC.value = args.BFECC;
        super.update();
      }
    }

    // ── ExternalForce ────────────────────────────────────────────────────────
    class ExternalForce extends ShaderPass {
      mouse!: THREE.Mesh;
      constructor(p: Record<string, unknown>) {
        super({ output: p.dst });
        this.init(p);
      }
      init(p: Record<string, unknown>) {
        super.initBase();
        const cs = p.cursor_size as number;
        const m = new THREE.RawShaderMaterial({ vertexShader: mouse_vert, fragmentShader: externalForce_frag, blending: THREE.AdditiveBlending, depthWrite: false, uniforms: { px: { value: p.cellScale }, force: { value: new THREE.Vector2() }, center: { value: new THREE.Vector2() }, scale: { value: new THREE.Vector2(cs, cs) } } });
        this.mouse = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
        this.scene!.add(this.mouse);
      }
      update(p: { mouse_force?: number; cursor_size?: number; cellScale?: THREE.Vector2 } = {}) {
        const fx = (Mouse.diff.x / 2) * (p.mouse_force || 0);
        const fy = (Mouse.diff.y / 2) * (p.mouse_force || 0);
        const cs = p.cursor_size || 0;
        const cx = p.cellScale?.x || 1; const cy = p.cellScale?.y || 1;
        const csx = cs * cx; const csy = cs * cy;
        const centerX = Math.min(Math.max(Mouse.coords.x, -1 + csx + cx * 2), 1 - csx - cx * 2);
        const centerY = Math.min(Math.max(Mouse.coords.y, -1 + csy + cy * 2), 1 - csy - cy * 2);
        const u = (this.mouse.material as THREE.RawShaderMaterial).uniforms;
        u.force.value.set(fx, fy); u.center.value.set(centerX, centerY); u.scale.value.set(cs, cs);
        super.update();
      }
    }

    // ── Viscous ──────────────────────────────────────────────────────────────
    class Viscous extends ShaderPass {
      constructor(p: Record<string, unknown>) {
        super({ material: { vertexShader: face_vert, fragmentShader: viscous_frag, uniforms: { boundarySpace: { value: p.boundarySpace }, velocity: { value: (p.src as THREE.WebGLRenderTarget).texture }, velocity_new: { value: (p.dst_ as THREE.WebGLRenderTarget).texture }, v: { value: p.viscous }, px: { value: p.cellScale }, dt: { value: p.dt } } }, output: p.dst, output0: p.dst_, output1: p.dst });
        this.initBase();
      }
      update(args: { viscous?: number; iterations?: number; dt?: number } = {}) {
        if (!this.uniforms) return;
        if (args.viscous !== undefined) this.uniforms.v.value = args.viscous;
        let fbo_in: THREE.WebGLRenderTarget, fbo_out: THREE.WebGLRenderTarget;
        for (let i = 0; i < (args.iterations ?? 0); i++) {
          if (i % 2 === 0) { fbo_in = this.props.output0 as THREE.WebGLRenderTarget; fbo_out = this.props.output1 as THREE.WebGLRenderTarget; }
          else { fbo_in = this.props.output1 as THREE.WebGLRenderTarget; fbo_out = this.props.output0 as THREE.WebGLRenderTarget; }
          this.uniforms.velocity_new.value = fbo_in.texture;
          this.props.output = fbo_out;
          if (args.dt !== undefined) this.uniforms.dt.value = args.dt;
          super.update();
        }
        return fbo_out!;
      }
    }

    // ── Divergence ───────────────────────────────────────────────────────────
    class Divergence extends ShaderPass {
      constructor(p: Record<string, unknown>) {
        super({ material: { vertexShader: face_vert, fragmentShader: divergence_frag, uniforms: { boundarySpace: { value: p.boundarySpace }, velocity: { value: (p.src as THREE.WebGLRenderTarget).texture }, px: { value: p.cellScale }, dt: { value: p.dt } } }, output: p.dst });
        this.initBase();
      }
      update(args: { vel?: THREE.WebGLRenderTarget } = {}) {
        if (this.uniforms && args.vel) this.uniforms.velocity.value = args.vel.texture;
        super.update();
      }
    }

    // ── Poisson ──────────────────────────────────────────────────────────────
    class Poisson extends ShaderPass {
      constructor(p: Record<string, unknown>) {
        super({ material: { vertexShader: face_vert, fragmentShader: poisson_frag, uniforms: { boundarySpace: { value: p.boundarySpace }, pressure: { value: (p.dst_ as THREE.WebGLRenderTarget).texture }, divergence: { value: (p.src as THREE.WebGLRenderTarget).texture }, px: { value: p.cellScale } } }, output: p.dst, output0: p.dst_, output1: p.dst });
        this.initBase();
      }
      update(args: { iterations?: number } = {}) {
        let p_in: THREE.WebGLRenderTarget, p_out: THREE.WebGLRenderTarget;
        for (let i = 0; i < (args.iterations ?? 0); i++) {
          if (i % 2 === 0) { p_in = this.props.output0 as THREE.WebGLRenderTarget; p_out = this.props.output1 as THREE.WebGLRenderTarget; }
          else { p_in = this.props.output1 as THREE.WebGLRenderTarget; p_out = this.props.output0 as THREE.WebGLRenderTarget; }
          if (this.uniforms) this.uniforms.pressure.value = p_in.texture;
          this.props.output = p_out; super.update();
        }
        return p_out!;
      }
    }

    // ── Pressure ─────────────────────────────────────────────────────────────
    class Pressure extends ShaderPass {
      constructor(p: Record<string, unknown>) {
        super({ material: { vertexShader: face_vert, fragmentShader: pressure_frag, uniforms: { boundarySpace: { value: p.boundarySpace }, pressure: { value: (p.src_p as THREE.WebGLRenderTarget).texture }, velocity: { value: (p.src_v as THREE.WebGLRenderTarget).texture }, px: { value: p.cellScale }, dt: { value: p.dt } } }, output: p.dst });
        this.initBase();
      }
      update(args: { vel?: THREE.WebGLRenderTarget; pressure?: THREE.WebGLRenderTarget } = {}) {
        if (this.uniforms && args.vel && args.pressure) { this.uniforms.velocity.value = args.vel.texture; this.uniforms.pressure.value = args.pressure.texture; }
        super.update();
      }
    }

    // ── Simulation ───────────────────────────────────────────────────────────
    class Simulation {
      options: SimOptions;
      fbos: Record<string, THREE.WebGLRenderTarget | null> = { vel_0: null, vel_1: null, vel_viscous0: null, vel_viscous1: null, div: null, pressure_0: null, pressure_1: null };
      fboSize = new THREE.Vector2(); cellScale = new THREE.Vector2(); boundarySpace = new THREE.Vector2();
      advection!: Advection; externalForce!: ExternalForce; viscous!: Viscous;
      divergence!: Divergence; poisson!: Poisson; pressure!: Pressure;
      constructor(opts?: Partial<SimOptions>) {
        this.options = { iterations_poisson: 32, iterations_viscous: 32, mouse_force: 20, resolution: 0.5, cursor_size: 100, viscous: 30, isBounce: false, dt: 0.014, isViscous: false, BFECC: true, ...opts };
        this.init();
      }
      init() { this.calcSize(); this.createAllFBO(); this.createShaderPass(); }
      getFloatType() { return /(iPad|iPhone|iPod)/i.test(navigator.userAgent) ? THREE.HalfFloatType : THREE.FloatType; }
      createAllFBO() {
        const opts = { type: this.getFloatType(), depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping } as const;
        for (const k in this.fbos) this.fbos[k] = new THREE.WebGLRenderTarget(this.fboSize.x, this.fboSize.y, opts);
      }
      createShaderPass() {
        const f = this.fbos;
        this.advection = new Advection({ cellScale: this.cellScale, fboSize: this.fboSize, dt: this.options.dt, src: f.vel_0, dst: f.vel_1 } as Record<string, unknown>);
        this.externalForce = new ExternalForce({ cellScale: this.cellScale, cursor_size: this.options.cursor_size, dst: f.vel_1 } as Record<string, unknown>);
        this.viscous = new Viscous({ cellScale: this.cellScale, boundarySpace: this.boundarySpace, viscous: this.options.viscous, src: f.vel_1, dst: f.vel_viscous1, dst_: f.vel_viscous0, dt: this.options.dt } as Record<string, unknown>);
        this.divergence = new Divergence({ cellScale: this.cellScale, boundarySpace: this.boundarySpace, src: f.vel_viscous0, dst: f.div, dt: this.options.dt } as Record<string, unknown>);
        this.poisson = new Poisson({ cellScale: this.cellScale, boundarySpace: this.boundarySpace, src: f.div, dst: f.pressure_1, dst_: f.pressure_0 } as Record<string, unknown>);
        this.pressure = new Pressure({ cellScale: this.cellScale, boundarySpace: this.boundarySpace, src_p: f.pressure_0, src_v: f.vel_viscous0, dst: f.vel_0, dt: this.options.dt } as Record<string, unknown>);
      }
      calcSize() {
        const w = Math.max(1, Math.round(this.options.resolution * Common.width));
        const h = Math.max(1, Math.round(this.options.resolution * Common.height));
        this.cellScale.set(1 / w, 1 / h); this.fboSize.set(w, h);
      }
      resize() { this.calcSize(); for (const k in this.fbos) this.fbos[k]!.setSize(this.fboSize.x, this.fboSize.y); }
      update() {
        if (this.options.isBounce) this.boundarySpace.set(0, 0); else this.boundarySpace.copy(this.cellScale);
        this.advection.update({ dt: this.options.dt, isBounce: this.options.isBounce, BFECC: this.options.BFECC });
        this.externalForce.update({ cursor_size: this.options.cursor_size, mouse_force: this.options.mouse_force, cellScale: this.cellScale });
        let vel: THREE.WebGLRenderTarget = this.fbos.vel_1!;
        if (this.options.isViscous) vel = this.viscous.update({ viscous: this.options.viscous, iterations: this.options.iterations_viscous, dt: this.options.dt }) as THREE.WebGLRenderTarget;
        this.divergence.update({ vel });
        const pressure = this.poisson.update({ iterations: this.options.iterations_poisson });
        this.pressure.update({ vel, pressure });
      }
    }

    // ── Output ───────────────────────────────────────────────────────────────
    class Output {
      simulation: Simulation; scene: THREE.Scene; camera: THREE.Camera; output: THREE.Mesh;
      constructor() {
        this.simulation = new Simulation({ iterations_poisson: iterationsPoisson, iterations_viscous: iterationsViscous, mouse_force: mouseForce, resolution, cursor_size: cursorSize, viscous, isBounce, dt, isViscous, BFECC });
        this.scene = new THREE.Scene(); this.camera = new THREE.Camera();
        this.output = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.RawShaderMaterial({ vertexShader: face_vert, fragmentShader: color_frag, transparent: true, depthWrite: false, uniforms: { velocity: { value: this.simulation.fbos.vel_0!.texture }, boundarySpace: { value: new THREE.Vector2() }, palette: { value: paletteTex }, bgColor: { value: bgVec4 } } }));
        this.scene.add(this.output);
      }
      resize() { this.simulation.resize(); }
      render() { if (!Common.renderer) return; Common.renderer.setRenderTarget(null); Common.renderer.render(this.scene, this.camera); }
      update() { this.simulation.update(); this.render(); }
    }

    // ── AutoDriver ───────────────────────────────────────────────────────────
    class AutoDriver {
      mouse: MouseClass; enabled: boolean; speed: number; resumeDelay: number; rampDurationMs: number;
      active = false; current = new THREE.Vector2(); target = new THREE.Vector2();
      lastTime = performance.now(); activationTime = 0; margin = 0.2;
      lastUserInteraction = performance.now();
      private _tmpDir = new THREE.Vector2();
      constructor(m: MouseClass, opts: { enabled: boolean; speed: number; resumeDelay: number; rampDuration: number }) {
        this.mouse = m; this.enabled = opts.enabled; this.speed = opts.speed;
        this.resumeDelay = opts.resumeDelay || 3000; this.rampDurationMs = (opts.rampDuration || 0) * 1000;
        this.pickNewTarget();
      }
      pickNewTarget() { const r = Math.random; this.target.set((r() * 2 - 1) * (1 - this.margin), (r() * 2 - 1) * (1 - this.margin)); }
      forceStop() { this.active = false; this.mouse.isAutoActive = false; }
      update() {
        if (!this.enabled) return;
        const now = performance.now();
        const idle = now - this.lastUserInteraction;
        if (idle < this.resumeDelay) { if (this.active) this.forceStop(); return; }
        if (this.mouse.isHoverInside) { if (this.active) this.forceStop(); return; }
        if (!this.active) { this.active = true; this.current.copy(this.mouse.coords); this.lastTime = now; this.activationTime = now; }
        this.mouse.isAutoActive = true;
        let dtSec = (now - this.lastTime) / 1000; this.lastTime = now;
        if (dtSec > 0.2) dtSec = 0.016;
        const dir = this._tmpDir.subVectors(this.target, this.current);
        const dist = dir.length();
        if (dist < 0.01) { this.pickNewTarget(); return; }
        dir.normalize();
        const ramp = this.rampDurationMs > 0 ? (() => { const t = Math.min(1, (now - this.activationTime) / this.rampDurationMs); return t * t * (3 - 2 * t); })() : 1;
        this.current.addScaledVector(dir, Math.min(this.speed * dtSec * ramp, dist));
        this.mouse.setNormalized(this.current.x, this.current.y);
      }
    }

    // ── WebGLManager ─────────────────────────────────────────────────────────
    class WebGLManager implements LiquidEtherWebGL {
      output!: Output; autoDriver!: AutoDriver; lastUserInteraction = performance.now();
      running = false;
      private _loop = this.loop.bind(this);
      private _resize = this.resize.bind(this);
      private _onVisibility?: () => void;
      constructor(wrapper: HTMLElement) {
        Common.init(wrapper); Mouse.init(wrapper);
        Mouse.autoIntensity = autoIntensity; Mouse.takeoverDuration = takeoverDuration;
        Mouse.onInteract = () => { this.lastUserInteraction = performance.now(); this.autoDriver?.forceStop(); };
        this.autoDriver = new AutoDriver(Mouse, { enabled: autoDemo, speed: autoSpeed, resumeDelay: autoResumeDelay, rampDuration: autoRampDuration });
        this.autoDriver.lastUserInteraction = this.lastUserInteraction;
        if (Common.renderer) wrapper.prepend(Common.renderer.domElement);
        this.output = new Output();
        window.addEventListener('resize', this._resize);
        this._onVisibility = () => { if (document.hidden) this.pause(); else if (isVisibleRef.current) this.start(); };
        document.addEventListener('visibilitychange', this._onVisibility);
      }
      resize() { Common.resize(); this.output.resize(); }
      render() {
        this.autoDriver.lastUserInteraction = this.lastUserInteraction;
        this.autoDriver.update(); Mouse.update(); Common.update(); this.output.update();
      }
      loop() { if (!this.running) return; this.render(); rafRef.current = requestAnimationFrame(this._loop); }
      start() { if (this.running) return; this.running = true; this._loop(); }
      pause() { this.running = false; if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } }
      dispose() {
        try {
          window.removeEventListener('resize', this._resize);
          if (this._onVisibility) document.removeEventListener('visibilitychange', this._onVisibility);
          Mouse.dispose();
          if (Common.renderer) { const c = Common.renderer.domElement; c?.parentNode?.removeChild(c); Common.renderer.dispose(); Common.renderer.forceContextLoss(); }
        } catch { /* noop */ }
      }
    }

    // ── Bootstrap ────────────────────────────────────────────────────────────
    const container = mountRef.current;
    container.style.position = container.style.position || 'relative';
    container.style.overflow = container.style.overflow || 'hidden';

    const webgl = new WebGLManager(container);
    webglRef.current = webgl;
    webgl.start();

    const io = new IntersectionObserver(entries => {
      const e = entries[0];
      isVisibleRef.current = e.isIntersecting && e.intersectionRatio > 0;
      if (!webglRef.current) return;
      if (isVisibleRef.current && !document.hidden) webglRef.current.start(); else webglRef.current.pause();
    }, { threshold: [0, 0.01, 0.1] });
    io.observe(container);
    intersectionObserverRef.current = io;

    const ro = new ResizeObserver(() => {
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = requestAnimationFrame(() => { webglRef.current?.resize(); });
    });
    ro.observe(container);
    resizeObserverRef.current = ro;

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { resizeObserverRef.current?.disconnect(); } catch { /* noop */ }
      try { intersectionObserverRef.current?.disconnect(); } catch { /* noop */ }
      webglRef.current?.dispose();
      webglRef.current = null;
    };
  }, [BFECC, cursorSize, dt, isBounce, isViscous, iterationsPoisson, iterationsViscous, mouseForce, resolution, viscous, colors, autoDemo, autoSpeed, autoIntensity, takeoverDuration, autoResumeDelay, autoRampDuration]);

  useEffect(() => {
    const webgl = webglRef.current;
    if (!webgl) return;
    const sim = webgl.output?.simulation;
    if (!sim) return;
    const prevRes = sim.options.resolution;
    Object.assign(sim.options, { mouse_force: mouseForce, cursor_size: cursorSize, isViscous, viscous, iterations_viscous: iterationsViscous, iterations_poisson: iterationsPoisson, dt, BFECC, resolution, isBounce });
    if (webgl.autoDriver) {
      webgl.autoDriver.enabled = autoDemo; webgl.autoDriver.speed = autoSpeed;
      webgl.autoDriver.resumeDelay = autoResumeDelay; webgl.autoDriver.rampDurationMs = autoRampDuration * 1000;
    }
    if (resolution !== prevRes) sim.resize();
  }, [mouseForce, cursorSize, isViscous, viscous, iterationsViscous, iterationsPoisson, dt, BFECC, resolution, isBounce, autoDemo, autoSpeed, autoIntensity, takeoverDuration, autoResumeDelay, autoRampDuration]);

  return <div ref={mountRef} className={`liquid-ether-container ${className || ''}`} style={style} />;
}
