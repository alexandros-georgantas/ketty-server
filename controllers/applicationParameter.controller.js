const { logger, useTransaction } = require("@coko/server");
const ApplicationParameter = require("../models/applicationParameter/applicationParameter.model");

const getApplicationParameters = async (context, area, options = {}) => {
  try {
    const { trx } = options;
    return useTransaction(
      async (tr) => {
        if (context && area) {
          logger.info(
            `>>> fetching application parameters for ${context} - ${area}`
          );

          const ap = await ApplicationParameter.query(tr)
            .skipUndefined()
            .where({ context, area });

          return ap[0];
        }

        logger.info(`>>> fetching application parameters`);
        return ApplicationParameter.query(tr)
          .skipUndefined()
          .where({ context, area });
      },
      { trx, passedTrxOnly: true }
    );
  } catch (e) {
    throw new Error(e);
  }
};

const updateApplicationParameters = async (
  context,
  area,
  config,
  options = {}
) => {
  try {
    const { trx } = options;
    return useTransaction(
      async (tr) => {
        logger.info(
          `>>> updating application parameters for ${context} - ${area}`
        );

        const applicationParameter = await ApplicationParameter.query(tr).where(
          {
            context,
            area,
          }
        );

        if (applicationParameter.length !== 1) {
          throw new Error(
            "multiple records for the same application parameters context and area"
          );
        }

        const { id } = applicationParameter[0];

        return ApplicationParameter.query(tr).patchAndFetchById(id, {
          config,
        });
      },
      { trx }
    );
  } catch (e) {
    throw new Error(e);
  }
};

module.exports = {
  getApplicationParameters,
  updateApplicationParameters,
};
