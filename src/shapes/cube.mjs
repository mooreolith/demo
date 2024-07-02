import { SceneGraph } from '/src/scene-graph.mjs';

const cubeDiv = document.querySelector('#cube');
const cubeGraph = new SceneGraph({width: 250, height: 150});
cubeDiv.prepend(cubeGraph.canvas)
cubeGraph.render();

function cube(size){
  const rows = [];
  for(let i=0; i<size; i++){
    let columns = [];
    for(let j=0; j<size; j++){
      let depths = [];
      for(let k=0; k<size; k++){
        depths.push(cubeGraph.addVertex({id: `vertex-${i}-${j}-${k}`, color: '#ff4500', size: 1}))

        if(k > 0){
          cubeGraph.addEdge(depths[k-1], depths[k], {color: 'black'})
        }

        if(j > 0){
          cubeGraph.addEdge(columns[j-1][k], depths[k], {color: 'black'})
        }

        if(i > 0){
          cubeGraph.addEdge(rows[i-1][j][k], depths[k], {color: 'black'})
        }
      }
      columns.push(depths);
    }
    rows.push(columns);
  }

  return rows;
}

cube(5)