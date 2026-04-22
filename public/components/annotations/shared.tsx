/**
 * Crown Copyright 2026, National Crime Agency
 *
 * Package for shared public Annotator components.
 *
 * @author d221155 (NCA)
 */

import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiIcon,
  EuiMarkdownEditor,
  EuiRadioGroup,
  EuiRadioGroupOption,
  EuiSwitch,
} from '@elastic/eui';
import React, { ReactElement } from 'react';
import {
  AnnotationConfigFlat,
  AnnotationType,
  ControlType,
  FieldValue,
  findAnnotationConfig,
  TagConfig,
  UpdateAnnotationType,
} from '../../../common';
import { flattenValue } from '../../../common/config_utils';

/**
 * Returns a list of `EuiComboBoxOptionOption`s for the given list of annotation configurations.
 * @param annotationConfigs List of annotation configurations
 * @param category (Optional) override for the parent category
 * @param color (Optional) override for the colour
 * @param iconType (Optional) override for the icon
 */
export function formatAnnotationConfigsToComboBoxOptions(
  annotationConfigs: TagConfig[],
  category?: string,
  color?: string,
  iconType?: string
): EuiComboBoxOptionOption[] {
  // TODO: Ungroup when there is only a single group
  // TODO: Add support for mutually-exclusive tags, e.g. "Relevant" or "Not Relevant" (can't have both).  Perhaps use a switch control for these options
  return annotationConfigs.map((annotationConfig): EuiComboBoxOptionOption => {
    const _color = annotationConfig.color || color || 'default';
    const _iconType = annotationConfig.iconType || iconType || 'tag';
    return {
      label: annotationConfig.name,
      value: category || '',
      prepend: <EuiIcon size="s" type={_iconType} />,
      color: _color,
      isGroupLabelOption: annotationConfig.children && annotationConfig.children.length > 0,
      options:
        annotationConfig.children && annotationConfig.children.length > 0
          ? formatAnnotationConfigsToComboBoxOptions(
              // @ts-ignore
              annotationConfig.children,
              annotationConfig.name,
              (color = _color),
              (iconType = _iconType)
            )
          : [],
    };
  });
}

/**
 * Returns a list of `<EuiRadioGroupOption>`s for the given list of annotation configurations.
 * @param annotationConfigs List of annotation configurations
 */
export function formatAnnotationConfigsToRadioGroupOptions(
  annotationConfigs: TagConfig[]
): EuiRadioGroupOption[] {
  return (
    annotationConfigs.flatMap(
      (annotationConfig): EuiRadioGroupOption[] =>
        annotationConfig?.children?.map(
          (c): EuiRadioGroupOption => ({ id: c.name, label: c.name })
        ) ?? []
    ) ?? []
  );
}

/**
 * Returns the comment applied to the annotation (if provided).
 * @param annotations One or more annotations matching a name
 */
export function formatAnnotationsToText(annotations: AnnotationType[]): FieldValue {
  return flattenValue(annotations[0]?.feature_comment);
}

/**
 * Returns the boolean value of the given annotation (if provided).
 * @param annotations One or more annotations matching a name
 */
export function formatAnnotationsToBoolean(annotations: AnnotationType[]): FieldValue {
  const fieldValue = flattenValue(annotations[0]?.feature_category);
  return fieldValue !== undefined;
}

/**
 * Returns a radio group options ID for the given annotation (if provided).
 * @param annotations One or more annotations matching a name
 */
export function formatAnnotationsToRadioGroupOptionId(annotations: AnnotationType[]): FieldValue {
  return flattenValue(annotations[0]?.feature_name);
}

/**
 * Returns a list of `EuiComboBoxOptionOption`s for the given list of annotations (if provided).
 * @param annotations One or more annotations matching a name
 * @param configTags
 */
export function formatAnnotationsToComboBoxOptions(
  annotations: AnnotationType[],
  configTags: AnnotationConfigFlat[]
): EuiComboBoxOptionOption[] {
  return annotations.map((annotation): EuiComboBoxOptionOption => {
    const annotationConfig = findAnnotationConfig(
      configTags,
      flattenValue(annotation.feature_category) as string,
      flattenValue(annotation.feature_name) as string
    );
    return {
      label: flattenValue(annotation.feature_name) || '',
      value: flattenValue(annotation.feature_category),
      color: annotationConfig?.color || 'default',
      prepend: <EuiIcon size="s" type={annotationConfig?.iconType || 'tag'} />,
    };
  });
}

/**
 * Formats annotations into a map of tag name -> value based on the plugin configuration.
 * @param annotations
 * @param tagConfigs
 * @param configTags
 * @returns List of formatted annotation values
 */
export function formatAnnotationsToFieldValues(
  annotations: AnnotationType[],
  tagConfigs: TagConfig[] | undefined,
  configTags: AnnotationConfigFlat[]
): Map<string, FieldValue | FieldValue[]> {
  return new Map(
    tagConfigs?.map((annotationConfig) => {
      const filteredAnnotations = (annotations || []).filter(
        (t) => flattenValue(t.feature_category) === annotationConfig.name
      );

      let fieldValue;

      // Extract the annotation field value based on it's defined control type
      if (annotationConfig.controlType === 'text') {
        fieldValue = formatAnnotationsToText(filteredAnnotations);
      } else if (annotationConfig.controlType === 'switch') {
        fieldValue = formatAnnotationsToBoolean(filteredAnnotations);
      } else if (annotationConfig.controlType === 'radio') {
        fieldValue = formatAnnotationsToRadioGroupOptionId(filteredAnnotations);
      } else {
        fieldValue = formatAnnotationsToComboBoxOptions(filteredAnnotations, configTags);
      }

      return [annotationConfig.name, fieldValue];
    })
  );
}

/**
 * Formats a field value back into annotations based its matching configuration.
 * @param key
 * @param value
 * @param tagConfigs
 * @returns List of annotations
 */
export function formatFieldToAnnotations(
  key: string,
  value: FieldValue,
  tagConfigs: TagConfig[] | undefined
): UpdateAnnotationType[] {
  const annotationConfig = tagConfigs?.find((t) => t.name === key);
  let res: UpdateAnnotationType[];

  if (value === undefined) {
    res = [];
  } else if (annotationConfig?.controlType === 'text') {
    res =
      (value as string).length > 1
        ? [{ feature_category: key, feature_comment: value as string }]
        : [];
  } else if (annotationConfig?.controlType === 'switch') {
    res = (value as boolean) ? [{ feature_category: key }] : [];
  } else if (annotationConfig?.controlType === 'radio') {
    res = [{ feature_category: key, feature_name: value as string }];
  } else {
    res = (value as EuiComboBoxOptionOption[]).map((option) => ({
      feature_category: option.value?.toString() || '',
      feature_name: option.label,
    }));
  }

  return res;
}

/**
 * Generates input controls for manipulating an annotation based on the given configuration.
 *
 *  * `text`    -> `<EuiMarkdownEditor>`
 *  * `switch`  -> `<EuiSwitch>`
 *  * `radio`   -> `<EuiRadioGroup>`
 *  * default   -> `<EuiComboBox>`
 *
 * @param tagConfig
 * @param fieldIdPrefix
 * @param fieldValues
 * @param onFieldChange
 */
export function generateAnnotationControl(
  tagConfig: TagConfig,
  fieldIdPrefix: string,
  fieldValues: Map<string, FieldValue>,
  onFieldChange: CallableFunction
): ReactElement {
  switch (tagConfig.controlType as ControlType) {
    case ControlType.text:
      return (
        <EuiMarkdownEditor
          key={`${fieldIdPrefix}_form_${tagConfig.name}_text`}
          placeholder="Add any comments here..."
          aria-label={`${tagConfig.name} editor`}
          value={fieldValues.get(tagConfig.name) as string}
          onChange={(v) => onFieldChange(tagConfig.name, v)}
          initialViewMode="viewing"
          markdownFormatProps={{ textSize: 's' }}
        />
      );
    case ControlType.switch:
      return (
        <EuiSwitch
          key={`${fieldIdPrefix}_form_${tagConfig.name}_switch`}
          aria-label={tagConfig.name}
          label={tagConfig.name}
          showLabel={false}
          checked={(fieldValues.get(tagConfig.name) as boolean) ?? false}
          onChange={(e) => onFieldChange(tagConfig.name, e.target.checked)}
        />
      );
    case ControlType.radio:
      // Deprecated - Use single instead
      return (
        <EuiRadioGroup
          key={`${fieldIdPrefix}_form_${tagConfig.name}_radio`}
          aria-label={tagConfig.name}
          options={formatAnnotationConfigsToRadioGroupOptions([tagConfig])}
          idSelected={fieldValues.get(tagConfig.name) as string}
          onChange={(optionId) => onFieldChange(tagConfig.name, optionId)}
          data-test-subj="tagsRadioGroup"
        />
      );
    default:
      return (
        <EuiComboBox
          key={`${fieldIdPrefix}_form_${tagConfig.name}_combobox`}
          aria-label={tagConfig.name}
          options={formatAnnotationConfigsToComboBoxOptions([tagConfig])}
          selectedOptions={fieldValues.get(tagConfig.name) as EuiComboBoxOptionOption[]}
          onChange={(v) => onFieldChange(tagConfig.name, v)}
          isClearable={true}
          singleSelection={
            (tagConfig.controlType as ControlType) === ControlType.single
              ? { asPlainText: true }
              : undefined
          }
          data-test-subj="tagsComboBox"
          placeholder="Select one tag"
        />
      );
  }
}
