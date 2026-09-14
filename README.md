# RouteFix — núcleo JavaScript

Núcleo local do RouteFix, migrado do Python para JavaScript.

## Módulos migrados

- `src/constants.js` — constantes e regexes.
- `src/normalizacao.js` — normalização pura.
- `src/parserEndereco.js` — parsing de endereço e abreviações.
- `src/geografia.js` — Haversine.
- `src/modules/agrupador.js` — agrupamento de paradas.
- `src/modules/detectorConflitos.js` — detecção de conflitos de coordenadas.
- `src/modules/excelReader.js` — leitura de XLSX com SheetJS.
- `src/modules/viacepService.js` — consulta ViaCEP, comparação de logradouros e enriquecimento.
- `src/modules/excelWriter.js` — montagem das paradas e geração do XLSX final.
- `src/modules/pipeline.js` — orquestração completa do processamento local.

## ViaCEP

A consulta usa `fetch`, limite de concorrência de 15 requisições e timeout de 4 segundos.
Falhas de rede ou CEP inexistente não interrompem o processamento.

A validação mantém a regra do projeto original:

1. expande abreviações;
2. remove acentos;
3. compara os tokens da rua;
4. usa limiar de similaridade de 80%;
5. se necessário, tenta iniciais posicionais, de forma tudo-ou-nada.

O serviço aceita `fetchImpl` injetado nos testes, evitando chamadas reais ao ViaCEP durante a suíte.

## Testes

Requer Node.js 18+.

```bash
npm install
npm test
```

O teste específico do ViaCEP pode ser executado com:

```bash
node --test test/viacepService.test.js
```

## Pipeline

O pipeline recebe os bytes do XLSX, executa leitura → ViaCEP → enriquecimento → agrupamento → detecção de coordenadas suspeitas → geração do XLSX e devolve o arquivo final como `Uint8Array`. Isso permite reutilizar o mesmo núcleo diretamente no navegador/Capacitor, sem Flask ou servidor local.

## Próximas etapas

1. Interface Android
2. Integração Capacitor + Android Studio
3. Seleção do XLSX e gravação em Downloads
4. Teste no aparelho
5. APK final
