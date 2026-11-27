const assert=require('node:assert/strict');
const esbuild=require('esbuild');
const built=esbuild.buildSync({entryPoints:['src/lumatone/practice/boardView.ts'],bundle:true,write:false,format:'cjs',platform:'node'});
const mod={exports:{}};new Function('module','exports','require',built.outputFiles[0].text)(mod,mod.exports,require);
const fit=mod.exports.fitBoardView;
const base={left:-400,top:-300,width:800,height:400};   // x -400..400, y -300..100
const contains=(view,box,margin)=>view.left<=box.x0-margin+1e-6&&view.left+view.width>=box.x1+margin-1e-6&&view.top<=box.y0-margin+1e-6&&view.top+view.height>=box.y1+margin-1e-6;
assert.deepEqual(fit(base,null,40,1.7),{...base,zoom:1},'Nothing to fit: the usual view');
const inside={x0:-100,x1:150,y0:-200,y1:0};
assert.deepEqual(fit(base,inside,40,1.7),{...base,zoom:1},'Music already in view: nothing moves');
// Off the top by 120: the view slides up just far enough, and not sideways.
const high=fit(base,{x0:-100,x1:150,y0:-380,y1:-200},40,1.7);
assert.deepEqual(high,{left:-400,top:-420,width:800,height:400,zoom:1},'Smallest slide that brings it in');
assert.ok(contains(high,{x0:-100,x1:150,y0:-380,y1:-200},40));
const right=fit(base,{x0:300,x1:520,y0:-100,y1:0},40,1.7);
assert.deepEqual([right.left,right.top,right.zoom],[-240,-300,1],'Off the right edge: slide right only');
// Taller than the view: zoom out to fit and centre on the music.
const tall={x0:-50,x1:50,y0:-500,y1:20};
const zoomed=fit(base,tall,40,1.7);
assert.equal(zoomed.zoom,1.5,'600 needed of 400');
assert.deepEqual([zoomed.width,zoomed.height],[1200,600],'Both directions scale together');
assert.ok(contains(zoomed,tall,40));
assert.equal(zoomed.top+zoomed.height/2,-240,'Centred on the music vertically');
assert.equal(zoomed.left+zoomed.width/2,0,'The usual horizontal centre still contains it, so no sideways move');
// Larger than the limit allows: zoom stops and the music is centred.
const huge={x0:-2000,x1:2000,y0:-100,y1:0};
const capped=fit(base,huge,40,1.7);
assert.equal(capped.zoom,1.7);assert.equal(capped.left+capped.width/2,0);assert.ok(!contains(capped,huge,40),'Its edges are still cut off');
// A narrow window: the base view is narrow, and the music is brought in the same way.
const narrow=fit({left:-150,top:-300,width:300,height:400},{x0:-140,x1:140,y0:-200,y1:0},40,1.7);
assert.equal(narrow.zoom,1.2,'360 needed of 300');assert.ok(contains(narrow,{x0:-140,x1:140,y0:-200,y1:0},40));
console.log('Passed board view: no move when it fits, smallest slide, zoom to fit, zoom limit and narrow windows.');
