"use strict";

/**
 * Custom error type for promises rejected by promise.timeout
 * @param {string} message
 * @constructor
 */
function TimeoutError(message) {
	Error.call(this);
	this.message = message;
	this.name = TimeoutError.name;
	if (typeof Error.captureStackTrace === 'function') {
		Error.captureStackTrace(this, TimeoutError);
	}
}

TimeoutError.prototype = Object.create(Error.prototype);
TimeoutError.prototype.constructor = TimeoutError;

exports.TimeoutError = TimeoutError;
