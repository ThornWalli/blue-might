import {
  CircleGeometry,
  ConeGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Vector2,
  type WebGLProgramParametersWithUniforms
} from 'three';

export interface DustConeOptions {
  scale: number;
  scaleSpeed: number;
  size: Vector2;
  circleSize: number;
  ditherThreshold: number;
  circleOpacity: number;
  color: number;
  groundShader: boolean;
}

export function createDustCone(options: Partial<DustConeOptions> = {}) {
  const {
    scale,
    size,
    circleSize,
    ditherThreshold,
    circleOpacity,
    color,
    groundShader
  } = {
    scale: options.scale ?? 0.5,
    size: options.size ?? new Vector2(0.2, 1),
    circleSize: options.circleSize ?? 0.2,
    ditherThreshold: options.ditherThreshold ?? 0.1,
    circleOpacity: options.circleOpacity ?? 0.4,
    color: options.color ?? 0xffffff,
    groundShader: options.groundShader ?? false
  };
  const circleWidth = circleSize * scale;
  const width = size.x * scale;
  const height = size.y * scale;
  const geo = new ConeGeometry(width, height, 5, 1, true);
  const mat = new MeshBasicMaterial({
    color,
    side: DoubleSide,
    transparent: true,
    alphaTest: 0.0001
  });

  const ditherShader = (shader: WebGLProgramParametersWithUniforms) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <premultiplied_alpha_fragment>',
      `
    #include <premultiplied_alpha_fragment>
    int x = int(mod(gl_FragCoord.x, 4.0));
    int y = int(mod(gl_FragCoord.y, 4.0));
    float bayer[16] = float[16](
      0.0/16.0, 8.0/16.0, 2.0/16.0, 10.0/16.0,
      12.0/16.0, 4.0/16.0, 14.0/16.0, 6.0/16.0,
      3.0/16.0, 11.0/16.0, 1.0/16.0, 9.0/16.0,
      15.0/16.0, 7.0/16.0, 13.0/16.0, 5.0/16.0
    );
    float threshold = bayer[x + y * 4];
    float alpha = step(threshold, ${ditherThreshold});

    gl_FragColor.a *= alpha;
    `
    );
  };

  mat.onBeforeCompile = ditherShader;
  mat.needsUpdate = true;
  const dustCone = new Mesh(geo, mat);
  dustCone.position.y += height / 2;

  const groundGeometry = new CircleGeometry(circleWidth, 5);
  groundGeometry.rotateX(-Math.PI / 2);
  const groundMaterial = new MeshBasicMaterial({
    color,
    side: DoubleSide,
    opacity: circleOpacity,
    transparent: circleOpacity < 1,
    alphaTest: 0.0001
  });
  if (groundShader) {
    groundMaterial.onBeforeCompile = ditherShader;
  }
  const ground = new Mesh(groundGeometry, groundMaterial);

  const obj = new Object3D();
  obj.add(ground);
  obj.add(dustCone);
  obj.userData.scale = 1;

  return obj;
}
