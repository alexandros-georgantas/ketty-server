const { logger, pubsubManager } = require('@coko/server')

const {
  TEMPLATE_CREATED,
  TEMPLATE_DELETED,
  TEMPLATE_UPDATED,
} = require('./consts')

const {
  useCaseGetTemplates,
  useCaseGetTemplate,
  useCaseCreateTemplate,
  useCaseCloneTemplate,
  useCaseUpdateTemplate,
  useCaseDeleteTemplate,
  useCaseUpdateTemplateCSSFile,
} = require('../useCases')

const exporter = require('../useCases/utils/exporter')

const getTemplates = async (_, { ascending, sortKey, target, notes }, ctx) => {
  try {
    logger.info('template resolver: use case getTemplates')
    return useCaseGetTemplates(ascending, sortKey, target, notes)
  } catch (e) {
    throw new Error(e)
  }
}

const getTemplate = async (_, { id }, ctx) => {
  logger.info('template resolver: use case getTemplate')
  return useCaseGetTemplate(id)
}

const createTemplate = async (_, { input }, ctx) => {
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

    const newTemplate = await useCaseCreateTemplate(
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

const cloneTemplate = async (_, { input }, ctx) => {
  try {
    logger.info('template resolver: use case cloneTemplate')
    const pubsub = await pubsubManager.getPubsub()
    const { id, bookId, name, cssFile, hashed } = input
    const newTemplate = await useCaseCloneTemplate(id, name, cssFile, hashed)

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

const updateTemplate = async (_, { input }, ctx) => {
  try {
    logger.info('template resolver: use case updateTemplates')
    const pubsub = await pubsubManager.getPubsub()
    const updatedTemplate = await useCaseUpdateTemplate(input)

    pubsub.publish(TEMPLATE_UPDATED, {
      templateUpdated: updatedTemplate,
    })

    logger.info('Template updated msg broadcasted')

    return updatedTemplate
  } catch (e) {
    throw new Error(e)
  }
}

const deleteTemplate = async (_, { id }, ctx) => {
  try {
    logger.info('template resolver: use case deleteTemplate')
    const pubsub = await pubsubManager.getPubsub()
    const deletedTemplate = await useCaseDeleteTemplate(id)

    pubsub.publish(TEMPLATE_DELETED, {
      templateDeleted: deletedTemplate,
    })
    logger.info('Template deleted msg broadcasted')
    return id
  } catch (e) {
    throw new Error(e)
  }
}

const updateTemplateCSSFile = async (_, { input }, ctx) => {
  try {
    logger.info('template resolver: use case updateTemplateCSSFile')
    const { id, data, hashed, bookId } = input
    const pubsub = await pubsubManager.getPubsub()
    const currentTemplate = await useCaseUpdateTemplateCSSFile(id, data, hashed)

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

module.exports = {
  Query: {
    getTemplates,
    getTemplate,
  },
  Mutation: {
    createTemplate,
    cloneTemplate,
    updateTemplate,
    updateTemplateCSSFile,
    deleteTemplate,
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
