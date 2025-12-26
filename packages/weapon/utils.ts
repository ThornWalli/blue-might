import { Mesh, MeshLambertMaterial, PlaneGeometry } from 'three';
import soundShoot1 from '@blue-might/app/assets/meshes/shoot_1.wav?url';

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
const sounds = {
  soundShoot1
};

const _audios: { [key: string]: HTMLAudioElement } = {};
function createSound(src: string) {
  const audio = new Audio(src);
  audio.preload = 'auto';
  audio.load();
  return audio;
}

export function playSound(name: keyof typeof sounds, volume = 0.5) {
  if (!_audios[name]) {
    _audios[name] = createSound(sounds[name]);
  }
  const sound = _audios[name].cloneNode() as HTMLAudioElement;
  sound.volume = volume;
  sound.play();
}
