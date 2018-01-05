"use strict";

/* global describe it after before */

const util = require("util");
const os = require("os");
const path = require("path");
const assert = require("assert");
const fs = require("fs-extra");
const getPort = require("get-port");
const { Client } = require("ssh2");

const FileSystem = require("../example/FileSystem");
const Server = require("../lib/Server");

const username = "userName";
const password = "passWord";
const keyFile = path.join(__dirname, "keys", "id_rsa");
const server = new Server(new FileSystem(username, password));
const connection = new Client();

let port;
let sftp;
let rootpath;

process.on("unhandledRejection", (error, promise) => {
    console.error(new Date());
    console.error("Warning, unhandled promise rejection", error);
    console.error("Promise: ", promise);
    process.exit(255);
});

describe("sftp-fs", () => {
    before(async () => {
        port = await getPort();
        rootpath = await fs.mkdtemp(path.join(os.tmpdir(), "sftp-fs-"));

        await server.start(keyFile, port);
    });

    after(async () => {
        connection && connection.end();
        await server.stop();
    });

    describe("FileSystem", () => {
        it("should connect successfully", async () => {
            await new Promise((resolve, reject) => {
                connection.once("ready", () => {
                    connection.removeAllListeners("error");
                    resolve();
                });

                connection.once("error", (error) => {
                    connection.removeAllListeners("ready");
                    reject(error);
                });

                connection.connect({
                    host: "localhost",
                    port,
                    username,
                    password
                });
            });
        });

        it("should start sftp subsystem successfully", async () => {
            const fn = util.promisify(connection.sftp).bind(connection);
            const obj = await fn();

            sftp = {
                readdir: util.promisify(obj.readdir).bind(obj),
                mkdir: util.promisify(obj.mkdir).bind(obj),
                rename: util.promisify(obj.rename).bind(obj),
                rmdir: util.promisify(obj.rmdir).bind(obj)
            };
        });

        it("should list an empty directory successfully", async () => {
            const list = await sftp.readdir(rootpath);

            assert.deepEqual(list, []);
        });

        it("should create a directory successfully", async () => {
            await sftp.mkdir(path.join(rootpath, "folder"));

            const list = await fs.readdir(rootpath);

            assert.deepEqual(list, [
                {
                    filename: "folder",
                    longname: "",
                    attrs: list[0].attrs
                }
            ]);
        });

        it("should rename a directory successfully", async () => {
            const newName = path.join(rootpath, "folder2");
            await sftp.rename(path.join(rootpath, "folder"), newName);

            const list = await fs.readdir(rootpath);

            assert.deepEqual(list, [
                {
                    filename: "folder2",
                    longname: "",
                    attrs: list[0].attrs
                }
            ]);
        });

        it("should remove a directory successfully", async () => {
            await sftp.rmdir(path.join(rootpath, "folder2"));

            const list = await fs.readdir(rootpath);

            assert.deepEqual(list, []);
        });
    });
});
