import { SceneGraph } from '/demo/src/scene-graph.mjs';

const graphDiv = document.querySelector('#graph-manipulation');
const graph = new SceneGraph({width: 250, height: 150});
graphDiv.prepend(graph.canvas)

var vertexIdStack = [];

window.addVertex = function addVertex(){
  var vertexId = graph.addVertex({color: '#ff4500', size: 1.5});
  vertexIdStack.push(vertexId);
}

window.removeVertex = function removeVertex(){
  graph.removeVertex(vertexIdStack.pop());
}