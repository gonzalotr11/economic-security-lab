/* ===== Motor del laboratorio de hogares =====
   Montos en miles de pesos chilenos por mes. Son ilustrativos, calibrados con referencias públicas (oct. 2026):
   sueldo mínimo $553.553 bruto (Ley 21.830); ingreso mediano de ocupados $611.162 y medio $897.019 (INE, ESI 2024);
   PGU $231.732-$250.275 (sept. 2026); canasta básica $92.327 por persona (MDSF, ago. 2026);
   arriendo de un departamento de 70 m2 en la RM entre ~$480.000 y ~$900.000 (Yapo/Extend, 2024);
   tasas de interés corriente y máxima convencional (CMF, Diario Oficial 15-09-2026). */
var TASA_BANCO = .2961;   // interés corriente anual, 50-200 UF, 90 días o más
var TASA_CARO = .4106;    // interés máximo convencional anual, hasta 50 UF, 90 días o más
function cuota(monto, tasaAnual, n){ var r = Math.pow(1+tasaAnual, 1/12)-1; return monto*r/(1-Math.pow(1+r, -n)) }
var LEVELS = {
  bajo:{label:"Bajo", save:.3, inc:540, pen:232, cons:.9, house:260, educ:15, tr:30},
  mb:{label:"Medio-bajo", save:.35, inc:790, pen:300, cons:1, house:300, educ:25, tr:15},
  medio:{label:"Medio", save:.45, inc:900, pen:450, cons:1.25, house:480, educ:80, tr:0},
  alto:{label:"Alto", save:.55, inc:1750, pen:900, cons:1.8, house:850, educ:320, tr:0}
};
var EDU = {
  media:{label:"Media o menos", m:.9, reemp:5},
  tec:{label:"Técnica", m:1.05, reemp:4},
  univ:{label:"Universitaria", m:1.35, reemp:3}
};
var COMP = {
  uni:{label:"Unipersonal", adults:1, kids:0, old:0, earners:1, maxE:1},
  pareja:{label:"Pareja sin hijos", adults:2, kids:0, old:0, earners:2, maxE:2},
  bip:{label:"Biparental con hijos", adults:2, kids:2, old:0, earners:2, maxE:2},
  mono:{label:"Monoparental", adults:1, kids:2, old:0, earners:1, maxE:1},
  mayores:{label:"Adultos mayores", adults:0, kids:0, old:2, earners:0, maxE:0},
  ext:{label:"Extendido", adults:2, kids:2, old:1, earners:2, maxE:2}
};
var HOUSING = {arriendo:"Arrienda", dividendo:"Propia con dividendo", propia:"Propia sin deuda", allegado:"Allegado con familiares"};
var SAV = {cero:{label:"Sin ahorro", m:0}, poco:{label:"Medio mes", m:.5}, algo:{label:"Dos meses", m:2}, colchon:{label:"Seis meses", m:6}};
var FAM = {no:{label:"Sin red", m:0}, algo:{label:"Puede ayudar algo", m:.5}, fuerte:{label:"Puede ayudar mucho", m:2}};
var CONS = {no:{label:"Sin deuda", s:0}, mod:{label:"Moderada", s:.07}, alta:{label:"Alta", s:.12}};

var PRESETS = [
  {id:"mono", name:"Madre sola con dos hijos", tag:"Trabaja en comercio sin contrato y vive allegada en la casa de su madre.",
   people:["a","k","k"], spec:{comp:"mono", level:"bajo", edu:"media", emp1:"informal", emp2:"formal", earners:1, housing:"allegado", cons:"no", cae:false, sav:"cero", fam:"algo"}},
  {id:"bip", name:"Familia que arrienda con dos ingresos", tag:"Él trabaja con contrato en una bodega; ella vende por su cuenta. Deben en casas comerciales.",
   people:["a","a","k","k"], spec:{comp:"bip", level:"mb", edu:"media", emp1:"formal", emp2:"informal", earners:2, housing:"arriendo", cons:"alta", cae:false, sav:"poco", fam:"algo"}},
  {id:"ext", name:"Hogar de tres generaciones", tag:"Casa propia pagada: un sueldo con contrato, uno informal y la pensión de la abuela.",
   people:["a","a","k","k","o"], spec:{comp:"ext", level:"bajo", edu:"media", emp1:"formal", emp2:"informal", earners:2, housing:"propia", cons:"mod", cae:false, sav:"poco", fam:"algo"}},
  {id:"mayores", name:"Pareja de adultos mayores", tag:"Viven de pensiones bajas en su casa pagada. No tienen ahorro.",
   people:["o","o"], spec:{comp:"mayores", level:"bajo", edu:"media", emp1:"formal", emp2:"formal", earners:0, housing:"propia", cons:"mod", cae:false, sav:"cero", fam:"no"}},
  {id:"joven", name:"Profesional joven a honorarios", tag:"Universitario, arrienda solo, boletea y paga el crédito universitario.",
   people:["a"], spec:{comp:"uni", level:"medio", edu:"univ", emp1:"informal", emp2:"formal", earners:1, housing:"arriendo", cons:"mod", cae:true, sav:"poco", fam:"algo"}},
  {id:"clase", name:"Familia de clase media con dividendo", tag:"Ambos con contrato y estudios técnicos; pagan dividendo y crédito universitario.",
   people:["a","a","k","k"], spec:{comp:"bip", level:"medio", edu:"tec", emp1:"formal", emp2:"formal", earners:2, housing:"dividendo", cons:"mod", cae:true, sav:"poco", fam:"algo"}},
  {id:"alto", name:"Pareja de altos ingresos", tag:"Profesionales con contrato, dividendo y seis meses de ahorro.",
   people:["a","a"], spec:{comp:"pareja", level:"alto", edu:"univ", emp1:"formal", emp2:"formal", earners:2, housing:"dividendo", cons:"mod", cae:false, sav:"colchon", fam:"fuerte"}}
];

function budget(spec, vary){
  var L = LEVELS[spec.level], E = EDU[spec.edu], C = COMP[spec.comp], v = vary || 1;
  var nE = Math.min(spec.earners, C.maxE);
  var inc = [], exp = [], debt = [];
  for (var i=0;i<nE;i++){
    var formal = (i===0?spec.emp1:spec.emp2)==="formal";
    inc.push({k:"w"+i, label:(nE>1?"Sueldo persona "+(i+1):"Sueldo"), v:L.inc*E.m*(i===1?.75:1)*(formal?1:.8)*v, formal:formal, earner:i});
  }
  if (C.old) inc.push({k:"pen", label:"Pensiones", v:C.old*L.pen*v});
  if (C.kids && L.tr) inc.push({k:"tr", label:"Transferencias del Estado", v:C.kids*L.tr});
  var people = C.adults+C.kids+C.old;
  exp.push({k:"bas", label:"Alimentación y servicios", v:(120*C.adults+75*C.kids+115*C.old)*L.cons*v});
  exp.push({k:"trans", label:"Transporte", v:(45*nE+15*C.kids+15*C.old)*L.cons*v});
  if (C.kids) exp.push({k:"edu", label:"Educación y cuidado", v:C.kids*L.educ*v});
  exp.push({k:"salud", label:"Salud", v:(15*(C.adults+C.kids)+55*C.old)*L.cons*v});
  var size = Math.max(.85, Math.min(1.4, 1+.12*(people-2)));
  if (spec.housing==="arriendo") exp.push({k:"viv", label:"Arriendo", v:L.house*size*v, house:true});
  else if (spec.housing==="propia") exp.push({k:"viv", label:"Gastos de la vivienda", v:45*L.cons*v});
  else if (spec.housing==="allegado") exp.push({k:"viv", label:"Aporte a la casa", v:60*v});
  if (spec.housing==="dividendo"){ exp.push({k:"viv", label:"Gastos de la vivienda", v:45*L.cons*v}); debt.push({k:"div", label:"Dividendo", v:.85*L.house*size*v, house:true}) }
  var incTot = inc.reduce(function(a,x){return a+x.v},0);
  if (CONS[spec.cons].s) debt.push({k:"con", label:"Cuotas de consumo", v:CONS[spec.cons].s*incTot, consumer:true});
  if (spec.cae) debt.push({k:"cae", label:"Crédito universitario", v:60});
  var expTot = exp.concat(debt).reduce(function(a,x){return a+x.v},0);
  return {inc:inc, exp:exp, debt:debt, incTot:incTot, expTot:expTot, margin:incTot-expTot};
}

/* Tipos de golpe para el hogar individual */
var SHOCKS = {
  despido1:{label:"Despido", short:"Despido", needs:function(s){return Math.min(s.earners,COMP[s.comp].maxE)>=1}},
  despido2:{label:"Despido de la segunda persona", short:"Despido 2", needs:function(s){return Math.min(s.earners,COMP[s.comp].maxE)>=2}},
  horas:{label:"Menos horas o ventas (−30% por 4 meses)", short:"Menos horas", needs:function(s){return Math.min(s.earners,COMP[s.comp].maxE)>=1}},
  salud:{label:"Enfermedad", short:"Enfermedad", needs:function(){return true}},
  imprevisto:{label:"Gasto imprevisto", short:"Imprevisto", needs:function(){return true}},
  alza:{label:"Sube el arriendo o dividendo 20%", short:"Alza vivienda", needs:function(s){return s.housing==="arriendo"||s.housing==="dividendo"}},
  familiar:{label:"Un familiar necesita ayuda (3 meses)", short:"Ayuda familiar", needs:function(){return true}}
};

function unempDuration(spec, formal){ var d = EDU[spec.edu].reemp; return formal ? d : Math.max(2, d-2) }

/* Crea el estado inicial de un hogar */
function makeHH(spec, vary, rnd){
  var B = budget(spec, vary);
  var h = {spec:spec, B:B, earners:B.inc.filter(function(x){return x.k.charAt(0)==="w"}).map(function(x){return {base:x.v, formal:x.formal, employed:true, out:0, um:0, cut:0, cutLeft:0}}),
    other:B.inc.filter(function(x){return x.k.charAt(0)!=="w"}).reduce(function(a,x){return a+x.v},0),
    savings: SAV[spec.sav].m*B.expTot*(rnd?Math.exp((rnd()-.5)*.6):1),
    famLeft: FAM[spec.fam].m*B.incTot, famOwed:0, nbOwed:[],
    loans:[], creditUsed:0, caroUsed:0, arrears:0, postponed:0, relief:0, houseMult:1, extra:[], dropMonths:0, bonoPaid:0,
    everArr:false, arrMonths:0, newDebt:0, state:"ok", hist:[]};
  return h;
}

/* Un mes. ctx: {m, pol, events:[keys], nb: fn(h,d)->{got, edges}, fund: obj, rnd} */
function stepHH(h, ctx){
  var s = h.spec, B = h.B, pol = ctx.pol, log = [], oneOff = 0;
  var bas = B.exp.filter(function(x){return x.k==="bas"||x.k==="trans"}).reduce(function(a,x){return a+x.v},0);
  (ctx.events||[]).forEach(function(ev){
    if (ev==="despido1"||ev==="despido2"){
      var e = h.earners[ev==="despido1"?0:1]; if (!e || !e.employed) return;
      e.employed=false; e.um=0; e.out = ctx.dur ? ctx.dur(e) : unempDuration(s, e.formal);
      if (pol.relief) h.relief = 3;
      log.push(ev==="despido1" ? "Despido: queda sin trabajo" : "Despido de la segunda persona");
    }
    if (ev==="horas"){ var e1=h.earners[0]; if(e1){e1.cut=.3; e1.cutLeft=4; log.push("Le bajan las horas o las ventas")} }
    if (ev==="salud"){ oneOff += 1.2*bas; if (h.earners[0]){h.earners[0].cut=Math.max(h.earners[0].cut,.3); h.earners[0].cutLeft=Math.max(h.earners[0].cutLeft,1)} log.push("Enfermedad: gastos médicos y días sin trabajar") }
    if (ev==="imprevisto"){ oneOff += .5*B.incTot; log.push("Gasto imprevisto") }
    if (ev==="alza"){ h.houseMult *= 1.2; log.push("Sube el costo de la vivienda") }
    if (ev==="familiar"){ h.extra.push({v:.1*B.incTot, left:3}); log.push("Un familiar necesita ayuda") }
  });
  // ingreso
  var labor = 0, laborNormal = 0;
  h.earners.forEach(function(e){
    laborNormal += e.base;
    if (e.employed){ var vol = (!e.formal && ctx.rnd) ? (1+(ctx.rnd()-.5)*.3) : 1; labor += e.base*(1-e.cut)*vol*(ctx.informalCut && !e.formal ? 1-ctx.informalCut : 1) }
    else if (e.formal && pol.ui && e.um<5) labor += .5*e.base;
    else labor += e.base*(e.formal?.1:.2);
  });
  var income = labor + h.other;
  var dropped = laborNormal>0 && labor < .7*laborNormal;
  h.dropMonths = dropped ? h.dropMonths+1 : 0;
  var bono = 0;
  if (pol.bono && h.dropMonths>=1+(pol.bonoDelay||0) && h.bonoPaid<3){ bono = 100; h.bonoPaid++; income += bono; log.push("Recibe el bono de emergencia") }
  if (!dropped && h.dropMonths===0 && h.bonoPaid>=3) h.bonoPaid = 0;
  // gastos
  var need = 0;
  B.exp.forEach(function(x){ need += x.v*(x.house?h.houseMult:1) });
  var debtPay = 0, consumer = 0;
  B.debt.forEach(function(x){ var v = x.v*(x.house?h.houseMult:1); if (x.consumer) consumer += v; else debtPay += v });
  if (h.relief>0 && consumer>0){ h.postponed += consumer; consumer = 0; h.relief--; if (h.relief===2) log.push("Posterga sus cuotas de consumo") }
  else if (h.postponed>0){ var pp = Math.min(h.postponed, consumer*.5+1); consumer += pp; h.postponed -= pp }
  var loanPay = 0;
  h.loans = h.loans.filter(function(L){ loanPay += L.pay; L.left--; return L.left>0 });
  var extra = 0; h.extra = h.extra.filter(function(x){ extra += x.v; x.left--; return x.left>0 });
  var arrPay = h.arrears>0 ? Math.min(h.arrears, h.arrears/6+1) : 0;
  need += debtPay + consumer + loanPay + extra + oneOff + arrPay;
  var gap = need - income;
  var cover = {sav:0, fam:0, nb:0, fund:0, credit:0, caro:0, cut:0, arr:0}, surplus = 0, edges = [];
  var hasFormal = h.earners.some(function(e){return e.formal && e.employed}) || COMP[s.comp].old>0;
  if (gap <= 0){
    h.arrears -= arrPay;
    surplus = -gap;
    var toFam = Math.min(surplus*.3, h.famOwed); h.famOwed -= toFam; h.famLeft += toFam;
    var rest = surplus - toFam;
    if (h.nbOwed.length){ var toNb = Math.min(rest*.3, h.nbOwed.reduce(function(a,o){return a+o.amt},0)); var left=toNb; h.nbOwed.forEach(function(o){var x=Math.min(o.amt,left); o.amt-=x; o.to.savings+=x; left-=x}); h.nbOwed=h.nbOwed.filter(function(o){return o.amt>.5}); rest -= toNb }
    if (ctx.fund && pol.fund){ var c = .02*income; ctx.fund.pool += c; rest -= c }
    h.savings += Math.max(0,rest)*LEVELS[s.level].save;
  } else {
    h.arrears -= arrPay;
    var d = gap, u;
    u = Math.min(d, h.savings); h.savings -= u; d -= u; cover.sav = u;
    u = Math.min(d, h.famLeft); h.famLeft -= u; h.famOwed += u; d -= u; cover.fam = u;
    if (d>0 && ctx.nb){ var r = ctx.nb(h, d); d -= r.got; cover.nb = r.got; edges = r.edges }
    if (d>0 && ctx.fund && pol.fund && ctx.fund.pool>0){ u = Math.min(d, ctx.fund.pool, .1*B.incTot+40); ctx.fund.pool -= u; d -= u; cover.fund = u }
    if (d>0 && hasFormal && h.arrears<1){ var cap = 3*B.incTot - h.creditUsed; u = Math.max(0, Math.min(d, cap)); if (u>0){ h.loans.push({pay:cuota(u, TASA_BANCO, 12), left:12}); h.creditUsed += u; h.newDebt += u; d -= u; cover.credit = u } }
    if (d>0){ var cap2 = 1*B.incTot - h.caroUsed; u = Math.max(0, Math.min(d, cap2)); if (u>0){ h.loans.push({pay:cuota(u, TASA_CARO, 6), left:6}); h.caroUsed += u; h.newDebt += u; d -= u; cover.caro = u } }
    if (d>0){ u = Math.min(d, .15*bas); d -= u; cover.cut = u }
    if (d>0){ h.arrears += d; cover.arr = d }
  }
  // desempleo avanza
  h.earners.forEach(function(e){
    if (e.cutLeft>0){ e.cutLeft--; if (e.cutLeft===0) e.cut=0 }
    if (!e.employed){ e.um++; if (ctx.reemp){ if (ctx.reemp(h,e)) { e.employed=true; log.push("Vuelve a encontrar trabajo") } } else { e.out--; if (e.out<=0){ e.employed=true; log.push("Vuelve a encontrar trabajo") } } }
  });
  var st = "ok";
  if (cover.sav>0) st = "sav";
  if (cover.fam+cover.nb+cover.fund>0) st = "net";
  if (cover.credit+cover.caro>0) st = "debt";
  if (cover.cut+cover.arr>0 || h.arrears>1) st = "arr";
  if (st==="arr"){ h.everArr = true; h.arrMonths++ }
  h.state = st;
  var famCap = FAM[s.fam].m*B.incTot;
  var opts = {savMonths: h.savings/B.expTot, famLeft: h.famLeft, famCap: famCap,
    creditOK: hasFormal && h.arrears<1 && (3*B.incTot - h.creditUsed) > 1, creditWhy: !hasFormal ? "nadie tiene contrato" : (h.arrears>=1 ? "tiene cuentas atrasadas" : ((3*B.incTot - h.creditUsed) <= 1 ? "ya usó su cupo" : "")),
    creditLeft: Math.max(0, 3*B.incTot - h.creditUsed), caroLeft: Math.max(0, B.incTot - h.caroUsed), caroCap: B.incTot,
    cut: cover.cut>0, arrears: h.arrears, margin: income - need, employed: h.earners.filter(function(e){return e.employed}).length, earners: h.earners.length};
  var rec = {opts:opts, income:income, need:need, gap:gap, surplus:surplus, cover:cover, savings:h.savings, debt:h.loans.reduce(function(a,L){return a+L.pay*L.left},0)+h.arrears+h.famOwed+h.postponed, arrears:h.arrears, log:log, state:st, edges:edges, bono:bono};
  h.hist.push(rec);
  return rec;
}

function runSingle(spec, events, pol, months){
  var h = makeHH(spec, 1, null);
  for (var m=1;m<=months;m++) stepHH(h, {m:m, pol:pol, events:events[m]||[]});
  return h;
}
var EXTRA = {
  bipInf:{comp:"bip", level:"bajo", edu:"media", emp1:"informal", emp2:"informal", earners:2, housing:"propia", cons:"mod", cae:false, sav:"cero", fam:"algo"},
  ext:{comp:"ext", level:"bajo", edu:"media", emp1:"formal", emp2:"informal", earners:2, housing:"propia", cons:"mod", cae:false, sav:"poco", fam:"algo"},
  parejaMedio:{comp:"pareja", level:"medio", edu:"tec", emp1:"formal", emp2:"formal", earners:2, housing:"dividendo", cons:"mod", cae:false, sav:"algo", fam:"algo"},
  monoMedio:{comp:"mono", level:"mb", edu:"tec", emp1:"formal", emp2:"formal", earners:1, housing:"dividendo", cons:"mod", cae:false, sav:"poco", fam:"algo"},
  mayoresMedio:{comp:"mayores", level:"medio", edu:"tec", emp1:"formal", emp2:"formal", earners:0, housing:"propia", cons:"no", cae:false, sav:"algo", fam:"no"},
  parejaMB:{comp:"pareja", level:"mb", edu:"media", emp1:"formal", emp2:"informal", earners:2, housing:"arriendo", cons:"alta", cae:false, sav:"poco", fam:"algo"},
  monoArr:{comp:"mono", level:"mb", edu:"media", emp1:"formal", emp2:"formal", earners:1, housing:"arriendo", cons:"no", cae:false, sav:"cero", fam:"no"}
};
