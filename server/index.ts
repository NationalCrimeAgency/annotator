/**
 * Crown Copyright 2025, National Crime Agency
 *
 * Package for initialising this plugin's server-side components.
 *
 * @author d221155 (NCA)
 */

import type {PluginConfigDescriptor, PluginInitializerContext} from '@kbn/core/server'
import {AnnotatorPlugin} from './plugin'
import {configSchema, ConfigType} from "../common";


export function plugin(initializerContext: PluginInitializerContext) {
  return new AnnotatorPlugin(initializerContext)
}

export type {AnnotatorPluginSetup, AnnotatorPluginStart} from './types'

// Hook to expose the expected schema of this plugin's configuration to Kibana
export const config: PluginConfigDescriptor<ConfigType> = {
  // By default, a plugin's configuration is not available to UI components;
  // with each prop exposed separately
  exposeToBrowser: {
    enabled: true,
    debug: true,
    docViews: true,
    annotations: true
  },
  schema: configSchema
};
