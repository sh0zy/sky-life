import * as THREE from 'three';

export interface SafeFlightBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  corridorHalfWidth: number;
  isMobile: boolean;
  isPortrait: boolean;
  isMobilePortrait: boolean;
  isMobileLandscape: boolean;
  viewportWidth: number;
  viewportHeight: number;
  aspectRatio: number;
  baseCamZ: number;
  baseFov: number;
  camFollowX: number;
  camFollowY: number;
  lookFollowX: number;
  lookFollowY: number;
}

/**
 * Determines whether the current viewport is a smartphone/mobile screen.
 * Considers viewport dimensions, aspect ratio/orientation, and touch/coarse pointer media queries
 * so small/large smartphones in both portrait (360x800..430x932) and landscape (640x360..932x430)
 * are accurately detected while preserving PC desktop layout (e.g. 1920x1080).
 */
export function detectDeviceViewport(width: number, height: number): {
  isMobile: boolean;
  isPortrait: boolean;
  isMobilePortrait: boolean;
  isMobileLandscape: boolean;
  aspectRatio: number;
} {
  const safeW = Math.max(1, width);
  const safeH = Math.max(1, height);
  const aspectRatio = safeW / safeH;
  const isPortrait = aspectRatio < 1.0;

  const isMobileUserAgent =
    typeof navigator !== 'undefined' &&
    /iPhone|iPod|Android.*Mobile|Windows Phone/i.test(navigator.userAgent);

  const shortSide = Math.min(safeW, safeH);

  // Smartphone Portrait: width <= 500px in portrait orientation (e.g. 360x800, 390x844, 412x915)
  const isPortraitPhone = isPortrait && safeW <= 500;

  // Smartphone Landscape: height <= 440px and width <= 960px in landscape orientation (e.g. 844x390, 915x412)
  const isLandscapePhone = !isPortrait && safeH <= 440 && safeW <= 960;

  // PC (e.g. 1920x1080, 1366x768, touch-enabled laptops, and desktop split windows > 500x440) is always isMobile = false
  const isMobile =
    isPortraitPhone ||
    isLandscapePhone ||
    (isMobileUserAgent && shortSide <= 500);

  return {
    isMobile,
    isPortrait,
    isMobilePortrait: isMobile && isPortrait,
    isMobileLandscape: isMobile && !isPortrait,
    aspectRatio,
  };
}

/**
 * Computes the dynamic 3D player movement bounds at the player plane (Z = 0)
 * from camera FOV, aspect ratio, and camera distance, taking into account:
 * 1. Perspective frustum formula:
 *      visibleHeight = 2 * distance * tan(verticalFov / 2)
 *      visibleWidth  = visibleHeight * aspectRatio
 * 2. Camera follow & lookAt geometry at Z = 0
 * 3. Character physical width/height margin (wingspan & head/feet)
 * 4. Top HUD & Bottom Controller UI safe regions
 */
export function computeSafeFlightBounds(
  viewportWidth: number,
  viewportHeight: number
): SafeFlightBounds {
  const {
    isMobile,
    isPortrait,
    isMobilePortrait,
    isMobileLandscape,
    aspectRatio,
  } = detectDeviceViewport(viewportWidth, viewportHeight);

  // Camera base distance and vertical FOV tailored so portrait & landscape phones have a clear view
  const baseCamZ = isMobilePortrait ? 9.2 : isMobileLandscape ? 6.8 : 6.4;
  const baseFov = isMobilePortrait ? 65 : isMobileLandscape ? 58 : 58;

  // Camera follow ratios (smoother and more centered on mobile to prevent disorienting swings)
  const camFollowX = isMobilePortrait ? 0.35 : isMobileLandscape ? 0.36 : 0.48;
  const lookFollowX = isMobilePortrait ? 0.30 : isMobileLandscape ? 0.28 : 0.30;
  const camFollowY = isMobilePortrait ? 0.32 : isMobileLandscape ? 0.36 : 0.45;
  const lookFollowY = isMobilePortrait ? 0.24 : isMobileLandscape ? 0.26 : 0.30;

  // Perspective frustum formula at player Z = 0 plane
  const distance = baseCamZ;
  const vFovRad = THREE.MathUtils.degToRad(baseFov);
  const visibleHeight = 2 * distance * Math.tan(vFovRad / 2);
  const visibleWidth = visibleHeight * aspectRatio;

  if (!isMobile) {
    // PC (e.g. 1920x1080): preserve classic PC range [-8.5, +8.5] while respecting aspect ratio & camera follow
    const lookZ = -12;
    const zRatio = baseCamZ / (baseCamZ - lookZ);
    const centerLineFactorX = camFollowX + zRatio * (lookFollowX - camFollowX);
    const relativePlayerFactorX = Math.max(0.35, 1 - centerLineFactorX);
    const rawPcMaxX = (0.88 * (visibleWidth * 0.5) - 0.8) / relativePlayerFactorX;
    const maxX = Math.min(8.5, Math.max(5.5, rawPcMaxX));
    return {
      minX: -maxX,
      maxX,
      minY: -3.5,
      maxY: 5.5,
      corridorHalfWidth: maxX,
      isMobile: false,
      isPortrait,
      isMobilePortrait: false,
      isMobileLandscape: false,
      viewportWidth,
      viewportHeight,
      aspectRatio,
      baseCamZ,
      baseFov,
      camFollowX,
      camFollowY,
      lookFollowX,
      lookFollowY,
    };
  }

  // On mobile, compute the exact screen-center line at Z = 0 given camFollowX and lookFollowX at Z = -12
  const lookZ = -12;
  const zRatio = baseCamZ / (baseCamZ - lookZ);
  const centerLineFactorX = camFollowX + zRatio * (lookFollowX - camFollowX);
  const relativePlayerFactorX = Math.max(0.35, 1 - centerLineFactorX);

  const charRadiusX = isMobilePortrait ? 0.72 : 0.85;
  const safeNdcLimitX = isMobilePortrait ? 0.84 : 0.76;

  // Solve: relativePlayerFactorX * maxX + charRadiusX = safeNdcLimitX * (visibleWidth * 0.5)
  const rawMaxX =
    (safeNdcLimitX * (visibleWidth * 0.5) - charRadiusX) / relativePlayerFactorX;

  const maxX = isMobilePortrait
    ? THREE.MathUtils.clamp(rawMaxX, 2.0, 3.2)
    : THREE.MathUtils.clamp(rawMaxX, 3.8, 6.0);

  // Vertical safe bounds considering Top Compact HUD and Bottom Joystick/Boost
  const centerLineFactorY = camFollowY + zRatio * (lookFollowY - camFollowY);
  const relativePlayerFactorY = Math.max(0.35, 1 - centerLineFactorY);
  const baseScreenCenterY = 1.85 + zRatio * (0.4 - 1.85); // ~1.22

  const charRadiusYTop = 0.98;
  const charRadiusYBottom = 0.92;
  const safeTopNdcY = isMobilePortrait ? 0.74 : 0.70;
  const safeBottomNdcY = isMobilePortrait ? 0.52 : 0.56;

  const rawMaxY =
    baseScreenCenterY +
    (safeTopNdcY * (visibleHeight * 0.5) - charRadiusYTop) / relativePlayerFactorY;
  const rawMinY =
    baseScreenCenterY -
    (safeBottomNdcY * (visibleHeight * 0.5) - charRadiusYBottom) / relativePlayerFactorY;

  const maxY = THREE.MathUtils.clamp(rawMaxY, 2.2, isMobilePortrait ? 4.2 : 4.4);
  const minY = THREE.MathUtils.clamp(rawMinY, isMobilePortrait ? -2.3 : -2.5, -1.1);

  return {
    minX: -maxX,
    maxX,
    minY,
    maxY,
    corridorHalfWidth: maxX,
    isMobile: true,
    isPortrait,
    isMobilePortrait,
    isMobileLandscape,
    viewportWidth,
    viewportHeight,
    aspectRatio,
    baseCamZ,
    baseFov,
    camFollowX,
    camFollowY,
    lookFollowX,
    lookFollowY,
  };
}

// Reusable vectors for zero-allocation per-frame camera matrix checks
const _leftEdgeWorld = new THREE.Vector3();
const _rightEdgeWorld = new THREE.Vector3();
const _topEdgeWorld = new THREE.Vector3();
const _bottomEdgeWorld = new THREE.Vector3();

/**
 * Uses the actual Three.js Camera World-to-Projection matrices (`matrixWorldInverse` & `projectionMatrix`)
 * to verify the character's bounding edges in Normalized Device Coordinates (NDC [-1, 1])
 * and clamp the player's world (x, y) position so the character NEVER leaves the safe screen area.
 */
export function clampPlayerToCameraFrustum(
  playerPos: THREE.Vector3,
  camera: THREE.Camera,
  bounds: SafeFlightBounds,
  characterScale = 1.0
): void {
  // First clamp to analytical bounds
  playerPos.x = THREE.MathUtils.clamp(playerPos.x, bounds.minX, bounds.maxX);
  playerPos.y = THREE.MathUtils.clamp(playerPos.y, bounds.minY, bounds.maxY);

  camera.updateMatrixWorld();

  const charRadiusX = (bounds.isMobilePortrait ? 0.68 : 0.8) * characterScale;
  const charRadiusYTop = 0.95 * characterScale;
  const charRadiusYBottom = 0.88 * characterScale;

  // Allowed NDC safe box (accounting for HUD at top and touch controls at bottom on mobile)
  const maxNdcX = bounds.isMobilePortrait ? 0.90 : bounds.isMobileLandscape ? 0.86 : 0.97;
  const maxNdcY = bounds.isMobilePortrait ? 0.80 : bounds.isMobileLandscape ? 0.76 : 0.92;
  const minNdcY = bounds.isMobilePortrait ? -0.60 : bounds.isMobileLandscape ? -0.64 : -0.88;

  // Iterative matrix-verified correction (converges in 1-2 steps)
  for (let iter = 0; iter < 3; iter++) {
    _leftEdgeWorld.set(playerPos.x - charRadiusX, playerPos.y, 0).project(camera);
    _rightEdgeWorld.set(playerPos.x + charRadiusX, playerPos.y, 0).project(camera);
    _topEdgeWorld.set(playerPos.x, playerPos.y + charRadiusYTop, 0).project(camera);
    _bottomEdgeWorld.set(playerPos.x, playerPos.y - charRadiusYBottom, 0).project(camera);

    let adjusted = false;

    if (_leftEdgeWorld.x < -maxNdcX) {
      const excess = -maxNdcX - _leftEdgeWorld.x;
      playerPos.x += excess * 1.8;
      adjusted = true;
    } else if (_rightEdgeWorld.x > maxNdcX) {
      const excess = _rightEdgeWorld.x - maxNdcX;
      playerPos.x -= excess * 1.8;
      adjusted = true;
    }

    if (_topEdgeWorld.y > maxNdcY) {
      const excess = _topEdgeWorld.y - maxNdcY;
      playerPos.y -= excess * 1.8;
      adjusted = true;
    } else if (_bottomEdgeWorld.y < minNdcY) {
      const excess = minNdcY - _bottomEdgeWorld.y;
      playerPos.y += excess * 1.8;
      adjusted = true;
    }

    if (!adjusted) break;
  }

  // Final hard clamp to analytical safe bounds
  playerPos.x = THREE.MathUtils.clamp(playerPos.x, bounds.minX, bounds.maxX);
  playerPos.y = THREE.MathUtils.clamp(playerPos.y, bounds.minY, bounds.maxY);
}
