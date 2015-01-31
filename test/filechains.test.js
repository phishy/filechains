var execSync = require('exec-sync');
var fs = require('fs');
var tmp = require('temporary');
var path = require('path');
var Action = require('../filechains').Action;
var Workflow = require('../filechains').Workflow;
var Sftp = require('../modules/protocols/sftp');
var rsync = require('../modules/protocols/rsync');

var assert = require('chai').assert;
var expect = require('chai').expect;

var dirname = '/tmp/filechains';

var user = process.env.USER;
var dataPath = path.resolve(__dirname, 'data');
var fixturePath = path.resolve(__dirname, 'fixtures');

beforeEach(function () {
    execSync('rm -rf ' + dataPath);
    execSync('cp -R ' + fixturePath + ' ' + dataPath);
    execSync('rm -rf /tmp/filechains');
    execSync('mkdir /tmp/filechains');
    execSync('mkdir /tmp/filechains/out');
    execSync('touch /tmp/filechains/filechains.file1');
    execSync('touch /tmp/filechains/anotherfile');
});

describe('Rsync', function () {
    describe('#put', function(){
        it('should send files using ssh protocol');
        it('should send files using local protocol');
        it('should send files given matching pattern and delete them', function(done){
            var action = {
                to: 'rsync://' + user + '@localhost/' + dataPath + '/out',
                match: 'file1*',
                remove: true,
                moveTo: dataPath + '/out'
            };
            var files = fs.readdirSync(dataPath + '/in').map(function(m){
                return dataPath + '/in/' + m;
            });
            rsync.put(action, files).then(function (files) {
                var expected = [ dataPath + '/out/file1' ];
                assert.deepEqual(files, expected);
                done();
            }).catch(function(err){
                done(err);
            });
        }),
        it('should send $files to moveTo and remove them if remove is true', function(done){
            var action = {
                moveTo: dataPath + '/out',
                remove: true
            };
            var files = [
                    dataPath + '/in/file1',
                    dataPath + '/in/file2'
            ];
            rsync.put(action, files).then(function(files){
                var expected = [
                        dataPath + '/out/file1',
                        dataPath + '/out/file2'
                ];
                assert.deepEqual(files, expected);
                assert.deepEqual(files, expected);
                var srcFiles = fs.readdirSync(dataPath + '/in');
                assert.deepEqual(srcFiles, []);
                debugger;
                done();
            });
        });
        it ('should send $files to moveTo', function(done){
            // rsync file1 file2 dest/ -> files:null moveTo:dest
            var action = {
                moveTo: dataPath + '/out'
            };
            var files = [
                    dataPath + '/in/file1',
                    dataPath + '/in/file2'
            ];
            rsync.put(action, files).then(function(files){
                var expected = [
                    dataPath + '/out/file1',
                    dataPath + '/out/file2'
                ];
                assert.deepEqual(files, expected);
                done();
            });
        });
    });
    describe('#get', function () {
        it('should retrieve files given src, dest, and match pattern', function(done){
            var action = {
                files: 'rsync://' + user + '@localhost/' + dataPath + '/in',
                match: 'pattern*',
                remove: true,
                moveTo: dataPath + '/out'
            };
            rsync.get(action).then(function (files) {
                assert.deepEqual(files, []);
                done();
            }).catch(function(err){
                done(err);
            });
        });
        it('should throw error when moveTo is missing', function(done){
            var action = {
                files: 'rsync://' + user + '@localhost/' + dataPath + '/in'
            };
            expect(function() { rsync.get(action) }).to.throw('You must specify a destination via `moveTo`');
            done();
        });
        it('should throw error when moveTo is missing', function(done){
            var action = {
                files: 'rsync://' + user + '@localhost/' + dataPath + '/in'
            };
            expect(function() { rsync.get(action) }).to.throw('You must specify a destination via `moveTo`');
            done();
        });
        it('should throw error when action is missing', function(done){
            expect(function() { rsync.get() }).to.throw('You must supply `action` parameter');
            done();
        });
        it('should retrieve files given src and dest', function (done) {
            // rsync src/ dest/ -> files:src moveTo:dest
            var action = {
                files: 'rsync://' + user + '@localhost/' + dataPath + '/in',
                moveTo: dataPath + '/out'
            };
            rsync.get(action).then(function (files) {
                var expected = [
                    dataPath + '/out/file1',
                    dataPath + '/out/file2'
                ];
                assert.deepEqual(files, expected);
                done();
            });
        });
        it('should retrieve files and remove them', function(done){
            var action = {
                files: 'rsync://' + user + '@localhost/' + dataPath + '/in',
                moveTo: dataPath + '/out',
                remove: true
            };
            rsync.get(action).then(function (files) {
                var expected = [
                        dataPath + '/out/file1',
                        dataPath + '/out/file2'
                ];
                assert.deepEqual(files, expected);
                var srcFiles = fs.readdirSync(dataPath + '/in');
                assert.deepEqual(srcFiles, []);
                done();
            });
        });
        it('should retrieve files using privateKey and passphrase');
        it('should retrieve files that match a pattern');
    });
});

//describe('Sftp', function(){
//    it('should put files and return an array of promises', function(done){
//        var options = {
//            host: 'localhost',
//            username: 'jeff',
//            pathname: '/tmp/filehains'
//        };
//        var files = [
//            '/tmp/filechains/filechains.file1',
//            '/tmp/filechains/anoterfile'
//        ];
//        Sftp.put(files, options).then(function(files){
//            debugger;
//        }).catch(function(err){
//            // if an operation fail, it should log correctly and stop
//            done(err);
//        });
//    });
//});

describe('Workflow', function () {
    it('should fetch all files anf sftp them to remote', function (done) {
        Workflow.run([
            { 'fetch files': {
                files: dataPath + '/in'
            }},
            { 'sftp files to remote': {
                to: 'sftp://jeff@localhost/' + dataPath + '/out'
            }}
        ]).then(function () {

        }).catch(function (err) {
            done(err);
        });
    });
    it('should run actions passing the resultant filename into each one', function (done) {
        Workflow.run([
            { 'fetch files over ssh': {
                files: dataPath + '/in',
                moveTo: dataPath + '/out'
            }},
            { 'chmod files': {
                do: 'chmod 777 {$file}'
            }}
        ]).then(function () {
            done();
        }).catch(function (err) {
            done(err);
        });
    });
});

describe('Action', function () {
    it('should fetch all files from local path and not remove them', function (done) {
        var a = { 'fetch a list of files from local path': {
            files: dataPath + '/in',
            moveTo: dataPath + '/out',
            remove: false
        }};
        new Action(a).then(function (files) {
            var expected = [
                '/Users/jeff/www/broad/filechains/test/data/out/file1',
                '/Users/jeff/www/broad/filechains/test/data/out/file2'
            ];
            assert.deepEqual(files, expected);
            var inFiles = fs.readdirSync(dataPath + '/in');
            assert.equal(dataPath + '/in/' + inFiles[0], '/Users/jeff/www/broad/filechains/test/data/in/file1');
            assert.equal(dataPath + '/in/' + inFiles[1], '/Users/jeff/www/broad/filechains/test/data/in/file2');
            done();
        }).catch(function (err) {
            done(err);
        });
    });
    it('should fetch all files from local path', function (done) {
        var a = { 'fetch a list of files from local path': {
            files: dataPath + '/in',
            moveTo: dataPath + '/out'
        }};
        new Action(a).then(function (files) {
            var expected = [
                '/Users/jeff/www/broad/filechains/test/data/out/file1',
                '/Users/jeff/www/broad/filechains/test/data/out/file2'
            ];
            assert.deepEqual(files, expected);
            done();
        }).catch(function (err) {
            done(err);
        });
    });
    it('should fetch all files and not remove them', function (done) {
        var a = { 'fetch a list of files over ssh': {
            files: 'sftp://jeff@localhost' + dataPath + '/in',
            privateKey: '/Users/jeff/.ssh/filechains_rsa',
            moveTo: dataPath + '/out',
            remove: false
        }};
        new Action(a).then(function (files) {
            var remoteFiles = fs.readdirSync(dataPath + '/in');
            var localFiles = fs.readdirSync(dataPath + '/out');
            assert.equal(remoteFiles.length, 2);
            debugger;
            assert.deepEqual(localFiles, ['file1', 'file2']);
            done();
        }).catch(function (err) {
            done(err);
        });
    });
    it('should fetch all files and remove them by default', function (done) {
        var a = { 'fetch a list of files over ssh': {
            files: 'sftp://jeff@localhost' + dataPath + '/in',
            privateKey: '/Users/jeff/.ssh/filechains_rsa',
            moveTo: dataPath + '/out'
        }};
        new Action(a).then(function (files) {
            // ensure files have been deleted
            // ensure two new files are created
            var remoteFiles = fs.readdirSync(dataPath + '/in');
            var localFiles = fs.readdirSync(dataPath + '/out');
            assert.equal(remoteFiles.length, 0);
            assert.deepEqual(localFiles, ['file1', 'file2']);
            done();
        }).catch(function (err) {
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
    it('should do a command and then poll directory for new files');
    it('should fetch a list of files and do a command', function (done) {
        var a = { 'fetch a list of files over ssh and do a command': {
            files: 'sftp://jeff@localhost' + dirname,
            privateKey: '/Users/jeff/.ssh/filechains_rsa'
        }};
        var b = { 'chmod each files': {
            do: 'chmod 777 {$file} {$files}'
        }};
        new Action(a).then(function (files) {
            new Action(b, files, { debug: true }).then(function (files) {
                assert(files.length == 2);
                done();
            });
        });
    });
});

