document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('atendimentoForm');
    const dateInput = document.getElementById('data');
    const idInput = document.getElementById('numeroAtendimentoInput');
    const btnSalvarNovo = document.getElementById('btnSalvarNovo');
    const btnExcluir = document.getElementById('btnExcluir');
    const loginOverlay = document.getElementById('loginOverlay');
    const loginForm = document.getElementById('loginForm');
    const container = document.querySelector('.container');

    // Authentication check
    checkAuth();

    // Initialize
    init();

    function checkAuth() {
        const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        if (isLoggedIn) {
            if (loginOverlay) loginOverlay.style.display = 'none';
            if (container) container.classList.remove('blurred');
        } else {
            if (loginOverlay) loginOverlay.style.display = 'flex';
            if (container) container.classList.add('blurred');
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('username').value;
            const pass = document.getElementById('password').value;
            const errorMsg = document.getElementById('loginError');

            if (user === 'inspetoria' && pass === 'iesc2019') {
                sessionStorage.setItem('isLoggedIn', 'true');
                if (errorMsg) errorMsg.style.display = 'none';
                checkAuth();
            } else {
                if (errorMsg) errorMsg.style.display = 'block';
            }
        });
    }

    function init() {
        const categoryBtn = document.querySelector('.category-btn');
        const defaultCategory = categoryBtn ? categoryBtn.getAttribute('data-category') : 'Não Informado';
        setupCategorySelection(defaultCategory);
        loadTitles();
        loadHeaderInfo();
        loadLogos();
        setupSearch();
        setupLogoUpload();
        updateTotalCount();

        // Setup Attachments (Removed local functionality)
        // setupAnexos();
    }


    // --- Category Selection ---
    function setupCategorySelection(initialCategory) {
        const buttons = document.querySelectorAll('.category-btn');
        const hiddenInput = document.getElementById('tipoAtendimento');
        const displayPrint = document.getElementById('tipoAtendimentoDisplay');

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.getAttribute('data-category');
                if (hiddenInput.value !== category) {
                    if (confirm(`Mudar para ${category}? O formulário atual será limpo.`)) {
                        setCategory(category);
                        startNewAtendimento();
                        updateTotalCount();
                    }
                }
            });
        });

        function setCategory(category) {
            if (hiddenInput) hiddenInput.value = category;
            if (displayPrint) displayPrint.innerText = category;
            buttons.forEach(b => b.classList.toggle('active', b.getAttribute('data-category') === category));
        }

        setCategory(initialCategory);
        window.updateCategoryUI = setCategory;
    }

    // --- Search, History & Export ---
    function setupSearch() {
        const searchInput = document.getElementById('searchQuery');
        const btnBuscar = document.getElementById('btnBuscar');
        const searchResults = document.getElementById('searchResults');
        const btnNovoItem = document.getElementById('btnNovoItem');
        const btnHistorico = document.getElementById('btnHistorico');
        const btnExportar = document.getElementById('btnExportar');
        const btnEstatistica = document.getElementById('btnEstatistica');

        if (btnNovoItem) btnNovoItem.addEventListener('click', () => confirm('Limpar formulário e iniciar novo?') && startNewAtendimento());

        if (btnHistorico) btnHistorico.addEventListener('click', () => {
            const category = document.getElementById('tipoAtendimento').value;
            const records = getAllRecordsByCategory(category);
            records.length ? displaySearchResults(records, `Histórico: ${category}`) : alert('Nenhum registro nesta categoria.');
        });

        if (btnExportar) btnExportar.addEventListener('click', exportData);
        if (btnEstatistica) btnEstatistica.addEventListener('click', showStatistics);

        const performSearch = () => {
            const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
            if (!query) return alert('Insira um nome ou número.');
            const results = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('atendimento_')) {
                    const data = JSON.parse(localStorage.getItem(key));
                    const term = query.toLowerCase();
                    const nomeEstudante = (data.nomeEstudante || '').toLowerCase();
                    const nomeAtendido = (data.nomeAtendido || '').toLowerCase();
                    const escola = (data.escola || '').toLowerCase();
                    const id = (data.id || '').toLowerCase();

                    if (nomeEstudante.includes(term) || nomeAtendido.includes(term) || escola.includes(term) || id.includes(term)) {
                        results.push({ key, data, category: data.tipoAtendimento });
                    }
                }
            }
            if (results.length === 0) alert('Nenhum registro encontrado.');
            else if (results.length === 1) loadRecordByKey(results[0].key);
            else displaySearchResults(results, 'Resultados da busca:');
        };

        if (btnBuscar) btnBuscar.addEventListener('click', performSearch);
        if (searchInput) searchInput.addEventListener('keypress', (e) => e.key === 'Enter' && performSearch());

        window.displaySearchResults = function (results, title) {
            searchResults.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <span style="font-weight:600;">${title}</span>
                <button type="button" class="btn" style="padding:2px 8px; font-size:0.8rem;" onclick="document.getElementById('searchResults').style.display='none'">Fechar X</button>
            </div>`;
            const list = document.createElement('div');
            list.style.display = 'flex'; list.style.flexDirection = 'column'; list.style.gap = '5px';
            results.sort((a, b) => parseInt(b.data.id) - parseInt(a.data.id));
            results.forEach(res => {
                const item = document.createElement('button');
                item.className = 'btn'; item.style.textAlign = 'left'; item.style.backgroundColor = '#f8f9fa'; item.style.border = '1px solid #ddd'; item.style.color = '#333'; item.style.padding = '8px';
                item.innerHTML = `<strong>Nº ${res.data.id}</strong> - ${res.data.nomeEstudante} <span style="font-size:0.8rem; color:#666;">(${res.category})</span>`;
                item.onclick = () => { loadRecordByKey(res.key); searchResults.style.display = 'none'; };
                list.appendChild(item);
            });
            searchResults.appendChild(list);
            searchResults.style.display = 'block';
        };

        function showStatistics() {
            const category = document.getElementById('tipoAtendimento').value;
            const records = getAllRecordsByCategory(category);

            if (records.length === 0) return alert('Nenhum registro nesta categoria para estatística.');

            const stats = {};
            let total = 0;

            records.forEach(res => {
                const escola = (res.data.escola || 'Não Informada').trim();
                stats[escola] = (stats[escola] || 0) + 1;
                total++;
            });

            // Ordenar escolas por nome
            const sortedSchools = Object.keys(stats).sort();

            let html = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3 style="margin:0; color:var(--primary-color);">Estatística por Escola</h3>
                    <div style="display:flex; gap:10px;">
                        <button type="button" class="btn btn-success" id="btnDownloadPDF" style="padding:4px 12px; font-size:0.85rem;">Baixar PDF</button>
                        <button type="button" class="btn" style="padding:4px 12px; font-size:0.85rem;" onclick="document.getElementById('searchResults').style.display='none'">Fechar X</button>
                    </div>
                </div>
                <p style="font-size:0.9rem; color:#666; margin-bottom:10px;">Categoria: <strong>${category}</strong></p>
                <table class="stats-table" id="tableStats">
                    <thead>
                        <tr>
                            <th>Escola / Instituição</th>
                            <th style="width: 80px; text-align: center;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            sortedSchools.forEach(escola => {
                html += `
                    <tr>
                        <td>${escola}</td>
                        <td style="text-align: center;">${stats[escola]}</td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
                <div class="stats-summary">
                    TOTAL DE ATENDIMENTOS: ${total}
                </div>
            `;

            searchResults.innerHTML = html;
            searchResults.style.display = 'block';
            searchResults.scrollIntoView({ behavior: 'smooth' });

            // Add PDF download listener
            const btnDownloadPDF = document.getElementById('btnDownloadPDF');
            if (btnDownloadPDF) {
                btnDownloadPDF.addEventListener('click', () => {
                    downloadStatsPDF(category, sortedSchools, stats, total);
                });
            }
        }

        function downloadStatsPDF(category, schools, stats, total) {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const title = document.getElementById('tituloPrincipal').innerText || 'ATENDIMENTO À COMUNIDADE';

            // --- Document Header with Logos ---
            const logo1 = document.getElementById('logo1');
            const logo2 = document.getElementById('logo2');

            // Logo 1 (Left)
            if (logo1 && logo1.complete && logo1.naturalWidth !== 0) {
                try {
                    doc.addImage(logo1, 'PNG', 10, 10, 40, 20);
                } catch (e) { console.error("Erro ao adicionar Logo 1 ao PDF:", e); }
            }

            // Logo 2 (Right)
            if (logo2 && logo2.complete && logo2.naturalWidth !== 0) {
                try {
                    doc.addImage(logo2, 'PNG', 160, 10, 40, 20);
                } catch (e) { console.error("Erro ao adicionar Logo 2 ao PDF:", e); }
            }

            // Title and Subtitle
            doc.setFontSize(16);
            doc.setTextColor(44, 62, 80);
            doc.text(title, 105, 20, { align: 'center' });

            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text(`Estatísticas de Atendimento - ${category}`, 105, 30, { align: 'center' });
            doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 105, 40, { align: 'center' });

            // Table Data
            const tableBody = schools.map(school => [school, stats[school].toString()]);
            tableBody.push([{ content: 'TOTAL DE ATENDIMENTOS', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, { content: total.toString(), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'center' } }]);

            doc.autoTable({
                startY: 45,
                head: [['Escola / Instituição', 'Total']],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [44, 62, 80], halign: 'center' },
                columnStyles: {
                    1: { halign: 'center' }
                },
                margin: { top: 45 }
            });

            doc.save(`estatistica_${category.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
        }
    }

    function getAllRecordsByCategory(category) {
        const results = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(`atendimento_${category}_`)) {
                try {
                    results.push({ key, data: JSON.parse(localStorage.getItem(key)), category });
                } catch (e) { }
            }
        }
        return results;
    }

    function exportData() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k.startsWith('atendimento_') || k.startsWith('lastId_') || k.startsWith('titulo') || k.startsWith('logo')) data[k] = localStorage.getItem(k);
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        a.download = `backup_atendimentos_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    }

    function loadRecordByKey(key) {
        const data = JSON.parse(localStorage.getItem(key));
        if (data) populateForm(data);
    }

    function populateForm(data) {
        form.reset();
        if (idInput) idInput.value = data.id;
        if (data.tipoAtendimento && window.updateCategoryUI) window.updateCategoryUI(data.tipoAtendimento);
        for (const key in data) if (form.elements[key]) form.elements[key].value = data[key];

        // Load attachments (Removed)
        // currentAnexos = data.anexos || [];
        // renderAnexos();

        const searchResults = document.getElementById('searchResults');
        if (searchResults) searchResults.style.display = 'none';

        // Show delete button for existing records
        if (btnExcluir) btnExcluir.style.display = 'inline-block';

        syncMirror();
    }

    // --- Titles ---
    function setupTitleEditing(elementId, storageKey) {
        const el = document.getElementById(elementId);
        if (el) el.addEventListener('input', () => localStorage.setItem(storageKey, el.innerText));
    }

    function loadTitles() {
        const title = localStorage.getItem('tituloApp');
        if (title && document.getElementById('tituloPrincipal')) document.getElementById('tituloPrincipal').innerText = title;
    }

    function loadHeaderInfo() {
        const info = localStorage.getItem('headerInfoRightContent');
        if (info && document.getElementById('headerInfoRight')) document.getElementById('headerInfoRight').innerText = info;
    }

    function loadLogos() {
        ['logo1', 'logo2'].forEach(id => {
            const saved = localStorage.getItem(id);
            if (saved) {
                const el = document.getElementById(id);
                if (el) el.src = saved;
            }
        });
    }

    function setupLogoUpload() {
        const logoInput = document.getElementById('logoInput');
        if (!logoInput) return;

        let activeLogoId = null;

        ['containerLogo1', 'containerLogo2'].forEach((containerId, index) => {
            const container = document.getElementById(containerId);
            if (container) {
                container.addEventListener('click', () => {
                    activeLogoId = `logo${index + 1}`;
                    logoInput.click();
                });
            }
        });

        logoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file && activeLogoId) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64 = event.target.result;
                    localStorage.setItem(activeLogoId, base64);
                    const el = document.getElementById(activeLogoId);
                    if (el) el.src = base64;
                };
                reader.readAsDataURL(file);
            }
            // Reset input
            logoInput.value = '';
        });
    }

    // --- Counter Logic ---
    function getNextId() {
        const categoryField = document.getElementById('tipoAtendimento');
        const category = categoryField ? categoryField.value : 'Não Informado';
        const lastId = localStorage.getItem(`lastId_${category}`);
        let next = (lastId && !isNaN(lastId)) ? parseInt(lastId) + 1 : 1;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(`atendimento_${category}_`)) {
                const parts = key.split('_');
                const idVal = parseInt(parts[parts.length - 1]);
                if (!isNaN(idVal) && idVal >= next) next = idVal + 1;
            }
        }
        return next;
    }

    function startNewAtendimento() {
        form.reset();
        // currentAnexos = [];
        // renderAnexos();
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        if (idInput) idInput.value = getNextId().toString().padStart(4, '0');

        // Hide delete button for new records
        if (btnExcluir) btnExcluir.style.display = 'none';

        syncMirror();
    }

    function saveAtendimento() {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const id = idInput ? idInput.value.trim() : '';
        const category = data.tipoAtendimento || 'Não Informado';
        if (!id) return alert("Insira um Número.");
        data.id = id;
        // data.anexos = currentAnexos; // Save attachments (Removed)
        localStorage.setItem(`atendimento_${category}_${id}`, JSON.stringify(data));
        if (!isNaN(id)) {
            const last = parseInt(localStorage.getItem(`lastId_${category}`) || 0);
            if (parseInt(id) >= last) localStorage.setItem(`lastId_${category}`, id);
        }
        alert(`Atendimento ${id} (${category}) salvo!`);
        startNewAtendimento();
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            saveAtendimento();
        });
    }

    // --- Sync Description to Mirror Div for proper printing ---
    function syncMirror() {
        const descricaoTextarea = document.getElementById('descricao');
        const descricaoMirror = document.getElementById('descricaoMirror');
        if (descricaoTextarea && descricaoMirror) {
            descricaoMirror.innerText = descricaoTextarea.value;
        }
    }

    const descricaoTextarea = document.getElementById('descricao');
    if (descricaoTextarea) {
        descricaoTextarea.addEventListener('input', syncMirror);
    }

    function deleteAtendimento() {
        const id = idInput ? idInput.value : '';
        const category = document.getElementById('tipoAtendimento').value;
        const key = `atendimento_${category}_${id}`;

        if (!id || !localStorage.getItem(key)) {
            return alert("Este registro não está salvo ou não é possível encontrá-lo.");
        }

        if (confirm(`Tem certeza que deseja EXCLUIR o atendimento Nº ${id} (${category})? Esta operação não pode ser desfeita.`)) {
            localStorage.removeItem(key);

            // Recalculate lastId for this category
            let maxId = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k.startsWith(`atendimento_${category}_`)) {
                    const parts = k.split('_');
                    const idVal = parseInt(parts[parts.length - 1]);
                    if (!isNaN(idVal) && idVal > maxId) maxId = idVal;
                }
            }
            localStorage.setItem(`lastId_${category}`, maxId.toString());

            alert("Atendimento excluído com sucesso!");
            startNewAtendimento();
            updateTotalCount();
        }
    }

    if (btnExcluir) {
        btnExcluir.addEventListener('click', deleteAtendimento);
    }

    if (btnSalvarNovo) {
        btnSalvarNovo.addEventListener('click', (e) => {
            e.preventDefault();
            if (form.checkValidity()) {
                saveAtendimento();
                updateTotalCount();
            }
            else form.reportValidity();
        });
    }

    function updateTotalCount() {
        const category = document.getElementById('tipoAtendimento').value;
        const records = getAllRecordsByCategory(category);
        const badge = document.getElementById('totalCountBadge');
        if (badge) badge.innerText = records.length;
    }

    // --- Auto-shrink Phone Font for Print ---
    window.addEventListener('beforeprint', () => {
        ['telefone1', 'telefone2'].forEach(id => {
            const phoneInput = document.getElementById(id);
            if (phoneInput && phoneInput.value) {
                // Force a base size first (consistent with CSS 16pt)
                let size = 16;
                phoneInput.style.fontSize = size + 'pt';

                // Iterate down if it overflows. 
                // scrollWidth vs clientWidth is usually reliable for inputs.
                let safety = 0;
                while (phoneInput.scrollWidth > phoneInput.clientWidth && size > 8 && safety < 20) {
                    size -= 0.5;
                    phoneInput.style.fontSize = size + 'pt';
                    safety++;
                }
            }
        });
    });

    window.addEventListener('afterprint', () => {
        ['telefone1', 'telefone2'].forEach(id => {
            const phoneInput = document.getElementById(id);
            if (phoneInput) {
                phoneInput.style.fontSize = ''; // Reset to CSS default
            }
        });
    });
});
