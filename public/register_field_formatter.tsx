/**
 * Crown Copyright 2025, National Crime Agency
 *
 * Field formatter registration for public plugin.
 *
 * @author d221155 (NCA)
 */

import { FieldFormatsSetup } from '@kbn/field-formats-plugin/public';
import {
  FieldFormatEditorFactory,
  IndexPatternFieldEditorSetup,
} from '@kbn/data-view-field-editor-plugin/public';
import { Logger } from '@kbn/logging';
import { AnnotationsFieldFormatter, ConfigType } from '../common';
import { AnnotationsFieldFormatterEditor } from './components/annotations';

// Registers a custom Field Formatter for use within Data Views
export function registerAnnotationsFieldFormatter(
  fieldFormats: FieldFormatsSetup,
  indexPatternFieldEditor: IndexPatternFieldEditorSetup,
  config: ConfigType,
  logger: Logger
) {
  // Factory that returns the custom Field Formatter as a closure embedded with the plugin config
  fieldFormats.register([
    class AnnotationsFieldFormatterWithConfig extends AnnotationsFieldFormatter {
      getPluginConfig(): ConfigType {
        return config;
      }
      getLogger(): Logger {
        return logger;
      }
    },
  ]);

  // Factory that returns the editor for the custom Field Formatter
  const AnnotationsFieldFormatterEditorFactory = async () => AnnotationsFieldFormatterEditor;
  AnnotationsFieldFormatterEditorFactory.formatId = AnnotationsFieldFormatterEditor.formatId;
  indexPatternFieldEditor.fieldFormatEditors.register(
    AnnotationsFieldFormatterEditorFactory as FieldFormatEditorFactory
  );
}
