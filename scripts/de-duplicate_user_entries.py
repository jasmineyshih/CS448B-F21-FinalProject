import json

all_tweets_json = open("../data/users_with_tweet_and_followers_all_string_id.json")
all_tweets = json.load(all_tweets_json)

user_dict = {}
unique_list = []
for tweet in all_tweets:
    if tweet["id"] not in user_dict:
        unique_list.append(tweet)
        user_dict[tweet["id"]] = tweet
    else:  
        print(tweet["id"])
  
with open("../data/urban_dictionary_tweets_and_followers.json", 'w') as outfile:
  json.dump(unique_list, outfile, indent=4)
