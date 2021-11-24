import json

with open('../data/nodesAndLinks.json') as f:
    nodesAndLinks = json.load(f)

nodeList = nodesAndLinks["nodes"]
linkList = nodesAndLinks["links"]

nodeDict = {}
for nodeObj in nodeList:
    nodeObj["following"] = []
    nodeObj["followers"] = []
    nodeDict[nodeObj["id"]] = nodeObj

for linkObj in linkList:
    sourceId = linkObj["source"]
    targetId = linkObj["target"]
    nodeDict[sourceId]["following"].append(targetId)
    nodeDict[targetId]["followers"].append(sourceId)

with open("../data/nodesWithLinks.json", "w") as outfile:
    json.dump(list(nodeDict.values()), outfile, indent=4)