"use strict";

const path = require("path");
const FileSystem = require("../impl/FileSystem");
const Server = require("../lib/Server");
const minimist = require("minimist");

const args = minimist(process.argv.slice(2));

const keyFile = args.key || path.join(__dirname, "keys", "id_rsa");
const username = args.username || process.env.USER;
const password = args.password || "SuPerSeCrReT";
const port = parseInt(args.port || 8022, 10);

const server = new Server(new FileSystem(username, password));

process.on("SIGINT", async () => {
    console.log("User requested exit, shutting down...");
    await server.stop();
    console.log("All connections closed, goodbye!");
});


const run = async () => {
    console.log(`Starting SFTP server on port ${port}`);
    console.log(` - Key file in use is: ${keyFile}`);
    console.log(` - Login username is: ${username}`);

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

    console.log("Server is ready!");
};

run();
