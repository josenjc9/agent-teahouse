import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CameraControls, Environment } from '@react-three/drei'
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { SeeThrough } from './SeeThrough'
import { Clouds } from './Clouds'
import { useOffice } from './store'
import { vec, type Tod } from './tod'
import type { Preset } from './preset'

/** 共用舞台：黃昏天空、柔陰影、環境光、泛光、暗角、ACES 色調映射。
 *  這些設定就是畫面質感的來源，換場景或調時段請改這裡，不要拿掉。 */

// ── 天空 ─────────────────────────────────────────────

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`
const skyFragment = /* glsl */ `
  uniform vec3 sunDir; uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHor; uniform vec3 uLow; uniform vec3 uDeep; uniform vec3 uSunCol;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float y = d.y;
    // 顏色以 sRGB 寫，轉成線性再輸出
    vec3 top = uTop;
    vec3 mid = uMid;
    vec3 hor = uHor;
    vec3 low = uLow;
    vec3 deep = uDeep;
    vec3 c;
    if (y > 0.0) {
      c = mix(hor, mid, smoothstep(0.0, 0.2, y));
      c = mix(c, top, smoothstep(0.2, 0.7, y));
    } else {
      c = mix(hor, low, smoothstep(0.0, -0.12, y));
      c = mix(c, deep, smoothstep(-0.12, -0.7, y));
    }
    c = pow(c, vec3(2.2));
    float s = max(dot(d, sunDir), 0.0);
    c += uSunCol * pow(s, 8.0) * 0.35;
    c += mix(uSunCol, vec3(1.0), 0.5) * pow(s, 260.0) * 3.0;
    gl_FragColor = vec4(c, 1.0);
  }
`

function Sky({ tod }: { tod: Tod }) {
  const mat = useMemo(
    () => new THREE.ShaderMaterial({
      vertexShader: skyVertex, fragmentShader: skyFragment, side: THREE.BackSide, depthWrite: false, toneMapped: false,
      uniforms: { sunDir: { value: vec(tod.sunDir).normalize() }, uTop: { value: vec(tod.sky.top) }, uMid: { value: vec(tod.sky.mid) }, uHor: { value: vec(tod.sky.hor) }, uLow: { value: vec(tod.sky.low) }, uDeep: { value: vec(tod.sky.deep) }, uSunCol: { value: vec(tod.sky.sunCol) } },
    }),
    [tod],
  )
  return (
    <mesh material={mat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[200, 32, 16]} />
    </mesh>
  )
}

// ── 光 ──────────────────────────────────────────────

function Lights({ tod, shadow }: { tod: Tod; shadow: Preset['shadow'] }) {
  const sun = useRef<THREE.DirectionalLight>(null)
  const gl = useThree((s) => s.gl)
  const frames = useRef(0)
  useEffect(() => {
    // 場景幾乎都是靜態的：影子只在需要時重算
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
  }, [gl])
  useFrame(() => {
    if (frames.current < 6) {
      frames.current++
      gl.shadowMap.needsUpdate = true
    }
  })
  useEffect(() => {
    if (sun.current) sun.current.target.position.set(...shadow.target)
  }, [shadow])
  const pos = vec(tod.sunDir).normalize().multiplyScalar(34)
  return (
    <>
      <hemisphereLight args={[tod.hemi[0], tod.hemi[1], tod.hemi[2]]} />
      <directionalLight
        ref={sun}
        position={[pos.x, pos.y, pos.z]}
        color={tod.sunColor}
        intensity={tod.sunIntensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-shadow.halfW}
        shadow-camera-right={shadow.halfW}
        shadow-camera-top={shadow.halfD}
        shadow-camera-bottom={-shadow.halfD}
        shadow-camera-near={5}
        shadow-camera-far={70}
        shadow-bias={-0.0004}
        shadow-normalBias={0.035}
        shadow-radius={3}
      />
      <directionalLight position={[14, 10, -12]} color={tod.fill.color} intensity={tod.fill.intensity} />
    </>
  )
}

// ── 鏡頭 ─────────────────────────────────────────────

function CameraRig({ cam }: { cam: Preset['camera'] }) {
  const ref = useRef<CameraControls>(null)
  const size = useThree((s) => s.size)
  const reduced = useOffice((s) => s.reducedMotion)
  const mobile = size.width < 760
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const anim = !reduced
    c.smoothTime = reduced ? 0 : 0.55
    const [lo, hi] = mobile ? cam.mobile : cam.desktop
    const box = new THREE.Box3(new THREE.Vector3(...lo), new THREE.Vector3(...hi))
    void c.rotateTo(cam.az * (mobile ? 0.6 : 1), mobile ? cam.polar - 0.12 : cam.polar, anim)
    void c.fitToBox(box, anim, { paddingTop: mobile ? 0.5 : 0.4, paddingBottom: mobile ? 1.0 : 1.4, paddingLeft: 0.2, paddingRight: 0.2 })
  }, [mobile, reduced, size.width, size.height, cam])
  return <CameraControls ref={ref} makeDefault minDistance={2.5} maxDistance={90} minPolarAngle={0.08} maxPolarAngle={1.45} dollySpeed={0.6} truckSpeed={1.2} draggingSmoothTime={0.12} />
}

function Effects({ tod }: { tod: Tod }) {
  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur intensity={tod.bloom.intensity} luminanceThreshold={tod.bloom.threshold} luminanceSmoothing={0.25} radius={0.7} />
      <Vignette offset={0.32} darkness={tod.vignette} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}

export function Stage({ preset, children, onMiss, timeOfDay }: { preset: Preset; children?: React.ReactNode; onMiss?: () => void; timeOfDay?: string }) {
  const tod = preset.tod[timeOfDay ?? preset.defaultTod] ?? preset.tod[preset.defaultTod]
  useEffect(() => { preset.applyGlow?.(tod) }, [tod, preset])
  const Scene = preset.Scene
  return (
    <Canvas
      shadows="soft"
      dpr={[1, 1.75]}
      camera={{ fov: 28, near: 0.5, far: 400, position: [-14, 26, 34] }}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      onPointerMissed={() => onMiss?.()}
    >
      <fog attach="fog" args={[tod.fog, 60, 150]} />
      <Sky tod={tod} />
      <Suspense fallback={null}>
        <Environment key={timeOfDay} frames={1} resolution={128}>
          <Sky tod={tod} />
        </Environment>
      </Suspense>
      <Lights key={timeOfDay} tod={tod} shadow={preset.shadow} />
      <Scene tod={tod} />
      <Clouds stops={tod.cloud} />
      {children}
      <CameraRig cam={preset.camera} />
      <SeeThrough />
      <Effects tod={tod} />
    </Canvas>
  )
}
