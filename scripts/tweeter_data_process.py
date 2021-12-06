import json

tweets_json = open("urban_dictionary_tweets.json")
tweets = json.load(tweets_json)

user_ids = []


for tweet in tweets:
    tweet_text = tweet['tweet']
    if tweet_text[0:2] != 'RT':
        id = tweet['id']
        if id not in user_ids:
            user_ids.append(id)

count  = 1
user_ids_json = []
for id in user_ids:
    data = {
        'serial': count,
        'id': id
    }
    user_ids_json.append(data)
    count += 1




with open("user_ids_excpt_RT.json", 'w') as outfile:
            json.dump(user_ids_json, outfile, indent=4)