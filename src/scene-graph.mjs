import * as three from '/demo/lib/three.module.js';
import { OrbitControls } from '/demo/lib/OrbitControls.js';


/*
  Constants for the physics simulation (LayoutGraph).
*/

class Constants {
  // spring constant; more K, more attraction
  static K = 2.0

  // repulsion constant; more f0, more repulsion
  static f0 = 20.0

  // time step; more dt, faster simulation
  static dt = 0.02

  // damping constant; more D, more damping
  static D = 0.75 

  // minimum distance; to avoid division by zero
  static epsilon = 0.1

  // Barnes-Hut theta; more theta, less accuracy and more speed
  static theta = 0.5

  static innerDistance = 25.0
}


class Octree {
  constructor(){
    this.inners = new Set();
    this.outers = new Map();
    this.centerSum = new three.Vector3(
      Math.random() * 10,
      Math.random() * 10,
      Math.random() * 10
    );
    this.count = 0;
  }

  center(){
    let centerSum = Array.from(this.inners).reduce((prev, cur) => {
      return prev.add(cur.position);
    }, new three.Vector3(
      Math.random() * 10,
      Math.random() * 10,
      Math.random() * 10
    ));

    let count = this.inners.size;

    return centerSum.divideScalar(count);
  }

  get position(){
    return this.center();
  }

  insert(vertex){
    this.count++;
    this.centerSum.add(vertex.position);

    if(this.inners.size == 0){
      this.placeInner(vertex);
    }else{
      var dist = this.center().clone().sub(vertex.position);

      if(dist.length() < Constants.innerDistance){
        this.placeInner(vertex);
      }else{
        this.placeOuter(vertex);
      }
    }
  }

  remove(vertex){
    if(this.inners.has(vertex)){
      this.inners.delete(vertex);
      this.count--;
    }else{
      for(let [key, octree] of this.outers){
        if(octree.contains(vertex)){
          octree.remove(vertex);
          if(octree.size === 0){
            this.outers.delete(key);
          }
          break;
        }
      }
    }
  }

  estimate(v, forceFn){
    var f = new three.Vector3();
    if(this.inners.has(v)){
      for(var inner of this.inners){
        if(inner.id != v.id){
          var force = forceFn(v, inner);
          f.add(force);
        }
      }
    }else{
      var c = this.center();
      f.add(forceFn(v, this)).multiplyScalar(this.inners.size);
    }

    this.outers.forEach((octree, key) => {
      var dist = this.center().clone().sub(octree.center());
      var d = dist.length();

      if(d < Constants.theta * this.size){
        f.add(octree.estimate(v, forceFn));
      }else{
        var force = forceFn(v, octree);
        f.add(force);
      }
    });

    return f;
  }

  get size(){
    return this.count > 0 ? this.count : 1;
  }

  getOctant(pos){
    var c = this.center();

    var x = c.x < pos.x ? 'l' : 'r';
    var y = c.y < pos.y ? 'u' : 'd';
    var z = c.z < pos.z ? 'i' : 'o';

    return `${x}${y}${z}`;
  }

  placeInner(vertex){
    this.inners.add(vertex);
  }

  placeOuter(vertex){
    var o = this.getOctant(vertex.position);
    if(!this.outers.has(o)){
      this.outers.set(o, new Octree());
    }

    this.outers.get(o).insert(vertex);
  }
}


function coalesce(...args) {
  const obj = {}
  for (const arg of args) {
    for(const key in arg){
      if(arg[key]){
        obj[key] = arg[key]
      }
    }
  }

  return obj
}

class LayoutVertex extends EventTarget {
  constructor(id, options) {
    super()
    
    this.id = id
    this.options = coalesce(Constants, options)

    this.priority = Math.random() // dynamic matching things
    this.edges = new Set()

    const s = 5
    this.position = new three.Vector3(
      Math.random()*s, 
      Math.random()*s, 
      Math.random()*s
    )
    this.velocity = new three.Vector3(0, 0, 0)
    this.acceleration = new three.Vector3(0, 0, 0)
  }

  /*
   * Update the position of the vertex
   *
   * The update function is called on every frame of the animation loop.
   * It adds the vertex's acceleration to its velocity, and adds that to its position
   * 
   * This function should be called after repulsion and attraction have been calculated. 
   * 
   * last
   */
  update() {
    this.velocity.add(this.acceleration.clone().multiplyScalar(Constants.dt))
    this.velocity.multiplyScalar(Constants.D)
    this.position.add(this.velocity.clone().multiplyScalar(Constants.dt))
    this.acceleration.set(0, 0, 0)

    return this.position
  }
}

class LayoutEdge extends EventTarget {
  constructor(id, source, target, options, graph) {
    super()
    
    this.id = id
    this.source = source
    this.target = target
    this.graph = graph

    this.options = options // todo 
  }

  update() {
    // nothing special here
  }
}

class LayoutGraph extends EventTarget {
  /*
    Static fields for generating unique ids for vertices and edges
  */
  static vertexId = 0
  static edgeId = 0

  /*
    
  */
  vertices = new Map()
  edges = new Map()
  octree = new Octree()


  /*
    Constructor for LayoutGraph class
  */
  constructor() {
    super()

    this.calculateRepulsionForces = this.calculateRepulsionForces.bind(this)
    this.calculateAttractionForces = this.calculateAttractionForces.bind(this)
  }

  /*
    Update the position of all vertices in the graph
  
    The update function is called on every frame of the animation loop.
    It calculates the repulsion forces between all vertices and the 
    attraction forces between connected vertices.
  */
  update() {
    // this.calculateRepulsionForces()
    this.estimateRepulsionForces()
    this.calculateAttractionForces()
    
    this.updateEdges()
    this.updateVertices()

    return [...this.vertices.entries()].map(([id, vertex]) => ({ id, pos: vertex.position.clone() }) );
  }

  /*
    Add a vertex to the graph
  */
  addVertex(options={}) {
    /*
      If a id is provided via the options object, it is assigned to the edge.
      Otherwise, a unique id is generated for the edge.
      It is not recommended to mix the two approaches. Pick one and stick with it. 
    */
    let id
    if(options.id){
      id = options.id
    }else{
      id = `vertex-${LayoutGraph.vertexId++}`
    }

    const vertex = new LayoutVertex(id, options)
    vertex.id = id

    this.octree.insert(vertex)
    this.vertices.set(id, vertex)
    return id
  }

  /*
    Add an edge to the graph
  */
  addEdge(sourceId, targetId, options={}) {
    // If an id is provided via the options object, it is assigned to the edge.
    // Otherwise, a unique id is generated for the edge.
    // It is not recommended to mix the two approaches. Pick one and stick with it. 
    let id
    if(options.id){
      id = options.id
    }else{
      id = `edge-${LayoutGraph.edgeId++}`
    }

    const source = this.vertices.get(sourceId)
    const target = this.vertices.get(targetId)
    if(source && target){
      const edge = new LayoutEdge(id, source, target, options, this)
      edge.id = id
      this.edges.set(id, edge)

      source.edges.add(edge)
      target.edges.add(edge)

      return id
    }
  }

  /*
    Remove a vertex from the graph
  */
  removeVertex(id) {
    for(const [edgeId, edge] of this.edges){
      if(edge.sourceId === id || edge.targetId === id){
        this.removeEdge(edgeId)
      }
    }

    this.octree.remove(this.vertices.get(id))
    this.vertices.delete(id)
  }

  /*
    Remove an edge from the graph
  */
  removeEdge(id) {
    const edge = this.edges.get(id)
    edge.source.edges.delete(edge)
    edge.target.edges.delete(edge)

    this.edges.delete(id)
  }

  /*
    Unused, see estimateRepulsionForces below
  */
  calculateRepulsionForces() {
    const vertices = Array.from(this.vertices.values())

    for (let i = 0; i < vertices.length; i++) {
      for (let j = i + 1; j < vertices.length; j++) {
        if (vertices[i] && vertices[j] && (i !== j)) {
          const difference = new three.Vector3().subVectors(vertices[i].position, vertices[j].position)
          const distance = difference.length() || Constants.epsilon
          const force = difference.multiplyScalar(Constants.f0 / Math.pow(distance, 2))
          force.multiplyScalar(Constants.D)
          vertices[i].acceleration.add(force)
          vertices[j].acceleration.sub(force)
        }
      }
    }
  }

  /*
    Calculates the attraction forces between all connected vertices,  
    and adds/subtracts the resulting force to the vertices' accelerations.
  */
  calculateAttractionForces(){
    for(const edge of this.edges.values()){
      const difference = new three.Vector3().subVectors(edge.source.position, edge.target.position)
      const distance = difference.length() || Constants.epsilon
      const force = difference.multiplyScalar(Constants.K * (distance * distance)) 

      edge.source.acceleration.sub(force)
      edge.target.acceleration.add(force)
    }
  }

  /*
    Calculates the repulsion forces between all (grouped) pairs of vertices,
    and adds the resulting force to the vertices' accelerations.
  */
  estimateRepulsionForces(){
    const octree = new Octree()
    const vertices = Array.from(this.vertices.values())

    for(const vertex of vertices){
      octree.insert(vertex)
    }

    for(const vertex of vertices){
      const force = octree.estimate(vertex, (v1, v2) => {
        const difference = new three.Vector3().subVectors(v1.position, v2.position)
        const distance = difference.length() || Constants.epsilon
        return difference.multiplyScalar(Constants.f0 / Math.pow(distance, 2))
      })

      vertex.acceleration.add(force)
    }
  }

  /*
   * Update the position of all vertices in the graph
   */
  updateVertices(){
    this.vertices.forEach(vertex => vertex.update())
  } 

  /*
   * Update the position of all edges in the graph
   */
  updateEdges(){
    // Nothing to do for layout
  }
}

class SceneGraph extends EventTarget {

  constructor(options = {
    width: window.innerWidth,
    height: window.innerHeight
  }){
    super();
    // an inexaustible supply of vertex and edge ids
    this.#setupNewIds();
    this.#housekeeping(); // inner to outer edge ids - maps to keep track of the various objects in the scene
    this.#setupScene(options);
    this.#setupControls();
    this.renderer.setAnimationLoop(this.render.bind(this));
    this.#setupObjectPicking();

    // layout graph
    this.layoutGraph = new LayoutGraph();

    window.addEventListener('resize', () => {
      this.canvas.width = this.canvas.clientWidth;
      this.canvas.height = this.canvas.clientHeight;
      // Also update the camera aspect ratio and call camera.updateProjectionMatrix()
    });
  }

  render(){
    // obtain the new vertex positions
    const positions = this.layoutGraph.update();
    
    // update label positions
    this.#updateLabels();

    // update the vertex positiosn in the scene
    positions.forEach((vp) => {
      const id = vp.id;
      const pos = vp.pos;
      const mesh = this.iVertexIdsToMeshes.get(id);
      mesh.position.copy(pos);
    })

    // update the edges to their new source and target positions
    for(const line of this.iEdgeIdsToLines.values()){
      let spos = line.userData.source.position.clone();
      let tpos = line.userData.target.position.clone();
      
      line.geometry.attributes.position = new three.BufferAttribute(
        new Float32Array([spos.x, spos.y, spos.z, tpos.x, tpos.y, tpos.z]), 3);
      line.geometry.verticesNeedUpdate = true;
    }

    // update the controls
    this.controls.update();

    // render the scene
    this.renderer.render(this.scene, this.camera);
  }

  get vertices(){
    return this.layoutGraph.vertices.values();
  }

  get edges(){
    return this.layoutGraph.edges.values();
  }

  addVertex(options={}){
    // merge the options over the option defaults.
    options = this.#setupVertexOptions(options);

    // render the cube
    const cube = this.#createCube(options);
    this.#renderVertexLabel(cube, options);
    this.#prepareCube(cube, options);
    this.scene.add( cube );

    // add a corresponding vertex to the layout graph.
    const iid = this.layoutGraph.addVertex();
    this.#vertexHousekeeping(cube, options, iid);

    // return the passed in id for confirmation. 
    // this is what users of this class will refer to the vertex by.
    return options.id;
  }

  addEdge(oSourceId, oTargetId, options={}){
    // options
    options = this.#setupEdgeOptions(options);
    
    //#region reverse housekeeping
    // resolve source and target vertex
    const iSourceId = this.o2i_vid.get(oSourceId);
    const iTargetId = this.o2i_vid.get(oTargetId);

    const line = this.#createLine(iSourceId, iTargetId, options);
    this.#renderEdgeLabel(line, options);
    this.#prepareLine(line, options);
    this.scene.add(line);
    this.#edgeHousekeeping(iSourceId, iTargetId, line, options);

    return options.id;
  }

  remove(id){
    if(this.o2i_vid.has(id)){
      this.removeVertex(id);
    }else if(this.o2i_eid.has(id)){
      this.removeEdge(id);
    }else{
      return false;
    }
    return true;
  }

  removeVertex(oid){
    const iid = this.o2i_vid.get(oid);
    if(iid === undefined) return false;

    const cube = this.iVertexIdsToMeshes.get(iid);

    if(this.selection.has(cube)){
      this.undrawSelection(cube);
      this.selection.delete(cube);
    }

    if(cube.userData.edges.size > 0){
      cube.userData.edges.forEach((oeid) => {
        this.removeEdge(oeid);
      })
    }

    this.o2i_vid.delete(oid);
    this.i2o_vid.delete(iid);
    this.iVertexIdsToMeshes.delete(iid);

    this.scene.remove(cube);
    cube.geometry.dispose();
    cube.material.dispose();
    this.layoutGraph.removeVertex(iid);
    return true;
  }

  removeEdge(oid){
    const iid = this.o2i_eid.get(oid);
    if(iid === undefined) return false;

    const line = this.iEdgeIdsToLines.get(iid);

    if(this.selection.has(line)){
      this.undrawSelection(line);
      this.selection.delete(line);
    }

    this.o2i_eid.delete(oid);
    this.i2o_eid.delete(iid);
    this.iEdgeIdsToLines.delete(iid)

    this.scene.remove(line);
    line.geometry.dispose();
    line.material.dispose();
    this.layoutGraph.removeEdge(iid);
    return true;
  }

  drawSelection(object){
    let highlight;
    if(object.type == 'Mesh') {
      const geometry = new three.EdgesGeometry( object.geometry );
      const material = new three.LineBasicMaterial( { color: 0x000000 } );
      highlight = new three.LineSegments( geometry, material );
      
      const s = 1.25;
      highlight.scale.set(s, s, s);
      object.add(highlight);
    }
    if(object.type == 'Line') {
      object.material.color.set(0x000000);
    }
  }

  undrawSelection(object){
    const highlight = object.children.find((obj) => obj.type === 'LineSegments');
    if(highlight){
      object.remove(highlight);
    }
  }

  createLabel(options) {
    let div = document.createElement('div');

    div.innerHTML = options.label.text;
    div.style.position = 'fixed';
    div.style.fontSize = options.label.fontSize ?? '10px';
    div.style.color = options.label.color ?? 'black';
    div.style.border = options.label.border ?? '1px dotted darkgray';
    div.style.zIndex = '1000';

    this.canvas.parentElement.appendChild(div);
    return div;
  }

  #createCube(options) {
    const s = options.size;
    const c = options.color;
    
    const geometry = new three.BoxGeometry(s, s, s);
    let material;
    if (options.face !== undefined) {
      const face = options.face;
      const texture = new three.TextureLoader().load(face);
      material = new three.MeshBasicMaterial({ map: texture });
    } else {
      material = new three.MeshBasicMaterial({ color: c });
    }
    const cube = new three.Mesh(geometry, material);

    // set the position of the cube 
    cube.position.set(
      Math.random(),
      Math.random(),
      Math.random()
    )

    return cube;
  }

  // beginning of add vertex support functions
  
  #vertexHousekeeping(cube, options, iid) {
    this.iVertexIdsToMeshes.set(iid, cube);
    this.o2i_vid.set(options.id, iid);
    this.i2o_vid.set(iid, options.id);
    cube.userData.id = options.id;
  }

  #renderVertexLabel(cube, options) {
    if (options.label) {
      const label = this.createLabel(options);
      cube.userData.labelSpec = Object.assign({}, options.label);
      cube.userData.labelDiv = label;
    }
  }

  #prepareCube(cube, options) {
    cube.userData.size = options.size;
    cube.userData.color = options.color;
    cube.userData.invisible = options.invisible;
    cube.userData.face = options.face;

    Object.assign(cube.userData, options.userData);

    cube.userData.edges = new Set([]);
  }

  #setupVertexOptions(options) {
    let _id = options.id;
    let cleanId = (options.id instanceof String) && (parseInt(options.id[0]) == NaN);
    options = Object.assign({}, {
      id: cleanId ? _id : `vertex-${this.newVertexId++}`,
      size: 1.0,
      color: 0x000000,
      invisible: false,
      face: undefined
    }, options);

    if (options.invisible) options.size = 0.0;
    return options;
  }

  // end of add vertex support functions

  // beginning of add edge support functions

  #edgeHousekeeping(iSourceId, iTargetId, line, options) {
    const id = this.layoutGraph.addEdge(iSourceId, iTargetId);
    this.iEdgeIdsToLines.set(id, line);
    this.o2i_eid.set(options.id, id);
    this.i2o_eid.set(id, options.id);

    line.userData.id = options.id;
  }

  #renderEdgeLabel(line, options) {
    if (options.label) {
      const label = this.createLabel(options);
      line.userData.labelSpec = options.label;
      line.userData.labelDiv = label;
    }
  }

  #prepareLine(line, options) {
    line.userData.id = options.id;
    line.userData.color = options.color;
    line.userData.linewidth = options.linewidth;
    line.userData.arrow = options.arrow;

    Object.assign(line.userData, options.userData);
  }

  #createLine(iSourceId, iTargetId, options) {
    const sourceMesh = this.iVertexIdsToMeshes.get(iSourceId);
    const targetMesh = this.iVertexIdsToMeshes.get(iTargetId);

    const geometry = new three.BufferGeometry().setFromPoints([
      sourceMesh.position.clone(),
      targetMesh.position.clone()
    ]);
    const material = new three.LineBasicMaterial({ color: options.color, linewidth: options.linewidth });
    if(options.invisible){
      material.transparent = true;
      material.opacity = 0.0;
    }
    
    const line = new three.Line(geometry, material);
    line.userData.source = sourceMesh;
    line.userData.target = targetMesh;

    sourceMesh.userData.edges.add(options.id);
    targetMesh.userData.edges.add(options.id);
    return line;
  }

  #setupEdgeOptions(options) {
    let cleanId = (options.id instanceof String) && (parseInt(options.id[0]) == NaN);
    let _id = options.id;

    options = Object.assign({}, {
      id: cleanId ? _id : `edge-${this.newEdgeId++}`,
      color: 'black',
      linewidth: 1.0,
      arrow: false,
      invisible: false
    }, options);
    return options;
  }

  // end of add edge support functions

  #toClientCoords(scenePos, camera, canvas) {
    // Clone the vertex because project modifies the vector in place
    let position = scenePos.clone();

    // Transform from world space to NDC space
    position.project(camera);

    // Transform from NDC space to client coordinates
    let x = Math.round((position.x + 1) / 2 * canvas.clientWidth);
    let y = Math.round((-position.y + 1) / 2 * canvas.clientHeight);

    return { x, y };
  }

  // Adjust the positions of labels based on vertex position. 
  #updateLabels(){
    const raycaster = new three.Raycaster();
    const allSet = new Set(this.scene.children);
    const visibleSet = new Set([]);
    
    this.scene.traverseVisible((object) => {
      if(object.userData.labelDiv === undefined) return;

      let position;
      if(object.type === 'Mesh'){
        position = object.position.clone();
      }else if(object.type === 'Line'){
        let spos = object.userData.source.position.clone();
        let tpos = object.userData.target.position.clone();
        position = spos.clone().add(tpos).divideScalar(2);
      }else{
        return;
      }

      visibleSet.add(object);

      raycaster.ray.origin.copy(this.camera.position);
      raycaster.ray.direction.copy(position.clone().sub(this.camera.position).normalize())

      let labelSpec = object.userData.labelSpec;
      let labelDiv = object.userData.labelDiv;
      labelDiv.style.display = 'block';

      let coords = this.#toClientCoords(position, this.camera, this.canvas);
      let rect = this.canvas.getBoundingClientRect();
      let xPx = (rect.left + coords.x - labelDiv.offsetWidth / 2) + (labelSpec.offset.x || 0);
      let yPx = (rect.top + coords.y - labelDiv.offsetHeight / 2) + (labelSpec.offset.y || 0);

      labelDiv.style.left = `${xPx}px`;
      labelDiv.style.top = `${yPx}px`;
    })

    allSet.forEach((object) => {
      if(!visibleSet.has(object) && object.userData.labelDiv !== undefined){
        object.userData.labelDiv.style.display = 'none';
      }
    })
  }

  resize(){
    const w = getComputedStyle(this.canvas.parentElement).width;
    const h = getComputedStyle(this.canvas.parentElement).height;

    console.log('resize', w, h);

    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  set backgroundColor(color){
    this.renderer.setClearColor(color);
  }

  get backgroundColor(){
    return this.renderer.getClearColor();
  }

  set width(w){
    const h = this.renderer.getSize().y;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  get width(){
    return this.renderer.getSize().y;
  }

  set height(h){
    const w = this.renderer.getSize().x;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  get height(){
    return this.renderer.getSize().height;
  }

  getVertexOption(oid, attr){
    const iid = this.o2i_vid.get(oid);
    if(iid === undefined) return undefined;

    const mesh = this.iVertexIdsToMeshes.get(iid);

    if(attr === 'size'){
      return mesh.scale.x;
    }else if(attr === 'color'){
      return mesh.material.color.getHexString();
    }else if(attr === 'face'){
      return mesh.material.map;
    }

    return undefined;
  }

  getEdgeOption(oid, attr){
    const iid = this.o2i_eid.get(oid);
    if(iid === undefined) return undefined;

    const line = this.iEdgeIdsToLines.get(iid);

    if(attr === 'color'){
      return line.material.color.getHex();
    }else if(attr === 'linewidth'){
      return line.material.linewidth;
    }

    return undefined;
  }

  setVertexOption(oid, attr, value){
    const iid = this.o2i_vid.get(oid);
    if(iid === undefined) return false;

    const mesh = this.iVertexIdsToMeshes.get(iid);

    switch(attr){
      case 'size':
        mesh.scale.set(value, value, value);
        mesh.userData.size = value;
        break;
      case 'color': 
        mesh.material.dispose();
        mesh.material = new three.MeshBasicMaterial({ color: value });
        mesh.material.needsUpdate = true;
        mesh.userData.face = undefined;
        mesh.userData.color = value;
        break;
      case 'face':
        mesh.material.dispose();
        const texture = new three.TextureLoader().load(value);
        mesh.material = new three.MeshBasicMaterial({ map: texture });
        mesh.material.needsUpdate = true;
        mesh.userData.color = undefined;
        mesh.userData.face = value;
        break;
    }

    return true;
  }

  setEdgeOption(oid, attr, value){
    const iid = this.o2i_eid.get(oid);
    if(iid === undefined) return false;

    const line = this.iEdgeIdsToLines.get(iid);

    if(attr === 'color'){
      line.material.color.set(value);
      line.userData.color = value;
    }else if(attr === 'linewidth'){
      line.material.linewidth = value;
      line.userData.linewidth = value;
    }

    return true;
  }

  #setupObjectPicking(){
    const raycaster = new three.Raycaster();

    this.selection = new Set([]);

    this.canvas.addEventListener('mousedown', event => {
      /* Left Mouse Button */

      // Normalize mouse
      const intersects = this.#mouseIntersects(event, raycaster);
      const ctrl = event.ctrlKey;
      let object = intersects.length > 0 ? intersects[0].object : undefined;

      // if the highlight object is selected, select the parent object, the vertex or edge
      if(object && object.type === 'LineSegments'){
        return;
        object = object.parent;  
      }
      
      // if ctrl is not pressed, but an object is selected, clear previous and select new
      if(object && !ctrl && event.button === 0){
        this.clearSelection();
        this.select(object);
      }

      // if ctrl is pressed, toggle selection
      if(object && ctrl && event.button === 0){
        if(this.selection.has(object)){
          this.deselect(object);
        }else{
          this.select(object);
        }
      }

      // if no object is selected, clear selection
      if(!object && !ctrl && event.button === 0){
        this.clearSelection();
      }

      if(object && object.type === 'Mesh'){
        this.dispatchEvent(new CustomEvent('vertex-click', {detail: object}));
      }else if(object && object.type === 'Line'){
        this.dispatchEvent(new CustomeEvent('edge-click', {detail: object}));
      }
    })
  }

  centerCamera(){
    this.controls.target = this.center();
  }

  clearSelection(){
    this.selection.forEach((object) => this.deselect(object));
    this.selection.clear();
  }

  deselect(object) {
    this.selection.delete(object);
    this.undrawSelection(object);
  }

  select(object) {
    this.selection.add(object);
    this.drawSelection(object);
  }

  #mouseIntersects(event, raycaster) {
    const mouse = new three.Vector2();
    let rect = this.canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, this.camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(this.scene.children);
    return intersects;
  }

  #setupNewIds() {
    this.newVertexId = 0;
    this.newEdgeId = 0;
  }

  #housekeeping() {
    this.iVertexIdsToMeshes = new Map();
    this.iEdgeIdsToLines = new Map();

    this.o2i_vid = new Map(); // outer to inner vertex ids
    this.i2o_vid = new Map(); // inner to outer vertex ids

    this.o2i_eid = new Map(); // outer to inner edge ids
    this.i2o_eid = new Map();
  }

  #setupScene(options) {
    this.scene = new three.Scene();
    this.camera = new three.PerspectiveCamera(75, options.width / options.height, 0.1, 1000);
    this.camera.position.z = -15;

    this.renderer = new three.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(options.width, options.height);
    this.canvas = this.renderer.domElement;
    this.light = new three.AmbientLight(0xffffff, 1);
    this.scene.add(this.light);
  }

  #setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;
    this.controls.enableZoom = true;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = true;
  }

  center(){
    return this.layoutGraph.middle();
  }
}


export { SceneGraph }
window.SceneGraph = SceneGraph; 