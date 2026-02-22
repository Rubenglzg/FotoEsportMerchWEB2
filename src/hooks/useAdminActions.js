import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, writeBatch, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';

export function useAdminActions(showNotification, setConfirmation, clubs) {

  // --- PRODUCTOS ---
  const addProduct = async () => { 
      const newProduct = { 
          name: 'Nuevo Producto', price: 10.00, cost: 5.00, category: 'General', 
          image: '/logonegro.png',
          stockType: 'internal', stock: 0, 
          features: { name: true, number: true, photo: false, shield: true, color: false }, 
          defaults: { name: true, number: true, photo: false, shield: true }, 
          modifiable: { name: true, number: true, photo: false, shield: true },
          createdAt: serverTimestamp()
      }; 
      try {
          await addDoc(collection(db, 'products'), newProduct);
          showNotification('Producto creado en BD');
      } catch (e) { showNotification('Error al crear', 'error'); }
  };

  const updateProduct = async (updatedProduct, newImageFile) => { 
      try {
          let finalProduct = { ...updatedProduct };
          if (newImageFile) {
              const storageRef = ref(storage, `Productos/${Date.now()}_${newImageFile.name}`);
              await uploadBytes(storageRef, newImageFile);
              finalProduct.image = await getDownloadURL(storageRef);
          }
          await updateDoc(doc(db, 'products', finalProduct.id), finalProduct);
          showNotification('Producto guardado correctamente');
      } catch (e) { showNotification('Error al actualizar producto', 'error'); }
  };

  const deleteProduct = (id) => { 
      setConfirmation({ 
          msg: '¿Eliminar producto de la base de datos?', 
          onConfirm: async () => { 
              try {
                  await deleteDoc(doc(db, 'products', id));
                  showNotification('Producto eliminado'); 
              } catch (e) { showNotification('Error al eliminar', 'error'); }
          } 
      }); 
  };

  // --- CLUBES ---
  const createClub = async (clubData, logoFile) => {
      try {
          let logoUrl = '';
          if (logoFile) {
              const logoRef = ref(storage, `club-logos/${Date.now()}_${logoFile.name}`);
              await uploadBytes(logoRef, logoFile);
              logoUrl = await getDownloadURL(logoRef);
          }
          await addDoc(collection(db, 'clubs'), {
              ...clubData, logoUrl, commission: 0.12, blocked: false,
              activeGlobalOrderId: 1, cashPaymentEnabled: true, createdAt: serverTimestamp()
          });
          showNotification('Club creado correctamente');
      } catch (error) { showNotification('Error al crear el club', 'error'); }
  };

  const updateClub = async (updatedClub, newLogoFile) => { 
      try {
          let finalClubData = { ...updatedClub };
          if (newLogoFile) {
              const logoRef = ref(storage, `club-logos/${Date.now()}_${newLogoFile.name}`);
              await uploadBytes(logoRef, newLogoFile);
              finalClubData.logoUrl = await getDownloadURL(logoRef);
          }
          await updateDoc(doc(db, 'clubs', finalClubData.id), finalClubData);
          showNotification('Club actualizado correctamente');
      } catch (e) { showNotification('Error al actualizar el club', 'error'); }
  };

  const deleteClub = (clubId) => { 
      setConfirmation({ 
          msg: '¿Eliminar este club definitivamente?', 
          onConfirm: async () => { 
              try {
                  await deleteDoc(doc(db, 'clubs', clubId));
                  showNotification('Club eliminado'); 
              } catch (e) { showNotification('Error al borrar', 'error'); }
          } 
      }); 
  };

  const toggleClubBlock = async (clubId) => { 
      const club = clubs.find(c => c.id === clubId);
      if (!club) return;
      try {
          await updateDoc(doc(db, 'clubs', clubId), { blocked: !club.blocked });
          showNotification(club.blocked ? 'Club desbloqueado' : 'Club bloqueado');
      } catch (e) { showNotification('Error al cambiar estado', 'error'); }
  };

  // --- LOTES GLOBALES DE CLUBES ---
  const incrementClubGlobalOrder = (clubId) => { 
      const club = clubs.find(c => c.id === clubId);
      setConfirmation({ 
          msg: `¿Cerrar el Pedido Global #${club.activeGlobalOrderId}? Se abrirá el #${club.activeGlobalOrderId + 1}.`, 
          onConfirm: async () => { 
              try {
                  await updateDoc(doc(db, 'clubs', clubId), { activeGlobalOrderId: club.activeGlobalOrderId + 1 });
                  showNotification(`Nuevo Pedido Global iniciado`); 
              } catch (e) {}
          } 
      }); 
  };

  const decrementClubGlobalOrder = async (clubId, newActiveId) => { 
      try {
          await updateDoc(doc(db, 'clubs', clubId), { activeGlobalOrderId: newActiveId });
          showNotification(`Se ha reabierto el Pedido Global #${newActiveId}`); 
      } catch (e) {}
  };

  // --- PROVEEDORES ---
  const createSupplier = async (data) => {
      try {
          await addDoc(collection(db, 'suppliers'), { ...data, createdAt: serverTimestamp() });
          showNotification('Proveedor creado');
      } catch (e) { showNotification('Error creando proveedor', 'error'); }
  };

  const updateSupplier = async (data) => {
      try {
          await updateDoc(doc(db, 'suppliers', data.id), data);
          showNotification('Proveedor actualizado');
      } catch (e) { showNotification('Error actualizando proveedor', 'error'); }
  };

  const deleteSupplier = (id) => {
      setConfirmation({
          msg: '¿Eliminar proveedor? Los productos vinculados conservarán su coste actual pero quedarán sin asignar.',
          onConfirm: async () => {
              try {
                  await deleteDoc(doc(db, 'suppliers', id));
                  showNotification('Proveedor eliminado');
              } catch (e) { showNotification('Error al eliminar', 'error'); }
          }
      });
  };

  const updateProductCostBatch = async (supplierId, priceList) => {
      try {
          const batch = writeBatch(db);
          let count = 0;
          for (const [prodId, newCost] of Object.entries(priceList)) {
              batch.update(doc(db, 'products', prodId), { supplierId: supplierId, cost: parseFloat(newCost) });
              count++;
          }
          if(count > 0) { await batch.commit(); showNotification(`${count} productos actualizados.`); }
      } catch (e) { showNotification('Error sincronizando costes', 'error'); }
  };

  // --- TEMPORADAS ---
  const addSeason = async (newSeason) => {
      try {
          await addDoc(collection(db, 'seasons'), { ...newSeason, hiddenForClubs: false, createdAt: serverTimestamp() });
          showNotification('Temporada guardada correctamente en la base de datos');
      } catch (error) { showNotification('Error al guardar la temporada', 'error'); }
  };

  const deleteSeason = async (seasonId, seasonsLength) => {
      if(seasonsLength <= 1) { showNotification('Debe haber al menos una temporada activa.', 'error'); return; }
      setConfirmation({ 
          msg: '¿Eliminar esta temporada definitivamente de la base de datos?', 
          onConfirm: async () => { 
              try {
                  await deleteDoc(doc(db, 'seasons', seasonId));
                  showNotification('Temporada eliminada'); 
              } catch (error) { showNotification('Error al eliminar temporada', 'error'); }
          } 
      }); 
  };

  const toggleSeasonVisibility = async (seasonId, seasons) => {
      const seasonToUpdate = seasons.find(s => s.id === seasonId);
      if (!seasonToUpdate) return;
      try {
          await updateDoc(doc(db, 'seasons', seasonId), { hiddenForClubs: !seasonToUpdate.hiddenForClubs });
      } catch (error) { showNotification("Error al guardar cambios", "error"); }
  };

  // --- CONFIGURACIÓN FINANCIERA ---
  const updateFinancialConfig = async (newConfig) => {
      try {
          await setDoc(doc(db, 'settings', 'financial'), newConfig);
          showNotification('Configuración comercial guardada');
      } catch (error) { showNotification('Error al guardar configuración', 'error'); }
  };

  return {
      addProduct, updateProduct, deleteProduct,
      createClub, updateClub, deleteClub, toggleClubBlock,
      incrementClubGlobalOrder, decrementClubGlobalOrder,
      createSupplier, updateSupplier, deleteSupplier, updateProductCostBatch,
      addSeason, deleteSeason, toggleSeasonVisibility,
      updateFinancialConfig
  };
}