"use strict";

const HandleId = require("./HandleId");

class Handle {
    constructor(what, pathname) {
        this.what = what;
        this.pathname = pathname;
        this.id = new HandleId();
        this.params = {};
        this.disposables = [];
    }

    async release() {
        this.id.release();

        for (const disposable of this.disposables) {
            await Promise.resolve(disposable());
        }
    }

    setParam(name, value) {
        return this.params[name] = value;
    }

    getParam(name) {
        return this.params[name];
    }

    addDisposable(fn) {
        this.disposables.push(fn);
    }
}

module.exports = Handle;
