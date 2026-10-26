// Lets unit tests import game modules that use the browser's import-map name 'three'.
import {register} from 'node:module';
register('./three-resolver.mjs', import.meta.url);
