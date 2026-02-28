const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

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

// 3. CRON DIARIO: Borrar datos tras 30 días (Versión V2)
exports.deleteOldIncidents = onSchedule("every 24 hours", async (event) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const snapshot = await db.collection('incidents')
        .where('status', '==', 'closed')
        .where('closedAt', '<=', thirtyDaysAgo.toISOString())
        .get();

    if (snapshot.empty) return;

    const bucket = admin.storage().bucket();
    
    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.orderId) {
            try {
                await bucket.deleteFiles({ prefix: `incidents/${data.orderId}/` });
            } catch (e) {
                console.log("Error borrando archivos:", e.message);
            }
        }
        await doc.ref.delete();
    }
    
    console.log(`Eliminados ${snapshot.size} tickets antiguos.`);
});

// 4. ENVÍO DE EMAIL MASIVO (Marketing)
exports.sendMassEmail = onCall(async (request) => {
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
        await db.collection("mail").add({
            to: ["no-reply@fotoesport.com"], 
            bcc: emails,
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