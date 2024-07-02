import { SceneGraph } from '/src/scene-graph.mjs';

const sizeGraph = new SceneGraph({width: 250, height: 150});
const sizeDiv = document.querySelector('#size');
sizeDiv.prepend(sizeGraph.canvas);
sizeGraph.render();

const sizeInput = sizeDiv.querySelector('input.change-size');
sizeGraph.addVertex({id: 'vertex-1', color: '#ff4500', size: 1.0});

window.sizeChanged = function(){
  sizeGraph.setVertexOption('vertex-1', 'size', sizeInput.value);
}