import sys
from time import sleep
import tweepy
import json, time



#Creds - Jasmine
# consumer_key = 
# consumer_secret = 
# access_token = 
# access_token_secret = 
#____________________________________


#Uncomment and use your own key

#Creds - Ahsan
# consumer_key = "key"
# consumer_secret = "secret"
# access_token = "token"
# access_token_secret = "shhhh"
#_____________________________________


auth = tweepy.OAuthHandler(consumer_key, consumer_secret)
auth.set_access_token(access_token, access_token_secret)
api = tweepy.API(auth)

cursor = tweepy.Cursor(api.get_friend_ids, user_id = 1145708836633710592).items()


start_index = int(sys.argv[1])
end_index = int(sys.argv[2])

users_json = open("user_ids_excpt_RT.json")
users = json.load(users_json)

for i in range(start_index-1, end_index):
    user = users[i]
    serial = user['serial']
    id = user['id']
    followers = tweepy.Cursor(api.get_follower_ids, user_id = id).items()
    followers_list = []

    count_scraped = 0
    got_followers = False
    while not got_followers:
        try:
            for follower in followers:
                followers_list.append(follower)
                count_scraped += 1
            # followers_list=list(followers)
            got_followers = True
        except:
            print("API error, waiting before next request (scraped "+str(count_scraped)+" followers of serial no: " + str(serial)+") . . .")
            time.sleep(60)

    data = {
            'id': id,
            'followers': followers_list
            }
    with open("friends_and_followers.json", 'a') as ff_file:
        json.dump(data, ff_file, indent=4)
        ff_file.write(',\n')
    print("Added followers and followings of serial no: "+str(serial))

