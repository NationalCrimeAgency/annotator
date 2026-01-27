/**
 * Crown Copyright 2025, National Crime Agency
 *
 * Package for common functionality related to annotations.
 *
 * @author d221155 (NCA)
 */

export const PLUGIN_ID = 'annotator';
export const PLUGIN_NAME = 'Annotator';
export const ANNOTATIONS_ROUTE_PATH = '/api/annotations';

export * from './types';
export {AnnotationsFieldFormatter} from './field_formatter';
export type { AnnotationsFieldFormatterParams } from './field_formatter';
export {
  findAnnotationConfig,
  flattenAnnotationConfigs,
  getTagConfigsForField
} from "./config_utils";

export function getFormattedCurrentTimestamp() {
    return new Intl.DateTimeFormat('en', {dateStyle: 'full', timeStyle: 'long'}).format(new Date())
}
