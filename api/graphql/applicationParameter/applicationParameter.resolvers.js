const { logger } = require("@coko/server");
const { pubsubManager } = require("@coko/server");

const { UPDATE_APPLICATION_PARAMETERS } = require("./constants");

const {
  getApplicationParameters,
  updateApplicationParameters,
} = require("../../../controllers/applicationParameter.controller");

const getApplicationParametersHandler = async (_, args, ctx) => {
  try {
    const { context, area } = args;
    logger.info(
      "application parameters resolver: executing getApplicationParameters use case"
    );

    return getApplicationParameters(context, area);
  } catch (e) {
    throw new Error(e);
  }
};

const updateApplicationParametersHandler = async (_, { input }, ctx) => {
  try {
    const { context, area, config } = input;
    const pubsub = await pubsubManager.getPubsub();

    logger.info(
      "application parameters resolver: executing updateApplicationParameters use case"
    );

    const updatedApplicationParameters = await updateApplicationParameters(
      context,
      area,
      config
    );

    logger.info(
      "application parameters resolver: broadcasting updated application parameters to clients"
    );

    pubsub.publish(UPDATE_APPLICATION_PARAMETERS, {
      updateApplicationParameters: updatedApplicationParameters,
    });

    return updatedApplicationParameters;
  } catch (e) {
    throw new Error(e);
  }
};

module.exports = {
  Query: {
    getApplicationParameters: getApplicationParametersHandler,
  },
  Mutation: {
    updateApplicationParameters: updateApplicationParametersHandler,
  },
  Subscription: {
    updateApplicationParameters: {
      subscribe: async () => {
        const pubsub = await pubsubManager.getPubsub();
        return pubsub.asyncIterator(UPDATE_APPLICATION_PARAMETERS);
      },
    },
  },
};
