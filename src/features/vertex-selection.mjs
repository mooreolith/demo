import { SceneGraph } from '/src/scene-graph.mjs';

const selectionGraph = new SceneGraph({width: 250, height: 150});
const selectionDiv = document.querySelector('#vertex-selection');
selectionDiv.prepend(selectionGraph.canvas);
selectionGraph.render();

const selectionOutput = document.querySelector('#selection-output')

for(var i=0; i<20; i++){
  selectionGraph.addVertex({id: `vertex-${i}`, color: '#ff4500', size: 1.5})
}

selectionGraph.addEventListener('vertex-click', function(e){
  // alert(`Vertex selected: ${e.detail.userData.id}`);
  let selectedIds = [...selectionGraph.selection].map(v => v.userData.id);
  selectionOutput.textContent = `Vertices selected: ${selectedIds.join(', ')}`;
})

window.onselect = function(){
  alert(`Selected Vertices: ${[...selectionGraph.selection]}`);
}
