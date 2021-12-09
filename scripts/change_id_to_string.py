import json

all_tweets_json = open("../data/users_with_tweet_and_followers_all.json")
all_tweets = json.load(all_tweets_json)

for tweet in all_tweets:
    tweet["id"] = str(tweet["id"])
    followers_strings = []
    for follower in tweet["followers"]:
        followers_strings.append(str(follower))
    tweet["followers"] = followers_strings
  
with open("../data/users_with_tweet_and_followers_all_string_id.json", 'w') as outfile:
  json.dump(all_tweets, outfile, indent=4)
