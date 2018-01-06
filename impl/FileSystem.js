"use strict";

const path = require("path");
const fs = require("fs-extra");
const { SFTP_OPEN_MODE } = require("ssh2");
const { FileSystemInterface, PermissionDeniedError } = require("../index");

const isset = (value) => typeof value !== "undefined";

const longname = (name, attrs, num) => {
    let str = "-";

    if (attrs.isDirectory()) {
        str = "d";
    } else if (attrs.isSymbolicLink()) {
        str = "l";
    }

    str += (attrs.mode & fs.constants.S_IRUSR) ? "r" : "-";
    str += (attrs.mode & fs.constants.S_IWUSR) ? "w" : "-";
    str += (attrs.mode & fs.constants.S_IXUSR) ? "x" : "-";
    str += (attrs.mode & fs.constants.S_IRGRP) ? "r" : "-";
    str += (attrs.mode & fs.constants.S_IWGRP) ? "w" : "-";
    str += (attrs.mode & fs.constants.S_IXGRP) ? "x" : "-";
    str += (attrs.mode & fs.constants.S_IROTH) ? "r" : "-";
    str += (attrs.mode & fs.constants.S_IWOTH) ? "w" : "-";
    str += (attrs.mode & fs.constants.S_IXOTH) ? "x" : "-";
    str += " ";
    str += num;
    str += " ";
    str += attrs.uid;
    str += " ";
    str += attrs.gid;
    str += " ";
    str += attrs.size;
    str += " ";
    str += attrs.mtime.toDateString().slice(4);
    str += " ";
    str += name;

    return str;
};

const convFlags = (flags) => {
    let mode = 0;

    if ((flags & SFTP_OPEN_MODE.READ) && (flags & SFTP_OPEN_MODE.WRITE)) {
        mode = fs.constants.O_RDWR;
    } else if (flags & SFTP_OPEN_MODE.READ) {
        mode = fs.constants.O_RDONLY;
    } else if (flags & SFTP_OPEN_MODE.WRITE) {
        mode = fs.constants.O_WRONLY;
    }

    if (flags & SFTP_OPEN_MODE.CREAT) {
        mode |= fs.constants.O_CREAT;
    }

    if (flags & SFTP_OPEN_MODE.APPEND) {
        mode |= fs.constants.O_APPEND;
    }

    if (flags & SFTP_OPEN_MODE.EXCL) {
        mode |= fs.constants.O_EXCL;
    }

    if (flags & SFTP_OPEN_MODE.TRUNC) {
        mode |= fs.constants.O_TRUNC;
    }

    return mode;
};

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

    async open(handle, flags, attrs) {
        const id = await fs.open(handle.pathname, convFlags(flags), attrs.mode);

        handle.setParam("id", id);
        handle.addDisposable(async () => await fs.close(id));
    }

    async stat(pathname) {
        return await fs.stat(pathname);
    }

    async lstat(pathname) {
        return await fs.lstat(pathname);
    }

    async write(handle, offset, data) {
        const id = handle.getParam("id");

        await fs.write(id, data, offset);
    }

    async read(handle, offset, length) {
        const id = handle.getParam("id");
        const attrs = await fs.fstat(id);

        if (offset >= attrs.size) {
            return;
        }

        const buffer = Buffer.alloc(length);
        const { bytesRead } = await fs.read(id, buffer, 0, length, offset);

        return buffer.slice(0, bytesRead);
    }

    async listdir(handle) {
        if (handle.getParam("eof")) {
            return;
        }

        const list = [];
        const files = await fs.readdir(handle.pathname);

        for (const filename of files) {
            const attrs = await this.lstat(path.join(handle.pathname, filename));
            const num = 1; // TODO: Number of links and directories inside this directory

            list.push({
                filename,
                longname: longname(filename, attrs, num),
                attrs
            });
        }

        handle.setParam("eof", true);

        return list;
    }

    async mkdir(pathname, attrs) {
        await fs.mkdir(pathname, attrs.mode & ~fs.constants.S_IFMT);
        await this.setstat(pathname, {
            uid: attrs.uid,
            gid: attrs.gid,
            atime: attrs.atime,
            mtime: attrs.mtime
        });
    }

    async setstat(pathname, attrs) {
        if (isset(attrs.mode)) {
            await fs.chmod(pathname, attrs.mode);
        }

        if (isset(attrs.uid) || isset(attrs.gid)) {
            await fs.chown(pathname, attrs.uid, attrs.gid);
        }

        if (isset(attrs.atime) || isset(attrs.mtime)) {
            await fs.utimes(pathname, attrs.atime, attrs.mtime);
        }
    }

    async rename(oldPathname, newPathname) {
        await fs.rename(oldPathname, newPathname);
    }

    async rmdir(pathname) {
        await fs.rmdir(pathname);
    }

    async remove(pathname) {
        await fs.unlink(pathname);
    }

    async realpath(pathname) {
        return await fs.realpath(pathname);
    }

    async readlink(pathname) {
        return await fs.readlink(pathname);
    }

    async symlink(targetPathname, linkPathname) {
        return await fs.symlink(targetPathname, linkPathname);
    }
}

module.exports = FileSystem;
