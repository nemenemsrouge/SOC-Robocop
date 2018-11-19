#  Annex
## Format Slack message
You can use the Slack format in your messages but the preview and the history do not render the messages.
* Emphasis
* StrikeThrough
* Lists
* Blockquotes
* Code blocks

Official doc: [Format your message](https://get.slack.help/hc/en-us/articles/202288908-How-can-I-add-formatting-to-my-messages-)

You can also use the ping system to insert channels or user. You need to know its id.

```
Why not join <#C024BE7LR|general>? ⇒ Why not join @general
Hey <@U024BE7LH|bob>, did you see my file? ⇒ Hey @bob, did you see my file?
```

Official doc: [Linking to channels and users](https://api.slack.com/docs/message-formatting#linking_to_channels_and_users)

To ping channel, use the “!” symbol.

```
<!channel> <!group> <!here> <everyone> ⇒ @channel, @group, @here, and @everyone
```

Official doc: [Variables](https://api.slack.com/docs/message-formatting#variables)

## Multi aggregation Elasticsearch

Therefore, in message, you can loop on aggregation, but in the loop, you have only access to the field use by the aggregation.
Example:
``` json
{
    "aggs" : {
        "connection" : {
            "terms" : { "field" : "ip_src" }
        }
    }
}
```

In the example, you can only display the field “ip_src”. Now, you want display “ip_dst” associate to those documents.
You can make a new request to get the ip_dst (see: es() function). However, it is long and complicated; you must make a request for each aggregations.  
The second method is to use the sub aggregation. Simply, it creates an aggregation with the results of the first.

Example of request:
```
{
  "aggs" : {
    "connection” : {
      "terms" : {
        "field" : "ip_src"
      }
    },
    "aggs": {
      "dst": {
        "terms" : {
          "field" : "ip_dst"
        }
      }
    }
  }
}
```

Example of result:

```
"aggregations": {
  "connection": {
    "doc_count_error_upper_bound": 0,
    "sum_other_doc_count": 0,
    "buckets": [
      {
        "key": "192.168.0.1",
        "doc_count": 5,
        "ip_dst": {
          "doc_count_error_upper_bound": 0,
          "sum_other_doc_count": 0,
          "buckets": [
            {
              "key": "167.129.2.12",
              "doc_count": 3
            },
            {
              "key": "135.23.93.238",
              "doc_count": 2
            }
          ]
        }
      },
      {...}
    ]
  }
}
```

Now use the following message to display the information.

```
@[for.aggregations]The IP @[item.key] is connected to:
@[for(ipDst).item.ip_dst.bucket]    -> @[ipDst.key]
@[forend]
@[forend]
```

The final message:

```
The IP 192.168.0.1 is connected to:
    -> 167.129.2.12
    -> 135.23.93.238
```

Official doc: [aggregations](https://www.elastic.co/guide/en/elasticsearch/reference/5.x/search-aggregations.html)
