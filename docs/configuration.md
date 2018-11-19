# Configuration

This part explains the different setting you can set in the configuration file of Kibana (“/etc/kibana/kibana.yml”). Robocop use the alert/cron settings first, then the advanced config (management page) finally with the value set in config file.

Use the same syntax of kibana setting to configure the plugin with “robocop.” In front. (No Uppercase)
Ex: robocop.watcher.indices

`robocop.enabled`: Boolean  
 **Default: false** Allow Kibana to load the plugin.

`robocop.daysOff`: Array  
**Default: []** List of bank holiday. Use "dd/MM" form for annual day and "dd/MM/YYYY" for single day. It can also be configured in the web app.

## Index
`robocop.index.data`: string  
**Default: .robocop-data** Define index to store data like alert, configuration and cron.

`robocop.index.log`: string  
**Default: .robocop-log** Define index to store log like history and event log.

## Watcher

`robocop.watcherindices`: string  
**Default: logstash-\*** Define default indices of Elasticsearch for search request.

## Action.slack
`robocop.action.slack.enabled`: boolean  
**Default: false** Set to true to use slack action.

`robocop.action.slack.token`: string  
Token to connect the slack bot to slack API. Require if slack.enabled

`robocop.action.slack.name`: string  
Default name use by the bot to post a message.

`robocop.action.slack.canal`: string  
Default canal or IM to post message. It take a canal name or IM ID.

`robocop.action.slack.body`: string  
Default message post on Slack. Use the Robocop language.

`robocop.action.slack.footer`: string  
A footer to the message. Allows to separate the alertes.

## Action.mail

`robocop.action.mail.enabled`: boolean  
**Default: false** Description: Set to true to use mail action.

`robocop.action.mail.to`: string  
Mail address to send the alert. You can write many addresses, use coma to separate address. If you want use coma in display name, enclose the name in double quotes. Ex: `foo@bar.com, "baz, qux " <bazqux@bar.com>`

`robocop.action.mail.from`: string  
Mail address of the sender. If you want use coma in display name, enclose the name in double quotes.

`robocop.action.mail.smtpHost`: string  
Address of the SMTP server to send email.

`robocop.action.mail.smptPort`: integer  
**Default: 25** Port of the SMTP server.

`robocop.action.mail.subject`: string  
**Default: @[alert.title] alert is triggered !’** The subject of the email. It uses the Robocop language.

`robocop.action.mail.body`: string  
**@[alert.title] has it @[result.hits.total] times.** The body of the email. It uses the Robocop language.

`robocop.action.mail.template`: string  
Path to a folder with an html template.

## History

`robocop.history.maxItem`: integer  
**Default: 50** The last history display in the history’s table.

## Script

`robocop.script.enabled`: boolean  
**Default: false** Allow Robocop to save the scripts and execute it.

`robocop.script.path`: string  
Path to save the scripts. Folder must exist and Kibana must have reading, writing and execution right. It is an absolute path and ends with “/”. Require if robocop.script.enabled

## Snapshots

`robocop.snapshot.repository`: string  
**Default: robocop**  Name of snapshot repository create in Elasticsearch

## Debug

`robocop.debug.enabled`: boolean  
**Default: false**: Enabled debug mode of Robocop. This allow Robocop to send email to the admin when a cron failed.

`robocop.debug.mail`: string  
Mail of the admin when erro in script for debug. Use the action.mail setting.
