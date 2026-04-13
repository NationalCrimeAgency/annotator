/**
 * Crown Copyright 2025, National Crime Agency
 *
 * Package for initialising the UI-side of this plugin.
 *
 * @author d221155 (NCA)
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React from 'react';
import { EuiDelayRender, EuiSkeletonText } from '@elastic/eui';
import { Logger } from '@kbn/logging';
import { getTagConfigsForField } from '../common';
import { ConfigType, DocViewConfig, PLUGIN_ID } from '../common';
import { AnnotatorPluginSetup, AnnotatorPluginStart } from './types';
import { registerAnnotationsFieldFormatter } from './register_field_formatter';

// Lazily initialises the plugin components
const AnnotationsDocViewer = React.lazy(() => import('./components/annotations'));

/**
 * Annotator plugin (UI-side).
 */
// noinspection TypeScriptValidateJSTypes
export class AnnotatorPlugin
  implements Plugin<unknown, unknown, AnnotatorPluginSetup, AnnotatorPluginStart>
{
  private readonly cn = '[AnnotatorPlugin] ';
  private readonly config: ConfigType;
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    // Get the plugin config (as defined the standard Kibana config)
    this.config = initializerContext.config.get<ConfigType>();
    this.logger = initializerContext.logger.get();

    if (this.config.debug)
      this.logger.debug(this.cn + `constructor: config="${JSON.stringify(this.config)}"`);
  }

  /**
   * Returns true if at least one annotation field has been configured and is accessible to the current user.
   * @param docViewConfig
   * @param capabilities
   * @private
   */
  private shouldShowFlyout(
    docViewConfig: DocViewConfig,
    capabilities: Record<string, boolean | Record<string, boolean>>
  ): boolean {
    return (
      docViewConfig.fields
        .map((f) => f.replace(/\./g, '_'))
        .filter((f) => capabilities[`${f}:view`]).length > 0
    );
  }

  /**
   * Lifecycle hook, invoked by Kibana during startup.
   *
   * Registers the custom Field Formatter and tabs into the Discover flyout.
   * @param core
   * @param deps
   */
  public async setup(core: CoreSetup<AnnotatorPluginStart>, deps: AnnotatorPluginSetup) {
    const config = this.config;

    // Register a custom field formatter
    this.logger.debug(this.cn + `setup: Adding custom field formatter`);
    registerAnnotationsFieldFormatter(
      deps.fieldFormats,
      deps.dataViewFieldEditor,
      this.config,
      this.logger
    );

    // Fetch the user's effective feature privileges
    const [coreStart] = await core.getStartServices();
    const capabilities: Record<string, boolean | Record<string, boolean>> =
      coreStart.application.capabilities[PLUGIN_ID] ?? {};

    // Pre-filter the `DocViewConfig`s to only those which the user has access
    config.docViews
      .filter((docViewConfig) => this.shouldShowFlyout(docViewConfig, capabilities))
      .map((docView) => {
        // Add the `DocView` to the `UnifiedDocViewer` (this will appear as another tab within the Discover view flyout)
        this.logger.debug(
          this.cn + `setup/config.docViews.map: Adding DocView, title="${docView.title}"`
        );
        deps.unifiedDocViewer.registry.add({
          // Use the defined ID (if provided) or generate one based on the title
          id: docView.id || docView.title.toLowerCase().replace(' ', '_'),
          title: docView.title,
          order: docView.order,
          component: (props: DocViewRenderProps) => {
            return (
              <React.Suspense
                fallback={
                  <EuiDelayRender delay={300}>
                    <EuiSkeletonText />
                  </EuiDelayRender>
                }
              >
                {docView.fields.map((f) => (
                  <AnnotationsDocViewer
                    {...props}
                    core={core}
                    field={f}
                    logger={this.logger}
                    tagConfigs={getTagConfigsForField(f, config)}
                  />
                ))}
              </React.Suspense>
            );
          },
        });
      });
  }

  /**
   * Lifecycle hook, invoked by Kibana during page load.
   *
   * @param core
   * @param deps
   */
  public start(core: CoreStart, deps: AnnotatorPluginStart) {
    return {};
  }

  /**
   * Lifecycle hook, invoked by Kibana during shutdown.
   */
  public stop() {}
}
