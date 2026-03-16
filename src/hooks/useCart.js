import { useState } from 'react';

export function useCart(storeConfig, showNotification) {
    const [cart, setCart] = useState([]);

    const addToCart = (product, customization, finalPrice) => { 
        if (!storeConfig?.isOpen) { 
            showNotification('La tienda está cerrada temporalmente.', 'error'); 
            return; 
        } 
        // 🟢 ARREGLADO: Invertimos el orden (...customization, ...product)
        setCart(prevCart => [...prevCart, { ...customization, ...product, price: finalPrice, cartId: Date.now() }]); 
        showNotification('Producto añadido al carrito'); 
    };
    
    const removeFromCart = (cartId) => { 
        setCart(prevCart => prevCart.filter(item => item.cartId !== cartId)); 
    };

    return { cart, setCart, addToCart, removeFromCart };
}