import { staticFile } from "remotion";

export const FONT_FACES = `
@font-face {
  font-family: "Inter";
  src: url(${JSON.stringify(staticFile("fonts/Inter-SemiBold.ttf"))}) format("truetype");
  font-weight: 600;
  font-style: normal;
}
@font-face {
  font-family: "Inter";
  src: url(${JSON.stringify(staticFile("fonts/Inter-Bold.ttf"))}) format("truetype");
  font-weight: 700;
  font-style: normal;
}
@font-face {
  font-family: "Inter";
  src: url(${JSON.stringify(staticFile("fonts/Inter-Bold.ttf"))}) format("truetype");
  font-weight: 800;
  font-style: normal;
}
@font-face {
  font-family: "JetBrains Mono";
  src: url(${JSON.stringify(staticFile("fonts/JetBrainsMono-Regular.ttf"))}) format("truetype");
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: "JetBrains Mono";
  src: url(${JSON.stringify(staticFile("fonts/JetBrainsMono-Bold.ttf"))}) format("truetype");
  font-weight: 700;
  font-style: normal;
}
`;
