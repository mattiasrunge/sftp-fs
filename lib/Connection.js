"use strict";

const assert = require("assert");
const Handle = require("./Handle");
const HandleId = require("./HandleId");
const Deferred = require("./Deferred");
const { SFTP_STATUS_CODE } = require("ssh2");

class Connection {
    constructor(client) {
        this.client = client;
        this.handles = [];
        this.stream = null;
        this.actions = {};
        this.continueDeferred = new Deferred(true);
    }

    async respond(fn) {
        await this.continueDeferred.promise;

        !fn() && (this.continueDeferred = new Deferred());
    }

    canContinue() {
        this.continueDeferred.resolve();
    }

    addStream(stream) {
        this.stream = stream;
    }

    addAction(action, fn) {
        assert(this.stream, "addStream must be called before addAction");

        this.stream.on(action.toUpperCase(), async (requestId, ...args) => {
            // console.error("action", action, ...args);
            try {
                const status = await fn(requestId, ...args);

                if (typeof status === "undefined") {
                    await this.respond(() => this.stream.status(requestId, SFTP_STATUS_CODE.OK));
                } else if (typeof status === "function") {
                    await this.respond(status);
                } else {
                    await this.respond(() => this.stream.status(requestId, status));
                }
            } catch (error) {
                // console.error(`Error on action ${action}`, error);
                await this.respond(() => this.stream.status(requestId, error.status || SFTP_STATUS_CODE.FAILURE, error.message));
            }
        });
    }

    createFileHandle(pathname) {
        const handle = new Handle("file", pathname);

        this.handles.push(handle);

        return handle;
    }

    createDirectoryHandle(pathname) {
        const handle = new Handle("directory", pathname);

        this.handles.push(handle);

        return handle;
    }

    getHandle(encodedId) {
        const id = HandleId.decodeId(encodedId);
        const handle = this.handles.find((handle) => handle.id.unencoded === id);

        assert(handle, "No handle found");

        return handle;
    }

    async destroyHandle(encodedId) {
        const handle = this.getHandle(encodedId);

        if (handle) {
            this.handles.splice(this.handles.indexOf(handle), 1);

            await handle.release();
        }
    }

    async close() {
        for (const handle of this.handles) {
            await handle.release();
        }

        this.handles.length = 0;

        this.client.end();
    }
}

module.exports = Connection;
