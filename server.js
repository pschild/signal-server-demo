const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http').Server(app);

const UserManager = require('./UserManager');
const userManager = new UserManager();

const MessageManager = require('./MessageManager');
const messageManager = new MessageManager();

const PreKeyManager = require('./PreKeyManager');
const preKeyManager = new PreKeyManager();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cors());

// register new user
app.post(`/user`, (req, res) => {
    let result = null;
    userManager.register(req.body)
        .then(user => {
            result = user;
            return preKeyManager.createPreKeys(req.body);
        })
        .then(() => res.json({success: true, user: result}))
        .catch(err => res.json({success: false, message: err}));
});

// get public user information
app.get(`/user/:id`, (req, res) => {
    let result = null;
    userManager.getById(req.params.id)
        .then(user => {
            result = user;
            return preKeyManager.getFirstPreKeyByRegistrationId(user.registrationId);
        })
        .then(firstPreKey => {
            result.preKey = firstPreKey;
            res.json(result);
        })
        .catch(err => res.json({success: false, message: err}));
});

// check if a username already exists
app.get(`/user/name/:name`, (req, res) => {
    userManager.getByName(req.params.name)
        .then(user => res.json(user))
        .catch(err => res.json({success: false, message: err}));
});

// load all users
app.get(`/users`, (req, res) => {
    userManager.getAll()
        .then(users => res.json(users))
        .catch(err => res.json({success: false, message: err}));
});

// send a new message
app.post(`/message`, (req, res) => {
    messageManager.createMessage(req.body)
        .then(() => res.json({success: true}))
        .catch(err => res.json({success: false, message: err}));
});

// get a message for recipientRegistrationId, sent by sourceRegistrationId
app.get(`/messages/:sourceRegistrationId/:recipientRegistrationId`, (req, res) => {
    let result = [];
    let sourceRegistrationId = Number.parseInt(req.params.sourceRegistrationId);
    let recipientRegistrationId = Number.parseInt(req.params.recipientRegistrationId);
    messageManager.getAllUnreadByRegistrationId(sourceRegistrationId, recipientRegistrationId)
        .then(messages => {
            result = messages;
            let promises = messages.map(message => messageManager.updateFetchedStatus(message.id));
            return Promise.all(promises);
        })
        .then(() => res.json(result))
        .catch(err => res.json({success: false, message: err}));
});

http.listen(8081, function () {
    console.log(`App listening on port 8081!`);
});