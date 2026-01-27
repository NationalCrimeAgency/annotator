/**
 * Crown Copyright 2025, National Crime Agency
 *
 * Package for plugin types on the UI side.
 *
 * @author d221155 (NCA)
 */

import { FieldFormatsSetup, FieldFormatsStart } from '@kbn/field-formats-plugin/public'
import type { UnifiedDocViewerSetup } from '@kbn/unified-doc-viewer-plugin/public'
import { FeaturesPluginSetup } from '@kbn/features-plugin/public'
import { IndexPatternFieldEditorSetup, IndexPatternFieldEditorStart } from "@kbn/data-view-field-editor-plugin/public"

export interface AnnotatorPluginSetup {
  // Registers the editor for custom Field Formatter
  dataViewFieldEditor: IndexPatternFieldEditorSetup

  // For registering the custom Field Formatter
  fieldFormats: FieldFormatsSetup

  // For access control
  features: FeaturesPluginSetup

  // Registers the additional tabs within the flyout
  unifiedDocViewer: UnifiedDocViewerSetup
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AnnotatorPluginStart {
  // For using the custom Field Formatter
  fieldFormats: FieldFormatsStart
  dataViewFieldEditor: IndexPatternFieldEditorStart
}

export interface AppPluginStartDependencies {

}
