// Change this to your real shop e-mail. The contact form opens the visitor's mail app addressed here.
export const CONTACT_EMAIL = 'parts@velora.example';
export const HERO_VIDEO = 'https://cdn.sceneai.art/Hero%20section%20video%20file%20(2)/37091057-3719-4207-815c-745ebf57aeb4.mp4';
export const PART_IMAGES = [
  ['Brake pads', '/parts/brake-pads.svg'],
  ['Brake rotor', '/parts/brake-rotor.svg'],
  ['Turbocharger', '/parts/turbo.svg'],
  ['Spark plug', '/parts/spark-plug.svg'],
  ['Oil filter', '/parts/oil-filter.svg'],
  ['Coilover', '/parts/coilover.svg'],
  ['Headlight', '/parts/headlight.svg'],
  ['Alloy wheel', '/parts/wheel.svg'],
  ['Battery', '/parts/battery.svg'],
];
export const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
