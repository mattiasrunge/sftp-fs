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
        this.canContinue = new Deferred(true);
    }

    shouldAwaitContinue() {
        this.canContinue = new Deferred();
    }

    async respond(fn) {
        await this.canContinue.promise;

        if (!fn()) {
            this.shouldAwaitContinue();
        }
    }

    canContinue() {
        this.canContinue.resolve();
    }

    addStream(stream) {
        this.stream = stream;

        for (const action of Object.keys(this.actions)) {
            this.stream.on(action.toUpperCase(), async (requestId, ...args) => {
                console.error("action", action);
                try {
                    const status = await this.actions[action](requestId, ...args);

                    assert(typeof status !== "undefined", "No status or respond function returned from action call");

                    if (typeof status === "function") {
                        await this.respond(status);
                    } else {
                        await this.respond(() => this.stream.status(requestId, status));
                    }
                } catch (error) {
                    console.error(error);
                    await this.respond(() => this.stream.status(requestId, error.status || SFTP_STATUS_CODE.FAILURE, error.message));
                }
            });
        }
    }

    addAction(action, fn) {
        this.actions[action] = fn;
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
    }
}

module.exports = Connection;
