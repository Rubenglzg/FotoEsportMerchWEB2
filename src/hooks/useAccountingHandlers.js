export function useAccountingHandlers(updateClub, setConfirmation) {
    const toggleBatchPaymentStatus = (club, batchId, field) => {
        const currentLog = club.accountingLog || {};
        const batchLog = currentLog[batchId] || { 
            supplierPaid: false, clubPaid: false, commercialPaid: false, cashCollected: false 
        };
        
        const currentValue = batchLog[field];
        const newValue = !currentValue;
        const dateField = `${field}Date`;

        const newBatchLog = { 
            ...batchLog, 
            [field]: newValue,
            [dateField]: newValue ? new Date().toISOString() : null 
        };

        updateClub({
            ...club,
            accountingLog: { ...currentLog, [batchId]: newBatchLog }
        });
    };

    const handlePaymentChange = (club, batchId, field, currentStatus) => {
        const fieldLabels = {
            'cashCollected': 'Recogida de Efectivo',
            'supplierPaid': 'Pago a Proveedor',
            'commercialPaid': 'Pago a Comercial',
            'clubPaid': 'Pago al Club'
        };

        const action = currentStatus ? 'marcar como PENDIENTE' : 'marcar como COMPLETADO';
        const label = fieldLabels[field] || field;

        setConfirmation({
            title: "Confirmar Movimiento Contable",
            msg: `Vas a ${action} el concepto:\n\n👉 ${label}\nClub: ${club.name}\nLote: #${batchId}\n\n¿Confirmar cambio?`,
            onConfirm: () => toggleBatchPaymentStatus(club, batchId, field)
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