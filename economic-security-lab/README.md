# Economic Security Lab · herramientas didácticas sobre inseguridad económica

Prototipos web para explicar la **inseguridad económica** de los hogares: por qué el ingreso del mes no basta para saber si un hogar está seguro, y cómo se encadenan golpes, colchones, deudas y redes en el tiempo.

> **Todos los montos y probabilidades son ficticios.** Son modelos didácticos para mostrar mecanismos, no estimaciones sobre hogares chilenos reales.

## Páginas

| Archivo | Qué es |
|---|---|
| [`index.html`](index.html) | **Cuando algo falla.** Página de divulgación: arma un hogar con riesgos y colchones, ve los mecanismos en juego y recibe lecturas sugeridas. Incluye la idea central, tres capas, ocho mecanismos, hallazgos de la literatura, formas de medir y rutas de lectura. |
| [`laboratorio_hogares.html`](laboratorio_hogares.html) | **Laboratorio de hogares.** (1) Elige un hogar prototípico, ponle golpes en una línea de 24 meses y mira cómo se le cierran las opciones: ahorro, familia, crédito bancario, crédito caro. (2) El mismo hogar con su red de familia, conocidos y vecinos, frente a golpes que entran por el hogar, el barrio, el rubro o todo el país. |
| [`red_de_hogares.html`](red_de_hogares.html) | Prototipo anterior: modelo basado en agentes con 200 hogares en red durante 36 meses y cuatro experimentos guiados. |

Cada página es un archivo HTML autónomo: se abre directamente en el navegador, sin instalar nada. La única dependencia externa son las fuentes de Google Fonts.

## Cómo verlo

- **En local:** descarga el repositorio y abre `index.html`.
- **En línea con GitHub Pages:** *Settings → Pages → Deploy from a branch → `main` / root*. El sitio queda en `https://<usuario>.github.io/<repositorio>/`.

## El modelo, en breve

Cada mes, cada hogar recibe ingresos (sueldos, pensiones, transferencias) y paga gastos y cuotas que no se ajustan cuando cae el ingreso. Si le sobra, ahorra una parte; si le falta, recurre en orden a:

1. su ahorro,
2. su familia y otros vínculos,
3. crédito bancario (solo con contrato o pensión y sin atrasos),
4. crédito caro (casa comercial o prestamista),
5. recortar lo básico,
6. dejar cuentas impagas.

En la etapa de redes, los vínculos son hogares simulados con sus propios ingresos y golpes: la familia presta más, los vecinos poco, los conocidos con trabajo aumentan la probabilidad de volver a trabajar, y el hogar también ayuda a otros cuando puede.

El código del motor está en [`src/motor_hogares.js`](src/motor_hogares.js) y la interfaz del laboratorio en [`src/laboratorio_ui.js`](src/laboratorio_ui.js). Ambos están incluidos dentro de `laboratorio_hogares.html`; los archivos de `src/` son copias para leer el código.

## Base conceptual

Se apoya en literatura sobre seguridad económica, fragilidad financiera, deuda, riqueza familiar, mezclas de bienestar e inseguridad subjetiva, entre otros: Hacker et al. (2014), Bossert y D'Ambrosio (2013), Prieto (2022, 2024), López-Calva y Ortiz-Juárez (2014), Lusardi, Schneider y Tufano (2011), Dwyer (2018), Killewald, Pfeffer y Schachner (2017), Antonucci (2018), Mau, Mewes y Schoeneck (2012) y Ayala-Hurtado (2022, 2026). Las referencias completas con enlace están en `index.html`.

## Próximos pasos

- Calibrar los hogares tipo con CASEN y la Encuesta Financiera de Hogares.
- Construir perfiles de red con preguntas sobre redes de apoyo (CASEN) y módulos de redes personales (por ejemplo, ELSOC).
- Documentar el modelo completo con el protocolo ODD.

## Licencia

Código bajo licencia [MIT](LICENSE).
