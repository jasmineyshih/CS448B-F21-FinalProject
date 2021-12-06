import json

users_json = open("user_ids_excpt_RT.json")
users = json.load(users_json)

all_users_json = open("user_ids.json")
all_users = json.load(all_users_json)

scraped_users_dict = {}

for user in all_users[2158:2268]:
  scraped_users_dict[user["id"]] = user["serial"]

user_ids = []

for user in users:
  if user["id"] not in scraped_users_dict:
    user_ids.append(user["id"])
  else:
    print(str(user["id"]) + " no. " + str(scraped_users_dict[user["id"]]) + " already scraped")


count  = 1
user_ids_json = []
for id in user_ids:
    data = {
        'serial': count,
        'id': id
    }
    user_ids_json.append(data)
    count += 1


with open("users_excpt_RT_unscraped.json", 'w') as outfile:
            json.dump(user_ids_json, outfile, indent=4)