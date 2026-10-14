# Proyecto Gruni - Documento de Contexto

Este archivo (`AGENTS.md`) provee contexto automático y obligatorio a cualquier agente de IA que trabaje en el proyecto, para evitar confusiones en cada nueva conversación.

## ¿Qué es Gruni y cómo se ejecuta?
- **Propósito principal**: Gruni es un juego pensado para **transmitirse en vivo 24/7 en plataformas como Kick, Twitch o YouTube** (stream interactivo continuo).
- **Entorno de ejecución**: Corre en **una sola computadora** (la máquina del streamer / servidor de emisión) y se transmite a pantalla completa.
- **Carga de imágenes y rendimiento**: Como corre en una única computadora local y no en miles de navegadores móviles, **la carga de imágenes ocurre UNA SOLA VEZ**. NO se deben aplicar recortes de calidad pensando en usuarios con conexiones lentas de celular. La prioridad absoluta es la **máxima fidelidad visual, nitidez y calidad gráfica** para que el streaming se vea perfecto en 1080p o 4K.

## Sobre el Juego
- **Género**: Simulador de Dios / Supervivencia en 2.5D Isométrico.
- **Estilo Visual**: 2.5D Isométrico. Los fondos son pinturas/ilustraciones en alta resolución (estilo arte digital / RPG táctico tipo Dofus/Wakfu). Los personajes son dibujados. **NO es un juego con fondos Pixel Art.**
- **Perspectiva**: Vista isométrica con cámara libre / seguimiento.
- **Tecnología**: HTML5 Canvas, JavaScript puro (sin frameworks de juego).

## El Personaje Principal (Gruni) y Lore
- Gruni es el único personaje que el jugador / Dios / espectadores del chat deben cuidar.
- **Lore**: Gruni tiene la misión de que, al morir, se transforma en un espíritu benigno que fortalece una barrera espiritual para que seres malignos no se apoderen del mundo. Mientras más años viva, más fortalece su energía y más resistente será la barrera. Por eso seres malignos lo atacan para robar sus artefactos, y seres benevolentes lo protegen.
- **Apariencia**: Pelo azul, cinta en la cabeza, mochila, y una espada pequeña.
- **Estadísticas Base**: Barras de Vida, Hambre y Sed.
- **Especializaciones (Ramas de conocimiento)**: 
  - *Biología*: Gruni adopta un lobo mascota llamado "Firulais" que lo ayuda.
  - *Astronomía*: Permite a Gruni construir telescopios para predecir eclipses.
  - *Herrería*: Permite forjar espadas más duraderas.

## Mecánicas del Mundo
- **Zonas / Mapa**: El mundo es una matriz de 3x3 (9 zonas).
  - *Norte*: Zonas de Hielo, Montañas Nevadas, Bosque Mágico.
  - *Centro*: Aldea y Campo, Pradera (zona inicial de Gruni), Bosque y Río.
  - *Sur*: Playa, Desierto, Cementerio de Animales.
- **Recursos e Inventario**: Gruni recolecta madera, roca y comida. Puede construir espadas, picos, casas, telescopios y murallas.
- **Ciclo de Día / Noche y Eclipses**: Eventos de eclipse con disminución de luz y aumento en el spawn de enemigos.

## Reglas de Desarrollo
1. Mantener siempre el estilo isométrico en el renderizado del canvas.
2. El código del juego se organiza en módulos dentro de la carpeta `js/` (`main.js`, `renderer.js`, `agent.js`, `world.js`, `zones.js`, etc.).
3. Siempre priorizar que los fondos y gráficos se vean nítidos y sin desenfoques en pantalla.
