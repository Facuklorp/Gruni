# Guión de Animación: Stream Cozy de Gruni (Flujo para IA) 🎣

Este documento es tu mapa de ruta para generar los recursos visuales del stream utilizando herramientas de Inteligencia Artificial.

> [!IMPORTANT]  
> **El Reto de la IA (Inconsistencia y Bucles):**
> Como la IA no genera fondos transparentes ni bucles perfectos, usaremos la técnica del **Boomerang** en Premiere (reproducir el clip hacia adelante y luego hacia atrás) para crear los loops base. Por código, usaremos **transiciones suaves (crossfades)** entre videos para disimular si la IA cambia un poco la forma del árbol o del lago entre una generación y otra.
>
> **Consejo para Prompts:** Intenta usar la misma imagen inicial (img2vid) o una semilla fija para que la posición de la cámara y de Gruni varíen lo menos posible entre los distintos videos.

---

## 1. El Clima y la Hora (Día, Tarde, Noche) 🌅🌙

Como la IA entrega la escena completa (personaje + fondo unidos), deberás generar versiones separadas para cada momento del día.

---

## 2. Animaciones Base (Estado Idle - Bucle) 🧘‍♂️

Estos son los videos que se reproducirán la mayor parte del tiempo en la pantalla.
*El Editor de video debe aplicar el efecto Boomerang a estos clips para hacerlos un bucle infinito.*

### Entregables Base (Videos MP4 Completos)
- **`idle_dia.mp4`**: Gruni respirando y mirando el lago. Iluminación diurna brillante.
- **`idle_tarde.mp4`**: Gruni respirando y mirando el lago. Iluminación naranja de atardecer.
- **`idle_noche.mp4`**: Gruni respirando y mirando el lago. Iluminación nocturna oscura.

---

## 3. Animaciones de Acción (Eventos de Pesca) 🐟

Estas animaciones interrumpirán el video Base aleatoriamente. Al terminar la acción, el código volverá a mostrar el video Base haciendo un fundido suave.

### Entregables de Acción (Videos MP4 Completos)
*(Para ahorrar tiempo de generación, puedes decidir que los eventos de pesca solo ocurran durante el "Día", o generar las 3 versiones de clima para cada acción. Aquí listamos el pack necesario):*

- **`pesca_normal.mp4`**: Gruni tira de la caña, saca un pez normal, se pone feliz y vuelve a sentarse relajado.
- **`pesca_epica.mp4`**: Gruni lucha con la caña, saca un pez enorme o luminoso, hace gesto de sorpresa y vuelve a sentarse.
- **`pesca_basura.mp4`**: Gruni saca una bota vieja o una lata, hace un gesto de decepción, la tira hacia atrás y vuelve a sentarse.
- **`evento_mirar.mp4`**: (Opcional para dar vida) Gruni gira la cabeza hacia la pantalla (rompiendo la cuarta pared) o hacia un costado, y vuelve a mirar el agua.

---

## Resumen de la Lista de Tareas (Checklist):

**El "Pack Básico" para lanzar el stream:**
- [ ] `idle_dia.mp4`
- [ ] `idle_tarde.mp4`
- [ ] `idle_noche.mp4`
- [ ] `pesca_normal.mp4`
- [ ] `pesca_epica.mp4`
- [ ] `pesca_basura.mp4`

*(Total: 6 archivos MP4 generados por IA y preparados en Premiere)*
