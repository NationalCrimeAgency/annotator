/**
 * Crown Copyright 2025, National Crime Agency
 *
 * Package for initialising the server-side of this plugin.
 *
 * @author d221155 (NCA)
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import { CoreSetup, CoreStart, Plugin, Logger, DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { SubFeatureConfig } from '@kbn/features-plugin/common';
import { AnnotatorPluginSetup, AnnotatorPluginStart } from './types';
import { defineRoutes } from './routes';
import { ConfigType, PLUGIN_ID, PLUGIN_NAME } from '../common';
import { registerAnnotationsFieldFormatter } from './register_field_formatter';

/**
 * Annotator plugin (server-side).
 */
export class AnnotatorPlugin implements Plugin<AnnotatorPluginSetup, AnnotatorPluginStart> {
  private readonly config: ConfigType;
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext<ConfigType>) {
    this.config = initializerContext.config.get<ConfigType>();
    this.logger = initializerContext.logger.get();

    this.logger.info(`constructor: config="${JSON.stringify(this.config)}"`);
  }

  // @ts-ignore
  public setup(core: CoreSetup<AnnotatorPluginStart>, deps: AnnotatorPluginSetup) {
    this.logger.debug('[AnnotatorPlugin] setup: Setup');

    const fields: string[] = this.config.annotations.map((a) => a.field);

    this.logger.debug(`[AnnotatorPlugin] setup: fields="${JSON.stringify(fields)}"`);

    // Register the plugin as a feature for privileges management
    deps.features.registerKibanaFeature({
      id: PLUGIN_ID,
      name: PLUGIN_NAME,
      description: 'Grants access to annotation controls for all configured fields',
      category: DEFAULT_APP_CATEGORIES.kibana,
      app: [PLUGIN_ID],
      privileges: {
        all: {
          app: [PLUGIN_ID],
          savedObject: {
            all: [],
            read: [],
          },
          api: ['annotations:update'],
          ui: ['view', 'create', 'edit', 'delete'].map((a) => `all:${a}`),
        },
        read: {
          app: [PLUGIN_ID],
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['all:view'],
        },
      },
      subFeatures: fields.map(
        (f): SubFeatureConfig => ({
          name: f,
          description:
            'Grants access to annotation controls corresponding to only this specific field',
          privilegeGroups: [
            {
              groupType: 'mutually_exclusive',
              privileges: [
                {
                  id: `${f.replace(/\./g, '_')}-all`,
                  name: 'All',
                  includeIn: 'all',
                  savedObject: {
                    all: [],
                    read: [],
                  },
                  api: ['annotations:update'],
                  ui: ['view', 'create', 'edit', 'delete'].map(
                    (a) => `${f.replace(/\./g, '_')}:${a}`
                  ),
                },
                {
                  id: `${f.replace(/\./g, '_')}-read`,
                  name: 'Read',
                  includeIn: 'read',
                  savedObject: {
                    all: [],
                    read: [],
                  },
                  ui: [`${f.replace(/\./g, '_')}:view`],
                },
              ],
            },
          ],
        })
      ),
    });

    const router = core.http.createRouter();

    // Register a custom field formatter
    registerAnnotationsFieldFormatter(deps.fieldFormats, this.config);

    // Register server side APIs
    defineRoutes(this.logger, this.config, core, router);

    return {};
  }

  // @ts-ignore
  public start(core: CoreStart) {
    this.logger.debug('annotator: Started');
    return {};
  }

  public stop() {}
}
