const fs = require("fs");
const path = require("path");
const model = require("./book.model");

module.exports = {
  model,
  modelName: "Book",
  typeDefs: fs.readFileSync(path.join(__dirname, "book.graphql"), "utf-8"),
};
