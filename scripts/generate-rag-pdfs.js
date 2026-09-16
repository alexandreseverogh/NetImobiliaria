const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// Garantir que o diretório de destino exista
const destDir = 'C:\\NetImobiliária\\RAG';
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function createBeautySalonPDF() {
  const doc = new PDFDocument({ margin: 50 });
  const filePath = path.join(destDir, 'salao_de_beleza.pdf');
  doc.pipe(fs.createWriteStream(filePath));

  // Título e Cabeçalho
  doc.fillColor('#4d1334').fontSize(24).font('Helvetica-Bold').text('Belleza & Harmonia — Salão de Beleza', { align: 'center' });
  doc.moveDown(0.5);
  doc.fillColor('#666666').fontSize(11).font('Helvetica-Oblique').text('Harmonia, estilo e bem-estar para você.', { align: 'center' });
  doc.moveDown(1.5);

  // Informações Gerais
  doc.fillColor('#333333').fontSize(12).font('Helvetica-Bold').text('Informações do Estabelecimento:');
  doc.font('Helvetica').fontSize(10);
  doc.text('• Endereço: Av. Paulista, 1000 - Bela Vista, São Paulo - SP');
  doc.text('• Telefone / WhatsApp: (11) 98888-7777');
  doc.text('• Horário de Funcionamento: Segunda a Sábado, das 08:00 às 20:00 (Feriados sob consulta).');
  doc.moveDown(1.5);

  // Tabela/Lista de Serviços
  doc.fillColor('#4d1334').fontSize(14).font('Helvetica-Bold').text('Nossos Serviços & Valores');
  doc.moveDown(0.5);

  const servicos = [
    { nome: 'Corte de Cabelo Feminino', valor: 'R$ 150,00', desc: 'Inclui lavagem especial com shampoo hidratante, corte personalizado segundo visagismo e finalização com escova modeladora.' },
    { nome: 'Corte de Cabelo Masculino', valor: 'R$ 80,00', desc: 'Corte tradicional ou degradê moderno, lavagem, finalização com pomada modeladora e alinhamento de sobrancelhas cortesia.' },
    { nome: 'Escova & Modelagem', valor: 'R$ 90,00', desc: 'Lavagem com massagem capilar relaxante, escova lisa, modelada ou com ondas naturais utilizando protetor térmico premium.' },
    { nome: 'Coloração Completa', valor: 'R$ 220,00', desc: 'Aplicação de coloração profissional (L\'Oréal ou Wella), lavagem e tratamento pós-cor para fixação do brilho.' },
    { nome: 'Luzes, Mechas & Balayage', valor: 'R$ 480,00', desc: 'Descoloração segura com protetor Plex, tonalização personalizada e tratamento reconstrutor profundo pós-química.' },
    { nome: 'Hidratação Profunda / Nutrição', valor: 'R$ 130,00', desc: 'Tratamento intensivo com máscaras de nutrição e reposição de massa capilar para cabelos ressecados ou danificados.' },
    { nome: 'Manicure & Pedicure Completa', valor: 'R$ 75,00', desc: 'Cutilagem detalhada, esfoliação dos pés e mãos, hidratação profunda e esmaltação com cores modernas e duradouras.' },
    { nome: 'Alongamento de Unhas em Gel', valor: 'R$ 180,00', desc: 'Aplicação de gel moldado premium, nivelamento natural e esmaltação gel duradoura (manutenção recomendada a cada 20 dias).' },
    { nome: 'Design de Sobrancelhas', valor: 'R$ 55,00', desc: 'Estudo das proporções faciais, pinçamento e alinhamento perfeito. Opção com aplicação de Henna inclusa por mais R$ 15,00.' },
    { nome: 'Micropigmentação Fio a Fio', valor: 'R$ 650,00', desc: 'Técnica hiper-realista para preencher falhas e desenhar a sobrancelha ideal. Inclui retoque após 30 dias.' },
    { nome: 'Limpeza de Pele Profunda', valor: 'R$ 160,00', desc: 'Higienização, vapor de ozônio, extração manual de cravos e impurezas, alta frequência e máscara calmante/argila.' },
    { nome: 'Massagem Relaxante Corporal', valor: 'R$ 140,00', desc: 'Massagem de 50 minutos com óleos essenciais aquecidos, focando na liberação de tensões musculares.' },
  ];

  servicos.forEach(s => {
    doc.fillColor('#333333').font('Helvetica-Bold').fontSize(10).text(`${s.nome} — `, { continued: true });
    doc.fillColor('#8b265d').text(s.valor);
    doc.fillColor('#666666').font('Helvetica').fontSize(9.5).text(s.desc);
    doc.moveDown(0.6);
  });

  doc.moveDown(1);

  // Seção de FAQ
  doc.fillColor('#4d1334').fontSize(14).font('Helvetica-Bold').text('Perguntas Frequentes (FAQ)');
  doc.moveDown(0.5);

  const faqs = [
    { q: 'É necessário agendar horário?', a: 'Recomendamos o agendamento prévio pelo WhatsApp para garantir o profissional de sua preferência. Atendemos sem agendamento apenas conforme a disponibilidade do momento.' },
    { q: 'O salão aceita pets (Pet Friendly)?', a: 'Sim! Nosso salão é pet friendly para animais de pequeno porte e temperamento dócil.' },
    { q: 'Quais marcas de cosméticos vocês utilizam?', a: 'Trabalhamos exclusivamente com marcas de renome internacional como Wella Professional, L\'Oréal Professionnel, Kérastase, Joico e esmaltes Risqué/OPI.' },
    { q: 'Quais as formas de pagamento aceitas?', a: 'Aceitamos dinheiro, PIX, cartões de débito e crédito (parcelamento em até 3x sem juros para valores acima de R$ 300,00).' },
  ];

  faqs.forEach(f => {
    doc.fillColor('#333333').font('Helvetica-Bold').fontSize(10).text(`P: ${f.q}`);
    doc.fillColor('#555555').font('Helvetica').fontSize(9.5).text(`R: ${f.a}`);
    doc.moveDown(0.6);
  });

  doc.end();
  console.log('salao_de_beleza.pdf gerado.');
}

function createMobiTechPDF() {
  const doc = new PDFDocument({ margin: 50 });
  const filePath = path.join(destDir, 'loja_celulares.pdf');
  doc.pipe(fs.createWriteStream(filePath));

  // Título e Cabeçalho
  doc.fillColor('#104f55').fontSize(24).font('Helvetica-Bold').text('MobiTech — Venda & Assistência Técnica', { align: 'center' });
  doc.moveDown(0.5);
  doc.fillColor('#666666').fontSize(11).font('Helvetica-Oblique').text('Aparelhos novos, seminovos e consertos especializados.', { align: 'center' });
  doc.moveDown(1.5);

  // Informações Gerais
  doc.fillColor('#333333').fontSize(12).font('Helvetica-Bold').text('Informações do Estabelecimento:');
  doc.font('Helvetica').fontSize(10);
  doc.text('• Endereço: Rua Santa Ifigênia, 450 - Centro, São Paulo - SP');
  doc.text('• Telefone / WhatsApp: (11) 97777-6666');
  doc.text('• Horário de Funcionamento: Segunda a Sexta, das 09:00 às 18:00. Sábados, das 09:00 às 13:00.');
  doc.moveDown(1.5);

  // Venda de Celulares
  doc.fillColor('#104f55').fontSize(14).font('Helvetica-Bold').text('Modelos à Venda & Especificações');
  doc.moveDown(0.5);

  const celulares = [
    {
      modelo: 'Apple iPhone 15 Pro Max (256GB)',
      valor: 'R$ 8.999,00',
      specs: 'Tela Super Retina XDR de 6.7" OLED, Processador A17 Pro (3nm), Câmera Tripla de 48MP com zoom óptico de 5x, Acabamento em titânio aeroespacial. FaceID e resistência IP68.'
    },
    {
      modelo: 'Samsung Galaxy S24 Ultra (512GB)',
      valor: 'R$ 7.499,00',
      specs: 'Tela Dynamic AMOLED 2X de 6.8" com 120Hz, Processador Snapdragon 8 Gen 3 para Galaxy, Câmera Quadrupla de 200MP, S-Pen embutida com Inteligência Artificial Galaxy AI. Bateria de 5.000 mAh.'
    },
    {
      modelo: 'Xiaomi 14 Ultra (512GB)',
      valor: 'R$ 6.199,00',
      specs: 'Tela AMOLED de 6.73" WQHD+, lentes ópticas Leica Summilux com Sensor Sony LYT-900 de 1", Processador Snapdragon 8 Gen 3, carregamento ultra-rápido de 90W com fio.'
    },
    {
      modelo: 'Motorola Edge 50 Ultra (512GB)',
      valor: 'R$ 4.999,00',
      specs: 'Tela pOLED de 6.7" Super HD com 144Hz, Câmera Principal de 50MP + Telefoto de 64MP (3x), Processador Snapdragon 8s Gen 3, traseira com acabamento em madeira natural ou couro vegano.'
    }
  ];

  celulares.forEach(c => {
    doc.fillColor('#333333').font('Helvetica-Bold').fontSize(10).text(`${c.modelo} — `, { continued: true });
    doc.fillColor('#1e7b85').text(c.valor);
    doc.fillColor('#666666').font('Helvetica').fontSize(9.5).text(`Especificações: ${c.specs}`);
    doc.moveDown(0.8);
  });

  doc.moveDown(1);

  // Assistência Técnica
  doc.fillColor('#104f55').fontSize(14).font('Helvetica-Bold').text('Serviços de Assistência Técnica');
  doc.moveDown(0.5);

  const consertos = [
    { serv: 'Troca de Tela (Display)', valor: 'A partir de R$ 250,00', desc: 'Substituição de displays quebrados ou manchados. Trabalhamos com peças Originais e Primeira Linha homologadas.' },
    { serv: 'Troca de Bateria', valor: 'A partir de R$ 120,00', desc: 'Baterias novas com selo de qualidade para reestabelecer a saúde energética e autonomia do seu aparelho.' },
    { serv: 'Reparo em Placa Principal', valor: 'A partir de R$ 350,00', desc: 'Soluções para aparelhos que não ligam, curto-circuito, problemas de carga (conector ou chip de carga U2/PMIC).' },
    { serv: 'Desoxidação Profunda', valor: 'R$ 150,00', desc: 'Limpeza química e secagem profissional de aparelhos que tiveram contato direto com líquidos ou umidade.' },
  ];

  consertos.forEach(c => {
    doc.fillColor('#333333').font('Helvetica-Bold').fontSize(10).text(`${c.serv} — `, { continued: true });
    doc.fillColor('#1e7b85').text(c.valor);
    doc.fillColor('#666666').font('Helvetica').fontSize(9.5).text(c.desc);
    doc.moveDown(0.6);
  });

  doc.moveDown(1);

  // Políticas de Garantia
  doc.fillColor('#104f55').fontSize(14).font('Helvetica-Bold').text('Políticas de Garantia');
  doc.font('Helvetica').fontSize(9.5).fillColor('#444444');
  doc.text('• Aparelhos Novos: 1 ano de garantia direto com a fabricante.');
  doc.text('• Aparelhos Seminovos: 6 meses de garantia MobiTech cobrindo defeitos de hardware.');
  doc.text('• Assistência Técnica: 90 dias de garantia legal sobre a peça trocada e a mão de obra aplicada.');
  doc.text('• Nota: A garantia perde a validade em casos de mau uso evidente (telas trincadas, amassados, ou infiltração de água após o reparo).');
  doc.moveDown(1.5);

  // FAQ
  doc.fillColor('#104f55').fontSize(14).font('Helvetica-Bold').text('Perguntas Frequentes (FAQ)');
  doc.moveDown(0.5);

  const faqs = [
    { q: 'O conserto é feito na hora?', a: 'Trocas simples de tela e bateria de modelos comuns levam entre 40 minutos e 2 horas. Reparos de placa exigem análise em laboratório e levam de 1 a 3 dias úteis.' },
    { q: 'O celular perde a resistência à água após abrir?', a: 'Nós aplicamos uma nova junta de vedação adesiva original após o reparo, mas ressaltamos que nenhum aparelho aberto retém 100% da vedação IP68 original de fábrica. Recomendamos evitar submersões.' },
    { q: 'Vocês compram celulares usados?', a: 'Compramos aparelhos seminovos como parte do pagamento na aquisição de um modelo novo, mediante avaliação presencial e apresentação de documento com foto e nota fiscal.' }
  ];

  faqs.forEach(f => {
    doc.fillColor('#333333').font('Helvetica-Bold').fontSize(10).text(`P: ${f.q}`);
    doc.fillColor('#555555').font('Helvetica').fontSize(9.5).text(`R: ${f.a}`);
    doc.moveDown(0.6);
  });

  doc.end();
  console.log('loja_celulares.pdf gerado.');
}

function createDoctorPDF() {
  const doc = new PDFDocument({ margin: 50 });
  const filePath = path.join(destDir, 'medico_cardiologista.pdf');
  doc.pipe(fs.createWriteStream(filePath));

  // Título e Cabeçalho
  doc.fillColor('#7a1b1d').fontSize(24).font('Helvetica-Bold').text('Dr. Roberto Valente — Cardiologia Integrada', { align: 'center' });
  doc.moveDown(0.5);
  doc.fillColor('#666666').fontSize(11).font('Helvetica-Oblique').text('Prevenção, diagnóstico e reabilitação cardiovascular personalizada.', { align: 'center' });
  doc.moveDown(1.5);

  // Informações Gerais
  doc.fillColor('#333333').fontSize(12).font('Helvetica-Bold').text('Informações da Clínica:');
  doc.font('Helvetica').fontSize(10);
  doc.text('• Endereço: Av. Albert Einstein, 627 - Bloco A, Conj. 122 - Morumbi, São Paulo - SP');
  doc.text('• Agendamento / Central: (11) 96666-5555 / (11) 3788-0000');
  doc.text('• Horário de Atendimento: Segunda a Sexta-feira, das 08:00 às 18:00.');
  doc.text('• Registro Profissional: CRM-SP 185.420 / RQE Cardiologia 92.114');
  doc.moveDown(1.5);

  // Consultas e Check-ups
  doc.fillColor('#7a1b1d').fontSize(14).font('Helvetica-Bold').text('Consultas, Exames & Valores');
  doc.moveDown(0.5);

  const consultas = [
    { nome: 'Consulta Cardiológica Completa', valor: 'R$ 450,00', desc: 'Avaliação clínica minuciosa, histórico médico familiar, exame físico focado no sistema cardiovascular e prescrição.' },
    { nome: 'Check-up Preventivo Esportivo', valor: 'R$ 600,00', desc: 'Ideal para atletas iniciantes ou profissionais. Inclui consulta clínica detalhada, eletrocardiograma de repouso e teste de esforço físico.' },
    { nome: 'Eletrocardiograma (ECG)', valor: 'R$ 120,00', desc: 'Registro da atividade elétrica do coração em repouso. Exame rápido e indolor, com laudo assinado na hora.' },
    { nome: 'Ecocardiograma Transtorácico', valor: 'R$ 380,00', desc: 'Ultrassom cardíaco colorido em tempo real para avaliar as estruturas internas, válvulas e fluxo sanguíneo.' },
    { nome: 'Monitorização Ambulatorial da Pressão (MAPA 24h)', valor: 'R$ 280,00', desc: 'Aparelho de pressão de braço programado para medir a pressão arterial a cada 20 minutos durante o dia e a noite.' },
    { nome: 'Holter de 24 horas', valor: 'R$ 300,00', desc: 'Monitorização contínua do ritmo cardíaco por eletrodos durante 24 horas. Essencial para identificar arritmias esporádicas.' },
  ];

  consultas.forEach(c => {
    doc.fillColor('#333333').font('Helvetica-Bold').fontSize(10).text(`${c.nome} — `, { continued: true });
    doc.fillColor('#b83235').text(c.valor);
    doc.fillColor('#666666').font('Helvetica').fontSize(9.5).text(c.desc);
    doc.moveDown(0.6);
  });

  doc.moveDown(1);

  // FAQ
  doc.fillColor('#7a1b1d').fontSize(14).font('Helvetica-Bold').text('Perguntas Frequentes (FAQ)');
  doc.moveDown(0.5);

  const faqs = [
    { q: 'O consultório aceita planos de saúde / convênios?', a: 'Atendemos consultas particulares e fornecemos documentação completa e recibo para reembolso em convênios como Bradesco Saúde, Amil, SulAmérica e Unimed. Exames laboratoriais e complementares podem ser faturados pelo convênio.' },
    { q: 'Quais preparativos são necessários para os exames?', a: 'Para o Teste Ergométrico (esforço): venha com tênis, roupa confortável de ginástica e evite cafeína ou estimulantes 12h antes. Para MAPA e Holter: tomar banho logo antes de vir instalar o aparelho (pois não poderá tomar banho nas 24h seguintes).' },
    { q: 'A partir de qual idade devo fazer um check-up cardiológico preventivo?', a: 'Homens acima de 35 anos e mulheres acima de 40 anos devem iniciar check-ups anuais. Se houver histórico de infarto na família ou fatores de risco (hipertensão, tabagismo, colesterol alto), deve-se começar aos 25-30 anos.' },
  ];

  faqs.forEach(f => {
    doc.fillColor('#333333').font('Helvetica-Bold').fontSize(10).text(`P: ${f.q}`);
    doc.fillColor('#555555').font('Helvetica').fontSize(9.5).text(`R: ${f.a}`);
    doc.moveDown(0.6);
  });

  doc.end();
  console.log('medico_cardiologista.pdf gerado.');
}

try {
  createBeautySalonPDF();
  createMobiTechPDF();
  createDoctorPDF();
  console.log('Todos os PDFs foram criados com sucesso.');
} catch (e) {
  console.error('Erro na criação de PDFs:', e);
}
