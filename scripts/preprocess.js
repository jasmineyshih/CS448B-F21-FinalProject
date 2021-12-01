function preprocessData(nodeData, linkData, nodeLookup) {
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

}
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
    fakeRootNode.children.sort((a, b) => a.timestamp - b.timestamp);
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