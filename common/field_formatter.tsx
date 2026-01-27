/**
 * Crown Copyright 2025, National Crime Agency
 *
 * Package for a custom field formatter for annotations.
 *
 * @author d221155 (NCA)
 */

import {KBN_FIELD_TYPES} from '@kbn/field-types'
import {FieldFormat} from '@kbn/field-formats-plugin/common'
import {
  FieldFormatParams,
  HtmlContextTypeConvert,
  HtmlContextTypeOptions,
  TextContextTypeConvert
} from "@kbn/field-formats-plugin/common/types"
import {EuiBadge, EuiProvider, setEuiDevProviderWarning} from '@elastic/eui'
import React, {Fragment} from 'react'
import ReactDOM from 'react-dom/server'
import {AnnotationConfigFlat, AnnotationType, ConfigType} from "./types";
import {
  findAnnotationConfig,
  flattenAnnotationConfigs,
  getTagConfigsForField
} from "./config_utils";

setEuiDevProviderWarning('log')

/**
 * Renders Annotations as HTML components by creating server-side EUI components rendered into HTML strings.
 * @param annotations
 * @param flattenedTagConfigs
 */
function formatAnnotationsToBadges(annotations: AnnotationType[], flattenedTagConfigs: AnnotationConfigFlat[]): string {
  function generateBadge(annotation: AnnotationType) {

    const tagConfig = findAnnotationConfig(flattenedTagConfigs, annotation.feature_category, annotation.feature_name)

    return (
      <EuiBadge key={`annotation_badge_${annotation.feature_name ?? annotation.feature_category}`}
                color={tagConfig?.color ?? 'default'}
                iconType={tagConfig?.iconType ?? 'tag'}>
        {annotation.feature_name ?? annotation.feature_category}
      </EuiBadge>
    )
  }

  return ReactDOM.renderToString(
    <EuiProvider>{annotations.map((annotation) => (
      'feature_name' in annotation ? generateBadge(annotation): annotation.feature_category
    ))}</EuiProvider>
  );
}

export interface AnnotationsFieldFormatterParams extends FieldFormatParams {
  fieldName: string
}

export class AnnotationsFieldFormatter extends FieldFormat {
  static id = 'annotations';
  static title = 'Annotations';
  static fieldType = [
    KBN_FIELD_TYPES.STRING,
    KBN_FIELD_TYPES.UNKNOWN
  ];

  getParamDefaults(): AnnotationsFieldFormatterParams {
    return {
      fieldName: 'metadata.annotations',
    };
  }

  getPluginConfig(): ConfigType | undefined {
    return undefined
  }

  isDebugEnabled(): boolean {
    return this.getPluginConfig()?.debug || false;
  }

  textConvert: TextContextTypeConvert =
    (value: string | AnnotationType) => {
      const fieldName = this.param('fieldName');
      if (this.isDebugEnabled())
        console.debug('[AnnotationsFormat] textConvert: fieldName="%s", value="%s"', fieldName, value);
      const annotation = (typeof value === 'string') ? JSON.parse(value) : value;
      return JSON.stringify(annotation);
    }

  htmlConvert: HtmlContextTypeConvert =
    (value: string | AnnotationType, options: HtmlContextTypeOptions | undefined = {}) => {
      const fieldName = this.param('fieldName');
      if (this.isDebugEnabled())
        console.debug('[AnnotationsFormat] htmlConvert: fieldName="%s", value="%s", options="%s"',
          fieldName, value, JSON.stringify(options));

      // Find and flatten the TagConfigs for the field specified when the formatter was configured on the Data View
      const flattenedTagConfigs = flattenAnnotationConfigs(getTagConfigsForField(fieldName, this.getPluginConfig()))

      try {
        if (typeof value === 'string') {
          console.debug(`[AnnotationsFormat] value is a string`)
          return formatAnnotationsToBadges(!['[]', ']'].includes(value) ? JSON.parse(value) : [], flattenedTagConfigs);
        } else {
          console.debug(`[AnnotationsFormat] value is an object`)
          return formatAnnotationsToBadges([value], flattenedTagConfigs);
        }
      } catch (e) {
        console.error(`[AnnotationsFormat] error parsing "${value}" error: ${e}`);
        return ReactDOM.renderToStaticMarkup(
          <Fragment/>
        );
      }
    }
}
