# Proyecto Gruni - Documento de Contexto

Este archivo (`AGENTS.md`) provee contexto automático a cualquier agente de IA que trabaje en el proyecto, para evitar que el usuario tenga que explicar de qué trata el juego en cada nueva conversación.

## Sobre el Juego
- **Género**: Simulador de Dios / Supervivencia en 2.5D Isométrico.
- **Estilo Visual**: Retro / Pixel Art (estilo DOFUS o RPG antiguo). Los fondos y sprites se dibujan con `imageSmoothingEnabled = false` para mantener los píxeles nítidos y cuadrados.
- **Perspectiva**: Vista isométrica con cámara libre.
- **Tecnología**: HTML5 Canvas, JavaScript puro (sin frameworks de juego).

## El Personaje Principal (Gruni)
- Gruni es el único personaje que el jugador / Dios debe cuidar.
- **Apariencia**: Pelo azul, cinta en la cabeza, mochila, y una espada pequeña.
- **Estadísticas Base**: Tiene barras de Vida, Hambre y Sed.
- **Especializaciones (Ramas de conocimiento)**: 
  - *Biología*: Gruni adopta un lobo mascota llamado "Firulais" que lo ayuda.
  - *Astronomía*: Permite a Gruni construir telescopios para predecir eclipses.
  - *Herrería*: Permite forjar espadas más duraderas.

## Mecánicas del Mundo
- **Zonas / Mapa**: El mundo es una matriz de 3x3 (9 zonas).
  - *Norte*: Zonas de Hielo, Montañas Nevadas, Bosque Mágico.
  - *Centro*: Aldea y Campo, Pradera (zona inicial de Gruni), Bosque y Río.
  - *Sur*: Playa, Desierto, Cementerio de Animales.
- **Recursos e Inventario**: Gruni puede talar árboles para Madera y picar Rocas. Puede usar esto para construir Espadas, Picos, Casas, Telescopios y Murallas.
- **Ciclo de Día / Noche y Eclipses**: Existen eventos de eclipse. Durante un eclipse, la luz baja, el entorno se oscurece, y el spawn de enemigos aumenta de 4 a 6 simultáneos.
- **Enemigos**: Lobos y otras criaturas hostiles de las cuales Gruni debe defenderse.

## Reglas de Desarrollo
1. Mantener siempre el estilo isométrico y Pixel Art en el renderizado del canvas.
2. Evitar usar `imageSmoothingEnabled = true` salvo que sea en offscreen-canvas para downsampling.
3. El código del juego se organiza en módulos dentro de la carpeta `js/` (`main.js`, `renderer.js`, `agent.js`, `world.js`, `zones.js`, etc.).
