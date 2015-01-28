var Log = require('log')
    , log = new Log('info');

var Promise = require('bluebird');
var exec = require('child_process').exec;
var interpolate = require('interpolate');
var parse = require('url-parse');
var fs = require('fs');
var tmp = require('temporary');
var _ = require('lodash');

var sftp = require('./sftp');

/**
 * Capture file list, stdout, stderr
 * @constructor
 */
function Action(action, files) {

    var def = Promise.defer();

    var desc = Object.keys(action)[0];
    var a = action[desc];

    if (!files && !('files' in a)) {
        throw new Error('missing source files');
    }

    if (!('using' in a)) {
        a.using = {};
    }

    if ('do' in a) {
        files.forEach(function(file){
            a.using.$file = file;
            cmd = interpolate(a.do, a.using);
            log.debug({ name: desc, cmd: cmd });
            exec(cmd, function (err, stdout, stderr) {
                if (err) throw err;
                log.info({ name: desc, stdout: stdout, stderr: stderr });
                return def.resolve(files);
            });
        });
    }

    if ('files' in a) {
        var dir = new tmp.Dir();
        switch (parse(a.files).protocol) {
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

Workflow.run = function (actions) {
    var files = [];
    return Promise.each(actions, function (action) {
        files = new Action(action, files);
    }).then(function(){
        return files;
    });
};

module.exports = {
    Action: Action,
    Workflow: Workflow
};
