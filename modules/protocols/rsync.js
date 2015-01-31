var exec = require('child_process').exec;
var Promise = require('bluebird');
var glob = require('glob');
var parse = require('url-parse');
var url = require('url');
var interpolate = require('interpolate');
var _ = require('lodash');
var log = require('captains-log')();

module.exports = {
    /**
     * Normalizes defaults options
     *
     * @param options
     * @returns {*}
     * @private
     */
    _defaults: function() {
        vars = {
            flags: ''
        };
        for (var i = 0; i < arguments.length; i++) {
            _.defaults(vars, arguments[i]);
        }
        return vars;
    },
    /**
     * Outputs string given an associative array
     *
     * @param flags
     * @returns {string}
     * @private
     */
    _options: function(flags) {
        var out = '';
        for (k in flags) {
            if (flags[k]) {
                out += k +'="' + flags[k] + '" ';
            } else {
                out += k + ' ';
            }
        }
        return out;
    },
    /**
     * Get files from source
     *
     * @param action
     * @returns {*}
     */
    get: function(action, files) {

        if (!action) {
            throw new Error('You must supply `action` parameter');
        }

        if ('!files' in action) {
            throw new Error('You must specify a source via `files`');
        }
        if (!('moveTo' in action)) {
            throw new Error('You must specify a destination via `moveTo`');
        }

        var flags = {};

        var vars = this._defaults({
            moveTo: action.moveTo,
            pathname: parse(action.files).pathname.replace('//', '')
        }, action.using, parse(action.files));

        if ('remove' in action && action.remove) {
            flags['--remove-sent-files'] = null;
        }

        if ('match' in action) {
            flags['--include'] = action.match;
            flags['--exclude'] = '*';
        }

        vars.flags = this._options(flags);

        var cmd = interpolate("rsync -r {flags} {username}@{host}:/{pathname}/ {moveTo}/", vars);
        if (action.debug) log.debug(cmd);

        var def = Promise.defer();
        exec(cmd, function(err, stdout, stderr){
            if (err) return def.reject(err);
            log.debug('stdout', stdout);
            log.debug('stderr', stderr);
            glob(vars.moveTo + '/**', { nodir: true }, function(err, files){
                if (err) return def.reject(err);
                def.resolve(files);
            });
        });
        return def.promise;
    },
    /**
     * Puts files to destination
     *
     * @param action
     * @param files
     * @returns {*}
     */
    put: function(action, files) {

        if (!action) {
            throw new Error('You must supply `action` parameter');
        }

        if ('!files' in action) {
            throw new Error('You must specify a source via `files`');
        }
        if (!('moveTo' in action)) {
            throw new Error('You must specify a destination via `moveTo`');
        }

        var vars = this._defaults({
            moveTo: action.moveTo,
            files: files.join(' ')
        }, action.using);

        var flags = {};

        if ('remove' in action && action.remove) {
            flags['--remove-sent-files'] = null;
        }

        if ('match' in action) {
            flags['--include'] = action.match;
            flags['--exclude'] = '*';
        }

        vars.flags = this._options(flags);

        var moveTo = url.parse(vars.moveTo);
        delete moveTo.protocol;
        vars.moveTo = moveTo.format().replace('//', '');
        vars.moveTo = vars.moveTo.replace('/', ':/');

        var cmd = interpolate("rsync -r {flags} {files} {moveTo}", vars);
        log.debug(cmd);

        var def = Promise.defer();
        exec(cmd, function(err, stdout, stderr){
            if (err) return def.reject(err);
            log.debug('stdout', stdout);
            log.debug('stderr', stderr);
            glob(vars.moveTo + '/**', { nodir: true }, function(err, files){
                if (err) return def.reject(err);
                def.resolve(files);
            });
        });
        return def.promise;
    }
};

