(function(){
"use strict";
var $ = function(id){return document.getElementById(id)};
var css = function(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim()};
var fmt = function(n){return "$" + Math.round(n).toLocaleString("es-CL")};
var fmtMil = function(n){ return n>=1000 ? "$"+(n/1000).toFixed(1).replace(".",",")+" millones" : fmt(n)+" mil" };
var MONTHS = 24;
var STATE_VAR = {ok:"--s-ok", sav:"--s-sav", net:"--s-net", debt:"--s-debt", arr:"--s-arr"};
var STATE_LABEL = {ok:"Estable", sav:"Usa ahorro", net:"Recibe ayuda", debt:"Se endeuda", arr:"Recorta o se atrasa"};
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function nE(spec){ return Math.min(spec.earners, COMP[spec.comp].maxE) }

/* tabs */
function showTab(n){ [1,2].forEach(function(i){ $("tab"+i).setAttribute("aria-selected", i===n?"true":"false"); $("stage"+i).hidden = i!==n }); if (n===2) ensureNet() }
$("tab1").addEventListener("click", function(){showTab(1)});
$("tab2").addEventListener("click", function(){showTab(2)});
$("to-net").addEventListener("click", function(){ showTab(2); window.scrollTo({top:$("stage2").offsetTop-90, behavior:"smooth"}) });

function tooltip(wrap, W, idxFn, htmlFn){
  var svg = wrap.querySelector("svg"), tip = wrap.querySelector(".tip");
  svg.addEventListener("pointermove", function(ev){
    var r = svg.getBoundingClientRect(), wr = wrap.getBoundingClientRect(), i = idxFn((ev.clientX-r.left)/r.width*W);
    if (i<0){ tip.hidden = true; return }
    tip.hidden = false; tip.innerHTML = htmlFn(i);
    var left = ev.clientX-wr.left+14; if (left+260 > wr.width) left = ev.clientX-wr.left-270;
    tip.style.left = Math.max(0,left)+"px"; tip.style.top = Math.max(0,ev.clientY-wr.top-30)+"px";
  });
  svg.addEventListener("pointerleave", function(){ tip.hidden = true });
}

/* ================= ETAPA 1 ================= */
var proto = PRESETS[0], events = {4:["despido1"]}, pol1 = {ui:true, bono:false}, selShock = "despido1", sim1 = null, selM = 4;

function glyphs(people){
  return people.map(function(t){
    var h = t==="k"?16:24, w = t==="k"?11:14, col = t==="o"?"var(--muted)":"var(--ink)";
    return '<svg width="'+(w+(t==="o"?5:0))+'" height="'+h+'" viewBox="0 0 '+(w+(t==="o"?5:0))+' '+h+'" aria-hidden="true"><circle cx="'+(w/2)+'" cy="'+(w*.32)+'" r="'+(w*.3)+'" style="fill:'+col+'"/><rect x="'+(w*.12)+'" y="'+(w*.7)+'" width="'+(w*.76)+'" height="'+(h-w*.7)+'" rx="'+(w*.3)+'" style="fill:'+col+'"/>'+(t==="o"?'<line x1="'+(w+3)+'" y1="'+(h*.45)+'" x2="'+(w+3)+'" y2="'+h+'" style="stroke:var(--muted);stroke-width:1.6"/>':'')+'</svg>';
  }).join("");
}
function peopleText(p){ var a = p.people.filter(function(x){return x==="a"}).length, k = p.people.filter(function(x){return x==="k"}).length, o = p.people.filter(function(x){return x==="o"}).length, out = [];
  if (a) out.push(a+(a===1?" adulto":" adultos")); if (k) out.push(k+(k===1?" niño":" niños")); if (o) out.push(o+(o===1?" persona mayor":" personas mayores")); return out.join(", ") }

$("protos").innerHTML = PRESETS.map(function(p){ return '<button type="button" class="proto" data-id="'+p.id+'"><div class="glyphs">'+glyphs(p.people)+'</div><b>'+p.name+'</b><span>'+p.tag+'</span></button>' }).join("");
$("protos").querySelectorAll(".proto").forEach(function(b){ b.addEventListener("click", function(){
  proto = PRESETS.filter(function(p){return p.id===b.dataset.id})[0];
  events = {}; var s0 = nE(proto.spec)>0 ? "despido1" : "salud"; events[4] = [s0]; selShock = s0; selM = 4;
  update1(); netDirty = true;
}) });

function renderFicha(){
  var s = proto.spec, B = budget(s);
  $("ficha-title").textContent = proto.name; $("ficha-tag").textContent = proto.tag;
  var chips = [peopleText(proto), "Ingreso "+LEVELS[s.level].label.toLowerCase(), "Educación "+EDU[s.edu].label.toLowerCase()];
  var n = nE(s);
  if (n===0) chips.push("Viven de pensiones"); else for (var i=0;i<n;i++) chips.push((n>1?"Persona "+(i+1)+": ":"Trabajo ")+((i===0?s.emp1:s.emp2)==="formal"?"con contrato":"sin contrato"));
  chips.push(HOUSING[s.housing]);
  var debts = []; if (s.cons!=="no") debts.push("deuda de consumo "+CONS[s.cons].label.toLowerCase()); if (s.cae) debts.push("crédito universitario"); if (s.housing==="dividendo") debts.push("dividendo");
  chips.push(debts.length ? "Debe: "+debts.join(", ") : "Sin deudas");
  $("ficha-chips").innerHTML = chips.map(function(c){return '<span class="chip">'+c+'</span>'}).join("");
  var max = Math.max(B.incTot, B.expTot);
  function bar(items, colorFn){ return items.map(function(x,i){ var w = x.v/max*100; return '<span style="width:'+w+'%;background:color-mix(in srgb, var('+colorFn(x)+') '+(i%2?38:24)+'%, var(--surface))" title="'+x.label+': '+fmt(x.v)+' mil">'+(w>11?x.label:"")+'</span>' }).join("") }
  var expItems = B.exp.concat(B.debt);
  var html = '<div class="brow"><span>Entra</span><div class="bbar">'+bar(B.inc,function(x){return x.k.charAt(0)==="w"?"--s-ok":"--s-sav"})+'</div><span class="btot">'+fmt(B.incTot)+'</span></div>';
  html += '<div class="brow"><span>Sale</span><div class="bbar">'+bar(expItems,function(x){return x.consumer||x.k==="div"||x.k==="cae"?"--s-debt":"--ref"})+'</div><span class="btot">'+fmt(B.expTot)+'</span></div>';
  html += '<div class="breakdown">'+B.inc.map(function(x){return '<div><span>'+x.label+'</span><span>+'+Math.round(x.v)+'</span></div>'}).join("")+expItems.map(function(x){return '<div><span>'+x.label+'</span><span>−'+Math.round(x.v)+'</span></div>'}).join("")+'</div>';
  $("budget").innerHTML = html;
  var pct = Math.round(B.margin/B.incTot*100), h0 = makeHH(s,1);
  var famCap = FAM[s.fam].m*B.incTot;
  $("meters").innerHTML = [
    {v:(B.margin<0?"−":"+")+fmt(Math.abs(B.margin))+" mil", l:"le sobran al mes ("+pct+"% del ingreso)", c:pct<8?"--s-debt":"--s-ok"},
    {v:(h0.savings/B.expTot).toFixed(1).replace(".",",")+" meses", l:"de gastos cubre su ahorro", c:h0.savings/B.expTot<1?"--s-arr":"--s-ok"},
    {v:famCap? fmt(famCap)+" mil" : "Nadie", l: famCap? "le podría prestar su familia" : "en la familia puede prestarle", c:famCap?"--s-ok":"--s-arr"}
  ].map(function(m){return '<div class="meter"><span class="v" style="color:var('+m.c+')">'+m.v+'</span><span class="l">'+m.l+'</span></div>'}).join("");
}

function renderPalette(){
  $("palette").innerHTML = Object.keys(SHOCKS).map(function(k){ var ok = SHOCKS[k].needs(proto.spec); return '<button type="button" data-k="'+k+'" aria-pressed="'+(k===selShock)+'" '+(ok?"":"disabled title=\"No aplica a este hogar\"")+'><b>'+TL[k]+'</b> · '+SHOCKS[k].label+'</button>' }).join("");
  $("palette").querySelectorAll("button").forEach(function(b){ b.addEventListener("click", function(){ selShock = b.dataset.k; renderPalette() }) });
}
function renderTimeline(){
  var html = "";
  for (var m=1;m<=MONTHS;m++){
    var ev = events[m]||[], st = sim1.hist[m-1].state;
    html += '<div class="cell" data-m="'+m+'" role="button" tabindex="0" aria-label="Mes '+m+(ev.length?": "+ev.map(function(e){return SHOCKS[e].short}).join(", "):"")+'"><span class="mn">'+m+'</span>'+ev.map(function(e,i){return '<span class="ev" data-i="'+i+'" title="'+SHOCKS[e].label+' · clic para quitar">'+TL[e]+'</span>'}).join("")+'<span class="stbar" style="background:var('+STATE_VAR[st]+')" title="'+STATE_LABEL[st]+'"></span></div>';
  }
  $("timeline").innerHTML = html;
  $("timeline").querySelectorAll(".cell").forEach(function(c){
    function act(ev){ var m = +c.dataset.m;
      if (ev.target.classList.contains("ev")){ events[m].splice(+ev.target.dataset.i,1); if(!events[m].length) delete events[m] }
      else { if (!SHOCKS[selShock].needs(proto.spec)) return; (events[m] = events[m]||[]).push(selShock); selM = m }
      update1() }
    c.addEventListener("click", act);
    c.addEventListener("keydown", function(e){ if (e.key==="Enter"||e.key===" "){ e.preventDefault(); act(e) } });
  });
}
$("clear-ev").addEventListener("click", function(){ events = {}; update1() });
["ui","bono"].forEach(function(k){ $("p-"+k).addEventListener("change", function(){ pol1[k] = this.checked; update1(); netDirty = true }) });

var TL = {despido1:"D", despido2:"D2", horas:"H", salud:"S", imprevisto:"G", alza:"A", familiar:"F"};
/* option status per month */
var OPT_ROWS = [
  {k:"sav", label:"Ahorro"},
  {k:"fam", label:"Ayuda de la familia"},
  {k:"credit", label:"Crédito bancario"},
  {k:"caro", label:"Crédito caro"},
  {k:"basic", label:"Cubrir lo básico"},
  {k:"bills", label:"Cuentas al día"}
];
function optStatus(rec, k){
  var o = rec.opts, c = rec.cover;
  if (k==="sav"){ if (c.sav>0) return "use"; return o.savMonths>.05 ? "av" : "out" }
  if (k==="fam"){ if (o.famCap<=0) return c.nb>0 ? "use" : "na"; if (c.fam>0) return "use"; return o.famLeft>1 ? "av" : "out" }
  if (k==="credit"){ if (c.credit>0) return "use"; return o.creditOK ? "av" : "out" }
  if (k==="caro"){ if (c.caro>0) return "use"; return o.caroLeft>1 ? "av" : "out" }
  if (k==="basic") return o.cut ? "out" : "av";
  if (k==="bills") return o.arrears>1 ? "out" : "av";
}
function renderMatrix(){
  var H = sim1.hist, html = '<div></div>';
  for (var m=1;m<=MONTHS;m++) html += '<div class="shockrow" title="'+(events[m]||[]).map(function(e){return SHOCKS[e].label}).join(", ")+'">'+((events[m]||[]).length?"▼":"")+'</div>';
  html += '<div class="rl" style="color:var(--muted);font-size:.72rem">Mes</div>';
  for (m=1;m<=MONTHS;m++) html += '<div class="mh'+(m===selM?" sel":"")+'" data-m="'+m+'">'+m+'</div>';
  OPT_ROWS.forEach(function(r){
    html += '<div class="rl">'+r.label+'</div>';
    for (var m=1;m<=MONTHS;m++){ var s = optStatus(H[m-1], r.k); html += '<div class="mc '+s+(m===selM?" sel":"")+'" data-m="'+m+'" title="Mes '+m+' · '+r.label+': '+({av:"disponible",use:"la está usando",out:"agotada o cerrada",na:"no la tiene"})[s]+'"></div>' }
  });
  $("matrix").innerHTML = html;
  $("matrix").querySelectorAll("[data-m]").forEach(function(c){ c.addEventListener("click", function(){ selM = +c.dataset.m; renderMatrix(); renderOpts($("opts"), $("opt-head"), sim1.hist, selM, proto.spec) }) });
}
var CHIP = {av:["Disponible","--s-ok"], use:["La está usando","--s-debt"], out:["Cerrada","--s-arr"], na:["No la tiene","--ref"]};
function renderOpts(box, head, hist, m, spec){
  var rec = hist[m-1], o = rec.opts;
  var open = ["sav","fam","credit","caro"].filter(function(k){ var s = optStatus(rec,k); return s==="av"||s==="use" }).length;
  head.innerHTML = "Mes "+m+": <b>"+open+" de 4</b> vías abiertas para enfrentar un mes difícil";
  var rows = [];
  var marg = rec.income - rec.need;
  rows.push({n:"Cómo cerró el mes", st: marg>=0 ? ["Le sobró "+fmt(marg)+" mil","--s-ok"] : ["Le faltaron "+fmt(-marg)+" mil","--s-arr"], d:"Entraron "+fmt(rec.income)+" mil y debía pagar "+fmt(rec.need)+" mil."});
  var s = optStatus(rec,"sav");
  rows.push({n:"Ahorro", st:CHIP[s], d: o.savMonths>.05 ? "Le alcanza para "+o.savMonths.toFixed(1).replace(".",",")+" meses de gastos." : "No le queda ahorro.", bar:Math.min(1,o.savMonths/3), c:"--s-sav"});
  s = optStatus(rec,"fam");
  rows.push({n:"Ayuda de la familia", st:CHIP[s], d: o.famCap>0 ? (o.famLeft>1 ? "Todavía le podrían prestar "+fmt(o.famLeft)+" mil." : "Ya pidió todo lo que su familia podía darle.") : (rec.cover.nb>0 ? "Recibió "+fmt(rec.cover.nb)+" mil de su red." : "No tiene familia que pueda prestarle."), bar:o.famCap>0? o.famLeft/o.famCap : 0, c:"--s-net"});
  s = optStatus(rec,"credit");
  rows.push({n:"Crédito bancario", st:s==="out"?["Cerrado","--s-arr"]:CHIP[s], d: o.creditOK ? "Puede pedir hasta "+fmt(o.creditLeft)+" mil." : "No puede: "+o.creditWhy+"."});
  s = optStatus(rec,"caro");
  rows.push({n:"Crédito caro", st:s==="out"?["Agotado","--s-arr"]:CHIP[s], d: o.caroLeft>1 ? "Casa comercial o prestamista: le quedan "+fmt(o.caroLeft)+" mil, a 60% de recargo." : "Ya usó todo el crédito caro que le dan.", bar:o.caroCap? o.caroLeft/o.caroCap : 0, c:"--s-debt"});
  rows.push({n:"Lo básico", st: o.cut ? ["Recortando","--s-arr"] : ["Completo","--s-ok"], d: o.cut ? "Este mes recortó "+fmt(rec.cover.cut)+" mil en alimentación, servicios o transporte." : "No ha tenido que recortar alimentación ni servicios."});
  rows.push({n:"Cuentas", st: o.arrears>1 ? ["Atrasadas","--s-arr"] : ["Al día","--s-ok"], d: o.arrears>1 ? "Debe "+fmt(o.arrears)+" mil en cuentas impagas." : "No tiene cuentas atrasadas."});
  box.innerHTML = rows.map(function(r){ return '<div class="opt"><span class="n">'+r.n+'</span><span class="stchip" style="background:var('+r.st[1]+')">'+r.st[0]+'</span><span class="d">'+r.d+'</span>'+(r.bar!=null?'<div class="bar"><span style="width:'+Math.round(Math.max(0,Math.min(1,r.bar))*100)+'%;background:var('+r.c+')"></span></div>':'')+'</div>' }).join("");
}

var COVER = [["sav","--s-sav","Usa ahorro"],["fam","--s-net","Familia"],["nb","--s-net","Red"],["fund","--s-net","Fondo"],["credit","--s-debt","Crédito bancario"],["caro","--s-debt","Crédito caro"],["cut","--ref","Recorta lo básico"],["arr","--s-arr","Cuentas impagas"]];
function renderDiverging(){
  var H = sim1.hist, W = 900, Hh = 300, L = 56, R = 10, T = 26, Bm = 24;
  var maxUp = Math.max(1, Math.max.apply(null, H.map(function(r){return r.surplus}))), maxDn = Math.max(1, Math.max.apply(null, H.map(function(r){return r.gap>0?r.gap:0})));
  var tot = maxUp + maxDn, plotH = Hh-T-Bm, zero = T + plotH*maxUp/tot, Y = function(v){return zero - v/tot*plotH};
  var bw = (W-L-R)/MONTHS, g = '<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" style="fill:var(--surface)"/><rect width="3.2" height="6" style="fill:var(--s-debt)"/></pattern></defs>';
  var ticks = [0, -maxDn/2, -maxDn]; if (zero-T>40) ticks.unshift(maxUp, maxUp/2); else if (zero-T>14) ticks.unshift(maxUp);
  ticks.forEach(function(v){ var y = Y(v); g += '<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" style="stroke:var('+(v===0?"--muted":"--grid")+')"/><text x="'+(L-6)+'" y="'+(y+4)+'" text-anchor="end" font-size="12" style="fill:var(--muted)">'+(v<0?"−":"")+Math.round(Math.abs(v))+'</text>' });
  H.forEach(function(r,i){
    var x = L + i*bw + 4, w = bw-8;
    if (r.surplus>0) g += '<rect x="'+x+'" y="'+Y(r.surplus)+'" width="'+w+'" height="'+(zero-Y(r.surplus))+'" rx="2" style="fill:var(--s-ok)"/>';
    var acc = 0;
    COVER.forEach(function(c){ var v = r.cover[c[0]]; if (v>.5){ var y0 = zero + acc/tot*plotH, h = v/tot*plotH; g += '<rect x="'+x+'" y="'+(y0+1)+'" width="'+w+'" height="'+Math.max(1,h-1)+'" style="fill:'+(c[0]==="caro"?"url(#hatch)":"var("+c[1]+")")+'"/>'; acc += v } });
    if ((events[i+1]||[]).length) g += '<text x="'+(x+w/2)+'" y="'+(T-10)+'" text-anchor="middle" font-size="13" font-weight="700" style="fill:var(--s-arr)">▼</text>';
    g += '<text x="'+(x+w/2)+'" y="'+(Hh-6)+'" text-anchor="middle" font-size="12" style="fill:var(--muted)">'+(i+1)+'</text>';
  });
  $("div-chart").innerHTML = '<svg viewBox="0 0 '+W+' '+Hh+'" role="img" aria-label="Barras por mes: ahorro arriba, déficit y cómo se cubre abajo">'+g+'</svg><div class="tip" hidden></div>';
  tooltip($("div-chart"), W, function(px){ var i = Math.floor((px-L)/bw); return i>=0&&i<MONTHS?i:-1 }, function(i){
    var r = H[i], h = "<b>Mes "+(i+1)+"</b><div><span>Ingreso</span><span>"+fmt(r.income)+"</span></div><div><span>Gastos y cuotas</span><span>"+fmt(r.need)+"</span></div>";
    COVER.forEach(function(c){ if (r.cover[c[0]]>.5) h += "<div><span><i style=\"background:var("+c[1]+")\"></i>"+c[2]+"</span><span>"+fmt(r.cover[c[0]])+"</span></div>" });
    if (r.log.length) h += "<p>"+r.log.join(". ")+".</p>"; return h });
}
var RUN_TXT = {ok:"cierra los meses con superávit", sav:"sigue usando su ahorro", net:"sigue dependiendo de la ayuda de otros", debt:"sigue endeudándose para cubrir el mes", arr:"sigue recortando lo básico o atrasándose mientras paga sus deudas"};
function renderStory(){
  var items = [], prev = "ok", runStart = null;
  function flush(end){ if (runStart!==null && end>=runStart){ items.push('<li><b><span class="stdot" style="background:var('+STATE_VAR[prev]+')"></span>Mes '+(runStart+1)+(end>runStart?'–'+(end+1):'')+'</b><span>'+RUN_TXT[prev].charAt(0).toUpperCase()+RUN_TXT[prev].slice(1)+'.</span></li>') } runStart = null }
  sim1.hist.forEach(function(r,i){
    var parts = [];
    if (r.log.length) parts.push(r.log.join(". ")+".");
    var changed = r.state!==prev;
    if (r.gap>0 && (changed || r.log.length)){
      var used = COVER.filter(function(c){return r.cover[c[0]]>.5}).map(function(c){ var v = fmt(r.cover[c[0]])+" mil"; return {sav:"usa "+v+" de ahorro", fam:"pide "+v+" a la familia", nb:"recibe "+v+" de su red", fund:"recibe "+v+" del fondo", credit:"toma "+v+" en crédito bancario", caro:"toma "+v+" en crédito caro", cut:"recorta "+v+" de lo básico", arr:"deja "+v+" en cuentas impagas"}[c[0]] });
      if (used.length) parts.push("Le faltan "+fmt(r.gap)+" mil: "+used.join(", ")+".");
    } else if (changed && r.state==="ok" && i>0) parts.push("Vuelve a cerrar el mes con superávit.");
    if (parts.length){ flush(i-1); items.push('<li><b><span class="stdot" style="background:var('+STATE_VAR[r.state]+')"></span>Mes '+(i+1)+'</b><span>'+parts.join(" ")+'</span></li>'); prev = r.state; runStart = null; }
    else { if (changed){ flush(i-1); if (r.state!=="ok") runStart = i } else if (runStart===null && r.state!=="ok") runStart = i; prev = r.state }
  });
  flush(MONTHS-1);
  if (!items.length) items.push('<li><b>—</b><span>Ningún mes con problemas. Agrega un golpe en la línea de tiempo.</span></li>');
  $("story").innerHTML = items.join("");
}
function update1(){
  sim1 = runSingle(proto.spec, events, {ui:pol1.ui, bono:pol1.bono, relief:false}, MONTHS);
  $("protos").querySelectorAll(".proto").forEach(function(b){ b.setAttribute("aria-pressed", b.dataset.id===proto.id?"true":"false") });
  $("p-ui").checked = pol1.ui; $("p-bono").checked = pol1.bono;
  if (!SHOCKS[selShock].needs(proto.spec)) selShock = "salud";
  renderFicha(); renderPalette(); renderTimeline(); renderMatrix(); renderOpts($("opts"), $("opt-head"), sim1.hist, selM, proto.spec); renderStory(); renderDiverging();
}

/* ================= ETAPA 2 ================= */
var NETS = {
  cerrada:{label:"Red cerrada en el barrio", desc:"Familia y amigos viven cerca y están en una situación parecida.", fam:{n:3, rel:"similar", local:true}, con:{n:2, rel:"similar"}, vec:{n:4, rel:"similar"}},
  lejos:{label:"Familia en mejor situación, lejos", desc:"La familia vive en otro barrio y tiene más recursos.", fam:{n:3, rel:"mejor", local:false}, con:{n:3, rel:"similar"}, vec:{n:3, rel:"similar"}},
  formal:{label:"Conocidos con trabajo formal", desc:"Excompañeros y amigos con contrato, que saben de vacantes.", fam:{n:2, rel:"similar", local:true}, con:{n:5, rel:"mejor"}, vec:{n:3, rel:"similar"}},
  fragil:{label:"Red chica y frágil", desc:"Pocos vínculos, y los que hay también están apretados.", fam:{n:1, rel:"fragil", local:true}, con:{n:1, rel:"fragil"}, vec:{n:2, rel:"fragil"}},
  sinred:{label:"Sin red", desc:"Para comparar: nadie a quien recurrir.", fam:{n:0}, con:{n:0}, vec:{n:0}}
};
var ENTRY = {
  hogar:{label:"Solo a tu hogar", note:"En el mes 6 tu hogar sufre un despido (o una enfermedad, si nadie trabaja). El resto de la red sigue con su vida."},
  barrio:{label:"A tu barrio", note:"En el mes 6 cierra una fuente de trabajo del barrio: tu hogar, los vecinos y la familia que vive cerca pueden perder el empleo."},
  rubro:{label:"A tu rubro", note:"En el mes 6 hay despidos en el rubro donde trabajas: los conocidos que trabajan en lo mismo también los sufren."},
  pais:{label:"A todo el país", note:"Entre los meses 6 y 11 hay despidos en todas partes, caen los ingresos informales y cuesta más volver a trabajar."}
};
var ROLES = {fam:["Madre","Hermano","Tía","Primo"], con:["Ex compañera","Amigo","Compadre","Ex jefe","Amiga","Conocido"], vec:["Vecina","Vecino","Vecina del frente","Vecino del pasaje"]};
var LV = ["bajo","mb","medio","alto"];
var net = {profile:"cerrada", entry:"hogar"}, nRun = null, nAgg = null, nAggNo = null, heat = null, heatMetric = "arr", shownN = 6, nTimer = null, nSeed = 5, netDirty = true;
var REPS = 40;

function alterSpec(ego, rel, group, r){
  var li = LV.indexOf(ego.level);
  var lvl = rel==="mejor" ? LV[Math.min(3, Math.max(li+1, 2))] : (rel==="fragil" ? LV[Math.max(0, li-1)] : ego.level);
  var comps = group==="fam" ? ["bip","pareja","mayores","mono"] : ["bip","pareja","uni","mono"];
  var comp = comps[Math.floor(r()*comps.length)];
  var formalP = rel==="mejor" ? .9 : (rel==="fragil" ? .15 : .5);
  return {comp:comp, level:lvl, edu: rel==="mejor" ? (r()<.5?"univ":"tec") : "media", emp1: r()<formalP?"formal":"informal", emp2: r()<formalP?"formal":"informal",
    earners: COMP[comp].maxE, housing: rel==="mejor" ? (r()<.5?"dividendo":"propia") : (r()<.5?"arriendo":"propia"), cons: rel==="fragil"?"alta":"mod", cae:false,
    sav: rel==="mejor" ? "algo" : (rel==="fragil" ? "cero" : "poco"), fam:"no"};
}
function buildNet(egoSpec, prof, r){
  var P = NETS[prof], alters = [];
  ["fam","con","vec"].forEach(function(g){
    for (var i=0;i<(P[g].n||0);i++){
      var sp = alterSpec(egoSpec, P[g].rel, g, r);
      var h = makeHH(sp, Math.exp((r()-.5)*.3), r);
      h.group = g; h.role = ROLES[g][i % ROLES[g].length]; h.local = g==="vec" || (g==="fam" && P.fam.local); h.idx = alters.length;
      alters.push(h);
    }
  });
  var es = JSON.parse(JSON.stringify(egoSpec)); es.fam = "no";
  return {ego: makeHH(es, 1, null), alters: alters};
}
function runNet(egoSpec, prof, entry, sd, keep, pol){
  var r = rng(sd*7919+11), N = buildNet(egoSpec, prof, r), ego = N.ego, A = N.alters;
  var snaps = [], tot = {fam:0, vec:0, con:0, given:0, tips:0, unemp:0};
  var egoShock = nE(egoSpec)>0 ? "despido1" : "salud";
  for (var m=1;m<=MONTHS;m++){
    var crisis = entry==="pais" && m>=6 && m<=11;
    var inflow = [], tips = [], outflow = [], hits = [];
    A.forEach(function(h){
      var ev = [];
      h.earners.forEach(function(e,j){
        if (!e.employed) return;
        var p = (e.formal?.01:.025)*(crisis?4:1);
        if (m===6 && ((entry==="barrio" && h.local) || (entry==="rubro" && h.group==="con"))) p = .6;
        if (r()<p){ ev.push(j===0?"despido1":"despido2"); if (m===6 && entry!=="hogar") hits.push(h.idx) }
      });
      if (r()<.008) ev.push("salud");
      stepHH(h, {m:m, pol:pol, rnd:r, events:ev, informalCut: crisis?.25:0, reemp:function(hh,e){ return r() < 1/unempDuration(hh.spec,e.formal)*(crisis?.5:1) }});
    });
    var fams = A.filter(function(h){return h.group==="fam"}), cons = A.filter(function(h){return h.group==="con"}), vecs = A.filter(function(h){return h.group==="vec"});
    stepHH(ego, {m:m, pol:pol, rnd:r, events: m===6 ? [egoShock] : [], informalCut: crisis?.25:0,
      nb: function(h,d){ var got = 0;
        fams.forEach(function(o){ if (d<=0) return; o.lent = o.lent||0; var can = Math.min(o.savings - o.B.expTot, .3*o.B.incTot, .9*o.B.incTot - o.lent); if (can>5){ o.lent += Math.min(d,can); var g = Math.min(d,can); o.savings -= g; d -= g; got += g; h.nbOwed.push({to:o, amt:g}); inflow.push([o.idx,g]); tot.fam += g } });
        vecs.concat(cons).forEach(function(o){ if (d<=0) return; o.lent = o.lent||0; var can = Math.min(o.savings - 1.5*o.B.expTot, (o.group==="vec"?.06:.04)*o.B.incTot, .2*o.B.incTot - o.lent); if (can>5){ o.lent += Math.min(d,can); var g = Math.min(d,can); o.savings -= g; d -= g; got += g; h.nbOwed.push({to:o, amt:g}); inflow.push([o.idx,g]); tot[o.group] += g } });
        return {got:got, edges:[]} },
      reemp: function(h,e){ var p = 1/unempDuration(h.spec,e.formal)*(crisis?.5:1), x = r();
        if (x<p) return true;
        var ce = cons.filter(function(o){return o.earners.some(function(z){return z.employed && z.formal})}), fe = fams.filter(function(o){return o.earners.some(function(z){return z.employed})});
        var pt = .3*ce.length/Math.max(3,cons.length) + .06*fe.length/Math.max(3,fams.length);
        if (x < p+pt){ var pool = ce.length ? ce : fe; var src = pool[Math.floor(r()*pool.length)]; if (src) tips.push(src.idx); tot.tips++; return true }
        return false }
    });
    if (m===6) hits.push("ego");
    // obligaciones: el hogar ayuda a familia y vecinos en problemas
    fams.concat(vecs).forEach(function(o){
      var last = o.hist[o.hist.length-1];
      if ((o.state==="arr"||o.state==="debt") && ego.savings > ego.B.expTot){
        var g = Math.min(.12*ego.B.incTot, ego.savings - ego.B.expTot, Math.max(30, .3*Math.max(0,last.gap)));
        if (g>5){ ego.savings -= g; o.savings += g; outflow.push([o.idx,g]); tot.given += g }
      }
    });
    tot.unemp += ego.earners.filter(function(e){return !e.employed}).length ? 1 : 0;
    if (keep) snaps.push({ego:ego.state, alt:A.map(function(h){return h.state}), inflow:inflow, tips:tips, outflow:outflow, hits:hits, rec:ego.hist[ego.hist.length-1]});
  }
  return {ego:ego, alters:A, snaps:snaps, tot:tot};
}
function aggNet(egoSpec, prof, entry, pol){
  var share = new Array(MONTHS).fill(0), arr = 0, unemp = 0, fam = 0, vec = 0, con = 0, given = 0, tips = 0;
  for (var s=1;s<=REPS;s++){
    var R = runNet(egoSpec, prof, entry, s*53+1, false, pol);
    R.ego.hist.forEach(function(h,i){ if (h.state==="arr") share[i]++ });
    arr += R.ego.arrMonths; unemp += R.tot.unemp; fam += R.tot.fam; vec += R.tot.vec; con += R.tot.con; given += R.tot.given; tips += R.tot.tips;
  }
  return {share:share.map(function(x){return x/REPS}), arr:arr/REPS, unemp:unemp/REPS, fam:fam/REPS, vec:(vec+con)/REPS, given:given/REPS, tips:tips/REPS};
}

$("netcards").innerHTML = Object.keys(NETS).map(function(k){return '<button type="button" class="bcard" data-k="'+k+'"><b>'+NETS[k].label+'</b><span>'+NETS[k].desc+'</span></button>'}).join("");
$("netcards").querySelectorAll(".bcard").forEach(function(b){ b.addEventListener("click", function(){ net.profile = b.dataset.k; recomputeNet(false) }) });
$("entry").innerHTML = Object.keys(ENTRY).map(function(k){return '<button type="button" data-v="'+k+'">'+ENTRY[k].label+'</button>'}).join("");
$("entry").querySelectorAll("button").forEach(function(b){ b.addEventListener("click", function(){ net.entry = b.dataset.v; recomputeNet(false) }) });
$("heat-metric").innerHTML = '<button type="button" data-v="arr">Meses recortando o atrasado</button><button type="button" data-v="unemp">Meses sin trabajo</button>';
$("heat-metric").querySelectorAll("button").forEach(function(b){ b.addEventListener("click", function(){ heatMetric = b.dataset.v; renderHeat() }) });

function polNet(){ return {ui:pol1.ui, bono:pol1.bono, relief:false} }
function ensureNet(){ if (netDirty){ netDirty = false; recomputeNet(true) } }
function recomputeNet(all){
  var pol = polNet();
  nRun = runNet(proto.spec, net.profile, net.entry, nSeed, true, pol);
  nAgg = aggNet(proto.spec, net.profile, net.entry, pol);
  nAggNo = aggNet(proto.spec, "sinred", net.entry, pol);
  if (all || !heat){
    heat = {};
    Object.keys(NETS).forEach(function(p){ heat[p] = {}; Object.keys(ENTRY).forEach(function(e){ var a = (p===net.profile && e===net.entry) ? nAgg : (p==="sinred" && e===net.entry ? nAggNo : aggNet(proto.spec, p, e, pol)); heat[p][e] = {arr:a.arr, unemp:a.unemp} }) });
  }
  renderNet();
}
function renderNet(){
  $("net-intro").innerHTML = "Tu hogar: <b>"+proto.name.toLowerCase()+"</b>. Elige cómo es su red y por dónde entra el golpe. La familia presta más, los vecinos poco, y los conocidos con trabajo ayudan a volver a trabajar.";
  $("netcards").querySelectorAll(".bcard").forEach(function(b){ b.setAttribute("aria-pressed", b.dataset.k===net.profile?"true":"false") });
  $("entry").querySelectorAll("button").forEach(function(b){ b.setAttribute("aria-pressed", b.dataset.v===net.entry?"true":"false") });
  $("heat-metric").querySelectorAll("button").forEach(function(b){ b.setAttribute("aria-pressed", b.dataset.v===heatMetric?"true":"false") });
  $("entry-note").textContent = ENTRY[net.entry].note;
  renderEgo(); renderNKpis(); renderNLine(); renderHeat();
}

function renderEgo(){
  var W = 780, H = 560, cx = W/2, cy = 290, R = 175;
  var A = nRun.alters, snap = shownN>0 ? nRun.snaps[shownN-1] : null;
  var ARCS = {fam:[-150,-30], con:[0,62], vec:[118,178]};
  var GL = {fam:"Familia", con:"Conocidos", vec:"Vecinos"};
  var pos = {}, ang = {};
  ["fam","con","vec"].forEach(function(g){
    var list = A.filter(function(h){return h.group===g}), a0 = ARCS[g][0], a1 = ARCS[g][1];
    list.forEach(function(h,i){ var a = (list.length===1 ? (a0+a1)/2 : a0 + (a1-a0)*i/(list.length-1)) * Math.PI/180; ang[h.idx] = a; pos[h.idx] = [cx + R*Math.cos(a), cy + R*Math.sin(a)] });
  });
  var g = '<defs>'+["net","tip","debt"].map(function(k){var v = k==="net"?"--s-net":(k==="tip"?"--tip":"--s-debt"); return '<marker id="ar-'+k+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" style="fill:var('+v+')"/></marker>'}).join("")+'</defs>';
  // group labels
  var GP = {fam:[cx, 30], con:[W-60, H-40], vec:[60, H-40]};
  ["fam","con","vec"].forEach(function(g2){ if (!A.some(function(h){return h.group===g2})) return; g += '<text x="'+GP[g2][0]+'" y="'+GP[g2][1]+'" text-anchor="middle" font-size="17" font-weight="700" style="fill:var(--muted)">'+GL[g2]+'</text>' });
  A.forEach(function(h){ var p = pos[h.idx]; g += '<line x1="'+cx+'" y1="'+cy+'" x2="'+p[0]+'" y2="'+p[1]+'" style="stroke:var(--line);stroke-width:1.5"/>' });
  function flow(i, k, label, toEgo, dashed){
    var p = pos[i], dx = p[0]-cx, dy = p[1]-cy, d = Math.hypot(dx,dy), ux = dx/d, uy = dy/d;
    var a = toEgo ? [p[0]-ux*24, p[1]-uy*24] : [cx+ux*34, cy+uy*34], b = toEgo ? [cx+ux*36, cy+uy*36] : [p[0]-ux*26, p[1]-uy*26];
    var off = toEgo ? 5 : -5, nx = -uy*off, ny = ux*off;
    var s = '<line x1="'+(a[0]+nx)+'" y1="'+(a[1]+ny)+'" x2="'+(b[0]+nx)+'" y2="'+(b[1]+ny)+'" style="stroke:var('+(k==="net"?"--s-net":(k==="tip"?"--tip":"--s-debt"))+');stroke-width:4'+(dashed?';stroke-dasharray:8 5':'')+'" marker-end="url(#ar-'+k+')"/>';
    if (label){ var mx = cx+dx*.55+nx*3.2, my = cy+dy*.55+ny*3.2; s += '<text x="'+mx+'" y="'+(my+4)+'" text-anchor="middle" font-size="16" font-weight="700" style="fill:var(--ink);paint-order:stroke;stroke:var(--surface);stroke-width:4px">'+label+'</text>' }
    return s;
  }
  if (snap){
    snap.inflow.forEach(function(f){ g += flow(f[0],"net",fmt(f[1]),true,false) });
    snap.tips.forEach(function(i){ g += flow(i,"tip","dato de trabajo",true,true) });
    snap.outflow.forEach(function(f){ g += flow(f[0],"debt",fmt(f[1]),false,false) });
  }
  A.forEach(function(h){
    var p = pos[h.idx], st = snap ? snap.alt[h.idx] : "ok", hit = snap && snap.hits.indexOf(h.idx)>=0;
    g += '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="'+(hit?25:0)+'" style="fill:none;stroke:var(--s-arr);stroke-width:3"/>';
    g += '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="21" style="fill:var('+STATE_VAR[st]+');stroke:var(--surface);stroke-width:3"><title>'+h.role+' (ingreso '+LEVELS[h.spec.level].label.toLowerCase()+'): '+STATE_LABEL[st]+'</title></circle>';
    var la = ang[h.idx], lx = cx + (R+32)*Math.cos(la), ly = cy + (R+32)*Math.sin(la) + 6, anc = Math.cos(la) > .35 ? "start" : (Math.cos(la) < -.35 ? "end" : "middle");
    if (anc==="middle") ly += Math.sin(la) > 0 ? 8 : -4;
    g += '<text x="'+lx+'" y="'+ly+'" text-anchor="'+anc+'" font-size="16" style="fill:var(--ink)">'+h.role+'</text>';
  });
  var est = snap ? snap.ego : "ok", hitE = snap && snap.hits.indexOf("ego")>=0, s = 30;
  if (hitE) g += '<circle cx="'+cx+'" cy="'+cy+'" r="46" style="fill:none;stroke:var(--s-arr);stroke-width:3"/>';
  g += '<path d="M'+(cx-s)+' '+(cy-2)+' L'+cx+' '+(cy-s-6)+' L'+(cx+s)+' '+(cy-2)+' L'+(cx+s*.78)+' '+(cy-2)+' L'+(cx+s*.78)+' '+(cy+s*.9)+' L'+(cx-s*.78)+' '+(cy+s*.9)+' L'+(cx-s*.78)+' '+(cy-2)+' Z" style="fill:var('+STATE_VAR[est]+');stroke:var(--surface);stroke-width:3"><title>Tu hogar: '+STATE_LABEL[est]+'</title></path>';
  g += '<text x="'+cx+'" y="'+(cy+s+24)+'" text-anchor="middle" font-size="17" font-weight="700" style="fill:var(--ink);paint-order:stroke;stroke:var(--surface);stroke-width:4px">Tu hogar</text>';
  if (!A.length) g += '<text x="'+cx+'" y="'+(cy+110)+'" text-anchor="middle" font-size="13" style="fill:var(--muted)">Sin vínculos a quienes recurrir</text>';
  $("egograph").innerHTML = '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Red personal del hogar: familia arriba, conocidos abajo a la derecha, vecinos abajo a la izquierda, coloreados por su situación en el mes mostrado">'+g+'</svg>';
  $("n-month").textContent = "Mes "+shownN + (net.entry==="pais" && shownN>=6 && shownN<=11 ? " · crisis en curso" : (shownN===6 ? " · llega el golpe" : ""));
  $("n-scrub").value = shownN;
  // feed
  var li = [];
  if (!snap) li.push("Así parte la red. Presiona Reproducir o mueve el control de meses.");
  else {
    if (snap.hits.length){ var hn = snap.hits.filter(function(x){return x!=="ego"}).length; li.push("Llega el golpe: "+(snap.hits.indexOf("ego")>=0?"tu hogar":"")+(hn? (" y "+hn+(hn===1?" vínculo pierde":" vínculos pierden")+" el empleo"):"")+".") }
    snap.inflow.forEach(function(f){ li.push(A[f[0]].role+" le presta "+fmt(f[1])+" mil a tu hogar.") });
    snap.tips.forEach(function(i){ li.push(A[i].role+" le pasa un dato y vuelve a trabajar.") });
    snap.outflow.forEach(function(f){ li.push("Tu hogar ayuda a "+A[f[0]].role.toLowerCase()+" con "+fmt(f[1])+" mil.") });
    li.push("Tu hogar este mes: "+STATE_LABEL[snap.ego].toLowerCase()+".");
  }
  $("n-feed").innerHTML = li.slice(0,7).map(function(x){return "<li>"+x+"</li>"}).join("");
  if (shownN>0) renderOpts($("n-opts"), $("n-opt-head"), nRun.ego.hist, shownN, proto.spec);
  else { $("n-opt-head").textContent = "Mueve los meses para ver las opciones de tu hogar"; $("n-opts").innerHTML = "" }
}
function renderNKpis(){
  var A = nAgg, B0 = nAggNo, has = nE(proto.spec)>0;
  var k = [
    {v:A.arr.toFixed(1).replace(".",","), l:"meses recortando lo básico o con cuentas atrasadas", d:"sin red: "+B0.arr.toFixed(1).replace(".",",")},
    has ? {v:A.unemp.toFixed(1).replace(".",","), l:"meses sin trabajo después del golpe", d:"sin red: "+B0.unemp.toFixed(1).replace(".",",")} : null,
    {v:fmtMil(A.fam), l:"prestados por la familia", d:"otros vínculos: "+fmtMil(A.vec)},
    {v:fmtMil(A.given), l:"que tu hogar dio a familiares o vecinos en problemas", d:""}
  ].filter(Boolean);
  $("n-kpis").innerHTML = k.map(function(x){return '<div class="kpi"><span class="v">'+x.v+'</span><span class="l">'+x.l+'</span>'+(x.d?'<span class="d">'+x.d+'</span>':'')+'</div>'}).join("") + '<p class="note" style="grid-column:1/-1">Promedio de 40 corridas con esta red y este golpe.</p>';
}
function renderNLine(){
  var W = 470, H = 250, M = {l:42,r:12,t:12,b:28}, X = function(m){return M.l + m/(MONTHS-1)*(W-M.l-M.r)}, Y = function(v){return M.t+(1-v)*(H-M.t-M.b)};
  var g = '';
  if (net.entry==="pais") g += '<rect x="'+X(5)+'" y="'+M.t+'" width="'+(X(10)-X(5))+'" height="'+(H-M.t-M.b)+'" style="fill:var(--grid)"/><text x="'+((X(5)+X(10))/2)+'" y="'+(M.t+14)+'" text-anchor="middle" font-size="11" style="fill:var(--muted)">crisis</text>';
  else g += '<line x1="'+X(5)+'" x2="'+X(5)+'" y1="'+M.t+'" y2="'+(H-M.b)+'" style="stroke:var(--muted);stroke-dasharray:3 3"/><text x="'+(X(5)+4)+'" y="'+(M.t+12)+'" font-size="11" style="fill:var(--muted)">golpe</text>';
  [0,.25,.5,.75,1].forEach(function(v){ g += '<line x1="'+M.l+'" x2="'+(W-M.r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" style="stroke:var(--grid)"/><text x="'+(M.l-6)+'" y="'+(Y(v)+4)+'" text-anchor="end" font-size="11" style="fill:var(--muted)">'+Math.round(v*100)+'%</text>' });
  [1,6,12,18,24].forEach(function(m){ g += '<text x="'+X(m-1)+'" y="'+(H-8)+'" text-anchor="middle" font-size="11" style="fill:var(--muted)">'+m+'</text>' });
  g += '<path d="M'+nAggNo.share.map(function(v,m){return X(m)+" "+Y(v)}).join(" L")+'" style="fill:none;stroke:var(--ref);stroke-width:2;stroke-dasharray:6 4"/>';
  g += '<path d="M'+nAgg.share.map(function(v,m){return X(m)+" "+Y(v)}).join(" L")+'" style="fill:none;stroke:var(--s-arr);stroke-width:2.4;stroke-linejoin:round"/>';
  $("n-line").innerHTML = '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Probabilidad mensual de que el hogar recorte o se atrase, con esta red y sin red">'+g+'</svg><div class="tip" hidden></div>';
  tooltip($("n-line"), W, function(px){ var m = Math.round((px-M.l)/(W-M.l-M.r)*(MONTHS-1)); return m>=0&&m<MONTHS?m:-1 }, function(m){ return "<b>Mes "+(m+1)+"</b><div><span>Con esta red</span><span>"+Math.round(nAgg.share[m]*100)+"%</span></div><div><span>Sin red</span><span>"+Math.round(nAggNo.share[m]*100)+"%</span></div>" });
}
function renderHeat(){
  if (!heat) return;
  var max = 0; Object.keys(heat).forEach(function(p){ Object.keys(heat[p]).forEach(function(e){ max = Math.max(max, heat[p][e][heatMetric]) }) });
  var html = '<div class="hrow"><span></span>'+Object.keys(ENTRY).map(function(e){return '<span class="hh">'+ENTRY[e].label+'</span>'}).join("")+'</div>';
  Object.keys(NETS).forEach(function(p){
    html += '<div class="hrow"><span class="hl">'+NETS[p].label+'</span>';
    Object.keys(ENTRY).forEach(function(e){ var v = heat[p][e][heatMetric], t = max>0 ? v/max : 0;
      html += '<button type="button" class="hc'+(p===net.profile&&e===net.entry?" sel":"")+'" data-p="'+p+'" data-e="'+e+'" style="background:color-mix(in srgb, var(--s-arr) '+Math.round(8+t*72)+'%, var(--surface));color:'+(t>.6?"#fff":"var(--ink)")+'" aria-label="'+NETS[p].label+', golpe '+ENTRY[e].label.toLowerCase()+': '+v.toFixed(1)+' meses">'+v.toFixed(1).replace(".",",")+'</button>' });
    html += '</div>';
  });
  if (heatMetric==="unemp" && nE(proto.spec)===0) html += '<p class="note">Este hogar vive de pensiones: no tiene meses sin trabajo.</p>';
  $("heat").innerHTML = html;
  $("heat").querySelectorAll(".hc").forEach(function(c){ c.addEventListener("click", function(){ net.profile = c.dataset.p; net.entry = c.dataset.e; recomputeNet(false) }) });
}
$("n-scrub").addEventListener("input", function(){ shownN = +this.value; nStop(); renderEgo() });
$("n-reseed").addEventListener("click", function(){ nSeed = Math.floor(Math.random()*1e6); nRun = runNet(proto.spec, net.profile, net.entry, nSeed, true, polNet()); renderEgo() });
function nStop(){ if (nTimer){ clearInterval(nTimer); nTimer = null; $("n-play").textContent = "Reproducir" } }
$("n-play").addEventListener("click", function(){
  if (nTimer){ nStop(); return }
  if (shownN>=MONTHS) shownN = 0;
  $("n-play").textContent = "Pausar";
  nTimer = setInterval(function(){ shownN++; renderEgo(); if (shownN>=MONTHS) nStop() }, 900);
});

update1();
})();
