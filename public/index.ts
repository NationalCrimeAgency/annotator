/**
 * Crown Copyright 2025, National Crime Agency
 *
 * Package for initialising this plugin.
 *
 * @author d221155 (NCA)
 */

import './index.scss';
import { PluginInitializerContext } from '@kbn/core/public';
import { AnnotatorPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin(initializerContext: PluginInitializerContext) {
  return new AnnotatorPlugin(initializerContext);
}

export type { AnnotatorPluginSetup, AnnotatorPluginStart } from './types';
