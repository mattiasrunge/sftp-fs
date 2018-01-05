"use strict";

const { SFTP_STATUS_CODE } = require("ssh2");

// https://gist.github.com/slavafomin/b164e3e710a6fc9352c934b9073e7216

class GenericError extends Error {
    constructor(message, status = SFTP_STATUS_CODE.FAILURE) {
        super(message);

        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
        this.status = status;
    }
}

class NoSuchFileError extends GenericError {
    constructor(message) {
        super(message, SFTP_STATUS_CODE.NO_SUCH_FILE);
    }
}

class PermissionDeniedError extends GenericError {
    constructor(message) {
        super(message, SFTP_STATUS_CODE.NO_SUCH_FILE);
    }
}

class BadMessageError extends GenericError {
    constructor(message) {
        super(message, SFTP_STATUS_CODE.BAD_MESSAGE);
    }
}

class OpUnsupportedError extends GenericError {
    constructor(message) {
        super(message, SFTP_STATUS_CODE.OP_UNSUPPORTED);
    }
}

module.exports = {
    GenericError,
    NoSuchFileError,
    PermissionDeniedError,
    BadMessageError,
    OpUnsupportedError
};
