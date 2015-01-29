var execSync = require('exec-sync');
var fs = require('fs');
var assert = require('chai').assert;
var tmp = require('temporary');
var path = require('path');

var Action = require('../filechains').Action;
var Workflow = require('../filechains').Workflow;

var dirname = '/tmp/filechains';
var dataPath = path.resolve(__dirname, 'data');
var fixturePath = path.resolve(__dirname, 'fixtures');

beforeEach(function () {
    console.log('resetting data');
    execSync('rm -rf ' + dataPath);
    execSync('cp -R ' + fixturePath + ' ' + dataPath);
    execSync('rm -rf /tmp/filechains');
    execSync('mkdir /tmp/filechains');
    execSync('mkdir /tmp/filechains/out');
    execSync('touch /tmp/filechains/filechains.file1');
    execSync('touch /tmp/filechains/anotherfile');
});

describe('Workflow', function () {
    it('should run actions passing the resultant filename into each one', function (done) {
        Workflow.run([
            { 'fetch files over ssh': {
                files: dataPath + '/in',
                moveTo: dataPath + '/out'
            }},
            { 'chmod files': {
                do: 'chmod 777 {$file}'
            }}
        ]).then(function(){
            done();
        }).catch(function(err){
            done(err);
        });
    });
});

describe('Action', function () {
    it('should fetch all files from local path and not remove them', function(done){
        var a = { 'fetch a list of files from local path': {
            files: dataPath + '/in',
            moveTo: dataPath + '/out',
            remove: false
        }};
        new Action(a).then(function(files){
            var expected = [
                '/Users/jeff/www/broad/filechains/test/data/out/file1',
                '/Users/jeff/www/broad/filechains/test/data/out/file2'
            ];
            assert.deepEqual(files, expected);
            var inFiles = fs.readdirSync(dataPath + '/in');
            assert.equal(dataPath +'/in/'+ inFiles[0], '/Users/jeff/www/broad/filechains/test/data/in/file1');
            assert.equal(dataPath +'/in/'+ inFiles[1], '/Users/jeff/www/broad/filechains/test/data/in/file2');
            done();
        }).catch(function(err){
            done(err);
        });
    });
    it('should fetch all files from local path', function(done){
        var a = { 'fetch a list of files from local path': {
            files: dataPath + '/in',
            moveTo: dataPath + '/out'
        }};
        new Action(a).then(function(files){
            var expected = [
                '/Users/jeff/www/broad/filechains/test/data/out/file1',
                '/Users/jeff/www/broad/filechains/test/data/out/file2'
            ];
            assert.deepEqual(files, expected);
            done();
        }).catch(function(err){
            done(err);
        });
    });
    it('should fetch all files and not remove them', function(done){
        var a = { 'fetch a list of files over ssh': {
            files: 'sftp://jeff@localhost' + dataPath + '/in',
            privateKey: '/Users/jeff/.ssh/filechains_rsa',
            moveTo: dataPath + '/out',
            remove: false
        }};
        new Action(a).then(function(files){
            var remoteFiles = fs.readdirSync(dataPath + '/in');
            var localFiles = fs.readdirSync(dataPath + '/out');
            assert.equal(remoteFiles.length, 2);
            debugger;
            assert.deepEqual(localFiles, ['file1', 'file2']);
            done();
        }).catch(function(err){
            done(err);
        });
    });
    it('should fetch all files and remove them by default', function(done){
        var a = { 'fetch a list of files over ssh': {
            files: 'sftp://jeff@localhost' + dataPath + '/in',
            privateKey: '/Users/jeff/.ssh/filechains_rsa',
            moveTo: dataPath + '/out'
        }};
        new Action(a).then(function(files){
            // ensure files have been deleted
            // ensure two new files are created
            var remoteFiles = fs.readdirSync(dataPath + '/in');
            var localFiles = fs.readdirSync(dataPath + '/out');
            assert.equal(remoteFiles.length, 0);
            assert.deepEqual(localFiles, ['file1', 'file2']);
            done();
        }).catch(function(err){
            done(err);
            done(err);
        });
    });
    it('should fetch all files into moveTo directory', function (done) {
        var a = { 'fetch a list of files over ssh': {
            files: 'sftp://jeff@localhost' + dirname,
            privateKey: '/Users/jeff/.ssh/filechains_rsa',
            moveTo: dataPath + '/out'
        }};
        new Action(a).then(function (files) {
            var expected = [
                '/Users/jeff/www/broad/filechains/test/data/out/anotherfile',
                '/Users/jeff/www/broad/filechains/test/data/out/filechains.file1'
            ];
            assert.deepEqual(files, expected);
            done();
        }).catch(function (err) {
            done(err);
        });
    });
    it('should fetch all files into tmp dir', function (done) {
        var a = { 'fetch a list of files over ssh': {
            files: 'sftp://jeff@localhost' + dirname,
            privateKey: '/Users/jeff/.ssh/filechains_rsa'
        }};
        var action = new Action(a);
        action.then(function (files) {
            assert.equal(files.length, 2);
            assert(files[0].search('/var/folders') > -1);
            done();
        }).catch(function (err) {
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
    it('should fetch a list of files and do a command', function (done) {
        var a = { 'fetch a list of files over ssh and do a command': {
            files: 'sftp://jeff@localhost' + dirname,
            privateKey: '/Users/jeff/.ssh/filechains_rsa'
        }};
        var b = { 'chmod each files': {
            do: 'chmod 777 {$file}'
        }};
        new Action(a).then(function (files) {
            new Action(b, files).then(function (files) {
                assert(files.length == 2);
                done();
            });
        });
    });
});

