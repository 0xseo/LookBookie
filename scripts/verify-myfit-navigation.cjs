// Hook-level navigation checks; native rendering is verified separately on a device.
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const ts = require(process.cwd() + '/node_modules/typescript');
const fit = { id: 1, name: '출근', wornOn: '2026-10-01', createdAt: '2026-10-01', clothingItemIds: [7], outfitId: 3, localImagePath: 'fit.png', cloudSyncStatus: 'local' };
const outfit = { id: 3, name: '코디', seasons: [], tags: [], stickers: [{ id: 's', clothingItemId: 7, x: 0, y: 0, size: 100, rotation: 0, zIndex: 0, localImagePath: 'shirt.png', name: '옷', brand: '', category: '상의' }], canvasWidth: 300, canvasHeight: 400 };
function makeHarness(filename) {
  let slots = [], index = 0, pending = [], dirty = true, tree, props;
  const back = new Set();
  const equal = (a,b) => a && b && a.length === b.length && a.every((v,i) => Object.is(v,b[i]));
  const react = {
    useState: (value) => { const i=index++; if (!(i in slots)) slots[i]=typeof value==='function'?value():value; return [slots[i], next=>{slots[i]=typeof next==='function'?next(slots[i]):next;dirty=true;}]; },
    useRef: value => {const i=index++; if (!(i in slots)) slots[i]={current:value}; return slots[i];},
    useMemo: (fn,deps) => {const i=index++; if (!slots[i] || !equal(slots[i].deps,deps)) slots[i]={value:fn(),deps};return slots[i].value;},
    useCallback: (fn,deps) => react.useMemo(()=>fn,deps),
    useEffect: (fn,deps) => {const i=index++; if (!slots[i] || !equal(slots[i].deps,deps)) { const prior=slots[i];slots[i]={deps};pending.push(()=>{prior?.cleanup?.();slots[i].cleanup=fn();});}},
  };
  const jsx = (type,props,key) => ({type,props:props||{},key});
  const storage = { listFitEntries: async()=>[fit],listOutfits: async()=>[outfit] };
  const modules = {
    react,
    'react/jsx-runtime': {jsx,jsxs:jsx,Fragment:'Fragment'},
    'react-native': { StyleSheet: {create: styles=>styles,absoluteFill:{}}, View:'View',Text:'Text',Image:'Image',Pressable:'Pressable',FlatList:'FlatList',ScrollView:'ScrollView',KeyboardAvoidingView:'KeyboardAvoidingView',Modal:'Modal',TextInput:'TextInput',Platform:{OS:'android'},Keyboard:{isVisible:()=>false},useWindowDimensions:()=>({width:400,height:800}),BackHandler:{addEventListener:(name,fn)=>{back.add(fn);return {remove:()=>back.delete(fn)};}} },
    'react-native-safe-area-context': {SafeAreaView:'SafeAreaView'},
    '@react-native-async-storage/async-storage': {__esModule:true,default:{getItem:async()=>null,setItem:async()=>{}}},
  };
  const requireMock = name => {
    if (modules[name]) return modules[name];
    if (name.includes('useGridColumns')) {
      const hookModule = {exports:{}};
      const hookSource = ts.transpileModule(fs.readFileSync('src/hooks/useGridColumns.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
      vm.runInNewContext(hookSource,{module:hookModule,exports:hookModule.exports,require:requireMock});
      modules[name] = hookModule.exports;
      return hookModule.exports;
    }
    if (name==='lucide-react-native') return new Proxy({}, {get:(obj,key)=>key});
    if (name.includes('database')) return storage;
    if (name.includes('collectionControls')) return {EMPTY_FILTERS:{seasons:[],colors:[],dateFrom:'',dateTo:''},compareCollection:()=>0,matchesCollectionFilters:()=>true,isValidDate:()=>true,localDate:()=> '2026-10-01'};
    if (name.includes('fitSearch')) return {fitMatchesSearch:()=>true};
    if (name.includes('useCategoryOptions')) return {useCategoryOptions:()=>({categoryOptions:[]})};
    if (name.includes('useColorPaletteOptions')) return {useColorPaletteOptions:()=>({colorOptions:[]})};
    if (name.includes('clothing')) return {SEASONS:[]};
    if (name.includes('colorSearch')) return {clothingMatchesSearch:()=>true};
    if (name.includes('colors')) return {COLORS:{}};
    if (name.includes('AppDialog')) return {AppAlert:{alert:()=>{}}};
    return new Proxy({}, {get:(obj,key)=>key==='__esModule'?true:key});
  };
  const module={exports:{}};
  const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source,{module,exports:module.exports,require:requireMock,requestAnimationFrame:fn=>fn(),Date,Map,Set,console});
  const component=Object.values(module.exports).find(value=>typeof value==='function');
  function render() {index=0;dirty=false;tree=component(props);for(const fn of pending.splice(0)) fn();}
  async function settle(next) {if(next) {props=next;dirty=true;} for(let i=0;i<12;i++) {if(dirty) render(); await new Promise(resolve=>setImmediate(resolve)); if(!dirty&&!pending.length) break;}return tree;}
  function nodes(root) {if(arguments.length===0) root=tree; if(!root||typeof root!=='object')return [];const children=root.props?.children;return [root,...(Array.isArray(children)?children:[children]).flatMap(child=>Array.isArray(child)?child.flatMap(x=>nodes(x)):nodes(child))];}
  return {settle,nodes,back};
}
(async()=>{
  const myfit=makeHarness('src/screens/MyFitScreen.tsx');
  let returned=0;
  const props={items:[],isActive:true,bottomInset:0,resetSignal:0,entryPoint:null,onEntryPointHandled:()=>{props.entryPoint=null;},onReturnToSource:()=>returned++,onOpenClothingItem:()=>{},onOpenOutfit:()=>{},onChanged:()=>{}};
  await myfit.settle(props);
  props.entryPoint={kind:'clothing',id:7,requestId:1};
  await myfit.settle(props);
  let list=myfit.nodes().find(node=>node.type==='FlatList');
  assert.equal(list.props.data.length,1,'Single linked fit must stay in list');
  assert.equal(list.props.numColumns,2);
  const toolbar=()=>myfit.nodes().find(node=>node.type==='CollectionToolbar');
  for (const columns of [1,3,2]) {toolbar().props.onCycleGridColumns();await myfit.settle();list=myfit.nodes().find(node=>node.type==='FlatList');assert.equal(list.props.numColumns,columns);assert.equal(toolbar().props.gridColumns,columns);}
  list.props.renderItem({item:fit}).props.onPress();await myfit.settle();
  assert(!myfit.nodes().some(node=>node.type==='FlatList'),'Card should open detail');
  myfit.nodes().find(node=>node.type==='Pressable').props.onPress();await myfit.settle();
  assert(myfit.nodes().some(node=>node.type==='FlatList'),'Detail back should return to linked list');assert.equal(returned,0);
  myfit.nodes().find(node=>node.type==='Pressable').props.onPress();await myfit.settle();assert.equal(returned,1,'List back should return to clothing');
  const codi=makeHarness('src/screens/CodiBookScreen.tsx');
  const cp={items:[],isActive:true,isLoading:false,bottomInset:0,requestedOutfitId:null,onRequestedOutfitOpened:()=>{cp.requestedOutfitId=null;},onOutfitSaved:()=>{},onOpenWardrobe:()=>{},onOpenClothingItem:()=>{},resetSignal:0,onOpenFits:()=>{}};
  await codi.settle(cp);cp.requestedOutfitId=3;await codi.settle(cp);
  const stickers=codi.nodes().filter(node=>node.props.sticker);assert.equal(stickers.length,1);assert.equal(stickers[0].props.selected,false,'Saved outfit must open with no selected clothing');
  await codi.settle({...cp,isActive:false});assert.equal(codi.back.size,0,'Hidden tab must not handle hardware back');
  await codi.settle(cp);assert(codi.nodes().some(node=>node.props.sticker),'Canvas must survive switching tabs');
  let returnedToFit=0; cp.onReturnToMyFit=()=>returnedToFit++; await codi.settle(cp);
  codi.nodes().find(node=>node.props.accessibilityLabel==='뒤로가기').props.onPress();
  assert.equal(returnedToFit,1,'Linked CodiBook back should return to MyFit');
  console.log('Passed: linked single-fit list, 2→1→3→2 grid, detail→list→clothing back, no initial outfit selection preserved inactive canvas and CodiBook→MyFit return.');
})().catch(error=>{console.error(error);process.exitCode=1;});
