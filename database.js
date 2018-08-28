const sqlite3 = require('sqlite3').verbose();

class Database {
    
    constructor() {
        this.db = new sqlite3.Database('./chat.db');
    }
    
    init() {
        this.db.serialize(() => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS users
                (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name UNIQUE,
                    registrationId,
                    identityKey,
                    pubSignedPreKey,
                    signedPreKeyId,
                    signature
                )
            `);
            this.db.run(`
                CREATE TABLE IF NOT EXISTS preKeys
                (
                    registrationId,
                    keyId,
                    pubPreKey
                )
            `);
            this.db.run(`
                CREATE TABLE IF NOT EXISTS messages
                (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sourceRegistrationId,
                    recipientRegistrationId,
                    body,
                    type,
                    timestamp DATETIME DEFAULT (datetime('now','localtime')),
                    fetched BOOLEAN NOT NULL DEFAULT 0
                )
            `);
        });
    }
    
    createUser(data) {
        const stmt = this.db.prepare(`
            INSERT INTO users
            (name, registrationId, identityKey, pubSignedPreKey, signedPreKeyId, signature)
            VALUES
            ($name, $registrationId, $identityKey, $pubSignedPreKey, $signKeyId, $signature)
        `);
        return new Promise((resolve, reject) => {
            stmt.run({
                $name: data.username,
                $registrationId: data.preKeyBundle.registrationId,
                $identityKey: data.preKeyBundle.identityKey,
                $pubSignedPreKey: data.preKeyBundle.signedPreKey.publicKey,
                $signKeyId: data.preKeyBundle.signedPreKey.keyId,
                $signature: data.preKeyBundle.signedPreKey.signature
            }, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
            stmt.finalize();
        });
    }

    createPreKeysForUser(registrationId, preKeys) {
        const stmt = this.db.prepare(`INSERT INTO preKeys (registrationId, keyId, pubPreKey) VALUES ($registrationId, $keyId, $pubPreKey)`);
        let preKeyPromises = preKeys.map(preKey => new Promise((resolve, reject) => {
            stmt.run({
                $registrationId: registrationId,
                $keyId: preKey.keyId,
                $pubPreKey: preKey.publicKey
            }, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        }));
        return Promise.all(preKeyPromises);
    }

    getFirstPreKeyByRegistrationId(registrationId) {
        const stmt = this.db.prepare(`SELECT * FROM preKeys WHERE registrationId = $registrationId ORDER BY keyId ASC LIMIT 1`);
        return new Promise((resolve, reject) => {
            stmt.get({$registrationId: registrationId}, (err, row) => {
                if (!err) { // row can also be null => preKey is optional!
                    resolve(row);
                } else {
                    reject(err);
                }
            });
            stmt.finalize();
        });
    }

    removePreKey(registrationId, keyId) {
        const stmt = this.db.prepare(`DELETE FROM preKeys WHERE registrationId = $registrationId AND keyId = $keyId`);
        return new Promise((resolve, reject) => {
            stmt.run({$registrationId: registrationId, $keyId: keyId}, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
            stmt.finalize();
        });
    }

    getUserById(id) {
        const stmt = this.db.prepare(`SELECT * FROM users WHERE id = $id`);
        return new Promise((resolve, reject) => {
            stmt.get({$id: id}, (err, row) => {
                if (!err && row) {
                    resolve(row);
                } else {
                    reject(err);
                }
            });
            stmt.finalize();
        });
    }

    getUserByName(name) {
        const stmt = this.db.prepare(`SELECT * FROM users WHERE name = $name`);
        return new Promise((resolve, reject) => {
            stmt.get({$name: name}, (err, row) => {
                if (!err) {
                    resolve(row);
                } else {
                    reject(err);
                }
            });
            stmt.finalize();
        });
    }

    getAllUsers() {
        const stmt = this.db.prepare(`SELECT * FROM users`);
        return new Promise((resolve, reject) => {
            stmt.all({}, (err, row) => {
                if (!err && row) {
                    resolve(row);
                } else {
                    reject(err);
                }
            });
            stmt.finalize();
        });
    }

    createMessage(data) {
        const stmt = this.db.prepare(`
            INSERT INTO messages
            (sourceRegistrationId ,recipientRegistrationId, body, type)
            VALUES
            ($sourceRegistrationId, $recipientRegistrationId, $body, $type)
        `);
        return new Promise((resolve, reject) => {
            stmt.run({
                $sourceRegistrationId: data.sourceRegistrationId,
                $recipientRegistrationId: data.recipientRegistrationId,
                $body: data.body,
                $type: data.type
            }, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
            stmt.finalize();
        });
    }

    getAllUnreadMessagesByRegistrationId(sourceRegistrationId, recipientRegistrationId) {
        const stmt = this.db.prepare(`
            SELECT * FROM messages
            WHERE sourceRegistrationId = $sourceRegistrationId
            AND recipientRegistrationId = $recipientRegistrationId
            AND fetched = 0
            ORDER BY timestamp ASC
        `);
        return new Promise((resolve, reject) => {
            stmt.all({
                $sourceRegistrationId: sourceRegistrationId,
                $recipientRegistrationId: recipientRegistrationId
            }, (err, rows) => {
                if (!err && rows) {
                    resolve(rows);
                } else {
                    reject(err);
                }
            });
            stmt.finalize();
        });
    }

    updateFetchedStatus(messageId) {
        const stmt = this.db.prepare(`UPDATE messages SET fetched = $fetched WHERE id = $messageId`);
        return new Promise((resolve, reject) => {
            stmt.run({$fetched: true, $messageId: messageId}, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
            stmt.finalize();
        });
    }
    
}

// singleton
const instance = new Database();
instance.init();
module.exports = instance;