var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var app = express();
const apiaiApp = require('apiai')("5d2422f8b65b4591b18c50a535e8f032");

app.set('port', (process.env.PORT || 5000));

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}));

// Process application/json
app.use(bodyParser.json());
app.use(express.static('img'));

// Index route
app.get('/', function (req, res) {
    res.send('Hello world, I am a chat bot');
});

// for Facebook verification
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === 'my_voice_is_my_password_verify_me') {
        res.send(req.query['hub.challenge']);
    }
    res.send('Error, wrong token');
});

// for API endpoint to process message. Token is applied at here.
var token = "EAAGZCsVC43fABALuCH5Vhhb3Uy90ZBNIEFAfnGHE75cwTijg6HuhkKErI3A5DfrDfdZADXeQtC6K01vEvgi9h4vvdOy1hD7EMItGeEOzVcJv6u6DIIGLZBU0Qvb4s967tXdt6KSZBYDkb6fmevDf0PMU7xu3mbW5mZCjdKbSv94AZDZD";

app.post('/webhook/', function (req, res) {
    messaging_events = req.body.entry[0].messaging;
    for (var i = 0; i < messaging_events.length; i++) {
        var event = req.body.entry[0].messaging[i];
        var sender = event.sender.id;
        if (event.message && event.message.text) {
            var text = event.message.text;
            if (text === 'Generic') {
                sendGenericMessage(sender);
            } else if(text === 'Jonathan') {
                sendGenericMessageWithPerson(sender);
                sendTextMessage(sender,"Is that you?",token);
                continue;
            }
            sendTextMessage(sender, text.substring(0, 200),token);
        }
        if (event.postback) {
            text = JSON.stringify(event.postback);
            sendTextMessage(sender, "Postback received: "+text.substring(0, 200), token);
        }
    }
    res.sendStatus(200);
});

app.post('/weatherai/',function (req, res) {

    if (req.body.result.action === 'weather') {
        // To retrieve weather information using weather api and pass back to messenger bot
        var city = req.body.result.parameters['geo-city'];
        var restUrl = 'http://api.openweathermap.org/data/2.5/weather?APPID=d6823f836aa55491dae56cce038c8a5a&q=' + city;

        request.get(restUrl, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                var json = JSON.parse(body);
                var msg = json.weather[0].description + ' and the temperature is ' + json.main.temp + ' *F';
                return res.json({
                    speech: msg,
                    displayText: msg,
                    source: 'weather'
                });
            } else {
                return res.status(400).json({
                    status: {
                        code: 400,
                        errorType: "Failed to look up the city name."
                    }
                });
            }
        });
    } else if(req.body.result.action === 'capital') {
        // Capital of place is in progress
        var place = req.body.result.parameters['geo-capital'];
        var placeRestUrl = '';
    }

});



// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
});


// helper function for echo back message
function sendTextMessage(sender, text) {

    var apiai = apiaiApp.textRequest(text, {
        sessionId: 'test_messaging' // use any arbitrary id
    });

    // display error if there's something wrong or apiai is not accessible with wrong token
    apiai.on('error',function(error){
        console.log(error);
    });

    // responded text
    apiai.on('response', function(response) {
        // Got a response from api.ai. Let's POST to Facebook Messenger
        var aiText = response.result.fulfillment.speech;
        var messageData =  {
            text: aiText
        };
        request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {access_token:token},
            method: 'POST',
            json: {
                recipient: {id:sender},
                message: messageData
            }
        }, function(error, response, body){
            if(error) {
                console.log("Error sending message:", error);
            } else if(response.body.error){
                console.log("Error:", resposnse.body.error);
            }
        });
    });

    // close or end the session (apiai)
    apiai.end();

}

function sendGenericMessage(sender) {
    messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "First card",
                    "subtitle": "Element #1 of an hscroll",
                    "image_url": "http://messengerdemo.parseapp.com/img/rift.png",
                    "buttons": [{
                        "type": "web_url",
                        "url": "https://www.messenger.com",
                        "title": "web url"
                    }, {
                        "type": "postback",
                        "title": "Postback",
                        "payload": "Payload for first element in a generic bubble"
                    }]
                }, {
                    "title": "Second card",
                    "subtitle": "Element #2 of an hscroll",
                    "image_url": "http://messengerdemo.parseapp.com/img/gearvr.png",
                    "buttons": [{
                        "type": "postback",
                        "title": "Postback",
                        "payload": "Payload for second element in a generic bubble"
                    }]
                }]
            }
        }
    };
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function sendGenericMessageWithPerson(sender) {
    messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "Jonathan Tan",
                    "subtitle": "Data scientist in microsoft",
                    "image_url": "https://warm-mountain-56806.herokuapp.com/jonathan.jpg",
                    "buttons": [{
                        "type": "web_url",
                        "url": "https://www.facebook.com/jtsz0112",
                        "title": "View Profile"
                    }, {
                        "type": "postback",
                        "title": "Postback",
                        "payload": "Geek Guy"
                    }]
                }, {
                    "title": "Ken Lau",
                    "subtitle": "Aviato Software Engineer",
                    "image_url": "http://messengerdemo.parseapp.com/img/gearvr.png",
                    "buttons": [{
                        "type": "web_url",
                        "url": "https://www.facebook.com/ken.lau.33",
                        "title": "View Profile"
                    }, {
                        "type": "postback",
                        "title": "Postback",
                        "payload": "Payload for second element in a generic bubble"
                    }]
                }]
            }
        }
    };
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}