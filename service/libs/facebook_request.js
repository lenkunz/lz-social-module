var URI = require('urijs');
var request_base = require('./base_request');

module.exports = {
    callbackUrl: function(fb_username, state){
        if(state){
            return "https://m.me/" + fb_username + "?ref=" + state;
        }else{
            return "https://m.me/" + fb_username;            
        }
    },
    postForm: function(endpoint, data, accessToken){
        var options = {
            method: 'POST',
            url: "https://graph.facebook.com/v2.6" + endpoint
        };

        return request_base.form(endpoint, options, data, accessToken, 'OAuth');
    },
    post: function(endpoint, data, accessToken){
        var options = {
            method: 'POST',
            url: "https://graph.facebook.com/v2.6" + endpoint
        };

        return request_base.json(endpoint, options, data, accessToken, 'OAuth');
    },
    get: function(endpoint, data, accessToken){
        var options = {
            method: 'GET',
            url: "https://graph.facebook.com/v2.6" + endpoint
        };
        return request_base.json(endpoint, options, data, accessToken, 'OAuth');
    }
};