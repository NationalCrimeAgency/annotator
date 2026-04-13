/**
 * Crown Copyright 2025, National Crime Agency
 *
 * Field formatter registration for server plugin.
 *
 * @author d221155 (NCA)
 */

import { FieldFormatsSetup } from '@kbn/field-formats-plugin/server';
import { AnnotationsFieldFormatter, ConfigType } from '../common';

export function registerAnnotationsFieldFormatter(
  fieldFormats: FieldFormatsSetup,
  config: ConfigType
) {
  // Factory that returns the custom Field Formatter as a closure embedded with the plugin config
  fieldFormats.register(
    class AnnotationsFieldFormatterWithConfig extends AnnotationsFieldFormatter {
      getPluginConfig(): ConfigType {
        return config;
      }
    }
  );
}
