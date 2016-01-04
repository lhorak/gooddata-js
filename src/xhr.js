// Copyright (C) 2007-2013, GoodData(R) Corporation. All rights reserved.
/*eslint no-use-before-define: [2, "nofunc"]*/
// import $ from 'jquery';
import * as config from './config';
import {
    isPlainObject,
    isFunction,
    isArray,
    merge
} from 'lodash';
import 'isomorphic-fetch'

/**
 * Ajax wrapper around GDC authentication mechanisms, SST and TT token handling and polling.
 * Inteface is same as original jQuery.ajax.

 * If token is expired, current request is "paused", token is refreshed and request is retried and result.
 * is transparently returned to original call.

 * Additionally polling is handled. Only final result of polling returned.
 * @module xhr
 * @class xhr
 */

let tokenRequest;
let xhrSettings; // TODO rename xhrSettings - "defaultXhrSettings?"

function enrichSettingWithCustomDomain(settings, domain) {
    if (domain) {
        // protect url to be prepended with domain on retry
        if (settings.url.indexOf(domain) === -1) {
            settings.url = domain + settings.url;
        }
        settings.xhrFields = settings.xhrFields || {};
        settings.xhrFields.withCredentials = true;
    }

    return settings;
}

function continueAfterTokenRequest(url, settings) {
    return tokenRequest.then(response => {
        if (!response.ok) {
            throw new Error('Unauthorized');
        }
        tokenRequest = null;

        return ajax(url, settings);
    }, reason => {

        tokenRequest = null;
        return reason;
    });
}

function handleUnauthorized(url, settings) {
    if (!tokenRequest) {
        // Create only single token request for any number of waiting request.
        // If token request exist, just listen for it's end.
        // TODO add:
        //  enrichSettingWithCustomDomain(
        //    { url: '/gdc/account/token/' }, config.domain
        //  )

        tokenRequest = fetch('/gdc/account/token', { credentials: 'include' }).then(response => {
            // tokenRequest = null;
            // TODO jquery compat - allow to attach unauthorized callback and call it if attached
            // if ((xhrObj.status === 401) && (isFunction(req.unauthorized))) {
            //     req.unauthorized(xhrObj, textStatus, err, deferred);
            //     return;
            // }
            // unauthorized handler is not defined or not http 401
            // unauthorized when retrieving token -> not logged
            if (response.status === 401) {
                throw new Error('Unauthorized');
            }

            // throw Error('quux2')
            return response;
        });
    }
    return continueAfterTokenRequest(url, settings);
}

function isLoginRequest(url) {
    return url.indexOf('/gdc/account/login') !== -1;
}

export function ajax(url, tempSettings = {}) {
    let settings = createSettings(tempSettings)
    if (tokenRequest) {
        return continueAfterTokenRequest(url, settings);
    }

    return fetch(url, settings).then(response => {
        // If response.status id 401 and it was a login request there is no need
        // to cycle back for token - login does not need token and this meand you
        // are not authorized
        if (response.status === 401) {
            if (isLoginRequest(url)) {
                throw new Error('Unauthorized');
            }

            return handleUnauthorized(url, settings);
        }

        if (response.status === 202) {// TODO add settings.dontPollOnResult
            // if the response is 202 and Location header is not empty, let's poll on the new Location
            let finalUrl = url;
            let finalSettings = settings;
            if (response.has('Location')) {
                finalUrl = response.get('Location');
            }
            finalSettings.method = 'GET';
            delete finalSettings.data;
            delete finalSettings.body;
            return handlePolling(finalUrl, finalSettings);
        }
        return response;
    }); // TODO handle polling
}

function createSettings(settings) {
    const headers = new Headers({
        'Accept': 'application/json; charset=utf-8',
        'Content-Type': 'application/json'
    });

    // TODO merge with headers from config
    settings.headers = headers;

    // TODO move to jquery compat layer
    settings.body = (settings.data) ? settings.data : settings.body;
    settings.credentials = 'include';

    if (isPlainObject(settings.body)) {
        settings.body = JSON.stringify(settings.body);
    }

    return settings;
}

function handlePolling(url, settings) {
    return new Promise((resolve, reject) => {
        setTimeout(function poller() {
            ajax(url, settings).then(resolve, reject);
        }, 2000); // TODO add settings.pollDelay
    })
}

// helper to coverts traditional ajax callbacks to deferred
function reattachCallbackOnDeferred(settings, property, defferAttach) {
    const callback = settings[property];
    delete settings[property];
    if (isFunction(callback)) {
        defferAttach(callback);
    }
    if (isArray(callback)) {
        callback.forEach(function loopCallbacks(fn) {
            if (isFunction(callback)) {
                defferAttach(fn);
            }
        });
    }
}

/**
 * additional ajax configuration specific for xhr module, keys
 *   unauthorized: function(xhr) - called when user is unathorized and token renewal failed
 *   pollDelay: int - polling interval in milisecodns, default 1000

 * method also accepts any option from original $.ajaxSetup. Options will be applied to all call of xhr.ajax().

 * xhrSetup behave similar tp $.ajaxSetup, each call replaces settings completely.
 * Options can be also passed to particular xhr.ajax calls (same as optios for $.ajax and $.ajaxSetup)
 * @method ajaxSetup
 */
export function ajaxSetup(settings) {
    xhrSettings = merge({
        contentType: 'application/json',
        dataType: 'json',
        pollDelay: 1000,
        headers: {
            'Accept': 'application/json; charset=utf-8'
        }
    }, settings);
}


/**
 * Same api as jQuery.ajax - arguments (url, settings) or (settings) with url inside
 * Additionally content type is automatically json, and object in settings.data is converted to string
 * to be consumed by GDC backend.

 * settings additionally accepts keys: unathorized, pollDelay  (see xhrSetup for more details)
 * @method ajax
 * @param url request url
 * @param settings settings object
 */
export function ajax_(url, settings) {
    let finalSettings;
    let finalUrl;
    if (isPlainObject(url)) {
        finalSettings = url;
        finalUrl = undefined;
    } else {
        finalUrl = url;
        finalSettings = settings;
    }
    // copy settings to not modify passed object
    // settings can be undefined, doesn't matter, $.extend handle it
    finalSettings = merge({}, xhrSettings, finalSettings);
    if (finalUrl) {
        finalSettings.url = finalUrl;
    }

    if (isPlainObject(finalSettings.data)) {
        finalSettings.data = JSON.stringify(finalSettings.data);
    }

    /*eslint-disable new-cap*/
    const d = $.Deferred();
    /*eslint-enable new-cap*/
    reattachCallbackOnDeferred(finalSettings, 'success', d.done);
    reattachCallbackOnDeferred(finalSettings, 'error', d.fail);
    reattachCallbackOnDeferred(finalSettings, 'complete', d.always);

    if (tokenRequest) {
        continueAfterTokenRequest(finalSettings, d);
        return d;
    }

    $.ajax(enrichSettingWithCustomDomain(finalSettings, config.domain)).fail(function jqAjaxFail(xhrObj, textStatus, err) {
        if (xhrObj.status === 401) {
            handleUnauthorized(finalSettings, d);
        } else {
            d.reject(xhrObj, textStatus, err);
        }
    }).done(function jqAjaxDone(data, textStatus, xhrObj) {
        if (xhrObj.status === 202 && !finalSettings.dontPollOnResult) {
            // if the response is 202 and Location header is not empty, let's poll on the new Location
            const location = xhrObj.getResponseHeader('Location');
            if (location) {
                finalSettings.url = location;
            }
            finalSettings.method = 'GET';
            delete finalSettings.data;
            handlePolling(finalSettings, d);
        } else {
            d.resolve(data, textStatus, xhrObj);
        }
    });
    return d;
}

function xhrMethod(method) {
    return function methodFn(url, settings) {
        const opts = merge({ method }, settings);

        return ajax(url, opts);
    };
}

/**
 * Wrapper for xhr.ajax method GET
 * @method get
 */
export const get = xhrMethod('GET');

/**
 * Wrapper for xhr.ajax method POST
 * @method post
 */
export const post = xhrMethod('POST');

/**
 * Wrapper for xhr.ajax method PUT
 * @method put
 */
export const put = xhrMethod('PUT');

// setup default settings
ajaxSetup({});

