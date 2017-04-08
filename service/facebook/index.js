var crypto = require('crypto');
var URI = require('urijs');
var facebook_request = require('../libs/facebook_request');

/**
 * @typedef {object} User
 * @property {string} id - User of messaging channel id.
 */

/**
 * @callback DefaultCallback
 * @param {boolean|object|null} error - If not error, null returned. else of otherwise.
 * @param {object|boolean|undefined|null} data - If not error this will be result.
 */

/**
 * Module for Facebook library
 * @constructor
 * @param {object} options
 * @param {string} options.webhookToken - Facebook webhook token using to verify the webhook.
 * @param {string} accountLinkUrl - This is url that will be using as callback when user click on account_link message.
 * @param {string} pageToken - Access token for facebook page.
 * @param {string} appSecret - Secret key for chat app.
 * @param {string} pageUsername - Username of facebook page.
 */
var m = function(options){
    if(!options){
        throw new Error("Options is required as 1st parameter");
    }

    var o = options;
    var requiredOptions = ["webhookToken", "accountLinkUrl", "pageToken", "appSecret", "pageUsername"];
    for(var i = 0; i < requiredOptions.length; i++){
        var name = requiredOptions[i];
        if(o[name] == undefined){
            throw new Error("Options property [" + name + "] is required.");
        }
        this.options[name] = o[name];
    }

    /**
     * All about webhook data receive
     * @member {object}
     */
    var w = this.webhook = {};

    /**
     * This function using to handle webhook callback [GET method]
     * @function
     * @memberof m.prototype.webhook
     * @param {object} req - NodeJS HTTP requrest without required of body. (for Express.js support)
     * @param {Buffer} [rawBody=null] - NodeJS body of HTTP request. (If not specified, Header signature won't be check for compability)
     * @return {boolean|object[]} - false if header verification is failed or data is not relavent to this module.
     */
    w.callbackGET = function(req, rawBody){
        if(!webhookFilter.bind(this)(req, rawBody)){
            return false;
        }

        if (
            req.query['hub.mode'] == 'subscribe' &&
            req.query['hub.verify_token'] == this.options.webhookToken
        ) {
            return req.query['hub.challenge'];
        } else {
            return false;
        }
    }.bind(this);

    /**
     * This function using to handle webhook callback [POST method]
     * @function
     * @memberof m.prototype.webhook
     * @param {object} req - NodeJS HTTP requrest without required of body. (for Express.js support)
     * @param {Buffer} [rawBody=null] - NodeJS body of HTTP request. (If not specified, Header signature won't be check for compability)
     * @return {boolean|object[]} - false if header verification is failed or data is not relavent to this module.
     */
    w.callbackPOST = function(req, rawBody){
        if(!webhookFilter.bind(this)(req, rawBody)){
            return false;
        }

        results = [];

        for(var i = 0; i < req.body.entry.length; i++){
            var infoWrap = req.body.entry[i];
            for(var j = 0; j < infoWrap.messaging.length; j++){
                var info = infoWrap.messaging[j];
                var referral = info.referral;

                if(!referral){
                    continue;
                }

                if(referral.type != "OPEN_THREAD"){
                    continue;
                }

                var user_id = info.sender.id;
                var state = referral.ref;

                results.push({
                    user: {
                        id: user_id
                    },
                    state: state
                });
            }
        }

        return results;
    }.bind(this);

    /**
     * All about messaging
     * @member {object}
     */
    var m = this.message = {};

    /**
     * This function do the work to send message to target
     * @function
     * @memberof m.prototype.message
     * @param {User} target - Destination channel to send message to
     * @param {string} message - Message to be send. Limit length is [1. 2000]
     * @param {DefaultCallback} callback - Callback when finished
     * @return {boolean} It will return false if it has problem with input data, But my throw error instead if critical.
     */
    m.text = function(target, message, callback){
        if(typeof callback !== typeof (function(){})){
            callback = function(){};
        }

        facebook_request
            .post('/me/messages', {
                recipient: {
                    id: target.id
                },
                message: {
                    text: message
                },
                notification_type: "REGULAR"
            }, this.options.pageToken)
            .then(function(info){
                callback(null, info);
            })
            .catch(function(error){
                callback(error);
            });
    }.bind(this);

    /**
     * Send account_link message to target
     * @function
     * @memberof m.prototype.message
     * @param {User} target - Target user to send message to.
     * @param {string} state - State string using for reference in stateless account_link callback.
     * @param {string} text - Message using for account_link button.
     * @param {DefaultCallback} callback - Callback when message sent.
     */
    /**
     * Send account_link message to target
     * @function
     * @memberof m.prototype.message
     * @param {User} target - Target user to send message to.
     * @param {string} state - State string using for reference in stateless account_link callback.
     * @param {DefaultCallback} callback - Callback when message sent.
     */
    m.accountLink = function(target, state, text, callback){
        if(callback == undefined){
            callback = text;
            text = "Messenger link to account.";
        }

        if(typeof callback !== typeof (function(){})){
            callback = function(){};
        }

        var access_url = new URI(this.options.accountLinkUrl);
        access_url.setQuery('state', state);
        access_url = access_url.toString();

        facebook_request
            .post('/me/messages', {
                recipient: {
                    id: target.id
                },
                message: {
                    attachment: {
                        type: "template",
                        payload: {
                            template_type: "button",
                            text: text,
                            buttons: [
                                {
                                    type: "account_link",
                                    url: access_url
                                }
                            ]
                        }
                    }
                },
                notification_type: "REGULAR"
            }, this.options.pageToken)
            .then(function (info){
                callback(null, info);
            })
            .catch(function(error){
                callback(error);
            });
    }.bind(this);

    /**
     * Send account_link message to target (will unlink only messenger)
     * @function
     * @memberof m.prototype.message
     * @param {User} target - Target user to send message to.
     * @param {string} text - Message using for account_unlink button.
     * @param {DefaultCallback} callback - Callback when message sent.
     */
    m.accountUnlink = function(target, text, callback){
        if(callback == undefined){
            callback = text;
            text = "Unlink messenger account.";
        }

        if(typeof callback !== typeof (function(){})){
            callback = function(){};
        }

        facebook_request
            .post('/me/messages', {
                recipient: {
                    id: target.id
                },
                message: {
                    attachment: {
                        type: "template",
                        payload: {
                            template_type: "button",
                            text: text,
                            buttons: [
                                {
                                    type: "account_unlink"
                                }
                            ]
                        }
                    }
                },
                notification_type: "REGULAR"
            }, this.options.pageToken)
            .then(function (info){
                callback(null, info);
            })
            .catch(function(error){
                callback(error);
            });
    }.bind(this);


    /**
     * All about entry and exit
     * @member {object}
     */
    var a = this.auth = {};

    /**
     * Request entry url for user to use to init the process
     * @function
     * @memberof m.prototype.auth
     * @param {string} state - An reference string using for reference in stateless process.
     * @return {string} Url that user can use to enter the stateless OAuth process. (reference by state param)
     */
    a.entryUrl = function(state){
        return facebook_request.callbackUrl(this.options.pageUsername, state);
    }.bind(this);

    /**
     * Handle callback url
     * @function
     * @memberof m.prototye.callback
     * @param {object} req - NodeJS HTTP request object.
     * @param {DefaultCallback} callback - Callback when finished
     * @return {boolean} False when it has problem with input data. May throw Error instead if critical.
     */
    a.callback = function(req, callback){
        if(typeof callback !== typeof (function(){})){
            callback = function(){};
        }

        var token = req.query.account_linking_token;
        var state = req.query.state;
        var redirect = req.query.redirect_uri;

        if(!token || !state){
            return false;
        }

        var recipientId = null;

        facebook_request
            .get("/me?fields=recipient&account_linking_token=" + token, undefined, this.options.pageToken)
            .then(function(info){
                recipientId = info.recipient;

                redirect = new URI(redirect);
                redirect.setQuery('authorization_code', state);
                redirect = redirect.toString();

                callback(null, {
                    state: state,
                    user: {
                        id: info.recipient
                    },
                    redirectUrl: redirect
                });
            }).catch(function(error){
                callback(error);
            });
        return true;
    }.bind(this);

    /**
     * Handle and verify webhook request [GET/POST method]
     * @function
     * @memberof m.prototype.webhook
     * @param {object} req - NodeJS HTTP request object without needs of request body (express.js compability)
     * @param {Buffer} [rawBody] - NodeJS HTTP request body if exists. By not passing this param, the function won't check the signature.
     */
    var webhookFilter = w.webhookFilter = function(req, rawBody){
        var x_hub_signature = req.get('X_Hub_Signature');
        if(!x_hub_signature){
            return false;
        }

        if(rawBody){
            var hmac = crypto.createHmac('sha1', this.options.appSecret);
            hmac.update(rawBody, "utf-8");

            var digest = "sha1=" + hmac.digest('base64');
            
            if(digest === x_hub_signature){
                return true;
            }else{
                return false;
            }
        }

        return true;
    }.bind(this);
};

module.exports = m;