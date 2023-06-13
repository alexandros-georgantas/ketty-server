const { logger, pubsubManager } = require('@coko/server')

const {
  TEMPLATE_CREATED,
  TEMPLATE_DELETED,
  TEMPLATE_UPDATED,
} = require('./constants')

const {
  getTemplates,
  getTemplate,
  getSpecificTemplates,
  createTemplate,
  cloneTemplate,
  updateTemplate,
  deleteTemplate,
  updateTemplateCSSFile,
  getExportScripts,
} = require('../../../controllers/template.controller')

const exporter = require('../../../controllers/helpers/exporter')

const getTemplatesHandler = async (
  _,
  { ascending, sortKey, target, notes },
  ctx,
) => {
  try {
    logger.info('template resolver: use case getTemplates')
    return getTemplates(ascending, sortKey, target, notes)
  } catch (e) {
    throw new Error(e)
  }
}

const getTemplateHandler = async (_, { id }, ctx) => {
  logger.info('template resolver: use case getTemplate')
  return getTemplate(id)
}

const getSpecificTemplatesHandler = (_, { where }, ctx) => {
  try {
    const { target, trimSize } = where
    logger.info('template resolver: use case getSpecificTemplates')
    return getSpecificTemplates(target, trimSize)
  } catch (e) {
    throw new Error(e)
  }
}

const createTemplateHandler = async (_, { input }, ctx) => {
  try {
    const {
      name,
      author,
      files,
      target,
      trimSize,
      thumbnail,
      notes,
      exportScripts,
    } = input

    const pubsub = await pubsubManager.getPubsub()

    logger.info('template resolver: use case createTemplate')

    const newTemplate = await createTemplate(
      name,
      author,
      files,
      target,
      trimSize,
      thumbnail,
      notes,
      exportScripts,
    )

    pubsub.publish(TEMPLATE_CREATED, {
      templateCreated: newTemplate,
    })

    logger.info('New template created msg broadcasted')
    return newTemplate
  } catch (e) {
    throw new Error(e)
  }
}

const cloneTemplateHandler = async (_, { input }, ctx) => {
  try {
    logger.info('template resolver: use case cloneTemplate')
    const pubsub = await pubsubManager.getPubsub()
    const { id, bookId, name, cssFile, hashed } = input
    const newTemplate = await cloneTemplate(id, name, cssFile, hashed)

    pubsub.publish(TEMPLATE_CREATED, {
      templateCreated: updateTemplate,
    })
    logger.info('New template created msg broadcasted')

    return exporter(
      bookId,
      'preview',
      newTemplate.id,
      'pagedjs',
      undefined,
      newTemplate.notes,
      ctx,
    )
  } catch (e) {
    throw new Error(e)
  }
}

const updateTemplateHandler = async (_, { input }, ctx) => {
  try {
    logger.info('template resolver: use case updateTemplates')
    const pubsub = await pubsubManager.getPubsub()
    const updatedTemplate = await updateTemplate(input)

    pubsub.publish(TEMPLATE_UPDATED, {
      templateUpdated: updatedTemplate,
    })

    logger.info('Template updated msg broadcasted')

    return updatedTemplate
  } catch (e) {
    throw new Error(e)
  }
}

const deleteTemplateHandler = async (_, { id }, ctx) => {
  try {
    logger.info('template resolver: use case deleteTemplate')
    const pubsub = await pubsubManager.getPubsub()
    const deletedTemplate = await deleteTemplate(id)

    pubsub.publish(TEMPLATE_DELETED, {
      templateDeleted: deletedTemplate,
    })
    logger.info('Template deleted msg broadcasted')
    return id
  } catch (e) {
    throw new Error(e)
  }
}

const updateTemplateCSSFileHandler = async (_, { input }, ctx) => {
  try {
    logger.info('template resolver: use case updateTemplateCSSFile')
    const { id, data, hashed, bookId } = input

    const pubsub = await pubsubManager.getPubsub()
    const currentTemplate = await updateTemplateCSSFile(id, data, hashed)

    pubsub.publish(TEMPLATE_UPDATED, {
      templateUpdated: currentTemplate,
    })
    logger.info('Template updated msg broadcasted')

    return exporter(
      bookId,
      'preview',
      currentTemplate.id,
      'pagedjs',
      undefined,
      currentTemplate.notes,
      ctx,
    )
  } catch (e) {
    throw new Error(e)
  }
}

const getExportScriptsHandler = async (_, { scope }, ctx) => {
  try {
    logger.info('export script resolver: executing getExportScripts use case')
    return getExportScripts(scope)
  } catch (e) {
    throw new Error(e)
  }
}

module.exports = {
  Query: {
    getTemplates: getTemplatesHandler,
    getTemplate: getTemplateHandler,
    getSpecificTemplates: getSpecificTemplatesHandler,
    getExportScripts: getExportScriptsHandler,
  },
  Mutation: {
    createTemplate: createTemplateHandler,
    cloneTemplate: cloneTemplateHandler,
    updateTemplate: updateTemplateHandler,
    updateTemplateCSSFile: updateTemplateCSSFileHandler,
    deleteTemplate: deleteTemplateHandler,
  },
  Template: {
    async files(template, _, ctx) {
      const files = await template.getFiles()
      return files
    },
    async thumbnail(template, _, ctx) {
      const thumbnail = await template.getThumbnail()
      return thumbnail
    },
  },
  Subscription: {
    templateCreated: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(TEMPLATE_CREATED)
      },
    },
    templateDeleted: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(TEMPLATE_DELETED)
      },
    },
    templateUpdated: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub()
        return pubsub.asyncIterator(TEMPLATE_UPDATED)
      },
    },
  },
}
