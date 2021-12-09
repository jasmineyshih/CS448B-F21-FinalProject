function preprocessData(nodeData, nodeLookup) {
    nodeData.forEach(function (nodeObj) {
        nodeObj.directParent = null;
        nodeObj.parents = [];
        nodeObj.allChildren = [];
        nodeObj.children = [];
        nodeObj.otherFollowers = [];
        nodeObj.otherFollowing = [];
        nodeObj.level = -1;
        // format a time string based on timestamp value
        let datetime = new Date(nodeObj.timestamp)
        let date = datetime.getDate()
        let month = datetime.getMonth()
        let year = datetime.getFullYear()
        let hour = datetime.getHours()
        let min = datetime.getMinutes()
        let seconds = datetime.getSeconds()
        nodeObj.timeString = `${month + 1}/${date} ${hour}:${min}:${seconds}`;
        
        nodeLookup[nodeObj.id] = nodeObj;   // add node to lookup map for quick access later
    });
    nodeData.sort((a, b) => a.timestamp - b.timestamp);
    let nodeDataMap = new Map();
    let children = new Map();
    let parents = new Map();

    nodeData.forEach(followedNode => {
        followedNode.followers.forEach(follower => {
            let followerNode = nodeLookup[follower];
            // TODO: remove the first condition after we have the complete set of data
            if (followerNode && followedNode.timestamp < followerNode.timestamp) {  // this relationship is only meaningful if the followed user made a post ealier than the follower
                followerNode.parents.push(followedNode.id); // add the followed node as a parent of the follower
                followedNode.allChildren.push(followerNode.id); // add the follower as a child of the followed node
            }
        });
    });
    let loneNodeList = [];
    let nodeListLength = nodeData.length;
    let currIndex = 0;
    while (currIndex < nodeListLength) {
        let currNode = nodeData[currIndex];
        if (currNode.parents.length == 0 && currNode.allChildren.length == 0) {
            let removedList = nodeData.splice(currIndex, 1);  // remove node from list, decrease total length, and add removed node to lone node list
            nodeListLength--;
            loneNodeList.push(removedList[0]);
        } else {
            currIndex++;
        }
    }
    nodeData.forEach(node => nodeDataMap.set(node.id, node));   // load node data array into map
    levelize(nodeDataMap);
    setDirectParentChildren(nodeDataMap);
    sortChildren(nodeDataMap);
    return loneNodeList;    // return the node list with lone nodes filtered out
}
//below function is for processing input file that has nodes and links in seperate lists
/*function preprocessData_old(nodeData, linkData, nodeLookup) {
    nodeData.forEach(function (nodeObj) {
        nodeObj.directParent = null;
        nodeObj.parents = [];
        nodeObj.allChildren = [];
        nodeObj.children = [];
        nodeObj.otherFollowers = [];
        nodeObj.otherFollowing = [];
        nodeObj.level = -1;
        nodeLookup[nodeObj.id] = nodeObj;
        let datetime = new Date(nodeObj.timestamp * 1000)
        let date = datetime.getDate()
        let month = datetime.getMonth()
        let year = datetime.getFullYear()
        let hour = datetime.getHours()
        let min = datetime.getMinutes()
        let seconds = datetime.getSeconds()
        nodeObj.timeString = `${month + 1}/${date} ${hour}:${min}:${seconds}`;
    });
    nodeData.sort((a, b) => a.timestamp - b.timestamp);
    let nodeDataMap = new Map();
    let children = new Map();
    let parents = new Map();

    nodeData.forEach(node => nodeDataMap.set(node.id, node));   // load node data array into map
    linkData.forEach(link => {
        let sourceNode = nodeDataMap.get(link.source)
        let targetNode = nodeDataMap.get(link.target)
        if (sourceNode.timestamp > targetNode.timestamp){
            sourceNode.parents.push(targetNode.id);
            targetNode.allChildren.push(sourceNode.id);
            nodeDataMap.set(link.source, sourceNode);
            nodeDataMap.set(link.target, targetNode);
        }
    });

    levelize(nodeDataMap);
    setDirectParentChildren(nodeDataMap);
    sortChildren(nodeDataMap);

}*/
function levelize(nodeMap){
    nodeMap.forEach((node, id, map) => {
        if (node.level === -1){
            let currQueue = [id]
            let currLevel = 0
            while (currQueue.length > 0){    
                let numCurrLevelNodes = currQueue.length
                let count = 0;
                while (count < numCurrLevelNodes){
                    let currId = currQueue.shift()
                    let currNode = nodeMap.get(currId)
                    let children = currNode.allChildren
                    currQueue = currQueue.concat(children)
                    if(currNode.level <= 0 || currNode.level > currLevel){
                        currNode.level = currLevel
                    }
                    count++
                }
                currLevel++
            }
        }
    });
}
function setDirectParentChildren(nodeMap){
    nodeMap.forEach((node, id, map)=>{
        node.parents.sort((node1, node2) => nodeMap.get(node1).timestamp - nodeMap.get(node2).timestamp);
        node.parents.forEach(parentNodeId =>{
            let parentNode = nodeMap.get(parentNodeId)
            if (node.directParent == null && parentNode.level === node.level-1){
                node.directParent = parentNodeId;
                parentNode.children.push(id)
            }
        })
    })
}
function sortChildren(nodeMap){
    nodeMap.forEach((node, id, map)=>{
        node.children.sort((child1, child2)=>nodeMap.get(child1).timestamp - nodeMap.get(child2).timestamp)
        node.allChildren.sort((child1, child2)=>nodeMap.get(child1).timestamp - nodeMap.get(child2).timestamp)
    })
}
function transformToNested(nodeData) {
    nodeData.forEach(function (node) {
        node.children = [];
        node.allChildren.forEach(function (childId) {
            let childNode = nodeLookup[childId];
            if (childNode.directParent == node.id) {
                node.children.push(childNode);
            }
        });
    });
    let fakeRootNode = {
        id: "0",
        children: []
    };
    for (let i = 0; i < nodeData.length; i++) {
        if (nodeData[i].directParent == null /*&& nodeData[i].children.length > 0*/) {
            fakeRootNode.children.push(nodeData[i]);
        }
    }
    //fakeRootNode.children.sort((a, b) => a.timestamp - b.timestamp);
    return fakeRootNode;
}
function computeDegreeOfContributionForAllNodes(nodeData, nodeLookup) {
    nodeData.forEach(function (node) {
        node.degOfContribution = getDegreeOfContribution(node, nodeLookup);
    });
}
function getDegreeOfContribution(node, nodeLookup) {
    if (node.degOfContribution != undefined) {   // if the degree of contribution of this node has already been computed, return it
        return node.degOfContribution;
    }
    if (node.children.length == 0) { // base case - node is a leaf node, which by default has a degree of contribution of 0
        return 0;
    }
    let totalDegOfCont = 0;
    //node.allChildren.map(childId => nodeLookup[childId]).forEach(function (childNode) {
    node.children.forEach(function (childNode) {
        if (childNode.parents.length == 1) {    // if this child depends solely on this node, count this child node and the child node's degree of contribution
            totalDegOfCont += 1 + getDegreeOfContribution(childNode, nodeLookup);
        }
        let otherParents = childNode.parents.filter(parentId => parentId != childNode.directParent);
        let otherParentsAreSiblings = otherParents.length > 0 && otherParents.every(parentId => nodeLookup[parentId].directParent == childNode.directParent);
        if (otherParentsAreSiblings) {
            totalDegOfCont += 1;
        }
    });
    return totalDegOfCont;
}