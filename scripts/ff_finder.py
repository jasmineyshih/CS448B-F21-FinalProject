import sys
from time import sleep
import tweepy
import json, time



#Creds - Jasmine
# consumer_key = "kEHSuoqKADFP5KK0X5EZ2HzaW"
# consumer_secret = "Xd3YrIo1gDj4aFeaxlfWwVP0CS6x4KyesMXrTtFxB8MnXieEHt"
# access_token = "2328202038-0Sm5cVuNianmAmiBCLhNcHsNmbWtMIwxfrPLyzQ"
# access_token_secret = "91REr5tTCdvm5tK7O3WTZaQqQIFHPjEb87ldgSj9iOY4U"
#____________________________________


#Creds - Ahsan
consumer_key = "yt6ZBzuavluQsJ71N45e9EYSx"
consumer_secret = "BCty3iMFqV1DBC5WWLm7BcbNYWZG7nbQ3Gmonrqh54gSXYn6pu"
access_token = "270518822-vMPFa5PwAjm2cBri9FXuW25iKtlL5wwmDJYj4clk"
access_token_secret = "Vt2Kci9ElHwzY9er63wRLk3ruPgDBO1wvd4Wcm9kVe0zf"
#_____________________________________


auth = tweepy.OAuthHandler(consumer_key, consumer_secret)
auth.set_access_token(access_token, access_token_secret)
api = tweepy.API(auth)

cursor = tweepy.Cursor(api.get_friend_ids, user_id = 1145708836633710592).items()


start_index = int(sys.argv[1])
end_index = int(sys.argv[2])

users_json = open("user_ids.json")
users = json.load(users_json)

for i in range(start_index-1, end_index):
    user = users[i]
    serial = user['serial']
    id = user['id']
    followers = tweepy.Cursor(api.get_follower_ids, user_id = id).items()
    followers_list = []

    got_followers = False
    while not got_followers:
        try:
            followers_list=list(followers)
            got_followers = True
        except:
            print("API error, waiting before next request . . .")
            time.sleep(60)

    data = {
            'id': id,
            'followers': followers_list
            }
    with open("friends_and_followers.json", 'a') as ff_file:
        json.dump(data, ff_file, indent=4)
        ff_file.write(',\n')
    print("Added followers and followings of serial no: "+str(serial))

