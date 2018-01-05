"use strict";

class Deferred {
    constructor(resolved = false) {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });

        resolved && this.resolve();
    }
}

module.exports = Deferred;
