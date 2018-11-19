# Installation

## Prerequisites

  - Download and install Elasticsearch and Kibana
  - Compatible with Elasticsearch and Kibana > 6.2

## Install plugin

``` shell
/usr/share/kibana/bin/kibana-plugin install files:///path/to/robocop.zip
cd /usr/share/kibana/plugins/robocop/
npm install
```

## Snapshot

To use snapshot, you must configure Elasticsearch to accept it.

1. Modify Elasticsearch configuration file to set the repository.
  * File system: `path.repo: ["/mount/backups"]`
  * URL: `repositories.url.allowed_urls: ["http://www.example.org/root/*", "https://*.myDomaine.com/*?*#*"]`
1. Create the repository in Elasticsearch (exemple for file systeme):
  * In the dev mode of Kibana:
  ```
	PUT _snapshot/.robocop-data
	{
	  "type": "fs",    
	  "settings": {
	    "location": "/mount/backups"
	  }
	}
    ```
  * With curl:
  ``` shell
	curl -XPUT 'http://localhost:9200/_snapshot/.robocop-data' -H 'Content-Type: application/json' -d '{
	    "type": "fs",
	    "settings": {
	        "location": "/mount/backups",
	    }
	}'
    ```

  Source:  https://www.elastic.co/guide/en/elasticsearch/reference/5.x/modules-snapshots.html#_repositories

## Script

Folder for script must be accessible by kibana. A good setting can be:

* `chown kibana folderName`
* `chmod 741 foldername`

``` shell
$ drwxr-xr-x   3 kibana root     4096 May 24 09:14 script
```
