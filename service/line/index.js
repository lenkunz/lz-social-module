var crypto = require('crypto');
var line_request = require('../libs/line_request');
var URI = require('urijs');

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
 * Module for LINE library
 * @constructor
 * @param {object} options
 * @param {string} options.callbackUrl - [Required] Callback for redirect user to web.
 * @param {string} options.botSecret - [Required] Secret key of bot channel.
 * @param {string} options.botToken - [Required] Access token of bot channel.
 * @param {string} options.loginChannelId - [Required] Id of LINE login channel.
 * @param {string} options.loginChannelSecret - [Required] Secret key of LINE login channel.
 */
var m = function(options){
    if(!options){
        throw new Error("Options is required as 1st parameter");
    }

    var o = options;
    var requiredOptions = ["callbackUrl", "botSecret", "loginChannelId", "loginChannelSecret", "botToken"];
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

        return [];
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

        if(message.length < 1 && message.length > 2000){
            return new Error("Message length is out of range [1,2000].");
        }
        
        line_request
            .post('/bot/message/push', {
                to: target.id,
                messages: [{
                    type: 'text',
                    text: message
                }]
            }, this.options.botToken)
            .then(function(info){
                callback(null, info);
            })
            .catch(function(error){
                callback(error);
            });

        return true;
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
        return line_request.callbackUrl(this.options.callbackUrl, state, this.options.loginChannelId);
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

        var code = req.query.code;
        var state = req.query.state;
        var callback_url = req.query.callback;

        var callback = new URI(callback_url);
            callback.setQuery('callback', callback_url);

        callback_url = callback.toString();

        if(!callback_url || !state || !code){
            return false;
        }

        var access_token = null;

        line_request
            .postForm('/oauth/accessToken', {
                'grant_type': 'authorization_code',
                'client_id': this.options.loginChannelId,
                'client_secret': this.options.loginChannelSecret,
                'code': code,
                'redirect_uri': callback_url
            }).then(function(info) {
                access_token = info.access_token;
                return line_request.get('/profile', {}, info.access_token);
            }).then(function(info){
                callback({
                    user: {
                        id: info.userId
                    },
                    access_token: access_token
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
        if(req.method.toLowerCase() == 'post'){
            return false;
        }

        var x_line_signature = req.get('X-Line-Signature');
        if(!x_line_signature){
            return false;
        }

        if(rawBody){
            var hmac = crypto.createHmac('sha256', this.options.botSecret);
            hmac.update(rawBody, "utf-8");

            var digest = hmac.digest('base64');
            if(digest === x_line_signature){
                return true;
            }else{
                return false;
            }
        }
        return true;
    }.bind(this);
};
