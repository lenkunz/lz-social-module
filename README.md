# Facebook and LINE module for notification service
This module made for sending and handle messenger service of Facebook and LINE without other purpose. 

** Usage of header signature verification is not guaranteed. Because some NodeJS framework (like express.js) modify the request body before library can access to it. **

## Table of Contents

<!-- TOC -->

- [Facebook and LINE module for notification service](#facebook-and-line-module-for-notification-service)
    - [Table of Contents](#table-of-contents)
    - [Overview](#overview)
    - [Requirement](#requirement)
    - [Installation](#installation)
    - [Service module initialize](#service-module-initialize)
        - [Facebook service](#facebook-service)
        - [LINE service](#line-service)
    - [Link app user to messenger API](#link-app-user-to-messenger-api)
        - [Redirect user to initialize the process](#redirect-user-to-initialize-the-process)
        - [Send login button to user's messenger - only for **Facebook**](#send-login-button-to-users-messenger---only-for-facebook)
        - [Get permanent user message **Chatbox ID**](#get-permanent-user-message-chatbox-id)
            - [Facebook](#facebook)
            - [LINE](#line)
    - [Send the message](#send-the-message)
        - [Message sending Facebook service](#message-sending-facebook-service)
        - [Message sending for Line service](#message-sending-for-line-service)
    - [Webhook handling](#webhook-handling)
        - [Facebook webhook handling](#facebook-webhook-handling)
            - [Endpoint confirmation](#endpoint-confirmation)
            - [General Facebook webhook handle](#general-facebook-webhook-handle)
        - [LINE webhook handling](#line-webhook-handling)
            - [General LINE webhook handle](#general-line-webhook-handle)

<!-- /TOC -->

## Overview
This module can be normally called like normal node module.
It was not bundled with webpack or other bundler script.

```javascript
var service = require('lz-social-module');
```

## Requirement

It is general NodeJS module which is not bundled with any bundler script and not using ES 2015 code style.

## Installation

```bash
npm install lz-social-module --save
```

## Service module initialize

### Facebook service

To initialize Facebook module you only need to create instance by following code.

```javascript
var service = require('lz-social-module');
var FB = new service.Facebook({
    webhookToken: "Facebook webhook token using to verify the webhook.",
    accountLinkUrl: "This is url that will be using as callback when user click on account_link message.",
    pageToken: "Access token for facebook page.",
    appSecret: "Secret key for chat app",
    pageUsername: "Username of facebook page."
});
```

All option properties are required. You must provide all of them.

### LINE service

To initialize LINE module you only need to create instance by following code.

```javascript
var service = require('lz-social-module');
var LINE = new service.Line({
    callbackUrl: "Callback for redirect user to web.",
    botSecret: "Secret key of bot channel.",
    botToken: "Access token of bot channel.",
    loginChannelId: "Id of LINE login channel.",
    loginChannelSecret: "Secret key of LINE login channel."
});
```

All option properties are required. You must provide all of them.

## Link app user to messenger API

For **LINE**/**Facebook**

The simplest way to sync your service with messenger API is to handle the **webhook**.

This module was designed to handle those process to link app's account with messenger API. So you can simply adapt our process to your app structure.
It was only compatible with ***NodeJS HTTP request style*** (e.g. Express.js)

### Redirect user to initialize the process

Both **LINE** and **Facebook** require user to follow specific generated URL to let it know that user allow the service to message them. Which called **Entry Point**.

You can get **Entry Point** URL by call these functions.

```javascript
// For Facebook
var facebookEntryURL = FB.auth.entryURL(state);
// For LINE
var lineEntryURL = LINE.auth.entryURL(state);
```

When **state** is the *string* that can use for identify the user to app in a specific period of time.

*Permanent **state** string is not recommended for security reason.*

### Send login button to user's messenger - only for **Facebook**

After user followed the **Entry Point** URL Facebook will send **OPEN_THREAD** webhook to where you set it in Facebook developer app console.

The service implements function that can handles the process. But you need to give it a HTTP request object. (mostly called as **req** in express.js and Node HTTP module)

```javascript
app.post('<webhook_endpoint>', function(req, res, next){
    var data = FB.webhook.callbackPOST(req);
    
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

### Get permanent user message **Chatbox ID** 

- For **Facebook** this will happens after user click the login link.
- For **LINE** this will happens after user login after followed the **Entry Point URL**.

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

To send message to user. The service need user object which has following structure.

```json
{
    "id": "user or channel id"
}
```

### Message sending Facebook service

```javascript
FB.message.text(user, "Hello, World!", function(err){
    // When message were send.
});
```

### Message sending for Line service

```javascript
LINE.message.text(user, "Hello, World", function(err){
    // When message were send.
});
```

## Webhook handling

### Facebook webhook handling

#### Endpoint confirmation

To use **Facebook** webhook. It requires the service to confirm its status by sending ***GET** request* to webhook endpoint
which contains **secret token**. You need to provide the **secret token** in **options.webhookToken**.

You can implements manually by accepts all the request or using service function to handle it.

```javascript
app.get('<webhook_endpoint>', function(req, res){
    var result = FB.webhook.callbackGET(req);
    if(result === false){
        return res.status(401, "request is invalid");
    }

    return res.status(200).send(result);
});
```

#### General Facebook webhook handle

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

### LINE webhook handling

#### General LINE webhook handle
By general LINE webhook handler will only filter the webhook and let all webhook pass.
```javascript
app.post('<webhook_endpoint>', function(req, res, next){
    var data = LINE.webhook.callbackPOST(req)
    
    if(data === false){
        return res.status(422).send('input not revalent');
    }

    next();
})
```

You can also handle it manually to get other webhook. This service contains the webhook filter that can filter some of webhook that not for your app.

```javascript
app.post('<webhook_endpoint>', function(req, res, next){
    if(!LINE.webhook.webhookFilter(req)){
        return res.status(401, "request is invalid");
    }

    return next();
});
```

