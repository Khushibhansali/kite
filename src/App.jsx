import { useEffect, useMemo, useRef, useState } from 'react'
import p5 from 'p5'

const SCENES = {
  DESIGN_STUDIO: 1,
  SOMATIC_FLIGHT: 2,
  NARRATIVE_TENSIONS: 3,
  SUCCESS_CHOICE: 4,
  BALANCED_MIRROR: 5,
}

const PRESSURE_BUBBLES = [
  { side: 'left', label: "Do it for the 'gram'", effect: 'peer' },
  { side: 'left', label: 'Alienation', effect: 'peer' },
  { side: 'left', label: 'Individualism', effect: 'peer' },
  { side: 'right', label: 'Family Honor', effect: 'root' },
  { side: 'right', label: 'The Translator Burden', effect: 'root' },
  { side: 'right', label: 'Guilt', effect: 'root' },
]

const KITE_SHAPES = {
  Diamond: [
    { x: 0, y: -42 },
    { x: 32, y: 0 },
    { x: 0, y: 42 },
    { x: -32, y: 0 },
  ],
  Hexagon: [
    { x: 0, y: -38 },
    { x: 34, y: -14 },
    { x: 34, y: 14 },
    { x: 0, y: 38 },
    { x: -34, y: 14 },
    { x: -34, y: -14 },
  ],
  Bird: [
    { x: -48, y: -6 },
    { x: -16, y: -30 },
    { x: 0, y: -12 },
    { x: 16, y: -30 },
    { x: 48, y: -6 },
    { x: 10, y: 20 },
    { x: 0, y: 40 },
    { x: -10, y: 20 },
  ],
}

const FABRICS = {
  Bandhani: ['#f97316', '#facc15', '#ef4444'],
  Denim: ['#1e3a8a', '#2563eb', '#60a5fa'],
  'Translucent Silk': ['#a855f7', '#ec4899', '#93c5fd'],
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

function SceneManager({ scene, setScene }) {
  return (
    <div className="flex gap-2 text-xs md:text-sm">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => setScene(n)}
          className={`rounded-full px-3 py-1 transition ${
            scene === n
              ? 'bg-purple-500 text-white'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          Scene {n}
        </button>
      ))}
    </div>
  )
}

/**
 * MediaPipe gives normalized coordinates in camera space [0..1].
 * Because we mirror the <video> element with CSS (scaleX(-1)) to feel natural,
 * we must mirror X again when mapping to simulation/canvas so the string anchor
 * aligns with what the user sees: canvasX = (1 - rawX) * canvasWidth.
 */
function useHandTracker(videoRef, enabled) {
  const [hands, setHands] = useState({
    left: { x: 0.33, y: 0.65, visible: false },
    right: { x: 0.67, y: 0.65, visible: false },
  })
  const cameraRef = useRef(null)
  const handsRef = useRef(null)

  useEffect(() => {
    if (!enabled || !videoRef.current || !window.Hands || !window.Camera) return
    let isMounted = true
    const mpHands = new window.Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    })
    handsRef.current = mpHands
    mpHands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.55,
    })

    mpHands.onResults((results) => {
      if (!isMounted) return
      const next = {
        left: { x: 0.33, y: 0.65, visible: false },
        right: { x: 0.67, y: 0.65, visible: false },
      }
      const landmarks = results.multiHandLandmarks || []
      const handedness = results.multiHandedness || []
      for (let i = 0; i < landmarks.length; i += 1) {
        const idxTip = landmarks[i][8]
        const handLabel = handedness[i]?.label?.toLowerCase() || 'right'
        if (!idxTip) continue
        next[handLabel] = {
          x: idxTip.x,
          y: idxTip.y,
          visible: true,
        }
      }
      setHands(next)
    })

    cameraRef.current = new window.Camera(videoRef.current, {
      onFrame: async () => {
        if (handsRef.current && videoRef.current) {
          await handsRef.current.send({ image: videoRef.current })
        }
      },
      width: 960,
      height: 540,
    })
    cameraRef.current.start()

    return () => {
      isMounted = false
      if (cameraRef.current) {
        cameraRef.current.stop()
      }
      if (handsRef.current) {
        handsRef.current.close()
      }
    }
  }, [enabled, videoRef])

  return hands
}

function KitePhysics({
  scene,
  config,
  hands,
  onCatchBubble,
  onChooseEnding,
  effects,
  pathRef,
}) {
  const wrapperRef = useRef(null)
  const p5Ref = useRef(null)

  const kitePoints = useMemo(
    () => KITE_SHAPES[config.shape] || KITE_SHAPES.Diamond,
    [config.shape],
  )

  useEffect(() => {
    if (!wrapperRef.current) return undefined
    const bubbles = []
    let kite = { x: 460, y: 280, px: 452, py: 276 }
    let bubbleCooldown = 0
    let choiceTimer = 0
    let chosen = false

    const sketch = (s) => {
      s.setup = () => {
        const canvas = s.createCanvas(920, 560)
        canvas.parent(wrapperRef.current)
      }

      s.draw = () => {
        const leftAnchor = {
          x: (1 - hands.left.x) * s.width,
          y: hands.left.y * s.height,
        }
        const rightAnchor = {
          x: (1 - hands.right.x) * s.width,
          y: hands.right.y * s.height,
        }

        const peerLoad = effects.peer
        const rootLoad = effects.root
        const imbalance = peerLoad - rootLoad
        const wind =
          0.08 + Math.sin(s.frameCount * 0.02) * 0.05 + imbalance * 0.015
        const gravity = 0.18 + rootLoad * 0.02
        const drag = 0.985 - peerLoad * 0.01
        const rightStiffness = clamp(0.06 + rootLoad * 0.016, 0.05, 0.18)
        const leftStiffness = clamp(0.07 - peerLoad * 0.006, 0.03, 0.1)
        const tailWeight = config.tailWeight * 0.08

        const vx = (kite.x - kite.px) * drag + wind
        const vy = (kite.y - kite.py) * drag + gravity + tailWeight
        kite.px = kite.x
        kite.py = kite.y
        kite.x += vx
        kite.y += vy

        const applyStringConstraint = (anchor, restLength, stiffness) => {
          const dx = kite.x - anchor.x
          const dy = kite.y - anchor.y
          const dist = Math.max(1, Math.hypot(dx, dy))
          const pull = (dist - restLength) * stiffness
          kite.x -= (dx / dist) * pull
          kite.y -= (dy / dist) * pull
          return dist
        }

        const leftDistance = applyStringConstraint(
          leftAnchor,
          150 + config.tailLength * 4,
          leftStiffness,
        )
        applyStringConstraint(rightAnchor, 150 + config.tailLength * 4, rightStiffness)

        // Peer pressure can snap left string if stretched too hard.
        const leftStringSnapped = peerLoad >= 3 && leftDistance > 270
        if (leftStringSnapped) {
          kite.x += 1.2 + Math.sin(s.frameCount * 0.8) * 0.9
          kite.y += Math.cos(s.frameCount * 0.25) * 0.6
        }

        kite.x = clamp(kite.x, 30, s.width - 30)
        kite.y = clamp(kite.y, 24, s.height - 24)

        if (scene >= SCENES.NARRATIVE_TENSIONS && scene <= SCENES.SUCCESS_CHOICE) {
          bubbleCooldown -= 1
          if (bubbleCooldown <= 0 && bubbles.length < 5) {
            const spec =
              PRESSURE_BUBBLES[Math.floor(Math.random() * PRESSURE_BUBBLES.length)]
            bubbles.push({
              ...spec,
              id: `${spec.label}-${Date.now()}-${Math.random()}`,
              x:
                spec.side === 'left'
                  ? s.random(80, s.width * 0.45)
                  : s.random(s.width * 0.55, s.width - 80),
              y: s.random(90, s.height - 120),
              r: s.random(32, 42),
              life: 1200,
            })
            bubbleCooldown = 110
          }
        }

        for (let i = bubbles.length - 1; i >= 0; i -= 1) {
          const b = bubbles[i]
          b.life -= 1
          b.y += Math.sin((s.frameCount + i * 14) * 0.03) * 0.45
          const hit = Math.hypot(kite.x - b.x, kite.y - b.y) < b.r + 26
          if (hit) {
            onCatchBubble(b.effect)
            bubbles.splice(i, 1)
            continue
          }
          if (b.life <= 0) {
            bubbles.splice(i, 1)
          }
        }

        if (scene >= SCENES.SOMATIC_FLIGHT) {
          pathRef.current.push({ x: kite.x, y: kite.y })
          if (pathRef.current.length > 900) pathRef.current.shift()
        }

        if (scene === SCENES.SUCCESS_CHOICE) {
          choiceTimer += 1
          const centerBias = 0.02 * (effects.peer - effects.root)
          kite.x += centerBias
          if (!chosen && choiceTimer > 380) {
            chosen = true
            onChooseEnding(kite.x < s.width / 2 ? 'external' : 'internal')
          }
        }

        s.background(7, 10, 30, scene === SCENES.BALANCED_MIRROR ? 45 : 255)
        drawWindBands(s, wind)
        drawZonesIfChoice(s, scene)
        drawStrings(s, leftAnchor, rightAnchor, kite, effects, leftStringSnapped)
        drawBubbles(s, bubbles)
        drawKite(s, kite, kitePoints, config.fabric, effects)
        drawTail(s, kite, config.tailLength, config.tailWeight)

        if (scene === SCENES.BALANCED_MIRROR) {
          drawConstellation(s, pathRef.current)
        }
      }
    }

    p5Ref.current = new p5(sketch)
    return () => {
      if (p5Ref.current) {
        p5Ref.current.remove()
      }
    }
  }, [config, effects, hands, kitePoints, onCatchBubble, onChooseEnding, pathRef, scene])

  return <div ref={wrapperRef} className="overflow-hidden rounded-2xl border border-white/20" />
}

function drawWindBands(s, wind) {
  s.noFill()
  s.stroke(120, 180, 255, 50)
  for (let y = 70; y < s.height; y += 80) {
    s.beginShape()
    for (let x = 0; x < s.width; x += 24) {
      const wave = Math.sin((x + s.frameCount * 4) * 0.015 + y * 0.01) * (8 + wind * 45)
      s.vertex(x, y + wave)
    }
    s.endShape()
  }
}

function drawZonesIfChoice(s, scene) {
  if (scene !== SCENES.SUCCESS_CHOICE) return
  s.noStroke()
  s.fill(40, 116, 255, 45)
  s.rect(0, 0, s.width / 2, s.height)
  s.fill(246, 177, 65, 40)
  s.rect(s.width / 2, 0, s.width / 2, s.height)
}

function drawStrings(s, left, right, kite, effects, snapped) {
  const peerJitter = effects.peer > 0 ? Math.sin(s.frameCount * 0.8) * (effects.peer + 1.5) : 0
  const rootGlow = 170 + effects.root * 14

  s.strokeWeight(Math.max(1.4, 3 - effects.peer * 0.55))
  s.stroke(60, 182, 255, 220)
  s.line(left.x, left.y, kite.x + peerJitter, kite.y)

  if (snapped) {
    s.stroke(120, 220, 255, 130)
    s.line(left.x, left.y, kite.x + 26, kite.y - 20)
  }

  s.strokeWeight(2.2 + effects.root * 0.9)
  s.stroke(255, rootGlow, 85, 230)
  s.line(right.x, right.y, kite.x, kite.y)

  s.noStroke()
  s.fill(255, 255, 255, 230)
  s.circle(left.x, left.y, 10)
  s.circle(right.x, right.y, 10)
}

function drawBubbles(s, bubbles) {
  for (const b of bubbles) {
    const leftStyle = b.effect === 'peer'
    s.stroke(leftStyle ? '#48d4ff' : '#ffc265')
    s.strokeWeight(2)
    s.fill(leftStyle ? 'rgba(77,187,255,0.18)' : 'rgba(255,173,68,0.2)')
    s.circle(b.x, b.y, b.r * 2)
    s.noStroke()
    s.fill(255)
    s.textAlign(s.CENTER, s.CENTER)
    s.textSize(12)
    s.text(b.label, b.x, b.y)
  }
}

function drawKite(s, kite, points, fabric, effects) {
  const palette = FABRICS[fabric]
  const balance = clamp(Math.abs(effects.peer - effects.root) / 5, 0, 1)
  const saturationDrop = effects.root > effects.peer ? 50 : 15
  const alpha = effects.peer > effects.root ? 190 : 235
  const wildOffset = effects.peer > effects.root ? Math.sin(s.frameCount * 0.35) * 6 : 0
  s.push()
  s.translate(kite.x + wildOffset, kite.y)
  s.rotate(Math.sin(s.frameCount * 0.05) * (0.1 + balance * 0.2))
  s.stroke(255, 255 - saturationDrop, 255 - saturationDrop, 230)
  s.strokeWeight(2)
  s.fill(palette[0] + `${Math.round(alpha).toString(16).padStart(2, '0')}`)
  s.beginShape()
  for (const p of points) {
    s.vertex(p.x, p.y)
  }
  s.endShape(s.CLOSE)
  s.noStroke()
  s.fill(palette[1])
  s.circle(0, -8, 18)
  s.fill(palette[2])
  s.circle(0, 10, 16)
  s.pop()
}

function drawTail(s, kite, length, weight) {
  s.noFill()
  s.stroke(255, 220, 180, 180)
  s.strokeWeight(1.3 + weight * 0.25)
  s.beginShape()
  for (let i = 0; i < length; i += 1) {
    const tx = kite.x + Math.sin((s.frameCount + i * 10) * 0.04) * (8 + weight)
    const ty = kite.y + i * 8
    s.vertex(tx, ty)
  }
  s.endShape()
}

function drawConstellation(s, path) {
  s.stroke(206, 224, 255, 110)
  s.strokeWeight(1)
  for (let i = 1; i < path.length; i += 6) {
    const a = path[i - 1]
    const b = path[i]
    s.line(a.x, a.y, b.x, b.y)
    s.noStroke()
    s.fill(255, 255, 255, 130)
    s.circle(b.x, b.y, 2.7)
    s.stroke(206, 224, 255, 110)
  }
}

export default function App() {
  const [scene, setScene] = useState(SCENES.DESIGN_STUDIO)
  const [shape, setShape] = useState('Diamond')
  const [fabric, setFabric] = useState('Bandhani')
  const [tailLength, setTailLength] = useState(8)
  const [tailWeight, setTailWeight] = useState(3)
  const [peerPressure, setPeerPressure] = useState(0)
  const [rootPressure, setRootPressure] = useState(0)
  const [ending, setEnding] = useState(null)
  const pathRef = useRef([])
  const videoRef = useRef(null)
  const hands = useHandTracker(videoRef, scene >= SCENES.SOMATIC_FLIGHT)

  const config = useMemo(
    () => ({ shape, fabric, tailLength, tailWeight }),
    [fabric, shape, tailLength, tailWeight],
  )
  const effects = useMemo(
    () => ({ peer: peerPressure, root: rootPressure }),
    [peerPressure, rootPressure],
  )

  const onCatchBubble = (effect) => {
    if (effect === 'peer') setPeerPressure((v) => Math.min(v + 1, 6))
    if (effect === 'root') setRootPressure((v) => Math.min(v + 1, 6))
  }

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-100">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition duration-700 ${
          scene >= SCENES.BALANCED_MIRROR
            ? 'scale-x-[-1] opacity-30 grayscale contrast-[2.4] brightness-[0.25]'
            : 'scale-x-[-1] opacity-10'
        }`}
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
        <header className="rounded-2xl border border-white/20 bg-black/35 p-4 backdrop-blur-sm">
          <h1 className="text-2xl font-semibold md:text-3xl">
            The Tension of the String
          </h1>
          <p className="mt-1 text-sm text-slate-300 md:text-base">
            Fly the kite between peer velocity and family gravity.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <SceneManager scene={scene} setScene={setScene} />
            <div className="flex gap-2 text-xs md:text-sm">
              <span className="rounded-full bg-cyan-400/20 px-3 py-1 text-cyan-200">
                Peer Load: {peerPressure}
              </span>
              <span className="rounded-full bg-amber-400/20 px-3 py-1 text-amber-200">
                Root Load: {rootPressure}
              </span>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-[320px_1fr]">
          <aside className="rounded-2xl border border-white/20 bg-black/35 p-4 backdrop-blur-sm">
            <h2 className="text-lg font-semibold">Scene 1: Design Studio</h2>
            <p className="mt-1 text-sm text-slate-300">
              Configure your kite before entering somatic control.
            </p>

            <label className="mt-4 block text-sm font-medium">Shape</label>
            <select
              value={shape}
              onChange={(e) => setShape(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900 px-3 py-2"
            >
              <option>Diamond</option>
              <option>Hexagon</option>
              <option>Bird</option>
            </select>

            <label className="mt-4 block text-sm font-medium">Fabric</label>
            <select
              value={fabric}
              onChange={(e) => setFabric(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900 px-3 py-2"
            >
              <option>Bandhani</option>
              <option>Denim</option>
              <option>Translucent Silk</option>
            </select>

            <label className="mt-4 block text-sm font-medium">
              Tail Length ({tailLength})
            </label>
            <input
              type="range"
              min="4"
              max="20"
              value={tailLength}
              onChange={(e) => setTailLength(Number(e.target.value))}
              className="w-full"
            />

            <label className="mt-4 block text-sm font-medium">
              Tail Weight ({tailWeight})
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={tailWeight}
              onChange={(e) => setTailWeight(Number(e.target.value))}
              className="w-full"
            />

            <div className="mt-4 space-y-2 text-xs text-slate-300">
              <p>
                Left string: thinner, neon, and unstable with peer pressure.
              </p>
              <p>
                Right string: thicker, golden, and stiffer with family pressure.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setScene((s) => Math.min(s + 1, SCENES.BALANCED_MIRROR))}
              className="mt-5 w-full rounded-lg bg-purple-500 px-4 py-2 font-medium text-white hover:bg-purple-400"
            >
              Advance Scene
            </button>
          </aside>

          <div className="space-y-4">
            <KitePhysics
              scene={scene}
              config={config}
              hands={hands}
              onCatchBubble={onCatchBubble}
              onChooseEnding={setEnding}
              effects={effects}
              pathRef={pathRef}
            />
            <div className="rounded-2xl border border-white/20 bg-black/35 p-4 text-sm text-slate-200 backdrop-blur-sm">
              {scene === SCENES.SOMATIC_FLIGHT && (
                <p>
                  Scene 2 active: your left/right index fingers control the dual
                  anchors of the kite string.
                </p>
              )}
              {scene === SCENES.NARRATIVE_TENSIONS && (
                <p>
                  Scene 3 active: collide with bubbles to alter mass, stability,
                  speed, and fragility.
                </p>
              )}
              {scene === SCENES.SUCCESS_CHOICE && (
                <p>
                  Scene 4 active: the wind now pulls toward{' '}
                  <strong>External Success</strong> (left) and{' '}
                  <strong>Internal Creation</strong> (right). Current choice:{' '}
                  <strong>{ending || 'pending...'}</strong>
                </p>
              )}
              {scene === SCENES.BALANCED_MIRROR && (
                <div className="space-y-1">
                  <p>
                    Scene 5 active: camera feed fades to silhouette; your string
                    journey becomes a constellation transcript.
                  </p>
                  <p className="text-emerald-300">
                    &quot;You held the tension. You didn&apos;t let the wind break
                    the string, and you helped me navigate my dual identities.
                    These opposing forces shape who we become.&quot;
                  </p>
                </div>
              )}
              {scene === SCENES.DESIGN_STUDIO && (
                <p>
                  Scene 1 active: configure shape, fabric, and tail physics before
                  beginning flight.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
