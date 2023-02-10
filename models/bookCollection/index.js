const fs = require("fs");
const path = require("path");
const model = require("./bookCollection.model");

module.exports = {
  model,
  modelName: "BookCollection",
  typeDefs: fs.readFileSync(
    path.join(__dirname, "bookCollection.graphql"),
    "utf-8"
  ),
};
