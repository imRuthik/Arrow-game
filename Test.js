const E=require('./script.js');
let fail=0;const ok=(c,m)=>{if(!c){fail++;console.log('FAIL',m)}};
E.LEVELS.forEach((l,i)=>{ok(E.validateLevel(l)==='','level '+(i+1)+' '+E.validateLevel(l))});
console.log('arrow counts',E.LEVELS.map(l=>l.arrows.length).join(','));
// directions & edges
const a=d=>({id:'t',x:1,y:1,dir:d});
['U','D','L','R'].forEach(d=>ok(E.getBlockingArrow(a(d),[a(d)],3)===null,'clear '+d));
const blk={id:'b',x:1,y:0,dir:'L'};ok(E.getBlockingArrow(a('U'),[a('U'),blk],3)===blk,'blocked U');
ok(E.getBlockingArrow(a('D'),[a('D'),blk],3)===null,'behind does not block');
ok(E.cellsToEdge(a('R'),4)===3&&E.cellsToEdge(a('L'),4)===2,'cells');
ok(E.validateLevel({size:3,arrows:[[0,0,'R'],[1,0,'L']]})==='unsolvable','deadlock detected');
ok(E.validateLevel({size:3,arrows:[[0,0,'R'],[0,0,'L']]})==='overlap','overlap');
const s=E.sanitizeSave({unlocked:'x',completed:[1,'a',99],best:{0:5,9:1},sound:3},10);
ok(s.unlocked===0&&s.completed.length===1&&s.best[0]===5&&s.sound===true,'sanitize');
ok(E.sanitizeSave(null,10).unlocked===0,'null save');
console.log(fail?'FAILED':'ALL PASS');
