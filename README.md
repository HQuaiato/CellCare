# 🧫 CellCare

Um "Pou" de biologia celular: em vez de um bichinho, você cuida de **culturas de células** como num laboratório de verdade.

## Como funciona

- **Tempo:** 1 minuto real = 1 hora no laboratório (com pausa e velocidade 4×). Até 12 h passam enquanto você está fora.
- **Metabolismo:** as células consomem glicose e liberam lactato e amônia. O pH é calculado por Henderson–Hasselbalch a partir do bicarbonato de cada meio e do CO₂ da estufa, e aparece na cor do vermelho de fenol.
- **Cultivo:** trocar o meio, tripsinizar, contar na Neubauer, semear, congelar (SFB + DMSO), descongelar e vender o excesso.
- **Linhagens:** HeLa, HEK293T, U2OS, MCF-7, A549, Jurkat (suspensão), HDF (primária, com limite de Hayflick) e iPSC, cada uma com seu meio.
- **Transduções:** H2B-GFP, FUCCI, 53BP1-mCherry, GFP-LC3 e luciferase valorizam as células e liberam experimentos de imagem.
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
- [ ] Contaminação por micoplasma e teste de PCR
- [ ] Minigame de contagem na Neubauer
- [ ] Eventos (falta de luz, inspeção de biossegurança, congresso)
- [ ] Conquistas e ranking entre cientistas
