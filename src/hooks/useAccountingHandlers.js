export function useAccountingHandlers(updateClub, setConfirmation) {
    const toggleBatchPaymentStatus = (club, batchId, field, currentAmount) => {
        const currentLog = club.accountingLog || {};
        const batchLog = currentLog[batchId] || {};
        
        const currentValue = batchLog[field] || false;
        const amountField = `${field}Amount`;
        const dateField = `${field}Date`;

        const safeAmount = (typeof currentAmount === 'number' && !isNaN(currentAmount)) ? currentAmount : 0;
        
        // Recuperamos cuánto se pagó realmente la última vez
        let savedAmount = batchLog[amountField];
        if (currentValue && savedAmount === undefined) {
            savedAmount = safeAmount; 
        } else if (!savedAmount) {
            savedAmount = 0;
        }

        let newValue;
        let newAmount;

        // LÓGICA DE 3 ESTADOS
        if (!currentValue) {
            // 1. Estaba pendiente -> Paga el total actual
            newValue = true;
            newAmount = safeAmount;
        } else if (currentValue && safeAmount > savedAmount + 0.01) {
            // 2. Estaba pagado, pero han metido pedidos nuevos -> Paga el resto y actualiza el total
            newValue = true;
            newAmount = safeAmount;
        } else {
            // 3. Estaba pagado al 100% -> Lo revierte a Pendiente
            newValue = false;
            newAmount = null;
        }

        const newBatchLog = { 
            ...batchLog, 
            [field]: newValue,
            [dateField]: newValue ? new Date().toISOString() : null,
            [amountField]: newAmount 
        };

        // Limpiar undefined para Firebase
        Object.keys(newBatchLog).forEach(key => {
            if (newBatchLog[key] === undefined) newBatchLog[key] = null;
        });

        updateClub({
            ...club,
            accountingLog: { ...currentLog, [batchId]: newBatchLog }
        });
    };

    const handlePaymentChange = (club, batchId, field, currentStatus, currentAmount) => {
        const currentLog = club.accountingLog || {};
        const batchLog = currentLog[batchId] || {};
        const amountField = `${field}Amount`;
        
        let savedAmount = batchLog[amountField];
        if (currentStatus && savedAmount === undefined) savedAmount = currentAmount;
        else if (!savedAmount) savedAmount = 0;

        const safeAmount = (typeof currentAmount === 'number' && !isNaN(currentAmount)) ? currentAmount : 0;

        const fieldLabels = {
            'cashCollected': 'Recogida de Efectivo',
            'supplierPaid': 'Pago a Proveedor',
            'commercialPaid': 'Pago a Comercial',
            'clubPaid': 'Pago al Club'
        };

        const label = fieldLabels[field] || field;
        let actionMsg = "";

        if (!currentStatus) {
            actionMsg = `Vas a MARCAR COMO COMPLETADO:\n\n👉 ${label}\nLote: #${batchId}\nImporte a pagar: ${safeAmount.toFixed(2)}€`;
        } else if (currentStatus && safeAmount > savedAmount + 0.01) {
            const diff = safeAmount - savedAmount;
            actionMsg = `Vas a PAGAR LA DEUDA NUEVA de:\n\n👉 ${label}\nLote: #${batchId}\nYa estaba pagado: ${savedAmount.toFixed(2)}€\nNuevos pedidos: ${diff.toFixed(2)}€\n\nEl lote pasará a estar pagado al 100% de nuevo.`;
        } else {
            actionMsg = `Vas a REVERTIR A PENDIENTE:\n\n👉 ${label}\nLote: #${batchId}\n\nSe eliminará el pago de ${savedAmount.toFixed(2)}€.`;
        }

        setConfirmation({
            title: "Confirmar Movimiento Contable",
            msg: `${actionMsg}\n\n¿Confirmar?`,
            onConfirm: () => toggleBatchPaymentStatus(club, batchId, field, currentAmount)
        });
    };

    const updateBatchValue = (club, batchId, field, value) => {
        const currentLog = club.accountingLog || {};
        const batchLog = currentLog[batchId] || {};
        
        updateClub({
            ...club,
            accountingLog: {
                ...currentLog,
                [batchId]: { ...batchLog, [field]: parseFloat(value) || 0 }
            }
        });
    };

    return { handlePaymentChange, updateBatchValue };
}