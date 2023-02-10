const fs = require("fs");
const path = require("path");
const model = require("./applicationParameter.model");

module.exports = {
  model,
  modelName: "ApplicationParameter",
  typeDefs: fs.readFileSync(
    path.join(__dirname, "applicationParameter.graphql"),
    "utf-8"
  ),
};
