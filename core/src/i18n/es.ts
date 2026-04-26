import type { LocaleMap } from "./types";

export const es: LocaleMap = {
  "navigable/document-title": {
    description:
      "Los documentos deben tener un elemento <title> para proporcionar a los usuarios una vista general del contenido.",
    guidance:
      "Los usuarios de lectores de pantalla dependen de los títulos de página para identificar y navegar entre pestañas/ventanas. Agregue un elemento <title> descriptivo en <head> que resuma el propósito de la página. Mantenga los títulos únicos en todo el sitio, colocando el contenido específico antes del nombre del sitio (por ejemplo, 'Contáctenos - Acme Corp').",
    messages: {
      "Document <title> element is empty.": "El elemento <title> del documento está vacío.",
      "Document is missing a <title> element.": "Al documento le falta un elemento <title>.",
    },
  },
  "navigable/bypass": {
    description: "La página debe tener un mecanismo para omitir bloques de contenido repetidos.",
    guidance:
      'Los usuarios de teclado deben poder omitir contenido repetitivo como la navegación. Proporcione un enlace de salto en la parte superior de la página que enlace al contenido principal (por ejemplo, <a href="#main">Saltar al contenido principal</a>), o use un landmark <main>. Los lectores de pantalla pueden saltar directamente a los landmarks, por lo que un elemento <main> correctamente marcado satisface este requisito.',
    messages: {
      "Page has no mechanism to bypass repeated content. Add a <main> landmark or skip link.":
        "La página no tiene un mecanismo para omitir contenido repetido. Agregue un landmark <main> o un enlace de salto.",
    },
  },
  "navigable/page-has-heading-one": {
    description: "La página debe contener un encabezado de nivel uno.",
    guidance:
      "Un encabezado de nivel uno (<h1> o role='heading' con aria-level='1') ayuda a los usuarios a comprender el tema de la página y proporciona un punto de referencia para la navegación con lector de pantalla. Cada página debe tener exactamente un h1 que describa el contenido principal, típicamente coincidiendo o similar al título de la página.",
    messages: {
      "Page does not contain a level-one heading.":
        "La página no contiene un encabezado de nivel uno.",
    },
  },
  "labels-and-names/frame-title": {
    description: "Los marcos deben tener un nombre accesible.",
    guidance:
      "Los lectores de pantalla anuncian los títulos de los marcos cuando los usuarios navegan por ellos. Agregue un atributo title a los elementos <iframe> y <frame> que describa el propósito del marco (por ejemplo, <iframe title='Reproductor de video'>). Evite títulos genéricos como 'marco' o 'iframe'. Si el marco es decorativo, use aria-hidden='true'.",
    messages: {
      "Frame is missing an accessible name. Add a title attribute.":
        "Al marco le falta un nombre accesible. Agregue un atributo title.",
    },
  },
  "labels-and-names/frame-focusable-content": {
    description: "Los iframes con contenido interactivo no deben excluirse del orden de tabulación.",
    guidance:
      'Un <iframe> con tabindex="-1" elimina el marco del orden de tabulación, pero los elementos enfocables dentro permanecen accesibles con teclas de flecha en algunos navegadores y son inaccesibles en otros. Elimine tabindex="-1" del iframe, o agregue tabindex="-1" a cada elemento enfocable dentro de él. Si el marco es decorativo, agregue aria-hidden="true" en su lugar.',
    messages: {
      'iframe has tabindex="-1" but contains focusable content, making it unreachable by keyboard.':
        'El iframe tiene tabindex="-1" pero contiene contenido enfocable, haciéndolo inaccesible por teclado.',
    },
  },
  "labels-and-names/frame-title-unique": {
    description: "Los títulos de los marcos deben ser únicos.",
    guidance:
      "Cuando varios marcos tienen títulos idénticos, los usuarios de lectores de pantalla no pueden distinguirlos. Dé a cada marco un título único y descriptivo que explique su propósito específico o contenido.",
    messages: {
      "Frame title is not unique. Use a distinct title for each frame.":
        "El título del marco no es único. Use un título distinto para cada marco.",
    },
  },
  "distinguishable/meta-viewport": {
    description: "La etiqueta meta viewport no debe deshabilitar el zoom del usuario.",
    guidance:
      "Los usuarios con baja visión necesitan ampliar el contenido al 200% o más. Establecer user-scalable=no o maximum-scale=1 impide el zoom y no cumple con WCAG. Elimine estas restricciones. Si su diseño se rompe con zoom alto, corrija el diseño responsivo en lugar de impedir el zoom.",
    messages: {
      "Viewport disables user scaling (user-scalable={0}). Remove this restriction.":
        "El viewport deshabilita el escalado del usuario (user-scalable={0}). Elimine esta restricción.",
      "Viewport maximum-scale={0} restricts zooming. Set to at least 2 or remove.":
        "El viewport maximum-scale={0} restringe el zoom. Establezca al menos 2 o elimínelo.",
    },
  },
  "enough-time/meta-refresh": {
    description: "La etiqueta meta refresh no debe redirigir o actualizar automáticamente.",
    guidance:
      "Las actualizaciones o redirecciones automáticas de página pueden desorientar a los usuarios, especialmente aquellos que usan lectores de pantalla o con discapacidades cognitivas. Pueden perder su lugar o no tener tiempo para leer el contenido. Si se necesita una redirección, use una redirección del lado del servidor (HTTP 301/302). Para actualizaciones temporizadas, proporcione controles al usuario.",
    messages: {
      "Page redirects after {0} seconds without warning. Use server-side redirect.":
        "La página redirige después de {0} segundos sin advertencia. Use redirección del lado del servidor.",
      "Page auto-refreshes after {0} seconds. Provide user control over refresh.":
        "La página se actualiza automáticamente después de {0} segundos. Proporcione control al usuario sobre la actualización.",
    },
  },
  "enough-time/blink": {
    description: "El elemento <blink> no debe usarse.",
    guidance:
      "El contenido parpadeante puede causar convulsiones en usuarios con epilepsia fotosensible y es una distracción para usuarios con trastornos de atención. El elemento <blink> está obsoleto y nunca debe usarse. Si necesita llamar la atención sobre el contenido, use métodos menos intrusivos como color, bordes o iconos.",
    messages: {
      "The <blink> element causes accessibility issues. Remove it entirely.":
        "El elemento <blink> causa problemas de accesibilidad. Elimínelo por completo.",
    },
  },
  "enough-time/marquee": {
    description: "El elemento <marquee> no debe usarse.",
    guidance:
      "El contenido que se desplaza o se mueve es difícil de leer para muchos usuarios, especialmente aquellos con discapacidades cognitivas o visuales. El elemento <marquee> está obsoleto. Reemplace el texto en movimiento con contenido estático. Si el contenido debe desplazarse, proporcione controles de pausa/detención y asegúrese de que se detenga después de 5 segundos.",
    messages: {
      "The <marquee> element causes accessibility issues. Replace with static content.":
        "El elemento <marquee> causa problemas de accesibilidad. Reemplace con contenido estático.",
    },
  },
  "text-alternatives/img-alt": {
    description:
      "Las imágenes deben tener texto alternativo. Agregue un atributo alt a los elementos <img>. Las imágenes decorativas pueden usar un atributo alt vacío (alt=\"\"), role='none' o role='presentation'.",
    guidance:
      "Cada imagen necesita un atributo alt. Para imágenes informativas, describa el contenido o la función de manera concisa. Para imágenes decorativas (fondos, espaciadores, adornos puramente visuales), use alt='' para ocultarlas de los lectores de pantalla. Nunca omita alt por completo: los lectores de pantalla pueden leer el nombre del archivo en su lugar.",
    messages: {
      'Image has whitespace-only alt text. Use alt="" for decorative images or provide descriptive text.':
        'La imagen tiene texto alt solo con espacios en blanco. Use alt="" para imágenes decorativas o proporcione texto descriptivo.',
      "Image element missing alt attribute.": "Al elemento de imagen le falta el atributo alt.",
      'Element with role="img" has no accessible name. Add aria-label or aria-labelledby.':
        'El elemento con role="img" no tiene nombre accesible. Agregue aria-label o aria-labelledby.',
    },
  },
  "text-alternatives/svg-img-alt": {
    description:
      "Los elementos SVG con rol img, graphics-document o graphics-symbol deben tener un nombre accesible mediante un elemento <title>, aria-label o aria-labelledby.",
    guidance:
      "Los SVG en línea con role='img' necesitan nombres accesibles. Agregue un elemento <title> como primer hijo del SVG (los lectores de pantalla lo anunciarán), o use aria-label en el elemento SVG. Para SVGs complejos, use aria-labelledby haciendo referencia tanto a un elemento <title> como a un elemento <desc>. Los SVGs decorativos deben usar aria-hidden='true' en su lugar.",
    messages: {
      "{0} with role='{1}' has no accessible name.":
        "{0} con role='{1}' no tiene nombre accesible.",
    },
  },
  "text-alternatives/input-image-alt": {
    description:
      'Las entradas de imagen (<input type="image">) deben tener texto alternativo mediante alt, aria-label o aria-labelledby. El texto debe describir la acción del botón, no la imagen.',
    guidance:
      "Los botones de imagen (<input type='image'>) deben tener texto alternativo mediante alt, aria-label o aria-labelledby. El texto debe describir la acción del botón, no la imagen.",
    messages: { "Image input missing alt text.": "A la entrada de imagen le falta texto alt." },
  },
  "text-alternatives/image-redundant-alt": {
    description:
      "El texto alternativo de la imagen no debe duplicar el texto del enlace o botón adyacente. Cuando el texto alt repite el texto circundante, los usuarios de lectores de pantalla escuchan la misma información dos veces.",
    guidance:
      "Cuando una imagen está dentro de un enlace o botón que también tiene texto, haga que el texto alt sea complementario en lugar de idéntico. Si la imagen es puramente decorativa en ese contexto, use alt='' para evitar la repetición.",
    messages: {
      'Alt text "{0}" duplicates surrounding {1} text.':
        'El texto alt "{0}" duplica el texto del {1} circundante.',
    },
  },
  "text-alternatives/image-alt-words": {
    description:
      "El texto alternativo de la imagen no debe comenzar con palabras como 'imagen de', 'foto de' o 'fotografía de': los lectores de pantalla ya anuncian el tipo de elemento.",
    guidance:
      "Los lectores de pantalla ya anuncian 'imagen' o 'gráfico' antes de leer el texto alt, por lo que frases como 'imagen de', 'foto de' o 'fotografía de' son redundantes. Elimine estas palabras y describa lo que muestra la imagen. Por ejemplo, cambie 'imagen de un perro' a 'golden retriever jugando a buscar'.",
    messages: {
      'Alt text "{0}" contains redundant word(s): {1}.':
        'El texto alt "{0}" contiene palabra(s) redundante(s): {1}.',
    },
  },
  "text-alternatives/area-alt": {
    description: "Los elementos <area> del mapa de imagen deben tener texto alternativo.",
    guidance:
      "Cada región clicable en un mapa de imagen necesita texto alternativo para que los usuarios de lectores de pantalla sepan qué representa la región. Agregue un atributo alt a cada elemento <area> describiendo su propósito. Para mapas de imagen complejos, considere usar enfoques alternativos como SVG con enlaces incrustados, o una lista de enlaces de texto.",
    messages: {
      "Image map <area> element is missing alternative text.":
        "Al elemento <area> del mapa de imagen le falta texto alternativo.",
    },
  },
  "text-alternatives/object-alt": {
    description: "Los elementos <object> deben tener texto alternativo.",
    guidance:
      "Los elementos object incrustan contenido externo que puede no ser accesible para todos los usuarios. Proporcione texto alternativo mediante aria-label, aria-labelledby o un atributo title. El contenido de respaldo dentro de <object> solo se muestra cuando el objeto no se carga y no sirve como nombre accesible.",
    messages: {
      "<object> element is missing alternative text. Add aria-label, aria-labelledby, or a title attribute.":
        "Al elemento <object> le falta texto alternativo. Agregue aria-label, aria-labelledby o un atributo title.",
    },
  },
  "text-alternatives/role-img-alt": {
    description: "Los elementos con role='img' deben tener un nombre accesible.",
    guidance:
      "Cuando asigna role='img' a un elemento (como un div que contiene fuentes de iconos o fondos CSS), debe proporcionar un nombre accesible mediante aria-label o aria-labelledby. Sin esto, los usuarios de lectores de pantalla no tienen forma de entender lo que representa la imagen. Si la imagen es decorativa, use role='presentation' o role='none' en su lugar.",
    messages: {
      "Element with role='img' has no accessible name. Add aria-label or aria-labelledby.":
        "El elemento con role='img' no tiene nombre accesible. Agregue aria-label o aria-labelledby.",
    },
  },
  "keyboard-accessible/server-image-map": {
    description: "No se deben usar mapas de imagen del lado del servidor.",
    guidance:
      "Los mapas de imagen del lado del servidor (usando el atributo ismap) envían coordenadas de clic al servidor, lo cual es inaccesible para usuarios de teclado y lectores de pantalla que no pueden hacer clic con precisión en regiones específicas. Reemplace con mapas de imagen del lado del cliente (elementos <map> con <area>) que proporcionan acceso por teclado y nombres accesibles, o use imágenes/botones enlazados.",
    messages: {
      "Server-side image map detected. Use client-side image map with <map> and <area> elements instead.":
        "Se detectó un mapa de imagen del lado del servidor. Use un mapa de imagen del lado del cliente con elementos <map> y <area> en su lugar.",
    },
  },
  "labels-and-names/form-label": {
    description:
      "Los elementos de formulario deben tener etiquetas. Use <label>, aria-label o aria-labelledby.",
    guidance:
      "Cada entrada de formulario necesita una etiqueta accesible para que los usuarios comprendan qué información ingresar. Use un elemento <label> con un atributo for que coincida con el id de la entrada, envuelva la entrada en un <label>, o use aria-label/aria-labelledby para componentes personalizados. Los placeholders no son suficientes como etiquetas ya que desaparecen al escribir. Las etiquetas deben describir la información solicitada, no el tipo de campo (por ejemplo, 'Dirección de correo', 'Buscar', 'Número de teléfono').",
    messages: {
      "Form element has no accessible label.":
        "El elemento de formulario no tiene etiqueta accesible.",
    },
  },
  "labels-and-names/multiple-labels": {
    description: "Los campos de formulario no deben tener múltiples elementos label.",
    guidance:
      "Cuando un campo de formulario tiene múltiples elementos <label> apuntando a él, las tecnologías de asistencia pueden anunciar solo una etiqueta o comportarse de manera inconsistente. Use un solo <label> y combine cualquier texto adicional en él, o use aria-describedby para información complementaria.",
    messages: {
      "Form field has {0} labels. Use a single label element.":
        "El campo de formulario tiene {0} etiquetas. Use un solo elemento label.",
    },
  },
  "labels-and-names/input-button-name": {
    description:
      "Los botones de entrada deben tener texto discernible mediante value, aria-label o aria-labelledby.",
    guidance:
      "Los botones de entrada (<input type='submit'>, type='button', type='reset'>) necesitan nombres accesibles para que los usuarios sepan qué acción realiza el botón. Agregue un atributo value con texto descriptivo (por ejemplo, value='Enviar formulario'), o use aria-label si el valor debe diferir del nombre accesible.",
    messages: {
      "Input button has no discernible text.": "El botón de entrada no tiene texto discernible.",
    },
  },
  "adaptable/autocomplete-valid": {
    description: "El atributo autocomplete debe usar valores válidos de la especificación HTML.",
    guidance:
      "El atributo autocomplete ayuda a los usuarios a completar formularios identificando los propósitos de las entradas. Use valores estándar como 'name', 'email', 'tel', 'street-address', 'postal-code', 'cc-number'. Esto beneficia a usuarios con discapacidades cognitivas, impedimentos motores y cualquier persona que use administradores de contraseñas o autocompletado. Consulte la especificación HTML para la lista completa de tokens válidos.",
    messages: { 'Invalid autocomplete value "{0}".': 'Valor de autocomplete inválido "{0}".' },
  },
  "labels-and-names/label-content-mismatch": {
    description:
      "Los elementos interactivos con texto visible deben tener nombres accesibles que contengan ese texto.",
    guidance:
      "Para los usuarios de control por voz que activan controles hablando su etiqueta visible, el nombre accesible debe incluir el texto visible. Si aria-label es 'Enviar formulario' pero el botón muestra 'Enviar', los usuarios de voz que digan 'clic Enviar' no lo activarán. Asegúrese de que aria-label/aria-labelledby contenga o coincida con el texto visible.",
    messages: {
      'Accessible name "{0}" does not contain visible text "{1}".':
        'El nombre accesible "{0}" no contiene el texto visible "{1}".',
    },
  },
  "labels-and-names/label-title-only": {
    description:
      "Los elementos de formulario no deben usar el atributo title como único nombre accesible.",
    guidance:
      "El atributo title no es confiable como etiqueta porque solo aparece al pasar el cursor/enfocar (no visible para usuarios táctiles) y a menudo es ignorado por las tecnologías de asistencia. Use un elemento <label> visible, aria-label o aria-labelledby en su lugar. El title puede complementar una etiqueta pero no debe reemplazarla.",
    messages: {
      "Form element uses title attribute as only label. Use <label>, aria-label, or aria-labelledby instead.":
        "El elemento de formulario usa el atributo title como única etiqueta. Use <label>, aria-label o aria-labelledby en su lugar.",
    },
  },
  "labels-and-names/label-placeholder-only": {
    description:
      "Los elementos de formulario no deben usar el atributo placeholder como único nombre accesible.",
    guidance:
      "El atributo placeholder desaparece en cuanto el usuario empieza a escribir, lo que lo hace poco confiable como etiqueta. Los usuarios pueden olvidar el propósito del campo mientras escriben, y los placeholders a menudo se muestran con bajo contraste. Use un elemento <label> visible, aria-label o aria-labelledby en su lugar. El placeholder puede complementar una etiqueta pero no debe reemplazarla.",
    messages: {
      "Form element uses placeholder as only label. Use <label>, aria-label, or aria-labelledby instead.":
        "El elemento de formulario usa el placeholder como única etiqueta. Use <label>, aria-label o aria-labelledby en su lugar.",
    },
  },
  "keyboard-accessible/tabindex": {
    description:
      "Los elementos no deben tener tabindex mayor que 0, lo cual altera el orden natural de tabulación.",
    guidance:
      "Los valores positivos de tabindex fuerzan a los elementos al frente del orden de tabulación independientemente de la posición en el DOM, creando una navegación impredecible para los usuarios de teclado. Use tabindex='0' para agregar elementos al orden natural de tabulación, o tabindex='-1' para hacer elementos enfocables programáticamente pero no en el orden de tabulación. Confíe en el orden del DOM para la secuencia de tabulación.",
    messages: {
      'Element has tabindex="{0}" which disrupts tab order.':
        'El elemento tiene tabindex="{0}" lo cual altera el orden de tabulación.',
    },
  },
  "keyboard-accessible/focus-order": {
    description:
      "Los elementos que reciben el foco del teclado deben tener un rol apropiado para que las tecnologías de asistencia puedan transmitir su propósito. Los elementos no interactivos con tabindex='0' necesitan un rol ARIA interactivo válido.",
    guidance:
      "Al agregar tabindex='0' a elementos no interactivos como <div> o <span>, los lectores de pantalla los anuncian genéricamente. Agregue un rol apropiado (button, link, tab, etc.) para que los usuarios comprendan el propósito del elemento. También agregue manejadores de eventos de teclado (Enter/Espacio para botones, Enter para enlaces). Considere usar elementos interactivos nativos en su lugar.",
    messages: {
      'Non-interactive <{0}> with tabindex="0" has no interactive role.':
        'El elemento no interactivo <{0}> con tabindex="0" no tiene un rol interactivo.',
    },
  },
  "keyboard-accessible/nested-interactive": {
    description: "Los controles interactivos no deben estar anidados dentro de otros.",
    guidance:
      "Anidar elementos interactivos (como un botón dentro de un enlace, o un enlace dentro de un botón) crea un comportamiento impredecible y confunde a las tecnologías de asistencia. El navegador puede eliminar el elemento interno del árbol de accesibilidad. Reestructure el HTML para que los elementos interactivos sean hermanos, no anidados. Si necesita una tarjeta clicable, use CSS y JavaScript en lugar de anidar.",
    messages: {
      "Interactive element <{0}> is nested inside <{1}>.":
        "El elemento interactivo <{0}> está anidado dentro de <{1}>.",
    },
  },
  "keyboard-accessible/scrollable-region": {
    description: "Las regiones desplazables deben ser accesibles por teclado.",
    guidance:
      "El contenido que se desplaza debe ser accesible para los usuarios de teclado. Si una región tiene overflow:scroll u overflow:auto y contiene contenido desplazable, necesita tabindex='0' para ser enfocable, o debe contener elementos enfocables. Sin esto, los usuarios de teclado no pueden desplazar el contenido.",
    messages: {
      "Scrollable region is not keyboard accessible. Add tabindex='0' or include focusable elements.":
        "La región desplazable no es accesible por teclado. Agregue tabindex='0' o incluya elementos enfocables.",
    },
  },
  "keyboard-accessible/accesskeys": {
    description: "Los valores del atributo accesskey deben ser únicos.",
    guidance:
      "Cuando múltiples elementos comparten la misma accesskey, el comportamiento del navegador se vuelve impredecible; generalmente solo se activa el primer elemento. Asegúrese de que cada valor de accesskey sea único dentro de la página. También considere que las accesskeys pueden entrar en conflicto con los atajos del navegador y del lector de pantalla, así que úselas con moderación.",
    messages: {
      'Duplicate accesskey "{0}". Each accesskey must be unique.':
        'Accesskey duplicada "{0}". Cada accesskey debe ser única.',
    },
  },
  "navigable/heading-order": {
    description:
      "Los niveles de encabezado deben incrementarse de uno en uno; saltarse niveles (por ejemplo, h2 a h4) dificulta la navegación.",
    guidance:
      "Los usuarios de lectores de pantalla navegan por encabezados para comprender la estructura de la página. Saltarse niveles (h2 a h4) sugiere contenido faltante y crea confusión. Comience con h1 para el título de la página, luego use h2 para secciones principales, h3 para subsecciones, etc. Puede volver a subir (h3 a h2) al comenzar una nueva sección.",
    messages: {
      "Heading level {0} skipped from level {1}. Use h{2} instead.":
        "Nivel de encabezado {0} saltado desde el nivel {1}. Use h{2} en su lugar.",
    },
  },
  "navigable/empty-heading": {
    description: "Los encabezados deben tener texto discernible.",
    guidance:
      "Los usuarios de lectores de pantalla navegan las páginas por encabezados, por lo que los encabezados vacíos crean puntos de navegación confusos. Asegúrese de que todos los encabezados contengan texto visible o nombres accesibles. Si un encabezado se usa puramente para estilo visual, use CSS en lugar de elementos de encabezado.",
    messages: {
      "Heading is empty. Add text content or remove the heading element.":
        "El encabezado está vacío. Agregue contenido de texto o elimine el elemento de encabezado.",
    },
  },
  "navigable/p-as-heading": {
    description: "Los párrafos no deben estilizarse para parecer encabezados.",
    guidance:
      "Cuando los párrafos se estilizan con negrita y fuentes grandes para parecer encabezados, los usuarios de lectores de pantalla pierden la estructura semántica. Use elementos de encabezado apropiados (h1-h6) en lugar de párrafos estilizados. Si necesita un estilo específico, aplique CSS a los elementos de encabezado manteniendo la jerarquía adecuada de encabezados.",
    messages: {
      "Paragraph appears to be styled as a heading. Use an h1-h6 element instead.":
        "El párrafo parece estar estilizado como un encabezado. Use un elemento h1-h6 en su lugar.",
    },
  },
  "landmarks/landmark-main": {
    description: "La página debe tener exactamente un landmark main.",
    guidance:
      "El landmark main contiene el contenido principal de la página. Los lectores de pantalla permiten a los usuarios saltar directamente al contenido principal. Use un solo elemento <main> (o role='main') para envolver el contenido central, excluyendo encabezados, pies de página y navegación.",
    messages: {
      "Page has no main landmark.": "La página no tiene un landmark main.",
      "Page has multiple main landmarks.": "La página tiene múltiples landmarks main.",
    },
  },
  "landmarks/no-duplicate-banner": {
    description: "La página no debe tener más de un landmark banner.",
    guidance:
      "El landmark banner (típicamente <header>) identifica contenido orientado al sitio como logotipos y búsqueda. Solo se permite un banner de nivel superior por página. Si necesita múltiples encabezados, anídelos dentro de elementos de sección (article, section, aside) donde se convierten en encabezados de alcance en lugar de banners de nivel de página.",
    messages: {
      "Page has multiple banner landmarks.": "La página tiene múltiples landmarks banner.",
    },
  },
  "landmarks/no-duplicate-contentinfo": {
    description: "La página no debe tener más de un landmark contentinfo.",
    guidance:
      "El landmark contentinfo (típicamente <footer>) contiene información sobre la página como derechos de autor e información de contacto. Solo se permite un contentinfo de nivel superior por página. Anide pies de página adicionales dentro de elementos de sección para delimitar su alcance.",
    messages: {
      "Page has multiple contentinfo landmarks.":
        "La página tiene múltiples landmarks contentinfo.",
    },
  },
  "landmarks/no-duplicate-main": {
    description: "La página no debe tener más de un landmark main.",
    guidance:
      "Solo debe existir un landmark main por página. El landmark main identifica el área de contenido principal. Si tiene múltiples secciones de contenido, use <section> con encabezados apropiados en lugar de múltiples elementos main.",
    messages: { "Page has multiple main landmarks.": "La página tiene múltiples landmarks main." },
  },
  "landmarks/banner-is-top-level": {
    description: "El landmark banner no debe estar anidado dentro de otro landmark.",
    guidance:
      "El landmark banner debe ser un landmark de nivel superior, no anidado dentro de article, aside, main, nav o section. Si un header está dentro de estos elementos, automáticamente se convierte en un encabezado genérico en lugar de un banner. Elimine el role='banner' explícito de los headers anidados o reestructure la página.",
    messages: {
      "Banner landmark is nested within another landmark.":
        "El landmark banner está anidado dentro de otro landmark.",
    },
  },
  "landmarks/contentinfo-is-top-level": {
    description: "El landmark contentinfo no debe estar anidado dentro de otro landmark.",
    guidance:
      "El landmark contentinfo debe ser un landmark de nivel superior. Un footer dentro de article, aside, main, nav o section se convierte en un pie de página de alcance, no en un landmark contentinfo. Elimine el role='contentinfo' explícito de los footers anidados o mueva el footer fuera de los elementos de sección.",
    messages: {
      "Contentinfo landmark is nested within another landmark.":
        "El landmark contentinfo está anidado dentro de otro landmark.",
    },
  },
  "landmarks/main-is-top-level": {
    description: "El landmark main no debe estar anidado dentro de otro landmark.",
    guidance:
      "El landmark main debe ser un landmark de nivel superior ya que representa el contenido principal de la página. No anide <main> o role='main' dentro de elementos article, aside, nav o section.",
    messages: {
      "Main landmark is nested within another landmark.":
        "El landmark main está anidado dentro de otro landmark.",
    },
  },
  "landmarks/complementary-is-top-level": {
    description:
      "El landmark aside (complementary) debe ser de nivel superior o estar directamente dentro de main.",
    guidance:
      "El landmark complementary (aside) debe ser de nivel superior o un hijo directo de main. Anidar aside profundamente dentro de otros landmarks reduce su descubrimiento para los usuarios de lectores de pantalla que navegan por landmarks.",
    messages: {
      "Complementary landmark should be top-level.":
        "El landmark complementary debe ser de nivel superior.",
    },
  },
  "landmarks/landmark-unique": {
    description: "Los landmarks deben tener etiquetas únicas cuando hay múltiples del mismo tipo.",
    guidance:
      "Cuando una página tiene múltiples landmarks del mismo tipo (por ejemplo, múltiples elementos nav), cada uno debe tener un nombre accesible único mediante aria-label o aria-labelledby. Esto ayuda a los usuarios de lectores de pantalla a distinguirlos (por ejemplo, 'Navegación principal' vs 'Navegación del pie de página').",
    messages: {
      'Multiple {0} landmarks have the same label "{1}".':
        'Múltiples landmarks {0} tienen la misma etiqueta "{1}".',
      "Multiple {0} landmarks have no label. Add unique aria-label attributes.":
        "Múltiples landmarks {0} no tienen etiqueta. Agregue atributos aria-label únicos.",
    },
  },
  "landmarks/region": {
    description: "Todo el contenido de la página debe estar contenido dentro de landmarks.",
    guidance:
      "Los usuarios de lectores de pantalla navegan las páginas por landmarks. El contenido fuera de los landmarks es más difícil de encontrar y comprender. Envuelva todo el contenido visible en landmarks apropiados: <header>, <nav>, <main>, <aside>, <footer>, o <section> con una etiqueta. Los enlaces de salto pueden existir fuera de los landmarks.",
    messages: {
      "Content is not contained within a landmark region.":
        "El contenido no está contenido dentro de una región landmark.",
    },
  },
  "adaptable/list-children": {
    description:
      "<ul> y <ol> solo deben contener <li>, <script>, <template> o <style> como hijos directos.",
    guidance:
      "Los lectores de pantalla anuncian la estructura de la lista ('lista con 5 elementos') basándose en el marcado correcto. Colocar elementos que no son <li> directamente dentro de <ul> u <ol> rompe esta estructura. Envuelva el contenido en elementos <li>, o si necesita divs envolventes para el estilo, aplique los estilos a los elementos <li> directamente y elimine el envoltorio (por ejemplo, cambie <ul><div>item</div></ul> a <ul><li>item</li></ul>).",
    messages: {
      "List contains non-<li> child <{0}>.": "La lista contiene un hijo no <li>: <{0}>.",
    },
  },
  "adaptable/listitem-parent": {
    description: "Los elementos <li> deben estar contenidos en un <ul>, <ol> o <menu>.",
    guidance:
      "Los elementos de lista (<li>) solo tienen significado semántico dentro de un contenedor de lista (<ul>, <ol> o <menu>). Fuera de estos contenedores, las tecnologías de asistencia no pueden transmitir la relación de lista. Envuelva los elementos <li> en el contenedor de lista apropiado.",
    messages: {
      "<li> is not contained in a <ul>, <ol>, or <menu>.":
        "<li> no está contenido en un <ul>, <ol> o <menu>.",
    },
  },
  "adaptable/dl-children": {
    description: "Los elementos <dt> y <dd> deben estar contenidos en un <dl>.",
    guidance:
      "Los términos de definición (<dt>) y las definiciones (<dd>) solo tienen significado semántico dentro de una lista de definiciones (<dl>). Fuera de <dl>, se tratan como texto genérico. Envuelva los pares relacionados de <dt> y <dd> en un elemento <dl> para transmitir la relación término/definición a las tecnologías de asistencia.",
    messages: { "<{0}> is not contained in a <dl>.": "<{0}> no está contenido en un <dl>." },
  },
  "adaptable/definition-list": {
    description:
      "Los elementos <dl> solo deben contener <dt>, <dd>, <div>, <script>, <template> o <style>.",
    guidance:
      "Las listas de definiciones tienen requisitos estrictos de contenido. Solo <dt> (términos), <dd> (definiciones) y <div> (para agrupar pares dt/dd) son hijos válidos. Otros elementos rompen la estructura de la lista para los lectores de pantalla. Mueva los elementos inválidos fuera del <dl>, o si representan un término cámbielos a <dt>, si son una definición cámbielos a <dd>. Los envoltorios de estilo deben reemplazarse con elementos <div> que contengan pares <dt>/<dd>.",
    messages: { "<dl> contains invalid child <{0}>.": "<dl> contiene un hijo inválido <{0}>." },
  },
  "aria/aria-roles": {
    description: "Los valores de rol ARIA deben ser válidos.",
    guidance:
      "Los valores de rol inválidos son ignorados por las tecnologías de asistencia, lo que significa que el elemento no tendrá la semántica prevista. Verifique la ortografía y use solo roles definidos en la especificación WAI-ARIA. Los roles comunes incluyen: button, link, navigation, main, dialog, alert, tab, tabpanel, menu, menuitem.",
    messages: { 'Invalid ARIA role "{0}".': 'Rol ARIA inválido "{0}".' },
  },
  "aria/aria-valid-attr": {
    description: "Los atributos ARIA deben ser válidos (correctamente escritos).",
    guidance:
      "Los atributos ARIA mal escritos son ignorados por las tecnologías de asistencia. Verifique la ortografía contra la especificación WAI-ARIA. Errores comunes: aria-labeledby (debe ser aria-labelledby), aria-role (debe ser role), aria-description (válido en ARIA 1.3+).",
    messages: { 'Invalid ARIA attribute "{0}".': 'Atributo ARIA inválido "{0}".' },
  },
  "aria/aria-valid-attr-value": {
    description: "Los atributos ARIA deben tener valores válidos.",
    guidance:
      "Cada atributo ARIA acepta tipos de valores específicos. Los atributos booleanos (aria-hidden, aria-disabled) aceptan solo 'true' o 'false'. Los atributos triestado (aria-checked, aria-pressed) también aceptan 'mixed'. Los atributos de token (aria-live, aria-autocomplete) aceptan valores predefinidos. Los atributos de referencia de ID (aria-labelledby, aria-describedby) deben referenciar IDs de elementos existentes.",
    messages: {
      '{0} must be "true" or "false", got "{1}".':
        '{0} debe ser "true" o "false", se obtuvo "{1}".',
      '{0} must be "true", "false", or "mixed", got "{1}".':
        '{0} debe ser "true", "false" o "mixed", se obtuvo "{1}".',
      '{0} must be an integer, got "{1}".': '{0} debe ser un entero, se obtuvo "{1}".',
      '{0} must be a number, got "{1}".': '{0} debe ser un número, se obtuvo "{1}".',
      'Invalid value "{0}" for {1}.': 'Valor inválido "{0}" para {1}.',
    },
  },
  "aria/aria-required-attr": {
    description: "Los elementos con roles ARIA deben tener todos los atributos ARIA requeridos.",
    guidance:
      "Algunos roles ARIA requieren atributos específicos para funcionar correctamente. Por ejemplo, checkbox requiere aria-checked, slider requiere aria-valuenow, heading requiere aria-level. Sin estos atributos, las tecnologías de asistencia no pueden transmitir el estado o valor del elemento a los usuarios. Agregue el atributo requerido faltante con un valor apropiado.",
    messages: {
      'Role "{0}" requires attribute "{1}".': 'El rol "{0}" requiere el atributo "{1}".',
    },
  },
  "aria/aria-allowed-attr": {
    description: "Los atributos ARIA deben estar permitidos para el rol del elemento.",
    guidance:
      "Cada rol ARIA admite atributos específicos. Usar atributos no admitidos crea confusión para las tecnologías de asistencia. Consulte la especificación ARIA para saber qué atributos son válidos para cada rol, o elimine el atributo si no es necesario.",
    messages: {
      'ARIA attribute "{0}" is not allowed on role "{1}".':
        'El atributo ARIA "{0}" no está permitido en el rol "{1}".',
    },
  },
  "aria/aria-allowed-role": {
    description: "El rol ARIA debe ser apropiado para el elemento.",
    guidance:
      "No todos los roles ARIA se pueden aplicar a todos los elementos HTML. Muchos elementos tienen roles implícitos (por ejemplo, <header> es implícitamente banner, <nav> es navigation, <main> es main). Agregar un rol explícito que coincida con el rol implícito es redundante. Agregar un rol conflictivo rompe la semántica. Elimine el atributo role o use un elemento diferente.",
    messages: {
      "Element <{0}> should not have an explicit role.":
        "El elemento <{0}> no debería tener un rol explícito.",
      'Role "{0}" is not allowed on element <{1}>.':
        'El rol "{0}" no está permitido en el elemento <{1}>.',
    },
  },
  "adaptable/aria-required-children": {
    description: "Ciertos roles ARIA requieren que estén presentes roles hijos específicos.",
    guidance:
      "Algunos roles ARIA representan contenedores que deben contener roles hijos específicos para una semántica adecuada. Por ejemplo, una lista debe contener listitems, un menú debe contener menuitems. Agregue los elementos hijos requeridos con roles apropiados, o use elementos HTML nativos que proporcionen esta semántica implícitamente (por ejemplo, <ul> con <li>).",
    messages: {
      'Role "{0}" requires children with role: {1}.': 'El rol "{0}" requiere hijos con rol: {1}.',
    },
  },
  "adaptable/aria-required-parent": {
    description: "Ciertos roles ARIA deben estar contenidos dentro de roles padre específicos.",
    guidance:
      "Algunos roles ARIA representan elementos que deben existir dentro de roles de contenedor específicos. Por ejemplo, un listitem debe estar dentro de una lista, un tab debe estar dentro de un tablist. Envuelva el elemento en el padre apropiado, o use elementos HTML nativos que proporcionen esta estructura (por ejemplo, <li> dentro de <ul>).",
    messages: {
      'Role "{0}" must be contained within: {1}.':
        'El rol "{0}" debe estar contenido dentro de: {1}.',
    },
  },
  "aria/aria-hidden-body": {
    description: "aria-hidden='true' no debe estar presente en el body del documento.",
    guidance:
      "Establecer aria-hidden='true' en el elemento body oculta todo el contenido de la página de las tecnologías de asistencia, haciendo la página completamente inaccesible para los usuarios de lectores de pantalla. Elimine aria-hidden del elemento body. Si necesita ocultar contenido temporalmente (por ejemplo, detrás de un modal), use aria-hidden en secciones específicas en su lugar.",
    messages: {
      "aria-hidden='true' on body hides all content from assistive technologies.":
        "aria-hidden='true' en el body oculta todo el contenido de las tecnologías de asistencia.",
    },
  },
  "aria/aria-hidden-focus": {
    description: "Los elementos con aria-hidden='true' no deben contener elementos enfocables.",
    guidance:
      "Cuando aria-hidden='true' oculta un elemento de las tecnologías de asistencia pero el elemento contiene hijos enfocables, los usuarios de teclado pueden enfocar esos hijos pero los usuarios de lectores de pantalla no sabrán que existen. Elimine los elementos enfocables de la región oculta, agregue tabindex='-1' a ellos, o elimine aria-hidden.",
    messages: {
      "Focusable element is inside an aria-hidden region.":
        "Un elemento enfocable está dentro de una región aria-hidden.",
    },
  },
  "labels-and-names/aria-command-name": {
    description: "Los comandos ARIA deben tener un nombre accesible.",
    guidance:
      "Los roles de comando ARIA interactivos (button, link, menuitem) deben tener nombres accesibles para que los usuarios sepan qué acción realizan. Agregue contenido de texto visible, aria-label o aria-labelledby para proporcionar un nombre.",
    messages: {
      "ARIA command has no accessible name.": "El comando ARIA no tiene nombre accesible.",
    },
  },
  "labels-and-names/aria-input-field-name": {
    description: "Los campos de entrada ARIA deben tener un nombre accesible.",
    guidance:
      "Los widgets de entrada ARIA (combobox, listbox, searchbox, slider, spinbutton, textbox) deben tener nombres accesibles para que los usuarios comprendan qué datos ingresar. Agregue una etiqueta visible con aria-labelledby, o use aria-label si una etiqueta visible no es posible.",
    messages: {
      "ARIA input field has no accessible name.":
        "El campo de entrada ARIA no tiene nombre accesible.",
    },
  },
  "labels-and-names/aria-toggle-field-name": {
    description: "Los campos de alternancia ARIA deben tener un nombre accesible.",
    guidance:
      "Los controles de alternancia ARIA (checkbox, switch, radio, menuitemcheckbox, menuitemradio) deben tener nombres accesibles para que los usuarios comprendan qué opción están seleccionando. Agregue contenido de texto visible, aria-label, o use aria-labelledby para referenciar una etiqueta visible.",
    messages: {
      "ARIA toggle field has no accessible name.":
        "El campo de alternancia ARIA no tiene nombre accesible.",
    },
  },
  "labels-and-names/aria-meter-name": {
    description: "Los elementos meter ARIA deben tener un nombre accesible.",
    guidance:
      "Los elementos meter muestran un valor dentro de un rango conocido (como uso de disco o fortaleza de contraseña). Deben tener nombres accesibles para que los usuarios de lectores de pantalla comprendan qué se está midiendo. Use aria-label o aria-labelledby para proporcionar contexto.",
    messages: { "Meter has no accessible name.": "El meter no tiene nombre accesible." },
  },
  "labels-and-names/aria-progressbar-name": {
    description: "Los elementos progressbar ARIA deben tener un nombre accesible.",
    guidance:
      "Los indicadores de progreso deben tener nombres accesibles para que los usuarios de lectores de pantalla comprendan qué proceso se está rastreando. Use aria-label (por ejemplo, 'Progreso de carga de archivo') o aria-labelledby para referenciar un encabezado o etiqueta visible.",
    messages: {
      "Progressbar has no accessible name.": "La barra de progreso no tiene nombre accesible.",
    },
  },
  "labels-and-names/aria-dialog-name": {
    description: "Los diálogos ARIA deben tener un nombre accesible.",
    guidance:
      "Los elementos dialog y alertdialog deben tener nombres accesibles para que los usuarios de lectores de pantalla comprendan el propósito del diálogo cuando se abre. Use aria-label o aria-labelledby apuntando al encabezado del diálogo. Los elementos nativos <dialog> también deben tener un nombre accesible.",
    messages: { "Dialog has no accessible name.": "El diálogo no tiene nombre accesible." },
  },
  "labels-and-names/aria-tooltip-name": {
    description: "Los tooltips ARIA deben tener un nombre accesible.",
    guidance:
      "Los elementos tooltip deben tener nombres accesibles (generalmente su contenido de texto). El contenido del tooltip típicamente sirve como el nombre accesible. Asegúrese de que el tooltip contenga contenido de texto descriptivo o tenga aria-label.",
    messages: { "Tooltip has no accessible name.": "El tooltip no tiene nombre accesible." },
  },
  "labels-and-names/aria-treeitem-name": {
    description: "Los elementos treeitem ARIA deben tener un nombre accesible.",
    guidance:
      "Los elementos de árbol deben tener nombres accesibles para que los usuarios de lectores de pantalla puedan comprender la estructura del árbol y navegarlo eficazmente. Proporcione contenido de texto, aria-label o aria-labelledby para cada treeitem.",
    messages: { "Treeitem has no accessible name.": "El treeitem no tiene nombre accesible." },
  },
  "aria/aria-prohibited-attr": {
    description: "Los atributos ARIA no deben estar prohibidos para el rol del elemento.",
    guidance:
      "Algunos roles ARIA prohíben ciertos atributos. Por ejemplo, roles como 'none', 'presentation', 'generic' y roles de nivel de texto (code, emphasis, strong) prohíben aria-label y aria-labelledby porque el nombramiento no está soportado para estos roles. Elimine los atributos prohibidos o cambie el rol.",
    messages: {
      "aria-label and aria-labelledby are prohibited on <{0}> elements.":
        "aria-label y aria-labelledby están prohibidos en elementos <{0}>.",
      'aria-label and aria-labelledby are prohibited on role "{0}".':
        'aria-label y aria-labelledby están prohibidos en el rol "{0}".',
      'Attribute "{0}" is prohibited on role "{1}".':
        'El atributo "{0}" está prohibido en el rol "{1}".',
    },
  },
  "aria/presentation-role-conflict": {
    description:
      "Los elementos con role='presentation' o role='none' no deben ser enfocables ni tener atributos ARIA globales.",
    guidance:
      "Cuando un elemento tiene role='presentation' o role='none', está marcado como decorativo y se elimina del árbol de accesibilidad. Sin embargo, si el elemento es enfocable o tiene ciertos atributos ARIA, el rol de presentación se ignora y el elemento permanece accesible. Esto crea confusión. Elimine el rol de presentación, o elimine la enfocabilidad/atributos ARIA.",
    messages: {
      "Presentation role conflicts with: {0}. The role will be ignored.":
        "El rol de presentación entra en conflicto con: {0}. El rol será ignorado.",
      'Element with implicit presentation role (alt="") conflicts with: {0}. The decorative role will be ignored.':
        'El elemento con rol de presentación implícito (alt="") entra en conflicto con: {0}. El rol decorativo será ignorado.',
    },
  },
  "labels-and-names/button-name": {
    description: "Los botones deben tener texto discernible.",
    guidance:
      "Los usuarios de lectores de pantalla necesitan saber qué hace un botón. Agregue contenido de texto visible, aria-label o aria-labelledby. Para botones de icono, use aria-label describiendo la acción (por ejemplo, aria-label='Cerrar'). Si el botón contiene una imagen, asegúrese de que la imagen tenga texto alt describiendo la acción del botón.",
    messages: { "Button has no discernible text.": "El botón no tiene texto discernible." },
  },
  "labels-and-names/summary-name": {
    description: "Los elementos <summary> deben tener un nombre accesible.",
    guidance:
      "El elemento <summary> proporciona la etiqueta visible para un widget de divulgación <details>. Debe tener contenido de texto descriptivo para que los usuarios de lectores de pantalla comprendan qué se revelará al expandirse. Agregue texto claro y conciso que indique qué contenido está en la sección de detalles.",
    messages: {
      "<summary> element has no accessible name. Add descriptive text.":
        "El elemento <summary> no tiene nombre accesible. Agregue texto descriptivo.",
    },
  },
  "navigable/link-name": {
    description:
      "Los enlaces deben tener texto discernible mediante contenido, aria-label o aria-labelledby.",
    guidance:
      "Los usuarios de lectores de pantalla necesitan saber a dónde lleva un enlace. Agregue contenido de texto descriptivo, aria-label, o use aria-labelledby. Para enlaces de imagen, asegúrese de que la imagen tenga texto alt describiendo el destino del enlace. Evite texto genérico como 'haga clic aquí' o 'leer más': el texto del enlace debe tener sentido fuera de contexto.",
    messages: { "Link has no discernible text.": "El enlace no tiene texto discernible." },
  },
  "navigable/skip-link": {
    description: "Los enlaces de salto deben apuntar a un destino válido en la página.",
    guidance:
      "Los enlaces de salto permiten a los usuarios de teclado omitir la navegación repetitiva y saltar directamente al contenido principal. El enlace de salto debe ser el primer elemento enfocable en la página, enlazar al contenido principal (por ejemplo, href='#main'), y hacerse visible cuando se enfoca. Puede estar visualmente oculto hasta enfocarse usando CSS.",
    messages: {
      'Skip link points to "#{0}" which does not exist on the page.':
        'El enlace de salto apunta a "#{0}" que no existe en la página.',
    },
  },
  "distinguishable/link-in-text-block": {
    description:
      "Los enlaces dentro de bloques de texto deben distinguirse por algo más que solo el color.",
    guidance:
      "Los usuarios que no pueden percibir diferencias de color necesitan otras señales visuales para identificar enlaces. Los enlaces en texto deben tener subrayados u otros indicadores no cromáticos. Si usa solo color, asegure un contraste de 3:1 con el texto circundante Y proporcione una indicación adicional al enfocar/pasar el cursor.",
    messages: {
      "Link in text block is not visually distinguishable from surrounding text. Add a non-color visual indicator such as an underline or border.":
        "El enlace en el bloque de texto no es visualmente distinguible del texto circundante. Agregue un indicador visual no cromático como un subrayado o borde.",
    },
  },
  "readable/html-has-lang": {
    description: "El elemento <html> debe tener un atributo lang.",
    guidance:
      "Los lectores de pantalla usan el atributo lang para determinar qué reglas de idioma y pronunciación usar. Sin él, el contenido puede pronunciarse incorrectamente. Establezca lang en el idioma principal de la página usando un código BCP 47 (por ejemplo, 'en' para inglés, 'es' para español, 'fr' para francés, 'de' para alemán, 'ja' para japonés, 'zh' para chino, 'pt' para portugués, 'ar' para árabe).",
    messages: {
      "<html> element missing lang attribute.": "Al elemento <html> le falta el atributo lang.",
    },
  },
  "readable/html-lang-valid": {
    description: "El atributo lang en <html> debe tener un valor válido.",
    guidance:
      "El atributo lang debe usar una etiqueta de idioma BCP 47 válida. Use un código de idioma de 2 o 3 letras (por ejemplo, 'en', 'fr', 'zh'), opcionalmente seguido de un código de región (por ejemplo, 'en-US', 'pt-BR'). Las etiquetas inválidas impiden que los lectores de pantalla pronuncien correctamente el contenido.",
    messages: { 'Invalid lang attribute value "{0}".': 'Valor de atributo lang inválido "{0}".' },
  },
  "readable/valid-lang": {
    description: "El atributo lang debe tener un valor válido en todos los elementos.",
    guidance:
      "Cuando aparece contenido en un idioma diferente dentro de una página (por ejemplo, una cita en francés en un documento en inglés), envuélvalo con un atributo lang para asegurar la pronunciación correcta. El valor de lang debe ser una etiqueta BCP 47 válida. Códigos comunes: en, es, fr, de, zh, ja, pt, ar, ru.",
    messages: {
      "Empty lang attribute value.": "Valor de atributo lang vacío.",
      'Invalid lang attribute value "{0}".': 'Valor de atributo lang inválido "{0}".',
    },
  },
  "readable/html-xml-lang-mismatch": {
    description: "Los atributos lang y xml:lang en <html> deben coincidir.",
    guidance:
      "En documentos XHTML, si tanto lang como xml:lang están presentes, deben especificar el mismo idioma base. Los valores no coincidentes confunden a las tecnologías de asistencia. Elimine xml:lang (preferido para HTML5) o asegúrese de que ambos atributos tengan valores idénticos.",
    messages: {
      'lang="{0}" and xml:lang="{1}" do not match.': 'lang="{0}" y xml:lang="{1}" no coinciden.',
    },
  },
  "adaptable/td-headers-attr": {
    description:
      "Todas las celdas en una tabla que usan el atributo headers deben referenciar IDs de encabezado válidos.",
    guidance:
      "El atributo headers en las celdas de tabla debe referenciar IDs de celdas de encabezado (th o td) dentro de la misma tabla. Esto crea asociaciones explícitas para lectores de pantalla. Verifique que todos los IDs referenciados existan y estén escritos correctamente. Para tablas simples, considere usar scope en elementos th en su lugar.",
    messages: {
      'Headers attribute references the cell itself ("{0}").':
        'El atributo headers referencia a la propia celda ("{0}").',
      'Headers attribute references non-existent ID "{0}".':
        'El atributo headers referencia un ID inexistente "{0}".',
    },
  },
  "adaptable/th-has-data-cells": {
    description: "Los encabezados de tabla deben estar asociados con celdas de datos.",
    guidance:
      "Una tabla con celdas de encabezado (th) pero sin celdas de datos (td) probablemente es un mal uso del marcado de tabla para diseño o tiene contenido faltante. Agregue celdas de datos que los encabezados describan, o use marcado apropiado que no sea de tabla si estos no son datos tabulares.",
    messages: {
      "Table has header cells but no data cells.":
        "La tabla tiene celdas de encabezado pero no celdas de datos.",
    },
  },
  "adaptable/td-has-header": {
    description: "Las celdas de datos en tablas mayores de 3x3 deben tener encabezados asociados.",
    guidance:
      "En tablas complejas, los usuarios de lectores de pantalla necesitan asociaciones de encabezados para comprender las celdas de datos. Use elementos th con atributo scope, o el atributo headers en elementos td. Para tablas simples (3x3 o menos), esto es menos crítico ya que el contexto generalmente es claro.",
    messages: {
      "Data cell has no associated header. Add th elements with scope, or headers attribute.":
        "La celda de datos no tiene encabezado asociado. Agregue elementos th con scope o el atributo headers.",
    },
  },
  "adaptable/scope-attr-valid": {
    description: "El atributo scope en los encabezados de tabla debe tener un valor válido.",
    guidance:
      "El atributo scope indica a los lectores de pantalla a qué celdas se aplica un encabezado. Los valores válidos son: row, col, rowgroup, colgroup. Usar valores inválidos rompe la asociación entre encabezados y celdas.",
    messages: {
      'Invalid scope value "{0}". Use row, col, rowgroup, or colgroup.':
        'Valor de scope inválido "{0}". Use row, col, rowgroup o colgroup.',
    },
  },
  "adaptable/empty-table-header": {
    description: "Las celdas de encabezado de tabla deben tener texto visible.",
    guidance:
      "Los encabezados de tabla vacíos no proporcionan información a los usuarios de lectores de pantalla. Agregue texto descriptivo al encabezado, o si el encabezado está intencionalmente vacío (como una celda de esquina), considere usar un elemento td en su lugar o agregar una etiqueta visualmente oculta.",
    messages: {
      "Table header cell is empty. Add text or use aria-label.":
        "La celda de encabezado de tabla está vacía. Agregue texto o use aria-label.",
    },
  },
  "labels-and-names/duplicate-id-aria": {
    description:
      "Los IDs usados en asociaciones ARIA y label deben ser únicos para evitar referencias rotas.",
    guidance:
      "Cuando aria-labelledby, aria-describedby, aria-controls o label[for] referencian un ID duplicado, solo se usa el primer elemento coincidente. Esto rompe la relación prevista y puede dejar controles sin nombre o descripciones faltantes. Asegúrese de que los IDs referenciados por atributos ARIA y asociaciones de etiquetas sean únicos en todo el documento.",
    messages: {
      'Duplicate ID "{0}" referenced by {1}.': 'ID duplicado "{0}" referenciado por {1}.',
    },
  },
  "time-based-media/video-captions": {
    description: "Los elementos de video deben tener subtítulos mediante <track kind='captions'>.",
    guidance:
      "Los subtítulos proporcionan alternativas de texto para el contenido de audio en videos, beneficiando a usuarios sordos y aquellos que no pueden escuchar el audio. Agregue un elemento <track> con kind='captions' apuntando a un archivo de subtítulos WebVTT. Los subtítulos deben incluir tanto el diálogo como los efectos de sonido importantes.",
    messages: {
      "Video element has no captions track.": "El elemento de video no tiene pista de subtítulos.",
    },
  },
  "time-based-media/audio-transcript": {
    description: "Los elementos de audio deben tener una alternativa de texto o transcripción.",
    guidance:
      "El contenido solo de audio como podcasts o grabaciones necesita una alternativa de texto para usuarios sordos. Proporcione una transcripción en la misma página o enlazada cerca. La transcripción debe incluir todo el contenido hablado y descripciones de sonidos relevantes.",
    messages: {
      "Audio element has no transcript or text alternative. Add a transcript or track element.":
        "El elemento de audio no tiene transcripción o alternativa de texto. Agregue una transcripción o elemento track.",
    },
  },
  "distinguishable/color-contrast": {
    description:
      "Los elementos de texto deben tener suficiente contraste de color contra el fondo.",
    guidance:
      "WCAG SC 1.4.3 requiere una relación de contraste de al menos 4.5:1 para texto normal y 3:1 para texto grande (>=24px o >=18.66px en negrita). Aumente el contraste oscureciendo el texto o aclarando el fondo, o viceversa.",
    messages: {
      "Insufficient color contrast ratio of {0}:1 (required {1}:1).":
        "Relación de contraste de color insuficiente de {0}:1 (requerido {1}:1).",
    },
  },
  "distinguishable/color-contrast-enhanced": {
    description:
      "Los elementos de texto deben tener contraste de color mejorado contra el fondo (WCAG AAA).",
    guidance:
      "WCAG SC 1.4.6 (AAA) requiere una relación de contraste de al menos 7:1 para texto normal y 4.5:1 para texto grande (>=24px o >=18.66px en negrita).",
    messages: {
      "Insufficient enhanced contrast ratio of {0}:1 (required {1}:1).":
        "Relación de contraste mejorado insuficiente de {0}:1 (requerido {1}:1).",
    },
  },
  "enough-time/meta-refresh-no-exception": {
    description: "La etiqueta meta refresh no debe usarse con un retraso (sin excepciones).",
    guidance:
      "Las actualizaciones automáticas de página y las redirecciones con retraso desorientan a los usuarios. Las redirecciones instantáneas (delay=0) son aceptables, pero cualquier retraso positivo no lo es. Use redirecciones del lado del servidor en su lugar.",
    messages: {
      "Page has a {0}-second meta refresh delay. Use a server-side redirect instead.":
        "La página tiene un retraso de meta refresh de {0} segundos. Use una redirección del lado del servidor en su lugar.",
      "Page has a {0}-second meta refresh delay. Remove the auto-refresh or provide user control.":
        "La página tiene un retraso de meta refresh de {0} segundos. Elimine la actualización automática o proporcione control al usuario.",
    },
  },
  "distinguishable/letter-spacing": {
    description:
      "El espaciado de letras establecido con !important en atributos de estilo debe ser al menos 0.12em.",
    guidance:
      "WCAG 1.4.12 requiere que los usuarios puedan anular el espaciado de texto. Usar !important en letter-spacing con un valor inferior a 0.12em lo impide. Aumente el valor a al menos 0.12em o elimine !important.",
    messages: {
      "Letter spacing {0}em with !important is below the 0.12em minimum.":
        "El espaciado de letras {0}em con !important está por debajo del mínimo de 0.12em.",
    },
  },
  "distinguishable/line-height": {
    description:
      "La altura de línea establecida con !important en atributos de estilo debe ser al menos 1.5.",
    guidance:
      "WCAG 1.4.12 requiere que los usuarios puedan anular el espaciado de texto. Usar !important en line-height con un valor inferior a 1.5 lo impide. Aumente el valor a al menos 1.5 o elimine !important.",
    messages: {
      "Line height {0} with !important is below the 1.5 minimum.":
        "La altura de línea {0} con !important está por debajo del mínimo de 1.5.",
    },
  },
  "distinguishable/word-spacing": {
    description:
      "El espaciado de palabras establecido con !important en atributos de estilo debe ser al menos 0.16em.",
    guidance:
      "WCAG 1.4.12 requiere que los usuarios puedan anular el espaciado de texto. Usar !important en word-spacing con un valor inferior a 0.16em lo impide. Aumente el valor a al menos 0.16em o elimine !important.",
    messages: {
      "Word spacing {0}em with !important is below the 0.16em minimum.":
        "El espaciado de palabras {0}em con !important está por debajo del mínimo de 0.16em.",
    },
  },
  "adaptable/orientation-lock": {
    description: "La orientación de la página no debe restringirse usando transformaciones CSS.",
    guidance:
      "Los usuarios con discapacidades motoras pueden montar su dispositivo en una orientación fija. Usar transformaciones CSS con @media (orientation: portrait/landscape) para rotar el contenido 90° bloquea efectivamente la página a una orientación. Elimine la transformación dependiente de la orientación y use diseño responsivo en su lugar.",
    messages: {
      "CSS locks page orientation via @media (orientation: {0}) with a 90° transform.":
        "CSS bloquea la orientación de la página mediante @media (orientation: {0}) con una transformación de 90°.",
    },
  },
  "aria/presentational-children-focusable": {
    description:
      "Los elementos con un rol que hace a los hijos presentacionales no deben contener contenido enfocable.",
    guidance:
      "Roles como button, checkbox, img, tab y otros hacen que sus hijos sean presentacionales — ocultos de las tecnologías de asistencia. Si esos hijos son enfocables, los usuarios de teclado pueden alcanzar elementos que los usuarios de lectores de pantalla no pueden percibir. Mueva el contenido enfocable fuera del padre o elimine la enfocabilidad.",
    messages: {
      'Focusable element inside a "{0}" role whose children are presentational.':
        'Elemento enfocable dentro de un rol "{0}" cuyos hijos son presentacionales.',
    },
  },
  "keyboard-accessible/focus-visible": {
    description:
      "Los elementos en orden de foco secuencial deben tener un indicador de foco visible.",
    guidance:
      "Los usuarios de teclado necesitan ver qué elemento tiene el foco. No elimine el contorno de foco predeterminado (outline: none) sin proporcionar un indicador visible alternativo. Use estilos :focus-visible o :focus para asegurar que el foco siempre sea perceptible.",
    messages: {
      "Focusable element has outline removed without a visible focus alternative.":
        "El elemento enfocable tiene el contorno eliminado sin una alternativa de foco visible.",
    },
  },
  "input-assistance/accessible-authentication": {
    description:
      'Los campos de contraseña no deben bloquear los administradores de contraseñas. Evite autocomplete="off" y permita pegar.',
    guidance:
      'WCAG 2.2 SC 3.3.8 requiere que los pasos de autenticación eviten pruebas de función cognitiva o proporcionen un mecanismo para asistir a los usuarios. Los administradores de contraseñas son un mecanismo de asistencia clave. Establecer autocomplete="off" en campos de contraseña impide que los administradores de contraseñas completen las credenciales. Bloquear el pegado mediante atributos onpaste impide que los usuarios peguen contraseñas almacenadas. Establezca autocomplete en "current-password" para formularios de inicio de sesión o "new-password" para formularios de registro/cambio de contraseña, y no bloquee el pegado en campos de contraseña.',
    messages: {
      'Password field has autocomplete="off" which blocks password managers.':
        'El campo de contraseña tiene autocomplete="off" lo cual bloquea los administradores de contraseñas.',
      "Password field blocks pasting, preventing password manager use.":
        "El campo de contraseña bloquea el pegado, impidiendo el uso de administradores de contraseñas.",
    },
  },
};
