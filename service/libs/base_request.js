var request = require('request');
var form_data_encode = require('form-urlencoded');
var Promise = require("promise-polyfill");

var form = module.exports.form = function(endpoint, options, data, accessToken, accessType){
    options.headers = options.headers || {};
    options.headers['Content-type'] = 'application/x-www-form-urlencoded';
    options.body = form_data_encode(data);

    if(accessToken){
        accessType = accessType || 'Bearer';
        options.headers['Authorization'] = accessType + " " + accessToken;
    }

    return base(options, endpoint);    
}

var json = module.exports.json = function(endpoint, options, data, accessToken, accessType){
    options.headers = options.headers || {};
    options.headers['Content-type'] = 'application/json';
    options.body = JSON.stringify(data);

    if(accessToken){
        accessType = accessType || 'Bearer';
        options.headers['Authorization'] = accessType + " " + accessToken;
    }

    return base(options, endpoint);
}

var base = module.exports.base = function(options, endpoint){
    return new Promise(function(resolve, reject) {
        request(options, function(error, response, body){
            if(!error && response.statusCode == 200){
                var info = JSON.parse(body);
                resolve(info)
            }else{
                var error = JSON.parse(body);
                error.endpoint = endpoint;

                reject({
                    code: response.statusCode,
                    data: error
                });
            }
        });
    });    
};
