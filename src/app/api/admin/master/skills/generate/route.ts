import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { slug } = await request.json();

  const client = await pool.connect();
  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied

    // 1. Buscar a Skill e o seu DNA
    const skillRes = await client.query('SELECT id, name, skill_metadata FROM system_features WHERE slug = $1', [slug]);
    if (skillRes.rows.length === 0) return NextResponse.json({ error: 'Skill não encontrada' });
    
    const skill = skillRes.rows[0];
    const metadata = skill.skill_metadata || {};

    // 2. Determinação do Contexto de Tenant (Isolamento)
    const userId = decoded.userId;
    let tenantId = decoded.tenantId;

    // Se o token não tem tenantId, tenta buscar no banco
    if (!tenantId) {
      const tenantQuery = await client.query('SELECT tenant_id FROM user_tenant_membership WHERE user_id = $1 LIMIT 1', [userId]);
      tenantId = tenantQuery.rows[0]?.tenant_id;
    }

    console.log('Final Context Tenant ID:', tenantId);

    // Bypass para Administradores de Sistema (Super Admins)
    const isSystemAdmin = decoded.is_system_role === true;

    if (!tenantId && !isSystemAdmin) {
      console.error('Tentativa de acesso sem Tenant ID para o usuário:', userId);
      return NextResponse.json({ error: 'Nenhuma empresa ativa para este usuário' }, { status: 403 });
    }

    // 2.1 Buscar o Contrato de Skill para este Tenant
    const mappingRes = await client.query('SELECT skill_config FROM tenant_feature_overrides WHERE tenant_id = $1 AND feature_id = $2', [tenantId, skill.id]);
    
    const config = mappingRes.rows[0]?.skill_config || {};
    const mappings = config.mappings || {};

    // 3. Buscar Dados Reais baseados no mapeamento DNA
    let contextData = "";
    const dataLimit = Number(metadata.data_limit) || 5;
    
    for (const req of (metadata.requirements || [])) {
        const mappedColumn = mappings[req.id] || mappings[req.label] || req.default_mapping;
        if (mappedColumn) {
            try {
              let query = "";
              let params: any[] = [dataLimit, tenantId];

              if (req.target === 'users') {
                query = `
                  SELECT 
                    CASE 
                      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = $3) 
                      THEN u."${mappedColumn}"::text
                      ELSE u.metadata->>$3
                    END as result_value
                  FROM users u
                  JOIN user_tenant_membership m ON u.id = m.user_id
                  WHERE m.tenant_id = $2
                  LIMIT $1
                `;
                params.push(mappedColumn);
              } else {
                query = `
                  SELECT 
                    CASE 
                      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = $4 AND column_name = $3) 
                      THEN "${mappedColumn}"::text
                      ELSE NULL
                    END as result_value
                  FROM ${req.target} 
                  WHERE tenant_id = $2 
                  LIMIT $1
                `;
                params.push(mappedColumn);
                params.push(req.target);
              }

              const dataRes = await client.query(query, params);
              const values = dataRes.rows.map(r => r.result_value).filter(v => !!v).join(", ");
              
              if (values) {
                contextData += `\n- [DNA] ${req.label} (${req.target}.${mappedColumn}): ${values}`;
              } else {
                contextData += `\n- [DNA] ${req.label} (${req.target}.${mappedColumn}): Sem dados ou coluna inexistente.`;
              }
            } catch (e) {
              console.error(`Erro ao buscar dados DNA ${req.label}:`, e);
            }
        }
    }

    // 3.2 Suplemento Ad Hoc (Custom Mappings)
    const customMappings = config.custom_mappings || [];
    if (customMappings.length > 0) {
        contextData += "\n\nSUPLEMENTO AD HOC:";
        for (const extra of customMappings) {
            if (extra.table && extra.column) {
                try {
                    const extraRes = await client.query(`SELECT "${extra.column}" FROM ${extra.table} WHERE tenant_id = $2 LIMIT $1`, [dataLimit, tenantId]);
                    const extraValues = extraRes.rows.map(r => r[extra.column] || r.result_value).filter(v => !!v).join(", ");
                    if (extraValues) contextData += `\n- [AD HOC] ${extra.label || 'Extra'} (${extra.table}.${extra.column}): ${extraValues}`;
                } catch (e) {}
            }
        }
    }

    // 2.2 Buscar Configurações de IA do Tenant (Decentralized Governance)
    let tenantAiKeys: any = {};
    if (tenantId) {
        const tenantRes = await client.query('SELECT ai_config FROM tenants WHERE id = $1', [tenantId]);
        tenantAiKeys = tenantRes.rows[0]?.ai_config || {};
    }

    // 5. Motor Master de IA (Agnostic AI Engine)
    // Prioriza chaves do inquilino (SaaS BYOK), senão usa globais
    const geminiKey = tenantAiKeys.gemini_key || process.env.GEMINI_API_KEY;
    const groqKey = tenantAiKeys.groq_key || process.env.GROQ_API_KEY;
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
    
    // Modelo: lido exclusivamente do ai_config do tenant (Governança BYOK)
    // Fallback inteligente: se não configurado, escolhe baseado nas chaves disponíveis
    const selectedModel = tenantAiKeys.preferred_model 
      || (groqKey ? 'llama-3.3-70b-versatile' : 'gemini-2.0-flash');
    const temperature = metadata.temperature || 0.7;
    const systemPrompt = `
      ${metadata.prompt || 'Você é um estrategista de vendas.'}
      
      CONTEXTO EMPRESARIAL REAL:
      ${contextData || 'Nenhum dado mapeado.'}
      
      INST: Gere um insight estratégico.
    `;

    try {
      // ===== ROTEAMENTO AGNÓSTICO =====
      // Prioridade: Groq (se tiver chave) → Gemini (se tiver chave) → sem provedor
      // O modelo escolhido é enviado diretamente conforme configurado no tenant

      const isGroqModel = selectedModel.includes('llama') || 
                          selectedModel.includes('mixtral') || 
                          selectedModel.includes('gemma') ||
                          selectedModel.includes('whisper');

      const isGeminiModel = selectedModel.includes('gemini');

      // ROTA 1: Groq Cloud (quando há chave E o modelo é compatível ou sem preferred_model especificado)
      if (groqKey && (isGroqModel || (!isGeminiModel && tenantAiKeys.preferred_model))) {
        console.log(`🚀 [GROQ] Usando modelo: ${selectedModel}`);
        const groqResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: 'system', content: systemPrompt }],
            temperature: temperature
          })
        });
        const groqData = await groqResp.json();
        if (groqResp.ok) {
          return NextResponse.json({
            success: true,
            insight: groqData.choices?.[0]?.message?.content || 'Resposta vazia do Groq.',
            provider: `Groq Cloud (${selectedModel})`
          });
        }
        // Se Groq falhou, logar e deixar cair para Gemini como fallback
        console.error(`❌ [GROQ] Falhou: ${groqData.error?.message}. Tentando Gemini...`);
      }

      // ROTA 2: Google Gemini
      if (geminiKey) {
        // Determinar o modelo Gemini: usar o preferred_model se for Gemini,
        // senão usar gemini-2.0-flash como fallback padrão
        const googleModel = isGeminiModel ? selectedModel : 'gemini-2.0-flash';
        console.log(`🚀 [GEMINI] Usando modelo: ${googleModel}`);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:generateContent?key=${geminiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: { temperature: temperature }
          })
        });

        const data = await response.json();
        if (!response.ok) {
          return NextResponse.json({
            success: true,
            insight: `[MOTOR GEMINI] ${data.error?.message || 'Erro Google'}`,
            provider: 'Google Gemini'
          });
        }

        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'IA processada, resposta vazia.';
        return NextResponse.json({ success: true, insight: aiResponse, provider: `Google Gemini (${googleModel})` });
      }

      // ROTA 3: Ollama Local (último recurso)
      try {
        const ollamaResp = await fetch(ollamaUrl, {
          method: 'POST',
          body: JSON.stringify({ model: 'llama3', prompt: systemPrompt, stream: false }),
          signal: AbortSignal.timeout(2000)
        });
        if (ollamaResp.ok) {
          const ollamaData = await ollamaResp.json();
          return NextResponse.json({ success: true, insight: ollamaData.response, provider: 'Ollama Local' });
        }
      } catch (e) {}

      return NextResponse.json({
        success: true,
        insight: `[MOTOR ${selectedModel.toUpperCase()}] Nenhuma chave de API configurada. Acesse Configurações → Tenants → Engenharia de IA para configurar.`,
        provider: 'Router Master (Sem Provedor)'
      });

    } catch (aiErr: any) {
      return NextResponse.json({ success: true, insight: `[ERRO] ${aiErr.message}` });
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
