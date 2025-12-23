import { Mesh, MeshLambertMaterial, PlaneGeometry } from 'three';

export function createGround(options?: { color?: number }) {
  const ground = new Mesh(
    new PlaneGeometry(100, 100),
    new MeshLambertMaterial({
      color: options?.color ?? 0xcccccc,
      flatShading: true
    })
  );

  ground.receiveShadow = true;

  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  return ground;
}
const _audios: { [key: string]: HTMLAudioElement } = {};
function createSound(src: string) {
  const audio = new Audio(src);
  audio.preload = 'auto';
  audio.load();
  return audio;
}

export function playSound(url: string, volume = 0.5) {
  if (!_audios[url]) {
    _audios[url] = createSound(url);
  }
  const sound = _audios[url].cloneNode() as HTMLAudioElement;
  sound.volume = volume;
  sound.play();
}
