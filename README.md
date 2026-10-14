# 🧫 CellCare

Um "Pou" de biologia celular: em vez de um bichinho, você cuida de **culturas de células** como num laboratório de verdade.

## Como funciona

- **Tempo:** 1 minuto real = 1 hora no laboratório (com pausa e velocidade 4×). Até 12 h passam enquanto você está fora.
- **Metabolismo:** as células consomem glicose e liberam lactato e amônia. O pH é calculado por Henderson–Hasselbalch a partir do bicarbonato de cada meio e do CO₂ da estufa, e aparece na cor do vermelho de fenol.
- **Cultivo:** trocar o meio, tripsinizar, contar na Neubauer, semear, congelar (SFB + DMSO), descongelar e vender o excesso.
- **16 linhagens:** L929 (recomeço gratuito), HeLa, HEK293T, A549, MCF-7, U2OS, MDA-MB-231, A375, U87 MG, A172, Jurkat (suspensão), MRC-5, IMR-90, HDF, HUVEC e iPSC, cada uma com seu meio.
- **Contaminações em 3 níveis:** bactéria (Pen/Strep previne), fungo (anfotericina B; esporos contaminam a estufa) e micoplasma (invisível, só no PCR; resiste a antibióticos).
- **Economia:** moeda fictícia CellCoins (◈), bolsa diária, missões de tutorial e ajuda da orientadora quando você fica sem nada.
- **Idiomas e temas:** português, inglês e espanhol; temas Lavanda e Azul. Layout para celular e computador, instalável como app (PWA).
- **Dificuldade:** Fácil, Normal, Difícil e Extremo (contaminação, preços, vendas, mortalidade, bolsa e XP).
- **Minijogos (estilo Pou):** Chuva de Nutrientes, Caça-Contaminantes (placa de 12 poços), Memória do Lab, Contagem na Neubauer, Arrumar Ponteiras, Pipetagem Certeira, Rotular Criotubos e Centrífuga Equilibrada, que rendem CellCoins; e a oficina Preparar Meio, que rende meio completo pela metade do preço.
- **Passes:** acelerador de tempo (12 h/48 h), confluência instantânea, robô de meio, capela HEPA turbo, "p < 0,05", feira de células, café (XP×2), transdução expressa, descontaminação total e telomerase (hTERT).
- **Microscópios:** contraste de fase → fluorescência → time-lapse → confocal → super-resolução → eletrônico, cada um com sua imagem; cada linhagem tem morfologia própria.
- **Transduções:** H2B-GFP, FUCCI, 53BP1-mCherry, GFP-LC3 e luciferase valorizam as células e liberam experimentos de imagem.
- **Ensaios:** MTT, imagem ao vivo de marcadores, fixação com PFA + DAPI ou faloidina, NMA e CellMorph (computador de análise), SA-β-gal, clonogênico e wound healing.
- **Pesquisa:** quimio (cisplatina, etoposídeo, doxorrubicina, paclitaxel, hidroxiureia, rapamicina, cloroquina) e radiação. Três réplicas viram um artigo, com XP e financiamento.

## Rodar localmente

```bash
npm install
npm run dev
```

## Estrutura

```
src/game/      lógica pura do jogo (sem React): dados, simulação, ações, save
src/components UI reutilizável (célula, frasco, microscópio, HUD)
src/tabs/      telas (Cultura, Estufas, Freezer, Loja, Pesquisa, Lab)
src/modals/    suspensão celular, experimento, transdução
```

## Roadmap

- [ ] Login com conta + save na nuvem (Supabase)
- [ ] Versão Android/iOS com Capacitor
- [ ] Minigame de contagem na Neubauer
- [ ] Eventos (falta de luz, inspeção de biossegurança, congresso)
- [ ] Conquistas e ranking entre cientistas
