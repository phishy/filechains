var log = require('captains-log')();
var Promise = require('bluebird');
var exec = require('child_process').exec;
var interpolate = require('interpolate');
var parse = require('url-parse');
var fs = require('fs-extra');
var tmp = require('temporary');
var _ = require('lodash');

var sftp = require('./sftp');

/**
 * Capture file list, stdout, stderr
 * @constructor
 */
function Action(action, files, options) {

    var def = Promise.defer();

    var desc = Object.keys(action)[0];
    var a = action[desc];

    if (!files && !('files' in a)) {
        throw new Error('missing source files');
    }

    if (!('remove' in a)) {
        a.remove = true;
    }

    if (!('using' in a)) {
        a.using = {};
    }

    var dir = '';
    if ('moveTo' in a) {
        dir = a.moveTo;
    } else {
        dir = new tmp.Dir().path;
    }

    if ('do' in a) {
        files.forEach(function(file){
            a.using.$file = file;
            cmd = interpolate(a.do, a.using);
            if (options.debug) {
                log.debug(desc, cmd, a);
            }
            exec(cmd, function (err, stdout, stderr) {
                if (err) throw err;
                return def.resolve(files);
            });
        });
    }

    if ('files' in a) {
        switch (parse(a.files).protocol) {
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
                            });
                        } else {
                            fs.copy(src, dest, function(err){
                                if (err) def.reject(err);
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
                sftp(a, dir).then(function(files){
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
    if (options.debug) {
        log.debug('starting workflow', actions);
    }
    var files = [];
    var promise = Promise.resolve(files);
    actions.forEach(function (action) {
        promise = promise.then(function (outFiles) {
            return new Action(action, outFiles, options);
        });
    });
    return promise;
};

module.exports = {
    Action: Action,
    Workflow: Workflow
};
