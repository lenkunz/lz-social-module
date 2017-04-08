# Facebook and LINE module for notification service
This module made for sending and handle messenger service of Facebook and LINE without other purpose. 

** Usage of header signature verification is not guaranteed. Because some NodeJS framework (like express.js) modify the request body before library can access to it. **

## Overview
This module can be normally called like normal node module.
It was not bundled with webpack or other bundler script.
```javascript
var service = require('<path_to_module>');
```

## Requirement
It is general NodeJS module which is not bundled with any bundler script and not using ES 2015 code style.

## Installation
Just copy this module to where you prefer and run **npm install** on target directory.

## Facebook module creation
To initialize facebook module just require the module and create instance of facebook

```javascript
var service = require('<path_to_module>');
var FB = new service.Facebook({
    webhookToken: "Facebook webhook token using to verify the webhook.",
    accountLinkUrl: "This is url that will be using as callback when user click on account_link message.",
    pageToken: "Access token for facebook page.",
    appSecret: "Secret key for chat app",
    pageUsername: "Username of facebook page."
});
```
All options property is required. You must provide all of them.

## LINE module creation
To initialize LINE module just require the module and create instance of facebook

```javascript
var service = require('<path_to_module>');
var LINE = new service.Line({
    callbackUrl: "Callback for redirect user to web.",
    botSecret: "Secret key of bot channel.",
    botToken: "Access token of bot channel.",
    loginChannelId: "Id of LINE login channel.",
    loginChannelSecret: "Secret key of LINE login channel."
});
```
All options property is required. You must provide all of them.

## Simple user entrance process
*For LINE/Facebook*

Simplest way made user connected to your service is to prepare the state and handle the webhook.

This module was designed to handle only the process related to messing notify. So you can simply using module function.

### Get the entry URL
Both LINE and Facebook require user to follow specific URL to let it know that user want to message the app.
You can get that url by calling this function

```javascript
var facebookEntryURL = FB.auth.entryURL("state");
var lineEntryURL = LINE.auth.entryURL("state");
```

Where **state** is the string using to identify user to app in specific period of time.

*Permanent **state** string is not recommended for security reason.*

### Send Login action to user inbox - required for **Facebook** only
After user following the entry URL facebook will send webhook back to where you set it in app settings.

This service already has function to handle that process. But you need to provide it a HTTP request object. (mostly called as **req** in express.js and node http module)

```javascript
app.post('<path_to_callback_specified>', function(req, res, next){
    var data = FB.webhook.callbackPOST(req)
    
    if(data === false){
        return res.status(422).send('input not revalent');
    }

    data.forEach(function(data){
        var state = data.state;
        
        // If you decied not to send login message you can use user bellow to send message.
        // But it will not be permanent.
        var user = data.user;
        var userId = user.id;

        // You need to send login link to user.
        // By calling this function.
        FB.message.accountLink(user, state, "Please click this to login", function(){
            // After account_link message sent.
            next();
        });
    })
})
```

### Handle callback and process to get permanent user id
- For **Facebook** this will happen after user click on login link
- For **LINE** this will happen after user login after followed the entry url.

#### Facebook
```javascript
// This will be a normal webpage
app.get('<path_to_callback_url_in_option>', function(req, res, next){
    FB.auth.callback(req, function(err, data){
        if(err){
            return res.status(500).send("There is an error");
        }

        var state = data.state;

        // User using to send the message
        var user = data.user;
        var userId = user.id;

        // You must redirect user to this url to finish the process
        var redirect = data.redirectURL;

        next();
    });
});
```

#### LINE
```javascript
app.get('<path_to_callback_url_in_option>', function(req, res, next){
    LINE.auth.callback(req, function(err, data){
        if(err){
            return res.status(500).send("There is an error");
        }

        var state = data.state;

        // User using to send the message
        var user = data.user;
        var userId = user.id;

        next();
    });
});
```

## Send the message
To send message to user. The service need user object which has structure.
```json
{
    "id": "user or channel id"
}
```

### Facebook
```javascript
FB.message.text(user, "Hello, World!", function(err){
    // When message were send.
});
```

### Line
```javascript
LINE.message.text(user, "Hello, World", function(err){
    // When message were send.
});
```

## Webhook handling
### Facebook
#### Endpoint confirmation
To use **Facebook** webhook. It require the service to confirm it status by sending ***GET** request* to webhook endpoint
which contain secret word. You need to provide it in **options.webhookToken**

You can choose to handle it manually by accepts all the request or using service function to handle it.

```javascript
app.get('<webhook_endpoint>', function(req, res){
    var result = FB.webhook.callbackGET(req);
    if(result === false){
        return res.status(401, "request is invalid");
    }

    return res.status(200).send(result);
});
```

#### General webhook handle
This service only handle the webhook specific to the its function. 
You can also handle it manually to get other webhook. This service contains the webhook filter that can filter some of webhook that not for your app.
```javascript
app.post('<webhook_endpoint>', function(req, res, next){
    if(!FB.webhook.webhookFilter(req)){
        return res.status(401, "request is invalid");
    }

    return next();
});
```
