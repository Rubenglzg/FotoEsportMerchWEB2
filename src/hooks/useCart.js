import { useState } from 'react';

export function useCart(storeConfig, showNotification) {
    const [cart, setCart] = useState([]);

    const addToCart = (product, customization, finalPrice) => { 
        if (!storeConfig?.isOpen) { 
            showNotification('La tienda está cerrada temporalmente.', 'error'); 
            return; 
        } 

        setCart(prevCart => {
            // 1. Buscamos si ya existe un producto idéntico en el carrito
            const existingItemIndex = prevCart.findIndex(item => 
                item.id === product.id && 
                item.playerName === customization.playerName &&
                item.playerNumber === customization.playerNumber &&
                item.price === finalPrice // Aseguramos que el precio sea el mismo
            );

            if (existingItemIndex >= 0) {
                // 2. Si ya existe, copiamos el carrito y actualizamos solo la cantidad de ese producto
                const updatedCart = [...prevCart];
                const existingItem = updatedCart[existingItemIndex];
                
                const currentQty = existingItem.quantity || 1;
                const addedQty = customization.quantity || 1;

                updatedCart[existingItemIndex] = {
                    ...existingItem,
                    quantity: currentQty + addedQty
                };
                
                return updatedCart;
            } else {
                // 3. Si no existe, lo añadimos como un producto nuevo con su ID único
                return [
                    ...prevCart, 
                    { 
                        ...customization, 
                        ...product, 
                        price: finalPrice, 
                        quantity: customization.quantity || 1, // Aseguramos que la cantidad inicial sea al menos 1
                        cartId: Date.now() + Math.random() 
                    }
                ];
            }
        });

        showNotification('Producto añadido al carrito'); 
    };
    
    const removeFromCart = (cartId) => { 
        setCart(prevCart => prevCart.filter(item => item.cartId !== cartId)); 
    };

    return { cart, setCart, addToCart, removeFromCart };
}