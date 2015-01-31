/**
 * SFTP adaptor
 *
 * @param action
 * @param dir
 */
var Connection = require('ssh2');
var parse = require('url-parse');
var minimatch = require('minimatch');
var Promise = require('bluebird');
var fs = require('fs');
var _ = require('lodash');

module.exports = Sftp;

/**
 *
 * @constructor
 */
function Sftp() {
}

/**
 *
 * @param options
 */
Sftp.put = function(files, options) {
    var opts = {
        host: null,
        port: '',
        username: '',
        privateKey: '',
        passphrase: ''
    };
    _.defaults(options, opts);
    var def = Promise.defer();

    var conn = new Connection();
    conn.on('ready').then(function(){
        conn.sftp(function(err, sftp){
            if (err) def.reject(err);
            sftp.fastGet
        });
    });
};

/**
 *
 * @param action
 * @param dir
 * @returns {*}
 */
Sftp.get = function (action, dir) {

    var def = Promise.defer();

    var url = parse(action.files, true);

    var files = [];

    var sshOptions = {
        host: url.host,
        port: url.port,
        username: url.username
    };

    if ('privateKey' in action) {
        sshOptions.privateKey = fs.readFileSync(action.privateKey);
    }

    if ('passphrase' in action) {
        sshOptions.passphrase = action.passphrase;
    }

    var conn = new Connection();
    conn.on('ready', function () {
        conn.sftp(function (err, sftp) {
            if (err) return def.reject(err);
            sftp.readdir(url.pathname, function (err, list) {
                if (err) throw err;

                var matches = [];
                list.forEach(function (item) {
                    // skip it file is a directory
                    if (item.longname[0] == 'd') {
                        return;
                    }
                    // if match pattern is defined, filter
                    if (!action.match) {
                        matches.push(item.filename);
                    } else {
                        if (minimatch(item.filename, action.match)) {
                            matches.push(item.filename);
                        }
                    }
                });

                var promises = [];
                matches.forEach(function (match) {
                    var p = new Promise(function (resolve, reject) {
                        sftp.fastGet(url.pathname + '/' + match, dir + '/' + match, function (err) {
                            if (err) return reject(err);
                            if (action.remove) {
                                sftp.unlink(url.pathname + '/' + match, function(err){
                                    if (err) return reject(err);
                                    files.push(dir + '/' + match);
                                    return resolve();
                                });
                            } else {
                                files.push(dir + '/' + match);
                                return resolve();
                            }
                        });
                    });
                    promises.push(p);
                });

                Promise.all(promises).then(function () {
                    conn.end();
                    return def.resolve(files);
                }).catch(function (err) {
                    conn.end();
                    throw err;
                });
            });
        });
    }).connect(sshOptions);

    return def.promise;
};

