"use strict";

const errors = require("./lib/errors");

module.exports = {
    Server: require("./lib/Server"),
    FileSystemInterface: require("./lib/FileSystemInterface"),
    ...errors
};
