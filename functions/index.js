const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentUpdated, onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const ExcelJS = require('exceljs');

admin.initializeApp();
const db = admin.firestore();

// 1. Notificar por email cuando el admin contesta (Versión V2)
exports.onTicketReply = onDocumentUpdated("incidents/{ticketId}", async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();
    const ticketId = event.params.ticketId;

    if (!newData) return;

    if (newData.adminReply && newData.adminReply !== oldData.adminReply) {
        await db.collection("mail").add({
            to: [newData.userEmail],
            message: {
                subject: `Nueva respuesta en tu incidencia #${newData.orderId}`,
                text: `Respuesta: ${newData.adminReply}`,
                html: `<p>Hemos respondido a tu incidencia:</p>
                       <blockquote style="background:#f9f9f9; padding:10px;">${newData.adminReply}</blockquote>
                       <p>Entra en la web para contestar o cerrar el caso.</p>`
            }
        });
    }
});

// 2. CRON DIARIO: Cerrar tickets resueltos tras 7 días (Versión V2)
exports.autoCloseTickets = onSchedule("every 24 hours", async (event) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const snapshot = await db.collection('incidents')
        .where('status', '==', 'resolved_pending')
        .where('resolvedAt', '<=', sevenDaysAgo.toISOString())
        .get();

    const batch = db.batch();
    snapshot.forEach(doc => {
        batch.update(doc.ref, {
            status: 'closed',
            closedAt: new Date().toISOString()
        });
    });

    await batch.commit();
    console.log(`Cerrados ${snapshot.size} tickets automáticamente.`);
});

// 3. CRON DIARIO: Borrar datos tras 30 días (Versión V2 - OPTIMIZADA CON BATCH)
exports.deleteOldIncidents = onSchedule("every 24 hours", async (event) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const snapshot = await db.collection('incidents')
        .where('status', '==', 'closed')
        .where('closedAt', '<=', thirtyDaysAgo.toISOString())
        .get();

    if (snapshot.empty) return;

    const bucket = admin.storage().bucket();
    const batch = db.batch(); // Iniciar lote de borrado
    
    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.orderId) {
            try {
                await bucket.deleteFiles({ prefix: `incidents/${data.orderId}/` });
            } catch (e) {
                console.log("Error borrando archivos:", e.message);
            }
        }
        batch.delete(doc.ref); // Añadir al lote en lugar de borrar uno a uno
    }
    
    await batch.commit(); // Borrar todos de golpe
    console.log(`Eliminados ${snapshot.size} tickets antiguos.`);
});

// 4. ENVÍO DE EMAIL MASIVO (Marketing)
exports.sendMassEmail = onCall(async (request) => {
    // PROTECCIÓN EXTRA: Solo acepta peticiones de la web oficial
    if (request.app === undefined) {
        throw new HttpsError("failed-precondition", "La petición no proviene de la App Oficial.");
    }

    const { emails, subject, html } = request.data;

    // Verificación de seguridad básica
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Debes estar autenticado como administrador para enviar correos.");
    }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
        throw new HttpsError("invalid-argument", "No hay destinatarios válidos.");
    }

    if (!subject || !html) {
        throw new HttpsError("invalid-argument", "Falta el asunto o el contenido HTML.");
    }

    try {
        // CORREGIDO: En tu código original esto enviaba un email de "RGPD" a userData.email (que no existía).
        await db.collection("mail").add({
            to: emails, 
            message: {
                subject: subject,
                html: html
            }
        });

        console.log(`Campaña de email encolada para ${emails.length} destinatarios.`);
        return { success: true, count: emails.length };
    } catch (error) {
        console.error("Error enviando email masivo:", error);
        throw new HttpsError("internal", "Error al encolar los correos en la base de datos.");
    }
});

// 5. CRON DIARIO: Borrar emails de la base de datos tras 90 días
exports.deleteOldEmails = onSchedule("every 24 hours", async (event) => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // La extensión de correos de Firebase guarda la fecha en formato Timestamp dentro de 'delivery.endTime'
    const snapshot = await db.collection('mail')
        .where('delivery.endTime', '<=', admin.firestore.Timestamp.fromDate(ninetyDaysAgo))
        .get();

    if (snapshot.empty) {
        console.log("No hay correos antiguos para borrar hoy.");
        return;
    }

    // Usamos un batch para borrar en bloque (es más rápido y consume menos recursos)
    const batch = db.batch();
    snapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Limpieza completada: Eliminados ${snapshot.size} emails con más de 90 días de antigüedad.`);
});

// 6. ENVIAR EMAIL CUANDO UN CLUB RELLENA EL FORMULARIO DE CONTACTO
exports.onClubRequestCreated = onDocumentCreated("club_requests/{requestId}", async (event) => {
    // Obtenemos los datos que el usuario escribió en el formulario
    const data = event.data.data();
    
    if (!data) return;

    try {
        // Añadimos un documento a la colección 'mail' para que Firebase mande el correo
        await db.collection("mail").add({
            to: ["fotoesportmerch@gmail.com"], // Tu correo de destino
            replyTo: data.email, // Si le das a "Responder" en Gmail, le contestarás al cliente
            message: {
                subject: `🚀 Nueva Solicitud de Club: ${data.clubName}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <h2 style="color: #059669; text-align: center;">¡Nueva petición de información!</h2>
                        <p style="font-size: 16px; color: #333;">Has recibido una nueva solicitud desde el panel de la web principal:</p>
                        
                        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 20px;">
                            <p style="margin: 5px 0;"><strong>🏢 Club:</strong> ${data.clubName}</p>
                            <p style="margin: 5px 0;"><strong>👤 Contacto:</strong> ${data.contactName}</p>
                            <p style="margin: 5px 0;"><strong>📱 Teléfono:</strong> <a href="tel:${data.phone}">${data.phone}</a></p>
                            <p style="margin: 5px 0;"><strong>📧 Email:</strong> <a href="mailto:${data.email}">${data.email}</a></p>
                        </div>

                        <div style="margin-top: 20px;">
                            <p style="font-weight: bold; color: #333;">Mensaje del club:</p>
                            <blockquote style="background-color: #f3f4f6; border-left: 4px solid #059669; padding: 10px 15px; font-style: italic; color: #555;">
                                ${data.message ? data.message : 'No han dejado ningún mensaje adicional.'}
                            </blockquote>
                        </div>
                    </div>
                `
            }
        });
        
        console.log(`Email de notificación encolado para la solicitud del club: ${data.clubName}`);
    } catch (error) {
        console.error("Error al enviar el email de notificación de club:", error);
    }
});

// 7. ENTREGAR ARCHIVO DIGITAL (Stickers, Redes Sociales, etc.)
exports.sendDigitalDelivery = onCall(async (request) => {
    // PROTECCIÓN EXTRA: Solo acepta peticiones de la web oficial
    if (request.app === undefined) {
        throw new HttpsError("failed-precondition", "La petición no proviene de la App Oficial.");
    }

    const { orderId, customerEmail, customerName, clubName, files } = request.data;

    // Seguridad: Solo los admins conectados pueden enviar archivos
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Debes estar autenticado para enviar archivos digitales.");
    }

    try {
        await db.collection("mail").add({
            to: [customerEmail],
            message: {
                subject: `¡Tus diseños digitales de ${clubName} están listos!`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <h2 style="color: #8b5cf6; text-align: center;">¡Tus archivos digitales han llegado!</h2>
                        <p style="font-size: 16px; color: #333;">Hola <strong>${customerName}</strong>,</p>
                        <p style="font-size: 16px; color: #333;">Adjunto a este correo encontrarás los diseños digitales (stickers, imágenes, etc.) correspondientes a tu pedido <strong>#${orderId}</strong> para el club <strong>${clubName}</strong>.</p>
                        <p style="font-size: 16px; color: #333;">¡Esperamos que te gusten!</p>
                        <div style="text-align: center; margin-top: 30px;">
                            <p style="font-size: 12px; color: #999;">© ${new Date().getFullYear()} FotoEsport Merch</p>
                        </div>
                    </div>
                `,
                // El array de archivos adjuntos va directo a la extensión de Nodemailer
                attachments: files 
            }
        });

        console.log(`Archivos digitales enviados a ${customerEmail} para el pedido ${orderId}.`);
        return { success: true };
    } catch (error) {
        console.error("Error enviando archivos digitales:", error);
        throw new HttpsError("internal", "Error al enviar el correo con los archivos.");
    }
});

// 8. ENVÍO MANUAL A LA GESTORÍA
exports.sendAgencyReportManual = onCall(async (request) => {
    // PROTECCIÓN EXTRA: Solo acepta peticiones de la web oficial
    if (request.app === undefined) {
        throw new HttpsError("failed-precondition", "La petición no proviene de la App Oficial.");
    }

    const { emails, csvContent, startDate, endDate, isIndefinite } = request.data;

    if (!request.auth) throw new HttpsError("unauthenticated", "Debes estar autenticado.");
    
    // Lógica dinámica para textos y nombres de archivo
    const periodText = isIndefinite ? "COMPLETO" : `entre ${startDate} y ${endDate}`;
    const finalFileName = isIndefinite ? "Facturacion_COMPLETO.xlsx" : `Facturacion_${startDate}_a_${endDate}.xlsx`;

    try {
        await db.collection("mail").add({
            to: emails,
            message: {
                subject: `Informe de Facturación FotoEsport (${periodText})`,
                html: `
                    <p>Hola,</p>
                    <p>Adjuntamos el informe de facturación de FotoEsport correspondiente al periodo <strong>${periodText}</strong>.</p>
                    <p>El archivo adjunto está en formato oficial de Excel (.xlsx).</p>
                    <br><p>Un saludo,</p><p>Equipo de FotoEsport Merch</p>
                `,
                attachments: [{
                    filename: finalFileName,
                    content: csvContent,
                    encoding: 'base64',
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
                }]
            }
        });

        await db.collection('settings').doc('agencyLogs').set({
            lastSendDate: new Date().toISOString(),
            status: `Success (Manual - ${periodText})`,
            lastCsvBase64: csvContent
        }, { merge: true });

        return { success: true };
    } catch (error) {
        console.error("Error enviando a gestoría:", error);
        throw new HttpsError("internal", "Error procesando el envío.");
    }
});

// 9. CRON: ENVÍO AUTOMÁTICO A GESTORÍA (Se ejecuta cada hora y verifica si coincide el día y la hora)
exports.autoSendAgencyReport = onSchedule({ schedule: "0 * * * *", timeZone: "Europe/Madrid" }, async (event) => {
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('es-ES', { 
            timeZone: 'Europe/Madrid', 
            day: 'numeric', 
            hour: 'numeric',
            hour12: false
        });
        const parts = formatter.formatToParts(now);
        const currentDay = parseInt(parts.find(p => p.type === 'day').value);
        let currentHour = parseInt(parts.find(p => p.type === 'hour').value);
        if (currentHour === 24) currentHour = 0;

        const settingsDoc = await db.collection('settings').doc('agency').get();
        const settings = settingsDoc.exists ? settingsDoc.data() : {};
        
        const configuredDay = parseInt(settings.autoDay) || 1;
        const configuredTimeStr = settings.autoTime || "08:00";
        const configuredHour = parseInt(configuredTimeStr.split(':')[0]);
        const agencyEmails = settings.emails || ["gestoria@ejemplo.com"];

        if (currentDay !== configuredDay || currentHour !== configuredHour) {
            console.log(`Ahora es día ${currentDay} a las ${currentHour}h. Programado para el día ${configuredDay} a las ${configuredHour}h. Cancelando envío.`);
            return; 
        }

        console.log("¡Coincide la fecha y la hora! Iniciando envío a gestoría...");

        const today = new Date();
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

        const startIso = startOfLastMonth.toISOString();
        const endIso = endOfLastMonth.toISOString();

        const ordersSnapshot = await db.collectionGroup('orders') 
            .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startOfLastMonth))
            .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endOfLastMonth))
            .get();

        if (ordersSnapshot.empty) {
            console.log("No hay pedidos para facturar el mes anterior.");
            return;
        }

        // --- CREACIÓN DEL EXCEL OFICIAL ---
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Para poder contabilizar');

        const header1 = worksheet.addRow(['Autoliquidación', '', 'Concepto de Ingreso', 'Ingreso Computable', 'Fecha Expedición', 'Fecha Operacion', 'Identificación de la Factura', '', '', 'NIF Destinatario', '', '', 'Nombre Destinatario', 'Total Factura', 'Base Imponible', 'Tipo de IVA', 'Cuota IVA Repercutida']);
        const header2 = worksheet.addRow(['Ejercicio', 'Periodo', '', '', '', '', 'Serie', 'Número', 'Número-Final', 'Tipo', 'Código País', 'Identificación', '', '', '', '', '']);

        [header1, header2].forEach(row => {
            row.eachCell((cell) => {
                cell.font = { bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
            });
        });

        let index = 1;
        ordersSnapshot.forEach(doc => {
            const o = doc.data();
            if (['replacement', 'incident'].includes(o.paymentMethod)) return;

            const date = o.createdAt.toDate();
            const total = o.total || 0;
            const baseImponible = total / 1.21;
            const iva = total - baseImponible;

            const row = worksheet.addRow([
                date.getFullYear(), Math.ceil((date.getMonth() + 1) / 3) + "T", "I07", 100, 
                date.toISOString().split('T')[0], "", "F1", index++, "", "", "",
                (o.customer?.dni || ""), (o.customer?.name || 'Cliente Final'),
                total, baseImponible, 21, iva
            ]);
            
            row.eachCell((c, colNumber) => {
                c.alignment = { horizontal: 'center', vertical: 'middle' };
                if (colNumber >= 14) c.numFmt = '#,##0.00 €';
            });
        });

        worksheet.columns.forEach(column => { column.width = 18; });
        worksheet.getColumn(13).width = 35;

        const buffer = await workbook.xlsx.writeBuffer();
        const base64Content = buffer.toString('base64');
        // --- FIN CREACIÓN EXCEL ---

        // Envío del email con el .xlsx
        await db.collection("mail").add({
            to: agencyEmails,
            message: {
                subject: `Informe de Facturación Automático FotoEsport (${startIso.split('T')[0]} a ${endIso.split('T')[0]})`,
                html: `<p>Adjuntamos el informe de facturación mensual en Excel generado automáticamente el día ${configuredDay} a las ${configuredTimeStr}.</p>`,
                attachments: [{
                    filename: `Facturacion_${startIso.split('T')[0]}_a_${endIso.split('T')[0]}.xlsx`, // .xlsx
                    content: base64Content,
                    encoding: 'base64',
                    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // Etiqueta Excel
                }]
            }
        });

        await db.collection('settings').doc('agencyLogs').set({
            lastSendDate: new Date().toISOString(),
            status: 'Correcto (Automático)',
            lastCsvBase64: base64Content
        }, { merge: true });

        console.log("Envío automático a gestoría completado.");

    } catch (error) {
        console.error("Error en envío automático a gestoría:", error);
        await db.collection('settings').doc('agencyLogs').set({
            lastSendDate: new Date().toISOString(),
            status: 'Error: ' + error.message,
            lastCsvBase64: null
        }, { merge: true });
    }
});