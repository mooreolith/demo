import { SceneGraph } from '/demo/src/scene-graph.mjs';

const pyramidDiv = document.querySelector('#pyramid');
const pyramidGraph = new SceneGraph({width: 250, height: 150});
pyramidDiv.prepend(pyramidGraph.canvas)
pyramidGraph.render();

function pyramid(){
  const vs = [];

  for(var i=0; i<10; i++){
    vs.push(pyramidGraph.addVertex({color: '#ff4500', size: 1}))
  }

  function connect(i, j){
    pyramidGraph.addEdge(vs[i], vs[j], {color: 'black'})
  }
  const c = connect;

  c(0, 1); c(1, 2); c(0, 3);
  c(0, 3); c(1, 3); c(1, 4); c(2, 4);
  c(3, 4); c(3, 5); c(4, 5);
  
  c(0, 6); c(1, 6); c(3, 6);
  c(1, 7); c(2, 7); c(4, 7);
  c(3, 8); c(4, 8); c(5, 8);
  c(6, 7); c(7, 8); c(8, 6);

  c(6, 9); c(7, 9); c(8, 9);


}

pyramid();