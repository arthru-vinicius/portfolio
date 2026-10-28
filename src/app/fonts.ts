import localFont from "next/font/local";

// As fontes vêm dos pacotes do Fontsource (licença OFL), e não do Google
// Fonts: o build da VM não depende de outro serviço no ar. O `next/font`
// serve os arquivos junto com o resto do site e calcula a fonte de reserva
// com as mesmas medidas, para o texto não pular quando a fonte chega. Só o
// subconjunto latino, que cobre o português.

/** Plus Jakarta Sans, variável de 200 a 800: títulos e texto do site. */
export const jakarta = localFont({
  src: "../../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2",
  weight: "200 800",
  variable: "--font-jakarta",
  display: "swap",
});

/** JetBrains Mono, variável de 100 a 800: rótulos, datas e etiquetas. */
export const jetbrains = localFont({
  src: "../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  variable: "--font-jetbrains",
  display: "swap",
});
