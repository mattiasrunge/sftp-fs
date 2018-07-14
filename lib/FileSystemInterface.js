"use strict";

const { OpUnsupportedError } = require("./errors");

class FileSystemInterface {
    constructor() {}

    async authenticate(/* session, request */) {
        console.error("authenticate not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async open(/* session, handle, flags, attrs */) {
        console.error("open not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async write(/* session, handle, offset, data */) {
        console.error("write not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async read(/* session, handle, offset, length */) {
        console.error("read not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async stat(/* session, pathname */) {
        console.error("stat not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async lstat(/* session, pathname */) {
        console.error("lstat not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async setstat(/* session, pathname, attrs */) {
        console.error("setstat not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async opendir(/* session, handle, pathname */) {
        // Returns dirId
        console.error("open not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async listdir(/* session, handle, pathname */) {
        console.error("listdir not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async mkdir(/* session, pathname, attrs */) {
        console.error("mkdir not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async remove(/* session, pathname */) {
        console.error("remove not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async rmdir(/* session, pathname */) {
        console.error("rmdir not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async realpath(/* session, pathname */) {
        console.error("realpath not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async readlink(/* session, pathname */) {
        console.error("readlink not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async rename(/* session, oldPathname, newPathname */) {
        console.error("rename not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async symlink(/* session, targetPathname, linkPathname */) {
        console.error("symlink not implemented");
        throw new OpUnsupportedError("Not implemented");
    }
}

module.exports = FileSystemInterface;
