import sys
import json

data_file_name = sys.argv[1]

target_users_json = open("tweetAndUserFiles/user_ids_excpt_RT.json")
target_users = json.load(target_users_json)

target_users_dict = {}
for user in target_users:
  target_users_dict[user["id"]] = user["serial"]

scraped_users_json = open("dataFiles/collection/" + data_file_name + ".json")
scraped_users = json.load(scraped_users_json)

for user in scraped_users:
  relevant_followers = []
  print("User " + str(user["id"]) + " has number of followers: " + str(len(user["followers"])))
  for follower in user["followers"]:
    if follower in target_users_dict:
      relevant_followers.append(follower)
  user["followers"] = relevant_followers
  print("Numbers of followers kept: " + str(len(relevant_followers)))
  
  with open("users_with_relevant_followers.json", 'a') as outfile:
    json.dump(user, outfile, indent=4)
    outfile.write(',\n')
