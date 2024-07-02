import { SceneGraph } from '/demo/src/scene-graph.mjs';

const squarediv = document.querySelector('#square');
const squareGraph = new SceneGraph({width: 250, height: 150});
squarediv.prepend(squareGraph.canvas)
squareGraph.render();

function square(size){
  const vs = [];
  for(var i=0; i<size; i++){
    let row = [];
    let previous = null, current = null;
    for(var j=0; j<size; j++){
      current = squareGraph.addVertex({color: '#ff4500', size: 1.5})

      row.push(current);
      
      if(previous){
        squareGraph.addEdge(previous, current, {color: 'black'})
      }
      
      if(i>0){
        squareGraph.addEdge(vs[i-1][j], current, {color: 'black'});
      }
      
      previous = current
    }
    vs.push(row);
  }
}

square(4)