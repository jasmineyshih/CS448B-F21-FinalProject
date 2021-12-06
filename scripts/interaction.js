function updateNodeSizeAttribute(elem) {
    attributeForNodeSize = elem.value;
    if (attributeForNodeSize == "incomingEdges") {
        let dataRange = d3.extent(nodeData.map(node => node.allChildren.length));
        nodeSizeScale = d3.scaleSqrt().domain(dataRange).range([minRadius, maxRadius]);
    } else if (attributeForNodeSize == "outgoingEdges") {
        let dataRange = d3.extent(nodeData.map(node => node.parents.length));
        nodeSizeScale = d3.scaleSqrt().domain(dataRange).range([minRadius, maxRadius]);
    } else if (attributeForNodeSize) {
        let dataRange = d3.extent(nodeData.map(node => {
            let parts = attributeForNodeSize.split("/");
            if (parts.length == 2) {
                return (node[parts[0]]) / (node[parts[1]]);
            }
            return node[attributeForNodeSize];
        }));
        nodeSizeScale = d3.scaleSqrt().domain(dataRange).range([minRadius, maxRadius]);
    } else {
        nodeSizeScale = null;
    }
    updateNodeSize();
}
function updateNodeSize() {
    svg.selectAll("circle")
        .attr("r", computeNodeRadius);
}
function computeNodeRadius(d) {
    if (!attributeForNodeSize || d.data.id == "0") return midRadius;
    let parts = attributeForNodeSize.split("/");
    let scaleInput;
    if (attributeForNodeSize == "incomingEdges") {
        scaleInput = d.data.allChildren.length;
    } else if (attributeForNodeSize == "outgoingEdges") {
        scaleInput = d.data.parents.length;
    } else if (parts.length == 2) {
        scaleInput = (d.data[parts[0]]) / (d.data[parts[1]])
    } else {
        scaleInput = d.data[attributeForNodeSize]
    }
    return nodeSizeScale(scaleInput);
}
function getLinksBetweenNodes(nodeElems, includeAllLevels=false, includeDifferentParents=false) {
    let links = [];
    let nodeElemMap = {};   // build lookup map to easily access node element by id
    nodeElems.forEach(function (node) {
        nodeElemMap[node.data.id] = node;
    });
    nodeData.forEach(function (node) {
        let nonDirectParents = node.parents.filter(nId => nId != node.directParent);   // get only the non-direct parents, which are the nodes after the first parent node
        nonDirectParents.forEach(function (parentId) {
            let parentNode = nodeLookup[parentId];
            if (includeAllLevels || node.level == parentNode.level) { // if not including all levels, get only the links between children in the same level
                if (includeDifferentParents || node.directParent == parentNode.directParent) { // if not including nodes with different parents, get only the links between children under the same parent
                    // this node follows the parent node, so set this node as source and parent node as target
                    links.push({
                        source: nodeElemMap[node.id],
                        target: nodeElemMap[parentId],
                        sameLevel: node.level == parentNode.level
                    });
                }
            }
        })
    });
    return links;
}
function computePathCommandsForTreeEdges(d) {
    let getPath = d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x);
    let pathString = getPath(d).split("C");
    let subPathStrings = [pathString[0].split(","), pathString[1].split(",")];
    let parsedInt1 = parseFloat(subPathStrings[0][1]);
    let parsedInt2 = parseFloat(subPathStrings[1][5]);
    if (parsedInt1 == parsedInt2) { // path is a straight line, tweak it to make it not straight
        parsedInt1 -= 0.25;
        parsedInt2 += 0.25;
        subPathStrings[0][1] = parsedInt1.toString();
        subPathStrings[1][5] = parsedInt2.toString();
        pathString[0] = subPathStrings[0].join(",");
        pathString[1] = subPathStrings[1].join(",");
    }
    return pathString.join("C");
}
function getGradientForTreeLink(d) {
    if (!useGradientOnTreeEdges) return solidEdgeColor;
    return "url(#horizontalGradFollowedLeft)";
}
function getGradientForLink(d) {
    if (d.source.data.level == d.target.data.level) {  // drawing an arc since nodes are on the same level
        if (!useGradientOnExtraEdgesWithin) return solidEdgeColor;
        if (d.source.x > d.target.x) {  // the arc goes from follower to followed node downward
            return "url(#verticalGradFollowedUp)";
        } else {    // otherwise the arc goes from follower to followed node upward
            return "url(#verticalGradFollowerUp)";
        }
    } else {    // drawing an edge between different levels
        if (!useGradientOnExtraEdgesAcross) return solidEdgeColor;
        if (d.source.data.level < d.target.data.level) {   // the edge goes from an earlier level to later level
            return "url(#horizontalGradFollowerLeft)";
        } else {    // otherwise the edge goes from a later level to earlier level
            return "url(#horizontalGradFollowedLeft)";
        }
    }
}
function drawPathBetweenNodes(d) {
    let pathString;
    if (d.source.data.level == d.target.data.level) { 
        pathString = drawArcBetweenSameLevel(d);
    } else {
        let edgeFunct = d3.linkHorizontal()
            .x(dt => dt.y)
            .y(dt => dt.x);
        pathString = edgeFunct(d);
    }
    return pathString;
}
function drawArcBetweenSameLevel(d) {
    let start = d.source.x;    // X position of start node on the X axis
    let end = d.target.x;      // X position of end node
    let height = d.source.y; // this would be the same for the two points since they are in the same level
    return ['M', height, start,    // the arc starts at the coordinate x=start, y=height-30 (where the starting node is)
        'A',                            // This means we're gonna build an elliptical arc
        (start - end)/4, ',',    // Next 2 lines are the coordinates of the inflexion point. Height of this point is proportional with start - end distance
        (start - end)/2, 0, 0, ',',
        start < end ? 1 : 0, height, ',', end] // We always want the arc on top. So if end is before start, putting 0 here turn the arc upside down.
        .join(' ');
}
function updateEdgeColors(type) {
    if (type == "tree") {
        useGradientOnTreeEdges = useGradientOnTreeEdges ? false : true;
        svg.selectAll(".treeEdges")
            .attr("stroke", getGradientForTreeLink);
    } else if (type == "extraAcross") {
        useGradientOnExtraEdgesAcross = useGradientOnExtraEdgesAcross ? false : true;
        svg.selectAll(".extraEdgesAcrossLevels")
            .attr("stroke", getGradientForLink);
    } else {
        useGradientOnExtraEdgesWithin = useGradientOnExtraEdgesWithin ? false : true;
        svg.selectAll(".extraEdgesWithinLevels")
            .attr("stroke", getGradientForLink);
    }
}
function updateSelectedNode(event, d) {
    selectedNodesIds.forEach(id => {
        d3.select("#circle" + id).classed("selectedNode", false);
        d3.selectAll(`.from${id},.to${id}`)
            .classed("highlightedEdges", false);
    })
    let newSelectedNodeId = d.data.id;
    if (selectedNodeId != newSelectedNodeId) {    // a new node has been selected
        d3.select("#circle" + newSelectedNodeId).classed("selectedNode", true);
        if (selectedNodeId) {
            d3.select("#circle" + selectedNodeId).classed("selectedNode", false);
        } else {
            d3.selectAll("path").classed("dimmedEdges", true);  // dim all edges if no node was previously selected
        }
        updateHighlightedEdges(selectedNodeId, newSelectedNodeId);
        selectedNodeId = newSelectedNodeId;
        let selectedNodeObj = nodeLookup[selectedNodeId];
        d3.select("#collapseExpandButton")
            .classed("showButton", true)
            .html(selectedNodeObj.collapsed ? "Expand selected node" : "Collapse selected node")
            .attr("disabled", selectedNodeObj.children.length > 0 ? null : "");
    }
    d3.select("#idField").html(d.data.id);
    d3.select("#timestampField").html(d.data.timeString);
    d3.select("#numLikesField").html(d.data.numLikes);
    d3.select("#numCommentsField").html(d.data.numComments);
    d3.select("#degContributionField").html(d.data.degOfContribution);
    event.stopPropagation();
}
d3.select("#viz").select("svg").on('click', function () {   // mouse click on empty space in the svg
    // deselect currently selected node
    if (selectedNodeId) {
        deselectSelectedNodes()
    }
});

function deselectSelectedNodes(){
    d3.select("#collapseExpandButton").classed("showButton", false);
    d3.select("#circle" + selectedNodeId).classed("selectedNode", false);
    selectedNodeId = null;
    selectedNodesIds.forEach(id => {
        d3.select("#circle" + id).classed("selectedNode", false);
        d3.selectAll(`.from${id},.to${id}`)
            .classed("highlightedEdges", false);
    })
    selectedNodesIds.length = 0
    d3.select("#idField").html("");
    d3.select("#timestampField").html("");
    d3.select("#numLikesField").html("");
    d3.select("#numCommentsField").html("");
    d3.select("#degContributionField").html("");
    d3.selectAll(".highlightedEdges").classed("highlightedEdges", false); // dehighlight all edges if no node is selected now
    d3.selectAll(".dimmedEdges").classed("dimmedEdges", false); // undim all edges if no node is selected now
}

function updateHighlightedEdges(oldId, newId) {
    if (oldId) {
        d3.selectAll(`.from${oldId},.to${oldId}`)
            .classed("highlightedEdges", false);
    }
    d3.selectAll(`.from${newId},.to${newId}`)
        .classed("highlightedEdges", true);
}
function collapseOrExpandSelectedNode() {
    let selectedNode = nodeLookup[selectedNodeId];
    if (selectedNode.children.length == 0) return;  // nodes with no children cannot be collapsed, so do nothing
    let newStateIsCollapse = selectedNode.collapsed ? false : true; // true if node was previously not collapsed, and false if node was previously collapsed
    d3.select("#circle" + selectedNodeId).classed("collapsedNode", newStateIsCollapse); // apply, or remove, the collpasedNode class
    if (newStateIsCollapse) {
        collapsedNodeSet.add(selectedNodeId);
    } else {
        collapsedNodeSet.delete(selectedNodeId);
    }
    // we only want to hide or unhide a child node if it has no other parents than the selected node
    //let nodeQueue = selectedNode.children.map(childNode => childNode);
    let nodeQueue = selectedNode.allChildren.map(childId => nodeLookup[childId]);
    //let nodeQueue = allChildrenNodes.filter(childNode => childNode.parents.length == 1);  // make a shallow copy of the children nodes since we'll pop from list
    while (nodeQueue.length > 0) {  // recursively go through the children nodes to update them
        let currNode = nodeQueue.shift();
        let currNodeId = currNode.id;
        if (!newStateIsCollapse)  { // if we're expanding the selected node
            hiddenNodeSet.delete(currNodeId);   // remove this child node from the hidden node list, if it's previously hidden
            if (currNode.collapsed) {   // if expanding a node, reset a previously collapsed child's status to false
                currNode.collapsed = false;
                collapsedNodeSet.delete(currNodeId);    // remove this child node from the collapsed list, it it's previously collapsed
                d3.select("#circle" + currNodeId).classed("collapsedNode", false);
            }
            d3.selectAll(`.from${currNodeId},.to${currNodeId}`) // select all the edges associated with this child node
                .filter(function () {                           // and keep only the edges not connected to a hidden or collapsed node
                    let connectedNodeClasses = d3.select(this).attr("class").split(" ");
                    let fromClass = connectedNodeClasses[0];
                    let toClass = connectedNodeClasses[1];
                    let connectedToHiddenNode = Array.from(hiddenNodeSet).some(hiddenId => fromClass.includes(hiddenId) || toClass.includes(hiddenId));
                    let connectedToCollapsedNode = Array.from(collapsedNodeSet).find(collapsedId => fromClass.includes(collapsedId) || toClass.includes(collapsedId));
                    return !connectedToHiddenNode && !connectedToCollapsedNode;
                })
                .classed("hiddenEdges", false);
            d3.select("#node" + currNodeId)
                .classed("hiddenNodes", false);
        } else {    // if we're collapsing the selected node
            let nodeHasUncollapsedParents = currNode.parents.some(parentId => !hiddenNodeSet.has(parentId) && !collapsedNodeSet.has(parentId));
            if (!nodeHasUncollapsedParents) {   // only hide this child node if it all its parents are hidden or collapsed
                hiddenNodeSet.add(currNodeId);
                d3.selectAll(`.from${currNodeId},.to${currNodeId}`)
                    .classed("hiddenEdges", true);
                d3.select("#node" + currNodeId)
                    .classed("hiddenNodes", true);
            } else {    // if we're not hiding this child node, we still need to hide the edges from it to all currently collapsed nodes, if any
                Array.from(collapsedNodeSet).forEach(function (collapsedNodeId) {
                    let nodes = d3.select(`#link${currNodeId}to${collapsedNodeId}`)
                        .classed("hiddenEdges", true);
                })
            }
        }
        // we only want to hide or unhide a child node if it has no other parents than the selected node
        //nodeQueue = nodeQueue.concat(nodeLookup[currNodeId].children.map(childNode => childNode));
        nodeQueue = nodeQueue.concat(nodeLookup[currNodeId].allChildren.map(childId => nodeLookup[childId]));
    }
    d3.select("#collapseExpandButton")
        .html(newStateIsCollapse ? "Expand selected node" : "Collapse selected node");
    selectedNode.collapsed = newStateIsCollapse;
}

function setNodesPerLevel(treeHierarchy){
    let levelMap = new Map()
    treeHierarchy.each(node =>{
        if(levelMap.has(node.depth)){
            let levelObj = levelMap.get(node.depth);
            levelObj.count++;
            //levelMap.set(node.depth, count+1)
        }else{
            levelMap.set(node.depth, {
                count: 1,
                xPos: node.y
            })
        }
    })

    nodesPerLevel.length = 0
    levelMap.forEach((value, key)=>{
        if(key !== 0){
            nodesPerLevel.push(
                {
                    "level": key,
                    "count": value.count,
                    "xPos": value.xPos
                }
            )                                       
        }
    })

    nodesPerLevel.sort((a,b)=>a.count - b.count)
    nodesPerLevel.map(node => node.rank = nodesPerLevel.indexOf(node)+1)
    
}

function getTimeStampByDate(originalData, updatableData){
    updatableData.length = 0
    let timeMap = new Map()
    originalData.forEach(timeData =>{
        let key = timeData.year+""+timeData.month+""+timeData.date
        if (timeMap.has(key)){
            let count  = timeMap.get(key).count+1
            let timestamps = timeMap.get(key).timestamps
            timestamps.push(timeData)
            timeMap.set(key, {count: count, timestamps: timestamps})
        }else{
            timeMap.set(key, {count: 1, timestamps:[timeData]})
        }
    })
    timeMap.forEach((value, key, map)=>{
        let dateString = new Date(value.timestamps[0].timestamp).toDateString()
        let id = key
        updatableData.push({
            measure: "day",
            id: id,
            xLabel: dateString,
            timestamps: value.timestamps,
            count: value.count
        })
    })
    xAxisLabel = "Days"
    console.log(updatableData)
}

function getTimeStampByHour(originalData, updatableData, date, month, year){
    updatableData.length = 0
    let filteredData = originalData.filter(data => data.month === month &&
                                                   data.year === year &&
                                                   data.date === date);                                                   
    let timeMap = new Map()
    for (let i = 0; i<24; i++){
        timeMap.set(i, {count: 0, timestamps:[]})
    }
    console.log(timeMap)
    xAxisLabel = "Hours ("+new Date(filteredData[0].timestamp).toDateString()+")"
    filteredData.forEach(timeData =>{
        let key = timeData.hour
        let count  = timeMap.get(key).count+1
        let timestamps = timeMap.get(key).timestamps
        timestamps.push(timeData)
        timeMap.set(key, {count: count, timestamps: timestamps})
    })
    timeMap.forEach((value, key, map)=>{
        let id = year+""+month+""+date+""+key
        let xLabel = `${getStandardHour(key)}${getAmPm(key)}-${getStandardHour(key+1)}${getAmPm(key+1)}`
        // if (key<11){
        //     xLabel = `${key}AM-${key+1}AM`
        // }else if(key === 11){
        //     xLabel = `${key}AM-${key+1}PM`
        // }else if(key>11 && key<23){
        //     xLabel = `${key%12}PM-${(key+1)%12}PM`
        // }else{
        //     xLabel = `${key%12}PM-${(key+1)%12}AM`
        // }
        updatableData.push({
            measure: "hour",
            id: id,
            xLabel: xLabel,
            timestamps: value.timestamps,
            count: value.count
        })
    })
    console.log(updatableData)
}


function getTimeStampByMinute(originalData, updatableData, hour,date, month, year){
    updatableData.length = 0
    let filteredData = originalData.filter(data => data.month === month &&
                                                   data.year === year &&
                                                   data.date === date &&
                                                   data.hour === hour);                                                   
    let timeMap = new Map()
    for (let i = 5; i<=60; i+=5){
        timeMap.set(i, {count: 0, timestamps:[]})
    }
    
    console.log(filteredData)
    xAxisLabel = "Minutes ("+new Date(filteredData[0].timestamp).toDateString()+" from "
                    + `${getStandardHour(hour)}${getAmPm(hour)} to ${getStandardHour(hour+1)}${getAmPm(hour+1)})`
    filteredData.forEach(timeData =>{
        let key = Math.ceil(timeData.min/5)*5
        if(key === 0){
            key = 5
        }
        let count  = timeMap.get(key).count+1
        let timestamps = timeMap.get(key).timestamps
        timestamps.push(timeData)
        timeMap.set(key, {count: count, timestamps: timestamps})
    })
    timeMap.forEach((value, key, map)=>{
        let id = year+""+month+""+date+""+hour+""+key
        let xLabel = ""
        if (key<=55){
            xLabel = `${getStandardHour(hour)}:${key-5<10?"0"+(key-5):key-5}${getAmPm(hour)}-${getStandardHour(hour)}:${key<10?"0"+key:key}${getAmPm(hour)}`
        }else{
            xLabel = `${getStandardHour(hour)}:${key-5}${getAmPm(hour)}-${getStandardHour(hour+1)}:00${getAmPm(hour+1)}`
        }
        // if (hour<11){
        //     xLabel = `${hour}:${key-5}AM-${hour}:${key}AM`
        // }else if(key === 11){
        //     xLabel = `${hour}:${key-5}AM-${hour}:${key}PM`
        // }else if(key>11 && key<23){
        //     xLabel = `${hour%12}:${key-5}PM-${(hour)%12}:${key}PM`
        // }else{
        //     xLabel = `${hour%12}:${key-5}PM-${(hour)%12}:${key}AM`
        // }
        updatableData.push({
            measure: "min",
            id: id,
            xLabel: xLabel,
            timestamps: value.timestamps,
            count: value.count
        })
    })
}

function selectTimeStampByMinute(originalData, updatableData, minute, hour,date, month, year){
    getTimeStampByMinute(originalData, updatableData,hour, date, month, year)
    let key = Math.ceil(minute/5)*5
    if(key === 0){
        key = 5
    }
    let id = year+""+month+""+date+""+hour+""+key
    newData = updatableData.filter(datapoint => datapoint.id === id)
    updatableData.length = 0
    newData.forEach(item => updatableData.push(item))
}

function selectedNodesByTimestamps(event, dataVals) {
    if (selectedNodeId) {
        d3.select("#circle" + selectedNodeId).classed("selectedNode", false);
        d3.selectAll(`.from${selectedNodeId},.to${selectedNodeId}`)
            .classed("highlightedEdges", false);
    }
    d3.selectAll("path").classed("dimmedEdges", true);
    selectedNodesIds.forEach(id => {
        d3.select("#circle" + id).classed("selectedNode", false);
        d3.selectAll(`.from${id},.to${id}`)
            .classed("highlightedEdges", false);
    })
    selectedNodesIds.length = 0
    dataVals.forEach(data =>{
        data.timestamps.forEach(item =>{
            d3.select("#circle" + item.nodeId).classed("selectedNode", true);
            selectedNodesIds.push(item.nodeId);
            d3.selectAll(`.from${item.nodeId},.to${item.nodeId}`)
                .classed("highlightedEdges", true);
        })
    })
    event.stopPropagation();
}

function getAmPm(hour){
    if (hour <= 11 || hour === 24)
        return 'AM'
    else
        return 'PM'
}

function getStandardHour(hour){
    if (hour === 0 || hour === 24){
        return 12
    }else if(hour > 12){
        return hour%12
    }else{
        return hour
    }
}

function goBack(e){
    if(curr_time_measures.measure === "hour"){
        getTimeStampByDate(timestamps, updatableData)
        curr_time_measures = {measure: "day"}
        document.getElementById('goBackButton').disabled = true;
    }else if(curr_time_measures.measure === "min"){
        getTimeStampByHour(timestamps, updatableData, curr_time_measures.date,curr_time_measures.month, curr_time_measures.year)
        curr_time_measures = {measure: "hour", date: timestamp.date, month: timestamp.month,year: timestamp.year}
    }
    selectedNodesByTimestamps(window.event,updatableData)
    bar_svg.selectAll('g').remove()
    d3.select('.tooltipBars').transition()		
        .duration(500)		
        .style("opacity", 0);
    drawBars(timestamps, updatableData, bar_svg)
}

function zoom(event) {
    d3.select("#network").selectAll("g").attr("transform", event.transform);
}