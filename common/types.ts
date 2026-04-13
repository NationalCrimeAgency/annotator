/**
 * Crown Copyright 2025, National Crime Agency
 *
 * Package for types related to annotations.
 *
 * @author d221155 (NCA)
 */

import { EuiComboBoxOptionOption, EuiRadioGroupOption, EuiSelectableOption } from '@elastic/eui';
import { schema, TypeOf } from '@kbn/config-schema';

/**
 * Available control types for fields, affecting the UI component and therefore user-interaction style for a control.
 */
export enum ControlType {
  text = 'text',
  switch = 'switch',
  radio = 'radio',
  multiple = 'multiple',
  single = 'single',
}

// noinspection TypeScriptValidateJSTypes
export const updateAnnotationsHttpResponseOptions = {
  schema: schema.object({
    headers: schema.object({ 'content-type': schema.string({ defaultValue: 'application/json' }) }),
    body: schema.object({
      action: schema.string(),
      // annotations: schema.arrayOf(annotation.schema)
    }),
  }),
};
export type UpdateAnnotationHttpResponseOptions = TypeOf<
  typeof updateAnnotationsHttpResponseOptions.schema
>;

// noinspection TypeScriptValidateJSTypes
export const updateAnnotationsResponse = {
  schema: schema.object({
    action: schema.string(),
    // annotations: schema.arrayOf(annotation.schema)
  }),
};
export type UpdateAnnotationsResponseType = TypeOf<typeof updateAnnotationsResponse.schema>;

// noinspection TypeScriptValidateJSTypes
export const annotationConfigTag = {
  schema: schema.object({
    name: schema.string(),
    comment_required: schema.boolean({ defaultValue: false }),
  }),
};
export type AnnotationConfigTag = TypeOf<typeof annotationConfigTag.schema>;

/**
 * Flattened annotations configuration.
 */
export interface AnnotationConfigFlat extends Omit<TagConfig, 'children' | 'name'> {
  categoryName: string;
  featureName: string | undefined;
}

// noinspection TypeScriptValidateJSTypes
export const tagConfig = {
  schema: schema.object({
    name: schema.string(),
    controlType: schema.string({ defaultValue: 'single' }),
    color: schema.maybe(schema.string()),
    iconType: schema.maybe(schema.string()),
    comment_required: schema.boolean({ defaultValue: false }),
    children: schema.maybe(schema.arrayOf(annotationConfigTag.schema)),
  }),
};
export type TagConfig = TypeOf<typeof tagConfig.schema>;

// noinspection TypeScriptValidateJSTypes
export const docViewConfig = {
  schema: schema.object({
    id: schema.maybe(schema.string()),
    title: schema.string({ defaultValue: 'Annotations' }),
    order: schema.number({ defaultValue: 1 }),
    fields: schema.arrayOf(schema.string(), { defaultValue: [] }),
  }),
};
export type DocViewConfig = TypeOf<typeof docViewConfig.schema>;

// noinspection TypeScriptValidateJSTypes
export const annotationConfig = {
  schema: schema.object({
    field: schema.string({ defaultValue: 'metadata.annotations' }),
    tags: schema.arrayOf(tagConfig.schema, { defaultValue: [] }),
  }),
};
export type Annotation = TypeOf<typeof annotationConfig.schema>;

// noinspection TypeScriptValidateJSTypes
export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  debug: schema.boolean({ defaultValue: schema.contextRef('dev') }), // Enabled by default in Dev mode
  docViews: schema.arrayOf(docViewConfig.schema, { defaultValue: [] }),
  annotations: schema.arrayOf(annotationConfig.schema, { defaultValue: [] }),
});
export type ConfigType = TypeOf<typeof configSchema>;
// noinspection TypeScriptValidateJSTypes
export const updateAnnotation = {
  schema: schema.object({
    feature_category: schema.string(),
    feature_name: schema.maybe(schema.string()),
    feature_comment: schema.maybe(schema.string()),
  }),
};
export type UpdateAnnotationType = TypeOf<typeof updateAnnotation.schema>;
// noinspection TypeScriptValidateJSTypes
export const updateAnnotations = {
  schema: schema.object({
    annotations: schema.arrayOf(updateAnnotation.schema),
  }),
};
export type UpdateAnnotationsType = TypeOf<typeof updateAnnotations.schema>;
// noinspection TypeScriptValidateJSTypes
export const annotation = {
  schema: schema.object({
    source_type: schema.string(),
    source_name: schema.maybe(schema.string({ defaultValue: 'annotator' })),
    created_timestamp: schema.string(),
    created_username: schema.string(),
    feature_category: schema.string(),
    feature_name: schema.maybe(schema.string()),
    feature_comment: schema.maybe(schema.string()),
  }),
};
export type AnnotationType = TypeOf<typeof annotation.schema>;
export type FieldValue =
  | string
  | EuiComboBoxOptionOption[]
  | EuiRadioGroupOption
  | EuiSelectableOption[]
  | boolean
  | undefined;
