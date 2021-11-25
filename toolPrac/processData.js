let nodeData = null;
let linkData = null;

d3.json("../data/nodesAndLinks.json").then(function(data) {
    nodeData = data.nodes;
    linkData = data.links;
    nodeData.forEach(function (nodeObj) {
        nodeObj.directParent = null;
        nodeObj.parents = [];
        nodeObj.allChildren = [];
        nodeObj.children = [];
        nodeObj.level = -1;
    });

    processData(nodeData, linkData)
});
function processData(nodeData, linkData) {
    nodeData.sort((a,b)=>a.timestamp - b.timestamp)
    let nodeDataMap = new Map()
    let children = new Map()
    let parents = new Map()

    nodeData.forEach(node => nodeDataMap.set(node.id, node))
    linkData.forEach(link => {
        let sourceNode = nodeDataMap.get(link.source)
        let targetNode = nodeDataMap.get(link.target)
        if (sourceNode.timestamp<=targetNode.timestamp){
            sourceNode.allChildren.push(targetNode.id);
            targetNode.parents.push(sourceNode.id);
            nodeDataMap.set(link.source, sourceNode)
            nodeDataMap.set(link.target, targetNode)
        }
    })

    levelize(nodeDataMap)
    setDirectParentChildren(nodeDataMap)
    sortChildren(nodeDataMap)
    console.log(nodeDataMap)
    console.log(linkData);
    return nodeDataMap
}

function levelize(nodeMap){
    nodeMap.forEach((node, id, map)=>{
        if (node.level === -1){
            let currQueue = [id]
            let currLevel = 0
            while (currQueue.length > 0){    
                let numCurrLevelNodes = currQueue.length
                let count = 0
                console.log(currQueue +" level: "+currLevel)
                while (count < numCurrLevelNodes){
                    let currId = currQueue.shift()
                    let currNode = nodeMap.get(currId)
                    let children = currNode.allChildren
                    currQueue = currQueue.concat(children)
                    if(currNode.level == -1 || currNode.level>currLevel){
                        currNode.level = currLevel
                    }
                    count++
                }
                currLevel++
            }
            console.log("new tree")
        }
    })
}

function setDirectParentChildren(nodeMap){
    nodeMap.forEach((node, id, map)=>{
        node.parents.forEach(parentNodeId =>{
            let parentNode = nodeMap.get(parentNodeId)
            if (node.directParent === null && parentNode.level === node.level-1){
                node.directParent = parentNodeId
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