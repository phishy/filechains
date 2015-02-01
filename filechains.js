var log = require('captains-log')();
var Promise = require('bluebird');
var exec = require('child_process').exec;
var interpolate = require('interpolate');
var parse = require('url-parse');
var fs = require('fs-extra');
var tmp = require('temporary');
var _ = require('lodash');
var path = require('path');
var glob = require('glob');
var logSymbols = require('log-symbols');

var sftp = require('./modules/protocols/sftp');

/**
 * Capture file list, stdout, stderr
 * @constructor
 */
function Action(action, files, options) {

    var def = Promise.defer();

    var desc = Object.keys(action)[0];
    var a = action[desc];

    if (!options) {
        options = {
            debug: false
        };
    }
    if (!files && !('files' in a)) {
        throw new Error('missing source files');
    }

    if (!('remove' in a)) {
        a.remove = false;
    }

    if (!('using' in a)) {
        a.using = {};
    }

    if (!('moveTo' in a)) {
        a.moveTo = new tmp.Dir().path;
    }

    if ('do' in a) {
        var commands = [];
        files.forEach(function(file){
            a.using.$dir = path.dirname(file);
            a.using.$file = file;
            a.using.$files = files.join(' ');
            cmd = interpolate(a.do, a.using);
            commands.push(cmd);
            if (options.debug) {
                log.debug(desc, cmd);
            }
        });
        exec(commands.join(';'), function (err, stdout, stderr) {
            if (err) {
                log.error(err);
                log.info(logSymbols.error, desc);
                return def.reject(err);
            }
            log.info(logSymbols.success, desc);
            glob(a.using.$dir + '/**', { nodir: true }, function(err, files){
                if (err) return def.reject(err);
                return def.resolve(files);
            });
        });
    }


    if ('to' in a) {
        a.moveTo = interpolate(a.to, a.using);
        var protocol = parse(a.to).protocol.replace(':', '');
        return require('./modules/protocols/' + protocol).put(a, files).then(function(files){
           log.info(logSymbols.success, desc);
           return def.resolve(files);
        }).catch(function(err){
            log.error(err);
            log.info(logSymbols.error, desc);
            return def.reject(err);
        });
    }

    if ('files' in a) {
        a.files = interpolate(a.files, a.using);
        var protocol = parse(a.files).protocol.replace(':', '');
        switch (protocol) {
            case 'rsync':
                require('./modules/protocols/rsync').get(a).then(function(files){
                    log.info(logSymbols.success, desc);
                    def.resolve(files);
                }).catch(function(err){
                    log.error(err);
                    return def.reject(err);
                });
                break;
            case '':
                var outfiles = [];
                fs.readdir(a.files, function(err, files){
                    if (err) return def.reject(err);
                    files.forEach(function(file){
                        var src = a.files +'/'+ file;
                        var dest = dir +'/'+ file;
                        outfiles.push(dest);
                        if (a.remove) {
                            fs.rename(src, dest, function(err){
                                if (err) def.reject(err);
                                if (options.debug) {
                                    log.debug(desc, dest);
                                }
                            });
                        } else {
                            fs.copy(src, dest, function(err){
                                if (err) def.reject(err);
                                if (options.debug) {
                                    log.debug(desc, dest);
                                }
                            });
                        }
                    });
                    def.resolve(outfiles);
                    return def.resolve(_.map(files, function(f){
                        return a.files + '/' + f;
                    }));
                });
                break;
            case 'sftp:':
                Sftp.get(a, dir).then(function(files){
                    if (options.debug) {
                        files.forEach(function(file){
                            log.debug("\t\t" + file +' -> ' + dir);
                        });
                    }
                    return def.resolve(files);
                });
                break;
        }
    }

    return def.promise;
}

function Workflow() {

}

/**
 * Calls a series of actions then returns the output
 *
 * @param actions
 * @returns {*}
 */
Workflow.run = function (actions, options) {
    var debug = (options && 'debug' in options && options.debug) ? true : false;
    var promise = Promise.resolve([]);
    actions.forEach(function (action) {
        promise = promise.then(function (outFiles) {
            if (debug) {
                log.debug(Object.keys(action)[0]);
                action.debug = true;
            }
            return new Action(action, outFiles, options);
        }).catch(function(err){
            log.error(err);
            // @todo perhaps something else we can do other than throw an exception?
            throw err;
        });
    });
    return promise;
};

module.exports = {
    Action: Action,
    Workflow: Workflow
};
