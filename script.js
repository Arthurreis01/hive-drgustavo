// ========================= FIREBASE INIT =========================
if (!firebase.apps.length) {
  firebase.initializeApp({
    apiKey: "AIzaSyAfg1wkI8y0ivoFvnawMVo3rNuvWyePUEs",
    authDomain: "drgustavo-b8f6f.firebaseapp.com",
    projectId: "drgustavo-b8f6f",
    storageBucket: "drgustavo-b8f6f.firebasestorage.app",
    messagingSenderId: "334453414199",
    appId: "1:334453414199:web:fcb8cc766a33bb41bae2b2",
    measurementId: "G-4ELGD1RRLR"
  });
}
const db = firebase.firestore();

// ========================= FIRESTORE COLLECTIONS =========================
const procedimentosCol = db.collection('procedimentos');
const anestesiasCol   = db.collection('anestesias');

let procedimentosDB   = {};
let anestesiaDB       = {};
let flatProcedures    = [];
let flatAnesthesias   = [];

// ========================= SELEÇÃO TEMPORÁRIA =========================
let procedimentosSelecionados = [];
let anestesiasSelecionadas   = [];
let editandoId               = null;

/** Carrega dados de Firestore e popula procedimentosDB e anestesiaDB **/
async function loadData() {
  // Procedimentos
  const procSnap = await procedimentosCol.get();
  procedimentosDB = {};
  procSnap.forEach(doc => {
    const data = doc.data();
    const cat  = data.category;
    if (!procedimentosDB[cat]) procedimentosDB[cat] = [];
    procedimentosDB[cat].push({
      Procedimento: data.Procedimento,
      Valor: data.Valor,
      "Tempo de Sala": data["Tempo de Sala"] || data.tempoDeSala,
      "Nº Diárias": data["Nº Diárias"] || data.nDiarias
    });
  });
  flatProcedures = Object.values(procedimentosDB).reduce((a,b)=>a.concat(b), []);

  // Anestesias
  const anestSnap = await anestesiasCol.get();
  anestesiaDB = {};
  anestSnap.forEach(doc => {
    const data = doc.data();
    const cat  = data.category;
    if (!anestesiaDB[cat]) anestesiaDB[cat] = [];
    anestesiaDB[cat].push({
      Procedimento: data.Procedimento,
      Valor: data.Valor
    });
  });
  flatAnesthesias = Object.values(anestesiaDB).reduce((a,b)=>a.concat(b), []);
}

document.addEventListener("DOMContentLoaded", async () => {
  // 1) load Firestore data  
  await loadData();

  // 2) standard initialization
  showScreen("home-screen");
  atualizarDashboard();
  document.getElementById("btnNovoOrcamento").onclick = () => {
    resetForm();
    showScreen("form-screen");
  };
  document.getElementById("btnVerOrcamentos").onclick = showSavedScreen;
  document.getElementById("tipoCirurgiaSelect").onchange = () => {
    document.getElementById("form-detalhes").classList.remove("hidden");
  };

  // 3) fill dropdowns **after** data load
  preencherProcDropdown();
  preencherAnestDropdown();

  // 4) recalc total on medical-fee change
  document.getElementById("valorMedicoInput")
          .addEventListener("input", atualizarTotal);
});

// —————— RESTANTE DO CÓDIGO IGUAL AO ORIGINAL ——————

/** Limpa todo o estado para iniciar um novo orçamento. **/
function resetForm() {
  editandoId = null;
  procedimentosSelecionados = [];
  anestesiasSelecionadas   = [];
  document.getElementById("tipoCirurgiaSelect").value = "";
  clearFormDetails();
  document.getElementById("form-detalhes").classList.add("hidden");
  esconderFormAlert();
}

/** Alterna entre as “telas” do app. **/
function showScreen(idTela) {
  ["home-screen","form-screen","saved-screen"].forEach(tela => {
    const el = document.getElementById(tela);
    tela === idTela ? el.classList.remove("hidden") : el.classList.add("hidden");
  });
  if (idTela === "home-screen") atualizarDashboard();
}

/** Preenche o dropdown customizado de Procedimentos **/
function preencherProcDropdown() {
  const toggle = document.getElementById("procToggle");
  const menu   = document.getElementById("procMenu");
  const busca  = document.getElementById("buscaProcedimento");

  toggle.onclick = () => {
    menu.classList.toggle("hidden");
    if (!menu.classList.contains("hidden")) {
      busca.value = "";
      renderProcOptions("");
      busca.focus();
    }
  };
  busca.addEventListener("input", () => renderProcOptions(busca.value.toLowerCase()));
  renderProcOptions("");
}

function renderProcOptions(filtro) {
  const container = document.getElementById("procOptionsContainer");
  container.innerHTML = "";
  flatProcedures
    .filter(p => p.Procedimento.toLowerCase().includes(filtro))
    .forEach(p => {
      const div = document.createElement("div");
      div.className = "option-item";
      div.innerText = `${p.Procedimento} — R$ ${p.Valor.toLocaleString("pt-BR")}`;
      div.onclick = () => {
        procedimentosSelecionados.push(p);
        renderizarLista("procedimentosSelecionados", procedimentosSelecionados);
        atualizarTotal();
        menu.classList.add("hidden");
      };
      container.appendChild(div);
    });
}

function fecharProcDropdown() {
  document.getElementById("procMenu").classList.add("hidden");
}

/** Preenche o dropdown customizado de Anestesias **/
function preencherAnestDropdown() {
  const toggle = document.getElementById("anestToggle");
  const menu   = document.getElementById("anestMenu");
  const busca  = document.getElementById("buscaAnestesia");

  toggle.onclick = () => {
    menu.classList.toggle("hidden");
    if (!menu.classList.contains("hidden")) {
      busca.value = "";
      renderAnestOptions("");
      busca.focus();
    }
  };
  busca.addEventListener("input", () => renderAnestOptions(busca.value.toLowerCase()));
  renderAnestOptions("");
}

function renderAnestOptions(filtro) {
  const container = document.getElementById("anestOptionsContainer");
  container.innerHTML = "";
  flatAnesthesias
    .filter(a => a.Procedimento.toLowerCase().includes(filtro))
    .forEach(a => {
      const div = document.createElement("div");
      div.className = "option-item";
      div.innerText = `${a.Procedimento} — R$ ${a.Valor.toFixed(2).replace(".", ",")}`;
      div.onclick = () => {
        anestesiasSelecionadas.push(a);
        renderizarLista("anestesiasSelecionadas", anestesiasSelecionadas);
        atualizarTotal();
        menu.classList.add("hidden");
      };
      container.appendChild(div);
    });
}

function fecharAnestDropdown() {
  document.getElementById("anestMenu").classList.add("hidden");
}

function clearFormDetails() {
  document.getElementById("buscaProcedimento").value = "";
  document.getElementById("procOptionsContainer").innerHTML = "";
  document.getElementById("buscaAnestesia").value = "";
  document.getElementById("anestOptionsContainer").innerHTML = "";
  document.getElementById("procedimentosSelecionados").innerHTML = "";
  document.getElementById("anestesiasSelecionadas").innerHTML = "";
  document.getElementById("valorMedicoInput").value = "";
  document.getElementById("resultadoTotal").innerText = "R$ 0,00";
  renderProcOptions("");
  renderAnestOptions("");
}

function renderizarLista(id, lista) {
  const el = document.getElementById(id);
  el.innerHTML = "";
  const sorted = [...lista].sort((a,b)=>b.Valor-a.Valor);
  sorted.forEach((item, idx) => {
    const div = document.createElement("div");
    div.className = "item";
    const efetivo = idx===0 ? item.Valor : item.Valor/2;
    const suffix  = idx===0 ? "" : " (50%)";
    div.innerHTML = `
      <span>${item.Procedimento} — R$ ${efetivo.toFixed(2).replace(".",",")}${suffix}</span>
      <button onclick="removerItem('${id}', ${lista.indexOf(item)})">&times;</button>`;
    el.appendChild(div);
  });
}

function removerItem(listaId, index) {
  if (listaId==="procedimentosSelecionados") {
    procedimentosSelecionados.splice(index,1);
    renderizarLista("procedimentosSelecionados",procedimentosSelecionados);
  } else {
    anestesiasSelecionadas.splice(index,1);
    renderizarLista("anestesiasSelecionadas",anestesiasSelecionadas);
  }
  atualizarTotal();
}

function atualizarTotal() {
  let total = 0;
  if (procedimentosSelecionados.length>0) {
    const sp = [...procedimentosSelecionados].sort((a,b)=>b.Valor-a.Valor);
    total += sp[0].Valor;
    for (let i=1;i<sp.length;i++) total += sp[i].Valor/2;
  }
  if (anestesiasSelecionadas.length>0) {
    const sa = [...anestesiasSelecionadas].sort((a,b)=>b.Valor-a.Valor);
    total += sa[0].Valor;
    for (let i=1;i<sa.length;i++) total += sa[i].Valor/2;
  }
  const valMed = parseFloat(document.getElementById("valorMedicoInput").value)||0;
  total += valMed;
  document.getElementById("resultadoTotal").innerText =
    `R$ ${total.toFixed(2).replace(".",",")}`;
}

function confirmarAntesSalvar() {
  const tipo = document.getElementById("tipoCirurgiaSelect").value;
  const valMed = parseFloat(document.getElementById("valorMedicoInput").value)||0;
  let avisos = [];
  if (!tipo) avisos.push("• O tipo de cirurgia não foi selecionado.");
  if (procedimentosSelecionados.length===0) avisos.push("• Nenhum procedimento selecionado.");
  if (anestesiasSelecionadas.length===0) avisos.push("• Nenhuma anestesia selecionada.");
  if (!valMed) avisos.push("• O valor médico não foi informado.");

  if (avisos.length>0) {
    const alertDiv = document.getElementById("formAlert");
    alertDiv.innerHTML = `<strong>Atenção:</strong><br>${avisos.join("<br>")}`;
    alertDiv.classList.remove("hidden");
  } else esconderFormAlert();

  let total=0;
  if (procedimentosSelecionados.length>0) {
    const sp=[...procedimentosSelecionados].sort((a,b)=>b.Valor-a.Valor);
    total+=sp[0].Valor;
    for (let i=1;i<sp.length;i++) total+=sp[i].Valor/2;
  }
  if (anestesiasSelecionadas.length>0) {
    const sa=[...anestesiasSelecionadas].sort((a,b)=>b.Valor-a.Valor);
    total+=sa[0].Valor;
    for (let i=1;i<sa.length;i++) total+=sa[i].Valor/2;
  }
  total+=valMed;

  let resumo = `Confirme o orçamento:\n\nCirurgia: ${tipo||"[não informado]"}\n\nProcedimentos:\n`;
  if (procedimentosSelecionados.length>0) {
    const sp=[...procedimentosSelecionados].sort((a,b)=>b.Valor-a.Valor);
    sp.forEach((p,idx)=>{
      const ef=idx===0?p.Valor:p.Valor/2;
      resumo+=`  • ${p.Procedimento} — R$ ${ef.toFixed(2).replace(".",",")}${idx===0?"": " (50%)"}\n`;
    });
  } else resumo+="  (nenhum)\n";
  resumo+=`\nAnestesias:\n`;
  if (anestesiasSelecionadas.length>0) {
    const sa=[...anestesiasSelecionadas].sort((a,b)=>b.Valor-a.Valor);
    sa.forEach((a,idx)=>{
      const ef=idx===0?a.Valor:a.Valor/2;
      resumo+=`  • ${a.Procedimento} — R$ ${ef.toFixed(2).replace(".",",")}${idx===0?"": " (50%)"}\n`;
    });
  } else resumo+="  (nenhuma)\n";
  resumo+=`\nValor Médico: R$ ${valMed? valMed.toFixed(2).replace(".",",") : "[não informado]"}\n`;
  resumo+=`\nTotal Estimado: R$ ${total.toFixed(2).replace(".",",")}\n\nDeseja salvar este orçamento?`;

  if (confirm(resumo)) salvarOrcamento();
}

function esconderFormAlert() {
  const alertDiv = document.getElementById("formAlert");
  alertDiv.classList.add("hidden");
  alertDiv.innerText = "";
}

function salvarOrcamento() {
  const tipo = document.getElementById("tipoCirurgiaSelect").value;
  const valMed = parseFloat(document.getElementById("valorMedicoInput").value)||0;
  const novoOrc = {
    tipoCirurgia: tipo,
    procedimentos: procedimentosSelecionados.map(p=>({...p})),
    anestesias: anestesiasSelecionadas.map(a=>({...a})),
    valorMedico: valMed,
    timestamp: Date.now(),
    status: "open"
  };
  let orcList = JSON.parse(localStorage.getItem("orcamentos")||"[]");
  if (editandoId!==null) {
    novoOrc.status = orcList[editendoId].status||"open";
    orcList[editandoId] = novoOrc;
    editandoId = null;
  } else orcList.push(novoOrc);
  localStorage.setItem("orcamentos",JSON.stringify(orcList));
  alert("Orçamento salvo com sucesso!");
  voltarHome();
}

function showSavedScreen() {
  renderizarSalvos();
  showScreen("saved-screen");
}

function renderizarSalvos() {
  const listaElm = document.getElementById("lista-orcamentos");
  listaElm.innerHTML = "";
  const orcList = JSON.parse(localStorage.getItem("orcamentos")||"[]");
  orcList.forEach((orc, idx) => {
    let total=0;
    if (orc.procedimentos.length>0) {
      const sp=[...orc.procedimentos].sort((a,b)=>b.Valor-a.Valor);
      total+=sp[0].Valor;
      for (let i=1;i<sp.length;i++) total+=sp[i].Valor/2;
    }
    if (orc.anestesias.length>0) {
      const sa=[...orc.anestesias].sort((a,b)=>b.Valor-a.Valor);
      total+=sa[0].Valor;
      for (let i=1;i<sa.length;i++) total+=sa[i].Valor/2;
    }
    total+=orc.valorMedico||0;

    const li=document.createElement("li");
    li.className="saved-item";
    const statusLabel = {
      open: "Em Aberto",
      success: "🏆 Fechado (Sucesso)",
      lost: "❌ Fechado (Perdido)"
    }[orc.status]||"Em Aberto";

    li.innerHTML = `
      <div>
        <b>Cirurgia:</b> ${orc.tipoCirurgia||"[não informado]"}<br>
        <b>Status:</b> ${statusLabel}<br><br>
        <b>Procedimentos:</b><br>
        <ul>${orc.procedimentos.map(p=>{
          const sp=[...orc.procedimentos].sort((a,b)=>b.Valor-a.Valor);
          const idxP=sp.findIndex(x=>x.Procedimento===p.Procedimento&&x.Valor===p.Valor);
          const efP=idxP===0?p.Valor:p.Valor/2;
          return `<li>${p.Procedimento} — R$ ${efP.toFixed(2).replace(".",",")}${idxP===0?"": " (50%)"}</li>`;
        }).join("")}</ul>
        ${orc.procedimentos.length===0?"<i>(nenhum)</i><br>":""}
        <b>Anestesias:</b><br>
        <ul>${orc.anestesias.map(a=>{
          const sa=[...orc.anestesias].sort((x,y)=>y.Valor-x.Valor);
          const idxA=sa.findIndex(x=>x.Procedimento===a.Procedimento&&x.Valor===a.Valor);
          const efA=idxA===0?a.Valor:a.Valor/2;
          return `<li>${a.Procedimento} — R$ ${efA.toFixed(2).replace(".",",")}${idxA===0?"": " (50%)"}</li>`;
        }).join("")}</ul>
        ${orc.anestesias.length===0?"<i>(nenhuma)</i><br>":""}
        <b>Valor Médico:</b> R$ ${(orc.valorMedico||0).toFixed(2).replace(".",",")}<br>
        <b>Total:</b> R$ ${total.toFixed(2).replace(".",",")}
      </div>
      <div class="saved-actions">
        <button onclick="editarOrcamento(${idx})">✏️ Editar</button>
        <button onclick="excluirOrcamento(${idx})">🗑️ Excluir</button>
        <button onclick="exportarPDFSalvo(${idx})">📄 Exportar PDF</button>
        ${orc.status==="open"
          ? `<button onclick="marcarSucesso(${idx})">✅ Marcar Sucesso</button>
             <button onclick="marcarPerdido(${idx})">❎ Marcar Perdido</button>`
          : ""}
      </div>`;
    listaElm.appendChild(li);
  });
}

function marcarSucesso(idx) {
  const orcList = JSON.parse(localStorage.getItem("orcamentos")||"[]");
  orcList[idx].status="success";
  localStorage.setItem("orcamentos",JSON.stringify(orcList));
  alert("Orçamento marcado como Sucesso!");
  renderizarSalvos();
  atualizarDashboard();
}

function marcarPerdido(idx) {
  const orcList = JSON.parse(localStorage.getItem("orcamentos")||"[]");
  orcList[idx].status="lost";
  localStorage.setItem("orcamentos",JSON.stringify(orcList));
  alert("Orçamento marcado como Perdido!");
  renderizarSalvos();
  atualizarDashboard();
}

function editarOrcamento(idx) {
  const orcList = JSON.parse(localStorage.getItem("orcamentos")||"[]");
  const orc = orcList[idx];
  editandoId = idx;
  showScreen("form-screen");
  document.getElementById("tipoCirurgiaSelect").value = orc.tipoCirurgia;
  document.getElementById("form-detalhes").classList.remove("hidden");
  esconderFormAlert();
  clearFormDetails();
  preencherProcDropdown();
  preencherAnestDropdown();
  procedimentosSelecionados = orc.procedimentos.map(p=>({...p}));
  anestesiasSelecionadas   = orc.anestesias.map(a=>({...a}));
  renderizarLista("procedimentosSelecionados", procedimentosSelecionados);
  renderizarLista("anestesiasSelecionadas",   anestesiasSelecionadas);
  document.getElementById("valorMedicoInput").value = orc.valorMedico||0;
  atualizarTotal();
}

function excluirOrcamento(idx) {
  let orcList = JSON.parse(localStorage.getItem("orcamentos")||"[]");
  if (!confirm("Deseja realmente excluir este orçamento?")) return;
  orcList.splice(idx,1);
  localStorage.setItem("orcamentos",JSON.stringify(orcList));
  renderizarSalvos();
  atualizarDashboard();
}

function exportarPDFAtual() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 10;
  const tipo = document.getElementById("tipoCirurgiaSelect").value;
  doc.setFontSize(16);
  doc.text("Orçamento Cirúrgico",10,y);
  y+=10;
  doc.setFontSize(12);
  doc.text(`Cirurgia: ${tipo||"[não informado]"}`,10,y);
  y+=10;
  doc.text("Procedimentos:",10,y);
  y+=8;
  if (procedimentosSelecionados.length>0) {
    const sp=[...procedimentosSelecionados].sort((a,b)=>b.Valor-a.Valor);
    sp.forEach((p,idx)=>{
      const ef = idx===0 ? p.Valor : p.Valor/2;
      const suf= idx===0 ? "" : " (50%)";
      doc.text(`- ${p.Procedimento} — R$ ${ef.toFixed(2).replace(".",",")}${suf}`,12,y);
      y+=6;
    });
  } else {
    doc.text("- (nenhum)",12,y);
    y+=6;
  }
  y+=4;
  doc.text("Anestesias:",10,y);
  y+=8;
  if (anestesiasSelecionadas.length>0) {
    const sa=[...anestesiasSelecionadas].sort((a,b)=>b.Valor-a.Valor);
    sa.forEach((a,idx)=>{
      const ef = idx===0 ? a.Valor : a.Valor/2;
      const suf= idx===0 ? "" : " (50%)";
      doc.text(`- ${a.Procedimento} — R$ ${ef.toFixed(2).replace(".",",")}${suf}`,12,y);
      y+=6;
    });
  } else {
    doc.text("- (nenhuma)",12,y);
    y+=6;
  }
  y+=4;
  const valMed = parseFloat(document.getElementById("valorMedicoInput").value)||0;
  doc.text(`Valor Médico: R$ ${valMed? valMed.toFixed(2).replace(".",",") : "[não informado]"}`,10,y);
  y+=10;
  let total=0;
  if (procedimentosSelecionados.length>0) {
    const sp=[...procedimentosSelecionados].sort((a,b)=>b.Valor-a.Valor);
    total+=sp[0].Valor;
    for (let i=1;i<sp.length;i++) total+=sp[i].Valor/2;
  }
  if (anestesiasSelecionadas.length>0) {
    const sa=[...anestesiasSelecionadas].sort((a,b)=>b.Valor-a.Valor);
    total+=sa[0].Valor;
    for (let i=1;i<sa.length;i++) total+=sa[i].Valor/2;
  }
  total+=valMed;
  doc.setFontSize(14);
  doc.text(`Total Estimado: R$ ${total.toFixed(2).replace(".",",")}`,10,y);
  doc.save(`orcamento_${Date.now()}.pdf`);
}

function exportarPDFSalvo(idx) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 10;
  const orcList = JSON.parse(localStorage.getItem("orcamentos")||"[]");
  const orc     = orcList[idx];
  doc.setFontSize(16);
  doc.text("Orçamento Cirúrgico (Salvo)",10,y);
  y+=10;
  doc.setFontSize(12);
  doc.text(`Cirurgia: ${orc.tipoCirurgia||"[não informado]"}`,10,y);
  y+=10;
  doc.text("Procedimentos:",10,y);
  y+=8;
  if (orc.procedimentos.length>0) {
    const sp=[...orc.procedimentos].sort((a,b)=>b.Valor-a.Valor);
    sp.forEach((p,idx)=>{
      const ef = idx===0 ? p.Valor : p.Valor/2;
      const suf= idx===0 ? "" : " (50%)";
      doc.text(`- ${p.Procedimento} — R$ ${ef.toFixed(2).replace(".",",")}${suf}`,12,y);
      y+=6;
    });
  } else {
    doc.text("- (nenhum)",12,y);
    y+=6;
  }
  y+=4;
  doc.text("Anestesias:",10,y);
  y+=8;
  if (orc.anestesias.length>0) {
    const sa=[...orc.anestesias].sort((a,b)=>b.Valor-a.Valor);
    sa.forEach((a,idx)=>{
      const ef = idx===0 ? a.Valor : a.Valor/2;
      const suf= idx===0 ? "" : " (50%)";
      doc.text(`- ${a.Procedimento} — R$ ${ef.toFixed(2).replace(".",",")}${suf}`,12,y);
      y+=6;
    });
  } else {
    doc.text("- (nenhuma)",12,y);
    y+=6;
  }
  y+=4;
  doc.text(`Valor Médico: R$ ${orc.valorMedico? orc.valorMedico.toFixed(2).replace(".",",") : "[não informado]"}`,10,y);
  y+=10;
  let total=0;
  if (orc.procedimentos.length>0) {
    const sp=[...orc.procedimentos].sort((a,b)=>b.Valor-a.Valor);
    total+=sp[0].Valor;
    for (let i=1;i<sp.length;i++) total+=sp[i].Valor/2;
  }
  if (orc.anestesias.length>0) {
    const sa=[...orc.anestesias].sort((a,b)=>b.Valor-a.Valor);
    total+=sa[0].Valor;
    for (let i=1;i<sa.length;i++) total+=sa[i].Valor/2;
  }
  total+=orc.valorMedico;
  doc.setFontSize(14);
  doc.text(`Total Estimado: R$ ${total.toFixed(2).replace(".",",")}`,10,y);
  doc.save(`orcamento_salvo_${orc.timestamp}.pdf`);
}

function voltarHome() {
  resetForm();
  showScreen("home-screen");
}

function atualizarDashboard() {
  const orcList = JSON.parse(localStorage.getItem("orcamentos")||"[]");
  let countSuccess=0, countLost=0, countOpenOver2Days=0;
  const agora = Date.now();
  orcList.forEach(o=>{
    if (o.status==="success") countSuccess++;
    else if (o.status==="lost") countLost++;
    else if (o.status==="open" && agora - o.timestamp > 2*24*60*60*1000) {
      countOpenOver2Days++;
    }
  });
  document.getElementById("countSuccess").innerText = countSuccess;
  document.getElementById("countLost").innerText    = countLost;
  document.getElementById("countOpenOver2Days").innerText = countOpenOver2Days;
  const dash = document.getElementById("dashboard");
  if (countOpenOver2Days>0) {
    dash.classList.add("alert-overdue");
    alert(`Existem ${countOpenOver2Days} orçamentos sem retorno há mais de 2 dias!`);
  } else dash.classList.remove("alert-overdue");
}
