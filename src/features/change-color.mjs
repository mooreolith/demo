import { SceneGraph } from '/demo/src/scene-graph.mjs';

const textureGraph = new SceneGraph({width: 250, height: 150});
const textureDiv = document.querySelector('#texture');
textureDiv.prepend(textureGraph.canvas);
textureGraph.render();

const colorInput = textureDiv.querySelector('input.change-color');
textureGraph.addVertex({id: 'vertex-1', color: colorInput.value, size: 10});

window.changeColor = function(){
  textureGraph.setVertexOption('vertex-1', 'color', colorInput.value);
}

window.changeFace = function(){
  textureGraph.setVertexOption('vertex-1', 'face', `https://picsum.photos/200/200/?random=${Math.random()}`);
}