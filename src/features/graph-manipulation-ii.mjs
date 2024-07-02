import { SceneGraph } from '/demo/src/scene-graph.mjs';

const graphII = new SceneGraph({width: 250, height: 150});
const graphIIDiv = document.querySelector('#graph-manipulation-ii');
graphIIDiv.prepend(graphII.canvas);
graphII.render();

for(var i=0; i<10; i++){
  graphII.addVertex({id: `vertex-${i}`, color: '#ff4500', size: 1.0});
}

const edgeIdStack = [];

window.addEdge = function(){
  const vertices = [...graphII.selection].map(v => v.userData.id);
  console.log(...vertices)
  if(vertices.length === 2){
    const edgeId = graphII.addEdge(vertices[0], vertices[1], {color: 'black'});
    edgeIdStack.push(edgeId);
  }
}

window.removeEdge = function(){
  graphII.removeEdge(edgeIdStack.pop());
}