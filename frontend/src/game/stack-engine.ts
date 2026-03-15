const BASE_SIZE = 8
const BLOCK_HEIGHT = 1
const START_SPEED = 5
const SPEED_STEP = 0.15
const MAX_SPEED = 10 
const MOVE_RANGE_PADDING = 5
const FALL_GRAVITY = 19
const FALL_SIDE_SPEED = 1.7
const FALL_START_VELOCITY = -1.2
const FALL_LIFETIME = 0.55
const FALL_FADE_SECONDS = 0.24
const PERFECT_EPSILON = 0.03
const PERFECT_EFFECT_SECONDS = 0.34
const CAMERA_TOP_RATIO = 0.58
const CAMERA_LERP = 0.12
const CAMERA_END_RATIO = 0.2
const CAMERA_END_LERP = 0.08
const CAMERA_MIN_SCALE = 0.12
const CAMERA_END_BASELINE_RATIO = 0.88
const CAMERA_END_TOP_SAFE_RATIO = 0.28
const STRIPE_ANGLE_RAD = (17 * Math.PI) / 180

const BLOCK_VARIANTS = ['black', 'white', 'red', 'stripe-forward', 'stripe-backward']
const REGULAR_BLOCK_VARIANTS = ['black', 'white', 'red']
const RECENT_BLOCK_VARIANTS_LIMIT = 3
const BLOCK_TEXTS = [
  'СТУДВЕСНА ВСЕ!',
  'ЦИФРА',
  '26/03',
  'ИЦ',
  'ВЕСНА',
  'ИНСТИТУТ ЦИФРЫ',
  'КОНЦЕРТНЫЙ ЗАЛ',
  'ВСТРЕЧАЕМСЯ 26/03',
  'МЫ ЖДЕМ ТЕБЯ',
]
const SHORT_TEXT_MAX_LEN = 6
const SHORT_FACE_MIN_WIDTH = 2.35
const LONG_FACE_MIN_WIDTH = 4.8
const RECENT_LABELS_LIMIT = 3
const TEXT_GROUPS = {
  short: BLOCK_TEXTS.filter((text) => text.length <= SHORT_TEXT_MAX_LEN),
  long: BLOCK_TEXTS.filter((text) => text.length > SHORT_TEXT_MAX_LEN),
}
const recentLabelsByGroup = {
  short: [],
  long: [],
}
const recentBlockVariants = []
const labelCycleByGroup = {
  short: { bag: [], index: 0 },
  long: { bag: [], index: 0 },
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const createBlock = ({ x, z, w, d, y, variant, label = null, moveAxis = null }) => ({
  x,
  z,
  w,
  d,
  y,
  variant,
  label,
  moveAxis,
})

const getProjectionMetrics = (width, height, scale = 1) => {
  const tileW = Math.min(width, height) * 0.032 * scale
  return {
    tileW,
    tileH: tileW * 0.44,
    unitHeight: tileW * 1.08,
  }
}

const pickRandomItem = (items) => items[Math.floor(Math.random() * items.length)]
const shuffleArray = (items) => {
  const copy = items.slice()
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}

const resetTextSelectionState = () => {
  recentLabelsByGroup.short = []
  recentLabelsByGroup.long = []
  labelCycleByGroup.short = { bag: [], index: 0 }
  labelCycleByGroup.long = { bag: [], index: 0 }
  recentBlockVariants.length = 0
}

const selectNextBlockVariant = () => {
  let candidates = BLOCK_VARIANTS.filter((variant) => !recentBlockVariants.includes(variant))
  if (!candidates.length) {
    candidates = BLOCK_VARIANTS.slice()
  }

  const chosen = pickRandomItem(candidates)
  recentBlockVariants.push(chosen)
  if (recentBlockVariants.length > RECENT_BLOCK_VARIANTS_LIMIT) {
    recentBlockVariants.shift()
  }
  return chosen
}

const getTextGroupForWidth = (stableWidth) => {
  if (stableWidth < SHORT_FACE_MIN_WIDTH) {
    return null
  }

  if (stableWidth < LONG_FACE_MIN_WIDTH) {
    return 'short'
  }

  return 'long'
}

const selectBalancedLabelFromGroup = (group) => {
  const allLabels = TEXT_GROUPS[group]
  if (!allLabels.length) {
    return null
  }

  const recent = recentLabelsByGroup[group]
  let cycle = labelCycleByGroup[group]

  const refillCycle = () => {
    cycle = { bag: shuffleArray(allLabels), index: 0 }
    labelCycleByGroup[group] = cycle
  }

  if (!cycle.bag.length || cycle.index >= cycle.bag.length) {
    refillCycle()
  }

  let chosen = null
  for (let i = cycle.index; i < cycle.bag.length; i += 1) {
    const candidate = cycle.bag[i]
    if (!recent.includes(candidate)) {
      chosen = candidate
      cycle.index = i + 1
      break
    }
  }

  if (!chosen) {
    refillCycle()
    chosen = cycle.bag[cycle.index]
    cycle.index += 1
  }

  recent.push(chosen)
  if (recent.length > RECENT_LABELS_LIMIT) {
    recent.shift()
  }

  return chosen
}

const pickBlockLabel = (variant, stableWidth) => {
  if (!REGULAR_BLOCK_VARIANTS.includes(variant)) {
    return null
  }

  const group = getTextGroupForWidth(stableWidth)
  if (!group) {
    return null
  }

  const groupLabels = TEXT_GROUPS[group]
  if (!groupLabels.length) {
    return null
  }

  const variationIndex = Math.floor(Math.random() * (groupLabels.length + 1))
  if (variationIndex === 0) {
    return null
  }

  return selectBalancedLabelFromGroup(group)
}
const createActiveBlock = (topBlock, axis, speed, variant) => {
  const range = Math.max(topBlock[axis === 'x' ? 'w' : 'd'] / 2 + MOVE_RANGE_PADDING, 4.2)

  const stableWidth = axis === 'x' ? topBlock.d : topBlock.w

  return {
    x: axis === 'x' ? topBlock.x - range : topBlock.x,
    z: axis === 'z' ? topBlock.z - range : topBlock.z,
    w: topBlock.w,
    d: topBlock.d,
    y: topBlock.y + BLOCK_HEIGHT,
    axis,
    direction: 1,
    range,
    speed,
    variant,
    label: pickBlockLabel(variant, stableWidth),
    moveAxis: axis,
  }
}

export const createGameState = () => {
  resetTextSelectionState()

  const base = {
    ...createBlock({ x: 0, z: 0, w: BASE_SIZE, d: BASE_SIZE, y: 0, variant: 'black', label: null, moveAxis: null }),
    isBase: true,
  }

  const firstVariant = selectNextBlockVariant()

  return {
    score: 0,
    isOver: false,
    blocks: [base],
    active: createActiveBlock(base, 'x', START_SPEED, firstVariant),
    fallingPieces: [],
    perfectFx: 0,
    cameraOffset: null,
    cameraScale: 1,
    cameraTopRatio: CAMERA_TOP_RATIO,
  }
}

const spawnNext = (state) => {
  const top = state.blocks[state.blocks.length - 1]
  const nextAxis = state.active.axis === 'x' ? 'z' : 'x'
  const nextSpeed = clamp(START_SPEED + state.score * SPEED_STEP, START_SPEED, MAX_SPEED)
  const nextVariant = selectNextBlockVariant()
  state.active = createActiveBlock(top, nextAxis, nextSpeed, nextVariant)
}

const updateFallingPieces = (state, deltaSeconds) => {
  if (state.fallingPieces.length === 0) {
    return
  }

  state.fallingPieces = state.fallingPieces
    .map((piece) => {
      const age = piece.age + deltaSeconds
      const fadeStart = Math.max(0, piece.life - FALL_FADE_SECONDS)
      const opacity = age >= fadeStart ? clamp((piece.life - age) / FALL_FADE_SECONDS, 0, 1) : 1

      return {
        ...piece,
        age,
        opacity,
        y: piece.y + piece.vy * deltaSeconds,
        x: piece.x + piece.vx * deltaSeconds,
        z: piece.z + piece.vz * deltaSeconds,
        vy: piece.vy - FALL_GRAVITY * deltaSeconds,
      }
    })
    .filter((piece) => piece.age < piece.life && piece.opacity > 0.01)
}

export const updateGameState = (state, deltaSeconds) => {
  if (state.perfectFx > 0) {
    state.perfectFx = Math.max(0, state.perfectFx - deltaSeconds)
  }

  if (state.isOver || !state.active) {
    updateFallingPieces(state, deltaSeconds)
    return
  }

  const top = state.blocks[state.blocks.length - 1]
  const axis = state.active.axis
  const center = top[axis]
  const min = center - state.active.range
  const max = center + state.active.range

  state.active[axis] += state.active.speed * state.active.direction * deltaSeconds

  if (state.active[axis] <= min) {
    state.active[axis] = min
    state.active.direction = 1
  } else if (state.active[axis] >= max) {
    state.active[axis] = max
    state.active.direction = -1
  }

  updateFallingPieces(state, deltaSeconds)
}

const pushFallingPiece = (state, piece, axis, sign) => {
  if (piece.w <= 0 || piece.d <= 0) {
    return
  }

  state.fallingPieces.push({
    ...piece,
    vx: axis === 'x' ? FALL_SIDE_SPEED * sign : 0,
    vz: axis === 'z' ? FALL_SIDE_SPEED * sign : 0,
    vy: FALL_START_VELOCITY,
    life: FALL_LIFETIME,
    age: 0,
    opacity: 1,
  })
}

export const placeActiveBlock = (state) => {
  if (state.isOver || !state.active) {
    return { gameOver: true, score: state.score, perfect: false }
  }

  const top = state.blocks[state.blocks.length - 1]
  const active = state.active
  const axis = active.axis

  const topSize = axis === 'x' ? top.w : top.d
  const activeSize = axis === 'x' ? active.w : active.d

  const topMin = top[axis] - topSize / 2
  const topMax = top[axis] + topSize / 2
  const activeMin = active[axis] - activeSize / 2
  const activeMax = active[axis] + activeSize / 2

  const overlapMin = Math.max(topMin, activeMin)
  const overlapMax = Math.min(topMax, activeMax)
  const overlapSize = overlapMax - overlapMin

  if (overlapSize <= 0) {
    state.isOver = true

    pushFallingPiece(
      state,
      {
        x: active.x,
        z: active.z,
        w: active.w,
        d: active.d,
        y: active.y,
        variant: active.variant,
        label: active.label,
        moveAxis: active.moveAxis,
      },
      axis,
      active.direction,
    )

    return { gameOver: true, score: state.score, perfect: false }
  }

  const placed = {
    x: active.x,
    z: active.z,
    w: active.w,
    d: active.d,
    y: active.y,
    variant: active.variant,
    label: active.label,
    moveAxis: active.moveAxis,
  }

  const absDiff = Math.abs(active[axis] - top[axis])
  const errorPercentage = absDiff / topSize
  const isPerfect = errorPercentage <= PERFECT_EPSILON

  let choppedSize = 0

  if (isPerfect) {
    if (axis === 'x') {
      placed.x = top.x
      placed.w = top.w
    } else {
      placed.z = top.z
      placed.d = top.d
    }

    state.perfectFx = PERFECT_EFFECT_SECONDS
  } else {
    if (axis === 'x') {
      placed.x = overlapMin + overlapSize / 2
      placed.w = overlapSize
    } else {
      placed.z = overlapMin + overlapSize / 2
      placed.d = overlapSize
    }

    choppedSize = activeSize - overlapSize
  }

  if (choppedSize > 0.0001) {
    if (axis === 'x') {
      const choppedCenter = active.x > top.x ? overlapMax + choppedSize / 2 : overlapMin - choppedSize / 2
      pushFallingPiece(
        state,
        {
          x: choppedCenter,
          z: active.z,
          w: choppedSize,
          d: active.d,
          y: active.y,
          variant: active.variant,
          label: active.label,
          moveAxis: active.moveAxis,
        },
        axis,
        active.x > top.x ? 1 : -1,
      )
    } else {
      const choppedCenter = active.z > top.z ? overlapMax + choppedSize / 2 : overlapMin - choppedSize / 2
      pushFallingPiece(
        state,
        {
          x: active.x,
          z: choppedCenter,
          w: active.w,
          d: choppedSize,
          y: active.y,
          variant: active.variant,
          label: active.label,
          moveAxis: active.moveAxis,
        },
        axis,
        active.z > top.z ? 1 : -1,
      )
    }
  }

  state.blocks.push(placed)
  state.score += 1

  spawnNext(state)

  return { gameOver: false, score: state.score, perfect: isPerfect }
}

const projectPoint = (x, y, z, camera, width, height, scale = 1) => {
  const { tileW, tileH, unitHeight } = getProjectionMetrics(width, height, scale)

  return {
    x: (x - z) * tileW + width / 2,
    y: (x + z) * tileH - y * unitHeight + camera,
  }
}

const drawPolygon = (ctx, points, fill) => {
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

const hexToRgba = (hex, alpha = 1) => {
  const normalized = hex.replace('#', '')
  const int = Number.parseInt(normalized, 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const drawStripedPolygon = (
  ctx,
  points,
  { direction, baseColor, stripeColor, bandWidth = 18, anchorX = 0, anchorY = 0 },
) => {
  const span = 4096
  const stripeStep = bandWidth * 2

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.closePath()
  ctx.clip()

  ctx.translate(anchorX, anchorY)
  ctx.rotate(direction === 'stripe-forward' ? -STRIPE_ANGLE_RAD : STRIPE_ANGLE_RAD)

  for (let x = -span; x <= span; x += stripeStep) {
    ctx.fillStyle = baseColor
    ctx.fillRect(x, -span, bandWidth, span * 2)
    ctx.fillStyle = stripeColor
    ctx.fillRect(x + bandWidth, -span, bandWidth, span * 2)
  }

  ctx.restore()
}

const getBlockTextColor = (variant) => {
  if (variant === 'red') {
    return '#0a0a0b'
  }
  if (variant === 'black') {
    return '#ffffff'
  }
  if (variant === 'white') {
    return '#d31722'
  }
  return null
}

const getFaceMetrics = (facePoints) => {
  const [topLeft, topRight, bottomRight, bottomLeft] = facePoints
  const topMid = { x: (topLeft.x + topRight.x) / 2, y: (topLeft.y + topRight.y) / 2 }
  const bottomMid = { x: (bottomLeft.x + bottomRight.x) / 2, y: (bottomLeft.y + bottomRight.y) / 2 }
  const edgeDx = topRight.x - topLeft.x
  const edgeDy = topRight.y - topLeft.y
  const edgeLen = Math.hypot(edgeDx, edgeDy)
  const faceHeight = Math.hypot(bottomMid.x - topMid.x, bottomMid.y - topMid.y)

  let angle = Math.atan2(edgeDy, edgeDx)
  if (angle > Math.PI / 2) {
    angle -= Math.PI
  } else if (angle < -Math.PI / 2) {
    angle += Math.PI
  }

  return {
    angle,
    edgeLen,
    faceHeight,
    textCenter: {
      x: topMid.x + (bottomMid.x - topMid.x) * 0.52,
      y: topMid.y + (bottomMid.y - topMid.y) * 0.52,
    },
  }
}

const chooseSharedFaceFontSize = (ctx, text, faceA, faceB) => {
  const mA = getFaceMetrics(faceA)
  const mB = getFaceMetrics(faceB)
  const minWidth = Math.min(mA.edgeLen, mB.edgeLen) * 0.8
  const minHeight = Math.min(mA.faceHeight, mB.faceHeight) * 0.68
  let fontSize = Math.min(minHeight, 22)

  if (minWidth < 18 || minHeight < 8 || fontSize < 6.5) {
    return null
  }

  ctx.save()
  ctx.font = `700 ${fontSize}px "Space Grotesk", "Segoe UI", sans-serif`
  let measured = ctx.measureText(text).width
  if (measured > minWidth) {
    fontSize = Math.max(6, fontSize * (minWidth / measured))
    ctx.font = `700 ${fontSize}px "Space Grotesk", "Segoe UI", sans-serif`
    measured = ctx.measureText(text).width
  }
  ctx.restore()

  if (measured > minWidth || fontSize < 6) {
    return null
  }
  return fontSize
}

const drawFaceText = (ctx, facePoints, text, color, fontSize) => {
  if (!text || !color || !fontSize) {
    return
  }

  const metrics = getFaceMetrics(facePoints)

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(facePoints[0].x, facePoints[0].y)
  for (let i = 1; i < facePoints.length; i += 1) {
    ctx.lineTo(facePoints[i].x, facePoints[i].y)
  }
  ctx.closePath()
  ctx.clip()

  ctx.font = `700 ${fontSize}px "Space Grotesk", "Segoe UI", sans-serif`
  ctx.translate(metrics.textCenter.x, metrics.textCenter.y)
  ctx.rotate(metrics.angle)
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

const getBlockFaceStyles = (ctx, block) => {
  const variant = block.variant || 'black'

  if (variant === 'black') {
    return {
      top: '#181b1f',
      sideRight: '#101317',
      sideLeft: '#07090c',
    }
  }

  if (variant === 'white') {
    return {
      top: '#f6f6f6',
      sideRight: '#e4e4e4',
      sideLeft: '#d4d4d4',
    }
  }

  if (variant === 'red') {
    return {
      top: '#eb3939',
      sideRight: '#cc2626',
      sideLeft: '#a91a1a',
    }
  }

  if (variant === 'stripe-forward' || variant === 'stripe-backward') {
    const faceDirection = variant
    const bandWidth = 16

    return {
      top: {
        stripe: true,
        direction: faceDirection,
        baseColor: '#ff1f2d',
        stripeColor: '#ffffff',
        bandWidth,
      },
      sideRight: {
        stripe: true,
        direction: faceDirection,
        baseColor: '#ff1f2d',
        stripeColor: '#ffffff',
        bandWidth,
      },
      sideLeft: {
        stripe: true,
        direction: faceDirection,
        baseColor: '#ff1f2d',
        stripeColor: '#ffffff',
        bandWidth,
      },
    }
  }

  return {
    top: '#181b1f',
    sideRight: '#101317',
    sideLeft: '#07090c',
  }
}

const drawBaseDiamond = (ctx, camera, width, height, size, y, fill, scale = 1) => {
  const p1 = projectPoint(-size / 2, y, -size / 2, camera, width, height, scale)
  const p2 = projectPoint(size / 2, y, -size / 2, camera, width, height, scale)
  const p3 = projectPoint(size / 2, y, size / 2, camera, width, height, scale)
  const p4 = projectPoint(-size / 2, y, size / 2, camera, width, height, scale)
  drawPolygon(ctx, [p1, p2, p3, p4], fill)
}

const getPedestalSize = (width, height, scale = 1) => {
  const { tileW } = getProjectionMetrics(width, height, scale)
  // Projected platform width will be ~90% of the game zone, with small side margins.
  const targetProjectedWidth = width * 0.84
  return targetProjectedWidth / Math.max(1, tileW * 2)
}

const drawPedestal = (ctx, camera, width, height, scale = 1) => {
  const size = getPedestalSize(width, height, scale)
  drawBaseDiamond(ctx, camera, width, height, size * 1.06, -0.78, 'rgba(4, 6, 9, 0.16)', scale)
  drawBaseDiamond(ctx, camera, width, height, size * 0.92, -0.72, 'rgba(8, 10, 14, 0.24)', scale)

  const yTop = 0
  const yBottom = -0.56

  const tA = projectPoint(-size / 2, yTop, -size / 2, camera, width, height, scale)
  const tB = projectPoint(size / 2, yTop, -size / 2, camera, width, height, scale)
  const tC = projectPoint(size / 2, yTop, size / 2, camera, width, height, scale)
  const tD = projectPoint(-size / 2, yTop, size / 2, camera, width, height, scale)

  const bA = projectPoint(-size / 2, yBottom, -size / 2, camera, width, height, scale)
  const bB = projectPoint(size / 2, yBottom, -size / 2, camera, width, height, scale)
  const bC = projectPoint(size / 2, yBottom, size / 2, camera, width, height, scale)
  const bD = projectPoint(-size / 2, yBottom, size / 2, camera, width, height, scale)

  drawPolygon(ctx, [tA, tB, tC, tD], 'rgba(31, 36, 45, 0.78)')
  drawPolygon(ctx, [tB, tC, bC, bB], 'rgba(14, 17, 22, 0.82)')
  drawPolygon(ctx, [tD, tC, bC, bD], 'rgba(9, 11, 14, 0.9)')
  drawPolygon(ctx, [tA, tB, bB, bA], 'rgba(18, 22, 29, 0.8)')
}

const drawFoundation = (ctx, camera, width, height, scale = 1) => {
  const size = getPedestalSize(width, height, scale) * 0.76
  const y = 0
  drawBaseDiamond(ctx, camera, width, height, size, y, 'rgba(34, 41, 54, 0.56)', scale)
  drawBaseDiamond(ctx, camera, width, height, size * 0.92, y, 'rgba(56, 70, 92, 0.36)', scale)
}

const drawBlock = (ctx, block, camera, width, height, opacity = 1, highlight = 0, scale = 1) => {
  const y0 = block.y
  const y1 = block.y + BLOCK_HEIGHT

  const p000 = projectPoint(block.x - block.w / 2, y0, block.z - block.d / 2, camera, width, height, scale)
  const p100 = projectPoint(block.x + block.w / 2, y0, block.z - block.d / 2, camera, width, height, scale)
  const p110 = projectPoint(block.x + block.w / 2, y0, block.z + block.d / 2, camera, width, height, scale)
  const p010 = projectPoint(block.x - block.w / 2, y0, block.z + block.d / 2, camera, width, height, scale)

  const p001 = projectPoint(block.x - block.w / 2, y1, block.z - block.d / 2, camera, width, height, scale)
  const p101 = projectPoint(block.x + block.w / 2, y1, block.z - block.d / 2, camera, width, height, scale)
  const p111 = projectPoint(block.x + block.w / 2, y1, block.z + block.d / 2, camera, width, height, scale)
  const p011 = projectPoint(block.x - block.w / 2, y1, block.z + block.d / 2, camera, width, height, scale)

  const isBase = Boolean(block.isBase)
  const faceStyles = isBase
    ? {
        top: '#121214',
        sideRight: '#0a0a0c',
        sideLeft: '#050507',
      }
    : getBlockFaceStyles(ctx, block)

  ctx.save()
  ctx.globalAlpha = opacity

  const topFace = [p001, p101, p111, p011]
  const rightFace = [p101, p111, p110, p100]
  const leftFace = [p011, p111, p110, p010]
  const stripeAnchor = p111

  if (typeof faceStyles.top === 'string') {
    drawPolygon(ctx, topFace, faceStyles.top)
  } else {
    drawStripedPolygon(ctx, topFace, { ...faceStyles.top, anchorX: stripeAnchor.x, anchorY: stripeAnchor.y })
  }

  if (typeof faceStyles.sideRight === 'string') {
    drawPolygon(ctx, rightFace, faceStyles.sideRight)
  } else {
    drawStripedPolygon(ctx, rightFace, { ...faceStyles.sideRight, anchorX: stripeAnchor.x, anchorY: stripeAnchor.y })
  }

  if (typeof faceStyles.sideLeft === 'string') {
    drawPolygon(ctx, leftFace, faceStyles.sideLeft)
  } else {
    drawStripedPolygon(ctx, leftFace, { ...faceStyles.sideLeft, anchorX: stripeAnchor.x, anchorY: stripeAnchor.y })
  }

  if (typeof faceStyles.top !== 'string') {
    drawPolygon(ctx, rightFace, 'rgba(0, 0, 0, 0.12)')
    drawPolygon(ctx, leftFace, 'rgba(0, 0, 0, 0.2)')
  }

  if (highlight > 0.01) {
    drawPolygon(ctx, topFace, hexToRgba('#ffffff', Math.min(0.12, highlight * 0.14)))
  }

  if (!isBase && block.label && REGULAR_BLOCK_VARIANTS.includes(block.variant)) {
    const textColor = getBlockTextColor(block.variant)
    const moveAxis = block.moveAxis
    const xPositiveFace = rightFace
    const xNegativeFace = [p001, p011, p010, p000]
    const zPositiveFace = leftFace
    const zNegativeFace = [p001, p101, p100, p000]
    // If movement is along X, X-size is cut, so X faces stay stable (their width is along Z).
    // If movement is along Z, Z-size is cut, so Z faces stay stable (their width is along X).
    const stableFaces = moveAxis === 'x' ? [xPositiveFace, xNegativeFace] : [zPositiveFace, zNegativeFace]
    const sharedFontSize = chooseSharedFaceFontSize(ctx, block.label, stableFaces[0], stableFaces[1])

    if (sharedFontSize) {
      // In this camera we render only visible side faces; draw text only on the visible stable face.
      const visibleStableFace = moveAxis === 'x' ? xPositiveFace : zPositiveFace
      drawFaceText(ctx, visibleStableFace, block.label, textColor, sharedFontSize)
    }
  }

  ctx.restore()
}

const getCameraOffsetTarget = (state, width, height) => {
  if (state.isOver) {
    // Keep tower base anchored at a constant vertical position for any final height.
    return height * CAMERA_END_BASELINE_RATIO
  }

  const top = state.blocks[state.blocks.length - 1]
  const { unitHeight } = getProjectionMetrics(width, height, state.cameraScale)

  const targetTopY = height * state.cameraTopRatio
  // Follow only tower height. Tracking x/z makes the whole stack feel like it drifts toward the camera.
  const topWorldY = -(top.y + BLOCK_HEIGHT) * unitHeight

  return targetTopY - topWorldY
}

const drawBackground = (ctx, width, height) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, '#edf4ff')
  gradient.addColorStop(0.56, '#dce8fb')
  gradient.addColorStop(1, '#c9d7f4')

  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  const glow = ctx.createRadialGradient(width * 0.35, height * 0.22, 10, width * 0.35, height * 0.22, width * 0.62)
  glow.addColorStop(0, 'rgba(255,255,255,0.62)')
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)
}

type DrawGameOptions = {
  drawBackground?: boolean
}

export const drawGame = (ctx, state, width, height, options: DrawGameOptions = {}) => {
  ctx.clearRect(0, 0, width, height)

  if (options.drawBackground !== false) {
    drawBackground(ctx, width, height)
  }

  const topPlaced = state.blocks[state.blocks.length - 1]
  const { unitHeight } = getProjectionMetrics(width, height, 1)
  const towerHeightPx = (topPlaced.y + BLOCK_HEIGHT + 2) * unitHeight
  const availableHeight =
    height * Math.max(0.2, CAMERA_END_BASELINE_RATIO - CAMERA_END_TOP_SAFE_RATIO)
  const fitScale = clamp(availableHeight / Math.max(1, towerHeightPx), CAMERA_MIN_SCALE, 1)
  const targetScale = state.isOver ? fitScale : 1
  const targetRatio = state.isOver ? CAMERA_END_RATIO : CAMERA_TOP_RATIO

  state.cameraScale += (targetScale - state.cameraScale) * CAMERA_END_LERP
  state.cameraTopRatio += (targetRatio - state.cameraTopRatio) * CAMERA_END_LERP

  const cameraTarget = getCameraOffsetTarget(state, width, height)
  if (typeof state.cameraOffset !== 'number') {
    state.cameraOffset = cameraTarget
  } else {
    state.cameraOffset += (cameraTarget - state.cameraOffset) * CAMERA_LERP
  }
  const camera = state.cameraOffset
  const perfectStrength = clamp(state.perfectFx / PERFECT_EFFECT_SECONDS, 0, 1)
  const towerDepth = topPlaced.x + topPlaced.z

  drawPedestal(ctx, camera, width, height, state.cameraScale)
  drawFoundation(ctx, camera, width, height, state.cameraScale)

  const fallingBack = []
  const fallingFront = []

  state.fallingPieces.forEach((piece) => {
    if (piece.x + piece.z < towerDepth) {
      fallingBack.push(piece)
    } else {
      fallingFront.push(piece)
    }
  })

  const sortByDepth = (a, b) => (a.x + a.z + a.y * 0.01) - (b.x + b.z + b.y * 0.01)
  fallingBack.sort(sortByDepth)
  fallingFront.sort(sortByDepth)

  fallingBack.forEach((piece) => {
    drawBlock(ctx, piece, camera, width, height, piece.opacity, 0, state.cameraScale)
  })

  state.blocks
    .slice()
    .sort((a, b) => a.y - b.y)
    .forEach((block) => {
      drawBlock(ctx, block, camera, width, height, 1, block === topPlaced ? perfectStrength : 0, state.cameraScale)
    })

  fallingFront.forEach((piece) => {
    drawBlock(ctx, piece, camera, width, height, piece.opacity, 0, state.cameraScale)
  })

  // Keep the moving block on top of the stack rendering to avoid depth flicker.
  if (state.active && !state.isOver) {
    drawBlock(ctx, state.active, camera, width, height, 1, 0, state.cameraScale)
  }
}

