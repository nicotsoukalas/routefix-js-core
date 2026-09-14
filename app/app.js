import { executar } from "../src/modules/pipeline.js";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { registerPlugin } from "@capacitor/core";

const FileSaver = registerPlugin("FileSaver");
const botaoSelecionar = document.getElementById("selecionarArquivo");
const inputArquivo = document.getElementById("arquivoXlsx");
const arquivoSelecionado = document.getElementById("arquivoSelecionado");
const botaoProcessar = document.getElementById("processar");
const elementoStatus = document.getElementById("status");

let arquivoAtual = null;

function uint8ArrayParaBase64(bytes) {
    let binary = "";

    const tamanhoBloco = 0x8000;

    for (let i = 0; i < bytes.length; i += tamanhoBloco) {
        const bloco = bytes.subarray(
            i,
            Math.min(i + tamanhoBloco, bytes.length)
        );

        binary += String.fromCharCode(...bloco);
    }

    return btoa(binary);
}

// 1. Quando clicar no botão "Selecionar XLSX",
//    abrimos o seletor de arquivos do Android.
botaoSelecionar.addEventListener("click", () => {
    inputArquivo.click();
});


// 2. Quando o usuário escolher um arquivo,
//    este evento é executado.
inputArquivo.addEventListener("change", () => {

    const arquivo = inputArquivo.files[0];

    // Nenhum arquivo foi escolhido.
    if (!arquivo) {
        arquivoAtual = null;

        arquivoSelecionado.textContent =
            "Nenhum arquivo selecionado";

        botaoProcessar.disabled = true;

        return;
    }


    // 3. Verificamos se é XLSX ou XLS.
    const nome = arquivo.name.toLowerCase();

    const ehExcel =
        nome.endsWith(".xlsx") ||
        nome.endsWith(".xls");


    if (!ehExcel) {
        arquivoAtual = null;

        arquivoSelecionado.textContent =
            "Selecione um arquivo XLSX ou XLS.";

        botaoProcessar.disabled = true;

        return;
    }


    // 4. Guardamos o arquivo escolhido.
    arquivoAtual = arquivo;


    // 5. Mostramos o nome na tela.
    arquivoSelecionado.textContent =
        `Arquivo selecionado: ${arquivo.name}`;


    // 6. Agora o botão "Processar rota" pode ser usado.
    botaoProcessar.disabled = false;
});

botaoProcessar.addEventListener("click", async () => {
    if (!arquivoAtual) {
        return;
    }

    botaoProcessar.disabled = true;
    botaoSelecionar.disabled = true;

    try {
        arquivoSelecionado.textContent =
            `Processando: ${arquivoAtual.name}`;

        console.log("1 - arquivo selecionado");

        const arrayBuffer = await arquivoAtual.arrayBuffer();

        console.log("2 - arrayBuffer criado");

        const bytes = new Uint8Array(arrayBuffer);

        console.log("3 - Uint8Array criado");

        const resultado = await executar(bytes, {
            onProgress: ({ percentual, detalhe }) => {
                console.log("PROGRESSO:", percentual, detalhe);

                elementoStatus.textContent =
                    `${percentual}% — ${detalhe}`;
            }
        });

        const base64 = uint8ArrayParaBase64(resultado.arquivoSaida);

        const nomeSaida =
            `RouteFix_${arquivoAtual.name.replace(/\.(xlsx|xls)$/i, "")}.xlsx`;

        const arquivoSalvo = await FileSaver.saveXlsx({
            fileName: nomeSaida,
            data: base64
        });

        console.log("Arquivo salvo em Downloads:", arquivoSalvo);

        elementoStatus.textContent =
            `Concluído! ${resultado.pacotes} pacotes em ${resultado.paradas} paradas.`;

        console.log("Resultado RouteFix:", resultado);

    } catch (error) {

        console.error("Erro ao processar:", error);

        elementoStatus.textContent =
            `Erro: ${error?.message ?? error}`;

    } finally {

        botaoProcessar.disabled = false;
        botaoSelecionar.disabled = false;
    }
});