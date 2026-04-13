/**
 * Crown Copyright 2025, National Crime Agency
 *
 * Package for plugin types on the server-side.
 *
 * @author d221155 (NCA)
 */

import { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { FieldFormatsSetup, FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';

export interface AnnotatorPluginSetup {
  // For registering the custom Field Formatter
  fieldFormats: FieldFormatsSetup;

  // For the security context
  security: SecurityPluginSetup;

  // For access control
  features: FeaturesPluginSetup;
}

export interface AnnotatorPluginStart {
  // For using the custom Field Formatter
  fieldFormats: FieldFormatsStart;

  // For using the security context
  security: SecurityPluginStart;
}
