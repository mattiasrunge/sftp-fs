"use strict";

const assert = require("assert");
const util = require("util");
const fs = require("fs");
const EventEmitter = require("events");
const ssh2 = require("ssh2");
const FileSystemInterface = require("./FileSystemInterface");
const Connection = require("./Connection");

const readFile = util.promisify(fs.readFile);

// TODO: Create Error classes for different errors that cna be thrown from FileSystemInterface

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

        const key = await readFile(keyFile);

        this.port = port;

        this.server = new ssh2.Server({
            hostKeys: [ key ]
        }, (client) => this.onClient(client));

        return new Promise((resolve) => this.server.listen(this.port, resolve));
    }

    async stop() {
        this.removeAllListeners();

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
        client.on("error", (error) => {
            console.error("ERROR", error);
            this.emit("error", error);
        });

        client.on("authentication", async (ctx) => {
            try {
                await this.fs.authenticate(ctx);
                ctx.accept();
            } catch (error) {
                ctx.reject();
            }
        });

        client.on("end", () => {
            this.destroyConnection(client);
        });

        client.on("continue", () => {
            const connection = this.getConnection(client);

            if (connection) {
                connection.canContinue();
            }
        });

        client.on("ready", () => {
            const connection = this.createConnection(client);

            client.on("session", (accept) => {
                const session = accept();
                session.on("sftp", (accept) => {
                    const stream = accept();

                    connection.addAction("open", async (requestId, pathname, flags, attrs) => {
                        const handle = connection.createFileHandle(pathname);

                        await this.fs.open(handle, flags, attrs);

                        return () => stream.handle(requestId, handle.id.encoded);
                    });

                    connection.addAction("write", async (requestId, handleId, offset, data) => {
                        const handle = connection.getHandle(handleId);
                        await this.fs.write(handle, offset, data);

                        return ssh2.SFTP_STATUS_CODE.OK;
                    });

                    connection.addAction("read", async (requestId, handleId, offset, length) => {
                        const handle = connection.getHandle(handleId);
                        const data = await this.fs.read(handle, offset, length);

                        if (data) {
                            return () => stream.data(requestId, ssh2.SFTP_STATUS_CODE.OK);
                        }

                        return ssh2.SFTP_STATUS_CODE.EOF;
                    });

                    connection.addAction("fstat", async (requestId, handleId) => {
                        const handle = connection.getHandle(handleId);
                        const attrs = await this.fs.stat(handle.pathname);

                        stream.attrs(requestId, attrs);

                        return () => true; // TODO: continue on return false?
                    });

                    connection.addAction("fsetstat", async (requestId, handleId, attrs) => {
                        const handle = connection.getHandle(handleId);
                        await this.fs.setstat(handle.pathname, attrs);

                        return ssh2.SFTP_STATUS_CODE.OK;
                    });

                    connection.addAction("close", async (requestId, handleId) => {
                        await connection.destroyHandle(handleId);

                        return ssh2.SFTP_STATUS_CODE.OK;
                    });

                    connection.addAction("opendir", async (requestId, pathname) => {
                        const handle = connection.createDirectoryHandle(pathname);

                        await this.fs.opendir(handle, pathname);

                        return () => stream.handle(requestId, handle.id.encoded);
                    });

                    connection.addAction("readdir", async (requestId, handleId) => {
                        const handle = connection.getHandle(handleId);
                        const names = await this.fs.listdir(handle);

                        if (names) {
                            return () => stream.name(requestId, names);
                        }

                        return ssh2.SFTP_STATUS_CODE.EOF;
                    });

                    connection.addAction("lstat", async (requestId, pathname) => {
                        const attrs = await this.fs.lstat(pathname);

                        stream.attrs(requestId, attrs);

                        return () => true; // TODO: continue on return false?
                    });

                    connection.addAction("stat", async (requestId, pathname) => {
                        const attrs = await this.fs.stat(pathname);

                        stream.attrs(requestId, attrs);

                        return () => true; // TODO: continue on return false?
                    });

                    connection.addAction("remove", async (requestId, pathname) => {
                        await this.fs.remove(pathname);

                        return ssh2.SFTP_STATUS_CODE.OK;
                    });

                    connection.addAction("rmdir", async (requestId, pathname) => {
                        await this.fs.rmdir(pathname);

                        return ssh2.SFTP_STATUS_CODE.OK;
                    });

                    connection.addAction("realpath", async (requestId, pathname) => {
                        const name = await this.fs.normalize(pathname);

                        return () => stream.name(requestId, [ name ]);
                    });

                    connection.addAction("readlink", async (requestId, pathname) => {
                        const name = await this.fs.realpath(pathname);

                        return () => stream.name(requestId, [ name ]);
                    });

                    connection.addAction("setstat", async (requestId, pathname, attrs) => {
                        await this.fs.setstat(pathname, attrs);

                        return ssh2.SFTP_STATUS_CODE.OK;
                    });

                    connection.addAction("mkdir", async (requestId, pathname, attrs) => {
                        await this.fs.mkdir(pathname, attrs);

                        return ssh2.SFTP_STATUS_CODE.OK;
                    });

                    connection.addAction("rename", async (requestId, oldPathname, newPathname) => {
                        await this.fs.rename(oldPathname, newPathname);

                        return ssh2.SFTP_STATUS_CODE.OK;
                    });

                    connection.addAction("symlink", async (requestId, linkPathname, targetPathname) => {
                        await this.fs.symlink(targetPathname, linkPathname);

                        return ssh2.SFTP_STATUS_CODE.OK;
                    });

                    connection.addStream(stream);
                });
            });
        });
    }
}

module.exports = Server;
