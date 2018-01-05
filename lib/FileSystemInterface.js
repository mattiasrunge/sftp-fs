"use strict";

const { OpUnsupportedError } = require("./errors");

class FileSystemInterface {
    constructor() {}

    async authenticate(/* request */) {
        console.error("authenticate not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async open(/* handle, pathname, flags, attrs */) {
        console.error("open not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async write(/* handle, offset, data */) {
        console.error("write not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async read(/* handle, offset, length */) {
        console.error("read not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async stat(/* pathname */) {
        console.error("stat not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async lstat(/* pathname */) {
        console.error("lstat not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async setstat(/* pathname, attrs */) {
        console.error("setstat not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async opendir(/* handle, pathname */) {
        // Returns dirId
        console.error("open not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async listdir(/* handle, pathname */) {
        console.error("listdir not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async mkdir(/* pathname, attrs */) {
        console.error("mkdir not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async remove(/* pathname */) {
        console.error("remove not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async rmdir(/* pathname */) {
        console.error("rmdir not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async normalize(/* pathname */) {
        // Returns stat object but with empty attrs
        console.error("normalize not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async rename(/* oldPathname, newPathname */) {
        console.error("rename not implemented");
        throw new OpUnsupportedError("Not implemented");
    }

    async symlink(/* targetPathname, linkPathname */) {
        console.error("symlink not implemented");
        throw new OpUnsupportedError("Not implemented");
    }
}

module.exports = FileSystemInterface;
