// ========================= FIREBASE INIT =========================
if (!firebase.apps.length) {
  firebase.initializeApp({
    apiKey: "AIzaSyAfg1wkI8y0ivoFvnawMVo3rNuvWyePUEs",
    authDomain: "drgustavo-b8f6f.firebaseapp.com",
    projectId: "drgustavo-b8f6f",
    storageBucket: "drgustavo-b8f6f.firebasestorage.app",
    messagingSenderId: "334453414199",
    appId: "1:334453414199:web:fcb8cc76633bb41bae2b2",
    measurementId: "G-4ELGD1RRLR"
  });
}
const db = firebase.firestore();

// ========================= OFFLINE PERSISTENCE =========================
firebase.firestore.setLogLevel('error');
firebase.firestore().enablePersistence({ synchronizeTabs: true })
  .catch(err => {
    if (err.code === 'failed-precondition') {
      console.warn('Offline persistence falhou: múltiplas abas abertas.');
    } else if (err.code === 'unimplemented') {
      console.warn('Offline persistence não suportada neste browser.');
    }
  });

const orcamentosRef = db.collection('orcamentos');

// ========================= DATA CONTAINERS =========================
let procedimentosDB       = {};
let anestesiaDB           = {};
let setoresDB             = [];
let flatProcedures        = [];
let flatAnesthesias       = [];
let flatSetores           = [];

// ========================= TEMPORARY SELECTIONS =========================
let procedimentosSelecionados = [];
let anestesiasSelecionadas   = [];
let setorSelecionado         = null;
let editandoId               = null;
const { jsPDF } = window.jspdf;

// ========================= LOAD DATA FROM JSON =========================
async function loadData() {
  // procedimentos
  const procResp = await fetch("data/procedimentos.json");
  procedimentosDB = await procResp.json();
  flatProcedures = Object.values(procedimentosDB).flat();

  // anestesias
  const anestResp = await fetch("data/anestesias.json");
  anestesiaDB = await anestResp.json();
  flatAnesthesias = Object.values(anestesiaDB).flat();

  // setores médicos / valor médico
  const setResp = await fetch("data/valorMedico.json");
  setoresDB = await setResp.json();       // JSON como array
  flatSetores = setoresDB;
}

// ========================= DASHBOARD INIT =========================
function initDashboard() {
  orcamentosRef.where('status','==','success')
    .onSnapshot(s => document.getElementById('countSuccess').innerText = s.size);
  orcamentosRef.where('status','==','lost')
    .onSnapshot(s => document.getElementById('countLost').innerText = s.size);
  orcamentosRef.where('status','==','open')
    .onSnapshot(s => {
      const over2d = s.docs.filter(doc=>
        Date.now() - doc.data().timestamp > 2*24*60*60*1000
      ).length;
      document.getElementById('countOpenOver2Days').innerText = over2d;
    });
}

// ========================= INITIALIZATION =========================
document.addEventListener("DOMContentLoaded", async () => {
  await loadData();
  initDashboard();

  // Tipo de cirurgia
  const tipoSelect = document.getElementById("tipoCirurgiaSelect");
  tipoSelect.innerHTML = '<option value="">Selecione...</option>';
  Object.keys(procedimentosDB).forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.innerText = cat;
    tipoSelect.appendChild(opt);
  });

  // Botões principais
  document.getElementById("btnNovoOrcamento").onclick  = () => { resetForm(); showScreen("form-screen"); };
  document.getElementById("btnVerOrcamentos").onclick = () => { showScreen("saved-screen"); renderizarSalvos(); };
  tipoSelect.onchange = () => document.getElementById("form-detalhes").classList.remove("hidden");

  // Dropdowns
  preencherProcDropdown();
  preencherAnestDropdown();
  preencherMedDropdown();

  // Recalcular total ao digitar valor manual
  document.getElementById("valorMedicoInput")
          .addEventListener("input", atualizarTotal);

  showScreen("home-screen");
});

// ========================= FORM RESET =========================
function resetForm() {
  editandoId = null;
  procedimentosSelecionados = [];
  anestesiasSelecionadas   = [];
  setorSelecionado         = null;
  document.getElementById("tipoCirurgiaSelect").value = "";
  document.getElementById("setorSelecionadoNome").innerText = "Nenhum";
  clearFormDetails();
  document.getElementById("form-detalhes").classList.add("hidden");
  esconderFormAlert();
}

// ========================= HIDE FORM ALERT =========================
function esconderFormAlert() {
  const a = document.getElementById("formAlert");
  a.classList.add("hidden");
  a.innerText = "";
}

// ========================= SCREEN NAVIGATION =========================
function showScreen(id) {
  ["home-screen","form-screen","saved-screen"].forEach(tela => {
    document.getElementById(tela)
      .classList.toggle("hidden", tela !== id);
  });
  if (id === "home-screen") initDashboard();
}

// ========================= CLEAR FORM DETAILS =========================
function clearFormDetails() {
  // procedimentos
  document.getElementById("buscaProcedimento").value            = "";
  document.getElementById("procOptionsContainer").innerHTML     = "";
  document.getElementById("procedimentosSelecionados").innerHTML= "";
  // anestesias
  document.getElementById("buscaAnestesia").value               = "";
  document.getElementById("anestOptionsContainer").innerHTML    = "";
  document.getElementById("anestesiasSelecionadas").innerHTML  = "";
  // setores médicos
  document.getElementById("buscaMedico").value                  = "";
  document.getElementById("medOptionsContainer").innerHTML      = "";
  document.getElementById("setorSelecionadoNome").innerText     = "Nenhum";
  // valor médico
  document.getElementById("valorMedicoInput").value             = "";
  // total
  document.getElementById("resultadoTotal").innerText           = "R$ 0,00";
}

// ========================= PROCEDURE DROPDOWN =========================
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
}
function fecharProcDropdown() {
  document.getElementById("procMenu").classList.add("hidden");
}

// ========================= ANESTHESIA DROPDOWN =========================
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

  function renderAnestOptions(filtro) {
    const container = document.getElementById("anestOptionsContainer");
    container.innerHTML = "";
    flatAnesthesias
      .filter(a => a.Procedimento.toLowerCase().includes(filtro))
      .forEach(a => {
        const div = document.createElement("div");
        div.className = "option-item";
        div.innerText = `${a.Procedimento} — R$ ${a.Valor.toFixed(2).replace(".",",")}`;
        div.onclick = () => {
          anestesiasSelecionadas.push(a);
          renderizarLista("anestesiasSelecionadas", anestesiasSelecionadas);
          atualizarTotal();
          menu.classList.add("hidden");
        };
        container.appendChild(div);
      });
  }
}
function fecharAnestDropdown() {
  document.getElementById("anestMenu").classList.add("hidden");
}

// ========================= SETOR MÉDICO DROPDOWN =========================
function preencherMedDropdown() {
  const toggle = document.getElementById("medToggle");
  const menu   = document.getElementById("medMenu");
  const busca  = document.getElementById("buscaMedico");

  toggle.onclick = () => {
    menu.classList.toggle("hidden");
    if (!menu.classList.contains("hidden")) {
      busca.value = "";
      renderSetorOptions("");
      busca.focus();
    }
  };
  busca.addEventListener("input", () => renderSetorOptions(busca.value.toLowerCase()));

  function renderSetorOptions(filtro) {
    const container = document.getElementById("medOptionsContainer");
    container.innerHTML = "";
    flatSetores
      .filter(s => s.Procedimento.toLowerCase().includes(filtro))
      .forEach(s => {
        const div = document.createElement("div");
        div.className = "option-item";
        div.innerText = `${s.Procedimento} — R$ ${s.Valor.toLocaleString("pt-BR")}`;
        div.onclick = () => {
          setorSelecionado = s;
          document.getElementById("setorSelecionadoNome").innerText = s.Procedimento;
          document.getElementById("valorMedicoInput").value = s.Valor;
          atualizarTotal();
          menu.classList.add("hidden");
        };
        container.appendChild(div);
      });
  }
}
function fecharMedDropdown() {
  document.getElementById("medMenu").classList.add("hidden");
}

// ========================= RENDER SELECTED LIST =========================
function renderizarLista(id, lista) {
  const el = document.getElementById(id);
  el.innerHTML = "";
  lista
    .sort((a,b) => b.Valor - a.Valor)
    .forEach((item, idx) => {
      const efetivo = idx === 0 ? item.Valor : item.Valor / 2;
      const suffix  = idx === 0 ? "" : " (50%)";
      const div     = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <span>${item.Procedimento} — R$ ${efetivo.toFixed(2).replace(".",",")}${suffix}</span>
        <button onclick="removerItem('${id}',${idx})">&times;</button>`;
      el.appendChild(div);
    });
}

function removerItem(id, idx) {
  if (id === "procedimentosSelecionados") {
    procedimentosSelecionados.splice(idx,1);
  } else {
    anestesiasSelecionadas.splice(idx,1);
  }
  renderizarLista(id,
    id === "procedimentosSelecionados"
      ? procedimentosSelecionados
      : anestesiasSelecionadas
  );
  atualizarTotal();
}

// ========================= TOTAL CALCULATION =========================
function atualizarTotal() {
  let total = 0;
  // procedimentos
  if (procedimentosSelecionados.length) {
    const sp = [...procedimentosSelecionados].sort((a,b)=>b.Valor - a.Valor);
    total += sp[0].Valor;
    for (let i=1; i<sp.length; i++) total += sp[i].Valor/2;
  }
  // anestesias
  if (anestesiasSelecionadas.length) {
    const sa = [...anestesiasSelecionadas].sort((a,b)=>b.Valor - a.Valor);
    total += sa[0].Valor;
    for (let i=1; i<sa.length; i++) total += sa[i].Valor/2;
  }
  // setor médico
  const vm = parseFloat(document.getElementById("valorMedicoInput").value) || 0;
  total += vm;
  document.getElementById("resultadoTotal").innerText =
    `R$ ${total.toFixed(2).replace(".",",")}`;
}

// ========================= SAVE CONFIRMATION =========================
function confirmarAntesSalvar() {
  const tipo = document.getElementById("tipoCirurgiaSelect").value;
  const vm   = parseFloat(document.getElementById("valorMedicoInput").value) || 0;
  const avisos = [];
  if (!tipo)                             avisos.push("• Tipo de cirurgia não selecionado.");
  if (!procedimentosSelecionados.length) avisos.push("• Nenhum procedimento selecionado.");
  if (!anestesiasSelecionadas.length)   avisos.push("• Nenhuma anestesia selecionada.");
  if (!setorSelecionado)                avisos.push("• Setor médico não selecionado.");
  if (!vm)                               avisos.push("• Valor do setor não informado.");

  if (avisos.length) {
    const a = document.getElementById("formAlert");
    a.innerHTML = `<strong>Atenção:</strong><br>${avisos.join("<br>")}`;
    a.classList.remove("hidden");
    return;
  }
  esconderFormAlert();

  let total = 0;
  let resumo = `Confirme o orçamento:\n\nCirurgia: ${tipo}\n\nProcedimentos:\n`;
  procedimentosSelecionados
    .sort((a,b)=>b.Valor - a.Valor)
    .forEach((p,i) => {
      const ef = i===0 ? p.Valor : p.Valor/2;
      resumo += `  • ${p.Procedimento} — R$ ${ef.toFixed(2).replace(".",",")}${i ? " (50%)" : ""}\n`;
      total += ef;
    });
  resumo += `\nAnestesias:\n`;
  anestesiasSelecionadas
    .sort((a,b)=>b.Valor - a.Valor)
    .forEach((a,i) => {
      const ef = i===0 ? a.Valor : a.Valor/2;
      resumo += `  • ${a.Procedimento} — R$ ${ef.toFixed(2).replace(".",",")}${i ? " (50%)" : ""}\n`;
      total += ef;
    });
  resumo += `\nSetor Médico: ${setorSelecionado.Procedimento} — R$ ${vm.toFixed(2).replace(".",",")}`;
  total += vm;
  resumo += `\n\nTotal Estimado: R$ ${total.toFixed(2).replace(".",",")}`;

  if (confirm(resumo)) salvarOrcamento();
}

// ========================= SAVE TO FIRESTORE =========================
async function salvarOrcamento() {
  const tipo = document.getElementById("tipoCirurgiaSelect").value;
  const vm   = parseFloat(document.getElementById("valorMedicoInput").value) || 0;
  const novo = {
    tipoCirurgia: tipo,
    procedimentos: [...procedimentosSelecionados],
    anestesias:   [...anestesiasSelecionadas],
    setorProcedimento: setorSelecionado.Procedimento,
    valorMedico:  vm,
    timestamp:    Date.now(),
    status:       "open"
  };

  try {
    if (editandoId) {
      await orcamentosRef.doc(editandoId).update(novo);
    } else {
      const docRef = await orcamentosRef.add(novo);
      editandoId = docRef.id;
    }
    alert("Orçamento salvo com sucesso!");
    voltarHome();
  } catch (err) {
    console.error("Erro ao salvar orçamento:", err);
    alert("Falha ao salvar orçamento.");
  }
}

// ========================= RENDER SAVED LIST =========================
function renderizarSalvos() {
  const ul = document.getElementById("lista-orcamentos");
  ul.innerHTML = "";
  orcamentosRef.orderBy("timestamp","desc")
    .onSnapshot(snapshot => {
      ul.innerHTML = "";
      snapshot.forEach(doc => {
        const o = { id: doc.id, ...doc.data() };
        const li = document.createElement("li");
        li.className = "list-group-item mb-3";

        let actions = `
          <button class="btn btn-sm btn-outline-primary me-1" onclick="editarOrcamento('${o.id}')">
            <i class="bi bi-pencil-fill"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger me-1" onclick="excluirOrcamento('${o.id}')">
            <i class="bi bi-trash-fill"></i>
          </button>
          <button class="btn btn-sm btn-outline-secondary me-1" onclick="exportarPDFSalvo('${o.id}')">
            <i class="bi bi-file-earmark-pdf-fill"></i>
          </button>`;
        if (o.status === "open") {
          actions += `
            <button class="btn btn-sm btn-outline-success me-1" onclick="marcarSucesso('${o.id}')">
              <i class="bi bi-check-circle-fill"></i>
            </button>
            <button class="btn btn-sm btn-outline-warning" onclick="marcarPerdido('${o.id}')">
              <i class="bi bi-x-circle-fill"></i>
            </button>`;
        }

        li.innerHTML = `
          <div class="d-flex justify-content-between">
            <div>
              <strong>${o.tipoCirurgia}</strong>
              <small class="text-muted">— ${new Date(o.timestamp).toLocaleString()}</small><br>
              <em>Procedimentos:</em> ${o.procedimentos.map(p=>p.Procedimento).join(", ")}<br>
              <em>Anestesias:</em> ${o.anestesias.map(a=>a.Procedimento).join(", ")}<br>
              <em>Setor Médico:</em> ${o.setorProcedimento} — R\$ ${o.valorMedico.toFixed(2).replace(".",",")} —
              <span class="badge ${o.status==='open'?'bg-primary': o.status==='success'?'bg-success':'bg-danger'}">
                ${o.status.toUpperCase()}
              </span>
            </div>
            <div>${actions}</div>
          </div>`;
        ul.appendChild(li);
      });
    });
}

// ========================= MARK SUCCESS/LOST =========================
async function marcarSucesso(id) {
  await orcamentosRef.doc(id).update({ status: "success" });
}
async function marcarPerdido(id) {
  await orcamentosRef.doc(id).update({ status: "lost" });
}

// ========================= EDIT / POPULATE FORM =========================
async function editarOrcamento(id) {
  const snap = await orcamentosRef.doc(id).get();
  const o = snap.data();
  editandoId = id;

  // Preenche form
  document.getElementById("tipoCirurgiaSelect").value = o.tipoCirurgia;
  procedimentosSelecionados = o.procedimentos.slice();
  anestesiasSelecionadas   = o.anestesias.slice();
  setorSelecionado         = flatSetores.find(s=>s.Procedimento===o.setorProcedimento) || null;

  renderizarLista("procedimentosSelecionados", procedimentosSelecionados);
  renderizarLista("anestesiasSelecionadas", anestesiasSelecionadas);
  if (setorSelecionado) {
    document.getElementById("setorSelecionadoNome").innerText = setorSelecionado.Procedimento;
  }
  document.getElementById("valorMedicoInput").value = o.valorMedico;
  document.getElementById("form-detalhes").classList.remove("hidden");
  showScreen("form-screen");
  atualizarTotal();
}

// ========================= DELETE =========================
async function excluirOrcamento(id) {
  if (!confirm("Excluir este orçamento?")) return;
  await orcamentosRef.doc(id).delete();
}

// ========================= EXPORT TO PDF (CURRENT FORM) =========================
function exportarPDFAtual() {
  const doc = new jsPDF(), p = procedimentosSelecionados, a = anestesiasSelecionadas;
  let y = 20;
  doc.setFontSize(16).text("Orçamento Cirúrgico", 20, y);
  y += 10; doc.setFontSize(12).text(`Cirurgia: ${document.getElementById("tipoCirurgiaSelect").value}`, 20, y);
  y += 10; doc.text("Procedimentos:", 20, y);
  p.forEach((item, idx) => {
    y += 7;
    doc.text(`- ${item.Procedimento} — R$ ${(idx?item.Valor/2:item.Valor).toFixed(2).replace(".",",")}`, 25, y);
  });
  y += 10; doc.text("Anestesias:", 20, y);
  a.forEach((item, idx) => {
    y += 7;
    doc.text(`- ${item.Procedimento} — R$ ${(idx?item.Valor/2:item.Valor).toFixed(2).replace(".",",")}`, 25, y);
  });
  const vm = parseFloat(document.getElementById("valorMedicoInput").value)||0;
  const setor = setorSelecionado ? setorSelecionado.Procedimento : "—";
  y += 10; doc.text(`Setor Médico: ${setor} — R$ ${vm.toFixed(2).replace(".",",")}`, 20, y);
  const total = parseFloat(
    document.getElementById("resultadoTotal").innerText
      .replace("R$ ","")
      .replace(".","")
      .replace(",",".")
  )||0;
  y += 10;
  doc.setTextColor(40,40,180).setFontSize(14)
     .text(`TOTAL ESTIMADO: R$ ${total.toFixed(2).replace(".",",")}`,20,y)
     .setTextColor(0,0,0);
  y += 20;
  doc.setFontSize(11).setFont("helvetica","italic")
     .text("* Acréscimo de 18% p/ parcelamento em até 10x",20,y,{ maxWidth:170 });
  doc.save(`Orcamento_${Date.now()}.pdf`);
}

// ========================= EXPORT SAVED TO PDF =========================
function exportarPDFSalvo(id) {
  orcamentosRef.doc(id).get().then(snap => {
    const o = snap.data();
    const doc = new jsPDF({ unit:'pt', format:'letter' });
    doc.setFontSize(18).text("Orçamento Cirúrgico", 40, 40);
    doc.setFontSize(12).text(`Cirurgia: ${o.tipoCirurgia}`, 40, 70);

    const procedimentos = o.procedimentos.map((p, i) => [
      p.Procedimento,
      `R$ ${(i===0?p.Valor: p.Valor/2).toFixed(2).replace(".",",")}`
    ]);
    const anestesias   = o.anestesias.map((a, i) => [
      a.Procedimento,
      `R$ ${(i===0?a.Valor: a.Valor/2).toFixed(2).replace(".",",")}`
    ]);

    doc.autoTable({
      startY: 100,
      head: [['Procedimento', 'Valor']],
      body: procedimentos,
      theme: 'grid',
      headStyles: { fillColor: [74, 111, 165] }
    });
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Anestesia','Valor']],
      body: anestesias,
      theme: 'grid',
      headStyles: { fillColor: [74, 111, 165] }
    });

    // Setor Médico e Total
    doc.setFontSize(14).setTextColor(0,0,128)
      .text(`Setor Médico: ${o.setorProcedimento} — R$ ${o.valorMedico.toFixed(2).replace(".",",")}`, 40, doc.lastAutoTable.finalY + 40);

    const total = o.valorMedico
      + o.procedimentos.reduce((s,p,i)=> s + (i===0 ? p.Valor : p.Valor/2), 0)
      + o.anestesias.reduce((s,a,i)=> s + (i===0 ? a.Valor : a.Valor/2), 0);

    doc.setFontSize(16).setTextColor(220,20,60)
      .text(`TOTAL ESTIMADO: R$ ${total.toFixed(2).replace(".",",")}`, 40, doc.lastAutoTable.finalY + 70);

    doc.save(`Orçamento_${o.tipoCirurgia}_${id}.pdf`);
  });
}

// ========================= BACK TO HOME =========================
function voltarHome() {
  resetForm();
  showScreen("home-screen");
}
