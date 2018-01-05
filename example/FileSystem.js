"use strict";

const path = require("path");
const util = require("util");
const fs = require("fs");
const { FileSystemInterface, PermissionDeniedError } = require("../index");

const close = util.promisify(fs.close);
const readdir = util.promisify(fs.readdir);
const mkdir = util.promisify(fs.mkdir);
const chown = util.promisify(fs.chown);
const utimes = util.promisify(fs.utimes);
const stat = util.promisify(fs.stat);
const rename = util.promisify(fs.rename);
const lstat = util.promisify(fs.lstat);
const rmdir = util.promisify(fs.rmdir);

class FileSystem extends FileSystemInterface {
    constructor(username, password) {
        super();

        this.username = username;
        this.password = password;
    }

    async authenticate(request) {
        if (request.method !== "password" ||
            request.username !== this.username ||
            request.password !== this.password) {
            throw new PermissionDeniedError();
        }
    }

    async opendir(handle) {
        handle.setParam("eof", false);
    }

    async stat(pathname) {
        const attrs = await stat(pathname);

        return {
            filename: path.basename(pathname),
            longname: null, // TODO
            attrs
        };
    }

    async lstat(pathname) {
        const attrs = await lstat(pathname);

        return {
            filename: path.basename(pathname),
            longname: null, // TODO
            attrs
        };
    }

    async listdir(handle) {
        if (handle.getParam("eof")) {
            return;
        }

        const files = await readdir(handle.pathname);
        const list = [];

        for (const file of files) {
            const pathname = path.join(handle.pathname, file);

            list.push(await this.stat(pathname));
        }

        handle.setParam("eof", true);

        return list;
    }

    async mkdir(pathname, attrs) {
        await mkdir(pathname, attrs.mode);

        if (attrs.uid || attrs.gid) {
            await chown(pathname, attrs.uid, attrs.gid);
        }

        if (attrs.atime || attrs.mtime) {
            await utimes(pathname, attrs.atime, attrs.mtime);
        }
    }

    async rename(oldPathname, newPathname) {
        await rename(oldPathname, newPathname);
    }

    async rmdir(pathname) {
        await rmdir(pathname);
    }
}

module.exports = FileSystem;
