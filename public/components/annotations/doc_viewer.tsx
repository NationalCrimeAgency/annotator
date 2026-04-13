/**
 * Crown Copyright 2025, National Crime Agency
 *
 * Package for the annotator UI components.
 *
 * @author d221155 (NCA)
 */

import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { Fragment, SetStateAction, useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiDescriptionList,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { CoreSetup } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { Logger } from '@kbn/logging';
import {
  ANNOTATIONS_ROUTE_PATH,
  FieldValue,
  flattenAnnotationConfigs,
  PLUGIN_ID,
  TagConfig,
} from '../../../common';
import { AnnotatorPluginStart } from '../../types';
import {
  formatAnnotationsToFieldValues,
  formatFieldToAnnotations,
  generateAnnotationControl,
} from './shared';

/**
 * Props for the DocViewerAnnotations component.
 */
export interface DocViewerAnnotationsProps extends DocViewRenderProps {
  core: CoreSetup;
  field: string;
  logger: Logger;
  tagConfigs: TagConfig[] | undefined;
}

/**
 * React component for managing an annotation field on document via the unified-doc-viewer plugin used within Discover.
 * Controls are rendered within a tab (`DocView`) of the document flyout corresponding to the same field.
 *
 * @param hit Document which may contain existing annotations, and the target of any new annotations
 * @param core Kibana Core
 * @param field Name of the specific annotation field in scope
 * @param logger Kibana logger instance for debug/error logging
 * @param tagConfigs Annotator configuration corresponding to the `field` param
 * @constructor
 */
export const DocViewerAnnotations: React.FC<DocViewerAnnotationsProps> = ({
  hit,
  core,
  field,
  logger,
  tagConfigs,
}) => {
  const cn = '[DocViewerAnnotations] ';

  logger.debug(cn + `field="${field}", tagConfigs="${JSON.stringify(tagConfigs)}"`);

  const fieldIdPrefix = `annotations-${field}-${hit.raw._id}`;

  // Flattened annotation configurations for "tags"
  const configTags = flattenAnnotationConfigs(tagConfigs);

  // Replaces `.` with `_` within the annotation field name
  const escapedField = field.replace('.', '_');

  // Fetch the user's effective feature privileges
  const capabilities =
    useKibana<AnnotatorPluginStart>().services.application!.capabilities[PLUGIN_ID] ?? {};

  // True if the user has write privileges
  const writeAccess =
    capabilities[`${escapedField}:create`] || capabilities[`${escapedField}:edit`];

  // Reactive states for each control (representing a tag value) defined in the plugin configuration
  const [fieldValues, setFieldValues] = useState<Map<string, FieldValue>>(
    new Map<string, FieldValue>()
  );

  // Initialise controls for the tags based their current values (if any) within the current document in scope
  useEffect(
    () =>
      setFieldValues(
        formatAnnotationsToFieldValues(
          hit?.raw?.fields?.[field],
          tagConfigs,
          configTags
        ) as SetStateAction<Map<string, FieldValue>>
      ),
    [hit, field, tagConfigs, configTags, logger]
  );

  // Reactive hook to update controls states on change
  const onFieldChange = useCallback(
    (category: string, value: FieldValue) =>
      setFieldValues(new Map([...fieldValues, [category, value]])),
    [fieldValues]
  );

  // Call the server component of this plugin to persist any annotation changes on the document
  // @ts-ignore
  const saveChanges = useCallback(
    (e: { preventDefault: () => void }) => {
      e.preventDefault();

      // Pass a fully qualified location to the particular field being updated on the document
      const path = `${ANNOTATIONS_ROUTE_PATH}/${hit.raw._index}/${hit.raw._id}/${field}/tag`;

      // Extract the control states back into the expected format to be stored back on the document
      const annotations = Array.from(fieldValues.entries()).flatMap(([k, v]) =>
        formatFieldToAnnotations(k, v, tagConfigs)
      );

      logger.debug(cn + `saveChanges: annotations="${JSON.stringify(annotations)}", path=${path}`);

      // Call the server component
      core.http
        .post(path, {
          body: JSON.stringify({ partial: { annotations } }),
        })
        .then((response) => {
          logger.debug(
            cn + `saveChanges/post.then: Success, response="${JSON.stringify(response)}"`
          );
          core.notifications.toasts.addSuccess({ title: 'Success', text: 'Changes saved' });

          // "Click" the refresh button to update the data in the underlying Kibana `DataViewerTable` component
          const submitButton: HTMLButtonElement | null = document.querySelector(
            '[data-test-subj="querySubmitButton"]'
          );
          if (!submitButton) {
            core.notifications.toasts.addWarning({
              title: 'Save Changes: Unable to refresh view',
              text: 'Unable to find "querySubmitButton" button',
            });
          } else {
            // "Fake click" the refresh button to force the data table to re-render
            submitButton.click();
          }
        })
        .catch((err: Error) => {
          logger.error(cn + `saveChanges/post.catch: e="${JSON.stringify(err)}"`);
          core.notifications.toasts.addError(err, { title: 'Save Changes: Server Error' });
        });
    },
    [hit, fieldValues, field, tagConfigs, logger, core.http, core.notifications.toasts]
  );

  /**
   * Generates input controls for interacting with all annotations defined within the plugin configuration.
   */
  function generateAnnotationControls() {
    return (
      <Fragment>
        {tagConfigs !== undefined ? (
          tagConfigs?.map((annotationConfig) => (
            <EuiFormRow
              key={`${fieldIdPrefix}_form_${annotationConfig.name}`}
              label={annotationConfig.name}
            >
              {generateAnnotationControl(
                annotationConfig,
                fieldIdPrefix,
                fieldValues,
                onFieldChange
              )}
            </EuiFormRow>
          ))
        ) : (
          <EuiText>No tags have been configured</EuiText>
        )}
      </Fragment>
    );
  }

  return (
    <Fragment>
      <EuiSpacer size="m" />

      <EuiForm key={`${fieldIdPrefix}_form`} component="form">
        <EuiDescriptionList key={`${fieldIdPrefix}_form_controls`}>
          {generateAnnotationControls()}
        </EuiDescriptionList>

        <EuiSpacer size="m" />
        {writeAccess && (
          <EuiButton
            key={`${fieldIdPrefix}_form_save_button`}
            type="submit"
            fill
            onClick={saveChanges}
          >
            Save Changes
          </EuiButton>
        )}
      </EuiForm>
    </Fragment>
  );
};
