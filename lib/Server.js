"use strict";

const assert = require("assert");
const fs = require("fs-extra");
const EventEmitter = require("events");
const ssh2 = require("ssh2");
const FileSystemInterface = require("./FileSystemInterface");
const Connection = require("./Connection");
const sftp = require("./sftp");

class Server extends EventEmitter {
    constructor(filesystem, opts = {}) {
        super();

        assert(filesystem instanceof FileSystemInterface, "filesystem must extend FileSystemInterface");

        this.opts = opts;
        this.fs = filesystem;
        this.server = null;
        this.connections = [];
    }

    async start(keyFile, port) {
        assert(!this.server, "Server already started");

        const key = await fs.readFile(keyFile);

        this.port = port;

        this.server = new ssh2.Server({
            hostKeys: [ key ],
            ...this.opts
        }, (client) => this.onClient(client));

        this.on("session-open", ({ connection, session }) => {
            session.on("sftp", (accept) => sftp(this.fs, connection, accept()));
        });

        return new Promise((resolve) => this.server.listen(this.port, resolve));
    }

    async stop() {
        this.removeAllListeners();

        for (const connection of this.connections) {
            await connection.close();
        }

        this.connections.length = 0;

        this.server && (await new Promise((resolve) => this.server.close(resolve)));
    }

    async destroyConnection(client) {
        const connection = this.getConnection(client);

        if (connection) {
            this.connections.splice(this.connections.indexOf(connection), 1);

            await connection.close();

            this.emit("client-disconnected", connection);
        }
    }

    createConnection(client) {
        const connection = new Connection(client);

        this.connections.push(connection);

        this.emit("client-connected", connection);

        return connection;
    }

    getConnection(client) {
        return this.connections.find((s) => s.client === client);
    }

    onClient(client) {
        client.session = {};

        client.on("error", (error) => this.onError(error));
        client.on("authentication", (ctx) => this.onAuthentication(client, ctx));
        client.on("end", () => this.onEnd(client));
        client.on("continue", () => this.onContinue(client));
        client.on("ready", () => this.onReady(client));
    }

    onError(error) {
        this.emit("error", error);
    }

    async onAuthentication(client, ctx) {
        try {
            const result = await this.fs.authenticate(client.session, ctx);

            // If current authentication method is not supported, an array of supported methods should be returned
            Array.isArray(result) && ctx.reject(result);

            ctx.accept();
        } catch (error) {
            ctx.reject();
        }
    }

    onEnd(client) {
        this.destroyConnection(client);
    }

    onContinue(client) {
        const connection = this.getConnection(client);

        connection && connection.canContinue();
    }

    onReady(client) {
        const connection = this.createConnection(client);

        client.on("session", (accept) => this.onSession(connection, accept()));
    }

    onSession(connection, session) {
        this.emit("session-open", { connection, session });
    }
}

module.exports = Server;
