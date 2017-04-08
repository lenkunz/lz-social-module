var URI = require('urijs');
var request_base = require('./base_request');

module.exports = {
    callbackUrl: function(callback_url, state, channel_id){
        var callback = new URI(callback_url);
        callback.setQuery('callback', callback_url);

        var uri = new URI('https://access.line.me/dialog/oauth/weblogin');
        uri.setQuery('response_type', 'code');
        uri.setQuery('client_id', channel_id);
        uri.setQuery('redirect_uri', callback.toString());
        uri.setQuery('state', state);

        return uri.toString();
    },
    postForm: function(endpoint, data, accessToken){
        var options = {
            method: 'POST',
            url: "https://api.line.me/v2" + endpoint
        };

        return request_base.form(endpoint, options, data, accessToken);
    },
    post: function(endpoint, data, accessToken){
        var options = {
            method: 'POST',
            url: "https://api.line.me/v2" + endpoint
        };

        return request_base.json(endpoint, options, data, accessToken);
    },
    get: function(endpoint, data, accessToken){
        var options = {
            method: 'GET',
            url: "https://api.line.me/v2" + endpoint
        };
        return request_base.json(endpoint, options, data, accessToken);
    }
};