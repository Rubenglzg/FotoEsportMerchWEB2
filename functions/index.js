const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// 1. Notificar por email cuando el admin contesta (Versión V2)
exports.onTicketReply = onDocumentUpdated("incidents/{ticketId}", async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();
    const ticketId = event.params.ticketId;

    // Si no hay datos nuevos o se ha borrado, salir
    if (!newData) return;

    // A) Detectar nueva respuesta del admin
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
    
    // Borrado manual (sin batch porque storage es externo)
    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.orderId) {
            try {
                // Intenta borrar la carpeta de evidencias
                await bucket.deleteFiles({ prefix: `incidents/${data.orderId}/` });
            } catch (e) {
                console.log("Error borrando archivos:", e.message);
            }
        }
        await doc.ref.delete();
    }
    
    console.log(`Eliminados ${snapshot.size} tickets antiguos.`);
});