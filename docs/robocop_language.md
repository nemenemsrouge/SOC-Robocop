# Robocop language

- [Variable](#variable)
- [Function](#function)
- [Hints](#hints)

Robocop use a custom language to create the messages to send. You can also send a static message without configuration, just write the message.

However, you can give more information in the message thanks to the variables.

## Variable

Variable allows you to put not define element in the message, the element will be replace when the alert will be trigger.

Variable is use with the syntax: @[variable].  
Example: `@[alert]`

If the variable is a complex object (not a string, Boolean, integer…), use the dot to call child object.  
Syntaxe: `@[variable.child]`  
Example: `@[alert.title]` `@[alert.watcher.indices]`

Object type can’t be use. Only terminal field.  
Example: `@[alert.watcher] ⇒ “[object Object]”`

To access to an element of an array, use the position of the element like a variable.  
Example: `@[aggregations.0.key]`

Variables available:

|    name            |    Use case                                    |    Description                                                                    |
|--------------------|------------------------------------------------|-----------------------------------------------------------------------------------|
|    alert           |    Alert, alert script                         |    Object alert save in the Elasticsearch. See alert                              |
|    idAlert         |    Alert, alert script                         |    ID of the alert                                                                |
|    cron            |    Cron, cron script                           |    Object cron save in the Elasticsearch. See cron                                |
|    idCron          |    Cron, cron script                           |    ID of the cron                                                                 |
|    action          |    Alert, alert script, cron, cron script      |    Action (slack/mail…) use to generate the message. See action                   |
|    result          |    Alert,  cron                                |    Response of the request without data processing. See result                    |
|    aggregations    |    Alert, alert script, cron, cron script      |    Shortcut to access to the field “bucket” of aggregation.                       |
|    idHistory       |    Alert, alert script                         |    ID of history that will be create after the message creation. See idHistory    |
|    item            |    Aggregations, loop                          |    Item is special. It use with the @[for]. See for loop                          |
|    script          |    Alert                                       |    Variable define by the user script.                                            |

### Alert
Variable available with message generate by an alert.

|    Field                  |    Type         |    Description                                                                                        |
|---------------------------|-----------------|-------------------------------------------------------------------------------------------------------|
|    title                  |    String       |                                                                                                       |
|    number                 |    String       |    The id of the alert generated by Robocop.                                                          |
|    description            |    String       |                                                                                                       |
|    data                   |    Object       |    Data field define by the user in the web interface.                                                |
|    irp                    |    String       |    Url of the Incident Response plan.                                                                 |
|    category               |    String       |    Category of the alert.                                                                             |
|    level                  |    String       |    Severity of the alert.                                                                             |
|    createdDate            |    String       |    Date of creation in ISO format.   Ex: 2017-04-28T06:00:32.363Z                                     |
|    modifiedDate           |    String       |    Date of modification in ISO format.    Ex: 2017-04-28T06:00:32.363Z                                |
|    enabled                |    Boolean      |    Always true.                                                                                       |
|    multiMessage           |    Boolean      |    True if multi message option is activate.                                                          |
|    watcher                |    Object       |    An object that represent the watcher. Watcher represent the search request of the alert.           |
|    watcher.indices        |    String       |    Index monitoring.                                                                                  |
|    watcher.periodicity    |    String       |    Time between each execution of the request.                                                        |
|    watcher.request        |    String       |    The JSON of the search.                                                                            |
|    action                 |    Object[]     |    List of the action enabled.                                                                        |
|    script                 |    Object       |    Script option                                                                                      |
|    script.enabled         |    Boolean      |    True if there are a script.                                                                        |
|    script.name            |    String       |    The name of the script.                                                                            |
|    script.argument        |    String[]     |    List of argument give to the script.                                                               |
|    period                 |    Object       |    Option for period.                                                                                 |
|    period.type            |    String       |    Type of period. “WH”, “NHW” or “Custom”                                                            |
|    period.enabled         |    Boolean      |    True if period is active (custom only)                                                             |
|    period.start           |    Integer      |    Integer that represent the time when alert turn on. (custom only)   08h00 à 800   12:30 à 1230     |
|    period.end             |    Integer      |    Integer that represent the time when alert turn off. (custom only)   08h00 à 800   12:30 à 1230    |
|    period.days            |    Boolean[]    |    List of Boolean that represents days working.   [Sunday, Monday,   ...]                            |

### idAlert
Variable available with message generate by an alert.

A string that represent the ID of the alert.
```
To access directly to the alert page, insert this line in the message.
https://IP:5601/app/robocop#/alert/edit/@[idAlert]
```

### Cron

Variable available with message generate by a cron.

| title                        | String    |                                                                                             |
|------------------------------|-----------|---------------------------------------------------------------------------------------------|
| number                       | String    | The id of the alert generated by Robocop.                                                   |
| description                  | String    |                                                                                             |
| data                         | Object    | Data field define by the user in the web interface.                                         |
| category                     | String    | Category of the alert.                                                                      |
| level                        | String    | Severity of the alert.                                                                      |
| createdDate                  | String    | Date of creation in ISO format. Ex: 2017-04-28T06:00:32.363Z                                |
| modifiedDate                 | String    | Date of modification in ISO format.  Ex: 2017-04-28T06:00:32.363Z                           |
| enabled                      | Boolean   | Always true.                                                                                |
| multiMessage                 | Boolean   | True if multi message option is activate.                                                   |
| watcher                      | Object    | An object that represent the watcher. Watcher represent the search request of the alert.    |
| watcher.indices              | String    | Index monitoring.                                                                           |
| watcher.periodicity          | String    | Time between each execution of the request.                                                 |
| watcher.request              | String    | The JSON of the search.                                                                     |
| action                       | Object[]  | List of the action enabled.                                                                 |
| script                       | Object    | Script option                                                                               |
| script.enabled               | Boolean   | True if there are a script.                                                                 |
| script.name                  | String    | The name of the script.                                                                     |
| script.argument              | String[]  | List of argument give to the script.                                                        |
| period                       | Object    | Option for period.                                                                          |
| period.type                  | String    | Type of period. “WH”, “NHW” or “Custom”                                                     |
| period.enabled               | Boolean   | True if period is active (custom only)                                                      |
| period.start                 | Integer   | Integer that represent the time when alert turn on. (custom only) 08h00 à 800 12:30 à 1230  |
| period.end                   | Integer   | Integer that represent the time when alert turn off. (custom only) 08h00 à 800 12:30 à 1230 |
| period.days                  | Boolean[] | List of Boolean that represents days working. [Sunday, Monday, ...]                         |

### idCron

Variable available with message generate by a cron.
A string that represent the ID of the cron.

```
To access directly to the cron page, insert this line in the message.
https://IP:5601/app/robocop#/cron/edit/@[idCron]
```

### Action


**Mail**:

| Field   |  Type  | Description                             |
|---------|--------|-----------------------------------------|
| type    | String | “mail” in this case.                    |
| to      | String | Destination addresses                   |
| from    | String | From address                            |
| subject | String | Subject of the mail in Robocop language |
| body    | String | body of the mail in Robocop language    |

**Slack**:

| Field |  Type  | Description                             |
|-------|--------|-----------------------------------------|
| type  | String | “slack” in this case.                   |
| name  | String | Name of the bot, can be undefined       |
| canal | String | Direct message id or canal name         |
| Body  | String | body of the message in Robocop language |

**Marvin**:

| Field |  Type  | Description                                   |
|-------|-------|------------------------------------------------|
| type            | String | “marvin” in this case.              |
| typeAlert       | String | Type in Marvin                      |
| title           | String | Title of the incident               |
| contact         | String | User in contact for the alert       |
| detectionSource | String | Source de detection of the incident |
| alertSource     | String | Source of alert                     |
| body            | String | description of the incident         |
| criticity       | String | Severity of the incident            |
| category        | String | Category of the incident            |

### Result
This variable is dependent on the query configured in the alert. You can see the field with the execute icon (binoculars icons) in the watcher panel in the alert page.

### Aggregations
Aggregations is a shortcut for the list of aggregations. It can be undefined.

| Field     | Type    | Description                    |
|-----------|---------|--------------------------------|
| Key       | --      | Field key of aggregation       |
| doc_count | integer | Field doc_count of aggregation |

Example:

```
@[for.aggregations]User: @[item.key] (@[item.doc_count] items).
@[forend]
```

### IdHistory
A string that represent the ID of history.

```
to access directly to the history page, insert this line in the message.
https://IP:5601/app/robocop#/history/edit/@[idHistory]
```

## Function
Robocop allows you to use some function to perform a calculation with variables.

### Length()
Use the function length() to display the length of an array.  
Example: `There are @[aggregations.length()] IP that as trigger the alert.`

### Es()
Es() execute a search request to the Elasticsearch. You need to create a variable to access to the result.  
Syntax: `@[var(variable).es(index,type,'body')]`

Example:
```
@[var(test).es(robocop,'cron','{"query": {"match_all": {}}}')]
@[test.hits.hits._source.field1]
```
* var(test): Declaration of the variable “test” to receive the result.
* Es(): the function to make a search request.
* Robocop: Search index. Quotes are optional.
* 'cron': Document’s type. Quotes are optional
* '{"query": {"match_all": {}}}': Body of the request. Quotes are require.

### date()

Allows displaying date to readable format. Use the format of [moment js plugin](https://momentjs.com/docs/#/displaying/).   
Syntax: `@[date.format('YYYY/MM/DD HH:mm:ss')]`

### Default()

Allows displaying a string if the variable doesn't exist.  
Syntax: `@[variable.default('default string')]`

Example:
```
@[alert.irp.default('No IRP found')]
```

The default() function must be at the end. `@[result.hits.default('No found').total]` is not valide.

### For loops

You can loop on each element on a table with the “for” loop. For loop begin with the tag @[for.variable] and end with the tag @[endfor]. Use @[item] to access to the current element.
```
@[for.hits.hits._source.table] User: @[item.field1] (@[item.field2])
@[forend]
```

You can define your own variable to access to each element. With the tag: `@[for(variableName).field.to.loop]`

At this point of the message, you can access to the item with the tag @[variableName]
Of course, you can use imbricated loop. Do not forget to rename item variable.

```
@[for.hits.hits._source.users] Mr/Ms @[item.name] connect to :
  @[for(url).item.data] @[url.path] with id @[item.id]
  @[forend]
@[forend]
```

## Hints

When use a “for” loop in mail, outlook can hide the carriage return. To avoid this behavior, had a point at the end of the line.