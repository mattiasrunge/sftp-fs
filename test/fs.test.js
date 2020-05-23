"use strict";

/* global describe it afterAll beforeAll */

const util = require("util");
const os = require("os");
const path = require("path");
const assert = require("assert");
const fs = require("fs-extra");
const getPort = require("get-port");
const { Client } = require("ssh2");

const FileSystem = require("../impl/FileSystem");
const Server = require("../lib/Server");

const username = "userName";
const password = "passWord";
const keyFile = path.join(__dirname, "..", "server", "keys", "id_rsa");
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

const stat = async (pathname) => {
    const attrs = await fs.stat(pathname);

    return {
        mode: attrs.mode,
        uid: attrs.uid,
        gid: attrs.gid,
        size: attrs.size,
        atime: Math.floor(attrs.atime.getTime() / 1000),
        mtime: Math.floor(attrs.mtime.getTime() / 1000)
    };
};

const list = async (pathname) => {
    const files = await fs.readdir(pathname);

    const list = [];

    for (const filename of files) {
        const fullpath = path.join(pathname, filename);
        const attrs = await stat(fullpath);

        list.push({
            filename,
            longname: "",
            attrs
        });
    }

    return list;
};

describe("sftp-fs", () => {
    beforeAll(async () => {
        port = await getPort();
        rootpath = await fs.mkdtemp(path.join(os.tmpdir(), "sftp-fs-"));

        await server.start(keyFile, port);
    });

    afterAll(async () => {
        await server.stop();
        await fs.remove(rootpath);
    });

    describe("Connection", () => {
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
                rmdir: util.promisify(obj.rmdir).bind(obj),
                stat: util.promisify(obj.stat).bind(obj),
                lstat: util.promisify(obj.lstat).bind(obj),
                realpath: util.promisify(obj.realpath).bind(obj),
                setstat: util.promisify(obj.setstat).bind(obj),
                symlink: util.promisify(obj.symlink).bind(obj),
                readlink: util.promisify(obj.readlink).bind(obj),
                open: util.promisify(obj.open).bind(obj),
                write: util.promisify(obj.write).bind(obj),
                read: util.promisify(obj.read).bind(obj),
                fstat: util.promisify(obj.fstat).bind(obj),
                fsetstat: util.promisify(obj.fsetstat).bind(obj),
                unlink: util.promisify(obj.unlink).bind(obj),
                close: util.promisify(obj.close).bind(obj)
            };
        });
    });

    describe("Directory", () => {
        it("should list an empty directory successfully", async () => {
            const slist = await sftp.readdir(rootpath);

            const llist = await list(rootpath);
            assert.equal(llist.length, 0);
            assert.deepEqual(slist, llist);
        });

        it("should create a directory successfully", async () => {
            await sftp.mkdir(path.join(rootpath, "folder"));

            const llist = await list(rootpath);
            assert.equal(llist.length, 1);
            assert.equal(llist[0].filename, "folder");
        });

        it("should stat a directory successfully", async () => {
            const attrs = await sftp.stat(path.join(rootpath, "folder"));

            delete attrs.permissions;

            const llist = await list(rootpath);
            assert.deepEqual(attrs, llist[0].attrs);
        });

        it("should set stat successfully", async () => {
            const pathname = path.join(rootpath, "folder");
            const sattrs = {
                mode: 0o777,
                uid: 1000,
                gid: 1000,
                atime: 1000,
                mtime: 2000
            };

            await sftp.setstat(pathname, sattrs);

            const lattrs = await stat(pathname);

            delete lattrs.size;
            lattrs.mode = lattrs.mode & ~fs.constants.S_IFMT;

            assert.deepEqual(sattrs, lattrs);
        });

        it("should rename a directory successfully", async () => {
            await sftp.rename(path.join(rootpath, "folder"), path.join(rootpath, "folder2"));

            const llist = await list(rootpath);
            assert.equal(llist.length, 1);
            assert.equal(llist[0].filename, "folder2");
        });

        it("should remove a directory successfully", async () => {
            await sftp.rmdir(path.join(rootpath, "folder2"));

            const llist = await list(rootpath);
            assert.equal(llist.length, 0);
        });
    });

    describe("Symlink", () => {
        it("should create a symlink successfully", async () => {
            const pathname = path.join(rootpath, "folder");
            const linkname = path.join(rootpath, "folder_link");

            await sftp.mkdir(pathname);
            await sftp.symlink(pathname, linkname);

            const llist = await list(rootpath);
            assert.equal(llist.length, 2);
        });

        it("should readlink successfully", async () => {
            const pathname = path.join(rootpath, "folder");
            const linkname = path.join(rootpath, "folder_link");

            const pn = await sftp.readlink(linkname);

            assert.equal(pn, pathname);
        });

        it("should lstat a directory successfully", async () => {
            const attrs = await sftp.lstat(path.join(rootpath, "folder"));

            delete attrs.permissions;

            const llist = await list(rootpath);
            assert.deepEqual(attrs, llist[0].attrs);
        });
    });

    describe("File", () => {
        it("should write a file successfully", async () => {
            const filename = path.join(rootpath, "file.txt");
            const content = Buffer.from("Hello World");

            const handle = await sftp.open(filename, "w");

            await sftp.write(handle, content, 0, content.length, 0);

            await sftp.close(handle);
        });

        it("should stat a file successfully", async () => {
            const filename = path.join(rootpath, "file.txt");
            const attrs = await sftp.stat(filename);

            delete attrs.permissions;

            const llist = await list(rootpath);
            assert.deepEqual(attrs, llist[0].attrs);
        });

        it("should fstat a file successfully", async () => {
            const filename = path.join(rootpath, "file.txt");
            const handle = await sftp.open(filename, "r");

            const attrs = await sftp.fstat(handle);

            await sftp.close(handle);

            delete attrs.permissions;

            const llist = await list(rootpath);
            assert.deepEqual(attrs, llist[0].attrs);
        });

        it("should set stat successfully", async () => {
            const filename = path.join(rootpath, "file.txt");
            const sattrs = {
                mode: 0o777,
                uid: 1000,
                gid: 1000,
                atime: 1000,
                mtime: 2000
            };

            await sftp.setstat(filename, sattrs);

            const lattrs = await stat(filename);

            delete lattrs.size;
            lattrs.mode = lattrs.mode & 0o777;

            assert.deepEqual(sattrs, lattrs);
        });

        it("should set fstat successfully", async () => {
            const filename = path.join(rootpath, "file.txt");
            const handle = await sftp.open(filename, "r");
            const sattrs = {
                mode: 0o777,
                uid: 1000,
                gid: 1000,
                atime: 1000,
                mtime: 2000
            };

            await sftp.fsetstat(handle, sattrs);

            await sftp.close(handle);

            const lattrs = await stat(filename);

            delete lattrs.size;
            lattrs.mode = lattrs.mode & 0o777;

            assert.deepEqual(sattrs, lattrs);
        });

        it("should read a file successfully", async () => {
            const filename = path.join(rootpath, "file.txt");
            const handle = await sftp.open(filename, "r");
            const content = Buffer.from("Hello World");
            const buffer = Buffer.alloc(content.length);

            await sftp.read(handle, buffer, 0, buffer.length, 0);

            await sftp.close(handle);

            assert(content.equals(buffer));
        });

        it("should remove a file successfully", async () => {
            const filename = path.join(rootpath, "file.txt");
            await sftp.unlink(filename);

            const llist = await list(rootpath);
            assert.equal(llist.length, 2);
        });
    });

    describe("Other", () => {
        it("should call realpath successfully", async () => {
            const pathname = path.join(rootpath, "folder2");
            await sftp.mkdir(pathname);
            const filepath = await sftp.realpath(path.join(rootpath, "folder2", "..", "folder2", "..", "folder2"));
            await sftp.rmdir(pathname);

            assert.equal(filepath, pathname);
        });
    });
});
