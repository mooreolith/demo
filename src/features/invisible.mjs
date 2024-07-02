import { SceneGraph } from '/demo/src/scene-graph.mjs';

const invisibleGraph = new SceneGraph({width: 250, height: 150});
const invisibleDiv = document.querySelector('#invisible');
invisibleDiv.prepend(invisibleGraph.canvas);
invisibleGraph.render();

const vida = invisibleGraph.addVertex({
  id: 'vertex-1', 
  color: '#ff4500', 
  size: 1.0, 
});

const vidb = invisibleGraph.addVertex({
  id: 'vertex-2', 
  color: '#ff4500', 
  size: 1.0, 
});

let edgeId;
window.toggleInvisible = function(){
  if(edgeId){
    invisibleGraph.removeEdge(edgeId);
    edgeId = undefined;
  }else{
    edgeId = invisibleGraph.addEdge(vida, vidb, {invisible: true});
  }
}