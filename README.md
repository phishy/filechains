## Description ##

Filechains is a descriptive way to fetch, transform, and transmit a collection of files using a JSON-style language.

## Installation ##

`npm install -g filechains`

`filechains workflow.json`

## Examples ##

### Retrieve files via rsync, chmod them, and zip them 

```
Workflow.run([
    { 'fetch files from directory': {
        files: 'sftp://user@host/tmp'
    }},
    { 'change permission': {
        do: 'chmod 600 {$file}'
    }},
    { 'timestamp each file': {
        do: 'mv {$file} {$file}_{date}',
        using: {
            date: (function(){
                return new Date();
            })()
        }
    }},
    { 'zip files': {
        do: 'tar -czf files.tar.gz {$files}'
    }}
]);
```

## Options ##

* files - string - input URI for files to fetch
* to - string - output URL for files to send
* match - string - a glob-compatible pattern for matching files to send
* privateKey - path - path to private key for use with sftp
* passphrase - string - passphrase for privateKey
* do - string - command to perform on each file. $file is an automatic variable containing the filename
* moveTo - string - path to move files to
* remove - bool - Default true removes files foundnd. false to leave them at the source
* using - object - keys defined in this object are interpolated in commands (files/do) using brace syntax
