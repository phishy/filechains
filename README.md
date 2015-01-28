# filechains #

Filechains is a descriptive way to fetch, transform, and transmit a collection of files using a JSON-style language.

### example ###

```
Workflow.run([
    { 'watch directory for files': {
        files: 'sftp://user@host/tmp',
        watch: true
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