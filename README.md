# Description

Robocop is a Kibana plugin providing alerts to monitor events in Elasticsearch.
By default he don't provide any access contrôle, you need to setting Kibana or Apache/Nginx filter.

#  Installation

## Prerequisites
  - Download and install Elasticsearch and Kibana
  - Compatible with elasticsearch and Kibana > 6.4

## For development
In the "plugins" folder of kibana:

```ShellSession
$ git clone <GIT_URL> robocop
$ cd robocop/
$ npm install
```

## For production
1 - Download the source and create the archive.

```
$ git clone <GIT_URL>
$ zip -r robocop kibana
```

3 - Install on the server
```
$ /usr/share/kibana/bin/kibana-plugin install files:///path/to/robocop.zip
$ cd /usr/share/kibana/plugins/robocop/
$ npm install
```

#  Quick configuration

In the file config/kibana.yml add the following line:

```
# Robocop
robocop.enabled: true

robocop.action.slack.enabled: true
robocop.action.slack.token: "xoxb-XXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
robocop.action.slack.name: "My bot"
robocop.action.slack.canal: "alert_channel"
robocop.action.slack.footer: ":heavy_minus_sign:"

robocop.action.mail.enabled: true
robocop.action.mail.to: "alert@compagny.com"
robocop.action.mail.from: "myBot@compagny.com"
robocop.action.mail.smtpHost: "host.compagny.com"
robocop.action.mail.subject: "[@[date.format('YYYY/MM/DD HH:mm:ss')]][@[alert.level]][@[alert.number]][@[alert.title]] @[result.hits.total]"

robocop.action.marvin.enabled: true

robocop.script.enabled: true
robocop.script.path: "/tmp/script/"

```

#  Snapshot

To use snapshot, you must configure Elasticsearch to accept it.

1) Modify Elasticsearch configuration file to set the repository.

```json
  File system : path.repo: ["/mount/backups", "/mount/longterm_backups"]
  URL         : repositories.url.allowed_urls: ["http://www.example.org/root/*", "https://*.mydomain.com/*?*#*"]
```

2) Create the repository in Elasticsearch (exemple for file systeme):

  * In the dev mode of Kibana:

```
  PUT _snapshot/robocop
  {
    "type": "fs",
    "settings": {
      "location": "/mount/backups"
    }
  }
```
  * With curl:

```
  curl -XPUT 'http://localhost:9200/_snapshot/robocop' -H 'Content-Type: application/json' -d '{
      "type": "fs",
      "settings": {
          "location": "/mount/backups",
      }
  }'
```
source: https://www.elastic.co/guide/en/elasticsearch/reference/5.x/modules-snapshots.html#_repositories

# Documentation

See the documentation for more informations.

# Development
To generate code documentation. In the folder "robocop" :
```
./node_modules/jsdoc/jsdoc.js -r -d /tmp/doc public/ server/ package.json index.js
```

[Author] Florian Scherb