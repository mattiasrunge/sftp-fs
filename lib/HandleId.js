"use strict";

const ids = [];

class HandleId {
    constructor() {
        this._id = this._generateId();
        this._encoded = new Buffer(4);
        this._encoded.writeUInt32BE(this._id, 0, true);
    }

    get encoded() {
        return this._encoded;
    }

    get unencoded() {
        return this._id;
    }

    _generateId() {
        let id = 1;

        while (ids.includes(id)) {
            id++;
        }

        ids.push(id);

        return id;
    }

    static decodeId(encoded) {
        return encoded.readUInt32BE(0, true);
    }

    release() {
        const index = ids.indexOf(this._id);
        (index !== -1) && ids.splice(index, 1);
    }
}

module.exports = HandleId;
