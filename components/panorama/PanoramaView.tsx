import React, { useState, useEffect } from 'react';
import { ChevronLeft, GraduationCap, Lock, BookOpen, ChevronRight, Volume2, Sparkles, Loader2, Book, Trash2, Edit, Save, X } from 'lucide-react';
import { db } from '../../services/database';
import { BIBLE_BOOKS, generateChapterKey } from '../../constants';
import { EBDContent } from '../../types';
import { generateContent } from '../../services/geminiService';

export default function PanoramaView({ isAdmin, onShowToast, onBack }: any) {
  const [book, setBook] = useState('Gênesis');
  const [chapter, setChapter] = useState(1);
  const [content, setContent] = useState<EBDContent | null>(null);
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState<string[]>([]);
  
  // Admin Generator State
  const [isGenerating, setIsGenerating] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

  // Manual Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  useEffect(() => { loadContent(); }, [book, chapter]);

  const loadContent = async () => {
    const key = generateChapterKey(book, chapter);
    const res = await db.entities.PanoramaBiblico.filter({ study_key: key });
    if (res.length) {
        setContent(res[0]);
    } else {
        setContent(null);
    }
  };

  useEffect(() => {
    if (content) {
        const text = activeTab === 'student' ? content.student_content : content.teacher_content;
        processAndPaginate(text);
        setCurrentPage(0);
        // Reset edit mode when changing content
        setIsEditing(false);
    } else {
        setPages([]);
    }
  }, [activeTab, content]);

  const cleanText = (text: string) => {
    if (!text || text === 'undefined') return '';
    return text.trim();
  };

  const processAndPaginate = (html: string) => {
    if (!html) { setPages([]); return; }
    // Split by the explicit page break separator
    const rawPages = html.split('<hr class="page-break">');
    const cleanedPages = rawPages.map(p => cleanText(p)).filter(p => p.length > 50); // Filter out empty or very short glitch pages
    setPages(cleanedPages.length > 0 ? cleanedPages : [cleanText(html)]);
  };

  const hasAccess = isAdmin || activeTab === 'student'; 

  // --- PARSER DE ESTILOS INLINE (Negrito, Itálico) ---
  const parseInlineStyles = (text: string) => {
    // Regex para capturar **negrito** e *itálico*
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="text-[#8B0000] font-bold">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={index} className="text-gray-700">{part.slice(1, -1)}</em>;
        }
        return part;
    });
  };

  // --- FORMATAÇÃO VISUAL RICA ---
  const renderFormattedText = (text: string) => {
    // Quebra o texto em blocos para identificar títulos e parágrafos
    const blocks = text.split('\n').filter(b => b.trim().length > 0);
    
    return blocks.map((block, idx) => {
        const trimmed = block.trim();

        // 1. SUBTÍTULOS (Identificados por # ou caixa alta curta)
        // Removemos qualquer # visualmente e transformamos em estilo
        if (trimmed.startsWith('#') || (trimmed === trimmed.toUpperCase() && trimmed.length < 60 && trimmed.length > 5)) {
            const title = trimmed.replace(/#+/g, '').trim(); // Remove todos os #
            return (
                <div key={idx} className="mt-8 mb-4">
                    <div className="flex items-center justify-center gap-4 mb-2">
                        <div className="h-[1px] bg-[#C5A059] w-12 opacity-50"></div>
                        <h3 className="font-cinzel font-bold text-xl text-[#8B0000] text-center uppercase tracking-wide">
                            {title}
                        </h3>
                        <div className="h-[1px] bg-[#C5A059] w-12 opacity-50"></div>
                    </div>
                </div>
            );
        }

        // 2. PERGUNTAS (Identificadas por ? no final ou palavras chave)
        if (trimmed.endsWith('?') || trimmed.startsWith('PERGUNTA:') || trimmed.includes('?')) {
            return (
                <div key={idx} className="font-cormorant text-lg text-[#1a0f0f] font-bold italic bg-[#C5A059]/10 p-3 border-l-4 border-[#C5A059] rounded-r mb-4">
                    {parseInlineStyles(trimmed)}
                </div>
            );
        }

        // 3. TEXTO PADRÃO
        return (
            <p key={idx} className="font-cormorant text-xl leading-loose text-gray-900 text-justify indent-8 mb-4">
                {parseInlineStyles(trimmed)}
            </p>
        );
    });
  };

  // --- EDITOR MANUAL LOGIC ---
  const handleStartEditing = () => {
    const text = activeTab === 'student' ? content?.student_content : content?.teacher_content;
    setEditValue(text || '');
    setIsEditing(true);
  };

  const handleSaveManualEdit = async () => {
    if (!content) return;
    
    const data = {
        ...content,
        student_content: activeTab === 'student' ? editValue : content.student_content,
        teacher_content: activeTab === 'teacher' ? editValue : content.teacher_content,
    };

    if (content.id) await db.entities.PanoramaBiblico.update(content.id, data);
    await loadContent();
    setIsEditing(false);
    onShowToast('Texto atualizado manualmente!', 'success');
  };

  // --- EDITOR CHEFE (IA) LOGIC ---
  const handleGenerate = async (mode: 'start' | 'continue') => {
    setIsGenerating(true);
    const target = activeTab;
    onShowToast(`Gerando conteúdo (${target === 'student' ? 'Aluno' : 'Professor'})...`, 'info');

    const studyKey = generateChapterKey(book, chapter);
    const existing = (await db.entities.PanoramaBiblico.filter({ study_key: studyKey }))[0] || {};
    const currentText = target === 'student' ? (existing.student_content || '') : (existing.teacher_content || '');
    const studentBaseContent = existing.student_content || "";

    // Context for "Continue" - Increased size to capture context better
    // Capture up to 3000 chars to ensure the AI sees where it left off
    const lastContext = currentText.slice(-3000); 

    const basePersona = `
        VOCÊ É O PROF. MICHEL FELIX (PhD). 
        Estilo: Arminiano, Pentecostal Clássico.
        Linguagem: CLARA, ACESSÍVEL, LUXUOSA, CULTA.
        
        REGRA DE OURO (IMPORTANTE):
        NUNCA ESCREVA O VERSÍCULO BÍBLICO POR EXTENSO.
        O ALUNO JÁ TEM A BÍBLIA ABERTA.
        USE APENAS A REFERÊNCIA (Ex: "Como vemos em Gn 1:1...", "Conforme o verso 5...").
        USE O ESPAÇO QUE SOBRA PARA EXPLICAR, CONTEXTUALIZAR E APLICAR TEOLOGICAMENTE.
        QUERO CONTEÚDO DENSO E EXPLICAÇÃO PROFUNDA, NÃO CÓPIA DE BÍBLIA.
        NÃO USE CARACTERES ESPECIAIS COMO MARKDOWN (#, -, *, etc).
        PARA TÍTULOS USE APENAS LETRAS MAIÚSCULAS OU A TAG ###.
    `;
    
    let specificPrompt = "";
    const instructions = customInstructions ? `\nINSTRUÇÕES ESPECÍFICAS DO ADMIN (OBEDEÇA): ${customInstructions}` : "";
    
    // Prompt de continuação agressivo para evitar loops
    const continuationInstructions = `
        SITUAÇÃO ATUAL: Você está escrevendo a PARTE ${pages.length + 1} de um livro contínuo.
        
        TEXTO ANTERIOR (ÚLTIMAS PALAVRAS):
        "...${lastContext.slice(-500)}..."
        
        COMANDO DE CONTINUIDADE ESTRITA:
        1. LEIA O CONTEXTO ACIMA COM ATENÇÃO EXTREMA.
        2. IDENTIFIQUE EXATAMENTE ONDE PAROU (Qual versículo ou tópico?).
        3. SE PAROU NO VERSÍCULO 5, COMECE IMEDIATAMENTE A EXPLICAR O VERSÍCULO 6.
        4. É PROIBIDO VOLTAR AO VERSÍCULO 1.
        5. É PROIBIDO FAZER NOVA INTRODUÇÃO OU SAUDAÇÃO.
        6. NÃO DIGA "DANDO CONTINUIDADE". APENAS CONTINUE O TEXTO.
        7. MANTENHA A COESÃO TOTAL. O LEITOR NÃO PODE PERCEBER QUE HOUVE UMA PAUSA.
    `;

    if (target === 'student') {
        specificPrompt = `
        OBJETIVO: Criar APOSTILA DO ALUNO para ${book} ${chapter}.
        TIPO: Expositivo, narrativo, fluído.
        ${instructions}
        
        ${mode === 'continue' ? continuationInstructions : `INÍCIO. Comece a introdução e a explicação dos primeiros versículos.`}
        
        REGRAS DE FORMATAÇÃO:
        1. Escreva 3 PÁGINAS completas (~2000 palavras).
        2. Separe cada página com a tag: <hr class="page-break">
        3. Use "### TÍTULO" para subtítulos.
        4. Use **negrito** para ênfase (SEM MARKDOWN DE LISTAS).
        5. Lembre-se: NÃO COPIE VERSÍCULOS. Cite a referência e EXPLIQUE.
        `;
    } else {
        // --- LÓGICA DO PROFESSOR (BASEADA NO ALUNO) ---
        const contextInjection = studentBaseContent 
            ? `BASE DE ESTUDO (MATERIAL DO ALUNO): """${studentBaseContent.slice(0, 4000)}..."""\n\nTAREFA: O professor deve aprofundar o que foi dito acima.`
            : `ATENÇÃO: Não há conteúdo do aluno gerado. Gere um estudo exegético profundo base do zero sobre ${book} ${chapter}.`;

        specificPrompt = `
        OBJETIVO: Criar MANUAL DO PROFESSOR (PhD) para ${book} ${chapter}.
        ${contextInjection}
        ${instructions}
        
        ${mode === 'continue' ? continuationInstructions : `INÍCIO. Comece a introdução técnica.`}

        CAMADAS DE ANÁLISE OBRIGATÓRIAS (APLIQUE NO TEXTO SEQUENCIALMENTE):
        1. NUANCES & ORIGINAIS: Palavras-chave em Hebraico/Grego com transliteração e exegese.
        2. INTENÇÃO DO AUTOR: Contexto histórico/cultural imediato e remoto aprofundado.
        3. APOLOGÉTICA (Distinção Clara):
           - HERESIAS: Refute Mormonismo, Unicismo, Gnosticismo, Espiritismo, etc. (se aplicável ao texto).
           - DIVERGÊNCIAS: Comente divergências saudáveis (Ex: Calvinismo, Pós-Trib) sob a ótica Pentecostal Clássica.
        4. CURIOSIDADES: Padrões ocultos, frases formadas no original (ex: Genealogias), tipologias.
        5. PEDAGOGIA: "Possível Pergunta do Aluno" e "Resposta do Mestre".
        6. PARADOXOS: Resolução de aparentes contradições do texto.

        REGRAS DE FORMATAÇÃO:
        1. Escreva 3 PÁGINAS completas (~2500 palavras).
        2. Separe cada página com a tag: <hr class="page-break">
        3. Use "### TÍTULO" para seções.
        4. Use **negrito** para termos chaves.
        5. NÃO COPIE VERSÍCULOS.
        `;
    }

    try {
        const result = await generateContent(`${basePersona}\n${specificPrompt}`);
        
        if (!result || result.trim() === 'undefined' || result.length < 50) {
            throw new Error("A IA gerou um conteúdo vazio. Tente novamente.");
        }

        // Append or Start
        const separator = (mode === 'continue' && currentText.length > 0) ? '<hr class="page-break">' : '';
        const newTotal = mode === 'continue' ? (currentText + separator + result) : result;
        
        const data = {
            book, chapter, study_key: studyKey,
            title: existing.title || `Estudo de ${book} ${chapter}`,
            outline: existing.outline || [],
            student_content: target === 'student' ? newTotal : (existing.student_content || ''),
            teacher_content: target === 'teacher' ? newTotal : (existing.teacher_content || ''),
        };

        if (existing.id) await db.entities.PanoramaBiblico.update(existing.id, data);
        else await db.entities.PanoramaBiblico.create(data);

        await loadContent();
        onShowToast('Conteúdo gerado com sucesso!', 'success');
        
        // Se for continuação, vá para a nova página
        if (mode === 'continue') {
            setTimeout(() => setCurrentPage(pages.length), 500); 
        }

    } catch (e: any) {
        onShowToast(`Erro: ${e.message}`, 'error');
    } finally {
        setIsGenerating(false);
    }
  };

  const handleDeletePage = async () => {
    if (!window.confirm("Tem certeza que deseja apagar ESTA página?")) return;
    if (!content) return;

    // Remover a página atual do array
    const newPages = [...pages];
    newPages.splice(currentPage, 1);
    const newHtml = newPages.join('<hr class="page-break">');

    const target = activeTab;
    const data = {
        ...content,
        student_content: target === 'student' ? newHtml : content.student_content,
        teacher_content: target === 'teacher' ? newHtml : content.teacher_content,
    };

    if (content.id) await db.entities.PanoramaBiblico.update(content.id, data);
    await loadContent();
    setCurrentPage(Math.max(0, currentPage - 1));
    onShowToast("Página removida.", "success");
  };

  const handleSpeak = () => {
    if (!pages[currentPage]) return;
    // Remove markdown symbols for speech
    const cleanSpeech = pages[currentPage].replace(/#/g, '').replace(/\*/g, '');
    const utter = new SpeechSynthesisUtterance(cleanSpeech);
    utter.lang = 'pt-BR';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-gradient-to-r from-[#600018] to-[#400010] text-white p-4 shadow-lg flex justify-between items-center">
            <button onClick={onBack}><ChevronLeft /></button>
            <h2 className="font-cinzel font-bold">Panorama EBD</h2>
            <div className="flex gap-2">
                {isAdmin && (
                    <button onClick={handleStartEditing} title="Editar Manualmente">
                        <Edit className="w-5 h-5 text-[#C5A059]" />
                    </button>
                )}
                <button onClick={handleSpeak} title="Ouvir"><Volume2 /></button>
            </div>
        </div>

        {/* Controls */}
        <div className="bg-white p-4 border-b border-[#C5A059]/30 flex gap-2">
             <select value={book} onChange={e => setBook(e.target.value)} className="flex-1 p-2 border rounded font-cinzel">
                {BIBLE_BOOKS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
             </select>
             <input type="number" value={chapter} onChange={e => setChapter(Number(e.target.value))} className="w-20 p-2 border rounded font-cinzel" min={1} />
        </div>

        {/* Tabs */}
        <div className="flex bg-[#F5F5DC]">
            <button 
                onClick={() => setActiveTab('student')}
                className={`flex-1 py-4 font-cinzel font-bold flex justify-center gap-2 transition-all ${activeTab === 'student' ? 'bg-[#600018] text-white' : 'text-gray-600 hover:bg-[#600018]/10'}`}
            >
                <BookOpen className="w-5 h-5" /> Aluno
            </button>
            <button 
                onClick={() => setActiveTab('teacher')}
                className={`flex-1 py-4 font-cinzel font-bold flex justify-center gap-2 transition-all ${activeTab === 'teacher' ? 'bg-[#600018] text-white' : 'text-gray-600 hover:bg-[#600018]/10'}`}
            >
                {isAdmin ? <GraduationCap className="w-5 h-5" /> : <Lock className="w-5 h-5" />} Professor
            </button>
        </div>

        {/* Admin Generator Bar */}
        {isAdmin && !isEditing && (
            <div className="bg-[#1a0f0f] text-[#C5A059] p-4 shadow-inner sticky top-[130px] z-20 border-b-4 border-[#8B0000]">
                <div className="flex items-center justify-between mb-2">
                    <span className="font-cinzel text-xs flex items-center gap-2 font-bold"><Sparkles className="w-4 h-4" /> EDITOR CHEFE ({activeTab.toUpperCase()})</span>
                    <button onClick={() => setShowInstructions(!showInstructions)} className="text-xs underline hover:text-white">
                        {showInstructions ? 'Ocultar Instruções' : 'Adicionar Instruções'}
                    </button>
                </div>
                
                {showInstructions && (
                    <textarea 
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        placeholder="Instruções para a IA (Ex: Refute o Unicismo, Foque na Trindade, Explique o termo X...)"
                        className="w-full p-2 text-xs text-black rounded mb-2 font-montserrat"
                        rows={2}
                    />
                )}

                <div className="flex gap-2">
                    <button 
                        onClick={() => handleGenerate('start')} 
                        disabled={isGenerating}
                        className="flex-1 px-3 py-2 border border-[#C5A059] rounded text-xs hover:bg-[#C5A059] hover:text-[#1a0f0f] transition disabled:opacity-50 font-bold"
                    >
                        {isGenerating ? <Loader2 className="animate-spin w-3 h-3 mx-auto"/> : 'INÍCIO (3 págs)'}
                    </button>
                    <button 
                        onClick={() => handleGenerate('continue')} 
                        disabled={isGenerating}
                        className="flex-1 px-3 py-2 bg-[#C5A059] text-[#1a0f0f] font-bold rounded text-xs hover:bg-white transition disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 className="animate-spin w-3 h-3 mx-auto"/> : 'CONTINUAR (+3)'}
                    </button>
                    {pages.length > 0 && (
                        <button 
                            onClick={handleDeletePage}
                            className="px-3 py-2 bg-red-900 text-white rounded hover:bg-red-700 transition"
                            title="Apagar esta página"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        )}

        {/* Content Area */}
        <div className="p-4 md:p-8 max-w-4xl mx-auto pb-32">
            {!hasAccess ? (
                <div className="text-center py-20 opacity-50">
                    <Lock className="w-16 h-16 mx-auto mb-4" />
                    <p className="font-cinzel text-xl">Conteúdo Restrito ao Admin/Professor</p>
                </div>
            ) : isEditing ? (
                 <div className="bg-white shadow-2xl p-4 rounded-lg border border-[#C5A059] relative">
                     <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="font-cinzel font-bold text-[#8B0000]">Modo de Edição Manual</h3>
                        <div className="flex gap-2">
                            <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-sm border border-red-500 text-red-500 rounded flex items-center gap-1">
                                <X className="w-4 h-4"/> Cancelar
                            </button>
                            <button onClick={handleSaveManualEdit} className="px-3 py-1 text-sm bg-green-600 text-white rounded flex items-center gap-1">
                                <Save className="w-4 h-4"/> Salvar
                            </button>
                        </div>
                     </div>
                     <textarea 
                        value={editValue} 
                        onChange={e => setEditValue(e.target.value)}
                        className="w-full h-[600px] p-4 font-mono text-sm border border-gray-300 rounded focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] outline-none"
                    />
                    <p className="mt-2 text-xs text-gray-500">Dica: Use <code>&lt;hr class="page-break"&gt;</code> para separar páginas.</p>
                 </div>
            ) : content && pages.length > 0 ? (
                <div className="bg-white shadow-2xl p-6 md:p-12 min-h-[800px] border border-[#C5A059]/20 relative">
                     {/* Decorative Header in Page */}
                     <div className="text-center mb-8 border-b-2 border-[#C5A059] pb-4">
                        <span className="font-montserrat text-xs tracking-[0.3em] text-[#C5A059] uppercase">Teologia Sistemática ADMA</span>
                        <h1 className="font-cinzel text-2xl md:text-3xl font-bold text-[#600018] mt-2 mb-2">{content.title}</h1>
                        <div className="w-20 h-1 bg-[#C5A059] mx-auto rounded-full"></div>
                     </div>

                     {/* The Content Rendered Richly */}
                     <div className="space-y-6">
                        {renderFormattedText(pages[currentPage])}
                     </div>

                     {/* Page Footer */}
                     <div className="absolute bottom-4 right-8 text-[#C5A059] font-cinzel text-sm">
                        {currentPage + 1}
                     </div>
                </div>
            ) : (
                <div className="text-center py-20 text-gray-500">
                    <Book className="w-16 h-16 mx-auto mb-4 text-[#C5A059] opacity-50"/>
                    <p className="font-cinzel text-lg">Conteúdo em Preparação</p>
                    {isAdmin && <p className="text-sm mt-2 text-[#600018] animate-pulse">Use o Editor Chefe acima para gerar.</p>}
                </div>
            )}
        </div>

        {/* Pagination Footer */}
        {pages.length > 1 && hasAccess && !isEditing && (
            <div className="fixed bottom-0 w-full bg-white border-t border-[#C5A059] p-4 flex justify-between items-center z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
                <button 
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="flex items-center gap-1 px-4 py-2 border rounded-lg text-[#8B0000] disabled:opacity-50 hover:bg-[#8B0000]/10 transition"
                >
                    <ChevronLeft /> Anterior
                </button>
                <span className="font-cinzel font-bold text-[#1a0f0f] text-sm md:text-base">Página {currentPage + 1} de {pages.length}</span>
                <button 
                    onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))}
                    disabled={currentPage === pages.length - 1}
                    className="flex items-center gap-1 px-4 py-2 border rounded-lg text-[#8B0000] disabled:opacity-50 hover:bg-[#8B0000]/10 transition"
                >
                    Próximo <ChevronRight />
                </button>
            </div>
        )}
    </div>
  );
}