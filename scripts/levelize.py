import json
import os
from collections import defaultdict
import queue

dirname = os.path.dirname(__file__)
filePath_nodeAndLinks = os.path.join(dirname, '../data/nodesAndLinks.json') 
filePath_nodeWithLinks = os.path.join(dirname, '../data/nodesWithLinks.json')


f_nodesAndLinks = open(filePath_nodeAndLinks)
nodesAndLinks = json.load(f_nodesAndLinks)

f_nodesWithLinks = open(filePath_nodeWithLinks)
nodesWithLinks = json.load(f_nodesWithLinks)

nodes = nodesAndLinks['nodes']
links = nodesAndLinks['links']

sortedNodes = sorted(nodes, key= lambda item: item["timestamp"])
nodeDict = {item["id"]:item for item in sortedNodes}
for id,node in nodeDict.items():
    node["parents"] = []
    node["children"] = []
    node["level"] = -1


rawParentChild = defaultdict(list)
for k in links:
    rawParentChild[k["source"]].append(k["target"])







print(nodeDict)

