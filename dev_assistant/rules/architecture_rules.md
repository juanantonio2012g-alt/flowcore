# Reglas de arquitectura

- Primero arquitectura, después pantalla, después implementación.
- No tocar más archivos de los necesarios.
- No mezclar dashboard ejecutivo con worklist operativa.
- /dashboard = supervisión
- /casos = cola global
- /casos/[id] = registro maestro
- /clientes = módulo relacional
- Validar con build antes de cerrar tarea.
- Preferir archivo completo o bloque bien delimitado.
