const { contextBridge, ipcRenderer } = require('electron');

// Aquí exponemos las funciones que tus archivos HTML/JS podrán usar
contextBridge.exposeInMainWorld('api', {
    // Autenticación
    login: (credenciales) => ipcRenderer.invoke('login', credenciales),
    
    // Dashboard
    obtenerStatsDashboard: () => ipcRenderer.invoke('obtenerStatsDashboard'),
    
    // Gestión de Ventas
    guardarVenta: (venta) => ipcRenderer.invoke('guardarVenta', venta),
    obtenerVentas: (filtros) => ipcRenderer.invoke('obtenerVentas', filtros),
    eliminarVenta: (id) => ipcRenderer.invoke('eliminarVenta', id),
    actualizarVenta: (venta) => ipcRenderer.invoke('actualizarVenta', venta),
    
    // Reportes
    obtenerRanking: (filtros) => ipcRenderer.invoke('obtenerRanking', filtros),

    // Exportación y respaldo
    exportarVentas: (filtros) => ipcRenderer.invoke('exportarVentas', filtros),
    crearBackup: () => ipcRenderer.invoke('crearBackup'),
    restaurarBackup: () => ipcRenderer.invoke('restaurarBackup'),

    // Seguridad
    cambiarPassword: (datos) => ipcRenderer.invoke('cambiarPassword', datos)
});
