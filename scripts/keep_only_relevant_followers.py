import json

target_users_json = open("user_ids_excpt_RT.json")
target_users = json.load(target_users_json)

target_users_dict = {}
for user in target_users:
  target_users_dict[user["id"]] = user["serial"]

scraped_users_json = open("../data/followers_1-599.json")
scraped_users = json.load(scraped_users_json)

for user in scraped_users:
  relevant_followers = []
  for follower in user["followers"]:
    if follower in target_users_dict:
      relevant_followers.append(follower)
  print("User " + str(user["id"]) + " has number of followers: " + str(len(user["followers"])) + ", keeping " + str(len(relevant_followers)))
  user["followers"] = relevant_followers
  
  with open("../data/users_with_relevant_followers.json", 'a') as outfile:
    json.dump(user, outfile, indent=4)
    outfile.write(',\n')
