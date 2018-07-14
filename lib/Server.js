"use strict";

const assert = require("assert");
const fs = require("fs-extra");
const EventEmitter = require("events");
const ssh2 = require("ssh2");
const FileSystemInterface = require("./FileSystemInterface");
const Connection = require("./Connection");

class Server extends EventEmitter {
    constructor(filesystem) {
        super();

        assert(filesystem instanceof FileSystemInterface, "filesystem must extend FileSystemInterface");

        this.fs = filesystem;
        this.server = null;
        this.connections = [];
    }

    async start(keyFile, port) {
        assert(!this.server, "Server already started");

        const key = await fs.readFile(keyFile);

        this.port = port;

        this.server = new ssh2.Server({
            hostKeys: [ key ]
        }, (client) => this.onClient(client));

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
        session.on("sftp", (accept) => this.onStream(connection, accept()));
    }

    onStream(connection, stream) {
        connection.addStream(stream);

        connection.addAction("open", async (requestId, pathname, flags, attrs) => {
            const handle = connection.createFileHandle(pathname);
            await this.fs.open(connection.client.session, handle, flags, attrs);

            return () => stream.handle(requestId, handle.id.encoded);
        });

        connection.addAction("write", async (requestId, handleId, offset, data) => {
            const handle = connection.getHandle(handleId);
            await this.fs.write(connection.client.session, handle, offset, data);
        });

        connection.addAction("read", async (requestId, handleId, offset, length) => {
            const handle = connection.getHandle(handleId);
            const data = await this.fs.read(connection.client.session, handle, offset, length);

            if (data) {
                return () => stream.data(requestId, data);
            }

            return ssh2.SFTP_STATUS_CODE.EOF;
        });

        connection.addAction("fstat", async (requestId, handleId) => {
            const handle = connection.getHandle(handleId);
            const attrs = await this.fs.stat(connection.client.session, handle.pathname);

            stream.attrs(requestId, attrs);

            return () => true; // TODO: continue on return false?
        });

        connection.addAction("fsetstat", async (requestId, handleId, attrs) => {
            const handle = connection.getHandle(handleId);
            await this.fs.setstat(connection.client.session, handle.pathname, attrs);
        });

        connection.addAction("close", async (requestId, handleId) => {
            await connection.destroyHandle(handleId);
        });

        connection.addAction("opendir", async (requestId, pathname) => {
            const handle = connection.createDirectoryHandle(pathname);
            await this.fs.opendir(connection.client.session, handle, pathname);

            return () => stream.handle(requestId, handle.id.encoded);
        });

        connection.addAction("readdir", async (requestId, handleId) => {
            const handle = connection.getHandle(handleId);
            const names = await this.fs.listdir(connection.client.session, handle);

            if (names) {
                return () => stream.name(requestId, names);
            }

            return ssh2.SFTP_STATUS_CODE.EOF;
        });

        connection.addAction("lstat", async (requestId, pathname) => {
            const attrs = await this.fs.lstat(connection.client.session, pathname);

            stream.attrs(requestId, attrs);

            return () => true; // TODO: continue on return false?
        });

        connection.addAction("stat", async (requestId, pathname) => {
            const attrs = await this.fs.stat(connection.client.session, pathname);

            stream.attrs(requestId, attrs);

            return () => true; // TODO: continue on return false?
        });

        connection.addAction("remove", async (requestId, pathname) => {
            await this.fs.remove(connection.client.session, pathname);
        });

        connection.addAction("rmdir", async (requestId, pathname) => {
            await this.fs.rmdir(connection.client.session, pathname);
        });

        connection.addAction("realpath", async (requestId, pathname) => {
            const filename = await this.fs.realpath(connection.client.session, pathname);

            return () => stream.name(requestId, [ { filename } ]);
        });

        connection.addAction("readlink", async (requestId, pathname) => {
            const filename = await this.fs.readlink(connection.client.session, pathname);

            return () => stream.name(requestId, [ { filename } ]);
        });

        connection.addAction("setstat", async (requestId, pathname, attrs) => {
            await this.fs.setstat(connection.client.session, pathname, attrs);
        });

        connection.addAction("mkdir", async (requestId, pathname, attrs) => {
            await this.fs.mkdir(connection.client.session, pathname, attrs);
        });

        connection.addAction("rename", async (requestId, oldPathname, newPathname) => {
            await this.fs.rename(connection.client.session, oldPathname, newPathname);
        });

        connection.addAction("symlink", async (requestId, linkPathname, targetPathname) => {
            await this.fs.symlink(connection.client.session, targetPathname, linkPathname);
        });
    }
}

module.exports = Server;
