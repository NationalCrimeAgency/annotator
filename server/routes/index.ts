/**
 * Crown Copyright 2025, National Crime Agency
 *
 * Package for defining the server-side routes for this plugin.
 *
 * @author d221155 (NCA)
 */

import { CoreSetup, IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

import { AuthenticatedUser } from '@kbn/security-plugin/server';
import { AnnotatorPluginStart } from '..';
import {
  ANNOTATIONS_ROUTE_PATH,
  ConfigType,
  UpdateAnnotationHttpResponseOptions,
  updateAnnotations,
} from '../../common';

async function getCurrentUser(
  logger: Logger,
  core: CoreSetup<AnnotatorPluginStart>,
  request: KibanaRequest
): Promise<AuthenticatedUser> {
  logger.trace(`getCurrentUser: Start`);
  const [, pluginDeps] = await core.getStartServices();
  const security = pluginDeps.security;

  if (security == null) {
    const msg = `getCurrentUser: No security plugin was found`;
    logger.error(msg);
    throw new Error(msg);
  }

  const currentUser = security.authc.getCurrentUser(request);

  if (currentUser == null) {
    const msg = `getCurrentUser: No current user was found`;
    logger.error(msg);
    throw new Error(msg);
  }

  if (logger.isLevelEnabled('debug')) {
    logger.debug(`getCurrentUser: currentUser="${JSON.stringify(currentUser)}"`);
  }

  logger.trace(`getCurrentUser: End`);
  return currentUser;
}

/**
 * Registers routes for handling annotation changes.
 *
 * All requests are made as the current user.
 *
 * @param logger
 * @param config
 * @param core
 * @param router
 */
export function defineRoutes(
  logger: Logger,
  config: ConfigType,
  core: CoreSetup<AnnotatorPluginStart>,
  router: IRouter
) {
  // TODO: Also store annotations outside of ES, e.g. DynamoDB
  // TODO: Consider emitting events on annotation changes

  const path = `${ANNOTATIONS_ROUTE_PATH}/{index}/{id}/{field}/{annotation_type}`;
  // noinspection TypeScriptValidateJSTypes
  const validateUpdateRequest = {
    params: schema.object({
      id: schema.string(), // Document ID
      index: schema.string(), // Index name
      field: schema.string(), // Field name
      annotation_type: schema.string({ defaultValue: 'tag' }), // Type, e.g. "tag", "entity", "object"
    }),
    body: schema.object({
      partial: updateAnnotations.schema,
    }),
  };

  logger.debug(`defineRoutes: path="${path}"`);

  // Update
  logger.debug(`defineRoutes: Creating route for POST`);
  router.post(
    {
      path,
      validate: validateUpdateRequest,
      options: {
        tags: ['annotations:update'],
      },
    },
    async (context, request, response) => {
      logger.debug(
        `update: index="${request.params.index}", field="${request.params.field}", id="${request.params.id}", annotation_type="${request.params.annotation_type}"`
      );

      const annotationConfig = config.annotations.find((a) => a.field === request.params.field);

      // TODO: If the fields exists, assert the user has the correct privileges

      if (!annotationConfig) {
        return response.notFound({
          body: `No matching annotation config was found, field="${request.params.field}"`,
        });
      }

      logger.debug(`update: Creating Elasticsearch client`);
      const client = (await context.core).elasticsearch.client;

      // Get the current annotations (of the same type)
      logger.debug(`update: Getting current document`);
      const currentDoc = await client.asCurrentUser.get({
        index: request.params.index,
        id: request.params.id,
      });

      logger.debug(`update: Extracting annotations from current document`);
      const currentAnnotations = currentDoc?.fields?.[request.params.field];

      logger.debug(`update: Getting current user`);
      const currentUser = await getCurrentUser(logger, core, request).then((user) => {
        return user.username;
      });

      if (!currentAnnotations) {
        logger.debug(`update: No existing annotations found`);
        // All annotations within the request will be assigned to a new annotations field
        const annotations = request.body.partial.annotations.map((a) => ({
          source_type: 'human', // A Kibana user is always assumed to be an author
          source_name: 'annotator',
          created_timestamp: new Date().toISOString(),
          created_username: currentUser,
          feature_category: a.feature_category,
          feature_name: a.feature_name,
          feature_comment: a.feature_comment,
        }));
        logger.debug(`update: annotations="${JSON.stringify(annotations)}"`);

        // @ts-ignore
        await client.asCurrentUser.update({
          index: request.params.index,
          id: request.params.id,
          refresh: 'wait_for',
          script: {
            source: `ctx._source['${request.params.field}'] = params.annotations`,
            lang: 'painless',
            params: {
              annotations,
            },
          },
        });
      } else {
        logger.debug(`update: Merging with existing annotations`);
        // For every annotation (of the same type), determine which are to be added or removed
        // TODO: Add annotation using a scripted update
      }

      const responsePayload: UpdateAnnotationHttpResponseOptions = {
        headers: { 'content-type': 'application/json' },
        body: { action: 'UPDATED' },
      };

      logger.info(`action="UPDATED"`);
      return response?.ok(responsePayload);
    }
  );
}
