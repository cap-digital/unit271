# Unit · Medicina 2027.1 · Dashboard de mídia paga

Dashboard interativo das campanhas de mídia paga (Google, YouTube e TikTok) da Universidade Tiradentes, construído em Next.js 14 (App Router), Tailwind e Recharts.

## Rodando

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start
```

> Não rode `npm run build` com o `npm run dev` aberto na mesma pasta: os dois escrevem em `.next` e um corrompe o outro.

## Fonte de dados

Os dados vêm de uma Supabase Edge Function (`Unit271`). O endpoint e a chave *publishable* têm valores padrão em `lib/config.ts` e podem ser sobrescritos por variáveis de ambiente:

```
NEXT_PUBLIC_DATA_ENDPOINT=https://<projeto>.supabase.co/functions/v1/Unit271
NEXT_PUBLIC_DATA_KEY=sb_publishable_...
```

A chamada é feita direto do navegador (a função aceita CORS). O último payload fica em `localStorage`, então recargas são instantâneas e a atualização acontece em segundo plano (a cada 10 min ou pelo botão “Atualizado …” no cabeçalho).

## Regras de negócio

- **Custo = Investimento.** Todas as métricas de custo (CPM, CPC, CPV, CPE) usam a coluna `Investimento`; a coluna Spend/Cost é ignorada.
- **MEDX.** Campanhas cujo nome contém `MEDX` formam uma campanha separada. O switch no menu alterna entre “somente MEDX” e “somente campanha 27.1”. Não há Google em MEDX, então a página Google é ocultada nesse modo.
- **Métricas derivadas** (sempre calculadas sobre totais, nunca média de linhas):
  - CPM = Investimento ÷ Impressões × 1.000 · CPC = Investimento ÷ Cliques · CTR = Cliques ÷ Impressões
  - CPV = Investimento ÷ Visualizações · VTR = Visualizações ÷ Impressões (YouTube: TrueView; TikTok: views de 2 s)
  - CPE = Investimento ÷ Engajamentos (Google/YouTube) · Conclusão = Views 100% ÷ Visualizações
  - YouTube reporta *taxas* de quartil; convertemos em contagens (taxa × impressões) por linha antes de somar.
- **Praças** (botão “Desempenho Praça” em Google e YouTube). A extração por cidade (`pracasgoogle` / `pracasyoutube`) não fecha com o relatório da campanha — no Google chega a divergir 15% em cliques. `lib/places.ts` reconcilia os dois: cada praça mantém sua participação no dia e a soma passa a ser exatamente o total da plataforma, por dia e por métrica. O fator é sempre recalculado a partir dos dados de cada carga, nunca fixo, e por isso acompanha qualquer mudança na divergência. Contagens usam maior resto (somam exato em inteiros); investimento é repartido sem quantizar, para a soma do período não fugir por centavos.
- **Metas** (página Progresso de Metas) ficam em `lib/goals.ts`, com período próprio por campanha: 27.1 de 31/08 a 18/10 e MEDX de 01/09 a 13/09. O ritmo esperado é linear sobre esse período e conta apenas dias fechados.

## Estrutura

```
app/                páginas (visão geral, google, youtube, tiktok, criativos, metas)
components/layout   sidebar flutuante, cabeçalho, seletor de período, switch MEDX
components/charts   série temporal, barras, participação, funil, retenção, agrupadas
components/places   botão e modal de desempenho por praça
components/tables   tabela ordenável
components/pages    página genérica de plataforma, grade de KPIs, tabela diária
components/creatives, components/goals, components/insights
lib/                normalização, métricas, datas, formatação, metas, criativos, insights, paleta
store/              contexto global (dados, período, MEDX, metas)
```
