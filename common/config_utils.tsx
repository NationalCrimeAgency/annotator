/**
 * Crown Copyright 2026, National Crime Agency
 *
 * Package for the annotator UI components.
 *
 * @author d221155 (NCA)
 */

import {AnnotationConfigFlat, ConfigType, TagConfig} from "./types";

/**
 * If the value is an array of strings, it will be flattened into a single string,
 * otherwise, the value is just returned.
 * @param value
 * @return
 */
export function flattenValue<T>(value: T): string | T {
  if (Array.isArray(value) && (value.length > 0) && typeof value[0] === 'string') {
    return value.join(', ')
  } else {
    return value
  }
}

/**
 * Flattens the annotation configuration for ease of use.
 * @param annotationConfigs List of `TagConfig`s
 * @return: Flattened version of the given list of `TagConfig`s or an empty list (if `TagConfig` was undefined or empty)
 */
export function flattenAnnotationConfigs(annotationConfigs: TagConfig[] | undefined): AnnotationConfigFlat[] {
  return annotationConfigs?.flatMap(
    ({children, name: t_name, ...t}) => (
      (children || []).map(({name: c_name, ...c}) => {
        return {categoryName: t_name, featureName: c_name, ...t, ...c}
      }))) || []
}

/**
 * Returns the list of `TagConfig`s defined the given field name.
 * @param field
 * @param config
 * @return List of `TagConfig`s or an empty list
 */
export function getTagConfigsForField(field: string, config: ConfigType | undefined) {
  if (config !== undefined) {
    return config?.annotations?.find(ac => ac.field == field)?.tags ?? []
  } else {
    return undefined
  }
}

/**
 * Returns the first matching (flattened) AnnotationConfig.
 * @param flattenedTagConfigs
 * @param feature_category
 * @param feature_name
 * @returns If matched, returns a flattened AnnotationConfig
 */
export function findAnnotationConfig(flattenedTagConfigs: AnnotationConfigFlat[], feature_category: string, feature_name?: string | undefined) {
  return flattenedTagConfigs.find((t) => (t.categoryName == feature_category) &&
    ((feature_name == undefined) || (t.featureName == feature_name))
  )
}
