# Description

sftp-fs is intended to allow for easy implementation of a SFTP server where the server file system can be anything. You can implement a ordinary file system as is done in [FileSystem.js](../blob/master/impl/FileSystem.js). But for any other type of filesystem like backend you can just extend the [FileSystemInterface](../blob/master/lib/FileSystemInterface.js) class and do something cool.

# Technical stuff

Is built ontop of [ssh2](https://github.com/mscdex/ssh2) as most SSH stuff in node.js is. I have elected to use [yarn](https://yarnpkg.com/lang/en/) for this project but using [npm](https://www.npmjs.com/) will work just as well.

# Running tests
```bash
# Install dependencies
$ yarn
...

# Run eslint tests
$ yarn lint
...

# Run unit tests
$ yarn test
```

# Examples

## Starting the standard file serving SFTP server
```bash
# Install dependencies
$ yarn
...

# Start server (Note: Can take arguments, check the code)
# Default password is 'SuPerSeCrReT'
$ yarn server
...
```

## Implementing the [FileSystemInterface](../blob/master/lib/FileSystemInterface.js)
```js
"use strict";

const { FileSystemInterface, Server } = require("sftp-fs");

class MyFS extends FileSystemInterface {
    // TODO: Implement the methods that are needed
}

const keyFile = "id_rsa";
const port = 8022;
const server = new Server(new MyFS());

process.on("SIGINT", async () => {
    await server.stop();
    process.exit(128);
});



const run = async () => {
    server.on("client-connected", () => {
        console.log("Client connected!");
    });

    server.on("client-disconnected", () => {
        console.log("Client disconnected!");
    });

    server.on("error", (error) => {
        console.error(error);
    });

    await server.start(keyFile, port);
};

run();
```
