var execSync = require('exec-sync');
var fs = require('fs');
var assert = require('chai').assert;
var tmp = require('temporary');
var path = require('path');

var Action = require('./filechains.js').Action;
var Workflow = require('./filechains.js').Workflow;

var dirname = '/tmp/filechains';

before(function () {
    execSync('rm -rf /tmp/filechains');
    execSync('mkdir /tmp/filechains');
    execSync('mkdir /tmp/filechains/out');
    execSync('touch /tmp/filechains/filechains.file1');
    execSync('touch /tmp/filechains/anotherfile');
});

describe('Workflow', function(){
    it('should run actions passing the resultant filename into each one', function(done){
        Workflow.run([
            { 'fetch files over ssh': {
                files: 'sftp://jeff@localhost' + dirname,
                privateKey: '/Users/jeff/.ssh/filechains_rsa'
            }}
        ]).then(function(files){
            assert(files.length == 2);
            done();
        });
    });
});

describe('Action', function () {
    it('should fetch all files into tmp dir', function (done) {
        var a = { 'fetch a list of files over ssh': {
            files: 'sftp://jeff@localhost' + dirname,
            privateKey: '/Users/jeff/.ssh/filechains_rsa'
        }};
        var action = new Action(a);
        action.then(function (files) {
            assert(files.length == 2);
            done();
        }).catch(function(err){
            done(err);
        });
    });
    it('should fetch all files matching pattern into tmp dir', function (done) {
        var a = { 'fetch a list of files over ssh': {
            files: 'sftp://jeff@localhost' + dirname,
            match: 'filechains.*',
            privateKey: '/Users/jeff/.ssh/filechains_rsa'
        }};
        var action = new Action(a);
        action.then(function (files) {
            assert(files.length == 1);
            done();
        });
    });
    it('should fetch a list of files and do a command', function(done){
        var a = { 'fetch a list of files over ssh and do a command': {
            files: 'sftp://jeff@localhost' + dirname,
            privateKey: '/Users/jeff/.ssh/filechains_rsa'
        }};
        var b = { 'chmod each files': {
            do: 'chmod 777 {$file}'
        }};
        new Action(a).then(function(files){
            new Action(b, files).then(function(files){
                assert(files.length == 2);
                done();
            });
        });
    });
});

