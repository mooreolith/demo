import { SceneGraph } from '/src/scene-graph.mjs';

const labelGraph = new SceneGraph({width: 250, height: 150});
const labelDiv = document.querySelector('#label');
labelDiv.prepend(labelGraph.canvas);
labelGraph.render();

const vertexId = labelGraph.addVertex({
  id: 'vertex-1', 
  color: '#ff4500', 
  size: 1.0, 
  label: {
    text: "Hello, Worlds!",
    fontSize: '10px',
    color: 'black',
    offset: {y: 10}
  }
});