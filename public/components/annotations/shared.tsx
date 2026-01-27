/**
 * Crown Copyright 2026, National Crime Agency
 *
 * Package for shared public Annotator components.
 *
 * @author d221155 (NCA)
 */

import {
  AnnotationConfigFlat,
  AnnotationType, ControlType,
  FieldValue,
  findAnnotationConfig,
  TagConfig,
  UpdateAnnotationType
} from "../../../common";
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiIcon,
  EuiMarkdownEditor,
  EuiRadioGroup,
  EuiRadioGroupOption,
  EuiSwitch
} from "@elastic/eui";
import {flattenValue} from "../../../common/config_utils";
import React, {ReactElement} from "react";

const cn = '[Annotations] (Shared): '

/**
 * Returns a list of `EuiComboBoxOptionOption`s for the given list of annotation configurations.
 * @param annotationConfigs List of annotation configurations
 * @param category (Optional) override for the parent category
 * @param color (Optional) override for the colour
 * @param iconType (Optional) override for the icon
 */
export function formatAnnotationConfigsToComboBoxOptions(
  annotationConfigs: TagConfig[], category?: string, color?: string, iconType?: string): EuiComboBoxOptionOption[] {
  // TODO: Ungroup when there is only a single group
  // TODO: Add support for mutually-exclusive tags, e.g. "Relevant" or "Not Relevant" (can't have both).  Perhaps use a switch control for these options
  const res = annotationConfigs.map((annotationConfig): EuiComboBoxOptionOption => {
    const _color = annotationConfig.color || color || 'default'
    const _iconType = annotationConfig.iconType || iconType || 'tag'
    return {
      label: annotationConfig.name,
      value: category || '',
      prepend: <EuiIcon size="s" type={_iconType}/>,
      color: _color,
      isGroupLabelOption: (annotationConfig.children && annotationConfig.children.length > 0),
      options: (annotationConfig.children && annotationConfig.children.length > 0) ?
        formatAnnotationConfigsToComboBoxOptions(
          // @ts-ignore
          annotationConfig.children, annotationConfig.name, color = _color, iconType = _iconType) : []
    }
  })
  console.debug(
    cn + 'formatAnnotationConfigsToComboBoxOptions: category="%s", color="%s", iconType="%s", res="%s"',
    category, color, iconType, res.map((v) => `${v.label}`).join(', ')
  )
  return res
}

/**
 * Returns a list of `<EuiRadioGroupOption>`s for the given list of annotation configurations.
 * @param annotationConfigs List of annotation configurations
 */
export function formatAnnotationConfigsToRadioGroupOptions(annotationConfigs: TagConfig[]): EuiRadioGroupOption[] {
  const res = annotationConfigs.flatMap((annotationConfig): EuiRadioGroupOption[] =>
    annotationConfig?.children?.map((c): EuiRadioGroupOption => ({id: c.name, label: c.name})) ?? []
  ) ?? []
  console.debug(cn + 'formatAnnotationConfigsToRadioGroupOptions: res=""', JSON.stringify(res))
  return res
}

/**
 * Returns the comment applied to the annotation (if provided).
 * @param annotations One or more annotations matching a name
 */
export function formatAnnotationsToText(annotations: AnnotationType[]): FieldValue {
  console.debug(cn + 'formatAnnotationsToText')
  return flattenValue(annotations[0]?.feature_comment)
}

/**
 * Returns the boolean value of the given annotation (if provided).
 * @param annotations One or more annotations matching a name
 */
export function formatAnnotationsToBoolean(annotations: AnnotationType[]): FieldValue {
  console.debug(cn + 'formatAnnotationsToBoolean')
  const fieldValue = flattenValue(annotations[0]?.feature_category)
  return fieldValue !== undefined
}

/**
 * Returns a radio group options ID for the given annotation (if provided).
 * @param annotations One or more annotations matching a name
 */
export function formatAnnotationsToRadioGroupOptionId(annotations: AnnotationType[]): FieldValue {
  console.debug(cn + 'formatAnnotationsToRadioGroupOptionId')
  return flattenValue(annotations[0]?.feature_name)
}

/**
 * Returns a list of `EuiComboBoxOptionOption`s for the given list of annotations (if provided).
 * @param annotations One or more annotations matching a name
 * @param configTags
 */
export function formatAnnotationsToComboBoxOptions(annotations: AnnotationType[], configTags: AnnotationConfigFlat[]): EuiComboBoxOptionOption[] {
  console.debug(cn + 'formatAnnotationsToComboBoxOptions')
  return annotations.map((annotation): EuiComboBoxOptionOption => {
    const annotationConfig = findAnnotationConfig(configTags, annotation.feature_category, annotation.feature_name)
    return {
      label: flattenValue(annotation.feature_name) || '',
      value: flattenValue(annotation.feature_category),
      color: annotationConfig?.color || 'default',
      prepend: <EuiIcon size="s" type={annotationConfig?.iconType || 'tag'}/>
    }
  })
}

/**
 * Formats annotations into a map of tag name -> value based on the plugin configuration.
 * @param annotations
 * @param tagConfigs
 * @param configTags
 * @returns List of formatted annotation values
 */
export function formatAnnotationsToFieldValues(annotations: AnnotationType[], tagConfigs: TagConfig[] | undefined, configTags: AnnotationConfigFlat[]): Map<string, FieldValue | FieldValue[]> {
  console.debug(cn + 'formatAnnotationsToFieldValues: annotations="%s"', JSON.stringify(annotations))
  return new Map(tagConfigs?.map(annotationConfig => {
    const filteredAnnotations = (annotations || []).filter(
      (t) => t.feature_category == annotationConfig.name
    )

    console.debug(
      cn + 'formatAnnotationsToFieldValues/tagConfigs.map: annotationConfig.name="%s", filteredAnnotations="[%s]"',
      annotationConfig.name,
      filteredAnnotations.map(
        ({feature_category, feature_name}) => `{${feature_category}: ${feature_name}}`).join(', ')
    )

    let fieldValue

    // Extract the annotation field value based on it's defined control type
    if (annotationConfig.controlType === 'text') {
      fieldValue = formatAnnotationsToText(filteredAnnotations)
    } else if (annotationConfig.controlType === 'switch') {
      fieldValue = formatAnnotationsToBoolean(filteredAnnotations)
    } else if (annotationConfig.controlType == 'radio') {
      fieldValue = formatAnnotationsToRadioGroupOptionId(filteredAnnotations)
    } else {
      fieldValue = formatAnnotationsToComboBoxOptions(filteredAnnotations, configTags)
    }

    console.debug(
      cn + 'formatAnnotationsToFieldValues/tagConfigs.map: annotationConfig.name="%s", fieldValue="%s"',
      annotationConfig.name, fieldValue instanceof String ? fieldValue : JSON.stringify(fieldValue)
    )

    return [annotationConfig.name, fieldValue]
  }))
}

/**
 * Formats a field value back into annotations based its matching configuration.
 * @param key
 * @param value
 * @param tagConfigs
 * @returns List of annotations
 */
export function formatFieldToAnnotations(key: string, value: FieldValue, tagConfigs: TagConfig[] | undefined): UpdateAnnotationType[] {
  const annotationConfig = tagConfigs?.find(t => t.name === key)
  console.debug(cn + 'formatFieldToAnnotations: key="%s", value="%s"', key, value)
  let res: UpdateAnnotationType[]

  if (value === undefined) {
    res = []
  } else if (annotationConfig?.controlType === 'text') {
    res = (value as string).length > 1 ? [{feature_category: key, feature_comment: (value as string)}] : []
  } else if (annotationConfig?.controlType === 'switch') {
    res = (value as boolean) ? [{feature_category: key}] : []
  } else if (annotationConfig?.controlType === 'radio') {
    res = [{feature_category: key, feature_name: (value as string)}]
  } else {
    res = (value as EuiComboBoxOptionOption[]).map(option => ({
      feature_category: option.value?.toString() || '', feature_name: option.label
    }))
  }

  console.debug(cn + 'formatFieldToAnnotations: res="%s"', JSON.stringify(res))
  return res
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
export function generateAnnotationControl(tagConfig: TagConfig, fieldIdPrefix: string, fieldValues: Map<string, FieldValue>, onFieldChange: CallableFunction): ReactElement {
  console.debug(
    cn + 'generateAnnotationControl: annotationConfig.name="%s", annotationConfig.controlType="%s"',
    tagConfig.name, tagConfig.controlType
  )

  switch (tagConfig.controlType as ControlType) {
    case ControlType.text:
      return <EuiMarkdownEditor
        key={`${fieldIdPrefix}_form_${tagConfig.name}_text`}
        placeholder="Add any comments here..."
        aria-label={`${tagConfig.name} editor`}
        value={(fieldValues.get(tagConfig.name) as string)}
        onChange={(v) => onFieldChange(tagConfig.name, v)}
        initialViewMode="viewing"
        markdownFormatProps={{textSize: 's'}}
      />
    case ControlType.switch:
      return <EuiSwitch
        key={`${fieldIdPrefix}_form_${tagConfig.name}_switch`}
        aria-label={tagConfig.name}
        label={tagConfig.name}
        showLabel={false}
        checked={(fieldValues.get(tagConfig.name) as boolean) ?? false}
        onChange={(e) => onFieldChange(tagConfig.name, e.target.checked)}
      />
    case ControlType.radio:
      // Deprecated - Use single instead
      return <EuiRadioGroup
        key={`${fieldIdPrefix}_form_${tagConfig.name}_radio`}
        aria-label={tagConfig.name}
        options={formatAnnotationConfigsToRadioGroupOptions([tagConfig])}
        idSelected={(fieldValues.get(tagConfig.name) as string)}
        onChange={(optionId) => onFieldChange(tagConfig.name, optionId)}
        data-test-subj="tagsRadioGroup"
      />
    default:
      return <EuiComboBox
        key={`${fieldIdPrefix}_form_${tagConfig.name}_combobox`}
        aria-label={tagConfig.name}
        options={formatAnnotationConfigsToComboBoxOptions([tagConfig])}
        selectedOptions={(fieldValues.get(tagConfig.name) as EuiComboBoxOptionOption[])}
        onChange={(v) => onFieldChange(tagConfig.name, v)}
        isClearable={true}
        singleSelection={tagConfig.controlType as ControlType === ControlType.single ? { asPlainText: true } : undefined}
        data-test-subj="tagsComboBox"
        placeholder="Select one tag"
      />
  }
}
