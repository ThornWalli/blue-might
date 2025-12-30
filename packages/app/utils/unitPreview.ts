import type { Object3D } from 'three';
import {
  AmbientLight,
  Box3,
  DirectionalLight,
  NeutralToneMapping,
  OrthographicCamera,
  PCFShadowMap,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer
} from 'three';

interface CameraSetupOptions {
  fill: 'width' | 'height'; // Welche Dimension füllen
}

export function createRenderer(canvas: HTMLCanvasElement | OffscreenCanvas) {
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    preserveDrawingBuffer: true
  });

  //#region renderer settings
  renderer.shadowMap.autoUpdate = true;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setPixelRatio(480 / window.innerWidth);
  // renderer.setPixelRatio(1 / 3);
  // renderer.setPixelRatio(window.devicePixelRatio); // window.devicePixelRatio

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = true;

  //#endregion

  // const dimension = new Vector2(canvas.width, canvas.height);
  // if (canvas) {
  //   renderer.setSize(dimension.x, dimension.y);
  // }

  return renderer;
}

export function createPreviewCamera(canvas: HTMLCanvasElement, unitPx = 100) {
  const widthPx = canvas.clientWidth;
  const heightPx = canvas.clientHeight;
  const aspect = widthPx / heightPx;

  // gewünschte Höhe in Units (z. B. 1 Unit = 100px)
  const worldHeight = heightPx / unitPx;
  const worldWidth = worldHeight * aspect; // <-- aspect korrekt anwenden

  const camera = new OrthographicCamera(
    -worldWidth / 2,
    worldWidth / 2,
    worldHeight / 2,
    -worldHeight / 2,
    1,
    1000
  );

  camera.position.set(4, 4, 4);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  return camera;
}

export function createFitCamera(
  canvas: HTMLCanvasElement,
  options: CameraSetupOptions = { fill: 'width' }
) {
  const widthPx = canvas.clientWidth;
  const heightPx = canvas.clientHeight;
  const aspect = widthPx / heightPx;

  let worldWidth: number;
  let worldHeight: number;

  if (options.fill === 'width') {
    worldWidth = 1; // 1 Unit = gesamte Breite
    worldHeight = worldWidth / aspect;
  } else {
    worldHeight = 1; // 1 Unit = gesamte Höhe
    worldWidth = worldHeight * aspect;
  }

  const camera = new OrthographicCamera(
    -worldWidth / 2,
    worldWidth / 2,
    worldHeight / 2,
    -worldHeight / 2,
    0.1,
    1000
  );

  camera.position.set(10, 10, 10);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  return { camera, worldWidth, worldHeight };
}

export function createCamera() {
  return new OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
}

export function updateOrthoCameraForObject_(
  camera: OrthographicCamera,
  canvas: HTMLCanvasElement,
  object: Object3D,
  cameraPosition: Vector3
) {
  const aspect = canvas.clientWidth / canvas.clientHeight;

  camera.position.copy(cameraPosition);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();

  // Bounding Box des Objekts
  const box = new Box3().setFromObject(object);
  const points = [
    new Vector3(box.min.x, box.min.y, box.min.z),
    new Vector3(box.min.x, box.min.y, box.max.z),
    new Vector3(box.min.x, box.max.y, box.min.z),
    new Vector3(box.min.x, box.max.y, box.max.z),
    new Vector3(box.max.x, box.min.y, box.min.z),
    new Vector3(box.max.x, box.min.y, box.max.z),
    new Vector3(box.max.x, box.max.y, box.min.z),
    new Vector3(box.max.x, box.max.y, box.max.z)
  ];

  // Punkte in Kameraraum transformieren
  const camMatrix = camera.matrixWorld.clone().invert();
  const pointsCamSpace = points.map(p => p.clone().applyMatrix4(camMatrix));

  // Min/Max in Kameraraum finden
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  pointsCamSpace.forEach(p => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  });

  const objWidth = maxX - minX;
  const objHeight = maxY - minY;

  // Frustum anhand des Canvas-Seitenverhältnisses berechnen
  let worldWidth = objWidth;
  let worldHeight = objHeight;

  if (worldWidth / worldHeight > aspect) {
    worldHeight = worldWidth / aspect;
  } else {
    worldWidth = worldHeight * aspect;
  }

  // Objekt am unteren Rand ausrichten
  camera.left = -worldWidth / 2;
  camera.right = worldWidth / 2;
  camera.bottom = minY; // Objekt-Unterkante genau unten
  camera.top = minY + worldHeight; // Höhe basierend auf Frustum

  camera.updateProjectionMatrix();
}
export function updateOrthoCameraForObject(
  camera: OrthographicCamera,
  aspect: number,
  object: Object3D,
  cameraPosition: Vector3
) {
  camera.position.copy(cameraPosition);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();

  // Bounding Box des Objekts
  const box = new Box3().setFromObject(object);
  const points = [
    new Vector3(box.min.x, box.min.y, box.min.z),
    new Vector3(box.min.x, box.min.y, box.max.z),
    new Vector3(box.min.x, box.max.y, box.min.z),
    new Vector3(box.min.x, box.max.y, box.max.z),
    new Vector3(box.max.x, box.min.y, box.min.z),
    new Vector3(box.max.x, box.min.y, box.max.z),
    new Vector3(box.max.x, box.max.y, box.min.z),
    new Vector3(box.max.x, box.max.y, box.max.z)
  ];

  // Punkte in Kameraraum transformieren
  const camMatrix = camera.matrixWorld.clone().invert();
  const pointsCamSpace = points.map(p => p.clone().applyMatrix4(camMatrix));

  // Min/Max in Kameraraum finden
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  pointsCamSpace.forEach(p => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  });

  const objWidth = maxX - minX;
  const objHeight = maxY - minY;

  // Frustum anhand des Canvas-Seitenverhältnisses berechnen
  let worldWidth = objWidth;
  let worldHeight = objHeight;

  if (worldWidth / worldHeight > aspect) {
    worldHeight = worldWidth / aspect;
  } else {
    worldWidth = worldHeight * aspect;
  }

  // Objekt am unteren Rand ausrichten
  camera.left = -worldWidth / 2;
  camera.right = worldWidth / 2;
  camera.bottom = minY; // Objekt-Unterkante genau unten
  camera.top = minY + worldHeight; // Höhe basierend auf Frustum

  camera.updateProjectionMatrix();
}

export function createScene() {
  const scene = new Scene();

  //#region light

  const ambientLight = new AmbientLight(0xffffff, 1);
  scene.add(ambientLight);

  const light = new DirectionalLight(0xffffff, 1);
  light.position.set(20, 50, 20);

  light.castShadow = true;

  light.shadow.mapSize.set(1024, 1024);
  light.shadow.radius = 0;

  light.shadow.bias = -0.0007;
  light.shadow.normalBias = 0.03;

  light.lookAt(0, 0, 0);

  const SHADOW_RANGE = 12;

  light.shadow.camera.left = -SHADOW_RANGE;
  light.shadow.camera.right = SHADOW_RANGE;
  light.shadow.camera.top = SHADOW_RANGE;
  light.shadow.camera.bottom = -SHADOW_RANGE;

  light.shadow.camera.near = 2;
  light.shadow.camera.far = 40;
  light.shadow.camera.updateProjectionMatrix();

  scene.add(light);

  //#endregion

  return scene;
}
