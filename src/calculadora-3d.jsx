import React, { useState, useMemo } from "react";
import {
  Calculator,
  Cpu,
  Clock,
  Zap,
  Package,
  Wrench,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Layers,
  TrendingUp,
  AlertTriangle,
  ShoppingBag,
  FileText,
  Bookmark,
} from "lucide-react";

// Presets de Impressoras populares (foco na linha Bambu Lab + genéricas)
const PRINTER_PRESETS = [
  {
    id: "a1_mini",
    name: "Bambu Lab A1 Mini (c/ ou s/ AMS)",
    powerW: 110,
    machinePrice: 3391.02,
    lifespanHours: 5000,
    maintenancePct: 10,
  },
  {
    id: "a1_combo",
    name: "Bambu Lab A1 Combo",
    powerW: 130,
    machinePrice: 4600,
    lifespanHours: 5000,
    maintenancePct: 10,
  },
  {
    id: "p1s_combo",
    name: "Bambu Lab P1S Combo",
    powerW: 160,
    machinePrice: 7800,
    lifespanHours: 5000,
    maintenancePct: 10,
  },
  {
    id: "x1c",
    name: "Bambu Lab X1 Carbon",
    powerW: 180,
    machinePrice: 12500,
    lifespanHours: 5000,
    maintenancePct: 12,
  },
  {
    id: "custom",
    name: "Outra Impressora (Personalizado)",
    powerW: 120,
    machinePrice: 2500,
    lifespanHours: 5000,
    maintenancePct: 10,
  },
];

// Presets rápidos de insumos extras (chaveiros, switch, embalagem, etc.)
const QUICK_ACCESSORIES = [
  {
    name: "Argola + Corrente de Chaveiro",
    unitCost: 0.45,
    category: "Acessório",
  },
  {
    name: "Switch Mecânico (Clicker/Fidget)",
    unitCost: 1.5,
    category: "Componente",
  },
  {
    name: "Embalagem Completa (Caixa + Bolha + Adesivo)",
    unitCost: 2.2,
    category: "Embalagem",
  },
  {
    name: "Saquinho Zip / Organza + Tag",
    unitCost: 0.6,
    category: "Embalagem",
  },
  { name: "Ímã de Neodímio (unid.)", unitCost: 0.5, category: "Componente" },
  {
    name: "Cola / Acabamento / Lixa (uso médio)",
    unitCost: 0.8,
    category: "Insumo",
  },
  { name: "Brinde / Mimo para Cliente", unitCost: 0.75, category: "Embalagem" },
];

const copyTextSafe = async (text) => {
  let textarea;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // bloqueada por permissions policy: segue para o fallback
  }

  try {
    textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.setAttribute("data-copy-fallback", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea?.remove();
  }
};

export default function App() {
  // Identificação do Projeto
  const [projectName, setProjectName] = useState("");
  const [batchQuantity, setBatchQuantity] = useState(1); // Peças produzidas na mesma bandeja/lote

  // 1. MODO DE CÁLCULO DE FILAMENTO (Bambu Studio Direto vs Peso/Rolo)
  const [filamentMode, setFilamentMode] = useState("bambu"); // 'bambu' | 'weight'
  // Modo Bambu Studio Direto
  const [bambuCostValue, setBambuCostValue] = useState(""); // Valor exato R$ mostrado no fatiador
  const [bambuGramsInfo, setBambuGramsInfo] = useState(""); // Opcional: apenas informativo
  // Modo Tradicional (Peso + Preço do Kg)
  const [spoolPriceKg, setSpoolPriceKg] = useState(110);
  const [partWeightGrams, setPartWeightGrams] = useState("");
  const [purgeWeightGrams, setPurgeWeightGrams] = useState(""); // Torre de limpeza / Poop AMS

  // 2. TEMPO DE IMPRESSÃO, ENERGIA E MÁQUINA
  const [selectedPrinter, setSelectedPrinter] = useState("a1_mini");
  const [printHours, setPrintHours] = useState("");
  const [printMinutes, setPrintMinutes] = useState("");
  const [printSeconds, setPrintSeconds] = useState("");
  const [printerWatts, setPrinterWatts] = useState(110);
  const [kwhRate, setKwhRate] = useState(1.15); // Tarifa de energia R$/kWh
  const [machinePrice, setMachinePrice] = useState(3391.02);
  const [lifespanHours, setLifespanHours] = useState(5000);
  const [maintenancePct, setMaintenancePct] = useState(10); // % sobre depreciação (bicos, correias, PEI)
  const [failureRatePct, setFailureRatePct] = useState(15); // % margem de segurança de falha

  // 3. MÃO DE OBRA: PREPARO PRÉ E PÓS IMPRESSÃO
  const [laborHourlyRate, setLaborHourlyRate] = useState(10.0); // Valor da hora R$/h
  const [prePrintMinutes, setPrePrintMinutes] = useState(5); // Fatiar, pintar modelo 3MF, limpar PEI
  const [postPrintMinutes, setPostPrintMinutes] = useState(5); // Remover suporte, montar, embalar

  // 4. MATERIAIS EXTRAS, ACESSÓRIOS E EMBALAGEM
  const [extraItems, setExtraItems] = useState([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemCost, setNewItemCost] = useState("");

  // 5. PRECIFICAÇÃO, MARGEM E TAXAS DE MARKETPLACE
  const [pricingMethod, setPricingMethod] = useState("markup"); // 'markup' | 'margin' | 'manual'
  const [profitPercentage, setProfitPercentage] = useState(100); // Ex: 100% sobre custo (2x)
  const [manualPrice, setManualPrice] = useState("");

  // Taxas de Canais de Venda
  const [directTaxPct, setDirectTaxPct] = useState(0); // PIX / Direto (ou maquininha)
  const [shopeeTaxPct, setShopeeTaxPct] = useState(20); // Comissão Shopee padrão c/ frete grátis
  const [shopeeFixedFee, setShopeeFixedFee] = useState(4.0); // Taxa fixa por item na Shopee
  const [mlTaxPct, setMlTaxPct] = useState(16); // Mercado Livre
  const [mlFixedFee, setMlFixedFee] = useState(6.0); // Taxa fixa ML

  // Estados de interface
  const [copiedType, setCopiedType] = useState(null);
  const [savedHistory, setSavedHistory] = useState(() => {
    try {
      const history = window.localStorage.getItem("calc3d-saved-history");
      const parsedHistory = history ? JSON.parse(history) : [];
      return Array.isArray(parsedHistory) ? parsedHistory.slice(0, 10) : [];
    } catch {
      return [];
    }
  });
  const [savedQuote, setSavedQuote] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");
  const [manualCopyText, setManualCopyText] = useState(null);

  // Troca de preset de impressora
  const handlePrinterChange = (presetId) => {
    setSelectedPrinter(presetId);
    const found = PRINTER_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setPrinterWatts(found.powerW);
      setMachinePrice(found.machinePrice);
      setLifespanHours(found.lifespanHours);
      setMaintenancePct(found.maintenancePct);
    }
  };

  // Adicionar item extra via botão rápido
  const handleQuickAddAccessory = (acc) => {
    setExtraItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.name.toLowerCase() === acc.name.toLowerCase(),
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: Number(updated[existingIndex].qty) + 1,
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: Date.now() + Math.random(),
          name: acc.name,
          qty: 1,
          unitCost: acc.unitCost,
        },
      ];
    });
  };

  // Adicionar item extra personalizado
  const handleAddCustomItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const costNum = parseFloat(String(newItemCost).replace(",", ".")) || 0;
    const qtyNum = Math.max(1, parseFloat(newItemQty) || 1);

    setExtraItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: newItemName.trim(),
        qty: qtyNum,
        unitCost: costNum,
      },
    ]);
    setNewItemName("");
    setNewItemQty(1);
    setNewItemCost("");
  };

  const handleUpdateExtraItem = (id, field, value) => {
    setExtraItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === "name" ? value : Math.max(0, Number(value) || 0),
            }
          : item,
      ),
    );
  };

  const handleRemoveExtraItem = (id) => {
    setExtraItems((prev) => prev.filter((item) => item.id !== id));
  };

  // =========================================================================
  // CÁLCULOS PRINCIPAIS (100% REATIVOS)
  // =========================================================================
  const calculations = useMemo(() => {
    const validBatch = Math.max(1, Number(batchQuantity) || 1);

    // 1. Custo de Filamento
    let filamentCost = 0;
    if (filamentMode === "bambu") {
      filamentCost = Math.max(0, Number(bambuCostValue) || 0);
    } else {
      const totalGrams =
        Math.max(0, Number(partWeightGrams) || 0) +
        Math.max(0, Number(purgeWeightGrams) || 0);
      const pricePerGram = Math.max(0, Number(spoolPriceKg) || 0) / 1000;
      filamentCost = totalGrams * pricePerGram;
    }

    // 2. Tempo Total de Impressão em Horas
    const totalPrintHours =
      Math.max(0, Number(printHours) || 0) +
      Math.max(0, Number(printMinutes) || 0) / 60 +
      Math.max(0, Number(printSeconds) || 0) / 3600;

    // 3. Custo de Energia Elétrica: (Watts / 1000) * Horas * Tarifa kWh
    const kwhConsumed =
      (Math.max(0, Number(printerWatts) || 0) / 1000) * totalPrintHours;
    const energyCost = kwhConsumed * Math.max(0, Number(kwhRate) || 0);

    // 4. Depreciação + Manutenção da Máquina
    const validLifespan = Math.max(100, Number(lifespanHours) || 6000);
    const depreciationPerHour =
      Math.max(0, Number(machinePrice) || 0) / validLifespan;
    const maintenancePerHour =
      depreciationPerHour * (Math.max(0, Number(maintenancePct) || 0) / 100);
    const machineHourlyTotal = depreciationPerHour + maintenancePerHour;
    const machineCost = machineHourlyTotal * totalPrintHours;

    // 5. Taxa de Falha / Segurança (aplicada sobre Filamento + Energia + Máquina)
    const printBaseCost = filamentCost + energyCost + machineCost;
    const failureCost =
      printBaseCost * (Math.max(0, Number(failureRatePct) || 0) / 100);

    // 6. Custo de Mão de Obra (Pré e Pós-Impressão)
    const ratePerHour = Math.max(0, Number(laborHourlyRate) || 0);
    const prePrintCost =
      (Math.max(0, Number(prePrintMinutes) || 0) / 60) * ratePerHour;
    const postPrintCost =
      (Math.max(0, Number(postPrintMinutes) || 0) / 60) * ratePerHour;
    const totalLaborCost = prePrintCost + postPrintCost;

    // 7. Custo de Materiais Extras (Chaveiros, Switch, Embalagem, etc.)
    const extrasCost = extraItems.reduce(
      (acc, item) =>
        acc + (Number(item.qty) || 0) * (Number(item.unitCost) || 0),
      0,
    );

    // CUSTO TOTAL DO PROJETO / LOTE
    const totalProductionCost =
      filamentCost +
      energyCost +
      machineCost +
      failureCost +
      totalLaborCost +
      extrasCost;

    // CUSTO UNITÁRIO (Caso a bandeja tenha mais de 1 peça)
    const unitProductionCost = totalProductionCost / validBatch;

    // PRECIFICAÇÃO BASE (Venda Direta sem taxas de marketplace)
    let baseSellingPrice = 0;
    if (pricingMethod === "markup") {
      baseSellingPrice =
        totalProductionCost *
        (1 + Math.max(0, Number(profitPercentage) || 0) / 100);
    } else if (pricingMethod === "margin") {
      const marginDecimal = Math.min(
        0.95,
        Math.max(0, Number(profitPercentage) || 0) / 100,
      );
      baseSellingPrice = totalProductionCost / (1 - marginDecimal);
    } else {
      baseSellingPrice = Math.max(0, Number(manualPrice) || 0);
    }

    // Lucro Alvo Desejado (em R$)
    const targetNetProfit = baseSellingPrice - totalProductionCost;

    // Simulação Canal 1: Venda Direta (PIX / Cartão / Instagram / WhatsApp)
    const directFeeDecimal = Math.min(
      0.9,
      Math.max(0, Number(directTaxPct) || 0) / 100,
    );
    const directSuggestedPrice =
      pricingMethod === "manual"
        ? baseSellingPrice
        : (totalProductionCost + targetNetProfit) / (1 - directFeeDecimal);
    const directTaxAmount = directSuggestedPrice * directFeeDecimal;
    const directNetProfit =
      directSuggestedPrice - totalProductionCost - directTaxAmount;

    // Simulação Canal 2: Shopee (mantém o mesmo lucro líquido ou mostra a sobra no preço manual)
    const shopeeFeeDecimal = Math.min(
      0.9,
      Math.max(0, Number(shopeeTaxPct) || 0) / 100,
    );
    const shopeeFix = Math.max(0, Number(shopeeFixedFee) || 0);
    const shopeeSuggestedPrice =
      pricingMethod === "manual"
        ? baseSellingPrice
        : (totalProductionCost + targetNetProfit + shopeeFix) /
          (1 - shopeeFeeDecimal);
    const shopeeTaxAmount = shopeeSuggestedPrice * shopeeFeeDecimal + shopeeFix;
    const shopeeNetProfit =
      shopeeSuggestedPrice - totalProductionCost - shopeeTaxAmount;

    // Simulação Canal 3: Mercado Livre
    const mlFeeDecimal = Math.min(
      0.9,
      Math.max(0, Number(mlTaxPct) || 0) / 100,
    );
    const mlFix = Math.max(0, Number(mlFixedFee) || 0);
    const mlSuggestedPrice =
      pricingMethod === "manual"
        ? baseSellingPrice
        : (totalProductionCost + targetNetProfit + mlFix) / (1 - mlFeeDecimal);
    const mlTaxAmount = mlSuggestedPrice * mlFeeDecimal + mlFix;
    const mlNetProfit = mlSuggestedPrice - totalProductionCost - mlTaxAmount;

    // Porcentagens de cada categoria no custo total para o gráfico
    const safeTotal = totalProductionCost > 0 ? totalProductionCost : 1;
    const machineAndFailure = energyCost + machineCost + failureCost;
    const breakdown = [
      {
        label: "Filamento (Bambu Studio)",
        value: filamentCost,
        pct: (filamentCost / safeTotal) * 100,
        color: "bg-emerald-500",
      },
      {
        label: "Mão de Obra (Pré + Pós)",
        value: totalLaborCost,
        pct: (totalLaborCost / safeTotal) * 100,
        color: "bg-indigo-500",
      },
      {
        label: "Insumos & Embalagem",
        value: extrasCost,
        pct: (extrasCost / safeTotal) * 100,
        color: "bg-amber-500",
      },
      {
        label: "Energia + Máquina + Falha",
        value: machineAndFailure,
        pct: (machineAndFailure / safeTotal) * 100,
        color: "bg-cyan-500",
      },
    ];

    return {
      filamentCost,
      totalPrintHours,
      kwhConsumed,
      energyCost,
      depreciationPerHour,
      maintenancePerHour,
      machineHourlyTotal,
      machineCost,
      failureCost,
      prePrintCost,
      postPrintCost,
      totalLaborCost,
      extrasCost,
      totalProductionCost,
      unitProductionCost,
      validBatch,
      baseSellingPrice,
      targetNetProfit,
      directSuggestedPrice,
      directTaxAmount,
      directNetProfit,
      shopeeSuggestedPrice,
      shopeeTaxAmount,
      shopeeNetProfit,
      mlSuggestedPrice,
      mlTaxAmount,
      mlNetProfit,
      breakdown,
    };
  }, [
    batchQuantity,
    filamentMode,
    bambuCostValue,
    spoolPriceKg,
    partWeightGrams,
    purgeWeightGrams,
    printHours,
    printMinutes,
    printSeconds,
    printerWatts,
    kwhRate,
    machinePrice,
    lifespanHours,
    maintenancePct,
    failureRatePct,
    laborHourlyRate,
    prePrintMinutes,
    postPrintMinutes,
    extraItems,
    pricingMethod,
    profitPercentage,
    manualPrice,
    directTaxPct,
    shopeeTaxPct,
    shopeeFixedFee,
    mlTaxPct,
    mlFixedFee,
  ]);

  // Formatador de Moeda Real (BRL)
  const formatBRL = (val) => {
    return Number(val || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // Salvar cálculo no histórico comparativo do navegador
  const handleSaveQuote = () => {
    const newEntry = {
      id: Date.now(),
      name: projectName || "Peça 3D sem nome",
      cost: calculations.totalProductionCost,
      directPrice: calculations.directSuggestedPrice,
      shopeePrice: calculations.shopeeSuggestedPrice,
      profit: calculations.directNetProfit,
      time: `${printHours}h ${printMinutes}min ${Number(printSeconds) || 0}s`,
      settings: {
        projectName,
        batchQuantity,
        filamentMode,
        bambuCostValue,
        bambuGramsInfo,
        spoolPriceKg,
        partWeightGrams,
        purgeWeightGrams,
        selectedPrinter,
        printHours,
        printMinutes,
        printSeconds,
        printerWatts,
        kwhRate,
        machinePrice,
        lifespanHours,
        maintenancePct,
        failureRatePct,
        laborHourlyRate,
        prePrintMinutes,
        postPrintMinutes,
        extraItems: extraItems.map((item) => ({ ...item })),
        pricingMethod,
        profitPercentage,
        manualPrice,
        directTaxPct,
        shopeeTaxPct,
        shopeeFixedFee,
        mlTaxPct,
        mlFixedFee,
      },
    };
    const nextHistory = [newEntry, ...savedHistory].slice(0, 10);
    setSavedHistory(nextHistory);
    setSavedQuote(true);
    setTimeout(() => setSavedQuote(false), 2500);

    try {
      window.localStorage.setItem(
        "calc3d-saved-history",
        JSON.stringify(nextHistory),
      );
      setHistoryError("");
      setHistoryStatus("");
    } catch {
      setHistoryError(
        "Peça salva nesta sessão, mas não foi possível persistir o histórico neste navegador.",
      );
    }
  };

  const handleLoadQuote = (item) => {
    if (!item.settings) {
      setHistoryStatus(
        "Esta peça foi salva numa versão anterior e não tem os dados completos. Reconfigure-a e salve novamente.",
      );
      return;
    }

    const settings = item.settings;
    setProjectName(settings.projectName);
    setBatchQuantity(settings.batchQuantity);
    setFilamentMode(settings.filamentMode);
    setBambuCostValue(settings.bambuCostValue);
    setBambuGramsInfo(settings.bambuGramsInfo);
    setSpoolPriceKg(settings.spoolPriceKg);
    setPartWeightGrams(settings.partWeightGrams);
    setPurgeWeightGrams(settings.purgeWeightGrams);
    setSelectedPrinter(settings.selectedPrinter);
    setPrintHours(settings.printHours);
    setPrintMinutes(settings.printMinutes);
    setPrintSeconds(settings.printSeconds ?? "");
    setPrinterWatts(settings.printerWatts);
    setKwhRate(settings.kwhRate);
    setMachinePrice(settings.machinePrice);
    setLifespanHours(settings.lifespanHours);
    setMaintenancePct(settings.maintenancePct);
    setFailureRatePct(settings.failureRatePct);
    setLaborHourlyRate(settings.laborHourlyRate);
    setPrePrintMinutes(settings.prePrintMinutes);
    setPostPrintMinutes(settings.postPrintMinutes);
    setExtraItems(settings.extraItems.map((extraItem) => ({ ...extraItem })));
    setPricingMethod(settings.pricingMethod);
    setProfitPercentage(settings.profitPercentage);
    setManualPrice(settings.manualPrice);
    setDirectTaxPct(settings.directTaxPct);
    setShopeeTaxPct(settings.shopeeTaxPct);
    setShopeeFixedFee(settings.shopeeFixedFee);
    setMlTaxPct(settings.mlTaxPct);
    setMlFixedFee(settings.mlFixedFee);
    setNewItemName("");
    setNewItemQty(1);
    setNewItemCost("");
    setHistoryStatus(`Peça carregada: ${item.name}`);
    setHistoryError("");
  };

  const handleClearHistory = () => {
    setSavedHistory([]);
    try {
      window.localStorage.removeItem("calc3d-saved-history");
      setHistoryError("");
      setHistoryStatus("");
    } catch {
      setHistoryError(
        "Não foi possível limpar o histórico salvo neste navegador.",
      );
    }
  };

  const handleDeleteQuote = (quoteId) => {
    const nextHistory = savedHistory.filter((item) => item.id !== quoteId);
    setSavedHistory(nextHistory);
    try {
      if (nextHistory.length > 0) {
        window.localStorage.setItem(
          "calc3d-saved-history",
          JSON.stringify(nextHistory),
        );
      } else {
        window.localStorage.removeItem("calc3d-saved-history");
      }
      setHistoryError("");
    } catch {
      setHistoryError(
        "A peça foi removida desta sessão, mas não foi possível atualizar o histórico salvo no navegador.",
      );
    }
  };

  // Copiar orçamento para WhatsApp / Área de transferência
  const handleCopySummary = async (type) => {
    let text = "";
    if (type === "client") {
      text =
        `✨ *ORÇAMENTO DE IMPRESSÃO 3D* ✨\n` +
        `📌 *Projeto:* ${projectName}\n` +
        (calculations.validBatch > 1
          ? `📦 *Quantidade:* ${calculations.validBatch} unidades\n`
          : "") +
        `⏱️ *Produção de Alta Precisão (Bambu Lab)*\n\n` +
        `💰 *Valor à vista (PIX/Direto):* ${formatBRL(calculations.directSuggestedPrice)}\n` +
        (calculations.validBatch > 1
          ? `🔹 *Valor por unidade:* ${formatBRL(
              calculations.directSuggestedPrice / calculations.validBatch,
            )}\n`
          : "") +
        `🛒 *Valor via Shopee:* ${formatBRL(calculations.shopeeSuggestedPrice)}\n` +
        `🛍️ *Valor via Mercado Livre:* ${formatBRL(calculations.mlSuggestedPrice)}\n\n` +
        `✅ *Incluso:* Acabamento completo e embalagem reforçada.`;
    } else {
      text =
        `📊 *RELATÓRIO INTERNO DE CUSTOS - CALC3D PRO*\n` +
        `Projeto: ${projectName} (${calculations.validBatch} un)\n` +
        `----------------------------------\n` +
        `• Filamento (${filamentMode === "bambu" ? "Bambu Studio" : "Peso"}): ${formatBRL(calculations.filamentCost)}\n` +
        `• Energia (${printHours}h${printMinutes}m${Number(printSeconds) || 0}s): ${formatBRL(calculations.energyCost)}\n` +
        `• Máquina + Manutenção: ${formatBRL(calculations.machineCost)}\n` +
        `• Margem de Falha (${failureRatePct}%): ${formatBRL(calculations.failureCost)}\n` +
        `• Mão de Obra Pré (${prePrintMinutes} min): ${formatBRL(calculations.prePrintCost)}\n` +
        `• Mão de Obra Pós (${postPrintMinutes} min): ${formatBRL(calculations.postPrintCost)}\n` +
        `• Materiais Extras/Embalagem: ${formatBRL(calculations.extrasCost)}\n` +
        `----------------------------------\n` +
        `🔴 *CUSTO TOTAL DE PRODUÇÃO:* ${formatBRL(calculations.totalProductionCost)}\n` +
        `🟢 *PREÇO VENDA DIRETA:* ${formatBRL(calculations.directSuggestedPrice)} (Lucro: ${formatBRL(calculations.directNetProfit)})\n` +
        `🟠 *PREÇO SHOPEE:* ${formatBRL(calculations.shopeeSuggestedPrice)} (Lucro: ${formatBRL(calculations.shopeeNetProfit)})`;
    }

    const ok = await copyTextSafe(text);
    if (ok) {
      setManualCopyText(null);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    } else {
      // Último recurso: mostra o texto para copiar manualmente
      setManualCopyText(text);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* HEADER SUPERIOR */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Calculator className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Calc3D <span className="text-emerald-400">Studio Pro</span>
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full">
                  <Sparkles className="w-3 h-3" /> Bambu Lab Edition
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Calculadora de Custo Direto do Bambu Studio, Pré/Pós-Impressão e
                Insumos
              </p>
            </div>
          </div>

          {/* Resumo Rápido no Topo em Telas Médias/Grandes */}
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="text-right">
              <span className="block text-[10px] uppercase tracking-wider text-slate-400">
                Custo Total
              </span>
              <span className="text-sm sm:text-base font-bold text-rose-400">
                {formatBRL(calculations.totalProductionCost)}
              </span>
            </div>
            <div className="h-7 w-px bg-slate-800" />
            <div className="text-right">
              <span className="block text-[10px] uppercase tracking-wider text-slate-400">
                Venda Sugerida
              </span>
              <span className="text-sm sm:text-lg font-extrabold text-emerald-400">
                {formatBRL(calculations.directSuggestedPrice)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* BARRA DE NOME DO PROJETO E TAMANHO DO LOTE */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-6 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-8">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Nome da Peça / Projeto
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Ex: Chaveiro Articulado + Switch Mecânico"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition"
              />
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Qtd. de Peças na Bandeja/Lote
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={batchQuantity}
                  onChange={(e) => setBatchQuantity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none transition"
                />
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  unid. no cálculo
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUNA ESQUERDA: INPUTS PASSO A PASSO (7 Colunas) */}
          <div className="lg:col-span-7 space-y-6">
            {/* PASSO 1: CUSTO DO FILAMENTO (MODO BAMBU STUDIO OU PESO) */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      1. Custo de Filamento
                    </h2>
                    <p className="text-xs text-slate-400">
                      Insira direto o custo do Bambu Studio ou calcule por peso
                      do rolo
                    </p>
                  </div>
                </div>

                {/* Seletor de Modo: Direto Bambu Studio vs Por Peso */}
                <div className="inline-flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setFilamentMode("bambu")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                      filamentMode === "bambu"
                        ? "bg-emerald-500 text-slate-950 shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Valor Bambu Studio
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilamentMode("weight")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      filamentMode === "weight"
                        ? "bg-emerald-500 text-slate-950 shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Por Peso (g / Kg)
                  </button>
                </div>
              </div>

              {filamentMode === "bambu" ? (
                <div className="space-y-4">
                  <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-emerald-300">
                          Custo Total fornecido pelo Bambu Studio (R$)
                        </label>
                        <p className="text-xs text-slate-400">
                          Após fatiar a peça no Bambu Studio, digite aqui o
                          valor de custo (&ldquo;Cost&rdquo;) que aparece no
                          resumo da bandeja (já inclui peça + suporte + purga do
                          AMS).
                        </p>
                      </div>
                      <div className="relative sm:w-48 shrink-0">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-400">
                          R$
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={bambuCostValue}
                          onChange={(e) => setBambuCostValue(e.target.value)}
                          className="w-full bg-slate-950 border-2 border-emerald-500/60 focus:border-emerald-400 rounded-xl pl-10 pr-4 py-3 text-lg font-extrabold text-white outline-none transition"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span>
                        Peso estimado no fatiador (opcional/informativo):
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={bambuGramsInfo}
                        onChange={(e) => setBambuGramsInfo(e.target.value)}
                        className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white text-xs"
                      />
                      <span>g</span>
                    </div>
                    <span className="font-semibold text-emerald-400">
                      Subtotal Filamento: {formatBRL(calculations.filamentCost)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Preço do Rolo 1Kg (R$)
                    </label>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={spoolPriceKg}
                      onChange={(e) => setSpoolPriceKg(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Peso da Peça (gramas)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={partWeightGrams}
                      onChange={(e) => setPartWeightGrams(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Purga AMS / Suporte (g)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={purgeWeightGrams}
                      onChange={(e) => setPurgeWeightGrams(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    />
                  </div>
                </div>
              )}
            </section>

            {/* PASSO 2: MÃO DE OBRA PRÉ E PÓS IMPRESSÃO (R$/H) */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
              <div className="flex items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      2. Preparo Pré e Pós-Impressão (Mão de Obra)
                    </h2>
                    <p className="text-xs text-slate-400">
                      Seu valor/hora proporcional ao tempo gasto antes e depois
                      da impressão
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">
                    Subtotal Mão de Obra
                  </span>
                  <span className="text-sm font-bold text-indigo-400">
                    {formatBRL(calculations.totalLaborCost)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5">
                  <label className="block text-xs font-semibold text-indigo-300 mb-1">
                    Valor da sua Hora (R$/h)
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Quanto vale 1 hora do seu trabalho manual
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      R$
                    </span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={laborHourlyRate}
                      onChange={(e) => setLaborHourlyRate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-lg pl-8 pr-3 py-2 text-sm font-bold text-white outline-none"
                    />
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-200">
                      Tempo Pré-Impressão
                    </label>
                    <span className="text-xs font-bold text-indigo-400">
                      {formatBRL(calculations.prePrintCost)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Fatiar no Bambu Studio, pintar cores, limpar PEI
                  </p>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={prePrintMinutes}
                      onChange={(e) => setPrePrintMinutes(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 pr-12 py-2 text-sm font-bold text-white outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      min
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-200">
                      Tempo Pós-Impressão
                    </label>
                    <span className="text-xs font-bold text-indigo-400">
                      {formatBRL(calculations.postPrintCost)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Tirar suporte, montar argola/switch, embalar
                  </p>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={postPrintMinutes}
                      onChange={(e) => setPostPrintMinutes(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 pr-12 py-2 text-sm font-bold text-white outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      min
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* PASSO 3: MATERIAIS EXTRAS, CHAVEIROS, SWITCH, EMBALAGEM */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
              <div className="flex items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      3. Materiais Extras, Acessórios e Embalagem
                    </h2>
                    <p className="text-xs text-slate-400">
                      Adicione argolas de chaveiro, switches, ímãs, caixas,
                      saquinhos, cola, etc.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">
                    Subtotal Extras
                  </span>
                  <span className="text-sm font-bold text-amber-400">
                    {formatBRL(calculations.extrasCost)}
                  </span>
                </div>
              </div>

              {/* Botões Rápidos de Adição (Presets) */}
              <div className="mb-4">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Adicionar Rápido com 1 Clique:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ACCESSORIES.map((acc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickAddAccessory(acc)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-slate-950 hover:bg-amber-500/15 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 transition"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      <span>{acc.name}</span>
                      <span className="text-[10px] text-slate-500">
                        ({formatBRL(acc.unitCost)})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista de Itens Extras Adicionados */}
              <div className="space-y-2.5 mb-4">
                {extraItems.length === 0 ? (
                  <div className="text-center py-6 bg-slate-950/50 rounded-xl border border-dashed border-slate-800 text-xs text-slate-500">
                    Nenhum material extra ou embalagem adicionado. Clique nos
                    atalhos acima ou cadastre abaixo.
                  </div>
                ) : (
                  extraItems.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 gap-2 items-center bg-slate-950 border border-slate-800/90 rounded-xl p-2.5"
                    >
                      <div className="col-span-12 sm:col-span-6">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) =>
                            handleUpdateExtraItem(
                              item.id,
                              "name",
                              e.target.value,
                            )
                          }
                          className="w-full bg-transparent text-xs sm:text-sm text-white font-medium focus:outline-none border-b border-transparent focus:border-amber-500 px-1"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                          <span className="text-[10px] text-slate-400 mr-1">
                            Qtd:
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.qty}
                            onChange={(e) =>
                              handleUpdateExtraItem(
                                item.id,
                                "qty",
                                e.target.value,
                              )
                            }
                            className="w-full bg-transparent text-xs text-white font-semibold outline-none text-center"
                          />
                        </div>
                      </div>
                      <div className="col-span-5 sm:col-span-3">
                        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                          <span className="text-[10px] text-slate-400 mr-1">
                            R$ un:
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.05"
                            value={item.unitCost}
                            onChange={(e) =>
                              handleUpdateExtraItem(
                                item.id,
                                "unitCost",
                                e.target.value,
                              )
                            }
                            className="w-full bg-transparent text-xs text-amber-300 font-semibold outline-none"
                          />
                        </div>
                      </div>
                      <div className="col-span-3 sm:col-span-1 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveExtraItem(item.id)}
                          title="Remover item"
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Formulário para Adicionar Novo Material Personalizado */}
              <form
                onSubmit={handleAddCustomItem}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-slate-800/80"
              >
                <input
                  type="text"
                  placeholder="Outro item (Ex: Parafuso M3, Fita Dupla Face...)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="sm:col-span-6 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Qtd"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                  className="sm:col-span-2 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Valor Un. R$"
                  value={newItemCost}
                  onChange={(e) => setNewItemCost(e.target.value)}
                  className="sm:col-span-2 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
                <button
                  type="submit"
                  className="sm:col-span-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl px-3 py-2 flex items-center justify-center gap-1 transition"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </form>
            </section>

            {/* PASSO 4: TEMPO DE IMPRESSÃO, ENERGIA E DESGASTE DA MÁQUINA */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      4. Tempo de Máquina, Energia e Depreciação
                    </h2>
                    <p className="text-xs text-slate-400">
                      Tempo de impressão da bandeja, gasto elétrico e vida útil
                      da impressora
                    </p>
                  </div>
                </div>

                <select
                  value={selectedPrinter}
                  onChange={(e) => handlePrinterChange(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-cyan-300 font-semibold rounded-xl px-3 py-2 outline-none focus:border-cyan-500"
                >
                  {PRINTER_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tempo de Impressão */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="sm:col-span-1 bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <label className="block text-xs font-semibold text-cyan-300 mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Tempo de Impressão
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={printHours}
                          onChange={(e) => setPrintHours(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm font-bold text-white outline-none"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                          h
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={printMinutes}
                          onChange={(e) => setPrintMinutes(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm font-bold text-white outline-none"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                          min
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={printSeconds}
                          onChange={(e) => setPrintSeconds(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm font-bold text-white outline-none"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                          seg
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Energia Elétrica */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-yellow-400" /> Energia
                    </label>
                    <span className="text-xs font-bold text-cyan-400">
                      {formatBRL(calculations.energyCost)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">
                        Consumo (W)
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={printerWatts}
                        onChange={(e) => setPrinterWatts(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 mb-0.5">
                        Tarifa R$/kWh
                      </span>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        value={kwhRate}
                        onChange={(e) => setKwhRate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Taxa de Falha */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />{" "}
                      Taxa de Falha
                    </label>
                    <span className="text-xs font-bold text-rose-400">
                      {formatBRL(calculations.failureCost)}
                    </span>
                  </div>
                  <span className="block text-[10px] text-slate-400 mb-1">
                    Margem de segurança p/ erros (%)
                  </span>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={failureRatePct}
                      onChange={(e) => setFailureRatePct(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white outline-none"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Depreciação e Manutenção */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/70 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Valor da Impressora (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={machinePrice}
                    onChange={(e) => setMachinePrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Vida Útil Estimada (Horas)
                  </label>
                  <input
                    type="number"
                    min="100"
                    value={lifespanHours}
                    onChange={(e) => setLifespanHours(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Custo Hora de Máquina:{" "}
                    <strong className="text-cyan-400">
                      {formatBRL(calculations.machineHourlyTotal)}/h
                    </strong>
                  </label>
                  <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-300 flex justify-between">
                    <span>Nesta peça:</span>
                    <strong className="text-white">
                      {formatBRL(calculations.machineCost)}
                    </strong>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* COLUNA DIREITA: PRECIFICAÇÃO, CANAIS DE VENDA E RESUMO (5 Colunas) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
            {/* PAINEL DE MARGEM DE LUCRO E RESULTADO */}
            <section className="bg-gradient-to-b from-slate-900 to-slate-900/95 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">
                      5. Margem de Lucro e Preço Final
                    </h2>
                    <p className="text-xs text-slate-400">
                      Defina seu lucro e compare preços nos canais
                    </p>
                  </div>
                </div>
              </div>

              {/* Abas de Método de Precificação */}
              <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 mb-4">
                <button
                  type="button"
                  onClick={() => setPricingMethod("markup")}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold transition ${
                    pricingMethod === "markup"
                      ? "bg-emerald-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Markup (% Custo)
                </button>
                <button
                  type="button"
                  onClick={() => setPricingMethod("margin")}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold transition ${
                    pricingMethod === "margin"
                      ? "bg-emerald-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Margem Real (%)
                </button>
                <button
                  type="button"
                  onClick={() => setPricingMethod("manual")}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold transition ${
                    pricingMethod === "manual"
                      ? "bg-emerald-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Preço Fixo R$
                </button>
              </div>

              {/* Controle de Margem ou Preço Manual */}
              {pricingMethod !== "manual" ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300">
                      {pricingMethod === "markup"
                        ? "Porcentagem de Lucro sobre o Custo:"
                        : "Margem de Lucro sobre a Venda (Máx 90%):"}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max={pricingMethod === "margin" ? 90 : 1000}
                        value={profitPercentage}
                        onChange={(e) => setProfitPercentage(e.target.value)}
                        className="w-20 bg-slate-900 border border-emerald-500/50 rounded-lg px-2 py-1 text-right text-sm font-extrabold text-emerald-400 outline-none"
                      />
                      <span className="text-sm font-bold text-emerald-400">
                        %
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={pricingMethod === "margin" ? 85 : 300}
                    step="5"
                    value={profitPercentage}
                    onChange={(e) => setProfitPercentage(e.target.value)}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <button
                      type="button"
                      onClick={() => setProfitPercentage(50)}
                      className="hover:text-emerald-400"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfitPercentage(100)}
                      className="hover:text-emerald-400"
                    >
                      100% (2x)
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfitPercentage(150)}
                      className="hover:text-emerald-400"
                    >
                      150% (2.5x)
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfitPercentage(200)}
                      className="hover:text-emerald-400"
                    >
                      200% (3x)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-5">
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Digite o Preço de Venda que deseja praticar (R$):
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    className="w-full bg-slate-900 border border-emerald-500 rounded-xl px-4 py-2.5 text-lg font-extrabold text-emerald-400 outline-none"
                  />
                </div>
              )}

              {/* RESUMO DO CUSTO TOTAL DE PRODUÇÃO + BARRA DE COMPOSIÇÃO */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-5">
                <div className="flex items-baseline justify-between mb-2">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                      Custo Total de Produção
                    </span>
                    {calculations.validBatch > 1 && (
                      <span className="text-[11px] text-slate-400">
                        ({formatBRL(calculations.unitProductionCost)} por
                        unidade no lote de {calculations.validBatch})
                      </span>
                    )}
                  </div>
                  <span className="text-xl font-black text-rose-400">
                    {formatBRL(calculations.totalProductionCost)}
                  </span>
                </div>

                {/* Barra Visual de Composição do Custo */}
                <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden flex my-3">
                  {calculations.breakdown.map((b, i) => (
                    <div
                      key={i}
                      style={{ width: `${Math.max(0, b.pct)}%` }}
                      className={`${b.color} transition-all duration-300`}
                      title={`${b.label}: ${formatBRL(b.value)}`}
                    />
                  ))}
                </div>

                {/* Detalhamento linha a linha */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  {calculations.breakdown.map((b, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-slate-900/60 px-2.5 py-1.5 rounded-lg"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${b.color}`}
                        />
                        <span className="text-slate-300 truncate text-[11px]">
                          {b.label}
                        </span>
                      </div>
                      <span className="font-bold text-slate-200 ml-1 text-[11px]">
                        {formatBRL(b.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SIMULADOR DE PREÇOS POR CANAL DE VENDA */}
              <div className="space-y-3 mb-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Preços Sugeridos por Canal de Venda
                </h3>

                {/* 1. Venda Direta (PIX / WhatsApp / Instagram) */}
                <div className="bg-emerald-950/20 border-2 border-emerald-500/40 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                      Venda Direta (PIX / Insta / Whats)
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <span>Taxa:</span>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        step="0.5"
                        value={directTaxPct}
                        onChange={(e) => setDirectTaxPct(e.target.value)}
                        className="w-12 bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-center text-white"
                      />
                      <span>%</span>
                    </div>
                  </div>
                  <div className="flex items-end justify-between mt-2">
                    <div>
                      <span className="text-2xl font-black text-white">
                        {formatBRL(calculations.directSuggestedPrice)}
                      </span>
                      {calculations.validBatch > 1 && (
                        <span className="block text-xs text-emerald-300 font-semibold">
                          {formatBRL(
                            calculations.directSuggestedPrice /
                              calculations.validBatch,
                          )}{" "}
                          / cada unid.
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">
                        Lucro Líquido Limpo
                      </span>
                      <span className="text-sm font-extrabold text-emerald-400">
                        + {formatBRL(calculations.directNetProfit)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Shopee */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5" /> Shopee (Comissão +
                      Taxa Fixa)
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={shopeeTaxPct}
                        onChange={(e) => setShopeeTaxPct(e.target.value)}
                        className="w-11 bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-center text-white"
                      />
                      <span>% + R$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={shopeeFixedFee}
                        onChange={(e) => setShopeeFixedFee(e.target.value)}
                        className="w-12 bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-center text-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-lg font-extrabold text-orange-300">
                        {formatBRL(calculations.shopeeSuggestedPrice)}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        Taxas Shopee: {formatBRL(calculations.shopeeTaxAmount)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">
                        Seu Lucro Líquido
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          calculations.shopeeNetProfit >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {formatBRL(calculations.shopeeNetProfit)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Mercado Livre */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
                      Mercado Livre
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={mlTaxPct}
                        onChange={(e) => setMlTaxPct(e.target.value)}
                        className="w-11 bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-center text-white"
                      />
                      <span>% + R$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={mlFixedFee}
                        onChange={(e) => setMlFixedFee(e.target.value)}
                        className="w-12 bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-center text-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-lg font-extrabold text-yellow-300">
                        {formatBRL(calculations.mlSuggestedPrice)}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        Taxas ML: {formatBRL(calculations.mlTaxAmount)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">
                        Seu Lucro Líquido
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          calculations.mlNetProfit >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {formatBRL(calculations.mlNetProfit)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO: COPIAR RESUMO E SALVAR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleCopySummary("client")}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 transition"
                >
                  {copiedType === "client" ? (
                    <>
                      <Check className="w-4 h-4" /> Orçamento Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copiar p/ Cliente (WhatsApp)
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleCopySummary("internal")}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition"
                >
                  {copiedType === "internal" ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" /> Relatório
                      Copiado!
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" /> Copiar Relatório Interno
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveQuote}
                className="w-full mt-2.5 bg-slate-950 hover:bg-slate-800/80 text-slate-300 border border-slate-800 font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition"
              >
                {savedQuote ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Peça
                    salva no histórico!
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5 text-emerald-400" /> Salvar
                    Peça no Histórico Comparativo
                  </>
                )}
              </button>
              {historyError && (
                <p role="status" className="mt-2 text-xs text-amber-300">
                  {historyError}
                </p>
              )}

              {manualCopyText && (
                <div className="mt-3 bg-slate-950 border border-amber-500/40 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-amber-300">
                      Não foi possível copiar automaticamente. Selecione e copie
                      (Ctrl+C):
                    </span>
                    <button
                      type="button"
                      onClick={() => setManualCopyText(null)}
                      className="text-[11px] text-slate-400 hover:text-white"
                    >
                      Fechar
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={manualCopyText}
                    onFocus={(e) => e.target.select()}
                    rows={8}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 outline-none resize-none"
                  />
                </div>
              )}
            </section>

            {/* HISTÓRICO DE CÁLCULOS SALVOS NA SESSÃO */}
            {savedHistory.length > 0 && (
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Peças Salvas para Comparação ({savedHistory.length})
                  </h3>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="text-[11px] text-slate-500 hover:text-rose-400"
                  >
                    Limpar lista
                  </button>
                </div>
                {historyStatus && (
                  <p role="status" className="mb-3 text-xs text-emerald-300">
                    {historyStatus}
                  </p>
                )}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {savedHistory.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center gap-3 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => handleLoadQuote(item)}
                        className="min-w-0 flex-1 text-left flex items-center justify-between gap-2 rounded-lg hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 p-1 transition"
                        aria-label={`Carregar peça ${item.name}`}
                      >
                        <span className="min-w-0">
                          <span className="font-bold text-white block truncate">
                            {item.name}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Custo: {formatBRL(item.cost)} • Tempo: {item.time}
                          </span>
                          <span className="block text-[10px] text-slate-500 mt-1">
                            Clique para carregar
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="font-bold text-emerald-400 block">
                            Venda: {formatBRL(item.directPrice)}
                          </span>
                          <span className="text-[11px] text-orange-300">
                            Shopee: {formatBRL(item.shopeePrice)}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuote(item.id)}
                        className="shrink-0 rounded-lg p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 transition"
                        aria-label={`Excluir peça ${item.name}`}
                        title={`Excluir ${item.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
