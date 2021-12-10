// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/tree
// Modified to suit our needs
function Tree(data, { // data is in hierarchy (nested objects) form
    id = Array.isArray(data) ? d => d.id : null, // if tabular data, given a d in data, returns a unique identifier (string)
    parentId = Array.isArray(data) ? d => d.parentId : null, // if tabular data, given a node d, returns its parent’s identifier
    children, // if hierarchical data, given a d in data, returns its children
    tree = d3.tree, // layout algorithm (typically d3.tree or d3.cluster)
    sort, // how to sort nodes prior to layout (e.g., (a, b) => d3.descending(a.height, b.height))
    label, // given a node d, returns the display name
    title, // given a node d, returns its hover text
    link, // given a node d, its link (if any)
    linkTarget = "_blank", // the target attribute for links (if any)
    width = 640, // outer width, in pixels
    height, // outer height, in pixels
    r, // radius of nodes
    padding = 0.5, // horizontal padding for first and last column
    fill = "#000", // fill for nodes
    fillOpacity = "0.8", // fill opacity for nodes
    stroke = "#555", // stroke for links
    strokeWidth = 1, // stroke width for links
    strokeOpacity = 0.35, // stroke opacity for links
    strokeLinejoin, // stroke line join for links
    strokeLinecap, // stroke line cap for links
    halo = "#fff", // color of label halo 
    haloWidth = 3, // padding around the labels
    } = {})
{
    // we assume that the data is specified as an object {children} with nested objects (a.k.a. the “flare.json” format), and use d3.hierarchy.
    const root = d3.hierarchy(data, children);

    // Compute labels and titles.
    const descendants = root.descendants();
    const L = label == null ? null : descendants.map(d => label(d.data, d));

    // Sort the nodes.
    if (sort != null) root.sort(sort);
    // Compute the layout.
    var nodeHeight = r * 2;
    const dx = nodeHeight;
    const dy = width / (root.height - 1 /* the root is a ghost node only used for alignment */ + padding);
    nodeWidth = dy; // this variable is used to draw the level bars outside of this function
    const totalWidth = dy * (root.height + padding);
    tree().nodeSize([dx, dy])(root);    // compute and set the x and y coordiantes of each node

    // Center the tree.
    let x0 = Infinity;
    let x1 = -x0;
    root.each(d => {
        if (d.x > x1) x1 = d.x;
        if (d.x < x0) x0 = d.x;
    });
    let height_mult = (x1 - x0 + dx * 2) / (height);
    // Compute the default height.
    if (height === undefined) height = x1 - x0 + dx * 2;

    svg.attr("viewBox", [-dy * padding / 2, x0 - dx, totalWidth, height*height_mult])
        .attr("width", totalWidth)
        .attr("height", height)
        .attr("transform", `translate(-${dy}, 0)`)
        .attr("style", "height: 100%;")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .call(d3.zoom()
            .translateExtent([[-dy * padding / 2, x0 - dx], [totalWidth, height * height_mult]])
            .scaleExtent([1, 24])
            .on("zoom", zoom));
    

    /* draw level bars here since the level bars svg needs to match the size of the network graph svg */
    let tooltipLevelBars = d3.select("#bar_chart_div").append("div")	
        .attr("class", "tooltipBars")				
        .style("opacity", 0);

    setNodesPerLevel(root)
    d3.select("#levelBarContainer")
        .style("height", levelGraphHeight + "px");
    let levelBarSvg = d3.select("#levelBar")
        .attr("viewBox", [-dy * padding / 2, 0, totalWidth, height*height_mult])
        .attr("width", totalWidth)
        .attr("height", height)
        .attr("transform", `translate(-${dy}, 0)`);
    let totalLevels = nodesPerLevel.length;
    levelBarSvg.selectAll('rect')
        .data(nodesPerLevel)
        .enter()
        .append('rect')
        .attr('x', d => d.xPos - nodeHeight)
        .attr('y', 0)
        .attr('width', nodeWidth)
        .attr('height', levelGraphHeight)
        .style('fill', 'darkblue')
        .style('opacity', d=>d.rank/totalLevels)
        .attr('stroke', 'black')
        .on("mousemove", function(e,d) {
            tooltipLevelBars.transition()		
                .duration(200)		
                .style("opacity", .9);		
            tooltipLevelBars.html(`Level:${d.level}<br>Total nodes: ${d.count}`)	
                .style("left", (e.x + 10) + "px")		
                .style("top", (e.y + 10) + "px");	
        })
        .on("mouseout", function(e,d) {	
            d3.select(`#data${d.id}`)
                .style("opacity", '0.8')
            tooltipLevelBars.transition()		
                .duration(500)		
                .style("opacity", 0);	
            })
    /* done drawing level bars */

    svg.append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", strokeOpacity)
        .attr("stroke-linecap", strokeLinecap)
        .attr("stroke-linejoin", strokeLinejoin)
        .attr("stroke-width", strokeWidth)
        .selectAll("path")
        .data(root.links())
        .join("path")
        .attr("class", d => `from${d.target.data.id} to${d.source.data.id}`)
        .classed("fakeRootElements", d => d.source.data.id == "0")
        .classed("treeEdges", true)
        .attr("stroke", getGradientForTreeLink)
        .attr("id", d => "link" + d.target.data.id + "to" + d.source.data.id)
        .attr("d", computePathCommandsForTreeEdges);

    const node = svg.append("g")
        .selectAll("a")
        .data(root.descendants())
        .join("a")
        .classed("fakeRootElements", d => d.data.id == "0")
        .attr("id", d => "node" + d.data.id)
        .attr("xlink:href", link == null ? null : d => link(d.data, d))
        .attr("target", link == null ? null : linkTarget)
        .attr("transform", d => `translate(${d.y},${d.x})`);

    node.append("circle")
        .attr("id", d => "circle" + d.data.id)
        .attr("fill", fill)
        .attr("fill-opacity", fillOpacity)
        .attr("r", computeNodeRadius)
        .on("click", updateSelectedNode);

    let extraLinksBetweenNodes = getLinksBetweenNodes(root.descendants(), true, true);
    svg.append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", strokeOpacity)
        .attr("stroke-linecap", strokeLinecap)
        .attr("stroke-linejoin", strokeLinejoin)
        .attr("stroke-width", strokeWidth)
        .selectAll("path")
        .data(extraLinksBetweenNodes)
        .join("path")
        .attr("class", d => `from${d.source.data.id} to${d.target.data.id}`)
        .classed("extraEdgesBetweenNodes", true)
        .classed("extraEdgesAcrossLevels", d => !d.sameLevel)
        .classed("extraEdgesWithinLevels", d => d.sameLevel)
        .attr("stroke", getGradientForLink)
        .attr("id", d => "link" + d.source.data.id + "to" + d.target.data.id)
        .attr("d", drawPathBetweenNodes);

    if (title != null) node.append("title")
        .text(d => title(d.data, d));

    if (L) node.append("text")
        .attr("dy", "0.32em")
        .attr("x", d => d.children ? -6 : 6)
        .attr("text-anchor", d => d.children ? "end" : "start")
        .text((d, i) => L[i])
        .call(text => text.clone(true))
        .attr("fill", "none")
        .attr("stroke", halo)
        .attr("stroke-width", haloWidth);
        
    return root;
}

function drawTimestampBarChart(treeHierarchy){
    treeHierarchy.eachBefore(node =>{
        time = node.data.timestamp
        if (time !== undefined){
            let datetime = new Date(time)
            let date = datetime.getDate()
            let month = datetime.getMonth()
            let year = datetime.getFullYear()
            let hour = datetime.getHours()
            let min = datetime.getMinutes()
            let seconds = datetime.getSeconds() 
            timestamps.push(
                {
                    'timestamp': time,
                    'year': year,
                    'month': month,
                    'date': date,
                    'hour': hour,
                    'min': min,
                    'seconds': seconds,
                    'nodeId': node.data.id
                }
            )
        }
    })

    //nodeData is already sorted with respect to timestamp. So, timestamp is sorted too
    getTimeStampByDate(timestamps, updatableData)
    bar_svg = drawBarSvg()
    drawBars(timestamps, updatableData, bar_svg)
    // setInterval(()=>{
    //     getTimeStampByHour(timestamps, updatableData, 2,5,2020)
    //     svg.selectAll('g').remove()
    //     drawBars(timestamps, updatableData, svg)
    // }, 3000)
}

function drawBarSvg(){
    // let width = document.getElementById('bar_chart_div').clientWidth
    // let height = document.getElementById('bar_chart_div').clientHeight
    let width = sidebarWidth;//document.getElementById('bar_chart_div').clientWidth
    let height = barGraphHeight;//document.getElementById('bar_chart_div').clientHeight

    let svg = d3.select("#bar_chart_viz")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr('id', 'time_bars')
        
    return svg;
}

function drawBars(originalData, data, svg){
    let width = sidebarWidth;//document.getElementById('bar_chart_div').clientWidth
    let height = barGraphHeight;//document.getElementById('bar_chart_div').clientHeight

    let xVal = d => d.xLabel
    let yVal = d => d.count

    let margin = {top: height*0.1, bottom: height*0.5, left: width*0.1, right: width*0.1}
    let innerWidth = width - margin.left - margin.right
    let innerHeight = height - margin.top - margin.bottom

    let xScale = d3.scaleBand()
        .domain(data.map(d=>d.xLabel))
        .range([0, innerWidth])
        .padding(0.05)

    let maxCount = d3.max(data, d=> d.count)
    let yScale = d3.scaleLinear()
        .domain([0, maxCount])
        .range([innerHeight, 0])

    let tooltipBars = d3.select("#bar_chart_div").append("div")	
        .attr("class", "tooltipBars")				
        .style("opacity", 0);

    // let svg = d3.select("body")
    //     .append("svg")
    //     .attr("width", width)
    //     .attr("height", height)
    //     .attr('id', 'time_bars')

    let g = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)

    g.append('g').call(d3.axisBottom(xScale))
        .attr('transform', `translate(0, ${innerHeight})`)
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");
    g.append('g').call(d3.axisLeft(yScale)
        .tickSize(-innerWidth)
        .tickFormat(d3.format("d"))
        .ticks(maxCount>10?10:maxCount))
        .selectAll(".tick, .domain")
        .attr("stroke-opacity", 0.2)

    // let timeBars = document.getElementById('time_bars')
    // let svgBox = timeBars.viewBox.baseVal;
    // console.log(svgBox)

    let dataBars = g.selectAll('rect').data(data, d=>d.id)

    dataBars.enter().append('rect').merge(dataBars)
        .attr('x', d => xScale(xVal(d)))
        .attr('width', xScale.bandwidth())
        .attr('y', d => yScale(yVal(d)))
        .attr('height', d => innerHeight - yScale(yVal(d)))
        .attr("id", (d) => { return "data"+d.id})
        .style('fill', 'steelblue')
        .style("opacity", '0.8')
        .on("mousemove", function(e,d) {
            d3.select(`#data${d.id}`)
                .style("opacity", 1)
            tooltipBars.transition()		
                .duration(200)		
                .style("opacity", .9);		
            tooltipBars.html(`Count: ${d.count}`)	
                .style("left", (e.x + 10) + "px")		
                .style("top", (e.y + 10) + "px");	
        })
        .on("mouseout", function(e,d) {	
            d3.select(`#data${d.id}`)
                .style("opacity", '0.8')
            tooltipBars.transition()		
                .duration(500)		
                .style("opacity", 0);	
            })
        .on("dblclick", function(e,d){
            timestamp = d.timestamps[0]
            if(d.measure === 'min') return
            if(d.measure === "day"){
                document.getElementById('goBackButton').disabled = false;
                getTimeStampByHour(timestamps, data, timestamp.date,timestamp.month,timestamp.year)
                curr_time_measures = {measure: "hour", date: timestamp.date, month: timestamp.month,year: timestamp.year}
            }else if(d.measure === "hour"){
                getTimeStampByMinute(timestamps, data, timestamp.hour, timestamp.date,timestamp.month,timestamp.year)
                curr_time_measures = {measure: "min", date: timestamp.date, month: timestamp.month,year: timestamp.year}
            }
            selectedNodesByTimestamps(e,data)
            svg.selectAll('g').remove()
            d3.select(`#data${d.id}`)
                .style("opacity", '0.8')
            tooltipBars.transition()		
                .duration(500)		
                .style("opacity", 0);
            drawBars(originalData, data, svg)
        })
        .on("click", function(e,d){
            timestamp = d.timestamps[0]
            if(d.measure === "day"){
                getTimeStampByHour(timestamps, data, timestamp.date,timestamp.month,timestamp.year)
            }else if(d.measure === "hour"){
                getTimeStampByMinute(timestamps, data, timestamp.hour, timestamp.date,timestamp.month,timestamp.year)
            }else if(d.measure === 'min'){
                console.log("measure minute")
                selectTimeStampByMinute(timestamps, data, timestamp.min, timestamp.hour, timestamp.date,timestamp.month,timestamp.year)
            }
            selectedNodesByTimestamps(e,data)
            d3.select(`#data${d.id}`)
                .style("opacity", '0.8')
            tooltipBars.transition()		
                .duration(500)		
                .style("opacity", 0);
            svg.selectAll('rect')
                .style("fill", 'steelblue')
            d3.select(`#data${d.id}`)
                .style("fill", 'red')
        })

        dataBars.exit().remove()


        svg.on("click", function(e){
            deselectSelectedNodes()
            svg.selectAll('rect')
                .style("fill", 'steelblue')
                .style("opacity", '0.8')
        })

        g.append('text')
            .attr('x', innerWidth/2)
            .attr('y', innerHeight+margin.bottom*0.6)
            .style('fill','black')
            .attr("text-anchor","middle")
            .text(`${xAxisLabel}`)

        g.append('text')
            .attr('x', innerWidth/2)
            .attr('y', -margin.top*0.5)
            .style('fill','black')
            .attr("text-anchor","middle")
            .text("Number of posts by the time of post")

}

/*  this function is no longer called. The task is instead done in the Tree function
function drawLevelBars(treeHierarchy){
    setNodesPerLevel(treeHierarchy)
    console.log("nodesPerLevel", nodesPerLevel);
    let width = networkGraphWidth;  // include the space used for the ghost node in the width
    let height = 30;//document.getElementById('bar_chart_div').clientHeight

    d3.select("#levelBar")
        .attr("width", width)
        .attr("height", height);

    let levelBar = d3.select("#levelBar").selectAll('rect').data(nodesPerLevel);
    let totalLevels = nodesPerLevel.length;

    levelBar.enter().append('rect')
        .attr('x', d => d.xPos - nodeWidth)
        .attr('y', 0)
        .attr('width', nodeWidth)
        .attr('height', height)
        .style('fill', 'darkblue')
        .style('opacity', d=>d.rank/totalLevels)
        .attr('stroke', 'black')
}*/