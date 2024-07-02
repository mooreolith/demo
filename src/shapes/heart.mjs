import { SceneGraph } from '/demo/src/scene-graph.mjs';

const heartDiv = document.querySelector('#heart');
const heartGraph = new SceneGraph({width: 250, height: 150});
heartDiv.prepend(heartGraph.canvas)
heartGraph.render();

function heart(){
  const vs = [];
  for(var i=0; i<8; i++){
    vs.push(heartGraph.addVertex({color: '#ff4500', size: 1}))
  }

  heartGraph.addEdge(vs[0], vs[1], {color: 'black'});
  heartGraph.addEdge(vs[0], vs[2], {color: 'black'});
  heartGraph.addEdge(vs[1], vs[2], {color: 'black'});
  heartGraph.addEdge(vs[1], vs[3], {color: 'black'});
  heartGraph.addEdge(vs[1], vs[4], {color: 'black'});
  heartGraph.addEdge(vs[2], vs[4], {color: 'black'});
  heartGraph.addEdge(vs[2], vs[5], {color: 'black'});
  heartGraph.addEdge(vs[3], vs[4], {color: 'black'});
  heartGraph.addEdge(vs[4], vs[5], {color: 'black'});
  heartGraph.addEdge(vs[3], vs[6], {color: 'black'});
  heartGraph.addEdge(vs[4], vs[6], {color: 'black'});
  heartGraph.addEdge(vs[4], vs[7], {color: 'black'});
  heartGraph.addEdge(vs[5], vs[7], {color: 'black'});
}

heart();