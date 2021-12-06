import json

posters_json = open("urban_dictionary_posters.json")
posters = json.load(posters_json)

count  = 1
for user in posters:
    user['serial'] = count
    count += 1

with open("user_ids.json", 'w') as outfile:
            json.dump(posters, outfile, indent=4)