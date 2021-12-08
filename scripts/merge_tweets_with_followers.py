import json

all_tweets_json = open("urban_dictionary_tweets.json")
all_tweets = json.load(all_tweets_json)

tweet_by_user_id_dict = {}
for tweet in all_tweets:
    tweet_by_user_id_dict[tweet["id"]] = tweet

scraped_users_json = open("../data/users_with_relevant_followers_part2.json")
scraped_users = json.load(scraped_users_json)

users_with_followers_list = []

for user in scraped_users:
    tweetObj = tweet_by_user_id_dict[user["id"]]
    tweetObj["followers"] = user["followers"]
    users_with_followers_list.append(tweetObj)
  
with open("../data/users_with_tweet_and_followers.json", 'w') as outfile:
  json.dump(users_with_followers_list, outfile, indent=4)
