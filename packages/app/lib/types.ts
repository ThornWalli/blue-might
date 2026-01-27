import type { Texture } from 'three';

import type AppPlayground from './classes/app/AppPlayground';
import type AppEditor from './classes/app/AppEditor';
import type BaseApp from './classes/BaseApp';
import type AppDebug from './classes/app/AppDebug';

export interface Textures {
  [key: string]: Texture;
}

export type App = AppPlayground | AppEditor | AppDebug | BaseApp;
