let transitionSpeed = 1000

let svg = d3.select("body")
    .append("svg")
    .attr("width", 500)
    .attr("height", 500);


let childNodes = []
let parentNode = [20, 120]
let links = []
let intiLinks = []

for (let i = 1; i<20; i++){
    childNodes.push({x: 250, y:i*12})
}

childNodes.push({x: 40, y: 240})

childNodes.forEach(item =>{
    links.push({source: parentNode, target: [item.x, item.y]})
})

childNodes.push({x: 20, y: 120})


let link = d3.linkHorizontal()
               .source(d => d.source)
               .target( d=> d.target)

let priorLink = d3.linkHorizontal()
               .source(d => d.source)
               .target(d => d.source)

               
drawEdges()
setTimeout(drawCircles, transitionSpeed)


function drawCircles(){
let dataCircles = svg.selectAll('circle').data(childNodes)


dataCircles.enter().append('circle')
    .attr('cx', d=>d.x)
    .attr('cy', d=> d.y)
    .style('fill', 'blue')
    .transition()
    .duration(1000)
        .attr('r', 5)
}


function drawEdges(){
    svg.selectAll("path")
    .data(links)
    .enter()
    .append("path")
    .attr("d", priorLink)
    .attr("fill", "none")
    .attr("stroke", "blue")
    .transition()
    .duration(transitionSpeed)
        .attr("d", link)
        .ease(d3.easeLinear)
}

console.log(childNodes)

let line = d3.line().curve(d3.curveBasis)
let l = [[250,120],[280, 120], [250, 350],[230, 181],[250,12]]
svg.append("path")
            .attr("d", line(l))
            .attr("fill", "none")
            .attr("stroke", "blue");